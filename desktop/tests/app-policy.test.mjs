import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the app uses a single live TikTok session and no account registration UI or IPC', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const html = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  assert.match(main, /handle\('session:check'/);
  assert.match(main, /handle\('session:logout'/);
  assert.doesNotMatch(main, /account:(?:register|remove|logout)/);
  assert.doesNotMatch(main, /DELETE FROM accounts|normalizeSingleAccountStore|registerSingleAccount/);
  assert.doesNotMatch(html, /data-page="accounts"|Accounts|Manage accounts/i);
  assert.doesNotMatch(renderer, /registerAccount|removeAccount|accountsPage/);
});

test('appearance defaults to light, persists a selected language, and exposes both themes', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  assert.match(main, /getSetting<string>\('theme', 'light'\)/);
  assert.match(main, /handle\('app:set-language'/);
  assert.match(renderer, /value="light"/);
  assert.match(renderer, /value="dark"/);
  assert.match(renderer, /value="en"/);
  assert.match(renderer, /value="ar"/);
});

test('review progress is live and confirmed removals leave the active review list', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');
  assert.match(main, /activity\.pagesScanned = page; activity\.found = found/);
  assert.match(main, /activity\.processed = i \+ 1/);
  assert.match(renderer, /role="progressbar"/);
  assert.match(renderer, /item\.status !== 'removed'/);
  assert.match(renderer, /operationCard\(\)/);
  assert.match(styles, /operation-fill\.indeterminate/);
  assert.match(renderer, /data-action="stop".*activity\.stop/);
  assert.match(main, /handle\('operation:stop'.*stopRequested=true.*publishOverview\(\)/);
});

test('logout stops an active operation and clears account data and the dedicated TikTok profile', async () => {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const translations = await readFile(new URL('../src/renderer/i18n.js', import.meta.url), 'utf8');
  assert.match(main, /if\(worker\)\{stopRequested=true;flow='Stopping safely before logout…';publishOverview\(\);await worker;\}/);
  assert.match(main, /PRAGMA secure_delete=ON; DELETE FROM reposts; PRAGMA wal_checkpoint\(TRUNCATE\); VACUUM;/);
  assert.match(main, /profile\.clearStorageData\(\)/);
  assert.match(main, /profile\.clearCache\(\)/);
  assert.match(main, /profile\.clearAuthCache\(\)/);
  assert.match(main, /activity=idleActivity\(\);flow='Ready';publishOverview\(\)/);
  assert.match(translations, /all TikTok browser data on this device/);
  assert.match(translations, /كل بيانات تيك توك المحفوظة على هذا الجهاز/);
});

test('dark theme uses readable body and primary action foreground colors', async () => {
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /body \{ color: var\(--text\); \}/);
  assert.match(styles, /body\.dark \{ --on-green: #192d22; --on-danger: #30201d; \}/);
});

test('loaded portrait images are not covered by their visible placeholders', async () => {
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  assert.match(styles, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  assert.match(renderer, /const showImage = \(\) => \{ image\.hidden = false; placeholder\.hidden = true; \}/);
  assert.match(renderer, /src="assets\/developer-portrait\.png"/);
});

test('Arabic layout places the sidebar on the right and groups browser controls', async () => {
  const styles = await readFile(new URL('../src/renderer/styles.css', import.meta.url), 'utf8');
  const renderer = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
  assert.match(styles, /html\[dir="rtl"\] \.app-shell \{ flex-direction: row; \}/);
  assert.doesNotMatch(styles, /flex-direction:\s*row-reverse/);
  assert.match(html, /class="browser-nav-actions"/);
  assert.match(html, /class="browser-primary-actions"/);
  assert.match(renderer, /class="home-activity-grid"/);
});

test('built application exposes no licensing, activation, or quota checks', async () => {
  const main = await readFile(new URL('../dist/main.js', import.meta.url), 'utf8');
  const preload = await readFile(new URL('../dist/preload.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /activeLicense|dailyLimit|maxUsage|membership:request|membership:activate|manager:keygen|manager:issue/);
  assert.doesNotMatch(preload, /membership:|manager:|activationRequest|activateAccount/);
});
