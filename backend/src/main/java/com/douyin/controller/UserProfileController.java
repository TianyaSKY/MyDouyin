package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.entity.UserProfile;
import com.douyin.service.UserFollowService;
import com.douyin.service.UserProfileService;
import com.douyin.service.security.JwtUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final UserFollowService userFollowService;

    /**
     * GET /api/users/{id} - Get user by ID (requires auth)
     */
    @GetMapping("/{id}")
    public Result<UserProfile> getById(@PathVariable Long id) {
        UserProfile user = userProfileService.getById(id);
        return user != null ? Result.ok(user) : Result.fail(404, "User not found");
    }

    /**
     * GET /api/users/username/{username} - Get user by username (requires auth)
     */
    @GetMapping("/username/{username}")
    public Result<UserProfile> getByUsername(@PathVariable String username) {
        UserProfile user = userProfileService.getByUsername(username);
        return user != null ? Result.ok(user) : Result.fail(404, "User not found");
    }

    /**
     * GET /api/users - Get all users (requires auth)
     */
    @GetMapping
    public Result<List<UserProfile>> list() {
        return Result.ok(userProfileService.list());
    }

    /**
     * PUT /api/users/{id} - Update user (requires auth)
     */
    @PutMapping("/{id}")
    public Result<UserProfile> update(@PathVariable Long id, @Valid @RequestBody UserProfile user) {
        user.setUserId(id);
        // Prevent password overwrite through this endpoint
        user.setPassword(null);
        boolean updated = userProfileService.updateById(user);
        return updated ? Result.ok(user) : Result.fail(404, "User not found");
    }

    /**
     * DELETE /api/users/{id} - Delete user (requires auth)
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        boolean removed = userProfileService.removeById(id);
        return removed ? Result.ok() : Result.fail(404, "User not found");
    }

    /**
     * POST /api/users/{id}/follow - Follow a user.
     */
    @PostMapping("/{id}/follow")
    public Result<FollowStatusResponse> follow(
            @AuthenticationPrincipal JwtUserDetails userDetails,
            @PathVariable Long id) {
        if (userProfileService.getById(id) == null) {
            return Result.fail(404, "User not found");
        }

        userFollowService.follow(userDetails.getUserId(), id);
        return Result.ok(buildFollowStatus(userDetails.getUserId(), id));
    }

    /**
     * DELETE /api/users/{id}/follow - Unfollow a user.
     */
    @DeleteMapping("/{id}/follow")
    public Result<FollowStatusResponse> unfollow(
            @AuthenticationPrincipal JwtUserDetails userDetails,
            @PathVariable Long id) {
        if (userProfileService.getById(id) == null) {
            return Result.fail(404, "User not found");
        }

        userFollowService.unfollow(userDetails.getUserId(), id);
        return Result.ok(buildFollowStatus(userDetails.getUserId(), id));
    }

    /**
     * GET /api/users/{id}/follow - Get current user's follow status for a user.
     */
    @GetMapping("/{id}/follow")
    public Result<FollowStatusResponse> getFollowStatus(
            @AuthenticationPrincipal JwtUserDetails userDetails,
            @PathVariable Long id) {
        if (userProfileService.getById(id) == null) {
            return Result.fail(404, "User not found");
        }

        return Result.ok(buildFollowStatus(userDetails.getUserId(), id));
    }

    /**
     * GET /api/users/{id}/following - Get list of users the target user is following.
     */
    @GetMapping("/{id}/following")
    public Result<List<UserProfile>> getFollowing(@PathVariable Long id) {
        if (userProfileService.getById(id) == null) {
            return Result.fail(404, "User not found");
        }
        List<Long> followingIds = userFollowService.getFollowingIds(id);
        if (followingIds.isEmpty()) {
            return Result.ok(java.util.Collections.emptyList());
        }
        return Result.ok(userProfileService.listByIds(followingIds));
    }

    /**
     * GET /api/users/{id}/followers - Get list of users following the target user.
     */
    @GetMapping("/{id}/followers")
    public Result<List<UserProfile>> getFollowers(@PathVariable Long id) {
        if (userProfileService.getById(id) == null) {
            return Result.fail(404, "User not found");
        }
        List<Long> followerIds = userFollowService.getFollowerIds(id);
        if (followerIds.isEmpty()) {
            return Result.ok(java.util.Collections.emptyList());
        }
        return Result.ok(userProfileService.listByIds(followerIds));
    }

    private final com.douyin.service.VideoStatsDailyService videoStatsDailyService;
    private final com.douyin.service.VideoService videoService;

    /**
     * GET /api/users/{id}/stats - Get user statistics
     */
    @GetMapping("/{id}/stats")
    public Result<UserStatsResponse> getStats(@PathVariable Long id) {
        Long totalLikes = videoStatsDailyService.getTotalLikesByAuthor(id);
        long workCount = videoService.count(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.douyin.entity.Video>()
                .eq(com.douyin.entity.Video::getAuthorId, id));
        
        return Result.ok(new UserStatsResponse(
                totalLikes != null ? totalLikes : 0L,
                workCount,
                userFollowService.countFollowing(id),
                userFollowService.countFollowers(id)
        ));
    }

    private FollowStatusResponse buildFollowStatus(Long currentUserId, Long targetUserId) {
        return new FollowStatusResponse(
                userFollowService.isFollowing(currentUserId, targetUserId),
                userFollowService.countFollowing(targetUserId),
                userFollowService.countFollowers(targetUserId)
        );
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class UserStatsResponse {
        private Long totalLikes;
        private Long workCount;
        private Long followingCount;
        private Long followerCount;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class FollowStatusResponse {
        private Boolean following;
        private Long followingCount;
        private Long followerCount;
    }
}
