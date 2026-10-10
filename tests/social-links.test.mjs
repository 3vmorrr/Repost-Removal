import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SOCIAL_LINKS, socialLinkFor } from '../dist/social-links.js';

test('social links preserve the supplied destinations and LinkedIn query parameters', () => {
  assert.deepEqual(SOCIAL_LINKS, {
    instagram: 'https://instagram.com/z.3morr',
    facebook: 'https://www.facebook.com/share/186DF9U1PM/?mibextid=wwXIfr',
    whatsapp: 'https://wa.me/201026866840',
    linkedin: 'https://www.linkedin.com/in/omar-ebrahim-6a94903a2?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
    youtube: 'https://www.youtube.com/@3vmorr',
    telegram: 'https://t.me/omarebrahim1'
  });
  const linkedIn = new URL(SOCIAL_LINKS.linkedin);
  assert.equal(linkedIn.searchParams.get('utm_source'), 'share_via');
  assert.equal(linkedIn.searchParams.get('utm_content'), 'profile');
  assert.equal(linkedIn.searchParams.get('utm_medium'), 'member_ios');
  assert.equal(new URL(SOCIAL_LINKS.whatsapp).pathname, '/201026866840');
});

test('the profile renders one keyboard-accessible card per allowlisted social platform', async () => {
  const renderer = await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8');
  const platforms = [...renderer.matchAll(/platform: '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(platforms, Object.keys(SOCIAL_LINKS));
  assert.match(renderer, /aria-label="\$\{tr\('developer\.openLabel', \{ platform: label \}\)\}"/);
  assert.match(renderer, /data-social="\$\{link\.platform\}"/);
  assert.match(renderer, /app\.openSocial, social\.dataset\.social/);
});

test('social IPC resolves only allowlisted platforms', () => {
  for (const [platform, url] of Object.entries(SOCIAL_LINKS)) assert.equal(socialLinkFor(platform), url);
  for (const invalid of ['twitter', 'https://attacker.example', null, '__proto__']) {
    assert.throws(() => socialLinkFor(invalid), /Unsupported social link/);
  }
});
