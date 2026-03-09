#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地视频批量入库脚本
===================
将本地视频文件（含封面图）导入 Douyin 数据库，并为视频生成 embedding 后写入 Milvus。

文件命名约定:
  视频:  1-可爱女人【1st JAY】-480P 标清-AVC.mp4
  封面:  1-可爱女人【1st JAY】-480P 标清-AVC.Cover.jpg

用法:
    python import_local_videos.py --source <视频目录>  [选项]
    # 先安装依赖
    pip install pymysql requests

    # 预览模式（不执行，只看解析结果）
    python scripts/import_local_videos.py --source "E:\你的视频目录" --dry-run

    # 正式导入（默认 author_id=1，状态=已发布）
    python scripts/import_local_videos.py --source "E:\你的视频目录"

    # 自定义参数
    python scripts/import_local_videos.py --source "E:\视频" --author-id 2 --status 0

脚本会:
  1. 扫描 source 目录中的视频文件（.mp4/.mkv/.flv/.avi/.mov）
  2. 自动匹配同名的 .Cover.jpg / .Cover.png 封面
  3. 从文件名解析出标题和标签（【…】中的内容）
  4. 计算文件 MD5 用于秒传去重
  5. 复制文件到 storage/videos/ 和 storage/covers/
  6. 调 recommend 服务生成真实视频 embedding
  7. 通过 recommend 服务写入 Milvus `video_embedding`
  8. 写入 videos 表和 media_files 表
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path

try:
    import pymysql
except ImportError:
    print("需要安装 pymysql：pip install pymysql")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("需要安装 requests：pip install requests")
    sys.exit(1)


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


load_root_env()


# ──────────── 默认配置 ────────────
DEFAULT_DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "douyin_user"),
    "password": os.getenv("MYSQL_PASSWORD", "douyin_password"),
    "database": os.getenv("MYSQL_DATABASE", "douyin"),
    "charset": "utf8mb4",
}

# 相对于项目根目录
DEFAULT_STORAGE_BASE = "storage"
VIDEO_DIR_NAME = "videos"
COVER_DIR_NAME = "covers"
VIDEO_URL_PREFIX = "/uploads/videos/"
COVER_URL_PREFIX = "/uploads/covers/"

EMBEDDING_DIM = 128
DEFAULT_RECOMMEND_URL = os.getenv("RECOMMEND_SERVICE_URL", "http://localhost:18101")

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".flv", ".avi", ".mov", ".webm"}
COVER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


# ──────────── 工具函数 ────────────

def md5_file(filepath: str) -> str:
    """计算文件 MD5"""
    h = hashlib.md5()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def parse_filename(filename: str) -> dict:
    """
    从文件名解析视频信息。
    示例: "1-可爱女人【1st JAY】-480P 标清-AVC"
    返回: {"index": "1", "title": "可爱女人", "tags": ["1st JAY"], "quality": "480P 标清-AVC"}
    """
    # 去掉扩展名和 .Cover 后缀
    name = filename
    for ext in VIDEO_EXTENSIONS | COVER_EXTENSIONS:
        if name.lower().endswith(ext):
            name = name[: -len(ext)]
            break
    name = re.sub(r"\.Cover$", "", name, flags=re.IGNORECASE)

    # 提取【…】中的标签
    tags = re.findall(r"【(.+?)】", name)
    # 去掉标签部分
    clean_name = re.sub(r"【.+?】", "", name).strip()

    # 按 "-" 拆分: 序号-标题-质量描述
    parts = clean_name.split("-", 2)
    index = parts[0].strip() if len(parts) >= 1 else ""
    title = parts[1].strip() if len(parts) >= 2 else clean_name.strip()
    quality = parts[2].strip() if len(parts) >= 3 else ""

    return {
        "index": index,
        "title": title,
        "tags": tags,
        "quality": quality,
    }


def find_cover(video_path: Path) -> Path | None:
    """查找与视频配对的封面文件"""
    stem = video_path.stem  # e.g. "1-可爱女人【1st JAY】-480P 标清-AVC"
    parent = video_path.parent
    for ext in COVER_EXTENSIONS:
        # 尝试 xxx.Cover.jpg
        cover = parent / f"{stem}.Cover{ext}"
        if cover.exists():
            return cover
        # 尝试 xxx.cover.jpg (小写)
        cover = parent / f"{stem}.cover{ext}"
        if cover.exists():
            return cover
    return None


def copy_file_with_hash(src: Path, dest_dir: Path, file_hash: str) -> str:
    """
    将文件复制到目的目录, 文件名使用 md5hash + 原扩展名。
    返回最终文件名。
    """
    ext = src.suffix.lower()
    final_name = file_hash + ext
    dest = dest_dir / final_name
    if not dest.exists():
        shutil.copy2(src, dest)
        print(f"  复制: {src.name} -> {dest}")
    else:
        print(f"  跳过(已存在): {final_name}")
    return final_name


# ──────────── 数据库操作 ────────────

def insert_media_file(cursor, file_hash: str, file_size: int, file_name: str, video_url: str):
    """插入 media_files 表（秒传去重），如果已存在则跳过"""
    sql = """
        INSERT IGNORE INTO media_files (file_hash, file_size, file_name, video_url)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(sql, (file_hash, file_size, file_name, video_url))


def insert_video(cursor, author_id: int, title: str, tags: list, cover_url: str, video_url: str, status: int = 1):
    """
    插入 videos 表。status: 0=审核中, 1=已发布, 2=已删除
    返回插入的 video id
    """
    sql = """
        INSERT INTO videos (author_id, title, tags, status, cover_url, video_url)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    cursor.execute(sql, (author_id, title, json.dumps(tags, ensure_ascii=False), status, cover_url, video_url))
    return cursor.lastrowid


def generate_video_embedding(
    recommend_url: str,
    timeout_seconds: int,
    video_id: int,
    title: str,
    tags: list[str],
    cover_url: str,
    video_url: str,
) -> list[float]:
    """调用 recommend 服务生成视频 embedding。"""
    payload = {
        "video_id": video_id,
        "title": title,
        "tags": tags,
        "cover_url": cover_url or None,
        "video_url": video_url,
    }
    response = requests.post(
        f"{recommend_url.rstrip('/')}/api/embedding/video",
        json=payload,
        timeout=timeout_seconds,
    )
    response.raise_for_status()
    data = response.json()
    embedding = data.get("embedding")
    if not isinstance(embedding, list) or len(embedding) != EMBEDDING_DIM:
        raise ValueError(f"embedding 维度异常: {0 if embedding is None else len(embedding)}")
    return [float(item) for item in embedding]


def insert_video_embedding(
    recommend_url: str,
    timeout_seconds: int,
    video_id: int,
    embedding: list[float],
    author_id: int,
    created_ts_ms: int,
) -> None:
    """调用 recommend 服务将视频 embedding 写入 Milvus。"""
    payload = {
        "video_id": video_id,
        "embedding": embedding,
        "author_id": author_id,
        "created_ts": created_ts_ms,
    }
    response = requests.post(
        f"{recommend_url.rstrip('/')}/api/embedding/video/insert",
        json=payload,
        timeout=timeout_seconds,
    )
    response.raise_for_status()
    data = response.json()
    if not data.get("success"):
        raise ValueError(f"Milvus 写入失败: {data}")


# ──────────── 主流程 ────────────

def main():
    parser = argparse.ArgumentParser(description="本地视频批量入库脚本（含 embedding 入库）")
    parser.add_argument("--source", "-s", required=True, help="视频文件所在目录")
    parser.add_argument("--author-id", "-a", type=int, default=1, help="作者用户ID (默认: 1)")
    parser.add_argument("--status", type=int, default=1, choices=[0, 1, 2], help="视频状态: 0=审核中, 1=已发布, 2=已删除 (默认: 1)")
    parser.add_argument("--storage", default=None, help="storage 根目录 (默认: 项目下的 storage/)")
    parser.add_argument("--recursive", action="store_true", help="递归扫描 source 目录下的所有视频")
    parser.add_argument("--recommend-url", default=DEFAULT_RECOMMEND_URL, help="recommend 服务地址")
    parser.add_argument("--request-timeout", type=int, default=180, help="recommend 请求超时（秒）")
    parser.add_argument("--db-host", default=DEFAULT_DB_CONFIG["host"], help="MySQL 主机")
    parser.add_argument("--db-port", type=int, default=DEFAULT_DB_CONFIG["port"], help="MySQL 端口")
    parser.add_argument("--db-user", default=DEFAULT_DB_CONFIG["user"], help="MySQL 用户名")
    parser.add_argument("--db-password", default=DEFAULT_DB_CONFIG["password"], help="MySQL 密码")
    parser.add_argument("--db-name", default=DEFAULT_DB_CONFIG["database"], help="数据库名")
    parser.add_argument("--dry-run", action="store_true", help="仅预览，不实际执行")
    args = parser.parse_args()

    source_dir = Path(args.source).resolve()
    if not source_dir.is_dir():
        print(f"错误: 目录不存在 - {source_dir}")
        sys.exit(1)

    # 确定 storage 路径
    if args.storage:
        storage_base = Path(args.storage).resolve()
    else:
        # 默认为脚本所在项目的 storage 目录
        project_root = Path(__file__).resolve().parent.parent
        storage_base = project_root / DEFAULT_STORAGE_BASE

    video_dest = storage_base / VIDEO_DIR_NAME
    cover_dest = storage_base / COVER_DIR_NAME
    video_dest.mkdir(parents=True, exist_ok=True)
    cover_dest.mkdir(parents=True, exist_ok=True)

    # 扫描视频文件
    scan_iter = source_dir.rglob("*") if args.recursive else source_dir.iterdir()
    video_files = sorted(
        [f for f in scan_iter if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS],
        key=lambda p: str(p.relative_to(source_dir)).lower(),
    )

    if not video_files:
        print(f"未找到视频文件 ({', '.join(VIDEO_EXTENSIONS)}) in {source_dir}")
        sys.exit(0)

    print(f"找到 {len(video_files)} 个视频文件\n")

    # 预览信息
    import_list = []
    for vf in video_files:
        info = parse_filename(vf.name)
        cover = find_cover(vf)
        import_list.append({
            "video_path": vf,
            "cover_path": cover,
            "info": info,
        })
        status_text = "已发布" if args.status == 1 else "审核中"
        cover_text = cover.name if cover else "❌ 无封面"
        print(f"  [{info['index']}] {info['title']}")
        print(f"       标签: {info['tags'] or '无'}")
        print(f"       封面: {cover_text}")
        print(f"       状态: {status_text}")
        print()

    if args.dry_run:
        print("=== DRY RUN 模式，不执行任何操作 ===")
        return

    # 确认
    confirm = input(f"即将导入 {len(import_list)} 个视频到数据库，作者ID={args.author_id}。继续？(y/N): ")
    if confirm.lower() not in ("y", "yes"):
        print("已取消")
        return

    # 连接数据库
    conn = pymysql.connect(
        host=args.db_host,
        port=args.db_port,
        user=args.db_user,
        password=args.db_password,
        database=args.db_name,
        charset="utf8mb4",
    )
    cursor = conn.cursor()

    success_count = 0
    error_count = 0

    for item in import_list:
        vf = item["video_path"]
        cf = item["cover_path"]
        info = item["info"]
        title = info["title"]

        try:
            print(f"正在处理: {vf.name}")

            # 1. 计算视频 MD5 并复制
            video_hash = md5_file(str(vf))
            video_final_name = copy_file_with_hash(vf, video_dest, video_hash)
            video_url = VIDEO_URL_PREFIX + video_final_name

            # 2. 处理封面
            cover_url = ""
            if cf:
                cover_hash = md5_file(str(cf))
                cover_final_name = copy_file_with_hash(cf, cover_dest, cover_hash)
                cover_url = COVER_URL_PREFIX + cover_final_name

            # 3. 写入 media_files 表
            video_size = vf.stat().st_size
            insert_media_file(cursor, video_hash, video_size, vf.name, video_url)

            # 4. 写入 videos 表
            video_id = insert_video(
                cursor,
                author_id=args.author_id,
                title=title,
                tags=info["tags"],
                cover_url=cover_url,
                video_url=video_url,
                status=args.status,
            )

            # 5. 生成 embedding 并写入 Milvus
            embedding = generate_video_embedding(
                recommend_url=args.recommend_url,
                timeout_seconds=args.request_timeout,
                video_id=video_id,
                title=title,
                tags=info["tags"],
                cover_url=cover_url,
                video_url=video_url,
            )
            created_ts_ms = int(time.time() * 1000)
            insert_video_embedding(
                recommend_url=args.recommend_url,
                timeout_seconds=args.request_timeout,
                video_id=video_id,
                embedding=embedding,
                author_id=args.author_id,
                created_ts_ms=created_ts_ms,
            )

            conn.commit()

            print(f"  ✅ 入库成功 video_id={video_id}, title={title}\n")
            success_count += 1

        except Exception as e:
            print(f"  ❌ 入库失败: {e}\n")
            error_count += 1
            conn.rollback()
            continue

    cursor.close()
    conn.close()

    print("=" * 50)
    print(f"导入完成! 成功: {success_count}, 失败: {error_count}")


if __name__ == "__main__":
    main()
