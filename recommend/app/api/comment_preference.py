"""
评论偏好计算 API 路由
"""
from fastapi import APIRouter

from app.schemas import CommentPreferenceRequest, CommentPreferenceResponse
from app.services.comment_service import comment_preference_service

router = APIRouter(tags=["comment"])


@router.post("/comment/preference", response_model=CommentPreferenceResponse)
async def compute_comment_preference(request: CommentPreferenceRequest):
    """
    计算评论偏好分数

    基于评论内容的情感分析 + 用户-视频向量相似度，
    综合计算用户对该视频的喜好程度 (0-1)。

    - **user_id**: 用户ID
    - **video_id**: 视频ID
    - **comment_id**: 评论ID
    - **content**: 评论内容
    """
    preference_score = comment_preference_service.compute_preference(
        user_id=request.user_id,
        video_id=request.video_id,
        comment_id=request.comment_id,
        content=request.content,
    )

    return CommentPreferenceResponse(
        user_id=request.user_id,
        video_id=request.video_id,
        comment_id=request.comment_id,
        preference_score=preference_score,
    )
