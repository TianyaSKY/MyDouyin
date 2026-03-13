package com.douyin.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.Video;
import com.douyin.entity.enums.VideoStatus;

import java.util.List;

public interface VideoService extends IService<Video> {

    /**
     * Get paginated video list by status.
     */
    IPage<Video> pageByStatus(VideoStatus status, int current, int size);

    /**
     * Get paginated video list by author.
     */
    IPage<Video> pageByAuthor(Long authorId, int current, int size);

    /**
     * Get Videos from admin's published videos
     */
    List<Video> listByAdminPublish();

    /**
     * Get Tags from admin's published videos
     */
    List<String> tagsByAdminPublish();

    /**
     * Calculate the Average Vector Info
     */
    List<Float> averageVectorInfoByTags(List<String> tags);
}
