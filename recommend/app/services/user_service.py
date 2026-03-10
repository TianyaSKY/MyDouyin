"""
用户向量计算服务
"""
import torch
import numpy as np
import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone
from app.core.config import settings
from app.services.model_service import model_manager

logger = logging.getLogger(__name__)
EMBEDDING_DIM = settings.EMBEDDING_DIM


class UserEmbeddingService:
    """用户向量计算服务"""
    
    # 行为权重映射
    EVENT_WEIGHTS = {
        "CLICK": 0.3,
        "LIKE": 1.0,
        "FINISH": 1.5,
        "SHARE": 2.0
    }

    @staticmethod
    def _parse_event_time(event: Dict) -> Optional[datetime]:
        """Parse event time as UTC for stable cross-timezone decay calculation."""
        timestamp_ms = event.get("timestamp_ms")
        if timestamp_ms is not None:
            try:
                return datetime.fromtimestamp(float(timestamp_ms) / 1000.0, tz=timezone.utc)
            except (TypeError, ValueError, OSError):
                pass

        timestamp = event.get("timestamp")
        if not timestamp:
            return None

        try:
            parsed = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            return None
    
    @staticmethod
    def calculate_embedding(user_id: int, recent_events: List[Dict]) -> List[float]:
        """
        计算用户实时向量
        
        Args:
            user_id: 用户ID
            recent_events: 最近的交互行为列表
            
        Returns:
            1024维用户向量
        """
        try:
            if not recent_events:
                # 返回默认向量
                return [0.0] * EMBEDDING_DIM
            
            # 1. 准备数据
            video_embeddings = []
            weights = []
            now_utc = datetime.now(timezone.utc)
            
            for event in recent_events:
                video_emb = event.get("video_embedding", [])
                if len(video_emb) != EMBEDDING_DIM:
                    continue
                
                # 计算权重：行为权重 × 时间衰减
                event_type = event.get("event_type", "CLICK")
                behavior_weight = UserEmbeddingService.EVENT_WEIGHTS.get(event_type, 0.3)
                
                # 时间衰减
                event_time_utc = UserEmbeddingService._parse_event_time(event)
                if event_time_utc is not None:
                    hours_diff = max(0.0, (now_utc - event_time_utc).total_seconds() / 3600.0)
                    time_decay = float(np.exp(-0.01 * hours_diff))
                else:
                    time_decay = 1.0
                
                final_weight = behavior_weight * time_decay
                
                video_embeddings.append(video_emb)
                weights.append(final_weight)
            
            if not video_embeddings:
                return [0.0] * EMBEDDING_DIM
            
            # 2. 转为 Tensor
            video_emb_tensor = torch.tensor(
                [video_embeddings], 
                dtype=torch.float32
            ).to(model_manager.device)
            
            weights_tensor = torch.tensor(
                [[w] for w in weights], 
                dtype=torch.float32
            ).unsqueeze(0).to(model_manager.device)
            
            # 3. 模型推理
            with torch.no_grad():
                user_embedding = model_manager.user_encoder(video_emb_tensor, weights_tensor)
                user_embedding = user_embedding.cpu().numpy()[0].tolist()
            
            logger.info(f"Calculated user embedding for user {user_id} from {len(video_embeddings)} events")
            return user_embedding
            
        except Exception as e:
            logger.error(f"Error calculating user embedding: {e}")
            raise


user_embedding_service = UserEmbeddingService()

