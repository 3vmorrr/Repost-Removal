# Installation and sharing

## Current browser support

| Browser/device | Build | Status |
| --- | --- | --- |
| Chrome desktop | Chromium ZIP or `dist` | Built here; manual browser verification still required |
| Edge desktop | Chromium ZIP or `dist` | Expected to use Chromium APIs; not physically verified |
| Firefox desktop | Firefox ZIP or `dist/firefox` | Separate background-script manifest built; not physically verified |
| Firefox Android tablet | Firefox build | Experimental/unverified. Firefox Android has MV3 background/permission limitations; this project is not published on AMO and cannot currently be normally installed there. |
| Chrome Android | — | Normal desktop Chrome extensions are not supported |
| Other Android Chromium browsers | — | Not tested; do not assume compatibility |

The Firefox Android build target only means the package includes a Firefox Android manifest identifier and a `background.scripts` event-page form. Mozilla documents that background service workers are unsupported on Firefox Android, recommends MV2 for Android compatibility, and notes that runtime host-permission prompts may not be visible/editable there. So this MV3 target is experimental, and paired Telegram mode is not verified on Android. It is not evidence of successful runtime or TikTok behavior on a tablet. See [Mozilla's Android extension development notes](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/) and [Android add-on installation guide](https://support.mozilla.org/en-US/kb/find-and-install-add-ons-firefox-android).

## Install on Chrome or Edge desktop

1. Build with `npm install`, then `npm run build` (Node.js 20+).
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select the generated `dist` directory, not the ZIP file.
5. Open `https://www.tiktok.com/`, sign in directly, then refresh the tab.
6. Open the extension, use **Check TikTok profile**, and then start a scan.

To use Firefox desktop, load `dist/firefox` from `about:debugging#/runtime/this-firefox` using **Load Temporary Add-on**. Temporary add-ons are removed when Firefox restarts. Firefox Android installs add-ons through AMO/Firefox's Add-ons manager, not this ZIP. To make tablet installation possible, publish a signed compatible release to AMO, then install it from the Android Add-ons manager. This repository has no AMO publishing credentials or store listing, and the current package has not passed Android testing, so no tablet install is ready to recommend yet.

## Pair with Telegram (optional)

1. The bot account must be approved by the administrator.
2. Send `/connect` to [@RepostReomve_bot](https://t.me/RepostReomve_bot).
3. In extension Settings, enter the configured Worker URL and the one-time pairing code. This requests permission only for that Worker host.
4. Keep the extension enabled and TikTok open in the same browser while the Worker-dispatched scan or cleanup runs.
5. Use `/items` in Telegram to page through the scan and toggle individual items or an entire page. Send `/clean` and confirm the selected count. `/results` shows individual removal statuses. The browser extension must remain installed and available to execute the task.

Pairing does not send TikTok passwords, cookies, `secUid`, or repost metadata to the Worker. The Worker controls task dispatch and deletion quotas; the extension remains the executor.

## Build a shareable ZIP

Run:

```powershell
npm install
npm run build
npm run package
```

The repeatable PowerShell packager writes separate `tiktok-repost-remover-chromium-v2.2.0.zip` and `tiktok-repost-remover-firefox-v2.2.0.zip` packages under `dist/packages`. They contain the built manifest, compiled scripts, pages, styles, localization, and icons, with no source maps or `.env` files. The ZIP is an unpacked-install package, not an official store publication. Share only from a release location you control and trust. Users should extract the package and load its extracted folder as described above.

For updates, rebuild/re-download and reload the unpacked directory. Store updates will be automatic only after the extension is published through that store.

## Manual verification checklist

- [ ] Install the browser-specific output and open the extension popup.
- [ ] Confirm profile detection when signed into TikTok and its warning when signed out.
- [ ] Scan a small account/list; confirm new results start unchecked.
- [ ] Select one known repost and confirm the exact count in the deletion prompt.
- [ ] Stop a scan and verify partial results remain available.
- [ ] Verify a TikTok login/risk challenge stops work and requires manual action.
- [ ] Pair only if desired; verify `/status`, `/scan`, `/stop`, `/clean` and quota behavior.
- [ ] On Firefox/Android, repeat all checks on the actual target version/device before claiming support.
