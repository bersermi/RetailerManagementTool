import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

import { APPLE_PROVIDER, appleOutcome, appleThrown, asksAppleFirst, nameToStore, type AppleReturn } from '@/auth/apple';
import { FULL_NAME_KEY, checkCredentials, checkSignUp } from '@/auth/credentials';
import { authErrorKey, authErrorMessage } from '@/auth/errors';
import { sessionKeyOf, sessionToHold } from '@/auth/held';
import { OAUTH_REDIRECT_URI, oauthOutcome } from '@/auth/oauth';
import { newNoncePair } from '@/lib/ids';
import { deviceStore, readKey, removeKey } from '@/lib/store';
import { SUPABASE_URL, supabase } from '@/lib/supabase';
import { ES } from '@/strings';

// ============================================================================
// WHO IS HOLDING THE PHONE. Plan task `10.4b-iii-a`.
//
// ⚠️ WERA'S PROVIDER, FOR THE THREE WAYS IN (`app/src/auth/AuthProvider.tsx`,
// plans `5a-iii-a`, `5a-iii-b`, `5b.7`, `5R-d-iii`, `5R-k` and `8g`, whose notes
// carry every measurement). One context over `supabase.auth` and the ONLY module
// that calls it (`test/auth-wiring.test.ts`), so no screen can sign a person out
// on a failed read. The sign-in methods return a Spanish sentence or `null` —
// `null` is success, AND a closed browser or sheet, which owes no message.
//
// ONE LOGIN ACROSS THE APPS (ADR-035 §2.7): a person who made her account in
// Wera signs in here with the same address, Google or Apple, and is the same
// `auth.users` row — the same name, the same businesses (this app opens only
// her kitchens). Each app keeps its own copy of the session, so signing in here
// or out here changes nothing in Wera.
//
// ⚠️ AND APPLE, ASKED AGAIN FOR A DELETION (`askAppleAgain`, `10.4b-iii-c`):
// the same sheet, whose fresh code `apple-revoke` spends before the account goes.
// ============================================================================

/** Where `supabase-js` keeps the session on this phone. See `@/auth/held`. */
const SESSION_KEY = sessionKeyOf(SUPABASE_URL);

function storedSession(): string | null {
  return readKey(deviceStore(), SESSION_KEY);
}

interface Auth {
  readonly session: Session | null;
  /** Has the stored session been LOOKED FOR? False for the first frames of every launch. */
  readonly ready: boolean;
  readonly signIn: (email: string, password: string) => Promise<string | null>;
  /** The name is asked once, here, and the aviso's box ticked once, here. */
  readonly signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    acceptedAviso: boolean,
  ) => Promise<string | null>;
  readonly signInWithGoogle: () => Promise<string | null>;
  /** Whether this phone can show Apple's sheet: `false` on Android, and until asked. */
  readonly appleAvailable: boolean;
  readonly signInWithApple: () => Promise<string | null>;
  /**
   * Apple, asked once more, for a deletion (`10.4b-iii-c`). `null` when there is
   * nothing to ask: no Apple link on this login, or no sheet on this phone.
   */
  readonly askAppleAgain: () => Promise<AppleReturn | null>;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth>({
  session: null,
  // ⚠️ `ready: false` is the harmless default: outside the provider nothing is
  // decided, rather than a signed-in person being sent to *Entrar*.
  ready: false,
  signIn: async () => null,
  signUp: async () => null,
  signInWithGoogle: async () => null,
  appleAvailable: false,
  signInWithApple: async () => null,
  askAppleAgain: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Asked once. A rejection leaves it `false`: a hidden button, never a broken one.
  useEffect(() => {
    let cancelled = false;
    void AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (!cancelled) setAppleAvailable(available);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // ⚠️ `ready` IS SET IN BOTH OUTCOMES: a storage read that throws must not
    // leave the app on its first frame for ever. ⚠️ AND A `null` IS CHECKED
    // AGAINST THE STORE — offline, a sign-in over an hour old is kept stored and
    // answered `null` (`@/auth/held`).
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSession(sessionToHold('LOADED', data.session, storedSession()));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(sessionToHold(event, next, storedSession()));
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
    const { error } = await supabase.auth.signInWithPassword({ email: checked.email, password: checked.password });
    return error ? authErrorMessage(error) : null;
  }, []);

  // ⚠️ THE NAME ENTERS BY THE EMAIL DOOR HERE OR NOWHERE, under the key Google
  // already uses (`FULL_NAME_KEY`); the database copies it onto her membership
  // when she makes her kitchen. The aviso's tick is checked, not sent: no account
  // reaches this call without it (`5R-d-iii`).
  const signUp = useCallback(
    async (email: string, password: string, firstName: string, lastName: string, acceptedAviso: boolean) => {
      const checked = checkSignUp(email, password, firstName, lastName, acceptedAviso);
      if (!checked.ok) return checked.message;
      const { error } = await supabase.auth.signUp({
        email: checked.email,
        password: checked.password,
        options: { data: { [FULL_NAME_KEY]: checked.fullName } },
      });
      return error ? authErrorMessage(error) : null;
    },
    [],
  );

  // ==========================================================================
  // GOOGLE'S ROUND TRIP — every decision is in `@/auth/oauth`; these are the
  // three impure steps. `skipBrowserRedirect` because there is no browser to
  // redirect; `openAuthSessionAsync` (and never `openBrowserAsync`) because it
  // RESOLVES WITH THE CALLBACK URL and hands control straight back — the other
  // leaves the deep link to find its own way home, which is "the browser opens
  // and never comes back". Android also delivers that URL to the router, which
  // is why `src/app/auth/callback.tsx` exists.
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
      if (outcome.kind === 'cancelled') return null;
      if (outcome.kind === 'failed') {
        // The detail names a misconfiguration — a developer's sentence.
        console.warn(`[auth] google sign-in failed: ${outcome.detail}`);
        return ES.auth.errors.googleFailed;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(outcome.code);
      return exchangeError ? authErrorMessage(exchangeError) : null;
    } catch (thrown) {
      return authErrorMessage(thrown);
    }
  }, []);

  // ==========================================================================
  // APPLE'S WAY IN — every decision is in `@/auth/apple`. The system sheet
  // returns a token Apple signed and Supabase checks it. ⚠️ THE NONCE'S HASH
  // GOES TO APPLE AND THE RAW STRING TO SUPABASE (`@/lib/ids`). ⚠️ THE NAME IS
  // WRITTEN HERE OR NOWHERE: Apple sends it on the first sign-in only, and never
  // in the token. A failed write is not a failed sign-in.
  // ==========================================================================
  const signInWithApple = useCallback(async () => {
    let asked: AppleReturn;
    let rawNonce = '';
    try {
      const nonce = await newNoncePair();
      rawNonce = nonce.raw;
      asked = appleOutcome(
        await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: nonce.hashed,
        }),
      );
    } catch (thrown) {
      asked = appleThrown(thrown);
    }

    if (asked.kind === 'cancelled') return null;
    if (asked.kind === 'failed') {
      console.warn(`[auth] apple sign-in failed: ${asked.detail}`);
      return ES.auth.errors.appleFailed;
    }

    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: APPLE_PROVIDER,
        token: asked.identityToken,
        nonce: rawNonce,
      });
      if (error) {
        // Only a refusal this app has a sentence for keeps it; anything else
        // names the button and the way in that still works.
        console.warn(`[auth] supabase refused apple's token: ${error.message}`);
        const key = authErrorKey(error);
        return key === 'unknown' ? ES.auth.errors.appleFailed : ES.auth.errors[key];
      }
      const name = nameToStore(asked.fullName, data.user?.user_metadata?.[FULL_NAME_KEY]);
      if (name !== null) {
        const { error: nameError } = await supabase.auth.updateUser({ data: { [FULL_NAME_KEY]: name } });
        if (nameError) console.warn(`[auth] apple's name was not stored: ${nameError.message}`);
      }
      return null;
    } catch (thrown) {
      return authErrorMessage(thrown);
    }
  }, []);

  // ⚠️ THE SAME SHEET, ASKED AGAIN, AND ONLY A DELETION ASKS (Wera's `5R-k`).
  // Apple hands back a fresh authorization code, issued to THIS app's bundle id,
  // which `apple-revoke` trades and revokes before the account goes. No nonce
  // and no scopes: nothing here signs anybody in, and the name is not wanted.
  const askAppleAgain = useCallback(async (): Promise<AppleReturn | null> => {
    if (!asksAppleFirst(session?.user, appleAvailable)) return null;
    try {
      return appleOutcome(await AppleAuthentication.signInAsync());
    } catch (thrown) {
      return appleThrown(thrown);
    }
  }, [session, appleAvailable]);

  // ⚠️ THE ONLY THING THAT ENDS A SESSION — no failure path may call it.
  // ⚠️ OFFLINE, WITH A SIGN-IN THAT COULD NOT BE RENEWED, THE LIBRARY REFUSES TO
  // SIGN OUT and removes nothing — and `@/auth/held` keeps that sign-in on
  // screen, so *Cerrar sesión* would do nothing. The phone forgets it here: the
  // same removal the library's local sign-out makes. Nothing else is kept on the
  // phone to forget: the query cache is keyed on the login (`kitchensKey`).
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      removeKey(deviceStore(), SESSION_KEY);
      setSession(null);
    }
  }, []);

  const value = useMemo<Auth>(
    () => ({ session, ready, signIn, signUp, signInWithGoogle, appleAvailable, signInWithApple, askAppleAgain, signOut }),
    [session, ready, signIn, signUp, signInWithGoogle, appleAvailable, signInWithApple, askAppleAgain, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** The session in force, and the things that change it. */
export function useAuth(): Auth {
  return useContext(AuthContext);
}
