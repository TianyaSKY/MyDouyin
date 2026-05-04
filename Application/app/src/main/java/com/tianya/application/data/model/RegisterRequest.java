package com.tianya.application.data.model;

import java.util.List;

public class RegisterRequest {
    private String username;
    private String password;
    private String nickname;
    private List<String> tags;

    public RegisterRequest(String username, String password, String nickname, List<String> tags) {
        this.username = username;
        this.password = password;
        this.nickname = nickname;
        this.tags = tags;
    }

    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getNickname() { return nickname; }
    public List<String> getTags() { return tags; }
}
