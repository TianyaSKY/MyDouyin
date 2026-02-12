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

    private Long imprCnt;

    private Long clickCnt;

    private Long likeCnt;

    private Long finishCnt;

    private Long shareCnt;

    /**
     * Total watch time in milliseconds.
     */
    private Long watchTimeSum;
}
