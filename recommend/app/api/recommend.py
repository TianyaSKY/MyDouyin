"""
推荐 API 聚合路由
"""
from fastapi import APIRouter

from .embedding import router as embedding_router
from .ranking import router as ranking_router
from .user_vector import router as user_vector_router
from .recall import router as recall_router
from .upload import router as upload_router

router = APIRouter(prefix="/api")
router.include_router(embedding_router)
router.include_router(ranking_router)
router.include_router(user_vector_router)
router.include_router(recall_router)
router.include_router(upload_router)


