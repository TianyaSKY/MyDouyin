"""
视频向量生成服务
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import sha256
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit

import redis
import requests

from app.core.config import settings
from app.services.tmper_upload_service import qiniu_upload_service

logger = logging.getLogger(__name__)


class VideoEmbeddingService:
    """视频向量生成服务"""

    _CACHE_TTL_SECONDS = 30 * 60  # 30min
    _CACHE_KEY_PREFIX = "recommend:upload:url:"
    _redis_client: Optional[redis.Redis] = None

    @staticmethod
    def _truncate_for_log(value: Optional[str], max_length: int = 500) -> Optional[str]:
        if value is None:
            return None
        if len(value) <= max_length:
            return value
        return f"{value[:max_length]}...(truncated, total={len(value)} chars)"

    @staticmethod
    def _project_root() -> Path:
        return Path(__file__).resolve().parents[3]

    @classmethod
    def _get_redis_client(cls) -> redis.Redis:
        if cls._redis_client is None:
            cls._redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
            )
        return cls._redis_client

    @staticmethod
    def _cache_key(local_ref: str) -> str:
        digest = sha256(local_ref.encode("utf-8")).hexdigest()
        return f"{VideoEmbeddingService._CACHE_KEY_PREFIX}{digest}"

    @classmethod
    def _get_cached_public_url(cls, local_ref: str) -> Optional[str]:
        value = cls._get_redis_client().get(cls._cache_key(local_ref))
        if isinstance(value, str) and value:
            normalized_value = cls._normalize_public_url(value)
            if normalized_value != value:
                cls._set_cached_public_url(local_ref, normalized_value)
            logger.info("Using cached public media URL for local_ref=%s", local_ref)
            return normalized_value
        return None

    @classmethod
    def _set_cached_public_url(cls, local_ref: str, public_url: str) -> None:
        cls._get_redis_client().setex(
            cls._cache_key(local_ref),
            cls._CACHE_TTL_SECONDS,
            public_url,
        )

    @staticmethod
    def _resolve_local_media_path(url_or_path: str) -> Optional[Path]:
        raw = url_or_path.strip()
        if not raw:
            return None
        if raw.startswith("http://") or raw.startswith("https://"):
            return None

        if raw.startswith("/uploads/"):
            # 约定：/uploads/** 对应项目根目录 storage/**
            local_path = (
                VideoEmbeddingService._project_root()
                / "storage"
                / raw[len("/uploads/") :]
            )
            return local_path if local_path.exists() else None

        path_obj = Path(raw)
        if path_obj.is_absolute():
            return path_obj if path_obj.exists() else None
        return None

    @staticmethod
    def _normalize_public_url(url: str) -> str:
        value = url.strip()
        if not value:
            raise ValueError("Public media URL cannot be empty")

        parsed = urlsplit(value)
        if parsed.scheme:
            return value

        normalized = f"https://{value.lstrip('/')}"
        logger.info(
            "Normalized public media URL without scheme: original=%s normalized=%s",
            VideoEmbeddingService._truncate_for_log(value),
            VideoEmbeddingService._truncate_for_log(normalized),
        )
        return normalized

    @staticmethod
    def _to_public_url(url_or_path: Optional[str]) -> Optional[str]:
        if not url_or_path:
            return None
        value = url_or_path.strip()
        if not value:
            return None
        if value.startswith("http://") or value.startswith("https://"):
            value = VideoEmbeddingService._normalize_public_url(value)
            logger.info(
                "Media is already a public URL: %s",
                VideoEmbeddingService._truncate_for_log(value),
            )
            return value

        if (
            "/" in value
            and not Path(value).is_absolute()
            and not value.startswith("/uploads/")
        ):
            return VideoEmbeddingService._normalize_public_url(value)

        cached_url = VideoEmbeddingService._get_cached_public_url(value)
        if cached_url:
            return cached_url

        local_path = VideoEmbeddingService._resolve_local_media_path(value)
        if local_path is None:
            raise ValueError(f"Local media path not found: {value}")
        if not local_path.is_file():
            raise ValueError(f"Local media path is not a file: {value}")

        logger.info(
            "Uploading local media to qiniu: path=%s size_bytes=%s",
            local_path,
            local_path.stat().st_size,
        )
        upload_result = qiniu_upload_service.upload_local_file(local_path)
        public_url = upload_result.get("url")
        if not public_url:
            raise ValueError("qiniu upload success but no url in response")
        public_url = VideoEmbeddingService._normalize_public_url(str(public_url))
        logger.info(
            "Uploaded local media to qiniu: path=%s public_url=%s",
            local_path,
            VideoEmbeddingService._truncate_for_log(public_url),
        )

        VideoEmbeddingService._set_cached_public_url(value, public_url)
        return public_url

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
                text_parts.append(
                    " ".join(tag.strip() for tag in tags if tag and tag.strip())
                )
            text_content = " ".join(part for part in text_parts if part)

            contents: List[Dict[str, Any]] = [{"text": text_content}]
            public_cover_url = (
                VideoEmbeddingService._to_public_url(cover_url) if cover_url else None
            )
            public_video_url = (
                VideoEmbeddingService._to_public_url(video_url) if video_url else None
            )
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
            logger.info(
                "Requesting DashScope embedding: video_id=%s model=%s text_length=%s content_count=%s has_cover=%s has_video=%s cover_url=%s video_url=%s",
                video_id,
                settings.DASHSCOPE_MULTIMODAL_MODEL,
                len(text_content),
                len(contents),
                bool(public_cover_url),
                bool(public_video_url),
                VideoEmbeddingService._truncate_for_log(public_cover_url),
                VideoEmbeddingService._truncate_for_log(public_video_url),
            )

            response = requests.post(
                settings.DASHSCOPE_EMBEDDING_URL,
                json=payload,
                headers=headers,
                timeout=240,
            )
            if not response.ok:
                logger.error(
                    "DashScope embedding request failed: video_id=%s model=%s status=%s response=%s",
                    video_id,
                    settings.DASHSCOPE_MULTIMODAL_MODEL,
                    response.status_code,
                    VideoEmbeddingService._truncate_for_log(
                        response.text, max_length=4000
                    ),
                )
            response.raise_for_status()
            response_data = response.json()

            output = response_data.get("output", {})
            embeddings = output.get("embeddings", [])
            if not isinstance(embeddings, list) or not embeddings:
                raise ValueError("No embeddings found in DashScope response")

            first = embeddings[0]
            if not isinstance(first, dict):
                raise ValueError("Invalid embeddings format in DashScope response")

            raw_embedding = first.get("embedding")
            if not isinstance(raw_embedding, list) or not raw_embedding:
                raise ValueError("No embedding vector found in DashScope response")
            if not all(isinstance(item, (int, float)) for item in raw_embedding):
                raise ValueError("Invalid embedding vector type in DashScope response")

            target_dim = settings.EMBEDDING_DIM
            embedding = [float(item) for item in raw_embedding[:target_dim]]
            if len(embedding) < target_dim:
                embedding.extend([0.0] * (target_dim - len(embedding)))
            logger.info(f"Generated embedding via DashScope for video {video_id}")
            return embedding

        except requests.HTTPError:
            logger.error(
                "HTTP error while generating embedding for video %s",
                video_id,
                exc_info=True,
            )
            raise
        except Exception as e:
            logger.error(
                f"Error generating video embedding for video {video_id}: {e}",
                exc_info=True,
            )
            raise

    @staticmethod
    def _run_batch(tasks: Dict[int, Dict[str, Any]]) -> Dict[int, List[float]]:
        embeddings: Dict[int, List[float]] = {}
        max_workers = min(8, max(1, len(tasks)))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_video_id = {
                executor.submit(
                    VideoEmbeddingService.generate_embedding, **payload
                ): video_id
                for video_id, payload in tasks.items()
            }
            for future in as_completed(future_to_video_id):
                video_id = future_to_video_id[future]
                embeddings[video_id] = future.result()
        return embeddings

    @staticmethod
    def generate_embeddings_batch(
        video_ids: Optional[List[int]] = None,
        video_items: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[int, List[float]]:
        """
        批量生成视频向量
        """
        try:
            if video_items:
                tasks = {
                    int(item["video_id"]): {
                        "video_id": int(item["video_id"]),
                        "title": item.get("title", ""),
                        "tags": item.get("tags", []),
                        "cover_url": item.get("cover_url"),
                        "video_url": item.get("video_url"),
                    }
                    for item in video_items
                }
                embeddings = VideoEmbeddingService._run_batch(tasks)
                logger.info(
                    f"Generated batch embeddings via DashScope for {len(tasks)} videos"
                )
                return embeddings

            if video_ids:
                tasks = {
                    int(video_id): {
                        "video_id": int(video_id),
                        "title": f"video_{int(video_id)}",
                        "tags": [],
                    }
                    for video_id in video_ids
                }
                embeddings = VideoEmbeddingService._run_batch(tasks)
                logger.info(
                    f"Generated batch embeddings via DashScope for {len(tasks)} videos"
                )
                return embeddings

            raise ValueError("videos or video_ids must be provided")
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise


video_embedding_service = VideoEmbeddingService()
