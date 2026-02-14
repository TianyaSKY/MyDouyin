package com.douyin.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.UserVideoAction;

public interface UserVideoActionService extends IService<UserVideoAction> {

    /**
     * Activate like status. Returns true only when state changes to liked.
     */
    boolean likeVideo(Long userId, Long videoId);

    /**
     * Deactivate like status. Returns true only when state changes to unliked.
     */
    boolean unlikeVideo(Long userId, Long videoId);
}
