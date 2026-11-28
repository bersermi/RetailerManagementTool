import { describe, expect, it } from 'vitest';

import type { CatalogEntry, UnitFactors } from '@/api/catalog';
import { memoryFor, type MemoryRow } from '@/api/providers';
import { cardCost, cardNote, deliveryReady, marginOf, padNote } from '@/cart/buying';

// ============================================================================
// ROUND 4 OF `8g` (2026-10-16) — WHAT A COMPRAR CARD SAYS, AND WHEN IT ASKS FOR
// A COST FIRST. The owner's card grid: every card's box holds this provider's
// last cost (*"The price gets prefilled by the previous price"*), and *"to add
// something to the carrito, a price must be entered first."* Since `14.3` the
// card is a tile and its box is in the pad, which keeps both rulings (`padNote`,
// `deliveryReady`). See `@/cart/buying` for the arguments; this file reads the answers.
// ============================================================================

const FACTORS: UnitFactors = { g: '1.000000', kg: '1000.000000', pza: '1.000000' };

function entry(over: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    prebuilt: false,
    picture: null,
    id: 'v-1',
    name: 'Pechuga sin hueso',
    familyId: 'f-1',
    familyName: 'Pollo',
    priceUnit: 'kg',
    baseUnit: 'g',
    centavos: 13500,
    perBase: '0.135000',
    priceScope: null,
    price: '$135 / kg',
    initials: 'PS',
    term: 'pechuga sin hueso pollo',
    ...over,
  };
}

/** Don Chuy charged $98 a kilo last time — net per GRAM, as the view stores it. */
const MEMORY: MemoryRow = {
  provider_id: 'p-1',
  variant_id: 'v-1',
  unit_price_net_per_base: '0.098000',
  last_qty_display_unit: 'kg',
  last_purchased_at: '2026-10-11T10:00:00+00:00',
};
const REMEMBERED = memoryFor([MEMORY], 'p-1', 'v-1', 'kg', FACTORS);

describe('14.3 — the pad asks for a cost before the line goes in, as round 4’s + did', () => {
  it('adds nothing until both boxes hold something', () => {
    expect(deliveryReady(25_000, '0.098000')).toBe(true);
    expect(deliveryReady(25_000, null)).toBe(false);
    expect(deliveryReady(null, '0.098000')).toBe(false);
  });

  it('never takes a zero quantity as a line, and does take a zero cost', () => {
    expect(deliveryReady(0, '0.098000')).toBe(false);
    expect(deliveryReady(25_000, '0.000000')).toBe(true);
  });
});

describe('14.3 — what the pad says beside its cost', () => {
  it('says the cost is last time’s while it is', () => {
    expect(padNote('remembered', REMEMBERED, '0.098000', entry(), FACTORS)).toBe('last-bought');
  });

  it('says Antes once she keys another, and not for two spellings of one figure', () => {
    expect(padNote('remembered', REMEMBERED, '0.102000', entry(), FACTORS)).toBe('changed');
    expect(padNote('remembered', REMEMBERED, '0.0980', entry(), FACTORS)).toBe('last-bought');
  });

  it('asks how much it cost when the box is empty, whatever the memory', () => {
    for (const state of ['remembered', 'new-pairing', 'unreadable', 'unknown'] as const) {
      expect(padNote(state, state === 'remembered' ? REMEMBERED : null, null, entry(), FACTORS)).toBe('ask');
    }
  });

  it('says nothing more about a cost keyed with no memory to compare it with', () => {
    expect(padNote('new-pairing', null, '0.102000', entry(), FACTORS)).toBeNull();
    expect(padNote('unknown', null, '0.102000', entry(), FACTORS)).toBeNull();
  });

  it('agrees with the tile behind it about last time’s cost', () => {
    // the tile is `cardNote` off the delivery; the pad must never say otherwise
    expect(cardNote('remembered', REMEMBERED, undefined, false, entry(), FACTORS)).toBe('last-bought');
    expect(padNote('remembered', REMEMBERED, cardCost(undefined, REMEMBERED, false), entry(), FACTORS)).toBe('last-bought');
  });
});

describe('round 4 — what a card’s cost box holds', () => {
  it('holds the provider’s last cost on a card nobody is receiving yet', () => {
    expect(REMEMBERED).not.toBeNull();
    expect(cardCost(undefined, REMEMBERED, false)).toBe('0.098000');
  });

  it('holds what she typed over it, in or out of the delivery', () => {
    expect(cardCost('0.102000', REMEMBERED, false)).toBe('0.102000');
    expect(cardCost('0.102000', REMEMBERED, true)).toBe('0.102000');
  });

  it('holds NOTHING on a line in the delivery with no cost — never the memory the commit will not send', () => {
    expect(cardCost(undefined, REMEMBERED, true)).toBeNull();
  });

  it('is empty with no memory', () => {
    expect(cardCost(undefined, null, false)).toBeNull();
  });
});

describe('round 4 — the line under a card’s box', () => {
  const e = entry();

  it('says where the figure came from while it is the provider’s last cost', () => {
    expect(cardNote('remembered', REMEMBERED, undefined, false, e, FACTORS)).toBe('last-bought');
    expect(cardNote('remembered', REMEMBERED, '0.098000', true, e, FACTORS)).toBe('last-bought');
  });

  it('reads a second spelling of the same per-base figure as the same cost', () => {
    expect(cardNote('remembered', REMEMBERED, '0.0980', true, e, FACTORS)).toBe('last-bought');
  });

  it('says Antes once she changed it', () => {
    expect(cardNote('remembered', REMEMBERED, '0.102000', true, e, FACTORS)).toBe('changed');
  });

  it('says Primera vez on a product never bought from this provider, in the delivery or not', () => {
    expect(cardNote('new-pairing', null, undefined, false, e, FACTORS)).toBe('first-time');
    expect(cardNote('new-pairing', null, '0.031000', true, e, FACTORS)).toBe('first-time');
  });

  it('says the cost is missing on a line in the delivery with an empty box', () => {
    expect(cardNote('remembered', REMEMBERED, undefined, true, e, FACTORS)).toBe('missing');
    expect(cardNote('new-pairing', null, undefined, true, e, FACTORS)).toBe('missing');
    expect(cardNote('unreadable', null, undefined, true, e, FACTORS)).toBe('missing');
  });

  it('says nothing while the memory is out — not back yet is not missing', () => {
    expect(cardNote('unknown', null, undefined, true, e, FACTORS)).toBeNull();
    expect(cardNote('unknown', null, undefined, false, e, FACTORS)).toBeNull();
  });

  it('says nothing to a cashier who cannot read the memory (the 2026-09-25 ruling)', () => {
    expect(cardNote('unreadable', null, undefined, false, e, FACTORS)).toBeNull();
    expect(cardNote('unreadable', null, '0.050000', true, e, FACTORS)).toBeNull();
  });
});

describe('round 4 — the margin pill, in pesos per price unit', () => {
  it('is the shelf price less the cost: $135 a kilo against $98 is $37', () => {
    expect(marginOf(entry(), '0.098000', FACTORS)).toBe(3700);
  });

  it('goes below zero when the cost is above the shelf — the solid red pill', () => {
    expect(marginOf(entry({ centavos: 8500 }), '0.090000', FACTORS)).toBe(-500);
  });

  it('is zero when she sells at cost, and zero is a margin, not an absence', () => {
    expect(marginOf(entry({ centavos: 9800 }), '0.098000', FACTORS)).toBe(0);
  });

  it('says there is no shelf price rather than inventing one', () => {
    expect(marginOf(entry({ centavos: null, perBase: null }), '0.022000', FACTORS)).toBe('no-sale-price');
  });

  it('draws no pill with no cost to measure against', () => {
    expect(marginOf(entry(), null, FACTORS)).toBeNull();
  });

  it('draws no pill for a unit this phone has not read', () => {
    expect(marginOf(entry({ priceUnit: 'caja' }), '0.098000', FACTORS)).toBeNull();
  });

  it('works per piece as well as per kilo', () => {
    expect(marginOf(entry({ priceUnit: 'pza', baseUnit: 'pza', centavos: 2500 }), '18.000000', FACTORS)).toBe(700);
  });
});
