# AGENTS.md - 抖音代码库指南

本文档为参与抖音（Douyin）项目的 AI 代理和开发人员提供基本指南。

## 1. 构建、运行和测试命令

### 后端 (Java/Spring Boot)
- **工作目录:** `backend/`
- **构建:** `mvn clean install`
- **运行应用:** `mvn spring-boot:run`
- **运行所有测试:** `mvn test`
- **运行单个测试类:** `mvn -Dtest=ClassName test`
- **运行单个测试方法:** `mvn -Dtest=ClassName#methodName test`
- **Lint/验证:** `mvn checkstyle:check` (如果已配置) 或依赖 `mvn clean install`

### 推荐服务 (Python/FastAPI)
- **工作目录:** `recommend/`
- **安装依赖:** `pip install -r requirements.txt`
- **运行应用:** `python main.py` 或 `uvicorn app.main:app --host 0.0.0.0 --port 8001`
- **运行测试:** `pytest` (标准约定，确保已安装 `pytest`)
- **Lint:** `pylint app/` 或 `flake8 app/`

### 前端 (React)
- **工作目录:** `frontend/`
- **安装依赖:** `pnpm install`
- **运行:** `pnpm dev`
- **构建:** `pnpm build`

### 基础设施
- **启动所有服务:** `docker-compose up -d`
- **查看日志:** `docker-compose logs -f [service_name]`

## 2. 代码风格与规范

### Java (Spring Boot)
- **格式:** 4 空格缩进。大括号在同一行。
- **命名:** 类名 `PascalCase`，方法/变量名 `camelCase`，常量 `UPPER_SNAKE_CASE`。
- **导入:** 推荐显式导入。分组顺序：`java.*` -> 第三方库 -> `com.douyin.*`。
- **注解:** 使用 Lombok (`@Data`, `@Slf4j`, `@RequiredArgsConstructor`) 减少样板代码。
- **依赖注入:** 推荐构造器注入 (`@RequiredArgsConstructor` + `final` 字段)。
- **数据库:** MyBatis-Plus。使用 `LambdaQueryWrapper` 进行类型安全的查询。
  - 示例: `new LambdaQueryWrapper<Video>().eq(Video::getStatus, VideoStatus.PUBLISHED)`
- **错误处理:** 使用 `try-catch` 并记录日志 `log.error("msg", e)`。不要默默吞掉异常。
- **响应:** 返回 `Result<T>` 或特定的 DTO。

### Python (FastAPI/PyTorch)
- **格式:** 4 空格缩进。遵循 PEP 8。
- **类型提示:** 函数参数和返回类型必须使用类型提示。使用 `typing.List`, `typing.Dict` 等。
  - 示例: `def rank_videos(user_id: int, candidates: List[Dict]) -> List[Dict]:`
- **文档字符串:** 复杂逻辑使用 Google 风格 (Args/Returns)。
- **命名:** 类名 `PascalCase`，函数/变量名 `snake_case`。
- **项目结构:** `app/api` (路由), `app/services` (逻辑), `app/models` (神经网络定义)。
- **安全:** 推理时使用 `torch.no_grad()`。
- **解释器：** 使用 `conda Douyin`

## 3. 架构与数据流

### 核心组件
1.  **后端 (8080):** 业务逻辑、召回 (Redis/标签)、粗排。
2.  **推荐服务 (8001):** 深度学习、向量生成 (Milvus)、精排 (Wide&Deep)。
3.  **存储:** MySQL (元数据), Redis (热点/缓存), Milvus (向量), RabbitMQ (异步事件)。

### 推荐流水线
1.  **召回 (Recall):**
    - 热门 (Redis ZSET)
    - 标签 (用户画像标签)
    - 向量 (Milvus ANN -> `RecommendServiceClient` -> FastAPI)
2.  **过滤 (Filter):** 去重 & 移除 `user:seen:{id}`。
3.  **粗排 (Coarse Rank):** 规则排序 (召回分 + 热度分)。
4.  **精排 (Fine Rank - 可选):** 调用 FastAPI `/api/rank` (Wide & Deep)。

### 关键数据模型 (MySQL)
- `user_profile`: `interest_tags` (JSON), `long_vec` (JSON)。
- `video`: `tags` (JSON)。
- `user_event`: 用户行为日志 (点赞、完播、分享等)。

## 4. Agent 操作规则

- **路径处理:** 文件操作**始终**使用绝对路径。
- **修改:**
  - 如果修改 FastAPI 接口，**必须**更新 Java `RecommendServiceClient`。
  - 如果修改数据库 Schema (`schema.sql`)，需创建迁移计划。
- **测试:** 逻辑修改后**始终**运行测试。
  - Java: `mvn test`
  - Python: `pytest`
- **安全:** **绝不**提交密钥 (API keys, 密码)。检查 `application.yml` 和 `.env`。
- **文档:** 如果架构发生重大变更，请更新 `AGENTS.md`。

## 5. Cursor/Copilot 指令

- **上下文:** 编辑 `FeedServiceImpl.java` 时，同时也阅读 `RecommendServiceClient.java` 以理解外部依赖。
- **风格:** 模仿现有的日志模式 (`log.info/error`)。
- **重构:** 重命名字段时，检查 Java 和 Python 之间的 JSON 序列化 (Jackson/Pydantic) 兼容性。
