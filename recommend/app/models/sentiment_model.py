"""
情感分析模型 - 基于 IDEA-CCNL/Erlangshen-Roberta-110M-Sentiment

中文 RoBERTa 模型，在 8 个中文情感分析数据集（共 227,347 样本）上微调。
输出：positive / negative 二分类概率。
"""

import logging
from typing import Optional

import torch

logger = logging.getLogger(__name__)

# 模型名称常量
_MODEL_NAME = "IDEA-CCNL/Erlangshen-Roberta-110M-Sentiment"


class SentimentModel:
    """中文情感分析模型（单例）"""

    _instance: Optional["SentimentModel"] = None

    def __new__(cls) -> "SentimentModel":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        self._tokenizer = None
        self._model = None
        self._device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        self._available = False
        self._load_model()
        self._initialized = True

    def _load_model(self) -> None:
        """加载预训练模型和分词器"""
        try:
            from transformers import (
                BertForSequenceClassification,
                BertTokenizer,
            )

            logger.info(
                "Loading sentiment model: %s (device=%s)",
                _MODEL_NAME,
                self._device,
            )

            self._tokenizer = BertTokenizer.from_pretrained(_MODEL_NAME)
            self._model = BertForSequenceClassification.from_pretrained(
                _MODEL_NAME
            )
            self._model.to(self._device)
            self._model.eval()

            self._available = True
            logger.info("Sentiment model loaded successfully")

        except Exception as e:
            logger.error(
                "Failed to load sentiment model: %s. "
                "Comment sentiment analysis will fall back to keyword-based method.",
                e,
            )
            self._available = False

    @property
    def available(self) -> bool:
        """模型是否可用"""
        return self._available

    def predict(self, text: str) -> float:
        """
        预测文本的情感分数。

        Args:
            text: 输入文本（中文评论）

        Returns:
            sentiment_score: 0.0 ~ 1.0
                - 接近 1.0 表示正面情感
                - 接近 0.0 表示负面情感
                - 0.5 附近表示中性

        Raises:
            RuntimeError: 模型不可用时抛出
        """
        if not self._available:
            raise RuntimeError("Sentiment model is not available")

        if not text or not text.strip():
            return 0.5  # 空文本返回中性

        try:
            # 截断过长文本（BERT 最大 512 tokens）
            truncated = text.strip()[:450]

            inputs = self._tokenizer.encode(
                truncated,
                return_tensors="pt",
                max_length=512,
                truncation=True,
            )
            inputs = inputs.to(self._device)

            with torch.no_grad():
                output = self._model(inputs)
                probs = torch.nn.functional.softmax(output.logits, dim=-1)

            # Erlangshen 模型: index 0 = negative, index 1 = positive
            positive_prob = probs[0][1].item()

            logger.debug(
                "Sentiment prediction: text='%s...', score=%.4f",
                truncated[:30],
                positive_prob,
            )
            return positive_prob

        except Exception as e:
            logger.error("Sentiment prediction failed: %s", e)
            return 0.5  # 异常时返回中性

    @staticmethod
    def sentiment_to_weight(sentiment_score: float) -> float:
        """
        将情感分数映射为用户向量的行为权重。

        映射规则:
            score > 0.6  →  1.0   (正面评论，等同于"点赞")
            0.4 ≤ score ≤ 0.6 →  0.3   (中性评论，等同于"点击")
            score < 0.4  → -0.5   (负面评论，反向削弱关联)

        Args:
            sentiment_score: 0.0 ~ 1.0 的情感分数

        Returns:
            comment_weight: 行为权重
        """
        if sentiment_score > 0.6:
            return 1.0
        elif sentiment_score < 0.4:
            return -0.5
        else:
            return 0.3


# 全局单例
sentiment_model = SentimentModel()
