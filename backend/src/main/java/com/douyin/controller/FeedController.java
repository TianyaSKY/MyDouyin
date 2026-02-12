package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.entity.dto.FeedResponse;
import com.douyin.service.IFeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
public class FeedController {

    private final IFeedService feedService;

    /**
     * GET /api/feed - 获取推荐视频流
     * @param userId 用户ID
     * @param size 返回数量，默认20
     */
    @GetMapping
    public Result<FeedResponse> getFeed(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "20") Integer size) {
        
        FeedResponse response = feedService.generateFeed(userId, size);
        return Result.ok(response);
    }
}

