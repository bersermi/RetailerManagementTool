-- ============================================================================
-- 0032 — How my prices have moved, on both sides of the ledger
-- ============================================================================
-- ADR-035 §2.9 (analytics), §2.7 (access), §2.5 (units and money)
--
-- Plan task 4.6c-ii. Área 9's N3, and §2.9's second question in the owner's own
-- words: "how prices have changed for purchases/selling", per variant, daily,
-- with the % windows computed by the client.
--
-- Scope of this migration, deliberately narrow so one person can review it:
--
--   * product_purchases_daily — `create or replace`, FOUR APPENDED COLUMNS:
--     what a unit cost, effective and as typed
--   * product_velocity_daily  — `create or replace`, FOUR APPENDED COLUMNS:
--     what a unit sold for, effective and as typed
--
-- No new view. No table, no policy, no function, no new column on any table, and
-- not one fence moved. Every object here is a `create or replace` or a comment,
-- so the whole of it is undone by one more `create or replace`.
--
-- Not in this migration: the month export (4.6c-iii, 0033).
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ WHY THERE IS NO NEW VIEW, WHEN THREE COPIES SAID THIS TASK NEEDS ONE
-- ----------------------------------------------------------------------------
-- docs/PLAN.md's N3 row says "Needs a view, and it is the largest piece".
-- supabase/README.md's planned `0032` entry and the 4.6c split table say the same.
-- All three were written on 2026-09-13. `product_purchases_daily` did not exist
-- on 2026-09-13 — 0031 created it on 2026-09-14, the day before this migration.
--
-- N3's own text says what it was asking for: "The real history is in the ledger —
-- purchase_line and sale_line unit prices, dated". That is a variant-day grain
-- over the purchase ledger and a variant-day grain over the sale ledger, carrying
-- the catalog names and the store's own trading day. **Both of those views now
-- exist**, and between them they already carry every column a price needs except
-- the price: the quantity, the net, the gross, the family and the day.
--
-- So a new view would be `product_purchases_daily` plus three columns under a
-- second name, and `product_velocity_daily` plus three columns under a third —
-- two supersets of two applied views, at the same grain, over the same base
-- tables. **The second copy going stale is this repository's most-recorded
-- defect**, nine times over, and N1's ruling of 2026-09-14 refused exactly this
-- shape for exactly this reason: "a second view returning revenue beside the
-- first would be two answers to one question differing only by tax".
--
-- ⚠️ THE FENCE FALLS OUT RIGHT, WHICH IS THE OTHER HALF OF THE ARGUMENT, AND IS
-- WHY A SINGLE COMBINED PRICE VIEW WOULD HAVE BEEN WORSE THAN EITHER.
-- A purchase price IS cost, and §2.7's capability table puts "See cost and margin"
-- at manager-and-above. A sale price is revenue over quantity, and the same table
-- puts "See quantity sold and revenue (Números)" at staff. One view carrying both
-- sides is a view with a manager-gated half and a member-level half — the exact
-- shape 0009 has, and the only reason 0009 writes a has_role predicate into its
-- own body. Putting the price on the two views that already own each side means:
--
--   * purchase price → product_purchases_daily → manager-and-above BY INHERITANCE
--     from purchase and purchase_line, with no predicate here and none added
--   * sale price     → product_velocity_daily  → member-level, as that view is
--
-- **No predicate is written, moved or removed by this migration.** 0011's and
-- 0031's headers both argue that a has_role in a view body is a second, weaker
-- copy of a fence RLS already holds; this migration never has to decide, because
-- each price is already standing inside the fence that governs it.
--
-- ⚠️ AND THE FENCE THE COMBINED VIEW WOULD HAVE NEEDED WOULD HAVE GUARDED
-- NOTHING. A cashier reads sale_line.unit_price_net_per_base directly today
-- (0003, sale_line_select carries no has_role) and reads revenue_net and
-- qty_base_sold off this very view. Hiding their quotient behind a predicate is
-- a fence anyone defeats with a calculator, bought at the price of a predicate
-- that keeps answering the old question the day sale_line's policy changes.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ WHAT THIS BREAKS, SAID OUT LOUD: TWO VIEWS THAT ADVERTISED THEMSELVES AS
-- DIVIDING NOTHING NOW DIVIDE
-- ----------------------------------------------------------------------------
-- product_velocity_daily's own comment says "It does not divide". 0013's check
-- says "the view ships no rate column at all". 0031's says "every MEASURE is
-- additive — no rate, ratio, average or document count column". A unit price is
-- a ratio and it is not additive. Those claims are edited here rather than
-- quietly outlived — and three of them would have STAYED GREEN while dying,
-- because each tests a list of column NAMES (%rate%, %avg%, %ratio%) and not one
-- of purchase_price_net, sale_price_gross, purchase_price_last_net or
-- sale_price_last_gross contains any of those strings.
--
-- ⚠️ THE CLAIM WAS NEVER "NEVER DIVIDE", AND READING 0013 CLOSELY IS WHAT SAVES
-- IT. 0013's reason is written beside the check: "per calendar day 11.786939 vs
-- per traded day 14.554465 — the view ships both denominators and divides
-- neither". The refusal is about a denominator that is a JUDGEMENT CALL. A unit
-- price has exactly one defensible denominator — the quantity in the same bucket
-- — and it is on the same row. So the rule survives, correctly scoped:
--
--     divide only where the denominator is not a choice, and only where it sits
--     on the row beside the answer, so any rollup can recompute it.
--
-- That second clause is what separates a price from a delivery count, which
-- 0031 refused for being non-additive. A price is non-additive too, but it is
-- EXACTLY RECOVERABLE at any grain — week, month, family, store — from two
-- additive columns already on the row. `count(distinct purchase_id)` is not
-- recoverable from anything. **Sum the components, then divide.** Never average
-- these columns across rows; a mean of daily prices is weighted by days rather
-- than by quantity and is a different, wrong number.
--
-- ⚠️ A FAMILY PRICE IS NOT A ROLLUP AND MUST NOT BE COMPUTED. Both views carry
-- family_id, so every other measure on them rolls up by dropping a column from
-- the group by. A price does not: a family mixes variants with different base
-- units (§2.5 — kg, pieces, litres), so sum(net)/sum(qty) across a family adds
-- kilos to pieces and divides money by the total. Per-variant only, and the
-- column comments say so.
--
-- ----------------------------------------------------------------------------
-- TWO PRICES PER SIDE, AND THEY ARE DIFFERENT FACTS
-- ----------------------------------------------------------------------------
-- *_price_net / *_price_gross are EFFECTIVE: the money in the bucket over the
-- quantity in the bucket. That is the right number for a chart and the only one
-- that rolls up, because its parts are additive.
--
-- *_price_last_net / *_price_last_gross are TYPED: unit_price_net_per_base off
-- the last line of the day, by document time. That is the price as a STATE —
-- "what am I charging now", "what did I last pay" — which an average cannot
-- answer, and which is the question §2.9's row actually asks. It is the dated,
-- per-variant form of the number provider_price_memory (0008) already keeps per
-- provider. ⚠️ It does NOT roll up: read it at the latest day in the window.
--
-- ⚠️ THEY DISAGREE EVEN IN A BUCKET WITH ONE LINE, AND THAT IS ARITHMETIC RATHER
-- THAN A DEFECT. line_net is numeric(12,2) — already rounded to the centavo by
-- §2.5's per-line rule — while unit_price_net_per_base is numeric(14,6). So
-- line_net / qty_base is the price that was actually CHARGED and the typed price
-- is the price that was MEANT, and on a fractional quantity they differ in the
-- fourth decimal. Nothing here is rounded: §2.5's half-up rule governs what a
-- customer is charged, not a derived report, and rounding an aggregate at every
-- grain makes two correct rollups disagree. Round once, at the edge.
--
-- ⚠️ GROSS SITS BESIDE NET ON BOTH, WHICH IS THE OWNER'S RULING OF 2026-09-14
-- (área 9, N1) APPLIED TO A PRICE. prices_include_tax defaults true, so the gross
-- unit price is the number on the shelf edge and the number on the invoice. The
-- typed gross is unit_price_net_per_base * (1 + tax_rate) from the SAME LINE the
-- typed net comes from — the line's own snapshot rate (0003), never the variant's
-- current one. ⚠️ Neither is a declaration figure: CFDI is out of scope.
--
-- ----------------------------------------------------------------------------
-- NULL IS A REAL ANSWER HERE, AND IT IS WHY THE DIVISION IS IN THE VIEW AT ALL
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE SEED HOLDS TEN SALE BUCKETS WHOSE QUANTITY SUMS TO EXACTLY ZERO —
-- a sale rung up and voided the same day (§2.6's 15-minute window), which leaves
-- two lines that cancel. Their net sums to zero too. **A client computing
-- revenue_net / qty_base_sold on those rows gets a division by zero**, and the
-- price card crashes on data the pilot generates on its first day.
--
-- That is the concrete reason these four columns are worth a migration rather
-- than a line of client code: `nullif(quantity, 0)` is written once, here, where
-- every caller gets it, instead of once per screen where the first one to forget
-- it ships the bug. The day spine 0014 generates does the same thing on a much
-- larger scale — a day this product did not sell has qty_base_sold = 0 and
-- therefore no price, which is the honest answer and not a zero.
--
-- ⚠️ A NULL PRICE MEANS "NO TRADE IN THIS BUCKET", NOT "FREE" AND NOT "UNKNOWN".
-- Rendering it as 0 draws a price line through the floor on every closed day.
-- Skip the point.
--
-- ----------------------------------------------------------------------------
-- REVERSALS, WHICH BEHAVE WELL HERE AND ARE WORTH ONE PARAGRAPH
-- ----------------------------------------------------------------------------
-- A void is a second document carrying negated lines (0003), and money follows
-- quantity by constraint — but unit_price_net_per_base is non-negative by
-- constraint too, so a reversal line carries the SAME positive typed price as the
-- line it cancels. Three consequences, none of them surprising once stated:
--
--   * the effective price survives a reversal: -$150 over -10 units is $15, the
--     price it always was. The seed has 23 purchase buckets that are wholly
--     negative (0031's finding — deliveries reversed 2, 2 and 9 days later) and
--     every one of them reports a positive price
--   * the typed LAST price of a day whose final document was a reversal is that
--     reversal's price, which is the price of the thing being undone. Correct,
--     and the only alternative is to exclude reversals, which would make the
--     effective and typed prices answer different questions
--   * a bucket that nets to zero has no effective price (above) but still has a
--     typed one. Read line_count beside it: 0 quantity with a positive line_count
--     is a cancelled trade, not a quiet day
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. product_purchases_daily — what a unit cost  (ADR-035 §2.9, §2.7)
-- ----------------------------------------------------------------------------
-- The body below is 0031's, copied verbatim. The diff against it is THREE hunks
-- and nothing else: two array_agg picks in the `bought` CTE, four appended output
-- columns, and the view comment restated. Nothing is removed, nothing is
-- reordered, no existing column changes name, type or position — which
-- `create or replace view` would refuse anyway, and which is the property that
-- keeps 0031's own checks meaning what they meant.
--
-- ACCESS IS UNCHANGED AND UNSTATED: manager-and-above by inheritance from
-- purchase and purchase_line, both of which carry has_role in their own SELECT
-- policies (0003). A cashier reads zero ROWS, not rows with a null price. This
-- view still states no predicate of its own and still must not.

create or replace view public.product_purchases_daily
with (security_invoker = true) as

with bought as (
  -- ⚠️ THE DAY COMES FROM THE DOCUMENT, NOT FROM THE LINE. `purchase_line` has no
  -- `occurred_at` of its own — only `created_at`, which is the write moment and not
  -- the trading moment. `recorded_offline` makes those differ by up to 72 hours
  -- (§2.6), and 0010 is the migration that exists because an allocator confused the
  -- two. Identical, deliberately, to the `bought` CTE inside product_waste_daily.
  select pl.workspace_id,
         pl.location_id,
         pl.variant_id,
         (p.occurred_at at time zone l.timezone)::date as day,

         sum(pl.qty_base)                     as purchases_qty_base,
         sum(pl.line_net)                     as purchases_net,
         sum(pl.tax_amount)                   as tax_paid,
         sum(pl.line_net + pl.tax_amount)     as purchases_gross,
         count(*)                             as purchase_line_count,

         -- ⚠️ NEW IN 0032. The TYPED price off the last line of the day, by
         -- document time. Postgres has no `last` aggregate, and a window function
         -- cannot be used here without a second pass over the same grain, so the
         -- ordered array_agg is the idiom: it is evaluated inside this group by
         -- and it takes one line's value rather than combining several.
         --
         -- ⚠️ THE TIEBREAK IS LOAD-BEARING AND IS THREE DEEP. Two deliveries can
         -- share an occurred_at — a store that types both in at once, or an
         -- offline batch replayed together (§2.6) — and `created_at` can tie for
         -- the same reason. `pl.id` is unique, so the pick is TOTAL: the same
         -- database always answers the same price. Without it, "the last price"
         -- would be whichever row the planner happened to reach first, and the
         -- chart would change on a re-plan with nothing red anywhere.
         --
         -- Both picks carry the SAME order by, so the net and the gross come off
         -- ONE line and cannot describe two different deliveries.
         (array_agg(pl.unit_price_net_per_base
                    order by p.occurred_at desc, pl.created_at desc, pl.id desc))[1]
           as price_last_net,
         (array_agg(pl.unit_price_net_per_base * (1 + pl.tax_rate)
                    order by p.occurred_at desc, pl.created_at desc, pl.id desc))[1]
           as price_last_gross

    from public.purchase_line pl
    join public.purchase p
      on  p.id           = pl.purchase_id
      and p.workspace_id = pl.workspace_id
      and p.location_id  = pl.location_id
    join public.location l
      on  l.id           = pl.location_id
      and l.workspace_id = pl.workspace_id
   group by 1, 2, 3, 4
)

select b.workspace_id,
       b.location_id,
       b.variant_id,
       b.day,

       -- Names from the catalog, not snapshotted — the same call 0009 argues for.
       -- A report reads in the product's CURRENT name; money is snapshotted on the
       -- line (0003) and never moves, names are not money.
       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,

       b.purchases_qty_base,
       b.purchases_net,
       b.tax_paid,
       b.purchases_gross,
       b.purchase_line_count,

       -- ⚠️ NEW IN 0032, AND APPENDED BECAUSE `create or replace view` CANNOT
       -- REORDER. The effective price is written as the ratio of the two columns
       -- immediately above it so that the row's own arithmetic is the definition
       -- and it cannot drift from them. nullif is not defensive: a bucket whose
       -- documents cancel has a quantity of exactly zero, and the seed holds ten
       -- of them on the sale side.
       b.purchases_net   / nullif(b.purchases_qty_base, 0) as purchase_price_net,
       b.purchases_gross / nullif(b.purchases_qty_base, 0) as purchase_price_gross,

       b.price_last_net   as purchase_price_last_net,
       b.price_last_gross as purchase_price_last_gross

  from bought b

  join public.product_variant v
    on  v.id           = b.variant_id
    and v.workspace_id = b.workspace_id
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id;


-- `comment on view` REPLACES rather than appends, so 0031's text is restated in
-- full with the price sentences folded in. ⚠️ The "every MEASURE is additive"
-- clause it carried is corrected rather than dropped: it was true when it was
-- written and four columns landing today make it false.
comment on view public.product_purchases_daily is
  'How much was bought and at what price, per store per product per day '
  '(ADR-035 §2.9; plan tasks 4.6c-i and 4.6c-ii, area 9 rulings N2 and N3). The '
  'same quantity-and-money numbers product_waste_daily computes inside itself as a '
  'denominator, in a view named for the question the owner actually asks. Per '
  'FAMILY is a group by for every column EXCEPT the four price columns: family_id '
  'and family_name are on every row, but a family mixes base units (kg, pieces, '
  'litres) and a price across them is money over a meaningless total. Daily grain '
  'on purpose — the caller sums to a week or a month, so changing the period is not '
  'a migration. ⚠️ Since 0032 not every column is additive: purchase_price_net and '
  'purchase_price_gross are RATIOS, and the way to roll them up is to sum '
  'purchases_net or purchases_gross and purchases_qty_base over the window and '
  'divide once, NEVER to average the daily prices — that weights by days instead of '
  'by quantity. purchase_price_last_* does not roll up at all: take it from the '
  'latest day in the window. ⚠️ Voided deliveries are NOT excluded: a reversal is a '
  'negated document and cancels itself in a sum, but it is dated when it was '
  'RECORDED, so a daily chart shows a negative bar on that day and only a period '
  'containing both documents nets out. The price survives it — negative money over '
  'negative quantity is the price it always was. ⚠️ No day spine: nothing records a '
  'delivery that was due and did not arrive, so a day with no purchase has no row '
  'rather than a zero nobody can back. Manager-and-above, by RLS inheritance from '
  'purchase and purchase_line — this view states no predicate of its own and must '
  'not.';

comment on column public.product_purchases_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the purchase document. product_margin_daily, product_waste_daily and '
  'product_velocity_daily read the same column, so no two reports can disagree '
  'about when a day ended.';
comment on column public.product_purchases_daily.purchases_qty_base is
  'Net units delivered in the variant base unit (§2.5). Convert for display at the '
  'edge. Negative on a day whose only document was a reversal. Also the DENOMINATOR '
  'of purchase_price_net and purchase_price_gross, which is why those two are '
  'recoverable at any grain and a rollup never has to average a price.';
comment on column public.product_purchases_daily.purchases_net is
  'What the delivery cost before IVA, unrounded. Report figures are not rounded '
  'here: §2.5''s per-line half-up rule governs what a customer is charged, and '
  'rounding a derived aggregate at every grain makes two correct rollups disagree '
  'by centavos. Round once, at the edge.';
comment on column public.product_purchases_daily.tax_paid is
  'IVA on the delivery — acreditable, the counterpart of product_margin_daily and '
  'product_velocity_daily''s tax_collected, and deliberately NOT the same column '
  'name. ⚠️ Not a declaration figure: CFDI is out of scope (ADR-035) and a reversal '
  'moves this in the month it was recorded, not the month it corrects.';
comment on column public.product_purchases_daily.purchases_gross is
  'purchases_net + tax_paid — what actually left the till, which is the number the '
  'shopkeeper recognises. Ruled for revenue on 2026-09-14 (area 9, N1); carried to '
  'the purchases side for the same reason, since prices_include_tax defaults true '
  'and the invoice he is holding is gross.';
comment on column public.product_purchases_daily.purchase_line_count is
  'Delivery LINES, not deliveries. A document count would not be additive across a '
  'rollup — one delivery appears on every variant row of that day — so it is not a '
  'column here. Count distinct purchase_id at the grain you actually want. ⚠️ Read '
  'it beside a null price: 0 quantity with a positive line_count is a delivery that '
  'was cancelled, not a day without one.';

comment on column public.product_purchases_daily.purchase_price_net is
  'What one base unit COST before IVA in this bucket, effective: purchases_net over '
  'purchases_qty_base (0032, area 9 N3). NULL where the quantity is exactly zero — '
  'a delivery and its reversal in the same day — which is the honest answer and is '
  'why the division lives here rather than in every client. ⚠️ NOT ADDITIVE and not '
  'a family number: to roll it up, sum the two columns it divides and divide once; '
  'averaging daily prices weights by days instead of by quantity, and averaging '
  'across a family divides money by a mix of kilos and pieces.';
comment on column public.product_purchases_daily.purchase_price_gross is
  'The same price with IVA in it — purchases_gross over purchases_qty_base — which '
  'is the number on the invoice the owner is holding, by the ruling of 2026-09-14 '
  '(area 9, N1) applied to a price. Read purchase_price_net beside it, never '
  'instead of it: every other money read in this schema is net. Same rollup rule, '
  'same family warning.';
comment on column public.product_purchases_daily.purchase_price_last_net is
  'What the LAST delivery of this day charged per base unit before IVA, as typed — '
  'unit_price_net_per_base off one line, ordered by document time and broken by '
  'created_at then id so the answer is total and stable. The price as a STATE, '
  'which is what "how have my prices moved" asks and an average cannot answer; the '
  'dated per-variant form of what provider_price_memory (0008) keeps per provider. '
  '⚠️ DOES NOT ROLL UP — read it at the latest day in the window, never summed or '
  'averaged. ⚠️ Differs from purchase_price_net in the fourth decimal even on a '
  'single-line day: line_net is rounded to the centavo (§2.5) and this is not, so '
  'one is the price CHARGED and this is the price MEANT. ⚠️ On a day whose last '
  'document was a reversal this is that reversal''s price, which is the price of '
  'the thing being undone.';
comment on column public.product_purchases_daily.purchase_price_last_gross is
  'purchase_price_last_net grossed up by the LINE''s own snapshot tax_rate (0003), '
  'never by the variant''s current rate — re-deriving tax from today''s rate would '
  'silently restate last quarter''s prices the moment someone corrects a product. '
  'Taken from the same line as purchase_price_last_net, by the same ordering, so '
  'the two can never describe different deliveries.';


-- ----------------------------------------------------------------------------
-- 2. product_velocity_daily — what a unit sold for  (ADR-035 §2.9, §2.7)
-- ----------------------------------------------------------------------------
-- The body below is 0031's, copied verbatim. The diff against it is FOUR hunks
-- and nothing else: two array_agg picks in the `sold` CTE, two pass-throughs in
-- `daily` that are deliberately NOT coalesced, four appended output columns, and
-- the view comment restated.
--
-- ⚠️ THE TWO PASS-THROUGHS ARE THE ONE PLACE A HABIT WOULD HAVE BEEN WRONG.
-- Every other column in `daily` is `coalesce(s.x, 0)`, because a spine day with
-- no sale genuinely sold zero. A spine day with no sale does not have a price of
-- zero — it has no price. Coalescing these would draw a line to the floor on
-- every quiet day and report it as a 100% discount.
--
-- ACCESS IS UNCHANGED AND UNSTATED: member-level, exactly as 0013, 0014 and 0031
-- left it. ⚠️ THE FOUR NEW COLUMNS GRANT A CASHIER NOTHING SHE DID NOT ALREADY
-- HAVE — sale_line.unit_price_net_per_base is member-level (0003, sale_line_select
-- carries no has_role: "a sale line carries a price, not a cost"), and
-- revenue_net over qty_base_sold has been on this view since 0013. §2.7 puts "See
-- quantity sold and revenue (Números)" at staff, and a sale price is those two
-- columns divided. There is still no cost column here for inheritance to fail
-- open on, which is 0013's stated reason this view survived C8.6.

create or replace view public.product_velocity_daily
with (security_invoker = true) as

with sold as (
  select sl.workspace_id,
         sl.location_id,
         sl.variant_id,
         (s.occurred_at at time zone l.timezone)::date as day,

         sum(sl.qty_base)   as qty_base_sold,
         sum(sl.line_net)   as revenue_net,

         -- ⚠️ NEW IN 0031, AND IT NEEDED NO FENCE TO MOVE. `sale_line.tax_amount`
         -- is member-level (0003, sale_line_select) — the manager fence is on
         -- product_margin_daily, not on the column. See 0031's header.
         sum(sl.tax_amount) as tax_collected,

         count(*)           as line_count,

         -- ⚠️ NEW IN 0032. The TYPED price off the last line of the day. Same
         -- idiom and the same three-deep tiebreak as the purchases half above,
         -- and it matters more here: a busy till writes many sales into one
         -- second, so `occurred_at` alone ties often. The seed has no tie at all
         -- (0 buckets), which is exactly why the tiebreak is written rather than
         -- discovered — nothing in this seed can falsify it.
         (array_agg(sl.unit_price_net_per_base
                    order by s.occurred_at desc, sl.created_at desc, sl.id desc))[1]
           as price_last_net,
         (array_agg(sl.unit_price_net_per_base * (1 + sl.tax_rate)
                    order by s.occurred_at desc, sl.created_at desc, sl.id desc))[1]
           as price_last_gross

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

traded as (
  select workspace_id, location_id, day
    from sold
   group by 1, 2, 3
),

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
         coalesce(s.tax_collected, 0) as tax_collected,
         coalesce(s.line_count,    0) as line_count,

         -- ⚠️ NEW IN 0032, AND DELIBERATELY NOT COALESCED. See the section header:
         -- a day with no sale has no price, not a price of zero.
         s.price_last_net,
         s.price_last_gross,

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

       (d.day - d.first_day) as days_carried,

       -- ⚠️ NEW IN 0031, AND APPENDED BECAUSE `create or replace view` CANNOT
       -- REORDER. The owner's ruling of 2026-09-14 is that the headline revenue
       -- number is GROSS — prices_include_tax defaults true, so the price typed
       -- into the catalog already contains the tax and gross is what reconciles
       -- against the cash in the till — with net kept beside it because §2.9's
       -- existing language, product_margin_daily and every other money read in
       -- this schema are net, and two numbers that differ by 16% must not swap
       -- silently under one name.
       --
       -- revenue_gross is written as net + tax rather than as a second aggregate
       -- so that it cannot drift from the two columns it sits beside: the row's
       -- own arithmetic is the definition. All three are additive.
       d.tax_collected                              as tax_collected,
       (d.revenue_net + d.tax_collected)            as revenue_gross,

       -- The trailing window's gross, so the comparison a client draws is like for
       -- like. There is deliberately no trailing_tax_collected: it is
       -- trailing_revenue_gross - trailing_revenue_net exactly, nobody asked for
       -- it, and a fourth trailing column is a fourth thing to keep true.
       sum(d.revenue_net + d.tax_collected) over w  as trailing_revenue_gross,

       -- ⚠️ NEW IN 0032, appended after 0031's three for the same reason. The
       -- effective sale price, as the ratio of two columns already on this row, so
       -- the row's own arithmetic is the definition. There is deliberately NO
       -- trailing price: it is trailing_revenue_net over trailing_qty_base, both
       -- of which are here, and a fifth window column is a fifth thing to keep
       -- true. ⚠️ nullif carries the day spine AND the ten cancelled buckets.
       d.revenue_net                     / nullif(d.qty_base_sold, 0) as sale_price_net,
       (d.revenue_net + d.tax_collected) / nullif(d.qty_base_sold, 0) as sale_price_gross,

       d.price_last_net   as sale_price_last_net,
       d.price_last_gross as sale_price_last_gross

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


-- ⚠️ RESTATED IN FULL, and the sentence "It does not divide" is CORRECTED rather
-- than deleted: it was true from 0013 to 0031 and four columns landing today make
-- it false. The reason behind it survives and is now stated as the rule it always
-- was — a denominator that is a judgement call is the caller's to pick.
comment on view public.product_velocity_daily is
  'ADR-035 §2.9 question 3 — what stopped selling, and since 0014 what never '
  'started. Units and takings per store per product per day, on a GENERATED day '
  'spine that begins the day the store is first known to have HELD the product '
  '(sale ledger or stock ledger, whichever is earlier), beside the same measures '
  'over the trailing 28 days. Since 0031 it is also area 9''s revenue read: '
  'revenue_gross is the headline number the owner ruled for on 2026-09-14, '
  'revenue_net and tax_collected sit beside it, and per-family is a group by '
  'because family_id is on every row. Since 0032 it is also area 9''s SALE PRICE '
  'read (N3): sale_price_net and sale_price_gross are effective prices, '
  'sale_price_last_* is the price as typed on the day''s last sale. ⚠️ THE PRICE '
  'COLUMNS ARE THE ONLY ONES THAT ARE NOT ADDITIVE AND THE ONLY ONES THAT ARE NOT '
  'A GROUP BY AWAY FROM A FAMILY NUMBER: to roll a price up, sum revenue_net or '
  'revenue_gross and qty_base_sold over the window and divide once, never average '
  'the daily prices; and never across a family, which mixes base units. It still '
  'refuses the division that is a JUDGEMENT CALL: trailing_days and '
  'trailing_traded_days are both defensible denominators and they differ by 17.9% '
  'at a store that shut for five days, so the caller picks one — a unit price has '
  'exactly one defensible denominator and it is on the row. Every other MEASURE is '
  'additive across a location rollup; store_traded rolls up as bool_or, '
  'days_since_last_sale as min and days_carried as max. Member-level: a cashier '
  'reads their own store, and there is still no cost column here for inheritance '
  'to fail open on — a sale price is revenue over quantity, which §2.7 already '
  'puts at staff, and sale_line.unit_price_net_per_base has been member-level '
  'since 0003. See 0013, 0014, 0031 and 0032.';

comment on column public.product_velocity_daily.tax_collected is
  'IVA on the sales in this bucket — the same number product_margin_daily calls '
  'tax_collected at the same grain, and it carries that name so the two cannot be '
  'read as different facts. It reaches a cashier because sale_line.tax_amount '
  'always did (0003): the manager fence is on 0009''s view, never on the column. '
  '⚠️ Not a declaration figure — CFDI is out of scope (ADR-035).';
comment on column public.product_velocity_daily.revenue_gross is
  'revenue_net + tax_collected — THE HEADLINE REVENUE NUMBER, ruled by the owner '
  'on 2026-09-14 (area 9, N1). workspace.prices_include_tax defaults true, so the '
  'price on the shelf already contains the tax and this is what reconciles against '
  'the cash in the till. Additive. Read revenue_net beside it, never instead of it: '
  'every other money read in this schema is net.';
comment on column public.product_velocity_daily.trailing_revenue_gross is
  'revenue_gross over the trailing 28 days, so a client compares like with like. '
  'There is no trailing_tax_collected on purpose: it is exactly '
  'trailing_revenue_gross - trailing_revenue_net.';

comment on column public.product_velocity_daily.sale_price_net is
  'What one base unit SOLD for before IVA in this bucket, effective: revenue_net '
  'over qty_base_sold (0032, area 9 N3). NULL on every day this product did not '
  'sell — the spine generates those rows and a quiet day has no price, not a price '
  'of zero — and NULL in the ten seed buckets where a sale and its same-day void '
  'cancel to exactly zero quantity. That second case is why the division is in the '
  'view: a client doing it itself divides by zero on data the pilot produces in its '
  'first week. ⚠️ NOT ADDITIVE and not a family number: to roll it up, sum the two '
  'columns it divides and divide once; averaging daily prices weights by days '
  'instead of by quantity, and averaging across a family divides money by a mix of '
  'kilos and pieces. ⚠️ There is no trailing price column on purpose — it is '
  'trailing_revenue_net over trailing_qty_base, both already here.';
comment on column public.product_velocity_daily.sale_price_gross is
  'The same price with IVA in it — revenue_gross over qty_base_sold — which is the '
  'price on the shelf edge, since prices_include_tax defaults true. THE ONE TO SHOW '
  'by the ruling of 2026-09-14 (area 9, N1) applied to a price; read sale_price_net '
  'beside it, never instead of it. Same rollup rule, same family warning.';
comment on column public.product_velocity_daily.sale_price_last_net is
  'What the LAST sale of this day charged per base unit before IVA, as typed — '
  'unit_price_net_per_base off one line, ordered by document time and broken by '
  'created_at then id so the answer is total and stable. The price as a STATE, '
  'which is what "how have my prices moved" asks and an average cannot answer, and '
  'the closest thing in this schema to the current shelf price: price_list holds '
  'the INTENDED price and is empty. ⚠️ DOES NOT ROLL UP — read it at the latest day '
  'in the window. ⚠️ NULL on a day with no sale, including every spine day. '
  '⚠️ Differs from sale_price_net in the fourth decimal even on a single-line day: '
  'line_net is rounded to the centavo (§2.5) and this is not, so one is the price '
  'CHARGED and this is the price MEANT. ⚠️ On a day whose last document was a void '
  'this is that void''s price, which is the price of the sale being undone.';
comment on column public.product_velocity_daily.sale_price_last_gross is
  'sale_price_last_net grossed up by the LINE''s own snapshot tax_rate (0003), '
  'never by the variant''s current rate — re-deriving tax from today''s rate would '
  'silently restate last quarter''s prices the moment someone corrects a product. '
  'Taken from the same line as sale_price_last_net, by the same ordering, so the '
  'two can never describe different sales.';
