package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.service.UserEmbeddingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 用户向量管理接口
 */
@RestController
@RequestMapping("/api/user-embedding")
@RequiredArgsConstructor
public class UserEmbeddingController {

    private final UserEmbeddingService userEmbeddingService;

    /**
     * 获取用户实时向量
     */
    @GetMapping("/{userId}/realtime")
    public Result<List<Float>> getRealtimeVector(@PathVariable Long userId) {
        List<Float> vector = userEmbeddingService.getUserRealtimeVector(userId);
        return Result.ok(vector);
    }

    /**
     * 获取用户长期向量
     */
    @GetMapping("/{userId}/longterm")
    public Result<List<Double>> getLongTermVector(@PathVariable Long userId) {
        List<Double> vector = userEmbeddingService.getUserLongTermVector(userId);
        return Result.ok(vector);
    }

    /**
     * 获取融合向量
     */
    @GetMapping("/{userId}/fused")
    public Result<List<Float>> getFusedVector(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0.7") double shortTermWeight) {
        List<Float> vector = userEmbeddingService.getFusedVector(userId, shortTermWeight);
        return Result.ok(vector);
    }

    /**
     * 手动触发向量计算（测试用）
     */
    @PostMapping("/{userId}/calculate")
    public Result<List<Float>> calculateVector(@PathVariable Long userId) {
        List<Float> vector = userEmbeddingService.calculateRealtimeVector(userId);
        return Result.ok(vector);
    }

    /**
     * 更新用户长期向量（供离线训练任务调用）
     */
    @PutMapping("/{userId}/longterm")
    public Result<String> updateLongTermVector(
            @PathVariable Long userId,
            @RequestBody List<Double> vector) {
        userEmbeddingService.updateLongTermVector(userId, vector);
        return Result.ok("长期向量更新成功");
    }
}

