package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.Video;
import com.douyin.enums.VideoStatus;
import com.douyin.mapper.VideoMapper;
import com.douyin.service.VideoService;
import org.springframework.stereotype.Service;

@Service
public class VideoServiceImpl extends ServiceImpl<VideoMapper, Video>
        implements VideoService {

    @Override
    public IPage<Video> pageByStatus(VideoStatus status, int current, int size) {
        return page(new Page<>(current, size),
                new LambdaQueryWrapper<Video>()
                        .eq(Video::getStatus, status)
                        .orderByDesc(Video::getCreatedAt));
    }

    @Override
    public IPage<Video> pageByAuthor(Long authorId, int current, int size) {
        return page(new Page<>(current, size),
                new LambdaQueryWrapper<Video>()
                        .eq(Video::getAuthorId, authorId)
                        .orderByDesc(Video::getCreatedAt));
    }
}
