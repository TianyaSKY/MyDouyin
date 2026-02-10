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
}
