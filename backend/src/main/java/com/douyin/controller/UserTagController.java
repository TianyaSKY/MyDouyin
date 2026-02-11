package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.service.UserTagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 用户标签管理接口
 * 
 * @deprecated 用户兴趣已改用向量存储，此接口已废弃
 */
@RestController
@RequestMapping("/api/user-tags")
@RequiredArgsConstructor
@Deprecated
public class UserTagController {

    private final UserTagService userTagService;

    /**
     * 获取用户兴趣标签
     * 
     * @deprecated 用户兴趣已改用向量存储
     */
    @GetMapping("/{userId}")
    @Deprecated
    public Result<Map<String, Double>> getUserTags(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "10") int topN) {
        return Result.success(new HashMap<>());
    }

    /**
     * 手动触发标签衰减（测试用）
     * 
     * @deprecated 向量衰减由离线任务处理
     */
    @PostMapping("/{userId}/decay")
    @Deprecated
    public Result<String> decayUserTags(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0.95") double decayFactor) {
        return Result.success("标签服务已废弃，请使用向量服务");
    }
}

