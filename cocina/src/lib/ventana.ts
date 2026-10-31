// ============================================================================
// THE PICKUP WINDOW — WHEN NEIGHBOURS MAY COME FOR WHAT SHE PUBLISHED. Plan task
// `10.4b-iv-a`.
//
// ⚠️ THE DATABASE'S RULE, AND THE FORM NEVER SENDS A WINDOW IT WOULD REFUSE
// (`publish_listing`, `0072`): one that has not ended, starts within a day and
// lasts at most twelve hours. The two steppers move by a quarter of an hour and
// stop where that rule stops them, so the refusal is out of reach — except by
// time passing while the form stays open, which `checkVentana` catches at
// *Publicar*.
//
// ⚠️ IN THE PHONE'S OWN TIME. The phone is in her kitchen, so its clock and its
// zone are the kitchen's — Wera's rule, the device's clock is the shop's day.
// Quarters and days are LOCAL (`new Date(y, m, d, h, min)`) and the database is
// sent the instant (`toISOString`). `test/ventana.test.ts` pins
// `America/Mexico_City` and asserts the pin took: the Mac is UTC−6, CI is UTC,
// and a local-time boundary checked under UTC proves nothing.
//
// ⚠️ NO NATIVE TIME PICKER: none is in this app's build, and the SDK is frozen
// through the pilot (`cocina/CLAUDE.md`). A quarter-hour stepper needs no
// keyboard and fits the windows the drawing walked through — *17:00 a 18:00*,
// *20:15 a 20:45* (`10.3`, proposal B's kitchens).
// ============================================================================

import { ES } from '@/strings';

/** How far one tap moves a time. */
export const STEP_MINUTES = 15;
const STEP_MS = STEP_MINUTES * 60_000;

/** The longest window `publish_listing` takes. */
export const LONGEST_MS = 12 * 60 * 60_000;

/** How far ahead a window may start (`publish_listing`). */
export const AHEAD_MS = 24 * 60 * 60_000;

/** A window's length when the form opens: an hour, the drawing's *17:30–18:30*. */
export const FIRST_LENGTH_MS = 60 * 60_000;

/** A pickup window, as two instants. */
export interface Ventana {
  readonly start: Date;
  readonly end: Date;
}

/** The quarter hour `at` falls in — 16:40 is in 16:30's. Local. */
export function quarterOf(at: Date): Date {
  const minutes = Math.floor(at.getMinutes() / STEP_MINUTES) * STEP_MINUTES;
  return new Date(at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), minutes);
}

/** The first quarter hour after `at` — 16:40 → 16:45, and 16:45 sharp → 17:00. */
export function quarterAfter(at: Date): Date {
  return new Date(quarterOf(at).getTime() + STEP_MS);
}

/** The window the form opens with: from the next quarter hour, for an hour. */
export function firstVentana(now: Date): Ventana {
  const start = quarterAfter(now);
  return { start, end: new Date(start.getTime() + FIRST_LENGTH_MS) };
}

/**
 * ⚠️ THE EARLIEST START IS THE QUARTER NOW IS IN — a window already open: at
 * 16:40, *desde 16:30* means *ya pueden pasar*. The database takes any start as
 * long as the window has not ended.
 */
function earliestStart(now: Date): number {
  return quarterOf(now).getTime();
}

/** The latest start: the last quarter hour within a day of now. */
function latestStart(now: Date): number {
  return quarterOf(new Date(now.getTime() + AHEAD_MS)).getTime();
}

/** The earliest end: a quarter after the start, and after now. */
function earliestEnd(v: Ventana, now: Date): number {
  return Math.max(v.start.getTime() + STEP_MS, quarterAfter(now).getTime());
}

/** The latest end: twelve hours after the start. */
function latestEnd(v: Ventana): number {
  return v.start.getTime() + LONGEST_MS;
}

/** Can the start move a quarter that way? Greys the button when it cannot. */
export function canMoveStart(v: Ventana, by: -1 | 1, now: Date): boolean {
  return by < 0 ? v.start.getTime() > earliestStart(now) : v.start.getTime() < latestStart(now);
}

/**
 * The start a quarter earlier or later, and the end with it — the window keeps
 * its length, as a calendar does. ⚠️ A START LEFT BEHIND BY TIME PASSING jumps
 * to the earliest one allowed, so *+* always gets her out of an ended window.
 */
export function moveStart(v: Ventana, by: -1 | 1, now: Date): Ventana {
  if (!canMoveStart(v, by, now)) return v;
  const start = Math.min(latestStart(now), Math.max(earliestStart(now), v.start.getTime() + by * STEP_MS));
  const length = v.end.getTime() - v.start.getTime();
  return { start: new Date(start), end: new Date(start + length) };
}

/** Can the end move a quarter that way? */
export function canMoveEnd(v: Ventana, by: -1 | 1, now: Date): boolean {
  return by < 0 ? v.end.getTime() > earliestEnd(v, now) : v.end.getTime() < latestEnd(v);
}

/** The end a quarter earlier or later: at least a quarter after the start and after now, at most twelve hours. */
export function moveEnd(v: Ventana, by: -1 | 1, now: Date): Ventana {
  if (!canMoveEnd(v, by, now)) return v;
  const end = Math.min(latestEnd(v), Math.max(earliestEnd(v, now), v.end.getTime() + by * STEP_MS));
  return { start: v.start, end: new Date(end) };
}

/** What `publish_listing` would refuse in a window at this moment (all `22023`). */
export type VentanaIssue = 'backwards' | 'ended' | 'tooFar' | 'tooLong';

/** The first thing wrong with a window now, in the database's terms, or `null`. */
export function checkVentana(v: Ventana, now: Date): VentanaIssue | null {
  const start = v.start.getTime();
  const end = v.end.getTime();
  if (end <= start) return 'backwards';
  if (end <= now.getTime()) return 'ended';
  if (start > now.getTime() + AHEAD_MS) return 'tooFar';
  if (end - start > LONGEST_MS) return 'tooLong';
  return null;
}

/**
 * *Repetir*'s window: a past window's hours again, whole days later — the first
 * time they have not ended. ⚠️ TODAY IF IT IS STILL AHEAD OR OPEN, TOMORROW
 * OTHERWISE: the cafetería that bags the same thing every evening at 19:30
 * repeats yesterday's at 19:00 and gets today's. Never more than a day ahead,
 * because a window that ended today starts again tomorrow before this hour.
 */
export function repeatVentana(start: Date, end: Date, now: Date): Ventana {
  const length = Math.min(LONGEST_MS, Math.max(STEP_MS, end.getTime() - start.getTime()));
  for (let days = 0; days < 3; days += 1) {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, start.getHours(), start.getMinutes());
    if (next.getTime() + length > now.getTime()) return { start: next, end: new Date(next.getTime() + length) };
  }
  return firstVentana(now);
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
