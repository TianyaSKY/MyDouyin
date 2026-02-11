package com.douyin.dto;

import com.douyin.entity.Video;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedResponse {
    private List<Video> videos;
    private Boolean hasMore;
    private String nextCursor;
    
    public FeedResponse(List<Video> videos, Boolean hasMore) {
        this.videos = videos;
        this.hasMore = hasMore;
    }
}

