package com.douyin.service;

import com.douyin.dto.LoginRequest;
import com.douyin.dto.RegisterRequest;
import com.douyin.dto.TokenResponse;
import com.douyin.entity.UserProfile;
import com.douyin.mapper.UserProfileMapper;
import com.douyin.security.JwtUtils;
import com.douyin.service.impl.UserProfileServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private UserProfileMapper userProfileMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    private UserProfileServiceImpl userProfileService;

    private UserProfile testUser;

    @BeforeEach
    void setUp() {
        userProfileService = new UserProfileServiceImpl(passwordEncoder, jwtUtils);
        // 手动设置 baseMapper
        ReflectionTestUtils.setField(userProfileService, "baseMapper", userProfileMapper);
        
        testUser = new UserProfile();
        testUser.setUserId(1L);
        testUser.setUsername("testuser");
        testUser.setPassword("encodedPassword");
        testUser.setNickname("测试用户");
    }

    @Test
    void testRegisterSuccess() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("newuser");
        request.setPassword("password123");
        request.setNickname("新用户");

        when(userProfileMapper.selectOne(any(), anyBoolean())).thenReturn(null);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userProfileMapper.insert(any(UserProfile.class))).thenReturn(1);
        when(jwtUtils.generateToken(any(), anyString())).thenReturn("test-token");
        when(jwtUtils.getExpiration()).thenReturn(3600000L);

        TokenResponse response = userProfileService.register(request);

        assertNotNull(response);
        assertEquals("test-token", response.getToken());
        verify(userProfileMapper, times(1)).insert(any(UserProfile.class));
        verify(jwtUtils, times(1)).generateToken(any(), anyString());
    }

    @Test
    void testRegisterUserAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("existinguser");
        request.setPassword("password123");

        when(userProfileMapper.selectOne(any(), anyBoolean())).thenReturn(testUser);

        Exception exception = assertThrows(RuntimeException.class, () -> {
            userProfileService.register(request);
        });

        assertEquals("用户名已存在", exception.getMessage());
        verify(userProfileMapper, never()).insert(any(UserProfile.class));
    }

    @Test
    void testLoginSuccess() {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        when(userProfileMapper.selectOne(any(), anyBoolean())).thenReturn(testUser);
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(jwtUtils.generateToken(any(), anyString())).thenReturn("test-token");
        when(jwtUtils.getExpiration()).thenReturn(3600000L);

        TokenResponse response = userProfileService.login(request);

        assertNotNull(response);
        assertEquals("test-token", response.getToken());
        verify(jwtUtils, times(1)).generateToken(testUser.getUserId(), testUser.getUsername());
    }

    @Test
    void testLoginUserNotFound() {
        LoginRequest request = new LoginRequest();
        request.setUsername("nonexistent");
        request.setPassword("password123");

        when(userProfileMapper.selectOne(any(), anyBoolean())).thenReturn(null);

        Exception exception = assertThrows(RuntimeException.class, () -> {
            userProfileService.login(request);
        });

        assertEquals("用户名或密码错误", exception.getMessage());
    }

    @Test
    void testLoginWrongPassword() {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("wrongpassword");

        when(userProfileMapper.selectOne(any(), anyBoolean())).thenReturn(testUser);
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        Exception exception = assertThrows(RuntimeException.class, () -> {
            userProfileService.login(request);
        });

        assertEquals("用户名或密码错误", exception.getMessage());
    }

    @Test
    void testGetByUsername() {
        when(userProfileMapper.selectOne(any(), anyBoolean())).thenReturn(testUser);

        UserProfile result = userProfileService.getByUsername("testuser");

        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        verify(userProfileMapper, times(1)).selectOne(any(), anyBoolean());
    }
}

