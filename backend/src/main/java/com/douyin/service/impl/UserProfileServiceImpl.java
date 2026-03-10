package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.client.RecommendServiceClient;
import com.douyin.entity.dto.LoginRequest;
import com.douyin.entity.dto.RegisterRequest;
import com.douyin.entity.dto.TokenResponse;
import com.douyin.entity.UserProfile;
import com.douyin.mapper.UserProfileMapper;
import com.douyin.service.security.JwtUtils;
import com.douyin.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserProfileServiceImpl extends ServiceImpl<UserProfileMapper, UserProfile>
        implements UserProfileService {

    private static final int VECTOR_DIM = 1024;

    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RecommendServiceClient recommendServiceClient;

    @Override
    public UserProfile getByUsername(String username) {
        return getOne(new LambdaQueryWrapper<UserProfile>()
                .eq(UserProfile::getUsername, username));
    }

    @Override
    @Transactional
    public TokenResponse register(RegisterRequest request) {
        // Check if username already exists
        if (getByUsername(request.getUsername()) != null) {
            throw new RuntimeException("用户名已存在");
        }

        // Create user
        UserProfile user = new UserProfile();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname() != null ? request.getNickname() : request.getUsername());
        save(user);

        initUserVector(user.getUserId());

        // Generate token
        return buildTokenResponse(user);
    }

    @Override
    public TokenResponse login(LoginRequest request) {
        UserProfile user = getByUsername(request.getUsername());
        if (user == null) {
            throw new RuntimeException("用户名或密码错误");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        return buildTokenResponse(user);
    }

    // ---- internal ----

    private TokenResponse buildTokenResponse(UserProfile user) {
        String token = jwtUtils.generateToken(user.getUserId(), user.getUsername());

        return TokenResponse.builder()
                .token(token)
                .expiresIn(jwtUtils.getExpiration() / 1000) // seconds
                .user(user)
                .build();
    }

    private void initUserVector(Long userId) {
        List<Float> zeroVector = new ArrayList<>(Collections.nCopies(VECTOR_DIM, 0.0f));
        boolean inserted = recommendServiceClient.insertUserVector(userId, zeroVector, zeroVector);
        if (!inserted) {
            log.warn("Failed to initialize user vector for user {}", userId);
        }
    }
}
