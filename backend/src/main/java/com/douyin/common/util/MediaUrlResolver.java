package com.douyin.common.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;

@Component
public class MediaUrlResolver {

    private static final String UPLOADS_PREFIX = "/uploads/";

    @Value("${app.media-base-url:http://localhost:18081}")
    private String mediaBaseUrl;

    public String normalizeForStorage(String url) {
        if (!StringUtils.hasText(url)) {
            return url;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith(UPLOADS_PREFIX)) {
            return trimmed;
        }
        if (trimmed.startsWith("uploads/")) {
            return "/" + trimmed;
        }
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            URI uri = URI.create(trimmed);
            String path = uri.getPath();
            if (path != null && path.startsWith(UPLOADS_PREFIX)) {
                String query = uri.getQuery();
                return StringUtils.hasText(query) ? path + "?" + query : path;
            }
        }
        throw new IllegalArgumentException("媒体地址必须以 /uploads/ 开头");
    }

    public String toPublicUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return url;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        if (!trimmed.startsWith("/")) {
            return trimmed;
        }
        return trimTrailingSlash(mediaBaseUrl) + trimmed;
    }

    private String trimTrailingSlash(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
