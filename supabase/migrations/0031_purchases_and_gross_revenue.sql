-- ============================================================================
-- 0031 — What I bought, and revenue in the currency the shopkeeper recognises
-- ============================================================================
-- ADR-035 §2.9 (analytics), §2.7 (access), §2.5 (units and money), §2.3 (data model)
--
-- Plan task 4.6c-i. Scope of this migration, deliberately narrow so one person can
-- review it:
--
--   * product_purchases_daily — ONE NEW VIEW. Área 9's N2: "how much was bought
--     this week/month", per variant and per family, per store, per day
--   * product_velocity_daily  — `create or replace`, THREE APPENDED COLUMNS.
--     Área 9's N1, ruled 2026-09-14: revenue is GROSS, net beside it
--   * product_margin_daily    — `comment on view` only. Part B's B8: 0009 is
--     orphaned-but-applied and goes on returning 100% margin on a despiece
--   * replay_failed_write     — `comment on function` only. One sentence in it
--     stopped being true on 2026-09-14, hours after 0030 applied it
--
-- No table, no policy, no function, no new column on any table. Nothing here is
-- append-only: every object in it is a `create or replace` or a comment.
--
-- Not in this migration: price over time (4.6c-ii, 0032) and the month export
-- (4.6c-iii, 0033).
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE FENCE PROBLEM THE PLAN PUT AT THE TOP OF THIS TASK DOES NOT EXIST,
-- AND THAT WAS MEASURED RATHER THAN ARGUED
-- ----------------------------------------------------------------------------
-- docs/PLAN.md's N1 row, and the 4.6c-i row that quotes it, both say: "the only
-- column carrying tax is product_margin_daily.tax_collected — MANAGER-ONLY, so the
-- staff-readable view cannot reach it", and call reaching it "this task's first
-- design problem".
--
-- That is true of the VIEWS and false of the COLUMNS. `sale_line.tax_amount` is the
-- number `product_margin_daily.tax_collected` sums, and `sale_line_select` (0003)
-- is
--
--     workspace_id in (select my_workspaces()) and location_id in (select my_locations())
--
-- with no `has_role` in it, because "a cashier must be able to see the sale they
-- just rang up in order to void it inside the 15-minute window, and a sale line
-- carries a price, not a cost." Asked of the database on 2026-09-14 under
-- `set role authenticated` as caja.centro@tienda.mx: the cashier reads 1 040
-- sale lines carrying $4 826.96 of tax, and 0 rows of product_margin_daily.
--
-- So gross revenue reaches a cashier through the table the view already reads, and
-- NO fence moves, no policy changes, and no `security definer` function is needed.
-- The tax was never behind the manager fence; only one view's copy of it was.
-- Asserted in section 1 of supabase/checks/0031, both halves.
--
-- ----------------------------------------------------------------------------
-- WHY GROSS REVENUE IS A `create or replace` ON 0013/0014 AND NOT A NEW VIEW
-- ----------------------------------------------------------------------------
-- ⚠️ THIS IS A DECISION MADE ON THE OWNER'S BEHALF, and it is the one worth
-- overturning early if it is wrong.
--
-- B1 ruled "a NEW view, leave 0009 applied and untouched" — but that was about
-- `product_margin_daily`, which is BROKEN under C8.6 and is being replaced by
-- nothing. `product_velocity_daily` is the opposite case: docs/PLAN.md's own table
-- records it as the one of the three §2.9 views that is "intact, and for a stated
-- reason", it is already the staff-readable home of qty-and-revenue, it already
-- carries family_id and family_name on every row, and 0014 established that this
-- view is amended by `create or replace`.
--
-- A second view returning revenue beside the first one would be two answers to
-- A6's question 2, differing only in tax — and this repository's most-recorded
-- defect, nine times over, is the second copy going stale. So the column lands
-- where the number already lives.
--
-- ⚠️ `create or replace view` can only APPEND columns, never reorder them, so
-- tax_collected / revenue_gross / trailing_revenue_gross sit after days_carried
-- rather than beside revenue_net. That is a property of the statement, not a view
-- of what matters: a caller selects by name.
--
-- ⚠️ AND IT IS CHEAP TO REVERSE, which is why it is taken rather than parked. The
-- whole of it is one `create or replace` away from being undone; nothing here is a
-- table, a column or a policy, and the seed writes no data against it.
--
-- ----------------------------------------------------------------------------
-- THE NAMES ARE THE ONES THE SCHEMA ALREADY USES, ON PURPOSE
-- ----------------------------------------------------------------------------
-- `tax_collected` is what `product_margin_daily` calls sum(sale_line.tax_amount) at
-- this exact grain (0009). Spelling it `revenue_tax` here would have given one
-- number two names in two views and invited someone to prove they disagree. It is
-- the same number, so it keeps the same name — and supabase/checks/0031 asserts
-- ROW FOR ROW that the two views agree on it, which is an assertion that only
-- exists because the names match.
--
-- The same argument, in the other direction, fixes the purchases view's names:
-- `product_waste_daily` (0011/0012) already computes `purchases_qty_base`,
-- `purchases_net` and `purchase_line_count` at the identical grain, inside a view
-- named for waste — which is N2's whole complaint, "not where anyone will look".
-- The new view uses those three names unchanged and adds two, so the overlap can
-- be asserted row for row rather than eyeballed. It is.
--
-- ⚠️ PURCHASES CARRY `tax_paid` AND SALES CARRY `tax_collected`, and the asymmetry
-- is deliberate: in MXN terms these are IVA acreditable and IVA trasladado, they
-- are not the same fact, and a single `tax` column across both would eventually be
-- summed by someone. ⚠️⚠️ NEITHER IS A DECLARATION FIGURE. CFDI is out of scope
-- (ADR-035), nothing here is timed to a fiscal period, and a reversal moves the
-- number in the month it was recorded rather than the month it corrects. These are
-- shopkeeper's arithmetic, not an accountant's.
--
-- ----------------------------------------------------------------------------
-- THE PURCHASES VIEW HAS NO DAY SPINE, AND THAT IS THE DIFFERENCE FROM 0014
-- ----------------------------------------------------------------------------
-- `product_velocity_daily` generates a row for every day a product sold NOTHING,
-- because its question is "what stopped selling" and silence is the answer. 91% of
-- its rows exist to say nothing happened (0013).
--
-- This view answers "how much was bought this week/month", and there is no such
-- thing as a day a delivery was DUE and did not arrive — no table records an
-- expected delivery, a reorder point or a schedule. A spine here would have to
-- invent that fact, and every zero it produced would be a claim nobody can back.
-- So a row exists exactly where a purchase document exists, and a period with no
-- deliveries sums to nothing because it contains no rows, which is the same answer
-- honestly arrived at.
--
-- ----------------------------------------------------------------------------
-- ⚠️ REVERSALS ARE NOT EXCLUDED, AND UNLIKE 0009 THEY DO NOT CANCEL WITHIN A DAY
-- ----------------------------------------------------------------------------
-- A void is a second document carrying negated lines (0003), and this view is a
-- SUM, so 0009's argument holds: nothing needs excluding, because both documents
-- cancel the moment both are in range.
--
-- ⚠️ "IN RANGE" IS DOING WORK HERE THAT IT DOES NOT DO IN 0009. A voided SALE is
-- rung up and voided inside a 15-minute window (§2.6), so both documents almost
-- always land in the same day bucket. A voided DELIVERY is not: the three in the
-- seed were reversed 2, 2 and 9 days after the document they cancel. So a daily
-- purchases chart shows a NEGATIVE BAR on the day the correction was recorded, and
-- the week or month containing both nets out correctly.
--
-- That is the honest shape and not a defect — the ledger records when things were
-- recorded — but it is the first thing a reader of a daily purchases chart will
-- ask about, so it is written here, in the view's own comment, and pinned by a
-- check that counts the negative buckets.
--
-- ----------------------------------------------------------------------------
-- ACCESS: MANAGER-AND-ABOVE BY INHERITANCE, AND THIS VIEW MUST NOT CARRY has_role
-- ----------------------------------------------------------------------------
-- The same reasoning 0011 states and 0009 could not use. `purchase` and
-- `purchase_line` are BOTH manager-gated (0003 — "this is what the business pays"),
-- so a staff caller reads zero rows from both and inheritance under
-- `security_invoker` fails CLOSED. There is nothing to fail open on, because there
-- is no member-level half of this view to be left standing when the gated half
-- disappears — which is the exact property 0009 lacks and the only reason 0009
-- writes a predicate into its own body.
--
-- Joining `location` (member-level, for the timezone) and the catalog widens
-- nothing: an inner join against a gated aggregate is still gated. Asserted under
-- `set role authenticated` rather than argued.
--
-- ⚠️ B7 asked for "manager and above" and this delivers it WITHOUT a has_role
-- predicate. Adding one would be a second, weaker copy of a fence RLS already
-- holds, and 0011's header records why that is worse than it looks: the day
-- purchase_line's policy changes, a predicate here would keep answering the old
-- question.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. product_purchases_daily — N2  (ADR-035 §2.9)
-- ----------------------------------------------------------------------------

create view public.product_purchases_daily
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
         count(*)                             as purchase_line_count

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
       b.purchase_line_count

  from bought b

  join public.product_variant v
    on  v.id           = b.variant_id
    and v.workspace_id = b.workspace_id
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id;


comment on view public.product_purchases_daily is
  'How much was bought, per store per product per day (ADR-035 §2.9; plan task '
  '4.6c-i, area 9 ruling N2). The same number product_waste_daily computes inside '
  'itself as a denominator, in a view named for the question the owner actually '
  'asks. Per FAMILY is a group by, not a second view: family_id and family_name are '
  'on every row. Daily grain on purpose — the caller sums to a week or a month, so '
  'changing the period is not a migration. Every MEASURE here is additive across '
  'any rollup. ⚠️ Voided deliveries are NOT excluded: a reversal is a negated '
  'document and cancels itself in a sum, but it is dated when it was RECORDED, so a '
  'daily chart shows a negative bar on that day and only a period containing both '
  'documents nets out. ⚠️ No day spine: nothing records a delivery that was due and '
  'did not arrive, so a day with no purchase has no row rather than a zero nobody '
  'can back. Manager-and-above, by RLS inheritance from purchase and purchase_line '
  '— this view states no predicate of its own and must not.';

comment on column public.product_purchases_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the purchase document. product_margin_daily, product_waste_daily and '
  'product_velocity_daily read the same column, so no two reports can disagree '
  'about when a day ended.';
comment on column public.product_purchases_daily.purchases_qty_base is
  'Net units delivered in the variant base unit (§2.5). Convert for display at the '
  'edge. Negative on a day whose only document was a reversal.';
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
  'column here. Count distinct purchase_id at the grain you actually want.';


-- ----------------------------------------------------------------------------
-- 2. Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- `security_invoker = true`, as §2.7 fixes for every view. No policy and no
-- `has_role`: both base tables are manager-gated, so inheritance fails closed. See
-- the header. The grant is explicit rather than inherited so the intent is
-- reviewable in the migration, exactly as 0003 §7 does it.

grant select on public.product_purchases_daily to authenticated;


-- ----------------------------------------------------------------------------
-- 3. product_velocity_daily — N1, revenue is GROSS with net beside it
-- ----------------------------------------------------------------------------
-- Ruled by the owner 2026-09-14: "Revenue is GROSS of IVA, net beside it."
--
-- The body below is 0014's, copied verbatim. The diff against it is FOUR hunks and
-- nothing else: `sum(sl.tax_amount)` in the `sold` CTE, its coalesce in `daily`,
-- three appended output columns, and one appended window sum. Nothing is removed,
-- nothing is reordered, and no existing column changes name, type or position —
-- which `create or replace view` would refuse anyway, and which is the property
-- that makes 0013's and 0014's checks still mean what they meant.

create or replace view public.product_velocity_daily
with (security_invoker = true) as

-- Unchanged from 0013/0014 except for tax_collected: what actually left the shelf,
-- at the grain.
with sold as (
  select sl.workspace_id,
         sl.location_id,
         sl.variant_id,
         (s.occurred_at at time zone l.timezone)::date as day,

         sum(sl.qty_base)   as qty_base_sold,
         sum(sl.line_net)   as revenue_net,

         -- ⚠️ NEW IN 0031, AND IT NEEDED NO FENCE TO MOVE. `sale_line.tax_amount`
         -- is member-level (0003, sale_line_select) — the manager fence is on
         -- product_margin_daily, not on the column. See the header.
         sum(sl.tax_amount) as tax_collected,

         count(*)           as line_count

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
       sum(d.revenue_net + d.tax_collected) over w  as trailing_revenue_gross

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


comment on view public.product_velocity_daily is
  'ADR-035 §2.9 question 3 — what stopped selling, and since 0014 what never '
  'started. Units and takings per store per product per day, on a GENERATED day '
  'spine that begins the day the store is first known to have HELD the product '
  '(sale ledger or stock ledger, whichever is earlier), beside the same measures '
  'over the trailing 28 days. Since 0031 it is also area 9''s revenue read: '
  'revenue_gross is the headline number the owner ruled for on 2026-09-14, '
  'revenue_net and tax_collected sit beside it, and per-family is a group by '
  'because family_id is on every row. It does not divide: trailing_days and '
  'trailing_traded_days are both defensible denominators and they differ by 17.9% '
  'at a store that shut for five days, so the caller picks one. Every MEASURE is '
  'additive across a location rollup; store_traded rolls up as bool_or, '
  'days_since_last_sale as min and days_carried as max. Member-level: a cashier '
  'reads their own store, and there is still no cost column here for inheritance '
  'to fail open on. See 0013, 0014 and 0031.';

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


-- ----------------------------------------------------------------------------
-- 4. product_margin_daily — B8, the honesty comment. NOTHING ELSE CHANGES
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ 0009 IS NOW ORPHANED BUT APPLIED. The owner's A3 ruling of 2026-09-14 — "we
-- won't derive the profit so let's ignore margins for now, I'd rather just show
-- total revenue" — cancelled the view that was going to stand beside it and explain
-- it. Nothing will now replace it, and it goes on answering "what made me money"
-- to whoever reads it next, who will not have the area 9 brief.
--
-- Under C8.6 that answer is confidently wrong for the pilot's MAIN product line.
-- The merchant touches the phone twice, at purchase and at sale: twelve jabas of
-- 10 kg is `120` typed into `Pollo entero`, and the pieces are sold as `Pechuga`
-- and `Muslo`. So `Pechuga` sells against a ZERO-COST SHORTFALL LOT and renders as
-- 100% margin, while `Pollo entero` is bought and never sold and its cost never
-- enters COGS at all. Rolling up by family does not rescue it — the family's COGS
-- is still zero.
--
-- ⚠️ THE `cost_attributed` COLUMN DOES NOT COVER THIS, which is why the comment is
-- needed rather than redundant. That flag is false when a bucket has revenue and NO
-- sale movements. A despiece line HAS movements — against a shortfall lot whose
-- unit_cost_net_per_base is 0 — so cost_attributed is TRUE and the 100% margin
-- looks fully attributed. This is the one case the honesty column cannot see.
--
-- A `comment on view` and not a fix: migrations are append-only, 0009 is correct
-- for everything that is not a despiece (a shop selling tins has no shortfall lot),
-- and replacing it would break a working answer to fix a different one — B1, and it
-- still stands. The comment is restated in full because `comment on view` replaces
-- rather than appends.

comment on view public.product_margin_daily is
  'Gross margin by product per store per day, net of tax (ADR-035 §2.9). Revenue '
  'from sale_line, cost from the sale movements that consumed the lots FEFO picked '
  '— so margin follows the batch actually sold, not the current purchase price. '
  'Voids need no exclusion: a reversal is a negated document and cancels itself in '
  'the sum. Consolidated is the default (drop location_id from the group by); per '
  'location is the drill-down. Manager-and-above. '
  '⚠️⚠️ READ THIS BEFORE BELIEVING A MARGIN: WHERE A SHOP BUYS ONE THING AND SELLS '
  'ANOTHER, THIS VIEW IS CONFIDENTLY WRONG AND cost_attributed DOES NOT SAY SO. '
  'The app does not model a despiece and does not need to (C8.6): a whole chicken '
  'is typed in as a purchase of Pollo entero and its pieces are sold as Pechuga and '
  'Muslo. The pieces then sell against a zero-cost shortfall lot and report 100% '
  'margin, while Pollo entero is bought and never sold so its cost never reaches '
  'COGS — and rolling up to the family does not rescue it, because the family COGS '
  'is zero too. cost_attributed stays TRUE throughout, because the movements exist '
  'and merely cost nothing. ⚠️ As of the owner''s ruling of 2026-09-14 (plan task '
  '4.6c, area 9, A3) NOTHING WILL REPLACE THIS VIEW: margin was dropped from v1 in '
  'favour of total revenue, which is product_velocity_daily.revenue_gross (0031). '
  'This view is correct for every product bought and sold as itself, and only for '
  'those. See 0009''s header, and docs/PLAN.md task 4.6c.';


-- ----------------------------------------------------------------------------
-- 5. replay_failed_write — ONE SENTENCE OF 0030'S COMMENT, CORRECTED
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE MIGRATION FILE 0030 IS NOT EDITED AND MUST NOT BE. A function comment is
-- APPLIED SCHEMA and migrations are append-only, so the correction is a statement
-- here, in the next migration — which docs/PLAN.md nominated for it on the day the
-- ruling landed, precisely because this task was already going to ship.
--
-- What went stale, hours after 0030 applied: its comment says the manager's
-- blindness to failed_write is "owed to step 5c's dead-letter banner (C11.9)". The
-- owner ruled on 2026-09-14 that the banner is driven by THE DEVICE'S OWN OUTBOX —
-- 5c ships client-generated document uuids for §2.6 idempotency and 0024 decision 7
-- makes failed_write.id BE that uuid, so the client already holds the id of its own
-- failed write before it ever calls the server. Nothing is owed to a server read.
--
-- ⚠️ THE REST OF THE COMMENT IS RESTATED VERBATIM. `comment on function` replaces
-- rather than appends, and 0026's and 0030's reasoning in it is still exactly
-- right — the only edit is the clause below marked "CORRECTED BY 0031".
--
-- ⚠️⚠️ AND THE CORRECTION DELIBERATELY DOES NOT QUOTE THE SENTENCE IT CORRECTS.
-- The first draft did, and supabase/checks/0031's own first run went red on it:
-- the check asserts the stale clause is GONE, and found it inside the paragraph
-- explaining that it had gone. That is this repository's most-repeated guard
-- defect — a check reading the prose that describes the fix — arriving for the
-- fifth time, and the rule 4.6b's ruling stated is the one that applies: NEVER
-- SPELL A CHECK'S SENTINEL IN THE TEXT IT READS. The sentence was changed, not
-- the check, because that is the cheaper half. Do not re-introduce the quotation.

comment on function public.replay_failed_write(uuid) is
  'Recovers one dead letter: compensates the downgrade and re-runs the original '
  'call under its original client uuid, in ONE transaction (ADR-035 §2.6). ⚠️ The '
  'compensation is a REVERSAL MOVEMENT per downgrade movement — same batch, same '
  'cost, dated with the movement it cancels — and NOT a positive '
  'adjust_stock_delta, which would open a zero-cost lot and leave the batch '
  'attribution replay exists to recover in a worse state than the downgrade did '
  '(0026 decision 1). ⚠️ COMPENSATE THEN RE-RUN, in that order: after a downgrade '
  'the shelf is short by the sale''s own quantity, so 0017 would refuse the very '
  'write this recovers. ⚠️ The preserved occurred_at is RECOMPUTED at failed_at, '
  'not read verbatim: failed_write stores no clamped timestamp, only the client''s '
  'unvalidated payload, so a broken till clock would otherwise replay a sale dated '
  '2099 (0026 decision 5). ⚠️⚠️ MANAGER and above, LOOSENED FROM OWNER BY 0030 on '
  'the owner''s ruling C11.4 — the person standing in the shop must be able to fix '
  'a failed write, and C11.2 makes that person a manager. The fence''s argument is '
  'unchanged: §2.6''s replayer reviews a row that can carry COST, and §2.7 puts '
  'cost at manager-and-above, so a cashier still cannot call this. ⚠️⚠️ BUT '
  'failed_write_select IS STILL OWNER-ONLY (0024 decision 8), so a manager may '
  'replay a row she cannot SELECT — named in 0030''s header, and NOT a thing to fix '
  'by quietly widening the policy. ⚠️ CORRECTED BY 0031: 0030 tied that blindness '
  'to step 5c and called a server-side read of failed_write something C11.9 was '
  'owed. That held for a few hours. The owner ruled on 2026-09-14 that the '
  'banner reads THE DEVICE''S OWN OUTBOX: 5c ships client-generated document uuids '
  'for §2.6 idempotency and 0024 decision 7 makes failed_write.id BE that uuid, so '
  'the client knows the id of its own failed write before it calls the server and '
  'needs no server read at all. failed_write_select stays owner-only deliberately, '
  'upholding §2.8 and C10.5; widening it later is undoing that ruling, not '
  'hardening a fence. ⚠️ Idempotent on failed_write.replayed_at: a second call '
  'returns already_replayed and compensates nothing. A purchase or transfer dead '
  'letter has no downgrade to compensate (0024 amendment 2) and simply records the '
  'document that was lost. §2.6, §2.7, §2.8, §2.9, §2.10.';
