-- ============================================================================
-- 0087 — promotions (`10.9g-i`; the owner's rulings of 2026-11-05, calls 23–25,
-- and G18, G28–G30, G36 and G38 of 2026-11-16 and 17). Every call is made AS
-- THE PERSON, under `set role authenticated` with her claims; Wera's switches,
-- days gone by and a moment two minutes back are set as postgres, as the owner
-- and the clock set them on the live database.
--
-- Section 1 the shape. Section 2 reading them. Section 3 making one. Section 4
-- the shapes refused. Section 5 three at most. Section 6 an offer joins one.
-- Section 7 what a neighbour sees. Section 8 Terminarla hoy. Section 9
-- Deshacer. Section 10 Para tus clientes and her card. Section 11 turned off,
-- by her or by Wera. Section 12 the deletions.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, so `now()` is one moment throughout. A
-- refused call is made through `_try`, whose handler undoes whatever it began.
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
  insert into public._answer (who, body) values (p_who, v_body)
  on conflict (who) do update set body = excluded.body;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._call_as_me(text, text) to authenticated;

create function public._a(p_who text)
returns jsonb language sql as $$ select a.body from public._answer a where a.who = p_who $$;

-- A kitchen as the door sends it, from an answer kept under `p_who`.
create function public._kitchen(p_who text, p_ws text)
returns jsonb language sql as $$
  select k from jsonb_array_elements(public._a(p_who)) k where k ->> 'id' = p_ws
$$;

-- One promotion of a kitchen's, from a `kitchen_promotions` answer kept under `p_who`.
create function public._promo(p_who text, p_id text)
returns jsonb language sql as $$
  select p from jsonb_array_elements(public._a(p_who) -> 'promotions') p where p ->> 'id' = p_id
$$;

-- The call *Publicar promoción* makes, as SQL: every argument by its name, as PostgREST sends them.
create function public._mk(p_ws text, p_id text, p_kind text, p_days integer[], p_ends date,
                           p_what text default 'Pozole rojo', p_more text default null,
                           p_photo text default null,
                           p_cond text default 'Todos los días, hasta el fin de mes, en Fonda Doña Mari, Sabino 120.')
returns text language sql as $$
  select format('select public.create_promotion(p_workspace_id => %L, p_id => %L, p_kind => %L, '
                'p_what => %L, p_more => %L, p_image_path => %L, p_days => %L::integer[], '
                'p_ends_on => %L::date, p_conditions => %L)',
                p_ws, p_id, p_kind, p_what, p_more, p_photo, p_days, p_ends, p_cond)
$$;
grant execute on function public._mk(text, text, text, integer[], date, text, text, text, text) to authenticated;

\set mari    '''0087aaaa-0000-4000-8000-000000000001'''
\set cook    '''0087aaaa-0000-4000-8000-000000000002'''
\set otra    '''0087aaaa-0000-4000-8000-000000000003'''
\set tendera '''0087aaaa-0000-4000-8000-000000000004'''
\set ana     '''0087aaaa-0000-4000-8000-000000000005'''
\set sola    '''0087aaaa-0000-4000-8000-000000000006'''
\set p1      '''0087bbbb-0000-4000-8000-000000000001'''
\set p2      '''0087bbbb-0000-4000-8000-000000000002'''
\set p3      '''0087bbbb-0000-4000-8000-000000000003'''
\set p4      '''0087bbbb-0000-4000-8000-000000000004'''
\set p5      '''0087bbbb-0000-4000-8000-000000000005'''
\set pc      '''0087bbbb-0000-4000-8000-000000000006'''
\set px      '''0087bbbb-0000-4000-8000-000000000007'''
\set pu      '''0087bbbb-0000-4000-8000-000000000008'''
\set ps      '''0087bbbb-0000-4000-8000-000000000009'''
\set pt      '''0087bbbb-0000-4000-8000-00000000000a'''
\set lm      '''0087cccc-0000-4000-8000-000000000001'''
\set lj      '''0087cccc-0000-4000-8000-000000000002'''
\set lk      '''0087cccc-0000-4000-8000-000000000003'''
\set ln      '''0087cccc-0000-4000-8000-000000000004'''
\set lo      '''0087cccc-0000-4000-8000-000000000005'''
\set lu      '''0087cccc-0000-4000-8000-000000000006'''
\set ls      '''0087cccc-0000-4000-8000-000000000007'''
\set lt      '''0087cccc-0000-4000-8000-000000000008'''
\set lw      '''0087cccc-0000-4000-8000-000000000009'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,    'mari.0087@example.mx',    jsonb_build_object('full_name', 'Mari 0087')),
  (:cook,    'cook.0087@example.mx',    jsonb_build_object('full_name', 'Cook 0087')),
  (:otra,    'otra.0087@example.mx',    jsonb_build_object('full_name', 'Otra 0087')),
  (:tendera, 'tendera.0087@example.mx', jsonb_build_object('full_name', 'Tendera 0087')),
  (:ana,     'ana.0087@example.mx',     jsonb_build_object('full_name', 'Ana Rodríguez')),
  (:sola,    'sola.0087@example.mx',    jsonb_build_object('full_name', 'Sola 0087'));

-- Mari's kitchen with her cook (staff); Otra's kitchen; Sola's kitchen; a shop.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0087', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :cook, 'staff', 'Cook 0087');
insert into public.member_location (workspace_id, member_id, location_id)
select :'ws_m', wm.id, :'loc_m' from public.workspace_member wm where wm.workspace_id = :'ws_m' and wm.user_id = :cook;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0087', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :sola), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Sola 0087', p_kind => 'cocina') as ws_s \gset
reset role;
select id as loc_s from public.location where workspace_id = :'ws_s' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0087') as ws_t \gset
reset role;

-- Her kitchen's day and weekday, and a weekday that is not today's.
select servicio.kitchen_today(:'ws_m') as today,
       extract(isodow from servicio.kitchen_today(:'ws_m'))::int as dow,
       (extract(isodow from servicio.kitchen_today(:'ws_m'))::int % 7) + 1 as other_dow \gset

-- Wera's switch for promotions starts off, as `0081` left it.
update servicio.feature_switch set is_on = false where name in ('promociones', 'tarjeta');


-- ---- 1. The shape ------------------------------------------------------------------------
select public.chk('1.1 promotions live in servicio, and no client role holds any right on them',
  to_regclass('servicio.promotion') is not null
  and not has_table_privilege('authenticated', 'servicio.promotion', 'select')
  and not has_table_privilege('anon', 'servicio.promotion', 'select')
  and not has_table_privilege('authenticated', 'servicio.promotion', 'insert'));
select public.chk('1.2 an offer gains promotion_id, none by default, NULL again when its promotion goes',
  (select is_nullable = 'YES' and column_default is null
     from information_schema.columns
    where table_schema = 'public' and table_name = 'listing' and column_name = 'promotion_id')
  and (select confdeltype = 'n' from pg_constraint
        where conrelid = 'public.listing'::regclass and contype = 'f'
          and confrelid = 'servicio.promotion'::regclass));
select public.chk('1.3 publish_listing is ONE function, its sixth argument p_promotion_id defaulted (never an overload)',
  (select count(*) from pg_proc where proname = 'publish_listing' and pronamespace = 'public'::regnamespace) = 1
  and (select pronargs = 6 and pronargdefaults = 1 and proargnames[6] = 'p_promotion_id'
         from pg_proc where proname = 'publish_listing' and pronamespace = 'public'::regnamespace));
select public.chk('1.4 the four functions the app calls answer a signed-in person and nobody signed out',
  has_function_privilege('authenticated', 'public.kitchen_promotions(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.create_promotion(uuid, uuid, text, text, text, text, integer[], date, text)', 'execute')
  and has_function_privilege('authenticated', 'public.end_promotion(uuid, uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.undo_promotion(uuid, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_promotions(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.create_promotion(uuid, uuid, text, text, text, text, integer[], date, text)', 'execute')
  and not has_function_privilege('anon', 'public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb, uuid)', 'execute'));


-- ---- 2. Reading them ---------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('cook-read', format('select public.kitchen_promotions(%L)', :'ws_m')) as cook_read \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.kitchen_promotions(%L)', :'ws_m')) as otra_read \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.kitchen_promotions(%L)', :'ws_t')) as shop_read \gset
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select public._try(format('select public.kitchen_promotions(%L)', :'ws_m')) as anon_read \gset
reset role;

select public.chk('2.1 every member reads her kitchen''s promotions — the helper too (G36: she publishes); none yet',
  :'cook_read' = 'ok'
  and public._a('cook-read') -> 'promotions' = '[]'::jsonb
  and (public._a('cook-read') ->> 'running')::int = 0
  and (public._a('cook-read') ->> 'max')::int = 3
  and public._a('cook-read') ->> 'day' = :'today'
  and (public._a('cook-read') -> 'card_open') = 'false'::jsonb,
  coalesce(public._a('cook-read')::text, :'cook_read'));
select public.chk('2.2 not a member: 42501; a shop: TD013; signed out: refused',
  :'otra_read' = '42501' and :'shop_read' = 'TD013' and :'anon_read' = '42501',
  concat_ws(' ', :'otra_read', :'shop_read', :'anon_read'));


-- ---- 3. Making one -----------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(public._mk(:'ws_m', :p1, 'nuevo', array[1,2,3,4,5,6,7], (:'today'::date + 10))) as off_try \gset
reset role;
select public.chk('3.1 Wera''s switch off: nobody makes one (TD024), and nothing is written',
  :'off_try' = 'TD024' and not exists (select 1 from servicio.promotion where workspace_id = :'ws_m'),
  :'off_try');

update servicio.feature_switch set is_on = true where name = 'promociones';

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(public._mk(:'ws_m', :p1, 'nuevo', array[1,2,3,4,5,6,7], (:'today'::date + 10))) as cook_make \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('make-1', public._mk(:'ws_m', :p1, 'nuevo', array[7,1,3,3], (:'today'::date + 10),
  '  Enchiladas potosinas  ', '  Rojas, con queso  ')) as make_1 \gset
select public._call_as_me('make-1-again', public._mk(:'ws_m', :p1, 'temporada', array[2], (:'today'::date + 3),
  'Otra cosa')) as make_1_again \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(public._mk(:'ws_o', :p1, 'nuevo', array[1], (:'today'::date + 10))) as otra_same_id \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(public._mk(:'ws_t', :px, 'nuevo', array[1], (:'today'::date + 10))) as shop_make \gset
reset role;

select public.chk('3.2 a helper does not make one (42501: promotions are the owner''s, G18); nor a shop (TD013)',
  :'cook_make' = '42501' and :'shop_make' = 'TD013', concat_ws(' ', :'cook_make', :'shop_make'));
select public.chk('3.3 the owner makes one: begins today, its fields trimmed, its days sorted and once each, running and shown',
  :'make_1' = 'ok'
  and public._promo('make-1', :p1) ->> 'kind' = 'nuevo'
  and public._promo('make-1', :p1) ->> 'what' = 'Enchiladas potosinas'
  and public._promo('make-1', :p1) ->> 'more' = 'Rojas, con queso'
  and public._promo('make-1', :p1) -> 'days' = '[1, 3, 7]'::jsonb
  and public._promo('make-1', :p1) ->> 'starts_on' = :'today'
  and public._promo('make-1', :p1) ->> 'ends_on' = to_char(:'today'::date + 10, 'YYYY-MM-DD')
  and public._promo('make-1', :p1) ->> 'state' = 'activa'
  and public._promo('make-1', :p1) -> 'ended_on' = 'null'::jsonb
  and public._promo('make-1', :p1) -> 'shown' = 'true'::jsonb
  and (public._promo('make-1', :p1) ->> 'offers_today')::int = 0
  and (public._a('make-1') ->> 'running')::int = 1,
  coalesce(public._a('make-1')::text, :'make_1'));
select public.chk('3.4 making one turns her choice of promotions on (as setting up her card does)',
  exists (select 1 from servicio.kitchen_feature
           where workspace_id = :'ws_m' and feature = 'promociones' and state = 'on'));
select public.chk('3.5 a retry with the same id is that promotion as it stands — nothing new, nothing changed',
  :'make_1_again' = 'ok'
  and (select count(*) from servicio.promotion where workspace_id = :'ws_m') = 1
  and public._promo('make-1-again', :p1) ->> 'kind' = 'nuevo'
  and public._promo('make-1-again', :p1) ->> 'what' = 'Enchiladas potosinas',
  coalesce(public._a('make-1-again')::text, :'make_1_again'));
select public.chk('3.6 the same id from another kitchen is refused (22023), never that kitchen''s promotion',
  :'otra_same_id' = '22023', :'otra_same_id');


-- ---- 4. The shapes refused ---------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(public._mk(:'ws_m', :px, 'oferta', array[1], (:'today'::date + 1))) as bad_kind \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), '   ')) as bad_what_0 \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), repeat('a', 41))) as bad_what_41 \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), 'Pozole', repeat('m', 81))) as bad_more \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), 'Pozole', null,
  :'ws_o' || '/0087dddd-0000-4000-8000-000000000001')) as bad_photo \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), E'\t')) as bad_what_tab \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), E'Pozole\nrojo')) as bad_what_lines \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), 'Pozole', E'Rojo\nverde')) as bad_more_lines \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), 'Pozole', null, null, E'\n')) as bad_cond_line \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[]::integer[], (:'today'::date + 1))) as bad_days_0 \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1, 8], (:'today'::date + 1))) as bad_days_8 \gset
select public._try(public._mk(:'ws_m', :px, 'dia', array[1,2,3,4,5,6,7], (:'today'::date + 1))) as bad_dia_all \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date - 1))) as bad_past \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 57))) as bad_57 \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), 'Pozole', null, null, '  ')) as bad_cond_0 \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 1), 'Pozole', null, null, repeat('c', 401))) as bad_cond_401 \gset
select public._try(format('select public.create_promotion(%L, null, %L, %L, null, null, array[1], %L::date, %L)',
  :'ws_m', 'nuevo', 'Pozole', :'today'::date + 1, 'Condiciones')) as bad_no_id \gset
reset role;

select public.chk('4.1 every field out of its shape is refused 22023 — kind, what (one line, 1–40: a tab alone is blank), more (one line, ≤ 80), a photo not in her folder, conditions of a line break alone',
  :'bad_kind' = '22023' and :'bad_what_0' = '22023' and :'bad_what_41' = '22023'
  and :'bad_more' = '22023' and :'bad_photo' = '22023'
  and :'bad_what_tab' = '22023' and :'bad_what_lines' = '22023' and :'bad_more_lines' = '22023'
  and :'bad_cond_line' = '22023',
  concat_ws(' ', :'bad_kind', :'bad_what_0', :'bad_what_41', :'bad_more', :'bad_photo',
            :'bad_what_tab', :'bad_what_lines', :'bad_more_lines', :'bad_cond_line'));
select public.chk('4.2 the days are 1 to 7, at least one, and un día especial names its days, not all seven',
  :'bad_days_0' = '22023' and :'bad_days_8' = '22023' and :'bad_dia_all' = '22023',
  concat_ws(' ', :'bad_days_0', :'bad_days_8', :'bad_dia_all'));
select public.chk('4.3 it ends from today to eight weeks on: yesterday and 57 days refused',
  :'bad_past' = '22023' and :'bad_57' = '22023', concat_ws(' ', :'bad_past', :'bad_57'));
select public.chk('4.4 the conditions are 1 to 400 characters, and the phone makes the id',
  :'bad_cond_0' = '22023' and :'bad_cond_401' = '22023' and :'bad_no_id' = '22023'
  and not exists (select 1 from servicio.promotion where id = :px),
  concat_ws(' ', :'bad_cond_0', :'bad_cond_401', :'bad_no_id'));


-- ---- 5. Three at most --------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(public._mk(:'ws_m', :p2, 'dia', array[:'dow']::integer[], (:'today'::date + 56), 'Jueves pozolero')) as make_2 \gset
select public._try(public._mk(:'ws_m', :p3, 'temporada', array[:'other_dow']::integer[], (:'today'::date + 20), 'Romeritos')) as make_3 \gset
select public._try(public._mk(:'ws_m', :p4, 'nuevo', array[1,2,3,4,5,6,7], (:'today'::date + 5), 'Chiles en nogada')) as make_4 \gset
reset role;
-- One transaction is one moment: the first two are made earlier in the day, as the clock would have it.
update servicio.promotion set created_at = now() - interval '3 hours' where id = :p1;
update servicio.promotion set created_at = now() - interval '2 hours' where id = :p2;
select public.chk('5.1 three run at once; a fourth is refused (TD029: end one to make another, G29)',
  :'make_2' = 'ok' and :'make_3' = 'ok' and :'make_4' = 'TD029'
  and (select count(*) from servicio.promotion where workspace_id = :'ws_m') = 3,
  concat_ws(' ', :'make_2', :'make_3', :'make_4'));
-- One of the three is past its last day (as the calendar will make it): it no longer counts.
update servicio.promotion set starts_on = :'today'::date - 20, ends_on = :'today'::date - 1,
                              created_at = now() - interval '20 days'
 where id = :p3;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('make-4', public._mk(:'ws_m', :p4, 'nuevo', array[1,2,3,4,5,6,7], (:'today'::date + 5), 'Chiles en nogada')) as make_4b \gset
reset role;
select public.chk('5.2 one past its last day is over: not counted, read as terminada on its last day, never shown',
  :'make_4b' = 'ok'
  and (public._a('make-4') ->> 'running')::int = 3
  and public._promo('make-4', :p3) ->> 'state' = 'terminada'
  and public._promo('make-4', :p3) ->> 'ended_on' = to_char(:'today'::date - 1, 'YYYY-MM-DD')
  and public._promo('make-4', :p3) -> 'shown' = 'false'::jsonb,
  coalesce(public._a('make-4')::text, :'make_4b'));
select public.chk('5.3 the running ones first, newest first; then the ended',
  (select array_agg(p ->> 'id' order by o) from jsonb_array_elements(public._a('make-4') -> 'promotions') with ordinality t(p, o))
    = array[:p4, :p2, :p1, :p3]::text[],
  (select string_agg(p ->> 'what', ' · ' order by o) from jsonb_array_elements(public._a('make-4') -> 'promotions') with ordinality t(p, o)));


-- ---- 6. An offer joins one (G30) ---------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :lj, :'loc_m', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Pozole rojo", "unit_price": "70.00", "quantity": 10}]', :p2)) as join_today \gset
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :lk, :'loc_m', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Romeritos", "unit_price": "80.00", "quantity": 5}]', :p3)) as join_over \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
-- A promotion that runs, but not on today's weekday.
select public._try(public._mk(:'ws_s', :ps, 'nuevo', array[1], (:'today'::date + 5))) as mari_at_sola \gset
select public._try(public._mk(:'ws_m', :px, 'nuevo', array[1], (:'today'::date + 5))) as mari_fourth \gset
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb)',
  :lm, :'loc_m', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 20}]')) as five_args \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :sola), true);
set local role authenticated;
select public._try(public._mk(:'ws_s', :ps, 'dia', array[:'other_dow']::integer[], (:'today'::date + 14), 'Viernes de pescado')) as sola_make \gset
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :ls, :'loc_s', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Pescado", "unit_price": "90.00", "quantity": 4}]', :ps)) as join_not_today \gset
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :ln, :'loc_s', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Pescado", "unit_price": "90.00", "quantity": 4}]', :p2)) as join_not_hers \gset
reset role;

select public.chk('6.1 a helper''s offer joins one of her kitchen''s running promotions on one of its days',
  :'join_today' = 'ok'
  and (select promotion_id from public.listing where id = :lj) = :p2::uuid,
  :'join_today');
select public.chk('6.2 the five arguments every build in the field sends still publish — joining nothing',
  :'five_args' = 'ok' and (select promotion_id from public.listing where id = :lm) is null
  and :'mari_at_sola' = '42501' and :'mari_fourth' = 'TD029',
  concat_ws(' ', :'five_args', :'mari_at_sola', :'mari_fourth'));
select public.chk('6.3 TD031 for one that is over, one not on today''s weekday, and another kitchen''s — and nothing is published',
  :'join_over' = 'TD031' and :'sola_make' = 'ok' and :'join_not_today' = 'TD031' and :'join_not_hers' = 'TD031'
  and not exists (select 1 from public.listing where id in (:lk, :ls, :ln)),
  concat_ws(' ', :'join_over', :'sola_make', :'join_not_today', :'join_not_hers'));
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('after-join', format('select public.kitchen_promotions(%L)', :'ws_m')) as after_join \gset
-- A retry of the publication already recorded answers it unchanged, whatever it is sent with.
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :lj, :'loc_m', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Pozole rojo", "unit_price": "70.00", "quantity": 10}]', :p1)) as join_retry \gset
reset role;
-- Sola's second, every day but ending today: an offer for tomorrow cannot wear it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :sola), true);
set local role authenticated;
select public._try(public._mk(:'ws_s', :pt, 'nuevo', array[1,2,3,4,5,6,7], :'today'::date, 'Solo hoy')) as sola_today \gset
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :lt, :'loc_s', ((:'today'::date + 1)::timestamp at time zone 'America/Mexico_City' + interval '1 minute'),
  ((:'today'::date + 1)::timestamp at time zone 'America/Mexico_City' + interval '3 hours'),
  '[{"name": "Pescado", "unit_price": "90.00", "quantity": 4}]', :pt)) as join_tomorrow \gset
reset role;
select public.chk('6.5 a promotion that ends today does not take an offer picked up tomorrow (TD031)',
  :'sola_today' = 'ok' and :'join_tomorrow' = 'TD031' and not exists (select 1 from public.listing where id = :lt),
  concat_ws(' ', :'sola_today', :'join_tomorrow'));
select public.chk('6.4 her list counts the offers of today that wear its mark; a retry of the publication changes nothing',
  :'after_join' = 'ok' and (public._promo('after-join', :p2) ->> 'offers_today')::int = 1
  and (public._promo('after-join', :p1) ->> 'offers_today')::int = 0
  and :'join_retry' = 'ok' and (select promotion_id from public.listing where id = :lj) = :p2::uuid,
  concat_ws(' ', :'after_join', :'join_retry', public._promo('after-join', :p2) ->> 'offers_today'));


-- ---- 7. What a neighbour sees ------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-1', 'select public.on_offer_now()') as door_1 \gset
select public._try(format('select public.kitchen_promotions(%L)', :'ws_m')) as ana_reads \gset
reset role;
select public.chk('7.1 the door sends her kitchen''s promotions shown now, newest first — never the one over',
  :'door_1' = 'ok'
  and (select array_agg(p ->> 'id' order by o) from jsonb_array_elements(public._kitchen('door-1', :'ws_m') -> 'promotions')
         with ordinality t(p, o)) = array[:p4, :p2, :p1]::text[],
  coalesce((public._kitchen('door-1', :'ws_m') -> 'promotions')::text, :'door_1'));
select public.chk('7.2 each promotion with exactly the keys the band and its conditions draw — no count, no price, no code',
  (select array_agg(k order by k) from jsonb_object_keys(public._kitchen('door-1', :'ws_m') -> 'promotions' -> 0) k)
    = array['conditions', 'days', 'ends_on', 'id', 'image_path', 'kind', 'more', 'starts_on', 'what']
  and (public._kitchen('door-1', :'ws_m') -> 'promotions' -> 1) ->> 'what' = 'Jueves pozolero'
  and (public._kitchen('door-1', :'ws_m') -> 'promotions' -> 1) -> 'days' = to_jsonb(array[:'dow']::int[])
  and (public._kitchen('door-1', :'ws_m') -> 'promotions' -> 2) ->> 'conditions'
        = 'Todos los días, hasta el fin de mes, en Fonda Doña Mari, Sabino 120.',
  (select string_agg(k, ',' order by k) from jsonb_object_keys(public._kitchen('door-1', :'ws_m') -> 'promotions' -> 0) k));
select public.chk('7.3 the offer that joined wears its promotion''s id; the one that did not, null',
  (select o ->> 'promotion_id' from jsonb_array_elements(public._kitchen('door-1', :'ws_m') -> 'on_offer') o
    where o ->> 'id' = :lj) = :p2
  and (select o -> 'promotion_id' from jsonb_array_elements(public._kitchen('door-1', :'ws_m') -> 'on_offer') o
        where o ->> 'id' = :lm) = 'null'::jsonb,
  (public._kitchen('door-1', :'ws_m') -> 'on_offer')::text);
select public.chk('7.4 a neighbour is no member: she reads promotions only through the door (42501)',
  :'ana_reads' = '42501', :'ana_reads');
select public.chk('7.5 a kitchen that never published is in the door for her promotion shown — and every key the door sent before is still sent',
  public._kitchen('door-1', :'ws_s') is not null
  and public._kitchen('door-1', :'ws_s') -> 'on_offer' = '[]'::jsonb
  and (select array_agg(k order by k) from jsonb_object_keys(public._kitchen('door-1', :'ws_s')) k)
        = array['address', 'card', 'directions', 'eat', 'features', 'giro', 'id', 'min_score', 'name', 'on_offer',
                'page', 'payment', 'point', 'promotions', 'stars', 'summary'],
  (select string_agg(k, ',' order by k) from jsonb_object_keys(coalesce(public._kitchen('door-1', :'ws_s'), '{}')) k));
select public.chk('7.6 a kitchen with no promotion and nothing published is not in the door',
  public._kitchen('door-1', :'ws_o') is null);


-- ---- 8. *Terminarla hoy* -----------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.end_promotion(%L, %L)', :'ws_m', :p2)) as cook_ends \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('end-2', format('select public.end_promotion(%L, %L)', :'ws_m', :p2)) as end_2 \gset
select public._call_as_me('end-2-again', format('select public.end_promotion(%L, %L)', :'ws_m', :p2)) as end_2_again \gset
select public._try(format('select public.end_promotion(%L, %L)', :'ws_m', :ps)) as end_not_hers \gset
reset role;
select ended_at as ended_2 from servicio.promotion where id = :p2 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-2', 'select public.on_offer_now()') as door_2 \gset
reset role;
select public.chk('8.1 a helper does not end one (42501); the owner does, at once: terminada, today, out of the count, no offer wearing it',
  :'cook_ends' = '42501' and :'end_2' = 'ok'
  and public._promo('end-2', :p2) ->> 'state' = 'terminada'
  and public._promo('end-2', :p2) ->> 'ended_on' = :'today'
  and (public._promo('end-2', :p2) ->> 'offers_today')::int = 0
  and (public._a('end-2') ->> 'running')::int = 2,
  concat_ws(' ', :'cook_ends', :'end_2', public._a('end-2')::text));
select public.chk('8.2 again changes nothing (a retry keeps its moment); another kitchen''s id changes nothing either — answered, never touched',
  :'end_2_again' = 'ok' and (select ended_at from servicio.promotion where id = :p2) = :'ended_2'::timestamptz
  and :'end_not_hers' = 'ok' and (select ended_at is null from servicio.promotion where id = :ps),
  concat_ws(' ', :'end_2_again', :'end_not_hers'));
select public.chk('8.3 it leaves Itacate now, and the offer that joined it loses its mark (it stays on offer)',
  :'door_2' = 'ok'
  and not exists (select 1 from jsonb_array_elements(public._kitchen('door-2', :'ws_m') -> 'promotions') p
                   where p ->> 'id' = :p2)
  and (select o -> 'promotion_id' from jsonb_array_elements(public._kitchen('door-2', :'ws_m') -> 'on_offer') o
        where o ->> 'id' = :lj) = 'null'::jsonb,
  (public._kitchen('door-2', :'ws_m') -> 'on_offer')::text);


-- ---- 9. *Deshacer* -----------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(public._mk(:'ws_m', :pu, 'nuevo', array[:'dow']::integer[], (:'today'::date + 7), 'Tamales')) as make_u \gset
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :lu, :'loc_m', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Tamales", "unit_price": "25.00", "quantity": 30}]', :pu)) as join_u \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.undo_promotion(%L, %L)', :'ws_m', :pu)) as cook_undo \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('undo-u', format('select public.undo_promotion(%L, %L)', :'ws_m', :pu)) as undo_u \gset
select public._call_as_me('undo-u-again', format('select public.undo_promotion(%L, %L)', :'ws_m', :pu)) as undo_u_again \gset
reset role;
select public.chk('9.1 Deshacer: a helper may not (42501); the owner deletes it as if never made, and again is nothing',
  :'make_u' = 'ok' and :'join_u' = 'ok' and :'cook_undo' = '42501'
  and :'undo_u' = 'ok' and :'undo_u_again' = 'ok'
  and not exists (select 1 from servicio.promotion where id = :pu)
  and public._promo('undo-u', :pu) is null,
  concat_ws(' ', :'make_u', :'join_u', :'cook_undo', :'undo_u', :'undo_u_again'));
select public.chk('9.2 the offer that joined it in between still stands, its mark gone',
  exists (select 1 from public.listing where id = :lu and promotion_id is null and withdrawn_at is null));
-- One made more than two minutes ago is past undoing.
update servicio.promotion set created_at = now() - interval '2 minutes 1 second' where id = :p4;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.undo_promotion(%L, %L)', :'ws_m', :p4)) as undo_late \gset
reset role;
select public.chk('9.3 after its two minutes Deshacer is refused (TD032) and the promotion stays',
  :'undo_late' = 'TD032' and exists (select 1 from servicio.promotion where id = :p4), :'undo_late');


-- ---- 10. *Para tus clientes* and her card (G28) ------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(public._mk(:'ws_o', :pc, 'clientes', array[1,2,3,4,5,6,7], (:'today'::date + 30),
  'Agua de jamaica gratis')) as clientes_no_card \gset
reset role;
update servicio.feature_switch set is_on = true where name = 'tarjeta';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.set_card_terms(%L, %L, 8, 0)', :'ws_o', 'Una comida gratis')) as card_set \gset
select public._call_as_me('clientes', public._mk(:'ws_o', :pc, 'clientes', array[1,2,3,4,5,6,7], (:'today'::date + 30),
  'Agua de jamaica gratis')) as clientes_make \gset
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :lo, :'loc_o', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 8}]', :pc)) as clientes_join \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-3', 'select public.on_offer_now()') as door_3 \gset
reset role;
select public.chk('10.1 Para tus clientes needs her card open (TD030); open, it is made and shown, card_open says so',
  :'clientes_no_card' = 'TD030' and :'card_set' = 'ok' and :'clientes_make' = 'ok'
  and (public._a('clientes') -> 'card_open') = 'true'::jsonb
  and :'clientes_join' = 'ok'
  and (public._kitchen('door-3', :'ws_o') -> 'promotions' -> 0) ->> 'kind' = 'clientes',
  concat_ws(' ', :'clientes_no_card', :'card_set', :'clientes_make', :'clientes_join'));
-- Wera's card switch off for everyone: hidden, and back with the switch.
update servicio.feature_switch set is_on = false where name = 'tarjeta';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-4', 'select public.on_offer_now()') as door_4 \gset
reset role;
update servicio.feature_switch set is_on = true where name = 'tarjeta';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-5', 'select public.on_offer_now()') as door_5 \gset
reset role;
select public.chk('10.2 Wera''s card switched off hides it and its offer''s mark; switched on, both come back',
  public._kitchen('door-4', :'ws_o') -> 'promotions' = '[]'::jsonb
  and (select o -> 'promotion_id' from jsonb_array_elements(public._kitchen('door-4', :'ws_o') -> 'on_offer') o
        where o ->> 'id' = :lo) = 'null'::jsonb
  and (public._kitchen('door-5', :'ws_o') -> 'promotions' -> 0) ->> 'id' = :pc
  and (select o ->> 'promotion_id' from jsonb_array_elements(public._kitchen('door-5', :'ws_o') -> 'on_offer') o
        where o ->> 'id' = :lo) = :pc,
  concat_ws(' | ', (public._kitchen('door-4', :'ws_o') -> 'promotions')::text, (public._kitchen('door-5', :'ws_o') -> 'promotions')::text));
-- She closes her card: her Para tus clientes ends with it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.close_card(%L)', :'ws_o')) as card_close \gset
select public._call_as_me('after-close', format('select public.kitchen_promotions(%L)', :'ws_o')) as after_close \gset
reset role;
select public.chk('10.3 her card closing ends her running Para tus clientes at that moment (terminada), card_open false',
  :'card_close' = 'ok' and public._promo('after-close', :pc) ->> 'state' = 'terminada'
  and (select ended_at is not null from servicio.promotion where id = :pc)
  and (public._a('after-close') -> 'card_open') = 'false'::jsonb,
  coalesce(public._a('after-close')::text, :'card_close'));


-- ---- 11. Turned off — by her, or by Wera -------------------------------------------------
-- Wera's switch for promotions off: every one hidden, and the offers' marks; back with it.
update servicio.feature_switch set is_on = false where name = 'promociones';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door-6', 'select public.on_offer_now()') as door_6 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('wera-off', format('select public.kitchen_promotions(%L)', :'ws_m')) as wera_off \gset
select public._try(format('select public.end_promotion(%L, %L)', :'ws_m', :p4)) as end_while_off \gset
select public._try(format('select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz, %L::jsonb, %L)',
  :lw, :'loc_m', :'q0', (:'q0'::timestamptz + interval '4 hours'),
  '[{"name": "Pozole", "unit_price": "70.00", "quantity": 3}]', :p1)) as join_while_off \gset
reset role;
update servicio.feature_switch set is_on = true where name = 'promociones';
select public.chk('11.1 Wera''s switch off hides every promotion from the door (her kitchen with nothing on offer leaves it); her list says not shown, still activa',
  public._kitchen('door-6', :'ws_m') -> 'promotions' = '[]'::jsonb
  and public._kitchen('door-6', :'ws_s') is null
  and public._promo('wera-off', :p1) ->> 'state' = 'activa'
  and public._promo('wera-off', :p1) -> 'shown' = 'false'::jsonb,
  coalesce((public._kitchen('door-6', :'ws_m') -> 'promotions')::text, :'door_6'));
select public.chk('11.2 ending one is always taken, the switch off or on',
  :'end_while_off' = 'ok' and (select ended_at is not null from servicio.promotion where id = :p4), :'end_while_off');
select public.chk('11.4 while Wera''s switch is off no offer joins one (TD031), and nothing is published',
  :'join_while_off' = 'TD031' and not exists (select 1 from public.listing where id = :lw), :'join_while_off');
-- She turns promotions off in *Lo que usas*: the ones running end. ⚠️ Her other phone's promotion
-- made while this waited on its row is later than this moment (the review of `10.9g-i`): the clock
-- of one transaction cannot pass, so its making is set a second on, as postgres.
update servicio.promotion set created_at = now() + interval '1 second' where id = :p1;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format($q$select public.set_kitchen_features(%L, '{"promociones": "off"}')$q$, :'ws_m')) as her_off \gset
select public._call_as_me('her-off', format('select public.kitchen_promotions(%L)', :'ws_m')) as her_off_read \gset
select public._try(format($q$select public.set_kitchen_features(%L, '{"promociones": "on"}')$q$, :'ws_m')) as her_on \gset
select public._call_as_me('her-on', format('select public.kitchen_promotions(%L)', :'ws_m')) as her_on_read \gset
reset role;
select public.chk('11.3 her own off ends every one running, at once (as Terminarla hoy); on again brings none back',
  :'her_off' = 'ok' and (public._a('her-off') ->> 'running')::int = 0
  and public._promo('her-off', :p1) ->> 'state' = 'terminada'
  and :'her_on' = 'ok' and (public._a('her-on') ->> 'running')::int = 0,
  concat_ws(' ', :'her_off', :'her_on', public._a('her-on') ->> 'running'));


-- ---- 12. The deletions -------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :sola), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_s', 'Fonda Sola 0087')) as del_sola \gset
reset role;
select public.chk('12.1 a kitchen deleted takes every promotion of hers with it',
  :'del_sola' = 'ok' and not exists (select 1 from servicio.promotion where workspace_id = :'ws_s'),
  :'del_sola');
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.delete_my_account(p_business_names => array[%L])', 'Fonda Otra 0087')) as del_otra \gset
reset role;
select public.chk('12.2 an account deleted with the kitchen it alone owns takes her promotions and the offers that joined them',
  :'del_otra' = 'ok'
  and not exists (select 1 from servicio.promotion where workspace_id = :'ws_o')
  and not exists (select 1 from public.listing where id = :lo),
  :'del_otra');


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
  if (select count(*) from public._verify) <> 45 then
    raise exception 'expected 45 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
