package com.douyin.mapper;

import com.douyin.entity.dto.AdminDashboardResponse.Overview;
import com.douyin.entity.dto.AdminDashboardResponse.TopVideo;
import com.douyin.entity.dto.AdminDashboardResponse.TrendPoint;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface AdminDashboardMapper {

    @Select("""
            SELECT
                COALESCE(SUM(s.impr_cnt), 0) AS viewCount,
                COALESCE(SUM(s.like_cnt), 0) AS likeCount,
                COALESCE(SUM(s.share_cnt), 0) AS shareCount
            FROM video_daily_stats s
            INNER JOIN videos v ON v.id = s.video_id
            WHERE v.status <> 2
            """)
    Overview selectOverviewTotals();

    @Select("""
            SELECT
                s.date AS date,
                COALESCE(SUM(s.impr_cnt), 0) AS viewCount,
                COALESCE(SUM(s.like_cnt), 0) AS likeCount,
                COALESCE(SUM(s.share_cnt), 0) AS shareCount
            FROM video_daily_stats s
            INNER JOIN videos v ON v.id = s.video_id
            WHERE v.status <> 2
              AND s.date BETWEEN #{startDate} AND #{endDate}
            GROUP BY s.date
            ORDER BY s.date ASC
            """)
    List<TrendPoint> selectTrend(@Param("startDate") LocalDate startDate,
                                 @Param("endDate") LocalDate endDate);

    @Select("""
            SELECT
                v.id AS videoId,
                v.title AS title,
                v.cover_url AS coverUrl,
                COALESCE(NULLIF(u.nickname, ''), NULLIF(u.username, ''), '未知用户') AS authorName,
                COALESCE(SUM(s.impr_cnt), 0) AS viewCount,
                COALESCE(SUM(s.like_cnt), 0) AS likeCount,
                COALESCE(SUM(s.share_cnt), 0) AS shareCount
            FROM videos v
            LEFT JOIN users u ON u.user_id = v.author_id
            LEFT JOIN video_daily_stats s ON s.video_id = v.id
            WHERE v.status = 1
            GROUP BY v.id, v.title, v.cover_url, u.nickname, u.username
            ORDER BY viewCount DESC, likeCount DESC, v.id DESC
            LIMIT #{limit}
            """)
    List<TopVideo> selectTopVideos(@Param("limit") int limit);
}
