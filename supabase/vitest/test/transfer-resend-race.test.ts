// ============================================================================
// The transfer re-send, concurrent: "one transfer_group_id, both in flight →
// THE VAN SHIPS ONCE"
// ============================================================================
// docs/PLAN.md, owed since 4e-i (2026-09-04) and unassigned until now. ⚠️ IT IS
// NOT ONE OF §2.10's NINE ROWS — those are all written. It is the gap 4e-i's
// falsification F9 found and could not close:
//
//   `record_transfer` is the ONE function on the write surface with no primary
//   key to collide on. §2.4 gives a transfer no document (deliberately), so
//   `transfer_group_id` is a plain column on `stock_movement` and cannot be
//   unique — one transfer writes one row per lot per leg. Its idempotency
//   therefore rests ENTIRELY on `pg_advisory_xact_lock(hashtextextended(p_id))`
//   taken one statement before the ledger is read (`0020`, carried into `0025`).
//
//   ⚠️⚠️ F9 DELETED THAT LOCK AND TURNED NONE OF `supabase/tests/0020`'s 76
//   CHECKS RED. That is not a hole in that file. It is the same property
//   `availability-race.test.ts` exists for and the same reason: a session cannot
//   block on its own lock, so from ONE connection a deleted lock is invisible.
//   Everything below is the assertion F9 was meant to break.
//
// ⚠️ WHY THE LOCK IS LOAD-BEARING, AND WHY THE OUTCOME IS NOT MERELY A DUPLICATE
// ROW. The other three recorders lose a race to `on conflict (id) do nothing`:
// the second call finds the key taken and writes nothing. This one has no key,
// so without the lock BOTH sessions read `count(*) = 0` over the group, both
// conclude they are the first, and both ship — TWICE THE STOCK LEAVES THE ORIGIN
// AND TWICE ARRIVES AT THE DESTINATION, with the ledger perfectly consistent
// about it (§2.4's invariant holds; it is a real shipment, recorded twice). That
// is the shape ADR-035 §2.6 calls the most dangerous a defect can take here.
//
// THREE RACES, AND THE SECOND AND THIRD ARE WHAT STOP THE FIRST BEING GREEN FOR
// THE WRONG REASON:
//
//   R1  the same id, the SAME payload, both in flight
//         → B waits, then returns `already_recorded: true`. ONE shipment.
//       The claim itself.
//
//   R2  the same id, a DIFFERENT payload, both in flight
//         → B waits, then is refused `TD001`. Still ONE shipment.
//       THE DISCRIMINATOR FOR "THE LOCK PROTECTS THE COMPARISON, NOT JUST THE
//       WRITE": the recomputed hash is read INSIDE the lock scope, so a
//       re-send that is not a retry has to be told apart from one that is —
//       while the first is still uncommitted. Without the lock B does not
//       compare anything, because it sees no first shipment to compare against.
//
//   R3  the same id, the same payload, and A ABORTS
//         → B ships, exactly once, and the surviving shipment is B's.
//       THE DISCRIMINATOR FOR "THE LOSER IS SERVED, NOT SILENCED": an
//       implementation that returned `already_recorded` off A's UNCOMMITTED
//       rows, or one that held the lock past a rollback, would pass R1 and lose
//       the shipment here. This is `idempotency.test.ts`'s abort branch, on the
//       one function that reaches it through a lock instead of a key.
//
// ⚠️ IT MAKES NO RLS CLAIM, like the three suites beside it. Every connection is
// the `postgres` superuser, which bypasses RLS (`supabase/README.md`);
// `authenticate()` supplies an identity to a function that ASKS for one —
// `record_transfer` reads `auth.uid()` and validates BOTH locations against
// `my_locations()` — and puts no policy between this file and a row. Isolation
// is `supabase/pgtap/02`–`05`, under `set role authenticated`.
//
//   supabase db reset
//   DB_URL="$(supabase status -o env | grep '^DB_URL=' | cut -d'"' -f2)" \
//     npm run test:db --workspace @tienda/db-concurrency
// ============================================================================

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  authenticate,
  blockedBy,
  buildFixture,
  cleanup,
  close,
  open,
  type Fixture,
  type Session,
} from '../src/harness.js';

// ---------------------------------------------------------------------------
// What one race records
// ---------------------------------------------------------------------------
interface Outcome {
  /** Who session B was waiting on, read while A's transaction was still open.
   *  Empty means the two calls never overlapped and nothing here is a race. */
  blockers: number[];
  /** Movements carrying this transfer_group_id AT THAT MOMENT — zero, because
   *  A has not committed and B is still waiting to find out. */
  movementsWhileBlocked: number;
  /** sqlstate B was refused with, or null if B was served. */
  bError: string | null;
  /** `already_recorded` off B's return value, or null if B raised. */
  bAlreadyRecorded: boolean | null;
  /** Movements carrying this transfer_group_id after both transactions closed.
   *  TWO is one shipment: one `transfer_out` leg and one `transfer_in`. */
  movements: number;
  /** …of which legs at the origin, so a doubled shipment is legible as such. */
  outLegs: number;
  /** Base units left at the origin, and arrived at the destination. */
  origin: number;
  destination: number;
  /** Lots at the destination. §2.4 opens one per ORIGIN lot, so two would be
   *  two vans however the quantities happened to land. */
  destinationLots: number;
}

/** 10 units at the origin, and every race ships 4 — so a second shipment FITS.
 *  ⚠️ That is deliberate: if the origin held exactly 4, a doubled van would
 *  overdraw and `allocate_fefo()`'s shortfall branch would open a lot at the
 *  origin, and the race would be caught by arithmetic that has nothing to do
 *  with the lock. The stock is sized so that shipping twice SUCCEEDS QUIETLY. */
const STOCKED = 10;
const SHIPPED = 4;

let a: Session;
let b: Session;
let observer: Session;
let fixture: Fixture;
let destinationId = '';

/** One variant per race, so no race can be explained by another's leftovers. */
const variant: Record<'r1' | 'r2' | 'r3', string> = { r1: '', r2: '', r3: '' };
const group: Record<'R1' | 'R2' | 'R3', string> = { R1: '', R2: '', R3: '' };

const outcome: Record<'R1' | 'R2' | 'R3', Outcome> = {
  R1: {} as Outcome,
  R2: {} as Outcome,
  R3: {} as Outcome,
};

// ---------------------------------------------------------------------------
// Reading the ledger, from the observer's committed snapshot
// ---------------------------------------------------------------------------
const shelfOf = async (locationId: string, variantId: string): Promise<number> => {
  const { rows } = await observer.client.query<{ n: string }>(
    `select coalesce(sum(remaining_base), 0)::text as n
       from public.batch_balance
      where location_id = $1 and variant_id = $2`,
    [locationId, variantId],
  );
  return Number(rows[0]?.n ?? NaN);
};

const movementsOf = async (groupId: string, reason?: string): Promise<number> => {
  const { rows } = await observer.client.query<{ n: string }>(
    `select count(*)::text as n from public.stock_movement
      where transfer_group_id = $1
        and ($2::text is null or reason::text = $2)`,
    [groupId, reason ?? null],
  );
  return Number(rows[0]?.n ?? -1);
};

const lotsAt = async (locationId: string, variantId: string): Promise<number> => {
  const { rows } = await observer.client.query<{ n: string }>(
    `select count(*)::text as n from public.stock_batch
      where location_id = $1 and variant_id = $2`,
    [locationId, variantId],
  );
  return Number(rows[0]?.n ?? -1);
};

const lines = (variantId: string, qty: number) =>
  JSON.stringify([{ variant_id: variantId, qty_display: qty }]);

const CALL = `select public.record_transfer($1::uuid, $2::uuid, $3::uuid, $4::jsonb) as r`;

/** Both halves of an answer, wrapped AT CREATION.
 *
 *  ⚠️ THE WRAPPING IS NOT A STYLE CHOICE, and `idempotency.test.ts` paid for the
 *  lesson on CI run 33972448395: a deferred query that REJECTS before anything
 *  is attached to it is an unhandled rejection, which Vitest reports as an error
 *  with every assertion green — a red run that reads as a green one. R2's B is
 *  exactly such a query. */
function settle(p: Promise<{ rows: Array<{ r: unknown }> }>): Promise<{
  code: string | null;
  value: Record<string, unknown> | null;
}> {
  return p.then(
    (res) => ({ code: null, value: (res.rows[0]?.r ?? null) as Record<string, unknown> | null }),
    (e: unknown) => {
      const code = (e as { code?: unknown }).code;
      return {
        code: typeof code === 'string' ? code : `non-pg error: ${String(e)}`,
        value: null,
      };
    },
  );
}

// ---------------------------------------------------------------------------
// The race itself
// ---------------------------------------------------------------------------
// A begins and ships, and DOES NOT COMMIT. B fires the same transfer id while
// A's transaction is open — NOT awaited, because it has to still be in flight
// for any of this to be about concurrency. The observer names who B is waiting
// on, A finishes, and only then is B's answer read.
async function race(
  groupId: string,
  variantId: string,
  bQty: number,
  aEnds: 'commit' | 'rollback',
): Promise<Outcome> {
  const out = {} as Outcome;

  await a.client.query('begin');
  await a.client.query(CALL, [groupId, fixture.locationId, destinationId, lines(variantId, SHIPPED)]);

  await b.client.query('begin');
  const bCall = settle(
    b.client.query(CALL, [groupId, fixture.locationId, destinationId, lines(variantId, bQty)]),
  );

  // THE ANTI-VACUITY GUARD. Every assertion below is also true of two calls that
  // never overlapped — the second would find the first's shipment committed,
  // return `already_recorded`, and the counts would come out identical. Only
  // this makes it evidence about a race.
  //
  // ⚠️ IT DOES NOT, ON ITS OWN, PROVE THE ADVISORY LOCK IS WHAT B IS WAITING ON.
  // Without the lock B would still block — one statement later, on the `for
  // update` `allocate_fefo()` takes over the origin's lots — and this assertion
  // would still pass. What the lock changes is the OUTCOME, which is why the
  // counts below are the falsifying half and this is only the guard.
  out.blockers = await blockedBy(observer, b.pid);
  out.movementsWhileBlocked = await movementsOf(groupId);

  await a.client.query(aEnds);
  const answer = await bCall;
  out.bError = answer.code;
  out.bAlreadyRecorded =
    answer.value && typeof answer.value['already_recorded'] === 'boolean'
      ? (answer.value['already_recorded'] as boolean)
      : null;

  // A refused call left B's transaction aborted; a served one has a shipment to
  // commit. `commit` on an aborted transaction is a silent rollback, but saying
  // which is meant is cheaper than remembering that it is.
  await b.client.query(out.bError === null ? 'commit' : 'rollback');

  out.movements = await movementsOf(groupId);
  out.outLegs = await movementsOf(groupId, 'transfer_out');
  out.origin = await shelfOf(fixture.locationId, variantId);
  out.destination = await shelfOf(destinationId, variantId);
  out.destinationLots = await lotsAt(destinationId, variantId);
  return out;
}

// ---------------------------------------------------------------------------
beforeAll(async () => {
  a = await open();
  b = await open();
  observer = await open();
  await cleanup(observer);
  fixture = await buildFixture(observer);

  // A and B call an RPC, so both need a caller. The observer does not: it only
  // reads, as the superuser, and giving it a claim would make its reads look
  // like a tenancy assertion they are not.
  await authenticate(a, fixture.userId);
  await authenticate(b, fixture.userId);

  const q = observer.client;

  // ⚠️ THE SECOND STORE IS BUILT HERE AND NOT IN THE SHARED HARNESS. This is the
  // only suite that needs one, and `harness.ts` says in its own header that a
  // change there is a change to all four files.
  const loc = await q.query<{ id: string }>(
    `insert into public.location (workspace_id, name) values ($1, 'Sucursal Norte')
     returning id`,
    [fixture.workspaceId],
  );
  destinationId = loc.rows[0]?.id ?? '';
  if (!destinationId) throw new Error('fixture: no destination location');

  const fam = await q.query<{ id: string }>(
    `insert into public.product_family (workspace_id, name)
     values ($1, 'Abarrotes') returning id`,
    [fixture.workspaceId],
  );
  const familyId = fam.rows[0]?.id;
  if (!familyId) throw new Error('fixture: no family');

  for (const key of ['r1', 'r2', 'r3'] as const) {
    const v = await q.query<{ id: string }>(
      `insert into public.product_variant (workspace_id, family_id, name,
         base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code,
         tax_rate)
       values ($1, $2, $3, 'pza','pza','pza','pza', 0.00) returning id`,
      [fixture.workspaceId, familyId, `Arroz ${key}`],
    );
    const id = v.rows[0]?.id;
    if (!id) throw new Error(`fixture: no variant ${key}`);
    variant[key] = id;

    // An `adjustment` lot, like the two suites beside this one: `0015`'s receipt
    // completeness binds `purchase`-origin lots to a purchase_line, and this
    // file has no opinion about receipts. ONE lot at the origin, so one shipment
    // writes exactly one `transfer_out` leg and one destination lot — which is
    // what makes "two legs" and "two lots" read as "two vans" below.
    const batch = await q.query<{ id: string }>(
      `insert into public.stock_batch (workspace_id, location_id, variant_id,
         origin, qty_received_base, unit_cost_net_per_base, created_by)
       values ($1, $2, $3, 'adjustment', $4, 1.00, $5) returning id`,
      [fixture.workspaceId, fixture.locationId, id, STOCKED, fixture.userId],
    );
    await q.query(
      `insert into public.stock_movement (workspace_id, location_id, batch_id,
         variant_id, reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
       values ($1, $2, $3, $4, 'adjustment', $5, 1.00, now(), $6)`,
      [fixture.workspaceId, fixture.locationId, batch.rows[0]?.id, id, STOCKED, fixture.userId],
    );
  }

  // THE RACES RUN ONCE, HERE, and every test below is a claim about what they
  // recorded — the shape the two suites beside this one use, and for the same
  // reason: re-racing per assertion would race nine times to ask nine things
  // about three events, and a flake in one would read as a defect in all three.
  group.R1 = crypto.randomUUID();
  group.R2 = crypto.randomUUID();
  group.R3 = crypto.randomUUID();

  outcome.R1 = await race(group.R1, variant.r1, SHIPPED, 'commit');
  outcome.R2 = await race(group.R2, variant.r2, SHIPPED + 1, 'commit');
  outcome.R3 = await race(group.R3, variant.r3, SHIPPED, 'rollback');
}, 120_000);

afterAll(async () => {
  await close(a, b, observer);
});

// ---------------------------------------------------------------------------
describe('R1 — the same transfer id, the same payload, both in flight', () => {
  test('the re-send was genuinely in flight, and saw nothing while it waited', () => {
    expect(outcome.R1.blockers).toEqual([a.pid]);
    expect(outcome.R1.movementsWhileBlocked).toBe(0);
  });

  test('⚠️ THE VAN SHIPS ONCE — two legs, not four', () => {
    // Without the advisory lock both sessions read `count(*) = 0` over the
    // group, both conclude they are first, and both ship: four movements, two
    // out-legs, 2 at the origin and 8 at the destination. Every one of those is
    // a perfectly consistent ledger describing a van that went twice.
    expect(outcome.R1.movements).toBe(2);
    expect(outcome.R1.outLegs).toBe(1);
    expect(outcome.R1.destinationLots).toBe(1);
  });

  test('…and the stock moved once: 6 left behind, 4 arrived', () => {
    expect(outcome.R1.origin).toBe(STOCKED - SHIPPED);
    expect(outcome.R1.destination).toBe(SHIPPED);
  });

  test('the loser is SERVED, not refused — `already_recorded: true`', () => {
    // §2.6's idempotency contract: a retry is free. The re-send is answered with
    // the first shipment's summary, which is what lets a client that lost its
    // response simply ask again.
    expect(outcome.R1.bError).toBeNull();
    expect(outcome.R1.bAlreadyRecorded).toBe(true);
  });
});

describe('R2 — the same transfer id, a DIFFERENT payload, both in flight', () => {
  test('the re-send was genuinely in flight, and saw nothing while it waited', () => {
    expect(outcome.R2.blockers).toEqual([a.pid]);
    expect(outcome.R2.movementsWhileBlocked).toBe(0);
  });

  test('⚠️ it is refused TD001 — a re-send that is not a retry is not a shipment', () => {
    // The recomputed hash is read INSIDE the lock scope, so B compares its own
    // payload against a shipment that was uncommitted when B started. Without
    // the lock there is nothing to compare against and B simply ships a second,
    // DIFFERENT van under one id — which no later read could ever untangle,
    // because §2.4 gives the group no header to disagree with.
    expect(outcome.R2.bError).toBe('TD001');
    expect(outcome.R2.bAlreadyRecorded).toBeNull();
  });

  test('…and the first shipment stands, alone and unaltered', () => {
    expect(outcome.R2.movements).toBe(2);
    expect(outcome.R2.outLegs).toBe(1);
    expect(outcome.R2.origin).toBe(STOCKED - SHIPPED);
    expect(outcome.R2.destination).toBe(SHIPPED);
  });
});

describe('R3 — the first call ABORTS, and the re-send must not inherit its answer', () => {
  test('the re-send was genuinely in flight, and saw nothing while it waited', () => {
    expect(outcome.R3.blockers).toEqual([a.pid]);
    expect(outcome.R3.movementsWhileBlocked).toBe(0);
  });

  test('⚠️ B SHIPS — the lock is released by the rollback, and B is first after all', () => {
    // An implementation that answered `already_recorded` off A's UNCOMMITTED
    // rows would lose this shipment entirely and pass every assertion in R1.
    // This is the branch that tells "the retry was absorbed" apart from "the
    // transfer never happened".
    expect(outcome.R3.bError).toBeNull();
    expect(outcome.R3.bAlreadyRecorded).toBe(false);
  });

  test('…exactly once, and it is B\'s van', () => {
    expect(outcome.R3.movements).toBe(2);
    expect(outcome.R3.outLegs).toBe(1);
    expect(outcome.R3.origin).toBe(STOCKED - SHIPPED);
    expect(outcome.R3.destination).toBe(SHIPPED);
  });
});

describe('the three races together', () => {
  test('⚠️ every shipment in this file is ONE van — the claim, stated once more over all three', () => {
    // Stated as a single assertion as well as three, because the failure this
    // file exists to catch is not local to a race: a deleted lock doubles EVERY
    // shipment, and a reviewer reading one red line should see the whole shape.
    expect([outcome.R1.outLegs, outcome.R2.outLegs, outcome.R3.outLegs]).toEqual([1, 1, 1]);
  });

  test('…and §2.4\'s invariant holds across all of it: movements equal balances', async () => {
    // ⚠️ THIS ASSERTION PASSES EITHER WAY AND IS HERE TO SAY SO OUT LOUD. A
    // doubled shipment is INTERNALLY CONSISTENT — every leg is paired, every
    // balance matches its movements, and §2.10's nightly check sees nothing
    // wrong. That is precisely why the claim above needed two connections and a
    // file of its own, and it is the shape ADR-035 §2.6 names as the most
    // dangerous a defect can take: a ledger that is consistent and untrue.
    //
    // It is a real read of a real invariant, not a restatement of one — it goes
    // red if the projection ever drifts from the ledger — but it discriminates
    // NOTHING about the lock, and it would be dishonest to let it sit here
    // unlabelled among assertions that do.
    const { rows } = await observer.client.query<{ n: string }>(
      `select count(*)::text as n
         from (select batch_id, sum(qty_base) as moved
                 from public.stock_movement group by batch_id) m
         join public.batch_balance bb on bb.batch_id = m.batch_id
        where bb.remaining_base <> m.moved`,
    );
    expect(Number(rows[0]?.n)).toBe(0);
  });
});
