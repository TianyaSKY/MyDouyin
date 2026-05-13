package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 最近事件数据（用于实时事件流展示）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentEventDTO {

    /** 事件ID */
    private Long eventId;

    /** 用户ID */
    private Long userId;

    /** 用户昵称 */
    private String nickname;

    /** 视频ID */
    private Long videoId;

    /** 视频标题 */
    private String videoTitle;

    /** 事件类型 */
    private String eventType;

    /** 事件时间 */
    private String ts;
}
