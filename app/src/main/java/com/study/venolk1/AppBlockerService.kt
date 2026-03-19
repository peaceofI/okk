package com.study.venolk1

import android.app.*
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.*
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import org.json.JSONArray

/**
 * AppBlockerService — Foreground Service
 *
 * Monitors which app is in the foreground every 1 second.
 * If a blocked app is detected, it brings VENOLK1 to front
 * and shows a lock overlay.
 *
 * Usage:
 *   AndroidBridge.setBlockedApps('["com.instagram.android","com.facebook.katana"]')
 *   AndroidBridge.setBlockerEnabled(true)  // starts service
 *   AndroidBridge.setBlockerEnabled(false) // stops service
 *
 * Requires PACKAGE_USAGE_STATS permission (user must grant in Settings).
 */
class AppBlockerService : Service() {

    companion object {
        const val ACTION_START = "com.study.venolk1.BLOCKER_START"
        const val ACTION_STOP  = "com.study.venolk1.BLOCKER_STOP"
        const val NOTIF_ID     = 10
        const val CHANNEL_ID   = "CHANNEL_GENERAL"
    }

    private val handler = Handler(Looper.getMainLooper())
    private var running  = false
    private var blockedPackages = mutableSetOf<String>()

    private val monitor = object : Runnable {
        override fun run() {
            if (!running) return
            checkForegroundApp()
            handler.postDelayed(this, 1000)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                loadBlockedApps()
                if (!running) {
                    running = true
                    startForeground(NOTIF_ID, buildNotification())
                    handler.post(monitor)
                }
            }
            ACTION_STOP -> {
                running = false
                handler.removeCallbacks(monitor)
                stopForeground(true)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun loadBlockedApps() {
        val prefs = getSharedPreferences("venolk_blocker", Context.MODE_PRIVATE)
        val json  = prefs.getString("blocked_apps", "[]") ?: "[]"
        blockedPackages.clear()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                blockedPackages.add(arr.getString(i))
            }
        } catch (e: Exception) { e.printStackTrace() }
    }

    private fun checkForegroundApp() {
        if (blockedPackages.isEmpty()) return
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 5000, now)
        val foreground = stats?.maxByOrNull { it.lastTimeUsed }?.packageName ?: return

        if (foreground in blockedPackages) {
            // Bring VENOLK1 to front
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("blocked_app", foreground)
            }
            launchIntent?.let { startActivity(it) }
        }
    }

    private fun buildNotification(): Notification {
        val tapIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle("🔒 App Blocker Active")
            .setContentText("Keeping you focused on studying")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(tapIntent)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    override fun onDestroy() {
        running = false
        handler.removeCallbacks(monitor)
        super.onDestroy()
    }
}
