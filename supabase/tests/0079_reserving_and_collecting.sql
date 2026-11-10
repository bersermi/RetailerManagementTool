-- ============================================================================
-- 0079 — reserving and collecting (`10.5b-i`; slice 3's design, ruled 2026-11-05
-- and 2026-11-06; the deletions and three at a time, ruled 2026-11-10). Every call
-- is made AS THE PERSON, under `set role authenticated` with her claims; what is
-- read back afterwards is read as postgres, because the claim is what the
-- database holds.
--
-- Section 1 the shape: the tables, their walls, who may call what. Section 2 the
-- kitchen's settings. Section 3 publishing: each line's ways, the desechable
-- copied. Section 4 reserving, and every refusal. Section 5 the door: what is left.
-- Section 6 her own reservations. Section 7 cancelling. Section 8 handing over
-- and *Ya lo tengo*. Section 9 − and +. Section 10 the fonda's read. Section 11
-- *Ya se terminó* keeps the reservations. Section 12 the deletions.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, so `now()` is one moment throughout: every
-- window and hour is set from the current quarter (`:q0`), and a window that has
-- ended is made by writing its moment as postgres. A refused call is made through
-- `_try`, whose handler undoes whatever the call began.
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

-- What a successful call answered, kept for the read-back.
create table public._answer (who text primary key, body jsonb);
grant all on public._answer to authenticated;

create function public._call_as_me(p_who text, p_sql text)
returns text language plpgsql as $$
declare v_body jsonb;
begin
  execute p_sql into v_body;
  insert into public._answer (who, body) values (p_who, v_body);
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._call_as_me(text, text) to authenticated;

-- A text answer (a state), kept the same way.
create function public._say_as_me(p_who text, p_sql text)
returns text language plpgsql as $$
declare v_said text;
begin
  execute p_sql into v_said;
  insert into public._answer (who, body) values (p_who, to_jsonb(v_said));
  return v_said;
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._say_as_me(text, text) to authenticated;

-- The door, as one person sees it, and one kitchen in it.
create table public._door (who text primary key, body jsonb);
grant all on public._door to authenticated;
create function public._look(p_who text)
returns void language plpgsql as $$
begin
  delete from public._door where who = p_who;
  insert into public._door (who, body) values (p_who, public.on_offer_now());
end;
$$;
grant execute on function public._look(text) to authenticated;
create function public._kitchen(p_who text, p_id uuid)
returns jsonb language sql as $$
  select k from public._door d, jsonb_array_elements(d.body) k
   where d.who = p_who and (k ->> 'id')::uuid = p_id
$$;
create function public._dish(p_who text, p_kitchen uuid, p_listing uuid, p_line int)
returns jsonb language sql as $$
  select l from jsonb_array_elements(public._kitchen(p_who, p_kitchen) -> 'on_offer') o,
                jsonb_array_elements(o -> 'lines') l
   where (o ->> 'id')::uuid = p_listing and (l ->> 'line_no')::int = p_line
$$;
create function public._state(p_id uuid)
returns text language sql as $$
  select public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at, r.held_until, r.pickup_at)
    from public.reservation r where r.id = p_id
$$;

\set mari    '''0079aaaa-0000-4000-8000-000000000001'''
\set cook    '''0079aaaa-0000-4000-8000-000000000002'''
\set otra    '''0079aaaa-0000-4000-8000-000000000003'''
\set tendera '''0079aaaa-0000-4000-8000-000000000004'''
\set vecina  '''0079aaaa-0000-4000-8000-000000000005'''
\set vecina2 '''0079aaaa-0000-4000-8000-000000000006'''
\set vecina3 '''0079aaaa-0000-4000-8000-000000000007'''
\set antes   '''0079aaaa-0000-4000-8000-000000000008'''
\set lm      '''0079bbbb-0000-4000-8000-000000000001'''
\set lm2     '''0079bbbb-0000-4000-8000-000000000002'''
\set lo      '''0079bbbb-0000-4000-8000-000000000003'''
\set lo2     '''0079bbbb-0000-4000-8000-000000000004'''
\set le      '''0079bbbb-0000-4000-8000-000000000005'''
\set lt      '''0079bbbb-0000-4000-8000-000000000006'''
\set lbad    '''0079bbbb-0000-4000-8000-000000000007'''
\set lpast   '''0079bbbb-0000-4000-8000-000000000008'''
\set r1      '''0079cccc-0000-4000-8000-000000000001'''
\set r2      '''0079cccc-0000-4000-8000-000000000002'''
\set r3      '''0079cccc-0000-4000-8000-000000000003'''
\set r4      '''0079cccc-0000-4000-8000-000000000004'''
\set r5      '''0079cccc-0000-4000-8000-000000000005'''
\set r6      '''0079cccc-0000-4000-8000-000000000006'''
\set r7      '''0079cccc-0000-4000-8000-000000000007'''
\set rx      '''0079cccc-0000-4000-8000-0000000000ff'''

-- The current quarter: every window and hour below is set from it.
select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,    'mari.0079@example.mx',    jsonb_build_object('full_name', 'Mari 0079')),
  (:cook,    'cook.0079@example.mx',    jsonb_build_object('full_name', 'Cook 0079')),
  (:otra,    'otra.0079@example.mx',    jsonb_build_object('full_name', 'Otra 0079')),
  (:tendera, 'tendera.0079@example.mx', jsonb_build_object('full_name', 'Tendera 0079')),
  (:vecina,  'vecina.0079@example.mx',  jsonb_build_object('full_name', 'Vecina 0079')),
  (:vecina2, 'vecina2.0079@example.mx', jsonb_build_object('full_name', 'Vecina Dos 0079')),
  (:vecina3, 'vecina3.0079@example.mx', jsonb_build_object('full_name', 'Vecina Tres 0079')),
  (:antes,   'antes.0079@example.mx',   jsonb_build_object('full_name', 'Antes 0079'));

-- Mari's kitchen, made as Wera Cocina makes it, and a cook assigned to it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0079', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :cook, 'staff', 'Cook 0079');
insert into public.member_location (workspace_id, member_id, location_id)
select :'ws_m', wm.id, :'loc_m' from public.workspace_member wm
 where wm.workspace_id = :'ws_m' and wm.user_id = :cook;

-- Otra's kitchen; Tendera's shop.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0079', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace('Abarrotes Tendera 0079') as ws_t \gset
reset role;
select id as loc_t from public.location where workspace_id = :'ws_t' \gset

-- ⚠️ SINCE `0080` (plan `10.5b-ii-b`) a neighbour reserves only after her express yes,
-- and holds one until her first pickup, then three. So each of the three gives her yes
-- and has one plate collected forty days ago, at a kitchen of its own whose one offer
-- was made then — outside her 30 days and the door's 14 — which leaves every count
-- below as it was written. Written as postgres: nobody publishes or reserves in the past.
insert into servicio.neighbour_yes (user_id) values (:vecina), (:vecina2), (:vecina3);
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :antes), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda de Antes 0079', p_kind => 'cocina') as ws_a \gset
reset role;
select id as loc_a from public.location where workspace_id = :'ws_a' \gset
insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, created_at)
values (:lpast, :'ws_a', :'loc_a', now() - interval '40 days', now() - interval '40 days' + interval '3 hours',
        :antes, now() - interval '40 days');
insert into public.reservation
  (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day, held_until,
   payment, eat, created_at, handed_over_at, handed_over_by)
select gen_random_uuid(), :'ws_a', :'loc_a', :lpast, v.buyer, v.code,
       now() - interval '40 days' + interval '1 hour',
       ((now() - interval '40 days' + interval '1 hour') at time zone 'America/Mexico_City')::date,
       now() - interval '40 days' + interval '3 hours', 'efectivo', 'llevar',
       now() - interval '40 days', now() - interval '40 days' + interval '1 hour', :antes
  from (values (:vecina::uuid, 101), (:vecina2::uuid, 102), (:vecina3::uuid, 103)) v(buyer, code);

-- ---- 1. the shape -------------------------------------------------------------
select public.chk('1.1 two tables, each behind row-level security with one select policy, and no write right for anyone signed in or out',
  (select bool_and(c.relrowsecurity) from pg_class c
    where c.oid in ('public.reservation'::regclass, 'public.reservation_line'::regclass))
  and (select count(*) from pg_policies where schemaname = 'public'
         and tablename in ('reservation', 'reservation_line') and cmd = 'SELECT') = 2
  and (select count(*) from pg_policies where schemaname = 'public'
         and tablename in ('reservation', 'reservation_line')) = 2
  and not has_table_privilege('authenticated', 'public.reservation', 'INSERT, UPDATE, DELETE')
  and not has_table_privilege('authenticated', 'public.reservation_line', 'INSERT, UPDATE, DELETE')
  and not has_table_privilege('anon', 'public.reservation', 'SELECT, INSERT, UPDATE, DELETE')
  and not has_table_privilege('anon', 'public.reservation_line', 'SELECT, INSERT, UPDATE, DELETE'));
select public.chk('1.2 ⚠️ who reserved is granted to nobody: every other column of the header is, and the lines whole',
  not has_column_privilege('authenticated', 'public.reservation', 'buyer_id', 'SELECT')
  and has_column_privilege('authenticated', 'public.reservation', 'code', 'SELECT')
  and has_column_privilege('authenticated', 'public.reservation', 'held_until', 'SELECT')
  and has_column_privilege('authenticated', 'public.reservation', 'handed_over_at', 'SELECT')
  and has_table_privilege('authenticated', 'public.reservation_line', 'SELECT')
  and (select count(*) from information_schema.column_privileges
        where table_schema = 'public' and table_name = 'reservation' and grantee = 'authenticated'
          and privilege_type = 'SELECT') = 18);  -- 16 in 0079; 0080 granted cancelled_by and cancel_reason
select public.chk('1.3 the six doors: a signed-in person may call each, nobody signed out',
  (select bool_and(has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.reserve_plate(uuid, uuid, integer, timestamptz, text, text)',
                       'public.my_reservations()', 'public.cancel_my_reservation(uuid)',
                       'public.confirm_my_pickup(uuid)', 'public.hand_over_reservation(uuid, timestamptz)',
                       'public.set_listing_quantity(uuid, integer, numeric)']::regprocedure[]) f));
select public.chk('1.4 the two definitions are granted to nobody who signs in',
  -- 0080 re-created it with a sixth argument, defaulted: who cancelled, for the kitchen's cancel.
  not has_function_privilege('authenticated', 'public.reservation_state(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.listing_line_taken(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.listing_line_taken(uuid)', 'execute'));
select public.chk('1.5 the states, read from the moments: recogido, cancelado, no_va, liberado, apartado',
  public.reservation_state(null, now(), null, now() + interval '1 hour', now()) = 'recogido'
  and public.reservation_state(now(), null, now(), now() + interval '1 hour', now()) = 'recogido'
  and public.reservation_state(now(), null, null, now() + interval '3 hours', now() + interval '2 hours') = 'cancelado'
  and public.reservation_state(now(), null, null, now() + interval '3 hours', now() + interval '1 hour') = 'no_va'
  and public.reservation_state(null, null, null, now(), now() - interval '1 hour') = 'liberado'
  and public.reservation_state(null, null, null, now() + interval '1 minute', now()) = 'apartado');
select public.chk('1.6 the re-created doors keep their signatures and their grants',
  has_function_privilege('authenticated', 'public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.set_kitchen_page(uuid, jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.on_offer_now()', 'execute')
  and has_function_privilege('authenticated', 'public.delete_my_business(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.delete_my_account(text, text[])', 'execute')
  and not has_function_privilege('anon', 'public.on_offer_now()', 'execute'));

-- ---- 2. the kitchen's settings ---------------------------------------------------
select public.chk('2.1 a kitchen with no page reads as cash, para llevar only, no desechable — the columns'' defaults',
  (select column_default from information_schema.columns where table_schema = 'public'
     and table_name = 'kitchen_page' and column_name = 'accepts_card') = 'false'
  and (select column_default from information_schema.columns where table_schema = 'public'
     and table_name = 'kitchen_page' and column_name = 'para_llevar') = 'true'
  and (select column_default from information_schema.columns where table_schema = 'public'
     and table_name = 'kitchen_page' and column_name = 'para_aqui') = 'false'
  and not exists (select 1 from public.kitchen_page where workspace_id = :'ws_m'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('mari-settings', format(
  'select to_jsonb(public.set_kitchen_page(%L, %L::jsonb))', :'ws_m',
  '{"accepts_card": true, "para_aqui": true, "container_price": "5.00"}')) as settings \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m',
  '{"para_llevar": false, "para_aqui": false}')) as no_way \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m',
  '{"container_price": "5.555"}')) as box_bad \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m',
  '{"accepts_card": "yes"}')) as card_text \gset
select public._call_as_me('mari-sentence', format(
  'select to_jsonb(public.set_kitchen_page(%L, %L::jsonb))', :'ws_m', '{"sentence": "Comida casera"}')) as sentence \gset
reset role;
select public.chk('2.2 the owner turns on card and para comer aquí, and states the desechable at $5.00 — cash and para llevar stay on',
  :'settings' = 'ok'
  and (select accepts_card and not accepts_transfer and para_llevar and para_aqui and container_price = 5.00
         from public.kitchen_page where workspace_id = :'ws_m'),
  coalesce((select body::text from public._answer where who = 'mari-settings'), :'settings'));
select public.chk('2.3 both ways off, a price that is not pesos and centavos, and a yes written as text are each refused 22023 — nothing changed',
  :'no_way' = '22023' and :'box_bad' = '22023' and :'card_text' = '22023'
  and (select para_llevar and para_aqui and container_price = 5.00
         from public.kitchen_page where workspace_id = :'ws_m'),
  format('%s %s %s', :'no_way', :'box_bad', :'card_text'));
select public.chk('2.4 a build that sends only her sentence leaves every setting as it was',
  :'sentence' = 'ok'
  and (select sentence = 'Comida casera' and accepts_card and para_aqui and container_price = 5.00
         from public.kitchen_page where workspace_id = :'ws_m'));

-- ---- 3. publishing: each line's ways, the desechable copied ------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  jsonb_build_array(
    jsonb_build_object('name', 'Comida corrida', 'unit_price', '65.00', 'quantity', 3, 'usual_price', '120.00'),
    jsonb_build_object('name', 'Bolsa de guisados', 'unit_price', '50.00', 'quantity', 1, 'surprise', true,
                       'para_aqui', true),
    jsonb_build_object('name', 'Pozole', 'unit_price', '70.00', 'quantity', 2, 'para_llevar', false)))
  is not null as published_m \gset
select public.publish_listing(:lm2, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Sopa de fideo", "unit_price": "30.00", "quantity": 2}, {"name": "Agua de jamaica", "unit_price": "12.00", "quantity": 3}]'::jsonb) is not null as published_m2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.publish_listing(:lo, :'loc_o', :'q0'::timestamptz, :'q0'::timestamptz + interval '3 hours',
  '[{"name": "Tamales", "unit_price": "20.00", "quantity": 5}]'::jsonb) is not null as published_o \gset
select public.publish_listing(:lo2, :'loc_o', :'q0'::timestamptz, :'q0'::timestamptz + interval '3 hours',
  '[{"name": "Atole", "unit_price": "15.00", "quantity": 3}]'::jsonb) is not null as published_o2 \gset
select public.withdraw_listing(:lo2) is null as withdrawn_o2 \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L::jsonb)', :lbad, :'loc_o',
  :'q0'::timestamptz, :'q0'::timestamptz + interval '3 hours',
  '[{"name": "Tortas", "unit_price": "25.00", "quantity": 2, "para_aqui": true}]')) as way_not_hers \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L::jsonb)', :lbad, :'loc_o',
  :'q0'::timestamptz, :'q0'::timestamptz + interval '3 hours',
  '[{"name": "Tortas", "unit_price": "25.00", "quantity": 2, "para_llevar": false}]')) as no_way_line \gset
reset role;
-- An offer whose window has ended, and a shop's offer: neither can be published, so
-- they are written as postgres.
insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by)
values (:le, :'ws_o', :'loc_o', now() - interval '3 hours', now() - interval '1 minute', :otra),
       (:lt, :'ws_t', :'loc_t', :'q0'::timestamptz, :'q0'::timestamptz + interval '3 hours', :tendera);
insert into public.listing_line (id, listing_id, workspace_id, location_id, line_no, name, unit_price, quantity)
values (gen_random_uuid(), :le, :'ws_o', :'loc_o', 1, 'Pan de ayer', 10, 4),
       (gen_random_uuid(), :lt, :'ws_t', :'loc_t', 1, 'Jitomate', 18, 4);

select public.chk('3.1 a dish that sends no way takes the kitchen''s — para llevar and para comer aquí',
  (select para_llevar and para_aqui from public.listing_line where listing_id = :lm and line_no = 1));
select public.chk('3.2 ⚠️ a surprise bag is para llevar only, even sent para_aqui',
  (select para_llevar and not para_aqui from public.listing_line where listing_id = :lm and line_no = 2));
select public.chk('3.3 a dish narrowed to para comer aquí keeps only that',
  (select not para_llevar and para_aqui from public.listing_line where listing_id = :lm and line_no = 3));
select public.chk('3.4 the kitchen''s desechable is copied onto the offer when it is published; a kitchen with none has none',
  (select container_price = 5.00 from public.listing where id = :lm)
  and (select container_price is null from public.listing where id = :lo));
select public.chk('3.5 a kitchen with no page publishes para llevar only — what every build in the field sends',
  (select para_llevar and not para_aqui from public.listing_line where listing_id = :lo));
select public.chk('3.6 a way the kitchen does not offer, and a dish with no way at all, are each refused 22023 — nothing published',
  :'way_not_hers' = '22023' and :'no_way_line' = '22023'
  and not exists (select 1 from public.listing where id = :lbad),
  format('%s %s', :'way_not_hers', :'no_way_line'));

-- ---- 4. reserving ------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public._call_as_me('r1', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :r1, :lm,
  :'q0'::timestamptz + interval '2 hours', 'efectivo')) as got_r1 \gset
select public._call_as_me('r1-again', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :r1, :lm,
  :'q0'::timestamptz + interval '2 hours', 'efectivo')) as r1_again \gset
select public._call_as_me('r2', format('select public.reserve_plate(%L, %L, 3, %L, %L)', :r2, :lm,
  :'q0'::timestamptz + interval '30 minutes', 'tarjeta')) as got_r2 \gset
select public._call_as_me('r3', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :r3, :lo,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as got_r3 \gset
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lm2,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as fourth \gset
reset role;

select public.chk('4.1 a neighbour reserves one plate: a 3-digit code from 100 to 999, answered with the id',
  :'got_r1' = 'ok'
  and (select (body ->> 'id')::uuid = :r1 and (body ->> 'code')::int between 100 and 999
         from public._answer where who = 'r1')
  and (select code between 100 and 999 from public.reservation where id = :r1),
  coalesce((select body::text from public._answer where who = 'r1'), :'got_r1'));
select public.chk('4.2 what is kept: her, her hour, the day she collects in the kitchen''s zone, held until the window ends, cash, para llevar by default',
  (select r.buyer_id = :vecina and r.pickup_at = :'q0'::timestamptz + interval '2 hours'
          and r.pickup_day = ((:'q0'::timestamptz + interval '2 hours') at time zone 'America/Mexico_City')::date
          and r.held_until = :'q0'::timestamptz + interval '4 hours'
          and r.payment = 'efectivo' and r.eat = 'llevar' and r.listing_id = :lm
          and r.workspace_id = :'ws_m' and r.location_id = :'loc_m' and r.buyer_workspace_id is null
     from public.reservation r where r.id = :r1));
select public.chk('4.3 its line: one plate of that dish at its price, with the desechable because it is taken away',
  (select count(*) = 1 and bool_and(rl.quantity = 1 and rl.unit_price = 65.00 and rl.container_price = 5.00
                                     and rl.line_no = 1)
     from public.reservation_line rl where rl.reservation_id = :r1));
select public.chk('4.4 a retry with the same id is that reservation, its code unchanged — never a second',
  :'r1_again' = 'ok'
  and (select (a.body ->> 'code') = (b.body ->> 'code') from public._answer a, public._answer b
        where a.who = 'r1' and b.who = 'r1-again')
  and (select count(*) = 1 from public.reservation where buyer_id = :vecina and listing_id = :lm
                                                     and pickup_at = :'q0'::timestamptz + interval '2 hours'));
select public.chk('4.5 a dish eaten only at the kitchen is reserved aquí with no desechable; a card where the kitchen takes one',
  :'got_r2' = 'ok'
  and (select r.eat = 'aqui' and r.payment = 'tarjeta' from public.reservation r where r.id = :r2)
  and (select rl.container_price is null from public.reservation_line rl where rl.reservation_id = :r2));
select public.chk('4.6 a kitchen with no desechable: none on the plate taken away',
  :'got_r3' = 'ok'
  and (select rl.container_price is null and rl.unit_price = 20.00
         from public.reservation_line rl where rl.reservation_id = :r3));
select public.chk('4.7 ⚠️ a fourth while three are still to collect is refused TD016 — up to three (2026-11-10)',
  :'fourth' = 'TD016' and not exists (select 1 from public.reservation where id = :rx), :'fourth');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina2), true);
set local role authenticated;
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :r1, :lm,
  :'q0'::timestamptz + interval '2 hours', 'efectivo')) as theirs \gset
select public._try(format('select public.reserve_plate(%L, %L, 2, %L, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '45 minutes', 'efectivo', 'aqui')) as bag_here \gset
select public._try(format('select public.reserve_plate(%L, %L, 2, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '45 minutes', 'transferencia')) as no_transfer \gset
select public._try(format('select public.reserve_plate(%L, %L, 2, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '45 minutes', 'cheque')) as cheque \gset
select public._try(format('select public.reserve_plate(%L, %L, 9, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '45 minutes', 'efectivo')) as no_line \gset
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '37 minutes', 'efectivo')) as not_quarter \gset
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lm,
  :'q0'::timestamptz - interval '15 minutes', 'efectivo')) as before_now \gset
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '3 hours 50 minutes', 'efectivo')) as too_late \gset
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lo2,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as withdrawn \gset
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :le,
  :'q0'::timestamptz, 'efectivo')) as ended \gset
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lt,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as a_shop \gset
select public._call_as_me('r4', format('select public.reserve_plate(%L, %L, 2, %L, %L, %L)', :r4, :lm,
  :'q0'::timestamptz + interval '45 minutes', 'efectivo', 'llevar')) as got_r4 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina3), true);
set local role authenticated;
select public._try(format('select public.reserve_plate(%L, %L, 2, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '45 minutes', 'efectivo')) as none_left \gset
select public._call_as_me('r5', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :r5, :lm,
  :'q0'::timestamptz + interval '3 hours 45 minutes', 'efectivo')) as got_r5 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as by_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as by_mari \gset
reset role;
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rx, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as nobody \gset
reset role;

select public.chk('4.8 another person''s reservation id is refused 42501',
  :'theirs' = '42501', :'theirs');
select public.chk('4.9 a bag aquí, a transfer the kitchen does not take, a method that is none of the three, a line the offer lacks — each 22023',
  :'bag_here' = '22023' and :'no_transfer' = '22023' and :'cheque' = '22023' and :'no_line' = '22023',
  format('%s %s %s %s', :'bag_here', :'no_transfer', :'cheque', :'no_line'));
select public.chk('4.10 her hour: off the quarter, before the current quarter, or past 15 minutes before the window ends — each 22023',
  :'not_quarter' = '22023' and :'before_now' = '22023' and :'too_late' = '22023',
  format('%s %s %s', :'not_quarter', :'before_now', :'too_late'));
select public.chk('4.11 a withdrawn offer, an offer whose window ended and a shop''s offer are each not on offer: TD015',
  :'withdrawn' = 'TD015' and :'ended' = 'TD015' and :'a_shop' = 'TD015',
  format('%s %s %s', :'withdrawn', :'ended', :'a_shop'));
select public.chk('4.12 the last plate is taken, and the next neighbour is told TD015 — nothing is left of that dish',
  :'got_r4' = 'ok' and :'none_left' = 'TD015', format('%s %s', :'got_r4', :'none_left'));
select public.chk('4.13 the latest hour, exactly 15 minutes before the window ends, is hers to pick',
  :'got_r5' = 'ok', :'got_r5');
select public.chk('4.14 the kitchen''s own people — its owner and its cook — are refused TD017',
  :'by_cook' = 'TD017' and :'by_mari' = 'TD017', format('%s %s', :'by_cook', :'by_mari'));
select public.chk('4.15 nobody signed in is refused 42501, and nothing at all was written by a refusal',
  :'nobody' = '42501' and not exists (select 1 from public.reservation where id = :rx), :'nobody');
select public.chk('4.16 the codes at one kitchen on one day are all different',
  (select count(distinct code) = count(*) from public.reservation
    where workspace_id = :'ws_m' and pickup_day = (select pickup_day from public.reservation where id = :r1)));

-- ---- 5. the door: what is left ------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina3), true);
set local role authenticated;
select public._look('vecina3');
reset role;
select public.chk('5.1 ⚠️ quantity is what is LEFT: three offered, two reserved, one left; two of the pozole, one reserved, one left; five tamales, one reserved, four left',
  public._dish('vecina3', :'ws_m', :lm, 1) ->> 'quantity' = '1.000'
  and public._dish('vecina3', :'ws_m', :lm, 3) ->> 'quantity' = '1.000'
  and public._dish('vecina3', :'ws_o', :lo, 1) ->> 'quantity' = '4.000',
  format('%s / %s / %s', public._dish('vecina3', :'ws_m', :lm, 1) ->> 'quantity',
         public._dish('vecina3', :'ws_m', :lm, 3) ->> 'quantity', public._dish('vecina3', :'ws_o', :lo, 1) ->> 'quantity'));
select public.chk('5.2 ⚠️ a line with nothing left is not sent — every Itacate build draws quantity as Quedan N and refuses a 0',
  public._dish('vecina3', :'ws_m', :lm, 2) is null
  and not exists (select 1 from public._door d, jsonb_array_elements(d.body) k,
                       jsonb_array_elements(k -> 'on_offer') o, jsonb_array_elements(o -> 'lines') l
                   where d.who = 'vecina3' and (l ->> 'quantity')::numeric <= 0));
select public.chk('5.3 each line''s ways, each offer''s desechable, and the kitchen''s methods and ways',
  (public._dish('vecina3', :'ws_m', :lm, 1) ->> 'para_llevar')::boolean
  and (public._dish('vecina3', :'ws_m', :lm, 1) ->> 'para_aqui')::boolean
  and not (public._dish('vecina3', :'ws_m', :lm, 3) ->> 'para_llevar')::boolean
  and (select o ->> 'container_price' = '5.00' from jsonb_array_elements(public._kitchen('vecina3', :'ws_m') -> 'on_offer') o
        where (o ->> 'id')::uuid = :lm)
  and public._kitchen('vecina3', :'ws_m') -> 'payment' = '["efectivo", "tarjeta"]'::jsonb
  and public._kitchen('vecina3', :'ws_m') -> 'eat' = '["llevar", "aqui"]'::jsonb
  and public._kitchen('vecina3', :'ws_o') -> 'payment' = '["efectivo"]'::jsonb
  and public._kitchen('vecina3', :'ws_o') -> 'eat' = '["llevar"]'::jsonb,
  (public._kitchen('vecina3', :'ws_m') -> 'payment')::text || ' ' || (public._kitchen('vecina3', :'ws_m') -> 'eat')::text);
select public.chk('5.4 ⚠️ never who reserved: no neighbour''s id, and no buyer, anywhere in the door',
  (select body::text from public._door where who = 'vecina3') !~ ('(buyer|' || :vecina || '|' || :vecina2 || ')'));

-- ---- 6. her own reservations -----------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public._call_as_me('mine', 'select public.my_reservations()') as mine \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina2), true);
set local role authenticated;
select public._call_as_me('mine2', 'select public.my_reservations()') as mine2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('mine-mari', 'select public.my_reservations()') as mine_mari \gset
reset role;
select public.chk('6.1 hers and nobody else''s: her three; the second neighbour sees her one; the fonda, who reserved nothing, none',
  :'mine' = 'ok'
  and (select jsonb_array_length(body) = 3 from public._answer where who = 'mine')
  and (select array_agg((e ->> 'id')::uuid order by e ->> 'id') = array[:r1, :r2, :r3]::uuid[]
         from public._answer a, jsonb_array_elements(a.body) e where a.who = 'mine')
  and (select jsonb_array_length(body) = 1 and (body -> 0 ->> 'id')::uuid = :r4 from public._answer where who = 'mine2')
  and (select body = '[]'::jsonb from public._answer where who = 'mine-mari'));
select public.chk('6.2 what she is told: the code, apartado, her hour, cancel_until an hour before it, how she pays and eats, the line at its price with the desechable, the kitchen by name with its address',
  (select e ->> 'state' = 'apartado'
          and (e ->> 'code')::int = (select code from public.reservation where id = :r1)
          and (e ->> 'pickup_at')::timestamptz = :'q0'::timestamptz + interval '2 hours'
          and (e ->> 'cancel_until')::timestamptz = :'q0'::timestamptz + interval '1 hour'
          and (e ->> 'held_until')::timestamptz = :'q0'::timestamptz + interval '4 hours'
          and e ->> 'payment' = 'efectivo' and e ->> 'eat' = 'llevar'
          and e -> 'lines' -> 0 ->> 'name' = 'Comida corrida'
          and e -> 'lines' -> 0 ->> 'unit_price' = '65.00'
          and e -> 'lines' -> 0 ->> 'container_price' = '5.00'
          and e -> 'lines' -> 0 ->> 'quantity' = '1.000'
          and e -> 'kitchen' ->> 'name' = 'Fonda Doña Mari 0079'
          and (e -> 'kitchen' ->> 'id')::uuid = :'ws_m'
          and e -> 'kitchen' ? 'address' and e -> 'kitchen' -> 'page' ->> 'maps_link' is null
     from public._answer a, jsonb_array_elements(a.body) e where a.who = 'mine' and (e ->> 'id')::uuid = :r1),
  (select e::text from public._answer a, jsonb_array_elements(a.body) e where a.who = 'mine' and (e ->> 'id')::uuid = :r1));
select public.chk('6.3 ⚠️ never a point, a member or anyone else: no google, lat, created_by or other neighbour in her answer',
  (select body::text from public._answer where who = 'mine') !~ ('(google|"lat"|created_by|buyer|' || :vecina2 || '|' || :mari || ')'));

-- ---- 7. cancelling ------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina2), true);
set local role authenticated;
select public._try(format('select public.cancel_my_reservation(%L)', :r1)) as cancel_theirs \gset
reset role;
select public._state(:r1) as r1_after_theirs \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public._say_as_me('cancel-r1', format('select public.cancel_my_reservation(%L)', :r1)) as cancel_r1 \gset
select public._say_as_me('cancel-r1-again', format('select public.cancel_my_reservation(%L)', :r1)) as cancel_r1_again \gset
select public._say_as_me('cancel-r2', format('select public.cancel_my_reservation(%L)', :r2)) as cancel_r2 \gset
select public._look('vecina');
select public._call_as_me('r6', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :r6, :lm2,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as fourth_now \gset
reset role;
select public.chk('7.1 another neighbour cannot cancel hers: 42501, and it stands',
  :'cancel_theirs' = '42501' and :'r1_after_theirs' = 'apartado', :'cancel_theirs');
select public.chk('7.2 more than an hour before her hour it is cancelado; a retry answers the same',
  :'cancel_r1' = 'cancelado' and :'cancel_r1_again' = 'cancelado' and public._state(:r1) = 'cancelado',
  format('%s %s', :'cancel_r1', :'cancel_r1_again'));
select public.chk('7.3 within the hour it is no_va — No voy a poder ir',
  :'cancel_r2' = 'no_va' and public._state(:r2) = 'no_va', :'cancel_r2');
select public.chk('7.4 ⚠️ both give the plate back: two of the comida corrida left again, the pozole back to two',
  public._dish('vecina', :'ws_m', :lm, 1) ->> 'quantity' = '2.000'
  and public._dish('vecina', :'ws_m', :lm, 3) ->> 'quantity' = '2.000',
  format('%s / %s', public._dish('vecina', :'ws_m', :lm, 1) ->> 'quantity', public._dish('vecina', :'ws_m', :lm, 3) ->> 'quantity'));
select public.chk('7.5 the two she gave back no longer count against her three: she reserves again',
  :'fourth_now' = 'ok', :'fourth_now');

-- ---- 8. handing over, and Ya lo tengo ------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.hand_over_reservation(%L)', :r4)) as hand_stranger \gset
reset role;
select public._state(:r4) as r4_after_stranger \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._say_as_me('hand-r4', format('select public.hand_over_reservation(%L)', :r4)) as hand_r4 \gset
select public._say_as_me('hand-r2', format('select public.hand_over_reservation(%L, %L)', :r2,
  now() + interval '1 day')) as hand_r2 \gset
reset role;
select handed_over_at as r4_first from public.reservation where id = :r4 \gset
-- Her phone's queue: a handover made an hour ago reaches the database now.
update public.reservation set created_at = now() - interval '2 hours' where id = :r5;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._say_as_me('hand-r5', format('select public.hand_over_reservation(%L, %L)', :r5,
  now() - interval '1 hour')) as hand_r5 \gset
select public._say_as_me('hand-r4-again', format('select public.hand_over_reservation(%L, %L)', :r4,
  now() - interval '30 minutes')) as hand_r4_again \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina2), true);
set local role authenticated;
select public._try(format('select public.cancel_my_reservation(%L)', :r4)) as cancel_collected \gset
select public._try(format('select public.confirm_my_pickup(%L)', :r3)) as confirm_theirs \gset
select public._say_as_me('confirm-r4', format('select public.confirm_my_pickup(%L)', :r4)) as confirm_r4 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public._say_as_me('confirm-r3', format('select public.confirm_my_pickup(%L)', :r3)) as confirm_r3 \gset
select public._say_as_me('confirm-r3-again', format('select public.confirm_my_pickup(%L)', :r3)) as confirm_r3_again \gset
select public._try(format('select public.confirm_my_pickup(%L)', :r1)) as confirm_cancelled \gset
reset role;

select public.chk('8.1 a member of another kitchen cannot hand it over: 42501',
  :'hand_stranger' = '42501' and :'r4_after_stranger' = 'apartado', :'hand_stranger');
select public.chk('8.2 the kitchen''s cook hands it over: recogido, by her',
  :'hand_r4' = 'recogido' and public._state(:r4) = 'recogido'
  and (select handed_over_by = :cook and handed_over_at = now() from public.reservation where id = :r4),
  :'hand_r4');
select public.chk('8.3 ⚠️ the code typed is always recorded — even for one she gave back: recogido, and its plate taken again',
  :'hand_r2' = 'recogido' and public._state(:r2) = 'recogido'
  and (select cancelled_at is not null and handed_over_at = now() from public.reservation where id = :r2)
  and public.listing_line_taken((select id from public.listing_line where listing_id = :lm and line_no = 3)) = 1,
  :'hand_r2');
select public.chk('8.4 a moment from the future is kept as now; one from her queue, between its making and now, is kept as it was',
  (select handed_over_at = now() from public.reservation where id = :r2)
  and :'hand_r5' = 'recogido'
  and (select handed_over_at = now() - interval '1 hour' from public.reservation where id = :r5));
select public.chk('8.5 a retry keeps the first moment',
  :'hand_r4_again' = 'recogido'
  and (select handed_over_at = :'r4_first'::timestamptz from public.reservation where id = :r4));
select public.chk('8.6 a collected reservation cannot be cancelled: TD018',
  :'cancel_collected' = 'TD018', :'cancel_collected');
select public.chk('8.7 Ya lo tengo: recogido, her first moment kept on a retry; on one already handed over too',
  :'confirm_r3' = 'recogido' and :'confirm_r3_again' = 'recogido' and :'confirm_r4' = 'recogido'
  and (select picked_up_at = now() from public.reservation where id = :r3)
  and public._state(:r3) = 'recogido',
  format('%s %s %s', :'confirm_r3', :'confirm_r3_again', :'confirm_r4'));
select public.chk('8.8 not hers: 42501; one she gave back that nobody handed over: TD018',
  :'confirm_theirs' = '42501' and :'confirm_cancelled' = 'TD018',
  format('%s %s', :'confirm_theirs', :'confirm_cancelled'));

-- ---- 9. − and + -----------------------------------------------------------------------
-- The comida corrida (line 1): three offered, one taken (vecina3's, handed over).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.set_listing_quantity(%L, 1, 2)', :lm)) as qty_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('qty-up', format('select public.set_listing_quantity(%L, 1, 5)', :lm)) as qty_up \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 0)', :lm)) as qty_below \gset
select public._call_as_me('qty-taken', format('select public.set_listing_quantity(%L, 1, 1)', :lm)) as qty_taken \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 2.5)', :lm)) as qty_half \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 1000)', :lm)) as qty_big \gset
select public._try(format('select public.set_listing_quantity(%L, 9, 1)', :lm)) as qty_no_line \gset
select public._call_as_me('qty-zero', format('select public.set_listing_quantity(%L, 2, 0)', :lm2)) as qty_zero_none \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 0)', :lm2)) as qty_soup_zero \gset
select public._call_as_me('qty-soup', format('select public.set_listing_quantity(%L, 1, 1)', :lm2)) as qty_soup \gset
select public._look('mari');
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.set_listing_quantity(%L, 1, 2)', :lo2)) as qty_withdrawn \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 2)', :lm)) as qty_not_hers \gset
reset role;
select public.chk('9.1 + to five: answered as decimal strings, what she offers and what is taken',
  :'qty_up' = 'ok'
  and (select body = '{"quantity": "5.000", "taken": "1.000"}'::jsonb from public._answer where who = 'qty-up'),
  coalesce((select body::text from public._answer where who = 'qty-up'), :'qty_up'));
select public.chk('9.2 ⚠️ never below what is reserved: TD019; down to exactly that is hers, and the dish leaves the door',
  :'qty_below' = 'TD019' and :'qty_taken' = 'ok'
  and (select quantity = 1 from public.listing_line where listing_id = :lm and line_no = 1)
  and public._dish('mari', :'ws_m', :lm, 1) is null,
  format('%s %s', :'qty_below', :'qty_taken'));
select public.chk('9.3 a line with nothing reserved goes to zero; the soup, one reserved, stops at one — and with nothing left the offer leaves the door',
  :'qty_zero_none' = 'ok' and :'qty_soup_zero' = 'TD019' and :'qty_soup' = 'ok'
  and (select quantity = 0 from public.listing_line where listing_id = :lm2 and line_no = 2)
  and (select quantity = 1 from public.listing_line where listing_id = :lm2 and line_no = 1)
  and not exists (select 1 from jsonb_array_elements(public._kitchen('mari', :'ws_m') -> 'on_offer') o
                   where (o ->> 'id')::uuid = :lm2),
  format('%s %s %s', :'qty_zero_none', :'qty_soup_zero', :'qty_soup'));
select public.chk('9.4 a half, a thousand and a line the offer lacks are each 22023',
  :'qty_half' = '22023' and :'qty_big' = '22023' and :'qty_no_line' = '22023',
  format('%s %s %s', :'qty_half', :'qty_big', :'qty_no_line'));
select public.chk('9.5 a cook cannot, another kitchen''s owner cannot (42501), and a withdrawn offer is not on offer (TD015)',
  :'qty_cook' = '42501' and :'qty_not_hers' = '42501' and :'qty_withdrawn' = 'TD015',
  format('%s %s %s', :'qty_cook', :'qty_not_hers', :'qty_withdrawn'));

-- ---- 10. the fonda's read, under the ordinary walls --------------------------------------
create table public._seen (who text primary key, n_own int, n_mari int, n_lines int, buyer text);
grant all on public._seen to authenticated;
create function public._count_as_me(p_who text, p_ws uuid)
returns void language plpgsql as $$
declare v_buyer text;
begin
  begin
    perform r.buyer_id from public.reservation r limit 1;
    v_buyer := 'read';
  exception when insufficient_privilege then
    v_buyer := '42501';
  end;
  insert into public._seen values (p_who,
    (select count(*) from public.reservation where workspace_id = p_ws),
    (select count(*) from public.reservation where workspace_id = (select id from public.workspace where display_name = 'Fonda Doña Mari 0079')),
    (select count(*) from public.reservation_line),
    v_buyer);
end;
$$;
grant execute on function public._count_as_me(text, uuid) to authenticated;
-- Mari's kitchen holds r1, r2, r4, r5 and r6 (lm2); Otra's, r3.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._count_as_me('mari', :'ws_m');
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._count_as_me('cook', :'ws_m');
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._count_as_me('otra', :'ws_o');
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public._count_as_me('vecina', :'ws_m');
reset role;
select public.chk('10.1 the owner and her cook each read all five of her kitchen''s reservations and their lines',
  (select n_own = 5 and n_lines = 5 from public._seen where who = 'mari')
  and (select n_own = 5 and n_lines = 5 from public._seen where who = 'cook'),
  (select string_agg(format('%s:%s/%s', who, n_own, n_lines), ' ') from public._seen));
select public.chk('10.2 another kitchen''s owner reads her own one and none of Mari''s; a neighbour, who belongs to nothing, reads none',
  (select n_own = 1 and n_mari = 0 and n_lines = 1 from public._seen where who = 'otra')
  and (select n_own = 0 and n_mari = 0 and n_lines = 0 from public._seen where who = 'vecina'));
select public.chk('10.3 ⚠️ who reserved is refused to everyone who signs in, the kitchen''s owner too: 42501',
  (select bool_and(buyer = '42501') from public._seen));

-- ---- 11. Ya se terminó keeps the reservations -------------------------------------------
-- vecina3's r5 was handed over; vecina's r6 (lm2, now at zero) is still to collect.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.withdraw_listing(:lm2) is null as withdrawn_m2 \gset
select public._look('mari-after');
reset role;
select public.chk('11.1 ⚠️ withdrawn, her reservation still stands to hand over (call 18), and the offer is off the door',
  public._state(:r6) = 'apartado'
  and not exists (select 1 from jsonb_array_elements(public._kitchen('mari-after', :'ws_m') -> 'on_offer') o
                   where (o ->> 'id')::uuid = :lm2));

-- ---- 12. the deletions (ruled 2026-11-10) -------------------------------------------------
-- Otra's kitchen gets a reservation still to collect.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina2), true);
set local role authenticated;
select public._call_as_me('r7', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :r7, :lo,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as got_r7 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0079')) as del_kitchen \gset
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_o', 'Otro nombre')) as del_kitchen_wrong \gset
select public._try(format('select public.delete_my_account(p_business_names => array[%L])', 'Fonda Otra 0079')) as del_account \gset
reset role;
select public.chk('12.1 ⚠️ a kitchen with a reservation still to hand over is not deleted alone: TD014 — even with a wrong name, which never hides it',
  :'got_r7' = 'ok' and :'del_kitchen' = 'TD014' and :'del_kitchen_wrong' = 'TD014'
  and exists (select 1 from public.workspace where id = :'ws_o'),
  format('%s %s %s', :'got_r7', :'del_kitchen', :'del_kitchen_wrong'));
select public.chk('12.2 ⚠️ nor with the account of its only owner: TD014, and her login stays',
  :'del_account' = 'TD014' and exists (select 1 from auth.users where id = :otra), :'del_account');

-- Its window ends: the reservation se liberó.
update public.reservation set held_until = now() - interval '1 minute' where id = :r7;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina2), true);
set local role authenticated;
select public._call_as_me('mine2-after', 'select public.my_reservations()') as mine2_after \gset
select public._try(format('select public.cancel_my_reservation(%L)', :r7)) as cancel_liberado \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._call_as_me('del-otra', format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0079')) as del_kitchen_now \gset
reset role;
select public.chk('12.3 when the window ends it reads liberado (Se liberó) in her list, and is no longer hers to cancel: TD018',
  (select e ->> 'state' = 'liberado' from public._answer a, jsonb_array_elements(a.body) e
    where a.who = 'mine2-after' and (e ->> 'id')::uuid = :r7)
  and :'cancel_liberado' = 'TD018', :'cancel_liberado');
select public.chk('12.4 then the kitchen is deleted alone, its reservations and their lines with it',
  :'del_kitchen_now' = 'ok'
  and not exists (select 1 from public.workspace where id = :'ws_o')
  and not exists (select 1 from public.reservation where workspace_id = :'ws_o')
  and not exists (select 1 from public.reservation_line where workspace_id = :'ws_o'),
  :'del_kitchen_now');

-- A neighbour's account goes at once: vecina holds r6 still to collect, and r1, r2, r3
-- given back or collected.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public._call_as_me('del-vecina', 'select public.delete_my_account()') as del_vecina \gset
reset role;
select public.chk('12.5 ⚠️ a neighbour''s account goes at once, and her reservation still to collect is given back — the kitchen reads it cancelled',
  :'del_vecina' = 'ok'
  and not exists (select 1 from auth.users where id = :vecina)
  and (select cancelled_at = now() from public.reservation where id = :r6)
  and public._state(:r6) in ('cancelado', 'no_va'),
  :'del_vecina');
select public.chk('12.6 ⚠️ none of her reservations points to her any more; the ones already settled keep their moments',
  not exists (select 1 from public.reservation where buyer_id = :vecina)
  and (select buyer_id is null and cancelled_at is not null and handed_over_at is null from public.reservation where id = :r1)
  and (select buyer_id is null and handed_over_at is not null from public.reservation where id = :r2)
  and exists (select 1 from public.reservation where id = :r6 and buyer_id is null));
select public.chk('12.7 and the kitchen''s other neighbours are untouched',
  (select buyer_id = :vecina2 from public.reservation where id = :r4)
  and (select buyer_id = :vecina3 from public.reservation where id = :r5));

-- ---- the report ------------------------------------------------------------------------
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 68 then
    raise exception 'expected 68 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
