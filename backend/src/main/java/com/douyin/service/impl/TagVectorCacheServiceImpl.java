package com.douyin.service.impl;

import com.douyin.client.RecommendServiceClient;
import com.douyin.entity.Video;
import com.douyin.service.TagVectorCacheService;
import com.douyin.service.VideoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TagVectorCacheServiceImpl implements TagVectorCacheService {

    private static final String TAG_VECTOR_CACHE_KEY = "recommend:tag:vectors";
    private static final int VECTOR_DIM = 1024;

    private final VideoService videoService;
    private final RecommendServiceClient recommendServiceClient;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public void refreshTagVectors() {
        List<Video> videos = videoService.listByAdminPublish();
        if (videos == null || videos.isEmpty()) {
            redisTemplate.delete(TAG_VECTOR_CACHE_KEY);
            log.info("Cleared tag vector cache because no admin published videos exist");
            return;
        }

        List<Long> videoIds = videos.stream()
                .map(Video::getId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, List<Float>> embeddingMap = recommendServiceClient.getStoredVideoEmbeddings(videoIds);
        if (embeddingMap == null || embeddingMap.isEmpty()) {
            log.warn("Skip tag vector refresh because no stored video embeddings were returned");
            return;
        }

        Map<String, float[]> sumByTag = new LinkedHashMap<>();
        Map<String, Integer> countByTag = new LinkedHashMap<>();

        for (Video video : videos) {
            if (video == null || video.getId() == null) {
                continue;
            }
            List<Float> embedding = embeddingMap.get(video.getId());
            if (!isValidVector(embedding)) {
                continue;
            }

            Set<String> tags = normalizeTags(video.getTags());
            if (tags.isEmpty()) {
                continue;
            }

            for (String tag : tags) {
                float[] sum = sumByTag.computeIfAbsent(tag, ignored -> new float[VECTOR_DIM]);
                for (int i = 0; i < VECTOR_DIM; i++) {
                    sum[i] += embedding.get(i);
                }
                countByTag.merge(tag, 1, Integer::sum);
            }
        }

        redisTemplate.delete(TAG_VECTOR_CACHE_KEY);
        if (sumByTag.isEmpty()) {
            log.warn("Cleared tag vector cache because no valid tag vectors were aggregated");
            return;
        }

        Map<Object, Object> cacheData = new LinkedHashMap<>();
        for (Map.Entry<String, float[]> entry : sumByTag.entrySet()) {
            int count = countByTag.getOrDefault(entry.getKey(), 0);
            if (count <= 0) {
                continue;
            }
            List<Float> average = new ArrayList<>(VECTOR_DIM);
            for (float value : entry.getValue()) {
                average.add(value / count);
            }
            cacheData.put(entry.getKey(), average);
        }

        if (cacheData.isEmpty()) {
            log.warn("No tag vectors written to Redis after aggregation");
            return;
        }

        redisTemplate.opsForHash().putAll(TAG_VECTOR_CACHE_KEY, cacheData);
        redisTemplate.expire(TAG_VECTOR_CACHE_KEY, Duration.ofDays(1));
        log.info("Refreshed {} tag vectors into Redis", cacheData.size());
    }

    @Override
    public List<Float> getAverageVectorByTags(List<String> tags) {
        Set<String> normalizedTags = normalizeTags(tags);
        if (normalizedTags.isEmpty()) {
            return zeroVector();
        }

        float[] sum = new float[VECTOR_DIM];
        int matchedCount = 0;
        for (String tag : normalizedTags) {
            Object cached = redisTemplate.opsForHash().get(TAG_VECTOR_CACHE_KEY, tag);
            List<Float> vector = castVector(cached);
            if (!isValidVector(vector)) {
                continue;
            }
            for (int i = 0; i < VECTOR_DIM; i++) {
                sum[i] += vector.get(i);
            }
            matchedCount++;
        }

        if (matchedCount == 0) {
            return zeroVector();
        }

        List<Float> average = new ArrayList<>(VECTOR_DIM);
        for (float value : sum) {
            average.add(value / matchedCount);
        }
        return average;
    }

    private Set<String> normalizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return Collections.emptySet();
        }

        return tags.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<Float> castVector(Object cached) {
        if (cached instanceof List<?> list) {
            List<Float> vector = new ArrayList<>(list.size());
            for (Object item : list) {
                if (!(item instanceof Number number)) {
                    return List.of();
                }
                vector.add(number.floatValue());
            }
            return vector;
        }
        if (cached instanceof float[] array) {
            List<Float> vector = new ArrayList<>(array.length);
            for (float value : array) {
                vector.add(value);
            }
            return vector;
        }
        if (cached instanceof double[] array) {
            List<Float> vector = new ArrayList<>(array.length);
            for (double value : array) {
                vector.add((float) value);
            }
            return vector;
        }
        if (cached instanceof Object[] array) {
            return castVector(Arrays.asList(array));
        }
        return List.of();
    }

    private boolean isValidVector(List<Float> vector) {
        return vector != null && vector.size() == VECTOR_DIM;
    }

    private List<Float> zeroVector() {
        return new ArrayList<>(Collections.nCopies(VECTOR_DIM, 0.0f));
    }
}
