"""
Recall API 路由
"""
from fastapi import APIRouter

from app.schemas import VectorRecallRequest
from app.services import milvus_service

router = APIRouter(tags=["recall"])


@router.post("/recall/vector")
async def vector_recall(request: VectorRecallRequest):
    """
    向量召回 - 根据用户向量搜索相似视频

    - **user_id**: 用户ID
    - **user_vector**: 用户向量 (1024维)
    - **top_k**: 返回Top K
    """
    user_id = request.user_id
    user_vector = request.user_vector
    top_k = request.top_k

    videos = milvus_service.search_similar_videos(user_vector, top_k)
    video_ids = [v["video_id"] for v in videos]

    return {
        "user_id": user_id,
        "video_ids": video_ids,
        "count": len(video_ids)
    }
