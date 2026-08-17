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

Nothing reaches the database by hand. No migration merges without the schema owner
reading it.

## Migrations

| File | Contents |
|------|----------|
| `0001_foundation_tenancy_and_units.sql` | Roles enum, `unit` reference table + seed, `workspace` / `location` / `workspace_member` / `member_location` / `workspace_setting`, RLS helper functions incl. `my_locations()`, `onboard_workspace()`, RLS policies, grants |

Planned next, in order (ADR-035 §3):

- `0002` — catalog: `product_family`, `product_variant`, `provider` (incl. the
  non-deletable `is_generic` row), `price_list` (**sell prices only**),
  `workspace_invite`
- `0003` — transactions: `purchase`, `sale`, `waste` and their line tables (all
  `location_id`, all carrying `payload_hash` on the header)
- `0004` — inventory: `stock_batch`, `stock_movement`, `batch_balance` + projection trigger, per location
- `0005` — RPCs: `record_sale`, `record_purchase`, `record_waste`, `record_transfer`,
  `void_transaction`, `adjust_stock`, `adjust_stock_delta`
- `0006` — failure path: `failed_write`, `record_failed_write`, `replay_failed_write`
  (ADR-035 §3 step 4.5 — before any screen exists)
- `0007` — provider price memory view over `purchase_line`; analytics views and
  nightly rollups, per location and consolidated

`price_list` carries no `provider_id`. Sell prices are curated and per location;
purchase prices are *remembered* per provider-product pair and derived from
`purchase_line`, so they are a view in `0007` and not a table anywhere. Putting both
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

CI has **not yet run**. Per ADR-035 §9 a local pass is not the bar — the gate is
`.github/workflows/db.yml`, which applies every migration from scratch on any PR
touching `supabase/**`. Until that is green on a PR, this section records a developer
machine, not evidence.

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
