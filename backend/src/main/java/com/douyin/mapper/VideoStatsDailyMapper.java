package com.douyin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.douyin.entity.VideoStatsDaily;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface VideoStatsDailyMapper extends BaseMapper<VideoStatsDaily> {

    /**
     * Atomic Upsert (MySQL Specific)
     */
    @Select("INSERT INTO video_stats_daily (video_id, date, impr_cnt, click_cnt, like_cnt, finish_cnt, share_cnt, watch_time_sum) " +
            "VALUES (#{videoId}, #{date}, #{impr}, #{click}, #{like}, #{finish}, #{share}, #{watchMs}) " +
            "ON DUPLICATE KEY UPDATE " +
            "impr_cnt = impr_cnt + #{impr}, " +
            "click_cnt = click_cnt + #{click}, " +
            "like_cnt = like_cnt + #{like}, " +
            "finish_cnt = finish_cnt + #{finish}, " +
            "share_cnt = share_cnt + #{share}, " +
            "watch_time_sum = watch_time_sum + #{watchMs}")
    void upsertStats(@Param("videoId") Long videoId,
                     @Param("date") LocalDate date,
                     @Param("impr") long impr,
                     @Param("click") long click,
                     @Param("like") long like,
                     @Param("finish") long finish,
                     @Param("share") long share,
                     @Param("watchMs") long watchMs);

    /**
     * Query stats for a specific video within a date range.
     */
    @Select("SELECT * FROM video_stats_daily WHERE video_id = #{videoId} AND date BETWEEN #{startDate} AND #{endDate} ORDER BY date")
    List<VideoStatsDaily> selectByVideoIdAndDateRange(
            @Param("videoId") Long videoId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Sum total likes for a user's videos.
     */
    @Select("SELECT COALESCE(SUM(s.like_cnt), 0) FROM video_stats_daily s " +
            "JOIN video v ON s.video_id = v.id " +
            "WHERE v.author_id = #{authorId}")
    Long sumLikesByAuthorId(@Param("authorId") Long authorId);

    /**
     * Sum total stats for a specific video.
     */
    @Select("SELECT COALESCE(SUM(impr_cnt), 0) as imprCnt, COALESCE(SUM(like_cnt), 0) as likeCnt " +
            "FROM video_stats_daily WHERE video_id = #{videoId}")
    VideoStatsDaily sumStatsByVideoId(@Param("videoId") Long videoId);
}
