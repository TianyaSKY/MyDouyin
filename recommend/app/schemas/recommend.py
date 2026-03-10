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


class BatchVideoEmbeddingItem(BaseModel):
    """批量视频向量中的单条视频"""
    video_id: int = Field(..., description="视频ID")
    title: str = Field("", description="视频标题")
    tags: List[str] = Field(default_factory=list, description="视频标签列表")
    cover_url: Optional[str] = Field(None, description="封面URL")
    video_url: Optional[str] = Field(None, description="视频URL")


class BatchVideoEmbeddingRequest(BaseModel):
    """批量视频向量请求"""
    videos: Optional[List[BatchVideoEmbeddingItem]] = Field(None, description="批量视频信息")
    video_ids: Optional[List[int]] = Field(None, description="仅传视频ID（兼容旧格式）")


class BatchVideoEmbeddingResponse(BaseModel):
    """批量视频向量响应"""
    embeddings: Dict[int, List[float]]
    count: int


class InsertVideoEmbeddingRequest(BaseModel):
    """插入视频向量请求"""
    video_id: int = Field(..., description="视频ID")
    embedding: List[float] = Field(..., min_length=1024, max_length=1024, description="视频向量 (1024维)")
    author_id: int = Field(..., description="作者ID")
    created_ts: Optional[int] = Field(None, description="创建时间戳（毫秒）")


class UserEventData(BaseModel):
    """用户行为数据"""
    video_id: int
    event_type: str
    timestamp: str
    timestamp_ms: Optional[int] = None
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


class UpdateUserLongTermVectorRequest(BaseModel):
    """更新用户长期向量请求"""
    user_id: int = Field(..., description="用户ID")
    vector: List[float] = Field(..., min_length=1024, max_length=1024, description="长期向量 (1024维)")


class InsertUserVectorRequest(BaseModel):
    """插入用户向量请求"""
    user_id: int = Field(..., description="用户ID")
    long_term_vec: List[float] = Field(..., min_length=1024, max_length=1024, description="长期向量 (1024维)")
    interest_vec: List[float] = Field(..., min_length=1024, max_length=1024, description="兴趣向量 (1024维)")


class VectorRecallRequest(BaseModel):
    """向量召回请求"""
    user_id: int = Field(..., description="用户ID")
    user_vector: List[float] = Field(..., min_length=1024, max_length=1024, description="用户向量 (1024维)")
    top_k: int = Field(100, description="返回Top K")


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

