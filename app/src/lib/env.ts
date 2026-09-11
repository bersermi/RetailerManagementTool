// ============================================================================
// THE TWO VALUES THE CLIENT IS BUILT FROM, AND THE ONE THAT MUST NEVER BE HERE.
// Plan task 5a-iii-a.
//
// This module is pure and takes its environment as an argument. That is not
// tidiness: `app/src/lib/supabase.ts` has `react-native`, `expo-sqlite` and a
// live `createClient` at module scope and can never be loaded by the Vitest
// suite (`app/vitest.config.ts` collects `test/**` and runs in node). Splitting
// the RULES out from the WIRING is what makes the refusal below testable at
// all — and the refusal is the reason this file exists.
//
// ⚠️⚠️ THE REFUSAL: A `service_role` / `sb_secret_` KEY IN THE CLIENT BYPASSES
// RLS ENTIRELY. Every isolation guarantee this repository has proved since step
// 3 — forty-one policies, the pgTAP suites, every green `db.yml` run — is
// enforced by Postgres against the key the request arrives with. Hand the phone
// the secret key and all of it evaluates to nothing, silently, on a device in
// somebody else's shop. It is one paste away: the two keys sit beside each
// other in the same dashboard panel, and the wrong one WORKS — better, even,
// because nothing is filtered. So this is the one misconfiguration the app
// refuses to start with rather than reports.
//
// ⚠️ WHAT THIS CANNOT SEE, SAID HERE RATHER THAN LEFT TO BE DISCOVERED: the
// `NEXT_PUBLIC_` trap. Expo inlines ONLY `EXPO_PUBLIC_`-prefixed variables, so
// a `.env.local` written in the Next.js spelling reaches this code as nothing
// at all — there is no second name to compare against, because the bundler
// dropped it before the app existed. The message below therefore NAMES the trap
// as a hint; `docs/checks/5a-iii-gate.sh` reads the file on disk and is the
// only instrument that can actually detect it.
//
// ⚠️ THE MESSAGES ARE ENGLISH AND NOT IN `ES`. Everything here is a build-time
// misconfiguration of a build the owner made on his own Mac: it fails the same
// way on the first launch of every device, and the reader is always a
// developer. §2.11's one-strings-file rule is about what the app SAYS TO A
// SHOPKEEPER, and a shopkeeper can never reach these.
// ============================================================================

/** The two values `createClient` is given. Nothing else is read from `process.env`. */
export interface SupabaseEnv {
  readonly url: string;
  readonly publishableKey: string;
}

const HINT =
  'Copy app/.env.example to app/.env.local and fill it in. ' +
  'If you pasted Supabase\'s Connect snippet, check the prefix: Expo inlines ' +
  'only EXPO_PUBLIC_, and the NEXT_PUBLIC_ spelling arrives here as nothing.';

/**
 * Reads and validates the Supabase configuration, or throws.
 *
 * ⚠️ IT THROWS RATHER THAN RETURNING A DEFAULT OR A NULL. A client built from a
 * missing URL is a client whose every call fails later, somewhere else, as a
 * network error — the failure would be reported by the screen that happened to
 * ask first rather than by the thing that is wrong.
 *
 * @param env the inlined values, passed in explicitly by the caller — see the
 *   note in `supabase.ts` about why `process.env` itself is not handed over.
 */
export function readSupabaseEnv(env: {
  readonly EXPO_PUBLIC_SUPABASE_URL?: string;
  readonly EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}): SupabaseEnv {
  const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const publishableKey = (env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

  if (url === '') throw new Error(`EXPO_PUBLIC_SUPABASE_URL is not set. ${HINT}`);
  if (publishableKey === '') {
    throw new Error(`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. ${HINT}`);
  }

  if (!url.startsWith('https://')) {
    throw new Error(
      `EXPO_PUBLIC_SUPABASE_URL must start with https:// (got a ${url.split(':')[0]}: URL). ` +
        'The session and the publishable key travel over it.',
    );
  }

  // ⚠️ A TRAILING SLASH IS A 404, NOT A TIDINESS COMPLAINT. supabase-js builds
  // its endpoints as `${url}/auth/v1/...`, so one extra slash produces `//auth`
  // and every sign-in fails with a message about the network. The dashboard
  // copy button does not add one; a human retyping the URL does.
  if (url.endsWith('/')) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL must not end with a slash — supabase-js appends ' +
        '/auth/v1 to it, and the doubled slash 404s on every request.',
    );
  }

  if (isSecretKey(publishableKey)) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY looks like a SECRET key ' +
        '(sb_secret_… or a service_role JWT). That key BYPASSES RLS, and this ' +
        'one ships inside the app binary on four phones that are not yours. ' +
        'Use the publishable key (sb_publishable_…) from the same panel.',
    );
  }

  return { url, publishableKey };
}

/**
 * Is this the key that bypasses RLS?
 *
 * Two spellings exist and both are refused: the current `sb_secret_…` keys, and
 * the legacy `service_role` JWT that projects created before the change still
 * carry. ⚠️ THE LEGACY ONE IS READ, NOT PATTERN-MATCHED: a JWT's payload is
 * base64url, so `"role":"service_role"` does not appear in the token text and a
 * substring search over it finds nothing — which is the shape of a guard that
 * runs, passes, and has never once looked at what it claims to check.
 */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  return jwtRole(key) === 'service_role';
}

/** The `role` claim of a JWT, or `null` for anything that is not a readable JWT. */
function jwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload: unknown = JSON.parse(base64UrlDecode(parts[1]));
    if (typeof payload !== 'object' || payload === null) return null;
    const role = (payload as { role?: unknown }).role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

/**
 * ⚠️ HAND-ROLLED, AND THE REASON IS THE TWO RUNTIMES. This runs under Hermes on
 * the phone and under node in CI; `atob` exists in both today, and a guard that
 * silently stops guarding on the runtime it was not tested in is precisely the
 * failure this function is here to prevent. Twelve lines that behave the same
 * everywhere beat a global that might not be there.
 */
function base64UrlDecode(segment: string): string {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let bits = 0;
  let acc = 0;
  let out = '';
  for (const char of segment) {
    if (char === '=') break;
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error('not base64url');
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((acc >> bits) & 0xff);
    }
  }
  return out;
}
