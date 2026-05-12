package com.douyin.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * 全局 RestTemplate 配置，统一管理连接超时与读取超时。
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);   // 连接超时 5 秒
        factory.setReadTimeout(30_000);     // 读取超时 30 秒（embedding 生成可能较慢）
        return new RestTemplate(factory);
    }
}
