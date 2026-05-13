package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 评论最多的视频排行
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopCommentedVideoDTO {

    /** 视频ID */
    private Long videoId;

    /** 视频标题 */
    private String title;

    /** 封面URL */
    private String coverUrl;

    /** 作者名称 */
    private String authorName;

    /** 评论数 */
    private Long commentCount;

    /** 平均情感分 (0-1, null if no sentiment data) */
    private Double avgSentiment;
}
