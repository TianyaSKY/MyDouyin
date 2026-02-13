"""
视频向量生成服务
"""
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


class VideoEmbeddingService:
    """视频向量生成服务"""

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
            if cover_url:
                contents.append({"image": cover_url})
            if video_url:
                contents.append({"video": video_url})

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

