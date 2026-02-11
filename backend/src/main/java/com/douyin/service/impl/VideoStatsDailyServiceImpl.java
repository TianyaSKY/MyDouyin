package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.enums.EventType;
import com.douyin.mapper.VideoStatsDailyMapper;
import com.douyin.service.VideoStatsDailyService;
import org.springframework.dao.DuplicateKeyException;
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
        LocalDate today = LocalDate.now();

        // 1. Try to update first (optimistic)
        LambdaUpdateWrapper<VideoStatsDaily> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(VideoStatsDaily::getVideoId, videoId)
                .eq(VideoStatsDaily::getDate, today);

        // Build dynamic SQL
        StringBuilder sql = new StringBuilder();
        boolean hasUpdate = false;

        if (eventType == EventType.IMPR) {
            sql.append("impr_cnt = impr_cnt + 1");
            hasUpdate = true;
        } else if (eventType == EventType.CLICK) {
            sql.append("click_cnt = click_cnt + 1");
            hasUpdate = true;
        } else if (eventType == EventType.LIKE) {
            sql.append("like_cnt = like_cnt + 1");
            hasUpdate = true;
        } else if (eventType == EventType.FINISH) {
            sql.append("finish_cnt = finish_cnt + 1");
            hasUpdate = true;
        } else if (eventType == EventType.SHARE) {
            sql.append("share_cnt = share_cnt + 1");
            hasUpdate = true;
        }

        if (watchMs > 0) {
            if (hasUpdate) {
                sql.append(", ");
            }
            sql.append("watch_time_sum = watch_time_sum + ").append(watchMs);
            hasUpdate = true;
        }

        if (!hasUpdate) {
            // Nothing to update (e.g. share event with 0 watch time)
            return;
        }

        updateWrapper.setSql(sql.toString());
        boolean success = update(updateWrapper);

        // 2. If update fails (row doesn't exist), insert new row
        if (!success) {
            VideoStatsDaily newStats = new VideoStatsDaily();
            newStats.setVideoId(videoId);
            newStats.setDate(today);
            newStats.setWatchTimeSum((long) watchMs);
            newStats.setImprCnt(0);
            newStats.setClickCnt(0);
            newStats.setLikeCnt(0);
            newStats.setFinishCnt(0);
            newStats.setShareCnt(0);

            if (eventType == EventType.IMPR) newStats.setImprCnt(1);
            else if (eventType == EventType.CLICK) newStats.setClickCnt(1);
            else if (eventType == EventType.LIKE) newStats.setLikeCnt(1);
            else if (eventType == EventType.FINISH) newStats.setFinishCnt(1);
            else if (eventType == EventType.SHARE) newStats.setShareCnt(1);

            try {
                save(newStats);
            } catch (DuplicateKeyException e) {
                // If insert fails due to race condition, retry update
                update(updateWrapper);
            }
        }
    }
}
