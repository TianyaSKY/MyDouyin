package com.douyin.dto;

import com.douyin.entity.Video;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecallCandidate {
    private Video video;
    private Double score;
    private String source; // "hot", "tag", "vector"
}

