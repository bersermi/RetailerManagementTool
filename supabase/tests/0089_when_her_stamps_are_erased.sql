-- ============================================================================
-- 0089 — when her stamps are erased: 0 (*Nunca*) or 14 to 365 days (`10.9k`;
-- the owner's rulings of 2026-11-19, late evening). Every call a person makes is
-- made AS THE PERSON, under `set role authenticated` with her claims; days gone
-- by and the nightly job are run as postgres, as the clock and pg_cron run them
-- on the live database.
--
-- Section 1 the shape. Section 2 the days she may choose, and those refused.
-- Section 3 the table's own check. Section 4 what a neighbour reads, and a card
-- keeping its days (G12), counted from her last stamp (G15).
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

\set mari '''0089aaaa-0000-4000-8000-000000000001'''
\set ana  '''0089aaaa-0000-4000-8000-000000000002'''
\set beto '''0089aaaa-0000-4000-8000-000000000003'''
\set cata '''0089aaaa-0000-4000-8000-000000000004'''
\set lm   '''0089bbbb-0000-4000-8000-000000000001'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari, 'mari.0089@example.mx', jsonb_build_object('full_name', 'Mari 0089')),
  (:ana,  'ana.0089@example.mx',  jsonb_build_object('full_name', 'Ana Ruiz')),
  (:beto, 'beto.0089@example.mx', jsonb_build_object('full_name', 'Beto Ríos')),
  (:cata, 'cata.0089@example.mx', jsonb_build_object('full_name', 'Cata Mora'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0089', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
update public.location set street = 'Sabino', street_number = '89', colonia = 'Santa María la Ribera',
                           city = 'Ciudad de México'
 where id = :'loc_m';
-- She publishes today, so her kitchen is in the door (section 4).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 20}]'::jsonb) is not null as published_m \gset
reset role;
update servicio.feature_switch set is_on = true where name = 'tarjeta';


-- ---- 1. the shape ---------------------------------------------------------------------
select public.chk('1.1 the table''s check is 14 to 365 days (NULL is Nunca), and it holds every row',
  (select pg_get_constraintdef(c.oid) from pg_constraint c
    where c.conrelid = 'servicio.card_terms'::regclass and c.conname = 'card_terms_expiry')
    = 'CHECK (((expiry_days >= 14) AND (expiry_days <= 365)))'
  and (select c.convalidated from pg_constraint c
        where c.conrelid = 'servicio.card_terms'::regclass and c.conname = 'card_terms_expiry'),
  (select pg_get_constraintdef(c.oid) from pg_constraint c
    where c.conrelid = 'servicio.card_terms'::regclass and c.conname = 'card_terms_expiry'));
select public.chk('1.2 set_card_terms is one function, its signature 0085''s, a definer with an empty path; the signed-in may call it, nobody signed out',
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'set_card_terms') = 1
  and to_regprocedure('public.set_card_terms(uuid, text, integer, integer)') is not null
  and (select p.prosecdef and p.proconfig = array['search_path=""']
         from pg_proc p where p.oid = 'public.set_card_terms(uuid, text, integer, integer)'::regprocedure)
  and has_function_privilege('authenticated', 'public.set_card_terms(uuid, text, integer, integer)', 'execute')
  and not has_function_privilege('anon', 'public.set_card_terms(uuid, text, integer, integer)', 'execute'),
  (select array_to_string(p.proconfig, ',') from pg_proc p
    where p.oid = 'public.set_card_terms(uuid, text, integer, integer)'::regprocedure));


-- ---- 2. the days she may choose -------------------------------------------------------
-- *Otro…* typed, 21; then the two ends, 14 and 365; then the chips 30, 60 and 90; then
-- *Nunca*. Each is a new version (G12). Then every number out of range, refused.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('d21', format('select public.set_card_terms(%L, %L, 8, 21)', :'ws_m', 'Una comida corrida')) as d21 \gset
select public._call_as_me('d21-again', format('select public.set_card_terms(%L, %L, 8, 21)', :'ws_m', 'Una comida corrida')) as d21_again \gset
select public._call_as_me('d14', format('select public.set_card_terms(%L, %L, 8, 14)', :'ws_m', 'Una comida corrida')) as d14 \gset
select public._call_as_me('d365', format('select public.set_card_terms(%L, %L, 8, 365)', :'ws_m', 'Una comida corrida')) as d365 \gset
select public._call_as_me('d30', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', 'Una comida corrida')) as d30 \gset
select public._call_as_me('d60', format('select public.set_card_terms(%L, %L, 8, 60)', :'ws_m', 'Una comida corrida')) as d60 \gset
select public._call_as_me('d90', format('select public.set_card_terms(%L, %L, 8, 90)', :'ws_m', 'Una comida corrida')) as d90 \gset
select public._call_as_me('d0', format('select public.set_card_terms(%L, %L, 8, 0)', :'ws_m', 'Una comida corrida')) as d0 \gset
reset role;
select count(*) as versions_before from servicio.card_terms where workspace_id = :'ws_m' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.set_card_terms(%L, %L, 8, 13)', :'ws_m', 'Una comida corrida')) as d13 \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, 366)', :'ws_m', 'Una comida corrida')) as d366 \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, 7)', :'ws_m', 'Una comida corrida')) as d7 \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, 1)', :'ws_m', 'Una comida corrida')) as d1 \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, -21)', :'ws_m', 'Una comida corrida')) as dneg \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, 999)', :'ws_m', 'Una comida corrida')) as d999 \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, null)', :'ws_m', 'Una comida corrida')) as dnull \gset
reset role;

select public.chk('2.1 Otro… typed 21: open, 8 stamps, 21 days',
  :'d21' = 'ok' and (public._a('d21') ->> 'open')::boolean
  and (public._a('d21') -> 'terms' ->> 'expiry_days')::int = 21
  and (public._a('d21') -> 'terms' ->> 'stamps')::int = 8,
  public._a('d21')::text);
select public.chk('2.2 the same 21 again changes nothing: one version',
  :'d21_again' = 'ok'
  and (public._a('d21-again') -> 'terms' -> 'since') = (public._a('d21') -> 'terms' -> 'since'));
select public.chk('2.3 both ends are taken: 14 days (2 semanas, the shortest) and 365',
  :'d14' = 'ok' and (public._a('d14') -> 'terms' ->> 'expiry_days')::int = 14
  and :'d365' = 'ok' and (public._a('d365') -> 'terms' ->> 'expiry_days')::int = 365,
  concat_ws(' ', public._a('d14') -> 'terms', public._a('d365') -> 'terms'));
select public.chk('2.4 the chips are taken as days: 1 mes 30, 2 meses 60, 3 meses 90; Nunca (0) is kept as none',
  :'d30' = 'ok' and (public._a('d30') -> 'terms' ->> 'expiry_days')::int = 30
  and :'d60' = 'ok' and (public._a('d60') -> 'terms' ->> 'expiry_days')::int = 60
  and :'d90' = 'ok' and (public._a('d90') -> 'terms' ->> 'expiry_days')::int = 90
  and :'d0' = 'ok' and public._a('d0') -> 'terms' -> 'expiry_days' = 'null'::jsonb,
  concat_ws(' ', public._a('d90') -> 'terms', public._a('d0') -> 'terms'));
select public.chk('2.5 each change a new version, the newest the current one (G12): seven, one current',
  (select count(*) from servicio.card_terms where workspace_id = :'ws_m') = 7
  and (select count(*) from servicio.card_terms where workspace_id = :'ws_m' and replaced_at is null) = 1
  and (select expiry_days from servicio.card_terms where workspace_id = :'ws_m' and replaced_at is null) is null);
select public.chk('2.6 out of range is refused (22023), each, and changes nothing: 13, 366, 7, 1, -21, 999, none chosen',
  :'d13' = '22023' and :'d366' = '22023' and :'d7' = '22023' and :'d1' = '22023'
  and :'dneg' = '22023' and :'d999' = '22023' and :'dnull' = '22023'
  and (select count(*) from servicio.card_terms where workspace_id = :'ws_m') = :'versions_before'::int
  and (select expiry_days from servicio.card_terms where workspace_id = :'ws_m' and replaced_at is null) is null,
  concat_ws(' ', :'d13', :'d366', :'d7', :'d1', :'dneg', :'d999', :'dnull', :'versions_before'));


-- ---- 3. the table's own check ---------------------------------------------------------
-- Written as the database's owner, past the function: the check refuses what the
-- function would, and still takes the days 0085 let in (a card started on them keeps them).
select public._try(format(
  'insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by, replaced_at) values (%L, %L, 8, 13, %L, now())',
  :'ws_m', 'Un taco', :mari)) as raw13 \gset
select public._try(format(
  'insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by, replaced_at) values (%L, %L, 8, 366, %L, now())',
  :'ws_m', 'Un taco', :mari)) as raw366 \gset
select public._try(format(
  'insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by, replaced_at) values (%L, %L, 8, 45, %L, now())',
  :'ws_m', 'Un taco', :mari)) as raw45 \gset
select public._try(format(
  'insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by, replaced_at) values (%L, %L, 8, 15, %L, now())',
  :'ws_m', 'Un taco', :mari)) as raw15 \gset

select public.chk('3.1 the table refuses 13 and 366 days (23514) and keeps 0085''s 15 and 45',
  :'raw13' = '23514' and :'raw366' = '23514' and :'raw45' = 'ok' and :'raw15' = 'ok',
  concat_ws(' ', :'raw13', :'raw366', :'raw45', :'raw15'));


-- ---- 4. what a neighbour reads; a card keeps its days; counted from her last stamp -----
-- On 30 days, Ana's first stamp 25 days ago. Then Mari chooses 21 (Otro…): Beto's card
-- starts on it 20 days ago and Cata's 21 days ago. The nightly job runs.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('back-to-30', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', 'Una comida corrida')) as back_to_30 \gset
reset role;
select servicio.give_card_stamp(:'ws_m', :ana, now() - interval '25 days', :mari, 'su_codigo', null) as ana_stamp \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('to-21', format('select public.set_card_terms(%L, %L, 8, 21)', :'ws_m', 'Una comida corrida')) as to_21 \gset
reset role;
select servicio.give_card_stamp(:'ws_m', :beto, now() - interval '20 days', :mari, 'su_codigo', null) as beto_stamp,
       servicio.give_card_stamp(:'ws_m', :cata, now() - interval '21 days', :mari, 'su_codigo', null) as cata_stamp \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('door', 'select public.on_offer_now()') as door \gset
select public._call_as_me('ana-cards', 'select public.my_cards()') as ana_cards \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-cards', 'select public.my_cards()') as beto_cards \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cata), true);
set local role authenticated;
select public._call_as_me('cata-cards', 'select public.my_cards()') as cata_cards \gset
reset role;
select servicio.forget_cards() as forgotten \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('mari-card', format('select public.kitchen_card(%L)', :'ws_m')) as mari_card \gset
reset role;

select public.chk('4.1 through the one door, before her first stamp: the kitchen''s card on 21 days',
  :'door' = 'ok'
  and (select k -> 'card' from jsonb_array_elements(public._a('door')) k where k ->> 'id' = :'ws_m')
      = '{"reward": "Una comida corrida", "stamps": 8, "expiry_days": 21}'::jsonb,
  (select (k -> 'card')::text from jsonb_array_elements(public._a('door')) k where k ->> 'id' = :'ws_m'));
select public.chk('4.2 Ana''s card keeps the 30 days it started on (G12): 25 days without a stamp, still hers, erased on her last stamp''s day plus 30',
  :'ana_stamp' = 'primer'
  and (public._a('ana-cards') -> 0 ->> 'expiry_days')::int = 30
  and (public._a('ana-cards') -> 0 ->> 'stamps')::int = 1
  and public._a('ana-cards') -> 0 ->> 'expires_on'
      = to_char((now() - interval '25 days' + interval '30 days') at time zone servicio.kitchen_zone(:'ws_m'), 'YYYY-MM-DD'),
  public._a('ana-cards')::text);
select public.chk('4.3 Beto''s card started on 21 days: 20 without a stamp, still his, erased on his last stamp''s day plus 21',
  :'beto_stamp' = 'primer'
  and (public._a('beto-cards') -> 0 ->> 'expiry_days')::int = 21
  and (public._a('beto-cards') -> 0 ->> 'stamps')::int = 1
  and public._a('beto-cards') -> 0 ->> 'expires_on'
      = to_char((now() - interval '20 days' + interval '21 days') at time zone servicio.kitchen_zone(:'ws_m'), 'YYYY-MM-DD'),
  public._a('beto-cards')::text);
select public.chk('4.4 Cata''s 21 days have passed: her card reads nothing, and the nightly job erases it — and only it',
  :'cata_stamp' = 'primer'
  and public._a('cata-cards') = '[]'::jsonb
  and :'forgotten'::int >= 1
  and not exists (select 1 from servicio.loyalty_card c where c.workspace_id = :'ws_m' and c.user_id = :cata)
  and (select count(*) from servicio.loyalty_card c where c.workspace_id = :'ws_m' and c.user_id in (:ana, :beto)) = 2,
  concat_ws(' ', :'forgotten', public._a('cata-cards')::text));
select public.chk('4.5 the kitchen reads its 21 days and the two cards going',
  (public._a('mari-card') -> 'terms' ->> 'expiry_days')::int = 21
  and (public._a('mari-card') ->> 'cards')::int = 2,
  public._a('mari-card')::text);


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
  if (select count(*) from public._verify) <> 14 then
    raise exception 'expected 14 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
