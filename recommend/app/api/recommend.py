"""
推荐相关 API 路由
"""
from fastapi import APIRouter, HTTPException
import logging

from app.schemas import (
    VideoEmbeddingRequest,
    VideoEmbeddingResponse,
    BatchVideoEmbeddingRequest,
    BatchVideoEmbeddingResponse,
    UserEmbeddingRequest,
    UserEmbeddingResponse,
    RankRequest,
    RankResponse,
)
from app.services import (
    video_embedding_service,
    user_embedding_service,
    ranking_service,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["recommendation"])


@router.post("/embedding/video", response_model=VideoEmbeddingResponse)
async def generate_video_embedding(request: VideoEmbeddingRequest):
    """
    生成视频向量
    
    - **video_id**: 视频ID
    - **title**: 视频标题
    - **tags**: 视频标签列表
    """
    try:
        embedding = video_embedding_service.generate_embedding(
            video_id=request.video_id,
            title=request.title,
            tags=request.tags
        )
        
        return VideoEmbeddingResponse(
            video_id=request.video_id,
            embedding=embedding,
            dimension=len(embedding)
        )
    
    except Exception as e:
        logger.error(f"Error generating video embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embedding/video/batch", response_model=BatchVideoEmbeddingResponse)
async def generate_video_embeddings_batch(request: BatchVideoEmbeddingRequest):
    """
    批量生成视频向量
    
    - **video_ids**: 视频ID列表
    """
    try:
        embeddings = video_embedding_service.generate_embeddings_batch(
            video_ids=request.video_ids
        )
        
        return BatchVideoEmbeddingResponse(
            embeddings=embeddings,
            count=len(embeddings)
        )
    
    except Exception as e:
        logger.error(f"Error generating batch video embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embedding/user", response_model=UserEmbeddingResponse)
async def calculate_user_embedding(request: UserEmbeddingRequest):
    """
    计算用户实时向量
    
    - **user_id**: 用户ID
    - **recent_events**: 最近的交互行为列表
    """
    try:
        # 转换为字典列表
        events_data = [event.dict() for event in request.recent_events]
        
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
    
    except Exception as e:
        logger.error(f"Error calculating user embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rank", response_model=RankResponse)
async def rank_videos(request: RankRequest):
    """
    精排服务 - 使用 Wide & Deep 模型对召回的视频进行精排
    
    - **user_id**: 用户ID
    - **user_embedding**: 用户向量
    - **candidates**: 候选视频列表
    - **top_k**: 返回Top K
    """
    try:
        # 转换为字典列表
        candidates_data = [candidate.dict() for candidate in request.candidates]
        
        ranked_videos = ranking_service.rank_videos(
            user_id=request.user_id,
            user_embedding=request.user_embedding,
            candidates=candidates_data,
            top_k=request.top_k
        )
        
        return RankResponse(
            user_id=request.user_id,
            ranked_videos=ranked_videos,
            count=len(ranked_videos)
        )
    
    except Exception as e:
        logger.error(f"Error ranking videos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

