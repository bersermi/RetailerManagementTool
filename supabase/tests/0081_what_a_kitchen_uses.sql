-- ============================================================================
-- 0081 — what a kitchen uses (`10.9a-i`; the owner's rulings of 2026-11-16 and
-- 17). Every call is made AS THE PERSON, under `set role authenticated` with her
-- claims; Wera's switches are turned as postgres, as he turns them on the live
-- database (one UPDATE).
--
-- Section 1 the shape: two tables nobody signed in reaches, five switches off,
-- three doors for the signed-in only. Section 2 the read. Section 3 what a write
-- refuses, changing nothing. Section 4 her choices, their moments and *Me
-- interesa* on Discord. Section 5 the door: what a neighbour sees a kitchen use.
-- Section 6 *Cuéntanos cómo necesitas tu menú*. Section 7 the deletions.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK: the stand-in webhook never leaves the vault
-- and pg_net's worker never sends what is queued (`0070`'s suite). A refused call
-- is made through `_try`, whose handler undoes whatever it began.
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
grant execute on function public._try(text) to authenticated, anon;

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

create function public._a(p_who text)
returns jsonb language sql as $$ select a.body from public._answer a where a.who = p_who $$;
-- One kitchen in the door, as one person got it.
create function public._kitchen(p_who text, p_id uuid)
returns jsonb language sql as $$
  select k from public._answer a, jsonb_array_elements(a.body) k
   where a.who = p_who and (k ->> 'id')::uuid = p_id
$$;
-- What pg_net's queue holds after a given id: the content Discord would show.
create function public._sent(p_after bigint)
returns table (id bigint, content text)
language sql as $$
  select q.id, convert_from(q.body, 'UTF8')::jsonb ->> 'content'
    from net.http_request_queue q
   where q.id > p_after
   order by q.id
$$;
create function public._switch(p_name text, p_on boolean)
returns void language sql as $$
  update servicio.feature_switch set is_on = p_on, changed_at = now() where name = p_name;
$$;

\set mari  '''0081aaaa-0000-4000-8000-000000000001'''
\set cook  '''0081aaaa-0000-4000-8000-000000000002'''
\set otra  '''0081aaaa-0000-4000-8000-000000000003'''
\set tendera '''0081aaaa-0000-4000-8000-000000000004'''
\set ana   '''0081aaaa-0000-4000-8000-000000000005'''
\set lm    '''0081bbbb-0000-4000-8000-000000000001'''
\set lo    '''0081bbbb-0000-4000-8000-000000000002'''
\set url   '''http://127.0.0.1:9/discord-0081'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,    'mari.0081@example.mx',    jsonb_build_object('full_name', 'Mari 0081')),
  (:cook,    'cook.0081@example.mx',    jsonb_build_object('full_name', 'Cook 0081')),
  (:otra,    'otra.0081@example.mx',    jsonb_build_object('full_name', 'Otra 0081')),
  (:tendera, 'tendera.0081@example.mx', jsonb_build_object('full_name', 'Tendera 0081')),
  (:ana,     'ana.0081@example.mx',     jsonb_build_object('full_name', 'Ana Rodríguez'));

-- Mari's kitchen and her cook (staff); Otra's kitchen; a shop.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0081', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :cook, 'staff', 'Cook 0081');
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0081', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0081') as ws_t \gset
reset role;

-- Today's offers, so both kitchens are in the door.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 20}]'::jsonb) is not null as published_m \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.publish_listing(:lo, :'loc_o', :'q0'::timestamptz, :'q0'::timestamptz + interval '3 hours',
  '[{"name": "Tamales", "unit_price": "20.00", "quantity": 10}]'::jsonb) is not null as published_o \gset
reset role;

-- A database that holds the hosted secret's name would hide nothing here, but the
-- stand-in is the only webhook these checks read; the rollback puts all back.
delete from vault.secrets where name = 'discord_avisos_webhook';
select vault.create_secret(:url, 'discord_avisos_webhook', 'stand-in, 0081 suite') is not null as made \gset


-- ---- 1. the shape ---------------------------------------------------------------------
select public.chk('1.1 two tables in servicio, and no client role holds any right on either',
  to_regclass('servicio.kitchen_feature') is not null and to_regclass('servicio.menu_request') is not null
  and not exists (select 1 from information_schema.role_table_grants g
                   where g.table_schema = 'servicio' and g.table_name in ('kitchen_feature', 'menu_request')
                     and g.grantee in ('anon', 'authenticated', 'PUBLIC')));
select public.chk('1.2 Wera''s switch gains a row per feature and one for Próximamente, every one off; the kitchen''s cancel unchanged',
  (select array_agg(name order by name) from servicio.feature_switch where not is_on)
    = array['kitchen_cancel', 'menu', 'numeros', 'promociones', 'proximamente', 'tarjeta']
  and not exists (select 1 from servicio.feature_switch where is_on),
  (select string_agg(name || '=' || is_on, ' ' order by name) from servicio.feature_switch));
select public.chk('1.3 the three doors execute for the signed-in alone — never anon, never public',
  (select bool_and(has_function_privilege('authenticated', f, 'execute')
                   and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.my_kitchen_features(uuid)', 'public.set_kitchen_features(uuid, jsonb)',
                       'public.send_menu_request(uuid, text)']::regprocedure[]) f)
  and not exists (select 1 from information_schema.routine_privileges p
                   where p.routine_name in ('my_kitchen_features', 'set_kitchen_features', 'send_menu_request')
                     and p.grantee = 'PUBLIC'));
select public._try(format($q$insert into servicio.kitchen_feature (workspace_id, feature, state) values (%L, 'menu', 'quizas')$q$, :'ws_m')) as bad_state \gset
select public._try(format($q$insert into servicio.kitchen_feature (workspace_id, feature, state) values (%L, 'menu_del_dia', 'on')$q$, :'ws_m')) as bad_feature \gset
select public._try(format($q$insert into servicio.menu_request (workspace_id, body) values (%L, ' con espacios ')$q$, :'ws_m')) as bad_body \gset
select public.chk('1.4 the tables themselves refuse a state, a feature or an untrimmed text no function would write',
  :'bad_state' = '23514' and :'bad_feature' = '23514' and :'bad_body' = '23514',
  :'bad_state' || ' ' || :'bad_feature' || ' ' || :'bad_body');


-- ---- 2. the read ----------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('read-mari', format('select public.my_kitchen_features(%L)', :'ws_m')) as read_mari \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('read-cook', format('select public.my_kitchen_features(%L)', :'ws_m')) as read_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.my_kitchen_features(%L)', :'ws_m')) as read_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.my_kitchen_features(%L)', :'ws_m')) as read_ana \gset
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.my_kitchen_features(%L)', :'ws_m')) as read_nobody \gset
reset role;
set local role anon;
select public._try(format('select public.my_kitchen_features(%L)', :'ws_m')) as read_anon \gset
reset role;

select public.chk('2.1 nothing chosen yet: no feature, nothing offered, no Próximamente, no request — the answer''s four keys and no more',
  :'read_mari' = 'ok'
  and public._a('read-mari') = '{"features": [], "available": [], "proximamente": false, "menu_requests": 0}'::jsonb,
  coalesce(public._a('read-mari')::text, :'read_mari'));
select public.chk('2.2 every member reads them: her cook (staff) gets the same answer',
  :'read_cook' = 'ok' and public._a('read-cook') = public._a('read-mari'),
  coalesce(public._a('read-cook')::text, :'read_cook'));
select public.chk('2.3 another kitchen''s owner, a neighbour and a caller with no account are refused 42501; anon cannot call it',
  :'read_otra' = '42501' and :'read_ana' = '42501' and :'read_nobody' = '42501' and :'read_anon' = '42501',
  concat_ws(' ', :'read_otra', :'read_ana', :'read_nobody', :'read_anon'));


-- ---- 3. what a write refuses, changing nothing ------------------------------------------
select coalesce(max(id), 0) as qr from net.http_request_queue \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format($q$select public.set_kitchen_features(%L, '{"menu": "interesada"}')$q$, :'ws_m')) as w_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format($q$select public.set_kitchen_features(%L, '{"menu": "interesada"}')$q$, :'ws_m')) as w_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format($q$select public.set_kitchen_features(%L, '{"menu": "interesada"}')$q$, :'ws_t')) as w_shop \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format($q$select public.set_kitchen_features(%L, '{"menu_del_dia": "on"}')$q$, :'ws_m')) as w_feature \gset
select public._try(format($q$select public.set_kitchen_features(%L, '{"menu": "si"}')$q$, :'ws_m')) as w_state \gset
select public._try(format($q$select public.set_kitchen_features(%L, '{"menu": true}')$q$, :'ws_m')) as w_bool \gset
select public._try(format($q$select public.set_kitchen_features(%L, '{}')$q$, :'ws_m')) as w_empty \gset
select public._try(format($q$select public.set_kitchen_features(%L, '["menu"]')$q$, :'ws_m')) as w_array \gset
select public._try(format($q$select public.set_kitchen_features(%L, null)$q$, :'ws_m')) as w_null \gset
select public._try(format($q$select public.set_kitchen_features(%L, '{"numeros": "off", "tarjeta": "on"}')$q$, :'ws_m')) as w_off_switch \gset
select public._try(format($q$select public.set_kitchen_features(%L, '{"interesada": "menu", "menu": "interesada"}')$q$, :'ws_m')) as w_mixed \gset
reset role;

select public.chk('3.1 only the owner chooses: her cook and another kitchen''s owner are refused 42501',
  :'w_cook' = '42501' and :'w_otra' = '42501', :'w_cook' || ' ' || :'w_otra');
select public.chk('3.2 a shop does not choose: TD013',
  :'w_shop' = 'TD013', :'w_shop');
select public.chk('3.3 a feature it does not know, a state it does not know, a state that is not text, no choice, a list, nothing: each 22023 — a key is never ignored',
  :'w_feature' = '22023' and :'w_state' = '22023' and :'w_bool' = '22023' and :'w_empty' = '22023'
  and :'w_array' = '22023' and :'w_null' = '22023' and :'w_mixed' = '22023',
  concat_ws(' ', :'w_feature', :'w_state', :'w_bool', :'w_empty', :'w_array', :'w_null', :'w_mixed'));
select public.chk('3.4 ⚠️ on, for a feature Wera has switched off for everyone: TD024 — and the off sent beside it is not written either',
  :'w_off_switch' = 'TD024', :'w_off_switch');
select public.chk('3.5 nothing was written by any refusal, and nothing queued for Discord',
  not exists (select 1 from servicio.kitchen_feature)
  and (select count(*) from public._sent(:qr)) = 0,
  (select count(*)::text from servicio.kitchen_feature));


-- ---- 4. her choices, their moments, *Me interesa* -----------------------------------------
-- The first run's *Seguir* with nothing offered sends nothing; here, *Me interesa*
-- on the menu (Próximamente), and the off she may always say.
select coalesce(max(id), 0) as q1 from net.http_request_queue \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('menu-int', format($q$select public.set_kitchen_features(%L, '{"menu": "interesada", "numeros": "off"}')$q$, :'ws_m')) as menu_int \gset
reset role;
select public.chk('4.1 interesada and off are taken while every switch is off; the answer is the read, in the fixed order',
  :'menu_int' = 'ok'
  and (select jsonb_agg(e - 'since') from jsonb_array_elements(public._a('menu-int') -> 'features') e)
      = '[{"feature": "numeros", "state": "off"}, {"feature": "menu", "state": "interesada"}]'::jsonb
  and public._a('menu-int') -> 'available' = '[]'::jsonb,
  coalesce(public._a('menu-int')::text, :'menu_int'));
select public.chk('4.2 ⚠️ Me interesa tells him on Discord in his words, naming nobody — one line, for the menu alone',
  (select array_agg(content order by id) from public._sent(:q1)) = array['🍽️ Una cocina quiere: Tu menú.'],
  (select string_agg(content, ' | ') from public._sent(:q1)));

-- The same tap again, an hour's wait away in effect: the moment is kept, nothing re-sent.
select (public._a('menu-int') -> 'features' -> 1 ->> 'since') as since_menu \gset
update servicio.kitchen_feature set changed_at = changed_at - interval '1 hour' where workspace_id = :'ws_m';
select coalesce(max(id), 0) as q2 from net.http_request_queue \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('menu-again', format($q$select public.set_kitchen_features(%L, '{"menu": "interesada"}')$q$, :'ws_m')) as menu_again \gset
reset role;
select public.chk('4.3 the same choice again keeps its moment and tells him nothing twice',
  :'menu_again' = 'ok'
  and (select changed_at from servicio.kitchen_feature where workspace_id = :'ws_m' and feature = 'menu')
      = :'since_menu'::timestamptz - interval '1 hour'
  and (select count(*) from public._sent(:q2)) = 0,
  (select count(*)::text from public._sent(:q2)));

-- Wera switches the card and her numbers on (one UPDATE each, as on the live database).
select public._switch('tarjeta', true);
select public._switch('numeros', true);
select coalesce(max(id), 0) as q3 from net.http_request_queue \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('pick', format($q$select public.set_kitchen_features(%L, '{"numeros": "on", "tarjeta": "on", "promociones": "off"}')$q$, :'ws_m')) as pick \gset
select public._try(format($q$select public.set_kitchen_features(%L, '{"promociones": "on"}')$q$, :'ws_m')) as pick_promos \gset
reset role;
select public.chk('4.4 with the card and her numbers switched on, she turns both on; promotions, still off for everyone, refused TD024',
  :'pick' = 'ok' and :'pick_promos' = 'TD024'
  and (select jsonb_agg(jsonb_build_array(e ->> 'feature', e ->> 'state')) from jsonb_array_elements(public._a('pick') -> 'features') e)
      = '[["tarjeta", "on"], ["promociones", "off"], ["numeros", "on"], ["menu", "interesada"]]'::jsonb
  and public._a('pick') -> 'available' = '["tarjeta", "numeros"]'::jsonb,
  coalesce(public._a('pick')::text, :'pick'));
select public.chk('4.5 a state that changed takes its moment; numeros went off → on now, the menu kept its own',
  (select changed_at from servicio.kitchen_feature where workspace_id = :'ws_m' and feature = 'numeros') = now()
  and (select changed_at from servicio.kitchen_feature where workspace_id = :'ws_m' and feature = 'menu') < now()
  and (select count(*) from public._sent(:q3)) = 0);


-- ---- 5. the door: what a neighbour sees a kitchen use ----------------------------------
-- Otra says *Me interesa* to the card, which Wera offers now: interested is not using.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format($q$select public.set_kitchen_features(%L, '{"tarjeta": "interesada"}')$q$, :'ws_o')) as otra_card_int \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-1', 'select public.on_offer_now()') as door_1 \gset
reset role;
select public.chk('5.1 Mari''s kitchen: features is the card alone — never her numbers, never her menu''s interesada',
  :'door_1' = 'ok' and public._kitchen('door-1', :'ws_m') -> 'features' = '["tarjeta"]'::jsonb,
  coalesce((public._kitchen('door-1', :'ws_m') -> 'features')::text, :'door_1'));
select public.chk('5.2 a kitchen that is only interested in the card, which Wera offers: an empty list, never null',
  :'otra_card_int' = 'ok' and public._kitchen('door-1', :'ws_o') -> 'features' = '[]'::jsonb,
  coalesce((public._kitchen('door-1', :'ws_o') -> 'features')::text, :'otra_card_int'));

select public._switch('promociones', true);
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('promos', format($q$select public.set_kitchen_features(%L, '{"promociones": "on"}')$q$, :'ws_m')) as promos \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-2', 'select public.on_offer_now()') as door_2 \gset
reset role;
select public.chk('5.3 promotions switched on and turned on: the card, then promotions — the fixed order',
  :'promos' = 'ok' and public._kitchen('door-2', :'ws_m') -> 'features' = '["tarjeta", "promociones"]'::jsonb,
  coalesce((public._kitchen('door-2', :'ws_m') -> 'features')::text, :'promos'));

-- Wera switches the card off for everyone: her choice stays, the door and her read drop it.
select public._switch('tarjeta', false);
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-3', 'select public.on_offer_now()') as door_3 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('read-off', format('select public.my_kitchen_features(%L)', :'ws_m')) as read_off \gset
reset role;
select public.chk('5.4 ⚠️ the card switched off for everyone: gone from the door and from what Wera offers; her on is kept for when it comes back',
  public._kitchen('door-3', :'ws_m') -> 'features' = '["promociones"]'::jsonb
  and public._a('read-off') -> 'available' = '["promociones", "numeros"]'::jsonb
  and (select state from servicio.kitchen_feature where workspace_id = :'ws_m' and feature = 'tarjeta') = 'on',
  coalesce((public._kitchen('door-3', :'ws_m') -> 'features')::text, :'door_3'));

-- She turns promotions off: the door forgets it at once.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('promos-off', format($q$select public.set_kitchen_features(%L, '{"promociones": "off"}')$q$, :'ws_m')) as promos_off \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-4', 'select public.on_offer_now()') as door_4 \gset
reset role;
select public.chk('5.5 off from her side: the door sends nothing for her',
  :'promos_off' = 'ok' and public._kitchen('door-4', :'ws_m') -> 'features' = '[]'::jsonb,
  coalesce((public._kitchen('door-4', :'ws_m') -> 'features')::text, :'promos_off'));
-- ⚠️ Since `0085` (`10.9e-i`) the door sends `card` too — the loyalty card's terms — so the set is
-- every key before `0081`, `features`, and `card`; a later migration adding one more names it here.
select public.chk('5.6 every key the door sent before 0081 is still sent, and one more (and, since 0085, card)',
  (select array_agg(k order by k) from jsonb_object_keys(public._kitchen('door-4', :'ws_m')) k)
    = array['address', 'card', 'directions', 'eat', 'features', 'giro', 'id', 'min_score', 'name', 'on_offer', 'page',
            'payment', 'point', 'stars', 'summary'],
  (select string_agg(k, ',' order by k) from jsonb_object_keys(public._kitchen('door-4', :'ws_m')) k));


-- ---- 6. *Cuéntanos cómo necesitas tu menú* ----------------------------------------------
select coalesce(max(id), 0) as q4 from net.http_request_queue \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('menu-req', format('select public.send_menu_request(%L, %L)', :'ws_m',
  '  El lunes subo el menú de la semana. Pregunten por Mari.  ')) as menu_req \gset
select public._try(format('select public.send_menu_request(%L, %L)', :'ws_m', '   ')) as req_blank \gset
select public._try(format('select public.send_menu_request(%L, null)', :'ws_m')) as req_null \gset
select public._try(format('select public.send_menu_request(%L, %L)', :'ws_m', repeat('m', 501))) as req_long \gset
select public._try(format('select public.send_menu_request(%L, %L)', :'ws_m', repeat('m', 500))) as req_500 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.send_menu_request(%L, %L)', :'ws_m', 'De la cocinera')) as req_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.send_menu_request(%L, %L)', :'ws_m', 'De otra')) as req_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.send_menu_request(%L, %L)', :'ws_t', 'De la tienda')) as req_shop \gset
reset role;

select public.chk('6.1 what she wrote is kept, trimmed, and the answer counts it',
  :'menu_req' = 'ok' and (public._a('menu-req') ->> 'menu_requests')::int = 1
  -- ⚠️ by its text, never by order: every row of this transaction has one `now()`
  and exists (select 1 from servicio.menu_request
               where workspace_id = :'ws_m' and body = 'El lunes subo el menú de la semana. Pregunten por Mari.'),
  coalesce(public._a('menu-req')::text, :'menu_req'));
select public.chk('6.2 ⚠️ Discord hears only that one arrived — never a word of hers (two lines: hers, and the 500 characters)',
  (select array_agg(content order by id) from public._sent(:q4))
    = array['📝 Una cocina nos contó cómo necesita su menú.', '📝 Una cocina nos contó cómo necesita su menú.']
  and not exists (select 1 from public._sent(:q4) s where s.content ~ '(lunes|Mari|mmmm)'),
  (select string_agg(content, ' | ') from public._sent(:q4)));
select public.chk('6.3 empty, nothing or over 500 characters: 22023; 500 exactly is kept',
  :'req_blank' = '22023' and :'req_null' = '22023' and :'req_long' = '22023' and :'req_500' = 'ok',
  concat_ws(' ', :'req_blank', :'req_null', :'req_long', :'req_500'));
select public.chk('6.4 only the owner writes about the menu: her cook and another kitchen 42501, a shop TD013 — nothing kept of them',
  :'req_cook' = '42501' and :'req_otra' = '42501' and :'req_shop' = 'TD013'
  and (select count(*) from servicio.menu_request) = 2,
  concat_ws(' ', :'req_cook', :'req_otra', :'req_shop'));


-- ---- 7. the deletions -------------------------------------------------------------------
-- Otra says Me interesa and writes about her menu; then deletes her kitchen alone.
-- Mari deletes her account, her kitchen with it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format($q$select public.set_kitchen_features(%L, '{"menu": "interesada"}')$q$, :'ws_o')) as otra_int \gset
select public._try(format('select public.send_menu_request(%L, %L)', :'ws_o', 'Quiero mi menú')) as otra_req \gset
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0081')) as del_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.delete_my_account(p_business_names => %L)',
                          array['Fonda Doña Mari 0081'])) as del_mari \gset
reset role;

select public.chk('7.1 a kitchen deleted alone takes its choices and what it wrote about the menu',
  :'otra_int' = 'ok' and :'otra_req' = 'ok' and :'del_otra' = 'ok'
  and not exists (select 1 from servicio.kitchen_feature where workspace_id = :'ws_o')
  and not exists (select 1 from servicio.menu_request where workspace_id = :'ws_o'),
  concat_ws(' ', :'otra_int', :'otra_req', :'del_otra'));
select public.chk('7.2 her account deleted with her kitchen: every choice and every request of it gone — nothing of either is left anywhere',
  :'del_mari' = 'ok'
  and not exists (select 1 from servicio.kitchen_feature)
  and not exists (select 1 from servicio.menu_request),
  :'del_mari');


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
  if (select count(*) from public._verify) <> 29 then
    raise exception 'expected 29 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
