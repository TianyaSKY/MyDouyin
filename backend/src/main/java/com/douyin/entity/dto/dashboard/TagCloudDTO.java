package com.douyin.entity.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 标签云数据（用于词云图）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TagCloudDTO {

    /** 标签名 */
    private String tagName;

    /** 关联视频数量 */
    private Long videoCount;
}
