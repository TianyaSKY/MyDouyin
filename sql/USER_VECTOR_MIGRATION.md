# 用户向量存储迁移说明

## 变更概述

将用户兴趣从 **标签+权重** 改为 **向量存储**，并从 MySQL 迁移到 Milvus。

---

## 数据库变更

### MySQL Schema 变更

**之前**：
```sql
CREATE TABLE user_profile (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(64),
    long_vec JSON,              -- 长期兴趣向量
    interest_tags JSON,         -- 兴趣标签 {"科技": 0.8, "美食": 0.6}
    ...
);
```

**之后**：
```sql
CREATE TABLE user_profile (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(64),
    -- 向量已迁移到 Milvus
    ...
);
```

### Milvus Collection 新增

**Collection: `user_vectors`**

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | INT64 | 用户ID (主键) |
| long_term_vec | FLOAT_VECTOR(128) | 长期兴趣向量 |
| interest_vec | FLOAT_VECTOR(128) | 初始兴趣向量 |
| updated_at | INT64 | 更新时间戳 |

**索引**：
- `long_term_vec`: IVF_FLAT, COSINE
- `interest_vec`: IVF_FLAT, COSINE

---

## 初始化步骤

### 1. 启动 Milvus

```bash
# 使用 docker-compose
cd e:\Projects\Douyin
docker-compose up -d milvus-standalone
```

### 2. 初始化 Collection

```bash
cd scripts
python init_milvus.py
```

**输出示例**：
```
Connecting to Milvus at localhost:19530...
✓ Connected to Milvus successfully

Creating collection 'video_embedding'...
  ✓ Collection 'video_embedding' created
  Creating index...
  ✓ Index created: HNSW (metric: COSINE)
  ✓ Collection loaded into memory

Creating collection 'user_vectors'...
  ✓ Collection 'user_vectors' created
  Creating index on 'long_term_vec'...
  ✓ Index created on 'long_term_vec'
  Creating index on 'interest_vec'...
  ✓ Index created on 'interest_vec'
  ✓ Collection loaded into memory

✓ All collections initialized successfully!
```

---

## 使用方式

### Python (FastAPI)

```python
from app.services.milvus_service import milvus_service

# 1. 插入用户向量
milvus_service.insert_user_vector(
    user_id=1001,
    long_term_vec=[0.1, 0.2, ..., 0.5],  # 128维
    interest_vec=[0.3, 0.4, ..., 0.6]    # 128维
)

# 2. 获取用户向量
vectors = milvus_service.get_user_vectors(user_id=1001)
# 返回: {
#   "long_term_vec": [...],
#   "interest_vec": [...],
#   "updated_at": 1234567890
# }

# 3. 更新长期向量
milvus_service.update_user_long_term_vector(
    user_id=1001,
    long_term_vec=[0.2, 0.3, ..., 0.7]
)

# 4. 搜索相似用户（协同过滤）
similar_users = milvus_service.search_similar_users(
    user_vector=[0.1, 0.2, ..., 0.5],
    top_k=10,
    use_long_term=True
)
# 返回: [{"user_id": 1002, "distance": 0.95}, ...]

# 5. 向量召回
similar_videos = milvus_service.search_similar_videos(
    query_vector=[0.1, 0.2, ..., 0.5],  # 用户向量
    top_k=100
)
# 返回: [{"video_id": 123, "score": 0.92}, ...]
```

### Java (Spring Boot)

需要通过 FastAPI 服务调用：

```java
// 1. 计算用户向量（FastAPI 会自动存入 Milvus）
List<Float> userVec = recommendServiceClient.calculateUserEmbedding(
    userId, recentEvents
);

// 2. 向量召回（FastAPI 从 Milvus 查询）
List<RankedVideo> videos = recommendServiceClient.vectorRecall(
    userId, userVec, topK
);
```

---

## 向量生成逻辑

### 1. 初始兴趣向量 (interest_vec)

**场景**：用户注册时选择兴趣标签

```python
# 用户选择: ["科技", "美食", "旅游"]
tags = ["科技", "美食", "旅游"]

# 调用 FastAPI 生成向量
interest_vec = video_embedding_service.generate_embedding_from_tags(tags)

# 存入 Milvus
milvus_service.insert_user_vector(
    user_id=new_user_id,
    long_term_vec=[0.0] * 128,  # 初始为零向量
    interest_vec=interest_vec
)
```

### 2. 长期兴趣向量 (long_term_vec)

**场景**：基于用户历史行为，离线计算

```python
# 定时任务（每天凌晨）
def update_long_term_vectors():
    for user_id in active_users:
        # 获取用户最近30天的行为
        events = get_user_events(user_id, days=30)
        
        # 计算长期向量
        long_term_vec = calculate_long_term_vector(events)
        
        # 更新 Milvus
        milvus_service.update_user_long_term_vector(
            user_id=user_id,
            long_term_vec=long_term_vec
        )
```

### 3. 实时向量 (realtime_vec)

**场景**：Feed 推荐时，基于最近行为实时计算

```python
# 不存储在 Milvus，存储在 Redis (24小时过期)
realtime_vec = user_embedding_service.calculate_embedding(
    user_id=user_id,
    recent_events=last_50_events
)

# 存入 Redis
redis.setex(f"user:vec:{user_id}", 86400, realtime_vec)
```

---

## 向量融合策略

推荐时使用三种向量的加权融合：

```python
# 获取三种向量
interest_vec = milvus_service.get_user_vectors(user_id)["interest_vec"]
long_term_vec = milvus_service.get_user_vectors(user_id)["long_term_vec"]
realtime_vec = redis.get(f"user:vec:{user_id}")

# 加权融合
fused_vec = (
    interest_vec * 0.1 +      # 初始兴趣（权重低）
    long_term_vec * 0.2 +     # 长期兴趣
    realtime_vec * 0.7        # 实时兴趣（权重高）
)

# 用于向量召回
similar_videos = milvus_service.search_similar_videos(fused_vec, top_k=100)
```

---

## 优势对比

### 之前（标签+权重）

```json
{
  "interest_tags": {
    "科技": 0.8,
    "美食": 0.6,
    "旅游": 0.4
  }
}
```

**缺点**：
- ❌ 标签粒度粗，无法表达细粒度兴趣
- ❌ 无法捕捉标签之间的语义关系
- ❌ 难以做向量召回

### 之后（向量）

```json
{
  "interest_vec": [0.12, 0.45, 0.78, ..., 0.33]  // 128维
}
```

**优点**：
- ✅ 语义表达能力强
- ✅ 支持向量召回（ANN 搜索）
- ✅ 可以捕捉隐式兴趣
- ✅ 支持协同过滤（找相似用户）

---

## 性能指标

### Milvus 查询性能

- **数据量**：100万用户
- **向量维度**：128
- **索引类型**：IVF_FLAT
- **查询延迟**：< 50ms (Top 100)
- **QPS**：> 1000

### 存储空间

- **单个用户向量**：128 * 4 bytes * 2 = 1KB
- **100万用户**：~1GB

---

## 迁移检查清单

- [x] 更新 MySQL Schema (移除 `interest_tags`, `long_vec`)
- [x] 创建 Milvus Collection (`user_vectors`)
- [x] 实现 `milvus_service.py`
- [ ] 更新 Java 实体类 `UserProfile.java`
- [ ] 更新 `UserEmbeddingServiceImpl.java`
- [ ] 数据迁移脚本（将现有用户数据迁移到 Milvus）
- [ ] 更新 API 文档
- [ ] 集成测试

---

## 常见问题

### Q1: 新用户没有向量怎么办？

**A**: 使用初始兴趣向量 (interest_vec)，基于注册时选择的标签生成。

### Q2: 向量更新频率？

**A**: 
- `interest_vec`: 注册时生成，基本不变
- `long_term_vec`: 每天更新一次（离线任务）
- `realtime_vec`: 每次行为后更新（存 Redis）

### Q3: Milvus 挂了怎么办？

**A**: 降级方案：
1. 使用 Redis 缓存的实时向量
2. 使用热门池 + 标签召回
3. 监控告警，快速恢复

### Q4: 如何验证向量质量？

**A**: 
```python
# 1. 检查向量范数
norm = np.linalg.norm(vector)
assert 0.1 < norm < 10

# 2. 检查相似度分布
similarities = [cosine_similarity(vec1, vec2) for vec2 in sample_vectors]
assert np.mean(similarities) > 0.3

# 3. A/B 测试
# 对比向量召回 vs 标签召回的点击率
```

---

## 相关文件

- **数据库**: `sql/schema.sql`
- **初始化脚本**: `scripts/init_milvus.py`
- **Milvus 服务**: `recommend/app/services/milvus_service.py`
- **用户向量服务**: `recommend/app/services/user_service.py`
- **Java 客户端**: `backend/src/main/java/com/douyin/client/RecommendServiceClient.java`

