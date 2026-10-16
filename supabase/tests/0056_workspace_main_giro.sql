-- ============================================================================
-- 0056 — a shop's main giro: who may set it, and what it may be. Plan task
-- `8g`, the owner's ruling of 2026-10-16.
--
-- ⚠️ EVERY WRITE IS DRIVEN UNDER `set role authenticated` WITH A MEMBER'S CLAIMS
-- — as the superuser it would pass vacuously (RLS is bypassed). ⚠️ AND AN RLS
-- UPDATE REFUSAL IS NOT AN ERROR: it updates zero rows, so each refusal is read
-- back as *the value did not change*, never as a SQLSTATE.
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

-- ----------------------------------------------------------------------------
-- Fixtures: shop A with an owner, a manager and a cashier; shop B's owner
-- ----------------------------------------------------------------------------
\set owner   '''0056aaaa-0000-4000-8000-000000000001'''
\set mgr     '''0056aaaa-0000-4000-8000-000000000002'''
\set staff   '''0056aaaa-0000-4000-8000-000000000003'''
\set otro    '''0056aaaa-0000-4000-8000-000000000004'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0056@example.mx',   jsonb_build_object('full_name', 'Dueña 0056')),
  (:mgr,   'gerente.0056@example.mx', jsonb_build_object('full_name', 'Gerente 0056')),
  (:staff, 'cajera.0056@example.mx',  jsonb_build_object('full_name', 'Cajera 0056')),
  (:otro,  'otro.0056@example.mx',    jsonb_build_object('full_name', 'Otro 0056'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Pollería 0056') as ws \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
select onboard_workspace('Otra 0056') as ws_b \gset
select set_config('request.jwt.claims', null, false);

insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws', :mgr,   'manager', 'Gerente 0056'),
  (:'ws', :staff, 'staff',   'Cajera 0056');

select code as categoria from catalogo.tag where kind = 'categoria' order by code limit 1 \gset

-- ----------------------------------------------------------------------------
-- 1. The column
-- ----------------------------------------------------------------------------
select public.chk('1.1 workspace.giro_principal exists and may be empty',
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'workspace'
             and column_name = 'giro_principal' and is_nullable = 'YES'));
select public.chk('1.2 a new shop has not chosen one',
  (select giro_principal from public.workspace where id = :'ws') is null);

-- ----------------------------------------------------------------------------
-- 2. Who may set it — the owner, as with the shop's name
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._try(format('update public.workspace set giro_principal = %L where id = %L',
  'giro-polleria', :'ws')) as by_owner \gset
reset role;
select public.chk('2.1 the owner sets it',
  :'by_owner' = 'ok' and (select giro_principal from public.workspace where id = :'ws') = 'giro-polleria',
  :'by_owner');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mgr), false);
set role authenticated;
select public._try(format('update public.workspace set giro_principal = %L where id = %L',
  'giro-abarrotes', :'ws')) as by_mgr \gset
reset role;
select public.chk('2.2 ⚠️ a manager cannot change it — zero rows, the value stands',
  (select giro_principal from public.workspace where id = :'ws') = 'giro-polleria', :'by_mgr');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), false);
set role authenticated;
select public._try(format('update public.workspace set giro_principal = %L where id = %L',
  'giro-abarrotes', :'ws')) as by_staff \gset
reset role;
select public.chk('2.3 ⚠️ nor can a cashier',
  (select giro_principal from public.workspace where id = :'ws') = 'giro-polleria', :'by_staff');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
set role authenticated;
select public._try(format('update public.workspace set giro_principal = %L where id = %L',
  'giro-cremeria', :'ws')) as by_other \gset
reset role;
select public.chk('2.4 ⚠️ nor the owner of another shop',
  (select giro_principal from public.workspace where id = :'ws') = 'giro-polleria', :'by_other');

-- ----------------------------------------------------------------------------
-- 3. What it may be — a giro of the template, or nothing
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._try(format('update public.workspace set giro_principal = %L where id = %L',
  :'categoria', :'ws')) as as_category \gset
select public._try(format('update public.workspace set giro_principal = %L where id = %L',
  'giro-pescaderia', :'ws')) as as_unknown \gset
reset role;
select public.chk('3.1 a category is refused — 23514, the check',
  :'as_category' = '23514', :'as_category');
select public.chk('3.2 a giro the template does not have is refused — 23503, the key',
  :'as_unknown' = '23503', :'as_unknown');

set role authenticated;
select public._try(format('update public.workspace set giro_principal = null where id = %L', :'ws')) as to_null \gset
reset role;
select public.chk('3.3 the owner can clear it again',
  :'to_null' = 'ok' and (select giro_principal from public.workspace where id = :'ws') is null, :'to_null');

select public.chk('3.4 and every giro the template defines is accepted by the check',
  not exists (select 1 from catalogo.tag where kind = 'giro' and code not like 'giro-%'));
select set_config('request.jwt.claims', null, false);

-- ----------------------------------------------------------------------------
-- The report
-- ----------------------------------------------------------------------------
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 10 then
    raise exception 'expected 10 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
