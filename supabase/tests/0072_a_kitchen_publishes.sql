-- ============================================================================
-- 0072 — a kitchen publishes an itacate (`10.4a`): the account's kind, the
-- kitchens' trades, the pin with its line of directions, and listings — every
-- call made AS THE KITCHEN AND AS THE SHOP, under `set role authenticated` with
-- a caller's claims. As `postgres` RLS and `my_locations()` would wave
-- everything through and every check would pass for nothing.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, as `0070`'s suite: a stand-in webhook goes
-- into the vault so the kitchen's Discord line can be read off pg_net's queue,
-- and the rollback takes it out again before pg_net's worker could send it.
-- Inside a transaction `now()` stands still, which the windows below rely on.
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

-- What pg_net's queue holds after one id and up to another, as Discord would show it.
create function public._enviados(p_after bigint, p_until bigint default null)
returns table (content text)
language sql as $$
  select convert_from(q.body, 'UTF8')::jsonb ->> 'content'
    from net.http_request_queue q
   where q.id > p_after and (p_until is null or q.id <= p_until)
   order by q.id
$$;

\set fonda     '''0072aaaa-0000-4000-8000-000000000001'''
\set gerente   '''0072aaaa-0000-4000-8000-000000000002'''
\set cocinera  '''0072aaaa-0000-4000-8000-000000000003'''
\set tendera   '''0072aaaa-0000-4000-8000-000000000004'''
\set otra      '''0072aaaa-0000-4000-8000-000000000005'''
\set nadie     '''0072aaaa-0000-4000-8000-000000000006'''
\set cocinera2 '''0072aaaa-0000-4000-8000-000000000007'''
\set nula      '''0072aaaa-0000-4000-8000-000000000008'''
\set url       '''http://127.0.0.1:9/discord-0072'''

\set p1 '''0072bbbb-0000-4000-8000-000000000001'''
\set p2 '''0072bbbb-0000-4000-8000-000000000002'''
\set p3 '''0072bbbb-0000-4000-8000-000000000003'''
\set p4 '''0072bbbb-0000-4000-8000-000000000004'''
\set p5 '''0072bbbb-0000-4000-8000-000000000005'''
\set p6 '''0072bbbb-0000-4000-8000-000000000006'''
\set pz '''0072bbbb-0000-4000-8000-0000000000ff'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:fonda,     'fonda.0072@example.mx',     jsonb_build_object('full_name', 'Fonda 0072')),
  (:gerente,   'gerente.0072@example.mx',   jsonb_build_object('full_name', 'Gerente 0072')),
  (:cocinera,  'cocinera.0072@example.mx',  jsonb_build_object('full_name', 'Cocinera 0072')),
  (:tendera,   'tendera.0072@example.mx',   jsonb_build_object('full_name', 'Tendera 0072')),
  (:otra,      'otra.0072@example.mx',      jsonb_build_object('full_name', 'Otra 0072')),
  (:nadie,     'nadie.0072@example.mx',     jsonb_build_object('full_name', 'Nadie 0072')),
  (:cocinera2, 'cocinera2.0072@example.mx', jsonb_build_object('full_name', 'Cocinera Dos 0072')),
  (:nula,      'nula.0072@example.mx',      jsonb_build_object('full_name', 'Nula 0072'));

delete from vault.secrets where name = 'discord_avisos_webhook';
select vault.create_secret(:url, 'discord_avisos_webhook', 'stand-in, 0072 suite') is not null as made \gset

-- ---- 1. the account's kind, and the owner's Discord line ----------------------
select coalesce(max(id), 0) as q_t from net.http_request_queue \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
-- Wera's call, exactly as every build in the field sends it: three names.
select onboard_workspace(p_display_name => 'Abarrotes 0072', p_prices_include_tax => true,
                         p_location_name => null) as ws_t \gset
reset role;
select count(*) as n_tiendas from public.workspace where is_active and kind = 'tienda' \gset

select coalesce(max(id), 0) as q_c from net.http_request_queue \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda 0072', p_kind => 'cocina') as ws_c \gset
reset role;
select count(*) as n_cocinas from public.workspace where is_active and kind = 'cocina' \gset

select public.chk('1.1 Wera''s call, three arguments, makes a shop',
  (select kind = 'tienda' from public.workspace where id = :'ws_t'));
select public.chk('1.2 a kitchen''s call makes a kitchen, with its owner, its kitchen and its settings',
  (select kind = 'cocina' from public.workspace where id = :'ws_c')
  and exists (select 1 from public.workspace_member where workspace_id = :'ws_c' and user_id = :fonda and role = 'owner')
  and (select count(*) = 1 from public.location where workspace_id = :'ws_c' and name = 'Fonda 0072')
  and exists (select 1 from public.workspace_setting where workspace_id = :'ws_c'));
select public.chk('1.3 the shop''s Discord line is the shop''s words, and counts shops only',
  (select count(*) from public._enviados(:q_t, :q_c)) = 1
  and (select content from public._enviados(:q_t, :q_c)) = format('🏪 Nueva tienda en Wera. Ya son %s tiendas.', :n_tiendas),
  coalesce((select string_agg(content, ' | ') from public._enviados(:q_t, :q_c)), 'none'));
select public.chk('1.4 a kitchen''s line says cocina, counts kitchens, and names nobody',
  (select count(*) from public._enviados(:q_c)) = 1
  and (select content from public._enviados(:q_c)) = format('🍲 Nueva cocina en Wera Cocina. Ya son %s cocinas.', :n_cocinas)
  and (select position('fonda' in lower(content)) = 0 and position('0072' in content) = 0
         from public._enviados(:q_c)),
  coalesce((select string_agg(content, ' | ') from public._enviados(:q_c)), 'none'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('update public.workspace set kind = %L where id = %L', 'tienda', :'ws_c')) as kind_change \gset
reset role;
select public.chk('1.5 ⚠️ the owner cannot change her account''s kind — 23514, still a kitchen',
  :'kind_change' = '23514' and (select kind = 'cocina' from public.workspace where id = :'ws_c'), :'kind_change');
select public.chk('1.6 the kinds are exactly tienda and cocina, in that order',
  enum_range(null::public.workspace_kind)::text = '{tienda,cocina}');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :nula), true);
set local role authenticated;
select onboard_workspace('Nula 0072', true, null, null) as ws_n \gset
reset role;
select public.chk('1.7 a kind sent as NULL makes a shop, never an account with no kind',
  (select kind = 'tienda' from public.workspace where id = :'ws_n'));

-- ---- 2. the kitchens' trades --------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select (select count(*) from jsonb_array_elements(public.catalog_template() -> 'tags') t
         where t ->> 'kind' = 'giro') as tpl_giros,
       (select count(*) from jsonb_array_elements(public.catalog_template() -> 'tags') t
         where t ->> 'code' in ('giro-fonda', 'giro-restaurante', 'giro-cafeteria', 'giro-panaderia',
                                'giro-comida-para-llevar', 'giro-rosticeria', 'giro-taqueria',
                                'giro-antojitos', 'giro-mariscos')) as tpl_kitchen \gset
reset role;
select public.chk('2.1 ⚠️ Wera''s door shows no kitchen trade, and still the shops'' seven giros',
  :tpl_giros = 7 and :tpl_kitchen = 0, format('giros %s, kitchen trades %s', :tpl_giros, :tpl_kitchen));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :nadie), true);
set local role authenticated;
select public.kitchen_giros()::text as giros \gset
reset role;
select public.chk('2.2 Cocina''s door: the nine trades, in their order, to a person who belongs to nothing yet',
  (select array_agg(e ->> 'code' order by o) from jsonb_array_elements(:'giros'::jsonb) with ordinality x(e, o))
    = array['giro-fonda', 'giro-restaurante', 'giro-cafeteria', 'giro-panaderia', 'giro-comida-para-llevar',
            'giro-rosticeria', 'giro-taqueria', 'giro-antojitos', 'giro-mariscos']
  and (:'giros'::jsonb -> 0 ->> 'label') = 'Fonda o cocina económica', :'giros');
select public.chk('2.3 nobody signed out reaches it',
  not has_function_privilege('anon', 'public.kitchen_giros()', 'execute'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('update public.workspace set giro_principal = %L where id = %L', 'giro-fonda', :'ws_c')) as c_takes_fonda \gset
select public._try(format('update public.workspace set giro_principal = %L where id = %L', 'giro-abarrotes', :'ws_c')) as c_takes_shop \gset
reset role;
select public.chk('2.4 the kitchen names a kitchen trade as its giro',
  :'c_takes_fonda' = 'ok'
  and (select giro_principal from public.workspace where id = :'ws_c') = 'giro-fonda', :'c_takes_fonda');
select public.chk('2.5 ⚠️ the kitchen cannot take a shop''s giro — 23514, its trade stands',
  :'c_takes_shop' = '23514'
  and (select giro_principal from public.workspace where id = :'ws_c') = 'giro-fonda', :'c_takes_shop');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('update public.workspace set giro_principal = %L where id = %L', 'giro-fonda', :'ws_t')) as t_takes_fonda \gset
select public._try(format('update public.workspace set giro_principal = %L where id = %L', 'giro-abarrotes', :'ws_t')) as t_takes_shop \gset
reset role;
select public.chk('2.6 ⚠️ a shop cannot take a kitchen''s trade — 23514',
  :'t_takes_fonda' = '23514', :'t_takes_fonda');
select public.chk('2.7 and a shop still takes its own giro, as Ajustes sets it',
  :'t_takes_shop' = 'ok'
  and (select giro_principal from public.workspace where id = :'ws_t') = 'giro-abarrotes', :'t_takes_shop');

-- ---- 3. the pin, and its line of directions -----------------------------------
select id as loc_c from public.location where workspace_id = :'ws_c' \gset
select id as loc_t from public.location where workspace_id = :'ws_t' \gset

insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws_c', :gerente,  'manager', 'Gerente 0072'),
  (:'ws_c', :cocinera, 'staff',   'Cocinera 0072');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws_c', id, :'loc_c' from public.workspace_member where workspace_id = :'ws_c' and user_id = :cocinera;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_pin(%L, %s, %s, %L)',
  :'loc_c', '19.4326077', '-99.1332080', '  Portón verde, junto a la farmacia  ')) as owner_pin \gset
reset role;
select public.chk('3.1 the owner sets her pin, to six decimals, and its line, trimmed',
  :'owner_pin' = 'ok'
  and (select pin_lat = 19.432608 and pin_lng = -99.133208
              and directions = 'Portón verde, junto a la farmacia'
         from public.location where id = :'loc_c'), :'owner_pin');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.set_store_pin(%L, 19.5, -99.2)', :'loc_c')) as mgr_pin \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
select public._try(format('select public.set_store_pin(%L, 19.5, -99.2)', :'loc_c')) as staff_pin \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select public._try(format('select public.set_store_pin(%L, 19.5, -99.2)', :'loc_c')) as shop_pin \gset
reset role;
select public.chk('3.2 ⚠️ a manager is refused — TD012, the pin stands',
  :'mgr_pin' = 'TD012' and (select pin_lat = 19.432608 from public.location where id = :'loc_c'), :'mgr_pin');
select public.chk('3.3 ⚠️ so is a cook — TD012',
  :'staff_pin' = 'TD012' and (select pin_lat = 19.432608 from public.location where id = :'loc_c'), :'staff_pin');
select public.chk('3.4 ⚠️ and the owner of a shop, for a kitchen that is not hers — TD012',
  :'shop_pin' = 'TD012' and (select pin_lat = 19.432608 from public.location where id = :'loc_c'), :'shop_pin');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_pin(%L, 91, -99.2)', :'loc_c')) as pin_off_earth \gset
select public._try(format('select public.set_store_pin(%L, 19.5, null)', :'loc_c')) as pin_half \gset
select public._try(format('select public.set_store_pin(%L, 0, 0)', :'loc_c')) as pin_zero \gset
select public._try(format('select public.set_store_pin(%L, 19.5, -99.2, %L)', :'loc_c', repeat('a', 141))) as dir_long \gset
select public._try(format('select public.set_store_pin(%L, 19.5, -99.2, %L)', :'loc_c', E'Portón\nverde')) as dir_two_lines \gset
reset role;
select public.chk('3.5 a pin off the map, half a pin, or the sea at 0,0 is refused — 22023, the pin stands',
  :'pin_off_earth' = '22023' and :'pin_half' = '22023' and :'pin_zero' = '22023'
  and (select pin_lat = 19.432608 from public.location where id = :'loc_c'),
  format('%s %s %s', :'pin_off_earth', :'pin_half', :'pin_zero'));
select public.chk('3.6 directions over 140 characters, or on two lines, are refused — 22023',
  :'dir_long' = '22023' and :'dir_two_lines' = '22023'
  and (select directions = 'Portón verde, junto a la farmacia' from public.location where id = :'loc_c'),
  format('%s %s', :'dir_long', :'dir_two_lines'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_pin(%L, 19.4326077, -99.1332080, %L)', :'loc_c', '   ')) as dir_blank \gset
reset role;
select public.chk('3.7 blank directions are no directions',
  :'dir_blank' = 'ok' and (select directions is null from public.location where id = :'loc_c'), :'dir_blank');
select public._try(format('update public.location set pin_lng = null where id = %L', :'loc_c')) as table_half \gset
select public.chk('3.8 the table itself refuses half a pin — 23514',
  :'table_half' = '23514', :'table_half');

-- ---- 4. publishing ------------------------------------------------------------
select (now() + interval '30 minutes')::text as w1s, (now() + interval '90 minutes')::text as w1e,
       (now() - interval '2 hours')::text as old_s, (now() - interval '1 hour')::text as old_e,
       (now() + interval '13 hours 30 minutes')::text as long_e,
       (now() + interval '25 hours')::text as far_s, (now() + interval '26 hours')::text as far_e \gset

select $j$[{"name": "  Comida corrida  ", "description": "Sopa, arroz y guisado del día.",
            "tags": ["pica", "cerdo", "pica"], "unit_price": "65.00", "quantity": 4},
           {"name": "Bolsa de pan", "description": "  ", "tags": [], "unit_price": 45,
            "quantity": "5", "surprise": true, "usual_price": "90.00"}]$j$ as l_two \gset
select $j$[{"name": "Tinga", "unit_price": "60.00", "quantity": 2}]$j$ as l_one \gset
select $j$[{"name": "Chile relleno", "unit_price": "60.00", "quantity": 1, "tags": null}]$j$ as l_null_tags \gset
select jsonb_agg(jsonb_build_object('name', 'Plato ' || g, 'unit_price', 10, 'quantity', 1))::text as l_eleven
  from generate_series(1, 11) g \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public.publish_listing(:p1, :'loc_c', :'w1s', :'w1e', :'l_two') as published \gset
select public.publish_listing(:p1, :'loc_c', :'w1s', :'w1e', :'l_two') as published_again \gset
reset role;
select public.chk('4.1 the owner publishes a dish and a surprise bag in one call, and gets its id back',
  :'published'::uuid = :p1::uuid
  and (select count(*) = 1 from public.listing
        where id = :p1 and workspace_id = :'ws_c' and location_id = :'loc_c'
          and created_by = :fonda and withdrawn_at is null)
  and (select count(*) = 2 from public.listing_line where listing_id = :p1), :'published');
select public.chk('4.2 her order is kept, the name trimmed, the tags once each, a blank description none',
  (select name = 'Comida corrida' and tags = '{cerdo,pica}' and unit_price = 65.00 and quantity = 4
          and not surprise and usual_price is null
          and description = 'Sopa, arroz y guisado del día.'
     from public.listing_line where listing_id = :p1 and line_no = 1)
  and (select name = 'Bolsa de pan' and surprise and usual_price = 90.00 and quantity = 5
          and description is null and tags = '{}'
     from public.listing_line where listing_id = :p1 and line_no = 2));
select public.chk('4.3 the same publication sent twice is one — its id again, nothing new written',
  :'published_again'::uuid = :p1::uuid
  and (select count(*) = 1 from public.listing where workspace_id = :'ws_c')
  and (select count(*) = 2 from public.listing_line where workspace_id = :'ws_c'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :p2, :'loc_c', :'w1s', :'w1e', :'l_one')) as mgr_pub \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :p3, :'loc_c', :'w1s', :'w1e', :'l_one')) as staff_pub \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :p3, :'loc_t', :'w1s', :'w1e', :'l_one')) as shop_pub \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :p3, :'loc_c', :'w1s', :'w1e', :'l_one')) as shop_at_kitchen \gset
reset role;
select public.chk('4.4 a manager publishes (question 3)',
  :'mgr_pub' = 'ok' and exists (select 1 from public.listing where id = :p2), :'mgr_pub');
select public.chk('4.5 ⚠️ a cook does not — 42501, nothing written',
  :'staff_pub' = '42501' and not exists (select 1 from public.listing where id = :p3), :'staff_pub');
select public.chk('4.6 ⚠️ a shop does not publish until Ofrecer — TD013, nothing written',
  :'shop_pub' = 'TD013' and not exists (select 1 from public.listing where id = :p3), :'shop_pub');
select public.chk('4.7 ⚠️ nor at a kitchen that is not hers — 42501',
  :'shop_at_kitchen' = '42501' and not exists (select 1 from public.listing where id = :p3), :'shop_at_kitchen');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Cocina Otra 0072', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :p1, :'loc_o', :'w1s', :'w1e', :'l_one')) as stolen_id \gset
reset role;
select public.chk('4.8 ⚠️ another kitchen sending this publication''s id is refused — 42501, it stays the first kitchen''s',
  :'stolen_id' = '42501'
  and (select workspace_id = :'ws_c' from public.listing where id = :p1), :'stolen_id');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.publish_listing(null, %L, %L, %L, %L)', :'loc_c', :'w1s', :'w1e', :'l_one')) as m_no_id \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e', '[]')) as m_no_lines \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e', '{}')) as m_not_list \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e', :'l_eleven')) as m_eleven \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e',
  '[{"name": "Tinga", "unit_price": 0, "quantity": 1}]')) as m_free \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e',
  '[{"name": "Tinga", "unit_price": "65.005", "quantity": 1}]')) as m_centavo \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e',
  '[{"name": "Tinga", "unit_price": "65.00", "quantity": 2.5}]')) as m_half \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e',
  '[{"name": "Tinga", "unit_price": "65.00", "quantity": 1, "usual_price": "65.00"}]')) as m_usual \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e',
  '[{"name": "Tinga", "unit_price": "65.00", "quantity": 1, "tags": ["picante"]}]')) as m_tag \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e',
  '[{"name": "   ", "unit_price": "65.00", "quantity": 1}]')) as m_no_name \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'w1e',
  '[{"name": "Tinga", "unit_price": "sesenta", "quantity": 1}]')) as m_words \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'old_s', :'old_e', :'l_one')) as m_ended \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1s', :'long_e', :'l_one')) as m_long \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'far_s', :'far_e', :'l_one')) as m_far \gset
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :pz, :'loc_c', :'w1e', :'w1s', :'l_one')) as m_backwards \gset
reset role;
select public.chk('4.9 no id, no lines, lines that are not a list, or eleven of them — 22023',
  :'m_no_id' = '22023' and :'m_no_lines' = '22023' and :'m_not_list' = '22023' and :'m_eleven' = '22023',
  format('%s %s %s %s', :'m_no_id', :'m_no_lines', :'m_not_list', :'m_eleven'));
select public.chk('4.10 a price of zero, a price below the centavo, or a price in words — 22023',
  :'m_free' = '22023' and :'m_centavo' = '22023' and :'m_words' = '22023',
  format('%s %s %s', :'m_free', :'m_centavo', :'m_words'));
select public.chk('4.11 half a comida, a usual price not above the price, a tag off the list, no name — 22023',
  :'m_half' = '22023' and :'m_usual' = '22023' and :'m_tag' = '22023' and :'m_no_name' = '22023',
  format('%s %s %s %s', :'m_half', :'m_usual', :'m_tag', :'m_no_name'));
select public.chk('4.12 a window that has ended, lasts over twelve hours, starts over a day ahead, or runs backwards — 22023',
  :'m_ended' = '22023' and :'m_long' = '22023' and :'m_far' = '22023' and :'m_backwards' = '22023',
  format('%s %s %s %s', :'m_ended', :'m_long', :'m_far', :'m_backwards'));
select public.chk('4.13 and none of those wrote anything',
  not exists (select 1 from public.listing where id = :pz)
  and (select count(*) = 2 from public.listing where workspace_id = :'ws_c'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.publish_listing(%L, %L, %L, %L, %L)', :p5, :'loc_c', :'w1s', :'w1e', :'l_null_tags')) as null_tags \gset
select public._try(format(
  'insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by) values (%L, %L, %L, %L, %L, %L)',
  :pz, :'ws_c', :'loc_c', :'w1s', :'w1e', :fonda)) as direct_insert \gset
reset role;
select public.chk('4.14 tags sent as null are no tags',
  :'null_tags' = 'ok' and (select tags = '{}' from public.listing_line where listing_id = :p5), :'null_tags');
select public.chk('4.15 ⚠️ the table takes no write but the door''s — the owner''s own insert is 42501',
  :'direct_insert' = '42501' and not exists (select 1 from public.listing where id = :pz), :'direct_insert');

-- ---- 5. who reads it: the kitchen's members at their own kitchens, nobody else --
insert into public.location (workspace_id, name) values (:'ws_c', 'Fonda 0072 — Mercado') returning id as loc_c2 \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
  values (:'ws_c', :cocinera2, 'staff', 'Cocinera Dos 0072');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws_c', id, :'loc_c2' from public.workspace_member where workspace_id = :'ws_c' and user_id = :cocinera2;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public.publish_listing(:p4, :'loc_c2', :'w1s', :'w1e', :'l_one') is not null as p4_made \gset
select (select count(*) from public.listing) as own_l, (select count(*) from public.listing_line) as own_ll \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
select (select count(*) from public.listing) as mgr_l, (select count(*) from public.listing_line) as mgr_ll \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
select (select count(*) from public.listing) as c1_l, (select count(*) from public.listing_line) as c1_ll,
       (select count(*) from public.listing where location_id = :'loc_c2') as c1_other \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera2), true);
select (select count(*) from public.listing) as c2_l, (select count(*) from public.listing_line) as c2_ll \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select (select count(*) from public.listing) as shop_l, (select count(*) from public.listing_line) as shop_ll \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
select (select count(*) from public.listing) as otra_l, (select count(*) from public.listing_line) as otra_ll \gset
reset role;
select set_config('request.jwt.claims', null, true);
set local role anon;
select public._try('select count(*) from public.listing') as anon_l \gset
select public._try('select count(*) from public.listing_line') as anon_ll \gset
reset role;

select (select count(*) from public.listing where workspace_id = :'ws_c') as all_l,
       (select count(*) from public.listing_line where workspace_id = :'ws_c') as all_ll \gset
select public.chk('5.1 the owner reads every publication of her kitchens, and every line',
  :own_l = :all_l and :own_ll = :all_ll and :all_l = 4 and :all_ll = 5,
  format('owner %s/%s of %s/%s', :own_l, :own_ll, :all_l, :all_ll));
select public.chk('5.2 so does a manager',
  :mgr_l = :all_l and :mgr_ll = :all_ll, format('%s/%s', :mgr_l, :mgr_ll));
select public.chk('5.3 ⚠️ a cook reads her own kitchen''s and none of the other branch''s',
  :c1_l = 3 and :c1_ll = 4 and :c1_other = 0, format('%s/%s, other branch %s', :c1_l, :c1_ll, :c1_other));
select public.chk('5.4 ⚠️ and the other branch''s cook reads only hers',
  :c2_l = 1 and :c2_ll = 1, format('%s/%s', :c2_l, :c2_ll));
select public.chk('5.5 ⚠️ a shop''s owner reads nothing of a kitchen''s',
  :shop_l = 0 and :shop_ll = 0, format('%s/%s', :shop_l, :shop_ll));
select public.chk('5.6 ⚠️ nor does another kitchen''s owner',
  :otra_l = 0 and :otra_ll = 0, format('%s/%s', :otra_l, :otra_ll));
select public.chk('5.7 ⚠️ signed out, both tables refuse outright — 42501',
  :'anon_l' = '42501' and :'anon_ll' = '42501', format('%s %s', :'anon_l', :'anon_ll'));

-- ---- 6. withdrawing -----------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
set local role authenticated;
select public._try(format('select public.withdraw_listing(%L)', :p1)) as staff_wd \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select public._try(format('select public.withdraw_listing(%L)', :p1)) as shop_wd \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
select public._try(format('select public.withdraw_listing(%L)', :p1)) as mgr_wd \gset
reset role;
select public.chk('6.1 ⚠️ a cook cannot take a publication down — 42501',
  :'staff_wd' = '42501', :'staff_wd');
select public.chk('6.2 ⚠️ nor can a shop''s owner — 42501',
  :'shop_wd' = '42501', :'shop_wd');
select public.chk('6.3 a manager takes it down',
  :'mgr_wd' = 'ok' and (select withdrawn_at is not null from public.listing where id = :p1), :'mgr_wd');

update public.listing set withdrawn_at = now() - interval '1 hour' where id = :p1;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.withdraw_listing(%L)', :p1)) as again_wd \gset
reset role;
select public.chk('6.4 taken down once: a second call keeps the first moment',
  :'again_wd' = 'ok'
  and (select withdrawn_at = now() - interval '1 hour' from public.listing where id = :p1), :'again_wd');

-- ---- 7. the account's deletion takes the kitchen's publications with it ---------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.publish_listing(:p6, :'loc_o', :'w1s', :'w1e', :'l_one') is not null as p6_made \gset
select public._try(format('select public.delete_my_account(%L)', 'Cocina Otra 0072')) as otra_deleted \gset
reset role;
select public.chk('7.1 a kitchen''s owner deletes her account: the kitchen, its publications and lines go too',
  :'otra_deleted' = 'ok'
  and not exists (select 1 from public.workspace where id = :'ws_o')
  and not exists (select 1 from public.listing where workspace_id = :'ws_o')
  and not exists (select 1 from public.listing_line where workspace_id = :'ws_o'), :'otra_deleted');

-- ---- 8. the walls -----------------------------------------------------------------
select public.chk('8.1 the four doors answer a signed-in person and nobody signed out',
  has_function_privilege('authenticated', 'public.kitchen_giros()', 'execute')
  and has_function_privilege('authenticated', 'public.set_store_pin(uuid, numeric, numeric, text)', 'execute')
  and has_function_privilege('authenticated', 'public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.withdraw_listing(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.set_store_pin(uuid, numeric, numeric, text)', 'execute')
  and not has_function_privilege('anon', 'public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.withdraw_listing(uuid)', 'execute'));
select public.chk('8.2 the two trigger functions are executable by no client',
  not has_function_privilege('authenticated', 'public.workspace_kind_never_changes()', 'execute')
  and not has_function_privilege('anon', 'public.workspace_kind_never_changes()', 'execute')
  and not has_function_privilege('authenticated', 'public.workspace_giro_fits_kind()', 'execute')
  and not has_function_privilege('anon', 'public.workspace_giro_fits_kind()', 'execute'));
select public.chk('8.3 a signed-in person may only read the two tables; signed out, nothing',
  has_table_privilege('authenticated', 'public.listing', 'select')
  and has_table_privilege('authenticated', 'public.listing_line', 'select')
  and not has_table_privilege('authenticated', 'public.listing', 'insert, update, delete')
  and not has_table_privilege('authenticated', 'public.listing_line', 'insert, update, delete')
  and not has_table_privilege('anon', 'public.listing', 'select, insert, update, delete')
  and not has_table_privilege('anon', 'public.listing_line', 'select, insert, update, delete'));

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 52 then
    raise exception 'expected 52 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
