#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MySQL 响应速度压测脚本。

默认执行「业务读」SQL:
  SELECT id, title FROM videos ORDER BY id DESC LIMIT 20

可通过 --write-ratio 混入写入请求（写入到连接级临时表，不污染业务表）。
"""

from __future__ import annotations

import argparse
import os
import random
import string
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

try:
    import pymysql
except ImportError:
    print("需要安装 pymysql：pip install -r scripts/requirements.txt")
    sys.exit(1)

from bench_common import chunks_by_round_robin, load_root_env, print_summary, summarize


load_root_env()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MySQL 响应速度压测")
    parser.add_argument("--host", default=os.getenv("MYSQL_HOST", "localhost"), help="MySQL 主机")
    parser.add_argument("--port", type=int, default=int(os.getenv("MYSQL_PORT", "3306")), help="MySQL 端口")
    parser.add_argument("--user", default=os.getenv("MYSQL_USER", "douyin_user"), help="MySQL 用户名")
    parser.add_argument("--password", default=os.getenv("MYSQL_PASSWORD", "douyin_password"), help="MySQL 密码")
    parser.add_argument("--database", default=os.getenv("MYSQL_DATABASE", "douyin"), help="MySQL 数据库名")
    parser.add_argument("--requests", type=int, default=1000, help="总请求数")
    parser.add_argument("--connections", type=int, default=20, help="并发连接数")
    parser.add_argument("--write-ratio", type=float, default=0.0, help="写请求比例，范围 0~1")
    parser.add_argument("--warmup", type=int, default=50, help="预热查询次数")
    parser.add_argument("--connect-timeout", type=int, default=5, help="连接超时（秒）")
    parser.add_argument("--query-timeout", type=int, default=10, help="读写超时（秒）")
    parser.add_argument(
        "--read-sql",
        default="SELECT id, title FROM videos ORDER BY id DESC LIMIT 20",
        help="读请求 SQL（默认查视频列表）",
    )
    parser.add_argument("--seed", type=int, default=42, help="随机种子（用于可复现实验）")
    return parser.parse_args()


def build_operations(total_requests: int, write_ratio: float, seed: int) -> List[bool]:
    random.seed(seed)
    return [random.random() < write_ratio for _ in range(total_requests)]


def build_db_config(args: argparse.Namespace) -> Dict[str, Any]:
    return {
        "host": args.host,
        "port": args.port,
        "user": args.user,
        "password": args.password,
        "database": args.database,
        "charset": "utf8mb4",
        "autocommit": True,
        "connect_timeout": args.connect_timeout,
        "read_timeout": args.query_timeout,
        "write_timeout": args.query_timeout,
    }


def worker(
    worker_id: int,
    operations: List[bool],
    read_sql: str,
    db_config: Dict[str, Any],
) -> Dict[str, Any]:
    latencies: List[float] = []
    errors = 0
    read_count = 0
    write_count = 0
    first_error: str | None = None

    conn = None
    cursor = None
    try:
        conn = pymysql.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TEMPORARY TABLE IF NOT EXISTS _bench_temp_write (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                payload VARCHAR(64) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    except Exception as exc:
        return {
            "latencies": latencies,
            "errors": len(operations),
            "read_count": 0,
            "write_count": 0,
            "first_error": f"worker={worker_id}: 连接失败: {exc}",
        }

    for idx, is_write in enumerate(operations):
        start = time.perf_counter()
        try:
            if is_write:
                payload = f"w{worker_id}_{idx}_" + "".join(random.choices(string.ascii_lowercase, k=16))
                cursor.execute("INSERT INTO _bench_temp_write(payload) VALUES (%s)", (payload,))
                write_count += 1
            else:
                cursor.execute(read_sql)
                cursor.fetchall()
                read_count += 1
            latencies.append(time.perf_counter() - start)
        except Exception as exc:
            errors += 1
            if first_error is None:
                first_error = f"worker={worker_id}: {exc}"
            try:
                conn.ping(reconnect=True)
            except Exception:
                pass

    if cursor is not None:
        cursor.close()
    if conn is not None:
        conn.close()

    return {
        "latencies": latencies,
        "errors": errors,
        "read_count": read_count,
        "write_count": write_count,
        "first_error": first_error,
    }


def warmup(args: argparse.Namespace, db_config: Dict[str, Any]) -> None:
    if args.warmup <= 0:
        return
    conn = pymysql.connect(**db_config)
    cursor = conn.cursor()
    try:
        for _ in range(args.warmup):
            cursor.execute(args.read_sql)
            cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def main() -> int:
    args = parse_args()
    if args.requests <= 0:
        print("--requests 必须 > 0")
        return 2
    if args.connections <= 0:
        print("--connections 必须 > 0")
        return 2
    if args.write_ratio < 0 or args.write_ratio > 1:
        print("--write-ratio 必须在 0~1 之间")
        return 2

    db_config = build_db_config(args)

    try:
        warmup(args, db_config)
    except Exception as exc:
        print(f"预热失败: {exc}")
        return 2

    operations = build_operations(args.requests, args.write_ratio, args.seed)
    groups = chunks_by_round_robin(operations, args.connections)

    all_latencies: List[float] = []
    errors = 0
    total_reads = 0
    total_writes = 0
    first_error: str | None = None

    started_at = time.perf_counter()
    with ThreadPoolExecutor(max_workers=args.connections) as pool:
        futures = {
            pool.submit(worker, worker_id, groups[worker_id], args.read_sql, db_config): worker_id
            for worker_id in range(args.connections)
            if groups[worker_id]
        }
        for future in as_completed(futures):
            result = future.result()
            all_latencies.extend(result["latencies"])
            errors += result["errors"]
            total_reads += result["read_count"]
            total_writes += result["write_count"]
            if first_error is None and result["first_error"]:
                first_error = result["first_error"]
    duration = time.perf_counter() - started_at

    summary = summarize(all_latencies, errors, duration)
    print_summary(
        "MySQL 压测结果",
        summary,
        extra_lines=[
            f"目标地址:       {args.host}:{args.port}/{args.database}",
            f"并发连接:       {args.connections}",
            f"读请求数:       {total_reads}",
            f"写请求数:       {total_writes}",
            f"读 SQL:         {args.read_sql}",
        ],
    )

    if first_error:
        print(f"示例错误:       {first_error}")

    return 0 if summary["success"] > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
