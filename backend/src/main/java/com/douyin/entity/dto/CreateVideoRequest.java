package com.douyin.entity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateVideoRequest {

    @NotNull(message = "authorId 不能为空")
    @Positive(message = "authorId 必须为正数")
    private Long authorId;

    @NotBlank(message = "标题不能为空")
    @Size(max = 100, message = "标题长度不能超过 100")
    private String title;

    @Size(max = 10, message = "标签数量不能超过 10")
    private List<@NotBlank(message = "标签不能为空") @Size(max = 20, message = "单个标签长度不能超过 20") String> tags;

    @NotBlank(message = "封面地址不能为空")
    @Size(max = 1024, message = "封面地址长度不能超过 1024")
    private String coverUrl;

    @NotBlank(message = "视频地址不能为空")
    @Size(max = 1024, message = "视频地址长度不能超过 1024")
    private String videoUrl;
}
