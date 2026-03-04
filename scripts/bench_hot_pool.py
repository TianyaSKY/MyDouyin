#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
热门池（Redis ZSET）返回性能压测。

默认读取 key: video:hot
操作: ZREVRANGE key 0 (top_n-1) WITHSCORES
"""

from __future__ import annotations

import argparse
import os
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
    parser = argparse.ArgumentParser(description="热门池返回性能压测（Redis ZSET）")
    parser.add_argument("--host", default=os.getenv("REDIS_HOST", "localhost"), help="Redis 主机")
    parser.add_argument("--port", type=int, default=int(os.getenv("REDIS_PORT", "6379")), help="Redis 端口")
    parser.add_argument("--db", type=int, default=int(os.getenv("REDIS_DB", "0")), help="Redis DB")
    parser.add_argument("--password", default=os.getenv("REDIS_PASSWORD", ""), help="Redis 密码（可空）")
    parser.add_argument("--key", default="video:hot", help="热门池 ZSET key")
    parser.add_argument("--top-n", type=int, default=20, help="单次取回数量")
    parser.add_argument("--requests", type=int, default=3000, help="总请求数")
    parser.add_argument("--connections", type=int, default=50, help="并发连接数")
    parser.add_argument("--warmup", type=int, default=200, help="预热次数")
    parser.add_argument("--timeout", type=float, default=3.0, help="连接/读写超时（秒）")
    parser.add_argument("--strict-non-empty", action="store_true", help="若热门池为空，计为失败")
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


def warmup(client: redis.Redis, args: argparse.Namespace) -> None:
    if args.warmup <= 0:
        return
    for _ in range(args.warmup):
        client.zrevrange(args.key, 0, max(args.top_n - 1, 0), withscores=True)


def worker(worker_id: int, ops: List[int], args: argparse.Namespace) -> Dict[str, Any]:
    client = make_client(args)
    latencies: List[float] = []
    errors = 0
    first_error: str | None = None
    empty_count = 0
    items_total = 0

    for _ in ops:
        start = time.perf_counter()
        try:
            rows = client.zrevrange(args.key, 0, max(args.top_n - 1, 0), withscores=True)
            latency = time.perf_counter() - start
            if not rows:
                empty_count += 1
                if args.strict_non_empty:
                    errors += 1
                    continue
            items_total += len(rows)
            latencies.append(latency)
        except Exception as exc:
            errors += 1
            if first_error is None:
                first_error = f"worker={worker_id}: {exc}"

    return {
        "latencies": latencies,
        "errors": errors,
        "empty_count": empty_count,
        "items_total": items_total,
        "first_error": first_error,
    }


def main() -> int:
    args = parse_args()
    if args.requests <= 0:
        print("--requests 必须 > 0")
        return 2
    if args.connections <= 0:
        print("--connections 必须 > 0")
        return 2
    if args.top_n <= 0:
        print("--top-n 必须 > 0")
        return 2

    try:
        checker = make_client(args)
        checker.ping()
        current_size = checker.zcard(args.key)
        warmup(checker, args)
    except Exception as exc:
        print(f"Redis 连接或预热失败: {exc}")
        return 2

    groups = chunks_by_round_robin(range(args.requests), args.connections)
    all_latencies: List[float] = []
    errors = 0
    empty_count = 0
    items_total = 0
    first_error: str | None = None

    started_at = time.perf_counter()
    with ThreadPoolExecutor(max_workers=args.connections) as pool:
        futures = {
            pool.submit(worker, worker_id, groups[worker_id], args): worker_id
            for worker_id in range(args.connections)
            if groups[worker_id]
        }
        for future in as_completed(futures):
            result = future.result()
            all_latencies.extend(result["latencies"])
            errors += result["errors"]
            empty_count += result["empty_count"]
            items_total += result["items_total"]
            if first_error is None and result["first_error"]:
                first_error = result["first_error"]
    duration = time.perf_counter() - started_at

    summary = summarize(all_latencies, errors, duration)
    avg_items = (items_total / len(all_latencies)) if all_latencies else 0.0
    print_summary(
        "热门池返回压测结果",
        summary,
        extra_lines=[
            f"目标地址:       {args.host}:{args.port}/{args.db}",
            f"热门池 key:      {args.key}",
            f"当前 ZSET 大小:  {current_size}",
            f"每次 topN:       {args.top_n}",
            f"并发连接:       {args.connections}",
            f"空返回次数:      {empty_count}",
            f"平均返回条数:    {avg_items:.2f}",
        ],
    )

    if first_error:
        print(f"示例错误:       {first_error}")

    return 0 if summary["success"] > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
