package com.tianya.application.util;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Manages JWT token and basic user info persistence via SharedPreferences.
 */
public class TokenManager {

    private static final String PREF_NAME = "douyin_auth";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USERNAME = "username";
    private static final String KEY_NICKNAME = "nickname";
    private static final String KEY_AVATAR_URL = "avatar_url";
    private static final String KEY_EXPIRES_IN = "expires_in";

    private static TokenManager instance;
    private final SharedPreferences prefs;

    private TokenManager(Context context) {
        prefs = context.getApplicationContext()
                .getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public static synchronized TokenManager getInstance(Context context) {
        if (instance == null) {
            instance = new TokenManager(context);
        }
        return instance;
    }

    public void saveAuth(String token, long expiresIn, long userId,
                         String username, String nickname, String avatarUrl) {
        prefs.edit()
                .putString(KEY_TOKEN, token)
                .putLong(KEY_EXPIRES_IN, expiresIn)
                .putLong(KEY_USER_ID, userId)
                .putString(KEY_USERNAME, username)
                .putString(KEY_NICKNAME, nickname)
                .putString(KEY_AVATAR_URL, avatarUrl)
                .apply();
    }

    public String getToken() {
        return prefs.getString(KEY_TOKEN, null);
    }

    public long getUserId() {
        return prefs.getLong(KEY_USER_ID, -1);
    }

    public String getUsername() {
        return prefs.getString(KEY_USERNAME, null);
    }

    public String getNickname() {
        return prefs.getString(KEY_NICKNAME, null);
    }

    public String getAvatarUrl() {
        return prefs.getString(KEY_AVATAR_URL, null);
    }

    public boolean isLoggedIn() {
        return getToken() != null;
    }

    public void clear() {
        prefs.edit().clear().apply();
    }
}
