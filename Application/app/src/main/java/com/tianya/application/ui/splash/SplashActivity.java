package com.tianya.application.ui.splash;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.tianya.application.R;
import com.tianya.application.data.api.ApiClient;
import com.tianya.application.data.model.ApiResponse;
import com.tianya.application.data.model.UserProfile;
import com.tianya.application.ui.auth.LoginActivity;
import com.tianya.application.ui.main.MainActivity;
import com.tianya.application.util.TokenManager;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Splash screen: validates token and routes to Login or Main.
 */
public class SplashActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        if (getSupportActionBar() != null) getSupportActionBar().hide();

        // Animate logo entrance
        LinearLayout logoContainer = findViewById(R.id.logoContainer);
        TextView tvSlogan = findViewById(R.id.tvSlogan);

        logoContainer.animate()
                .alpha(1f).scaleX(1f).scaleY(1f)
                .setDuration(600)
                .setInterpolator(new DecelerateInterpolator(1.5f))
                .start();

        tvSlogan.animate()
                .alpha(1f)
                .setStartDelay(400)
                .setDuration(500)
                .start();

        TokenManager tokenManager = TokenManager.getInstance(this);
        if (!tokenManager.isLoggedIn()) {
            navigateDelayed(LoginActivity.class);
            return;
        }

        // Validate token with /api/auth/me
        ApiClient.getInstance(this).getApiService().me().enqueue(new Callback<ApiResponse<UserProfile>>() {
            @Override
            public void onResponse(Call<ApiResponse<UserProfile>> call,
                                   Response<ApiResponse<UserProfile>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    navigateDelayed(MainActivity.class);
                } else {
                    tokenManager.clear();
                    navigateDelayed(LoginActivity.class);
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<UserProfile>> call, Throwable t) {
                // Network error — still try to go to main (offline-friendly)
                navigateDelayed(MainActivity.class);
            }
        });
    }

    private void navigateDelayed(Class<?> target) {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            startActivity(new Intent(SplashActivity.this, target));
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
            finish();
        }, 1200);
    }
}
