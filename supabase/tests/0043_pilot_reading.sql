-- ============================================================================
-- 0043 — pilot_reading and record_pilot_readings(), driven as the people who
-- will actually call it. Plan task 5P-a.
--
-- ⚠️ EVERY READ AND WRITE BELOW IS UNDER `set local role authenticated`. RLS is
-- bypassed by the postgres superuser, so a fence checked as superuser passes
-- vacuously — and the fence here IS the ruling: the OWNER reads, a manager and
-- a cashier do not, and nobody in another shop does.
--
-- Section 1 is the SHAPE. Section 2 is who may WRITE and what is stamped.
-- Section 3 is who may READ. Section 4 is the refusals.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

-- Runs a statement and answers the SQLSTATE it raised, or 'ok'. Security
-- invoker, so it raises as whoever called it.
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

-- Records the SQLSTATE that arrived beside the one expected, so a FAIL says
-- what it saw rather than only that it was not the right thing.
create function public._state_is(p_label text, p_sql text, p_want text)
returns void language plpgsql as $$
declare v_got text := public._try(p_sql);
begin
  perform public.chk(p_label, v_got = p_want, format('want %s, got %s', p_want, v_got));
end;
$$;
grant execute on function public._state_is(text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 1. The shape
-- ----------------------------------------------------------------------------

select public.chk('1.1 public.pilot_reading is a table with RLS enabled',
  (select relrowsecurity from pg_class where oid = 'public.pilot_reading'::regclass));

select public.chk('1.2 exactly one policy on it, and it is a SELECT',
  (select array_agg(cmd::text) from pg_policies
    where schemaname = 'public' and tablename = 'pilot_reading') = array['SELECT'],
  coalesce((select string_agg(policyname || ':' || cmd, ', ') from pg_policies
    where schemaname = 'public' and tablename = 'pilot_reading'), '(none)'));

select public.chk('1.3 the policy floors on OWNER — ruling 45, not manager',
  (select qual::text from pg_policies
    where schemaname = 'public' and tablename = 'pilot_reading'
      and policyname = 'pilot_reading_select') ~* 'has_role.*''owner''',
  (select qual::text from pg_policies
    where schemaname = 'public' and tablename = 'pilot_reading'
      and policyname = 'pilot_reading_select'));

select public.chk('1.4 authenticated holds SELECT and nothing else; anon holds nothing',
  (select coalesce(array_agg(grantee::text || ':' || privilege_type order by grantee, privilege_type), '{}')
     from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'pilot_reading'
      and grantee in ('anon', 'authenticated')) = array['authenticated:SELECT'],
  (select coalesce(string_agg(grantee || ':' || privilege_type, ', '), '(none)')
     from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'pilot_reading'
      and grantee in ('anon', 'authenticated')));

select public.chk('1.5 record_pilot_readings is security definer with an empty search_path',
  (select p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.record_pilot_readings(uuid, jsonb)'::regprocedure));

select public.chk('1.6 authenticated may execute it and anon may not',
  has_function_privilege('authenticated', 'public.record_pilot_readings(uuid, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.record_pilot_readings(uuid, jsonb)', 'execute'));

select public.chk('1.7 it takes no member argument — decision 1, the member is stamped',
  (select pg_get_function_identity_arguments('public.record_pilot_readings(uuid, jsonb)'::regprocedure))
    = 'p_workspace_id uuid, p_readings jsonb');

select public.chk('1.8 exactly 42 policies in public — 0043 adds one',
  (select count(*) from pg_policies where schemaname = 'public') = 42,
  format('found %s', (select count(*) from pg_policies where schemaname = 'public')));

-- ----------------------------------------------------------------------------
-- Fixtures: shop A with an owner, a manager and a cashier; shop B with an owner.
-- ----------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('0c0c0c0c-0000-4000-8000-000000000001', 'owner.a.0043@example.mx'),
  ('0c0c0c0c-0000-4000-8000-000000000002', 'manager.a.0043@example.mx'),
  ('0c0c0c0c-0000-4000-8000-000000000003', 'cashier.a.0043@example.mx'),
  ('0c0c0c0c-0000-4000-8000-000000000004', 'owner.b.0043@example.mx');

select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', false);
select onboard_workspace('Tienda 0043 A') as ws_a \gset
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000004","role":"authenticated"}', false);
select onboard_workspace('Tienda 0043 B') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc_a from location where workspace_id = :'ws_a' \gset
select id as loc_b from location where workspace_id = :'ws_b' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', '0c0c0c0c-0000-4000-8000-000000000002', 'manager'),
  (:'ws_a', '0c0c0c0c-0000-4000-8000-000000000003', 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a' from workspace_member wm
 where wm.user_id = '0c0c0c0c-0000-4000-8000-000000000003';

select id as m_owner_a from workspace_member
 where user_id = '0c0c0c0c-0000-4000-8000-000000000001' \gset
select id as m_cashier_a from workspace_member
 where user_id = '0c0c0c0c-0000-4000-8000-000000000003' \gset

\set dev '''d0d0d0d0-0000-4000-8000-000000000001'''

-- ----------------------------------------------------------------------------
-- 2. Writing — the cashier files three readings; the owner files one
-- ----------------------------------------------------------------------------

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select record_pilot_readings(:'ws_a'::uuid, jsonb_build_array(
  jsonb_build_object('id', 'a0430000-0000-4000-8000-000000000001', 'location_id', :'loc_a',
    'device_id', :dev, 'kind', 'commit_ms', 'screen', 'vender', 'value', 42,
    'occurred_at', '2026-09-28T17:00:00Z', 'build', '5P-a test'),
  jsonb_build_object('id', 'a0430000-0000-4000-8000-000000000002', 'location_id', :'loc_a',
    'device_id', :dev, 'kind', 'taps', 'screen', 'vender', 'value', 4,
    'occurred_at', '2026-09-28T17:00:01Z', 'build', '5P-a test'),
  jsonb_build_object('id', 'a0430000-0000-4000-8000-000000000003',
    'device_id', :dev, 'kind', 'open_ms', 'screen', 'vender', 'value', 1840,
    'occurred_at', '2026-09-28T16:59:00Z', 'build', '5P-a test'))) as landed \gset

select public.chk('2.1 a cashier files three readings and three land',
  :landed = 3, format('returned %s', :landed));

select record_pilot_readings(:'ws_a'::uuid, jsonb_build_array(
  jsonb_build_object('id', 'a0430000-0000-4000-8000-000000000001', 'location_id', :'loc_a',
    'device_id', :dev, 'kind', 'commit_ms', 'screen', 'vender', 'value', 42,
    'occurred_at', '2026-09-28T17:00:00Z', 'build', '5P-a test'))) as again \gset

select public.chk('2.2 the same reading sent again lands NOTHING — decision 2, a lost reply re-sent',
  :again = 0, format('returned %s', :again));

select public.chk('2.3 and she reads none of it back, not even her own — ruling 45',
  (select count(*) from public.pilot_reading) = 0,
  format('read %s', (select count(*) from public.pilot_reading)));
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select record_pilot_readings(:'ws_a'::uuid, jsonb_build_array(
  jsonb_build_object('id', 'a0430000-0000-4000-8000-000000000004', 'location_id', :'loc_a',
    'device_id', :dev, 'kind', 'abandoned', 'screen', 'comprar', 'value', 0,
    'occurred_at', '2026-09-28T18:00:00Z', 'build', '5P-a test'))) as r \gset
commit;

-- ----------------------------------------------------------------------------
-- 3. Reading
-- ----------------------------------------------------------------------------

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select public.chk('3.1 the owner reads all four',
  (select count(*) from public.pilot_reading) = 4,
  format('read %s', (select count(*) from public.pilot_reading)));

select public.chk('3.2 the cashier''s three carry HER member id — ruling 44, stamped not sent',
  (select count(*) from public.pilot_reading where member_id = :'m_cashier_a') = 3);

select public.chk('3.3 the owner''s one carries his',
  (select count(*) from public.pilot_reading where member_id = :'m_owner_a') = 1);

select public.chk('3.4 a cold open carries no location, and that is legal',
  (select location_id is null from public.pilot_reading where kind = 'open_ms'));
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.chk('3.5 a MANAGER reads none — ruling 45 is owner and not manager-and-above',
  (select count(*) from public.pilot_reading) = 0,
  format('read %s', (select count(*) from public.pilot_reading)));
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select public.chk('3.6 another shop''s owner reads none',
  (select count(*) from public.pilot_reading) = 0,
  format('read %s', (select count(*) from public.pilot_reading)));
commit;

-- ----------------------------------------------------------------------------
-- 4. Refusals
-- ----------------------------------------------------------------------------

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select public._state_is('4.1 an outsider filing into shop A is refused 42501',
  format($q$select public.record_pilot_readings(%L::uuid, '[]'::jsonb)$q$, :'ws_a'), '42501');
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select public._state_is('4.2 a reading naming another shop''s store is refused 22023',
  format($q$select public.record_pilot_readings(%L::uuid, jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'location_id', %L, 'device_id', gen_random_uuid(),
      'kind', 'taps', 'screen', 'vender', 'value', 1,
      'occurred_at', now(), 'build', 'x')))$q$, :'ws_a', :'loc_b'), '22023');

select public._state_is('4.3 an unknown kind is refused by its check (23514)',
  format($q$select public.record_pilot_readings(%L::uuid, jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'device_id', gen_random_uuid(),
      'kind', 'screen_opens', 'screen', 'vender', 'value', 1,
      'occurred_at', now(), 'build', 'x')))$q$, :'ws_a'), '23514');

select public._state_is('4.4 an unknown screen is refused by its check (23514)',
  format($q$select public.record_pilot_readings(%L::uuid, jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'device_id', gen_random_uuid(),
      'kind', 'taps', 'screen', 'numeros', 'value', 1,
      'occurred_at', now(), 'build', 'x')))$q$, :'ws_a'), '23514');

select public._state_is('4.5 a missing screen is refused (23502)',
  format($q$select public.record_pilot_readings(%L::uuid, jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'device_id', gen_random_uuid(),
      'kind', 'taps', 'value', 1, 'occurred_at', now(), 'build', 'x')))$q$, :'ws_a'), '23502');

select public._state_is('4.6 a negative value is refused (23514)',
  format($q$select public.record_pilot_readings(%L::uuid, jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'device_id', gen_random_uuid(),
      'kind', 'commit_ms', 'screen', 'vender', 'value', -1,
      'occurred_at', now(), 'build', 'x')))$q$, :'ws_a'), '23514');

select public._state_is('4.7 a batch that is not an array is refused 22023',
  format($q$select public.record_pilot_readings(%L::uuid, '{}'::jsonb)$q$, :'ws_a'), '22023');

select public._state_is('4.8 a batch of 501 is refused 22023',
  format($q$select public.record_pilot_readings(%L::uuid,
    (select jsonb_agg(jsonb_build_object('id', gen_random_uuid())) from generate_series(1, 501)))$q$,
    :'ws_a'), '22023');

select public._state_is('4.9 she cannot INSERT directly (42501) — the function is the only way in',
  format($q$insert into public.pilot_reading (id, workspace_id, member_id, device_id,
      kind, screen, value, occurred_at, build)
    values (gen_random_uuid(), %L, %L, gen_random_uuid(), 'taps', 'vender', 1, now(), 'x')$q$,
    :'ws_a', :'m_owner_a'), '42501');

select public._state_is('4.10 nor UPDATE (42501)',
  $q$update public.pilot_reading set value = 0$q$, '42501');

select public._state_is('4.11 nor DELETE (42501)',
  $q$delete from public.pilot_reading$q$, '42501');
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public._state_is('4.12 and the OWNER cannot DELETE either — append-only means for him too',
  $q$delete from public.pilot_reading$q$, '42501');
select public.chk('4.13 nothing refused above left a row behind: still four',
  (select count(*) from public.pilot_reading) = 4,
  format('read %s', (select count(*) from public.pilot_reading)));
commit;

-- A member made inactive is no longer a member.
update workspace_member set is_active = false
 where user_id = '0c0c0c0c-0000-4000-8000-000000000003';
begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select public._state_is('4.14 a deactivated cashier is refused 42501',
  format($q$select public.record_pilot_readings(%L::uuid, '[]'::jsonb)$q$, :'ws_a'), '42501');
commit;

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
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
