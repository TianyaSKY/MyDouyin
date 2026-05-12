package com.tianya.application.data.model;

import java.util.List;

public class UploadInitResponse {
    private String uploadId;
    private List<Integer> uploadedChunks;
    private Boolean instantUpload;
    private String videoUrl;

    public String getUploadId() { return uploadId; }
    public void setUploadId(String uploadId) { this.uploadId = uploadId; }

    public List<Integer> getUploadedChunks() { return uploadedChunks; }
    public void setUploadedChunks(List<Integer> uploadedChunks) { this.uploadedChunks = uploadedChunks; }

    public Boolean getInstantUpload() { return instantUpload; }
    public void setInstantUpload(Boolean instantUpload) { this.instantUpload = instantUpload; }

    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
}
