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
     * 用户向量已迁移到 Milvus，不再存储在 MySQL
     * 使用 RecommendServiceClient 调用 FastAPI 获取用户向量
     */

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
