package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 通用趋势数据点（日期 + 数值），用于折线图 / 面积图 / 柱状图。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendPointDTO {

    /** 日期，格式 yyyy-MM-dd */
    private String date;

    /** 数值 */
    private Long value;
}
