package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.entity.dto.AdminDashboardResponse;
import com.douyin.service.AdminDashboardService;
import com.douyin.service.security.JwtUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/dashboard")
    public Result<AdminDashboardResponse> getDashboard(
            @AuthenticationPrincipal JwtUserDetails currentUser) {
        return Result.ok(adminDashboardService.getDashboard(currentUser.getUserId()));
    }
}
