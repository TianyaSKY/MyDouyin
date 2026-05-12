package com.tianya.application.data.model;

/**
 * Token response from login/register.
 */
public class TokenResponse {
    private String token;
    private Long expiresIn;
    private UserProfile user;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Long getExpiresIn() { return expiresIn; }
    public void setExpiresIn(Long expiresIn) { this.expiresIn = expiresIn; }

    public UserProfile getUser() { return user; }
    public void setUser(UserProfile user) { this.user = user; }
}
