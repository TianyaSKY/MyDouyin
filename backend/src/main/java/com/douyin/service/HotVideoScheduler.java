package com.douyin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.entity.Video;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.entity.enums.VideoStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

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

            int updatedCount = 0;
            LocalDate today = LocalDate.now();

            for (Video video : publishedVideos) {
                // 获取最近的统计数据
                VideoStatsDaily stats = videoStatsDailyService.getOne(
                    new LambdaQueryWrapper<VideoStatsDaily>()
                        .eq(VideoStatsDaily::getVideoId, video.getId())
                        .orderByDesc(VideoStatsDaily::getDate)
                        .last("LIMIT 1")
                );

                double score = calculateHotScore(video, stats);
                
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
     * 计算热度分
     * 公式：点赞*2 + 完播*3 + 分享*5 - 时间衰减
     */
    private double calculateHotScore(Video video, VideoStatsDaily stats) {
        double baseScore = 0.0;

        if (stats != null) {
            baseScore = stats.getLikeCnt() * 2.0
                      + stats.getFinishCnt() * 3.0
                      + (stats.getShareCnt() != null ? stats.getShareCnt() * 5.0 : 0);
        }

        // 时间衰减：每小时衰减 0.1 分
        long hoursAgo = java.time.Duration.between(
            video.getCreatedAt(),
            java.time.LocalDateTime.now()
        ).toHours();
        
        double timeDecay = hoursAgo * 0.1;

        return Math.max(0, baseScore - timeDecay);
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

