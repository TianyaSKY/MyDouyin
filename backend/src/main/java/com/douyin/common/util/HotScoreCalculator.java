package com.douyin.common.util;

import com.douyin.entity.Video;
import com.douyin.entity.VideoStatsDaily;

/**
 * 热度分计算工具，供 FeedService 和 HotVideoScheduler 共用。
 */
public final class HotScoreCalculator {

    private HotScoreCalculator() {
    }

    /**
     * 计算视频热度分（纯统计维度，不含时间衰减）。
     * 公式：点赞×2 + 完播×3 + 分享×5
     */
    public static double calculateBaseScore(VideoStatsDaily stats) {
        if (stats == null) {
            return 0.0;
        }
        return (stats.getLikeCnt() != null ? stats.getLikeCnt() * 2.0 : 0)
             + (stats.getFinishCnt() != null ? stats.getFinishCnt() * 3.0 : 0)
             + (stats.getShareCnt() != null ? stats.getShareCnt() * 5.0 : 0);
    }

    /**
     * 计算带时间衰减的热度分（用于热门池排序）。
     * 每小时衰减 0.1 分。
     */
    public static double calculateWithTimeDecay(Video video, VideoStatsDaily stats) {
        double baseScore = calculateBaseScore(stats);
        if (video == null || video.getCreatedAt() == null) {
            return baseScore;
        }
        long hoursAgo = java.time.Duration.between(
            video.getCreatedAt(),
            java.time.LocalDateTime.now()
        ).toHours();
        double timeDecay = hoursAgo * 0.1;
        return Math.max(0, baseScore - timeDecay);
    }
}
