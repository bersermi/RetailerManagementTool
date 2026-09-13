import { router } from 'expo-router';
import { useEffect } from 'react';

// ============================================================================
// THE SCREEN NOBODY IS MEANT TO SEE, AND IT EXISTS BECAUSE ANDROID DELIVERS THE
// OAUTH REDIRECT TWICE. Plan task 5a-iv-c-3, measured on a borrowed Samsung
// Galaxy Z Flip 8 (Android 17 / One UI 9) on 2026-09-13.
//
// ⚠️⚠️ WHAT WAS ACTUALLY SEEN, BY A PERSON, ON A PHONE:
//
//     Unmatched Route
//     Page could not be found.
//     mx.bserafin.wera://auth/callback?code=259358a1-…
//     Go back
//
// — in English, quoting a PKCE code, after a Google sign-in that HAD SUCCEEDED.
// The session was live behind it: tapping "Go back" landed on Inicio, signed
// in. So this was never an authentication failure. It was the last screen of a
// working round trip, and it is the failure the owner's own rule refuses —
// WE DO THE BOOKKEEPING, NOT THEM.
//
// ⚠️⚠️ WHY IT HAPPENS ON ANDROID AND NOT ON iOS, WHICH IS THE WHOLE LESSON.
// `AuthProvider` opens `WebBrowser.openAuthSessionAsync`. On iOS that is
// `ASWebAuthenticationSession`, which CONSUMES the redirect: the URL is handed
// back to the promise and no intent is dispatched, so no router ever sees it.
// On Android it is a Chrome Custom Tab, and the redirect is delivered as an
// ordinary `VIEW` intent to `MainActivity` — logcat, verbatim:
//
//     START u0 {act=android.intent.action.VIEW dat=mx.bserafin.wera://auth/…
//       cmp=mx.bserafin.wera/.MainActivity} … from uid 10296 (com.android.chrome)
//
// So on Android BOTH consumers get the URL: `openAuthSessionAsync` resolves and
// the code is exchanged, AND Expo Router navigates to `/auth/callback`. There
// was no such route, so the router drew its not-found page over a working app.
//
// ⚠️ AND THE GUARD COULD NOT RESCUE IT, WHICH IS WHY A ROUTE AND NOT A GUARD
// FIX. `@/auth/guard`'s `groupOf` maps `(auth)` and `(tabs)` and returns `null`
// for everything else; `redirectFor` returns `null` for a signed-in person on a
// `null` group. Stranded is the correct reading of those two functions, and
// widening them would make every unknown deep link bounce a signed-in person
// home — a change to the rule that governs every screen, to fix one URL.
//
// ⚠️ `auth/` HERE IS A DIRECTORY, NOT THE `(auth)` GROUP, and the two are
// deliberately different things. `(auth)` is parenthesised, so it contributes
// nothing to the URL and holds `entrar`. This contributes `/auth/`, which is
// the path the Supabase dashboard's allow-list and `OAUTH_REDIRECT_URI` already
// name. Renaming either is a string with a copy in a web page nobody here can
// read; `app/test/oauth.test.ts` now asserts this file and that constant agree.
//
// ⚠️ IT REDIRECTS FROM AN EFFECT RATHER THAN RENDERING `<Redirect>`, for two
// reasons. `Redirect` is not re-exported from `expo-router`'s barrel in SDK 57,
// and `src/app/_layout.tsx` already made this decision on purpose: redirecting
// during a render is a navigation during a render, which Expo Router warns
// about. Same idiom, same file, same argument.
//
// ⚠️ IT DOES NOT WAIT FOR THE SESSION, AND THAT IS A MEASUREMENT AND NOT AN
// OVERSIGHT. The obvious worry is a race — the router arriving here before
// `exchangeCodeForSession` finishes, so `/` bounces to `/entrar` and a
// just-signed-in shopkeeper sees the sign-in screen flash. On the device the
// exchange had ALREADY completed by the time this route was reached. Waiting on
// `ready` would be designing around a limit nobody has observed. If a slower
// phone ever shows that flash, the fix is to hold here on `ES.auth.working` —
// the string already exists for it.
//
// ⚠️ NO CHECK IN THIS REPOSITORY CAN SEE THAT THIS WORKS. ADR-035 §2.10/§2.11
// refuse suites over navigation, and this file is nothing but a navigation. The
// test below pins the STRING, not the behaviour. The behaviour was measured on
// a phone, once, and that is R9's shape: a deliverable no check can see, written
// down as such and routed to the instrument that can.
// ============================================================================
export default function OAuthCallback() {
  useEffect(() => {
    router.replace('/');
  }, []);

  return null;
}
