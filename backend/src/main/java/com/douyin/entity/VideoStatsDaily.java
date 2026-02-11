package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;

/**
 * Maps to `video_stats_daily` table.
 * Composite primary key: (video_id, date).
 */
@Data
@TableName("video_stats_daily")
public class VideoStatsDaily {

    private Long videoId;

    private LocalDate date;

    private Integer imprCnt;

    private Integer clickCnt;

    private Integer likeCnt;

    private Integer finishCnt;

    private Integer shareCnt;

    /**
     * Total watch time in milliseconds.
     */
    private Long watchTimeSum;
}
