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

    // ==================== 评论与情感分析 ====================

    /** 总评论数（活跃状态） */
    @Select("SELECT COUNT(*) FROM video_comments WHERE status = 1")
    Long countTotalComments();

    /** 今日新增评论数 */
    @Select("SELECT COUNT(*) FROM video_comments WHERE status = 1 AND DATE(created_at) = #{date}")
    Long countTodayComments(@Param("date") LocalDate date);

    /** 已进行情感分析的评论数（ctx 里包含 sentiment_score 的 COMMENT 事件） */
    @Select("SELECT COUNT(*) FROM user_events " +
            "WHERE event_type = 'comment' " +
            "AND JSON_TYPE(JSON_EXTRACT(ctx, '$.sentiment_score')) != 'NULL' " +
            "AND JSON_EXTRACT(ctx, '$.sentiment_score') IS NOT NULL")
    Long countAnalyzedComments();

    /** 正面评论数 (sentiment_score >= 0.6) */
    @Select("SELECT COUNT(*) FROM user_events " +
            "WHERE event_type = 'comment' " +
            "AND JSON_TYPE(JSON_EXTRACT(ctx, '$.sentiment_score')) != 'NULL' " +
            "AND CAST(JSON_EXTRACT(ctx, '$.sentiment_score') AS DECIMAL(10,6)) >= 0.6")
    Long countPositiveComments();

    /** 负面评论数 (sentiment_score < 0.4) */
    @Select("SELECT COUNT(*) FROM user_events " +
            "WHERE event_type = 'comment' " +
            "AND JSON_TYPE(JSON_EXTRACT(ctx, '$.sentiment_score')) != 'NULL' " +
            "AND CAST(JSON_EXTRACT(ctx, '$.sentiment_score') AS DECIMAL(10,6)) < 0.4")
    Long countNegativeComments();

    /** 平均情感分 */
    @Select("SELECT COALESCE(AVG(CAST(JSON_EXTRACT(ctx, '$.sentiment_score') AS DECIMAL(10,6))), 0) " +
            "FROM user_events " +
            "WHERE event_type = 'comment' " +
            "AND JSON_TYPE(JSON_EXTRACT(ctx, '$.sentiment_score')) != 'NULL'")
    Double avgSentimentScore();

    /** 评论用户数 */
    @Select("SELECT COUNT(DISTINCT user_id) FROM video_comments WHERE status = 1")
    Long countCommentUsers();

    /** 被评论视频数 */
    @Select("SELECT COUNT(DISTINCT video_id) FROM video_comments WHERE status = 1")
    Long countCommentedVideos();

    /** 评论趋势（每日评论数） */
    @Select("SELECT DATE(created_at) AS date, COUNT(*) AS count " +
            "FROM video_comments " +
            "WHERE status = 1 AND created_at >= #{startDate} " +
            "GROUP BY DATE(created_at) " +
            "ORDER BY date")
    List<CommentTrendDTO> getCommentTrend(@Param("startDate") LocalDateTime startDate);

    /** 情感分布（正面/中性/负面） */
    @Select("SELECT " +
            "CASE " +
            "  WHEN CAST(JSON_EXTRACT(ctx, '$.sentiment_score') AS DECIMAL(10,6)) >= 0.6 THEN 'positive' " +
            "  WHEN CAST(JSON_EXTRACT(ctx, '$.sentiment_score') AS DECIMAL(10,6)) < 0.4 THEN 'negative' " +
            "  ELSE 'neutral' " +
            "END AS label, " +
            "COUNT(*) AS count " +
            "FROM user_events " +
            "WHERE event_type = 'comment' " +
            "AND JSON_TYPE(JSON_EXTRACT(ctx, '$.sentiment_score')) != 'NULL' " +
            "AND ts >= #{startDate} " +
            "GROUP BY label")
    List<SentimentDistDTO> getSentimentDistribution(@Param("startDate") LocalDateTime startDate);

    /** 每日情感趋势（正面数、负面数、平均分） */
    @Select("SELECT DATE(ts) AS date, " +
            "SUM(CASE WHEN CAST(JSON_EXTRACT(ctx, '$.sentiment_score') AS DECIMAL(10,6)) >= 0.6 THEN 1 ELSE 0 END) AS positive, " +
            "SUM(CASE WHEN CAST(JSON_EXTRACT(ctx, '$.sentiment_score') AS DECIMAL(10,6)) < 0.4 THEN 1 ELSE 0 END) AS negative, " +
            "AVG(CAST(JSON_EXTRACT(ctx, '$.sentiment_score') AS DECIMAL(10,6))) AS avgScore " +
            "FROM user_events " +
            "WHERE event_type = 'comment' " +
            "AND JSON_TYPE(JSON_EXTRACT(ctx, '$.sentiment_score')) != 'NULL' " +
            "AND ts >= #{startDate} " +
            "GROUP BY DATE(ts) " +
            "ORDER BY date")
    List<SentimentTrendDTO> getSentimentTrend(@Param("startDate") LocalDateTime startDate);

    /** 评论最多的视频排行 Top N */
    @Select("SELECT c.video_id AS videoId, v.title, v.cover_url AS coverUrl, " +
            "u.nickname AS authorName, " +
            "COUNT(DISTINCT c.id) AS commentCount, " +
            "AVG(CASE WHEN JSON_TYPE(JSON_EXTRACT(e.ctx, '$.sentiment_score')) != 'NULL' " +
            "    THEN CAST(JSON_EXTRACT(e.ctx, '$.sentiment_score') AS DECIMAL(10,6)) " +
            "    ELSE NULL END) AS avgSentiment " +
            "FROM video_comments c " +
            "JOIN videos v ON c.video_id = v.id " +
            "LEFT JOIN users u ON v.author_id = u.user_id " +
            "LEFT JOIN user_events e ON e.video_id = c.video_id " +
            "AND e.event_type = 'comment' " +
            "WHERE c.status = 1 " +
            "GROUP BY c.video_id, v.title, v.cover_url, u.nickname " +
            "ORDER BY commentCount DESC " +
            "LIMIT #{limit}")
    List<TopCommentedVideoDTO> getTopCommentedVideos(@Param("limit") int limit);

    /** 最新评论列表（含情感数据） */
    @Select("SELECT c.id AS commentId, c.user_id AS userId, u.nickname, u.avatar_url AS avatarUrl, " +
            "c.video_id AS videoId, v.title AS videoTitle, c.content, " +
            "CASE WHEN e.id IS NOT NULL AND JSON_TYPE(JSON_EXTRACT(e.ctx, '$.sentiment_score')) != 'NULL' " +
            "    THEN CAST(JSON_EXTRACT(e.ctx, '$.sentiment_score') AS DECIMAL(10,6)) " +
            "    ELSE NULL END AS sentimentScore, " +
            "CASE WHEN e.id IS NOT NULL AND JSON_TYPE(JSON_EXTRACT(e.ctx, '$.preference_score')) != 'NULL' " +
            "    THEN CAST(JSON_EXTRACT(e.ctx, '$.preference_score') AS DECIMAL(10,6)) " +
            "    ELSE NULL END AS preferenceScore, " +
            "c.created_at AS createdAt " +
            "FROM video_comments c " +
            "LEFT JOIN users u ON c.user_id = u.user_id " +
            "LEFT JOIN videos v ON c.video_id = v.id " +
            "LEFT JOIN user_events e ON e.user_id = c.user_id AND e.video_id = c.video_id " +
            "AND e.event_type = 'comment' " +
            "AND JSON_TYPE(JSON_EXTRACT(e.ctx, '$.commentId')) != 'NULL' " +
            "AND CAST(JSON_EXTRACT(e.ctx, '$.commentId') AS UNSIGNED) = c.id " +
            "WHERE c.status = 1 " +
            "ORDER BY c.created_at DESC " +
            "LIMIT #{limit}")
    List<RecentCommentDTO> getRecentComments(@Param("limit") int limit);
}

