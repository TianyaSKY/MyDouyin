package com.douyin.service;

import com.douyin.enums.EventType;
import com.douyin.mapper.VideoStatsDailyMapper;
import com.douyin.service.impl.VideoStatsDailyServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class VideoStatsDailyServiceTest {

    @Mock
    private VideoStatsDailyMapper videoStatsDailyMapper;

    @InjectMocks
    private VideoStatsDailyServiceImpl videoStatsDailyService;

    @BeforeEach
    void setUp() {
        // Ensure baseMapper is set (although InjectMocks usually handles it for MyBatis-Plus services)
        ReflectionTestUtils.setField(videoStatsDailyService, "baseMapper", videoStatsDailyMapper);
    }

    @Test
    void testIncrementStats_Impression() {
        Long videoId = 100L;
        int watchMs = 0;
        
        videoStatsDailyService.incrementStats(videoId, EventType.IMPR, watchMs);

        verify(videoStatsDailyMapper).upsertStats(
            eq(videoId),
            eq(LocalDate.now()),
            eq(1L), // impr
            eq(0L), // click
            eq(0L), // like
            eq(0L), // finish
            eq(0L), // share
            eq(0L)  // watchMs
        );
    }

    @Test
    void testIncrementStats_FinishWithWatchTime() {
        Long videoId = 101L;
        int watchMs = 15000;
        
        videoStatsDailyService.incrementStats(videoId, EventType.FINISH, watchMs);

        verify(videoStatsDailyMapper).upsertStats(
            eq(videoId),
            eq(LocalDate.now()),
            eq(0L), // impr
            eq(0L), // click
            eq(0L), // like
            eq(1L), // finish
            eq(0L), // share
            eq(15000L) // watchMs
        );
    }
}
