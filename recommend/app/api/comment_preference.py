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
    计算评论偏好分数（含深度学习情感分析）

    使用 Erlangshen-Roberta-110M-Sentiment 模型分析评论情感，
    结合用户-视频向量相似度，综合计算用户对该视频的喜好程度。

    返回值：
    - **preference_score**: 综合偏好分 (0-1)
    - **sentiment_score**: 情感分析分数 (0=负面, 1=正面)
    - **comment_weight**: 映射后的行为权重 (用于用户向量计算)
    """
    preference_score, sentiment_score, comment_weight = (
        comment_preference_service.compute_preference_with_sentiment(
            user_id=request.user_id,
            video_id=request.video_id,
            comment_id=request.comment_id,
            content=request.content,
        )
    )

    return CommentPreferenceResponse(
        user_id=request.user_id,
        video_id=request.video_id,
        comment_id=request.comment_id,
        preference_score=preference_score,
        sentiment_score=sentiment_score,
        comment_weight=comment_weight,
    )
