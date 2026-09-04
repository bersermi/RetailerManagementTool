// ============================================================================
// §2.10, concurrency row, clause one:
//   "Two sessions, last unit, ENFORCEMENT ON → exactly one succeeds"
// ============================================================================
// Plan task 4c-ii. This is the last unasserted cell of ADR-035 §2.10, and it is
// the only claim in this repository that could not be written until `0017` had
// applied: there was no enforcement path to switch on before 4c-i.
//
// ⚠️ IT EXISTS BECAUSE 4c-i MEASURED THAT IT HAD TO. `supabase/tests/0017`
// proves the refusal from ONE connection, over a 35-check grid — and its
// falsification F6 DELETED THE `for update` FROM THE ENFORCEMENT CTE AND TURNED
// NOT ONE OF THOSE 35 CHECKS RED. That is not a hole in that file; it is the
// property a single session cannot have, because a session cannot block on its
// own lock. Everything below is the assertion F6 was meant to break, and W-F1
// (docs/PLAN.md) is the same deletion run against THIS file.
//
// ⚠️ THE OPPOSITE OUTCOME TO `allocation-race.test.ts`, ON THE SAME HARNESS AND
// ON PURPOSE. There, two sessions race one lot, the loser WAITS, RE-READS and
// TAKES THE NEXT LOT — both succeed, because `allocate_fefo()` does not refuse a
// shortfall (`0010`). Here the loser waits, re-reads, and IS REFUSED, because
// `0017` evaluates availability inside that same lock scope one statement
// earlier. Neither claim implies the other and both are true of the applied
// schema. The difference is twenty lines of `0017`, and race 2 below is the pair
// that shows it is the only difference.
//
// THREE RACES, NOT ONE, and the second and third are what stop the first being
// green for the wrong reason:
//
//   R1  enforcement ON, ONE unit on the shelf, both ask for one
//         → exactly one sale, the loser refused with TD002, shelf at 0.
//       §2.10's clause, verbatim.
//
//   R2  enforcement OFF — the shipped default — same fixture, same race
//         → BOTH sales record, shelf at -1. THE DISCRIMINATOR FOR "ENFORCEMENT
//       IS THE ONLY DIFFERENCE": if R1's refusal came from the lock, or from
//       anything else two overlapping calls do, this race would be refused too.
//       It is `supabase/tests/0016` check 6.2's world, raced.
//
//   R3  enforcement ON, TWO units on the shelf, both ask for one
//         → BOTH sales record, shelf at 0. THE DISCRIMINATOR FOR "THE REFUSAL IS
//       ABOUT AVAILABILITY, NOT ABOUT LOSING THE RACE": the loser here blocks on
//       exactly the same lock, waits exactly as long, and is served. A `0017`
//       that refused whatever it had waited for would pass R1 and fail here.
//
// ⚠️ IT MAKES NO RLS CLAIM, like both suites beside it. Every connection is the
// `postgres` superuser, which bypasses RLS (`supabase/README.md`); `authenticate()`
// supplies an identity to functions that ASK for one — `record_sale` reads
// `auth.uid()` and validates against `my_locations()` — and puts no policy
// between this file and a row. Isolation is `supabase/pgtap/02`–`05`.
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
  errcode,
  open,
  type Fixture,
  type Session,
} from '../src/harness.js';

// ---------------------------------------------------------------------------
// What one race records
// ---------------------------------------------------------------------------
interface Outcome {
  /** Who session B was waiting on, read while A's transaction was still open. */
  blockers: number[];
  /** Committed sales for this variant AT THAT MOMENT. Zero, or A had committed
   *  before B ever started and nothing below is about a race. */
  salesWhileBlocked: number;
  /** Committed movements for this variant at that moment: the receipt, alone. */
  movementsWhileBlocked: number;
  /** sqlstate B was refused with, or null if B was served. */
  bError: string | null;
  /** Sum of `remaining_base` over every lot of this variant at the store. */
  shelf: number;
  /** Lots of this variant at the store — `allocate_fefo()` branch 3 opens one. */
  lots: number;
  /** Sales carrying a line for this variant, after both transactions closed. */
  sales: number;
}

const PRICE = 10.0;

let a: Session;
let b: Session;
let observer: Session;
let fixture: Fixture;

/** The three variants, each raced once. Filled by the fixture. */
const variant: Record<'last' | 'open' | 'two', string> = {
  last: '',
  open: '',
  two: '',
};

const outcome: Record<'R1' | 'R2' | 'R3', Outcome> = {
  R1: {} as Outcome,
  R2: {} as Outcome,
  R3: {} as Outcome,
};

// ---------------------------------------------------------------------------
// Reading the shelf, from the observer's committed snapshot
// ---------------------------------------------------------------------------
const shelfOf = async (variantId: string): Promise<number> => {
  const { rows } = await observer.client.query<{ n: string }>(
    `select coalesce(sum(remaining_base), 0)::text as n
       from public.batch_balance where variant_id = $1`,
    [variantId],
  );
  return Number(rows[0]?.n ?? NaN);
};

const countOf = async (sql: string, variantId: string): Promise<number> => {
  const { rows } = await observer.client.query<{ n: string }>(sql, [variantId]);
  return Number(rows[0]?.n ?? -1);
};

const SALES = `select count(distinct sl.sale_id)::text as n
                 from public.sale_line sl where sl.variant_id = $1`;
const MOVEMENTS = `select count(*)::text as n
                     from public.stock_movement where variant_id = $1`;
const LOTS = `select count(*)::text as n
                from public.stock_batch where variant_id = $1`;

/** One line, one variant, one unit, zero-rated. The money is `0016`'s subject
 *  (checks 6.1–6.6 over fourteen lines); this file's is availability. */
const ticket = (variantId: string, qty: number) =>
  JSON.stringify([
    {
      variant_id: variantId,
      qty_display: qty,
      unit_price_gross_per_base: PRICE,
    },
  ]);

const CALL = `select public.record_sale($1::uuid, $2::uuid, $3::jsonb, null, false)`;

// ---------------------------------------------------------------------------
// The race itself, run once per variant
// ---------------------------------------------------------------------------
// A begins and sells, and DOES NOT COMMIT. B fires the same ticket while A's
// transaction is open — NOT awaited, because it has to still be in flight for
// any of this to be about concurrency. The observer names who B is waiting on,
// A commits, and only then is B's answer read.
async function race(variantId: string, qty: number): Promise<Outcome> {
  const out = {} as Outcome;

  await a.client.query('begin');
  await a.client.query(CALL, [crypto.randomUUID(), fixture.locationId, ticket(variantId, qty)]);

  await b.client.query('begin');
  const bCall = errcode(
    b.client.query(CALL, [crypto.randomUUID(), fixture.locationId, ticket(variantId, qty)]),
  );

  // THE ANTI-VACUITY GUARD. Every assertion in this file is also true of two
  // calls that never overlapped — the second would simply find an empty shelf
  // already committed and refuse, and the counts would come out identical. Only
  // this makes it evidence about a race.
  out.blockers = await blockedBy(observer, b.pid);
  out.salesWhileBlocked = await countOf(SALES, variantId);
  out.movementsWhileBlocked = await countOf(MOVEMENTS, variantId);

  await a.client.query('commit');
  out.bError = await bCall;

  // A refused call left B's transaction aborted; a served one has a sale to
  // commit. `commit` on an aborted transaction is a silent rollback in Postgres,
  // but saying which is meant here is cheaper than remembering that it is.
  await b.client.query(out.bError === null ? 'commit' : 'rollback');

  out.shelf = await shelfOf(variantId);
  out.lots = await countOf(LOTS, variantId);
  out.sales = await countOf(SALES, variantId);
  return out;
}

// ---------------------------------------------------------------------------
beforeAll(async () => {
  a = await open();
  b = await open();
  observer = await open();
  await cleanup(observer);
  fixture = await buildFixture(observer);

  // A and B CALL AN RPC, so both need a caller. The observer does not: it only
  // reads, as the superuser, and giving it a claim would make its reads look
  // like a tenancy assertion they are not.
  await authenticate(a, fixture.userId);
  await authenticate(b, fixture.userId);

  const q = observer.client;
  const fam = await q.query<{ id: string }>(
    `insert into public.product_family (workspace_id, name)
     values ($1, 'Refresco') returning id`,
    [fixture.workspaceId],
  );
  const familyId = fam.rows[0]?.id;
  if (!familyId) throw new Error('fixture: no family');

  // enforce_stock: true opts IN against `workspace_setting.enforce_stock_default`,
  // which is `false` in `0001` and is left alone here — `null` is therefore the
  // SHIPPED case and not a contrivance, which is what makes R2 the real default
  // rather than a switch this file threw.
  const wanted = [
    ['last', 'Refresco ultimo', true, 1],
    ['open', 'Refresco abierto', null, 1],
    ['two', 'Refresco par', true, 2],
  ] as const;

  for (const [key, name, enforce, stocked] of wanted) {
    const v = await q.query<{ id: string }>(
      `insert into public.product_variant (workspace_id, family_id, name,
         base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code,
         tax_rate, enforce_stock)
       values ($1, $2, $3, 'pza','pza','pza','pza', 0.00, $4) returning id`,
      [fixture.workspaceId, familyId, name, enforce],
    );
    const id = v.rows[0]?.id;
    if (!id) throw new Error(`fixture: no variant ${name}`);
    variant[key] = id;

    // An `adjustment` lot, like `allocation-race.test.ts`: `0015`'s receipt
    // completeness (task 4a) binds `purchase`-origin lots to a purchase_line,
    // and this file has no opinion about receipts. One lot per variant, so a
    // shortfall reaches `allocate_fefo()` branch 2 — which is what makes R2's
    // `lots` assertion a real discriminator against branch 3.
    const batch = await q.query<{ id: string }>(
      `insert into public.stock_batch (workspace_id, location_id, variant_id,
         origin, qty_received_base, unit_cost_net_per_base, created_by)
       values ($1, $2, $3, 'adjustment', $4, 1.00, $5) returning id`,
      [fixture.workspaceId, fixture.locationId, id, stocked, fixture.userId],
    );
    await q.query(
      `insert into public.stock_movement (workspace_id, location_id, batch_id,
         variant_id, reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
       values ($1, $2, $3, $4, 'adjustment', $5, 1.00, now(), $6)`,
      [
        fixture.workspaceId,
        fixture.locationId,
        batch.rows[0]?.id,
        id,
        stocked,
        fixture.userId,
      ],
    );
  }

  // THE RACES RUN ONCE, HERE, and every test below is a claim about what they
  // recorded — the shape `allocation-race.test.ts` uses and for the same reason:
  // re-racing per assertion would race nine times to ask nine things about three
  // sequences, and one failure mid-race would take every later test with it.
  outcome.R1 = await race(variant.last, 1);
  outcome.R2 = await race(variant.open, 1);
  outcome.R3 = await race(variant.two, 1);
}, 120_000);

afterAll(async () => {
  // A race that failed part-way leaves a transaction open and the lots locked.
  await a.client.query('rollback').catch(() => {});
  await b.client.query('rollback').catch(() => {});
  await close(a, b, observer);
});

// ===========================================================================
describe('R1 — enforcement ON, two sessions, the last unit', () => {
  test('the second session is made to WAIT, and the blocker is the first', () => {
    // `pg_blocking_pids()` and not `wait_event_type = 'Lock'`: it names WHO. B is
    // stopped at `0017`'s enforcement CTE, which takes `allocate_fefo()`'s rows
    // in `allocate_fefo()`'s order one statement earlier.
    expect(outcome.R1.blockers).toEqual([a.pid]);
  });

  test('it is blocked before EITHER call has committed anything', () => {
    // One movement — the receipt. A's sale is uncommitted and B has not reached
    // its own. This is what fails if the two calls never actually overlapped,
    // which is the only world where the rest of R1 is green for a bad reason.
    expect(outcome.R1.salesWhileBlocked).toBe(0);
    expect(outcome.R1.movementsWhileBlocked).toBe(1);
  });

  test('EXACTLY ONE SUCCEEDS — §2.10, and the loser is REFUSED', () => {
    expect(outcome.R1.sales).toBe(1);
    expect(outcome.R1.bError).toBe('TD002');
  });

  test('the shelf is EMPTY, not overdrawn — the debt was never taken on', () => {
    // The whole point of enforcement, and the one number a shopkeeper reads.
    // Without the `for update` this is -1 and R1's `sales` is 2 (W-F1).
    expect(outcome.R1.shelf).toBe(0);
  });

  test('and the refusal rolled the loser back WHOLE — no orphan header', () => {
    // `record_sale` writes the `sale` header BEFORE the line loop (section 6),
    // so B had already inserted one when it was refused. A refusal that left it
    // standing would be a sale with no lines and no stock — worse than the
    // oversale it prevented.
    expect(outcome.R1.lots).toBe(1);
    expect(outcome.R1.sales).toBe(1);
  });
});

// ===========================================================================
describe('R2 — enforcement OFF (the shipped default), the same race', () => {
  test('the second session still waits, and still on the first', () => {
    // With enforcement dormant nothing evaluates availability, but
    // `allocate_fefo()`'s own `for update of bb` (`0010`) is unchanged — so the
    // wait is identical and only the ANSWER differs. That is what makes this
    // race the pair for R1 rather than a different experiment.
    expect(outcome.R2.blockers).toEqual([a.pid]);
    expect(outcome.R2.salesWhileBlocked).toBe(0);
  });

  test('BOTH SUCCEED, and the shelf goes NEGATIVE — ADR-035 §1, raced', () => {
    // "Stock is recorded, not enforced." This is `supabase/tests/0016` check 6.2
    // under two connections: the allocator overdraws rather than refusing, and
    // the debt is visible as a negative balance rather than lost.
    expect(outcome.R2.bError).toBeNull();
    expect(outcome.R2.sales).toBe(2);
    expect(outcome.R2.shelf).toBe(-1);
  });

  test('…on the lot that was there — branch 2, not an invented lot', () => {
    // `allocate_fefo()` found nothing open, so it blamed the most recent lot
    // this store held (`0010` branch 2) and locked it for the same reason. A
    // second lot here would be branch 3, which is a different defect wearing
    // the same negative number.
    expect(outcome.R2.lots).toBe(1);
  });

  test('R1 AND R2 DIFFER IN NOTHING BUT `enforce_stock`', () => {
    // THE CLAIM THE PAIR EXISTS FOR. Same fixture shape, same quantities, same
    // two connections, same lock, same blocker — and opposite outcomes. So R1's
    // refusal is `0017`'s twenty lines and not an artefact of racing.
    expect(outcome.R1.blockers).toEqual(outcome.R2.blockers);
    expect([outcome.R1.sales, outcome.R2.sales]).toEqual([1, 2]);
    expect([outcome.R1.shelf, outcome.R2.shelf]).toEqual([0, -1]);
  });
});

// ===========================================================================
describe('R3 — enforcement ON, but the shelf can serve both', () => {
  test('the second session waits on the first, exactly as in R1', () => {
    expect(outcome.R3.blockers).toEqual([a.pid]);
    expect(outcome.R3.salesWhileBlocked).toBe(0);
  });

  test('and IS SERVED — the refusal is about stock, not about losing', () => {
    // THE DISCRIMINATOR AGAINST THE CHEAPEST WRONG IMPLEMENTATION. A `0017` that
    // refused any caller who had waited — or that read availability BEFORE the
    // lock and then refused on a stale zero — passes R1 and fails here. The
    // loser re-read a shelf that still had one unit on it, and was served.
    expect(outcome.R3.bError).toBeNull();
    expect(outcome.R3.sales).toBe(2);
    expect(outcome.R3.shelf).toBe(0);
  });
});

// ===========================================================================
describe('the ledger survived all three races', () => {
  test('the §2.4 invariant holds across every lot this file touched', async () => {
    // Green here proves less than it looks, and `allocation-race.test.ts` says
    // so too: the invariant holds in the oversold world of R2 as well — every
    // total still balances, which is exactly why availability had to be tested
    // rather than reasoned about. It is asserted because a race that broke the
    // projection would be a second, worse defect.
    const { rows } = await observer.client.query<{ n: string }>(
      `select count(*)::text as n from public.batch_balance_violations()`,
    );
    expect(Number(rows[0]?.n)).toBe(0);
  });

  test('five sales landed in total, and every one went through the RPC', async () => {
    // The floor under the whole file. Nine `expect`s above are about refusals
    // and blocked sessions, and a fixture whose stock never arrived would make
    // several of them pass for the wrong reason — the vacuous shape 3.1's
    // counter and 3.4's floor both exist to refuse. R1 sold one, R2 two, R3 two.
    const { rows } = await observer.client.query<{ sales: string; lines: string; moves: string }>(
      `select (select count(*) from public.sale)::text as sales,
              (select count(*) from public.sale_line)::text as lines,
              (select count(*) from public.stock_movement
                where reason = 'sale')::text as moves`,
    );
    expect([rows[0]?.sales, rows[0]?.lines, rows[0]?.moves]).toEqual(['5', '5', '5']);
  });
});
