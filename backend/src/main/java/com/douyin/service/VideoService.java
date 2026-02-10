package com.douyin.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.Video;
import com.douyin.enums.VideoStatus;

public interface VideoService extends IService<Video> {

    /**
     * Get paginated video list by status.
     */
    IPage<Video> pageByStatus(VideoStatus status, int current, int size);

    /**
     * Get paginated video list by author.
     */
    IPage<Video> pageByAuthor(Long authorId, int current, int size);
}
