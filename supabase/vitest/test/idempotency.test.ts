// ============================================================================
// §2.10, concurrency row, clause two:
//   "Two identical calls, same id → exactly one row"
// ============================================================================
// Plan task 3.7a. ADR-035 §2.6 decision 7 settled the idempotency semantics as
// `on conflict (id) do nothing` over a CLIENT-GENERATED primary key, and §2.3
// records why the semantics had to be specified at all:
//
//   "a duplicate primary key is an error, not a no-op"
//
// Both of those are claims about what Postgres does when two calls carrying the
// same id are IN FLIGHT AT ONCE, and neither can be made from one connection.
// A single session cannot block on its own lock, so a one-connection version of
// every test below passes green with the primary key deleted.
//
// ⚠️ WHAT THIS SUITE DOES NOT COVER, AND WHO OWES IT. §2.6's table has four
// rows and the applied schema can carry two. `already_recorded: true` is a
// RETURN VALUE and a table has no return value; same id + a different
// payload_hash → raise and dead-letter needs `failed_write`. Both are
// `record_sale`/`0006` and `0007` — build steps 4 and 4.5. So is the OTHER
// clause of §2.10's concurrency row, "two sessions, last unit, enforcement on →
// exactly one succeeds": the enforcement path lives inside the RPC (§2.6,
// "built, dormant") and there is nothing yet for it to switch on. docs/PLAN.md
// records all of this under task 3.7a rather than letting this file's green read
// as the whole row.
// ============================================================================

import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import {
  blockedBy,
  buildFixture,
  cleanup,
  close,
  errcode,
  open,
  type Fixture,
  type Session,
} from '../src/harness.js';

// Three document headers, not one. §2.6 says "every `record_*` function", and
// the idempotency key is a shape all three tables share — asserting it on `sale`
// alone would leave the claim resting on the table somebody happened to pick.
interface Doc {
  table: 'sale' | 'purchase' | 'waste';
  sql: (onConflict: boolean) => string;
  params: (f: Fixture, id: string, hash: string) => unknown[];
}

const DOCS: Doc[] = [
  {
    table: 'sale',
    sql: (oc) =>
      `insert into public.sale
         (id, workspace_id, location_id, occurred_at, total_net, total_tax,
          created_by, payload_hash)
       values ($1, $2, $3, now(), 100.00, 16.00, $4, $5)
       ${oc ? 'on conflict (id) do nothing' : ''}`,
    params: (f, id, hash) => [id, f.workspaceId, f.locationId, f.userId, hash],
  },
  {
    table: 'purchase',
    sql: (oc) =>
      `insert into public.purchase
         (id, workspace_id, location_id, provider_id, occurred_at, total_net,
          total_tax, created_by, payload_hash)
       values ($1, $2, $3, $4, now(), 100.00, 16.00, $5, $6)
       ${oc ? 'on conflict (id) do nothing' : ''}`,
    params: (f, id, hash) => [
      id,
      f.workspaceId,
      f.locationId,
      f.providerId,
      f.userId,
      hash,
    ],
  },
  {
    table: 'waste',
    sql: (oc) =>
      `insert into public.waste
         (id, workspace_id, location_id, occurred_at, total_net, total_tax,
          created_by, payload_hash)
       values ($1, $2, $3, now(), 100.00, 16.00, $4, $5)
       ${oc ? 'on conflict (id) do nothing' : ''}`,
    params: (f, id, hash) => [id, f.workspaceId, f.locationId, f.userId, hash],
  },
];

let a: Session;
let b: Session;
let observer: Session;
let fixture: Fixture;

beforeAll(async () => {
  a = await open();
  b = await open();
  observer = await open();
  await cleanup(observer);
  fixture = await buildFixture(observer);
}, 60_000);

afterAll(async () => {
  await close(a, b, observer);
});

// A test that fails mid-race leaves A and B inside open transactions holding the
// row lock, and every test after it then blocks for the full timeout and fails
// too — nine red lines for one defect, with the real one buried. This is
// diagnosis, not an assertion: the falsifications below all still fail, they
// just now say which one broke.
afterEach(async () => {
  await a.client.query('rollback').catch(() => {});
  await b.client.query('rollback').catch(() => {});
});

const rowsWithId = async (table: string, id: string): Promise<number> => {
  const { rows } = await observer.client.query<{ n: string }>(
    `select count(*)::text as n from public.${table} where id = $1`,
    [id],
  );
  return Number(rows[0]?.n ?? -1);
};

describe.each(DOCS)('$table — the same id from two connections at once', (doc) => {
  test('the retry blocks on the first call, then inserts nothing', async () => {
    const id = crypto.randomUUID();

    await a.client.query('begin');
    const first = await a.client.query(doc.sql(true), doc.params(fixture, id, 'h1'));
    expect(first.rowCount).toBe(1);

    // B is NOT awaited. This is the whole point of the file: it has to still be
    // in flight while A holds an uncommitted row carrying the same key.
    await b.client.query('begin');
    const second = b.client.query(doc.sql(true), doc.params(fixture, id, 'h1'));

    // THE ANTI-VACUITY ASSERTION. Everything after this is also true of two
    // calls that never overlapped. Naming A's pid is what makes it evidence
    // about THIS race — ADR-035 §2.6, "the second call blocks on the row lock
    // until the first commits or aborts".
    expect(await blockedBy(observer, b.pid)).toEqual([a.pid]);

    // Uncommitted, so nothing is visible to anyone else yet.
    expect(await rowsWithId(doc.table, id)).toBe(0);

    await a.client.query('commit');
    const secondResult = await second;
    await b.client.query('commit');

    expect(secondResult.rowCount).toBe(0);
    expect((first.rowCount ?? 0) + (secondResult.rowCount ?? 0)).toBe(1);
    expect(await rowsWithId(doc.table, id)).toBe(1);
  });

  test('without `on conflict` the retry is REJECTED, not silently absorbed', async () => {
    // ADR-035 §2.3: "a duplicate primary key is an error, not a no-op" — the
    // sentence that made §2.6 specify semantics instead of assuming them. If
    // this test ever goes green with a rowCount instead of a 23505, the key is
    // not a key and the test above is measuring nothing.
    const id = crypto.randomUUID();

    await a.client.query('begin');
    await a.client.query(doc.sql(false), doc.params(fixture, id, 'h1'));

    await b.client.query('begin');
    // ⚠️ `errcode()` WRAPS THE CALL AT CREATION, AND THAT IS NOT A STYLE CHOICE.
    // This is the one deferred query in this file that REJECTS — the other two
    // use `on conflict` and resolve — and until something is attached to it, a
    // rejection delivered before the `await errcode(...)` below is an UNHANDLED
    // REJECTION. Vitest counts that as an error and fails the run with every
    // assertion green: 29 passed, 1 error, exit 1. Seen on CI 2026-09-05 (run
    // 33972448395), on a commit that touched no TypeScript at all — the window
    // between the two `await`s below is only ever a scheduling accident wide.
    // `availability-race.test.ts` already wraps at creation for this reason.
    const second = errcode(b.client.query(doc.sql(false), doc.params(fixture, id, 'h1')));

    expect(await blockedBy(observer, b.pid)).toEqual([a.pid]);

    await a.client.query('commit');
    expect(await second).toBe('23505');
    await b.client.query('rollback');

    expect(await rowsWithId(doc.table, id)).toBe(1);
  });

  test('when the first call ABORTS, the waiter inserts — one row, and it is the second one', async () => {
    // §2.6's clause is "until the first commits OR ABORTS, then either sees the
    // row or INSERTS", and only the abort branch can tell the retry apart from a
    // call that was refused outright. Without this, an implementation that
    // returned 0 rows unconditionally would pass every other test here.
    const id = crypto.randomUUID();

    await a.client.query('begin');
    const first = await a.client.query(doc.sql(true), doc.params(fixture, id, 'h1'));
    expect(first.rowCount).toBe(1);

    await b.client.query('begin');
    const second = b.client.query(doc.sql(true), doc.params(fixture, id, 'h2'));

    expect(await blockedBy(observer, b.pid)).toEqual([a.pid]);

    await a.client.query('rollback');
    const secondResult = await second;
    await b.client.query('commit');

    expect(secondResult.rowCount).toBe(1);
    expect(await rowsWithId(doc.table, id)).toBe(1);

    // The surviving row is B's, which is what makes the abort branch visible.
    const { rows } = await observer.client.query<{ payload_hash: string }>(
      `select payload_hash from public.${doc.table} where id = $1`,
      [id],
    );
    expect(rows[0]?.payload_hash).toBe('h2');
  });
});
