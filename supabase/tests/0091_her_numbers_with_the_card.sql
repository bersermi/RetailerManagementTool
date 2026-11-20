-- ============================================================================
-- 0091 — her numbers with the loyalty card (`10.9l`; the owner's ruling of
-- 2026-11-19, night: *"Yes to everything"*).
--
-- ⚠️ ASSERTED AGAINST A CALENDAR, NEVER AGAINST THE FUNCTION'S OWN ARITHMETIC:
-- the fixture is a kitchen's card from October to today written stamp by stamp
-- in Mexico City's time — through `servicio.give_card_stamp` itself, in the
-- order they happened, so the counts, the rewards and a card erased by her
-- coming back are the database's own — and every expected figure below was
-- counted BY HAND from the table in section 2, not by a second query. The
-- moment the numbers are read at is fixed — THURSDAY 2026-11-19, 14:30 in Mexico
-- City — through `servicio.kitchen_numbers_at`, run as postgres, as `0086`'s
-- suite does. The one door is then called AS THE OWNER for the answer's keys.
--
-- Section 1 the shape and the rights. Section 2 the calendar. Section 3 the six
-- answers for today, this week and this month, each against the period before.
-- Section 4 a card going one period earlier, worked out again: a closing, a
-- reopening, the terms a card started on. Section 5 the nightly job: it counts
-- what it erases, on the day her days ran out, and changes no figure. Section 6
-- the one door's keys, as the owner.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK. ⚠️ SECTION 5 RUNS THE NIGHTLY JOB AT THE
-- REAL `now()`, which erases every card past its days in every kitchen — so the
-- figures of sections 3 and 4 are asserted before it, and after it only those
-- no date can move.
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

-- A local moment in Mexico City.
create function public._mx(p text) returns timestamptz language sql immutable as $$
  select (p::timestamp) at time zone 'America/Mexico_City'
$$;
-- The answer read at Thursday 2026-11-19, 14:30 in Mexico City, as postgres.
create function public._n(p_ws uuid) returns jsonb language sql as $$
  select servicio.kitchen_numbers_at(p_ws, public._mx('2026-11-19 14:30'))
$$;
-- A collected reservation of one plate at $60, written as postgres (no trigger stamps it:
-- `card_stamp_on_handover` fires on an UPDATE of `handed_over_at`).
create function public._r(p_id uuid, p_buyer uuid, p_listing uuid, p_line uuid, p_code integer,
                          p_hour timestamptz, p_handed timestamptz, p_picked timestamptz)
returns void language plpgsql as $$
begin
  insert into public.reservation
    (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day, held_until,
     payment, eat, created_at, handed_over_at, handed_over_by, picked_up_at)
  select p_id, li.workspace_id, li.location_id, li.id, p_buyer, p_code, p_hour,
         (p_hour at time zone 'America/Mexico_City')::date, p_hour + interval '1 hour',
         'efectivo', 'llevar', p_hour - interval '2 hours',
         p_handed, case when p_handed is not null then gen_random_uuid() end, p_picked
    from public.listing li where li.id = p_listing;
  insert into public.reservation_line
    (reservation_id, line_no, workspace_id, location_id, listing_line_id, quantity, unit_price)
  select p_id, 1, li.workspace_id, li.location_id, p_line, 1, 60
    from public.listing li where li.id = p_listing;
end;
$$;
-- A stamp written straight into the table (section 4's kitchen): count 1 of 4.
create function public._s(p_ws uuid, p_user uuid, p_at timestamptz)
returns void language sql as $$
  insert into servicio.card_stamp (workspace_id, user_id, day, given_at, given_by, via, reservation_id, count_after, of_stamps)
  values (p_ws, p_user, (p_at at time zone 'America/Mexico_City')::date, p_at, gen_random_uuid(), 'su_codigo', null, 1, 4);
$$;
-- A kitchen's stamps and terms as `kitchen_numbers_at` reads them.
create function public._going(p_ws uuid, p_at text) returns integer language sql as $$
  select servicio.cards_going_at(
    (select coalesce(array_agg(s), '{}') from servicio.card_stamp s where s.workspace_id = p_ws),
    (select coalesce(array_agg(t), '{}') from servicio.card_terms t where t.workspace_id = p_ws),
    public._mx(p_at))
$$;

\set dona '''0091aaaa-0000-4000-8000-000000000001'''
\set jefa '''0091aaaa-0000-4000-8000-000000000002'''
\set luz  '''0091aaaa-0000-4000-8000-000000000003'''
\set a    '''0091aaaa-0000-4000-8000-000000000011'''
\set b    '''0091aaaa-0000-4000-8000-000000000012'''
\set c    '''0091aaaa-0000-4000-8000-000000000013'''
\set d    '''0091aaaa-0000-4000-8000-000000000014'''
\set e    '''0091aaaa-0000-4000-8000-000000000015'''
\set f    '''0091aaaa-0000-4000-8000-000000000016'''
\set g    '''0091aaaa-0000-4000-8000-000000000017'''
\set h    '''0091aaaa-0000-4000-8000-000000000018'''
\set i    '''0091aaaa-0000-4000-8000-000000000019'''
\set lk   '''0091bbbb-0000-4000-8000-000000000001'''
\set rd1  '''0091cccc-0000-4000-8000-000000000001'''
\set rd2  '''0091cccc-0000-4000-8000-000000000002'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:dona, 'dona.0091@example.mx', jsonb_build_object('full_name', 'Doña 0091')),
  (:jefa, 'jefa.0091@example.mx', jsonb_build_object('full_name', 'Jefa 0091')),
  (:luz,  'luz.0091@example.mx',  jsonb_build_object('full_name', 'Luz 0091')),
  (:a, 'a.0091@example.mx', jsonb_build_object('full_name', 'Ana A')),
  (:b, 'b.0091@example.mx', jsonb_build_object('full_name', 'Beto B')),
  (:c, 'c.0091@example.mx', jsonb_build_object('full_name', 'Carla C')),
  (:d, 'd.0091@example.mx', jsonb_build_object('full_name', 'Dani D')),
  (:e, 'e.0091@example.mx', jsonb_build_object('full_name', 'Eli E')),
  (:f, 'f.0091@example.mx', jsonb_build_object('full_name', 'Fer F')),
  (:g, 'g.0091@example.mx', jsonb_build_object('full_name', 'Gil G')),
  (:h, 'h.0091@example.mx', jsonb_build_object('full_name', 'Hugo H')),
  (:i, 'i.0091@example.mx', jsonb_build_object('full_name', 'Iris I'));

-- Doña's kitchen (K), the kitchen whose card the nightly job erases (J), and the kitchen
-- section 4 closes and reopens (L).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dona), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña 0091', p_kind => 'cocina') as ws_k \gset
reset role;
select id as loc_k from public.location where workspace_id = :'ws_k' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :jefa), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Jefa 0091', p_kind => 'cocina') as ws_j \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :luz), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Luz 0091', p_kind => 'cocina') as ws_l \gset
reset role;

-- An offer of Doña's, for the reservations below.
select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dona), true);
set local role authenticated;
select public.publish_listing(:lk, :'loc_k', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "60.00", "quantity": 50}]'::jsonb) is not null as published_k \gset
reset role;
select id as line_k from public.listing_line where listing_id = :lk \gset

-- Wera's switch for the card on (the stamp refuses `apagada` without it); K's and J's terms
-- written as they stood since September: 4 stamps, erased after 14 days without one.
update servicio.feature_switch set is_on = true where name = 'tarjeta';
insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_at, created_by) values
  (:'ws_k', 'Un agua fresca', 4, 14, public._mx('2026-09-01 00:00'), :dona),
  (:'ws_j', 'Un postre',      4, 14, public._mx('2026-09-01 00:00'), :jefa);


-- ---- 1. the shape and the rights ----------------------------------------------------------
select public.chk('1.1 the one door is still the signed-in''s and nobody else''s',
  has_function_privilege('authenticated', 'public.kitchen_numbers(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_numbers(uuid)', 'execute'));
select public.chk('1.2 every function that counts the card is granted to nobody — never a door of its own',
  not has_function_privilege('authenticated', 'servicio.count_erased(uuid, date, integer)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.card_numbers_in(servicio.card_stamp[], servicio.card_reward[], servicio.card_erased[], text, date, date, boolean, boolean)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.cards_going_now(uuid, timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.cards_going_at(servicio.card_stamp[], servicio.card_terms[], timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.period_numbers(servicio.kitchen_event[], servicio.card_stamp[], servicio.card_reward[], servicio.card_erased[], servicio.card_terms[], text, date, date, date, date, jsonb, timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.kitchen_numbers_at(uuid, timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.forget_cards()', 'execute')
  and not has_function_privilege('authenticated', 'servicio.give_card_stamp(uuid, uuid, timestamptz, uuid, text, uuid)', 'execute')
  and not has_function_privilege('anon', 'servicio.cards_going_now(uuid, timestamptz)', 'execute'));
select public.chk('1.3 the one thing kept is no client role''s to read or write',
  not has_table_privilege('authenticated', 'servicio.card_erased', 'select')
  and not has_table_privilege('authenticated', 'servicio.card_erased', 'insert')
  and not has_table_privilege('anon', 'servicio.card_erased', 'select'));
select public.chk('1.4 ... and it holds a number per kitchen per day, no person: its columns are those three',
  (select array_agg(a.attname::text order by a.attnum) from pg_attribute a
    where a.attrelid = 'servicio.card_erased'::regclass and a.attnum > 0 and not a.attisdropped)
  = array['workspace_id', 'day', 'cards']);
select public.chk('1.5 the nightly job is still scheduled, unchanged',
  exists (select 1 from cron.job j where j.jobname = 'forget-cards' and j.active
           and j.schedule = '21 9 * * *' and j.command = 'select servicio.forget_cards()'));
select public.chk('1.6 a kitchen with no card: the card''s figures are 0, its people null, nothing waiting',
  (public._n(:'ws_l') ->> 'rewards_waiting')::int = 0
  and (public._n(:'ws_l') -> 'semana' ->> 'stamps')::int = 0
  and (public._n(:'ws_l') -> 'semana' ->> 'stamps_handover')::int = 0
  and (public._n(:'ws_l') -> 'semana' ->> 'rewards_won')::int = 0
  and (public._n(:'ws_l') -> 'semana' ->> 'rewards_claimed')::int = 0
  and (public._n(:'ws_l') -> 'semana' ->> 'cards_erased')::int = 0
  and public._n(:'ws_l') -> 'semana' -> 'cards_going' = 'null'::jsonb
  and public._n(:'ws_l') -> 'semana' -> 'cards_one_away' = 'null'::jsonb
  and public._n(:'ws_l') -> 'semana' -> 'cards_started' = 'null'::jsonb
  and public._n(:'ws_l') -> 'semana' -> 'return_days' = 'null'::jsonb
  and public._n(:'ws_l') -> 'semana' -> 'prev' -> 'cards_going' = 'null'::jsonb,
  public._n(:'ws_l')::text);


-- ---- 2. the calendar ----------------------------------------------------------------------
-- Every stamp at Doña's (4 stamps, 14 days), in Mexico City's time, in the order given;
-- and two neighbours' reservations. The count after each, by hand:
--
--   day (local)       who  what                                          count   note
--   Tue 10-20 21:30   A    stamp                                         1       A's first ever
--   Wed 10-28 10:00   E    stamp                                         1       E's first; never back:
--                                                                                her days run out Wed 11-11 10:00
--   Mon 11-02 12:00   B    stamp                                         1       B's first
--   Thu 11-05 16:00   F    stamp                                         1       F's first
--   Mon 11-09 12:00   B    stamp                                         2
--   Tue 11-10 13:00   A    stamp — her days ran out Tue 11-03 21:30      1       ERASED BY HER COMING BACK,
--                          (Wed 11-04 in UTC): her card erased, a new            counted on Tue 11-03, the
--                          one begun                                             kitchen's day
--   Wed 11-11 14:00   C    stamp                                         1       C's first
--   Thu 11-12 12:00   B    stamp                                         3
--   Fri 11-13 16:00   F    stamp                                         2
--   Sat 11-14 18:00   H    stamp                                         1       H's first
--   Mon 11-16 12:00   B    stamp — the reward won                        4/4     card over
--   Mon 11-16 15:00   D    a reservation handed over, and its stamp      1       D's first; one visit
--   Mon 11-16 18:00   H    stamp                                         2
--   Tue 11-17 09:00   G    stamp                                         1       G's first
--   Tue 11-17 12:30   I    a reservation handed over, no stamp           —       I never stamps
--   Tue 11-17 13:00   A    stamp                                         2
--   Tue 11-17 14:00   C    stamp                                         2
--   Tue 11-17 18:00   H    stamp                                         3
--   Wed 11-18 09:00   G    stamp                                         2
--   Wed 11-18 12:00   B    stamp — a new card                            1
--   Wed 11-18 12:05   B    claims the reward she won on Monday
--   Wed 11-18 15:00   D    a reservation handed over, and its stamp      2       one visit
--   Wed 11-18 18:00   H    stamp — the reward won, never claimed         4/4     card over
--   Thu 11-19 09:00   G    stamp                                         3       one from the reward
--   Thu 11-19 11:00   F    stamp                                         3       one from the reward
--   Thu 11-19 12:10   I    a reservation she swiped Ya lo tengo on        —
--   Thu 11-19 13:00   A    stamp                                         3       one from the reward
--
-- Read at Thu 11-19 14:30. Week: Mon 11-16 to today; the week before, 11-09 to 11-15.
create function public._st(p_user uuid, p_at text, p_via text default 'su_codigo', p_res uuid default null)
returns text language sql as $$
  select servicio.give_card_stamp(
    (select w.id from public.workspace w where w.display_name = 'Fonda Doña 0091'),
    p_user, public._mx(p_at), '0091aaaa-0000-4000-8000-000000000001'::uuid, p_via, p_res)
$$;

select public._st(:a, '2026-10-20 21:30') as s01 \gset
select public._st(:e, '2026-10-28 10:00') as s02 \gset
select public._st(:b, '2026-11-02 12:00') as s03 \gset
select public._st(:f, '2026-11-05 16:00') as s04 \gset
select public._st(:b, '2026-11-09 12:00') as s05 \gset
select public._st(:a, '2026-11-10 13:00') as s06 \gset
select public._st(:c, '2026-11-11 14:00') as s07 \gset
select public._st(:b, '2026-11-12 12:00') as s08 \gset
select public._st(:f, '2026-11-13 16:00') as s09 \gset
select public._st(:h, '2026-11-14 18:00') as s10 \gset
select public._st(:b, '2026-11-16 12:00') as s11 \gset
select public._r(:rd1, :d, :lk, :'line_k', 301, public._mx('2026-11-16 15:00'), public._mx('2026-11-16 15:00'), null);
select public._st(:d, '2026-11-16 15:00', 'entrega', :rd1) as s12 \gset
select public._st(:h, '2026-11-16 18:00') as s13 \gset
select public._st(:g, '2026-11-17 09:00') as s14 \gset
select public._r(gen_random_uuid(), :i, :lk, :'line_k', 302, public._mx('2026-11-17 12:30'), public._mx('2026-11-17 12:30'), null);
select public._st(:a, '2026-11-17 13:00') as s15 \gset
select public._st(:c, '2026-11-17 14:00') as s16 \gset
select public._st(:h, '2026-11-17 18:00') as s17 \gset
select public._st(:g, '2026-11-18 09:00') as s18 \gset
select public._st(:b, '2026-11-18 12:00') as s19 \gset
update servicio.card_reward set claimed_at = public._mx('2026-11-18 12:05'), claimed_by = :dona, claimed_via = 'su_codigo'
 where workspace_id = :'ws_k' and user_id = :b;
select public._r(:rd2, :d, :lk, :'line_k', 303, public._mx('2026-11-18 15:00'), public._mx('2026-11-18 15:00'), null);
select public._st(:d, '2026-11-18 15:00', 'entrega', :rd2) as s20 \gset
select public._st(:h, '2026-11-18 18:00') as s21 \gset
select public._st(:g, '2026-11-19 09:00') as s22 \gset
select public._st(:f, '2026-11-19 11:00') as s23 \gset
select public._r(gen_random_uuid(), :i, :lk, :'line_k', 304, public._mx('2026-11-19 12:00'), null, public._mx('2026-11-19 12:10'));
select public._st(:a, '2026-11-19 13:00') as s24 \gset

select public.chk('2.1 the stamps were the database''s own: A back after her days is a stamp on a new card, B and H won',
  :'s01' = 'primer' and :'s06' = 'sello' and :'s11' = 'gano' and :'s19' = 'sello' and :'s21' = 'gano'
  and :'s24' = 'sello' and :'s12' = 'primer',
  concat_ws(' ', :'s01', :'s06', :'s11', :'s19', :'s21', :'s24', :'s12'));
select public.chk('2.2 A coming back after her days counted ONE card erased, on the day they ran out (Tue 11-03) — and nothing else yet',
  (select array_agg(e.day::text || ':' || e.cards order by e.day) from servicio.card_erased e where e.workspace_id = :'ws_k')
  = array['2026-11-03:1'],
  (select string_agg(e.day::text || ':' || e.cards, ' ') from servicio.card_erased e where e.workspace_id = :'ws_k'));


-- ---- 3. the six answers ------------------------------------------------------------------
-- (1) stamps of visits, and at a handover — visits are 0086's (one person one day).
--   today 11-19: A, F, G stamped; I reserved → 4 visits, 3 stamps, 0 at a handover; yesterday
--   B, D (reservation + stamp, one visit), G, H → 4 visits, 4 stamps.
--   this week: 16 visits (3 + 5 + 4 + 4), 14 stamps, 2 at a handover (D's); the week before
--   B, A, C, B, F, H → 6 visits, 6 stamps.
--   this month: 24 visits, 22 stamps, 2 at a handover; October A, E → 2 and 2.
select public.chk('3.1 today: 3 stamps of 4 visits, none at a handover; yesterday 4 of 4',
  (public._n(:'ws_k') -> 'dia' ->> 'stamps')::int = 3 and (public._n(:'ws_k') -> 'dia' ->> 'visits')::int = 4
  and (public._n(:'ws_k') -> 'dia' ->> 'stamps_handover')::int = 0
  and (public._n(:'ws_k') -> 'dia' -> 'prev' ->> 'stamps')::int = 4 and (public._n(:'ws_k') -> 'dia' -> 'prev' ->> 'visits')::int = 4,
  (public._n(:'ws_k') -> 'dia')::text);
select public.chk('3.2 this week: 14 stamps of 16 visits, 2 at a handover; the week before 6 of 6',
  (public._n(:'ws_k') -> 'semana' ->> 'stamps')::int = 14 and (public._n(:'ws_k') -> 'semana' ->> 'visits')::int = 16
  and (public._n(:'ws_k') -> 'semana' ->> 'stamps_handover')::int = 2
  and (public._n(:'ws_k') -> 'semana' -> 'prev' ->> 'stamps')::int = 6 and (public._n(:'ws_k') -> 'semana' -> 'prev' ->> 'visits')::int = 6,
  (public._n(:'ws_k') -> 'semana')::text);
select public.chk('3.3 this month: 22 stamps of 24 visits, 2 at a handover; October 2 of 2',
  (public._n(:'ws_k') -> 'mes' ->> 'stamps')::int = 22 and (public._n(:'ws_k') -> 'mes' ->> 'visits')::int = 24
  and (public._n(:'ws_k') -> 'mes' ->> 'stamps_handover')::int = 2
  and (public._n(:'ws_k') -> 'mes' -> 'prev' ->> 'stamps')::int = 2 and (public._n(:'ws_k') -> 'mes' -> 'prev' ->> 'visits')::int = 2,
  (public._n(:'ws_k') -> 'mes')::text);
select public.chk('3.4 a period before carries no handover split and no claims: only what its line says',
  not (public._n(:'ws_k') -> 'semana' -> 'prev' ? 'stamps_handover')
  and not (public._n(:'ws_k') -> 'semana' -> 'prev' ? 'rewards_claimed')
  and not (public._n(:'ws_k') -> 'semana' -> 'prev' ? 'cards_one_away'));

-- (2) rewards: B won Mon 11-16 and claimed it Wed 11-18; H won Wed 11-18, still waiting.
select public.chk('3.5 rewards won: today 0, yesterday 1; this week 2, the week before 0; this month 2, October 0',
  (public._n(:'ws_k') -> 'dia' ->> 'rewards_won')::int = 0 and (public._n(:'ws_k') -> 'dia' -> 'prev' ->> 'rewards_won')::int = 1
  and (public._n(:'ws_k') -> 'semana' ->> 'rewards_won')::int = 2 and (public._n(:'ws_k') -> 'semana' -> 'prev' ->> 'rewards_won')::int = 0
  and (public._n(:'ws_k') -> 'mes' ->> 'rewards_won')::int = 2 and (public._n(:'ws_k') -> 'mes' -> 'prev' ->> 'rewards_won')::int = 0);
select public.chk('3.6 claimed: today 0, this week 1, this month 1 — and 1 waiting now (H''s)',
  (public._n(:'ws_k') -> 'dia' ->> 'rewards_claimed')::int = 0
  and (public._n(:'ws_k') -> 'semana' ->> 'rewards_claimed')::int = 1
  and (public._n(:'ws_k') -> 'mes' ->> 'rewards_claimed')::int = 1
  and (public._n(:'ws_k') ->> 'rewards_waiting')::int = 1);

-- (3) cards going now: A 3/4, B 1, C 2, D 2, F 3/4, G 3/4 — E's days ran out on 11-11, H's
-- card ended with her reward → 6, of them 3 one stamp from the reward. The same in every period.
select public.chk('3.7 cards going now: 6, of them 3 one stamp from the reward — in all three periods',
  (select bool_and((public._n(:'ws_k') -> p ->> 'cards_going')::int = 6
                   and (public._n(:'ws_k') -> p ->> 'cards_one_away')::int = 3)
     from unnest(array['dia', 'semana', 'mes']) p),
  (public._n(:'ws_k') -> 'semana' ->> 'cards_going') || ' / ' || (public._n(:'ws_k') -> 'semana' ->> 'cards_one_away'));
-- One period earlier, from the stamps alone:
--   Wed 11-18 14:30: A 2, B 1 (her new card, 12:00), C 2, D 1 (her 15:00 stamp not yet), F 2,
--   G 2, H 3 (her reward at 18:00 not yet) — E's days had run out → 7.
--   Thu 11-12 14:30: A 1, B 3 (12:00), C 1, F 1 — E's ran out the day before, at 10:00 → 4,
--   under five: null. (With E it would be five, and shown.)
--   Sun 10-19 14:30: nobody yet → null.
select public.chk('3.8 a day earlier (yesterday 14:30): 7 cards going — B''s new card in, D''s and H''s later stamps out',
  (public._n(:'ws_k') -> 'dia' -> 'prev' ->> 'cards_going')::int = 7,
  (public._n(:'ws_k') -> 'dia' -> 'prev' ->> 'cards_going'));
select public.chk('3.9 a week earlier: 4, under the floor — null, because E''s days had run out by then',
  public._n(:'ws_k') -> 'semana' -> 'prev' -> 'cards_going' = 'null'::jsonb,
  (public._n(:'ws_k') -> 'semana' -> 'prev' -> 'cards_going')::text);
select public.chk('3.10 a month earlier: nobody yet — null',
  public._n(:'ws_k') -> 'mes' -> 'prev' -> 'cards_going' = 'null'::jsonb);
select public.chk('3.11 worked out from the stamps at the moment read, the cards going are the cards'' own count: 6',
  public._going(:'ws_k', '2026-11-19 14:30') = 6, public._going(:'ws_k', '2026-11-19 14:30')::text);

-- (4) new cards — the first stamp ever: A 10-20, E 10-28, B 11-02, F 11-05, C 11-11, H 11-14,
-- D 11-16, G 11-17. Shown while the period's neighbours reach five (0086's `neighbours`):
-- today A, F, G, I → 4: null; yesterday B, D, G, H → 4: null; this week 8; the week before
-- A, B, C, F, H → 5; this month 8; October A, E → 2: null.
select public.chk('3.12 new cards this week 2 (D, G), the week before 2 (C, H); this month 6',
  (public._n(:'ws_k') -> 'semana' ->> 'cards_started')::int = 2
  and (public._n(:'ws_k') -> 'semana' -> 'prev' ->> 'cards_started')::int = 2
  and (public._n(:'ws_k') -> 'mes' ->> 'cards_started')::int = 6,
  (public._n(:'ws_k') -> 'semana' ->> 'cards_started') || ' ' || (public._n(:'ws_k') -> 'semana' -> 'prev' ->> 'cards_started')
  || ' ' || (public._n(:'ws_k') -> 'mes' ->> 'cards_started'));
select public.chk('3.13 ... and null wherever the period had under five neighbours: today, yesterday, October — A''s first stamp there not shown',
  public._n(:'ws_k') -> 'dia' -> 'cards_started' = 'null'::jsonb
  and public._n(:'ws_k') -> 'dia' -> 'prev' -> 'cards_started' = 'null'::jsonb
  and public._n(:'ws_k') -> 'mes' -> 'prev' -> 'cards_started' = 'null'::jsonb
  and public._n(:'ws_k') -> 'dia' -> 'neighbours' = 'null'::jsonb
  and (public._n(:'ws_k') -> 'semana' -> 'prev' ->> 'neighbours')::int = 5);

-- (5) the gaps, by hand: A 21, 7, 2; B 7, 3, 4, 2; C 6; D 2; F 8, 6; G 1, 1; H 2, 1, 1.
--   this week (gaps ending 11-16..11-19): A 7, 2; B 4, 2; C 6; D 2; F 6; G 1, 1; H 2, 1, 1 —
--   seven people; sorted 1 1 1 1 2 2 | 2 2 4 6 6 7 → the middle 2.
--   this month: those and A 21, B 7, 3, F 8 — sorted 1 1 1 1 2 2 2 2 | 3 4 6 6 7 7 8 21 →
--   (2 + 3) / 2 = 2.5, rounded 3.
--   the week before: A 21, B 7, 3, F 8 — three people: null. Today A, F, G: null.
--   Yesterday B, D, G, H — four: null. October: no gap at all: null.
select public.chk('3.14 how often they come back: this week every 2 days; this month 3 (2.5, rounded)',
  (public._n(:'ws_k') -> 'semana' ->> 'return_days')::int = 2
  and (public._n(:'ws_k') -> 'mes' ->> 'return_days')::int = 3,
  (public._n(:'ws_k') -> 'semana' ->> 'return_days') || ' / ' || (public._n(:'ws_k') -> 'mes' ->> 'return_days'));
select public.chk('3.15 ... and null under five people with a gap: the week before (3), today (3), yesterday (4), October (0)',
  public._n(:'ws_k') -> 'semana' -> 'prev' -> 'return_days' = 'null'::jsonb
  and public._n(:'ws_k') -> 'dia' -> 'return_days' = 'null'::jsonb
  and public._n(:'ws_k') -> 'dia' -> 'prev' -> 'return_days' = 'null'::jsonb
  and public._n(:'ws_k') -> 'mes' -> 'prev' -> 'return_days' = 'null'::jsonb);

-- (6) cards erased: A's on Tue 11-03 (kept, by her stamp); E's on Wed 11-11 (past its days,
-- the job not run: counted from the card). Today 0, yesterday 0; this week 0, the week
-- before 1; this month 2, October 0.
select public.chk('3.16 cards erased: this week 0, the week before 1 (E''s, not yet reached by the job); this month 2; today and October 0',
  (public._n(:'ws_k') -> 'semana' ->> 'cards_erased')::int = 0
  and (public._n(:'ws_k') -> 'semana' -> 'prev' ->> 'cards_erased')::int = 1
  and (public._n(:'ws_k') -> 'mes' ->> 'cards_erased')::int = 2
  and (public._n(:'ws_k') -> 'mes' -> 'prev' ->> 'cards_erased')::int = 0
  and (public._n(:'ws_k') -> 'dia' ->> 'cards_erased')::int = 0
  and (public._n(:'ws_k') -> 'dia' -> 'prev' ->> 'cards_erased')::int = 0,
  (public._n(:'ws_k') -> 'mes' ->> 'cards_erased'));
select public.chk('3.17 0086''s figures stand beside them: her first visit A''s, this week''s 8 neighbours and 4 walk-ins today',
  (public._n(:'ws_k') ->> 'since')::timestamptz = public._mx('2026-10-20 21:30')
  and (public._n(:'ws_k') -> 'semana' ->> 'neighbours')::int = 8
  and (public._n(:'ws_k') -> 'dia' ->> 'walk_ins')::int = 3,
  (public._n(:'ws_k') ->> 'since'));


-- ---- 4. a card going one period earlier, worked out again ---------------------------------
-- Luz's kitchen: five neighbours stamped once on Thu 09-10 at 12:00, on terms with no days
-- (Nunca), and her card closed on Sun 09-20 at 12:00 — kept 30 days, to Tue 10-20 12:00.
insert into servicio.card_terms (id, workspace_id, reward, stamps, expiry_days, created_at, created_by, closed_at)
values ('0091dddd-0000-4000-8000-000000000001', :'ws_l', 'Un café', 4, null, public._mx('2026-09-01 00:00'), :luz,
        public._mx('2026-09-20 12:00'));
select public._s(:'ws_l', x, public._mx('2026-09-10 12:00')) from unnest(array[:a, :b, :c, :d, :e]::uuid[]) x;
select public.chk('4.1 closed, inside its 30 days (Thu 10-15): the five cards still going',
  public._going(:'ws_l', '2026-10-15 12:00') = 5, public._going(:'ws_l', '2026-10-15 12:00')::text);
select public.chk('4.2 closed 30 days by then (Sun 10-25): none going — null',
  public._going(:'ws_l', '2026-10-25 12:00') is null, public._going(:'ws_l', '2026-10-25 12:00')::text);
-- She reopened it on Thu 10-01, inside the 30 days: nothing was erased.
update servicio.card_terms set replaced_at = public._mx('2026-10-01 12:00') where workspace_id = :'ws_l';
insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_at, created_by)
values (:'ws_l', 'Un café', 4, null, public._mx('2026-10-01 12:00'), :luz);
select public.chk('4.3 reopened inside the 30 days (10-01): on Sun 10-25 the five still going',
  public._going(:'ws_l', '2026-10-25 12:00') = 5, public._going(:'ws_l', '2026-10-25 12:00')::text);
-- Instead she reopened it on Sat 10-24, past them: her cards had been erased on 10-20.
update servicio.card_terms set replaced_at = public._mx('2026-10-24 12:00')
 where id = '0091dddd-0000-4000-8000-000000000001';
update servicio.card_terms set created_at = public._mx('2026-10-24 12:00')
 where workspace_id = :'ws_l' and replaced_at is null;
select public.chk('4.4 reopened only past the 30 days (10-24): on Sun 10-25 none going — null',
  public._going(:'ws_l', '2026-10-25 12:00') is null, public._going(:'ws_l', '2026-10-25 12:00')::text);
-- Terms of 14 days when the five began, replaced by Nunca on Tue 09-15: their cards keep 14.
delete from servicio.card_terms where workspace_id = :'ws_l';
insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_at, created_by, replaced_at)
values (:'ws_l', 'Un café', 4, 14, public._mx('2026-09-01 00:00'), :luz, public._mx('2026-09-15 12:00'));
insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_at, created_by)
values (:'ws_l', 'Un café', 4, null, public._mx('2026-09-15 12:00'), :luz);
select public.chk('4.5 a card keeps the days of the terms it began on: 14 days after 09-10 none going on 10-01, though today''s terms say Nunca',
  public._going(:'ws_l', '2026-10-01 12:00') is null and public._going(:'ws_l', '2026-09-20 12:00') = 5,
  coalesce(public._going(:'ws_l', '2026-10-01 12:00')::text, 'null') || ' / ' || coalesce(public._going(:'ws_l', '2026-09-20 12:00')::text, 'null'));


-- ---- 5. the nightly job -------------------------------------------------------------------
-- Jefa's kitchen: E stamped once on Thu 10-01 at 10:00 — her days ran out Thu 10-15 at 10:00;
-- F once on Sat 10-17 at 23:30 — hers ran out Sat 10-31 at 23:30, October's last half hour in
-- Mexico City and already November in UTC.
select servicio.give_card_stamp(:'ws_j', :e, public._mx('2026-10-01 10:00'), :jefa, 'su_codigo', null) as sj \gset
select servicio.give_card_stamp(:'ws_j', :f, public._mx('2026-10-17 23:30'), :jefa, 'su_codigo', null) as sj2 \gset
select public.chk('5.1 before the job: both cards past their days count in October from the cards themselves — none in November — and nothing kept yet',
  (public._n(:'ws_j') -> 'mes' -> 'prev' ->> 'cards_erased')::int = 2
  and (public._n(:'ws_j') -> 'mes' ->> 'cards_erased')::int = 0
  and not exists (select 1 from servicio.card_erased e where e.workspace_id = :'ws_j'),
  (public._n(:'ws_j') -> 'mes' -> 'prev')::text);
select servicio.forget_cards() as forgotten \gset
select public.chk('5.2 the job erased both cards and kept a count for each day their days ran out (Thu 10-15, Sat 10-31 — the kitchen''s day), not the night it ran',
  not exists (select 1 from servicio.loyalty_card c where c.workspace_id = :'ws_j')
  and (select array_agg(e.day::text || ':' || e.cards order by e.day) from servicio.card_erased e where e.workspace_id = :'ws_j')
      = array['2026-10-15:1', '2026-10-31:1']
  and :'forgotten'::int >= 1,
  (select string_agg(e.day::text || ':' || e.cards, ' ') from servicio.card_erased e where e.workspace_id = :'ws_j'));
select public.chk('5.3 ... and October still says 2, November 0: the job moved the counts from the cards to the table and changed no figure',
  (public._n(:'ws_j') -> 'mes' -> 'prev' ->> 'cards_erased')::int = 2
  and (public._n(:'ws_j') -> 'mes' ->> 'cards_erased')::int = 0,
  (public._n(:'ws_j') -> 'mes' -> 'prev')::text);
select public.chk('5.4 at Doña''s, E''s card went too, kept on Wed 11-11 beside A''s on 11-03 — the week before still 1, the month still 2',
  (select array_agg(e.day::text || ':' || e.cards order by e.day) from servicio.card_erased e
    where e.workspace_id = :'ws_k' and e.day <= date '2026-11-19') = array['2026-11-03:1', '2026-11-11:1']
  and (public._n(:'ws_k') -> 'semana' -> 'prev' ->> 'cards_erased')::int = 1
  and (public._n(:'ws_k') -> 'mes' ->> 'cards_erased')::int = 2,
  (select string_agg(e.day::text || ':' || e.cards, ' ') from servicio.card_erased e where e.workspace_id = :'ws_k'));


-- ---- 6. the one door, as the owner --------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dona), true);
set local role authenticated;
select public._call_as_me('dona', format('select public.kitchen_numbers(%L)', :'ws_k')) as dona_try \gset
reset role;
select public.chk('6.1 the owner reads her numbers through the one door',
  :'dona_try' = 'ok', :'dona_try');
select public.chk('6.2 the answer''s keys: 0086''s and rewards_waiting',
  (select array_agg(k order by k) from jsonb_object_keys((select body from public._answer where who = 'dona')) k)
  = array['day', 'dia', 'mes', 'rewards_waiting', 'semana', 'since'],
  (select string_agg(k, ',' order by k) from jsonb_object_keys((select body from public._answer where who = 'dona')) k));
select public.chk('6.3 a period''s keys: 0086''s ten and prev, and the card''s nine',
  (select array_agg(k order by k) from jsonb_object_keys((select body -> 'semana' from public._answer where who = 'dona')) k)
  = array['cards_erased', 'cards_going', 'cards_one_away', 'cards_started', 'cents', 'days', 'from', 'hours',
          'neighbours', 'plates', 'prev', 'return_days', 'returning', 'rewards_claimed', 'rewards_won',
          'stamps', 'stamps_handover', 'to', 'visits', 'walk_ins'],
  (select string_agg(k, ',' order by k) from jsonb_object_keys((select body -> 'semana' from public._answer where who = 'dona')) k));
select public.chk('6.4 the period before''s keys: 0086''s seven and the card''s six',
  (select array_agg(k order by k) from jsonb_object_keys((select body -> 'semana' -> 'prev' from public._answer where who = 'dona')) k)
  = array['cards_erased', 'cards_going', 'cards_started', 'cents', 'from', 'neighbours', 'plates', 'return_days',
          'rewards_won', 'stamps', 'to', 'visits', 'walk_ins'],
  (select string_agg(k, ',' order by k) from jsonb_object_keys((select body -> 'semana' -> 'prev' from public._answer where who = 'dona')) k));
select public.chk('6.5 never a name or an id in it: no neighbour''s id, no reservation''s, no name',
  position(:a::text in (select body::text from public._answer where who = 'dona')) = 0
  and position(:rd1::text in (select body::text from public._answer where who = 'dona')) = 0
  and position('Ana A' in (select body::text from public._answer where who = 'dona')) = 0);


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
