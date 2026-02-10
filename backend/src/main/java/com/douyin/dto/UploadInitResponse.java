package com.douyin.dto;

import lombok.Data;

import java.util.List;

@Data
public class UploadInitResponse {

    private boolean instantUpload;
    private String uploadId;
    private List<Integer> uploadedChunks;
    private String videoUrl;
}
