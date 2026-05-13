package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 行为转化漏斗数据。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FunnelDTO {

    /** 曝光次数 */
    private Long impressions;

    /** 点击次数 */
    private Long clicks;

    /** 完播次数 */
    private Long finishes;

    /** 点赞次数 */
    private Long likes;

    /** 评论次数 */
    private Long comments;

    /** 分享次数 */
    private Long shares;

    /** 点击率 (clicks / impressions) */
    private Double clickRate;

    /** 完播率 (finishes / clicks) */
    private Double finishRate;

    /** 互动率 ((likes + comments + shares) / clicks) */
    private Double interactionRate;

    /** 平均观看时长(毫秒) */
    private Long avgWatchMs;
}
