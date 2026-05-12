package com.douyin.entity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO for creating a comment.
 */
@Data
public class CommentRequest {

    @NotNull(message = "视频ID不能为空")
    private Long videoId;

    @NotBlank(message = "评论内容不能为空")
    @Size(max = 500, message = "评论内容不能超过500字")
    private String content;

    /**
     * Parent comment ID for replies. Null for top-level comments.
     */
    private Long parentId;
}
