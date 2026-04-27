package com.douyin.common;

import lombok.Getter;

/**
 * 自定义业务异常，与框架/系统级 RuntimeException 区分。
 * GlobalExceptionHandler 会将此异常映射为 HTTP 400。
 */
@Getter
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(String message) {
        super(message);
        this.code = 400;
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
