-- ============================================================================
-- 0086 — her numbers (`10.9f`; the owner's rulings G24–G27 of 2026-11-17).
--
-- ⚠️ ASSERTED AGAINST A CALENDAR, NEVER AGAINST THE FUNCTION'S OWN ARITHMETIC:
-- the fixture is a kitchen's last seven weeks written event by event in Mexico
-- City's time, and every expected figure below was counted BY HAND from that
-- list (the table under section 2), not computed by a second query. The moment
-- the numbers are read at is fixed — THURSDAY 2026-11-19, 14:30 in Mexico City
-- (20:30 UTC) — through `servicio.kitchen_numbers_at`, run as postgres, as
-- pg_cron would. The one door is then called AS THE PERSON, under `set role
-- authenticated`, for who may read it and that it answers the same thing now.
--
-- Section 1 the shape. Section 2 the calendar. Section 3 today, this week, this
-- month, each against the one before. Section 4 the zone's edges and the floor.
-- Section 5 who may read it.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK. A refused call is made through `_try`.
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

-- A collected (or not) reservation of one line, written as postgres at moments in
-- Mexico City's time: her hour is the first moment given, or `p_hour`.
create function public._r(p_id uuid, p_buyer uuid, p_ws uuid, p_listing uuid, p_line uuid, p_code integer,
                          p_hour timestamptz, p_handed timestamptz, p_picked timestamptz, p_cancelled timestamptz,
                          p_qty numeric, p_price numeric, p_container numeric)
returns void language plpgsql as $$
begin
  insert into public.reservation
    (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day, held_until,
     payment, eat, created_at, handed_over_at, handed_over_by, picked_up_at, cancelled_at)
  select p_id, li.workspace_id, li.location_id, li.id, p_buyer, p_code, p_hour,
         (p_hour at time zone 'America/Mexico_City')::date, p_hour + interval '1 hour',
         'efectivo', 'llevar', p_hour - interval '2 hours',
         p_handed, case when p_handed is not null then gen_random_uuid() end, p_picked, p_cancelled
    from public.listing li where li.id = p_listing;
  insert into public.reservation_line
    (reservation_id, line_no, workspace_id, location_id, listing_line_id, quantity, unit_price, container_price)
  select p_id, 1, li.workspace_id, li.location_id, p_line, p_qty, p_price, p_container
    from public.listing li where li.id = p_listing;
end;
$$;
-- A stamp, written as postgres: its day is its moment's in Mexico City.
create function public._s(p_ws uuid, p_user uuid, p_at timestamptz, p_via text, p_reservation uuid)
returns void language sql as $$
  insert into servicio.card_stamp (workspace_id, user_id, day, given_at, given_by, via, reservation_id, count_after, of_stamps)
  values (p_ws, p_user, (p_at at time zone 'America/Mexico_City')::date, p_at, gen_random_uuid(), p_via, p_reservation, 1, 8);
$$;
-- A local moment in Mexico City.
create function public._mx(p text) returns timestamptz language sql immutable as $$
  select (p::timestamp) at time zone 'America/Mexico_City'
$$;
-- One period of the answer read at a moment, as postgres.
create function public._n(p_ws uuid, p_at text) returns jsonb language sql as $$
  select servicio.kitchen_numbers_at(p_ws, public._mx(p_at))
$$;

\set mari    '''0086aaaa-0000-4000-8000-000000000001'''
\set cook    '''0086aaaa-0000-4000-8000-000000000002'''
\set otra    '''0086aaaa-0000-4000-8000-000000000003'''
\set tendera '''0086aaaa-0000-4000-8000-000000000004'''
\set ana     '''0086aaaa-0000-4000-8000-000000000005'''
\set beto    '''0086aaaa-0000-4000-8000-000000000006'''
\set carla   '''0086aaaa-0000-4000-8000-000000000007'''
\set dani    '''0086aaaa-0000-4000-8000-000000000008'''
\set eli     '''0086aaaa-0000-4000-8000-000000000009'''
\set fer     '''0086aaaa-0000-4000-8000-000000000010'''
\set gil     '''0086aaaa-0000-4000-8000-000000000011'''
\set lm      '''0086bbbb-0000-4000-8000-000000000001'''
\set lo      '''0086bbbb-0000-4000-8000-000000000002'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,    'mari.0086@example.mx',    jsonb_build_object('full_name', 'Mari 0086')),
  (:cook,    'cook.0086@example.mx',    jsonb_build_object('full_name', 'Cook 0086')),
  (:otra,    'otra.0086@example.mx',    jsonb_build_object('full_name', 'Otra 0086')),
  (:tendera, 'tendera.0086@example.mx', jsonb_build_object('full_name', 'Tendera 0086')),
  (:ana,     'ana.0086@example.mx',     jsonb_build_object('full_name', 'Ana Rodríguez')),
  (:beto,    'beto.0086@example.mx',    jsonb_build_object('full_name', 'Beto Pérez')),
  (:carla,   'carla.0086@example.mx',   jsonb_build_object('full_name', 'Carla Díaz')),
  (:dani,    'dani.0086@example.mx',    jsonb_build_object('full_name', 'Dani Luna')),
  (:eli,     'eli.0086@example.mx',     jsonb_build_object('full_name', 'Eli Mora')),
  (:fer,     'fer.0086@example.mx',     jsonb_build_object('full_name', 'Fer Soto')),
  (:gil,     'gil.0086@example.mx',     jsonb_build_object('full_name', 'Gil Ruiz'));

-- Mari's kitchen with her cook (staff); Otra's kitchen; a shop.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0086', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :cook, 'staff', 'Cook 0086');
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0086', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0086') as ws_t \gset
reset role;

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 50}]'::jsonb) is not null as published_m \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.publish_listing(:lo, :'loc_o', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Pozole", "unit_price": "90.00", "quantity": 20}]'::jsonb) is not null as published_o \gset
reset role;
select id as line_m from public.listing_line where listing_id = :lm \gset
select id as line_o from public.listing_line where listing_id = :lo \gset


-- ---- 1. the shape -------------------------------------------------------------------------
select public.chk('1.1 the one door: the signed-in may call it, nobody signed out may',
  has_function_privilege('authenticated', 'public.kitchen_numbers(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_numbers(uuid)', 'execute'));
select public.chk('1.2 the three that count are granted to nobody — never a door of their own',
  not has_function_privilege('authenticated', 'servicio.kitchen_events(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.numbers_in(servicio.kitchen_event[], text, date, date, boolean)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.kitchen_numbers_at(uuid, timestamptz)', 'execute')
  and not has_function_privilege('anon', 'servicio.kitchen_numbers_at(uuid, timestamptz)', 'execute'));
select public.chk('1.3 security definer, stable, its search_path empty — and no new table',
  exists (select 1 from pg_proc p where p.oid = 'public.kitchen_numbers(uuid)'::regprocedure
           and p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=""'])
  and not exists (select 1 from pg_class c where c.relname ~ '(number|numero)' and c.relkind = 'r'));
select public.chk('1.4 a kitchen with nothing yet: no first visit, every count 0, the people null',
  (public._n(:'ws_m', '2026-11-19 14:30') ->> 'since') is null
  and (public._n(:'ws_m', '2026-11-19 14:30') -> 'semana' ->> 'visits')::int = 0
  and (public._n(:'ws_m', '2026-11-19 14:30') -> 'semana' ->> 'plates')::numeric = 0
  and (public._n(:'ws_m', '2026-11-19 14:30') -> 'semana' ->> 'cents')::bigint = 0
  and public._n(:'ws_m', '2026-11-19 14:30') -> 'semana' -> 'neighbours' = 'null'::jsonb
  and public._n(:'ws_m', '2026-11-19 14:30') -> 'semana' -> 'days' = '[0,0,0,0,0,0,0]'::jsonb,
  public._n(:'ws_m', '2026-11-19 14:30')::text);


-- ---- 2. the calendar ----------------------------------------------------------------------
-- Every event at Mari's, in Mexico City's time. 65.00 a plate unless said; ANA's two
-- plates today carry a 5.00 desechable each. The day each visit lands on, by hand:
--
--   day (local)      who                 how                                plates  pesos   hour
--   Wed 09-30 23:30  gil                 handed over (UTC Oct 1 05:30)      1       65.00   23   ← September, not October
--   Thu 10-01 00:30  dani                walk-in stamp (UTC Oct 1 06:30)    0        0.00    0
--   Fri 10-30 14:00  fer                 handed over                        1       65.00   14
--   Sat 10-31 14:20  eli                 the counter scanned her code, and  1       65.00   14   ← ONE visit, on the 31st:
--                                        she swiped Ya lo tengo on Sun 11-01 at 09:00, after          her swipe counts at her
--                                        her window (14:00-15:00) had ended                           window's end, not the 1st
--   Fri 11-13 12:00  ana                 handed over                        2      130.00   12
--   Sat 11-14 16:00  beto                walk-in stamp                      0        0.00   16
--   Sun 11-15 13:00  eli                 she swiped Ya lo tengo only        1       60.00   13
--   Mon 11-16 12:40  fer                 a stamp first, at the counter      0        0.00   12   ← her visit starts here,
--   Mon 11-16 13:45  fer                 then handed over, 3 × 60.00        3      180.00         and is no walk-in;
--   Mon 11-16 15:10  fer                 and a second plate, 1 × 60.00      1       60.00         one visit still
--   Mon 11-16 14:10  carla               handed over + its stamp            1       65.00   14   ← one visit
--   Tue 11-17 18:30  beto                handed over, 1 × 70 (UTC Wed)      1       70.00   18
--   Tue 11-17 23:30  dani                walk-in stamp (UTC Wed 05:30)      0        0.00   23
--   Wed 11-18 13:00  (account gone)      handed over + its stamp, 1 × 50    1       50.00   13   ← one visit, nobody's
--   Wed 11-18 15:00  (account gone)      walk-in stamp                      0        0.00   15   ← a visit of its own
--   Wed 11-18 19:30  ana                 handed over                        1       65.00   19
--   Thu 11-19 13:10  ana                 handed over + its stamp, 2 × 65+5  2      140.00   13
--   Thu 11-19 14:05  beto                she swiped Ya lo tengo, 1 × 80     1       80.00   14
--   Thu 11-19 14:20  carla               walk-in stamp                      0        0.00   14
--   and NOT counted: dani's cancelled today, eli's still waiting today, one of ana's
--   at OTRA's kitchen today, and one never collected last week.
--   OTRA's kitchen is in Tijuana's zone (two hours behind): ana's 4 × 90.00 at 13:30
--   Mexico City time today, and beto's 1 × 90.00 at 23:30 on Wednesday THERE (01:30
--   Thursday in Mexico City) — Wednesday's, in Otra's numbers.
select public._r(gen_random_uuid(), :gil,  :'ws_m', :lm, :'line_m', 101, public._mx('2026-09-30 23:30'), public._mx('2026-09-30 23:30'), null, null, 1, 65, null);
select public._s(:'ws_m', :dani, public._mx('2026-10-01 00:30'), 'su_codigo', null);
select public._r(gen_random_uuid(), :fer,  :'ws_m', :lm, :'line_m', 102, public._mx('2026-10-30 14:00'), public._mx('2026-10-30 14:00'), null, null, 1, 65, null);
select public._r(gen_random_uuid(), :eli,  :'ws_m', :lm, :'line_m', 116, public._mx('2026-10-31 14:00'), null, public._mx('2026-11-01 09:00'), null, 1, 65, null);
select public._s(:'ws_m', :eli, public._mx('2026-10-31 14:20'), 'su_codigo', null);
select public._r(gen_random_uuid(), :ana,  :'ws_m', :lm, :'line_m', 103, public._mx('2026-11-13 12:00'), public._mx('2026-11-13 12:00'), null, null, 2, 65, null);
select public._s(:'ws_m', :beto, public._mx('2026-11-14 16:00'), 'codigo_cocina', null);
select public._r(gen_random_uuid(), :eli,  :'ws_m', :lm, :'line_m', 104, public._mx('2026-11-15 13:00'), null, public._mx('2026-11-15 13:00'), null, 1, 60, null);
select public._r(gen_random_uuid(), :dani, :'ws_m', :lm, :'line_m', 105, public._mx('2026-11-12 13:00'), null, null, null, 1, 65, null);
select public._r(gen_random_uuid(), :fer,  :'ws_m', :lm, :'line_m', 106, public._mx('2026-11-16 13:45'), public._mx('2026-11-16 13:45'), null, null, 3, 60, null);
select public._s(:'ws_m', :fer, public._mx('2026-11-16 12:40'), 'su_codigo', null);
select public._r(gen_random_uuid(), :fer,  :'ws_m', :lm, :'line_m', 117, public._mx('2026-11-16 15:10'), public._mx('2026-11-16 15:10'), null, null, 1, 60, null);
select public._r('0086cccc-0000-4000-8000-000000000001', :carla, :'ws_m', :lm, :'line_m', 107, public._mx('2026-11-16 14:10'), public._mx('2026-11-16 14:10'), null, null, 1, 65, null);
select public._s(:'ws_m', :carla, public._mx('2026-11-16 14:10'), 'entrega', '0086cccc-0000-4000-8000-000000000001');
select public._r(gen_random_uuid(), :beto, :'ws_m', :lm, :'line_m', 108, public._mx('2026-11-17 18:30'), public._mx('2026-11-17 18:30'), null, null, 1, 70, null);
select public._s(:'ws_m', :dani, public._mx('2026-11-17 23:30'), 'su_codigo', null);
select public._r('0086cccc-0000-4000-8000-000000000002', null, :'ws_m', :lm, :'line_m', 109, public._mx('2026-11-18 13:00'), public._mx('2026-11-18 13:00'), null, null, 1, 50, null);
select public._s(:'ws_m', null, public._mx('2026-11-18 13:00'), 'entrega', '0086cccc-0000-4000-8000-000000000002');
select public._s(:'ws_m', null, public._mx('2026-11-18 15:00'), 'su_codigo', null);
select public._r(gen_random_uuid(), :ana,  :'ws_m', :lm, :'line_m', 110, public._mx('2026-11-18 19:30'), public._mx('2026-11-18 19:30'), null, null, 1, 65, null);
select public._r('0086cccc-0000-4000-8000-000000000003', :ana, :'ws_m', :lm, :'line_m', 111, public._mx('2026-11-19 13:10'), public._mx('2026-11-19 13:10'), null, null, 2, 65, 5);
select public._s(:'ws_m', :ana, public._mx('2026-11-19 13:10'), 'entrega', '0086cccc-0000-4000-8000-000000000003');
select public._r(gen_random_uuid(), :beto, :'ws_m', :lm, :'line_m', 112, public._mx('2026-11-19 14:05'), null, public._mx('2026-11-19 14:05'), null, 1, 80, null);
select public._s(:'ws_m', :carla, public._mx('2026-11-19 14:20'), 'su_codigo', null);
select public._r(gen_random_uuid(), :dani, :'ws_m', :lm, :'line_m', 113, public._mx('2026-11-19 13:00'), null, null, public._mx('2026-11-19 10:00'), 1, 65, null);
select public._r(gen_random_uuid(), :eli,  :'ws_m', :lm, :'line_m', 114, public._mx('2026-11-19 17:00'), null, null, null, 1, 65, null);
update public.location set timezone = 'America/Tijuana' where id = :'loc_o';
select public._r(gen_random_uuid(), :ana,  :'ws_o', :lo, :'line_o', 115, public._mx('2026-11-19 13:30'), public._mx('2026-11-19 13:30'), null, null, 4, 90, null);
select public._r(gen_random_uuid(), :beto, :'ws_o', :lo, :'line_o', 118, public._mx('2026-11-19 01:30'), public._mx('2026-11-19 01:30'), null, null, 1, 90, null);

select public._n(:'ws_m', '2026-11-19 14:30') as now_answer \gset


-- ---- 3. today, this week, this month — each against the one before -----------------------
select public.chk('3.1 the day it was read on, and her first visit ever: gil''s, Sept 30 at 23:30 there',
  (:'now_answer'::jsonb ->> 'day') = '2026-11-19'
  and (:'now_answer'::jsonb ->> 'since')::timestamptz = public._mx('2026-09-30 23:30'),
  :'now_answer'::jsonb ->> 'since');

select public.chk('3.2 TODAY (Thu 11-19): 3 visits — ana, beto, carla; 1 walk-in; 3 plates; $220 with the desechables',
  (:'now_answer'::jsonb -> 'dia' ->> 'from') = '2026-11-19' and (:'now_answer'::jsonb -> 'dia' ->> 'to') = '2026-11-19'
  and (:'now_answer'::jsonb -> 'dia' ->> 'visits')::int = 3
  and (:'now_answer'::jsonb -> 'dia' ->> 'walk_ins')::int = 1
  and (:'now_answer'::jsonb -> 'dia' ->> 'plates')::numeric = 3
  and (:'now_answer'::jsonb -> 'dia' ->> 'cents')::bigint = 22000,
  (:'now_answer'::jsonb -> 'dia')::text);
select public.chk('3.3 today''s people: three, under the floor — null, and so is who came back',
  :'now_answer'::jsonb -> 'dia' -> 'neighbours' = 'null'::jsonb
  and :'now_answer'::jsonb -> 'dia' -> 'returning' = 'null'::jsonb);
select public.chk('3.4 today''s hours: one at 13, two at 14 — and nothing else',
  :'now_answer'::jsonb -> 'dia' -> 'hours'
    = '[0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0]'::jsonb,
  (:'now_answer'::jsonb -> 'dia' -> 'hours')::text);
select public.chk('3.5 YESTERDAY (Wed 11-18): 3 visits — ana, and two by an account gone (her handover and its stamp one visit, a walk-in another); 2 plates; $115',
  (:'now_answer'::jsonb -> 'dia' -> 'prev' ->> 'from') = '2026-11-18'
  and (:'now_answer'::jsonb -> 'dia' -> 'prev' ->> 'visits')::int = 3
  and (:'now_answer'::jsonb -> 'dia' -> 'prev' ->> 'walk_ins')::int = 1
  and (:'now_answer'::jsonb -> 'dia' -> 'prev' ->> 'plates')::numeric = 2
  and (:'now_answer'::jsonb -> 'dia' -> 'prev' ->> 'cents')::bigint = 11500
  and :'now_answer'::jsonb -> 'dia' -> 'prev' -> 'neighbours' = 'null'::jsonb,
  (:'now_answer'::jsonb -> 'dia' -> 'prev')::text);
select public.chk('3.6 the period before carries no returning, no days, no hours',
  not (:'now_answer'::jsonb -> 'dia' -> 'prev' ?| array['returning', 'days', 'hours', 'prev'])
  and not (:'now_answer'::jsonb -> 'semana' -> 'prev' ?| array['returning', 'days', 'hours', 'prev']));

select public.chk('3.7 THIS WEEK (Mon 11-16 to Thu 11-19): 10 visits, 3 of them walk-ins; 11 plates (fer''s two one visit); $710',
  (:'now_answer'::jsonb -> 'semana' ->> 'from') = '2026-11-16' and (:'now_answer'::jsonb -> 'semana' ->> 'to') = '2026-11-19'
  and (:'now_answer'::jsonb -> 'semana' ->> 'visits')::int = 10
  and (:'now_answer'::jsonb -> 'semana' ->> 'walk_ins')::int = 3
  and (:'now_answer'::jsonb -> 'semana' ->> 'plates')::numeric = 11
  and (:'now_answer'::jsonb -> 'semana' ->> 'cents')::bigint = 71000,
  (:'now_answer'::jsonb -> 'semana')::text);
select public.chk('3.8 this week''s people: five — fer, carla, beto, dani, ana (the account gone is nobody) — and four had come before: ana, beto, fer, dani',
  (:'now_answer'::jsonb -> 'semana' ->> 'neighbours')::int = 5
  and (:'now_answer'::jsonb -> 'semana' ->> 'returning')::int = 4);
select public.chk('3.9 this week''s days, Monday first: 2, 2, 3, 3 and nothing since — adding up to its visits',
  :'now_answer'::jsonb -> 'semana' -> 'days' = '[2,2,3,3,0,0,0]'::jsonb,
  (:'now_answer'::jsonb -> 'semana' -> 'days')::text);
select public.chk('3.10 this week''s hours, each visit at its first moment there: 12 (fer''s stamp before her plate), 13 ×2, 14 ×3, 15, 18, 19, 23',
  :'now_answer'::jsonb -> 'semana' -> 'hours'
    = '[0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,1,0,0,1,1,0,0,0,1]'::jsonb,
  (:'now_answer'::jsonb -> 'semana' -> 'hours')::text);
select public.chk('3.11 LAST WEEK (Mon 11-09 to Sun 11-15): 3 visits — ana, beto''s walk-in, eli''s swipe; 3 plates; $190; three people, null',
  (:'now_answer'::jsonb -> 'semana' -> 'prev' ->> 'from') = '2026-11-09'
  and (:'now_answer'::jsonb -> 'semana' -> 'prev' ->> 'to') = '2026-11-15'
  and (:'now_answer'::jsonb -> 'semana' -> 'prev' ->> 'visits')::int = 3
  and (:'now_answer'::jsonb -> 'semana' -> 'prev' ->> 'walk_ins')::int = 1
  and (:'now_answer'::jsonb -> 'semana' -> 'prev' ->> 'plates')::numeric = 3
  and (:'now_answer'::jsonb -> 'semana' -> 'prev' ->> 'cents')::bigint = 19000
  and :'now_answer'::jsonb -> 'semana' -> 'prev' -> 'neighbours' = 'null'::jsonb,
  (:'now_answer'::jsonb -> 'semana' -> 'prev')::text);

select public.chk('3.12 THIS MONTH (Nov 1 to 19): 13 visits, 4 walk-ins; 14 plates; $900 — and nothing on the 1st: eli''s late swipe is October''s',
  (:'now_answer'::jsonb -> 'mes' ->> 'from') = '2026-11-01' and (:'now_answer'::jsonb -> 'mes' ->> 'to') = '2026-11-19'
  and (:'now_answer'::jsonb -> 'mes' ->> 'visits')::int = 13
  and (:'now_answer'::jsonb -> 'mes' ->> 'walk_ins')::int = 4
  and (:'now_answer'::jsonb -> 'mes' ->> 'plates')::numeric = 14
  and (:'now_answer'::jsonb -> 'mes' ->> 'cents')::bigint = 90000,
  (:'now_answer'::jsonb -> 'mes')::text);
select public.chk('3.13 this month''s people: six (eli too), and three had come before November — fer, dani and eli',
  (:'now_answer'::jsonb -> 'mes' ->> 'neighbours')::int = 6
  and (:'now_answer'::jsonb -> 'mes' ->> 'returning')::int = 3);
select public.chk('3.14 this month''s days, Monday first: Mon 2, Tue 2, Wed 3, Thu 3, Fri 1, Sat 1, Sun 1',
  :'now_answer'::jsonb -> 'mes' -> 'days' = '[2,2,3,3,1,1,1]'::jsonb,
  (:'now_answer'::jsonb -> 'mes' -> 'days')::text);
select public.chk('3.15 LAST MONTH (Oct 1 to 31): 3 visits — dani''s walk-in at 00:30 on the 1st, fer''s, and eli''s on the 31st, ONE visit with its stamp though she swiped the next morning; gil''s at 23:30 on Sept 30 is not October''s',
  (:'now_answer'::jsonb -> 'mes' -> 'prev' ->> 'from') = '2026-10-01'
  and (:'now_answer'::jsonb -> 'mes' -> 'prev' ->> 'to') = '2026-10-31'
  and (:'now_answer'::jsonb -> 'mes' -> 'prev' ->> 'visits')::int = 3
  and (:'now_answer'::jsonb -> 'mes' -> 'prev' ->> 'walk_ins')::int = 1
  and (:'now_answer'::jsonb -> 'mes' -> 'prev' ->> 'plates')::numeric = 2
  and (:'now_answer'::jsonb -> 'mes' -> 'prev' ->> 'cents')::bigint = 13000,
  (:'now_answer'::jsonb -> 'mes' -> 'prev')::text);

select public.chk('3.16 every set of bars adds up to its period''s visits',
  (select sum(x::int) from jsonb_array_elements_text(:'now_answer'::jsonb -> 'dia' -> 'hours') x) = 3
  and (select sum(x::int) from jsonb_array_elements_text(:'now_answer'::jsonb -> 'semana' -> 'days') x) = 10
  and (select sum(x::int) from jsonb_array_elements_text(:'now_answer'::jsonb -> 'semana' -> 'hours') x) = 10
  and (select sum(x::int) from jsonb_array_elements_text(:'now_answer'::jsonb -> 'mes' -> 'days') x) = 13
  and (select sum(x::int) from jsonb_array_elements_text(:'now_answer'::jsonb -> 'mes' -> 'hours') x) = 13);
select public.chk('3.17 Otra''s kitchen counts only its own, on ITS calendar: ana''s 4 plates today; beto''s 01:30 Thursday in Mexico City is 23:30 Wednesday in Tijuana — yesterday''s',
  (public._n(:'ws_o', '2026-11-19 14:30') ->> 'day') = '2026-11-19'
  and (public._n(:'ws_o', '2026-11-19 14:30') -> 'dia' ->> 'plates')::numeric = 4
  and (public._n(:'ws_o', '2026-11-19 14:30') -> 'dia' -> 'prev' ->> 'plates')::numeric = 1
  and (public._n(:'ws_o', '2026-11-19 14:30') -> 'semana' ->> 'visits')::int = 2
  and (public._n(:'ws_o', '2026-11-19 14:30') -> 'mes' ->> 'cents')::bigint = 45000,
  (public._n(:'ws_o', '2026-11-19 14:30') -> 'dia')::text);
select public.chk('3.18 the answer names nobody: no id, no name, no code anywhere in it',
  :'now_answer' !~* '(0086aaaa|0086bbbb|0086cccc|rodr|p[eé]rez|d[ií]az|"code"|"name"|"id")', :'now_answer');


-- ---- 4. the zone's edges, and the floor ---------------------------------------------------
select public.chk('4.1 Monday at 00:05 there: a new week — nothing in it yet, last week whole',
  (public._n(:'ws_m', '2026-11-23 00:05') -> 'semana' ->> 'from') = '2026-11-23'
  and (public._n(:'ws_m', '2026-11-23 00:05') -> 'semana' ->> 'visits')::int = 0
  and (public._n(:'ws_m', '2026-11-23 00:05') -> 'semana' -> 'prev' ->> 'visits')::int = 10);
select public.chk('4.2 Sunday 11-22 at 23:59 there — Monday 05:59 in UTC — is still this week',
  (public._n(:'ws_m', '2026-11-22 23:59') -> 'semana' ->> 'from') = '2026-11-16'
  and (public._n(:'ws_m', '2026-11-22 23:59') -> 'semana' ->> 'visits')::int = 10);
select public.chk('4.3 December 1st: November whole as the month before',
  (public._n(:'ws_m', '2026-12-01 09:00') -> 'mes' -> 'prev' ->> 'from') = '2026-11-01'
  and (public._n(:'ws_m', '2026-12-01 09:00') -> 'mes' -> 'prev' ->> 'to') = '2026-11-30'
  and (public._n(:'ws_m', '2026-12-01 09:00') -> 'mes' -> 'prev' ->> 'visits')::int = 13
  and (public._n(:'ws_m', '2026-12-01 09:00') -> 'mes' -> 'prev' ->> 'neighbours')::int = 6);
select public.chk('4.4 THE FLOOR AT FOUR: on Tuesday night the week''s people are fer, carla, beto, dani — null, and so is who came back',
  (public._n(:'ws_m', '2026-11-17 23:59') -> 'semana' ->> 'visits')::int = 4
  and public._n(:'ws_m', '2026-11-17 23:59') -> 'semana' -> 'neighbours' = 'null'::jsonb
  and public._n(:'ws_m', '2026-11-17 23:59') -> 'semana' -> 'returning' = 'null'::jsonb);


-- ---- 5. who may read it -------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('mari', format('select public.kitchen_numbers(%L)', :'ws_m')) as mari_call \gset
reset role;
select public.chk('5.1 her owner reads it — and now is now: the same answer as the moment run as postgres',
  :'mari_call' = 'ok'
  and (select a.body from public._answer a where a.who = 'mari')
      = servicio.kitchen_numbers_at(:'ws_m', now()),
  :'mari_call');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.kitchen_numbers(%L)', :'ws_m')) as cook_try \gset
reset role;
select public.chk('5.2 her helper is refused (42501) — her numbers are the owner''s', :'cook_try' = '42501', :'cook_try');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.kitchen_numbers(%L)', :'ws_m')) as otra_try \gset
reset role;
select public.chk('5.3 another kitchen''s owner is refused (42501)', :'otra_try' = '42501', :'otra_try');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.kitchen_numbers(%L)', :'ws_m')) as ana_try \gset
reset role;
select public.chk('5.4 a neighbour who came is refused (42501)', :'ana_try' = '42501', :'ana_try');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.kitchen_numbers(%L)', :'ws_t')) as shop_try \gset
reset role;
select public.chk('5.5 a shop''s own owner is refused TD013 — only a kitchen has these numbers', :'shop_try' = 'TD013', :'shop_try');

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.kitchen_numbers(%L)', :'ws_m')) as nobody_try \gset
reset role;
set local role anon;
select public._try(format('select public.kitchen_numbers(%L)', :'ws_m')) as anon_try \gset
reset role;
select public.chk('5.6 nobody signed in is refused (42501), and anon cannot call it at all (42501)',
  :'nobody_try' = '42501' and :'anon_try' = '42501', :'nobody_try' || ' / ' || :'anon_try');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try('select public.kitchen_numbers(null)') as null_try \gset
reset role;
select public.chk('5.7 no kitchen named: refused (42501)', :'null_try' = '42501', :'null_try');

update public.workspace_member set is_active = false where workspace_id = :'ws_m' and user_id = :mari;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.kitchen_numbers(%L)', :'ws_m')) as gone_try \gset
reset role;
select public.chk('5.8 an owner no longer active there is refused (42501)', :'gone_try' = '42501', :'gone_try');


-- ---- the verdict --------------------------------------------------------------------------
select n, label, case when passed then 'PASS' else 'FAIL' end as result, detail
  from public._verify order by n;

do $$
declare v_fail integer; v_all integer;
begin
  select count(*) filter (where not passed), count(*) into v_fail, v_all from public._verify;
  if v_fail > 0 then
    raise exception '% of % checks failed', v_fail, v_all;
  end if;
  raise notice 'all % checks passed', v_all;
end;
$$;

rollback;
