package com.omar.repostremover.android;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class MainActivity extends Activity implements AndroidJavascriptBridge.Dispatcher {
    private static final String ASSET_ORIGIN = "https://appassets.androidplatform.net";
    private static final String TIKTOK_HOME = "https://www.tiktok.com/";
    private static final String TAG = "RRMobile";

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService operations = Executors.newSingleThreadExecutor();
    private final AtomicBoolean operationActive = new AtomicBoolean(false);
    private final AtomicBoolean logoutQueued = new AtomicBoolean(false);
    private final AtomicBoolean stopRequested = new AtomicBoolean(false);
    private final AtomicBoolean sessionCheckActive = new AtomicBoolean(false);

    private FrameLayout root;
    private WebView dashboard;
    private WebView tiktokView;
    private FrameLayout browserFrame;
    private WebViewAssetLoader assetLoader;
    private RepostStore store;
    private TikTokBrowser tiktok;
    private boolean browserVisible;
    private boolean destroyed;
    private String flow = "Ready";
    private JSONObject session = session("unknown", null, null);
    private JSONObject activity = idleActivity();
    private int pagesScanned;
    private int found;
    private int processed;
    private int total;
    private int requested;
    private int failed;
    private int verificationPage;
    private int verificationTotal;
    private long startedAt;
    private long finishedAt;
    private long lastSessionCheckAt;

    private final Runnable sessionProbe = new Runnable() {
        @Override public void run() {
            if (browserVisible && !isFinishing()) checkSessionAsync();
            main.postDelayed(this, 12_000L);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        store = new RepostStore(this);
        configureWindow();

        root = new FrameLayout(this);
        rootInsetListener();
        root.setBackgroundColor(Color.rgb(245, 243, 237));
        dashboard = new WebView(this);
        configureDashboard();
        root.addView(dashboard, new FrameLayout.LayoutParams(-1, -1));

        tiktok = new TikTokBrowser(this, () -> main.postDelayed(this::checkSessionAsync, 900));
        tiktokView = tiktok.view();
        tiktokView.setVisibility(View.GONE);
        browserFrame = new FrameLayout(this);
        GradientDrawable browserSurface = new GradientDrawable();
        browserSurface.setColor(Color.rgb(255, 254, 250));
        browserSurface.setCornerRadius(dp(16));
        browserSurface.setStroke(dp(1), Color.rgb(224, 221, 212));
        browserFrame.setBackground(browserSurface);
        browserFrame.setClipToOutline(true);
        browserFrame.setElevation(dp(2));
        browserFrame.setVisibility(View.GONE);
        browserFrame.addView(tiktokView, new FrameLayout.LayoutParams(-1, -1));
        root.addView(browserFrame, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        applyThemeSystemBars();

        main.post(sessionProbe);
        dashboard.loadUrl(ASSET_ORIGIN + "/assets/www/index.html");
        // Restore the persistent TikTok WebView session in the background so the
        // dashboard can show its real session state without requiring a manual check.
        tiktok.openIfNeeded();
    }

    private void configureWindow() {
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.rgb(245, 243, 237));
        window.setNavigationBarColor(Color.rgb(245, 243, 237));
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false);
        }
    }

    private void rootInsetListener() {
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            }
            return insets;
        });
    }

    private void configureDashboard() {
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        dashboard.setBackgroundColor(Color.rgb(245, 243, 237));
        dashboard.setOverScrollMode(View.OVER_SCROLL_NEVER);
        dashboard.getSettings().setJavaScriptEnabled(true);
        dashboard.getSettings().setDomStorageEnabled(false);
        dashboard.getSettings().setAllowFileAccess(false);
        dashboard.getSettings().setAllowContentAccess(false);
        dashboard.getSettings().setSupportMultipleWindows(false);
        dashboard.addJavascriptInterface(new AndroidJavascriptBridge(this), "RepostRemoverAndroid");
        dashboard.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return routeDashboardUrl(request.getUrl());
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return routeDashboardUrl(Uri.parse(url));
            }
        });
    }

    private boolean routeDashboardUrl(Uri uri) {
        if (ASSET_ORIGIN.equals(uri.getScheme() + "://" + uri.getHost())) return false;
        if (uri.getScheme() != null && uri.getScheme().equals("https") && isTikTokHost(uri.getHost())) {
            openTikTok(uri.toString());
            return true;
        }
        if ("https".equals(uri.getScheme())) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
        }
        return true;
    }

    @Override
    public void dispatch(String requestId, String method, String argumentsJson) {
        main.post(() -> handleBridgeRequest(requestId, method, argumentsJson));
    }

    private void handleBridgeRequest(String id, String method, String argumentsJson) {
        try {
            JSONArray args = new JSONArray(argumentsJson == null ? "[]" : argumentsJson);
            switch (method) {
                case "overview": reply(id, overview()); break;
                case "setTheme": reply(id, setPreference("theme", args.getString(0), "light", "dark")); break;
                case "setLanguage": reply(id, setPreference("language", args.getString(0), "en", "ar")); break;
                case "openSocial": openSocial(args.getString(0)); reply(id, true); break;
                case "openBrowser": browserVisible = true; tiktok.openIfNeeded(); showBrowser(); emit("browserVisible", true); emitOverview(); reply(id, true); break;
                case "hideBrowser": browserVisible = false; hideBrowser(); emit("browserVisible", false); emitOverview(); reply(id, true); break;
                case "browserControl": browserControl(args.getString(0)); reply(id, true); break;
                case "checkSession": checkSessionRequest(id); break;
                case "logout": queueLogout(id); break;
                case "startScan": startScan(id); break;
                case "stop": stop(); reply(id, true); break;
                case "select": store.setSelected(args.getString(0), args.getBoolean(1)); reply(id, overview()); emitOverview(); break;
                case "selectAll": store.selectAll(args.getBoolean(0)); reply(id, overview()); emitOverview(); break;
                case "removeSelected": startRemoval(id); break;
                default: throw new IllegalArgumentException("Unknown Android action.");
            }
        } catch (Exception error) {
            replyError(id, message(error));
        }
    }

    private JSONObject setPreference(String key, String value, String first, String second) throws JSONException {
        if (!first.equals(value) && !second.equals(value)) throw new IllegalArgumentException("Invalid preference.");
        store.setSetting(key, value);
        applyThemeSystemBars();
        return overview();
    }

    private void applyThemeSystemBars() {
        boolean dark = "dark".equals(store.setting("theme", "light"));
        int background = dark ? Color.rgb(32, 34, 31) : Color.rgb(245, 243, 237);
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);
        int flags = dark ? 0 : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
        root.setBackgroundColor(background);
    }

    private JSONObject overview() throws JSONException {
        JSONObject result = new JSONObject();
        result.put("items", store.items());
        result.put("state", flow);
        result.put("progress", activity);
        result.put("theme", store.setting("theme", "light"));
        result.put("language", store.setting("language", "en"));
        result.put("session", session);
        result.put("browserVisible", browserVisible);
        result.put("version", BuildConfig.VERSION_NAME);
        return result;
    }

    private JSONObject idleActivity() {
        JSONObject result = new JSONObject();
        try {
            result.put("kind", "idle"); result.put("phase", "idle");
            result.put("pagesScanned", 0); result.put("found", 0); result.put("processed", 0); result.put("total", 0);
            result.put("requested", 0); result.put("failed", 0); result.put("verificationPage", 0); result.put("verificationTotal", 0);
            result.put("startedAt", JSONObject.NULL); result.put("finishedAt", JSONObject.NULL);
        } catch (JSONException ignored) { }
        return result;
    }

    private JSONObject session(String status, String handle, String stableId) {
        JSONObject result = new JSONObject();
        try {
            result.put("status", status);
            result.put("handle", handle == null ? JSONObject.NULL : handle);
            result.put("stableId", stableId == null ? JSONObject.NULL : stableId);
        } catch (JSONException ignored) { }
        return result;
    }

    private void resetActivity(String kind) {
        pagesScanned = 0; found = store.itemCount(); processed = 0; total = 0; requested = 0; failed = 0; verificationPage = 0; verificationTotal = 0;
        startedAt = System.currentTimeMillis(); finishedAt = 0;
        flow = kind.equals("scan") ? "Scanning reposts" : "Removing selected";
        activity = progress(kind, "running");
        emitOverview();
    }

    private JSONObject progress(String kind, String phase) {
        JSONObject result = new JSONObject();
        try {
            result.put("kind", kind); result.put("phase", phase); result.put("pagesScanned", pagesScanned); result.put("found", found);
            result.put("processed", processed); result.put("total", total); result.put("requested", requested); result.put("failed", failed);
            result.put("verificationPage", verificationPage); result.put("verificationTotal", verificationTotal);
            result.put("startedAt", startedAt == 0 ? JSONObject.NULL : startedAt);
            result.put("finishedAt", finishedAt == 0 ? JSONObject.NULL : finishedAt);
        } catch (JSONException ignored) { }
        return result;
    }

    private void publishActivity() {
        activity = progress(activity.optString("kind", "idle"), activity.optString("phase", "idle"));
        emitOverview();
    }

    private void startScan(String id) {
        if (logoutQueued.get() || !operationActive.compareAndSet(false, true)) { replyError(id, "Another operation is already running."); return; }
        stopRequested.set(false);
        reply(id, true);
        operations.execute(() -> runScan());
    }

    private void runScan() {
        final long scanStartedAt = System.currentTimeMillis();
        Log.i(TAG, "Scan started");
        try {
            JSONObject identity = requireLoggedInIdentity();
            main.post(() -> {
                session = identity;
                emitSession();
                if (browserVisible) {
                    browserVisible = false;
                    hideBrowser();
                    emit("browserVisible", false);
                }
                emitOverview();
            });
            pagesScanned = 0; found = 0; processed = 0; total = 0; requested = 0; failed = 0; verificationPage = 0; verificationTotal = 0;
            startedAt = System.currentTimeMillis(); finishedAt = 0; flow = "Scanning reposts"; activity = progress("scan", "running");
            emitOverview();
            String cursor = "0";
            Set<String> visited = new HashSet<>();
            int pageNumber = 0;
            boolean replacedPreviousResults = false;
            while (!stopRequested.get()) {
                if (!visited.add(cursor)) throw new IllegalStateException("TikTok repeated a pagination cursor. Partial results remain available.");
                pageNumber++;
                JSONObject page = object(tiktok.listReposts(cursor));
                if (page.optBoolean("schemaError")) {
                    Log.w(TAG, "Unexpected repost response: status=" + page.optString("statusCode", "null") + ", keys=" + page.optString("responseKeys") + ", nestedKeys=" + page.optString("nestedKeys"));
                    throw new IllegalStateException("TikTok returned an unexpected repost-list response.");
                }
                JSONArray rows = page.optJSONArray("items");
                if (rows == null) rows = new JSONArray();
                Log.i(TAG, "Scan page " + pageNumber + ": raw=" + page.optInt("rawCount", rows.length()) + ", usable=" + rows.length() + ", hasMore=" + page.optBoolean("hasMore"));
                if (!replacedPreviousResults) {
                    store.clearResults();
                    replacedPreviousResults = true;
                }
                store.replaceScanResults(rows, pageNumber);
                int count = store.itemCount();
                boolean hasMore = page.optBoolean("hasMore");
                String nextCursor = page.optString("cursor", cursor);
                final int progressPage = pageNumber;
                final int progressCount = count;
                main.post(() -> {
                    pagesScanned = progressPage; found = progressCount;
                    flow = "Scanning · page " + progressPage + " · " + progressCount + " found";
                    publishActivity();
                });
                if (!hasMore || stopRequested.get()) break;
                if (nextCursor.equals(cursor)) throw new IllegalStateException("TikTok did not provide a next cursor.");
                cursor = nextCursor;
                if (!pause(1200)) break;
            }
            boolean stopped = stopRequested.get();
            int scannedPages = pageNumber;
            int scannedFound = store.itemCount();
            Log.i(TAG, "Scan " + (stopped ? "stopped" : "completed") + ": pages=" + scannedPages + ", found=" + scannedFound + ", elapsedMs=" + (System.currentTimeMillis() - scanStartedAt));
            main.post(() -> finishOperation(stopped ? "Scan stopped · partial results saved" : "Scan complete", stopped ? "stopped" : "complete"));
        } catch (Exception error) {
            String reason = message(error);
            Log.w(TAG, "Scan failed: " + diagnosticError(error));
            boolean stopped = stopRequested.get();
            main.post(() -> {
                finishOperation(stopped ? "Scan stopped · partial results saved" : "Scan stopped · " + reason, stopped ? "stopped" : "error");
            });
        } finally {
            operationActive.set(false);
            if (logoutQueued.get()) main.post(this::runQueuedLogout);
        }
    }

    private void startRemoval(String id) {
        if (logoutQueued.get() || !operationActive.compareAndSet(false, true)) { replyError(id, "Another operation is already running."); return; }
        JSONArray queue;
        try { queue = store.pendingSelected(); }
        catch (Exception error) { operationActive.set(false); replyError(id, message(error)); return; }
        if (queue.length() == 0) { operationActive.set(false); replyError(id, "Select at least one repost that has not been removed."); return; }
        stopRequested.set(false);
        total = queue.length(); processed = 0; requested = 0; failed = 0; found = store.itemCount(); pagesScanned = 0; verificationPage = 0; verificationTotal = 0;
        startedAt = System.currentTimeMillis(); finishedAt = 0; flow = "Removing selected · 0 / " + total; activity = progress("remove", "running");
        emitOverview(); reply(id, true);
        operations.execute(() -> runRemoval(queue));
    }

    private void runRemoval(JSONArray queue) {
        final long removalStartedAt = System.currentTimeMillis();
        Log.i(TAG, "Removal started: selected=" + queue.length());
        JSONArray attempted = new JSONArray();
        String expectedId;
        try {
            JSONObject identity = requireLoggedInIdentity();
            expectedId = identity.getString("stableId");
            main.post(() -> { session = identity; emitSession(); });
        } catch (Exception error) {
            String reason = message(error);
            Log.w(TAG, "Removal stopped before first item: " + diagnosticError(error));
            main.post(() -> finishOperation("Stopped · " + reason, "error"));
            operationActive.set(false);
            if (logoutQueued.get()) main.post(this::runQueuedLogout);
            return;
        }

        int attemptsInGroup = 0;
        int groupSize = randomBetween(35, 45);
        Log.i(TAG, "Removal pacing initialized: groupSize=" + groupSize);
        for (int i = 0; i < queue.length() && !stopRequested.get(); i++) {
            JSONObject item = queue.optJSONObject(i);
            if (item == null) continue;
            try {
                JSONObject current = requireLoggedInIdentity();
                if (!expectedId.equals(current.optString("stableId"))) {
                    flow = "Stopped · the signed-in TikTok account changed";
                    break;
                }
                String id = item.getString("id");
                store.updateStatus(id, "removing", "");
                final int index = i + 1;
                main.post(() -> { flow = "Removing selected · " + index + " / " + queue.length(); processed = index - 1; publishActivity(); });
                tiktok.removeRepost(id);
                attempted.put(id);
                requested++;
                Log.i(TAG, "Removal request accepted: completed=" + requested + ", selected=" + queue.length());
            } catch (Exception error) {
                String reason = message(error);
                Log.w(TAG, "Removal item failed: " + diagnosticError(error));
                store.updateStatus(item.optString("id"), "failed", reason);
                failed++;
                if (isSafetyStop(reason)) {
                    flow = "Stopped for account safety · " + reason;
                    processed = i + 1;
                    main.post(this::publishActivity);
                    break;
                }
            }
            processed = i + 1;
            flow = "Removing selected · " + processed + " / " + queue.length();
            main.post(this::publishActivity);
            attemptsInGroup++;
            if (attemptsInGroup >= groupSize) {
                if (i + 1 < queue.length() && !stopRequested.get()) {
                    long cooldown = randomBetween(4_000, 7_000);
                    Log.i(TAG, "Removal cooldown: seconds=" + (cooldown / 1_000.0));
                    if (!pause(cooldown)) break;
                }
                attemptsInGroup = 0;
                groupSize = randomBetween(35, 45);
            } else if (i + 1 < queue.length() && !stopRequested.get() && !pause(randomBetween(300, 600))) {
                break;
            }
        }

        if (attempted.length() > 0 && !stopRequested.get()) {
            try {
                int remaining = verifyRemoved(attempted, expectedId);
                if (remaining > 0) {
                    failed += remaining;
                    flow = "Removal incomplete · " + remaining + " still present";
                    Log.w(TAG, "Removal verification found " + remaining + " of " + attempted.length() + " items still present");
                }
            }
            catch (Exception error) {
                String reason = message(error);
                for (int i = 0; i < attempted.length(); i++) store.updateStatus(attempted.optString(i), "remaining", "Removal requested; final verification could not complete: " + reason);
                flow = "Verification stopped · " + reason;
                Log.w(TAG, "Removal verification failed: " + diagnosticError(error));
            }
        }
        if (stopRequested.get()) {
            for (int i = 0; i < attempted.length(); i++) store.updateStatus(attempted.optString(i), "remaining", "Removal was requested; final verification was stopped.");
            main.post(() -> finishOperation("Removal stopped · verification may be incomplete", "stopped"));
        } else if (flow.startsWith("Removing selected")) {
            main.post(() -> finishOperation("Removal complete · verified against TikTok", "complete"));
        } else if (flow.startsWith("Removal incomplete")) {
            String finalFlow = flow;
            main.post(() -> finishOperation(finalFlow, "partial"));
        } else {
            String finalFlow = flow;
            main.post(() -> finishOperation(finalFlow, finalFlow.startsWith("Verification stopped") ? "error" : "stopped"));
        }
        operationActive.set(false);
        Log.i(TAG, "Removal " + (flow.startsWith("Removal complete") ? "completed" : "finished") + ": requested=" + requested + ", failed=" + failed + ", elapsedMs=" + (System.currentTimeMillis() - removalStartedAt));
        if (logoutQueued.get()) main.post(this::runQueuedLogout);
    }

    private int verifyRemoved(JSONArray ids, String expectedId) throws Exception {
        main.post(() -> { flow = "Verifying completed removals"; activity = progress("remove", "verifying"); publishActivity(); });
        JSONObject current = requireLoggedInIdentity();
        if (!expectedId.equals(current.optString("stableId"))) throw new IllegalStateException("The signed-in TikTok account changed before final verification.");
        int pageLimit = Math.max(1, store.maxScanPage(ids));
        verificationTotal = pageLimit; verificationPage = 0;
        Set<String> present = new HashSet<>();
        String cursor = "0";
        Set<String> visited = new HashSet<>();
        for (int pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
            if (stopRequested.get()) return -1;
            if (!visited.add(cursor)) throw new IllegalStateException("TikTok repeated a cursor during verification.");
            JSONObject page = object(tiktok.listReposts(cursor));
            JSONArray rows = page.optJSONArray("items");
            if (rows != null) for (int i = 0; i < rows.length(); i++) present.add(rows.optJSONObject(i).optString("id"));
            verificationPage = pageNumber;
            Log.i(TAG, "Removal verification page " + pageNumber + " received " + (rows == null ? 0 : rows.length()) + " items");
            flow = "Verifying completed removals · page " + pageNumber + " of at most " + pageLimit;
            main.post(this::publishActivity);
            if (!page.optBoolean("hasMore") || pageNumber >= pageLimit) break;
            String next = page.optString("cursor", cursor);
            if (next.equals(cursor)) throw new IllegalStateException("TikTok omitted a next cursor during verification.");
            cursor = next;
            if (!pause(1200)) return -1;
        }
        int remaining = 0;
        for (int i = 0; i < ids.length(); i++) {
            String id = ids.getString(i);
            if (present.contains(id)) {
                store.updateStatus(id, "remaining", "Still present after TikTok listing verification.");
                remaining++;
            }
            else store.updateStatus(id, "removed", "");
        }
        return remaining;
    }

    private JSONObject requireLoggedInIdentity() throws Exception {
        JSONObject identity = tiktok.pageIdentity();
        if (identity == null) throw new IllegalStateException("Could not read the TikTok page. Open TikTok and sign in first.");
        String stableId = identity.optString("secUid", "");
        String handle = identity.optString("handle", "");
        if (!isMissingIdentityValue(stableId) && !isMissingIdentityValue(handle)) return verifyIdentity(identity);
        if (identity.optBoolean("loggedOutSignal")) {
            main.post(() -> { session = session("logged-out", null, null); emitSession(); });
            throw new IllegalStateException("TikTok is not signed in. Sign in and retry.");
        }
        if (identity.optBoolean("accountContextReady") && !identity.optBoolean("profileReady")) {
            if (!tiktok.openCurrentUserProfile()) throw new IllegalStateException("TikTok account details are not available on this page. Open your TikTok Profile, then retry.");
            for (int attempt = 0; attempt < 10; attempt++) {
                Thread.sleep(600);
                identity = tiktok.pageIdentity();
                if (identity == null) continue;
                stableId = identity.optString("secUid", "");
                handle = identity.optString("handle", "");
                if (!isMissingIdentityValue(stableId) && !isMissingIdentityValue(handle)) return verifyIdentity(identity);
                if (identity.optBoolean("loggedOutSignal")) {
                    main.post(() -> { session = session("logged-out", null, null); emitSession(); });
                    throw new IllegalStateException("TikTok is not signed in. Sign in and retry.");
                }
            }
        }
        if (!identity.optBoolean("universalReady")) throw new IllegalStateException("TikTok profile data has not loaded yet. Wait for TikTok to finish loading, then try again.");
        if (!identity.optBoolean("accountContextReady")) throw new IllegalStateException("TikTok did not expose account data on this page. Reload TikTok and check the session.");
        if (!identity.optBoolean("profileReady")) throw new IllegalStateException("TikTok account details are incomplete on this page. Open TikTok Profile, then retry.");
        throw new IllegalStateException("Could not confirm a signed-in TikTok profile. Sign in and retry.");
    }

    private JSONObject verifyIdentity(JSONObject identity) throws Exception {
        String stableId = identity.optString("secUid", "");
        String handle = identity.optString("handle", "");
        if (isMissingIdentityValue(stableId) || isMissingIdentityValue(handle)) {
            throw new IllegalStateException("TikTok account details are not available on this page. Open your TikTok Profile, then retry.");
        }
        return session("logged-in", handle, stableId);
    }

    private JSONObject readSessionSnapshot() throws Exception {
        JSONObject identity = tiktok.pageIdentity();
        if (identity == null) return session("unknown", null, null);
        if (identity.optBoolean("loggedOutSignal")) return session("logged-out", null, null);
        String stableId = identity.optString("secUid", "");
        String handle = identity.optString("handle", "");
        if (isMissingIdentityValue(stableId) || isMissingIdentityValue(handle)) return session("unknown", null, null);
        return verifyIdentity(identity);
    }

    private void checkSessionAsync() {
        if (tiktok == null || tiktokView == null || tiktok.currentUrl().isEmpty() || logoutQueued.get()) return;
        if (operationActive.get() || !sessionCheckActive.compareAndSet(false, true)) return;
        long now = android.os.SystemClock.uptimeMillis();
        if (now - lastSessionCheckAt < 15_000L) {
            sessionCheckActive.set(false);
            return;
        }
        lastSessionCheckAt = now;
        JSONObject previousSession = session;
        if ("unknown".equals(previousSession.optString("status"))) {
            session = session("checking", null, null);
            emitSession();
        }
        operations.execute(() -> {
            try {
                JSONObject snapshot = readSessionSnapshot();
                JSONObject result = snapshot;
                Log.i(TAG, "Session check: " + result.optString("status"));
                main.post(() -> { session = result; emitSession(); emitOverview(); });
            } catch (Exception ignored) {
                Log.w(TAG, "Session check failed: " + diagnosticError(ignored));
                main.post(() -> { session = previousSession; emitSession(); emitOverview(); });
            } finally {
                sessionCheckActive.set(false);
            }
        });
    }

    private void checkSessionRequest(String id) {
        if (tiktok.currentUrl().isEmpty()) {
            browserVisible = true;
            tiktok.openIfNeeded();
            showBrowser();
            emit("browserVisible", true);
        }
        session = session("checking", null, null);
        emitSession();
        operations.execute(() -> {
            try {
                JSONObject snapshot = readSessionSnapshot();
                JSONObject result = snapshot;
                Log.i(TAG, "Manual session check: " + result.optString("status"));
                main.post(() -> { session = result; emitSession(); emitOverview(); reply(id, result); });
            } catch (Exception error) {
                String reason = message(error);
                Log.w(TAG, "Manual session check failed: " + diagnosticError(error));
                main.post(() -> { session = session("unknown", null, null); emitSession(); emitOverview(); replyError(id, reason); });
            }
        });
    }

    private void stop() {
        if (!operationActive.get()) return;
        stopRequested.set(true);
        tiktok.cancelPendingReadRequests();
        flow = "Stopping safely…";
        main.post(this::emitOverview);
    }

    private void queueLogout(String id) {
        if (!logoutQueued.compareAndSet(false, true)) { replyError(id, "Sign-out is already running."); return; }
        if (operationActive.get()) {
            stopRequested.set(true);
            flow = "Stopping safely before logout…";
            emitOverview();
        }
        operations.execute(() -> {
            while (operationActive.get()) {
                try { Thread.sleep(100); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); break; }
            }
            runLogout(id);
        });
    }

    private void runQueuedLogout() {
        // Logout is already queued behind the current operation.
    }

    private void runLogout(String requestId) {
        try {
            main.post(() -> { session = session("checking", null, null); emitSession(); });
            store.clearResultsSecurely();
            main.post(() -> { activity = idleActivity(); flow = "Ready"; found = 0; browserVisible = false; hideBrowser(); emitOverview(); });
            tiktok.logoutPage();
            Thread.sleep(800);
            tiktok.clearSession();
            Thread.sleep(2200);
            JSONObject identity = tiktok.pageIdentity();
            JSONObject result = identity != null && identity.optBoolean("loggedOutSignal")
                    ? session("logged-out", null, null)
                    : session("unknown", null, null);
            main.post(() -> { session = result; emitSession(); emitOverview(); reply(requestId, result); logoutQueued.set(false); stopRequested.set(false); });
        } catch (Exception error) {
            String reason = message(error);
            main.post(() -> { session = session("unknown", null, null); emitSession(); emitOverview(); replyError(requestId, reason); logoutQueued.set(false); stopRequested.set(false); });
        }
    }

    private void finishOperation(String finalFlow, String phase) {
        flow = finalFlow;
        finishedAt = System.currentTimeMillis();
        activity = progress(activity.optString("kind", "idle"), phase);
        emitOverview();
    }

    private void browserControl(String action) {
        if ("back".equals(action)) tiktok.back();
        else if ("home".equals(action)) tiktok.openHome();
        else if ("reload".equals(action)) tiktok.reload();
    }

    private void openTikTok(String url) {
        browserVisible = true;
        tiktokView.loadUrl(url);
        showBrowser();
        emit("browserVisible", true);
        emitOverview();
    }

    private void showBrowser() {
        tiktok.openIfNeeded();
        browserFrame.setVisibility(View.VISIBLE);
        tiktokView.setVisibility(View.GONE);
        layoutBrowserView();
        main.postDelayed(this::layoutBrowserView, 200);
    }

    private void layoutBrowserView() {
        if (!browserVisible || dashboard == null || destroyed) return;
        dashboard.post(() -> dashboard.evaluateJavascript(
                "(()=>{const toolbar=document.getElementById('browser-toolbar');const topbar=document.querySelector('.topbar');const nav=document.getElementById('mobile-navigation');const toolbarVisible=toolbar&&!toolbar.classList.contains('hidden')&&getComputedStyle(toolbar).display!=='none';const visible=nav&&getComputedStyle(nav).display!=='none';const top=toolbarVisible?toolbar.getBoundingClientRect().bottom:(topbar?topbar.getBoundingClientRect().bottom+8:112);return [Math.round(top),visible?Math.round(nav.getBoundingClientRect().height):0]})()",
                value -> {
                    float density = getResources().getDisplayMetrics().density;
                    int top = 112;
                    int bottom = 0;
                    try {
                        JSONArray measurements = new JSONArray(value);
                        top = Math.round((float) measurements.getDouble(0) * density);
                        bottom = Math.round((float) measurements.getDouble(1) * density);
                    } catch (Exception ignored) { }
                    int inset = dp(10);
                    FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(-1, -1);
                    params.leftMargin = inset;
                    params.rightMargin = inset;
                    params.topMargin = top + inset;
                    params.bottomMargin = bottom + inset;
                    browserFrame.setLayoutParams(params);
                    browserFrame.bringToFront();
                    tiktokView.setVisibility(View.VISIBLE);
                }));
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void hideBrowser() {
        if (tiktokView != null) {
            // Keep the signed-in WebView attached, but hide its rounded viewport so it cannot
            // cover other dashboard pages through Android's WebView surface composition.
            tiktokView.setVisibility(View.VISIBLE);
            if (browserFrame != null) browserFrame.setVisibility(View.GONE);
            if (dashboard != null) dashboard.bringToFront();
        }
    }

    private void openSocial(String platform) {
        String url;
        switch (platform) {
            case "instagram": url = "https://instagram.com/z.3morr"; break;
            case "facebook": url = "https://www.facebook.com/share/186DF9U1PM/?mibextid=wwXIfr"; break;
            case "whatsapp": url = "https://wa.me/+201026866840"; break;
            case "linkedin": url = "https://www.linkedin.com/in/omar-ebrahim-6a94903a2?utm_source=share_via%26utm_content=profile%26utm_medium=member_ios"; break;
            case "youtube": url = "https://www.youtube.com/@3vmorr"; break;
            case "telegram": url = "https://t.me/omarebrahim1"; break;
            default: throw new IllegalArgumentException("Unknown social link.");
        }
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
    }

    private void emitOverview() { try { emit("overview", overview()); } catch (Exception ignored) { } }
    private void emitSession() { emit("session", session); }

    private void emit(String event, Object value) {
        if (dashboard == null || destroyed) return;
        String data = value instanceof String ? JSONObject.quote((String) value) : String.valueOf(value);
        String script = "window.__androidNativeEvent&&window.__androidNativeEvent(" + JSONObject.quote(event) + "," + JSONObject.quote(data) + ")";
        dashboard.post(() -> dashboard.evaluateJavascript(script, null));
        if ("browserVisible".equals(event) && Boolean.TRUE.equals(value)) main.postDelayed(this::layoutBrowserView, 220);
    }

    private void reply(String id, Object value) {
        JSONObject response = new JSONObject();
        try { response.put("ok", true); response.put("value", value == null ? JSONObject.NULL : value); } catch (JSONException ignored) { }
        deliverReply(id, response);
    }

    private void replyError(String id, String message) {
        JSONObject response = new JSONObject();
        try { response.put("ok", false); response.put("error", message); } catch (JSONException ignored) { }
        deliverReply(id, response);
    }

    private void deliverReply(String id, JSONObject response) {
        String script = "window.__androidBridgeResolve&&window.__androidBridgeResolve(" + JSONObject.quote(id) + "," + JSONObject.quote(response.toString()) + ")";
        if (dashboard != null && !destroyed) dashboard.post(() -> dashboard.evaluateJavascript(script, null));
    }

    private boolean pause(long millis) {
        try { Thread.sleep(millis); return !stopRequested.get(); }
        catch (InterruptedException ignored) { Thread.currentThread().interrupt(); return false; }
    }

    private static int randomBetween(int minimum, int maximum) {
        return java.util.concurrent.ThreadLocalRandom.current().nextInt(minimum, maximum + 1);
    }

    private static JSONObject object(Object value) throws JSONException {
        if (value instanceof JSONObject) return (JSONObject) value;
        if (value instanceof String) return new JSONObject((String) value);
        throw new JSONException("TikTok returned an invalid response.");
    }

    private static String message(Throwable error) {
        String detail = error.getMessage();
        return detail == null || detail.trim().isEmpty() ? "The operation could not be completed." : detail;
    }

    private static String diagnosticError(Throwable error) {
        String detail = message(error).toLowerCase(Locale.ROOT);
        if (detail.contains("429")) return "rate-limited (HTTP 429)";
        if (detail.contains("403")) return "forbidden (HTTP 403)";
        if (detail.contains("401")) return "unauthorized (HTTP 401)";
        if (detail.contains("timed out") || detail.contains("timeout")) return "request timed out";
        if (detail.contains("not signed") || detail.contains("login")) return "TikTok session is not available";
        if (detail.contains("network") || detail.contains("failed to connect")) return "network error";
        if (detail.contains("unexpected repost-list response")) return "unexpected repost response format";
        return error.getClass().getSimpleName();
    }

    private static boolean isMissingIdentityValue(String value) {
        return value == null || value.trim().isEmpty() || "null".equalsIgnoreCase(value.trim()) || "undefined".equalsIgnoreCase(value.trim());
    }

    private static boolean isSafetyStop(String text) {
        return java.util.regex.Pattern.compile("captcha|verify|too many|too frequent|rate.?limit|risk|restricted|unusual|slow down|401|403|429|account changed", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(text).find();
    }

    private static boolean isTikTokHost(String host) {
        return host != null && (host.equalsIgnoreCase("tiktok.com") || host.toLowerCase(Locale.ROOT).endsWith(".tiktok.com"));
    }

    @Override
    public void onBackPressed() {
        if (browserVisible) {
            browserVisible = false;
            hideBrowser();
            emit("browserVisible", false);
            emitOverview();
        } else if (dashboard != null && dashboard.canGoBack()) dashboard.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        main.removeCallbacks(sessionProbe);
        operations.shutdownNow();
        if (tiktok != null) tiktok.dispose();
        if (dashboard != null) {
            dashboard.removeJavascriptInterface("RepostRemoverAndroid");
            dashboard.stopLoading();
            dashboard.setWebViewClient(new WebViewClient());
            dashboard.destroy();
        }
        if (store != null) store.close();
        super.onDestroy();
    }
}
