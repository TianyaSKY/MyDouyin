"""
Embedding API 路由
"""
from fastapi import APIRouter, HTTPException
import time

from app.schemas import (
    VideoEmbeddingRequest,
    VideoEmbeddingResponse,
    BatchVideoEmbeddingRequest,
    BatchVideoEmbeddingResponse,
    InsertVideoEmbeddingRequest,
    UserEmbeddingRequest,
    UserEmbeddingResponse,
)
from app.services import video_embedding_service, user_embedding_service, milvus_service
router = APIRouter(tags=["embedding"])


@router.post("/embedding/video", response_model=VideoEmbeddingResponse)
async def generate_video_embedding(request: VideoEmbeddingRequest):
    """
    生成视频向量

    - **video_id**: 视频ID
    - **title**: 视频标题
    - **tags**: 视频标签列表
    """
    embedding = video_embedding_service.generate_embedding(
        video_id=request.video_id,
        title=request.title,
        tags=request.tags,
        cover_url=request.cover_url,
        video_url=request.video_url,
    )

    return VideoEmbeddingResponse(
        video_id=request.video_id,
        embedding=embedding,
        dimension=len(embedding)
    )


@router.post("/embedding/video/batch", response_model=BatchVideoEmbeddingResponse)
async def generate_video_embeddings_batch(request: BatchVideoEmbeddingRequest):
    """
    批量生成视频向量

    - **videos**: 每条视频的完整多模态信息（推荐）
    - **video_ids**: 仅视频ID（兼容旧格式）
    """
    video_items = [item.model_dump() for item in request.videos] if request.videos else None
    embeddings = video_embedding_service.generate_embeddings_batch(
        video_ids=request.video_ids,
        video_items=video_items,
    )

    return BatchVideoEmbeddingResponse(
        embeddings=embeddings,
        count=len(embeddings)
    )


@router.post("/embedding/video/insert")
async def insert_video_embedding(request: InsertVideoEmbeddingRequest):
    """
    插入视频向量到 Milvus

    - **video_id**: 视频ID
    - **embedding**: 视频向量 (128维)
    - **author_id**: 作者ID
    - **created_ts**: 创建时间戳（毫秒，可选）
    """
    created_ts = request.created_ts if request.created_ts is not None else int(time.time() * 1000)
    success = milvus_service.insert_video_embedding(
        video_id=request.video_id,
        embedding=request.embedding,
        author_id=request.author_id,
        created_ts=created_ts
    )

    if success:
        return {"success": True, "message": "Video embedding inserted"}
    raise HTTPException(status_code=500, detail="Failed to insert video embedding")


@router.post("/embedding/user", response_model=UserEmbeddingResponse)
async def calculate_user_embedding(request: UserEmbeddingRequest):
    """
    计算用户实时向量

    - **user_id**: 用户ID
    - **recent_events**: 最近的交互行为列表
    """
    events_data = [event.model_dump() for event in request.recent_events]

    embedding = user_embedding_service.calculate_embedding(
        user_id=request.user_id,
        recent_events=events_data
    )

    return UserEmbeddingResponse(
        user_id=request.user_id,
        embedding=embedding,
        dimension=len(embedding),
        events_count=len(request.recent_events)
    )
