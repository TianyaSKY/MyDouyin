# 向量构建

## 1. 视频向量构建链路

入口：
- 后端在 `backend/src/main/java/com/douyin/controller/VideoController.java` 创建视频元数据。
- 后端向 `event.exchange` 发送 `event.video_embedding` 消息。

队列与消费者：
- 队列常量定义在 `backend/src/main/java/com/douyin/common/config/RabbitMQConfig.java`。
- 消费者为 `backend/src/main/java/com/douyin/client/VideoEmbeddingConsumer.java`。

处理流程：
1. 根据 `videoId` 从 MySQL 读取视频信息。
2. 通过 `RecommendServiceClient.generateVideoEmbedding(...)` 调 recommend 的 `/api/embedding/video` 生成向量。
3. 校验向量维度必须为 `1024`。
4. 通过 `RecommendServiceClient.insertVideoEmbedding(...)` 调 recommend 的 `/api/embedding/video/insert` 写入 Milvus。
5. 写入成功后，视频状态可从 `REVIEW` 自动切换到 `PUBLISHED`。
6. 写入 Redis 幂等标记 `video:embedding:done:{videoId}`，避免重复消费。

recommend 侧实现：
- 路由：`recommend/app/api/embedding.py`
- 视频向量服务：`recommend/app/services/video_service.py`
- Milvus 写入服务：`recommend/app/services/milvus_service.py`

关键实现细节：
- `VideoEmbeddingService._to_public_url(...)` 负责把本地媒体路径转公网 URL。
- `/uploads/**` 会映射到本地 `storage/**`，然后上传 tmper。
- tmper 结果会缓存到 Redis，key 前缀为 `recommend:upload:url:`，TTL 30 分钟。
- Milvus 写入前会先按 `video_id` 删除旧记录，保证幂等。

## 2. 用户实时向量构建链路

事件来源：
- 用户行为通过 MQ 流入（`LIKE`、`FINISH`、`SHARE`、`CLICK`、`IMPR`）。
- 消费者为 `backend/src/main/java/com/douyin/client/UserEventConsumer.java`。

处理流程：
1. 落库原始 `user_events`。
2. 更新 `video_daily_stats` 聚合统计。
3. 对 `CLICK/LIKE/FINISH/SHARE` 触发 `UserEmbeddingService.updateRealtimeVector(...)`。

实时向量计算（后端）：
- 实现在 `backend/src/main/java/com/douyin/service/impl/UserEmbeddingServiceImpl.java`。
- 从 `user_events` 读取最近 50 条行为。
- 批量拿视频向量后，构造含 `video_embedding/event_type/timestamp/timestamp_ms` 的事件数据。
- 调 recommend 的 `/api/embedding/user` 计算用户向量。
- 结果缓存到 Redis：`user:vec:{userId}`，过期时间 24 小时。

实时向量计算（recommend）：
- 路由：`recommend/app/api/embedding.py`（`/embedding/user`）
- 服务：`recommend/app/services/user_service.py`
- 行为权重：
  - `CLICK=0.3`
  - `LIKE=1.0`
  - `FINISH=1.5`
  - `SHARE=2.0`
- 包含基于 UTC 时间的衰减计算。

## 3. 用户长期向量持久化

接口与落点：
- 后端会调用：
  - `GET /api/user/vector/long-term/{userId}`
  - `POST /api/user/vector/long-term`
  - `POST /api/user/vector`
- recommend 路由定义在 `recommend/app/api/user_vector.py`。
- Milvus 持久化在 `recommend/app/services/milvus_service.py`。

集合：
- `user_long_term_vectors`
- `user_interest_vectors`

维度约束：
- 用户向量和视频向量均为固定 `1024` 维。
- 维度校验存在于后端消费/服务层与 recommend schema/服务层。
