// ============================================================================
// THE CART STORE — ADR-035 §2.11's ONE PIECE OF LOCAL STATE. Plan task `5f-i`.
//
// ⚠️⚠️ THE ARCHITECTURE CHOSE THIS BEFORE THE ROW DID: *"Local state: Zustand,
// cart only, persisted to `expo-sqlite`. One rule: if it came from Postgres it
// lives in Query; if it is not committed yet it lives in the cart store.
// Nothing lives in both."* `5f`'s row listed a *basket sheet* and named no
// store at all, which is what the sizing of 2026-09-24 found. This is the first
// and — by that sentence — the ONLY Zustand store this app may grow.
//
// ⚠️ IT DECIDES NOTHING. Every rule about what a line is, what it costs and how
// it is sent lives in `@/cart/cart`, where `app/test/cart.test.ts` reads it.
// This file holds the state and the persistence, which is the `R3` split that
// `theme/densityMemory.ts` and `DensityProvider.tsx` already stand in.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHY IT IS PERSISTED, AND IT IS NOT A CONVENIENCE
// ----------------------------------------------------------------------------
// §2.11: *"survives the app being backgrounded mid-sale."* A phone rings in the
// middle of a sale; a basket that does not come back is a shopkeeper re-keying
// a customer's order in front of that customer. ⚠️ AND IT IS THE SAME STORE THE
// SESSION AND THE OUTBOX USE — `expo-sqlite`, through `@/lib/store` — because
// `5a-iii`'s sizing already refused a second storage engine: two things to
// reason about when a queued sale goes missing, two things to clear, and a
// junior arriving in step 6 with no way to know which is which.
//
// ⚠️ A MISSING, THROWING OR NONSENSE STORE IS AN ORDINARY INPUT. That is
// `@/lib/store`'s own rule and it is why this loads under node at all: a device
// with a full disk is a real pilot phone, and nothing kept here is worth a
// launch that hangs on the splash screen.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ TWO SCOPES, AND BOTH WERE DECIDED HERE RATHER THAN INHERITED
// ----------------------------------------------------------------------------
//   * ONE CART PER `Kind`. Vender and Comprar share the screen (`5f`) and do
//     NOT share a basket: a delivery half-keyed in the back room must not be
//     wiped by ringing up a customer at the front, and the two documents go to
//     different RPCs. §2.11 says *cart only*, not *one cart*.
//   * A RESTORED CART IS DROPPED WHEN THE SHOP HAS CHANGED. It fails safe
//     without this — `draftOf` refuses a variant that is not in the catalog it
//     was priced against — but *fails safe* and *is not baffling* are different
//     promises, and a basket of another shop's products appearing after a switch
//     is the second one broken.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ AND A THIRD SCOPE, ADDED BY `5g-i`: THE BUY SIDE'S PROVIDER AND THE PRICES
// SOMEBODY TYPED AGAINST THEM
// ----------------------------------------------------------------------------
// A sale is priced from the shelf; a DELIVERY is priced off a piece of paper in
// somebody's hand. C3.13 makes the purchase price something a person ENTERS,
// and `Quotes` is the map `@/cart/cart` built for exactly this and left empty.
//
// ⚠️ SO IT IS PERSISTED FOR THE SAME REASON THE BASKET IS, AND THE REASON IS
// SHARPER HERE. §2.11 persists the cart because a phone rings mid-sale — and a
// delivery note's figures are worse to lose than a basket, because re-keying
// them means finding the note again. A half-received delivery that comes back
// with its quantities and without its prices is the promise half-kept.
//
// ⚠️⚠️ CHANGING THE PROVIDER CLEARS THE TYPED PRICES AND KEEPS THE LINES, WHICH
// IS C3.11 AND NOT A CONVENIENCE: *"changing the provider re-prices every row
// already on screen."* A supplier price is a fact about a relationship, so a
// figure entered against one provider is not a figure about the next — and
// keeping it would be the borrowed prefill §2.8 spends a paragraph refusing,
// arriving through the store instead of through a fallback. **The QUANTITIES are
// untouched**: what arrived is what arrived, whoever it turns out to have come
// from.
//
// ⚠️ THE MAPS ARE PER `Kind` LIKE THE CARTS, even though only `buy` has a writer
// today. `quoteFor(entry, kind, quotes)` is already a per-kind question one
// module over, so mirroring the cart's own shape costs a key and avoids a
// special case in every reducer here. ⚠️ **`5f-iv` is the row that would have
// filled the sell side and it is OUT of the pilot**, so nothing writes it and
// nothing pretends otherwise.
// ============================================================================

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Kind } from '@tienda/money';

import { EMPTY_CART, NO_QUOTES, remove, setQty, step, type Cart, type Quotes } from '@/cart/cart';
import { deviceStore, readKey, removeKey, writeKey } from '@/lib/store';

/**
 * The key this basket lives under. One key, both carts, one write per change.
 *
 * ⚠️⚠️ BUMPED TO `v2` BY `5g-i`, WHICH IS THIS MODULE'S OWN RULE BEING OBEYED
 * RATHER THAN A VERSION NUMBER GOING UP. `Persisted` grew `typed` and
 * `providerId`; a `v1` blob restored into the new shape would leave `typed`
 * undefined and every reducer here reading `s.typed[kind]` would throw on the
 * first tap. **A shape change strands the old basket** — see `Persisted` below
 * — and the honest way to strand it is a key nothing reads again, not a
 * migration that half-rebuilds a half-rung sale.
 */
export const CART_KEY = 'tienda.cart.v2';

interface Carts {
  readonly sell: Cart;
  readonly buy: Cart;
}

const NO_CARTS: Carts = { sell: EMPTY_CART, buy: EMPTY_CART };

/** What somebody TYPED, per side of the counter. See the header. */
interface Typed {
  readonly sell: Quotes;
  readonly buy: Quotes;
}

const NOTHING_TYPED: Typed = { sell: NO_QUOTES, buy: NO_QUOTES };

export interface CartState {
  readonly carts: Carts;
  /** Per-base figures a person entered, keyed by variant. `@/cart/cart`'s map. */
  readonly typed: Typed;
  /** The shop these baskets belong to, or `null` before one is known. */
  readonly workspaceId: string | null;
  /** Who the buy basket is being bought FROM, or `null` before one is chosen. */
  readonly providerId: string | null;
  /** Point the store at a shop, dropping baskets that belonged to another. */
  readonly openShop: (workspaceId: string | null) => void;
  /**
   * `Comprando a:` — point the buy basket at a provider.
   *
   * ⚠️ IT CLEARS THE TYPED PRICES AND KEEPS THE LINES (C3.11). See the header.
   * ⚠️ AND IT IS A NO-OP WHEN THE PROVIDER HAS NOT CHANGED, which matters
   * because the screen calls it from an effect: re-running it on every render
   * would wipe a price the moment after it was typed.
   */
  readonly openProvider: (providerId: string | null) => void;
  readonly setQty: (kind: Kind, variantId: string, base: number) => void;
  readonly step: (kind: Kind, variantId: string, by: number | null, sign: 1 | -1) => void;
  readonly remove: (kind: Kind, variantId: string) => void;
  /**
   * The price a person entered for this line, per BASE unit — or `null` to
   * forget it, which is what an emptied box means rather than a zero.
   */
  readonly setPrice: (kind: Kind, variantId: string, perBase: string | null) => void;
  /** `Vaciar carrito` — the one removal that keeps its confirmation (`5f-iii`). */
  readonly clear: (kind: Kind) => void;
}

/**
 * The store's persisted shape, and it is versioned in the KEY rather than by
 * Zustand's `version`.
 *
 * ⚠️ A SHAPE CHANGE MUST STRAND THE OLD BASKET, NOT MIGRATE IT. A half-rung
 * sale is worth seconds and a wrong quantity is worth a customer's money, so a
 * new key is the honest upgrade: the old row is simply never read again.
 */
interface Persisted {
  readonly carts: Carts;
  readonly typed: Typed;
  readonly workspaceId: string | null;
  readonly providerId: string | null;
}

/**
 * `@/lib/store` as Zustand's `StateStorage`.
 *
 * ⚠️ SYNCHRONOUS, WHICH IS WHAT `expo-sqlite/localStorage` IS. Zustand accepts
 * a promise here and using one would make the first render of a restored basket
 * race the first tap on it.
 */
const storage = {
  getItem: (name: string): string | null => readKey(deviceStore(), name),
  setItem: (name: string, value: string): void => writeKey(deviceStore(), name, value),
  removeItem: (name: string): void => removeKey(deviceStore(), name),
};

/**
 * The map without this variant. ⚠️ A NEW OBJECT ONLY WHEN SOMETHING LEFT, for
 * `remove`'s reason one module over: Zustand compares what a selector returns,
 * and a fresh object every keystroke is a re-render on the screen C1.1 puts two
 * low-end Androids in front of.
 */
function withoutPrice(quotes: Quotes, variantId: string): Quotes {
  if (!(variantId in quotes)) return quotes;
  const next: Record<string, string> = {};
  for (const [id, perBase] of Object.entries(quotes)) {
    if (id !== variantId) next[id] = perBase;
  }
  return next;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      carts: NO_CARTS,
      typed: NOTHING_TYPED,
      workspaceId: null,
      providerId: null,
      openShop: (workspaceId) =>
        set((s) =>
          s.workspaceId === workspaceId
            ? s
            : s.workspaceId === null
              ? { workspaceId }
              : {
                  workspaceId,
                  carts: NO_CARTS,
                  typed: NOTHING_TYPED,
                  // ⚠️ The provider goes with the shop and not with the basket:
                  // another shop's supplier is not a row this one may name, and
                  // `record_purchase` refuses a provider from another workspace
                  // by composite foreign key (`0018:205`).
                  providerId: null,
                },
        ),
      openProvider: (providerId) =>
        set((s) =>
          s.providerId === providerId
            ? s
            : { providerId, typed: { ...s.typed, buy: NO_QUOTES } },
        ),
      setQty: (kind, variantId, base) =>
        set((s) => ({ carts: { ...s.carts, [kind]: setQty(s.carts[kind], variantId, base) } })),
      step: (kind, variantId, by, sign) =>
        set((s) => ({ carts: { ...s.carts, [kind]: step(s.carts[kind], variantId, by, sign) } })),
      remove: (kind, variantId) =>
        set((s) => ({
          carts: { ...s.carts, [kind]: remove(s.carts[kind], variantId) },
          // ⚠️ A REMOVED LINE FORGETS ITS PRICE. Leaving it would make the same
          // product re-added later arrive carrying a figure nobody typed for it,
          // which is C3.11's borrowed prefill produced by the basket instead of
          // by a provider.
          typed: { ...s.typed, [kind]: withoutPrice(s.typed[kind], variantId) },
        })),
      setPrice: (kind, variantId, perBase) =>
        set((s) => ({
          typed: {
            ...s.typed,
            [kind]:
              perBase === null || perBase === ''
                ? withoutPrice(s.typed[kind], variantId)
                : { ...s.typed[kind], [variantId]: perBase },
          },
        })),
      clear: (kind) =>
        set((s) => ({
          carts: { ...s.carts, [kind]: EMPTY_CART },
          typed: { ...s.typed, [kind]: NO_QUOTES },
        })),
    }),
    {
      name: CART_KEY,
      storage: createJSONStorage(() => storage),
      partialize: (s): Persisted => ({
        carts: s.carts,
        typed: s.typed,
        workspaceId: s.workspaceId,
        providerId: s.providerId,
      }),
    },
  ),
);

/**
 * The basket for one side of the counter, and the four things that change it.
 *
 * ⚠️ A SELECTOR PER FIELD AND NOT ONE OBJECT: Zustand compares what a selector
 * returns, and returning a fresh object every render is a re-render on every
 * keystroke anywhere in the app — on the screen C1.1 puts two low-end Androids
 * in front of.
 */
export function useCart(kind: Kind): Cart {
  return useCartStore((s) => s.carts[kind]);
}

/** What somebody typed on this side of the counter, as `draftOf` wants it. */
export function useTyped(kind: Kind): Quotes {
  return useCartStore((s) => s.typed[kind]);
}

/** Who the buy basket is being bought from. */
export function useProviderId(): string | null {
  return useCartStore((s) => s.providerId);
}
