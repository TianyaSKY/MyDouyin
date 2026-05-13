package com.douyin.service;

import com.douyin.entity.dto.dashboard.*;

import java.util.List;
import java.util.Map;

/**
 * 数据大屏服务接口。
 */
public interface DashboardService {

    /**
     * 全局概览 KPI 指标。
     */
    OverviewDTO getOverview();

    /**
     * 用户增长趋势（近 N 天）。
     */
    List<TrendPointDTO> getUserGrowthTrend(int days);

    /**
     * DAU 趋势（近 N 天）。
     */
    List<TrendPointDTO> getDauTrend(int days);

    /**
     * 用户行为分布（近 N 天）。
     */
    List<EventDistributionDTO> getEventDistribution(int days);

    /**
     * 活跃用户排行 Top N。
     */
    List<TopUserDTO> getTopActiveUsers(int days, int limit);

    /**
     * 视频发布趋势（近 N 天）。
     */
    List<TrendPointDTO> getVideoPublishTrend(int days);

    /**
     * 热门视频排行 Top N。
     */
    List<TopVideoDTO> getTopVideos(int limit);

    /**
     * 标签云数据 Top N。
     */
    List<TagCloudDTO> getTagCloud(int limit);

    /**
     * 视频状态分布。
     */
    List<VideoStatusDistDTO> getVideoStatusDistribution();

    /**
     * 行为转化漏斗（近 N 天）。
     */
    FunnelDTO getFunnel(int days);

    /**
     * 行为热力图（近 N 天，按小时×星期聚合）。
     */
    List<HeatmapCellDTO> getEventHeatmap(int days);

    /**
     * 推荐 CTR 趋势（近 N 天）。
     * 返回两组数据：impressions 和 clicks。
     */
    Map<String, List<TrendPointDTO>> getCtrTrend(int days);

    /**
     * 最近事件列表。
     */
    List<RecentEventDTO> getRecentEvents(int limit);
}
