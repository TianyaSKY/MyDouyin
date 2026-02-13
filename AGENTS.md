# AGENTS.md - Douyin 项目协作指南（当前实现版）

本文件面向本仓库内的 AI 代理与开发者，约束日常修改行为、运行方式与跨服务联动规则。

## 1. 项目结构与职责

- `backend/`（Spring Boot, 默认端口 `18081`）
  - 对外 API、鉴权、视频元数据管理
  - 分片上传（init/chunk/complete）
  - Feed 多路召回 + 粗排
  - 通过 RabbitMQ 异步触发视频 embedding
- `recommend/`（FastAPI, 默认端口 `18101`）
  - 视频 embedding 生成（DashScope 多模态）
  - 本地媒体路径转公网 URL（tmper 上传）
  - embedding 写入 Milvus
  - 用户向量计算、向量召回、精排
- `frontend/`（React + Vite）
  - 视频上传（分片、断点续传、秒传）
  - Feed 展示与行为上报
- `storage/`
  - 当前本地文件落盘目录（例如 `storage/videos`）

## 2. 构建、运行与测试

### 2.1 Backend

- 工作目录：`backend/`
- 构建：`mvn clean install`
- 运行：`mvn spring-boot:run`
- 测试：`mvn test`

### 2.2 Recommend

- 工作目录：`recommend/`
- 安装依赖：`pip install -r requirements.txt`
- 运行：`python main.py`
- 可选运行：`uvicorn app.main:app --host 0.0.0.0 --port 18101`
- 测试：`pytest`

### 2.3 Frontend

- 工作目录：`frontend/`
- 安装依赖：`pnpm install`
- 开发运行：`pnpm dev`
- 构建：`pnpm build`

### 2.4 基础设施

- 启动：`docker-compose up -d`
- 查看日志：`docker-compose logs -f [service_name]`

## 3. 当前核心数据流（必须理解）

### 3.1 视频上传与发布流

1. 前端计算文件哈希（MD5/SHA-256）。
2. 调 `POST /api/videos/upload/init` 获取 `uploadId`、`uploadedChunks`、`instantUpload`。
3. 非秒传时分片上传 `POST /api/videos/upload/chunk`。
4. 调 `POST /api/videos/upload/complete` 完成合并并校验大小/哈希，返回 `videoUrl`（通常是 `/uploads/videos/...`）。
5. 调 `POST /api/videos` 写入视频元数据。
6. backend 发送 `event.video_embedding` MQ 消息。
7. `VideoEmbeddingConsumer` 消费消息，调用 recommend：
   - `/api/embedding/video` 生成向量
   - `/api/embedding/video/insert` 写入 Milvus
8. 成功后视频状态可从 `REVIEW` 自动切换为 `PUBLISHED`。

### 3.2 本地媒体到公网 URL（DashScope 前置）

- DashScope 多模态 embedding 需要公网可访问 URL。
- recommend 在 `VideoEmbeddingService` 内对 `cover_url/video_url` 做转换：
  - 若已是 `http(s)`，直接使用。
  - 若是本地路径（如 `/uploads/...`），先上传到 `https://tmper.app/upload/` 获取公网 URL。
- 转换结果使用 Redis 缓存 30 分钟（key 前缀：`recommend:upload:url:`）。

## 4. 接口与跨服务契约（高优先级规则）

- 若修改 recommend 接口入参/出参，必须同步检查并更新：
  - `backend/src/main/java/com/douyin/client/RecommendServiceClient.java`
- 当前视频 embedding 关键入参：`video_id/title/tags/cover_url/video_url`。
- 向量维度约束为 128，已在 Pydantic schema 层限制；修改维度需同步：
  - recommend schema
  - backend 消费与校验逻辑
  - Milvus collection 定义与写入逻辑

## 5. 代码风格与实现约束

### 5.1 Java

- 4 空格缩进，命名遵循 `PascalCase/camelCase/UPPER_SNAKE_CASE`。
- 优先构造器注入（`@RequiredArgsConstructor` + `final` 字段）。
- 错误处理不要吞异常，至少记录 `log.error(..., e)`。

### 5.2 Python

- 遵循 PEP 8，类型注解完整。
- Pydantic v2 优先 `model_dump()`，避免新旧写法混用。
- 能在 schema 层表达的校验，不重复写在路由层。
- 避免过度防御样板代码，优先简洁可读。

## 6. 环境变量与安全

- 根目录 `.env` 为主配置来源（recommend 通过 `app/core/config.py` 读取）。
- 关键变量（按当前实现）：
  - `RECOMMEND_PORT=18101`
  - `DASHSCOPE_API_KEY=...`
  - `DASHSCOPE_EMBEDDING_URL=...`
  - `DASHSCOPE_MULTIMODAL_MODEL=tongyi-embedding-vision-plus`
  - `TMPER_UPLOAD_URL=https://tmper.app/upload/`
  - `REDIS_HOST/REDIS_PORT/REDIS_DB/REDIS_PASSWORD`
- 严禁提交任何密钥、令牌、密码到仓库。

## 7. Agent 操作规则

- 文件操作使用绝对路径。
- 做跨服务改动时，先检查调用链再改代码，避免单边修改。
- 完成逻辑改动后至少执行最小可行校验：
  - Python：`python -m compileall recommend/app`
  - Java：`mvn test`（环境允许时）
- 未经用户明确要求，不要引入大规模重构或目录迁移。
- 若架构/接口发生实质变化，必须同步更新本文件。

