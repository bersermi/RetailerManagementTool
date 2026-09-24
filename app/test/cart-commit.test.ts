// ============================================================================
// `5f-iii-b` — a basket becoming a row in the queue, and the gesture's own
// arithmetic. The screen half of that child is the owner's phone (`R9`); this
// is everything about it that has a right answer.
//
// ⚠️⚠️ THE ASSERTION THIS FILE EXISTS FOR IS `canCommit` AGREEING WITH
// `commitOf`. The slide is DRAWN on the first and PERFORMED by the second, so
// a disagreement between them is a control a thumb can complete over a sale
// that silently does not happen — and nothing anywhere would go red. Every
// refusal below is checked from both ends for exactly that reason.
//
// ⚠️ IT ASKS POSTGRES NOTHING. `record_sale` is `5h`'s and the live round trip
// that proves the payload is accepted belongs there — `5f.split` says so in
// writing. What is read here is the shape and the refusals.
// ============================================================================

import { describe, expect, it } from 'vitest';

import { catalogFrom, unitFactorsFrom, type UnitRow, type VariantRow } from '@/api/catalog';
import { isWriteKind, isWritePayload, type Stamp } from '@/api/outbox';
import { EMPTY_CART, setQty, type Cart } from '@/cart/cart';
import {
  COMMIT_AT,
  TAP_SLOP,
  canCommit,
  commitOf,
  progressOf,
  releaseCommits,
  releaseTaps,
  type Basketful,
} from '@/cart/commit';

const UNITS: readonly UnitRow[] = [
  { code: 'g', dimension: 'mass', base_code: 'g', factor_to_base: '1.000000', display_order: 40 },
  { code: 'kg', dimension: 'mass', base_code: 'g', factor_to_base: '1000.000000', display_order: 10 },
  { code: '250g', dimension: 'mass', base_code: 'g', factor_to_base: '250.000000', display_order: 25 },
  { code: 'pza', dimension: 'count', base_code: 'pza', factor_to_base: '1.000000', display_order: 10 },
];

const FACTORS = unitFactorsFrom(UNITS);
const FAMILY = '11111111-1111-4111-8111-111111111111';
const WORKSPACE = '22222222-2222-4222-8222-222222222222';
const LOCATION = '33333333-3333-4333-8333-333333333333';
const PECHUGA = '44444444-4444-4444-8444-444444444444';
const HUEVO = '55555555-5555-4555-8555-555555555555';

function variant(id: string, name: string, priceUnit: string, base: string, perBase: string | null): VariantRow {
  return {
    id,
    name,
    family_id: FAMILY,
    price_unit_code: priceUnit,
    base_unit_code: base,
    is_active: true,
    product_family: { id: FAMILY, name: 'Pollo' },
    price_list: perBase === null ? [] : [{ price_per_base: perBase, location_id: null }],
  };
}

const CATALOG = catalogFrom(
  [variant(PECHUGA, 'Pechuga', '250g', 'g', '0.180000'), variant(HUEVO, 'Huevo', 'pza', 'pza', '3.500000')],
  FACTORS,
  null,
);

const STAMP: Stamp = { id: '66666666-6666-4666-8666-666666666666', now: '2026-09-24T18:00:00.000Z' };

function basketful(over: Partial<Basketful> = {}): Basketful {
  let cart: Cart = setQty(EMPTY_CART, PECHUGA, 750_000);
  cart = setQty(cart, HUEVO, 3_000);
  return {
    cart,
    entries: CATALOG,
    factors: FACTORS,
    kind: 'sell',
    pricesIncludeTax: true,
    workspaceId: WORKSPACE,
    locationId: LOCATION,
    ...over,
  };
}

// ---------------------------------------------------------------------------
describe('a basket becomes a row the outbox accepts', () => {
  it('produces a pending write carrying the stamp it was given', () => {
    const done = commitOf(basketful(), STAMP);
    expect(done.ok, done.ok ? '' : `refused: ${done.why}`).toBe(true);
    if (!done.ok) return;
    expect(done.write.id).toBe(STAMP.id);
    expect(done.write.queuedAt).toBe(STAMP.now);
    expect(done.write.workspaceId).toBe(WORKSPACE);
    expect(done.write.state).toBe('pending');
    expect(done.write.attempts).toBe(0);
  });

  it('is a SALE, and the kind is one the queue knows', () => {
    const done = commitOf(basketful(), STAMP);
    if (!done.ok) throw new Error(done.why);
    expect(done.write.kind).toBe('sale');
    expect(isWriteKind(done.write.kind)).toBe(true);
  });

  it('carries the location and one line per basket line', () => {
    const done = commitOf(basketful(), STAMP);
    if (!done.ok) throw new Error(done.why);
    expect(isWritePayload(done.write.payload)).toBe(true);
    expect(done.write.payload.location_id).toBe(LOCATION);
    expect((done.write.payload.lines as readonly unknown[]).length).toBe(2);
  });

  it('sends a SALE on gross, which is the key record_sale reads — §2.5 rule 2', () => {
    const done = commitOf(basketful(), STAMP);
    if (!done.ok) throw new Error(done.why);
    const lines = done.write.payload.lines as readonly Record<string, unknown>[];
    for (const line of lines) {
      expect(Object.keys(line)).toContain('unit_price_gross_per_base');
      expect(Object.keys(line)).not.toContain('unit_price_net_per_base');
    }
  });

  it('carries NO occurred_at — the queue row s own time is the answer', () => {
    // `@/api/flush` sends `queuedAt` when the payload has none, so a sale rung
    // up at 09:00 and drained at 14:00 still counts on the right day.
    const done = commitOf(basketful(), STAMP);
    if (!done.ok) throw new Error(done.why);
    expect(Object.keys(done.write.payload)).not.toContain('occurred_at');
  });
});

// ---------------------------------------------------------------------------
// ⚠️⚠️ THE PAIR THAT MATTERS. `canCommit` decides whether a thumb is offered a
// slide; `commitOf` decides what happens when it completes. Every refusal is
// asserted from BOTH ends, because the failure this guards is not a refusal —
// it is a slide drawn over one.
describe('the control is drawn only where the sale can actually happen', () => {
  it('agrees with itself on a basket that CAN be sold', () => {
    expect(canCommit(basketful())).toBe(true);
    expect(commitOf(basketful(), STAMP).ok).toBe(true);
  });

  it('refuses an empty basket from both ends', () => {
    const b = basketful({ cart: EMPTY_CART });
    expect(canCommit(b)).toBe(false);
    expect(commitOf(b, STAMP)).toEqual({ ok: false, why: 'empty-cart' });
  });

  it('refuses a shop whose store this phone cannot name — the two-location case', () => {
    // ⚠️ `useCatalog` resolves `locationId` to `null` for any shop that is not
    // exactly one store. C1.5 says both pilot shops are one, so no phone today
    // takes this branch — which is precisely why it must be checked here.
    for (const locationId of [null, '']) {
      const b = basketful({ locationId });
      expect(canCommit(b), `location ${JSON.stringify(locationId)}`).toBe(false);
      expect(commitOf(b, STAMP)).toEqual({ ok: false, why: 'no-location' });
    }
  });

  it('refuses a basket holding a product that has left the catalog', () => {
    const b = basketful({ cart: setQty(basketful().cart, 'nobody', 1_000) });
    expect(canCommit(b)).toBe(false);
    expect(commitOf(b, STAMP)).toEqual({ ok: false, why: 'variant-not-in-catalog' });
  });

  it('refuses a line it cannot price, rather than sending a free sale', () => {
    const priceless = catalogFrom([variant(PECHUGA, 'Pechuga', '250g', 'g', null)], FACTORS, null);
    const b = basketful({ cart: setQty(EMPTY_CART, PECHUGA, 750_000), entries: priceless });
    expect(canCommit(b)).toBe(false);
    expect(commitOf(b, STAMP)).toEqual({ ok: false, why: 'line-cannot-be-priced' });
  });

  it('refuses a malformed workspace — the queue s own guard, reached through this one', () => {
    const b = basketful({ workspaceId: 'not-a-uuid' });
    expect(canCommit(b)).toBe(false);
    expect(commitOf(b, STAMP)).toEqual({ ok: false, why: 'bad-workspace' });
  });

  it('does not let the PROBE stamp leak into a real commit', () => {
    // `canCommit` asks with a throwaway id. If that id ever reached the queue,
    // every sale on every phone would share one primary key.
    const done = commitOf(basketful(), STAMP);
    if (!done.ok) throw new Error(done.why);
    expect(done.write.id).not.toBe('00000000-0000-4000-8000-000000000000');
  });
});

// ---------------------------------------------------------------------------
describe('what counts as a completed gesture — C3.6', () => {
  it('is deliberate but not accurate: neither a half nor the very end', () => {
    // ⚠️ RULE 4 — the constant is the subject, so assert its VALUE, not that it
    // exists. At 0.5 a brush commits a sale; at 1.0 the last few points are a
    // precision task performed at a counter.
    expect(COMMIT_AT).toBeGreaterThan(0.5);
    expect(COMMIT_AT).toBeLessThan(1);
  });

  it('reads progress as a clamped fraction of the track', () => {
    expect(progressOf(0, 200)).toBe(0);
    expect(progressOf(100, 200)).toBe(0.5);
    expect(progressOf(200, 200)).toBe(1);
    expect(progressOf(400, 200)).toBe(1);
    expect(progressOf(-40, 200)).toBe(0);
  });

  it('answers 0 before the track has been measured, rather than NaN', () => {
    // A view has no width until it lays out. `NaN` in a transform is a silently
    // un-animated view, which is the one failure mode nothing would report.
    expect(progressOf(50, 0)).toBe(0);
    expect(progressOf(50, -10)).toBe(0);
    expect(progressOf(Number.NaN, 200)).toBe(0);
    expect(progressOf(50, Number.NaN)).toBe(0);
    expect(releaseCommits(50, 0)).toBe(false);
  });

  it('reads a touch that never moved as a TAP, which opens the basket', () => {
    // ⚠️ ONE RESPONDER, TWO READINGS. The owner made the track tappable on
    // 2026-09-24, so the same touch has to answer *open* or *commit* — and the
    // slop is what separates them. It is small on purpose: a generous one turns
    // the start of an abandoned drag into a screen change under a selling thumb.
    expect(TAP_SLOP).toBeGreaterThan(0);
    expect(TAP_SLOP).toBeLessThan(12);
    expect(releaseTaps(0)).toBe(true);
    expect(releaseTaps(TAP_SLOP)).toBe(true);
    expect(releaseTaps(-TAP_SLOP)).toBe(true);
    expect(releaseTaps(TAP_SLOP + 1)).toBe(false);
    expect(releaseTaps(Number.NaN)).toBe(false);
  });

  it('never reads one release as BOTH a tap and a commit', () => {
    // ⚠️⚠️ THE ASSERTION THAT MATTERS NOW THAT THE CONTROL HAS TWO GESTURES: a
    // release that opened the basket must not also have sold it. The screen
    // checks the tap FIRST and returns, and this is what pins the two ranges
    // apart so that order stays a belt rather than the only brace.
    const travel = 300;
    for (const dx of [0, 1, TAP_SLOP, TAP_SLOP + 1, 100, travel - 1, travel]) {
      expect(releaseTaps(dx) && releaseCommits(dx, travel), `dx=${dx}`).toBe(false);
    }
  });

  it('commits at the threshold and not a point before it', () => {
    const travel = 300;
    const at = COMMIT_AT * travel;
    expect(releaseCommits(at, travel)).toBe(true);
    expect(releaseCommits(at - 1, travel)).toBe(false);
    expect(releaseCommits(travel, travel)).toBe(true);
    expect(releaseCommits(0, travel)).toBe(false);
  });
});
