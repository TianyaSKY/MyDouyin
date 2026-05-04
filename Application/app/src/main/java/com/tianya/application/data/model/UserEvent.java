package com.tianya.application.data.model;

import java.util.Map;

public class UserEvent {
    private Long userId;
    private Long videoId;
    private String eventType;
    private Integer watchMs;
    private Map<String, Object> ctx;
    private Long tsMs;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getVideoId() { return videoId; }
    public void setVideoId(Long videoId) { this.videoId = videoId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public Integer getWatchMs() { return watchMs; }
    public void setWatchMs(Integer watchMs) { this.watchMs = watchMs; }

    public Map<String, Object> getCtx() { return ctx; }
    public void setCtx(Map<String, Object> ctx) { this.ctx = ctx; }

    public Long getTsMs() { return tsMs; }
    public void setTsMs(Long tsMs) { this.tsMs = tsMs; }
}
