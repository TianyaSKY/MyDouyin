package com.douyin.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 推荐服务客户端 - 调用 FastAPI 服务
 */
@Slf4j
@Component
public class RecommendServiceClient {

    @Value("${recommend.service.url:http://localhost:8001}")
    private String recommendServiceUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public RecommendServiceClient() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 生成视频向量
     */
    public List<Float> generateVideoEmbedding(Long videoId, String title, List<String> tags) {
        try {
            String url = recommendServiceUrl + "/api/embedding/video";
            
            Map<String, Object> request = new HashMap<>();
            request.put("video_id", videoId);
            request.put("title", title);
            request.put("tags", tags);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<VideoEmbeddingResponse> response = restTemplate.postForEntity(
                url, entity, VideoEmbeddingResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Generated video embedding for video {}", videoId);
                return response.getBody().getEmbedding();
            }
            
            log.warn("Failed to generate video embedding for video {}", videoId);
            return null;
            
        } catch (Exception e) {
            log.error("Error calling recommend service for video embedding", e);
            return null;
        }
    }

    /**
     * 批量生成视频向量
     */
    public Map<Long, List<Float>> generateVideoEmbeddingsBatch(List<Long> videoIds) {
        try {
            String url = recommendServiceUrl + "/api/embedding/video/batch";
            
            Map<String, Object> request = new HashMap<>();
            request.put("video_ids", videoIds);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<BatchVideoEmbeddingResponse> response = restTemplate.postForEntity(
                url, entity, BatchVideoEmbeddingResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Generated batch video embeddings for {} videos", videoIds.size());
                return response.getBody().getEmbeddings();
            }
            
            log.warn("Failed to generate batch video embeddings");
            return new HashMap<>();
            
        } catch (Exception e) {
            log.error("Error calling recommend service for batch video embeddings", e);
            return new HashMap<>();
        }
    }

    /**
     * 计算用户向量
     */
    public List<Float> calculateUserEmbedding(Long userId, List<Map<String, Object>> recentEvents) {
        try {
            String url = recommendServiceUrl + "/api/embedding/user";
            
            Map<String, Object> request = new HashMap<>();
            request.put("user_id", userId);
            request.put("recent_events", recentEvents);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<UserEmbeddingResponse> response = restTemplate.postForEntity(
                url, entity, UserEmbeddingResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Calculated user embedding for user {}", userId);
                return response.getBody().getEmbedding();
            }
            
            log.warn("Failed to calculate user embedding for user {}", userId);
            return null;
            
        } catch (Exception e) {
            log.error("Error calling recommend service for user embedding", e);
            return null;
        }
    }

    /**
     * 精排服务
     */
    public List<RankedVideo> rankVideos(Long userId, List<Float> userEmbedding, 
                                        List<Map<String, Object>> candidates, int topK) {
        try {
            String url = recommendServiceUrl + "/api/rank";
            
            Map<String, Object> request = new HashMap<>();
            request.put("user_id", userId);
            request.put("user_embedding", userEmbedding);
            request.put("candidates", candidates);
            request.put("top_k", topK);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<RankResponse> response = restTemplate.postForEntity(
                url, entity, RankResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Ranked {} videos for user {}", candidates.size(), userId);
                return response.getBody().getRankedVideos();
            }
            
            log.warn("Failed to rank videos for user {}", userId);
            return null;
            
        } catch (Exception e) {
            log.error("Error calling recommend service for ranking", e);
            return null;
        }
    }

    /**
     * 健康检查
     */
    public boolean healthCheck() {
        try {
            String url = recommendServiceUrl + "/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            log.error("Recommend service health check failed", e);
            return false;
        }
    }

    // ==================== 响应模型 ====================

    @Data
    public static class VideoEmbeddingResponse {
        private Long videoId;
        private List<Float> embedding;
        private Integer dimension;
    }

    @Data
    public static class BatchVideoEmbeddingResponse {
        private Map<Long, List<Float>> embeddings;
        private Integer count;
    }

    @Data
    public static class UserEmbeddingResponse {
        private Long userId;
        private List<Float> embedding;
        private Integer dimension;
        private Integer eventsCount;
    }

    @Data
    public static class RankResponse {
        private Long userId;
        private List<RankedVideo> rankedVideos;
        private Integer count;
    }

    @Data
    public static class RankedVideo {
        private Long videoId;
        private Double rankScore;
        private Double recallScore;
        private Double hotScore;
    }
}

