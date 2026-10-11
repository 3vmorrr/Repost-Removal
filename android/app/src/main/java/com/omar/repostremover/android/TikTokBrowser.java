package com.omar.repostremover.android;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.util.UUID;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

final class TikTokBrowser {
    interface PageListener { void onPageChanged(); }

    private final Activity activity;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final WebView view;
    private PageListener pageListener;

    TikTokBrowser(Activity activity, PageListener listener) {
        this.activity = activity;
        this.pageListener = listener;
        view = new WebView(activity);
        view.setBackgroundColor(0xffffffff);
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setDomStorageEnabled(true);
        view.getSettings().setSupportMultipleWindows(false);
        view.getSettings().setAllowFileAccess(false);
        view.getSettings().setAllowContentAccess(false);
        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                return route(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, String url) {
                return route(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView webView, String url) {
                if (TikTokBrowser.this.pageListener != null) TikTokBrowser.this.pageListener.onPageChanged();
            }
        });
    }

    private boolean route(Uri uri) {
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        if ("https".equals(uri.getScheme()) && allowedHost(host)) return false;
        if ("https".equals(uri.getScheme()) && activity.getPackageManager().resolveActivity(new Intent(Intent.ACTION_VIEW, uri), 0) != null) {
            try { activity.startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
        }
        return true;
    }

    private boolean allowedHost(String host) {
        return host.equals("tiktok.com") || host.endsWith(".tiktok.com")
                || host.equals("google.com") || host.endsWith(".google.com") || host.endsWith(".googleusercontent.com")
                || host.equals("facebook.com") || host.endsWith(".facebook.com") || host.equals("fb.com") || host.endsWith(".fb.com")
                || host.equals("apple.com") || host.endsWith(".apple.com");
    }

    WebView view() { return view; }
    boolean isLoading() { return view.getProgress() < 100; }
    String currentUrl() { return view.getUrl() == null ? "" : view.getUrl(); }

    void openHome() { main.post(() -> view.loadUrl("https://www.tiktok.com/")); }
    void openIfNeeded() { main.post(() -> { if (view.getUrl() == null) view.loadUrl("https://www.tiktok.com/"); }); }
    void back() { main.post(() -> { if (view.canGoBack()) view.goBack(); }); }
    void reload() { main.post(view::reload); }
    void logoutPage() { main.post(() -> view.loadUrl("https://www.tiktok.com/logout")); }
    void cancelPendingReadRequests() {
        main.post(() -> view.evaluateJavascript(
                "(()=>{const requests=window.__rrMobileReadControllers;if(!requests)return 0;for(const controller of requests)controller.abort();return requests.size})()",
                null));
    }

    void clearSession() {
        main.post(() -> {
            view.stopLoading();
            view.clearHistory();
            view.clearCache(true);
            view.clearFormData();
            view.evaluateJavascript("try{localStorage.clear();sessionStorage.clear()}catch(e){};true", null);
            CookieManager.getInstance().removeAllCookies(ignored -> {
                CookieManager.getInstance().flush();
                android.webkit.WebStorage.getInstance().deleteAllData();
                view.loadUrl("https://www.tiktok.com/");
            });
        });
    }

    Object runExpression(String expression, long timeoutSeconds) throws Exception {
        String key = UUID.randomUUID().toString().replace("-", "");
        String quotedKey = JSONObject.quote(key);
        String kickoff = "(function(){window.__rrMobileResults=window.__rrMobileResults||{};window.__rrMobileResults[" + quotedKey + "]={done:false};Promise.resolve().then(()=> (" + expression + ")).then(value=>{window.__rrMobileResults[" + quotedKey + "]={done:true,value:value}}).catch(error=>{window.__rrMobileResults[" + quotedKey + "]={done:true,error:String(error&&error.message||error)}});return true})()";
        runJavascript(kickoff, 15);
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds);
        while (System.nanoTime() < deadline) {
            JSONObject envelope = asObject(runJavascript("window.__rrMobileResults&&window.__rrMobileResults[" + quotedKey + "]||null", 15));
            if (envelope != null && envelope.optBoolean("done")) {
                runJavascript("delete window.__rrMobileResults[" + quotedKey + "]", 5);
                if (envelope.has("error")) throw new IllegalStateException(envelope.optString("error"));
                return envelope.opt("value");
            }
            Thread.sleep(250);
        }
        throw new IllegalStateException("TikTok did not respond in time. The page may have changed or stopped loading.");
    }

    JSONObject pageIdentity() throws Exception {
        String script = "(()=>{" +
                "const universal=window.__$UNIVERSAL_DATA$__;const scope=universal?.__DEFAULT_SCOPE__;const d=scope?.['webapp.app-context'];" +
                "const path=location.pathname.toLowerCase();" +
                "const loginRoute=path.startsWith('/login')||path.startsWith('/signup');" +
                "const loginButton=document.querySelector('[data-e2e=\"top-login-button\"], [data-e2e=\"login-button\"]');" +
                "const loginAction=Array.from(document.querySelectorAll('button,a,[role=\"button\"]')).some(element=>/^(log in|sign in)\\b|^(sign up|تسجيل الدخول|إنشاء حساب)$/i.test([element.getAttribute('aria-label'),element.innerText,element.textContent].filter(Boolean).join(' ').trim()));" +
                "const bodyText=(document.body?.innerText||'').toLowerCase();const loginPageContent=/log in to tiktok|log in to continue|sign in to continue|تسجيل الدخول إلى تيك توك|سجل الدخول للمتابعة/.test(bodyText);const contextSaysLoggedOut=d?.user?.isLogin===false||d?.user?.isLogin===0;" +
                "return {secUid:typeof d?.user?.secUid==='string'?d.user.secUid:null,handle:typeof d?.user?.uniqueId==='string'?d.user.uniqueId:null,loggedOutSignal:loginRoute||Boolean(loginButton)||loginAction||loginPageContent||contextSaysLoggedOut,universalReady:Boolean(universal),scopeReady:Boolean(scope),accountContextReady:Boolean(d),profileReady:Boolean(typeof d?.user?.secUid==='string'&&d.user.secUid&&typeof d?.user?.uniqueId==='string'&&d.user.uniqueId)}" +
                "})()";
        JSONObject identity = null;
        for (int attempt = 0; attempt < 3; attempt++) {
            identity = asObject(runExpression(script, 20));
            if (identity == null || identity.optBoolean("profileReady") || identity.optBoolean("loggedOutSignal")) return identity;
            if (attempt < 2) Thread.sleep(500);
        }
        return identity;
    }

    boolean openCurrentUserProfile() throws Exception {
        String script = "(()=>{const selectors=['[data-e2e=\"profile-icon\"]','a[aria-label*=\"Profile\" i]','button[aria-label*=\"Profile\" i]','[aria-label*=\"الملف الشخصي\"]'];let target=null;for(const selector of selectors){target=document.querySelector(selector);if(target)break}if(!target){target=Array.from(document.querySelectorAll('a,button,[role=\"button\"]')).find(element=>/^(profile|الملف الشخصي)$/i.test((element.getAttribute('aria-label')||element.innerText||'').trim()))}if(!target)return false;target.click();return true})()";
        return Boolean.TRUE.equals(runExpression(script, 10));
    }

    Object listReposts(String cursor) throws Exception {
        String safeCursor = JSONObject.quote(cursor);
        String expression = "(async()=>{" +
                "const secUid=window.__$UNIVERSAL_DATA$__?.__DEFAULT_SCOPE__?.['webapp.app-context']?.user?.secUid;" +
                "if(!secUid)throw Error('TikTok login is no longer available.');" +
                "const p=new URLSearchParams({aid:'1988',count:'30',coverFormat:'2',cursor:" + safeCursor + ",needPinnedItemIds:'true',post_item_list_request_type:'0',secUid});" +
                "const endpoint='/api/repost/item_list/?'+p;let j=null;" +
                "for(let attempt=0;attempt<3;attempt++){const controller=new AbortController();const requests=window.__rrMobileReadControllers||(window.__rrMobileReadControllers=new Set());requests.add(controller);const timer=setTimeout(()=>controller.abort(),15000);try{" +
                "const r=await fetch(endpoint,{credentials:'include',signal:controller.signal});" +
                "if([401,403,429].includes(r.status))throw Error('TikTok returned '+r.status+'. Stopped for account safety.');" +
                "if(r.status>=500){if(attempt<2){await new Promise(resolve=>setTimeout(resolve,500*Math.pow(2,attempt)));continue}throw Error('TikTok server error ('+r.status+').')}" +
                "if(!r.ok)throw Error('TikTok listing failed ('+r.status+').');" +
                "j=await r.json();break;" +
                "}catch(error){const retryable=error instanceof TypeError||error.name==='AbortError';if(retryable&&attempt<2){await new Promise(resolve=>setTimeout(resolve,500*Math.pow(2,attempt)));continue}if(error.name==='AbortError')throw Error('TikTok request timed out after 20 seconds.');throw error}" +
                "finally{clearTimeout(timer);requests.delete(controller)}}" +
                "if(!j)throw Error('TikTok returned an empty response.');" +
                "if(j.status_code!==0)throw Error(j.status_msg||'TikTok could not list reposts.');" +
                "const rawItems=Array.isArray(j.itemList)?j.itemList:(Array.isArray(j.data?.itemList)?j.data.itemList:null);const hasMore=!!(j.hasMore??j.data?.hasMore);const nextCursor=String(j.cursor??j.data?.cursor??" + safeCursor + ");" +
                "if(!rawItems){if(!hasMore)return {items:[],rawCount:0,hasMore:false,cursor:nextCursor};return {schemaError:true,statusCode:j.status_code??null,responseKeys:Object.keys(j).slice(0,16).join(','),nestedKeys:j.data&&typeof j.data==='object'?Object.keys(j.data).slice(0,16).join(','):''};}" +
                "return {items:rawItems.filter(x=>x.id&&x.author?.uniqueId).map(x=>({id:String(x.id),creator:x.author.uniqueId,description:x.desc||'',thumbnail:x.video?.cover||x.video?.originCover||'',url:'https://www.tiktok.com/@'+x.author.uniqueId+'/video/'+x.id})),rawCount:rawItems.length,hasMore,cursor:nextCursor}" +
                "})()";
        return runExpression(expression, 45);
    }

    void removeRepost(String itemId) throws Exception {
        if (!itemId.matches("[0-9]{1,30}")) throw new IllegalArgumentException("The repost identifier was invalid.");
        String expression = "(async()=>{const p=new URLSearchParams({aid:'1988',item_id:" + JSONObject.quote(itemId) + "});const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch('/tiktok/v1/upvote/delete?'+p,{method:'POST',credentials:'include',headers:{'content-type':'application/x-www-form-urlencoded'},body:'',signal:controller.signal});if([401,403,429].includes(r.status))throw Error('TikTok returned '+r.status+'. Stopped for account safety.');if(!r.ok)throw Error('TikTok removal failed ('+r.status+').');const j=await r.json();if(j.status_code!==0)throw Error(j.status_msg||'TikTok could not remove this repost.');return true}catch(error){if(error.name==='AbortError')throw Error('TikTok removal request timed out after 15 seconds.');throw error}finally{clearTimeout(timer)}})()";
        Object response = runExpression(expression, 20);
        if (!Boolean.TRUE.equals(response)) throw new IllegalStateException("TikTok did not confirm the removal.");
    }

    private Object runJavascript(String javascript, long timeoutSeconds) throws Exception {
        AtomicReference<String> response = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        main.post(() -> {
            if (view.getUrl() == null || !view.getUrl().startsWith("https://")) {
                response.set(null);
                latch.countDown();
                return;
            }
            view.evaluateJavascript("JSON.stringify(" + javascript + ")", value -> {
                response.set(value);
                latch.countDown();
            });
        });
        if (!latch.await(timeoutSeconds, TimeUnit.SECONDS)) throw new IllegalStateException("TikTok browser evaluation timed out.");
        if (response.get() == null || "null".equals(response.get())) throw new IllegalStateException("Open TikTok and sign in first.");
        Object decoded = new JSONTokener(response.get()).nextValue();
        if (decoded instanceof String) return new JSONTokener((String) decoded).nextValue();
        return decoded;
    }

    private static JSONObject asObject(Object value) throws JSONException {
        if (value instanceof JSONObject) return (JSONObject) value;
        if (value instanceof String) return new JSONObject((String) value);
        return null;
    }

    void dispose() {
        pageListener = null;
        main.post(() -> {
            view.stopLoading();
            view.setWebViewClient(new WebViewClient());
            view.destroy();
        });
    }
}
