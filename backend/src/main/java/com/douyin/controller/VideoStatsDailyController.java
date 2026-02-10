package com.douyin.controller;

import com.douyin.common.Result;
import com.douyin.entity.VideoStatsDaily;
import com.douyin.service.VideoStatsDailyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class VideoStatsDailyController {

    private final VideoStatsDailyService videoStatsDailyService;

    /**
     * GET /api/stats/{videoId} - Get stats for a video in a date range
     */
    @GetMapping("/{videoId}")
    public Result<List<VideoStatsDaily>> getStats(
            @PathVariable Long videoId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Result.ok(videoStatsDailyService.getStatsByDateRange(videoId, startDate, endDate));
    }

    /**
     * GET /api/stats/{videoId}/today - Get today's stats for a video
     */
    @GetMapping("/{videoId}/today")
    public Result<List<VideoStatsDaily>> getTodayStats(@PathVariable Long videoId) {
        LocalDate today = LocalDate.now();
        return Result.ok(videoStatsDailyService.getStatsByDateRange(videoId, today, today));
    }

    /**
     * POST /api/stats - Create or update daily stats
     */
    @PostMapping
    public Result<Void> saveOrUpdate(@Valid @RequestBody VideoStatsDaily stats) {
        boolean success = videoStatsDailyService.saveOrUpdateStats(stats);
        return success ? Result.ok() : Result.fail("Failed to save stats");
    }
}
