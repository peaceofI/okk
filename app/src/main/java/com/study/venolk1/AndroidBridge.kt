package com.study.venolk1

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * AndroidBridge — JavascriptInterface for VENOLK1
 *
 * All methods annotated @JavascriptInterface are callable from JS as:
 *   AndroidBridge.methodName(args)
 *
 * Channels:
 *   CHANNEL_POMODORO  — Pomodoro timer completion
 *   CHANNEL_ALARM     — User-set alarms
 *   CHANNEL_PRAYER    — Adhan / prayer time notifications
 *   CHANNEL_ROUTINE   — Routine / task reminders
 *   CHANNEL_GENERAL   — General app notifications
 */
class AndroidBridge(
    private val activity: MainActivity,
    private val webView: WebView
) {

    private val ctx: Context get() = activity.applicationContext
    private var alarmPlayer: MediaPlayer? = null
    private var whiteNoisePlayer: MediaPlayer? = null
    private var notifId = 1000

    init {
        createNotificationChannels()
    }

    // ═══════════════════════════════════════════════════════
    // NOTIFICATION CHANNELS
    // ═══════════════════════════════════════════════════════
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channels = listOf(
            Triple("CHANNEL_POMODORO", "Pomodoro Timer", NotificationManager.IMPORTANCE_HIGH),
            Triple("CHANNEL_ALARM", "Study Alarms", NotificationManager.IMPORTANCE_HIGH),
            Triple("CHANNEL_PRAYER", "Prayer Times (Adhan)", NotificationManager.IMPORTANCE_HIGH),
            Triple("CHANNEL_ROUTINE", "Routine Reminders", NotificationManager.IMPORTANCE_DEFAULT),
            Triple("CHANNEL_GENERAL", "General", NotificationManager.IMPORTANCE_DEFAULT),
        )
        channels.forEach { (id, name, importance) ->
            val ch = NotificationChannel(id, name, importance).apply {
                enableVibration(true)
                enableLights(true)
            }
            nm.createNotificationChannel(ch)
        }
    }

    // ═══════════════════════════════════════════════════════
    // NOTIFICATIONS (called from JS: AndroidBridge.showNotification)
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun showNotification(title: String, body: String) {
        showNotifOnChannel(title, body, "CHANNEL_GENERAL")
    }

    @JavascriptInterface
    fun showPomodoroNotification(title: String, body: String) {
        showNotifOnChannel(title, body, "CHANNEL_POMODORO")
    }

    @JavascriptInterface
    fun showPrayerNotification(title: String, body: String) {
        showNotifOnChannel(title, body, "CHANNEL_PRAYER")
    }

    @JavascriptInterface
    fun showRoutineNotification(title: String, body: String) {
        showNotifOnChannel(title, body, "CHANNEL_ROUTINE")
    }

    @JavascriptInterface
    fun showAlarmNotification(title: String, body: String) {
        showNotifOnChannel(title, body, "CHANNEL_ALARM")
    }

    private fun showNotifOnChannel(title: String, body: String, channelId: String) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val tapIntent = Intent(ctx, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pi = PendingIntent.getActivity(
            ctx, notifId, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notif = NotificationCompat.Builder(ctx, channelId)
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        nm.notify(notifId++, notif)
    }

    // ═══════════════════════════════════════════════════════
    // PERMISSIONS
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun requestNotificationPermission() {
        activity.runOnUiThread { activity.requestNotificationPermission() }
    }

    @JavascriptInterface
    fun requestExactAlarmPermission() {
        activity.runOnUiThread { activity.requestExactAlarmPermission() }
    }

    @JavascriptInterface
    fun hasNotificationPermission(): Boolean {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return nm.areNotificationsEnabled()
    }

    // ═══════════════════════════════════════════════════════
    // ALARM SCHEDULING (exact, survives background / screen-off)
    // ═══════════════════════════════════════════════════════

    /**
     * Schedule an alarm.
     * @param alarmId   unique string id
     * @param triggerMs epoch milliseconds when alarm should fire
     * @param title     notification title
     * @param body      notification body
     * @param type      "alarm" | "pomodoro" | "prayer" | "routine"
     * @param soundUri  "" for default, or content URI string for custom sound
     */
    @JavascriptInterface
    fun scheduleAlarm(
        alarmId: String,
        triggerMs: Long,
        title: String,
        body: String,
        type: String,
        soundUri: String
    ) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(ctx, AlarmReceiver::class.java).apply {
            action = "com.study.venolk1.${type.uppercase()}_FIRE"
            putExtra("alarm_id", alarmId)
            putExtra("title", title)
            putExtra("body", body)
            putExtra("type", type)
            putExtra("sound_uri", soundUri)
        }
        val requestCode = alarmId.hashCode()
        val pi = PendingIntent.getBroadcast(
            ctx, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi)
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, triggerMs, pi)
        }
    }

    @JavascriptInterface
    fun cancelAlarm(alarmId: String) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(ctx, AlarmReceiver::class.java)
        val pi = PendingIntent.getBroadcast(
            ctx, alarmId.hashCode(), intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        pi?.let { am.cancel(it) }
    }

    // ═══════════════════════════════════════════════════════
    // ALARM SOUND PLAYBACK
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun playAlarm() {
        activity.runOnUiThread {
            stopAlarm()
            alarmPlayer = MediaPlayer().apply {
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(ctx, uri)
                isLooping = true
                prepare()
                start()
            }
        }
    }

    @JavascriptInterface
    fun playAlarmWithUri(uriString: String) {
        activity.runOnUiThread {
            stopAlarm()
            try {
                alarmPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
                    )
                    setDataSource(ctx, Uri.parse(uriString))
                    isLooping = true
                    prepare()
                    start()
                }
            } catch (e: Exception) {
                playAlarm() // fallback
            }
        }
    }

    @JavascriptInterface
    fun stopAlarm() {
        activity.runOnUiThread {
            alarmPlayer?.apply { if (isPlaying) stop(); release() }
            alarmPlayer = null
        }
    }

    // ═══════════════════════════════════════════════════════
    // WHITE NOISE / POMODORO AMBIENT SOUND
    // ═══════════════════════════════════════════════════════

    /**
     * Play a white noise asset by name (matches filename in assets/sounds/).
     * Available: rain.mp3, ocean.mp3, forest.mp3, whitenoise.mp3, cafe.mp3,
     *            fire.mp3, thunder.mp3, library.mp3
     */
    @JavascriptInterface
    fun playWhiteNoise(soundName: String) {
        activity.runOnUiThread {
            stopWhiteNoise()
            try {
                val afd = ctx.assets.openFd("sounds/$soundName")
                whiteNoisePlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
                    )
                    setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    isLooping = true
                    prepare()
                    start()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun setWhiteNoiseVolume(volume: Float) {
        activity.runOnUiThread {
            whiteNoisePlayer?.setVolume(volume, volume)
        }
    }

    @JavascriptInterface
    fun stopWhiteNoise() {
        activity.runOnUiThread {
            whiteNoisePlayer?.apply { if (isPlaying) stop(); release() }
            whiteNoisePlayer = null
        }
    }

    // ═══════════════════════════════════════════════════════
    // FOREGROUND TIMER SERVICE (keeps Pomodoro alive in background)
    // ═══════════════════════════════════════════════════════

    /**
     * Start the foreground service that keeps the timer alive.
     * JS calls this when a Pomodoro session starts.
     * @param remainingMs milliseconds remaining
     * @param phase "focus" | "break"
     */
    @JavascriptInterface
    fun startTimerService(remainingMs: Long, phase: String, label: String) {
        val intent = Intent(ctx, StudyTimerService::class.java).apply {
            action = StudyTimerService.ACTION_START
            putExtra(StudyTimerService.EXTRA_REMAINING_MS, remainingMs)
            putExtra(StudyTimerService.EXTRA_PHASE, phase)
            putExtra(StudyTimerService.EXTRA_LABEL, label)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent)
        } else {
            ctx.startService(intent)
        }
    }

    @JavascriptInterface
    fun updateTimerService(remainingMs: Long, phase: String) {
        val intent = Intent(ctx, StudyTimerService::class.java).apply {
            action = StudyTimerService.ACTION_UPDATE
            putExtra(StudyTimerService.EXTRA_REMAINING_MS, remainingMs)
            putExtra(StudyTimerService.EXTRA_PHASE, phase)
        }
        ctx.startService(intent)
    }

    @JavascriptInterface
    fun stopTimerService() {
        ctx.startService(Intent(ctx, StudyTimerService::class.java).apply {
            action = StudyTimerService.ACTION_STOP
        })
    }

    // ═══════════════════════════════════════════════════════
    // VIBRATION
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun vibrate(ms: Long) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            val v = ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(ms)
            }
        }
    }

    @JavascriptInterface
    fun vibratePattern(patternJson: String) {
        try {
            val arr = JSONArray(patternJson)
            val pattern = LongArray(arr.length()) { arr.getLong(it) }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                val v = ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createWaveform(pattern, -1))
                } else {
                    @Suppress("DEPRECATION")
                    v.vibrate(pattern, -1)
                }
            }
        } catch (e: Exception) {
            vibrate(500)
        }
    }

    // ═══════════════════════════════════════════════════════
    // FILE PICKER (returns URI string back to JS callback)
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun openFilePicker(mimeType: String, callbackFn: String) {
        // File picking is handled by WebChromeClient.onShowFileChooser
        // This method is a no-op; left for backward compat.
    }

    // ═══════════════════════════════════════════════════════
    // APP BLOCKER
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun setBlockedApps(appsJson: String) {
        val prefs = ctx.getSharedPreferences("venolk_blocker", Context.MODE_PRIVATE)
        prefs.edit().putString("blocked_apps", appsJson).apply()
    }

    @JavascriptInterface
    fun setBlockerEnabled(enabled: Boolean) {
        val prefs = ctx.getSharedPreferences("venolk_blocker", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("enabled", enabled).apply()
        if (enabled) {
            val i = Intent(ctx, AppBlockerService::class.java).apply {
                action = AppBlockerService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                ctx.startForegroundService(i)
            else ctx.startService(i)
        } else {
            ctx.startService(Intent(ctx, AppBlockerService::class.java).apply {
                action = AppBlockerService.ACTION_STOP
            })
        }
    }

    @JavascriptInterface
    fun hasUsageStatsPermission(): Boolean {
        return try {
            val am = ctx.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                am.unsafeCheckOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), ctx.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                am.checkOpNoThrow(
                    android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), ctx.packageName
                )
            }
            mode == android.app.AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) { false }
    }

    @JavascriptInterface
    fun openUsageStatsSettings() {
        activity.runOnUiThread {
            activity.startActivity(
                Intent(android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            )
        }
    }

    // ═══════════════════════════════════════════════════════
    // WIDGET REFRESH
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun updateWidget(statsJson: String) {
        val intent = Intent(ctx, StudyWidget::class.java).apply {
            action = StudyWidget.ACTION_UPDATE_FROM_BRIDGE
            putExtra(StudyWidget.EXTRA_STATS_JSON, statsJson)
        }
        ctx.sendBroadcast(intent)
    }

    // ═══════════════════════════════════════════════════════
    // PREFERENCES (for AI key etc.)
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun setPreference(key: String, value: String) {
        ctx.getSharedPreferences("venolk_prefs", Context.MODE_PRIVATE)
            .edit().putString(key, value).apply()
    }

    @JavascriptInterface
    fun getPreference(key: String, default: String): String {
        return ctx.getSharedPreferences("venolk_prefs", Context.MODE_PRIVATE)
            .getString(key, default) ?: default
    }

    // ═══════════════════════════════════════════════════════
    // LOCATION (for prayer times)
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun requestLocation() {
        activity.runOnUiThread {
            // Will be handled by JS navigator.geolocation which WebView supports.
            // This stub is here in case you want native fallback.
        }
    }

    // ═══════════════════════════════════════════════════════
    // VERSION / DEVICE INFO
    // ═══════════════════════════════════════════════════════

    @JavascriptInterface
    fun getDeviceInfo(): String {
        return JSONObject().apply {
            put("sdk", Build.VERSION.SDK_INT)
            put("model", Build.MODEL)
            put("manufacturer", Build.MANUFACTURER)
        }.toString()
    }
}
