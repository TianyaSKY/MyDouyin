package com.douyin.entity.dto;

import lombok.Data;

@Data
public class UploadCompleteResponse {

    private String fileHash;
    private String videoUrl;
}
