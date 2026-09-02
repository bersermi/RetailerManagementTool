# `supabase/vitest/` — the §2.10 concurrency suite

ADR-035 §2.10's last row is the only one whose **Where** column reads *"TypeScript,
two connections"*. This package is that. Plan task **3.7a**.

## Why it is not pgTAP, and not a `.sh`

A single session cannot block on its own lock. Every claim here is about what happens
while **two calls are in flight at once**, so a one-connection version of any of them
passes green with the mechanism deleted — the same trap
`supabase/tests/0005_allocation_concurrency.sh` was written to avoid for the
allocator, and the reason that file is a `.sh` rather than a `.sql`.

It needs **no `psql`**. node-postgres speaks the wire protocol, so this suite runs on
a machine that has never installed a Postgres client — which the schema owner's
machine is (see `docs/PLAN.md`, the 3.1 note). The `.sh` beside it has therefore never
been run outside CI; this one has.

## What it asserts, and what it does not

| §2.10 clause | Here? |
|---|---|
| *"Two identical calls, same id → exactly one row"* | ✅ over all three document headers |
| *"Two sessions, last unit, **enforcement on** → exactly one succeeds"* | ❌ the enforcement path is inside `record_sale` — `0006`, build step 4 |

Three races per header (`sale`, `purchase`, `waste`), nine tests:

1. **The retry blocks, then inserts nothing.** `on conflict (id) do nothing` — ADR-035
   §2.6 decision 7.
2. **Without `on conflict`, the retry is rejected** with `23505`. ADR-035 §2.3:
   *"a duplicate primary key is an error, not a no-op"* — the sentence that made §2.6
   specify semantics rather than assume them.
3. **When the first call aborts, the waiter inserts.** §2.6's clause is *"until the
   first commits **or aborts**, then either sees the row or **inserts**"*, and only
   this branch tells an idempotent retry apart from one that was refused outright.

⚠️ **It makes no RLS claim.** Every connection is the `postgres` superuser, which
bypasses RLS — an isolation check run that way passes vacuously
(`supabase/README.md`). Isolation is `supabase/pgtap/02`–`05`, under
`set role authenticated`.

## The anti-vacuity guard

Every assertion above is *also* true of two calls that never overlapped: the second
would find the row committed, insert nothing, and the counts would come out identical.
So each test asserts, before anything else, that the second session is **blocked by
the first**:

```ts
expect(await blockedBy(observer, b.pid)).toEqual([a.pid]);
```

`pg_blocking_pids()` and not `wait_event_type = 'Lock'`, because it names *who* is
blocking. The `.sh` could only assert that some lock wait existed.

## Running it

```sh
supabase db reset
DB_URL="$(supabase status -o env | grep '^DB_URL=' | cut -d'"' -f2)" \
  npm run test:db --workspace @tienda/db-concurrency
```

⚠️ **The script is `test:db`, not `test`, on purpose.** The root manifest runs
`npm run test --workspaces --if-present`, and a package named `test` here would make
`npm test` at the repository root fail on any machine without a database running —
which is every machine that has only ever touched `packages/money`. `typecheck` keeps
its ordinary name, because it needs nothing.

It **truncates the database** (via `supabase/tests/_cleanup.sql` — the same file the
psql suites run, not a copy) and builds its own fixture, so in CI it is the **last**
step. See the comment on that step in `.github/workflows/db.yml`.
