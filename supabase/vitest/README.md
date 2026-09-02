# `supabase/vitest/` — the two-connection suites

ADR-035 §2.10's last row is the only one whose **Where** column reads *"TypeScript,
two connections"*. This package is where it lives. Plan tasks **3.7a** and **3.7b**.

**Two suites, and only one of them is §2.10's.**

| File | Claim | Owed to |
|---|---|---|
| `idempotency.test.ts` | *"Two identical calls, same id → exactly one row"* | ADR-035 §2.10 (task 3.7a) |
| `allocation-race.test.ts` | *"Two concurrent allocations cannot oversell one batch"* | `docs/PLAN.md` task 1.3b (ported in 3.7b) |

⚠️ **They assert opposite outcomes, on purpose.** §2.10's other clause refuses the
loser; `allocate_fefo()` makes the loser **wait, re-read and take the next lot**, so
both sessions succeed. Neither claim implies the other, and the second one is here
because it needs two connections — not because §2.10 asked for it.

## Why it is not pgTAP, and not a `.sh`

A single session cannot block on its own lock. Every claim here is about what happens
while **two calls are in flight at once**, so a one-connection version of any of them
passes green with the mechanism deleted — the same trap
`supabase/tests/0005_allocation_concurrency.sh` was written to avoid for the
allocator, and the reason that file was a `.sh` rather than a `.sql`. **That file is
gone as of 3.7b** — its claim is `allocation-race.test.ts`, below.

It needs **no `psql`**. node-postgres speaks the wire protocol, so this suite runs on
a machine that has never installed a Postgres client — which the schema owner's
machine is (see `docs/PLAN.md`, the 3.1 note). The retired `.sh` was therefore never
run outside CI — which is the argument that decided 3.7b: a suite about
`allocate_fefo()` that only CI can run is a suite nobody consults while changing
`allocate_fefo()`, and step 4 changes it next.

## What it asserts, and what it does not

| §2.10 clause | Here? |
|---|---|
| *"Two identical calls, same id → exactly one row"* | ✅ over all three document headers |
| *"Two sessions, last unit, **enforcement on** → exactly one succeeds"* | ❌ the enforcement path is inside `record_sale` — `0006`, build step 4 |

### `idempotency.test.ts` — three races per header (`sale`, `purchase`, `waste`), nine tests

1. **The retry blocks, then inserts nothing.** `on conflict (id) do nothing` — ADR-035
   §2.6 decision 7.
2. **Without `on conflict`, the retry is rejected** with `23505`. ADR-035 §2.3:
   *"a duplicate primary key is an error, not a no-op"* — the sentence that made §2.6
   specify semantics rather than assume them.
3. **When the first call aborts, the waiter inserts.** §2.6's clause is *"until the
   first commits **or aborts**, then either sees the row or **inserts**"*, and only
   this branch tells an idempotent retry apart from one that was refused outright.

### `allocation-race.test.ts` — one race, seven tests

Two lots of 100 for one variant at one store, P expiring first; both sessions ask for
exactly 100. **With `for update of bb`:** session 1 takes all of P, session 2 waits,
re-reads and takes all of Q — `0/0`. **Without it:** both read P at 100 and both
allocate P — `-100/100`, a lot oversold while a whole lot sat untouched, **and the
§2.4 invariant still holds and every total still balances**. That is why this is
tested rather than reasoned about: `batch_balance_violations()` is blind to it, and so
is every check in `0005_allocation.sql`.

1. **The fixture is two lots of 100 and FEFO offers P first** — asserted on the
   allocator's own three keys, so a fixture that quietly opened them the other way
   round cannot read as a defect in `allocate_fefo()`.
2. **The second session waits, and the blocker is the first.**
3. **It is blocked before it has written anything** — two movements, both receipts,
   session 1's withdrawal still uncommitted. This is what fails if the two calls never
   actually overlapped.
4. **Session 1 took all of P.**
5. **Having waited, session 2 allocates Q** — not the lot session 1 emptied. THE
   DISCRIMINATOR: waiting is not the property, re-reading after it is.
6. **Neither lot was oversold** — 200 asked, 200 delivered, both at zero.
7. **The §2.4 invariant survived** — which proves less than it looks, per above.

✅ **What the port gained over the `.sh`, beyond the missing `psql`.** The `.sh` had
to queue both statements of a session into one script, so it could see only that its
second backend sat in *some* lock wait — true whether or not the clause was there,
which its own header admitted and which let an early draft pass green with the locking
clause deleted. Here the statements are separate round trips, so the wait is observed
**while only the allocation `select` is outstanding**. Delete the clause and that
select returns at once, the wait moves to the movement insert, and
`pg_blocking_pids()` comes back empty — so the assertion that was decoration in bash
is a discriminator here. Measured: W1 in `docs/PLAN.md` turns three of the seven red.

⚠️ **It makes no RLS claim.** Every connection is the `postgres` superuser, which
bypasses RLS — an isolation check run that way passes vacuously
(`supabase/README.md`). Isolation is `supabase/pgtap/02`–`05`, under
`set role authenticated`.

## The anti-vacuity guard

Every assertion in both suites is *also* true of two calls that never overlapped: the
second would find the row committed, do nothing, and the counts would come out
identical. So each race asserts, before anything else, that the second session is
**blocked by the first**:

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
