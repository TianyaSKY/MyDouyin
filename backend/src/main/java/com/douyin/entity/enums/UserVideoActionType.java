package com.douyin.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

@Getter
public enum UserVideoActionType {
    LIKE("like"),
    FAVORITE("favorite");

    @EnumValue
    private final String value;

    UserVideoActionType(String value) {
        this.value = value;
    }
}
