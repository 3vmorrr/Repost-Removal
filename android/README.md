# Repost Remover for Android

Android companion project for Repost Remover. It reuses the desktop renderer, supplied portraits, bilingual copy, colors, and typography, then adds a touch-first mobile layout and an Android `WebView` shell.

## Build

Requirements: Android Studio or JDK 17+, Android SDK Platform 36, and an internet connection for the first Gradle dependency download.

```powershell
cd android
.\gradlew.bat assembleDebug
```

Debug APK: `app\build\outputs\apk\debug\app-debug.apk`.

## Required Android updates

The app checks the manifest attached to the latest GitHub release before opening the dashboard:
`https://github.com/3vmorrr/Repost-Removal/releases/latest/download/android-update.json`.
When the installed `versionCode` is below `minimumSupportedVersionCode`, the app keeps the dashboard closed and offers the APK download in Chrome. Android still asks the user to confirm installation. If the update service is unreachable and there is no cached mandatory update, the app opens normally so a temporary GitHub outage does not lock everyone out.

To make the next release, update `versionCode` and `versionName` in `app/build.gradle.kts`, then edit `release-update.json`. Set `minimumSupportedVersionCode` to the new `versionCode` to require that release; use a lower value to leave older installs supported. Put the update text in both `message` and `messageAr`. Push an `android-v*` tag (for example `android-v1.1.2`) to start `.github/workflows/android-release.yml`; it builds a signed APK and publishes it with the matching manifest.

### Signing setup (one time)

Every update must use the same signing key. Existing Android preview APKs were checked against this machine's Android debug keystore, so keep that file (`%USERPROFILE%\.android\debug.keystore`) and use it for this preview release channel. Do not commit or send the keystore. In GitHub repository **Settings → Secrets and variables → Actions**, add:

- `ANDROID_KEYSTORE_BASE64`: the Base64 contents of the existing keystore (PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\.android\debug.keystore")) | Set-Clipboard`, then paste into the secret).
- `ANDROID_STORE_PASSWORD`: `android`
- `ANDROID_KEY_ALIAS`: `androiddebugkey`
- `ANDROID_KEY_PASSWORD`: `android`

This debug key is only suitable for the existing sideload preview channel. Keep a private backup; changing or losing it prevents in-place updates for installed copies. A Play Store or public production release should use a separately planned production signing key and distribution channel.

The first update-aware APK must be installed manually because earlier previews do not contain the startup update check. After that, publishing the next tagged release with a higher `versionCode` and matching minimum supported version will enforce the update automatically.

## TikTok session boundary

Sign-in happens in the TikTok `WebView` embedded in Repost Remover. Android keeps that web session inside this app; it does not read or reuse the session from the separately installed TikTok app. The app does not request Accessibility Service permission or control TikTok's native interface.

The scan and removal adapter uses the same private TikTok website endpoints as the desktop app. TikTok can change or block them at any time. Scan and removal controls remain sequential, cancellable, and verified against a follow-up repost listing. TikTok login challenges, rate limits, or account-safety responses stop the run.

The Android app stores settings and review results locally in its own SQLite database. Signing out clears the repost rows and embedded TikTok WebView data, while retaining the app's language and theme settings. TikTok pages require internet access; the dashboard and memorial page are bundled locally.

## Background operation notifications

Scanning and removal use an Android foreground service with a persistent notification showing live progress and a safe-stop action. The operation continues when the app is in the background or the screen is locked; Android 13 and newer require notification permission for progress to appear in the notification drawer. A user force-stop or Android's Active apps Stop action ends the operation.

## UI parity

`app/src/main/assets/www/` is copied from `desktop/src/renderer/`. Keep it aligned when changing the shared desktop UI. `android-mobile.css` adds only Android-specific mobile navigation, safe-area spacing, and touch-sized controls. Portrait files are the exact supplied desktop assets under `www/assets/`.

## Implementation plan

See [ANDROID_PLAN.md](ANDROID_PLAN.md) for the port phases and current implementation status.

