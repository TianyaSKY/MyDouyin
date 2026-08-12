package com.douyin.service;

import com.douyin.entity.dto.AdminDashboardResponse;

public interface AdminDashboardService {

    AdminDashboardResponse getDashboard(Long currentUserId);
}
