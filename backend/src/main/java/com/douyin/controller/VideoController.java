package com.douyin.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.douyin.common.Result;
import com.douyin.entity.dto.UploadCompleteRequest;
import com.douyin.entity.dto.UploadCompleteResponse;
import com.douyin.entity.dto.UploadInitRequest;
import com.douyin.entity.dto.UploadInitResponse;
import com.douyin.entity.Video;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.service.VideoService;
import com.douyin.service.VideoUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/videos")
@RequiredArgsConstructor
public class VideoController {

    private final VideoService videoService;
    private final VideoUploadService videoUploadService;

    /**
     * GET /api/videos/{id} - Get video by ID
     */
    @GetMapping("/{id}")
    public Result<Video> getById(@PathVariable Long id) {
        Video video = videoService.getById(id);
        return video != null ? Result.ok(video) : Result.fail(404, "Video not found");
    }

    /**
     * GET /api/videos - List published videos with pagination
     */
    @GetMapping
    public Result<IPage<Video>> list(
            @RequestParam(defaultValue = "PUBLISHED") VideoStatus status,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(videoService.pageByStatus(status, current, size));
    }

    /**
     * GET /api/videos/author/{authorId} - List videos by author
     */
    @GetMapping("/author/{authorId}")
    public Result<IPage<Video>> listByAuthor(
            @PathVariable Long authorId,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(videoService.pageByAuthor(authorId, current, size));
    }

    /**
     * POST /api/videos - Create (upload metadata)
     */
    @PostMapping
    public Result<Video> create(@Valid @RequestBody Video video) {
        video.setStatus(VideoStatus.REVIEW); // New videos start as REVIEW
        videoService.save(video);
        return Result.ok(video);
    }

    /**
     * PUT /api/videos/{id} - Update video metadata
     */
    @PutMapping("/{id}")
    public Result<Video> update(@PathVariable Long id, @Valid @RequestBody Video video) {
        video.setId(id);
        boolean updated = videoService.updateById(video);
        return updated ? Result.ok(video) : Result.fail(404, "Video not found");
    }

    /**
     * PUT /api/videos/{id}/status - Update video status (publish / delete)
     */
    @PutMapping("/{id}/status")
    public Result<Void> updateStatus(@PathVariable Long id, @RequestParam VideoStatus status) {
        Video video = new Video();
        video.setId(id);
        video.setStatus(status);
        boolean updated = videoService.updateById(video);
        return updated ? Result.ok() : Result.fail(404, "Video not found");
    }

    /**
     * DELETE /api/videos/{id} - Delete video
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        boolean removed = videoService.removeById(id);
        return removed ? Result.ok() : Result.fail(404, "Video not found");
    }

    /**
     * POST /api/videos/upload/init - Initialize chunk upload and hash instant upload check
     */
    @PostMapping("/upload/init")
    public Result<UploadInitResponse> initUpload(@Valid @RequestBody UploadInitRequest request) {
        return Result.ok(videoUploadService.initUpload(request));
    }

    /**
     * POST /api/videos/upload/chunk - Upload one chunk
     */
    @PostMapping(value = "/upload/chunk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<Void> uploadChunk(@RequestParam String uploadId,
                                    @RequestParam Integer chunkIndex,
                                    @RequestPart("chunk") MultipartFile chunk) {
        videoUploadService.uploadChunk(uploadId, chunkIndex, chunk);
        return Result.ok();
    }

    /**
     * POST /api/videos/upload/complete - Merge chunks and finalize upload
     */
    @PostMapping("/upload/complete")
    public Result<UploadCompleteResponse> completeUpload(@Valid @RequestBody UploadCompleteRequest request) {
        return Result.ok(videoUploadService.completeUpload(request));
    }
}
