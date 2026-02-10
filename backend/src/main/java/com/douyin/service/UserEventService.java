package com.douyin.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.douyin.entity.UserEvent;
import com.douyin.enums.EventType;

import java.util.List;

public interface UserEventService extends IService<UserEvent> {

    /**
     * Get paginated events for a specific user.
     */
    IPage<UserEvent> pageByUserId(Long userId, int current, int size);

    /**
     * Get events for a specific user and video.
     */
    List<UserEvent> getByUserAndVideo(Long userId, Long videoId);

    /**
     * Get events filtered by event type.
     */
    IPage<UserEvent> pageByEventType(EventType eventType, int current, int size);
}
