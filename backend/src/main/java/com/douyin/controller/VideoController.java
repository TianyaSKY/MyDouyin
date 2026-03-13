package com.douyin.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.douyin.common.Result;
import com.douyin.common.config.RabbitMQConfig;
import com.douyin.common.util.MediaUrlResolver;
import com.douyin.entity.dto.UploadCompleteRequest;
import com.douyin.entity.dto.UploadCompleteResponse;
import com.douyin.entity.dto.UploadInitRequest;
import com.douyin.entity.dto.UploadInitResponse;
import com.douyin.entity.dto.CreateVideoRequest;
import com.douyin.entity.dto.VideoLikeStatusResponse;
import com.douyin.entity.Video;
import com.douyin.entity.dto.VideoEmbeddingTaskMessage;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.entity.UserEvent;
import com.douyin.entity.enums.EventType;
import com.douyin.service.VideoService;
import com.douyin.service.VideoUploadService;
import com.douyin.service.UserVideoActionService;
import com.douyin.service.security.JwtUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/videos")
@RequiredArgsConstructor
public class VideoController {

    private final VideoService videoService;
    private final VideoUploadService videoUploadService;
    private final RabbitTemplate rabbitTemplate;
    private final MediaUrlResolver mediaUrlResolver;
    private final UserVideoActionService userVideoActionService;

    /**
     * GET /api/videos/{id} - Get video by ID
     */
    @GetMapping("/{id}")
    public Result<Video> getById(@PathVariable Long id) {
        Video video = videoService.getById(id);
        toPublicUrls(video);
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
        IPage<Video> page = videoService.pageByStatus(status, current, size);
        toPublicUrls(page);
        return Result.ok(page);
    }

    /**
     * GET /api/videos/author/{authorId} - List videos by author
     */
    @GetMapping("/author/{authorId}")
    public Result<IPage<Video>> listByAuthor(
            @PathVariable Long authorId,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        IPage<Video> page = videoService.pageByAuthor(authorId, current, size);
        toPublicUrls(page);
        return Result.ok(page);
    }

    /**
     * POST /api/videos - Create video record
     * 该接口仅创建视频业务记录（标题、作者、videoUrl 等），
     * 不负责二进制文件上传；文件上传走 /upload/init|chunk|complete 三段式流程。
     */
    @PostMapping
    public Result<Video> create(@Valid @RequestBody CreateVideoRequest request) {
        String coverUrl;
        String videoUrl;
        try {
            coverUrl = mediaUrlResolver.normalizeForStorage(request.getCoverUrl());
            videoUrl = mediaUrlResolver.normalizeForStorage(request.getVideoUrl());
        } catch (IllegalArgumentException e) {
            return Result.fail(400, e.getMessage());
        }

        Video video = new Video();
        video.setAuthorId(request.getAuthorId());
        video.setTitle(request.getTitle());
        video.setTags(request.getTags() == null ? List.of() : request.getTags());
        video.setCoverUrl(coverUrl);
        video.setVideoUrl(videoUrl);
        video.setStatus(VideoStatus.REVIEW); // New videos start as REVIEW
        videoService.save(video);

        VideoEmbeddingTaskMessage message = new VideoEmbeddingTaskMessage();
        message.setVideoId(video.getId());
        message.setAuthorId(video.getAuthorId());
        message.setTitle(video.getTitle());
        message.setTags(video.getTags());
        message.setVideoUrl(video.getVideoUrl());

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.VIDEO_EMBEDDING_ROUTING_KEY,
                message
        );
        toPublicUrls(video);
        return Result.ok(video);
    }

    /**
     * PUT /api/videos/{id} - Update video metadata
     */
    @PutMapping("/{id}")
    public Result<Video> update(@PathVariable Long id, @Valid @RequestBody Video video) {
        try {
            if (video.getCoverUrl() != null) {
                video.setCoverUrl(mediaUrlResolver.normalizeForStorage(video.getCoverUrl()));
            }
            if (video.getVideoUrl() != null) {
                video.setVideoUrl(mediaUrlResolver.normalizeForStorage(video.getVideoUrl()));
            }
        } catch (IllegalArgumentException e) {
            return Result.fail(400, e.getMessage());
        }

        video.setId(id);
        boolean updated = videoService.updateById(video);
        if (!updated) {
            return Result.fail(404, "Video not found");
        }

        Video updatedVideo = videoService.getById(id);
        toPublicUrls(updatedVideo);
        return Result.ok(updatedVideo);
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
     * POST /api/videos/{id}/like - 点赞（幂等）
     */
    @PostMapping("/{id}/like")
    public Result<Map<String, Object>> likeVideo(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Result.fail(401, "未登录");
        }

        boolean changed = userVideoActionService.likeVideo(userId, id);
        if (!changed) {
            Map<String, Object> data = new HashMap<>();
            data.put("liked", true);
            data.put("alreadyLiked", true);
            return Result.ok(data);
        }

        UserEvent likeEvent = new UserEvent();
        likeEvent.setUserId(userId);
        likeEvent.setVideoId(id);
        likeEvent.setEventType(EventType.LIKE);
        likeEvent.setTs(LocalDateTime.now());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY,
                likeEvent
        );

        Map<String, Object> data = new HashMap<>();
        data.put("liked", true);
        data.put("alreadyLiked", false);
        return Result.ok(data);
    }

    /**
     * DELETE /api/videos/{id}/like - 取消点赞（幂等）
     */
    @DeleteMapping("/{id}/like")
    public Result<Map<String, Object>> unlikeVideo(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        if (userId == null) {
            return Result.fail(401, "未登录");
        }

        userVideoActionService.unlikeVideo(userId, id);

        Map<String, Object> data = new HashMap<>();
        data.put("liked", false);
        return Result.ok(data);
    }

    /**
     * GET /api/videos/{id}/like - 查询点赞总数与当前用户点赞状态
     */
    @GetMapping("/{id}/like")
    public Result<VideoLikeStatusResponse> getLikeStatus(@PathVariable Long id) {
        Video video = videoService.getById(id);
        if (video == null) {
            return Result.fail(404, "Video not found");
        }

        Long userId = getCurrentUserId();
        boolean liked = userId != null && userVideoActionService.isVideoLikedByUser(userId, id);
        long likeCount = userVideoActionService.countActiveLikes(id);

        return Result.ok(new VideoLikeStatusResponse(id, likeCount, liked));
    }

    /**
     * POST /api/videos/upload/init - 初始化上传会话
     * 流程：校验 fileHash -> 判断是否可秒传 -> 返回 uploadId 和已上传分片列表（用于断点续传）。
     */
    @PostMapping("/upload/init")
    public Result<UploadInitResponse> initUpload(@Valid @RequestBody UploadInitRequest request) {
        UploadInitResponse response = videoUploadService.initUpload(request);
        response.setVideoUrl(mediaUrlResolver.toPublicUrl(response.getVideoUrl()));
        return Result.ok(response);
    }

    /**
     * POST /api/videos/upload/chunk - 上传单个分片
     * 参数：uploadId + chunkIndex + chunk(form-data)。
     */
    @PostMapping(value = "/upload/chunk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<Void> uploadChunk(@RequestParam String uploadId,
                                    @RequestParam Integer chunkIndex,
                                    @RequestPart("chunk") MultipartFile chunk) {
        videoUploadService.uploadChunk(uploadId, chunkIndex, chunk);
        return Result.ok();
    }

    /**
     * POST /api/videos/upload/cover - Upload cover image
     */
    @PostMapping(value = "/upload/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<String> uploadCover(@RequestPart("file") MultipartFile file) {
        return Result.ok(mediaUrlResolver.toPublicUrl(videoUploadService.uploadCover(file)));
    }

    /**
     * POST /api/videos/upload/complete - 完成上传
     * 流程：校验 uploadId/size/hash -> 合并分片 -> 落盘 -> 返回可访问 videoUrl。
     */
    @PostMapping("/upload/complete")
    public Result<UploadCompleteResponse> completeUpload(@Valid @RequestBody UploadCompleteRequest request) {
        UploadCompleteResponse response = videoUploadService.completeUpload(request);
        response.setVideoUrl(mediaUrlResolver.toPublicUrl(response.getVideoUrl()));
        return Result.ok(response);
    }

    private void toPublicUrls(IPage<Video> page) {
        if (page == null || page.getRecords() == null) {
            return;
        }
        for (Video video : page.getRecords()) {
            toPublicUrls(video);
        }
    }

    private void toPublicUrls(Video video) {
        if (video == null) {
            return;
        }
        video.setCoverUrl(mediaUrlResolver.toPublicUrl(video.getCoverUrl()));
        video.setVideoUrl(mediaUrlResolver.toPublicUrl(video.getVideoUrl()));
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof JwtUserDetails jwtUserDetails) {
            return jwtUserDetails.getUserId();
        }
        return null;
    }
}
