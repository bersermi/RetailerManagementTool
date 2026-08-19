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

Step 0 is closed. Step 1 is underway — tasks 1.1, 1.2, 1.3a, 1.3b, 1.4 and 1.5 done,
**1.6 next — the one L task left in step 1.**
Every open decision in this file has been resolved; none is outstanding. Two
modelling choices made while building 1.3b, and three from 1.4, are listed below and
are the owner's to confirm or overturn. A fourth from 1.4 — who gets the purchase
price prefill — was **confirmed on 2026-08-18** and is closed. Both are function bodies, so revising either is a
`create or replace` in a new migration with no data to migrate — see the corrected
deadline under *Confirmed by the owner* below.

| Step | What | Status |
|------|------|--------|
| 0 | A Postgres you can actually run | **Done** — CI green |
| 1 | Migrations and seed script | **Next** |
| 2 | The three Insight queries — *the design gate* | Not started |
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

## Step 1 — migrations and seed script ⬅ next

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
| 1.6 | Seed the ledger — three months of purchases, sales, waste, transfers, reversals, all allocated through `allocate_fefo()` | **L** | Invariant holds across every batch |
| 1.7 | Assert the invariant in CI | S | CI green with seed + invariant check |

Order is forced by foreign keys: 1.1 → 1.2 → 1.3a → 1.3b; 1.4 after 1.2; 1.6 after
1.3b + 1.5. **1.6 is next**, and it is the last **L** in step 1 — consider splitting
it before writing code, the way 1.3 was split.

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

---

## Working agreement

One task per session. Before starting, estimate difficulty; if it is large, split it
here first so the work survives a usage limit or a context clear. Update this file
when a task closes — a plan that lags the code is the failure ADR-035 §9 names.

Every schema claim must be traceable to a migration CI has applied. A file is not
evidence; a green CI run is.
