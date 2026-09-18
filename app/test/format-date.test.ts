import { describe, expect, it } from 'vitest';

import { formatExpiry } from '@/format/date';
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
