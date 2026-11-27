package com.hellfall.game;

import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.view.View;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import java.io.ByteArrayInputStream;
import java.util.Collections;

/** Debug-only local game shell. No JS bridge, network permission, or remote game URL. */
public class MainActivity extends Activity {
    private WebView web;
    private static final String HOST = "appassets.androidplatform.net";
    private boolean paused;
    private static boolean local(Uri u) {
        return "https".equals(u.getScheme()) && HOST.equals(u.getHost()) &&
            u.getPath() != null && u.getPath().startsWith("/assets/www/");
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        WebSettings s=web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClientCompat(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u=request.getUrl();
                if(local(u)){
                    WebResourceResponse response=loader.shouldInterceptRequest(u);
                    if(response!=null)return response;
                }
                return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){return !local(request.getUrl());}
            @Override public void onPageFinished(WebView view,String url){syncPause();}
        });
        setContentView(web);
        web.loadUrl("https://"+HOST+"/assets/www/index.html");
    }
    private void syncPause(){
        if(web!=null)web.evaluateJavascript("window.HellPlatform && window.HellPlatform.setNativePaused("+paused+")",null);
    }
    @Override protected void onPause(){paused=true;syncPause();if(web!=null)web.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();paused=false;if(web!=null){web.onResume();syncPause();}}
    @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
