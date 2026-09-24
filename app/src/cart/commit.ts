// ============================================================================
// THE COMMIT — a basket becoming a row in the queue. Plan task `5f-iii-b`.
//
// ⚠️ NO SCREEN AND NO COMPONENT, the shape `5f-i` established for the same
// reason: everything here has a right answer `app/test/cart-commit.test.ts` can
// read, and the gesture that calls it does not.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHY THIS EXISTS AT ALL, WHEN IT IS TWO CALLS
// ----------------------------------------------------------------------------
// `draftOf` (`@/cart/cart`) and `queueWrite` (`@/api/outbox`) each return a
// discriminated union, and each has refusals that are PROGRAMMING ERRORS rather
// than a shopkeeper's problem — four in one and four in the other. A screen that
// composed them would carry eight branches none of which may ever reach a
// person, and **the slide has to know the answer BEFORE it is drawn**: a control
// that a thumb can complete and that then silently does nothing is the shape
// this repository refuses by name.
//
// So the composition lives here, and it answers two questions:
//   * `canCommit` — may the control be DRAWN at all?
//   * `commitOf`  — what row goes in the queue?
// and they are the same code path, which is the point. A slide drawn on a
// basket that cannot be committed is the defect; asking one function twice is
// how that is made structurally impossible rather than remembered.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ IT ENQUEUES NOTHING AND IT RINGS NOTHING
// ----------------------------------------------------------------------------
// `enqueue` writes to SQLite and `queued()` starts a drain — both are effects,
// both belong to the screen, and neither has a right answer a node suite can
// read. What this module guarantees is that **by the time the screen has a
// `QueuedWrite` in its hand, there is nothing left to decide.**
//
// ⚠️ THE ORDER THE SCREEN MUST USE IS WRITTEN IN `queued`'s OWN ROW AND NOT
// HERE: `enqueue` first, THEN `queued()`. A drain triggered before the row is on
// disk drains a queue that does not yet contain the sale.
// ============================================================================

import type { Kind } from '@tienda/money';

import type { CatalogEntry, UnitFactors } from '@/api/catalog';
import type { QueuedWrite, QueueRefusal, Stamp } from '@/api/outbox';
import { queueWrite } from '@/api/outbox';
import {
  draftOf,
  NO_QUOTES,
  NO_TAX_RATES,
  type DraftRefusal,
  type Cart,
  type Quotes,
  type TaxRates,
} from '@/cart/cart';

/**
 * Everything a commit needs, in one bag.
 *
 * ⚠️ A BAG RATHER THAN NINE POSITIONAL ARGUMENTS, and that is not style. Seven
 * of these are `string | null` or `boolean`, so a transposed pair type-checks
 * perfectly and sends the workspace as the location. `draftOf` already carries
 * that risk with eight; this is where it stops growing.
 */
export interface Basketful {
  readonly cart: Cart;
  readonly entries: readonly CatalogEntry[];
  readonly factors: UnitFactors;
  readonly kind: Kind;
  readonly pricesIncludeTax: boolean;
  readonly workspaceId: string;
  /** The store this phone is standing in — `useCatalog`'s, never re-derived. */
  readonly locationId: string | null;
  readonly rates?: TaxRates;
  readonly quotes?: Quotes;
  /**
   * Who a DELIVERY came from. Ignored on a sale, and required on a purchase.
   *
   * ⚠️ OPTIONAL IN THE TYPE AND NOT OPTIONAL IN FACT, which is deliberate: the
   * sale side has no counterparty at all, so a required field would make every
   * Vender caller write `providerId: null` and mean nothing by it. `draftOf`
   * refuses `no-provider` on the buy side, so the enforcement is where the
   * suite reads it rather than in a type that cannot say *only when buying*.
   */
  readonly providerId?: string | null;
}

/** Why a basket could not become a queued write. Never shown to anybody. */
export type CommitRefusal = DraftRefusal | QueueRefusal;

export type Committed =
  | { readonly ok: true; readonly write: QueuedWrite }
  | { readonly ok: false; readonly why: CommitRefusal };

/**
 * The basket as a row the outbox will accept — or the reason it is not one.
 *
 * ⚠️⚠️ SYNCHRONOUS, AND C10.3 IS WHY. `queueWrite` returns a row rather than a
 * promise so that the offline path and the online path are the same path, and
 * this function inherits that: the slide gets its answer in the same frame the
 * thumb lets go, with no network in it. **An animation that awaited Postgres
 * would be the offline path looking different in the one place nobody tests.**
 */
export function commitOf(b: Basketful, stamp: Stamp): Committed {
  const drafted = draftOf(
    b.cart,
    b.entries,
    b.factors,
    b.kind,
    b.pricesIncludeTax,
    b.workspaceId,
    b.locationId,
    b.rates ?? NO_TAX_RATES,
    b.quotes ?? NO_QUOTES,
    b.providerId ?? null,
  );
  if (!drafted.ok) return { ok: false, why: drafted.why };

  const queued = queueWrite(drafted.draft, stamp);
  if (!queued.ok) return { ok: false, why: queued.why };

  return { ok: true, write: queued.write };
}

/**
 * May the commit control be drawn?
 *
 * ⚠️⚠️ IT ASKS THE REAL QUESTION RATHER THAN A CHEAPER ONE. *Is the basket
 * non-empty* is the obvious test and it is wrong in two ways a pilot shop can
 * hit: a workspace with more than one store resolves `locationId` to `null`
 * (see `useCatalog`), and a line whose variant has left the catalog refuses the
 * whole basket. Both would draw a slide a thumb can complete over a commit that
 * cannot happen.
 *
 * ⚠️ THE STAMP IS A THROWAWAY AND SAYS SO. `queueWrite`'s own refusals are
 * about the shape of the id and the workspace, not about the moment — so asking
 * with a fixed valid id answers *would this basket be accepted*, which is
 * exactly the question the control needs and is not an assertion about what id
 * the real commit will carry.
 */
const PROBE: Stamp = {
  id: '00000000-0000-4000-8000-000000000000',
  now: '1970-01-01T00:00:00.000Z',
};

export function canCommit(b: Basketful): boolean {
  return commitOf(b, PROBE).ok;
}

// ----------------------------------------------------------------------------
// The gesture's own arithmetic — C3.6, and the half of it that has a right
// answer. Where the thumb is belongs to the screen; what counts as DONE does
// not.
// ----------------------------------------------------------------------------

/**
 * How far along the track the thumb must be released for the sale to commit.
 *
 * ⚠️ NOT 1.0, AND NOT A HALF. At `1.0` the gesture only completes if the thumb
 * reaches the very end, which on a 60 pt-tall track means the last few points
 * are a precision task performed at a counter; at `0.5` a basket is committed by
 * a thumb that brushed the bar and kept going, which is the failure C3.6's
 * *"commit is a slide, not a tap"* exists to prevent. **The gesture has to be
 * deliberate and it must not have to be accurate.**
 */
export const COMMIT_AT = 0.85;

/**
 * Where the thumb is, as a fraction of the track it can travel — clamped, and
 * `0` when there is no track to travel along.
 *
 * ⚠️ THE ZERO-WIDTH CASE IS THE FIRST FRAME AND NOT AN EDGE CASE. A view has no
 * measured width until it has laid out, so a slide rendered and dragged in the
 * same frame would divide by zero and hand `NaN` to a transform, which on the
 * native side is a silently un-animated view rather than an error.
 */
export function progressOf(x: number, travel: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(travel) || travel <= 0) return 0;
  if (x <= 0) return 0;
  if (x >= travel) return 1;
  return x / travel;
}

/**
 * How far a finger may move and still have been a TAP rather than a drag.
 *
 * ⚠️⚠️ THE TRACK IS BOTH, RULED BY THE OWNER 2026-09-24 — *"Let's make the
 * carrito able to open by tapping the slider as well."* So one touch has two
 * readings and this is the number that separates them.
 *
 * ⚠️ IT IS SMALL ON PURPOSE. A generous slop would turn the beginning of an
 * abandoned drag into *open the basket*, which is a screen change under a thumb
 * that was trying to sell something. Four points is about the jitter of a
 * finger that did not mean to move at all.
 */
export const TAP_SLOP = 4;

/** Was this release a tap — the gesture that OPENS rather than commits? */
export function releaseTaps(dx: number): boolean {
  return Number.isFinite(dx) && Math.abs(dx) <= TAP_SLOP;
}

/** Was this release a commit? */
export function releaseCommits(x: number, travel: number): boolean {
  return progressOf(x, travel) >= COMMIT_AT;
}
