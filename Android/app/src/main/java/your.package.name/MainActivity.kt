package your.package.name

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)

        webView.apply {
            setBackgroundColor(0xFF050914.toInt())

            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true

                cacheMode = WebSettings.LOAD_DEFAULT

                allowFileAccess = true
                allowContentAccess = true

                builtInZoomControls = false
                displayZoomControls = false
                setSupportZoom(false)

                loadsImagesAutomatically = true
                mediaPlaybackRequiresUserGesture = false

                useWideViewPort = true
                loadWithOverviewMode = false
            }
        }

        setContentView(webView)

        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        webView.apply {
            stopLoading()
            clearHistory()
            removeAllViews()
            destroy()
        }

        super.onDestroy()
    }
}
