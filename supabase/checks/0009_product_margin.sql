-- ============================================================================
-- What made me money — the margin view over seed data  —  plan task 2.1
-- ============================================================================
-- ADR-035 §2.9 (analytics), §3 step 2 (the design gate), §2.7 (access)
--
-- `0009_product_margin.sql` claims that gross margin by product survives
-- reversals, unit conversion and a location rollup without a five-way join. This
-- file is where that claim is tested, and the database it is tested against is
-- the SEED — 904 tickets, 2 251 lines, three voided documents, two tenants, three
-- stores, weighed goods bought by the kilo and sold by the gram, and two tax
-- rates. A fixture written to make the view look right would prove nothing here;
-- the whole point of step 2 is judging the schema on data that was written to look
-- like a shop.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/
-- -----------------------------------------
-- The same reason 1.7's file is not: `supabase/tests/_cleanup.sql` truncates every
-- table but `unit` before each suite, so the seed is gone before the first one
-- runs — and every aggregate below would then be `0 = 0`. It runs from the checks
-- step in .github/workflows/db.yml, between the reset and the suite loop.
--
-- THE THREE KINDS OF CHECK HERE, AND THE MIDDLE ONE IS THE LOAD-BEARING ONE
-- -------------------------------------------------------------------------
--   1. PRE-FLIGHT. Refuses to run at all unless the seed still holds the cases
--      that make the rest discriminating — voids, weighed goods, two tenants, two
--      tax rates. Sum-versus-sum checks over an empty or flattened database pass.
--   2. RECONCILIATION AGAINST AN INDEPENDENT ARITHMETIC. Every total is re-derived
--      by a query that does NOT go through the view's join: `sale_line` and
--      `stock_movement` both carry `workspace_id`, `location_id` and `variant_id`
--      of their own, so the check never needs the document join the view uses.
--      A check that recomputes the view the view's way is a tautology, and this
--      repo has shipped one before (docs/PLAN.md, "the test was wrong before the
--      view was").
--   3. THE WRONG IMPLEMENTATIONS, RUN SIDE BY SIDE. Three plausible mistakes are
--      written out in full and asserted to DISAGREE with the real view. That is
--      falsification the CI run performs every time rather than a sentence saying
--      someone once tried it — and it is also the only way to prove the seed data
--      can tell right from wrong at all.
--
-- It creates and drops two scratch views in `public`. Nothing it writes survives:
-- the last section drops them, and the suite loop truncates afterwards anyway.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

set client_min_messages = warning;
drop table if exists public._verify cascade;
drop view  if exists public._margin_ungated cascade;
drop view  if exists public._margin_naive_void cascade;
reset client_min_messages;

create table public._verify (n serial, label text, passed boolean, detail text);

-- Section 4 records its results from inside `set local role authenticated`
-- sessions — the only way to make a claim about what a cashier can read, since as
-- the superuser every RLS check passes vacuously (supabase/README.md).
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;


-- =============================================== 1. there is a shop here ==
-- Floors and shapes, not the seed's exact counts — the seed files pin those
-- themselves (1.7 settled this). What this section refuses is a database that
-- cannot tell a correct margin from a flattering one.

select chk('seed present: the ledger holds a real trading history',
           (select count(*) from sale_line) >= 1000
       and (select count(*) from stock_movement where reason = 'sale') >= 1000,
           (select count(*) || ' sale lines, ' from sale_line)
        || (select count(*) || ' sale movements' from stock_movement where reason='sale'));

select chk('seed present: both tenants sell, and neither is a rounding error',
           (select count(*) from (select workspace_id from sale_line
                                   group by 1 having count(*) >= 100) t) = 2,
           (select string_agg(w.display_name || '=' || c.n, ', ' order by c.n)
              from (select workspace_id, count(*) n from sale_line group by 1) c
              join workspace w on w.id = c.workspace_id));

select chk('seed present: more than one store sells, or the rollup is untestable',
           (select count(distinct location_id) from sale_line) >= 3,
           (select count(distinct location_id) || ' selling locations' from sale_line));

-- Without a void in range, "margin survives reversals" is a claim about data that
-- is not there — and the naive implementation in section 4 would agree with the
-- real one, which is how a vacuous green looks from the inside.
select chk('seed present: tickets were voided, so reversals are exercised',
           (select count(*) from sale where reversal_of is not null) >= 1,
           (select count(*) || ' voided ticket(s)' from sale where reversal_of is not null));

-- The ADR names unit conversion as one of the three things margin must survive.
-- It survives it by never doing it (§2.5 normalises at write time) — but that is
-- only worth asserting if the seed actually sells something weighed.
select chk('seed present: weighed goods are bought and sold in different denominations',
           (select count(*) from sale_line sl join product_variant v on v.id = sl.variant_id
             where v.base_unit_code <> v.purchase_unit_code) >= 100,
           (select count(*) || ' line(s) of goods whose base unit is not their purchase unit'
              from sale_line sl join product_variant v on v.id = sl.variant_id
             where v.base_unit_code <> v.purchase_unit_code));

select chk('seed present: both tax rates are sold, so net-of-tax means something',
           (select count(distinct tax_rate) from sale_line) >= 2,
           (select string_agg(distinct tax_rate::text, ', ') from sale_line));

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception
      'PRE-FLIGHT FAILED (% check(s)): there is no shop in this database to check a '
      'margin over, so nothing below would be evidence. See the table this file '
      'would have printed.', v_failed;
  end if;
end;
$$;


-- ================================ 2. the view agrees with the ledger ==
-- Re-derived WITHOUT the view's document join. `sale_line` and `stock_movement`
-- each carry their own workspace_id, location_id and variant_id, so these
-- aggregates share no arithmetic with the view beyond the tables themselves.

select chk('revenue: the view''s total is the ledger''s total, to the centavo',
           (select coalesce(sum(revenue_net),0) from product_margin_daily)
         = (select coalesce(sum(line_net),0)    from sale_line),
           (select 'view ' || coalesce(sum(revenue_net),0) from product_margin_daily)
        || (select ' vs sale_line ' || coalesce(sum(line_net),0) from sale_line));

select chk('revenue: and it is the sum of the DOCUMENTS too, which is a third path',
           (select coalesce(sum(revenue_net),0) from product_margin_daily)
         = (select coalesce(sum(total_net),0)   from sale));

select chk('tax: collected tax is carried, never re-derived from the current rate',
           (select coalesce(sum(tax_collected),0) from product_margin_daily)
         = (select coalesce(sum(tax_amount),0)   from sale_line));

select chk('cost: the view''s COGS is the cost of the lots the ledger says left',
           (select coalesce(sum(cogs_net),0) from product_margin_daily)
         = (select coalesce(sum(-qty_base * unit_cost_net_per_base),0)
              from stock_movement where reason = 'sale'),
           (select 'view ' || round(coalesce(sum(cogs_net),0),4) from product_margin_daily)
        || (select ' vs movements ' || round(coalesce(sum(-qty_base*unit_cost_net_per_base),0),4)
              from stock_movement where reason='sale'));

select chk('quantity: units sold are the ledger''s units, in the base denomination',
           (select coalesce(sum(qty_base_sold),0) from product_margin_daily)
         = (select coalesce(sum(qty_base),0)      from sale_line));

-- ⚠️ THESE TWO EXIST BECAUSE A FALSIFICATION PASSED. Excluding voided documents
-- and their voids — the reflex 0008 correctly applies to a price memory — leaves
-- EVERY sum above unchanged, because a void and its original cancel: dropping both
-- and keeping both give the same total, the same per-product total, and the same
-- per-store total. The two implementations differ only in which day the
-- cancellation lands on, and every void in the seed happens minutes after its
-- original, on the same day.
--
-- So the sums cannot tell them apart, and the counts can. A void CANCELS its
-- original; it does not ERASE it. Every line and every movement the ledger holds is
-- accounted for in exactly one bucket, which also refuses the opposite failure —
-- a join that fans out and counts a line twice.
select chk('nothing is dropped and nothing is counted twice: every line is in a bucket',
           (select coalesce(sum(line_count),0) from product_margin_daily)
         = (select count(*) from sale_line),
           (select coalesce(sum(line_count),0) || ' line(s) in the view' from product_margin_daily)
        || (select ' vs ' || count(*) || ' in sale_line' from sale_line));

select chk('nothing is dropped and nothing is counted twice: every sale movement too',
           (select coalesce(sum(movement_count),0) from product_margin_daily)
         = (select count(*) from stock_movement where reason = 'sale'),
           (select coalesce(sum(movement_count),0) || ' movement(s) in the view' from product_margin_daily)
        || (select ' vs ' || count(*) || ' in the ledger' from stock_movement where reason='sale'));

-- Per bucket, not only in total. Two errors that cancel across the shop —
-- a variant credited to the wrong store, a day credited to its neighbour —
-- are invisible to every check above and to none of this one.
select chk('per (store, product): every bucket matches an independent aggregate',
           (select count(*) from (
              select coalesce(v.workspace_id, x.workspace_id) ws,
                     coalesce(v.location_id,  x.location_id)  loc,
                     coalesce(v.variant_id,   x.variant_id)   var
                from (select workspace_id, location_id, variant_id,
                             sum(revenue_net) rev, sum(cogs_net) cogs, sum(qty_base_sold) qty
                        from product_margin_daily group by 1,2,3) v
                full outer join (
                     select r.workspace_id, r.location_id, r.variant_id,
                            r.rev, coalesce(c.cogs,0) cogs, r.qty
                       from (select workspace_id, location_id, variant_id,
                                    sum(line_net) rev, sum(qty_base) qty
                               from sale_line group by 1,2,3) r
                       full outer join (
                            select workspace_id, location_id, variant_id,
                                   sum(-qty_base * unit_cost_net_per_base) cogs
                              from stock_movement where reason = 'sale'
                             group by 1,2,3) c
                         on c.workspace_id = r.workspace_id
                        and c.location_id  = r.location_id
                        and c.variant_id   = r.variant_id) x
                  on x.workspace_id = v.workspace_id
                 and x.location_id  = v.location_id
                 and x.variant_id   = v.variant_id
               where v.rev is distinct from x.rev
                  or v.cogs is distinct from x.cogs
                  or v.qty  is distinct from x.qty) d) = 0,
           'disagreeing (store, product) pairs');

select chk('every row carries its cost: no revenue is reported as pure margin',
           (select bool_and(cost_attributed) from product_margin_daily)
       and (select count(*) from product_margin_daily
                where not cost_attributed) = 0,
           (select count(*) || ' bucket(s) with revenue and no cost movement'
              from product_margin_daily where not cost_attributed));

select chk('margin is revenue minus cost, on every row, with no rounding drift',
           (select count(*) from product_margin_daily
             where gross_margin <> revenue_net - cogs_net) = 0);

select chk('margin_rate is null and never zero when nothing sold',
           (select count(*) from product_margin_daily
             where revenue_net = 0 and margin_rate is not null) = 0);

-- A shop that sells below cost every day is a schema bug, not a business. This is
-- a smell test on the whole seed rather than a claim about any row: the seed
-- derives cost from sell price per family (1.6a), so a negative aggregate margin
-- would mean the attribution is inverted somewhere.
select chk('the shop makes money overall, which an inverted attribution would not',
           (select sum(gross_margin) from product_margin_daily) > 0
       and (select sum(gross_margin) / sum(revenue_net) from product_margin_daily)
           between 0.05 and 0.60,
           (select 'margin ' || round(sum(gross_margin),2)
                 || ' on revenue ' || round(sum(revenue_net),2)
                 || ' = ' || round(100*sum(gross_margin)/sum(revenue_net),1) || '%'
              from product_margin_daily));


-- ================================= 3. the three things the ADR asked ==
-- ADR-035 §3 step 2: margin by product must survive REVERSALS, UNIT CONVERSION and
-- a LOCATION ROLLUP. Each gets a check that would fail if it did not.

-- --- the location rollup is a group-by the caller drops ----------------------
-- §2.9: consolidated by default, per location as the drill-down. If those two
-- disagree by a centavo the "default" is a different number from the drill-down
-- and an owner reconciling them by hand loses an afternoon.
select chk('rollup: consolidated equals the sum of the stores, exactly',
           (select count(*) from (
              select variant_id,
                     sum(revenue_net)  rev,
                     sum(gross_margin) gm
                from product_margin_daily group by 1) consolidated
              join (
              select variant_id,
                     sum(rev) rev, sum(gm) gm from (
                select location_id, variant_id,
                       sum(revenue_net) rev, sum(gross_margin) gm
                  from product_margin_daily group by 1,2) per_store
               group by 1) summed
                on summed.variant_id = consolidated.variant_id
             where summed.rev is distinct from consolidated.rev
                or summed.gm  is distinct from consolidated.gm) = 0,
           'products where consolidated <> sum of stores');

-- The query §2.9 actually asks for, run for real. It is one statement, no CTE and
-- no join — which is the design gate's answer in the form the gate asked for.
select count(*) as top_rows from (
  select variant_name, sum(revenue_net) rev, sum(gross_margin) gm
    from product_margin_daily
   where workspace_id = (select id from workspace order by created_at limit 1)
   group by variant_name
   order by gm desc
   limit 10) t \gset

select chk('rollup: "what made me money", consolidated, is one statement with no join',
           :top_rows = 10, 'top-10 by margin returned ' || :top_rows || ' rows');

-- --- reversals need no exclusion, because a void is a negated document -------
-- The strong form of the claim: the view reports exactly what it would report if
-- the voided tickets and their voids had never been written at all. Anything
-- weaker — "the void is excluded", "the total looks plausible" — is satisfied by
-- implementations that are wrong in the other direction.
select chk('reversals: the numbers equal a ledger in which the voided pairs never happened',
           (select count(*) from (
              select coalesce(v.ws, x.ws) ws, coalesce(v.var, x.var) var
                from (select workspace_id ws, variant_id var,
                             sum(revenue_net) rev, sum(cogs_net) cogs
                        from product_margin_daily group by 1,2) v
                full outer join (
                     select r.workspace_id ws, r.variant_id var, r.rev,
                            coalesce(c.cogs,0) cogs
                       from (select sl.workspace_id, sl.variant_id, sum(sl.line_net) rev
                               from sale_line sl
                              where sl.sale_id not in (select id from sale where reversal_of is not null)
                                and sl.sale_id not in (select reversal_of from sale where reversal_of is not null)
                              group by 1,2) r
                       full outer join (
                            select m.workspace_id, m.variant_id,
                                   sum(-m.qty_base * m.unit_cost_net_per_base) cogs
                              from stock_movement m
                             where m.reason = 'sale'
                               and m.sale_id not in (select id from sale where reversal_of is not null)
                               and m.sale_id not in (select reversal_of from sale where reversal_of is not null)
                             group by 1,2) c
                         on c.workspace_id = r.workspace_id and c.variant_id = r.variant_id) x
                  on x.ws = v.ws and x.var = v.var
               where v.rev  is distinct from x.rev
                  or v.cogs is distinct from x.cogs) d) = 0,
           'products whose totals move when the voided pairs are removed by hand');

-- --- unit conversion: it is not in the query, and that is the finding --------
-- A variant whose base unit is the gram, bought by the kilo and sold in grams.
-- Every number in the view for it is money or base units, so nothing converts.
select v.id as wid, v.name as wname
  from product_variant v
  join sale_line sl on sl.variant_id = v.id
 where v.base_unit_code <> v.purchase_unit_code
 group by v.id, v.name
 having count(*) >= 20
 order by count(*) desc, v.name
 limit 1 \gset weighed_

select chk('units: a weighed product bought by the kilo reconciles in grams, exactly',
           (select coalesce(sum(qty_base_sold),0) from product_margin_daily
             where variant_id = :'weighed_wid')
         = (select coalesce(sum(qty_base),0) from sale_line
             where variant_id = :'weighed_wid')
       and (select coalesce(sum(gross_margin),0) from product_margin_daily
             where variant_id = :'weighed_wid')
         = (select coalesce(sum(line_net),0) from sale_line where variant_id = :'weighed_wid')
         - (select coalesce(sum(-qty_base * unit_cost_net_per_base),0)
              from stock_movement where reason = 'sale' and variant_id = :'weighed_wid'),
           :'weighed_wname');

select chk('units: its quantity is reported in the BASE unit, not the sell unit',
           (select distinct base_unit_code from product_margin_daily
             where variant_id = :'weighed_wid')
         = (select base_unit_code from product_variant where id = :'weighed_wid'));


-- ============================== 4. the wrong implementations disagree ==
-- Every check above would also pass against a view that was wrong in a way the
-- seed cannot see. These three are the mistakes worth being sure about, written
-- out and asserted to produce DIFFERENT numbers. If any of them ever agrees with
-- the real view, the seed has stopped being able to tell them apart and every
-- claim above weakens with it.

-- --- wrong 1: "exclude the voids", the 0008 reflex applied where it does not fit
select chk('falsified: excluding void documents (the 0008 reflex) gives a DIFFERENT total',
           (select coalesce(sum(sl.line_net),0) from sale_line sl
              join sale s on s.id = sl.sale_id
             where s.reversal_of is null)
        <> (select coalesce(sum(revenue_net),0) from product_margin_daily),
           'a void must cancel its original, not merely be skipped: '
        || (select 'skipping gives ' || coalesce(sum(sl.line_net),0)
              from sale_line sl join sale s on s.id = sl.sale_id where s.reversal_of is null)
        || (select ', the view gives ' || coalesce(sum(revenue_net),0) from product_margin_daily));

-- --- wrong 2: cost from the price list instead of from the lot consumed -------
-- The shortcut that looks harmless: value what was sold at what that product
-- most recently cost, rather than at what the lots FEFO actually took cost. It is
-- the reason cost lives on the movement (0004) and the reason margin is not
-- derivable from sale_line alone.
select chk('falsified: costing at the latest purchase price gives a DIFFERENT margin',
           (select coalesce(sum(-m.qty_base * b.latest_cost),0)
              from stock_movement m
              join (select variant_id, workspace_id,
                           (array_agg(unit_cost_net_per_base order by received_at desc, id desc))[1] latest_cost
                      from stock_batch group by 1,2) b
                on b.variant_id = m.variant_id and b.workspace_id = m.workspace_id
             where m.reason = 'sale')
        <> (select coalesce(sum(cogs_net),0) from product_margin_daily),
           'batch attribution is the whole point of §2.9''s cost snapshot');

-- --- wrong 3: inheriting access instead of stating it ------------------------
-- The failure this view's `has_role` predicate exists to prevent, demonstrated
-- rather than described: the same query without the gate, read by a cashier.
create view public._margin_ungated with (security_invoker = true) as
select sl.workspace_id, sl.location_id, sl.variant_id,
       sum(sl.line_net) as revenue_net,
       coalesce((select sum(-m.qty_base * m.unit_cost_net_per_base)
                   from stock_movement m
                  where m.reason = 'sale'
                    and m.variant_id  = sl.variant_id
                    and m.location_id = sl.location_id), 0) as cogs_net
  from sale_line sl
 group by 1, 2, 3;
grant select on public._margin_ungated to authenticated;

select id from auth.users where email = 'caja.centro@tienda.mx' \gset staff_
select id from auth.users where email = 'rosa.gerente@tienda.mx' \gset mgr_
select id from auth.users where email = 'roble.owner@tienda.mx' \gset ownerb_
select id from workspace where display_name = 'Tienda Doña Lupe' \gset wsa_

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'staff_id'), true);
set local role authenticated;

select chk('access: a cashier reads ZERO rows of margin',
           (select count(*) from product_margin_daily) = 0);

select chk('falsified: without the gate the same cashier is told margin = revenue',
           (select count(*) from public._margin_ungated) > 0
       and (select bool_and(cogs_net = 0) from public._margin_ungated),
           (select count(*) || ' ungated row(s) visible to a cashier, every one of them '
                 || 'reporting zero cost' from public._margin_ungated));
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'mgr_id'), true);
set local role authenticated;

select chk('access: a manager reads their own tenant and only their own tenant',
           (select count(*) from product_margin_daily) > 0
       and (select count(*) from product_margin_daily
                where workspace_id <> :'wsa_id') = 0);

select chk('access: a manager sees both of their stores, so the rollup is theirs to make',
           (select count(distinct location_id) from product_margin_daily) = 2);

select chk('access: and the numbers they read are the same numbers the ledger holds',
           (select round(coalesce(sum(gross_margin),0),4) from product_margin_daily)
         = (select round(coalesce(sum(sl.line_net),0),4) from sale_line sl
             where sl.workspace_id = :'wsa_id')
         - (select round(coalesce(sum(-m.qty_base * m.unit_cost_net_per_base),0),4)
              from stock_movement m
             where m.reason = 'sale' and m.workspace_id = :'wsa_id'));
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'ownerb_id'), true);
set local role authenticated;

select chk('access: the other tenant''s owner sees none of the first tenant''s margin',
           (select count(*) from product_margin_daily) > 0
       and (select count(*) from product_margin_daily
                where workspace_id = :'wsa_id') = 0);
commit;


-- ========================================== 5. the day boundary is local ==
-- ⚠️ AND THE SEED CANNOT TELL. Every seeded document is written as a naive local
-- time into a timestamptz column by a session running in UTC (20_consumption.sql:
-- `v_day + interval '9 hours'`), so the seed's trading day is 09:00–20:40 UTC —
-- 03:00–14:40 in Mexico City. Nothing crosses midnight in either zone, so
-- bucketing in UTC and bucketing locally produce the SAME rows here.
--
-- That is worth stating rather than hiding: this file cannot falsify the timezone
-- ⚠️ UPDATED BY 0012. The boundary is no longer a constant in this view — it is
-- `location.timezone`, per store, and this file reads the same column rather than
-- a literal of its own. What has NOT changed is what the seed can discriminate:
-- every store still carries the default, and the seed still trades in UTC office
-- hours, so local and UTC bucketing agree over it. The bound below is still zero
-- and still worth pinning. `supabase/checks/0012_location_timezone.sql` is where
-- the column is proven to reach these buckets, by moving one store's zone.

select chk('day: the boundary expression is local, not UTC',
           ('2026-08-21 03:00+00'::timestamptz at time zone 'America/Mexico_City')::date
             = date '2026-08-20'
       and ('2026-08-21 19:00+00'::timestamptz at time zone 'America/Mexico_City')::date
             = date '2026-08-21');

select chk('day: ⚠️ the seed trades in UTC office hours, so it cannot discriminate here',
           (select count(*) from sale s
              join location lz on lz.id = s.location_id
                              and lz.workspace_id = s.workspace_id
             where (s.occurred_at at time zone lz.timezone)::date
                <> (s.occurred_at at time zone 'UTC')::date) = 0,
           'documents whose local day differs from their UTC day, in their own '
        || 'store''s zone — when this stops being 0 the seed can discriminate a '
        || 'boundary on its own, without 0012 having to move a store');

select chk('day: every bucket is a day the shop actually traded, in THAT store''s zone',
           (select count(*) from product_margin_daily d
             where not exists (select 1 from sale s
                                 join location lz on lz.id = s.location_id
                                                 and lz.workspace_id = s.workspace_id
                                where s.workspace_id = d.workspace_id
                                  and s.location_id  = d.location_id
                                  and (s.occurred_at at time zone lz.timezone)::date = d.day)) = 0);

-- ⚠️ ADDED BY 0012. The view must carry no timezone of its own any more. Before
-- 0012 this file's sibling asserted that 0009 and 0011 hardcoded the SAME literal;
-- the stronger claim now available is that neither hardcodes one at all, so there
-- is nothing left for a fix to move in one place and not the other.
select chk('day: the view hardcodes no timezone — it reads location.timezone',
           pg_get_viewdef('public.product_margin_daily'::regclass) !~* 'AT TIME ZONE ''[A-Za-z]+/'
       and pg_get_viewdef('public.product_margin_daily'::regclass) ~* 'timezone',
           'the boundary is a column, not a constant (0012)');



-- ⚠️ ADDED BY 0012'S SESSION, AFTER IT SHIPPED WITH THIS BUG FOR ONE DRAFT.
-- `_verify.n` is a serial and a sequence is non-transactional, so a `chk()`
-- recorded inside a block that later ROLLED BACK burns its number and leaves a
-- gap. Every access section in this file uses `begin ... commit` for exactly that
-- reason; this makes the requirement structural instead of remembered. Without it,
-- such a section deletes its own results and the file still reports "all N passed"
-- with a quietly smaller N — the same failure as a silently skipped CI step, one
-- level down.
select chk('this file did not throw away any of its own results',
           (select max(n) from public._verify) = (select count(*) from public._verify),
           (select 'highest number ' || max(n) || ', rows ' || count(*) from public._verify));

-- ------------------------------------------------------------------ tidy -----
set client_min_messages = warning;
drop view if exists public._margin_ungated cascade;
reset client_min_messages;


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception '% margin check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % product margin checks passed', (select count(*) from public._verify);
end;
$$;
