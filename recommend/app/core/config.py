"""
配置管理
"""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT_ENV),
        case_sensitive=True,
        extra="ignore",
    )

    # 应用配置
    APP_NAME: str = "Douyin Recommendation Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # 服务配置
    HOST: str = "0.0.0.0"
    RECOMMEND_PORT: int = 18101

    # 模型配置
    MODEL_PATH: str = "./models"
    EMBEDDING_DIM: int = 1024
    TAG_VOCAB_SIZE: int = 10000

    # Redis 配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None

    # MySQL 配置
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "root"
    MYSQL_DATABASE: str = "douyin"

    # Milvus 配置
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530

    # 推理配置
    BATCH_SIZE: int = 32
    USE_GPU: bool = True

    # 七牛云上传配置
    QINIU_ACCESS_KEY: str = ""
    QINIU_SECRET_KEY: str = ""
    QINIU_BUCKET_NAME: str = ""
    QINIU_PUBLIC_BASE_URL: str = ""
    QINIU_KEY_PREFIX: str = "douyin"

    # DashScope 多模态向量配置
    DASHSCOPE_API_KEY: str = ""
    DASHSCOPE_EMBEDDING_URL: str = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding"
    DASHSCOPE_MULTIMODAL_MODEL: str = "qwen3-vl-embedding"

    @property
    def PORT(self) -> int:
        return self.RECOMMEND_PORT


settings = Settings()
