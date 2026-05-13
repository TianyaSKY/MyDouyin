package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 每日情感趋势 — 正面/负面评论数
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SentimentTrendDTO {

    /** 日期 */
    private String date;

    /** 正面评论数 */
    private Long positive;

    /** 负面评论数 */
    private Long negative;

    /** 平均情感分 */
    private Double avgScore;
}
