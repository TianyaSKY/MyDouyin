package com.douyin.entity.dto;

import com.douyin.entity.UserProfile;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponse {

    private String token; // Single authentication token
    private Long expiresIn;
    private UserProfile user;
}
