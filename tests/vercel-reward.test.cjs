const test = require('node:test');
const assert = require('node:assert/strict');
const { start, reward, createSessionId, readSession } = require('../reward-api.cjs');

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('Vercel session token is signed, time-checked, and opaque', () => {
  const secret = 'unit-test-only-secret';
  const sessionId = createSessionId(secret, 1000);
  assert.ok(readSession(sessionId, secret, 301000));
  assert.equal(readSession(sessionId, 'wrong-secret', 301000), null);
  assert.equal(readSession(sessionId, secret, 7_202_000), null);
});

test('Vercel routes keep secrets server-side and reuse a stable playId for retries', async () => {
  const oldUrl = process.env.ZERO_ARCADE_API_URL;
  const oldKey = process.env.ZERO_ARCADE_API_KEY;
  const oldFetch = global.fetch;
  const calls = [];
  process.env.ZERO_ARCADE_API_URL = 'https://admin.example.test/api/arcade/rewards';
  process.env.ZERO_ARCADE_API_KEY = 'unit-test-only-secret';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), ...options });
    return Response.json({ coins: 4, qrImageDataUrl: 'data:image/png;base64,YQ==', expiresAt: 1800000000 });
  };
  try {
    const startRes = response();
    await start({ method: 'POST' }, startRes);
    assert.equal(startRes.statusCode, 201);
    const sessionId = startRes.body.sessionId;
    assert.equal(JSON.stringify(startRes.body).includes(process.env.ZERO_ARCADE_API_KEY), false);
    const aged = createSessionId(process.env.ZERO_ARCADE_API_KEY, Date.now() - 300_001);
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = response();
      await reward({ method: 'POST', body: { sessionId: aged, points: 2400 } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.coins, 4);
      assert.equal(res.body.qrImageDataUrl, 'data:image/png;base64,YQ==');
    }
    assert.equal(calls.length, 2);
    assert.deepEqual(JSON.parse(calls[0].body), JSON.parse(calls[1].body));
    assert.equal(calls[0].headers.Authorization, `Bearer ${process.env.ZERO_ARCADE_API_KEY}`);
    assert.equal(calls[0].url, 'https://admin.example.test/api/arcade/rewards');
    assert.equal(readSession(sessionId, process.env.ZERO_ARCADE_API_KEY) !== null, true);
  } finally {
    global.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.ZERO_ARCADE_API_URL; else process.env.ZERO_ARCADE_API_URL = oldUrl;
    if (oldKey === undefined) delete process.env.ZERO_ARCADE_API_KEY; else process.env.ZERO_ARCADE_API_KEY = oldKey;
  }
});
