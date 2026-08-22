-- ============================================================================
-- 0014 — What NEVER started selling: the velocity spine reads the stock ledger
-- ============================================================================
-- ADR-035 §2.9 (analytics — and the "one catalog per workspace" decision settled
-- 2026-08-14), §2.4 (the ledger), §2.7 (access), §2.3 (data model)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * product_velocity_daily — `create or replace`, one new CTE and one new column
--
-- No table, no policy, no function, no new grant. Nothing here is append-only.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THIS FIXES 2.3'S FINDING, AND IT DOES SO WITHOUT THE COLUMN 2.3 ASKED FOR.
-- THE ADR WAS RIGHT AND THE FINDING OVERSTATED THE FIX.
-- ----------------------------------------------------------------------------
-- `0013` reported that a product delivered to a store and never once sold there is
-- invisible to "what stopped selling" — 71 (store, product) pairs in the seed —
-- because the day spine starts at the first day the pair appeared on a TICKET.
-- `0013`'s header and docs/PLAN.md both concluded that the honest fix was a new
-- fact nobody records: a per-(location, variant) "carried from" date, i.e. a new
-- table, append-only, and the expensive half.
--
-- ⚠️ THAT CONCLUSION WAS WRONG, and ADR-035 §2.9 says why in a decision settled on
-- 2026-08-14, before any of this was built:
--
--     "One catalog per workspace, shared across locations. Two stores under one
--      owner carrying different goods is a merchandising difference, not a catalog
--      difference — and STOCK IS ALREADY PER LOCATION, WHICH COVERS 'we don't
--      carry that here' WITHOUT SPLITTING ANYTHING."
--
-- A per-location assortment table was considered and rejected there, on exactly
-- the grounds that make it unnecessary here. `stock_batch` (0004) carries
-- `location_id`, `variant_id` and `received_at`, and its `origin` spans
-- `purchase`, `transfer` and `adjustment` — so "the earliest moment this store
-- held this product" is already a fact in the ledger, whatever route the goods
-- took. The gap was in `0013`'s query, not in the schema.
--
-- Measured over the seed rather than argued: folding stock evidence into the spine
-- start leaves **0 of the 71** pairs invisible, and it picks up the one pair that
-- sold goods it was never delivered — the transfer case `0013` named as the reason
-- `purchase_line` alone would not have been enough either.
--
-- ----------------------------------------------------------------------------
-- WHY `batch_balance` AND NOT `stock_batch`
-- ----------------------------------------------------------------------------
-- This was `0013`'s other objection to widening the spine, and it is a real one:
-- `stock_batch` is COST-GATED (0004), so reading it would drag manager-only data
-- into a view that is otherwise entirely member-level, and a cashier and a manager
-- would then see different numbers of rows for the same store.
--
-- `batch_balance` is the same fact without that problem. It is the projection 0004
-- maintains beside the batches, it carries `(workspace_id, location_id,
-- variant_id, received_at)` — no cost column at all — and its policy is
--
--     workspace_id in (select my_workspaces()) and location_id in (select my_locations())
--
-- which is CHARACTER FOR CHARACTER `sale_line_select`'s predicate. So the view
-- stays member-level, the access story in `0013`'s header is unchanged, and the
-- cashier's rows remain exactly the manager's rows for that store. Asserted.
--
-- ⚠️ IT IS A PROJECTION, AND THAT IS ONLY SAFE BECAUSE 1.7 MADE IT SO. Reading a
-- derived table where a ledger exists is normally the wrong instinct. It is
-- defensible here because `supabase/checks/seed_invariant.sql` asserts on every CI
-- run that the projection agrees with `stock_movement` across all four seed files
-- and can be thrown away and rebuilt from the ledger alone. `0014`'s own checks add
-- the narrower claim this view actually depends on: `batch_balance` and
-- `stock_batch` agree, both directions, on the exact
-- `(workspace, location, variant, received_at)` set the spine reads. If the
-- projection ever drifts, the spine goes red rather than quietly shortening.
--
-- ----------------------------------------------------------------------------
-- THE SPINE START ONLY EVER MOVES EARLIER, WHICH IS WHY THIS IS SAFE
-- ----------------------------------------------------------------------------
-- `least(first sale day, first stock day)`, not "stock day instead of sale day".
-- Over the seed the stock evidence is earlier for 397 pairs, the same day for 42,
-- and LATER for none — but `least` is not there because of that measurement. It is
-- there so that no row this view produces today can disappear tomorrow: a pair
-- whose ledger somehow shows a sale before any receipt keeps the spine the sale
-- already justified. A report losing rows is the failure that would be hardest to
-- notice, and `least` makes it impossible rather than unlikely. Asserted both ways.
--
-- ⚠️ WHAT IS STILL NOT RECORDED, AND IS A DIFFERENT QUESTION FROM THE ONE FIXED:
-- nothing says a store DELISTED a product. A pair stocked once and deliberately
-- dropped keeps generating silence rows until the store stops trading. That was
-- equally true before this migration — the spine has always ended at the store's
-- last trading day — so nothing regresses, but it is not fixed here and it is not
-- the same fact. "When did we start carrying this" is answerable from the ledger,
-- as this migration shows; "when did we decide to stop" is an intention, and the
-- ledger records events. **Owner's call**, and it is genuinely a new fact.
--
-- ⚠️ AND ONE BOUND, PINNED: 3 (store, product) pairs in the seed were stocked AFTER
-- their store's last recorded selling day, so their spine start is later than its
-- end and `generate_series` yields nothing. They gain no rows. That is correct —
-- there is no trading day on which to report them — but it is named and asserted
-- rather than left to be discovered as a missing row.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- The view, replaced  (ADR-035 §2.9)
-- ----------------------------------------------------------------------------

create or replace view public.product_velocity_daily
with (security_invoker = true) as

-- Unchanged from 0013: what actually left the shelf, at the grain.
with sold as (
  select sl.workspace_id,
         sl.location_id,
         sl.variant_id,
         (s.occurred_at at time zone l.timezone)::date as day,

         sum(sl.qty_base) as qty_base_sold,
         sum(sl.line_net) as revenue_net,
         count(*)         as line_count

    from public.sale_line sl
    join public.sale s
      on  s.id           = sl.sale_id
      and s.workspace_id = sl.workspace_id
      and s.location_id  = sl.location_id
    join public.location l
      on  l.id           = sl.location_id
      and l.workspace_id = sl.workspace_id
   group by 1, 2, 3, 4
),

-- Unchanged from 0013: the days the till rang at all, per store.
traded as (
  select workspace_id, location_id, day
    from sold
   group by 1, 2, 3
),

-- ⚠️ NEW IN 0014. The earliest day this store is known to have HELD this product,
-- whatever route it arrived by — `stock_batch.origin` spans purchase, transfer and
-- adjustment, so this is the whole answer and not the purchases half of it.
--
-- Read from `batch_balance` rather than `stock_batch` because the projection
-- carries no cost and its RLS predicate is `sale_line`'s. See the header.
stocked as (
  select bb.workspace_id,
         bb.location_id,
         bb.variant_id,
         min((bb.received_at at time zone l.timezone)::date) as first_stock_day

    from public.batch_balance bb
    join public.location l
      on  l.id           = bb.location_id
      and l.workspace_id = bb.workspace_id
   group by 1, 2, 3
),

-- ⚠️ WHERE EACH PAIR'S SPINE STARTS, NOW FROM BOTH LEDGERS. `full outer join` and
-- `least`, so a pair known only to the stock ledger gets a spine (this is the fix),
-- a pair known only to the sale ledger keeps the one it had, and a pair in both
-- takes the earlier — the spine start can only move backwards, never forwards.
carried as (
  select coalesce(s.workspace_id, k.workspace_id) as workspace_id,
         coalesce(s.location_id,  k.location_id)  as location_id,
         coalesce(s.variant_id,   k.variant_id)   as variant_id,
         least(coalesce(s.first_sale_day,  k.first_stock_day),
               coalesce(k.first_stock_day, s.first_sale_day)) as first_day

    from (select workspace_id, location_id, variant_id, min(day) as first_sale_day
            from sold group by 1, 2, 3) s

    full outer join stocked k
      on  k.workspace_id = s.workspace_id
      and k.location_id  = s.location_id
      and k.variant_id   = s.variant_id
),

-- Unchanged from 0013: the spine ends at the last day the STORE traded.
--
-- ⚠️ A pair whose first_day is LATER than its store's last trading day — stock that
-- arrived after the till stopped — yields no rows at all, because generate_series
-- of a backwards range is empty. 3 pairs in the seed, pinned in the checks.
open_until as (
  select workspace_id, location_id, max(day) as last_day
    from traded
   group by 1, 2
),

spine as (
  select c.workspace_id,
         c.location_id,
         c.variant_id,
         c.first_day,
         g::date as day
    from carried c
    join open_until o
      on  o.workspace_id = c.workspace_id
      and o.location_id  = c.location_id
   cross join lateral
         generate_series(c.first_day, o.last_day, interval '1 day') g
),

daily as (
  select sp.workspace_id,
         sp.location_id,
         sp.variant_id,
         sp.day,
         sp.first_day,

         coalesce(s.qty_base_sold, 0) as qty_base_sold,
         coalesce(s.revenue_net,   0) as revenue_net,
         coalesce(s.line_count,    0) as line_count,

         (t.day is not null)          as store_traded

    from spine sp
    left join sold s
      on  s.workspace_id = sp.workspace_id
      and s.location_id  = sp.location_id
      and s.variant_id   = sp.variant_id
      and s.day          = sp.day
    left join traded t
      on  t.workspace_id = sp.workspace_id
      and t.location_id  = sp.location_id
      and t.day          = sp.day
)

select d.workspace_id,
       d.location_id,
       d.variant_id,
       d.day,

       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,

       d.qty_base_sold,
       d.revenue_net,
       d.line_count,
       d.store_traded,

       sum(d.qty_base_sold) over w                          as trailing_qty_base,
       sum(d.revenue_net)   over w                          as trailing_revenue_net,
       count(*)             over w                          as trailing_days,
       count(*) filter (where d.store_traded)      over w    as trailing_traded_days,
       count(*) filter (where d.qty_base_sold > 0) over w    as trailing_sold_days,

       d.day - (max(d.day) filter (where d.qty_base_sold > 0)
                over (partition by d.workspace_id, d.location_id, d.variant_id
                      order by d.day
                      rows between unbounded preceding and current row))
         as days_since_last_sale,

       -- ⚠️ NEW IN 0014, AND IT IS WHAT MAKES THE ROWS 0014 ADDS INTO AN ANSWER.
       -- Days this store has been known to hold this product, as of this row. On
       -- its own it is unremarkable; read beside a NULL `days_since_last_sale` it
       -- is the sentence the owner could not previously be told — "this has been on
       -- your shelf for 63 days and has never once sold". Rolls up as a MAX, like
       -- `days_since_last_sale` rolls up as a MIN; it is an age, not a measure.
       (d.day - d.first_day) as days_carried

  from daily d

  join public.product_variant v
    on  v.id           = d.variant_id
    and v.workspace_id = d.workspace_id
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id

window w as (partition by d.workspace_id, d.location_id, d.variant_id
             order by d.day
             range between interval '28 days' preceding
                       and interval  '1 day'  preceding);


-- ----------------------------------------------------------------------------
-- The comments this changes  (`create or replace view` keeps the rest)
-- ----------------------------------------------------------------------------

comment on view public.product_velocity_daily is
  'ADR-035 §2.9 question 3 — what stopped selling, and since 0014 what never '
  'started. Units and takings per store per product per day, on a GENERATED day '
  'spine that begins the day the store is first known to have HELD the product '
  '(sale ledger or stock ledger, whichever is earlier), beside the same measures '
  'over the trailing 28 days. It does not divide: trailing_days and '
  'trailing_traded_days are both defensible denominators and they differ by 17.9% '
  'at a store that shut for five days, so the caller picks one. Every MEASURE is '
  'additive across a location rollup; store_traded rolls up as bool_or, '
  'days_since_last_sale as min and days_carried as max. See 0013 and 0014.';

comment on column public.product_velocity_daily.days_carried is
  'Days this store has been known to hold this product, as of this row — from the '
  'earlier of its first sale and its first stock receipt (0014). Beside a NULL '
  'days_since_last_sale it names a product that has never sold here at all, which '
  'is the case 0013 could not see. An age, not a measure: rolls up as a MAX.';

comment on column public.product_velocity_daily.days_since_last_sale is
  'Calendar days since this product last moved at this store; 0 on a day it sold. '
  'NULL means it has never had a day of positive net movement here — not that the '
  'answer is missing, and since 0014 that includes stock that has never sold at '
  'all. Counts across store closures, so read it with store_traded.';


-- ----------------------------------------------------------------------------
-- Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- Unchanged, and deliberately so. `batch_balance_select` is
-- `workspace_id in (select my_workspaces()) and location_id in (select my_locations())`,
-- which is `sale_line_select`'s predicate exactly, so the view stays member-level
-- and gains no manager-only reach. Reading `stock_batch` instead would have cost
-- that. No policy, no grant, no `has_role` — see the header of 0013.
