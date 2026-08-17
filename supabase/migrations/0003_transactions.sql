-- ============================================================================
-- 0003 — Transactions: purchase, sale, waste and their line tables
-- ============================================================================
-- ADR-035 §2.3 (data model), §2.5 (units and money), §2.6 (the write path),
-- §2.7 (access)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * purchase / purchase_line   — deliveries in, and the only home of cost
--   * sale     / sale_line       — the dominant loop
--   * waste    / waste_line      — reason-first, with a cost snapshot
--   * an immutability guard on all six
--
-- Not in this migration: the ledger (0004), allocation (0005), the RPCs that write
-- these tables (0006), the failure path (0007), the purchase-price view (0008).
--
-- Three document pairs of IDENTICAL SHAPE (ADR-035 §2.3). They are written out
-- three times rather than generated from a loop, because the thing a reviewer
-- must be able to do with this file is read it.
--
-- Everything here is LOCATION-level. A document happened at a store, and every
-- policy below carries both predicates. Omitting location_id here is the same
-- class of error as omitting it from the ledger — unrecoverable once data exists,
-- because the correct historical value is unknowable (ADR-035 §2.3, §4).
--
-- CLIENTS NEVER INSERT (ADR-035 §2.6). Ten `security definer` functions are the
-- entire write surface, so `authenticated` is granted SELECT and nothing else on
-- all six tables, and there are no insert/update/delete policies to review. The
-- absence is the design, not an omission.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Immutability
-- ----------------------------------------------------------------------------
-- "A void writes compensating movements referencing the original. Nothing is
-- mutated." (ADR-035 §2.4)
--
-- Withholding the grant already stops `authenticated`. This trigger is aimed at
-- the other side of the wall: every write function in 0006 is `security definer`,
-- so RLS and grants are not running when it executes, and a corrected UPDATE
-- inside an RPC would look perfectly ordinary in review. Here it raises.
--
-- Fixing a document is always a new document with reversal_of set.

create function public.transaction_document_is_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    '% on %.% is not allowed: transaction documents are append-only, correct them with a reversal (ADR-035 §2.4)',
    tg_op, tg_table_schema, tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

comment on function public.transaction_document_is_immutable() is
  'BEFORE UPDATE OR DELETE guard for the six transaction tables. Raises always. '
  'Aimed at security definer RPCs, which grants and RLS do not constrain. '
  'ADR-035 §2.4.';


-- ----------------------------------------------------------------------------
-- 2. Purchase  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- A delivery. Positive movements against new batches, once 0004 exists.
--
-- `id` HAS NO DEFAULT, on all three headers. The client generates it at cart open
-- and it is the idempotency key (ADR-035 §2.6): a retried request carrying the
-- same id returns the existing document instead of duplicating it. A
-- `default gen_random_uuid()` would let a caller that forgot to pass one succeed
-- quietly, and the failure it hides — a duplicated delivery after a dropped
-- connection — is exactly what the key exists to prevent.

create table public.purchase (
  id               uuid primary key,
  workspace_id     uuid not null,
  location_id      uuid not null,
  provider_id      uuid not null,

  -- When it happened, and when we found out. Daily totals and the 15-minute void
  -- window read occurred_at; audit reads recorded_at (ADR-035 §2.6).
  occurred_at      timestamptz not null,
  recorded_at      timestamptz not null default now(),

  -- Sum of the rounded lines. The document is never rounded independently of its
  -- lines (ADR-035 §2.5). Unsigned deliberately: a reversal document carries
  -- negative totals, so a plain sum over the table is already net of voids.
  total_net        numeric(12,2) not null,
  total_tax        numeric(12,2) not null,

  -- Set on a compensating document, pointing at the one it cancels. The original
  -- is never touched. Composite so a reversal cannot cross a tenant or a store.
  reversal_of      uuid,
  reversal_reason  text,

  created_by       uuid not null references auth.users (id),
  recorded_offline boolean not null default false,

  -- Over the normalised lines. Same id + same hash is a success and returns the
  -- stored document; same id + a DIFFERENT hash is raised and dead-lettered,
  -- because accepting either version hides a client bug or rewrites a committed
  -- document (ADR-035 §2.6).
  payload_hash     text not null,

  constraint purchase_payload_hash_not_blank check (btrim(payload_hash) <> ''),
  constraint purchase_not_self_reversal      check (reversal_of is distinct from id),
  constraint purchase_reversal_reason_scoped
    check ((reversal_reason is null) or (reversal_of is not null)),

  constraint purchase_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete restrict,

  constraint purchase_provider_fk
    foreign key (provider_id, workspace_id)
    references public.provider (id, workspace_id) on delete restrict,

  -- Referenced by purchase_line and by reversal_of. Carrying all three columns
  -- means a line can never be attached to a header from another tenant or store,
  -- and a void can never be filed against the wrong one.
  constraint purchase_id_scope_unique unique (id, workspace_id, location_id),

  constraint purchase_reversal_fk
    foreign key (reversal_of, workspace_id, location_id)
    references public.purchase (id, workspace_id, location_id) on delete restrict
);

-- A document is reversed AT MOST ONCE. Without this a double-tapped void writes
-- two compensating documents and credits the stock back twice — arithmetically
-- consistent, physically false, and invisible until someone counts the shelf.
create unique index purchase_one_reversal_idx
  on public.purchase (reversal_of)
  where reversal_of is not null;

-- Daily totals and the void window, per store.
create index purchase_by_location_time_idx
  on public.purchase (workspace_id, location_id, occurred_at desc);

-- Half of the purchase-price memory lookup; the other half is on the line table.
-- ADR-035 §2.3 specifies one index, (workspace_id, provider_id, variant_id,
-- occurred_at desc) — that is not creatable, because provider_id and occurred_at
-- live on the header and variant_id lives on the line. Denormalising two header
-- columns onto every line to make the literal index possible would buy an index
-- and sell the guarantee that they agree. This pair serves the same query; 1.4
-- confirms it against a real plan.
create index purchase_by_provider_idx
  on public.purchase (workspace_id, provider_id, occurred_at desc);

comment on table public.purchase is
  'Delivery documents. The only table carrying what was paid, which is why its '
  'RLS policy is manager-and-above. ADR-035 §2.3, §2.7.';
comment on column public.purchase.id is
  'Client-generated at cart open. The idempotency key — deliberately no default.';
comment on column public.purchase.payload_hash is
  'Hash over the normalised lines. Distinguishes an honest retry from the same id '
  'carrying different lines, which is dead-lettered. ADR-035 §2.6.';
comment on column public.purchase.reversal_of is
  'The document this one cancels. The original is never mutated. ADR-035 §2.4.';


-- --- purchase_line -----------------------------------------------------------
-- Cost lives here and nowhere else. There is no ProviderProductPrice table: the
-- last price paid to a provider for a variant is derived from these rows in 0008,
-- so it cannot drift from what was actually paid and it self-corrects after a
-- void (ADR-035 §2.3).

create table public.purchase_line (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null,
  location_id             uuid not null,
  purchase_id             uuid not null,
  variant_id              uuid not null,

  -- Normalised, in the variant's base unit — always the smallest practical
  -- denomination, so a case bought and singles sold close exactly (ADR-035 §2.5).
  qty_base                numeric(14,3) not null,

  -- What the operator actually typed, and in which denomination. Kept so the
  -- review screen can show back the number that was entered rather than a
  -- converted one nobody recognises.
  qty_display             numeric(14,3) not null,
  qty_display_unit        text not null references public.unit (code),

  unit_price_net_per_base numeric(14,6) not null,
  line_net                numeric(12,2) not null,
  tax_amount              numeric(12,2) not null,

  -- Snapshot, not a join to product_variant.tax_rate. The rate on the variant is
  -- editable, and re-deriving tax from today's rate would silently restate last
  -- quarter's margin the moment someone corrects a product.
  tax_rate                numeric(5,4) not null,

  -- Per line, because a delivery mixes dates. Seeds stock_batch.expiry_date in
  -- 0004; null means the variant does not track expiry, never "does not expire".
  expiry_date             date,

  created_at              timestamptz not null default now(),

  -- Zero quantity is not a line, it is a mistake. A reversal line carries the
  -- opposite sign of the line it cancels, and money must follow quantity — a
  -- positive quantity with a negative total is not a document anyone can read.
  constraint purchase_line_qty_non_zero check (qty_base <> 0),
  constraint purchase_line_money_follows_qty check (
    (qty_base > 0 and line_net >= 0 and tax_amount >= 0) or
    (qty_base < 0 and line_net <= 0 and tax_amount <= 0)
  ),
  constraint purchase_line_qty_display_agrees check (
    qty_display <> 0 and (qty_base > 0) = (qty_display > 0)
  ),
  constraint purchase_line_price_non_negative check (unit_price_net_per_base >= 0),
  constraint purchase_line_tax_rate_sane check (tax_rate >= 0 and tax_rate < 1),

  constraint purchase_line_header_fk
    foreign key (purchase_id, workspace_id, location_id)
    references public.purchase (id, workspace_id, location_id) on delete cascade,

  constraint purchase_line_variant_fk
    foreign key (variant_id, workspace_id)
    references public.product_variant (id, workspace_id) on delete restrict
);

create index purchase_line_by_header_idx
  on public.purchase_line (purchase_id);

-- The line half of the purchase-price memory lookup (see purchase_by_provider_idx).
create index purchase_line_by_variant_idx
  on public.purchase_line (workspace_id, variant_id);

comment on table public.purchase_line is
  'What was delivered and what it cost. Purchase price memory is derived from '
  'these rows in 0008 rather than cached in a table. ADR-035 §2.3.';
comment on column public.purchase_line.expiry_date is
  'Per line — one delivery mixes dates. Seeds stock_batch.expiry_date in 0004.';


-- ----------------------------------------------------------------------------
-- 3. Sale  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- The dominant loop. No provider: a sale has a customer, and v1 does not record
-- one. Otherwise identical to purchase.

create table public.sale (
  id               uuid primary key,
  workspace_id     uuid not null,
  location_id      uuid not null,

  occurred_at      timestamptz not null,
  recorded_at      timestamptz not null default now(),

  total_net        numeric(12,2) not null,
  total_tax        numeric(12,2) not null,

  reversal_of      uuid,
  reversal_reason  text,

  created_by       uuid not null references auth.users (id),
  recorded_offline boolean not null default false,
  payload_hash     text not null,

  constraint sale_payload_hash_not_blank check (btrim(payload_hash) <> ''),
  constraint sale_not_self_reversal      check (reversal_of is distinct from id),
  constraint sale_reversal_reason_scoped
    check ((reversal_reason is null) or (reversal_of is not null)),

  constraint sale_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete restrict,

  constraint sale_id_scope_unique unique (id, workspace_id, location_id),

  constraint sale_reversal_fk
    foreign key (reversal_of, workspace_id, location_id)
    references public.sale (id, workspace_id, location_id) on delete restrict
);

create unique index sale_one_reversal_idx
  on public.sale (reversal_of)
  where reversal_of is not null;

-- Today's takings on Home, and the 15-minute void window.
create index sale_by_location_time_idx
  on public.sale (workspace_id, location_id, occurred_at desc);

comment on table public.sale is
  'Sale documents. Readable by every member at their own locations — a sale '
  'carries price, not cost. ADR-035 §2.3, §2.7.';
comment on column public.sale.occurred_at is
  'Server now() unless recorded_offline, in which case the client value is '
  'accepted and clamped to [now() - 72h, now()]. ADR-035 §2.6.';


-- --- sale_line ---------------------------------------------------------------
-- No cost snapshot. Cost attribution for margin comes from the movements the sale
-- generates against specific batches (ADR-035 §2.4), not from the document — the
-- document does not know which batches FEFO will pick.

create table public.sale_line (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null,
  location_id             uuid not null,
  sale_id                 uuid not null,
  variant_id              uuid not null,

  qty_base                numeric(14,3) not null,
  qty_display             numeric(14,3) not null,
  qty_display_unit        text not null references public.unit (code),

  unit_price_net_per_base numeric(14,6) not null,
  line_net                numeric(12,2) not null,
  tax_amount              numeric(12,2) not null,
  tax_rate                numeric(5,4) not null,

  created_at              timestamptz not null default now(),

  constraint sale_line_qty_non_zero check (qty_base <> 0),
  constraint sale_line_money_follows_qty check (
    (qty_base > 0 and line_net >= 0 and tax_amount >= 0) or
    (qty_base < 0 and line_net <= 0 and tax_amount <= 0)
  ),
  constraint sale_line_qty_display_agrees check (
    qty_display <> 0 and (qty_base > 0) = (qty_display > 0)
  ),
  constraint sale_line_price_non_negative check (unit_price_net_per_base >= 0),
  constraint sale_line_tax_rate_sane check (tax_rate >= 0 and tax_rate < 1),

  constraint sale_line_header_fk
    foreign key (sale_id, workspace_id, location_id)
    references public.sale (id, workspace_id, location_id) on delete cascade,

  constraint sale_line_variant_fk
    foreign key (variant_id, workspace_id)
    references public.product_variant (id, workspace_id) on delete restrict
);

create index sale_line_by_header_idx
  on public.sale_line (sale_id);

-- Margin and units-sold by product, per location (ADR-035 §2.9).
create index sale_line_by_variant_idx
  on public.sale_line (workspace_id, location_id, variant_id);

comment on table public.sale_line is
  'What was sold and at what price. Cost attribution lives on the movements the '
  'sale generates, not here. ADR-035 §2.4, §2.9.';


-- ----------------------------------------------------------------------------
-- 4. Waste  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- Reason-first entry (§2.8). Identical header shape; the line carries a reason
-- and a cost snapshot on top of the shared columns.
--
-- The shared money columns hold what the stock would have SOLD for; the cost
-- snapshot holds what it cost. Both are wanted — "we threw away 400 pesos of
-- product" is the number an owner reacts to, and the cost is the number that
-- belongs in margin. Keeping them in separate columns is what stops one being
-- quietly reported as the other.

create table public.waste (
  id               uuid primary key,
  workspace_id     uuid not null,
  location_id      uuid not null,

  occurred_at      timestamptz not null,
  recorded_at      timestamptz not null default now(),

  total_net        numeric(12,2) not null,
  total_tax        numeric(12,2) not null,

  reversal_of      uuid,
  reversal_reason  text,

  created_by       uuid not null references auth.users (id),
  recorded_offline boolean not null default false,
  payload_hash     text not null,

  constraint waste_payload_hash_not_blank check (btrim(payload_hash) <> ''),
  constraint waste_not_self_reversal      check (reversal_of is distinct from id),
  constraint waste_reversal_reason_scoped
    check ((reversal_reason is null) or (reversal_of is not null)),

  constraint waste_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete restrict,

  constraint waste_id_scope_unique unique (id, workspace_id, location_id),

  constraint waste_reversal_fk
    foreign key (reversal_of, workspace_id, location_id)
    references public.waste (id, workspace_id, location_id) on delete restrict
);

create unique index waste_one_reversal_idx
  on public.waste (reversal_of)
  where reversal_of is not null;

create index waste_by_location_time_idx
  on public.waste (workspace_id, location_id, occurred_at desc);

comment on table public.waste is
  'Waste documents. Shared money columns hold retail value; cost is on the line. '
  'ADR-035 §2.3.';


-- --- waste_line --------------------------------------------------------------

-- Why stock was thrown away. An enum and not free text, because Desperdicio
-- "feeds the analytics asset" (ADR-035 §2.8) and free text does not survive
-- three cashiers spelling caducado four ways — the "what are we losing, and why"
-- report is worth exactly as much as the consistency of this column.
--
-- Workspace-global rather than a per-workspace reference table: comparing loss
-- causes across shops is the point of the asset, and a table each shop edits
-- makes that comparison meaningless. Adding a value later is a one-line
-- migration; removing one is not, so the list is short on purpose and each
-- entry names a cause an owner would act on differently.
create type public.waste_reason as enum (
  'caducado',              -- expired on the shelf: a rotation or an ordering problem
  'dañado',                -- broken, crushed, spoiled in handling
  'merma de preparación',  -- trimmings and offcuts: expected, and worth measuring
  'robo o faltante',       -- gone, cause unknown. Deliberately one value: a count
                           -- cannot distinguish theft from a miscount, and forcing
                           -- the operator to guess produces a fiction
  'error de captura'       -- the loss is in the data, not on the shelf
);

comment on type public.waste_reason is
  'Controlled waste vocabulary for Desperdicio. Global, not per workspace: the '
  'analytics asset compares causes across shops. ADR-035 §2.8.';

create table public.waste_line (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null,
  location_id             uuid not null,
  waste_id                uuid not null,
  variant_id              uuid not null,

  qty_base                numeric(14,3) not null,
  qty_display             numeric(14,3) not null,
  qty_display_unit        text not null references public.unit (code),

  unit_price_net_per_base numeric(14,6) not null,
  line_net                numeric(12,2) not null,
  tax_amount              numeric(12,2) not null,
  tax_rate                numeric(5,4) not null,

  -- Reason-first entry: this is the column Desperdicio asks for first, before
  -- the product (ADR-035 §2.8).
  reason                  public.waste_reason not null,

  -- What the wasted stock cost, snapshotted at the moment of waste. Snapshot and
  -- not a lookup, because the batches it came from can be exhausted and the price
  -- can change; the cost of this loss is the cost it had that day.
  unit_cost_net_per_base  numeric(14,6) not null,

  created_at              timestamptz not null default now(),

  constraint waste_line_qty_non_zero check (qty_base <> 0),
  constraint waste_line_money_follows_qty check (
    (qty_base > 0 and line_net >= 0 and tax_amount >= 0) or
    (qty_base < 0 and line_net <= 0 and tax_amount <= 0)
  ),
  constraint waste_line_qty_display_agrees check (
    qty_display <> 0 and (qty_base > 0) = (qty_display > 0)
  ),
  constraint waste_line_price_non_negative check (unit_price_net_per_base >= 0),
  constraint waste_line_cost_non_negative check (unit_cost_net_per_base >= 0),
  constraint waste_line_tax_rate_sane check (tax_rate >= 0 and tax_rate < 1),

  constraint waste_line_header_fk
    foreign key (waste_id, workspace_id, location_id)
    references public.waste (id, workspace_id, location_id) on delete cascade,

  constraint waste_line_variant_fk
    foreign key (variant_id, workspace_id)
    references public.product_variant (id, workspace_id) on delete restrict
);

create index waste_line_by_header_idx
  on public.waste_line (waste_id);

-- "What are we losing, and why" — the analytics asset Desperdicio feeds (§2.8).
create index waste_line_by_variant_idx
  on public.waste_line (workspace_id, location_id, variant_id);

comment on table public.waste_line is
  'Reason-first waste, with a cost snapshot. Carries cost, so its RLS policy is '
  'manager-and-above. ADR-035 §2.3, §2.7.';
comment on column public.waste_line.reason is
  'Controlled vocabulary — the first thing Desperdicio asks for. ADR-035 §2.8.';


-- ----------------------------------------------------------------------------
-- 5. Immutability triggers
-- ----------------------------------------------------------------------------

create trigger purchase_immutable_trg
  before update or delete on public.purchase
  for each row execute function public.transaction_document_is_immutable();

create trigger purchase_line_immutable_trg
  before update or delete on public.purchase_line
  for each row execute function public.transaction_document_is_immutable();

create trigger sale_immutable_trg
  before update or delete on public.sale
  for each row execute function public.transaction_document_is_immutable();

create trigger sale_line_immutable_trg
  before update or delete on public.sale_line
  for each row execute function public.transaction_document_is_immutable();

create trigger waste_immutable_trg
  before update or delete on public.waste
  for each row execute function public.transaction_document_is_immutable();

create trigger waste_line_immutable_trg
  before update or delete on public.waste_line
  for each row execute function public.transaction_document_is_immutable();


-- ----------------------------------------------------------------------------
-- 6. Row-level security  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- The LOCATION-level shape, on all six:
--
--     using (workspace_id in (select public.my_workspaces())
--        and location_id  in (select public.my_locations()))
--
-- The workspace predicate is redundant — my_locations() already implies
-- membership — and is kept anyway, so one uniform prefix is safe to copy without
-- thinking. Both are `in (select fn())` rather than a bare call so the planner
-- evaluates them once per query, not once per row.
--
-- SELECT ONLY. Clients never insert (§2.6); the 0006 RPCs are security definer
-- and are not governed by anything here. There is deliberately no insert, update
-- or delete policy on any of these tables.
--
-- COST IS HIDDEN BY ROLE, not by column grants (§2.7). Staff hold no select at
-- all on the three tables carrying cost — purchase, purchase_line, waste_line.
-- Their staff-facing counterparts are `security_invoker` views without the cost
-- columns, and they land with the screens that need them, not speculatively here.
-- The point of choosing views over `GRANT SELECT (col…)` is that the generated
-- TypeScript surface genuinely differs, so a staff-role read of a cost column
-- fails at build time rather than in front of a customer.

alter table public.purchase      enable row level security;
alter table public.purchase_line enable row level security;
alter table public.sale          enable row level security;
alter table public.sale_line     enable row level security;
alter table public.waste         enable row level security;
alter table public.waste_line    enable row level security;

-- --- purchase — manager and above: this is what the business pays ------------

create policy purchase_select on public.purchase
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));

create policy purchase_line_select on public.purchase_line
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));

-- --- sale — every member, at their own locations -----------------------------
-- A cashier must be able to see the sale they just rang up in order to void it
-- inside the 15-minute window, and a sale line carries a price, not a cost.

create policy sale_select on public.sale
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

create policy sale_line_select on public.sale_line
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

-- --- waste — header open to members, lines manager-only ----------------------
-- The asymmetry is deliberate and it is the cost snapshot that causes it. The
-- header carries retail value, which a cashier may see; waste_line carries
-- unit_cost_net_per_base, which they may not. A staff member therefore sees that
-- a waste document exists at their store and what it was worth on the shelf, and
-- the reason-and-quantity view for Desperdicio ships with that screen.

create policy waste_select on public.waste
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

create policy waste_line_select on public.waste_line
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));


-- ----------------------------------------------------------------------------
-- 7. Grants
-- ----------------------------------------------------------------------------
-- Explicit rather than inherited, so the intent is reviewable in the migration.
-- SELECT and nothing else, on all six. Every write goes through 0006.

revoke all on public.purchase      from anon, authenticated;
revoke all on public.purchase_line from anon, authenticated;
revoke all on public.sale          from anon, authenticated;
revoke all on public.sale_line     from anon, authenticated;
revoke all on public.waste         from anon, authenticated;
revoke all on public.waste_line    from anon, authenticated;

grant select on public.purchase      to authenticated;
grant select on public.purchase_line to authenticated;
grant select on public.sale          to authenticated;
grant select on public.sale_line     to authenticated;
grant select on public.waste         to authenticated;
grant select on public.waste_line    to authenticated;

-- Trigger functions are never called directly.
revoke all on function public.transaction_document_is_immutable() from public;
