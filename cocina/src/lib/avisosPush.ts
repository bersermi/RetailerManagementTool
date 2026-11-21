import type { Aviso, Importancia } from '@/api/push';
import { readKey, removeKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// HER PHONE'S MESSAGES FROM THE SERVER — THE RULES, WITH NO PHONE IN THEM. Plan task `10.5b-v-ii`
// (call 14 of 2026-11-05: each new reservation and each cancellation, to every member of the
// kitchen signed in on a phone, each able to turn it off in *Mi cocina*). What `@/lib/avisos`
// asks the phone and `@/lib/useAvisosDelTelefono` does on each open are decided here, so
// `test/push.test.ts` can hold every rule without a phone.
//
// ⚠️ ASKED ONCE, AFTER HER KITCHEN'S FIRST PUBLICATION (the design of `10.5c-i`, ruled as drawn):
// when what it is for is on the screen — never at sign-up. A helper's phone is asked once her
// kitchen has published, by whoever. A phone that already allows notifications (her reminder
// asked first) is not asked again; one that will no longer ask is never asked — only *Mi
// cocina*'s switch opens its settings.
// ⚠️ THE LAST TOKEN SENT IS KEPT ON THE PHONE, WITH WHOSE IT WAS: a changed token names the one
// it replaces, and *Cerrar sesión* retires it (`AuthProvider.signOut`).
// ============================================================================

/** The last token this phone sent, and for whom. */
export const TOKEN_KEY = 'cocina.push.token';
/** The phone was asked, once, after her kitchen's first publication. */
export const PREGUNTADO_KEY = 'cocina.push.preguntado';

export interface TokenGuardado {
  readonly user: string;
  readonly token: string;
}

export function leerToken(store: DeviceStore | undefined): TokenGuardado | null {
  const raw = readKey(store, TOKEN_KEY);
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw) as Partial<TokenGuardado>;
    return typeof v.user === 'string' && typeof v.token === 'string' ? { user: v.user, token: v.token } : null;
  } catch {
    return null;
  }
}

export function guardarToken(store: DeviceStore | undefined, user: string, token: string): void {
  writeKey(store, TOKEN_KEY, JSON.stringify({ user, token }));
}

export function olvidarToken(store: DeviceStore | undefined): void {
  removeKey(store, TOKEN_KEY);
}

/** The token a new one replaces: hers, sent before from this phone, and not the same. */
export function reemplaza(guardado: TokenGuardado | null, user: string, token: string): string | null {
  return guardado !== null && guardado.user === user && guardado.token !== token ? guardado.token : null;
}

/** What the phone says of notifications: whether it shows them, and whether it may still ask. */
export interface Permiso {
  readonly concedido: boolean;
  readonly puedePreguntar: boolean;
}

/** Ask the phone now? Once, after her kitchen's first publication, while it can still ask. */
export function hayQuePreguntar(publicoAlgunaVez: boolean, yaPreguntado: boolean, permiso: Permiso | null): boolean {
  return publicoAlgunaVez && !yaPreguntado && permiso !== null && !permiso.concedido && permiso.puedePreguntar;
}

/**
 * What this phone tells the database, on each open. With the phone allowing it, its token,
 * its channels and those she silenced. Refusing, the token it sent before for her — `allowed`
 * false, so nothing is sent to it; nothing at all when it never sent one for her.
 */
export function queDecir(
  user: string,
  permiso: Permiso | null,
  nuevo: string | null,
  guardado: TokenGuardado | null,
): { readonly token: string; readonly allowed: boolean } | null {
  if (permiso?.concedido === true && nuevo !== null) return { token: nuevo, allowed: true };
  if (guardado !== null && guardado.user === user) return { token: guardado.token, allowed: false };
  return null;
}

/**
 * ⚠️ A CHANGED TOKEN, OR THE PHONE REPEATING ITSELF? Asking Expo for the token makes the phone announce it
 * (measured on the emulator, 2026-11-20): only one DIFFERENT from a token already announced is a change.
 * The first announcement is never one — it is this phone's own fetch.
 */
export function esOtroToken(antes: string | null, anunciado: string): boolean {
  return antes !== null && antes !== anunciado;
}

/** A channel as the phone reads it back. */
export interface CanalLeido {
  readonly id: string;
  readonly importance: number;
}

/** The channels the phone holds, and those she silenced in its settings (importance `ninguna`). */
export function canalesDe(
  leidos: readonly CanalLeido[],
  ninguna: number,
): { readonly channels: readonly string[]; readonly silenced: readonly string[] } {
  const ids = leidos.map((c) => c.id).filter((id) => /^[A-Za-z0-9_.-]{1,64}$/.test(id)).slice(0, 20);
  return {
    channels: ids,
    silenced: leidos.filter((c) => c.importance === ninguna && ids.includes(c.id)).map((c) => c.id),
  };
}

/** Android's importance for a kind's channel — its key in `AndroidImportance`. */
export function importanciaAndroid(i: Importancia): 'HIGH' | 'DEFAULT' | 'LOW' {
  return i === 'alta' ? 'HIGH' : i === 'baja' ? 'LOW' : 'DEFAULT';
}

/** The kind a message from the server carries, or `null` — her reminders carry none. */
export function kindDe(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const kind = (data as { kind?: unknown }).kind;
  return typeof kind === 'string' && /^[a-z_]+$/.test(kind) ? kind : null;
}

/** Where a tap opens, from the places this build knows — anything else opens nothing. */
export const RUTAS: Readonly<Record<string, '/apartados'>> = { apartados: '/apartados' };

export function rutaDelToque(data: unknown): '/apartados' | null {
  if (kindDe(data) === null) return null;
  const abre = (data as { opens?: unknown }).opens;
  return typeof abre === 'string' && Object.prototype.hasOwnProperty.call(RUTAS, abre) ? RUTAS[abre] : null;
}

/** The kinds she switches in *Mi cocina*: the service ones. */
export function enMiCocina(avisos: readonly Aviso[] | undefined): readonly Aviso[] {
  return (avisos ?? []).filter((a) => a.deServicio);
}
