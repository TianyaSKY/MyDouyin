package com.douyin.entity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * MQ message for comment events, sent to recommend service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentEventMessage implements Serializable {

    private Long commentId;

    private Long userId;

    private Long videoId;

    private String content;

    private Long parentId;

    private Long createdAtMs;
}
