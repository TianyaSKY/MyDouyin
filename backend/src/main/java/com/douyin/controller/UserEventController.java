package com.douyin.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.douyin.common.Result;
import com.douyin.common.util.AuthUtils;
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
        if (!canAccess(userId)) {
            return Result.fail(403, "无权限访问该用户的事件");
        }
        return Result.ok(userEventService.pageByUserId(userId, current, size));
    }

    /**
     * GET /api/events/user/{userId}/video/{videoId} - Get events for a user-video pair
     */
    @GetMapping("/user/{userId}/video/{videoId}")
    public Result<List<UserEvent>> listByUserAndVideo(
            @PathVariable Long userId,
            @PathVariable Long videoId) {
        if (!canAccess(userId)) {
            return Result.fail(403, "无权限访问该用户的事件");
        }
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
        Long userId = AuthUtils.getCurrentUserId();
        if (userId == null) {
            return Result.fail(401, "未登录");
        }
        event.setUserId(userId);
        normalizeEventTime(event);
        // Send to MQ for async processing (save raw log + aggregate stats)
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY,
                event
        );
        return Result.ok(event);
    }

    /**
     * POST /api/events/batch - Batch record events
     */
    @PostMapping("/batch")
    public Result<Void> batchCreate(@Valid @RequestBody List<UserEvent> events) {
        Long userId = AuthUtils.getCurrentUserId();
        if (userId == null) {
            return Result.fail(401, "未登录");
        }
        for (UserEvent event : events) {
            event.setUserId(userId);
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
        if (!AuthUtils.isAdmin()) {
            return Result.fail(403, "无权限删除事件");
        }
        UserEvent event = userEventService.getById(id);
        if (event == null) {
            return Result.fail(404, "Event not found");
        }
        boolean removed = userEventService.removeById(id);
        return removed ? Result.ok() : Result.fail(404, "Event not found");
    }

    private boolean canAccess(Long userId) {
        if (AuthUtils.isAdmin()) {
            return true;
        }
        Long currentUserId = AuthUtils.getCurrentUserId();
        return currentUserId != null && currentUserId.equals(userId);
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
