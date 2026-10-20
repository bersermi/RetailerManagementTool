import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { KIND_OF_SCOPE, correctingLine, prefillOf } from '@/api/corrections';
import { documentsFrom, type DocumentLine, type DocumentLineRow, type DocumentRow, type ShopDocument } from '@/api/documents';
import { isGoingBack } from '@/navigation/volver';
import { ES } from '@/strings';

// ============================================================================
// `8g`'s review of the screens' flow (2026-10-20) — the parts of the owner's
// fixes that are values rather than navigation: what a correction strip says,
// that a corrected sale keeps its own prices (*"Original prices"*), the price a
// sale line carries for it, and which navigation is a person going back.
// Navigation itself is the emulator's to measure (`R9`).
// ⚠️ THE STRIP'S DAY AND TIME ARE LOCAL, so the zone is pinned, and nothing local
// is computed at `describe` scope ([[local-time-tests-need-a-pinned-tz]]).
// ============================================================================

const HOST_TZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/Mexico_City';
});
afterAll(() => {
  if (HOST_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = HOST_TZ;
});

const TODAY = '2026-10-20';

describe('the strip a counter shows while it holds a correction', () => {
  it('names the document, its day and time, and what it came to', () => {
    // 02:41 UTC on the 20th is 20:41 on the 19th in Mexico City: yesterday.
    const c = { id: 'd', at: '2026-10-20T02:41:00Z', amount: '$45' };
    expect(correctingLine('sale', c, TODAY)).toBe('Corrigiendo la venta de ayer, 20:41 · $45');
    expect(correctingLine('purchase', { ...c, at: '2026-10-20T16:05:00Z' }, TODAY)).toBe('Corrigiendo la compra de hoy, 10:05 · $45');
    expect(correctingLine('waste', { id: 'd', at: '2026-10-14T18:00:00Z' }, TODAY)).toBe('Corrigiendo lo que se tiró el 14 de octubre, 12:00');
    expect(correctingLine('sale', { id: 'd', at: 'nonsense' }, TODAY)).toBe(ES.correcting.bare);
  });

  it('every cart scope maps to the document it re-keys', () => {
    expect(KIND_OF_SCOPE).toEqual({ sell: 'sale', buy: 'purchase', waste: 'waste' });
  });

  it('emptying a correction says the original is already gone', () => {
    expect(ES.counter.cart.correctionGone(ES.counter.cart.correctionWhat.sale)).toBe(
      'Esta venta ya se borró. Si vacías el carrito no se vuelve a registrar.',
    );
  });
});

describe('a corrected sale keeps the prices it was rung up at', () => {
  const line = (overrides: Partial<DocumentLine>): DocumentLine => ({
    id: 'l',
    variantId: 'coca',
    name: 'Coca-Cola 600 ml',
    quantity: '1 pza',
    amount: '$29',
    base: 1000,
    reason: null,
    reasonValue: null,
    perBase: '25.000000',
    grossPerBase: '29.000000',
    ...overrides,
  });
  const doc = (kind: ShopDocument['kind'], lines: DocumentLine[]): ShopDocument => ({
    id: 'doc',
    kind,
    at: '2026-10-20T02:41:00Z',
    day: '2026-10-19',
    counterparty: null,
    providerId: null,
    createdBy: null,
    cause: null,
    causeValue: null,
    amount: '$45',
    grossCentavos: 4500,
    lines,
  });

  it('gross where the shop keys prices with IVA, net where it does not', () => {
    expect(prefillOf(doc('sale', [line({})]), TODAY).quotes).toEqual({ coca: '29.000000' });
    expect(prefillOf(doc('sale', [line({})]), TODAY, false).quotes).toEqual({ coca: '25.000000' });
  });

  it('carries what the document came to, for the strip', () => {
    expect(prefillOf(doc('sale', [line({})]), TODAY).corrects).toEqual({ id: 'doc', at: '2026-10-20T02:41:00Z', amount: '$45' });
  });

  it('a write-off has no money a cashier may read, so it keeps no price', () => {
    expect(prefillOf(doc('waste', [line({ perBase: null, grossPerBase: null })]), TODAY).quotes).toEqual({});
  });
});

describe('the price a sale line carries for a correction', () => {
  const row = (net: string, tax: string, base: string, perBase: string): DocumentLineRow => ({
    id: 'l1',
    variant_id: 'v1',
    qty_base: base,
    qty_display: '1',
    qty_display_unit: 'pza',
    unit_price_net_per_base: perBase,
    line_net: net,
    tax_amount: tax,
    product_variant: { name: 'Producto' },
  });
  const sale = (lines: DocumentLineRow[]): DocumentRow => ({
    id: 's1',
    occurred_at: '2026-10-19T18:00:00Z',
    total_net: '0.00',
    total_tax: '0.00',
    reversal_of: null,
    created_by: 'p',
    sale_line: lines,
  });
  const gross = (r: DocumentLineRow) => documentsFrom('sale', [sale([r])]).documents[0]?.lines[0]?.grossPerBase;

  it('with no tax, the stored price verbatim — no rounding at all', () => {
    expect(gross(row('29.00', '0.00', '1.000', '29.000000'))).toBe('29.000000');
  });

  it('with IVA, what was paid over what was taken, at scale 6', () => {
    // 1.5 kg at $100 a kilo net plus 16%: $150 + $24 = $174 over 1500 g.
    expect(gross(row('150.00', '24.00', '1500.000', '0.100000'))).toBe('0.116000');
  });
});

describe('which navigation is a person going back', () => {
  it('Android back, router.back() and the iPhone swipe — and nothing else', () => {
    expect(isGoingBack({ type: 'GO_BACK' })).toBe(true);
    expect(isGoingBack({ type: 'POP' })).toBe(true);
    expect(isGoingBack({ type: 'REPLACE' })).toBe(false);
    expect(isGoingBack({ type: 'RESET' })).toBe(false);
    expect(isGoingBack({ type: 'POP_TO' })).toBe(false);
    expect(isGoingBack({ type: 'NAVIGATE' })).toBe(false);
  });
});
