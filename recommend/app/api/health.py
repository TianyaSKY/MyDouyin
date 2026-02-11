"""
健康检查和系统信息 API
"""
from fastapi import APIRouter
from app.schemas import HealthResponse
from app.services import model_manager

router = APIRouter(tags=["system"])


@router.get("/")
async def root():
    """根路径"""
    return {
        "service": "Douyin Recommendation Service",
        "version": "1.0.0",
        "status": "running"
    }


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    return HealthResponse(
        status="healthy",
        device=str(model_manager.device),
        models=model_manager.get_model_status()
    )

