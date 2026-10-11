# Changelog

## 2.2.0 - 2026-10-10

- Redesigned the popup, review page, and settings with a warm ivory, charcoal, coral, and mint palette and responsive controls.
- Added centralized English and Egyptian Arabic copy, translated settings and review actions, and applied RTL/LTR direction across all extension screens.
- Added explicit Local and Telegram operating modes. Local scans and removals remain in the browser; paired Telegram deletions continue through Worker authorization and quota checks.
- Fixed pairing instructions and Worker URL configuration, made `/connect@BotName` work, clarified approval requirements, and added distinct invalid, expired, inactive, and reused-code responses.
- Added automated tests for pairing-code validation, expiry, reuse, and extension pairing responses.
- No local deletion item cap was present; sequential pacing, periodic cooldowns, and TikTok safety shutdowns remain in place.

## 2.1.0 - 2026-10-10

- Freshly scanned reposts are unchecked by default, so removal always follows explicit user selection.
- Added a TikTok profile-data check that clearly avoids claiming a session is verified.
- Added persisted system/light/dark theme and English/Arabic direction preferences, pairing settings, help/privacy details, and local-cache clearing.
- Added separate Chromium desktop and Firefox 128+ build outputs, plus repeatable ZIP packaging.
- Added desktop/Android support notes and a manual browser verification checklist; Firefox and tablet runtime behavior remain unverified.
- Updated build tests to build first and verify both browser manifest variants.

## 2.0.1 - 2026-08-04

- Added a two-phase scan, review, and selected-only deletion workflow.
- Added persistent IndexedDB selection, search, pagination, JSON/CSV export, pause/resume, and stop controls.
- Added bounded server verification with live progress.
- Added safe fallback from 50-item listing requests to TikTok's accepted 30-item size.
- Added request timeouts, bounded listing retries, immediate safety shutdowns, and sanitized logging.
- Tuned deletion pacing to 300–600 ms with randomized 4–7 second group cooldowns.
