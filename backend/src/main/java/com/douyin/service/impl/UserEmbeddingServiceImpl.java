package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.client.RecommendServiceClient;
import com.douyin.entity.UserEvent;
import com.douyin.entity.UserProfile;
import com.douyin.entity.Video;
import com.douyin.enums.EventType;
import com.douyin.service.UserEmbeddingService;
import com.douyin.service.UserEventService;
import com.douyin.service.UserProfileService;
import com.douyin.service.VideoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * 用户向量服务实现（接入 FastAPI 服务）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserEmbeddingServiceImpl implements UserEmbeddingService {

    private final UserProfileService userProfileService;
    private final UserEventService userEventService;
    private final VideoService videoService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RecommendServiceClient recommendServiceClient;

    private static final String USER_VECTOR_KEY_PREFIX = "user:vec:";
    private static final int VECTOR_DIM = 128;
    private static final int RECENT_EVENTS_LIMIT = 50;
    private static final int VECTOR_EXPIRE_HOURS = 24;

    private static final Map<EventType, Double> EVENT_WEIGHTS = Map.of(
        EventType.CLICK, 0.3,
        EventType.LIKE, 1.0,
        EventType.FINISH, 1.5,
        EventType.SHARE, 2.0
    );

    @Override
    public List<Float> getUserRealtimeVector(Long userId) {
        try {
            // 1. 尝试从 Redis 获取
            String key = USER_VECTOR_KEY_PREFIX + userId;
            List<Object> cachedVector = redisTemplate.opsForList().range(key, 0, -1);
            
            if (cachedVector != null && cachedVector.size() == VECTOR_DIM) {
                return cachedVector.stream()
                    .map(obj -> ((Number) obj).floatValue())
                    .collect(Collectors.toList());
            }

            // 2. Redis 中不存在，重新计算
            List<Float> vector = calculateRealtimeVector(userId);
            
            // 3. 存入 Redis
            if (!vector.isEmpty()) {
                redisTemplate.delete(key);
                redisTemplate.opsForList().rightPushAll(key, vector.toArray());
                redisTemplate.expire(key, VECTOR_EXPIRE_HOURS, TimeUnit.HOURS);
            }
            
            return vector;

        } catch (Exception e) {
            log.error("Error getting realtime vector for user: {}", userId, e);
            return getDefaultVector();
        }
    }

    @Override
    public List<Double> getUserLongTermVector(Long userId) {
        try {
            // 从 Milvus 获取长期向量（通过 FastAPI 服务）
            List<Float> longTermVec = recommendServiceClient.getUserLongTermVector(userId);
            
            if (longTermVec != null && longTermVec.size() == VECTOR_DIM) {
                return longTermVec.stream()
                    .map(Float::doubleValue)
                    .collect(Collectors.toList());
            }
            
            log.debug("Long-term vector not found for user: {}", userId);
            return new ArrayList<>();
            
        } catch (Exception e) {
            log.error("Error getting long-term vector for user: {}", userId, e);
            return new ArrayList<>();
        }
    }

    @Override
    public void updateRealtimeVector(Long userId, Long videoId, EventType eventType) {
        try {
            if (!EVENT_WEIGHTS.containsKey(eventType)) {
                return;
            }

            // 异步计算并更新向量
            calculateAndCacheVector(userId);
            
            log.debug("Updated realtime vector for user {} after {} event", userId, eventType);

        } catch (Exception e) {
            log.error("Error updating realtime vector for user: {}", userId, e);
        }
    }

    @Override
    public List<Float> calculateRealtimeVector(Long userId) {
        try {
            // 1. 获取用户最近的交互行为
            List<UserEvent> recentEvents = userEventService.list(
                new LambdaQueryWrapper<UserEvent>()
                    .eq(UserEvent::getUserId, userId)
                    .in(UserEvent::getEventType, EVENT_WEIGHTS.keySet())
                    .orderByDesc(UserEvent::getTs)
                    .last("LIMIT " + RECENT_EVENTS_LIMIT)
            );

            if (recentEvents.isEmpty()) {
                log.debug("User {} has no recent events, using default vector", userId);
                return getDefaultVector();
            }

            // 2. 获取这些视频的ID
            List<Long> videoIds = recentEvents.stream()
                .map(UserEvent::getVideoId)
                .distinct()
                .collect(Collectors.toList());

            // 3. 批量获取视频向量（调用 FastAPI 服务）
            Map<Long, List<Float>> videoVectors = getVideoVectorsFromService(videoIds);

            if (videoVectors.isEmpty()) {
                log.warn("Failed to get video vectors from recommend service, using fallback");
                return getDefaultVector();
            }

            // 4. 准备数据，调用 FastAPI 计算用户向量
            List<Map<String, Object>> eventData = new ArrayList<>();
            DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

            for (UserEvent event : recentEvents) {
                List<Float> videoVec = videoVectors.get(event.getVideoId());
                if (videoVec == null || videoVec.size() != VECTOR_DIM) {
                    continue;
                }

                Map<String, Object> eventMap = new HashMap<>();
                eventMap.put("video_id", event.getVideoId());
                eventMap.put("event_type", event.getEventType().name());
                eventMap.put("timestamp", event.getTs().format(formatter));
                eventMap.put("video_embedding", videoVec);
                
                eventData.add(eventMap);
            }

            // 5. 调用 FastAPI 服务计算用户向量
            List<Float> userVector = recommendServiceClient.calculateUserEmbedding(userId, eventData);

            if (userVector != null && userVector.size() == VECTOR_DIM) {
                log.info("Calculated realtime vector for user {} from {} events via FastAPI", 
                    userId, eventData.size());
                return userVector;
            }

            log.warn("FastAPI service returned invalid vector, using fallback");
            return getDefaultVector();

        } catch (Exception e) {
            log.error("Error calculating realtime vector for user: {}", userId, e);
            return getDefaultVector();
        }
    }

    @Override
    public void updateLongTermVector(Long userId, List<Double> vector) {
        try {
            if (vector == null || vector.size() != VECTOR_DIM) {
                log.warn("Invalid vector size for user: {}", userId);
                return;
            }

            // 检查用户是否存在
            UserProfile user = userProfileService.getById(userId);
            if (user == null) {
                log.warn("User not found: {}", userId);
                return;
            }

            // 转换为 Float 列表
            List<Float> floatVector = vector.stream()
                .map(Double::floatValue)
                .collect(Collectors.toList());

            // 更新到 Milvus（通过 FastAPI 服务）
            boolean success = recommendServiceClient.updateUserLongTermVector(userId, floatVector);
            
            if (success) {
                log.info("Updated long-term vector for user: {} in Milvus", userId);
            } else {
                log.warn("Failed to update long-term vector for user: {}", userId);
            }

        } catch (Exception e) {
            log.error("Error updating long-term vector for user: {}", userId, e);
        }
    }

    @Override
    public List<Float> getFusedVector(Long userId, double shortTermWeight) {
        try {
            if (shortTermWeight < 0 || shortTermWeight > 1) {
                shortTermWeight = 0.7;
            }

            List<Float> shortVec = getUserRealtimeVector(userId);
            List<Double> longVec = getUserLongTermVector(userId);

            if (longVec.isEmpty()) {
                return shortVec;
            }

            List<Float> fusedVec = new ArrayList<>(VECTOR_DIM);
            double longTermWeight = 1.0 - shortTermWeight;

            for (int i = 0; i < VECTOR_DIM; i++) {
                float shortVal = i < shortVec.size() ? shortVec.get(i) : 0f;
                float longVal = i < longVec.size() ? longVec.get(i).floatValue() : 0f;
                fusedVec.add((float) (shortVal * shortTermWeight + longVal * longTermWeight));
            }

            log.debug("Fused vector for user {} with short-term weight: {}", userId, shortTermWeight);
            return fusedVec;

        } catch (Exception e) {
            log.error("Error fusing vectors for user: {}", userId, e);
            return getUserRealtimeVector(userId);
        }
    }

    /**
     * 从推荐服务获取视频向量
     */
    private Map<Long, List<Float>> getVideoVectorsFromService(List<Long> videoIds) {
        try {
            // 调用 FastAPI 批量获取视频向量
            Map<Long, List<Float>> vectors = recommendServiceClient.generateVideoEmbeddingsBatch(videoIds);
            
            if (vectors != null && !vectors.isEmpty()) {
                return vectors;
            }

            // 如果服务不可用，使用兜底方案
            log.warn("Recommend service unavailable, using fallback for video vectors");
            return generateFallbackVideoVectors(videoIds);

        } catch (Exception e) {
            log.error("Error getting video vectors from service", e);
            return generateFallbackVideoVectors(videoIds);
        }
    }

    /**
     * 兜底方案：基于标签生成简单向量
     */
    private Map<Long, List<Float>> generateFallbackVideoVectors(List<Long> videoIds) {
        Map<Long, List<Float>> vectors = new HashMap<>();
        List<Video> videos = videoService.listByIds(videoIds);
        
        for (Video video : videos) {
            List<Float> vector = generateMockVectorFromTags(video.getTags());
            vectors.put(video.getId(), vector);
        }
        
        return vectors;
    }

    /**
     * 基于标签生成模拟向量（兜底方案）
     */
    private List<Float> generateMockVectorFromTags(List<String> tags) {
        List<Float> vector = new ArrayList<>(VECTOR_DIM);
        Random random = new Random();
        
        if (tags != null && !tags.isEmpty()) {
            int seed = tags.stream().mapToInt(String::hashCode).sum();
            random.setSeed(seed);
        }
        
        for (int i = 0; i < VECTOR_DIM; i++) {
            vector.add(random.nextFloat());
        }
        
        return vector;
    }

    /**
     * 获取默认向量
     */
    private List<Float> getDefaultVector() {
        List<Float> vector = new ArrayList<>(VECTOR_DIM);
        for (int i = 0; i < VECTOR_DIM; i++) {
            vector.add(0.0f);
        }
        return vector;
    }

    /**
     * 异步计算并缓存向量
     */
    private void calculateAndCacheVector(Long userId) {
        try {
            List<Float> vector = calculateRealtimeVector(userId);
            String key = USER_VECTOR_KEY_PREFIX + userId;
            
            redisTemplate.delete(key);
            redisTemplate.opsForList().rightPushAll(key, vector.toArray());
            redisTemplate.expire(key, VECTOR_EXPIRE_HOURS, TimeUnit.HOURS);
            
        } catch (Exception e) {
            log.error("Error caching vector for user: {}", userId, e);
        }
    }
}
