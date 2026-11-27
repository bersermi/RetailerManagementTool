// ============================================================================
// WHO MAY PUT A PRODUCT INTO A SALE — `8g`, the owner's ruling of 2026-10-15.
//
// *"Should we even allow them to add the product to the Carrito if it doesn't
// have a price?"* Asked with the situation in front of him — a new shop imported
// its giro's catalog with NO prices then, so for its first weeks the unpriced
// product was the ordinary one at the counter — he took the recommendation:
// **no; a product gets its price the first time it is sold.** ⚠️ Since `0067`
// (2026-10-21) the catalog imports with Wera's suggested prices, so an unpriced
// product is one the shop made itself without one; and since `8i` (2026-11-01)
// the price sheet saves with or without signal (`@/api/shelfPrice`).
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
// zero. ⚠️ COMPRAR HAD ITS OWN FROM 2026-10-16 TO `14.3` (`buyGate`) — round 4 of
// `8g`, the owner: *"Same behaviour as Vender: to add something to the carrito,
// a price must be entered first."* Since `14.3` every tap on a Comprar tile opens
// the pad, which holds the cost and adds nothing without one
// (`@/cart/buying`'s `deliveryReady`), so the gate on the card's `+` left with it.
// ============================================================================

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
