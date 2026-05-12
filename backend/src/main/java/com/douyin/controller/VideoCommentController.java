package com.douyin.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.douyin.common.Result;
import com.douyin.common.config.RabbitMQConfig;
import com.douyin.entity.VideoComment;
import com.douyin.entity.dto.CommentEventMessage;
import com.douyin.entity.dto.CommentRequest;
import com.douyin.service.VideoCommentService;
import com.douyin.service.security.JwtUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class VideoCommentController {

    private final VideoCommentService videoCommentService;
    private final RabbitTemplate rabbitTemplate;

    /**
     * POST /api/comments - Create a comment
     */
    @PostMapping
    public Result<VideoComment> create(
            @AuthenticationPrincipal JwtUserDetails userDetails,
            @Valid @RequestBody CommentRequest request) {

        VideoComment comment = new VideoComment();
        comment.setUserId(userDetails.getUserId());
        comment.setVideoId(request.getVideoId());
        comment.setContent(request.getContent());
        comment.setParentId(request.getParentId());
        comment.setStatus(1);
        comment.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Shanghai")));

        videoCommentService.save(comment);

        // Send comment event to MQ for recommend service to process
        CommentEventMessage message = new CommentEventMessage(
                comment.getId(),
                comment.getUserId(),
                comment.getVideoId(),
                comment.getContent(),
                comment.getParentId(),
                comment.getCreatedAt().atZone(ZoneId.of("Asia/Shanghai")).toInstant().toEpochMilli()
        );
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.COMMENT_ROUTING_KEY,
                message
        );

        // Enrich the response with user info
        comment.setNickname(userDetails.getUsername());

        return Result.ok(comment);
    }

    /**
     * GET /api/comments/video/{videoId} - List comments for a video (paginated)
     */
    @GetMapping("/video/{videoId}")
    public Result<IPage<VideoComment>> listByVideo(
            @PathVariable Long videoId,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(videoCommentService.pageByVideoId(videoId, current, size));
    }

    /**
     * GET /api/comments/{commentId}/replies - List replies for a comment (paginated)
     */
    @GetMapping("/{commentId}/replies")
    public Result<IPage<VideoComment>> listReplies(
            @PathVariable Long commentId,
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "20") int size) {
        return Result.ok(videoCommentService.pageReplies(commentId, current, size));
    }

    /**
     * GET /api/comments/video/{videoId}/count - Get comment count for a video
     */
    @GetMapping("/video/{videoId}/count")
    public Result<Long> countByVideo(@PathVariable Long videoId) {
        return Result.ok(videoCommentService.countByVideoId(videoId));
    }

    /**
     * DELETE /api/comments/{id} - Delete (soft) a comment (only by the author)
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(
            @AuthenticationPrincipal JwtUserDetails userDetails,
            @PathVariable Long id) {

        VideoComment comment = videoCommentService.getById(id);
        if (comment == null) {
            return Result.fail(404, "评论不存在");
        }
        if (!comment.getUserId().equals(userDetails.getUserId())) {
            return Result.fail(403, "无权删除此评论");
        }

        comment.setStatus(0);
        videoCommentService.updateById(comment);
        return Result.ok();
    }
}
