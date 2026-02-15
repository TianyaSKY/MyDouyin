package com.douyin.entity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoLikeStatusResponse {
    private Long videoId;
    private Long likeCount;
    private Boolean liked;
}
