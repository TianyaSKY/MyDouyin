package com.douyin.mapper;

import com.douyin.entity.dto.dashboard.*;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 数据大屏专用 Mapper — 聚合查询（只读）。
 */
@Mapper
public interface DashboardMapper {

    // ==================== 全局概览 ====================

    @Select("SELECT COUNT(*) FROM users")
    Long countTotalUsers();

    @Select("SELECT COUNT(*) FROM users WHERE DATE(created_at) = #{date}")
    Long countNewUsersByDate(@Param("date") LocalDate date);

    @Select("SELECT COUNT(*) FROM videos WHERE status = 1")
    Long countPublishedVideos();

    @Select("SELECT COUNT(*) FROM videos WHERE status = 1 AND DATE(created_at) = #{date}")
    Long countNewVideosByDate(@Param("date") LocalDate date);

    @Select("SELECT COALESCE(SUM(click_cnt), 0) FROM video_daily_stats WHERE date = #{date}")
    Long sumPlaysByDate(@Param("date") LocalDate date);

    @Select("SELECT COALESCE(SUM(like_cnt + comment_cnt + share_cnt), 0) FROM video_daily_stats WHERE date = #{date}")
    Long sumInteractionsByDate(@Param("date") LocalDate date);

    @Select("SELECT COALESCE(SUM(like_cnt), 0) FROM video_daily_stats WHERE date = #{date}")
    Long sumLikesByDate(@Param("date") LocalDate date);

    @Select("SELECT COALESCE(SUM(comment_cnt), 0) FROM video_daily_stats WHERE date = #{date}")
    Long sumCommentsByDate(@Param("date") LocalDate date);

    @Select("SELECT COALESCE(SUM(share_cnt), 0) FROM video_daily_stats WHERE date = #{date}")
    Long sumSharesByDate(@Param("date") LocalDate date);

    // ==================== 用户增长趋势 ====================

    @Select("SELECT DATE(created_at) AS date, COUNT(*) AS value " +
            "FROM users " +
            "WHERE created_at >= #{startDate} " +
            "GROUP BY DATE(created_at) " +
            "ORDER BY date")
    List<TrendPointDTO> getUserGrowthTrend(@Param("startDate") LocalDateTime startDate);

    // ==================== DAU 趋势 ====================

    @Select("SELECT DATE(ts) AS date, COUNT(DISTINCT user_id) AS value " +
            "FROM user_events " +
            "WHERE ts >= #{startDate} " +
            "GROUP BY DATE(ts) " +
            "ORDER BY date")
    List<TrendPointDTO> getDauTrend(@Param("startDate") LocalDateTime startDate);

    // ==================== 用户行为分布 ====================

    @Select("SELECT event_type AS eventType, COUNT(*) AS count " +
            "FROM user_events " +
            "WHERE ts >= #{startDate} " +
            "GROUP BY event_type " +
            "ORDER BY count DESC")
    List<EventDistributionDTO> getEventDistribution(@Param("startDate") LocalDateTime startDate);

    // ==================== 活跃用户排行 ====================

    @Select("SELECT e.user_id AS userId, u.nickname, u.avatar_url AS avatarUrl, COUNT(*) AS eventCount " +
            "FROM user_events e " +
            "LEFT JOIN users u ON e.user_id = u.user_id " +
            "WHERE e.ts >= #{startDate} AND e.event_type IN ('click', 'like', 'finish', 'share', 'comment') " +
            "GROUP BY e.user_id, u.nickname, u.avatar_url " +
            "ORDER BY eventCount DESC " +
            "LIMIT #{limit}")
    List<TopUserDTO> getTopActiveUsers(@Param("startDate") LocalDateTime startDate,
                                       @Param("limit") int limit);

    // ==================== 视频发布趋势 ====================

    @Select("SELECT DATE(created_at) AS date, COUNT(*) AS value " +
            "FROM videos " +
            "WHERE status = 1 AND created_at >= #{startDate} " +
            "GROUP BY DATE(created_at) " +
            "ORDER BY date")
    List<TrendPointDTO> getVideoPublishTrend(@Param("startDate") LocalDateTime startDate);

    // ==================== 热门视频排行 ====================

    @Select("SELECT s.video_id AS videoId, v.title, v.cover_url AS coverUrl, " +
            "u.nickname AS authorName, " +
            "SUM(s.click_cnt) AS playCount, SUM(s.like_cnt) AS likeCount, " +
            "SUM(s.comment_cnt) AS commentCount, SUM(s.share_cnt) AS shareCount " +
            "FROM video_daily_stats s " +
            "JOIN videos v ON s.video_id = v.id " +
            "LEFT JOIN users u ON v.author_id = u.user_id " +
            "WHERE v.status = 1 " +
            "GROUP BY s.video_id, v.title, v.cover_url, u.nickname " +
            "ORDER BY playCount DESC " +
            "LIMIT #{limit}")
    List<TopVideoDTO> getTopVideos(@Param("limit") int limit);

    // ==================== 标签云 ====================

    @Select("SELECT vt.tag_name AS tagName, COUNT(DISTINCT vt.video_id) AS videoCount " +
            "FROM video_tags vt " +
            "JOIN videos v ON vt.video_id = v.id " +
            "WHERE v.status = 1 " +
            "GROUP BY vt.tag_name " +
            "ORDER BY videoCount DESC " +
            "LIMIT #{limit}")
    List<TagCloudDTO> getTagCloud(@Param("limit") int limit);

    // ==================== 视频状态分布 ====================

    @Select("SELECT status AS statusCode, COUNT(*) AS count FROM videos GROUP BY status")
    List<VideoStatusDistDTO> getVideoStatusDistribution();

    // ==================== 行为漏斗 ====================

    @Select("SELECT " +
            "COALESCE(SUM(impr_cnt), 0) AS impressions, " +
            "COALESCE(SUM(click_cnt), 0) AS clicks, " +
            "COALESCE(SUM(finish_cnt), 0) AS finishes, " +
            "COALESCE(SUM(like_cnt), 0) AS likes, " +
            "COALESCE(SUM(comment_cnt), 0) AS comments, " +
            "COALESCE(SUM(share_cnt), 0) AS shares, " +
            "COALESCE(SUM(watch_time_sum), 0) AS avgWatchMs " +
            "FROM video_daily_stats " +
            "WHERE date >= #{startDate}")
    FunnelDTO getFunnelRaw(@Param("startDate") LocalDate startDate);

    // ==================== 行为热力图 ====================

    @Select("SELECT (WEEKDAY(ts)) AS dayOfWeek, HOUR(ts) AS hour, COUNT(*) AS count " +
            "FROM user_events " +
            "WHERE ts >= #{startDate} " +
            "GROUP BY dayOfWeek, hour " +
            "ORDER BY dayOfWeek, hour")
    List<HeatmapCellDTO> getEventHeatmap(@Param("startDate") LocalDateTime startDate);

    // ==================== 推荐 CTR 趋势 ====================

    @Select("SELECT DATE(ts) AS date, " +
            "SUM(CASE WHEN event_type = 'impr' THEN 1 ELSE 0 END) AS value " +
            "FROM user_events " +
            "WHERE ts >= #{startDate} AND event_type IN ('impr', 'click') " +
            "GROUP BY DATE(ts) " +
            "ORDER BY date")
    List<TrendPointDTO> getImprTrend(@Param("startDate") LocalDateTime startDate);

    @Select("SELECT DATE(ts) AS date, " +
            "SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) AS value " +
            "FROM user_events " +
            "WHERE ts >= #{startDate} AND event_type IN ('impr', 'click') " +
            "GROUP BY DATE(ts) " +
            "ORDER BY date")
    List<TrendPointDTO> getClickTrend(@Param("startDate") LocalDateTime startDate);

    // ==================== 最近事件 ====================

    @Select("SELECT e.id AS eventId, e.user_id AS userId, u.nickname, " +
            "e.video_id AS videoId, v.title AS videoTitle, " +
            "e.event_type AS eventType, e.ts " +
            "FROM user_events e " +
            "LEFT JOIN users u ON e.user_id = u.user_id " +
            "LEFT JOIN videos v ON e.video_id = v.id " +
            "WHERE e.event_type IN ('like', 'comment', 'share', 'finish') " +
            "ORDER BY e.ts DESC " +
            "LIMIT #{limit}")
    List<RecentEventDTO> getRecentEvents(@Param("limit") int limit);
}
