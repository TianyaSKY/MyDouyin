package com.douyin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.common.util.HotScoreCalculator;
import com.douyin.entity.Video;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.entity.enums.VideoStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HotVideoScheduler {

    private final VideoService videoService;
    private final VideoStatsDailyService videoStatsDailyService;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String HOT_VIDEO_KEY = "video:hot";

    /**
     * 定时更新热门视频池（每5分钟执行一次）
     */
    @Scheduled(fixedRate = 300000) // 5分钟 = 300000ms
    public void updateHotVideoPool() {
        log.info("Starting hot video pool update...");

        try {
            // 获取所有已发布的视频
            List<Video> publishedVideos = videoService.list(
                new LambdaQueryWrapper<Video>()
                    .eq(Video::getStatus, VideoStatus.PUBLISHED)
            );

            if (publishedVideos.isEmpty()) {
                log.warn("No published videos found");
                return;
            }

            // 批量获取所有视频的最新统计数据（1 次 SQL 替代 N 次）
            List<Long> videoIds = publishedVideos.stream()
                .map(Video::getId)
                .collect(Collectors.toList());
            Map<Long, VideoStatsDaily> statsMap = videoStatsDailyService.batchGetLatestStatsMap(videoIds);

            int updatedCount = 0;
            for (Video video : publishedVideos) {
                VideoStatsDaily stats = statsMap.get(video.getId());
                double score = HotScoreCalculator.calculateWithTimeDecay(video, stats);

                // 更新到 Redis ZSET
                redisTemplate.opsForZSet().add(HOT_VIDEO_KEY, video.getId().toString(), score);
                updatedCount++;
            }

            log.info("Hot video pool updated: {} videos", updatedCount);

            // 只保留 Top 1000
            Long totalSize = redisTemplate.opsForZSet().size(HOT_VIDEO_KEY);
            if (totalSize != null && totalSize > 1000) {
                redisTemplate.opsForZSet().removeRange(HOT_VIDEO_KEY, 0, totalSize - 1001);
                log.info("Trimmed hot pool to top 1000 videos");
            }

        } catch (Exception e) {
            log.error("Error updating hot video pool", e);
        }
    }

    /**
     * 应用启动时初始化热门池
     */
    @Scheduled(initialDelay = 10000, fixedDelay = Long.MAX_VALUE) // 启动10秒后执行一次
    public void initHotVideoPool() {
        log.info("Initializing hot video pool on startup...");
        updateHotVideoPool();
    }
}
