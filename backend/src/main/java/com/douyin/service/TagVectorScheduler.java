package com.douyin.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TagVectorScheduler {

    private final TagVectorCacheService tagVectorCacheService;

    @Scheduled(fixedRate = 1800000)
    public void refreshTagVectors() {
        try {
            tagVectorCacheService.refreshTagVectors();
        } catch (Exception e) {
            log.error("Failed to refresh tag vectors", e);
        }
    }

    @Scheduled(initialDelay = 15000, fixedDelay = Long.MAX_VALUE)
    public void initTagVectors() {
        refreshTagVectors();
    }
}
