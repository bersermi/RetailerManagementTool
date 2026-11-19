-- ============================================================================
-- 0085 — the loyalty card (`10.9e-i`; the owner's rulings G4–G19, G34 and G41
-- of 2026-11-16 and 17). Every call is made AS THE PERSON, under `set role
-- authenticated` with her claims; the codes each phone would show are worked
-- out as postgres from the secret the phone was handed, as the phone does; days
-- gone by and the nightly job are run as postgres, as the clock and pg_cron run
-- them on the live database.
--
-- Section 1 the shape. Section 2 the terms. Section 3 the phones' keys and a
-- kitchen's card before a first stamp. Section 4 she scans the kitchen's code.
-- Section 5 the kitchen scans hers. Section 6 new terms for new cards, the
-- reward won, the days that erase. Section 7 rewards claimed both ways. Section
-- 8 a reservation handed over. Section 9 what the kitchen reads. Section 10
-- closing. Section 11 guessing. Section 12 who leaves, and the deletions.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, so `now()` is one moment throughout: every
-- code below is that minute's, or the one before's, or a day's. A refused call
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

-- A call made read-only, as PostgREST runs a GET; its block is always undone, so the
-- setting never outlives it. Answers 'ok' or the SQLSTATE.
create function public._ro(p_sql text)
returns text language plpgsql as $$
declare v_out text;
begin
  begin
    perform set_config('transaction_read_only', 'on', true);
    execute p_sql;
    v_out := 'ok';
    raise exception using errcode = 'P0099';
  exception when sqlstate 'P0099' then return v_out;
            when others then return sqlstate;
  end;
end;
$$;
grant execute on function public._ro(text) to authenticated;

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

-- A phone's code at a moment: the secret it was handed, the minute (as the phone works it out).
create function public._code(p_secret_hex text, p_at timestamptz, p_back integer default 0)
returns text language sql as $$
  select servicio.hotp(decode(p_secret_hex, 'hex'), servicio.code_minute(p_at) - p_back)
$$;

\set mari    '''0085aaaa-0000-4000-8000-000000000001'''
\set cook    '''0085aaaa-0000-4000-8000-000000000002'''
\set otra    '''0085aaaa-0000-4000-8000-000000000003'''
\set tendera '''0085aaaa-0000-4000-8000-000000000004'''
\set ana     '''0085aaaa-0000-4000-8000-000000000005'''
\set beto    '''0085aaaa-0000-4000-8000-000000000006'''
\set cata    '''0085aaaa-0000-4000-8000-000000000007'''
\set dani    '''0085aaaa-0000-4000-8000-000000000008'''
\set lm      '''0085bbbb-0000-4000-8000-000000000001'''
\set rc      '''0085cccc-0000-4000-8000-000000000001'''
\set rd      '''0085cccc-0000-4000-8000-000000000002'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,    'mari.0085@example.mx',    jsonb_build_object('full_name', 'Mari 0085')),
  (:cook,    'cook.0085@example.mx',    jsonb_build_object('full_name', 'Cook 0085')),
  (:otra,    'otra.0085@example.mx',    jsonb_build_object('full_name', 'Otra 0085')),
  (:tendera, 'tendera.0085@example.mx', jsonb_build_object('full_name', 'Tendera 0085')),
  (:ana,     'ana.0085@example.mx',     jsonb_build_object('full_name', 'Ana Rodríguez')),
  (:beto,    'beto.0085@example.mx',    jsonb_build_object('full_name', 'Beto Pérez')),
  (:cata,    'cata.0085@example.mx',    jsonb_build_object('full_name', 'Cata López')),
  (:dani,    'dani.0085@example.mx',    jsonb_build_object('full_name', 'Dani Soto'));

-- Mari's kitchen with her cook (staff); Otra's kitchen; a shop.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0085', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :cook, 'staff', 'Cook 0085');
insert into public.member_location (workspace_id, member_id, location_id)
select :'ws_m', wm.id, :'loc_m' from public.workspace_member wm where wm.workspace_id = :'ws_m' and wm.user_id = :cook;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0085', p_kind => 'cocina') as ws_o \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0085') as ws_t \gset
reset role;
update public.location set street = 'Sabino', street_number = '120', colonia = 'Santa María la Ribera',
                           city = 'Ciudad de México'
 where id = :'loc_m';
-- Mari publishes today, so her kitchen is in the door (and a reservation can be made, section 8).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 20}]'::jsonb) is not null as published_m \gset
reset role;


-- ---- 1. the shape ---------------------------------------------------------------------
select public.chk('1.1 eight tables in servicio, and no client role holds any right on any',
  (select count(*) from information_schema.tables
    where table_schema = 'servicio'
      and table_name in ('card_terms', 'loyalty_card', 'card_stamp', 'card_reward',
                         'kitchen_key', 'neighbour_key', 'code_miss', 'code_used')) = 8
  and not exists (select 1 from information_schema.role_table_grants g
                   where g.table_schema = 'servicio'
                     and g.table_name in ('card_terms', 'loyalty_card', 'card_stamp', 'card_reward',
                                          'kitchen_key', 'neighbour_key', 'code_miss', 'code_used')
                     and g.grantee in ('anon', 'authenticated', 'PUBLIC')));
select public.chk('1.2 three triggers: a handover stamps, a membership ended takes its phones'' codes, the choice off closes the card',
  exists (select 1 from pg_trigger t where t.tgrelid = 'public.reservation'::regclass
             and t.tgname = 'card_stamp_on_handover' and not t.tgisinternal and t.tgenabled = 'O'
             and pg_get_triggerdef(t.oid) ~ 'AFTER UPDATE OF handed_over_at')
  and (select count(*) from pg_trigger t where t.tgrelid = 'public.workspace_member'::regclass
          and t.tgname in ('kitchen_keys_leave_with_member', 'kitchen_keys_leave_with_member_row')
          and not t.tgisinternal and t.tgenabled = 'O') = 2
  and exists (select 1 from pg_trigger t where t.tgrelid = 'servicio.kitchen_feature'::regclass
                 and t.tgname = 'card_closes_with_feature' and not t.tgisinternal and t.tgenabled = 'O'));
select public.chk('1.3 the nightly job is scheduled at 09:21 UTC and active, and runs the function that forgets',
  exists (select 1 from cron.job j
           where j.jobname = 'forget-cards' and j.active and j.schedule = '21 9 * * *'
             and j.command = 'select servicio.forget_cards()'));
select public.chk('1.4 the eleven functions: the signed-in may call each, nobody signed out may; the internal functions nobody',
  (select bool_and(has_function_privilege('authenticated', f, 'execute')
                   and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.set_card_terms(uuid, text, integer, integer)', 'public.close_card(uuid)',
                       'public.kitchen_card(uuid)', 'public.register_kitchen_key(uuid)',
                       'public.card_of_code(uuid, text, uuid)', 'public.give_stamp(uuid, text, uuid, timestamptz)',
                       'public.give_reward(uuid, text, uuid, uuid, timestamptz)', 'public.register_my_key()',
                       'public.my_cards()',
                       'public.stamp_with_code(text, uuid, uuid)', 'public.claim_with_code(uuid, text, uuid)']) f)
  and not has_function_privilege('authenticated', 'servicio.give_card_stamp(uuid, uuid, timestamptz, uuid, text, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.hotp(bytea, bigint)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.forget_cards()', 'execute')
  and not has_function_privilege('authenticated', 'servicio.card_state(uuid, uuid)', 'execute'));
select public.chk('1.5 the codes are RFC 4226''s: its ten values for the secret 12345678901234567890',
  (select string_agg(servicio.hotp(convert_to('12345678901234567890', 'UTF8'), c), ',' order by c)
     from generate_series(0, 9) c)
  = '755224,287082,359152,969429,338314,254676,287922,162583,399871,520489');
select public.chk('1.6 a code is its minute''s, and fits that minute and the one before, never two before',
  servicio.code_minute(timestamptz '2026-11-19 00:01:59+00') = servicio.code_minute(timestamptz '2026-11-19 00:01:00+00')
  and servicio.code_minute(timestamptz '2026-11-19 00:02:00+00') = servicio.code_minute(timestamptz '2026-11-19 00:01:00+00') + 1
  and servicio.code_fits(convert_to('12345678901234567890', 'UTF8'), '755224', to_timestamp(0))
  and servicio.code_fits(convert_to('12345678901234567890', 'UTF8'), '755224', to_timestamp(60))
  and not servicio.code_fits(convert_to('12345678901234567890', 'UTF8'), '755224', to_timestamp(120))
  and servicio.code_digits(' 755 224 ') = '755224' and servicio.code_digits('75522') is null
  and servicio.code_digits('75522a') is null);
select public.chk('1.7 Wera''s switch for the card is still off: this migration turns nothing on',
  (select not s.is_on from servicio.feature_switch s where s.name = 'tarjeta'));


-- ---- 2. the terms ---------------------------------------------------------------------
-- With Wera's switch off nothing is set up; on, Mari sets hers. Refused, each changing nothing.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', 'Una comida corrida')) as off_terms \gset
reset role;
update servicio.feature_switch set is_on = true where name = 'tarjeta';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('v1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', '  Una comida corrida ')) as v1 \gset
select public._call_as_me('v1-again', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', 'Una comida corrida')) as v1_again \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', repeat('x', 61))) as long_reward \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', '   ')) as blank_reward \gset
select public._try(format('select public.set_card_terms(%L, %L, 3, 30)', :'ws_m', 'Un taco')) as three \gset
select public._try(format('select public.set_card_terms(%L, %L, 13, 30)', :'ws_m', 'Un taco')) as thirteen \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, 7)', :'ws_m', 'Un taco')) as seven_days \gset
select public._try(format('select public.set_card_terms(%L, %L, 8, null)', :'ws_m', 'Un taco')) as no_days \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', 'Un taco')) as cook_terms \gset
select public._try(format('select public.close_card(%L)', :'ws_m')) as cook_close \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', 'Un taco')) as ana_terms \gset
select public._try('select count(*) from servicio.card_terms') as read_terms \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_t', 'Un refresco')) as shop_terms \gset
reset role;

select public.chk('2.1 with Wera''s switch off the card is not offered (TD024)', :'off_terms' = 'TD024', :'off_terms');
select public.chk('2.2 Activar: open, the reward trimmed, 8 stamps, 30 days — and her choice of the card turned on',
  :'v1' = 'ok' and (public._a('v1') ->> 'open')::boolean
  and public._a('v1') -> 'terms' ->> 'reward' = 'Una comida corrida'
  and (public._a('v1') -> 'terms' ->> 'stamps')::int = 8 and (public._a('v1') -> 'terms' ->> 'expiry_days')::int = 30
  and (select f.state from servicio.kitchen_feature f where f.workspace_id = :'ws_m' and f.feature = 'tarjeta') = 'on',
  public._a('v1')::text);
select public.chk('2.3 the same terms again change nothing: one version',
  :'v1_again' = 'ok' and (select count(*) from servicio.card_terms where workspace_id = :'ws_m') = 1);
select public.chk('2.4 out of range is refused (22023), each: 61 characters, blank, 3 and 13 stamps, 7 days, no days chosen',
  :'long_reward' = '22023' and :'blank_reward' = '22023' and :'three' = '22023' and :'thirteen' = '22023'
  and :'seven_days' = '22023' and :'no_days' = '22023'
  and (select count(*) from servicio.card_terms where workspace_id = :'ws_m') = 1,
  concat_ws(' ', :'long_reward', :'blank_reward', :'three', :'thirteen', :'seven_days', :'no_days'));
select public.chk('2.5 the terms and closing are the owner''s: her cook and a neighbour are refused (42501), a shop TD013, and the table is closed',
  :'cook_terms' = '42501' and :'cook_close' = '42501' and :'ana_terms' = '42501' and :'shop_terms' = 'TD013'
  and :'read_terms' = '42501',
  concat_ws(' ', :'cook_terms', :'cook_close', :'ana_terms', :'shop_terms', :'read_terms'));


-- ---- 3. the phones' keys, and a kitchen's card before her first stamp -----------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('km', format('select public.register_kitchen_key(%L)', :'ws_m')) as km \gset
select public._call_as_me('mari-mine', 'select public.register_my_key()') as mari_mine \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('kc', format('select public.register_kitchen_key(%L)', :'ws_m')) as kc \gset
select public._try(format('select public.register_kitchen_key(%L)', :'ws_o')) as cook_other \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._call_as_me('ko', format('select public.register_kitchen_key(%L)', :'ws_o')) as ko \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-k1', 'select public.register_my_key()') as ana_k1 \gset
select public._call_as_me('ana-k2', 'select public.register_my_key()') as ana_k2 \gset
select public._call_as_me('ana-k3', 'select public.register_my_key()') as ana_k3 \gset
select public._call_as_me('ana-k4', 'select public.register_my_key()') as ana_k4 \gset
select public._call_as_me('door-open', 'select public.on_offer_now()') as door_open \gset
select public._try(format('select public.register_kitchen_key(%L)', :'ws_m')) as ana_kitchen_key \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-k', 'select public.register_my_key()') as beto_k \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cata), true);
set local role authenticated;
select public._call_as_me('cata-k', 'select public.register_my_key()') as cata_k \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._call_as_me('dani-k', 'select public.register_my_key()') as dani_k \gset
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select public._try('select public.register_my_key()') as anon_key \gset
reset role;

select public._a('km') ->> 'key' as km_key, public._a('km') ->> 'secret' as km_secret,
       public._a('kc') ->> 'key' as kc_key, public._a('kc') ->> 'secret' as kc_secret,
       public._a('ko') ->> 'key' as ko_key, public._a('ko') ->> 'secret' as ko_secret,
       public._a('ana-k4') ->> 'key' as ana_key, public._a('ana-k4') ->> 'secret' as ana_secret,
       public._a('beto-k') ->> 'key' as beto_key, public._a('beto-k') ->> 'secret' as beto_secret,
       public._a('cata-k') ->> 'key' as cata_key, public._a('cata-k') ->> 'secret' as cata_secret,
       public._a('dani-k') ->> 'key' as dani_key, public._a('dani-k') ->> 'secret' as dani_secret,
       public._a('mari-mine') ->> 'secret' as mari_mine_secret \gset

select public.chk('3.1 a phone is handed its key and a 20-byte secret once, as 40 hex characters — the one the database keeps',
  :'km' = 'ok' and :'kc' = 'ok' and :'ana_k4' = 'ok'
  and :'km_secret' ~ '^[0-9a-f]{40}$' and :'ana_secret' ~ '^[0-9a-f]{40}$'
  and (select encode(k.secret, 'hex') from servicio.kitchen_key k where k.id = :'km_key') = :'km_secret'
  and (select encode(k.secret, 'hex') from servicio.neighbour_key k where k.id = :'ana_key') = :'ana_secret'
  and (select k.user_id from servicio.kitchen_key k where k.id = :'kc_key') = :cook);
select public.chk('3.2 her fourth phone drops her oldest: three kept, the first gone',
  (select count(*) from servicio.neighbour_key where user_id = :ana) = 3
  and not exists (select 1 from servicio.neighbour_key where id = (public._a('ana-k1') ->> 'key')::uuid)
  and exists (select 1 from servicio.neighbour_key where id = (public._a('ana-k2') ->> 'key')::uuid));
select public.chk('3.3 a key at a kitchen is a member''s: another kitchen''s cook and a neighbour are refused (42501); nobody signed out has a key',
  :'cook_other' = '42501' and :'ana_kitchen_key' = '42501' and :'anon_key' = '42501',
  concat_ws(' ', :'cook_other', :'ana_kitchen_key', :'anon_key'));
select public.chk('3.4 before her first stamp, through the one door: the kitchen''s card terms, beside its name and address (G12, G41, ADR-035 §2.7)',
  :'door_open' = 'ok'
  and (select k -> 'card' from jsonb_array_elements(public._a('door-open')) k where k ->> 'id' = :'ws_m')
      = '{"reward": "Una comida corrida", "stamps": 8, "expiry_days": 30}'::jsonb
  and (select k ->> 'name' from jsonb_array_elements(public._a('door-open')) k where k ->> 'id' = :'ws_m') = 'Fonda Doña Mari 0085'
  and (select k -> 'address' ->> 'street' from jsonb_array_elements(public._a('door-open')) k where k ->> 'id' = :'ws_m') = 'Sabino'
  and to_regprocedure('public.card_terms_of(uuid)') is null,
  public._a('door-open')::text);


-- ---- 4. she scans the kitchen's code -----------------------------------------------------
select public._code(:'km_secret', now()) as km_now, public._code(:'km_secret', now(), 1) as km_prev,
       public._code(:'km_secret', now(), 2) as km_old, public._code(:'kc_secret', now()) as kc_now,
       public._code(:'ko_secret', now()) as ko_now \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-scan', format('select public.stamp_with_code(%L, %L, %L)', :'km_now', :'ws_m', :'km_key')) as ana_scan \gset
select public._call_as_me('ana-scan-again', format('select public.stamp_with_code(%L)', :'km_now')) as ana_scan_again \gset
select public._call_as_me('ana-other-key', format('select public.stamp_with_code(%L, %L, %L)', :'km_now', :'ws_m', :'kc_key')) as ana_other_key \gset
select public._try(format('select public.stamp_with_code(%L)', '12345')) as five_digits \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
-- Typed, as the screen shows it, and a minute late: the minute before still fits.
select public._call_as_me('beto-typed', format('select public.stamp_with_code(%L)',
  substr(:'km_prev', 1, 3) || ' ' || substr(:'km_prev', 4))) as beto_typed \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._call_as_me('dani-old', format('select public.stamp_with_code(%L, %L)', :'km_old', :'ws_m')) as dani_old \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('cook-self', format('select public.stamp_with_code(%L, %L)', :'kc_now', :'ws_m')) as cook_self \gset
reset role;

select public.chk('4.1 her first stamp there: primer, 1 of 8, the kitchen named — given by Mari, whose phone it was, by her scanning',
  :'ana_scan' = 'ok' and public._a('ana-scan') ->> 'result' = 'primer'
  and (public._a('ana-scan') ->> 'stamps')::int = 1 and (public._a('ana-scan') ->> 'of')::int = 8
  and public._a('ana-scan') -> 'kitchen' ->> 'name' = 'Fonda Doña Mari 0085'
  and (public._a('ana-scan') ->> 'stamped_today')::boolean
  and exists (select 1 from servicio.card_stamp s where s.workspace_id = :'ws_m' and s.user_id = :ana
                 and s.given_by = :mari and s.via = 'codigo_cocina' and s.count_after = 1 and s.of_stamps = 8),
  public._a('ana-scan')::text);
select public.chk('4.2 one a day (G14): the same code again, typed with no kitchen, is ya_hoy and writes nothing',
  public._a('ana-scan-again') ->> 'result' = 'ya_hoy' and (public._a('ana-scan-again') ->> 'stamps')::int = 1
  and (select count(*) from servicio.card_stamp where user_id = :ana) = 1,
  public._a('ana-scan-again')::text);
select public.chk('4.3 the minute before still fits, typed with a space and no kitchen: Beto''s first stamp',
  public._a('beto-typed') ->> 'result' = 'primer' and public._a('beto-typed') -> 'kitchen' ->> 'id' = :'ws_m',
  public._a('beto-typed')::text);
select public.chk('4.4 two minutes old fits nothing: no_valido, nothing written, the miss counted; a QR''s key narrows to its own phone',
  public._a('dani-old') ->> 'result' = 'no_valido'
  and not exists (select 1 from servicio.card_stamp where user_id = :dani)
  and (select count(*) from servicio.code_miss where user_id = :dani) = 1
  and public._a('ana-other-key') ->> 'result' = 'no_valido'
  and :'km_old' not in (:'km_now', :'km_prev'),
  concat_ws(' ', public._a('dani-old')::text, public._a('ana-other-key')::text));
select public.chk('4.5 a kitchen''s own people are not its customers: her cook scanning its code is propia, and nothing is written',
  public._a('cook-self') ->> 'result' = 'propia'
  and not exists (select 1 from servicio.card_stamp where user_id = :cook),
  public._a('cook-self')::text);
select public.chk('4.6 a code is six digits (22023)', :'five_digits' = '22023', :'five_digits');


-- ---- 5. the kitchen scans hers ----------------------------------------------------------
select public._code(:'ana_secret', now()) as ana_now, public._code(:'cata_secret', now()) as cata_now,
       public._code(:'dani_secret', now()) as dani_now, public._code(:'mari_mine_secret', now()) as mari_mine_now,
       public._code(:'beto_secret', now()) as beto_now \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('cook-sees-ana', format('select public.card_of_code(%L, %L)', :'ws_m', :'ana_now')) as cook_sees_ana \gset
select public._call_as_me('cook-stamps-ana', format('select public.give_stamp(%L, %L, %L)', :'ws_m', :'ana_now', :'ana_key')) as cook_stamps_ana \gset
select public._call_as_me('cook-stamps-cata', format('select public.give_stamp(%L, %L)', :'ws_m', :'cata_now')) as cook_stamps_cata \gset
select public._call_as_me('cook-sees-mari', format('select public.card_of_code(%L, %L)', :'ws_m', :'mari_mine_now')) as cook_sees_mari \gset
select public._try(format('select public.give_stamp(%L, %L, null, %L)', :'ws_m', :'dani_now', now() - interval '8 days')) as too_old \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.card_of_code(%L, %L)', :'ws_m', :'ana_now')) as otra_sees \gset
select public._try(format('select public.give_stamp(%L, %L)', :'ws_m', :'ana_now')) as otra_stamps \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.card_of_code(%L, %L)', :'ws_m', :'beto_now')) as ana_sees_beto \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.card_of_code(%L, %L)', :'ws_t', :'ana_now')) as shop_sees \gset
reset role;

select public.chk('5.1 the kitchen scans her code: Ana R., 1 of 8, no rewards, her stamp today — and never her id',
  :'cook_sees_ana' = 'ok' and public._a('cook-sees-ana') ->> 'result' = 'suya'
  and public._a('cook-sees-ana') ->> 'name' = 'Ana R.'
  and (public._a('cook-sees-ana') ->> 'stamps')::int = 1 and (public._a('cook-sees-ana') ->> 'of')::int = 8
  and public._a('cook-sees-ana') -> 'rewards' = '[]'::jsonb
  and (public._a('cook-sees-ana') ->> 'stamped_today')::boolean
  and position(:ana in public._a('cook-sees-ana')::text) = 0,
  public._a('cook-sees-ana')::text);
select public.chk('5.2 Dar sello after her stamp today is ya_hoy; for Cata, a walk-in, it is her first — given by the cook (G6, G19)',
  public._a('cook-stamps-ana') ->> 'result' = 'ya_hoy'
  and public._a('cook-stamps-cata') ->> 'result' = 'primer' and public._a('cook-stamps-cata') ->> 'name' = 'Cata L.'
  and exists (select 1 from servicio.card_stamp s where s.user_id = :cata and s.given_by = :cook and s.via = 'su_codigo'),
  concat_ws(' ', public._a('cook-stamps-ana')::text, public._a('cook-stamps-cata')::text));
select public.chk('5.3 the kitchen''s owner showing her own code is propia: never her name or card',
  public._a('cook-sees-mari') = '{"result": "propia"}'::jsonb, public._a('cook-sees-mari')::text);
select public.chk('5.4 only that kitchen''s members scan for it (42501): another kitchen''s owner, a neighbour; a shop TD013; a scan 8 days old 22023',
  :'otra_sees' = '42501' and :'otra_stamps' = '42501' and :'ana_sees_beto' = '42501' and :'shop_sees' = 'TD013'
  and :'too_old' = '22023',
  concat_ws(' ', :'otra_sees', :'otra_stamps', :'ana_sees_beto', :'shop_sees', :'too_old'));


-- ---- 6. new terms for new cards, the reward won, the days that erase ----------------------
-- Mari changes her terms: Ana's card keeps the ones it started on (G12); Dani's first is on
-- the new ones. Then Dani's past three days arrive from the cook's queue, each checked at its
-- moment, and the fourth stamp wins.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('v2', format('select public.set_card_terms(%L, %L, 4, 0)', :'ws_m', 'Un agua fresca')) as v2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-cards-v2', 'select public.my_cards()') as ana_cards_v2 \gset
reset role;
select public._code(:'dani_secret', now() - interval '1 day') as dani_d1,
       public._code(:'dani_secret', now() - interval '2 days') as dani_d2,
       public._code(:'dani_secret', now() - interval '3 days') as dani_d3 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('dani-0', format('select public.give_stamp(%L, %L)', :'ws_m', :'dani_now')) as dani_0 \gset
select public._call_as_me('dani-1', format('select public.give_stamp(%L, %L, null, %L)', :'ws_m',
  :'dani_d1', now() - interval '1 day')) as dani_1 \gset
select public._call_as_me('dani-2', format('select public.give_stamp(%L, %L, null, %L)', :'ws_m',
  :'dani_d2', now() - interval '2 days')) as dani_2 \gset
select public._call_as_me('dani-wrong-moment', format('select public.give_stamp(%L, %L, null, %L)', :'ws_m',
  :'dani_now', now() - interval '3 days')) as dani_wrong \gset
select public._call_as_me('dani-3', format('select public.give_stamp(%L, %L, %L, %L)', :'ws_m',
  :'dani_d3', :'dani_key', now() - interval '3 days')) as dani_3 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._call_as_me('dani-cards', 'select public.my_cards()') as dani_cards \gset
reset role;

select public.chk('6.1 new terms are a new version; Ana''s card keeps the 8 and the meal it started with (G12)',
  :'v2' = 'ok' and (select count(*) from servicio.card_terms where workspace_id = :'ws_m') = 2
  and public._a('v2') -> 'terms' = jsonb_build_object('reward', 'Un agua fresca', 'stamps', 4, 'expiry_days', null,
                                                       'since', public._a('v2') -> 'terms' -> 'since')
  and (public._a('ana-cards-v2') -> 0 ->> 'of')::int = 8
  and public._a('ana-cards-v2') -> 0 ->> 'reward' = 'Una comida corrida'
  and (public._a('ana-cards-v2') -> 0 ->> 'expiry_days')::int = 30,
  public._a('ana-cards-v2')::text);
select public.chk('6.2 a new card takes the new terms: Dani''s first is 1 of 4, Nunca',
  public._a('dani-0') ->> 'result' = 'primer' and (public._a('dani-0') ->> 'of')::int = 4
  and public._a('dani-0') -> 'expiry_days' = 'null'::jsonb and public._a('dani-0') -> 'expires_on' = 'null'::jsonb,
  public._a('dani-0')::text);
select public.chk('6.3 from the queue, each stamp checked at its own moment: yesterday''s and the day before''s are stamps; today''s code sent as of three days ago fits nothing',
  public._a('dani-1') ->> 'result' = 'sello' and public._a('dani-2') ->> 'result' = 'sello'
  and public._a('dani-wrong-moment') ->> 'result' = 'no_valido',
  concat_ws(' ', public._a('dani-1')::text, public._a('dani-wrong-moment')::text));
select public.chk('6.4 the fourth stamp wins: gano, the card back to zero, the reward hers to claim, its text the terms''',
  public._a('dani-3') ->> 'result' = 'gano' and (public._a('dani-3') ->> 'stamps')::int = 0
  and jsonb_array_length(public._a('dani-3') -> 'rewards') = 1
  and public._a('dani-3') -> 'rewards' -> 0 ->> 'reward' = 'Un agua fresca'
  and not exists (select 1 from servicio.loyalty_card where user_id = :dani)
  and (select count(*) from servicio.card_stamp where user_id = :dani) = 4
  and exists (select 1 from servicio.card_stamp s where s.user_id = :dani and s.count_after = 4 and s.of_stamps = 4),
  public._a('dani-3')::text);
select public.chk('6.5 her cards: Dani''s kitchen, 0 stamps and 1 reward, with its name',
  jsonb_array_length(public._a('dani-cards')) = 1
  and public._a('dani-cards') -> 0 ->> 'id' = :'ws_m' and public._a('dani-cards') -> 0 ->> 'name' = 'Fonda Doña Mari 0085'
  and (public._a('dani-cards') -> 0 ->> 'stamps')::int = 0
  and jsonb_array_length(public._a('dani-cards') -> 0 -> 'rewards') = 1,
  public._a('dani-cards')::text);

-- Ana's 30 days pass with no stamp (G15): her card reads 0, then a stamp starts a new one on
-- the current terms — and it is not her first there.
update servicio.loyalty_card set last_stamp_at = now() - interval '30 days', started_at = now() - interval '30 days'
 where user_id = :ana and workspace_id = :'ws_m';
update servicio.card_stamp set given_at = given_at - interval '30 days', day = day - 30
 where user_id = :ana and workspace_id = :'ws_m';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-cards-expired', 'select public.my_cards()') as ana_expired \gset
select public._call_as_me('ana-after-expiry', format('select public.stamp_with_code(%L, %L)', :'km_now', :'ws_m')) as ana_after \gset
reset role;
select public.chk('6.6 her days passed: the card reads nothing and leaves her list; the next stamp starts a new card on the current terms, not her first',
  public._a('ana-cards-expired') = '[]'::jsonb
  and public._a('ana-after-expiry') ->> 'result' = 'sello'
  and (public._a('ana-after-expiry') ->> 'stamps')::int = 1 and (public._a('ana-after-expiry') ->> 'of')::int = 4
  and (select t.reward from servicio.loyalty_card c join servicio.card_terms t on t.id = c.terms_id
        where c.user_id = :ana and c.workspace_id = :'ws_m') = 'Un agua fresca',
  concat_ws(' ', public._a('ana-cards-expired')::text, public._a('ana-after-expiry')::text));


-- ---- 7. rewards claimed, both ways --------------------------------------------------------
-- A second reward for Dani, won a day earlier, written as the database's owner: the stack
-- (round 3) — she chooses which.
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
select :'ws_m', :dani, t.id, t.reward, now() - interval '10 days'
  from servicio.card_terms t where t.workspace_id = :'ws_m' and t.replaced_at is null
returning id as older_reward \gset
-- A break that left no reward must still reach its check, not stop psql on an unset variable.
select coalesce(public._a('dani-3') -> 'rewards' -> 0 ->> 'id', '00000000-0000-4000-8000-000000000000') as newer_reward \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('mari-sees-dani', format('select public.card_of_code(%L, %L)', :'ws_m', :'dani_now')) as mari_sees_dani \gset
select public._call_as_me('mari-gives', format('select public.give_reward(%L, %L, %L)', :'ws_m', :'dani_now', :'older_reward')) as mari_gives \gset
select public._call_as_me('mari-gives-again', format('select public.give_reward(%L, %L, %L)', :'ws_m', :'dani_now', :'older_reward')) as mari_gives_again \gset
select public._call_as_me('mari-gives-both', format('select public.give_reward(%L, %L, %L)', :'ws_m', :'dani_now', :'newer_reward')) as mari_gives_both \gset
select public._try(format('select public.give_reward(%L, %L, %L)', :'ws_m', :'ana_now', :'newer_reward')) as wrong_person \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._call_as_me('dani-other-kitchen', format('select public.claim_with_code(%L, %L)', :'newer_reward', :'ko_now')) as dani_other \gset
select public._call_as_me('dani-claims', format('select public.claim_with_code(%L, %L, %L)', :'newer_reward', :'kc_now', :'kc_key')) as dani_claims \gset
select public._call_as_me('dani-claims-again', format('select public.claim_with_code(%L, %L)', :'newer_reward', :'kc_now')) as dani_claims_again \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.claim_with_code(%L, %L)', :'newer_reward', :'kc_now')) as ana_claims_dani \gset
reset role;

select public.chk('7.1 the kitchen sees her stack, newest first: Dani S.''s 2 rewards',
  public._a('mari-sees-dani') ->> 'name' = 'Dani S.'
  and jsonb_array_length(public._a('mari-sees-dani') -> 'rewards') = 2
  and public._a('mari-sees-dani') -> 'rewards' -> 0 ->> 'id' = :'newer_reward'
  and public._a('mari-sees-dani') -> 'rewards' -> 1 ->> 'id' = :'older_reward',
  public._a('mari-sees-dani')::text);
select public.chk('7.2 Entregar premio: the one picked, claimed by Mari from her code (su_codigo) — then once more is ya_cobrado',
  public._a('mari-gives') ->> 'result' = 'cobrado' and public._a('mari-gives') ->> 'claimed' = 'Un agua fresca'
  and jsonb_array_length(public._a('mari-gives') -> 'rewards') = 1
  and exists (select 1 from servicio.card_reward r where r.id = :'older_reward'
                 and r.claimed_by = :mari and r.claimed_via = 'su_codigo' and r.claimed_at = now())
  and public._a('mari-gives-again') ->> 'result' = 'ya_cobrado',
  concat_ws(' ', public._a('mari-gives')::text, public._a('mari-gives-again') ->> 'result'));
select public.chk('7.3 she claims the other by scanning the cook''s code: given by the cook (codigo_cocina); again is ya_cobrado; another kitchen''s code fits nothing',
  public._a('dani-other-kitchen') ->> 'result' = 'no_valido'
  and public._a('dani-claims') ->> 'result' = 'cobrado' and public._a('dani-claims') -> 'kitchen' ->> 'id' = :'ws_m'
  and public._a('dani-claims') -> 'rewards' = '[]'::jsonb
  and exists (select 1 from servicio.card_reward r where r.id = :'newer_reward'
                 and r.claimed_by = :cook and r.claimed_via = 'codigo_cocina')
  and public._a('dani-claims-again') ->> 'result' = 'ya_cobrado',
  concat_ws(' ', public._a('dani-other-kitchen')::text, public._a('dani-claims')::text));
select public.chk('7.4 a reward is hers alone (TD027): the kitchen naming it with another''s code, another neighbour claiming it',
  :'wrong_person' = 'TD027' and :'ana_claims_dani' = 'TD027', concat_ws(' ', :'wrong_person', :'ana_claims_dani'));
select public.chk('7.5 one reward a scan: the same minute of her code gives no second reward (ya_usado) — her stack is never emptied by one scan',
  public._a('mari-gives-both') ->> 'result' = 'ya_usado'
  and jsonb_array_length(public._a('mari-gives-both') -> 'rewards') = 1
  and public._a('mari-gives-both') -> 'rewards' -> 0 ->> 'id' = :'newer_reward'
  and (select count(*) from servicio.code_used u
         join servicio.neighbour_key k on k.id = u.key_id where k.user_id = :dani) = 1,
  public._a('mari-gives-both')::text);


-- ---- 8. a reservation handed over stamps itself (G9, G14) ---------------------------------
-- Beto reserves; he swipes Ya lo tengo; then the cook types his code. Beto has today's stamp
-- already (4.3), so first his day is moved back, as a day gone by.
update servicio.card_stamp set given_at = given_at - interval '1 day', day = day - 1 where user_id = :beto;
update servicio.loyalty_card set last_stamp_at = last_stamp_at - interval '1 day' where user_id = :beto;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public.give_my_yes() is not null as beto_yes \gset
select public._call_as_me('rc', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rc, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as beto_reserves \gset
select public.confirm_my_pickup(:rc) is not null as beto_swipes \gset
reset role;
select count(*) as beto_after_swipe from servicio.card_stamp where user_id = :beto \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public.hand_over_reservation(:rc) as handed \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-scan-after', format('select public.stamp_with_code(%L)', :'km_now')) as beto_after \gset
reset role;
-- With Wera's switch off, Cata's reservation handed over is recorded and stamps nothing.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cata), true);
set local role authenticated;
select public.give_my_yes() is not null as cata_yes \gset
select public._call_as_me('rd', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rd, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as cata_reserves \gset
reset role;
update servicio.card_stamp set given_at = given_at - interval '1 day', day = day - 1 where user_id = :cata;
update servicio.feature_switch set is_on = false where name = 'tarjeta';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.hand_over_reservation(:rd) as handed_off \gset
reset role;
update servicio.feature_switch set is_on = true where name = 'tarjeta';

select public.chk('8.1 her Ya lo tengo alone stamps nothing (G14); the kitchen''s Entregar stamps it, by who typed the code, with the reservation',
  :'beto_reserves' = 'ok' and :'beto_after_swipe'::int = 1 and :'handed' = 'recogido'
  and exists (select 1 from servicio.card_stamp s
               where s.user_id = :beto and s.via = 'entrega' and s.given_by = :cook and s.reservation_id = :rc
                 and s.given_at = (select r.handed_over_at from public.reservation r where r.id = :rc)
                 and s.count_after = 2),
  concat_ws(' ', :'beto_reserves', :'beto_after_swipe', :'handed'));
select public.chk('8.2 reservations and walk-ins together, one a day: his scan after the handover is ya_hoy',
  public._a('beto-scan-after') ->> 'result' = 'ya_hoy' and (public._a('beto-scan-after') ->> 'stamps')::int = 2,
  public._a('beto-scan-after')::text);
select public.chk('8.3 with Wera''s switch off the handover is recorded all the same, and stamps nothing',
  :'cata_reserves' = 'ok' and :'handed_off' = 'recogido'
  and (select r.handed_over_at from public.reservation r where r.id = :rd) is not null
  and not exists (select 1 from servicio.card_stamp s where s.reservation_id = :rd),
  concat_ws(' ', :'cata_reserves', :'handed_off'));


-- ---- 9. what the kitchen reads ------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('cook-card', format('select public.kitchen_card(%L)', :'ws_m')) as cook_card \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.kitchen_card(%L)', :'ws_m')) as ana_card \gset
reset role;

select public.chk('9.1 any member reads its counts: 3 cards going (Ana, Beto, Cata), 3 stamps today (Ana, Beto, Dani), no reward to give',
  :'cook_card' = 'ok' and (public._a('cook-card') ->> 'cards')::int = 3
  and (public._a('cook-card') ->> 'stamps_today')::int = 3
  and (public._a('cook-card') ->> 'rewards_to_give')::int = 0 and (public._a('cook-card') ->> 'open')::boolean,
  public._a('cook-card')::text);
select public.chk('9.2 today''s lines, newest first, by first name and initial: stamps and the two rewards claimed — never an id, never who gave',
  (select array_agg(l ->> 'name' order by l ->> 'name') from jsonb_array_elements(public._a('cook-card') -> 'today') l
    where l ->> 'kind' = 'sello') = array['Ana R.', 'Beto P.', 'Dani S.']
  and (select count(*) from jsonb_array_elements(public._a('cook-card') -> 'today') l
        where l ->> 'kind' = 'cobro' and l ->> 'name' = 'Dani S.' and l ->> 'reward' = 'Un agua fresca') = 2
  and position(:ana in public._a('cook-card')::text) = 0 and position(:cook in public._a('cook-card')::text) = 0
  and position(:mari in public._a('cook-card')::text) = 0,
  public._a('cook-card') ->> 'today');
select public.chk('9.3 a neighbour reads no kitchen''s card (42501)', :'ana_card' = '42501', :'ana_card');


-- ---- 10. closing ------------------------------------------------------------------------------
-- Mari closes: a neighbour with no card is cerrada; Ana, whose card is going, is still stamped
-- for 30 days (G12); past them, nothing — and the nightly job takes what is left. Otra turns the
-- card off in Lo que usas: closed the same way.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('close', format('select public.close_card(%L)', :'ws_m')) as closed \gset
select public._call_as_me('close-again', format('select public.close_card(%L)', :'ws_m')) as closed_again \gset
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('0085aaaa-0000-4000-8000-000000000009', 'eva.0085@example.mx', jsonb_build_object('full_name', 'Eva Ruiz'));
select set_config('request.jwt.claims', '{"sub":"0085aaaa-0000-4000-8000-000000000009","role":"authenticated"}', true);
set local role authenticated;
select public._call_as_me('eva-closed', format('select public.stamp_with_code(%L, %L)', :'km_now', :'ws_m')) as eva_closed \gset
select public._call_as_me('door-closed', 'select public.on_offer_now()') as door_closed \gset
reset role;
update servicio.card_stamp set given_at = given_at - interval '1 day', day = day - 1 where user_id = :ana;
update servicio.loyalty_card set last_stamp_at = last_stamp_at - interval '1 day' where user_id = :ana;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-while-closing', format('select public.stamp_with_code(%L, %L)', :'km_now', :'ws_m')) as ana_closing \gset
reset role;
-- Thirty days after closing.
update servicio.card_terms set closed_at = now() - interval '30 days' where workspace_id = :'ws_m' and replaced_at is null;
update servicio.card_stamp set given_at = given_at - interval '1 day', day = day - 1 where user_id = :ana;
update servicio.loyalty_card set last_stamp_at = last_stamp_at - interval '1 day' where user_id = :ana;
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
select :'ws_m', :beto, t.id, t.reward, now() - interval '40 days'
  from servicio.card_terms t where t.workspace_id = :'ws_m' and t.replaced_at is null;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-after-30', format('select public.stamp_with_code(%L, %L)', :'km_now', :'ws_m')) as ana_after_30 \gset
select public._call_as_me('ana-cards-after-30', 'select public.my_cards()') as ana_cards_30 \gset
reset role;
select servicio.forget_cards() as forgotten \gset
-- Otra turns the card off from Lo que usas.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._call_as_me('otra-on', format('select public.set_card_terms(%L, %L, 6, 15)', :'ws_o', 'Un café')) as otra_on \gset
select public._call_as_me('otra-off', format('select public.set_kitchen_features(%L, %L)', :'ws_o', '{"tarjeta": "off"}')) as otra_off \gset
select public._call_as_me('otra-card', format('select public.kitchen_card(%L)', :'ws_o')) as otra_card \gset
select public._call_as_me('otra-again', format('select public.set_card_terms(%L, %L, 6, 15)', :'ws_o', 'Un café')) as otra_again \gset
reset role;

select public.chk('10.1 Cerrar la tarjeta: closed, kept 30 days more, her choice of the card off; again changes nothing',
  :'closed' = 'ok' and not (public._a('close') ->> 'open')::boolean
  and (public._a('close') ->> 'kept_until')::timestamptz = now() + interval '30 days'
  and (select f.state from servicio.kitchen_feature f where f.workspace_id = :'ws_m' and f.feature = 'tarjeta') = 'off'
  and public._a('close-again') ->> 'closed_at' = public._a('close') ->> 'closed_at',
  public._a('close')::text);
select public.chk('10.2 closed: nobody starts a new card (cerrada, nothing written), and the door''s invitation is gone',
  public._a('eva-closed') ->> 'result' = 'cerrada'
  and not exists (select 1 from servicio.card_stamp where user_id = '0085aaaa-0000-4000-8000-000000000009')
  and (select k -> 'card' from jsonb_array_elements(public._a('door-closed')) k where k ->> 'id' = :'ws_m') = 'null'::jsonb,
  concat_ws(' ', public._a('eva-closed')::text, :'door_closed'));
select public.chk('10.3 a card going is stamped for the 30 days (G12)',
  public._a('ana-while-closing') ->> 'result' = 'sello' and (public._a('ana-while-closing') ->> 'stamps')::int = 2
  and public._a('ana-while-closing') ->> 'kept_until' is not null,
  public._a('ana-while-closing')::text);
select public.chk('10.4 thirty days after closing: no stamp, her list empty — and the nightly job deletes the cards and the rewards nobody claimed, keeping the claimed',
  public._a('ana-after-30') ->> 'result' = 'cerrada' and public._a('ana-cards-after-30') = '[]'::jsonb
  and :'forgotten'::int >= 3
  and not exists (select 1 from servicio.loyalty_card where workspace_id = :'ws_m')
  and not exists (select 1 from servicio.card_reward where workspace_id = :'ws_m' and claimed_at is null)
  and (select count(*) from servicio.card_reward where workspace_id = :'ws_m' and claimed_at is not null) = 2,
  concat_ws(' ', public._a('ana-after-30')::text, :'forgotten'));
select public.chk('10.5 turning the card off in Lo que usas closes it too; saving its terms again opens it, a new version',
  :'otra_off' = 'ok' and not (public._a('otra-card') ->> 'open')::boolean
  and public._a('otra-card') ->> 'closed_at' is not null
  and (public._a('otra-again') ->> 'open')::boolean
  and (select count(*) from servicio.card_terms where workspace_id = :'ws_o') = 2,
  concat_ws(' ', public._a('otra-card')::text, public._a('otra-again') ->> 'open'));

-- Mari opens her card again, its 30 days long past — and before the nightly job could run, a card
-- and a reward nobody claimed were still there: what the closing ended stays ended.
insert into servicio.loyalty_card (user_id, workspace_id, terms_id, stamps, started_at, last_stamp_at)
select '0085aaaa-0000-4000-8000-000000000009', :'ws_m', t.id, 2, now() - interval '40 days', now() - interval '40 days'
  from servicio.card_terms t where t.workspace_id = :'ws_m' and t.replaced_at is null;
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
select :'ws_m', '0085aaaa-0000-4000-8000-000000000009', t.id, t.reward, now() - interval '40 days'
  from servicio.card_terms t where t.workspace_id = :'ws_m' and t.replaced_at is null;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('reopen', format('select public.set_card_terms(%L, %L, 4, 0)', :'ws_m', 'Un agua fresca')) as reopened \gset
reset role;
select public.chk('10.6 opened again past its 30 days: open, a new version — and the old card and the unclaimed reward gone, the job or not',
  :'reopened' = 'ok' and (public._a('reopen') ->> 'open')::boolean
  and not exists (select 1 from servicio.loyalty_card where workspace_id = :'ws_m')
  and not exists (select 1 from servicio.card_reward where workspace_id = :'ws_m' and claimed_at is null)
  and (select count(*) from servicio.card_reward where workspace_id = :'ws_m' and claimed_at is not null) = 2,
  public._a('reopen')::text);


-- ---- 11. guessing ---------------------------------------------------------------------------
-- Twenty codes that fit nothing in ten minutes, and the next try is refused — even a right one.
select lpad(n::text, 6, '0') as wrong_code
  from generate_series(0, 999999) n
 where lpad(n::text, 6, '0') not in (
         select servicio.hotp(k.secret, servicio.code_minute(now()) - b)
           from servicio.kitchen_key k, generate_series(0, 1) b
         union
         select servicio.hotp(k.secret, servicio.code_minute(now()) - b)
           from servicio.neighbour_key k, generate_series(0, 1) b)
 limit 1 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cata), true);
set local role authenticated;
select count(*) filter (where public.stamp_with_code(:'wrong_code') ->> 'result' = 'no_valido') as cata_misses
  from generate_series(1, 20) \gset
select public._try(format('select public.stamp_with_code(%L, %L)', :'ko_now', :'ws_o')) as cata_21st \gset
reset role;
select public.chk('11.1 twenty misses in ten minutes, each no_valido and counted; the 21st try is refused (TD028), right or not',
  :'cata_misses'::int = 20 and (select count(*) from servicio.code_miss where user_id = :cata) = 20
  and :'cata_21st' = 'TD028',
  concat_ws(' ', :'cata_misses', :'cata_21st'));
update servicio.code_miss set at = now() - interval '1 day' where user_id = :cata;
select servicio.forget_cards() as forgotten_misses \gset
select public.chk('11.2 a day on, the nightly job forgets the misses',
  not exists (select 1 from servicio.code_miss where user_id = :cata));
-- Read-only, as PostgREST runs a GET: refused before any code is looked at — a wrong one keeps no
-- miss there, and a right one would name her.
select count(*) as mari_misses_before from servicio.code_miss where user_id = :mari \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._ro(format('select public.card_of_code(%L, %L)', :'ws_m', :'wrong_code')) as ro_wrong \gset
select public._ro(format('select public.card_of_code(%L, %L)', :'ws_m', :'ana_now')) as ro_right \gset
select public._ro(format('select public.give_stamp(%L, %L)', :'ws_m', :'ana_now')) as ro_stamp \gset
select public._ro(format('select public.give_reward(%L, %L, %L)', :'ws_m', :'ana_now', :'newer_reward')) as ro_reward \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._ro(format('select public.stamp_with_code(%L, %L)', :'km_now', :'ws_m')) as ro_scan \gset
select public._ro(format('select public.claim_with_code(%L, %L)', :'newer_reward', :'km_now')) as ro_claim \gset
reset role;
select public.chk('11.3 a code is never checked in a read-only call (25006), wrong or right, either side — so no miss is lost there',
  :'ro_wrong' = '25006' and :'ro_right' = '25006' and :'ro_stamp' = '25006' and :'ro_reward' = '25006'
  and :'ro_scan' = '25006' and :'ro_claim' = '25006'
  and (select count(*) from servicio.code_miss where user_id = :mari) = :'mari_misses_before'::int,
  concat_ws(' ', :'ro_wrong', :'ro_right', :'ro_stamp', :'ro_reward', :'ro_scan', :'ro_claim'));
select public.chk('11.4 one person''s tries take turns: the count waits on a lock held to the end of her call',
  pg_get_functiondef('servicio.code_tries_left(uuid)'::regprocedure)
    ~ 'pg_advisory_xact_lock\(hashtextextended\(''code_miss:'' \|\| p_user::text, 0\)\);\s+if \(select count\(\*\) from servicio.code_miss');


-- ---- 12. who leaves, and the deletions --------------------------------------------------------
-- The cook leaves Mari's kitchen: his phone's code fits nothing there. Beto deletes his account:
-- his card and keys go, his stamps and claimed rewards stay, nobody's — read before Otra deletes her
-- kitchen, whose whole card goes with it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_m')) as cook_left \gset
reset role;
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at, claimed_at, claimed_by, claimed_via)
select :'ws_m', :beto, t.id, t.reward, now() - interval '2 days', now() - interval '1 day', :mari, 'su_codigo'
  from servicio.card_terms t where t.workspace_id = :'ws_m' and t.replaced_at is null;
insert into servicio.loyalty_card (user_id, workspace_id, terms_id, stamps, started_at, last_stamp_at)
select :beto, :'ws_o', t.id, 2, now(), now()
  from servicio.card_terms t where t.workspace_id = :'ws_o' and t.replaced_at is null;
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
select :'ws_o', :beto, t.id, t.reward, now()
  from servicio.card_terms t where t.workspace_id = :'ws_o' and t.replaced_at is null;
select count(*) as beto_stamps_before from servicio.card_stamp where user_id = :beto \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._try('select public.delete_my_account()') as del_beto \gset
reset role;
select public.chk('12.1 a member who leaves takes her phones'' codes there: the cook''s key gone',
  :'cook_left' = 'ok' and not exists (select 1 from servicio.kitchen_key where user_id = :cook and workspace_id = :'ws_m')
  and exists (select 1 from servicio.kitchen_key where user_id = :mari and workspace_id = :'ws_m'),
  :'cook_left');
select public.chk('12.2 his account deleted: his card, his reward still to claim and his phone''s key go; his stamps and the reward he claimed stay, nobody''s',
  :'del_beto' = 'ok'
  and not exists (select 1 from servicio.loyalty_card where user_id = :beto)
  and not exists (select 1 from servicio.card_reward where user_id = :beto)
  and not exists (select 1 from servicio.card_stamp where user_id = :beto)
  and not exists (select 1 from servicio.neighbour_key where user_id = :beto)
  and (select count(*) from servicio.card_stamp s where s.user_id is null and s.workspace_id = :'ws_m') = :'beto_stamps_before'::int
  and exists (select 1 from servicio.card_reward r where r.user_id is null and r.claimed_by = :mari
                 and r.workspace_id = :'ws_m' and r.claimed_at is not null),
  concat_ws(' ', :'del_beto', :'beto_stamps_before'));
-- Only now, once his rows are read: Otra deletes her kitchen.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0085')) as del_otra \gset
reset role;

select public.chk('12.3 a kitchen deleted takes its whole card: every version, its phones'' keys, its cards and rewards',
  :'del_otra' = 'ok'
  and not exists (select 1 from servicio.card_terms where workspace_id = :'ws_o')
  and not exists (select 1 from servicio.kitchen_key where workspace_id = :'ws_o')
  and not exists (select 1 from servicio.loyalty_card where workspace_id = :'ws_o')
  and not exists (select 1 from servicio.card_reward where workspace_id = :'ws_o'),
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
  if (select count(*) from public._verify) <> 56 then
    raise exception 'expected 56 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
