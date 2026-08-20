# Build plan

The live status of the build. Update this file as steps close — it is the one
place that answers "where are we?" after a context clear.

**Architecture:** [`docs/adr/ADR-035`](adr/ADR-035-target-architecture-postgres-react-native.md).
Where this file and the ADR disagree, the ADR wins and this file is the bug.

**New here, or not a developer?** [`docs/HANDBOOK.md`](HANDBOOK.md) explains the
tooling, the working loop, and where Claude is likely to be wrong.

**Stack:** Postgres (Supabase) + React Native (Expo). Mexico-based small retailers,
MXN, IVA. Spanish module names are the domain vocabulary: Comprar (buy), Vender
(sell), Productos (catalog), Proveedores (providers), Desperdicio (waste),
Números (reports).

**Not the stack:** Power Apps Canvas + Dataverse. That era stopped 2026-08-14 and
lives in [`archive/power-platform/`](../archive/power-platform/README.md), excluded
from the knowledge graph. Nothing there describes the system being built.

---

## Position

**STEP 1 IS CLOSED. STEP 2 — the three Insight queries, the design gate — IS OPEN.**
Tasks 1.1, 1.2, 1.3a, 1.3b, 1.4, 1.5, 1.6a, 1.6b, 1.6c, 1.7 and 1.8 are all done.
**Step 2 was split into 2.1 / 2.2 / 2.3 on 2026-08-20**, before any of it was written —
one task per question, because the three read three different corners of the ledger.
**2.1 — margin by product — and 2.2 — waste as a share of purchases — are done**;
**2.4 — the shop timezone — is done, taken before 2.3 at the owner's instruction on
2026-08-20**; 2.3 is open and is now `0013`. See *Step 2* below. **2.2 found that the
division at the end of a waste report fails three ways and not one** — recorded, not
patched, because it is a property of the ledger rather than a defect. **The timezone
finding 2.1 raised and 2.2 doubled is FIXED**: `location.timezone` is a column, both
views read it, and the day boundary is testable for the first time.
**1.6 was split into 1.6a / 1.6b / 1.6c on 2026-08-18** with the owner's approval,
before any of it was written — it was the last **L** in step 1. The nineteen tables
of ADR-035 §2.3 that step 1 owed are applied, the seed writes three months of two
shops through the real allocator, and **the §2.4 invariant is asserted in CI over
that seed** rather than only over a fixture.
**Both findings the seed turned up are now fixed.** The owner's instruction on
2026-08-19 was to fix them immediately rather than fold them into the RPC migration, and
`0010` (task 1.8, below) is that fix: the allocators take the moment an event happened
instead of the moment it was written, and purchase-price memory decides its prefill from
the data instead of from a uuid. **No finding is outstanding.**
Every open decision in this file has been resolved; none is outstanding. Two
modelling choices made while building 1.3b, and three from 1.4, are listed below and
are the owner's to confirm or overturn. A fourth from 1.4 — who gets the purchase
price prefill — was **confirmed on 2026-08-18** and is closed. All five that remain
open are function bodies or a view definition, so revising any of them is a
`create or replace` in a new migration with no data to migrate — see the corrected
deadline under *Confirmed by the owner* below.

| Step | What | Status |
|------|------|--------|
| 0 | A Postgres you can actually run | **Done** — CI green |
| 1 | Migrations and seed script | **Done** |
| 2 | The three Insight queries — *the design gate* | **In progress** — 2 of 3, plus the timezone column 2.1 and 2.2 asked for |
| 3 | Test suites (pgTAP, Vitest) | Not started |
| 4 | RPCs — the ten functions of §2.6 | Not started |
| 4.5 | The failure path | Not started |
| 5a | Client foundation — **hiring gate** | Not started |
| 5b | Vender and Home | Not started |
| 6 | Comprar, Desperdicio, Catálogo, Proveedores | Not started |
| 7 | Números | Not started |

Steps 0–4.5 are the whole system; 5–7 are windows onto it (ADR-035 §3).

---

## Step 0 — a Postgres you can actually run ✅

OrbStack + Supabase CLI 2.114.0. `supabase db reset` applies `0001` clean.
All six confirmations in [`supabase/README.md`](../supabase/README.md) pass,
including RLS isolation run under `set role authenticated` — the `postgres`
superuser bypasses RLS and would pass vacuously.

CI gate: [`.github/workflows/db.yml`](../.github/workflows/db.yml). **Per ADR-035
§9 the local pass is not the bar — the green CI run is.** Confirmed: the workflow has
been green on every migration since it merged, and as of 1.2 it also runs every file
in `supabase/tests/` after the reset, so it asserts behaviour and not just that the
DDL parses.

*Corrected 2026-08-17.* This paragraph, and the matching one in
[`supabase/README.md`](../supabase/README.md), claimed CI had never run. It had —
three times, green, starting the moment the workflow merged, because it triggers on
push to `main` and not only on pull requests. Nobody had looked at the Actions tab.
The lesson is the one ADR-035 §9 is about and it cuts both ways: a status line is
never evidence, and that includes a pessimistic one.

---

## Step 1 — migrations and seed script ✅

Nineteen tables total (ADR-035 §2.3). `0001` delivered six; thirteen remain, plus
a seed. Migration numbering is fixed in [`supabase/README.md`](../supabase/README.md).

| # | Task | Size | Done when |
|---|------|------|-----------|
| ~~1.1~~ | ~~`0002` catalog~~ — **done** 2026-08-16. `db reset` green; zero cross-workspace leakage on all five tables under `set role authenticated`; generic provider undeletable and undemotable; price overlap, cross-dimension units and normalized-name duplicates all rejected | M | ✅ |
| ~~1.2~~ | ~~`0003` transactions~~ — **done** 2026-08-17, [CI green on PR #1](https://github.com/bersermi/RetailerManagementTool/actions/runs/32002904624). 39 behavioural checks pass in `supabase/tests/0003_transactions.sql`, now wired into the CI gate. Reversal self-FK rejects a void across a store or a tenant, a self-reversal and a second void of the same document; `on conflict (id) do nothing` leaves the committed totals alone; documents are append-only even to the superuser; staff read no cost; `waste_reason` is a closed vocabulary | M | ✅ |
| ~~1.3a~~ | ~~`0004` inventory~~ — **done** 2026-08-17, [CI green on PR #2](https://github.com/bersermi/RetailerManagementTool/actions/runs/32043051234). 54 behavioural checks pass in `supabase/tests/0004_inventory.sql`, now in the CI gate; `0003`'s 39 still pass. The §2.4 invariant holds across a reversal and a deliberate oversale; `rebuild_batch_balance()` reproduces every row exactly from `stock_movement` alone, and the check is shown able to fail. Batches and movements are append-only to the superuser; a batch cannot be relocated; cost is manager-only on both while `batch_balance` — which carries none — is member-level | M | ✅ |
| ~~1.3b~~ | ~~`0005` allocation~~ — **done** 2026-08-17, [CI green on PR #3](https://github.com/bersermi/RetailerManagementTool/actions/runs/32097844689). 52 behavioural checks in `supabase/tests/0005_allocation.sql` and 9 more in `supabase/tests/0005_allocation_concurrency.sh`, both in the CI gate; `0003`'s 39 and `0004`'s 54 still pass. FEFO order proven on all three keys; the candidate set never leaves the location; two concurrent allocations do not oversell one batch, shown against two real connections; a transfer carries cost and expiry forward, opens one destination lot per origin lot, and never moves a batch | M | ✅ |
| ~~1.4~~ | ~~`0008` purchase-price view~~ — **done** 2026-08-18, [CI green on PR #7](https://github.com/bersermi/RetailerManagementTool/actions/runs/32191899904). 44 behavioural checks in `supabase/tests/0008_provider_price_memory.sql`, now in the CI gate; `0003`'s 39, `0004`'s 54, `0005`'s 52 and the concurrency file's 9 still pass. A voided delivery stops prefilling and falls back to the delivery that still stands; a pair whose only delivery was voided has no row rather than a zero; no fallback across providers; `explain` confirms both indexes and `purchase_one_reversal_idx`, with no sequential scan | S | ✅ |
| ~~1.5~~ | ~~Seed skeleton~~ — **done** 2026-08-18. `supabase/seed.sql`: two merchants, three stores, **316 variants** for A and 25 for B, 390 sell prices, six people, eight providers. 12 assertions run inside the seed at reset time, and `supabase db reset` **exits non-zero** when one raises — confirmed by falsifying three of them | M | ✅ |
| ~~1.6a~~ | ~~Seed the deliveries~~ — **done** 2026-08-18. `supabase/seeds/10_deliveries.sql`: **110 deliveries, 1 025 lines, 1 025 batches, 1 025 receipt movements** over 88 days; 330 remembered prices; merchant B holds 16.7% of lines. 24 assertions, six of them falsified to prove they discriminate. The seed is **byte-identical across resets**, verified over three | M | ✅ |
| ~~1.6b~~ | ~~Seed the consumption~~ — **done** 2026-08-18. `supabase/seeds/20_consumption.sql`: **904 sales / 2 251 lines, 65 waste documents / 134 lines, 5 transfer shipments, 3 473 movements.** Invariant clean; FEFO obeyed, asserted and falsified; two deliberate oversales exercise shortfall branches one and three. Reproducible to the peso over three resets | M | ✅ |
| ~~1.6c~~ | ~~Seed the reversals~~ — **done** 2026-08-19, [CI green on PR #14](https://github.com/bersermi/RetailerManagementTool/actions/runs/32298215918). `supabase/seeds/30_reversals.sql`: **3 voided deliveries / 23 lines, 3 voided tickets / 12 lines, 1 voided write-off / 3 lines, 41 compensating movements.** Invariant clean across every void; 16 (provider, variant) pairs fall back to an older delivery and 1 disappears entirely. 33 assertions, seven of them falsified. Reproducible over three resets in every seeded table, and — after `0010`, task 1.8 — in `provider_price_memory` too. `0003`'s 39, `0004`'s 54, `0005`'s 52, the concurrency file's 9 and `0008`'s 44 all still pass, read from the job log | S | ✅ |
| ~~1.8~~ | ~~`0010` — the two defects the seed found~~ — **done** 2026-08-19, [CI green on PR #15](https://github.com/bersermi/RetailerManagementTool/actions/runs/32314886842), taken out of order at the owner's instruction because both were `create or replace` fixes with no data to migrate and both get dearer once a pilot exists. `allocate_fefo()` takes a **required** `p_occurred_at`; `allocate_transfer()` stamps its destination lot with the moment it already had; `provider_price_memory` breaks its tie on price, tax rate and display unit. Four falsifications. Suites now 39 / 54 / **55** / 9 / **46** | S | ✅ |
| ~~1.7~~ | ~~Assert the invariant in CI~~ — **done** 2026-08-19, [CI green on PR #16](https://github.com/bersermi/RetailerManagementTool/actions/runs/32316689915). `supabase/checks/seed_invariant.sql`, run from its own step in `db.yml` **between the reset and the suite loop**, because `_cleanup.sql` would otherwise have emptied the seed first. **18 checks**: eight are a pre-flight that refuses to run the other ten until it can see a populated two-tenant ledger; then the invariant over 1 041 batches and 3 514 movements, the rebuild reproducing every row from `stock_movement` alone at that scale, and `rebuild_batch_balance(workspace)` shown to respect its argument — a claim no single-tenant fixture could make. It corrupts the projection and repairs it on **every run**, so green is never green from a check that cannot go red. Four falsifications. Read from the job log: *all 18 seed invariant checks passed*, *1 seed invariant file(s) ran*, and `0003`'s 39, `0004`'s 54, `0005`'s 55, the concurrency file's 9 and `0008`'s 46 all still pass | S | ✅ |

Order is forced by foreign keys: 1.1 → 1.2 → 1.3a → 1.3b; 1.4 after 1.2; 1.6 after
1.3b + 1.5, and within it 1.6a → 1.6b → 1.6c, because you cannot sell stock that was
never delivered or void a document that does not exist. **Nothing in step 1 is
outstanding.**

**1.3 was split on 2026-08-17.** It was the one **L** task in the schema half of
step 1, and it grew a second time when the allocator moved into it (decision below).
The split is by migration file, so each half is separately reviewable and separately
verified — which is the same reason every migration header in this repo starts by
narrowing its own scope.

### The 1.5 seed shape, fixed by the owner 2026-08-18

Asked whether the seed needed a realistic provider spread, the owner's answer was no:
the minimum that exercises the rules, not a simulation of a real shop.

- **Two merchants — two workspaces.** Merchant A has **two locations**, merchant B has
  one. This is the owner's call and it is the right one for a reason worth writing
  down: *a single-tenant seed makes every isolation check vacuous.* A query that
  forgot its `workspace_id` predicate returns the correct answer when there is only
  one workspace, and step 2's queries are exactly where that would hide. 1.4 hit the
  smaller version of the same problem — its performance fixture was single-tenant, so
  `workspace_id` selected every row and the planner's choices could not be trusted as
  evidence.
- **Three or four named providers per merchant, plus the generic one** that
  `onboard_workspace()` already creates. **No long tail.** The generic provider is not
  a dumping ground; it is there because "I bought this at the market this morning" has
  to be a two-tap purchase (§2.3), and the seed should show it being used that way a
  few times, not hundreds.
- **~300 products in merchant A**, which is the catalog the design gate at step 2 is
  judged against. **Merchant B stays small** — enough catalog and ledger to prove
  isolation is real, not a second full dataset. B is a control, not a customer.
- **Mixed on purpose**, because these are what break: units across dimensions
  (`pza`, `kg`/`g`, `l`/`ml`), tax at both 0 and 0.16, `pack_size > 1` for packs, and
  weighed items whose base unit is `g` or `ml` while they are bought by `kg` or `l`.
- **The seed inserts its own `auth.users` rows.** Every document carries
  `created_by uuid not null references auth.users (id)`, so the seed cannot write a
  purchase without a user to attribute it to.
- **Workspaces are created through `onboard_workspace()`**, not by hand — it is the
  tested path and it is what seeds the settings row and the generic provider. The
  second location of merchant A is a plain insert.

**An input to 1.6, recorded here so it is not rediscovered:** if merchant B holds only
a token amount of the ledger, `workspace_id` is still effectively non-selective on
`purchase_line` and plan evidence stays weak. B should carry a real minority share of
the transactions — not a matching half, but not ten rows either.

### 1.6 was split on 2026-08-18, before it was written

It was the one **L** left in step 1, and 1.3 had already shown what an L costs when it
is discovered mid-flight. The split is by *what writes what*, so each piece is
separately reviewable and separately verifiable against the §2.4 invariant:

| | Writes | Cannot be checked until it exists |
|---|---|---|
| **1.6a** | `purchase`, `purchase_line`, `stock_batch`, positive movements | Nothing consumes stock yet, so the invariant is trivially true — the real check is provenance: every batch traces to a line, every line to a document |
| **1.6b** | `sale`, `waste`, transfers, and the negative movements | The invariant becomes load-bearing here, and FEFO order becomes observable |
| **1.6c** | Reversal documents and compensating movements | The invariant across a void, and `provider_price_memory` falling back |

**Merchant B carries roughly 20% of the ledger.** Proposed and approved 2026-08-18.
Enough that `workspace_id` is a genuinely selective predicate on `purchase_line` —
which is exactly what 1.4's performance evidence lacked, its fixture being
single-tenant — without doubling how long a reset takes.

**Each piece gets its own seed file.** `supabase/seed.sql` became
`supabase/seeds/00_skeleton.sql` in 1.6a, and `config.toml` now lists the files
explicitly rather than globbing, so the order is stated and not inferred. Three more
sections appended to one file would have made a 1 700-line seed that no one reviews;
the same instinct that keeps migrations narrow applies here, and unlike a migration a
seed file is not append-only, so this costs nothing to undo.

### Fixed 2026-08-19 in `0010` — both of the seed's findings, on the owner's instruction

Asked whether the two defects should be fixed now or wait for the RPC migration, the
owner said fix them now. Both were a `create or replace` with no data to migrate today
and a fix-forward against live data later, so this is the cheap end of that trade.

**It takes the next free number, not `0006`.** `0006`, `0007` and `0009` are reserved
and unwritten; renumbering planned work to make a correction look tidy is the more
confusing choice. ⚠️ **`0006` will therefore apply BEFORE `0010` on a fresh reset and
must still be written against the six-argument `allocate_fefo`** — plpgsql resolves the
functions a body calls at call time, so `record_sale` written against the old signature
applies clean and fails at the first till.

- **`allocate_fefo()` takes a REQUIRED `p_occurred_at`, and required is the decision.**
  A default of `now()` would have kept every existing call site compiling and would have
  reproduced the defect the first time a caller held a real `occurred_at` and did not
  think to pass it — and that caller is `record_sale`, which is the next thing written.
  The cost is that all twenty call sites moved in one commit, which is the point rather
  than the price. Adding an argument is a drop and a create, not a replace; no role held
  execute, and the revoke is re-issued.
- **Of two prices paid the same morning, the view now offers the HIGHER.** That is the
  one key in `0010` expressing a preference rather than an order. A prefill is a number
  an operator accepts without reading; quoting high overstates cost and understates
  margin, which is the direction someone notices. Quoting low flatters the margin report.
  Tax rate and display unit follow, and express nothing — they are there so that
  everything the view hands back is a function of the data.
- **The id keys stay.** `distinct on` needs a total order, and two deliveries can agree
  on every column above. What is left arbitrary is which *document* an identical price is
  attributed to, and those columns are informational.

**⚠️ THE FIX MADE TWO DISHONEST DATES IN `20_consumption.sql` VISIBLE, AND BOTH ARE
CORRECTED.** While the allocators stamped `now()`, any lot they opened sorted after every
movement in the seed, so the arrival test skipped it and the question never arose. Given
real dates, the seed's FEFO and running-balance assertions both failed — correctly:

- the **transfers** were dated fortnightly across the window but *written* after every
  sale, so a destination lot dated 10 June sat in front of lots the Mercado had sold in
  June. That was a FEFO violation in the data and it had been there since 1.6b. They are
  now dated the five days after the last sale, which is when they were actually written;
- the **oversales** were dated 14 August but written after the transfers, so the overdraw
  they exist to cause landed on a *transfer* instead — replayed in date order the
  oversale left the lot at 1 and the transfer took it to −2, on a movement nobody had
  marked as designed.

The rule underneath both is worth stating once: **every section of `20_consumption.sql`
picks its quantities from the balances as they stand when it runs, so date order must
agree with write order.** The headline counts are unchanged — 904 sales / 2 251 lines,
65 waste / 134 lines, 5 shipments, 3 473 movements — because only dates moved.

**Falsified, four ways, each caught by the check written for it:** reverting the
destination lot to `now()` (*"12 lot(s) of any origin were received after a movement
against them"*), reverting the shortfall lot (*"the lot is received AT THE MOMENT GIVEN"*
in the `0005` suite), and deleting the price key from the view — which trips `0008`'s
check 23 (*"the higher PRICE, not the higher document id"*) and the seed's own
*"6 pair(s) where the view's prefill is not the one the data keys imply"*.

That last one is worth reading closely. **The seed's first version of that assertion was
green with the fix reverted**, because it asked whether the *data* settled every tie and
deleting a sort key does not change the data. It now also compares the view's answer
against one derived from the data keys alone. An assertion about a view that never reads
the view is the shape this repo keeps finding.

### ⚠️ Found in 1.6c — `provider_price_memory` breaks its tie on a uuid — FIXED in `0010`

`0008` orders by `occurred_at desc, recorded_at desc, p.id desc, pl.id desc`. The two
tail keys were added for determinism and they do not deliver it, because **ids are not
stable data**:

- purchase price memory is **workspace-wide**, and 1.6a delivers to both of merchant A's
  stores from one provider on the same morning at the same hour, with `recorded_at`
  equal to `occurred_at`;
- so two documents tie on every key that is not an id, and `gen_random_uuid()` picks the
  winner. **14 (provider, variant) pairs are decided this way.**

Three resets agree on every count and every total in all four seed files and **disagree
on the sum of the prefills**. That is how it was found; nothing before 1.6c had measured
the view across resets, and 1.4's fixture was single-tenant and single-store.

**It is not a correctness bug.** Both tied rows are prices the shop genuinely paid that
morning, so no prefill is ever *wrong*. It is arbitrary — and arbitrary in production
too, where the ids come from the client at cart open, and where a chain with two branches
on one delivery round produces this tie every week.

**Not patched, for the reason 1.6b did not patch `received_at`**: the seed must not work
around the object it exists to exercise, and `0008` is applied and therefore closed. The
seed **bounds** it instead — every tie must be between two *stores* of one workspace, and
there must be no more than thirty. A tie inside one store would be a worse fact: one
delivery recorded twice, with the view choosing between the copies by uuid.

**The cheap fix, if the owner wants one:** put `pl.unit_price_net_per_base desc` ahead of
the id keys in a `create or replace`. It makes the view a pure function of the data, and
it offers the higher of two prices paid the same morning, which is the safe direction to
be arbitrary in when the number is a prefill an operator will accept without reading.
**Owner's call**, and cheap now — a view with no data to migrate.

### Settled in 1.7, and binding on step 2 and on the nightly production check

- **The seed's own assertions and this check are different questions, and both are
  kept.** Each seed file asks *did I write what I meant to*, raises inside the reset
  and needs no workflow wiring at all (settled in 1.5). `supabase/checks/` asks *does
  the projection agree with the ledger across all four files at once* — after the last
  one has run, from outside the seed, where it also notices a seed file that stopped
  being listed in `config.toml` and took its assertions with it.
- **A NEW DIRECTORY, `supabase/checks/`, AND ITS CONTRACT IS THE ORDER IT RUNS IN.**
  Files here run against the **seeded** database, in their own `db.yml` step between
  `supabase db reset` and the suite loop. `supabase/tests/` is the opposite: every
  suite there is preceded by `_cleanup.sql`, owns an empty database and writes its own
  fixture. The two could not share a directory, and `tests/_seed_invariant.sql` was
  rejected because `_` already means *harness, not a suite* and this is neither.
- **⚠️ THE PRE-FLIGHT IS THE LOAD-BEARING HALF, AND IT IS FATAL ON ITS OWN.** Eight of
  the eighteen checks assert only that there is a ledger worth checking — both tenants,
  three stores, over a thousand batches, negative movements as well as positive, every
  reason the invariant leans on, paired transfers, compensating movements. If any fails
  the file **raises and the remaining ten never run**. `batch_balance_violations()` over
  an empty database returns zero rows and passes, which is what 1.5 warned this task
  would walk into; without the pre-flight the day someone moves this file into `tests/`
  is a day CI goes green while checking nothing.
- **The falsification runs on every CI run, not once by hand.** The file corrupts the
  projection two ways — a wrong number and a deleted row — confirms both are named,
  then rebuilds and confirms the repair. A check that has never been seen to fail is a
  claim; this one demonstrates its own teeth every time, and it costs about a second.
- **`rebuild_batch_balance(p_workspace_id)` is verified to respect its argument, and
  that was previously unverifiable.** `0004`'s fixture holds one workspace, so an
  implementation that ignored the parameter passed it. Over the seed the check rebuilds
  the smaller tenant and asserts every row of the larger is untouched **including
  `updated_at`**. This matters because the ADR's nightly production re-check is
  per-tenant: a rebuild that ignored its argument would delete every other tenant's
  projection nightly and rebuild only one. Falsified with exactly that implementation —
  two checks went red.
- **Floors and shapes, not the seed's row counts.** The pre-flight asserts *at least*
  500 batches and 2 000 movements, not 1 041 and 3 514. The seed files already pin their
  exact totals; restating them here would mean editing a CI-adjacent file every time a
  truck changes, and the question this file asks is "is there enough here to falsify the
  invariant", not "is the seed unchanged".
- **Containment, not equality, on the movement reasons — and the first draft got this
  wrong.** It asserted `count(distinct reason) = 5` and went red during falsification
  the moment an `adjustment` movement appeared. `adjustment` is a legal sixth reason
  that `adjust_stock` writes in `0006` and that the seed will one day carry. The claim
  worth making is that the five the invariant leans on are all present.
- **⚠️ THIS FILE STILL DOES NOT ASSERT THAT NO LOT IS NEGATIVE**, per 1.6c. It asserts
  the opposite — that the seven designed negatives **survive**. Falsified by topping
  every negative lot back up with a legitimate `adjustment` movement: the ledger stayed
  perfectly consistent, `batch_balance_violations()` stayed at **0**, and only that one
  check went red. Which is the point — the invariant cannot see the seed losing the
  cases that make its shortfall branches real, and something has to.

### Settled in 1.6c, and binding on 1.7 and on `0006`

- **The compensating movement belongs to the REVERSAL document, not the original.**
  `sale_id` on it is the void's id; `reversal_of_movement_id` points at the movement it
  cancels. This was not 1.6c's decision — `0004`'s suite fixed it before any of it was
  seeded — but 1.6c is the first thing that depends on it at scale, and
  `void_transaction` in `0006` must do the same. Falsifying it in the seed was caught,
  though **by a neighbouring assertion** rather than the one written for it: a
  compensator carrying the original's id becomes itself a movement of a voided document
  with nothing compensating it.
- **One voided delivery had already been sold through, deliberately.** A reversal against
  an intact lot can only return a balance to where it started, which exercises the
  projection at its easiest point. This one takes back units that are gone and drives
  **five lots negative** — legal, recorded and not enforced (§2.6). The delivery is named
  in the seed's own scaffolding so the running-balance assertion can tell that designed
  deficit from an accidental one, exactly as 1.6b named its oversales.
- **⚠️ SEVEN LOTS IN THE SEED ARE LEGITIMATELY NEGATIVE — two from 1.6b's oversales and
  five from the voided delivery above. 1.7 must not assert that no balance is below
  zero.** The invariant is `batch_balance_violations()`, which asks whether the
  projection agrees with the movements, and it is clean. "No lot is negative" is a
  different claim, it is false, and it is false on purpose.
- **Below zero, not merely lower.** The first draft of the running-balance check compared
  each lot's low-water mark before and after the voids and raised on all eighteen lots of
  the two intact deliveries. Voiding an intact delivery *does* lower a lot's minimum,
  from everything it received down to nothing, and that is the correct outcome. The claim
  worth asserting is about the sign.
- **The void is filed by whoever filed the original.** Cashiers void their own tickets
  minutes later, inside `void_window_minutes`, which is asserted; deliveries and
  write-offs stay with the manager or owner who recorded them, because `purchase_line`
  and `waste_line` carry cost and are manager-and-above.
- **Every pick is a rule over the data, and `payload_hash` is the tiebreak.** It is an
  md5 over a name-derived key — the one stable identifier a document has once ids are
  off the table. No date and no id appears in any selection in the file.

### ⚠️ Found in 1.6b — `allocate_transfer()` stamps `received_at` with `now()` — FIXED in `0010`

**Neither allocator sets `received_at` on a lot it opens**, so the column default
`now()` applies:

- `allocate_transfer()` takes `p_occurred_at`, uses it for all four movements, and
  **does not pass it to the destination lot**;
- `allocate_fefo()` shortfall branch three opens its adjustment lot the same way.

At a till this is invisible and correct — `occurred_at` *is* `now()`. It is wrong in
exactly two places:

1. **Backdated history**, which is why the seed found it. The transfer destination
   lots and the one adjustment lot are stamped the day of the reset while their own
   movements are dated weeks earlier.
2. **`recorded_offline`, which is a real production path.** `occurred_at` is accepted
   from the client and clamped to `[now() − 72h, now()]` (`supabase/README.md`). So a
   transfer recorded up to three days late opens a destination lot that sorts as
   *received today* — up to 72 hours later than the truth. `received_at` is the second
   FEFO key, so this reorders lots received within days of each other, which is
   precisely the perishable case FEFO exists for.

**Not patched in 1.6b, deliberately**: the seed must not work around a function it
exists to exercise, and `0005` is applied and therefore closed. The seed instead
**bounded** the exception: only allocator-opened lots could be affected, and never more
than forty.

**Fixed 2026-08-19 in `0010`**, on the owner's instruction — see *Fixed 2026-08-19*
above. The bound is now an absolute check: no lot of any origin may be received after a
movement against it. Fixing it is also what exposed the two dishonest dates in
`20_consumption.sql`, which the bound had been hiding along with the defect.

### Settled in 1.6b, and binding on 1.6c

- **Backdated history cannot spend stock that had not arrived, and nothing enforces
  that but the seed.** `batch_balance` has no notion of time, so by the time
  consumption runs every lot from all thirteen weeks is on the shelf and a May sale
  could eat an August lot — `allocate_fefo()` would hand it over, correctly, because
  it allocates from what is open. Each withdrawal is therefore capped at the FEFO
  prefix that had actually arrived, **stopping at the first future lot rather than
  skipping past it** — skipping would reach a lot the shop could not have touched,
  because FEFO order is not receipt order. Asserted, and falsified: removing the cap
  produced 635 movements consuming lots received after them.
- **FEFO obedience is asserted, and that assertion is what makes the
  one-allocator decision enforceable.** For every withdrawal, no earlier-sorting lot
  that had already arrived is still open at the end. Replacing `allocate_fefo()` with
  a hand-written newest-lot-first pick trips it **908 times**. Without this check,
  "the seed and `record_sale` must not diverge" is a comment rather than a rule.
- **A running-balance replay catches what the invariant cannot.** A lot that dips
  negative mid-history and recovers is invisible to `batch_balance_violations()`,
  which only sees the end state. The seed replays every batch's movements in order.
- **Every pick that ends in `LIMIT` needs a total order, and the tiebreak must be a
  NAME.** Two resets produced identical row counts and different revenue, because the
  oversale chose "the smallest balance" and ties resolved arbitrarily. Ids are
  regenerated each reset, so they can never be the tiebreak. Three resets now agree to
  the peso.
- **Cashiers sell; managers and owners receive deliveries and write off waste.**
  `waste_line` carries cost and is manager-and-above, so a cashier authoring one
  describes a person who cannot read back what they wrote. Asserted both ways.
- **The two allocators divide the work differently, and 1.6c must not confuse them.**
  `allocate_fefo()` decides and returns the split — *the caller writes the movements*.
  `allocate_transfer()` does the entire paired write — *the caller writes nothing*.
- **Foreign keys force document → lines → movements.** `stock_movement.waste_id`
  points at a document that must already exist, but the header's totals come from the
  lines and the lines' cost comes from the allocation. So the allocation is staged and
  replayed as movements after the header lands. `record_waste` in 0006 needs the same
  shape.

### Settled in 1.6a, and binding on 1.6b and 1.6c

- **⚠️ THE SEED MUST BE DETERMINISTIC, AND IT WAS NOT AT FIRST.** The line generator
  originally hashed `purchase_id` and `variant_id` to decide what each truck carried.
  Those are `gen_random_uuid()`, so **two consecutive resets produced 1 071 and 1 064
  batches** — caught only because a falsification run printed both numbers side by
  side. Every hash now keys off a `doc_key` built from provider name, location name
  and week, plus the product *name*. Three resets now produce identical counts,
  totals and quantities to the peso. **1.6b and 1.6c must do the same**: never hash a
  uuid. A seed that differs between runs makes "it failed in CI but not locally"
  unanswerable and lets an assertion threshold flicker into a false red.
- **A green `batch_balance_violations()` means almost nothing in 1.6a**, and the file
  says so. Nothing has been withdrawn, so every balance is just its own receipt and
  the check would pass with the allocator absent. **It becomes load-bearing in 1.6b**,
  which is the first point where the invariant can actually be violated.
- **The receipt is a movement, not the batch row.** One positive `purchase` movement
  per lot, asserted one-for-one against `stock_batch`. Falsified both ways — omitting
  it (*"1025 batches but 0 receipt movements"*) and writing it twice (*"1025 batches
  but 2050"*). `record_purchase` in 0006 must do exactly this.
- **Headers cannot be patched after the fact**, so totals must be right in the
  INSERT. `purchase` carries the append-only trigger — there is no "insert the header,
  add the lines, then update the totals". The lines are staged first and the header is
  built from their sums. **0006's `record_purchase` faces the identical constraint**,
  and this is the shape it needs.
- **A lineless delivery never becomes a document**, because the header insert
  inner-joins to the line totals. No DELETE is needed and none is written; an explicit
  one would be dead code dressed as a safeguard.
- **Providers do not carry the whole catalog, on purpose.** Each named provider is
  assigned whole families, one of merchant B's three providers **never delivers at
  all**, and the generic provider takes a thin slice of produce that overlaps another
  provider. Without those gaps every `(provider, variant)` pair would have a price and
  "no fallback across providers" — the rule 1.4 exists for — would never be exercised
  by the seed. Asserted: some provider has no history, and some variant is bought from
  two providers at different prices.
- **Merchant B's line density is higher than A's, and that is deliberate.** B's
  catalog is 25 products against A's 316, so matching A's density left B at **3.5%**
  of the ledger rather than the ~20% the owner fixed. It is also the more honest
  shape: a corner shop restocks most of its range weekly. B now holds 16.7%.
- **Cost is derived from the sell price**, per family margin, with a ±5% drift per
  delivery. The drift is what gives the price memory something to remember other than
  one constant — without it "what did we last pay" and "what do we always pay" are the
  same question, and step 7 exists to separate them.

### Settled in 1.5, and binding on 1.6

- **The seed asserts itself, and `supabase db reset` fails when it raises.** Confirmed
  the hard way rather than assumed: an assertion was deliberately falsified and the
  reset exited **1** with the assertion's own message, `LegacyMigrationSeedError`. So
  the twelve checks at the end of `seed.sql` are a CI gate on every push, with no
  workflow wiring at all. Two more were falsified to be sure they discriminate — a
  family-name typo (caught: *"staged 341 catalog rows but 330 variants exist"*, because
  the insert is an inner join and a mismatch drops products silently) and a ledger row
  written into 1.5 (caught).
- **⚠️ SEED DATA DOES NOT SURVIVE INTO ANY TEST FILE, and 1.7 has to plan around it.**
  `supabase/tests/_cleanup.sql` runs before *every* suite and `TRUNCATE`s each table
  but `unit` — so by the time the first suite starts, the seed is gone. That is correct
  and deliberate (suites assert absolute counts and must own the database), but it
  means **1.7 cannot be a file in `supabase/tests/`**. The invariant check over seed
  data has to run in `.github/workflows/db.yml` in its own step, between
  `supabase db reset` and the suite loop. Discovered while building 1.5; it would
  otherwise have been found by writing 1.7 and watching it assert over an empty
  database — which passes.
- **The seed writes no ledger, and an assertion enforces it.** Purchases, sales, waste,
  batches and movements are 1.6's, allocated through `allocate_fefo()`. The guard is
  there because the moment the seed writes a movement by hand, step 2 is judged on data
  the real system never produces — which is the whole reason the allocator moved into
  `0005`.
- **Ids are looked up by name, not fixed.** `onboard_workspace()` generates the
  workspace id and the seed uses the function rather than hand-inserting, because it is
  the tested path and it is what writes the settings row and the generic provider.
  `seed.sql` is plain SQL with no psql meta-commands — the CLI executes it directly and
  `\gset` is not available — so ids cross statements through a scaffolding table that
  is **dropped at the end**. 1.6 should look them up by name the same way rather than
  depend on a table no migration created.
- **Merchant B's names deliberately collide with merchant A's.** `Arroz superextra
  1 kg` exists in both. `product_variant_name_unique` is per workspace, so this is
  legal — and it means a query that lost its `workspace_id` predicate finds a plausible
  twin instead of nothing, which is the failure that actually needs catching.
- **Sucursal Mercado charges 8% more for produce.** 46 location price overrides exist
  so that "the price at this store" and "the workspace price" are *different numbers*
  somewhere. If they agreed everywhere, a query that ignored `location_id` would return
  the right answer and step 2 would certify it.
- **Three prices are superseded**, with `effective_to` set, so the `[)` range and the
  overlap exclusion constraint have something to be right about.

### Traps in step 1

- **1.3a and 1.3b are the biggest piece.** `stock_movement` is the system of record;
  `batch_balance` is a disposable projection rebuildable from it. The transfer
  movement shape is fixed before the screen ships at step 6 — getting it wrong is the
  same class of error as omitting `location_id` (ADR-035 §2.4). **Settled while
  building 1.3a:** the *shape* went into `0004` and the *mechanics* stay in `0005`.
  ADR-035 §2.4 fixes the shape "in migration `0004`", meaning the ledger migration,
  which after the renumbering is the inventory one; the alternative was an `ALTER` in
  `0005` adding columns to a table `0004` had just defined, leaving `0004` unable to
  represent one of the four things the ledger does. So `transfer_in`/`transfer_out`,
  `transfer_group_id` and `stock_batch.source_batch_id` exist and are constrained
  now; `allocate_fefo()` and the paired write are still 1.3b's.
- **1.4 was small and easy to get wrong, and it was got wrong once.** The view must
  exclude **both** reversal documents **and** the documents they reverse. It does —
  but the first draft of the *test* could not tell those two apart, and deleting one
  of them from the view left the whole suite green. See *Settled in 1.4* below.
- **No price fallback across providers.** A price learned from one provider never
  prefills another's. That is a fact about a relationship, not about a product.

### Settled in 1.2, and binding on what comes after

- **A document is reversed at most once**, by a partial unique index on
  `reversal_of`. `void_transaction` (0006) must therefore treat a double tap as an
  idempotent no-op and not as a second compensating document.
- **Documents are append-only, enforced by trigger** on all six tables, not only by
  the missing grant. Every RPC in 0006 is `security definer` and so is outside RLS
  and grants; the trigger is what stops one of them "correcting" a committed sale.
  If an RPC ever needs to update a document, that is a design error to raise, not a
  trigger to drop.
- **`purchase`, `purchase_line` and `waste_line` are manager-only reads**, per
  ADR-035 §2.7. The staff-facing `security_invoker` views without the cost columns
  are owed by whichever screen needs them first — Comprar and Desperdicio, step 6.
- **`tax_rate` is snapshotted on every line.** Reports never re-derive tax from the
  variant's current rate, so correcting a product does not restate last quarter.
- **The purchase-price index in ADR-035 §2.3 is not creatable as written.**
  `(workspace_id, provider_id, variant_id, occurred_at desc)` spans two tables —
  `provider_id` and `occurred_at` are on the header, `variant_id` is on the line.
  `0003` ships the two-index equivalent instead; **1.4 must confirm it against a real
  `explain`** rather than assume it. Denormalising the header columns onto the line
  was rejected: it buys an index and sells the guarantee that they agree.

### Confirmed by the owner, 2026-08-17, at the 1.3a merge

Three modelling choices were put to the owner in plain language alongside the merge,
because CI can prove the schema is internally consistent and cannot prove it matches
the shop. No objection or change was requested on any of them.

*Deadline corrected 2026-08-18.* This paragraph said they were cheap to revise "until
1.6 writes seed data against them, and expensive afterwards". That is wrong, and it
was repeated into the 1.3b notes before anyone checked it. **Seed data is regenerated
by `supabase db reset` and is never precious.** What is actually expensive is fixed by
two other things: a change to **schema shape** — a column, a constraint, an enum value
already in use — because migrations are append-only; and **real pilot data**, because
`stock_movement` is immutable by trigger, so a movement written under a wrong rule can
be compensated but never restated. The first applies to the waste vocabulary below.
Neither applies to a function body. Real pilot data arrives when Vender ships at step
5b, not at 1.6.

- **The waste vocabulary** — the five `waste_reason` values below. Adequate as shipped.
- **Stock may go negative.** A sale the system thinks it cannot cover is *recorded*,
  not blocked. v1 records stock and does not enforce it (ADR-035 §2.6).
- **Cost is manager-and-above; quantity is everyone.** A cashier sees what is on the
  shelf and never what it cost.

### Settled in 1.3a, and binding on what comes after

- **A batch never changes, and neither does a movement.** Both carry the same
  append-only trigger the documents carry, so `0005`–`0007` cannot "correct" a lot
  from inside a `security definer` function. `stock_batch` has no
  remaining-quantity column at all — what is left lives only in `batch_balance`.
- **`batch_balance` is opened at zero when the batch is created,** and the receipt
  itself is a movement. `record_purchase` must therefore write both the batch and a
  positive movement; writing only the batch leaves stock at zero, and seeding the
  balance with `qty_received_base` would double the delivery.
- **A reversal movement keeps the reason it cancels** and sets
  `reversal_of_movement_id`; there is no `'reversal'` value in `movement_reason`.
  Otherwise every report that asks "how much did we sell" has to remember to union
  two reasons. The compensating movement is scoped to the **same batch** by the FK,
  and a movement can be reversed at most once — the movement-level analogue of the
  document rule from 1.2, and needed separately because `adjust_stock_delta` and
  `replay_failed_write` write movements without writing documents.
- **A negative `remaining_base` is legal and must stay legal.** v1 records stock and
  does not enforce it (ADR-035 §2.6). A `>= 0` constraint would turn a permitted
  oversale into an exception at the counter, in front of a customer.
- **`batch_balance_violations()` and `rebuild_batch_balance()` are the §2.4 invariant
  in executable form.** No role holds execute; they are for CI, for the nightly
  production check, and for an operator who has decided to throw the projection away.
  1.7 wires the first over seed data.
- **The FEFO ordering is servable from one index.** `batch_balance` copies
  `expiry_date` and `received_at` from the batch, and
  `(location_id, variant_id, expiry_date, received_at) where remaining_base > 0` is
  partial on the open lots. 1.3b's allocator should not need to join `stock_batch`.

### Settled in 1.3b, and binding on what comes after

- **The shortfall has to name a batch, so the allocator decides which one.**
  `stock_movement.batch_id` is not nullable and v1 records an oversale rather than
  raising at the counter (§2.6), so `allocate_fefo()` answers in three branches: the
  lot FEFO ran out on; failing that the most recently received lot at that store,
  open or not, at the cost the shop actually paid; failing that — a product never
  stocked there — **a new adjustment lot at zero cost**. Zero rather than a borrowed
  estimate, because 100% margin on those units is visibly wrong and gets asked
  about, where a plausible invented cost is invisibly wrong and is what §2.9 would
  then be built on. `adjust_stock` is how an operator resolves it. Raised with the
  owner 2026-08-18; not critical, and revisable by `create or replace` until real
  pilot data exists at 5b, since movements are immutable once written.
- **`batch_id` is a third FEFO sort key**, after `expiry_date` and `received_at`.
  §2.4 names only the first two, and they are not enough to be deterministic: two
  lines of one delivery share a `received_at` because `now()` is fixed for the whole
  transaction, and they can share an expiry. Without a final key the seed and
  `record_sale` could allocate the same request differently, which is the one
  divergence `0005` exists to prevent. It costs an incremental sort within ties.
  **Owner's call to confirm.**
- **`allocate_fefo()` takes the locks and the caller holds them.** The row locks on
  `batch_balance` last until the *caller's* transaction ends, so calling the
  allocator, committing, and writing the movements afterwards is the one way to use
  it wrongly. Branch three also *writes* a lot, so a speculative call is not free.
- **Neither function validates `my_locations()`, deliberately.** They are ledger
  primitives with no execute grant for any role; the wall is `0006`'s, as §2.6
  requires, and a reviewer looking for the location check in `0005` is looking in
  the right place for the wrong file. What `0005` does guarantee is structural: a
  location outside the named workspace and a transfer to its own origin are refused.
- **A transfer carries cost and expiry forward but not `received_at`.** §2.4 names
  cost and expiry only; expiry is the FEFO sort key and store B genuinely received
  the goods today. `provider_id` is null on a transfer lot, which is the documented
  meaning of that column.
- **The CI gate now runs `.sh` test files as well as `.sql`.** "Two concurrent
  allocations cannot oversell one batch" cannot be asserted from one connection, and
  a single-session test of the locking clause would pass just as green with it
  deleted — the same vacuous pass `supabase/README.md` warns about for RLS run as
  superuser. This was confirmed the hard way: the first draft of the concurrency
  test asserted that the second session *blocks*, and it passed with the lock
  removed, because the projection trigger's `on conflict do update` blocks the
  second writer by itself. What discriminates is **what session two allocated after
  it waited**, and that is what the file asserts now.

### Confirmed by the owner, 2026-08-18 — the catalog is the merchant's

Stated at the 1.4 merge and checked against the schema the same day:

> The catalog is centralized to the merchant, not to each provider. If a merchant
> ever buys a *lata de frijoles*, that family + variant is enabled in the merchant's
> catalog, and he can then purchase it from any provider — but only the provider he
> has actually bought it from has a price history, and therefore a price to display.

**This is what is built**, verified rather than assumed: `product_family` and
`product_variant` carry no `provider_id` and no provider FK of any kind. The column
exists only on `purchase` (which provider the delivery came from), on `stock_batch`
(which provider that lot came from, null on a transfer lot) and on the derived
`provider_price_memory`. Nothing in the catalog is scoped to a provider, and nothing
has to be "enabled per provider" before it can be bought.

**One part of the same sentence is NOT built, and it is not a defect.** The merchant
also wants to see *"the price history at which he has purchased the product, globally
or per provider"*. `provider_price_memory` answers neither: it is the **last** price,
not a series, and it is strictly per provider with no global roll-up. That is correct
for what it is for — prefilling a delivery — and the missing piece is **reporting**,
which lands in `0009` and Números (step 7).

Nothing needs to change in the schema for it. Every historical price is already in
`purchase_line`, immutably, with `tax_rate` snapshotted per line — which is precisely
why ADR-035 §2.3 made this derived instead of cached. A cache would hold only the
latest and the history would have been thrown away.

**Do not conflate the two when `0009` is written.** "No fallback across providers" is
a rule about the **prefill**: a price learned from one provider must never prefill
another's, because a supplier price is a fact about a relationship. It is *not* a rule
about reporting — "you paid $18 at Proveedor A and $21 at Proveedor B" is exactly the
comparison the merchant asked for and is the point of having the history. The failure
mode to guard against is a reporting view being wired into Comprar's prefill because
it happened to be convenient.

### Settled in 1.4, and binding on what comes after

- **The memory is manager-and-above, and that is inherited rather than restated.**
  The view is `security_invoker = true`, so `purchase` and `purchase_line` apply
  their own policies — and both already gate on `has_role(workspace_id, 'manager')`
  because both carry cost. **A staff member recording a delivery therefore gets no
  prefill**, and sees the same blank required field Comprar shows for a provider
  never bought from. §2.7 lets staff record purchases and denies them cost, and those
  two looked to be in tension the moment a cashier accepts a delivery.

  **Confirmed by the owner, 2026-08-18: the cashier is not who accepts deliveries.**
  The tension does not exist in the shop. Receiving is a manager-or-owner job, and
  they get the prefill. Nothing to change, and the alternative that was on the table —
  a second, narrower view exposing the remembered *unit* but not the price — is not
  owed to anyone and should not be built.

  Two things follow for step 6. **Comprar's receiving flow does not need to be
  reachable by a staff session at all**, so do not spend the step building one. And
  §2.7's grant of "record purchase" to staff at their assigned locations is broader
  than the shop uses — that is the ADR's grant and unused breadth costs nothing, so
  leave it alone, but do not design *for* it.
- **A fourth sort key, and the last three are about determinism, not time.** §2.3
  names `occurred_at` alone and it does not pick a single row: `occurred_at` is
  server `now()` for a whole transaction, so two deliveries recorded together share
  it, and one delivery can carry two lines for the same variant. The view orders by
  `occurred_at desc, recorded_at desc, purchase.id desc, line.id desc`. Same argument
  that put `batch_id` third in `allocate_fefo()`. **Owner's call to confirm**, and
  the same one already confirmed there.
- **A negative line is never a remembered price**, even on a live document. 0003
  permits one — a return to the supplier is exactly that — and it is a correction,
  not what the shop pays for the goods.
- **`0008` shipped before `0006` and `0007` exist**, because 1.4 depends only on
  `0003` and the seed wants the prefill. Files apply in name order so a reset is
  unambiguous; the cost is that a hosted database would need
  `supabase db push --include-all` to accept `0006`/`0007` later, and none exists yet.
- **The analytics views and nightly rollups became `0009`.** `supabase/README.md`
  had them sharing a line with this view. Bundling them would have put something
  Comprar depends on behind a review three times its size, which is the same reason
  every migration here is narrow. Numbering authority is `supabase/README.md`.
- **No index was added for the provider-wide prefill.** A lookup by provider without
  a variant cannot use `purchase_line_by_variant_idx`, and on the test fixture the
  planner takes a sequential scan for it. That fixture is single-tenant, so
  `workspace_id` selects every row and the estimate is not evidence of a production
  problem — it is a shape to re-measure when Comprar exists. Speculative indexes on
  a guess are how the last model got `ProviderProductPrice`.

### A check that rolls back deletes its own results — the lesson of 2.4

`chk()` records a verdict by INSERTING into `_verify`. A section wrapped in
`begin … rollback` therefore throws its results away, and the file still prints *all N
checks passed* with a quietly smaller N. `0012`'s check file shipped with exactly that
for one draft: four access checks vanished between 23 and 28, and the summary said 28
rather than 32. Nothing failed. Nothing looked wrong.

It was caught by **reading the printed table instead of the summary line** — the same
discipline the working agreement demands of a green CI tick, one level down, and the
same failure mode: an assertion that never ran looks exactly like an assertion that
passed.

The fix is structural. `_verify.n` is a serial and a sequence is non-transactional, so
a rolled-back `chk()` burns its number and leaves a gap; `max(n) = count(*)` catches
it. All three analytics check files now carry that assertion as their last check.

### The test was wrong before the view was, and that is the lesson of 1.4

The migration was right on the first draft. **The suite was not**, and it was green
the whole time. Three separate clauses of the view could be deleted with all checks
still passing:

- `p.reversal_of is null` — every reversal in the fixture carried a negative line,
  so `qty_base > 0` was quietly doing that exclusion's job. Fixed by adding a voided
  **return**, whose compensating line is *positive*.
- `recorded_at desc` — nothing in the fixture had two deliveries at the same instant.
- `purchase.id desc` — the tie pair's line ids were random, so the check passed on a
  coin toss and would have failed on some future run for no reason anyone could find.

Each was found by deleting the clause and watching for red, not by reading the file.
Every clause has now been deleted or inverted in turn, and the count of checks each
one breaks is recorded in `supabase/README.md`. **Do this for `0009` and for every
RPC in `0006`.** A suite that has never been shown to fail is a suite with no
demonstrated relationship to the code, and this repo already has a folder full of
those.

### Decided 2026-08-17 — the waste vocabulary

`waste_line.reason` is a Postgres enum, `public.waste_reason`, shipped in `0003`:

    caducado · dañado · merma de preparación · robo o faltante · error de captura

Free text does not survive contact with the analytics asset — three cashiers spell
*caducado* four ways and "why are we losing stock" becomes worthless. The enum is
global rather than a per-workspace reference table, because comparing loss causes
across shops is the point of the asset and a list each shop edits makes that
comparison meaningless.

`robo o faltante` is deliberately **one** value: a count cannot tell theft from a
miscount, and asking the operator to choose produces a fiction that reads as data.

Adding a value later is a one-line migration; removing one is not. The list is short
on purpose, and each entry names a cause an owner would act on differently. The
owner's call, 2026-08-17: adequate, and changeable either way in future.

### Decided 2026-08-17 — the seed's FEFO allocation (was: blocks 1.6)

**Option A. One allocator, `allocate_fefo()`, owned by the ledger.** It lands in
`0005` — its own migration rather than inside `0004`, so each half of the old 1.3
stays reviewable — and both the seed (1.6) and `record_sale` / `record_waste` /
`record_transfer` (0006) call it. Nothing allocates stock by hand, anywhere.

The alternatives and why they lose:

| Option | Trade |
|--------|-------|
| **A. One allocator in `0005`**, called by the seed and later by the RPCs | Inserts a migration and shifts `0005`–`0007` down by one. One implementation, no divergence. **Chosen** |
| B. Seed allocates naively | Fastest; validates the design gate on fiction, since margin is cost attribution and cost attribution *is* the allocation |
| C. Move the seed after step 4 | Follows the ADR's letter; delays the design gate, which the ADR most wants early |

The deciding argument is step 2. It is the design gate, and it turns on whether
margin-by-product survives reversals, unit conversion and a location rollup. Margin
is produced by which batches a sale consumed — so if the seed picks batches
differently from `record_sale`, the gate passes on data the real system never
produces, and the schema is judged on a fiction in exactly the week the ADR wanted it
judged honestly.

This is also the reading most faithful to the ADR rather than least: ADR-035 §2.4
already fixes the *transfer movement shape* in the ledger migration even though the
screen ships at step 6, on the grounds that ledger mechanics belong with the ledger.
FEFO allocation is the same kind of thing. What stays in `0006` is what genuinely
belongs to the RPCs — location validation, the tax split, idempotency, the dormant
availability check.

**Cost, recorded honestly:** `0005`–`0007` shift down by one, and `0002` — already
applied, therefore not edited — still calls the RPC migration `0005` in two comments.
[`supabase/README.md`](../supabase/README.md) is the authority on numbering.

## Step 2 — the three Insight queries, the design gate 🚧

ADR-035 §3 step 2: *"Write §2.9's queries against seeded data, **per location and
consolidated across locations**. If margin-by-product needs a five-way join and a CTE
to survive reversals, unit conversion and a location rollup, the schema is wrong —
known in week two, before any screen."*

This is the gate the whole build order exists to reach early. It is not a reporting
feature; it is the moment the schema is judged, and the only artefact that can judge
it is a query written against the seed and read by a person.

**Split into 2.1 / 2.2 / 2.3 on 2026-08-20, before any of it was written.** Step 2 is
three independent questions over three different corners of the ledger — margin reads
`sale_line` against `stock_movement`, waste reads `waste_line` against `purchase_line`,
velocity reads `sale_line` against itself over time. One session that tried all three
would produce a migration nobody reviews and a verdict nobody can attribute to a
query. 1.3 and 1.6 both taught this the expensive way; this one is split before it is
written, as 1.6 was.

| # | Task | Size | Done when |
|---|------|------|-----------|
| ~~2.1~~ | ~~`0009` — **what made me money**: gross margin by product, net of tax~~ — **done** 2026-08-20, [CI green on PR #17](https://github.com/bersermi/RetailerManagementTool/actions/runs/32375602999). `product_margin_daily`, plus **34 checks** in `supabase/checks/0009_product_margin.sql`, now in the CI gate. **The gate's answer is two aggregates over one grain, joined once** — no five-way join and no CTE. Reversals cancel themselves, unit conversion never appears, and the location rollup is a `group by` the caller drops. Five falsifications, **two of which the seed cannot discriminate and which say so**. `0003`'s 39, `0004`'s 54, `0005`'s 55, the concurrency file's 9, `0008`'s 46 and 1.7's 18 all still pass, read from the job log | M | ✅ |
| ~~2.2~~ | ~~`0011` — **what am I throwing away**: waste cost as % of purchases, by product~~ — **done** 2026-08-20, [CI green on PR #18](https://github.com/bersermi/RetailerManagementTool/actions/runs/32409705126). `product_waste_daily`, plus **55 checks** in `supabase/checks/0011_waste_share_of_purchases.sql`, now in the CI gate. **Same shape as 2.1 — two aggregates over one grain, joined once** — and the same three fears fall the same way. ⚠️ **The view does not divide**, because waste and the delivery it is measured against are different documents days apart: 136 of 137 day-grain waste buckets have no delivery that day, so a row-level rate would be null 99.3% of the time. ⚠️ **The division fails three ways and not one**, and only the first is a zero — the guard is `> 0`, not `nullif`. Seven falsifications, **two of which the seed cannot discriminate and which say so**. `0009`'s 34, 1.7's 18, `0003`'s 39, `0004`'s 54, `0005`'s 55, the concurrency file's 9 and `0008`'s 46 all still pass, read from the job log | M | ✅ |
| ~~2.4~~ | ~~`0012` — **a trading day is local**: `location.timezone`~~ — **done** 2026-08-20, **taken before 2.3 at the owner's instruction**, because 2.3 would have been a third view hardcoding the constant and a third chance to move only two of them. One column on `location` (NOT NULL, defaulted to the literal 2.1 and 2.2 hardcoded, so **applying it moves no bucket** — asserted), one trigger refusing a name `pg_timezone_names` does not carry, and `create or replace` on both views. **35 checks** in `supabase/checks/0012_location_timezone.sql`. ⚠️ **The day boundary is testable for the first time**: moving Centro to `America/Hermosillo` moves 6 delivery buckets, moves nothing at the other stores, and conserves every centavo. Five falsifications | M | ✅ |
| 2.3 | `0013` — **what stopped selling**: velocity vs trailing average | M | Same bar, plus the one thing the other two do not have: a product that never sold in the current window has no row to compare, and the whole question is about absence. The check must prove the view reports the silence rather than omitting it |

Order is not forced by foreign keys — all three read applied tables — but it is forced
by cost attribution. **2.1 is first because margin is the hard one**: it is the only
one of the three whose answer comes from `stock_movement` rather than from a document
table, and it is the one the ADR names when it says "if margin-by-product needs a
five-way join, the schema is wrong". If the schema is wrong, 2.1 is where it shows.

### Numbering, and what step 2 does NOT ship

`0006` and `0007` are reserved and unwritten ([`supabase/README.md`](../supabase/README.md)
is the authority). **2.1 took `0009`, 2.2 took `0011`, 2.4 took `0012` and 2.3 will
take `0013`** — the next free number each time, because migrations are append-only
once applied and tasks that merge separately cannot share one file. This is the same
rule `0010` followed. ⚠️ **2.3 moved from `0012` to `0013` on 2026-08-20** when the
owner took the timezone column ahead of it.

Two things `supabase/README.md` currently files under `0009` are **not** in step 2,
and both are named here so they are not silently dropped:

- **The nightly materialised rollups and the live partial-day union** (§2.9). They are
  a latency answer, not a correctness answer, and they need a scheduler this project
  has not chosen yet. The gate asks whether the questions are *answerable and legible*,
  not whether they are fast. Every view in step 2 is written at a grain that
  materialises as `select * from` it — day × location × variant — so adding the rollup
  later is additive rather than a rewrite. **Owner's call to pull it forward.**
- **The price history** — global and per provider — that the README says `0009` owes
  the merchant. It is not one of §2.9's three questions and it answers a different
  person's question; it belongs with Números (step 7) or with a task of its own.
  **Owner's call.**

### The gate's verdict, from 2.1 and 2.2 — **the schema passes, twice**

2.2 asked §2.9's second question of the same schema and got the same answer: two
aggregates over one grain, joined once, with the ADR's three fears falling for the
three reasons 2.1 gives below. Nothing in `0011` is owed a schema change either.
**The gate is 2 of 3.**

⚠️ **2.2's finding is about the REPORT, not about the schema.** The ledger answers
"what am I throwing away" exactly; what it cannot do is make the *ratio* a property
of a row, because waste and the delivery it is measured against are different
documents days apart. That is a fact about retail, not a defect in the model — and
it is the reason `0011` ships a numerator and a denominator and lets the caller
divide. See *Settled in 2.2* below.

### The gate's verdict, from 2.1 — **the schema passes**

ADR-035 §3 step 2 set the test: *"If margin-by-product needs a five-way join and a CTE
to survive reversals, unit conversion and a location rollup, the schema is wrong."*
It needs neither. The whole query is:

    revenue   sale_line  →  sale                    (what the customer paid)
    cost      stock_movement where reason = 'sale'  (what those units cost us)
    -----------------------------------------------------------------------
    margin    full outer join on (workspace, location, variant, day)

And the reason each of the ADR's three fears did not materialise was decided in an
earlier migration, not in this one — which is the outcome the gate was placed early to
find out about:

- **Reversals need no exclusion at all**, because a void is a negated document
  (`0003`) and margin is a **sum**. This is the exact opposite of `0008`, which must
  exclude both the void and the document it voids — because "the last price paid"
  *picks a row*, and a picked row cannot cancel. Two views, two correct answers, from
  the same ledger shape.
- **Unit conversion never appears in the query**, because §2.5 already did it at write
  time. A product bought by the kilo and sold by the gram is grams on both sides of
  the join, and money is money. The ADR's worry was real and the answer was paid for
  three migrations ago.
- **The location rollup is a `group by` the caller drops.** Consolidated and per-store
  are the same statement, and they agree to the centavo — asserted, not assumed.

**Verdict: the schema answers §2.9's first question in one statement, and no change is
owed to it.** 2.2 and 2.3 remain to be written, and either could still find something —
this verdict covers what 2.1 could see.

### Settled in 2.2, and binding on 2.3

Every one of these is a **view body** — a `create or replace` in a new migration,
with no data to migrate and nothing the seed bakes in. They are the owner's to
overturn at the ordinary price, and none of them gets dearer with a pilot.

- **⚠️ THE VIEW DOES NOT DIVIDE, AND THAT IS THE TASK'S REAL FINDING.** `0009` puts
  `margin_rate` on the row because a sale's revenue and that sale's cost are the same
  event — one document, one day, always. Waste and the delivery it should be measured
  against are **different documents on different days**, usually weeks apart: **136 of
  137 day-grain waste buckets in the seed have no delivery of that product at that
  store on that day.** A row-level rate would therefore be null in 99.3% of the rows
  that have any waste in them, and the rest would be a coincidence of the delivery
  schedule. `0011` carries an additive numerator and an additive denominator and the
  caller divides once, at the window they asked about. **Ratios do not add; pesos do**
  — asserted, not assumed: `avg()` of the per-bucket shares is 0.415% where the shop's
  actual share is 0.306%.

- **⚠️ THE DIVISION FAILS THREE WAYS AND NOT ONE, AND `nullif` SURVIVES ONLY TWO.**
  This task's "done when" anticipated a single division by zero. The seed has three
  distinct failures at month grain, and only the first is a zero:

  | | `purchases_net` | `purchase_line_count` | In the seed |
  |---|---|---|---|
  | Never bought in the window | 0, coalesced from null | **0** | 40 buckets |
  | Bought and cancelled inside the window | **exactly 0** | 2 | 11 buckets |
  | Bought before the window, voided inside it | **negative** | 2 | 1 — *Cebolla blanca*, Centro, June, −270.43 |

  So the guard is **`sum(purchases_net) > 0`**, not `nullif(..., 0)`: `nullif` passes
  the negative through and the report prints a negative waste percentage, which reads
  as un-wasting onions. The first two are both zero and are **not the same fact** —
  one shop never ordered the goods, the other ordered them and cancelled — which is
  why `purchase_line_count` is a column. **2.3 will meet the same shape**: its whole
  question is about absence, and "no row" and "a row that nets to nothing" will need
  telling apart there too.

- **COST COMES FROM THE LEDGER, NOT FROM THE DOCUMENT'S OWN SNAPSHOT.** Unlike
  `sale_line`, `waste_line` *does* carry `unit_cost_net_per_base`, so 2.2 had a choice
  2.1 did not. It takes `stock_movement`, because **the two analytics views must agree
  on what a peso of cost is** — COGS and waste cost are the two halves of "what did
  the stock that left this shelf cost us", somebody will add them, and they must
  reconcile against the ledger. The line's cost is also a quantity-weighted mean
  rounded to six decimals where the movement's is per lot: over the seed they agree to
  **0.00011 pesos** and are **not identical**, and both facts are checked.

- **THE GRAIN CARRIES NO `waste_reason`, AND THAT IS A FAN-OUT AND NOT AN OVERSIGHT.**
  §2.8 makes "what are we losing, and why" the asset Desperdicio feeds. It is not
  answerable in this view: putting `reason` in the grain fans the **denominator** out
  across five reasons, so every peso of purchases would be counted five times. A
  reason breakdown is a second view over `waste_line` alone, with no denominator, and
  it belongs with the Desperdicio screen at step 6. Nothing in the schema is missing
  for it.

- **NO `has_role` PREDICATE, AND THE ANSWER GENUINELY DIFFERED FROM 2.1's.** 2.1 said
  this was worth checking rather than assuming, and it was: both of `0011`'s
  aggregates read manager-gated tables, so a cashier reads zero rows from both sides
  and inheritance fails **closed** — `0008`'s situation and `0008`'s answer. The check
  asserts the outcome *and the reason*, reading both base tables as that cashier, so a
  future migration that relaxes either policy turns it red.

- **COUNTS, NOT A BOOLEAN.** 2.1's `cost_attributed` is right there because a bucket
  with revenue and no cost is a **defect** and `bool_and` must hold everywhere. Here a
  bucket with no delivery is **ordinary** — it is 136 of 137 — so a boolean carries no
  signal and does not survive a rollup. `waste_movement_count` and
  `purchase_line_count` answer both the honesty question and 2.1's "a sum-only
  reconciliation cannot see a dropped document", and they add up.

- **The denominator is net of tax, same store, same window.** IVA on a delivery is
  recoverable and never was the cost of the goods; a gross denominator is flattering
  by up to 16% and never the other way. Falsified.

### Settled in 2.4, and binding on 2.3

**2.3 must not hardcode a timezone.** It joins `location` and reads
`location.timezone`, exactly as `0009` and `0011` now do. The check that used to
compare two literals now asserts that **no** analytics view carries one, and 2.3's
view will be added to it.

- **The column is on `location`, not on `workspace_setting`.** The store is the thing
  that has a trading day, and ADR-035 §2.3 makes confusing the two a one-way door. The
  case the column exists for *is* the case that separates them: one merchant with a
  shop in Hermosillo (UTC−7) and one in Guadalajara (UTC−6). `workspace_setting` gets
  no default-for-new-locations companion — the column default covers a new store
  without a second row anyone can edit, and two places to write one fact is how a NULL
  got into the overlap constraint.

- **The default is the literal the two views hardcoded, so applying it moves nothing.**
  Asserted twice rather than claimed: both views' buckets are recomputed with the old
  constant and shown identical. That is the property that made this safe to do now
  rather than at the first pilot. It also meant `onboard_workspace()`, both seeds and
  every fixture in `supabase/tests/` needed no change — all of them insert a location
  naming only `(workspace_id, name)`.

- **A trigger, not a `CHECK`, and it demands the canonical name.** No honest timezone
  validation is `IMMUTABLE` — the tz database ships with the server. The trigger
  refuses `america/mexico_city` as well as `Mars/Olympus_Mons`, and refuses the fixed
  offset `-06:00`, which cannot follow daylight saving. Scoped `update of timezone`, so
  renaming a store pays nothing.

- **Moving a boundary is an owner act**, inherited from `location_update` (§2.7) with
  no new grant. A manager reads it; an owner moves it. The boundary decides what every
  report in the shop means, and it changes when the shop moves.

- **⚠️ IT COSTS THE GATE ONE JOIN, AND THAT IS SAID RATHER THAN GLOSSED.** Each
  aggregate in both views now reads three tables instead of two. ADR-035 §3 step 2's
  bar was about surviving *reversals, unit conversion and a location rollup*, and none
  of those is why the join is there — it is a primary-key lookup of one text column. It
  cannot drop a row (`location_id` is NOT NULL with a composite FK) or narrow one under
  RLS (`location_select` is the same `my_locations()` predicate the ledger tables
  already apply). Both asserted. **The verdict is unchanged; the sentence describing
  the query is longer by one join.**

### ⚠️ FIXED in 2.4 — the day boundary is a column, and it is testable at last

This closes the finding 2.1 raised and 2.2 doubled. The two entries below are left in
place because the reasoning that deferred the fix twice was correct both times, and
what changed was the price rather than the argument.

**What the column buys that the constant could not.** 2.1 and 2.2 both recorded the
day boundary as **untestable over this seed** and pinned a bound at zero instead. It
was untestable because it was a constant in a view body — nothing in the repo could
move it. It is a column now, so a check can:

- **`America/Hermosillo`, the real Sonora case, is visible in this seed.** Not through
  sales or write-offs — they sit at 09:00–20:40 UTC and cannot straddle a midnight one
  hour away — but through the **early-morning deliveries** at 06:00–07:00 UTC, which
  cross back over midnight at UTC−7. Moving Centro alone moves **6 delivery documents**
  into different buckets, moves **nothing** at the other two stores, and changes not
  one centavo of any total. Then it is put back and asserted identical to a baseline.
- **⚠️ The limitation that remains is now itself a check.** No Mexican zone moves a
  *sale* in this seed, because sales sit in a window no such zone can straddle. That is
  check 19 of `0012`, pinned — so the day the seed grows an evening trade, it goes red.
  Proving `product_margin_daily` reads the column therefore needs an absurd zone
  (UTC+14, where 380 of Centro's 413 sales move). It proves the view reads the column;
  it does not pretend to be a customer.

**And the drift 2.2 could only guard against is now caught by numbers.** Reverting one
view to the constant and leaving the other — the exact failure 2.2 named — was
invisible to every arithmetic check in the repo and caught only by comparing view
*text*. It now fails three behavioural checks.

⚠️ **Still not fixed, and still the owner's call: the seed trades in UTC office
hours.** Fixing it means rewriting every timestamp in `20_consumption.sql` and
therefore every hash-derived quantity — 1.6b's territory, a task of its own. It is **no
longer urgent**: the boundary no longer has to come from the seed's clock.

### ⚠️ Found in 2.2 — two views now hardcode the shop timezone, and nothing arithmetic can see them drift

*(FIXED in 2.4 — see above. Kept because the reasoning was right at the time.)*

2.1 recorded that the day boundary is a hardcoded `America/Mexico_City` and that no
table records a shop's timezone. **`0011` carries the same constant, and that makes
the finding worse rather than merely repeated.** If a fix moves one view and not the
other, the margin report and the waste report bucket the same shop's days
differently — and **no arithmetic check anywhere would notice**, because the seed
trades in UTC office hours so both bucketings agree over it.

What 2.2 did about it, and what it did not: one check reads the timezone literal out
of **both shipped view definitions** and asserts there is exactly one distinct value
across the two. It is the only thing that caught the UTC falsification — every
arithmetic check stayed green. It is a drift guard, not a fix.

⚠️ **The fix is still `location.timezone`, and it is still cheaper now than at any
later point** — and now there are two `create or replace`s to do rather than one, plus
a third for 2.3. **Owner's call**, unchanged from 2.1, and the price has gone up.

### Two falsifications 2.2's seed cannot make, recorded rather than papered over

Both are `create or replace` mutations of the shipped view that **no check caught**,
in the same spirit as 2.1's pair:

- **the waste day taken from `stock_movement` instead of from `waste`.** Every waste
  movement in the seed carries exactly its document's `occurred_at`. Taking it from
  the document is still right — it *guarantees* a loss and its cost land in one bucket
  rather than leaving that to a convention every future writer must honour — but the
  seed cannot prove it. This is the same mutation 2.1 could not falsify;

- **`location_id` dropped from the join key.** It should fan a write-off at one store
  out across another store's deliveries. Over this seed it changes nothing: no
  `(product, day)` pair has a delivery at one store and a write-off at another. A
  check pins that precondition at **zero**, so the day the seed can tell them apart it
  goes red and someone reads this.

A third bound is pinned for the same reason: **transferred stock is bought at one
store and can be wasted at another**, which inflates the destination's share and
deflates the origin's while leaving the consolidated number exact. Every variant
wasted at the Mercado stall was also delivered there, so the seed cannot show it.

### ⚠️ Found in 2.2 — a void lands on its own day, and here that is visible

Every void in the sale data lands minutes after its original on the same local day, so
2.1's day buckets never see half a cancellation and 2.1 could only tell "cancels" from
"erases" with a **count**. Not here: all four voids that touch `0011` land on a
**later** local day than the document they cancel — up to nine days later.

Over the whole window the money is exactly what it would be if the voided pairs had
never been written. **At day grain the buckets differ**, and both are asserted. And
one product — *Papas fritas con jalapeño caja 24 bolsas*, whose only delivery was
voided — keeps a **row at zero** where a ledger with the pairs deleted has nothing at
all. That is 2.1's rule visible as a row rather than as a count, and it is why a
report that windows tightly must expect a negative denominator.

This is not a defect and nothing is owed. It is written down because **step 7's
screens will meet it**: a month view of a shop that voided a May delivery in June has
a real, correct, negative purchases figure in June.

### Settled in 2.1, and binding on 2.2 and 2.3

- **⚠️ A VIEW THAT JOINS MEMBER-LEVEL DATA TO MANAGER-ONLY DATA MUST STATE ITS OWN
  ROLE PREDICATE, AND `0008`'S RULE IS THE WRONG ONE TO COPY.** `0008` deliberately
  does not restate §2.7's predicate and is right not to: both tables it reads are
  manager-gated, so `security_invoker` inheritance fails **closed**. `0009` reads a
  mix — `sale` and `sale_line` are member-level, `stock_movement` is manager-and-above
  — so inheritance fails **OPEN**: a cashier would read every revenue row, no cost
  rows, and be told the shop's margin equals its revenue. Demonstrated in the check
  rather than described: the ungated copy of the query returns **216 rows to the
  seeded cashier at Centro, every one reporting zero cost**. 2.2 joins `waste_line`
  (manager) to `purchase_line` (manager) and inherits safely; **2.3 joins `sale_line`
  to nothing costed and does not need the gate at all** — which is worth checking
  rather than assuming, because the answer differs per view.
  *Confirmed by 2.2, with one correction to the prediction:* `0011` inherits safely
  as expected, but it reads `stock_movement` rather than `waste_line`, because cost
  comes from the ledger (see *Settled in 2.2*). Both are manager-gated, so the
  conclusion holds and the reason is one table over.
- **The gate must not lock out the callers RLS never filtered.** Written as
  `has_role(...) or not row_security_active('public.stock_movement')`. `auth.uid()` is
  null for the superuser and for `service_role`, so a bare `has_role` returns **zero
  rows** to the two callers that need them most: §2.9's nightly rollup is a scheduled
  `service_role` job, and every file in `supabase/checks/` runs as the superuser. A
  property of the caller, not a list of role names.
- **A void CANCELS its original; it does not ERASE it — and only a COUNT can tell.**
  Excluding voided documents and their voids left all 32 of the first draft's checks
  green, because the pair sums to zero either way. The two implementations differ only
  in **which day** the cancellation lands on, and every void in the seed happens
  minutes after its original. Two checks were added that count instead of summing:
  every `sale_line` and every sale movement appears in exactly one bucket. 2.2 and 2.3
  need the same pair — a sum-only reconciliation cannot see a dropped document.
- **Report figures are not rounded, and §2.5 does not govern them.** §2.5's half-up
  per-line rule decides what a customer is **charged**. COGS is derived from
  `qty_base × unit_cost_net_per_base` and rounding it at every grain would make two
  correct rollups disagree by centavos. Round once, at the edge.
- **Names are joined from the catalog, money is snapshotted on the line.** A renamed
  product is renamed in last month's ranking too, which is what a person asking "what
  made me money" means. Money never moves.
- **The grain is day × location × variant**, chosen so §2.9's deferred materialised
  rollup is `select * from` the view rather than a rewrite.

### ⚠️ Found in 2.1 — nothing records a shop's timezone, and the seed trades in UTC

*(Finding 1 FIXED in 2.4 — `location.timezone`. Finding 2, the seed's UTC office
hours, is still open and is still the owner's call. Kept because the reasoning that
deferred the column twice was right both times.)*

Two findings, one cause, and **neither is patched** — for the reason 1.6b and 1.6c did
not patch what they found.

**1. The day boundary is a hardcoded `America/Mexico_City` in `0009`.** `occurred_at`
is `timestamptz` and a trading day is local; bucketing in UTC pushes an evening's
takings onto tomorrow — silently, and consistently enough to look plausible. Neither
`location` nor `workspace_setting` has a timezone column. `0009` does not add one
**on purpose**: a column is append-only and a view is `create or replace`, so the
constant is the reversible half and the schema change is not. The day a customer signs
in Sonora or Baja California (UTC−7 and UTC−8, no DST, against this constant's UTC−6)
the fix is `location.timezone` defaulted to this value. ⚠️ **It stays cheap only until
a materialised rollup is keyed on `day`** — after that, moving the boundary restates
history. **Owner's call, and it is cheaper now than at any later point.**

**2. The seed cannot test it, because the seed's shop trades 03:00–14:40.**
`20_consumption.sql` builds every timestamp as `v_day + interval '9 hours'` in a UTC
session, so the seeded trading day is 09:00–20:40 **UTC** — which is 03:00–14:40 in
Mexico City. Nothing crosses midnight in either zone, so local and UTC bucketing
produce identical rows and the constant in `0009` is inert over the seed. The check
says so in the two places it matters: one check proves the expression is local by
construction, and check 33 pins the bound at **zero** documents whose local day
differs from their UTC day — so the day the seed grows a realistic evening trade, it
goes red and someone reads this. **The fix would be a change to `20_consumption.sql`
that moves every timestamp and therefore every hash-derived quantity in the seed** —
which is 1.6b's territory and a task of its own, not a line in a step 2 session.
**Owner's call.**

### Two falsifications 2.1's seed cannot make, recorded rather than papered over

Both of these are `create or replace` mutations of the shipped view that **no check
caught**, and both are recorded because a falsification table with only successes in it
is the more misleading artefact:

- **the day taken from `stock_movement` instead of from `sale`.** Every sale movement
  in the seed carries exactly its document's `occurred_at`, so the two agree on every
  row. Taking it from the document is still right — it *guarantees* a sale's revenue
  and its cost land in one bucket rather than leaving that to a convention every future
  writer must honour — but the seed cannot prove it;
- **`full outer join` weakened to `join`.** Every bucket in the seed has both sides. The
  outer join is there for two failures that must never be silent: revenue with no cost,
  which reads as 100% margin, and cost with no revenue, which is stock that left the
  shelf against a ticket that never charged for it. `cost_attributed` exists so the
  first cannot hide inside a `sum()`.

### ⚠️ Margin per ticket LINE is not derivable, and 2.2 and 2.3 do not change that

`stock_movement` carries `sale_id` and `variant_id` but no `sale_line_id`, deliberately:
one line can be satisfied from three lots, so the movement grain is (line × lot) and no
column pairs them. Per **product** margin is exact, and per **ticket** margin is exact.
Per **line** would need the allocation split persisted with a line reference — a column
on `stock_movement` and a migration, not a query. §2.9 asks for by-product, so nothing
is owed today. It is written down here because the screen that will want it is Vender
(step 5b), and by then the migration is against live data.

---

## Working agreement

One task per session. Before starting, estimate difficulty; if it is large, split it
here first so the work survives a usage limit or a context clear. Update this file
when a task closes — a plan that lags the code is the failure ADR-035 §9 names.

Every schema claim must be traceable to a migration CI has applied. A file is not
evidence; a green CI run is.
