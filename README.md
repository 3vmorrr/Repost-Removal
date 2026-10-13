# Repost Remover

A local-first TikTok repost review and removal project, published as three separate apps. Choose a folder below; each has its own build and installation notes.

## Downloads

See the [Repost Remover v1.1.1 release](https://github.com/3vmorrr/Repost-Removal/releases/tag/v1.1.1) for the updated Android preview. Windows and browser-extension packages remain available in the [v1.1.0 release](https://github.com/3vmorrr/Repost-Removal/releases/tag/v1.1.0).

### Windows desktop

Download the x64 [installer](https://github.com/3vmorrr/Repost-Removal/releases/download/v1.1.0/Repost.Remover.Setup.1.0.0.exe) or [portable app](https://github.com/3vmorrr/Repost-Removal/releases/download/v1.1.0/Repost.Remover.1.0.0.exe). The desktop app itself is version 1.0.0. It is unsigned, so Windows may display a SmartScreen warning. Source and build notes are in [`desktop/`](desktop/).

### Android preview

Download [`Repost-Remover-Android-1.0.0-alpha2-debug.apk`](https://github.com/3vmorrr/Repost-Removal/releases/download/v1.1.1/Repost-Remover-Android-1.0.0-alpha2-debug.apk). This is a debug-signed alpha preview, intended for sideload testing. It is not a Play Store or production-signed release. Android app source/build notes are in [`android/`](android/).

### Chrome and Edge extension (Developer Mode)

The extension is a local install; it is not published on the Chrome Web Store or Edge Add-ons. Either download and extract the Chromium ZIP from the release, or download this repository and select [`extension/chromium-unpacked/`](extension/chromium-unpacked/) directly.

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select the extracted package folder or the repository's `extension/chromium-unpacked` folder. The selected folder must contain `manifest.json` at its top level.
5. Open TikTok in that browser, sign in there, and refresh the TikTok tab before scanning.

The Firefox ZIP is included as a separate desktop build; see [`extension/INSTALLATION.md`](extension/INSTALLATION.md) for its temporary install steps and platform limitations. Browser extension source, local Chromium build, and packaging notes are in [`extension/`](extension/).

## Repository layout

- [`desktop/`](desktop/) — Windows Electron application source.
- [`android/`](android/) — native Android WebView shell and its bundled mobile UI.
- [`extension/`](extension/) — browser extension source, installation guide, and `chromium-unpacked/` loadable build.

## Important limits and privacy

The desktop and Android apps keep their own TikTok web session inside the app; Android does not read the session from the separate TikTok app. The extension uses the signed-in session of the browser where it is installed. Each platform stores its own review state locally. The extension also offers an optional Telegram pairing mode; ordinary local mode does not require it.

TikTok does not provide a supported personal-account API for repost removal. These projects use private website endpoints that TikTok may change, block, or restrict. Login challenges and rate limits should be handled manually; the apps stop when safety responses are detected. The projects are independent of and not endorsed by TikTok/ByteDance.

The browser extension is based on the MIT-licensed upstream project by [Yiğit (@yiitxyz)](https://github.com/yiitxyz/tiktokRepostRemover); its attribution and license are preserved in `extension/`.

## Build from source

See each folder's README for its requirements and commands. Do not commit signing keys, local Android SDK paths, device logs, app databases, dependency directories, or generated build output.
