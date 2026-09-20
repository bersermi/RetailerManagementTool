// ============================================================================
// TRANSIENT AGAINST PERMANENT, AND THE DEAD LETTER A PERMANENT ONE BECOMES.
// Plan task 5c-iii, and the eleventh module of `src/api/` on the pure side of
// the boundary (ADR-035 §2.11, `R12`, `R13`). `@/api/outbox` decides what may
// be in the queue, `@/api/flush` decides what leaves it — this decides what
// leaves it for good.
//
// ⚠️⚠️ IT IS THE ONLY HALF OF `5c` THAT CHANGES THE LEDGER, AND WHAT IT COSTS
// IS WRITTEN INTO THE PLAN ROW RATHER THAN HIDDEN HERE: THE LEDGER CAN DIFFER
// FROM WHAT THE SHOPKEEPER TYPED, SILENTLY. `record_failed_write` downgrades
// the shelf so the balance matches what is physically there within seconds, and
// a downgrade reconciles QUANTITY ONLY — no revenue, no tax split, no FEFO
// batch attribution, therefore no cost basis. §2.6: *"stock stays true; margin
// goes quiet."* Nobody in the shop is told (C10.5), and that is the ruling, not
// an omission: the person at the counter can do nothing about it and §2.8 sends
// dead letters to the vendor. A session that adds a message here has undone it.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE CLASSIFICATION IS AN ALLOW-LIST OF PERMANENT CODES. EVERYTHING ELSE
// RETRIES, INCLUDING A CODE NOBODY HAS SEEN
// ----------------------------------------------------------------------------
// The two ways to be wrong are not symmetrical and the design is the asymmetry:
//
//   * A TRANSIENT failure dead-lettered is a sale downgraded that would have
//     arrived on its own — the ledger moves, the margin goes quiet, and nothing
//     tells anybody. Recovering it means a person running `replay_failed_write`
//     by hand (§2.6: *"replay is manual, never automatic"*).
//   * A PERMANENT failure retried forever is a sale that never lands and — the
//     drain stopping at the first failure (`5c-ii-a`, decision 1) — every write
//     behind it blocked. Bad, and LOSSLESS: the row is still on the phone, in
//     full, and `5c-iv`'s banner is about to count it.
//
// So the safe direction is to retry unless the failure has been positively
// identified, which is `landedFrom`'s rule in `@/api/flush` applied one level
// out: an unreadable reply is a retry there, and an unrecognised refusal is a
// retry here.
//
// ⚠️ AND WHAT MAKES THAT SAFE RATHER THAN MERELY CAUTIOUS: A DEAD LETTER LEAVES
// THE QUEUE. A permanent failure that IS recognised goes `dead`, the drain
// carries on to the next row, and the poison row stops blocking the shop's
// morning. That is the half of `5c-iii` the split's own table calls *"what
// unblocks the queue itself"*.
//
// ⚠️⚠️ THERE IS NO ATTEMPT CEILING, AND ITS ABSENCE IS A DECISION. "Dead-letter
// after N tries" is the obvious way to stop an unrecognised failure blocking
// the queue forever, and on THIS shop it is the wrong one: the pilot store is
// offline a lot, offline is the normal write path (§2.6), and a ceiling counts
// a week of no signal as a permanent rejection — downgrading a shelf that is
// perfectly fine because the wifi was out. A ceiling turns the commonest
// condition in the shop into the rarest and most expensive outcome.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ `42501` IS PERMANENT HERE AND MEANS THE OPPOSITE OF WHAT IT MEANS
// APP-WIDE, AND THAT IS MEASURED RATHER THAN ASSUMED
// ----------------------------------------------------------------------------
// §2.6's own table names it: *"`42501 location not accessible` after a
// membership change"* is THE example of a permanent failure. But `@/api/errors`
// maps `42501` app-wide to *"tu sesión se cerró"*, because a call made with no
// session hits a grant to `authenticated` and comes back the same way — and
// dead-lettering an expired session would downgrade the WHOLE QUEUE the first
// time a token went stale in a shop with no signal.
//
// The two are distinguishable on the wire and the distinction is what makes
// this entry safe: a refusal raised INSIDE the function reaches the client as
// `42501`, while an expired or unacceptable token never reaches the function at
// all — PostgREST answers `PGRST301` before the body runs. Assertion 5 of
// `docs/checks/5c-iii-dead-letter-contract.sh` drives both against a real
// database and reads the codes back, so the day that stops being true, the
// reason this line is here goes red instead of going quiet.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE THREE THAT LOOK PERMANENT AND ARE NOT, EACH FOR ITS OWN REASON
// ----------------------------------------------------------------------------
//   * `TD002` — *"not enough stock"* (`0017`, `0020`). It reads like the most
//     permanent refusal there is, and it is the most reliably SELF-CLEARING one
//     in the schema: both functions guard the availability check with
//     `if v_enforce and not v_offline`, and the flush sets `recorded_offline`
//     from `attempts > 1`. So the retry after a `TD002` skips the very check
//     that raised it and the sale lands in full. Dead-lettering it would
//     downgrade a sale the NEXT attempt was going to record properly.
//   * `PGRST202` — this app and the database disagree about an RPC's name or
//     arguments. Permanent for this binary and fixed by the next deploy, which
//     is exactly why it must not dead-letter: it would convert one bad release
//     into a silently downgraded ledger in every shop at once, and
//     `record_failed_write` may be equally unreachable anyway. `@/api/errors`
//     already calls this a developer's error and not a shopkeeper's.
//   * `XX000` (`internal_error`) — the *"should be impossible"* raises inside
//     `0016`–`0020`, e.g. the pricing query dropping a line. Ours, fixed by a
//     migration, same argument as above.
//
// ⚠️ `TD003` IS DELIBERATELY ABSENT FROM BOTH LISTS. It is `0025`/`0030`'s
// manager fence on a replay marker, and `@/api/flush` strips
// `replay_of_failed_write_id` from every payload by name — so no flush can
// reach it. Classifying an unreachable code would be a guess about a path that
// does not exist, and it falls to the default (retry) like anything else.
//
// ----------------------------------------------------------------------------
// ⚠️ WHAT THIS MODULE CANNOT DO, NAMED RATHER THAN LEFT TO BE FOUND
// ----------------------------------------------------------------------------
// If the MEMBERSHIP is gone — not the location access, the whole workspace —
// then `record_failed_write` refuses the report too, with `42501`, because its
// one deliberate exception is about the LOCATION and only the location (§2.6).
// The row then stays `pending` and retries forever, which is the safe failure
// above rather than a new one. There is no client-side fix: a person removed
// from a shop cannot write to it, and that is the fence working.
// ============================================================================

import { type QueuedWrite, type WriteKind } from '@/api/outbox';

/** `0024`'s function, written once (`R13`). */
export const RECORD_FAILED_WRITE = 'record_failed_write';

/**
 * The codes that mean **no retry will ever work**, each with the reason it is
 * on this list. ⚠️ ANYTHING NOT HERE IS A RETRY — see the header.
 *
 * ⚠️ THE VALUES ARE NOT SHOWN TO ANYBODY. `R4` keeps every Spanish word in
 * `src/strings.ts`, and C10.5 keeps this whole event off the shopkeeper's
 * screen; these exist so the suite can assert WHY a code is on the list, and so
 * that adding one without a reason is visibly a different kind of edit.
 */
export const PERMANENT_CODES: Readonly<Record<string, string>> = {
  // §2.6's own named example: a membership change between capture and flush.
  // Distinguished from the expired session by PGRST301 — see the header.
  '42501': 'the caller may no longer write at that location',
  // Every bad payload in 0016-0020: a variant deleted between capture and
  // flush, a unit that no longer resolves, a quantity that is not positive.
  '22023': 'the payload is not one this function will ever accept',
  // The cast that 0016's own comment says happens before any validation arm is
  // reached — a malformed uuid or a non-numeric quantity in a line.
  '22P02': 'a value in the payload is not the type the argument takes',
  // §2.6's "a constraint", spelled as the four Postgres actually raises.
  '23502': 'a not-null constraint refused the row',
  '23503': 'a foreign key refused the row — something it names is gone',
  '23505': 'a unique constraint refused the row',
  '23514': 'a check constraint refused the row',
  // ⚠️ THE ONLY CODE IN THE SCHEMA THAT NAMES ITS OWN HANDLING. 0016 raises it
  // with detail = 'This is not a retry. Dead-letter it (ADR-035 §2.6).'
  TD001: 'this id was already recorded with a different payload',
};

/**
 * The kinds `record_failed_write` DOWNGRADES, as against the kinds it merely
 * dead-letters (`0024`, amendment 2; ADR-035 §2.6 as amended 2026-09-05).
 *
 * ⚠️⚠️ THE CLIENT DOES NOT DECIDE THIS AND MUST NOT ACT AS IF IT DID — the
 * server reads `p_kind` and runs the downgrade or does not. It is written here
 * because `5c-iv`'s banner is a count and a PESO FIGURE, and a figure that
 * counted a dead-lettered purchase as stock removed would be describing a shelf
 * that still has the goods on it. The rule in one sentence: **downgrade the
 * kinds where the stock is gone and nobody will re-enter it.** A rejected
 * purchase leaves the delivery on the shelf with a manager holding the note
 * (§2.7), and an auto-upgrade would open a zero-cost lot and then DOUBLE the
 * shelf when Comprar records it properly.
 *
 * ⚠️ IT IS A CLAIM ABOUT THE APPLIED SCHEMA, so the instrument is not this file:
 * assertion 7 of `docs/checks/5c-iii-dead-letter-contract.sh` dead-letters a
 * sale and a purchase with the same variant, quantity and store, and reads the
 * movements back — `0024`'s own section-5 pair, driven from the client's side.
 */
export const DOWNGRADED_KINDS = ['sale', 'waste'] as const;

export function expectsDowngrade(kind: WriteKind): boolean {
  return (DOWNGRADED_KINDS as readonly string[]).includes(kind);
}

/** What a failed send turned out to be. */
export type Failure =
  /** Retry. The uuid makes it free (§2.6). */
  | { readonly permanent: false }
  /** Dead-letter it, under this code. */
  | {
      readonly permanent: true;
      readonly code: string;
      readonly detail: string | null;
    };

/**
 * A thrown error becomes a verdict.
 *
 * ⚠️ THE CODE COMES BACK OUT IN THE PERMANENT CASE, AND THAT IS A TYPE DOING A
 * JOB. `record_failed_write` takes `p_error_code` as `not null` with a
 * non-blank CHECK, so a report built from a failure with no code is a row the
 * database will refuse — and the only failures this returns `permanent` for are
 * the ones a code was read from. `reportArgs` therefore cannot be called
 * without one, rather than being trusted not to be.
 */
export function classify(error: unknown): Failure {
  if (typeof error !== 'object' || error === null) return { permanent: false };
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string' || !(code in PERMANENT_CODES)) return { permanent: false };
  return { permanent: true, code, detail: detailOf(error) };
}

/**
 * What the server said, as one line, or nothing.
 *
 * ⚠️ IT IS THE ONLY THING THAT EVER REACHES A HUMAN, AND THAT HUMAN IS THE
 * VENDOR. §2.8 puts dead letters with the operator of this system and not with
 * the merchant, and §2.6 says why it is worth keeping: *"the operator cannot
 * diagnose a `42501`, but whoever caused it can"* — so `message`, `details` and
 * `hint` are all kept. ⚠️ Trimmed to null when empty, because
 * `failed_write_error_detail_not_blank` refuses a blank string and would lose
 * the whole report over an empty field.
 */
function detailOf(error: unknown): string | null {
  const e = error as { message?: unknown; details?: unknown; hint?: unknown };
  const parts = [e.message, e.details, e.hint]
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter((x) => x !== '');
  const joined = parts.join(' — ');
  return joined === '' ? null : joined;
}

/**
 * The location this write moved stock at, or null.
 *
 * ⚠️⚠️ IT IS SENT EXPLICITLY RATHER THAN LEFT TO THE SERVER'S DEFAULT, AND A
 * TRANSFER IS WHY. `record_failed_write` defaults `p_location_id` out of
 * `payload->>'location_id'`, which a transfer's payload does not have — it
 * carries `from_location_id` and `to_location_id` (`0020`). A dead-lettered
 * transfer would therefore land with a NULL location, and §2.10's nightly check
 * reads `failed_write` BY WORKSPACE AND KIND to price unrecorded revenue: a row
 * it cannot attribute to a store is a row nobody can act on.
 *
 * ⚠️ THE ORIGIN AND NOT THE DESTINATION, because the origin is the store the
 * stock left and the only one that can be short.
 */
export function locationOf(payload: Readonly<Record<string, unknown>>): string | null {
  for (const key of ['location_id', 'from_location_id']) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

/**
 * The arguments one dead letter is reported with.
 *
 * ⚠️⚠️ THE PAYLOAD IS HANDED OVER UNTOUCHED, AND THAT IS THE WHOLE POINT OF THE
 * SHAPE `5c-i` CHOSE. `0024` decision 5 stores `failed_write.payload` as *"the
 * original call's arguments, keyed by argument name"* and `replay_failed_write`
 * (`0026`) re-runs the call from it — `payload->'lines'`,
 * `payload->>'occurred_at'`, `payload->>'provider_id'`. Note what is NOT there:
 * the `p_` prefix. So the queue stores the bare names, `@/api/flush` adds the
 * prefix at the call, and THIS function adds nothing at all. Prefixing here
 * would store a payload that typechecks, dead-letters perfectly and cannot be
 * replayed — discovered on the day somebody first tried.
 *
 * ⚠️ `recorded_offline` IS LEFT IN, unlike at the send. `@/api/flush` strips it
 * because it is decided at flush; here the payload is a RECORD of what was
 * attempted, and `0026` reads `payload->>'recorded_offline'` when it replays.
 */
export function reportArgs(
  write: QueuedWrite,
  failure: Extract<Failure, { permanent: true }>,
): Readonly<Record<string, unknown>> {
  return {
    p_id: write.id,
    p_kind: write.kind,
    p_workspace_id: write.workspaceId,
    p_payload: write.payload,
    p_error_code: failure.code,
    p_error_detail: failure.detail,
    p_location_id: locationOf(write.payload),
  };
}

/** What `record_failed_write` answered. */
export interface Reported {
  readonly failedWriteId: string;
  /** The second report of one failure — a no-op, and NOT a second downgrade. */
  readonly alreadyRecorded: boolean;
  /** Did the shelf move? False for `purchase` and `transfer`, always. */
  readonly downgraded: boolean;
  /** `0024`'s own word for why it did not, or null. */
  readonly downgradeSkipped: string | null;
  readonly movementCount: number;
}

/**
 * The reply becomes a result, or this throws.
 *
 * ⚠️⚠️ IT THROWS RATHER THAN GUESSING, AND THAT IS THE OPPOSITE OF
 * `landedFrom`'s CHOICE NEXT DOOR — deliberately, because the two failures are
 * opposite. An unreadable reply from `record_sale` is read as "did not land",
 * which costs a free retry. An unreadable reply from THIS function would be
 * read as "the dead letter is filed", and the row would go `dead` — terminal
 * from the device (`advance`) — with nothing on the server holding it. That is
 * the one outcome in the whole queue that loses a sale outright, so an
 * unreadable reply is treated as a failed report: the row goes back to
 * `pending` and the uuid makes the second report a no-op (`0024` decision 7).
 */
export function reportedFrom(data: unknown): Reported {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error(`${RECORD_FAILED_WRITE} returned ${typeof data}, expected an object`);
  }
  const row = data as Record<string, unknown>;
  const id = row.failed_write_id;
  const already = row.already_recorded;
  if (typeof id !== 'string' || typeof already !== 'boolean') {
    throw new Error(
      `${RECORD_FAILED_WRITE} returned no failed_write_id/already_recorded — the dead ` +
        'letter cannot be confirmed, so the row must not be marked dead',
    );
  }
  const skipped = row.downgrade_skipped;
  const moves = row.movement_count;
  return {
    failedWriteId: id,
    alreadyRecorded: already,
    downgraded: row.downgraded === true,
    downgradeSkipped: typeof skipped === 'string' ? skipped : null,
    movementCount: typeof moves === 'number' ? moves : 0,
  };
}
