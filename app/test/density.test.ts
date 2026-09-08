// ============================================================================
// C3.18 — THE TWO DENSITY MODES. Plan task 5a-ii.
//
// ⚠️⚠️ READ THE BOUNDARY BEFORE ADDING TO THIS FILE. ADR-035 §2.11, amended
// 2026-09-07, allows a unit test that pins **a value a customer sees or the
// ledger stores** and REFUSES suites over rendering, navigation and layout.
// A test that mounted a row and measured its height would be the refused kind.
//
// These two are here on a narrower argument: C3.18 is a PROMISE — "elder mode
// is bigger, everywhere" and "nothing drops below the platform's touch floor" —
// and a promise about numbers in a table is checkable without rendering
// anything. No component is imported in this file. If the owner reads this and
// disagrees, deleting it costs one file and loses no coverage of `formatMXN`.
//
// WHAT IT PROTECTS AGAINST, CONCRETELY. Not somebody deleting elder mode —
// that is loud. It is somebody tuning one screen, nudging a normal-mode number
// up to match what looks right, and leaving ONE token where the two modes are
// the same size. That defect is invisible in review and invisible on the
// developer's own phone, because he is not the person C3.18 was bought for.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { DENSITIES, DENSITY_MODES, MIN_TAP_TARGET, type DensityScale } from '../src/theme/density';

const tokens = Object.keys(DENSITIES.normal) as (keyof DensityScale)[];

describe('C3.18 — the scale is a table with two complete columns', () => {
  it('has tokens to compare, so the loops below are not vacuous', () => {
    // ⚠️ RULE 4. An empty `tokens` array makes every `for` below pass having
    // asserted nothing — the fourth shape of misleading green this repository
    // has hit, and the cheapest one to prevent.
    expect(tokens.length, 'the density scale has no tokens').toBeGreaterThan(5);
    expect(DENSITY_MODES).toEqual(['normal', 'elder']);
  });

  it('defines every token in both modes', () => {
    // The typecheck already refuses a missing token — both modes are typed
    // `DensityScale`. This is the same claim made where a person reading a
    // failure will see WHICH token, and it survives someone loosening the type.
    for (const mode of DENSITY_MODES) {
      for (const token of tokens) {
        expect(DENSITIES[mode][token], `${mode}.${token} is missing`).toBeTypeOf('number');
        expect(DENSITIES[mode][token], `${mode}.${token} is not positive`).toBeGreaterThan(0);
      }
    }
  });
});

describe('C3.18 — elder mode is bigger, and "bigger" means every token', () => {
  it('is strictly larger than normal for every single token', () => {
    // STRICTLY. Equal is the failure this catches: a token the two modes share
    // is a token elder mode does not magnify, and the shopkeeper it was bought
    // for cannot read it either way.
    for (const token of tokens) {
      expect(
        DENSITIES.elder[token],
        `elder.${token} (${DENSITIES.elder[token]}) is not larger than normal.${token} (${DENSITIES.normal[token]})`,
      ).toBeGreaterThan(DENSITIES.normal[token]);
    }
  });

  it('makes rows visibly taller, not marginally so', () => {
    // "Taller rows, compromising a bit more on the aesthetics — fewer rows on
    // screen." A 4pt difference would satisfy the strict comparison above and
    // deliver none of what was asked for. 25% is the floor for "visibly".
    expect(DENSITIES.elder.rowHeight).toBeGreaterThanOrEqual(DENSITIES.normal.rowHeight * 1.25);
    expect(DENSITIES.elder.moneySize).toBeGreaterThanOrEqual(DENSITIES.normal.moneySize * 1.25);
  });
});

describe('the touch floor applies to both modes', () => {
  it('never puts a tap target below the platform minimum', () => {
    // 48 is the larger of Apple's 44pt and Android's 48dp, and the pilot ships
    // to both (C1.1). C3.18 makes elder mode bigger; it does not make normal
    // mode a place where the floor stops applying.
    for (const mode of DENSITY_MODES) {
      expect(DENSITIES[mode].tapTarget, `${mode} tap target is below the floor`).toBeGreaterThanOrEqual(
        MIN_TAP_TARGET,
      );
      expect(DENSITIES[mode].rowHeight, `${mode} rows are shorter than a tap target`).toBeGreaterThanOrEqual(
        MIN_TAP_TARGET,
      );
    }
  });
});
