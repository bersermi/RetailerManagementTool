// ============================================================================
// THE ONE SUPABASE CLIENT. Plan task 5a-iii-a.
//
// ⚠️ THIS MODULE IS DELIBERATELY UNTESTABLE AND THE RULES IT OBEYS ARE NOT.
// Three side effects run at import — a URL polyfill, a storage engine
// installing itself as `globalThis.localStorage`, and an `AppState` listener —
// so it cannot be loaded by a node suite, and `app/vitest.config.ts` collects
// `test/**` only so nothing tries. Everything with a right answer lives in
// `@/lib/env`, which is pure and is tested.
//
// ⚠️⚠️ WHY THE SESSION LIVES IN `expo-sqlite` AND NOT IN ASYNCSTORAGE. Decided
// in 5a-iii's sizing, 2026-09-11. Supabase's own quickstart shows both; most
// tutorials show AsyncStorage; ADR-035 §2.11 already chose `expo-sqlite` ("Local
// state: Zustand, cart only, persisted to `expo-sqlite`") and 5c's offline
// outbox is built on it. Adding AsyncStorage would put TWO storage engines in
// one app before the second screen exists — two things to reason about when a
// session or a queued sale goes missing, two things to clear, and a junior
// arriving in step 6 with no way to tell which is which. Reversing is one
// import and one option in this file; the session is re-created by signing in
// again.
//
// ⚠️ `process.env` IS NOT PASSED AS AN OBJECT, AND THIS IS THE SUBTLE ONE.
// Expo's babel plugin INLINES `process.env.EXPO_PUBLIC_FOO` as a literal where
// it is written; it does not build a populated `process.env` for the bundle. So
// `readSupabaseEnv(process.env)` typechecks, runs in node, and hands the app an
// empty object on a device. The two member expressions below are written out in
// full because that spelling is the thing the bundler can see.
// ============================================================================

import 'react-native-url-polyfill/auto';
// ⚠️ ORDER MATTERS: this installs `globalThis.localStorage` on top of SQLite,
// and it has to have happened before `createClient` reads it below.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { readSupabaseEnv } from '@/lib/env';

const env = readSupabaseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export const supabase = createClient(env.url, env.publishableKey, {
  auth: {
    // The SQLite-backed `localStorage` installed above. C1.4: the session
    // outlives the app being closed, and only an explicit log-out ends it.
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // ⚠️ `false` ON PURPOSE, AND IT IS NOT THE SAME QUESTION AS 5a-iii-b's DEEP
    // LINK. This option is for a web page whose URL carries the tokens; on a
    // phone there is no page and no URL bar, and leaving it on makes the client
    // parse whatever `window.location` a polyfill invented. The OAuth return
    // trip is handled explicitly, in `AuthProvider.signInWithGoogle`.
    detectSessionInUrl: false,
    // ⚠️⚠️ PKCE, AND THE DEFAULT IS `implicit` — THIS LINE IS THE WHOLE
    // DIFFERENCE. Added in 5a-iii-b. Under the implicit flow GoTrue sends the
    // ACCESS AND REFRESH TOKENS THEMSELVES back in the callback URL, and the
    // callback here is a custom scheme — `mx.bserafin.wera://` — which any app
    // on the phone may also register. A refresh token does not expire; handing
    // one to the OS's URL router is the same class of mistake as the secret key
    // `env.ts` refuses, and it has the same property: it WORKS. PKCE sends a
    // one-time `code` instead, worthless without the verifier this client kept
    // in its own storage. RFC 8252 is not ambiguous about which one a native
    // app uses.
    //
    // ⚠️ IT CHANGES NOTHING FOR EMAIL. `signInWithPassword` does not consult
    // the flow type, and confirmations are off on this project, so no magic
    // link exists to be affected. `oauth.ts` reports tokens-in-the-callback as
    // a named failure, which is what notices if this line is ever removed.
    flowType: 'pkce',
  },
});

// ⚠️ THE REFRESH LOOP IS TIED TO THE FOREGROUND, AND WITHOUT IT C1.4 IS FALSE.
// An access token lives about an hour. The phone spends most of its life in a
// pocket, so the app that is reopened at 7 a.m. holds an expired token and a
// valid refresh token — `startAutoRefresh` is what turns the second into the
// first before the first request goes out. Stopping it in the background is
// Supabase's own instruction: a timer firing behind a locked screen wakes the
// radio for nothing.
//
// ⚠️ REGISTERED ONCE, AT MODULE SCOPE, NOT IN A COMPONENT. A listener added by
// an effect is added again by every remount, and the symptom of four of them is
// four refreshes racing on one refresh token.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
