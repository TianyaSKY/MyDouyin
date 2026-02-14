# 热门池更新

## 1. 调度器与触发方式

实现位置：
- `backend/src/main/java/com/douyin/service/HotVideoScheduler.java`

触发方式：
- `@Scheduled(fixedRate = 300000)`：每 5 分钟刷新一次。
- `@Scheduled(initialDelay = 10000, fixedDelay = Long.MAX_VALUE)`：应用启动 10 秒后初始化一次。

## 2. 数据来源与打分逻辑

输入视频集合：
- 全量 `PUBLISHED` 状态视频。

统计来源：
- 每个视频最新一条 `video_stats_daily`。

热度公式：
- `like_cnt * 2 + finish_cnt * 3 + share_cnt * 5 - time_decay`
- `time_decay` 为每小时衰减 `0.1`。
- 最终分数不小于 0。

## 3. Redis 热门池物化

Redis key：
- `video:hot`（ZSET）

写入模型：
- member：`videoId` 字符串
- score：热度分

保留策略：
- 仅保留 Top 1000。
- 每次刷新后裁剪低分尾部数据。

## 4. Feed 对热门池的使用

使用方：
- `backend/src/main/java/com/douyin/service/impl/FeedServiceImpl.java`

读取策略：
- 按分数倒序读取 `video:hot`。
- 读取窗口会放大（`HOT_POOL_EXPAND`），再做 seen 过滤。
- 已看过滤依赖 Redis 集合 `user:seen:{userId}`。
- 热门召回不足时自动走 DB 兜底。

## 5. 排查建议

当热门池结果异常时，优先检查：
- `HotVideoScheduler` 是否按时执行。
- `UserEventConsumer` 是否持续更新 `video_stats_daily`。
- Redis 中 `video:hot` 的基数与头部 score 是否合理。
