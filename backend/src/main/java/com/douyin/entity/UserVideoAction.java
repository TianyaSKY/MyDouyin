package com.douyin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.douyin.entity.enums.UserVideoActionType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_video_action")
public class UserVideoAction {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long videoId;

    private UserVideoActionType actionType;

    /**
     * 1: active, 0: inactive
     */
    private Integer status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
