package com.douyin.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class UploadStaticResourceConfig implements WebMvcConfigurer {

    @Value("${app.upload.base-dir:storage}")
    private String baseDir;

    @Value("${app.upload.video-dir:videos}")
    private String videoDirName;

    @Value("${app.upload.url-prefix:/uploads/videos/}")
    private String urlPrefix;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path videoRoot = Paths.get(baseDir).toAbsolutePath().normalize().resolve(videoDirName);
        String pattern = normalizePrefix(urlPrefix) + "**";
        registry.addResourceHandler(pattern)
                .addResourceLocations(videoRoot.toUri().toString());
    }

    private String normalizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return "/uploads/videos/";
        }
        String result = prefix.startsWith("/") ? prefix : "/" + prefix;
        return result.endsWith("/") ? result : result + "/";
    }
}
