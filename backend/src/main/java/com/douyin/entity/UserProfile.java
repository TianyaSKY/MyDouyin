package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Maps to `user_profile` table.
 */
@Data
@TableName(value = "user_profile", autoResultMap = true)
public class UserProfile {

    @TableId(value = "user_id", type = IdType.AUTO)
    private Long userId;

    private String username;

    /**
     * BCrypt hashed password. Never serialized to JSON responses.
     */
    @JsonIgnore
    private String password;

    private String nickname;

    private String avatarUrl;

    /**
     * User interest vector for long-term recall (stored as JSON array).
     */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<Double> longVec;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
