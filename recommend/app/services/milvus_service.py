"""
Milvus 向量数据库服务
用于存储和检索用户向量、视频向量
"""

import logging
from typing import List, Dict, Optional, Union
from pymilvus import connections, Collection, utility
import time
from app.core.config import settings

logger = logging.getLogger(__name__)


class MilvusService:
    """Milvus 向量数据库服务"""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[Union[int, str]] = None,
    ):
        self.host = host or settings.MILVUS_HOST
        selected_port = settings.MILVUS_PORT if port is None else port
        self.port = str(selected_port)
        self.connected = False
        self._connect()

    def _connect(self):
        """连接到 Milvus"""
        try:
            connections.connect("default", host=self.host, port=self.port)
            self.connected = True
            logger.info(f"Connected to Milvus at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Milvus: {e}")
            self.connected = False

    @staticmethod
    def _delete_by_field(collection: Collection, field_name: str, field_value: int) -> int:
        """
        按业务字段删除记录（兼容仅支持按主键 delete 的 Milvus 版本）。

        逻辑：
        1) 先 query 出匹配记录的主键值；
        2) 再使用 `pk in [...]` 执行 delete。
        """
        pk_field = None
        for field in collection.schema.fields:
            if field.is_primary:
                pk_field = field.name
                break

        if not pk_field:
            raise RuntimeError(
                f"Primary key field not found for collection {collection.name}"
            )

        matched = collection.query(
            expr=f"{field_name} == {field_value}",
            output_fields=[pk_field],
        )
        if not matched:
            return 0

        pk_values = [row[pk_field] for row in matched if pk_field in row]
        if not pk_values:
            return 0

        if isinstance(pk_values[0], str):
            quoted = [f'"{pk}"' for pk in pk_values]
            delete_expr = f"{pk_field} in [{','.join(quoted)}]"
        else:
            delete_expr = f"{pk_field} in [{','.join(map(str, pk_values))}]"

        result = collection.delete(delete_expr)
        return result.delete_count if result else 0

    def insert_user_vector(
        self, user_id: int, long_term_vec: List[float], interest_vec: List[float]
    ) -> bool:
        """
        插入用户向量

        Args:
            user_id: 用户ID
            long_term_vec: 长期兴趣向量 (128维)
            interest_vec: 初始兴趣向量 (128维)

        Returns:
            是否成功
        """
        try:
            if not self.connected:
                self._connect()

            # 检查向量维度
            if len(long_term_vec) != 128 or len(interest_vec) != 128:
                logger.error(f"Invalid vector dimension for user {user_id}")
                return False

            now = int(time.time() * 1000)

            # 插入到长期向量集合
            coll_long = Collection("user_long_term_vectors")
            coll_long.insert([[user_id], [long_term_vec], [now]])
            coll_long.flush()

            # 插入到兴趣向量集合
            coll_interest = Collection("user_interest_vectors")
            coll_interest.insert([[user_id], [interest_vec], [now]])
            coll_interest.flush()

            logger.info(f"Inserted user vectors for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error inserting user vector: {e}")
            return False

    def get_user_vectors(self, user_id: int) -> Optional[Dict]:
        """
        获取用户向量

        Args:
            user_id: 用户ID

        Returns:
            包含 long_term_vec, interest_vec, updated_at 的字典，如果不存在返回 None
        """
        try:
            if not self.connected:
                self._connect()

            # 分别从两个集合查询
            coll_long = Collection("user_long_term_vectors")
            res_long = coll_long.query(
                expr=f"user_id == {user_id}", output_fields=["vector", "updated_at"]
            )

            coll_interest = Collection("user_interest_vectors")
            res_interest = coll_interest.query(
                expr=f"user_id == {user_id}", output_fields=["vector"]
            )

            if not res_long and not res_interest:
                logger.debug(f"User vectors not found for user {user_id}")
                return None

            result = {
                "long_term_vec": res_long[0]["vector"] if res_long else [0.0] * 128,
                "interest_vec": res_interest[0]["vector"]
                if res_interest
                else [0.0] * 128,
                "updated_at": res_long[0]["updated_at"]
                if res_long
                else (res_interest[0]["updated_at"] if res_interest else 0),
            }
            return result

        except Exception as e:
            logger.error(f"Error getting user vector: {e}")
            return None

    def update_user_long_term_vector(
        self, user_id: int, long_term_vec: List[float]
    ) -> bool:
        """
        更新用户长期兴趣向量

        Args:
            user_id: 用户ID
            long_term_vec: 新的长期兴趣向量 (128维)

        Returns:
            是否成功
        """
        try:
            if not self.connected:
                self._connect()

            # 检查向量维度
            if len(long_term_vec) != 128:
                logger.error(f"Invalid vector dimension for user {user_id}")
                return False

            collection = Collection("user_long_term_vectors")

            # 先删除旧数据（兼容仅支持按主键 delete 的 Milvus）
            self._delete_by_field(collection, "user_id", user_id)

            # 插入新数据
            now = int(time.time() * 1000)
            entities = [[user_id], [long_term_vec], [now]]

            collection.insert(entities)
            collection.flush()

            logger.info(f"Updated long-term vector for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error updating user long-term vector: {e}")
            return False

    def search_similar_users(
        self, user_vector: List[float], top_k: int = 10, use_long_term: bool = True
    ) -> List[Dict]:
        """
        搜索相似用户（协同过滤）

        Args:
            user_vector: 查询向量 (128维)
            top_k: 返回前K个相似用户
            use_long_term: 是否使用长期向量（否则使用初始兴趣向量）

        Returns:
            相似用户列表 [{"user_id": xxx, "distance": xxx}, ...]
        """
        try:
            if not self.connected:
                self._connect()

            collection_name = (
                "user_long_term_vectors" if use_long_term else "user_interest_vectors"
            )
            collection = Collection(collection_name)

            # 检查向量维度
            if len(user_vector) != 128:
                logger.error("Invalid query vector dimension")
                return []

            # 搜索参数
            search_params = {"metric_type": "COSINE", "params": {"nprobe": 10}}

            # 执行搜索
            results = collection.search(
                data=[user_vector],
                anns_field="vector",
                param=search_params,
                limit=top_k,
                output_fields=["user_id"],
            )

            # 解析结果
            similar_users = []
            for hits in results:
                for hit in hits:
                    similar_users.append(
                        {"user_id": hit.entity.get("user_id"), "distance": hit.distance}
                    )

            logger.info(f"Found {len(similar_users)} similar users")
            return similar_users

        except Exception as e:
            logger.error(f"Error searching similar users: {e}")
            return []

    def search_similar_videos(
        self, query_vector: List[float], top_k: int = 100
    ) -> List[Dict]:
        """
        向量召回：根据用户向量搜索相似视频

        Args:
            query_vector: 用户向量 (128维)
            top_k: 返回前K个视频

        Returns:
            视频列表 [{"video_id": xxx, "score": xxx}, ...]
        """
        try:
            if not self.connected:
                self._connect()

            collection = Collection("video_embedding")

            # 检查向量维度
            if len(query_vector) != 128:
                logger.error("Invalid query vector dimension")
                return []

            # 搜索参数
            search_params = {
                "metric_type": "COSINE",
                "params": {"ef": 64},  # HNSW 参数
            }

            # 执行搜索
            results = collection.search(
                data=[query_vector],
                anns_field="embedding",
                param=search_params,
                limit=top_k,
                output_fields=["video_id", "author_id"],
            )

            # 解析结果
            videos = []
            for hits in results:
                for hit in hits:
                    videos.append(
                        {
                            "video_id": hit.entity.get("video_id"),
                            "author_id": hit.entity.get("author_id"),
                            "score": hit.distance,
                        }
                    )

            logger.info(f"Vector recall found {len(videos)} videos")
            return videos

        except Exception as e:
            logger.error(f"Error searching similar videos: {e}")
            return []

    def insert_video_embedding(
        self, video_id: int, embedding: List[float], author_id: int, created_ts: int
    ) -> bool:
        """
        插入视频向量

        Args:
            video_id: 视频ID
            embedding: 视频向量 (128维)
            author_id: 作者ID
            created_ts: 创建时间戳

        Returns:
            是否成功
        """
        try:
            if not self.connected:
                self._connect()

            collection = Collection("video_embedding")

            # 检查向量维度
            if len(embedding) != 128:
                logger.error(f"Invalid embedding dimension for video {video_id}")
                return False

            # 幂等写入：先删除旧记录，再插入最新向量（兼容仅支持按主键 delete 的 Milvus）
            self._delete_by_field(collection, "video_id", video_id)

            # 准备数据
            entities = [[video_id], [embedding], [author_id], [created_ts]]

            # 插入数据
            collection.insert(entities)
            collection.flush()

            logger.info(f"Inserted video embedding for video {video_id}")
            return True

        except Exception as e:
            logger.error(f"Error inserting video embedding: {e}")
            return False


# 全局单例
milvus_service = MilvusService()
