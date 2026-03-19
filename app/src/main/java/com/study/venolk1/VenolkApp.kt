package com.study.venolk1

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

/**
 * VenolkApp — Application class
 *
 * Creates notification channels on app start (Android 8+).
 * Declared in AndroidManifest as android:name=".VenolkApp"
 */
class VenolkApp : Application() {

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createChannels()
        }
    }

    private fun createChannels() {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val channels = listOf(
            NotificationChannel("CHANNEL_POMODORO", "Pomodoro Timer",
                NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Pomodoro session complete alerts"
                enableVibration(true)
            },
            NotificationChannel("CHANNEL_ALARM", "Study Alarms",
                NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Your scheduled study alarms"
                enableVibration(true)
            },
            NotificationChannel("CHANNEL_PRAYER", "Prayer Times",
                NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Adhan and prayer time reminders"
                enableVibration(false)
            },
            NotificationChannel("CHANNEL_ROUTINE", "Routine Reminders",
                NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Daily routine and task reminders"
            },
            NotificationChannel("CHANNEL_GENERAL", "General",
                NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "General app notifications"
            },
        )
        channels.forEach { nm.createNotificationChannel(it) }
    }
}
