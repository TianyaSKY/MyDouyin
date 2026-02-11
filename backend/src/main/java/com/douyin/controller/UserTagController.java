package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.service.UserTagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 用户标签管理接口
 */
@RestController
@RequestMapping("/api/user-tags")
@RequiredArgsConstructor
public class UserTagController {

    private final UserTagService userTagService;

    /**
     * 获取用户兴趣标签
     */
    @GetMapping("/{userId}")
    public Result<Map<String, Double>> getUserTags(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "10") int topN) {
        Map<String, Double> tags = userTagService.getUserTopTags(userId, topN);
        return Result.success(tags);
    }

    /**
     * 手动触发标签衰减（测试用）
     */
    @PostMapping("/{userId}/decay")
    public Result<String> decayUserTags(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0.95") double decayFactor) {
        userTagService.decayUserTags(userId, decayFactor);
        return Result.success("标签衰减成功");
    }
}

