package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.entity.UserProfile;
import com.douyin.entity.Video;
import com.douyin.entity.dto.AdminDashboardResponse;
import com.douyin.entity.dto.AdminDashboardResponse.Overview;
import com.douyin.entity.dto.AdminDashboardResponse.TopVideo;
import com.douyin.entity.dto.AdminDashboardResponse.TrendPoint;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.mapper.AdminDashboardMapper;
import com.douyin.service.AdminDashboardService;
import com.douyin.service.UserProfileService;
import com.douyin.service.VideoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private static final int TREND_DAYS = 7;
    private static final int TOP_VIDEO_LIMIT = 5;

    private final AdminDashboardMapper adminDashboardMapper;
    private final UserProfileService userProfileService;
    private final VideoService videoService;

    @Override
    public AdminDashboardResponse getDashboard(Long currentUserId) {
        UserProfile currentUser = userProfileService.getById(currentUserId);
        if (currentUser == null || !Integer.valueOf(1).equals(currentUser.getIs_admin())) {
            throw new AccessDeniedException("权限不足");
        }

        Overview totals = adminDashboardMapper.selectOverviewTotals();
        if (totals == null) {
            totals = new Overview();
        }
        totals.setUserCount(userProfileService.count());
        totals.setVideoCount(videoService.count(new LambdaQueryWrapper<Video>()
                .ne(Video::getStatus, VideoStatus.DELETED)));

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(TREND_DAYS - 1L);
        List<TrendPoint> trend = fillTrend(startDate, adminDashboardMapper.selectTrend(startDate, endDate));
        List<TopVideo> topVideos = adminDashboardMapper.selectTopVideos(TOP_VIDEO_LIMIT);

        return new AdminDashboardResponse(
                totals,
                trend,
                topVideos == null ? Collections.emptyList() : topVideos
        );
    }

    private List<TrendPoint> fillTrend(LocalDate startDate, List<TrendPoint> source) {
        Map<LocalDate, TrendPoint> pointsByDate = new HashMap<>();
        if (source != null) {
            for (TrendPoint point : source) {
                if (point != null && point.getDate() != null) {
                    pointsByDate.put(point.getDate(), point);
                }
            }
        }

        List<TrendPoint> trend = new ArrayList<>(TREND_DAYS);
        for (int offset = 0; offset < TREND_DAYS; offset++) {
            LocalDate date = startDate.plusDays(offset);
            TrendPoint point = pointsByDate.get(date);
            trend.add(point == null
                    ? new TrendPoint(date, 0, 0, 0)
                    : new TrendPoint(
                            date,
                            nonNegative(point.getViewCount()),
                            nonNegative(point.getLikeCount()),
                            nonNegative(point.getShareCount())));
        }
        return trend;
    }

    private long nonNegative(long value) {
        return Math.max(0L, value);
    }
}
