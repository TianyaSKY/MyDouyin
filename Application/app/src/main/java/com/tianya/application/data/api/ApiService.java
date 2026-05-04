package com.tianya.application.data.api;

import com.tianya.application.data.model.*;

import java.util.List;
import java.util.Map;

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.*;

/**
 * Retrofit interface covering all backend API endpoints.
 */
public interface ApiService {

    // ==================== Auth ====================

    @POST("/api/auth/login")
    Call<ApiResponse<TokenResponse>> login(@Body LoginRequest request);

    @POST("/api/auth/register")
    Call<ApiResponse<TokenResponse>> register(@Body RegisterRequest request);

    @GET("/api/auth/me")
    Call<ApiResponse<UserProfile>> me();

    @GET("/api/auth/register/tags")
    Call<ApiResponse<List<String>>> getRegisterTags();

    // ==================== Feed ====================

    @GET("/api/feed")
    Call<ApiResponse<FeedResponse>> getFeed(
            @Query("userId") long userId,
            @Query("size") int size);

    // ==================== Videos ====================

    @GET("/api/videos/{id}")
    Call<ApiResponse<Video>> getVideoById(@Path("id") long id);

    @GET("/api/videos")
    Call<ApiResponse<PageResponse<Video>>> listVideos(
            @Query("status") String status,
            @Query("current") int current,
            @Query("size") int size);

    @GET("/api/videos/author/{authorId}")
    Call<ApiResponse<PageResponse<Video>>> listByAuthor(
            @Path("authorId") long authorId,
            @Query("current") int current,
            @Query("size") int size);

    @POST("/api/videos")
    Call<ApiResponse<Video>> createVideo(@Body CreateVideoRequest request);

    @PUT("/api/videos/{id}")
    Call<ApiResponse<Video>> updateVideo(@Path("id") long id, @Body Video video);

    @DELETE("/api/videos/{id}")
    Call<ApiResponse<Void>> deleteVideo(@Path("id") long id);

    @PUT("/api/videos/{id}/status")
    Call<ApiResponse<Void>> updateVideoStatus(
            @Path("id") long id,
            @Query("status") String status);

    // ==================== Like ====================

    @POST("/api/videos/{id}/like")
    Call<ApiResponse<Map<String, Object>>> likeVideo(@Path("id") long id);

    @DELETE("/api/videos/{id}/like")
    Call<ApiResponse<Map<String, Object>>> unlikeVideo(@Path("id") long id);

    @GET("/api/videos/{id}/like")
    Call<ApiResponse<VideoLikeStatusResponse>> getLikeStatus(@Path("id") long id);

    // ==================== Upload ====================

    @POST("/api/videos/upload/init")
    Call<ApiResponse<UploadInitResponse>> initUpload(@Body UploadInitRequest request);

    @Multipart
    @POST("/api/videos/upload/chunk")
    Call<ApiResponse<Void>> uploadChunk(
            @Part("uploadId") RequestBody uploadId,
            @Part("chunkIndex") RequestBody chunkIndex,
            @Part MultipartBody.Part chunk);

    @POST("/api/videos/upload/complete")
    Call<ApiResponse<UploadCompleteResponse>> completeUpload(@Body UploadCompleteRequest request);

    @Multipart
    @POST("/api/videos/upload/cover")
    Call<ApiResponse<String>> uploadCover(@Part MultipartBody.Part file);

    // ==================== Events ====================

    @POST("/api/events")
    Call<ApiResponse<UserEvent>> reportEvent(@Body UserEvent event);

    @POST("/api/events/batch")
    Call<ApiResponse<Void>> batchReportEvents(@Body List<UserEvent> events);

    // ==================== Users ====================

    @GET("/api/users/{id}")
    Call<ApiResponse<UserProfile>> getUserById(@Path("id") long id);

    @PUT("/api/users/{id}")
    Call<ApiResponse<UserProfile>> updateUser(@Path("id") long id, @Body UserProfile user);

    @GET("/api/users/{id}/stats")
    Call<ApiResponse<UserStatsResponse>> getUserStats(@Path("id") long id);
}
