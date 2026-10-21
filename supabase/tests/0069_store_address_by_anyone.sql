-- ============================================================================
-- 0069 — a store's address, given by whoever needs it first (`8q`).
--
-- The owner's ruling of 2026-10-21: no one logs merma until the store has an
-- address, and anyone may give it, in Merma or Ajustes. So anyone the store is
-- visible to may FILL an incomplete address through `set_store_address`, and
-- only the owner changes a complete one. Every call below runs under
-- `set role authenticated` with a caller's claims: as `postgres` RLS and
-- `my_locations()` would wave everything through and every check would pass
-- for nothing.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

create or replace function public._try(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._try(text) to authenticated;

\set owner   '''0069aaaa-0000-4000-8000-000000000001'''
\set mgr     '''0069aaaa-0000-4000-8000-000000000002'''
\set staff   '''0069aaaa-0000-4000-8000-000000000003'''
\set otro    '''0069aaaa-0000-4000-8000-000000000004'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0069@example.mx',   jsonb_build_object('full_name', 'Dueña 0069')),
  (:mgr,   'gerente.0069@example.mx', jsonb_build_object('full_name', 'Gerente 0069')),
  (:staff, 'cajera.0069@example.mx',  jsonb_build_object('full_name', 'Cajera 0069')),
  (:otro,  'otro.0069@example.mx',    jsonb_build_object('full_name', 'Otro 0069'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Abarrotes 0069') as ws \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
select onboard_workspace('Otra 0069') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc from public.location where workspace_id = :'ws' \gset

insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws', :mgr,   'manager', 'Gerente 0069'),
  (:'ws', :staff, 'staff',   'Cajera 0069');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', id, :'loc' from public.workspace_member where workspace_id = :'ws' and user_id = :staff;

-- ---- 1. the door ------------------------------------------------------------
select public.chk('1.1 a new store has no address',
  (select street is null and postal_code is null from public.location where id = :'loc'));
select public.chk('1.2 any signed-in caller may call it, nobody anonymous',
  has_function_privilege('authenticated', 'public.set_store_address(uuid,text,text,text,text,text)', 'execute')
  and not has_function_privilege('anon', 'public.set_store_address(uuid,text,text,text,text,text)', 'execute'));

-- ---- 2. a cashier fills the empty address -------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), false);
set role authenticated;
select public._try(format('select public.set_store_address(%L, %L, %L, %L, %L, %L)',
  :'loc', 'Reforma', '22', '', 'Cuauhtémoc', '06400')) as staff_fills \gset
reset role;
select public.chk('2.1 a cashier fills an empty address',
  :'staff_fills' = 'ok'
  and (select street = 'Reforma' and street_number = '22' and city = 'Cuauhtémoc' and postal_code = '06400'
         from public.location where id = :'loc'), :'staff_fills');
select public.chk('2.2 an empty colonia is stored as none, not as a blank',
  (select colonia is null from public.location where id = :'loc'));

-- ---- 3. a complete address is the owner's to change ----------------------------
set role authenticated;
select public._try(format('select public.set_store_address(%L, %L, %L, %L, %L, %L)',
  :'loc', 'Madero', '1', '', 'Cuauhtémoc', '06000')) as staff_changes \gset
reset role;
select public.chk('3.1 ⚠️ the cashier cannot change it once complete — TD012, the address stands',
  :'staff_changes' = 'TD012'
  and (select street from public.location where id = :'loc') = 'Reforma', :'staff_changes');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mgr), false);
set role authenticated;
select public._try(format('select public.set_store_address(%L, %L, %L, %L, %L, %L)',
  :'loc', 'Madero', '1', '', 'Cuauhtémoc', '06000')) as mgr_changes \gset
reset role;
select public.chk('3.2 ⚠️ nor can an Encargado',
  :'mgr_changes' = 'TD012' and (select street from public.location where id = :'loc') = 'Reforma',
  :'mgr_changes');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._try(format('select public.set_store_address(%L, %L, %L, %L, %L, %L)',
  :'loc', 'Madero', '1', 'Centro', 'Cuauhtémoc', '06000')) as owner_changes \gset
reset role;
select public.chk('3.3 the owner changes it',
  :'owner_changes' = 'ok'
  and (select street = 'Madero' and colonia = 'Centro' and postal_code = '06000'
         from public.location where id = :'loc'), :'owner_changes');

-- ---- 4. nobody else, and nothing half-given ------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
set role authenticated;
select public._try(format('select public.set_store_address(%L, %L, %L, %L, %L, %L)',
  :'loc', 'Ajena', '9', '', 'Otra', '01000')) as stranger \gset
reset role;
select public.chk('4.1 ⚠️ the owner of another shop is refused — TD012, the address stands',
  :'stranger' = 'TD012' and (select street from public.location where id = :'loc') = 'Madero', :'stranger');

update public.location set street = null, street_number = null, colonia = null, city = null, postal_code = null
 where id = :'loc';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), false);
set role authenticated;
select public._try(format('select public.set_store_address(%L, %L, %L, %L, %L, %L)',
  :'loc', 'Reforma', '22', '', 'Cuauhtémoc', '  ')) as no_cp \gset
select public._try(format('select public.set_store_address(%L, %L, %L, %L, %L, %L)',
  :'loc', 'Reforma', '22', '', 'Cuauhtémoc', '6400')) as bad_cp \gset
reset role;
select public.chk('4.2 a missing código postal is refused — 22023, nothing written',
  :'no_cp' = '22023' and (select street from public.location where id = :'loc') is null, :'no_cp');
select public.chk('4.3 a código postal that is not five digits is refused — 23514, the table''s check',
  :'bad_cp' = '23514' and (select street from public.location where id = :'loc') is null, :'bad_cp');

set role authenticated;
select public._try(format('update public.location set street = %L where id = %L', 'Directa', :'loc')) as direct \gset
reset role;
select public.chk('4.4 ⚠️ the table itself is still the owner''s: a cashier''s direct update changes nothing',
  (select street from public.location where id = :'loc') is null, :'direct');
select set_config('request.jwt.claims', null, false);

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 11 then
    raise exception 'expected 11 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
