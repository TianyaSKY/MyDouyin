package com.douyin.entity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Aggregated data returned to the administrator operations dashboard.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    private Overview overview;
    private List<TrendPoint> trend;
    private List<TopVideo> topVideos;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Overview {
        private long userCount;
        private long videoCount;
        private long viewCount;
        private long likeCount;
        private long shareCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendPoint {
        private LocalDate date;
        private long viewCount;
        private long likeCount;
        private long shareCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopVideo {
        private long videoId;
        private String title;
        private String coverUrl;
        private String authorName;
        private long viewCount;
        private long likeCount;
        private long shareCount;
    }
}
