-- ============================================================================
-- 0061 — Te lo compro: a pickup at least five hours after the request. Plan
-- task `8g`, the owner's ruling of 2026-10-16.
--
-- ⚠️ EVERY CALL IS DRIVEN UNDER `set role authenticated` WITH THE OWNER'S CLAIMS.
--
-- ⚠️⚠️ THE STORE'S CLOCK IS SET, NOT HOPED FOR. The rule is read in the store's
-- own time, and a fixed date and hour would pass or fail by when CI happens to
-- run. So the fixture moves the store to the `Etc/GMT` zone in which it is
-- about 10:00 right now: today at 12:00 is then always too soon (even at
-- 10:59), today at 16:00 always far enough (even at 10:00 with the half hour of
-- grace, the floor is 15:29), and the window 07:00–18:45 holds both.
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

\set owner '''0061aaaa-0000-4000-8000-000000000001'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0061@example.mx', jsonb_build_object('full_name', 'Dueña 0061'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Pollería 0061') as ws \gset
select set_config('request.jwt.claims', null, false);

select id as loc from public.location where workspace_id = :'ws' \gset

-- The zone where it is ten in the morning now: local = UTC + offset, offset in
-- [-12, +11], and `Etc/GMT-K` is UTC+K (the sign is POSIX's, inverted).
select ((10 - extract(hour from now() at time zone 'UTC')::int + 12 + 24) % 24) - 12 as off \gset
select case when :off >= 0 then 'Etc/GMT-' || :off else 'Etc/GMT+' || (- :off) end as zone \gset
update public.location set street = 'Sabino', street_number = '120', city = 'Ciudad de México',
       postal_code = '06470', timezone = :'zone' where id = :'loc';
select (now() at time zone :'zone')::date as today, (now() at time zone :'zone')::time as clock \gset

insert into public.product_family (workspace_id, name) values (:'ws', 'Pollo 0061');
select id as fam from public.product_family where workspace_id = :'ws' \gset
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws', :'fam', 'Alas 0061', 'g', 'kg', 'kg', 'kg');
select id as var from public.product_variant where workspace_id = :'ws' \gset

create function public._r61(p_id text, p_day date, p_from text, p_to text, p_variant uuid, p_loc uuid)
returns text language sql as $$
  select public._try(format('select request_collection(%L, %L, %L::date, %L, %L, %L::jsonb)',
    p_id, p_loc, p_day, p_from, p_to,
    jsonb_build_array(jsonb_build_object('variant_id', p_variant, 'qty_display', '2',
      'qty_display_unit', 'kg', 'condition', 'bueno', 'packaging', 'cerrado',
      'keeping', 'refrigerado'))));
$$;
grant execute on function public._r61(text, date, text, text, uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 1. Five hours ahead, in the store's own time
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._r61('0061bbbb-0000-4000-8000-000000000001', :'today', '12:00', '12:15', :'var', :'loc') as soon \gset
select public._r61('0061bbbb-0000-4000-8000-000000000002', :'today', '07:00', '07:15', :'var', :'loc') as past \gset
select public._r61('0061bbbb-0000-4000-8000-000000000003', :'today', '16:00', '16:15', :'var', :'loc') as later \gset
select public._r61('0061bbbb-0000-4000-8000-000000000004', (:'today'::date + 1), '07:00', '07:15', :'var', :'loc') as tomorrow \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('1.0 the fixture''s store clock reads mid-morning',
  :'clock'::time between time '10:00' and time '10:59:59', :'zone' || ' ' || :'clock');
select public.chk('1.1 ⚠️ the owner''s rule: a pickup two hours out is refused — TD011',
  :'soon' = 'TD011', :'soon');
select public.chk('1.2 a quarter already gone today is refused the same way — TD011',
  :'past' = 'TD011', :'past');
select public.chk('1.3 a quarter five hours out and more is kept, today',
  :'later' = 'ok' and exists (select 1 from public.collection_request
    where id = '0061bbbb-0000-4000-8000-000000000003' and window_start = time '16:00'), :'later');
select public.chk('1.4 and tomorrow at the first quarter is kept',
  :'tomorrow' = 'ok', :'tomorrow');
select public.chk('1.5 nothing was stored for the refused two',
  not exists (select 1 from public.collection_request
    where id in ('0061bbbb-0000-4000-8000-000000000001', '0061bbbb-0000-4000-8000-000000000002')));

-- ----------------------------------------------------------------------------
-- 2. The census — TD011 is this rule's and nothing else's
-- ----------------------------------------------------------------------------
select public.chk('2.1 TD011 is raised by request_collection and by nothing else',
  (select coalesce(array_agg(proname::text order by proname), '{}') from pg_proc
    where pronamespace = 'public'::regnamespace and prosrc like '%TD011%')
    = array['request_collection']::text[]);

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
  if (select count(*) from public._verify) <> 7 then
    raise exception 'expected 7 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
