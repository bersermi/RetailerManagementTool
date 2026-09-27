// ============================================================================
// THE DOCUMENT THAT HAS NOT BEEN SENT YET. Plan task `5h-ii-c`, and the pure
// half of it — §2.11's boundary, `R12`, `R13`. `@/offline/useUnsent` is the half
// that opens the queue; nothing in this file touches SQLite, a network or a
// clock it was not handed.
//
// ⚠️⚠️ WHY THIS ROW EXISTS AT ALL, MEASURED RATHER THAN ARGUED. `Lo último`
// (`5h-ii-a`) reads `purchase` and `sale` over HTTP, and a write still in the
// outbox has NO ROW IN THE DATABASE — so a delivery keyed with no signal was not
// on the one screen built for finding it. Worse: `useDocuments` asks anyway, the
// read fails, and `documentsLine` answers the `ES.api` failure sentence, so the
// screen was a spinner over *could not connect* with nothing on it at all. The
// pilot store is offline half the day ([[pilot-store-is-offline-a-lot]]), which
// makes that the ORDINARY case and not the edge one.
//
// ⚠️⚠️ AND THE SECOND-ORDER FAILURE IS THE EXPENSIVE ONE: she cannot find the
// delivery she just keyed, so she keys it again. Two rows in the queue with two
// client ids, both land, and the shop has two deliveries — `record_purchase`'s
// idempotency is by ID and cannot help, because these are genuinely two
// documents. **The invisibility is what manufactures the duplicate.**
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ RULED BY THE OWNER 2026-09-26, AND IT IS THE QUESTION `5h-i` PUT TO HIM
// TWICE AND NEVER GOT AN ANSWER TO
// ----------------------------------------------------------------------------
// *Should she be able to fix a delivery while it is still queued, or wait until
// it lands?* — **she fixes it now**, and the row appears in the list marked as
// not yet sent with the same two controls `5h-ii-b` shipped. His second ruling
// the same day answers who may: **anybody signed in on the phone the row is
// sitting on.**
//
// ⚠️⚠️ THE HONEST DIFFERENCE, WHICH WAS PUT TO HIM BEFORE HE RULED: THIS IS NOT
// A VOID AND IT LEAVES NOTHING BEHIND. `void_transaction` writes a mirror-image
// document, so a corrected delivery leaves TWO rows in the ledger for ever.
// Dropping a queued write leaves **no trace that she ever keyed it** — which is
// correct rather than a loss, because as far as the shop is concerned it never
// happened, exactly like backing out of the cart before sliding. It is named
// here because it is the one thing in this row that a reader would otherwise
// have to infer.
//
// ⚠️ SO THERE IS NOTHING TO INVALIDATE. `staleAfterVoid` exists because a void
// changes what the server would answer; a drop changes nothing on the server, so
// this module has no counterpart to it and `@/offline/useUnsent` invalidates no
// cache. Saying so is cheaper than a reader wondering which keys were missed.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ IT PRODUCES A `ShopDocument` AND THAT IS THE WHOLE DESIGN
// ----------------------------------------------------------------------------
// A queued write and a landed one are the same document seen from two sides, so
// this module hands the screen the type it already draws. Three things follow,
// and each of them would otherwise have been a second implementation:
//
//   * `Documento` in `documentos.tsx` renders an unsent row with no new branch.
//   * `prefillOf` (`@/api/corrections`) rebuilds the cart from an unsent row
//     **unchanged** — including its buy-side prices, which round-trip exactly
//     because the queue stores the very string `record_purchase` would take.
//   * `mayCorrect` answers `true` for an unsent row **by construction**, because
//     `createdBy` is `null` and that function fails open on a document whose
//     author it does not know. ⚠️ That is the owner's ruling satisfied by the
//     data rather than by a special case, and `app/test/unsent.test.ts` pins it
//     so a later tightening of `mayCorrect` cannot quietly fence this list.
//
// ⚠️ THE ARITHMETIC IS BORROWED AND NOT RE-SPELLED. `writeCentavos`, `lineCentavos`
// and `baseUnits` (`@/offline/deadLetters`, `5c-iv-b`) already price a queued
// payload to the centavo with the server's own rounding; `lineQuantity` and
// `shownAmount` (`@/api/documents`, exported for this row) already say how a
// quantity and a peso figure are written on this screen. **Every number and every
// string here comes from a function that was already under test.**
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT THIS FILE DELIBERATELY DOES NOT HOLD
// ----------------------------------------------------------------------------
// The FENCE. `droppable` below is the screen's reading of it; the enforcement is
// one SQL predicate in `@/lib/outboxDb`'s `drop`, bound to the same
// `DROPPABLE_STATE` constant. A read-then-delete has a window the drain can walk
// through — see that function — so the client's opinion here may never be the
// thing that decides.
// ============================================================================

import { isoDay } from '@/api/catalog';
import type { CatalogEntry } from '@/api/catalog';
import {
  causeOf,
  lineQuantity,
  shownAmount,
  type DocumentKind,
  type DocumentLine,
  type ShopDocument,
} from '@/api/documents';
import { DROPPABLE_STATE, isWritePayload, type OutboxState, type QueuedWrite } from '@/api/outbox';
import type { Provider } from '@/api/providers';
import { WASTE_REASON_KEY, isWasteReason, reasonLabel } from '@/api/waste';
import { PRICE_KEY, baseUnits, lineCentavos, writeCentavos, type UnitFactors } from '@/offline/deadLetters';
import { ES } from '@/strings';

/**
 * The states `Lo último` shows, and the one it does not.
 *
 * ⚠️⚠️ `dead` IS ABSENT ON PURPOSE AND IT IS NOT A GAP. A permanently rejected
 * write already has a surface — `DeadLetterBanner` on Inicio, with the peso
 * figure a manager needs and the dismissal rule C11.9 asked for — and §2.6 says
 * replay is ours by hand. Drawing it a second time in this list, under two
 * controls that must both refuse it, is furniture that teaches a shopkeeper the
 * buttons sometimes lie.
 *
 * ⚠️ `flushing` IS PRESENT, WHICH IS THE OTHER HALF OF THAT ARGUMENT. It is the
 * row she keyed a second before the signal came back: it is about to land, she
 * has every reason to expect to see it, and the fence refuses it in words if she
 * taps. **The list hides only the case that is settled**, which is `mayCorrect`'s
 * own posture one module over.
 */
export const UNSENT_STATES: readonly OutboxState[] = ['pending', 'flushing'];

/**
 * May a shopkeeper take this row out of the queue?
 *
 * ⚠️⚠️ IT IS THE SENTENCE'S RULE AND NEVER THE FENCE — see this file's header and
 * `drop`. The screen asks it so an unsent row that is already in the air can be
 * refused with words rather than with a confirmation that did nothing; the
 * statement asks the database, atomically, because the drain can claim a row
 * between a tap and a delete.
 */
export function droppable(write: QueuedWrite): boolean {
  return write.state === DROPPABLE_STATE;
}

/** Everything the unsent list is built from. */
export interface UnsentInput {
  /** `readQueue`'s answer, whole — this module does the filtering. */
  readonly queue: readonly QueuedWrite[];
  readonly kind: DocumentKind;
  /** `useUnitFactors()`. Without it a line has a name and no figure. */
  readonly factors: UnitFactors;
  /** `useCatalog().entries`, for a line's product name. */
  readonly entries: readonly CatalogEntry[];
  /** `useProviders().providers`, for a delivery's counterparty. */
  readonly providers: readonly Provider[];
  /**
   * ⚠️⚠️ THE DOCUMENTS THE SERVER ALREADY ANSWERED WITH, AND THIS IS THE DEDUPE.
   * A row leaves the queue when it lands (`advance` has no `sent` state), but
   * there is a window where it has landed and `forget` has not run yet — a
   * `flushing` row whose RPC succeeded. **The client uuid IS the server row's
   * id**, so the same document would appear twice in one list. Comparing ids
   * costs one `Set` and cannot be got wrong; re-deriving *has this landed* from a
   * state or a timestamp could.
   */
  readonly landed: readonly ShopDocument[];
}

/** An empty list, frozen — a shared mutable default is a shared bug. */
export const NOTHING_UNSENT: readonly ShopDocument[] = Object.freeze(
  [],
) as readonly ShopDocument[];

/**
 * The unsent documents of one kind, newest first.
 *
 * ⚠️⚠️ NEWEST FIRST, THE SAME WAY AND FOR THE SAME REASON AS THE SERVER LIST —
 * `DOCUMENTS_ORDER_ASCENDING` is `false` and `DOCUMENTS_TIEBREAK` is the id. The
 * queue's own read (`readQueue`) is OLDEST first, because a drain must send in
 * the order things happened; a list a person reads is the other way round, and
 * two documents queued in the same millisecond are ordered by id so the answer is
 * total rather than merely sorted ([[assert-against-a-calendar-not-the-array]]).
 *
 * ⚠️⚠️ ~~`waste` AND `transfer` ARE DROPPED BY THE KIND FILTER~~ — **`waste` IS NOW
 * DRAWN, AND THIS IS THE GAP `5h-ii-c` NAMED CLOSING EXACTLY WHERE IT SAID IT
 * WOULD**: *"a queued waste is therefore invisible here… it closes when `6a` gets
 * a list of its own."* `DocumentKind` gained `waste` in `6a-ii-a`, so **the kind
 * filter below admits it with no edit at all** — which is what the comparison
 * being a comparison rather than a guard bought.
 *
 * ⚠️ `transfer` IS STILL DROPPED, by the same one comparison and for its own
 * reason: a transfer between two of a shop's own stores is not a document with a
 * counterparty or a value (`0020`, and `PRICE_KEY.transfer` is `null`), and it has
 * no screen to be corrected from.
 *
 * ⚠️⚠️ AND THE REASON THIS MATTERED IS WORTH KEEPING: a shopkeeper who keys a
 * write-off with no signal and then cannot find it keys it again. `record_waste`
 * is idempotent on the client uuid, and that cannot help — two taps mint two
 * uuids, so they are genuinely two write-offs and the ledger is right to keep
 * both.
 *
 * ⚠️ A ROW WHOSE `queuedAt` IS NOT AN INSTANT IS DROPPED, which is `documentsFrom`'s
 * own rule for `occurred_at`: a document with no day cannot be placed in a list
 * ordered by day, and rendering `NaN` at a counter is worse than one row missing
 * from a screen whose other surface — the queue itself — still holds it.
 */
export function unsentDocuments(input: UnsentInput): readonly ShopDocument[] {
  const already = new Set(input.landed.map((one) => one.id));
  const named = new Map<string, Provider>();
  for (const one of input.providers) named.set(one.id, one);
  const products = new Map<string, string>();
  for (const one of input.entries) products.set(one.id, one.name);

  const out: ShopDocument[] = [];
  for (const write of input.queue) {
    if (!UNSENT_STATES.includes(write.state)) continue;
    // ⚠️⚠️ ONE COMPARISON DOING TWO JOBS, AND THE SECOND OF THEM IS WHY THIS LINE
    // IS NOT A `isDocumentKind` GUARD. It keeps each kind to its own tab —
    // `Compras` must not carry a queued sale — **and** it excludes `waste` and
    // `transfer` by construction, because neither can ever equal a `DocumentKind`.
    // ⚠️ A separate guard for the second job would be a branch nothing could
    // reach, and a dead branch nobody names is a dead branch somebody revives.
    // ⚠️⚠️ **THE FIRST JOB WAS MISSING FROM THE FIRST DRAFT OF THIS FUNCTION AND
    // `app/test/unsent.test.ts` CAUGHT IT**: the kind was narrowed and never
    // compared, so both tabs showed both kinds. Nothing else in this repository
    // could have seen that — there is no server read to disagree with.
    if (write.kind !== input.kind) continue;
    if (already.has(write.id)) continue;

    const day = dayOf(write.queuedAt);
    if (day === null) continue;

    const providerId = providerIdOf(write);
    const centavos = writeCentavos(write, input.factors);
    const lines = linesOf(write, input.factors, products);
    // ⚠️ THE CAUSE OF A QUEUED WRITE-OFF, WHEN ITS LINES AGREE — the same rule
    // `causeOf` applies to a landed one, and it is read off the lines this
    // function has just built rather than off the payload a second time.
    const cause = causeOf(write.kind, lines);

    out.push({
      id: write.id,
      kind: write.kind,
      at: write.queuedAt,
      day,
      counterparty: counterpartyOf(providerId, named),
      providerId,
      cause: cause === null ? null : reasonLabel(cause),
      // ⚠️⚠️ AND THE WIRE VALUE BESIDE IT, `6a-ii-b`. It is what `prefillOf` puts
      // back on the waste basket when she corrects a note that has not been sent
      // — **the one path where the cause has never been near a server**, so if
      // this were the label rather than the value the re-recorded write-off would
      // be a dead letter rather than an error she could see.
      causeValue: cause,
      // ⚠️⚠️ `null`, AND IT IS THE OWNER'S RULING RATHER THAN A MISSING FIELD.
      // The outbox records no author at all — `QueuedWrite` is an id, a
      // workspace, a kind, a payload, a state, an attempt count and an instant —
      // so there is nothing to compare `auth.uid()` with. He ruled on
      // 2026-09-26 that anybody signed in on the phone the row is sitting on may
      // fix it, and `mayCorrect` fails open on an unknown author, so **the
      // ruling holds by construction and not by a branch.** Storing one would be
      // a device SQLite v3 and is available if he ever wants the fence.
      createdBy: null,
      // ⚠️⚠️ A QUEUED WRITE-OFF SHOWS NO PESO FIGURE EITHER, AND THE TWO LISTS
      // HAVE TO AGREE OR THE SAME DOCUMENT CHANGES SHAPE WHEN IT LANDS. The
      // arithmetic differs — `writeCentavos` reads the payload where
      // `documentsFrom` reads `total_net` — **and the withholding must not**,
      // which is `shownAmount`'s own argument one module over. Área 9's ruling,
      // see `DOCUMENTS_WASTE_HEAD_COLUMNS`.
      amount: write.kind === 'waste' ? null : shownAmount(centavos),
      grossCentavos: write.kind === 'waste' ? null : centavos,
      lines,
    });
  }

  return out.sort(newestFirst);
}

/**
 * ⚠️ THE COMPARATOR IS TOTAL AND NOT MERELY DESCENDING. Two documents keyed in
 * the same millisecond — one basket committed twice, which is precisely the
 * duplicate this screen exists to catch — would otherwise fall in whatever order
 * SQLite returned them, and a list that reshuffles between two looks is one a
 * shopkeeper stops trusting. The id is the tiebreak `DOCUMENTS_TIEBREAK` already
 * chose for the server list.
 */
function newestFirst(a: ShopDocument, b: ShopDocument): number {
  if (a.at !== b.at) return a.at < b.at ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

/**
 * The DEVICE's own calendar day for the instant the row was queued.
 *
 * ⚠️⚠️ `queuedAt` IS THE RIGHT INSTANT AND `Date.now()` WOULD BE THE WRONG ONE,
 * which is the same decision `@/api/flush` already made on the way out: an
 * offline write that reaches the server with no `occurred_at` is stamped at the
 * moment of the FLUSH, so a delivery keyed at 09:00 and drained at 14:00 would
 * count on the wrong day. `draftOf` deliberately sends no `occurred_at` and the
 * queue's own `queuedAt` is what fills it — so this is the same answer the ledger
 * will hold once the row lands, and the day does not move when it does.
 *
 * ⚠️ `isoDay` AND NOT `slice(0, 10)`, which is the UTC day and is the defect
 * `5g-iii-b` fixed on the `Costos` chart: after 18:00 in a UTC−6 shop the two
 * disagree, and `today.ts` settles that this app means the device's day.
 */
function dayOf(at: string): string | null {
  if (typeof at !== 'string' || at === '') return null;
  const when = new Date(at);
  if (!Number.isFinite(when.getTime())) return null;
  return isoDay(when);
}

/**
 * Who the shop is buying from, as a word — or `null`, which is what a sale has.
 *
 * ⚠️ IT IS `counterpartyOf`'s RULE FROM `@/api/documents`, KEPT: the generic
 * provider reads *compra directa* because `Genérico` is a schema word and not
 * something a shopkeeper says, and a provider id this phone cannot resolve reads
 * `null` rather than a uuid — the directory may simply not have arrived, which on
 * the phone this list is FOR is the likely case.
 */
function counterpartyOf(
  providerId: string | null,
  named: Map<string, Provider>,
): string | null {
  if (providerId === null) return null;
  const provider = named.get(providerId);
  if (provider === undefined) return null;
  return provider.isGeneric ? ES.costs.generic : provider.name;
}

/**
 * The supplier's id, off the payload.
 *
 * ⚠️ IT IS READ FROM THE PAYLOAD AND NOT FROM THE KIND. `draftOf` forks on kind
 * so only a purchase carries `provider_id` at all — a sale's payload has no such
 * key — which means an absent one is a SALE and a present-but-unreadable one is a
 * corrupt row. Both answer `null`, and `prefillOf` files the re-recorded delivery
 * against the same supplier when it is there.
 */
function providerIdOf(write: QueuedWrite): string | null {
  const id = write.payload.provider_id;
  return typeof id === 'string' && id !== '' ? id : null;
}

/**
 * One queued document's lines, ready to draw.
 *
 * ⚠️ AN ABSENT OR EMPTY `lines` IS AN EMPTY LIST AND NEVER A THROW. Every
 * `record_*` refuses an empty `p_lines` and `draftOf` refuses an empty cart, so
 * nothing in this app can queue one — this is the branch that shows a document
 * with no rows rather than a white screen in a shop, which is `linesOf`'s own
 * argument in `@/api/documents`.
 */
function linesOf(
  write: QueuedWrite,
  factors: UnitFactors,
  products: Map<string, string>,
): readonly DocumentLine[] {
  const lines = write.payload.lines;
  if (!Array.isArray(lines)) return [];
  return lines.map((line, at) => lineOf(write, line, at, factors, products));
}

/**
 * One line.
 *
 * ⚠️⚠️ THE `id` IS SYNTHESISED AND IS A RENDERER'S KEY AND NOTHING ELSE. A landed
 * line has a uuid of its own because `record_purchase` minted one; an unsent line
 * does not exist yet and has none, so there is no id to carry and inventing a
 * uuid here would be a value that looks like the ledger's and is not. The
 * document's id with the line's position appended is unique within the list,
 * stable across re-reads of the same queue, and obviously not a database key.
 *
 * ⚠️⚠️ `perBase` IS THE BUY SIDE'S ONLY AND IT ROUND-TRIPS EXACTLY. The queue
 * stores the very string `record_purchase` takes — `unit_price_net_per_base`,
 * written by `lineSent` — so handing it back to `setPrice('buy', …)` is the same
 * digits and not a re-derivation. ⚠️ **On a SALE it is `null`**, because the
 * payload carries `unit_price_gross_per_base` and this phone holds no net at all;
 * `prefillOf` reads `perBase` on a purchase only and re-prices a sale at the
 * shelf, which is the decision `5h-ii-b` reported to the owner and is unchanged
 * here.
 *
 * ⚠️ `base` IS VALIDATED AND NOT MERELY CONVERTED — an integer greater than zero,
 * which is `baseOf`'s contract in `@/api/documents`. `prefillOf` DROPS a line
 * whose base is `null` and counts it, so a quantity this phone cannot convert
 * exactly becomes a short cart she can see rather than a wrong number in the
 * ledger.
 */
function lineOf(
  write: QueuedWrite,
  line: unknown,
  at: number,
  factors: UnitFactors,
  products: Map<string, string>,
): DocumentLine {
  const fields = isWritePayload(line) ? line : {};
  const variantId = text(fields.variant_id);
  const name = variantId === '' ? undefined : products.get(variantId);
  const base = baseUnits(fields, factors);

  return {
    id: `${write.id}:${at}`,
    variantId,
    // ⚠️ A NAME THIS PHONE CANNOT RESOLVE IS `unknownProduct` AND THE LINE STILL
    // SHOWS, which is `lineOf`'s rule in `@/api/documents`. ⚠️⚠️ AND IT IS THE
    // LIKELY CASE RATHER THAN THE RARE ONE HERE: `QueryProvider` persists
    // nothing, so a phone restarted with no signal has an EMPTY catalog cache and
    // can price this delivery without being able to name a single row of it. The
    // amount is what she recognises, and it survives.
    name: name === undefined || name === '' ? ES.documents.unknownProduct : name,
    quantity: lineQuantity(text(fields.qty_display), text(fields.qty_display_unit)),
    // ⚠️ `null` ON A WRITE-OFF — no money is shown for that kind, which is not
    // the same silence as a figure this phone could not read. See
    // `DocumentLine.amount` in `@/api/documents`.
    amount: write.kind === 'waste' ? null : shownAmount(lineCentavos(write.kind, fields, factors)),
    base: base !== null && Number.isInteger(base) && base > 0 ? base : null,
    // ⚠️⚠️ THE CAUSE COMES OFF THE PAYLOAD UNDER `WASTE_REASON_KEY` — `0019`'s own
    // spelling and `@/api/waste`'s constant, never the literal. **A queued cause
    // is the same wire value the server would have stored**, because `lineSent`
    // put it there, so `isWasteReason` and `reasonLabel` are the identical pair
    // `@/api/documents` uses on a landed line and the two lists cannot drift.
    // ⚠️ THE VALUE AND THE WORD, ONE GUARD — `lineOf`'s shape in
    // `@/api/documents`, kept identical so a queued line and a landed one
    // cannot disagree about whether this app knows the cause.
    reasonValue: isWasteReason(fields[WASTE_REASON_KEY]) ? fields[WASTE_REASON_KEY] : null,
    reason: isWasteReason(fields[WASTE_REASON_KEY])
      ? reasonLabel(fields[WASTE_REASON_KEY])
      : null,
    perBase: write.kind === 'purchase' ? nonEmpty(fields[PRICE_KEY.purchase]) : null,
  };
}

/** A payload field as the string it must be, or `''`. */
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** A payload field as a non-empty string, or `null`. */
function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Which question the confirmation box asks.
 *
 * ⚠️⚠️ IT IS A FUNCTION HERE RATHER THAN A FOUR-WAY TERNARY IN THE SCREEN, which
 * is `documentsLine`'s and `costNote`'s arrangement and the reason `5g-ii`'s
 * `unreadable` bug was fixable in one place. The axis this row adds is *has it
 * been sent*, and it changes what the sentence is allowed to PROMISE: a voided
 * note stays in the ledger behind a mirror image of itself, an unsent one was
 * never recorded at all. **Leaving that choice in JSX is how the wrong half gets
 * shown on the day somebody reorders the branches.**
 */
export function correctionAsk(how: 'corregir' | 'eliminar', unsent: boolean): string {
  if (unsent) {
    return how === 'corregir' ? ES.documents.unsentCorrectAsk : ES.documents.unsentRemoveAsk;
  }
  return how === 'corregir' ? ES.documents.correctAsk : ES.documents.removeAsk;
}
