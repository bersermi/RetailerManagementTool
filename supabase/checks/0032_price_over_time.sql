-- ============================================================================
-- How my prices have moved — 0032, plan task 4.6c-ii
-- ============================================================================
-- ADR-035 §2.9 (analytics), §2.7 (access), §2.5 (units and money)
--
-- Nine claims:
--
--   1. ⚠️⚠️ THIS TASK NEEDED NO NEW VIEW, AND THREE COPIES SAID IT DID. They
--      were written on 2026-09-13 and product_purchases_daily was created on
--      2026-09-14 — so "needs a view" was true when written and stopped being
--      true the day before this task was taken — section 2;
--   2. the two replaces added four columns each and moved NOT ONE ROW AND NOT
--      ONE PESO of what 0013, 0014 and 0031 already returned — section 3;
--   3. the EFFECTIVE price is the ratio of two columns on its own row, so a
--      rollup recomputes it exactly and never has to average a price — and the
--      seed holds the 0-over-0 buckets that are the reason it lives in the view
--      rather than in a client — section 4;
--   4. the TYPED price is one line's value, picked by a THREE-DEEP total
--      ordering, and its gross comes off the SAME line — section 5;
--   5. ⚠️ the two disagree in 736 of 1 048 purchase buckets that hold exactly
--      ONE line each, which is arithmetic and not a defect — section 6;
--   6. reversals: 23 wholly negative purchase buckets, every one reporting a
--      POSITIVE price — section 7;
--   7. the fences did not move and did not need to. A cashier reads sale prices
--      (she always could) and ZERO rows of the purchases view — asserted under
--      `set role authenticated` as a cashier, a manager and the other
--      workspace's owner — section 8;
--   8. ⚠️⚠️ THREE APPLIED CHECKS WOULD HAVE STAYED GREEN WHILE THEIR CLAIMS
--      DIED, because each tests a list of column NAMES. They are re-cut in this
--      commit and this file asserts the re-cut versions from the other side —
--      section 9;
--   9. ⚠️ what this seed CANNOT falsify, pinned rather than papered over, and
--      the price card proved to work on a product that actually moved — 
--      section 10.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/ — `_cleanup.sql` truncates every
-- table but `unit` before each suite, so the seed is gone before the first one
-- runs, and a price over an empty ledger asserts nothing at all. Same reason
-- 0031, 0014, 0013, 0011 and 0009 give.
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

select id from location where name = 'Doña Lupe Centro' \gset centro_


-- ================================================= 1. pre-flight ==
-- These numbers were read from THIS seed. If it changed, every count below is a
-- claim about a database nobody has.
--
-- ⚠️ `passed` is asserted with `is not true` at the foot of this file rather than
-- with `not passed`: a null condition is a check that did not run, and `not null`
-- is null, so a null would otherwise be counted as a pass.

select chk('pre-flight: 1 048 purchase lines, 2 263 sale lines, both sides carrying a typed unit price',
           (select count(*) from purchase_line) = 1048
       and (select count(*) from sale_line)     = 2263
       and (select count(*) from purchase_line where unit_price_net_per_base is null) = 0
       and (select count(*) from sale_line     where unit_price_net_per_base is null) = 0);

-- ⚠️⚠️ THE PLAN'S REASON FOR READING THE LEDGER IS FALSE, AND THE REAL REASON IS
-- STRONGER. docs/PLAN.md's N3 row says in bold that price_list "is EMPTY in the
-- seed (0 rows)", and supabase/README.md's planned 0032 entry repeats it. It holds
-- 390 rows over 341 variants, it is a TEMPORAL table — effective_from,
-- effective_to, a generated daterange and a no-overlap exclusion constraint — and
-- it covers every sale bucket in the ledger. It is, structurally, a price history.
--
-- ADR-035 §2.9 gives the reason that is actually true: "that table holds the
-- INTENDED price". Measured below: the price a manager intended and the price the
-- till charged disagree in 1 050 of 2 139 buckets. A card built on price_list
-- would disagree with the receipt roughly half the time.
select chk('⚠️⚠️ price_list is NOT empty — 390 rows, 341 variants, and it is a dated range table',
           (select count(*) from price_list) = 390
       and (select count(*) from price_list where effective_to is null) = 387
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='price_list'
               and column_name in ('effective_from','effective_to','valid_period')) = 3,
           (select 'rows ' || count(*) || ', variants ' || count(distinct variant_id)
                || ', effective_from ' || min(effective_from) || '..' || max(effective_from)
              from price_list));

select chk('⚠️⚠️ AND IT COVERS EVERY SALE BUCKET WHILE DISAGREEING WITH 1 050 OF 2 139 OF THEM',
           (select count(*) from product_velocity_daily a
             where a.line_count > 0
               and not exists (select 1 from price_list p
                                where p.workspace_id = a.workspace_id
                                  and p.variant_id   = a.variant_id
                                  and a.day >= p.effective_from
                                  and (p.effective_to is null or a.day < p.effective_to))) = 0
       and (select count(*) from product_velocity_daily a
              join price_list p
                on  p.workspace_id = a.workspace_id and p.variant_id = a.variant_id
                and p.location_id is null
                and a.day >= p.effective_from
                and (p.effective_to is null or a.day < p.effective_to)
             where a.line_count > 0
               and round(a.sale_price_last_net,4) <> round(p.price_per_base,4)) = 1050,
           'the INTENDED price and the price the till actually charged are different '
        || 'facts, and this is what says so. §2.9''s "read from the ledger, not from '
        || 'price_list" is right for the reason the ADR gives and not for the reason '
        || 'the plan gave');

select chk('pre-flight: the only tax rates in the ledger are 0% and 16%',
           (select array_agg(distinct round(tax_rate,4) order by round(tax_rate,4)) from purchase_line)
         = array[0.0000, 0.1600]::numeric[]);


-- ========== 2. NO NEW VIEW, AND THE COPIES THAT SAID OTHERWISE WERE STALE ==
-- ⚠️⚠️ docs/PLAN.md's N3 row, its 4.6c split table and supabase/README.md's
-- planned 0032 entry all say this task "needs a view". All three were written on
-- 2026-09-13. product_purchases_daily was created by 0031 on 2026-09-14 — the day
-- before this task was taken — and between it and product_velocity_daily every
-- column a price needs except the price was already standing at the right grain.
--
-- A new view would have been two supersets of two applied views. N1's ruling of
-- 2026-09-14 refused that exact shape for that exact reason, one day earlier.

-- ⚠️⚠️ RE-CUT 2026-09-14 BY 0033, AND THE RE-CUT IS THE WHOLE POINT. This check
-- read "0032 created NO view" and asserted it as a COUNT of the views in public
-- (= 5). It went red the moment 0033 added transaction_export — correctly, as a
-- count, and uselessly as a claim, because the cheap repair is to bump 5 to 6 and
-- **that would hand the ruling away**: with a bare count, a later session
-- splitting the price into a view of its own passes by bumping the number again.
--
-- ⚠️ THE OWNER RULED ON 2026-09-14: *"leave it on the two views."* A count of
-- views cannot hold that. The property can, and it is the ruling written out: the
-- eight price-over-time columns live on the two views that own each side of the
-- ledger, and NO OTHER VIEW CARRIES ONE. That survives any number of unrelated
-- views landing — 0033's did — and goes red on exactly the change the ruling
-- forbids.
--
-- ⚠️ `unit_price_net_per_base` is deliberately NOT matched: it is a stored LEDGER
-- column that provider_price_memory and transaction_export both surface as-is, and
-- it is not a price-over-time series. N3 already drew that line — 0008 is "the LAST
-- purchase price only, not a history".
select chk('⚠️⚠️ THE OWNER''S RULING, HELD AS A PROPERTY: the price series lives on those two views and nowhere else',
           (select count(*) from information_schema.columns c
              join pg_class k on k.relname = c.table_name
              join pg_namespace n on n.oid = k.relnamespace and n.nspname = 'public'
             where c.table_schema = 'public' and k.relkind = 'v'
               and (c.column_name like '%\_price\_net' or c.column_name like '%\_price\_gross'
                    or c.column_name like '%\_price\_last\_%')) = 8
       and (select count(*) from information_schema.columns c
              join pg_class k on k.relname = c.table_name
              join pg_namespace n on n.oid = k.relnamespace and n.nspname = 'public'
             where c.table_schema = 'public' and k.relkind = 'v'
               and c.table_name not in ('product_purchases_daily','product_velocity_daily')
               and (c.column_name like '%\_price\_net' or c.column_name like '%\_price\_gross'
                    or c.column_name like '%\_price\_last\_%')) = 0
       and (select count(*) from pg_policies where schemaname='public') = 41,
           (select string_agg(c.table_name || '.' || c.column_name, ', '
                              order by c.table_name, c.column_name)
              from information_schema.columns c
              join pg_class k on k.relname = c.table_name
              join pg_namespace n on n.oid = k.relnamespace and n.nspname = 'public'
             where c.table_schema='public' and k.relkind='v'
               and (c.column_name like '%\_price\_net' or c.column_name like '%\_price\_gross'
                    or c.column_name like '%\_price\_last\_%')));

select chk('and the two views it replaced are the two that already owned each side of the ledger',
           pg_get_viewdef('public.product_purchases_daily'::regclass) ~* 'purchase_line'
       and pg_get_viewdef('public.product_purchases_daily'::regclass) !~* 'sale_line'
       and pg_get_viewdef('public.product_velocity_daily'::regclass)  ~* 'sale_line'
       and pg_get_viewdef('public.product_velocity_daily'::regclass)  !~* 'purchase_line',
           'neither view reaches across the ledger, which is what makes each one '
        || 'inherit exactly one fence and state none of its own');


-- ========== 3. WHAT DID NOT CHANGE, WHICH IS THE RISK OF A `create or replace` ==
-- Both views are applied and both are read. A replace that quietly moved a number
-- somebody already reads is the failure this section exists to exclude.

select chk('velocity: 4 columns added and not one row — still 30 472 rows over 510 pairs, now 26 columns',
           (select count(*) from product_velocity_daily) = 30472
       and (select count(*) from (select workspace_id, location_id, variant_id
                                    from product_velocity_daily group by 1,2,3) x) = 510
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='product_velocity_daily') = 26);

select chk('velocity: not one peso — revenue_net 138 673.24, revenue_gross 147 581.88, tax 8 908.64',
           (select sum(revenue_net)   from product_velocity_daily) = 138673.24
       and (select sum(revenue_gross) from product_velocity_daily) = 147581.88
       and (select sum(tax_collected) from product_velocity_daily) = 8908.64
       and (select sum(revenue_net)   from product_velocity_daily)
         = (select sum(line_net)      from sale_line));

select chk('purchases: 4 columns added and not one row — still 1 048 rows, now 17 columns',
           (select count(*) from product_purchases_daily) = 1048
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='product_purchases_daily') = 17);

select chk('purchases: not one peso — net 623 384.19, gross 659 766.19, and it still equals the ledger',
           (select sum(purchases_net)   from product_purchases_daily) = 623384.19
       and (select sum(purchases_gross) from product_purchases_daily) = 659766.19
       and (select sum(purchases_net)   from product_purchases_daily)
         = (select sum(line_net)        from purchase_line));

select chk('0031''s row-for-row agreement with product_margin_daily survives both replaces',
           (select count(*) from product_velocity_daily v
              join product_margin_daily m
                using (workspace_id, location_id, variant_id, day)
             where v.tax_collected is distinct from m.tax_collected
                or v.revenue_net   is distinct from m.revenue_net) = 0);

select chk('and 0014''s spine still stands: 28 343 rows are days this product did not sell',
           (select count(*) from product_velocity_daily where qty_base_sold = 0) = 28343
       and (select count(*) from product_velocity_daily where line_count = 0)    = 28333,
           'the ten-row gap is the cancelled buckets — see section 4');

select chk('nothing in either view rounds, so no two rollups can disagree by a centavo',
           pg_get_viewdef('public.product_velocity_daily'::regclass)  !~* 'round\s*\('
       and pg_get_viewdef('public.product_purchases_daily'::regclass) !~* 'round\s*\(');


-- ========== 4. THE EFFECTIVE PRICE, AND WHY THE DIVISION IS IN THE VIEW ==
-- The claim is not "the view divides". It is that the divisor sits on the row
-- beside the answer, so any rollup recomputes the price exactly — which is what
-- separates a price from the delivery count 0031 refused for being non-additive.

select chk('the effective price IS the two columns beside it, divided — every row, both sides',
           (select count(*) from product_purchases_daily
             where purchase_price_net   is distinct from purchases_net   / nullif(purchases_qty_base,0)
                or purchase_price_gross is distinct from purchases_gross / nullif(purchases_qty_base,0)) = 0
       and (select count(*) from product_velocity_daily
             where sale_price_net   is distinct from revenue_net   / nullif(qty_base_sold,0)
                or sale_price_gross is distinct from revenue_gross / nullif(qty_base_sold,0)) = 0,
           'the row''s own arithmetic is the definition, so the price cannot drift '
        || 'from the money and the quantity it is computed from');

select chk('⚠️⚠️ TEN SALE BUCKETS HAVE EXACTLY ZERO QUANTITY AND A POSITIVE LINE COUNT',
           (select count(*) from product_velocity_daily
             where qty_base_sold = 0 and line_count > 0) = 10
       and (select count(*) from product_velocity_daily
             where qty_base_sold = 0 and line_count > 0 and sale_price_net is not null) = 0,
           'a sale rung up and voided inside §2.6''s 15-minute window leaves two '
        || 'lines that cancel. A client dividing for itself raises division_by_zero '
        || 'on these rows — which is the concrete reason nullif is in the view');

select chk('and the spine''s quiet days have NO price rather than a price of zero — 28 343 of them',
           (select count(*) from product_velocity_daily where sale_price_net is null) = 28343
       and (select count(*) from product_velocity_daily where sale_price_net = 0) = 0
       and (select count(*) from product_velocity_daily where sale_price_last_net = 0) = 0,
           'coalescing these to 0 would draw the price line through the floor on '
        || 'every closed day and report it as a 100% discount');

select chk('⚠️ AND THE 0-OVER-0 IS NOT ONLY A DAILY PROBLEM: 10 variant-MONTHS of purchases also net to zero',
           (select count(*) from (select variant_id, date_trunc('month', day) mo,
                                         sum(purchases_qty_base) q
                                    from product_purchases_daily group by 1,2) m
             where q = 0) = 10
       and (select count(*) from product_purchases_daily where purchase_price_net is null) = 0,
           'the daily purchases view has no null price at all, and a caller rolling '
        || 'up to a month hits the same division by zero the view protects it from '
        || 'daily. The rollup instruction in the view comment carries nullif for '
        || 'this reason, and it is not decoration');

-- ⚠️ THE ROLLUP CLAIM, MEASURED RATHER THAN ASSERTED IN PROSE. A month price
-- computed by summing the components equals the same month recomputed straight
-- off the ledger; a month price computed by AVERAGING the daily prices does not.
with from_view as (
  select variant_id, date_trunc('month', day)::date mo,
         sum(purchases_net) / nullif(sum(purchases_qty_base),0) as summed_then_divided,
         avg(purchase_price_net)                                as averaged
    from product_purchases_daily group by 1,2),
from_ledger as (
  select pl.variant_id, date_trunc('month', (p.occurred_at at time zone l.timezone)::date)::date mo,
         sum(pl.line_net) / nullif(sum(pl.qty_base),0) as straight_from_the_ledger
    from purchase_line pl
    join purchase p on p.id = pl.purchase_id
    join location l on l.id = pl.location_id
   group by 1,2)
select chk('SUM THEN DIVIDE recomputes the month exactly; AVERAGING THE DAILY PRICES does not',
           (select count(*) from from_view v join from_ledger g using (variant_id, mo)
             where v.summed_then_divided is distinct from g.straight_from_the_ledger) = 0
       and (select count(*) from from_view v join from_ledger g using (variant_id, mo)
             where round(coalesce(v.averaged,0),6)
                is distinct from round(coalesce(g.straight_from_the_ledger,0),6)) > 0,
           (select 'variant-months where the mean of daily prices is the WRONG number: '
                || count(*)::text from from_view v join from_ledger g using (variant_id, mo)
             where round(coalesce(v.averaged,0),6)
                is distinct from round(coalesce(g.straight_from_the_ledger,0),6)));

select chk('⚠️ AND A FAMILY PRICE IS NOT A ROLLUP — the seed holds families mixing kg with pieces',
           (select count(*) from (select family_id from product_variant
                                   group by 1 having count(distinct base_unit_code) > 1) f) > 0,
           (select 'families whose variants do not share a base unit: ' || count(*)::text
              || ' — summing their money over their summed quantity divides pesos '
              || 'by a total of kilos and pieces, which is why the price columns are '
              || 'the only ones on these views that are NOT a group by away from a '
              || 'family number'
              from (select family_id from product_variant
                     group by 1 having count(distinct base_unit_code) > 1) f));


-- ========== 5. THE TYPED PRICE: ONE LINE, PICKED BY A TOTAL ORDERING ==

select chk('the typed price is a value that actually appears on a line, never a combination',
           (select count(*) from product_purchases_daily d
             where d.purchase_price_last_net is not null
               and not exists (select 1 from purchase_line pl
                                where pl.workspace_id = d.workspace_id
                                  and pl.location_id  = d.location_id
                                  and pl.variant_id   = d.variant_id
                                  and pl.unit_price_net_per_base = d.purchase_price_last_net)) = 0
       and (select count(*) from product_velocity_daily d
             where d.sale_price_last_net is not null
               and not exists (select 1 from sale_line sl
                                where sl.workspace_id = d.workspace_id
                                  and sl.location_id  = d.location_id
                                  and sl.variant_id   = d.variant_id
                                  and sl.unit_price_net_per_base = d.sale_price_last_net)) = 0);

-- ⚠️ THE PICK IS RECOMPUTED INDEPENDENTLY, not compared against itself. A lateral
-- `order by … limit 1` over the base tables is a different implementation of the
-- same sentence, so this goes red if the array_agg ordering is mutated to asc, or
-- to max, or to min, or if a tiebreak is dropped in a way that changes an answer.
select chk('and it is the LAST line of the day, recomputed by a different implementation — sales',
           (select count(*) from product_velocity_daily d
             cross join lateral (
               select sl.unit_price_net_per_base p, sl.tax_rate r
                 from sale_line sl
                 join sale s on s.id = sl.sale_id
                 join location l on l.id = sl.location_id
                where sl.workspace_id = d.workspace_id
                  and sl.location_id  = d.location_id
                  and sl.variant_id   = d.variant_id
                  and (s.occurred_at at time zone l.timezone)::date = d.day
                order by s.occurred_at desc, sl.created_at desc, sl.id desc
                limit 1) x
             where d.line_count > 0
               and (d.sale_price_last_net   is distinct from x.p
                 or d.sale_price_last_gross is distinct from x.p * (1 + x.r))) = 0);

select chk('and the same, independently, on the purchases side',
           (select count(*) from product_purchases_daily d
             cross join lateral (
               select pl.unit_price_net_per_base p, pl.tax_rate r
                 from purchase_line pl
                 join purchase pu on pu.id = pl.purchase_id
                 join location l on l.id = pl.location_id
                where pl.workspace_id = d.workspace_id
                  and pl.location_id  = d.location_id
                  and pl.variant_id   = d.variant_id
                  and (pu.occurred_at at time zone l.timezone)::date = d.day
                order by pu.occurred_at desc, pl.created_at desc, pl.id desc
                limit 1) x
             where d.purchase_price_last_net   is distinct from x.p
                or d.purchase_price_last_gross is distinct from x.p * (1 + x.r)) = 0);

select chk('⚠️ the typed gross comes off the SAME line as the typed net, not off the bucket',
           (select count(*) from product_purchases_daily
             where purchase_price_last_net > 0
               and round(purchase_price_last_gross / purchase_price_last_net, 4)
                   not in (select distinct round(1 + tax_rate, 4) from purchase_line)) = 0
       and (select count(*) from product_velocity_daily
             where sale_price_last_net > 0
               and round(sale_price_last_gross / sale_price_last_net, 4)
                   not in (select distinct round(1 + tax_rate, 4) from sale_line)) = 0,
           'their ratio is always ONE line''s snapshot tax_rate (0003) — never the '
        || 'variant''s current rate, which would restate last quarter''s prices the '
        || 'moment somebody corrects a product, and never the bucket''s blended rate');

-- ⚠️ COUNTED, NOT MATCHED, AND THE FIRST SPELLING OF THIS CHECK GOT IT WRONG.
-- It used `~*`, which asks only whether the ordering appears SOMEWHERE — so the
-- falsification that drops the tiebreak from ONE of the two picks left the other
-- one matching and the check stayed green. That is the drift case exactly: a net
-- price and a gross price ordered differently come off DIFFERENT LINES, and the
-- view would report a price with somebody else's tax on it. Each side has two
-- picks and both must carry the whole ordering.
select chk('the ordering is TOTAL and BOTH picks carry it — three deep, ending on a unique id',
           regexp_count(pg_get_viewdef('public.product_velocity_daily'::regclass),
                        'ORDER BY s\.occurred_at DESC, sl\.created_at DESC, sl\.id DESC') = 2
       and regexp_count(pg_get_viewdef('public.product_purchases_daily'::regclass),
                        'ORDER BY p\.occurred_at DESC, pl\.created_at DESC, pl\.id DESC') = 2,
           'without the last term "the last price" is whichever row the planner '
        || 'reached first, and the chart changes on a re-plan with nothing red. '
        || 'Without it on BOTH, the net and the gross describe different lines');

select chk('every bucket that traded has a typed price, and no bucket that did not has one',
           (select count(*) from product_velocity_daily
             where (line_count > 0) <> (sale_price_last_net is not null)) = 0
       and (select count(*) from product_velocity_daily where sale_price_last_net is not null) = 2139,
           'the 2 139 sale buckets, and the 28 333 spine days, on the right sides of the line');


-- ========== 6. THE TWO PRICES DISAGREE, AND IT IS ARITHMETIC ==
-- ⚠️ THE STRONGEST FORM OF THIS CLAIM IS ON THE PURCHASES SIDE, WHERE EVERY
-- BUCKET HOLDS EXACTLY ONE LINE (0031's finding). Two prices off one line still
-- differ, because line_net is already rounded to the centavo by §2.5's per-line
-- rule and unit_price_net_per_base is not.

select chk('⚠️ 736 of 1 048 SINGLE-LINE purchase buckets: the price CHARGED is not the price MEANT',
           (select count(*) from product_purchases_daily
             where round(purchase_price_net,6) is distinct from round(purchase_price_last_net,6)) = 736
       and (select count(*) from product_purchases_daily where purchase_line_count = 1) = 1048,
           (select 'largest gap: ' || max(abs(purchase_price_net - purchase_price_last_net))::text
              from product_purchases_daily));

select chk('and rounding either one would be the wrong fix — §2.5 governs the till, not a report',
           (select count(*) from product_purchases_daily
             where purchases_net <> round(purchases_net, 2)) = 0
       and (select count(*) from product_purchases_daily
             where purchase_price_net = round(purchase_price_net, 2)) < 1048,
           'the MONEY is already at the centavo because the line stored it that way; '
        || 'the PRICE is not rounded here, because rounding a derived aggregate at '
        || 'every grain makes two correct rollups disagree. Round once, at the edge');

select chk('on the sale side the same disagreement is rarer, and both are present',
           (select count(*) from product_velocity_daily
             where sale_price_net is not null
               and round(sale_price_net,6) is distinct from round(sale_price_last_net,6)) = 54
       and (select count(*) from product_velocity_daily where sale_price_net is not null) = 2129);


-- ========== 7. REVERSALS, WHICH BEHAVE WELL AND ARE WORTH ASSERTING ==

select chk('⚠️ 23 purchase buckets are WHOLLY NEGATIVE, and every one reports a POSITIVE price',
           (select count(*) from product_purchases_daily where purchases_qty_base < 0) = 23
       and (select count(*) from product_purchases_daily
             where purchases_qty_base < 0 and purchase_price_net <= 0) = 0
       and (select count(*) from product_purchases_daily where purchase_price_net < 0) = 0,
           'a reversal is a negated document dated when it was RECORDED (0031), so '
        || 'the bar is negative and the price is not: negative money over negative '
        || 'quantity is the price it always was');

select chk('and the typed price of a reversed line is the price of the thing being undone',
           (select count(*) from purchase_line where qty_base < 0 and unit_price_net_per_base <= 0) = 0
       and (select count(*) from sale_line     where qty_base < 0 and unit_price_net_per_base <= 0) = 0,
           'money follows quantity by constraint but unit_price_net_per_base is '
        || 'non-negative by constraint too (0003), so a negated line carries the '
        || 'same positive typed price. Excluding reversals is the alternative, and '
        || 'it would make the two prices answer different questions');


-- ========== 8. THE FENCES DID NOT MOVE, AND DID NOT NEED TO ==
-- ⚠️⚠️ THIS IS THE SECTION THAT DECIDED THE SHAPE OF THE MIGRATION. A purchase
-- price is COST and §2.7 puts cost at manager-and-above; a sale price is revenue
-- over quantity and §2.7 puts that at staff. Landing each price on the view that
-- already owns its side of the ledger means neither fence has to be written down.

select chk('no policy changed: 41 policies, and sale_line_select still carries NO has_role',
           (select count(*) from pg_policies where schemaname='public') = 41
       and (select qual::text from pg_policies
             where schemaname='public' and tablename='sale_line' and policyname='sale_line_select')
           !~* 'has_role'
       and (select qual::text from pg_policies
             where schemaname='public' and tablename='purchase_line' and policyname='purchase_line_select')
           ~* 'has_role');

select chk('⚠️ NEITHER VIEW STATES A FENCE OF ITS OWN, and 0009 still does — the contrast is the point',
           pg_get_viewdef('public.product_purchases_daily'::regclass) !~* 'has_role'
       and pg_get_viewdef('public.product_velocity_daily'::regclass)  !~* 'has_role'
       and pg_get_viewdef('public.product_margin_daily'::regclass)     ~* 'has_role',
           '0009 needs a predicate because it mixes a gated half with a member-level '
        || 'half; a combined price view would have had the same shape and the same '
        || 'need. Splitting the price across the two existing views means RLS does '
        || 'all of it, and nothing here keeps answering the old question when a '
        || 'policy changes');

select chk('both views are still security_invoker, which is what makes inheritance mean anything',
           (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname in ('product_purchases_daily','product_velocity_daily')
               and c.reloptions::text ~* 'security_invoker=true') = 2);

-- ⚠️ THE MEASUREMENT THAT SETTLES IT. Same session, same caller.
begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'caja.centro@tienda.mx')), true);
set local role authenticated;

select chk('⚠️⚠️ a CASHIER reads 1 004 sale prices in her own store and ZERO rows of the purchases view',
           (select count(*) from product_velocity_daily) = 15099
       and (select count(*) from product_velocity_daily where sale_price_net is not null) = 1004
       and (select count(*) from product_purchases_daily) = 0,
           (select 'velocity rows ' || (select count(*) from product_velocity_daily)
                || ', priced ' || (select count(*) from product_velocity_daily where sale_price_net is not null)
                || ', purchases rows ' || (select count(*) from product_purchases_daily)));

select chk('and the sale price grants her NOTHING NEW — she already reads the typed price off the line',
           (select count(*) from sale_line where unit_price_net_per_base is not null) = 1040
       and (select count(*) from product_margin_daily) = 0,
           'sale_line_select carries no has_role (0003: "a sale line carries a price, '
        || 'not a cost"), and revenue over quantity has been on this view since 0013. '
        || '§2.7 puts "See quantity sold and revenue" at staff — this is that, divided');
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'rosa.gerente@tienda.mx')), true);
set local role authenticated;

select chk('a MANAGER reads 863 purchase buckets and a price on every one of them',
           (select count(*) from product_purchases_daily) = 863
       and (select count(*) from product_purchases_daily where purchase_price_net is null) = 0,
           (select 'purchase buckets ' || (select count(*) from product_purchases_daily)
                || ', priced ' || (select count(*) from product_purchases_daily
                                    where purchase_price_net is not null)));
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'roble.owner@tienda.mx')), true);
set local role authenticated;

select chk('and the OTHER workspace''s owner reads not one price of this one''s',
           (select count(*) from product_purchases_daily p
              join location l on l.id = p.location_id where l.name like 'Doña Lupe%') = 0
       and (select count(*) from product_velocity_daily v
              join location l on l.id = v.location_id where l.name like 'Doña Lupe%') = 0);
commit;

select chk('the grants did not move: product_purchases_daily still reaches exactly as far as product_waste_daily',
           (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type)
              from information_schema.role_table_grants
             where table_schema='public' and table_name='product_purchases_daily'
               and grantee in ('anon','authenticated'))
         = (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type)
              from information_schema.role_table_grants
             where table_schema='public' and table_name='product_waste_daily'
               and grantee in ('anon','authenticated'))
       and (select count(*) from information_schema.role_table_grants
             where table_schema='public'
               and table_name in ('product_purchases_daily','product_velocity_daily')
               and grantee = 'anon' and privilege_type = 'SELECT') = 0
       and (select count(*) from information_schema.role_table_grants
             where table_schema='public'
               and table_name in ('product_purchases_daily','product_velocity_daily')
               and grantee in ('anon','authenticated')
               and privilege_type in ('INSERT','UPDATE','DELETE')) = 0);

select chk('and 0014''s claim survives: the velocity view still reaches no cost column at all',
           pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'unit_cost'
       and pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'stock_batch'
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='product_velocity_daily'
               and column_name like '%cost%') = 0,
           'a sale price is not a cost, and adding four of them did not open a door '
        || '0013 and 0014 spent their headers keeping shut');


-- ========== 9. THREE GREEN CHECKS THAT WOULD HAVE STOPPED MEASURING THEIR CLAIM ==
-- ⚠️⚠️ THE SIXTH INSTANCE IN THIS REPOSITORY, AND THE FIRST CAUGHT BEFORE THE
-- MIGRATION SHIPPED RATHER THAN AFTER.
--
--   0013 §  "the view ships no rate column at all"
--   0031 §  "the view still ships no rate, ratio or average column, and still
--            divides nothing"
--   0031 §  "every MEASURE is additive — no rate, ratio, average or document
--            count column"
--
-- Each is implemented as `column_name like '%rate%' or '%avg%' or '%ratio%'`.
-- NONE of purchase_price_net, purchase_price_gross, purchase_price_last_net,
-- purchase_price_last_gross, sale_price_net, sale_price_gross,
-- sale_price_last_net or sale_price_last_gross contains any of those strings —
-- so all three would have passed, for ever, while their sentences were false.
-- They are re-cut in this commit. This file asserts the re-cut claim from the
-- other side: not "there is no ratio", but "every ratio is recoverable".

select chk('⚠️ the name test those three checks used does NOT see these columns — measured, not assumed',
           (select count(*) from information_schema.columns
             where table_schema='public'
               and table_name in ('product_velocity_daily','product_purchases_daily')
               and (column_name like '%rate%' or column_name like '%avg%'
                    or column_name like '%ratio%')) = 0
       and (select count(*) from information_schema.columns
             where table_schema='public'
               and table_name in ('product_velocity_daily','product_purchases_daily')
               and column_name like '%price%') = 8,
           'eight new ratio columns, and a check written to forbid ratios by name '
        || 'finds zero of them. The lesson is 0011''s, one week later: a check over '
        || 'a spelled-out list measures the list');

-- THE RE-CUT CLAIM, which is the one that is actually true and actually useful.
select chk('EVERY non-additive column on either view is a ratio of two additive columns ON ITS OWN ROW',
           (select count(*) from product_purchases_daily
             where purchase_price_net is not null
               and purchases_net / nullif(purchases_qty_base,0) is distinct from purchase_price_net) = 0
       and (select count(*) from product_velocity_daily
             where sale_price_net is not null
               and revenue_net / nullif(qty_base_sold,0) is distinct from sale_price_net) = 0
       and (select count(*) from information_schema.columns
             where table_schema='public'
               and table_name in ('product_velocity_daily','product_purchases_daily')
               and (column_name like '%share%' or column_name like '%purchase_count%'
                    or column_name like '%delivery%')) = 0,
           'which is exactly what separates a price from the delivery count 0031 '
        || 'refused: count(distinct purchase_id) is recoverable from nothing on the '
        || 'row, and a price is recoverable from the two columns beside it');

-- ⚠️ THE RULE 0013 ACTUALLY STATES, ASSERTED AS ARITHMETIC RATHER THAN AS A NAME
-- TEST. Each view body contains EXACTLY TWO division operators and both divide by
-- nullif() of the row's own quantity. So there is no division by anything the
-- caller would have had to choose — which is the whole of 0013's refusal, and the
-- three trailing denominators are still shipped and still undivided.
select chk('and each view divides in EXACTLY TWO places, both by nullif() of its own quantity',
           regexp_count(pg_get_viewdef('public.product_velocity_daily'::regclass),  '/') = 2
       and regexp_count(pg_get_viewdef('public.product_purchases_daily'::regclass), '/') = 2
       and regexp_count(pg_get_viewdef('public.product_velocity_daily'::regclass),
                        '/ NULLIF\(d\.qty_base_sold') = 2
       and regexp_count(pg_get_viewdef('public.product_purchases_daily'::regclass),
                        '/ NULLIF\(b\.purchases_qty_base') = 2
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='product_velocity_daily'
               and column_name in ('trailing_days','trailing_traded_days','trailing_sold_days')) = 3,
           'three defensible denominators for a trailing average are all still '
        || 'shipped and none is used — they differ by 17.9% at a store that shut for '
        || 'five days, so the caller picks one. A unit price has exactly one '
        || 'denominator, it is on the row, and nothing else here divides at all');


-- ========== 10. WHAT THIS SEED CANNOT FALSIFY, AND WHAT THE CARD ACTUALLY SHOWS ==
-- ⚠️ 0031 pinned a precondition rather than papering over a gap, and the same gap
-- is here from the other direction. Both are stated so the day the seed changes,
-- a check goes red and somebody reads this paragraph.

select chk('⚠️ PINNED: every purchase variant-day holds exactly ONE line, so min, max, last and the mean coincide',
           (select count(*) from product_purchases_daily where purchase_line_count <> 1) = 0,
           'mutating the purchases-side pick from last to first, max or min turns '
        || 'NOTHING red in this seed. The day a delivery splits a variant across two '
        || 'lines this check fails and section 5''s independent recomputation starts '
        || 'doing real work. ⚠️ THE SALE SIDE DOES NOT HAVE THE GAP: 56 buckets carry '
        || 'more than one distinct price, and the pick differs from max in 33 of them '
        || 'and from min in 23 — the division of labour, stated');

select chk('and the SALE side proves the pick, which is what makes that gap survivable',
           (select count(*) from (
              select sl.workspace_id, sl.location_id, sl.variant_id,
                     (s.occurred_at at time zone l.timezone)::date d
                from sale_line sl join sale s on s.id=sl.sale_id
                join location l on l.id=sl.location_id
               group by 1,2,3,4 having count(distinct sl.unit_price_net_per_base) > 1) x) = 56);

select chk('⚠️ PINNED: no two sale documents in one bucket share an occurred_at, so the TIEBREAK is untested',
           (select count(*) from (
              select sl.workspace_id, sl.location_id, sl.variant_id,
                     (s.occurred_at at time zone l.timezone)::date d,
                     count(*) c, count(distinct s.occurred_at) dt
                from sale_line sl join sale s on s.id=sl.sale_id
                join location l on l.id=sl.location_id
               group by 1,2,3,4) x where c > dt) = 0,
           'a real till writes several sales into one second, and an offline batch '
        || 'replays them together (§2.6). The created_at/id tiebreak is written '
        || 'because of that and NOTHING IN THIS SEED CAN FALSIFY IT — the day one '
        || 'ties, this check goes red and the ordering is doing work nobody watched '
        || 'it start');

-- ⚠️ THE CARD, ON A PRODUCT THAT ACTUALLY MOVED. Not a shape check: the number a
-- shopkeeper would read off the screen, taken end to end from the view.
with g as (
  select date_trunc('month', day)::date mo,
         sum(purchases_net) / nullif(sum(purchases_qty_base),0) p
    from product_purchases_daily
   where variant_name = 'Garbanzo 500 g'
   group by 1)
select chk('✅ the price card works: Garbanzo 500 g cost 19.6079 in May and 21.6725 in August, +10.5%',
           (select round(p,4) from g where mo = date '2026-05-01') = 19.6079
       and (select round(p,4) from g where mo = date '2026-08-01') = 21.6725
       and (select count(*) from g) = 4,
           (select string_agg(to_char(mo,'Mon') || ' ' || round(p,4)::text, ' → ' order by mo) from g));

select chk('and 227 variants have a purchase price that MOVED across months — the card has something to draw',
           (select count(*) from (
              select variant_id from (
                select variant_id, date_trunc('month', day) mo,
                       sum(purchases_net)/nullif(sum(purchases_qty_base),0) p
                  from product_purchases_daily group by 1,2) m
               group by 1 having count(distinct round(p,4)) > 1) t) = 227);

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
  -- ⚠️ `is not true`, NOT `not passed`. See the pre-flight block.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% price-over-time check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % price-over-time checks passed', (select count(*) from public._verify);
end;
$$;
