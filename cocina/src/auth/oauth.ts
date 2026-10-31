// ============================================================================
// GOOGLE'S RETURN TRIP, AS THE HALF THAT DECIDES. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S RULES, COPIED (`app/src/auth/oauth.ts`, plan `5a-iii-b`, whose
// header carries the reasons): the characteristic failure of a sign-in that
// leaves the app is THE BROWSER OPENS AND NEVER COMES BACK, so every branch of
// the return is named here as a value — a code, a cancellation (never a
// message: she closed it, she knows), or a failure whose detail goes to the
// console. Nothing here imports the browser or the client, so `test/sign-in.test.ts`
// walks every branch; the four impure lines are in `AuthProvider`.
//
// ⚠️⚠️ THE REDIRECT HAS A COPY THIS REPOSITORY CANNOT READ: the hosted project's
// redirect list, which holds `mx.wera.cocina://**` since 2026-10-30 (the plan's
// status log, his command, read back). When it is missing GoTrue does not fail —
// it sends the browser to the project's Site URL, and the app waits for a call
// that went to a web page. That is the hang.
// ============================================================================

/** The app's deep-link scheme — `app.json`'s `scheme` and the bundle id, one string. */
export const DEEP_LINK_SCHEME = 'mx.wera.cocina';

/** Where Google's sign-in comes back to. `src/app/auth/callback.tsx` is its route. */
export const OAUTH_REDIRECT_URI = `${DEEP_LINK_SCHEME}://auth/callback`;

/** What came back from the browser, once. */
export type OAuthReturn =
  | { readonly kind: 'code'; readonly code: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly detail: string };

/** The shape `WebBrowser.openAuthSessionAsync` resolves to, as much as is read. */
export interface BrowserResult {
  readonly type: string;
  readonly url?: string;
}

/** `cancel` (the sheet's button) and `dismiss` (a swipe) are both her. */
export function oauthOutcome(result: BrowserResult): OAuthReturn {
  if (result.type === 'cancel' || result.type === 'dismiss') return { kind: 'cancelled' };
  if (result.type !== 'success') return { kind: 'failed', detail: `browser: ${result.type}` };
  if (typeof result.url !== 'string' || result.url === '') {
    return { kind: 'failed', detail: 'browser reported success with no url' };
  }
  return parseOAuthReturn(result.url);
}

/**
 * The callback URL, read — the query AND the fragment, because GoTrue reports
 * some failures in the fragment. An error beats a code; `access_denied` (she
 * backed out of Google's consent) is a cancellation; tokens in the callback mean
 * the client is not in PKCE mode, and are named rather than used.
 */
export function parseOAuthReturn(url: string): OAuthReturn {
  const params = paramsOf(url);
  const error = params.get('error') ?? params.get('error_code');
  if (error !== undefined) {
    if (error === 'access_denied') return { kind: 'cancelled' };
    return { kind: 'failed', detail: params.get('error_description') ?? error };
  }
  const code = params.get('code');
  if (code !== undefined && code !== '') return { kind: 'code', code };
  if (params.has('access_token')) {
    return { kind: 'failed', detail: 'tokens in the callback — the client is not in PKCE mode' };
  }
  return { kind: 'failed', detail: 'no code in the callback' };
}

/**
 * Every `key=value` in a URL's query and fragment. Hand-rolled, as Wera's: `new
 * URL()` over a non-special scheme like `mx.wera.cocina://` is where engines
 * disagree most. The first of a duplicated key wins.
 */
function paramsOf(url: string): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const separator of ['?', '#']) {
    const at = url.indexOf(separator);
    if (at < 0) continue;
    const rest = url.slice(at + 1).split(separator === '?' ? '#' : '?')[0];
    for (const pair of rest.split('&')) {
      if (pair === '') continue;
      const eq = pair.indexOf('=');
      const key = decodePart(eq < 0 ? pair : pair.slice(0, eq));
      const value = eq < 0 ? '' : decodePart(pair.slice(eq + 1));
      if (!out.has(key)) out.set(key, value);
    }
  }
  return out;
}

/** `decodeURIComponent`, except that a malformed escape is not an exception. */
function decodePart(raw: string): string {
  const plussed = raw.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(plussed);
  } catch {
    return plussed;
  }
}
