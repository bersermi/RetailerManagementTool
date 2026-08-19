-- ============================================================================
-- 0010 — Two corrections the seed found: allocator time, and a uuid tiebreak
-- ============================================================================
-- ADR-035 §2.3 (two kinds of price), §2.4 (the ledger), §2.6 (offline writes)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * allocate_fefo()          — replaced; takes p_occurred_at and stamps the
--                                shortfall lot with it
--   * allocate_transfer()      — replaced; stamps the destination lot with the
--                                p_occurred_at it already took
--   * provider_price_memory    — replaced; the last tiebreak is data, not a uuid
--
-- No table, no policy, no new grant. Nothing here changes a shape; all three
-- objects keep the columns and the meaning they had.
--
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS, AND WHY IT IS NOT `0006`
-- ----------------------------------------------------------------------------
-- Both defects were found by the seed, three tasks after the migrations that
-- carry them, and neither was patched where it was found: the seed must not work
-- around the objects it exists to exercise, and `0005` and `0008` are applied and
-- therefore closed (supabase/README.md, "Migrations are append-only once
-- applied"). This is the fix-forward that rule prescribes.
--
-- `0006` (RPCs), `0007` (failure path) and `0009` (analytics) are reserved and
-- unwritten. Taking one of their numbers would renumber planned work to make a
-- correction look tidy, so this takes the next free one.
--
-- ⚠️ `0006` WILL APPLY BEFORE THIS FILE ON A FRESH RESET, AND MUST STILL BE
-- WRITTEN AGAINST THE SIX-ARGUMENT `allocate_fefo`. plpgsql does not resolve the
-- functions a body calls until the body runs, so `record_sale` created against
-- the five-argument version applies clean and then fails at the first till. There
-- is no five-argument version after this file; there is no compiler that will
-- tell you.
--
-- ----------------------------------------------------------------------------
-- ONE: A LOT OPENED BY AN ALLOCATOR WAS STAMPED WITH now()
-- ----------------------------------------------------------------------------
-- Neither allocator set `received_at` on a lot it opened, so the column default
-- applied. At a till this is invisible and correct — `occurred_at` IS now(). It
-- is wrong in exactly two places, and the second one is production:
--
--   1. BACKDATED HISTORY, which is how the 1.6b seed found it: it writes three
--      months backwards, and the transfer destination lots came out stamped the
--      day of the reset while their own movements were dated weeks earlier.
--   2. `recorded_offline`, WHICH IS A REAL PATH. `occurred_at` is accepted from
--      the client and clamped to [now() - 72h, now()] (§2.6). A transfer recorded
--      three days late opened a destination lot that sorts as received TODAY —
--      up to 72 hours after the truth. `received_at` is the second FEFO key, so
--      this reorders lots received within days of each other, which is precisely
--      the perishable case FEFO exists for.
--
-- `allocate_transfer` already took `p_occurred_at` and used it for all four
-- movements; it simply never gave it to the lot. That half is a one-line fix.
--
-- `allocate_fefo` had no notion of when at all, so it gains a parameter — and
-- **the parameter is REQUIRED, with no default.** A default of now() would keep
-- every existing call site compiling and would reproduce the defect the first
-- time someone wrote a caller that had a real `occurred_at` in hand and did not
-- think to pass it. That caller is `record_sale`, and it is the one being written
-- next. A required argument is the only version of this fix that cannot be
-- forgotten; the cost is that every call site had to be updated in this commit,
-- which is the point rather than the price.
--
-- Adding an argument is a DROP and a CREATE, not a replace: `create or replace
-- function` cannot change a signature, and adding a defaulted overload beside the
-- old one makes every five-argument call ambiguous. The drop is safe — no role
-- holds execute on it (`0005` §4), and plpgsql callers resolve at call time.
--
-- ----------------------------------------------------------------------------
-- TWO: THE PRICE MEMORY BROKE ITS TIE ON A uuid
-- ----------------------------------------------------------------------------
-- `0008` ordered by occurred_at desc, recorded_at desc, then `p.id desc, pl.id
-- desc`. The tail keys were added FOR determinism and did not deliver it, because
-- **an id is not data**:
--
--   * purchase price memory is workspace-wide (§2.3), and a merchant with two
--     stores on one delivery round has two documents from one provider at the
--     same hour, with recorded_at equal to occurred_at;
--   * so they tie on every key that is not an id, and `gen_random_uuid()` picks
--     the winner. In the 1.6 seed that was 14 (provider, variant) pairs: three
--     resets agreed on every count and every total in all four seed files and
--     disagreed on the sum of the prefills.
--
-- It was never a correctness bug — both tied rows are prices the shop genuinely
-- paid that morning — but the prefill was a coin flip, in production as much as
-- in the seed, where the ids are generated by the client at cart open.
--
-- THE FIX IS TO DECIDE THE PREFILL FROM THE PREFILL'S OWN CONTENT. Three keys go
-- in ahead of the ids, and they cover exactly what Comprar puts on the screen:
-- the price, the tax rate snapshotted beside it, and the denomination the
-- operator last typed. After them, two candidates can differ only in which
-- document they came from.
--
--   * `unit_price_net_per_base desc` is the one key here that expresses a
--     PREFERENCE and not merely an order. Offered the choice between two prices
--     paid the same morning, the view offers the HIGHER. A prefill is a number an
--     operator accepts without reading; quoting high overstates cost and
--     understates margin, and that is the safe direction to be wrong in. Quoting
--     low flatters the margin report, which is the direction nobody catches.
--   * `tax_rate desc` and `qty_display_unit` express no preference at all. They
--     are there so that everything the view hands back is a function of the data,
--     and their direction is arbitrary and fixed.
--
-- THE ID KEYS STAY, and they are still doing a job: `distinct on` needs a total
-- order or it returns an arbitrary row within a tie, and two deliveries can be
-- identical in every column above. What survives is a genuine and much smaller
-- ambiguity — WHICH DOCUMENT a price is attributed to when two carry the same
-- price. `last_purchase_id`, `last_location_id` and `last_purchased_at` are
-- informational (§2.3, "so a manager asking why is it offering me this can be
-- answered with a row"), and among identical candidates either row is a true
-- answer to that question. The PREFILL is now reproducible; its provenance, in
-- that narrow case, is still a pick.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. allocate_fefo()  (ADR-035 §2.4, §2.6)
-- ----------------------------------------------------------------------------
-- Dropped and recreated for the argument. The body is `0005`'s, unchanged except
-- for the new argument, its null check, and the `received_at` on the lot that
-- shortfall branch three opens.

drop function public.allocate_fefo(uuid, uuid, uuid, numeric, uuid);

create function public.allocate_fefo(
  p_workspace_id uuid,
  p_location_id  uuid,
  p_variant_id   uuid,
  p_qty_base     numeric,
  p_created_by   uuid,
  p_occurred_at  timestamptz
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
     or p_variant_id is null or p_created_by is null
     or p_occurred_at is null then
    raise exception 'allocate_fefo: workspace, location, variant, author and the '
                    'moment it happened are all required'
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
        -- received_at IS p_occurred_at AND NOT now(). The column defaults to
        -- now(), which is right at a till and wrong on every write whose event
        -- time is not the write time: `recorded_offline` accepts the client's
        -- clock and clamps it to [now() - 72h, now()] (§2.6), so a sale replayed
        -- three days late would open a lot that sorts as received today. That is
        -- the SECOND FEFO KEY, so it reorders lots received within days of each
        -- other — precisely the perishable case FEFO exists for. Found by the
        -- 1.6b seed, which writes three months backwards; fixed here.
        insert into public.stock_batch
          (workspace_id, location_id, variant_id, origin,
           qty_received_base, unit_cost_net_per_base, received_at, created_by)
        values
          (p_workspace_id, p_location_id, p_variant_id, 'adjustment',
           v_left, 0, p_occurred_at, p_created_by)
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
comment on function public.allocate_fefo(uuid, uuid, uuid, numeric, uuid, timestamptz) is
  'Which lots a withdrawal consumes, FEFO, within one location, and at what cost. '
  'Takes row locks on batch_balance that the CALLER''s transaction must hold until '
  'the movements are written. Allocates a shortfall rather than raising — v1 '
  'records stock, it does not enforce it. p_occurred_at is required and is what a '
  'shortfall lot is received at, because now() is wrong on every backdated or '
  'offline write. ADR-035 §2.4, §2.6.';


-- ----------------------------------------------------------------------------
-- 2. allocate_transfer()  (ADR-035 §2.4)
-- ----------------------------------------------------------------------------
-- A plain replace: the signature already carried the moment. Two changes — it is
-- passed down to allocate_fefo, and it lands on the destination lot.

create or replace function public.allocate_transfer(
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
                                       p_variant_id, p_qty_base, p_created_by,
                                       p_occurred_at)
  loop
    -- The new lot at the destination. Cost and expiry forward; location, provider
    -- and received_at are the destination's own.
    --
    -- received_at IS NOW p_occurred_at, WHICH IS STILL THE DESTINATION'S OWN. The
    -- reading above has not changed and is not being reversed: the origin lot's
    -- received_at is NOT carried forward, because store B genuinely received these
    -- goods when the transfer happened. What was wrong was WHEN that is — the
    -- column defaulted to now(), the moment of the write, while every one of the
    -- four movements below already used p_occurred_at. The function took the
    -- moment, used it four times, and did not give it to the lot.
    insert into public.stock_batch
      (workspace_id, location_id, variant_id, origin, source_batch_id,
       qty_received_base, unit_cost_net_per_base, expiry_date, received_at,
       created_by)
    values
      (p_workspace_id, p_to_location_id, p_variant_id, 'transfer', v_leg.batch_id,
       v_leg.qty_base, v_leg.unit_cost_net_per_base, v_leg.expiry_date,
       p_occurred_at, p_created_by)
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

-- ----------------------------------------------------------------------------
-- 3. Grants  (ADR-035 §2.6, §2.7)
-- ----------------------------------------------------------------------------
-- NO ROLE HOLDS EXECUTE, exactly as in `0005` — but a CREATEd function grants
-- EXECUTE to PUBLIC by default, and the drop above took the old revoke with it.
-- Re-issuing this is not tidiness: without it, `allocate_fefo` is the one ledger
-- primitive an authenticated session could call directly, and the check that
-- would stop it lives in the caller.
--
-- allocate_transfer was REPLACED and not dropped, so its grants are intact. It is
-- revoked again anyway, because a reader should not have to know which of the two
-- was replaced in order to know that neither is callable.

revoke all on function public.allocate_fefo(uuid, uuid, uuid, numeric, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.allocate_transfer(uuid, uuid, uuid, uuid, numeric, uuid, timestamptz, uuid)
  from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. provider_price_memory  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- `0008`'s view, replaced. Same columns in the same order — a replace cannot
-- change them and nothing here wants to. The two exclusions are untouched and
-- are still the whole point of the object; what changes is the tail of the sort.

create or replace view public.provider_price_memory
with (security_invoker = true) as
select distinct on (pl.workspace_id, p.provider_id, pl.variant_id)
       pl.workspace_id,
       p.provider_id,
       pl.variant_id,

       -- The prefill itself. Net, per BASE unit — the denomination the whole
       -- system normalises to (§2.5) — so a caller that wants "per caja" converts
       -- it the same way every other quantity is converted.
       pl.unit_price_net_per_base,

       -- Snapshotted on the line, not joined from product_variant. Same reason
       -- 0003 snapshots it: the rate on the variant is editable, and re-deriving
       -- would restate what the shop was quoted.
       pl.tax_rate,

       -- The denomination the operator actually typed last time. Comprar prefills
       -- the unit as well as the number, because "8.50" means nothing without it
       -- and re-picking `kg` on every delivery is the kind of friction that gets
       -- a tool abandoned.
       pl.qty_display_unit as last_qty_display_unit,

       -- When, and which document — so a manager asking "why is it offering me
       -- this?" can be answered with a row rather than an explanation.
       p.occurred_at       as last_purchased_at,
       p.location_id       as last_location_id,
       p.id                as last_purchase_id,
       pl.id               as last_purchase_line_id

  from public.purchase_line pl
  join public.purchase p
    on  p.id           = pl.purchase_id
    and p.workspace_id = pl.workspace_id
    and p.location_id  = pl.location_id

 -- Exclusion one: this document is itself a void.
 where p.reversal_of is null

 -- Exclusion two: this document HAS been voided. Served by
 -- purchase_one_reversal_idx, the partial unique index 0003 puts on reversal_of.
 --
 -- The subquery reads `purchase` under the caller's own RLS, which is safe here
 -- and would not be in general: a reversal carries the same workspace_id and
 -- location_id as the document it cancels (the composite reversal FK in 0003
 -- makes that structural), so a caller who can see the original can always see
 -- its void. There is no visibility gap in which the void is hidden and the dead
 -- price survives.
   and not exists (
         select 1
           from public.purchase r
          where r.reversal_of = p.id
       )

 -- A line that took stock back out. In practice these live only on reversal
 -- documents, already excluded above — but the 0003 CHECK permits a negative
 -- line on an ordinary document, and a negative line is a correction rather than
 -- a purchase. It is not what the shop pays for the goods, so it is not memory.
   and pl.qty_base > 0

 -- FOUR SORT KEYS, AND THE LAST THREE ARE ABOUT DETERMINISM, NOT ABOUT TIME.
 -- §2.3 names occurred_at alone, and it is not enough to pick a single row:
 -- occurred_at is server now() for the whole transaction, so two deliveries
 -- recorded together share it exactly, and one delivery may carry two lines for
 -- the same variant (a split case, a corrected quantity) which share it by
 -- construction. Without the tail keys the view returns an arbitrary one of them
 -- and can return a different one tomorrow, on unchanged data. The same argument
 -- that put batch_id third in allocate_fefo(): a tiebreak that is never exercised
 -- costs an incremental sort within ties, and its absence is a bug nobody can
 -- reproduce.
 -- SEVEN SORT KEYS. The first three are the DISTINCT ON. The next two are time,
 -- and §2.3 names only the first of them. The three after that are `0010`, and
 -- they are what makes the answer a function of the data: an id is not data, and
 -- the two id keys this file used to end on made the prefill a coin flip whenever
 -- one provider delivered to two of a merchant's stores on the same morning.
 --
 -- Price descending is the one key here that prefers rather than merely orders —
 -- offered two prices paid the same morning, the view offers the higher, because
 -- a prefill is accepted without being read and overstating cost is the safe
 -- direction to be wrong in. Tax rate and display unit express no preference;
 -- they are there so that everything handed back is decided by the data.
 --
 -- The id keys stay last and still earn their place: `distinct on` needs a total
 -- order, and two deliveries can agree on every column above. What is left
 -- arbitrary is which DOCUMENT an identical price is attributed to, and that is
 -- informational.
 order by pl.workspace_id, p.provider_id, pl.variant_id,
          p.occurred_at desc,
          p.recorded_at desc,
          pl.unit_price_net_per_base desc,
          pl.tax_rate                desc,
          pl.qty_display_unit        asc,
          p.id          desc,
          pl.id         desc;
comment on view public.provider_price_memory is
  'Last price paid per (workspace, provider, variant), derived from purchase_line '
  'rather than cached in a table, so it cannot drift from what was paid and it '
  'self-corrects after a void. Excludes BOTH reversal documents and the documents '
  'they reverse. No fallback across providers. The prefill is decided by the data '
  'and not by an id: of two deliveries at the same instant it offers the higher '
  'price. ADR-035 §2.3.';
