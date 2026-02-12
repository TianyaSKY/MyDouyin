package com.douyin.entity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class UploadCompleteRequest {

    @NotBlank(message = "uploadId cannot be blank")
    private String uploadId;

    @NotBlank(message = "fileName cannot be blank")
    private String fileName;

    @NotBlank(message = "fileHash cannot be blank")
    private String fileHash;

    @NotNull(message = "fileSize cannot be null")
    @Positive(message = "fileSize must be positive")
    private Long fileSize;

    @NotNull(message = "totalChunks cannot be null")
    @Positive(message = "totalChunks must be positive")
    private Integer totalChunks;
}
