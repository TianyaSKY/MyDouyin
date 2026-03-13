package com.douyin.service;

import com.douyin.client.RecommendServiceClient;
import com.douyin.entity.dto.LoginRequest;
import com.douyin.entity.dto.RegisterRequest;
import com.douyin.entity.dto.TokenResponse;
import com.douyin.entity.UserProfile;
import com.douyin.mapper.UserProfileMapper;
import com.douyin.service.TagVectorCacheService;
import com.douyin.service.security.JwtUtils;
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

    @Mock
    private RecommendServiceClient recommendServiceClient;

    @Mock
    private TagVectorCacheService tagVectorCacheService;

    private UserProfileServiceImpl userProfileService;

    private UserProfile testUser;

    @BeforeEach
    void setUp() {
        userProfileService = new UserProfileServiceImpl(passwordEncoder, jwtUtils, recommendServiceClient, tagVectorCacheService);
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
        request.setTags(java.util.List.of("美食", "旅行"));

        when(userProfileMapper.selectOne(any(), anyBoolean())).thenReturn(null);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userProfileMapper.insert(any(UserProfile.class))).thenReturn(1);
        when(jwtUtils.generateToken(any(), anyString())).thenReturn("test-token");
        when(jwtUtils.getExpiration()).thenReturn(3600000L);
        when(tagVectorCacheService.getAverageVectorByTags(anyList())).thenReturn(new java.util.ArrayList<>(java.util.Collections.nCopies(1024, 1.0f)));
        when(recommendServiceClient.insertUserVector(anyLong(), anyList(), anyList())).thenReturn(true);

        TokenResponse response = userProfileService.register(request);

        assertNotNull(response);
        assertEquals("test-token", response.getToken());
        verify(userProfileMapper, times(1)).insert(any(UserProfile.class));
        verify(jwtUtils, times(1)).generateToken(any(), anyString());
        verify(tagVectorCacheService, times(1)).getAverageVectorByTags(anyList());
        verify(recommendServiceClient, times(1)).insertUserVector(anyLong(), anyList(), anyList());
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
        verify(tagVectorCacheService, never()).getAverageVectorByTags(anyList());
        verify(recommendServiceClient, never()).insertUserVector(anyLong(), anyList(), anyList());
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

