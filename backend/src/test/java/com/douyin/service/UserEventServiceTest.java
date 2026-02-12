package com.douyin.service;

import com.douyin.entity.UserEvent;
import com.douyin.entity.enums.EventType;
import com.douyin.mapper.UserEventMapper;
import com.douyin.service.impl.UserEventServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserEventServiceTest {

    @Mock
    private UserEventMapper userEventMapper;

    private UserEventServiceImpl userEventService;

    private UserEvent testEvent;

    @BeforeEach
    void setUp() {
        userEventService = new UserEventServiceImpl();
        // 手动设置 baseMapper
        ReflectionTestUtils.setField(userEventService, "baseMapper", userEventMapper);
        
        testEvent = new UserEvent();
        testEvent.setId(1L);
        testEvent.setUserId(100L);
        testEvent.setVideoId(200L);
        testEvent.setEventType(EventType.LIKE);
        testEvent.setTs(LocalDateTime.now());
    }

    @Test
    void testSaveUserEvent() {
        when(userEventMapper.insert(any(UserEvent.class))).thenReturn(1);

        boolean result = userEventService.save(testEvent);

        assertTrue(result);
        verify(userEventMapper, times(1)).insert(testEvent);
    }

    @Test
    void testGetByUserAndVideo() {
        List<UserEvent> events = Arrays.asList(testEvent);
        when(userEventMapper.selectList(any())).thenReturn(events);

        List<UserEvent> result = userEventService.getByUserAndVideo(100L, 200L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(EventType.LIKE, result.get(0).getEventType());
        verify(userEventMapper, times(1)).selectList(any());
    }

    @Test
    void testGetByUserAndVideoNoResults() {
        when(userEventMapper.selectList(any())).thenReturn(Arrays.asList());

        List<UserEvent> result = userEventService.getByUserAndVideo(999L, 888L);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testSaveMultipleEvents() {
        UserEvent event1 = new UserEvent();
        event1.setUserId(100L);
        event1.setVideoId(200L);
        event1.setEventType(EventType.LIKE);

        UserEvent event2 = new UserEvent();
        event2.setUserId(100L);
        event2.setVideoId(200L);
        event2.setEventType(EventType.SHARE);

        when(userEventMapper.insert(any(UserEvent.class))).thenReturn(1);

        boolean result1 = userEventService.save(event1);
        boolean result2 = userEventService.save(event2);

        assertTrue(result1);
        assertTrue(result2);
        verify(userEventMapper, times(2)).insert(any(UserEvent.class));
    }
}

