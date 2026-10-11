# Desktop application notes

## Architecture

- The Manifest V3 TypeScript extension in `../extension` remains an independent build and is not changed by the desktop interface work.
- Electron uses a persistent, isolated TikTok `WebContentsView` and a narrow main-process adapter. It does not emulate Chrome extension APIs or run the extension service worker.
- The app detects the current TikTok session from page identity signals. Incomplete signals remain `unknown`; the app does not infer login from cookies or a manually registered account.
- Repost discovery, local review, selected removal, sequential pacing, and safety stops follow the existing workflow. Successful removals are checked against TikTok before they are marked removed.
- SQLite stores local reposts and the light/dark and English/Arabic preferences. Fresh installs default to light and English. Legacy account rows and legacy schema are left untouched for data preservation; the current UI and process do not read or change those rows.
- The developer and Sadaqah Jariyah pages are local, work offline, and bundle their supplied images from `src/renderer/assets/`.
- Activation, subscription and application usage quota logic are absent. No license issuer, backend, telemetry, or advertising service is required.

## Security and known limits

Node integration remains disabled, context isolation is enabled, and native operations stay behind IPC. TikTok content remains in the separate persistent browser profile. The app does not copy passwords or cookies into the dashboard or transmit them to another service.

TikTok does not provide a supported personal-account repost deletion API. The adapter uses private website endpoints inherited from the extension; they may change or become unavailable. Authentication challenges, CAPTCHAs, rate limits, and risk-control responses stop the operation and require manual user action. Removal is paced sequentially; TikTok’s service controls still apply.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm test` from this directory. Automated tests cover the session classifier, localization keys and interpolation, social destinations, and the reduced account-management surface. Live TikTok sign-in and removal require a user-controlled test account and are not simulated.
