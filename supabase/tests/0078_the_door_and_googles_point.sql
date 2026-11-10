-- ============================================================================
-- 0078 — the door Itacate reads, and the point each kitchen is drawn at
-- (`10.5-i-b-i`, the owner's ruling of 2026-11-04, night). Every call is made AS THE
-- PERSON, under `set role authenticated` with her claims; what is read back is read
-- as postgres, because that is what the database holds.
--
-- Section 1 the shape, and the nightly job. Section 2 Google's point written —
-- every refusal, then the one way in. Section 3 nothing else writes it, and a new
-- address clears it. Section 4 the 29-day clean-up. Section 5 the door, as a
-- neighbour who belongs to nothing and as a kitchen's owner. Section 6 ⚠️ THE CENSUS:
-- Google's point is handed out, never filtered, sorted or counted on (ToS
-- 3.2.3(c)(iv)).
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK. Listings in the past are written as postgres,
-- straight into the tables: `publish_listing` writes only windows that have not
-- ended, and the summary is about weeks gone by.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

begin;

create table public._verify (n serial, label text, passed boolean, detail text);

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

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

-- What the door answered, per caller, for the read-back.
create table public._door (who text primary key, body jsonb);
grant all on public._door to authenticated;

\set fonda    '''0078aaaa-0000-4000-8000-000000000001'''
\set fonda2   '''0078aaaa-0000-4000-8000-000000000002'''
\set fonda3   '''0078aaaa-0000-4000-8000-000000000003'''
\set fonda4   '''0078aaaa-0000-4000-8000-000000000004'''
\set fonda5   '''0078aaaa-0000-4000-8000-000000000005'''
\set gerente  '''0078aaaa-0000-4000-8000-000000000006'''
\set tendera  '''0078aaaa-0000-4000-8000-000000000007'''
\set vecina   '''0078aaaa-0000-4000-8000-000000000008'''
\set l_now    '''0078bbbb-0000-4000-8000-000000000001'''
\set l_k4     '''0078bbbb-0000-4000-8000-000000000002'''
\set l_k5     '''0078bbbb-0000-4000-8000-000000000003'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:fonda,   'fonda.0078@example.mx',   jsonb_build_object('full_name', 'Fonda 0078')),
  (:fonda2,  'fonda2.0078@example.mx',  jsonb_build_object('full_name', 'Fonda Dos 0078')),
  (:fonda3,  'fonda3.0078@example.mx',  jsonb_build_object('full_name', 'Fonda Tres 0078')),
  (:fonda4,  'fonda4.0078@example.mx',  jsonb_build_object('full_name', 'Fonda Cuatro 0078')),
  (:fonda5,  'fonda5.0078@example.mx',  jsonb_build_object('full_name', 'Fonda Cinco 0078')),
  (:gerente, 'gerente.0078@example.mx', jsonb_build_object('full_name', 'Gerente 0078')),
  (:tendera, 'tendera.0078@example.mx', jsonb_build_object('full_name', 'Tendera 0078')),
  (:vecina,  'vecina.0078@example.mx',  jsonb_build_object('full_name', 'Vecina 0078'));

-- Each business made as its app makes it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Uno 0078', p_kind => 'cocina') as k1 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda2), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Cocina Callada 0078', p_kind => 'cocina') as k2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda3), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Cocina Vieja 0078', p_kind => 'cocina') as k3 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda4), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Cocina Retirada 0078', p_kind => 'cocina') as k4 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda5), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Cocina Cerrada 0078', p_kind => 'cocina') as k5 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace('Tienda 0078') as t1 \gset
reset role;

select id as loc1 from public.location where workspace_id = :'k1' \gset
select id as loc2 from public.location where workspace_id = :'k2' \gset
select id as loc3 from public.location where workspace_id = :'k3' \gset
select id as loc4 from public.location where workspace_id = :'k4' \gset
select id as loc5 from public.location where workspace_id = :'k5' \gset
select id as loct from public.location where workspace_id = :'t1' \gset

-- A manager in the first kitchen (Wera Cocina has no team; the database allows one).
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'k1', :gerente, 'manager', 'Gerente 0078');

-- Her address, her own pin, her page — and what she has on offer now.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public.set_store_address(:'loc1', 'Durango', '220', 'Roma Norte', 'Ciudad de México', '06700') is null as addressed \gset
select public.set_kitchen_page(:'k1', '{"sentence": "Comida casera", "color": "mole"}'::jsonb) is not null as paged \gset
select public.publish_listing(:l_now, :'loc1', now() + interval '1 hour', now() + interval '3 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 4, "tags": ["pica"]},
    {"name": "Bolsa de pan", "unit_price": "45.00", "quantity": 2, "surprise": true, "usual_price": "90.00"}]'::jsonb) is not null as published \gset
reset role;

-- Weeks gone by, in the first kitchen: 3, 10, 20 and 40 days ago, each at 13:00 in her zone.
insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, created_at)
select gen_random_uuid(), :'k1', :'loc1',
       ((now() at time zone 'America/Mexico_City')::date - d + time '13:00') at time zone 'America/Mexico_City',
       ((now() at time zone 'America/Mexico_City')::date - d + time '15:00') at time zone 'America/Mexico_City',
       :fonda, now() - make_interval(days => d)
  from unnest(array[3, 10, 20, 40]) d;
insert into public.listing_line (id, listing_id, workspace_id, location_id, line_no, name, unit_price, quantity)
select gen_random_uuid(), li.id, li.workspace_id, li.location_id, 1,
       case when li.created_at < now() - interval '30 days' then 'Pozole viejo' else 'comida   CORRIDA' end,
       case when li.created_at < now() - interval '15 days' then 60.00 else 65.00 end, 3
  from public.listing li where li.workspace_id = :'k1' and li.id <> :l_now;

-- The quiet kitchen: one publication 5 days ago, its window long over.
insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, created_at)
values (gen_random_uuid(), :'k2', :'loc2', now() - interval '5 days', now() - interval '5 days' + interval '2 hours',
        :fonda2, now() - interval '5 days');
-- The old kitchen: nothing in the last 14 days.
insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, created_at)
values (gen_random_uuid(), :'k3', :'loc3', now() - interval '20 days', now() - interval '20 days' + interval '2 hours',
        :fonda3, now() - interval '20 days');
-- A shop's publication written past every door: the door shows kitchens only.
insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, created_at)
values (gen_random_uuid(), :'t1', :'loct', now() + interval '1 hour', now() + interval '3 hours', :tendera, now());

-- The fourth kitchen published today and took it down.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda4), true);
set local role authenticated;
select public.publish_listing(:l_k4, :'loc4', now() + interval '1 hour', now() + interval '2 hours',
  '[{"name": "Tamales", "unit_price": "20.00", "quantity": 10}]'::jsonb) is not null as k4_published \gset
select public.withdraw_listing(:l_k4) is not null as k4_withdrawn \gset
reset role;

-- The fifth kitchen has something on offer, and is no longer active.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda5), true);
set local role authenticated;
select public.publish_listing(:l_k5, :'loc5', now() + interval '1 hour', now() + interval '2 hours',
  '[{"name": "Caldo", "unit_price": "50.00", "quantity": 5}]'::jsonb) is not null as k5_published \gset
reset role;
update public.workspace set is_active = false where id = :'k5';

-- What a kitchen's Google point is, as postgres reads it.
create function public._point(p_location uuid)
returns text language sql as $$
  select coalesce(google_place_id, '-') || ' ' || coalesce(google_lat::text, '-') || ' '
         || coalesce(google_lng::text, '-') || ' ' || coalesce(google_at::text, '-')
    from public.location where id = p_location
$$;

-- ---- 1. the shape ---------------------------------------------------------------------
select public.chk('1.1 the door: on_offer_now(), no argument, answering jsonb; security definer with an empty search_path',
  (select pg_get_function_identity_arguments(p.oid) = '' and p.prorettype = 'jsonb'::regtype
          and p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.on_offer_now()'::regprocedure));
select public.chk('1.2 a signed-in person may ask the door, and nobody signed out',
  has_function_privilege('authenticated', 'public.on_offer_now()', 'execute')
  and not has_function_privilege('anon', 'public.on_offer_now()', 'execute'));
select public.chk('1.3 the write: set_google_point(p_location_id, p_lat, p_lng, p_place_id), the ID optional; a signed-in person may call it, nobody signed out',
  (select pg_get_function_identity_arguments(p.oid) = 'p_location_id uuid, p_lat numeric, p_lng numeric, p_place_id text'
          and p.pronargdefaults = 1 and p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.set_google_point(uuid, numeric, numeric, text)'::regprocedure)
  and has_function_privilege('authenticated', 'public.set_google_point(uuid, numeric, numeric, text)', 'execute')
  and not has_function_privilege('anon', 'public.set_google_point(uuid, numeric, numeric, text)', 'execute'));
select public.chk('1.4 the clean-up is granted to nobody who signs in',
  not has_function_privilege('authenticated', 'public.forget_old_google_points()', 'execute')
  and not has_function_privilege('anon', 'public.forget_old_google_points()', 'execute'));
select public.chk('1.5 ⚠️ the nightly job is scheduled: forget-old-google-points, 09:17 UTC every day, active, calling the clean-up',
  exists (select 1 from cron.job
           where jobname = 'forget-old-google-points' and schedule = '17 9 * * *' and active
             and command = 'select public.forget_old_google_points()'),
  coalesce((select string_agg(jobname || ' ' || schedule || ' ' || command, '; ') from cron.job), 'no job'));

-- ---- 2. Google's point written: every refusal, then the one way in ---------------------
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.42, -99.16)', :'loc1')) as w_nobody \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.42, -99.16)', :'loc1')) as w_vecina \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.42, -99.16)', :'loc1')) as w_gerente \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda2), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.42, -99.16)', :'loc1')) as w_other \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.42, -99.16)', :'loct')) as w_shop \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 0, 0)', :'loc1')) as w_zero \gset
select public._try(format('select public.set_google_point(%L, 91, -99.16)', :'loc1')) as w_lat \gset
select public._try(format('select public.set_google_point(%L, null, -99.16)', :'loc1')) as w_null \gset
reset role;
select public.chk('2.1 no person in the token: 42501, and no point written',
  :'w_nobody' = '42501' and public._point(:'loc1') = '- - - -', :'w_nobody');
select public.chk('2.2 a neighbour, a manager of the kitchen and another kitchen''s owner: TD012 each — only its owner writes it',
  :'w_vecina' = 'TD012' and :'w_gerente' = 'TD012' and :'w_other' = 'TD012' and public._point(:'loc1') = '- - - -',
  :'w_vecina' || ' ' || :'w_gerente' || ' ' || :'w_other');
select public.chk('2.3 a shop''s owner, her shop''s place: TD013 — only a kitchen is drawn on Itacate''s map',
  :'w_shop' = 'TD013' and public._point(:'loct') = '- - - -', :'w_shop');
select public.chk('2.4 not a point — 0,0, a latitude off the map, a missing one: 22023 each',
  :'w_zero' = '22023' and :'w_lat' = '22023' and :'w_null' = '22023' and public._point(:'loc1') = '- - - -',
  :'w_zero' || ' ' || :'w_lat' || ' ' || :'w_null');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.4183291, -99.1626744, %L)', :'loc1', '  ChIJ-uno-0078  ')) as w_k1 \gset
select public.set_store_pin(:'loc1', 19.418500, -99.162500, null) is null as pinned \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda2), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.4300001, -99.1500004)', :'loc2')) as w_k2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda4), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.4000000, -99.1000000, %L)', :'loc4', 'ChIJ-cuatro')) as w_k4 \gset
reset role;
select public.chk('2.5 her kitchen''s owner: written — six decimals, the ID trimmed, stamped now (not a date the phone sends)',
  :'w_k1' = 'ok' and public._point(:'loc1') = format('ChIJ-uno-0078 19.418329 -99.162674 %s', now()),
  public._point(:'loc1'));
select public.chk('2.6 with no ID — an address typed without a pick, Geocoding''s point — the point alone is written',
  :'w_k2' = 'ok' and public._point(:'loc2') like '- 19.430000 -99.150000 %', public._point(:'loc2'));

-- ---- 3. nothing else writes it, and a new address clears it ------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('update public.location set google_lat = 19.5 where id = %L', :'loc1')) as d_lat \gset
select public._try(format('update public.location set google_at = now() + interval ''1 year'' where id = %L', :'loc1')) as d_at \gset
select public._try(format('update public.location set google_place_id = null, google_lat = null, google_lng = null, google_at = null where id = %L', :'loc1')) as d_clear \gset
select public._try(format('insert into public.location (workspace_id, name, google_lat, google_lng, google_at) values (%L, %L, 19.4, -99.1, now())', :'k1', 'Otra')) as d_insert \gset
select public.set_store_directions(:'loc1', 'Junto a la farmacia') is null as directed \gset
reset role;
select public.chk('3.1 ⚠️ her own phone, straight through the table: the point, its date or clearing it — refused 42501 each, nothing changed',
  :'d_lat' = '42501' and :'d_at' = '42501' and :'d_clear' = '42501'
  and public._point(:'loc1') = format('ChIJ-uno-0078 19.418329 -99.162674 %s', now()),
  :'d_lat' || ' ' || :'d_at' || ' ' || :'d_clear');
select public.chk('3.2 a place inserted with a point: refused 42501',
  :'d_insert' = '42501' and (select count(*) from public.location where workspace_id = :'k1') = 1, :'d_insert');
select public.chk('3.3 her line of directions changed: the point stays',
  public._point(:'loc1') = format('ChIJ-uno-0078 19.418329 -99.162674 %s', now()), public._point(:'loc1'));

-- The second kitchen moves (its address set for the first time is a change too).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda2), true);
set local role authenticated;
select public.set_store_address(:'loc2', 'Orizaba', '5', 'Roma Norte', 'Ciudad de México', '06700') is null as moved \gset
reset role;
select public.chk('3.4 ⚠️ her address changed: Google''s point and ID cleared — they were Google''s answer for the old one',
  public._point(:'loc2') = '- - - -', public._point(:'loc2'));
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda2), true);
set local role authenticated;
select public._try(format('select public.set_google_point(%L, 19.4211000, -99.1588000)', :'loc2')) as w_k2b \gset
reset role;
select public.chk('3.5 and the new address''s point written after it, as Wera Cocina will',
  :'w_k2b' = 'ok' and public._point(:'loc2') like '- 19.421100 -99.158800 %', public._point(:'loc2'));

-- ---- 4. the clean-up: nothing kept 29 days --------------------------------------------------
select set_config('tienda.writing_google_point', 'on', true);
update public.location set google_at = now() - interval '29 days 1 minute' where id = :'loc4';
update public.location set google_at = now() - interval '28 days' where id = :'loc2';
select set_config('tienda.writing_google_point', '', true);
select public.forget_old_google_points() as cleared \gset
select public.chk('4.1 a point fetched 29 days and a minute ago is cleared, ID and all; one of 28 days stays; it says how many',
  :'cleared' = 1 and public._point(:'loc4') = '- - - -' and public._point(:'loc2') like '- 19.421100 -99.158800 %'
  and public._point(:'loc1') like 'ChIJ-uno-0078 %',
  :'cleared' || ' | ' || public._point(:'loc4') || ' | ' || public._point(:'loc2'));
select public.chk('4.2 the exception it sets is cleared once it is done',
  coalesce(current_setting('tienda.writing_google_point', true), '') = '');
-- The second kitchen's copy put back to a day old, for the door below.
select set_config('tienda.writing_google_point', 'on', true);
update public.location set google_at = now() - interval '1 day' where id = :'loc2';
select set_config('tienda.writing_google_point', '', true);

-- ---- 5. the door ---------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try('select public.on_offer_now()') as door_nobody \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
insert into public._door (who, body) select 'vecina', public.on_offer_now();
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
insert into public._door (who, body) select 'fonda', public.on_offer_now();
reset role;

create function public._kitchen(p_who text, p_id uuid)
returns jsonb language sql as $$
  select k from public._door d, jsonb_array_elements(d.body) k
   where d.who = p_who and k->>'id' = p_id::text
$$;

select public.chk('5.1 no person in the token: 42501',
  :'door_nobody' = '42501', :'door_nobody');
select public.chk('5.2 ⚠️ a neighbour who belongs to nothing sees exactly the kitchens on offer or published in 14 days — not the old one, not the closed one, never a shop',
  (select array_agg(k->>'id' order by k->>'id') from public._door d, jsonb_array_elements(d.body) k where d.who = 'vecina')
  = (select array_agg(x order by x) from unnest(array[:'k1', :'k2', :'k4']::text[]) x),
  (select string_agg(k->>'name', ', ') from public._door d, jsonb_array_elements(d.body) k where d.who = 'vecina'));
select public.chk('5.3 a kitchen''s own owner gets the same answer — the door is not hers to see more through',
  (select body from public._door where who = 'fonda') = (select body from public._door where who = 'vecina'));
select public.chk('5.4 the first kitchen: its name, trade, address and line of directions',
  public._kitchen('vecina', :'k1')->>'name' = 'Fonda Uno 0078'
  and public._kitchen('vecina', :'k1')->'address' = '{"street": "Durango", "street_number": "220", "colonia": "Roma Norte", "city": "Ciudad de México", "postal_code": "06700"}'::jsonb
  and public._kitchen('vecina', :'k1')->>'directions' = 'Junto a la farmacia',
  (public._kitchen('vecina', :'k1') - 'on_offer' - 'summary')::text);
select public.chk('5.5 ⚠️ her own pin wins over Google''s point',
  public._kitchen('vecina', :'k1')->'point' = '{"lat": 19.418500, "lng": -99.162500, "source": "pin"}'::jsonb,
  (public._kitchen('vecina', :'k1')->'point')::text);
select public.chk('5.6 with no pin of hers, Google''s point while fresh; with a copy cleared, no point at all',
  public._kitchen('vecina', :'k2')->'point' = '{"lat": 19.421100, "lng": -99.158800, "source": "google"}'::jsonb
  and public._kitchen('vecina', :'k4')->'point' = 'null'::jsonb,
  (public._kitchen('vecina', :'k2')->'point')::text || ' | ' || (public._kitchen('vecina', :'k4')->'point')::text);
-- ⚠️ Since `0079` (plan `10.5b-i`) each line also carries how it may be eaten — a kitchen
-- with no page is para llevar only — and each offer its desechable; nothing is reserved
-- here, so what is left is what was offered.
select public.chk('5.7 what is on offer now, line by line in her order, money and quantities as decimal strings; nothing past, nothing withdrawn',
  jsonb_array_length(public._kitchen('vecina', :'k1')->'on_offer') = 1
  and public._kitchen('vecina', :'k1')->'on_offer'->0->>'id' = :l_now
  and public._kitchen('vecina', :'k1')->'on_offer'->0->'container_price' = 'null'::jsonb
  and public._kitchen('vecina', :'k1')->'on_offer'->0->'lines' = '[
        {"line_no": 1, "name": "Comida corrida", "description": null, "tags": ["pica"], "unit_price": "65.00",
         "quantity": "4.000", "surprise": false, "usual_price": null, "image_path": null,
         "para_llevar": true, "para_aqui": false},
        {"line_no": 2, "name": "Bolsa de pan", "description": null, "tags": [], "unit_price": "45.00",
         "quantity": "2.000", "surprise": true, "usual_price": "90.00", "image_path": null,
         "para_llevar": true, "para_aqui": false}]'::jsonb
  and public._kitchen('vecina', :'k2')->'on_offer' = '[]'::jsonb
  and public._kitchen('vecina', :'k4')->'on_offer' = '[]'::jsonb,
  (public._kitchen('vecina', :'k1')->'on_offer')::text);
select public.chk('5.8 her page, as she set it',
  public._kitchen('vecina', :'k1')->'page'->>'sentence' = 'Comida casera'
  and public._kitchen('vecina', :'k1')->'page'->>'color' = 'mole'
  and public._kitchen('vecina', :'k2')->'page' = 'null'::jsonb,
  (public._kitchen('vecina', :'k1')->'page')::text);
select public.chk('5.9 the summary counts four weeks — today''s, 3, 10 and 20 days ago — never the publication of 40 days',
  (select sum(x::int) from jsonb_array_elements_text(public._kitchen('vecina', :'k1')->'summary'->'weekdays') x) = 4
  and jsonb_array_length(public._kitchen('vecina', :'k1')->'summary'->'weekdays') = 7,
  (public._kitchen('vecina', :'k1')->'summary')::text);
select public.chk('5.10 her usual hour is the one most of them start at, in her own zone; her last day the latest',
  (public._kitchen('vecina', :'k1')->'summary'->>'usual_hour')::int = 13
  and public._kitchen('vecina', :'k1')->'summary'->>'last_day'
      = to_char(greatest(now() + interval '1 hour', now() - interval '3 days') at time zone 'America/Mexico_City', 'YYYY-MM-DD'),
  (public._kitchen('vecina', :'k1')->'summary')::text);
select public.chk('5.11 the dish she repeats, however she spelt it: how often, and at its usual price; the one of 40 days ago is not among them',
  public._kitchen('vecina', :'k1')->'summary'->'repeats'->0->>'name' = 'Comida corrida'
  and (public._kitchen('vecina', :'k1')->'summary'->'repeats'->0->>'times')::int = 4
  and public._kitchen('vecina', :'k1')->'summary'->'repeats'->0->>'usual_price' = '65.00'
  and jsonb_array_length(public._kitchen('vecina', :'k1')->'summary'->'repeats') = 1,
  (public._kitchen('vecina', :'k1')->'summary'->'repeats')::text);
select public.chk('5.12 ⚠️ never a member, a login or who published: no created_by, user_id or member anywhere in the answer',
  (select body::text from public._door where who = 'vecina') !~ ('(created_by|user_id|member|' || :fonda || ')'),
  left((select body::text from public._door where who = 'vecina'), 120));

-- ---- 6. ⚠️ THE CENSUS: Google's point handed out, never filtered, sorted or counted on ---------
select public.chk('6.1 the functions that name google_lat or google_lng are exactly the write, the guard, the clean-up and the door',
  (select array_agg(p.proname::text order by p.proname) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosrc ~ 'google_l(at|ng)' and p.proname !~ '^_')
  = array['forget_old_google_points', 'location_google_point_guard', 'on_offer_now', 'set_google_point']::text[],
  (select string_agg(p.proname, ', ' order by p.proname) from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosrc ~ 'google_l(at|ng)' and p.proname !~ '^_'));
select public.chk('6.2 ⚠️ in the door, google_lat and google_lng appear ONLY in the one point it hands out — never in a where, an order, a group or a count',
  (select regexp_count(prosrc, 'google_l(at|ng)') from pg_proc where oid = 'public.on_offer_now()'::regprocedure) = 2
  and (select prosrc like '%jsonb_build_object(''lat'', l.google_lat, ''lng'', l.google_lng, ''source'', ''google'') as google_point%'
         from pg_proc where oid = 'public.on_offer_now()'::regprocedure));
select public.chk('6.3 no view, and no index, names Google''s point',
  not exists (select 1 from pg_views where schemaname = 'public' and definition ~ 'google_l(at|ng)')
  and not exists (select 1 from pg_indexes where schemaname = 'public' and indexdef ~ 'google_l(at|ng)'));

-- ---- the report ------------------------------------------------------------------------------------
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 33 then
    raise exception 'expected 33 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
