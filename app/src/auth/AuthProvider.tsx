import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { authErrorMessage } from '@/auth/errors';
import { checkCredentials } from '@/auth/credentials';
import { OAUTH_REDIRECT_URI, oauthOutcome } from '@/auth/oauth';
import { forgetLastScreen, routeMemory } from '@/navigation/lastScreen';
import { ES } from '@/strings';
import { supabase } from '@/lib/supabase';

// ============================================================================
// WHO IS HOLDING THE PHONE. Plan task 5a-iii-a.
//
// One context over `supabase.auth`, in the shape `DensityProvider` already
// established: a provider mounted once in the root layout, a hook, and no
// component anywhere else touching the library directly. The reason is the same
// one §2.11 gives for `src/api/` — a junior who can call `supabase.auth`
// wherever they like will, and then a screen somewhere signs a person out on a
// failed read.
//
// ⚠️ `ready` IS NOT `loading` SPELLED DIFFERENTLY. It answers "has the stored
// session been LOOKED FOR", and it is false for the first frames of every cold
// start, including a signed-in one. See `@/auth/guard`: acting on `!hasSession`
// before it is true is the bug where the app asks a signed-in shopkeeper to log
// in again every morning.
//
// ⚠️ THE SIGN-IN METHODS RETURN A SPANISH STRING OR `null`, NOT AN `AuthError`.
// Handing the error object to the screen is handing the screen a decision about
// English text, and there would then be as many of those decisions as there are
// screens that can fail. `errors.ts` makes it once.
// ============================================================================

interface Auth {
  readonly session: Session | null;
  readonly ready: boolean;
  /** `null` on success, otherwise the Spanish sentence to show. */
  readonly signIn: (email: string, password: string) => Promise<string | null>;
  readonly signUp: (email: string, password: string) => Promise<string | null>;
  /**
   * C1.4's other provider (5a-iii-b). ⚠️ `null` ALSO MEANS "THEY CHANGED THEIR
   * MIND" — a cancelled round trip is not a failure and must show no message.
   * See `@/auth/oauth`.
   */
  readonly signInWithGoogle: () => Promise<string | null>;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth>({
  session: null,
  // ⚠️ THE DEFAULT IS `ready: false`, WHICH IS THE HARMLESS ONE. A component
  // rendered outside the provider then shows the splash rather than deciding
  // that nobody is signed in and redirecting them out of their own session.
  ready: false,
  signIn: async () => null,
  signUp: async () => null,
  signInWithGoogle: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The stored session, read once. ⚠️ `ready` IS SET IN BOTH OUTCOMES,
    // including the failure: a storage read that throws must not leave the app
    // on the splash screen forever, which is a hang with no message.
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSession(data.session);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    // Everything after that: sign-in, sign-out, and the token refreshes the
    // `AppState` listener in `@/lib/supabase` drives.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const checked = checkCredentials(email, password);
    if (!checked.ok) return checked.message;
    const { error } = await supabase.auth.signInWithPassword({
      email: checked.email,
      password: checked.password,
    });
    return error ? authErrorMessage(error) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const checked = checkCredentials(email, password);
    if (!checked.ok) return checked.message;
    const { error } = await supabase.auth.signUp({
      email: checked.email,
      password: checked.password,
    });
    return error ? authErrorMessage(error) : null;
  }, []);

  // ==========================================================================
  // ⚠️ THE ROUND TRIP, AND EVERY DECISION IN IT IS IN `@/auth/oauth`. What is
  // left here is the three impure steps: ask supabase-js for the URL, open the
  // browser, hand the code back. Plan task 5a-iii-b.
  //
  // ⚠️ `skipBrowserRedirect` IS `true` BECAUSE THERE IS NO BROWSER TO REDIRECT.
  // supabase-js would otherwise assign `window.location`, which on a phone is
  // whatever a polyfill invented — the sign-in would simply not happen, with no
  // error. We want the URL as a value and we open it ourselves.
  //
  // ⚠️ `openAuthSessionAsync` AND NOT `openBrowserAsync`. The first uses
  // ASWebAuthenticationSession / Custom Tabs, which RESOLVE WITH THE CALLBACK
  // URL and hand control straight back to this app; the second opens a browser
  // and returns immediately, leaving the deep link to find its own way home
  // through the OS. That difference is the whole of "the browser opens and
  // never comes back".
  // ==========================================================================
  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: OAUTH_REDIRECT_URI, skipBrowserRedirect: true },
      });
      if (error) return authErrorMessage(error);
      if (!data.url) return ES.auth.errors.googleFailed;

      const outcome = oauthOutcome(await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URI));
      // They closed it, or backed out of Google's chooser. They know.
      if (outcome.kind === 'cancelled') return null;
      if (outcome.kind === 'failed') {
        // ⚠️ THE DETAIL GOES TO THE CONSOLE AND NEVER TO THE SCREEN — it names
        // a misconfiguration (a missing Redirect URL, the flow type changed),
        // which is a developer's sentence, and the developer is the only person
        // who can act on it.
        console.warn(`[auth] google sign-in failed: ${outcome.detail}`);
        return ES.auth.errors.googleFailed;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(outcome.code);
      return exchangeError ? authErrorMessage(exchangeError) : null;
    } catch (thrown) {
      // ⚠️ THE BROWSER CAN THROW, AND THE COMMON CASE IS THE COMMON ONE HERE
      // TOO: no signal. `authErrorMessage` recognises a dead connection from
      // both shapes it arrives in, and says so in Spanish.
      return authErrorMessage(thrown);
    }
  }, []);

  // ⚠️ THE ONLY THING THAT ENDS A SESSION (C1.4). Nothing else in this app may
  // call `supabase.auth.signOut()`, and no failure path may: "nobody logs out
  // at 9 p.m., the phone is simply put down."
  //
  // ⚠️ AND IT FORGETS THE LAST SCREEN (C1.3, 5a-iii-b). Logging out is the one
  // deliberate "I am done" act in this app, and the realistic next person to
  // hold this phone is a different one. A session that merely expired is not
  // this and does not clear it.
  const signOut = useCallback(async () => {
    forgetLastScreen(routeMemory());
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<Auth>(
    () => ({ session, ready, signIn, signUp, signInWithGoogle, signOut }),
    [session, ready, signIn, signUp, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** The session in force, and the four things that change it. */
export function useAuth(): Auth {
  return useContext(AuthContext);
}
