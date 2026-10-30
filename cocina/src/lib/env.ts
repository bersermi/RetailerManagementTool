// ============================================================================
// THE TWO VALUES THE CLIENT IS BUILT FROM, AND THE ONE THAT MUST NEVER BE HERE.
// Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S RULES, COPIED (`app/src/lib/env.ts`, plan `5a-iii-a`, whose header
// carries the reasons in full): pure, so `test/env.test.ts` can read it, and it
// REFUSES TO START with a secret key — `sb_secret_…` or a `service_role` JWT
// bypasses every wall in the database, and it works, better even. Both apps
// talk to the one database, so both refuse it.
//
// The values come from EAS's environment on a build or an update — this
// project's own `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
// Wera's values (`cocina/CLAUDE.md`) — and from `cocina/.env.local` on this Mac.
//
// ⚠️ ENGLISH, NOT `ES`: a misconfigured build fails on its first launch for the
// developer who made it; a fonda can never reach these messages.
// ============================================================================

/** The two values `createClient` is given. Nothing else is read from `process.env`. */
export interface SupabaseEnv {
  readonly url: string;
  readonly publishableKey: string;
}

const HINT =
  'On EAS they are the project\'s own variables; on this Mac, cocina/.env.local. ' +
  'Expo inlines only EXPO_PUBLIC_, and the NEXT_PUBLIC_ spelling arrives here as nothing.';

/** Reads and validates the Supabase configuration, or throws (never a default). */
export function readSupabaseEnv(env: {
  readonly EXPO_PUBLIC_SUPABASE_URL?: string;
  readonly EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}): SupabaseEnv {
  const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const publishableKey = (env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

  if (url === '') throw new Error(`EXPO_PUBLIC_SUPABASE_URL is not set. ${HINT}`);
  if (publishableKey === '') throw new Error(`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. ${HINT}`);

  if (!url.startsWith('https://')) {
    throw new Error(
      `EXPO_PUBLIC_SUPABASE_URL must start with https:// (got a ${url.split(':')[0]}: URL). ` +
        'The session and the publishable key travel over it.',
    );
  }
  // supabase-js appends `/auth/v1`, so a trailing slash is a 404 on every request.
  if (url.endsWith('/')) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL must not end with a slash — every request would 404.');
  }
  if (isSecretKey(publishableKey)) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY looks like a SECRET key (sb_secret_… or a ' +
        'service_role JWT). That key BYPASSES RLS, and this one ships inside the app. ' +
        'Use the publishable key (sb_publishable_…) from the same panel.',
    );
  }
  return { url, publishableKey };
}

/**
 * Is this the key that bypasses RLS? ⚠️ THE LEGACY JWT IS READ, NOT SEARCHED:
 * its payload is base64url, so `service_role` never appears in the token text.
 */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  return jwtRole(key) === 'service_role';
}

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

/** Hand-rolled, as Wera's: the same answer under Hermes on the phone and node in CI. */
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
