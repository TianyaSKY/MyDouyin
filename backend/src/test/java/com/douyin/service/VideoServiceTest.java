package com.douyin.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.metadata.TableInfo;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.douyin.entity.Video;
import com.douyin.enums.VideoStatus;
import com.douyin.mapper.VideoMapper;
import com.douyin.service.impl.VideoServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VideoServiceTest {

    @Mock
    private VideoMapper videoMapper;

    private VideoServiceImpl videoService;

    private Video testVideo;

    @BeforeEach
    void setUp() {
        videoService = new VideoServiceImpl();
        // 手动设置 baseMapper
        ReflectionTestUtils.setField(videoService, "baseMapper", videoMapper);
        
        testVideo = new Video();
        testVideo.setId(1L);
        testVideo.setAuthorId(100L);
        testVideo.setTitle("测试视频");
        testVideo.setStatus(VideoStatus.PUBLISHED);
        testVideo.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void testSaveVideo() {
        when(videoMapper.insert(any(Video.class))).thenReturn(1);

        boolean result = videoService.save(testVideo);

        assertTrue(result);
        verify(videoMapper, times(1)).insert(testVideo);
    }

    @Test
    void testGetVideoById() {
        when(videoMapper.selectById(1L)).thenReturn(testVideo);

        Video result = videoService.getById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("测试视频", result.getTitle());
        verify(videoMapper, times(1)).selectById(1L);
    }

    @Test
    void testUpdateVideo() {
        testVideo.setTitle("更新后的标题");
        when(videoMapper.updateById(any(Video.class))).thenReturn(1);

        boolean result = videoService.updateById(testVideo);

        assertTrue(result);
        verify(videoMapper, times(1)).updateById(testVideo);
    }

    @Test
    void testDeleteVideo() {
        // Mock TableInfo for removeById
        TableInfo tableInfo = mock(TableInfo.class);
        when(tableInfo.isWithLogicDelete()).thenReturn(false);
        
        try (MockedStatic<TableInfoHelper> mockedStatic = mockStatic(TableInfoHelper.class)) {
            mockedStatic.when(() -> TableInfoHelper.getTableInfo(Video.class)).thenReturn(tableInfo);
            when(videoMapper.deleteById(1L)).thenReturn(1);

            boolean result = videoService.removeById(1L);

            assertTrue(result);
            verify(videoMapper, times(1)).deleteById(1L);
        }
    }

    @Test
    void testListVideos() {
        List<Video> videos = Arrays.asList(testVideo);
        when(videoMapper.selectList(any())).thenReturn(videos);

        List<Video> result = videoService.list();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("测试视频", result.get(0).getTitle());
    }
}

