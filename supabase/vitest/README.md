# `supabase/vitest/` — the two-connection suites

ADR-035 §2.10's last row is the only one whose **Where** column reads *"TypeScript,
two connections"*. This package is where it lives. Plan tasks **3.7a**, **3.7b** and
**4c-ii**.

**Three suites, and §2.10's concurrency row is CLOSED as of 4c-ii.**

| File | Claim | Owed to |
|---|---|---|
| `idempotency.test.ts` | *"Two identical calls, same id → exactly one row"* | ADR-035 §2.10 (task 3.7a) |
| `availability-race.test.ts` | *"Two sessions, last unit, **enforcement on** → exactly one succeeds"* | ADR-035 §2.10 (task 4c-ii) |
| `allocation-race.test.ts` | *"Two concurrent allocations cannot oversell one batch"* | `docs/PLAN.md` task 1.3b (ported in 3.7b) |

⚠️ **Rows two and three assert opposite outcomes, on purpose.** §2.10's enforcement
clause **refuses** the loser; `allocate_fefo()` makes the loser **wait, re-read and
take the next lot**, so both sessions succeed. Neither claim implies the other, both
are true of the applied schema, and the difference between them is the twenty lines
`0017` added. The third suite is here because it needs two connections — not because
§2.10 asked for it.

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
| *"Two sessions, last unit, **enforcement on** → exactly one succeeds"* | ✅ **`availability-race.test.ts`, task 4c-ii, 2026-09-04.** Three races, thirteen tests. The path itself is `0017` (task 4c-i), whose falsification **F6 deleted the `for update` and turned none of its 35 single-connection checks red** — the gap this suite exists to close, and W-F1 below is the same deletion run against it |

### `idempotency.test.ts` — three races per header (`sale`, `purchase`, `waste`), nine tests

1. **The retry blocks, then inserts nothing.** `on conflict (id) do nothing` — ADR-035
   §2.6 decision 7.
2. **Without `on conflict`, the retry is rejected** with `23505`. ADR-035 §2.3:
   *"a duplicate primary key is an error, not a no-op"* — the sentence that made §2.6
   specify semantics rather than assume them.
3. **When the first call aborts, the waiter inserts.** §2.6's clause is *"until the
   first commits **or aborts**, then either sees the row or **inserts**"*, and only
   this branch tells an idempotent retry apart from one that was refused outright.

### `availability-race.test.ts` — three races, thirteen tests

§2.10's clause one, and the last cell of that row. One store, one variant per race,
one line of one unit; A sells and holds its transaction open, B fires the same ticket
while A is uncommitted, the observer names who B is waiting on, and only then does A
commit.

| | Enforcement | On the shelf | Outcome |
|---|---|---|---|
| **R1** | on | **1** | exactly one sale, the loser refused with `TD002`, shelf at **0** |
| **R2** | off — the shipped default | 1 | **both** sales record, shelf at **−1** |
| **R3** | on | 2 | **both** sales record, shelf at 0 |

**R2 and R3 are not padding; they are what stop R1 being green for the wrong reason.**

- **R2 is the pair.** Same fixture, same quantities, same two connections, same lock,
  same blocking pid — and the opposite answer. `enforce_stock` is the only thing that
  differs, so R1's refusal is `0017`'s twenty lines and not an artefact of racing. It
  is `supabase/tests/0016` check 6.2 raced: ADR-035 §1's *"stock is recorded, not
  enforced"*, with the debt visible as a negative balance rather than lost.
- ⚠️ **R3 IS THE ONE THE LITERAL CLAUSE DOES NOT COVER, AND IT CAUGHT A REAL WRONG
  ANSWER.** *"Two sessions, last unit → exactly one succeeds"* is also satisfied by an
  implementation that refuses **every** concurrent second sale, stock or no stock —
  which is what `for update skip locked` produces, and `skip locked` is the idiom a
  reviewer reaches for around a contended row. **Falsification W-F5 applies it and all
  four of R1's outcome assertions stay green.** R3 — two units, both served — is what
  goes red. A one-race version of this file would have merged it.

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

⚠️ **It is measured, not decorative.** Falsification W-F4 makes the race not race — A
commits before B is fired — and **nine of `availability-race.test.ts`'s thirteen tests
stay green**: the shelf still empties, the loser is still refused with `TD002`, the
counts still come out exactly right. The four that go red are the three `blockedBy`
assertions and the "blocked before either call committed" guard beside them. Without
them this suite would be a slow re-statement of `supabase/tests/0017`.

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

⚠️ **A SUITE THAT DIES IN `beforeAll` REPORTS ZERO FAILING TESTS**, and 4c-ii measured
it. `availability-race.test.ts` races inside `beforeAll`, so a schema defect that makes
session A's own call raise takes the whole file down before one assertion runs. Vitest's
JSON reporter then says `success: false`, `numTotalTests: 29` and **`numFailedTests: 0`**
— so two of the three guards in `db.yml`'s node block wave it through and only
`if (!r.success)` catches it. That line is load-bearing, not belt-and-braces. Observed
under falsification W-F3, and the same badly-shaped red `supabase/tests/0016` and `0017`
both record for their own bare calls.
