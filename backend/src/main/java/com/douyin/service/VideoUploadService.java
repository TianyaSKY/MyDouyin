package com.douyin.service;

import com.douyin.entity.dto.UploadCompleteRequest;
import com.douyin.entity.dto.UploadCompleteResponse;
import com.douyin.entity.dto.UploadInitRequest;
import com.douyin.entity.dto.UploadInitResponse;
import org.springframework.web.multipart.MultipartFile;

public interface VideoUploadService {

    UploadInitResponse initUpload(UploadInitRequest request);

    void uploadChunk(String uploadId, Integer chunkIndex, MultipartFile chunk);

    UploadCompleteResponse completeUpload(UploadCompleteRequest request);
}
