package com.study.venolk1

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * BootReceiver — reschedules all alarms after device reboot.
 *
 * Without this, all AlarmManager alarms are cancelled when the phone
 * restarts. This receiver fires on boot and re-registers them.
 *
 * The JS-side alarm data is stored in localStorage (WebView's SQLite).
 * On boot we read SharedPreferences where AndroidBridge has mirrored
 * alarm data for this exact purpose.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED) return

        // Re-start app blocker if it was enabled
        val prefs = context.getSharedPreferences("venolk_blocker", Context.MODE_PRIVATE)
        if (prefs.getBoolean("enabled", false)) {
            val i = Intent(context, AppBlockerService::class.java).apply {
                this.action = AppBlockerService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                context.startForegroundService(i)
            else context.startService(i)
        }

        // Re-schedule alarms stored in SharedPreferences
        val alarmPrefs = context.getSharedPreferences("venolk_alarms", Context.MODE_PRIVATE)
        val alarmJson  = alarmPrefs.getString("alarms_json", null) ?: return

        try {
            val arr = org.json.JSONArray(alarmJson)
            val am  = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
            for (i in 0 until arr.length()) {
                val alarm    = arr.getJSONObject(i)
                val triggerMs = alarm.getLong("triggerMs")
                if (triggerMs < System.currentTimeMillis()) continue // already past

                val alarmId = alarm.getString("id")
                val title   = alarm.getString("title")
                val body    = alarm.getString("body")
                val type    = alarm.optString("type", "alarm")

                val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
                    this.action = "com.study.venolk1.ALARM_FIRE"
                    putExtra("alarm_id", alarmId)
                    putExtra("title", title)
                    putExtra("body", body)
                    putExtra("type", type)
                }
                val pi = android.app.PendingIntent.getBroadcast(
                    context, alarmId.hashCode(), alarmIntent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or
                    android.app.PendingIntent.FLAG_IMMUTABLE
                )
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, triggerMs, pi)
                } else {
                    am.setExact(android.app.AlarmManager.RTC_WAKEUP, triggerMs, pi)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
