package com.douyin.client;

import com.douyin.common.config.RabbitMQConfig;
import com.douyin.entity.UserCommentPreference;
import com.douyin.entity.UserEvent;
import com.douyin.entity.dto.CommentEventMessage;
import com.douyin.entity.enums.EventType;
import com.douyin.mapper.UserCommentPreferenceMapper;
import com.douyin.service.UserEventService;
import com.douyin.service.VideoStatsDailyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

/**
 * Consumes comment events from RabbitMQ.
 * 1. Records a user_event (type = COMMENT)
 * 2. Increments comment_cnt in video_daily_stats
 * 3. Calls recommend service to compute preference score
 * 4. Writes preference score back to user_comment_preferences table
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CommentEventConsumer {

    private final UserEventService userEventService;
    private final VideoStatsDailyService videoStatsDailyService;
    private final RecommendServiceClient recommendServiceClient;
    private final UserCommentPreferenceMapper userCommentPreferenceMapper;

    @RabbitListener(queues = RabbitMQConfig.COMMENT_QUEUE_NAME)
    public void handleCommentEvent(CommentEventMessage message) {
        if (message == null || message.getCommentId() == null) {
            log.warn("Skip empty comment event message");
            return;
        }

        log.info("Received CommentEvent: userId={}, videoId={}, commentId={}",
                message.getUserId(), message.getVideoId(), message.getCommentId());

        try {
            // 1. Save raw user event log
            UserEvent event = new UserEvent();
            event.setUserId(message.getUserId());
            event.setVideoId(message.getVideoId());
            event.setEventType(EventType.COMMENT);
            event.setWatchMs(0);

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("commentId", message.getCommentId());
            ctx.put("contentLength", message.getContent() != null ? message.getContent().length() : 0);
            if (message.getParentId() != null) {
                ctx.put("parentId", message.getParentId());
                ctx.put("isReply", true);
            }
            event.setCtx(ctx);

            if (message.getCreatedAtMs() != null) {
                event.setTs(LocalDateTime.ofInstant(
                        Instant.ofEpochMilli(message.getCreatedAtMs()),
                        ZoneId.of("Asia/Shanghai")));
            } else {
                event.setTs(LocalDateTime.now(ZoneId.of("Asia/Shanghai")));
            }

            userEventService.save(event);

            // 2. Increment comment_cnt in video_daily_stats
            videoStatsDailyService.incrementStats(
                    message.getVideoId(),
                    EventType.COMMENT,
                    0
            );

            // 3. Call recommend service to compute preference score
            Double preferenceScore = recommendServiceClient.computeCommentPreference(
                    message.getUserId(),
                    message.getVideoId(),
                    message.getCommentId(),
                    message.getContent()
            );

            // 4. Write preference score back to DB
            if (preferenceScore != null) {
                UserCommentPreference preference = new UserCommentPreference();
                preference.setUserId(message.getUserId());
                preference.setVideoId(message.getVideoId());
                preference.setCommentId(message.getCommentId());
                preference.setPreferenceScore(preferenceScore);
                userCommentPreferenceMapper.insert(preference);

                log.info("Preference score saved: userId={}, videoId={}, commentId={}, score={}",
                        message.getUserId(), message.getVideoId(),
                        message.getCommentId(), preferenceScore);
            }

        } catch (Exception e) {
            log.error("Failed to process CommentEvent: {}", message, e);
        }
    }
}
