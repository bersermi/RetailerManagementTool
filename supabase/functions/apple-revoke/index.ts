// ============================================================================
// apple-revoke — tells Apple that a person who signed in with Apple has left
// ============================================================================
// docs/PLAN.md task `5R-k`. ADR-035's amendment of 2026-10-13. The owner's
// ruling of that day: *a small function, nothing stored*.
//
// ⚠️⚠️ THIS IS THE ONLY SERVER-SIDE CODE IN THIS SYSTEM THAT IS NOT POSTGRES,
// AND IT EXISTS FOR ONE REASON. Apple asks an app that offers Sign in with
// Apple to revoke the person's tokens when they delete their account
// (developer.apple.com/support/offering-account-deletion-in-your-app, and
// technote TN3194). The revoke call is signed with a PRIVATE KEY from the
// owner's developer account, and a key cannot ship inside an app. Supabase's
// auth server does not make the call (supabase/auth#1308, closed not planned).
//
// WHAT IT DOES, in one request and with nothing kept:
//   1. asks Supabase's auth server who the caller is (the caller's own token);
//   2. finds that login's Apple link — its Apple user id, the `sub`;
//   3. trades the authorization code the phone just got from Apple's sheet for
//      a refresh token (POST /auth/token);
//   4. checks the code belongs to THAT Apple account, and not another one that
//      happened to be signed in on the phone;
//   5. revokes the refresh token (POST /auth/revoke).
//
// ⚠️ IT STORES NOTHING AND LOGS NO SECRET. No table, no file. The code, the
// tokens Apple returns and the client secret live for the length of the
// request; a log line names a step and a status and nothing else.
//
// ⚠️ IT DOES NOT DELETE THE ACCOUNT. `delete_my_account` (`0053`) is still the
// one deletion path, called by the app straight after this, whatever this
// answered. A deletion is never refused because Apple could not be reached.
//
// ⚠️ `verify_jwt` IS OFF FOR THIS FUNCTION (`supabase/config.toml`), ON
// PURPOSE. The gateway's check reads a signature only, so it would admit the
// token of an account deleted an hour ago; step 1 asks the auth server, which
// does not. It also lets `GET` answer without a session, which is how
// `docs/checks/5R-k-function-deployed.sh` reads what is deployed.
//
// ⚠️ NO IMPORTS. Web-standard `fetch` and `crypto.subtle` only, so there is no
// dependency to pin, audit or have fail to download on a cold start.
//
// SECRETS — set by the owner, never committed (`supabase secrets set`):
//   APPLE_TEAM_ID       the developer team, ten characters
//   APPLE_KEY_ID        the id of the Sign in with Apple key, ten characters
//   APPLE_PRIVATE_KEY   the contents of that key's .p8 file
// And two with defaults: APPLE_CLIENT_ID (the bundle id) and APPLE_BASE_URL,
// which only `docs/checks/5R-k-apple-revoke-contract.sh` sets, to a stand-in.
// ============================================================================

/**
 * ⚠️ RAISE THIS WITH EVERY CHANGE TO THIS FILE. `GET` reports it, and
 * `5R-k-function-deployed.sh` compares what is deployed with what is merged:
 * merging is not deploying, here as for a migration.
 */
export const BUILD = 1;

const APPLE = 'https://appleid.apple.com';
const DEFAULT_CLIENT_ID = 'mx.wera.app';
/** Apple accepts a client secret for up to six months; this one lives five minutes. */
const SECRET_SECONDS = 300;
const APPLE_TIMEOUT_MS = 8000;

type Env = (name: string) => string | undefined;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * The .p8 file's contents, as key bytes. ⚠️ FORGIVING ABOUT HOW IT WAS PASTED:
 * with its two marker lines or without, with real line breaks or with the two
 * characters `\n` a shell or a dashboard may have left in their place.
 */
function pkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
  return fromBase64(body);
}

/** Apple's client secret: a short-lived ES256 token signed with the owner's key. */
async function clientSecret(env: Env, clientId: string, now: number): Promise<string> {
  const header = { alg: 'ES256', kid: env('APPLE_KEY_ID'), typ: 'JWT' };
  const claims = {
    iss: env('APPLE_TEAM_ID'),
    iat: now,
    exp: now + SECRET_SECONDS,
    // ⚠️ ALWAYS APPLE, even when the calls go to the check's stand-in.
    aud: APPLE,
    sub: clientId,
  };
  const encoder = new TextEncoder();
  const signing = `${base64url(encoder.encode(JSON.stringify(header)))}.${base64url(
    encoder.encode(JSON.stringify(claims)),
  )}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8(env('APPLE_PRIVATE_KEY') ?? ''),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  // WebCrypto signs ECDSA as r‖s, which is the form a JWT carries.
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(signing),
  );
  return `${signing}.${base64url(new Uint8Array(signature))}`;
}

function configured(env: Env): boolean {
  return ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'].every(
    (name) => (env(name) ?? '').trim() !== '',
  );
}

/** The `sub` of a token Apple just returned over TLS. Read, not verified: it never left that reply. */
function subjectOf(idToken: unknown): string | null {
  if (typeof idToken !== 'string') return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(fromBase64(parts[1])));
    return typeof claims.sub === 'string' && claims.sub !== '' ? claims.sub : null;
  } catch {
    return null;
  }
}

/** The Apple user id on this login, or `null` when it has no Apple link. */
function appleSubjectOf(user: unknown): string | null {
  const identities = (user as { identities?: unknown } | null)?.identities;
  if (!Array.isArray(identities)) return null;
  for (const identity of identities) {
    if (identity?.provider !== 'apple') continue;
    const sub = identity?.identity_data?.sub ?? identity?.id;
    if (typeof sub === 'string' && sub !== '') return sub;
  }
  return null;
}

function form(fields: Record<string, string>): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
    signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
  };
}

export async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    return json(200, { function: 'apple-revoke', build: BUILD, configured: configured(env) });
  }
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // 1. Who is asking. The auth server decides, not this function.
  const authorization = request.headers.get('authorization') ?? '';
  if (!/^Bearer \S+$/.test(authorization)) return json(401, { error: 'not_signed_in' });
  const apikey = request.headers.get('apikey') ?? env('SUPABASE_ANON_KEY') ?? '';
  let user: unknown;
  try {
    const reply = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
      headers: { authorization, apikey },
      signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
    });
    if (!reply.ok) return json(401, { error: 'not_signed_in' });
    user = await reply.json();
  } catch {
    return json(502, { error: 'auth_unreachable' });
  }

  let code: unknown;
  try {
    code = ((await request.json()) as { code?: unknown } | null)?.code;
  } catch {
    code = undefined;
  }
  if (typeof code !== 'string' || code.trim() === '') return json(400, { error: 'bad_request' });

  // 2. The login's Apple link.
  const expected = appleSubjectOf(user);
  if (expected === null) return json(409, { error: 'no_apple_link' });

  if (!configured(env)) {
    console.error('[apple-revoke] a secret is missing: nothing was sent to Apple');
    return json(503, { error: 'not_configured' });
  }

  const base = (env('APPLE_BASE_URL') ?? APPLE).replace(/\/+$/, '');
  const clientId = env('APPLE_CLIENT_ID') ?? DEFAULT_CLIENT_ID;
  let secret: string;
  try {
    secret = await clientSecret(env, clientId, Math.floor(Date.now() / 1000));
  } catch {
    console.error('[apple-revoke] the private key could not be read: nothing was sent to Apple');
    return json(503, { error: 'not_configured' });
  }

  try {
    // 3. The code, traded once. It is single use and five minutes old at most.
    const traded = await fetch(
      `${base}/auth/token`,
      form({
        client_id: clientId,
        client_secret: secret,
        code,
        grant_type: 'authorization_code',
      }),
    );
    if (!traded.ok) {
      console.error(`[apple-revoke] apple refused the code: ${traded.status}`);
      return json(502, { error: 'apple_refused', step: 'token', status: traded.status });
    }
    const tokens = (await traded.json()) as { refresh_token?: unknown; id_token?: unknown };
    if (typeof tokens.refresh_token !== 'string' || tokens.refresh_token === '') {
      console.error('[apple-revoke] apple returned no refresh token');
      return json(502, { error: 'apple_refused', step: 'token', status: traded.status });
    }

    // 4. ⚠️ WHOSE CODE IT IS. The sheet answers for whichever Apple account is
    // signed in on the phone, which need not be the one this login was made
    // with. Revoking that would end somebody else's link.
    if (subjectOf(tokens.id_token) !== expected) {
      console.error('[apple-revoke] the code belongs to another apple account: nothing revoked');
      return json(409, { error: 'other_apple_account' });
    }

    // 5. Apple is told.
    const revoked = await fetch(
      `${base}/auth/revoke`,
      form({
        client_id: clientId,
        client_secret: secret,
        token: tokens.refresh_token,
        token_type_hint: 'refresh_token',
      }),
    );
    if (!revoked.ok) {
      console.error(`[apple-revoke] apple refused the revoke: ${revoked.status}`);
      return json(502, { error: 'apple_refused', step: 'revoke', status: revoked.status });
    }
    return json(200, { revoked: true });
  } catch {
    console.error('[apple-revoke] apple could not be reached');
    return json(502, { error: 'apple_unreachable' });
  }
}

Deno.serve((request: Request) => handle(request, (name) => Deno.env.get(name)));
