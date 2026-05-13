package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 评论趋势 — 每日评论数
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentTrendDTO {

    /** 日期 */
    private String date;

    /** 当日评论数 */
    private Long count;
}
