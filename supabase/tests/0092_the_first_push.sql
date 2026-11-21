-- ============================================================================
-- 0092 — the first push: a fonda's reservations on her phone (`10.5b-v-ii`;
-- call 14 of 2026-11-05, the tables as drawn by `10.5c-i` and ruled 2026-11-20).
--
-- ⚠️ WHAT IS SENT IS READ OFF pg_net's OWN QUEUE (`net.http_request_queue`): the
-- request's address, its headers and its body as Expo would receive them — never
-- the function's idea of them. Nothing reaches Expo: this file is ONE TRANSACTION
-- THAT ROLLS BACK, and pg_net sends only what is committed.
-- ⚠️ THE NEW RESERVATION'S TRIGGER IS DEFERRED TO THE COMMIT, which a rolled-back
-- file never reaches: section 3 proves the deferral (nothing queued at the end of
-- `reserve_plate`'s statement), then `set constraints … immediate` fires it as the
-- commit would — with the reservation's line, the dish, in place — and `… deferred`
-- puts it back, after each reservation.
-- ⚠️ EXPO'S ANSWERS ARE WRITTEN BY HAND into `net._http_response` under the ids of
-- the requests they answer, in the shapes Expo's reference gives (read 2026-11-11):
-- the reader is asked to read them, nothing more.
--
-- Section 1 the shape and the rights. Section 2 a phone's token, her switch, a tap.
-- Section 3 the sender, through `reserve_plate`, `cancel_my_reservation` and the
-- kitchen's cancel: who gets what, in what words. Section 4 the reader: tickets,
-- receipts, a gone phone retired, what is lost. Section 5 what is forgotten.
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

-- What pg_net queued after a mark: each request's url, headers and body as JSON.
create function public._queued(p_after bigint)
returns table (id bigint, url text, headers jsonb, body jsonb, timeout_ms integer)
language sql as $$
  select q.id, q.url, q.headers, convert_from(q.body, 'UTF8')::jsonb, q.timeout_milliseconds
    from net.http_request_queue q where q.id > p_after order by q.id
$$;
create function public._mark() returns bigint language sql as $$
  select coalesce(max(id), 0) from net.http_request_queue
$$;
-- The tokens one request was sent to, in the order it carried them.
create function public._to(p_request bigint) returns text[] language sql as $$
  select array_agg(m ->> 'to' order by n)
    from net.http_request_queue q,
         jsonb_array_elements(convert_from(q.body, 'UTF8')::jsonb) with ordinality as x (m, n)
   where q.id = p_request
$$;
-- A token, as each phone below registers it.
create function public._tok(p text) returns text language sql immutable as $$
  select 'ExponentPushToken[' || p || ']'
$$;
-- A local moment in Mexico City.
create function public._mx(p text) returns timestamptz language sql immutable as $$
  select (p::timestamp) at time zone 'America/Mexico_City'
$$;

\set mari '''0092aaaa-0000-4000-8000-000000000001'''
\set cook '''0092aaaa-0000-4000-8000-000000000002'''
\set luz  '''0092aaaa-0000-4000-8000-000000000003'''
\set sol  '''0092aaaa-0000-4000-8000-000000000004'''
\set teo  '''0092aaaa-0000-4000-8000-000000000005'''
\set uli  '''0092aaaa-0000-4000-8000-000000000006'''
\set vic  '''0092aaaa-0000-4000-8000-000000000007'''
\set otra '''0092aaaa-0000-4000-8000-000000000008'''
\set ana  '''0092aaaa-0000-4000-8000-000000000009'''
\set beto '''0092aaaa-0000-4000-8000-00000000000a'''
\set lm   '''0092bbbb-0000-4000-8000-000000000001'''
\set lo   '''0092bbbb-0000-4000-8000-000000000002'''
\set ra   '''0092cccc-0000-4000-8000-000000000001'''
\set rb   '''0092cccc-0000-4000-8000-000000000002'''
\set rc   '''0092cccc-0000-4000-8000-000000000003'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari, 'mari.0092@example.mx', jsonb_build_object('full_name', 'Mari 0092')),
  (:cook, 'cook.0092@example.mx', jsonb_build_object('full_name', 'Cook 0092')),
  (:luz,  'luz.0092@example.mx',  jsonb_build_object('full_name', 'Luz 0092')),
  (:sol,  'sol.0092@example.mx',  jsonb_build_object('full_name', 'Sol 0092')),
  (:teo,  'teo.0092@example.mx',  jsonb_build_object('full_name', 'Teo 0092')),
  (:uli,  'uli.0092@example.mx',  jsonb_build_object('full_name', 'Uli 0092')),
  (:vic,  'vic.0092@example.mx',  jsonb_build_object('full_name', 'Vic 0092')),
  (:otra, 'otra.0092@example.mx', jsonb_build_object('full_name', 'Otra 0092')),
  (:ana,  'ana.0092@example.mx',  jsonb_build_object('full_name', 'Ana Rodríguez')),
  (:beto, 'beto.0092@example.mx', jsonb_build_object('full_name', 'Beto Ramírez'));

-- Mari's kitchen and its six helpers (Uli no longer works there); Otra's kitchen.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0092', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name, is_active)
values (:'ws_m', :cook, 'staff', 'Cook 0092', true), (:'ws_m', :luz, 'staff', 'Luz 0092', true),
       (:'ws_m', :sol, 'staff', 'Sol 0092', true),   (:'ws_m', :teo, 'staff', 'Teo 0092', true),
       (:'ws_m', :uli, 'staff', 'Uli 0092', false),  (:'ws_m', :vic, 'staff', 'Vic 0092', true);
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0092', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset

-- Mari's kitchen serves para comer aquí too; she publishes a comida corrida. Otra a mole.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.set_kitchen_page(:'ws_m', '{"para_aqui": true}'::jsonb) is not null as aqui_on \gset
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 10}]'::jsonb) is not null as published_m \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.publish_listing(:lo, :'loc_o', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Mole con arroz", "unit_price": "70.00", "quantity": 5}]'::jsonb) is not null as published_o \gset
reset role;


-- ---- 1. The shape and the rights ---------------------------------------------------------
select public.chk('1.1 the five tables live in servicio, and no client role holds a right on any',
  (select count(*) from pg_class c
    where c.relnamespace = 'servicio'::regnamespace and c.relkind = 'r'
      and c.relname in ('notification_kind', 'push_token', 'notification_switch', 'notification_send',
                        'notification_tap_count')) = 5
  and not exists (
    select 1 from unnest(array['notification_kind', 'push_token', 'notification_switch', 'notification_send',
                               'notification_tap_count']) t,
                  unnest(array['anon', 'authenticated']) r,
                  unnest(array['select', 'insert', 'update', 'delete']) p
     where has_table_privilege(r, 'servicio.' || t, p)));
select public.chk('1.2 the five doors answer a signed-in person and nobody signed out',
  (select bool_and(has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.my_notification_kinds(text)', 'public.set_notification_switch(text, boolean)',
                       'public.register_push_token(text, text, text, boolean, text[], text[], text)',
                       'public.retire_push_token(text, text)', 'public.count_notification_tap(text)']) f));
select public.chk('1.3 the sender, the reader, the trims and their helpers are granted to nobody',
  (select bool_and(not has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['servicio.push_send(text, uuid[], text, text, jsonb)',
                       'servicio.push_recipients(uuid, text, uuid)', 'servicio.expo_headers()',
                       'servicio.read_push_answers()', 'servicio.forget_old_pushes()', 'servicio.trim_cron_history()',
                       'servicio.kinds_of(uuid, text)', 'servicio.reservation_dish(uuid)',
                       'servicio.push_when(timestamptz, text, timestamptz)',
                       'servicio.expo_ticket(integer, text, boolean, text, integer)',
                       'servicio.expo_receipt(integer, text, text)']) f));
select public.chk('1.4 Wera Cocina''s kind: apartados, a service kind on its own channel, high, on by default, a tap opens Apartados',
  (select app = 'cocina' and class = 'servicio' and channel = 'apartados' and channel_name = 'Apartados'
          and importance = 'alta' and default_on and is_on and opens = 'apartados'
          and label = 'Avisos de apartados' and detail = 'Cada apartado nuevo y cada cancelación.'
     from servicio.notification_kind where kind = 'apartados')
  -- `0093` adds two promotion kinds, dark: Wera Cocina's one service kind is still this one.
  and (select count(*) from servicio.notification_kind where class = 'servicio') = 1);
select public.chk('1.5 the three jobs: Expo''s answers each minute, the 30 days and pg_cron''s own history each night',
  (select count(*) from cron.job
    where (jobname, schedule, command) in (
      ('read-push-answers', '* * * * *', 'select servicio.read_push_answers()'),
      ('forget-old-pushes', '25 9 * * *', 'select servicio.forget_old_pushes()'),
      ('trim-cron-history', '27 9 * * *', 'select servicio.trim_cron_history()'))) = 3);
select public.chk('1.6 a new reservation is announced at the commit (a deferred constraint trigger); a cancellation at once',
  (select tgdeferrable and tginitdeferred and tgconstraint <> 0
     from pg_trigger where tgname = 'push_reservation_made' and tgrelid = 'public.reservation'::regclass)
  and exists (select 1 from pg_trigger where tgname = 'push_reservation_cancelled'
                                         and tgrelid = 'public.reservation'::regclass and not tgdeferrable));


-- ---- 2. A phone's token, her switch, a tap -----------------------------------------------
-- Mari's Android holds both of Wera Cocina's channels; Cook's iPhone holds none (an iPhone
-- has none); Luz's Android has not made apartados; Sol silenced it; Teo will switch it off;
-- Uli is gone from the kitchen; Vic's phone does not allow notifications.
create function public._reg(p_user uuid, p_token text, p_platform text, p_allowed boolean,
                            p_channels text[], p_silenced text[] default '{}', p_replaces text default null)
returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
  set local role authenticated;
  begin
    perform public.register_push_token(p_app => 'cocina', p_token => p_token, p_platform => p_platform,
      p_allowed => p_allowed, p_channels => p_channels, p_silenced => p_silenced, p_replaces => p_replaces);
  exception when others then
    reset role;
    return sqlstate;
  end;
  reset role;
  return 'ok';
end;
$$;

select public._reg(:mari, public._tok('mari-1'), 'android', true, '{apartados,recordatorio}') as reg_mari \gset
select public._reg(:mari, public._tok('mari-1'), 'android', true, '{apartados,recordatorio}') as reg_mari_again \gset
select public._reg(:cook, public._tok('cook-1'), 'ios', true, '{}') as reg_cook \gset
select public._reg(:luz,  public._tok('luz-1'),  'android', true, '{recordatorio}') as reg_luz \gset
select public._reg(:sol,  public._tok('sol-1'),  'android', true, '{apartados}', '{apartados}') as reg_sol \gset
select public._reg(:teo,  public._tok('teo-1'),  'android', true, '{apartados}') as reg_teo \gset
select public._reg(:uli,  public._tok('uli-1'),  'android', true, '{apartados}') as reg_uli \gset
select public._reg(:vic,  public._tok('vic-1'),  'android', false, '{apartados}') as reg_vic \gset
select public._reg(:otra, public._tok('otra-1'), 'android', true, '{apartados}') as reg_otra \gset

select public.chk('2.1 each phone registers; the same token again is still one live row, its moment renewed',
  concat_ws(',', :'reg_mari', :'reg_mari_again', :'reg_cook', :'reg_luz', :'reg_sol', :'reg_teo', :'reg_uli', :'reg_vic', :'reg_otra')
    = 'ok,ok,ok,ok,ok,ok,ok,ok,ok'
  and (select count(*) from servicio.push_token where token = public._tok('mari-1')) = 1
  and (select user_id = :mari and app = 'cocina' and platform = 'android' and allowed and retired_at is null
              and channels = '{apartados,recordatorio}' and silenced = '{}'
         from servicio.push_token where token = public._tok('mari-1')),
  concat_ws(',', :'reg_mari', :'reg_mari_again', :'reg_cook', :'reg_luz', :'reg_sol', :'reg_teo', :'reg_uli', :'reg_vic', :'reg_otra'));

select public._reg(:mari, 'not-a-token', 'android', true, '{}') as bad_token \gset
select public._reg(:mari, public._tok('x'), 'web', true, '{}') as bad_platform \gset
select public._reg(:mari, public._tok('x'), 'android', null, '{}') as bad_allowed \gset
select public._reg(:mari, public._tok('x'), 'android', true,
  (select array_agg('c' || g) from generate_series(1, 21) g)) as too_many \gset
select public._reg(:mari, public._tok('x'), 'android', true, '{"bad channel"}') as bad_channel \gset
select set_config('request.jwt.claims', '', true);
set local role anon;
select public._try(format('select public.register_push_token(%L, %L, %L, true)', 'cocina', public._tok('x'), 'android')) as anon_reg \gset
select public._try(format('select public.my_notification_kinds(%L)', 'cocina')) as anon_kinds \gset
reset role;
select public.chk('2.2 refused: a token that is not Expo''s, a platform, no answer, 21 channels, a channel''s shape — 22023; signed out — 42501',
  concat_ws(',', :'bad_token', :'bad_platform', :'bad_allowed', :'too_many', :'bad_channel', :'anon_reg', :'anon_kinds')
    = '22023,22023,22023,22023,22023,42501,42501'
  and not exists (select 1 from servicio.push_token where token = public._tok('x')),
  concat_ws(',', :'bad_token', :'bad_platform', :'bad_allowed', :'too_many', :'bad_channel', :'anon_reg', :'anon_kinds'));

-- Ana signs in to Wera Cocina on Beto's phone… then Beto signs back in.
select public._reg(:beto, public._tok('phone-b'), 'android', true, '{apartados}') as reg_b1 \gset
select public._reg(:ana,  public._tok('phone-b'), 'android', true, '{apartados}') as reg_b2 \gset
select public.chk('2.3 another login takes the phone: the first one''s row is retired otra_cuenta, the second''s is the live one',
  :'reg_b2' = 'ok'
  and (select retired_why = 'otra_cuenta' and retired_at is not null from servicio.push_token
        where token = public._tok('phone-b') and user_id = :beto)
  and (select retired_at is null from servicio.push_token where token = public._tok('phone-b') and user_id = :ana)
  and (select count(*) from servicio.push_token where token = public._tok('phone-b') and retired_at is null) = 1);
select public._reg(:beto, public._tok('phone-b'), 'android', true, '{apartados}') as reg_b3 \gset
select public.chk('2.4 and back: Beto signing in again takes it from Ana, in a row of its own',
  :'reg_b3' = 'ok'
  and (select count(*) from servicio.push_token where token = public._tok('phone-b')) = 3
  and (select user_id from servicio.push_token where token = public._tok('phone-b') and retired_at is null) = :beto::uuid);

-- Beto's phone hands him a new token; then he signs out.
select public._reg(:beto, public._tok('phone-b2'), 'android', true, '{apartados}', '{}', public._tok('phone-b')) as reg_b4 \gset
select public.chk('2.5 a changed token retires the one it replaces (otro_token)',
  :'reg_b4' = 'ok'
  and not exists (select 1 from servicio.push_token where token = public._tok('phone-b') and retired_at is null)
  and (select count(*) from servicio.push_token
        where token = public._tok('phone-b') and user_id = :beto and retired_why = 'otro_token') = 1
  and exists (select 1 from servicio.push_token where token = public._tok('phone-b2') and retired_at is null));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.retire_push_token(%L, %L)', 'cocina', public._tok('phone-b2'))) as ana_retires_b \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._try(format('select public.retire_push_token(%L, %L)', 'cocina', public._tok('phone-b2'))) as beto_out \gset
select public._try(format('select public.retire_push_token(%L, %L)', 'cocina', public._tok('phone-b2'))) as beto_out_again \gset
reset role;
select public.chk('2.6 Cerrar sesión retires his own token (cerro_sesion); someone else''s retire changes nothing; again is harmless',
  :'ana_retires_b' = 'ok' and :'beto_out' = 'ok' and :'beto_out_again' = 'ok'
  and (select retired_why from servicio.push_token where token = public._tok('phone-b2')) = 'cerro_sesion');

-- Her kinds and her switch.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :teo), true);
set local role authenticated;
select public._call_as_me('teo-kinds', format('select public.my_notification_kinds(%L)', 'cocina')) as teo_kinds \gset
select public._call_as_me('teo-itacate', format('select public.my_notification_kinds(%L)', 'itacate')) as teo_itacate \gset
select public._try(format('select public.my_notification_kinds(%L)', 'wera')) as teo_wera \gset
select public._call_as_me('teo-off', format('select public.set_notification_switch(%L, false)', 'apartados')) as teo_off \gset
select public._try(format('select public.set_notification_switch(%L, false)', 'nada')) as teo_unknown \gset
select public._try(format('select public.set_notification_switch(%L, null)', 'apartados')) as teo_null \gset
reset role;
select public.chk('2.7 her kinds: one, by these keys, her switch on by default; Itacate''s none yet; an app it does not know — 22023',
  :'teo_kinds' = 'ok' and :'teo_itacate' = 'ok' and :'teo_wera' = '22023'
  and jsonb_array_length(public._a('teo-kinds')) = 1
  and (select array_agg(k order by k) from jsonb_object_keys(public._a('teo-kinds') -> 0) k)
      = array['channel', 'channel_name', 'class', 'detail', 'importance', 'is_on', 'kind', 'label', 'opens']
  and public._a('teo-kinds') -> 0 ->> 'kind' = 'apartados'
  and (public._a('teo-kinds') -> 0 ->> 'is_on')::boolean
  and public._a('teo-itacate') = '[]'::jsonb,
  coalesce(public._a('teo-kinds')::text, :'teo_kinds'));
select public.chk('2.8 her switch off: answered as held, kept for her; no such kind, no answer — 22023',
  :'teo_off' = 'ok' and not (public._a('teo-off') -> 0 ->> 'is_on')::boolean
  and (select not is_on from servicio.notification_switch where user_id = :teo and kind = 'apartados')
  and :'teo_unknown' = '22023' and :'teo_null' = '22023',
  concat_ws(',', :'teo_off', :'teo_unknown', :'teo_null'));

-- A promotion is never switched on here.
insert into servicio.notification_kind (kind, app, class, channel, channel_name, label, default_on, opens)
values ('prueba_promo', 'cocina', 'promocion', 'novedades', 'Novedades', 'Novedades', false, 'hoy');
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :teo), true);
set local role authenticated;
select public._try(format('select public.set_notification_switch(%L, true)', 'prueba_promo')) as teo_promo \gset
select public._try(format('select public.count_notification_tap(%L)', 'prueba_promo')) as tap_promo \gset
select public._try(format('select public.count_notification_tap(%L)', 'apartados')) as tap1 \gset
select public._try(format('select public.count_notification_tap(%L)', 'apartados')) as tap2 \gset
reset role;
delete from servicio.notification_kind where kind = 'prueba_promo';
select public.chk('2.9 a promotion''s switch and its taps are refused here (22023); two taps on apartados are 2 today, with nobody kept',
  :'teo_promo' = '22023' and :'tap_promo' = '22023' and :'tap1' = 'ok' and :'tap2' = 'ok'
  and (select taps from servicio.notification_tap_count
        where kind = 'apartados' and day = (now() at time zone 'America/Mexico_City')::date) = 2
  and (select count(*) from information_schema.columns
        where table_schema = 'servicio' and table_name = 'notification_tap_count') = 3,
  concat_ws(',', :'teo_promo', :'tap_promo', :'tap1', :'tap2'));


-- ---- 3. The sender -----------------------------------------------------------------------
select public._mark() as m0 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public.give_my_yes() is not null as ana_yes \gset
select public._call_as_me('ana-reserves', format('select public.reserve_plate(%L, %L, 1, %L, %L, %L)', :ra, :lm,
  :'q0'::timestamptz + interval '1 hour', 'efectivo', 'llevar')) as ana_reserves \gset
reset role;
select count(*) as queued_before_commit from public._queued(:m0) \gset

select public.chk('3.1 she reserves, and nothing is queued at the end of the statement — the message waits for the commit',
  :'ana_reserves' = 'ok' and :'queued_before_commit' = 0, :'ana_reserves');

-- The commit, as the deferred trigger sees it — then back to waiting for it.
-- ⚠️ LEFT IMMEDIATE, the trigger would fire at the end of each statement INSIDE
-- `reserve_plate`, before her line exists, and say *Un apartado*: measured while
-- this file was written. Every later reservation here goes the production way —
-- deferred — and is fired the same way once its function has returned.
set constraints public.push_reservation_made immediate;
set constraints public.push_reservation_made deferred;
select id as req_new from public._queued(:m0) \gset
select case when ((:'q0'::timestamptz + interval '1 hour') at time zone 'America/Mexico_City')::date
                 = (now() at time zone 'America/Mexico_City')::date
            then 'las ' else 'mañana a las ' end
       || to_char((:'q0'::timestamptz + interval '1 hour') at time zone 'America/Mexico_City', 'HH24:MI') as hora_a \gset

select public.chk('3.2 at the commit, ONE request to Expo''s send address, with a 10-second limit, JSON, and no key while the Vault holds none',
  (select count(*) from public._queued(:m0)) = 1
  and (select url = 'https://exp.host/--/api/v2/push/send' and timeout_ms = 10000
              and headers ->> 'Content-Type' = 'application/json' and not headers ? 'Authorization'
         from public._queued(:m0)),
  (select headers::text from public._queued(:m0) limit 1));
select public.chk('3.3 to Mari''s Android and Cook''s iPhone, and to nobody else: not a phone without the channel, one that silenced it, one switched off, a member gone, a phone that refuses, another kitchen',
  public._to(:req_new) = (select array_agg(token order by id) from servicio.push_token
                           where token in (public._tok('mari-1'), public._tok('cook-1'))),
  array_to_string(public._to(:req_new), ' '));
select public.chk('3.4 the words: Nuevo apartado — the dish, her hour, para llevar, the method — on the apartados channel, high',
  (select bool_and(m ->> 'title' = 'Nuevo apartado'
                   and m ->> 'body' = 'Comida corrida para ' || :'hora_a' || ' · para llevar · efectivo'
                   and m ->> 'channelId' = 'apartados' and m ->> 'priority' = 'high' and m ->> 'sound' = 'default'
                   and m -> 'data' = jsonb_build_object('kind', 'apartados', 'opens', 'apartados', 'workspace_id', :'ws_m'))
     from public._queued(:m0) q, jsonb_array_elements(q.body) m),
  (select body::text from public._queued(:m0) limit 1));
select public.chk('3.5 never her name, nor her id, nor her code',
  (select position('Ana' in body::text) = 0 and position(:ana::text in body::text) = 0
          and position((select code::text from public.reservation where id = :ra) in (select string_agg(m ->> 'body', ' ') from jsonb_array_elements(body) m)) = 0
     from public._queued(:m0)));
select public.chk('3.6 one row per message: its kind, its phone, its request and its place in it, what it said',
  (select count(*) from servicio.notification_send where request_id = :req_new) = 2
  and (select array_agg(t.token order by s.request_pos) from servicio.notification_send s
         join servicio.push_token t on t.id = s.token_id where s.request_id = :req_new) = public._to(:req_new)
  and (select bool_and(kind = 'apartados' and ticket_status is null and message ->> 'title' = 'Nuevo apartado')
         from servicio.notification_send where request_id = :req_new));

-- She cancels.
select public._mark() as m1 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.cancel_my_reservation(%L)', :ra)) as ana_cancels \gset
reset role;
select case when ((:'q0'::timestamptz + interval '1 hour') at time zone 'America/Mexico_City')::date
                 = (now() at time zone 'America/Mexico_City')::date
            then 'las ' else 'mañana a las ' end
       || to_char((:'q0'::timestamptz + interval '1 hour') at time zone 'America/Mexico_City', 'HH24:MI') as hora_c \gset
select public.chk('3.7 she cancels: at once, to the same two phones — Se canceló un apartado, the dish, her hour, back on offer',
  :'ana_cancels' = 'ok'
  and (select count(*) from public._queued(:m1)) = 1
  and (select public._to(id) from public._queued(:m1)) = public._to(:req_new)
  and (select bool_and(m ->> 'title' = 'Se canceló un apartado'
                       and m ->> 'body' = 'Comida corrida de ' || :'hora_c' || ' · está otra vez en oferta')
         from public._queued(:m1) q, jsonb_array_elements(q.body) m),
  coalesce((select body::text from public._queued(:m1) limit 1), :'ana_cancels'));

-- The kitchen's own cancel, switched on for this file: Mari cancels Beto's plate.
update servicio.feature_switch set is_on = true where name = 'kitchen_cancel';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public.give_my_yes() is not null as beto_yes \gset
select public._call_as_me('beto-reserves', format('select public.reserve_plate(%L, %L, 1, %L, %L, %L)', :rb, :lm,
  :'q0'::timestamptz + interval '2 hours', 'efectivo', 'aqui')) as beto_reserves \gset
reset role;
set constraints public.push_reservation_made immediate;
set constraints public.push_reservation_made deferred;
select public._mark() as m2 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.cancel_reservation_as_kitchen(%L, %L)', :rb, 'otro')) as mari_cancels \gset
reset role;
select public.chk('3.8 his plate para comer aquí, then cancelled by the kitchen: to Cook, never to Mari, who did it',
  :'beto_reserves' = 'ok' and :'mari_cancels' = 'ok'
  and (select count(*) from public._queued(:m2)) = 1
  and (select public._to(id) from public._queued(:m2)) = array[public._tok('cook-1')]
  and (select body -> 0 ->> 'title' from public._queued(:m2)) = 'Se canceló un apartado',
  concat_ws(',', :'beto_reserves', :'mari_cancels'));
select public.chk('3.9 and his new reservation''s words said para comer aquí — and named the dish, at the commit',
  (select count(*) from servicio.notification_send
    where message ->> 'body' like 'Comida corrida para % · para comer aquí · efectivo') = 2
  and not exists (select 1 from servicio.notification_send where message ->> 'body' like 'Un apartado%'));

-- Otra's kitchen: her phone is registered and holds the channel, but nobody reserves there…
-- and a reservation at a kitchen no phone listens to queues nothing.
delete from servicio.push_token where token = public._tok('otra-1');
select public._mark() as m3 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-otra', format('select public.reserve_plate(%L, %L, 1, %L, %L, %L)', :rc, :lo,
  :'q0'::timestamptz + interval '1 hour', 'efectivo', 'llevar')) as beto_otra \gset
reset role;
set constraints public.push_reservation_made immediate;
set constraints public.push_reservation_made deferred;
select public.chk('3.10 a reservation at a kitchen no phone listens to queues nothing, and writes no row',
  :'beto_otra' = 'ok' and (select count(*) from public._queued(:m3)) = 0
  and not exists (select 1 from servicio.notification_send s join servicio.push_token t on t.id = s.token_id
                   where t.user_id = :otra),
  :'beto_otra');

-- The Vault holds Expo's access token: the next request carries it.
select vault.create_secret('prueba-0092', 'expo_push_access_token', 'the suite''s, rolled back') is not null as vaulted \gset
select public._mark() as m4 \gset
select servicio.push_send('apartados', array(select id from servicio.push_token where token = public._tok('mari-1')),
                          'Prueba', 'Prueba', '{}'::jsonb) as sent_with_key \gset
select public.chk('3.11 with the Vault holding expo_push_access_token, the request carries Authorization: Bearer and the token',
  :'sent_with_key' = 1
  and (select headers ->> 'Authorization' from public._queued(:m4)) = 'Bearer prueba-0092');

-- Wera switches the kind off for everyone: nothing is sent, and nobody is offered its switch.
update servicio.notification_kind set is_on = false where kind = 'apartados';
select public._mark() as m5 \gset
select servicio.push_send('apartados', array(select id from servicio.push_token where token = public._tok('mari-1')),
                          'Prueba', 'Prueba', '{}'::jsonb) as sent_while_off \gset
select servicio.kinds_of(:mari, 'cocina') as kinds_while_off \gset
update servicio.notification_kind set is_on = true where kind = 'apartados';
select public.chk('3.12 a kind Wera switched off sends nothing and is offered to nobody',
  :'sent_while_off' = 0 and (select count(*) from public._queued(:m5)) = 0 and :'kinds_while_off' = '[]');

-- 101 phones: two requests, 100 and 1 (Expo's limit).
insert into servicio.push_token (user_id, app, token, platform, allowed, channels)
select :mari, 'cocina', public._tok('lote-' || g), 'android', true, '{apartados}' from generate_series(1, 101) g;
select public._mark() as m6 \gset
select servicio.push_send('apartados', array(select id from servicio.push_token where token like 'ExponentPushToken[lote-%'),
                          'Prueba', 'Prueba', '{}'::jsonb) as sent_101 \gset
select public.chk('3.13 101 phones are two requests of 100 and 1, each message''s place in its own',
  :'sent_101' = 101
  and (select array_agg(jsonb_array_length(body) order by id) from public._queued(:m6)) = array[100, 1]
  and (select max(request_pos) from servicio.notification_send where request_id = (select min(id) from public._queued(:m6))) = 99);
delete from servicio.push_token where token like 'ExponentPushToken[lote-%';

-- When, as the message says it — against a calendar.
select public.chk('3.14 when: today las 20:30; tomorrow mañana a las 13:00; later el 24 de noviembre; midnight by the calendar; the kitchen''s zone',
  servicio.push_when(public._mx('2026-11-20 20:30'), 'America/Mexico_City', public._mx('2026-11-20 10:00')) = 'las 20:30'
  and servicio.push_when(public._mx('2026-11-21 13:00'), 'America/Mexico_City', public._mx('2026-11-20 10:00')) = 'mañana a las 13:00'
  and servicio.push_when(public._mx('2026-11-24 13:00'), 'America/Mexico_City', public._mx('2026-11-20 10:00')) = 'el 24 de noviembre a las 13:00'
  and servicio.push_when(public._mx('2026-11-21 00:30'), 'America/Mexico_City', public._mx('2026-11-20 23:50')) = 'mañana a las 00:30'
  and servicio.push_when(timestamptz '2026-11-21 02:00+00', 'America/Mexico_City', public._mx('2026-11-20 18:00')) = 'las 20:00'
  and servicio.push_when(timestamptz '2027-01-01 18:00+00', 'America/Mexico_City', timestamptz '2026-12-30 18:00+00') = 'el 1 de enero a las 12:00',
  servicio.push_when(public._mx('2026-11-24 13:00'), 'America/Mexico_City', public._mx('2026-11-20 10:00')));

-- A dish as the message says it, and an offer taken down: no "otra vez en oferta".
update public.reservation_line set quantity = 2 where reservation_id = :rb;
select servicio.reservation_dish(:rb) as two_plates \gset
update public.reservation_line set quantity = 1 where reservation_id = :rb;
insert into public.reservation_line (reservation_id, line_no, workspace_id, location_id, listing_line_id, quantity, unit_price)
select :rb, 2, workspace_id, location_id, listing_line_id, 1, unit_price from public.reservation_line where reservation_id = :rb and line_no = 1;
select servicio.reservation_dish(:rb) as two_lines \gset
select public.chk('3.15 the dish: 2 × Comida corrida; Comida corrida y 1 más',
  :'two_plates' = '2 × Comida corrida' and :'two_lines' = 'Comida corrida y 1 más',
  concat_ws(' | ', :'two_plates', :'two_lines'));

insert into public.reservation (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day,
                                held_until, payment, eat)
select '0092cccc-0000-4000-8000-0000000000ff', workspace_id, location_id, id, :ana, 999,
       :'q0'::timestamptz + interval '3 hours', ((:'q0'::timestamptz + interval '3 hours') at time zone 'America/Mexico_City')::date,
       pickup_end, 'tarjeta', 'llevar'
  from public.listing where id = :lm;
insert into public.reservation_line (reservation_id, line_no, workspace_id, location_id, listing_line_id, quantity, unit_price)
select '0092cccc-0000-4000-8000-0000000000ff', 1, workspace_id, location_id, listing_line_id, 1, unit_price
  from public.reservation_line where reservation_id = :ra;
update public.listing set withdrawn_at = now() where id = :lm;
select public._mark() as m7 \gset
update public.reservation set cancelled_at = now() where id = '0092cccc-0000-4000-8000-0000000000ff';
select public.chk('3.16 a cancellation on an offer taken down does not say it is back on offer',
  (select body -> 0 ->> 'body' from public._queued(:m7) order by id limit 1) not like '%otra vez en oferta%'
  and (select body -> 0 ->> 'body' from public._queued(:m7) order by id limit 1) like 'Comida corrida de %',
  (select body::text from public._queued(:m7) limit 1));
update public.listing set withdrawn_at = null where id = :lm;


-- ---- 4. Expo's answers, read back --------------------------------------------------------
-- The first request's answer: Mari's ticket ok, Cook's phone gone (in the order they were sent).
select (select t.user_id from servicio.notification_send s join servicio.push_token t on t.id = s.token_id
         where s.request_id = :req_new and s.request_pos = 0) = :mari::uuid as mari_first \gset
insert into net._http_response (id, status_code, content_type, content, timed_out, created)
values (:req_new, 200, 'application/json',
  case when :'mari_first'::boolean
       then '{"data":[{"status":"ok","id":"tick-mari"},{"status":"error","message":"\"ExponentPushToken[cook-1]\" is not a registered push notification recipient","details":{"error":"DeviceNotRegistered","expoPushToken":"ExponentPushToken[cook-1]"}}]}'
       else '{"data":[{"status":"error","message":"\"ExponentPushToken[cook-1]\" is not a registered push notification recipient","details":{"error":"DeviceNotRegistered","expoPushToken":"ExponentPushToken[cook-1]"}},{"status":"ok","id":"tick-mari"}]}'
  end, false, now());

-- Three made-up messages to Mari's phone: a request refused whole, one timed out, one never answered.
insert into servicio.notification_send (kind, token_id, message, request_id, request_pos, sent_at)
select 'apartados', id, '{"title":"x"}', r, 0, s from servicio.push_token,
       (values (900000001::bigint, now()), (900000002, now()), (900000003, now() - interval '7 hours')) v (r, s)
 where token = public._tok('mari-1');
insert into net._http_response (id, status_code, content_type, content, timed_out, error_msg, created)
values (900000001, 401, 'application/json',
        '{"errors":[{"code":"UNAUTHORIZED","message":"The bearer token is invalid."}]}', false, null, now()),
       (900000002, null, null, null, true, 'Timeout of 10000 ms reached', now());

select servicio.read_push_answers() as read1 \gset
select public.chk('4.1 tickets: Mari''s ok with its id; Cook''s DeviceNotRegistered; a request refused whole UNAUTHORIZED; one timed out; one unanswered 7 hours lost',
  (select ticket_status = 'ok' and ticket_id = 'tick-mari' from servicio.notification_send s join servicio.push_token t on t.id = s.token_id
    where s.request_id = :req_new and t.user_id = :mari)
  and (select ticket_status = 'error' and ticket_error = 'DeviceNotRegistered' from servicio.notification_send s
         join servicio.push_token t on t.id = s.token_id where s.request_id = :req_new and t.user_id = :cook)
  and (select ticket_status = 'error' and ticket_error = 'UNAUTHORIZED' from servicio.notification_send where request_id = 900000001)
  and (select ticket_status = 'error' and ticket_error = 'timeout' from servicio.notification_send where request_id = 900000002)
  and (select ticket_status = 'perdido' from servicio.notification_send where request_id = 900000003),
  :'read1');
select public.chk('4.2 a phone Expo says is gone is retired telefono_ya_no — and is sent nothing more',
  (select retired_why = 'telefono_ya_no' from servicio.push_token where token = public._tok('cook-1'))
  and not (select id from servicio.push_token where token = public._tok('cook-1'))
          = any(servicio.push_recipients(:'ws_m', 'apartados', null)));
select public.chk('4.3 no receipt is asked for a ticket under 15 minutes old',
  (select receipt_request_id is null from servicio.notification_send where ticket_id = 'tick-mari'));

-- 15 minutes on: the receipt is asked for, in one request.
update servicio.notification_send set ticket_at = now() - interval '16 minutes' where ticket_id = 'tick-mari';
insert into servicio.notification_send (kind, token_id, message, request_id, request_pos, sent_at,
                                        ticket_status, ticket_id, ticket_at)
select 'apartados', id, '{"title":"x"}', 900000004, 0, now() - interval '20 minutes', 'ok', t, now() - interval '20 minutes'
  from servicio.push_token, unnest(array['tick-wait', 'tick-gone']) t
 where token = public._tok('mari-1');
insert into servicio.notification_send (kind, token_id, message, request_id, request_pos, sent_at,
                                        ticket_status, ticket_id, ticket_at)
select 'apartados', id, '{"title":"x"}', 900000005, 0, now() - interval '25 hours', 'ok', 'tick-old', now() - interval '25 hours'
  from servicio.push_token where token = public._tok('teo-1');
select public._mark() as m8 \gset
select servicio.read_push_answers() as read2 \gset
select id as req_receipts from public._queued(:m8) \gset
select public.chk('4.4 tickets 15 minutes old: one getReceipts request naming them; a ticket of 25 hours lost, never asked',
  (select count(*) from public._queued(:m8)) = 1
  and (select url = 'https://exp.host/--/api/v2/push/getReceipts' and timeout_ms = 10000
              and (select array_agg(i order by i) from jsonb_array_elements_text(body -> 'ids') i)
                  = array['tick-gone', 'tick-mari', 'tick-wait']
         from public._queued(:m8))
  and (select count(*) from servicio.notification_send where receipt_request_id = :req_receipts) = 3
  and (select receipt_status = 'perdido' and receipt_request_id is null from servicio.notification_send where ticket_id = 'tick-old'),
  (select body::text from public._queued(:m8) limit 1));

-- Expo answers: Mari's taken by Google, one phone gone, one not ready yet.
insert into net._http_response (id, status_code, content_type, content, timed_out, created)
values (:req_receipts, 200, 'application/json',
  '{"data":{"tick-mari":{"status":"ok"},"tick-gone":{"status":"error","message":"The device cannot receive push notifications anymore","details":{"error":"DeviceNotRegistered"}}}}',
  false, now());
select servicio.read_push_answers() as read3 \gset
select public.chk('4.5 receipts: ok (handed to Apple or Google); DeviceNotRegistered; one Expo has not got yet is asked again',
  (select receipt_status = 'ok' and receipt_error is null from servicio.notification_send where ticket_id = 'tick-mari')
  and (select receipt_status = 'error' and receipt_error = 'DeviceNotRegistered' from servicio.notification_send where ticket_id = 'tick-gone')
  and (select receipt_status is null and receipt_request_id is not null and receipt_request_id <> :req_receipts
         from servicio.notification_send where ticket_id = 'tick-wait'),
  :'read3');
select public.chk('4.6 a receipt saying the phone is gone retires it, as a ticket does',
  (select retired_why = 'telefono_ya_no' from servicio.push_token where token = public._tok('mari-1')));
select public.chk('4.7 the reader answers what it did, by its five keys',
  (select array_agg(k order by k) from jsonb_object_keys(:'read3'::jsonb) k)
    = array['lost', 'receipts', 'receipts_asked', 'retired', 'tickets'], :'read3');

-- The two readers, against Expo's shapes.
select public.chk('4.8 a ticket out of a one-message answer (data as an object), a body that is not JSON, an empty data',
  (select status = 'ok' and ticket = 'abc' from servicio.expo_ticket(200, '{"data":{"status":"ok","id":"abc"}}', false, null, 0))
  and (select status = 'error' and error = 'http_502' from servicio.expo_ticket(502, '<html>bad gateway</html>', false, null, 0))
  and (select status = 'error' and error = 'no_ticket' from servicio.expo_ticket(200, '{"data":[]}', false, null, 0))
  and (select status = 'error' and error = 'MessageTooBig'
         from servicio.expo_ticket(200, '{"data":[{"status":"error","message":"too big","details":{"error":"MessageTooBig"}}]}', false, null, 0))
  and (select status is null from servicio.expo_receipt(500, '{}', 'abc'))
  and (select status is null from servicio.expo_receipt(200, 'not json', 'abc')));


-- ---- 5. What is forgotten ----------------------------------------------------------------
insert into servicio.push_token (user_id, app, token, platform, allowed, retired_at, retired_why)
values (:luz, 'cocina', public._tok('luz-old'), 'android', true, now() - interval '31 days', 'cerro_sesion'),
       (:luz, 'cocina', public._tok('luz-recent'), 'android', true, now() - interval '29 days', 'cerro_sesion');
insert into servicio.notification_send (kind, token_id, message, sent_at)
select 'apartados', id, '{"title":"viejo"}', now() - interval '31 days' from servicio.push_token where token = public._tok('luz-1');
insert into servicio.notification_send (kind, token_id, message, sent_at)
select 'apartados', id, '{"title":"reciente"}', now() - interval '29 days' from servicio.push_token where token = public._tok('luz-1');
select servicio.forget_old_pushes() as forgot \gset
select public.chk('5.1 each night: a message''s row 30 days on, a retired token 30 days on; younger kept, live tokens and the taps kept',
  not exists (select 1 from servicio.notification_send where message ->> 'title' = 'viejo')
  and exists (select 1 from servicio.notification_send where message ->> 'title' = 'reciente')
  and not exists (select 1 from servicio.push_token where token = public._tok('luz-old'))
  and exists (select 1 from servicio.push_token where token = public._tok('luz-recent'))
  and exists (select 1 from servicio.push_token where token = public._tok('luz-1') and retired_at is null)
  and exists (select 1 from servicio.notification_tap_count where kind = 'apartados')
  and (:'forgot'::jsonb ->> 'sends')::int >= 1 and (:'forgot'::jsonb ->> 'tokens')::int >= 1,
  :'forgot');

insert into cron.job_run_details (jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time)
values (0, 9200001, 0, 'postgres', 'postgres', 'select 1', 'succeeded', '1 row', now() - interval '8 days', now() - interval '8 days'),
       (0, 9200002, 0, 'postgres', 'postgres', 'select 1', 'succeeded', '1 row', now() - interval '6 days', now() - interval '6 days');
select servicio.trim_cron_history() as trimmed \gset
select public.chk('5.2 pg_cron''s history: a run over 7 days old deleted, one under kept',
  not exists (select 1 from cron.job_run_details where runid = 9200001)
  and exists (select 1 from cron.job_run_details where runid = 9200002)
  and :'trimmed'::int >= 1, :'trimmed');

delete from auth.users where id = :teo;
select public.chk('5.3 her account deleted: her tokens, her switch and their messages go with it',
  not exists (select 1 from servicio.push_token where user_id = :teo)
  and not exists (select 1 from servicio.notification_switch where user_id = :teo)
  and not exists (select 1 from servicio.notification_send where ticket_id = 'tick-old'));


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
