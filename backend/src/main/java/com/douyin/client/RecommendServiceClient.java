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

    @Value("${recommend.service.url:http://localhost:18101}")
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
     * 插入视频向量（到 Milvus）
     */
    public boolean insertVideoEmbedding(Long videoId, List<Float> embedding, Long authorId, Long createdTs) {
        try {
            String url = recommendServiceUrl + "/api/embedding/video/insert";

            Map<String, Object> request = new HashMap<>();
            request.put("video_id", videoId);
            request.put("embedding", embedding);
            request.put("author_id", authorId);
            request.put("created_ts", createdTs);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    url, entity, Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Object success = response.getBody().get("success");
                if (success instanceof Boolean) {
                    return (Boolean) success;
                }
                return true;
            }

            log.warn("Failed to insert video embedding for video {}", videoId);
            return false;

        } catch (Exception e) {
            log.error("Error inserting video embedding for video {}", videoId, e);
            return false;
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
     * 获取用户长期向量（从 Milvus）
     */
    public List<Float> getUserLongTermVector(Long userId) {
        try {
            String url = recommendServiceUrl + "/api/user/vector/long-term/" + userId;
            
            ResponseEntity<UserVectorResponse> response = restTemplate.getForEntity(
                url, UserVectorResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Retrieved long-term vector for user {}", userId);
                return response.getBody().getVector();
            }
            
            log.debug("Long-term vector not found for user {}", userId);
            return null;
            
        } catch (Exception e) {
            log.error("Error getting long-term vector for user {}", userId, e);
            return null;
        }
    }

    /**
     * 更新用户长期向量（到 Milvus）
     */
    public boolean updateUserLongTermVector(Long userId, List<Float> vector) {
        try {
            String url = recommendServiceUrl + "/api/user/vector/long-term";
            
            Map<String, Object> request = new HashMap<>();
            request.put("user_id", userId);
            request.put("vector", vector);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                url, entity, Map.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK) {
                log.info("Updated long-term vector for user {}", userId);
                return true;
            }
            
            log.warn("Failed to update long-term vector for user {}", userId);
            return false;
            
        } catch (Exception e) {
            log.error("Error updating long-term vector for user {}", userId, e);
            return false;
        }
    }

    /**
     * 插入用户向量（到 Milvus）
     */
    public boolean insertUserVector(Long userId, List<Float> longTermVec, List<Float> interestVec) {
        try {
            String url = recommendServiceUrl + "/api/user/vector";
            
            Map<String, Object> request = new HashMap<>();
            request.put("user_id", userId);
            request.put("long_term_vec", longTermVec);
            request.put("interest_vec", interestVec);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                url, entity, Map.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK) {
                log.info("Inserted user vector for user {}", userId);
                return true;
            }
            
            log.warn("Failed to insert user vector for user {}", userId);
            return false;
            
        } catch (Exception e) {
            log.error("Error inserting user vector for user {}", userId, e);
            return false;
        }
    }

    /**
     * 向量召回
     */
    public List<Long> vectorRecall(Long userId, List<Float> userVector, int topK) {
        try {
            String url = recommendServiceUrl + "/api/recall/vector";
            
            Map<String, Object> request = new HashMap<>();
            request.put("user_id", userId);
            request.put("user_vector", userVector);
            request.put("top_k", topK);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<VectorRecallResponse> response = restTemplate.postForEntity(
                url, entity, VectorRecallResponse.class
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Vector recall found {} videos for user {}", response.getBody().getVideoIds().size(), userId);
                return response.getBody().getVideoIds();
            }
            
            log.warn("Failed to perform vector recall for user {}", userId);
            return null;
            
        } catch (Exception e) {
            log.error("Error performing vector recall for user {}", userId, e);
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

    @Data
    public static class UserVectorResponse {
        private Long userId;
        private List<Float> vector;
        private Integer dimension;
        private Long updatedAt;
    }

    @Data
    public static class VectorRecallResponse {
        private Long userId;
        private List<Long> videoIds;
        private Integer count;
    }
}

