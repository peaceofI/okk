package com.study.venolk1

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.ScaleAnimation
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * SplashActivity — shown for ~1.4 seconds on cold launch.
 * Uses Theme.Venolk1.Splash (windowBackground = splash_bg).
 * Animates the V-logo in then transitions to MainActivity.
 *
 * Declared in AndroidManifest as the LAUNCHER activity.
 * MainActivity is declared with launchMode="singleTop" but NOT as LAUNCHER.
 */
@SuppressLint("CustomSplashScreen")
class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Full-screen edge-to-edge
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )

        setContentView(R.layout.activity_splash)

        // Animate logo
        val logo = findViewById<ImageView>(R.id.splash_logo)
        val wordmark = findViewById<TextView>(R.id.splash_wordmark)
        val tagline = findViewById<TextView>(R.id.splash_tagline)

        logo?.let {
            val scaleAnim = ScaleAnimation(0.6f, 1f, 0.6f, 1f,
                ScaleAnimation.RELATIVE_TO_SELF, 0.5f,
                ScaleAnimation.RELATIVE_TO_SELF, 0.5f).apply {
                duration = 600
                fillAfter = true
            }
            val fadeAnim = AlphaAnimation(0f, 1f).apply {
                duration = 500
                fillAfter = true
            }
            it.startAnimation(scaleAnim)
            it.startAnimation(fadeAnim)
        }

        wordmark?.let {
            val fade = AlphaAnimation(0f, 1f).apply {
                duration = 600; startOffset = 300; fillAfter = true
            }
            it.startAnimation(fade)
        }
        tagline?.let {
            val fade = AlphaAnimation(0f, 1f).apply {
                duration = 600; startOffset = 500; fillAfter = true
            }
            it.startAnimation(fade)
        }

        // Launch MainActivity after delay
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, MainActivity::class.java))
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }, 1400)
    }
}
