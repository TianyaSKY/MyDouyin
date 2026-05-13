package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 数据大屏 — 全局概览 KPI 指标
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OverviewDTO {

    /** 总用户数 */
    private Long totalUsers;

    /** 今日新增用户数 */
    private Long todayNewUsers;

    /** 总视频数（已发布） */
    private Long totalVideos;

    /** 今日发布视频数 */
    private Long todayNewVideos;

    /** 今日总播放量（click_cnt 之和） */
    private Long todayPlays;

    /** 今日互动量（点赞+评论+分享之和） */
    private Long todayInteractions;

    /** 今日总评论数 */
    private Long todayComments;

    /** 今日总分享数 */
    private Long todayShares;

    /** 今日总点赞数 */
    private Long todayLikes;
}
