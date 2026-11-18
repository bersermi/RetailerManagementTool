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
import { ES } from '@/strings';

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

/** As much of a signed-in user as her account's row reads: `Quien`, and how she signs in. */
export interface SuCuenta extends Quien {
  readonly app_metadata?: Readonly<Record<string, unknown>> | null;
}

/** How she signs in, in her words — `null` for a way this build does not name. */
export function comoEntra(user: SuCuenta | null | undefined): string | null {
  const provider = user?.app_metadata?.provider;
  return provider === 'google' || provider === 'apple' || provider === 'email' ? ES.ayudante.entras[provider] : null;
}

/**
 * ⚠️ `10.9b-ii`: HER ACCOUNT'S ROW in a helper's *Mi cocina* (the family-shell page's *Ayudante*:
 * *Lupita*, *lupita@correo.mx · entras con Google*) — her name, and under it her address and how
 * she signs in. With no name, the address is the name and the line says only how she signs in.
 */
export function cuentaDe(user: SuCuenta | null | undefined): { readonly titulo: string; readonly detalle: string | null } | null {
  const titulo = quienEntro(user);
  if (titulo === null) return null;
  const email = typeof user?.email === 'string' && user.email.trim() !== '' ? user.email.trim() : null;
  const partes = [email === titulo ? null : email, comoEntra(user)].filter((p): p is string => p !== null);
  return { titulo, detalle: partes.length > 0 ? partes.join(ES.ayudante.separador) : null };
}
