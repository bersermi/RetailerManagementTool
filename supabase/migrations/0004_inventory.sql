-- ============================================================================
-- 0004 — Inventory: stock_batch, stock_movement and the batch_balance projection
-- ============================================================================
-- ADR-035 §2.3 (data model), §2.4 (the ledger), §2.7 (access)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * stock_batch     — a physical lot at a store, with its cost and its expiry
--   * stock_movement  — append-only, signed, THE SYSTEM OF RECORD
--   * batch_balance   — a trigger-maintained projection, disposable by design
--   * rebuild_batch_balance() and batch_balance_violations() — the two functions
--     that make "disposable" and "the invariant holds" checkable rather than
--     asserted
--
-- Not in this migration: FEFO allocation and the paired transfer write (0005),
-- the RPCs that call them (0006), the failure path (0007), the purchase-price
-- view (0008).
--
-- WHY THE TRANSFER COLUMNS ARE HERE AND THE TRANSFER LOGIC IS NOT.
-- ADR-035 §2.4 fixes the transfer movement shape in the ledger migration even
-- though the screen ships at step 6, "because getting it wrong is the same class
-- of problem as omitting location_id in the first place". This is the ledger
-- migration, so the shape — `transfer_in` / `transfer_out`, `transfer_group_id`,
-- `stock_batch.source_batch_id` — is defined here, and 0005 supplies the
-- mechanics that write it. The alternative was an ALTER in 0005 adding columns to
-- a table this file had just defined, which is a worse thing to review and gives
-- 0004 a table shape that cannot represent the ledger it claims to be.
--
-- THE ONE ALTER ON AN ALREADY-APPLIED TABLE. `purchase_line` gets a
-- unique (id, workspace_id, location_id) so stock_batch can carry a composite FK
-- to it. 0003 is applied and is therefore not edited; this is the fix-forward the
-- numbering rule in supabase/README.md prescribes. Without it a batch in one
-- tenant could name a purchase line in another, which is exactly the class of
-- error every composite FK in this schema exists to refuse.
--
-- EVERYTHING HERE IS LOCATION-LEVEL. "A batch is physically somewhere, so
-- location_id sits on the batch and every movement inherits it. Without that,
-- store A sells store B's inventory and the ledger is arithmetically perfect and
-- physically false." (ADR-035 §2.3)
--
-- CLIENTS NEVER INSERT (ADR-035 §2.6). SELECT and nothing else is granted, and
-- there are no insert/update/delete policies to review. The absence is the design.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Vocabularies
-- ----------------------------------------------------------------------------
-- Both are internal — they name mechanics, not anything an operator reads — so
-- they are English, following `workspace_role`. `waste_reason` is Spanish because
-- a cashier picks from it.

-- How a lot came to exist. It is not derivable from the source columns alone:
-- "no source" would have to mean both "counted onto the shelf" and "we forgot",
-- and those must not look alike.
create type public.batch_origin as enum (
  'purchase',    -- a delivery: one batch per purchase line
  'transfer',    -- arrived from another store, carrying cost and expiry forward
  'adjustment'   -- counted onto the shelf: opening balances and physical counts
);

comment on type public.batch_origin is
  'How a lot came to exist. ADR-035 §2.4.';

-- Why stock moved. A REVERSAL KEEPS THE REASON OF WHAT IT REVERSES and sets
-- reversal_of_movement_id — there is deliberately no 'reversal' value. A voided
-- sale is still sale activity, and forking the vocabulary would mean every report
-- that asks "how much did we sell" has to remember to union two reasons.
create type public.movement_reason as enum (
  'purchase',
  'sale',
  'waste',
  'transfer_out',  -- leaving this store
  'transfer_in',   -- arriving at this store, against a new batch
  'adjustment'     -- physical count, opening balance, failed-write downgrade
);

comment on type public.movement_reason is
  'Why stock moved. Reversals carry the original reason and set '
  'reversal_of_movement_id; there is no separate reversal value. ADR-035 §2.4.';


-- ----------------------------------------------------------------------------
-- 2. The composite key 0003 could not know it would need
-- ----------------------------------------------------------------------------
-- Fix-forward, not an edit: 0003 has been applied, so it is closed
-- (supabase/README.md). Adding the key here is what lets the next table refuse a
-- batch whose purchase line belongs to another tenant or another store.

alter table public.purchase_line
  add constraint purchase_line_id_scope_unique unique (id, workspace_id, location_id);


-- ----------------------------------------------------------------------------
-- 3. stock_batch  (ADR-035 §2.3, §2.4)
-- ----------------------------------------------------------------------------
-- One physical lot, at one store, at one cost, with one expiry date.
--
-- THERE IS NO QuantityRemaining COLUMN HERE, and that is a decision, not an
-- omission. The old model had one and no code path ever wrote it (§2.3,
-- "Deleted from the old model"). What is left on hand is a projection of the
-- movements, and it lives in batch_balance where it can be thrown away and
-- rebuilt.
--
-- A BATCH IS IMMUTABLE. Its cost, its expiry and above all its location are
-- history. "stock_batch.location_id is never updated — mutating it would rewrite
-- history and break the append-only principle." (§2.4) The guard is at the
-- bottom of this file.

create table public.stock_batch (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null,
  location_id             uuid not null,
  variant_id              uuid not null,

  origin                  public.batch_origin not null,

  -- Null is honest and is not the generic provider. The generic provider means
  -- "bought at the market this morning" — a real purchase from an unnamed
  -- supplier. Null here means no purchase happened at all: the stock was counted
  -- onto the shelf, or it walked in from the other store.
  provider_id             uuid,

  -- Set only when origin = 'purchase'. One batch per purchase line, enforced by
  -- the unique index below.
  source_purchase_line_id uuid,

  -- Set only when origin = 'transfer': the batch at the OTHER store that this one
  -- was cut from. Deliberately scoped to (id, workspace_id) and not to location —
  -- a transfer crosses locations, which is the entire point of it. One
  -- destination batch per consumed origin batch, because a transfer line that
  -- FEFO satisfies from three lots at the origin has three different costs and
  -- three different expiry dates to carry forward, and one merged batch would
  -- lose both.
  source_batch_id         uuid,

  -- Always positive. Stock leaving is a negative MOVEMENT, never a smaller batch.
  qty_received_base       numeric(14,3) not null,

  -- What this lot cost. Snapshotted here and copied onto every movement it
  -- serves, so margin is attributable to the lot actually consumed (§2.9) and
  -- does not move when the next delivery is priced differently.
  unit_cost_net_per_base  numeric(14,6) not null,

  -- FEFO orders on expiry_date and breaks ties on received_at (§2.4).
  received_at             timestamptz not null default now(),

  -- Null means the variant does not track expiry. It never means "does not
  -- expire", and FEFO sorts it last rather than first for exactly that reason.
  expiry_date             date,

  created_by              uuid not null references auth.users (id),
  created_at              timestamptz not null default now(),

  constraint stock_batch_qty_positive check (qty_received_base > 0),
  constraint stock_batch_cost_non_negative check (unit_cost_net_per_base >= 0),
  constraint stock_batch_not_self_sourced check (source_batch_id is distinct from id),

  -- `else false` is deliberate: adding a value to batch_origin without revisiting
  -- this constraint fails loudly on the next insert. A CASE with no ELSE returns
  -- null, and a null CHECK passes — the failure would be a lot with no provenance
  -- and nothing to notice it.
  constraint stock_batch_origin_source_agrees check (
    case origin
      when 'purchase'   then source_purchase_line_id is not null
                         and source_batch_id is null
      when 'transfer'   then source_batch_id is not null
                         and source_purchase_line_id is null
      when 'adjustment' then source_purchase_line_id is null
                         and source_batch_id is null
      else false
    end
  ),

  constraint stock_batch_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete restrict,

  constraint stock_batch_variant_fk
    foreign key (variant_id, workspace_id)
    references public.product_variant (id, workspace_id) on delete restrict,

  -- Nullable, and MATCH SIMPLE is what makes that work: with provider_id null the
  -- constraint is not enforced, which is the intent stated on the column.
  constraint stock_batch_provider_fk
    foreign key (provider_id, workspace_id)
    references public.provider (id, workspace_id) on delete restrict,

  constraint stock_batch_purchase_line_fk
    foreign key (source_purchase_line_id, workspace_id, location_id)
    references public.purchase_line (id, workspace_id, location_id) on delete restrict,

  -- Referenced by source_batch_id. Workspace-scoped only: a transfer's origin
  -- batch is at a different location by definition.
  constraint stock_batch_id_workspace_unique unique (id, workspace_id),

  -- Referenced by stock_movement and batch_balance. Carrying all four columns is
  -- what lets those tables denormalise location_id and variant_id without the
  -- copies ever being able to disagree with the batch.
  constraint stock_batch_id_scope_unique
    unique (id, workspace_id, location_id, variant_id),

  constraint stock_batch_source_batch_fk
    foreign key (source_batch_id, workspace_id)
    references public.stock_batch (id, workspace_id) on delete restrict
);

-- One batch per purchase line (ADR-035 §2.3). A retried record_purchase that got
-- past the header's idempotency key and reached this table twice would otherwise
-- double the delivery.
create unique index stock_batch_one_per_purchase_line_idx
  on public.stock_batch (source_purchase_line_id)
  where source_purchase_line_id is not null;

-- The candidate set for allocation is scoped by location and variant (§2.4); the
-- open-lot filter itself lives on batch_balance, which is where remaining_base is.
create index stock_batch_by_variant_idx
  on public.stock_batch (workspace_id, location_id, variant_id, expiry_date, received_at);

create index stock_batch_by_provider_idx
  on public.stock_batch (workspace_id, provider_id)
  where provider_id is not null;

comment on table public.stock_batch is
  'One physical lot at one store. Immutable, and carries no remaining-quantity '
  'column: what is left is projected in batch_balance. ADR-035 §2.3, §2.4.';
comment on column public.stock_batch.location_id is
  'Where the lot physically is. Never updated, including by a transfer — a '
  'transfer creates a new batch at the destination. ADR-035 §2.4.';
comment on column public.stock_batch.unit_cost_net_per_base is
  'Cost of this lot, copied onto every movement against it so margin follows the '
  'lot actually consumed. ADR-035 §2.9.';
comment on column public.stock_batch.expiry_date is
  'Null means the variant does not track expiry, never "does not expire". FEFO '
  'sorts nulls last.';


-- ----------------------------------------------------------------------------
-- 4. stock_movement  (ADR-035 §2.4)
-- ----------------------------------------------------------------------------
-- THE SYSTEM OF RECORD. Append-only, signed, one row per lot touched.
--
-- "One append-only table absorbs purchases, sales, waste, corrections and stock
-- counts. A purchase writes positive movements against new batches. A sale, waste
-- event or downward count writes negative movements allocated across existing
-- batches. A void writes compensating movements referencing the original. Nothing
-- is mutated." (§2.4)
--
-- location_id and variant_id are copied from the batch. That is a denormalisation
-- and it is safe here for a reason that did not hold for the purchase-price index
-- in 0003: the four-column composite FK below makes disagreement unrepresentable,
-- so the copy cannot drift. Reports and RLS both read these columns without
-- joining to stock_batch — which matters, because stock_batch is manager-only and
-- a staff-visible view over movements must not have to touch it.

create table public.stock_movement (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null,
  location_id             uuid not null,
  batch_id                uuid not null,
  variant_id              uuid not null,

  reason                  public.movement_reason not null,

  -- Signed, in the variant's base unit. Positive adds to the lot, negative takes
  -- from it.
  qty_base                numeric(14,3) not null,

  -- Copied from the batch at write time. Snapshot and not a join: this is what
  -- the units consumed by THIS movement cost, and it is what §2.9 divides revenue
  -- against. A join would re-cost history if the batch were ever restated.
  unit_cost_net_per_base  numeric(14,6) not null,

  -- Which document caused it. Exactly one is set, and which one is fixed by
  -- `reason` — see stock_movement_source_agrees. Typed columns with real FKs
  -- rather than a (kind, id) pair, because a polymorphic id the database cannot
  -- check is how the old model ended up with an InventoryEvent table that pointed
  -- at nothing.
  purchase_id             uuid,
  sale_id                 uuid,
  waste_id                uuid,

  -- A transfer has no document table — it is a pair of movements (§2.4). This is
  -- what pairs them: one id, generated by the caller, on both the negative
  -- movements at the origin and the positive ones at the destination.
  transfer_group_id       uuid,

  -- The movement this one compensates, against THE SAME BATCH. Scoped by batch_id
  -- in the FK below because crediting the void back to a different lot is
  -- arithmetically invisible and physically wrong: the shelf total is right and
  -- both lots' costs are now fiction.
  reversal_of_movement_id uuid,

  occurred_at             timestamptz not null,
  recorded_at             timestamptz not null default now(),
  created_by              uuid not null references auth.users (id),

  constraint stock_movement_not_self_reversal
    check (reversal_of_movement_id is distinct from id),

  -- Sign follows reason, EXCEPT on a compensating movement, which by definition
  -- carries the opposite sign of the one it cancels. `else false` is deliberate,
  -- for the reason given on stock_batch_origin_source_agrees.
  constraint stock_movement_sign_follows_reason check (
    qty_base <> 0
    and (
      reversal_of_movement_id is not null
      or case reason
           when 'purchase'     then qty_base > 0
           when 'transfer_in'  then qty_base > 0
           when 'sale'         then qty_base < 0
           when 'waste'        then qty_base < 0
           when 'transfer_out' then qty_base < 0
           -- A count can go either way; that is what makes it a count.
           when 'adjustment'   then true
           else false
         end
    )
  ),

  constraint stock_movement_source_agrees check (
    case reason
      when 'purchase'     then purchase_id is not null and sale_id is null
                           and waste_id is null and transfer_group_id is null
      when 'sale'         then sale_id is not null and purchase_id is null
                           and waste_id is null and transfer_group_id is null
      when 'waste'        then waste_id is not null and purchase_id is null
                           and sale_id is null and transfer_group_id is null
      when 'transfer_out' then transfer_group_id is not null and purchase_id is null
                           and sale_id is null and waste_id is null
      when 'transfer_in'  then transfer_group_id is not null and purchase_id is null
                           and sale_id is null and waste_id is null
      -- An adjustment answers to nothing but its own note. The failure path's
      -- downgrade lands here too, and the link back to its failed_write row is
      -- stored on that row, not on this one (§2.6).
      when 'adjustment'   then purchase_id is null and sale_id is null
                           and waste_id is null and transfer_group_id is null
      else false
    end
  ),

  constraint stock_movement_cost_non_negative check (unit_cost_net_per_base >= 0),

  -- The four-column key. This is what makes location_id and variant_id above a
  -- safe copy rather than a second source of truth.
  constraint stock_movement_batch_fk
    foreign key (batch_id, workspace_id, location_id, variant_id)
    references public.stock_batch (id, workspace_id, location_id, variant_id)
    on delete restrict,

  constraint stock_movement_purchase_fk
    foreign key (purchase_id, workspace_id, location_id)
    references public.purchase (id, workspace_id, location_id) on delete restrict,

  constraint stock_movement_sale_fk
    foreign key (sale_id, workspace_id, location_id)
    references public.sale (id, workspace_id, location_id) on delete restrict,

  constraint stock_movement_waste_fk
    foreign key (waste_id, workspace_id, location_id)
    references public.waste (id, workspace_id, location_id) on delete restrict,

  constraint stock_movement_id_scope_unique
    unique (id, workspace_id, location_id, batch_id),

  constraint stock_movement_reversal_fk
    foreign key (reversal_of_movement_id, workspace_id, location_id, batch_id)
    references public.stock_movement (id, workspace_id, location_id, batch_id)
    on delete restrict
);

-- A movement is reversed AT MOST ONCE. The document-level rule in 0003 stops a
-- double-tapped void writing two compensating DOCUMENTS; this stops anything
-- writing two compensating MOVEMENTS, including a security definer RPC that
-- 0003's index never sees. Both are needed: void_transaction is idempotent at the
-- document level, adjust_stock_delta and replay_failed_write are not documents at
-- all.
create unique index stock_movement_one_reversal_idx
  on public.stock_movement (reversal_of_movement_id)
  where reversal_of_movement_id is not null;

-- The invariant, and the rebuild, both read every movement of one batch.
create index stock_movement_by_batch_idx
  on public.stock_movement (batch_id);

-- "What moved at this store" — the ledger read behind Números and the nightly
-- check (§2.9).
create index stock_movement_by_location_time_idx
  on public.stock_movement (workspace_id, location_id, occurred_at desc);

-- Margin and units-moved by product, per store (§2.9).
create index stock_movement_by_variant_idx
  on public.stock_movement (workspace_id, location_id, variant_id, occurred_at desc);

-- Voiding a document finds its movements by document.
create index stock_movement_by_purchase_idx on public.stock_movement (purchase_id)
  where purchase_id is not null;
create index stock_movement_by_sale_idx on public.stock_movement (sale_id)
  where sale_id is not null;
create index stock_movement_by_waste_idx on public.stock_movement (waste_id)
  where waste_id is not null;
create index stock_movement_by_transfer_idx on public.stock_movement (transfer_group_id)
  where transfer_group_id is not null;

comment on table public.stock_movement is
  'The system of record. Append-only and signed; batch_balance is a projection of '
  'it and can be dropped and rebuilt. ADR-035 §2.4.';
comment on column public.stock_movement.reason is
  'Why stock moved. A reversal keeps the reason it cancels and sets '
  'reversal_of_movement_id.';
comment on column public.stock_movement.transfer_group_id is
  'Pairs the negative movements at the origin with the positive ones at the '
  'destination. A transfer has no document table. ADR-035 §2.4.';
comment on column public.stock_movement.reversal_of_movement_id is
  'The movement this one compensates, against the same batch. ADR-035 §2.4.';


-- ----------------------------------------------------------------------------
-- 5. batch_balance  (ADR-035 §2.4)
-- ----------------------------------------------------------------------------
-- A PROJECTION. It stores nothing that stock_movement does not already imply, and
-- rebuild_batch_balance() below reproduces it from the movements alone. It exists
-- because FEFO allocation must read what is left in one indexed lookup rather
-- than aggregating the whole ledger on every sale.
--
-- expiry_date and received_at are copied from the batch so the FEFO ordering is
-- servable from this table's index without a join. Both are immutable on
-- stock_batch, so the copies cannot drift.
--
-- THERE IS NO `remaining_base >= 0` CHECK, deliberately. v1 ships with the
-- availability check dormant and open mode always on (§2.6) — the shop sells what
-- is on the shelf whether or not the database agrees. A constraint here would
-- turn a permitted oversale into a raised exception at the counter, in front of a
-- customer, which is the one failure this system is not allowed to have. A
-- negative balance is a true statement about a disagreement between the ledger
-- and the shelf, and adjust_stock is how it gets resolved.

create table public.batch_balance (
  batch_id       uuid primary key,
  workspace_id   uuid not null,
  location_id    uuid not null,
  variant_id     uuid not null,

  remaining_base numeric(14,3) not null default 0,

  expiry_date    date,
  received_at    timestamptz not null,

  updated_at     timestamptz not null default now(),

  constraint batch_balance_batch_fk
    foreign key (batch_id, workspace_id, location_id, variant_id)
    references public.stock_batch (id, workspace_id, location_id, variant_id)
    on delete cascade
);

-- The allocation index (ADR-035 §2.3). workspace_id is deliberately NOT the
-- leading column: location_id functionally determines it, so prefixing would add
-- a column without adding selectivity. received_at trails as the FEFO tiebreak
-- (§2.4), so the whole ordering is servable from the index.
--
-- Partial on `remaining_base > 0` because that is the candidate set and it is a
-- small fraction of history — which is also what bounds the cost of the dormant
-- availability check to the one to three open lots it locks, regardless of how
-- much history exists (§2.6).
create index batch_balance_open_lots_idx
  on public.batch_balance (location_id, variant_id, expiry_date, received_at)
  where remaining_base > 0;

-- "What is on the shelf right now", per store — the read behind Home and behind
-- every screen that shows a stock figure.
create index batch_balance_by_location_idx
  on public.batch_balance (workspace_id, location_id, variant_id);

comment on table public.batch_balance is
  'Disposable projection of stock_movement. Rebuildable by '
  'rebuild_batch_balance(); the invariant is checked by '
  'batch_balance_violations(). ADR-035 §2.4.';
comment on column public.batch_balance.remaining_base is
  'May be negative. v1 records stock, it does not enforce it — a constraint here '
  'would raise at the counter on a permitted oversale. ADR-035 §2.6.';


-- ----------------------------------------------------------------------------
-- 6. The projection
-- ----------------------------------------------------------------------------
-- Two triggers, both AFTER INSERT, and that is the whole mechanism. There is no
-- update or delete path to maintain because stock_movement has neither: the guard
-- in section 7 refuses both, which is what makes an incremental projection sound.
-- A mutable ledger would need the projection recomputed, and the recomputation is
-- what nobody remembers to run.

-- A batch begins at zero rather than at qty_received_base. The receipt itself is
-- a movement — that is what "one append-only table absorbs purchases" means — and
-- seeding the balance with the received quantity would count the delivery twice
-- the moment the purchase movement lands.
create function public.stock_batch_open_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.batch_balance
    (batch_id, workspace_id, location_id, variant_id, remaining_base,
     expiry_date, received_at, updated_at)
  values
    (new.id, new.workspace_id, new.location_id, new.variant_id, 0,
     new.expiry_date, new.received_at, now())
  on conflict (batch_id) do nothing;
  return null;
end;
$$;

comment on function public.stock_batch_open_balance() is
  'Opens a batch_balance row at zero for every new batch, so the §2.4 invariant '
  'has a row to hold on a lot that has not moved yet.';

create function public.stock_movement_project_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.batch_balance as bb
    (batch_id, workspace_id, location_id, variant_id, remaining_base,
     expiry_date, received_at, updated_at)
  select new.batch_id, new.workspace_id, new.location_id, new.variant_id,
         new.qty_base, sb.expiry_date, sb.received_at, now()
    from public.stock_batch sb
   where sb.id = new.batch_id
  on conflict (batch_id) do update
     set remaining_base = bb.remaining_base + excluded.remaining_base,
         updated_at     = now();
  return null;
end;
$$;

comment on function public.stock_movement_project_balance() is
  'Maintains batch_balance incrementally. Sound only because stock_movement is '
  'append-only — see stock_movement_immutable_trg. ADR-035 §2.4.';

create trigger stock_batch_open_balance_trg
  after insert on public.stock_batch
  for each row execute function public.stock_batch_open_balance();

create trigger stock_movement_project_balance_trg
  after insert on public.stock_movement
  for each row execute function public.stock_movement_project_balance();


-- ----------------------------------------------------------------------------
-- 7. Immutability
-- ----------------------------------------------------------------------------
-- The same guard 0003 puts on the six document tables, for the same reason and
-- against the same threat: the 0006 RPCs are `security definer`, so grants and
-- RLS are not running inside them and a well-meaning UPDATE would read as
-- ordinary in review. Here it raises.
--
-- batch_balance is deliberately NOT guarded. It is the one table in this file
-- that is supposed to change, and rebuild_batch_balance() deletes from it.

create trigger stock_batch_immutable_trg
  before update or delete on public.stock_batch
  for each row execute function public.transaction_document_is_immutable();

create trigger stock_movement_immutable_trg
  before update or delete on public.stock_movement
  for each row execute function public.transaction_document_is_immutable();


-- ----------------------------------------------------------------------------
-- 8. The invariant, and the rebuild
-- ----------------------------------------------------------------------------
-- "select sum(qty_base) from stock_movement where batch_id = $1
--    = (select remaining_base from batch_balance where batch_id = $1)
--  ... must hold for every batch, at all times. Property-tested in CI against
--  randomised sequences, re-checked nightly in production. The projection is
--  disposable and rebuildable from the ledger." (ADR-035 §2.4)
--
-- Both halves of that sentence are functions rather than prose, because a claim
-- that is only prose is the failure this repo was rebuilt to avoid (§9).

create function public.batch_balance_violations()
returns table (
  batch_id            uuid,
  workspace_id        uuid,
  location_id         uuid,
  movement_sum        numeric,
  projected_remaining numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select sb.id, sb.workspace_id, sb.location_id,
         coalesce(sum(sm.qty_base), 0),
         bb.remaining_base
    from public.stock_batch sb
    left join public.stock_movement sm on sm.batch_id = sb.id
    -- LEFT, not INNER: a batch with no balance row at all is the violation most
    -- worth catching, and an inner join would hide exactly that case.
    left join public.batch_balance bb on bb.batch_id = sb.id
   group by sb.id, sb.workspace_id, sb.location_id, bb.remaining_base
  having coalesce(sum(sm.qty_base), 0) is distinct from bb.remaining_base
$$;

comment on function public.batch_balance_violations() is
  'Every batch where the movement sum and the projection disagree, or where the '
  'projection row is missing. Empty is the only acceptable result. Wired into CI '
  'over seed data by plan task 1.7, and run nightly in production. ADR-035 §2.4.';

-- Proves "disposable" by doing it. Returns the number of rows written.
create function public.rebuild_batch_balance(p_workspace_id uuid default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows bigint;
begin
  delete from public.batch_balance bb
   where p_workspace_id is null or bb.workspace_id = p_workspace_id;

  insert into public.batch_balance
    (batch_id, workspace_id, location_id, variant_id, remaining_base,
     expiry_date, received_at, updated_at)
  select sb.id, sb.workspace_id, sb.location_id, sb.variant_id,
         coalesce(sum(sm.qty_base), 0), sb.expiry_date, sb.received_at, now()
    from public.stock_batch sb
    left join public.stock_movement sm on sm.batch_id = sb.id
   where p_workspace_id is null or sb.workspace_id = p_workspace_id
   group by sb.id, sb.workspace_id, sb.location_id, sb.variant_id,
            sb.expiry_date, sb.received_at;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

comment on function public.rebuild_batch_balance(uuid) is
  'Drops and recomputes the projection from stock_movement alone. Operator tool: '
  'no role is granted execute. ADR-035 §2.4.';


-- ----------------------------------------------------------------------------
-- 9. Row-level security  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- The LOCATION-level shape on all three, select only. Clients never insert
-- (§2.6); the 0005 allocator and the 0006 RPCs are security definer and nothing
-- here governs them.
--
-- COST SPLITS THE THREE TABLES IN TWO, by the §2.7 rule that staff hold no select
-- on a base table carrying cost:
--
--   stock_batch     unit_cost_net_per_base  -> manager and above
--   stock_movement  unit_cost_net_per_base  -> manager and above
--   batch_balance   no cost column          -> every member, at their locations
--
-- That split is why batch_balance carries no cost. "How much is on the shelf" is
-- a question a cashier must be able to answer, and it is answered entirely from
-- the projection — so the cost gate costs nothing at the counter. A staff-facing
-- movement history without the cost columns is a `security_invoker` view, and it
-- ships with the screen that needs it rather than speculatively here.

alter table public.stock_batch    enable row level security;
alter table public.stock_movement enable row level security;
alter table public.batch_balance  enable row level security;

create policy stock_batch_select on public.stock_batch
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));

create policy stock_movement_select on public.stock_movement
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations())
     and public.has_role(workspace_id, 'manager'));

create policy batch_balance_select on public.batch_balance
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));


-- ----------------------------------------------------------------------------
-- 10. Grants
-- ----------------------------------------------------------------------------
-- Explicit rather than inherited, so the intent is reviewable in the migration.

revoke all on public.stock_batch    from anon, authenticated;
revoke all on public.stock_movement from anon, authenticated;
revoke all on public.batch_balance  from anon, authenticated;

grant select on public.stock_batch    to authenticated;
grant select on public.stock_movement to authenticated;
grant select on public.batch_balance  to authenticated;

-- Trigger functions are never called directly.
revoke all on function public.stock_batch_open_balance() from public;
revoke all on function public.stock_movement_project_balance() from public;

-- Operator tools, not part of the client surface. batch_balance_violations() is
-- read by CI and by the nightly job; rebuild_batch_balance() is run by a human
-- who has decided to throw the projection away. Neither is something an
-- authenticated session should be able to call.
revoke all on function public.batch_balance_violations() from public, anon, authenticated;
revoke all on function public.rebuild_batch_balance(uuid) from public, anon, authenticated;
