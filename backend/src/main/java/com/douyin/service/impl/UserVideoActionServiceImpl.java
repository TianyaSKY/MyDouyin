package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.UserVideoAction;
import com.douyin.entity.enums.UserVideoActionType;
import com.douyin.mapper.UserVideoActionMapper;
import com.douyin.service.UserVideoActionService;
import com.douyin.service.VideoStatsDailyService;
import com.douyin.entity.enums.EventType;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserVideoActionServiceImpl extends ServiceImpl<UserVideoActionMapper, UserVideoAction>
        implements UserVideoActionService {

    private final VideoStatsDailyService videoStatsDailyService;

    private static final int STATUS_ACTIVE = 1;
    private static final int STATUS_INACTIVE = 0;

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(cacheNames = "videoLikeCount", key = "#videoId", condition = "#result && #videoId != null")
    public boolean likeVideo(Long userId, Long videoId) {
        UserVideoAction action = getOne(new LambdaQueryWrapper<UserVideoAction>()
                .eq(UserVideoAction::getUserId, userId)
                .eq(UserVideoAction::getVideoId, videoId)
                .eq(UserVideoAction::getActionType, UserVideoActionType.LIKE)
                .last("LIMIT 1"));

        if (action == null) {
            UserVideoAction created = new UserVideoAction();
            created.setUserId(userId);
            created.setVideoId(videoId);
            created.setActionType(UserVideoActionType.LIKE);
            created.setStatus(STATUS_ACTIVE);
            try {
                save(created);
            } catch (DuplicateKeyException e) {
                return false;
            }
            return true;
        }

        if (Integer.valueOf(STATUS_ACTIVE).equals(action.getStatus())) {
            return false;
        }

        action.setStatus(STATUS_ACTIVE);
        updateById(action);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(cacheNames = "videoLikeCount", key = "#videoId", condition = "#result && #videoId != null")
    public boolean unlikeVideo(Long userId, Long videoId) {
        UserVideoAction action = getOne(new LambdaQueryWrapper<UserVideoAction>()
                .eq(UserVideoAction::getUserId, userId)
                .eq(UserVideoAction::getVideoId, videoId)
                .eq(UserVideoAction::getActionType, UserVideoActionType.LIKE)
                .last("LIMIT 1"));

        if (action == null || Integer.valueOf(STATUS_INACTIVE).equals(action.getStatus())) {
            return false;
        }

        action.setStatus(STATUS_INACTIVE);
        updateById(action);
        videoStatsDailyService.decrementStats(videoId, EventType.LIKE);
        return true;
    }

    @Override
    @Cacheable(cacheNames = "videoLikeCount", key = "#videoId", condition = "#videoId != null")
    public long countActiveLikes(Long videoId) {
        if (videoId == null) {
            return 0L;
        }
        return count(new LambdaQueryWrapper<UserVideoAction>()
                .eq(UserVideoAction::getVideoId, videoId)
                .eq(UserVideoAction::getActionType, UserVideoActionType.LIKE)
                .eq(UserVideoAction::getStatus, STATUS_ACTIVE));
    }

    @Override
    public boolean isVideoLikedByUser(Long userId, Long videoId) {
        if (userId == null || videoId == null) {
            return false;
        }
        return count(new LambdaQueryWrapper<UserVideoAction>()
                .eq(UserVideoAction::getUserId, userId)
                .eq(UserVideoAction::getVideoId, videoId)
                .eq(UserVideoAction::getActionType, UserVideoActionType.LIKE)
                .eq(UserVideoAction::getStatus, STATUS_ACTIVE)) > 0;
    }

    @Override
    public IPage<Long> getLikedVideoIds(Long userId, int current, int size) {
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<UserVideoAction> page =
                new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(current, size);

        IPage<UserVideoAction> actionPage = page(page, new LambdaQueryWrapper<UserVideoAction>()
                .eq(UserVideoAction::getUserId, userId)
                .eq(UserVideoAction::getActionType, UserVideoActionType.LIKE)
                .eq(UserVideoAction::getStatus, STATUS_ACTIVE)
                .orderByDesc(UserVideoAction::getUpdatedAt));

        // Convert IPage<UserVideoAction> to IPage<Long> containing video IDs
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Long> resultPage =
                new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(
                        actionPage.getCurrent(), actionPage.getSize(), actionPage.getTotal());
        resultPage.setRecords(actionPage.getRecords().stream()
                .map(UserVideoAction::getVideoId)
                .collect(java.util.stream.Collectors.toList()));
        return resultPage;
    }
}
