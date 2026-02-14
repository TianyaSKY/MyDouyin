# 用户状态更新

## 1. 状态模型

项目里的用户行为状态分两层：

- 真相状态表：`user_video_action`
  - 表示“当前状态”（例如当前是否点赞）
  - 用于点赞/取消点赞幂等控制
- 行为事件表：`user_event`
  - 记录“发生过什么”（行为时间线）
  - 用于统计聚合、推荐特征、向量更新

两者职责不同，不能互相替代。

## 2. 点赞/取消点赞真相状态

核心实现：
- Controller：`backend/src/main/java/com/douyin/controller/VideoController.java`
- Service：`backend/src/main/java/com/douyin/service/impl/UserVideoActionServiceImpl.java`
- Entity：`backend/src/main/java/com/douyin/entity/UserVideoAction.java`

行为语义：
- `POST /api/videos/{id}/like`
  - 将 `(user_id, video_id, action_type=LIKE)` 的 `status` 置为 `1`。
  - 若本来就是点赞状态，返回幂等成功（`alreadyLiked=true`）。
- `DELETE /api/videos/{id}/like`
  - 将 `status` 置为 `0`。
  - 重复取消点赞也保持幂等。

事件发送规则：
- 仅当点赞状态从未点赞变为已点赞时，后端才发送 `LIKE` 事件到 MQ。

## 3. 事件驱动状态更新

事件生产侧：
- `VideoController.likeVideo(...)` 发送 `LIKE` 事件。
- `FeedServiceImpl.asyncSendImpressionEvents(...)` 发送 `IMPR` 事件。
- `UserEventController` 支持其他行为直接上报。

队列配置：
- 见 `backend/src/main/java/com/douyin/common/config/RabbitMQConfig.java`
- 主行为队列：`event.user_behavior.queue`

事件消费侧：
- `backend/src/main/java/com/douyin/client/UserEventConsumer.java`

消费后的更新动作：
1. 原始事件落库到 `user_event`。
2. 更新 `video_stats_daily` 聚合计数。
3. 对 `CLICK/LIKE/FINISH/SHARE` 触发用户实时向量更新。

## 4. Feed 运行时用户状态

实现位置：
- `backend/src/main/java/com/douyin/service/impl/FeedServiceImpl.java`

状态 key：
- `user:seen:{userId}`（Redis Set，TTL 7 天）

行为：
- 召回阶段先排除 seen 集合里的视频。
- 返回结果会回写到 seen 集合。
- `hasMore` 由“总发布数 vs 已看数”计算。

## 5. 一致性建议

- 当前是否点赞，必须以 `user_video_action` 为准。
- `user_event` 不作为当前状态真相，只作为行为流水与特征来源。
- 推荐、统计、热度都应以 `user_event`/`video_stats_daily` 为主。
