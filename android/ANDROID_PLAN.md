# Android implementation plan

## Goal

Ship an Android app that feels like the existing Repost Remover desktop app: the same ivory/olive/gold palette, light and dark modes, shared English/Arabic strings, RTL support, supplied portraits, responsive pages, and the same scan/review/remove flow.

## Architecture

- Android app module with a Java `Activity` and Android `WebView`.
- The dashboard is bundled from the desktop renderer so its pages, copy, and assets stay visually aligned. Android-only CSS adapts the desktop sidebar into a four-item bottom navigation and uses larger touch targets.
- A second, separately layered `WebView` hosts TikTok and owns the app's TikTok web session. It is not the installed TikTok app and does not import that app's cookies.
- A narrow JavaScript bridge connects only the bundled dashboard to native code. The remote TikTok page receives no JavaScript bridge.
- SQLite stores application preferences and scanned reposts on-device. No backend, analytics, licensing, or paid service is used.

## Phases

1. **Foundation and visual parity** — Android Gradle project, APK entry point, local asset bundling, copied renderer, responsive mobile navigation, theme/language persistence, and safe external links.
2. **TikTok session and scan** — embedded TikTok browser, session detection, paginated scan, progress, stop control, and local results.
3. **Review and removal** — selection, sequential removal, safety stops, follow-up verification, and logout clearing.
4. **Device readiness** — build/debug APK, install and check Android screen sizes, Arabic RTL, light/dark themes, session lifecycle, and release packaging.

## Current status

- **Phase 1:** implemented — Android project, shared renderer/assets, mobile navigation/layout, theme and language persistence, and local-only JavaScript bridge.
- **Phase 2:** implemented in source — embedded TikTok WebView, session detection, sequential paginated scan, progress, stop, and local SQLite results.
- **Phase 3:** implemented in source — result selection, sequential removal, safety stops, follow-up verification, and logout clearing.
- **Phase 4:** debug APK compiles. No real TikTok session/removal or device-size visual run has been performed yet, so those behaviors still need on-device validation before a public release.

## Known platform limits

- Android app isolation prevents reading TikTok's private app data or reusing its existing signed-in session.
- TikTok's current repost listing/removal integration relies on private website endpoints, so it is less stable than an official supported consumer API.
- An accessibility service is not part of this design; it would be a poor fit for background automation and is intended for accessibility use cases.
