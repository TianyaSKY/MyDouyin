package com.douyin.service;

import com.douyin.client.RecommendServiceClient;
import com.douyin.entity.UserProfile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 启动时检查并为缺失向量的用户补充初始向量到 Milvus。
 * 解决问题：通过 SQL 导入的老用户没经过注册流程，Milvus 中没有向量。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserVectorInitScheduler {

    private final UserProfileService userProfileService;
    private final RecommendServiceClient recommendServiceClient;
    private final TagVectorCacheService tagVectorCacheService;

    private static final int VECTOR_DIM = 1024;

    /**
     * 启动 20 秒后执行一次（等 Milvus 连接和 TagVector 缓存就绪）
     */
    @Scheduled(initialDelay = 20000, fixedDelay = Long.MAX_VALUE)
    public void initMissingUserVectors() {
        log.info("Checking for users missing vectors in Milvus...");

        try {
            List<UserProfile> allUsers = userProfileService.list();
            if (allUsers == null || allUsers.isEmpty()) {
                log.info("No users found in database, skipping vector init");
                return;
            }

            int initialized = 0;
            int skipped = 0;

            for (UserProfile user : allUsers) {
                Long userId = user.getUserId();

                // 检查 Milvus 中是否已有该用户的长期向量
                List<Float> existingVector = recommendServiceClient.getUserLongTermVector(userId);
                if (existingVector != null) {
                    skipped++;
                    continue;
                }

                // 该用户在 Milvus 中没有向量，补插一个初始向量
                List<Float> zeroVector = new ArrayList<>(Collections.nCopies(VECTOR_DIM, 0.0f));
                // 由于老用户没有保存 tags 信息，使用零向量作为兴趣向量
                List<Float> interestVector = new ArrayList<>(Collections.nCopies(VECTOR_DIM, 0.0f));

                boolean inserted = recommendServiceClient.insertUserVector(userId, zeroVector, interestVector);
                if (inserted) {
                    initialized++;
                    log.debug("Initialized vector for user {}", userId);
                } else {
                    log.warn("Failed to initialize vector for user {}", userId);
                }
            }

            log.info("User vector init completed: {} initialized, {} already existed (total {} users)",
                    initialized, skipped, allUsers.size());

        } catch (Exception e) {
            log.error("Error during user vector initialization", e);
        }
    }
}
