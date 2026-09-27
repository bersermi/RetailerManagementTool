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
//   * ⚠️ ONE CART PER `Scope` — **and the type was `Kind` until `6a-i`**, which
//     is the correction rather than a widening: `Kind` is `@tienda/money`'s and
//     names two directions of TAX, so it could never have held a third document.
//     `@/cart/cart`'s `Scope` block has the argument. Vender, Comprar and now
//     Desperdicio share the screen (`5f`) and do NOT share a basket: a delivery
//     half-keyed in the back room must not be wiped by ringing up a customer at
//     the front, and the three documents go to three different RPCs. §2.11 says
//     *cart only*, not *one cart*. ⚠️ **THREE scopes now, and this heading still
//     says two because the two it names are the two DECISIONS** — per-document
//     baskets and dropping on a shop switch — not the number of baskets.
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
// ⚠️ THE MAPS ARE PER `Scope` LIKE THE CARTS, even though only `buy` has a writer
// today. `quoteFor(entry, kind, quotes)` is already a per-kind question one
// module over, so mirroring the cart's own shape costs a key and avoids a
// special case in every reducer here. ⚠️ **`5f-iv` is the row that would have
// filled the sell side and it is OUT of the pilot**, so nothing writes it and
// nothing pretends otherwise — and `waste` has no writer either, because a
// write-off is valued at the shelf price the catalog already carries.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ AND A FOURTH THING IS KEPT HERE AS OF `6a-i`: THE **CAUSE** OF A WASTE
// ----------------------------------------------------------------------------
// It is not a basket and not a price — it is Desperdicio's opening question, and
// it sits beside `providerId` because it is the same shape of fact: one answer
// per document, chosen before the catalog is shown, persisted because §2.11
// persists a half-keyed document. ⚠️ **What it is NOT is `providerId`'s
// behaviour**: changing it clears nothing. See `openReason`.
// ============================================================================

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isWasteReason, type WasteReason } from '@/api/waste';
import {
  EMPTY_CART,
  NO_QUOTES,
  remove,
  setQty,
  step,
  type Cart,
  type Loaded,
  type Quotes,
  type Scope,
} from '@/cart/cart';
import { deviceStore, readKey, removeKey, writeKey } from '@/lib/store';

/**
 * The key this basket lives under. One key, both carts, one write per change.
 *
 * ⚠️⚠️ BUMPED TO `v2` BY `5g-i`, WHICH IS THIS MODULE'S OWN RULE BEING OBEYED
 * RATHER THAN A VERSION NUMBER GOING UP. `Persisted` grew `typed` and
 * `providerId`; a `v1` blob restored into the new shape would leave `typed`
 * undefined and every reducer here reading `s.typed[scope]` would throw on the
 * first tap. **A shape change strands the old basket** — see `Persisted` below
 * — and the honest way to strand it is a key nothing reads again, not a
 * migration that half-rebuilds a half-rung sale.
 *
 * ⚠️⚠️ BUMPED TO `v3` BY `6a-i`, FOR EXACTLY THE SAME REASON AND WITH A SHARPER
 * SYMPTOM. `Carts` and `Typed` grew a third key. A `v2` blob restored into this
 * shape leaves `carts.waste` UNDEFINED, and `setQty('waste', …)` reads
 * `s.carts.waste` and hands `undefined` to a function that iterates it — **a
 * crash on the first `+` on Desperdicio, on a phone that had the old build**,
 * which is every phone in the pilot. ⚠️ The cost is one stranded basket per
 * device on the upgrade, which is seconds of re-keying; the alternative is a
 * blank screen at a counter.
 */
export const CART_KEY = 'tienda.cart.v3';

interface Carts {
  readonly sell: Cart;
  readonly buy: Cart;
  /**
   * ⚠️ DESPERDICIO'S OWN BASKET (`6a-i`), AND IT IS SEPARATE FOR THE REASON THE
   * OTHER TWO ARE: *a delivery half-keyed in the back room must not be wiped by
   * ringing up a customer at the front.* The same is true a third time and it is
   * the worst of the three — **a bin round is the one task a shopkeeper walks
   * away from mid-way**, because she is holding the stock rather than standing
   * at a till.
   */
  readonly waste: Cart;
}

const NO_CARTS: Carts = { sell: EMPTY_CART, buy: EMPTY_CART, waste: EMPTY_CART };

/** What somebody TYPED, per side of the counter. See the header. */
interface Typed {
  readonly sell: Quotes;
  readonly buy: Quotes;
  /**
   * ⚠️⚠️ WASTE HAS A MAP AND NOTHING WRITES IT, WHICH IS DELIBERATE AND IS THE
   * SAME CALL `5g-i` MADE ABOUT THE SELL SIDE. A write-off is valued at the
   * SHELF price, which `quoteFor` takes off the catalog — there is no figure for
   * a person to enter, so there is nothing to persist. ⚠️ **The key exists
   * because every reducer below is written over `Scope`**, and a `Typed` missing
   * one member would make `setPrice` and `clear` need a branch that says *except
   * on this screen* — three shapes of one map is how the `undefined` above
   * happens again.
   */
  readonly waste: Quotes;
}

const NOTHING_TYPED: Typed = { sell: NO_QUOTES, buy: NO_QUOTES, waste: NO_QUOTES };

export interface CartState {
  readonly carts: Carts;
  /** Per-base figures a person entered, keyed by variant. `@/cart/cart`'s map. */
  readonly typed: Typed;
  /** The shop these baskets belong to, or `null` before one is known. */
  readonly workspaceId: string | null;
  /** Who the buy basket is being bought FROM, or `null` before one is chosen. */
  readonly providerId: string | null;
  /**
   * WHY the waste basket is being written off, or `null` before a cause is
   * chosen — which is how Desperdicio opens, every time.
   *
   * ⚠️⚠️ IT IS THE SCREEN'S FIRST QUESTION AND NOT A SETTING (§2.8,
   * *reason-first*). It sits here beside `providerId` because it is the same kind
   * of thing: a fact about the whole document, chosen before the catalog is
   * shown, and persisted with the basket because §2.11 persists a half-keyed
   * document and a bin round with its products and without its cause is the
   * promise half-kept.
   *
   * ⚠️ AND UNLIKE `providerId` IT HAS NO OPENING DEFAULT — `@/api/waste`'s
   * header has the argument, and it is `0019`'s: *"an enum with a default would
   * quietly file every unlabelled loss under one cause."*
   */
  readonly reason: WasteReason | null;
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
  /**
   * The cause this write-off is being recorded under.
   *
   * ⚠️⚠️ IT DOES **NOT** CLEAR THE BASKET, WHICH IS THE OPPOSITE OF
   * `openProvider` AND IS DECIDED RATHER THAN COPIED. Changing the provider
   * clears the typed prices because *"a supplier price is a fact about a
   * relationship"* (C3.11) — a figure entered against one provider is not a
   * figure about the next. **A cause is a fact about the LOSS and not about the
   * stock**: the same three kilos of tomato are the same three kilos whether she
   * files them as `caducado` or as `dañado`, and wiping the basket would punish
   * her for correcting the label. ⚠️ Nothing on a waste line is derived from the
   * reason, so there is nothing that could go stale.
   */
  readonly openReason: (reason: WasteReason | null) => void;
  readonly setQty: (scope: Scope, variantId: string, base: number) => void;
  readonly step: (scope: Scope, variantId: string, by: number | null, sign: 1 | -1) => void;
  readonly remove: (scope: Scope, variantId: string) => void;
  /**
   * The price a person entered for this line, per BASE unit — or `null` to
   * forget it, which is what an emptied box means rather than a zero.
   */
  readonly setPrice: (scope: Scope, variantId: string, perBase: string | null) => void;
  /**
   * `Vaciar carrito` — the one removal that keeps its confirmation (`5f-iii`).
   *
   * ⚠️⚠️ IT LEAVES THE WASTE BASKET'S **REASON** STANDING, and that is the same
   * call `openProvider` makes in reverse: emptying is *I keyed the wrong
   * products*, not *I picked the wrong cause*. Clearing the cause as well would
   * put the opening question back in front of a shopkeeper who has just answered
   * it, which is the one thing `5g-ii`'s picker was measured not to do.
   */
  readonly clear: (scope: Scope) => void;
  /**
   * ⚠️ `5h-ii-b` — THE WHOLE CART, THE WHOLE QUOTE MAP AND THE PROVIDER, SET IN
   * ONE `set()`. A correction is *this delivery, again*: `Corregir` voids the
   * document and then hands the capture screen its lines back.
   *
   * ⚠️⚠️ IT IS ONE ACTION AND NOT THREE CALLS, AND THE REASON IS `openProvider`.
   * That action CLEARS `typed.buy` whenever the provider changes (C3.11), so
   * `openProvider` then `setPrice` × n would work and `setPrice` × n then
   * `openProvider` would silently drop every price — an ordering trap with no
   * symptom but an empty price box. Setting all three at once has no order.
   *
   * ⚠️ IT REPLACES AND DOES NOT MERGE. Two documents in one cart is not a thing
   * a shopkeeper asked for, and the screen warns her when the cart it is about
   * to replace is not empty (`ES.documents.correctBusy`).
   *
   * ⚠️⚠️ ONE OBJECT SINCE `6a-ii-b`, AND IT IS NOT A TIDY-UP — a write-off
   * carries a CAUSE, so the positional form would have grown a fifth parameter
   * beside `providerId` with the same type and the opposite meaning. `Loaded`
   * (`@/cart/cart`) carries the argument.
   */
  readonly load: (loaded: Loaded) => void;
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
  readonly reason: WasteReason | null;
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
      reason: null,
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
                  // ⚠️ AND THE CAUSE GOES WITH THE SHOP TOO, which is a weaker
                  // argument than the provider's and lands the same way:
                  // `waste_reason` is workspace-GLOBAL (`0003`), so the value
                  // would still be legal in the new shop. **But the basket it
                  // labelled is gone**, and a cause standing over an empty
                  // basket is Desperdicio's opening question already answered
                  // for a write-off nobody has started.
                  reason: null,
                },
        ),
      openProvider: (providerId) =>
        set((s) =>
          s.providerId === providerId
            ? s
            : { providerId, typed: { ...s.typed, buy: NO_QUOTES } },
        ),
      // ⚠️ NO BASKET IS TOUCHED — see the action's declaration for why this is
      // deliberately NOT `openProvider`'s shape. ⚠️ And it is a no-op on an
      // unchanged value for `openProvider`'s other reason: the screen calls it
      // from a handler today and an effect is one refactor away.
      openReason: (reason) => set((s) => (s.reason === reason ? s : { reason })),
      setQty: (scope, variantId, base) =>
        set((s) => ({ carts: { ...s.carts, [scope]: setQty(s.carts[scope], variantId, base) } })),
      step: (scope, variantId, by, sign) =>
        set((s) => ({ carts: { ...s.carts, [scope]: step(s.carts[scope], variantId, by, sign) } })),
      remove: (scope, variantId) =>
        set((s) => ({
          carts: { ...s.carts, [scope]: remove(s.carts[scope], variantId) },
          // ⚠️ A REMOVED LINE FORGETS ITS PRICE. Leaving it would make the same
          // product re-added later arrive carrying a figure nobody typed for it,
          // which is C3.11's borrowed prefill produced by the basket instead of
          // by a provider.
          typed: { ...s.typed, [scope]: withoutPrice(s.typed[scope], variantId) },
        })),
      setPrice: (scope, variantId, perBase) =>
        set((s) => ({
          typed: {
            ...s.typed,
            [scope]:
              perBase === null || perBase === ''
                ? withoutPrice(s.typed[scope], variantId)
                : { ...s.typed[scope], [variantId]: perBase },
          },
        })),
      clear: (scope) =>
        set((s) => ({
          carts: { ...s.carts, [scope]: EMPTY_CART },
          typed: { ...s.typed, [scope]: NO_QUOTES },
        })),
      load: ({ scope, lines, quotes, providerId, reason }) =>
        set((s) => ({
          carts: { ...s.carts, [scope]: lines },
          typed: { ...s.typed, [scope]: quotes },
          // ⚠️ THE PROVIDER MOVES ONLY ON THE BUY SIDE. A sale has none, and
          // writing `null` over it on a sale correction would empty Comprar's
          // supplier the next time she opened it.
          ...(scope === 'buy' ? { providerId } : {}),
          // ⚠️⚠️ AND THE CAUSE ONLY ON THE WASTE SIDE, WHICH IS THE LINE ABOVE
          // ASKED AGAIN OF `6a-ii-b`. A corrected DELIVERY would otherwise write
          // `null` over the cause of a bin round she is halfway through — and
          // that basket survives on the phone precisely because she walked away
          // from it, so the two are far more likely to overlap than a provider
          // and a sale ever were.
          ...(scope === 'waste' ? { reason } : {}),
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
        reason: s.reason,
      }),
      // ⚠️⚠️ THE RESTORED CAUSE IS **VALIDATED** AND THE RESTORED BASKET IS NOT,
      // AND THAT ASYMMETRY IS THE POINT. A restored LINE fails safe on its own:
      // `draftOf` refuses `variant-not-in-catalog` for a product that has left
      // the shop. **A restored REASON has nothing checking it** — the string goes
      // straight into `p_lines` — so a value written by a build before somebody
      // renames one of the five reaches Postgres as `22P02` and becomes a dead
      // letter, which is §2.6's *replay is manual* over a write-off a shopkeeper
      // believes she recorded. `isWasteReason` is one `includes` and it turns that
      // into the opening question being asked again.
      merge: (restored, current) => {
        const from = (restored ?? {}) as Partial<Persisted>;
        return {
          ...current,
          ...from,
          reason: isWasteReason(from.reason) ? from.reason : null,
        };
      },
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
export function useCart(scope: Scope): Cart {
  return useCartStore((s) => s.carts[scope]);
}

/** What somebody typed on this side of the counter, as `draftOf` wants it. */
export function useTyped(scope: Scope): Quotes {
  return useCartStore((s) => s.typed[scope]);
}

/** Who the buy basket is being bought from. */
export function useProviderId(): string | null {
  return useCartStore((s) => s.providerId);
}

/** Why the waste basket is being written off, or `null` before she has said. */
export function useReason(): WasteReason | null {
  return useCartStore((s) => s.reason);
}
