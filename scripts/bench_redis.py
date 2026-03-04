#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Redis 响应速度压测脚本。

支持模式:
  - ping
  - set
  - get
  - set_get（默认）
"""

from __future__ import annotations

import argparse
import os
import secrets
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

try:
    import redis
except ImportError:
    print("需要安装 redis：pip install -r scripts/requirements.txt")
    sys.exit(1)

from bench_common import chunks_by_round_robin, load_root_env, print_summary, summarize


load_root_env()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Redis 响应速度压测")
    parser.add_argument("--host", default=os.getenv("REDIS_HOST", "localhost"), help="Redis 主机")
    parser.add_argument("--port", type=int, default=int(os.getenv("REDIS_PORT", "6379")), help="Redis 端口")
    parser.add_argument("--db", type=int, default=int(os.getenv("REDIS_DB", "0")), help="Redis DB")
    parser.add_argument("--password", default=os.getenv("REDIS_PASSWORD", ""), help="Redis 密码（可空）")
    parser.add_argument("--requests", type=int, default=2000, help="总请求数")
    parser.add_argument("--connections", type=int, default=50, help="并发连接数")
    parser.add_argument("--timeout", type=float, default=3.0, help="连接/读写超时（秒）")
    parser.add_argument("--warmup", type=int, default=100, help="预热次数")
    parser.add_argument("--key-prefix", default="bench:redis:latency", help="压测 key 前缀")
    parser.add_argument("--payload-size", type=int, default=128, help="SET value 的字节长度")
    parser.add_argument("--mode", choices=["ping", "set", "get", "set_get"], default="set_get", help="压测模式")
    parser.add_argument("--cleanup", action="store_true", help="压测结束后清理 key 前缀数据")
    return parser.parse_args()


def make_client(args: argparse.Namespace) -> redis.Redis:
    return redis.Redis(
        host=args.host,
        port=args.port,
        db=args.db,
        password=args.password or None,
        socket_connect_timeout=args.timeout,
        socket_timeout=args.timeout,
        decode_responses=False,
    )


def warmup(client: redis.Redis, times: int) -> None:
    for _ in range(times):
        client.ping()


def prepare_get_keys(client: redis.Redis, key_prefix: str, total: int, payload: bytes) -> None:
    pipe = client.pipeline(transaction=False)
    for i in range(total):
        pipe.set(f"{key_prefix}:{i}", payload)
    pipe.execute()


def worker(
    worker_id: int,
    indices: List[int],
    args: argparse.Namespace,
    payload: bytes,
) -> Dict[str, Any]:
    client = make_client(args)
    latencies: List[float] = []
    errors = 0
    misses = 0
    first_error: str | None = None

    for idx in indices:
        key = f"{args.key_prefix}:{idx}"
        start = time.perf_counter()
        try:
            if args.mode == "ping":
                client.ping()
            elif args.mode == "set":
                client.set(key, payload)
            elif args.mode == "get":
                value = client.get(key)
                if value is None:
                    misses += 1
            else:
                client.set(key, payload)
                value = client.get(key)
                if value is None:
                    misses += 1
            latencies.append(time.perf_counter() - start)
        except Exception as exc:
            errors += 1
            if first_error is None:
                first_error = f"worker={worker_id}: {exc}"

    return {
        "latencies": latencies,
        "errors": errors,
        "misses": misses,
        "first_error": first_error,
    }


def cleanup_keys(client: redis.Redis, key_prefix: str) -> int:
    total_deleted = 0
    cursor = 0
    pattern = f"{key_prefix}:*"
    while True:
        cursor, keys = client.scan(cursor=cursor, match=pattern, count=1000)
        if keys:
            total_deleted += client.delete(*keys)
        if cursor == 0:
            break
    return total_deleted


def main() -> int:
    args = parse_args()
    if args.requests <= 0:
        print("--requests 必须 > 0")
        return 2
    if args.connections <= 0:
        print("--connections 必须 > 0")
        return 2
    if args.payload_size <= 0:
        print("--payload-size 必须 > 0")
        return 2

    payload = secrets.token_bytes(args.payload_size)
    indices = list(range(args.requests))
    groups = chunks_by_round_robin(indices, args.connections)

    try:
        master = make_client(args)
        warmup(master, args.warmup)
        if args.mode == "get":
            prepare_get_keys(master, args.key_prefix, args.requests, payload)
    except Exception as exc:
        print(f"Redis 准备阶段失败: {exc}")
        return 2

    all_latencies: List[float] = []
    errors = 0
    misses = 0
    first_error: str | None = None

    started_at = time.perf_counter()
    with ThreadPoolExecutor(max_workers=args.connections) as pool:
        futures = {
            pool.submit(worker, worker_id, groups[worker_id], args, payload): worker_id
            for worker_id in range(args.connections)
            if groups[worker_id]
        }
        for future in as_completed(futures):
            result = future.result()
            all_latencies.extend(result["latencies"])
            errors += result["errors"]
            misses += result["misses"]
            if first_error is None and result["first_error"]:
                first_error = result["first_error"]
    duration = time.perf_counter() - started_at

    summary = summarize(all_latencies, errors, duration)
    print_summary(
        "Redis 压测结果",
        summary,
        extra_lines=[
            f"目标地址:       {args.host}:{args.port}/{args.db}",
            f"并发连接:       {args.connections}",
            f"压测模式:       {args.mode}",
            f"key 前缀:       {args.key_prefix}",
            f"GET miss 数:    {misses}",
        ],
    )

    if first_error:
        print(f"示例错误:       {first_error}")

    if args.cleanup:
        try:
            deleted = cleanup_keys(master, args.key_prefix)
            print(f"清理 key 数:     {deleted}")
        except Exception as exc:
            print(f"清理失败:       {exc}")

    return 0 if summary["success"] > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
