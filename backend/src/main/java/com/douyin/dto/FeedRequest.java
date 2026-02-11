package com.douyin.dto;

import lombok.Data;

@Data
public class FeedRequest {
    private Long userId;
    private Integer size = 20;
    private String cursor; // 用于分页
}

