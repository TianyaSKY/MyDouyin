"""
模型管理服务
"""
import torch
import logging
from typing import Dict, List
from app.models import VideoEncoder, UserEncoder, RankingModel
from app.core.config import settings

logger = logging.getLogger(__name__)


class ModelManager:
    """模型管理器 - 单例模式"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.device = torch.device('cuda' if torch.cuda.is_available() and settings.USE_GPU else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # 初始化模型
        self.video_encoder = VideoEncoder(
            tag_vocab_size=settings.TAG_VOCAB_SIZE,
            embedding_dim=settings.EMBEDDING_DIM
        ).to(self.device)
        
        self.user_encoder = UserEncoder(
            embedding_dim=settings.EMBEDDING_DIM
        ).to(self.device)
        
        self.ranking_model = RankingModel(
            embedding_dim=settings.EMBEDDING_DIM
        ).to(self.device)
        
        # 设置为评估模式
        self.video_encoder.eval()
        self.user_encoder.eval()
        self.ranking_model.eval()
        
        # 标签词表
        self.tag_vocab = self._build_tag_vocab()

        # 按实际加载结果追踪状态
        self._model_loaded = {
            "video_encoder": False,
            "user_encoder": False,
            "ranking_model": False,
        }
        self._try_load_checkpoints()

        self._initialized = True
        logger.info("Models initialized successfully (status: %s)", self._model_loaded)

    def _try_load_checkpoints(self):
        """尝试从 MODEL_PATH 加载已训练权重；不存在或失败则保持随机初始化。"""
        from pathlib import Path
        model_dir = Path(settings.MODEL_PATH)
        for name in self._model_loaded:
            path = model_dir / f"{name}.pt"
            if path.exists():
                self.load_model_weights(name, str(path))
            else:
                logger.warning("No checkpoint for %s at %s; using random initialization", name, path)
    
    def _build_tag_vocab(self) -> Dict[str, int]:
        """构建标签词表"""
        # TODO: 从文件加载真实词表
        common_tags = [
            "美食", "旅游", "科技", "音乐", "运动", "游戏", "时尚", "美妆",
            "搞笑", "动物", "教育", "新闻", "电影", "舞蹈", "汽车", "摄影",
            "健身", "宠物", "美术", "手工", "读书", "历史", "军事", "财经"
        ]
        vocab = {"<PAD>": 0, "<UNK>": 1}
        for i, tag in enumerate(common_tags, start=2):
            vocab[tag] = i
        return vocab
    
    def tag_to_id(self, tag: str) -> int:
        """标签转ID"""
        return self.tag_vocab.get(tag, 1)  # 未知标签返回 <UNK>
    
    def load_model_weights(self, model_name: str, checkpoint_path: str):
        """加载模型权重"""
        try:
            if model_name == "video_encoder":
                self.video_encoder.load_state_dict(torch.load(checkpoint_path, map_location=self.device))
                logger.info(f"Loaded video_encoder from {checkpoint_path}")
            elif model_name == "user_encoder":
                self.user_encoder.load_state_dict(torch.load(checkpoint_path, map_location=self.device))
                logger.info(f"Loaded user_encoder from {checkpoint_path}")
            elif model_name == "ranking_model":
                self.ranking_model.load_state_dict(torch.load(checkpoint_path, map_location=self.device))
                logger.info(f"Loaded ranking_model from {checkpoint_path}")
            else:
                logger.warning(f"Unknown model name: {model_name}")
                return
            self._model_loaded[model_name] = True
        except Exception as e:
            logger.warning("Failed to load %s from %s; keeping random initialization: %s",
                           model_name, checkpoint_path, e)
    
    def get_model_status(self) -> Dict[str, str]:
        """获取模型状态"""
        return {
            name: ("loaded" if loaded else "random_init")
            for name, loaded in self._model_loaded.items()
        }


# 全局模型管理器实例
model_manager = ModelManager()

