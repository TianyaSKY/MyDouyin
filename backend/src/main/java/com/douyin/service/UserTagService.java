package com.douyin.service;

import com.douyin.enums.EventType;

import java.util.Map;

/**
 * 用户标签服务接口
 * 
 * @deprecated 用户兴趣已改用向量存储，此服务已废弃
 * 使用 UserEmbeddingService 替代
 */
@Deprecated
public interface UserTagService {

    /**
     * 根据用户行为更新用户兴趣标签
     * 
     * @deprecated 使用 UserEmbeddingService.updateRealtimeVector 替代
     */
    @Deprecated
    void updateUserTagsByEvent(Long userId, Long videoId, EventType eventType);

    /**
     * 获取用户兴趣标签（按权重排序）
     * 
     * @deprecated 用户兴趣已改用向量存储
     */
    @Deprecated
    Map<String, Double> getUserTopTags(Long userId, int topN);

    /**
     * 衰减用户标签权重（定时任务调用）
     * 
     * @deprecated 向量衰减由离线任务处理
     */
    @Deprecated
    void decayUserTags(Long userId, double decayFactor);
}

