package com.tianya.application.ui.feed;

import android.os.Handler;
import android.os.Looper;
import android.view.HapticFeedbackConstants;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.tianya.application.R;
import com.tianya.application.data.model.Video;
import com.tianya.application.util.UrlUtils;

import android.view.animation.OvershootInterpolator;

import java.util.ArrayList;
import java.util.List;

public class FeedAdapter extends RecyclerView.Adapter<FeedAdapter.VideoViewHolder> {

    private final List<Video> videos = new ArrayList<>();
    private OnVideoInteractionListener listener;

    public interface OnVideoInteractionListener {
        void onLikeClicked(Video video, int position);
        void onDoubleTap(Video video, int position);
    }

    public void setOnVideoInteractionListener(OnVideoInteractionListener listener) {
        this.listener = listener;
    }

    public void addVideos(List<Video> newVideos) {
        int start = videos.size();
        videos.addAll(newVideos);
        notifyItemRangeInserted(start, newVideos.size());
    }

    public void updateLikeState(int position, boolean liked, long likeCount) {
        if (position >= 0 && position < videos.size()) {
            videos.get(position).setLiked(liked);
            videos.get(position).setLikeCount(likeCount);
            notifyItemChanged(position, "like_update");
        }
    }

    public Video getVideoAt(int position) {
        if (position >= 0 && position < videos.size()) {
            return videos.get(position);
        }
        return null;
    }

    public int getVideoCount() {
        return videos.size();
    }

    @NonNull
    @Override
    public VideoViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_video_feed, parent, false);
        return new VideoViewHolder(view);
    }

    @Override
    @OptIn(markerClass = UnstableApi.class)
    public void onBindViewHolder(@NonNull VideoViewHolder holder, int position,
                                 @NonNull java.util.List<Object> payloads) {
        if (!payloads.isEmpty()) {
            // Partial update — only refresh like UI, don't touch cover/player
            Video video = videos.get(position);
            holder.ivLike.setImageResource(video.isLiked()
                    ? R.drawable.ic_heart_filled
                    : R.drawable.ic_heart_outline);
            holder.tvLikeCount.setText(holder.formatCount(video.getLikeCount()));
            return;
        }
        // Full bind
        super.onBindViewHolder(holder, position, payloads);
    }

    @Override
    @OptIn(markerClass = UnstableApi.class)
    public void onBindViewHolder(@NonNull VideoViewHolder holder, int position) {
        Video video = videos.get(position);
        holder.bind(video);

        holder.ivLike.setOnClickListener(v -> {
            // Haptic feedback + bounce animation
            v.performHapticFeedback(HapticFeedbackConstants.CONFIRM);
            v.animate().scaleX(1.3f).scaleY(1.3f).setDuration(100)
                    .withEndAction(() -> v.animate().scaleX(1f).scaleY(1f).setDuration(100).start())
                    .start();
            if (listener != null) listener.onLikeClicked(video, position);
        });

        // Double-tap to like
        holder.touchOverlay.setOnClickListener(new DoubleClickListener() {
            @Override
            public void onSingleClick(View v) {
                holder.togglePlayPause();
            }

            @Override
            public void onDoubleClick(View v) {
                v.performHapticFeedback(HapticFeedbackConstants.CONFIRM);
                holder.showHeartAnimation();
                if (listener != null) listener.onDoubleTap(video, position);
            }
        });
    }

    @Override
    public int getItemCount() {
        return videos.size();
    }

    // --- Playback control for ViewPager2 ---

    private int currentPosition = -1;
    private final java.util.Map<Integer, VideoViewHolder> activeHolders = new java.util.HashMap<>();

    /** Called by Fragment when ViewPager2 page changes. */
    public void setCurrentPosition(int position) {
        // Pause all holders except the current one
        for (var entry : activeHolders.entrySet()) {
            if (entry.getKey() != position) {
                entry.getValue().stopPlayer();
            }
        }
        currentPosition = position;
        // Play the current holder
        VideoViewHolder current = activeHolders.get(position);
        if (current != null) {
            current.startPlayer();
        }
    }

    /** Pause all active players (e.g. when leaving the feed). */
    public void pauseAll() {
        for (VideoViewHolder holder : activeHolders.values()) {
            holder.stopPlayer();
        }
    }

    @Override
    public void onViewAttachedToWindow(@NonNull VideoViewHolder holder) {
        super.onViewAttachedToWindow(holder);
        int pos = holder.getAdapterPosition();
        activeHolders.put(pos, holder);
        // Only auto-play if this is the current page
        if (pos == currentPosition) {
            holder.startPlayer();
        }
    }

    @Override
    public void onViewDetachedFromWindow(@NonNull VideoViewHolder holder) {
        super.onViewDetachedFromWindow(holder);
        int pos = holder.getAdapterPosition();
        activeHolders.remove(pos);
        holder.stopPlayer();
    }

    @Override
    public void onViewRecycled(@NonNull VideoViewHolder holder) {
        super.onViewRecycled(holder);
        holder.releasePlayer();
    }

    @OptIn(markerClass = UnstableApi.class)
    static class VideoViewHolder extends RecyclerView.ViewHolder {
        final PlayerView playerView;
        final ImageView ivCover;
        final ImageView ivPlayPause;
        final View touchOverlay;
        final TextView tvAuthor;
        final TextView tvTitle;
        final ImageView ivLike;
        final TextView tvLikeCount;
        final ImageView ivHeartAnim;
        final ProgressBar progressLoading;
        final TextView tvTags;
        final View viewProgress;

        ExoPlayer player;
        String videoUrl;
        boolean isPlaying = false;

        VideoViewHolder(@NonNull View itemView) {
            super(itemView);
            playerView = itemView.findViewById(R.id.playerView);
            ivCover = itemView.findViewById(R.id.ivCover);
            ivPlayPause = itemView.findViewById(R.id.ivPlayPause);
            touchOverlay = itemView.findViewById(R.id.touchOverlay);
            tvAuthor = itemView.findViewById(R.id.tvAuthor);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            ivLike = itemView.findViewById(R.id.ivLike);
            tvLikeCount = itemView.findViewById(R.id.tvLikeCount);
            ivHeartAnim = itemView.findViewById(R.id.ivHeartAnim);
            progressLoading = itemView.findViewById(R.id.progressLoading);
            tvTags = itemView.findViewById(R.id.tvTags);
            viewProgress = itemView.findViewById(R.id.viewProgress);
        }

        void bind(Video video) {
            tvAuthor.setText("@" + (video.getAuthorId() != null ? video.getAuthorId() : ""));
            tvTitle.setText(video.getTitle());
            tvLikeCount.setText(formatCount(video.getLikeCount()));
            videoUrl = UrlUtils.resolveUrl(video.getVideoUrl());

            // Like state — use custom heart icons
            ivLike.setImageResource(video.isLiked()
                    ? R.drawable.ic_heart_filled
                    : R.drawable.ic_heart_outline);
            ivLike.clearColorFilter();

            // Load cover
            if (video.getCoverUrl() != null && !video.getCoverUrl().isEmpty()) {
                ivCover.setVisibility(View.VISIBLE);
                ivCover.setAlpha(1f);
                Glide.with(itemView.getContext())
                        .load(UrlUtils.resolveUrl(video.getCoverUrl()))
                        .centerCrop()
                        .into(ivCover);
            }

            // Tags
            if (video.getTags() != null && !video.getTags().isEmpty()) {
                StringBuilder sb = new StringBuilder();
                for (String tag : video.getTags()) {
                    if (sb.length() > 0) sb.append("  ");
                    sb.append("#").append(tag);
                }
                tvTags.setText(sb.toString());
                tvTags.setVisibility(View.VISIBLE);
            } else {
                tvTags.setVisibility(View.GONE);
            }

            // Reset progress
            viewProgress.getLayoutParams().width = 0;
            viewProgress.requestLayout();
        }

        void startPlayer() {
            if (videoUrl == null || videoUrl.isEmpty()) return;
            if (player == null) {
                player = new ExoPlayer.Builder(itemView.getContext()).build();
                playerView.setPlayer(player);
                player.setRepeatMode(Player.REPEAT_MODE_ONE);

                player.addListener(new Player.Listener() {
                    @Override
                    public void onPlaybackStateChanged(int state) {
                        if (state == Player.STATE_READY) {
                            ivCover.animate().alpha(0f).setDuration(200)
                                    .withEndAction(() -> ivCover.setVisibility(View.GONE)).start();
                            progressLoading.setVisibility(View.GONE);
                        } else if (state == Player.STATE_BUFFERING) {
                            progressLoading.setVisibility(View.VISIBLE);
                        }
                    }
                });
            }

            player.setMediaItem(MediaItem.fromUri(videoUrl));
            player.prepare();
            player.setPlayWhenReady(true);
            isPlaying = true;
            startProgressUpdater();
        }

        private final Handler progressHandler = new Handler(Looper.getMainLooper());
        private final Runnable progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (player != null && player.getDuration() > 0) {
                    float pct = (float) player.getCurrentPosition() / player.getDuration();
                    int parentWidth = ((View) viewProgress.getParent()).getWidth();
                    viewProgress.getLayoutParams().width = (int) (parentWidth * pct);
                    viewProgress.requestLayout();
                }
                progressHandler.postDelayed(this, 200);
            }
        };

        void startProgressUpdater() { progressHandler.post(progressRunnable); }
        void stopProgressUpdater() { progressHandler.removeCallbacks(progressRunnable); }

        void stopPlayer() {
            if (player != null) {
                player.setPlayWhenReady(false);
                isPlaying = false;
                stopProgressUpdater();
            }
        }

        void releasePlayer() {
            if (player != null) {
                player.release();
                player = null;
                isPlaying = false;
                stopProgressUpdater();
            }
        }

        void togglePlayPause() {
            if (player == null) return;
            if (isPlaying) {
                player.setPlayWhenReady(false);
                ivPlayPause.setScaleX(0.5f);
                ivPlayPause.setScaleY(0.5f);
                ivPlayPause.animate().alpha(0.7f).scaleX(1f).scaleY(1f)
                        .setDuration(200).start();
            } else {
                player.setPlayWhenReady(true);
                ivPlayPause.animate().alpha(0f).scaleX(0.5f).scaleY(0.5f)
                        .setDuration(200).start();
            }
            isPlaying = !isPlaying;
        }

        void showHeartAnimation() {
            ivHeartAnim.setScaleX(0f);
            ivHeartAnim.setScaleY(0f);
            ivHeartAnim.setAlpha(1f);
            ivHeartAnim.setRotation(-15f + (float)(Math.random() * 30));

            ivHeartAnim.animate()
                    .scaleX(1f).scaleY(1f)
                    .setDuration(300)
                    .setInterpolator(new OvershootInterpolator(1.5f))
                    .withEndAction(() ->
                            ivHeartAnim.animate()
                                    .alpha(0f)
                                    .setDuration(400)
                                    .setStartDelay(200)
                                    .start()
                    ).start();
        }

        private String formatCount(Long count) {
            if (count == null) return "0";
            if (count >= 10000) return String.format("%.1fw", count / 10000.0);
            return String.valueOf(count);
        }
    }

    /**
     * Simple double-click detector for View.OnClickListener.
     */
    static abstract class DoubleClickListener implements View.OnClickListener {
        private static final long DOUBLE_CLICK_TIME = 300;
        private long lastClickTime = 0;

        @Override
        public void onClick(View v) {
            long now = System.currentTimeMillis();
            if (now - lastClickTime < DOUBLE_CLICK_TIME) {
                onDoubleClick(v);
                lastClickTime = 0;
            } else {
                lastClickTime = now;
                v.postDelayed(() -> {
                    if (lastClickTime != 0 && System.currentTimeMillis() - lastClickTime >= DOUBLE_CLICK_TIME) {
                        onSingleClick(v);
                    }
                }, DOUBLE_CLICK_TIME);
            }
        }

        public abstract void onSingleClick(View v);
        public abstract void onDoubleClick(View v);
    }
}
