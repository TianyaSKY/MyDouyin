# 数据库结构报告（MySQL + Milvus）

## 1. 概述

本项目的数据存储由 MySQL、Milvus 和 Redis 共同支撑。本报告聚焦持久化数据库结构：

- MySQL：保存用户、视频、互动事件、统计、评论、关注等业务结构化数据。
- Milvus：保存视频向量和用户向量，用于推荐召回、相似度检索和长期兴趣建模。

当前数据库初始化来源：

- MySQL：`scripts/schema.sql`
- Milvus：`scripts/init_milvus.py`

## 2. MySQL 数据库

### 2.1 基本配置

- 数据库名：`douyin`
- 字符集：`utf8mb4`
- 排序规则：`utf8mb4_unicode_ci`
- 初始化脚本会插入两个默认账号：`default_admin` 和 `default_user`

### 2.2 表清单

| 表名 | 说明 | 主要用途 |
| --- | --- | --- |
| `users` | 用户主表 | 登录、用户资料、权限标识 |
| `videos` | 视频元数据表 | 视频发布、审核状态、播放地址 |
| `video_tags` | 视频标签表 | 视频分类、内容标签、推荐特征 |
| `video_daily_stats` | 视频每日统计表 | 曝光、点击、点赞、完播、分享、评论等聚合指标 |
| `user_events` | 用户行为日志表 | 行为流水、统计聚合、推荐训练和向量更新 |
| `user_video_relations` | 用户-视频关系状态表 | 当前点赞/收藏状态的真相表 |
| `media_files` | 媒体文件登记表 | 文件哈希秒传、媒体资源复用 |
| `video_comments` | 视频评论表 | 评论和回复结构 |
| `user_comment_preferences` | 用户评论偏好表 | 推荐服务回写评论偏好分 |
| `user_follows` | 用户关注关系表 | 关注/取消关注状态 |

### 2.3 表结构详情

#### users

用户主表，保存登录账号、昵称、头像和管理员标识。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `user_id` | `BIGINT` | 主键，自增 | 用户 ID |
| `username` | `VARCHAR(64)` | 非空，唯一 | 用户名 |
| `password` | `VARCHAR(255)` | 非空 | 加密后的密码 |
| `nickname` | `VARCHAR(64)` | 可空 | 昵称 |
| `is_admin` | `TINYINT(1)` | 非空 | 是否管理员 |
| `avatar_url` | `VARCHAR(512)` | 可空 | 头像 URL |
| `created_at` | `DATETIME` | 默认当前时间 | 创建时间 |
| `updated_at` | `DATETIME` | 默认当前时间，自动更新 | 更新时间 |

核心约束：

- `username` 全局唯一。
- `is_admin` 用于区分普通用户和管理员。

#### videos

视频元数据表，保存视频作者、标题、状态、封面和视频地址。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 主键，自增 | 视频 ID |
| `author_id` | `BIGINT` | 非空，索引 | 作者用户 ID |
| `title` | `VARCHAR(255)` | 非空 | 视频标题 |
| `status` | `TINYINT` | 非空，默认 `0` | 状态：`0` 审核中，`1` 已发布，`2` 已删除 |
| `cover_url` | `VARCHAR(512)` | 可空 | 封面图 URL |
| `video_url` | `VARCHAR(512)` | 非空 | 视频文件 URL |
| `created_at` | `DATETIME` | 默认当前时间，索引 | 创建时间 |

索引：

- `idx_author(author_id)`：按作者查询视频。
- `idx_created_at(created_at)`：按发布时间排序或筛选。

#### video_tags

视频标签表，维护视频与标签的多对多关系。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 主键，自增 | 主键 ID |
| `video_id` | `BIGINT` | 非空，索引 | 视频 ID |
| `tag_name` | `VARCHAR(64)` | 非空，索引 | 标签名 |
| `sort_order` | `INT` | 非空，默认 `0` | 标签排序 |
| `created_at` | `DATETIME` | 默认当前时间 | 创建时间 |

核心约束：

- `uk_video_tag(video_id, tag_name)`：同一视频不能重复绑定同一标签。

#### video_daily_stats

视频每日统计表，用于聚合行为计数和观看时长。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `video_id` | `BIGINT` | 联合主键 | 视频 ID |
| `date` | `DATE` | 联合主键 | 统计日期 |
| `impr_cnt` | `INT` | 默认 `0` | 曝光次数 |
| `click_cnt` | `INT` | 默认 `0` | 点击次数 |
| `like_cnt` | `INT` | 默认 `0` | 点赞次数 |
| `finish_cnt` | `INT` | 默认 `0` | 完播次数 |
| `share_cnt` | `INT` | 默认 `0` | 分享次数 |
| `comment_cnt` | `INT` | 默认 `0` | 评论次数 |
| `watch_time_sum` | `BIGINT` | 默认 `0` | 总观看时长，单位毫秒 |

核心约束：

- 主键为 `(video_id, date)`，保证一个视频每天只有一条统计记录。

业务说明：

- `UserEventConsumer` 消费用户行为后会更新该表。
- 热门池刷新会读取最新统计，用于计算热度分。

#### user_events

用户行为日志表，记录发生过的行为事件。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 主键，自增 | 主键 ID |
| `user_id` | `BIGINT` | 非空，联合索引 | 用户 ID |
| `video_id` | `BIGINT` | 非空，联合索引 | 视频 ID |
| `event_type` | `ENUM` | 非空 | `impr`、`click`、`like`、`finish`、`share`、`leave`、`comment` |
| `watch_ms` | `INT` | 默认 `0` | 观看时长，单位毫秒 |
| `ctx` | `JSON` | 可空 | 设备、入口、时间戳等上下文 |
| `ts` | `DATETIME` | 默认当前时间，索引 | 事件发生时间 |

索引：

- `idx_user_video(user_id, video_id)`：查询用户对某视频的行为历史。
- `idx_ts(ts)`：按时间范围分析行为流水。

业务说明：

- 该表是行为流水，不是当前点赞/收藏状态的真相表。
- 推荐系统会读取最近行为生成用户实时向量。

#### user_video_relations

用户-视频关系状态表，用于保存当前点赞和收藏状态。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 主键，自增 | 主键 ID |
| `user_id` | `BIGINT` | 非空，索引 | 用户 ID |
| `video_id` | `BIGINT` | 非空，索引 | 视频 ID |
| `action_type` | `ENUM` | 非空 | `like` 或 `favorite` |
| `status` | `TINYINT` | 非空，默认 `1` | `1` 生效，`0` 取消 |
| `created_at` | `DATETIME` | 默认当前时间 | 创建时间 |
| `updated_at` | `DATETIME` | 默认当前时间，自动更新，索引 | 更新时间 |

核心约束：

- `uk_user_video_relation(user_id, video_id, action_type)`：同一用户对同一视频的同一动作只有一条状态记录。

索引：

- `idx_user_action_status(user_id, action_type, status)`：查询用户当前点赞/收藏列表。
- `idx_video_action_status(video_id, action_type, status)`：统计视频当前点赞/收藏状态。
- `idx_updated_at(updated_at)`：增量同步或排查状态变化。

业务说明：

- 当前是否点赞、收藏应以此表为准。
- `user_events` 只表示行为发生过，不表示当前状态。

#### media_files

媒体文件登记表，用于文件哈希去重和秒传。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 主键，自增 | 主键 ID |
| `file_hash` | `VARCHAR(64)` | 非空，唯一 | 文件哈希值，MD5 或 SHA-256 |
| `file_size` | `BIGINT` | 非空 | 文件大小 |
| `file_name` | `VARCHAR(255)` | 非空 | 原始文件名 |
| `video_url` | `VARCHAR(512)` | 非空 | 视频存储 URL |
| `created_at` | `DATETIME` | 默认当前时间 | 创建时间 |

核心约束：

- `uk_file_hash(file_hash)`：同一文件哈希只登记一次。

#### video_comments

视频评论表，支持一级评论和回复。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 主键，自增 | 评论 ID |
| `user_id` | `BIGINT` | 非空，索引 | 评论用户 ID |
| `video_id` | `BIGINT` | 非空，索引 | 视频 ID |
| `content` | `VARCHAR(500)` | 非空 | 评论内容 |
| `parent_id` | `BIGINT` | 可空，索引 | 父评论 ID，空表示一级评论 |
| `status` | `TINYINT` | 非空，默认 `1` | `1` 正常，`0` 已删除 |
| `created_at` | `DATETIME` | 默认当前时间，索引 | 创建时间 |

索引：

- `idx_video_id(video_id)`：查询视频评论列表。
- `idx_user_id(user_id)`：查询用户评论。
- `idx_parent_id(parent_id)`：查询评论回复。
- `idx_created_at(created_at)`：按时间排序。

#### user_comment_preferences

用户评论偏好表，由推荐服务回写评论偏好分。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 主键，自增 | 主键 ID |
| `user_id` | `BIGINT` | 非空，索引 | 用户 ID |
| `video_id` | `BIGINT` | 非空，索引 | 视频 ID |
| `comment_id` | `BIGINT` | 非空 | 评论 ID |
| `preference_score` | `DOUBLE` | 非空，默认 `0.0` | 喜好程度，范围约为 `0-1` |
| `created_at` | `DATETIME` | 默认当前时间 | 创建时间 |

核心约束：

- `uk_comment(user_id, video_id, comment_id)`：同一用户对同一视频下同一评论只有一条偏好记录。

#### user_follows

用户关注关系表，保存当前关注状态。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | `BIGINT` | 主键，自增 | 主键 ID |
| `follower_id` | `BIGINT` | 非空，索引 | 关注者 ID |
| `following_id` | `BIGINT` | 非空，索引 | 被关注者 ID |
| `status` | `TINYINT` | 非空，默认 `1` | `1` 生效，`0` 取消 |
| `created_at` | `DATETIME` | 默认当前时间 | 创建时间 |
| `updated_at` | `DATETIME` | 默认当前时间，自动更新，索引 | 更新时间 |

核心约束：

- `uk_user_follow(follower_id, following_id)`：同一关注关系只有一条状态记录。

索引：

- `idx_follower_status(follower_id, status)`：查询用户关注列表。
- `idx_following_status(following_id, status)`：查询用户粉丝列表。
- `idx_updated_at(updated_at)`：增量同步或状态排查。

### 2.4 MySQL 逻辑关系

当前建表脚本未显式声明外键，但业务上存在以下关系：

| 主体 | 关联对象 | 关系说明 |
| --- | --- | --- |
| `users.user_id` | `videos.author_id` | 一个用户可发布多个视频 |
| `videos.id` | `video_tags.video_id` | 一个视频可有多个标签 |
| `videos.id` | `video_daily_stats.video_id` | 一个视频每天一条聚合统计 |
| `users.user_id` + `videos.id` | `user_events` | 用户对视频的行为流水 |
| `users.user_id` + `videos.id` | `user_video_relations` | 用户对视频的当前点赞/收藏状态 |
| `videos.id` | `video_comments.video_id` | 一个视频可有多条评论 |
| `video_comments.id` | `video_comments.parent_id` | 评论可回复评论 |
| `users.user_id` | `user_follows.follower_id/following_id` | 用户之间的关注关系 |

## 3. Milvus 向量数据库

### 3.1 基本配置

- 连接地址：由环境变量 `MILVUS_HOST` 和 `MILVUS_PORT` 控制，默认 `localhost:19530`
- 向量维度：`1024`
- 相似度指标：`COSINE`

### 3.2 Collection 清单

| Collection | 说明 | 主键 | 向量字段 | 维度 | 索引 |
| --- | --- | --- | --- | --- | --- |
| `video_embedding` | 视频向量存储 | `video_id` | `embedding` | `1024` | `HNSW` |
| `user_long_term_vectors` | 用户长期兴趣向量 | `user_id` | `vector` | `1024` | `IVF_FLAT` |
| `user_interest_vectors` | 用户初始/兴趣向量 | `user_id` | `vector` | `1024` | `IVF_FLAT` |

### 3.3 video_embedding

视频向量 Collection，用于保存每个视频的内容向量。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `video_id` | `INT64` | 主键 | 视频 ID，对应 MySQL `videos.id` |
| `embedding` | `FLOAT_VECTOR` | 维度 `1024` | 视频内容向量 |
| `author_id` | `INT64` | 普通字段 | 作者 ID，对应 MySQL `videos.author_id` |
| `created_ts` | `INT64` | 普通字段 | 视频创建时间戳 |

索引配置：

| 参数 | 值 |
| --- | --- |
| `metric_type` | `COSINE` |
| `index_type` | `HNSW` |
| `M` | `16` |
| `efConstruction` | `200` |

业务说明：

- 后端创建视频元数据后，通过 MQ 触发视频向量生成。
- Recommend 服务生成 `1024` 维向量后写入该 Collection。
- 写入前会按 `video_id` 删除旧记录，以保证幂等。

### 3.4 user_long_term_vectors

用户长期兴趣向量 Collection，用于保存沉淀后的长期兴趣表达。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `user_id` | `INT64` | 主键 | 用户 ID，对应 MySQL `users.user_id` |
| `vector` | `FLOAT_VECTOR` | 维度 `1024` | 用户长期兴趣向量 |
| `updated_at` | `INT64` | 普通字段 | 更新时间戳 |

索引配置：

| 参数 | 值 |
| --- | --- |
| `metric_type` | `COSINE` |
| `index_type` | `IVF_FLAT` |
| `nlist` | `1024` |

### 3.5 user_interest_vectors

用户兴趣向量 Collection，用于保存用户初始兴趣或阶段性兴趣表达。

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `user_id` | `INT64` | 主键 | 用户 ID，对应 MySQL `users.user_id` |
| `vector` | `FLOAT_VECTOR` | 维度 `1024` | 用户兴趣向量 |
| `updated_at` | `INT64` | 普通字段 | 更新时间戳 |

索引配置同 `user_long_term_vectors`。

## 4. MySQL 与 Milvus 的数据链路

### 4.1 视频向量链路

1. 后端创建视频元数据，写入 MySQL `videos`。
2. 后端发送 `event.video_embedding` 消息。
3. `VideoEmbeddingConsumer` 根据 `videoId` 从 MySQL 读取视频信息。
4. 后端调用 Recommend 服务 `/api/embedding/video` 生成视频向量。
5. Recommend 服务校验向量维度为 `1024`。
6. Recommend 服务写入 Milvus `video_embedding`。
7. 写入成功后，视频可从审核中切换为已发布。

### 4.2 用户实时向量链路

1. 用户行为进入 MQ，例如曝光、点击、点赞、完播、分享、评论。
2. 消费者将原始行为写入 MySQL `user_events`。
3. 消费者同步更新 MySQL `video_daily_stats`。
4. 对 `CLICK`、`LIKE`、`FINISH`、`SHARE` 等有效行为，后端读取最近行为和视频向量。
5. Recommend 服务计算用户实时向量。
6. 实时向量缓存到 Redis `user:vec:{userId}`，长期向量可持久化到 Milvus 用户向量 Collection。

### 4.3 热门池链路

1. 调度器定时读取已发布视频。
2. 读取每个视频最新的 `video_daily_stats`。
3. 按 `like_cnt * 2 + finish_cnt * 3 + share_cnt * 5 - time_decay` 计算热度。
4. 热门结果写入 Redis ZSET `video:hot`。
5. Feed 读取热门池，并结合 Redis `user:seen:{userId}` 过滤已看视频。

## 5. 一致性与设计注意事项

- MySQL 建表脚本未启用外键约束，关系一致性主要由业务代码维护。
- `user_video_relations` 是当前点赞/收藏状态的真相表，`user_events` 是历史行为流水，二者不能混用。
- `video_daily_stats` 是聚合表，不应反向作为原始行为来源。
- MySQL `videos.id` 与 Milvus `video_embedding.video_id` 必须保持一致。
- MySQL `users.user_id` 与 Milvus 用户向量 Collection 的 `user_id` 必须保持一致。
- 视频向量、用户向量维度均固定为 `1024`，修改维度需要同步后端、Recommend、Milvus 初始化脚本和相关文档。
- Milvus 写入视频向量时按 `video_id` 做幂等覆盖，避免重复消费导致多条脏数据。

## 6. 建议改进项

- 对核心关系补充应用层一致性校验，例如删除视频时同步处理标签、评论、统计和向量。
- 对 `videos.status`、`user_video_relations.status` 等状态字段统一维护枚举定义，避免魔法数字分散。
- 如果后续数据量增长，可为 `user_events` 增加按时间归档或分区策略。
- 如果评论量增长明显，可增加 `(video_id, status, created_at)` 复合索引优化评论列表查询。
- 如果需要更强的数据完整性，可评估为核心 MySQL 关系补充外键或软外键检查任务。
