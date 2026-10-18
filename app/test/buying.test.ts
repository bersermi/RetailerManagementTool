import { describe, expect, it } from 'vitest';

import type { CatalogEntry, UnitFactors } from '@/api/catalog';
import { memoryFor, type MemoryRow } from '@/api/providers';
import { cardCost, cardNote, marginOf } from '@/cart/buying';
import { buyGate } from '@/cart/gate';

// ============================================================================
// ROUND 4 OF `8g` (2026-10-16) — WHAT A COMPRAR CARD SAYS, AND WHEN `+` ASKS FOR
// A COST FIRST. The owner's card grid: every card's box holds this provider's
// last cost (*"The price gets prefilled by the previous price"*), and *"to add
// something to the carrito, a price must be entered first."* See `@/cart/buying`
// and `@/cart/gate` for the arguments; this file reads the answers.
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

describe('round 4 — a cost comes first, the way a price does on Vender', () => {
  it('lets a card with the provider’s last cost straight in', () => {
    expect(buyGate('remembered', true, false, false)).toBe('open');
  });

  it('asks for the cost on a product never bought from this provider', () => {
    expect(buyGate('new-pairing', false, false, false)).toBe('costFirst');
  });

  it('asks a cashier too, who cannot read the memory — she types it, nobody refuses her', () => {
    expect(buyGate('unreadable', false, false, false)).toBe('costFirst');
  });

  it('lets a cost she typed into the card’s box count as the cost', () => {
    expect(buyGate('new-pairing', false, true, false)).toBe('open');
    expect(buyGate('unreadable', false, true, false)).toBe('open');
  });

  it('does not ask while the memory is still on its way — the prefill may be a moment off', () => {
    expect(buyGate('unknown', false, false, false)).toBe('open');
  });

  it('asks when the memory has a row this phone cannot convert', () => {
    expect(buyGate('remembered', false, false, false)).toBe('costFirst');
  });

  it('never stops a line already in the delivery from being stepped or removed', () => {
    for (const state of ['remembered', 'new-pairing', 'unreadable', 'unknown'] as const) {
      expect(buyGate(state, false, false, true)).toBe('open');
    }
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
