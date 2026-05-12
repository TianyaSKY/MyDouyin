package com.douyin.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.VideoComment;

public interface VideoCommentService extends IService<VideoComment> {

    /**
     * Get paginated comments for a video (top-level only).
     */
    IPage<VideoComment> pageByVideoId(Long videoId, int current, int size);

    /**
     * Get paginated replies for a parent comment.
     */
    IPage<VideoComment> pageReplies(Long parentId, int current, int size);

    /**
     * Count comments (active) for a video.
     */
    long countByVideoId(Long videoId);
}
