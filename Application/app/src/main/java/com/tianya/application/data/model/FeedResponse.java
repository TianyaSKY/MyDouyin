package com.tianya.application.data.model;

import java.util.List;

/**
 * Feed response from /api/feed.
 */
public class FeedResponse {
    private List<Video> videos;
    private Boolean hasMore;
    private String nextCursor;

    public List<Video> getVideos() { return videos; }
    public void setVideos(List<Video> videos) { this.videos = videos; }

    public Boolean getHasMore() { return hasMore; }
    public void setHasMore(Boolean hasMore) { this.hasMore = hasMore; }

    public String getNextCursor() { return nextCursor; }
    public void setNextCursor(String nextCursor) { this.nextCursor = nextCursor; }
}
