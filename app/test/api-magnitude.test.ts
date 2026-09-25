import { describe, expect, it } from 'vitest';

import {
  MAGNITUDE_COLUMNS,
  MAGNITUDE_KEY,
  MAGNITUDE_LIMIT,
  MAGNITUDE_MULTIPLE,
  MAGNITUDE_ORDER,
  MAGNITUDE_ORDER_ASCENDING,
  MAGNITUDE_SAMPLES,
  MAGNITUDE_TABLE,
  NOTHING_TYPICAL,
  magnitudeNote,
  outsized,
  typicalFrom,
  type MagnitudeRow,
} from '@/api/magnitude';
import { ES } from '@/strings';

// ============================================================================
// ADR-035 §2.8's THIRD GUARD — THE MAGNITUDE WARNING. Plan task `5f.5`.
//
// ⚠️ §2.11 allows a suite *"where a test pins a VALUE a customer sees or the
// ledger stores"* and refuses one over rendering. Everything below is the first
// kind: which deliveries count as history, what the middle one of them is, and
// whether a keyed figure is beyond three times it. **The amber itself is the
// screens', and no instrument here can look at it.**
//
// ⚠️⚠️ WHAT THIS FILE CANNOT ASSERT IS THE WIRE. That `qty_base::text` really
// comes back as a STRING rather than the JSON number `2.000` is a question only
// a real PostgREST answers, and `docs/checks/5f.5-magnitude-contract.sh` is
// where it is asked. A suite that fed itself strings would be green on a
// contract that had silently started sending doubles.
// ============================================================================

let serial = 0;

/** One standing delivery of `variantId`: `base` at scale 3, `perBase` at scale 6. */
function line(variantId: string, base: string, perBase = '10.000000'): MagnitudeRow {
  serial += 1;
  return {
    variant_id: variantId,
    qty_base: base,
    unit_price_net_per_base: perBase,
    purchase: { id: `doc-${serial}`, reversal_of: null },
  };
}

/** Three identical deliveries — the fewest that make the guard speak at all. */
function history(variantId: string, base: string, perBase = '10.000000'): MagnitudeRow[] {
  return [line(variantId, base, perBase), line(variantId, base, perBase), line(variantId, base, perBase)];
}

describe('the contract, which is a claim about the applied schema', () => {
  it('names the table and the columns once', () => {
    expect(MAGNITUDE_TABLE).toBe('purchase_line');
    expect(MAGNITUDE_COLUMNS).toContain('variant_id');
    expect(MAGNITUDE_COLUMNS).toContain('qty_base::text');
    expect(MAGNITUDE_COLUMNS).toContain('unit_price_net_per_base::text');
  });

  it('casts both numeric columns, because a bare numeric is a double (R5)', () => {
    expect(MAGNITUDE_COLUMNS).not.toContain('qty_base,');
    expect(MAGNITUDE_COLUMNS).not.toMatch(/(^|,)unit_price_net_per_base(,|$)/);
  });

  it('asks for no column the guard does not read (C8.8, R13)', () => {
    for (const unread of ['qty_display', 'line_net', 'tax_amount', 'tax_rate', 'expiry_date']) {
      expect(MAGNITUDE_COLUMNS).not.toContain(unread);
    }
    // ⚠️ AND NO PROVIDER — that is a question `@/api/costs` already owns.
    expect(MAGNITUDE_COLUMNS).not.toContain('provider_id');
  });

  it('embeds the document inner, so a line with no readable document is not a sample', () => {
    expect(MAGNITUDE_COLUMNS).toContain('purchase!inner(id,occurred_at,reversal_of)');
  });

  it('selects occurred_at even though nothing reads it — PostgREST requires it', () => {
    // ⚠️⚠️ THIS ASSERTION EXISTS BECAUSE THE CONTRACT CHECK FOUND THE DEFECT AND
    // THIS SUITE COULD NOT. The module shipped without `occurred_at` and the
    // first live run answered 400, `42703: column
    // purchase_line_purchase_1.occurred_at does not exist` — PostgREST will only
    // order a PARENT by an embedded column that is in the embed's select list.
    // ⚠️ IT IS PINNED HERE ANYWAY, because the reason is invisible: it is the one
    // column in this contract that nothing in the app reads, so a tidying pass
    // that trusted `MagnitudeRow` would delete it and 400 both capture screens.
    expect(MAGNITUDE_COLUMNS).toContain('occurred_at');
    expect(MAGNITUDE_ORDER).toContain('occurred_at');
  });

  it('orders by the COLUMN EXPRESSION and never by { referencedTable }', () => {
    // ⚠️⚠️ THE TRAP `COSTS_ORDER` MEASURED: the option form sets `purchase.order`,
    // which sorts the embedded row inside each parent — nothing at all on a
    // to-one embed. Here it is worse than a mis-drawn chart, because the LIMIT
    // slices whatever order the response came back in.
    expect(MAGNITUDE_ORDER).toBe('purchase(occurred_at)');
    expect(MAGNITUDE_ORDER_ASCENDING).toBe(false);
  });

  it('bounds the read, which is what makes "trailing" mean anything', () => {
    expect(Number.isInteger(MAGNITUDE_LIMIT)).toBe(true);
    expect(MAGNITUDE_LIMIT).toBeGreaterThan(0);
  });
});

describe('the cache key', () => {
  it('takes no argument — one read for the basket, never one per line', () => {
    // ⚠️ THIS IS THE ROW'S SIZING FINDING, PINNED. `costsKey` takes a variant
    // because `Costos` is a per-product screen; a per-variant key here would be
    // a round trip per product added to a basket.
    expect(MAGNITUDE_KEY).toEqual(['magnitude', 'typical']);
    expect(typeof MAGNITUDE_KEY).not.toBe('function');
  });
});

describe('typicalFrom — what the shop usually buys', () => {
  it('reads nothing out of nothing, and nothing is not zero', () => {
    expect(typicalFrom(null)).toBe(NOTHING_TYPICAL);
    expect(typicalFrom(undefined)).toBe(NOTHING_TYPICAL);
    expect(typicalFrom([])).toEqual({});
  });

  it('takes the middle value and not the mean — which is why §2.8 says median', () => {
    const rows = [line('v', '1.000'), line('v', '2.000'), line('v', '30.000')];
    // The mean is 11; the median is 2. One freak delivery must not move it.
    expect(typicalFrom(rows)['v']?.base).toBe(2000);
  });

  it('averages the two middle values, half-up away from zero, on an even count', () => {
    const rows = [line('v', '1.000'), line('v', '2.000'), line('v', '3.000'), line('v', '4.000')];
    expect(typicalFrom(rows)['v']?.base).toBe(2500);
  });

  it('is not moved by the order the database sent', () => {
    const forwards = typicalFrom([line('v', '1.000'), line('v', '5.000'), line('v', '3.000')]);
    const backwards = typicalFrom([line('v', '3.000'), line('v', '5.000'), line('v', '1.000')]);
    expect(forwards['v']?.base).toBe(3000);
    expect(backwards['v']?.base).toBe(3000);
  });

  it('keeps each product apart', () => {
    const typicals = typicalFrom([...history('a', '1.000'), ...history('b', '50.000')]);
    expect(typicals['a']?.base).toBe(1000);
    expect(typicals['b']?.base).toBe(50000);
  });

  it('carries quantity and price as integers at their own scales (R5)', () => {
    const typicals = typicalFrom(history('v', '2.500', '0.073000'));
    expect(typicals['v']?.base).toBe(2500);
    expect(typicals['v']?.perBase).toBe(73000);
    expect(typicals['v']?.deliveries).toBe(3);
  });

  describe('the void rule, which matters more here than it does on a chart', () => {
    it('drops the reversal AND the document it cancels', () => {
      const original = line('v', '2.000');
      const reversal: MagnitudeRow = {
        variant_id: 'v',
        qty_base: '-2.000',
        unit_price_net_per_base: '10.000000',
        purchase: { id: 'doc-void', reversal_of: original.purchase.id },
      };
      const typicals = typicalFrom([reversal, original, ...history('v', '8.000')]);
      // ⚠️ IF EITHER HALF SURVIVED the median would not be 8: the negative would
      // drag it down and the original would pull it to 8/2. Both gone, three
      // eights stand.
      expect(typicals['v']?.base).toBe(8000);
      expect(typicals['v']?.deliveries).toBe(3);
    });

    it('finds the reversal even when it arrives AFTER the document it cancels', () => {
      // ⚠️ `takingsFrom`'s two passes, and `costsFrom`'s: newest-first ordering
      // makes this the normal case, not the odd one.
      const original = line('v', '99.000');
      const reversal: MagnitudeRow = {
        variant_id: 'v',
        qty_base: '-99.000',
        unit_price_net_per_base: '10.000000',
        purchase: { id: 'doc-void-2', reversal_of: original.purchase.id },
      };
      expect(typicalFrom([original, reversal])['v']).toBeUndefined();
    });
  });

  it('drops a row it cannot parse rather than emptying the product’s history', () => {
    const broken = { ...line('v', '1.000'), qty_base: 2 as unknown as string };
    const typicals = typicalFrom([broken, ...history('v', '4.000')]);
    expect(typicals['v']?.base).toBe(4000);
    expect(typicals['v']?.deliveries).toBe(3);
  });

  it('drops a row whose document did not come back', () => {
    const orphan = { ...line('v', '1.000'), purchase: undefined as unknown as MagnitudeRow['purchase'] };
    expect(typicalFrom([orphan])['v']).toBeUndefined();
  });
});

describe('outsized — §2.8’s comparison', () => {
  const usual = typicalFrom(history('v', '2.000', '10.000000'))['v'];

  it('says nothing about a product the shop has never bought', () => {
    // ⚠️ *nothing to compare against* is not *this looks wrong*.
    expect(outsized(undefined, 999_000, '999.000000')).toBe('none');
  });

  it('says nothing until a median is a median', () => {
    const two = typicalFrom([line('v', '2.000'), line('v', '2.000')])['v'];
    expect(two?.deliveries).toBe(2);
    expect(two && two.deliveries < MAGNITUDE_SAMPLES).toBe(true);
    expect(outsized(two, 900_000, null)).toBe('none');
  });

  it('flags a quantity beyond three times the usual one', () => {
    expect(outsized(usual, 6001, null)).toBe('quantity');
  });

  it('does NOT flag exactly three times — §2.8 says "beyond"', () => {
    // The end-of-month case: a shop that usually takes one case takes three.
    expect(outsized(usual, 2000 * MAGNITUDE_MULTIPLE, null)).toBe('none');
  });

  it('flags a cost beyond three times the usual one, from the string the cart holds', () => {
    expect(outsized(usual, 2000, '30.000001')).toBe('price');
    expect(outsized(usual, 2000, '30.000000')).toBe('none');
  });

  it('flags both when both are out, because one mistake often causes two', () => {
    expect(outsized(usual, 60_000, '400.000000')).toBe('both');
  });

  it('ignores the price on a screen that has no typed one — which is every sale', () => {
    // ⚠️ `quoteFor` takes a sale's price off the catalog, so Vender passes null.
    expect(outsized(usual, 2000, null)).toBe('none');
    expect(outsized(usual, 60_000, null)).toBe('quantity');
  });

  it('ignores a price it cannot parse rather than flagging on it', () => {
    expect(outsized(usual, 2000, '8.')).toBe('none');
    expect(outsized(usual, 2000, '')).toBe('none');
  });

  it('never flags against a zero median', () => {
    // A product genuinely delivered free would otherwise be beyond 3× zero for ever.
    const free = typicalFrom(history('v', '2.000', '0.000000'))['v'];
    expect(free?.perBase).toBe(0);
    expect(outsized(free, 2000, '500.000000')).toBe('none');
  });

  it('says nothing about a product not in the basket', () => {
    expect(outsized(usual, 0, null)).toBe('none');
  });
});

describe('magnitudeNote — the word, chosen here and not in a screen (R4)', () => {
  it('has one for each flag and silence for none', () => {
    expect(magnitudeNote('none')).toBe('');
    expect(magnitudeNote('quantity')).toBe(ES.counter.outsizedQty);
    expect(magnitudeNote('price')).toBe(ES.counter.outsizedPrice);
    expect(magnitudeNote('both')).toBe(ES.counter.outsizedBoth);
  });

  it('never says a shopkeeper is wrong — §2.8 never blocks, and C3.9 is why', () => {
    for (const word of [ES.counter.outsizedQty, ES.counter.outsizedPrice, ES.counter.outsizedBoth]) {
      expect(word).toContain('habitual');
      // ⚠️ *normal* carries a shade of *not right* in Spanish; *habitual* is
      // purely about how often. See `src/strings.ts`.
      expect(word).not.toContain('normal');
      expect(word).not.toContain('error');
    }
  });
});
