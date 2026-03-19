package com.study.venolk1

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * StudyWidget — AppWidgetProvider
 *
 * A home screen widget that shows:
 *   • Today's study streak
 *   • Pomodoro count today
 *   • Current Pomodoro timer (if running)
 *   • Quick "Start Focus" tap-to-open button
 *
 * The widget layout is defined in res/layout/widget_study.xml.
 * It's updated whenever AndroidBridge.updateWidget(statsJson) is called.
 *
 * XML provider info is in res/xml/study_widget_info.xml.
 */
class StudyWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_UPDATE_FROM_BRIDGE = "com.study.venolk1.WIDGET_UPDATE"
        const val EXTRA_STATS_JSON          = "stats_json"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            updateWidget(context, appWidgetManager, id, null)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_UPDATE_FROM_BRIDGE) {
            val statsJson = intent.getStringExtra(EXTRA_STATS_JSON)
            val awm = AppWidgetManager.getInstance(context)
            val ids = awm.getAppWidgetIds(
                android.content.ComponentName(context, StudyWidget::class.java)
            )
            for (id in ids) {
                updateWidget(context, awm, id, statsJson)
            }
        }
    }

    private fun updateWidget(
        context: Context,
        awm: AppWidgetManager,
        widgetId: Int,
        statsJson: String?
    ) {
        val rv = RemoteViews(context.packageName, R.layout.widget_study)

        // Tap opens the app
        val tapIntent = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        rv.setOnClickPendingIntent(R.id.widget_root, tapIntent)

        // Parse stats
        var streak    = "0"
        var pomoCount = "0"
        var timerText = "Start Focus →"

        try {
            val obj = JSONObject(statsJson ?: "{}")
            streak    = obj.optInt("streak",    0).toString()
            pomoCount = obj.optInt("pomodoros", 0).toString()
            val remaining = obj.optLong("remainingMs", -1L)
            if (remaining > 0) {
                val min = remaining / 60000
                val sec = (remaining % 60000) / 1000
                timerText = "${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}"
            }
        } catch (e: Exception) { e.printStackTrace() }

        rv.setTextViewText(R.id.widget_streak,    "🔥 $streak day streak")
        rv.setTextViewText(R.id.widget_pomodoros, "🍅 $pomoCount pomodoros today")
        rv.setTextViewText(R.id.widget_timer,     timerText)

        awm.updateAppWidget(widgetId, rv)
    }
}
