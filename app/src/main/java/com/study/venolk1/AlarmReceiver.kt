package com.study.venolk1

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
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
import androidx.core.app.NotificationCompat

/**
 * AlarmReceiver — BroadcastReceiver
 *
 * Handles all scheduled alarms fired by AlarmManager.
 * Works even when the app is completely closed.
 *
 * Supported actions:
 *   ALARM_FIRE        — user-set study alarm
 *   POMODORO_DONE     — Pomodoro session completed (from StudyTimerService)
 *   PRAYER_ADHAN      — prayer time notification with Adhan sound
 *   ROUTINE_REMINDER  — routine task reminder
 *   TASK_REMINDER     — weekly task reminder
 */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val title  = intent.getStringExtra("title") ?: "VENOLK1"
        val body   = intent.getStringExtra("body")  ?: ""
        val type   = intent.getStringExtra("type")  ?: "general"
        val soundUri = intent.getStringExtra("sound_uri") ?: ""

        when (action) {
            "com.study.venolk1.ALARM_FIRE" -> {
                showNotification(context, title, body, "CHANNEL_ALARM", 2000)
                playAlarmSound(context, soundUri)
                vibrateDevice(context, longArrayOf(0, 500, 200, 500, 200, 800))
            }
            "com.study.venolk1.POMODORO_DONE" -> {
                showNotification(context, title, body, "CHANNEL_POMODORO", 2001)
                playPomodoroSound(context)
                vibrateDevice(context, longArrayOf(0, 300, 100, 300, 100, 600))
            }
            "com.study.venolk1.PRAYER_ADHAN" -> {
                showNotification(context, title, body, "CHANNEL_PRAYER", 2002)
                playAdhanSound(context, soundUri)
                // No vibration for prayer — spiritual moment
            }
            "com.study.venolk1.ROUTINE_REMINDER",
            "com.study.venolk1.TASK_REMINDER" -> {
                showNotification(context, title, body, "CHANNEL_ROUTINE", 2003)
                vibrateDevice(context, longArrayOf(0, 200, 100, 200))
            }
        }
    }

    private fun showNotification(
        context: Context,
        title: String,
        body: String,
        channelId: String,
        notifId: Int
    ) {
        val tapIntent = PendingIntent.getActivity(
            context, notifId,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notif = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(tapIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_LIGHTS)
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(notifId, notif)
    }

    private fun playAlarmSound(context: Context, soundUri: String) {
        try {
            val uri = if (soundUri.isNotEmpty()) {
                Uri.parse(soundUri)
            } else {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
            val player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(context, uri)
                isLooping = false
                prepare()
                start()
                setOnCompletionListener { release() }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun playPomodoroSound(context: Context) {
        try {
            // Play a bundled pomodoro complete chime from assets
            val afd = context.assets.openFd("sounds/pomodoro_done.mp3")
            MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                prepare()
                start()
                setOnCompletionListener { release() }
            }
        } catch (e: Exception) {
            // fallback to ringtone
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            RingtoneManager.getRingtone(context, uri)?.play()
        }
    }

    private fun playAdhanSound(context: Context, soundUri: String) {
        try {
            val afd = context.assets.openFd("sounds/adhan.mp3")
            MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                isLooping = false
                prepare()
                start()
                setOnCompletionListener { release() }
            }
        } catch (e: Exception) {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            RingtoneManager.getRingtone(context, uri)?.play()
        }
    }

    private fun vibrateDevice(context: Context, pattern: LongArray) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            val v = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(pattern, -1)
            }
        }
    }
}
