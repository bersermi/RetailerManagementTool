-- ============================================================================
-- Behavioural verification for 0064 — a correction counts on the day of what it
-- corrects. Plan task `8p`, the owner's ruling of 2026-10-19.
--
--   1. the three write functions, re-signed: one each, p_corrects last and
--      defaulted, the fence re-issued (anon none, authenticated yes), still
--      security definer with an empty search_path
--   2. a correction of yesterday's SALE lands on yesterday, at the original's
--      own instant, while its recorded_at is now — and the daily views agree
--   3. ⚠️ every way a p_corrects can fail to match lands like a new write
--      (now), never an error: not voided, voided by somebody else, another
--      store, another shop, a reversal named instead of a document, a uuid
--      that names nothing
--   4. AT ANY AGE: a manager's correction of a ten-day-old sale lands ten days
--      back, which no other path to this function allows
--   5. the same for a DELIVERY and a WRITE-OFF
--   6. a DELETION (a void with no re-record) of yesterday's documents leaves
--      every daily view's today untouched and nets yesterday to zero
--
-- ⚠️ YESTERDAY IS MADE THE WAY THE PHONE MAKES IT: an offline write whose own
-- time is a day back, which every record_* keeps inside its 72 hours. The ONE
-- document older than that (section 4) is aged by hand with the immutability
-- trigger off for a single statement — fixture surgery on the original, never
-- on anything under test, and said so where it happens.
--
-- Run: docker exec -i supabase_db_<project> psql -U postgres -d postgres
--        -v ON_ERROR_STOP=1 < supabase/tests/0064_correction_counts_on_its_day.sql
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

create or replace function public._sl64(p_variant uuid, p_qty numeric, p_price numeric default 10.00)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_gross_per_base', p_price))
$$;
grant execute on function public._sl64(uuid, numeric, numeric) to authenticated;

create or replace function public._pl64(p_variant uuid, p_qty numeric, p_price numeric default 4.00)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_net_per_base', p_price))
$$;
grant execute on function public._pl64(uuid, numeric, numeric) to authenticated;

create or replace function public._wl64(p_variant uuid, p_qty numeric)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_gross_per_base', 9.00, 'reason', 'caducado'))
$$;
grant execute on function public._wl64(uuid, numeric) to authenticated;

-- ---------------------------------------------------------------- fixture ----
\set owner   '''0064aaaa-0000-4000-8000-000000000001'''
\set staff   '''0064aaaa-0000-4000-8000-000000000002'''
\set staff2  '''0064aaaa-0000-4000-8000-000000000003'''
\set owner_b '''0064aaaa-0000-4000-8000-000000000004'''
\set jwt_owner   '''{"sub":"0064aaaa-0000-4000-8000-000000000001","role":"authenticated"}'''
\set jwt_staff   '''{"sub":"0064aaaa-0000-4000-8000-000000000002","role":"authenticated"}'''
\set jwt_staff2  '''{"sub":"0064aaaa-0000-4000-8000-000000000003","role":"authenticated"}'''
\set jwt_owner_b '''{"sub":"0064aaaa-0000-4000-8000-000000000004","role":"authenticated"}'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner,   'duena.0064@example.mx',   jsonb_build_object('full_name', 'Dueña 0064')),
  (:staff,   'cajera.0064@example.mx',  jsonb_build_object('full_name', 'Cajera 0064')),
  (:staff2,  'cajera2.0064@example.mx', jsonb_build_object('full_name', 'Cajera Dos 0064')),
  (:owner_b, 'otra.0064@example.mx',    jsonb_build_object('full_name', 'Otra Dueña 0064'));

select set_config('request.jwt.claims', :jwt_owner, false);
select onboard_workspace('Abarrotes 0064') as ws \gset
select set_config('request.jwt.claims', :jwt_owner_b, false);
select onboard_workspace('Otra tienda 0064') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc from public.location where workspace_id = :'ws' \gset
select id as loc_b from public.location where workspace_id = :'ws_b' \gset
insert into public.location (workspace_id, name) values (:'ws', 'Sucursal 0064');
select id as loc2 from public.location where workspace_id = :'ws' and name = 'Sucursal 0064' \gset
select timezone as tz from public.location where id = :'loc' \gset

insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws', :staff,  'staff', 'Cajera 0064'),
  (:'ws', :staff2, 'staff', 'Cajera Dos 0064');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', wm.id, :'loc' from public.workspace_member wm
   where wm.user_id in (:staff, :staff2);

insert into public.product_family (workspace_id, name) values (:'ws', 'Abarrotes 0064');
select id as fam from public.product_family where workspace_id = :'ws' \gset
insert into public.product_family (workspace_id, name) values (:'ws_b', 'Abarrotes B 0064');
select id as fam_b from public.product_family where workspace_id = :'ws_b' \gset

-- One product per story, so every view assertion reads one story's rows.
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws', :'fam', 'Corregida 0064',  'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Fallida 0064',    'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Antigua 0064',    'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Entrega 0064',    'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Merma 0064',      'pza','pza','pza','pza', 0.0000),
  (:'ws', :'fam', 'Borrada 0064',    'pza','pza','pza','pza', 0.0000);
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_b', :'fam_b', 'Ajena 0064', 'pza','pza','pza','pza', 0.0000);

select id as var_s from public.product_variant where name = 'Corregida 0064' \gset
select id as var_f from public.product_variant where name = 'Fallida 0064' \gset
select id as var_a from public.product_variant where name = 'Antigua 0064' \gset
select id as var_p from public.product_variant where name = 'Entrega 0064' \gset
select id as var_w from public.product_variant where name = 'Merma 0064' \gset
select id as var_x from public.product_variant where name = 'Borrada 0064' \gset
select id as var_b from public.product_variant where name = 'Ajena 0064' \gset
select id as prov from public.provider where workspace_id = :'ws' and is_generic \gset
select id as prov_b from public.provider where workspace_id = :'ws_b' and is_generic \gset

-- Stock, delivered THREE days back so every sale below has lots to draw on at
-- whatever time it is dated.
select set_config('request.jwt.claims', :jwt_owner, false);
set role authenticated;
select record_purchase('0064bbbb-0000-4000-8000-000000000001'::uuid, :'loc'::uuid, :'prov'::uuid,
  public._pl64(:'var_s'::uuid, 100) || public._pl64(:'var_f'::uuid, 100)
  || public._pl64(:'var_a'::uuid, 100) || public._pl64(:'var_w'::uuid, 100)
  || public._pl64(:'var_x'::uuid, 100),
  now() - interval '70 hours', true) is not null as stocked \gset
select record_purchase('0064bbbb-0000-4000-8000-000000000002'::uuid, :'loc2'::uuid, :'prov'::uuid,
  public._pl64(:'var_f'::uuid, 50), now() - interval '70 hours', true) is not null as stocked2 \gset
reset role;
select set_config('request.jwt.claims', :jwt_owner_b, false);
set role authenticated;
select record_purchase('0064bbbb-0000-4000-8000-000000000003'::uuid, :'loc_b'::uuid, :'prov_b'::uuid,
  public._pl64(:'var_b'::uuid, 50), now() - interval '70 hours', true) is not null as stocked_b \gset
reset role;
select set_config('request.jwt.claims', null, false);

\set yesterday '(now() - interval ''1 day'')'

-- ============================================ 1. the three, re-signed ========
select public.chk('1.1 each writer is exactly ONE function, and p_corrects is its last argument, defaulted',
  (select count(*) from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('record_sale', 'record_purchase', 'record_waste')) = 3
  and (select bool_and(pg_get_function_arguments(oid) ~ 'p_corrects uuid DEFAULT NULL::uuid$')
         from pg_proc
        where pronamespace = 'public'::regnamespace
          and proname in ('record_sale', 'record_purchase', 'record_waste')),
  (select string_agg(proname || '(' || pg_get_function_identity_arguments(oid) || ')', ' | ')
     from pg_proc where pronamespace = 'public'::regnamespace
      and proname in ('record_sale', 'record_purchase', 'record_waste')));

select public.chk('1.2 ⚠️ the drop took the grants and 0064 re-issued them: anon none, authenticated all three',
  not has_function_privilege('anon', 'public.record_sale(uuid,uuid,jsonb,timestamptz,boolean,uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.record_purchase(uuid,uuid,uuid,jsonb,timestamptz,boolean,uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.record_waste(uuid,uuid,jsonb,timestamptz,boolean,uuid,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.record_sale(uuid,uuid,jsonb,timestamptz,boolean,uuid,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.record_purchase(uuid,uuid,uuid,jsonb,timestamptz,boolean,uuid,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.record_waste(uuid,uuid,jsonb,timestamptz,boolean,uuid,uuid)', 'execute'));

select public.chk('1.3 all three are still security definer with an empty search_path',
  (select count(*) from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('record_sale', 'record_purchase', 'record_waste')
      and prosecdef and proconfig = array['search_path=""']) = 3);

-- ======================== 2. a correction of yesterday's sale ================
-- The cashier rang it up yesterday (offline), deletes it today and re-keys it.
select set_config('request.jwt.claims', :jwt_staff, false);
set role authenticated;
select record_sale('0064cccc-0000-4000-8000-000000000001'::uuid, :'loc'::uuid,
  public._sl64(:'var_s'::uuid, 3), :yesterday, true) is not null as s_orig \gset
select void_transaction('sale', '0064cccc-0000-4000-8000-000000000001'::uuid, 'corregir')
  is not null as s_void \gset
select record_sale('0064cccc-0000-4000-8000-000000000002'::uuid, :'loc'::uuid,
  public._sl64(:'var_s'::uuid, 2), null, false, null,
  '0064cccc-0000-4000-8000-000000000001'::uuid) is not null as s_fixed \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('2.1 ⚠️ the re-keyed sale takes the ORIGINAL''s instant, not now — online, at a cashier',
  (select occurred_at from public.sale where id = '0064cccc-0000-4000-8000-000000000002')
  = (select occurred_at from public.sale where id = '0064cccc-0000-4000-8000-000000000001'),
  (select occurred_at::text from public.sale where id = '0064cccc-0000-4000-8000-000000000002'));

select public.chk('2.2 …and our side keeps the real timeline: recorded now, not recorded offline',
  (select recorded_at from public.sale where id = '0064cccc-0000-4000-8000-000000000002')
    > now() - interval '1 minute'
  and not (select recorded_offline from public.sale where id = '0064cccc-0000-4000-8000-000000000002'));

select public.chk('2.3 ⚠️ product_velocity_daily: yesterday holds the CORRECTED sale (2) and today none of it',
  (select qty_base_sold from public.product_velocity_daily
    where variant_id = :'var_s' and day = (:yesterday at time zone :'tz')::date) = 2
  and (select line_count from public.product_velocity_daily
    where variant_id = :'var_s' and day = (:yesterday at time zone :'tz')::date) = 3
  and coalesce((select line_count from public.product_velocity_daily
    where variant_id = :'var_s' and day = (now() at time zone :'tz')::date), 0) = 0,
  (select string_agg(day || ': ' || qty_base_sold || ' in ' || line_count || ' line(s)', ', ' order by day)
     from public.product_velocity_daily where variant_id = :'var_s' and line_count > 0));

select public.chk('2.4 …and product_margin_daily reads the same day for revenue and for cost',
  (select qty_base_sold from public.product_margin_daily
    where variant_id = :'var_s' and day = (:yesterday at time zone :'tz')::date) = 2
  and (select movement_count from public.product_margin_daily
    where variant_id = :'var_s' and day = (:yesterday at time zone :'tz')::date) >= 3
  and not exists (select 1 from public.product_margin_daily
    where variant_id = :'var_s' and day = (now() at time zone :'tz')::date));

-- ============ 3. ⚠️ a p_corrects that does not match lands like a new sale ===
-- Each is online, so "lands like a new sale" is now(), and none raises.
select set_config('request.jwt.claims', :jwt_staff, false);
set role authenticated;
-- 3.1 names a sale that stands — nothing was voided
select record_sale('0064dddd-0000-4000-8000-000000000001'::uuid, :'loc'::uuid,
  public._sl64(:'var_f'::uuid, 1), :yesterday, true) is not null as f1_orig \gset
select record_sale('0064dddd-0000-4000-8000-000000000002'::uuid, :'loc'::uuid,
  public._sl64(:'var_f'::uuid, 1), null, false, null,
  '0064dddd-0000-4000-8000-000000000001'::uuid) is not null as f1 \gset
-- 3.2 names a sale the OWNER voided (the cashier is not who undid it)
select record_sale('0064dddd-0000-4000-8000-000000000003'::uuid, :'loc'::uuid,
  public._sl64(:'var_f'::uuid, 1), :yesterday, true) is not null as f2_orig \gset
reset role;
select set_config('request.jwt.claims', :jwt_owner, false);
set role authenticated;
select void_transaction('sale', '0064dddd-0000-4000-8000-000000000003'::uuid, 'eliminar')
  is not null as f2_void \gset
-- 3.3 names a sale of the OTHER store, voided by the owner, re-keyed at this one
select record_sale('0064dddd-0000-4000-8000-000000000005'::uuid, :'loc2'::uuid,
  public._sl64(:'var_f'::uuid, 1), :yesterday, true) is not null as f3_orig \gset
select void_transaction('sale', '0064dddd-0000-4000-8000-000000000005'::uuid, 'corregir')
  is not null as f3_void \gset
select record_sale('0064dddd-0000-4000-8000-000000000006'::uuid, :'loc'::uuid,
  public._sl64(:'var_f'::uuid, 1), null, false, null,
  '0064dddd-0000-4000-8000-000000000005'::uuid) is not null as f3 \gset
reset role;
select set_config('request.jwt.claims', :jwt_staff, false);
set role authenticated;
select record_sale('0064dddd-0000-4000-8000-000000000004'::uuid, :'loc'::uuid,
  public._sl64(:'var_f'::uuid, 1), null, false, null,
  '0064dddd-0000-4000-8000-000000000003'::uuid) is not null as f2 \gset
reset role;
-- 3.4 names a sale of ANOTHER SHOP, voided by its own owner
select set_config('request.jwt.claims', :jwt_owner_b, false);
set role authenticated;
select record_sale('0064dddd-0000-4000-8000-000000000007'::uuid, :'loc_b'::uuid,
  public._sl64(:'var_b'::uuid, 1), :yesterday, true) is not null as f4_orig \gset
select void_transaction('sale', '0064dddd-0000-4000-8000-000000000007'::uuid, 'corregir')
  is not null as f4_void \gset
reset role;
select set_config('request.jwt.claims', :jwt_owner, false);
set role authenticated;
select record_sale('0064dddd-0000-4000-8000-000000000008'::uuid, :'loc'::uuid,
  public._sl64(:'var_f'::uuid, 1), null, false, null,
  '0064dddd-0000-4000-8000-000000000007'::uuid) is not null as f4 \gset
-- 3.5 names the REVERSAL rather than the document (the owner's own, of 3.3)
select record_sale('0064dddd-0000-4000-8000-000000000009'::uuid, :'loc2'::uuid,
  public._sl64(:'var_f'::uuid, 1), null, false, null,
  (select id from public.sale where reversal_of = '0064dddd-0000-4000-8000-000000000005')) is not null as f5 \gset
-- 3.6 names nothing at all
select record_sale('0064dddd-0000-4000-8000-00000000000a'::uuid, :'loc'::uuid,
  public._sl64(:'var_f'::uuid, 1), null, false, null,
  '0064dead-0000-4000-8000-000000000000'::uuid) is not null as f6 \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('3.1 a document that was never voided corrects nothing — lands now',
  :'f1' and (select occurred_at from public.sale where id = '0064dddd-0000-4000-8000-000000000002')
    > now() - interval '1 minute');
select public.chk('3.2 ⚠️ a sale SOMEBODY ELSE voided corrects nothing for her — lands now',
  :'f2' and (select occurred_at from public.sale where id = '0064dddd-0000-4000-8000-000000000004')
    > now() - interval '1 minute');
select public.chk('3.3 a sale of ANOTHER STORE corrects nothing here — lands now',
  :'f3' and (select occurred_at from public.sale where id = '0064dddd-0000-4000-8000-000000000006')
    > now() - interval '1 minute');
select public.chk('3.4 ⚠️ a sale of ANOTHER SHOP corrects nothing — lands now, and says nothing about it',
  :'f4' and (select occurred_at from public.sale where id = '0064dddd-0000-4000-8000-000000000008')
    > now() - interval '1 minute');
select public.chk('3.5 the reversal itself is not a document to correct — lands now',
  :'f5' and (select occurred_at from public.sale where id = '0064dddd-0000-4000-8000-000000000009')
    > now() - interval '1 minute');
select public.chk('3.6 a uuid that names nothing — lands now, no error',
  :'f6' and (select occurred_at from public.sale where id = '0064dddd-0000-4000-8000-00000000000a')
    > now() - interval '1 minute');

-- ================================================ 4. AT ANY AGE =============
-- ⚠️ FIXTURE SURGERY, ON THE ORIGINAL ONLY: no path a phone has can date a sale
-- ten days back (the clamp is 72 hours), so the original is recorded yesterday
-- and aged here with its immutability trigger off for one statement. Nothing
-- under test is touched.
select set_config('request.jwt.claims', :jwt_owner, false);
set role authenticated;
select record_sale('0064eeee-0000-4000-8000-000000000001'::uuid, :'loc'::uuid,
  public._sl64(:'var_a'::uuid, 1), :yesterday, true) is not null as a_orig \gset
reset role;
alter table public.sale disable trigger sale_immutable_trg;
update public.sale set occurred_at = now() - interval '10 days'
 where id = '0064eeee-0000-4000-8000-000000000001';
alter table public.sale enable trigger sale_immutable_trg;
set role authenticated;
select void_transaction('sale', '0064eeee-0000-4000-8000-000000000001'::uuid, 'corregir')
  is not null as a_void \gset
select record_sale('0064eeee-0000-4000-8000-000000000002'::uuid, :'loc'::uuid,
  public._sl64(:'var_a'::uuid, 1), null, false, null,
  '0064eeee-0000-4000-8000-000000000001'::uuid) is not null as a_fixed \gset
-- the contrast: the same ten days asked for with no correction to stand on
select record_sale('0064eeee-0000-4000-8000-000000000003'::uuid, :'loc'::uuid,
  public._sl64(:'var_a'::uuid, 1), now() - interval '10 days', true) is not null as a_plain \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('4.1 ⚠️ a manager''s correction of a ten-day-old sale lands ten days back',
  (select occurred_at from public.sale where id = '0064eeee-0000-4000-8000-000000000002')
  = (select occurred_at from public.sale where id = '0064eeee-0000-4000-8000-000000000001')
  and (select occurred_at from public.sale where id = '0064eeee-0000-4000-8000-000000000002')
    < now() - interval '9 days');
select public.chk('4.2 …which nothing else allows: the same ten days without a correction stops at 72 hours',
  (select occurred_at from public.sale where id = '0064eeee-0000-4000-8000-000000000003')
    between now() - interval '72 hours 1 minute' and now() - interval '71 hours 59 minutes');

-- ===================================== 5. a delivery and a write-off ========
select set_config('request.jwt.claims', :jwt_owner, false);
set role authenticated;
select record_purchase('0064ffff-0000-4000-8000-000000000001'::uuid, :'loc'::uuid, :'prov'::uuid,
  public._pl64(:'var_p'::uuid, 20, 5.00), :yesterday, true) is not null as p_orig \gset
select void_transaction('purchase', '0064ffff-0000-4000-8000-000000000001'::uuid, 'corregir')
  is not null as p_void \gset
select record_purchase('0064ffff-0000-4000-8000-000000000002'::uuid, :'loc'::uuid, :'prov'::uuid,
  public._pl64(:'var_p'::uuid, 12, 5.00), null, false, null,
  '0064ffff-0000-4000-8000-000000000001'::uuid) is not null as p_fixed \gset
reset role;
-- the write-off: the cashier dates it *Ayer* online (0057 keeps it), undoes it
-- and re-keys it with no date at all
select set_config('request.jwt.claims', :jwt_staff, false);
set role authenticated;
select record_waste('0064ffff-0000-4000-8000-000000000003'::uuid, :'loc'::uuid,
  public._wl64(:'var_w'::uuid, 4), :yesterday, false) is not null as w_orig \gset
select void_transaction('waste', '0064ffff-0000-4000-8000-000000000003'::uuid, 'corregir')
  is not null as w_void \gset
select record_waste('0064ffff-0000-4000-8000-000000000004'::uuid, :'loc'::uuid,
  public._wl64(:'var_w'::uuid, 3), null, false, null,
  '0064ffff-0000-4000-8000-000000000003'::uuid) is not null as w_fixed \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('5.1 a corrected DELIVERY takes its original''s instant',
  (select occurred_at from public.purchase where id = '0064ffff-0000-4000-8000-000000000002')
  = (select occurred_at from public.purchase where id = '0064ffff-0000-4000-8000-000000000001'));
select public.chk('5.2 …and product_purchases_daily puts all three documents on yesterday: 20 − 20 + 12',
  (select purchases_qty_base from public.product_purchases_daily
    where variant_id = :'var_p' and day = (:yesterday at time zone :'tz')::date) = 12
  and (select purchase_line_count from public.product_purchases_daily
    where variant_id = :'var_p' and day = (:yesterday at time zone :'tz')::date) = 3
  and not exists (select 1 from public.product_purchases_daily
    where variant_id = :'var_p' and day = (now() at time zone :'tz')::date),
  (select string_agg(day || ': ' || purchases_qty_base, ', ' order by day)
     from public.product_purchases_daily where variant_id = :'var_p'));
select public.chk('5.3 a corrected WRITE-OFF takes its original''s instant, though re-keyed with no date',
  (select occurred_at from public.waste where id = '0064ffff-0000-4000-8000-000000000004')
  = (select occurred_at from public.waste where id = '0064ffff-0000-4000-8000-000000000003'));
select public.chk('5.4 …and product_waste_daily puts it on yesterday: 4 − 4 + 3, nothing today',
  (select waste_qty_base from public.product_waste_daily
    where variant_id = :'var_w' and day = (:yesterday at time zone :'tz')::date) = 3
  and not exists (select 1 from public.product_waste_daily
    where variant_id = :'var_w' and day = (now() at time zone :'tz')::date
      and waste_movement_count > 0));

-- ======================== 6. a DELETION of yesterday's sale ================
-- The blind spot 8g's audit measured: Friday's $45 sale deleted on Monday put
-- Monday at −$45. No re-record here — only the void.
select set_config('request.jwt.claims', :jwt_staff, false);
set role authenticated;
select record_sale('0064abab-0000-4000-8000-000000000001'::uuid, :'loc'::uuid,
  public._sl64(:'var_x'::uuid, 1, 45.00), :yesterday, true) is not null as x_orig \gset
select void_transaction('sale', '0064abab-0000-4000-8000-000000000001'::uuid, 'eliminar')
  is not null as x_void \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('6.1 ⚠️ the deleted sale''s day nets to zero, and TODAY carries none of it',
  (select qty_base_sold from public.product_velocity_daily
    where variant_id = :'var_x' and day = (:yesterday at time zone :'tz')::date) = 0
  and (select revenue_gross from public.product_velocity_daily
    where variant_id = :'var_x' and day = (:yesterday at time zone :'tz')::date) = 0
  and (select line_count from public.product_velocity_daily
    where variant_id = :'var_x' and day = (:yesterday at time zone :'tz')::date) = 2
  and coalesce((select line_count from public.product_velocity_daily
    where variant_id = :'var_x' and day = (now() at time zone :'tz')::date), 0) = 0,
  (select string_agg(day || ': ' || revenue_gross || ' in ' || line_count, ', ' order by day)
     from public.product_velocity_daily where variant_id = :'var_x' and line_count > 0));
select public.chk('6.2 …while the ledger keeps the real timeline: the void is dated today',
  ((select occurred_at from public.sale where reversal_of = '0064abab-0000-4000-8000-000000000001')
     at time zone :'tz')::date = (now() at time zone :'tz')::date);
select public.chk('6.3 …and transaction_export files the void on the day it was made',
  (select bool_and(day = (now() at time zone :'tz')::date) from public.transaction_export
    where kind = 'sale' and reversal_of = '0064abab-0000-4000-8000-000000000001'));

-- ---------------------------------------------------------------- verdict ---
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 22 then
    raise exception 'expected 22 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
