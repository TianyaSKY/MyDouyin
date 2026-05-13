package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 最新评论信息（含情感分析结果）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentCommentDTO {

    /** 评论ID */
    private Long commentId;

    /** 用户ID */
    private Long userId;

    /** 用户昵称 */
    private String nickname;

    /** 用户头像 */
    private String avatarUrl;

    /** 视频ID */
    private Long videoId;

    /** 视频标题 */
    private String videoTitle;

    /** 评论内容 */
    private String content;

    /** 情感分数 (0-1, null if not analyzed) */
    private Double sentimentScore;

    /** 偏好分数 (null if not computed) */
    private Double preferenceScore;

    /** 评论时间 */
    private LocalDateTime createdAt;
}
