package com.tianya.application.ui.auth;

import android.content.Intent;
import android.content.res.ColorStateList;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.tianya.application.R;
import com.tianya.application.data.api.ApiClient;
import com.tianya.application.data.model.TokenResponse;
import com.tianya.application.data.model.UserProfile;
import com.tianya.application.ui.main.MainActivity;
import com.tianya.application.util.TokenManager;

import java.util.ArrayList;
import java.util.List;

public class LoginActivity extends AppCompatActivity {

    private EditText etUsername, etPassword, etNickname;
    private TextView btnSubmit, tvError, tvTagsLabel, tvToggleHint, tvToggle;
    private ProgressBar progressBar;
    private ChipGroup chipGroupTags;
    private ImageView ivTogglePassword;
    private boolean passwordVisible = false;

    private LoginViewModel viewModel;
    private TokenManager tokenManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        tokenManager = TokenManager.getInstance(this);

        if (tokenManager.isLoggedIn()) {
            goToMain();
            return;
        }

        etUsername = findViewById(R.id.etUsername);
        etPassword = findViewById(R.id.etPassword);
        etNickname = findViewById(R.id.etNickname);
        btnSubmit = findViewById(R.id.btnSubmit);
        tvError = findViewById(R.id.tvError);
        tvTagsLabel = findViewById(R.id.tvTagsLabel);
        tvToggleHint = findViewById(R.id.tvToggleHint);
        tvToggle = findViewById(R.id.tvToggle);
        progressBar = findViewById(R.id.progressBar);
        chipGroupTags = findViewById(R.id.chipGroupTags);
        ivTogglePassword = findViewById(R.id.ivTogglePassword);

        viewModel = new ViewModelProvider(this).get(LoginViewModel.class);
        viewModel.init(ApiClient.getInstance(this).getApiService());

        setupObservers();
        setupListeners();
    }

    private void setupObservers() {
        viewModel.getAuthResult().observe(this, this::onAuthSuccess);

        viewModel.getErrorMessage().observe(this, error -> {
            if (error != null) {
                tvError.setText(error);
                tvError.setVisibility(View.VISIBLE);
            } else {
                tvError.setVisibility(View.GONE);
            }
        });

        viewModel.getLoading().observe(this, isLoading -> {
            btnSubmit.setEnabled(!isLoading);
            btnSubmit.setAlpha(isLoading ? 0.5f : 1.0f);
            progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
            btnSubmit.setVisibility(isLoading ? View.INVISIBLE : View.VISIBLE);
        });

        viewModel.getIsRegisterMode().observe(this, isRegister -> {
            etNickname.setVisibility(isRegister ? View.VISIBLE : View.GONE);
            tvTagsLabel.setVisibility(isRegister ? View.VISIBLE : View.GONE);
            chipGroupTags.setVisibility(isRegister ? View.VISIBLE : View.GONE);
            btnSubmit.setText(isRegister ? "注册" : "登录");
            tvToggleHint.setText(isRegister ? "已有账号？" : "还没有账号？");
            tvToggle.setText(isRegister ? "去登录" : "去注册");
            tvError.setVisibility(View.GONE);

            if (isRegister) {
                viewModel.loadTags();
            }
        });

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
    }

    private void setupListeners() {
        btnSubmit.setOnClickListener(v -> {
            String username = etUsername.getText().toString().trim();
            String password = etPassword.getText().toString().trim();

            Boolean isRegister = viewModel.getIsRegisterMode().getValue();
            if (isRegister != null && isRegister) {
                String nickname = etNickname.getText().toString().trim();
                List<String> selectedTags = getSelectedTags();
                viewModel.register(username, password, nickname, selectedTags);
            } else {
                viewModel.login(username, password);
            }
        });

        tvToggle.setOnClickListener(v -> viewModel.toggleMode());

        // Password visibility toggle
        ivTogglePassword.setOnClickListener(v -> {
            passwordVisible = !passwordVisible;
            if (passwordVisible) {
                etPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
                ivTogglePassword.setImageResource(R.drawable.ic_visibility);
            } else {
                etPassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                ivTogglePassword.setImageResource(R.drawable.ic_visibility_off);
            }
            etPassword.setSelection(etPassword.getText().length());
        });
    }

    private List<String> getSelectedTags() {
        List<String> tags = new ArrayList<>();
        for (int i = 0; i < chipGroupTags.getChildCount(); i++) {
            Chip chip = (Chip) chipGroupTags.getChildAt(i);
            if (chip.isChecked()) {
                tags.add(chip.getText().toString());
            }
        }
        return tags;
    }

    private void onAuthSuccess(TokenResponse tokenResponse) {
        if (tokenResponse == null) return;
        UserProfile user = tokenResponse.getUser();
        tokenManager.saveAuth(
                tokenResponse.getToken(),
                tokenResponse.getExpiresIn() != null ? tokenResponse.getExpiresIn() : 0,
                user.getUserId(),
                user.getUsername(),
                user.getNickname(),
                user.getAvatarUrl()
        );
        goToMain();
    }

    private void goToMain() {
        startActivity(new Intent(this, MainActivity.class));
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        finish();
    }
}
