-- ============================================================================
-- 0088 — the handover with no signal (`10.9j-ii-a`; the owner's J1–J4 of
-- 2026-11-20, *"yes to all"*). Every call is made AS THE PERSON, under `set role
-- authenticated` with her claims; moments gone by are set as postgres, as the
-- clock sets them on the live database.
--
-- Section 1 the shape. Section 2 the kitchen's secret, handed out. Section 3 the
-- seal. Section 4 when it is sent. Section 5 a member leaves: the secret renewed.
-- Section 6 *Ya lo tengo* with its minute (J4). Section 7 the deletions.
--
-- ⚠️ THE SEAL IS READ HERE AS A PHONE READS IT (`0088`'s header): fourteen fields, the
-- MAC after the LAST `|`, the dish's name percent-encoded before it — and the MAC
-- worked out again with the secret `kitchen_seal_keys` handed to a member's phone,
-- never with the table's row. So the shape the header promises is what is held.
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

-- One reservation of hers, from a `my_reservations` answer kept under `p_who`.
create function public._res(p_who text, p_id text)
returns jsonb language sql as $$
  select r from jsonb_array_elements(public._a(p_who)) r where r ->> 'id' = p_id
$$;

-- A seal, read as a phone reads it: the MAC after the LAST `|`; before it, twelve
-- fields and the name (which may hold a `|`).
create function public._seal_mac(p_seal text)
returns text language sql immutable as $$
  select substring(p_seal from '\|([^|]*)$')
$$;
create function public._seal_payload(p_seal text)
returns text language sql immutable as $$
  select substring(p_seal from '^(.*)\|[^|]*$')
$$;
create function public._seal_field(p_seal text, p_n integer)
returns text language sql immutable as $$
  select (string_to_array(public._seal_payload(p_seal), '|'))[p_n]
$$;
create function public._seal_name(p_seal text)
returns text language sql immutable as $$
  select array_to_string((string_to_array(public._seal_payload(p_seal), '|'))[13:], '|')
$$;
-- Whether the MAC fits, worked out with a secret as `kitchen_seal_keys` hands it (40 hex).
create function public._seal_fits(p_seal text, p_secret_hex text)
returns boolean language sql immutable as $$
  select public._seal_mac(p_seal)
         = encode(substring(extensions.hmac(convert_to(public._seal_payload(p_seal), 'UTF8'),
                                             decode(p_secret_hex, 'hex'), 'sha1') from 1 for 10), 'hex')
$$;
-- The secret of a version, from a `kitchen_seal_keys` answer kept under `p_who`.
create function public._secret(p_who text, p_version integer)
returns text language sql as $$
  select k ->> 'secret' from jsonb_array_elements(public._a(p_who) -> 'keys') k
   where (k ->> 'version')::int = p_version
$$;

\set mari    '''0088aaaa-0000-4000-8000-000000000001'''
\set cook    '''0088aaaa-0000-4000-8000-000000000002'''
\set otra    '''0088aaaa-0000-4000-8000-000000000003'''
\set pepe    '''0088aaaa-0000-4000-8000-000000000004'''
\set tendera '''0088aaaa-0000-4000-8000-000000000005'''
\set ana     '''0088aaaa-0000-4000-8000-000000000006'''
\set beto    '''0088aaaa-0000-4000-8000-000000000007'''
\set cata    '''0088aaaa-0000-4000-8000-000000000008'''
\set dani    '''0088aaaa-0000-4000-8000-000000000009'''
\set eva     '''0088aaaa-0000-4000-8000-00000000000a'''
\set fer     '''0088aaaa-0000-4000-8000-00000000000b'''
\set gil     '''0088aaaa-0000-4000-8000-00000000000c'''
\set lm      '''0088bbbb-0000-4000-8000-000000000001'''
\set ra      '''0088cccc-0000-4000-8000-000000000001'''
\set rb      '''0088cccc-0000-4000-8000-000000000002'''
\set rc      '''0088cccc-0000-4000-8000-000000000003'''
\set rd      '''0088cccc-0000-4000-8000-000000000004'''
\set re      '''0088cccc-0000-4000-8000-000000000005'''
\set rf      '''0088cccc-0000-4000-8000-000000000006'''
\set rg      '''0088cccc-0000-4000-8000-000000000007'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,    'mari.0088@example.mx',    jsonb_build_object('full_name', 'Mari 0088')),
  (:cook,    'cook.0088@example.mx',    jsonb_build_object('full_name', 'Cook 0088')),
  (:otra,    'otra.0088@example.mx',    jsonb_build_object('full_name', 'Otra 0088')),
  (:pepe,    'pepe.0088@example.mx',    jsonb_build_object('full_name', 'Pepe 0088')),
  (:tendera, 'tendera.0088@example.mx', jsonb_build_object('full_name', 'Tendera 0088')),
  (:ana,     'ana.0088@example.mx',     jsonb_build_object('full_name', 'Ana Rodríguez')),
  (:beto,    'beto.0088@example.mx',    jsonb_build_object('full_name', 'Beto 0088')),
  (:cata,    'cata.0088@example.mx',    jsonb_build_object('full_name', 'Cata 0088')),
  (:dani,    'dani.0088@example.mx',    jsonb_build_object('full_name', 'Dani 0088')),
  (:eva,     'eva.0088@example.mx',     jsonb_build_object('full_name', 'Eva 0088')),
  (:fer,     'fer.0088@example.mx',     jsonb_build_object('full_name', 'Fer 0088')),
  (:gil,     'gil.0088@example.mx',     jsonb_build_object('full_name', 'Gil 0088'));

-- Mari's kitchen with her cook (staff); Otra's kitchen with Pepe (staff); a shop.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0088', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :cook, 'staff', 'Cook 0088');
insert into public.member_location (workspace_id, member_id, location_id)
select :'ws_m', wm.id, :'loc_m' from public.workspace_member wm where wm.workspace_id = :'ws_m' and wm.user_id = :cook;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0088', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_o', :pepe, 'staff', 'Pepe 0088');
insert into public.member_location (workspace_id, member_id, location_id)
select :'ws_o', wm.id, :'loc_o' from public.workspace_member wm where wm.workspace_id = :'ws_o' and wm.user_id = :pepe;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0088') as ws_t \gset
reset role;

-- Mari publishes: a dish whose name holds a `|` and accents, and its desechable.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Pozole rojo | con piña y jalapeño", "unit_price": "85.00", "quantity": 20}]'::jsonb) is not null as published \gset
reset role;
-- Her desechable on the offer, as `publish_listing` copies it from her page (`0079`).
update public.listing set container_price = 5 where id = :lm;


-- ---- 1. The shape ------------------------------------------------------------------------
select public.chk('1.1 the kitchen''s secrets live in servicio, and no client role holds any right on them',
  to_regclass('servicio.kitchen_seal_key') is not null
  and not has_table_privilege('authenticated', 'servicio.kitchen_seal_key', 'select')
  and not has_table_privilege('anon', 'servicio.kitchen_seal_key', 'select')
  and not has_table_privilege('authenticated', 'servicio.kitchen_seal_key', 'insert'));
select public.chk('1.2 kitchen_seal_keys answers a signed-in person and nobody signed out; the seal itself is granted to nobody',
  has_function_privilege('authenticated', 'public.kitchen_seal_keys(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_seal_keys(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.reservation_seal(uuid)', 'execute')
  and not has_function_privilege('anon', 'servicio.reservation_seal(uuid)', 'execute'));
select public.chk('1.3 confirm_my_pickup is ONE function, its second argument p_at defaulted (never an overload), for a signed-in person only',
  (select count(*) from pg_proc where proname = 'confirm_my_pickup' and pronamespace = 'public'::regnamespace) = 1
  and (select pronargs = 2 and pronargdefaults = 1 and proargnames[2] = 'p_at'
         from pg_proc where proname = 'confirm_my_pickup' and pronamespace = 'public'::regnamespace)
  and has_function_privilege('authenticated', 'public.confirm_my_pickup(uuid, timestamptz)', 'execute')
  and not has_function_privilege('anon', 'public.confirm_my_pickup(uuid, timestamptz)', 'execute'));
select public.chk('1.4 a kitchen made is given its first secret at once (version 1, 20 bytes, current); a shop none',
  (select count(*) = 1 and bool_and(version = 1 and retired_at is null and octet_length(secret) = 20)
     from servicio.kitchen_seal_key where workspace_id = :'ws_m')
  and (select count(*) = 1 from servicio.kitchen_seal_key where workspace_id = :'ws_o')
  and not exists (select 1 from servicio.kitchen_seal_key where workspace_id = :'ws_t'));


-- ---- 2. The kitchen's secret, handed out -------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('mari-keys', format('select public.kitchen_seal_keys(%L)', :'ws_m')) as mari_keys \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._call_as_me('cook-keys', format('select public.kitchen_seal_keys(%L)', :'ws_m')) as cook_keys \gset
select public._try(format('select public.kitchen_seal_keys(%L)', :'ws_o')) as cook_other \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.kitchen_seal_keys(%L)', :'ws_m')) as ana_keys \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.kitchen_seal_keys(%L)', :'ws_t')) as shop_keys \gset
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select public._try(format('select public.kitchen_seal_keys(%L)', :'ws_m')) as anon_keys \gset
reset role;

select public.chk('2.1 the owner is handed the current secret: version 1, 40 hex characters, no until',
  :'mari_keys' = 'ok'
  and public._a('mari-keys') ->> 'workspace_id' = :'ws_m'
  and jsonb_array_length(public._a('mari-keys') -> 'keys') = 1
  and (public._a('mari-keys') -> 'keys' -> 0 ->> 'version')::int = 1
  and public._a('mari-keys') -> 'keys' -> 0 ->> 'secret' ~ '^[0-9a-f]{40}$'
  and public._a('mari-keys') -> 'keys' -> 0 -> 'until' = 'null'::jsonb
  and decode(public._a('mari-keys') -> 'keys' -> 0 ->> 'secret', 'hex')
      = (select secret from servicio.kitchen_seal_key where workspace_id = :'ws_m' and version = 1),
  coalesce(public._a('mari-keys')::text, :'mari_keys'));
select public.chk('2.2 her helper is handed the same secret — every role hands over (question 3 of 2026-10-28)',
  :'cook_keys' = 'ok' and public._a('cook-keys') = public._a('mari-keys'),
  :'cook_keys');
select public.chk('2.3 another kitchen''s, a neighbour, a shop and nobody signed out are refused: 42501, 42501, TD013, 42501',
  :'cook_other' = '42501' and :'ana_keys' = '42501' and :'shop_keys' = 'TD013' and :'anon_keys' = '42501',
  concat_ws(' ', :'cook_other', :'ana_keys', :'shop_keys', :'anon_keys'));


-- ---- 3. The seal -------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public.give_my_yes() is not null as ana_yes \gset
select public._call_as_me('ana-reserves', format('select public.reserve_plate(%L, %L, 1, %L, %L, %L)', :ra, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo', 'llevar')) as ana_reserves \gset
select public._call_as_me('ana-again', format('select public.reserve_plate(%L, %L, 1, %L, %L, %L)', :ra, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo', 'llevar')) as ana_again \gset
select public._call_as_me('ana-mine', 'select public.my_reservations()') as ana_mine \gset
reset role;
select public._a('ana-reserves') ->> 'seal' as seal_a \gset
select code as code_a from public.reservation where id = :ra \gset

select public.chk('3.1 reserve_plate answers the seal beside the id and the code, and a retry the same seal',
  :'ana_reserves' = 'ok' and :'ana_again' = 'ok'
  and public._a('ana-reserves') ->> 'id' = :ra
  and (public._a('ana-reserves') ->> 'code')::int = :'code_a'::int
  and :'seal_a' is not null
  and public._a('ana-again') ->> 'seal' = :'seal_a',
  coalesce(public._a('ana-reserves')::text, :'ana_reserves'));
select public.chk('3.2 its fields, as the header lists them: s1, the two ids as 32 hex, version 1, the code, her hour in epoch seconds, efectivo, llevar, 1.000, 85.00, 5.00, 0',
  public._seal_field(:'seal_a', 1) = 's1'
  and public._seal_field(:'seal_a', 2) = replace(:ra, '-', '')
  and public._seal_field(:'seal_a', 3) = replace(:'ws_m', '-', '')
  and public._seal_field(:'seal_a', 4) = '1'
  and public._seal_field(:'seal_a', 5) = :'code_a'
  and public._seal_field(:'seal_a', 6) = extract(epoch from (:'q0'::timestamptz + interval '1 hour'))::bigint::text
  and public._seal_field(:'seal_a', 7) = 'efectivo'
  and public._seal_field(:'seal_a', 8) = 'llevar'
  and public._seal_field(:'seal_a', 9) = '1.000'
  and public._seal_field(:'seal_a', 10) = '85.00'
  and public._seal_field(:'seal_a', 11) = '5.00'
  and public._seal_field(:'seal_a', 12) = '0',
  :'seal_a');
select public.chk('3.3 the dish''s name comes last before the MAC, percent-encoded — its | as %7C, each accent''s two UTF-8 bytes as %XX — so the seal is fourteen fields of printable ASCII',
  public._seal_name(:'seal_a') = 'Pozole rojo %7C con pi%C3%B1a y jalape%C3%B1o'
  and array_length(string_to_array(:'seal_a', '|'), 1) = 14
  and :'seal_a' ~ '^[ -~]+$'
  and public._seal_mac(:'seal_a') ~ '^[0-9a-f]{20}$',
  :'seal_a');
select public.chk('3.3b seal_text: printable ASCII as itself but % and |; a control, an emoji and an em dash as their UTF-8 bytes',
  servicio.seal_text('Taco 100% — rico|ya') = 'Taco 100%25 %E2%80%94 rico%7Cya'
  and servicio.seal_text(E'Mole\nverde 🌮') = 'Mole%0Averde %F0%9F%8C%AE'
  and servicio.seal_text('') = ''
  and not has_function_privilege('authenticated', 'servicio.seal_text(text)', 'execute'));
select public.chk('3.3c the name a seal carries: whole when it fits in 120 encoded characters, else cut after a whole character — never inside an escape',
  servicio.seal_name('Pozole rojo con tostadas') = 'Pozole rojo con tostadas'
  and servicio.seal_name(repeat('ñ', 80)) = repeat('%C3%B1', 20)
  and servicio.seal_name(repeat('a', 119) || 'ñ') = repeat('a', 119)
  and servicio.seal_name(repeat('a', 80)) = repeat('a', 80)
  and length(servicio.seal_name(repeat('🌮', 80))) = 120
  and not has_function_privilege('authenticated', 'servicio.seal_name(text)', 'execute'));
select public.chk('3.4 the MAC fits, worked out on the UTF-8 with the secret her helper''s phone was handed — and not with another kitchen''s',
  public._seal_fits(:'seal_a', public._secret('cook-keys', 1))
  and not public._seal_fits(:'seal_a',
        encode((select secret from servicio.kitchen_seal_key where workspace_id = :'ws_o' and version = 1), 'hex')),
  :'seal_a');
select public.chk('3.5 one character changed — the price — and the MAC no longer fits',
  not public._seal_fits(replace(:'seal_a', '|85.00|', '|65.00|'), public._secret('cook-keys', 1))
  and replace(:'seal_a', '|85.00|', '|65.00|') <> :'seal_a',
  :'seal_a');
select public.chk('3.6 never her name, her id or her score (J2)',
  position('Ana' in :'seal_a') = 0
  and position(replace(:ana, '-', '') in :'seal_a') = 0
  and position(:ana in :'seal_a') = 0,
  :'seal_a');
select public.chk('3.7 my_reservations sends that same seal on her reservation still to collect',
  :'ana_mine' = 'ok' and public._res('ana-mine', :ra) ->> 'seal' = :'seal_a'
  and public._res('ana-mine', :ra) ->> 'state' = 'apartado',
  coalesce(public._res('ana-mine', :ra)::text, :'ana_mine'));


-- ---- 4. When it is sent ------------------------------------------------------------------
-- Beto's is handed over by the cook; Cata cancels hers; Dani's window ended yesterday
-- (released, less than a day); Eva's two days ago.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public.give_my_yes() is not null as beto_yes \gset
select public._call_as_me('rb', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rb, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as beto_reserves \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cata), true);
set local role authenticated;
select public.give_my_yes() is not null as cata_yes \gset
select public._call_as_me('rc', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rc, :lm,
  :'q0'::timestamptz + interval '3 hours', 'efectivo')) as cata_reserves \gset
select public.cancel_my_reservation(:rc) is not null as cata_cancels \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public.give_my_yes() is not null as dani_yes \gset
select public._call_as_me('rd', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rd, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as dani_reserves \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :eva), true);
set local role authenticated;
select public.give_my_yes() is not null as eva_yes \gset
select public._call_as_me('re', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :re, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as eva_reserves \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public.hand_over_reservation(:rb) as handed_b \gset
reset role;
update public.reservation
   set created_at = now() - interval '30 hours', pickup_at = now() - interval '28 hours',
       held_until = now() - interval '20 hours'
 where id = :rd;
update public.reservation
   set created_at = now() - interval '3 days', pickup_at = now() - interval '50 hours',
       held_until = now() - interval '48 hours'
 where id = :re;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-mine', 'select public.my_reservations()') as beto_mine \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cata), true);
set local role authenticated;
select public._call_as_me('cata-mine', 'select public.my_reservations()') as cata_mine \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._call_as_me('dani-mine', 'select public.my_reservations()') as dani_mine \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :eva), true);
set local role authenticated;
select public._call_as_me('eva-mine', 'select public.my_reservations()') as eva_mine \gset
reset role;

select public.chk('4.1 handed over by the kitchen: recogido, and no seal — the key is there, its value NULL',
  :'handed_b' = 'recogido'
  and public._res('beto-mine', :rb) ->> 'state' = 'recogido'
  and public._res('beto-mine', :rb) ? 'seal'
  and public._res('beto-mine', :rb) -> 'seal' = 'null'::jsonb,
  coalesce(public._res('beto-mine', :rb)::text, :'beto_mine'));
select public.chk('4.2 cancelled by her: no seal',
  public._res('cata-mine', :rc) ->> 'state' = 'cancelado'
  and public._res('cata-mine', :rc) -> 'seal' = 'null'::jsonb,
  coalesce(public._res('cata-mine', :rc)::text, :'cata_mine'));
select public.chk('4.3 released less than a day ago: its seal still sent (she keeps her swipe, the kitchen hands it over all the same); two days ago: none',
  public._res('dani-mine', :rd) ->> 'state' = 'liberado'
  and public._seal_fits(public._res('dani-mine', :rd) ->> 'seal', public._secret('cook-keys', 1))
  and public._res('eva-mine', :re) ->> 'state' = 'liberado'
  and public._res('eva-mine', :re) -> 'seal' = 'null'::jsonb,
  concat_ws(' ', public._res('dani-mine', :rd)::text, public._res('eva-mine', :re)::text));


-- ---- 5. A member leaves: the secret renewed ----------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_m')) as cook_left \gset
select public._try(format('select public.kitchen_seal_keys(%L)', :'ws_m')) as cook_after \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('mari-keys-2', format('select public.kitchen_seal_keys(%L)', :'ws_m')) as mari_keys_2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-mine-2', 'select public.my_reservations()') as ana_mine_2 \gset
reset role;
select public._res('ana-mine-2', :ra) ->> 'seal' as seal_a2 \gset

select public.chk('5.1 her helper leaves: version 1 retired, version 2 current — handed out newest first, the old one with until = a day after its retirement',
  :'cook_left' = 'ok'
  and jsonb_array_length(public._a('mari-keys-2') -> 'keys') = 2
  and (public._a('mari-keys-2') -> 'keys' -> 0 ->> 'version')::int = 2
  and public._a('mari-keys-2') -> 'keys' -> 0 -> 'until' = 'null'::jsonb
  and (public._a('mari-keys-2') -> 'keys' -> 1 ->> 'version')::int = 1
  and public._a('mari-keys-2') -> 'keys' -> 1 ->> 'secret' = public._secret('cook-keys', 1)
  and (public._a('mari-keys-2') -> 'keys' -> 1 ->> 'until')::timestamptz
      = (select retired_at + interval '24 hours' from servicio.kitchen_seal_key where workspace_id = :'ws_m' and version = 1)
  and public._secret('mari-keys-2', 2) <> public._secret('mari-keys-2', 1),
  coalesce(public._a('mari-keys-2')::text, :'cook_left'));
select public.chk('5.2 she is no longer handed the kitchen''s secret (42501)',
  :'cook_after' = '42501', :'cook_after');
select public.chk('5.3 Ana''s next read is sealed with version 2: the new secret fits, the old one does not',
  public._seal_field(:'seal_a2', 4) = '2'
  and public._seal_fits(:'seal_a2', public._secret('mari-keys-2', 2))
  and not public._seal_fits(:'seal_a2', public._secret('mari-keys-2', 1))
  and public._seal_fits(:'seal_a', public._secret('mari-keys-2', 1)),
  :'seal_a2');

-- A day goes by; then Gil joins and his account goes (delete_my_account): a third version.
update servicio.kitchen_seal_key set retired_at = now() - interval '25 hours'
 where workspace_id = :'ws_m' and version = 1;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('mari-keys-3', format('select public.kitchen_seal_keys(%L)', :'ws_m')) as mari_keys_3 \gset
reset role;
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :gil, 'staff', 'Gil 0088');
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gil), true);
set local role authenticated;
select public._try('select public.delete_my_account()') as gil_gone \gset
reset role;

select public.chk('5.4 a version retired more than a day ago is handed out no more',
  :'mari_keys_3' = 'ok'
  and jsonb_array_length(public._a('mari-keys-3') -> 'keys') = 1
  and (public._a('mari-keys-3') -> 'keys' -> 0 ->> 'version')::int = 2,
  coalesce(public._a('mari-keys-3')::text, :'mari_keys_3'));
select public.chk('5.5 a helper''s account deleted renews it too: version 3 current, 2 retired, and 1 — over its day — deleted',
  :'gil_gone' = 'ok'
  and (select array_agg(version order by version) from servicio.kitchen_seal_key where workspace_id = :'ws_m') = array[2, 3]
  and (select retired_at is not null from servicio.kitchen_seal_key where workspace_id = :'ws_m' and version = 2)
  and (select retired_at is null from servicio.kitchen_seal_key where workspace_id = :'ws_m' and version = 3),
  :'gil_gone');


-- ---- 6. *Ya lo tengo* with its minute (J4) -----------------------------------------------
-- Fer and Ana's reservation: Ana swipes as every build in the field does (p_id alone);
-- Fer's was made half an hour ago and she swiped ten minutes ago with no signal.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fer), true);
set local role authenticated;
select public.give_my_yes() is not null as fer_yes \gset
select public._call_as_me('rf', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rf, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo')) as fer_reserves \gset
reset role;
update public.reservation set created_at = now() - interval '30 minutes' where id = :rf;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.confirm_my_pickup(%L)', :ra)) as ana_swipes \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fer), true);
set local role authenticated;
select public._try(format('select public.confirm_my_pickup(p_id => %L, p_at => %L)', :rf, now() - interval '10 minutes')) as fer_swipes \gset
select public._try(format('select public.confirm_my_pickup(p_id => %L, p_at => %L)', :rf, now() - interval '2 minutes')) as fer_again \gset
reset role;

select public.chk('6.1 p_id alone, as every build in the field sends it: recogido, its moment now',
  :'ana_swipes' = 'ok'
  and (select picked_up_at = now() from public.reservation where id = :ra),
  :'ana_swipes');
select public.chk('6.2 her minute kept: the swipe made ten minutes ago with no signal is recorded at that minute, and a retry keeps the first',
  :'fer_swipes' = 'ok' and :'fer_again' = 'ok'
  and (select picked_up_at = now() - interval '10 minutes' from public.reservation where id = :rf),
  concat_ws(' ', :'fer_swipes', :'fer_again'));

-- Dani's window ended 20 hours ago (section 4): a swipe made just after it, arriving now,
-- is within a day of it. Eva's ended two days ago: a swipe at its window's end is within a
-- day of it whenever it arrives; one sent with no moment (now) is not.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :eva), true);
set local role authenticated;
select public._try(format('select public.confirm_my_pickup(%L)', :re)) as eva_now \gset
select public._try(format('select public.confirm_my_pickup(p_id => %L, p_at => %L)', :re, now() - interval '47 hours')) as eva_then \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._try(format('select public.confirm_my_pickup(p_id => %L, p_at => %L)', :rd, now() + interval '1 hour')) as dani_future \gset
reset role;

select public.chk('6.3 a swipe sent days late is taken when ITS minute was within a day of her window; with no minute (now) it is TD018',
  :'eva_now' = 'TD018' and :'eva_then' = 'ok'
  and (select picked_up_at = now() - interval '47 hours' from public.reservation where id = :re),
  concat_ws(' ', :'eva_now', :'eva_then'));
select public.chk('6.4 a minute in the future is kept as now',
  :'dani_future' = 'ok'
  and (select picked_up_at = now() from public.reservation where id = :rd),
  :'dani_future');

-- Before it was made: kept at its making. Cancelled: refused. Not hers: refused.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :pepe), true);
set local role authenticated;
select public.give_my_yes() is not null as pepe_yes \gset
select public._call_as_me('rg', format('select public.reserve_plate(%L, %L, 1, %L, %L)', :rg, :lm,
  :'q0'::timestamptz + interval '2 hours', 'efectivo')) as pepe_reserves \gset
select public._try(format('select public.confirm_my_pickup(p_id => %L, p_at => %L)', :rg, now() - interval '1 day')) as pepe_before \gset
select public._try(format('select public.confirm_my_pickup(p_id => %L, p_at => %L)', :rc, now())) as pepe_not_his \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cata), true);
set local role authenticated;
select public._try(format('select public.confirm_my_pickup(p_id => %L, p_at => %L)', :rc, now())) as cata_cancelled \gset
reset role;

select public.chk('6.5 a minute before the reservation was made is kept at its making',
  :'pepe_reserves' = 'ok' and :'pepe_before' = 'ok'
  and (select picked_up_at = created_at from public.reservation where id = :rg),
  concat_ws(' ', :'pepe_reserves', :'pepe_before'));
select public.chk('6.6 a cancelled one is TD018 with a minute too; somebody else''s is 42501',
  :'cata_cancelled' = 'TD018' and :'pepe_not_his' = '42501',
  concat_ws(' ', :'cata_cancelled', :'pepe_not_his'));


-- ---- 7. The deletions --------------------------------------------------------------------
-- Otra deletes her kitchen with Pepe still working there; then her account. The
-- membership rows go with the kitchen, and no secret is made for a kitchen that is going.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0088')) as del_otra \gset
reset role;
-- Mari's account: the sole owner of her kitchen, nothing left to hand over (Ana's,
-- Fer's and Pepe's are collected, Beto's handed over, Cata's cancelled, Dani's and Eva's
-- swiped), names it and goes — her kitchen with her.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.delete_my_account(p_business_names => array[%L])', 'Fonda Doña Mari 0088')) as del_mari \gset
reset role;

select public.chk('7.1 a kitchen deleted with a helper still working there: deleted, and its secrets with it',
  :'del_otra' = 'ok'
  and not exists (select 1 from public.workspace where id = :'ws_o')
  and not exists (select 1 from servicio.kitchen_seal_key where workspace_id = :'ws_o'),
  :'del_otra');
select public.chk('7.2 the account of a kitchen''s sole owner: the kitchen goes, and its secrets with it',
  :'del_mari' = 'ok'
  and not exists (select 1 from public.workspace where id = :'ws_m')
  and not exists (select 1 from servicio.kitchen_seal_key where workspace_id = :'ws_m'),
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
  if (select count(*) from public._verify) <> 32 then
    raise exception 'expected 32 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
