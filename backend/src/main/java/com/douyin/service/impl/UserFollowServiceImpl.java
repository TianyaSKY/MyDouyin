package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.common.BusinessException;
import com.douyin.entity.UserFollow;
import com.douyin.mapper.UserFollowMapper;
import com.douyin.service.UserFollowService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserFollowServiceImpl extends ServiceImpl<UserFollowMapper, UserFollow>
        implements UserFollowService {

    private static final int STATUS_ACTIVE = 1;
    private static final int STATUS_INACTIVE = 0;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean follow(Long followerId, Long followingId) {
        validateUsers(followerId, followingId);

        UserFollow relation = getRelation(followerId, followingId);
        if (relation == null) {
            UserFollow created = new UserFollow();
            created.setFollowerId(followerId);
            created.setFollowingId(followingId);
            created.setStatus(STATUS_ACTIVE);
            try {
                save(created);
            } catch (DuplicateKeyException e) {
                return false;
            }
            return true;
        }

        if (Integer.valueOf(STATUS_ACTIVE).equals(relation.getStatus())) {
            return false;
        }

        relation.setStatus(STATUS_ACTIVE);
        updateById(relation);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean unfollow(Long followerId, Long followingId) {
        validateUsers(followerId, followingId);

        UserFollow relation = getRelation(followerId, followingId);
        if (relation == null || Integer.valueOf(STATUS_INACTIVE).equals(relation.getStatus())) {
            return false;
        }

        relation.setStatus(STATUS_INACTIVE);
        updateById(relation);
        return true;
    }

    @Override
    public boolean isFollowing(Long followerId, Long followingId) {
        if (followerId == null || followingId == null) {
            return false;
        }
        return count(new LambdaQueryWrapper<UserFollow>()
                .eq(UserFollow::getFollowerId, followerId)
                .eq(UserFollow::getFollowingId, followingId)
                .eq(UserFollow::getStatus, STATUS_ACTIVE)) > 0;
    }

    @Override
    public long countFollowing(Long userId) {
        if (userId == null) {
            return 0L;
        }
        return count(new LambdaQueryWrapper<UserFollow>()
                .eq(UserFollow::getFollowerId, userId)
                .eq(UserFollow::getStatus, STATUS_ACTIVE));
    }

    @Override
    public long countFollowers(Long userId) {
        if (userId == null) {
            return 0L;
        }
        return count(new LambdaQueryWrapper<UserFollow>()
                .eq(UserFollow::getFollowingId, userId)
                .eq(UserFollow::getStatus, STATUS_ACTIVE));
    }

    @Override
    public java.util.List<Long> getFollowingIds(Long userId) {
        if (userId == null) {
            return java.util.Collections.emptyList();
        }
        return list(new LambdaQueryWrapper<UserFollow>()
                .eq(UserFollow::getFollowerId, userId)
                .eq(UserFollow::getStatus, STATUS_ACTIVE))
                .stream()
                .map(UserFollow::getFollowingId)
                .collect(java.util.stream.Collectors.toList());
    }

    @Override
    public java.util.List<Long> getFollowerIds(Long userId) {
        if (userId == null) {
            return java.util.Collections.emptyList();
        }
        return list(new LambdaQueryWrapper<UserFollow>()
                .eq(UserFollow::getFollowingId, userId)
                .eq(UserFollow::getStatus, STATUS_ACTIVE))
                .stream()
                .map(UserFollow::getFollowerId)
                .collect(java.util.stream.Collectors.toList());
    }

    private UserFollow getRelation(Long followerId, Long followingId) {
        return getOne(new LambdaQueryWrapper<UserFollow>()
                .eq(UserFollow::getFollowerId, followerId)
                .eq(UserFollow::getFollowingId, followingId)
                .last("LIMIT 1"));
    }

    private void validateUsers(Long followerId, Long followingId) {
        if (followerId == null || followingId == null) {
            throw new BusinessException(400, "用户不能为空");
        }
        if (followerId.equals(followingId)) {
            throw new BusinessException(400, "不能关注自己");
        }
    }
}
