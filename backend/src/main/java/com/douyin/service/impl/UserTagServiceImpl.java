package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.entity.UserProfile;
import com.douyin.entity.Video;
import com.douyin.enums.EventType;
import com.douyin.service.UserProfileService;
import com.douyin.service.UserTagService;
import com.douyin.service.VideoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 用户标签服务实现
 * 
 * @deprecated 用户兴趣已改用向量存储，此服务已废弃
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Deprecated
public class UserTagServiceImpl implements UserTagService {

    private final UserProfileService userProfileService;
    private final VideoService videoService;

    /**
     * 用户标签服务已废弃，改用向量存储
     * 保留此方法用于向后兼容，实际不再更新标签
     * 
     * @deprecated 使用 UserEmbeddingService.updateRealtimeVector 替代
     */
    @Override
    @Transactional
    @Deprecated
    public void updateUserTagsByEvent(Long userId, Long videoId, EventType eventType) {
        log.debug("updateUserTagsByEvent is deprecated, use UserEmbeddingService instead");
        // 不再更新标签，向量更新由 UserEmbeddingService 处理
    }

    /**
     * 获取用户兴趣标签（已废弃）
     * 
     * @deprecated 用户兴趣已改用向量存储，此方法返回空
     */
    @Override
    @Deprecated
    public Map<String, Double> getUserTopTags(Long userId, int topN) {
        log.debug("getUserTopTags is deprecated, user interests are now stored as vectors");
        return new HashMap<>();
    }

    /**
     * 标签衰减已废弃（改用向量存储）
     * 
     * @deprecated 向量衰减由离线任务处理
     */
    @Override
    @Transactional
    @Deprecated
    public void decayUserTags(Long userId, double decayFactor) {
        log.debug("decayUserTags is deprecated, vector decay is handled by offline tasks");
        // 不再处理标签衰减
    }
}

