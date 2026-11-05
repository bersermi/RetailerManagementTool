// ============================================================================
// THE PICKUP WINDOW, AS A NEIGHBOUR READS IT. Plan task `10.5-iv-a-i`.
//
// ⚠️ WERA COCINA'S WORDS FOR A WINDOW, COPIED (`cocina/src/lib/ventana.ts`, plan
// `10.4b-iv-a`): *Hoy · 17:00 a 18:00* in the app she published it from reads
// *Hoy · 17:00 a 18:00* here. Only the reading half — the steppers that set a window
// are hers. Every block below is that file's, word for word, and
// `test/gemelos.test.ts` runs both files over the same moments under a pinned zone.
//
// ⚠️ IN THE PHONE'S OWN TIME, as there: the phone is in the neighbour's hand, in
// the kitchen's city — the zone is Mexico City's on both (`ZONA_DE_BUSQUEDA`).
// ============================================================================

import { ES } from '@/strings';

/** A pickup window, as two instants. */
export interface Ventana {
  readonly start: Date;
  readonly end: Date;
}

/** Calendar days from `now`'s day to `at`'s, in the phone's zone: 0 today, 1 tomorrow, −1 yesterday. */
export function daysFrom(now: Date, at: Date): number {
  const from = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const to = Date.UTC(at.getFullYear(), at.getMonth(), at.getDate());
  return Math.round((to - from) / 86_400_000);
}

/** `17:00`, `9:45` — Wera's clock (`formatClock`): twenty-four hours, no leading zero. */
export function clockOf(at: Date): string {
  return `${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`;
}

/** The day as she says it — *Hoy*, *Mañana*, *Ayer*, else *Lun 27* (Wera's short pickup day). */
export function dayOf(at: Date, now: Date): string {
  const away = daysFrom(now, at);
  if (away === 0) return ES.fechas.hoy;
  if (away === 1) return ES.fechas.manana;
  if (away === -1) return ES.fechas.ayer;
  return ES.fechas.dia(ES.fechas.dias[at.getDay()], at.getDate());
}

/** One time with its day — *Hoy 17:00* — what a stepper shows. */
export function momentOf(at: Date, now: Date): string {
  return ES.fechas.momento(dayOf(at, now), clockOf(at));
}

/**
 * A window in one phrase — *Hoy · 17:00 a 18:00*, Wera's slot (`slotShort`). A
 * window that crosses midnight names the end's day too: *Hoy · 22:00 a mañana 1:00*.
 */
export function slotOf(v: Ventana, now: Date): string {
  const sameDay = daysFrom(v.start, v.end) === 0;
  const end = sameDay ? clockOf(v.end) : ES.fechas.momento(dayOf(v.end, now).toLowerCase(), clockOf(v.end));
  return ES.fechas.horario(dayOf(v.start, now), clockOf(v.start), end);
}
