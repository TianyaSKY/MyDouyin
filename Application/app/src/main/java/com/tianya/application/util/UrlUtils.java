package com.tianya.application.util;

import com.tianya.application.BuildConfig;

/**
 * Resolves relative media URLs (like /uploads/videos/xxx.mp4) to full URLs
 * accessible from the Android device.
 */
public class UrlUtils {

    /**
     * Convert a potentially relative URL to a full URL.
     * If already absolute (starts with http), return as-is.
     * Otherwise, prepend the backend BASE_URL.
     */
    public static String resolveUrl(String url) {
        if (url == null || url.isEmpty()) return url;
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        // Strip trailing slash from base URL and leading slash from path
        String base = BuildConfig.BASE_URL;
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        if (!url.startsWith("/")) url = "/" + url;
        return base + url;
    }
}
