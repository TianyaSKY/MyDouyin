package com.douyin.service;

import com.douyin.enums.EventType;

import java.util.Map;

/**
 * 用户标签服务接口
 */
public interface UserTagService {

    /**
     * 根据用户行为更新用户兴趣标签
     * 
     * @param userId 用户ID
     * @param videoId 视频ID
     * @param eventType 事件类型
     */
    void updateUserTagsByEvent(Long userId, Long videoId, EventType eventType);

    /**
     * 获取用户兴趣标签（按权重排序）
     * 
     * @param userId 用户ID
     * @param topN 返回前N个标签
     * @return 标签及权重映射
     */
    Map<String, Double> getUserTopTags(Long userId, int topN);

    /**
     * 衰减用户标签权重（定时任务调用）
     * 
     * @param userId 用户ID
     * @param decayFactor 衰减因子（0-1之间，如0.95表示衰减5%）
     */
    void decayUserTags(Long userId, double decayFactor);
}

