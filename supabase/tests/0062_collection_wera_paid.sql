-- ============================================================================
-- 0062 — Te lo compro: what Wera paid. Plan task `8n`, the owner's ruling of
-- 2026-10-17.
--
-- ⚠️ THE AMOUNT IS SET AS THE OWNER SETS IT — the database's owner, the way the
-- dashboard writes — and every READ and every refused WRITE is driven under
-- `set role authenticated` with a member's claims, or RLS passes vacuously.
--
-- ⚠️ THE REQUESTS ARE INSERTED DIRECTLY, not through `request_collection`: this
-- suite is about one column, and the function's day and five-hour rules would
-- make it depend on when it runs (`0061`'s suite is where those live).
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

\set owner '''0062aaaa-0000-4000-8000-000000000001'''
\set staff '''0062aaaa-0000-4000-8000-000000000002'''
\set otro  '''0062aaaa-0000-4000-8000-000000000003'''
\set r1    '''0062bbbb-0000-4000-8000-000000000001'''
\set r2    '''0062bbbb-0000-4000-8000-000000000002'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0062@example.mx',  jsonb_build_object('full_name', 'Dueña 0062')),
  (:staff, 'cajera.0062@example.mx', jsonb_build_object('full_name', 'Cajera 0062')),
  (:otro,  'otro.0062@example.mx',   jsonb_build_object('full_name', 'Otro 0062'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Pollería 0062') as ws \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
select onboard_workspace('Otra 0062') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc from public.location where workspace_id = :'ws' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws', :staff, 'staff', 'Cajera 0062');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', wm.id, :'loc' from public.workspace_member wm
   where wm.workspace_id = :'ws' and wm.user_id = :staff;

insert into public.collection_request (id, workspace_id, location_id, status, pickup_date,
       window_start, window_end, street, street_number, city, postal_code, lines, created_by) values
  (:r1, :'ws', :'loc', 'confirmada', date '2026-10-20', '09:00', '09:15',
   'Sabino', '120', 'Ciudad de México', '06400',
   '[{"variant_name": "Plátano 0062", "qty_display": "2"}]'::jsonb, :owner),
  (:r2, :'ws', :'loc', 'confirmada', date '2026-10-21', '10:00', '10:15',
   'Sabino', '120', 'Ciudad de México', '06400',
   '[{"variant_name": "Jitomate 0062", "qty_display": "3"}]'::jsonb, :owner);

-- ----------------------------------------------------------------------------
-- 1. The column, and the owner typing it in the dashboard
-- ----------------------------------------------------------------------------
select public.chk('1.1 wera_paid is pesos, numeric(12,2), and empty until he types it',
  (select format_type(a.atttypid, a.atttypmod) = 'numeric(12,2)' and not a.attnotnull
     from pg_attribute a
    where a.attrelid = 'public.collection_request'::regclass and a.attname = 'wera_paid')
  and (select wera_paid is null from public.collection_request where id = :r1));

update public.collection_request set status = 'recogida', wera_paid = 180.00 where id = :r1;
-- ⚠️ AND IN THE OTHER ORDER — the amount first, the status after, one cell at a
-- time as the dashboard saves them. Nothing ties the two.
select public._try(format('update public.collection_request set wera_paid = 95.50 where id = %L', :r2)) as amount_first \gset
update public.collection_request set status = 'recogida' where id = :r2;
select public.chk('1.2 the amount is kept whether it is typed before or after recogida',
  :'amount_first' = 'ok'
  and (select array_agg(wera_paid::text order by id) from public.collection_request
        where id in (:r1, :r2)) = array['180.00', '95.50'], :'amount_first');

select public._try(format('update public.collection_request set wera_paid = -1 where id = %L', :r1)) as negative \gset
select public.chk('1.3 a negative amount is refused — 23514',
  :'negative' = '23514'
  and (select wera_paid = 180.00 from public.collection_request where id = :r1), :'negative');

-- ----------------------------------------------------------------------------
-- 2. A shop reads what Wera paid, and can never say it
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select coalesce(sum(wera_paid), 0)::text as owner_reads from public.collection_request \gset
select public._try(format('update public.collection_request set wera_paid = 999 where id = %L', :r1)) as owner_writes \gset
reset role;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), false);
set role authenticated;
select count(*)::text as staff_reads from public.collection_request \gset
reset role;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
set role authenticated;
select count(*)::text as other_reads from public.collection_request where workspace_id = :'ws' \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('2.1 the shop''s owner reads both amounts — $275.50',
  :'owner_reads' = '275.50', :'owner_reads');
select public.chk('2.2 ⚠️ and cannot write one — 42501, no grant, the amount unchanged',
  :'owner_writes' = '42501'
  and (select wera_paid = 180.00 from public.collection_request where id = :r1), :'owner_writes');
select public.chk('2.3 a cashier reads none of it (Te lo compro is the owner''s and the manager''s)',
  :'staff_reads' = '0', :'staff_reads');
select public.chk('2.4 another shop reads none of it',
  :'other_reads' = '0', :'other_reads');

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
