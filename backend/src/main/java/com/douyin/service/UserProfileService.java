package com.douyin.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.dto.LoginRequest;
import com.douyin.entity.dto.RegisterRequest;
import com.douyin.entity.dto.TokenResponse;
import com.douyin.entity.UserProfile;

public interface UserProfileService extends IService<UserProfile> {

    /**
     * Find user by username.
     */
    UserProfile getByUsername(String username);

    /**
     * Register a new user. Returns token on success.
     * @throws RuntimeException if username already exists
     */
    TokenResponse register(RegisterRequest request);

    /**
     * Authenticate user and return token.
     * @throws RuntimeException if credentials are invalid
     */
    TokenResponse login(LoginRequest request);
}
