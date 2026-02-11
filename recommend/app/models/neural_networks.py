"""
深度学习模型定义
"""
import torch
import torch.nn as nn


class VideoEncoder(nn.Module):
    """
    视频编码器 - 将视频特征编码为向量
    
    输入: 视频标签ID
    输出: 128维向量
    """
    def __init__(self, tag_vocab_size=10000, embedding_dim=128):
        super(VideoEncoder, self).__init__()
        self.tag_embedding = nn.Embedding(tag_vocab_size, 64)
        self.fc = nn.Sequential(
            nn.Linear(64, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, embedding_dim),
            nn.LayerNorm(embedding_dim)
        )
    
    def forward(self, tag_ids):
        """
        Args:
            tag_ids: [batch_size, max_tags]
        Returns:
            embeddings: [batch_size, embedding_dim]
        """
        tag_emb = self.tag_embedding(tag_ids)  # [batch_size, max_tags, 64]
        tag_emb = torch.mean(tag_emb, dim=1)   # [batch_size, 64]
        output = self.fc(tag_emb)              # [batch_size, 128]
        return output


class UserEncoder(nn.Module):
    """
    用户编码器 - Two-Tower 模型的用户塔
    
    输入: 用户交互的视频向量 + 权重
    输出: 用户向量
    """
    def __init__(self, embedding_dim=128):
        super(UserEncoder, self).__init__()
        self.fc = nn.Sequential(
            nn.Linear(embedding_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, embedding_dim),
            nn.LayerNorm(embedding_dim)
        )
    
    def forward(self, video_embeddings, weights):
        """
        Args:
            video_embeddings: [batch_size, num_videos, embedding_dim]
            weights: [batch_size, num_videos, 1]
        Returns:
            user_embedding: [batch_size, embedding_dim]
        """
        weighted_emb = video_embeddings * weights  # [batch_size, num_videos, 128]
        user_emb = torch.sum(weighted_emb, dim=1)  # [batch_size, 128]
        output = self.fc(user_emb)
        return output


class RankingModel(nn.Module):
    """
    精排模型 - Wide & Deep
    
    输入: 用户向量 + 视频向量 + 统计特征
    输出: 点击率预估 (0-1)
    """
    def __init__(self, embedding_dim=128):
        super(RankingModel, self).__init__()
        
        # Deep 部分
        self.deep = nn.Sequential(
            nn.Linear(embedding_dim * 2 + 2, 256),  # user_emb + video_emb + 2个统计特征
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU()
        )
        
        # Wide 部分（线性特征）
        self.wide = nn.Linear(2, 64)  # recall_score, hot_score
        
        # 输出层
        self.output = nn.Linear(128, 1)
    
    def forward(self, user_emb, video_emb, recall_score, hot_score):
        """
        Args:
            user_emb: [batch_size, embedding_dim]
            video_emb: [batch_size, embedding_dim]
            recall_score: [batch_size, 1]
            hot_score: [batch_size, 1]
        Returns:
            score: [batch_size, 1]
        """
        # 拼接特征
        deep_input = torch.cat([user_emb, video_emb, recall_score, hot_score], dim=1)
        deep_out = self.deep(deep_input)
        
        wide_input = torch.cat([recall_score, hot_score], dim=1)
        wide_out = self.wide(wide_input)
        
        combined = torch.cat([deep_out, wide_out], dim=1)
        score = self.output(combined)
        return torch.sigmoid(score)

