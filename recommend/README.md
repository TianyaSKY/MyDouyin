# 推荐服务架构文档

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (React)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Spring Boot Backend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ FeedService  │  │ UserTagSvc   │  │UserEmbedSvc  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         │                 │                  ▼                   │
│         │                 │      ┌────────────────────┐         │
│         │                 │      │RecommendServiceClient│        │
│         │                 │      └──────────┬───────────┘        │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          │                 │                 │ HTTP
          │                 │                 ▼
          │                 │    ┌─────────────────────────────┐
          │                 │    │  FastAPI (Python/PyTorch)   │
          │                 │    │  ┌────────────────────────┐ │
          │                 │    │  │ VideoEncoder (模型)    │ │
          │                 │    │  │ UserEncoder (模型)     │ │
          │                 │    │  │ RankingModel (模型)    │ │
          │                 │    │  └────────────────────────┘ │
          │                 │    └─────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        存储层                                    │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐             │
│  │MySQL │  │Redis │  │Milvus│  │MinIO │  │RabbitMQ│            │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## 二、FastAPI 服务接口

### 1. 视频向量生成

**接口**: `POST /api/embedding/video`

**功能**: 使用深度学习模型将视频特征（标题、标签）编码为 128 维向量

**请求**:
```json
{
  "video_id": 123,
  "title": "美食教程",
  "tags": ["美食", "教程", "烹饪"]
}
```

**响应**:
```json
{
  "video_id": 123,
  "embedding": [0.12, 0.45, 0.78, ..., 0.33],  // 128维
  "dimension": 128
}
```

**模型**: `VideoEncoder` - 基于标签的 Embedding + 全连接网络

---

### 2. 批量视频向量生成

**接口**: `POST /api/embedding/video/batch`

**功能**: 批量生成视频向量，提高效率

**请求**:
```json
{
  "video_ids": [123, 456, 789]
}
```

**响应**:
```json
{
  "embeddings": {
    "123": [0.12, 0.45, ...],
    "456": [0.56, 0.23, ...],
    "789": [0.89, 0.34, ...]
  },
  "count": 3
}
```

---

### 3. 用户向量计算

**接口**: `POST /api/embedding/user`

**功能**: 基于用户最近的交互行为，计算用户实时兴趣向量

**请求**:
```json
{
  "user_id": 1001,
  "recent_events": [
    {
      "video_id": 123,
      "event_type": "SHARE",
      "timestamp": "2026-02-11T10:30:00",
      "video_embedding": [0.12, 0.45, ...]
    },
    {
      "video_id": 456,
      "event_type": "FINISH",
      "timestamp": "2026-02-11T09:15:00",
      "video_embedding": [0.56, 0.23, ...]
    }
  ]
}
```

**响应**:
```json
{
  "user_id": 1001,
  "embedding": [0.32, 0.45, 0.67, ...],  // 128维
  "dimension": 128,
  "events_count": 2
}
```

**计算逻辑**:
```python
# 1. 计算每个行为的权重
weight = behavior_weight × time_decay

# 2. 加权平均
user_vector = Σ(video_vector × weight) / Σ(weight)

# 3. 通过 UserEncoder 模型进一步编码
user_embedding = UserEncoder(user_vector)
```

---

### 4. 精排服务

**接口**: `POST /api/rank`

**功能**: 使用 Wide & Deep 模型对召回的候选视频进行精排

**请求**:
```json
{
  "user_id": 1001,
  "user_embedding": [0.32, 0.45, ...],
  "candidates": [
    {
      "video_id": 123,
      "video_embedding": [0.12, 0.45, ...],
      "recall_score": 85.5,
      "hot_score": 120.0
    },
    {
      "video_id": 456,
      "video_embedding": [0.56, 0.23, ...],
      "recall_score": 72.3,
      "hot_score": 95.0
    }
  ],
  "top_k": 20
}
```

**响应**:
```json
{
  "user_id": 1001,
  "ranked_videos": [
    {
      "video_id": 123,
      "rank_score": 0.92,
      "recall_score": 85.5,
      "hot_score": 120.0
    },
    {
      "video_id": 456,
      "rank_score": 0.87,
      "recall_score": 72.3,
      "hot_score": 95.0
    }
  ],
  "count": 2
}
```

**模型**: `RankingModel` - Wide & Deep 架构
- **Deep 部分**: 用户向量 + 视频向量 + 统计特征 → 深度网络
- **Wide 部分**: 召回分数 + 热度分 → 线性层
- **输出**: 点击率预估分数 (0-1)

---

## 三、Spring Boot 集成

### 1. RecommendServiceClient

HTTP 客户端，封装对 FastAPI 服务的调用：

```java
@Component
public class RecommendServiceClient {
    
    // 生成视频向量
    public List<Float> generateVideoEmbedding(Long videoId, String title, List<String> tags);
    
    // 批量生成视频向量
    public Map<Long, List<Float>> generateVideoEmbeddingsBatch(List<Long> videoIds);
    
    // 计算用户向量
    public List<Float> calculateUserEmbedding(Long userId, List<Map<String, Object>> recentEvents);
    
    // 精排服务
    public List<RankedVideo> rankVideos(Long userId, List<Float> userEmbedding, 
                                        List<Map<String, Object>> candidates, int topK);
    
    // 健康检查
    public boolean healthCheck();
}
```

### 2. UserEmbeddingServiceImpl 改造

**改造前**（模拟实现）:
```java
// 基于标签生成随机向量
private List<Float> generateMockVectorFromTags(List<String> tags) {
    Random random = new Random();
    // ... 生成随机向量
}
```

**改造后**（调用 FastAPI）:
```java
@Override
public List<Float> calculateRealtimeVector(Long userId) {
    // 1. 获取用户最近行为
    List<UserEvent> recentEvents = userEventService.list(...);
    
    // 2. 批量获取视频向量（调用 FastAPI）
    Map<Long, List<Float>> videoVectors = 
        recommendServiceClient.generateVideoEmbeddingsBatch(videoIds);
    
    // 3. 准备数据
    List<Map<String, Object>> eventData = prepareEventData(recentEvents, videoVectors);
    
    // 4. 调用 FastAPI 计算用户向量
    List<Float> userVector = 
        recommendServiceClient.calculateUserEmbedding(userId, eventData);
    
    return userVector;
}
```

---

## 四、完整数据流

### 场景1：用户行为上报 → 更新用户向量

```
1. 用户点赞视频
   ↓
2. POST /api/event → Spring Boot
   ↓
3. 发送到 RabbitMQ
   ↓
4. Consumer 消费
   ↓
5. UserEmbeddingService.updateRealtimeVector()
   ↓
6. 调用 RecommendServiceClient.calculateUserEmbedding()
   ↓
7. HTTP POST → FastAPI /api/embedding/user
   ↓
8. PyTorch 模型计算用户向量
   ↓
9. 返回 128 维向量
   ↓
10. 存入 Redis (user:vec:123, TTL=24h)
```

### 场景2：Feed 推荐流程

```
1. GET /api/feed?userId=123
   ↓
2. FeedService.generateFeed()
   ↓
3. 多路召回
   ├─ 热门池召回 (Redis ZSET)
   ├─ 标签召回 (MySQL + 用户标签)
   └─ 向量召回 (Milvus ANN)
       ↓
       需要用户向量 → UserEmbeddingService.getFusedVector()
       ↓
       从 Redis 获取实时向量
       从 MySQL 获取长期向量
       ↓
       融合：短期×0.7 + 长期×0.3
   ↓
4. 去重过滤
   ↓
5. 粗排（召回分数 + 热度分）
   ↓
6. 【可选】精排：调用 FastAPI /api/rank
   ↓
   RecommendServiceClient.rankVideos()
   ↓
   HTTP POST → FastAPI
   ↓
   Wide & Deep 模型预估点击率
   ↓
   返回排序后的视频列表
   ↓
7. 返回 Top 20
```

---

## 五、模型训练（离线）

### 1. VideoEncoder 训练

**目标**: 学习视频的语义表示

**数据**:
- 输入: 视频标签、标题
- 输出: 128 维向量

**训练方式**:
- 对比学习（Contrastive Learning）
- 相似视频的向量距离近，不相似的距离远

**训练脚本**: `recommend/train_video_encoder.py`

```python
# 伪代码
for batch in dataloader:
    video_tags = batch['tags']
    positive_samples = batch['similar_videos']
    negative_samples = batch['dissimilar_videos']
    
    anchor_emb = video_encoder(video_tags)
    pos_emb = video_encoder(positive_samples)
    neg_emb = video_encoder(negative_samples)
    
    loss = contrastive_loss(anchor_emb, pos_emb, neg_emb)
    loss.backward()
    optimizer.step()
```

### 2. UserEncoder 训练（Two-Tower）

**目标**: 学习用户和视频的匹配关系

**架构**:
```
用户塔                    视频塔
  ↓                        ↓
用户向量 (128维)        视频向量 (128维)
  ↓                        ↓
  └────────→ 余弦相似度 ←────┘
              ↓
          点击概率预测
```

**训练数据**:
- 正样本: 用户点击/点赞/完播的视频
- 负样本: 曝光但未点击的视频

**训练脚本**: `recommend/train_two_tower.py`

### 3. RankingModel 训练（Wide & Deep）

**目标**: 精准预估点击率

**特征**:
- Deep 特征: 用户向量、视频向量
- Wide 特征: 召回分数、热度分、用户历史统计

**训练数据**:
- 标签: 是否点击 (0/1)
- 特征: 上述所有特征

**训练脚本**: `recommend/train_ranking_model.py`

---

## 六、部署方案

### 1. 开发环境

```bash
# 启动 FastAPI 服务
cd recommend
pip install -r requirements.txt
python app.py

# 启动 Spring Boot
cd backend
mvn spring-boot:run
```

### 2. 生产环境

**Docker Compose**:

```yaml
services:
  recommend-service:
    build: ./recommend
    ports:
      - "8001:8001"
    environment:
      - MODEL_PATH=/models
    volumes:
      - ./models:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
  
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - RECOMMEND_SERVICE_URL=http://recommend-service:8001
    depends_on:
      - recommend-service
```

### 3. 配置

**application.yml**:
```yaml
recommend:
  service:
    url: http://localhost:8001
    timeout: 5000
    retry: 3
```

---

## 七、性能优化

### 1. 批量处理

- 视频向量批量生成（减少 HTTP 请求）
- 用户向量批量计算（定时任务预热）

### 2. 缓存策略

- Redis 缓存用户向量（24小时）
- Redis 缓存视频向量（永久，定期更新）
- 本地缓存模型预测结果（短期）

### 3. 异步处理

- 用户向量更新异步化（不阻塞行为上报）
- 精排可选（流量高峰时降级为粗排）

### 4. 模型优化

- 模型量化（FP16/INT8）
- ONNX 导出（加速推理）
- TensorRT 优化（GPU 推理）

---

## 八、监控指标

### 1. 服务指标

- FastAPI 响应时间（P50/P95/P99）
- 模型推理耗时
- 请求成功率
- 服务可用性

### 2. 业务指标

- 召回覆盖率
- 向量质量（余弦相似度分布）
- 精排效果（点击率提升）
- 用户满意度（完播率、分享率）

---

## 九、后续优化方向

1. **视频向量生成**：接入 CLIP/VideoMAE 等预训练模型
2. **实时特征**：接入实时特征服务（用户实时行为、视频实时热度）
3. **多目标优化**：同时优化点击率、完播率、分享率
4. **强化学习**：基于用户反馈动态调整推荐策略
5. **A/B 测试**：支持多策略实验对比

---

## 十、总结

通过 **FastAPI + PyTorch** 架构：

✅ **解耦**: 推荐算法独立服务，便于迭代
✅ **专业**: Python 生态更适合深度学习
✅ **性能**: GPU 加速，批量推理
✅ **灵活**: 模型热更新，不影响主服务
✅ **可扩展**: 支持多模型、多策略

当前实现提供了完整的接口和兜底方案，可以逐步替换模拟实现为真实模型。

