package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 热门视频排行数据。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopVideoDTO {

    /** 视频ID */
    private Long videoId;

    /** 视频标题 */
    private String title;

    /** 封面URL */
    private String coverUrl;

    /** 作者昵称 */
    private String authorName;

    /** 播放量 */
    private Long playCount;

    /** 点赞数 */
    private Long likeCount;

    /** 评论数 */
    private Long commentCount;

    /** 分享数 */
    private Long shareCount;
}
