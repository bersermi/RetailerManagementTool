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
// ============================================================================

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Kind } from '@tienda/money';

import { EMPTY_CART, remove, setQty, step, type Cart } from '@/cart/cart';
import { deviceStore, readKey, removeKey, writeKey } from '@/lib/store';

/** The key this basket lives under. One key, both carts, one write per change. */
export const CART_KEY = 'tienda.cart.v1';

interface Carts {
  readonly sell: Cart;
  readonly buy: Cart;
}

const NO_CARTS: Carts = { sell: EMPTY_CART, buy: EMPTY_CART };

export interface CartState {
  readonly carts: Carts;
  /** The shop these baskets belong to, or `null` before one is known. */
  readonly workspaceId: string | null;
  /** Point the store at a shop, dropping baskets that belonged to another. */
  readonly openShop: (workspaceId: string | null) => void;
  readonly setQty: (kind: Kind, variantId: string, base: number) => void;
  readonly step: (kind: Kind, variantId: string, by: number | null, sign: 1 | -1) => void;
  readonly remove: (kind: Kind, variantId: string) => void;
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
  readonly workspaceId: string | null;
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

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      carts: NO_CARTS,
      workspaceId: null,
      openShop: (workspaceId) =>
        set((s) =>
          s.workspaceId === workspaceId
            ? s
            : { workspaceId, carts: s.workspaceId === null ? s.carts : NO_CARTS },
        ),
      setQty: (kind, variantId, base) =>
        set((s) => ({ carts: { ...s.carts, [kind]: setQty(s.carts[kind], variantId, base) } })),
      step: (kind, variantId, by, sign) =>
        set((s) => ({ carts: { ...s.carts, [kind]: step(s.carts[kind], variantId, by, sign) } })),
      remove: (kind, variantId) =>
        set((s) => ({ carts: { ...s.carts, [kind]: remove(s.carts[kind], variantId) } })),
      clear: (kind) => set((s) => ({ carts: { ...s.carts, [kind]: EMPTY_CART } })),
    }),
    {
      name: CART_KEY,
      storage: createJSONStorage(() => storage),
      partialize: (s): Persisted => ({ carts: s.carts, workspaceId: s.workspaceId }),
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
