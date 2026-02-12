"""
Ranking API 路由
"""
from fastapi import APIRouter, HTTPException
import logging

from app.schemas import RankRequest, RankResponse
from app.services import ranking_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ranking"])


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
