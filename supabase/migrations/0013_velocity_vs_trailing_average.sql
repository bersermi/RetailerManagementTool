-- ============================================================================
-- 0013 — What stopped selling: velocity against a trailing average
-- ============================================================================
-- ADR-035 §2.9 (analytics), §3 step 2 (the design gate), §2.5 (units and money),
-- §2.7 (access), §2.8 (Vender), §2.3 (workspace is the tenant, location is the store)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * product_velocity_daily — one view, no table, no policy, no function
--
-- Not in this migration: gross margin by product (0009, applied), waste as a share
-- of purchases (0011, applied), location.timezone (0012, applied), the nightly
-- materialised rollups and the live partial-day union (§2.9, deferred), the RPCs
-- (0006), the failure path (0007).
--
-- This is §2.9's THIRD question and the last piece of the ADR-035 §3 step 2 design
-- gate.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE ONE THING THE OTHER TWO DID NOT HAVE: THE ANSWER IS AN ABSENCE
-- ----------------------------------------------------------------------------
-- 0009 and 0011 both aggregate rows that exist. A day on which nothing was sold
-- and nothing was thrown away is simply not in either view, and that costs those
-- reports nothing: "what made me money" and "what am I throwing away" are
-- questions about events.
--
-- "What stopped selling" is not. The product the owner needs to be told about is
-- precisely the one with NO sale_line today — and a ledger, by construction, has
-- no row for a thing that did not happen. So this view cannot be an aggregate over
-- sale_line alone. It has to GENERATE the days and then report what did or did not
-- land on them. That is the day spine below, and it is the whole difference
-- between this migration and the two before it.
--
-- The consequence is a bigger view than its two siblings: over the seed, 2 263
-- sale lines become 24 268 rows, because 22 139 of them (91%) exist to say that
-- nothing happened. That density is not waste — it IS the answer — but it is
-- stated here rather than discovered later, because §2.9's deferred materialised
-- rollup will be materialising it.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THIS VIEW READS FIVE TABLES AND USES SIX CTEs, WHICH IS THE LITERAL SHAPE
-- ADR-035 §3 step 2 NAMES AS FAILURE — SO HERE IS THE DECOMPOSITION
-- ----------------------------------------------------------------------------
-- The gate's words are: "If margin-by-product needs a five-way join and a CTE to
-- survive REVERSALS, UNIT CONVERSION and a LOCATION ROLLUP, the schema is wrong."
--
-- Not one of those three is why anything here is complicated:
--
--   * REVERSALS still cancel by being summed. A void is a negated document (0003)
--     and every measure here is a sum, so nothing is excluded and no `not exists`
--     appears — 0009's finding, unchanged.
--   * UNIT CONVERSION still never appears. §2.5 did it at write time; `qty_base`
--     is comparable across a product bought by the kilo and sold by the gram.
--   * THE LOCATION ROLLUP is still a `group by` the caller drops. Every column
--     below is additive across locations for a fixed day, deliberately.
--
-- Of the five tables, `product_variant` and `product_family` are the name lookup
-- 0009 and 0011 also carry, and `location` is the timezone lookup 0012 gave all
-- three. Strip those and the measure is `sale_line → sale` — exactly 0009's
-- revenue leg, two tables, one join.
--
-- Everything else is the spine, and the spine is not a property of this schema. No
-- ledger design removes it, because no ledger can hold a row for a sale that did
-- not occur. ⚠️ THE VERDICT IS THEREFORE A PASS, and the sentence describing the
-- query is longer for a reason that is about the question and not about the model.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THE SCHEMA CANNOT ANSWER, AND THE COLUMN THAT WOULD FIX IT
-- ----------------------------------------------------------------------------
-- The spine starts at the first day a (store, product) pair appeared on a ticket,
-- because that is the earliest moment the SALE ledger can prove the store carried
-- the product. Nothing in this schema records when a store STARTED CARRYING one.
--
-- So a product that was delivered and never once sold has no spine, no row, and is
-- invisible to this report. Over the seed that is 71 (store, product) pairs —
-- asserted, not estimated, in supabase/checks/0013_velocity_vs_trailing_average.sql.
--
-- ⚠️ THIS IS THE ONE FINDING OF STEP 2 THAT IS ABOUT THE SCHEMA RATHER THAN ABOUT
-- A REPORT, and it is the owner's call. Three things about it:
--
--   1. §2.9 asks "what STOPPED selling", which presupposes it started. The
--      question as written IS answered. "What never started" is the adjacent
--      question, and it is arguably the more valuable one to a small retailer.
--   2. The cheap-looking fix is NOT to widen the spine with `purchase_line`. That
--      reads two MANAGER-GATED tables into a view that is otherwise entirely
--      member-level (see ACCESS below), it makes a cashier and a manager see
--      different numbers of rows for the same store, and it still misses stock
--      that arrived by TRANSFER rather than by delivery — 1 pair in this seed sold
--      goods it was never delivered.
--   3. The honest fix is a fact nobody records: a per-(location, variant) "carried
--      from" date. `price_list` is the near-miss — it is per location and dated —
--      but its `location_id` is NULLABLE for a workspace-wide price and its RLS is
--      workspace-scoped rather than `my_locations()`-scoped, so it answers "what
--      may this be sold for" and not "does this store stock it".
--
-- Flagged loudly and by name because it is a COLUMN, which is append-only and
-- therefore the expensive half, and because the seed will bake data against it.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE VIEW DOES NOT DIVIDE — 0011'S FINDING, REACHED BY A DIFFERENT ROAD
-- ----------------------------------------------------------------------------
-- §2.9 names the measure "velocity vs trailing average", and the obvious column is
-- a ratio of the two. It is not here, and the reason is not 0011's.
--
-- 0011 withheld its ratio because the numerator and the denominator are different
-- documents days apart, so the rate would be null in 99.3% of rows. Here both
-- numbers are on every row. The reason this view withholds the division is that
-- ⚠️ THERE ARE TWO DEFENSIBLE DENOMINATORS AND THE VIEW MUST NOT PICK ONE:
--
--   * `trailing_days`        — calendar days in the window. "Units per day."
--   * `trailing_traded_days` — of those, the days the store sold ANYTHING at all.
--                              "Units per day the till rang."
--
-- They are not a rounding apart. In this seed Doña Lupe Centro records no sale at
-- all for five consecutive days (2026-08-16 … 08-20); on 2026-08-21 every product
-- with a full window at that store has `trailing_days = 28` and
-- `trailing_traded_days = 23`. A trailing average over the first denominator is
-- 17.9% lower for every one of them, on a day nothing about any product changed. A
-- report that used it would announce that the whole catalogue slowed down over a
-- long weekend.
--
-- So the row carries the numerator and BOTH denominators, and the caller divides
-- once, at the window and by the convention they asked about. This is also what
-- keeps every MEASURE additive across a location rollup: pesos and units and day
-- counts add, and a velocity ratio does not — the same rule 0011 states, arrived
-- at from the other direction. Measured on the seed, at Centro on 2026-08-21:
--
--     avg() of the per-product rates      21.548254   ← what a report must not do
--     sum(qty) / sum(traded days)         16.508404
--     sum(qty) / sum(calendar days)       13.370757
--
-- Two of those three are defensible and the first is not, which is why the view
-- ships the inputs and no rate at all.
--
-- ⚠️ THE TWO NON-MEASURES ROLL UP DIFFERENTLY AND THAT IS SAID RATHER THAN LEFT TO
-- BE DISCOVERED: `store_traded` rolls up as a `bool_or` and `days_since_last_sale`
-- as a `min` — a product last sold 3 days ago at one store and 40 at another has
-- not been silent for 43 days anywhere. Summing either is meaningless.
--
-- ----------------------------------------------------------------------------
-- WHY 28 DAYS, AND WHY IT IS A CONSTANT AND NOT A COLUMN
-- ----------------------------------------------------------------------------
-- Four whole weeks, so a product with a Saturday rhythm is compared against four
-- Saturdays and the weekday effect cancels. A 7-day window makes one public
-- holiday look like a collapse; a 90-day one cannot see a change that started
-- three weeks ago, which is the change worth acting on.
--
-- It is a constant in a view body, which is the REVERSIBLE half — `create or
-- replace`, no data to migrate, nothing the seed bakes in — and that is the same
-- reasoning 0009 used to keep the timezone out of the schema until 0012 made the
-- column worth its price. The difference is that the timezone is a fact ABOUT A
-- SHOP, which is why it eventually became a column on `location`; a trailing
-- window is a parameter of a REPORT, and a report parameter belongs to the caller.
-- A caller who wants a different one does not need this migration changed: every
-- row carries `qty_base_sold` on a gapless spine, so any window at all is a window
-- function away over this very view. ⚠️ Owner's call, and it is cheap in both
-- directions.
--
-- ----------------------------------------------------------------------------
-- ACCESS: NO `has_role` PREDICATE, AND THIS TIME INHERITANCE IS SIMPLY RIGHT
-- ----------------------------------------------------------------------------
-- 0009's rule is that a view joining member-level data to manager-only data must
-- state its own predicate, because `security_invoker` inheritance fails OPEN
-- there: a cashier reads all the revenue, none of the cost, and is told the shop's
-- margin equals its takings. 0011 needed no predicate because BOTH its aggregates
-- read manager-gated tables and inheritance fails CLOSED.
--
-- This view is the third case, and it is neither: `sale`, `sale_line`, `location`,
-- `product_variant` and `product_family` are ALL member-level. There is nothing
-- costed anywhere in it. A cashier reading it gets their own store's velocity —
-- correct, complete for what they may see, and no more than the till already shows
-- them. Adding a manager gate would lock a cashier out of a number they can read
-- off their own screen. Asserted rather than assumed, as 0011's session was asked
-- to do: docs/PLAN.md predicted this outcome for 2.3 and the check demonstrates it.
--
-- Note that the SPINE narrows with the reader, which is the property that makes
-- this safe: `open_until` is derived from the same RLS-filtered `sale` rows, so a
-- cashier's spine covers their store's trading days and a manager's covers both
-- stores'. Nobody is told about a day at a store they cannot see.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- The view  (ADR-035 §2.9)
-- ----------------------------------------------------------------------------

create view public.product_velocity_daily
with (security_invoker = true) as

-- What actually left the shelf, at the grain. This is 0009's revenue leg exactly:
-- one aggregate over sale_line, its document for the clock, and `location` for the
-- zone that clock is read in (0012). A void is a negated document, so the sum
-- cancels it and nothing is excluded.
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

-- The days the till rang at all, per store. Sales only, and the column it feeds is
-- named `store_traded` rather than `store_open` for that reason — it is a claim
-- about the ledger, not about the shutters. A delivery arriving on a day with no
-- sale is 9 days in this seed; those days count as not traded, which is pinned in
-- the checks so the choice cannot drift silently.
traded as (
  select workspace_id, location_id, day
    from sold
   group by 1, 2, 3
),

-- ⚠️ WHERE EACH PAIR'S SPINE STARTS. The first day this store put this product on a
-- ticket — the earliest date the sale ledger can prove the store carried it. See
-- WHAT THE SCHEMA CANNOT ANSWER in the header: this is the inference that makes a
-- never-sold product invisible, and it is the finding this migration hands back.
carried as (
  select workspace_id, location_id, variant_id, min(day) as first_day
    from sold
   group by 1, 2, 3
),

-- ⚠️ AND WHERE IT ENDS: the last day the STORE traded, not the last day the PRODUCT
-- sold. Taking it from the product would end the spine at the silence it exists to
-- report — the view would say nothing about a product precisely once it stopped.
--
-- It is deliberately NOT `current_date`. A view whose row set moves with the
-- calendar cannot be checked reproducibly, would grow rows on a database nobody
-- has written to, and would make CI's answer depend on the day it ran.
--
-- ⚠️ THE PRICE OF THAT, STATED: if a whole STORE stops selling, its spine stops
-- with it and the silence that matters most becomes invisible. The caller windows
-- on a date range they choose, so a report asking about "this week" still sees an
-- empty week. A check pins the seed's precondition — no store has a purchase or a
-- write-off after its last selling day — so the day that stops being true, it goes
-- red and someone reads this paragraph.
open_until as (
  select workspace_id, location_id, max(day) as last_day
    from traded
   group by 1, 2
),

spine as (
  select c.workspace_id,
         c.location_id,
         c.variant_id,
         g::date as day
    from carried c
    join open_until o
      on  o.workspace_id = c.workspace_id
      and o.location_id  = c.location_id
   cross join lateral
         generate_series(c.first_day, o.last_day, interval '1 day') g
),

-- The spine with the ledger hung off it. Every zero below is a measured zero: the
-- row exists, the store's day exists, and nothing sold.
daily as (
  select sp.workspace_id,
         sp.location_id,
         sp.variant_id,
         sp.day,

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

       -- Today.
       d.qty_base_sold,
       d.revenue_net,
       d.line_count,
       d.store_traded,

       -- The trailing window: the 28 calendar days ENDING THE DAY BEFORE `day`, so
       -- today is compared against its own past and never against itself. RANGE and
       -- not ROWS: the frame is stated in days, so it stays correct if the spine
       -- ever acquires a gap rather than silently sliding 28 rows back.
       --
       -- Near the start of a pair's history the window is short rather than wrong,
       -- and `trailing_days` is how the caller knows: on each pair's first day it
       -- is 0, and there is nothing to compare against yet.
       sum(d.qty_base_sold) over w                          as trailing_qty_base,
       sum(d.revenue_net)   over w                          as trailing_revenue_net,
       count(*)             over w                          as trailing_days,
       count(*) filter (where d.store_traded)      over w    as trailing_traded_days,
       count(*) filter (where d.qty_base_sold > 0) over w    as trailing_sold_days,

       -- ⚠️ THE COLUMN THE QUESTION IS ACTUALLY ASKING FOR. Calendar days since this
       -- product last moved at this store; 0 on a day it sold. It keeps counting
       -- long after the trailing window has emptied, which is the case the window
       -- alone cannot describe: a product silent for 79 days and one silent for 29
       -- both have a trailing sum of zero, and only one of them is news.
       --
       -- ⚠️ NULL IS A THIRD ANSWER AND NOT A MISSING ONE: this pair has never had a
       -- day with positive net movement. In this seed that is *Jugo de naranja 1 l*
       -- at Sucursal Mercado, whose first appearance was a sale and its own void on
       -- the same day — `line_count` 2, `qty_base_sold` 0. 0011 found that "no row"
       -- and "a row that nets to nothing" must be told apart; docs/PLAN.md predicted
       -- 2.3 would meet the same shape, and this is where. `line_count` is the
       -- column that separates them, which is why it is on the row.
       d.day - (max(d.day) filter (where d.qty_base_sold > 0)
                over (partition by d.workspace_id, d.location_id, d.variant_id
                      order by d.day
                      rows between unbounded preceding and current row))
         as days_since_last_sale

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
-- What it is, in the database rather than in a file
-- ----------------------------------------------------------------------------

comment on view public.product_velocity_daily is
  'ADR-035 §2.9 question 3 — what stopped selling. Units and takings per store per '
  'product per day, on a GENERATED day spine so a day with no sale is a row rather '
  'than a silence, beside the same measures over the trailing 28 days. It does not '
  'divide: `trailing_days` and `trailing_traded_days` are both defensible '
  'denominators and they differ by 17.9% at Centro after a five-day closure, so '
  'the caller picks one. Every MEASURE is additive across a location rollup; '
  'store_traded rolls up as bool_or and days_since_last_sale as min. See 0013.';

comment on column public.product_velocity_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the sale document — the same column and the same rule product_margin_daily and '
  'product_waste_daily use, so the three reports cannot disagree about when a day '
  'ended. Rows exist for days with no sale; that is the point of the view.';

comment on column public.product_velocity_daily.store_traded is
  'True if this STORE sold anything at all on this day. False is a closure or a '
  'dead day, and it is why a zero on this row may be nothing to do with the '
  'product. Defined from sales only — it is a claim about the till, not about the '
  'door: 9 days in the seed took a delivery or a write-off without a sale.';

comment on column public.product_velocity_daily.trailing_days is
  'Calendar days of the 28-day trailing window that are on this pair''s spine. '
  'Less than 28 only near the start of the pair''s history; 0 on its first day, '
  'where there is nothing to compare against yet.';

comment on column public.product_velocity_daily.trailing_traded_days is
  'Of those trailing days, how many the STORE sold anything on. The second '
  'defensible denominator, and the reason this view ships no average of its own.';

comment on column public.product_velocity_daily.trailing_sold_days is
  'Of those trailing days, how many THIS product sold on. Separates a steady '
  'trickle from one large order followed by silence — two things with the same '
  'trailing sum and different meanings.';

comment on column public.product_velocity_daily.days_since_last_sale is
  'Calendar days since this product last moved at this store; 0 on a day it sold. '
  'NULL means it has never had a day of positive net movement here — not that the '
  'answer is missing. Counts across store closures, so read it with store_traded.';

comment on column public.product_velocity_daily.line_count is
  'Sale lines on this day, INCLUDING a void''s negated lines. Distinguishes "no '
  'row" from "a row that nets to nothing": a sale cancelled the same day leaves '
  'qty_base_sold at 0 and line_count at 2. 0011''s finding, at sale grain.';


-- ----------------------------------------------------------------------------
-- Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- No policy and no `has_role`. See ACCESS in the header: every base table is
-- member-level, so `security_invoker` inheritance gives each reader their own
-- stores and nothing else, and there is no cost column for it to fail open on.
-- `product_margin_daily` needed a predicate; this one would only take a number
-- away from the person standing at the till.
--
-- `security_invoker = true` as §2.7 fixes for every view, so row visibility stays
-- RLS's. `my_locations()` is fail-closed and excludes INACTIVE stores, which here
-- means deactivating a location retires its spine along with its history — the
-- same behaviour `product_margin_daily` and `product_waste_daily` already have,
-- and consistent rather than convenient.

grant select on public.product_velocity_daily to authenticated;
