package com.tianya.application.ui.auth;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.tianya.application.data.api.ApiService;
import com.tianya.application.data.model.ApiResponse;
import com.tianya.application.data.model.TokenResponse;
import com.tianya.application.data.repository.AuthRepository;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoginViewModel extends ViewModel {

    private AuthRepository authRepository;

    private final MutableLiveData<TokenResponse> authResult = new MutableLiveData<>();
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>();
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<List<String>> availableTags = new MutableLiveData<>();
    private final MutableLiveData<Boolean> isRegisterMode = new MutableLiveData<>(false);

    public void init(ApiService apiService) {
        if (authRepository == null) {
            authRepository = new AuthRepository(apiService);
        }
    }

    public LiveData<TokenResponse> getAuthResult() { return authResult; }
    public LiveData<String> getErrorMessage() { return errorMessage; }
    public LiveData<Boolean> getLoading() { return loading; }
    public LiveData<List<String>> getAvailableTags() { return availableTags; }
    public LiveData<Boolean> getIsRegisterMode() { return isRegisterMode; }

    public void toggleMode() {
        Boolean current = isRegisterMode.getValue();
        isRegisterMode.setValue(current == null || !current);
    }

    public void loadTags() {
        if (authRepository == null) return;
        authRepository.getRegisterTags().enqueue(new Callback<ApiResponse<List<String>>>() {
            @Override
            public void onResponse(Call<ApiResponse<List<String>>> call,
                                   Response<ApiResponse<List<String>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    availableTags.postValue(response.body().getData());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<List<String>>> call, Throwable t) {
                // Tags are optional, silent fail
            }
        });
    }

    public void login(String username, String password) {
        if (authRepository == null) return;
        if (username.isEmpty() || password.isEmpty()) {
            errorMessage.setValue("用户名和密码不能为空");
            return;
        }

        loading.setValue(true);
        errorMessage.setValue(null);

        authRepository.login(username, password).enqueue(new Callback<ApiResponse<TokenResponse>>() {
            @Override
            public void onResponse(Call<ApiResponse<TokenResponse>> call,
                                   Response<ApiResponse<TokenResponse>> response) {
                loading.postValue(false);
                if (response.isSuccessful() && response.body() != null) {
                    if (response.body().isSuccess()) {
                        authResult.postValue(response.body().getData());
                    } else {
                        errorMessage.postValue(response.body().getMessage());
                    }
                } else {
                    errorMessage.postValue("登录失败，请检查网络");
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<TokenResponse>> call, Throwable t) {
                loading.postValue(false);
                errorMessage.postValue("网络错误: " + t.getMessage());
            }
        });
    }

    public void register(String username, String password, String nickname, List<String> tags) {
        if (authRepository == null) return;
        if (username.isEmpty() || password.isEmpty()) {
            errorMessage.setValue("用户名和密码不能为空");
            return;
        }
        if (password.length() < 6) {
            errorMessage.setValue("密码长度不能少于6位");
            return;
        }

        loading.setValue(true);
        errorMessage.setValue(null);

        authRepository.register(username, password, nickname, tags)
                .enqueue(new Callback<ApiResponse<TokenResponse>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<TokenResponse>> call,
                                           Response<ApiResponse<TokenResponse>> response) {
                        loading.postValue(false);
                        if (response.isSuccessful() && response.body() != null) {
                            if (response.body().isSuccess()) {
                                authResult.postValue(response.body().getData());
                            } else {
                                errorMessage.postValue(response.body().getMessage());
                            }
                        } else {
                            errorMessage.postValue("注册失败，请检查网络");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<TokenResponse>> call, Throwable t) {
                        loading.postValue(false);
                        errorMessage.postValue("网络错误: " + t.getMessage());
                    }
                });
    }
}
