package com.omar.repostremover.android;

import android.webkit.JavascriptInterface;

final class AndroidJavascriptBridge {
    interface Dispatcher {
        void dispatch(String requestId, String method, String argumentsJson);
    }

    private final Dispatcher dispatcher;

    AndroidJavascriptBridge(Dispatcher dispatcher) {
        this.dispatcher = dispatcher;
    }

    @JavascriptInterface
    public void invoke(String requestId, String method, String argumentsJson) {
        dispatcher.dispatch(requestId, method, argumentsJson);
    }
}
