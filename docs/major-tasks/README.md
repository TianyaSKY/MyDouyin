# 主要任务实现文档

本目录用于记录项目中「非普通增删改查」的核心任务实现。

覆盖范围：
- 向量构建与持久化
- 热门池更新与 Feed 热召回
- 用户状态更新（真相表、事件流、Redis 运行时状态）

不包含：
- 纯 CRUD 接口与无异步、无跨服务链路的简单业务逻辑

文档列表：
- `docs/major-tasks/vector-construction.md`
- `docs/major-tasks/hot-pool-refresh.md`
- `docs/major-tasks/user-state-update.md`
