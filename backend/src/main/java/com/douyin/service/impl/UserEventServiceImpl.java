package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.UserEvent;
import com.douyin.enums.EventType;
import com.douyin.mapper.UserEventMapper;
import com.douyin.service.UserEventService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserEventServiceImpl extends ServiceImpl<UserEventMapper, UserEvent>
        implements UserEventService {

    @Override
    public IPage<UserEvent> pageByUserId(Long userId, int current, int size) {
        return page(new Page<>(current, size),
                new LambdaQueryWrapper<UserEvent>()
                        .eq(UserEvent::getUserId, userId)
                        .orderByDesc(UserEvent::getTs));
    }

    @Override
    public List<UserEvent> getByUserAndVideo(Long userId, Long videoId) {
        return list(new LambdaQueryWrapper<UserEvent>()
                .eq(UserEvent::getUserId, userId)
                .eq(UserEvent::getVideoId, videoId)
                .orderByDesc(UserEvent::getTs));
    }

    @Override
    public IPage<UserEvent> pageByEventType(EventType eventType, int current, int size) {
        return page(new Page<>(current, size),
                new LambdaQueryWrapper<UserEvent>()
                        .eq(UserEvent::getEventType, eventType)
                        .orderByDesc(UserEvent::getTs));
    }
}
