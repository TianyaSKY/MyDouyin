package com.tianya.application.ui.profile;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;

import com.tianya.application.util.StyledToast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.tianya.application.R;
import com.tianya.application.data.api.ApiClient;
import com.tianya.application.data.api.ApiService;
import com.tianya.application.data.model.*;
import com.tianya.application.ui.auth.LoginActivity;
import com.tianya.application.ui.player.VideoPlayerActivity;
import com.tianya.application.util.TokenManager;
import com.tianya.application.util.UrlUtils;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ProfileFragment extends Fragment {

    private TextView tvNickname, tvUsername, tvLikeCount, tvWorkCount;
    private View emptyView;
    private RecyclerView rvVideos;
    private VideoGridAdapter gridAdapter;
    private ApiService apiService;
    private SwipeRefreshLayout swipeRefresh;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_profile, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        tvNickname = view.findViewById(R.id.tvNickname);
        tvUsername = view.findViewById(R.id.tvUsername);
        tvLikeCount = view.findViewById(R.id.tvLikeCount);
        tvWorkCount = view.findViewById(R.id.tvWorkCount);
        emptyView = view.findViewById(R.id.tvEmpty);
        rvVideos = view.findViewById(R.id.rvVideos);

        apiService = ApiClient.getInstance(requireContext()).getApiService();
        TokenManager tm = TokenManager.getInstance(requireContext());

        tvNickname.setText(tm.getNickname() != null ? tm.getNickname() : "用户");
        tvUsername.setText("@" + (tm.getUsername() != null ? tm.getUsername() : ""));

        // Edit nickname on tap
        tvNickname.setOnClickListener(v -> showEditNicknameDialog());

        // Video grid with spacing
        gridAdapter = new VideoGridAdapter();
        GridLayoutManager glm = new GridLayoutManager(requireContext(), 3);
        rvVideos.setLayoutManager(glm);
        rvVideos.setAdapter(gridAdapter);
        rvVideos.addItemDecoration(new RecyclerView.ItemDecoration() {
            @Override
            public void getItemOffsets(@NonNull android.graphics.Rect outRect,
                    @NonNull View v, @NonNull RecyclerView parent,
                    @NonNull RecyclerView.State state) {
                outRect.set(1, 1, 1, 1);
            }
        });

        // Pull to refresh
        swipeRefresh = view.findViewById(R.id.swipeRefresh);
        swipeRefresh.setColorSchemeColors(0xFFFE2C55);
        swipeRefresh.setProgressBackgroundColorSchemeColor(0xFF1A1A1A);
        swipeRefresh.setOnRefreshListener(() -> {
            loadStats(tm.getUserId());
            loadVideos(tm.getUserId());
        });

        // Click → play video
        gridAdapter.setOnItemClickListener((video, position) -> {
            Intent intent = new Intent(requireContext(), VideoPlayerActivity.class);
            intent.putExtra(VideoPlayerActivity.EXTRA_VIDEO_URL, UrlUtils.resolveUrl(video.getVideoUrl()));
            intent.putExtra(VideoPlayerActivity.EXTRA_TITLE, video.getTitle());
            startActivity(intent);
        });

        // Long click → delete
        gridAdapter.setOnItemLongClickListener((video, position) -> {
            new AlertDialog.Builder(requireContext())
                    .setTitle("删除作品")
                    .setMessage("确定要删除这个视频吗？")
                    .setPositiveButton("删除", (d, w) -> deleteVideo(video, position))
                    .setNegativeButton("取消", null)
                    .show();
        });

        // Logout
        view.findViewById(R.id.btnLogout).setOnClickListener(v -> {
            new AlertDialog.Builder(requireContext())
                    .setTitle("退出登录")
                    .setMessage("确定要退出登录吗？")
                    .setPositiveButton("退出", (d, w) -> {
                        TokenManager.getInstance(requireContext()).clear();
                        startActivity(new Intent(requireContext(), LoginActivity.class));
                        requireActivity().finish();
                    })
                    .setNegativeButton("取消", null)
                    .show();
        });

        loadStats(tm.getUserId());
        loadVideos(tm.getUserId());
    }

    @Override
    public void onResume() {
        super.onResume();
        TokenManager tm = TokenManager.getInstance(requireContext());
        loadStats(tm.getUserId());
        loadVideos(tm.getUserId());
    }

    private void showEditNicknameDialog() {
        EditText input = new EditText(requireContext());
        input.setHint("输入新昵称");
        input.setText(tvNickname.getText());
        input.setTextColor(0xFFFFFFFF);
        input.setHintTextColor(0xFF888888);
        input.setPadding(48, 32, 48, 32);

        new AlertDialog.Builder(requireContext())
                .setTitle("修改昵称")
                .setView(input)
                .setPositiveButton("保存", (d, w) -> {
                    String newNickname = input.getText().toString().trim();
                    if (!newNickname.isEmpty()) {
                        updateNickname(newNickname);
                    }
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private void updateNickname(String newNickname) {
        TokenManager tm = TokenManager.getInstance(requireContext());
        UserProfile update = new UserProfile();
        update.setNickname(newNickname);

        apiService.updateUser(tm.getUserId(), update).enqueue(new Callback<ApiResponse<UserProfile>>() {
            @Override
            public void onResponse(Call<ApiResponse<UserProfile>> call,
                                   Response<ApiResponse<UserProfile>> response) {
                if (!isAdded()) return;
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    tvNickname.setText(newNickname);
                    // Update local cache
                    tm.saveAuth(tm.getToken(), 0, tm.getUserId(),
                            tm.getUsername(), newNickname, tm.getAvatarUrl());
                    StyledToast.show(requireContext(), "昵称已更新");
                } else {
                    StyledToast.show(requireContext(), "修改失败");
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<UserProfile>> call, Throwable t) {
                if (isAdded()) StyledToast.show(requireContext(), "网络错误");
            }
        });
    }

    private void loadStats(long userId) {
        apiService.getUserStats(userId).enqueue(new Callback<ApiResponse<UserStatsResponse>>() {
            @Override
            public void onResponse(Call<ApiResponse<UserStatsResponse>> call,
                                   Response<ApiResponse<UserStatsResponse>> response) {
                if (response.isSuccessful() && response.body() != null
                        && response.body().isSuccess() && isAdded()) {
                    UserStatsResponse stats = response.body().getData();
                    tvLikeCount.setText(String.valueOf(
                            stats.getTotalLikes() != null ? stats.getTotalLikes() : 0));
                    tvWorkCount.setText(String.valueOf(
                            stats.getWorkCount() != null ? stats.getWorkCount() : 0));
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<UserStatsResponse>> call, Throwable t) {}
        });
    }

    private void loadVideos(long authorId) {
        apiService.listByAuthor(authorId, 1, 100).enqueue(new Callback<ApiResponse<PageResponse<Video>>>() {
            @Override
            public void onResponse(Call<ApiResponse<PageResponse<Video>>> call,
                                   Response<ApiResponse<PageResponse<Video>>> response) {
                if (!isAdded()) return;
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    PageResponse<Video> page = response.body().getData();
                    List<Video> videos = page != null ? page.getRecords() : null;
                    if (videos != null && !videos.isEmpty()) {
                        gridAdapter.setVideos(videos);
                        emptyView.setVisibility(View.GONE);
                    } else {
                        gridAdapter.setVideos(null);
                        emptyView.setVisibility(View.VISIBLE);
                    }
                }
                if (swipeRefresh != null) swipeRefresh.setRefreshing(false);
            }

            @Override
            public void onFailure(Call<ApiResponse<PageResponse<Video>>> call, Throwable t) {}
        });
    }

    private void deleteVideo(Video video, int position) {
        apiService.deleteVideo(video.getId()).enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call,
                                   Response<ApiResponse<Void>> response) {
                if (!isAdded()) return;
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    gridAdapter.removeAt(position);
                    StyledToast.show(requireContext(), "已删除");
                    loadStats(TokenManager.getInstance(requireContext()).getUserId());
                } else {
                    StyledToast.show(requireContext(), "删除失败");
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                if (isAdded()) StyledToast.show(requireContext(), "网络错误");
            }
        });
    }
}
