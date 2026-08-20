-- ============================================================================
-- 0011 — What am I throwing away: waste cost as a share of purchases, by product
-- ============================================================================
-- ADR-035 §2.9 (analytics), §3 step 2 (the design gate), §2.5 (units and money),
-- §2.7 (access), §2.8 (Desperdicio)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * product_waste_daily — one view, no table, no policy, no function
--
-- Not in this migration: gross margin by product (0009, applied), velocity against
-- a trailing average (plan task 2.3, 0012), the nightly materialised rollups and
-- the live partial-day union (§2.9, deferred), the RPCs (0006), the failure path
-- (0007).
--
-- ----------------------------------------------------------------------------
-- THE SHAPE, WHICH IS 0009'S SHAPE
-- ----------------------------------------------------------------------------
-- §2.9's second question. Same grain as 0009, same construction, two aggregates
-- over one grain joined once:
--
--     numerator     stock_movement where reason = 'waste'  →  waste
--     denominator   purchase_line                          →  purchase
--     ------------------------------------------------------------------------
--     the answer    full outer join on (workspace, location, variant, day)
--
-- ⚠️ AND THEN THE VIEW STOPS, WITHOUT DIVIDING. That is the one real difference
-- from 0009 and it is not a shortcut — see THE RATE IS NOT A COLUMN below.
--
-- ----------------------------------------------------------------------------
-- WHY THE NUMERATOR COMES FROM stock_movement AND NOT FROM waste_line
-- ----------------------------------------------------------------------------
-- Unlike `sale_line`, `waste_line` DOES carry a cost: `unit_cost_net_per_base`,
-- snapshotted at the moment of the write-off (0003). So this view had a genuine
-- choice that 0009 did not, and it takes the ledger. Three reasons, in order of
-- how much they matter:
--
--   1. THE TWO ANALYTICS VIEWS MUST AGREE ON WHAT A PESO OF COST IS. 0009's COGS
--      is `-qty_base × unit_cost_net_per_base` over sale movements. Waste cost and
--      COGS are the two halves of "what did the stock that left this shelf cost
--      us", and somebody will add them. If one half is read off the ledger and the
--      other off a document, the sum reconciles against neither.
--
--   2. THE LINE'S COST IS AN AVERAGE, AND THE LEDGER'S IS NOT. A write-off can
--      span lots bought at different prices; `waste_line` is one row per variant,
--      so its cost is the quantity-weighted mean of what the allocator actually
--      took, rounded to `numeric(14,6)`. The movements carry the per-lot cost
--      exactly. Over the seed the two differ by 0.00011 pesos in total — small
--      enough to prove the snapshot is honestly derived, and large enough to prove
--      it is not the same number.
--
--   3. It is the same rule 0004 states for `stock_movement.unit_cost_net_per_base`
--      in the first place: cost is snapshotted onto the movement so history cannot
--      be re-costed, and nothing here joins to the batch.
--
-- The check file reconciles the two against each other rather than taking this on
-- faith, and pins the drift, so the day the document and the ledger diverge by a
-- centavo somebody reads this comment.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS VIEW DELIBERATELY DOES NOT CARRY
-- ----------------------------------------------------------------------------
-- ⚠️ `waste_reason`, AND THE REASON IS A FAN-OUT, NOT AN OVERSIGHT. §2.8 makes
-- "what are we losing, and why" the asset Desperdicio feeds, and `reason` is a
-- closed vocabulary on `waste_line` precisely so that question is answerable. It
-- is not answerable HERE: putting `reason` in the grain fans the DENOMINATOR out
-- across five reasons, so every peso of purchases would be counted five times and
-- the share would be five shares of the same money. A reason breakdown is a second
-- view over `waste_line` alone, with no denominator — it belongs with the
-- Desperdicio screen (step 6), and it is a different question with a different
-- shape. Nothing in the schema is missing for it.
--
-- ⚠️ THE RETAIL VALUE OF THE LOSS. `waste_line.line_net` holds what the shop
-- failed to EARN; this view holds what the loss COST. 0003 keeps them in separate
-- columns exactly so one is never quietly reported as the other, and adding retail
-- here would need a third aggregate to buy a number §2.9 did not ask for. The
-- member-readable `waste` header already carries it per document.
--
-- ⚠️ A WASTE DOCUMENT WHOSE LINES MOVED NO STOCK IS INVISIBLE TO THIS VIEW,
-- because the view reads movements. That failure is real — it is a write-off that
-- recorded a loss and did not take it off the shelf — but it is a claim about
-- `waste_line` against `stock_movement`, not about waste against purchases, and
-- buying it would cost a third aggregate. The check file makes it independently,
-- the seed asserts it (20_consumption.sql), and 0006's `record_waste` is where it
-- becomes structural.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE RATE IS NOT A COLUMN, AND THAT IS THE FINDING OF THIS TASK
-- ----------------------------------------------------------------------------
-- 0009 ships `margin_rate` on the row. This ships no rate at all, and the
-- difference is not a matter of taste — it is a fact about when the two documents
-- meet.
--
-- A sale's revenue and that sale's cost are the SAME EVENT: they land on one
-- document, on one day, always. So a day-grain margin rate is a real number on
-- every row that has revenue.
--
-- Waste and the purchase it should be measured against are DIFFERENT DOCUMENTS ON
-- DIFFERENT DAYS, and usually weeks apart: stock is delivered, sits, and is thrown
-- out. Over the seed, 136 of 137 day-grain waste buckets have no purchase of that
-- variant at that store on that day. A row-level rate would therefore be null in
-- 99.3% of the rows that have any waste in them, and the 0.7% that were not null
-- would be a coincidence of scheduling rather than a measurement.
--
-- So the view carries an additive NUMERATOR and an additive DENOMINATOR and lets
-- the caller divide once, at the window they actually asked about — which is what
-- §2.9 means by "as % of purchases" and what plan task 2.2 means by "purchases in
-- the same window". Ratios do not add; pesos do.
--
--     -- "what am I throwing away", consolidated, this month
--     select variant_name,
--            sum(waste_cost_net) as wasted,
--            sum(purchases_net)  as bought,
--            case when sum(purchases_net) > 0
--                 then sum(waste_cost_net) / sum(purchases_net) end as share
--       from product_waste_daily
--      where day >= date_trunc('month', current_date)
--      group by variant_name
--      order by wasted desc;
--
--     -- the drill-down: one store
--     ... and location_id = $1
--
-- ⚠️ THE GUARD IS `> 0`, NOT `nullif(..., 0)`, AND THE SEED PROVES WHY. Plan task
-- 2.2 anticipated one division by zero — a product wasted in a window it was not
-- bought in. There are THREE, and only the first is a zero:
--
--   * NEVER BOUGHT IN THE WINDOW. `purchases_net` is null and `purchase_line_count`
--     is 0. 40 of the seed's 92 month-grain waste buckets. Renders as "—".
--
--   * BOUGHT AND VOIDED INSIDE THE WINDOW. `purchases_net` is exactly 0 while
--     `purchase_line_count` is 2 — a delivery and the document that cancelled it.
--     11 such buckets in the seed at month grain. This is the case `nullif` was
--     written for, and it is NOT the same as never having bought: the shop did
--     order the goods. The counts are what tell them apart, which is why they are
--     columns.
--
--   * BOUGHT BEFORE THE WINDOW, VOIDED INSIDE IT. `purchases_net` is NEGATIVE —
--     the void's negated lines land in this window and the delivery they cancel
--     does not. One bucket in the seed: Cebolla blanca at Centro in June 2026, at
--     −270.43. `nullif(x, 0)` passes this straight through and the report prints a
--     NEGATIVE waste percentage, which reads as un-wasting onions. `> 0` is the
--     guard that survives all three.
--
-- ----------------------------------------------------------------------------
-- THE THREE THINGS THE ADR ASKED OF 0009, ASKED AGAIN HERE
-- ----------------------------------------------------------------------------
--   * REVERSALS need no exclusion, for 0009's reason: a void is a negated document
--     (0003) and both sides of this view are sums. It bites harder here, though —
--     see the day-grain note below.
--
--   * UNIT CONVERSION does not appear. §2.5 normalised at write time, so a product
--     bought by the kilo and thrown out in grams is grams on both sides and pesos
--     on both sides.
--
--   * THE LOCATION ROLLUP is a `group by` the caller drops. ⚠️ With one caveat
--     0009 does not have: TRANSFERRED STOCK IS BOUGHT AT ONE STORE AND CAN BE
--     WASTED AT ANOTHER (§2.4's paired movements, 0005). Per store, that inflates
--     the destination's share and deflates the origin's; consolidated, it is
--     exact. The seed cannot show this — every variant wasted at the Mercado stall
--     was also delivered there — so it is written down rather than asserted, and
--     the check pins the bound so the day it stops being true it goes red.
--
-- ----------------------------------------------------------------------------
-- THE DAY BOUNDARY IS THE SAME HARDCODED CONSTANT AS 0009
-- ----------------------------------------------------------------------------
-- `America/Mexico_City`, for 0009's reasons and with 0009's caveat: no table
-- records a shop's timezone, a column is append-only and a view is
-- `create or replace`, so the constant is the reversible half. ⚠️ It is cheap only
-- until a materialised rollup is keyed on `day`. Sonora and Baja California are
-- UTC−7 and UTC−8 against this constant's UTC−6.
--
-- ⚠️ TWO CONSTANTS NOW SAY THE SAME THING IN TWO FILES, and they must not drift.
-- When `location.timezone` lands, both views change together or the margin report
-- and the waste report start bucketing the same shop's days differently.
--
-- ⚠️ AND UNLIKE 0009, THE DAY GRAIN HERE IS LOAD-BEARING FOR VOIDS. Every void in
-- the seed's sale data lands minutes after its original, on the same local day, so
-- 0009's buckets never see half a cancellation. Not here: all four voids that
-- touch this view land on a LATER local day than the document they cancel — up to
-- nine days later. A window that contains the void and not the delivery therefore
-- shows negative purchases, and a window that contains the delivery and not the
-- void shows a delivery that no longer stands. That is not a defect in the view;
-- it is what an append-only ledger means, and the guard above is how a report
-- renders it honestly.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The view  (ADR-035 §2.9)
-- ----------------------------------------------------------------------------

create view public.product_waste_daily
with (security_invoker = true) as

with wasted as (
  -- THE DAY COMES FROM THE `waste` DOCUMENT, not from the movement, for the reason
  -- 0009 gives at length: it makes "the loss and its cost land in one bucket" a
  -- structural fact rather than a convention every future writer must honour. The
  -- two are equal today and 0010 exists because an allocator once confused the
  -- moment a thing happened with the moment it was written.
  select m.workspace_id,
         m.location_id,
         m.variant_id,
         (w.occurred_at at time zone 'America/Mexico_City')::date as day,

         -- NEGATED, BECAUSE THE LEDGER IS SIGNED. A waste movement is negative
         -- (0004's sign-follows-reason CHECK), so `-qty` is a positive loss and a
         -- void's compensating movement — positive, same reason,
         -- `reversal_of_movement_id` set — subtracts itself back out.
         sum(-m.qty_base)                            as waste_qty_base,
         sum(-m.qty_base * m.unit_cost_net_per_base) as waste_cost_net,
         count(*)                                    as waste_movement_count

    from public.stock_movement m
    join public.waste w
      on  w.id           = m.waste_id
      and w.workspace_id = m.workspace_id
      and w.location_id  = m.location_id
   where m.reason = 'waste'
   group by 1, 2, 3, 4
),

bought as (
  -- The denominator, per §2.9: what this product cost the shop in the same window
  -- and at the same store. NET of tax, on both sides of the eventual division —
  -- IVA on a delivery is recoverable and never was the cost of the goods, and
  -- 0009 measures margin net for the same reason. A share of gross would be
  -- systematically flattering by up to 16%.
  select pl.workspace_id,
         pl.location_id,
         pl.variant_id,
         (p.occurred_at at time zone 'America/Mexico_City')::date as day,

         sum(pl.qty_base) as purchases_qty_base,
         sum(pl.line_net) as purchases_net,
         count(*)         as purchase_line_count

    from public.purchase_line pl
    join public.purchase p
      on  p.id           = pl.purchase_id
      and p.workspace_id = pl.workspace_id
      and p.location_id  = pl.location_id
   group by 1, 2, 3, 4
)

select coalesce(w.workspace_id, b.workspace_id) as workspace_id,
       coalesce(w.location_id,  b.location_id)  as location_id,
       coalesce(w.variant_id,   b.variant_id)   as variant_id,
       coalesce(w.day,          b.day)          as day,

       -- Joined from the catalog, not snapshotted, for 0009's reason: a renamed
       -- product is renamed in last month's report too. Money is snapshotted on
       -- the movement and on the line and never moves; names are not money.
       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,

       -- ⚠️ COALESCED TO ZERO ON BOTH SIDES, AND THE COUNTS ARE WHAT MAKE THAT
       -- SAFE. A null would vanish inside the `sum()` that every rollup performs;
       -- a zero is additive and honest. But a zero denominator then has two
       -- meanings — "no delivery" and "a delivery that was cancelled" — and only
       -- `purchase_line_count` separates them. That is why the counts are columns
       -- and not a debugging aid.
       --
       -- This is deliberately NOT 0009's `cost_attributed` boolean. There, a
       -- bucket with no cost movement is a DEFECT and must be false nowhere, so
       -- `bool_and` is the right shape. Here a bucket with no purchase is ORDINARY
       -- — it is 136 of the seed's 137 — so a boolean would carry no signal and
       -- would not survive a rollup anyway. A count answers both questions and
       -- adds up.
       coalesce(w.waste_qty_base,       0) as waste_qty_base,
       coalesce(w.waste_cost_net,       0) as waste_cost_net,
       coalesce(w.waste_movement_count, 0) as waste_movement_count,

       coalesce(b.purchases_qty_base,   0) as purchases_qty_base,
       coalesce(b.purchases_net,        0) as purchases_net,
       coalesce(b.purchase_line_count,  0) as purchase_line_count

  from wasted w

  -- FULL OUTER, and here — unlike 0009 — it is doing visible work rather than
  -- standing guard against a failure the seed never produces. An inner join would
  -- silently drop 136 of the seed's 137 waste buckets, because deliveries and
  -- write-offs of the same product almost never share a day. Each side alone means
  -- something a reader wants: waste with no purchase that day is the ordinary
  -- case, and purchase with no waste that day is a product that behaved.
  full outer join bought b
    on  b.workspace_id = w.workspace_id
    and b.location_id  = w.location_id
    and b.variant_id   = w.variant_id
    and b.day          = w.day

  join public.product_variant v
    on  v.id           = coalesce(w.variant_id,   b.variant_id)
    and v.workspace_id = coalesce(w.workspace_id, b.workspace_id)
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id;

-- ⚠️ NO `has_role` PREDICATE, AND THAT IS A DECISION, NOT AN OMISSION. 0009 states
-- one because it joins member-level revenue (`sale`, `sale_line`) to manager-only
-- cost (`stock_movement`), so `security_invoker` inheritance fails OPEN: a cashier
-- would read every revenue row, no cost rows, and be told the shop's margin equals
-- its revenue.
--
-- Both aggregates here are gated at the source. `stock_movement` and
-- `purchase_line` are manager-and-above (0004 §9, 0003 §6), so a cashier reads
-- zero rows from BOTH sides and the full outer join of two empty sets is empty.
-- Inheritance fails CLOSED, which is 0008's situation and 0008's correct answer:
-- do not restate a predicate RLS already supplies.
--
-- The `waste` header IS member-level — it carries retail value, not cost — but it
-- is joined to the movements, never read alone, so it widens nothing: an inner
-- join against zero movement rows is zero rows.
--
-- This was checked rather than assumed. The check file asserts a cashier reads
-- zero, and asserts the reason by reading both base tables as that cashier — so if
-- a future migration relaxes either policy, the gate this view does not have
-- becomes a gate it needs, and the check goes red.


comment on view public.product_waste_daily is
  'Waste cost against purchases by product per store per day (ADR-035 §2.9). Cost '
  'from the waste movements that consumed the lots, so the loss is valued at what '
  'those lots cost; purchases from purchase_line, net of tax. It carries the '
  'numerator and the denominator and does NOT divide: waste and the delivery it '
  'should be measured against are different documents days apart, so the ratio is '
  'a property of the caller''s window, not of a row. Divide once, guarded on '
  '`sum(purchases_net) > 0` — see the header of 0011 for the three ways that '
  'denominator fails. Voids need no exclusion: a void is a negated document and '
  'cancels itself in the sum. Consolidated is the default (drop location_id from '
  'the group by); per location is the drill-down. Manager-and-above, by '
  'inheritance from stock_movement and purchase_line rather than by a predicate '
  'here.';

comment on column public.product_waste_daily.day is
  'Trading day in America/Mexico_City, taken from the waste or purchase document. '
  'Hardcoded because no table records a shop timezone yet; 0009 carries the same '
  'constant and the two must move together. See the header of 0011.';
comment on column public.product_waste_daily.waste_cost_net is
  'What the wasted units cost, from stock_movement and not from '
  'waste_line.unit_cost_net_per_base — the line''s cost is a quantity-weighted '
  'average over the lots, the ledger''s is exact, and this must be on the same '
  'basis as 0009''s cogs_net. Unrounded: round once, at the edge.';
comment on column public.product_waste_daily.purchases_net is
  'What this product cost the shop that day at that store, net of tax, net of '
  'voids. Zero when a delivery was cancelled; null-free by coalesce, so read '
  'purchase_line_count to tell "never bought" from "bought and voided". Can be '
  'NEGATIVE in a window that holds a void whose delivery is outside it.';
comment on column public.product_waste_daily.purchase_line_count is
  'Delivery lines in the bucket, voids included. The column that makes a zero '
  'denominator readable: 0 is "never bought", 2 is "bought and cancelled".';
comment on column public.product_waste_daily.waste_movement_count is
  'Waste movements in the bucket, compensating movements included. Carried because '
  'a sum-only reconciliation cannot see a dropped document — a void and its '
  'original sum to zero whether both are counted or neither is.';


-- ----------------------------------------------------------------------------
-- 2. Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- `security_invoker = true`, as §2.7 fixes for every view. Row visibility is RLS's
-- and nothing here adds to it: `my_locations()` is fail-closed and excludes
-- inactive stores, so deactivating a location retires its history from this view
-- exactly as it does from `stock_movement` itself — the same consequence 0009
-- records.

grant select on public.product_waste_daily to authenticated;
