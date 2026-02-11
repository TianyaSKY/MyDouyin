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
 * 
 * @deprecated 用户兴趣已改用向量存储，标签衰减任务已废弃
 * 向量更新由离线任务处理
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Deprecated
public class UserTagScheduler {

    private final UserProfileService userProfileService;
    private final UserTagService userTagService;

    /**
     * 每天凌晨2点执行标签衰减
     * 
     * @deprecated 已废弃，向量更新由离线任务处理
     */
    // @Scheduled(cron = "0 0 2 * * ?")  // 已禁用
    @Deprecated
    public void decayAllUserTags() {
        log.info("User tag decay task is deprecated, skipping...");
        // 不再执行标签衰减
    }
}

