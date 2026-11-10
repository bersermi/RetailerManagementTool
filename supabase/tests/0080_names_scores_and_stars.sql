-- ============================================================================
-- 0080 — names, scores and stars (`10.5b-ii-b`; the owner's final design of
-- 2026-11-10). Every call is made AS THE PERSON, under `set role authenticated`
-- with her claims; history — a plate collected weeks ago, a thumb given
-- yesterday — is written as postgres, because nobody can make it in the past.
--
-- Section 1 the shape: the four tables nobody signed in reaches, the seven doors,
-- the closed lists. Section 2 the state learns the kitchen's cancel. Section 3
-- her yes, and trust that grows. Section 4 what the kitchen sees: the name and
-- the score. Section 5 the fonda's thumb. Section 6 who may reserve. Section 7
-- her stars. Section 8 the kitchen's cancel, switched off and then on. Section 9
-- the deletions. Section 10 his analytics.
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
grant execute on function public._try(text) to authenticated;

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

-- One order in a kitchen's read (`reservation_neighbours`), as one person got it.
create function public._nb(p_who text, p_id uuid)
returns jsonb language sql as $$
  select e from public._answer a, jsonb_array_elements(a.body) e
   where a.who = p_who and (e ->> 'id')::uuid = p_id
$$;
-- One kitchen in the door, as one person got it.
create function public._kitchen(p_who text, p_id uuid)
returns jsonb language sql as $$
  select k from public._answer a, jsonb_array_elements(a.body) k
   where a.who = p_who and (k ->> 'id')::uuid = p_id
$$;
create function public._state(p_id uuid)
returns text language sql as $$
  select public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at, r.held_until,
                                  r.pickup_at, r.cancelled_by)
    from public.reservation r where r.id = p_id
$$;
-- A reservation in the past, written as postgres: her hour `p_ago` ago, the window
-- an hour later, handed over at her hour or not at all.
create function public._past(p_id uuid, p_buyer uuid, p_ws uuid, p_listing uuid, p_ago interval,
                             p_handed boolean, p_code integer)
returns uuid language sql as $$
  insert into public.reservation
    (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day, held_until,
     payment, eat, created_at, handed_over_at)
  select p_id, li.workspace_id, li.location_id, li.id, p_buyer, p_code, now() - p_ago,
         ((now() - p_ago) at time zone 'America/Mexico_City')::date, now() - p_ago + interval '1 hour',
         'efectivo', 'llevar', now() - p_ago - interval '1 hour',
         case when p_handed then now() - p_ago end
    from public.listing li where li.id = p_listing
  returning id;
$$;
-- A thumb in the past, written as postgres.
create function public._thumb(p_id uuid, p_up boolean, p_labels text[], p_at timestamptz)
returns void language sql as $$
  insert into servicio.reservation_thumb (reservation_id, up, labels, given_by, given_at)
  values (p_id, p_up, p_labels, gen_random_uuid(), p_at);
$$;

\set mari  '''0080aaaa-0000-4000-8000-000000000001'''
\set cook  '''0080aaaa-0000-4000-8000-000000000002'''
\set otra  '''0080aaaa-0000-4000-8000-000000000003'''
\set hist  '''0080aaaa-0000-4000-8000-000000000004'''
\set ana   '''0080aaaa-0000-4000-8000-000000000005'''
\set bea   '''0080aaaa-0000-4000-8000-000000000006'''
\set caro  '''0080aaaa-0000-4000-8000-000000000007'''
\set dani  '''0080aaaa-0000-4000-8000-000000000008'''
\set eli   '''0080aaaa-0000-4000-8000-000000000009'''
\set fer   '''0080aaaa-0000-4000-8000-000000000010'''
\set gina  '''0080aaaa-0000-4000-8000-000000000011'''
\set hana  '''0080aaaa-0000-4000-8000-000000000012'''
\set iris  '''0080aaaa-0000-4000-8000-000000000013'''
\set juana '''0080aaaa-0000-4000-8000-000000000014'''
\set gaby  '''0080aaaa-0000-4000-8000-000000000015'''
\set kiki  '''0080aaaa-0000-4000-8000-000000000016'''
\set lm    '''0080bbbb-0000-4000-8000-000000000001'''
\set lo    '''0080bbbb-0000-4000-8000-000000000002'''
\set lh    '''0080bbbb-0000-4000-8000-000000000003'''
\set lmp   '''0080bbbb-0000-4000-8000-000000000004'''
\set lop   '''0080bbbb-0000-4000-8000-000000000005'''
\set ra    '''0080cccc-0000-4000-8000-000000000001'''
\set rb    '''0080cccc-0000-4000-8000-000000000002'''
\set rc    '''0080cccc-0000-4000-8000-000000000003'''
\set rd    '''0080cccc-0000-4000-8000-000000000004'''
\set re    '''0080cccc-0000-4000-8000-000000000005'''
\set rf1   '''0080cccc-0000-4000-8000-000000000006'''
\set rf2   '''0080cccc-0000-4000-8000-000000000007'''
\set ri    '''0080cccc-0000-4000-8000-000000000008'''
\set rj    '''0080cccc-0000-4000-8000-000000000009'''
\set rk    '''0080cccc-0000-4000-8000-000000000010'''
\set rg    '''0080cccc-0000-4000-8000-000000000011'''
\set rgaby '''0080cccc-0000-4000-8000-000000000012'''
\set ro    '''0080cccc-0000-4000-8000-000000000013'''
\set rx    '''0080cccc-0000-4000-8000-0000000000ff'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,  'mari.0080@example.mx',  jsonb_build_object('full_name', 'Mari 0080')),
  (:cook,  'cook.0080@example.mx',  jsonb_build_object('full_name', 'Cook 0080')),
  (:otra,  'otra.0080@example.mx',  jsonb_build_object('full_name', 'Otra 0080')),
  (:hist,  'hist.0080@example.mx',  jsonb_build_object('full_name', 'Historia 0080')),
  (:ana,   'ana.0080@example.mx',   jsonb_build_object('full_name', 'Ana Rodríguez López')),
  (:bea,   'bea.0080@example.mx',   jsonb_build_object('full_name', 'Beatriz')),
  (:caro,  'caro.0080@example.mx',  '{}'::jsonb),
  (:dani,  'dani.0080@example.mx',  jsonb_build_object('full_name', 'Daniela   ángeles Mora')),
  (:eli,   'eli.0080@example.mx',   jsonb_build_object('full_name', 'Eli 0080')),
  (:fer,   'fer.0080@example.mx',   jsonb_build_object('full_name', 'Fer 0080')),
  (:gina,  'gina.0080@example.mx',  jsonb_build_object('full_name', 'Gina 0080')),
  (:hana,  'hana.0080@example.mx',  jsonb_build_object('full_name', 'Hana 0080')),
  (:iris,  'iris.0080@example.mx',  jsonb_build_object('full_name', 'Iris María Soto')),
  (:juana, 'juana.0080@example.mx', jsonb_build_object('full_name', 'Juana 0080')),
  (:gaby,  'gaby.0080@example.mx',  jsonb_build_object('full_name', 'Gaby 0080')),
  (:kiki,  'kiki.0080@example.mx',  jsonb_build_object('full_name', 'Kiki 0080'));

-- Mari's kitchen and her cook; Otra's kitchen; a kitchen whose past every
-- neighbour's history is written at.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0080', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :cook, 'staff', 'Cook 0080');
insert into public.member_location (workspace_id, member_id, location_id)
select :'ws_m', wm.id, :'loc_m' from public.workspace_member wm
 where wm.workspace_id = :'ws_m' and wm.user_id = :cook;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0080', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :hist), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda de Antes 0080', p_kind => 'cocina') as ws_h \gset
reset role;
select id as loc_h from public.location where workspace_id = :'ws_h' \gset

-- Today's offers, as each kitchen publishes them; three past offers, as postgres.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 20}, {"name": "Pozole", "unit_price": "70.00", "quantity": 10}]'::jsonb)
  is not null as published_m \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.publish_listing(:lo, :'loc_o', :'q0'::timestamptz, :'q0'::timestamptz + interval '3 hours',
  '[{"name": "Tamales", "unit_price": "20.00", "quantity": 10}]'::jsonb) is not null as published_o \gset
reset role;
insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, created_at)
values (:lh,  :'ws_h', :'loc_h', now() - interval '400 days', now() - interval '400 days' + interval '3 hours', :hist, now() - interval '400 days'),
       (:lmp, :'ws_m', :'loc_m', now() - interval '40 days',  now() - interval '40 days' + interval '3 hours',  :mari, now() - interval '40 days'),
       (:lop, :'ws_o', :'loc_o', now() - interval '40 days',  now() - interval '40 days' + interval '3 hours',  :otra, now() - interval '40 days');

-- Every neighbour who reserves today has given her yes and collected a plate once,
-- long ago — but Fer, whose yes and first plate are what section 3 watches.
insert into servicio.neighbour_yes (user_id) values (:ana), (:bea), (:caro), (:dani), (:eli), (:gina),
                                                    (:hana), (:iris), (:juana), (:gaby);
select public._past(gen_random_uuid(), v.buyer, :'ws_h', :lh, interval '200 days', true, v.code)
  from (values (:ana::uuid, 101), (:bea::uuid, 102), (:caro::uuid, 103), (:dani::uuid, 104),
               (:juana::uuid, 105), (:gaby::uuid, 106)) v(buyer, code);

-- ---- 1. the shape ---------------------------------------------------------------
select public.chk('1.1 four tables in servicio, and no role that signs in or out may use the schema or touch a row',
  (select count(*) = 4 from pg_tables where schemaname = 'servicio'
     and tablename in ('reservation_thumb', 'kitchen_rating', 'neighbour_yes', 'feature_switch'))
  and not has_schema_privilege('authenticated', 'servicio', 'usage')
  and not has_schema_privilege('anon', 'servicio', 'usage')
  and (select bool_and(not has_table_privilege(r, t, 'select, insert, update, delete'))
         from unnest(array['servicio.reservation_thumb', 'servicio.kitchen_rating',
                           'servicio.neighbour_yes', 'servicio.feature_switch']) t,
              unnest(array['anon', 'authenticated']) r));
select public.chk('1.2 the seven doors: a signed-in person may call each, nobody signed out',
  (select bool_and(has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.reservation_neighbours(uuid)',
                       'public.rate_neighbour(uuid, boolean, text[], timestamptz)',
                       'public.my_kitchen_ratings(uuid)',
                       'public.cancel_reservation_as_kitchen(uuid, text)',
                       'public.give_my_yes()', 'public.my_standing()',
                       'public.rate_kitchen(uuid, integer, text[], text)']::regprocedure[]) f));
select public.chk('1.3 the helpers, the state and his analytics are granted to nobody',
  (select bool_and(not has_function_privilege(r, f, 'execute'))
     from unnest(array['public.neighbour_name(uuid)', 'public.neighbour_score(uuid)',
                       'public.neighbour_limit(uuid)', 'public.kitchen_ratings_counted(uuid)',
                       'public.reservation_state(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, uuid)',
                       'servicio.apartados_por_semana()']::regprocedure[]) f,
          unnest(array['anon', 'authenticated']) r));
select public.chk('1.4 the re-created doors keep their signatures and their grants',
  (select bool_and(has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.reserve_plate(uuid, uuid, integer, timestamptz, text, text)',
                       'public.set_kitchen_page(uuid, jsonb)', 'public.my_reservations()',
                       'public.hand_over_reservation(uuid, timestamptz)', 'public.on_offer_now()',
                       'public.delete_my_account(text, text[])']::regprocedure[]) f)
  and (select count(*) = 1 from pg_proc where proname = 'reservation_state'));
select public.chk('1.5 ⚠️ the kitchen''s cancel is off, the one switch there is',
  (select count(*) = 1 and bool_and(name = 'kitchen_cancel' and not is_on) from servicio.feature_switch));
select public.chk('1.6 the kitchen reads who cancelled and why, and who may reserve; who reserved is still granted to nobody',
  has_column_privilege('authenticated', 'public.reservation', 'cancelled_by', 'SELECT')
  and has_column_privilege('authenticated', 'public.reservation', 'cancel_reason', 'SELECT')
  and not has_column_privilege('authenticated', 'public.reservation', 'buyer_id', 'SELECT')
  and has_column_privilege('authenticated', 'public.kitchen_page', 'min_score', 'SELECT'));

select public._past(:rx, :ana, :'ws_h', :lh, interval '300 days', true, 199) is not null as rx_made \gset
select public._try(format('insert into servicio.reservation_thumb values (%L, true, ''{tarde}'', gen_random_uuid(), now())', :rx)) as up_tarde \gset
select public._try(format('insert into servicio.reservation_thumb values (%L, false, ''{no_se_presento,tarde}'', gen_random_uuid(), now())', :rx)) as noshow_tarde \gset
select public._try(format('insert into servicio.reservation_thumb values (%L, false, ''{grosera}'', gen_random_uuid(), now())', :rx)) as unknown_label \gset
select public._try(format('insert into servicio.kitchen_rating (reservation_id, stars, tags) values (%L, 5, ''{porcion_chica}'')', :rx)) as five_bad_tag \gset
select public._try(format('insert into servicio.kitchen_rating (reservation_id, stars, tags) values (%L, 2, ''{muy_rica}'')', :rx)) as two_good_tag \gset
select public._try(format('insert into servicio.kitchen_rating (reservation_id, stars) values (%L, 6)', :rx)) as six_stars \gset
select public._try(format('insert into public.kitchen_page (workspace_id, updated_by, min_score) values (%L, %L, 70)', :'ws_o', :otra)) as min_70 \gset
select public._try(format('update public.reservation set cancel_reason = %L, cancelled_by = gen_random_uuid() where id = %L', 'porque', :rx)) as reason_bad \gset
select public._try(format('update public.reservation set cancelled_by = gen_random_uuid() where id = %L', :rx)) as by_without_reason \gset
select public.chk('1.7 the closed lists are the database''s: a thumb''s labels, her tags by their band, the four scores, the reasons, a kitchen''s cancel whole — each 23514',
  :'up_tarde' = '23514' and :'noshow_tarde' = '23514' and :'unknown_label' = '23514'
  and :'five_bad_tag' = '23514' and :'two_good_tag' = '23514' and :'six_stars' = '23514'
  and :'min_70' = '23514' and :'reason_bad' = '23514' and :'by_without_reason' = '23514',
  format('%s %s %s %s %s %s %s %s %s', :'up_tarde', :'noshow_tarde', :'unknown_label', :'five_bad_tag',
         :'two_good_tag', :'six_stars', :'min_70', :'reason_bad', :'by_without_reason'));

-- ---- 2. the state learns the kitchen's cancel -----------------------------------------
select public.chk('2.1 a cancel with who made it is cancelado_cocina; with five arguments every state reads as before; a handover still wins',
  public.reservation_state(now(), null, null, now() + interval '3 hours', now() + interval '2 hours', gen_random_uuid()) = 'cancelado_cocina'
  and public.reservation_state(now(), null, null, now() + interval '3 hours', now() + interval '2 hours') = 'cancelado'
  and public.reservation_state(now(), null, null, now() + interval '3 hours', now() + interval '1 hour') = 'no_va'
  and public.reservation_state(now(), now(), null, now() + interval '3 hours', now() + interval '2 hours', gen_random_uuid()) = 'recogido'
  and public.reservation_state(null, null, null, now(), now() - interval '1 hour', null) = 'liberado');

-- ---- 3. her yes, and trust that grows ------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fer), true);
set local role authenticated;
select public._try(format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rf1, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as fer_no_yes \gset
select public._say_as_me('yes-1', 'select public.give_my_yes()') as yes_1 \gset
select public._say_as_me('yes-2', 'select public.give_my_yes()') as yes_2 \gset
select public._call_as_me('rf1', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rf1, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as fer_first \gset
select public._try(format('select public.reserve_plate(%L, %L, 2, %L, %L)', :rf2, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as fer_second \gset
select public._call_as_me('fer-standing-1', 'select public.my_standing()') as fer_st1 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._say_as_me('hand-rf1', format('select public.hand_over_reservation(%L)', :rf1)) as hand_rf1 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fer), true);
set local role authenticated;
select public._call_as_me('rf2', format('select public.reserve_plate(%L, %L, 2, %L, %L)', :rf2, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as fer_second_now \gset
select public._call_as_me('fer-standing-2', 'select public.my_standing()') as fer_st2 \gset
reset role;

select public.chk('3.1 ⚠️ before her yes she cannot reserve: TD021, and nothing is written',
  :'fer_no_yes' = 'TD021' and not exists (select 1 from public.reservation where id = :rf1 and created_at < now() - interval '1 second'),
  :'fer_no_yes');
select public.chk('3.2 her yes is kept with its first moment; a second answers the same moment',
  :'yes_1' <> '42501' and :'yes_1' = :'yes_2'
  and (select given_at = :'yes_1'::timestamptz from servicio.neighbour_yes where user_id = :fer),
  format('%s / %s', :'yes_1', :'yes_2'));
select public.chk('3.3 ⚠️ a new account holds one until her first pickup: the second is TD016, and my_standing says one of one',
  :'fer_first' = 'ok' and :'fer_second' = 'TD016'
  and (select (body ->> 'limit')::int = 1 and (body ->> 'holding')::int = 1 and body ->> 'yes_at' is not null
         from public._answer where who = 'fer-standing-1'),
  format('%s %s %s', :'fer_first', :'fer_second', (select body::text from public._answer where who = 'fer-standing-1')));
select public.chk('3.4 once she has collected one, she may hold three',
  :'fer_second_now' = 'ok'
  and (select (body ->> 'limit')::int = 3 and (body ->> 'holding')::int = 1 from public._answer where who = 'fer-standing-2'),
  format('%s %s', :'fer_second_now', (select body::text from public._answer where who = 'fer-standing-2')));

-- Gina: collected ten days ago, then two plates that se liberó, and one she cancelled.
select public._past(gen_random_uuid(), :gina, :'ws_h', :lh, interval '10 days', true, 301) is not null as g1 \gset
select public._past(gen_random_uuid(), :gina, :'ws_h', :lh, interval '5 days', false, 302) is not null as g2 \gset
select public._past(gen_random_uuid(), :gina, :'ws_h', :lh, interval '3 days', false, 303) is not null as g3 \gset
select public._past(:rg, :gina, :'ws_h', :lh, interval '2 days', false, 304) is not null as g4 \gset
update public.reservation set cancelled_at = pickup_at - interval '3 hours' where id = :rg;
select public.neighbour_limit(:gina) as gina_after_misses \gset
select public._past(gen_random_uuid(), :gina, :'ws_h', :lh, interval '1 day', true, 305) is not null as g5 \gset
select public.neighbour_limit(:gina) as gina_after_pickup \gset
-- Kiki: collected once, then twice "Ya lo tengo" with no handover, each rated No se presentó.
select public._past(gen_random_uuid(), :kiki, :'ws_h', :lh, interval '20 days', true, 401) is not null as k1 \gset
select public._past(:rk, :kiki, :'ws_h', :lh, interval '5 days', false, 402) is not null as k2 \gset
update public.reservation set picked_up_at = pickup_at where id = :rk;
select public._thumb(:rk, false, '{no_se_presento}', now() - interval '4 days');
select public._past(:rj, :kiki, :'ws_h', :lh, interval '3 days', false, 403) is not null as k3 \gset
update public.reservation set picked_up_at = pickup_at where id = :rj;
select public._thumb(:rj, false, '{no_se_presento}', now() - interval '2 days');
select public.chk('3.5 ⚠️ two misses in her last ten take her back to one — a cancelled plate is no miss — until she collects the next',
  :'gina_after_misses' = '1' and :'gina_after_pickup' = '3',
  format('%s then %s', :'gina_after_misses', :'gina_after_pickup'));
select public.chk('3.6 a No se presentó thumb is a miss even where she swiped Ya lo tengo',
  public.neighbour_limit(:kiki) = 1, public.neighbour_limit(:kiki)::text);

-- ---- 4. what the kitchen sees: the name and the score ----------------------------------
-- Eli: 22 plates collected over the last 22 days, each rated the hour after: the
-- newest 20 hold 17 up and three down; the two oldest, down, fall outside the 20.
select public._past(('0080dddd-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, :eli, :'ws_h', :lh,
                    make_interval(days => n), true, 500 + n) is not null
  from generate_series(1, 22) n;
select public._thumb(('0080dddd-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
                     n not in (2, 5, 9, 21, 22),
                     case when n in (2, 21, 22) then '{tarde}'::text[] when n = 5 then '{pago}'::text[]
                          when n = 9 then '{}'::text[] else '{a_tiempo}'::text[] end,
                     now() - make_interval(days => n) + interval '1 hour')
  from generate_series(1, 22) n;
-- Hana: two up this month, one up thirteen months ago, one plate that se liberó 25
-- hours ago and one 23 hours ago, neither rated.
select public._past(gen_random_uuid(), :hana, :'ws_h', :lh, interval '5 days', true, 601) is not null as h1 \gset
select public._past(gen_random_uuid(), :hana, :'ws_h', :lh, interval '3 days', true, 602) is not null as h2 \gset
select public._thumb(r.id, true, '{amable}', r.pickup_at + interval '1 hour')
  from public.reservation r where r.buyer_id = :hana and r.handed_over_at is not null;
select public._past(gen_random_uuid(), :hana, :'ws_h', :lh, interval '395 days', true, 603) is not null as h3 \gset
select public._thumb(r.id, true, '{}', r.pickup_at + interval '1 hour')
  from public.reservation r where r.buyer_id = :hana and r.code = 603;
select public._past(gen_random_uuid(), :hana, :'ws_h', :lh, interval '26 hours', false, 604) is not null as h4 \gset
select public._past(gen_random_uuid(), :hana, :'ws_h', :lh, interval '24 hours', false, 605) is not null as h5 \gset
-- Iris: four up and one down — exactly 80%.
select public._past(gen_random_uuid(), :iris, :'ws_h', :lh, make_interval(days => n), true, 700 + n) is not null
  from generate_series(1, 5) n;
select public._thumb(r.id, r.code <> 701, '{}', r.pickup_at + interval '1 hour')
  from public.reservation r where r.buyer_id = :iris;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ra', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :ra, :lm,
  :'q0'::timestamptz + interval '2 hours', 'efectivo')) as got_ra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :bea), true);
set local role authenticated;
select public._call_as_me('rb', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rb, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as got_rb \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :caro), true);
set local role authenticated;
select public._call_as_me('rc', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rc, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as got_rc \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._call_as_me('rd', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rd, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as got_rd \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :eli), true);
set local role authenticated;
select public._call_as_me('re', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :re, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as got_re \gset
select public._call_as_me('eli-standing', 'select public.my_standing()') as eli_st \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :hana), true);
set local role authenticated;
select public._call_as_me('hana-standing', 'select public.my_standing()') as hana_st \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('nb-mari', format('select public.reservation_neighbours(%L)', :'ws_m')) as nb_mari \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('nb-cook', format('select public.reservation_neighbours(%L)', :'ws_m')) as nb_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.reservation_neighbours(%L)', :'ws_m')) as nb_otra_m \gset
select public._call_as_me('nb-otra', format('select public.reservation_neighbours(%L)', :'ws_o')) as nb_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.reservation_neighbours(%L)', :'ws_m')) as nb_ana \gset
reset role;

select public.chk('4.1 the kitchen she reserved at sees Ana R. — the first word and the second''s initial — and her owner and her cook alike',
  :'got_ra' = 'ok' and :'nb_mari' = 'ok' and :'nb_cook' = 'ok'
  and public._nb('nb-mari', :ra) -> 'neighbour' ->> 'name' = 'Ana R.'
  and public._nb('nb-cook', :ra) -> 'neighbour' ->> 'name' = 'Ana R.',
  coalesce(public._nb('nb-mari', :ra)::text, :'nb_mari'));
select public.chk('4.2 one word is that word; no name is none; extra spaces fold and an accented initial is a capital',
  public._nb('nb-mari', :rb) -> 'neighbour' ->> 'name' = 'Beatriz'
  and public._nb('nb-mari', :rc) -> 'neighbour' -> 'name' = 'null'::jsonb
  and public._nb('nb-mari', :rd) -> 'neighbour' ->> 'name' = 'Daniela Á.'
  and public.neighbour_name(:iris) = 'Iris M.',
  format('%s | %s | %s', public._nb('nb-mari', :rb), public._nb('nb-mari', :rc), public._nb('nb-mari', :rd)));
select public.chk('4.3 ⚠️ Nueva en Itacate before her third thumb: no score, never a number',
  public._nb('nb-mari', :ra) -> 'neighbour' -> 'score' = 'null'::jsonb
  and public._nb('nb-mari', :rb) -> 'neighbour' -> 'score' = 'null'::jsonb);
select public.chk('4.4 ⚠️ her score: 17 up of her last 20 from any kitchen — the two older thumbs left out',
  :'got_re' = 'ok'
  and public._nb('nb-mari', :re) -> 'neighbour' -> 'score' = '{"up": 17, "total": 20}'::jsonb,
  coalesce(public._nb('nb-mari', :re)::text, :'got_re'));
select public.chk('4.5 she reads the same score, and each label''s count among those 20 — never a kitchen, never a day',
  (select body -> 'score' = '{"up": 17, "total": 20}'::jsonb and (body ->> 'total')::int = 20
          and body -> 'labels' = '{"a_tiempo": 17, "amable": 0, "tarde": 1, "pago": 1, "no_se_presento": 0}'::jsonb
     from public._answer where who = 'eli-standing')
  and (select body::text !~ ('(' || :'ws_h' || '|' || :'ws_m' || '|given|day|kitchen)') from public._answer where who = 'eli-standing'),
  (select body::text from public._answer where who = 'eli-standing'));
select public.chk('4.6 ⚠️ the clock: a plate that se liberó and went 24 hours unrated counts as No se presentó; one at 23 hours does not yet; 13 months ago is out',
  (select body -> 'score' = '{"up": 2, "total": 3}'::jsonb and (body -> 'labels' ->> 'no_se_presento')::int = 1
          and (body -> 'labels' ->> 'amable')::int = 2
     from public._answer where who = 'hana-standing'),
  (select body::text from public._answer where who = 'hana-standing'));
select public.chk('4.7 a kitchen she did not reserve at reads none of this: Otra is refused Mari''s read 42501, her own holds none of Mari''s orders; a neighbour is refused 42501',
  :'nb_otra_m' = '42501' and :'nb_otra' = 'ok' and :'nb_ana' = '42501'
  and (select jsonb_array_length(body) = 0 from public._answer where who = 'nb-otra'),
  format('%s %s %s', :'nb_otra_m', :'nb_otra', :'nb_ana'));
select public.chk('4.8 ⚠️ never her id: the kitchen''s read carries no buyer and none of the neighbours'' ids',
  (select body::text !~ ('(buyer|' || :ana || '|' || :eli || '|' || :bea || ')') from public._answer where who = 'nb-mari'));

-- ---- 5. the fonda's thumb --------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.rate_neighbour(%L, true)', :ra)) as rate_pending \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._say_as_me('hand-ra', format('select public.hand_over_reservation(%L)', :ra)) as hand_ra \gset
select public._call_as_me('thumb-ra', format('select public.rate_neighbour(%L, true, %L)', :ra, '{amable,a_tiempo,amable}')) as thumb_ra \gset
select public._call_as_me('thumb-ra-again', format('select public.rate_neighbour(%L, true, %L)', :ra, '{a_tiempo,amable}')) as thumb_ra_again \gset
select public._try(format('select public.rate_neighbour(%L, false, %L)', :ra, '{no_se_presento}')) as noshow_after_hand \gset
select public._try(format('select public.rate_neighbour(%L, true, %L)', :ra, '{tarde}')) as up_late \gset
select public._try(format('select public.rate_neighbour(%L, false, %L)', :ra, '{grosera}')) as rude \gset
select public._try(format('select public.rate_neighbour(%L, null)', :ra)) as no_thumb \gset
select public._try(format('select public.rate_neighbour(%L, false, array[null]::text[])', :ra)) as null_label \gset
select public._call_as_me('thumb-ra-down', format('select public.rate_neighbour(%L, false, %L)', :ra, '{tarde}')) as thumb_ra_down \gset
reset role;
update public.reservation set held_until = now() - interval '1 hour', pickup_at = now() - interval '2 hours',
                              created_at = now() - interval '3 hours' where id = :rf1;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.rate_neighbour(%L, false, %L)', :rf1, '{no_se_presento}')) as noshow_handed_ended \gset
select public._call_as_me('nb-after-thumb', format('select public.reservation_neighbours(%L)', :'ws_m')) as nb_after \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.rate_neighbour(%L, true)', :ra)) as rate_otra \gset
reset role;
update servicio.reservation_thumb set given_at = now() - interval '25 hours' where reservation_id = :ra;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.rate_neighbour(%L, true)', :ra)) as change_late \gset
reset role;

select public.chk('5.1 an order still pending is not rated: TD022',
  :'rate_pending' = 'TD022', :'rate_pending');
select public.chk('5.2 after the handover, any member — the cook too — gives a thumb up with his labels, kept in order, once each',
  :'hand_ra' = 'recogido' and :'thumb_ra' = 'ok'
  and (select body -> 'up' = 'true'::jsonb and body -> 'labels' = '["a_tiempo", "amable"]'::jsonb
         from public._answer where who = 'thumb-ra')
  and (select given_by = :cook from servicio.reservation_thumb where reservation_id = :ra),
  coalesce((select body::text from public._answer where who = 'thumb-ra'), :'thumb_ra'));
select public.chk('5.3 a retry of the same thumb answers it, its moment unchanged',
  :'thumb_ra_again' = 'ok'
  and (select a.body ->> 'given_at' = b.body ->> 'given_at' from public._answer a, public._answer b
        where a.who = 'thumb-ra' and b.who = 'thumb-ra-again'));
select public.chk('5.4 each label only where it can be true: No se presentó after a handover — before its window ends or after — Se presentó tarde on a thumb up, a label not on his list, no thumb, a null label — each 22023',
  :'noshow_after_hand' = '22023' and :'noshow_handed_ended' = '22023' and :'up_late' = '22023'
  and :'rude' = '22023' and :'no_thumb' = '22023' and :'null_label' = '22023',
  format('%s %s %s %s %s %s', :'noshow_after_hand', :'noshow_handed_ended', :'up_late', :'rude', :'no_thumb', :'null_label'));
select public.chk('5.5 changed within its 24 hours; after them TD022',
  :'thumb_ra_down' = 'ok' and :'change_late' = 'TD022'
  and (select not up and labels = '{tarde}' and changed_at is not null from servicio.reservation_thumb where reservation_id = :ra),
  format('%s %s', :'thumb_ra_down', :'change_late'));
select public.chk('5.6 ⚠️ rated, her name and score leave the order — the kitchen keeps its own thumb',
  public._nb('nb-after-thumb', :ra) -> 'neighbour' = 'null'::jsonb
  and public._nb('nb-after-thumb', :ra) -> 'thumb' ->> 'up' = 'false'
  and public._nb('nb-after-thumb', :ra) -> 'thumb' -> 'labels' = '["tarde"]'::jsonb
  and public._nb('nb-after-thumb', :ra) -> 'rate_until' = 'null'::jsonb,
  coalesce(public._nb('nb-after-thumb', :ra)::text, ''));
select public.chk('5.7 another kitchen''s owner cannot rate Mari''s order: 42501',
  :'rate_otra' = '42501', :'rate_otra');

-- Beatriz's window ends without her; Caro's ended 25 hours ago; Dani swipes Ya lo
-- tengo with no handover, and the window ends.
update public.reservation set held_until = now() - interval '1 hour', pickup_at = now() - interval '2 hours' where id = :rb;
update public.reservation set held_until = now() - interval '25 hours', pickup_at = now() - interval '26 hours',
                              created_at = now() - interval '27 hours' where id = :rc;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._say_as_me('dani-tengo', format('select public.confirm_my_pickup(%L)', :rd)) as dani_tengo \gset
reset role;
update public.reservation set held_until = now() - interval '1 hour', pickup_at = now() - interval '2 hours',
                              created_at = now() - interval '3 hours' where id = :rd;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('nb-liberado', format('select public.reservation_neighbours(%L)', :'ws_m')) as nb_lib \gset
select public._try(format('select public.rate_neighbour(%L, true)', :rb)) as up_liberado \gset
select public._call_as_me('thumb-rb', format('select public.rate_neighbour(%L, false)', :rb)) as thumb_rb \gset
select public._try(format('select public.rate_neighbour(%L, false)', :rc)) as too_late \gset
select public._call_as_me('thumb-rd', format('select public.rate_neighbour(%L, false, %L, %L)', :rd, '{no_se_presento}',
  now() - interval '30 minutes')) as thumb_rd \gset
reset role;
select public.neighbour_score(:bea) ->> 'total' as bea_total_before \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._say_as_me('si-paso', format('select public.hand_over_reservation(%L)', :rb)) as si_paso \gset
select public._call_as_me('nb-si-paso', format('select public.reservation_neighbours(%L)', :'ws_m')) as nb_si \gset
reset role;

select public.chk('5.8 a plate that se liberó waits for its thumb with her name, until 24 hours after the window',
  public._nb('nb-liberado', :rb) -> 'neighbour' ->> 'name' = 'Beatriz'
  and (public._nb('nb-liberado', :rb) ->> 'rate_until')::timestamptz = now() + interval '23 hours',
  coalesce(public._nb('nb-liberado', :rb)::text, ''));
select public.chk('5.9 ⚠️ on a plate that se liberó a thumb up is 22023, and a thumb down is No se presentó whatever is sent',
  :'up_liberado' = '22023' and :'thumb_rb' = 'ok'
  and (select body -> 'up' = 'false'::jsonb and body -> 'labels' = '["no_se_presento"]'::jsonb
         from public._answer where who = 'thumb-rb'),
  format('%s %s', :'up_liberado', :'thumb_rb'));
select public.chk('5.10 a first thumb more than 24 hours after the window is TD022 — the clock has spoken: No se presentó, marked as the clock''s, and no name',
  :'too_late' = 'TD022'
  and public._nb('nb-liberado', :rc) -> 'thumb' = jsonb_build_object('up', false, 'labels', '["no_se_presento"]'::jsonb,
        'given_at', now() - interval '1 hour', 'change_until', null, 'clock', true)
  and public._nb('nb-liberado', :rc) -> 'neighbour' = 'null'::jsonb,
  coalesce(public._nb('nb-liberado', :rc)::text, :'too_late'));
select public.chk('5.11 Ya lo tengo with no handover: once the window ended the kitchen may still say No se presentó, kept at her phone''s moment',
  :'dani_tengo' = 'recogido' and :'thumb_rd' = 'ok'
  and (select labels = '{no_se_presento}' and given_at = now() - interval '30 minutes'
         from servicio.reservation_thumb where reservation_id = :rd),
  format('%s %s', :'dani_tengo', :'thumb_rd'));
select public.chk('5.12 ⚠️ Sí pasó — the handover recorded late — clears the No se presentó: her score loses it and the order waits for a thumb again',
  :'bea_total_before' = '1' and :'si_paso' = 'recogido'
  and not exists (select 1 from servicio.reservation_thumb where reservation_id = :rb)
  and (public.neighbour_score(:bea) ->> 'total')::int = 0
  and public._nb('nb-si-paso', :rb) -> 'rate_until' <> 'null'::jsonb,
  format('%s %s %s', :'bea_total_before', :'si_paso', public.neighbour_score(:bea)));

-- ---- 6. who may reserve ----------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m', '{"min_score": 70}')) as min_70 \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m', '{"min_score": "80"}')) as min_text \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m', '{"min_score": 85}')) as min_85 \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m', '{"sentence": "Comida casera"}')) as only_sentence \gset
reset role;
select min_score as min_after_sentence from public.kitchen_page where workspace_id = :'ws_m' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m', '{"min_score": null}')) as min_by_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :eli), true);
set local role authenticated;
select public._try(format('select public.reserve_plate(%L, %L, 2, %L, %L)', '0080cccc-0000-4000-8000-0000000000a3', :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as eli_at_85 \gset
select public._call_as_me('door-eli', 'select public.on_offer_now()') as door_eli \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :juana), true);
set local role authenticated;
select public._call_as_me('rj-new', format('select public.reserve_plate(%L, %L, 2, %L, %L)',
  '0080cccc-0000-4000-8000-0000000000a1', :lm, :'q0'::timestamptz + interval '1 hour', 'efectivo')) as juana_at_85 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_m', '{"min_score": 80}')) as min_80 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :iris), true);
set local role authenticated;
select public._try(format('select public.reserve_plate(%L, %L, 2, %L, %L)', :ri, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as iris_at_80 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :eli), true);
set local role authenticated;
select public._call_as_me('eli-at-80', format('select public.reserve_plate(%L, %L, 2, %L, %L)',
  '0080cccc-0000-4000-8000-0000000000a2', :lm, :'q0'::timestamptz + interval '1 hour', 'efectivo')) as eli_at_80 \gset
reset role;

select public.chk('6.1 the four options and no others: 70 and the text "80" are 22023; 85 is kept, and a build that sends only her sentence leaves it',
  :'min_70' = '22023' and :'min_text' = '22023' and :'min_85' = 'ok' and :'only_sentence' = 'ok'
  and :'min_after_sentence' = '85',
  format('%s %s %s %s %s', :'min_70', :'min_text', :'min_85', :'only_sentence', :'min_after_sentence'));
select public.chk('6.2 the owner or a manager sets it; the cook is refused 42501',
  :'min_by_cook' = '42501', :'min_by_cook');
select public.chk('6.3 ⚠️ "más de 85" is strictly more: Eli at exactly 85% is refused TD020 — her plate already reserved stands',
  :'eli_at_85' = 'TD020' and public._state(:re) = 'apartado'
  and not exists (select 1 from public.reservation where id = '0080cccc-0000-4000-8000-0000000000a3'), :'eli_at_85');
select public.chk('6.4 the door tells her phone each kitchen''s setting before she taps; a kitchen with none says null',
  public._kitchen('door-eli', :'ws_m') -> 'min_score' = '85'::jsonb
  and public._kitchen('door-eli', :'ws_o') -> 'min_score' = 'null'::jsonb,
  coalesce(public._kitchen('door-eli', :'ws_m') ->> 'min_score', 'absent'));
select public.chk('6.5 ⚠️ a new neighbour — fewer than three thumbs — always passes, at 85 too',
  :'juana_at_85' = 'ok', :'juana_at_85');
select public.chk('6.6 at "más de 80" Iris, at exactly 80%, is refused TD020; Eli, at 85%, reserves',
  :'min_80' = 'ok' and :'iris_at_80' = 'TD020' and :'eli_at_80' = 'ok',
  format('%s %s %s', :'min_80', :'iris_at_80', :'eli_at_80'));

-- ---- 7. her stars ----------------------------------------------------------------------
-- Ana's plate was handed over (section 5). Eli's earliest is still pending.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('stars-ra', format('select public.rate_kitchen(%L, 5, %L, %L)', :ra, '{muy_rica,buena_porcion,muy_rica}', '   ')) as stars_ra \gset
reset role;
select stars = 5 and tags = '{buena_porcion,muy_rica}' and note is null as ra_first_kept
  from servicio.kitchen_rating where reservation_id = :ra \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.rate_kitchen(%L, 5, %L)', :ra, '{porcion_chica}')) as five_bad \gset
select public._try(format('select public.rate_kitchen(%L, 2, %L)', :ra, '{muy_rica}')) as two_good \gset
select public._try(format('select public.rate_kitchen(%L, 6)', :ra)) as six \gset
select public._try(format('select public.rate_kitchen(%L, 3, null, %L)', :ra, repeat('x', 501))) as long_note \gset
select public._call_as_me('stars-ra-2', format('select public.rate_kitchen(%L, 2, %L, %L)', :ra, '{tuve_que_esperar}', 'nota-de-ana-0080')) as stars_ra_2 \gset
select public._try(format('select public.rate_kitchen(%L, 5)', :re)) as not_hers \gset
select public._call_as_me('mine-ana', 'select public.my_reservations()') as mine_ana \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :eli), true);
set local role authenticated;
select public._try(format('select public.rate_kitchen(%L, 5)', :re)) as pending_stars \gset
reset role;
update public.reservation set held_until = now() - interval '25 hours', pickup_at = now() - interval '26 hours',
                              created_at = now() - interval '27 hours' where id = :ra;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.rate_kitchen(%L, 4)', :ra)) as stars_late \gset
reset role;

select public.chk('7.1 one tap of five stars, its good tags once each in order, and a blank note is none',
  :'stars_ra' = 'ok'
  and :'ra_first_kept'::boolean,
  coalesce((select body::text from public._answer where who = 'stars-ra'), :'stars_ra'));
select public.chk('7.2 a problem tag after five stars, a good one after two, six stars, a note over 500 characters — each 22023',
  :'five_bad' = '22023' and :'two_good' = '22023' and :'six' = '22023' and :'long_note' = '22023',
  format('%s %s %s %s', :'five_bad', :'two_good', :'six', :'long_note'));
select public.chk('7.3 changed while it may be: two stars, Tuve que esperar, and a note for Wera',
  :'stars_ra_2' = 'ok'
  and (select stars = 2 and tags = '{tuve_que_esperar}' and note = 'nota-de-ana-0080' and changed_at is not null
         from servicio.kitchen_rating where reservation_id = :ra));
select public.chk('7.4 another neighbour''s plate is 42501; a plate still to collect is TD022; past the day after its window, TD022',
  :'not_hers' = '42501' and :'pending_stars' = 'TD022' and :'stars_late' = 'TD022',
  format('%s %s %s', :'not_hers', :'pending_stars', :'stars_late'));
select public.chk('7.5 her own list carries her stars and until when she may change them — never her note',
  (select e -> 'my_rating' = '{"stars": 2, "tags": ["tuve_que_esperar"]}'::jsonb and e ->> 'rate_until' is not null
     from public._answer a, jsonb_array_elements(a.body) e
    where a.who = 'mine-ana' and (e ->> 'id')::uuid = :ra)
  and (select body::text !~ 'nota-de-ana' from public._answer where who = 'mine-ana'));

-- Mari's kitchen: five ratings three days ago and one yesterday, with a note; Ana's
-- of today is not counted yet. Otra's: four, three days ago.
select public._past(('0080eeee-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, gen_random_uuid(), :'ws_m', :lmp,
                    make_interval(days => 3, hours => n), true, 800 + n) is not null
  from generate_series(1, 6) n;
insert into servicio.kitchen_rating (reservation_id, stars, tags, note, given_at)
select ('0080eeee-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid, v.stars, v.tags, v.note, v.at
  from (values (1, 5, '{muy_rica,buena_porcion}'::text[], null::text, now() - interval '3 days'),
               (2, 5, '{muy_rica}'::text[], null, now() - interval '3 days'),
               (3, 4, '{lista_a_tiempo}'::text[], null, now() - interval '3 days'),
               (4, 2, '{porcion_chica}'::text[], null, now() - interval '3 days'),
               (5, 4, '{lista_a_tiempo,muy_rica}'::text[], null, now() - interval '3 days'),
               (6, 3, '{tuve_que_esperar,porcion_chica}'::text[], 'secreto-0080',
                ((((now() at time zone 'America/Mexico_City')::date - 1)::timestamp + interval '12 hours')
                  at time zone 'America/Mexico_City'))) v(n, stars, tags, note, at);
select public._past(('0080ffff-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, gen_random_uuid(), :'ws_o', :lop,
                    make_interval(days => 3, hours => n), true, 900 + n) is not null
  from generate_series(1, 4) n;
insert into servicio.kitchen_rating (reservation_id, stars, tags, given_at)
select ('0080ffff-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 5, '{muy_rica}', now() - interval '3 days'
  from generate_series(1, 4) n;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('ratings-mari', format('select public.my_kitchen_ratings(%L)', :'ws_m')) as ratings_mari \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('ratings-cook', format('select public.my_kitchen_ratings(%L)', :'ws_m')) as ratings_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._call_as_me('ratings-otra', format('select public.my_kitchen_ratings(%L)', :'ws_o')) as ratings_otra \gset
select public._try(format('select public.my_kitchen_ratings(%L)', :'ws_m')) as ratings_otra_m \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :juana), true);
set local role authenticated;
select public._call_as_me('door-juana', 'select public.on_offer_now()') as door_juana \gset
reset role;

select public.chk('7.6 ⚠️ from five, the day after: six counted — Ana''s of today is not — their average to one decimal and each tag''s count',
  :'ratings_mari' = 'ok'
  and (select (body ->> 'count')::int = 6 and body ->> 'average' = '3.8'
              and body -> 'tags' = '{"lista_a_tiempo": 2, "buena_porcion": 1, "muy_rica": 3, "me_atendieron_bien": 0,
                                     "tuve_que_esperar": 1, "porcion_chica": 2, "no_me_gusto": 0, "me_atendieron_mal": 0}'::jsonb
         from public._answer where who = 'ratings-mari'),
  coalesce((select body::text from public._answer where who = 'ratings-mari'), :'ratings_mari'));
select public.chk('7.7 yesterday''s, mixed: stars and tags only — never who, which order, when, or her note; the cook reads the same',
  (select body -> 'yesterday' = '[{"stars": 3, "tags": ["tuve_que_esperar", "porcion_chica"]}]'::jsonb
          and body::text !~ '(secreto|nota-de|reservation|code|given|buyer|0080eeee)'
     from public._answer where who = 'ratings-mari')
  and (select a.body = b.body from public._answer a, public._answer b where a.who = 'ratings-mari' and b.who = 'ratings-cook'));
select public.chk('7.8 below five, how many and nothing else; another kitchen''s owner is refused 42501',
  (select body = '{"count": 4}'::jsonb from public._answer where who = 'ratings-otra')
  and :'ratings_otra_m' = '42501',
  format('%s %s', (select body::text from public._answer where who = 'ratings-otra'), :'ratings_otra_m'));
select public.chk('7.9 the door shows a kitchen''s stars from five — its average, how many, its three most given GOOD tags (Porción chica, as often as Lista a tiempo, is not one) — and none below five',
  public._kitchen('door-juana', :'ws_m') -> 'stars'
    = '{"average": "3.8", "count": 6, "tags": ["muy_rica", "lista_a_tiempo", "buena_porcion"]}'::jsonb
  and public._kitchen('door-juana', :'ws_o') -> 'stars' = 'null'::jsonb
  and (select body::text !~ '(secreto|nota-de)' from public._answer where who = 'door-juana'),
  coalesce((public._kitchen('door-juana', :'ws_m') -> 'stars')::text, 'absent'));

-- ---- 8. the kitchen's cancel, built and switched off ----------------------------------
-- Juana's plate is still to collect.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.cancel_reservation_as_kitchen(%L, %L)', '0080cccc-0000-4000-8000-0000000000a1', 'se_acabo')) as off_mari \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :juana), true);
set local role authenticated;
select public._try(format('select public.cancel_reservation_as_kitchen(%L, %L)', '0080cccc-0000-4000-8000-0000000000a1', 'se_acabo')) as off_juana \gset
reset role;
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select public._try(format('select public.cancel_reservation_as_kitchen(%L, %L)', '0080cccc-0000-4000-8000-0000000000a1', 'se_acabo')) as off_nobody \gset
reset role;
select public._state('0080cccc-0000-4000-8000-0000000000a1') as juana_state_off \gset

-- The switch turned on, as he would on the live database.
update servicio.feature_switch set is_on = true, changed_at = now() where name = 'kitchen_cancel';
select (ll.quantity - public.listing_line_taken(ll.id))::text as left_before
  from public.listing_line ll where ll.listing_id = :lm and ll.line_no = 2 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.cancel_reservation_as_kitchen(%L, %L)', '0080cccc-0000-4000-8000-0000000000a1', 'se_acabo')) as on_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.cancel_reservation_as_kitchen(%L, %L)', '0080cccc-0000-4000-8000-0000000000a1', 'se_acabo')) as on_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.cancel_reservation_as_kitchen(%L, %L)', '0080cccc-0000-4000-8000-0000000000a1', 'porque_si')) as on_bad_reason \gset
select public._say_as_me('cancel-k', format('select public.cancel_reservation_as_kitchen(%L, %L)', '0080cccc-0000-4000-8000-0000000000a1', 'se_acabo')) as on_mari \gset
select public._say_as_me('cancel-k-again', format('select public.cancel_reservation_as_kitchen(%L, %L)', '0080cccc-0000-4000-8000-0000000000a1', 'se_acabo')) as on_again \gset
select public._try(format('select public.cancel_reservation_as_kitchen(%L, %L)', :rf1, 'cerramos')) as on_collected \gset
reset role;
select (ll.quantity - public.listing_line_taken(ll.id))::text as left_after
  from public.listing_line ll where ll.listing_id = :lm and ll.line_no = 2 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :juana), true);
set local role authenticated;
select public._call_as_me('mine-juana', 'select public.my_reservations()') as mine_juana \gset
reset role;

select public.chk('8.1 ⚠️ switched off, it is refused for everyone — her own kitchen''s owner and a neighbour alike: TD023 — and her plate stands',
  :'off_mari' = 'TD023' and :'off_juana' = 'TD023' and :'off_nobody' = '42501' and :'juana_state_off' = 'apartado',
  format('%s %s %s %s', :'off_mari', :'off_juana', :'off_nobody', :'juana_state_off'));
select public.chk('8.2 switched on: the cook (staff) and another kitchen''s owner are 42501; a reason not on the list is 22023',
  :'on_cook' = '42501' and :'on_otra' = '42501' and :'on_bad_reason' = '22023',
  format('%s %s %s', :'on_cook', :'on_otra', :'on_bad_reason'));
select public.chk('8.3 the owner cancels: cancelado_cocina, who and why kept, a retry answers the same, and the plate is back on offer',
  :'on_mari' = 'cancelado_cocina' and :'on_again' = 'cancelado_cocina'
  and (select cancelled_by = :mari and cancel_reason = 'se_acabo' and cancelled_at = now()
         from public.reservation where id = '0080cccc-0000-4000-8000-0000000000a1')
  and :'left_after'::numeric = :'left_before'::numeric + 1,
  format('%s %s %s→%s', :'on_mari', :'on_again', :'left_before', :'left_after'));
select public.chk('8.4 a plate already collected is TD018',
  :'on_collected' = 'TD018', :'on_collected');
select public.chk('8.5 ⚠️ her list reads La cocina canceló tu apartado: cancelado_cocina, with the reason',
  (select e ->> 'state' = 'cancelado_cocina' and e ->> 'cancel_reason' = 'se_acabo'
     from public._answer a, jsonb_array_elements(a.body) e
    where a.who = 'mine-juana' and (e ->> 'id')::uuid = '0080cccc-0000-4000-8000-0000000000a1'));

-- ---- 9. the deletions -------------------------------------------------------------------
-- Gaby collected a plate at Mari's an hour ago; Mari rated her, she rated Mari with a
-- note. Otra's kitchen has a thumb and its four ratings.
select public._past(:rgaby, :gaby, :'ws_m', :lmp, interval '2 hours', true, 951) is not null as gaby_made \gset
select public._thumb(:rgaby, true, '{amable}', now() - interval '90 minutes');
insert into servicio.kitchen_rating (reservation_id, stars, tags, note) values (:rgaby, 4, '{muy_rica}', 'nota-de-gaby');
select public._past(:ro, :eli, :'ws_o', :lop, interval '2 days', true, 952) is not null as ro_made \gset
select public._thumb(:ro, true, '{a_tiempo}', now() - interval '2 days');
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gaby), true);
set local role authenticated;
select public._call_as_me('del-gaby', 'select public.delete_my_account()') as del_gaby \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.rate_neighbour(%L, false, %L)', :rgaby, '{pago}')) as rate_gone \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._call_as_me('del-otra', format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0080')) as del_otra \gset
reset role;

select public.chk('9.1 ⚠️ her account deleted: every thumb kitchens gave her goes, her note to Wera goes, her yes goes — her stars stay, pointing to nobody',
  :'del_gaby' = 'ok'
  and not exists (select 1 from servicio.reservation_thumb where reservation_id = :rgaby)
  and (select stars = 4 and note is null from servicio.kitchen_rating where reservation_id = :rgaby)
  and not exists (select 1 from servicio.neighbour_yes where user_id = :gaby)
  and (select buyer_id is null from public.reservation where id = :rgaby),
  :'del_gaby');
select public.chk('9.2 there is nobody left to rate on her order: TD022',
  :'rate_gone' = 'TD022', :'rate_gone');
select public.chk('9.3 a kitchen deleted takes its orders'' thumbs and ratings with it',
  :'del_otra' = 'ok'
  and not exists (select 1 from servicio.reservation_thumb where reservation_id = :ro)
  and not exists (select 1 from servicio.kitchen_rating
                   where reservation_id::text like '0080ffff-%')
  and exists (select 1 from servicio.kitchen_rating where reservation_id = :rgaby),
  :'del_otra');

-- ---- 10. his analytics -------------------------------------------------------------------
create temp table _week as select * from servicio.apartados_por_semana();
select public.chk('10.1 by week and kitchen, every reservation once, every thumb and rating counted, each label summed',
  (select sum(reservations) from _week) = (select count(*) from public.reservation)
  and (select sum(thumbs_up + thumbs_down) from _week) = (select count(*) from servicio.reservation_thumb)
  and (select sum(a_tiempo) from _week) = (select count(*) from servicio.reservation_thumb where 'a_tiempo' = any (labels))
  and (select sum(no_se_presento) from _week) = (select count(*) from servicio.reservation_thumb where 'no_se_presento' = any (labels))
  and (select sum(ratings) from _week) = (select count(*) from servicio.kitchen_rating)
  and (select sum(muy_rica) from _week) = (select count(*) from servicio.kitchen_rating where 'muy_rica' = any (tags))
  and (select sum(cancelled_by_kitchen) from _week) = 1
  and (select count(*) = count(distinct (week, kitchen_id)) from _week),
  (select format('%s rows, %s reservations', count(*), sum(reservations)) from _week));
select public.chk('10.2 the clock''s no-shows are counted apart: Caro''s plate, Hana''s at 26 hours and Gina''s two',
  (select sum(no_show_by_clock) from _week) = 4,
  (select sum(no_show_by_clock)::text from _week));
select public.chk('10.3 ⚠️ no person''s name and no note: a kitchen''s name alone',
  (select string_agg(to_jsonb(w)::text, ' ') from _week w) !~ '(Ana|Rodr|Beatriz|Daniela|Gaby|secreto|nota-de)');

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
  if (select count(*) from public._verify) <> 60 then
    raise exception 'expected 60 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
