package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.douyin.entity.Video;
import com.douyin.entity.VideoTag;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.entity.enums.VideoStatus;
import com.douyin.mapper.VideoMapper;
import com.douyin.mapper.VideoTagMapper;
import com.douyin.service.VideoService;
import com.douyin.service.VideoStatsDailyService;
import org.springframework.cache.annotation.Caching;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@lombok.RequiredArgsConstructor
public class VideoServiceImpl extends ServiceImpl<VideoMapper, Video>
        implements VideoService {

    private final VideoStatsDailyService videoStatsDailyService;
    private final VideoTagMapper videoTagMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String TAG_VECTOR_CACHE_KEY = "recommend:tag:vectors";
    private static final int VECTOR_DIM = 1024;

    @Override
    @Cacheable(cacheNames = "videoDetail", key = "#id", condition = "#id != null")
    public Video getById(Serializable id) {
        Video video = super.getById(id);
        populateTags(video);
        return video;
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "videoDetail", key = "#entity.id", condition = "#entity != null && #entity.id != null"),
            @CacheEvict(cacheNames = "videoDetail", key = "'administrator_publish_video'"),
            @CacheEvict(cacheNames = "videoDetail", key = "'administrator_publish_tags'")
    })
    public boolean updateById(Video entity) {
        if (entity == null || entity.getId() == null) {
            return false;
        }

        if (entity.getTags() != null) {
            entity.setTags(normalizeTags(entity.getTags()));
        }

        boolean updated;
        if (hasPersistedFields(entity)) {
            updated = super.updateById(entity);
        } else {
            updated = super.getById(entity.getId()) != null;
        }

        if (updated && entity.getTags() != null) {
            replaceTags(entity.getId(), entity.getTags());
        }

        return updated;
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "videoDetail", key = "#id", condition = "#id != null"),
            @CacheEvict(cacheNames = "videoDetail", key = "'administrator_publish_video'"),
            @CacheEvict(cacheNames = "videoDetail", key = "'administrator_publish_tags'")
    })
    public boolean removeById(Serializable id) {
        boolean removed = super.removeById(id);
        if (removed) {
            videoTagMapper.delete(new LambdaQueryWrapper<VideoTag>()
                    .eq(VideoTag::getVideoId, id));
        }
        return removed;
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "videoDetail", key = "#entity.id", condition = "#entity != null && #entity.id != null"),
            @CacheEvict(cacheNames = "videoDetail", key = "'administrator_publish_video'"),
            @CacheEvict(cacheNames = "videoDetail", key = "'administrator_publish_tags'")
    })
    public boolean save(Video entity) {
        if (entity == null) {
            return false;
        }

        entity.setTags(normalizeTags(entity.getTags()));
        boolean saved = super.save(entity);
        if (saved) {
            replaceTags(entity.getId(), entity.getTags());
        }
        return saved;
    }

    @Override
    public IPage<Video> pageByStatus(VideoStatus status, int current, int size) {
        IPage<Video> page = page(new Page<>(current, size),
                new LambdaQueryWrapper<Video>()
                        .eq(Video::getStatus, status)
                        .orderByDesc(Video::getCreatedAt));
        populateTags(page.getRecords());
        populateStats(page);
        return page;
    }

    @Override
    public IPage<Video> pageByAuthor(Long authorId, int current, int size) {
        IPage<Video> page = page(new Page<>(current, size),
                new LambdaQueryWrapper<Video>()
                        .eq(Video::getAuthorId, authorId)
                        .orderByDesc(Video::getCreatedAt)
                        .orderByDesc(Video::getId));
        populateTags(page.getRecords());
        populateStats(page);
        return page;
    }

    @Override
    public List<Video> list() {
        List<Video> videos = super.list();
        populateTags(videos);
        return videos;
    }

    @Override
    public List<Video> list(Wrapper<Video> queryWrapper) {
        List<Video> videos = super.list(queryWrapper);
        populateTags(videos);
        return videos;
    }

    @Override
    public List<Video> listByIds(Collection<? extends Serializable> idList) {
        List<Video> videos = super.listByIds(idList);
        populateTags(videos);
        return videos;
    }

    @Override
    @Cacheable(
            cacheNames = "videoDetail",
            key = "'administrator_publish_video'"
    )
    public List<Video> listByAdminPublish() {
        List<Video> videos = baseMapper.selectPublishedByAdmin();
        populateTags(videos);
        populateStats(videos);
        return videos;
    }

    @Override
    @Cacheable(
            cacheNames = "videoDetail",
            key = "'administrator_publish_tags'"
    )
    public List<String> tagsByAdminPublish() {
        List<Video> list = baseMapper.selectPublishedByAdmin();
        populateTags(list);
        return list.stream()
                .map(Video::getTags)
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .filter(Objects::nonNull)
                .collect(Collectors.collectingAndThen(
                        Collectors.toCollection(LinkedHashSet::new),
                        ArrayList::new
                ));
    }

    @Override
    public List<Float> averageVectorInfoByTags(List<String> tags) {
        List<String> normalizedTags = normalizeTags(tags);
        if (normalizedTags.isEmpty()) {
            return zeroVector();
        }

        float[] sum = new float[VECTOR_DIM];
        int matchedCount = 0;
        for (String tag : normalizedTags) {
            Object cached = redisTemplate.opsForHash().get(TAG_VECTOR_CACHE_KEY, tag);
            List<Float> vector = castVector(cached);
            if (vector.size() != VECTOR_DIM) {
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


    private void populateStats(IPage<Video> page) {
        if (page != null) {
            populateStats(page.getRecords());
        }
    }

    private void populateStats(List<Video> videos) {
        if (videos == null) {
            return;
        }
        for (Video video : videos) {
            VideoStatsDaily stats = videoStatsDailyService.getTotalStatsByVideo(video.getId());
            if (stats != null) {
                video.setLikeCount(stats.getLikeCnt());
                video.setViewCount(stats.getImprCnt());
            } else {
                video.setLikeCount(0L);
                video.setViewCount(0L);
            }
        }
    }

    private void populateTags(Video video) {
        if (video == null) {
            return;
        }
        populateTags(List.of(video));
    }

    private void populateTags(List<Video> videos) {
        if (videos == null || videos.isEmpty()) {
            return;
        }

        List<Long> videoIds = videos.stream()
                .map(Video::getId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        if (videoIds.isEmpty()) {
            videos.forEach(video -> video.setTags(List.of()));
            return;
        }

        List<VideoTag> videoTags = videoTagMapper.selectList(new LambdaQueryWrapper<VideoTag>()
                .in(VideoTag::getVideoId, videoIds)
                .orderByAsc(VideoTag::getVideoId)
                .orderByAsc(VideoTag::getSortOrder)
                .orderByAsc(VideoTag::getId));

        Map<Long, List<String>> tagMap = new HashMap<>();
        if (videoTags != null) {
            for (VideoTag videoTag : videoTags) {
                tagMap.computeIfAbsent(videoTag.getVideoId(), ignored -> new ArrayList<>())
                        .add(videoTag.getTagName());
            }
        }

        for (Video video : videos) {
            List<String> tags = tagMap.get(video.getId());
            video.setTags(tags == null ? List.of() : tags);
        }
    }

    private void replaceTags(Long videoId, List<String> tags) {
        if (videoId == null) {
            return;
        }

        videoTagMapper.delete(new LambdaQueryWrapper<VideoTag>()
                .eq(VideoTag::getVideoId, videoId));

        List<String> normalizedTags = normalizeTags(tags);
        for (int i = 0; i < normalizedTags.size(); i++) {
            VideoTag videoTag = new VideoTag();
            videoTag.setVideoId(videoId);
            videoTag.setTagName(normalizedTags.get(i));
            videoTag.setSortOrder(i);
            videoTagMapper.insert(videoTag);
        }
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return Collections.emptyList();
        }

        return tags.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .collect(Collectors.collectingAndThen(
                        Collectors.toCollection(LinkedHashSet::new),
                        ArrayList::new
                ));
    }

    private List<Float> castVector(Object cached) {
        if (!(cached instanceof List<?> list)) {
            return List.of();
        }

        List<Float> vector = new ArrayList<>(list.size());
        for (Object item : list) {
            if (!(item instanceof Number number)) {
                return List.of();
            }
            vector.add(number.floatValue());
        }
        return vector;
    }

    private List<Float> zeroVector() {
        return new ArrayList<>(Collections.nCopies(VECTOR_DIM, 0.0f));
    }

    private boolean hasPersistedFields(Video entity) {
        return entity.getAuthorId() != null
                || entity.getTitle() != null
                || entity.getStatus() != null
                || entity.getCoverUrl() != null
                || entity.getVideoUrl() != null
                || entity.getCreatedAt() != null;
    }
}
