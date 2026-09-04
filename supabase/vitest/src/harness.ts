// ============================================================================
// Two real connections against the reset database — ADR-035 §2.10, task 1.3b
// ============================================================================
// Plan tasks 3.7a and 3.7b. §2.10's concurrency row is the only one whose
// `Where` column says "TypeScript, two connections", and the reason is the same
// one that made
// supabase/tests/0005_allocation_concurrency.sh a `.sh` rather than a `.sql`: a
// single session cannot block on its own lock, so a one-connection test of a
// race asserts nothing and passes just as green with the mechanism deleted.
// ⚠️ That `.sh` is gone as of task 3.7b: its claim is now
// test/allocation-race.test.ts, on this harness. THREE suites share these
// helpers as of task 4c-ii, so a change here is a change to all three.
//
// WHAT THIS FILE IS NOT. It makes no RLS claim and does not try to. Every
// connection here is the `postgres` superuser, which bypasses RLS — as
// supabase/README.md warns, an isolation check run that way passes vacuously.
// Isolation is asserted by supabase/pgtap/02–05 under `set role authenticated`,
// and the properties this suite is about — row locking and primary-key conflict
// resolution — are neither created nor removed by a policy.
//
// It needs DB_URL and A DATABASE THAT WAS JUST RESET, like every suite beside
// it. It needs NO psql: node-postgres speaks the wire protocol directly, so
// these suites run on a machine that has never installed a Postgres client. That
// is not a convenience — the schema owner's machine is such a machine, which is
// why the retired `.sh` was never once run outside CI (see the 3.1 note in
// docs/PLAN.md), and why 3.7b moved its claim here rather than leaving it.
//
//   supabase db reset
//   DB_URL="$(supabase status -o env | grep '^DB_URL=' | cut -d'"' -f2)" \
//     npm run test:db --workspace @tienda/db-concurrency
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
export type Conn = InstanceType<typeof pg.Client>;

/** Absolute path to a file in the repo, resolved from this module, not from cwd. */
const repoFile = (rel: string) =>
  fileURLToPath(new URL(`../../../${rel}`, import.meta.url));

export function dbUrl(): string {
  const url = process.env['DB_URL'];
  if (!url) {
    throw new Error(
      'DB_URL must be set — see the header of supabase/vitest/src/harness.ts',
    );
  }
  return url;
}

/** A connection, with its backend pid read once so the race can be observed. */
export interface Session {
  client: Conn;
  pid: number;
}

export async function open(): Promise<Session> {
  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  const { rows } = await client.query<{ pid: number }>(
    'select pg_backend_pid()::int as pid',
  );
  const pid = rows[0]?.pid;
  if (pid === undefined) throw new Error('could not read pg_backend_pid()');
  return { client, pid };
}

export async function close(...sessions: Session[]): Promise<void> {
  for (const s of sessions) {
    try {
      await s.client.end();
    } catch {
      /* a session killed by a failed test has nothing left to close */
    }
  }
}

// ---------------------------------------------------------------------------
// Cleanup, shared with the psql suites rather than reimplemented
// ---------------------------------------------------------------------------
// supabase/tests/_cleanup.sql is pure SQL — one `set` and one `do` block, no
// psql meta-commands — so it runs unchanged over the wire. Reading THE SAME FILE
// the behavioural step runs is the same argument §2.10 makes about cases.json:
// a second copy of the sweep would drift, and the drift would show up as this
// suite counting somebody else's fixture.
export async function cleanup(s: Session): Promise<void> {
  await s.client.query(readFileSync(repoFile('supabase/tests/_cleanup.sql'), 'utf8'));
}

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------
export interface Fixture {
  workspaceId: string;
  locationId: string;
  providerId: string;
  userId: string;
}

const OWNER = '11111111-1111-1111-1111-111111111111';

export async function buildFixture(s: Session): Promise<Fixture> {
  const q = s.client;

  await q.query(`insert into auth.users (id, email) values ($1, 'owner.a@example.mx')`, [
    OWNER,
  ]);

  // onboard_workspace() reads auth.uid(), so it needs a claim — and only for
  // the length of that call. Cleared immediately: nothing else here is a claim
  // about who is asking.
  await q.query(
    `select set_config('request.jwt.claims',
       json_build_object('sub', $1::text, 'role', 'authenticated')::text, false)`,
    [OWNER],
  );
  const ws = await q.query<{ id: string }>(`select public.onboard_workspace('Tienda A') as id`);
  await q.query(`select set_config('request.jwt.claims', null, false)`);

  const workspaceId = ws.rows[0]?.id;
  if (!workspaceId) throw new Error('onboard_workspace returned no workspace');

  const loc = await q.query<{ id: string }>(
    `select id from public.location where workspace_id = $1`,
    [workspaceId],
  );
  const locationId = loc.rows[0]?.id;
  if (!locationId) throw new Error('onboard_workspace created no location');

  // purchase.provider_id is not null and onboard_workspace does not yet create
  // the generic provider (an open ADR-035 §8 follow-up), so the fixture makes one.
  const prov = await q.query<{ id: string }>(
    `insert into public.provider (workspace_id, name) values ($1, 'Proveedor A') returning id`,
    [workspaceId],
  );
  const providerId = prov.rows[0]?.id;
  if (!providerId) throw new Error('provider insert returned nothing');

  return { workspaceId, locationId, providerId, userId: OWNER };
}

// ---------------------------------------------------------------------------
// Observing the race, rather than assuming it
// ---------------------------------------------------------------------------
// THIS IS THE ANTI-VACUITY GUARD OF THE WHOLE SUITE. Without it every assertion
// below is also true of two calls that never overlapped at all — the second one
// would find the row committed, insert nothing, and the counts would come out
// identical. "Exactly one row" is only evidence about concurrency if the second
// call is proven to have been IN FLIGHT while the first was uncommitted.
//
// pg_blocking_pids() and not `wait_event_type = 'Lock'`: it names WHO is
// blocking, so the test asserts the second session is waiting on the FIRST and
// not on an autovacuum worker or on the observer's own transaction. The `.sh`
// could only assert that some lock wait existed.
export async function blockedBy(
  observer: Session,
  waiter: number,
  timeoutMs = 10_000,
): Promise<number[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { rows } = await observer.client.query<{ blockers: number[] }>(
      'select pg_blocking_pids($1) as blockers',
      [waiter],
    );
    const blockers = rows[0]?.blockers ?? [];
    if (blockers.length > 0) return blockers;
    if (Date.now() > deadline) return [];
    await new Promise((r) => setTimeout(r, 25));
  }
}

/** Postgres error code of a rejected statement, or null if it was accepted. */
export async function errcode(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    const code = (e as { code?: unknown }).code;
    return typeof code === 'string' ? code : `non-pg error: ${String(e)}`;
  }
}

// ---------------------------------------------------------------------------
// A claim on a session, for the suites that call an RPC
// ---------------------------------------------------------------------------
// The two 3.7 suites INSERT, so they need no caller: they run as the `postgres`
// superuser and the rows carry `created_by` explicitly. Every `record_*`
// function does not have that option — `record_sale` reads `auth.uid()` for
// `sale.created_by` and validates `p_location_id` against `my_locations()`, both
// of which resolve through `request.jwt.claims`. A superuser with no claim is
// refused by the location wall, which is the correct behaviour and useless as a
// fixture.
//
// ⚠️ `is_local` IS FALSE AND THAT IS DELIBERATE. A session-level setting
// survives the `commit`/`rollback` at the end of each race; a transaction-local
// one would silently vanish and the NEXT call on that connection would be
// refused by the location wall — a red that reads as a defect in the wall.
//
// ⚠️ THIS BUYS NO RLS CLAIM. The connection is still the superuser and RLS is
// still bypassed (supabase/README.md). It supplies an identity to functions that
// ASK for one; it does not put a policy between this suite and a row. Isolation
// is supabase/pgtap/02–05, under `set role authenticated`.
export async function authenticate(s: Session, userId: string): Promise<void> {
  await s.client.query(
    `select set_config('request.jwt.claims',
       json_build_object('sub', $1::text, 'role', 'authenticated')::text, false)`,
    [userId],
  );
}
