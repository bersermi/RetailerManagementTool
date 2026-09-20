// ============================================================================
// THE INSTRUMENT FOR `5c.5` — a refresh whose REPLY is lost, driven through a
// REAL `@supabase/supabase-js` client over a proxy that genuinely destroys the
// socket after the server has committed the rotation.
//
// ⚠️⚠️ THE PROXY READS THE UPSTREAM RESPONSE TO COMPLETION BEFORE KILLING THE
// SOCKET, AND THAT IS THE WHOLE DESIGN. If it killed the connection early the
// server might never rotate, and the test would be measuring a lost REQUEST —
// which is the easy case nobody was worried about. The case `5c.5` exists for
// is the one where the server HAS issued a new token and the phone never
// receives it, so the phone retries a token the server has already spent.
//
// ⚠️ IT ALSO KEEPS THE TOKEN IT THREW AWAY. That is the evidence for the
// central assertion: the client must end up holding EXACTLY the token whose
// delivery failed, not a fresh one off a new chain.
//
// Emits one JSON object per line on stdout. The bash check is what judges them.
// ============================================================================

import http from 'node:http';
import { createRequire } from 'node:module';

// ⚠️ RESOLVED FROM THE REPO ROOT: ESM ignores NODE_PATH, this runs from a temp
// directory, and `@supabase/supabase-js` is hoisted to the workspace root
// rather than into `app/node_modules`.
const require = createRequire(process.env.REPO_ROOT + '/package.json');
const { createClient } = require('@supabase/supabase-js');

const UPSTREAM = new URL(process.env.API_URL);
const KEY = process.env.SB_KEY;
// How long the outage lasts. It must exceed auth-js's in-call retry budget
// (AUTO_REFRESH_TICK_DURATION_MS, 30s) or `refreshSession()` simply heals
// itself and nothing about a real outage has been measured.
const OUTAGE_S = Number(process.env.OUTAGE_S || '33');
// `auth-js`'s REFRESH_FAILURE_COOLDOWN_MS, in seconds: 2 * AUTO_REFRESH_TICK.
// Read from the library rather than typed, so a version bump moves this too.
const COOLDOWN_S =
  require('@supabase/auth-js/dist/main/lib/constants.js').REFRESH_FAILURE_COOLDOWN_MS / 1000;

const say = (o) => console.log(JSON.stringify(o));

let outage = false;          // while true, every refresh call is broken
let mintedDuringLoss = null; // the token the client was never given
let dropped = 0, refreshAttempts = 0;

const proxy = http.createServer((creq, cres) => {
  const chunks = [];
  creq.on('data', (c) => chunks.push(c));
  creq.on('end', () => {
    const body = Buffer.concat(chunks);
    const isRefresh = creq.url.includes('grant_type=refresh_token');
    if (isRefresh) refreshAttempts++;

    // ⚠️ ONLY THE FIRST REFRESH OF THE OUTAGE REACHES THE SERVER. The rest are
    // killed before they are sent, which is what a dead connection is — if
    // every attempt reached the server, the later ones would be genuine
    // replays and this would be measuring a different question entirely.
    if (isRefresh && outage && dropped > 0) { creq.socket.destroy(); return; }

    const headers = { ...creq.headers, host: UPSTREAM.host };
    const ureq = http.request(
      { hostname: UPSTREAM.hostname, port: UPSTREAM.port, path: creq.url, method: creq.method, headers },
      (ures) => {
        const out = [];
        ures.on('data', (c) => out.push(c));
        ures.on('end', () => {
          const raw = Buffer.concat(out);
          if (isRefresh && outage && dropped === 0) {
            dropped++;
            try { mintedDuringLoss = JSON.parse(raw.toString()).refresh_token ?? null; } catch { }
            creq.socket.destroy();     // the reply dies here, rotation already committed
            return;
          }
          cres.writeHead(ures.statusCode, ures.headers);
          cres.end(raw);
        });
      },
    );
    ureq.on('error', () => { try { cres.writeHead(502); cres.end('{}'); } catch { } });
    if (body.length) ureq.write(body);
    ureq.end();
  });
});

const port = await new Promise((r) => proxy.listen(0, '127.0.0.1', () => r(proxy.address().port)));

const mem = new Map();
const storage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => void mem.set(k, v),
  removeItem: (k) => void mem.delete(k),
};

const sb = createClient(`http://127.0.0.1:${port}`, KEY, {
  // ⚠️ `autoRefreshToken: false` so the 30-second ticker cannot fire a refresh
  // this script did not ask for. The ticker is real and is what the app uses;
  // here it would make the reading non-deterministic.
  auth: { storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
});

const email = `refresh-loss-${process.pid}-${Date.now()}@example.com`;
const { data: up, error: uerr } = await sb.auth.signUp({ email, password: 'refresh-loss-123' });
if (uerr || !up.session) { say({ step: 'setup', ok: false, error: uerr?.message ?? 'no session' }); process.exit(1); }
const R1 = up.session.refresh_token;
const USER = up.session.user.id;
say({ step: 'setup', ok: true, user: USER });

// ---- the outage: the reply to the first refresh is lost, and it stays down --
outage = true;
const t0 = Date.now();
const lost = await sb.auth.refreshSession();
const inCallSeconds = (Date.now() - t0) / 1000;
const held = (await sb.auth.getSession()).data.session;

say({
  step: 'lost-reply',
  dropped,
  refresh_attempts: refreshAttempts,
  server_minted_a_token: !!mintedDuringLoss && mintedDuringLoss !== R1,
  error_name: lost.error?.name ?? null,
  client_signed_out: !held,
  client_still_holds_R1: held?.refresh_token === R1,
  in_call_retry_seconds: Number(inCallSeconds.toFixed(1)),
});

// ---- the connection comes back, but the CLIENT is still holding a grudge ---
// ⚠️⚠️ THE THIRD MECHANISM, AND IT WAS FOUND BY RUNNING THIS RATHER THAN BY
// READING IT. `auth-js` caches a failed refresh for REFRESH_FAILURE_COOLDOWN_MS
// (60s, two auto-refresh ticks) keyed on the refresh token, and serves that
// cached failure to every caller inside the window WITHOUT touching the
// network. So a shop whose signal returns after 30 seconds does not recover at
// 30 seconds — it recovers when the cooldown lapses. Measured, not assumed:
// the attempt counter must not move.
const midOutage = OUTAGE_S - inCallSeconds;
if (midOutage > 0) await new Promise((r) => setTimeout(r, midOutage * 1000));
outage = false;
const attemptsBeforeEarly = refreshAttempts;
const early = await sb.auth.refreshSession();
say({
  step: 'early-retry',
  gap_seconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
  ok: !early.error,
  error: early.error?.message ?? null,
  went_to_the_network: refreshAttempts > attemptsBeforeEarly,
  still_signed_in: !!(await sb.auth.getSession()).data.session,
});

// ---- past the cooldown: the real retry -------------------------------------
// ⚠️ THE COOLDOWN STARTS WHEN THE FAILURE IS CACHED — at the END of the
// in-call retry loop, not when the outage began. Measured the other way first
// and the retry was still being served from cache at 63s.
const untilCooldown = inCallSeconds + COOLDOWN_S + 3 - (Date.now() - t0) / 1000;
if (untilCooldown > 0) await new Promise((r) => setTimeout(r, untilCooldown * 1000));
const attemptsBeforeRetry = refreshAttempts;
const gap = (Date.now() - t0) / 1000;

const retry = await sb.auth.refreshSession();
const after = (await sb.auth.getSession()).data.session;
const { data: who, error: werr } = await sb.auth.getUser();

say({
  step: 'retry',
  gap_seconds: Number(gap.toFixed(1)),
  went_to_the_network: refreshAttempts > attemptsBeforeRetry,
  retry_ok: !retry.error,
  retry_error: retry.error?.message ?? null,
  landed_on_the_lost_token: !!after && !!mintedDuringLoss && after.refresh_token === mintedDuringLoss,
  still_signed_in: !!who?.user && !werr && who.user.id === USER,
});

proxy.close();
process.exit(0);
