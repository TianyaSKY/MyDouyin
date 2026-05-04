package com.tianya.application.ui.player;

import android.os.Bundle;

import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

import com.tianya.application.R;
import com.tianya.application.databinding.ActivityVideoPlayerBinding;

/**
 * Full-screen video player launched from profile grid.
 * Receives video URL, title via Intent extras.
 */
public class VideoPlayerActivity extends AppCompatActivity {

    public static final String EXTRA_VIDEO_URL = "video_url";
    public static final String EXTRA_TITLE = "title";

    private ExoPlayer player;
    private ActivityVideoPlayerBinding binding;

    @Override
    @OptIn(markerClass = UnstableApi.class)
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);
        binding = ActivityVideoPlayerBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        String videoUrl = getIntent().getStringExtra(EXTRA_VIDEO_URL);
        String title = getIntent().getStringExtra(EXTRA_TITLE);

        if (title != null && !title.isEmpty()) {
            binding.tvTitle.setText(title);
        } else {
            binding.tvTitle.setVisibility(android.view.View.GONE);
        }

        binding.ivBack.setOnClickListener(v -> finish());

        if (videoUrl != null) {
            player = new ExoPlayer.Builder(this).build();
            binding.playerView.setPlayer(player);
            player.setMediaItem(MediaItem.fromUri(videoUrl));
            player.prepare();
            player.setPlayWhenReady(true);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) player.setPlayWhenReady(false);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (player != null) player.setPlayWhenReady(true);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }

    @Override
    public void finish() {
        super.finish();
        overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right);
    }
}
