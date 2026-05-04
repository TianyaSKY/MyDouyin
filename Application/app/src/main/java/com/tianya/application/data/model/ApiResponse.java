package com.tianya.application.data.model;

/**
 * Generic API response wrapper matching backend's Result<T>.
 * { "code": 200, "message": "success", "data": {...} }
 */
public class ApiResponse<T> {
    private int code;
    private String message;
    private T data;

    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public T getData() { return data; }
    public void setData(T data) { this.data = data; }

    public boolean isSuccess() { return code == 200; }
}
