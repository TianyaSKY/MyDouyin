package com.douyin.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.douyin.common.Result;
import com.douyin.entity.UserEvent;
import com.douyin.entity.enums.EventType;
import com.douyin.service.UserEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import com.douyin.common.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class UserEventController {

    private final UserEventService userEventService;
    private final RabbitTemplate rabbitTemplate;
    private static final ZoneId EVENT_ZONE = ZoneId.of("Asia/Shanghai");

    /**
     * GET /api/events/{id} - Get event by ID
     */
    @GetMapping("/{id}")
    public Result<UserEvent> getById(@PathVariable Long id) {
        UserEvent event = userEventService.getById(id);
        return event != null ? Result.ok(event) : Result.fail(404, "Event not found");
    }

    /**
     * GET /api/events/user/{userId} - List events by user (paginated)
     */
    @GetMapping("/user/{userId}")
    public Result<IPage<UserEvent>> listByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(userEventService.pageByUserId(userId, current, size));
    }

    /**
     * GET /api/events/user/{userId}/video/{videoId} - Get events for a user-video pair
     */
    @GetMapping("/user/{userId}/video/{videoId}")
    public Result<List<UserEvent>> listByUserAndVideo(
            @PathVariable Long userId,
            @PathVariable Long videoId) {
        return Result.ok(userEventService.getByUserAndVideo(userId, videoId));
    }

    /**
     * GET /api/events/type/{eventType} - List events by type (paginated)
     */
    @GetMapping("/type/{eventType}")
    public Result<IPage<UserEvent>> listByType(
            @PathVariable EventType eventType,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(userEventService.pageByEventType(eventType, current, size));
    }

    /**
     * POST /api/events - Record a user event
     */
    @PostMapping
    public Result<UserEvent> create(@Valid @RequestBody UserEvent event) {
        normalizeEventTime(event);
        // Send to MQ for async processing (save raw log + aggregate stats)
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY,
                event
        );
        // We can't return the saved ID immediately if it's async,
        // but for frontend purposes, returning the input object is usually fine.
        return Result.ok(event);
    }

    /**
     * POST /api/events/batch - Batch record events
     */
    @PostMapping("/batch")
    public Result<Void> batchCreate(@Valid @RequestBody List<UserEvent> events) {
        for (UserEvent event : events) {
            normalizeEventTime(event);
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    RabbitMQConfig.ROUTING_KEY,
                    event
            );
        }
        return Result.ok();
    }

    /**
     * DELETE /api/events/{id} - Delete event
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        boolean removed = userEventService.removeById(id);
        return removed ? Result.ok() : Result.fail(404, "Event not found");
    }

    private void normalizeEventTime(UserEvent event) {
        if (event == null) {
            return;
        }
        Long tsMs = event.getTsMs();
        if (tsMs != null) {
            event.setTs(LocalDateTime.ofInstant(Instant.ofEpochMilli(tsMs), EVENT_ZONE));
            return;
        }
        if (event.getTs() == null) {
            event.setTs(LocalDateTime.now(EVENT_ZONE));
        }
    }
}
