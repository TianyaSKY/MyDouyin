package com.douyin.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.entity.enums.EventType;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;

public interface VideoStatsDailyService extends IService<VideoStatsDaily> {

    /**
     * Get stats for a video within a date range.
     */
    List<VideoStatsDaily> getStatsByDateRange(Long videoId, LocalDate startDate, LocalDate endDate);

    /**
     * Insert or update stats (upsert).
     */
    boolean saveOrUpdateStats(VideoStatsDaily stats);
    /**
     * Increment stats counters for a video on the current date.
     * @param videoId the video ID
     * @param eventType the type of event (impr, click, like, finish)
     * @param watchMs watch time in milliseconds (to add to sum)
     */
    void incrementStats(Long videoId, EventType eventType, int watchMs);

    /**
     * Decrement stats counters for a video on the current date (e.g. unlike).
     * Counters are clamped at 0 to tolerate out-of-order async increments.
     * @param videoId the video ID
     * @param eventType the type of event (impr, click, like, finish)
     */
    void decrementStats(Long videoId, EventType eventType);

    Long getTotalLikesByAuthor(Long authorId);

    VideoStatsDaily getTotalStatsByVideo(Long videoId);

    /**
     * 批量获取每个视频的最新一天统计，返回 videoId -> stats 映射。
     */
    Map<Long, VideoStatsDaily> batchGetLatestStatsMap(Collection<Long> videoIds);
}
