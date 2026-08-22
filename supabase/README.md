# Database

Postgres schema for Tienda. Authoritative source: [ADR-035](../docs/adr/ADR-035-target-architecture-postgres-react-native.md).

This file restates ADR-035 for someone working in this directory. Where the two
disagree, the ADR wins and this file is the bug. Every decision below was settled on
2026-08-14; the full list, with the reasoning, is the decisions table in ADR-035 §8.

**Project region is `us-east-1`** — fixed at creation, one-way door. Mexican ISP
traffic transits Dallas and Miami eastward, so the map answer (`us-west-1`) was the
wrong one.

## The rule

**Every schema claim in an ADR must be traceable to a migration that CI has applied
and tested.**

Not "a merged file" — that was the earlier wording, and `0001` satisfied it while
having never touched a database.

The Power Platform build failed because four accepted ADRs described tables and
constraints that were never deployed — `ProviderProductPrice`, the ADR-023 alternate
keys, the `WorkspaceMember.Role` column, the ADR-011 batch invariant. Documentation
that reads as ground truth and isn't is worse than no documentation.

Nothing reaches the database by hand. Every migration goes through a pull request
and a green CI run, and **merges automatically once that run is green**.

**Changed 2026-08-17, by the schema owner, replacing the approval gate agreed
earlier the same day.** Until then a migration needed the owner's yes at the merge.
The gate was removed deliberately and the trade was stated when it was: CI can prove
the schema is internally consistent, and it cannot prove the schema matches the
shop. Nothing replaces that judgement — it now happens *after* the merge instead of
before it, and because migrations are append-only, acting on it means a fix-forward
migration rather than an edit to an unmerged file.

So the obligation moved rather than disappeared. Claude opens the PR, reports what
CI actually said — **read from the job log by name**, since a green tick is also
what a silently skipped test step looks like — merges on green, and names every
modelling choice it made on the owner's behalf, in the PR body and in its closing
report, so that choice can still be overturned while it is cheap. The ones that stop
being cheap are the ones the seed writes data against.

What is still not allowed is merging red, or merging on the strength of the tick.

## Migrations

| File | Contents |
|------|----------|
| `0001_foundation_tenancy_and_units.sql` | Roles enum, `unit` reference table + seed, `workspace` / `location` / `workspace_member` / `member_location` / `workspace_setting`, RLS helper functions incl. `my_locations()`, `onboard_workspace()`, RLS policies, grants |
| `0002_catalog.sql` | `btree_gist` + `citext`, `normalize_name()`, `product_family`, `product_variant` (+ dimension-consistency trigger), `provider` (+ non-deletable generic), `price_list` (sell prices only, no-overlap exclusion constraint), `workspace_invite`, `onboard_workspace()` replaced to seed the generic provider, RLS policies, grants |
| `0003_transactions.sql` | `waste_reason` enum, `purchase`/`purchase_line`, `sale`/`sale_line`, `waste`/`waste_line` — all `location_id`, all carrying `payload_hash` and `reversal_of` on the header; composite header↔line FKs; one-reversal-per-document index; an append-only trigger on all six; select-only RLS and grants |
| `0004_inventory.sql` | `batch_origin` + `movement_reason` enums, `stock_batch`, `stock_movement`, `batch_balance` + the two projection triggers, `batch_balance_violations()`, `rebuild_batch_balance()`; append-only triggers on batch and movement; cost-gated RLS on batch and movement, member-level on the balance; a `unique (id, workspace_id, location_id)` added to `purchase_line` |
| `0005_allocation.sql` | `fefo_allocation` + `transfer_allocation` composite types, `allocate_fefo()`, `allocate_transfer()`. No table, no policy, no execute grant for any role |
| `0008_provider_price_memory.sql` | `provider_price_memory` — one `security_invoker` view over `purchase_line`, the last price paid per `(workspace, provider, variant)`. No table, no policy, no function |
| `0009_product_margin.sql` | `product_margin_daily` — one `security_invoker` view, gross margin by product per store per day, net of tax. Revenue from `sale_line`, cost from the `sale` movements that consumed the lots FEFO picked. No table, no policy, no function. The one view in the repo that states a `has_role` predicate of its own, because it joins member-level revenue to manager-only cost |
| `0010_allocator_time_and_price_tiebreak.sql` | Two corrections the 1.6 seed found: `allocate_fefo()` gains a **required** `p_occurred_at` and stamps its shortfall lot with it, `allocate_transfer()` stamps its destination lot with the one it already took, and `provider_price_memory` breaks its tie on price / tax rate / display unit instead of on a uuid. No table, no policy, no new grant |
| `0011_waste_share_of_purchases.sql` | `product_waste_daily` — one `security_invoker` view, waste cost against purchases by product per store per day. Numerator from the `waste` movements that consumed the lots, denominator from `purchase_line`, net of tax. **It does not divide** — the ratio belongs to the caller's window, not to a row. No table, no policy, no function, and deliberately no `has_role` predicate: both its base tables are manager-gated, so inheritance fails closed |

| `0012_location_timezone.sql` | `location.timezone` — one column, NOT NULL, defaulted to `America/Mexico_City`, plus a trigger refusing a name `pg_timezone_names` does not carry. `product_margin_daily` and `product_waste_daily` replaced to read it instead of a hardcoded literal. The default is exactly what they hardcoded, so applying it moves no bucket — asserted, not assumed |
| [`0013_velocity_vs_trailing_average.sql`](https://github.com/bersermi/RetailerManagementTool/actions/runs/32582552739) | `product_velocity_daily` — one `security_invoker` view, units and takings per store per product per day **on a generated day spine**, beside the same measures over the trailing 28 days. No table, no policy, no function, and no `has_role` predicate: every base table is member-level, so a cashier reads their own store's velocity and there is no cost column for inheritance to fail open on. ⚠️ **It does not divide** — `trailing_days` and `trailing_traded_days` are both honest denominators and they disagree by 17.9% at a store that shut for five days. ⚠️ **91% of its rows exist to say nothing happened**, which is the answer rather than waste: no ledger holds a row for a sale that did not occur |
| [`0014_velocity_spine_reads_stock.sql`](https://github.com/bersermi/RetailerManagementTool/actions/runs/32584197118) | `product_velocity_daily` — `create or replace`, one new CTE and one new column. The day spine starts at the earlier of a pair's first sale and its first **stock receipt**, read from `batch_balance`; plus `days_carried`. No table, no policy, no function, no new grant. ⚠️ **This is 2.3's finding fixed, and it needed no new table** — ADR-035 §2.9's "stock is already per location" was right. All 71 delivered-and-never-sold pairs become visible, and the spine start can only ever move EARLIER (`least`, not "instead of"), so no report can lose a row it printed yesterday. `batch_balance` and not `stock_batch` because the projection carries no cost and its RLS predicate is `sale_line`'s character for character: **a cashier reads 454 rows of the first and 0 of the second** |

**`0010` is a fix-forward, and it takes the next free number rather than `0006`.**
Both defects were found by the seed, three tasks after the migrations carrying
them, and neither was patched where it was found — the seed must not work around
the objects it exists to exercise, and `0005` and `0008` are applied and therefore
closed. `0006` and `0007` are reserved and unwritten (`0009` was, and is now the margin
view); renumbering planned work to make a correction look tidy would be the more
confusing choice.

⚠️ **`0006` will apply BEFORE `0010` on a fresh reset and must still be written
against the six-argument `allocate_fefo`.** plpgsql does not resolve the functions
a body calls until the body runs, so `record_sale` written against the
five-argument version applies clean and then fails at the first till. There is no
five-argument version after `0010`, and there is no compiler that will say so.

⚠️ **`0013` raised the one finding of step 2 that looked like a SCHEMA change, and
`0014` closed it without one.** `0013`'s day spine started at the first day a store
put a product on a ticket, so a product delivered and never once sold was invisible —
71 (store, product) pairs. `0013`'s header concluded the fix was a new
per-(location, variant) "carried from" table. **That conclusion was wrong.**
ADR-035 §2.9 settled on 2026-08-14 that *"stock is already per location, which covers
'we don't carry that here' without splitting anything"*, and it was right:
`stock_batch` carries `(location_id, variant_id, received_at)` and its `origin` spans
purchase, transfer and adjustment. `0014` starts the spine at the earlier of the first
sale and the first stock receipt and the gap closes to **zero**, with no new table.
**No schema change is owed to any of §2.9's three questions.**

⚠️ **One adjacent fact is still genuinely unrecorded and is the owner's call:
delisting.** "When did we start carrying this" is answerable from the ledger, as
`0014` shows; "when did we decide to stop" is an intention, and the ledger records
events. A product stocked once and deliberately dropped keeps generating silence rows
until the store stops trading. That was equally true before `0014`, so nothing
regressed — but it is a new fact and nothing in the schema holds it.

Planned next, in order (ADR-035 §3):

- `0006` — RPCs: `record_sale`, `record_purchase`, `record_waste`, `record_transfer`,
  `void_transaction`, `adjust_stock`, `adjust_stock_delta`
- `0007` — failure path: `failed_write`, `record_failed_write`, `replay_failed_write`
  (ADR-035 §3 step 4.5 — before any screen exists)
- `0013` — what stopped selling: velocity against a trailing average (plan task 2.3)

**The analytics half of the old `0009` line is now three files, not one.** `0009`
and `0011` ship the first two of §2.9's three questions and are applied; the third
takes the next free number as it is written — **`0013`, because `0012` went to the
shop timezone** (below), because a migration is append-only once
applied and three tasks that merge separately cannot share a file. **The nightly
materialised rollups and the live partial-day union are in none of them** — they are
a latency answer, they need a scheduler this project has not chosen, and the design
gate asks whether the questions are answerable, not whether they are fast. Each view
is written at a grain that materialises as `select * from` it.

`0008` is **already applied** — it is the provider price memory view and nothing
else. It was listed here as one line with the analytics views and has been split
from them, for the reason every migration in this repo is narrow: they answer
different questions, and bundling them would have put a view Comprar depends on
behind a review three times its size. The analytics half keeps its place in the
order and becomes `0009`.

**`0008` also landed before `0006` and `0007` exist.** `docs/PLAN.md` task 1.4
depends only on `0003`, and the seed wants the prefill in place. Files apply in
name order, so a later `0006` and `0007` slot in ahead of it on the next
`supabase db reset` with no ambiguity. The one real cost is that a hosted database
which had already applied `0008` would need `supabase db push --include-all` to
accept them — and no hosted database exists yet.

**`0005` is new, and everything after it shifted by one** (2026-08-17). FEFO
allocation is a ledger primitive, not a detail of `record_sale`: the seed writes the
ledger three steps before the RPCs exist, and a seed that allocates differently from
`record_sale` would let step 2 — the design gate, which turns on margin-by-product —
pass on data the real system never produces. One `security definer` allocator, called
by the seed and later by the RPCs. This is the same reasoning ADR-035 §2.4 already
applies to the transfer movement shape, which it fixes in the ledger migration even
though the screen ships at step 6. The decision and its alternatives are in
[`docs/PLAN.md`](../docs/PLAN.md).

`0002` predates the shift and its comments still call the RPC migration `0005`. It
has been applied, so it is not edited — this table is the authority on numbering and
that comment is stale by one. `0001` and `0003` carry no stale reference.

**The transfer movement shape lives in `0004`, its mechanics in `0005`.** ADR-035
§2.4 fixes the shape "in migration `0004`" — that is, in the ledger migration, which
after the renumbering above is the inventory one. So `0004` defines the columns and
constraints a transfer needs (`transfer_in` / `transfer_out`, `transfer_group_id`,
`stock_batch.source_batch_id`) and `0005` supplies the paired write that fills them.
The alternative was an `ALTER` in `0005` adding columns to a table `0004` had just
defined, which reviews worse and leaves `0004` with a ledger that cannot represent
one of the four things the ledger does.

**`0004` alters `purchase_line`,** adding `unique (id, workspace_id, location_id)` so
`stock_batch.source_purchase_line_id` can carry a composite FK. `0003` is applied and
therefore closed; this is the fix-forward the numbering rule prescribes, not an edit.
Without it a batch in one tenant could name a purchase line in another.

`price_list` carries no `provider_id`. Sell prices are curated and per location;
purchase prices are *remembered* per provider-product pair and derived from
`purchase_line`, so they are a view in `0008` — shipped 2026-08-18 — and not a
table anywhere.

**The catalog carries no `provider_id` either, and that is the same decision seen
from the other side.** A product belongs to the merchant, not to a supplier: once a
variant exists it can be bought from anyone, and only the providers it has actually
been bought from have a price to offer. `provider_id` appears on `purchase`, on
`stock_batch` and on the derived view — nowhere in `product_family` or
`product_variant`. Confirmed against the schema and by the owner, 2026-08-18.

**Somebody still owes the merchant a price history**, globally and per provider,
which `provider_price_memory` does not answer — it is the last price, not a series.
It was filed under `0009` when `0009` meant "the analytics migration"; `0009` is now
the margin view, and a price history is not one of §2.9's three questions, so it has
no number yet and belongs with Números (step 7) or a task of its own. The data
is all in `purchase_line` already. When writing it, keep the reporting question and
the prefill question apart: "no fallback across providers" governs the **prefill**, not
the report, and a cross-provider comparison is the whole point of the history. Putting both
kinds in one table is what created the NULL that made the overlap constraint inert
(ADR-035 §2.3).

Files are applied in numeric order. `supabase migration new` generates timestamp
prefixes, which sort after these — that ordering is correct, so mixing the two
conventions is safe.

## Policy shapes

Two, and every business table from `0002` onward uses exactly one of them.

**Workspace-level** — catalog, providers, price lists:

```sql
alter table public.<table> enable row level security;

create policy tenant_isolation on public.<table>
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));
```

**Location-level** — anything on the ledger (`stock_batch`, `stock_movement`,
`batch_balance`, `purchase`, `sale`, `waste` and their lines):

```sql
create policy tenant_isolation on public.<table>
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));
```

The workspace predicate in the second is redundant — `my_locations()` already implies
membership — and is kept anyway: indexed, cheap, and one uniform prefix is what makes
the shape safe to copy without thinking. Both are written `in (select fn())` rather
than as a bare call so the planner evaluates them once per query, not once per row.

There is no administrative exception and no cross-workspace read policy.

**One qualifier, added in `0003` and extended in `0004`.** Five tables carry cost —
`purchase`, `purchase_line`, `waste_line`, and now `stock_batch` and
`stock_movement` — and their policies append
`and public.has_role(workspace_id, 'manager')` to the location-level shape. That is
still one of the two shapes; the role predicate is a filter on top of it, never a
replacement for either tenancy predicate, and the ADR-035 §2.7 rule it implements is
that staff hold no `select` on a base table carrying cost. The staff-facing
`security_invoker` views that expose the non-cost columns ship with the screens that
need them. `waste` (the header) is deliberately *not* gated: it carries retail value,
not cost, and a cashier must be able to see that the document exists.

`batch_balance` is on the other side of that line, and the reason is worth stating
because it is what makes the gate free: **the projection carries no cost column at
all**, so "how much is on the shelf" — the one inventory question a cashier has to be
able to answer — is served entirely by the member-level table. Only the two tables
that carry `unit_cost_net_per_base` are manager-and-above.

**Transaction and ledger tables are `select`-only.** Clients never insert (ADR-035
§2.6), so `0003` and `0004` grant `select` and nothing else and write no
insert/update/delete policy. The absence is the design. Documents, batches and
movements additionally carry a `before update or delete` trigger that raises
`restrict_violation` — aimed not at `authenticated`, which has no grant anyway, but at
the `security definer` functions of `0005`–`0007`, where RLS and grants are not
running and a well-meaning `UPDATE` would look ordinary in review. `batch_balance` is
deliberately not guarded: it is the one table that is supposed to change, and
`rebuild_batch_balance()` deletes from it.

`my_workspaces()` and `my_locations()` are `security definer` so they can read
`workspace_member` without tripping that table's own policy — without it the policies
recurse.

`my_locations()` is **fail-closed by role**: managers and owners get every active
location in their workspaces; staff get only locations with an explicit
`member_location` row. Do not "simplify" this to *no rows means all locations* — that
fails in the direction where a forgotten insert shows a cashier the other store's
takings and nobody reports it.

**`price_list` is the one trap.** It has a `location_id` and still uses the
**workspace-level** shape, because `location_id is null` means "applies to every
location". Copy the location-level shape onto it and every workspace-default sell
price becomes invisible — including on the sell path. It is the only table where the
presence of a `location_id` column does not imply the location shape.

**Cost and margin: manager-only views** (settled 2026-08-14, ADR-035 §2.7). Not
column privileges. Staff hold `select` on views only and never on the base tables
carrying cost; views are `security_invoker = true` so RLS still governs rows.

`GRANT SELECT (col…)` was the other candidate and loses on one point: `supabase gen
types typescript` still emits the restricted columns, so a staff-role read of
`unit_cost_net_per_base` compiles clean and fails at runtime, in front of a customer.
With views the generated type surface genuinely differs and the build catches it.

**RLS does not run inside the RPCs.** Every write function is `security definer`, so
each one must validate its `location_id` against `my_locations()` as its first
statement (ADR-035 §2.6). That check is the wall for writes, and it is the first
thing to look for in any RPC review.

**One function is deliberately exempt.** `record_failed_write` validates *workspace*
and not location. The commonest reason a write is permanently rejected is that the
caller's location access was wrong, so a function that refused the report for the
same reason it refused the write would lose exactly the events it exists to capture.
This is the only such exception in the write surface. Reviewing it means confirming
it writes to `failed_write` and to the ledger via `adjust_stock_delta`, and to
nothing else.

**Idempotency** (ADR-035 §2.6). Headers insert with `on conflict (id) do nothing`.
Same id and same `payload_hash` returns the existing document with
`already_recorded: true` — a success. Same id with *different* lines raises and is
dead-lettered; accepting either version silently would hide a client bug or rewrite a
committed sale.

## Money

Integer centavos everywhere. No floating point in the money path, at any layer.

With `prices_include_tax = true` the gross unit price is authoritative, and the RPC
splits **per line**:

```
line_gross = round(unit_gross × qty)
line_net   = round(line_gross / (1 + rate))
line_tax   = line_gross − line_net          -- residual, never rounded on its own
```

The residual is what makes `net + tax = gross` hold exactly on every line, forever.
Document total is the **sum of rounded lines**; the document is never rounded
independently. Rounding is **half-up, away from zero** — banker's rounding surprises
the person checking the arithmetic by hand, who in a shop is the person who matters.

This logic exists twice, here and in `packages/money` (ADR-035 §2.6). The pgTAP money
suite and Vitest both read **one** file, `packages/money/cases.json`. Do not fork it
into a SQL fixture: two sets of expectations that happen to agree are how drift
starts, and each copy looks correct on its own.

## Timestamps

- `recorded_at` — server `now()`, non-nullable, never client-supplied.
- `occurred_at` — server overrides with `now()` unless `recorded_offline`; when
  offline, the client value is accepted but clamped to `[now() − 72h, now()]`.
- `replay_failed_write` is **exempt** and preserves the stored `occurred_at`.
  Without the exemption every recovered sale is re-dated to the moment of recovery.

Daily totals and the 15-minute void window read `occurred_at`. Audit reads
`recorded_at`.

## Verification status

`0001` was **applied locally** for the first time on 2026-08-16, against Postgres 17
via OrbStack, Supabase CLI 2.114.0. `supabase db reset` completed with no errors and
all six confirmations below pass.

**CI applied it green on 2026-08-17**, run
[31992129685](https://github.com/bersermi/RetailerManagementTool/actions/runs/31992129685),
and again under `0002` in
[31996346725](https://github.com/bersermi/RetailerManagementTool/actions/runs/31996346725).

*This paragraph said "CI has not yet run" until 2026-08-17. It was false from the
moment `.github/workflows/db.yml` was merged — the workflow runs on push to `main`,
so it had already gone green three times before anyone corrected the sentence. A
verification section that understates is the same defect as one that overstates:
either way the file is not the thing it claims to be. Check the Actions tab, not this
file, and then fix this file.*

```bash
brew install orbstack                    # lighter than Docker Desktop
brew install supabase/tap/supabase
supabase init && supabase start
supabase db reset                        # applies migrations from scratch
```

`supabase start -x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`
brings up only what a migration reset needs.

Confirmed 2026-08-16 (all six pass; the RLS check was run under `set role
authenticated`, since the `postgres` superuser bypasses RLS and would pass
vacuously):

- the 10 seeded units are present;
- `onboard_workspace('Tienda X')` creates exactly four rows — workspace, owner
  membership, settings, and one location named `Tienda X`;
- a second authenticated user sees zero rows from the first user's workspace;
- a staff member with no `member_location` row gets zero locations from
  `my_locations()`, and one after an assignment is inserted;
- a manager gets every location without any `member_location` row;
- `member_location` refuses a member and a location drawn from two different
  workspaces (the composite FKs should reject it).

### `0003` — transactions

Applied locally 2026-08-17, same toolchain. `supabase db reset` applies `0001`–`0003`
with no errors, and **39 behavioural checks pass**, all of them run from
`supabase/tests/0003_transactions.sql`:

```bash
supabase db reset
psql "$(supabase status -o env | grep '^DB_URL=' | cut -d'"' -f2)" \
  -v ON_ERROR_STOP=1 -f supabase/tests/0003_transactions.sql
```

The checks cover: the reversal self-FK (a void cannot cross a store or a tenant, a
document cannot reverse itself, and a document cannot be voided twice); client-id
idempotency (`on conflict (id) do nothing` inserts no second row and leaves the
committed totals alone, while a bare re-insert still raises); the composite
header↔line FKs; the sign and rate CHECKs; the append-only trigger, exercised **as
superuser**; and RLS from four callers — a staff member at one store, a staff member
at the other, a manager, and the owner of a second tenant — all under `set role
authenticated`.

**That file is part of the CI gate**, running after the reset in
`.github/workflows/db.yml`. ADR-035 §3 step 3 replaces it with pgTAP.

**CI applied `0001`–`0003` from scratch and ran all 39 checks green on 2026-08-17**,
run [32002904624](https://github.com/bersermi/RetailerManagementTool/actions/runs/32002904624)
on PR [#1](https://github.com/bersermi/RetailerManagementTool/pull/1). That is the
first run in which the gate asserted **behaviour** rather than only that the DDL
parses, and it is the first schema claim in this repo that meets ADR-035 §9 in full.

The harness fails loudly: a deliberately falsified check was confirmed to exit
non-zero before the file was committed, so green is not the only colour it can be.

### `0004` — inventory

Applied locally 2026-08-17, same toolchain. `supabase db reset` applies `0001`–`0004`
with no errors, and **54 behavioural checks pass** from
`supabase/tests/0004_inventory.sql`, which joins the same CI gate. The `0003` suite
still passes unchanged at 39 — worth stating, because `0004` alters `purchase_line`.

The checks cover: the `batch_origin` provenance constraint (a purchase batch with no
purchase line, an adjustment batch carrying one, a transfer batch with no source are
all refused); one batch per purchase line; cross-tenant and cross-store rejection on
every composite FK; the movement sign rule per reason and its deliberate exemption
for a compensating movement; the source-document rule (a sale carrying a purchase
document, a sale carrying none, a transfer leg with no `transfer_group_id`, an
adjustment pretending to be a transfer); a reversal filed against a different batch;
a movement reversed twice; the append-only guard on both tables **as superuser**,
including the attempt to relocate a batch; the transfer shape carrying cost and
expiry forward while the origin batch stays put; and RLS from four callers under
`set role authenticated` — a cashier at each store, a manager, and a second tenant.

**The §2.4 invariant is asserted, not described.** `batch_balance_violations()` is
empty across a fixture that includes a reversal and a deliberate oversale;
`rebuild_batch_balance()` reproduces every projection row exactly from
`stock_movement` alone, `updated_at` excepted; and the check is shown to be capable
of failing — the projection is corrupted two ways, a wrong number and a deleted row,
both are detected, and the rebuild repairs both. Plan task 1.7 wires the same
function over seed data.

A negative `remaining_base` is asserted to be **representable**, not rejected. v1
records stock and does not enforce it (§2.6); a `>= 0` constraint would turn a
permitted oversale into a raised exception at the counter.

**CI applied `0001`–`0004` from scratch and ran both suites green on 2026-08-17**,
run [32043051234](https://github.com/bersermi/RetailerManagementTool/actions/runs/32043051234)
on PR [#2](https://github.com/bersermi/RetailerManagementTool/pull/2) — *all 39 checks
passed* for `0003` and *all 54 checks passed* for `0004`, read from the job log rather
than from the green tick, since a green tick alone would also be what a silently
skipped test step looks like.

### `0005` — allocation

Applied locally 2026-08-17, same toolchain. `supabase db reset` applies `0001`–`0005`
with no errors, and **52 behavioural checks pass** from `supabase/tests/0005_allocation.sql`
plus **9 more** from `supabase/tests/0005_allocation_concurrency.sh`. `0003`'s 39 and
`0004`'s 54 still pass unchanged.

The 52 cover: the FEFO order on all three keys — expiry ascending, `received_at` as
the tiebreak, and `batch_id` as a deterministic third key — with nulls sorted last
and a closed lot skipped although it expires first; the candidate set never leaving
the location, proven against a larger, sooner-expiring lot at the other store that
would win every allocation if the scope leaked; all three shortfall branches; the
argument guards; and the whole transfer shape — cost and expiry carried forward,
`received_at` and `provider_id` not, one destination lot per origin lot, four paired
movements netting to zero, the origin batch still at the origin, and the destination
afterwards rotating on the carried expiry. The §2.4 invariant is empty across all of
it and `rebuild_batch_balance()` still reproduces every row.

**Two kinds of test file, from `0005` onward.** A `.sql` file is one psql session.
A `.sh` file drives several, and exists because one claim cannot be made from a
single connection: a session cannot block on its own lock, so a one-session test of
`allocate_fefo()`'s `for update of bb` asserts nothing. `.github/workflows/db.yml`
runs both kinds in one name order.

**Files beginning with `_` are harness, not suites,** and the loop skips them. There
is one: `supabase/tests/_cleanup.sql`, which runs before each suite. Suites assume a
database holding nothing but their own fixture — they share hardcoded user uuids and
assert absolute counts — and none can tidy up after itself, because the ledger is
append-only. That used to be satisfied by repeating `supabase db reset` per file, at
**20.5s** each; the cleanup does it in **0.56s** by dropping the `_`-prefixed scratch
tables and `TRUNCATE ... CASCADE`-ing everything but `unit`. TRUNCATE is what makes
it possible: it does not fire row triggers, so the append-only guards that correctly
refuse a DELETE do not stand in the way, and no row is ever deleted — tables are
emptied wholesale between suites and never during one.

The full reset still runs **once**, before any suite. That is the run proving the
migrations apply from scratch, and it is not traded for anything. The cleanup's table
sweep reads `pg_tables` rather than naming tables, so a table added by a later
migration is covered the day it lands, and it ends by asserting it emptied what it
claims — verified by leaving one table out of the sweep and watching it raise
`cleanup left 3 row(s) in public.workspace`, because a cleanup that quietly did half
its job would leave the next suite counting another fixture's rows and passing.

**The concurrency file is the reason to read this paragraph.** Its first draft
asserted that the second session *blocks* — and it passed with the locking clause
deleted, because the projection trigger's `on conflict (batch_id) do update` blocks
the second writer on its own. Blocking is true in both worlds. What separates them is
**what session two allocated after it waited**: with the lock it re-reads and takes
the next lot, without it it writes the stale decision it made before it blocked, and
the emptied lot goes to −100 while a full lot sits untouched. Confirmed by deleting
the clause and watching three checks go red — and note that
`batch_balance_violations()` stays *empty* in the broken build, which is exactly why
this needed a test and not an argument.

**CI applied `0001`–`0005` from scratch and ran all four suites green on 2026-08-17**,
run [32097844689](https://github.com/bersermi/RetailerManagementTool/actions/runs/32097844689) on PR [#3](https://github.com/bersermi/RetailerManagementTool/pull/3)
— *all 39*, *all 54*, *all 52* and *all 9 checks passed*, read from the job log rather
than from the green tick, since a green tick alone would also be what a silently
skipped test step looks like. It is also what a `.sh` file the loop never reached
would look like, which is new in this run and worth having checked by name.

### `0008` — provider price memory

Applied locally 2026-08-18, same toolchain. `supabase db reset` applies `0001`–`0005`
and `0008` with no errors, and **44 behavioural checks pass** from
`supabase/tests/0008_provider_price_memory.sql`, which joins the same CI gate.
`0003`'s 39, `0004`'s 54, `0005`'s 52 and the concurrency file's 9 all still pass
unchanged — 198 checks in five suites.

The 44 cover: the derivation itself (one row per pair and not one per delivery, the
later delivery winning, the denomination and the snapshotted `tax_rate` riding
along, a back-dated document recorded later *not* winning); provider scope, which is
the point of the table it replaces — a second provider's price is its own row, and a
variant bought only from one provider gives the other **nothing**, because there is
no fallback across providers (§2.3); location scope, where a delivery at the other
store *does* count, since the memory is workspace-wide; both exclusions; the four
sort keys; tenant isolation; and access from four callers under `set role
authenticated`.

**Both exclusions are separately load-bearing, and this had to be forced.** A void
writes a second document and never touches the first, so a naive "last purchase
line" is wrong twice: the reversal is itself the most recent row, and once that is
filtered the *voided* document becomes the most recent row again and prefills
forever. The first draft of this suite could not tell those apart. Deleting
`p.reversal_of is null` from the view left **all 41 checks green**, because every
reversal in the fixture carried a negative line and the `qty_base > 0` filter was
quietly doing that exclusion's work. The fixture now contains a voided *return* — a
reversal whose compensating line is **positive**, which 0003 permits and which is
the one shape where the predicate is the only thing standing between the shop and a
cancelled price. Same story for `recorded_at`: the key could be deleted with the
suite still green until a pair of same-instant deliveries was added, and the
document-id key was passing on a coin toss until the tie pair's line ids were pinned
to rank the *opposite* way to its document ids.

Every clause of the view has since been deleted or inverted in turn and watched go
red, which is the only evidence that any of them is doing something:

| Falsification | Checks that fail |
|---|---|
| `p.reversal_of is null` removed | 3 |
| `not exists (… r.reversal_of = p.id)` removed | 9 |
| `pl.qty_base > 0` neutered to `<> 0` | 2 |
| `p.occurred_at desc` → `asc` | 5 |
| `p.recorded_at desc` removed | 1 |
| `p.id desc` removed | 1 |
| `pl.id desc` → `asc` | 1 |
| `security_invoker = true` → `false` | 6 |

The last row is worth reading twice. With the view switched to definer rights a
**staff member sees every cost row in the workspace and a second tenant sees the
first tenant's prices** — the exact commercial exposure §2.7 exists to prevent, from
a one-word change, caught here by checks 34 and 39.

**The two-index plan is confirmed against a real `explain`,** which is what
`docs/PLAN.md` task 1.4 asked for and what `0003` deferred to it. ADR-035 §2.3 asks
for one index, `(workspace_id, provider_id, variant_id, occurred_at desc)`; it is not
creatable, because `provider_id` and `occurred_at` are on the header and `variant_id`
is on the line. `0003` shipped `purchase_by_provider_idx` and
`purchase_line_by_variant_idx` instead. On a 1 000-document, 4 000-line fixture the
planner uses **both**, plus `purchase_one_reversal_idx` for the voided-document
exclusion, with **no sequential scan** — 17 buffers, 0.17 ms. Checks 40–43 assert
that from the plan JSON, in CI, so a later migration that drops an index fails here
rather than in Comprar. Measured again by hand at 12 000 documents and 60 000 lines:
same three indexes, 180 buffers, 1.2 ms.

One thing the plan does **not** show, recorded because it is the honest limit of the
claim: a lookup qualified by provider *without* a variant — "prefill every line of
this delivery at once" — cannot use `purchase_line_by_variant_idx`, and the planner
chose a sequential scan of `purchase_line` for it (18 ms at 60 000 lines, against
3 ms for the nested loop over `purchase_line_by_header_idx` it declined). That is a
cost estimate on a single-tenant fixture where `workspace_id` selects every row, so
it is not evidence of a production problem; it is a shape to re-measure when Comprar
exists and there is more than one tenant in the table. No index was added for it
here, deliberately — speculative indexes on a guess are how the last model got its
`ProviderProductPrice`.

**`0010` and the five suites it moves are verified on 2026-08-19** — see the `0010`
row in the migrations table and the seed sections below. Locally: `supabase db reset`
green, three consecutive resets byte-identical *including* the price prefills, and
**39 / 54 / 55 / 9 / 46** checks passing. Four falsifications, each caught by the check
written for it.

**CI applied `0001`–`0005` and `0008` from scratch and ran all five suites green on
2026-08-18**, run
[32191899904](https://github.com/bersermi/RetailerManagementTool/actions/runs/32191899904)
on PR [#7](https://github.com/bersermi/RetailerManagementTool/pull/7) — *all 39*,
*all 54*, *all 52*, *all 9* and *all 44 checks passed*, read from the job log rather
than from the green tick, since a green tick alone would also be what a silently
skipped test step looks like.

### `0009` — product margin, and the design gate (plan task 2.1)

Applied locally 2026-08-20, same toolchain. `supabase db reset` applies `0001`–`0005`,
`0008`, `0009` and `0010` with no errors, and **34 checks pass** from
`supabase/checks/0009_product_margin.sql` — a *checks* file and not a *tests* file,
because it must read the seed and `_cleanup.sql` would have truncated it (see
`supabase/checks/` below). `0003`'s 39, `0004`'s 54, `0005`'s 55, the concurrency
file's 9 and `0008`'s 46 all still pass unchanged.

**The gate's answer: two aggregates over one grain, joined once.** Revenue from
`sale_line`; cost from `stock_movement where reason = 'sale'`; a full outer join on
`(workspace, location, variant, day)`. ADR-035 §3 step 2 said that if margin by
product needed a five-way join and a CTE to survive reversals, unit conversion and a
location rollup, the schema was wrong. It needs neither, and the reason in each case
was decided by an earlier migration rather than by this one:

- **reversals** cancel themselves, because a void is a negated document (`0003`) and
  margin is a sum. This is the exact opposite of `0008`, which had to exclude both
  sides — because "the last price paid" *picks a row*, and a picked row cannot cancel;
- **unit conversion** never appears, because §2.5 normalised every quantity to the
  base unit and every price to per-base-unit at write time. A product bought by the
  kilo and sold by the gram is grams on both sides of the join;
- **the location rollup** is a `group by` the caller drops. Consolidated and per
  store are the same query, and they agree exactly — asserted, not assumed.

**What the check would not have caught, and now does.** Excluding voided documents
*and the documents they void* — the `0008` reflex, applied where it does not belong —
left all 32 of the first draft's checks green. It has to: a void and its original
cancel, so dropping both and keeping both give the same revenue, the same per-product
total and the same per-store total. They differ only in **which day** the
cancellation lands on, and every void in the seed happens minutes after its original
on the same day. Two checks were added that count rather than sum — every
`sale_line` and every sale movement must appear in exactly one bucket — and they
catch it (2 239 lines against 2 263). A void **cancels** its original; it does not
**erase** it.

Falsified, and each row is a `create or replace` of the shipped view watched go red:

| Falsification | Checks that fail |
|---|---|
| COGS sign inverted (`qty × cost`, not `-qty × cost`) | 6, incl. *"178.3% margin"* |
| Voided documents and their voids excluded from revenue | 1 — the line count |
| The `has_role` gate deleted from the view body | 1 — *a cashier reads ZERO rows* |
| The day taken from `stock_movement` instead of from `sale` | **0 — see below** |
| `full outer join` weakened to `join` | **0 — see below** |

**⚠️ THE LAST TWO ROWS ARE THE HONEST PART.** Neither is caught, and neither is
caught for a reason worth writing down rather than fixing with a cleverer check:

- every sale movement in the seed carries **exactly** its document's `occurred_at`,
  so the two ways of dating a bucket agree on every row. Taking the day from the
  document is still the right choice — it is what *guarantees* a sale's revenue and
  its cost land in one bucket instead of leaving that to a convention every future
  writer has to honour — but the seed cannot prove it, and no check here pretends to;
- every bucket in the seed has both a revenue side and a cost side, so the outer join
  never fires. It is there for the two failures that must never be silent: revenue
  with no cost (which reads as 100% margin) and cost with no revenue (stock that left
  the shelf against a ticket that never charged for it). `cost_attributed` exists so
  the first of those cannot hide in a rollup.

**A cashier reads zero rows, and this is the one view that says so in its own body.**
`0008` deliberately does *not* restate §2.7's predicate, and is right not to: both
tables it reads are manager-gated, so inheritance fails closed. This view reads a
**mix** — `sale` and `sale_line` are member-level, `stock_movement` is
manager-and-above — so `security_invoker` alone would hand a staff session every
revenue row, no cost rows, and the answer *margin = revenue*. The check demonstrates
that rather than describing it: the same query without the gate is created, granted,
and read by the seeded cashier at Centro, who sees **216 rows, every one of them
reporting zero cost**.

The gate's second half, `or not row_security_active('public.stock_movement')`, is not
a hole. It is true exactly for the callers RLS does not filter — the superuser and
`service_role`, which carries `BYPASSRLS` — both of which already read every cost row
in the database. Without it `auth.uid()` is null for both, `has_role` is false, and
the view returns **zero rows to the two callers that need it most**: §2.9's nightly
materialised rollup is a scheduled `service_role` job, and every file in
`supabase/checks/` runs as the superuser.

**⚠️ THE DAY BOUNDARY IS HARDCODED TO `America/Mexico_City`, AND NOTHING RECORDS A
SHOP'S TIMEZONE.** `occurred_at` is `timestamptz` and a trading day is local;
bucketing in UTC would push an evening's takings onto tomorrow. Neither `location`
nor `workspace_setting` has a timezone column, and `0009` deliberately does not add
one: a column is append-only and a view is `create or replace`, so the reversible
half is the constant. The day a customer signs in Sonora or Baja California (UTC−7
and UTC−8, no DST, against this constant's UTC−6) the fix is `location.timezone`
defaulted to this value — cheap for exactly as long as no materialised rollup is
keyed on `day`.

**CI applied `0001`–`0010` from scratch and ran everything green on 2026-08-20**, run
[32375602999](https://github.com/bersermi/RetailerManagementTool/actions/runs/32375602999)
on PR [#17](https://github.com/bersermi/RetailerManagementTool/pull/17) — *all 34
product margin checks passed*, *all 18 seed invariant checks passed*, *2 seed check
file(s) ran*, then *all 39*, *all 54*, *all 55*, *all 9* and *all 46 checks passed*,
read from the job log rather than from the green tick, since a green tick alone would
also be what a silently skipped test step looks like.

**⚠️ AND THE SEED CANNOT TEST IT.** `20_consumption.sql` builds every timestamp as
`v_day + interval '9 hours'` in a UTC session, so the seeded shop trades 09:00–20:40
**UTC** — 03:00–14:40 in Mexico City. Nothing crosses midnight in either zone, so
local and UTC bucketing produce identical rows and the constant is inert over the
seed. The check states this rather than hiding it: one check proves the expression is
local by construction, and a second pins the bound at zero documents whose local day
differs from their UTC day, so the day a seed is written with a realistic evening
trade it goes red and someone reads this paragraph.

### `0011` — waste against purchases, and the ratio that is not a column (plan task 2.2)

Applied locally 2026-08-20, same toolchain. `supabase db reset` applies `0001`–`0005`
and `0008`–`0011` with no errors, and **55 checks pass** from
`supabase/checks/0011_waste_share_of_purchases.sql`. `0009`'s 34, `1.7`'s 18,
`0003`'s 39, `0004`'s 54, `0005`'s 55 and `0008`'s 46 all still pass unchanged.

**The same shape as `0009`: two aggregates over one grain, joined once.** Numerator
from `stock_movement where reason = 'waste'` joined to `waste`; denominator from
`purchase_line` joined to `purchase`; a full outer join on
`(workspace, location, variant, day)`. The ADR's three fears fall the same way they
did for margin, and for the same reasons — a void is a negated document, §2.5
normalised the units at write time, and the location rollup is a `group by` the
caller drops.

**⚠️ THE VIEW DOES NOT DIVIDE, AND THAT IS THE FINDING.** `0009` ships `margin_rate`
on the row because a sale's revenue and that sale's cost are the *same event*: one
document, one day, always. Waste and the delivery it should be measured against are
**different documents on different days**, usually weeks apart. Over the seed, **136
of 137 day-grain waste buckets have no delivery of that product at that store on that
day** — so a row-level rate would be null in 99.3% of the rows that have any waste in
them, and the remainder would be a coincidence of scheduling rather than a
measurement. The view carries an additive numerator and an additive denominator and
the caller divides once, at the window they actually asked about. Ratios do not add;
pesos do.

**⚠️ AND THE DIVISION FAILS THREE WAYS, NOT ONE.** `docs/PLAN.md` task 2.2
anticipated a single division by zero — a product wasted in a window it was not
bought in. The seed contains three distinct failures, and **only the first is a
zero**:

| | `purchases_net` | `purchase_line_count` | Seed, at month grain |
|---|---|---|---|
| Never bought in the window | 0 (coalesced from null) | **0** | 40 buckets |
| Bought, then cancelled inside the window | **exactly 0** | 2 | 11 buckets |
| Bought before the window, voided inside it | **negative** | 2 | 1 bucket — *Cebolla blanca* at Centro, June 2026, −270.43 |

So the guard is **`sum(purchases_net) > 0`, not `nullif(..., 0)`**: `nullif` passes a
negative denominator straight through and the report prints a negative waste
percentage, which reads as un-wasting onions. The first two rows are both zero and
they are **not the same fact** — one shop never ordered the goods, the other ordered
them and cancelled — which is why `purchase_line_count` is a column and not a
debugging aid.

**Cost comes from the ledger, not from `waste_line`'s own snapshot.** Unlike
`sale_line`, `waste_line` *does* carry `unit_cost_net_per_base`, so this view had a
choice `0009` did not. It takes the movements, because the line's cost is a
quantity-weighted mean over the lots rounded to `numeric(14,6)` while the ledger's is
per lot, and because **the two analytics views must agree on what a peso of cost is** —
somebody will add COGS and waste cost, and they must reconcile against
`stock_movement`. Two checks pin this: the two agree to **under a centavo** (0.00011
pesos over the whole seed, which proves the snapshot is honestly derived) and are
**not identical** (which proves the choice is a real one).

**No `has_role` predicate, and that was checked rather than assumed.** `0009` states
one because it joins member-level revenue to manager-only cost, so inheritance fails
*open*. Both of this view's aggregates read manager-gated tables — `stock_movement`
(`0004`) and `purchase_line` (`0003`) — so a cashier reads zero rows from both sides
and the full outer join of two empty sets is empty. Inheritance fails **closed**,
which is `0008`'s situation and `0008`'s answer. The check asserts the outcome *and
the reason*, reading both base tables as that cashier, so a future migration that
relaxes either policy turns it red. It also demonstrates the failure this view would
have if only one side were gated: a numerator read from the member-level `waste`
header tells a cashier the shop threw away stock it never bought.

Falsified, and each row is a `create or replace` of the shipped view watched go red:

| Falsification | Checks that fail |
|---|---|
| `full outer join` weakened to `join` | **20** — it deletes 136 of 137 waste buckets |
| Voided documents excluded on both sides (the `0008` reflex) | 16 |
| Denominator taken gross, IVA included | 7 |
| Cost taken from `waste_line`'s snapshot instead of the ledger | 5 |
| Bucketing moved to UTC | 1 — *and only the cross-view drift check catches it* |
| The waste day taken from `stock_movement` instead of from `waste` | **0 — see below** |
| `location_id` dropped from the join key | **0 — see below** |

**⚠️ THE LAST TWO ROWS ARE THE HONEST PART**, recorded rather than fixed with a
cleverer check:

- every waste movement in the seed carries **exactly** its document's `occurred_at`,
  so the two ways of dating a bucket agree on every row. This is the same mutation
  `0009` could not falsify, for the same reason;
- dropping `location_id` should fan a write-off at one store out across another
  store's deliveries, and over this seed it changes nothing: **no `(product, day)`
  pair has a delivery at one store and a write-off at another.** A check pins that
  precondition at zero, so the day the seed can tell them apart it goes red.

**⚠️ TWO VIEWS NOW HARDCODE `America/Mexico_City`, AND THEY MUST NOT DRIFT.** If one
moves and the other does not, the margin report and the waste report bucket the same
shop's days differently and **no arithmetic check anywhere would notice** — the seed
trades in UTC office hours, so both bucketings agree over it. One check reads the
timezone literal out of both shipped view definitions and asserts there is exactly
one distinct value across the two. It is the only thing that caught the UTC
falsification above.

**⚠️ AND UNLIKE `0009`, THE DAY GRAIN IS LOAD-BEARING FOR VOIDS HERE.** Every void in
the sale data lands minutes after its original on the same local day, so `0009`'s
buckets never see half a cancellation. All four voids that touch this view land on a
**later** local day — up to nine days later. Over the whole window the money is
exactly what it would be if the voided pairs had never been written; at day grain the
buckets differ, and both are asserted. One product — *Papas fritas con jalapeño caja
24 bolsas*, whose only delivery was voided — keeps a **row at zero** where a ledger
with the pairs deleted has nothing at all. That is `2.1`'s "a void cancels its
original, it does not erase it" visible as a row rather than only as a count.

**CI applied `0001`–`0011` from scratch and ran everything green on 2026-08-20**, run
[32409705126](https://github.com/bersermi/RetailerManagementTool/actions/runs/32409705126)
on PR [#18](https://github.com/bersermi/RetailerManagementTool/pull/18) — *all 55
waste share checks passed*, *all 34 product margin checks passed*, *all 18 seed
invariant checks passed*, *3 seed check file(s) ran*, then *all 39*, *all 54*, *all
55*, *all 9* and *all 46 checks passed*, read from the job log rather than from the
green tick, since a green tick alone would also be what a silently skipped test step
looks like.

### `0012` — the shop timezone, and the boundary becoming reachable (plan task 2.4)

Applied locally 2026-08-20, same toolchain. `supabase db reset` applies `0001`–`0005`
and `0008`–`0012` with no errors, and **35 checks pass** from
`supabase/checks/0012_location_timezone.sql`. `0009`'s **36**, `0011`'s **56** and
1.7's 18 all pass, as do `0003`'s 39, `0004`'s 54, `0005`'s 55 and `0008`'s 46.

**⚠️ `0012` TOOK THE NUMBER 2.3 WAS PLANNED FOR.** The velocity view becomes `0013`.
The owner chose on 2026-08-20 to take the column *before* 2.3 was written, which was
the last moment it cost nothing extra: a third view hardcoding the constant would
have meant a third `create or replace` and a third chance to move two of them.

**The problem, restated.** `occurred_at` is `timestamptz` and a trading day is local,
so both analytics views had to bucket in *some* zone and no table recorded one. Each
hardcoded `America/Mexico_City`, correctly — a column is append-only and a view is
`create or replace`, so the constant was the reversible half. What changed is the
arithmetic of waiting: after 2.2 there were **two** constants, and 2.2 could only
defend them with a guard that reads the timezone literal out of both shipped view
definitions and asserts they still match. ⚠️ **No arithmetic check could see the
drift** — the seed trades in UTC office hours, so moving one view to UTC and leaving
the other left every reconciliation in `supabase/checks/` green.

**The column is on `location`, not on `workspace_setting`.** The store is the thing
that has a trading day, and ADR-035 §2.3 makes confusing the two a one-way door. The
case the column exists for is *exactly* the case that separates them: Sonora and Baja
California are UTC−7 and UTC−8 all year against the rest of the country's UTC−6, so
one merchant with a shop in Hermosillo and a shop in Guadalajara is not exotic — they
are the first customer a workspace-level setting gets wrong. `workspace_setting`
deliberately gets no default-for-new-locations companion: the column default covers a
new store without a second row anyone can edit.

**Applying it moves nothing, and that is checked rather than claimed.** The default is
exactly the literal both views hardcoded, so every bucket in a database that existed
before this migration is where it was. Two checks recompute both views' buckets with
the old literal and assert they are identical. `onboard_workspace()`, both seeds and
every fixture in `supabase/tests/` insert a location naming only
`(workspace_id, name)`, so none of them needed touching.

**A trigger, not a `CHECK`.** No honest timezone validation is `IMMUTABLE` — the tz
database ships with the server — and declaring a wrapper immutable to get past the
parser is a lie the planner may act on. The trigger demands the **canonical** name, so
`america/mexico_city` is refused along with `Mars/Olympus_Mons` and the fixed offset
`-06:00`, which cannot follow daylight saving. It is scoped `update of timezone`, so
renaming a store pays nothing. Writing is owner-only, inherited from `location_update`
(§2.7): a manager reads the boundary, an owner moves it.

**⚠️ THE BOUNDARY IS NOW REACHABLE, AND THAT IS THE REAL PRIZE.** 2.1 and 2.2 both
recorded the day boundary as untestable over this seed and pinned a bound at zero
instead. It was untestable because it was a constant in a view body. It is a column
now, so a check can move it — and `supabase/checks/0012_location_timezone.sql` does:

- **`America/Hermosillo` — the real case, and the seed can see it.** Not through
  sales or write-offs, which sit at 09:00–20:40 UTC and cannot straddle a midnight one
  hour away, but through the **early-morning deliveries** at 06:00–07:00 UTC, which
  cross back over midnight in Sonora. Moving Centro alone moves **6 delivery documents**
  into different buckets, moves **nothing** at the other two stores, and changes not one
  centavo of the totals. Then it is put back and the view is asserted identical to a
  baseline captured before anything moved.
- **`Pacific/Kiritimati` — an absurd zone, for margin.** ⚠️ No Mexican zone moves a
  *sale* in this seed, because sales sit in a window no such zone can straddle — that
  limitation is now **pinned as its own check** rather than described. So proving
  `product_margin_daily` reads the column needs UTC+14, where 380 of Centro's 413 sales
  move. It proves the view reads the column; it does not pretend to be a customer.

Falsified, each mutation watched go red:

| Falsification | Caught by |
|---|---|
| `product_margin_daily` reverted to the hardcoded constant | `0009` (1), `0011` (1), `0012` (2) |
| `product_waste_daily` reverted to the constant, margin left alone — *the exact drift* | `0011` (1), `0012` (2) |
| The zone read from the workspace's first store instead of the row's own | `0012` (3) |
| The guard trigger dropped | `0012` (6) |
| The column default changed, so applying `0012` *would* move buckets | `0012` — pre-flight, fatal |

⚠️ **The second row is the one that matters.** Before `0012` that drift was invisible
to every arithmetic check in the repo and caught only by comparing view *text*. It is
now caught by numbers.

**⚠️ WHAT THIS COSTS THE DESIGN GATE, STATED RATHER THAN GLOSSED.** Each aggregate in
both views now reads **three** tables instead of two — the measure, its document, and
`location`. ADR-035 §3 step 2's bar was that margin by product must not need a
five-way join *to survive reversals, unit conversion and a location rollup*, and none
of those three is why this join is here: it is a primary-key lookup of one text column.
It cannot drop a row (`location_id` is NOT NULL with a composite FK) or narrow one
under RLS (`location_select` is the same `my_locations()` predicate the ledger tables
already apply). Both claims are asserted. **The gate's verdict is unchanged; the
sentence describing the query is longer by one join.**

**⚠️ THE HEADERS OF `0009` AND `0011` ARE NOW STALE ON THIS POINT.** Both say the
constant is hardcoded and name a future `location.timezone` as the fix. Neither is
edited — both are applied and therefore closed, the same rule that leaves `0002`'s
stale reference to the RPC migration alone. This table is the authority.

**CI applied `0001`–`0012` from scratch and ran everything green on 2026-08-20**, run
[32418028025](https://github.com/bersermi/RetailerManagementTool/actions/runs/32418028025)
on PR [#19](https://github.com/bersermi/RetailerManagementTool/pull/19) — *all 35
location timezone checks passed*, *all 36 product margin checks passed*, *all 56 waste
share checks passed*, *all 18 seed invariant checks passed*, *4 seed check file(s)
ran*, then *all 39*, *all 54*, *all 55*, *all 9* and *all 46 checks passed*, read from
the job log rather than from the green tick, since a green tick alone would also be
what a silently skipped test step looks like.

**⚠️ WHAT `0012` DOES NOT FIX: the seed still trades in UTC office hours.** Fixing
that means rewriting every timestamp in `20_consumption.sql` and therefore every
hash-derived quantity in the seed — 1.6b's territory, and a task of its own. What
changed is that the boundary no longer has to come from the seed's clock. **Owner's
call**, and no longer urgent: the column is what the checks move now.


## The seed

`supabase/seeds/`, run automatically by `supabase db reset`. `config.toml` lists the
files **explicitly rather than globbing**, because the order is the dependency order
and a glob would leave it to filename luck.

| File | Task | Writes |
|------|------|--------|
| `00_skeleton.sql` | 1.5 | Catalog, providers, locations, people, sell prices |
| `10_deliveries.sql` | 1.6a | `purchase`, `purchase_line`, `stock_batch`, receipt movements |
| `20_consumption.sql` | 1.6b | `sale`, `waste`, transfers, and every negative movement |
| `30_reversals.sql` | 1.6c | The voided documents, and their compensating movements |

Each file owns one question, asserts its own answer at the end, and refuses to run out
of order. `00_skeleton.sql` still asserts that **no ledger exists when it finishes** —
that check survived the arrival of `10_deliveries.sql` unchanged, because it is scoped
to the moment its own file ends rather than to task 1.5 as a whole.

**The skeleton is the static half of a shop**: catalog, providers, locations, people,
sell prices. Every unit of stock that moves is allocated through `allocate_fefo()`, so
the seed and `record_sale` cannot diverge.

| | Merchant A — *Tienda Doña Lupe* | Merchant B — *Abarrotes El Roble* |
|---|---|---|
| Locations | 2 (Doña Lupe Centro, Sucursal Mercado) | 1 |
| Families | 9 | 3 |
| Variants | **316** | 25 |
| Providers | 3 named + `Compra directa` | 3 named + `Compra directa` |
| People | owner, manager, a cashier per store | owner, one cashier |

**Two merchants, because a single-tenant seed makes every isolation check vacuous.** A
query that forgot its `workspace_id` predicate returns exactly the right answer when
there is only one workspace, and step 2 is where that would hide. B is a control, not a
second customer — and its product names **deliberately collide** with A's, so a lost
tenancy predicate finds a plausible twin rather than nothing. Sucursal Mercado plays
the same role for `location_id`, and charges 8% more for produce so that "the price at
this store" and "the workspace price" are genuinely different numbers somewhere.

**The catalog is a real tienda's**, because the shapes are what break arithmetic
(§2.5): `canasta básica` at 0% IVA against 16% on everything processed; 73 weighed
variants with base `g` bought by the `kg`; packs with `pack_size > 1` bought as a case
and sold as singles; three families that track expiry, so `allocate_fefo()` has a
decision to make when 1.6 arrives. Provider spread is deliberately *not* realistic —
three named plus the generic one, no long tail (owner, 2026-08-18).

### The seed checks itself, and the reset fails when it doesn't

Twelve assertions run at the end of the file. **`supabase db reset` exits non-zero when
one raises** — confirmed by falsifying three of them rather than assumed:

| Falsification | Result |
|---|---|
| Variant-count floor raised above what the seed produces | `EXIT 1` — *"merchant A has only 316 variants, expected ~300"* |
| A family name misspelled in one section | `EXIT 1` — *"staged 341 catalog rows but 330 variants exist — an inner join dropped rows"* |
| A `purchase` row written into 1.5 | `EXIT 1` — *"task 1.5 writes no ledger"* |

The middle one is the reason that assertion exists: the catalog insert is an inner join
on `product_family.name`, so a typo **drops products silently** and every count
downstream is quietly short.

⚠️ **Seed data does not survive into any test suite, and task 1.7 planned around it.**
`supabase/tests/_cleanup.sql` runs before *every* suite and `TRUNCATE`s every table but
`unit`, so the seed is gone before the first suite starts. That is correct — suites
assert absolute counts and must own the database — but it meant **1.7 could not be a
file in `supabase/tests/`**. Written as a test file it would assert over an empty
database, and pass. It is [`supabase/checks/seed_invariant.sql`](#supabasechecks--the-24-invariant-over-seed-data-task-17)
instead, in its own `db.yml` step between the reset and the suite loop.

### Reading it

`seed.sql` is plain SQL with no psql meta-commands — the CLI executes it directly, so
`\gset` is unavailable. Workspaces are created through `onboard_workspace()` rather than
by hand, because that is the tested path and it is what writes the `workspace_setting`
row and the generic provider; it generates the workspace id itself, so ids cross
statements through two scaffolding tables that the file **drops before it finishes**.
Nothing named `_seed_*` survives a reset, and 1.6 should look ids up by name rather than
depend on a table no migration created.


### `10_deliveries.sql` — three months of stock arriving (task 1.6a)

110 deliveries, **1 025 lines, 1 025 batches, 1 025 receipt movements**, spanning 88
days from 2026-05-19. 330 remembered `(provider, variant)` prices. Merchant B holds
**16.7%** of purchase lines.

**The receipt is a movement, not the batch row.** `stock_batch` has no
remaining-quantity column; `batch_balance` is opened at zero by a trigger and the
delivery itself is a positive `purchase` movement. Writing only the batch leaves a shop
that believes it has nothing; seeding the balance directly counts every delivery twice.
`record_purchase` in `0006` must do exactly what this file does.

**Headers cannot be patched after the fact.** `purchase` carries the append-only
trigger, so `total_net` and `total_tax` must be correct in the INSERT — there is no
"insert the header, add the lines, update the totals". Lines are staged first and
headers built from their sums. `0006` faces the identical constraint.

**Providers do not carry the whole catalog.** Each named provider is assigned whole
families; one of merchant B's three providers **never delivers at all**; the generic
`Compra directa` takes a thin slice of produce overlapping another provider. Without
those gaps every pair would have a remembered price and "no fallback across providers"
— the rule `0008` exists to enforce — would never be exercised by the seed.

**A green `batch_balance_violations()` means almost nothing here**, and the file says
so in its own header. Nothing has been withdrawn yet, so every balance is just its own
receipt; the check would pass with the allocator absent. It becomes load-bearing in
1.6b.

#### The seed is reproducible, and the first draft was not

Hashes decide what each truck carries. The first draft hashed `purchase_id` and
`variant_id` — both `gen_random_uuid()` — so **two consecutive resets produced 1 071
and 1 064 batches.** It was caught only because a falsification run happened to print
both numbers side by side.

Every hash now keys off a `doc_key` built from provider name, location name and week
number, plus the product *name*. Three consecutive resets now produce identical counts,
totals and quantities **to the peso**. Never hash a uuid in a seed: a shop that differs
between runs makes "it failed in CI but not locally" unanswerable, and lets an
assertion threshold flicker into a false red.

#### Twenty-four assertions, six of them shown able to fail

| Falsification | Caught by |
|---|---|
| Batch written, receipt movement omitted | *"1025 batches but 0 receipt movements"* |
| Receipt movement written twice | *"1025 batches but 2050 receipt movements"* |
| An adjustment lot smuggled into a delivery file | *"every batch here is a purchase lot"* |
| Header total rounded independently of its lines | *"a document total is not the sum of its rounded lines"* |
| Merchant B dropped to merchant A's line density | *"too few deliveries — A 84 / B 18"* |
| No variant bought from two providers | *"no variant is bought from two providers at different prices"* |
| Expiry never recorded | *"batches must carry both real and null expiry dates"* |

The fifth row is worth reading closely: it tripped the **delivery-count** assertion
rather than the percentage one it was aimed at, because thinner trucks came up empty
and were excluded. Caught, but by a neighbour — which is why the count check earns its
place alongside the ratio.


### `20_consumption.sql` — stock leaving the shop (task 1.6b)

**904 sales / 2 251 lines, 65 waste documents / 134 lines, 5 transfer shipments,
3 473 movements in total.** A full reset with all three seed files takes ~32s.

**Nothing here chooses a batch.** Every unit that leaves goes through
`allocate_fefo()` or `allocate_transfer()` — the same functions `record_sale`,
`record_waste` and `record_transfer` will call in `0006`. Hand-picking lots would be
faster, would look right, and would have the design gate measuring margin the real
system never produces.

**The two allocators divide the work differently, and confusing them is the easiest
mistake in the file.** `allocate_fefo()` decides, locks and *returns* the split — the
caller writes the movements; it writes only one thing itself, the new lot in shortfall
branch three. `allocate_transfer()` does the entire paired write — the caller writes
nothing.

#### Backdated history cannot spend stock that had not arrived

`batch_balance` has no notion of time. By the time this file runs, every lot from all
thirteen weeks is already on the shelf, so a sale dated in May is free to consume a lot
received in August — and `allocate_fefo()` will hand it over, correctly, because it
allocates from what is open. The result still satisfies the §2.4 invariant and is still
internally consistent; "stock on hand at the end of May" is simply a number no sequence
of real events could produce.

Each withdrawal is therefore capped at the FEFO prefix that had genuinely arrived:
walk the lots in FEFO order, accumulate while `received_at <= occurred_at`, and **stop
at the first future lot rather than skipping past it.** Stopping rather than skipping
is the important half — skipping would let the allocator reach a lot the shop could not
have touched, because FEFO order is not receipt order.

#### ⚠️ Both allocators stamped new lots with `now()` — fixed in `0010`

Neither `allocate_transfer()` nor `allocate_fefo()`'s shortfall branch three sets
`received_at` on a lot it opens, so the column default applies. `allocate_transfer()`
even *takes* `p_occurred_at`, uses it for all four movements, and does not pass it to
the destination lot.

At a till this is invisible: `occurred_at` **is** `now()`. It is wrong in two places —
backdated history, which is how the seed found it, and **`recorded_offline`, which is a
production path**: `occurred_at` is clamped to `[now() − 72h, now()]`, so a transfer
recorded three days late opens a destination lot that sorts as *received today*.
`received_at` is the second FEFO key, so this reorders lots received within days of
each other, exactly the perishable case.

Not patched here — the seed must not work around a function it exists to exercise, and
`0005` is applied and closed. **Fixed forward in [`0010`](migrations/0010_allocator_time_and_price_tiebreak.sql)
on 2026-08-19**, at the owner's instruction: `allocate_fefo()` gained a **required**
`p_occurred_at` — required, not defaulted, so that `record_sale` cannot inherit the
defect by forgetting to pass it — and `allocate_transfer()` now gives the destination
lot the moment it was already using for all four movements. The bound this file used to
place on the exception is now an absolute check: **no lot of any origin may be received
after a movement against it.**

**The fix made two dishonest dates in this file visible, and both are corrected.**
While the allocators stamped `now()`, any lot they opened sorted after every movement in
the seed and the arrival test simply skipped it. Given real dates:

- the **transfers** were dated fortnightly across the window but *written* after all the
  sales, so a destination lot dated 10 June sat in front of lots the Mercado had sold in
  June — a FEFO violation in the data, and one that had been there all along. They are
  now dated the five days after the last sale, which is when they were actually written;
- the **oversales** were dated 14 August but written after the transfers, so the overdraw
  they were designed to cause landed on a *transfer* instead: replayed in date order the
  oversale left the lot at 1 and the transfer took it to −2, on a movement nobody had
  marked as designed. They are now dated after the transfers.

The rule both corrections come from is worth stating once: **every section of
`20_consumption.sql` picks its quantities from the balances as they stand when it runs,
so date order must agree with write order.**

#### The assertions, and what breaks them

The strongest is **FEFO obedience**: for every withdrawal, no earlier-sorting lot that
had already arrived is still open at the end. It is what turns "the seed and
`record_sale` must not diverge" from a comment into a rule.

| Falsification | Caught by |
|---|---|
| Newest-lot-first by hand instead of `allocate_fefo()` | *"908 withdrawal(s) skipped an older lot that was still open"* |
| Temporal cap removed | *"635 movement(s) consume a DELIVERED lot received after them"* |
| Sale movements summing to half the line quantity | *"18 withdrawal(s) skipped an older lot…"* |
| The deliberate oversales removed | *"no lot went negative — the overdraw oversale did not happen"* |
| A cashier writes off waste | *"a cashier wrote off waste — that is a manager's document"* |

A **running-balance replay** catches what the invariant cannot: a lot that dips
negative mid-history and recovers is invisible to `batch_balance_violations()`, which
only sees the end state.

#### Two deliberate oversales

v1 records stock and does not enforce it (§2.6). Both shortfall branches are exercised
on purpose, and marked so the running-balance assertion can tell a designed negative
from an accidental one:

- **Overdraw an existing lot** — more sold than remains; the rest is charged to the lot
  FEFO ran out on, at the cost actually paid, and `remaining_base` goes negative, which
  is legal and must stay legal.
- **Sell something never stocked here** — a new adjustment lot at **zero cost**, because
  100% margin is visibly wrong and gets asked about, where a plausible invented cost is
  invisibly wrong.

#### Reproducibility, again

Two resets produced identical row counts and **different revenue**: the oversale picked
"the smallest balance" and ties resolved arbitrarily. Every pick ending in `LIMIT` now
carries a total order, and the tiebreak is the product **name** — ids are regenerated
on every reset and can never be one. Three resets now agree to the peso.


### `30_reversals.sql` — the documents the shop took back (task 1.6c)

**3 voided deliveries (23 lines), 3 voided tickets (12 lines), 1 voided write-off
(3 lines), and 41 compensating movements.** Voids are 0.40% of takings — rare, which
is what they are. A full reset with all four seed files still takes ~33s.

**Nothing is mutated, and the schema is what makes that true.** `purchase`, `sale`,
`waste`, `stock_batch` and `stock_movement` all carry an append-only trigger that
refuses an UPDATE even to the `postgres` superuser. A void is an INSERT of a mirror
document with `reversal_of` set and its totals negated; **a lot whose delivery was
voided is left standing and empty**, never deleted and never restated.

**The compensating movement belongs to the reversal document, not to the original** —
`sale_id` on it is the void's id, with `reversal_of_movement_id` pointing at the
movement it cancels. That convention was fixed by `0004`'s suite before any of it was
seeded, and it is what keeps "what did this document move" a question with one answer.
`record_sale`'s void path in `0006` must do the same.

#### Which documents get voided, and why it is not a coin flip

Every pick is a rule evaluated against the data — never a date, never a uuid. Where a
rule needs a pseudo-random but stable choice it sorts by `payload_hash`, an md5 over a
name-derived key and the one stable identifier a document has.

| | Chosen by | Proves |
|---|---|---|
| A delivery at merchant A, stock intact | owns the most price memory **and** at least one pair it is the only delivery for | both halves of `0008` — pairs that fall back, and a pair that disappears |
| The same at merchant B | owns the most price memory | a void in one tenant only is a workspace predicate never tested |
| A delivery at merchant A, **already sold through** | the fewest lines among deliveries with no lot left intact | the projection where it is hard: the void takes back units that are gone and the lots go **negative** |
| One ticket per store | touched the most lots | a void that credits several lots back, not one |
| One write-off | the same | `waste_line`'s reason and cost snapshot are copied, not recomputed |

The person who filed the original files the void. Cashiers void their own tickets
minutes later, inside `void_window_minutes`; deliveries and write-offs stay with the
manager or owner who recorded them, because both carry cost.

#### ⚠️ Found here: the price-memory tiebreak was a uuid — fixed in `0010`

`provider_price_memory` orders by `occurred_at`, then `recorded_at`, then **`p.id desc,
pl.id desc`** (`0008`). Purchase price memory is workspace-wide, and `10_deliveries.sql`
delivers to both of merchant A's stores from one provider on the same morning at the
same hour, with `recorded_at` equal to `occurred_at`. Two documents therefore tie on
every key that is not an id — and ids are regenerated on every reset.

**Three resets agreed on every count and every total in the seed's own tables and
disagreed on the sum of the prefills.** 14 (provider, variant) pairs were decided by the
uuid tiebreak.

It was never a correctness bug: both tied rows are prices the shop genuinely paid that
morning, so no prefill was ever *wrong* — it was arbitrary, and arbitrary in production
too, where the ids come from the client at cart open. Not patched here, for the reason
`20_consumption.sql` left `received_at` alone: the seed must not work around the object
it exists to exercise, and `0008` is applied and therefore closed.

**Fixed forward in [`0010`](migrations/0010_allocator_time_and_price_tiebreak.sql) on
2026-08-19**, at the owner's instruction. Price, tax rate and display unit now sort ahead
of the ids, so everything the view hands back is decided by the data; of two deliveries
at the same instant it offers the **higher** price, because a prefill is accepted without
being read and overstating cost is the safe direction to be wrong in. **Three resets are
now byte-identical including the prefills**, and one pair still ties — which is fine, and
is the point: the fix was never to abolish ties, only to stop them deciding anything.

The seed asserts both halves, because either alone is green with the fix reverted: that
every candidate surviving the data keys agrees on the whole prefill, **and** that the
view's answer is the one those keys imply. Deleting the price key from the view leaves
the first check untouched and trips the second on 6 pairs.

#### The assertions, and what breaks them

Thirty-three checks, seven of them shown able to fail. `supabase db reset` exited **1**
on every falsification:

| Falsification | Caught by |
|---|---|
| Compensating movement filed against the original document | *"15 movement(s) of a voided document were never compensated"* |
| The write-off void writes no compensating movements | *"3 movement(s) of a voided document were never compensated"* |
| A void re-costs the units it takes back | *"23 compensating movement(s) are not a mirror of what they cancel"* |
| The delivery rule drops its sole-source requirement | *"no pair lost its only delivery — the disappearing case is unproven"* |
| The sold-through delivery is not declared | *"5 lot(s) were driven lower by a void outside the one delivery designed to do it"* |
| A cashier voids their own ticket an hour later | *"a cashier voided their own ticket after the window closed"* |
| The void keeps the original's positive totals | *"a voided ticket is not the negative of what it cancels"* |

The first row is worth reading closely: it was aimed at *"compensating movement(s) are
filed against the original document"* and tripped a **neighbour** instead, because a
compensator carrying the original's id becomes itself a movement of a voided document
with nothing compensating it. Caught, but not by the check written for it — the same
shape 1.6a's fifth falsification had.

#### Below zero, not merely lower

The first draft of the running-balance check compared each lot's low-water mark before
and after and raised on all 18 lots of the two intact deliveries. It was measuring the
wrong thing: voiding an intact delivery *does* lower a lot's minimum, from everything it
received down to nothing, and that is the correct outcome. The claim worth asserting is
about the **sign** — no reversal may put a lot into deficit unless it was in deficit
already, or unless it is the one delivery voided knowing that it would.


---

## `supabase/checks/` — what is asserted over seed data (tasks 1.7, 2.1, 2.2, 2.4)

**One directory, one contract: these files run against the SEEDED database.** They
have their own step in `.github/workflows/db.yml`, and **it must stay between
`supabase db reset` and the suite loop.** Four files live here now — the §2.4
invariant (1.7), the margin view's reconciliation (2.1), the waste view's (2.2) and
the timezone column's (2.4) — and the step runs the
directory in name order rather than naming files, so a fifth costs no workflow edit.
Each file creates its own `_verify` scratch table and drops any previous one, so they
do not share state and their order does not matter.

That ordering is the whole reason the directory exists. `supabase/tests/_cleanup.sql`
runs before *every* suite and truncates every table but `unit`, so by the time the
first suite starts the seed is gone — and **`batch_balance_violations()` over an empty
database returns zero rows and passes.** An invariant check placed in `tests/` would
be green forever while checking nothing, which is the exact vacuous pass ADR-035 §9
exists to refuse. It is the same trap as running an RLS assertion as `postgres`.

`tests/_seed_invariant.sql` was rejected as the alternative: `_` already means
*harness, not a suite*, and this is neither.

### `0009_product_margin.sql` — 36 checks (task 2.1, extended by 2.4)

Covered in full under [`0009` — product margin](#0009--product-margin-and-the-design-gate-plan-task-21)
above. In outline:

| | What it establishes |
|---|---|
| **1–6, pre-flight** | The seed still holds what makes the rest discriminating: 1 000+ sale lines and sale movements, both tenants selling, three selling stores, tickets that were voided, weighed goods bought by the kilo, and both tax rates. **Fatal on its own** — if any fails, nothing below runs |
| **7–18** | Reconciliation against an arithmetic derived **without** the view's document join: revenue three ways, tax, COGS, quantity, every line and every movement in exactly one bucket, every `(store, product)` bucket, and the shop making a plausible amount of money |
| **19–23** | The ADR's three gate questions: consolidated equals the sum of the stores exactly, the top-ten query is one statement, the totals equal a ledger in which the voided pairs never happened, and a weighed product reconciles in grams |
| **24–25** | Two wrong implementations written out in full and asserted to **disagree**: skipping voids instead of letting them cancel, and costing at the latest purchase price instead of at the lot consumed |
| **26–31** | Access, under `set role authenticated`: the cashier who reads zero rows, the ungated copy of the same query that tells them their margin is 100%, the manager confined to their own tenant and reading the ledger's own numbers, and the other tenant's owner seeing none of it |
| **32–36** | The day boundary. ⚠️ **Rewritten by 2.4**: the bound the seed cannot cross is still pinned, but the view now hardcodes **no** zone — check 35 asserts it reads `location.timezone` — and check 36 is the counts-the-checks guard |

### `0011_waste_share_of_purchases.sql` — 56 checks (task 2.2, extended by 2.4)

Covered in full under [`0011` — waste against purchases](#0011--waste-against-purchases-and-the-ratio-that-is-not-a-column-plan-task-22)
above. In outline:

| | What it establishes |
|---|---|
| **1–9, pre-flight** | The seed still holds what makes the rest discriminating: 100+ waste movements and lines, 500+ delivery lines, both tenants wasting, three wasting stores, a voided document on **both** sides, every void landing on a *later* local day than what it cancels, weighed goods, both tax rates, and **all three denominator failures present in the ledger**. **Fatal on its own.** ⚠️ It is computed from the base tables, never from the view — a pre-flight that reads the object under test goes red with a message blaming the seed |
| **10–21** | Reconciliation against an arithmetic derived **without** the view's document join: waste cost and quantity, purchases three ways, every movement and every delivery line in exactly one bucket, every `(store, product)` bucket, the document snapshot reconciled against the ledger and shown to differ, every waste line shown to have moved stock, and the shop wasting a plausible fraction of what it buys |
| **22–29** | The division: the view reproduces the ledger's month-grain buckets, then each of the three denominator failures pinned to a **named product in a named month**, the `> 0` guard shown to yield null for all three and never a negative, and the report query run for real |
| **30–36** | The ADR's three gate questions, plus two bounds the seed cannot yet falsify (the transfer distortion, the location join key), plus the reversal claims — money equal to a pairs-never-happened ledger over the window, buckets differing at day grain, and the row that survives at zero |
| **37–43** | Seven wrong implementations written out and asserted to **disagree**: inner join, `nullif` instead of `> 0`, a gross denominator, costing at the latest purchase price, skipping voids, averaging the ratios, and an unscoped denominator |
| **44–50** | Access, under `set role authenticated`: the cashier who reads zero rows, **the reason** read out of both base tables as that cashier, the half-gated copy that lies to them, the manager confined to their own tenant, and the other tenant's owner seeing none of it |
| **51–56** | The day boundary. ⚠️ **Rewritten by 2.4**: what was a drift guard — *`0009` and `0011` carry the same literal* — is now the stronger claim that **neither hardcodes one at all**, so there is nothing left to drift. Plus the seed's pinned bound, every bucket being a day the store traded in **its own** zone, and the counts-the-checks guard |

### `0012_location_timezone.sql` — 35 checks (task 2.4)

Covered in full under [`0012` — the shop timezone](#0012--the-shop-timezone-and-the-boundary-becoming-reachable-plan-task-24)
above. In outline:

| | What it establishes |
|---|---|
| **1–5, pre-flight** | A multi-store shop whose locations **all still carry the column's default**, every stored zone a canonical name, and the default still the literal `0009` and `0011` hardcoded. **Fatal on its own** — without it, a bucket that moves below could be somebody else's and the restoration would write back the wrong value |
| **6–7** | ⚠️ **Applying `0012` moved nothing.** Both views' buckets recomputed with the old hardcoded literal and asserted identical — the property that makes this safe to apply to a live shop |
| **8–14** | The guard: an unknown zone, a non-canonical spelling of a real one, a fixed offset and an empty string are all refused **on write**; the trigger is scoped `update of timezone`; nothing above left a mark; and a new store gets the default without naming the column |
| **15–18** | ⚠️ **The falsification 2.1 and 2.2 could not perform.** Centro moved to `America/Hermosillo` — the real Sonora case — moves 6 delivery documents into different buckets, moves **nothing** at the other two stores, creates and destroys **no money**, and restores exactly |
| **19–23** | Margin reads the column too. ⚠️ Check 19 **pins the limitation**: no Mexican zone moves a sale in this seed. So an extreme zone (UTC+14) is used, 380 sales move, the other stores do not, revenue and cost are conserved, and both views are shown to bucket the moved store from the **one** column |
| **24–30** | Access: a manager reads the boundary and cannot move it; an owner can; the guard still refuses the owner an unknown zone; and the owner's committed change is undone and asserted undone |
| **31–35** | Everything restored, asserted against the baseline **both ways**, plus ⚠️ **the check that counts the checks** — see below |

**⚠️ THE CHECK THAT COUNTS THE CHECKS, AND WHY ALL THREE ANALYTICS FILES NOW CARRY
IT.** `chk()` records its verdict by INSERTING into `_verify`, so a section wrapped in
`begin … rollback` throws its own results away — and the file still prints *all N
checks passed* with a quietly smaller N. **This file shipped with exactly that bug for
one draft**: four access checks vanished between 23 and 28 and the summary line said
28 rather than 32. It was caught by reading the printed table rather than the summary,
which is the same discipline the working agreement demands of a CI tick.

`_verify.n` is a serial and a sequence is non-transactional, so a rolled-back `chk()`
burns its number and leaves a gap. `max(n) = count(*)` detects it. It was added to
`0009_product_margin.sql` and `0011_waste_share_of_purchases.sql` at the same time —
both use `begin … commit` for their access sections and are correct today, and this
makes the requirement structural instead of remembered.

### `seed_invariant.sql` — 18 checks

| | What it establishes |
|---|---|
| **1–8, pre-flight** | There is a ledger worth checking: 1 041 batches, 3 514 movements, **both** tenants with real volume, three stores, negative movements as well as positive, every reason the invariant leans on, transfers paired out-for-in, compensating movements present, and the designed negative lots still negative |
| **9–10** | The §2.4 invariant: the projection agrees with the ledger for every batch, and every batch **has** a projection row |
| **11–12** | `rebuild_batch_balance(workspace)` rebuilds exactly that tenant and leaves every other tenant's row untouched, `updated_at` included |
| **13–15** | `rebuild_batch_balance()` reproduces all 1 041 rows from `stock_movement` alone, one per batch, and the invariant is still clean afterwards |
| **16–18** | The projection is corrupted two ways, both are detected and named, and the rebuild repairs both |

**⚠️ THE PRE-FLIGHT IS FATAL ON ITS OWN.** If any of the first eight fails, the file
raises and checks 9–18 never run. Without that, an empty database reaches a `\gset`
that found no rows and dies with a psql meta-command error a hundred lines from the
cause — or worse, passes. The message it raises instead names the problem: *"THE SEED
IS NOT IN THIS DATABASE, or it no longer exercises the ledger."*

**⚠️ IT DOES NOT ASSERT THAT NO LOT IS NEGATIVE.** Seven are, legitimately — two from
1.6b's oversales and five from the delivery 1.6c voided after it had been sold through.
v1 records stock and does not enforce it (§2.6). The invariant asks whether the
projection agrees with the movements; *"no lot is negative"* is a different claim, it
is false, and it is false on purpose. Check 8 asserts the opposite: that those
negatives **survive**, because a seed that quietly lost them would make every
shortfall claim downstream vacuous.

**Floors and shapes, not row counts.** The pre-flight asks for *at least* 500 batches
and 2 000 movements. The seed files pin their own exact totals; restating them here
would mean editing a CI-adjacent file every time a truck changes.

### The check demonstrates its own teeth, every run

Checks 16–18 corrupt the projection on purpose and confirm the corruption is caught.
That is deliberately not a one-off someone did locally and wrote down — it costs about
a second and it means a green here is never a green from a check that cannot go red.

**CI applied `0001`–`0010` from scratch, ran all 18 seed invariant checks and all
five suites green on 2026-08-19**, run [32316689915](https://github.com/bersermi/RetailerManagementTool/actions/runs/32316689915) on PR
[#16](https://github.com/bersermi/RetailerManagementTool/pull/16) — *all 18 seed
invariant checks passed*, *1 seed invariant file(s) ran*, then *all 39*, *all 54*,
*all 55*, *all 9* and *all 46 checks passed*. Read from the job log rather than from
the green tick, and the **step order was read there too** — `Seed invariant (ADR-035
§2.4)` sits between `Show applied schema` and `Behavioural checks`, which is the one
thing about this file that cannot be checked from its own output.

### Four falsifications, run by hand on top of that

| Falsification | Caught by |
|---|---|
| **Run the whole file over an empty database** — the trap `docs/PLAN.md` named for this task | *"THE SEED IS NOT IN THIS DATABASE… (8 of 8 pre-flight check(s) failed)"*, and nothing below it ran |
| A real projection drift, present before the file started | *"019f3645…: movements=34.000 projected=31.000"*, and the rebuild comparison independently |
| `rebuild_batch_balance()` reimplemented to **ignore its workspace argument** | *"rebuilt 1041 rows"* against the 177 that tenant owns, plus the other tenant's rows no longer matching |
| Every negative lot topped back up with a legitimate `adjustment` movement | *"0 lot(s) below zero"* — **and only that check**, with `batch_balance_violations()` still at 0 |

The last row is the one worth reading. The ledger stayed perfectly consistent, so the
invariant itself could not see the loss. Something has to.

**And the falsification found a defect in the check.** The first draft asserted
`count(distinct reason) = 5` and went red the moment an `adjustment` movement appeared
— a legal sixth reason that `adjust_stock` writes in `0006`. It now asserts
**containment**: the five reasons the invariant leans on are all present, not that
nothing else ever is.
