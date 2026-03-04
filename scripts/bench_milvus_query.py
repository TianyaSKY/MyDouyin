#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Milvus 查询性能压测（video_embedding 检索）。

默认参数与项目现状对齐:
  - collection: video_embedding
  - anns field: embedding
  - metric: COSINE
  - dim: 128
"""

from __future__ import annotations

import argparse
import math
import os
import random
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

try:
    from pymilvus import Collection, connections
except ImportError:
    print("需要安装 pymilvus：pip install -r scripts/requirements.txt")
    sys.exit(1)

from bench_common import chunks_by_round_robin, load_root_env, print_summary, summarize


load_root_env()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Milvus 查询性能压测")
    parser.add_argument("--host", default=os.getenv("MILVUS_HOST", "localhost"), help="Milvus 主机")
    parser.add_argument("--port", default=os.getenv("MILVUS_PORT", "19530"), help="Milvus 端口")
    parser.add_argument("--collection", default="video_embedding", help="Collection 名称")
    parser.add_argument("--anns-field", default="embedding", help="向量字段名")
    parser.add_argument("--output-field", default="video_id", help="输出字段（可空字符串）")
    parser.add_argument("--dim", type=int, default=128, help="向量维度")
    parser.add_argument("--top-k", type=int, default=100, help="TopK")
    parser.add_argument("--ef", type=int, default=64, help="HNSW ef 搜索参数")
    parser.add_argument("--requests", type=int, default=1000, help="总请求数")
    parser.add_argument("--connections", type=int, default=20, help="并发连接数")
    parser.add_argument("--warmup", type=int, default=20, help="预热次数")
    parser.add_argument("--seed", type=int, default=42, help="随机种子")
    parser.add_argument("--zero-vector", action="store_true", help="使用全零向量查询（默认随机单位向量）")
    return parser.parse_args()


def random_unit_vector(rng: random.Random, dim: int) -> List[float]:
    raw = [rng.uniform(-1.0, 1.0) for _ in range(dim)]
    norm = math.sqrt(sum(x * x for x in raw))
    if norm == 0:
        return [0.0] * dim
    return [x / norm for x in raw]


def build_query_vectors(args: argparse.Namespace) -> List[List[float]]:
    if args.zero_vector:
        vec = [0.0] * args.dim
        return [vec[:] for _ in range(args.requests)]

    rng = random.Random(args.seed)
    return [random_unit_vector(rng, args.dim) for _ in range(args.requests)]


def worker(worker_id: int, queries: List[List[float]], args: argparse.Namespace) -> Dict[str, Any]:
    alias = f"bench_milvus_{worker_id}_{int(time.time() * 1000)}"
    latencies: List[float] = []
    errors = 0
    first_error: str | None = None
    hits_total = 0
    empty_count = 0

    try:
        connections.connect(alias=alias, host=args.host, port=args.port)
        collection = Collection(args.collection, using=alias)
        out_fields = [args.output_field] if args.output_field else None
        search_params = {
            "metric_type": "COSINE",
            "params": {"ef": args.ef},
        }

        for vector in queries:
            start = time.perf_counter()
            try:
                result = collection.search(
                    data=[vector],
                    anns_field=args.anns_field,
                    param=search_params,
                    limit=args.top_k,
                    output_fields=out_fields,
                )
                latencies.append(time.perf_counter() - start)
                hit_count = len(result[0]) if result else 0
                hits_total += hit_count
                if hit_count == 0:
                    empty_count += 1
            except Exception as exc:
                errors += 1
                if first_error is None:
                    first_error = f"worker={worker_id}: {exc}"
    except Exception as exc:
        errors += len(queries)
        first_error = f"worker={worker_id}: 连接失败: {exc}"
    finally:
        try:
            connections.disconnect(alias=alias)
        except Exception:
            pass

    return {
        "latencies": latencies,
        "errors": errors,
        "hits_total": hits_total,
        "empty_count": empty_count,
        "first_error": first_error,
    }


def warmup(args: argparse.Namespace, vectors: List[List[float]]) -> None:
    if args.warmup <= 0:
        return
    alias = "bench_milvus_warmup"
    connections.connect(alias=alias, host=args.host, port=args.port)
    try:
        collection = Collection(args.collection, using=alias)
        collection.load()
        search_params = {"metric_type": "COSINE", "params": {"ef": args.ef}}
        sample = vectors[: min(args.warmup, len(vectors))]
        for vector in sample:
            collection.search(
                data=[vector],
                anns_field=args.anns_field,
                param=search_params,
                limit=args.top_k,
                output_fields=[args.output_field] if args.output_field else None,
            )
    finally:
        connections.disconnect(alias=alias)


def main() -> int:
    args = parse_args()
    if args.requests <= 0:
        print("--requests 必须 > 0")
        return 2
    if args.connections <= 0:
        print("--connections 必须 > 0")
        return 2
    if args.top_k <= 0:
        print("--top-k 必须 > 0")
        return 2
    if args.dim <= 0:
        print("--dim 必须 > 0")
        return 2

    vectors = build_query_vectors(args)

    try:
        warmup(args, vectors)
    except Exception as exc:
        print(f"Milvus 预热失败: {exc}")
        return 2

    groups = chunks_by_round_robin(vectors, args.connections)
    all_latencies: List[float] = []
    errors = 0
    hits_total = 0
    empty_count = 0
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
            hits_total += result["hits_total"]
            empty_count += result["empty_count"]
            if first_error is None and result["first_error"]:
                first_error = result["first_error"]
    duration = time.perf_counter() - started_at

    summary = summarize(all_latencies, errors, duration)
    avg_hits = (hits_total / len(all_latencies)) if all_latencies else 0.0
    print_summary(
        "Milvus 查询压测结果",
        summary,
        extra_lines=[
            f"目标地址:       {args.host}:{args.port}",
            f"Collection:     {args.collection}",
            f"字段:           {args.anns_field}",
            f"维度:           {args.dim}",
            f"TopK:           {args.top_k}",
            f"ef:             {args.ef}",
            f"并发连接:       {args.connections}",
            f"空结果次数:      {empty_count}",
            f"平均命中数:      {avg_hits:.2f}",
        ],
    )

    if first_error:
        print(f"示例错误:       {first_error}")

    return 0 if summary["success"] > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
