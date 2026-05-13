package com.douyin.service.impl;

import com.douyin.entity.dto.dashboard.*;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.mapper.DashboardMapper;
import com.douyin.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 数据大屏服务实现 — 聚合查询 + Redis 缓存。
 */
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final DashboardMapper dashboardMapper;

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'overview'")
    public OverviewDTO getOverview() {
        LocalDate today = LocalDate.now();
        return OverviewDTO.builder()
                .totalUsers(dashboardMapper.countTotalUsers())
                .todayNewUsers(dashboardMapper.countNewUsersByDate(today))
                .totalVideos(dashboardMapper.countPublishedVideos())
                .todayNewVideos(dashboardMapper.countNewVideosByDate(today))
                .todayPlays(dashboardMapper.sumPlaysByDate(today))
                .todayInteractions(dashboardMapper.sumInteractionsByDate(today))
                .todayLikes(dashboardMapper.sumLikesByDate(today))
                .todayComments(dashboardMapper.sumCommentsByDate(today))
                .todayShares(dashboardMapper.sumSharesByDate(today))
                .build();
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'userGrowth:' + #days")
    public List<TrendPointDTO> getUserGrowthTrend(int days) {
        LocalDateTime startDate = LocalDate.now().minusDays(days).atStartOfDay();
        return dashboardMapper.getUserGrowthTrend(startDate);
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'dau:' + #days")
    public List<TrendPointDTO> getDauTrend(int days) {
        LocalDateTime startDate = LocalDate.now().minusDays(days).atStartOfDay();
        return dashboardMapper.getDauTrend(startDate);
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'eventDist:' + #days")
    public List<EventDistributionDTO> getEventDistribution(int days) {
        LocalDateTime startDate = LocalDate.now().minusDays(days).atStartOfDay();
        return dashboardMapper.getEventDistribution(startDate);
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'topUsers:' + #days + ':' + #limit")
    public List<TopUserDTO> getTopActiveUsers(int days, int limit) {
        LocalDateTime startDate = LocalDate.now().minusDays(days).atStartOfDay();
        return dashboardMapper.getTopActiveUsers(startDate, limit);
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'videoPubTrend:' + #days")
    public List<TrendPointDTO> getVideoPublishTrend(int days) {
        LocalDateTime startDate = LocalDate.now().minusDays(days).atStartOfDay();
        return dashboardMapper.getVideoPublishTrend(startDate);
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'topVideos:' + #limit")
    public List<TopVideoDTO> getTopVideos(int limit) {
        return dashboardMapper.getTopVideos(limit);
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'tagCloud:' + #limit")
    public List<TagCloudDTO> getTagCloud(int limit) {
        return dashboardMapper.getTagCloud(limit);
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'videoStatusDist'")
    public List<VideoStatusDistDTO> getVideoStatusDistribution() {
        List<VideoStatusDistDTO> dist = dashboardMapper.getVideoStatusDistribution();
        // 填充状态名
        for (VideoStatusDistDTO item : dist) {
            if (item.getStatusCode() != null) {
                for (VideoStatus vs : VideoStatus.values()) {
                    if (vs.getCode() == item.getStatusCode()) {
                        item.setStatusName(vs.getDescription());
                        break;
                    }
                }
            }
        }
        return dist;
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'funnel:' + #days")
    public FunnelDTO getFunnel(int days) {
        LocalDate startDate = LocalDate.now().minusDays(days);
        FunnelDTO raw = dashboardMapper.getFunnelRaw(startDate);
        if (raw == null) {
            return FunnelDTO.builder()
                    .impressions(0L).clicks(0L).finishes(0L)
                    .likes(0L).comments(0L).shares(0L)
                    .clickRate(0.0).finishRate(0.0).interactionRate(0.0)
                    .avgWatchMs(0L)
                    .build();
        }

        // 计算转化率
        long impressions = raw.getImpressions() != null ? raw.getImpressions() : 0L;
        long clicks = raw.getClicks() != null ? raw.getClicks() : 0L;
        long finishes = raw.getFinishes() != null ? raw.getFinishes() : 0L;
        long likes = raw.getLikes() != null ? raw.getLikes() : 0L;
        long comments = raw.getComments() != null ? raw.getComments() : 0L;
        long shares = raw.getShares() != null ? raw.getShares() : 0L;
        long watchTimeSum = raw.getAvgWatchMs() != null ? raw.getAvgWatchMs() : 0L;

        raw.setClickRate(impressions > 0 ? roundRate((double) clicks / impressions) : 0.0);
        raw.setFinishRate(clicks > 0 ? roundRate((double) finishes / clicks) : 0.0);
        raw.setInteractionRate(clicks > 0 ? roundRate((double) (likes + comments + shares) / clicks) : 0.0);
        raw.setAvgWatchMs(clicks > 0 ? watchTimeSum / clicks : 0L);

        return raw;
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'heatmap:' + #days")
    public List<HeatmapCellDTO> getEventHeatmap(int days) {
        LocalDateTime startDate = LocalDate.now().minusDays(days).atStartOfDay();
        return dashboardMapper.getEventHeatmap(startDate);
    }

    @Override
    @Cacheable(cacheNames = "dashboard", key = "'ctr:' + #days")
    public Map<String, List<TrendPointDTO>> getCtrTrend(int days) {
        LocalDateTime startDate = LocalDate.now().minusDays(days).atStartOfDay();
        Map<String, List<TrendPointDTO>> result = new HashMap<>();
        result.put("impressions", dashboardMapper.getImprTrend(startDate));
        result.put("clicks", dashboardMapper.getClickTrend(startDate));
        return result;
    }

    @Override
    public List<RecentEventDTO> getRecentEvents(int limit) {
        // 不缓存实时事件，每次查数据库
        return dashboardMapper.getRecentEvents(limit);
    }

    /**
     * 保留 4 位小数。
     */
    private double roundRate(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }
}
