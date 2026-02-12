package com.douyin.controller;

import com.douyin.dto.LoginRequest;
import com.douyin.dto.RegisterRequest;
import com.douyin.dto.TokenResponse;
import com.douyin.entity.UserProfile;
import com.douyin.security.JwtAuthenticationFilter;
import com.douyin.security.SecurityConfig;
import com.douyin.service.UserProfileService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserProfileService userProfileService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() throws Exception {
        // Make the mock filter pass requests through to the controller
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(
            any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));
    }

    @Test
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("newuser");
        request.setPassword("password123");
        request.setNickname("新用户");

        UserProfile user = new UserProfile();
        user.setUserId(1L);
        user.setUsername("newuser");
        user.setNickname("新用户");

        TokenResponse tokenResponse = TokenResponse.builder()
            .token("test-token")
            .expiresIn(3600L)
            .user(user)
            .build();

        when(userProfileService.register(any(RegisterRequest.class)))
            .thenReturn(tokenResponse);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.token").value("test-token"));
    }

    @Test
    void testLoginSuccess() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        UserProfile user = new UserProfile();
        user.setUserId(1L);
        user.setUsername("testuser");
        user.setNickname("测试用户");

        TokenResponse tokenResponse = TokenResponse.builder()
            .token("test-token")
            .expiresIn(3600L)
            .user(user)
            .build();

        when(userProfileService.login(any(LoginRequest.class)))
            .thenReturn(tokenResponse);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.data.token").value("test-token"));
    }

    @Test
    void testRegisterWithInvalidData() throws Exception {
        RegisterRequest request = new RegisterRequest();
        // 缺少必填字段

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void testLoginWithInvalidData() throws Exception {
        LoginRequest request = new LoginRequest();
        // 缺少必填字段

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }
}

