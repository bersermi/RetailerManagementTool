// ============================================================================
// WHAT THE QUANTITY BOX READS, AND WHICH UNIT IT SPEAKS IN. Plan task `5f-ii`.
//
// ⚠️ WHAT THIS SUITE IS FOR. `5f-ii` draws a screen, and §2.11 keeps rendering,
// navigation and layout out of scope — so almost nothing in that child is
// checkable and `R9` routes it to the owner's phone. **This is the exception**:
// the figure inside the box and the unit beside it are a value a shopkeeper
// reads and then acts on, which is precisely the narrow case §2.10 allows a
// client test for.
//
// ⚠️ IT REACHES NO COMPONENT (`R2`) and it is `.ts`. `@/cart/quantity` is a
// pure module for that reason; the `−`, the `+` and the `TextInput` are in
// `(tabs)/vender.tsx`, where no suite here may follow them.
//
// ⚠️⚠️ THE TWO DIRECTIONS ARE CHECKED AGAINST EACH OTHER AND NOT ONLY AGAINST
// THEMSELVES. A shopkeeper reads a figure out of `qtyShown` and types one back
// into `baseFromShown`, so every quantity below makes that round trip: a module
// that formatted in one unit and parsed in another would satisfy either half
// alone and lose a factor of a thousand between them.
// ============================================================================

import { describe, expect, it } from 'vitest';

import {
  catalogFrom,
  unitBasesFrom,
  unitFactorsFrom,
  type UnitRow,
  type VariantRow,
} from '@/api/catalog';
import { qtySent, stepOf } from '@/cart/cart';
import { MEASURED_IN, baseFromShown, qtyShown, shownUnitOf } from '@/cart/quantity';

// ---------------------------------------------------------------------------
// `0001`'s own ten units, spelled as PostgREST sends them.
// ---------------------------------------------------------------------------

const UNITS: readonly UnitRow[] = [
  { code: 'g', dimension: 'mass', base_code: 'g', factor_to_base: '1.000000', display_order: 40 },
  { code: 'kg', dimension: 'mass', base_code: 'g', factor_to_base: '1000.000000', display_order: 10 },
  { code: '500g', dimension: 'mass', base_code: 'g', factor_to_base: '500.000000', display_order: 20 },
  { code: '250g', dimension: 'mass', base_code: 'g', factor_to_base: '250.000000', display_order: 25 },
  { code: '100g', dimension: 'mass', base_code: 'g', factor_to_base: '100.000000', display_order: 30 },
  { code: 'ml', dimension: 'volume', base_code: 'ml', factor_to_base: '1.000000', display_order: 40 },
  { code: 'l', dimension: 'volume', base_code: 'ml', factor_to_base: '1000.000000', display_order: 10 },
  { code: '500ml', dimension: 'volume', base_code: 'ml', factor_to_base: '500.000000', display_order: 20 },
  { code: '100ml', dimension: 'volume', base_code: 'ml', factor_to_base: '100.000000', display_order: 30 },
  { code: 'pza', dimension: 'count', base_code: 'pza', factor_to_base: '1.000000', display_order: 10 },
];

const FACTORS = unitFactorsFrom(UNITS);
const BASES = unitBasesFrom(UNITS);
const FAMILY = '11111111-1111-4111-8111-111111111111';

const POR_CUARTO = '44444444-4444-4444-8444-444444444444';
const POR_KILO = '55555555-5555-4555-8555-555555555555';
const POR_PIEZA = '66666666-6666-4666-8666-666666666666';
const POR_GRAMO = '77777777-7777-4777-8777-777777777777';

function variant(id: string, priceUnit: string, baseUnit: string): VariantRow {
  return {
    id,
    name: 'Pechuga',
    family_id: FAMILY,
    price_unit_code: priceUnit,
    base_unit_code: baseUnit,
    is_active: true,
    product_family: { id: FAMILY, name: 'Pollo' },
    price_list: [{ price_per_base: '0.180000', location_id: null }],
  };
}

const CATALOG = catalogFrom(
  [
    variant(POR_CUARTO, '250g', 'g'),
    variant(POR_KILO, 'kg', 'g'),
    variant(POR_PIEZA, 'pza', 'pza'),
    variant(POR_GRAMO, 'g', 'g'),
  ],
  FACTORS,
  null,
  BASES,
);

const entry = (id: string) => CATALOG.find((e) => e.id === id)!;

/** One gram, one millilitre or one piece, at `numeric(14,3)`. */
const ONE_BASE = 1_000;

describe('which unit the quantity box speaks in', () => {
  // ⚠️⚠️ C3.8's TWO EXAMPLES, AND THE RULE BETWEEN THEM. *"Priced por cuarto,
  // three taps read 250, 500, 750 with `gr` beside the field — grams, not
  // cuartos. Priced por kilo, the same product is entered as 0.250 kg."* So the
  // price unit decides, and what separates the two is whether it is a unit the
  // shop MEASURES in or a denomination it PRICES in.
  it('reads in the base unit when the price unit is a pack', () => {
    expect(shownUnitOf(entry(POR_CUARTO))).toBe('g');
  });

  it('reads in the price unit when the shop measures in it', () => {
    expect(shownUnitOf(entry(POR_KILO))).toBe('kg');
    expect(shownUnitOf(entry(POR_PIEZA))).toBe('pza');
  });

  // ⚠️ THE BASE UNITS ARE IN THE SET ON PURPOSE — a variant priced per gram must
  // reach `g` by the rule rather than by falling through the fallback.
  it('reads in the price unit when that unit IS the base unit', () => {
    expect(MEASURED_IN.has('g')).toBe(true);
    expect(shownUnitOf(entry(POR_GRAMO))).toBe('g');
  });

  // ⚠️ THE FIVE PACKS `0001` SEEDS, NAMED — the list this decision drew.
  it('treats every seeded pack as a pack and every measure as a measure', () => {
    for (const code of ['500g', '250g', '100g', '500ml', '100ml']) {
      expect(MEASURED_IN.has(code)).toBe(false);
    }
    for (const code of ['kg', 'g', 'l', 'ml', 'pza']) {
      expect(MEASURED_IN.has(code)).toBe(true);
    }
  });

  // ⚠️ A UNIT ADDED AFTER THIS FILE WAS WRITTEN IS A PACK UNTIL SOMEBODY SAYS
  // OTHERWISE, which fails as a bigger number rather than as a wrong one.
  it('falls back to the base unit for a code it has never heard of', () => {
    const caja = catalogFrom([variant(POR_PIEZA, 'caja', 'pza')], FACTORS, null, BASES)[0];
    expect(shownUnitOf(caja)).toBe('pza');
  });
});

describe('the figure the box reads', () => {
  // ⚠️⚠️ C3.8's FIRST EXAMPLE, LITERALLY: three taps of `+` on a product priced
  // *por cuarto* read 250, 500, 750 — and NOT 250.000.
  it('reads three taps of a quarter-kilo as 250, 500, 750', () => {
    const shop = entry(POR_CUARTO);
    const by = stepOf(shop.priceUnit, FACTORS)!;
    expect(by).toBe(250 * ONE_BASE);
    const unit = shownUnitOf(shop);
    expect([1, 2, 3].map((taps) => qtyShown(by * taps, unit, FACTORS))).toEqual([
      '250',
      '500',
      '750',
    ]);
  });

  // ⚠️⚠️ C3.8's SECOND EXAMPLE, LITERALLY: the same 250 g, on a product priced
  // *por kilo*, reads `0.250` — all three decimals, not `0.25`.
  it('reads a quarter-kilo of a kilo-priced product as 0.250', () => {
    expect(qtyShown(250 * ONE_BASE, shownUnitOf(entry(POR_KILO)), FACTORS)).toBe('0.250');
  });

  it('drops the decimals only when every one of them is a zero', () => {
    const kg = shownUnitOf(entry(POR_KILO));
    expect(qtyShown(1_000 * ONE_BASE, kg, FACTORS)).toBe('1');
    expect(qtyShown(1_500 * ONE_BASE, kg, FACTORS)).toBe('1.500');
    expect(qtyShown(2_000 * ONE_BASE, kg, FACTORS)).toBe('2');
  });

  it('counts whole pieces and never a fraction of one', () => {
    expect(qtyShown(15 * ONE_BASE, shownUnitOf(entry(POR_PIEZA)), FACTORS)).toBe('15');
  });

  // ⚠️ A `null` IS A UNIT THIS PHONE HAS NOT READ, not a zero — `stepOf`'s own
  // rule, and it is what lets the screen say the catalog is still loading
  // rather than draw a box reading nothing.
  it('answers null when the unit table has not arrived', () => {
    expect(qtyShown(250 * ONE_BASE, 'kg', {})).toBeNull();
  });
});

describe('what a shopkeeper types back in', () => {
  // ⚠️⚠️ THE OWNER'S OWN CASE: *"he can also tap to enter 288gr if needed."*
  it('takes 288 in grams as 288 grams', () => {
    expect(baseFromShown('288', 'g', FACTORS)).toBe(288 * ONE_BASE);
  });

  // ⚠️⚠️ AND THE ONE HE ADDED ON 2026-09-24, WHICH IS WHY COUNTS GET A KEYPAD:
  // *"If a user wants to sell 15 manojos of cilantro, he shouldn't have to click
  // the stepper 14 times."*
  it('takes 15 pieces in one entry rather than fourteen taps', () => {
    expect(baseFromShown('15', 'pza', FACTORS)).toBe(15 * ONE_BASE);
  });

  it('reads a figure typed in kilos as grams', () => {
    expect(baseFromShown('0.250', 'kg', FACTORS)).toBe(250 * ONE_BASE);
    expect(baseFromShown('1.5', 'kg', FACTORS)).toBe(1_500 * ONE_BASE);
  });

  // ⚠️ A SPANISH KEYBOARD OFFERS A COMMA, and a till that refused it would be a
  // till that looks broken to the person using it.
  it('reads a comma as a decimal point', () => {
    expect(baseFromShown('0,250', 'kg', FACTORS)).toBe(250 * ONE_BASE);
  });

  // ⚠️ ZERO IS NOT A LINE (C3.3). The way to have no line is to empty the box,
  // and both spellings reach the same answer.
  it('refuses a zero, an empty box and a word', () => {
    for (const typed of ['0', '0.000', '', '   ', 'kilo', '1e3', '-2']) {
      expect(baseFromShown(typed, 'kg', FACTORS)).toBeNull();
    }
  });

  // ⚠️⚠️ STRICTER THAN THE COLUMN, ON PURPOSE — see the module header. A fourth
  // decimal in kilos is a tenth of a gram, which `numeric(14,3)` would hold and
  // no pilot shop can weigh. Refusing beats accepting and silently dropping it.
  it('refuses more decimals than the box’s own unit holds', () => {
    expect(baseFromShown('0.2501', 'kg', FACTORS)).toBeNull();
    expect(baseFromShown('288.5', 'g', FACTORS)).toBe(288_500);
  });

  it('answers null when the unit table has not arrived', () => {
    expect(baseFromShown('250', 'kg', {})).toBeNull();
  });
});

describe('the box and the ledger agree', () => {
  // ⚠️⚠️ THE ROUND TRIP, AND IT IS WHY THIS SUITE EXISTS. Whatever is shown must
  // parse back to the quantity it was shown for; a module formatting in one unit
  // and parsing in another would pass either half alone.
  it('round-trips every quantity through the unit the box speaks in', () => {
    const cases: readonly [string, number][] = [
      [POR_CUARTO, 250 * ONE_BASE],
      [POR_CUARTO, 750 * ONE_BASE],
      [POR_KILO, 250 * ONE_BASE],
      [POR_KILO, 1_000 * ONE_BASE],
      [POR_KILO, 2_500 * ONE_BASE],
      [POR_PIEZA, 15 * ONE_BASE],
      [POR_GRAMO, 288 * ONE_BASE],
    ];
    for (const [id, base] of cases) {
      const unit = shownUnitOf(entry(id));
      const shown = qtyShown(base, unit, FACTORS);
      expect(shown).not.toBeNull();
      expect(baseFromShown(shown!, unit, FACTORS)).toBe(base);
    }
  });

  // ⚠️⚠️ AND THE SPELLING THE SERVER IS TOLD IS STILL `5f-i`'s, NOT THIS ONE.
  // What the box READS and what `record_sale` is SENT are two different
  // questions on purpose: 750 g reads as `750 gr` on a quarter-kilo product and
  // is sent as three quarter-kilos, because that is what a receipt should say.
  it('does not change what qtySent tells the server', () => {
    const shop = entry(POR_CUARTO);
    expect(qtyShown(750 * ONE_BASE, shownUnitOf(shop), FACTORS)).toBe('750');
    expect(qtySent(750 * ONE_BASE, shop, FACTORS)).toEqual({
      qty_display: '3',
      qty_display_unit: '250g',
    });
  });
});

describe("the variant's own base_unit_code is not believed", () => {
  // ⚠️⚠️ THE OWNER'S BUG, 2026-09-24, FOUND ON HIS PHONE: a product priced per
  // 250 g stepped `1, 2, 3` instead of `250, 500, 750`.
  //
  // ⚠️ THE CAUSE WAS DATA, NOT ARITHMETIC. `unitColumns` in `@/api/catalogWrite`
  // writes ALL FOUR unit columns as the price unit, so every product made
  // through `Agregar` at `$45 / 250 g` carries `base_unit_code = '250g'`. The
  // box fell back to it, and a quantity of 250 g read as one 250-gram unit.
  // ⚠️ `0016:217` refuses any line where `u.base_code <> pv.base_unit_code`, so
  // those rows cannot be SOLD either — which is a defect in the row and is not
  // this module's to fix. What is this module's is to stop believing the column.
  const WRONG = catalogFrom(
    [variant(POR_CUARTO, '250g', '250g')],
    FACTORS,
    null,
    BASES,
  )[0];

  it("takes the unit table's base_code over the variant's own column", () => {
    expect(WRONG.baseUnit).toBe('g');
    expect(shownUnitOf(WRONG)).toBe('g');
  });

  it('steps 250, 500, 750 — the owner’s own example, and the bug he reported', () => {
    const by = stepOf(WRONG.priceUnit, FACTORS)!;
    const unit = shownUnitOf(WRONG);
    expect([1, 2, 3].map((taps) => qtyShown(by * taps, unit, FACTORS))).toEqual([
      '250',
      '500',
      '750',
    ]);
  });

  // ⚠️⚠️ AND THE HALF THAT WOULD HAVE REACHED THE LEDGER SILENTLY. `qtySent`'s
  // keypad branch sends the BASE unit, so before this fix a keyed 288 g on a
  // quarter-kilo product went out as `288` `250g` — seventy-two kilos, or a
  // refused line, depending on which check the server reached first.
  it('sends a keyed quantity in grams and not in quarter-kilos', () => {
    expect(qtySent(288 * ONE_BASE, WRONG, FACTORS)).toEqual({
      qty_display: '288.000',
      qty_display_unit: 'g',
    });
  });

  // ⚠️ THE FALLBACK IS THE OLD BEHAVIOUR AND NOT A GUESS: with no units read,
  // the variant's column is all there is.
  it('falls back to the variant column while the unit read is in flight', () => {
    const cold = catalogFrom([variant(POR_CUARTO, '250g', 'g')], {}, null, {})[0];
    expect(cold.baseUnit).toBe('g');
  });
});
