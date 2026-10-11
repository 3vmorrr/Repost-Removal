# Privacy

TikTok Repost Remover runs TikTok listing and removal requests from the user's signed-in browser. It never asks for or uploads a TikTok password, `sessionid`, cookie, or access token.

## Data kept in the browser

- TikTok page-context `secUid` is used to query the signed-in account and is not sent to the Cloudflare Worker.
- Repost IDs, creator names, captions, thumbnail URLs, selections, and full run state remain in the extension's IndexedDB and `chrome.storage.local`.
- JSON/CSV exports are created locally only after the user selects an export action.

## Data sent to the Cloudflare Worker when paired

The Worker receives the Telegram user ID at pairing and a hash of the extension bearer token. For Telegram's `/items` review and `/results` pages, a paired extension sends repost IDs, creator names, captions, TikTok video links, selection flags, and per-item result states to D1. Thumbnail images and `secUid` remain local. The Worker also stores task IDs/kinds, status/error summaries, daily usage and delete-attempt audit events. The one-time pairing code is exchanged for a random token and expires after ten minutes. The extension asks permission to contact the specified `workers.dev` host. It never transmits a TikTok password, cookie, session token, or authentication header to the Worker.

TikTok receives the listing and removal requests the user explicitly starts. Telegram receives task summaries and account-management messages. Cloudflare D1 retains user, task, quota, and activity records so the bot can enforce approvals and report history.

## Removal

Disconnect the extension from its settings page to revoke its Worker token. Remove the extension from Brave or Chrome to delete browser-managed extension data. Administrators can remove a user's bot data with `/deleteuser TELEGRAM_ID` after confirming.

Do not include cookies, pairing tokens, or account identifiers in public bug reports.
