package com.douyin.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.UserVideoAction;

import java.util.List;

public interface UserVideoActionService extends IService<UserVideoAction> {

    /**
     * Activate like status. Returns true only when state changes to liked.
     */
    boolean likeVideo(Long userId, Long videoId);

    /**
     * Deactivate like status. Returns true only when state changes to unliked.
     */
    boolean unlikeVideo(Long userId, Long videoId);

    /**
     * Count active likes for a video.
     */
    long countActiveLikes(Long videoId);

    /**
     * Whether a user has liked a video.
     */
    boolean isVideoLikedByUser(Long userId, Long videoId);

    /**
     * Get paginated list of video IDs liked by a user, ordered by most recent.
     */
    IPage<Long> getLikedVideoIds(Long userId, int current, int size);
}
