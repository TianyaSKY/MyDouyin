package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Maps to `video_comments` table.
 */
@Data
@TableName("video_comments")
public class VideoComment {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long videoId;

    private String content;

    private Long parentId;

    /**
     * 1: active, 0: deleted
     */
    private Integer status;

    private LocalDateTime createdAt;

    // ---- Transient fields (not in DB) ----

    @TableField(exist = false)
    private String nickname;

    @TableField(exist = false)
    private String avatarUrl;

    @TableField(exist = false)
    private Integer replyCount;
}
