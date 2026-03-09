package com.douyin.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonCreator;
import lombok.Getter;

import java.util.Arrays;

/**
 * User event type enum, maps to `user_events.event_type` ENUM column.
 */
@Getter
public enum EventType {

    IMPR("impr", "曝光"),
    CLICK("click", "点击"),
    LIKE("like", "点赞"),
    FINISH("finish", "完播"),
    SHARE("share", "分享"),
    LEAVE("leave", "离开");

    @EnumValue
    private final String value;
    private final String description;

    EventType(String value, String description) {
        this.value = value;
        this.description = description;
    }
}
