package com.douyin.scheduler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.douyin.entity.UserProfile;
import com.douyin.service.UserProfileService;
import com.douyin.service.UserTagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 用户标签定时任务
 * 定期衰减用户标签权重，避免历史兴趣影响过大
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserTagScheduler {

    private final UserProfileService userProfileService;
    private final UserTagService userTagService;

    /**
     * 每天凌晨2点执行标签衰减
     * 衰减因子：0.98（每天衰减2%）
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void decayAllUserTags() {
        log.info("Starting daily user tag decay task...");
        
        try {
            // 分批处理用户
            int pageSize = 100;
            int currentPage = 1;
            int totalDecayed = 0;
            
            while (true) {
                List<UserProfile> users = userProfileService.list(
                    new LambdaQueryWrapper<UserProfile>()
                        .isNotNull(UserProfile::getInterestTags)
                        .last("LIMIT " + ((currentPage - 1) * pageSize) + ", " + pageSize)
                );
                
                if (users.isEmpty()) {
                    break;
                }
                
                for (UserProfile user : users) {
                    try {
                        userTagService.decayUserTags(user.getUserId(), 0.98);
                        totalDecayed++;
                    } catch (Exception e) {
                        log.error("Failed to decay tags for user: {}", user.getUserId(), e);
                    }
                }
                
                currentPage++;
            }
            
            log.info("User tag decay task completed. Total users processed: {}", totalDecayed);
            
        } catch (Exception e) {
            log.error("Error in user tag decay task", e);
        }
    }
}

