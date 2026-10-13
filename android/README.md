# Repost Remover for Android

Android companion project for Repost Remover. It reuses the desktop renderer, supplied portraits, bilingual copy, colors, and typography, then adds a touch-first mobile layout and an Android `WebView` shell.

## Install the preview

Download [`Repost-Remover-Android-1.0.0-alpha2-debug.apk`](https://github.com/3vmorrr/Repost-Removal/releases/download/v1.1.1/Repost-Remover-Android-1.0.0-alpha2-debug.apk) from the [v1.1.1 release](https://github.com/3vmorrr/Repost-Removal/releases/tag/v1.1.1). This debug-signed APK is for sideload testing only; it is not a Play Store or production-signed build.

## Build

Requirements: Android Studio or JDK 17+, Android SDK Platform 36, and an internet connection for the first Gradle dependency download.

```powershell
cd android
.\gradlew.bat assembleDebug
```

Debug APK: `app\build\outputs\apk\debug\app-debug.apk`.

## TikTok session boundary

Sign-in happens in the TikTok `WebView` embedded in Repost Remover. Android keeps that web session inside this app; it does not read or reuse the session from the separately installed TikTok app. The app does not request Accessibility Service permission or control TikTok's native interface.

The scan and removal adapter uses the same private TikTok website endpoints as the desktop app. TikTok can change or block them at any time. Scan and removal controls remain sequential, cancellable, and verified against a follow-up repost listing. TikTok login challenges, rate limits, or account-safety responses stop the run.

The Android app stores settings and review results locally in its own SQLite database. Signing out clears repost rows and TikTok-origin WebView data while retaining Google and other sites' browser sessions, app language, and theme settings. TikTok pages require internet access; the dashboard and memorial page are bundled locally.

## UI parity

`app/src/main/assets/www/` is copied from `desktop/src/renderer/`. Keep it aligned when changing the shared desktop UI. `android-mobile.css` adds only Android-specific mobile navigation, safe-area spacing, and touch-sized controls. Portrait files are the exact supplied desktop assets under `www/assets/`.

## Implementation plan

See [ANDROID_PLAN.md](ANDROID_PLAN.md) for the port phases and current implementation status.
