// ============================================================================
// *TÚ* — WHAT ITS ROWS SAY, PURE. Plan task `10.5-v-b`, the family-shell page's *Tú*:
// her account first — her name, her address and how she signs in (*Laura ·
// laura@correo.mx · entras con Google*) — then the doors. `test/pestanas.test.ts`
// pins every case.
//
// ⚠️ NOTHING NEW IS READ: the name, the address and the providers are in the session
// the phone already holds (Supabase's `user`), as *Entraste como …* read them before
// (`@/auth/quien`, whose rule this keeps: her name first, an address Apple invented
// never shown as who she is).
// ============================================================================

import { quienEntro, type Quien } from '@/auth/quien';
import { whatsappUrl } from '@/auth/support';
import { ES } from '@/strings';

/** As much of a signed-in user as *Tú* reads: `@/auth/quien`'s, and the providers. */
export interface Usuario extends Quien {
  readonly app_metadata?: { readonly provider?: unknown; readonly providers?: unknown } | null;
}

/** A way she signs in. Supabase calls an address and a password `email`. */
export type Forma = 'google' | 'apple' | 'correo';

const ORDEN: readonly Forma[] = ['google', 'apple', 'correo'];

/** Every way this login signs in, Google first, then Apple, then her address. */
export function formasDe(user: Usuario | null | undefined): Forma[] {
  const meta = user?.app_metadata;
  const dichas = Array.isArray(meta?.providers) ? meta.providers : [meta?.provider];
  const formas = new Set<Forma>();
  for (const dicha of dichas) {
    if (dicha === 'google') formas.add('google');
    else if (dicha === 'apple') formas.add('apple');
    else if (dicha === 'email') formas.add('correo');
  }
  return ORDEN.filter((forma) => formas.has(forma));
}

/** An address Apple made up for her: it says nothing she would recognise. */
export function esDeApple(email: string): boolean {
  return /@privaterelay\.appleid\.com$/i.test(email.trim());
}

/**
 * Her account's row: who (her name, else her address) and, under it, her address when
 * the name came first — never one Apple made up — and how she signs in.
 */
export function cuentaDe(user: Usuario | null | undefined): { titulo: string | null; detalle: string | null } {
  const titulo = quienEntro(user);
  const email = typeof user?.email === 'string' ? user.email.trim() : '';
  const partes: string[] = [];
  if (email !== '' && email !== titulo && !esDeApple(email)) partes.push(email);
  const formas = formasDe(user);
  if (formas.length > 0) partes.push(ES.tu.entrasCon(formas.map((forma) => ES.tu.forma[forma])));
  return { titulo, detalle: partes.length > 0 ? partes.join(' · ') : null };
}

/**
 * *Ayuda por WhatsApp*: a chat with the owner, a sentence already typed that names this
 * app and her address — the one he can find her by, Apple's made-up one included — as
 * *¿Olvidaste tu contraseña?* does (`@/auth/support`).
 */
export function ayudaUrl(number: string, email: string | null | undefined): string {
  const suyo = (email ?? '').trim();
  return whatsappUrl(number, suyo === '' ? ES.tu.ayudaMensaje : ES.tu.ayudaMensajeConCorreo(suyo));
}
