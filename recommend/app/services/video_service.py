"""
视频向量生成服务
"""
import torch
import logging
from typing import List, Dict
from app.services.model_service import model_manager

logger = logging.getLogger(__name__)


class VideoEmbeddingService:
    """视频向量生成服务"""
    
    @staticmethod
    def generate_embedding(video_id: int, title: str, tags: List[str]) -> List[float]:
        """
        生成单个视频的向量
        
        Args:
            video_id: 视频ID
            title: 视频标题
            tags: 视频标签列表
            
        Returns:
            128维向量
        """
        try:
            # 1. 标签转ID
            tag_ids = [model_manager.tag_to_id(tag) for tag in tags[:10]]  # 最多10个标签
            
            # 补齐到10个
            while len(tag_ids) < 10:
                tag_ids.append(0)  # PAD
            
            # 2. 转为 Tensor
            tag_tensor = torch.tensor([tag_ids], dtype=torch.long).to(model_manager.device)
            
            # 3. 模型推理
            with torch.no_grad():
                embedding = model_manager.video_encoder(tag_tensor)
                embedding = embedding.cpu().numpy()[0].tolist()
            
            logger.info(f"Generated embedding for video {video_id}")
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating video embedding: {e}")
            raise
    
    @staticmethod
    def generate_embeddings_batch(video_ids: List[int]) -> Dict[int, List[float]]:
        """
        批量生成视频向量
        
        Args:
            video_ids: 视频ID列表
            
        Returns:
            {video_id: embedding} 字典
        """
        try:
            # TODO: 从数据库批量查询视频信息
            # 这里简化处理，返回模拟数据
            
            embeddings = {}
            for video_id in video_ids:
                # 生成随机向量（实际应该调用模型）
                import numpy as np
                embedding = np.random.randn(128).tolist()
                embeddings[video_id] = embedding
            
            logger.info(f"Generated batch embeddings for {len(video_ids)} videos")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise


video_embedding_service = VideoEmbeddingService()

