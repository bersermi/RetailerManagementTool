// ============================================================================
// HER HANDOVERS AND HER THUMBS, KEPT ON THE PHONE UNTIL THEY GO. Plan task
// `10.5b-iv-b` — the handover with no signal (the owner's questions 7–10 of
// 2026-11-05: *"it works without signal"*). ADR-035 §2.6, *Offline*: the phone
// writes to a local queue, draws it at once, and sends it when it can; a retry is
// free because the database keeps the first.
//
// ⚠️⚠️ ONE PATH, ONLINE AND OFFLINE (Wera's C10.3): *Ya cobré y lo entregué* and her
// thumb are ALWAYS queued first and sent from the queue, never awaited by the screen.
// A write on a weak signal waits up to 30 seconds for its answer (`@/lib/plazo`); a
// neighbour is standing at the counter. So the screen is told nothing about the
// network — it draws what waits (`conCola`) — and a refusal that comes back later is
// drawn on the order it belongs to (`rechazos`).
//
// ⚠️ WHAT THE DATABASE ALREADY DOES FOR IT (`0079`, `0080`): `hand_over_reservation`
// and `rate_neighbour` take `p_at`, her phone's moment, kept between the order's
// making and now; a second handover keeps the first moment; the same thumb sent again
// answers it. So a send whose answer was lost is sent again and nothing doubles.
//
// ⚠️⚠️ A THUMB NEVER GOES AHEAD OF ITS HANDOVER: `rate_neighbour` refuses a thumb on
// an order that is not collected yet (`TD022`). The queue is sent in the order it was
// made, and an order whose earlier send did not go keeps its later ones waiting.
//
// ⚠️ AT MOST ONE OF EACH PER ORDER (`encolar`): a second handover changes nothing —
// the database keeps the first; a second thumb replaces the first's content and keeps
// its moment and its place — the database would keep the first moment of a change
// too; a handover clears a *No se presentó* waiting for the same order — `0080`'s
// *Sí pasó* deletes that thumb.
//
// ⚠️ IT LIVES IN THE PHONE'S KEY-VALUE STORE (`@/lib/store`, SQLite under it), ONE
// KEY, NOT A TABLE OF ITS OWN — unlike Wera's outbox (`app/src/lib/outboxDb.ts`): a
// fonda's queue is a few handovers, read and written whole and synchronously, so the
// whole of it can be run by the suite against a store in memory (`test/cola.test.ts`),
// where Wera's SQLite half is deliberately untestable. Its own key, so neither the
// session's removal nor the cache's touches it. ⚠️ AND IT OUTLIVES *Cerrar sesión*:
// each send names the login that made it and is sent only while that login is in
// (`usuario`) — a handover is her record, and another person's session would sign it.
//
// Nothing here talks: the sends, the store and the clock are handed in
// (`PuertosDeCola`); `@/lib/cola` binds them.
// ============================================================================

import {
  DIA_PARA_CALIFICAR_MS,
  NO_SE_PRESENTO,
  etiquetasDelLado,
  fallaDe,
  handOverArgs,
  noSePresentoArgs,
  rateNeighbourArgs,
  type Etiqueta,
  type Falla,
  type HandOverArgs,
  type RateNeighbourArgs,
  type Reserva,
  type SobreElVecino,
} from '@/api/apartados';
import { readKey, writeKey, type DeviceStore } from '@/lib/store';

/** The one key the queue is written under. ⚠️ Namespaced: the store is shared with the session and the cache. */
export const COLA_KEY = 'cocina.cola';

/** The shape written, as a version. A blob of another shape is read as empty, never as this one. */
export const COLA_FORMA = 1;

/** How long a refusal stays drawn on its order. Past it, the order says what the database says. */
export const RECHAZO_MS = 24 * 60 * 60_000;

// ----------------------------------------------------------------------------
// What waits
// ----------------------------------------------------------------------------

interface EnvioBase {
  /** The login that made it — the only one it is sent for. */
  readonly usuario: string;
  /** Her kitchen, so a screen counts and draws only the open kitchen's. */
  readonly cocina: string;
  /** The reservation it is about. With `tipo`, its identity: one of each per order. */
  readonly reserva: string;
  /** When she tapped, ISO — sent as `p_at`, the moment it happened. */
  readonly en: string;
  /** Raised by every change of its content, so a send that went out before a change never removes the change. */
  readonly version: number;
}

/** *Ya cobré y lo entregué*, *Ya la serví* or *Sí pasó*. */
export interface EntregaEnCola extends EnvioBase {
  readonly tipo: 'entrega';
}

/** Her thumb — up or down with the labels of its side, or *No se presentó* alone. */
export interface PulgarEnCola extends EnvioBase {
  readonly tipo: 'pulgar';
  readonly arriba: boolean;
  readonly etiquetas: readonly Etiqueta[];
}

export type Envio = EntregaEnCola | PulgarEnCola;

/** A send the database refused for good, drawn on its order until she acts on it again or a day passes. */
export interface Rechazo {
  readonly usuario: string;
  readonly cocina: string;
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
export type Nuevo =
  | { readonly tipo: 'entrega'; readonly usuario: string; readonly cocina: string; readonly reserva: string; readonly en: Date }
  | {
      readonly tipo: 'pulgar';
      readonly usuario: string;
      readonly cocina: string;
      readonly reserva: string;
      readonly en: Date;
      readonly arriba: boolean;
      readonly etiquetas: readonly string[];
    };

const mismo = (a: { tipo: string; reserva: string; usuario: string }, b: { tipo: string; reserva: string; usuario: string }) =>
  a.tipo === b.tipo && a.reserva === b.reserva && a.usuario === b.usuario;

const esNoSePresento = (e: Envio): boolean => e.tipo === 'pulgar' && e.etiquetas.includes(NO_SE_PRESENTO);

/** Her thumb's labels as the database takes them: *No se presentó* alone, else those of its side. */
function etiquetasDe(arriba: boolean, etiquetas: readonly string[]): Etiqueta[] {
  if (!arriba && etiquetas.includes(NO_SE_PRESENTO)) return [NO_SE_PRESENTO];
  return etiquetasDelLado(arriba, etiquetas);
}

/**
 * The queue with one more send. ⚠️ AT MOST ONE OF EACH PER ORDER — see the header — and a
 * refusal drawn on the same order and kind is cleared: she is trying again.
 */
export function encolar(estado: EstadoDeCola, nuevo: Nuevo): EstadoDeCola {
  const rechazos = estado.rechazos.filter((r) => !mismo(r, nuevo));
  if (nuevo.tipo === 'entrega') {
    if (estado.envios.some((e) => mismo(e, nuevo))) return { envios: estado.envios, rechazos };
    const envios = estado.envios.filter((e) => !(esNoSePresento(e) && e.reserva === nuevo.reserva && e.usuario === nuevo.usuario));
    const entrega: EntregaEnCola = {
      tipo: 'entrega',
      usuario: nuevo.usuario,
      cocina: nuevo.cocina,
      reserva: nuevo.reserva,
      en: nuevo.en.toISOString(),
      version: 1,
    };
    return { envios: [...envios, entrega], rechazos };
  }
  const etiquetas = etiquetasDe(nuevo.arriba, nuevo.etiquetas);
  const antes = estado.envios.find((e) => mismo(e, nuevo));
  if (antes !== undefined && antes.tipo === 'pulgar') {
    return {
      envios: estado.envios.map((e) => (e === antes ? { ...antes, arriba: nuevo.arriba, etiquetas, version: antes.version + 1 } : e)),
      rechazos,
    };
  }
  const pulgar: PulgarEnCola = {
    tipo: 'pulgar',
    usuario: nuevo.usuario,
    cocina: nuevo.cocina,
    reserva: nuevo.reserva,
    en: nuevo.en.toISOString(),
    version: 1,
    arriba: nuevo.arriba,
    etiquetas,
  };
  return { envios: [...estado.envios, pulgar], rechazos };
}

/** What one send asks of the database: its function's arguments, with her phone's moment. */
export type Llamada =
  | { readonly tipo: 'entrega'; readonly args: HandOverArgs }
  | { readonly tipo: 'pulgar'; readonly args: RateNeighbourArgs };

export function llamadaDe(envio: Envio): Llamada {
  const at = new Date(envio.en);
  if (envio.tipo === 'entrega') return { tipo: 'entrega', args: handOverArgs(envio.reserva, at) };
  return {
    tipo: 'pulgar',
    args: envio.etiquetas.includes(NO_SE_PRESENTO)
      ? noSePresentoArgs(envio.reserva, at)
      : rateNeighbourArgs(envio.reserva, { arriba: envio.arriba, etiquetas: envio.etiquetas }, at),
  };
}

// ----------------------------------------------------------------------------
// Drawn over the read — what waits is what she sees
// ----------------------------------------------------------------------------

/** The sends of one login at one kitchen, in their order. */
export function deLaCocina(estado: EstadoDeCola, usuario: string | null, cocina: string | null): readonly Envio[] {
  if (usuario === null || cocina === null) return [];
  return estado.envios.filter((e) => e.usuario === usuario && e.cocina === cocina);
}

/**
 * Her reservations as the read says, with every handover still waiting laid over them —
 * `@/lib/apartados`' `conEntrega`'s rule: her moment, never before the order was made, and a
 * handover already recorded kept. ⚠️ So the order she just handed over never comes back as
 * *por entregar* while the send waits, and after a restart with no signal neither.
 */
export function reservasConCola(reservas: readonly Reserva[], envios: readonly Envio[]): Reserva[] {
  const entregas = new Map<string, Date>();
  for (const e of envios) if (e.tipo === 'entrega' && !entregas.has(e.reserva)) entregas.set(e.reserva, new Date(e.en));
  if (entregas.size === 0) return [...reservas];
  return reservas.map((r) => {
    const at = entregas.get(r.id);
    if (at === undefined || r.entregadaEn !== null) return r;
    return { ...r, entregadaEn: new Date(Math.max(at.getTime(), r.creadaEn.getTime())) };
  });
}

/**
 * What is said of each order's neighbour, with every send still waiting laid over it: a
 * waiting handover clears a *No se presentó* (`0080`'s *Sí pasó*) and ⚠️ OPENS HER THUMB as the
 * database will once it lands — `reservation_neighbours`' `rate_until`, her window's end plus 24
 * hours, sent only for a collected or released order, so a pending order's copy has none and,
 * handed over with no signal, it could not be rated anywhere but the code's screen (the review of
 * `10.5b-iv-b`); a waiting thumb is the thumb — its moment the first one's, as the database keeps
 * it, changeable for 24 hours. `reservas` are her reservations as drawn, for their windows.
 */
export function vecinosConCola(
  vecinos: Readonly<Record<string, SobreElVecino>>,
  envios: readonly Envio[],
  reservas: readonly Reserva[],
): Record<string, SobreElVecino> {
  const out: Record<string, SobreElVecino> = { ...vecinos };
  for (const e of envios) {
    const sobre = out[e.reserva];
    if (e.tipo === 'entrega') {
      if (sobre === undefined) continue;
      const pulgar = sobre.pulgar !== null && sobre.pulgar.etiquetas.includes(NO_SE_PRESENTO) ? null : sobre.pulgar;
      const reserva = reservas.find((r) => r.id === e.reserva);
      // Her name is sent only while the neighbour's account exists — the database's `buyer_id is not null`.
      const calificarHasta =
        pulgar === null && sobre.vecino !== null && reserva !== undefined
          ? (sobre.calificarHasta ?? new Date(reserva.guardadaHasta.getTime() + DIA_PARA_CALIFICAR_MS))
          : sobre.calificarHasta;
      out[e.reserva] = { ...sobre, pulgar, calificarHasta };
      continue;
    }
    const previo = sobre?.pulgar ?? null;
    const dadoEn = previo !== null && !previo.reloj ? previo.dadoEn : new Date(e.en);
    out[e.reserva] = {
      vecino: sobre?.vecino ?? null,
      pulgar: {
        arriba: e.arriba,
        etiquetas: e.etiquetas,
        dadoEn,
        cambiarHasta: new Date(dadoEn.getTime() + DIA_PARA_CALIFICAR_MS),
        reloj: false,
      },
      calificarHasta: null,
    };
  }
  return out;
}

/** The refusal drawn on one order, if a send about it was refused in the last day. */
export function rechazoDe(estado: EstadoDeCola, usuario: string | null, reserva: string, now: Date): Rechazo | null {
  if (usuario === null) return null;
  const vivos = estado.rechazos.filter((r) => r.usuario === usuario && r.reserva === reserva && now.getTime() - new Date(r.en).getTime() < RECHAZO_MS);
  return vivos.length === 0 ? null : vivos[vivos.length - 1];
}

/** Whether her handover of this order is still on the phone. */
export function entregaEsperando(envios: readonly Envio[], reserva: string): boolean {
  return envios.some((e) => e.tipo === 'entrega' && e.reserva === reserva);
}

// ----------------------------------------------------------------------------
// When a send fails — which failures wait, and which are the database's last word
// ----------------------------------------------------------------------------

/**
 * ⚠️ THE MESSAGE THE TWO FUNCTIONS REFUSE WITH WHEN THE ORDER IS NOT AT ONE OF HER KITCHENS
 * (`0079`, `0080`: `… that reservation is not at one of your kitchens`, `42501`). ⚠️⚠️ ONLY
 * THAT `42501` IS FINAL. The same code comes back when the call reached the database with
 * NO session — supabase-js sends the publishable key when it could not renew hers, and the
 * client roles have no EXECUTE on either function (`permission denied for function …`) —
 * which is a phone that has not renewed its sign-in yet, never a refusal of the handover.
 * `docs/checks/10.5b-iv-a-handover-contract.sh` asks a real PostgREST for both and holds
 * this pattern to the first and away from the second.
 */
export const NO_ES_DE_SU_COCINA = /reservation is not at one of your kitchens/;

/** The codes PostgREST answers when the token itself was refused — her sign-in, not the send. */
export const CODIGOS_DE_SESION: readonly string[] = ['PGRST301', 'PGRST302', 'PGRST303'];

/** The codes that are the database's last word on this send, and what she is told. */
export const FINALES: Readonly<Record<string, Falla>> = {
  // A label that cannot be true there now — the order changed under her thumb.
  '22023': 'cambio',
  // Nothing to rate there now, or its 24 hours are over.
  TD022: 'yaNoSeCalifica',
  // A value the function cannot read — never sent by this app; waiting would not change it.
  '22P02': 'otra',
};

/**
 * What a failed send means for the queue:
 *   `senal`       no answer — the drain stops; the signal's ladder tries again
 *   `sesion`      her sign-in was not renewed — the drain stops, the same way
 *   `esperar`     anything else unknown — this order's sends wait, the others go on
 *   `final`       the database's last word — the send leaves the queue, drawn on its order
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
    return typeof message === 'string' && NO_ES_DE_SU_COCINA.test(message) ? { tipo: 'final', falla: 'sesion' } : { tipo: 'sesion' };
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
  if (!texto(e.usuario) || !texto(e.cocina) || !texto(e.reserva) || !momento(e.en)) return null;
  const version = typeof e.version === 'number' && Number.isInteger(e.version) && e.version > 0 ? e.version : 1;
  const base = { usuario: e.usuario, cocina: e.cocina, reserva: e.reserva, en: e.en, version };
  if (e.tipo === 'entrega') return { tipo: 'entrega', ...base };
  if (e.tipo === 'pulgar' && typeof e.arriba === 'boolean' && Array.isArray(e.etiquetas)) {
    return { tipo: 'pulgar', ...base, arriba: e.arriba, etiquetas: etiquetasDe(e.arriba, e.etiquetas.filter(texto)) };
  }
  return null;
}

const FALLAS: readonly Falla[] = ['sesion', 'cambio', 'yaNoSeCalifica', 'sinSenal', 'otra'];

function rechazoOf(v: unknown): Rechazo | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;
  if (!texto(r.usuario) || !texto(r.cocina) || !texto(r.reserva) || !momento(r.en)) return null;
  if (r.tipo !== 'entrega' && r.tipo !== 'pulgar') return null;
  if (typeof r.falla !== 'string' || !(FALLAS as readonly string[]).includes(r.falla)) return null;
  return { usuario: r.usuario, cocina: r.cocina, reserva: r.reserva, tipo: r.tipo, falla: r.falla as Falla, en: r.en };
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

/** The queue written whole, refusals older than a day dropped. ⚠️ Synchronous: written before the screen says *Entregado*. */
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
  /**
   * ⚠️ It landed: draw it into the cached read and SAVE that, before it leaves the queue (`@/lib/cola`,
   * `@/api/llegada`) — awaited, because a read in flight is cancelled first.
   */
  llego(envio: Envio, respuesta: unknown): void | Promise<void>;
  ahora(): Date;
}

/**
 * The one drain over the queue. ⚠️ SINGLE-FLIGHT: a second call while one runs answers `busy`
 * and sends nothing — two drains would send one handover twice and race a thumb's change.
 *
 * The signed-in login's sends only, each time the first in the queue's order not yet tried at
 * its present content (`version`) — so a send she makes while the drain runs goes in it too:
 *   - an order whose earlier send did not go keeps its later ones waiting (a thumb never
 *     ahead of its handover);
 *   - each read from the store as it goes, so a thumb changed while another send was on its
 *     way goes with her latest labels, and one removed meanwhile does not go;
 *   - landed: drawn into the cache and saved, then removed — unless she changed it while it
 *     was on its way, when its new content goes next;
 *   - no signal, or her sign-in not renewed: the drain stops;
 *   - the database's last word: removed, and drawn on its order (`rechazos`).
 * `drained` once nothing of hers is left; else `failed`, and the signal's ladder tries again.
 */
export function crearDrenaje(puertos: PuertosDeCola): { drenar(): Promise<Drenado> } {
  let corriendo = false;
  const clave = (e: Envio) => `${e.tipo}:${e.reserva}`;

  async function drenar(): Promise<Drenado> {
    if (corriendo) return { stop: 'busy', llegaron: 0, rechazados: 0 };
    corriendo = true;
    let llegaron = 0;
    let rechazados = 0;
    try {
      const usuario = puertos.usuario();
      if (usuario === null) return { stop: 'drained', llegaron, rechazados };
      const detenidas = new Set<string>();
      const intentados = new Map<string, number>();
      for (;;) {
        // ⚠️ A NEW LOGIN ENDS THE DRAIN (the review of `10.5b-iv-b`): her sends would go on under the next
        // person's session — signed by them, or refused for good as not at their kitchens.
        if (puertos.usuario() !== usuario) break;
        const envio = puertos
          .leer()
          .envios.find((e) => e.usuario === usuario && !detenidas.has(e.reserva) && intentados.get(clave(e)) !== e.version);
        if (envio === undefined) break;
        intentados.set(clave(envio), envio.version);
        let respuesta: unknown;
        try {
          respuesta = await puertos.enviar(llamadaDe(envio));
        } catch (error) {
          const desenlace = desenlaceDe(error);
          if (desenlace.tipo === 'senal' || desenlace.tipo === 'sesion') break;
          if (desenlace.tipo === 'esperar') {
            detenidas.add(envio.reserva);
            continue;
          }
          const ahora = puertos.leer();
          const actual = ahora.envios.find((e) => mismo(e, envio));
          // She changed it while it was on its way — her change goes next, and decides — or replaced it
          // (*Sí pasó* removes a waiting *No se presentó*): either way no refusal is hers to read.
          if (actual === undefined || actual.version !== envio.version) continue;
          rechazados += 1;
          const rechazo: Rechazo = {
            usuario: envio.usuario,
            cocina: envio.cocina,
            reserva: envio.reserva,
            tipo: envio.tipo,
            falla: desenlace.falla,
            en: puertos.ahora().toISOString(),
          };
          puertos.escribir({
            envios: ahora.envios.filter((e) => e !== actual),
            rechazos: [...ahora.rechazos.filter((r) => !mismo(r, rechazo)), rechazo],
          });
          continue;
        }
        try {
          await puertos.llego(envio, respuesta);
        } catch {
          // Drawing it failed — the drain's re-read draws it; the send itself landed.
        }
        llegaron += 1;
        const ahora = puertos.leer();
        const actual = ahora.envios.find((e) => mismo(e, envio));
        if (actual !== undefined && actual.version === envio.version) {
          puertos.escribir({ ...ahora, envios: ahora.envios.filter((e) => e !== actual) });
        }
      }
      const restan = puertos.leer().envios.some((e) => e.usuario === usuario);
      return { stop: restan ? 'failed' : 'drained', llegaron, rechazados };
    } finally {
      corriendo = false;
    }
  }

  return { drenar };
}
