"""
数据模型 - Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class VideoEmbeddingRequest(BaseModel):
    """视频向量生成请求"""
    video_id: int = Field(..., description="视频ID")
    title: str = Field(..., description="视频标题")
    tags: List[str] = Field(..., description="视频标签列表")
    cover_url: Optional[str] = Field(None, description="封面URL")
    video_url: Optional[str] = Field(None, description="视频URL")


class VideoEmbeddingResponse(BaseModel):
    """视频向量生成响应"""
    video_id: int
    embedding: List[float]
    dimension: int


class BatchVideoEmbeddingRequest(BaseModel):
    """批量视频向量请求"""
    video_ids: List[int] = Field(..., description="视频ID列表")


class BatchVideoEmbeddingResponse(BaseModel):
    """批量视频向量响应"""
    embeddings: Dict[int, List[float]]
    count: int


class UserEventData(BaseModel):
    """用户行为数据"""
    video_id: int
    event_type: str
    timestamp: str
    video_embedding: List[float]


class UserEmbeddingRequest(BaseModel):
    """用户向量计算请求"""
    user_id: int = Field(..., description="用户ID")
    recent_events: List[UserEventData] = Field(..., description="最近的交互行为")


class UserEmbeddingResponse(BaseModel):
    """用户向量计算响应"""
    user_id: int
    embedding: List[float]
    dimension: int
    events_count: int


class CandidateVideo(BaseModel):
    """候选视频"""
    video_id: int
    video_embedding: List[float]
    recall_score: float = 0.0
    hot_score: float = 0.0


class RankRequest(BaseModel):
    """精排请求"""
    user_id: int = Field(..., description="用户ID")
    user_embedding: List[float] = Field(..., description="用户向量")
    candidates: List[CandidateVideo] = Field(..., description="候选视频列表")
    top_k: int = Field(20, description="返回Top K")


class RankedVideo(BaseModel):
    """排序后的视频"""
    video_id: int
    rank_score: float
    recall_score: float
    hot_score: float


class RankResponse(BaseModel):
    """精排响应"""
    user_id: int
    ranked_videos: List[RankedVideo]
    count: int


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    device: str
    models: Dict[str, str]

