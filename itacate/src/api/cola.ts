// ============================================================================
// HER *YA LO TENGO*, KEPT ON THE PHONE UNTIL IT GOES. Plan task `10.9j-ii-a` — the
// handover with no signal, her half (the owner's J4 of 2026-11-20: *"Ya lo tengo with
// no signal kept and sent with its minute"*). ADR-035 §2.6, *Offline*: the phone writes
// to a local queue, draws it at once, and sends it when it can; a retry is free because
// the database keeps the first.
//
// ⚠️⚠️ WERA COCINA'S QUEUE, CUT TO ONE KIND (`cocina/src/api/cola.ts`, `10.5b-iv-b`): the
// same store (one key, read and written whole and synchronously), the same single-flight
// drain, the same reading of a failure — no signal and an unrenewed sign-in stop the
// drain, only the database's last word drops a send — and the same rule that a send goes
// only while the login that made it is in. Wera Cocina's has four kinds and an order
// between them (a thumb never ahead of its handover); hers has one, so nothing waits
// behind anything. What must not drift between the two is held by `test/gemelos.test.ts`
// (`FlushStop`, the session's codes); the rest is pinned by `test/cola.test.ts`.
//
// ⚠️⚠️ ONE PATH, ONLINE AND OFFLINE (Wera's C10.3): *Ya lo tengo* is ALWAYS queued first and
// sent from the queue, never awaited by the screen — she is at the counter with the plate in
// her hand, and a write on a weak signal waits up to 30 seconds for its answer
// (`@/lib/plazo`). The screen draws what waits (`apartadosConCola`): *Ya lo tienes* at once,
// *Guardado en este teléfono…* while it waits, her stars once it lands.
//
// ⚠️ WHAT THE DATABASE ALREADY DOES FOR IT (`0088`): `confirm_my_pickup` takes `p_at`, her
// phone's minute, kept between the reservation's making and now, and takes the swipe when
// THAT minute is within a day of her window — so a swipe made at the counter and sent two
// days later is taken; a second send keeps the first moment. AT MOST ONE PER RESERVATION
// (`encolar`): a second swipe changes nothing.
//
// ⚠️ IT LIVES IN THE PHONE'S KEY-VALUE STORE (`@/lib/store`), ITS OWN KEY — neither the
// session's removal nor her kept tickets' (`@/lib/boletos`) touches it. ⚠️ AND IT OUTLIVES
// *Cerrar sesión*: each send names the login that made it and is sent only while that login
// is in (`usuario`) — a swipe is her record, and another person's session would sign it
// (the drawing's table, *What each phone keeps*: *it waits until that account signs in
// again, as Wera Cocina's kept handovers do*).
//
// Nothing here talks: the send, the store and the clock are handed in (`PuertosDeCola`);
// `@/lib/cola` binds them.
// ============================================================================

import { confirmArgs, fallaDe, type Apartado, type ConfirmArgs, type Falla } from '@/api/apartados';
import { readKey, writeKey, type DeviceStore } from '@/lib/store';

/** The one key the queue is written under. ⚠️ Namespaced: the store is shared with the session and her tickets. */
export const COLA_KEY = 'itacate.cola';

/** The shape written, as a version. A blob of another shape is read as empty, never as this one. */
export const COLA_FORMA = 1;

/** How long a refusal stays drawn on its reservation. Past it, the ticket says what the database says. */
export const RECHAZO_MS = 24 * 60 * 60_000;

// ----------------------------------------------------------------------------
// What waits
// ----------------------------------------------------------------------------

/** *Ya lo tengo*, swiped. */
export interface Envio {
  readonly tipo: 'recogi';
  /** The login that made it — the only one it is sent for. */
  readonly usuario: string;
  /** The reservation it is about: its identity, with `tipo` — one per reservation. */
  readonly reserva: string;
  /** When she swiped, ISO — sent as `p_at`, the minute it happened. */
  readonly en: string;
}

/** A send the database refused for good, drawn on its reservation until she swipes again or a day passes. */
export interface Rechazo {
  readonly usuario: string;
  readonly reserva: string;
  readonly tipo: Envio['tipo'];
  readonly falla: Falla;
  readonly en: string;
}

/** Everything the key holds. */
export interface EstadoDeCola {
  readonly envios: readonly Envio[];
  readonly rechazos: readonly Rechazo[];
}

export const VACIA: EstadoDeCola = { envios: [], rechazos: [] };

/** What a screen asks to queue. */
export interface Nuevo {
  readonly tipo: 'recogi';
  readonly usuario: string;
  readonly reserva: string;
  readonly en: Date;
}

const mismo = (a: { tipo: string; reserva: string; usuario: string }, b: { tipo: string; reserva: string; usuario: string }) =>
  a.tipo === b.tipo && a.reserva === b.reserva && a.usuario === b.usuario;

/**
 * The queue with one more swipe. ⚠️ AT MOST ONE PER RESERVATION: a second swipe changes
 * nothing — the first minute is hers, as the database keeps the first — and a refusal drawn
 * on the same reservation is cleared: she is trying again.
 */
export function encolar(estado: EstadoDeCola, nuevo: Nuevo): EstadoDeCola {
  const rechazos = estado.rechazos.filter((r) => !mismo(r, nuevo));
  if (estado.envios.some((e) => mismo(e, nuevo))) return { envios: estado.envios, rechazos };
  const envio: Envio = { tipo: 'recogi', usuario: nuevo.usuario, reserva: nuevo.reserva, en: nuevo.en.toISOString() };
  return { envios: [...estado.envios, envio], rechazos };
}

/** What one send asks of the database: `confirm_my_pickup`'s arguments, with her phone's minute. */
export interface Llamada {
  readonly tipo: 'recogi';
  readonly args: ConfirmArgs;
}

export function llamadaDe(envio: Envio): Llamada {
  return { tipo: 'recogi', args: confirmArgs(envio.reserva, new Date(envio.en)) };
}

// ----------------------------------------------------------------------------
// Drawn over the read — what waits is what she sees
// ----------------------------------------------------------------------------

/** The sends of one login, in their order. */
export function deLaUsuaria(estado: EstadoDeCola, usuario: string | null): readonly Envio[] {
  if (usuario === null) return [];
  return estado.envios.filter((e) => e.usuario === usuario);
}

/**
 * Her reservations as the read says, with every swipe still waiting laid over them: a
 * reservation she swiped is collected — `recogido`, its seal gone (a QR for a plate she has
 * is no use to anyone) — so it leaves her tickets at once, and after a restart with no signal
 * too. ⚠️ ITS STARS WAIT: `rate_until` is the database's, sent once the swipe lands, so until
 * then *Calificar* is not offered (`porCalificar`) and the screen says they wait.
 */
export function apartadosConCola(apartados: readonly Apartado[], envios: readonly Envio[]): Apartado[] {
  const recogidas = new Set(envios.filter((e) => e.tipo === 'recogi').map((e) => e.reserva));
  if (recogidas.size === 0) return [...apartados];
  return apartados.map((a): Apartado => (recogidas.has(a.id) && a.estado !== 'recogido' ? { ...a, estado: 'recogido', sello: null } : a));
}

/** Whether her *Ya lo tengo* for this reservation is still on the phone. */
export function recogiEsperando(envios: readonly Envio[], reserva: string): boolean {
  return envios.some((e) => e.tipo === 'recogi' && e.reserva === reserva);
}

/** The refusal drawn on one reservation, if a swipe about it was refused in the last day. */
export function rechazoDe(estado: EstadoDeCola, usuario: string | null, reserva: string, now: Date): Rechazo | null {
  if (usuario === null) return null;
  const vivos = estado.rechazos.filter((r) => r.usuario === usuario && r.reserva === reserva && now.getTime() - new Date(r.en).getTime() < RECHAZO_MS);
  return vivos.length === 0 ? null : vivos[vivos.length - 1];
}

// ----------------------------------------------------------------------------
// When a send fails — which failures wait, and which are the database's last word
// ----------------------------------------------------------------------------

/**
 * ⚠️ THE MESSAGE `confirm_my_pickup` REFUSES WITH WHEN THE RESERVATION IS NOT HERS (`0079`,
 * `0088`: `… that reservation is not one of yours`, `42501`). ⚠️⚠️ ONLY THAT `42501` IS FINAL —
 * Wera Cocina's rule (`NO_ES_DE_SU_COCINA`): the same code comes back when the call reached the
 * database with NO session (supabase-js sends the publishable key when it could not renew
 * hers, and the client roles have no EXECUTE — *permission denied for function …*), which is a
 * phone that has not renewed its sign-in yet, never a refusal of her swipe.
 */
export const NO_ES_SUYO = /reservation is not one of yours/;

/** The codes PostgREST answers when the token itself was refused — her sign-in, not the send. */
export const CODIGOS_DE_SESION: readonly string[] = ['PGRST301', 'PGRST302', 'PGRST303'];

/** The codes that are the database's last word on her swipe, and what she is told. */
export const FINALES: Readonly<Record<string, Falla>> = {
  // Cancelled and not handed over, or her minute more than a day after its window (`0088`).
  TD018: 'yaNoPendiente',
  // A value the function cannot read — never sent by this app; waiting would not change it.
  '22P02': 'otra',
};

/**
 * What a failed send means for the queue — Wera Cocina's four:
 *   `senal`       no answer — the drain stops; the signal's ladder tries again
 *   `sesion`      her sign-in was not renewed — the drain stops, the same way
 *   `esperar`     anything else unknown — this reservation's send waits, the others go on
 *   `final`       the database's last word — the send leaves the queue, drawn on its ticket
 */
export type Desenlace =
  | { readonly tipo: 'senal' }
  | { readonly tipo: 'sesion' }
  | { readonly tipo: 'esperar' }
  | { readonly tipo: 'final'; readonly falla: Falla };

/** Takes `unknown`: a dead link throws a `TypeError`, PostgREST answers an object. */
export function desenlaceDe(error: unknown): Desenlace {
  if (fallaDe(error) === 'sinSenal') return { tipo: 'senal' };
  if (typeof error !== 'object' || error === null) return { tipo: 'esperar' };
  const code = (error as { code?: unknown }).code;
  const message = (error as { message?: unknown }).message;
  if (typeof code === 'string' && CODIGOS_DE_SESION.includes(code)) return { tipo: 'sesion' };
  if (code === '42501') {
    return typeof message === 'string' && NO_ES_SUYO.test(message) ? { tipo: 'final', falla: 'sesion' } : { tipo: 'sesion' };
  }
  if (typeof code === 'string' && code in FINALES) return { tipo: 'final', falla: FINALES[code] };
  return { tipo: 'esperar' };
}

// ----------------------------------------------------------------------------
// The store
// ----------------------------------------------------------------------------

const texto = (v: unknown): v is string => typeof v === 'string' && v !== '';
const momento = (v: unknown): v is string => texto(v) && !Number.isNaN(new Date(v).getTime());

function envioOf(v: unknown): Envio | null {
  if (typeof v !== 'object' || v === null) return null;
  const e = v as Record<string, unknown>;
  if (e.tipo !== 'recogi' || !texto(e.usuario) || !texto(e.reserva) || !momento(e.en)) return null;
  return { tipo: 'recogi', usuario: e.usuario, reserva: e.reserva, en: e.en };
}

const FALLAS: readonly Falla[] = ['sesion', 'yaNoPendiente', 'sinSenal', 'otra'];

function rechazoOf(v: unknown): Rechazo | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;
  if (r.tipo !== 'recogi' || !texto(r.usuario) || !texto(r.reserva) || !momento(r.en)) return null;
  if (typeof r.falla !== 'string' || !(FALLAS as readonly string[]).includes(r.falla)) return null;
  return { usuario: r.usuario, reserva: r.reserva, tipo: 'recogi', falla: r.falla as Falla, en: r.en };
}

/**
 * The queue as the phone holds it. ⚠️ A SEND IT CANNOT READ IS LEFT OUT, never the queue — and
 * a blob of another shape is empty: hydrating one this code does not understand would send
 * something nobody asked for.
 */
export function leerCola(store: DeviceStore | undefined): EstadoDeCola {
  const raw = readKey(store, COLA_KEY);
  if (raw === null) return VACIA;
  try {
    const parsed = JSON.parse(raw) as { forma?: unknown; envios?: unknown; rechazos?: unknown };
    if (parsed?.forma !== COLA_FORMA) return VACIA;
    const envios = (Array.isArray(parsed.envios) ? parsed.envios : []).map(envioOf).filter((e): e is Envio => e !== null);
    const rechazos = (Array.isArray(parsed.rechazos) ? parsed.rechazos : []).map(rechazoOf).filter((r): r is Rechazo => r !== null);
    return { envios, rechazos };
  } catch {
    return VACIA;
  }
}

/** The queue written whole, refusals older than a day dropped. ⚠️ Synchronous: written before the screen says *Ya lo tienes*. */
export function escribirCola(store: DeviceStore | undefined, estado: EstadoDeCola, now: Date): EstadoDeCola {
  const limpio: EstadoDeCola = {
    envios: estado.envios,
    rechazos: estado.rechazos.filter((r) => now.getTime() - new Date(r.en).getTime() < RECHAZO_MS),
  };
  writeKey(store, COLA_KEY, JSON.stringify({ forma: COLA_FORMA, ...limpio }));
  return limpio;
}

// ----------------------------------------------------------------------------
// The drain
// ----------------------------------------------------------------------------

/**
 * Why a drain stopped — Wera's `FlushStop` (`app/src/api/flush.ts`), word for word, because
 * the signal's machine (`@/api/connectivity`, Wera's twin) reads it:
 *   `drained`  nothing of this login's is left that could go
 *   `failed`   something waits — the ladder tries again
 *   `busy`     another drain is running over the same queue; nothing was attempted
 */
export type FlushStop = 'drained' | 'failed' | 'busy';

export interface Drenado {
  readonly stop: FlushStop;
  readonly llegaron: number;
  readonly rechazados: number;
}

/** What the drain is handed — every impure thing. `@/lib/cola` binds them. */
export interface PuertosDeCola {
  /** The queue as stored now. */
  leer(): EstadoDeCola;
  /** Store it — synchronously — and tell whoever draws it. */
  escribir(estado: EstadoDeCola): void;
  /** The login signed in now, or `null`. */
  usuario(): string | null;
  /** The call. Throws the database's error, or the network's. */
  enviar(llamada: Llamada): Promise<unknown>;
  /** ⚠️ It landed: draw it into the cached read before it leaves the queue (`@/lib/ColaProvider`) — awaited. */
  llego(envio: Envio): void | Promise<void>;
  ahora(): Date;
}

/**
 * The one drain over the queue. ⚠️ SINGLE-FLIGHT: a second call while one runs answers `busy`
 * and sends nothing. The signed-in login's sends only, each tried once a drain, in the order
 * made:
 *   - landed: drawn into the cache, then removed;
 *   - no signal, or her sign-in not renewed: the drain stops;
 *   - anything else unknown: that one waits, the others go on;
 *   - the database's last word: removed, and drawn on its ticket (`rechazos`).
 * `drained` once nothing of hers is left; else `failed`, and the signal's ladder tries again.
 */
export function crearDrenaje(puertos: PuertosDeCola): { drenar(): Promise<Drenado> } {
  let corriendo = false;

  async function drenar(): Promise<Drenado> {
    if (corriendo) return { stop: 'busy', llegaron: 0, rechazados: 0 };
    corriendo = true;
    let llegaron = 0;
    let rechazados = 0;
    try {
      const usuario = puertos.usuario();
      if (usuario === null) return { stop: 'drained', llegaron, rechazados };
      const intentadas = new Set<string>();
      for (;;) {
        // ⚠️ A NEW LOGIN ENDS THE DRAIN (Wera Cocina's review of `10.5b-iv-b`): her sends would go on
        // under the next person's session — signed by them, or refused for good as not theirs.
        if (puertos.usuario() !== usuario) break;
        const envio = puertos.leer().envios.find((e) => e.usuario === usuario && !intentadas.has(e.reserva));
        if (envio === undefined) break;
        intentadas.add(envio.reserva);
        try {
          await puertos.enviar(llamadaDe(envio));
        } catch (error) {
          const desenlace = desenlaceDe(error);
          if (desenlace.tipo === 'senal' || desenlace.tipo === 'sesion') break;
          if (desenlace.tipo === 'esperar') continue;
          const ahora = puertos.leer();
          rechazados += 1;
          const rechazo: Rechazo = {
            usuario: envio.usuario,
            reserva: envio.reserva,
            tipo: envio.tipo,
            falla: desenlace.falla,
            en: puertos.ahora().toISOString(),
          };
          puertos.escribir({
            envios: ahora.envios.filter((e) => !mismo(e, envio)),
            rechazos: [...ahora.rechazos.filter((r) => !mismo(r, rechazo)), rechazo],
          });
          continue;
        }
        try {
          await puertos.llego(envio);
        } catch {
          // Drawing it failed — the re-read after the drain draws it; the send itself landed.
        }
        llegaron += 1;
        const ahora = puertos.leer();
        puertos.escribir({ envios: ahora.envios.filter((e) => !mismo(e, envio)), rechazos: ahora.rechazos });
      }
      const restan = puertos.leer().envios.some((e) => e.usuario === usuario);
      return { stop: restan ? 'failed' : 'drained', llegaron, rechazados };
    } finally {
      corriendo = false;
    }
  }

  return { drenar };
}
