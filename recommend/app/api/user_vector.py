"""
User vector API 路由
"""
from fastapi import APIRouter, HTTPException
import logging

from app.schemas import UpdateUserLongTermVectorRequest, InsertUserVectorRequest
from app.services import milvus_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["user-vector"])


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
async def update_user_long_term_vector(request: UpdateUserLongTermVectorRequest):
    """
    更新用户长期向量（到 Milvus）

    - **user_id**: 用户ID
    - **vector**: 长期向量 (128维)
    """
    try:
        user_id = request.user_id
        vector = request.vector

        if len(vector) != 128:
            raise HTTPException(status_code=400, detail="Vector dimension must be 128")

        success = milvus_service.update_user_long_term_vector(user_id, vector)

        if success:
            return {"success": True, "message": "User long-term vector updated"}
        raise HTTPException(status_code=500, detail="Failed to update vector")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user long-term vector: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/vector")
async def insert_user_vector(request: InsertUserVectorRequest):
    """
    插入用户向量（到 Milvus）

    - **user_id**: 用户ID
    - **long_term_vec**: 长期向量 (128维)
    - **interest_vec**: 初始兴趣向量 (128维)
    """
    try:
        user_id = request.user_id
        long_term_vec = request.long_term_vec
        interest_vec = request.interest_vec

        if len(long_term_vec) != 128 or len(interest_vec) != 128:
            raise HTTPException(status_code=400, detail="Vector dimension must be 128")

        success = milvus_service.insert_user_vector(user_id, long_term_vec, interest_vec)

        if success:
            return {"success": True, "message": "User vector inserted"}
        raise HTTPException(status_code=500, detail="Failed to insert vector")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inserting user vector: {e}")
        raise HTTPException(status_code=500, detail=str(e))
