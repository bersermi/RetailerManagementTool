-- ============================================================================
-- 0074 — a price set or changed without signal (`8i`): `set_shelf_price`, every
-- call made AS THE CALLER under `set role authenticated` with her claims. As
-- `postgres` the row policies would wave everything through and the fence
-- below would pass for nothing.
--
-- The days are fixed dates, not today: the function takes the phone's own day
-- and never reads the clock, so a story told in October reads the same on any
-- day CI runs it. One transaction that rolls back.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

begin;

create table public._verify (n serial, label text, passed boolean, detail text);

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

create or replace function public._try(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._try(text) to authenticated, anon;

-- One product's rows in one scope, oldest first: `from→to price`.
create function public._rows74(p_variant uuid, p_loc uuid default null)
returns text language sql as $$
  select coalesce(string_agg(format('%s→%s %s', pl.effective_from,
                                    coalesce(pl.effective_to::text, '∞'),
                                    pl.price_per_base::numeric(14,2)),
                             ' | ' order by pl.effective_from), 'none')
    from public.price_list pl
   where pl.variant_id = p_variant and pl.location_id is not distinct from p_loc
$$;

-- The one price in force on a day, as the catalog's window reads it.
create function public._on74(p_variant uuid, p_day date, p_loc uuid default null)
returns text language sql as $$
  select coalesce(string_agg(pl.price_per_base::numeric(14,2)::text, ','), 'none')
    from public.price_list pl
   where pl.variant_id = p_variant and pl.location_id is not distinct from p_loc
     and pl.effective_from <= p_day and (pl.effective_to is null or pl.effective_to > p_day)
$$;

-- ---------------------------------------------------------------- fixture ----
\set duena     '''0074aaaa-0000-4000-8000-000000000001'''
\set encargada '''0074aaaa-0000-4000-8000-000000000002'''
\set cajera    '''0074aaaa-0000-4000-8000-000000000003'''
\set otra      '''0074aaaa-0000-4000-8000-000000000004'''
\set jwt_duena     '''{"sub":"0074aaaa-0000-4000-8000-000000000001","role":"authenticated"}'''
\set jwt_encargada '''{"sub":"0074aaaa-0000-4000-8000-000000000002","role":"authenticated"}'''
\set jwt_cajera    '''{"sub":"0074aaaa-0000-4000-8000-000000000003","role":"authenticated"}'''
\set jwt_otra      '''{"sub":"0074aaaa-0000-4000-8000-000000000004","role":"authenticated"}'''

-- the phone's ids for the price rows
\set p1  '''0074bbbb-0000-4000-8000-000000000001'''
\set p2  '''0074bbbb-0000-4000-8000-000000000002'''
\set p3  '''0074bbbb-0000-4000-8000-000000000003'''
\set p4  '''0074bbbb-0000-4000-8000-000000000004'''
\set p5  '''0074bbbb-0000-4000-8000-000000000005'''
\set p6  '''0074bbbb-0000-4000-8000-000000000006'''
\set p7  '''0074bbbb-0000-4000-8000-000000000007'''
\set p8  '''0074bbbb-0000-4000-8000-000000000008'''
\set p9  '''0074bbbb-0000-4000-8000-000000000009'''
\set p10 '''0074bbbb-0000-4000-8000-000000000010'''
\set p11 '''0074bbbb-0000-4000-8000-000000000011'''
\set p12 '''0074bbbb-0000-4000-8000-000000000012'''
\set p13 '''0074bbbb-0000-4000-8000-000000000013'''
\set p14 '''0074bbbb-0000-4000-8000-000000000014'''
\set p15 '''0074bbbb-0000-4000-8000-000000000015'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:duena,     'duena.0074@example.mx',     jsonb_build_object('full_name', 'Dueña 0074')),
  (:encargada, 'encargada.0074@example.mx', jsonb_build_object('full_name', 'Encargada 0074')),
  (:cajera,    'cajera.0074@example.mx',    jsonb_build_object('full_name', 'Cajera 0074')),
  (:otra,      'otra.0074@example.mx',      jsonb_build_object('full_name', 'Otra Dueña 0074'));

select set_config('request.jwt.claims', :jwt_duena, true);
select onboard_workspace('Abarrotes 0074') as ws \gset
select set_config('request.jwt.claims', :jwt_otra, true);
select onboard_workspace('Otra tienda 0074') as ws_b \gset
select set_config('request.jwt.claims', null, true);

select id as loc from public.location where workspace_id = :'ws' \gset
select id as loc_b from public.location where workspace_id = :'ws_b' \gset

insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws', :encargada, 'manager', 'Encargada 0074'),
  (:'ws', :cajera,    'staff',   'Cajera 0074');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', wm.id, :'loc' from public.workspace_member wm
   where wm.workspace_id = :'ws' and wm.user_id in (:encargada, :cajera);

insert into public.product_family (workspace_id, name) values (:'ws', 'Abarrotes 0074');
select id as fam from public.product_family where workspace_id = :'ws' \gset
insert into public.product_family (workspace_id, name) values (:'ws_b', 'Abarrotes B 0074');
select id as fam_b from public.product_family where workspace_id = :'ws_b' \gset

-- One product per story, so each story reads its own rows.
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws', :'fam', 'Refresco 0074', 'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Leche 0074',    'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Pan 0074',      'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Jabon 0074',    'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Arroz 0074',    'pza','pza','pza','pza', 0.0000);
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_b', :'fam_b', 'Ajena 0074', 'pza','pza','pza','pza', 0.0000);

select id as refresco from public.product_variant where name = 'Refresco 0074' \gset
select id as leche    from public.product_variant where name = 'Leche 0074' \gset
select id as pan      from public.product_variant where name = 'Pan 0074' \gset
select id as jabon    from public.product_variant where name = 'Jabon 0074' \gset
select id as arroz    from public.product_variant where name = 'Arroz 0074' \gset
select id as ajena    from public.product_variant where name = 'Ajena 0074' \gset

-- ---- 1. a first price, its retry, and a change ------------------------------
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public.set_shelf_price(:p1, :'refresco', 17, '2026-10-05', null, null) as r1 \gset
select public.set_shelf_price(:p1, :'refresco', 17, '2026-10-05', null, null) as r1_again \gset
reset role;
select public._rows74(:'refresco') as after1 \gset

select public.chk('1.1 a first price, seen as none, is applied from her day under the phone''s id',
  :'r1'::jsonb = '{"applied": true, "already_recorded": false}'::jsonb
  and :'after1' = '2026-10-05→∞ 17.00'
  and exists (select 1 from public.price_list where id = :p1 and workspace_id = :'ws'),
  :'r1' || ' / ' || :'after1');
select public.chk('1.2 the same id again is already recorded, and writes nothing',
  :'r1_again'::jsonb = '{"applied": true, "already_recorded": true}'::jsonb
  and public._rows74(:'refresco') = :'after1',
  :'r1_again' || ' / ' || public._rows74(:'refresco'));

select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public.set_shelf_price(:p2, :'refresco', 20, '2026-10-08', null, 17) as r2 \gset
reset role;
select public.chk('1.3 a change seen against the price in force closes it at her day and opens hers',
  :'r2'::jsonb = '{"applied": true, "already_recorded": false}'::jsonb
  and public._rows74(:'refresco') = '2026-10-05→2026-10-08 17.00 | 2026-10-08→∞ 20.00',
  public._rows74(:'refresco'));
select public.chk('1.4 the window finds exactly one price on each day, the old before and the new from her day',
  public._on74(:'refresco', '2026-10-07') = '17.00'
  and public._on74(:'refresco', '2026-10-08') = '20.00'
  and public._on74(:'refresco', '2026-12-31') = '20.00',
  public._on74(:'refresco', '2026-10-07') || ' / ' || public._on74(:'refresco', '2026-10-08'));

-- ---- 2. the same day, twice -------------------------------------------------
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public.set_shelf_price(:p3, :'refresco', 22, '2026-10-08', null, 20) as r3 \gset
reset role;
select public.chk('2.1 ⚠️ a second change the same day replaces that day''s row — a range cannot end where it starts',
  :'r3'::jsonb = '{"applied": true, "already_recorded": false}'::jsonb
  and public._rows74(:'refresco') = '2026-10-05→2026-10-08 17.00 | 2026-10-08→∞ 22.00'
  and not exists (select 1 from public.price_list where id = :p2)
  and exists (select 1 from public.price_list where id = :p3),
  public._rows74(:'refresco'));

-- ---- 3. superseded: what she saw was not the price, or it changed after her day
select public._rows74(:'refresco') as before3 \gset
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
-- a stale phone: still showing $20 on the 8th, when the 8th's price is $22
select public.set_shelf_price(:p4, :'refresco', 25, '2026-10-08', null, 20) as r4 \gset
-- a change typed on the 6th, seen against the 6th's $17 — but it changed on the 8th
select public.set_shelf_price(:p5, :'refresco', 18, '2026-10-06', null, 17) as r5 \gset
-- seen as none while a price is in force
select public.set_shelf_price(:p6, :'refresco', 19, '2026-10-09', null, null) as r6 \gset
reset role;

select public.chk('3.1 ⚠️ a change seen against a price no longer in force is superseded, and writes nothing',
  :'r4'::jsonb = '{"applied": false, "already_recorded": false}'::jsonb
  and public._rows74(:'refresco') = :'before3'
  and not exists (select 1 from public.price_list where id = :p4),
  :'r4' || ' / ' || public._rows74(:'refresco'));
select public.chk('3.2 ⚠️ a change from a day before somebody else''s newer one is superseded, though it saw that day''s price',
  :'r5'::jsonb = '{"applied": false, "already_recorded": false}'::jsonb
  and public._rows74(:'refresco') = :'before3',
  :'r5' || ' / ' || public._rows74(:'refresco'));
select public.chk('3.3 a first price on a product another phone already priced is superseded',
  :'r6'::jsonb = '{"applied": false, "already_recorded": false}'::jsonb
  and public._rows74(:'refresco') = :'before3',
  :'r6' || ' / ' || public._rows74(:'refresco'));

select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public.set_shelf_price(:p7, :'arroz', 30, '2026-10-05', null, 28) as r7 \gset
reset role;
select public.chk('3.4 a change seen against a price the shop never had is superseded',
  :'r7'::jsonb = '{"applied": false, "already_recorded": false}'::jsonb
  and public._rows74(:'arroz') = 'none',
  :'r7' || ' / ' || public._rows74(:'arroz'));

-- ---- 4. two phones, one first price each, the same day -------------------------
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public.set_shelf_price(:p8, :'jabon', 12, '2026-10-10', null, null) as r8 \gset
reset role;
select set_config('request.jwt.claims', :jwt_encargada, true);
set local role authenticated;
select public.set_shelf_price(:p9, :'jabon', 13, '2026-10-10', null, null) as r9 \gset
reset role;
select public.chk('4.1 the manager may set a price too — the second phone''s first price meets the first''s and is superseded',
  :'r8'::jsonb = '{"applied": true, "already_recorded": false}'::jsonb
  and :'r9'::jsonb = '{"applied": false, "already_recorded": false}'::jsonb
  and public._rows74(:'jabon') = '2026-10-10→∞ 12.00',
  :'r8' || ' / ' || :'r9' || ' / ' || public._rows74(:'jabon'));

select set_config('request.jwt.claims', :jwt_encargada, true);
set local role authenticated;
select public.set_shelf_price(:p10, :'jabon', 14, '2026-10-11', null, 12) as r10 \gset
reset role;
select public.chk('4.2 a manager''s change is applied like the owner''s',
  :'r10'::jsonb = '{"applied": true, "already_recorded": false}'::jsonb
  and public._rows74(:'jabon') = '2026-10-10→2026-10-11 12.00 | 2026-10-11→∞ 14.00',
  public._rows74(:'jabon'));

-- ---- 5. a chain: two changes waiting on one phone, sent in order --------------
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public.set_shelf_price(:p11, :'arroz', 28, '2026-10-01', null, null) as r11 \gset
select public.set_shelf_price(:p12, :'arroz', 30, '2026-10-04', null, 28) as r12 \gset
select public.set_shelf_price(:p13, :'arroz', 32, '2026-10-06', null, 30) as r13 \gset
reset role;
select public.chk('5.1 changes queued on two days, each seen against the one before it, land in order',
  :'r11'::jsonb ->> 'applied' = 'true' and :'r12'::jsonb ->> 'applied' = 'true'
  and :'r13'::jsonb ->> 'applied' = 'true'
  and public._rows74(:'arroz') = '2026-10-01→2026-10-04 28.00 | 2026-10-04→2026-10-06 30.00 | 2026-10-06→∞ 32.00',
  public._rows74(:'arroz'));

-- ---- 6. healing what an older build half-did -------------------------------------
-- The close landed and the open did not: the price ended on the 20th, nothing after.
insert into public.price_list (workspace_id, variant_id, location_id, price_per_base, effective_from, effective_to)
values (:'ws', :'pan', null, 4, '2026-10-01', '2026-10-20');
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
-- typed on the 20th, when the phone (and the window) showed no price
select public.set_shelf_price(:p14, :'pan', 5, '2026-10-20', null, null) as r14 \gset
reset role;
select public.chk('6.1 a product left with no price by a half-done change takes a first price from her day',
  :'r14'::jsonb ->> 'applied' = 'true'
  and public._rows74(:'pan') = '2026-10-01→2026-10-20 4.00 | 2026-10-20→∞ 5.00',
  public._rows74(:'pan'));

delete from public.price_list where variant_id = :'pan';
insert into public.price_list (workspace_id, variant_id, location_id, price_per_base, effective_from, effective_to)
values (:'ws', :'pan', null, 4, '2026-10-01', '2026-10-20');
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
-- typed on the 18th, offline, when the phone still showed $4
select public.set_shelf_price(:p15, :'pan', 6, '2026-10-18', null, 4) as r15 \gset
reset role;
select public.chk('6.2 a change typed before the half-done one ends that row at her day, and leaves no gap',
  :'r15'::jsonb ->> 'applied' = 'true'
  and public._rows74(:'pan') = '2026-10-01→2026-10-18 4.00 | 2026-10-18→∞ 6.00'
  and public._on74(:'pan', '2026-10-25') = '6.00',
  public._rows74(:'pan'));

-- ---- 7. a store's own price ---------------------------------------------------
insert into public.price_list (workspace_id, variant_id, location_id, price_per_base, effective_from)
values (:'ws', :'leche', null, 25, '2026-10-01'),
       (:'ws', :'leche', :'loc', 27, '2026-10-01');
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public.set_shelf_price('0074cccc-0000-4000-8000-000000000001', :'leche', 29, '2026-10-12', :'loc', 27) as r16 \gset
select public._try(format('select public.set_shelf_price(%L, %L, 29, %L, %L, 25)',
  '0074cccc-0000-4000-8000-000000000002', :'leche', '2026-10-12', :'loc_b')) as e_store \gset
reset role;
select public.chk('7.1 a store''s own price changes alone; the shop-wide one is untouched',
  :'r16'::jsonb ->> 'applied' = 'true'
  and public._rows74(:'leche', :'loc') = '2026-10-01→2026-10-12 27.00 | 2026-10-12→∞ 29.00'
  and public._rows74(:'leche') = '2026-10-01→∞ 25.00',
  public._rows74(:'leche', :'loc') || ' / ' || public._rows74(:'leche'));
select public.chk('7.2 another shop''s store is refused 22023, and nothing is written',
  :'e_store' = '22023'
  and not exists (select 1 from public.price_list where id = '0074cccc-0000-4000-8000-000000000002'),
  :'e_store');

-- ---- 8. the price is already what she typed -------------------------------------
select public._rows74(:'leche') as before8 \gset
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public.set_shelf_price('0074cccc-0000-4000-8000-000000000003', :'leche', 25, '2026-10-13', null, 25) as r17 \gset
reset role;
select public.chk('8.1 a price already in force answers applied and writes no row — no change in the history',
  :'r17'::jsonb = '{"applied": true, "already_recorded": false}'::jsonb
  and public._rows74(:'leche') = :'before8'
  and not exists (select 1 from public.price_list where id = '0074cccc-0000-4000-8000-000000000003'),
  :'r17' || ' / ' || public._rows74(:'leche'));

-- ---- 9. the fence ---------------------------------------------------------------
select public._rows74(:'jabon') as before9 \gset
select set_config('request.jwt.claims', :jwt_cajera, true);
set local role authenticated;
select public._try(format('select public.set_shelf_price(%L, %L, 15, %L, null, 14)',
  '0074cccc-0000-4000-8000-000000000004', :'jabon', '2026-10-14')) as e_cajera \gset
reset role;
select public.chk('9.1 ⚠️ a cashier is refused 42501, and the price stands',
  :'e_cajera' = '42501' and public._rows74(:'jabon') = :'before9', :'e_cajera');

select set_config('request.jwt.claims', :jwt_otra, true);
set local role authenticated;
select public._try(format('select public.set_shelf_price(%L, %L, 15, %L, null, 14)',
  '0074cccc-0000-4000-8000-000000000005', :'jabon', '2026-10-14')) as e_otra \gset
select public._try(format('select public.set_shelf_price(%L, %L, 15, %L, null, null)',
  '0074cccc-0000-4000-8000-000000000006', :'ajena', '2026-10-14')) as ok_otra \gset
reset role;
select public.chk('9.2 another shop''s owner is refused 42501 on this shop''s product, and prices her own',
  :'e_otra' = '42501' and :'ok_otra' = 'ok'
  and public._rows74(:'jabon') = :'before9'
  and public._rows74(:'ajena') = '2026-10-14→∞ 15.00',
  :'e_otra' || ' / ' || :'ok_otra');

select set_config('request.jwt.claims', null, true);
set local role anon;
select public._try(format('select public.set_shelf_price(%L, %L, 15, %L, null, 14)',
  '0074cccc-0000-4000-8000-000000000007', :'jabon', '2026-10-14')) as e_anon \gset
reset role;
select public.chk('9.3 signed out, the function cannot even be called — 42501',
  :'e_anon' = '42501' and public._rows74(:'jabon') = :'before9', :'e_anon');

-- ---- 10. malformed --------------------------------------------------------------
select set_config('request.jwt.claims', :jwt_duena, true);
set local role authenticated;
select public._try(format('select public.set_shelf_price(%L, %L, -1, %L, null, 14)',
  '0074cccc-0000-4000-8000-000000000008', :'jabon', '2026-10-14')) as e_neg \gset
select public._try(format('select public.set_shelf_price(%L, %L, 15, null, null, 14)',
  '0074cccc-0000-4000-8000-000000000009', :'jabon')) as e_day \gset
select public._try(format('select public.set_shelf_price(null, %L, 15, %L, null, 14)',
  :'jabon', '2026-10-14')) as e_id \gset
reset role;
select public.chk('10.1 a negative price, no day or no id is refused 22023, and nothing is written',
  :'e_neg' = '22023' and :'e_day' = '22023' and :'e_id' = '22023'
  and public._rows74(:'jabon') = :'before9',
  :'e_neg' || ' / ' || :'e_day' || ' / ' || :'e_id');

-- ---- 11. the grants -------------------------------------------------------------
select public.chk('11.1 a signed-in person may call it and nobody signed out',
  has_function_privilege('authenticated', 'public.set_shelf_price(uuid, uuid, numeric, date, uuid, numeric)', 'execute')
  and not has_function_privilege('anon', 'public.set_shelf_price(uuid, uuid, numeric, date, uuid, numeric)', 'execute'));
select public.chk('11.2 it runs as its caller, so price_list''s own policies are its fence',
  (select not prosecdef from pg_proc where oid = 'public.set_shelf_price(uuid, uuid, numeric, date, uuid, numeric)'::regprocedure));

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 23 then
    raise exception 'expected 23 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
