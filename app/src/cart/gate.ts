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
// ⚠️ SELL ONLY. Comprar's missing figure is a COST off a delivery note (C3.13),
// and Desperdicio writes an unpriced product off at an explicit zero.
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
