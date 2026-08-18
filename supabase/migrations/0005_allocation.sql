-- ============================================================================
-- 0005 — Allocation: allocate_fefo() and the paired transfer write
-- ============================================================================
-- ADR-035 §2.4 (the ledger), §2.6 (the write path)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * fefo_allocation / transfer_allocation — the two return shapes
--   * allocate_fefo()     — which lots a withdrawal consumes, and at what cost
--   * allocate_transfer() — the paired write §2.4 fixes the shape of in 0004
--
-- Not in this migration: the RPCs that call these (0006), the failure path
-- (0007), the purchase-price view (0008). Nothing here validates the caller's
-- location against my_locations() — see THE WALL below.
--
-- WHY THIS MIGRATION EXISTS AT ALL. FEFO allocation is a ledger primitive, not a
-- detail of record_sale. The seed (plan task 1.6) writes three months of ledger
-- three steps before the RPCs exist, and step 2 — the design gate — turns on
-- margin by product. Margin is produced by WHICH BATCHES a sale consumed, so a
-- seed that allocates differently from record_sale would let the gate pass on
-- data the real system never produces. One allocator, called by the seed now and
-- by the RPCs later. The decision and its alternatives are in docs/PLAN.md.
--
-- THE WALL IS NOT HERE. "Every RPC validates its location as its first
-- statement... RLS will not catch a bad location_id here, because RLS is not
-- running." (§2.6) These two functions are NOT RPCs. They hold no execute grant
-- for any role, they are called only from the security definer functions of 0006
-- and from the seed, and the location check belongs to the caller. A reviewer
-- looking for `my_locations()` in this file is looking in the right place for the
-- wrong file: the guarantee here is structural — a location that is not in the
-- named workspace is refused, and a transfer to the location it came from is
-- refused — and the access guarantee is 0006's.
--
-- THESE FUNCTIONS DO NOT OPEN A TRANSACTION AND MUST NOT BE CALLED OUTSIDE ONE
-- THAT WRITES. allocate_fefo() takes row locks on batch_balance and returns; the
-- locks are what stop two tills allocating the same units, and they last until
-- the CALLER's transaction ends. Calling it, committing, and writing the
-- movements afterwards releases the locks between the decision and the write, and
-- is the one way to use it wrongly.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The return shapes
-- ----------------------------------------------------------------------------
-- Named composite types rather than `returns table`, because `returns table`
-- declares OUT parameters that shadow column names of the same spelling —
-- `qty_base` and `expiry_date` are both columns on tables these functions write.
-- A named type keeps the returned shape reusable by 0006 and keeps the bodies
-- free of that hazard.

-- One lot, and how much of the withdrawal it covers. qty_base is the AMOUNT
-- TAKEN and is always positive; the caller writes the sign that belongs to its
-- reason. The cost and the expiry ride along so a caller never has to join back
-- to stock_batch — which matters, because stock_batch is manager-only (§2.7).
create type public.fefo_allocation as (
  batch_id               uuid,
  qty_base               numeric(14,3),
  unit_cost_net_per_base numeric(14,6),
  expiry_date            date
);

comment on type public.fefo_allocation is
  'One lot consumed by a withdrawal. qty_base is the positive amount taken. '
  'ADR-035 §2.4.';

-- One leg of a transfer: the lot it left and the lot it became.
create type public.transfer_allocation as (
  source_batch_id        uuid,
  destination_batch_id   uuid,
  qty_base               numeric(14,3),
  unit_cost_net_per_base numeric(14,6),
  expiry_date            date
);

comment on type public.transfer_allocation is
  'One origin lot and the destination lot cut from it. ADR-035 §2.4.';


-- ----------------------------------------------------------------------------
-- 2. allocate_fefo()  (ADR-035 §2.4)
-- ----------------------------------------------------------------------------
-- "The RPC allocates against FEFO (first-expiring-first-out), which is what
-- perishable retail rotates on; receipt order is only a tiebreak." (§2.4)
--
-- THE ORDER IS expiry_date asc NULLS LAST, then received_at, then batch_id.
--   * nulls last, not first: a null expiry means the variant does not track
--     expiry, never "does not expire" (stock_batch.expiry_date). Sorting nulls
--     first would rotate the one lot with no deadline ahead of the milk.
--   * received_at is the tiebreak §2.4 names.
--   * batch_id is a third key §2.4 does not name, and it is not decoration. Two
--     lines of one delivery for the same variant get the same received_at —
--     now() is fixed for the whole transaction — and can share an expiry date.
--     Without a deterministic final key the seed and record_sale could allocate
--     the same request differently, which is the exact divergence this migration
--     exists to prevent. The first two keys come from batch_balance_open_lots_idx
--     and the third costs an incremental sort within ties only.
--
-- THE CANDIDATE SET IS LOCATION-SCOPED. "The candidate set is
-- `where location_id = $location and remaining_base > 0`, never workspace-wide."
-- (§2.4) Store A does not sell store B's inventory.
--
-- WHY `for update of bb` IS THE WHOLE CONCURRENCY STORY. Two tills selling the
-- last kilo must not both allocate it. The lock makes the second one wait; when
-- the first commits, READ COMMITTED re-checks `remaining_base > 0` against the
-- row version the first left behind, so the second either sees the remainder or
-- skips the lot and moves down the FEFO order. Both sessions lock in the same
-- order, so they cannot deadlock. A concurrently committed DELIVERY can be missed
-- by a session already past that point in the sort — that is a benign miss, it
-- allocates from a later lot and never oversells one.
--
-- WHAT HAPPENS WHEN THERE IS NOT ENOUGH. It allocates anyway. v1 records stock
-- and does not enforce it (§2.6): the availability check is built and dormant in
-- 0006 and open mode is always on, because a raise here is a raise at the
-- counter, in front of a customer. The shortfall has to name a batch — batch_id
-- is not nullable on stock_movement — and it lands on the lot the shop would
-- blame:
--
--   1. the last lot FEFO was working on when it ran out, driven negative. This
--      is 0004's own oversale fixture, and it needs no second lookup and no
--      second lock;
--   2. if nothing was open, the most recently received lot for this variant at
--      this store, open or not. Its cost is a real number the shop actually paid,
--      and the likeliest truth about units sold with no record of receipt is that
--      the last delivery was under-recorded;
--   3. if the product has never been stocked here at all, a new adjustment lot
--      AT ZERO COST. There is no honest cost to give it and no earlier one to
--      borrow. Zero is chosen over an estimate deliberately: it makes those units
--      read as 100% margin in §2.9, which is visibly wrong and gets asked about,
--      where a plausible invented cost would be invisibly wrong. adjust_stock is
--      how an operator resolves it.
--
-- sum(qty_base) over the returned rows always equals p_qty_base exactly. That is
-- the property the caller relies on and it holds in all three branches.

create function public.allocate_fefo(
  p_workspace_id uuid,
  p_location_id  uuid,
  p_variant_id   uuid,
  p_qty_base     numeric,
  p_created_by   uuid
)
returns setof public.fefo_allocation
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alloc      public.fefo_allocation[] := '{}';
  v_lot        record;
  v_left       numeric(14,3);
  v_take       numeric(14,3);
  v_n          integer;
  v_fallback   record;
  v_new_batch  uuid;
begin
  if p_workspace_id is null or p_location_id is null
     or p_variant_id is null or p_created_by is null then
    raise exception 'allocate_fefo: workspace, location, variant and author are all required'
      using errcode = '22023';
  end if;

  -- A withdrawal of zero is a caller bug, not a no-op to swallow: every reason a
  -- movement can carry forbids qty_base = 0 (stock_movement_sign_follows_reason),
  -- so returning nothing here would only move the failure one statement later.
  if p_qty_base is null or p_qty_base <= 0 then
    raise exception 'allocate_fefo: quantity must be positive, got %', p_qty_base
      using errcode = '22023';
  end if;

  v_left := p_qty_base;

  for v_lot in
    select bb.batch_id, bb.remaining_base, bb.expiry_date,
           sb.unit_cost_net_per_base
      from public.batch_balance bb
      join public.stock_batch   sb on sb.id = bb.batch_id
     where bb.workspace_id   = p_workspace_id
       and bb.location_id    = p_location_id
       and bb.variant_id     = p_variant_id
       and bb.remaining_base > 0
     order by bb.expiry_date asc nulls last, bb.received_at asc, bb.batch_id asc
     for update of bb
  loop
    exit when v_left <= 0;

    v_take  := least(v_left, v_lot.remaining_base);
    v_alloc := v_alloc || row(v_lot.batch_id, v_take,
                              v_lot.unit_cost_net_per_base,
                              v_lot.expiry_date)::public.fefo_allocation;
    v_left  := v_left - v_take;
  end loop;

  -- ---- the shortfall, if there is one -------------------------------------
  if v_left > 0 then
    v_n := array_length(v_alloc, 1);

    if v_n is not null then
      -- (1) overdraw the lot FEFO ran out on.
      v_alloc[v_n].qty_base := (v_alloc[v_n]).qty_base + v_left;

    else
      -- (2) nothing is open. Blame the most recent lot this store held.
      select sb.id, sb.unit_cost_net_per_base, sb.expiry_date
        into v_fallback
        from public.stock_batch sb
       where sb.workspace_id = p_workspace_id
         and sb.location_id  = p_location_id
         and sb.variant_id   = p_variant_id
       order by sb.received_at desc, sb.id desc
       limit 1;

      if found then
        -- Lock it for the same reason the open lots are locked: two tills
        -- overdrawing the same closed lot must still serialise.
        perform 1 from public.batch_balance bb
         where bb.batch_id = v_fallback.id
           for update;

        v_alloc := v_alloc || row(v_fallback.id, v_left,
                                  v_fallback.unit_cost_net_per_base,
                                  v_fallback.expiry_date)::public.fefo_allocation;
      else
        -- (3) never stocked here. Open a lot to hold the discrepancy. No expiry:
        -- inventing one would put a fictional lot at the head of the FEFO order.
        -- qty_received_base must be positive (stock_batch_qty_positive) and the
        -- shortfall is the only honest number available; the balance is opened at
        -- zero by the 0004 trigger and the caller's negative movement is what
        -- makes it read as the debt it is.
        insert into public.stock_batch
          (workspace_id, location_id, variant_id, origin,
           qty_received_base, unit_cost_net_per_base, created_by)
        values
          (p_workspace_id, p_location_id, p_variant_id, 'adjustment',
           v_left, 0, p_created_by)
        returning id into v_new_batch;

        v_alloc := v_alloc || row(v_new_batch, v_left,
                                  0::numeric(14,6),
                                  null::date)::public.fefo_allocation;
      end if;
    end if;
  end if;

  return query select * from unnest(v_alloc);
end;
$$;

comment on function public.allocate_fefo(uuid, uuid, uuid, numeric, uuid) is
  'Which lots a withdrawal consumes, FEFO, within one location, and at what cost. '
  'Takes row locks on batch_balance that the CALLER''s transaction must hold until '
  'the movements are written. Allocates a shortfall rather than raising — v1 '
  'records stock, it does not enforce it. ADR-035 §2.4, §2.6.';


-- ----------------------------------------------------------------------------
-- 3. allocate_transfer()  (ADR-035 §2.4)
-- ----------------------------------------------------------------------------
-- "Moving stock writes negative FEFO-allocated movements at the origin and
-- creates NEW BATCHES at the destination carrying unit_cost_net_per_base and
-- expiry_date forward, with positive movements against them.
-- stock_batch.location_id is NEVER UPDATED — mutating it would rewrite history
-- and break the append-only principle." (§2.4)
--
-- 0004 fixed the shape — transfer_in / transfer_out, transfer_group_id,
-- stock_batch.source_batch_id — and this is the mechanics it was waiting for.
--
-- ONE DESTINATION LOT PER ORIGIN LOT. A transfer FEFO satisfies from three lots
-- has three costs and three expiry dates to carry forward, and one merged batch
-- at the destination would lose both. stock_batch.source_batch_id says so in the
-- schema; this loop is what honours it.
--
-- received_at IS NOT CARRIED FORWARD, and that is deliberate. §2.4 names cost and
-- expiry, and only those: expiry is the FEFO sort key and carrying it forward is
-- what keeps store B's rotation meaningful, while received_at is a tiebreak and
-- store B genuinely received the goods today. 0004's transfer fixture takes the
-- same reading.
--
-- provider_id IS NOT CARRIED FORWARD EITHER. Null on a transfer batch is the
-- documented meaning of the column: "no purchase happened at all... it walked in
-- from the other store."
--
-- occurred_at IS THE CALLER'S. The server override and the offline clamp are §2.6
-- rules about a client's clock, and the client is on the other side of 0006.

create function public.allocate_transfer(
  p_workspace_id      uuid,
  p_from_location_id  uuid,
  p_to_location_id    uuid,
  p_variant_id        uuid,
  p_qty_base          numeric,
  p_transfer_group_id uuid,
  p_occurred_at       timestamptz,
  p_created_by        uuid
)
returns setof public.transfer_allocation
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_leg   public.fefo_allocation;
  v_row   public.transfer_allocation;
  v_dest  uuid;
  v_locs  integer;
begin
  if p_workspace_id is null or p_from_location_id is null
     or p_to_location_id is null or p_variant_id is null
     or p_transfer_group_id is null or p_occurred_at is null
     or p_created_by is null then
    raise exception 'allocate_transfer: every argument except the quantity is required'
      using errcode = '22023';
  end if;

  -- A transfer to the store it came from would write a matched pair against two
  -- lots at one location and net to nothing while inventing a batch.
  if p_from_location_id = p_to_location_id then
    raise exception 'allocate_transfer: origin and destination are the same location'
      using errcode = '22023';
  end if;

  -- "Where a transaction spans locations — only record_transfer — both are
  -- checked, and both must resolve to the same workspace." (§2.6) The access half
  -- of that sentence is 0006's; this is the structural half, and it is here as
  -- well as there because the composite FKs below would otherwise let a transfer
  -- into another tenant fail with a foreign-key message halfway through the loop.
  select count(*) into v_locs
    from public.location l
   where l.workspace_id = p_workspace_id
     and l.id in (p_from_location_id, p_to_location_id);

  if v_locs <> 2 then
    raise exception 'allocate_transfer: both locations must belong to workspace %',
      p_workspace_id using errcode = '42501';
  end if;

  -- The origin side of the withdrawal, including the locks. A transfer out of a
  -- store that has none of the variant is an oversale at the origin and is
  -- recorded as one, for the reason allocate_fefo gives at length.
  for v_leg in
    select * from public.allocate_fefo(p_workspace_id, p_from_location_id,
                                       p_variant_id, p_qty_base, p_created_by)
  loop
    -- The new lot at the destination. Cost and expiry forward; location, provider
    -- and received_at are the destination's own.
    insert into public.stock_batch
      (workspace_id, location_id, variant_id, origin, source_batch_id,
       qty_received_base, unit_cost_net_per_base, expiry_date, created_by)
    values
      (p_workspace_id, p_to_location_id, p_variant_id, 'transfer', v_leg.batch_id,
       v_leg.qty_base, v_leg.unit_cost_net_per_base, v_leg.expiry_date, p_created_by)
    returning id into v_dest;

    -- The pair. transfer_group_id is on both legs and is what makes them one
    -- movement of stock rather than a loss at one store and a windfall at the
    -- other; a transfer has no document table (§2.4).
    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, transfer_group_id, occurred_at, created_by)
    values
      (p_workspace_id, p_from_location_id, v_leg.batch_id, p_variant_id,
       'transfer_out', -v_leg.qty_base, v_leg.unit_cost_net_per_base,
       p_transfer_group_id, p_occurred_at, p_created_by),
      (p_workspace_id, p_to_location_id, v_dest, p_variant_id,
       'transfer_in', v_leg.qty_base, v_leg.unit_cost_net_per_base,
       p_transfer_group_id, p_occurred_at, p_created_by);

    v_row := row(v_leg.batch_id, v_dest, v_leg.qty_base,
                 v_leg.unit_cost_net_per_base, v_leg.expiry_date)
             ::public.transfer_allocation;
    return next v_row;
  end loop;

  return;
end;
$$;

comment on function public.allocate_transfer(uuid, uuid, uuid, uuid, numeric, uuid, timestamptz, uuid) is
  'The paired transfer write 0004 fixed the shape of: FEFO-allocated negative '
  'movements at the origin, one new batch per origin lot at the destination '
  'carrying cost and expiry forward, positive movements against them. Never '
  'updates stock_batch.location_id. ADR-035 §2.4.';


-- ----------------------------------------------------------------------------
-- 4. Grants  (ADR-035 §2.6, §2.7)
-- ----------------------------------------------------------------------------
-- NO ROLE HOLDS EXECUTE ON EITHER FUNCTION, and that is the design. They are
-- ledger primitives: the 0006 RPCs call them from inside their own security
-- definer bodies, where grants are not consulted, and the seed calls them as
-- postgres. An authenticated session that could call allocate_fefo directly could
-- allocate stock at a location it has no access to, because the check that would
-- stop it lives in the caller (see THE WALL at the top of this file).
--
-- They are `security definer` all the same. The definer bit is not what keeps
-- them off the client surface — the absent grant is — but it is what lets 0006
-- call them without depending on the invoking role, and it matches
-- rebuild_batch_balance() and batch_balance_violations() in 0004.

revoke all on function public.allocate_fefo(uuid, uuid, uuid, numeric, uuid)
  from public, anon, authenticated;
revoke all on function public.allocate_transfer(uuid, uuid, uuid, uuid, numeric, uuid, timestamptz, uuid)
  from public, anon, authenticated;
