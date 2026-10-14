const { createHash, createHmac, randomUUID, timingSafeEqual } = require('node:crypto');

const MIN_PLAY_MS = 300_000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_POINTS = 2_147_483_647;

// Keep Vercel logs useful for debugging without ever printing credentials,
// session tokens, play IDs, scores, or QR image data.
function logEvent(level, event, details = {}) {
  try {
    console[level](`[arcade] ${event} ${JSON.stringify(details)}`);
  } catch {}
}

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
}

function createSessionId(secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ issuedAt: now, nonce: randomUUID() })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readSession(sessionId, secret, now = Date.now()) {
  if (typeof sessionId !== 'string' || sessionId.length > 256) return null;
  const [payload, signature, extra] = sessionId.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(parsed.issuedAt) || typeof parsed.nonce !== 'string') return null;
    if (parsed.issuedAt > now + 60_000 || now - parsed.issuedAt > SESSION_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

async function start(req, res) {
  if (req.method !== 'POST') {
    logEvent('warn', 'session_start_failed', { reason: 'method_not_allowed' });
    return reply(res, 405, { error: 'method_not_allowed' });
  }
  const key = process.env.ZERO_ARCADE_API_KEY;
  if (!key) {
    logEvent('error', 'session_start_failed', { reason: 'missing_api_key' });
    return reply(res, 503, { error: 'rewards_unavailable', message: '報酬サーバーの設定がありません。' });
  }
  try {
    const sessionId = createSessionId(key);
    logEvent('info', 'session_start_ok');
    return reply(res, 201, { sessionId });
  } catch {
    logEvent('error', 'session_start_failed', { reason: 'session_creation_error' });
    return reply(res, 500, { error: 'session_unavailable', message: 'プレイを開始できませんでした。' });
  }
}

async function reward(req, res) {
  if (req.method !== 'POST') {
    logEvent('warn', 'reward_failed', { reason: 'method_not_allowed' });
    return reply(res, 405, { error: 'method_not_allowed' });
  }
  const apiUrl = process.env.ZERO_ARCADE_API_URL;
  const apiKey = process.env.ZERO_ARCADE_API_KEY;
  if (!apiUrl || !apiKey) {
    logEvent('error', 'reward_failed', { reason: 'missing_environment', hasApiUrl: Boolean(apiUrl), hasApiKey: Boolean(apiKey) });
    return reply(res, 503, { error: 'rewards_unavailable', message: '報酬サーバーの設定がありません。' });
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const session = readSession(body.sessionId, apiKey);
  if (!session) {
    logEvent('warn', 'reward_failed', { reason: 'invalid_session' });
    return reply(res, 401, { error: 'invalid_session', message: 'プレイ情報が無効か、有効期限が切れています。' });
  }
  const elapsedMs = Date.now() - session.issuedAt;
  if (elapsedMs < MIN_PLAY_MS) {
    logEvent('warn', 'reward_failed', { reason: 'play_not_finished', elapsedMs });
    return reply(res, 409, { error: 'play_not_finished', message: 'プレイ時間が完了していません。' });
  }
  if (!Number.isInteger(body.points) || body.points < 0 || body.points > MAX_POINTS) {
    logEvent('warn', 'reward_failed', { reason: 'invalid_points' });
    return reply(res, 400, { error: 'invalid_points', message: '送信された結果を確認できません。' });
  }
  let target;
  try {
    target = new URL(apiUrl);
    if (target.protocol !== 'https:') throw new Error('HTTPS required');
  } catch {
    logEvent('error', 'reward_failed', { reason: 'invalid_api_url' });
    return reply(res, 503, { error: 'rewards_unavailable', message: '報酬サーバーの設定を確認できません。' });
  }
  const playId = `hanbai-${createHash('sha256').update(body.sessionId).digest('hex').slice(0, 48)}`;
  try {
    logEvent('info', 'reward_upstream_request');
    const response = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ playId, points: body.points }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      logEvent('error', 'reward_upstream_http_error', { status: response.status });
      return reply(res, 502, { error: 'reward_request_failed', message: 'QRを発行できませんでした。時間をおいて同じ結果で再試行してください。' });
    }
    const data = await response.json();
    if (!Number.isInteger(data?.coins) || data.coins < 0 || (data.coins > 0 && (typeof data.qrImageDataUrl !== 'string' || !data.qrImageDataUrl.startsWith('data:image/')))) {
      logEvent('error', 'reward_failed', { reason: 'invalid_upstream_response', hasIntegerCoins: Number.isInteger(data?.coins), hasImageData: typeof data?.qrImageDataUrl === 'string' });
      return reply(res, 502, { error: 'invalid_reward_response', message: '報酬サーバーの応答を確認できませんでした。' });
    }
    logEvent('info', 'reward_success', { coins: data.coins, hasQr: data.coins > 0 });
    return reply(res, 200, {
      coins: data.coins,
      qrImageDataUrl: data.coins > 0 ? data.qrImageDataUrl : '',
      ...(Number.isFinite(data.expiresAt) ? { expiresAt: data.expiresAt } : {}),
    });
  } catch (error) {
    logEvent('error', 'reward_upstream_exception', { errorName: typeof error?.name === 'string' ? error.name : 'UnknownError' });
    return reply(res, 502, { error: 'reward_request_failed', message: 'QRを発行できませんでした。通信を確認して同じ結果で再試行してください。' });
  }
}

module.exports = { createSessionId, readSession, start, reward };
