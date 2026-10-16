// ============================================================================
// WHAT A COMPRAR CARD SAYS — round 4 of `8g`, the owner's card grid of
// 2026-10-16. Three answers with a right answer each, so they are here and not
// in the screen (`R3`), where `app/test/buying.test.ts` reads them.
//
// ⚠️⚠️ THE BOX HOLDS THIS PROVIDER'S LAST COST ON EVERY CARD, AND THAT IS HIS
// RULING, NOT A DEFAULT: *"The price gets prefilled by the previous price"* —
// labelled *Anterior · hace N días*, and once she changes it, *Antes $X*. It is
// the one exception he has made to *a proposal must not look decided*, on a
// screen where re-typing every line is the real cost.
//
// ⚠️⚠️ BUT ONLY OFF THE BASKET IS IT DRAWN FROM THE MEMORY. A card whose product
// IS in the delivery shows what the cart will SEND — the store's typed map — and
// nothing else, because `Comprar`'s seeding effect materialised the memory into
// the store when the line went in (`5g-ii`'s *"a wrong prefill answers one
// nobody asked"*). A box showing the memory over an emptied line would be a
// figure on screen the commit does not carry.
//
// ⚠️ THE MARGIN IS THE SHELF PRICE LESS THE COST, BOTH AS SHE SEES THEM, and that
// is a decision taken on his behalf: the cost is the invoice net (§2.5 rule 2)
// and the shelf price carries IVA where the shop's prices do, so on a product
// taxed at 16% the pill reads high by the tax. The rate is not on this phone —
// `5d-i`'s contract keeps `tax_rate` out of the catalog read — and most of a
// pollería or an abarrotes is taxed at 0%, where the two agree exactly.
// ============================================================================

import { priceCentavos, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import type { Memory, MemoryState } from '@/api/providers';

/**
 * The figure a card's cost box holds, net per base — or `null` for an empty box.
 */
export function cardCost(
  stored: string | undefined,
  remembered: Memory | null,
  inBasket: boolean,
): string | null {
  if (typeof stored === 'string') return stored;
  if (inBasket || remembered === null) return null;
  return remembered.perBase;
}

/**
 * - `last-bought` — the box holds this provider's last cost: *Anterior · hace N días*.
 * - `changed` — she typed a different one: *Antes $X*, and the box's edge is blue.
 * - `first-time` — never bought from this provider: *Primera vez con …*.
 * - `missing` — in the delivery with no cost: C3.13's amber, and the slide waits.
 * - `null` — nothing to say: the read is out, or this person cannot read it
 *   (`unreadable` is silent — the 2026-09-25 ruling `Costo` records).
 */
export type CardNote = 'last-bought' | 'changed' | 'first-time' | 'missing' | null;

export function cardNote(
  state: MemoryState,
  remembered: Memory | null,
  stored: string | undefined,
  inBasket: boolean,
  entry: CatalogEntry,
  factors: UnitFactors,
): CardNote {
  const typed = typeof stored === 'string';
  if (inBasket && !typed && state !== 'unknown') return 'missing';
  if (state === 'remembered' && remembered !== null) {
    if (!typed) return 'last-bought';
    // ⚠️ COMPARED IN CENTAVOS PER PRICE UNIT, the figure she reads — two
    // spellings of one per-base decimal must not read as a change.
    return perUnit(stored, entry, factors) === remembered.centavos ? 'last-bought' : 'changed';
  }
  if (state === 'new-pairing') return 'first-time';
  return null;
}

/**
 * The margin pill, per price unit: the shelf price less the cost, in centavos.
 *
 * - a number — *Margen $18.00 / kg*, solid red when it is below zero;
 * - `'no-sale-price'` — the product has no shelf price: *Sin precio de venta*;
 * - `null` — no cost to measure against, so no pill.
 *
 * ⚠️ A ZERO IS A MARGIN AND NOT AN ABSENCE: selling at cost is a fact she
 * should see.
 */
export function marginOf(
  entry: CatalogEntry,
  costPerBase: string | null,
  factors: UnitFactors,
): number | 'no-sale-price' | null {
  if (costPerBase === null) return null;
  const cost = perUnit(costPerBase, entry, factors);
  if (cost === null) return null;
  if (entry.centavos === null) return 'no-sale-price';
  return entry.centavos - cost;
}

function perUnit(perBase: string, entry: CatalogEntry, factors: UnitFactors): number | null {
  const factor = factors[entry.priceUnit];
  return factor === undefined ? null : priceCentavos(perBase, factor);
}
