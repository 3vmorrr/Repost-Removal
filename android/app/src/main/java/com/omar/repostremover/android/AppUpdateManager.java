package com.omar.repostremover.android;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Checks a small manifest published with each Android GitHub release. */
final class AppUpdateManager {
    private static final String MANIFEST_URL =
            "https://github.com/3vmorrr/Repost-Removal/releases/latest/download/android-update.json";
    private static final String PREFS = "app_updates";
    private static final String CACHED_MANIFEST = "manifest";
    private static final int MAX_MANIFEST_BYTES = 32 * 1024;

    interface Callback {
        void onComplete(UpdateInfo update);
    }

    static final class UpdateInfo {
        final int versionCode;
        final int minimumSupportedVersionCode;
        final String versionName;
        final String message;
        final String messageAr;
        final Uri apkUri;

        UpdateInfo(JSONObject json) throws Exception {
            versionCode = json.getInt("versionCode");
            minimumSupportedVersionCode = json.getInt("minimumSupportedVersionCode");
            versionName = json.optString("versionName", "").trim();
            message = json.optString("message", "A required update is available.").trim();
            messageAr = json.optString("messageAr", "يتوفر تحديث مطلوب للتطبيق.").trim();
            Uri parsed = Uri.parse(json.getString("apkUrl"));
            if (versionCode < 1 || minimumSupportedVersionCode < 1
                    || minimumSupportedVersionCode > versionCode
                    || !"https".equals(parsed.getScheme())
                    || !"github.com".equalsIgnoreCase(parsed.getHost())
                    || !parsed.getPath().contains("/releases/download/")) {
                throw new IllegalArgumentException("Invalid Android update manifest");
            }
            apkUri = parsed;
        }

        boolean isMandatoryFor(int installedVersionCode) {
            return installedVersionCode < minimumSupportedVersionCode;
        }
    }

    private final Context appContext;
    private final SharedPreferences preferences;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());

    AppUpdateManager(Context context) {
        appContext = context.getApplicationContext();
        preferences = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    void check(Callback callback) {
        executor.execute(() -> {
            UpdateInfo latest = fetchLatest();
            int installedVersion = BuildConfig.VERSION_CODE;
            UpdateInfo required = latest != null && latest.isMandatoryFor(installedVersion) ? latest : null;
            main.post(() -> callback.onComplete(required));
        });
    }

    void shutdown() {
        executor.shutdownNow();
    }

    private UpdateInfo fetchLatest() {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(MANIFEST_URL).openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(6500);
            connection.setReadTimeout(6500);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Cache-Control", "no-cache");
            connection.setRequestProperty("User-Agent", "RepostRemoverAndroid/" + BuildConfig.VERSION_NAME);
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) throw new IllegalStateException("Update manifest HTTP " + status);
            String manifest = readLimited(connection.getInputStream());
            UpdateInfo update = new UpdateInfo(new JSONObject(manifest));
            preferences.edit().putString(CACHED_MANIFEST, manifest).apply();
            return update;
        } catch (Exception networkOrParseError) {
            String cached = preferences.getString(CACHED_MANIFEST, null);
            if (cached == null) return null;
            try {
                return new UpdateInfo(new JSONObject(cached));
            } catch (Exception ignored) {
                preferences.edit().remove(CACHED_MANIFEST).apply();
                return null;
            }
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static String readLimited(InputStream input) throws Exception {
        try (InputStream stream = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int total = 0;
            int read;
            while ((read = stream.read(buffer)) != -1) {
                total += read;
                if (total > MAX_MANIFEST_BYTES) throw new IllegalArgumentException("Update manifest is too large");
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }
}

