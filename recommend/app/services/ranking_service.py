"""
精排服务
"""
import torch
import numpy as np
import logging
from typing import List, Dict
from app.services.model_service import model_manager

logger = logging.getLogger(__name__)


class RankingService:
    """精排服务 - Wide & Deep 模型"""
    
    @staticmethod
    def rank_videos(
        user_id: int,
        user_embedding: List[float],
        candidates: List[Dict],
        top_k: int = 20
    ) -> List[Dict]:
        """
        对候选视频进行精排
        
        Args:
            user_id: 用户ID
            user_embedding: 用户向量
            candidates: 候选视频列表
            top_k: 返回Top K
            
        Returns:
            排序后的视频列表
        """
        try:
            if not candidates:
                return []
            
            # 1. 准备数据
            user_emb = torch.tensor(
                [user_embedding] * len(candidates), 
                dtype=torch.float32
            ).to(model_manager.device)
            
            video_embs = []
            recall_scores = []
            hot_scores = []
            video_ids = []
            
            for candidate in candidates:
                video_embs.append(candidate["video_embedding"])
                recall_scores.append([candidate.get("recall_score", 0.0)])
                hot_scores.append([candidate.get("hot_score", 0.0)])
                video_ids.append(candidate["video_id"])
            
            video_emb_tensor = torch.tensor(video_embs, dtype=torch.float32).to(model_manager.device)
            recall_score_tensor = torch.tensor(recall_scores, dtype=torch.float32).to(model_manager.device)
            hot_score_tensor = torch.tensor(hot_scores, dtype=torch.float32).to(model_manager.device)
            
            # 2. 模型推理
            with torch.no_grad():
                scores = model_manager.ranking_model(
                    user_emb, 
                    video_emb_tensor, 
                    recall_score_tensor, 
                    hot_score_tensor
                )
                scores = scores.cpu().numpy().flatten()
            
            # 3. 排序
            ranked_indices = np.argsort(scores)[::-1][:top_k]
            
            ranked_videos = []
            for idx in ranked_indices:
                ranked_videos.append({
                    "video_id": video_ids[idx],
                    "rank_score": float(scores[idx]),
                    "recall_score": recall_scores[idx][0],
                    "hot_score": hot_scores[idx][0]
                })
            
            logger.info(f"Ranked {len(candidates)} videos for user {user_id}, returned top {len(ranked_videos)}")
            return ranked_videos
            
        except Exception as e:
            logger.error(f"Error ranking videos: {e}")
            raise


ranking_service = RankingService()

