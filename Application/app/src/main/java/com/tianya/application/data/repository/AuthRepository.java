package com.tianya.application.data.repository;

import com.tianya.application.data.api.ApiService;
import com.tianya.application.data.model.*;

import java.util.List;

import retrofit2.Call;

/**
 * Repository for authentication operations.
 */
public class AuthRepository {

    private final ApiService apiService;

    public AuthRepository(ApiService apiService) {
        this.apiService = apiService;
    }

    public Call<ApiResponse<TokenResponse>> login(String username, String password) {
        return apiService.login(new LoginRequest(username, password));
    }

    public Call<ApiResponse<TokenResponse>> register(String username, String password,
                                                      String nickname, List<String> tags) {
        return apiService.register(new RegisterRequest(username, password, nickname, tags));
    }

    public Call<ApiResponse<UserProfile>> me() {
        return apiService.me();
    }

    public Call<ApiResponse<List<String>>> getRegisterTags() {
        return apiService.getRegisterTags();
    }
}
