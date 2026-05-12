package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.UserProfile;
import com.douyin.entity.VideoComment;
import com.douyin.mapper.VideoCommentMapper;
import com.douyin.service.UserProfileService;
import com.douyin.service.VideoCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VideoCommentServiceImpl extends ServiceImpl<VideoCommentMapper, VideoComment>
        implements VideoCommentService {

    private final UserProfileService userProfileService;

    @Override
    public IPage<VideoComment> pageByVideoId(Long videoId, int current, int size) {
        LambdaQueryWrapper<VideoComment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VideoComment::getVideoId, videoId)
                .isNull(VideoComment::getParentId) // top-level comments only
                .eq(VideoComment::getStatus, 1)
                .orderByDesc(VideoComment::getCreatedAt);

        IPage<VideoComment> page = page(new Page<>(current, size), wrapper);
        enrichComments(page.getRecords());

        // Add reply counts
        for (VideoComment comment : page.getRecords()) {
            long replyCount = count(new LambdaQueryWrapper<VideoComment>()
                    .eq(VideoComment::getParentId, comment.getId())
                    .eq(VideoComment::getStatus, 1));
            comment.setReplyCount((int) replyCount);
        }

        return page;
    }

    @Override
    public IPage<VideoComment> pageReplies(Long parentId, int current, int size) {
        LambdaQueryWrapper<VideoComment> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VideoComment::getParentId, parentId)
                .eq(VideoComment::getStatus, 1)
                .orderByAsc(VideoComment::getCreatedAt);

        IPage<VideoComment> page = page(new Page<>(current, size), wrapper);
        enrichComments(page.getRecords());
        return page;
    }

    @Override
    public long countByVideoId(Long videoId) {
        return count(new LambdaQueryWrapper<VideoComment>()
                .eq(VideoComment::getVideoId, videoId)
                .eq(VideoComment::getStatus, 1));
    }

    /**
     * Enrich comment list with user nickname and avatar from UserProfile.
     */
    private void enrichComments(List<VideoComment> comments) {
        if (comments == null || comments.isEmpty()) {
            return;
        }

        Set<Long> userIds = comments.stream()
                .map(VideoComment::getUserId)
                .collect(Collectors.toSet());

        Map<Long, UserProfile> profileMap = userIds.stream()
                .collect(Collectors.toMap(
                        id -> id,
                        id -> {
                            UserProfile profile = userProfileService.getById(id);
                            return profile != null ? profile : new UserProfile();
                        }
                ));

        for (VideoComment comment : comments) {
            UserProfile profile = profileMap.get(comment.getUserId());
            if (profile != null) {
                comment.setNickname(profile.getNickname() != null ? profile.getNickname() : profile.getUsername());
                comment.setAvatarUrl(profile.getAvatarUrl());
            }
        }
    }
}
