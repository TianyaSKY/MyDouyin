package com.tianya.application.data.api;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.tianya.application.BuildConfig;
import com.tianya.application.util.TokenManager;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Response;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

/**
 * Retrofit singleton providing ApiService instances.
 * Includes 401 unauthorized detection and token auto-clear.
 */
public class ApiClient {

    /** Broadcast action sent when a 401 response is received. */
    public static final String ACTION_UNAUTHORIZED = "com.tianya.application.UNAUTHORIZED";

    private static volatile ApiClient instance;
    private final ApiService apiService;
    private final OkHttpClient okHttpClient;
    private final Context appContext;

    private ApiClient(Context context) {
        appContext = context.getApplicationContext();

        HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
        logging.setLevel(BuildConfig.DEBUG
                ? HttpLoggingInterceptor.Level.BODY
                : HttpLoggingInterceptor.Level.NONE);

        TokenManager tokenManager = TokenManager.getInstance(context);

        okHttpClient = new OkHttpClient.Builder()
                .addInterceptor(new AuthInterceptor(tokenManager))
                .addInterceptor(logging)
                // 401 response interceptor
                .addInterceptor(new UnauthorizedInterceptor(tokenManager, appContext))
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build();

        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.BASE_URL)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        apiService = retrofit.create(ApiService.class);
    }

    public static ApiClient getInstance(Context context) {
        if (instance == null) {
            synchronized (ApiClient.class) {
                if (instance == null) {
                    instance = new ApiClient(context.getApplicationContext());
                }
            }
        }
        return instance;
    }

    public ApiService getApiService() {
        return apiService;
    }

    public OkHttpClient getOkHttpClient() {
        return okHttpClient;
    }

    /**
     * Interceptor that detects 401 responses, clears token, and broadcasts an event.
     */
    private static class UnauthorizedInterceptor implements Interceptor {
        private final TokenManager tokenManager;
        private final Context context;

        UnauthorizedInterceptor(TokenManager tokenManager, Context context) {
            this.tokenManager = tokenManager;
            this.context = context;
        }

        @NonNull
        @Override
        public Response intercept(@NonNull Chain chain) throws IOException {
            Response response = chain.proceed(chain.request());

            if (response.code() == 401) {
                // Skip for auth endpoints (login/register) to avoid loop
                String path = chain.request().url().encodedPath();
                if (!path.contains("/api/auth/login") && !path.contains("/api/auth/register")) {
                    tokenManager.clear();
                    // Broadcast on main thread
                    new Handler(Looper.getMainLooper()).post(() -> {
                        Intent intent = new Intent(ACTION_UNAUTHORIZED);
                        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
                    });
                }
            }

            return response;
        }
    }
}
