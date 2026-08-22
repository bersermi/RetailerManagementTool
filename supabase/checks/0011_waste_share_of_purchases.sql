-- ============================================================================
-- What am I throwing away — the waste view over seed data  —  plan task 2.2
-- ============================================================================
-- ADR-035 §2.9 (analytics), §3 step 2 (the design gate), §2.7 (access)
--
-- `0011_waste_share_of_purchases.sql` claims that waste cost as a share of
-- purchases is two aggregates joined once, that it survives reversals, unit
-- conversion and a location rollup, and — the part 0009 did not have to answer —
-- that the division at the end of it is safe. This file tests those claims against
-- the SEED: 66 write-offs over 137 lines, 113 deliveries over 1 048 lines, three
-- voided deliveries and one voided write-off, two tenants, three stores, weighed
-- goods bought by the kilo and thrown out by the gram.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/
-- -----------------------------------------
-- 0009's reason, unchanged: `supabase/tests/_cleanup.sql` truncates every table
-- but `unit` before each suite, so the seed is gone before the first one runs and
-- every aggregate below would be `0 = 0`. It runs from the checks step in
-- .github/workflows/db.yml, between the reset and the suite loop.
--
-- THE FOUR KINDS OF CHECK HERE
-- ----------------------------
--   1. PRE-FLIGHT. Refuses to run unless the seed still holds what makes the rest
--      discriminating — and this file needs MORE than 0009 did, because the three
--      ways a denominator fails are only testable if the seed contains all three.
--   2. RECONCILIATION AGAINST AN INDEPENDENT ARITHMETIC. Every total re-derived by
--      a query that does not go through the view's document join.
--   3. THE DENOMINATOR'S THREE FAILURES, each pinned to a named row in the seed.
--      This is the section plan task 2.2 exists for.
--   4. THE WRONG IMPLEMENTATIONS, RUN SIDE BY SIDE and asserted to DISAGREE.
--
-- ⚠️ TWO MUTATIONS OF THE SHIPPED VIEW THAT NOTHING HERE CATCHES, recorded rather
-- than papered over, because a falsification table with only successes in it is
-- the more misleading artefact (2.1 set this precedent and its reasons hold):
--
--   * THE WASTE DAY TAKEN FROM `stock_movement` INSTEAD OF FROM `waste`. Every
--     waste movement in the seed carries exactly its document's `occurred_at`, so
--     the two agree on every row. Taking it from the document is still right — it
--     GUARANTEES a loss and its cost land in one bucket rather than leaving that to
--     a convention every future writer must honour — but the seed cannot prove it.
--     This is the same mutation 0009 could not falsify, for the same reason.
--
--   * `location_id` DROPPED FROM THE JOIN KEY. It should fan a write-off at one
--     store out across deliveries of the same product at another, and in this seed
--     it does not: deliveries and write-offs of the same product almost never share
--     a day, and no (product, day) pair in the seed has a delivery at one store and
--     a write-off at another. The check below pins that precondition at zero, so
--     the day the seed can tell these apart it goes red and someone reads this.
--
-- It creates and drops scratch views in `public`. Nothing it writes survives.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

set client_min_messages = warning;
drop table if exists public._verify cascade;
drop view  if exists public._waste_inner cascade;
drop view  if exists public._waste_half_gated cascade;
reset client_min_messages;

create table public._verify (n serial, label text, passed boolean, detail text);

-- Section 5 records from inside `set local role authenticated` sessions — the only
-- way to make a claim about what a cashier can read, since as the superuser every
-- RLS check passes vacuously (supabase/README.md).
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
-- cannot tell an honest waste share from a flattering one.

select chk('seed present: stock was thrown away, and it was thrown away in bulk',
           (select count(*) from stock_movement where reason = 'waste') >= 100
       and (select count(*) from waste_line) >= 100,
           (select count(*) || ' waste movement(s), ' from stock_movement where reason='waste')
        || (select count(*) || ' waste line(s)' from waste_line));

select chk('seed present: there is a denominator — deliveries, in quantity',
           (select count(*) from purchase_line) >= 500,
           (select count(*) || ' delivery line(s) across ' from purchase_line)
        || (select count(*) || ' delivery document(s)' from purchase));

select chk('seed present: both tenants throw things away',
           (select count(distinct workspace_id) from waste) = 2,
           (select string_agg(w.display_name || '=' || c.n, ', ' order by c.n)
              from (select workspace_id, count(*) n from waste group by 1) c
              join workspace w on w.id = c.workspace_id));

select chk('seed present: more than one store wastes, or the rollup is untestable',
           (select count(distinct location_id) from waste) >= 3,
           (select count(distinct location_id) || ' wasting locations' from waste));

-- Both sides of this view can be voided, and both are. Without a void on each
-- side, "waste share survives reversals" is a claim about data that is not there.
select chk('seed present: BOTH a delivery and a write-off were voided',
           (select count(*) from purchase where reversal_of is not null) >= 1
       and (select count(*) from waste    where reversal_of is not null) >= 1,
           (select count(*) || ' voided delivery(ies), ' from purchase where reversal_of is not null)
        || (select count(*) || ' voided write-off(s)' from waste where reversal_of is not null));

-- ⚠️ THE PRE-FLIGHT 0009 COULD NOT MAKE. Every void in 0009's sale data lands
-- minutes after its original, on the same local day, so a day-grain bucket never
-- sees half a cancellation and section 4's day-grain claims would be vacuous. Here
-- every void lands on a LATER local day. If a future seed changes that, the
-- day-grain reversal checks below stop discriminating and this goes red first.
select chk('seed present: every void lands on a LATER local day than what it cancels',
           (select count(*) from purchase r join purchase o on o.id = r.reversal_of
              join location lz on lz.id = r.location_id and lz.workspace_id = r.workspace_id
             where (r.occurred_at at time zone lz.timezone)::date
                 > (o.occurred_at at time zone lz.timezone)::date)
         = (select count(*) from purchase where reversal_of is not null)
       and (select count(*) from waste r join waste o on o.id = r.reversal_of
              join location lz on lz.id = r.location_id and lz.workspace_id = r.workspace_id
             where (r.occurred_at at time zone lz.timezone)::date
                 > (o.occurred_at at time zone lz.timezone)::date)
         = (select count(*) from waste where reversal_of is not null),
           'a same-day void would make the day-grain reversal checks vacuous');

select chk('seed present: weighed goods are thrown away in a denomination they were not bought in',
           (select count(*) from stock_movement m
              join product_variant v on v.id = m.variant_id
             where m.reason = 'waste' and v.base_unit_code <> v.purchase_unit_code) >= 10,
           (select count(*) || ' waste movement(s) of goods whose base unit is not their purchase unit'
              from stock_movement m join product_variant v on v.id = m.variant_id
             where m.reason='waste' and v.base_unit_code <> v.purchase_unit_code));

select chk('seed present: both tax rates are delivered, so net-of-tax means something',
           (select count(distinct tax_rate) from purchase_line) >= 2,
           (select string_agg(distinct tax_rate::text, ', ') from purchase_line));

-- ⚠️ THE ONE THIS FILE IS REALLY FOR. Section 3 pins three ways the denominator
-- fails. All three have to be IN the seed or section 3 is three green checks over
-- nothing.
--
-- ⚠️ AND IT IS COMPUTED FROM THE BASE TABLES, NOT FROM THE VIEW. A pre-flight that
-- reads the object under test is not a pre-flight: break the view and this section
-- goes red with a message blaming the seed, which sends the next reader to the
-- wrong file. `_led` is the ledger's own answer at month grain, and section 3
-- asserts the view reproduces it.
create temp view _led as
select coalesce(a.ws, c.ws)   as ws,
       coalesce(a.loc, c.loc) as loc,
       coalesce(a.var, c.var) as var,
       coalesce(a.mo, c.mo)   as mo,
       coalesce(a.w, 0)       as w,
       coalesce(c.p, 0)       as p,
       coalesce(c.pn, 0)      as pn
  from (select m.workspace_id ws, m.location_id loc, m.variant_id var,
               date_trunc('month', (x.occurred_at at time zone lz.timezone))::date mo,
               sum(-m.qty_base * m.unit_cost_net_per_base) w
          from stock_movement m join waste x on x.id = m.waste_id
          join location lz on lz.id = m.location_id and lz.workspace_id = m.workspace_id
         where m.reason = 'waste' group by 1,2,3,4) a
  full outer join
       (select pl.workspace_id ws, pl.location_id loc, pl.variant_id var,
               date_trunc('month', (p2.occurred_at at time zone lz.timezone))::date mo,
               sum(pl.line_net) p, count(*) pn
          from purchase_line pl join purchase p2 on p2.id = pl.purchase_id
          join location lz on lz.id = pl.location_id and lz.workspace_id = pl.workspace_id
         group by 1,2,3,4) c
    on c.ws = a.ws and c.loc = a.loc and c.var = a.var and c.mo = a.mo;

select chk('seed present: all THREE denominator failures occur in the LEDGER at month grain',
           (select count(*) from _led where w > 0 and pn = 0)  >= 1
       and (select count(*) from _led where pn > 0 and p = 0)  >= 1
       and (select count(*) from _led where w > 0 and p < 0)   >= 1,
           (select (select count(*) from _led where w > 0 and pn = 0) || ' never-bought, '
                || (select count(*) from _led where pn > 0 and p = 0) || ' bought-then-cancelled, '
                || (select count(*) from _led where w > 0 and p < 0) || ' net-negative'));

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception
      'PRE-FLIGHT FAILED (% check(s)): there is no shop in this database to check a '
      'waste share over, so nothing below would be evidence. See the table this file '
      'would have printed.', v_failed;
  end if;
end;
$$;


-- ================================ 2. the view agrees with the ledger ==
-- Re-derived WITHOUT the view's document join. `stock_movement` and
-- `purchase_line` each carry their own workspace_id, location_id and variant_id,
-- so these aggregates share no arithmetic with the view beyond the tables.

select chk('waste cost: the view''s total is the ledger''s total',
           (select coalesce(sum(waste_cost_net),0) from product_waste_daily)
         = (select coalesce(sum(-qty_base * unit_cost_net_per_base),0)
              from stock_movement where reason = 'waste'),
           (select 'view ' || round(coalesce(sum(waste_cost_net),0),6) from product_waste_daily)
        || (select ' vs movements ' || round(coalesce(sum(-qty_base*unit_cost_net_per_base),0),6)
              from stock_movement where reason='waste'));

select chk('waste quantity: units lost are the ledger''s units, in the base denomination',
           (select coalesce(sum(waste_qty_base),0) from product_waste_daily)
         = (select coalesce(sum(-qty_base),0) from stock_movement where reason = 'waste'));

select chk('purchases: the view''s denominator is the sum of the delivery LINES',
           (select coalesce(sum(purchases_net),0) from product_waste_daily)
         = (select coalesce(sum(line_net),0) from purchase_line),
           (select 'view ' || coalesce(sum(purchases_net),0) from product_waste_daily)
        || (select ' vs purchase_line ' || coalesce(sum(line_net),0) from purchase_line));

select chk('purchases: and of the delivery DOCUMENTS too, which is a third path',
           (select coalesce(sum(purchases_net),0) from product_waste_daily)
         = (select coalesce(sum(total_net),0) from purchase));

select chk('purchases: quantities delivered are the ledger''s, in the base denomination',
           (select coalesce(sum(purchases_qty_base),0) from product_waste_daily)
         = (select coalesce(sum(qty_base),0) from purchase_line));

-- 2.1's binding rule: a sum-only reconciliation cannot see a dropped document,
-- because a void and its original sum to zero whether both are counted or neither
-- is. These two count instead. They also refuse the opposite failure — a join that
-- fans out and counts a movement twice.
select chk('nothing dropped, nothing doubled: every waste movement is in exactly one bucket',
           (select coalesce(sum(waste_movement_count),0) from product_waste_daily)
         = (select count(*) from stock_movement where reason = 'waste'),
           (select coalesce(sum(waste_movement_count),0) || ' in the view' from product_waste_daily)
        || (select ' vs ' || count(*) || ' in the ledger' from stock_movement where reason='waste'));

select chk('nothing dropped, nothing doubled: every delivery line is in exactly one bucket',
           (select coalesce(sum(purchase_line_count),0) from product_waste_daily)
         = (select count(*) from purchase_line),
           (select coalesce(sum(purchase_line_count),0) || ' in the view' from product_waste_daily)
        || (select ' vs ' || count(*) || ' in purchase_line' from purchase_line));

-- Per bucket, not only in total. Two errors that cancel across the shop — a
-- variant credited to the wrong store, a delivery credited to its neighbour — are
-- invisible to every check above and to none of this one.
select chk('per (store, product): every bucket matches an independent aggregate',
           (select count(*) from (
              select coalesce(v.ws, x.ws) ws
                from (select workspace_id ws, location_id loc, variant_id var,
                             sum(waste_cost_net) w, sum(purchases_net) p, sum(waste_qty_base) q
                        from product_waste_daily group by 1,2,3) v
                full outer join (
                     select coalesce(a.ws,c.ws) ws, coalesce(a.loc,c.loc) loc,
                            coalesce(a.var,c.var) var,
                            coalesce(a.w,0) w, coalesce(c.p,0) p, coalesce(a.q,0) q
                       from (select workspace_id ws, location_id loc, variant_id var,
                                    sum(-qty_base*unit_cost_net_per_base) w, sum(-qty_base) q
                               from stock_movement where reason='waste' group by 1,2,3) a
                       full outer join (
                            select workspace_id ws, location_id loc, variant_id var,
                                   sum(line_net) p from purchase_line group by 1,2,3) c
                         on c.ws = a.ws and c.loc = a.loc and c.var = a.var) x
                  on x.ws = v.ws and x.loc = v.loc and x.var = v.var
               where v.w is distinct from x.w
                  or v.p is distinct from x.p
                  or v.q is distinct from x.q) d) = 0,
           'disagreeing (store, product) buckets');

-- ⚠️ THE CHOICE 0011 MADE, MEASURED RATHER THAN ARGUED. `waste_line` carries a
-- cost snapshot of its own and the view does not use it, because the line's cost
-- is a quantity-weighted average over the lots while the ledger's is per lot. The
-- two must agree to a hair — that proves the snapshot is honestly derived — and
-- must NOT be identical, because if they were, the choice would not matter and
-- this comment would be describing a distinction that is not there.
select chk('the document''s cost snapshot reconciles with the ledger to under a centavo',
           abs((select coalesce(sum(qty_base * unit_cost_net_per_base),0) from waste_line)
             - (select coalesce(sum(-qty_base * unit_cost_net_per_base),0)
                  from stock_movement where reason='waste')) < 0.01,
           (select 'document ' || round(coalesce(sum(qty_base*unit_cost_net_per_base),0),6) from waste_line)
        || (select ' vs ledger ' || round(coalesce(sum(-qty_base*unit_cost_net_per_base),0),6)
              from stock_movement where reason='waste'));

select chk('...and is NOT the same number, which is why the view reads the ledger',
           (select coalesce(sum(qty_base * unit_cost_net_per_base),0) from waste_line)
        <> (select coalesce(sum(-qty_base * unit_cost_net_per_base),0)
              from stock_movement where reason='waste'),
           'waste_line.unit_cost_net_per_base is a weighted mean rounded to 6dp; '
        || 'the movements carry the per-lot cost exactly');

-- The claim this view is structurally unable to make, made here instead (see the
-- header of 0011). A write-off that recorded a loss and moved no stock would be
-- invisible to a view built on movements.
select chk('every waste line moved stock, so nothing the view cannot see is hiding',
           (select count(*) from waste_line wl
             where not exists (select 1 from stock_movement m
                                where m.waste_id = wl.waste_id
                                  and m.variant_id = wl.variant_id
                                  and m.reason = 'waste')) = 0,
           'waste lines with no matching movement');

-- A shop that throws away a third of what it buys is a schema bug, not a business.
-- A smell test on the whole seed rather than a claim about any row: an inverted
-- attribution or a gross/net mix-up lands outside this band.
select chk('the shop wastes a plausible fraction of what it buys',
           (select sum(waste_cost_net) from product_waste_daily) > 0
       and (select sum(waste_cost_net) / sum(purchases_net) from product_waste_daily)
           between 0.0005 and 0.15,
           (select 'wasted ' || round(sum(waste_cost_net),2)
                 || ' against purchases of ' || round(sum(purchases_net),2)
                 || ' = ' || round(100*sum(waste_cost_net)/sum(purchases_net),3) || '%'
              from product_waste_daily));


-- ============= 3. the division at the end, and its three failures ==
-- ⚠️ THE SECTION plan task 2.2 EXISTS FOR. It asked for one division by zero to be
-- pinned — "a product wasted in a period it was not bought in". The seed has three
-- distinct failures, only one of which is a zero, and the guard that survives all
-- three is `sum(purchases_net) > 0` rather than `nullif(..., 0)`.

-- The view, rolled up to the month a report actually asks about. `_led` above is
-- the same thing read straight off the base tables; the first check is that they
-- are the same thing.
create temp view _mo as
select workspace_id ws, location_id loc, variant_id var,
       date_trunc('month', day)::date mo,
       sum(waste_cost_net)      w,
       sum(purchases_net)       p,
       sum(purchase_line_count) pn
  from product_waste_daily group by 1,2,3,4;

select chk('the view reproduces the ledger''s month-grain buckets, all three failures included',
           (select count(*) from (
              select coalesce(v.ws,l.ws) ws from _mo v
                full outer join _led l
                  on l.ws = v.ws and l.loc = v.loc and l.var = v.var and l.mo = v.mo
               where coalesce(v.w,0)  is distinct from coalesce(l.w,0)
                  or coalesce(v.p,0)  is distinct from coalesce(l.p,0)
                  or coalesce(v.pn,0) is distinct from coalesce(l.pn,0)) d) = 0,
           (select (select count(*) from _mo) || ' view bucket(s) vs '
                || (select count(*) from _led) || ' ledger bucket(s)'));

-- --- failure 1: never bought in the window ----------------------------------
select ws, loc, var, mo from _led where w > 0 and pn = 0 order by w desc limit 1 \gset nb_

select chk('denominator 1/3 — NEVER BOUGHT: a wasted product with no delivery in the window',
           (select w  from _mo where ws=:'nb_ws' and loc=:'nb_loc' and var=:'nb_var' and mo=:'nb_mo') > 0
       and (select pn from _mo where ws=:'nb_ws' and loc=:'nb_loc' and var=:'nb_var' and mo=:'nb_mo') = 0
       and (select p  from _mo where ws=:'nb_ws' and loc=:'nb_loc' and var=:'nb_var' and mo=:'nb_mo') = 0,
           (select v.name || ' at ' || l.name || ' in ' || :'nb_mo' || ': wasted '
                || round((select w from _mo where ws=:'nb_ws' and loc=:'nb_loc'
                                              and var=:'nb_var' and mo=:'nb_mo'),2)
                || ', bought nothing'
              from product_variant v, location l
             where v.id = :'nb_var' and l.id = :'nb_loc'));

-- --- failure 2: bought, then cancelled --------------------------------------
-- The one `nullif` was written for, and NOT the same fact as failure 1: the shop
-- did place the order. Only the line count separates them, which is why it is a
-- column and not a debugging aid.
select ws, loc, var, mo from _led where pn > 0 and p = 0 order by pn desc, var limit 1 \gset bc_

select chk('denominator 2/3 — BOUGHT THEN CANCELLED: net zero with a non-zero line count',
           (select p  from _mo where ws=:'bc_ws' and loc=:'bc_loc' and var=:'bc_var' and mo=:'bc_mo') = 0
       and (select pn from _mo where ws=:'bc_ws' and loc=:'bc_loc' and var=:'bc_var' and mo=:'bc_mo') > 0,
           (select v.name || ' at ' || l.name || ' in ' || :'bc_mo' || ': net 0 across '
                || (select pn from _mo where ws=:'bc_ws' and loc=:'bc_loc'
                                         and var=:'bc_var' and mo=:'bc_mo') || ' delivery line(s)'
              from product_variant v, location l
             where v.id = :'bc_var' and l.id = :'bc_loc'));

select chk('...and the two zeroes are distinguishable, which is the point of the count',
           (select pn from _mo where ws=:'nb_ws' and loc=:'nb_loc' and var=:'nb_var' and mo=:'nb_mo')
        <> (select pn from _mo where ws=:'bc_ws' and loc=:'bc_loc' and var=:'bc_var' and mo=:'bc_mo'),
           'both denominators are 0; one is "never bought" and one is "bought and cancelled"');

-- --- failure 3: bought before the window, voided inside it ------------------
-- ⚠️ THE ONE NEITHER THE PLAN NOR `nullif` ANTICIPATED. The void's negated lines
-- land in this window; the delivery they cancel does not.
select ws, loc, var, mo from _led where w > 0 and p < 0 order by p limit 1 \gset neg_

select chk('denominator 3/3 — NET NEGATIVE: a void inside the window, its delivery outside it',
           (select p from _mo where ws=:'neg_ws' and loc=:'neg_loc' and var=:'neg_var' and mo=:'neg_mo') < 0
       and (select w from _mo where ws=:'neg_ws' and loc=:'neg_loc' and var=:'neg_var' and mo=:'neg_mo') > 0,
           (select v.name || ' at ' || l.name || ' in ' || :'neg_mo' || ': purchases '
                || (select p from _mo where ws=:'neg_ws' and loc=:'neg_loc'
                                        and var=:'neg_var' and mo=:'neg_mo')
              from product_variant v, location l
             where v.id = :'neg_var' and l.id = :'neg_loc'));

-- --- the guard, over all three ----------------------------------------------
select chk('the guard: `> 0` yields NULL for every one of the three, and never a number',
           (select count(*) from _mo
             where p <= 0
               and (case when p > 0 then w / p end) is not null) = 0
       and (select count(*) from _mo
             where p > 0 and (case when p > 0 then w / p end) is null) = 0,
           (select count(*) || ' bucket(s) with a usable denominator, '
              from _mo where p > 0)
        || (select count(*) || ' rendered as unknown' from _mo where p <= 0));

select chk('the guard: it never yields a NEGATIVE share, which reads as un-wasting',
           (select count(*) from _mo where (case when p > 0 then w / p end) < 0) = 0);

-- The report §2.9 actually asks for, run for real — consolidated, one statement,
-- no join, no CTE, and it does not raise on any of the three failures above.
select count(*) as report_rows from (
  select variant_name,
         sum(waste_cost_net) as wasted,
         sum(purchases_net)  as bought,
         case when sum(purchases_net) > 0
              then sum(waste_cost_net) / sum(purchases_net) end as share
    from product_waste_daily
   where workspace_id = (select id from workspace order by created_at limit 1)
     and day >= date '2026-06-01'
   group by variant_name
   order by wasted desc
   limit 10) t \gset

select chk('"what am I throwing away", consolidated, is one statement that does not raise',
           :report_rows = 10, 'top-10 by waste cost returned ' || :report_rows || ' rows');


-- ================================= 4. the three things the ADR asked ==

-- --- the location rollup is a group-by the caller drops ----------------------
select chk('rollup: consolidated equals the sum of the stores, exactly',
           (select count(*) from (
              select variant_id, sum(waste_cost_net) w, sum(purchases_net) p
                from product_waste_daily group by 1) consolidated
              join (
              select variant_id, sum(w) w, sum(p) p from (
                select location_id, variant_id,
                       sum(waste_cost_net) w, sum(purchases_net) p
                  from product_waste_daily group by 1,2) per_store
               group by 1) summed
                on summed.variant_id = consolidated.variant_id
             where summed.w is distinct from consolidated.w
                or summed.p is distinct from consolidated.p) = 0,
           'products where consolidated <> sum of stores');

-- ⚠️ THE CAVEAT 0009 DOES NOT HAVE, PINNED AT ITS CURRENT BOUND. Transferred stock
-- is bought at one store and can be wasted at another (§2.4, 0005), which inflates
-- the destination's share and deflates the origin's while leaving the consolidated
-- number exact. The seed cannot demonstrate it — every variant wasted at the
-- Mercado stall was also delivered there — so this pins the bound at zero, and the
-- day a seed transfers stock that is then wasted where it was never bought, this
-- goes red and someone reads the header of 0011.
select chk('rollup: ⚠️ no product is wasted at a store it was never delivered to — the seed '
           'cannot show the transfer distortion',
           (select count(*) from (
              select distinct m.workspace_id ws, m.location_id loc, m.variant_id var
                from stock_movement m where m.reason = 'waste') t
             where not exists (select 1 from purchase_line pl
                                where pl.workspace_id = t.ws
                                  and pl.location_id  = t.loc
                                  and pl.variant_id   = t.var)) = 0,
           'when this stops being 0, the per-store share is distorted by transfers '
        || 'and the consolidated one is not');

-- ⚠️ AND THE SECOND BOUND, for the second mutation the seed cannot make. Dropping
-- `location_id` from the view's join key would fan a write-off at one store out
-- across another store's deliveries — and over this seed it changes nothing,
-- because no (product, day) pair has a delivery at one store and a write-off at
-- another. Pinned at zero so the falsification becomes possible loudly.
select chk('rollup: ⚠️ no (product, day) pair is delivered at one store and wasted at '
           'another — the seed cannot falsify the location key',
           (select count(*) from (
              select distinct m.workspace_id ws, m.variant_id var,
                     (x.occurred_at at time zone lz.timezone)::date d,
                     m.location_id wloc
                from stock_movement m join waste x on x.id = m.waste_id
                join location lz on lz.id = m.location_id and lz.workspace_id = m.workspace_id
               where m.reason = 'waste') w
             where exists (select 1 from purchase_line pl
                             join purchase p on p.id = pl.purchase_id
                             join location lz2 on lz2.id = pl.location_id
                                              and lz2.workspace_id = pl.workspace_id
                            where pl.workspace_id = w.ws
                              and pl.variant_id   = w.var
                              and (p.occurred_at at time zone lz2.timezone)::date = w.d
                              and pl.location_id <> w.wloc)) = 0,
           'when this stops being 0, dropping location_id from the join key becomes '
        || 'a mistake the checks above can see');


-- --- reversals ---------------------------------------------------------------
-- The strong form: over the whole window, the MONEY is what it would be if the
-- voided pairs had never been written. Anything weaker — "the void is excluded",
-- "the total looks plausible" — is satisfied by implementations wrong in the other
-- direction.
select chk('reversals: the money equals a ledger in which the voided pairs never happened',
           (select count(*) from (
              select coalesce(v.ws, x.ws) ws
                from (select workspace_id ws, variant_id var,
                             sum(waste_cost_net) w, sum(purchases_net) p
                        from product_waste_daily group by 1,2) v
                full outer join (
                     select coalesce(a.ws,c.ws) ws, coalesce(a.var,c.var) var,
                            coalesce(a.w,0) w, coalesce(c.p,0) p
                       from (select m.workspace_id ws, m.variant_id var,
                                    sum(-m.qty_base*m.unit_cost_net_per_base) w
                               from stock_movement m
                              where m.reason='waste'
                                and m.waste_id not in (select id from waste where reversal_of is not null)
                                and m.waste_id not in (select reversal_of from waste where reversal_of is not null)
                              group by 1,2) a
                       full outer join (
                            select workspace_id ws, variant_id var, sum(line_net) p
                              from purchase_line
                             where purchase_id not in (select id from purchase where reversal_of is not null)
                               and purchase_id not in (select reversal_of from purchase where reversal_of is not null)
                             group by 1,2) c
                         on c.ws = a.ws and c.var = a.var) x
                  on x.ws = v.ws and x.var = v.var
               where coalesce(v.w, 0) is distinct from coalesce(x.w, 0)
                  or coalesce(v.p, 0) is distinct from coalesce(x.p, 0)) d) = 0,
           'products whose money moves when the voided pairs are removed by hand');

-- ⚠️ AND THE ROW SURVIVES WHERE THE MONEY DOES NOT — the strongest form of 2.1's
-- "a void CANCELS its original, it does not ERASE it". 2.1 could only see that
-- with a count, because every void in the sale data lands on its original's day.
-- Here it is visible as a ROW: a product whose only delivery was voided still has
-- a bucket, at zero, because the shop did place the order. A ledger with the pairs
-- deleted has nothing there at all.
select chk('reversals: a product whose only delivery was voided still has a row, at zero',
           (select count(*) from (
              select workspace_id ws, variant_id var, sum(purchases_net) p,
                     sum(purchase_line_count) n
                from product_waste_daily group by 1,2) v
             where v.p = 0 and v.n > 0
               and not exists (select 1 from purchase_line pl
                                where pl.workspace_id = v.ws and pl.variant_id = v.var
                                  and pl.purchase_id not in (select id from purchase where reversal_of is not null)
                                  and pl.purchase_id not in (select reversal_of from purchase where reversal_of is not null))) >= 1,
           (select count(*) || ' product(s) ordered and cancelled, still reported at zero'
              from (select workspace_id ws, variant_id var, sum(purchases_net) p,
                           sum(purchase_line_count) n from product_waste_daily group by 1,2) v
             where v.p = 0 and v.n > 0));

-- ⚠️ THE DAY GRAIN IS WHERE A VOID BECOMES VISIBLE, and this is the assertion
-- 0009's seed could not make. Every void here lands on a later local day than its
-- original, so day-grain buckets do NOT agree with a pairs-never-happened ledger
-- even though the whole-window money does. That is not a defect — it is what
-- append-only means — and a report that windows tightly will see it.
select chk('reversals: at DAY grain the buckets differ, because a void lands on its own day',
           (select count(*) from (
              select coalesce(v.ws,x.ws) ws
                from (select workspace_id ws, variant_id var, day d,
                             sum(waste_cost_net) w, sum(purchases_net) p
                        from product_waste_daily group by 1,2,3) v
                full outer join (
                     select coalesce(a.ws,c.ws) ws, coalesce(a.var,c.var) var,
                            coalesce(a.d,c.d) d, coalesce(a.w,0) w, coalesce(c.p,0) p
                       from (select m.workspace_id ws, m.variant_id var,
                                    (x2.occurred_at at time zone lz.timezone)::date d,
                                    sum(-m.qty_base*m.unit_cost_net_per_base) w
                               from stock_movement m join waste x2 on x2.id = m.waste_id
                               join location lz on lz.id = m.location_id
                                               and lz.workspace_id = m.workspace_id
                              where m.reason='waste'
                                and m.waste_id not in (select id from waste where reversal_of is not null)
                                and m.waste_id not in (select reversal_of from waste where reversal_of is not null)
                              group by 1,2,3) a
                       full outer join (
                            select pl.workspace_id ws, pl.variant_id var,
                                   (p2.occurred_at at time zone lz.timezone)::date d,
                                   sum(pl.line_net) p
                              from purchase_line pl join purchase p2 on p2.id = pl.purchase_id
                              join location lz on lz.id = pl.location_id
                                              and lz.workspace_id = pl.workspace_id
                             where pl.purchase_id not in (select id from purchase where reversal_of is not null)
                               and pl.purchase_id not in (select reversal_of from purchase where reversal_of is not null)
                             group by 1,2,3) c
                         on c.ws = a.ws and c.var = a.var and c.d = a.d) x
                  on x.ws = v.ws and x.var = v.var and x.d = v.d
               where coalesce(v.w,0) is distinct from coalesce(x.w,0)
                  or coalesce(v.p,0) is distinct from coalesce(x.p,0)) d) > 0,
           'day buckets that move when the voided pairs are removed — the void has a day of its own');

-- --- unit conversion: it is not in the query, and that is the finding --------
select v.id as wid, v.name as wname
  from product_variant v
  join stock_movement m on m.variant_id = v.id and m.reason = 'waste'
 where v.base_unit_code <> v.purchase_unit_code
 group by v.id, v.name
 having count(*) >= 2
 order by count(*) desc, v.name
 limit 1 \gset weighed_

select chk('units: a weighed product bought by the kilo and binned in grams reconciles exactly',
           (select coalesce(sum(waste_qty_base),0) from product_waste_daily
             where variant_id = :'weighed_wid')
         = (select coalesce(sum(-qty_base),0) from stock_movement
             where reason = 'waste' and variant_id = :'weighed_wid')
       and (select coalesce(sum(purchases_qty_base),0) from product_waste_daily
             where variant_id = :'weighed_wid')
         = (select coalesce(sum(qty_base),0) from purchase_line
             where variant_id = :'weighed_wid'),
           :'weighed_wname');

select chk('units: both sides are reported in the BASE unit, so the share is money over money',
           (select distinct base_unit_code from product_waste_daily
             where variant_id = :'weighed_wid')
         = (select base_unit_code from product_variant where id = :'weighed_wid'));


-- ============================== 5. the wrong implementations disagree ==
-- Every check above would also pass against a view that is wrong in a way the seed
-- cannot see. These are the mistakes worth being sure about, written out and
-- asserted to produce DIFFERENT numbers.

-- --- wrong 1: `join` instead of `full outer join` ----------------------------
-- ⚠️ 0009 RECORDED THIS FALSIFICATION AS ONE ITS SEED COULD NOT MAKE — every
-- margin bucket has both sides. Here it is the single most destructive mistake
-- available: deliveries and write-offs of the same product almost never share a
-- day, so an inner join silently deletes almost all the waste in the shop.
create view public._waste_inner as
select w.workspace_id, w.location_id, w.variant_id, w.day, w.waste_cost_net
  from (select m.workspace_id, m.location_id, m.variant_id,
               (x.occurred_at at time zone lz.timezone)::date as day,
               sum(-m.qty_base*m.unit_cost_net_per_base) waste_cost_net
          from stock_movement m join waste x on x.id = m.waste_id
          join public.location lz on lz.id = m.location_id
                                 and lz.workspace_id = m.workspace_id
         where m.reason='waste' group by 1,2,3,4) w
  join (select pl.workspace_id, pl.location_id, pl.variant_id,
               (p.occurred_at at time zone lz.timezone)::date as day
          from purchase_line pl join purchase p on p.id = pl.purchase_id
          join public.location lz on lz.id = pl.location_id
                                 and lz.workspace_id = pl.workspace_id
         group by 1,2,3,4) b
    on b.workspace_id = w.workspace_id and b.location_id = w.location_id
   and b.variant_id   = w.variant_id   and b.day        = w.day;

select chk('falsified: an inner join loses almost every write-off in the shop',
           (select coalesce(sum(waste_cost_net),0) from public._waste_inner)
        <> (select coalesce(sum(waste_cost_net),0) from product_waste_daily)
       and (select count(*) from public._waste_inner)
         < (select count(*) from product_waste_daily where waste_movement_count > 0) / 10,
           (select count(*) || ' of ' from public._waste_inner)
        || (select count(*) || ' waste buckets survive an inner join'
              from product_waste_daily where waste_movement_count > 0));

-- --- wrong 2: nullif instead of the `> 0` guard ------------------------------
-- The guard the plan expected. It survives failure 1 and failure 2 and prints a
-- negative percentage on failure 3.
select chk('falsified: `nullif(p, 0)` renders a NEGATIVE waste percentage where `> 0` renders none',
           (select count(*) from _mo where w / nullif(p, 0) < 0) > 0
       and (select count(*) from _mo where (case when p > 0 then w / p end) < 0) = 0,
           (select count(*) || ' bucket(s) where nullif prints a negative share' from _mo
             where w / nullif(p, 0) < 0));

-- --- wrong 3: a denominator including IVA ------------------------------------
-- The mistake a person makes reading a delivery note, which shows the amount paid.
-- It is flattering by up to 16% and never in the other direction.
select chk('falsified: a gross denominator gives a DIFFERENT, systematically smaller share',
           (select coalesce(sum(line_net + tax_amount),0) from purchase_line)
        <> (select coalesce(sum(purchases_net),0) from product_waste_daily)
       and (select coalesce(sum(line_net + tax_amount),0) from purchase_line)
         > (select coalesce(sum(purchases_net),0) from product_waste_daily),
           (select 'gross ' || coalesce(sum(line_net+tax_amount),0) from purchase_line)
        || (select ' vs net ' || coalesce(sum(purchases_net),0) from product_waste_daily));

-- --- wrong 4: costing the loss at the latest purchase price -------------------
-- The shortcut that looks harmless: value what was binned at what that product
-- most recently cost, rather than at what the lots the allocator took cost. It is
-- the reason cost lives on the movement (0004).
select chk('falsified: costing the loss at the latest purchase price gives a DIFFERENT number',
           (select coalesce(sum(-m.qty_base * b.latest_cost),0)
              from stock_movement m
              join (select variant_id, workspace_id,
                           (array_agg(unit_cost_net_per_base order by received_at desc, id desc))[1] latest_cost
                      from stock_batch group by 1,2) b
                on b.variant_id = m.variant_id and b.workspace_id = m.workspace_id
             where m.reason = 'waste')
        <> (select coalesce(sum(waste_cost_net),0) from product_waste_daily),
           'batch attribution is the whole point of §2.9''s cost snapshot');

-- --- wrong 5: excluding void documents, the 0008 reflex ----------------------
-- It bites on BOTH sides here, unlike 0009 where only sales could be voided.
select chk('falsified: skipping void documents (the 0008 reflex) changes BOTH sides',
           (select coalesce(sum(pl.line_net),0) from purchase_line pl
              join purchase p on p.id = pl.purchase_id where p.reversal_of is null)
        <> (select coalesce(sum(purchases_net),0) from product_waste_daily)
       and (select coalesce(sum(-m.qty_base*m.unit_cost_net_per_base),0)
              from stock_movement m join waste x on x.id = m.waste_id
             where m.reason='waste' and x.reversal_of is null)
        <> (select coalesce(sum(waste_cost_net),0) from product_waste_daily),
           'a void must cancel its original, not merely be skipped');

-- --- wrong 6: averaging the ratios instead of dividing the sums ---------------
-- The reason the view ships no rate column. A ratio is not additive and `avg()`
-- over per-bucket shares weights a 2-peso product the same as a 2 000-peso one.
select chk('falsified: avg() of per-bucket shares is NOT the share of the shop',
           (select avg(w / p) from _mo where p > 0)
        <> (select sum(w) / sum(p) from _mo where p > 0),
           (select 'avg of shares ' || round(100*avg(w/p),3) from _mo where p > 0)
        || (select '% vs share of totals ' || round(100*sum(w)/sum(p),3) || '%'
              from _mo where p > 0));

-- --- wrong 7: a denominator not scoped to the store --------------------------
-- Per-store waste against consolidated purchases. Every store's share then looks
-- better than it is, by a factor of however many stores the merchant has.
select chk('falsified: measuring one store''s waste against the merchant''s purchases differs',
           (select count(*) from (
              select location_id, variant_id, sum(purchases_net) scoped
                from product_waste_daily group by 1,2) s
              join (select variant_id, sum(purchases_net) all_stores
                      from product_waste_daily group by 1) a on a.variant_id = s.variant_id
             where s.scoped is distinct from a.all_stores) > 0,
           'a product delivered to more than one store');


-- =========================================== 6. access, checked not assumed ==
-- ⚠️ 0009 STATES A `has_role` PREDICATE AND THIS VIEW DOES NOT, and 2.1's binding
-- note says that answer differs per view and is worth checking rather than
-- assuming. This is that check. It asserts the OUTCOME (a cashier reads nothing)
-- and the REASON (both base tables are gated, so inheritance fails closed), so a
-- future migration that relaxes either policy turns the second one red.

select id from auth.users where email = 'caja.centro@tienda.mx'  \gset staff_
select id from auth.users where email = 'rosa.gerente@tienda.mx' \gset mgr_
select id from auth.users where email = 'roble.owner@tienda.mx'  \gset ownerb_
select id from workspace where display_name = 'Tienda Doña Lupe' \gset wsa_

-- The failure this view would have if only ONE of its two sides were gated,
-- demonstrated rather than described — the mirror of 0009's `_margin_ungated`.
-- `waste` the header is member-level (it carries retail value, not cost), so a
-- numerator read from it against a manager-gated denominator tells a cashier the
-- shop threw away stock it never bought.
create view public._waste_half_gated with (security_invoker = true) as
select x.workspace_id, x.location_id,
       sum(x.total_net) as waste_value_net,
       coalesce((select sum(pl.line_net) from public.purchase_line pl
                  where pl.workspace_id = x.workspace_id
                    and pl.location_id  = x.location_id), 0) as purchases_net
  from public.waste x
 group by 1, 2;
grant select on public._waste_half_gated to authenticated;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'staff_id'), true);
set local role authenticated;

select chk('access: a cashier reads ZERO rows of the waste view',
           (select count(*) from product_waste_daily) = 0);

select chk('access: and the REASON is that both sides are gated at the source',
           (select count(*) from stock_movement where reason = 'waste') = 0
       and (select count(*) from purchase_line) = 0,
           'stock_movement and purchase_line are both manager-and-above, so '
        || 'security_invoker inheritance fails CLOSED and 0011 needs no predicate');

select chk('falsified: gate only ONE side and the same cashier is told the shop wastes '
           'what it never bought',
           (select count(*) from public._waste_half_gated) > 0
       and (select bool_and(purchases_net = 0) from public._waste_half_gated),
           (select count(*) || ' half-gated row(s) visible to a cashier, every one with a '
                 || 'zero denominator' from public._waste_half_gated));
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'mgr_id'), true);
set local role authenticated;

select chk('access: a manager reads their own tenant and only their own tenant',
           (select count(*) from product_waste_daily) > 0
       and (select count(*) from product_waste_daily
                where workspace_id <> :'wsa_id') = 0);

select chk('access: a manager sees both of their stores, so the rollup is theirs to make',
           (select count(distinct location_id) from product_waste_daily) = 2);

select chk('access: and the numbers they read are the numbers the ledger holds',
           (select round(coalesce(sum(waste_cost_net),0),6) from product_waste_daily)
         = (select round(coalesce(sum(-m.qty_base*m.unit_cost_net_per_base),0),6)
              from stock_movement m
             where m.reason = 'waste' and m.workspace_id = :'wsa_id')
       and (select coalesce(sum(purchases_net),0) from product_waste_daily)
         = (select coalesce(sum(line_net),0) from purchase_line
             where workspace_id = :'wsa_id'));
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'ownerb_id'), true);
set local role authenticated;

select chk('access: the other tenant''s owner sees none of the first tenant''s waste',
           (select count(*) from product_waste_daily) > 0
       and (select count(*) from product_waste_daily
                where workspace_id = :'wsa_id') = 0);
commit;


-- ========================================== 7. the day boundary is local ==
-- ⚠️ REWRITTEN BY 0012. There is no constant here any more: the boundary is
-- `location.timezone`, per store, and this file reads the same column. What has
-- NOT changed is the seed — every seeded document is a naive local time written
-- into a timestamptz column by a session running in UTC, so the shop trades in UTC
-- office hours and nothing crosses midnight in either zone. So this file still
-- cannot make a bucket move by itself; what it can now do is prove the boundary is
-- a COLUMN rather than a literal, which is a claim no arithmetic here could make
-- before. `supabase/checks/0012_location_timezone.sql` does the moving.

select chk('day: the boundary expression is local, not UTC',
           ('2026-08-21 03:00+00'::timestamptz at time zone 'America/Mexico_City')::date
             = date '2026-08-20'
       and ('2026-08-21 19:00+00'::timestamptz at time zone 'America/Mexico_City')::date
             = date '2026-08-21');

select chk('day: ⚠️ the seed trades in UTC office hours, so it cannot discriminate here',
           (select count(*) from waste w
              join location lz on lz.id = w.location_id and lz.workspace_id = w.workspace_id
             where (w.occurred_at at time zone lz.timezone)::date
                <> (w.occurred_at at time zone 'UTC')::date) = 0
       and (select count(*) from purchase p
              join location lz on lz.id = p.location_id and lz.workspace_id = p.workspace_id
             where (p.occurred_at at time zone lz.timezone)::date
                <> (p.occurred_at at time zone 'UTC')::date) = 0,
           'waste and delivery documents whose local day differs from their UTC day, '
        || 'in their own store''s zone — when this stops being 0 the seed can move a '
        || 'bucket without 0012 having to move a store');

-- ⚠️ THIS CHECK USED TO BE A DRIFT GUARD AND IS NOW A STRONGER CLAIM. Before 0012
-- both views hardcoded a zone, and the most that could be asserted was that the two
-- literals still MATCHED — because if one moved and the other did not, no
-- arithmetic check anywhere would notice, the seed agreeing with itself in both
-- zones. 0012 removed the literals, so the claim becomes: there is nothing left to
-- drift. Read out of the shipped definitions rather than the source files, so it is
-- a claim about what the database is doing.
--
-- ⚠️ WIDENED BY 2.3 TO ALL THREE ANALYTICS VIEWS, as docs/PLAN.md's "Settled in 2.4"
-- requires. The list is spelled out rather than discovered, so that ADDING a fourth
-- analytics view without adding it here fails the count instead of passing silently
-- — which is exactly the failure mode this check exists for.
create temp view _tz as
select v.relname::text as view_name,
       pg_get_viewdef(v.oid)                                     as def,
       (pg_get_viewdef(v.oid) ~* 'AT TIME ZONE ''[A-Za-z]+/')     as has_literal_zone,
       (pg_get_viewdef(v.oid) ~* 'timezone')                      as reads_column
  from (values ('product_margin_daily'::text), ('product_waste_daily'::text),
               ('product_velocity_daily'::text)) x(n)
  join pg_class v on v.relname = x.n and v.relnamespace = 'public'::regnamespace;

select chk('day: NO analytics view hardcodes a zone — all three read location.timezone',
           (select count(*) from _tz) = 3
       and (select bool_and(not has_literal_zone) from _tz)
       and (select bool_and(reads_column) from _tz),
           (select string_agg(view_name || ' => '
                   || case when has_literal_zone then 'STILL HARDCODED' else 'reads the column' end,
                   ', ' order by view_name) from _tz));

select chk('day: every bucket is a day the shop traded or took a delivery, in THAT store''s zone',
           (select count(*) from product_waste_daily d
             where not exists (select 1 from waste w
                                 join location lz on lz.id = w.location_id
                                                 and lz.workspace_id = w.workspace_id
                                where w.workspace_id = d.workspace_id
                                  and w.location_id  = d.location_id
                                  and (w.occurred_at at time zone lz.timezone)::date = d.day)
               and not exists (select 1 from purchase p
                                 join location lz on lz.id = p.location_id
                                                 and lz.workspace_id = p.workspace_id
                                where p.workspace_id = d.workspace_id
                                  and p.location_id  = d.location_id
                                  and (p.occurred_at at time zone lz.timezone)::date = d.day)) = 0);



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
drop view if exists public._waste_inner cascade;
drop view if exists public._waste_half_gated cascade;
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
    raise exception '% waste share check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % waste share checks passed', (select count(*) from public._verify);
end;
$$;
