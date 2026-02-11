package com.douyin.service;

import java.util.List;

/**
 * Milvus 向量检索服务接口
 */
public interface IMilvusService {

    /**
     * 向量召回：根据用户兴趣向量查询相似视频
     * @param userVector 用户兴趣向量
     * @param topK 返回 Top K 个结果
     * @return 视频ID列表
     */
    List<Long> searchSimilarVideos(List<Float> userVector, int topK);

    /**
     * 获取用户短期兴趣向量
     * @param userId 用户ID
     * @return 用户兴趣向量
     */
    List<Float> getUserVector(Long userId);
}

