package com.douyin;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class DouyinApplication {

    public static void main(String[] args) {
        SpringApplication.run(DouyinApplication.class, args);
    }
}
