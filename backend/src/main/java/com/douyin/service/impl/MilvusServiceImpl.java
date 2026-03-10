package com.douyin.service.impl;

import com.douyin.service.IMilvusService;
import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.SearchResults;
import io.milvus.param.R;
import io.milvus.param.dml.SearchParam;
import io.milvus.param.collection.LoadCollectionParam;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MilvusServiceImpl implements IMilvusService {

    private final MilvusServiceClient milvusClient;
    private static final String COLLECTION_NAME = "video_embedding";
    private static final String VECTOR_FIELD = "embedding";
    private static final Integer VECTOR_DIM = 1024;

    @Override
    public List<Long> searchSimilarVideos(List<Float> userVector, int topK) {
        try {
            // 确保集合已加载
            milvusClient.loadCollection(
                LoadCollectionParam.newBuilder()
                    .withCollectionName(COLLECTION_NAME)
                    .build()
            );

            // 构建搜索参数
            SearchParam searchParam = SearchParam.newBuilder()
                .withCollectionName(COLLECTION_NAME)
                .withMetricType(io.milvus.param.MetricType.COSINE)
                .withOutFields(Collections.singletonList("video_id"))
                .withTopK(topK)
                .withVectors(Collections.singletonList(userVector))
                .withVectorFieldName(VECTOR_FIELD)
                .build();

            // 执行搜索
            R<SearchResults> response = milvusClient.search(searchParam);
            
            if (response.getStatus() != R.Status.Success.getCode()) {
                log.error("Milvus search failed: {}", response.getMessage());
                return new ArrayList<>();
            }

            // 解析结果
            List<Long> videoIds = new ArrayList<>();
            SearchResults results = response.getData();
            if (results.getResults().getFieldsDataList().isEmpty()) {
                return videoIds;
            }

            // 提取 video_id
            results.getResults().getFieldsDataList().get(0)
                .getScalars()
                .getLongData()
                .getDataList()
                .forEach(videoIds::add);

            log.info("Milvus recalled {} videos for user vector", videoIds.size());
            return videoIds;

        } catch (Exception e) {
            log.error("Error searching Milvus", e);
            return new ArrayList<>();
        }
    }

    @Override
    public List<Float> getUserVector(Long userId) {
        // 实际实现应该注入 UserEmbeddingService
        // 这里返回默认向量，避免循环依赖
        List<Float> vector = new ArrayList<>(VECTOR_DIM);
        for (int i = 0; i < VECTOR_DIM; i++) {
            vector.add(0.0f);
        }
        return vector;
    }
}

