# Feed 推荐系统实现文档

## 已实现功能

### 1. 多路召回策略

#### 召回路径分配
- **热门池召回（50%）**：从 Redis ZSET 获取高热度视频
- **标签召回（30%）**：基于用户兴趣标签匹配
- **向量召回（20%）**：通过 Milvus 进行 ANN 检索

#### 召回去重
- 同一视频被多路召回时，保留最高分数
- 使用 LinkedHashMap 保证顺序

### 2. 过滤与排序

#### 去重过滤
- Redis Set 存储用户已看视频：`user:seen:{userId}`
- 7天自动过期

#### 粗排算法
```
最终分数 = 召回分数 + 热度分
热度分 = 点赞数*2 + 完播数*3 + 分享数*5
```

### 3. 热度池更新

#### 定时任务
- 每5分钟更新一次热门池
- 启动后10秒初始化

#### 热度计算公式
```
热度分 = (点赞*2 + 完播*3 + 分享*5) - 时间衰减
时间衰减 = 发布小时数 * 0.1
```

#### Redis 存储
- Key: `video:hot`
- 类型: ZSET
- 保留 Top 1000

### 4. 行为追踪

#### 曝光事件
- Feed 返回时自动发送曝光事件到 MQ
- 异步处理，不阻塞响应

#### 已看记录
- 更新 Redis Set：`user:seen:{userId}`
- 用于下次 Feed 去重

## API 接口

### GET /api/feed

**请求参数：**
- `userId` (必填): 用户ID
- `size` (可选): 返回数量，默认20

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "videos": [...],
    "hasMore": true,
    "nextCursor": null
  }
}
```

## 配置说明

### application.yml 新增配置
```yaml
milvus:
  host: localhost
  port: 19530
```

### Redis Keys
- `video:hot` - 热门视频池 (ZSET)
- `user:seen:{userId}` - 用户已看集合 (SET, 7天过期)

## 依赖更新

### pom.xml 新增
```xml
<dependency>
    <groupId>io.milvus</groupId>
    <artifactId>milvus-sdk-java</artifactId>
    <version>2.3.4</version>
</dependency>
```

## 数据库更新

### video_stats_daily 表新增字段
```sql
share_cnt INT DEFAULT 0 COMMENT '分享次数'
```

## 使用说明

### 1. 启动前准备
确保以下服务已启动：
- MySQL
- Redis
- RabbitMQ
- Milvus (可选，向量召回需要)

### 2. 初始化数据
系统启动后会自动：
- 初始化热门视频池
- 开启定时任务

### 3. 测试接口
```bash
# 获取推荐 Feed
curl "http://localhost:8080/api/feed?userId=1&size=20"
```

## 后续优化方向

1. **标签召回优化**：从用户历史行为提取兴趣标签
2. **用户向量生成**：基于行为序列生成实时兴趣向量
3. **精排模型**：接入深度学习排序模型
4. **A/B 测试**：支持多策略实验
5. **缓存优化**：Feed 结果缓存
6. **实时特征**：接入实时特征服务

