package com.study.venolk1

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.WindowInsetsController
import android.webkit.*
import android.widget.FrameLayout
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * MainActivity — VENOLK1
 *
 * Hosts the WebView with a full-featured AndroidBridge so that
 * HTML/JS code can trigger native Android features:
 *   • Background notifications (Pomodoro, alarms, prayer, routine)
 *   • Exact alarms via AlarmManager
 *   • File picker (images, PDFs, audio) for notes/alarms
 *   • White noise / media playback service
 *   • App blocker
 *   • Orientation state is saved via JS sessionStorage calls
 *
 * configChanges="orientation|screenSize" is declared in the manifest
 * so the Activity does NOT restart on rotation — the WebView state
 * is preserved automatically. No more Pomodoro reset!
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // ── File picker launcher ──────────────────────────────────────────
    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val uris: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK) {
                val data = result.data
                when {
                    data?.clipData != null -> {
                        val count = data.clipData!!.itemCount
                        Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                    }
                    data?.data != null -> arrayOf(data.data!!)
                    else -> null
                }
            } else null
            filePathCallback?.onReceiveValue(uris)
            filePathCallback = null
        }

    // ── Notification permission launcher (Android 13+) ───────────────
    private val notifPermLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            webView.evaluateJavascript(
                "window._notifPermResult && window._notifPermResult($granted)", null
            )
        }

    // ── Exact alarm permission (Android 12+) ─────────────────────────
    private val exactAlarmLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { _ ->
            // re-check and inform JS
            val ok = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (getSystemService(ALARM_SERVICE) as android.app.AlarmManager)
                    .canScheduleExactAlarms()
            } else true
            webView.evaluateJavascript(
                "window._exactAlarmResult && window._exactAlarmResult($ok)", null
            )
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Edge-to-edge display
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.setSystemBarsAppearance(
                0,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            )
        }

        val container = FrameLayout(this)
        setContentView(container)

        setupWebView()
        container.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        // Only load the URL the first time; rotation keeps the existing page
        if (savedInstanceState == null) {
            webView.loadUrl("file:///android_asset/index.html")
        }
    }

    // ── WebView configuration ─────────────────────────────────────────
    private fun setupWebView() {
        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true           // localStorage / sessionStorage
                databaseEnabled = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                mediaPlaybackRequiresUserGesture = false  // white noise autoplay
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                setSupportMultipleWindows(true)
                javaScriptCanOpenWindowsAutomatically = true
                builtInZoomControls = false
                displayZoomControls = false
                useWideViewPort = true
                loadWithOverviewMode = true
                cacheMode = WebSettings.LOAD_DEFAULT
            }

            // Attach native bridge
            addJavascriptInterface(AndroidBridge(this@MainActivity, this), "AndroidBridge")

            webViewClient = VenolkWebViewClient()
            webChromeClient = VenolkChromeClient()

            // Keep WebView alive across orientation changes
            keepScreenOn = false
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
        }
    }

    // ── WebViewClient ─────────────────────────────────────────────────
    inner class VenolkWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()
            return if (url.startsWith("file://")) {
                false // let WebView handle
            } else {
                // Open external URLs in system browser
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                true
            }
        }

        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            // Inject helper to detect rotation and preserve state
            view.evaluateJavascript("""
                (function(){
                    if(!window._rotationGuardInstalled){
                        window._rotationGuardInstalled=true;
                        window.addEventListener('beforeunload',function(){
                            // Save pomo state so it survives if page ever reloads
                            try{
                                var ps=JSON.stringify(window.S&&window.S.pomo);
                                if(ps)sessionStorage.setItem('_vk_pomo_backup',ps);
                            }catch(e){}
                        });
                    }
                })();
            """.trimIndent(), null)
        }
    }

    // ── ChromeClient ──────────────────────────────────────────────────
    inner class VenolkChromeClient : WebChromeClient() {
        // File chooser — images, PDFs, audio
        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams
        ): Boolean {
            this@MainActivity.filePathCallback?.onReceiveValue(null)
            this@MainActivity.filePathCallback = filePathCallback

            val intent = fileChooserParams.createIntent().apply {
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                type = "*/*"
                putExtra(
                    Intent.EXTRA_MIME_TYPES,
                    arrayOf("image/*", "application/pdf", "audio/*", "video/*")
                )
            }
            filePickerLauncher.launch(Intent.createChooser(intent, "Select File"))
            return true
        }

        // JS alerts / confirms / prompts
        override fun onJsAlert(view: WebView, url: String, msg: String, result: JsResult): Boolean {
            android.app.AlertDialog.Builder(this@MainActivity)
                .setMessage(msg)
                .setPositiveButton("OK") { _, _ -> result.confirm() }
                .setOnCancelListener { result.cancel() }
                .show()
            return true
        }

        override fun onJsConfirm(view: WebView, url: String, msg: String, result: JsResult): Boolean {
            android.app.AlertDialog.Builder(this@MainActivity)
                .setMessage(msg)
                .setPositiveButton("OK") { _, _ -> result.confirm() }
                .setNegativeButton("Cancel") { _, _ -> result.cancel() }
                .show()
            return true
        }

        override fun onPermissionRequest(request: PermissionRequest) {
            request.grant(request.resources)
        }
    }

    // ── Save / restore WebView state across rotation ──────────────────
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }

    // ── Back button ───────────────────────────────────────────────────
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    // ── Notification permission helper (called from AndroidBridge) ────
    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                return
            }
        }
        webView.evaluateJavascript(
            "window._notifPermResult && window._notifPermResult(true)", null
        )
    }

    // ── Exact alarm permission helper ─────────────────────────────────
    fun requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = getSystemService(ALARM_SERVICE) as android.app.AlarmManager
            if (!am.canScheduleExactAlarms()) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                exactAlarmLauncher.launch(intent)
                return
            }
        }
        webView.evaluateJavascript(
            "window._exactAlarmResult && window._exactAlarmResult(true)", null
        )
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
