package com.douyin.client;

import com.douyin.common.config.RabbitMQConfig;
import com.douyin.entity.Video;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.entity.dto.VideoEmbeddingTaskMessage;
import com.douyin.service.VideoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class VideoEmbeddingConsumer {

    private static final String VIDEO_EMBED_DONE_KEY_PREFIX = "video:embedding:done:";
    private static final int VECTOR_DIM = 128;

    private final RecommendServiceClient recommendServiceClient;
    private final VideoService videoService;
    private final RedisTemplate<String, Object> redisTemplate;

    @RabbitListener(queues = RabbitMQConfig.VIDEO_EMBEDDING_QUEUE_NAME)
    public void handleVideoCreated(VideoEmbeddingTaskMessage message) {
        if (message == null || message.getVideoId() == null) {
            log.warn("Skip empty video embedding message");
            return;
        }

        Long videoId = message.getVideoId();
        String doneKey = VIDEO_EMBED_DONE_KEY_PREFIX + videoId;
        if (redisTemplate.hasKey(doneKey)) {
            log.debug("Video embedding already processed, skip. videoId={}", videoId);
            return;
        }

        try {
            Video video = videoService.getById(videoId);
            if (video == null) {
                log.warn("Video not found when processing embedding task. videoId={}", videoId);
                return;
            }

            String title = video.getTitle() != null ? video.getTitle() : "";
            List<String> tags = video.getTags() != null ? video.getTags() : List.of();

            List<Float> embedding = recommendServiceClient.generateVideoEmbedding(videoId, title, tags);
            if (embedding == null || embedding.size() != VECTOR_DIM) {
                log.warn("Invalid video embedding generated. videoId={}, dimension={}",
                        videoId, embedding == null ? 0 : embedding.size());
                return;
            }

            long createdTs = video.getCreatedAt() != null
                    ? video.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    : System.currentTimeMillis();

            boolean inserted = recommendServiceClient.insertVideoEmbedding(
                    videoId,
                    embedding,
                    video.getAuthorId(),
                    createdTs
            );

            if (!inserted) {
                log.warn("Failed to insert video embedding into Milvus. videoId={}", videoId);
                return;
            }

            if (video.getStatus() == VideoStatus.REVIEW) {
                Video toPublish = new Video();
                toPublish.setId(videoId);
                toPublish.setStatus(VideoStatus.PUBLISHED);
                boolean updated = videoService.updateById(toPublish);
                if (!updated) {
                    log.warn("Failed to update video status to PUBLISHED. videoId={}", videoId);
                }
            } else if (video.getStatus() == VideoStatus.DELETED) {
                log.info("Video is DELETED, skip auto publish after embedding. videoId={}", videoId);
            }

            redisTemplate.opsForValue().set(doneKey, "1", 30, TimeUnit.DAYS);
            log.info("Video embedding task completed. videoId={}", videoId);

        } catch (Exception e) {
            log.error("Error processing video embedding task. videoId={}", videoId, e);
        }
    }
}
