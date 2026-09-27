// ============================================================================
// PUTTING A DOCUMENT RIGHT. Plan task `5h-ii-b`, and the twenty-fourth module of
// `src/api/` — §2.11's boundary, `R12`, `R13`.
//
// ⚠️ NO SCREEN AND NO COMPONENT — `@/api/documents`' shape and for its reason:
// everything decided here has a right answer `app/test/api-corrections.test.ts`
// can read. `app/src/app/documentos.tsx` draws the two buttons and decides
// nothing; `app/src/api/calls.ts` is the only file that talks.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THIS LEDGER HAS NEVER CHANGED A ROW, AND `Corregir` IS NOT ABOUT TO
// ----------------------------------------------------------------------------
// A correction here is **a void and a re-record**. `void_transaction` (`0021`)
// answers a void by INSERTING a mirror-image document — negated lines, negated
// totals, `reversal_of` set, one compensating stock movement against the SAME
// batch — and the original is never touched. Both stand in the ledger for ever,
// and `documentsFrom` drops the pair so `Lo último` reads *"just one line,
// clean"*, which is the owner's own answer (`5h-i`, 2026-09-26).
//
// ⚠️ SO THERE ARE TWO AFFORDANCES AND ONE WRITE PATH. `Eliminar` is the void
// alone — *"yes, delete for a duplicate"* — and `Corregir` is the same void
// followed by a capture screen with the old lines already in the cart. The
// difference a shopkeeper sees is where she ends up; the difference the ledger
// sees is one word in `reversal_reason`.
//
// ⚠️⚠️ AND SHE NEVER READS THE WORD *cancelar*, *reversa* OR *anular*
// ([[users-dont-do-bookkeeping]]). `Corregir` and `Eliminar` are what the two
// acts are called, because they are what she came to do.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ IT SHIPS NO MIGRATION, AND THAT IS THE FINDING `5h-i` PAID FOR
// ----------------------------------------------------------------------------
// `void_transaction(p_kind, p_id, p_reason)` has been applied since 2026-09-04
// and is **granted to `authenticated`** — `0021:448` revokes from `public` and
// grants execute, and `proacl` on the applied schema reads
// `authenticated=X/postgres`. The plan said for one day that no function in this
// schema writes a reversal and that a void was unreachable through the API; that
// was false, and the cost of believing it would have been a migration nobody
// needs.
//
// ⚠️ THE RPC IS IDEMPOTENT ON THE **ORIGINAL'S** ID, and `<kind>_one_reversal_idx`
// makes a document reversible at most once. A second tap answers 200 with
// `already_recorded: true` rather than writing a second reversal — measured
// 2026-09-26, and it is why `voidedFrom` must not require the `lines` and
// `movements` keys: **a replay's answer is SHORTER than a first void's.**
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE FENCE IS THE DATABASE'S, AND THIS FILE RENDERS ONLY THE HALF IT CAN
// KNOW FOR CERTAIN — THE MEASUREMENT THAT DECIDED IT
// ----------------------------------------------------------------------------
// `0021` §5 fences a void three ways: a manager or owner may void anything at
// any time; a staff member may void only her OWN document; and only inside
// `workspace_setting.void_window_minutes`.
//
// ⚠️⚠️ THE THIRD ONE CANNOT BE RENDERED HONESTLY FROM THIS SIDE, AND THE REASON
// IS A BASIS RULE RATHER THAN A MISSING COLUMN. `0021` measures the window from
// **`recorded_at` on an offline write and `occurred_at` otherwise** (§2.6, as
// amended 2026-09-04). A client that wanted to draw that boundary would need
// both columns AND a TypeScript copy of the rule — a second answer to *may she
// void this*, in the one place where a wrong answer **hides a button she is
// allowed to press**, which is undiagnosable from a shop floor.
//
// ⚠️⚠️ AND THE MEASUREMENT SAYS THE WINDOW ALMOST NEVER BITES ON THE DAY. Driven
// against a real database on 2026-09-26: a cashier voided her own five-hour-old
// delivery against a **fifteen-minute** window and got 200 — because
// `record_purchase` stamps `occurred_at := now()` on an online write
// (`0018:221`) and `recorded_at` is `now()` on an offline one, so **the clock
// starts when the document lands, not when the delivery happened.** The window
// only ever bites as real time passes.
//
// ✅ SO THE SPLIT IS: `mayCorrect` answers only the part that involves no clock
// — *is this person a manager, or is this her own document* — and everything
// else is the database's, arriving as `TD003` and rendered as a sentence by
// `@/api/errors`. **One answer to the question, in the place that owns it.**
//
// ⚠️ AND IT FAILS **OPEN**, WHICH IS DELIBERATE. When the role or the signed-in
// person is not yet known, `mayCorrect` says yes and lets the database refuse.
// A screen that hid its buttons whenever a second query was slow would be the
// `Cargando productos…` defect of 2026-09-22 wearing a permission badge — and
// the fence it would be protecting is `security definer` and cannot be talked
// past.
//
// ----------------------------------------------------------------------------
// ⚠️ WHAT `Corregir` PREFILLS, AND THE ONE THING IT DELIBERATELY DOES NOT
// ----------------------------------------------------------------------------
// `prefillOf` hands the cart the same lines the document had: the variant and
// the quantity on both sides, **and the price on the buy side only**.
//
// ⚠️⚠️ A SALE IS RE-PRICED AT THE SHELF AND THAT IS A DECISION, NOT AN OMISSION.
// `sale_line` stores `unit_price_net_per_base` — the NET — while `record_sale`
// takes the **GROSS** (`0016:59`), and `quoted` reads a typed sell quote as
// gross whenever `prices_include_tax` is true, which is `0001`'s default and
// true in every shop that exists. So prefilling the stored figure would quote a
// net as a gross and undercharge by the IVA. Recovering the gross needs
// `tax_rate` and `grossFromNet` — a third answer to *what is this sale worth*,
// in a module that should not have one. **`quoteFor` already falls back to the
// catalog's own `perBase` for a sale**, which is what Vender does for every sale
// it has ever rung, so a corrected sale is a sale made now at the price on the
// shelf now. ⚠️ The cost is a shelf price that moved between the sale and the
// correction; the reversal is one column (`tax_rate::text`) and one call to
// `grossFromNet`.
//
// ⚠️ THE BUY SIDE IS EXACT: `record_purchase` takes `unit_price_net_per_base`,
// `purchase_line` stores it, and `quoted` passes a buy quote through unchanged
// (§2.5 rule 2, as `5g-i` corrected it) — so the figure goes back exactly as it
// came.
// ============================================================================


import { costsKey } from '@/api/costs';
import { documentsKey, type DocumentKind, type ShopDocument } from '@/api/documents';
import { MAGNITUDE_KEY } from '@/api/magnitude';
import type { Role } from '@/api/members';
import { memoryKey } from '@/api/providers';
import { TODAY_KEY } from '@/api/today';
import type { CartLine, Quotes, Scope } from '@/cart/cart';
import { ES } from '@/strings';

/**
 * The RPC, named once (`R13`).
 *
 * ⚠️ PostgREST MATCHES A FUNCTION BY ITS PARAMETER NAMES, so a misspelling here
 * or in `VoidArgs` is a **404 / `PGRST202`** rather than a bad call — the 404
 * `R13` exists for. `docs/checks/5h-ii-b-corrections-contract.sh` is what puts
 * both in front of a real database.
 */
export const VOID_TRANSACTION = 'void_transaction';

/**
 * The two things a shopkeeper can do to a document she got wrong.
 *
 * ⚠️ THEY ARE THE SAME WRITE. The only thing that differs downstream is the
 * `reversal_reason` stored with the compensating document, which is the audit
 * trail the owner asked for: *"Of course we will have a history of any of these
 * changes for audit reasons."*
 */
export type Correction = 'corregir' | 'eliminar';

export const CORRECTIONS: readonly Correction[] = ['corregir', 'eliminar'];

/**
 * What lands in `reversal_reason`.
 *
 * ⚠️⚠️ IT IS IN `src/strings.ts` AND NOT SPELLED HERE, AND THAT IS `R4` APPLIED
 * TO A STRING NO SHOPKEEPER READS — which is worth saying, because the rule's
 * own words are *"every word a shopkeeper reads"*. **The owner reads these.**
 * They are the audit trail he asked for, they are the only record of WHY a
 * document was cancelled, and they are in Spanish because he is the reader.
 * Keeping them beside the two buttons' labels is what stops the trail and the
 * screen drifting apart.
 */
export const CORRECTION_REASON: Readonly<Record<Correction, string>> = {
  corregir: ES.documents.reasonCorrected,
  eliminar: ES.documents.reasonDeleted,
};

/** The `p_` arguments, written once (`R13`). */
export interface VoidArgs {
  readonly p_kind: DocumentKind;
  readonly p_id: string;
  readonly p_reason: string;
}

/**
 * ⚠️ `p_kind` IS THE **DOCUMENT** KIND AND NOT THE CART'S. `void_transaction`
 * takes `'purchase' | 'sale' | 'waste'` as text (`0021`) and refuses anything
 * else with `22023`; the cart speaks `'buy' | 'sell'`. `CART_KIND` below is the
 * one place the two vocabularies meet.
 */
export function voidArgs(kind: DocumentKind, id: string, how: Correction): VoidArgs {
  return { p_kind: kind, p_id: id, p_reason: CORRECTION_REASON[how] };
}

/** What the RPC answered. */
export interface Voided {
  /** The id of the document that was cancelled. */
  readonly voided: string;
  /** The id of the compensating document it wrote. */
  readonly voidId: string;
  /** ⚠️ TRUE WHEN THIS VOID HAD ALREADY HAPPENED — a retry, not a failure. */
  readonly alreadyRecorded: boolean;
}

/**
 * The RPC's `jsonb`, read.
 *
 * ⚠️⚠️ `lines` AND `movements` ARE NOT REQUIRED AND THAT IS MEASURED, NOT
 * CAUTIOUS. A first void answers
 * `{kind, voided, void_id, lines, movements, already_recorded:false}`; a replay
 * answers `{kind, voided, void_id, already_recorded:true}` — **four keys, not
 * six** (`0021:268`, driven 2026-09-26). A parser that required the counts would
 * turn the idempotent success into a failure on exactly the tap a shopkeeper
 * makes when the first response was lost.
 *
 * ⚠️ IT RETURNS `null` RATHER THAN THROWING on a shape it does not recognise,
 * because the caller has already had its `error` checked: a 200 whose body is
 * not this object means the app and the database disagree about the RPC, which
 * is `isContractMismatch`'s territory and not a sentence for a shopkeeper.
 */
export function voidedFrom(data: unknown): Voided | null {
  if (typeof data !== 'object' || data === null) return null;
  const row = data as Record<string, unknown>;
  const voided = row.voided;
  const voidId = row.void_id;
  if (typeof voided !== 'string' || voided === '') return null;
  if (typeof voidId !== 'string' || voidId === '') return null;
  return { voided, voidId, alreadyRecorded: row.already_recorded === true };
}

/**
 * Should this person be shown `Corregir` and `Eliminar` on this document?
 *
 * ⚠️⚠️ IT IS A RENDERING AND NOT A PERMISSION. `void_transaction` is
 * `security definer` and decides for itself; this only keeps a button off a
 * screen where it is **certain** to be refused. Read this file's header for why
 * the window half is not here.
 *
 * The one certain refusal, and it involves no clock: `0021` §5 lets a staff
 * member void only her own document, comparing `created_by` with `auth.uid()`.
 * Both sides of that comparison are on this phone.
 *
 * ⚠️ EVERY OTHER CASE ANSWERS `true`, INCLUDING THE ONES IT DOES NOT KNOW —
 * a role still in flight, a membership read that failed, a `created_by` this
 * read did not carry. See the header: it fails open into a database that fails
 * closed.
 *
 * @param document who keyed it, off `@/api/documents`.
 * @param role     `useMyRole()`, or `null` while the membership is unknown.
 * @param userId   `session.user.id`, or `null` while the session is unknown.
 */
export function mayCorrect(
  document: ShopDocument,
  role: Role | null,
  userId: string | null,
): boolean {
  if (role !== 'staff') return true;
  if (userId === null || userId === '') return true;
  if (document.createdBy === null) return true;
  return document.createdBy === userId;
}

/**
 * Which cart a document's kind is re-recorded into.
 *
 * ⚠️⚠️ IT IS THE INVERSE OF `WRITE_KIND` (`@/cart/cart`) AND THE SUITE ASSERTS
 * THAT, rather than this module importing and inverting it at runtime. Two
 * hand-written maps of one correspondence is the stale-duplicate defect; a
 * hand-written map with a test that walks both is the same correspondence with
 * something watching it, and it keeps the direction readable at the call site.
 *
 * ⚠️⚠️ THE ANNOTATION WAS `Kind` UNTIL `6a-ii-a` AND IT WAS WRONG THE WHOLE TIME,
 * WHICH ONLY BECAME VISIBLE WHEN A THIRD KIND ARRIVED. `Kind` is `@tienda/money`'s
 * and names two directions of TAX (`'buy' | 'sell'`); what this map actually
 * answers is *which CART*, which is `Scope` — and `Scope` has a third member,
 * `waste`, because a write-off is a third DOCUMENT rather than a third
 * arithmetic (`MONEY_KIND.waste` is `'sell'`). The two types coincided on their
 * first two members, so nothing could see the difference until there was a
 * third. **The inverse claim is now true in the types and not only in the
 * suite.**
 */
export const CART_KIND: Readonly<Record<DocumentKind, Scope>> = {
  purchase: 'buy',
  sale: 'sell',
  waste: 'waste',
};

/** Where `Corregir` goes after the void. Typed so a renamed route is a build error. */
export const CORRECTION_ROUTE: Readonly<
  Record<DocumentKind, '/comprar' | '/vender' | '/desperdicio'>
> = {
  purchase: '/comprar',
  sale: '/vender',
  waste: '/desperdicio',
};

/**
 * Does this app yet know how to put a document of this kind right?
 *
 * ⚠️⚠️ IT IS NOT A PERMISSION AND IT IS NOT A FENCE — `mayCorrect` is the first
 * and `void_transaction` is the second. **This is *is it built*,** and it is a
 * named constant rather than a `kind !== 'waste'` inside a screen because those
 * are three different reasons a button might be absent and a reader deserves to
 * know which one they are looking at.
 *
 * ⚠️⚠️ `waste` IS `false` FOR EXACTLY ONE ROW, AND THE DATABASE WOULD ALLOW IT
 * TODAY. Measured 2026-09-27: a cashier voided her own one-hour-old write-off
 * and got a **200** — `void_transaction` has taken all three kinds since `0021`
 * and a void needs only the header. So this is a `5d-iii` decision and not a
 * capability: **a control that looks live and refuses silently is worse than one
 * that is obviously not built**, and `Corregir` on a write-off cannot work yet
 * at all. `prefillOf` would hand `load` a waste cart **with no cause** — the
 * schema requires one per line and `6a-i` writes one per document — so the
 * shopkeeper would arrive at Desperdicio with her products and no answer to the
 * question that screen asks FIRST.
 *
 * ⚠️ **`6a-ii-b` FLIPS IT**, and flipping it is deliberately the smallest part
 * of that row: the cart has to learn to carry a cause first.
 */
export const CORRECTABLE: Readonly<Record<DocumentKind, boolean>> = {
  purchase: true,
  sale: true,
  waste: false,
};

/** A cart, ready to be loaded. */
export interface Prefill {
  /** ⚠️ WHICH CART, and that is `Scope` rather than `@tienda/money`'s `Kind` —
   *  see `CART_KIND` for why the two are not the same thing and why only a third
   *  document kind made the difference visible. */
  readonly kind: Scope;
  readonly lines: readonly CartLine[];
  readonly quotes: Quotes;
  /** ⚠️ `null` ON A SALE, and on a delivery whose provider did not read back. */
  readonly providerId: string | null;
  /**
   * ⚠️⚠️ HOW MANY LINES WERE DROPPED FOR AN UNREADABLE QUANTITY. Nothing on the
   * screen uses it yet and the suite is what reads it — it exists so a silent
   * short cart is a fact this module STATES rather than one a shopkeeper has to
   * notice. `5h.5` is where a sentence for it would land.
   */
  readonly dropped: number;
}

/**
 * The document, as a cart.
 *
 * ⚠️ A LINE WITH NO READABLE `qty_base` IS DROPPED AND COUNTED — see `baseOf`.
 * ⚠️ A DUPLICATE VARIANT COLLAPSES, AND THAT IS THE CART'S OWN RULE RATHER THAN
 * A LOSS THIS FUNCTION CHOOSES: one document may legitimately carry two lines
 * of the SAME variant (`record_purchase` accepts it, measured 2026-09-26), and
 * `CartLine` is keyed by variant. **The quantities are added** — which is what
 * the delivery actually was — and the LAST line's price wins, because `setPrice`
 * holds one quote per variant and a cart cannot represent two.
 */
export function prefillOf(document: ShopDocument): Prefill {
  const totals = new Map<string, number>();
  const quotes: Record<string, string> = {};
  let dropped = 0;

  for (const line of document.lines) {
    if (line.variantId === '' || line.base === null) {
      dropped += 1;
      continue;
    }
    totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + line.base);
    // ⚠️ THE BUY SIDE ONLY — the header's paragraph carries the argument, and
    // `quoteFor` is what fills a sale's price from the catalog instead.
    if (document.kind === 'purchase' && line.perBase !== null) {
      quotes[line.variantId] = line.perBase;
    }
  }

  const lines: CartLine[] = [];
  for (const [variantId, base] of totals) lines.push({ variantId, base });

  return {
    kind: CART_KIND[document.kind],
    lines,
    quotes,
    providerId: document.providerId,
    dropped,
  };
}

/**
 * Every cached read a void makes wrong, as query keys.
 *
 * ⚠️⚠️ IT IS A PURE FUNCTION IN THIS MODULE RATHER THAN A LIST INSIDE THE
 * MUTATION, BECAUSE *which screens go stale when a document is cancelled* IS A
 * QUESTION WITH A RIGHT ANSWER — and a wrong one is invisible. A screen left
 * holding a voided delivery for the sixty seconds of its `staleTime` shows a
 * correction that did not happen, on the one screen built for checking whether
 * it did. `app/test/api-corrections.test.ts` walks this.
 *
 * ⚠️ THE KEYS ARE BUILT BY THE MODULES THAT OWN THEM AND NEVER RETYPED HERE —
 * `documentsKey`, `costsKey`, `memoryKey`, `TODAY_KEY`, `MAGNITUDE_KEY`. A
 * prefix spelled out in this file would be a second copy of a cache key, which
 * goes stale in the direction nothing can see.
 *
 * ⚠️ BOTH DOCUMENT KINDS ARE ALWAYS INVALIDATED and the rest are conditional,
 * which is deliberate rather than lazy: the screen holds both lists at once and
 * a switch between them must not serve a list taken before the void.
 *
 * ⚠️⚠️ THE **PER-VARIANT** COSTS KEYS COME OFF THE DOCUMENT'S OWN LINES rather
 * than from invalidating the whole `costs` prefix. Those are the only series a
 * void moves, and a broad invalidation would re-fetch every product whose chart
 * the shopkeeper happens to have open.
 */
export function staleAfterVoid(document: ShopDocument): readonly (readonly unknown[])[] {
  // ⚠️ ALL THREE LISTS, ALWAYS — the screen holds every kind at once and a
  // switch between tabs must not serve a list taken before the void. `waste`
  // joined them in `6a-ii-a`.
  const keys: (readonly unknown[])[] = [
    documentsKey('purchase'),
    documentsKey('sale'),
    documentsKey('waste'),
  ];

  // ⚠️⚠️ A WRITE-OFF ADDS NOTHING BEYOND THE THREE LISTS, AND THAT IS MEASURED
  // RATHER THAN ASSUMED — it is also why this is a `switch` and no longer an
  // `if/else` whose `else` meant *purchase*. `takingsFrom` counts SALES, so
  // Inicio is untouched; `costsFrom` and `magnitude` both read `purchase_line`,
  // so the cost series and the typical-quantity guard are untouched;
  // `provider_price_memory` reads deliveries. **A void of a write-off moves
  // stock and this app caches no stock read at all** — so the day `Números`
  // ships, this function is where its key goes.
  if (document.kind === 'waste') return keys;

  if (document.kind === 'sale') {
    // ⚠️ THE DAY'S TAKINGS, AND ONLY ON A SALE. `takingsFrom` counts sales and
    // nothing else, so a cancelled delivery leaves Inicio's figure correct.
    keys.push(TODAY_KEY);
  } else {
    // ⚠️ BOTH OF THESE READ `purchase_line` AND BOTH EXCLUDE A REVERSED
    // DOCUMENT, so both answer differently the instant this lands: the cost
    // series behind `Costos`, and the typical-quantity guard behind Comprar.
    for (const line of document.lines) {
      if (line.variantId !== '') keys.push(costsKey(line.variantId));
    }
    keys.push(MAGNITUDE_KEY);
    // ⚠️ THE PRICE MEMORY OF THIS SUPPLIER, which is what prefills Comprar's
    // price boxes — so a corrected delivery does not seed the next one with the
    // figure it was corrected for.
    if (document.providerId !== null) keys.push(memoryKey(document.providerId));
  }

  return keys;
}
