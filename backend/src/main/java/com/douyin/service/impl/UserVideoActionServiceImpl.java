package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.UserVideoAction;
import com.douyin.entity.enums.UserVideoActionType;
import com.douyin.mapper.UserVideoActionMapper;
import com.douyin.service.UserVideoActionService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserVideoActionServiceImpl extends ServiceImpl<UserVideoActionMapper, UserVideoAction>
        implements UserVideoActionService {

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
}
