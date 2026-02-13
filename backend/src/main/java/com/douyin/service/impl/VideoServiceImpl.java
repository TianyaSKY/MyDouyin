package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.Video;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.mapper.VideoMapper;
import com.douyin.service.VideoService;
import org.springframework.stereotype.Service;

@Service
@lombok.RequiredArgsConstructor
public class VideoServiceImpl extends ServiceImpl<VideoMapper, Video>
        implements VideoService {

    private final com.douyin.service.VideoStatsDailyService videoStatsDailyService;

    @Override
    public IPage<Video> pageByStatus(VideoStatus status, int current, int size) {
        IPage<Video> page = page(new Page<>(current, size),
                new LambdaQueryWrapper<Video>()
                        .eq(Video::getStatus, status)
                        .orderByDesc(Video::getCreatedAt));
        populateStats(page);
        return page;
    }

    @Override
    public IPage<Video> pageByAuthor(Long authorId, int current, int size) {
        IPage<Video> page = page(new Page<>(current, size),
                new LambdaQueryWrapper<Video>()
                        .eq(Video::getAuthorId, authorId)
                        .orderByDesc(Video::getCreatedAt));
        populateStats(page);
        return page;
    }

    private void populateStats(IPage<Video> page) {
        if (page.getRecords() != null) {
            for (Video video : page.getRecords()) {
                com.douyin.entity.VideoStatsDaily stats = videoStatsDailyService.getTotalStatsByVideo(video.getId());
                if (stats != null) {
                    video.setLikeCount(stats.getLikeCnt());
                    video.setViewCount(stats.getImprCnt());
                } else {
                    video.setLikeCount(0L);
                    video.setViewCount(0L);
                }
            }
        }
    }
}
