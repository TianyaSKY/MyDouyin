package com.douyin.controller;

import com.douyin.entity.dto.AdminDashboardResponse;
import com.douyin.entity.dto.AdminDashboardResponse.Overview;
import com.douyin.entity.dto.AdminDashboardResponse.TopVideo;
import com.douyin.entity.dto.AdminDashboardResponse.TrendPoint;
import com.douyin.service.AdminDashboardService;
import com.douyin.service.security.JwtAuthenticationFilter;
import com.douyin.service.security.JwtUserDetails;
import com.douyin.service.security.SecurityConfig;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminDashboardController.class)
@Import(SecurityConfig.class)
class AdminDashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminDashboardService adminDashboardService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(
                any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));
    }

    @Test
    void getDashboardRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void getDashboardReturnsAggregatedDataForAuthenticatedUser() throws Exception {
        AdminDashboardResponse response = new AdminDashboardResponse(
                new Overview(12L, 8L, 420L, 80L, 16L),
                List.of(new TrendPoint(LocalDate.of(2026, 8, 12), 100L, 20L, 4L)),
                List.of(new TopVideo(22L, "热门视频", "/cover.jpg", "管理员", 320L, 60L, 12L))
        );
        when(adminDashboardService.getDashboard(1L)).thenReturn(response);

        mockMvc.perform(get("/api/admin/dashboard")
                        .with(authentication(authenticationFor(1L))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.overview.userCount").value(12))
                .andExpect(jsonPath("$.data.overview.videoCount").value(8))
                .andExpect(jsonPath("$.data.overview.viewCount").value(420))
                .andExpect(jsonPath("$.data.trend[0].viewCount").value(100))
                .andExpect(jsonPath("$.data.topVideos[0].title").value("热门视频"));
    }

    @Test
    void getDashboardMapsAccessDeniedToForbiddenResponse() throws Exception {
        when(adminDashboardService.getDashboard(2L))
                .thenThrow(new AccessDeniedException("权限不足"));

        mockMvc.perform(get("/api/admin/dashboard")
                        .with(authentication(authenticationFor(2L))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.message").value("权限不足"))
                .andExpect(jsonPath("$.data").value(nullValue()));
    }

    private Authentication authenticationFor(Long userId) {
        return new UsernamePasswordAuthenticationToken(
                new JwtUserDetails(userId, "user-" + userId),
                null,
                Collections.emptyList()
        );
    }
}
