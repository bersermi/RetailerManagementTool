// ============================================================================
// WHAT THE QUANTITY FIELD READS, AND WHICH UNIT IT SPEAKS IN. Plan task
// `5f-ii`.
//
// ⚠️ NO SCREEN AND NO COMPONENT, for `5f-i`'s reason one file over: `5h.5` owns
// `src/ui/`, and everything here has a right answer `app/test/cart-quantity.
// test.ts` can read. The control itself — the `−`, the `+` and the box a thumb
// lands on — is `(tabs)/vender.tsx`, where no check in this repository can
// follow it (`R9`, §2.11).
//
// ⚠️ THE CART HOLDS BASE UNITS AND THIS FILE CHANGES NOTHING ABOUT THAT.
// `@/cart/cart`'s header is the authority: a quantity is thousandths of a base
// unit, a step is `factor_to_base`, and `qtySent` decides the spelling the
// LEDGER is told. This module decides only the spelling a SHOPKEEPER reads
// while she is deciding, and it converts back the moment she has typed.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ C3.8 GIVES TWO EXAMPLES AND THEY NEED A RULE BETWEEN THEM
// ----------------------------------------------------------------------------
// *"Priced por cuarto, three taps of `+` read 250, 500, 750 with `gr` beside
// the field — grams, not cuartos. Priced por kilo, the same product is entered
// as 0.250 kg."*
//
// So the field does NOT always speak the price unit — `3 cuartos` is refused by
// name — and it does NOT always speak the base unit either, or a kilo of
// chicken would read `1000 gr`. **The price unit decides, and the two examples
// differ in what KIND of unit it is**: `kg` is a thing a shop weighs in, `250g`
// is a denomination a shop prices in.
//
// ⚠️⚠️ AND `0001` DOES NOT RECORD WHICH IS WHICH — MEASURED, NOT ASSUMED. The
// `unit` table carries `code`, `dimension`, `base_code`, `factor_to_base` and
// `display_order`, and nothing in it separates `kg` from `250g` except their
// factors. So this is a DECISION and it is written down as one, below, rather
// than derived from a column that does not mean it. See `MEASURED_IN`.
//
// ⚠️ THE PRECEDENT FOR A PER-CODE FACT LIVING IN THE APP IS `ES.units`, which
// already maps `250g` to *250 gr* keyed by code, with a fallback. This is the
// same shape and the same fallback discipline — an unlisted code reads in the
// BASE unit, which is the conservative side: a number that is larger and exact
// beats a number that is smaller and a guess.
// ============================================================================

import { SCALE, divRoundHalfUpAwayFromZero, formatDecimal, parseDecimal } from '@tienda/money';

import type { CatalogEntry, UnitFactors } from '@/api/catalog';
import { stepOf } from '@/cart/cart';

/**
 * The price units the quantity field speaks in DIRECTLY. Everything else reads
 * in the variant's base unit.
 *
 * ⚠️⚠️ IT IS A DECISION TAKEN ON THE OWNER'S BEHALF AND IT IS NAMED IN `5f-ii`'s
 * status-log entry. The line it draws is *a unit the shop MEASURES in* against
 * *a denomination the shop PRICES in*: a shopkeeper says **un kilo**, **medio
 * litro**, **tres piezas** — and never **tres cuartos** for 750 g, which is the
 * spelling C3.8 refuses by name.
 *
 * ⚠️ ALL FIVE ARE `0001`'s, and the five that are deliberately absent are
 * `500g`, `250g`, `100g`, `500ml` and `100ml` — every one of them a pack.
 * ⚠️ THE BASE UNITS ARE IN IT AND THAT IS NOT REDUNDANT: a variant priced per
 * gram would otherwise fall through to the fallback and reach the same answer
 * by accident rather than by this rule.
 *
 * ⚠️ A CODE THIS SET HAS NEVER HEARD OF READS IN THE BASE UNIT. A shop unit
 * added after this file was written is a pack until somebody says otherwise,
 * which fails as a bigger number rather than as a wrong one.
 */
export const MEASURED_IN: ReadonlySet<string> = new Set(['kg', 'g', 'l', 'ml', 'pza']);

/** Which unit this variant's quantity field reads in. See `MEASURED_IN`. */
export function shownUnitOf(entry: CatalogEntry): string {
  return MEASURED_IN.has(entry.priceUnit) ? entry.priceUnit : entry.baseUnit;
}

/**
 * How many base units — at `SCALE.quantity` — one of `unitCode` is, or `null`
 * when this phone has not read that unit.
 *
 * ⚠️ IT IS `stepOf` AND NOT A SECOND CONVERSION. One tap of `+` and one whole
 * unit in the field are the same physical amount, so they must be the same
 * number; two functions computing it is the *how many grams in a kilo* defect
 * `@/cart/cart` and `@/offline/deadLetters` both refuse by name.
 */
function baseUnitsPer(unitCode: string, factors: UnitFactors): number | null {
  return stepOf(unitCode, factors);
}

/**
 * ⚠️ 10^3 AGAIN, FOR THE OPPOSITE REASON `@/cart/cart` NEEDS IT. Both the
 * quantity and `baseUnitsPer`'s answer are scale-3 integers, so multiplying
 * them doubles the scale and dividing by one of them removes it.
 */
const QUANTITY_ONE = 10 ** SCALE.quantity;

/**
 * What the field reads: the quantity, in `unitCode`, as a person would write
 * it — or `null` when the unit is not on this phone.
 *
 * ⚠️⚠️ A WHOLE QUANTITY DROPS ITS DECIMALS AND A FRACTIONAL ONE KEEPS ALL
 * THREE, WHICH IS EXACTLY C3.8's TWO EXAMPLES. Three taps of a quarter-kilo
 * read **`750`** and not `750.000`; a quarter-kilo of a product priced per kilo
 * reads **`0.250`** and not `0.25`. ⚠️ Trimming ONE zero from the second would
 * have satisfied neither example, and keeping the first's would have put three
 * silent zeros on every count in the shop.
 */
export function qtyShown(base: number, unitCode: string, factors: UnitFactors): string | null {
  const per = baseUnitsPer(unitCode, factors);
  if (per === null || !Number.isFinite(base)) return null;
  let shown: string;
  try {
    shown = formatDecimal(divRoundHalfUpAwayFromZero(base * QUANTITY_ONE, per), SCALE.quantity);
  } catch {
    return null;
  }
  const dot = shown.indexOf('.');
  if (dot === -1) return shown;
  return /^0+$/.test(shown.slice(dot + 1)) ? shown.slice(0, dot) : shown;
}

/**
 * A figure a shopkeeper KEYED into the field, in `unitCode`, as base units at
 * `SCALE.quantity` — or `null` when it is not a quantity at all.
 *
 * ⚠️ IT IS `keyedBase`'s RULE WITH THE UNIT PUT BACK. Zero is refused because a
 * zero quantity is not a line (C3.3), a comma is read as a decimal point
 * because a Spanish keyboard offers one, and more decimals than the field's own
 * unit can hold is refused rather than rounded away — the same refusal the
 * price box makes, for the same reason: the number she reads back must be the
 * number she typed.
 *
 * ⚠️⚠️ THE PRECISION IS THE FIELD'S UNIT AND NOT THE COLUMN'S, AND THAT IS
 * STRICTER THAN THE LEDGER. Priced per kilo, `0.2501` is 250.1 g — a quantity
 * `numeric(14,3)` holds perfectly — and this refuses it. **That is the
 * conservative side of C3.9**: precision is the shop's, and a shop weighing to
 * a tenth of a gram is not the pilot. A field that accepted a fourth decimal in
 * kilos and silently dropped it would be the one thing C3.9 does forbid.
 */
export function baseFromShown(
  typed: string,
  unitCode: string,
  factors: UnitFactors,
): number | null {
  const per = baseUnitsPer(unitCode, factors);
  if (per === null) return null;
  const clean = typed.trim().replace(',', '.');
  if (clean === '') return null;
  try {
    const shown = parseDecimal(clean, SCALE.quantity);
    if (shown <= 0) return null;
    const base = divRoundHalfUpAwayFromZero(shown * per, QUANTITY_ONE);
    return base > 0 ? base : null;
  } catch {
    return null;
  }
}
