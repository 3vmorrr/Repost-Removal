# Repost Remover for Android

Android alpha companion app. It shares the local renderer, Arabic/English UI, portrait assets, and design tokens with Desktop, with an Android WebView shell and mobile navigation.

## Install the preview

Download `Repost-Remover-Android-1.0.0-alpha1-debug.apk` from the [v1.1.0 GitHub release](https://github.com/3vmorrr/Repost-Removal/releases/tag/v1.1.0). Allow installation from the browser or file manager when Android prompts. This APK is debug-signed for preview testing; it is not a Play Store or production-signed build. Updates signed with a different debug key may require uninstalling the previous preview first.

## Build

Requires Android Studio or JDK 17+, Android SDK Platform 36, and network access for the first Gradle dependency download.

```powershell
.\gradlew.bat assembleDebug lintDebug
```

APK output: `app\build\outputs\apk\debug\app-debug.apk`.

## Session and privacy boundary

Sign-in takes place in the TikTok WebView inside this app. Android cannot access or reuse the separately installed TikTok app's session. No Accessibility Service permission is used. Review state is stored in the app's local SQLite database. Signing out clears repost rows and embedded TikTok WebView data while retaining language and theme preferences. The dashboard and memorial page are bundled; TikTok pages need internet access.

The app uses private TikTok website endpoints for listing and removing reposts. They may change or be blocked; login challenges and rate limits stop the operation. Removal is verified against a later listing. This is an alpha build and has not been signed for Play distribution.

## UI parity

`app/src/main/assets/www/` is the Android-bundled UI. Shared desktop UI source lives in `../desktop/src/renderer/`; `android-mobile.css` provides mobile-only layout rules. Portrait asset replacement instructions are in `app/src/main/assets/www/assets/README.md`.
