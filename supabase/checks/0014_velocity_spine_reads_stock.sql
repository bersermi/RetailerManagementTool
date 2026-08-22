-- ============================================================================
-- What NEVER started selling — the spine reads the stock ledger — fix for 2.3
-- ============================================================================
-- ADR-035 §2.9 (analytics, and the "one catalog per workspace" decision settled
-- 2026-08-14), §2.4 (the ledger), §2.7 (access)
--
-- `0013` reported a gap and prescribed the wrong fix. This file asserts that
-- `0014` closes the gap, and that it does so without the new table `0013` asked
-- for — which is what ADR-035 §2.9 said would be true.
--
-- Five claims:
--
--   1. ⚠️ THE GAP IS CLOSED. 71 (store, product) pairs were delivered and never
--      sold, and `0013` could not see one of them. It now sees all 71 — section 2;
--   2. ⚠️ AND NOTHING WAS LOST TO CLOSE IT. The spine start can only move EARLIER.
--      No pair's history shortened, and not one unit, peso or line moved — section 3;
--   3. `batch_balance` and not `stock_batch`, and the difference is not cosmetic: a
--      cashier reads 454 rows of the first and **0** of the second, so the manager-
--      gated table would have given the till a spine built out of nothing —
--      section 4;
--   4. trusting a PROJECTION is safe here only because 1.7 made it so, and the
--      narrower claim this view depends on is asserted rather than inherited —
--      section 5;
--   5. `days_carried` is what turns the rows `0014` adds into a sentence a
--      shopkeeper can act on — section 6.
--
-- ⚠️ WHAT IS STILL NOT FIXED, and pinned in section 7: nothing records that a store
-- DELISTED a product, and 3 pairs stocked after their store's last selling day get
-- no spine at all. One mutation of the shipped view — `least` weakened to `coalesce`
-- — this seed cannot catch, and it is recorded in section 3 rather than papered over.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/ — `_cleanup.sql` truncates every table
-- but `unit` before each suite, so the seed is gone before the first one runs. 1.7,
-- 2.1, 2.2, 2.4 and 2.3 all give this reason.
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
select id from location where name = 'Sucursal Mercado' \gset mercado_


-- ================================================= 1. pre-flight ==
select chk('pre-flight: the seed still holds 2 263 sale lines and 1 041 lots',
           (select count(*) from sale_line) = 2263
       and (select count(*) from stock_batch) = 1041,
           (select (select count(*) from sale_line) || ' lines, '
                || (select count(*) from stock_batch) || ' lots'));

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception 'PRE-FLIGHT FAILED (% check(s)): the seed is not the one these '
      'numbers were read from.', v_failed;
  end if;
end;
$$;


-- ============================== 2. ⚠️ THE GAP IS CLOSED, AND BY HOW MUCH ==
-- `0013` shipped with a spine that began at a pair's first TICKET. A product
-- delivered to a store and never once sold had no row, no spine and no mention —
-- and "what never started selling" is arguably the more valuable half of the
-- question §2.9 asks.

select chk('⚠️ delivered-and-never-sold pairs invisible to the view: was 71, now ZERO',
           (select count(*) from (
              select distinct workspace_id, location_id, variant_id from purchase_line
              except
              select distinct workspace_id, location_id, variant_id from product_velocity_daily) x) = 0);

select chk('⚠️ and 71 pairs are now REPORTED that have never sold a single unit',
           (select count(*) from (
              select workspace_id, location_id, variant_id from product_velocity_daily v
               group by 1,2,3
              having max(v.qty_base_sold) <= 0) x) = 71,
           'the population 0013 could not name at all');

select chk('the spine grew from 439 pairs to 510, and from 24 268 rows to 30 472',
           (select count(*) from (select workspace_id, location_id, variant_id
                                    from product_velocity_daily group by 1,2,3) x) = 510
       and (select count(*) from product_velocity_daily) = 30472);

-- The named case, read as a shopkeeper would read it. This is the sentence that did
-- not exist before this migration.
select chk('the named case: Pepino at Mercado — 63 days on the shelf, never once sold',
           (select days_carried = 63 and days_since_last_sale is null and line_count = 0
              from product_velocity_daily v
              join product_variant pv on pv.id = v.variant_id
             where v.location_id = :'mercado_id' and pv.name = 'Pepino'
               and v.day = date '2026-08-15'),
           (select 'carried ' || days_carried || ' days, never sold, as of ' || day
              from product_velocity_daily v join product_variant pv on pv.id = v.variant_id
             where v.location_id = :'mercado_id' and pv.name = 'Pepino'
               and v.day = date '2026-08-15'));

-- ⚠️ THE TRANSFER CASE, WHICH IS WHY `purchase_line` WOULD NOT HAVE BEEN ENOUGH.
-- `0013`'s header named this as an objection to widening the spine with purchases;
-- `stock_batch.origin` spans purchase, transfer AND adjustment, so reading the stock
-- ledger answers it for free.
select chk('stock_batch.origin spans all three routes goods take into a store',
           (select count(distinct origin) from stock_batch) = 3
       and (select count(*) from stock_batch where origin = 'transfer') = 15
       and (select count(*) from stock_batch where origin = 'adjustment') = 1);

select chk('⚠️ the 1 pair that SOLD goods it was never delivered is visible too',
           (select count(*) from (
              select distinct workspace_id, location_id, variant_id from sale_line
              except select distinct workspace_id, location_id, variant_id from purchase_line) x) = 1
       and (select count(*) from (
              (select distinct workspace_id, location_id, variant_id from sale_line
               except select distinct workspace_id, location_id, variant_id from purchase_line)
              except
              select distinct workspace_id, location_id, variant_id from product_velocity_daily) y) = 0,
           'it arrived by transfer — purchase_line alone would still have missed it');

select chk('and 4 pairs in the stock ledger have no purchase at that store at all',
           (select count(*) from (
              select distinct workspace_id, location_id, variant_id from batch_balance
              except select distinct workspace_id, location_id, variant_id from purchase_line) x) = 4);


-- ================= 3. ⚠️ AND NOTHING WAS LOST TO CLOSE IT ==
-- The failure that would be hardest to notice is a report that quietly drops rows.
-- `least(first sale, first stock)` makes it impossible rather than unlikely, and
-- both directions are asserted.

select chk('⚠️ NO pair''s spine starts later than its first sale — history cannot shorten',
           (select count(*) from (
              select sl.workspace_id, sl.location_id, sl.variant_id,
                     min((s.occurred_at at time zone l.timezone)::date) as first_sale
                from sale_line sl
                join sale s on s.id = sl.sale_id and s.workspace_id = sl.workspace_id
                                                 and s.location_id  = sl.location_id
                join location l on l.id = sl.location_id and l.workspace_id = sl.workspace_id
               group by 1,2,3) f
             join (select workspace_id, location_id, variant_id, min(day) as spine_start
                     from product_velocity_daily group by 1,2,3) g
               using (workspace_id, location_id, variant_id)
            where g.spine_start > f.first_sale) = 0);

select chk('and NO pair''s spine starts later than its first delivery either',
           (select count(*) from (
              select pl.workspace_id, pl.location_id, pl.variant_id,
                     min((p.occurred_at at time zone l.timezone)::date) as first_delivery
                from purchase_line pl
                join purchase p on p.id = pl.purchase_id and p.workspace_id = pl.workspace_id
                                                         and p.location_id  = pl.location_id
                join location l on l.id = pl.location_id and l.workspace_id = pl.workspace_id
               group by 1,2,3) f
             join (select workspace_id, location_id, variant_id, min(day) as spine_start
                     from product_velocity_daily group by 1,2,3) g
               using (workspace_id, location_id, variant_id)
            where g.spine_start > f.first_delivery) = 0);

-- ⚠️ ONE FALSIFICATION THIS SEED CANNOT MAKE, recorded rather than papered over —
-- 2.1, 2.2 and 2.3 all did this, and a falsification table with only successes in it
-- is the more misleading artefact.
--
-- Weakening `least(first sale, first stock)` to `coalesce(first stock, first sale)`
-- — i.e. "use the stock day whenever there is one" — changes NOTHING over this seed
-- and turned not one check red. It is invisible because the stock evidence here is
-- never LATER than the first sale: earlier for 397 pairs, the same day for 42, later
-- for none. `least` is still right, because it is the spelling under which a report
-- cannot lose a row it printed yesterday whatever the ledger does.
--
-- So the precondition is pinned instead, at its exact shape. The day a pair sells
-- before any receipt is recorded — a backdated delivery, an offline sale replayed
-- late (§2.6), a correction — this goes red and someone reads this paragraph.
select chk('⚠️ cannot falsify: least vs coalesce is invisible while stock is never later',
           (select count(*) filter (where fb.first_stock < fs.first_sale) from (
              select sl.workspace_id, sl.location_id, sl.variant_id,
                     min((s.occurred_at at time zone l.timezone)::date) as first_sale
                from sale_line sl
                join sale s on s.id = sl.sale_id and s.workspace_id = sl.workspace_id
                                                 and s.location_id  = sl.location_id
                join location l on l.id = sl.location_id and l.workspace_id = sl.workspace_id
               group by 1,2,3) fs
             join (select bb.workspace_id, bb.location_id, bb.variant_id,
                          min((bb.received_at at time zone l.timezone)::date) as first_stock
                     from batch_balance bb
                     join location l on l.id = bb.location_id and l.workspace_id = bb.workspace_id
                    group by 1,2,3) fb using (workspace_id, location_id, variant_id)) = 397
       and (select count(*) filter (where fb.first_stock > fs.first_sale) from (
              select sl.workspace_id, sl.location_id, sl.variant_id,
                     min((s.occurred_at at time zone l.timezone)::date) as first_sale
                from sale_line sl
                join sale s on s.id = sl.sale_id and s.workspace_id = sl.workspace_id
                                                 and s.location_id  = sl.location_id
                join location l on l.id = sl.location_id and l.workspace_id = sl.workspace_id
               group by 1,2,3) fs
             join (select bb.workspace_id, bb.location_id, bb.variant_id,
                          min((bb.received_at at time zone l.timezone)::date) as first_stock
                     from batch_balance bb
                     join location l on l.id = bb.location_id and l.workspace_id = bb.workspace_id
                    group by 1,2,3) fb using (workspace_id, location_id, variant_id)) = 0,
           'stock earlier for 397 pairs, later for 0 — when the second stops being '
        || '0, least() starts earning its keep and coalesce() would lose a row');


-- ⚠️ THE FIX ADDS ROWS. IT MUST NOT ADD A CENTAVO. Same three reconciliations 0013
-- makes, restated here because this migration is the one that could have broken them.
select chk('not one unit, peso or line was created by widening the spine',
           (select coalesce(sum(qty_base_sold),0) from product_velocity_daily)
         = (select coalesce(sum(qty_base),0) from sale_line)
       and (select coalesce(sum(revenue_net),0) from product_velocity_daily)
         = (select coalesce(sum(line_net),0) from sale_line)
       and (select coalesce(sum(line_count),0) from product_velocity_daily)
         = (select count(*) from sale_line),
           (select 'still ' || coalesce(sum(revenue_net),0) || ' net over '
                || coalesce(sum(line_count),0) || ' lines' from product_velocity_daily));

select chk('every row 0014 added is a silent one — the new pairs carry no money',
           (select count(*) from product_velocity_daily
             where line_count = 0 and (revenue_net <> 0 or qty_base_sold <> 0)) = 0);

select chk('the spine is still gapless — one row per calendar day per pair',
           (select count(*) from (
              select workspace_id, location_id, variant_id,
                     count(*) as n, (max(day) - min(day) + 1) as span
                from product_velocity_daily group by 1,2,3) x
             where x.n <> x.span) = 0);


-- ========== 4. ⚠️ batch_balance AND NOT stock_batch, DEMONSTRATED NOT ARGUED ==
-- `0013`'s header objected that widening the spine would "drag two manager-gated
-- tables into a member-level view" and make a cashier and a manager see different
-- numbers of rows for the same store. That objection was right about `stock_batch`
-- and wrong about the fix being impossible — `batch_balance` is the same evidence
-- with `sale_line`'s own predicate and no cost column.

select chk('batch_balance''s RLS predicate is CHARACTER FOR CHARACTER sale_line''s',
           (select qual::text from pg_policies
             where schemaname = 'public' and tablename = 'batch_balance' and policyname = 'batch_balance_select')
         = (select qual::text from pg_policies
             where schemaname = 'public' and tablename = 'sale_line' and policyname = 'sale_line_select'),
           (select qual::text from pg_policies
             where schemaname = 'public' and tablename = 'batch_balance'));

select chk('and stock_batch''s is NOT — it adds has_role(manager)',
           (select qual::text from pg_policies
             where schemaname = 'public' and tablename = 'stock_batch') ~* 'has_role');

select chk('batch_balance carries no cost column at all, so the view gains no cost reach',
           (select count(*) from information_schema.columns
             where table_schema = 'public' and table_name = 'batch_balance'
               and column_name like '%cost%') = 0
       and pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'stock_batch'
       and pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'unit_cost');

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'caja.centro@tienda.mx')), true);
set local role authenticated;

-- ⚠️ THE NUMBER THAT SETTLES THE CHOICE. Had the spine read `stock_batch`, the
-- cashier's evidence set would have been EMPTY and their never-sold products would
-- have vanished while a manager saw them — the exact divergence 0013 warned about.
select chk('⚠️ a cashier reads 454 batch_balance rows and ZERO stock_batch rows',
           (select count(*) from batch_balance) = 454
       and (select count(*) from stock_batch) = 0,
           'reading stock_batch would have built the till''s spine out of nothing');

select chk('access: the cashier still READS the view, and only their own store',
           (select count(*) from product_velocity_daily) = 15099
       and (select count(distinct location_id) from product_velocity_daily) = 1
       and (select count(*) from product_velocity_daily where location_id <> :'centro_id') = 0);

select chk('access: and they see the never-sold products at their own store',
           (select count(*) from (
              select workspace_id, location_id, variant_id from product_velocity_daily
               group by 1,2,3 having max(qty_base_sold) <= 0) x) > 0,
           (select count(*) || ' never-sold pairs visible to the till'
              from (select workspace_id, location_id, variant_id from product_velocity_daily
                     group by 1,2,3 having max(qty_base_sold) <= 0) x));
commit;

select chk('access: and those are exactly the manager''s Centro rows — narrowed, not distorted',
           (select count(*) from product_velocity_daily where location_id = :'centro_id') = 15099);


-- ========== 5. ⚠️ IT IS A PROJECTION, AND 1.7 IS WHY THAT IS SAFE ==
-- Reading a derived table where a ledger exists is normally the wrong instinct. The
-- broad claim — the projection agrees with `stock_movement` and can be rebuilt from
-- it — is `supabase/checks/seed_invariant.sql`'s and runs on every CI run. This is
-- the narrow claim the spine actually depends on, made here so that a drift in the
-- projection turns the spine red rather than quietly shortening it.

select chk('⚠️ batch_balance and stock_batch agree on the spine''s evidence set, both ways',
           (select count(*) from (
              (select distinct workspace_id, location_id, variant_id, received_at from batch_balance
               except
               select distinct workspace_id, location_id, variant_id, received_at from stock_batch)
              union all
              (select distinct workspace_id, location_id, variant_id, received_at from stock_batch
               except
               select distinct workspace_id, location_id, variant_id, received_at from batch_balance)) d) = 0);

select chk('and the projection keeps EMPTIED lots, so history is not consumed away',
           (select count(*) from batch_balance) = (select count(*) from stock_batch)
       and (select count(*) from batch_balance where remaining_base = 0) = 98,
           (select count(*) || ' of ' || (select count(*) from batch_balance)
                || ' lots are fully consumed and still carry their received_at'
              from batch_balance where remaining_base = 0));


-- ============================ 6. days_carried, the column that makes it legible ==

select chk('days_carried is 0 on each pair''s first row and never negative',
           (select count(*) from product_velocity_daily where days_carried < 0) = 0
       and (select count(*) from (select workspace_id, location_id, variant_id
                                    from product_velocity_daily where days_carried = 0
                                   group by 1,2,3) x) = 510);

select chk('it is an AGE and rolls up as a MAX, never a sum — demonstrated',
           (select count(*) from (
              select variant_id, day, max(days_carried) as m, sum(days_carried) as s
                from product_velocity_daily group by 1,2 having count(*) > 1) x
             where x.s > x.m) > 0,
           'a product carried 30 days at one store and 60 at another has not been '
        || 'carried 90 days anywhere');

select chk('the longest-carried never-sold product is 63 days on the shelf',
           (select max(days_carried) from product_velocity_daily v
             where not exists (select 1 from product_velocity_daily w
                                where w.workspace_id = v.workspace_id
                                  and w.location_id  = v.location_id
                                  and w.variant_id   = v.variant_id
                                  and w.qty_base_sold > 0)) = 63);


-- ================= 7. ⚠️ WHAT IS STILL NOT FIXED, PINNED RATHER THAN OMITTED ==

-- A pair whose stock arrived after its store's last selling day has a spine start
-- later than its end, so generate_series yields nothing and it gains no rows. That
-- is correct — there is no trading day on which to report it — but it is named.
select chk('⚠️ 3 pairs were stocked AFTER their store stopped selling, and get no spine',
           (select count(*) from (
              select bb.workspace_id, bb.location_id, bb.variant_id,
                     min((bb.received_at at time zone l.timezone)::date) as first_stock
                from batch_balance bb
                join location l on l.id = bb.location_id and l.workspace_id = bb.workspace_id
               group by 1,2,3) f
             join (select workspace_id, location_id, max(day) as last_day
                     from product_velocity_daily group by 1,2) t
               using (workspace_id, location_id)
            where f.first_stock > t.last_day) = 3,
           'no trading day exists to report them on; when a store keeps trading '
        || 'this falls to 0 on its own');

-- ⚠️ DELISTING IS A DIFFERENT FACT AND IS GENUINELY NOT RECORDED. "When did we start
-- carrying this" is answerable from the ledger, which is what 0014 shows. "When did
-- we decide to stop" is an intention, and the ledger records events. Owner's call.
select chk('⚠️ nothing records a DELISTING — no table carries such a fact',
           (select count(*) from information_schema.columns
             where table_schema = 'public'
               and (column_name like '%delist%' or column_name like '%carried_until%'
                    or column_name like '%discontinued%')) = 0,
           'a product stocked once and deliberately dropped keeps generating '
        || 'silence rows until the store stops trading — true before 0014 too, so '
        || 'nothing regressed, but it is not fixed and it is a NEW fact');

select chk('0014 ships no table, no function and no policy — it is a view body',
           (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind = 'r'
               and c.relname in ('location_product','location_variant','carried_product')) = 0
       and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname like '%carried%') = 0,
           'ADR-035 §2.9 settled on 2026-08-14 that stock being per location already '
        || 'covers "we don''t carry that here". It was right.');

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
    raise exception '% velocity spine check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % velocity spine checks passed', (select count(*) from public._verify);
end;
$$;
