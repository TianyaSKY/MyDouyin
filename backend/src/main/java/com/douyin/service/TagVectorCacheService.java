package com.douyin.service;

import java.util.List;

public interface TagVectorCacheService {

    void refreshTagVectors();

    List<Float> getAverageVectorByTags(List<String> tags);
}
