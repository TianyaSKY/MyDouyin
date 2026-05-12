package com.tianya.application.ui.feed;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.viewpager2.widget.ViewPager2;

import com.tianya.application.data.api.ApiClient;
import com.tianya.application.data.model.ApiResponse;
import com.tianya.application.data.model.Video;
import com.tianya.application.data.model.VideoLikeStatusResponse;
import com.tianya.application.databinding.FragmentFeedBinding;
import com.tianya.application.util.EventTracker;
import com.tianya.application.util.TokenManager;

import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class FeedFragment extends Fragment {

    private FragmentFeedBinding binding;
    private FeedViewModel viewModel;
    private FeedAdapter feedAdapter;
    private EventTracker eventTracker;
    private int lastTrackedPosition = -1;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentFeedBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        TokenManager tokenManager = TokenManager.getInstance(requireContext());
        var apiService = ApiClient.getInstance(requireContext()).getApiService();

        viewModel = new ViewModelProvider(this).get(FeedViewModel.class);
        viewModel.init(apiService, tokenManager.getUserId());

        // Event tracker
        eventTracker = new EventTracker(apiService, tokenManager.getUserId());

        setupViewPager();
        setupObservers();
        viewModel.loadFeed();
    }

    @Override
    public void onResume() {
        super.onResume();
        enterImmersiveMode();
        if (!isHidden()) resumeCurrentPlayer();
    }

    @Override
    public void onPause() {
        super.onPause();
        exitImmersiveMode();
        pauseAllPlayers();
    }

    @Override
    public void onHiddenChanged(boolean hidden) {
        super.onHiddenChanged(hidden);
        if (hidden) {
            exitImmersiveMode();
            pauseAllPlayers();
        } else {
            enterImmersiveMode();
            resumeCurrentPlayer();
        }
    }

    private void pauseAllPlayers() {
        if (feedAdapter != null) feedAdapter.pauseAll();
    }

    private void resumeCurrentPlayer() {
        if (feedAdapter != null && binding != null) {
            feedAdapter.setCurrentPosition(binding.viewPagerFeed.getCurrentItem());
        }
    }

    private void enterImmersiveMode() {
        if (getActivity() == null || getActivity().getWindow() == null) return;
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(), getActivity().getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    private void exitImmersiveMode() {
        if (getActivity() == null || getActivity().getWindow() == null) return;
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(), getActivity().getWindow().getDecorView());
        controller.show(WindowInsetsCompat.Type.systemBars());
    }

    private void setupViewPager() {
        feedAdapter = new FeedAdapter();
        binding.viewPagerFeed.setAdapter(feedAdapter);
        binding.viewPagerFeed.setOffscreenPageLimit(1);

        feedAdapter.setOnVideoInteractionListener(new FeedAdapter.OnVideoInteractionListener() {
            @Override
            public void onLikeClicked(Video video, int position) {
                toggleLike(video, position);
            }

            @Override
            public void onDoubleTap(Video video, int position) {
                if (!video.isLiked()) {
                    toggleLike(video, position);
                }
            }
        });

        binding.viewPagerFeed.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                // Pause all other players, play only this one
                feedAdapter.setCurrentPosition(position);

                Video current = feedAdapter.getVideoAt(position);
                if (current != null) {
                    fetchLikeStatus(current, position);

                    // Track impression
                    if (position != lastTrackedPosition) {
                        eventTracker.track(current.getId(), "IMPR");
                        lastTrackedPosition = position;
                    }
                }

                // Track leave for previous video
                if (position > 0) {
                    Video prev = feedAdapter.getVideoAt(position - 1);
                    if (prev != null) {
                        eventTracker.track(prev.getId(), "LEAVE");
                    }
                }

                // Load more when 3 videos from end
                if (position >= feedAdapter.getVideoCount() - 3) {
                    Boolean hasMore = viewModel.getHasMore().getValue();
                    if (hasMore != null && hasMore) {
                        viewModel.loadFeed();
                    }
                }
            }
        });
    }

    private void setupObservers() {
        viewModel.getNewVideos().observe(getViewLifecycleOwner(), videos -> {
            if (videos != null && !videos.isEmpty()) {
                boolean isFirst = feedAdapter.getVideoCount() == 0;
                feedAdapter.addVideos(videos);
                if (isFirst) {
                    feedAdapter.setCurrentPosition(0);
                }
            }
        });

        viewModel.getLoading().observe(getViewLifecycleOwner(), isLoading -> {
            if (feedAdapter.getVideoCount() == 0) {
                binding.progressLoading.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            } else {
                binding.tvLoadingMore.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            }
        });

        viewModel.getError().observe(getViewLifecycleOwner(), error -> {
            if (error != null && getContext() != null) {
                Toast.makeText(getContext(), error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void toggleLike(Video video, int position) {
        boolean currentlyLiked = video.isLiked();
        long currentCount = video.getLikeCount() != null ? video.getLikeCount() : 0;

        // Optimistic update
        feedAdapter.updateLikeState(position, !currentlyLiked,
                currentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1);

        // Track like event
        if (!currentlyLiked) {
            eventTracker.track(video.getId(), "LIKE");
        }

        Callback<ApiResponse<Map<String, Object>>> callback = new Callback<>() {
            @Override
            public void onResponse(Call<ApiResponse<Map<String, Object>>> call,
                                   Response<ApiResponse<Map<String, Object>>> response) {
                if (!response.isSuccessful() || response.body() == null || !response.body().isSuccess()) {
                    feedAdapter.updateLikeState(position, currentlyLiked, currentCount);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<Map<String, Object>>> call, Throwable t) {
                feedAdapter.updateLikeState(position, currentlyLiked, currentCount);
            }
        };

        if (currentlyLiked) {
            viewModel.unlikeVideo(video.getId(), callback);
        } else {
            viewModel.likeVideo(video.getId(), callback);
        }
    }

    private void fetchLikeStatus(Video video, int position) {
        viewModel.getLikeStatus(video.getId(), new Callback<>() {
            @Override
            public void onResponse(Call<ApiResponse<VideoLikeStatusResponse>> call,
                                   Response<ApiResponse<VideoLikeStatusResponse>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    VideoLikeStatusResponse status = response.body().getData();
                    feedAdapter.updateLikeState(position,
                            status.getLiked() != null && status.getLiked(),
                            status.getLikeCount() != null ? status.getLikeCount() : 0);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<VideoLikeStatusResponse>> call, Throwable t) {}
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        if (eventTracker != null) eventTracker.shutdown();
        binding = null;
    }
}
