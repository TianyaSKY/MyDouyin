package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.douyin.entity.enums.EventType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Maps to `user_event` table.
 */
@Data
@TableName(value = "user_event", autoResultMap = true)
public class UserEvent {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long videoId;

    private EventType eventType;

    private Integer watchMs;

    /**
     * Context info: device, entry_point, timestamp etc. (JSON object).
     */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> ctx;

    private LocalDateTime ts;

    @TableField(exist = false)
    private Long tsMs;
}
