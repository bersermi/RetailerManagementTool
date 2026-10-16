-- ============================================================================
-- 0057 — a write-off's expiry date, and the day she picks. Plan task `8j`.
--
-- ⚠️ EVERY WRITE IS DRIVEN UNDER `set role authenticated` WITH A MEMBER'S CLAIMS
-- — as the superuser it would pass vacuously (RLS is bypassed, and
-- `record_waste` reads `auth.uid()`).
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
-- Fixtures: one shop, its owner and a cashier at its store, one product with
-- stock on the shelf (put there by `record_purchase`, the way a shop does it)
-- ----------------------------------------------------------------------------
\set owner '''0057aaaa-0000-4000-8000-000000000001'''
\set staff '''0057aaaa-0000-4000-8000-000000000002'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0057@example.mx',  jsonb_build_object('full_name', 'Dueña 0057')),
  (:staff, 'cajera.0057@example.mx', jsonb_build_object('full_name', 'Cajera 0057'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Pollería 0057') as ws \gset
select set_config('request.jwt.claims', null, false);

select id as loc from public.location where workspace_id = :'ws' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
  values (:'ws', :staff, 'staff', 'Cajera 0057');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', wm.id, :'loc' from public.workspace_member wm where wm.user_id = :staff;

insert into public.product_family (workspace_id, name) values (:'ws', 'Lácteos 0057');
select id as fam from public.product_family where workspace_id = :'ws' \gset
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate)
  values (:'ws', :'fam', 'Yogurt 0057', 'pza', 'pza', 'pza', 'pza', 0.0000);
select id as var from public.product_variant where workspace_id = :'ws' \gset
select id as prov from public.provider where workspace_id = :'ws' and is_generic \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select record_purchase('0057cccc-0000-4000-8000-000000000001'::uuid, :'loc'::uuid, :'prov'::uuid,
  jsonb_build_array(jsonb_build_object('variant_id', :'var'::uuid, 'qty_display', 50,
                                       'unit_price_net_per_base', 4.00))) is not null as bought \gset
reset role;

-- A line the way the app sends one, with or without an expiry date.
create function public._wl57(p_variant uuid, p_expiry text default null)
returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('variant_id', p_variant, 'qty_display', 1,
                       'unit_price_gross_per_base', 9.00, 'reason', 'caducado')
    || case when p_expiry is null then '{}'::jsonb
            else jsonb_build_object('expiry_date', p_expiry) end);
$$;
grant execute on function public._wl57(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 1. The column, and what a line may carry
-- ----------------------------------------------------------------------------
select public.chk('1.1 waste_line.expiry_date exists, is a date, and may be empty',
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'waste_line'
             and column_name = 'expiry_date' and data_type = 'date' and is_nullable = 'YES'));

set role authenticated;
select public._try(format('select record_waste(%L, %L, public._wl57(%L))',
  '0057dddd-0000-4000-8000-000000000001', :'loc', :'var')) as no_expiry \gset
select public._try(format('select record_waste(%L, %L, public._wl57(%L, %L))',
  '0057dddd-0000-4000-8000-000000000002', :'loc', :'var', '2026-10-14')) as with_expiry \gset
select public._try(format('select record_waste(%L, %L, public._wl57(%L, %L))',
  '0057dddd-0000-4000-8000-000000000003', :'loc', :'var', '14/10/2026')) as bad_expiry \gset
reset role;

select public.chk('1.2 a write-off without an expiry is recorded, and says none',
  :'no_expiry' = 'ok' and (select expiry_date from public.waste_line
     where waste_id = '0057dddd-0000-4000-8000-000000000001') is null, :'no_expiry');
select public.chk('1.3 a write-off with one keeps it on its line',
  :'with_expiry' = 'ok' and (select expiry_date from public.waste_line
     where waste_id = '0057dddd-0000-4000-8000-000000000002') = date '2026-10-14', :'with_expiry');
select public.chk('1.4 ⚠️ a date that is not YYYY-MM-DD is refused, 22023, and nothing lands',
  :'bad_expiry' = '22023' and not exists (select 1 from public.waste
     where id = '0057dddd-0000-4000-8000-000000000003'), :'bad_expiry');

-- ----------------------------------------------------------------------------
-- 2. The day she picks — kept online now, inside the same 72 hours
-- ----------------------------------------------------------------------------
set role authenticated;
select record_waste('0057eeee-0000-4000-8000-000000000001'::uuid, :'loc'::uuid,
  public._wl57(:'var'::uuid), now() - interval '1 day', false) is not null as ayer \gset
select record_waste('0057eeee-0000-4000-8000-000000000002'::uuid, :'loc'::uuid,
  public._wl57(:'var'::uuid), now() + interval '2 days', false) is not null as manana \gset
select record_waste('0057eeee-0000-4000-8000-000000000003'::uuid, :'loc'::uuid,
  public._wl57(:'var'::uuid), now() - interval '10 days', false) is not null as viejo \gset
reset role;

select public.chk('2.1 ⚠️ ONLINE, *Ayer* is kept — the change 0057 exists for',
  (select occurred_at from public.waste where id = '0057eeee-0000-4000-8000-000000000001')
    between now() - interval '1 day 1 minute' and now() - interval '23 hours 59 minutes');
select public.chk('2.2 a day in the future is brought back to now, not refused',
  (select occurred_at from public.waste where id = '0057eeee-0000-4000-8000-000000000002')
    between now() - interval '1 minute' and now() + interval '1 minute');
select public.chk('2.3 ten days back lands on the 72-hour floor, online as offline',
  (select occurred_at from public.waste where id = '0057eeee-0000-4000-8000-000000000003')
    between now() - interval '72 hours 1 minute' and now() - interval '71 hours 59 minutes');
select public.chk('2.4 …and its movements carry the same day — what product_waste_daily buckets',
  (select bool_and(sm.occurred_at = w.occurred_at)
     from public.stock_movement sm join public.waste w on w.id = sm.waste_id
    where w.id = '0057eeee-0000-4000-8000-000000000001'));

-- ----------------------------------------------------------------------------
-- 3. Retries: the expiry is part of what a write-off IS
-- ----------------------------------------------------------------------------
set role authenticated;
select (record_waste('0057dddd-0000-4000-8000-000000000002'::uuid, :'loc'::uuid,
  public._wl57(:'var'::uuid, '2026-10-14')) ->> 'already_recorded') as same_retry \gset
select public._try(format('select record_waste(%L, %L, public._wl57(%L, %L))',
  '0057dddd-0000-4000-8000-000000000002', :'loc', :'var', '2026-10-15')) as changed_retry \gset
reset role;

select public.chk('3.1 the same write-off sent again is recognised as itself',
  :'same_retry' = 'true', :'same_retry');
select public.chk('3.2 ⚠️ the same id with a different expiry is a different document — TD001',
  :'changed_retry' = 'TD001', :'changed_retry');
select public.chk('3.3 ⚠️ a line WITHOUT an expiry hashes exactly as it did before 0057 — '
                  'every queued write and dead letter stays recognisable',
  (select payload_hash from public.waste where id = '0057dddd-0000-4000-8000-000000000001')
  = (select md5(format('%s|%s|%s|%s', wl.variant_id, wl.qty_base,
                       round(9.00 * wl.qty_base, 2), wl.reason))
       from public.waste_line wl where wl.waste_id = '0057dddd-0000-4000-8000-000000000001'));

-- ----------------------------------------------------------------------------
-- 4. No new rule about who may do what
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), false);
set role authenticated;
select public._try(format('select record_waste(%L, %L, public._wl57(%L, %L))',
  '0057ffff-0000-4000-8000-000000000001', :'loc', :'var', '2026-10-13')) as by_staff \gset
reset role;
select set_config('request.jwt.claims', null, false);
select public.chk('4.1 a cashier at her store writes off with an expiry, as she wrote off before',
  :'by_staff' = 'ok' and (select expiry_date from public.waste_line
     where waste_id = '0057ffff-0000-4000-8000-000000000001') = date '2026-10-13', :'by_staff');

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
  if (select count(*) from public._verify) <> 12 then
    raise exception 'expected 12 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
