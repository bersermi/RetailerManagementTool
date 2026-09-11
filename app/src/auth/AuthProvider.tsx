import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { authErrorMessage } from '@/auth/errors';
import { checkCredentials } from '@/auth/credentials';
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

  // ⚠️ THE ONLY THING THAT ENDS A SESSION (C1.4). Nothing else in this app may
  // call `supabase.auth.signOut()`, and no failure path may: "nobody logs out
  // at 9 p.m., the phone is simply put down."
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<Auth>(
    () => ({ session, ready, signIn, signUp, signOut }),
    [session, ready, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** The session in force, and the three things that change it. */
export function useAuth(): Auth {
  return useContext(AuthContext);
}
