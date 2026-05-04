package com.tianya.application.ui.feed;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.tianya.application.data.api.ApiService;
import com.tianya.application.data.model.*;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class FeedViewModel extends ViewModel {

    private ApiService apiService;
    private long userId;

    private final MutableLiveData<List<Video>> newVideos = new MutableLiveData<>();
    private final MutableLiveData<Boolean> loading = new MutableLiveData<>(false);
    private final MutableLiveData<Boolean> hasMore = new MutableLiveData<>(true);
    private final MutableLiveData<String> error = new MutableLiveData<>();

    public void init(ApiService apiService, long userId) {
        this.apiService = apiService;
        this.userId = userId;
    }

    public LiveData<List<Video>> getNewVideos() { return newVideos; }
    public LiveData<Boolean> getLoading() { return loading; }
    public LiveData<Boolean> getHasMore() { return hasMore; }
    public LiveData<String> getError() { return error; }

    public void loadFeed() {
        if (apiService == null) return;
        Boolean isLoading = loading.getValue();
        if (isLoading != null && isLoading) return;

        loading.setValue(true);
        apiService.getFeed(userId, 10).enqueue(new Callback<ApiResponse<FeedResponse>>() {
            @Override
            public void onResponse(Call<ApiResponse<FeedResponse>> call,
                                   Response<ApiResponse<FeedResponse>> response) {
                loading.postValue(false);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    FeedResponse data = response.body().getData();
                    if (data.getVideos() != null && !data.getVideos().isEmpty()) {
                        newVideos.postValue(data.getVideos());
                        hasMore.postValue(data.getHasMore() != null ? data.getHasMore() : true);
                    } else {
                        hasMore.postValue(false);
                    }
                } else {
                    error.postValue("加载失败");
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<FeedResponse>> call, Throwable t) {
                loading.postValue(false);
                error.postValue("网络错误: " + t.getMessage());
            }
        });
    }

    public void likeVideo(long videoId, Callback<ApiResponse<Map<String, Object>>> callback) {
        if (apiService == null) return;
        apiService.likeVideo(videoId).enqueue(callback);
    }

    public void unlikeVideo(long videoId, Callback<ApiResponse<Map<String, Object>>> callback) {
        if (apiService == null) return;
        apiService.unlikeVideo(videoId).enqueue(callback);
    }

    public void getLikeStatus(long videoId, Callback<ApiResponse<VideoLikeStatusResponse>> callback) {
        if (apiService == null) return;
        apiService.getLikeStatus(videoId).enqueue(callback);
    }
}
