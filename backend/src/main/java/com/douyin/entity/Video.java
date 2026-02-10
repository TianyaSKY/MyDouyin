package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.douyin.enums.VideoStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Maps to `video` table.
 */
@Data
@TableName(value = "video", autoResultMap = true)
public class Video {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long authorId;

    private String title;

    /**
     * List of tags (stored as JSON array in MySQL).
     */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> tags;

    private VideoStatus status;

    private String coverUrl;

    private String videoUrl;

    private LocalDateTime createdAt;
}
