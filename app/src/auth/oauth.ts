// ============================================================================
// THE ROUND TRIP, AS THE HALF THAT DECIDES. Plan task 5a-iii-b.
//
// ⚠️ THIS IS THE ONLY FAILURE IN `5a` THAT LOOKS LIKE A HANG. Everything
// `5a-iii-a` shipped fails on the screen in front of you: a wrong password
// says so, a dead connection says so. Google sign-in leaves the app, and its
// characteristic failure is THE BROWSER OPENS AND NEVER COMES BACK — which is
// indistinguishable, to the person holding the phone, from the app freezing.
// So every branch of the return trip is named and handled here, as values, and
// `app/test/oauth.test.ts` walks all of them.
//
// ⚠️ NOTHING IN THIS FILE IMPORTS `expo-web-browser`, `expo-linking` OR THE
// SUPABASE CLIENT, AND THAT IS WHAT MAKES IT TESTABLE. The impure half — open
// a browser, hand the code to supabase-js — is four lines in `AuthProvider`,
// which is where §2.11's "the library has exactly one caller" rule already
// puts it. This file is the rules.
//
// ⚠️⚠️ `expo-auth-session` IS NOT USED, AND THE PLAN'S SIZING ROW NAMED IT.
// See docs/PLAN.md, 5a-iii-b's decisions: its one contribution would have been
// `makeRedirectUri()`, which returns a DIFFERENT string under a dev server than
// in a build — and the string has a copy in the Supabase dashboard's allow-list
// that no file in this repository can read. A constant is the thing a test can
// hold against `app.json`, and a value that varies by how the app was started
// is the worst possible shape for a value that must match a row someone typed
// into a web page once.
// ============================================================================

/**
 * The app's deep-link scheme. ⚠️ THE SAME STRING AS `app.json`'s `scheme` AND
 * as the bundle identifier — `app/test/oauth.test.ts` reads `app.json` and
 * refuses to let the two drift, which is `5a-iii-a`'s K13 one level up.
 */
export const DEEP_LINK_SCHEME = 'mx.bserafin.wera';

/**
 * ⚠️⚠️ THE OTHER COPY OF THIS STRING IS IN THE SUPABASE DASHBOARD, under
 * Authentication → URL Configuration → Redirect URLs, as `mx.bserafin.wera://**`.
 * It is not in this repository, no check here can read it, and when it is
 * missing GoTrue does not error — it silently sends the browser to the project's
 * Site URL instead, so the app waits for a callback that was delivered to a web
 * page. That is the hang.
 */
export const OAUTH_REDIRECT_URI = `${DEEP_LINK_SCHEME}://auth/callback`;

/**
 * What came back from the browser, once.
 *
 * `cancelled` is not a failure and must never produce a message: the person
 * closed the sheet or tapped away from Google's account chooser, and they know
 * they did it. Telling them about it is the bookkeeping the owner's rule
 * refuses to hand over.
 */
export type OAuthReturn =
  | { readonly kind: 'code'; readonly code: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly detail: string };

/** The shape `WebBrowser.openAuthSessionAsync` resolves to, as much as we read. */
export interface BrowserResult {
  readonly type: string;
  readonly url?: string;
}

/**
 * The browser's result, as one of the three things that can have happened.
 *
 * ⚠️ `dismiss` AND `cancel` ARE BOTH THE PERSON, and they are not the same
 * event: `cancel` is the sheet's own Cancel button, `dismiss` is a swipe or the
 * app being brought back to the front some other way. Collapsing them here
 * means the screen has one case to handle rather than two that differ by
 * platform.
 */
export function oauthOutcome(result: BrowserResult): OAuthReturn {
  if (result.type === 'cancel' || result.type === 'dismiss') return { kind: 'cancelled' };
  if (result.type !== 'success') return { kind: 'failed', detail: `browser: ${result.type}` };
  if (typeof result.url !== 'string' || result.url === '') {
    return { kind: 'failed', detail: 'browser reported success with no url' };
  }
  return parseOAuthReturn(result.url);
}

/**
 * The callback URL, read.
 *
 * ⚠️ BOTH THE QUERY AND THE FRAGMENT ARE READ, AND THAT IS NOT BELT AND
 * BRACES. In PKCE the code arrives as `?code=…`; GoTrue reports some failures
 * in the FRAGMENT — `#error=server_error&error_description=…` — because that is
 * where the implicit flow it also serves puts everything. A parser that read
 * only the query would turn a real, reportable error into "no code", which is
 * the same message as a bug in this file.
 */
export function parseOAuthReturn(url: string): OAuthReturn {
  const params = paramsOf(url);

  // ⚠️ AN ERROR BEATS A CODE, AND THE ORDER OF THESE TWO BLOCKS IS THE RULE
  // RATHER THAN AN ACCIDENT. A callback carrying both is malformed; exchanging
  // the code anyway is acting on half a message. (`app/test/oauth.test.ts`
  // found this by asserting the opposite, and the fixture was what was wrong.)
  const error = params.get('error') ?? params.get('error_code');
  if (error !== undefined) {
    // ⚠️ A DECLINE IS A CANCELLATION, NOT A FAILURE. `access_denied` is what
    // Google sends when the person backs out of the consent screen — the same
    // act as closing the sheet, arriving by a different route.
    if (error === 'access_denied') return { kind: 'cancelled' };
    return { kind: 'failed', detail: params.get('error_description') ?? error };
  }

  const code = params.get('code');
  if (code !== undefined && code !== '') return { kind: 'code', code };

  // ⚠️ THE ONE THAT CATCHES A CONFIGURATION CHANGE RATHER THAN A USER. Tokens
  // in the callback mean the client is NOT in PKCE mode — `flowType` in
  // `lib/supabase.ts` was flipped, or removed. It would still sign people in,
  // which is why it needs naming rather than swallowing: a refresh token that
  // never expires would be travelling through a custom URL scheme any app on
  // the phone may claim.
  if (params.has('access_token')) {
    return { kind: 'failed', detail: 'tokens in the callback — the client is not in PKCE mode' };
  }

  return { kind: 'failed', detail: 'no code in the callback' };
}

/**
 * Every `key=value` in a URL's query AND fragment.
 *
 * ⚠️ HAND-ROLLED, FOR THE REASON `env.ts`'s base64 decoder is: this runs under
 * Hermes on the phone and node in CI, and `new URL()` over a NON-SPECIAL scheme
 * — which `mx.bserafin.wera://` is — is the part of the WHATWG spec
 * implementations disagree about most. A `URL` that parsed the path but not the
 * query would leave this function returning nothing and the app reporting "no
 * code" for a sign-in that succeeded. Twenty lines that behave the same
 * everywhere beat a global that might not.
 */
function paramsOf(url: string): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const separator of ['?', '#']) {
    const at = url.indexOf(separator);
    if (at < 0) continue;
    // Stop at the other separator: `?a=1#b=2` must not read `1#b=2` as a value.
    const rest = url.slice(at + 1).split(separator === '?' ? '#' : '?')[0];
    for (const pair of rest.split('&')) {
      if (pair === '') continue;
      const eq = pair.indexOf('=');
      const key = decodePart(eq < 0 ? pair : pair.slice(0, eq));
      const value = eq < 0 ? '' : decodePart(pair.slice(eq + 1));
      // ⚠️ FIRST WINS. A duplicated key is a malformed callback; taking the
      // first keeps the answer stable rather than depending on ordering.
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
