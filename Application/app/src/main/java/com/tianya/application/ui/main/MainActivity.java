package com.tianya.application.ui.main;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.google.android.material.snackbar.Snackbar;
import com.tianya.application.R;
import com.tianya.application.data.api.ApiClient;
import com.tianya.application.databinding.ActivityMainBinding;
import com.tianya.application.ui.auth.LoginActivity;
import com.tianya.application.ui.feed.FeedFragment;
import com.tianya.application.ui.profile.ProfileFragment;
import com.tianya.application.ui.upload.UploadActivity;
import com.tianya.application.util.TokenManager;

public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private Fragment currentFragment;
    private final FeedFragment feedFragment = new FeedFragment();
    private final ProfileFragment profileFragment = new ProfileFragment();
    private Snackbar offlineSnackbar;
    private ConnectivityManager.NetworkCallback networkCallback;

    private final ActivityResultLauncher<Intent> uploadLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                // Profile will auto-refresh on resume
            });

    // 401 receiver
    private final BroadcastReceiver unauthorizedReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            goToLogin();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        if (!TokenManager.getInstance(this).isLoggedIn()) {
            goToLogin();
            return;
        }

        // Register 401 listener
        LocalBroadcastManager.getInstance(this).registerReceiver(
                unauthorizedReceiver, new IntentFilter(ApiClient.ACTION_UNAUTHORIZED));

        setupBottomNavigation();
        setupNetworkMonitor();

        if (savedInstanceState == null) {
            switchFragment(feedFragment);
            selectTab("home");
        }
    }

    private void setupBottomNavigation() {
        binding.tabHome.setOnClickListener(v -> {
            switchFragment(feedFragment);
            selectTab("home");
        });

        binding.tabUpload.setOnClickListener(v -> {
            uploadLauncher.launch(new Intent(this, UploadActivity.class));
        });

        binding.tabProfile.setOnClickListener(v -> {
            switchFragment(profileFragment);
            selectTab("profile");
        });
    }

    private void selectTab(String tab) {
        boolean isHome = "home".equals(tab);
        boolean isProfile = "profile".equals(tab);

        animateTab(binding.iconHome, isHome);
        binding.labelHome.setAlpha(isHome ? 1.0f : 0.5f);
        animateTab(binding.iconProfile, isProfile);
        binding.labelProfile.setAlpha(isProfile ? 1.0f : 0.5f);
    }

    private void animateTab(View icon, boolean selected) {
        if (selected) {
            icon.animate().scaleX(1.2f).scaleY(1.2f).alpha(1f).setDuration(100)
                    .withEndAction(() -> icon.animate().scaleX(1f).scaleY(1f).setDuration(100).start())
                    .start();
        } else {
            icon.animate().alpha(0.5f).setDuration(150).start();
        }
    }

    private void setupNetworkMonitor() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return;

        offlineSnackbar = Snackbar.make(binding.getRoot(), "网络连接已断开", Snackbar.LENGTH_INDEFINITE)
                .setBackgroundTint(0xFF333333)
                .setTextColor(0xFFFFFFFF);

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                runOnUiThread(() -> {
                    if (offlineSnackbar.isShown()) offlineSnackbar.dismiss();
                });
            }

            @Override
            public void onLost(@NonNull Network network) {
                runOnUiThread(() -> {
                    if (!offlineSnackbar.isShown()) offlineSnackbar.show();
                });
            }
        };

        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        cm.registerNetworkCallback(request, networkCallback);
    }

    private void switchFragment(Fragment target) {
        if (target == currentFragment) return;

        var transaction = getSupportFragmentManager().beginTransaction();
        if (currentFragment != null) transaction.hide(currentFragment);
        if (target.isAdded()) {
            transaction.show(target);
        } else {
            transaction.add(R.id.fragmentContainer, target);
        }
        transaction.commit();
        currentFragment = target;
    }

    private void goToLogin() {
        startActivity(new Intent(this, LoginActivity.class));
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        LocalBroadcastManager.getInstance(this).unregisterReceiver(unauthorizedReceiver);
        if (networkCallback != null) {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm != null) cm.unregisterNetworkCallback(networkCallback);
        }
    }
}
