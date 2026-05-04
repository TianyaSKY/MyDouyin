# =============================================
# Douyin App ProGuard Rules
# =============================================

# --- Retrofit ---
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*

# Keep Retrofit service interfaces
-keep,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# --- OkHttp ---
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# --- Gson ---
-dontwarn com.google.gson.**
-keep class com.google.gson.** { *; }
# Keep all model classes (fields used by Gson serialization)
-keep class com.tianya.application.data.model.** { *; }

# --- Glide ---
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule { <init>(...); }
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** {
    **[] $VALUES;
    public *;
}

# --- Media3 / ExoPlayer ---
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# --- AndroidX ---
-keep class androidx.** { *; }
-dontwarn androidx.**

# --- General ---
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}