# Douyin

![title.png](docs/images/title.png)

一个面向短视频场景的 MVP 项目，包含上传发布、Feed 浏览、行为上报、推荐向量链路和注册冷启动兴趣建模。

## 核心功能展示

### 1. 沉浸式 Feed 推荐流

结合热门召回与向量召回，提供沉浸式的短视频浏览体验。点赞操作基于 `user_video_relations` 真相表实现严格幂等。

![首页 Feed 流](docs/images/screenshot_feed.png)

### 2. 视频上传与发布

支持大文件分片上传、断点续传及秒传。发布后写入元数据并异步生成 embedding 入库 Milvus。

![视频上传](docs/images/screenshot_upload.png)

### 3. 个人主页与兴趣冷启动

新用户可选择标签，系统使用管理员已发布视频的标签向量均值初始化兴趣向量，解决冷启动问题。

![用户主页](docs/images/screenshot_profile.png)

### 4. 数据大屏

管理端提供多维度运营数据看板，包含 **数据总览、用户洞察、内容运营、推荐效果、评论情感** 五个 Tab，基于 ECharts 实现丰富的可视化图表。支持实时事件监控、用户增长趋势、行为转化漏斗、标签云、CTR 趋势等核心指标。前端与移动端均已实现。

![数据大屏](docs/images/data_display.png)

### 5. 评论情感分析

基于 **Erlangshen-Roberta-110M-Sentiment**（IDEA-CCNL 中文 RoBERTa 情感模型）对用户评论进行深度学习情感分析。分析结果实时反馈到推荐向量计算和数据大屏。正面评论等同点赞权重，负面评论反向削弱关联。当模型不可用时自动降级到关键词匹配方案。

![评论情感分析](docs/images/comment_analyse.png)

## 技术栈

- 前端：React 18、Vite、TailwindCSS、React Router、Lucide React
- 移动端：React Native、Expo、React Navigation、expo-av
- 后端：Spring Boot 3、MyBatis-Plus、MySQL、Redis、RabbitMQ、Milvus SDK
- 推荐：FastAPI、PyTorch、Transformers（Erlangshen-Roberta-110M-Sentiment）、Pydantic v2、Redis、Milvus、DashScope
- 可视化：ECharts（前端数据大屏）
- 基础设施：Docker Compose、MySQL、Redis、RabbitMQ、Milvus、Attu

## 系统架构

![archieve.png](docs/images/archieve.png)

## 核心数据流

### 视频上传与发布

![视频上传与发布流程](docs/images/upload_flow.png)

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

![注册冷启动兴趣向量流程](docs/images/cold_start_flow.png)

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

### 评论情感分析链路

1. 用户发表评论后，backend 发送 `CommentEventMessage` 到 RabbitMQ `comment.queue`
2. `CommentEventConsumer` 消费消息，调用 recommend `/api/comment/preference`
3. recommend 使用 Erlangshen-Roberta-110M-Sentiment 模型进行情感分析（返回 0~1 分数）
4. 情感分数映射为行为权重：正面 (>0.6) → 1.0，中性 → 0.3，负面 (<0.4) → -0.5
5. 结合用户-视频向量余弦相似度，加权融合得到综合偏好分数
6. 偏好分数写入 `user_comment_preferences` 表，同时触发用户向量实时更新
7. 情感统计数据通过 Dashboard API 聚合展示到数据大屏

## 目录结构

```text
Douyin/
|-- backend/
|-- frontend/
|-- mobile/
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

服务默认地址：`http://localhost:8082`

### 3. 启动 backend

```bash
mvn -f backend/pom.xml spring-boot:run
```

服务默认地址：`http://localhost:8081`

Swagger：`http://localhost:8081/swagger-ui/index.html`

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

### mobile

```bash
cd mobile
npm install
npx expo start --localhost --port 8085
```

> **注意**：移动端需要修改 `mobile/src/constants/config.js` 中的 `API_BASE_URL` 为你的后端地址。
>
> - Android 模拟器：`http://10.0.2.2:8081`
> - 真机调试：`http://<你的局域网IP>:8081`
