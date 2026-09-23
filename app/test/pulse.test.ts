import { describe, expect, it } from 'vitest';

import * as pulse from '@/theme/pulse';
import {
  BANNER_FADE_MS,
  BANNER_HOLD_MS,
  NEW_PRODUCT_BLINKS,
  PULSE_DIM,
  PULSE_HALF_MS,
  bannerSequence,
  pulseSequence,
  pulseTotalMs,
} from '@/theme/pulse';

// ============================================================================
// THE TWO ANIMATIONS `5e-ii` SHIPPED, AS DATA. Plan task `5e-ii`, reworked
// 2026-09-23 on the owner's ruling.
//
// ⚠️⚠️ §2.11 REFUSES SUITES OVER RENDERING, SO THIS PINS THE PART THAT IS NOT
// RENDERING. `src/navigation/inicio.ts` made the same trade for the order of
// Inicio's bands: the timing is a value a node suite can load, the `Animated`
// call is in the screen where nothing here may reach it (`R2`).
//
// ⚠️ WHAT IT CANNOT SEE: whether three blinks read as *this is the one you just
// made* rather than as a rendering fault, and whether 260ms is a blink or a
// flicker on a phone rather than in a number. `R9`, and the owner's phone.
// ============================================================================

describe('the blink that says this product is new', () => {
  // ⚠️⚠️ THE ASSERTION THAT MATTERS MOST, AND IT IS ABOUT THE LAST LEG. An odd
  // number of legs leaves the row permanently dimmed, and a dimmed row on a price
  // list reads as *unavailable* — which this app means somewhere else (C3.12's
  // dash) and must not imply here by accident.
  it('rests at full opacity, whatever the blink count', () => {
    for (const blinks of [1, 2, 3, 7]) {
      const steps = pulseSequence(blinks);
      expect(steps[steps.length - 1].toValue).toBe(1);
    }
  });

  it('is two legs per blink — down and back', () => {
    expect(pulseSequence(3)).toHaveLength(6);
    expect(pulseSequence(1)).toEqual([
      { toValue: PULSE_DIM, duration: PULSE_HALF_MS },
      { toValue: 1, duration: PULSE_HALF_MS },
    ]);
  });

  // ⚠️ IT DIMS RATHER THAN VANISHING. A row that went to zero reads as the list
  // re-rendering — or worse, as the product being deleted a second after it was
  // made.
  it('never goes to zero', () => {
    expect(PULSE_DIM).toBeGreaterThan(0);
    expect(pulseSequence().every((step) => step.toValue > 0)).toBe(true);
  });

  // ⚠️ IT ENDS. A row that blinked for ever would be a state nobody can clear, on
  // the one screen a shopkeeper keeps open.
  it('is finite and defaults to three blinks', () => {
    expect(NEW_PRODUCT_BLINKS).toBe(3);
    expect(pulseSequence()).toEqual(pulseSequence(NEW_PRODUCT_BLINKS));
    expect(pulseTotalMs()).toBe(NEW_PRODUCT_BLINKS * 2 * PULSE_HALF_MS);
  });

  it('asks for nothing at all when asked for nothing', () => {
    expect(pulseSequence(0)).toEqual([]);
    expect(pulseSequence(-2)).toEqual([]);
    expect(pulseTotalMs(0)).toBe(0);
  });
});

describe('the banner that says the family was let go', () => {
  it('arrives, holds, and leaves', () => {
    expect(bannerSequence().map((step) => step.toValue)).toEqual([1, 1, 0]);
  });

  // ⚠️⚠️ THIS ASSERTION WAS INVERTED ON 2026-09-23 AND THE REASON IS WORTH KEEPING.
  // It used to demand `>= 2000`, on the argument that eight Spanish words take two
  // seconds to read. The argument was right; the design was wrong — the form is
  // about to be saved and left, so no hold makes it readable. The owner moved the
  // reading to Productos, where the banner PERSISTS, and cut this one to a glimpse:
  // "show the banner for a second in the form screen but it should persist in the
  // catalog screen once we go back there."
  it('is a glimpse on the form — about a second, not long enough to read', () => {
    expect(BANNER_HOLD_MS).toBe(1000);
    const hold = bannerSequence()[1];
    expect(hold.toValue).toBe(1);
    expect(hold.duration).toBe(BANNER_HOLD_MS);
  });

  // ⚠️⚠️ AND THE READABLE COPY HAS NO TIMING AT ALL, WHICH IS WHAT *persists*
  // MEANS. This is an EQUALITY over the module's surface, the shape
  // `auth-errors.test.ts` uses for "the library has exactly one caller": nothing
  // here fades the banner on Productos, and a future `catalogBannerSequence` or
  // `CATALOG_BANNER_HOLD_MS` would turn this red and make the next person confront
  // the ruling rather than quietly undo it.
  it('exports no timing for the copy that persists', () => {
    expect(Object.keys(pulse).sort()).toEqual([
      'BANNER_FADE_MS',
      'BANNER_HOLD_MS',
      'NEW_PRODUCT_BLINKS',
      'PULSE_DIM',
      'PULSE_HALF_MS',
      'bannerSequence',
      'pulseSequence',
      'pulseTotalMs',
    ]);
  });

  // ⚠️ IT ENDS AT ZERO: the family was released, he has been told why, and a
  // banner that stayed would be a warning about a state he has already accepted.
  it('ends invisible rather than merely quiet', () => {
    const steps = bannerSequence();
    expect(steps[steps.length - 1]).toEqual({ toValue: 0, duration: BANNER_FADE_MS });
  });

  // ⚠️ THE FADE IS SHORTER THAN THE HOLD, or the sentence would be readable for
  // less of its life than it spends moving.
  it('moves faster than it rests', () => {
    expect(BANNER_FADE_MS).toBeLessThan(BANNER_HOLD_MS);
  });
});
