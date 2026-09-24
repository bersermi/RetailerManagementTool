import { describe, expect, it } from 'vitest';

import {
  MEMORY_COLUMNS,
  MEMORY_PROVIDER_COLUMN,
  MEMORY_TABLE,
  PROVIDERS_KEY,
  PROVIDER_COLUMNS,
  PROVIDER_ORDER_COLUMN,
  defaultProvider,
  memoryFor,
  memoryKey,
  memoryState,
  providerById,
  providersFrom,
  quotesFor,
  typedPerBase,
  type MemoryRow,
  type ProviderRow,
} from '@/api/providers';
import type { UnitFactors } from '@/api/catalog';

// ============================================================================
// WHO THE SHOP BUYS FROM, AND WHAT THEY CHARGED. Plan task `5g-i`.
//
// ⚠️ EVERY ASSERTION HERE IS ABOUT A RULE THIS APP DECIDES. What the DATABASE
// answers is `docs/checks/5g-i-purchase-contract.sh`'s, over real HTTP — the
// two are deliberately different instruments, because nothing in TypeScript has
// ever read `0002` or `0008` and a renamed column is a 400 the typecheck, the
// bundler and this file all pass straight over.
// ============================================================================

const FACTORS: UnitFactors = {
  g: '1.000000',
  kg: '1000.000000',
  '250g': '250.000000',
  pza: '1.000000',
};

function provider(over: Partial<ProviderRow> = {}): ProviderRow {
  return {
    id: 'p-1',
    name: 'Bodega del Centro',
    is_generic: false,
    is_active: true,
    ...over,
  };
}

function memory(over: Partial<MemoryRow> = {}): MemoryRow {
  return {
    provider_id: 'p-1',
    variant_id: 'v-1',
    unit_price_net_per_base: '0.018000',
    last_qty_display_unit: 'kg',
    ...over,
  };
}

describe('the contract with the database', () => {
  // ⚠️ `R13`: the columns are written once, here, and read by the live check.
  it('names the provider columns and never asks for `*`', () => {
    expect(PROVIDER_COLUMNS).toBe('id,name,is_generic,is_active');
    expect(PROVIDER_COLUMNS).not.toContain('*');
  });

  // ⚠️ Proveedores is step 6's own screen and Comprar draws none of these. A
  // column the app never asks for is a column that never reaches a phone.
  it('leaves the directory columns Comprar does not draw on the server', () => {
    for (const column of ['contact_name', 'phone', 'address_line1']) {
      expect(PROVIDER_COLUMNS).not.toContain(column);
    }
  });

  // ⚠️⚠️ THE CAST IS THE ASSERTION. A bare numeric arrives as a JSON number,
  // which is a double, and `parseDecimal` refuses a number argument outright.
  it('casts the remembered price to text', () => {
    expect(MEMORY_COLUMNS).toContain('unit_price_net_per_base::text');
  });

  it('reads the denomination she typed last time', () => {
    expect(MEMORY_COLUMNS).toContain('last_qty_display_unit');
  });

  it('spells the view and its filter column once', () => {
    expect(MEMORY_TABLE).toBe('provider_price_memory');
    expect(MEMORY_PROVIDER_COLUMN).toBe('provider_id');
  });

  it('orders providers in the database rather than in this runtime', () => {
    expect(PROVIDER_ORDER_COLUMN).toBe('name');
  });

  // ⚠️⚠️ THE CACHE'S HALF OF *never across providers*. One key for all of them
  // serves the last provider's prices to the next one.
  it('puts the provider in the memory query key', () => {
    expect(memoryKey('p-1')).not.toEqual(memoryKey('p-2'));
    expect(memoryKey('p-1')).toEqual(['providers', 'memory', 'p-1']);
    expect(PROVIDERS_KEY).toEqual(['providers', 'list']);
  });

  it('gives a null provider a key of its own rather than throwing', () => {
    expect(memoryKey(null)).toEqual(['providers', 'memory', '']);
  });
});

describe('the picker', () => {
  it('drops a retired provider', () => {
    const list = providersFrom([provider(), provider({ id: 'p-2', is_active: false })]);
    expect(list.map((p) => p.id)).toEqual(['p-1']);
  });

  // ⚠️⚠️ `provider_protect_generic` refuses a DELETE and a DEMOTION and stops
  // there. A shop whose catch-all had been deactivated would open Comprar with
  // no default and `record_purchase` refusing every delivery for want of one.
  it('keeps the generic provider even when it has been deactivated', () => {
    const list = providersFrom([provider({ id: 'g', is_generic: true, is_active: false })]);
    expect(list.map((p) => p.id)).toEqual(['g']);
  });

  // ⚠️ A PROMOTION AND NOT A SORT: the rest keep `order=name`'s own order.
  it('puts the generic row first and leaves the rest as the database sent them', () => {
    const list = providersFrom([
      provider({ id: 'a', name: 'Abarrotes' }),
      provider({ id: 'g', name: 'Compra directa', is_generic: true }),
      provider({ id: 'z', name: 'Zafiro' }),
    ]);
    expect(list.map((p) => p.id)).toEqual(['g', 'a', 'z']);
  });

  it('is empty rather than throwing while the read is in flight', () => {
    expect(providersFrom(undefined)).toEqual([]);
    expect(providersFrom(null)).toEqual([]);
  });

  // ⚠️ F6 and not *the first one*, which the order makes true today and is a
  // different claim: a shop with no generic row must open on nobody.
  it('defaults to the generic provider and to nobody when there is none', () => {
    expect(defaultProvider(providersFrom([provider({ id: 'g', is_generic: true })]))?.id).toBe('g');
    expect(defaultProvider(providersFrom([provider()]))).toBeNull();
  });

  it('finds a provider by id, and answers null for nobody', () => {
    const list = providersFrom([provider()]);
    expect(providerById(list, 'p-1')?.name).toBe('Bodega del Centro');
    expect(providerById(list, 'nope')).toBeNull();
    expect(providerById(list, null)).toBeNull();
  });
});

describe('the price memory', () => {
  // ⚠️⚠️ THE ONE RULE §2.8 SAYS THE OPERATOR CANNOT CATCH FOR US.
  it('never carries another provider’s price', () => {
    const rows = [memory(), memory({ provider_id: 'p-2', variant_id: 'v-2' })];
    expect(quotesFor(rows, 'p-1')).toEqual({ 'v-1': '0.018000' });
  });

  it('remembers nothing at all when no provider is chosen', () => {
    expect(quotesFor([memory()], null)).toEqual({});
  });

  it('is empty rather than throwing while the read is in flight', () => {
    expect(quotesFor(undefined, 'p-1')).toEqual({});
  });

  // ⚠️ PER BASE AND NOT CONVERTED — `Quotes` is what `record_purchase` is sent.
  it('hands the basket the figure exactly as Postgres spelled it', () => {
    expect(quotesFor([memory({ unit_price_net_per_base: '0.018500' })], 'p-1')).toEqual({
      'v-1': '0.018500',
    });
  });

  // 0.018 per gram × 1000 g = $18.00 / kg.
  it('reads a per-base figure back as a price per PRICE unit', () => {
    const m = memoryFor([memory()], 'p-1', 'v-1', 'kg', FACTORS);
    expect(m?.centavos).toBe(1800);
    expect(m?.price).toBe('$18 / kg');
    expect(m?.perBase).toBe('0.018000');
  });

  // The same remembered figure, read against a quarter-kilo: $4.50 / 250 gr.
  it('reads the same figure differently for a differently priced variant', () => {
    const m = memoryFor([memory()], 'p-1', 'v-1', '250g', FACTORS);
    expect(m?.centavos).toBe(450);
    expect(m?.price).toBe('$4.50 / 250 gr');
  });

  // ⚠️ She may have bought a case last month and kilos this week.
  it('carries the denomination she typed last time beside the figure', () => {
    const m = memoryFor([memory({ last_qty_display_unit: '250g' })], 'p-1', 'v-1', 'kg', FACTORS);
    expect(m?.lastUnit).toBe('250g');
    expect(m?.price).toBe('$18 / kg');
  });

  it('survives a memory that carried no denomination', () => {
    const m = memoryFor([memory({ last_qty_display_unit: null })], 'p-1', 'v-1', 'kg', FACTORS);
    expect(m?.lastUnit).toBeNull();
  });

  // ⚠️ C3.12 — no memory is a DASH and never a zero.
  it('is null for a pairing nobody has bought', () => {
    expect(memoryFor([memory()], 'p-1', 'v-other', 'kg', FACTORS)).toBeNull();
    expect(memoryFor([memory()], 'p-2', 'v-1', 'kg', FACTORS)).toBeNull();
  });

  // ⚠️ *A null is a unit this phone has not read*, not a zero.
  it('refuses to price against a unit the phone has not read', () => {
    const m = memoryFor([memory()], 'p-1', 'v-1', 'caja', FACTORS);
    expect(m?.centavos).toBeNull();
    expect(m?.perBase).toBe('0.018000');
  });
});

describe('a price somebody types', () => {
  // ⚠️ The exact inverse of `priceCentavos`: $18.00 / kg is 0.018 per gram.
  it('turns a typed price per price unit into what record_purchase wants', () => {
    expect(typedPerBase(1800, 'kg', FACTORS)).toBe('0.018000');
    expect(typedPerBase(450, '250g', FACTORS)).toBe('0.018000');
    expect(typedPerBase(250, 'pza', FACTORS)).toBe('2.500000');
  });

  // ⚠️⚠️ THE ROUND TRIP IS THE ASSERTION, because the two functions are the only
  // two places that could disagree about what `$8.50 / kg` is.
  it('round-trips through the memory reader without losing a centavo', () => {
    for (const [unit, centavos] of [
      ['kg', 1800],
      ['250g', 450],
      ['g', 3],
      ['pza', 250],
    ] as const) {
      const perBase = typedPerBase(centavos, unit, FACTORS);
      expect(perBase).not.toBeNull();
      const m = memoryFor(
        [memory({ unit_price_net_per_base: perBase as string })],
        'p-1',
        'v-1',
        unit,
        FACTORS,
      );
      expect(m?.centavos).toBe(centavos);
    }
  });

  // ⚠️ C3.14's explicit zero is a SALE rule; a purchase at zero is still a
  // figure somebody typed, and the schema allows it (`purchase_line_price_
  // non_negative`). It is the ABSENT price C3.13 blocks, not this one.
  it('accepts an explicit zero and refuses a negative one', () => {
    expect(typedPerBase(0, 'kg', FACTORS)).toBe('0.000000');
    expect(typedPerBase(-1, 'kg', FACTORS)).toBeNull();
  });

  it('refuses to guess against a unit the phone has not read', () => {
    expect(typedPerBase(1800, 'caja', FACTORS)).toBeNull();
  });

  it('answers null for no price at all rather than zero', () => {
    expect(typedPerBase(null, 'kg', FACTORS)).toBeNull();
  });
});

describe('what an empty memory means', () => {
  // ⚠️⚠️ THE WHOLE REASON THIS FUNCTION EXISTS: 200-and-empty is BOTH a designed
  // state and an invisible refusal, measured against a real database 2026-09-24.
  it('separates a new pairing from a fence the reader cannot see', () => {
    expect(memoryState([], 'p-1', 'v-1', true)).toBe('new-pairing');
    expect(memoryState([], 'p-1', 'v-1', false)).toBe('unreadable');
  });

  it('says remembered when the pairing is there, whoever is asking', () => {
    expect(memoryState([memory()], 'p-1', 'v-1', true)).toBe('remembered');
    expect(memoryState([memory()], 'p-1', 'v-1', false)).toBe('remembered');
  });

  // ⚠️ *Not back yet* must never render as *there is nothing* — `membershipFrom`'s
  // rule, and the one that stopped Productos saying the shop was empty.
  it('says unknown while the read is in flight or no provider is chosen', () => {
    expect(memoryState(undefined, 'p-1', 'v-1', true)).toBe('unknown');
    expect(memoryState(null, 'p-1', 'v-1', true)).toBe('unknown');
    expect(memoryState([], null, 'v-1', true)).toBe('unknown');
  });

  // ⚠️ `R4`: none of these is a Spanish sentence, because none may reach a person
  // until the owner has said what a cashier is told.
  it('states none of itself in Spanish', () => {
    for (const state of ['remembered', 'new-pairing', 'unreadable', 'unknown']) {
      expect(state).toMatch(/^[a-z-]+$/);
    }
  });
});
