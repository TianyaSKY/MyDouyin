package com.tianya.application.ui.upload;

import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import android.content.res.ColorStateList;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.bumptech.glide.Glide;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.tianya.application.R;
import com.tianya.application.data.api.ApiClient;
import com.tianya.application.util.TokenManager;

import java.util.ArrayList;
import java.util.List;

public class UploadActivity extends AppCompatActivity {

    private ImageView ivVideoPreview, ivCoverPreview, ivBack;
    private LinearLayout layoutSelectVideo, layoutProgress;
    private TextView tvSelectCover, tvProgress, tvError, btnPublish;
    private EditText etTitle;
    private ProgressBar progressUpload;
    private ChipGroup chipGroupTags;
    private UploadViewModel viewModel;
    private Uri selectedVideoUri;
    private Uri selectedCoverUri;

    private final ActivityResultLauncher<PickVisualMediaRequest> videoPicker =
            registerForActivityResult(new ActivityResultContracts.PickVisualMedia(), uri -> {
                if (uri != null) {
                    selectedVideoUri = uri;
                    ivVideoPreview.setVisibility(View.VISIBLE);
                    layoutSelectVideo.setVisibility(View.GONE);
                    Glide.with(this).load(uri).centerCrop().into(ivVideoPreview);
                    updatePublishButton();
                }
            });

    private final ActivityResultLauncher<PickVisualMediaRequest> coverPicker =
            registerForActivityResult(new ActivityResultContracts.PickVisualMedia(), uri -> {
                if (uri != null) {
                    selectedCoverUri = uri;
                    ivCoverPreview.setVisibility(View.VISIBLE);
                    tvSelectCover.setVisibility(View.GONE);
                    Glide.with(this).load(uri).centerCrop().into(ivCoverPreview);
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left);
        setContentView(R.layout.activity_upload);

        ivVideoPreview = findViewById(R.id.ivVideoPreview);
        ivCoverPreview = findViewById(R.id.ivCoverPreview);
        ivBack = findViewById(R.id.ivBack);
        layoutSelectVideo = findViewById(R.id.layoutSelectVideo);
        layoutProgress = findViewById(R.id.layoutProgress);
        tvSelectCover = findViewById(R.id.tvSelectCover);
        tvProgress = findViewById(R.id.tvProgress);
        tvError = findViewById(R.id.tvError);
        btnPublish = findViewById(R.id.btnPublish);
        etTitle = findViewById(R.id.etTitle);
        progressUpload = findViewById(R.id.progressUpload);
        chipGroupTags = findViewById(R.id.chipGroupTags);

        viewModel = new ViewModelProvider(this).get(UploadViewModel.class);
        viewModel.init(ApiClient.getInstance(this).getApiService());

        setupListeners();
        setupObservers();
        viewModel.loadTags();
    }

    private void setupListeners() {
        ivBack.setOnClickListener(v -> finish());

        View.OnClickListener selectVideo = v ->
                videoPicker.launch(new PickVisualMediaRequest.Builder()
                        .setMediaType(ActivityResultContracts.PickVisualMedia.VideoOnly.INSTANCE)
                        .build());
        layoutSelectVideo.setOnClickListener(selectVideo);
        ivVideoPreview.setOnClickListener(selectVideo);

        View.OnClickListener coverClick = v ->
                coverPicker.launch(new PickVisualMediaRequest.Builder()
                        .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE)
                        .build());
        ivCoverPreview.setOnClickListener(coverClick);
        tvSelectCover.setOnClickListener(coverClick);

        btnPublish.setOnClickListener(v -> {
            String title = etTitle.getText().toString().trim();
            if (title.isEmpty()) {
                tvError.setText("请输入标题");
                tvError.setVisibility(View.VISIBLE);
                return;
            }
            if (selectedVideoUri == null) {
                tvError.setText("请选择视频");
                tvError.setVisibility(View.VISIBLE);
                return;
            }

            TokenManager tm = TokenManager.getInstance(this);
            List<String> tags = getSelectedTags();
            viewModel.startUpload(this, selectedVideoUri, selectedCoverUri,
                    title, tags, tm.getUserId());
        });
    }

    private void setupObservers() {
        viewModel.getAvailableTags().observe(this, tags -> {
            chipGroupTags.removeAllViews();
            if (tags == null) return;
            for (String tag : tags) {
                Chip chip = new Chip(this);
                chip.setText(tag);
                chip.setCheckable(true);
                chip.setChipBackgroundColor(ColorStateList.valueOf(0xFF2A2A2A));
                chip.setTextColor(0xFFCCCCCC);
                chip.setChipCornerRadius(20f);
                chip.setCheckedIconTint(ColorStateList.valueOf(0xFFFE2C55));
                chip.setOnCheckedChangeListener((btn, checked) -> {
                    ((Chip) btn).setChipBackgroundColor(ColorStateList.valueOf(checked ? 0x33FE2C55 : 0xFF2A2A2A));
                    btn.setTextColor(checked ? 0xFFFFFFFF : 0xFFCCCCCC);
                });
                chipGroupTags.addView(chip);
            }
        });

        viewModel.getUploading().observe(this, uploading -> {
            btnPublish.setEnabled(!uploading && selectedVideoUri != null);
            btnPublish.setAlpha(!uploading && selectedVideoUri != null ? 1.0f : 0.5f);
            layoutProgress.setVisibility(uploading ? View.VISIBLE : View.GONE);
        });

        viewModel.getProgress().observe(this, pct ->
                progressUpload.setProgress(pct != null ? pct : 0));

        viewModel.getStatusText().observe(this, text ->
                tvProgress.setText(text != null ? text : ""));

        viewModel.getErrorMessage().observe(this, error -> {
            if (error != null) {
                tvError.setText(error);
                tvError.setVisibility(View.VISIBLE);
            } else {
                tvError.setVisibility(View.GONE);
            }
        });

        viewModel.getUploadSuccess().observe(this, success -> {
            if (Boolean.TRUE.equals(success)) {
                // Show success with checkmark animation
                btnPublish.setText("✓ 发布成功");
                btnPublish.animate().scaleX(1.05f).scaleY(1.05f).setDuration(150)
                        .withEndAction(() -> btnPublish.animate().scaleX(1f).scaleY(1f).setDuration(150)
                                .withEndAction(() -> {
                                    setResult(RESULT_OK);
                                    finish();
                                }).start())
                        .start();
            }
        });
    }

    private List<String> getSelectedTags() {
        List<String> tags = new ArrayList<>();
        for (int i = 0; i < chipGroupTags.getChildCount(); i++) {
            Chip chip = (Chip) chipGroupTags.getChildAt(i);
            if (chip.isChecked()) tags.add(chip.getText().toString());
        }
        return tags;
    }

    private void updatePublishButton() {
        btnPublish.setEnabled(selectedVideoUri != null);
        btnPublish.setAlpha(selectedVideoUri != null ? 1.0f : 0.5f);
    }

    @Override
    public void finish() {
        super.finish();
        overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right);
    }
}
