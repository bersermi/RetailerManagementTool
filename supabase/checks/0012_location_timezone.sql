-- ============================================================================
-- A trading day is local — location.timezone over seed data  —  plan task 2.4
-- ============================================================================
-- ADR-035 §2.3 (data model), §2.9 (analytics), §2.7 (access)
--
-- `0012_location_timezone.sql` claims three things, and only the third is new:
--
--   1. applying it MOVES NOTHING, because the column's default is exactly the
--      literal `0009` and `0011` used to hardcode;
--   2. a zone Postgres does not know cannot be written, and the failure lands on
--      the write rather than on tomorrow's report;
--   3. ⚠️ THE BOUNDARY IS NOW REACHABLE. Before this migration, the day boundary
--      was a constant in two view bodies and **no check in this repo could move
--      it**. 2.1 and 2.2 both recorded that as a limitation and pinned a bound at
--      zero instead. This file is the falsification those two could not perform:
--      it moves one store's zone, watches that store's buckets move, watches the
--      other stores' buckets NOT move, watches the money stay the same, and puts
--      it back.
--
-- ⚠️ THE SEED STILL TRADES IN UTC OFFICE HOURS and that has NOT been fixed here —
-- fixing it means rewriting every timestamp in `20_consumption.sql` and therefore
-- every hash-derived quantity in the seed, which is 1.6b's territory. What changed
-- is that the boundary no longer has to come from the seed's clock: it can come
-- from the column, and the column is ours to move.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/
-- -----------------------------------------
-- The reason 1.7, 2.1 and 2.2 give: `_cleanup.sql` truncates every table but
-- `unit` before each suite, so the seed is gone before the first one runs and a
-- bucket comparison over an empty database is `0 = 0`.
--
-- ⚠️ THIS FILE WRITES TO `location` AND PUTS IT BACK. That is deliberate and it is
-- 1.7's precedent — `seed_invariant.sql` corrupts the projection and repairs it on
-- every run, so that a green is never a green from a check that cannot go red. The
-- last section asserts the restoration against a baseline captured before anything
-- moved, so a half-restored database fails here rather than in the next file.
-- `location.updated_at` does move, because `location_set_updated_at` fires; nothing
-- asserts it and the next `db reset` resets it.
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

-- Records whether a statement raised, and with which sqlstate. Same helper the
-- suites in supabase/tests/ use; plpgsql wraps `execute` in a subtransaction, so a
-- rejected write leaves nothing behind.
create or replace function public.chk_raises(p_label text, p_sql text, p_expect text default null)
returns void language plpgsql as $$
declare v_state text;
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_state := sqlstate;
  perform public.chk(p_label,
                     p_expect is null or v_state = p_expect,
                     'sqlstate ' || v_state || coalesce(' (wanted ' || p_expect || ')', ''));
end;
$$;


-- =============================================== 1. there is a shop here ==

select chk('seed present: the ledger holds documents of all three kinds',
           (select count(*) from sale) >= 500
       and (select count(*) from waste) >= 20
       and (select count(*) from purchase) >= 50,
           (select count(*) || ' sales, ' from sale)
        || (select count(*) || ' write-offs, ' from waste)
        || (select count(*) || ' deliveries' from purchase));

select chk('seed present: more than one store, or "per location" is untestable',
           (select count(*) from location) >= 3,
           (select string_agg(name, ', ' order by name) from location));

-- ⚠️ THE PRECONDITION FOR EVERYTHING BELOW. If a store already carried a
-- non-default zone, the bucket movements in sections 4 and 5 could be somebody
-- else's and the restoration would put back the wrong value.
select chk('seed present: every store still carries the DEFAULT zone',
           (select count(*) from location where timezone <> 'America/Mexico_City') = 0,
           (select string_agg(distinct timezone, ', ') from location));

select chk('the column is NOT NULL and defaults to the literal 0009 and 0011 hardcoded',
           (select attnotnull from pg_attribute
             where attrelid = 'public.location'::regclass and attname = 'timezone')
       and (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d
              join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
             where d.adrelid = 'public.location'::regclass and a.attname = 'timezone')
           like '%America/Mexico_City%',
           (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d
              join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
             where d.adrelid = 'public.location'::regclass and a.attname = 'timezone'));

select chk('every stored zone is a canonical name this Postgres knows',
           (select count(*) from location l
             where not exists (select 1 from pg_timezone_names t where t.name = l.timezone)) = 0);

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception
      'PRE-FLIGHT FAILED (% check(s)): this is not a multi-store shop whose '
      'locations all still carry the column''s default, so moving one store proves '
      'nothing, restoring it would write the wrong value back, and the claim that '
      'applying 0012 moves no bucket cannot be made. Check 4 failing means the '
      'DEFAULT itself is no longer the literal 0009 and 0011 hardcoded.', v_failed;
  end if;
end;
$$;


-- ================================ 2. applying 0012 moved NOTHING ==
-- ⚠️ THE CLAIM THAT MAKES THIS SAFE TO APPLY TO A LIVE SHOP. Both views used to
-- bucket on a hardcoded `America/Mexico_City`; they now bucket on a column whose
-- default is that same string. So every bucket in a database that existed before
-- this migration must be exactly where it was. Demonstrated by recomputing both
-- views' day sets with the old literal and asserting they are identical.

create temp table _base_m as
select workspace_id, location_id, variant_id, day, revenue_net, cogs_net, line_count
  from product_margin_daily;

create temp table _base_w as
select workspace_id, location_id, variant_id, day, waste_cost_net, purchases_net,
       waste_movement_count, purchase_line_count
  from product_waste_daily;

select chk('margin: every bucket is where the old hardcoded constant put it',
           (select count(*) from (
              select workspace_id, location_id, variant_id, day, revenue_net from _base_m
              except
              select sl.workspace_id, sl.location_id, sl.variant_id,
                     (s.occurred_at at time zone 'America/Mexico_City')::date,
                     sum(sl.line_net)
                from sale_line sl join sale s on s.id = sl.sale_id
               group by 1,2,3,4) d) = 0,
           (select count(*) || ' margin bucket(s) captured' from _base_m));

select chk('waste: every delivery bucket is where the old hardcoded constant put it',
           (select count(*) from (
              select workspace_id, location_id, variant_id, day, purchases_net
                from _base_w where purchase_line_count > 0
              except
              select pl.workspace_id, pl.location_id, pl.variant_id,
                     (p.occurred_at at time zone 'America/Mexico_City')::date,
                     sum(pl.line_net)
                from purchase_line pl join purchase p on p.id = pl.purchase_id
               group by 1,2,3,4) d) = 0,
           (select count(*) || ' waste bucket(s) captured' from _base_w));


-- ========================================= 3. the guard on the column ==
-- The failure it prevents is not loud enough to leave alone: an unknown zone
-- raises at SELECT time, so a bad value written today takes tomorrow's report down
-- in front of whoever opened it, and the person who typed it is gone.

select id from location where name = 'Doña Lupe Centro' \gset centro_
select id from location where name = 'Sucursal Mercado' \gset mercado_
select id from location where name = 'El Roble'         \gset roble_

select chk_raises('guard: a zone that does not exist is refused on WRITE',
  format('update location set timezone = %L where id = %L',
         'Mars/Olympus_Mons', :'centro_id'), '22023');

-- ⚠️ CASE MATTERS, AND THAT IS A CHOICE. `AT TIME ZONE` would accept this
-- spelling; the column does not, because the stored value is compared across rows
-- and across two views, and two spellings of one zone are two zones to everything
-- except Postgres.
select chk_raises('guard: a non-canonical spelling of a REAL zone is refused',
  format('update location set timezone = %L where id = %L',
         'america/mexico_city', :'centro_id'), '22023');

-- A fixed offset cannot follow daylight saving, and a shop's day boundary has to
-- move when its country's does.
select chk_raises('guard: a fixed offset is refused, because it cannot follow DST',
  format('update location set timezone = %L where id = %L',
         '-06:00', :'centro_id'), '22023');

select chk_raises('guard: an empty string is refused',
  format('update location set timezone = %L where id = %L', '', :'centro_id'), '22023');

select chk('guard: and it is scoped to the column, so renaming a store pays nothing',
           (select pg_get_triggerdef(oid) from pg_trigger
             where tgrelid = 'public.location'::regclass
               and tgname = 'location_timezone_valid_trg') ilike '%UPDATE OF timezone%',
           (select pg_get_triggerdef(oid) from pg_trigger
             where tgrelid = 'public.location'::regclass
               and tgname = 'location_timezone_valid_trg'));

select chk('guard: nothing above left a mark — every store still carries the default',
           (select count(*) from location where timezone <> 'America/Mexico_City') = 0);

-- A new store gets the default without naming the column, which is what lets
-- onboard_workspace(), both seeds and every fixture in supabase/tests/ stay
-- untouched by this migration.
do $$
declare v_ws uuid; v_tz text;
begin
  select workspace_id into v_ws from public.location limit 1;
  insert into public.location (workspace_id, name) values (v_ws, '__tz_probe__')
    returning timezone into v_tz;
  perform public.chk('a new store gets the default without naming the column',
                     v_tz = 'America/Mexico_City', 'got ' || v_tz);
  delete from public.location where workspace_id = v_ws and name = '__tz_probe__';
end;
$$;


-- ============ 4. THE REAL CASE — Sonora, and the seed can see it ==
-- ⚠️ THIS IS THE FALSIFICATION 2.1 AND 2.2 COULD NOT PERFORM. Both recorded that
-- the day boundary was untestable over this seed and pinned a bound at zero
-- instead. It was untestable because it was a constant in a view body. It is a
-- column now, so it can be moved, and this section moves it.
--
-- `America/Hermosillo` is not a hypothetical: Sonora is UTC−7 all year against the
-- rest of the country's UTC−6, and it is the exact customer ADR-035 §2.3's
-- workspace/location split exists for. The seed CAN see it — not through sales or
-- write-offs, which sit at 09:00–20:40 UTC and cannot straddle a midnight one hour
-- away, but through the **early-morning deliveries**, which land at 06:00–07:00 UTC
-- and cross back over midnight in Sonora.

create temp table _hz_before as select * from _base_w;

update location set timezone = 'America/Hermosillo' where id = :'centro_id';

select chk('⚠️ moving ONE store to Sonora moves that store''s delivery buckets',
           (select count(*) from (
              (select variant_id, day, purchases_net from product_waste_daily
                where location_id = :'centro_id'
                except
               select variant_id, day, purchases_net from _hz_before
                where location_id = :'centro_id')) d) > 0,
           (select count(*) || ' delivery document(s) at Centro fall on a different '
                || 'local day in Sonora than in Mexico City'
              from purchase p
             where p.location_id = :'centro_id'
               and (p.occurred_at at time zone 'America/Hermosillo')::date
                <> (p.occurred_at at time zone 'America/Mexico_City')::date));

select chk('...and it moves NOTHING at the other two stores — the column is PER LOCATION',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day, waste_cost_net,
                      purchases_net, waste_movement_count, purchase_line_count
                 from product_waste_daily where location_id <> :'centro_id'
               except
               select * from _hz_before where location_id <> :'centro_id')
              union all
              (select * from _hz_before where location_id <> :'centro_id'
               except
               select workspace_id, location_id, variant_id, day, waste_cost_net,
                      purchases_net, waste_movement_count, purchase_line_count
                 from product_waste_daily where location_id <> :'centro_id')) d) = 0,
           'a workspace-level setting would have moved all three');

-- A boundary decides WHICH DAY a peso lands on. It must never decide HOW MANY.
select chk('...and not one centavo is created or destroyed by moving the boundary',
           (select coalesce(sum(purchases_net),0) from product_waste_daily)
         = (select coalesce(sum(purchases_net),0) from _hz_before)
       and (select coalesce(sum(waste_cost_net),0) from product_waste_daily)
         = (select coalesce(sum(waste_cost_net),0) from _hz_before)
       and (select coalesce(sum(purchase_line_count),0) from product_waste_daily)
         = (select coalesce(sum(purchase_line_count),0) from _hz_before),
           (select 'purchases still total ' || round(coalesce(sum(purchases_net),0),2)
              from product_waste_daily));

update location set timezone = 'America/Mexico_City' where id = :'centro_id';

select chk('...and putting Sonora back restores the waste view exactly',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day, waste_cost_net,
                      purchases_net, waste_movement_count, purchase_line_count
                 from product_waste_daily
               except
               select * from _hz_before)
              union all
              (select * from _hz_before
               except
               select workspace_id, location_id, variant_id, day, waste_cost_net,
                      purchases_net, waste_movement_count, purchase_line_count
                 from product_waste_daily)) d) = 0);


-- ====== 5. margin reads it too, and the seed needs an absurd zone to show it ==
-- ⚠️ THE LIMITATION 2.1 RECORDED, NOW PINNED AT ITS EXACT BOUNDARY. Sales sit at
-- 09:00–20:40 UTC, which is 03:00–14:40 in Mexico City — a window no Mexican zone
-- can straddle a midnight of. So no realistic zone moves a margin bucket in this
-- seed, and that is asserted rather than hoped for.

select chk('⚠️ NO Mexican zone moves a sale in this seed — the limitation, pinned',
           (select count(*) from sale s, (values ('America/Hermosillo'),('America/Tijuana'),
                                                 ('America/Cancun'),('America/Monterrey')) z(n)
             where (s.occurred_at at time zone z.n)::date
                <> (s.occurred_at at time zone 'America/Mexico_City')::date) = 0,
           'the seed trades 03:00-14:40 local; when it grows an evening trade this '
        || 'goes red and section 4 can use a real zone for margin too');

-- So margin gets an extreme one. `Pacific/Kiritimati` is UTC+14 and is chosen for
-- exactly one property: it is far enough that this seed's clock cannot hide it.
-- It proves the view READS THE COLUMN, which is the claim; it does not pretend to
-- be a customer.
update location set timezone = 'Pacific/Kiritimati' where id = :'centro_id';

select chk('margin: an extreme zone moves that store''s buckets, so the view reads the column',
           (select count(*) from (
              (select variant_id, day, revenue_net from product_margin_daily
                where location_id = :'centro_id'
                except
               select variant_id, day, revenue_net from _base_m
                where location_id = :'centro_id')) d) > 0,
           (select count(*) || ' sale(s) at Centro fall on a different local day at UTC+14'
              from sale s where s.location_id = :'centro_id'
               and (s.occurred_at at time zone 'Pacific/Kiritimati')::date
                <> (s.occurred_at at time zone 'America/Mexico_City')::date));

select chk('margin: and nothing moves at the other stores',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day, revenue_net, cogs_net, line_count
                 from product_margin_daily where location_id <> :'centro_id'
               except
               select * from _base_m where location_id <> :'centro_id')) d) = 0);

select chk('margin: and revenue, cost and the line count are all conserved',
           (select coalesce(sum(revenue_net),0) from product_margin_daily)
         = (select coalesce(sum(revenue_net),0) from _base_m)
       and (select coalesce(sum(cogs_net),0) from product_margin_daily)
         = (select coalesce(sum(cogs_net),0) from _base_m)
       and (select coalesce(sum(line_count),0) from product_margin_daily)
         = (select coalesce(sum(line_count),0) from _base_m),
           (select 'revenue still totals ' || round(coalesce(sum(revenue_net),0),2)
              from product_margin_daily));

-- ⚠️ AND THE TWO VIEWS MOVE TOGETHER, which is the whole point of one column. Under
-- the same zone, a store's margin days and its waste days are both computed from
-- `location.timezone`; before 0012 they were two literals that happened to agree.
select chk('both views bucket the moved store in the SAME zone, from the one column',
           (select count(*) from product_margin_daily d
             where d.location_id = :'centro_id'
               and not exists (select 1 from sale s
                                where s.location_id = d.location_id
                                  and (s.occurred_at at time zone 'Pacific/Kiritimati')::date = d.day)) = 0
       and (select count(*) from product_waste_daily d
             where d.location_id = :'centro_id' and d.waste_movement_count > 0
               and not exists (select 1 from waste w
                                where w.location_id = d.location_id
                                  and (w.occurred_at at time zone 'Pacific/Kiritimati')::date = d.day)) = 0);

update location set timezone = 'America/Mexico_City' where id = :'centro_id';


-- ============================================ 6. who may move a boundary ==
-- §2.7: `location_update` is owner-only, so the new column inherits an owner-only
-- write. That is the right level — the boundary decides what every report in the
-- shop means.

select id from auth.users where email = 'rosa.gerente@tienda.mx' \gset mgr_
select id from auth.users where email = 'lupe.owner@tienda.mx'   \gset ownera_

-- ⚠️ THESE BLOCKS COMMIT, THEY DO NOT ROLL BACK, and the difference is not
-- cosmetic. `chk()` records its verdict by INSERTING into `_verify`, so a section
-- wrapped in `begin ... rollback` throws away its own results: the file still
-- prints "all N checks passed" and N is quietly smaller. That happened while this
-- file was being written — four access checks vanished between 23 and 28 — and the
-- last check in section 7 exists so it cannot happen again silently.
--
-- So the owner's successful UPDATE below is undone explicitly, as the superuser,
-- and then asserted to be undone.

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'mgr_id'), true);
set local role authenticated;

select chk('access: a MANAGER can read the boundary',
           (select count(*) from location where id = :'centro_id') = 1);

-- A data-modifying CTE, because an UPDATE cannot sit in a subquery. RLS refuses by
-- returning no rows rather than by raising: the manager's statement succeeds and
-- changes nothing, which is exactly what a `USING` clause does and what §2.7
-- promises.
with u as (
  update location set timezone = 'America/Hermosillo'
   where id = :'centro_id' returning 1)
select chk('access: but a manager cannot MOVE it — that is an owner act',
           (select count(*) from u) = 0,
           'RLS location_update is has_role(workspace_id, ''owner'')');
commit;

select chk('access: and the manager''s attempt really did change nothing',
           (select timezone from location where id = :'centro_id') = 'America/Mexico_City');

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}', :'ownera_id'), true);
set local role authenticated;

with u as (
  update location set timezone = 'America/Hermosillo'
   where id = :'centro_id' returning 1)
select chk('access: an OWNER can move it', (select count(*) from u) = 1);

select chk('access: and the move is really there',
           (select timezone from location where id = :'centro_id') = 'America/Hermosillo');

-- The guard is a trigger, so it applies to every writer including the one allowed
-- to write. An owner cannot type a zone into existence either.
select chk_raises('access: and the guard still refuses the owner an unknown zone',
  format('update location set timezone = %L where id = %L',
         'Sonora/Hermosillo', :'centro_id'), '22023');
commit;

-- Undone as the superuser, because the owner's change committed.
update location set timezone = 'America/Mexico_City' where id = :'centro_id';

select chk('access: and the owner''s change has been put back',
           (select timezone from location where id = :'centro_id') = 'America/Mexico_City');


-- ================================= 7. everything is exactly as it was ==
-- The restoration, asserted against the baseline captured before anything moved. A
-- half-restored database fails HERE rather than in the next file in the directory.

select chk('restored: every store carries the zone it started with',
           (select count(*) from location where timezone <> 'America/Mexico_City') = 0,
           (select string_agg(name || '=' || timezone, ', ' order by name) from location));

select chk('restored: product_margin_daily is identical to the baseline, both ways',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day, revenue_net, cogs_net, line_count
                 from product_margin_daily except select * from _base_m)
              union all
              (select * from _base_m except
               select workspace_id, location_id, variant_id, day, revenue_net, cogs_net, line_count
                 from product_margin_daily)) d) = 0);

select chk('restored: product_waste_daily is identical to the baseline, both ways',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day, waste_cost_net,
                      purchases_net, waste_movement_count, purchase_line_count
                 from product_waste_daily except select * from _base_w)
              union all
              (select * from _base_w except
               select workspace_id, location_id, variant_id, day, waste_cost_net,
                      purchases_net, waste_movement_count, purchase_line_count
                 from product_waste_daily)) d) = 0);

select chk('restored: no store was added or removed by the probe in section 3',
           (select count(*) from location where name = '__tz_probe__') = 0);

-- ⚠️ THE CHECK THAT COUNTS THE CHECKS. `_verify.n` is a serial and a sequence is
-- non-transactional, so a `chk()` recorded inside a block that later ROLLED BACK
-- burns its number and leaves a gap. Without this, such a section deletes its own
-- results and the file still reports "all N passed" with a quietly smaller N —
-- which is the same failure as a silently skipped CI step, one level down. This
-- file shipped with exactly that bug for one draft.
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
    raise exception '% location timezone check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % location timezone checks passed', (select count(*) from public._verify);
end;
$$;
