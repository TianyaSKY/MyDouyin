package com.tianya.application.util;

import com.tianya.application.data.api.ApiService;
import com.tianya.application.data.model.ApiResponse;
import com.tianya.application.data.model.UserEvent;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Batched event tracker. Queues events and flushes every 5 seconds or 10 events.
 */
public class EventTracker {

    private static final int BATCH_SIZE = 10;
    private static final int FLUSH_INTERVAL_SECONDS = 5;

    private final ApiService apiService;
    private final long userId;
    private final List<UserEvent> queue = new ArrayList<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public EventTracker(ApiService apiService, long userId) {
        this.apiService = apiService;
        this.userId = userId;
        scheduler.scheduleAtFixedRate(this::flush, FLUSH_INTERVAL_SECONDS,
                FLUSH_INTERVAL_SECONDS, TimeUnit.SECONDS);
    }

    public void track(long videoId, String eventType) {
        track(videoId, eventType, null, null);
    }

    public void track(long videoId, String eventType, Integer watchMs, Map<String, Object> ctx) {
        UserEvent event = new UserEvent();
        event.setUserId(userId);
        event.setVideoId(videoId);
        event.setEventType(eventType);
        event.setWatchMs(watchMs);
        event.setCtx(ctx);
        event.setTsMs(System.currentTimeMillis());

        synchronized (queue) {
            queue.add(event);
            if (queue.size() >= BATCH_SIZE) {
                flushInternal();
            }
        }
    }

    public void flush() {
        synchronized (queue) {
            flushInternal();
        }
    }

    private void flushInternal() {
        if (queue.isEmpty()) return;
        List<UserEvent> batch = new ArrayList<>(queue);
        queue.clear();

        try {
            apiService.batchReportEvents(batch).execute();
        } catch (Exception e) {
            // Silent fail for analytics
        }
    }

    public void shutdown() {
        flush();
        scheduler.shutdown();
    }
}
