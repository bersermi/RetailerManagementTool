// ============================================================================
// WHO THE SHOP BUYS FROM, AND WHAT THEY CHARGED LAST TIME. Plan task `5g-i`.
//
// ⚠️ NO SCREEN AND NO COMPONENT — the `5d-i`, `5e-i`, `5d-iv-a` and `5f-i`
// shape, for the reason all four gave: everything decided here has a right
// answer `app/test/api-providers.test.ts` can read. ⚠️ `5h.5` owns
// `src/ui/`'s CONVENTIONS and `5g-ii` minted the directory — see
// `src/ui/Buscador.tsx` for when the ADR says a primitive should appear.
// Comprar itself is `5g-ii`, and the ADR fences its whole judgement out of this
// repository (§2.11), so putting the two in one task means the half nothing can
// see is reviewed as though somebody had looked at it.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ A SUPPLIER PRICE IS A FACT ABOUT A RELATIONSHIP, NOT ABOUT A PRODUCT
// ----------------------------------------------------------------------------
// §2.8 lists three price states Comprar must draw and they must LOOK different:
// a prefill from this provider, a NEW PAIRING — *you have bought this, but never
// from them* — and a brand-new product. **The middle one is the one that
// matters**, and the ADR says why in terms a screen cannot restate: *"an empty
// required field asks a question; a wrong prefill answers one nobody asked."*
//
// So `quotesFor` reads ONE provider's memory and never falls back to another's,
// and never to the shelf price — which `@/cart/cart`'s `quoteFor` already
// refuses to do on the buy side for the same reason (C3.11). A delivery quietly
// recorded at retail is plausible, syntactically perfect, and wrong in the
// margin for ever.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT A CASHIER SEES HERE IS NOT WHAT A MANAGER SEES, AND IT LOOKS THE SAME
// ----------------------------------------------------------------------------
// Measured on 2026-09-24 against a reset database with a publishable key, not
// inferred from the migrations:
//
//   * `provider_select` is `workspace_id in (select public.my_workspaces())`
//     (`0002:522`) — ANY member reads the whole provider directory.
//   * `provider_price_memory` is a `security_invoker` view, so `purchase` and
//     `purchase_line`'s own policies apply — and both are
//     `has_role(workspace_id, 'manager')` (`0003:558`). A cashier selecting from
//     it gets **200 and an empty array**, never a 403.
//   * `record_purchase` fences NEITHER. It is `security definer` carrying §2.6's
//     location wall and no role check at all (`0018:165`), so she can record a
//     delivery that SUCCEEDS and then read zero purchases back.
//
// ⚠️⚠️ THE FAILURE IS INVISIBLE BECAUSE THE BROKEN CASE RENDERS AS THE DESIGNED
// ONE: an empty memory IS §2.8's new-pairing state, and it is the correct
// rendering when the pairing really is new. Nothing on the screen can tell them
// apart. `memoryState` below is this module's whole answer to that — it
// does not guess, it reports which of the two questions has not been asked, and
// `docs/checks/5g-i-purchase-contract.sh` is where the claim is measured.
//
// ⚠️ THE FENCE IS NOT CHANGED HERE AND NO MIGRATION IS PROPOSED. Whether
// Comprar should be manager-only in the APP is a shop question — a cashier does
// not accept deliveries — and it belongs to `5g-ii`, which has a screen to ask
// it about. ⚠️⚠️ **`5g-ii` PUT THAT QUESTION AND DID NOT ANSWER IT** — it is
// in ⛔ DECISIONS OWED. `canReadMemory` below is the half that could be built
// without the ruling, because it reports the fence rather than acting on it.
//
// ----------------------------------------------------------------------------
// ⚠️ THE PREFILL IS STORED PER BASE AND READ PER PRICE UNIT, AND NEITHER
// CONVERSION IS WRITTEN HERE
// ----------------------------------------------------------------------------
// `provider_price_memory.unit_price_net_per_base` is `numeric(14,6)` per BASE
// unit — the same denomination `price_list.price_per_base` uses — and a
// shopkeeper reads `$8.50 / kg`. The two conversions already exist and are
// exact inverses of each other: `priceCentavos` (`@/api/catalog`) and
// `pricePerBase` (`@/api/catalogWrite`). **This module imports both rather than
// growing a third arithmetic**, which is `lineAnchorCentavos`'s argument one
// layer down and the reason `@tienda/money` exists at all (`R5`).
//
// ⚠️ THE CART NEEDS NO CONVERSION AT ALL, which is worth saying because it looks
// like an omission. `Quotes` in `@/cart/cart` is keyed per BASE, because that is
// what `record_purchase` is sent — so the memory goes into the basket exactly as
// Postgres spelled it, and only the BOX a person types into converts.
// ============================================================================

import { SCALE, formatDecimal } from '@tienda/money';

import {
  priceCentavos,
  priceLabel,
  searchTerm,
  type CatalogEntry,
  type UnitFactors,
} from '@/api/catalog';
import { pricePerBase } from '@/api/catalogWrite';
import { ROLES, type Role } from '@/api/members';
import type { Quotes } from '@/cart/cart';

/**
 * The columns a client may ask `provider` for.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`). `provider` carries `contact_name`, `phone` and
 * `address_line1`, and Comprar draws none of them — the directory that does is
 * **Proveedores**, which is step 6's own screen. A column the app never asks for
 * is a column that never reaches a phone, which is the assertion
 * `5d-i-catalog-contract.sh` already enforces one table over.
 *
 * ⚠️ `is_active` IS IN THE LIST BECAUSE THE POLICY DOES NOT FILTER, the same
 * arrangement `VARIANT_COLUMNS` records: a retired provider comes back like any
 * other and `providersFrom` is where the decision is made, in a file the suite
 * can read.
 */
export const PROVIDER_COLUMNS = 'id,name,is_generic,is_active';

/** The order the database applies. Never re-sorted here — see `providersFrom`. */
export const PROVIDER_ORDER_COLUMN = 'name';

/** The query key the provider list caches under. */
export const PROVIDERS_KEY = ['providers', 'list'] as const;

/**
 * The view `0008` derives rather than caches, and the columns Comprar needs.
 *
 * ⚠️⚠️ `unit_price_net_per_base::text` — AND THE CAST IS NOT COSMETIC. Measured
 * off a real PostgREST on 2026-09-24, a bare `numeric` arrives as a JSON NUMBER
 * (`0.018000`), which is a double; `@tienda/money`'s `parseDecimal` refuses a
 * number argument outright, and a price that went through a float is the one
 * thing `R5` forbids anywhere near the ledger. `PRICE_COLUMNS` in
 * `@/api/catalog` carries the identical cast for the identical reason.
 *
 * ⚠️ `last_qty_display_unit` IS THE DENOMINATION SHE TYPED LAST TIME, and it is
 * read because `0008` says *"8.50 means nothing without it"*. ⚠️ It need NOT be
 * the variant's `price_unit_code` today — she may have bought a case last month
 * and kilos this week — so it is OFFERED and never assumed. `memoryFor` keeps it
 * beside the figure rather than folding the two together.
 *
 * ⚠️⚠️ `last_purchased_at` WAS ADDED BY `5g-ii-c` AND IT IS NOT A NEW READ. The
 * view has derived it since `0008` (*"so a manager asking 'why is it offering me
 * this?' can be answered with a row rather than an explanation"*) and this app
 * simply never asked. **It is what makes the owner's `Recientes` pill possible
 * without a second query** — see `sortedForBuying`.
 *
 * ⚠️ IT IS READ AS A STRING AND NEVER PARSED. `occurred_at` is `timestamptz`, so
 * PostgREST sends ISO-8601 — which sorts correctly as TEXT for any two instants
 * at the same offset, and Postgres renders them all in UTC. **No `Date`, no
 * `Intl`, nothing in `R10`'s unmeasured surface.**
 */
export const MEMORY_COLUMNS =
  'provider_id,variant_id,unit_price_net_per_base::text,last_qty_display_unit,last_purchased_at';

/** The view, spelled once (`R13`). */
export const MEMORY_TABLE = 'provider_price_memory';

/** The column a memory read filters on — one provider, never all of them. */
export const MEMORY_PROVIDER_COLUMN = 'provider_id';

/**
 * The query key one provider's memory caches under.
 *
 * ⚠️ THE PROVIDER IS IN THE KEY, which is the cache's half of *never across
 * providers*. One key for all of them would serve the last provider's prices to
 * the next one — the precise failure §2.8 spends a paragraph on, arriving
 * through TanStack instead of through a fallback.
 */
export function memoryKey(providerId: string | null): readonly unknown[] {
  return ['providers', 'memory', providerId ?? ''];
}

/** A `provider` row as PostgREST sends it. */
export interface ProviderRow {
  readonly id: string;
  readonly name: string;
  readonly is_generic: boolean;
  readonly is_active: boolean;
}

/** A `provider_price_memory` row as PostgREST sends it. */
export interface MemoryRow {
  readonly provider_id: string;
  readonly variant_id: string;
  /** Net, per BASE unit — a decimal string at scale 6. See `MEMORY_COLUMNS`. */
  readonly unit_price_net_per_base: string;
  readonly last_qty_display_unit: string | null;
  /** ISO-8601, as PostgREST sends a `timestamptz`. Compared as text, never parsed. */
  readonly last_purchased_at: string | null;
}

/** One entry of the header's picker, with no rendering in it. */
export interface Provider {
  readonly id: string;
  readonly name: string;
  /** `Genérico` — the row F6 requires, and the default (`0039`). */
  readonly isGeneric: boolean;
}

/** Empty, which is what a provider read still in flight looks like. */
export const NO_PROVIDERS: readonly Provider[] = Object.freeze(
  [],
) as readonly Provider[];

/**
 * The providers this shop can be buying from.
 *
 * ⚠️ RETIRED PROVIDERS ARE DROPPED HERE AND NOT IN THE QUERY, the arrangement
 * `catalogFrom` and `members.ts` both already made: `provider_select` does not
 * filter, so the rule is a decision and a decision belongs where the suite can
 * read it.
 *
 * ⚠️⚠️ EXCEPT THE GENERIC ONE, WHICH IS KEPT WHATEVER `is_active` SAYS.
 * `provider_protect_generic` (`0002`) refuses to DELETE it and refuses to
 * DEMOTE it, and stops there — nothing prevents it being deactivated. A shop
 * whose catch-all provider had been switched off would open Comprar with no
 * default at all and `record_purchase` refusing every delivery for want of a
 * counterparty, which is a dead screen produced by one editable boolean.
 *
 * ⚠️⚠️ AND THE GENERIC ROW GOES FIRST, WHICH IS A PROMOTION AND NOT A SORT. The
 * rest keep the database's own order (`order=name`) untouched, for
 * `catalogFrom`'s reason: a second sort in this runtime is a second answer to
 * *which comes first*, decided by whatever collation Hermes has rather than the
 * one Postgres applied. F6 makes this row the default — *"I bought this at the
 * market this morning"* — and a default she has to scroll to is not one.
 */
export function providersFrom(
  rows: readonly ProviderRow[] | null | undefined,
): readonly Provider[] {
  const generic: Provider[] = [];
  const rest: Provider[] = [];
  for (const row of rows ?? []) {
    const provider: Provider = { id: row.id, name: row.name, isGeneric: row.is_generic };
    if (row.is_generic) generic.push(provider);
    else if (row.is_active) rest.push(provider);
  }
  return [...generic, ...rest];
}

/**
 * The provider Comprar opens on, or `null` when the read has not landed.
 *
 * ⚠️ IT IS THE GENERIC ROW AND NOT *the first one*, even though `providersFrom`
 * puts them in that order. The two agree today and they are two different
 * claims: the order is a convenience and this is F6. A shop that somehow held
 * no generic row would otherwise open on whichever supplier sorted first and
 * record a market run against them.
 */
export function defaultProvider(providers: readonly Provider[]): Provider | null {
  for (const provider of providers) if (provider.isGeneric) return provider;
  return null;
}

/** The provider with this id, or `null`. */
export function providerById(
  providers: readonly Provider[],
  id: string | null,
): Provider | null {
  if (id === null) return null;
  for (const provider of providers) if (provider.id === id) return provider;
  return null;
}

/**
 * What this provider charged last time, keyed by variant — the map
 * `@/cart/cart` prices the buy side from.
 *
 * ⚠️⚠️ IT IS PER BASE AND IS NOT CONVERTED, which is the header's point: `Quotes`
 * is what `quoteFor` hands to `quoted`, and `quoted` wants the figure in the
 * denomination `record_purchase` is sent. Converting here and back in the RPC
 * payload would be two roundings of one number.
 *
 * ⚠️ ROWS FOR ANOTHER PROVIDER ARE DROPPED RATHER THAN TRUSTED. The query filters
 * by `provider_id` and this filters again, which is deliberate belt-and-braces
 * on the one rule §2.8 says the operator cannot catch for us: a borrowed prefill
 * *"looks exactly like the case where the system knows"*, so the moment a cache
 * key, a filter or a refactor slips, nothing else in this app would notice.
 */
export function quotesFor(
  rows: readonly MemoryRow[] | null | undefined,
  providerId: string | null,
): Quotes {
  if (providerId === null) return {};
  const quotes: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row.provider_id !== providerId) continue;
    quotes[row.variant_id] = row.unit_price_net_per_base;
  }
  return quotes;
}

/** One remembered pairing, as the price box needs it. */
export interface Memory {
  /** Net per BASE unit, exactly as Postgres sent it. */
  readonly perBase: string;
  /** What ONE PRICE UNIT cost, in centavos — or `null`, see `priceCentavos`. */
  readonly centavos: number | null;
  /** C3.10's sentence for that figure, ready to render. */
  readonly price: string;
  /** The denomination she typed last time, or `null` when `0008` held none. */
  readonly lastUnit: string | null;
}

/**
 * What this provider charged for this variant, as a person reads it.
 *
 * ⚠️ `null` MEANS *NOBODY HAS ANSWERED THIS QUESTION*, and it is §2.8's middle
 * state rather than a zero (C3.12, and `0008`'s own header: an absent pairing
 * renders *"as a distinct empty state, not as a zero"*). The Power Apps screen
 * this replaces showed `Precio: $0.00` on never-bought rows, which is a price
 * somebody set wearing the clothes of a question nobody asked.
 *
 * ⚠️ THE PRICE UNIT IS THE VARIANT'S OWN AND NOT `last_qty_display_unit`. She
 * reads today's product at today's denomination; what she typed last time is
 * carried beside it as `lastUnit` so the screen can offer it, and a session that
 * folded the two would show a kilo price labelled *por caja*.
 */
export function memoryFor(
  rows: readonly MemoryRow[] | null | undefined,
  providerId: string | null,
  variantId: string,
  priceUnit: string,
  factors: UnitFactors,
): Memory | null {
  const perBase = quotesFor(rows, providerId)[variantId];
  if (typeof perBase !== 'string') return null;
  const factor = factors[priceUnit];
  const centavos = factor === undefined ? null : priceCentavos(perBase, factor);
  let lastUnit: string | null = null;
  for (const row of rows ?? []) {
    if (row.provider_id === providerId && row.variant_id === variantId) {
      lastUnit = row.last_qty_display_unit;
      break;
    }
  }
  return { perBase, centavos, price: priceLabel(centavos, priceUnit), lastUnit };
}

/**
 * A price typed per PRICE UNIT, as `record_purchase` wants it: net, per base, a
 * decimal string at scale 6 — or `null` when it is not a price at all.
 *
 * ⚠️ IT IS `pricePerBase` AND NOT A SECOND ARITHMETIC. `Agregar` and `Editar`
 * already turn a typed peso figure into `price_list.price_per_base` through it,
 * and the buy side stores the identical denomination in
 * `purchase_line.unit_price_net_per_base` — also `numeric(14,6)`, verified
 * against `0003:186`. Two functions for one conversion is how the two screens
 * would eventually disagree about `$8.50 / kg`.
 *
 * ⚠️ A MISSING FACTOR IS `null` AND NOT A GUESS — *"a null is a unit this phone
 * has not read"*, `stepOf`'s rule, and the reason C3.13 blocks the commit rather
 * than sending something.
 */
export function typedPerBase(
  centavos: number | null,
  priceUnit: string,
  factors: UnitFactors,
): string | null {
  if (centavos === null || !Number.isFinite(centavos) || centavos < 0) return null;
  const factor = factors[priceUnit];
  if (factor === undefined) return null;
  return pricePerBase(centavos, factor);
}

/**
 * Which question an empty memory is the answer to.
 *
 * ⚠️⚠️ THIS FUNCTION EXISTS BECAUSE TWO COMPLETELY DIFFERENT SITUATIONS PRODUCE
 * THE IDENTICAL WIRE RESPONSE, AND ONE OF THEM IS A BUG IN THE SHOP'S HANDS.
 * `provider_price_memory` is manager-and-above; a cashier's read is **200 with
 * an empty array**, exactly like a manager's read of a pairing that really is
 * new. §2.8 requires the new pairing to render *empty and required* — so the
 * broken case is drawn as the working one, correctly, and neither the screen nor
 * the person looking at it can tell.
 *
 * ⚠️ IT RESOLVES NOTHING BY GUESSING. It takes what the caller already knows —
 * may this person read a purchase at all — and NAMES which state this is, so
 * `5g-ii` has something to branch on other than an empty array. `unreadable` is
 * not a Spanish sentence and never reaches a person (`R4`): what a cashier is
 * told, if anything, is a screen decision the owner has not been asked for yet.
 *
 * ⚠️ `unknown` IS NOT `new-pairing`, and that distinction is the same one
 * `membershipFrom` makes about a membership still in flight: *not back yet* must
 * never render as *there is nothing*.
 */
export type MemoryState = 'remembered' | 'new-pairing' | 'unreadable' | 'unknown';

export function memoryState(
  rows: readonly MemoryRow[] | null | undefined,
  providerId: string | null,
  variantId: string,
  canReadPurchases: boolean,
): MemoryState {
  if (rows === null || rows === undefined || providerId === null) return 'unknown';
  if (typeof quotesFor(rows, providerId)[variantId] === 'string') return 'remembered';
  return canReadPurchases ? 'new-pairing' : 'unreadable';
}

// ----------------------------------------------------------------------------
// WHAT A SCREEN NEEDS AND `5g-i` COULD NOT SUPPLY — added by `5g-ii`
// ----------------------------------------------------------------------------

/**
 * May this person read `provider_price_memory` at all?
 *
 * ⚠️⚠️ IT EXISTS BECAUSE `memoryState` TAKES THIS BOOLEAN AND NOTHING SUPPLIED
 * ONE. `5g-i` built the distinction — *is this pairing new, or is this a fence
 * you cannot see* — and left the caller to say which, because a ROLE is not a
 * provider read and `useProviders` has no business fetching one. Comprar is the
 * first caller, and without this the comparison would sit in a ternary inside a
 * screen no instrument in this repository can look at (`R9`).
 *
 * ⚠️⚠️ IT IS A CLAIM ABOUT THE APPLIED POLICY AND NOT A PREFERENCE, AND THE POLICY
 * MOVED ON 2026-09-25. `provider_price_memory` is a `security_invoker` view over
 * `purchase` and `purchase_line`; both were `has_role(workspace_id, 'manager')`
 * from `0003` until **`0040` dropped the role gate from both** on the decision
 * maker's instruction — *"Empleada should be able to see the both the purchase
 * records and the prices."* **So the answer is now yes for every role**, and this
 * function exists to make that a single line a test can read rather than a ternary
 * inside a screen no instrument can reach.
 *
 * ⚠️⚠️ IT IS NOT DELETED, AND THE REASON IS THE REASON IT WAS WRITTEN. The fence
 * is one `alter policy` away in either direction; `memoryState` still needs an
 * answer to *may this person read a purchase at all*, and a caller that hard-coded
 * `true` would be a screen asserting something about RLS. ⚠️ **`docs/checks/5g-i-purchase-contract.sh`
 * assertion 10 is what keeps this honest** — it drives a real cashier over HTTP and
 * counts the rows she gets back.
 *
 * ⚠️ THE LOCATION WALL IS UNTOUCHED AND IS NOT THIS FUNCTION'S BUSINESS. `0040`
 * kept `my_locations()` on both policies, so a cashier reads HER store's deliveries
 * — which is a row filter and not a permission, and nothing here models it.
 *
 * ⚠️⚠️ IT WAS NOT AN ALIAS OF `canWriteCatalog` AND THE PREDICTION CAME TRUE IN
 * FOUR DAYS. That function's recorded argument was that both answered *manager and
 * above* today, were different questions, and *"a migration that loosened one would
 * move one."* ⚠️ **It did**: `0040` loosened this one and left `canWriteCatalog`
 * exactly where it was, so the catalog is still manager-and-above and the deliveries
 * are not. **Had they been aliased, editing a shop's products would have opened with
 * it.** ⚠️ The loosening was also predicted as the LIKELY direction, and the reason
 * given was the right one: `record_purchase` has no role check at all (`0018:165`),
 * so a cashier could already record a delivery she could not read back.
 *
 * ⚠️ `null` IS "NOT KNOWN" AND IS FENCED OUT, `roleOf`'s own distinction — and
 * here it is load-bearing rather than defensive. Answering `true` while the
 * membership read is in flight would make `memoryState` report `new-pairing` on
 * every row of a phone that has simply not been told who is holding it, which is
 * the one thing that distinction exists to prevent.
 */
export function canReadMemory(role: Role | null): boolean {
  if (role === null) return false;
  // ⚠️⚠️ EVERY KNOWN ROLE, SINCE `0040` (2026-09-25). This read
  // `ROLES.indexOf(role) <= ROLES.indexOf('manager')` from the day it was written
  // until the decision maker ruled *"Empleada should be able to see the both the
  // purchase records and the prices."* **The predicate follows the applied policy
  // and never leads it**, which is this function's whole job.
  return true;
}

/**
 * What the editable cost box READS — a peso figure per PRICE unit, as a person
 * would type it, or `''` when there is nothing to put in it.
 *
 * ⚠️⚠️ IT IS THE INVERSE OF `typedPerBase`, AND THE PAIR IS THE POINT. The cart
 * store holds what `record_purchase` will be sent — net, per BASE, scale 6 — so
 * the box's value has to be DERIVED from the stored figure on every render. If
 * that derivation disagreed with `typedPerBase` by one rounding, **a price she
 * typed would come back into the box as a different price, and nothing on the
 * screen would say which of the two the ledger got.**
 * ⚠️ `app/test/api-providers.test.ts` reads the ROUND TRIP rather than each half,
 * because agreeing with itself is the whole claim.
 *
 * ⚠️ NO `$` AND NO THOUSANDS COMMA, WHICH IS NOT A STYLE CHOICE: this string goes
 * into a `TextInput` a thumb is about to edit. `formatMXN` is for a figure a
 * person READS — `parsePesos` would take the decoration back, but a box that
 * re-renders `$1,234.50` under a moving cursor is a box that fights the typist.
 * ⚠️ `formatDecimal` at `SCALE.money` is `@tienda/money`'s own arithmetic, so no
 * peso-valued float is constructed anywhere on this path (`R5`).
 *
 * ⚠️⚠️ `''` AND NOT C3.12's DASH. The dash is what a READ-ONLY price shows when
 * there is no memory; an empty BOX is §2.8's *empty and required*, and a box
 * holding `—` is a box whose first keystroke produces `—8`.
 */
export function costShown(
  perBase: string | null | undefined,
  priceUnit: string,
  factors: UnitFactors,
): string {
  if (typeof perBase !== 'string' || perBase === '') return '';
  const factor = factors[priceUnit];
  if (factor === undefined) return '';
  const centavos = priceCentavos(perBase, factor);
  if (centavos === null) return '';
  return formatDecimal(centavos, SCALE.money);
}

/**
 * Which sentence, if any, belongs under the cost box — as a KEY and never as
 * Spanish (`R4`, the shape `src/auth/errors.ts` established).
 *
 * ⚠️⚠️ IT EXISTS BECAUSE A RULING LANDED ON A `.tsx` AND `R2` MEANS NO TEST CAN
 * REACH ONE. The owner ruled on 2026-09-25 that **Comprar is for any role for
 * now** — and that single sentence turned `5g-ii`'s rendering of `unreadable`
 * from a simplification into a false statement, because an Empleada's memory read
 * is empty on **every** row including the ones her shop buys weekly. A rule that
 * important living in a ternary inside a 1,700-line screen is a rule the next
 * session can undo without anything going red.
 *
 * ⚠️⚠️ `unreadable` IS UNREACHABLE SINCE `0040` (2026-09-25) AND THE BRANCH STAYS.
 * `canReadMemory` now answers `true` for every known role, so `memoryState` cannot
 * return it — **the state is dead, not wrong.** It is kept because the fence is one
 * `alter policy` away in either direction and because `MemoryState` is the type that
 * would have to grow it back; deleting a branch to celebrate a ruling is how the
 * next ruling costs more than it should. ⚠️ **Its assertion is kept for the same
 * reason and is now asserting over an input the app cannot currently produce**,
 * which is said here rather than left for somebody to discover as a gap.
 *
 * ⚠️ `null` FOR `unreadable` IS THE RULING OF 2026-09-25 THAT PRECEDED IT, AND IT
 * IS WHY THIS FUNCTION EXISTS AT ALL. The box is still empty and still required — that much is TRUE for
 * her, because the app genuinely cannot tell her what this cost — but the screen
 * says nothing about why. ⚠️ **Not *"no puedes ver los precios anteriores"*
 * either**: that is a role boundary she did not ask about and cannot change
 * ([[users-dont-do-bookkeeping]]), and it would be wrong on the rows that really
 * are new, which nothing here can distinguish.
 *
 * ⚠️ `null` FOR `unknown` IS A DIFFERENT CLAIM WITH THE SAME ANSWER — *not back
 * yet* must not render as *there is nothing* — and they are kept separate in
 * `MemoryState` precisely so a later change can part them.
 *
 * ⚠️ AND `remembered` WITH NO FIGURE FALLS THROUGH TO `null` rather than to the
 * new-pairing sentence: a state that says *we know this* while carrying nothing
 * to show is a bug, and announcing it as *first time* would hide it.
 */
export type CostNote = 'last-paid' | 'new-pairing' | null;

export function costNote(state: MemoryState, remembered: Memory | null): CostNote {
  if (state === 'remembered') return remembered === null ? null : 'last-paid';
  if (state === 'new-pairing') return 'new-pairing';
  return null;
}

// ----------------------------------------------------------------------------
// HOW THE CATALOG IS ORDERED ON COMPRAR — the owner's pills, 2026-09-25
// ----------------------------------------------------------------------------

/**
 * The two orders the owner asked for: *"the preselected sorter is `Recientes`
 * but you can also pick `A-Z`."*
 *
 * ⚠️ TWO AND NOT THREE. He also said the pills are *"hidden when typing to
 * search"*, which is a third order — relevance — that `search` already owns and
 * this type deliberately does not name.
 */
export type CatalogSort = 'recent' | 'az';

/** What Comprar opens on. His word: `Recientes`. */
export const DEFAULT_SORT: CatalogSort = 'recent';

/**
 * When this provider last sold the shop each variant, keyed by variant id.
 *
 * ⚠️ ONE PROVIDER, LIKE EVERYTHING ELSE IN THIS MODULE (C3.11, §2.8). Rows for
 * another provider are dropped rather than trusted, which is `quotesFor`'s own
 * belt-and-braces and for its reason: the moment a cache key or a filter slips,
 * nothing else in this app would notice.
 */
export function lastPurchasedFor(
  rows: readonly MemoryRow[] | null | undefined,
  providerId: string | null,
): Readonly<Record<string, string>> {
  if (providerId === null) return {};
  const when: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row.provider_id !== providerId) continue;
    if (typeof row.last_purchased_at !== 'string' || row.last_purchased_at === '') continue;
    when[row.variant_id] = row.last_purchased_at;
  }
  return when;
}

/**
 * The catalog in the order the chosen pill asks for.
 *
 * ⚠️⚠️ `az` SORTS ON THE FOLDED NAME AND NOT ON `localeCompare`, AND THAT IS
 * `R10` RATHER THAN A PREFERENCE. `Intl.Collator` is on the gate's BANNED list —
 * *"a function on Android and unasked on iOS"* — and `localeCompare` is the same
 * machinery behind a friendlier name. `searchTerm` (`@/api/catalog`) already
 * lower-cases and strips accents for the search, so **`Ávila` sorts where a
 * Spanish reader expects it, with no ICU anywhere on the path.**
 *
 * ⚠️ `recent` IS DESCENDING — newest first — and that is the only thing about it a
 * mutation can catch. See the `undefined` branches in the body for the claim this
 * function made about them that turned out to be false.
 *
 * ⚠️⚠️ `recent` IS *THIS PROVIDER'S* RECENCY, AND THE WART IS NAMED RATHER THAN
 * DISCOVERED. A variant this provider has never sold the shop has no date, so it
 * sorts AFTER every one that does — which means **on a brand-new provider the
 * pill looks inert**, because every row ties and the order falls back to the one
 * Postgres sent (`order=name`). ⚠️ The alternative is the shop's recency across
 * every provider: it would make the pill live on a new provider and it costs a
 * wider memory read, which gives up the rule `memoryKey` was written for — one
 * cache key per provider, so no provider's prices can be served to another.
 * **Not taken; `5g-ii-c`'s row records it for the owner to reverse in a sentence.**
 *
 * ⚠️ THE FALLBACK WITHIN A TIE IS THE INCOMING ORDER AND NOT A SECOND SORT, which
 * is `providersFrom`'s recorded argument: a second sort in this runtime is a
 * second answer to *which comes first*, decided by whatever collation Hermes has
 * rather than the one Postgres applied.
 *
 * ⚠️ IT RETURNS A NEW ARRAY AND NEVER SORTS IN PLACE. The array it is handed is
 * TanStack Query's cached value; sorting that would mutate the cache, and the
 * next render would read an order nobody chose.
 */
export function sortedForBuying(
  entries: readonly CatalogEntry[],
  sort: CatalogSort,
  when: Readonly<Record<string, string>>,
): readonly CatalogEntry[] {
  const at = entries.map((entry, index) => ({ entry, index }));
  if (sort === 'az') {
    at.sort((a, b) => {
      const an = searchTerm(a.entry.name);
      const bn = searchTerm(b.entry.name);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return a.index - b.index;
    });
    return at.map((one) => one.entry);
  }
  at.sort((a, b) => {
    const aw = when[a.entry.id];
    const bw = when[b.entry.id];
    // ⚠️⚠️ A VARIANT THIS PROVIDER HAS NEVER SOLD SINKS, AND THE EXPLICIT BRANCHES
    // ARE FOR CLARITY RATHER THAN FOR CORRECTNESS — which is a correction to what
    // this comment said first. It claimed `'' < '2026-…'` would float every unbought
    // product; **under a DESCENDING compare an empty string is the oldest instant,
    // so it sinks either way.** A falsification replacing these three lines with
    // `aw ?? ''` left all 58 assertions green, which is how the overstatement was
    // caught. ⚠️ **The real trap is the DIRECTION**, and that has its own assertion.
    // ⚠️ They stay because they would become load-bearing the moment anybody adds an
    // ascending order, and because *absent* and *the beginning of time* are not the
    // same fact even where they sort the same.
    if (aw === undefined && bw === undefined) return a.index - b.index;
    if (aw === undefined) return 1;
    if (bw === undefined) return -1;
    if (aw > bw) return -1;
    if (aw < bw) return 1;
    return a.index - b.index;
  });
  return at.map((one) => one.entry);
}
