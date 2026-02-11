package com.douyin.service;

import com.douyin.dto.FeedResponse;

/**
 * Feed 推荐服务接口
 */
public interface IFeedService {

    /**
     * 生成个性化推荐 Feed 流
     * @param userId 用户ID
     * @param size 返回数量
     * @return Feed 响应
     */
    FeedResponse generateFeed(Long userId, int size);
}

