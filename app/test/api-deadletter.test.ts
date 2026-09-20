import { describe, expect, it } from 'vitest';

import {
  DOWNGRADED_KINDS,
  PERMANENT_CODES,
  RECORD_FAILED_WRITE,
  classify,
  expectsDowngrade,
  locationOf,
  reportArgs,
  reportedFrom,
  type Failure,
} from '@/api/deadletter';
import { WRITE_KINDS, type QueuedWrite } from '@/api/outbox';

// ============================================================================
// TRANSIENT AGAINST PERMANENT. Plan task 5c-iii.
//
// ⚠️⚠️ WHAT THIS SUITE IS FOR AND WHAT IT CANNOT DO, STATED TOGETHER. The
// CLASSIFICATION is entirely ours — a decision procedure over codes, which is
// the same thing §2.11 admits when it names the outbox state machine — and the
// whole of it runs here. What it cannot see is the two facts the classification
// rests on, and both are facts about the applied schema:
//
//   * that `record_sale` still raises `22023` for a deleted variant, `42501`
//     for a location the caller has lost, and `TD001` for a re-send under a
//     changed payload — and that an expired token comes back `PGRST301`
//     INSTEAD OF `42501`, which is the distinction that makes dead-lettering
//     `42501` safe at all;
//   * that `record_failed_write` downgrades a `sale` and leaves a `purchase`
//     alone (`0024`, amendment 2).
//
// `docs/checks/5c-iii-dead-letter-contract.sh` is the instrument for both, over
// real HTTP against a real shop. A green here and a red there is exactly the
// arrangement that would ship a client agreeing with itself.
// ============================================================================

const SHOP = '00000000-1111-4222-8333-444444444444';

function row(over: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    id: '11111111-2222-4333-8444-555555555555',
    workspaceId: SHOP,
    kind: 'sale',
    payload: { location_id: 'L', lines: [{ variant_id: 'V', qty_display: 2 }] },
    state: 'flushing',
    attempts: 1,
    queuedAt: '2026-09-20T09:00:00.000Z',
    ...over,
  };
}

function refusal(code: unknown, extra: Record<string, unknown> = {}): unknown {
  return { code, message: 'refused', ...extra };
}

/** Narrows, so an assertion about a code does not have to cast. */
function permanent(f: Failure): Extract<Failure, { permanent: true }> {
  if (!f.permanent) throw new Error('expected a permanent failure');
  return f;
}

describe('the list of permanent codes', () => {
  // ⚠️ EVERY ENTRY CARRIES ITS REASON, so adding one without a reason is
  // visibly a different kind of edit rather than one more line in an array.
  it('gives a reason for every code it holds', () => {
    for (const [code, why] of Object.entries(PERMANENT_CODES)) {
      expect(code.trim()).not.toBe('');
      expect(why.trim().length).toBeGreaterThan(10);
    }
  });

  // ⚠️⚠️ §2.6's OWN TABLE NAMES THESE. "42501 location not accessible after a
  // membership change; a constraint; a variant deleted between capture and
  // flush" is the Permanent row, verbatim.
  it('holds the three the ADR names, and the four spellings of "a constraint"', () => {
    expect(PERMANENT_CODES).toHaveProperty('42501');
    expect(PERMANENT_CODES).toHaveProperty('22023');
    expect(PERMANENT_CODES).toHaveProperty('22P02');
    for (const constraint of ['23502', '23503', '23505', '23514']) {
      expect(PERMANENT_CODES).toHaveProperty(constraint);
    }
  });

  // ⚠️ THE ONLY CODE IN THE SCHEMA THAT NAMES ITS OWN HANDLING: `0016` raises
  // TD001 with detail 'This is not a retry. Dead-letter it (ADR-035 §2.6).'
  it('holds TD001, which the migration itself asks to be dead-lettered', () => {
    expect(PERMANENT_CODES).toHaveProperty('TD001');
  });

  // ⚠️⚠️ THE THREE THAT LOOK PERMANENT AND ARE NOT. Each has its own reason and
  // none of them is caution:
  //   TD002  — enforcement is skipped when recorded_offline is true, and the
  //            flush sets that from `attempts > 1`, so the NEXT attempt lands.
  //   PGRST202 — our bug; the next deploy fixes it, and dead-lettering would
  //            turn one bad release into a downgraded ledger in every shop.
  //   XX000  — our bug; a migration fixes it. Same argument.
  it('refuses TD002, PGRST202 and XX000 admission, each for its own reason', () => {
    expect(PERMANENT_CODES).not.toHaveProperty('TD002');
    expect(PERMANENT_CODES).not.toHaveProperty('PGRST202');
    expect(PERMANENT_CODES).not.toHaveProperty('XX000');
  });

  // ⚠️ PGRST301 IS THE WHOLE REASON 42501 IS SAFE TO DEAD-LETTER. An expired
  // token never reaches the function body; a 42501 means the body refused a
  // caller who was authenticated. If this ever appeared here, every queued sale
  // on a phone with a stale token would be downgraded.
  it('refuses PGRST301, which is what an expired session looks like', () => {
    expect(PERMANENT_CODES).not.toHaveProperty('PGRST301');
  });

  // ⚠️ `TD003` is 0025/0030's manager fence on a replay marker, and
  // `@/api/flush` strips `replay_of_failed_write_id` by name — so no flush can
  // reach it. It is not classified, because classifying an unreachable code is
  // a guess about a path that does not exist.
  it('says nothing about TD003, which no flush can reach', () => {
    expect(PERMANENT_CODES).not.toHaveProperty('TD003');
  });
});

describe('classifying a thrown refusal', () => {
  it('is permanent for every code on the list, carrying the code back out', () => {
    for (const code of Object.keys(PERMANENT_CODES)) {
      const f = classify(refusal(code));
      expect(f.permanent).toBe(true);
      expect(permanent(f).code).toBe(code);
    }
  });

  // ⚠️⚠️ THE DEFAULT IS RETRY, AND IT IS THE DESIGN. An unrecognised refusal
  // retried forever is a sale still on the phone, in full; dead-lettered, it is
  // a sale downgraded that would have arrived on its own. Same rule as
  // `landedFrom` next door: an unreadable answer is a retry.
  it('is transient for anything else at all', () => {
    for (const code of ['TD002', 'TD003', 'PGRST202', 'PGRST301', 'XX000', '40001', '57014']) {
      expect(classify(refusal(code))).toEqual({ permanent: false });
    }
  });

  it('is transient for a throw carrying no code — which is what offline is', () => {
    expect(classify(new Error('Network request failed'))).toEqual({ permanent: false });
    expect(classify(refusal(undefined))).toEqual({ permanent: false });
    expect(classify(refusal(42501))).toEqual({ permanent: false });
    for (const thrown of [null, undefined, 'TD001', 42, []]) {
      expect(classify(thrown)).toEqual({ permanent: false });
    }
  });

  // ⚠️ §2.8 sends dead letters to the VENDOR, and §2.6 says why the detail is
  // worth keeping: "the operator cannot diagnose a 42501, but whoever caused it
  // can". So message, details and hint are all carried.
  it('keeps everything the server said as one detail line', () => {
    const f = permanent(
      classify({
        code: '22023',
        message: 'record_sale: line 1 — no such variant',
        details: 'variant 9f… was deleted',
        hint: 'check the catalogue',
      }),
    );
    expect(f.detail).toBe(
      'record_sale: line 1 — no such variant — variant 9f… was deleted — check the catalogue',
    );
  });

  // ⚠️ `failed_write_error_detail_not_blank` REFUSES A BLANK STRING, so a blank
  // detail would lose the whole report over an empty field.
  it('sends null rather than a blank detail', () => {
    expect(permanent(classify({ code: '42501' })).detail).toBeNull();
    expect(permanent(classify({ code: '42501', message: '   ' })).detail).toBeNull();
  });
});

describe('the arguments a dead letter is reported with', () => {
  const failure = permanent(classify(refusal('22023', { message: 'no such variant' })));

  it('names the RPC once, and takes 0024’s seven arguments', () => {
    expect(RECORD_FAILED_WRITE).toBe('record_failed_write');
    expect(Object.keys(reportArgs(row(), failure)).sort()).toEqual([
      'p_error_code',
      'p_error_detail',
      'p_id',
      'p_kind',
      'p_location_id',
      'p_payload',
      'p_workspace_id',
    ]);
  });

  // ⚠️⚠️ THE PAYLOAD IS HANDED OVER UNTOUCHED, WITH NO `p_` PREFIX ON ITS KEYS,
  // and that is the whole point of the shape `5c-i` chose. `0026` reads
  // `payload->'lines'` and `payload->>'occurred_at'` directly; a prefixed copy
  // would store, dead-letter and downgrade perfectly and be discovered on the
  // day somebody first tried to REPLAY one.
  it('hands the payload over exactly as it was queued', () => {
    const payload = { location_id: 'L', lines: [1], occurred_at: 'T', recorded_offline: true };
    const args = reportArgs(row({ payload }), failure);
    expect(args.p_payload).toEqual(payload);
    expect(Object.keys(args.p_payload as object)).not.toContain('p_lines');
  });

  // ⚠️ UNLIKE AT THE SEND. `@/api/flush` strips `recorded_offline` because it is
  // decided at flush; here the payload is a RECORD of what was attempted, and
  // `0026` reads `payload->>'recorded_offline'` when it replays.
  it('keeps recorded_offline in the payload, which the send strips', () => {
    const args = reportArgs(row({ payload: { lines: [], recorded_offline: true } }), failure);
    expect((args.p_payload as Record<string, unknown>).recorded_offline).toBe(true);
  });

  it('carries the shop off the row, not off whatever is open now', () => {
    const other = '99999999-8888-4777-8666-555555555555';
    expect(reportArgs(row({ workspaceId: other }), failure).p_workspace_id).toBe(other);
  });

  it('sends the code and the detail the classification read', () => {
    const args = reportArgs(row(), failure);
    expect(args.p_error_code).toBe('22023');
    expect(args.p_error_detail).toBe('no such variant');
  });
});

describe('the location a dead letter names', () => {
  // ⚠️⚠️ A TRANSFER'S PAYLOAD HAS NO `location_id` AT ALL — `0020` takes
  // `from_location_id` and `to_location_id`. Left to `record_failed_write`'s own
  // default, a dead-lettered transfer lands with a NULL location, and §2.10's
  // nightly check reads `failed_write` by workspace and kind to price
  // unrecorded revenue: a row it cannot attribute to a store is a row nobody
  // can act on.
  it('is the origin for a transfer, which has no location_id', () => {
    expect(locationOf({ from_location_id: 'A', to_location_id: 'B' })).toBe('A');
  });

  it('is location_id for everything else', () => {
    expect(locationOf({ location_id: 'L', lines: [] })).toBe('L');
  });

  it('prefers location_id when a payload somehow carries both', () => {
    expect(locationOf({ location_id: 'L', from_location_id: 'A' })).toBe('L');
  });

  it('is null when the payload names no store, rather than an empty string', () => {
    expect(locationOf({ lines: [] })).toBeNull();
    expect(locationOf({ location_id: '   ' })).toBeNull();
    expect(locationOf({ location_id: 42 })).toBeNull();
  });
});

describe('which kinds the server downgrades', () => {
  // ⚠️⚠️ THE RULE IN ONE SENTENCE (§2.6 as amended 2026-09-05): downgrade the
  // kinds where the stock is GONE and nobody will re-enter it. A rejected
  // purchase leaves the delivery on the shelf with a manager holding the note,
  // and an auto-upgrade would open a zero-cost lot and then DOUBLE the shelf
  // when Comprar records it properly.
  it('is sale and waste, and never purchase or transfer', () => {
    expect([...DOWNGRADED_KINDS].sort()).toEqual(['sale', 'waste']);
    expect(expectsDowngrade('sale')).toBe(true);
    expect(expectsDowngrade('waste')).toBe(true);
    expect(expectsDowngrade('purchase')).toBe(false);
    expect(expectsDowngrade('transfer')).toBe(false);
  });

  // ⚠️ IT IS A SUBSET OF THE KINDS THE QUEUE HOLDS, not a second list. A kind
  // here that `0024`'s CHECK constraint does not allow is a kind that can never
  // be dead-lettered at all.
  it('names only kinds 0024 lets into the queue', () => {
    for (const kind of DOWNGRADED_KINDS) {
      expect(WRITE_KINDS as readonly string[]).toContain(kind);
    }
  });
});

describe('reading record_failed_write’s reply', () => {
  const filed = {
    failed_write_id: '11111111-2222-4333-8444-555555555555',
    already_recorded: false,
    downgraded: true,
    downgrade_skipped: null,
    movement_count: 2,
  };

  it('reads the row it filed and the movements it wrote', () => {
    expect(reportedFrom(filed)).toEqual({
      failedWriteId: '11111111-2222-4333-8444-555555555555',
      alreadyRecorded: false,
      downgraded: true,
      downgradeSkipped: null,
      movementCount: 2,
    });
  });

  // ⚠️ `0024` DECISION 7: the second report of one failure collides on the
  // primary key, answers already_recorded and — crucially — DOES NOT DOWNGRADE
  // AGAIN. It is a success, not a failure, and the row still goes dead.
  it('reads the second report of one failure as the success it is', () => {
    const again = { ...filed, already_recorded: true, downgraded: false };
    expect(reportedFrom(again).alreadyRecorded).toBe(true);
  });

  it('reads 0024’s own word for why a downgrade did not run', () => {
    const skipped = { ...filed, downgraded: false, downgrade_skipped: 'kind_not_downgraded' };
    expect(reportedFrom(skipped).downgradeSkipped).toBe('kind_not_downgraded');
  });

  // ⚠️⚠️ IT THROWS WHERE `landedFrom` RETURNS, AND THE TWO ARE OPPOSITE ON
  // PURPOSE. An unreadable reply from `record_sale` costs a free retry. An
  // unreadable reply from this function read as a success would mark the row
  // `dead` — terminal from the device — with nothing on the server holding it,
  // which is the one outcome in the whole queue that loses a sale outright.
  it('throws on anything it cannot read, rather than assuming the row was filed', () => {
    for (const reply of [null, undefined, 42, 'ok', [], {}, { failed_write_id: 7 }]) {
      expect(() => reportedFrom(reply)).toThrow();
    }
    expect(() => reportedFrom({ failed_write_id: 'x' })).toThrow();
    expect(() => reportedFrom({ already_recorded: false })).toThrow();
  });
});
