"""
Milvus 向量数据库服务
用于存储和检索用户向量、视频向量
"""
import logging
from typing import List, Dict, Optional
from pymilvus import connections, Collection, utility
import time

logger = logging.getLogger(__name__)


class MilvusService:
    """Milvus 向量数据库服务"""
    
    def __init__(self, host: str = "localhost", port: str = "19530"):
        self.host = host
        self.port = port
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
    
    def insert_user_vector(
        self, 
        user_id: int, 
        long_term_vec: List[float], 
        interest_vec: List[float]
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
            
            collection = Collection("user_vectors")
            
            # 检查向量维度
            if len(long_term_vec) != 128 or len(interest_vec) != 128:
                logger.error(f"Invalid vector dimension for user {user_id}")
                return False
            
            # 准备数据
            entities = [
                [user_id],                          # user_id
                [long_term_vec],                    # long_term_vec
                [interest_vec],                     # interest_vec
                [int(time.time() * 1000)]          # updated_at
            ]
            
            # 插入数据
            collection.insert(entities)
            collection.flush()
            
            logger.info(f"Inserted user vector for user {user_id}")
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
            
            collection = Collection("user_vectors")
            
            # 查询
            results = collection.query(
                expr=f"user_id == {user_id}",
                output_fields=["long_term_vec", "interest_vec", "updated_at"]
            )
            
            if not results:
                logger.debug(f"User vector not found for user {user_id}")
                return None
            
            result = results[0]
            return {
                "long_term_vec": result["long_term_vec"],
                "interest_vec": result["interest_vec"],
                "updated_at": result["updated_at"]
            }
            
        except Exception as e:
            logger.error(f"Error getting user vector: {e}")
            return None
    
    def update_user_long_term_vector(
        self, 
        user_id: int, 
        long_term_vec: List[float]
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
            
            collection = Collection("user_vectors")
            
            # 检查向量维度
            if len(long_term_vec) != 128:
                logger.error(f"Invalid vector dimension for user {user_id}")
                return False
            
            # 先删除旧数据
            collection.delete(f"user_id == {user_id}")
            
            # 获取原有的 interest_vec
            old_data = self.get_user_vectors(user_id)
            if old_data:
                interest_vec = old_data["interest_vec"]
            else:
                # 如果不存在，使用零向量
                interest_vec = [0.0] * 128
            
            # 插入新数据
            entities = [
                [user_id],
                [long_term_vec],
                [interest_vec],
                [int(time.time() * 1000)]
            ]
            
            collection.insert(entities)
            collection.flush()
            
            logger.info(f"Updated long-term vector for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating user long-term vector: {e}")
            return False
    
    def search_similar_users(
        self, 
        user_vector: List[float], 
        top_k: int = 10,
        use_long_term: bool = True
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
            
            collection = Collection("user_vectors")
            
            # 检查向量维度
            if len(user_vector) != 128:
                logger.error("Invalid query vector dimension")
                return []
            
            # 选择搜索字段
            search_field = "long_term_vec" if use_long_term else "interest_vec"
            
            # 搜索参数
            search_params = {
                "metric_type": "COSINE",
                "params": {"nprobe": 10}
            }
            
            # 执行搜索
            results = collection.search(
                data=[user_vector],
                anns_field=search_field,
                param=search_params,
                limit=top_k,
                output_fields=["user_id"]
            )
            
            # 解析结果
            similar_users = []
            for hits in results:
                for hit in hits:
                    similar_users.append({
                        "user_id": hit.entity.get("user_id"),
                        "distance": hit.distance
                    })
            
            logger.info(f"Found {len(similar_users)} similar users")
            return similar_users
            
        except Exception as e:
            logger.error(f"Error searching similar users: {e}")
            return []
    
    def search_similar_videos(
        self, 
        query_vector: List[float], 
        top_k: int = 100
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
                "params": {"ef": 64}  # HNSW 参数
            }
            
            # 执行搜索
            results = collection.search(
                data=[query_vector],
                anns_field="embedding",
                param=search_params,
                limit=top_k,
                output_fields=["video_id", "author_id"]
            )
            
            # 解析结果
            videos = []
            for hits in results:
                for hit in hits:
                    videos.append({
                        "video_id": hit.entity.get("video_id"),
                        "author_id": hit.entity.get("author_id"),
                        "score": hit.distance
                    })
            
            logger.info(f"Vector recall found {len(videos)} videos")
            return videos
            
        except Exception as e:
            logger.error(f"Error searching similar videos: {e}")
            return []
    
    def insert_video_embedding(
        self,
        video_id: int,
        embedding: List[float],
        author_id: int,
        created_ts: int
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
            
            # 准备数据
            entities = [
                [video_id],
                [embedding],
                [author_id],
                [created_ts]
            ]
            
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

