-- ============================================================================
-- 0059 — Te lo compro: who may ask, what a request may say, who may read and
-- cancel it. Plan task `8j`, the owner's rulings of 2026-10-16.
--
-- ⚠️ EVERY CALL IS DRIVEN UNDER `set role authenticated` WITH A MEMBER'S CLAIMS
-- — as the superuser the role fence would pass vacuously. The fixture's own
-- address writes are the superuser's, because the claim under test is the
-- request path, not who may move a store (that is `0058`'s suite).
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
-- Fixtures: shop A (owner, manager, cashier), shop B's owner, one product each
-- ----------------------------------------------------------------------------
\set owner '''0059aaaa-0000-4000-8000-000000000001'''
\set mgr   '''0059aaaa-0000-4000-8000-000000000002'''
\set staff '''0059aaaa-0000-4000-8000-000000000003'''
\set otro  '''0059aaaa-0000-4000-8000-000000000004'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0059@example.mx',   jsonb_build_object('full_name', 'Dueña 0059')),
  (:mgr,   'gerente.0059@example.mx', jsonb_build_object('full_name', 'Gerente 0059')),
  (:staff, 'cajera.0059@example.mx',  jsonb_build_object('full_name', 'Cajera 0059')),
  (:otro,  'otro.0059@example.mx',    jsonb_build_object('full_name', 'Otro 0059'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Pollería 0059') as ws \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
select onboard_workspace('Otra 0059') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc   from public.location where workspace_id = :'ws'   \gset
select id as loc_b from public.location where workspace_id = :'ws_b' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws', :mgr,   'manager', 'Gerente 0059'),
  (:'ws', :staff, 'staff',   'Cajera 0059');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', wm.id, :'loc' from public.workspace_member wm
   where wm.workspace_id = :'ws' and wm.user_id in (:mgr, :staff);

insert into public.product_family (workspace_id, name) values (:'ws', 'Pollo 0059'), (:'ws_b', 'Otra 0059');
select id as fam   from public.product_family where workspace_id = :'ws'   \gset
select id as fam_b from public.product_family where workspace_id = :'ws_b' \gset
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws',   :'fam',   'Pechuga 0059', 'g', 'kg', 'kg', 'kg'),
  (:'ws_b', :'fam_b', 'Ajena 0059',   'pza', 'pza', 'pza', 'pza');
select id as var   from public.product_variant where workspace_id = :'ws'   \gset
select id as var_b from public.product_variant where workspace_id = :'ws_b' \gset

-- One good line, and a call that varies one thing at a time.
create function public._cl(p_variant uuid, p_condition text default 'por caducar',
                           p_qty text default '2.5')
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'variant_id', p_variant, 'qty_display', p_qty, 'qty_display_unit', 'kg',
    'condition', p_condition, 'packaging', 'cerrado', 'keeping', 'refrigerado',
    'expiry_date', '2026-10-20'));
$$;
grant execute on function public._cl(uuid, text, text) to authenticated;

create function public._req(p_id text, p_loc uuid, p_lines jsonb,
                            p_day text default 'tomorrow', p_from text default '09:00',
                            p_to text default '09:15', p_photos text default '{}')
returns text language sql as $$
  select public._try(format(
    'select request_collection(%L, %L, %s, %L, %L, %L::jsonb, %L::text[])',
    p_id, p_loc,
    case p_day when 'tomorrow' then 'current_date + 1' when 'yesterday' then 'current_date - 1'
               when 'far' then 'current_date + 15' else quote_literal(p_day) || '::date' end,
    p_from, p_to, p_lines, p_photos));
$$;
grant execute on function public._req(text, uuid, jsonb, text, text, text, text) to authenticated;

\set r1 '''0059bbbb-0000-4000-8000-000000000001'''
\set r2 '''0059bbbb-0000-4000-8000-000000000002'''
\set rx '''0059bbbb-0000-4000-8000-0000000000ff'''

-- ----------------------------------------------------------------------------
-- 1. The table: read by a select policy, written by nobody directly
-- ----------------------------------------------------------------------------
select public.chk('1.1 collection_request has RLS on, and a signed-in person may only SELECT it',
  (select relrowsecurity from pg_class where oid = 'public.collection_request'::regclass)
  and has_table_privilege('authenticated', 'public.collection_request', 'select')
  and not has_table_privilege('authenticated', 'public.collection_request', 'insert')
  and not has_table_privilege('authenticated', 'public.collection_request', 'update')
  and not has_table_privilege('authenticated', 'public.collection_request', 'delete'));
select public.chk('1.2 ⚠️ it goes with its shop: both keys cascade, so a sole owner''s purge takes it',
  (select bool_and(confdeltype = 'c') from pg_constraint
    where conrelid = 'public.collection_request'::regclass and contype = 'f')
  and (select count(*) = 2 from pg_constraint
        where conrelid = 'public.collection_request'::regclass and contype = 'f'));

-- ----------------------------------------------------------------------------
-- 2. The address and the area come first
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._req(:r1, :'loc', public._cl(:'var')) as no_address \gset
reset role;
select public.chk('2.1 ⚠️ a store with no address is refused — TD008', :'no_address' = 'TD008', :'no_address');

update public.location set street = 'Sabino', street_number = '120', city = 'Ciudad de México',
       postal_code = '06500' where id = :'loc';
set role authenticated;
select public._req(:r1, :'loc', public._cl(:'var')) as outside \gset
reset role;
select public.chk('2.2 ⚠️ a store outside the area is refused — TD009', :'outside' = 'TD009', :'outside');

update public.location set postal_code = '06400', colonia = 'Santa María la Ribera' where id = :'loc';

-- ----------------------------------------------------------------------------
-- 3. Who may ask — the owner's ruling: owners and managers
-- ----------------------------------------------------------------------------
set role authenticated;
select public._req(:r1, :'loc', public._cl(:'var')) as by_owner \gset
select public._req(:r1, :'loc', public._cl(:'var')) as retried \gset
reset role;
select public.chk('3.1 the owner asks, and it is enviada with the store''s address on it',
  :'by_owner' = 'ok' and (select status = 'enviada' and postal_code = '06400'
     and street = 'Sabino' and colonia = 'Santa María la Ribera'
     from public.collection_request where id = :r1), :'by_owner');
select public.chk('3.2 the line is stored validated — the name copied in, the quantity a number',
  (select lines->0->>'variant_name' = 'Pechuga 0059'
          and (lines->0->>'qty_display')::numeric = 2.5
          and lines->0->>'expiry_date' = '2026-10-20'
          and lines->0->>'condition' = 'por caducar'
     from public.collection_request where id = :r1));
select public.chk('3.3 the same request sent again is that request, not a second one',
  :'retried' = 'ok' and (select count(*) = 1 from public.collection_request where id = :r1));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mgr), false);
set role authenticated;
select public._req(:r2, :'loc', public._cl(:'var', 'magullado')) as by_mgr \gset
reset role;
select public.chk('3.4 a manager asks', :'by_mgr' = 'ok', :'by_mgr');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), false);
set role authenticated;
select public._req(:rx, :'loc', public._cl(:'var')) as by_staff \gset
reset role;
select public.chk('3.5 ⚠️ a cashier may not — 42501, and nothing is written',
  :'by_staff' = '42501' and not exists (select 1 from public.collection_request where id = :rx),
  :'by_staff');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
set role authenticated;
select public._req(:rx, :'loc', public._cl(:'var')) as by_other \gset
reset role;
select public.chk('3.6 ⚠️ nor another shop''s owner at this store — 42501', :'by_other' = '42501', :'by_other');

-- ----------------------------------------------------------------------------
-- 4. What a request may say
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._req(:rx, :'loc', public._cl(:'var'), 'tomorrow', '06:45', '08:00') as early \gset
select public._req(:rx, :'loc', public._cl(:'var'), 'tomorrow', '09:10', '10:00') as off_quarter \gset
select public._req(:rx, :'loc', public._cl(:'var'), 'tomorrow', '18:00', '19:15') as late \gset
select public._req(:rx, :'loc', public._cl(:'var'), 'tomorrow', '10:00', '10:00') as empty_window \gset
select public._req(:rx, :'loc', public._cl(:'var'), 'yesterday') as past \gset
select public._req(:rx, :'loc', public._cl(:'var'), 'far') as too_far \gset
select public._req(:rx, :'loc', public._cl(:'var', 'podrido')) as bad_condition \gset
select public._req(:rx, :'loc', public._cl(:'var', 'bueno', '0')) as zero_qty \gset
select public._req(:rx, :'loc', public._cl(:'var', 'bueno', 'dos')) as word_qty \gset
select public._req(:rx, :'loc', public._cl(:'var_b')) as foreign_product \gset
select public._req(:rx, :'loc', '[{"variant_id":"no-es-un-id","qty_display":"1","condition":"bueno","packaging":"cerrado","keeping":"ambiente"}]'::jsonb) as bad_id \gset
select public._req(:rx, :'loc', '[]'::jsonb) as no_lines \gset
select public._req(:rx, :'loc', public._cl(:'var'), 'tomorrow', '09:00', '10:30',
                   '{otra-tienda/foto.jpg}') as bad_photo \gset
select public._req(:rx, :'loc', public._cl(:'var'), 'tomorrow', '07:00', '07:15',
                   format('{%s/%s/uno.jpg}', :'ws', :rx)) as good_photo \gset
reset role;

select public.chk('4.1 ⚠️ the window is 7:00 to 19:00 in quarters of an hour — each wrong one is 22023',
  :'early' = '22023' and :'off_quarter' = '22023' and :'late' = '22023' and :'empty_window' = '22023',
  concat_ws(' ', :'early', :'off_quarter', :'late', :'empty_window'));
select public.chk('4.2 the day is from today to two weeks out — yesterday and fifteen days are 22023',
  :'past' = '22023' and :'too_far' = '22023', :'past' || ' ' || :'too_far');
select public.chk('4.3 a line must say what it is: a condition from the list, a positive quantity',
  :'bad_condition' = '22023' and :'zero_qty' = '22023' and :'word_qty' = '22023',
  concat_ws(' ', :'bad_condition', :'zero_qty', :'word_qty'));
select public.chk('4.4 ⚠️ another shop''s product, a malformed id, or no lines at all — 22023, never a raw cast error',
  :'foreign_product' = '22023' and :'bad_id' = '22023' and :'no_lines' = '22023',
  concat_ws(' ', :'foreign_product', :'bad_id', :'no_lines'));
select public.chk('4.5 ⚠️ a photo path must be this shop''s and this request''s — and one that is, is kept',
  :'bad_photo' = '22023' and :'good_photo' = 'ok'
  and (select photos[1] = format('%s/%s/uno.jpg', :'ws', :rx)
         from public.collection_request where id = :rx),
  :'bad_photo' || ' ' || :'good_photo');

-- ----------------------------------------------------------------------------
-- 5. Who may read
-- ----------------------------------------------------------------------------
create function public._seen(p_user uuid) returns integer language plpgsql as $$
declare v integer;
begin
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), false);
  execute 'set role authenticated';
  select count(*) into v from public.collection_request;
  execute 'reset role';
  return v;
end;
$$;
select public._seen(:owner) as seen_owner, public._seen(:mgr) as seen_mgr,
       public._seen(:staff) as seen_staff, public._seen(:otro) as seen_other \gset
select public.chk('5.1 the owner and the manager read the shop''s three requests',
  :'seen_owner'::int = 3 and :'seen_mgr'::int = 3, :'seen_owner' || ' ' || :'seen_mgr');
select public.chk('5.2 ⚠️ a cashier reads none, and another shop''s owner reads none',
  :'seen_staff'::int = 0 and :'seen_other'::int = 0, :'seen_staff' || ' ' || :'seen_other');

-- ----------------------------------------------------------------------------
-- 6. Calling it off
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), false);
set role authenticated;
select public._try(format('select cancel_collection_request(%L)', :r2)) as cancel_staff \gset
reset role;
select status as after_staff from public.collection_request where id = :r2 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mgr), false);
set role authenticated;
select public._try(format('select cancel_collection_request(%L)', :r2)) as cancel_mgr \gset
select public._try(format('select cancel_collection_request(%L)', :r2)) as cancel_again \gset
reset role;
update public.collection_request set status = 'confirmada' where id = :r1;
set role authenticated;
select public._try(format('select cancel_collection_request(%L)', :r1)) as cancel_confirmed \gset
reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('6.1 ⚠️ a cashier cannot call one off — 42501, and it stands',
  :'cancel_staff' = '42501' and :'after_staff' = 'enviada', :'cancel_staff');
select public.chk('6.2 a manager calls it off, and calling it off again is not an error',
  :'cancel_mgr' = 'ok' and :'cancel_again' = 'ok'
  and (select status from public.collection_request where id = :r2) = 'cancelada',
  :'cancel_mgr' || ' ' || :'cancel_again');
select public.chk('6.3 ⚠️ once Wera has confirmed it, the shop cannot — TD010, and it stays confirmada',
  :'cancel_confirmed' = 'TD010'
  and (select status from public.collection_request where id = :r1) = 'confirmada',
  :'cancel_confirmed');

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
  if (select count(*) from public._verify) <> 20 then
    raise exception 'expected 20 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
