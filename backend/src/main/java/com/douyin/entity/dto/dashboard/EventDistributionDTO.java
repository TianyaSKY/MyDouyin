package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 事件类型分布数据（用于环形图 / 饼图）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventDistributionDTO {

    /** 事件类型名称（如 impr, click, like, finish, share, comment） */
    private String eventType;

    /** 事件数量 */
    private Long count;
}
