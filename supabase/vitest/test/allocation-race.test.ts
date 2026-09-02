// ============================================================================
// Two concurrent allocations cannot oversell one batch — ADR-035 §2.4
// ============================================================================
// Plan task 3.7b. This is the claim `supabase/tests/0005_allocation_concurrency.sh`
// made from plan task 1.3b, ported onto the 3.7a harness and the `.sh` retired.
// The reasoning for porting rather than keeping it is in docs/PLAN.md; the short
// version is that the `.sh` needed `psql`, the schema owner's machine has none,
// and a suite about `allocate_fefo()` that only CI can run is a suite nobody
// consults while changing `allocate_fefo()` — which is what step 4 does next.
//
// ⚠️ THIS IS NOT §2.10's CONCURRENCY ROW, and it never was. §2.10 asserts "two
// sessions, last unit, enforcement on → EXACTLY ONE SUCCEEDS", which is the
// availability check inside `record_sale` (`0006`, step 4). This file asserts
// the opposite outcome for a different mechanism: BOTH sessions succeed, because
// `allocate_fefo()`'s `for update of bb` makes the second one re-read and fall
// through to the next lot. Both claims are true and neither implies the other.
// It lives here because it needs two connections, not because §2.10 asked for it.
//
// THE FIXTURE IS BUILT SO THE BUG WOULD BE VISIBLE. Two lots of 100 for one
// variant at one store: P expires first, Q expires later. Each session asks for
// exactly 100.
//
//   with the lock  — S1 takes all of P; S2 waits, re-reads, takes all of Q.
//                    P = 0 and Q = 0.
//   without it     — both read P at 100 and both allocate P. P = -100, Q = 100:
//                    the shop has sold 200 units of a lot that held 100 while a
//                    whole lot sat untouched. THE §2.4 INVARIANT STILL HOLDS AND
//                    EVERY TOTAL STILL BALANCES, which is why this has to be
//                    tested rather than reasoned about — batch_balance_violations()
//                    is blind to it, and so is every check in 0005_allocation.sql.
//
// ✅ WHAT THE PORT GAINS, AND IT IS NOT ONLY THE MISSING psql. The `.sh` had to
// queue both statements of a session into one psql script, so all it could see was
// THAT its second backend sat in some lock wait at some point — true in both worlds
// above, which is why its own header says that check discriminates nothing and why
// an earlier draft of it passed green with the locking clause deleted. Here the two
// statements are separate round trips, so the wait is observed WHILE ONLY THE
// ALLOCATION SELECT IS OUTSTANDING. Without `for update of bb` that select returns
// at once and the wait moves down to the movement insert, which is a different
// statement — so `pg_blocking_pids()` comes back EMPTY and the same assertion that
// was decoration in bash is now a discriminator. Measured, not argued: deleting the
// clause turns three of the seven tests below red (falsification W1, docs/PLAN.md).
// The `.sh`'s own discriminator — WHICH LOT session 2 ended up with — is asserted
// below as well, because a block observed in the right place is still not the
// property; re-reading after it is.
//
// THE RACE RUNS ONCE, IN beforeAll, and each claim below is a test over what it
// recorded. Running it per test would re-race six times to assert six things about
// one sequence, and a race that fails mid-way would then take every later test
// with it — nine red lines for one defect (the same reason the idempotency suite
// beside this one rolls back in afterEach).
// ============================================================================

import { beforeAll, afterAll, describe, expect, test } from 'vitest';
import {
  blockedBy,
  buildFixture,
  cleanup,
  close,
  open,
  type Fixture,
  type Session,
} from '../src/harness.js';

// Fixed, so a failure message names the lot rather than a fresh uuid. The prefix
// is the `.sh`'s, kept deliberately: it is the same fixture, and a reader who
// finds the old file in git history should be able to line the two up.
const P = 'ffff0005-0000-0000-0000-000000000001';
const Q = 'ffff0005-0000-0000-0000-000000000002';

const ALLOCATE = `select batch_id, qty_base::int as qty
                    from public.allocate_fefo($1, $2, $3, 100, $4, now())`;

/** The withdrawal the allocation authorises. A downward count, not a sale:
 *  `sale` would demand a sale_id (stock_movement_source_agrees) and this file is
 *  about the allocator, not about documents. §2.4 counts a downward count as a
 *  withdrawal like any other. */
const WITHDRAW = `insert into public.stock_movement
                    (workspace_id, location_id, batch_id, variant_id, reason,
                     qty_base, unit_cost_net_per_base, occurred_at, created_by)
                  select $1, $2, $3, $4, 'adjustment', -$5::numeric,
                         sb.unit_cost_net_per_base, now(), $6
                    from public.stock_batch sb where sb.id = $3`;

interface Alloc { batch_id: string; qty: number }

let a: Session;
let b: Session;
let observer: Session;
let fixture: Fixture;
let variantId: string;

/** Everything the race is asked about, recorded as it happens. */
const seen = {
  lotsBefore: '',
  fefoOrder: [] as string[],
  blockers: [] as number[],
  movementsWhileBlocked: -1,
  aAllocated: [] as Alloc[],
  bAllocated: [] as Alloc[],
  lotsAfter: '',
  violations: -1,
};

const lots = async (): Promise<string> => {
  const { rows } = await observer.client.query<{ shape: string }>(
    `select (select remaining_base::int from public.batch_balance where batch_id = $1)
            || '/' ||
            (select remaining_base::int from public.batch_balance where batch_id = $2)
       as shape`,
    [P, Q],
  );
  return rows[0]?.shape ?? 'unreadable';
};

const withdraw = async (s: Session, allocated: Alloc[]): Promise<void> => {
  for (const row of allocated) {
    await s.client.query(WITHDRAW, [
      fixture.workspaceId, fixture.locationId, row.batch_id, variantId,
      row.qty, fixture.userId,
    ]);
  }
};

beforeAll(async () => {
  a = await open();
  b = await open();
  observer = await open();
  await cleanup(observer);
  fixture = await buildFixture(observer);

  // ---- the fixture: one variant, two open lots of 100 --------------------
  const q = observer.client;
  const fam = await q.query<{ id: string }>(
    `insert into public.product_family (workspace_id, name)
     values ($1, 'Abarrotes') returning id`,
    [fixture.workspaceId],
  );
  const variant = await q.query<{ id: string }>(
    `insert into public.product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code)
     values ($1, $2, 'Jitomate a granel', 'g', 'kg', 'g', 'g') returning id`,
    [fixture.workspaceId, fam.rows[0]?.id],
  );
  variantId = variant.rows[0]?.id ?? '';
  if (!variantId) throw new Error('fixture: no variant');

  // P expires first, so FEFO offers it to BOTH sessions. Q is the lot the second
  // session has to fall through to once it sees what the first one did.
  for (const [id, cost, days] of [[P, 0.01, 1], [Q, 0.02, 5]] as const) {
    await q.query(
      `insert into public.stock_batch (id, workspace_id, location_id, variant_id,
         origin, qty_received_base, unit_cost_net_per_base, expiry_date, created_by)
       values ($1, $2, $3, $4, 'adjustment', 100, $5, current_date + $6::int, $7)`,
      [id, fixture.workspaceId, fixture.locationId, variantId, cost, days, fixture.userId],
    );
    await q.query(
      `insert into public.stock_movement (workspace_id, location_id, batch_id,
         variant_id, reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
       select sb.workspace_id, sb.location_id, sb.id, sb.variant_id, 'adjustment',
              sb.qty_received_base, sb.unit_cost_net_per_base, now(), $2
         from public.stock_batch sb where sb.id = $1`,
      [id, fixture.userId],
    );
  }
  seen.lotsBefore = await lots();
  // The order the allocator will actually walk, on its own three keys. Asserted
  // rather than assumed: "P expires first" is the premise the whole file rests
  // on, and a fixture that quietly opened them the other way round would leave
  // every assertion below reading as a defect in allocate_fefo().
  seen.fefoOrder = (
    await observer.client.query<{ batch_id: string }>(
      `select bb.batch_id
         from public.batch_balance bb
        where bb.variant_id = $1 and bb.remaining_base > 0
        order by bb.expiry_date asc nulls last, bb.received_at asc, bb.batch_id asc`,
      [variantId],
    )
  ).rows.map((r) => r.batch_id);

  // ---- session 1: takes all of P, and does not commit --------------------
  const args = [fixture.workspaceId, fixture.locationId, variantId, fixture.userId];
  await a.client.query('begin');
  seen.aAllocated = (await a.client.query<Alloc>(ALLOCATE, args)).rows;
  await withdraw(a, seen.aAllocated);

  // ---- session 2: asks for the same 100 while session 1 holds the locks --
  // NOT awaited: it has to still be in flight while session 1's transaction is
  // open, which is the whole reason this file needs two connections.
  await b.client.query('begin');
  const bAlloc = b.client.query<Alloc>(ALLOCATE, args);

  seen.blockers = await blockedBy(observer, b.pid);
  seen.movementsWhileBlocked = Number(
    (await observer.client.query<{ n: string }>(
      `select count(*)::text as n from public.stock_movement where variant_id = $1`,
      [variantId],
    )).rows[0]?.n ?? -1,
  );

  await a.client.query('commit');
  seen.bAllocated = (await bAlloc).rows;
  await withdraw(b, seen.bAllocated);
  await b.client.query('commit');

  seen.lotsAfter = await lots();
  seen.violations = Number(
    (await observer.client.query<{ n: string }>(
      `select count(*)::text as n from public.batch_balance_violations()`,
    )).rows[0]?.n ?? -1,
  );
}, 60_000);

afterAll(async () => {
  // A race that failed part-way leaves a transaction open and the lots locked.
  await a.client.query('rollback').catch(() => {});
  await b.client.query('rollback').catch(() => {});
  await close(a, b, observer);
});

describe('two sessions allocate the same 100 units at once', () => {
  test('the fixture is two open lots of 100, and FEFO offers P first', () => {
    expect(seen.lotsBefore).toBe('100/100');
    expect(seen.fefoOrder).toEqual([P, Q]);
  });

  test('the second session is made to WAIT, and the blocker is the first', () => {
    // pg_blocking_pids() and not `wait_event_type = 'Lock'`: it names WHO. The
    // `.sh` could only assert that some lock wait existed, which is also true of
    // an autovacuum worker or of the observer's own transaction.
    expect(seen.blockers).toEqual([a.pid]);
  });

  test('it is blocked at the ALLOCATION, before it has written anything', () => {
    // Two movements exist — the two receipts. Session 1's withdrawal is still
    // UNCOMMITTED and session 2 has not reached its own, so this is the second
    // half of the anti-vacuity guard: it fails at 3 if session 1 committed before
    // session 2 ever started, which is what a race that did not race looks like
    // from every other line in this file.
    expect(seen.movementsWhileBlocked).toBe(2);
  });

  test('session 1 took all of P, the lot that expires first', () => {
    expect(seen.aAllocated).toEqual([{ batch_id: P, qty: 100 }]);
  });

  test('having waited, session 2 allocates Q — NOT the lot session 1 emptied', () => {
    // THE DISCRIMINATING CHECK, and the `.sh`'s own. Waiting is not the property:
    // a session that blocked and then wrote what it had already decided is the
    // oversell. It has to have RE-READ.
    expect(seen.bAllocated).toEqual([{ batch_id: Q, qty: 100 }]);
  });

  test('NEITHER LOT WAS OVERSOLD — 200 asked, 200 delivered, both lots at zero', () => {
    expect(seen.lotsAfter).toBe('0/0');
  });

  test('and the §2.4 invariant survived the race', () => {
    // Green here proves less than it looks: the invariant holds in the oversold
    // world too (see the header). It is asserted because a race that broke the
    // projection would be a second, worse defect, not because it discriminates.
    expect(seen.violations).toBe(0);
  });
});
