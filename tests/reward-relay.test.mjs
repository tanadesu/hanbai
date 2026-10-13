import test from 'node:test';
import assert from 'node:assert/strict';
import { createRewardRelay } from '../server.mjs';

test('rejects early/invalid results and forwards only server-side credentials', async () => {
  let now = 1000;
  const calls = [];
  const relay = createRewardRelay({ apiUrl: 'https://admin.example.test/api/arcade/rewards', apiKey: 'test-only-secret', now: () => now, fetchImpl: async (url, options) => {
    calls.push({ url: String(url), ...options });
    return Response.json({ coins: 7, qrImageDataUrl: 'data:image/png;base64,aGVsbG8=', expiresAt: 1800000000 });
  } });
  const { sessionId } = relay.start();
  assert.equal((await relay.reward({ sessionId, points: 250 })).status, 409);
  now += 300_000;
  assert.equal((await relay.reward({ sessionId, points: 1.5 })).status, 400);
  const result = await relay.reward({ sessionId, points: 250 });
  assert.deepEqual(result, { status: 200, body: { coins: 7, qrImageDataUrl: 'data:image/png;base64,aGVsbG8=', expiresAt: 1800000000 } });
  assert.deepEqual(await relay.reward({ sessionId, points: 250 }), result);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://admin.example.test/api/arcade/rewards');
  assert.equal(calls[0].headers.Authorization, 'Bearer test-only-secret');
  assert.deepEqual(JSON.parse(calls[0].body), { playId: `hanbai-${sessionId}`, points: 250 });
  assert.equal((await relay.reward({ sessionId, points: 251 })).status, 409);
});

test('upstream retry reuses the same playId and points; zero coins have no QR', async () => {
  let now = 0;
  const calls = [];
  const relay = createRewardRelay({ apiUrl: 'https://admin.example.test/api/arcade/rewards', apiKey: 'test-only-secret', now: () => now, fetchImpl: async (_url, options) => {
    calls.push(JSON.parse(options.body));
    if (calls.length === 1) throw new Error('temporary network error');
    return Response.json({ coins: 0, qrImageDataUrl: null });
  } });
  const { sessionId } = relay.start();
  now = 300_000;
  assert.equal((await relay.reward({ sessionId, points: 0 })).status, 502);
  assert.deepEqual(await relay.reward({ sessionId, points: 0 }), { status: 200, body: { coins: 0, qrImageDataUrl: '' } });
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].playId, `hanbai-${sessionId}`);
});

test('unconfigured reward endpoint fails safely without any credential in the result', async () => {
  let now = 0;
  const relay = createRewardRelay({ apiUrl: '', apiKey: '', now: () => now, minPlayMs: 0 });
  const { sessionId } = relay.start();
  assert.deepEqual(await relay.reward({ sessionId, points: 0 }), { status: 503, body: { error: 'rewards_unavailable', message: '報酬サーバーの設定がありません。' } });
});
