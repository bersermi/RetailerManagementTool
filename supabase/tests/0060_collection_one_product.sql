-- ============================================================================
-- 0060 — Te lo compro as the owner redrew it: one product, one quarter of an
-- hour, `rechazada`, and the photo fence. Plan task `8l`, 2026-10-16.
--
-- ⚠️ EVERY CALL IS DRIVEN UNDER `set role authenticated` WITH A MEMBER'S CLAIMS
-- — as the superuser the fence would pass vacuously. The fixture's address and
-- the status Wera sets are the superuser's, as the owner sets them in the
-- dashboard.
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

\set owner '''0060aaaa-0000-4000-8000-000000000001'''
\set staff '''0060aaaa-0000-4000-8000-000000000002'''
\set otro  '''0060aaaa-0000-4000-8000-000000000003'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0060@example.mx',  jsonb_build_object('full_name', 'Dueña 0060')),
  (:staff, 'cajera.0060@example.mx', jsonb_build_object('full_name', 'Cajera 0060')),
  (:otro,  'otro.0060@example.mx',   jsonb_build_object('full_name', 'Otro 0060'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Pollería 0060') as ws \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
select onboard_workspace('Otra 0060') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc from public.location where workspace_id = :'ws' \gset
update public.location set street = 'Sabino', street_number = '120', city = 'Ciudad de México',
       postal_code = '06470' where id = :'loc';
insert into public.workspace_member (workspace_id, user_id, role, display_name)
  values (:'ws', :staff, 'staff', 'Cajera 0060');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', wm.id, :'loc' from public.workspace_member wm where wm.user_id = :staff;
insert into public.product_family (workspace_id, name) values (:'ws', 'Pollo 0060');
select id as fam from public.product_family where workspace_id = :'ws' \gset
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws', :'fam', 'Alas 0060', 'g', 'kg', 'kg', 'kg'),
  (:'ws', :'fam', 'Molleja 0060', 'g', 'kg', 'kg', 'kg');
select id as var  from public.product_variant where workspace_id = :'ws' and name = 'Alas 0060' \gset
select id as var2 from public.product_variant where workspace_id = :'ws' and name = 'Molleja 0060' \gset

create function public._l60(p_variant uuid) returns jsonb language sql as $$
  select jsonb_build_object('variant_id', p_variant, 'qty_display', '2', 'qty_display_unit', 'kg',
    'condition', 'magullado', 'packaging', 'cerrado', 'keeping', 'refrigerado');
$$;
grant execute on function public._l60(uuid) to authenticated;
create function public._r60(p_id text, p_lines jsonb, p_from text, p_to text)
returns text language sql as $$
  select public._try(format('select request_collection(%L, %L, current_date + 1, %L, %L, %L::jsonb)',
    p_id, (select l.id from public.location l join public.workspace w on w.id = l.workspace_id
            where w.display_name = 'Pollería 0060'), p_from, p_to, p_lines));
$$;
grant execute on function public._r60(text, jsonb, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 1. One product, one quarter of an hour
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._r60('0060bbbb-0000-4000-8000-000000000001', jsonb_build_array(public._l60(:'var')), '09:45', '10:00') as quarter \gset
select public._r60('0060bbbb-0000-4000-8000-000000000002', jsonb_build_array(public._l60(:'var')), '18:45', '19:00') as last_quarter \gset
select public._r60('0060bbbb-0000-4000-8000-000000000003', jsonb_build_array(public._l60(:'var'), public._l60(:'var2')), '09:00', '09:15') as two_products \gset
select public._r60('0060bbbb-0000-4000-8000-000000000004', jsonb_build_array(public._l60(:'var')), '09:00', '10:30') as wide \gset
select public._r60('0060bbbb-0000-4000-8000-000000000005', jsonb_build_array(public._l60(:'var')), '19:00', '19:15') as after_close \gset
select public._r60('0060bbbb-0000-4000-8000-000000000006', jsonb_build_array(public._l60(:'var')), '09:10', '09:25') as off_quarter \gset
reset role;

select public.chk('1.1 ⚠️ the owner''s example: 9:45 is 9:45 to 10:00, and it is kept',
  :'quarter' = 'ok' and (select window_start = time '09:45' and window_end = time '10:00'
    from public.collection_request where id = '0060bbbb-0000-4000-8000-000000000001'), :'quarter');
select public.chk('1.2 the last quarter is 18:45 to 19:00', :'last_quarter' = 'ok', :'last_quarter');
select public.chk('1.3 ⚠️ two products in one request are refused — 22023, one product each',
  :'two_products' = '22023', :'two_products');
select public.chk('1.4 ⚠️ a from–till window is refused — 22023, the window is one quarter',
  :'wide' = '22023', :'wide');
select public.chk('1.5 a start at 19:00, or off the quarter, is refused — 22023',
  :'after_close' = '22023' and :'off_quarter' = '22023', :'after_close' || ' ' || :'off_quarter');
select public.chk('1.6 and the table holds the same rule without the function — 23514',
  public._try(format('insert into public.collection_request (id, workspace_id, location_id, pickup_date, '
    || 'window_start, window_end, street, street_number, city, postal_code, lines, created_by) values '
    || '(gen_random_uuid(), %L, %L, current_date + 1, ''09:00'', ''10:00'', ''x'', ''1'', ''y'', ''06470'', '
    || '''[{"a":1}]''::jsonb, %L)', :'ws', :'loc', :owner)) = '23514'
  and public._try(format('insert into public.collection_request (id, workspace_id, location_id, pickup_date, '
    || 'window_start, window_end, street, street_number, city, postal_code, lines, created_by) values '
    || '(gen_random_uuid(), %L, %L, current_date + 1, ''09:00'', ''09:15'', ''x'', ''1'', ''y'', ''06470'', '
    || '''[{"a":1},{"b":2}]''::jsonb, %L)', :'ws', :'loc', :owner)) = '23514');

-- ----------------------------------------------------------------------------
-- 2. Rechazada — Wera's, and not the shop's to undo
-- ----------------------------------------------------------------------------
-- ⚠️ THE WRITE AND THE READ-BACK ARE TWO STATEMENTS: a read inside the writing
-- statement sees the snapshot from before it.
select public._try(format('update public.collection_request set status = %L where id = %L',
    'rechazada', '0060bbbb-0000-4000-8000-000000000001')) as to_rechazada \gset
select public.chk('2.1 rechazada is a status the table takes',
  :'to_rechazada' = 'ok' and (select status from public.collection_request
        where id = '0060bbbb-0000-4000-8000-000000000001') = 'rechazada', :'to_rechazada');
select public.chk('2.2 and a status nobody named is not — 23514',
  public._try(format('update public.collection_request set status = %L where id = %L',
    'pagada', '0060bbbb-0000-4000-8000-000000000002')) = '23514');
set role authenticated;
select public._try(format('select cancel_collection_request(%L)', '0060bbbb-0000-4000-8000-000000000001')) as cancel_refused \gset
reset role;
select public.chk('2.3 ⚠️ the shop cannot call off what Wera refused — TD010, and it stays rechazada',
  :'cancel_refused' = 'TD010' and (select status from public.collection_request
    where id = '0060bbbb-0000-4000-8000-000000000001') = 'rechazada', :'cancel_refused');

-- ----------------------------------------------------------------------------
-- 3. The photo fence — the request's own: an owner or a manager of the shop
-- ----------------------------------------------------------------------------
create function public._path_ok_as(p_user uuid, p_name text) returns boolean language plpgsql as $$
declare v boolean;
begin
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), false);
  execute 'set role authenticated';
  v := public.merma_path_ok(p_name);
  execute 'reset role';
  return v;
end;
$$;
select public.chk('3.1 the owner may put a photo in her shop''s folder',
  public._path_ok_as(:owner, format('%s/%s/uno.jpg', :'ws', '0060bbbb-0000-4000-8000-000000000001')));
select public.chk('3.2 ⚠️ a cashier may not, and another shop''s owner may not',
  not public._path_ok_as(:staff, format('%s/x/uno.jpg', :'ws'))
  and not public._path_ok_as(:otro, format('%s/x/uno.jpg', :'ws')));
select public.chk('3.3 a path that does not start with a shop is a plain no, never an error',
  not public._path_ok_as(:owner, 'no-es-una-tienda/uno.jpg')
  and not public._path_ok_as(:owner, '') and not public._path_ok_as(:owner, null));
select set_config('request.jwt.claims', null, false);

-- ⚠️ WHERE STORAGE RUNS: the bucket is private and both policies stand on the fence.
-- Elsewhere the migration skipped that part with a notice, and so does this check.
select public.chk('3.4 the bucket merma is private and fenced by merma_path_ok — where Storage runs',
  to_regclass('storage.buckets') is null
  or ((select count(*) = 1 from storage.buckets where id = 'merma' and not public)
      and (select count(*) = 2 from pg_policies
            where schemaname = 'storage' and tablename = 'objects'
              and policyname in ('merma_insert', 'merma_select')
              and coalesce(qual, with_check) ~ 'merma_path_ok')),
  coalesce(to_regclass('storage.buckets')::text, 'no storage here'));

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
  if (select count(*) from public._verify) <> 13 then
    raise exception 'expected 13 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
