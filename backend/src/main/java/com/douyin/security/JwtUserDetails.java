package com.douyin.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Lightweight principal stored in SecurityContext after JWT validation.
 */
@Getter
@AllArgsConstructor
public class JwtUserDetails {

    private final Long userId;
    private final String username;

    @Override
    public String toString() {
        return "JwtUserDetails{userId=" + userId + ", username='" + username + "'}";
    }
}
