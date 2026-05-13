package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 评论与情感分析概览
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentOverviewDTO {

    /** 总评论数 */
    private Long totalComments;

    /** 今日新增评论 */
    private Long todayComments;

    /** 已分析情感的评论数 */
    private Long analyzedComments;

    /** 正面评论数（sentiment_score >= 0.6） */
    private Long positiveComments;

    /** 负面评论数（sentiment_score < 0.4） */
    private Long negativeComments;

    /** 平均情感分 */
    private Double avgSentimentScore;

    /** 评论用户数 */
    private Long commentUsers;

    /** 被评论视频数 */
    private Long commentedVideos;
}
