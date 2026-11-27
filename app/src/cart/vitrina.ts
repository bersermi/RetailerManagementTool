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
 * ⚠️ A SEARCH FINDS A PRODUCT IN ANY AISLE (the page's *What she sees*, 1): typed
 * with an aisle chosen, it shows the matches in that aisle, and when that aisle
 * has none, the matches in every other — Productos' rule, so a product filed in
 * another aisle is never hidden behind a word she typed right.
 */
export function vitrinaDe(
  ordered: readonly CatalogEntry[],
  typed: string,
  aisle: string | null,
): readonly CatalogEntry[] {
  const found = search(ordered, typed);
  const inside = inAisle(found, aisle);
  return inside.length > 0 || typed.trim() === '' ? inside : found;
}
