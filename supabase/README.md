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

Planned next, in order (ADR-035 §3):

- `0006` — RPCs: `record_sale`, `record_purchase`, `record_waste`, `record_transfer`,
  `void_transaction`, `adjust_stock`, `adjust_stock_delta`
- `0007` — failure path: `failed_write`, `record_failed_write`, `replay_failed_write`
  (ADR-035 §3 step 4.5 — before any screen exists)
- `0009` — analytics views and nightly rollups, per location and consolidated

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

`0009` owes the merchant a **price history**, globally and per provider, which
`provider_price_memory` does not answer — it is the last price, not a series. The data
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

**CI applied `0001`–`0005` and `0008` from scratch and ran all five suites green on
2026-08-18**, run
[32191899904](https://github.com/bersermi/RetailerManagementTool/actions/runs/32191899904)
on PR [#7](https://github.com/bersermi/RetailerManagementTool/pull/7) — *all 39*,
*all 54*, *all 52*, *all 9* and *all 44 checks passed*, read from the job log rather
than from the green tick, since a green tick alone would also be what a silently
skipped test step looks like.

## The seed

`supabase/seeds/`, run automatically by `supabase db reset`. `config.toml` lists the
files **explicitly rather than globbing**, because the order is the dependency order
and a glob would leave it to filename luck.

| File | Task | Writes |
|------|------|--------|
| `00_skeleton.sql` | 1.5 | Catalog, providers, locations, people, sell prices |
| `10_deliveries.sql` | 1.6a | `purchase`, `purchase_line`, `stock_batch`, receipt movements |

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

⚠️ **Seed data does not survive into any test suite, and task 1.7 must plan around it.**
`supabase/tests/_cleanup.sql` runs before *every* suite and `TRUNCATE`s every table but
`unit`, so the seed is gone before the first suite starts. That is correct — suites
assert absolute counts and must own the database — but it means **1.7 cannot be a file
in `supabase/tests/`**. The invariant check over seed data has to be its own step in
`.github/workflows/db.yml`, between `supabase db reset` and the suite loop. Written
as a test file it would assert over an empty database, and pass.

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
