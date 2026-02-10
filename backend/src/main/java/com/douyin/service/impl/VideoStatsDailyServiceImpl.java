package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.mapper.VideoStatsDailyMapper;
import com.douyin.service.VideoStatsDailyService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class VideoStatsDailyServiceImpl extends ServiceImpl<VideoStatsDailyMapper, VideoStatsDaily>
        implements VideoStatsDailyService {

    @Override
    public List<VideoStatsDaily> getStatsByDateRange(Long videoId, LocalDate startDate, LocalDate endDate) {
        return baseMapper.selectByVideoIdAndDateRange(videoId, startDate, endDate);
    }

    @Override
    public boolean saveOrUpdateStats(VideoStatsDaily stats) {
        // Check if a record already exists for the same video_id + date
        VideoStatsDaily existing = getOne(new LambdaQueryWrapper<VideoStatsDaily>()
                .eq(VideoStatsDaily::getVideoId, stats.getVideoId())
                .eq(VideoStatsDaily::getDate, stats.getDate()));
        if (existing != null) {
            // Update existing counters
            return update(stats, new LambdaQueryWrapper<VideoStatsDaily>()
                    .eq(VideoStatsDaily::getVideoId, stats.getVideoId())
                    .eq(VideoStatsDaily::getDate, stats.getDate()));
        }
        return save(stats);
    }
}
