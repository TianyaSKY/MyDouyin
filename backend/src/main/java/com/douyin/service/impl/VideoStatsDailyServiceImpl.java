package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.entity.enums.EventType;
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

    @Override
    public void incrementStats(Long videoId, EventType eventType, int watchMs) {
        if (videoId == null || eventType == null) {
            return;
        }
        LocalDate today = LocalDate.now();

        long impr = eventType == EventType.IMPR ? 1 : 0;
        long click = eventType == EventType.CLICK ? 1 : 0;
        long like = eventType == EventType.LIKE ? 1 : 0;
        long finish = eventType == EventType.FINISH ? 1 : 0;
        long share = eventType == EventType.SHARE ? 1 : 0;

        baseMapper.upsertStats(videoId, today, impr, click, like, finish, share, watchMs);
    }

    @Override
    public Long getTotalLikesByAuthor(Long authorId) {
        return baseMapper.sumLikesByAuthorId(authorId);
    }

    @Override
    public VideoStatsDaily getTotalStatsByVideo(Long videoId) {
        return baseMapper.sumStatsByVideoId(videoId);
    }
}
