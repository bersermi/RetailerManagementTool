import { router } from 'expo-router';
import { useEffect } from 'react';

// ============================================================================
// THE SCREEN NOBODY IS MEANT TO SEE: ANDROID DELIVERS GOOGLE'S REDIRECT TWICE.
// Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S ROUTE, AND ITS MEASUREMENT (`app/src/app/auth/callback.tsx`, plan
// `5a-iv-c-3`, on a borrowed Samsung, 2026-09-13): on iOS the sign-in sheet
// consumes the redirect; on Android the Custom Tab hands it to the promise AND
// to the app as an ordinary link, so the router opens
// `mx.wera.cocina://auth/callback?code=…` too. With no route here it draws
// *Unmatched Route* — in English, quoting the code — over a sign-in that had
// already succeeded. So this route exists, and goes home; the guard takes it
// from there. `auth/` is a folder, not the `(auth)` group: it is the path the
// redirect names (`OAUTH_REDIRECT_URI`), and `test/sign-in.test.ts` holds the two
// together.
// ============================================================================
export default function OAuthCallback() {
  useEffect(() => {
    router.replace('/');
  }, []);
  return null;
}
