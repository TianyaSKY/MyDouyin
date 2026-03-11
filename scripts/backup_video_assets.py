#!/usr/bin/env python3
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, cast

try:
    import pymysql
except ImportError:
    print("缺少依赖 pymysql，请先执行: pip install pymysql")
    sys.exit(1)

try:
    from pymilvus import Collection, connections
except ImportError:
    print("缺少依赖 pymilvus，请先执行: pip install pymilvus")
    sys.exit(1)


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT_DIR / "scripts" / "video_assets_backup.json"
VIDEO_COLLECTION = "video_embedding"
STORAGE_DIR = ROOT_DIR / "storage"


def load_root_env() -> None:
    env_path = ROOT_DIR / ".env"
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


def mysql_config() -> Dict[str, Any]:
    return {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "douyin_user"),
        "password": os.getenv("MYSQL_PASSWORD", "douyin_password"),
        "database": os.getenv("MYSQL_DATABASE", "douyin"),
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
    }


def connect_milvus() -> None:
    connections.connect(
        alias="default",
        host=os.getenv("MILVUS_HOST", "localhost"),
        port=os.getenv("MILVUS_PORT", "19530"),
    )


def fetch_videos() -> List[Dict[str, Any]]:
    sql = """
        SELECT id, author_id, title, tags, status, cover_url, video_url, created_at
        FROM videos
        ORDER BY id
    """
    with pymysql.connect(**mysql_config()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            rows = cast(List[Dict[str, Any]], list(cursor.fetchall()))
    return rows


def chunked(items: List[int], batch_size: int) -> List[List[int]]:
    return [items[i : i + batch_size] for i in range(0, len(items), batch_size)]


def fetch_milvus_rows(
    video_ids: List[int], batch_size: int
) -> Dict[int, Dict[str, Any]]:
    if not video_ids:
        return {}

    collection = Collection(VIDEO_COLLECTION)
    collection.load()

    rows_by_video_id: Dict[int, Dict[str, Any]] = {}
    for batch in chunked(video_ids, batch_size):
        expr = "video_id in [{}]".format(",".join(str(video_id) for video_id in batch))
        rows = cast(
            List[Dict[str, Any]],
            collection.query(
                expr=expr,
                output_fields=["video_id", "embedding", "author_id", "created_ts"],
            ),
        )
        for row in rows:
            rows_by_video_id[int(row["video_id"])] = row
    return rows_by_video_id


def normalize_tags(tags: Any) -> List[str]:
    if tags is None:
        return []
    if isinstance(tags, list):
        return [str(tag) for tag in tags]
    if isinstance(tags, str):
        stripped = tags.strip()
        if not stripped:
            return []
        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, list):
                return [str(tag) for tag in parsed]
        except json.JSONDecodeError:
            pass
        return [stripped]
    return [str(tags)]


def resolve_storage_path(url: Optional[str]) -> Optional[Path]:
    if not url:
        return None
    trimmed = url.strip()
    if not trimmed.startswith("/uploads/"):
        return None
    relative = trimmed.removeprefix("/uploads/").replace("/", os.sep)
    return STORAGE_DIR / relative


def file_snapshot(url: Optional[str]) -> Dict[str, Any]:
    path = resolve_storage_path(url)
    if path is None:
        return {
            "url": url,
            "local_path": None,
            "exists": False,
            "size": None,
        }

    exists = path.exists()
    return {
        "url": url,
        "local_path": str(path.resolve()),
        "exists": exists,
        "size": path.stat().st_size if exists else None,
    }


def build_backup(
    videos: List[Dict[str, Any]], milvus_rows: Dict[int, Dict[str, Any]]
) -> Dict[str, Any]:
    records: List[Dict[str, Any]] = []
    missing_video_files = 0
    missing_cover_files = 0
    milvus_count = 0

    for row in videos:
        video_id = int(row["id"])
        milvus_row = milvus_rows.get(video_id)
        if milvus_row:
            milvus_count += 1

        video_file = file_snapshot(cast(Optional[str], row.get("video_url")))
        cover_file = file_snapshot(cast(Optional[str], row.get("cover_url")))
        if not video_file["exists"]:
            missing_video_files += 1
        if row.get("cover_url") and not cover_file["exists"]:
            missing_cover_files += 1

        records.append(
            {
                "video": {
                    "id": video_id,
                    "author_id": row.get("author_id"),
                    "title": row.get("title"),
                    "tags": normalize_tags(row.get("tags")),
                    "status": row.get("status"),
                    "cover_url": row.get("cover_url"),
                    "video_url": row.get("video_url"),
                    "created_at": str(row.get("created_at"))
                    if row.get("created_at") is not None
                    else None,
                },
                "files": {
                    "video": video_file,
                    "cover": cover_file,
                },
                "milvus": {
                    "exists": milvus_row is not None,
                    "video_id": milvus_row.get("video_id") if milvus_row else None,
                    "embedding": milvus_row.get("embedding") if milvus_row else None,
                    "author_id": milvus_row.get("author_id") if milvus_row else None,
                    "created_ts": milvus_row.get("created_ts") if milvus_row else None,
                },
            }
        )

    return {
        "backup_type": "video_assets",
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project_root": str(ROOT_DIR),
        "storage_dir": str(STORAGE_DIR),
        "summary": {
            "video_count": len(records),
            "milvus_count": milvus_count,
            "missing_video_file_count": missing_video_files,
            "missing_cover_file_count": missing_cover_files,
        },
        "videos": records,
    }


def main() -> int:
    load_root_env()

    parser = argparse.ArgumentParser(
        description="备份视频表、视频文件信息和 Milvus 向量数据。"
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="输出 JSON 路径，默认 scripts/video_assets_backup.json",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Milvus 分批查询大小，默认 500",
    )
    args = parser.parse_args()

    try:
        videos = fetch_videos()
        connect_milvus()
        milvus_rows = fetch_milvus_rows(
            [int(video["id"]) for video in videos], args.batch_size
        )
        backup = build_backup(videos, milvus_rows)

        output_path = Path(args.output).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(backup, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        summary = backup["summary"]
        print(f"备份完成: {output_path}")
        print(f"视频数量: {summary['video_count']}")
        print(f"Milvus 向量数量: {summary['milvus_count']}")
        print(f"缺失视频文件数: {summary['missing_video_file_count']}")
        print(f"缺失封面文件数: {summary['missing_cover_file_count']}")
        return 0
    except Exception as exc:
        print(f"备份失败: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
