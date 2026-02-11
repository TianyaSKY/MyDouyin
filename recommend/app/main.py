"""
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.api import recommend_router, health_router
from app.utils import setup_logging

# 配置日志
setup_logging()
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """创建 FastAPI 应用"""
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="基于 PyTorch 的推荐服务",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # CORS 中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 注册路由
    app.include_router(health_router)
    app.include_router(recommend_router)
    
    @app.on_event("startup")
    async def startup_event():
        """启动事件"""
        logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        logger.info(f"Debug mode: {settings.DEBUG}")
        logger.info(f"Model path: {settings.MODEL_PATH}")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        """关闭事件"""
        logger.info("Shutting down recommendation service")
    
    return app


app = create_app()

