package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 视频状态分布数据（审核中/已发布/已删除）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoStatusDistDTO {

    /** 状态名 */
    private String statusName;

    /** 状态码 */
    private Integer statusCode;

    /** 数量 */
    private Long count;
}
