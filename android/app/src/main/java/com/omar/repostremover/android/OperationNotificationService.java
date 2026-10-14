package com.omar.repostremover.android;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.widget.RemoteViews;

import org.json.JSONObject;
import java.util.concurrent.atomic.AtomicBoolean;

public final class OperationNotificationService extends Service {
    private static final String CHANNEL_ID = "repost_operation";
    private static final int NOTIFICATION_ID = 4201;
    private static final String ACTION_START = "com.omar.repostremover.android.action.START_OPERATION";
    private static final String ACTION_STOP = "com.omar.repostremover.android.action.STOP_OPERATION";
    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_TEXT = "text";
    private static final String EXTRA_STARTED_AT = "started_at";

    private static final AtomicBoolean STOP_REQUESTED = new AtomicBoolean(false);
    private static volatile OperationNotificationService instance;
    private static volatile UpdateState latestUpdate;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable pendingUpdate = this::postCurrentNotification;
    private NotificationManager notifications;
    private PowerManager.WakeLock wakeLock;
    private String title = "Scanning reposts";
    private String text = "Preparing…";
    private String statOneValue = "0";
    private String statOneLabel = "Found";
    private String statTwoValue = "0";
    private String statTwoLabel = "Pages";
    private int progress;
    private int max;
    private boolean indeterminate = true;
    private boolean arabic;
    private boolean foreground;
    private boolean stopping;
    private long lastPostedAt;
    private long startedAt;

    static void start(Context context, String title, String text, boolean arabic, long startedAt) {
        STOP_REQUESTED.set(false);
        latestUpdate = null;
        Intent intent = new Intent(context, OperationNotificationService.class)
                .setAction(ACTION_START)
                .putExtra(EXTRA_TITLE, title)
                .putExtra(EXTRA_TEXT, text)
                .putExtra("arabic", arabic)
                .putExtra(EXTRA_STARTED_AT, startedAt);
        context.startForegroundService(intent);
    }

    static AtomicBoolean stopSignal() { return STOP_REQUESTED; }

    static void update(String title, String text, String statOneValue, String statOneLabel,
                       String statTwoValue, String statTwoLabel, int progress, int max,
                       boolean indeterminate, boolean arabic, long startedAt) {
        UpdateState state = new UpdateState(title, text, statOneValue, statOneLabel,
                statTwoValue, statTwoLabel, progress, max, indeterminate, arabic, startedAt);
        latestUpdate = state;
        OperationNotificationService service = instance;
        if (service == null) return;
        service.main.post(() -> {
            if (service.stopping) return;
            service.apply(state);
            long remaining = 900L - (System.currentTimeMillis() - service.lastPostedAt);
            service.main.removeCallbacks(service.pendingUpdate);
            if (remaining <= 0) service.postCurrentNotification();
            else service.main.postDelayed(service.pendingUpdate, remaining);
        });
    }

    static void finish(Context context, String title, String text) {
        OperationNotificationService service = instance;
        if (service == null) {
            context.stopService(new Intent(context, OperationNotificationService.class));
            return;
        }
        service.main.post(() -> service.finishOperation(title, text));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        notifications = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createChannel();
        PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, getPackageName() + ":repost-operation");
        wakeLock.setReferenceCounted(false);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopping = true;
            STOP_REQUESTED.set(true);
            title = arabic ? "جاري إيقاف العملية" : "Stopping safely";
            text = arabic ? "سيتم الإيقاف بعد انتهاء الطلب الحالي." : "Stopping after the current request…";
            postCurrentNotification();
            return START_NOT_STICKY;
        }
        if (ACTION_START.equals(action)) {
            title = valueOr(intent.getStringExtra(EXTRA_TITLE), "Scanning reposts");
            text = valueOr(intent.getStringExtra(EXTRA_TEXT), "Preparing…");
            progress = 0;
            max = 0;
            indeterminate = true;
            arabic = intent.getBooleanExtra("arabic", false);
            startedAt = intent.getLongExtra(EXTRA_STARTED_AT, System.currentTimeMillis());
            stopping = false;
            UpdateState state = latestUpdate;
            if (state != null) apply(state);
        }
        if (!foreground) promoteToForeground();
        postCurrentNotification();
        return START_NOT_STICKY;
    }

    private void promoteToForeground() {
        Notification notification = buildNotification(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        foreground = true;
        try {
            if (wakeLock != null && !wakeLock.isHeld()) wakeLock.acquire(6L * 60L * 60L * 1000L);
        } catch (RuntimeException ignored) { }
    }

    private void postCurrentNotification() {
        if (!foreground) return;
        notifications.notify(NOTIFICATION_ID, buildNotification(true));
        lastPostedAt = System.currentTimeMillis();
    }

    private void finishOperation(String finalTitle, String finalText) {
        main.removeCallbacks(pendingUpdate);
        UpdateState state = latestUpdate;
        if (state != null) apply(state);
        title = valueOr(finalTitle, "Operation finished");
        text = valueOr(finalText, "You can return to Repost Remover.");
        if (max <= 0) {
            max = 100;
            progress = 100;
        } else {
            progress = max;
        }
        indeterminate = false;
        if (notifications != null) notifications.notify(NOTIFICATION_ID, buildNotification(false));
        stopForeground(STOP_FOREGROUND_DETACH);
        foreground = false;
        releaseWakeLock();
        stopSelf();
    }

    private Notification buildNotification(boolean ongoing) {
        Intent open = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(content)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setOnlyAlertOnce(true)
                .setOngoing(ongoing)
                .setShowWhen(false)
                .setWhen(System.currentTimeMillis())
                .setPriority(Notification.PRIORITY_LOW);

        RemoteViews compact = createOperationView(R.layout.notification_operation_compact, ongoing);
        RemoteViews expanded = createOperationView(R.layout.notification_operation_expanded, ongoing);
        builder.setCustomContentView(compact).setCustomBigContentView(expanded);

        if (ongoing) {
            Intent stop = new Intent(this, OperationNotificationService.class).setAction(ACTION_STOP);
            PendingIntent stopAction = PendingIntent.getService(this, 2, stop,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            builder.addAction(android.R.drawable.ic_media_pause, arabic ? "إيقاف بأمان" : "Stop safely", stopAction);
            builder.setProgress(Math.max(0, max), Math.min(progress, Math.max(0, max)), indeterminate);
        } else {
            builder.setAutoCancel(true);
        }
        return builder.build();
    }

    private RemoteViews createOperationView(int layout, boolean ongoing) {
        RemoteViews view = new RemoteViews(getPackageName(), layout);
        view.setTextViewText(R.id.operation_title, title);
        view.setTextViewText(R.id.operation_status, text);
        view.setTextViewText(R.id.operation_stat_one_value, statOneValue);
        view.setTextViewText(R.id.operation_stat_one_label, statOneLabel);
        view.setTextViewText(R.id.operation_stat_two_value, statTwoValue);
        view.setTextViewText(R.id.operation_stat_two_label, statTwoLabel);
        view.setProgressBar(R.id.operation_progress, Math.max(0, max), Math.min(progress, Math.max(0, max)), indeterminate);

        long elapsed = Math.max(0L, System.currentTimeMillis() - startedAt);
        long chronometerBase = SystemClock.elapsedRealtime() - elapsed;
        if (ongoing) view.setChronometer(R.id.operation_time, chronometerBase, "%s", true);
        else {
            view.setChronometer(R.id.operation_time, chronometerBase, "%s", false);
            view.setTextViewText(R.id.operation_time, formatDuration(elapsed));
        }
        return view;
    }

    private void apply(UpdateState state) {
        title = state.title;
        text = state.text;
        statOneValue = valueOr(state.statOneValue, "0");
        statOneLabel = valueOr(state.statOneLabel, state.arabic ? "تم العثور" : "Found");
        statTwoValue = valueOr(state.statTwoValue, "0");
        statTwoLabel = valueOr(state.statTwoLabel, state.arabic ? "الصفحات" : "Pages");
        if (state.startedAt > 0) startedAt = state.startedAt;
        progress = Math.max(0, state.progress);
        max = Math.max(0, state.max);
        indeterminate = state.indeterminate;
        arabic = state.arabic;
    }

    private static final class UpdateState {
        final String title;
        final String text;
        final String statOneValue;
        final String statOneLabel;
        final String statTwoValue;
        final String statTwoLabel;
        final int progress;
        final int max;
        final boolean indeterminate;
        final boolean arabic;
        final long startedAt;

        UpdateState(String title, String text, String statOneValue, String statOneLabel,
                    String statTwoValue, String statTwoLabel, int progress, int max,
                    boolean indeterminate, boolean arabic, long startedAt) {
            this.title = title;
            this.text = text;
            this.statOneValue = statOneValue;
            this.statOneLabel = statOneLabel;
            this.statTwoValue = statTwoValue;
            this.statTwoLabel = statTwoLabel;
            this.progress = progress;
            this.max = max;
            this.indeterminate = indeterminate;
            this.arabic = arabic;
            this.startedAt = startedAt;
        }
    }

    private static String formatDuration(long milliseconds) {
        long seconds = Math.max(0L, milliseconds / 1000L);
        return (seconds / 60L) + ":" + String.format(java.util.Locale.ROOT, "%02d", seconds % 60L);
    }

    private void createChannel() {
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                getString(R.string.operation_notification_channel), NotificationManager.IMPORTANCE_LOW);
        channel.setDescription(getString(R.string.operation_notification_channel_description));
        channel.setSound(null, null);
        channel.enableVibration(false);
        notifications.createNotificationChannel(channel);
    }

    private void releaseWakeLock() {
        try { if (wakeLock != null && wakeLock.isHeld()) wakeLock.release(); }
        catch (RuntimeException ignored) { }
    }

    @Override
    public void onTimeout(int startId, int foregroundServiceType) {
        STOP_REQUESTED.set(true);
        finishOperation(arabic ? "تم إيقاف العملية" : "Operation stopped",
                arabic ? "وصلت العملية إلى الحد الزمني الذي يفرضه Android." : "Android's background execution time limit was reached.");
    }

    private static String valueOr(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }

    @Override
    public void onDestroy() {
        main.removeCallbacksAndMessages(null);
        releaseWakeLock();
        if (instance == this) instance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}

