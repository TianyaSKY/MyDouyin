package com.douyin.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.douyin.entity.VideoStatsDaily;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface VideoStatsDailyMapper extends BaseMapper<VideoStatsDaily> {

    /**
     * Atomic Upsert (MySQL Specific)
     */
    @Update("INSERT INTO video_daily_stats (video_id, date, impr_cnt, click_cnt, like_cnt, finish_cnt, share_cnt, comment_cnt, watch_time_sum) " +
            "VALUES (#{videoId}, #{date}, #{impr}, #{click}, #{like}, #{finish}, #{share}, #{comment}, #{watchMs}) " +
            "ON DUPLICATE KEY UPDATE " +
            "impr_cnt = GREATEST(impr_cnt + #{impr}, 0), " +
            "click_cnt = GREATEST(click_cnt + #{click}, 0), " +
            "like_cnt = GREATEST(like_cnt + #{like}, 0), " +
            "finish_cnt = GREATEST(finish_cnt + #{finish}, 0), " +
            "share_cnt = GREATEST(share_cnt + #{share}, 0), " +
            "comment_cnt = GREATEST(comment_cnt + #{comment}, 0), " +
            "watch_time_sum = GREATEST(watch_time_sum + #{watchMs}, 0)")
    void upsertStats(@Param("videoId") Long videoId,
                     @Param("date") LocalDate date,
                     @Param("impr") long impr,
                     @Param("click") long click,
                     @Param("like") long like,
                     @Param("finish") long finish,
                     @Param("share") long share,
                     @Param("comment") long comment,
                     @Param("watchMs") long watchMs);

    /**
     * Query stats for a specific video within a date range.
     */
    @Select("SELECT * FROM video_daily_stats WHERE video_id = #{videoId} AND date BETWEEN #{startDate} AND #{endDate} ORDER BY date")
    List<VideoStatsDaily> selectByVideoIdAndDateRange(
            @Param("videoId") Long videoId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Sum total likes for a user's videos.
     */
    @Select("SELECT COALESCE(SUM(s.like_cnt), 0) FROM video_daily_stats s " +
            "JOIN videos v ON s.video_id = v.id " +
            "WHERE v.author_id = #{authorId}")
    Long sumLikesByAuthorId(@Param("authorId") Long authorId);

    /**
     * Sum total stats for a specific video.
     */
    @Select("SELECT COALESCE(SUM(impr_cnt), 0) as imprCnt, COALESCE(SUM(like_cnt), 0) as likeCnt, " +
            "COALESCE(SUM(share_cnt), 0) as shareCnt " +
            "FROM video_daily_stats WHERE video_id = #{videoId}")
    VideoStatsDaily sumStatsByVideoId(@Param("videoId") Long videoId);

    /**
     * 批量获取每个视频的最新一天统计数据（用于热度计算）。
     * 使用子查询先找出每个 video_id 的最新日期，再关联取出完整行。
     */
    @Select("<script>" +
            "SELECT s.* FROM video_daily_stats s " +
            "INNER JOIN (" +
            "  SELECT video_id, MAX(date) AS max_date FROM video_daily_stats " +
            "  WHERE video_id IN " +
            "  <foreach collection='videoIds' item='id' open='(' separator=',' close=')'>" +
            "    #{id}" +
            "  </foreach>" +
            "  GROUP BY video_id" +
            ") t ON s.video_id = t.video_id AND s.date = t.max_date" +
            "</script>")
    List<VideoStatsDaily> batchGetLatestStats(@Param("videoIds") List<Long> videoIds);
}
