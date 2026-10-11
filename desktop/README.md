# Repost Remover Desktop

Free Windows Electron application for reviewing and removing TikTok reposts. Repost Remover has no activation, subscription, payment, license check, or usage quota. The desktop app and browser extension remain separate projects.

## Download for Windows

The first desktop release is available from [GitHub Releases](https://github.com/3vmorrr/Repost-Removal/releases/tag/v1.1.0):

- [Windows installer (x64)](https://github.com/3vmorrr/Repost-Removal/releases/download/v1.1.0/Repost%20Remover%20Setup%201.0.0.exe)
- [Portable app (x64)](https://github.com/3vmorrr/Repost-Removal/releases/download/v1.1.0/Repost%20Remover%201.0.0.exe)

The installer can be used for a standard Windows installation; the portable build runs without installing. Windows may show a SmartScreen unknown-publisher notice because these executables are not code-signed.

## Build and run

Requires Node.js 24 or newer and npm. From this folder:

```powershell
npm install
npm run typecheck
npm test
npm start
```

`npm run dist` creates the Windows installer and portable executable under `release/`. The executables are unsigned; Windows SmartScreen may show an unknown-publisher prompt until signed with a code-signing certificate.

## Use

1. Open **Scan Reposts** and sign in through the embedded TikTok browser. The application checks the live TikTok page identity; there is no account registration step.
2. Start a scan, review the locally stored results, select reposts, and confirm removal. Requests run sequentially with pacing. TikTok security or rate-limit responses stop the operation. Items are marked removed only after a follow-up TikTok listing check.
3. Use **Settings** to choose English or Arabic and light or dark appearance. A new installation starts in English and light theme. The choice is saved on this device.

TikTok’s session is kept in its separate local browser profile. The app does not copy passwords or cookies into the dashboard or send them to a service. Signing out stops any running operation, clears all repost results and removal history from SQLite, securely vacuums the deleted records, and clears the dedicated TikTok profile’s storage, cache, and authentication data. Application language and theme preferences remain saved.

## About pages and portrait assets

- **About the Developer** (`عن المطوّر`) is the short profile and social links page.
- **Sadaqah Jariyah** (`صدقة جارية`) is a static Arabic memorial and works offline.
- Replace the developer portrait at `src/renderer/assets/developer-portrait.png` and the memorial portrait at `src/renderer/assets/memorial-portrait.png`. Keep the filenames; circular crops are applied in CSS without retouching. See `src/renderer/assets/README.md` for details. `npm run dist` bundles both assets into the installer and portable app.

## Architecture and privacy

- `src/main.ts`: Electron lifecycle, secure main-process IPC, embedded browser, TikTok adapter, and SQLite persistence.
- `src/preload.ts`: narrow context-isolated bridge; the renderer has no Node.js or filesystem access.
- `src/session-state.ts`: conservative classifier for logged-in, logged-out, and unknown TikTok states.
- `src/renderer/`: bilingual dashboard and workflows, developer and memorial pages, and light/dark styles.
- Local reposts and preferences are stored in SQLite. A pre-existing legacy `accounts` table may remain in an installation’s database for data preservation, but the current app does not read or modify its rows and does not expose account management.
- No telemetry, advertising SDK, backend, or external service is included. TikTok’s embedded website and social links require the network only when opened; the dashboard and memorial page work offline.
- TikTok repost listing/removal uses private website endpoints inherited from the extension, not a supported personal-account API. They may change or become unavailable. Login challenges, CAPTCHAs, rate limits, and risk responses stop an operation.
- Node’s built-in `node:sqlite` avoids a compiled native add-on; it remains a release-candidate API in Node 24, so re-evaluate it before future releases.

## Tests and release checks

`npm run typecheck`, `npm run lint`, and `npm test` check TypeScript, renderer lint, bilingual translation coverage, session-state classification, social URL destinations, and the absence of account registration and licensing flows. These checks do not simulate a real TikTok login or make removal requests. Run the extension’s own checks from `../extension` when changing extension files.
