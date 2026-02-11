"""
推荐相关 API 路由
"""
from fastapi import APIRouter, HTTPException
import logging
from typing import List

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
    milvus_service,
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


# ==================== 用户向量管理 API ====================

@router.get("/user/vector/long-term/{user_id}")
async def get_user_long_term_vector(user_id: int):
    """
    获取用户长期向量（从 Milvus）
    
    - **user_id**: 用户ID
    """
    try:
        vectors = milvus_service.get_user_vectors(user_id)
        
        if vectors is None:
            raise HTTPException(status_code=404, detail="User vector not found")
        
        return {
            "user_id": user_id,
            "vector": vectors["long_term_vec"],
            "dimension": len(vectors["long_term_vec"]),
            "updated_at": vectors["updated_at"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user long-term vector: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/vector/long-term")
async def update_user_long_term_vector(request: dict):
    """
    更新用户长期向量（到 Milvus）
    
    - **user_id**: 用户ID
    - **vector**: 长期向量 (128维)
    """
    try:
        user_id = request.get("user_id")
        vector = request.get("vector")
        
        if not user_id or not vector:
            raise HTTPException(status_code=400, detail="Missing user_id or vector")
        
        if len(vector) != 128:
            raise HTTPException(status_code=400, detail="Vector dimension must be 128")
        
        success = milvus_service.update_user_long_term_vector(user_id, vector)
        
        if success:
            return {"success": True, "message": "User long-term vector updated"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update vector")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user long-term vector: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/vector")
async def insert_user_vector(request: dict):
    """
    插入用户向量（到 Milvus）
    
    - **user_id**: 用户ID
    - **long_term_vec**: 长期向量 (128维)
    - **interest_vec**: 初始兴趣向量 (128维)
    """
    try:
        user_id = request.get("user_id")
        long_term_vec = request.get("long_term_vec")
        interest_vec = request.get("interest_vec")
        
        if not user_id or not long_term_vec or not interest_vec:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        if len(long_term_vec) != 128 or len(interest_vec) != 128:
            raise HTTPException(status_code=400, detail="Vector dimension must be 128")
        
        success = milvus_service.insert_user_vector(user_id, long_term_vec, interest_vec)
        
        if success:
            return {"success": True, "message": "User vector inserted"}
        else:
            raise HTTPException(status_code=500, detail="Failed to insert vector")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inserting user vector: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recall/vector")
async def vector_recall(request: dict):
    """
    向量召回 - 根据用户向量搜索相似视频
    
    - **user_id**: 用户ID
    - **user_vector**: 用户向量 (128维)
    - **top_k**: 返回Top K
    """
    try:
        user_id = request.get("user_id")
        user_vector = request.get("user_vector")
        top_k = request.get("top_k", 100)
        
        if not user_id or not user_vector:
            raise HTTPException(status_code=400, detail="Missing user_id or user_vector")
        
        if len(user_vector) != 128:
            raise HTTPException(status_code=400, detail="Vector dimension must be 128")
        
        videos = milvus_service.search_similar_videos(user_vector, top_k)
        
        video_ids = [v["video_id"] for v in videos]
        
        return {
            "user_id": user_id,
            "video_ids": video_ids,
            "count": len(video_ids)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing vector recall: {e}")
        raise HTTPException(status_code=500, detail=str(e))


