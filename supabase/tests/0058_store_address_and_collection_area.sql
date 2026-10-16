-- ============================================================================
-- 0058 — the store's address, and where Te lo compro reaches. Plan task `8j`.
--
-- ⚠️ EVERY WRITE IS DRIVEN UNDER `set role authenticated` WITH A MEMBER'S CLAIMS
-- — as the superuser it would pass vacuously. ⚠️ AN RLS UPDATE REFUSAL IS NOT AN
-- ERROR: it updates zero rows, so each refusal is read back as *the value did
-- not change*, never as a SQLSTATE.
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

\set owner '''0058aaaa-0000-4000-8000-000000000001'''
\set mgr   '''0058aaaa-0000-4000-8000-000000000002'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0058@example.mx',   jsonb_build_object('full_name', 'Dueña 0058')),
  (:mgr,   'gerente.0058@example.mx', jsonb_build_object('full_name', 'Gerente 0058'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Pollería 0058') as ws \gset
select set_config('request.jwt.claims', null, false);
select id as loc from public.location where workspace_id = :'ws' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
  values (:'ws', :mgr, 'manager', 'Gerente 0058');

-- ----------------------------------------------------------------------------
-- 1. The store's address
-- ----------------------------------------------------------------------------
select public.chk('1.1 the five address columns exist on the store, and a new store has none',
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'location' and is_nullable = 'YES'
      and column_name in ('street', 'street_number', 'colonia', 'city', 'postal_code')) = 5
  and (select postal_code is null and street is null from public.location where id = :'loc'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._try(format(
  'update public.location set street = %L, street_number = %L, city = %L, postal_code = %L where id = %L',
  'Sabino', '120', 'Ciudad de México', '06400', :'loc')) as by_owner \gset
select public._try(format('update public.location set postal_code = %L where id = %L', '6400', :'loc')) as short_cp \gset
select public._try(format('update public.location set postal_code = %L where id = %L', '06 40', :'loc')) as spaced_cp \gset
select public._try(format('update public.location set street = %L where id = %L', '   ', :'loc')) as blank_street \gset
reset role;

select public.chk('1.2 the owner writes the store''s address',
  :'by_owner' = 'ok' and (select postal_code = '06400' and street = 'Sabino'
                            from public.location where id = :'loc'), :'by_owner');
select public.chk('1.3 ⚠️ a postal code that is not five digits is refused — 23514',
  :'short_cp' = '23514' and :'spaced_cp' = '23514', :'short_cp' || ' ' || :'spaced_cp');
select public.chk('1.4 a blank street is refused — 23514', :'blank_street' = '23514', :'blank_street');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mgr), false);
set role authenticated;
select public._try(format('update public.location set postal_code = %L where id = %L', '06470', :'loc')) as by_mgr \gset
reset role;
select public.chk('1.5 ⚠️ a manager cannot move the store — zero rows, the code stands',
  (select postal_code from public.location where id = :'loc') = '06400', :'by_mgr');

-- ----------------------------------------------------------------------------
-- 2. Where Te lo compro reaches
-- ----------------------------------------------------------------------------
set role authenticated;
select collection_reaches('06400') as r1, collection_reaches('06470') as r2,
       collection_reaches('06500') as r3, collection_reaches('abcde') as r4,
       collection_reaches(null) as r5, collection_reaches(' 06470 ') as r6 \gset
select public._try('select count(*) from servicio.collection_area') as read_table \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('2.1 the owner''s two are reached: 06400 and 06470',
  :'r1'::boolean and :'r2'::boolean);
select public.chk('2.2 any other code is not, and nonsense or nothing is a plain no — never an error',
  not :'r3'::boolean and not :'r4'::boolean and not :'r5'::boolean);
select public.chk('2.3 a code with spaces around it is read as the code', :'r6'::boolean);
select public.chk('2.4 ⚠️ the list itself is closed to a signed-in person — 42501, the schema',
  :'read_table' = '42501', :'read_table');
select public.chk('2.5 ⚠️ and the door is closed to anyone not signed in',
  not has_function_privilege('anon', 'public.collection_reaches(text)', 'execute'));

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
