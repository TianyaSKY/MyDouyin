#!/usr/bin/env python3
"""
压测脚本公共方法。
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Iterable, List


def load_root_env() -> None:
    """加载项目根目录 .env 到进程环境变量（仅填充未设置项）。"""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


def percentile(samples: List[float], pct: float) -> float:
    """线性插值百分位，输入单位为秒，输出单位为毫秒。"""
    if not samples:
        return 0.0
    if pct <= 0:
        return samples[0] * 1000.0
    if pct >= 100:
        return samples[-1] * 1000.0

    pos = (len(samples) - 1) * (pct / 100.0)
    lower = int(pos)
    upper = min(lower + 1, len(samples) - 1)
    weight = pos - lower
    value = samples[lower] + (samples[upper] - samples[lower]) * weight
    return value * 1000.0


def chunks_by_round_robin(items: Iterable[Any], worker_count: int) -> List[List[Any]]:
    groups: List[List[Any]] = [[] for _ in range(worker_count)]
    for idx, item in enumerate(items):
        groups[idx % worker_count].append(item)
    return groups


def summarize(latencies: List[float], errors: int, duration_seconds: float) -> Dict[str, Any]:
    ordered = sorted(latencies)
    success = len(ordered)
    total = success + errors
    mean_ms = (sum(ordered) / success * 1000.0) if success else 0.0

    return {
        "total": total,
        "success": success,
        "errors": errors,
        "success_rate": (success / total * 100.0) if total else 0.0,
        "duration_seconds": duration_seconds,
        "throughput_rps": (success / duration_seconds) if duration_seconds > 0 else 0.0,
        "mean_ms": mean_ms,
        "min_ms": (ordered[0] * 1000.0) if ordered else 0.0,
        "p50_ms": percentile(ordered, 50),
        "p90_ms": percentile(ordered, 90),
        "p95_ms": percentile(ordered, 95),
        "p99_ms": percentile(ordered, 99),
        "max_ms": (ordered[-1] * 1000.0) if ordered else 0.0,
    }


def print_summary(title: str, summary: Dict[str, Any], extra_lines: List[str] | None = None) -> None:
    print(f"\n=== {title} ===")
    if extra_lines:
        for line in extra_lines:
            print(line)

    print(f"总请求:       {summary['total']}")
    print(f"成功请求:     {summary['success']}")
    print(f"失败请求:     {summary['errors']}")
    print(f"成功率:       {summary['success_rate']:.2f}%")
    print(f"总耗时:       {summary['duration_seconds']:.3f}s")
    print(f"吞吐(RPS):    {summary['throughput_rps']:.2f}")
    print(f"平均延迟:     {summary['mean_ms']:.2f} ms")
    print(f"最小延迟:     {summary['min_ms']:.2f} ms")
    print(f"P50 延迟:     {summary['p50_ms']:.2f} ms")
    print(f"P90 延迟:     {summary['p90_ms']:.2f} ms")
    print(f"P95 延迟:     {summary['p95_ms']:.2f} ms")
    print(f"P99 延迟:     {summary['p99_ms']:.2f} ms")
    print(f"最大延迟:     {summary['max_ms']:.2f} ms")
