package com.douyin.entity.dto;

import lombok.Data;

import java.util.List;

/**
 * 视频 embedding 异步任务消息体。
 */
@Data
public class VideoEmbeddingTaskMessage {

    private Long videoId;
    private Long authorId;
    private String title;
    private List<String> tags;
    private String videoUrl;
}
