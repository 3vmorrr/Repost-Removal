# Security policy

## Supported version

Security fixes are applied to the latest release.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/yiitxyz/tiktokRepostRemover/security/advisories/new). Do not open a public issue for vulnerabilities and never attach TikTok cookies, `secUid` values, authentication headers, or exported account data.

The standalone extension runs locally, while optional Telegram pairing uses the project's Cloudflare Worker and D1 database. The Worker receives no TikTok password, browser cookie, or `secUid`. Reports involving unexpected permissions, pairing-token leakage, unsafe request replay, or destructive-selection bugs are especially useful. Do not include secrets or account exports in reports.
