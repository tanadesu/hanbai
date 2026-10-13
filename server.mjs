import { createServer as createHttpServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
const SESSION_TTL_MS = 60 * 60 * 1000;
const MIN_PLAY_MS = 300_000;
const MAX_POINTS = 2_147_483_647;

export function createRewardRelay({ apiUrl, apiKey, fetchImpl = fetch, now = Date.now, minPlayMs = MIN_PLAY_MS } = {}) {
  const sessions = new Map();
  function prune() {
    const cutoff = now() - SESSION_TTL_MS;
    for (const [id, session] of sessions) if (session.createdAt < cutoff && !session.inFlight) sessions.delete(id);
    while (sessions.size > 10_000) sessions.delete(sessions.keys().next().value);
  }
  return {
    start() {
      prune();
      const sessionId = randomUUID();
      sessions.set(sessionId, { createdAt: now(), startedAt: now(), points: null, result: null, inFlight: null });
      return { sessionId };
    },
    async reward({ sessionId, points }) {
      prune();
      if (typeof sessionId !== 'string' || sessionId.length > 64 || !Number.isInteger(points) || points < 0 || points > MAX_POINTS) {
        return { status: 400, body: { error: 'invalid_request', message: '送信内容を確認してください。' } };
      }
      const session = sessions.get(sessionId);
      if (!session) return { status: 404, body: { error: 'session_not_found', message: 'プレイ情報が見つかりません。' } };
      if (now() - session.startedAt < minPlayMs) return { status: 409, body: { error: 'play_not_finished', message: 'プレイ時間が完了していません。' } };
      if (session.points !== null && session.points !== points) return { status: 409, body: { error: 'score_mismatch', message: 'このプレイの結果はすでに確定しています。' } };
      if (session.result) return { status: 200, body: session.result };
      if (session.inFlight) return session.inFlight;
      if (!apiUrl || !apiKey) return { status: 503, body: { error: 'rewards_unavailable', message: '報酬サーバーの設定がありません。' } };
      let target;
      try {
        target = new URL(apiUrl);
        if (target.protocol !== 'https:') throw new Error('https required');
      } catch {
        return { status: 503, body: { error: 'rewards_unavailable', message: '報酬サーバーの設定を確認できません。' } };
      }
      session.points = points;
      const playId = `hanbai-${sessionId}`;
      const request = (async () => {
        try {
          const response = await fetchImpl(target, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ playId, points }),
            signal: AbortSignal.timeout(12_000),
          });
          if (!response.ok) return { status: 502, body: { error: 'reward_request_failed', message: 'QRを発行できませんでした。時間をおいて再試行してください。' } };
          const data = await response.json();
          if (!Number.isInteger(data?.coins) || data.coins < 0 || (data.coins > 0 && (typeof data.qrImageDataUrl !== 'string' || !data.qrImageDataUrl.startsWith('data:image/')))) {
            return { status: 502, body: { error: 'invalid_reward_response', message: '報酬サーバーの応答を確認できませんでした。' } };
          }
          const result = { coins: data.coins, qrImageDataUrl: data.coins > 0 ? data.qrImageDataUrl : '', ...(Number.isFinite(data.expiresAt) ? { expiresAt: data.expiresAt } : {}) };
          session.result = result;
          return { status: 200, body: result };
        } catch {
          return { status: 502, body: { error: 'reward_request_failed', message: 'QRを発行できませんでした。通信を確認して再試行してください。' } };
        } finally {
          session.inFlight = null;
        }
      })();
      session.inFlight = request;
      return request;
    },
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error('request too large');
  }
  return JSON.parse(raw || '{}');
}

export function createAppServer({ apiUrl = process.env.ZERO_ARCADE_API_URL, apiKey = process.env.ZERO_ARCADE_API_KEY, fetchImpl = fetch, now, minPlayMs } = {}) {
  const relay = createRewardRelay({ apiUrl, apiKey, fetchImpl, now, minPlayMs });
  return createHttpServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    if (request.method === 'POST' && (url.pathname === '/api/session/start' || url.pathname === '/api/reward')) {
      try {
        const body = await readJson(request);
        if (url.pathname === '/api/session/start') return sendJson(response, 201, relay.start());
        const result = await relay.reward(body);
        return sendJson(response, result.status, result.body);
      } catch {
        return sendJson(response, 400, { error: 'invalid_json', message: '送信内容を読み取れませんでした。' });
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'method_not_allowed' });
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { response.writeHead(400).end(); return; }
    if (pathname.split('/').some(part => part.startsWith('.')) || ['/server.mjs', '/package.json'].includes(pathname)) { response.writeHead(404).end(); return; }
    const file = path.resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${ROOT}${path.sep}`)) { response.writeHead(404).end(); return; }
    try {
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
      response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
      if (request.method === 'HEAD') response.end(); else createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createAppServer();
  const port = Number(process.env.PORT) || 4173;
  server.listen(port, '0.0.0.0', () => process.stdout.write(`READ THE CROWD listening on port ${port}\n`));
}
