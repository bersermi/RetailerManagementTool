// ============================================================================
// WHO MAY PUT A PRODUCT INTO A SALE — `8g`, the owner's ruling of 2026-10-15.
//
// *"Should we even allow them to add the product to the Carrito if it doesn't
// have a price?"* Asked with the situation in front of him — a new shop imports
// its giro's catalog with NO prices, so for its first weeks the unpriced product
// is the ordinary one at the counter — he took the recommendation: **no; a
// product gets its price the first time it is sold.**
//
// ⚠️⚠️ WHY THE BASKET AND NOT THE COMMIT. Until this ruling an unpriced product
// went in and `draftOf` then refused the whole basket (`line-cannot-be-priced`),
// so Vender's slide simply vanished — *Falta un precio* — and a cashier found
// out at the moment of charging, with every other product in the sale held up
// behind the one. Refusing at the `+` puts the answer on the product, and the
// rest of the sale is never blocked by it.
//
// ⚠️ THE TWO ANSWERS FOLLOW ROLES THAT ALREADY EXIST: `price_list` is the owner's
// and a manager's (2026-09-23), and a price for one sale only is out of the pilot
// (`5f-iv`, 2026-09-24). So somebody who may price it is asked for the price
// before the product goes in; somebody who may not is told who can.
//
// ⚠️ DESPERDICIO HAS NO GATE: it writes an unpriced product off at an explicit
// zero. ⚠️ COMPRAR GOT ITS OWN ON 2026-10-16 (`buyGate`, below) — round 4 of
// `8g`, the owner: *"Same behaviour as Vender: to add something to the carrito,
// a price must be entered first."*
// ============================================================================

import type { MemoryState } from '@/api/providers';

/**
 * - `open` — it has a price; `+` counts.
 * - `priceFirst` — no price, and this person may set one: `+` opens the price
 *   sheet, and saving it puts the product in the basket.
 * - `refused` — no price, and this person may not set one: `+` explains.
 */
export type SellGate = 'open' | 'priceFirst' | 'refused';

/**
 * ⚠️ A LINE ALREADY IN THE BASKET IS LEFT ALONE (`inBasket`). A basket persisted
 * from before this rule, or one whose price was taken away under it, must still
 * be countable down and removable — refusing its `−` would strand it.
 */
export function sellGate(centavos: number | null, mayPrice: boolean, inBasket: boolean): SellGate {
  if (centavos !== null || inBasket) return 'open';
  return mayPrice ? 'priceFirst' : 'refused';
}

/**
 * - `open` — the cost is known (typed, or this provider's last one); `+` counts.
 * - `costFirst` — it is not: `+` opens *¿Cuánto te costó?*, and saving it puts
 *   the product in the delivery with that cost.
 *
 * ⚠️ THERE IS NO `refused`: a cost is a fact off the delivery note in her hand,
 * not a catalog figure a role owns, so anybody receiving may type it — the
 * owner's *"Comprar should be for any role for now"* (2026-09-25).
 */
export type BuyGate = 'open' | 'costFirst';

/**
 * ⚠️ A LINE ALREADY IN THE DELIVERY IS LEFT ALONE, for `sellGate`'s reason — and
 * its cost box is on the card and on the Carrito's line, so a figure emptied
 * after the `+` is fixed where she is (C3.13's banner still covers it).
 *
 * ⚠️⚠️ `unknown` IS `open`: the memory read is still in flight, and asking her for
 * a cost the next instant may fill would be the app asking a question it is
 * about to answer. The line goes in and `Comprar`'s seeding effect prefills it
 * when the read lands — the behaviour since `5g-ii`.
 *
 * ⚠️ `remembered` WITH NO FIGURE (`memoryFor` gave `null`: a unit this phone has
 * not read) is `costFirst`, because the card shows nothing to take.
 */
export function buyGate(
  state: MemoryState,
  hasRemembered: boolean,
  typed: boolean,
  inBasket: boolean,
): BuyGate {
  if (inBasket || typed || state === 'unknown') return 'open';
  if (state === 'remembered' && hasRemembered) return 'open';
  return 'costFirst';
}
