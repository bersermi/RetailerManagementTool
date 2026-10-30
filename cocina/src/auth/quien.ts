// ============================================================================
// WHO IS SIGNED IN, IN WORDS SHE RECOGNISES. Plan task `10.4b-iii-a`.
//
// The landing says *Entraste como …* so a person with two accounts — or the
// owner, trying this app with his Wera login — sees which one this is. Her name
// first (`FULL_NAME_KEY`: typed at *Crear cuenta*, Google's, or Apple's first
// sign-in), and the address only when there is no name: an address Apple
// invented (`…@privaterelay.appleid.com`) says nothing she would recognise, and
// Apple's first sign-in normally leaves a name.
// ============================================================================

import { FULL_NAME_KEY } from '@/auth/credentials';

/** As much of a signed-in user as this reads. */
export interface Quien {
  readonly email?: string | null;
  readonly user_metadata?: Readonly<Record<string, unknown>> | null;
}

/** Her name, else her address, else `null` (then the line is not drawn). */
export function quienEntro(user: Quien | null | undefined): string | null {
  if (user === null || user === undefined) return null;
  const name = user.user_metadata?.[FULL_NAME_KEY];
  if (typeof name === 'string' && name.trim() !== '') return name.trim().replace(/\s+/g, ' ');
  const email = user.email;
  if (typeof email === 'string' && email.trim() !== '') return email.trim();
  return null;
}
