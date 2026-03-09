package com.douyin.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import lombok.Getter;

/**
 * Video status enum, maps to `videos.status` TINYINT column.
 */
@Getter
public enum VideoStatus {

    REVIEW(0, "待审核"),
    PUBLISHED(1, "已发布"),
    DELETED(2, "已删除");

    @EnumValue
    private final int code;
    private final String description;

    VideoStatus(int code, String description) {
        this.code = code;
        this.description = description;
    }
}
