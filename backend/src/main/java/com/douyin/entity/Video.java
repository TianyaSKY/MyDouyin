package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.douyin.entity.enums.VideoStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Maps to `videos` table.
 */
@Data
@TableName("videos")
public class Video {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long authorId;

    private String title;

    @TableField(exist = false)
    private List<String> tags;

    private VideoStatus status;

    private String coverUrl;

    private String videoUrl;

    private LocalDateTime createdAt;

    @TableField(exist = false)
    private Long likeCount;

    @TableField(exist = false)
    private Long viewCount;
}
