package com.tianya.application.ui.upload;

import android.net.Uri;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import com.tianya.application.data.api.ApiService;
import com.tianya.application.data.model.*;
import com.tianya.application.util.FileUtils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Response;

public class UploadViewModel extends ViewModel {

    private ApiService apiService;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private final MutableLiveData<Integer> progress = new MutableLiveData<>(0);
    private final MutableLiveData<String> statusText = new MutableLiveData<>();
    private final MutableLiveData<Boolean> uploading = new MutableLiveData<>(false);
    private final MutableLiveData<String> errorMessage = new MutableLiveData<>();
    private final MutableLiveData<Boolean> uploadSuccess = new MutableLiveData<>(false);
    private final MutableLiveData<List<String>> availableTags = new MutableLiveData<>();

    public void init(ApiService apiService) {
        this.apiService = apiService;
    }

    public LiveData<Integer> getProgress() { return progress; }
    public LiveData<String> getStatusText() { return statusText; }
    public LiveData<Boolean> getUploading() { return uploading; }
    public LiveData<String> getErrorMessage() { return errorMessage; }
    public LiveData<Boolean> getUploadSuccess() { return uploadSuccess; }
    public LiveData<List<String>> getAvailableTags() { return availableTags; }

    public void loadTags() {
        if (apiService == null) return;
        apiService.getRegisterTags().enqueue(new retrofit2.Callback<ApiResponse<List<String>>>() {
            @Override
            public void onResponse(retrofit2.Call<ApiResponse<List<String>>> call,
                                   Response<ApiResponse<List<String>>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    availableTags.postValue(response.body().getData());
                }
            }
            @Override
            public void onFailure(retrofit2.Call<ApiResponse<List<String>>> call, Throwable t) {}
        });
    }

    /**
     * Full upload pipeline: hash → init → chunks → complete → createVideo
     */
    public void startUpload(android.content.Context context, Uri videoUri, Uri coverUri,
                            String title, List<String> tags, long authorId) {
        if (apiService == null) return;
        uploading.postValue(true);
        errorMessage.postValue(null);
        progress.postValue(0);

        executor.execute(() -> {
            try {
                // Step 1: Compute MD5
                statusText.postValue("正在计算文件哈希...");
                String fileHash = FileUtils.computeMD5(context, videoUri);
                long fileSize = FileUtils.getFileSize(context, videoUri);
                String fileName = FileUtils.getFileName(context, videoUri);
                int totalChunks = FileUtils.calculateTotalChunks(fileSize);

                // Step 2: Init upload
                statusText.postValue("正在初始化上传...");
                UploadInitRequest initReq = new UploadInitRequest();
                initReq.setFileName(fileName);
                initReq.setFileHash(fileHash);
                initReq.setFileSize(fileSize);
                initReq.setChunkSize(FileUtils.CHUNK_SIZE);
                initReq.setTotalChunks(totalChunks);

                Response<ApiResponse<UploadInitResponse>> initResp =
                        apiService.initUpload(initReq).execute();
                if (!initResp.isSuccessful() || initResp.body() == null || !initResp.body().isSuccess()) {
                    errorMessage.postValue("初始化上传失败");
                    uploading.postValue(false);
                    return;
                }

                UploadInitResponse initData = initResp.body().getData();
                String videoUrl;

                // Step 3: Check instant upload
                if (Boolean.TRUE.equals(initData.getInstantUpload())) {
                    statusText.postValue("秒传成功！");
                    progress.postValue(100);
                    videoUrl = initData.getVideoUrl();
                } else {
                    // Step 4: Upload chunks
                    String uploadId = initData.getUploadId();
                    Set<Integer> uploaded = new HashSet<>();
                    if (initData.getUploadedChunks() != null) {
                        uploaded.addAll(initData.getUploadedChunks());
                    }

                    for (int i = 0; i < totalChunks; i++) {
                        if (uploaded.contains(i)) {
                            // Skip already uploaded chunk (resume)
                            int pct = (int) ((i + 1) * 90.0 / totalChunks);
                            progress.postValue(pct);
                            continue;
                        }

                        statusText.postValue("上传分片 " + (i + 1) + "/" + totalChunks);
                        byte[] chunkData = FileUtils.readChunk(context, videoUri, i);
                        if (chunkData == null) break;

                        RequestBody uploadIdBody = RequestBody.create(uploadId, MediaType.parse("text/plain"));
                        RequestBody chunkIndexBody = RequestBody.create(String.valueOf(i), MediaType.parse("text/plain"));
                        RequestBody chunkBody = RequestBody.create(chunkData, MediaType.parse("application/octet-stream"));
                        MultipartBody.Part chunkPart = MultipartBody.Part.createFormData("chunk", "chunk_" + i, chunkBody);

                        Response<ApiResponse<Void>> chunkResp =
                                apiService.uploadChunk(uploadIdBody, chunkIndexBody, chunkPart).execute();
                        if (!chunkResp.isSuccessful() || chunkResp.body() == null || !chunkResp.body().isSuccess()) {
                            errorMessage.postValue("分片 " + (i + 1) + " 上传失败");
                            uploading.postValue(false);
                            return;
                        }

                        int pct = (int) ((i + 1) * 90.0 / totalChunks);
                        progress.postValue(pct);
                    }

                    // Step 5: Complete upload
                    statusText.postValue("正在合并文件...");
                    UploadCompleteRequest completeReq = new UploadCompleteRequest();
                    completeReq.setUploadId(uploadId);
                    completeReq.setFileName(fileName);
                    completeReq.setFileHash(fileHash);
                    completeReq.setFileSize(fileSize);
                    completeReq.setTotalChunks(totalChunks);

                    Response<ApiResponse<UploadCompleteResponse>> completeResp =
                            apiService.completeUpload(completeReq).execute();
                    if (!completeResp.isSuccessful() || completeResp.body() == null || !completeResp.body().isSuccess()) {
                        errorMessage.postValue("文件合并失败");
                        uploading.postValue(false);
                        return;
                    }
                    videoUrl = completeResp.body().getData().getVideoUrl();
                }

                progress.postValue(92);

                // Step 6: Upload cover
                String coverUrl = null;
                if (coverUri != null) {
                    statusText.postValue("上传封面...");
                    byte[] coverBytes = readAllBytes(context, coverUri);
                    if (coverBytes != null) {
                        RequestBody coverBody = RequestBody.create(coverBytes, MediaType.parse("image/*"));
                        MultipartBody.Part coverPart = MultipartBody.Part.createFormData("file", "cover.jpg", coverBody);
                        Response<ApiResponse<String>> coverResp = apiService.uploadCover(coverPart).execute();
                        if (coverResp.isSuccessful() && coverResp.body() != null && coverResp.body().isSuccess()) {
                            coverUrl = coverResp.body().getData();
                        }
                    }
                }

                progress.postValue(95);

                // Step 7: Create video record
                statusText.postValue("正在发布...");
                CreateVideoRequest createReq = new CreateVideoRequest();
                createReq.setAuthorId(authorId);
                createReq.setTitle(title);
                createReq.setTags(tags);
                createReq.setVideoUrl(videoUrl);
                createReq.setCoverUrl(coverUrl != null ? coverUrl : "");

                Response<ApiResponse<Video>> createResp = apiService.createVideo(createReq).execute();
                if (!createResp.isSuccessful() || createResp.body() == null || !createResp.body().isSuccess()) {
                    errorMessage.postValue("发布失败: " + (createResp.body() != null ? createResp.body().getMessage() : ""));
                    uploading.postValue(false);
                    return;
                }

                progress.postValue(100);
                statusText.postValue("发布成功！");
                uploadSuccess.postValue(true);
                uploading.postValue(false);

            } catch (Exception e) {
                errorMessage.postValue("上传错误: " + e.getMessage());
                uploading.postValue(false);
            }
        });
    }

    private byte[] readAllBytes(android.content.Context context, Uri uri) {
        try (java.io.InputStream is = context.getContentResolver().openInputStream(uri)) {
            if (is == null) return null;
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) != -1) bos.write(buf, 0, n);
            return bos.toByteArray();
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    protected void onCleared() {
        super.onCleared();
        executor.shutdownNow();
    }
}
