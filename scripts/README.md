# scripts 目录说明

本目录放置项目的辅助脚本，主要用于环境初始化、数据导入和本地调试，不属于线上服务启动主链路。

## 文件与作用

- `init_milvus.py`
  - 初始化 Milvus 所需的集合（Collection）与索引。
  - 主要创建：
    - `video_embedding`
    - `user_long_term_vectors`
    - `user_interest_vectors`
  - 向量维度按当前实现为 `128`。

- `import_local_videos.py`
  - 将本地视频批量导入到项目数据中。
  - 功能包括：
    - 扫描本地视频与封面
    - 按文件名解析标题/标签
    - 复制到 `storage/videos`、`storage/covers`
    - 写入 `videos`、`media_files`
    - 调用 recommend 服务生成视频 embedding
    - 通过 recommend 服务写入 Milvus `video_embedding`

- `requirements.txt`
  - `scripts` 目录脚本所需 Python 依赖（如 `pymilvus`、`pymysql`、`redis`）。

- `schema.sql`
  - 本项目核心 MySQL 表结构定义，便于初始化或对照数据库结构。

- `bench_hot_pool.py`
  - 热门池返回性能压测（Redis ZSET）。
  - 默认 key 为 `video:hot`，操作为 `ZREVRANGE ... WITHSCORES`。
  - 可输出 P50/P95/P99 延迟、RPS、空返回次数。

- `bench_milvus_query.py`
  - Milvus 查询性能压测（`video_embedding` 检索）。
  - 默认参数对齐当前实现：`embedding` 字段、`COSINE`、`dim=128`、`ef=64`。
  - 可输出 P50/P95/P99 延迟、RPS、平均命中数。

- `bench_mysql.py`
  - MySQL 响应速度压测（读为主，可按比例混入写入）。
  - 写入使用连接级临时表，不污染业务表。

- `bench_redis.py`
  - Redis 通用压测（`ping/set/get/set_get`）。

## 常用命令

在项目根目录执行：

```bash
pip install -r scripts/requirements.txt
python scripts/init_milvus.py
python scripts/import_local_videos.py --source "E:\你的视频目录" --dry-run

# 1) 热门池返回延迟（Redis ZSET）
python scripts/bench_hot_pool.py --requests 5000 --connections 80 --top-n 20

# 2) Milvus 查询延迟
python scripts/bench_milvus_query.py --requests 2000 --connections 20 --top-k 100 --ef 64

# 3) MySQL 读延迟
python scripts/bench_mysql.py --requests 3000 --connections 30 --write-ratio 0
```

## 注意事项

- `init_milvus.py` 与 `import_local_videos.py` 默认会读取项目根目录 `.env` 作为连接参数默认值（如 `MYSQL_*`、`MILVUS_*`）。
- 这些脚本主要面向开发/测试环境，执行前请确认目标数据库和 Milvus 地址。
- `import_local_videos.py` 会写入数据库并复制文件，建议先使用 `--dry-run` 预览。
- 若后端/推荐服务的向量维度或集合命名变更，请同步更新本目录脚本。
