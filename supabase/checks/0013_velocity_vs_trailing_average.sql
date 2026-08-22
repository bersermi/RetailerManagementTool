-- ============================================================================
-- What stopped selling — velocity vs a trailing average, over seed data — task 2.3
-- ============================================================================
-- ADR-035 §2.9 (analytics), §3 step 2 (the design gate), §2.5, §2.7
--
-- `0013_velocity_vs_trailing_average.sql` makes four kinds of claim, and only the
-- first is one its two siblings could also make:
--
--   1. the measures reconcile against the ledger to the centavo and to the line —
--      and, more strongly, the measure leg is BIT FOR BIT `product_margin_daily`'s
--      revenue leg, which is how we know the extra machinery is spine and nothing
--      else;
--   2. ⚠️ THE SILENCE IS REPORTED RATHER THAN OMITTED. 91% of this view's rows
--      exist to say that nothing happened. That is the task's "done when" and it is
--      section 3;
--   3. the view does not divide, because there are TWO defensible denominators and
--      they disagree by 17.9% at one store in this seed — section 4;
--   4. it reads `location.timezone` rather than a literal, which 2.4 made binding
--      on this task — section 6. Here moving the zone moves something the other two
--      views do not have: THE SIZE OF THE SPINE.
--
-- ⚠️ UPDATED BY 0014. `0013` shipped with a spine that started at a pair's first
-- TICKET, so a product delivered and never once sold had no row — 71 (store,
-- product) pairs. `0014` starts the spine at the earlier of the first sale and the
-- first stock receipt, which closed that gap WITHOUT the new table `0013`'s header
-- asked for. Every absolute count in this file was re-measured against the view as
-- it now is; the claims that `0013` could only pin as limitations are asserted
-- INVERTED in supabase/checks/0014_velocity_spine_reads_stock.sql.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/
-- -----------------------------------------
-- The reason 1.7, 2.1, 2.2 and 2.4 give: `_cleanup.sql` truncates every table but
-- `unit` before each suite, so the seed is gone before the first one runs and a
-- reconciliation over an empty database is `0 = 0`.
--
-- ⚠️ THIS FILE WRITES TO `location` AND PUTS IT BACK, in section 6, exactly as
-- 0012's file does and for the same reason: a boundary that cannot be moved cannot
-- be shown to be read. The restoration is asserted against a baseline captured
-- before anything moved.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

set client_min_messages = warning;
drop table if exists public._verify cascade;
reset client_min_messages;

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;


-- ================================================== 0. the baseline ==
-- Captured before section 6 moves a store's zone, and asserted back afterwards.

create temp table _base as
select workspace_id, location_id, variant_id, day,
       qty_base_sold, revenue_net, line_count, store_traded,
       trailing_qty_base, trailing_days, trailing_traded_days, trailing_sold_days,
       days_since_last_sale, days_carried
  from public.product_velocity_daily;

select id from location where name = 'Doña Lupe Centro'   \gset centro_
select id from location where name = 'Sucursal Mercado'   \gset mercado_
select id from workspace where display_name = 'Tienda Doña Lupe' \gset wsa_


-- ============================================= 1. pre-flight, as 0012 does ==
-- The seed this file's numbers were read from. Every absolute count below is a
-- statement about THAT ledger; if the seed changed, the counts are stale and
-- saying so loudly is better than a check that quietly measures something else.

select chk('pre-flight: three stores, all still on the column default',
           (select count(*) from location) = 3
       and (select count(*) from location where timezone <> 'America/Mexico_City') = 0);

select chk('pre-flight: the seed still holds 2 263 sale lines over 907 sales',
           (select count(*) from sale_line) = 2263 and (select count(*) from sale) = 907,
           (select (select count(*) from sale_line) || ' lines, '
                || (select count(*) from sale) || ' sales'));

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception
      'PRE-FLIGHT FAILED (% check(s)): the seed is not the one 2.3''s numbers were '
      'read from, so every absolute count in this file is measuring something else. '
      'Re-derive them before trusting a green.', v_failed;
  end if;
end;
$$;


-- ====================================== 2. the measures are the ledger's ==
-- The spine adds rows. It must not add, lose or move a single unit, peso or line.

select chk('reconciles: every base unit the shop sold, and no more',
           (select coalesce(sum(qty_base_sold),0) from product_velocity_daily)
         = (select coalesce(sum(qty_base),0) from sale_line),
           (select 'view ' || coalesce(sum(qty_base_sold),0) from product_velocity_daily));

select chk('reconciles: every peso of net takings, and no more',
           (select coalesce(sum(revenue_net),0) from product_velocity_daily)
         = (select coalesce(sum(line_net),0) from sale_line),
           (select 'view ' || coalesce(sum(revenue_net),0) from product_velocity_daily));

-- ⚠️ 2.1'S RULE: A SUM-ONLY RECONCILIATION CANNOT SEE A DROPPED DOCUMENT, because a
-- void and its original cancel whether both are present or neither is. So the lines
-- are counted, not summed — and every one must land in exactly one bucket.
select chk('reconciles: every sale LINE lands in exactly one bucket — counted, not summed',
           (select coalesce(sum(line_count),0) from product_velocity_daily)
         = (select count(*) from sale_line),
           (select 'view ' || coalesce(sum(line_count),0) || ' vs ledger '
                || (select count(*) from sale_line) from product_velocity_daily));

-- ⚠️ THE STRONGEST FORM OF THE CLAIM, AND THE ONE THAT ANSWERS THE GATE. If the
-- measure leg of this view is identical to 0009's revenue leg wherever 0009 has a
-- row, then everything else in 0013 is spine — not a different reading of the
-- ledger, and not a fifth join doing work. Both directions, so neither view may
-- hold a bucket the other lacks.
select chk('the measure leg IS product_margin_daily''s revenue leg, both directions',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net, line_count
                 from product_velocity_daily where line_count > 0
               except
               select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net, line_count
                 from product_margin_daily where line_count > 0)
              union all
              (select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net, line_count
                 from product_margin_daily where line_count > 0
               except
               select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net, line_count
                 from product_velocity_daily where line_count > 0)) d) = 0);

select chk('reversals need no exclusion here either — 0009''s finding, unchanged',
           pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'reversal_of',
           'a void is a negated document (0003) and every measure here is a sum');


-- ================== 3. ⚠️ THE SILENCE IS A ROW — THE TASK''S "DONE WHEN" ==
-- "A product that never sold in the current window has no row to compare, and the
-- whole question is about absence. The check must prove the view reports the
-- silence rather than omitting it." (docs/PLAN.md, task 2.3)

select chk('the spine is gapless: each (store, product) has one row per calendar day',
           (select count(*) from (
              select workspace_id, location_id, variant_id,
                     count(*) as n, (max(day) - min(day) + 1) as span
                from product_velocity_daily group by 1,2,3) x
             where x.n <> x.span) = 0);

select chk('and it is mostly silence — 28 333 of 30 472 rows say nothing happened',
           (select count(*) from product_velocity_daily) = 30472
       and (select count(*) from product_velocity_daily
                where qty_base_sold = 0 and line_count = 0) = 28333,
           (select count(*) filter (where qty_base_sold = 0 and line_count = 0)
                || ' silent of ' || count(*) || ' rows' from product_velocity_daily));

-- ⚠️ THE FALSIFICATION THAT MATTERS MOST. Ending the spine at the PRODUCT's last
-- sale instead of the STORE's last trading day is the natural mistake, and it is
-- the one that deletes the answer: the view would fall silent about a product
-- exactly when the product fell silent.
create temp view _ends_at_product as
with sold as (
  select sl.workspace_id, sl.location_id, sl.variant_id,
         (s.occurred_at at time zone l.timezone)::date as day
    from sale_line sl
    join sale s on s.id = sl.sale_id and s.workspace_id = sl.workspace_id
                                     and s.location_id  = sl.location_id
    join location l on l.id = sl.location_id and l.workspace_id = sl.workspace_id
   group by 1,2,3,4),
carried as (select workspace_id, location_id, variant_id,
                   min(day) as first_day, max(day) as last_day from sold group by 1,2,3)
select c.workspace_id, c.location_id, c.variant_id, g::date as day
  from carried c cross join lateral generate_series(c.first_day, c.last_day, interval '1 day') g;

select chk('falsified: ending the spine at the product deletes 14 700 rows of silence',
           (select count(*) from product_velocity_daily) - (select count(*) from _ends_at_product) = 14700,
           (select ((select count(*) from product_velocity_daily)
                  - (select count(*) from _ends_at_product))::text || ' rows lost'));

-- The named case, read as a shopkeeper would read it. *Requesón 250 g* at Centro
-- last sold on 2026-07-18, sat through the store's own five-day closure, and sold
-- again on 2026-08-21. On 2026-08-20 the row EXISTS, reports nothing sold, and says
-- how long that has been true — which is the whole product of this migration.
select chk('the named case: Requesón at Centro on 2026-08-20 is a row that reports 34 days of silence',
           (select qty_base_sold = 0 and line_count = 0 and store_traded = false
                                     and days_since_last_sale = 34 and trailing_sold_days = 0
              from product_velocity_daily v
              join product_variant pv on pv.id = v.variant_id
             where v.location_id = :'centro_id' and pv.name = 'Requesón 250 g'
               and v.day = date '2026-08-20'),
           (select 'qty ' || qty_base_sold || ', silent ' || days_since_last_sale
                || 'd, store_traded ' || store_traded
              from product_velocity_daily v join product_variant pv on pv.id = v.variant_id
             where v.location_id = :'centro_id' and pv.name = 'Requesón 250 g'
               and v.day = date '2026-08-20'));

select chk('and it comes back on 2026-08-21 against a trailing baseline of exactly zero',
           (select qty_base_sold = 3 and days_since_last_sale = 0
                                     and trailing_qty_base = 0 and trailing_days = 28
              from product_velocity_daily v
              join product_variant pv on pv.id = v.variant_id
             where v.location_id = :'centro_id' and pv.name = 'Requesón 250 g'
               and v.day = date '2026-08-21'));

select chk('3 215 rows are a product with a FULL window that sold in none of it',
           (select count(*) from product_velocity_daily
             where trailing_days = 28 and trailing_sold_days = 0 and qty_base_sold = 0) = 3215,
           'the population the report exists to rank');

select chk('the longest silence in the shop is 79 days, and it is Tostadas at Centro',
           (select max(days_since_last_sale) from product_velocity_daily) = 79
       and (select pv.name from product_velocity_daily v
              join product_variant pv on pv.id = v.variant_id
             where v.days_since_last_sale = 79) = 'Tostadas 20 pzas');

-- ⚠️ 0011'S FINDING AT SALE GRAIN, WHICH docs/PLAN.md PREDICTED THIS TASK WOULD
-- MEET: "no row" and "a row that nets to nothing" are not the same fact.
-- *Jugo de naranja 1 l* at Sucursal Mercado appeared once, on 2026-06-07, as a sale
-- and its own same-day void. `line_count` 2, `qty_base_sold` 0 — and
-- `days_since_last_sale` NULL, because the product has never yet moved.
select chk('a sale cancelled the same day is line_count 2 and qty 0 — not an absent row',
           (select line_count = 2 and qty_base_sold = 0 and revenue_net = 0
                                  and days_since_last_sale is null
              from product_velocity_daily v join product_variant pv on pv.id = v.variant_id
             where v.location_id = :'mercado_id' and pv.name = 'Jugo de naranja 1 l'
               and v.day = date '2026-06-07'));

-- ⚠️ 6 212 SINCE 0014, AND THE JUMP IS THE FIX ITSELF. Before 0014 this was 8 rows,
-- all of them Jugo de naranja's. Now it also covers every day of every pair that has
-- stock and has never sold at all — which is precisely the population 0013 could not
-- see. 25 of the rows are still Jugo's, whose spine now starts at its first receipt
-- (2026-05-21) rather than at its voided first ticket (2026-06-07).
select chk('NULL days_since_last_sale means "has never moved here", and it is 6 212 rows',
           (select count(*) from product_velocity_daily where days_since_last_sale is null) = 6212
       and (select bool_and(qty_base_sold <= 0) from product_velocity_daily
             where days_since_last_sale is null),
           (select count(*) || ' rows have never seen this product move at this store'
              from product_velocity_daily where days_since_last_sale is null));

select chk('every pair''s first spine day has trailing_days = 0 — nothing to compare yet',
           (select count(*) from product_velocity_daily where trailing_days = 0) = 510
       and (select count(*) from (
              select workspace_id, location_id, variant_id from product_velocity_daily
               group by 1,2,3) p) = 510);


-- ============================ 4. ⚠️ IT DOES NOT DIVIDE, AND HERE IS WHY ==
-- 0011 withheld its rate because the two sides were different documents days apart.
-- This view withholds its rate for a different reason: there are TWO honest
-- denominators, they disagree, and picking one in the view body would hide a store
-- closure inside every product's average.

select chk('Centro really did stop selling for five consecutive days',
           (select count(*) from generate_series(date '2026-08-16', date '2026-08-20', interval '1 day') g
             where exists (select 1 from sale s
                             join location l on l.id = s.location_id
                            where s.location_id = :'centro_id'
                              and (s.occurred_at at time zone l.timezone)::date = g::date)) = 0
       and (select count(*) from purchase p join location l on l.id = p.location_id
             where p.location_id = :'centro_id'
               and (p.occurred_at at time zone l.timezone)::date
                   between date '2026-08-16' and date '2026-08-20') = 0);

select chk('so on 2026-08-21 a full window is 28 calendar days but only 23 traded ones',
           (select bool_and(trailing_traded_days = 23) from product_velocity_daily
             where location_id = :'centro_id' and day = date '2026-08-21' and trailing_days = 28)
       and (select count(*) from product_velocity_daily
             where location_id = :'centro_id' and day = date '2026-08-21' and trailing_days = 28) > 0,
           '23/28 — an average over the calendar denominator is 17.9% lower for '
        || 'every product in the shop, on a day no product changed');

-- ⚠️ RATIOS DO NOT ADD — 0011'S ASSERTION, RE-MADE FOR THIS MEASURE. Three ways to
-- answer "how fast is this shop selling", one of which is simply wrong.
select chk('ratios do not add: avg() of the per-product rates is not the shop''s rate',
           (select round(avg(trailing_qty_base / trailing_traded_days), 6)
              from product_velocity_daily
             where location_id = :'centro_id' and day = date '2026-08-21'
               and trailing_traded_days > 0) = 15.651352
       and (select round(sum(trailing_qty_base) / sum(trailing_traded_days), 6)
              from product_velocity_daily
             where location_id = :'centro_id' and day = date '2026-08-21'
               and trailing_traded_days > 0) = 14.554465,
           'avg of rates 15.651352, rate of sums 14.554465 — the two disagree, and '
        || 'only the second is the shop''s actual rate');

select chk('and the two denominators give two different, both-honest answers',
           (select round(sum(trailing_qty_base) / sum(trailing_days), 6)
              from product_velocity_daily
             where location_id = :'centro_id' and day = date '2026-08-21'
               and trailing_days > 0) = 11.786939,
           'per calendar day 11.786939 vs per traded day 14.554465 — the view '
        || 'ships both denominators and divides neither');

select chk('the view ships no rate column at all',
           (select count(*) from information_schema.columns
             where table_schema = 'public' and table_name = 'product_velocity_daily'
               and (column_name like '%rate%' or column_name like '%avg%'
                    or column_name like '%ratio%')) = 0);

-- Every MEASURE adds across a location rollup, which is what makes "consolidated"
-- a `group by` the caller drops (§2.9, 2.1's binding rule).
select chk('consolidated and per-store agree to the unit, the peso and the line',
           (select coalesce(sum(qty_base_sold),0) from product_velocity_daily
             where workspace_id = :'wsa_id')
         = (select coalesce(sum(x.q),0) from (
              select location_id, sum(qty_base_sold) as q from product_velocity_daily
               where workspace_id = :'wsa_id' group by 1) x)
       and (select coalesce(sum(revenue_net),0) from product_velocity_daily
             where workspace_id = :'wsa_id')
         = (select coalesce(sum(x.r),0) from (
              select location_id, sum(revenue_net) as r from product_velocity_daily
               where workspace_id = :'wsa_id' group by 1) x));

-- ⚠️ AND THE TWO NON-MEASURES DO NOT ADD, which the view's comments say and this
-- demonstrates. A product silent 3 days at one store and 40 at another has not been
-- silent 43 days anywhere.
select chk('days_since_last_sale rolls up as a MIN, never a sum — demonstrated',
           (select count(*) from (
              select variant_id, day, min(days_since_last_sale) as m,
                     sum(days_since_last_sale) as s
                from product_velocity_daily where workspace_id = :'wsa_id'
                 and days_since_last_sale is not null
               group by 1,2 having count(*) > 1) x
             where x.s > x.m) > 0,
           'so a consolidated report must take the min, and the column comment says so');


-- ======================================== 5. §2.5 and 2.1's other rules ==

select chk('unit conversion never appears — §2.5 did it at write time',
           pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'qty_display'
       and pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'factor');

select chk('nothing is rounded — round once, at the edge (2.1''s rule)',
           pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'round\s*\(');

select chk('names come from the catalog, money from the line — a rename renames history',
           (select count(*) from product_velocity_daily v
             join product_variant pv on pv.id = v.variant_id and pv.workspace_id = v.workspace_id
            where v.variant_name <> pv.name) = 0
       and pg_get_viewdef('public.product_velocity_daily'::regclass) ~* 'v\.name');

select chk('the grain is day x location x variant, so §2.9''s rollup is select * from it',
           (select count(*) from (
              select workspace_id, location_id, variant_id, day
                from product_velocity_daily group by 1,2,3,4 having count(*) > 1) x) = 0);

select chk('it is a security_invoker view, and it is the only object 0013 ships',
           (select c.reloptions::text from pg_class c
             where c.oid = 'public.product_velocity_daily'::regclass) like '%security_invoker=true%'
       and (select count(*) from pg_class where relname like 'product_velocity%') = 1);


-- ============================== 6. it reads location.timezone (2.4, binding) ==
-- ⚠️ AND IT MOVES SOMETHING THE OTHER TWO VIEWS DO NOT HAVE. Moving a store's zone
-- moves that store's first and last TRADING DAY, so the spine itself changes size —
-- 12 602 rows at Centro become 12 624. No other view in the repo has a row count
-- that depends on the boundary.
--
-- The zone is absurd on purpose. 0012 pinned the reason: this seed trades
-- 09:00-20:40 UTC, a window no Mexican zone can straddle a midnight of, so no
-- realistic zone moves a SALE here. `Pacific/Kiritimati` (UTC+14) proves the view
-- READS THE COLUMN; it does not pretend to be a customer.

select chk('day: the view hardcodes no zone — it reads location.timezone',
           pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'AT TIME ZONE ''[A-Za-z]+/'
       and pg_get_viewdef('public.product_velocity_daily'::regclass) ~* 'timezone');

update location set timezone = 'Pacific/Kiritimati' where id = :'centro_id';

select chk('an extreme zone moves that store''s buckets, so the view reads the column',
           (select count(*) from (
              select variant_id, day, qty_base_sold from product_velocity_daily
               where location_id = :'centro_id'
              except
              select variant_id, day, qty_base_sold from _base
               where location_id = :'centro_id') d) = 1999,
           (select count(*) || ' Centro rows differ at UTC+14' from (
              select variant_id, day, qty_base_sold from product_velocity_daily
               where location_id = :'centro_id'
              except
              select variant_id, day, qty_base_sold from _base
               where location_id = :'centro_id') d));

select chk('⚠️ and the SPINE changes size, which only this view can show',
           (select count(*) from product_velocity_daily where location_id = :'centro_id') = 15343
       and (select count(*) from _base where location_id = :'centro_id') = 15099,
           'the store''s first and last trading day both move, so the generated '
        || 'range is 244 rows longer');

select chk('and nothing at all moves at the other two stores',
           (select count(*) from (
              select * from _base where location_id <> :'centro_id'
              except
              select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net,
                     line_count, store_traded, trailing_qty_base, trailing_days,
                     trailing_traded_days, trailing_sold_days, days_since_last_sale, days_carried
                from product_velocity_daily where location_id <> :'centro_id') d) = 0);

select chk('and not one unit, peso or line is created or destroyed by the move',
           (select coalesce(sum(qty_base_sold),0) from product_velocity_daily)
         = (select coalesce(sum(qty_base_sold),0) from _base)
       and (select coalesce(sum(revenue_net),0) from product_velocity_daily)
         = (select coalesce(sum(revenue_net),0) from _base)
       and (select coalesce(sum(line_count),0) from product_velocity_daily)
         = (select coalesce(sum(line_count),0) from _base));

select chk('all three analytics views bucket the moved store in the SAME zone, from one column',
           (select count(*) from product_velocity_daily d
             where d.location_id = :'centro_id' and d.line_count > 0
               and not exists (select 1 from sale s
                                where s.location_id = d.location_id
                                  and (s.occurred_at at time zone 'Pacific/Kiritimati')::date = d.day)) = 0
       and (select count(*) from product_margin_daily d
             where d.location_id = :'centro_id'
               and not exists (select 1 from sale s
                                where s.location_id = d.location_id
                                  and (s.occurred_at at time zone 'Pacific/Kiritimati')::date = d.day)) = 0);

update location set timezone = 'America/Mexico_City' where id = :'centro_id';


-- ================= 7. ⚠️ WHAT THIS VIEW CANNOT SEE, PINNED RATHER THAN OMITTED ==
-- Every one of these is a bound. Each is at its exact value today, so the day the
-- seed grows the case, the check goes red and somebody reads the paragraph in
-- 0013's header instead of trusting a report that cannot answer.

-- ⚠️ FIXED IN 0014, AND THESE THREE CHECKS ARE NOW ASSERTED INVERTED. `0013`
-- shipped a spine that started at a pair's first TICKET, so a product delivered and
-- never once sold had no row — 71 (store, product) pairs — and `0013`'s header
-- concluded the fix was a new per-(location, variant) "carried from" table.
--
-- That conclusion was wrong: ADR-035 §2.9 settled on 2026-08-14 that "stock is
-- already per location, which covers 'we don't carry that here' without splitting
-- anything", and it was right. `0014` starts the spine at the earlier of the first
-- sale and the first stock receipt, read from `batch_balance`, and the gap closes to
-- zero with no new table. The full claim is made in
-- supabase/checks/0014_velocity_spine_reads_stock.sql; what stays here is the
-- one-line statement that the gap this file was written to pin is gone.

select chk('the gap 0013 pinned at 71 pairs is CLOSED — 0014, no new table needed',
           (select count(*) from (
              select distinct workspace_id, location_id, variant_id from purchase_line
              except
              select distinct workspace_id, location_id, variant_id from product_velocity_daily) x) = 0,
           'delivered-and-never-sold pairs invisible to the view: was 71, now 0');

-- The store-wide blind spot, stated in 0013's header and pinned here.
select chk('⚠️ no store has a delivery or a write-off AFTER its last selling day — the bound',
           (select count(*) from (
              select p.location_id, (p.occurred_at at time zone l.timezone)::date as d
                from purchase p join location l on l.id = p.location_id
              union all
              select w.location_id, (w.occurred_at at time zone l.timezone)::date
                from waste w join location l on l.id = w.location_id) e
             join (select location_id, max(day) as last_day
                     from product_velocity_daily group by 1) t using (location_id)
            where e.d > t.last_day) = 0,
           'when this stops being 0, a store''s spine is ending before the store '
        || 'did and the silence that matters most has become invisible');

-- `store_traded` is defined from sales alone. 9 days in this seed had a delivery or
-- a write-off and no sale, and they are counted as not traded. Pinned so the
-- definition cannot drift without a number moving.
select chk('⚠️ store_traded is the TILL, not the door: 9 ledger days had no sale',
           (select count(*) from (
              select p.workspace_id, p.location_id, (p.occurred_at at time zone l.timezone)::date as d
                from purchase p join location l on l.id = p.location_id
              union
              select w.workspace_id, w.location_id, (w.occurred_at at time zone l.timezone)::date
                from waste w join location l on l.id = w.location_id
              except
              select s.workspace_id, s.location_id, (s.occurred_at at time zone l.timezone)::date
                from sale s join location l on l.id = s.location_id) x) = 9);

-- ⚠️ TWO FALSIFICATIONS THIS SEED CANNOT MAKE, recorded rather than papered over —
-- 2.1 and 2.2 both did this, and a falsification table with only successes in it is
-- the more misleading artefact.

-- (a) RANGE weakened to ROWS. Identical over this seed because the spine is
-- gapless by construction, which is asserted in section 3. RANGE is still right:
-- it states the frame in days, so it survives a spine that ever acquires a gap.
select chk('⚠️ cannot falsify: RANGE vs ROWS is invisible while the spine is gapless',
           (select count(*) from (
              select workspace_id, location_id, variant_id, count(*) as n,
                     (max(day) - min(day) + 1) as span
                from product_velocity_daily group by 1,2,3) x
             where x.n <> x.span) = 0,
           'the gapless spine makes the two frames agree on every row; the check '
        || 'that would go red is this precondition, pinned at 0');

-- (b) trailing_sold_days counting `<> 0` instead of `> 0`. 0011 found that a
-- window can net to a NEGATIVE when a void lands later than its original. At day
-- grain over SALES that never happens in this seed: 2.1 recorded that every sale
-- void lands minutes after its original on the same local day, and this is the
-- arithmetic consequence.
select chk('⚠️ cannot falsify: no sale day-bucket is negative, so > 0 and <> 0 agree',
           (select count(*) from product_velocity_daily where qty_base_sold < 0) = 0
       and (select count(*) from product_velocity_daily where trailing_qty_base < 0) = 0,
           'every sale void lands on its original''s local day (2.1); the day one '
        || 'does not, this goes red and the > 0 guard starts earning its keep');


-- =========================================== 8. access (§2.7), as a cashier ==
-- docs/PLAN.md, Settled in 2.1: "2.3 joins sale_line to nothing costed and does not
-- need the gate at all — which is worth checking rather than assuming, because the
-- answer differs per view." Checked, and the prediction holds.
--
-- ⚠️ THE CLAIM IS STRONGER THAN "THE CASHIER SEES SOMETHING". 0009 had to gate
-- because inheritance across a mixed-visibility join gives a cashier a WRONG NUMBER.
-- Here the cashier's rows must be EXACTLY the manager's Centro rows — same spine,
-- same measures, same silences — which is what proves inheritance narrows the view
-- without distorting it.

select id from auth.users where email = 'caja.centro@tienda.mx'  \gset staff_
select id from auth.users where email = 'rosa.gerente@tienda.mx' \gset mgr_
select id from auth.users where email = 'roble.owner@tienda.mx'  \gset ownerb_

create temp table _mgr_centro as
select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net,
       line_count, store_traded, trailing_qty_base, trailing_days,
       trailing_traded_days, trailing_sold_days, days_since_last_sale, days_carried
  from public.product_velocity_daily where location_id = :'centro_id';
grant select on _mgr_centro to authenticated;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'staff_id'), true);
set local role authenticated;

select chk('access: a cashier READS this view — no manager gate, and none is owed',
           (select count(*) from product_velocity_daily) = 15099,
           (select count(*) || ' rows' from product_velocity_daily));

select chk('access: and only their own store, by RLS rather than by a predicate',
           (select count(distinct location_id) from product_velocity_daily) = 1
       and (select count(*) from product_velocity_daily
             where location_id <> :'centro_id') = 0);

select chk('access: and the rows are EXACTLY the manager''s Centro rows — narrowed, not distorted',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net,
                      line_count, store_traded, trailing_qty_base, trailing_days,
                      trailing_traded_days, trailing_sold_days, days_since_last_sale, days_carried
                 from product_velocity_daily
               except select * from _mgr_centro)
              union all
              (select * from _mgr_centro
               except
               select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net,
                      line_count, store_traded, trailing_qty_base, trailing_days,
                      trailing_traded_days, trailing_sold_days, days_since_last_sale, days_carried
                 from product_velocity_daily)) d) = 0);

select chk('access: nothing costed is reachable through it — the reason no gate is owed',
           pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'stock_movement'
       and pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'unit_cost'
       and (select count(*) from stock_movement) = 0,
           'the same cashier reads 0 rows of stock_movement, which is why 0009 '
        || 'needed a predicate and this does not');
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'mgr_id'), true);
set local role authenticated;

select chk('access: a manager sees both of their stores, so the rollup is theirs to make',
           (select count(*) from product_velocity_daily) = 28433
       and (select count(distinct location_id) from product_velocity_daily) = 2
       and (select count(*) from product_velocity_daily where workspace_id <> :'wsa_id') = 0);
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'ownerb_id'), true);
set local role authenticated;

select chk('access: the other tenant''s owner sees none of the first tenant''s velocity',
           (select count(*) from product_velocity_daily) = 2039
       and (select count(*) from product_velocity_daily where workspace_id = :'wsa_id') = 0);
commit;


-- ============================== 9. everything is exactly as it was ==

select chk('restored: every store carries the zone it started with',
           (select count(*) from location where timezone <> 'America/Mexico_City') = 0,
           (select string_agg(name || '=' || timezone, ', ' order by name) from location));

select chk('restored: the view is identical to the baseline, both ways',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net,
                      line_count, store_traded, trailing_qty_base, trailing_days,
                      trailing_traded_days, trailing_sold_days, days_since_last_sale, days_carried
                 from product_velocity_daily
               except select * from _base)
              union all
              (select * from _base
               except
               select workspace_id, location_id, variant_id, day, qty_base_sold, revenue_net,
                      line_count, store_traded, trailing_qty_base, trailing_days,
                      trailing_traded_days, trailing_sold_days, days_since_last_sale, days_carried
                 from product_velocity_daily)) d) = 0);

-- ⚠️ THE CHECK THAT COUNTS THE CHECKS. `_verify.n` is a serial and a sequence is
-- non-transactional, so a `chk()` recorded inside a block that later ROLLED BACK
-- burns its number and leaves a gap — the section would delete its own results and
-- the file would still report "all N passed" with a quietly smaller N. 0012's file
-- shipped with exactly that bug for one draft; every access section above uses
-- `begin ... commit` for that reason, and this makes it structural.
select chk('this file did not throw away any of its own results',
           (select max(n) from public._verify) = (select count(*) from public._verify),
           (select 'highest number ' || max(n) || ', rows ' || count(*) from public._verify));


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception '% velocity check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % velocity checks passed', (select count(*) from public._verify);
end;
$$;
