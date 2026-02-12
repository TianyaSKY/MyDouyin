package com.douyin.mq;

import com.douyin.config.RabbitMQConfig;
import com.douyin.entity.UserEvent;
import com.douyin.enums.EventType;
import com.douyin.service.UserEmbeddingService;
import com.douyin.service.UserEventService;
import com.douyin.service.VideoStatsDailyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserEventConsumer {

    private final UserEventService userEventService;
    private final VideoStatsDailyService videoStatsDailyService;
    private final UserEmbeddingService userEmbeddingService;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_NAME)
    public void handleUserEvent(UserEvent event) {
        if (event.getTs() == null) {
            event.setTs(java.time.LocalDateTime.now());
        }
        log.info("Received UserEvent: userId={}, videoId={}, type={}",
                event.getUserId(), event.getVideoId(), event.getEventType());

        try {
            // 1. Save raw event log
            // Note: In high QPS scenarios, we might batch insert or use ClickHouse.
            // For MVP, MySQL single insert is acceptable.
            userEventService.save(event);

            // 2. Aggregate stats
            videoStatsDailyService.incrementStats(
                    event.getVideoId(),
                    event.getEventType(),
                    event.getWatchMs() != null ? event.getWatchMs() : 0
            );

            // 3. Update user realtime embedding vector
            if (shouldUpdateUserTags(event.getEventType())) {
                userEmbeddingService.updateRealtimeVector(
                    event.getUserId(),
                    event.getVideoId(),
                    event.getEventType()
                );
            }

        } catch (Exception e) {
            log.error("Failed to process UserEvent: {}", event, e);
            // In production, we might want to throw exception to retry or send to DLQ.
            // For now, just log error.
        }
    }

    /**
     * 判断是否需要更新用户标签
     * 曝光事件权重太低，可以选择性忽略
     */
    private boolean shouldUpdateUserTags(EventType eventType) {
        return eventType == EventType.CLICK 
            || eventType == EventType.LIKE 
            || eventType == EventType.FINISH 
            || eventType == EventType.SHARE;
    }
}
