package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.dto.LoginRequest;
import com.douyin.dto.RegisterRequest;
import com.douyin.dto.TokenResponse;
import com.douyin.security.JwtUserDetails;
import com.douyin.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserProfileService userProfileService;

    /**
     * POST /api/auth/register - Register a new user
     */
    @PostMapping("/register")
    public Result<TokenResponse> register(@Valid @RequestBody RegisterRequest request) {
        TokenResponse tokenResponse = userProfileService.register(request);
        return Result.ok(tokenResponse);
    }

    /**
     * POST /api/auth/login - Login with credentials
     */
    @PostMapping("/login")
    public Result<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse tokenResponse = userProfileService.login(request);
        return Result.ok(tokenResponse);
    }

    /**
     * GET /api/auth/me - Get current authenticated user info
     */
    @GetMapping("/me")
    public Result<Object> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtUserDetails)) {
            return Result.fail(401, "未登录");
        }
        JwtUserDetails userDetails = (JwtUserDetails) authentication.getPrincipal();
        return Result.ok(userProfileService.getById(userDetails.getUserId()));
    }
}
