package com.douyin.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.BaseUnitTest;
import com.douyin.entity.UserProfile;
import com.douyin.entity.dto.AdminDashboardResponse;
import com.douyin.entity.dto.AdminDashboardResponse.Overview;
import com.douyin.entity.dto.AdminDashboardResponse.TopVideo;
import com.douyin.entity.dto.AdminDashboardResponse.TrendPoint;
import com.douyin.mapper.AdminDashboardMapper;
import com.douyin.service.impl.AdminDashboardServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminDashboardServiceTest extends BaseUnitTest {

    private final AdminDashboardMapper dashboardMapper = org.mockito.Mockito.mock(AdminDashboardMapper.class);
    private final UserProfileService userProfileService = org.mockito.Mockito.mock(UserProfileService.class);
    private final VideoService videoService = org.mockito.Mockito.mock(VideoService.class);
    private final AdminDashboardServiceImpl dashboardService = new AdminDashboardServiceImpl(
            dashboardMapper,
            userProfileService,
            videoService
    );

    @Test
    void getDashboardBuildsOverviewAndContinuousTrend() {
        Long adminId = 1L;
        UserProfile admin = new UserProfile();
        admin.setUserId(adminId);
        admin.setIs_admin(1);
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(6);

        when(userProfileService.getById(adminId)).thenReturn(admin);
        when(userProfileService.count()).thenReturn(12L);
        when(videoService.count(any(LambdaQueryWrapper.class))).thenReturn(8L);
        when(dashboardMapper.selectOverviewTotals()).thenReturn(new Overview(0, 0, 420L, 80L, 16L));
        when(dashboardMapper.selectTrend(startDate, today)).thenReturn(List.of(
                new TrendPoint(startDate, 100L, 20L, 4L),
                new TrendPoint(today, 320L, 60L, 12L)
        ));
        TopVideo topVideo = new TopVideo(22L, "热门视频", "/cover.jpg", "管理员", 320L, 60L, 12L);
        when(dashboardMapper.selectTopVideos(5)).thenReturn(List.of(topVideo));

        AdminDashboardResponse response = dashboardService.getDashboard(adminId);

        assertNotNull(response);
        assertEquals(new Overview(12L, 8L, 420L, 80L, 16L), response.getOverview());
        assertEquals(7, response.getTrend().size());
        assertEquals(startDate, response.getTrend().get(0).getDate());
        assertEquals(today, response.getTrend().get(6).getDate());
        assertEquals(new TrendPoint(startDate.plusDays(1), 0L, 0L, 0L), response.getTrend().get(1));
        assertEquals(new TrendPoint(today, 320L, 60L, 12L), response.getTrend().get(6));
        assertEquals(List.of(topVideo), response.getTopVideos());
        verify(dashboardMapper).selectTrend(startDate, today);
        verify(dashboardMapper).selectTopVideos(5);
    }

    @Test
    void getDashboardReturnsZeroShapeWhenMapperReturnsNull() {
        Long adminId = 1L;
        UserProfile admin = new UserProfile();
        admin.setIs_admin(1);

        when(userProfileService.getById(adminId)).thenReturn(admin);
        when(userProfileService.count()).thenReturn(0L);
        when(videoService.count(any(LambdaQueryWrapper.class))).thenReturn(0L);
        when(dashboardMapper.selectOverviewTotals()).thenReturn(null);
        when(dashboardMapper.selectTrend(any(LocalDate.class), any(LocalDate.class))).thenReturn(null);
        when(dashboardMapper.selectTopVideos(eq(5))).thenReturn(null);

        AdminDashboardResponse response = dashboardService.getDashboard(adminId);

        assertEquals(new Overview(0L, 0L, 0L, 0L, 0L), response.getOverview());
        assertEquals(7, response.getTrend().size());
        assertEquals(0L, response.getTrend().stream()
                .mapToLong(point -> point.getViewCount() + point.getLikeCount() + point.getShareCount())
                .sum());
        assertNotNull(response.getTopVideos());
        assertEquals(0, response.getTopVideos().size());
    }

    @Test
    void getDashboardRejectsNonAdminBeforeRunningQueries() {
        Long userId = 2L;
        UserProfile user = new UserProfile();
        user.setUserId(userId);
        user.setIs_admin(0);
        when(userProfileService.getById(userId)).thenReturn(user);

        AccessDeniedException exception = assertThrows(
                AccessDeniedException.class,
                () -> dashboardService.getDashboard(userId)
        );

        assertEquals("权限不足", exception.getMessage());
        verify(dashboardMapper, never()).selectOverviewTotals();
        verify(dashboardMapper, never()).selectTrend(any(), any());
        verify(dashboardMapper, never()).selectTopVideos(any(Integer.class));
        verify(userProfileService, never()).count();
        verify(videoService, never()).count(any(LambdaQueryWrapper.class));
    }
}
