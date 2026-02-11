package com.douyin.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.VideoStatsDaily;

import java.time.LocalDate;
import java.util.List;

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
    void incrementStats(Long videoId, com.douyin.enums.EventType eventType, int watchMs);
}
