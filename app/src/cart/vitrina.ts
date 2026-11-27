// ============================================================================
// LA VITRINA — WHAT A TILE DOES AND WHAT THE COUNTER SHOWS. Plan task `14.2`,
// Step 14, the owner's calls 2, 3, 4 and 8 of 2026-11-27. Everything about a
// tile that is not rendering: what a tap and a long press do, how many tiles
// across, and which products the grid holds for a search and an aisle.
//
// ⚠️⚠️ C3.3 HOLDS: THE TAP IS THE LINE. A tap on a product sold by the piece or
// the bunch adds one; a tap on a weighed one opens the pad (`14.1`'s báscula),
// because one kilo is never the amount; a long press opens the pad on any
// product, for 12 of something. Comprar's tap will always open it (`14.3`).
//
// ⚠️ THE OWNER'S RULING OF 2026-10-15 STILL DECIDES A PRODUCT WITH NO PRICE
// (`sellGate`): its tap and its long press open the price sheet for the owner
// and a manager — saving it puts the product in the basket — and the note for
// a cashier. A line already in the basket is left alone.
//
// ⚠️⚠️ `14.3`, CALL 13 — THE SEARCH IS THE WHOLE SHOP (the owner's ruling of
// 2026-11-27, after `14.2` reached his phone: *"when someone is typing, the
// filter automatically defaults to Todo"*). Searching and browsing an aisle never
// mix: the first letter typed moves the aisles to *Todo*, tapping an aisle empties
// the box, and emptying the box leaves *Todo*. `14.2`'s fall-back — the aisle's
// matches, or every match when it had none — went with it. On both counters.
//
// ⚠️ COMPRAR'S TAP ALWAYS OPENS THE PAD (call 4): a delivery always has a cost,
// so there is nothing a tap could add without asking. No rule is needed for it
// here — its tiles call the pad on a tap and on a long press alike.
// ============================================================================

import { search, type CatalogEntry } from '@/api/catalog';
import { inAisle } from '@/api/productPage';
import type { SellGate } from '@/cart/gate';
import type { DensityMode } from '@/theme/density';

/** What a touch on a tile does. */
export type Toque = 'sumar' | 'pesar' | 'precio' | 'nota';

/**
 * The shown units a product is WEIGHED or measured in, never counted — a tap
 * on them opens the pad. ⚠️ A shown unit, as `shownUnitOf` answers it: a
 * product priced per 250 g is shown in `g`, and is weighed too.
 */
export const PESADOS: ReadonlySet<string> = new Set(['kg', 'g', 'l', 'ml']);

/** What a tap does on a product shown in `shownUnit`, past its gate. */
export function toqueDe(shownUnit: string, gate: SellGate): Toque {
  if (gate === 'priceFirst') return 'precio';
  if (gate === 'refused') return 'nota';
  return PESADOS.has(shownUnit) ? 'pesar' : 'sumar';
}

/** What a long press does: the pad, on any product — past its gate. */
export function toqueLargoDe(gate: SellGate): Toque {
  if (gate === 'priceFirst') return 'precio';
  if (gate === 'refused') return 'nota';
  return 'pesar';
}

/**
 * Whether a tile in the basket draws `−` beside its quantity. ⚠️ Not on a
 * weighed one: `−` steps by a whole price unit, a kilo, which is never what a
 * weighed line is; its tap opens the pad, where *Quitar* is.
 */
export function conMenos(shownUnit: string): boolean {
  return !PESADOS.has(shownUnit);
}

/** Tiles across (call 2 and 11): three at *Normal*, two at *Letra grande*. */
export function columnasDe(mode: DensityMode): number {
  return mode === 'elder' ? 2 : 3;
}

/**
 * The products the grid holds, in the order `ordered` came — the day's order.
 * `aisle` is a family id, or `null` for *Todo*.
 *
 * ⚠️⚠️ A SEARCH IS THE WHOLE SHOP (call 13): typed, it is every match in every
 * aisle — `pasilloAlEscribir` has already put the aisles on *Todo* — and an
 * aisle filters only while the box is empty.
 */
export function vitrinaDe(
  ordered: readonly CatalogEntry[],
  typed: string,
  aisle: string | null,
): readonly CatalogEntry[] {
  if (typed.trim() !== '') return search(ordered, typed);
  return inAisle(ordered, aisle);
}

/**
 * The aisle once the box reads `typed` (call 13): *Todo* as soon as there is a
 * letter in it, and still *Todo* when it is emptied — the aisle she had is not
 * brought back. ⚠️ Spaces are not a letter: the box is still empty.
 */
export function pasilloAlEscribir(typed: string, aisle: string | null): string | null {
  return typed.trim() === '' ? aisle : null;
}
