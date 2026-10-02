// ============================================================================
// THE CART AND ITS ARITHMETIC. Plan task `5f-i`.
//
// ⚠️ WHAT THIS SUITE IS FOR, AND IT IS THE REASON `5f` SPLIT: every rule below
// has a right answer, and the screens that act on them have none that any check
// in this repository can read (§2.11, `R9`). So this is the whole instrument for
// the half of Vender that reaches the ledger — the quantity a shopkeeper meant,
// the price a customer agreed to, and the payload Postgres is told.
//
// ⚠️ IT REACHES NO COMPONENT (`R2`) and it is `.ts`. `@/cart/store` is a Zustand
// store rather than a component, so it loads here — with `deviceStore()`
// returning `undefined` under node, which is the persistence path's own
// "missing store is an ordinary input" rule being exercised rather than mocked.
//
// ⚠️⚠️ THE ARITHMETIC IS CHECKED AGAINST `0016`'s OWN, NOT AGAINST ITSELF. The
// server re-derives `qty_base = round(qty_display × factor_to_base, 3)` from
// whatever this module sends, so every quantity case below asserts that BOTH
// spellings — the price-unit one and the base-unit one — land on the same
// `qty_base`. A suite that only checked the string would pass on a module that
// had picked the wrong unit.
// ============================================================================

import { beforeEach, describe, expect, it } from 'vitest';

import { SCALE, formatDecimal, parseDecimal } from '@tienda/money';

import {
  VARIANT_COLUMNS,
  catalogFrom,
  unitFactorsFrom,
  type UnitRow,
  type VariantRow,
} from '@/api/catalog';
import { isWriteKind, isWritePayload, queueWrite, type WriteDraft } from '@/api/outbox';
import { RECORD_RPC, sendArgs } from '@/api/flush';
import {
  EMPTY_BASKET,
  EMPTY_CART,
  MONEY_KIND,
  PRICE_KEY,
  SCOPES,
  UNPRICED_WASTE,
  WRITE_KIND,
  NO_QUOTES,
  basketOf,
  draftOf,
  keyedBase,
  lineCentavos,
  lineSent,
  qtyOf,
  qtySent,
  quoteFor,
  quoted,
  remove,
  reviewOf,
  setQty,
  step,
  stepOf,
  type Cart,
} from '@/cart/cart';
import { CART_KEY, useCartStore } from '@/cart/store';
import { WASTE_REASONS, WASTE_REASON_KEY } from '@/api/waste';

// ---------------------------------------------------------------------------
// The shop. `0001`'s own ten units, and the pollería the interview described.
// ---------------------------------------------------------------------------

const UNITS: readonly UnitRow[] = [
  { code: 'g', dimension: 'mass', base_code: 'g', factor_to_base: '1.000000', display_order: 40 },
  { code: 'kg', dimension: 'mass', base_code: 'g', factor_to_base: '1000.000000', display_order: 10 },
  { code: '500g', dimension: 'mass', base_code: 'g', factor_to_base: '500.000000', display_order: 20 },
  { code: '250g', dimension: 'mass', base_code: 'g', factor_to_base: '250.000000', display_order: 25 },
  { code: '100g', dimension: 'mass', base_code: 'g', factor_to_base: '100.000000', display_order: 30 },
  { code: 'pza', dimension: 'count', base_code: 'pza', factor_to_base: '1.000000', display_order: 10 },
];

const FACTORS = unitFactorsFrom(UNITS);
const FAMILY = '11111111-1111-4111-8111-111111111111';
const WORKSPACE = '22222222-2222-4222-8222-222222222222';
const LOCATION = '33333333-3333-4333-8333-333333333333';
const PECHUGA = '44444444-4444-4444-8444-444444444444';
/** `Compra directa`, or whatever the shop calls it — `5g-i`. */
const PROVIDER = '88888888-8888-4888-8888-888888888888';
const HUEVO = '55555555-5555-4555-8555-555555555555';

function variant(
  id: string,
  name: string,
  priceUnit: string,
  baseUnit: string,
  perBase: string | null,
): VariantRow {
  return {
    id,
    name,
    family_id: FAMILY,
    price_unit_code: priceUnit,
    base_unit_code: baseUnit,
    is_active: true,
    template_code: null,
    product_family: { id: FAMILY, name: 'Pollo' },
    price_list: perBase === null ? [] : [{ price_per_base: perBase, location_id: null }],
  };
}

/**
 * The owner's own example, priced exactly as he stated it: **$45 per 250 g**.
 * Per base that is `45 / 250 = 0.18` pesos a gram — `0.180000` at scale 6.
 */
const ROWS: readonly VariantRow[] = [
  variant(PECHUGA, 'Pechuga', '250g', 'g', '0.180000'),
  variant(HUEVO, 'Huevo', 'pza', 'pza', '3.500000'),
];

const CATALOG = catalogFrom(ROWS, FACTORS, null);
const entry = (id: string) => CATALOG.find((e) => e.id === id)!;

/**
 * The draft out of a `Drafted`, or a failed assertion saying why not.
 *
 * ⚠️ A NARROWING HELPER AND NOT A CAST. `draftOf` returns a discriminated union
 * on purpose; a test that cast past it would keep compiling on the day the
 * function started refusing, and report the refusal as a missing property.
 */
function mustDraft(d: ReturnType<typeof draftOf>): WriteDraft {
  if (!d.ok) throw new Error(`expected a draft, got ${d.why}`);
  return d.draft;
}

/** `qty_base` as `0016` computes it: `round(qty_display × factor_to_base, 3)`. */
function serverBase(display: string, unit: string): number {
  const qty = parseDecimal(display, SCALE.quantity);
  const factor = parseDecimal(FACTORS[unit], 6);
  return Math.round((qty * factor) / 10 ** 6);
}

// ---------------------------------------------------------------------------
describe('the catalog now carries what a basket needs', () => {
  it('reads the base unit off the variant, which a keyed quantity is sent in', () => {
    expect(entry(PECHUGA).baseUnit).toBe('g');
    expect(entry(PECHUGA).priceUnit).toBe('250g');
    expect(entry(HUEVO).baseUnit).toBe('pza');
  });

  it('still asks for no tax rate, no pack size and no stock switch', () => {
    // ⚠️⚠️ THE FENCE `5d-i` BUILT, AND `5f-i` TRIED TO WIDEN. Its contract check
    // bans all three from this read by name — *a column the app never asks for
    // is a column that never reaches a phone* — and `5e-iii-a` reads the two
    // set-once figures per variant instead. The basket needs a rate only on the
    // branch no shop takes, so it is handed in rather than carried by every
    // catalog read on every phone.
    for (const banned of ['tax_rate', 'pack_size', 'enforce_stock']) {
      expect(VARIANT_COLUMNS).not.toContain(banned);
    }
  });

  it('keeps `price_per_base` as the string Postgres sent, not as centavos', () => {
    // ⚠️ THE RAW STRING IS THE DELIVERABLE. `centavos` is what one PRICE unit
    // costs — $45.00 for a quarter-kilo — and a line needs what one BASE unit
    // costs. Deriving one from the other divides a rounded figure back out.
    expect(entry(PECHUGA).perBase).toBe('0.180000');
    expect(entry(PECHUGA).centavos).toBe(4500);
  });

  it('carries no price rather than a zero when the shop has priced nothing', () => {
    const unpriced = catalogFrom([variant(PECHUGA, 'Pechuga', '250g', 'g', null)], FACTORS, null);
    expect(unpriced[0].perBase).toBeNull();
    expect(unpriced[0].centavos).toBeNull();
  });


});

// ---------------------------------------------------------------------------
describe('the step is the price unit, and it comes out of the unit table', () => {
  it('steps by what one price unit weighs', () => {
    expect(stepOf('250g', FACTORS)).toBe(250_000);
    expect(stepOf('kg', FACTORS)).toBe(1_000_000);
    expect(stepOf('pza', FACTORS)).toBe(1_000);
  });

  it('refuses a unit this phone has not read, rather than stepping by zero', () => {
    expect(stepOf('caja', FACTORS)).toBeNull();
    expect(stepOf('250g', {})).toBeNull();
    expect(stepOf('250g', { '250g': 'not a number' })).toBeNull();
    expect(stepOf('250g', { '250g': '0.000000' })).toBeNull();
  });

  it('walks the owners own sequence: 250, 500, 750, 1000', () => {
    const by = stepOf('250g', FACTORS);
    let cart: Cart = EMPTY_CART;
    const read: number[] = [];
    for (let i = 0; i < 4; i++) {
      cart = step(cart, PECHUGA, by, 1);
      read.push(qtyOf(cart, PECHUGA) / 1000);
    }
    expect(read).toEqual([250, 500, 750, 1000]);
  });

  it('leaves the basket untouched when the step is unknown', () => {
    const cart = setQty(EMPTY_CART, PECHUGA, 250_000);
    expect(step(cart, PECHUGA, null, 1)).toBe(cart);
    expect(step(cart, PECHUGA, 0, 1)).toBe(cart);
  });
});

// ---------------------------------------------------------------------------
describe('quantity IS the line — C3.3', () => {
  it('has no line until there is a quantity', () => {
    expect(EMPTY_CART).toHaveLength(0);
    expect(qtyOf(EMPTY_CART, PECHUGA)).toBe(0);
  });

  it('removes the line when the quantity stops being positive', () => {
    const cart = setQty(EMPTY_CART, PECHUGA, 250_000);
    expect(setQty(cart, PECHUGA, 0)).toHaveLength(0);
    expect(setQty(cart, PECHUGA, -1)).toHaveLength(0);
  });

  it('steps DOWN through zero to nothing, rather than clamping to a zero row', () => {
    const by = stepOf('250g', FACTORS);
    const cart = step(EMPTY_CART, PECHUGA, by, 1);
    expect(step(cart, PECHUGA, by, -1)).toHaveLength(0);
  });

  it('adds a new line at the end and leaves an existing one where it is', () => {
    let cart = setQty(EMPTY_CART, PECHUGA, 250_000);
    cart = setQty(cart, HUEVO, 12_000);
    cart = setQty(cart, PECHUGA, 500_000);
    expect(cart.map((l) => l.variantId)).toEqual([PECHUGA, HUEVO]);
    expect(qtyOf(cart, PECHUGA)).toBe(500_000);
  });

  it('returns the same basket when a removal would change nothing', () => {
    const cart = setQty(EMPTY_CART, PECHUGA, 250_000);
    expect(remove(cart, HUEVO)).toBe(cart);
    expect(remove(cart, PECHUGA)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
describe('the keypad counts base units, and refuses what the column cannot hold', () => {
  it('takes the owners own 288 grams', () => {
    expect(keyedBase('288')).toBe(288_000);
  });

  it('takes three decimals, which is what numeric(14,3) holds', () => {
    expect(keyedBase('2.050')).toBe(2_050);
    expect(keyedBase('0.001')).toBe(1);
  });

  it('refuses a fourth decimal rather than rounding it away', () => {
    // ⚠️ A figure the column cannot store must not be accepted and quietly
    // changed: the number read back would not be the number typed.
    expect(keyedBase('2.0501')).toBeNull();
  });

  it('refuses zero, a blank and a word', () => {
    expect(keyedBase('0')).toBeNull();
    expect(keyedBase('')).toBeNull();
    expect(keyedBase('   ')).toBeNull();
    expect(keyedBase('kilo')).toBeNull();
    expect(keyedBase('-1')).toBeNull();
  });

  it('takes a comma, because a Mexican keypad offers one', () => {
    expect(keyedBase('2,050')).toBe(2_050);
  });
});

// ---------------------------------------------------------------------------
describe('how the server is told a quantity — the owners rule, both halves', () => {
  it('sends three taps as three of the price unit', () => {
    expect(qtySent(750_000, entry(PECHUGA), FACTORS)).toEqual({
      qty_display: '3',
      qty_display_unit: '250g',
    });
  });

  it('sends a keyed 288 as grams, not as 1.152 of a quarter kilo', () => {
    expect(qtySent(288_000, entry(PECHUGA), FACTORS)).toEqual({
      qty_display: '288.000',
      qty_display_unit: 'g',
    });
  });

  it('agrees with 0016 on qty_base whichever spelling it chose', () => {
    // ⚠️⚠️ THIS IS THE ASSERTION THAT MAKES THE CHOICE SAFE. Both spellings
    // re-derive the same `qty_base` server-side, so the unit is a decision
    // about what a receipt reads and never about what the ledger stores.
    for (const base of [250_000, 500_000, 750_000, 1_000_000, 288_000, 2_050, 1]) {
      const sent = qtySent(base, entry(PECHUGA), FACTORS)!;
      expect(serverBase(sent.qty_display, sent.qty_display_unit)).toBe(base);
    }
  });

  it('sends a piece as a piece', () => {
    expect(qtySent(12_000, entry(HUEVO), FACTORS)).toEqual({
      qty_display: '12',
      qty_display_unit: 'pza',
    });
  });

  it('refuses a quantity that is not one', () => {
    expect(qtySent(0, entry(PECHUGA), FACTORS)).toBeNull();
    expect(qtySent(-250_000, entry(PECHUGA), FACTORS)).toBeNull();
    expect(qtySent(1.5, entry(PECHUGA), FACTORS)).toBeNull();
  });

  it('falls back to the base unit when the price unit is unreadable', () => {
    expect(qtySent(288_000, entry(PECHUGA), {})).toEqual({
      qty_display: '288.000',
      qty_display_unit: 'g',
    });
  });
});

// ---------------------------------------------------------------------------
describe('the price direction follows the document — §2.5 rule 2', () => {
  const IVA = 1_600; // 16% at scale 4, as `numeric(5,4)` stores it

  const SHELF = '0.180000';

  it('sends the typed price as the sale gross when prices already include IVA', () => {
    // The anchor, and no rate is consulted at all — which is every shop today.
    expect(quoted(SHELF, 'sell', true)).toBe(180_000);
    expect(quoted(SHELF, 'sell', true, null)).toBe(180_000);
  });

  it('grosses the typed price UP for a sale when they do not', () => {
    // 0.180000 net at 16% -> 0.208800 gross. The customer pays the gross.
    expect(quoted(SHELF, 'sell', false, IVA)).toBe(208_800);
  });

  // ⚠️⚠️ THESE TWO ASSERTIONS WERE REWRITTEN BY `5g-i` ON 2026-09-24 BECAUSE
  // THEY PINNED A DISAGREEMENT WITH THE ADR, AND THE ADR WINS. They used to
  // require `quoted(SHELF, 'buy', true, IVA)` to net the figure DOWN and
  // `quoted(SHELF, 'buy', true)` to REFUSE — both on the reading that
  // `prices_include_tax` governs a delivery. §2.5 rule 2 says in its own
  // parenthesis that it does not: *"`prices_include_tax` is a workspace flag, so
  // the earlier wording read as though it governed deliveries too; it does not."*
  // ⚠️ `0018`'s header is binding on the same point and has been since
  // 2026-08-26: *"a shelf price is agreed gross and a supplier invoice is quoted
  // net"*, and the key it reads is `unit_price_net_per_base` — the INVOICE net.
  it('sends a purchase quote VERBATIM, whatever the workspace flag says', () => {
    // ⚠️⚠️ AND THE OLD READING MADE COMPRAR IMPOSSIBLE RATHER THAN WRONG.
    // `prices_include_tax` is true by `0001`'s default and true in every shop
    // that exists, so the buy side could never be priced at all — which `5f-i`
    // recorded as *"priceless until 5g hands a figure in"* when the figure was
    // never the missing half.
    expect(quoted(SHELF, 'buy', true)).toBe(180_000);
    expect(quoted(SHELF, 'buy', true, IVA)).toBe(180_000);
    expect(quoted(SHELF, 'buy', false)).toBe(180_000);
    expect(quoted(SHELF, 'buy', false, IVA)).toBe(180_000);
  });

  it('never consults a tax rate on a purchase, because the net is the anchor', () => {
    // ⚠️ The rate is still SNAPSHOTTED server-side from the variant (`0018:80`,
    // *"tax_rate is NOT accepted from the client"*) — what changed is that this
    // app does not need one to build the line.
    for (const rate of [null, 0, IVA, 8_000]) {
      expect(quoted(SHELF, 'buy', true, rate)).toBe(180_000);
    }
  });

  it('REFUSES to quote rather than guessing when the branch needs a rate', () => {
    // ⚠️⚠️ THE WHOLE POINT OF THE ARGUMENT, and it is now a SALE-ONLY branch. A
    // shop that answers *no* to *¿Tus precios ya incluyen IVA?* is quoted
    // nothing until something hands the rate in — loud and stuck, rather than
    // quiet and short by the IVA on every line for ever. A zero default here is
    // the bug this refuses.
    expect(quoted(SHELF, 'sell', false)).toBeNull();
    expect(quoted(SHELF, 'sell', false, null)).toBeNull();
  });

  it('is the identity at a zero rate, which is 0002s own default', () => {
    expect(quoted(SHELF, 'sell', false, 0)).toBe(180_000);
    expect(quoted(SHELF, 'buy', true, 0)).toBe(180_000);
  });

  it('has nothing to quote when the shop has priced nothing', () => {
    expect(quoted(null, 'sell', true)).toBeNull();
    expect(quoted('not a price', 'sell', true)).toBeNull();
  });

  it('NEVER prices a purchase off the shelf — C3.11, and it is a fallback refused', () => {
    // ⚠️⚠️ A supplier price is a fact about a RELATIONSHIP. Taking the shelf
    // price here would record a delivery at retail: plausible, syntactically
    // perfect, and wrong in the margin for ever.
    expect(quoteFor(entry(PECHUGA), 'sell', NO_QUOTES)).toBe(SHELF);
    expect(quoteFor(entry(PECHUGA), 'buy', NO_QUOTES)).toBeNull();
    expect(quoteFor(entry(PECHUGA), 'buy', { [PECHUGA]: '0.150000' })).toBe('0.150000');
  });

  it('uses the price KEY each RPC actually names', () => {
    // ⚠️ Sending the other key leaves the function with no price at all.
    expect(PRICE_KEY.sell).toBe('unit_price_gross_per_base');
    expect(PRICE_KEY.buy).toBe('unit_price_net_per_base');
  });
});

// ---------------------------------------------------------------------------
describe('what a line and a basket cost', () => {
  it('prices the owners example to the centavo', () => {
    // $45 / 250 g, sold as 288 g: 0.18 x 288 = $51.84.
    expect(lineCentavos(180_000, 288_000)).toBe(5_184);
    expect(lineCentavos(180_000, 250_000)).toBe(4_500);
  });

  it('sums the ROUNDED lines and never rounds the sum — §2.5 rule 5', () => {
    let cart: Cart = setQty(EMPTY_CART, PECHUGA, 288_000);
    cart = setQty(cart, HUEVO, 3_000);
    const basket = basketOf(cart, CATALOG, 'sell', true);
    expect(basket).toEqual({ centavos: 5_184 + 1_050, lines: 2, complete: true });
  });

  it('counts an unpriced line as missing rather than as nothing — C3.12', () => {
    // ⚠️⚠️ THE ONE NUMBER BOTH SCREENS READ. `5g` blocks a purchase on this
    // (C3.13) and `5h` lets a sale through loudly (C3.14); a total that
    // absorbed the line would make them disagree about one basket.
    const mixed = catalogFrom([variant(PECHUGA, 'Pechuga', '250g', 'g', null), ROWS[1]], FACTORS, null);
    let cart: Cart = setQty(EMPTY_CART, PECHUGA, 288_000);
    cart = setQty(cart, HUEVO, 2_000);
    const basket = basketOf(cart, mixed, 'sell', true);
    expect(basket.complete).toBe(false);
    expect(basket.lines).toBe(2);
    expect(basket.centavos).toBe(700);
  });

  it('treats a variant that is not in the catalog as unpriced, not as a crash', () => {
    const basket = basketOf(setQty(EMPTY_CART, 'nobody', 1_000), CATALOG, 'sell', true);
    expect(basket).toEqual({ centavos: 0, lines: 1, complete: false });
  });

  it('is empty and complete when there is nothing in it', () => {
    expect(basketOf(EMPTY_CART, CATALOG, 'sell', true)).toEqual(EMPTY_BASKET);
  });
});

// ---------------------------------------------------------------------------
// ⚠️⚠️ THE REVIEW SCREEN'S OWN ARITHMETIC — `5f-iii-a`, and the reason that
// child is not a pure rendering task. §2.5 rule 5 is written about the basket
// sheet BY NAME: *"the displayed lines fail to sum to the displayed total on
// the review screen, which is the one screen where a customer is checking the
// arithmetic by hand."* `basketOf` returned a total and a COUNT and never the
// lines, so a sheet drawing its own rows would price the basket a second time.
// These assertions read the identity rather than a reviewer hoping for it.
describe('the sheet and the bar are one arithmetic — §2.5 rule 5', () => {
  let cart: Cart = setQty(EMPTY_CART, PECHUGA, 288_000);
  cart = setQty(cart, HUEVO, 3_000);

  it('gives the sheet one row per line, in the order they were added', () => {
    // ⚠️ RULE 4: a review with no rows makes every assertion below vacuous.
    const review = reviewOf(cart, CATALOG, 'sell', true);
    expect(review.rows).toHaveLength(2);
    expect(review.rows.map((r) => r.variantId)).toEqual([PECHUGA, HUEVO]);
  });

  it('makes the total the SUM OF THE ROWS and not a second pass', () => {
    const review = reviewOf(cart, CATALOG, 'sell', true);
    const drawn = review.rows.reduce((n, r) => n + (r.centavos ?? 0), 0);
    expect(review.basket.centavos).toBe(drawn);
    expect(drawn).toBe(5_184 + 1_050);
  });

  it('is the SAME total the sticky bar shows, because the bar reads this one', () => {
    // ⚠️⚠️ THE ASSERTION THE SPLIT EXISTS FOR. If these two ever disagree, a
    // customer adding up the sheet by hand gets a different answer from the
    // number she is being charged. `basketOf` delegates, so they cannot.
    expect(basketOf(cart, CATALOG, 'sell', true)).toEqual(reviewOf(cart, CATALOG, 'sell', true).basket);
  });

  it('holds the identity on a basket with a priceless line too', () => {
    // The branch where two arithmetics would actually part: a line the sheet
    // cannot price is `null` on the row and MISSING from the sum, never a zero.
    const mixed = catalogFrom([variant(PECHUGA, 'Pechuga', '250g', 'g', null), ROWS[1]], FACTORS, null);
    const review = reviewOf(cart, mixed, 'sell', true);
    expect(review.rows[0].centavos).toBeNull();
    expect(review.rows[1].centavos).toBe(1_050);
    expect(review.basket).toEqual({ centavos: 1_050, lines: 2, complete: false });
    expect(basketOf(cart, mixed, 'sell', true)).toEqual(review.basket);
  });

  it('carries the name and the family the sheet draws, off the catalog', () => {
    const review = reviewOf(cart, CATALOG, 'sell', true);
    expect(review.rows[0].name).toBe('Pechuga');
    expect(review.rows[0].familyName).toBe('Pollo');
    expect(review.rows[0].base).toBe(288_000);
  });

  it('DRAWS a line whose variant has left the catalog rather than hiding it', () => {
    // ⚠️⚠️ THE ONE JUDGEMENT IN `reviewOf`, AND IT IS NOT DEFENSIVE. A manager
    // retires a product on another phone while this basket is open;
    // `draftOf` then refuses the WHOLE basket with `variant-not-in-catalog`,
    // and the list behind the sheet is the catalog, which no longer has the
    // row. So the sheet is the only surface that can remove it — and a sheet
    // that hid what it could not name would leave a shopkeeper with a commit
    // that refuses and nothing on screen to act on.
    const gone: Cart = setQty(cart, 'nobody', 1_000);
    const review = reviewOf(gone, CATALOG, 'sell', true);
    expect(review.rows).toHaveLength(3);
    expect(review.rows[2]).toEqual({
      variantId: 'nobody',
      name: null,
      familyName: null,
      base: 1_000,
      centavos: null,
    });
    expect(draftOf(gone, CATALOG, FACTORS, 'sell', true, WORKSPACE, LOCATION)).toEqual({
      ok: false,
      why: 'variant-not-in-catalog',
    });
  });

  it('shows nothing and sums to nothing on an empty basket', () => {
    const review = reviewOf(EMPTY_CART, CATALOG, 'sell', true);
    expect(review.rows).toEqual([]);
    expect(review.basket).toEqual(EMPTY_BASKET);
  });

  it('follows the document direction the bar follows — §2.5 rule 2', () => {
    // A net-priced shop cannot be quoted without a rate (see the module
    // header), so BOTH the row and the total withhold rather than guess. The
    // point is that they withhold TOGETHER.
    const review = reviewOf(cart, CATALOG, 'sell', false);
    expect(review.rows.every((r) => r.centavos === null)).toBe(true);
    expect(review.basket).toEqual({ centavos: 0, lines: 2, complete: false });
  });
});

// ---------------------------------------------------------------------------
describe('the payload, and the queue that accepts it', () => {
  let cart: Cart = setQty(EMPTY_CART, PECHUGA, 750_000);
  cart = setQty(cart, HUEVO, 12_000);

  it('builds one line per basket row, in basket order', () => {
    const lines = mustDraft(draftOf(cart, CATALOG, FACTORS, 'sell', true, WORKSPACE, LOCATION))
      .payload.lines;
    expect(lines).toEqual([
      {
        variant_id: PECHUGA,
        qty_display: '3',
        qty_display_unit: '250g',
        unit_price_gross_per_base: '0.180000',
      },
      {
        variant_id: HUEVO,
        qty_display: '12',
        qty_display_unit: 'pza',
        unit_price_gross_per_base: '3.500000',
      },
    ]);
  });

  it('queues under the kind 0024 named, and reaches the RPC §2.6 names', () => {
    expect(WRITE_KIND.sell).toBe('sale');
    expect(WRITE_KIND.buy).toBe('purchase');
    expect(isWriteKind(WRITE_KIND.sell)).toBe(true);
    expect(RECORD_RPC[WRITE_KIND.sell]).toBe('record_sale');
    expect(RECORD_RPC[WRITE_KIND.buy]).toBe('record_purchase');
  });

  it('is a payload the outbox constraint accepts, and queueWrite takes it', () => {
    const draft = mustDraft(draftOf(cart, CATALOG, FACTORS, 'sell', true, WORKSPACE, LOCATION));
    expect(isWritePayload(draft.payload)).toBe(true);
    const queued = queueWrite(draft, {
      id: '66666666-6666-4666-8666-666666666666',
      now: '2026-09-24T09:00:00.000Z',
    });
    expect(queued.ok).toBe(true);
  });

  it('carries no occurred_at, so the QUEUE is the one answer to when', () => {
    // ⚠️ `@/api/flush` sends `queuedAt` whenever the payload has none, and says
    // why: a sale rung up at 09:00 and drained at 14:00 would otherwise be
    // stamped with the flush and count on the wrong day.
    const draft = mustDraft(draftOf(cart, CATALOG, FACTORS, 'sell', true, WORKSPACE, LOCATION));
    expect('occurred_at' in draft.payload).toBe(false);
    const queued = queueWrite(draft, {
      id: '66666666-6666-4666-8666-666666666666',
      now: '2026-09-24T09:00:00.000Z',
    });
    if (!queued.ok) throw new Error(`the queue refused the draft: ${queued.why}`);
    const args = sendArgs(queued.write);
    expect(args.p_occurred_at).toBe('2026-09-24T09:00:00.000Z');
    expect(args.p_location_id).toBe(LOCATION);
    expect(args.p_recorded_offline).toBe(false);
  });

  it('refuses every case a screen could put to it, and none is a sentence', () => {
    const no = (c: Cart, loc: string | null, cat = CATALOG) =>
      draftOf(c, cat, FACTORS, 'sell', true, WORKSPACE, loc);
    expect(no(EMPTY_CART, LOCATION)).toEqual({ ok: false, why: 'empty-cart' });
    expect(no(cart, null)).toEqual({ ok: false, why: 'no-location' });
    expect(no(cart, '')).toEqual({ ok: false, why: 'no-location' });
    expect(no(setQty(EMPTY_CART, 'nobody', 1_000), LOCATION)).toEqual({
      ok: false,
      why: 'variant-not-in-catalog',
    });
    const unpriced = catalogFrom([variant(PECHUGA, 'P', '250g', 'g', null)], FACTORS, null);
    expect(no(setQty(EMPTY_CART, PECHUGA, 250_000), LOCATION, unpriced)).toEqual({
      ok: false,
      why: 'line-cannot-be-priced',
    });
  });

  // ==========================================================================
  // THE COUNTERPARTY — plan task `5g-i`. A delivery has one and a sale does not.
  // ==========================================================================

  it('refuses a delivery with nobody to have come from', () => {
    // ⚠️⚠️ `record_purchase` raises 22023 — "a delivery has a counterparty, and
    // the generic provider is a real row" — on a null `p_provider_id`
    // (`0018:200`). Refused HERE it is a control that was never drawn; sent and
    // refused there it is a dead letter with a SQLSTATE on it.
    const buy = { 'v': '0.018000' };
    const priced = setQty(EMPTY_CART, PECHUGA, 250_000);
    const no = (provider: string | null) =>
      draftOf(priced, CATALOG, FACTORS, 'buy', true, WORKSPACE, LOCATION, {}, {
        [PECHUGA]: '0.018000',
      }, provider);
    expect(no(null)).toEqual({ ok: false, why: 'no-provider' });
    expect(no('')).toEqual({ ok: false, why: 'no-provider' });
    expect(no(PROVIDER).ok).toBe(true);
    expect(Object.keys(buy)).toHaveLength(1);
  });

  it('puts the provider on a purchase payload and nowhere near a sale', () => {
    // ⚠️ `@/api/flush` builds its arguments as `p_` plus the payload's own keys,
    // so a `provider_id` the sale side did not need would reach `record_sale` as
    // an argument it does not take.
    const priced = setQty(EMPTY_CART, PECHUGA, 250_000);
    const buy = mustDraft(
      draftOf(priced, CATALOG, FACTORS, 'buy', true, WORKSPACE, LOCATION, {}, {
        [PECHUGA]: '0.018000',
      }, PROVIDER),
    );
    expect(buy.payload.provider_id).toBe(PROVIDER);
    expect(isWritePayload(buy.payload)).toBe(true);

    const sell = mustDraft(
      draftOf(priced, CATALOG, FACTORS, 'sell', true, WORKSPACE, LOCATION, {}, {}, PROVIDER),
    );
    expect('provider_id' in sell.payload).toBe(false);
  });

  it('reaches record_purchase as p_provider_id', () => {
    const priced = setQty(EMPTY_CART, PECHUGA, 250_000);
    const draft = mustDraft(
      draftOf(priced, CATALOG, FACTORS, 'buy', true, WORKSPACE, LOCATION, {}, {
        [PECHUGA]: '0.018000',
      }, PROVIDER),
    );
    const queued = queueWrite(draft, {
      id: '77777777-7777-4777-8777-777777777777',
      now: '2026-09-24T09:00:00.000Z',
    });
    if (!queued.ok) throw new Error(`the queue refused the draft: ${queued.why}`);
    expect(sendArgs(queued.write).p_provider_id).toBe(PROVIDER);
  });

  it('sends the NET key on a purchase and the GROSS key on a sale', () => {
    const one = setQty(EMPTY_CART, PECHUGA, 250_000);
    const sell = lineSent(one[0], entry(PECHUGA), FACTORS, 'sell', true)!;
    const buy = lineSent(one[0], entry(PECHUGA), FACTORS, 'buy', true, 0, {
      [PECHUGA]: '0.150000',
    })!;
    expect(Object.keys(sell)).toContain('unit_price_gross_per_base');
    expect(Object.keys(buy)).toContain('unit_price_net_per_base');
    expect(Object.keys(sell)).not.toContain('unit_price_net_per_base');
  });

  it('sends every figure as a STRING, because a JSON number is a double', () => {
    // ⚠️ `R5`, and `0016` reads both with `->>` so text arrives exactly.
    const one = setQty(EMPTY_CART, PECHUGA, 288_000);
    const sent = lineSent(one[0], entry(PECHUGA), FACTORS, 'sell', true)!;
    for (const key of ['qty_display', 'unit_price_gross_per_base']) {
      expect(typeof sent[key]).toBe('string');
    }
    expect(sent.unit_price_gross_per_base).toBe(formatDecimal(180_000, SCALE.unitPrice));
  });
});

// ---------------------------------------------------------------------------
describe('the store — §2.11s one piece of local state', () => {
  // ⚠️ IT LOADS UNDER NODE WITH NO DEVICE STORE AT ALL, which is not a mock: it
  // is `@/lib/store`'s own rule that a missing store is an ordinary input, and
  // it is the same path a phone with a full disk takes.
  beforeEach(() => {
    useCartStore.setState({
      carts: { sell: EMPTY_CART, buy: EMPTY_CART, waste: EMPTY_CART },
      typed: { sell: {}, buy: {}, waste: {} },
      workspaceId: null,
      providerId: null,
      reason: null,
    });
  });

  it('keeps Vender and Comprar apart, because they are two documents', () => {
    // ⚠️⚠️ A delivery half-keyed in the back room must not be wiped by ringing
    // up a customer at the front. §2.11 says *cart only*, not *one cart*.
    useCartStore.getState().setQty('sell', PECHUGA, 250_000);
    useCartStore.getState().setQty('buy', HUEVO, 30_000);
    expect(useCartStore.getState().carts.sell.map((l) => l.variantId)).toEqual([PECHUGA]);
    expect(useCartStore.getState().carts.buy.map((l) => l.variantId)).toEqual([HUEVO]);
  });

  it('empties one side and leaves the other standing — Vaciar carrito', () => {
    useCartStore.getState().setQty('sell', PECHUGA, 250_000);
    useCartStore.getState().setQty('buy', HUEVO, 30_000);
    useCartStore.getState().clear('sell');
    expect(useCartStore.getState().carts.sell).toHaveLength(0);
    expect(useCartStore.getState().carts.buy).toHaveLength(1);
  });

  it('steps and removes through the same rules the module holds', () => {
    const by = stepOf('250g', FACTORS);
    useCartStore.getState().step('sell', PECHUGA, by, 1);
    useCartStore.getState().step('sell', PECHUGA, by, 1);
    expect(useCartStore.getState().carts.sell[0].base).toBe(500_000);
    useCartStore.getState().remove('sell', PECHUGA);
    expect(useCartStore.getState().carts.sell).toHaveLength(0);
  });

  it('adopts the first shop it is told about without dropping a basket', () => {
    // ⚠️ The restore happens before the workspace is known, so the FIRST
    // `openShop` must not throw away what came back off the disk.
    useCartStore.getState().setQty('sell', PECHUGA, 250_000);
    useCartStore.getState().openShop(WORKSPACE);
    expect(useCartStore.getState().carts.sell).toHaveLength(1);
    expect(useCartStore.getState().workspaceId).toBe(WORKSPACE);
  });

  it('drops both baskets when the shop actually changes', () => {
    // ⚠️⚠️ It fails safe without this — `draftOf` refuses a variant that is not
    // in the catalog it was priced against — but *fails safe* and *is not
    // baffling* are different promises, and another shop's products appearing
    // after a switch is the second one broken.
    useCartStore.getState().openShop(WORKSPACE);
    useCartStore.getState().setQty('sell', PECHUGA, 250_000);
    useCartStore.getState().setQty('buy', HUEVO, 30_000);
    useCartStore.getState().openShop('99999999-9999-4999-8999-999999999999');
    expect(useCartStore.getState().carts.sell).toHaveLength(0);
    expect(useCartStore.getState().carts.buy).toHaveLength(0);
  });

  it('leaves the baskets alone when told the same shop twice', () => {
    useCartStore.getState().openShop(WORKSPACE);
    useCartStore.getState().setQty('sell', PECHUGA, 250_000);
    useCartStore.getState().openShop(WORKSPACE);
    expect(useCartStore.getState().carts.sell).toHaveLength(1);
  });

  // ==========================================================================
  // THE PROVIDER AND THE PRICES SOMEBODY TYPED — plan task `5g-i`.
  // ==========================================================================

  it('keeps a typed price with the basket, because a delivery note is not', () => {
    // ⚠️ §2.11 persists the cart because a phone rings mid-sale. The figures on
    // a delivery note are worse to lose than a basket: re-keying them means
    // finding the note again.
    useCartStore.getState().setQty('buy', HUEVO, 30_000);
    useCartStore.getState().setPrice('buy', HUEVO, '0.018000');
    expect(useCartStore.getState().typed.buy).toEqual({ [HUEVO]: '0.018000' });
  });

  it('forgets a typed price when the provider changes, and keeps the line', () => {
    // ⚠️⚠️ C3.11 — *"changing the provider re-prices every row already on
    // screen."* A figure entered against one supplier is not a figure about the
    // next, and keeping it is §2.8's borrowed prefill arriving through the store.
    useCartStore.getState().openProvider(PROVIDER);
    useCartStore.getState().setQty('buy', HUEVO, 30_000);
    useCartStore.getState().setPrice('buy', HUEVO, '0.018000');
    useCartStore.getState().openProvider('99999999-9999-4999-8999-999999999999');
    expect(useCartStore.getState().typed.buy).toEqual({});
    expect(useCartStore.getState().carts.buy).toHaveLength(1);
  });

  it('leaves a typed price alone when told the same provider twice', () => {
    // ⚠️ The screen calls this from an effect: re-running it on every render
    // would wipe a price the moment after it was typed.
    useCartStore.getState().openProvider(PROVIDER);
    useCartStore.getState().setPrice('buy', HUEVO, '0.018000');
    useCartStore.getState().openProvider(PROVIDER);
    expect(useCartStore.getState().typed.buy).toEqual({ [HUEVO]: '0.018000' });
  });

  it('forgets the price of a line that was removed', () => {
    // ⚠️ Otherwise the same product re-added later arrives carrying a figure
    // nobody typed for it.
    useCartStore.getState().setQty('buy', HUEVO, 30_000);
    useCartStore.getState().setPrice('buy', HUEVO, '0.018000');
    useCartStore.getState().remove('buy', HUEVO);
    expect(useCartStore.getState().typed.buy).toEqual({});
  });

  it('empties the typed prices with the basket it priced', () => {
    useCartStore.getState().setQty('buy', HUEVO, 30_000);
    useCartStore.getState().setPrice('buy', HUEVO, '0.018000');
    useCartStore.getState().setQty('sell', PECHUGA, 250_000);
    useCartStore.getState().setPrice('sell', PECHUGA, '0.004000');
    useCartStore.getState().clear('buy');
    expect(useCartStore.getState().typed.buy).toEqual({});
    expect(useCartStore.getState().typed.sell).toEqual({ [PECHUGA]: '0.004000' });
  });

  it('treats an emptied price box as forgetting rather than as a zero', () => {
    useCartStore.getState().setPrice('buy', HUEVO, '0.018000');
    useCartStore.getState().setPrice('buy', HUEVO, null);
    expect(useCartStore.getState().typed.buy).toEqual({});
    useCartStore.getState().setPrice('buy', HUEVO, '0.000000');
    expect(useCartStore.getState().typed.buy).toEqual({ [HUEVO]: '0.000000' });
  });

  it('drops the provider with the shop, because a supplier belongs to one', () => {
    // ⚠️ `record_purchase` refuses another workspace's provider by composite
    // foreign key (`0018:205`), so carrying it across is a delivery that cannot
    // land and a header naming somebody this shop has never heard of.
    useCartStore.getState().openShop(WORKSPACE);
    useCartStore.getState().openProvider(PROVIDER);
    useCartStore.getState().openShop('99999999-9999-4999-8999-999999999999');
    expect(useCartStore.getState().providerId).toBeNull();
  });

  it('persists under a new key, because the shape changed', () => {
    // ⚠️⚠️ A `v1` blob restored into the new shape leaves `typed` undefined and
    // every reducer reading `s.typed[scope]` throws on the first tap. The
    // module's own rule: a shape change STRANDS the old basket.
    //
    // ⚠️⚠️ `v3` SINCE `6a-i`, AND THIS ASSERTION IS WHAT CAUGHT THE BUMP BEING
    // OWED — it was the only red in 1,358 when `Carts` grew a third key. The new
    // symptom is worse than `v1`'s: a `v2` blob leaves `carts.waste` UNDEFINED,
    // and `setQty('waste', …)` iterates it on the first `+` on Desperdicio. **On
    // every phone that had the previous build**, which is every phone in the
    // pilot.
    expect(CART_KEY).toBe('tienda.cart.v3');
  });
});

// ---------------------------------------------------------------------------
// DESPERDICIO — the third document, and the two things about it that are not a
// sale. Plan task `6a-i`.
//
// ⚠️⚠️ EVERYTHING HERE IS A CLAIM ABOUT WHAT REACHES POSTGRES, which is the half
// of `6a` a machine can hold. What the screen LOOKS like is `R9`'s and §2.11's.
// ---------------------------------------------------------------------------

/** A product the shop stocks and has never priced — C8.2's short catalog. */
const SERVILLETAS = '66666666-6666-4666-8666-666666666666';
const WASTE_ROWS: readonly VariantRow[] = [
  ...ROWS,
  variant(SERVILLETAS, 'Servilletas', 'pza', 'pza', null),
];
const WASTE_CATALOG = catalogFrom(WASTE_ROWS, FACTORS, null);
const wasteEntry = (id: string) => WASTE_CATALOG.find((e) => e.id === id)!;

describe('a write-off is a third scope and not a third arithmetic', () => {
  it('names three scopes, where `@tienda/money` names two kinds', () => {
    expect([...SCOPES]).toEqual(['sell', 'buy', 'waste']);
  });

  it('prices waste on the SALE shape, which is the owners ruling of 2026-08-26', () => {
    // ⚠️ BINDING ON `0019` BY NAME: *"`record_waste` follows the sale shape."*
    // The figure is what the shop failed to EARN — a shelf price — and a shelf
    // price is agreed gross.
    expect(MONEY_KIND.waste).toBe('sell');
    expect(MONEY_KIND.sell).toBe('sell');
    expect(MONEY_KIND.buy).toBe('buy');
  });

  it('sends the GROSS price key, because that is what the sale shape means', () => {
    expect(PRICE_KEY[MONEY_KIND.waste]).toBe('unit_price_gross_per_base');
  });

  it('queues under `waste`, the kind `@/api/outbox` has held since `5c-i`', () => {
    expect(WRITE_KIND.waste).toBe('waste');
    expect(isWriteKind(WRITE_KIND.waste)).toBe(true);
  });

  it('reaches `record_waste` and not `record_sale`, through the map `5c-ii-a` wrote', () => {
    // ⚠️⚠️ THE ONE ASSERTION THAT WOULD HAVE CAUGHT THE WHOLE TASK BEING WIRED TO
    // THE WRONG FUNCTION. `MONEY_KIND.waste` is `'sell'`, so every peso in this
    // module takes the sale's path — and a `WRITE_KIND` that followed it there
    // would send a write-off to `record_sale`, which would SUCCEED: the payload
    // is the same shape and `record_sale` ignores an extra key. **Stock would
    // leave the shelf as a sale, revenue would rise, and Números would report a
    // loss as a good day.**
    expect(RECORD_RPC[WRITE_KIND.waste]).toBe('record_waste');
    expect(RECORD_RPC[WRITE_KIND.waste]).not.toBe(RECORD_RPC[WRITE_KIND.sell]);
  });
});

describe('the cause rides on every line, and the screen asks once', () => {
  const cart: Cart = setQty(setQty(EMPTY_CART, PECHUGA, 750_000), HUEVO, 3_000);

  it('writes one answer onto each line, because `0019` has no document argument', () => {
    // ⚠️ `0019` READS `(e.l->>'reason')::public.waste_reason` PER LINE. The screen
    // asks once (§2.8, *reason-first*); `draftOf` is what fans that answer out.
    const draft = mustDraft(
      draftOf(
        cart, WASTE_CATALOG, FACTORS, 'waste', true, WORKSPACE, LOCATION,
        undefined, undefined, null, 'caducado',
      ),
    );
    const lines = draft.payload.lines as readonly Record<string, unknown>[];
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(line[WASTE_REASON_KEY]).toBe('caducado');
  });

  it('refuses a basket with no cause, which is `no-provider`s mirror', () => {
    // ⚠️ REFUSED HERE RATHER THAN SENT AND REFUSED THERE. `0019` answers `22023`
    // for a line with no reason, which arrives at a shopkeeper as *algo salió
    // mal* over a question she could have answered in one tap.
    const d = draftOf(
      cart, WASTE_CATALOG, FACTORS, 'waste', true, WORKSPACE, LOCATION,
      undefined, undefined, null, null,
    );
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.why).toBe('no-reason');
  });

  it('accepts all five causes, so no legal value is refused by the client', () => {
    for (const reason of WASTE_REASONS) {
      const draft = mustDraft(
        draftOf(
          cart, WASTE_CATALOG, FACTORS, 'waste', true, WORKSPACE, LOCATION,
          undefined, undefined, null, reason,
        ),
      );
      const lines = draft.payload.lines as readonly Record<string, unknown>[];
      expect(lines[0][WASTE_REASON_KEY]).toBe(reason);
    }
  });

  it('puts NO cause on a sale or on a delivery, even when one is handed in', () => {
    // ⚠️⚠️ THE FAILURE THIS PINS IS A 400 ON THE HIGHEST-TRAFFIC SCREEN IN THE
    // APP. `@/api/flush` builds its arguments as `p_` plus the payload's own
    // keys, and a `reason` leaking onto a sale line would reach `record_sale`,
    // which has no such key — so it is asserted absent from BOTH other scopes
    // rather than merely present on this one.
    for (const scope of ['sell', 'buy'] as const) {
      const draft = mustDraft(
        draftOf(
          cart, WASTE_CATALOG, FACTORS, scope, true, WORKSPACE, LOCATION,
          undefined, scope === 'buy' ? { [PECHUGA]: '0.100000', [HUEVO]: '2.000000' } : undefined,
          scope === 'buy' ? PROVIDER : null,
          'caducado',
        ),
      );
      const lines = draft.payload.lines as readonly Record<string, unknown>[];
      for (const line of lines) expect(WASTE_REASON_KEY in line).toBe(false);
    }
  });

  it('carries no counterparty, because `record_waste` takes no provider', () => {
    const draft = mustDraft(
      draftOf(
        cart, WASTE_CATALOG, FACTORS, 'waste', true, WORKSPACE, LOCATION,
        undefined, undefined, PROVIDER, 'dañado',
      ),
    );
    // ⚠️ A `provider_id` HERE WOULD REACH THE RPC AS `p_provider_id`, which
    // `record_waste` does not take — a 404/`PGRST202` on every write-off. The
    // provider is IGNORED rather than refused, because the sale side ignores one
    // too and one rule for both is what `draftOf`'s fork already says.
    expect('provider_id' in draft.payload).toBe(false);
    expect(draft.payload.location_id).toBe(LOCATION);
  });

  it('sends the same arguments the queue sends a sale, plus nothing', () => {
    // ⚠️ THE WHOLE POINT OF THE THIRD SCOPE BEING A SCOPE: a write-off drains
    // through the same `sendArgs`, the same idempotency and the same
    // classification as a sale. `p_provider_id` is absent and `p_lines` is there.
    const draft = mustDraft(
      draftOf(
        cart, WASTE_CATALOG, FACTORS, 'waste', true, WORKSPACE, LOCATION,
        undefined, undefined, null, 'caducado',
      ),
    );
    const queued = queueWrite(draft, { id: '77777777-7777-4777-8777-777777777777', now: '2026-09-27T12:00:00.000Z' });
    expect(queued.ok).toBe(true);
    if (!queued.ok) return;
    const args = sendArgs(queued.write);
    expect(Object.keys(args).sort()).toEqual(
      ['p_id', 'p_lines', 'p_location_id', 'p_occurred_at', 'p_recorded_offline'].sort(),
    );
  });
});

describe('an unpriced product is still a loss', () => {
  const cart: Cart = setQty(EMPTY_CART, SERVILLETAS, 4_000);

  it('has nothing to quote, which the catalog says with a dash (C3.12)', () => {
    expect(wasteEntry(SERVILLETAS).centavos).toBeNull();
    expect(quoteFor(wasteEntry(SERVILLETAS), 'sell', NO_QUOTES)).toBeNull();
  });

  it('is sent at ZERO rather than refused, and that is the opposite of a sale', () => {
    // ⚠️⚠️ MEASURED BEFORE IT WAS DECIDED: `unit_price_gross_per_base` is REQUIRED
    // by `0019` — omitting it is an HTTP 400 `22023` — so silence is not one of
    // the options. And a loss not recorded destroys the only record of it, which
    // is `record_waste`'s own argument for recording unconditionally.
    const line = lineSent(
      cart[0], wasteEntry(SERVILLETAS), FACTORS, 'waste', true, null, NO_QUOTES, 'caducado',
    );
    expect(line).not.toBeNull();
    expect(line![PRICE_KEY.sell]).toBe(formatDecimal(UNPRICED_WASTE, SCALE.unitPrice));
    expect(line![WASTE_REASON_KEY]).toBe('caducado');
    // ⚠️⚠️ THE QUANTITY IS EXACT, AND IT IS THE PRICE-UNIT SPELLING — `4 pza`,
    // not `4000` of anything. That is the number área 9 ruled this screen
    // reports, and nothing about the missing price touches it. ⚠️ The assertion
    // is written against `qtySent`'s own answer for the same line, so it reads
    // the RULE rather than a digit somebody typed here.
    expect(line!.qty_display).toBe('4');
    expect(line!.qty_display_unit).toBe('pza');
    expect(serverBase('4', 'pza')).toBe(4_000);
  });

  it('refuses the same line on a SALE, which is the fence on the zero', () => {
    // ⚠️⚠️ THE ZERO IS SCOPED TO WASTE AND THIS IS WHAT SAYS SO. A sale at a
    // price nobody set is money a customer did not agree to; `5h` owns C3.14 and
    // whatever it decides, it must not inherit this.
    expect(
      lineSent(cart[0], wasteEntry(SERVILLETAS), FACTORS, 'sell', true, null, NO_QUOTES, null),
    ).toBeNull();
    expect(
      lineSent(cart[0], wasteEntry(SERVILLETAS), FACTORS, 'buy', true, null, NO_QUOTES, null),
    ).toBeNull();
  });

  it('commits a whole basket where one line has no price', () => {
    const mixed: Cart = setQty(setQty(EMPTY_CART, PECHUGA, 250_000), SERVILLETAS, 4_000);
    const draft = mustDraft(
      draftOf(
        mixed, WASTE_CATALOG, FACTORS, 'waste', true, WORKSPACE, LOCATION,
        undefined, undefined, null, 'dañado',
      ),
    );
    const lines = draft.payload.lines as readonly Record<string, unknown>[];
    expect(lines).toHaveLength(2);
    expect(lines[1][PRICE_KEY.sell]).toBe(formatDecimal(UNPRICED_WASTE, SCALE.unitPrice));
  });

  it('still tells the SCREEN the price is unknown, and does not call it zero', () => {
    // ⚠️⚠️ THE ASYMMETRY THAT IS THE WHOLE DECISION: what is SENT is a zero and
    // what is SHOWN is *unknown*. `reviewOf` answers `centavos: null` and
    // `complete: false`, so C3.12's dash survives and nothing on any surface can
    // tell a shopkeeper the thing she threw away was worth nothing — which área 9
    // called the one outcome worse than a number that is missing.
    const review = reviewOf(cart, WASTE_CATALOG, 'waste', true);
    expect(review.rows[0].centavos).toBeNull();
    expect(review.basket.complete).toBe(false);
    expect(review.basket.centavos).toBe(0);
    expect(review.basket.lines).toBe(1);
  });
});

describe('the waste basket is its own, and its cause lives beside the provider', () => {
  beforeEach(() => {
    useCartStore.setState({
      carts: { sell: EMPTY_CART, buy: EMPTY_CART, waste: EMPTY_CART },
      typed: { sell: {}, buy: {}, waste: {} },
      workspaceId: null,
      providerId: null,
      reason: null,
    });
  });

  it('keeps three baskets apart, because they are three documents', () => {
    useCartStore.getState().setQty('waste', PECHUGA, 1_000);
    useCartStore.getState().setQty('sell', PECHUGA, 2_000);
    useCartStore.getState().setQty('buy', PECHUGA, 3_000);
    expect(qtyOf(useCartStore.getState().carts.waste, PECHUGA)).toBe(1_000);
    expect(qtyOf(useCartStore.getState().carts.sell, PECHUGA)).toBe(2_000);
    expect(qtyOf(useCartStore.getState().carts.buy, PECHUGA)).toBe(3_000);
  });

  it('opens with no cause chosen, because `0019` refuses a default', () => {
    // ⚠️ *"an enum with a default would quietly file every unlabelled loss under
    // one cause."* This is that sentence as a fact about the store.
    expect(useCartStore.getState().reason).toBeNull();
  });

  it('changing the cause keeps the basket, which is NOT what `openProvider` does', () => {
    // ⚠️⚠️ THE ONE PLACE COPYING COMPRAR WOULD HAVE BEEN WRONG. A supplier price
    // is a fact about a relationship, so changing the provider clears the typed
    // costs (C3.11). **A cause is a fact about the LOSS and not about the stock**
    // — the same three kilos are the same three kilos whichever label they get —
    // so wiping the basket would punish her for correcting it.
    useCartStore.getState().openReason('caducado');
    useCartStore.getState().setQty('waste', PECHUGA, 1_000);
    useCartStore.getState().openReason('dañado');
    expect(useCartStore.getState().reason).toBe('dañado');
    expect(qtyOf(useCartStore.getState().carts.waste, PECHUGA)).toBe(1_000);
  });

  it('`Vaciar carrito` empties the basket and LEAVES the cause standing', () => {
    // ⚠️ EMPTYING IS *I KEYED THE WRONG PRODUCTS*, not *I picked the wrong
    // cause*. Putting the opening question back in front of somebody who has just
    // answered it is the one thing `5g-ii`'s picker was measured not to do.
    useCartStore.getState().openReason('caducado');
    useCartStore.getState().setQty('waste', PECHUGA, 1_000);
    useCartStore.getState().clear('waste');
    expect(useCartStore.getState().carts.waste).toHaveLength(0);
    expect(useCartStore.getState().reason).toBe('caducado');
  });

  it('drops the cause with the shop, because the basket it labelled is gone', () => {
    useCartStore.getState().openShop(WORKSPACE);
    useCartStore.getState().openReason('caducado');
    useCartStore.getState().setQty('waste', PECHUGA, 1_000);
    useCartStore.getState().openShop('99999999-9999-4999-8999-999999999999');
    expect(useCartStore.getState().reason).toBeNull();
    expect(useCartStore.getState().carts.waste).toHaveLength(0);
  });

  it('does not touch the other two baskets when the waste one is emptied', () => {
    useCartStore.getState().setQty('sell', PECHUGA, 2_000);
    useCartStore.getState().setQty('waste', PECHUGA, 1_000);
    useCartStore.getState().clear('waste');
    expect(qtyOf(useCartStore.getState().carts.sell, PECHUGA)).toBe(2_000);
  });
});

// ---------------------------------------------------------------------------
// ⚠️⚠️ `load` — THE WHOLE BASKET IN ONE `set()`, AND `6a-ii-b` GAVE IT A FIFTH
// FIELD. `Corregir` voids a document and then hands the capture screen its lines
// back; on a write-off it has to hand back the CAUSE as well, because a waste
// basket carries one for the whole document.
//
// ⚠️ THE TWO ASSERTIONS THAT MATTER ARE THE ONES ABOUT THE SIDE NOT BEING
// LOADED. `providerId` and `reason` both live beside the baskets rather than in
// one, so a correction on the wrong side would blank a fact about a document
// somebody is halfway through keying on another screen.
describe('loading a corrected document back into a basket', () => {
  beforeEach(() => {
    useCartStore.setState({
      carts: { sell: EMPTY_CART, buy: EMPTY_CART, waste: EMPTY_CART },
      typed: { sell: {}, buy: {}, waste: {} },
      workspaceId: null,
      providerId: null,
      reason: null,
    });
  });

  it('puts the products and the cause back on the waste basket', () => {
    useCartStore.getState().load({
      scope: 'waste',
      lines: [{ variantId: PECHUGA, base: 1_000 }],
      quotes: {},
      providerId: null,
      reason: 'caducado',
    });
    expect(qtyOf(useCartStore.getState().carts.waste, PECHUGA)).toBe(1_000);
    expect(useCartStore.getState().reason).toBe('caducado');
  });

  it('replaces the basket rather than merging into it', () => {
    useCartStore.getState().setQty('waste', HUEVO, 5_000);
    useCartStore.getState().load({
      scope: 'waste',
      lines: [{ variantId: PECHUGA, base: 1_000 }],
      quotes: {},
      providerId: null,
      reason: 'dañado',
    });
    expect(useCartStore.getState().carts.waste.map((l) => l.variantId)).toEqual([PECHUGA]);
  });

  // ⚠️⚠️ THE CLAIM THIS BLOCK EXISTS FOR. A corrected DELIVERY carries no cause,
  // and writing its `null` over the store's would put Desperdicio's opening
  // question back in front of a shopkeeper halfway through a bin round — the
  // basket that survives on the phone precisely BECAUSE she walked away from it.
  it('leaves the waste cause standing when a delivery is loaded', () => {
    useCartStore.getState().openReason('caducado');
    useCartStore.getState().setQty('waste', PECHUGA, 1_000);
    useCartStore.getState().load({
      scope: 'buy',
      lines: [{ variantId: HUEVO, base: 30_000 }],
      quotes: { [HUEVO]: '0.018000' },
      providerId: PROVIDER,
      reason: null,
    });
    expect(useCartStore.getState().reason).toBe('caducado');
    expect(qtyOf(useCartStore.getState().carts.waste, PECHUGA)).toBe(1_000);
    expect(useCartStore.getState().providerId).toBe(PROVIDER);
  });

  // ⚠️ AND THE SAME FACT THE OTHER WAY ROUND, which is `5h-ii-b`'s rule and the
  // reason `6a-ii-b` could copy it: a corrected write-off must not empty the
  // supplier Comprar is pointed at.
  it('leaves the provider standing when a write-off is loaded', () => {
    useCartStore.getState().openProvider(PROVIDER);
    useCartStore.getState().load({
      scope: 'waste',
      lines: [{ variantId: PECHUGA, base: 1_000 }],
      quotes: {},
      providerId: null,
      reason: 'caducado',
    });
    expect(useCartStore.getState().providerId).toBe(PROVIDER);
  });

  // ⚠️⚠️ A WRITE-OFF WHOSE LINES DISAGREED COMES BACK WITH NO CAUSE, AND THE
  // STORE WRITES THAT `null` ON PURPOSE. One basket holds one cause, so there is
  // nothing faithful to prefill — she is asked again rather than having four
  // lines silently refiled under whichever cause happened to be first.
  it('clears the cause when the corrected write-off has none to give', () => {
    useCartStore.getState().openReason('caducado');
    useCartStore.getState().load({
      scope: 'waste',
      lines: [{ variantId: PECHUGA, base: 1_000 }],
      quotes: {},
      providerId: null,
      reason: null,
    });
    expect(useCartStore.getState().reason).toBeNull();
    expect(useCartStore.getState().carts.waste).toHaveLength(1);
  });
});
