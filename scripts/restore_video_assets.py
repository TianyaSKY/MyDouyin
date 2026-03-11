#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
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
DEFAULT_INPUT = ROOT_DIR / "scripts" / "video_assets_backup.json"
VIDEO_COLLECTION = "video_embedding"


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
        "autocommit": False,
    }


def connect_milvus() -> None:
    connections.connect(
        alias="default",
        host=os.getenv("MILVUS_HOST", "localhost"),
        port=os.getenv("MILVUS_PORT", "19530"),
    )


def load_backup(input_path: Path) -> Dict[str, Any]:
    data = json.loads(input_path.read_text(encoding="utf-8"))
    if data.get("backup_type") != "video_assets":
        raise ValueError("备份文件类型不正确，不是 video_assets")
    if not isinstance(data.get("videos"), list):
        raise ValueError("备份文件缺少 videos 列表")
    return cast(Dict[str, Any], data)


def normalize_tags(tags: Any) -> str:
    if tags is None:
        return "[]"
    if isinstance(tags, list):
        return json.dumps(tags, ensure_ascii=False)
    return json.dumps([str(tags)], ensure_ascii=False)


def restore_mysql(records: List[Dict[str, Any]], dry_run: bool) -> int:
    if dry_run:
        return len(records)

    sql = """
        INSERT INTO videos (id, author_id, title, tags, status, cover_url, video_url, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            author_id = VALUES(author_id),
            title = VALUES(title),
            tags = VALUES(tags),
            status = VALUES(status),
            cover_url = VALUES(cover_url),
            video_url = VALUES(video_url),
            created_at = VALUES(created_at)
    """

    restored = 0
    with pymysql.connect(**mysql_config()) as conn:
        try:
            with conn.cursor() as cursor:
                for record in records:
                    video = cast(Dict[str, Any], record["video"])
                    cursor.execute(
                        sql,
                        (
                            video["id"],
                            video["author_id"],
                            video["title"],
                            normalize_tags(video.get("tags")),
                            video["status"],
                            video.get("cover_url"),
                            video["video_url"],
                            video.get("created_at"),
                        ),
                    )
                    restored += 1
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    return restored


def delete_by_field(collection: Collection, field_name: str, field_value: int) -> int:
    pk_field: Optional[str] = None
    for field in collection.schema.fields:
        if field.is_primary:
            pk_field = field.name
            break

    if not pk_field:
        raise RuntimeError(f"集合 {collection.name} 未找到主键字段")

    matched = cast(
        List[Dict[str, Any]],
        collection.query(
            expr=f"{field_name} == {field_value}", output_fields=[pk_field]
        ),
    )
    if not matched:
        return 0

    pk_values = [row[pk_field] for row in matched if pk_field in row]
    if not pk_values:
        return 0

    delete_expr = f"{pk_field} in [{','.join(map(str, pk_values))}]"
    result = collection.delete(delete_expr)
    return result.delete_count if result else 0


def restore_milvus(records: List[Dict[str, Any]], dry_run: bool) -> int:
    target_records = [
        record for record in records if record.get("milvus", {}).get("exists")
    ]
    if dry_run or not target_records:
        return len(target_records)

    collection = Collection(VIDEO_COLLECTION)
    restored = 0

    for record in target_records:
        video = cast(Dict[str, Any], record["video"])
        milvus = cast(Dict[str, Any], record["milvus"])
        embedding = milvus.get("embedding")
        if not embedding:
            continue

        video_id = int(video["id"])
        author_id = int(milvus.get("author_id") or video["author_id"])
        created_ts = milvus.get("created_ts")
        if created_ts is None:
            created_ts = int(time.time() * 1000)

        delete_by_field(collection, "video_id", video_id)
        collection.insert([[video_id], [embedding], [author_id], [int(created_ts)]])
        restored += 1

    collection.flush()
    return restored


def filter_records(
    records: List[Dict[str, Any]], only_existing_files: bool, only_with_milvus: bool
) -> List[Dict[str, Any]]:
    filtered = records
    if only_existing_files:
        filtered = [
            record
            for record in filtered
            if record.get("files", {}).get("video", {}).get("exists")
        ]
    if only_with_milvus:
        filtered = [
            record for record in filtered if record.get("milvus", {}).get("exists")
        ]
    return filtered


def main() -> int:
    load_root_env()

    parser = argparse.ArgumentParser(
        description="从视频备份 JSON 恢复 videos 表和 Milvus 视频向量。"
    )
    parser.add_argument(
        "--input",
        default=str(DEFAULT_INPUT),
        help="备份 JSON 路径，默认 scripts/video_assets_backup.json",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅打印将要恢复的数据量，不真正写入",
    )
    parser.add_argument(
        "--mysql-only",
        action="store_true",
        help="仅恢复 videos 表",
    )
    parser.add_argument(
        "--milvus-only",
        action="store_true",
        help="仅恢复 Milvus video_embedding",
    )
    parser.add_argument(
        "--only-existing-files",
        action="store_true",
        help="仅恢复本地视频文件存在的记录",
    )
    parser.add_argument(
        "--only-with-milvus",
        action="store_true",
        help="仅恢复带 Milvus 向量的记录",
    )
    args = parser.parse_args()

    if args.mysql_only and args.milvus_only:
        print("参数错误: --mysql-only 和 --milvus-only 不能同时使用")
        return 1

    try:
        backup = load_backup(Path(args.input).resolve())
        records = filter_records(
            cast(List[Dict[str, Any]], backup["videos"]),
            args.only_existing_files,
            args.only_with_milvus,
        )

        restore_mysql_enabled = not args.milvus_only
        restore_milvus_enabled = not args.mysql_only

        mysql_count = 0
        milvus_count = 0

        if restore_mysql_enabled:
            mysql_count = restore_mysql(records, args.dry_run)

        if restore_milvus_enabled:
            connect_milvus()
            milvus_count = restore_milvus(records, args.dry_run)

        action = "演练完成" if args.dry_run else "恢复完成"
        print(f"{action}: {Path(args.input).resolve()}")
        if restore_mysql_enabled:
            print(f"videos 表记录数: {mysql_count}")
        if restore_milvus_enabled:
            print(f"Milvus 向量记录数: {milvus_count}")
        return 0
    except Exception as exc:
        print(f"恢复失败: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
