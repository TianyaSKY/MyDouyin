package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.common.config.RabbitMQConfig;
import com.douyin.entity.dto.FeedResponse;
import com.douyin.entity.dto.RecallCandidate;
import com.douyin.entity.UserEvent;
import com.douyin.entity.Video;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.entity.enums.EventType;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.service.IFeedService;
import com.douyin.service.IMilvusService;
import com.douyin.service.UserEmbeddingService;
import com.douyin.service.VideoService;
import com.douyin.service.VideoStatsDailyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedServiceImpl implements IFeedService {

    // 负责视频数据查询，以及兜底时从数据库补召回结果。
    private final VideoService videoService;
    // 提供视频互动统计数据，用于计算热度分。
    private final VideoStatsDailyService videoStatsDailyService;
    // 调用 Milvus 做向量相似度检索。
    private final IMilvusService milvusService;
    // 生成用户兴趣向量，用于个性化召回。
    private final UserEmbeddingService userEmbeddingService;
    // 读写 Redis 中的热门池和用户已看历史等数据。
    private final RedisTemplate<String, Object> redisTemplate;
    // 将曝光事件发送到 RabbitMQ。
    private final RabbitTemplate rabbitTemplate;

    // Thread pool for parallel recall
    private final ExecutorService recallExecutor = Executors.newFixedThreadPool(10);

    // Redis ZSET：全局热门视频池 key。
    private static final String HOT_VIDEO_KEY = "video:hot";
    // Redis Set：用户已看视频集合 key 前缀。
    private static final String USER_SEEN_KEY_PREFIX = "user:seen:";
    // 候选召回放大倍数，避免过滤和排序后结果不足。
    private static final int RECALL_MULTIPLIER = 3;
    // 热门池召回时的放大倍数，用于抵消已看过滤造成的损耗。
    private static final int HOT_POOL_EXPAND = 5;
    // 向量召回时的放大倍数，用于抵消已看过滤造成的损耗。
    private static final int VECTOR_POOL_EXPAND = 3;
    // 最大召回轮数，每轮会逐步扩大召回窗口。
    private static final int MAX_RECALL_ATTEMPTS = 3;
    // 单轮召回候选数量上限，避免一次查太多。
    private static final int MAX_RECALL_SIZE = 300;
    // 数据库兜底查询时，排除 ID 列表的最大数量。
    private static final int MAX_EXCLUDE_SIZE = 1000;

    @Override
    public FeedResponse generateFeed(Long userId, int size) {
        int requestSize = size <= 0 ? 20 : size;
        log.info("Generating feed for user: {}, size: {}", userId, requestSize);

        // 0. 先获取用户已看集合，传入召回阶段直接排除
        Set<Long> seenVideoIds = getUserSeenIds(userId);
        log.info("User {} has seen {} videos", userId, seenVideoIds.size());

        // 1. 分轮多路召回（逐步扩大窗口，避免每次都卡在同一批候选）
        List<RecallCandidate> candidates = recallWithAttempts(userId, requestSize, seenVideoIds);
        log.info("Total recalled candidates (after excluding seen): {}", candidates.size());

        // 2. 排序（粗排）
        candidates = rankCandidates(candidates);

        // 3. 截断返回
        List<Video> result = candidates.stream()
            .limit(requestSize)
            .map(RecallCandidate::getVideo)
            .collect(Collectors.toList());

        // 4. 异步发送曝光事件
        asyncSendImpressionEvents(userId, result);

        // 5. 更新用户已看集合
        updateUserSeenSet(userId, result);

        // 6. hasMore: 基于数据库总发布数 vs 已看数来判断
        long totalPublished = videoService.count(
            new LambdaQueryWrapper<Video>().eq(Video::getStatus, VideoStatus.PUBLISHED)
        );
        long seenAfterThis = seenVideoIds.size() + result.size();
        boolean hasMore = seenAfterThis < totalPublished;

        return new FeedResponse(result, hasMore);
    }

    /**
     * 分轮召回：逐步扩大召回窗口，避免固定 topN 被 seen 过滤后直接空结果。
     */
    private List<RecallCandidate> recallWithAttempts(Long userId, int requestSize, Set<Long> seenVideoIds) {
        Map<Long, RecallCandidate> uniqueMap = new LinkedHashMap<>();

        for (int attempt = 0; attempt < MAX_RECALL_ATTEMPTS; attempt++) {
            int recallSize = requestSize * RECALL_MULTIPLIER * (attempt + 1);
            recallSize = Math.min(recallSize, MAX_RECALL_SIZE);

            List<RecallCandidate> attemptCandidates = multiRecall(userId, recallSize, seenVideoIds);
            mergeCandidates(uniqueMap, attemptCandidates);

            log.info("Recall attempt {} finished, merged candidates: {}", attempt + 1, uniqueMap.size());
            if (uniqueMap.size() >= requestSize) {
                break;
            }
        }

        // 兜底再补一轮 DB 候选，避免多路召回窗口不够时直接返回空
        if (uniqueMap.size() < requestSize) {
            int deficit = requestSize - uniqueMap.size();
            Set<Long> excludeIds = new HashSet<>(seenVideoIds);
            excludeIds.addAll(uniqueMap.keySet());

            List<RecallCandidate> fallback = fallbackRecallFromDB(Math.min(deficit * RECALL_MULTIPLIER, MAX_RECALL_SIZE), excludeIds);
            mergeCandidates(uniqueMap, fallback);
            log.info("Fallback appended {}, merged candidates: {}", fallback.size(), uniqueMap.size());
        }

        return new ArrayList<>(uniqueMap.values());
    }

    private void mergeCandidates(Map<Long, RecallCandidate> uniqueMap, List<RecallCandidate> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return;
        }

        for (RecallCandidate candidate : candidates) {
            if (candidate == null || candidate.getVideo() == null || candidate.getVideo().getId() == null) {
                continue;
            }

            Long videoId = candidate.getVideo().getId();
            if (!uniqueMap.containsKey(videoId) || candidate.getScore() > uniqueMap.get(videoId).getScore()) {
                uniqueMap.put(videoId, candidate);
            }
        }
    }

    /**
     * 获取用户已看视频ID集合
     */
    private Set<Long> getUserSeenIds(Long userId) {
        try {
            String seenKey = USER_SEEN_KEY_PREFIX + userId;
            Set<Object> seenIds = redisTemplate.opsForSet().members(seenKey);
            if (seenIds == null || seenIds.isEmpty()) {
                return Collections.emptySet();
            }
            return seenIds.stream()
                .map(id -> Long.parseLong(id.toString()))
                .collect(Collectors.toSet());
        } catch (Exception e) {
            log.error("Error getting user seen set", e);
            return Collections.emptySet();
        }
    }

    /**
     * 多路召回：热门池 + 向量召回 (并行执行)，在召回阶段排除已看视频
     */
    private List<RecallCandidate> multiRecall(Long userId, int totalSize, Set<Long> seenVideoIds) {
        List<RecallCandidate> allCandidates = new ArrayList<>();

        // 路径1: 热门池召回（40%）
        int hotSize = totalSize * 2 / 5;
        CompletableFuture<List<RecallCandidate>> hotFuture = CompletableFuture.supplyAsync(
            () -> recallFromHot(hotSize, seenVideoIds), recallExecutor)
            .exceptionally(e -> {
                log.error("Hot recall failed", e);
                return new ArrayList<>();
            });

        // 路径2: 向量召回（60%，主要召回路径）
        int vectorSize = totalSize * 3 / 5;
        CompletableFuture<List<RecallCandidate>> vectorFuture = CompletableFuture.supplyAsync(
            () -> recallByVector(userId, vectorSize, seenVideoIds), recallExecutor)
            .exceptionally(e -> {
                log.error("Vector recall failed", e);
                return new ArrayList<>();
            });

        try {
            // 等待所有任务完成 (因为有 exceptionally 处理，join 不会抛出异常)
            CompletableFuture.allOf(hotFuture, vectorFuture).join();
            
            List<RecallCandidate> hotCandidates = hotFuture.get();
            List<RecallCandidate> vectorCandidates = vectorFuture.get();

            if (hotCandidates != null) allCandidates.addAll(hotCandidates);
            if (vectorCandidates != null) allCandidates.addAll(vectorCandidates);
            
            log.info("Parallel recall finished. Hot: {}, Vector: {}", 
                hotCandidates != null ? hotCandidates.size() : 0, 
                vectorCandidates != null ? vectorCandidates.size() : 0);

        } catch (Exception e) {
            log.error("Unexpected error during parallel recall aggregation", e);
            // 极端情况下的兜底
            return new ArrayList<>(); 
        }

        // 去重（同一视频可能被多路召回）
        Map<Long, RecallCandidate> uniqueMap = new LinkedHashMap<>();
        for (RecallCandidate candidate : allCandidates) {
            Long videoId = candidate.getVideo().getId();
            if (!uniqueMap.containsKey(videoId)) {
                uniqueMap.put(videoId, candidate);
            } else {
                // 如果已存在，取更高的分数
                RecallCandidate existing = uniqueMap.get(videoId);
                if (candidate.getScore() > existing.getScore()) {
                    uniqueMap.put(videoId, candidate);
                }
            }
        }

        // 如果热门池+向量召回都不够，用 DB 兜底补充
        List<RecallCandidate> result = new ArrayList<>(uniqueMap.values());
        if (result.size() < totalSize) {
            int deficit = totalSize - result.size();
            Set<Long> excludeIds = new HashSet<>(seenVideoIds);
            excludeIds.addAll(uniqueMap.keySet());
            List<RecallCandidate> fallback = fallbackRecallFromDB(deficit, excludeIds);
            result.addAll(fallback);
            log.info("Added {} fallback candidates from DB", fallback.size());
        }

        return result;
    }

    /**
     * 路径1: 从热门池召回（Redis ZSET），排除已看视频
     */
    private List<RecallCandidate> recallFromHot(int size, Set<Long> seenVideoIds) {
        try {
            int fetchSize = Math.min(size * HOT_POOL_EXPAND, MAX_RECALL_SIZE);
            Set<ZSetOperations.TypedTuple<Object>> hotVideos =
                redisTemplate.opsForZSet().reverseRangeWithScores(HOT_VIDEO_KEY, 0, fetchSize - 1);

            if (hotVideos == null || hotVideos.isEmpty()) {
                log.warn("Hot video pool is empty, fallback to DB");
                return fallbackRecallFromDB(size, seenVideoIds);
            }

            // 过滤已看视频
            List<ZSetOperations.TypedTuple<Object>> filtered = hotVideos.stream()
                .filter(tuple -> {
                    Long videoId = Long.parseLong(tuple.getValue().toString());
                    return !seenVideoIds.contains(videoId);
                })
                .limit(size)
                .toList();

            if (filtered.isEmpty()) {
                return fallbackRecallFromDB(size, seenVideoIds);
            }

            List<Long> videoIds = filtered.stream()
                .map(tuple -> Long.parseLong(tuple.getValue().toString()))
                .collect(Collectors.toList());

            List<Video> videos = videoService.listByIds(videoIds);
            
            return videos.stream()
                .map(video -> {
                    Double score = filtered.stream()
                        .filter(t -> t.getValue().toString().equals(video.getId().toString()))
                        .findFirst()
                        .map(ZSetOperations.TypedTuple::getScore)
                        .orElse(0.0);
                    return new RecallCandidate(video, score, "hot");
                })
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error recalling from hot pool", e);
            return fallbackRecallFromDB(size, seenVideoIds);
        }
    }

    /**
     * 路径2: 基于向量召回（Milvus），排除已看视频
     */
    private List<RecallCandidate> recallByVector(Long userId, int size, Set<Long> seenVideoIds) {
        try {
            // 获取用户融合向量（短期70% + 长期30%）
            List<Float> userVector = userEmbeddingService.getFusedVector(userId, 0.7);
            
            if (userVector.isEmpty() || userVector.stream().allMatch(v -> v == 0.0f)) {
                log.debug("User {} has no valid vector, fallback to recent videos", userId);
                return fallbackRecallFromDB(size, seenVideoIds);
            }
            
            int fetchSize = Math.min(size * VECTOR_POOL_EXPAND, MAX_RECALL_SIZE);
            List<Long> videoIds = milvusService.searchSimilarVideos(userVector, fetchSize);
            
            if (videoIds.isEmpty()) {
                log.debug("Vector recall returned no results, fallback to recent videos");
                return fallbackRecallFromDB(size, seenVideoIds);
            }

            // 排除已看
            videoIds = videoIds.stream()
                .filter(id -> !seenVideoIds.contains(id))
                .limit(size)
                .collect(Collectors.toList());

            if (videoIds.isEmpty()) {
                return fallbackRecallFromDB(size, seenVideoIds);
            }

            List<Video> videos = videoService.listByIds(videoIds);
            
            return videos.stream()
                .map(video -> new RecallCandidate(video, 50.0, "vector"))
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error recalling by vector", e);
            return fallbackRecallFromDB(size, seenVideoIds);
        }
    }

    /**
     * 兜底：从数据库召回，排除已看视频
     */
    private List<RecallCandidate> fallbackRecallFromDB(int size, Set<Long> excludeIds) {
        int querySize = Math.min(size, MAX_RECALL_SIZE);
        LambdaQueryWrapper<Video> wrapper = new LambdaQueryWrapper<Video>()
            .eq(Video::getStatus, VideoStatus.PUBLISHED);

        if (excludeIds != null && !excludeIds.isEmpty()) {
            List<Long> limitedExcludeIds = excludeIds.stream()
                .limit(MAX_EXCLUDE_SIZE)
                .collect(Collectors.toList());
            wrapper.notIn(Video::getId, limitedExcludeIds);
        }

        wrapper.orderByDesc(Video::getCreatedAt)
            .last("LIMIT " + querySize);

        List<Video> videos = videoService.list(wrapper);

        return videos.stream()
            .map(video -> new RecallCandidate(video, 10.0, "fallback"))
            .collect(Collectors.toList());
    }

    /**
     * 排序：粗排（按召回分数 + 热度分）
     */
    private List<RecallCandidate> rankCandidates(List<RecallCandidate> candidates) {
        return candidates.stream()
            .sorted((a, b) -> {
                double scoreA = a.getScore() + calculateHotScore(a.getVideo());
                double scoreB = b.getScore() + calculateHotScore(b.getVideo());
                return Double.compare(scoreB, scoreA);
            })
            .collect(Collectors.toList());
    }

    /**
     * 计算视频热度分
     */
    private double calculateHotScore(Video video) {
        try {
            VideoStatsDaily stats = videoStatsDailyService.getOne(
                new LambdaQueryWrapper<VideoStatsDaily>()
                    .eq(VideoStatsDaily::getVideoId, video.getId())
                    .orderByDesc(VideoStatsDaily::getDate)
                    .last("LIMIT 1")
            );

            if (stats == null) {
                return 0.0;
            }

            // 热度分 = 点赞*2 + 完播*3 + 分享*5
            return stats.getLikeCnt() * 2.0 
                 + stats.getFinishCnt() * 3.0 
                 + (stats.getShareCnt() != null ? stats.getShareCnt() * 5.0 : 0);

        } catch (Exception e) {
            return 0.0;
        }
    }

    /**
     * 异步发送曝光事件到 MQ
     */
    private void asyncSendImpressionEvents(Long userId, List<Video> videos) {
        try {
            for (Video video : videos) {
                UserEvent event = new UserEvent();
                event.setUserId(userId);
                event.setVideoId(video.getId());
                event.setEventType(EventType.IMPR);
                event.setTs(LocalDateTime.now());
                
                rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    RabbitMQConfig.ROUTING_KEY,
                    event
                );
            }
            log.info("Sent {} impression events for user {}", videos.size(), userId);
        } catch (Exception e) {
            log.error("Error sending impression events", e);
        }
    }

    /**
     * 更新用户已看集合（Redis Set，7天过期）
     */
    private void updateUserSeenSet(Long userId, List<Video> videos) {
        try {
            String seenKey = USER_SEEN_KEY_PREFIX + userId;
            for (Video video : videos) {
                redisTemplate.opsForSet().add(seenKey, video.getId().toString());
            }
            // 设置7天过期
            redisTemplate.expire(seenKey, 7, java.util.concurrent.TimeUnit.DAYS);
        } catch (Exception e) {
            log.error("Error updating user seen set", e);
        }
    }
}
