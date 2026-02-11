package com.douyin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.entity.UserProfile;
import com.douyin.entity.Video;
import com.douyin.enums.EventType;
import com.douyin.service.UserProfileService;
import com.douyin.service.UserTagService;
import com.douyin.service.VideoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 用户标签服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserTagServiceImpl implements UserTagService {

    private final UserProfileService userProfileService;
    private final VideoService videoService;

    // 不同行为的权重增益
    private static final Map<EventType, Double> EVENT_WEIGHTS = Map.of(
        EventType.IMPR, 0.1,      // 曝光：轻微增加
        EventType.CLICK, 0.3,     // 点击：中等增加
        EventType.LIKE, 1.0,      // 点赞：强增加
        EventType.FINISH, 1.5,    // 完播：最强增加
        EventType.SHARE, 2.0      // 分享：超强增加
    );

    private static final int MAX_TAGS = 50;  // 用户最多保留50个标签
    private static final double MIN_WEIGHT = 0.01;  // 最小权重阈值

    @Override
    @Transactional
    public void updateUserTagsByEvent(Long userId, Long videoId, EventType eventType) {
        try {
            // 1. 获取用户当前标签
            UserProfile user = userProfileService.getById(userId);
            if (user == null) {
                log.warn("User not found: {}", userId);
                return;
            }

            Map<String, Double> currentTags = user.getInterestTags();
            if (currentTags == null) {
                currentTags = new HashMap<>();
            }

            // 2. 获取视频标签
            Video video = videoService.getById(videoId);
            if (video == null || video.getTags() == null || video.getTags().isEmpty()) {
                log.debug("Video {} has no tags", videoId);
                return;
            }

            // 3. 根据事件类型计算权重增益
            Double weightIncrement = EVENT_WEIGHTS.getOrDefault(eventType, 0.1);

            // 4. 更新标签权重
            for (String tag : video.getTags()) {
                if (tag == null || tag.trim().isEmpty()) {
                    continue;
                }
                tag = tag.trim();
                double currentWeight = currentTags.getOrDefault(tag, 0.0);
                double newWeight = currentWeight + weightIncrement;
                currentTags.put(tag, newWeight);
            }

            // 5. 归一化和裁剪
            currentTags = normalizeAndTrim(currentTags);

            // 6. 更新到数据库
            user.setInterestTags(currentTags);
            userProfileService.updateById(user);

            log.info("Updated user {} tags after {} event on video {}, total tags: {}", 
                userId, eventType, videoId, currentTags.size());

        } catch (Exception e) {
            log.error("Error updating user tags for user: {}, video: {}", userId, videoId, e);
        }
    }

    @Override
    public Map<String, Double> getUserTopTags(Long userId, int topN) {
        try {
            UserProfile user = userProfileService.getById(userId);
            if (user == null || user.getInterestTags() == null) {
                return new HashMap<>();
            }

            return user.getInterestTags().entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(topN)
                .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    Map.Entry::getValue,
                    (e1, e2) -> e1,
                    LinkedHashMap::new
                ));

        } catch (Exception e) {
            log.error("Error getting top tags for user: {}", userId, e);
            return new HashMap<>();
        }
    }

    @Override
    @Transactional
    public void decayUserTags(Long userId, double decayFactor) {
        try {
            if (decayFactor <= 0 || decayFactor >= 1) {
                log.warn("Invalid decay factor: {}, should be between 0 and 1", decayFactor);
                return;
            }

            UserProfile user = userProfileService.getById(userId);
            if (user == null || user.getInterestTags() == null) {
                return;
            }

            Map<String, Double> tags = user.getInterestTags();
            
            // 衰减所有标签权重
            Map<String, Double> decayedTags = new HashMap<>();
            for (Map.Entry<String, Double> entry : tags.entrySet()) {
                double newWeight = entry.getValue() * decayFactor;
                if (newWeight >= MIN_WEIGHT) {
                    decayedTags.put(entry.getKey(), newWeight);
                }
            }

            user.setInterestTags(decayedTags);
            userProfileService.updateById(user);

            log.info("Decayed user {} tags with factor {}, remaining tags: {}", 
                userId, decayFactor, decayedTags.size());

        } catch (Exception e) {
            log.error("Error decaying tags for user: {}", userId, e);
        }
    }

    /**
     * 归一化标签权重并裁剪到最大数量
     */
    private Map<String, Double> normalizeAndTrim(Map<String, Double> tags) {
        if (tags.isEmpty()) {
            return tags;
        }

        // 1. 移除权重过低的标签
        tags = tags.entrySet().stream()
            .filter(entry -> entry.getValue() >= MIN_WEIGHT)
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        // 2. 按权重排序，保留前MAX_TAGS个
        if (tags.size() > MAX_TAGS) {
            tags = tags.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(MAX_TAGS)
                .collect(Collectors.toMap(
                    Map.Entry::getKey,
                    Map.Entry::getValue,
                    (e1, e2) -> e1,
                    LinkedHashMap::new
                ));
        }

        // 3. 归一化（可选，使权重和为1）
        double sum = tags.values().stream().mapToDouble(Double::doubleValue).sum();
        if (sum > 0) {
            Map<String, Double> normalized = new HashMap<>();
            for (Map.Entry<String, Double> entry : tags.entrySet()) {
                normalized.put(entry.getKey(), entry.getValue() / sum);
            }
            return normalized;
        }

        return tags;
    }
}

