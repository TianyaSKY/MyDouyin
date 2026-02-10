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
     * Query stats for a specific video within a date range.
     */
    @Select("SELECT * FROM video_stats_daily WHERE video_id = #{videoId} AND date BETWEEN #{startDate} AND #{endDate} ORDER BY date")
    List<VideoStatsDaily> selectByVideoIdAndDateRange(
            @Param("videoId") Long videoId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
