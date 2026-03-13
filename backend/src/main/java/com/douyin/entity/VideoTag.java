package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("video_tags")
public class VideoTag {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long videoId;

    private String tagName;

    private Integer sortOrder;

    private LocalDateTime createdAt;
}
