import { PREMIO, type Aviso, type Importancia } from '@/api/push';
import { readKey, removeKey, writeKey, type DeviceStore } from '@/lib/store';

// ============================================================================
// HER PHONE'S MESSAGES FROM THE SERVER — THE RULES, WITH NO PHONE IN THEM. Plan task `10.5c-iii`:
// Itacate's phones join `0092`'s plumbing as Wera Cocina's did (`cocina/src/lib/avisosPush.ts`,
// `10.5b-v-ii`), so `0094`'s messages — the bell, *¡Ganaste!*, the stamps' reminder, a card closing
// or its kitchen leaving — and `0093`'s campaigns reach her. What `@/lib/avisos` asks the phone and
// `@/lib/AvisosDelTelefono` does on each open are decided here, so `test/push.test.ts` holds every
// rule without a phone.
//
// ⚠️ ITACATE ASKS THE PHONE ONLY WHEN WHAT IT IS FOR IS ON THE SCREEN — never on an open: after a
// reservation goes through (her reminder, `10.5b-iii-b`), when she rings a kitchen's bell, when she
// turns a switch on in *Notificaciones*, and after *Sí, avísame* on the offers' sheet. Each open only
// tells the database what the phone already allows.
// ⚠️ THE LAST TOKEN SENT IS KEPT ON THE PHONE, WITH WHOSE IT WAS: a changed token names the one it
// replaces, and *Cerrar sesión* retires it (`AuthProvider.signOut`).
// ============================================================================

/** The last token this phone sent, and for whom. */
export const TOKEN_KEY = 'itacate.push.token';

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
 * (measured on Wera Cocina's emulator, 2026-11-20): only one DIFFERENT from a token already announced is a
 * change. The first announcement is never one — it is this phone's own fetch.
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

/**
 * The send's number a campaign's message carries (`0093`'s `send_id`), or `null` — a service message
 * carries none. A tap is reported with it (`count_campaign_tap`) and nothing else.
 */
export function envioDe(data: unknown): number | null {
  if (kindDe(data) === null) return null;
  const send = (data as { send_id?: unknown }).send_id;
  return typeof send === 'number' && Number.isSafeInteger(send) && send > 0 ? send : null;
}

/** A place a tap may open — the stack's own addresses, so `router.navigate` takes it as it is. */
export type DestinoDelToque =
  | { readonly pathname: '/' }
  | { readonly pathname: '/mis-cocinas' }
  | { readonly pathname: '/apartados' }
  | { readonly pathname: '/cocina/[id]'; readonly params: { readonly id: string } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ⚠️ WHERE A TAP OPENS, FROM THE PLACES THIS BUILD KNOWS — anything else opens nothing (the app, as any tap).
 * `0094`'s messages: `cocina` her page (the bell), `tarjeta` her card — drawn on that kitchen's page
 * (`@/ui/SeccionTarjeta`, or `@/ui/PaginaDeTarjeta` once it left) — and `mis_cocinas`. `0093`'s campaigns may
 * name any of them, or `cerca` (the list, the kind's own) and `apartados`. A place that needs a kitchen and
 * carries none opens nothing.
 */
export function destinoDelToque(data: unknown): DestinoDelToque | null {
  if (kindDe(data) === null) return null;
  const { opens, opens_id: id } = data as { opens?: unknown; opens_id?: unknown };
  const cocina = typeof id === 'string' && UUID.test(id) ? id : null;
  switch (opens) {
    case 'cerca':
      return { pathname: '/' };
    case 'mis_cocinas':
      return { pathname: '/mis-cocinas' };
    case 'apartados':
      return { pathname: '/apartados' };
    case 'cocina':
    case 'tarjeta':
      return cocina === null ? null : { pathname: '/cocina/[id]', params: { id: cocina } };
    default:
      return null;
  }
}

/**
 * ⚠️ WHILE ITACATE IS IN FRONT, A MESSAGE FROM THE DATABASE IS SHOWN as anywhere else (SDK 57 drops it
 * otherwise) — BUT *¡GANASTE!*: the screen already celebrates it (`@/lib/Festejos`, at the read of her
 * cards the message starts), so a banner too would say it twice.
 */
export function mostrarEnFrente(data: unknown): boolean {
  const kind = kindDe(data);
  return kind !== null && kind !== PREMIO;
}

/** What a message makes the app read again at once: her cards (the card's kinds), or the kitchens. */
export function queLeerOtraVez(abre: string | null): 'tarjetas' | 'cocinas' | null {
  if (abre === 'tarjeta') return 'tarjetas';
  if (abre === 'cocina' || abre === 'mis_cocinas' || abre === 'cerca') return 'cocinas';
  return null;
}

/** *Notificaciones*' rows: a switch per service or on-request kind, and offers as ONE row. */
export interface Filas {
  readonly interruptores: readonly Aviso[];
  /** Every promotion kind moves with her one answer (`0093`): drawn once, with the first one's words. */
  readonly ofertas: Aviso | null;
}

export function filasDe(avisos: readonly Aviso[] | undefined): Filas {
  const todos = avisos ?? [];
  const promos = todos.filter((a) => a.clase === 'promocion');
  return {
    interruptores: todos.filter((a) => a.clase !== 'promocion'),
    ofertas: promos.length === 0 ? null : { ...promos[0], encendido: promos.some((a) => a.encendido) },
  };
}
