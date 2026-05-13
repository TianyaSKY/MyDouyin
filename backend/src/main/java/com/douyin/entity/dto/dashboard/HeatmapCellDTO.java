package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 行为热力图单元格数据（小时 × 星期）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeatmapCellDTO {

    /** 星期几 (0=周一, 6=周日) */
    private Integer dayOfWeek;

    /** 小时 (0-23) */
    private Integer hour;

    /** 事件数量 */
    private Long count;
}
