// ============================================================================
// A PRICE SET ON THE PHONE, AND HOW IT REACHES THE SHOP. Plan task `8i`.
//
// The owner's ruling of 2026-11-01 (*"Yes, go with your recommendation"*): the
// owner or a manager sets or changes a price at the counter whether or not
// there is signal. The phone keeps it, shows it at once, and sends it when it
// can. If somebody changed that price in the meantime, theirs stays and hers is
// dropped, and nobody is told.
//
// ⚠️ ONE PATH, SIGNAL OR NOT. Every price goes through this queue, so the sheet
// never waits on the network and cannot look different offline — C10.3, the
// rule `@/api/outbox`'s header makes for a sale.
//
// ⚠️⚠️ IT IS NOT THE OUTBOX, AND THAT IS ON PURPOSE. The outbox's four kinds are
// the ledger's (`failed_write_kind_known`, `0024`), and a ledger write the
// server refuses is reported to `record_failed_write` — which refuses any other
// kind, and a refused report stops the drain. A price in the outbox would hold
// every sale behind it. A price is not a document either: nothing on a shelf
// moved, and the sale it was set for carries its own price (`0016`:
// `record_sale` never reads `price_list`). So a price the shop refuses for good
// is simply dropped. It waits in its own table beside the outbox
// (`@/lib/outboxDb`) and is drained after it (`@/lib/flushRunner`).
//
// WHAT `set_shelf_price` (`0074`) IS TOLD: the phone's id for the new row, the
// product, the price per base unit, the phone's day, the scope — the store
// whose own price the phone showed, or NULL for the shop-wide one — and the
// price the phone showed. That last one is what lets the database answer
// *somebody changed it since*: it applies the change only while the price in
// force on her day is the one she saw, and nothing changed after that day.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import type { CatalogEntry, PriceRow, UnitFactors, VariantRow } from '@/api/catalog';
import { parsePesos, priceOmitted, pricePerBase } from '@/api/catalogWrite';
import { classify } from '@/api/deadletter';
import type { FlushReport, FlushStop, Flusher } from '@/api/flush';
import { normalizeUuid, type Stamp } from '@/api/outbox';

/** `0074`'s function, written once (`R13`). */
export const SET_SHELF_PRICE = 'set_shelf_price';

/**
 * The arguments `0074` declares, in its order (`R13`). ⚠️ PostgREST finds a
 * function BY these names: one misspelt is `PGRST202`, a function not found.
 */
export const SHELF_PRICE_ARGUMENTS = [
  'p_id',
  'p_variant_id',
  'p_price_per_base',
  'p_day',
  'p_location_id',
  'p_seen_price',
] as const;

/**
 * A waiting price is waiting, or on its way. ⚠️ There is no `dead`: a price the
 * shop refuses for good leaves the phone (see the header).
 */
export const PRICE_STATES = ['pending', 'flushing'] as const;
export type PriceState = (typeof PRICE_STATES)[number];

export function isPriceState(value: unknown): value is PriceState {
  return typeof value === 'string' && (PRICE_STATES as readonly string[]).includes(value);
}

/** What the sheet hands the queue. */
export interface PriceDraft {
  readonly workspaceId: string;
  readonly variantId: string;
  /** The scope: the store whose own price she changed, or `null` for the shop-wide one. */
  readonly locationId: string | null;
  /** `price_list.price_per_base`, a decimal string at scale 6. */
  readonly pricePerBase: string;
  /** The phone's day when she typed it, `YYYY-MM-DD` (`isoDay`). */
  readonly day: string;
  /** The price per base the phone showed for that scope, or `null` when none. */
  readonly seen: string | null;
}

/** One price waiting on the phone. */
export interface QueuedPrice extends PriceDraft {
  /** ⚠️ The new `price_list` row's id, made once on the phone: a retry is the same row. */
  readonly id: string;
  readonly state: PriceState;
  /** How many times something has claimed it, not how many times it failed. */
  readonly attempts: number;
  /** When she typed it, ISO-8601, the phone's clock. */
  readonly queuedAt: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Is this a decimal `price_list` would store — at most six places, not negative? */
function isPrice(text: string): boolean {
  try {
    return parseDecimal(text, SCALE.unitPrice) >= 0;
  } catch {
    return false;
  }
}

/**
 * A draft becomes a waiting price, or `null`.
 *
 * ⚠️ A `null` IS A PROGRAMMING ERROR, NEVER A SHOPKEEPER'S PROBLEM — the sheet
 * builds the draft out of the catalog and `pricePlan`, so nothing she types can
 * reach here malformed. It is refused rather than queued because a waiting row
 * nobody could ever send would sit on the phone for good.
 */
export function queuePrice(draft: PriceDraft, stamp: Stamp): QueuedPrice | null {
  const id = normalizeUuid(stamp.id);
  const workspaceId = normalizeUuid(draft.workspaceId);
  const variantId = normalizeUuid(draft.variantId);
  const locationId = draft.locationId === null ? null : normalizeUuid(draft.locationId);
  if (id === null || workspaceId === null || variantId === null) return null;
  if (draft.locationId !== null && locationId === null) return null;
  if (!isPrice(draft.pricePerBase)) return null;
  if (draft.seen !== null && !isPrice(draft.seen)) return null;
  if (!DAY.test(draft.day)) return null;
  return {
    id,
    workspaceId,
    variantId,
    locationId,
    pricePerBase: draft.pricePerBase,
    day: draft.day,
    seen: draft.seen,
    state: 'pending',
    attempts: 0,
    queuedAt: stamp.now,
  };
}

/** Is this row, read back off the phone, one a flush could send? */
export function isQueuedPrice(value: QueuedPrice): boolean {
  return (
    queuePrice(value, { id: value.id, now: value.queuedAt }) !== null &&
    isPriceState(value.state) &&
    Number.isInteger(value.attempts) &&
    value.attempts >= 0
  );
}

// ----------------------------------------------------------------------------
// WHAT THE SHEET DOES WITH WHAT SHE TYPED
// ----------------------------------------------------------------------------

/** The part of a catalog row the sheet reads. */
export type PricedEntry = Pick<CatalogEntry, 'id' | 'priceUnit' | 'perBase' | 'priceScope'>;

export type PricePlan =
  /** Nothing typed: the sheet closes and nothing changes. */
  | { readonly kind: 'empty' }
  /** Not a price: the sheet says so (`ES.catalog.editIssues.priceUnreadable`). */
  | { readonly kind: 'unreadable' }
  /** The price it already has: nothing to send. */
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'set'; readonly draft: PriceDraft };

/**
 * One tap of *Guardar* on the price sheet.
 *
 * ⚠️ THE SCOPE AND WHAT SHE SAW ARE THE CATALOG ROW'S — the price on screen,
 * which includes a price of hers still waiting to leave the phone. So a second
 * change while the first waits is judged against the first, and the two land in
 * order (`0074`'s suite, check 5.1). A product with no price at all is priced
 * shop-wide (`5e-i`'s decision A).
 *
 * ⚠️ `today` COMES IN (`R3`): `isoDay` in `@/api/catalog` owns the phone's day.
 */
export function pricePlan(input: {
  readonly workspaceId: string;
  readonly entry: PricedEntry;
  readonly typed: string;
  readonly factors: UnitFactors;
  readonly today: string;
}): PricePlan {
  if (priceOmitted(input.typed)) return { kind: 'empty' };
  const centavos = parsePesos(input.typed);
  const perBase =
    centavos === null ? null : pricePerBase(centavos, input.factors[input.entry.priceUnit] ?? '');
  if (perBase === null) return { kind: 'unreadable' };
  if (input.entry.perBase !== null && samePrice(input.entry.perBase, perBase)) {
    return { kind: 'unchanged' };
  }
  return {
    kind: 'set',
    draft: {
      workspaceId: input.workspaceId,
      variantId: input.entry.id,
      locationId: input.entry.priceScope,
      pricePerBase: perBase,
      day: input.today,
      seen: input.entry.perBase,
    },
  };
}

/** Two decimal strings, compared as numbers (`17.000000` is `17`). */
function samePrice(a: string, b: string): boolean {
  try {
    return parseDecimal(a, SCALE.unitPrice) === parseDecimal(b, SCALE.unitPrice);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// WHAT IS SENT, AND WHAT CAME BACK
// ----------------------------------------------------------------------------

/** The arguments one waiting price is sent with — `SHELF_PRICE_ARGUMENTS`, in order. */
export function priceArgs(price: QueuedPrice): Readonly<Record<string, unknown>> {
  return {
    p_id: price.id,
    p_variant_id: price.variantId,
    p_price_per_base: price.pricePerBase,
    p_day: price.day,
    p_location_id: price.locationId,
    p_seen_price: price.seen,
  };
}

/** What the shop did with a price. */
export type PriceOutcome =
  /** The shop's price is hers now (a retry of one it already had included). */
  | 'applied'
  /** Somebody changed it since she looked: theirs stays. */
  | 'superseded'
  /** The shop refused it for good — she may no longer price, as a rule. */
  | 'refused';

export type PriceReply =
  | { readonly read: true; readonly outcome: 'applied' | 'superseded' }
  | { readonly read: false };

/**
 * `0074`'s answer — `{"applied": …, "already_recorded": …}` — or `read: false`.
 *
 * ⚠️ AN ANSWER IT CANNOT READ IS A RETRY, `landedFrom`'s rule in `@/api/flush`:
 * the id makes a second send free, and reading an odd reply as a success is
 * the only version of this that loses a price.
 */
export function priceReplyFrom(data: unknown): PriceReply {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { read: false };
  const row = data as Record<string, unknown>;
  if (typeof row.applied !== 'boolean' || typeof row.already_recorded !== 'boolean') {
    return { read: false };
  }
  return { read: true, outcome: row.applied ? 'applied' : 'superseded' };
}

/**
 * Will no retry ever work? The outbox's own allow-list (`@/api/deadletter`),
 * so the two queues agree about what *for good* means.
 *
 * ⚠️ Everything else is a retry, `PGRST202` included: a build and a database
 * that disagree about the function are fixed by the next deploy, and dropping
 * prices meanwhile would lose them on every phone at once.
 */
export function refusedForGood(error: unknown): boolean {
  return classify(error).permanent;
}

// ----------------------------------------------------------------------------
// WHAT THE PHONE SHOWS WHILE A PRICE WAITS
// ----------------------------------------------------------------------------

/**
 * The catalog read with this shop's waiting prices in it — the price she typed
 * is the price on screen, in Vender, the Carrito and Productos, from the moment
 * she typed it until the shop has it.
 *
 * ⚠️ IT REPLACES THE SCOPE'S ROW AND NOTHING ELSE, so `priceFor` still decides
 * which row a store reads (its own beats the shop-wide one). Of several waiting
 * for one product and scope, the newest typed wins — the order they will land
 * in. ⚠️ Another shop's waiting prices are not this catalog's.
 *
 * ⚠️ NOTHING WAITING, NOTHING COPIED: the same array comes back, so a catalog
 * with no waiting price costs nothing.
 */
export function withWaitingPrices(
  rows: readonly VariantRow[] | null | undefined,
  waiting: readonly QueuedPrice[],
  workspaceId: string | null,
): readonly VariantRow[] | null | undefined {
  if (rows === null || rows === undefined || workspaceId === null) return rows;
  const mine = priceDrainOrder(waiting.filter((p) => p.workspaceId === workspaceId), false);
  if (mine.length === 0) return rows;
  const latest = new Map<string, QueuedPrice>();
  for (const price of mine) latest.set(`${price.variantId}|${price.locationId ?? ''}`, price);
  return rows.map((row) => {
    let prices: readonly PriceRow[] | null = row.price_list;
    let touched = false;
    for (const price of latest.values()) {
      if (price.variantId !== row.id) continue;
      prices = withRow(prices, price);
      touched = true;
    }
    return touched ? { ...row, price_list: prices } : row;
  });
}

/** One variant's rows with the scope's row replaced by this price. */
function withRow(prices: readonly PriceRow[] | null, price: QueuedPrice): readonly PriceRow[] {
  const others = (prices ?? []).filter((row) => row.location_id !== price.locationId);
  return [...others, { price_per_base: price.pricePerBase, location_id: price.locationId }];
}

/**
 * The cached catalog with one price the shop now has written in — called when
 * a price lands, so the screen never goes back to the old figure while the
 * catalog is read again (and keeps hers if that read fails).
 */
export function withLandedPrice(
  rows: readonly VariantRow[] | undefined,
  price: QueuedPrice,
): readonly VariantRow[] | undefined {
  if (rows === undefined) return rows;
  return rows.map((row) =>
    row.id === price.variantId ? { ...row, price_list: withRow(row.price_list, price) } : row,
  );
}

// ----------------------------------------------------------------------------
// THE DRAIN — oldest first, one at a time, a dropped price never blocks
// ----------------------------------------------------------------------------

/**
 * The order prices are sent in: oldest first, ties by id.
 *
 * ⚠️ OLDEST FIRST IS THE CHAIN. Two changes waiting for one product — $17 to
 * $20, then $20 to $22 — must land in that order, the second judged against
 * the first. `pendingOnly` is the drain's; the overlay reads both states.
 */
export function priceDrainOrder(
  waiting: readonly QueuedPrice[],
  pendingOnly = true,
): readonly QueuedPrice[] {
  return waiting
    .filter((p) => !pendingOnly || p.state === 'pending')
    .slice()
    .sort((a, b) => (a.queuedAt === b.queuedAt ? cmp(a.id, b.id) : cmp(a.queuedAt, b.queuedAt)));
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The five things a price drain needs and refuses to own (`@/lib/flushRunner` binds them). */
export interface PriceFlushPorts {
  readonly read: () => readonly QueuedPrice[];
  readonly settle: (id: string, state: PriceState, attempts: number) => void;
  /** The price left the phone. */
  readonly forget: (id: string) => void;
  /** One call of `set_shelf_price`. ⚠️ It THROWS on failure (`R12`). */
  readonly send: (args: Readonly<Record<string, unknown>>) => Promise<unknown>;
  /**
   * What the shop did with it. ⚠️ CALLED BEFORE `forget`, so the cached catalog
   * learns the shop's price while the waiting one still shows the same figure —
   * never a frame of the old price in between.
   */
  readonly settled: (price: QueuedPrice, outcome: PriceOutcome) => void;
}

export interface PriceFlushReport {
  readonly stop: FlushStop;
  /** Prices the shop now has. */
  readonly landed: number;
  /** Prices that lost to a newer one. */
  readonly superseded: number;
  /** Prices refused for good. */
  readonly refused: number;
}

export interface PriceFlusher {
  readonly flush: () => Promise<PriceFlushReport>;
}

const BUSY: PriceFlushReport = { stop: 'busy', landed: 0, superseded: 0, refused: 0 };

/**
 * One drain over the waiting prices.
 *
 * ⚠️ SINGLE-FLIGHT, `createFlusher`'s rule: two drains would both claim one row.
 * ⚠️ IT STOPS AT THE FIRST FAILURE THAT MAY STILL SUCCEED — no signal, as a
 * rule, where every later price would fail the same way — and it carries on past
 * one that never will, because that one has left the phone.
 */
export function createPriceFlusher(ports: PriceFlushPorts): PriceFlusher {
  let inFlight: Promise<PriceFlushReport> | null = null;

  async function drain(): Promise<PriceFlushReport> {
    // A price left `flushing` by an app that was killed mid-send: the id makes
    // sending it again free.
    for (const price of ports.read()) {
      if (price.state === 'flushing') ports.settle(price.id, 'pending', price.attempts);
    }
    let landed = 0;
    let superseded = 0;
    let refused = 0;
    for (const price of priceDrainOrder(ports.read())) {
      const attempts = price.attempts + 1;
      ports.settle(price.id, 'flushing', attempts);
      let reply: PriceReply = { read: false };
      let forGood = false;
      try {
        reply = priceReplyFrom(await ports.send(priceArgs(price)));
      } catch (error) {
        forGood = refusedForGood(error);
      }
      const outcome: PriceOutcome | null = reply.read ? reply.outcome : forGood ? 'refused' : null;
      if (outcome !== null) {
        ports.settled(price, outcome);
        ports.forget(price.id);
        if (outcome === 'applied') landed += 1;
        else if (outcome === 'superseded') superseded += 1;
        else refused += 1;
        continue;
      }
      ports.settle(price.id, 'pending', attempts);
      return { stop: 'failed', landed, superseded, refused };
    }
    return { stop: 'drained', landed, superseded, refused };
  }

  return {
    flush(): Promise<PriceFlushReport> {
      if (inFlight !== null) return Promise.resolve(BUSY);
      const run = drain().finally(() => {
        inFlight = null;
      });
      inFlight = run;
      return run;
    },
  };
}

/**
 * The ledger's drain, then the prices' — one report for the monitor.
 *
 * ⚠️ THE LEDGER FIRST AND THE PRICES ALWAYS: a sale never waits behind a price,
 * and a price still gets its turn when a sale is stuck on something only a
 * deploy fixes. ⚠️ `failed` from either is `failed`, so the retry ladder runs
 * again; a price the shop now has counts as *landed* — the reconnect toast says
 * *Tus últimas operaciones ya se guardaron*, and a price is one of them.
 */
export function bothReports(ledger: FlushReport, prices: PriceFlushReport): FlushReport {
  const stop: FlushStop =
    ledger.stop === 'failed' || prices.stop === 'failed'
      ? 'failed'
      : ledger.stop === 'busy' && prices.stop === 'busy'
        ? 'busy'
        : 'drained';
  return { ...ledger, stop, landed: ledger.landed + prices.landed };
}

/**
 * The app's one drain: the ledger's flusher, then the prices'.
 *
 * ⚠️ SINGLE-FLIGHT AS A WHOLE, `createFlusher`'s rule one level up: a second
 * call while one runs is a no-op answering `busy`, not a second pass.
 */
export function bothFlushers(ledger: Flusher, prices: PriceFlusher): Flusher {
  let inFlight: Promise<FlushReport> | null = null;
  return {
    flush(): Promise<FlushReport> {
      if (inFlight !== null) {
        return Promise.resolve({
          stop: 'busy',
          recovered: 0,
          landed: 0,
          alreadyRecorded: 0,
          retried: 0,
          deadLettered: 0,
          downgraded: 0,
        });
      }
      const run = (async () => bothReports(await ledger.flush(), await prices.flush()))().finally(
        () => {
          inFlight = null;
        },
      );
      inFlight = run;
      return run;
    },
  };
}
