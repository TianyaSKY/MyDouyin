"""
训练脚本 - Two-Tower 模型
"""
import torch
import torch.nn as nn
import torch.optim as optim
import logging

from app.models import VideoEncoder, UserEncoder
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def train_two_tower():
    """训练 Two-Tower 模型"""
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # 初始化模型
    video_encoder = VideoEncoder(
        tag_vocab_size=settings.TAG_VOCAB_SIZE,
        embedding_dim=settings.EMBEDDING_DIM
    ).to(device)
    
    user_encoder = UserEncoder(
        embedding_dim=settings.EMBEDDING_DIM
    ).to(device)
    
    # 优化器
    optimizer = optim.Adam(
        list(video_encoder.parameters()) + list(user_encoder.parameters()),
        lr=0.001
    )
    
    # 损失函数
    criterion = nn.BCEWithLogitsLoss()
    
    # TODO: 加载训练数据
    logger.info("Loading training data...")
    
    # 训练循环
    num_epochs = 10
    for epoch in range(num_epochs):
        video_encoder.train()
        user_encoder.train()
        total_loss = 0.0
        
        # TODO: 实际训练逻辑
        # for batch in dataloader:
        #     user_history = batch['user_history']  # 用户历史交互视频
        #     weights = batch['weights']            # 行为权重
        #     target_video = batch['target_video']  # 目标视频
        #     label = batch['label']                # 是否点击 (0/1)
        #     
        #     # 用户向量
        #     user_emb = user_encoder(user_history, weights)
        #     
        #     # 视频向量
        #     video_emb = video_encoder(target_video)
        #     
        #     # 计算相似度
        #     similarity = torch.sum(user_emb * video_emb, dim=1)
        #     
        #     # 计算损失
        #     loss = criterion(similarity, label)
        #     
        #     optimizer.zero_grad()
        #     loss.backward()
        #     optimizer.step()
        #     
        #     total_loss += loss.item()
        
        logger.info(f"Epoch {epoch+1}/{num_epochs}, Loss: {total_loss:.4f}")
    
    # 保存模型
    torch.save(video_encoder.state_dict(), f"{settings.MODEL_PATH}/video_encoder_two_tower.pth")
    torch.save(user_encoder.state_dict(), f"{settings.MODEL_PATH}/user_encoder.pth")
    logger.info("Models saved")


if __name__ == "__main__":
    train_two_tower()

