import assert from 'node:assert/strict';
import test from 'node:test';
import { PairingError, readPairingResponse } from '../src/pairingClient.mjs';

const token = 'a'.repeat(64);
const response = (status, body) => new globalThis.Response(JSON.stringify(body), { status });

test('accepts the Worker pairing success schema and its 64-character token', async () => {
  assert.deepEqual(await readPairingResponse(response(200, { ok: true, token, dailyLimit: 1000 })), { token, dailyLimit: 1000 });
});

test('maps invalid, expired, and reused codes to clear client errors', async () => {
  for (const [status, errorCode, key] of [[400, 'invalid_code', 'pairingInvalid'], [400, 'expired_code', 'pairingExpired'], [409, 'already_used', 'pairingUsed']]) {
    await assert.rejects(readPairingResponse(response(status, { ok: false, errorCode })), (error) => error instanceof PairingError && error.key === key);
  }
});

test('rejects malformed responses and successful responses without a valid token', async () => {
  await assert.rejects(readPairingResponse(new globalThis.Response('', { status: 502 })), (error) => error.key === 'workerError');
  await assert.rejects(readPairingResponse(response(200, { ok: true, token: 'short' })), (error) => error.key === 'workerError');
});
