import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyTikTokSession } from '../dist/session-state.js';

test('reports a signed-in session only with both stable TikTok identity fields', () => {
  assert.deepEqual(classifyTikTokSession({ secUid: 'stable-user-id', handle: 'omar' }), {
    status: 'logged-in', handle: 'omar', stableId: 'stable-user-id'
  });
  assert.equal(classifyTikTokSession({ secUid: 'stable-user-id' }).status, 'unknown');
  assert.equal(classifyTikTokSession({ handle: 'omar' }).status, 'unknown');
});

test('reports signed out only on a positive logged-out signal', () => {
  assert.deepEqual(classifyTikTokSession({ loggedOutSignal: true }), {
    status: 'logged-out', handle: null, stableId: null
  });
  assert.equal(classifyTikTokSession({ loggedOutSignal: false }).status, 'unknown');
  assert.equal(classifyTikTokSession(null).status, 'unknown');
});
