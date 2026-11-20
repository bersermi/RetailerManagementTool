// ============================================================================
// HER TICKETS, KEPT ON HER PHONE. Plan task `10.9j-ii-a` — the owner's J1 of 2026-11-20
// (*"yes to all"*): *"Itacate keeps her reservations on her phone: each one still to
// collect — the code and its QR, the kitchen and its address, what she reserved and its
// price, how she pays and eats, her hour, when it was read; no photos — until collected,
// cancelled or a day past its window, all at Cerrar sesión; with no signal Itacate opens on
// her ticket under Sin señal. Lo que ves se leyó a las 13:40."*
//
// ⚠️⚠️ THE ONE READ THIS APP KEEPS ON THE DISK. Itacate's rule since `10.5-iii-a` — nothing of a
// read on the phone — gives way for this one, by his ruling, and only this far:
//   * ONLY WHAT IS STILL TO COLLECT: a row of `my_reservations` with a seal — the database sends
//     `seal` exactly while a reservation is not handed over, not confirmed, not cancelled and no
//     more than a day past its window (`0088`), so the rule of what is kept is the database's,
//     read here, never counted again. Her history (*Anteriores*, 30 days) stays in memory.
//   * NO PHOTOS: each dish's `image_path` and the kitchen's `logo_path` are blanked before it is
//     written, so a deleted kitchen's photos still leave her phone at once (the aviso's promise);
//     her ticket draws the kitchen's colour and initials instead.
//   * A DAY PAST ITS WINDOW IT IS NOT READ BACK, even if no read with signal has written over it.
//   * WITH THE MOMENT IT WAS READ, which *Sin señal. Lo que ves se leyó a las 13:40.* says.
//   * PER LOGIN: written under her id and read back only for it.
//   * FORGOTTEN AT *CERRAR SESIÓN* (`olvidarBoletos`, `AuthProvider.signOut`) — never on a
//     session that is merely `null`, which a renewal that failed with no signal also is
//     (`@/auth/held`).
//
// Its own key, beside her *Ya lo tengo* queue's (`@/lib/cola`, which outlives *Cerrar sesión*).
// Pure but for the store, which is handed in; `test/boletos.test.ts` pins every rule.
// ============================================================================

import { readKey, removeKey, writeKey, type DeviceStore } from '@/lib/store';

/** The one key her tickets are written under. ⚠️ Namespaced: the store is shared with the session and the queue. */
export const BOLETOS_KEY = 'itacate.boletos';

/** The shape written, as a version. A blob of another shape is read as nothing, never as this one. */
export const BOLETOS_FORMA = 1;

/** How long after its window a ticket is still read back: a day — `0088`'s `seal`, and `confirm_my_pickup`'s day. */
export const BOLETO_DESPUES_MS = 24 * 3_600_000;

/** What the phone holds: whose, when it was read, and the rows as the database sent them, without photos. */
export interface Boletos {
  readonly usuario: string;
  readonly leidoEn: Date;
  readonly filas: readonly unknown[];
}

const object = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** A row is still to collect when the database sealed it (`0088`). */
const tieneSello = (fila: unknown): boolean => {
  const r = object(fila);
  return r !== null && typeof r.seal === 'string' && r.seal !== '';
};

/** Whether a row's window ended more than a day before `now`. A row whose window it cannot read is past. */
function pasado(fila: unknown, now: Date): boolean {
  const r = object(fila);
  const hasta = typeof r?.held_until === 'string' ? new Date(r.held_until).getTime() : Number.NaN;
  return Number.isNaN(hasta) || now.getTime() > hasta + BOLETO_DESPUES_MS;
}

/** One row with every photo's path blanked — the kitchen's logo and each dish's picture. */
function sinFotos(fila: unknown): unknown {
  const r = object(fila);
  if (r === null) return fila;
  const kitchen = object(r.kitchen);
  const page = object(kitchen?.page);
  const lines = r.lines;
  return {
    ...r,
    ...(kitchen === null ? {} : { kitchen: { ...kitchen, ...(page === null ? {} : { page: { ...page, logo_path: null } }) } }),
    ...(Array.isArray(lines) ? { lines: lines.map((l) => (object(l) === null ? l : { ...(l as Record<string, unknown>), image_path: null })) } : {}),
  };
}

/**
 * What of a read is kept: the rows still to collect, without photos. ⚠️ Takes the database's
 * answer as it came (`unknown`): a row this build cannot read is kept as it is and left out when
 * it is read back, exactly as a live read leaves it out (`apartadosFrom`).
 */
export function aGuardar(data: unknown): unknown[] {
  return (Array.isArray(data) ? data : []).filter(tieneSello).map(sinFotos);
}

/** Her tickets written whole, after a read with signal. ⚠️ Nothing to keep is a key removed, never an empty list left behind. */
export function guardarBoletos(store: DeviceStore | undefined, usuario: string, leidoEn: Date, data: unknown): void {
  const filas = aGuardar(data);
  if (filas.length === 0) {
    removeKey(store, BOLETOS_KEY);
    return;
  }
  writeKey(store, BOLETOS_KEY, JSON.stringify({ forma: BOLETOS_FORMA, usuario, leidoEn: leidoEn.toISOString(), filas }));
}

/**
 * Her tickets as the phone holds them, for this login — those still within a day of their
 * window — or `null`: another login's, another shape, nothing left, or nothing there.
 */
export function leerBoletos(store: DeviceStore | undefined, usuario: string | null, now: Date): Boletos | null {
  if (usuario === null) return null;
  const raw = readKey(store, BOLETOS_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { forma?: unknown; usuario?: unknown; leidoEn?: unknown; filas?: unknown };
    if (parsed?.forma !== BOLETOS_FORMA || parsed.usuario !== usuario || typeof parsed.leidoEn !== 'string') return null;
    const leidoEn = new Date(parsed.leidoEn);
    if (Number.isNaN(leidoEn.getTime())) return null;
    const filas = (Array.isArray(parsed.filas) ? parsed.filas : []).filter((f) => tieneSello(f) && !pasado(f, now));
    return filas.length === 0 ? null : { usuario, leidoEn, filas };
  } catch {
    return null;
  }
}

/** *Cerrar sesión*: everything kept of her reservations goes. */
export function olvidarBoletos(store: DeviceStore | undefined): void {
  removeKey(store, BOLETOS_KEY);
}
