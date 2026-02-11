package com.douyin.service;

import com.douyin.enums.EventType;

import java.util.List;

/**
 * 用户向量服务接口
 */
public interface UserEmbeddingService {

    /**
     * 获取用户实时向量（短期兴趣）
     * 优先从 Redis 获取，不存在则计算
     * 
     * @param userId 用户ID
     * @return 用户向量
     */
    List<Float> getUserRealtimeVector(Long userId);

    /**
     * 获取用户长期向量
     * 从 MySQL UserProfile 获取
     * 
     * @param userId 用户ID
     * @return 用户向量
     */
    List<Double> getUserLongTermVector(Long userId);

    /**
     * 根据用户行为更新实时向量
     * 
     * @param userId 用户ID
     * @param videoId 视频ID
     * @param eventType 事件类型
     */
    void updateRealtimeVector(Long userId, Long videoId, EventType eventType);

    /**
     * 计算用户实时向量
     * 基于最近 N 个交互视频的向量加权平均
     * 
     * @param userId 用户ID
     * @return 用户向量
     */
    List<Float> calculateRealtimeVector(Long userId);

    /**
     * 更新用户长期向量（离线任务）
     * 通过深度学习模型训练得到
     * 
     * @param userId 用户ID
     * @param vector 新的长期向量
     */
    void updateLongTermVector(Long userId, List<Double> vector);

    /**
     * 融合短期和长期向量
     * 
     * @param userId 用户ID
     * @param shortTermWeight 短期向量权重（0-1）
     * @return 融合后的向量
     */
    List<Float> getFusedVector(Long userId, double shortTermWeight);
}

