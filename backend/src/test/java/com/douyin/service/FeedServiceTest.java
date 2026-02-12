package com.douyin.service;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.douyin.common.config.RabbitMQConfig;
import com.douyin.entity.dto.FeedResponse;
import com.douyin.entity.Video;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.service.impl.FeedServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.ZSetOperations;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

    @Mock
    private VideoService videoService;

    @Mock
    private VideoStatsDailyService videoStatsDailyService;

    @Mock
    private IMilvusService milvusService;

    @Mock
    private UserEmbeddingService userEmbeddingService;

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private ZSetOperations<String, Object> zSetOperations;

    @Mock
    private SetOperations<String, Object> setOperations;

    @InjectMocks
    private FeedServiceImpl feedService;

    private Video testVideo1;
    private Video testVideo2;

    @BeforeEach
    void setUp() {
        testVideo1 = new Video();
        testVideo1.setId(1L);
        testVideo1.setAuthorId(100L);
        testVideo1.setTitle("测试视频1");
        testVideo1.setStatus(VideoStatus.PUBLISHED);
        testVideo1.setCreatedAt(LocalDateTime.now());

        testVideo2 = new Video();
        testVideo2.setId(2L);
        testVideo2.setAuthorId(101L);
        testVideo2.setTitle("测试视频2");
        testVideo2.setStatus(VideoStatus.PUBLISHED);
        testVideo2.setCreatedAt(LocalDateTime.now());

        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);
    }

    @Test
    void testGenerateFeedWithHotVideos() {
        Long userId = 1L;
        int size = 10;

        // Mock热门视频召回
        Set<ZSetOperations.TypedTuple<Object>> hotVideos = new HashSet<>();
        ZSetOperations.TypedTuple<Object> tuple1 = mock(ZSetOperations.TypedTuple.class);
        when(tuple1.getValue()).thenReturn("1");
        when(tuple1.getScore()).thenReturn(100.0);
        hotVideos.add(tuple1);

        when(zSetOperations.reverseRangeWithScores(anyString(), anyLong(), anyLong()))
            .thenReturn(hotVideos);
        when(videoService.listByIds(anyList())).thenReturn(Arrays.asList(testVideo1));

        // Mock向量召回
        when(userEmbeddingService.getFusedVector(userId, 0.7))
            .thenReturn(Arrays.asList(0.1f, 0.2f, 0.3f));
        when(milvusService.searchSimilarVideos(anyList(), anyInt()))
            .thenReturn(Arrays.asList(2L));
        when(videoService.listByIds(Arrays.asList(2L)))
            .thenReturn(Arrays.asList(testVideo2));

        // Mock已看视频集合
        when(setOperations.members(anyString())).thenReturn(new HashSet<>());

        // Mock视频统计
        VideoStatsDaily stats = new VideoStatsDaily();
        stats.setVideoId(1L);
        stats.setLikeCnt(10L);
        stats.setFinishCnt(5L);
        stats.setShareCnt(2L);
        when(videoStatsDailyService.getOne(any())).thenReturn(stats);

        FeedResponse response = feedService.generateFeed(userId, size);

        assertNotNull(response);
        assertNotNull(response.getVideos());
        assertTrue(response.getVideos().size() <= size);
        verify(rabbitTemplate, atLeastOnce()).convertAndSend(
            eq(RabbitMQConfig.EXCHANGE_NAME),
            eq(RabbitMQConfig.ROUTING_KEY),
                Optional.ofNullable(any())
        );
    }

    @Test
    void testGenerateFeedWithEmptyHotPool() {
        Long userId = 1L;
        int size = 10;

        // Mock空的热门池，触发兜底逻辑
        when(zSetOperations.reverseRangeWithScores(anyString(), anyLong(), anyLong()))
            .thenReturn(null);
        when(videoService.list((Wrapper<Video>) any())).thenReturn(Arrays.asList(testVideo1, testVideo2));

        // Mock向量召回
        when(userEmbeddingService.getFusedVector(userId, 0.7))
            .thenReturn(Arrays.asList(0.1f, 0.2f, 0.3f));
        when(milvusService.searchSimilarVideos(anyList(), anyInt()))
            .thenReturn(Arrays.asList(2L));
        when(videoService.listByIds(anyList())).thenReturn(Arrays.asList(testVideo2));

        // Mock已看视频集合
        when(setOperations.members(anyString())).thenReturn(new HashSet<>());

        FeedResponse response = feedService.generateFeed(userId, size);

        assertNotNull(response);
        assertNotNull(response.getVideos());
    }

    @Test
    void testGenerateFeedFilterSeenVideos() {
        Long userId = 1L;
        int size = 10;

        // Mock热门视频
        Set<ZSetOperations.TypedTuple<Object>> hotVideos = new HashSet<>();
        ZSetOperations.TypedTuple<Object> tuple1 = mock(ZSetOperations.TypedTuple.class);
        when(tuple1.getValue()).thenReturn("1");
        when(tuple1.getScore()).thenReturn(100.0);
        hotVideos.add(tuple1);

        when(zSetOperations.reverseRangeWithScores(anyString(), anyLong(), anyLong()))
            .thenReturn(hotVideos);
        when(videoService.listByIds(anyList())).thenReturn(Arrays.asList(testVideo1));

        // Mock向量召回
        when(userEmbeddingService.getFusedVector(userId, 0.7))
            .thenReturn(Arrays.asList(0.1f, 0.2f, 0.3f));
        when(milvusService.searchSimilarVideos(anyList(), anyInt()))
            .thenReturn(Arrays.asList(2L));

        // Mock已看视频集合（包含视频1）
        Set<Object> seenIds = new HashSet<>();
        seenIds.add("1");
        when(setOperations.members(anyString())).thenReturn(seenIds);

        FeedResponse response = feedService.generateFeed(userId, size);

        assertNotNull(response);
        // 视频1应该被过滤掉
        assertTrue(response.getVideos().stream().noneMatch(v -> v.getId().equals(1L)));
    }

    @Test
    void testGenerateFeedWithNoUserVector() {
        Long userId = 1L;
        int size = 10;

        // Mock热门视频
        Set<ZSetOperations.TypedTuple<Object>> hotVideos = new HashSet<>();
        ZSetOperations.TypedTuple<Object> tuple1 = mock(ZSetOperations.TypedTuple.class);
        when(tuple1.getValue()).thenReturn("1");
        when(tuple1.getScore()).thenReturn(100.0);
        hotVideos.add(tuple1);

        when(zSetOperations.reverseRangeWithScores(anyString(), anyLong(), anyLong()))
            .thenReturn(hotVideos);
        when(videoService.listByIds(anyList())).thenReturn(Arrays.asList(testVideo1));

        // Mock空的用户向量，触发兜底
        when(userEmbeddingService.getFusedVector(userId, 0.7))
            .thenReturn(Arrays.asList(0.0f, 0.0f, 0.0f));
        when(videoService.list((Wrapper<Video>) any())).thenReturn(Arrays.asList(testVideo2));

        // Mock已看视频集合
        when(setOperations.members(anyString())).thenReturn(new HashSet<>());

        FeedResponse response = feedService.generateFeed(userId, size);

        assertNotNull(response);
        assertNotNull(response.getVideos());
    }
}

