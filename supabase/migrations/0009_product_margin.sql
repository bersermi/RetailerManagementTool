-- ============================================================================
-- 0009 — What made me money: gross margin by product, net of tax
-- ============================================================================
-- ADR-035 §2.9 (analytics), §3 step 2 (the design gate), §2.5 (units and money),
-- §2.7 (access)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * product_margin_daily — one view, no table, no policy, no function
--
-- Not in this migration: waste as a share of purchases (plan task 2.2, 0011),
-- velocity against a trailing average (2.3, 0012), the nightly materialised
-- rollups and the live partial-day union (§2.9, deferred — see below), the RPCs
-- (0006) and the failure path (0007).
--
-- ----------------------------------------------------------------------------
-- THIS FILE IS THE DESIGN GATE, NOT A REPORT
-- ----------------------------------------------------------------------------
-- ADR-035 §3 step 2: "If margin-by-product needs a five-way join and a CTE to
-- survive reversals, unit conversion and a location rollup, the schema is wrong —
-- known in week two, before any screen."
--
-- So the shape of the query below is the evidence, and it is worth reading before
-- the columns. Two aggregates over one grain, joined once:
--
--     revenue   sale_line  →  sale                    (what the customer paid)
--     cost      stock_movement where reason = 'sale'  (what those units cost us)
--     ------------------------------------------------------------------------
--     margin    full outer join on (workspace, location, variant, day)
--
-- Everything else in this file is naming and access. The three things the ADR
-- feared would need a five-way join do not need one, and each for a reason that
-- was decided in an earlier migration rather than here:
--
--   * REVERSALS need no exclusion at all, and this is the opposite of 0008.
--     A void is a second document carrying negated lines and negated movements
--     (0003, and the seed's 30_reversals.sql). Margin is a SUM, so a void cancels
--     itself arithmetically the moment both documents are in range. 0008 had to
--     exclude both sides only because "the last price" is not a sum — it picks one
--     row, and a picked row cannot cancel. Nothing here picks a row.
--
--   * UNIT CONVERSION does not appear, because it already happened at write time.
--     §2.5 normalises every quantity to the variant's base unit and every price to
--     `numeric(14,6)` per base unit before it is stored. A product bought by `kg`
--     and sold by `100g` is grams on both sides of this join. The conversion the
--     ADR was worried about is a display concern (§2.5.4) and belongs at the edge.
--
--   * THE LOCATION ROLLUP is a `group by` the caller drops, because `location_id`
--     is a column and not a filter baked into the view. §2.9 wants consolidated by
--     default with a location filter, and both are the same query:
--
--         -- consolidated, this month, top ten
--         select variant_name, sum(revenue_net), sum(gross_margin)
--           from product_margin_daily
--          where day >= date_trunc('month', current_date)
--          group by variant_name order by 3 desc limit 10;
--
--         -- the drill-down: one store
--         ... and location_id = $1
--
--     No join is added and no column is dropped. That is the whole claim.
--
-- ----------------------------------------------------------------------------
-- WHY COST COMES FROM stock_movement AND NOT FROM sale_line
-- ----------------------------------------------------------------------------
-- `sale_line` knows what the customer paid. It does not know what the goods cost,
-- and it must not: the cost of a sale is the cost of the LOTS it consumed, which
-- FEFO decided at the till (0005). Two identical tickets a week apart have
-- different costs, because a delivery landed in between.
--
-- `stock_movement` carries `unit_cost_net_per_base` snapshotted from the batch at
-- write time (0004), which is what makes this attribution possible at all — and
-- what makes it stable: re-costing history is impossible because nothing here
-- joins to the batch.
--
-- The join key is therefore NOT sale_line.id. There is no `sale_line_id` on
-- `stock_movement`, deliberately: one line can be satisfied from three lots, so
-- the movement grain is (line × lot) and no column pairs them. The grain both
-- sides DO share is (workspace, location, variant, document) — a movement names
-- its `sale_id` and its `variant_id`, and so does a line. This view aggregates
-- both to (workspace, location, variant, day), which is the coarsest grain that
-- answers §2.9's question, and joins there.
--
-- ⚠️ A CONSEQUENCE WORTH KNOWING BEFORE step 5b: MARGIN PER TICKET LINE IS NOT
-- DERIVABLE, and nothing in this file makes it so. Per PRODUCT it is exact; per
-- ticket it is exact; per LINE it would need the allocation split persisted with a
-- line reference. §2.9 asks for by-product, so nothing is owed today — but if a
-- screen ever wants "this line earned you $4.20", that is a column on
-- stock_movement and a migration, not a query.
--
-- ----------------------------------------------------------------------------
-- THE DAY BOUNDARY IS HARDCODED TO America/Mexico_City, AND THAT IS A DECISION
-- ----------------------------------------------------------------------------
-- `occurred_at` is `timestamptz`; a day is a local fact. Bucketing in UTC would
-- push every sale after 18:00 into tomorrow, which for a shop that closes at 21:00
-- is roughly a fifth of the day's takings landing on the wrong date — silently,
-- and consistently enough to look plausible.
--
-- The schema has nowhere to record a shop's timezone: `location` has none and
-- `workspace_setting` has none. Adding one is an `alter table` this file could
-- have carried. It deliberately does not, because a column is append-only and a
-- view is `create or replace`: the reversible half is the constant, and the
-- default is right for every operator this product is being built for (§ the
-- premise of the whole ADR — small Mexican retailers, MXN, IVA).
--
-- ⚠️ THE DAY A CUSTOMER SIGNS IN SONORA OR BAJA CALIFORNIA, this constant is a
-- bug — those states are UTC−7 and UTC−8 all year while this is UTC−6. The fix is
-- `location.timezone`, defaulted to this value, and a `create or replace` here.
-- It is cheap for exactly as long as no materialised rollup is keyed on `day`;
-- once one is, changing the boundary restates history.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The view  (ADR-035 §2.9)
-- ----------------------------------------------------------------------------

create view public.product_margin_daily
with (security_invoker = true) as

with revenue as (
  -- WHY THE DAY COMES FROM THE DOCUMENT AND NOT FROM THE LINE. `sale_line` has no
  -- `occurred_at` of its own — only `created_at`, which is the write moment and
  -- not the trading moment. `recorded_offline` makes those differ by up to 72
  -- hours (supabase/README.md), and 0010 is the migration that exists because an
  -- allocator confused the two.
  select sl.workspace_id,
         sl.location_id,
         sl.variant_id,
         (s.occurred_at at time zone 'America/Mexico_City')::date as day,

         -- Net of voids: a reversal line carries negated qty (0003), so a ticket
         -- voided the same day contributes zero to both of these.
         sum(sl.qty_base)   as qty_base_sold,
         sum(sl.line_net)   as revenue_net,
         sum(sl.tax_amount) as tax_collected,
         count(*)           as line_count

    from public.sale_line sl
    join public.sale s
      on  s.id           = sl.sale_id
      and s.workspace_id = sl.workspace_id
      and s.location_id  = sl.location_id
   group by 1, 2, 3, 4
),

cost as (
  -- THE DAY COMES FROM `sale`, NOT FROM THE MOVEMENT, and the two are equal today.
  -- Taking it from the document is what GUARANTEES they stay equal: a sale's
  -- revenue and the cost of that same sale must land in one bucket or the report
  -- shows margin the shop never made on a day it did not trade. Reading
  -- `m.occurred_at` would leave that to a convention every future writer has to
  -- honour; joining `sale` makes it structural, at the price of one join.
  select m.workspace_id,
         m.location_id,
         m.variant_id,
         (s.occurred_at at time zone 'America/Mexico_City')::date as day,

         -- NEGATED, BECAUSE THE LEDGER IS SIGNED. A sale movement is negative
         -- (0004's sign-follows-reason CHECK), so `-qty × cost` is a positive cost
         -- of goods sold, and a void's compensating movement — positive, same
         -- reason, `reversal_of_movement_id` set — subtracts itself back out.
         -- That is why this needs no exclusion for reversals either.
         sum(-m.qty_base * m.unit_cost_net_per_base) as cogs_net,
         count(*)                                    as movement_count

    from public.stock_movement m
    join public.sale s
      on  s.id           = m.sale_id
      and s.workspace_id = m.workspace_id
      and s.location_id  = m.location_id
   where m.reason = 'sale'
   group by 1, 2, 3, 4
)

select coalesce(r.workspace_id, c.workspace_id) as workspace_id,
       coalesce(r.location_id,  c.location_id)  as location_id,
       coalesce(r.variant_id,   c.variant_id)   as variant_id,
       coalesce(r.day,          c.day)          as day,

       -- Names, joined from the catalog rather than snapshotted. A report reads in
       -- the product's CURRENT name — renaming "Coca 600" to "Coca-Cola 600 ml"
       -- renames it in last month's ranking too, which is what a person asking
       -- "what made me money" means. Money is snapshotted on the line (0003) and
       -- never moves; names are not money.
       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,

       coalesce(r.qty_base_sold, 0) as qty_base_sold,
       coalesce(r.revenue_net,   0) as revenue_net,
       coalesce(r.tax_collected, 0) as tax_collected,
       coalesce(c.cogs_net,      0) as cogs_net,

       coalesce(r.revenue_net, 0) - coalesce(c.cogs_net, 0) as gross_margin,

       -- Null and not zero when nothing was sold. A margin RATE on no revenue is
       -- undefined, and a zero would sort into the ranking as the worst product in
       -- the shop.
       case when coalesce(r.revenue_net, 0) <> 0
            then (coalesce(r.revenue_net, 0) - coalesce(c.cogs_net, 0))
                 / r.revenue_net
       end as margin_rate,

       -- ⚠️ THE HONESTY COLUMN. A bucket with revenue and no sale movements gets
       -- cogs_net = 0 above, which renders as 100% margin — the most flattering
       -- possible answer to the one question the business case rests on. That must
       -- never be indistinguishable from a genuinely free good.
       --
       -- It is a boolean rather than a null cogs_net on purpose: a consolidated
       -- `sum(cogs_net)` silently treats null as zero, so a null would hide in
       -- exactly the rollup §2.9 makes the default. `bool_and(cost_attributed)`
       -- does not hide.
       (c.movement_count is not null) as cost_attributed,

       coalesce(r.line_count, 0)     as line_count,
       coalesce(c.movement_count, 0) as movement_count

  from revenue r

  -- FULL OUTER, and each side means something different when it is missing.
  -- Revenue with no cost is the flattering failure above. Cost with no revenue is
  -- a sale movement whose document has no line for that variant — stock that left
  -- the shelf against a ticket that never charged for it. Neither should be
  -- possible; an inner join would make both invisible, and this view is the one
  -- place in the system positioned to notice.
  full outer join cost c
    on  c.workspace_id = r.workspace_id
    and c.location_id  = r.location_id
    and c.variant_id   = r.variant_id
    and c.day          = r.day

  join public.product_variant v
    on  v.id           = coalesce(r.variant_id,   c.variant_id)
    and v.workspace_id = coalesce(r.workspace_id, c.workspace_id)
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id

 -- ⚠️ THE ONE PLACE THIS FILE RESTATES A PREDICATE RLS WOULD OTHERWISE SUPPLY,
 -- AND 0008 EXPLICITLY REFUSED TO DO THE SAME THING. The difference is that 0008
 -- reads two tables that are BOTH manager-gated, so a staff caller gets zero rows
 -- and the inheritance is correct. This view reads a mix: `sale` and `sale_line`
 -- are member-level (§2.7 — a cashier must see their own till), `stock_movement`
 -- is manager-and-above because it carries cost.
 --
 -- Under `security_invoker` alone, a STAFF caller would therefore read every
 -- revenue row and NO cost rows — and this view would answer, in good faith, that
 -- the shop's margin equals its revenue. Inheritance fails OPEN here, which is why
 -- the gate is written down instead of inherited. A staff session gets zero rows,
 -- which is the same thing they get from `purchase` and from `provider_price_memory`.
 --
 -- THE SECOND HALF IS NOT A HOLE, IT IS THE SAME SENTENCE FROM THE OTHER SIDE.
 -- `row_security_active` is false exactly for the callers RLS does not filter:
 -- the superuser, and `service_role`, which carries BYPASSRLS. Both already read
 -- every cost row in the database, so gating them on `has_role` would not protect
 -- anything — it would only make the view lie to them, since `auth.uid()` is null
 -- in both and `has_role` is therefore false. Two things need that not to happen:
 -- §2.9's nightly materialised rollup, which is a scheduled `service_role` job and
 -- would otherwise materialise ZERO ROWS onto a dashboard nobody would question;
 -- and every check in supabase/checks/, which runs as the superuser.
 --
 -- Written as a property of the caller rather than as a list of role names on
 -- purpose: the claim is "if RLS is filtering you, you must hold manager", and a
 -- role name would have to be revisited every time the platform adds one.
 where public.has_role(coalesce(r.workspace_id, c.workspace_id), 'manager')
    or not row_security_active('public.stock_movement');


comment on view public.product_margin_daily is
  'Gross margin by product per store per day, net of tax (ADR-035 §2.9). Revenue '
  'from sale_line, cost from the sale movements that consumed the lots FEFO picked '
  '— so margin follows the batch actually sold, not the current purchase price. '
  'Voids need no exclusion: a reversal is a negated document and cancels itself in '
  'the sum. Consolidated is the default (drop location_id from the group by); per '
  'location is the drill-down. Manager-and-above.';

comment on column public.product_margin_daily.day is
  'Trading day in America/Mexico_City, taken from the sale document. Hardcoded '
  'because no table records a shop timezone yet; see the header of 0009.';
comment on column public.product_margin_daily.qty_base_sold is
  'Net units sold in the variant base unit (§2.5). Convert for display at the edge.';
comment on column public.product_margin_daily.cogs_net is
  'Cost of the lots consumed, net, unrounded. Report figures are not rounded here: '
  '§2.5''s per-line half-up rule governs what a customer is charged, and rounding a '
  'derived aggregate at every grain makes two correct rollups disagree by centavos. '
  'Round once, at the edge.';
comment on column public.product_margin_daily.margin_rate is
  'gross_margin / revenue_net, or null when there was no revenue. Never zero — a '
  'zero sorts as the worst product in the shop.';
comment on column public.product_margin_daily.cost_attributed is
  'False when a bucket has revenue but no sale movements, which would otherwise '
  'read as 100% margin. Roll up with bool_and(), which a null cogs_net would not '
  'survive.';


-- ----------------------------------------------------------------------------
-- 2. Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- `security_invoker = true`, as §2.7 fixes for every view. Row visibility is still
-- RLS's: `my_locations()` is fail-closed and excludes inactive stores, so
-- deactivating a location retires its history from this view exactly as it does
-- from `stock_movement` itself. That is consistent rather than convenient, and it
-- is worth knowing before someone closes a store and asks where last year went.
--
-- The `has_role(..., 'manager')` predicate in the view body is the exception
-- argued for above. It is not a substitute for RLS — every base table still
-- applies its own policies to the caller — it is a floor, because inheritance
-- across a mixed-visibility join produces a WRONG NUMBER rather than no rows.

grant select on public.product_margin_daily to authenticated;
