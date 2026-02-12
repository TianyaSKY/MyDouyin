package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.config.RabbitMQConfig;
import com.douyin.dto.FeedResponse;
import com.douyin.dto.RecallCandidate;
import com.douyin.entity.UserEvent;
import com.douyin.entity.Video;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.enums.EventType;
import com.douyin.enums.VideoStatus;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedServiceImpl implements IFeedService {

    private final VideoService videoService;
    private final VideoStatsDailyService videoStatsDailyService;
    private final IMilvusService milvusService;
    private final UserEmbeddingService userEmbeddingService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RabbitTemplate rabbitTemplate;

    private static final String HOT_VIDEO_KEY = "video:hot";
    private static final String USER_SEEN_KEY_PREFIX = "user:seen:";
    private static final int RECALL_MULTIPLIER = 3; // 召回候选数是返回数的3倍

    @Override
    public FeedResponse generateFeed(Long userId, int size) {
        log.info("Generating feed for user: {}, size: {}", userId, size);

        // 1. 多路召回
        List<RecallCandidate> candidates = multiRecall(userId, size * RECALL_MULTIPLIER);
        log.info("Total recalled candidates: {}", candidates.size());

        // 2. 去重过滤（过滤用户已看）
        candidates = deduplicateByUserSeen(userId, candidates);
        log.info("After deduplication: {}", candidates.size());

        // 3. 排序（粗排）
        candidates = rankCandidates(candidates);

        // 4. 截断返回
        List<Video> result = candidates.stream()
            .limit(size)
            .map(RecallCandidate::getVideo)
            .collect(Collectors.toList());

        // 5. 异步发送曝光事件
        asyncSendImpressionEvents(userId, result);

        // 6. 更新用户已看集合
        updateUserSeenSet(userId, result);

        return new FeedResponse(result, candidates.size() > size);
    }

    /**
     * 多路召回：热门池 + 向量召回
     */
    private List<RecallCandidate> multiRecall(Long userId, int totalSize) {
        List<RecallCandidate> allCandidates = new ArrayList<>();

        // 路径1: 热门池召回（40%）
        int hotSize = totalSize * 2 / 5;
        List<RecallCandidate> hotCandidates = recallFromHot(hotSize);
        allCandidates.addAll(hotCandidates);
        log.info("Hot recall: {} videos", hotCandidates.size());

        // 路径2: 向量召回（60%，主要召回路径）
        int vectorSize = totalSize * 3 / 5;
        List<RecallCandidate> vectorCandidates = recallByVector(userId, vectorSize);
        allCandidates.addAll(vectorCandidates);
        log.info("Vector recall: {} videos", vectorCandidates.size());

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

        return new ArrayList<>(uniqueMap.values());
    }

    /**
     * 路径1: 从热门池召回（Redis ZSET）
     */
    private List<RecallCandidate> recallFromHot(int size) {
        try {
            Set<ZSetOperations.TypedTuple<Object>> hotVideos = 
                redisTemplate.opsForZSet().reverseRangeWithScores(HOT_VIDEO_KEY, 0, size - 1);

            if (hotVideos == null || hotVideos.isEmpty()) {
                log.warn("Hot video pool is empty, fallback to DB");
                return fallbackRecallFromDB(size);
            }

            List<Long> videoIds = hotVideos.stream()
                .map(tuple -> Long.parseLong(tuple.getValue().toString()))
                .collect(Collectors.toList());

            List<Video> videos = videoService.listByIds(videoIds);
            
            return videos.stream()
                .map(video -> {
                    Double score = hotVideos.stream()
                        .filter(t -> t.getValue().toString().equals(video.getId().toString()))
                        .findFirst()
                        .map(ZSetOperations.TypedTuple::getScore)
                        .orElse(0.0);
                    return new RecallCandidate(video, score, "hot");
                })
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error recalling from hot pool", e);
            return fallbackRecallFromDB(size);
        }
    }

    /**
     * 路径2: 基于向量召回（Milvus）
     */
    private List<RecallCandidate> recallByVector(Long userId, int size) {
        try {
            // 获取用户融合向量（短期70% + 长期30%）
            List<Float> userVector = userEmbeddingService.getFusedVector(userId, 0.7);
            
            if (userVector.isEmpty() || userVector.stream().allMatch(v -> v == 0.0f)) {
                log.debug("User {} has no valid vector, fallback to recent videos", userId);
                return fallbackRecallFromDB(size);
            }
            
            // 向量检索
            List<Long> videoIds = milvusService.searchSimilarVideos(userVector, size);
            
            if (videoIds.isEmpty()) {
                log.debug("Vector recall returned no results, fallback to recent videos");
                return fallbackRecallFromDB(size);
            }

            List<Video> videos = videoService.listByIds(videoIds);
            
            return videos.stream()
                .map(video -> new RecallCandidate(video, 50.0, "vector"))
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error recalling by vector", e);
            return fallbackRecallFromDB(size);
        }
    }

    /**
     * 兜底：从数据库召回
     */
    private List<RecallCandidate> fallbackRecallFromDB(int size) {
        List<Video> videos = videoService.list(
            new LambdaQueryWrapper<Video>()
                .eq(Video::getStatus, VideoStatus.PUBLISHED)
                .orderByDesc(Video::getCreatedAt)
                .last("LIMIT " + size)
        );

        return videos.stream()
            .map(video -> new RecallCandidate(video, 10.0, "fallback"))
            .collect(Collectors.toList());
    }

    /**
     * 去重：过滤用户已看视频
     */
    private List<RecallCandidate> deduplicateByUserSeen(Long userId, List<RecallCandidate> candidates) {
        try {
            String seenKey = USER_SEEN_KEY_PREFIX + userId;
            Set<Object> seenIds = redisTemplate.opsForSet().members(seenKey);
            
            if (seenIds == null || seenIds.isEmpty()) {
                return candidates;
            }

            Set<Long> seenVideoIds = seenIds.stream()
                .map(id -> Long.parseLong(id.toString()))
                .collect(Collectors.toSet());

            return candidates.stream()
                .filter(candidate -> !seenVideoIds.contains(candidate.getVideo().getId()))
                .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error deduplicating by user seen", e);
            return candidates;
        }
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

