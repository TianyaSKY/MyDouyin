package com.douyin.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

/**
 * User event type enum, maps to `user_event.event_type` ENUM column.
 */
@Getter
public enum EventType {

    IMPR("impr", "曝光"),
    CLICK("click", "点击"),
    LIKE("like", "点赞"),
    FINISH("finish", "完播"),
    SHARE("share", "分享");

    @EnumValue
    private final String value;
    private final String description;

    EventType(String value, String description) {
        this.value = value;
        this.description = description;
    }
}
