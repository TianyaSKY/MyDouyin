package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 情感分布 — 正面/中性/负面 评论数
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SentimentDistDTO {

    /** 情感标签: positive / neutral / negative */
    private String label;

    /** 数量 */
    private Long count;
}
