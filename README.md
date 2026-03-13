# Douyin

![title.png](docs/images/title.png)

一个面向短视频场景的 MVP 项目，包含上传发布、Feed 浏览、行为上报、推荐向量链路和注册冷启动兴趣建模。

## 项目概览

- `frontend/`：React + Vite 前端，负责登录注册、Feed、上传、个人页
- `backend/`：Spring Boot 核心服务，负责鉴权、视频元数据、上传、用户行为、缓存和调度任务
- `recommend/`：FastAPI 推荐服务，负责视频 embedding、用户向量、Milvus 检索
- `storage/`：本地文件存储目录
- `scripts/`：数据库初始化与迁移脚本

## 当前能力

- 视频上传：分片上传、断点续传、秒传
- 视频发布：写入元数据后异步生成 embedding 并入库 Milvus
- Feed 推荐：热门召回 + 向量召回 + 排序
- 点赞幂等：基于 `user_video_relations` 真相表控制重复行为
- 注册冷启动：新用户可选择标签，系统使用管理员已发布视频的标签向量均值初始化兴趣向量

## 技术栈

- 前端：React 18、Vite、TailwindCSS、React Router、Lucide React
- 后端：Spring Boot 3、MyBatis-Plus、MySQL、Redis、RabbitMQ、Milvus SDK
- 推荐：FastAPI、PyTorch、Pydantic v2、Redis、Milvus、DashScope
- 基础设施：Docker Compose、MySQL、Redis、RabbitMQ、Milvus、Attu

## 系统架构

![archieve.png](docs/images/archieve.png)

## 核心数据流

### 视频上传与发布

1. 前端计算文件哈希
2. 调用 `POST /api/videos/upload/init` 初始化上传
3. 分片上传 `POST /api/videos/upload/chunk`
4. 完成上传 `POST /api/videos/upload/complete`
5. 创建视频 `POST /api/videos`
6. backend 发送 `event.video_embedding` 到 RabbitMQ
7. `VideoEmbeddingConsumer` 调用 recommend：
   - `/api/embedding/video` 生成向量
   - `/api/embedding/video/insert` 写入 Milvus
8. 视频通过后可从 `REVIEW` 自动切换到 `PUBLISHED`

### 注册冷启动兴趣向量

1. 前端调用 `GET /api/auth/register/tags` 获取管理员已发布视频标签
2. 用户在注册页勾选感兴趣标签
3. backend 注册时读取 Redis 中的 `recommend:tag:vectors`
4. 对用户所选标签的向量做算术平均
5. 将结果写入 recommend/Milvus，作为用户初始兴趣向量

### 标签向量预计算

1. backend 定时任务扫描管理员已发布视频
2. 调用 recommend `/api/embedding/video/query` 查询已存储视频向量
3. 按标签分组，对每个标签下的视频向量求平均
4. 将结果写入 Redis Hash：`recommend:tag:vectors`

## 目录结构

```text
Douyin/
|-- backend/
|-- frontend/
|-- recommend/
|-- scripts/
|-- storage/
|-- docs/
|-- docker-compose.yml
`-- README.md
```

## 环境要求

- Node.js 18+
- npm 9+
- Java 17+
- Maven 3.9+
- Python 3.9+
- Docker + Docker Compose

## 环境变量

项目默认从根目录 `.env` 读取配置。常用变量示例：

```env
BACKEND_PORT=18081
RECOMMEND_PORT=18101

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=douyin
MYSQL_USER=douyin_user
MYSQL_PASSWORD=douyin_password

REDIS_HOST=localhost
REDIS_PORT=6379

RABBITMQ_HOST=localhost
RABBITMQ_AMQP_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
RABBITMQ_USER=user
RABBITMQ_PASSWORD=password

MILVUS_HOST=localhost
MILVUS_PORT=19530

RECOMMEND_HOST=localhost
RECOMMEND_SERVICE_URL=http://localhost:18101

DASHSCOPE_API_KEY=your_key
DASHSCOPE_EMBEDDING_URL=your_url
DASHSCOPE_MULTIMODAL_MODEL=tongyi-embedding-vision-plus

QINIU_ACCESS_KEY=your_key
QINIU_SECRET_KEY=your_secret
QINIU_BUCKET_NAME=your_bucket
QINIU_PUBLIC_BASE_URL=https://your-cdn-domain
```

不要把真实密钥提交到仓库。

## 快速开始

### 1. 启动基础设施

```bash
docker-compose up -d
```

默认会启动：

- MySQL
- Redis
- RabbitMQ
- Milvus
- Attu

数据库初始化脚本会自动执行 `scripts/schema.sql`。

### 2. 启动 recommend

```bash
pip install -r recommend/requirements.txt
python recommend/main.py
```

服务默认地址：`http://localhost:18101`

### 3. 启动 backend

```bash
mvn -f backend/pom.xml spring-boot:run
```

服务默认地址：`http://localhost:18081`

Swagger：`http://localhost:18081/swagger-ui/index.html`

### 4. 启动 frontend

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

Vite 默认会输出本地访问地址。

## 常用开发命令

### backend

```bash
mvn -f backend/pom.xml clean install
mvn -f backend/pom.xml test
mvn -f backend/pom.xml spring-boot:run
```

### recommend

```bash
pip install -r recommend/requirements.txt
python recommend/main.py
pytest recommend
python -m compileall recommend/app
```

### frontend

```bash
npm install --prefix frontend
npm run dev --prefix frontend
npm run build --prefix frontend
```

## 数据库说明

- `videos`：视频主表
- `video_tags`：视频标签表，标签已从 `videos.tags` 拆分出来
- `video_daily_stats`：视频统计表
- `user_video_relations`：用户和视频行为真相表
- `media_files`：文件哈希与上传记录

如果你是从旧结构迁移，可以执行：

```bash
mysql -u root -p douyin < scripts/migrate_video_tags.sql
```

## 验证建议

- 推荐服务代码校验：`python -m compileall recommend/app`
- 前端构建校验：`npm run build --prefix frontend`
- 后端单测：`mvn -f backend/pom.xml test`

## 常见排查

- 注册页没有标签：先确认管理员已发布带标签的视频，并且视频 embedding 已入库
- 新用户初始兴趣向量为全 0：通常是 Redis 里还没有 `recommend:tag:vectors`，或对应标签未命中
- embedding 失败：检查 recommend 服务、DashScope 配置、七牛公网 URL 转换是否正常
- 向量检索无结果：检查 Milvus 是否启动、视频 embedding 是否成功插入

## 项目截图

### Feed

![首页 Feed 流](docs/images/screenshot_feed.png)

### 上传

![视频上传](docs/images/screenshot_upload.png)

### 用户主页

![用户主页](docs/images/screenshot_profile.png)

## 相关文档

- `AGENTS.md`
- `scripts/README.md`
- `frontend/README.md`
- `docs/major-tasks/README.md`
