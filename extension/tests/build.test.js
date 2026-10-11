import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('built manifest stays MV3 and narrowly scoped to TikTok', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage', 'scripting', 'alarms']);
  assert.deepEqual(manifest.host_permissions, ['https://www.tiktok.com/*']);
  assert.deepEqual(manifest.content_scripts[0].matches, ['https://www.tiktok.com/*']);
  assert.equal(manifest.homepage_url, 'https://github.com/yiitxyz/tiktokRepostRemover');
  assert.equal(manifest.icons['128'], 'icons/icon-128.png');
  assert.equal(manifest.version, '2.2.0');
});

test('Firefox target uses a Firefox-compatible background script manifest', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/firefox/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.background, { scripts: ['background.js'] });
  assert.equal(manifest.browser_specific_settings.gecko.id, 'repost-remover@omarebrahim1');
  assert.equal(manifest.browser_specific_settings.gecko_android.strict_min_version, '128.0');
  await readFile(new URL('../dist/firefox/background.js', import.meta.url));
});

test('freshly discovered reposts are unselected until the user chooses them', async () => {
  const storage = await readFile(new URL('../src/storage.ts', import.meta.url), 'utf8');
  assert.match(storage, /selected: false/);
});

test('content script has separate collection, deletion, and verification paths', async () => {
  const [script, source] = await Promise.all([
    readFile(new URL('../dist/content.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/content.ts', import.meta.url), 'utf8')
  ]);
  assert.match(script, /\/api\/repost\/item_list\//);
  assert.match(script, /\/tiktok\/v1\/upvote\/delete/);
  assert.match(source, /REQUESTED_PAGE_SIZE = 50/);
  assert.match(source, /FALLBACK_PAGE_SIZE = 30/);
  assert.match(source, /error\.status !== 400/);
  assert.match(source, /randomBetween\(20, 25\)/);
  assert.match(source, /randomBetween\(1_500, 3_000\)/);
  assert.match(source, /randomBetween\(45_000, 90_000\)/);
  assert.match(source, /page >= pageLimit/);
  assert.match(source, /VERIFY_PROGRESS/);
  assert.match(script, /count:String\(/);
  assert.match(script, /verification start/);
  assert.match(script, /safety shutdown/);
  assert.match(script, /TikTok Repost Remover/);
});

test('review page exposes persistent selection and deletion controls', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../dist/review.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/review.js', import.meta.url), 'utf8')
  ]);
  for (const id of ['all', 'none', 'invert', 'delete', 'pause', 'resume', 'stop', 'retry']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(script, /indexedDB/);
  assert.match(script, /deleteConfirm/);
  assert.doesNotMatch(html, /<script[^>]*>\s*[^<]/);
});

test('all declared extension files exist after build', async () => {
  await Promise.all(['background.js', 'content.js', 'popup.js', 'popup.html', 'popup.css', 'options.js', 'options.html', 'options.css', 'review.js', 'review.html', 'review.css', 'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png']
    .map((file) => readFile(new URL(`../dist/${file}`, import.meta.url))));
});

test('large review lists are read in bounded pages and timers do not repaint the full list', async () => {
  const [review, storage] = await Promise.all([
    readFile(new URL('../src/review.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/storage.ts', import.meta.url), 'utf8')
  ]);
  assert.match(review, /getItemsPage\(/);
  assert.match(review, /setInterval\(\(\) => renderTimer\(\)/);
  assert.match(storage, /export async function getItemsPage/);
  assert.match(storage, /export async function counts/);
});

test('popup exposes scan, stop, and review without inline scripts', async () => {
  const html = await readFile(new URL('../dist/popup.html', import.meta.url), 'utf8');
  assert.match(html, /id="scan"/);
  assert.match(html, /id="stop-scan"/);
  assert.match(html, /id="review"/);
  assert.doesNotMatch(html, /<script[^>]*>\s*[^<]/);
});

test('Arabic localization and distinct operating modes are included in the built extension', async () => {
  const [popup, review, options, background, content] = await Promise.all([
    readFile(new URL('../dist/popup.js', import.meta.url), 'utf8'),
    readFile(new URL('../dist/review.js', import.meta.url), 'utf8'),
    readFile(new URL('../dist/options.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/background.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/content.ts', import.meta.url), 'utf8')
  ]);
  assert.ok(popup.includes('\\u0627'));
  assert.ok(review.includes('\\u0645'));
  assert.ok(options.includes('\\u0627'));
  assert.match(background, /operatingMode === 'telegram'/);
  assert.match(content, /mode === 'telegram'/);
});

test('pairing code is parsed and Worker responses provide actionable error states', async () => {
  const [options, client] = await Promise.all([
    readFile(new URL('../dist/options.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/pairingClient.mjs', import.meta.url), 'utf8')
  ]);
  assert.match(options, /\/api\/extension\/pair/);
  assert.match(client, /pairingExpired/);
  assert.match(client, /pairingUsed/);
  assert.match(client, /pairingInvalid/);
});
