package com.douyin.service;

import com.douyin.dto.UploadCompleteRequest;
import com.douyin.dto.UploadCompleteResponse;
import com.douyin.dto.UploadInitRequest;
import com.douyin.dto.UploadInitResponse;
import org.springframework.web.multipart.MultipartFile;

public interface VideoUploadService {

    UploadInitResponse initUpload(UploadInitRequest request);

    void uploadChunk(String uploadId, Integer chunkIndex, MultipartFile chunk);

    UploadCompleteResponse completeUpload(UploadCompleteRequest request);
}
