package com.douyin.common.util;

import com.douyin.service.security.JwtUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Shared helpers for resolving the current authenticated user.
 */
public final class AuthUtils {

    private AuthUtils() {
    }

    public static Long getCurrentUserId() {
        JwtUserDetails details = getCurrentUserDetails();
        return details != null ? details.getUserId() : null;
    }

    public static boolean isAdmin() {
        JwtUserDetails details = getCurrentUserDetails();
        return details != null && details.isAdmin();
    }

    public static JwtUserDetails getCurrentUserDetails() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof JwtUserDetails jwtUserDetails) {
            return jwtUserDetails;
        }
        return null;
    }
}
