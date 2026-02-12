package com.douyin.util;

import com.douyin.entity.UserEvent;
import com.douyin.entity.UserProfile;
import com.douyin.entity.Video;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.enums.EventType;
import com.douyin.enums.VideoStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 测试数据工厂
 * 用于快速创建测试所需的实体对象
 */
public class TestDataFactory {

    /**
     * 创建测试用户
     */
    public static UserProfile createTestUser(Long userId, String username) {
        UserProfile user = new UserProfile();
        user.setUserId(userId);
        user.setUsername(username);
        user.setPassword("encodedPassword123");
        user.setNickname("测试用户" + userId);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }

    /**
     * 创建默认测试用户
     */
    public static UserProfile createTestUser() {
        return createTestUser(1L, "testuser");
    }

    /**
     * 创建测试视频
     */
    public static Video createTestVideo(Long videoId, Long authorId, VideoStatus status) {
        Video video = new Video();
        video.setId(videoId);
        video.setAuthorId(authorId);
        video.setTitle("测试视频" + videoId);
        video.setVideoUrl("https://example.com/video/" + videoId + ".mp4");
        video.setCoverUrl("https://example.com/cover/" + videoId + ".jpg");
        video.setStatus(status);
        video.setCreatedAt(LocalDateTime.now());
        return video;
    }

    /**
     * 创建已发布的测试视频
     */
    public static Video createPublishedVideo(Long videoId, Long authorId) {
        return createTestVideo(videoId, authorId, VideoStatus.PUBLISHED);
    }

    /**
     * 创建默认测试视频
     */
    public static Video createTestVideo() {
        return createPublishedVideo(1L, 100L);
    }

    /**
     * 创建用户事件
     */
    public static UserEvent createUserEvent(Long userId, Long videoId, EventType eventType) {
        UserEvent event = new UserEvent();
        event.setUserId(userId);
        event.setVideoId(videoId);
        event.setEventType(eventType);
        event.setTs(LocalDateTime.now());
        return event;
    }

    /**
     * 创建点赞事件
     */
    public static UserEvent createLikeEvent(Long userId, Long videoId) {
        return createUserEvent(userId, videoId, EventType.LIKE);
    }

    /**
     * 创建观看事件
     */
    public static UserEvent createViewEvent(Long userId, Long videoId) {
        return createUserEvent(userId, videoId, EventType.IMPR);
    }

    /**
     * 创建视频统计数据
     */
    public static VideoStatsDaily createVideoStats(Long videoId, LocalDate date) {
        VideoStatsDaily stats = new VideoStatsDaily();
        stats.setVideoId(videoId);
        stats.setDate(date);
        stats.setLikeCnt(100L);
        stats.setShareCnt(20L);
        stats.setFinishCnt(800L);
        return stats;
    }

    /**
     * 创建今日视频统计数据
     */
    public static VideoStatsDaily createTodayVideoStats(Long videoId) {
        return createVideoStats(videoId, LocalDate.now());
    }

    /**
     * 创建高热度视频统计数据
     */
    public static VideoStatsDaily createHotVideoStats(Long videoId) {
        VideoStatsDaily stats = createVideoStats(videoId, LocalDate.now());
        stats.setLikeCnt(2000L);
        stats.setShareCnt(300L);
        stats.setFinishCnt(8000L);
        return stats;
    }
}

