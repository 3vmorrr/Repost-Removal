import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { messages, t } = require('../src/renderer/i18n.js');

test('every renderer translation key has English and Arabic text', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.ar).sort());
  for (const table of [messages.en, messages.ar]) {
    for (const value of Object.values(table)) assert.equal(typeof value, 'string');
  }
});

test('translations default safely and substitute values in both languages', () => {
  assert.equal(t('invalid', 'app.title'), messages.en['app.title']);
  assert.equal(t('ar', 'nav.developer'), 'عن المطوّر');
  assert.equal(t('en', 'home.sessionIn', { handle: 'omar' }), 'Connected as @omar');
  assert.match(t('ar', 'home.sessionIn', { handle: 'omar' }), /@omar/);
});

test('document navigation and pages expose RTL direction and page language', async () => {
  const renderer = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
  assert.match(html, /data-page="developer"/);
  assert.match(html, /data-page="memorial"/);
  assert.match(renderer, /document\.documentElement\.dir = language === 'ar' \? 'rtl' : 'ltr'/);
  assert.match(renderer, /dir="\$\{data\.language === 'ar' \? 'rtl' : 'ltr'\}"/);
});

test('memorial remains Arabic and right-to-left regardless of application language', async () => {
  const renderer = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
  const memorial = renderer.slice(renderer.indexOf('function memorialPage()'), renderer.indexOf('function bindPortrait'));
  assert.match(html, /<button data-page="memorial"[^>]*>[\s\S]*?<span>صدقة جارية<\/span>/);
  assert.match(renderer, /page === 'memorial' \? 'صدقة جارية'/);
  assert.match(memorial, /lang="ar" dir="rtl"/);
  assert.match(memorial, /صدقة جارية على أرواح موتانا/);
  assert.match(memorial, /اللهم اغفر له وارحمه/);
  assert.doesNotMatch(memorial, /data\.language|tr\('memorial\./);
});
