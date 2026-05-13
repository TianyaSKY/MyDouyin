package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 活跃用户排行数据。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopUserDTO {

    /** 用户ID */
    private Long userId;

    /** 用户昵称 */
    private String nickname;

    /** 头像URL */
    private String avatarUrl;

    /** 互动次数 */
    private Long eventCount;
}
