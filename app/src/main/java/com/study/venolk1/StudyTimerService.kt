package com.study.venolk1

import android.app.*
import android.content.Intent
import android.os.*
import androidx.core.app.NotificationCompat

/**
 * StudyTimerService — Foreground Service
 *
 * Keeps the Pomodoro timer alive when the app is:
 *   • Backgrounded (user switches apps)
 *   • Screen turned off
 *   • System memory pressure
 *
 * Shows a persistent notification in the status bar with the
 * remaining time, so the user can always see the timer.
 *
 * JS calls:
 *   AndroidBridge.startTimerService(remainingMs, phase, label)
 *   AndroidBridge.updateTimerService(remainingMs, phase)
 *   AndroidBridge.stopTimerService()
 *
 * The service counts down internally and fires the alarm
 * when time reaches zero, even if the WebView is paused.
 */
class StudyTimerService : Service() {

    companion object {
        const val ACTION_START  = "com.study.venolk1.TIMER_START"
        const val ACTION_UPDATE = "com.study.venolk1.TIMER_UPDATE"
        const val ACTION_STOP   = "com.study.venolk1.TIMER_STOP"

        const val EXTRA_REMAINING_MS = "remaining_ms"
        const val EXTRA_PHASE        = "phase"
        const val EXTRA_LABEL        = "label"

        const val NOTIF_ID      = 1
        const val CHANNEL_ID    = "CHANNEL_POMODORO"
    }

    private val handler = Handler(Looper.getMainLooper())
    private var remainingMs = 0L
    private var phase = "focus"
    private var label = "Study Session"
    private var running = false

    // Ticks every second
    private val ticker = object : Runnable {
        override fun run() {
            if (!running) return
            remainingMs -= 1000
            if (remainingMs <= 0) {
                remainingMs = 0
                onTimerFinished()
            } else {
                updateNotification()
                handler.postDelayed(this, 1000)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                remainingMs = intent.getLongExtra(EXTRA_REMAINING_MS, 25 * 60 * 1000L)
                phase       = intent.getStringExtra(EXTRA_PHASE) ?: "focus"
                label       = intent.getStringExtra(EXTRA_LABEL) ?: "Study Session"
                startForeground(NOTIF_ID, buildNotification())
                startTicking()
            }
            ACTION_UPDATE -> {
                remainingMs = intent.getLongExtra(EXTRA_REMAINING_MS, remainingMs)
                phase       = intent.getStringExtra(EXTRA_PHASE) ?: phase
                updateNotification()
            }
            ACTION_STOP -> {
                stopTicking()
                stopForeground(true)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun startTicking() {
        running = true
        handler.removeCallbacks(ticker)
        handler.postDelayed(ticker, 1000)
    }

    private fun stopTicking() {
        running = false
        handler.removeCallbacks(ticker)
    }

    private fun onTimerFinished() {
        running = false
        // Fire alarm receiver
        val alarmIntent = Intent(this, AlarmReceiver::class.java).apply {
            action = "com.study.venolk1.POMODORO_DONE"
            putExtra("phase", phase)
            putExtra("title", if (phase == "focus") "🍅 Focus Complete!" else "☕ Break Over!")
            putExtra("body", if (phase == "focus") "Great work! Time for a break." else "Break finished. Ready to focus?")
        }
        sendBroadcast(alarmIntent)
        stopForeground(true)
        stopSelf()
    }

    private fun buildNotification(): Notification {
        val tapIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val emoji = if (phase == "focus") "🍅" else "☕"
        val phaseLabel = if (phase == "focus") "Focus" else "Break"
        val time = formatMs(remainingMs)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle("$emoji $label — $phaseLabel")
            .setContentText("$time remaining")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(tapIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification() {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification())
    }

    private fun formatMs(ms: Long): String {
        val totalSec = ms / 1000
        val min = totalSec / 60
        val sec = totalSec % 60
        return "${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}"
    }

    override fun onDestroy() {
        stopTicking()
        super.onDestroy()
    }
}
