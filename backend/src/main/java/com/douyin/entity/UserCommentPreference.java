package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Maps to `user_comment_preferences` table.
 * Stores preference scores computed by the recommendation service.
 */
@Data
@TableName("user_comment_preferences")
public class UserCommentPreference {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long videoId;

    private Long commentId;

    private Double preferenceScore;

    private LocalDateTime createdAt;
}
