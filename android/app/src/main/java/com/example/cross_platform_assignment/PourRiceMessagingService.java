package com.example.cross_platform_assignment;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import io.capawesome.capacitorjs.plugins.firebase.messaging.FirebaseMessagingPlugin;
import java.util.List;
import java.util.Map;
import java.util.Objects;

// Renders Android-native chat and booking pushes as local notifications from data-only FCM payloads.
// This avoids the collapsible behaviour of generic notification messages and keeps tap handling wired into Capacitor.
public class PourRiceMessagingService extends FirebaseMessagingService {

    private static final String defaultNotificationChannelId = "pourrice_default_notifications";
    private static final String defaultNotificationChannelName = "PourRice Alerts";
    private static final String defaultNotificationChannelDescription = "Chat messages, bookings, and app activity";
    private static final String defaultNotificationTagKey = "notificationTag";

    // Forward refreshed tokens back into the Capacitor Firebase Messaging plugin.
    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        FirebaseMessagingPlugin.onNewToken(token);
    }

    // Forward incoming FCM messages to the plugin and render Android-native data-only notifications when needed.
    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        FirebaseMessagingPlugin.onMessageReceived(remoteMessage);

        if (remoteMessage.getNotification() != null) {
            return;
        }

        if (isApplicationInForeground()) {
            return;
        }

        Map<String, String> data = remoteMessage.getData();
        String title = getNotificationTitle(remoteMessage, data);
        String body = getNotificationBody(remoteMessage, data);

        if (title.isEmpty() && body.isEmpty()) {
            return;
        }

        ensureNotificationChannel();
        showNotification(remoteMessage, data, title, body);
    }

    // Build and display a local Android notification for a data-only chat or booking push.
    private void showNotification(@NonNull RemoteMessage remoteMessage, @NonNull Map<String, String> data, @NonNull String title, @NonNull String body) {
        String messageId = remoteMessage.getMessageId() != null ? remoteMessage.getMessageId() : String.valueOf(System.currentTimeMillis());
        String notificationTag = resolveNotificationTag(data, messageId);
        int notificationId = Math.abs(notificationTag.hashCode());
        Intent launchIntent = createLaunchIntent(data, messageId);
        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(this, notificationId, launchIntent, pendingIntentFlags);
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, defaultNotificationChannelId)
            .setSmallIcon(R.drawable.ic_stat_pourrice_notification)
            .setColor(Color.parseColor("#A4E092"))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_ALL);

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            return;
        }

        notificationManager.notify(notificationTag, notificationId, notificationBuilder.build());
    }

    // Create the launch intent used when the user taps the rendered notification.
    private Intent createLaunchIntent(@NonNull Map<String, String> data, @NonNull String messageId) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("google.message_id", messageId);

        for (Map.Entry<String, String> entry : data.entrySet()) {
            intent.putExtra(entry.getKey(), entry.getValue());
        }

        return intent;
    }

    // Keep the Android notification channel available even if the app process is cold-started by FCM.
    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            return;
        }

        NotificationChannel existingChannel = notificationManager.getNotificationChannel(defaultNotificationChannelId);
        if (existingChannel != null) {
            return;
        }

        NotificationChannel notificationChannel = new NotificationChannel(
            defaultNotificationChannelId,
            defaultNotificationChannelName,
            NotificationManager.IMPORTANCE_HIGH
        );
        notificationChannel.setDescription(defaultNotificationChannelDescription);
        notificationManager.createNotificationChannel(notificationChannel);
    }

    // Resolve the title from the data payload first because Android-native chat pushes are now data-only.
    @NonNull
    private String getNotificationTitle(@NonNull RemoteMessage remoteMessage, @NonNull Map<String, String> data) {
        String title = data.get("title");
        if (title != null && !title.trim().isEmpty()) {
            return title.trim();
        }

        if (remoteMessage.getNotification() != null && remoteMessage.getNotification().getTitle() != null) {
            return Objects.requireNonNull(remoteMessage.getNotification().getTitle()).trim();
        }

        return "";
    }

    // Resolve the body from the data payload first because Android-native chat pushes are now data-only.
    @NonNull
    private String getNotificationBody(@NonNull RemoteMessage remoteMessage, @NonNull Map<String, String> data) {
        String body = data.get("body");
        if (body != null && !body.trim().isEmpty()) {
            return body.trim();
        }

        if (remoteMessage.getNotification() != null && remoteMessage.getNotification().getBody() != null) {
            return Objects.requireNonNull(remoteMessage.getNotification().getBody()).trim();
        }

        return "";
    }

    // Resolve a stable unique tag so each chat message or booking update can occupy its own slot in the drawer.
    @NonNull
    private String resolveNotificationTag(@NonNull Map<String, String> data, @NonNull String fallbackId) {
        String notificationTag = data.get(defaultNotificationTagKey);
        if (notificationTag != null && !notificationTag.trim().isEmpty()) {
            return notificationTag.trim();
        }

        return fallbackId;
    }

    // Detect whether the app is currently in the foreground so we avoid duplicating the in-app toast.
    private boolean isApplicationInForeground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager == null) {
            return false;
        }

        List<ActivityManager.RunningAppProcessInfo> runningAppProcesses = activityManager.getRunningAppProcesses();
        if (runningAppProcesses == null) {
            return false;
        }

        String packageName = getPackageName();

        for (ActivityManager.RunningAppProcessInfo processInfo : runningAppProcesses) {
            if (processInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND && packageName.equals(processInfo.processName)) {
                return true;
            }
        }
        return false;
    }
}