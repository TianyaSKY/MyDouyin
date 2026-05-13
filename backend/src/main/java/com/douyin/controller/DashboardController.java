package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.entity.dto.dashboard.*;
import com.douyin.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 数据大屏 Controller — 聚合查询接口（公开访问，无需认证）。
 */
@Tag(name = "数据大屏", description = "Dashboard aggregation APIs")
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // ==================== 全局概览 ====================

    @Operation(summary = "全局 KPI 概览", description = "总用户数、今日新增、总视频、今日播放/互动等")
    @GetMapping("/overview")
    public Result<OverviewDTO> getOverview() {
        return Result.ok(dashboardService.getOverview());
    }

    // ==================== 用户分析 ====================

    @Operation(summary = "用户增长趋势", description = "近 N 天每日新增用户数")
    @GetMapping("/users/growth")
    public Result<List<TrendPointDTO>> getUserGrowthTrend(
            @Parameter(description = "查询天数，默认 30") @RequestParam(defaultValue = "30") int days) {
        return Result.ok(dashboardService.getUserGrowthTrend(days));
    }

    @Operation(summary = "DAU 趋势", description = "近 N 天每日活跃用户数")
    @GetMapping("/users/active")
    public Result<List<TrendPointDTO>> getDauTrend(
            @Parameter(description = "查询天数，默认 30") @RequestParam(defaultValue = "30") int days) {
        return Result.ok(dashboardService.getDauTrend(days));
    }

    @Operation(summary = "用户行为分布", description = "各事件类型占比")
    @GetMapping("/users/events")
    public Result<List<EventDistributionDTO>> getEventDistribution(
            @Parameter(description = "查询天数，默认 7") @RequestParam(defaultValue = "7") int days) {
        return Result.ok(dashboardService.getEventDistribution(days));
    }

    @Operation(summary = "活跃用户排行", description = "互动次数最多的用户 Top N")
    @GetMapping("/users/top")
    public Result<List<TopUserDTO>> getTopActiveUsers(
            @Parameter(description = "查询天数，默认 7") @RequestParam(defaultValue = "7") int days,
            @Parameter(description = "返回数量，默认 10") @RequestParam(defaultValue = "10") int limit) {
        return Result.ok(dashboardService.getTopActiveUsers(days, limit));
    }

    // ==================== 内容分析 ====================

    @Operation(summary = "视频发布趋势", description = "近 N 天每日新发布视频数")
    @GetMapping("/videos/trend")
    public Result<List<TrendPointDTO>> getVideoPublishTrend(
            @Parameter(description = "查询天数，默认 30") @RequestParam(defaultValue = "30") int days) {
        return Result.ok(dashboardService.getVideoPublishTrend(days));
    }

    @Operation(summary = "热门视频排行", description = "按播放量排序的 Top N 视频")
    @GetMapping("/videos/top")
    public Result<List<TopVideoDTO>> getTopVideos(
            @Parameter(description = "返回数量，默认 10") @RequestParam(defaultValue = "10") int limit) {
        return Result.ok(dashboardService.getTopVideos(limit));
    }

    @Operation(summary = "标签云数据", description = "热门标签及其视频数量")
    @GetMapping("/tags/cloud")
    public Result<List<TagCloudDTO>> getTagCloud(
            @Parameter(description = "返回数量，默认 50") @RequestParam(defaultValue = "50") int limit) {
        return Result.ok(dashboardService.getTagCloud(limit));
    }

    @Operation(summary = "视频状态分布", description = "审核中/已发布/已删除的视频数量")
    @GetMapping("/videos/status")
    public Result<List<VideoStatusDistDTO>> getVideoStatusDistribution() {
        return Result.ok(dashboardService.getVideoStatusDistribution());
    }

    // ==================== 行为漏斗 ====================

    @Operation(summary = "行为转化漏斗", description = "曝光→点击→完播→互动 转化数据")
    @GetMapping("/funnel")
    public Result<FunnelDTO> getFunnel(
            @Parameter(description = "查询天数，默认 7") @RequestParam(defaultValue = "7") int days) {
        return Result.ok(dashboardService.getFunnel(days));
    }

    @Operation(summary = "行为热力图", description = "按小时×星期聚合的事件密度")
    @GetMapping("/heatmap")
    public Result<List<HeatmapCellDTO>> getEventHeatmap(
            @Parameter(description = "查询天数，默认 7") @RequestParam(defaultValue = "7") int days) {
        return Result.ok(dashboardService.getEventHeatmap(days));
    }

    // ==================== 推荐效果 ====================

    @Operation(summary = "推荐 CTR 趋势", description = "近 N 天的曝光量与点击量趋势")
    @GetMapping("/recommend/ctr")
    public Result<Map<String, List<TrendPointDTO>>> getCtrTrend(
            @Parameter(description = "查询天数，默认 7") @RequestParam(defaultValue = "7") int days) {
        return Result.ok(dashboardService.getCtrTrend(days));
    }

    // ==================== 实时监控 ====================

    @Operation(summary = "最近事件列表", description = "最近的用户互动事件")
    @GetMapping("/events/recent")
    public Result<List<RecentEventDTO>> getRecentEvents(
            @Parameter(description = "返回数量，默认 20") @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(dashboardService.getRecentEvents(limit));
    }
}
