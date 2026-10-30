// ============================================================================
// THE ONE SUPABASE CLIENT. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S CLIENT, OPTION FOR OPTION (`app/src/lib/supabase.ts`, plans
// `5a-iii-a`, `5a-iii-b` and `8g`, whose header carries each reason in full).
// Cocina talks to the same database, so it carries the same five decisions:
//   - the session lives in `expo-sqlite` (installed as `globalThis.localStorage`
//     below), already in this app's first build — no second storage engine;
//   - PKCE, never the implicit default: Google's return trip carries a one-time
//     code, not the tokens themselves, through a scheme any app may register;
//   - `detectSessionInUrl: false`: there is no page and no URL bar;
//   - every request has a time limit (`@/lib/plazo`);
//   - the refresh loop runs only while the app is in front.
//
// ⚠️ DELIBERATELY UNTESTABLE: a polyfill, a storage engine and an `AppState`
// listener run at import, so no node suite can load it, and `vitest.config.ts`
// collects `test/**` only. Everything with a right answer is in `@/lib/env`.
//
// ⚠️ `process.env` IS NOT PASSED AS AN OBJECT. Expo's babel plugin inlines
// `process.env.EXPO_PUBLIC_FOO` where it is written out in full; a populated
// `process.env` does not exist in the bundle.
// ============================================================================

import 'react-native-url-polyfill/auto';
// ⚠️ ORDER MATTERS: this installs `globalThis.localStorage` on top of SQLite,
// and it has to have happened before `createClient` reads it below.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { readSupabaseEnv } from '@/lib/env';
import { withLimit } from '@/lib/plazo';

const env = readSupabaseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

/** The project's address: `@/auth/held` derives the key the session is stored under from it. */
export const SUPABASE_URL = env.url;

export const supabase = createClient(env.url, env.publishableKey, {
  auth: {
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: { fetch: withLimit(fetch) },
});

// Registered once, at module scope: a listener added by an effect is added again
// by every remount, and four of them race four refreshes on one refresh token.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
