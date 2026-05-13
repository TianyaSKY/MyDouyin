"""
评论偏好计算服务

通过深度学习情感分析模型（Erlangshen-Roberta-110M-Sentiment）分析评论内容，
结合用户-视频向量相似度，计算用户对视频的喜好程度。

核心逻辑：
1. 使用 BERT 模型进行情感分析（替代关键词匹配）
2. 结合用户向量与视频向量的余弦相似度
3. 加权融合得到最终偏好分数
4. 返回情感分数供用户向量计算使用
"""

import logging
import math
import re
from typing import Optional, Tuple

from app.models.sentiment_model import sentiment_model
from app.services import milvus_service

logger = logging.getLogger(__name__)

# ── 关键词兜底方案（当 DL 模型不可用时使用）──

# 正面情感关键词（中文）
POSITIVE_KEYWORDS = {
    "好看", "喜欢", "太棒了", "赞", "厉害", "牛", "666", "哈哈", "有趣",
    "精彩", "优秀", "棒", "不错", "推荐", "收藏", "关注", "加油", "支持",
    "漂亮", "好", "可爱", "爱了", "太好了", "笑死", "绝了", "好看的",
    "学到了", "涨知识", "有意思", "精品", "满分", "完美", "神作",
}

# 负面情感关键词
NEGATIVE_KEYWORDS = {
    "差", "难看", "无聊", "垃圾", "烂", "不好看", "差评", "失望",
    "浪费时间", "没意思", "退出", "不推荐",
}


class CommentPreferenceService:
    """评论偏好计算服务"""

    @staticmethod
    def compute_preference(
        user_id: int,
        video_id: int,
        comment_id: int,
        content: str,
    ) -> float:
        """
        计算评论反映出的用户对该视频的喜好程度。

        Returns:
            preference_score: 0.0 ~ 1.0 之间的喜好分数
        """
        try:
            if not content or not content.strip():
                return 0.5  # 空评论给中性分

            # ── 1. 情感分析（优先使用 DL 模型）──
            text_score = CommentPreferenceService._analyze_sentiment(content)

            # ── 2. 用户-视频向量相似度 ──
            vector_score = CommentPreferenceService._compute_vector_similarity(
                user_id, video_id
            )

            # ── 3. 评论行为本身的正向信号 ──
            # 用户愿意评论本身就说明一定程度的兴趣
            engagement_bonus = 0.1

            # ── 4. 加权融合 ──
            if vector_score is not None:
                # 有向量时：文本 40% + 向量 40% + 行为 20%
                final_score = (
                    text_score * 0.4
                    + vector_score * 0.4
                    + engagement_bonus * 2.0  # 归一化到 0.2
                )
            else:
                # 无向量时：文本 70% + 行为 30%
                final_score = text_score * 0.7 + engagement_bonus * 3.0

            # 裁剪到 [0, 1]
            final_score = max(0.0, min(1.0, final_score))

            logger.info(
                "Comment preference computed: user=%d, video=%d, comment=%d, "
                "text_score=%.3f, vector_score=%s, final=%.3f",
                user_id, video_id, comment_id,
                text_score, vector_score, final_score,
            )
            return round(final_score, 4)

        except Exception as e:
            logger.error("Error computing comment preference: %s", e)
            return 0.5  # 异常时返回中性分

    @staticmethod
    def compute_preference_with_sentiment(
        user_id: int,
        video_id: int,
        comment_id: int,
        content: str,
    ) -> Tuple[float, float, float]:
        """
        计算评论偏好并同时返回情感分数和评论权重。

        Returns:
            (preference_score, sentiment_score, comment_weight)
            - preference_score: 0.0 ~ 1.0 的综合偏好分数
            - sentiment_score: 0.0 ~ 1.0 的情感分数（正面 → 1.0）
            - comment_weight: 映射后的行为权重（用于用户向量计算）
        """
        preference_score = CommentPreferenceService.compute_preference(
            user_id, video_id, comment_id, content
        )

        sentiment_score = CommentPreferenceService._analyze_sentiment(
            content if content else ""
        )
        comment_weight = sentiment_model.sentiment_to_weight(sentiment_score)

        return preference_score, sentiment_score, comment_weight

    @staticmethod
    def _analyze_sentiment(content: str) -> float:
        """
        情感分析：优先使用 DL 模型，不可用时回退到关键词匹配。

        Returns:
            sentiment_score: 0.0 ~ 1.0
        """
        if sentiment_model.available:
            return sentiment_model.predict(content)

        # ── 兜底：关键词匹配 ──
        logger.debug("Using keyword-based sentiment fallback")
        return CommentPreferenceService._analyze_text_by_keywords(content)

    @staticmethod
    def _analyze_text_by_keywords(content: str) -> float:
        """
        基于关键词的情感分析（兜底方案），返回 0~1 分数。
        """
        score = 0.5  # 中性起点

        # 评论长度奖励（较长评论通常表示更高参与度）
        content_len = len(content.strip())
        if content_len > 50:
            score += 0.1
        elif content_len > 20:
            score += 0.05
        elif content_len < 3:
            score -= 0.05

        # 正面关键词
        positive_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in content)
        score += min(positive_count * 0.08, 0.3)

        # 负面关键词
        negative_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in content)
        score -= min(negative_count * 0.1, 0.3)

        # 感叹号和表情符号（高参与度信号）
        exclamation_count = content.count("！") + content.count("!")
        score += min(exclamation_count * 0.03, 0.1)

        # Emoji 检测（简化）
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags
            "]+",
            flags=re.UNICODE,
        )
        emoji_count = len(emoji_pattern.findall(content))
        score += min(emoji_count * 0.05, 0.1)

        return max(0.0, min(1.0, score))

    @staticmethod
    def _compute_vector_similarity(
        user_id: int, video_id: int
    ) -> Optional[float]:
        """
        计算用户向量与视频向量的余弦相似度。
        如果向量不可用则返回 None。
        """
        try:
            # 获取用户向量
            user_vectors = milvus_service.get_user_vectors(user_id)
            if user_vectors is None:
                return None

            user_vec = user_vectors.get("long_term_vec")
            if user_vec is None:
                user_vec = user_vectors.get("interest_vec")
            if user_vec is None:
                return None

            # 获取视频向量
            video_embeddings = milvus_service.get_video_embeddings([video_id])
            if not video_embeddings or video_id not in video_embeddings:
                return None

            video_vec = video_embeddings[video_id]

            # 计算余弦相似度
            similarity = CommentPreferenceService._cosine_similarity(
                user_vec, video_vec
            )

            # 余弦相似度范围 [-1, 1]，归一化到 [0, 1]
            return (similarity + 1.0) / 2.0

        except Exception as e:
            logger.warning("Failed to compute vector similarity: %s", e)
            return None

    @staticmethod
    def _cosine_similarity(vec_a: list, vec_b: list) -> float:
        """计算两个向量的余弦相似度"""
        if len(vec_a) != len(vec_b) or len(vec_a) == 0:
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)


comment_preference_service = CommentPreferenceService()
