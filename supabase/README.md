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

Planned next, in order (ADR-035 §3):

- `0006` — RPCs: `record_sale`, `record_purchase`, `record_waste`, `record_transfer`,
  `void_transaction`, `adjust_stock`, `adjust_stock_delta`
- `0007` — failure path: `failed_write`, `record_failed_write`, `replay_failed_write`
  (ADR-035 §3 step 4.5 — before any screen exists)
- `0008` — provider price memory view over `purchase_line`; analytics views and
  nightly rollups, per location and consolidated

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
`purchase_line`, so they are a view in `0008` and not a table anywhere. Putting both
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
