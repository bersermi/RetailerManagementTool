import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  AHEAD_MS,
  LONGEST_MS,
  STEP_MINUTES,
  canMoveEnd,
  canMoveStart,
  checkVentana,
  clockOf,
  dayOf,
  daysFrom,
  firstVentana,
  momentOf,
  moveEnd,
  moveStart,
  quarterAfter,
  quarterOf,
  repeatVentana,
  slotOf,
  type Ventana,
} from '@/lib/ventana';

// ============================================================================
// THE PICKUP WINDOW'S ARITHMETIC. Plan task `10.4b-iv-a`.
//
// ⚠️ EVERY CASE HERE IS A LOCAL-TIME BOUNDARY, and under UTC a local quarter, a
// local day and local midnight are UTC's — so a case that confused the two would
// pass. The zone is pinned to the kitchen's (`America/Mexico_City`, `0012`'s
// default for a store) and the first case asserts the pin took. Every local
// moment is built INSIDE its `it`, after the pin (a `describe`-scope `Date` is
// made before `beforeAll` runs). Run `TZ=UTC npx vitest run` to see CI's side.
//
// The database's own rule — a window that has not ended, starts within a day and
// lasts at most twelve hours — is `0072`'s; `test/listing.test.ts` holds this
// file's two limits to the migration's text.
// ============================================================================

const ZONE = 'America/Mexico_City';
let before: string | undefined;
beforeAll(() => {
  before = process.env.TZ;
  process.env.TZ = ZONE;
});
afterAll(() => {
  if (before === undefined) delete process.env.TZ;
  else process.env.TZ = before;
});

/** A local moment in the kitchen's zone — month counted from 1, as she says it. */
const at = (y: number, mo: number, d: number, h: number, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s);
const span = (v: Ventana) => [clockOf(v.start), clockOf(v.end)];

describe('the zone the cases run in', () => {
  it('is Mexico City, six hours behind UTC, or nothing below means anything', () => {
    expect(new Date(2026, 9, 31, 12).getTimezoneOffset()).toBe(360);
    expect(at(2026, 10, 31, 17).toISOString()).toBe('2026-10-31T23:00:00.000Z');
  });
});

describe('quarters of an hour, in the kitchen’s time', () => {
  it('a moment is in the quarter it started in, and the next quarter is strictly after it', () => {
    expect(STEP_MINUTES).toBe(15);
    expect(quarterOf(at(2026, 10, 31, 16, 40, 30))).toEqual(at(2026, 10, 31, 16, 30));
    expect(quarterAfter(at(2026, 10, 31, 16, 40))).toEqual(at(2026, 10, 31, 16, 45));
    expect(quarterAfter(at(2026, 10, 31, 16, 45))).toEqual(at(2026, 10, 31, 17, 0));
    expect(quarterAfter(at(2026, 10, 31, 23, 50))).toEqual(at(2026, 11, 1, 0, 0));
  });

  it('the form opens on the next quarter, for an hour — the drawing’s 17:30–18:30 shape', () => {
    const v = firstVentana(at(2026, 10, 31, 16, 40));
    expect(v.start).toEqual(at(2026, 10, 31, 16, 45));
    expect(v.end).toEqual(at(2026, 10, 31, 17, 45));
  });
});

describe('moving Desde', () => {
  it('moves Hasta with it: the window keeps its length', () => {
    const now = at(2026, 10, 31, 16, 40);
    const v = moveStart(firstVentana(now), 1, now);
    expect(span(v)).toEqual(['17:00', '18:00']);
    expect(span(moveStart(v, -1, now))).toEqual(['16:45', '17:45']);
  });

  it('goes back as far as the quarter now is in — a window already open — and no further', () => {
    const now = at(2026, 10, 31, 16, 40);
    const open = moveStart(firstVentana(now), -1, now);
    expect(span(open)).toEqual(['16:30', '17:30']);
    expect(canMoveStart(open, -1, now)).toBe(false);
    expect(moveStart(open, -1, now)).toBe(open);
  });

  it('goes forward until the last quarter within a day, and no further', () => {
    const now = at(2026, 10, 31, 16, 40);
    let v = firstVentana(now);
    for (let i = 0; i < 200; i += 1) v = moveStart(v, 1, now);
    expect(v.start).toEqual(at(2026, 11, 1, 16, 30));
    expect(v.start.getTime()).toBeLessThanOrEqual(now.getTime() + AHEAD_MS);
    expect(canMoveStart(v, 1, now)).toBe(false);
    expect(checkVentana(v, now)).toBeNull();
  });

  it('a window left behind by time passing jumps to now on +, so she is never stuck', () => {
    const opened = at(2026, 10, 31, 16, 40);
    const stale = firstVentana(opened);
    const later = at(2026, 10, 31, 18, 50);
    expect(checkVentana(stale, later)).toBe('ended');
    expect(canMoveStart(stale, -1, later)).toBe(false);
    const fresh = moveStart(stale, 1, later);
    expect(span(fresh)).toEqual(['18:45', '19:45']);
    expect(checkVentana(fresh, later)).toBeNull();
  });
});

describe('moving Hasta', () => {
  it('stops a quarter after Desde', () => {
    const now = at(2026, 10, 31, 16, 40);
    let v = firstVentana(now);
    for (let i = 0; i < 10; i += 1) v = moveEnd(v, -1, now);
    expect(span(v)).toEqual(['16:45', '17:00']);
    expect(canMoveEnd(v, -1, now)).toBe(false);
  });

  it('stops twelve hours after Desde — the database’s longest window', () => {
    const now = at(2026, 10, 31, 16, 40);
    let v = firstVentana(now);
    for (let i = 0; i < 100; i += 1) v = moveEnd(v, 1, now);
    expect(v.end.getTime() - v.start.getTime()).toBe(LONGEST_MS);
    expect(v.end).toEqual(at(2026, 11, 1, 4, 45));
    expect(canMoveEnd(v, 1, now)).toBe(false);
    expect(checkVentana(v, now)).toBeNull();
  });

  it('never ends at or before now, even when Desde was left in the past', () => {
    const now = at(2026, 10, 31, 16, 40);
    const open: Ventana = { start: at(2026, 10, 31, 16, 30), end: at(2026, 10, 31, 16, 45) };
    expect(canMoveEnd(open, -1, now)).toBe(false);
    expect(moveEnd(open, -1, now)).toBe(open);
  });
});

describe('what the database would refuse, at the moment of Publicar', () => {
  it('names each refusal, and a window exactly at the limits passes', () => {
    const now = at(2026, 10, 31, 16, 40);
    const v = (start: Date, end: Date): Ventana => ({ start, end });
    expect(checkVentana(v(at(2026, 10, 31, 18), at(2026, 10, 31, 17)), now)).toBe('backwards');
    expect(checkVentana(v(at(2026, 10, 31, 16), at(2026, 10, 31, 16, 40)), now)).toBe('ended');
    expect(checkVentana(v(new Date(now.getTime() + AHEAD_MS + 60_000), new Date(now.getTime() + AHEAD_MS + 3_600_000)), now)).toBe('tooFar');
    expect(checkVentana(v(at(2026, 10, 31, 17), at(2026, 11, 1, 5, 15)), now)).toBe('tooLong');
    expect(checkVentana(v(at(2026, 10, 31, 17), at(2026, 11, 1, 5)), now)).toBeNull();
    expect(checkVentana(v(new Date(now.getTime() + AHEAD_MS), new Date(now.getTime() + AHEAD_MS + 60_000)), now)).toBeNull();
  });
});

describe('Repetir’s window: the same hours, on the next day they have not ended', () => {
  it('today when they are still ahead, or open now', () => {
    const before = { start: at(2026, 10, 30, 19, 30), end: at(2026, 10, 30, 20) };
    expect(repeatVentana(before.start, before.end, at(2026, 10, 31, 19))).toEqual({ start: at(2026, 10, 31, 19, 30), end: at(2026, 10, 31, 20) });
    expect(repeatVentana(before.start, before.end, at(2026, 10, 31, 19, 45))).toEqual({ start: at(2026, 10, 31, 19, 30), end: at(2026, 10, 31, 20) });
  });

  it('tomorrow once today’s have ended — and that is within a day', () => {
    const now = at(2026, 10, 31, 20, 30);
    const v = repeatVentana(at(2026, 10, 30, 19, 30), at(2026, 10, 30, 20), now);
    expect(v).toEqual({ start: at(2026, 11, 1, 19, 30), end: at(2026, 11, 1, 20) });
    expect(checkVentana(v, now)).toBeNull();
  });

  it('a window across midnight keeps its length', () => {
    const v = repeatVentana(at(2026, 10, 29, 22), at(2026, 10, 30, 1), at(2026, 10, 31, 23));
    expect(v).toEqual({ start: at(2026, 10, 31, 22), end: at(2026, 11, 1, 1) });
  });
});

describe('days and times as she says them', () => {
  it('counts calendar days in the kitchen’s zone, not UTC’s', () => {
    // 17:00 and 19:00 on the 31st locally are the 31st and the 1st in UTC.
    expect(daysFrom(at(2026, 10, 31, 17), at(2026, 10, 31, 19))).toBe(0);
    expect(daysFrom(at(2026, 10, 31, 17), at(2026, 11, 1, 0, 5))).toBe(1);
    expect(daysFrom(at(2026, 10, 31, 0, 5), at(2026, 10, 30, 23, 55))).toBe(-1);
  });

  it('Wera’s clock, and today, tomorrow, yesterday by name, every other day by its weekday', () => {
    const now = at(2026, 10, 31, 16, 40); // a Saturday
    expect(clockOf(at(2026, 10, 31, 9, 5))).toBe('9:05');
    expect(clockOf(at(2026, 10, 31, 17))).toBe('17:00');
    expect(clockOf(at(2026, 11, 1, 0))).toBe('0:00');
    expect(dayOf(at(2026, 10, 31, 23, 59), now)).toBe('Hoy');
    expect(dayOf(at(2026, 11, 1, 0, 0), now)).toBe('Mañana');
    expect(dayOf(at(2026, 10, 30, 12), now)).toBe('Ayer');
    expect(dayOf(at(2026, 11, 2, 12), now)).toBe('Lun 2');
    expect(dayOf(at(2026, 10, 28, 12), now)).toBe('Mié 28');
    expect(momentOf(at(2026, 10, 31, 17), now)).toBe('Hoy 17:00');
  });

  it('a window in one phrase, Wera’s slot — the end’s day named when it is another', () => {
    const now = at(2026, 10, 31, 16, 40);
    expect(slotOf({ start: at(2026, 10, 31, 17), end: at(2026, 10, 31, 18) }, now)).toBe('Hoy · 17:00 a 18:00');
    expect(slotOf({ start: at(2026, 10, 31, 22), end: at(2026, 11, 1, 1) }, now)).toBe('Hoy · 22:00 a mañana 1:00');
    expect(slotOf({ start: at(2026, 10, 30, 20, 15), end: at(2026, 10, 30, 20, 45) }, now)).toBe('Ayer · 20:15 a 20:45');
  });
});
