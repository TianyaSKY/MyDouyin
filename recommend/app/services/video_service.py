"""
视频向量生成服务
"""
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock
from time import time
from typing import Any, Dict, List, Optional

import requests

from app.core.config import settings
from app.services.tmper_upload_service import tmper_upload_service

logger = logging.getLogger(__name__)


class VideoEmbeddingService:
    """视频向量生成服务"""

    _UPLOAD_URL_CACHE: Dict[str, Dict[str, Any]] = {}
    _CACHE_LOCK = Lock()
    _CACHE_TTL_SECONDS = 30 * 60

    @staticmethod
    def _project_root() -> Path:
        return Path(__file__).resolve().parents[3]

    @staticmethod
    def _resolve_local_media_path(url_or_path: str) -> Optional[Path]:
        if not url_or_path:
            return None

        raw = url_or_path.strip()
        if not raw:
            return None
        if raw.startswith("http://") or raw.startswith("https://"):
            return None

        if raw.startswith("/uploads/"):
            # 约定：/uploads/** 对应项目根目录 storage/**
            local_path = VideoEmbeddingService._project_root() / "storage" / raw[len("/uploads/"):]
            return local_path if local_path.exists() else None

        path_obj = Path(raw)
        if path_obj.is_absolute():
            return path_obj if path_obj.exists() else None

        candidate_paths = [
            VideoEmbeddingService._project_root() / raw.lstrip("/\\"),
            VideoEmbeddingService._project_root() / "storage" / raw.lstrip("/\\"),
        ]
        for candidate in candidate_paths:
            if candidate.exists():
                return candidate
        return None

    @staticmethod
    def _to_public_url(url_or_path: Optional[str]) -> Optional[str]:
        if not url_or_path:
            return None
        value = url_or_path.strip()
        if not value:
            return None
        if value.startswith("http://") or value.startswith("https://"):
            return value

        now = time()
        with VideoEmbeddingService._CACHE_LOCK:
            cached = VideoEmbeddingService._UPLOAD_URL_CACHE.get(value)
            if cached and cached.get("expires_at", 0) > now:
                cached_url = cached.get("url")
                if isinstance(cached_url, str) and cached_url:
                    return cached_url

        local_path = VideoEmbeddingService._resolve_local_media_path(value)
        if local_path is None:
            raise ValueError(f"Local media path not found: {value}")
        if not local_path.is_file():
            raise ValueError(f"Local media path is not a file: {value}")

        content = local_path.read_bytes()
        if not content:
            raise ValueError(f"Local media file is empty: {value}")

        suffix = local_path.suffix.lower()
        content_type_map = {
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        content_type = content_type_map.get(suffix, "application/octet-stream")
        upload_result = tmper_upload_service.upload_file(
            filename=local_path.name,
            content=content,
            content_type=content_type,
        )
        public_url = upload_result.get("url")
        if not public_url:
            raise ValueError("tmper upload success but no url in response")
        public_url = str(public_url)

        with VideoEmbeddingService._CACHE_LOCK:
            VideoEmbeddingService._UPLOAD_URL_CACHE[value] = {
                "url": public_url,
                "expires_at": now + VideoEmbeddingService._CACHE_TTL_SECONDS,
            }
        return public_url

    @staticmethod
    def _extract_embedding(data: Any) -> Optional[List[float]]:
        """
        递归提取响应中的第一个向量字段。
        """
        if isinstance(data, list):
            if data and all(isinstance(item, (int, float)) for item in data):
                return [float(item) for item in data]
            for item in data:
                embedding = VideoEmbeddingService._extract_embedding(item)
                if embedding is not None:
                    return embedding
            return None

        if isinstance(data, dict):
            for key in ("embedding", "embeddings", "dense_embedding", "vector"):
                if key in data:
                    embedding = VideoEmbeddingService._extract_embedding(data[key])
                    if embedding is not None:
                        return embedding
            for value in data.values():
                embedding = VideoEmbeddingService._extract_embedding(value)
                if embedding is not None:
                    return embedding
        return None

    @staticmethod
    def _normalize_embedding(embedding: List[float]) -> List[float]:
        """
        对齐向量维度，保持与系统配置一致（默认 128）。
        """
        target_dim = settings.EMBEDDING_DIM
        if len(embedding) == target_dim:
            return embedding
        if len(embedding) > target_dim:
            return embedding[:target_dim]
        return embedding + [0.0] * (target_dim - len(embedding))

    @staticmethod
    def generate_embedding(
        video_id: int,
        title: str,
        tags: List[str],
        cover_url: Optional[str] = None,
        video_url: Optional[str] = None,
    ) -> List[float]:
        """
        生成单个视频的向量

        Args:
            video_id: 视频ID
            title: 视频标题
            tags: 视频标签列表
            cover_url: 视频封面 URL
            video_url: 视频文件 URL

        Returns:
            对齐后的固定维度向量
        """
        try:
            if not settings.DASHSCOPE_API_KEY:
                raise ValueError("DASHSCOPE_API_KEY is not configured")

            text_parts = [title.strip()]
            if tags:
                text_parts.append(" ".join(tag.strip() for tag in tags if tag and tag.strip()))
            text_content = " ".join(part for part in text_parts if part)

            contents: List[Dict[str, Any]] = [{"text": text_content}]
            public_cover_url = VideoEmbeddingService._to_public_url(cover_url) if cover_url else None
            public_video_url = VideoEmbeddingService._to_public_url(video_url) if video_url else None
            if public_cover_url:
                contents.append({"image": public_cover_url})
            if public_video_url:
                contents.append({"video": public_video_url})

            payload = {
                "model": settings.DASHSCOPE_MULTIMODAL_MODEL,
                "input": {
                    "contents": contents,
                },
            }
            headers = {
                "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                settings.DASHSCOPE_EMBEDDING_URL,
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            response_data = response.json()

            raw_embedding = VideoEmbeddingService._extract_embedding(response_data)
            if not raw_embedding:
                raise ValueError("No embedding found in DashScope response")

            embedding = VideoEmbeddingService._normalize_embedding(raw_embedding)
            logger.info(f"Generated embedding via DashScope for video {video_id}")
            return embedding

        except Exception as e:
            logger.error(f"Error generating video embedding: {e}")
            raise

    @staticmethod
    def _generate_single_from_item(item: Dict[str, Any]) -> List[float]:
        video_id = int(item["video_id"])
        return VideoEmbeddingService.generate_embedding(
            video_id=video_id,
            title=item.get("title", ""),
            tags=item.get("tags", []),
            cover_url=item.get("cover_url"),
            video_url=item.get("video_url"),
        )

    @staticmethod
    def _generate_single_from_id(video_id: int) -> List[float]:
        return VideoEmbeddingService.generate_embedding(
            video_id=video_id,
            title=f"video_{video_id}",
            tags=[],
        )

    @staticmethod
    def generate_embeddings_batch(
        video_ids: Optional[List[int]] = None,
        video_items: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[int, List[float]]:
        """
        批量生成视频向量

        Args:
            video_ids: 视频ID列表
            video_items: 视频完整信息列表

        Returns:
            {video_id: embedding} 字典
        """
        try:
            embeddings: Dict[int, List[float]] = {}

            if video_items:
                max_workers = min(8, max(1, len(video_items)))
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    future_to_video_id = {
                        executor.submit(VideoEmbeddingService._generate_single_from_item, item): int(item["video_id"])
                        for item in video_items
                    }
                    for future in as_completed(future_to_video_id):
                        video_id = future_to_video_id[future]
                        embeddings[video_id] = future.result()
                logger.info(f"Generated batch embeddings via DashScope for {len(video_items)} videos")
                return embeddings

            if video_ids:
                max_workers = min(8, max(1, len(video_ids)))
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    future_to_video_id = {
                        executor.submit(VideoEmbeddingService._generate_single_from_id, int(video_id)): int(video_id)
                        for video_id in video_ids
                    }
                    for future in as_completed(future_to_video_id):
                        video_id = future_to_video_id[future]
                        embeddings[video_id] = future.result()
                logger.info(f"Generated batch embeddings via DashScope for {len(video_ids)} videos")
                return embeddings

            raise ValueError("videos or video_ids must be provided")

            return embeddings

        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise


video_embedding_service = VideoEmbeddingService()

