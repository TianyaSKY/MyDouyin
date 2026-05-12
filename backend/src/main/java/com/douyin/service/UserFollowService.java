package com.douyin.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.UserFollow;

public interface UserFollowService extends IService<UserFollow> {

    boolean follow(Long followerId, Long followingId);

    boolean unfollow(Long followerId, Long followingId);

    boolean isFollowing(Long followerId, Long followingId);

    long countFollowing(Long userId);

    long countFollowers(Long userId);

    java.util.List<Long> getFollowingIds(Long userId);

    java.util.List<Long> getFollowerIds(Long userId);
}
