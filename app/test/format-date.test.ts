import { describe, expect, it } from 'vitest';

import { formatExpiry, formatWaiting } from '@/format/date';
import { ES } from '@/strings';

// ============================================================================
// WHEN A CODE STOPS WORKING. Plan task 5b-ii-b-1, finding `P4`.
//
// ⚠️⚠️ AND THE FIRST THING TO SAY IS WHAT THIS SUITE CANNOT TELL YOU, because
// `mxn.test.ts` had twenty-six green assertions while the app it tested crashed
// on launch: THESE RUN UNDER NODE. The app runs under Hermes. That is the whole
// reason `@/format/date` touches no `Intl` at all — arithmetic on a `Date` and a
// table of month names is the part of this both runtimes agree on, and a green
// run here is evidence about node either way.
//
// ⚠️ EVERY CASE BUILDS ITS DATE FROM LOCAL PARTS (`new Date(y, m, d)`) RATHER
// THAN FROM A `Z` STRING. `formatExpiry` reads `getMonth()` and `getDate()`,
// which are the device's own timezone — deliberately, because the person reading
// it is holding the phone in the shop. A UTC literal in a test would pass or
// fail on the machine's `TZ` rather than on the code, which is a flake waiting
// for whoever next runs the suite on a plane.
// ============================================================================

/** An ISO string for a given local calendar day, so the assertion is TZ-stable. */
const localISO = (year: number, monthIndex: number, day: number): string =>
  new Date(year, monthIndex, day, 12, 0, 0).toISOString();

describe('formatExpiry', () => {
  it('reads as a day a shopkeeper can act on', () => {
    expect(formatExpiry(localISO(2026, 8, 25))).toBe('25 de septiembre');
  });

  it('names every month the way the strings file does', () => {
    for (let month = 0; month < 12; month += 1) {
      expect(formatExpiry(localISO(2026, month, 15))).toBe(`15 de ${ES.dates.months[month]}`);
    }
  });

  // ⚠️ NO YEAR, AND IT IS A CHOICE ABOUT THIS VALUE: an invite lives seven days
  // (0028), so the year is a word that is wrong to read aloud fifty-one weeks
  // out of fifty-two.
  it('carries no year', () => {
    const rendered = formatExpiry(localISO(2026, 8, 25));
    expect(rendered).not.toContain('2026');
  });

  // ⚠️ NO TIME EITHER. The expiry has one to the second and saying it would
  // invite a shopkeeper to cut fine a value she cannot act on precisely.
  it('carries no time', () => {
    const rendered = formatExpiry(new Date(2026, 8, 25, 14, 32, 7).toISOString()) ?? '';
    expect(rendered).not.toMatch(/\d\d:\d\d/);
    expect(rendered).toBe('25 de septiembre');
  });

  it('does not pad the day, because nobody says "el 05 de mayo"', () => {
    expect(formatExpiry(localISO(2026, 4, 5))).toBe('5 de mayo');
  });

  it('is the same sentence the strings file assembles', () => {
    expect(formatExpiry(localISO(2026, 0, 1))).toBe(ES.dates.dayOfMonth(1, ES.dates.months[0]));
  });

  // ⚠️ `null` AND NEVER A RENDERED `NaN`. The screen omits the line. "Expira el
  // NaN de undefined" is the app visibly broken in front of the one person who
  // cannot tell whether the rest of it worked.
  it.each([
    ['an empty string', ''],
    ['whitespace', '   '],
    ['prose', 'la semana que entra'],
    ['null', null],
    ['undefined', undefined],
  ])('returns null for %s rather than a broken sentence', (_label, bad) => {
    expect(formatExpiry(bad)).toBeNull();
  });

  it('never returns a string containing NaN or undefined', () => {
    for (const input of ['', 'nope', null, undefined, 'x', '2026-13-45']) {
      const out = formatExpiry(input);
      if (out !== null) {
        expect(out).not.toContain('NaN');
        expect(out).not.toContain('undefined');
      }
    }
  });

  it('survives a leap day', () => {
    expect(formatExpiry(localISO(2028, 1, 29))).toBe('29 de febrero');
  });

  it('reads the real shape 0028 returns, offset and all', () => {
    // Not TZ-stable as a DAY, so this asserts only that a timestamptz with an
    // offset parses and renders at all — the day itself is pinned above.
    expect(formatExpiry('2026-09-25T18:00:00+00:00')).toMatch(/^\d{1,2} de [a-zé]+$/);
  });
});

// ============================================================================
// HOW LONG SOMEBODY HAS BEEN WAITING. Plan task `5b-iii-d-1`.
//
// ⚠️⚠️ `now` IS PASSED IN ON EVERY ASSERTION, WHICH IS THE WHOLE REASON THE
// FUNCTION TAKES IT. A version that read `Date.now()` itself would be one whose
// assertions change meaning at midnight and fail for the next person to run the
// suite late in the evening — the same class of flake the local-parts rule above
// exists for, one axis over.
//
// ⚠️ THE DAYS ARE CALENDAR DAYS IN THE DEVICE'S TIMEZONE, so these cases are
// built from local parts too, and the 23:50-to-00:10 pair is the one that would
// pass on a 24-hour-block implementation and is wrong on a phone.
// ============================================================================

/** A local wall-clock instant, so the calendar-day arithmetic is TZ-stable. */
const localAt = (
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
  minute = 0,
): Date => new Date(year, monthIndex, day, hour, minute, 0);

describe('formatWaiting', () => {
  it('says today for an ask made this morning', () => {
    expect(formatWaiting(localAt(2026, 8, 20, 9).toISOString(), localAt(2026, 8, 20, 17))).toBe(
      ES.dates.waiting.today,
    );
  });

  it('says yesterday for an ask made yesterday', () => {
    expect(formatWaiting(localAt(2026, 8, 19).toISOString(), localAt(2026, 8, 20))).toBe(
      ES.dates.waiting.yesterday,
    );
  });

  // ⚠️ THE CASE A 24-HOUR BLOCK GETS WRONG, and it is not exotic: a shop closes
  // at midnight and the owner looks at the queue with his coffee. Ten minutes
  // after midnight, a request made twenty minutes earlier is YESTERDAY to the
  // person standing in the shop, and `hoy` to arithmetic on milliseconds.
  it('crosses midnight the way a person does, not the way a timer does', () => {
    expect(
      formatWaiting(localAt(2026, 8, 19, 23, 50).toISOString(), localAt(2026, 8, 20, 0, 10)),
    ).toBe(ES.dates.waiting.yesterday);
  });

  it('counts whole days past that, and says how many', () => {
    expect(formatWaiting(localAt(2026, 8, 17).toISOString(), localAt(2026, 8, 20))).toBe(
      'Pidió hace 3 días',
    );
  });

  // ⚠️ IT NEVER SAYS `hace 0 días` OR `hace 1 días`, which is the whole reason
  // the three cases are three strings in `@/strings` instead of one template: the
  // plural is wrong in Spanish at one, and nobody says the zero out loud.
  it('never renders the two counts Spanish has no plural for', () => {
    for (const days of [0, 1]) {
      const out = formatWaiting(localAt(2026, 8, 20 - days).toISOString(), localAt(2026, 8, 20));
      expect(out).not.toContain(`hace ${days}`);
    }
  });

  // ⚠️ A PHONE WHOSE CLOCK IS BEHIND THE SERVER'S READS AS `hoy`, never as a
  // negative number. `Pidió hace -1 días` is the app visibly broken in front of
  // the one person who cannot tell whether the rest of it worked.
  it('absorbs a clock that is behind the database', () => {
    expect(formatWaiting(localAt(2026, 8, 21).toISOString(), localAt(2026, 8, 20))).toBe(
      ES.dates.waiting.today,
    );
  });

  it('returns null rather than a sentence with NaN in it', () => {
    for (const input of ['', '   ', 'nope', null, undefined, '2026-13-45']) {
      expect(formatWaiting(input, localAt(2026, 8, 20))).toBeNull();
    }
  });

  it('reads the real shape 0037 returns, offset and all', () => {
    expect(formatWaiting('2026-09-19T18:00:00+00:00', localAt(2026, 8, 20))).not.toBeNull();
  });
});
