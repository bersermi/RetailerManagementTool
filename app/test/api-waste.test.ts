// ============================================================================
// THE WASTE VOCABULARY. Plan task `6a-i`.
//
// ⚠️⚠️ WHAT THIS SUITE CAN SEE AND WHAT IT CANNOT, SAID FIRST BECAUSE THE SPLIT
// IS THE WHOLE POINT. It reads `@/api/waste` against `@/strings`, so it can
// prove the five causes each HAVE a label, that the labels are not the wire
// values, and that the guard admits exactly five strings. **It cannot prove that
// `public.waste_reason` still holds those five** — TypeScript has never read
// `0003`, and a value renamed in a migration would leave this suite green and
// every write-off in the shop answering `22P02`. That claim belongs to
// `docs/checks/6a-i-waste-contract.sh`, which sends all five over real HTTP.
//
// ⚠️ IT REACHES NO COMPONENT (`R2`) and it is `.ts`. `@/api/waste` imports
// `@/strings` and nothing else, which is what lets it load under node at all —
// the module is a contract and a lookup, with no `supabase` anywhere near it.
// ============================================================================

import { describe, expect, it } from 'vitest';

import {
  WASTE_REASONS,
  WASTE_REASON_KEY,
  isWasteReason,
  reasonHint,
  reasonLabel,
  type WasteReason,
} from '@/api/waste';
import { ES } from '@/strings';

describe('the five causes `0003` closed', () => {
  it('is exactly five, because a sixth needs a migration', () => {
    // ⚠️ A COUNT AND NOT A SNAPSHOT OF THE STRINGS, which would be this file
    // asserting itself. What is load-bearing is that the SIZE is fixed: a screen
    // offering a sixth cause is a dead letter per write-off, and the only place a
    // sixth can legitimately come from is `0003:419` being amended.
    expect(WASTE_REASONS).toHaveLength(5);
  });

  it('holds no duplicates, which a hand-written tuple can', () => {
    expect(new Set(WASTE_REASONS).size).toBe(WASTE_REASONS.length);
  });

  it('is in `0003`s DECLARATION order, which is what `?order=reason` returns', () => {
    // ⚠️⚠️ MEASURED AGAINST A REAL POSTGRES BEFORE IT WAS WRITTEN HERE. Postgres
    // sorts an enum by declaration, so a document carrying all five came back
    // `caducado, dañado, merma de preparación, robo o faltante, error de captura`
    // — NOT alphabetical and not insertion order.
    //
    // ⚠️ SO THIS IS THE ORDER THE PICKER OFFERS **AND** THE ORDER A REASON
    // BREAKDOWN WILL ARRIVE IN. A picker in a different order from the report is
    // two answers to *which cause matters most*, and nothing could see it.
    // ⚠️ IT IS DELIBERATELY NOT ALPHABETICAL and this asserts that too, because
    // *tidying* this tuple is the likeliest way it gets broken.
    expect([...WASTE_REASONS]).toEqual([
      'caducado',
      'dañado',
      'merma de preparación',
      'robo o faltante',
      'error de captura',
    ]);
    expect([...WASTE_REASONS]).not.toEqual([...WASTE_REASONS].sort());
  });

  it('carries the payload key `0019` reads, spelled once (`R13`)', () => {
    expect(WASTE_REASON_KEY).toBe('reason');
  });
});

describe('the guard over a restored basket', () => {
  it('admits all five', () => {
    for (const reason of WASTE_REASONS) expect(isWasteReason(reason)).toBe(true);
  });

  it('refuses a cause no migration created', () => {
    // ⚠️ THE FAILURE IT EXISTS FOR: a reason persisted by an older build reaches
    // `p_lines` untouched and comes back `22P02`, which becomes a DEAD LETTER —
    // §2.6's *replay is manual* over a write-off she believes she recorded.
    expect(isWasteReason('se me cayó')).toBe(false);
    expect(isWasteReason('CADUCADO')).toBe(false);
    expect(isWasteReason('caducado ')).toBe(false);
  });

  it('refuses everything that is not a string, including the shapes JSON makes', () => {
    for (const junk of [null, undefined, 0, 1, true, {}, [], ['caducado']]) {
      expect(isWasteReason(junk)).toBe(false);
    }
  });
});

describe('the label, which is the one-way door out of the wire value (`R4`)', () => {
  it('gives every cause a word', () => {
    for (const reason of WASTE_REASONS) {
      expect(reasonLabel(reason).length).toBeGreaterThan(0);
    }
  });

  it('gives every cause a DIFFERENT word', () => {
    const words = WASTE_REASONS.map(reasonLabel);
    expect(new Set(words).size).toBe(words.length);
  });

  it('is never the wire value itself, which is what makes the indirection real', () => {
    // ⚠️⚠️ THIS IS THE ASSERTION A READER WILL WANT TO DELETE, AND IT IS THE ONE
    // THAT PAYS. Four of the five labels are the wire value CAPITALISED, so a
    // screen that rendered `reason` directly would look almost right — a column
    // of lower-case rows — and nothing would fail. **Every value in this schema
    // is lower-case and every label is capitalised**, so this holds for all five
    // and it holds by construction rather than by luck.
    for (const reason of WASTE_REASONS) {
      expect(reasonLabel(reason)).not.toBe(reason);
    }
  });

  it('keeps the words in `src/strings.ts` and the correspondence here', () => {
    // ⚠️ `ES.waste.reason` IS KEYED BY THE WIRE VALUE, accents and all, so a
    // renamed enum member is a TypeScript error rather than a picker row that
    // renders `undefined`. This is that keying asserted at runtime as well.
    for (const reason of WASTE_REASONS) {
      expect(reasonLabel(reason)).toBe(ES.waste.reason[reason]);
    }
  });
});

describe('the hint, which two causes get and three do not', () => {
  it('explains the two `0003` argues at length', () => {
    // ⚠️ `robo o faltante` IS **ONE** VALUE ON PURPOSE — *"a count cannot
    // distinguish theft from a miscount, and forcing the operator to guess
    // produces a fiction"* — and `error de captura` is the one cause that is not
    // a loss off a shelf at all. Both need saying; the other three do not.
    expect(reasonHint('robo o faltante').length).toBeGreaterThan(0);
    expect(reasonHint('error de captura').length).toBeGreaterThan(0);
  });

  it('answers the empty string for the three that are self-evident', () => {
    // ⚠️ `''` AND NOT `undefined`, because the screen renders `hint === ''` as
    // *draw nothing* and a `undefined` reaching a `<Text>` is the string
    // "undefined" under a picker row.
    for (const reason of ['caducado', 'dañado', 'merma de preparación'] as WasteReason[]) {
      expect(reasonHint(reason)).toBe('');
    }
  });

  it('never returns undefined for any of the five', () => {
    for (const reason of WASTE_REASONS) expect(typeof reasonHint(reason)).toBe('string');
  });
});
