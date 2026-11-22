-- ============================================================================
-- 0094 — the services' messages, in the database (`10.9h-i`; built ahead of his
-- analyst's answers as settings — the owner's ruling of 2026-11-20).
--
-- ⚠️ WHAT IS SENT IS READ OFF pg_net's OWN QUEUE (`net.http_request_queue`), as `0092`'s
-- and `0093`'s suites do. This file is ONE TRANSACTION THAT ROLLS BACK: nothing reaches
-- Expo.
-- ⚠️ THE JOB IS CALLED WITH ITS MOMENT (`send_due_notices(p_now)`): every moment below is
-- a local time in Mexico City on day D (tomorrow) or later, so the hours, the day and the
-- hold are read against the moment given, never the clock. A message queued now is due
-- at any later moment.
--
-- Section 1 the shape. Section 2 the bell. Section 3 a promotion's alert. Section 4
-- ¡Ganaste!. Section 5 the stamps' reminder. Section 6 a card closing. Section 7 a
-- kitchen leaving. Section 8 the first offer's nudge. Section 9 her switches and taps.
-- Section 10 what is forgotten.
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

-- A statement as one person: its answer as text, 'ok' for none, or ERR:<sqlstate>.
create function public._as(p_user uuid, p_sql text)
returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims',
    case when p_user is null then '' else format('{"sub":"%s","role":"authenticated"}', p_user) end, true);
  if p_user is null then set local role anon; else set local role authenticated; end if;
  begin
    execute p_sql into v;
  exception when others then
    reset role;
    return 'ERR:' || sqlstate;
  end;
  reset role;
  return coalesce(nullif(v, ''), 'ok');
end;
$$;

-- An answer as JSON, or NULL when it is a refusal — so a check reads it and never aborts.
create function public._j(p text) returns jsonb language plpgsql immutable as $$
begin
  return p::jsonb;
exception when others then
  return null;
end;
$$;
create function public._tok(p text) returns text language sql immutable as $$
  select 'ExponentPushToken[' || p || ']'
$$;
create function public._mx(p text) returns timestamptz language sql immutable as $$
  select (p::timestamp) at time zone 'America/Mexico_City'
$$;
create function public._mark() returns bigint language sql as $$
  select coalesce(max(id), 0) from net.http_request_queue
$$;
-- Every message to one phone queued after a mark, in order.
create function public._to(p_after bigint, p_tok text)
returns jsonb language sql as $$
  select coalesce(jsonb_agg(x.m order by q.id, x.n), '[]'::jsonb)
    from net.http_request_queue q,
         jsonb_array_elements(convert_from(q.body, 'UTF8')::jsonb) with ordinality as x (m, n)
   where q.id > p_after and q.url = 'https://exp.host/--/api/v2/push/send' and x.m ->> 'to' = p_tok
$$;
-- How a notice ended: sent, pending, the reason it was dropped, or none.
create function public._end(p_user uuid, p_kind text, p_about text)
returns text language sql as $$
  select coalesce((select case when x.sent_at is not null then 'sent'
                               when x.dropped_at is not null then x.dropped_why
                               else 'pending' end
                     from servicio.notice x
                    where x.user_id = p_user and x.kind = p_kind and x.about = p_about), 'none')
$$;
-- A publication, written as `publish_listing` writes it (whose window rules would refuse
-- tomorrow's): the trigger fires on the row, whoever wrote it.
create function public._pub(p_id uuid, p_ws uuid, p_start timestamptz, p_end timestamptz, p_name text, p_price numeric)
returns void language sql as $$
  insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by)
  select p_id, p_ws, l.id, p_start, p_end,
         (select m.user_id from public.workspace_member m where m.workspace_id = p_ws and m.role = 'owner' limit 1)
    from public.location l where l.workspace_id = p_ws order by l.created_at limit 1;
  insert into public.listing_line (id, listing_id, workspace_id, location_id, line_no, name, unit_price, quantity)
  select gen_random_uuid(), l.id, l.workspace_id, l.location_id, 1, p_name, p_price, 5
    from public.listing l where l.id = p_id;
$$;
create function public._reg(p_user uuid, p_app text, p_tok text, p_platform text, p_channels text[])
returns text language sql as $$
  select public._as(p_user, format('select public.register_push_token(p_app => %L, p_token => %L, p_platform => %L, p_allowed => true, p_channels => %L)',
                                   p_app, p_tok, p_platform, p_channels))
$$;

\set mari '''0094aaaa-0000-4000-8000-000000000001'''
\set cook '''0094aaaa-0000-4000-8000-000000000002'''
\set lupe '''0094aaaa-0000-4000-8000-000000000003'''
\set gil  '''0094aaaa-0000-4000-8000-000000000004'''
\set ana  '''0094aaaa-0000-4000-8000-000000000005'''
\set beto '''0094aaaa-0000-4000-8000-000000000006'''
\set caro '''0094aaaa-0000-4000-8000-000000000007'''
\set dani '''0094aaaa-0000-4000-8000-000000000008'''
\set eli  '''0094aaaa-0000-4000-8000-000000000009'''
\set fer  '''0094aaaa-0000-4000-8000-00000000000a'''
\set hugo '''0094aaaa-0000-4000-8000-00000000000b'''
\set ines '''0094aaaa-0000-4000-8000-00000000000c'''
\set juan '''0094aaaa-0000-4000-8000-00000000000d'''
\set nico '''0094aaaa-0000-4000-8000-00000000000e'''
\set olga '''0094aaaa-0000-4000-8000-00000000000f'''
\set l0 '''0094bbbb-0000-4000-8000-000000000000'''
\set l1 '''0094bbbb-0000-4000-8000-000000000001'''
\set l2 '''0094bbbb-0000-4000-8000-000000000002'''
\set l3 '''0094bbbb-0000-4000-8000-000000000003'''
\set l4 '''0094bbbb-0000-4000-8000-000000000004'''
\set l6 '''0094bbbb-0000-4000-8000-000000000006'''
\set l7 '''0094bbbb-0000-4000-8000-000000000007'''
\set l8 '''0094bbbb-0000-4000-8000-000000000008'''
\set l9 '''0094bbbb-0000-4000-8000-000000000009'''
\set la '''0094bbbb-0000-4000-8000-00000000000a'''
\set lo '''0094bbbb-0000-4000-8000-00000000000f'''
\set p1 '''0094cccc-0000-4000-8000-000000000001'''
\set p2 '''0094cccc-0000-4000-8000-000000000002'''
\set p3 '''0094cccc-0000-4000-8000-000000000003'''

insert into auth.users (id, email, raw_user_meta_data)
select u.id::uuid, u.who || '.0094@example.mx', jsonb_build_object('full_name', initcap(u.who) || ' 0094')
  from (values (:mari, 'mari'), (:cook, 'cook'), (:lupe, 'lupe'), (:gil, 'gil'), (:ana, 'ana'), (:beto, 'beto'),
               (:caro, 'caro'), (:dani, 'dani'), (:eli, 'eli'), (:fer, 'fer'), (:hugo, 'hugo'), (:ines, 'ines'),
               (:juan, 'juan'), (:nico, 'nico'), (:olga, 'olga')) as u (id, who);

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset
select ((now() at time zone 'America/Mexico_City')::date + 1)::text as d  \gset
select ((now() at time zone 'America/Mexico_City')::date + 2)::text as d1 \gset
select ((now() at time zone 'America/Mexico_City')::date + 3)::text as d2 \gset
select ((now() at time zone 'America/Mexico_City')::date + 4)::text as d3 \gset
select ((now() at time zone 'America/Mexico_City')::date + 5)::text as d4 \gset

-- Three kitchens: Mari's (Cook works there), Lupe's, Gil's.
select public._as(:mari, $q$ select public.onboard_workspace(p_display_name => 'Fonda Doña Mari 0094', p_kind => 'cocina') $q$) as ws_m \gset
select public._as(:lupe, $q$ select public.onboard_workspace(p_display_name => 'Cocina Lupe 0094', p_kind => 'cocina') $q$) as ws_l \gset
select public._as(:gil,  $q$ select public.onboard_workspace(p_display_name => 'El Güero 0094', p_kind => 'cocina') $q$) as ws_g \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name, is_active)
values (:'ws_m', :cook, 'staff', 'Cook 0094', true);
select id as loc_m from public.location where workspace_id = :'ws_m' \gset

-- The neighbours' Itacate phones: every channel the new kinds use — but Dani's, which has
-- not made `cocinas` or `ofertas`; Caro has no phone; Ines has an iPhone (no channels).
select concat_ws(',',
  public._reg(:ana,  'itacate', public._tok('ana'),  'android', '{cocinas,tarjetas,ofertas}'),
  public._reg(:beto, 'itacate', public._tok('beto'), 'android', '{cocinas,tarjetas,ofertas}'),
  public._reg(:dani, 'itacate', public._tok('dani'), 'android', '{tarjetas}'),
  public._reg(:eli,  'itacate', public._tok('eli'),  'android', '{cocinas,tarjetas,ofertas}'),
  public._reg(:fer,  'itacate', public._tok('fer'),  'android', '{cocinas,tarjetas,ofertas}'),
  public._reg(:hugo, 'itacate', public._tok('hugo'), 'android', '{cocinas,tarjetas,ofertas}'),
  public._reg(:ines, 'itacate', public._tok('ines'), 'ios', '{}'),
  public._reg(:juan, 'itacate', public._tok('juan'), 'android', '{cocinas,tarjetas,ofertas}'),
  public._reg(:cook, 'itacate', public._tok('cook'), 'android', '{cocinas,tarjetas,ofertas}')) as phones \gset


-- ---- 1. The shape ---------------------------------------------------------------------------
select public.chk('1.1 the notice table lives in servicio, and no client role holds a right on it',
  exists (select 1 from pg_class where relnamespace = 'servicio'::regnamespace and relname = 'notice' and relkind = 'r')
  and not exists (select 1 from unnest(array['anon', 'authenticated']) r, unnest(array['select', 'insert', 'update', 'delete']) p
                   where has_table_privilege(r, 'servicio.notice', p)));
select public.chk('1.2 each moment a kind with its class, its channel and its default — the recommendations: the bell on request, held 60 minutes; the alert a promotion, dark; ¡Ganaste!, the reminder (7 days before, 11:00) and the card''s changes service; the nudge Wera Cocina''s, 12:00 on the second day',
  (select count(*) from servicio.notification_kind where kind in ('publico', 'promocion_cocina', 'premio', 'sellos', 'tarjeta_cambio', 'primera_oferta')) = 6
  and (select app = 'itacate' and class = 'a_pedido' and channel = 'cocinas' and is_on and default_on and hold_minutes = 60 and opens = 'cocina'
         from servicio.notification_kind where kind = 'publico')
  and (select app = 'itacate' and class = 'promocion' and channel = 'ofertas' and not is_on and not default_on and hold_minutes is null
         from servicio.notification_kind where kind = 'promocion_cocina')
  and (select bool_and(app = 'itacate' and class = 'servicio' and channel = 'tarjetas' and is_on and default_on)
         from servicio.notification_kind where kind in ('premio', 'sellos', 'tarjeta_cambio'))
  and (select days_before = 7 and send_at = '11:00' and min_days is null from servicio.notification_kind where kind = 'sellos')
  and (select app = 'cocina' and class = 'servicio' and channel = 'primera_oferta' and is_on and send_at = '12:00' and on_day = 2 and opens = 'publicar'
         from servicio.notification_kind where kind = 'primera_oferta'));
select public.chk('1.3 the two doors answer a signed-in person and nobody signed out; the job, its gate, its helpers and the triggers'' functions are granted to nobody',
  (select bool_and(has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.promotion_alert_offered(uuid)', 'public.alert_promotion(uuid, uuid)']) f)
  and (select bool_and(not has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['servicio.send_due_notices(timestamptz)', 'servicio.queue_timed_notices(timestamptz)',
                       'servicio.notice_gate(bigint, timestamptz)', 'servicio.notice_still_true(bigint, timestamptz)',
                       'servicio.promotions_sent(uuid, text, date, date, text)', 'servicio.card_holders(uuid, timestamptz)',
                       'servicio.listing_words(uuid, timestamptz)', 'servicio.day_words(date)', 'servicio.days_words(smallint[])',
                       'servicio.pesos(numeric)', 'servicio.names_words(text[])', 'servicio.gone_words(integer, integer)',
                       'servicio.notice_publication()', 'servicio.notice_reward()', 'servicio.notice_card_closed()',
                       'servicio.notice_kitchen_leaves()', 'servicio.push_send(text, uuid[], text, text, jsonb)',
                       'servicio.send_due_campaigns(timestamptz)', 'servicio.forget_old_pushes()']) f));
select public.chk('1.4 the job each minute, send-notices; the four moments'' triggers in place',
  exists (select 1 from cron.job where jobname = 'send-notices' and schedule = '* * * * *'
                                   and command = 'select servicio.send_due_notices()')
  and (select count(*) from pg_trigger where tgname in ('notice_publication', 'notice_reward', 'notice_card_closed', 'notice_kitchen_leaves')
                                       and not tgisinternal) = 4);


-- ---- 2. The bell ----------------------------------------------------------------------------
-- Ana rings all three kitchens' bells and follows them; Beto follows Mari with no bell;
-- Caro, Dani, Eli, Juan and Cook (who works there) ring Mari's; Eli turns the whole kind off.
select concat_ws(',',
  public._as(:ana,  format('select public.set_my_follow(%L, true, true)', :'ws_m')),
  public._as(:ana,  format('select public.set_my_follow(%L, true, true)', :'ws_l')),
  public._as(:ana,  format('select public.set_my_follow(%L, true, true)', :'ws_g')),
  public._as(:beto, format('select public.set_my_follow(%L, true, false)', :'ws_m')),
  public._as(:caro, format('select public.set_my_follow(%L, p_bell => true)', :'ws_m')),
  public._as(:dani, format('select public.set_my_follow(%L, p_bell => true)', :'ws_m')),
  public._as(:eli,  format('select public.set_my_follow(%L, p_bell => true)', :'ws_m')),
  public._as(:juan, format('select public.set_my_follow(%L, p_bell => true)', :'ws_m')),
  public._as(:cook, format('select public.set_my_follow(%L, p_bell => true)', :'ws_m'))) is not null as follows \gset
select public._as(:eli, $q$ select public.set_notification_switch('publico', false) $q$) as eli_off \gset

-- Mari publishes, the production way.
select public._as(:mari, format($q$ select public.publish_listing(%L, %L, %L, %L, '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 10}]'::jsonb) $q$,
  :l0, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours')) as published \gset
select public.chk('2.1 she publishes: one notice for each who rang the bell — Ana, Caro, Dani, Eli, Juan — and none for Beto (no bell) or Cook (she works there); its words wait for it to go',
  :'published' not like 'ERR:%'
  and (select array_agg(split_part(u.email, '.', 1) order by u.email) from servicio.notice x join auth.users u on u.id = x.user_id
        where x.about = 'listing:' || :l0) = '{ana,caro,dani,eli,juan}'
  and (select bool_and(x.kind = 'publico' and x.title is null and x.workspace_id = :'ws_m'::uuid and x.kitchen_name = 'Fonda Doña Mari 0094')
         from servicio.notice x where x.about = 'listing:' || :l0),
  :'published');

select public._as(:juan, format('select public.set_my_follow(%L, p_bell => false)', :'ws_m')) as juan_off \gset
select public._mark() as m1 \gset
select servicio.send_due_notices(now()) as run1 \gset
select 'Comida corrida $65 · de ' || to_char(:'q0'::timestamptz at time zone 'America/Mexico_City', 'HH24:MI')
       || ' a ' || to_char((:'q0'::timestamptz + interval '4 hours') at time zone 'America/Mexico_City', 'HH24:MI') as body_l0 \gset
select public.chk('2.2 the job sends Ana one message: Fonda Doña Mari publicó · the dish, its price, its window — on cocinas, priority normal; a tap opens the kitchen''s page',
  jsonb_array_length(public._to(:m1, public._tok('ana'))) = 1
  and (select m ->> 'title' = 'Fonda Doña Mari 0094 publicó' and m ->> 'body' = :'body_l0'
              and m ->> 'channelId' = 'cocinas' and m ->> 'priority' = 'normal' and m ->> 'sound' = 'default'
              and m -> 'data' = jsonb_build_object('kind', 'publico', 'opens', 'cocina', 'opens_id', :'ws_m')
         from jsonb_array_elements(public._to(:m1, public._tok('ana'))) m),
  public._to(:m1, public._tok('ana'))::text);
select public.chk('2.3 the others: Eli switched the kind off, Caro has no phone, Dani''s has not made the channel, Juan put his bell down — and nothing reached Beto or Cook',
  public._end(:eli, 'publico', 'listing:' || :l0) = 'su_switch'
  and public._end(:caro, 'publico', 'listing:' || :l0) = 'sin_telefono'
  and public._end(:dani, 'publico', 'listing:' || :l0) = 'sin_telefono'
  and public._end(:juan, 'publico', 'listing:' || :l0) = 'ya_no'
  and public._to(:m1, public._tok('beto')) = '[]' and public._to(:m1, public._tok('cook')) = '[]'
  and public._to(:m1, public._tok('dani')) = '[]' and public._to(:m1, public._tok('eli')) = '[]',
  concat_ws(',', public._end(:eli, 'publico', 'listing:' || :l0), public._end(:caro, 'publico', 'listing:' || :l0),
            public._end(:dani, 'publico', 'listing:' || :l0), public._end(:juan, 'publico', 'listing:' || :l0), :'run1'));

-- Day D: Lupe at 12:00 goes alone; Gil at 12:10 and Mari at 12:30 wait for 13:00 and go as one.
select public._pub(:l1, :'ws_l', public._mx(:'d' || ' 11:00'), public._mx(:'d' || ' 20:00'), 'Mole con arroz', 70);
select public._mark() as m2 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 12:00')) as run2 \gset
select public.chk('2.4 the next day, Lupe''s goes alone — her window that day, no word of the day',
  (select m ->> 'title' = 'Cocina Lupe 0094 publicó' and m ->> 'body' = 'Mole con arroz $70 · de 11:00 a 20:00'
     from jsonb_array_elements(public._to(:m2, public._tok('ana'))) m)
  and jsonb_array_length(public._to(:m2, public._tok('ana'))) = 1,
  public._to(:m2, public._tok('ana'))::text);
select public._pub(:l2, :'ws_g', public._mx(:'d' || ' 13:00'), public._mx(:'d' || ' 19:00'), 'Tacos de guisado', 55.5);
select public._mark() as m3 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 12:10')) as run3 \gset
select public._pub(:l3, :'ws_m', public._mx(:'d' || ' 13:00'), public._mx(:'d' || ' 18:00'), 'Pozole', 80);
select servicio.send_due_notices(public._mx(:'d' || ' 12:30')) as run4 \gset
select public.chk('2.5 within the hour of her last, Gil''s and Mari''s wait — until 13:00, an hour after it — and nothing is sent',
  public._to(:m3, public._tok('ana')) = '[]'
  and (select bool_and(x.due_at = public._mx(:'d' || ' 12:00') + interval '60 minutes' and x.sent_at is null and x.dropped_at is null)
         from servicio.notice x where x.user_id = :ana and x.about in ('listing:' || :l2, 'listing:' || :l3)),
  concat_ws(' ', :'run3', :'run4'));
select public._mark() as m4 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 13:00')) as run5 \gset
select public.chk('2.6 at 13:00 they go as ONE: Publicaron 2 cocinas que sigues · El Güero y Fonda Doña Mari; a tap opens Mis cocinas',
  jsonb_array_length(public._to(:m4, public._tok('ana'))) = 1
  and (select m ->> 'title' = 'Publicaron 2 cocinas que sigues' and m ->> 'body' = 'El Güero 0094 y Fonda Doña Mari 0094'
              and m -> 'data' = '{"kind": "publico", "opens": "mis_cocinas"}'::jsonb and m ->> 'channelId' = 'cocinas'
         from jsonb_array_elements(public._to(:m4, public._tok('ana'))) m)
  and public._end(:ana, 'publico', 'listing:' || :l2) = 'sent' and public._end(:ana, 'publico', 'listing:' || :l3) = 'sent',
  public._to(:m4, public._tok('ana'))::text);

select public._pub(:l4, :'ws_l', public._mx(:'d' || ' 15:00'), public._mx(:'d' || ' 21:00'), 'Mole', 70);
select servicio.send_due_notices(public._mx(:'d' || ' 14:05')) as run6 \gset
select public.chk('2.7 one a kitchen a day: Lupe publishes again on D, and Ana is not told twice (ya_hoy)',
  public._end(:ana, 'publico', 'listing:' || :l4) = 'ya_hoy', public._end(:ana, 'publico', 'listing:' || :l4));

-- D1: Mari publishes twice in the same minute; Lupe publishes and takes it down.
select public._pub(:l6, :'ws_m', public._mx(:'d1' || ' 13:00'), public._mx(:'d1' || ' 17:00'), 'Comida corrida', 65);
select public._pub(:l7, :'ws_m', public._mx(:'d1' || ' 13:00'), public._mx(:'d1' || ' 17:00'), 'Agua de jamaica', 20);
select public._pub(:l8, :'ws_l', public._mx(:'d1' || ' 13:00'), public._mx(:'d1' || ' 17:00'), 'Mole', 70);
update public.listing set withdrawn_at = now() where id = :l8;
select public._mark() as m5 \gset
select servicio.send_due_notices(public._mx(:'d1' || ' 12:00')) as run7 \gset
select public.chk('2.8 two of one kitchen''s at once are one message naming it once (the other en_el_mismo); an offer taken down before it goes is not announced (ya_no)',
  jsonb_array_length(public._to(:m5, public._tok('ana'))) = 1
  and (select m ->> 'title' = 'Fonda Doña Mari 0094 publicó' and m ->> 'body' like 'Comida corrida $65 · de 13:00 a 17:00'
         from jsonb_array_elements(public._to(:m5, public._tok('ana'))) m)
  and public._end(:ana, 'publico', 'listing:' || :l6) = 'sent' and public._end(:ana, 'publico', 'listing:' || :l7) = 'en_el_mismo'
  and public._end(:ana, 'publico', 'listing:' || :l8) = 'ya_no',
  public._to(:m5, public._tok('ana'))::text);

update servicio.notification_kind set is_on = false where kind = 'publico';
select public._pub(:l9, :'ws_g', public._mx(:'d2' || ' 13:00'), public._mx(:'d2' || ' 17:00'), 'Tacos', 55);
update servicio.notification_kind set is_on = true where kind = 'publico';
select public._pub(:la, :'ws_g', public._mx(:'d2' || ' 14:00'), public._mx(:'d2' || ' 18:00'), 'Tacos', 55);
update servicio.notification_kind set is_on = false where kind = 'publico';
select servicio.send_due_notices(public._mx(:'d2' || ' 12:00')) as run8 \gset
update servicio.notification_kind set is_on = true where kind = 'publico';
select public.chk('2.9 Wera''s switch for the kind: off, a publication queues nothing; turned off after it was queued, it goes nowhere (apagado)',
  public._end(:ana, 'publico', 'listing:' || :l9) = 'none' and public._end(:ana, 'publico', 'listing:' || :la) = 'apagado',
  concat_ws(',', public._end(:ana, 'publico', 'listing:' || :l9), public._end(:ana, 'publico', 'listing:' || :la)));


-- ---- 3. A promotion's alert -----------------------------------------------------------------
update servicio.feature_switch set is_on = true where name = 'promociones';
select (servicio.kitchen_today(:'ws_m') + 14) as p_ends \gset
select public._as(:mari, format($q$ select public.create_promotion(%L, %L, 'dia', 'Jueves pozolero', 'Pozole rojo o verde, grande, con tostadas.', null, '{4}', %L, 'Mientras haya.') $q$,
  :'ws_m', :p1, :'p_ends')) as made_p1 \gset
select public._as(:lupe, format($q$ select public.create_promotion(%L, %L, 'nuevo', 'Enchiladas potosinas', null, null, '{1,2,3,4,5,6,7}', %L, 'Mientras haya.') $q$,
  :'ws_l', :p2, :'p_ends')) as made_p2 \gset
select public._as(:gil, format($q$ select public.create_promotion(%L, %L, 'temporada', 'Romeritos con mole', null, null, '{5,6}', %L, 'Mientras haya.') $q$,
  :'ws_g', :p3, :'p_ends')) as made_p3 \gset

select concat_ws(',',
  public._as(:mari, format('select public.promotion_alert_offered(%L)', :'ws_m')),
  public._as(:cook, format('select public.promotion_alert_offered(%L)', :'ws_m')),
  public._as(:ana,  format('select public.promotion_alert_offered(%L)', :'ws_m')),
  public._as(:mari, format('select public.alert_promotion(%L, %L)', :'ws_m', :p1))) as dark \gset
select public.chk('3.1 dark until she rules: not offered (to the owner and her helper alike; a stranger is refused), and announcing does nothing',
  :'made_p1' not like 'ERR:%' and :'made_p2' not like 'ERR:%' and :'made_p3' not like 'ERR:%'
  and :'dark' = 'false,false,ERR:42501,{"alerted": false, "offered": false}'
  and not exists (select 1 from servicio.notice where kind = 'promocion_cocina'),
  :'dark');

update servicio.notification_kind set is_on = true where kind = 'promocion_cocina';
select concat_ws(',',
  public._as(:mari, format('select public.promotion_alert_offered(%L)', :'ws_m')),
  public._as(:cook, format('select public.alert_promotion(%L, %L)', :'ws_m', :p1)),
  public._as(null,  format('select public.alert_promotion(%L, %L)', :'ws_m', :p1)),
  public._as(:mari, format('select public.alert_promotion(%L, %L)', :'ws_m', :p2)),
  public._as(:mari, format('select public.alert_promotion(%L, %L)', :'ws_m', :p1)),
  public._as(:mari, format('select public.alert_promotion(%L, %L)', :'ws_m', :p1))) as lit \gset
select public.chk('3.2 on: offered; refused to her helper and to nobody signed in (42501) and for another kitchen''s promotion (22023); the owner''s alert queues one for each who follows or rings the bell — not her helper — and again is the same one',
  :'lit' = 'true,ERR:42501,ERR:42501,ERR:22023,{"alerted": true, "offered": true},{"alerted": true, "offered": true}'
  and (select array_agg(split_part(u.email, '.', 1) order by u.email) from servicio.notice x join auth.users u on u.id = x.user_id
        where x.about = 'promotion:' || :p1) = '{ana,beto,caro,dani,eli}',
  :'lit');
select public.chk('3.3 its words, the drawing''s: Fonda Doña Mari: Jueves pozolero · what more she wrote, its days, its last day',
  (select bool_and(x.title = 'Fonda Doña Mari 0094: Jueves pozolero'
                   and x.body = 'Pozole rojo o verde, grande, con tostadas. Los jueves, hasta el ' || servicio.day_words(:'p_ends'::date) || '.'
                   and x.data = jsonb_build_object('kind', 'promocion_cocina', 'opens', 'mis_cocinas', 'opens_id', :'ws_m'))
     from servicio.notice x where x.about = 'promotion:' || :p1),
  (select x.body from servicio.notice x where x.about = 'promotion:' || :p1 limit 1));

-- The analyst's words approved; Ana and Eli say yes, Ines too; Eli had a campaign at 09:30 on D2.
insert into servicio.consent_words (words, app, purposes, shown_on, body) values
  ('itacate-hoja-0094', 'itacate', '{promociones,medir_promociones}', 'hoja', '¿Te avisamos de ofertas?');
select concat_ws(',',
  public._as(:ana,  $q$ select public.set_my_consent('itacate-hoja-0094', true) $q$),
  public._as(:eli,  $q$ select public.set_my_consent('itacate-hoja-0094', true) $q$),
  public._as(:ines, $q$ select public.set_my_consent('itacate-hoja-0094', true) $q$)) is not null as yeses \gset
insert into servicio.campaign (app, kind, audience, starts_at, expires_at, window_hours, held_out, opens, launched_at, tested_at)
values ('itacate', 'ofertas', 'todos', public._mx(:'d2' || ' 00:00'), public._mx(:'d3' || ' 23:00'), 24, 0, 'cerca', now(), now())
returning id as c1 \gset
insert into servicio.campaign_variant (campaign_id, variant, weight, title, body) values (:c1, 'A', 100, 'Para la cena', 'Aparta y pasa a tu hora.');
insert into servicio.campaign_member (campaign_id, user_id, variant, measured, joined_at, sent_at)
values (:c1, :eli, 'A', true, public._mx(:'d2' || ' 09:00'), public._mx(:'d2' || ' 09:30'));

select public._mark() as m6 \gset
select servicio.send_due_notices(public._mx(:'d2' || ' 08:30')) as run9 \gset
select public.chk('3.4 at 08:30, outside the hours: Ana''s and Eli''s wait; those who never said yes are dropped (sin_si) — nothing sent',
  public._end(:ana, 'promocion_cocina', 'promotion:' || :p1) = 'pending' and public._end(:eli, 'promocion_cocina', 'promotion:' || :p1) = 'pending'
  and public._end(:beto, 'promocion_cocina', 'promotion:' || :p1) = 'sin_si' and public._end(:caro, 'promocion_cocina', 'promotion:' || :p1) = 'sin_si'
  and public._end(:dani, 'promocion_cocina', 'promotion:' || :p1) = 'sin_si'
  and public._to(:m6, public._tok('ana')) = '[]',
  :'run9');
select public._mark() as m7 \gset
select servicio.send_due_notices(public._mx(:'d2' || ' 10:00')) as run10 \gset
select public.chk('3.5 at 10:00 Ana''s goes — on ofertas, priority normal, a tap opens Mis cocinas; Eli''s waits: her one promotion of the day was a campaign''s',
  jsonb_array_length(public._to(:m7, public._tok('ana'))) = 1
  and (select m ->> 'title' = 'Fonda Doña Mari 0094: Jueves pozolero' and m ->> 'channelId' = 'ofertas' and m ->> 'priority' = 'normal'
         from jsonb_array_elements(public._to(:m7, public._tok('ana'))) m)
  and public._end(:eli, 'promocion_cocina', 'promotion:' || :p1) = 'pending' and public._to(:m7, public._tok('eli')) = '[]',
  public._to(:m7, public._tok('ana'))::text);

update servicio.notification_kind set is_on = true where kind = 'ofertas';
select servicio.send_due_campaigns(public._mx(:'d2' || ' 18:00')) as camp1 \gset
select public.chk('3.6 and the other way: the campaign at 18:00 takes Ana in and does not send — her one of the day was the alert',
  exists (select 1 from servicio.campaign_member where campaign_id = :c1 and user_id = :ana and sent_at is null),
  :'camp1');
select public._mark() as m8 \gset
select servicio.send_due_notices(public._mx(:'d3' || ' 10:00')) as run11 \gset
select servicio.send_due_campaigns(public._mx(:'d3' || ' 10:00')) as camp2 \gset
select public.chk('3.7 the next day, Eli''s alert goes, and the campaign reaches Ana — and not Eli, whose one of that day was the alert',
  public._end(:eli, 'promocion_cocina', 'promotion:' || :p1) = 'sent'
  and (select sent_at = public._mx(:'d3' || ' 10:00') from servicio.campaign_member where campaign_id = :c1 and user_id = :ana)
  and (select sent_at = public._mx(:'d2' || ' 09:30') from servicio.campaign_member where campaign_id = :c1 and user_id = :eli),
  concat_ws(' ', :'run11', :'camp2'));
update servicio.notification_kind set is_on = false where kind = 'ofertas';

-- Ines follows Lupe; Lupe announces her promotion, then ends it before it goes.
select public._as(:ines, format('select public.set_my_follow(%L, true, false)', :'ws_l')) is not null as ines_f \gset
select public._as(:lupe, format('select public.alert_promotion(%L, %L)', :'ws_l', :p2)) as lupe_alert \gset
select public._as(:lupe, format('select public.end_promotion(%L, %L)', :'ws_l', :p2)) is not null as ended \gset
select servicio.send_due_notices(public._mx(:'d4' || ' 10:00')) as run12 \gset
select public.chk('3.8 a promotion ended before its alert went is not announced (ya_no)',
  public._end(:ines, 'promocion_cocina', 'promotion:' || :p2) = 'ya_no', public._end(:ines, 'promocion_cocina', 'promotion:' || :p2));

-- Her answer as an UPDATE: the alert only to those who rang the bell, as the drawing reads.
update servicio.notification_kind set class = 'a_pedido', default_on = true where kind = 'promocion_cocina';
select concat_ws(',',
  public._as(:hugo, format('select public.set_my_follow(%L, true, true)', :'ws_g')),
  public._as(:juan, format('select public.set_my_follow(%L, true, false)', :'ws_g'))) is not null as gil_f \gset
select public._as(:gil, format('select public.alert_promotion(%L, %L)', :'ws_g', :p3)) as gil_alert \gset
select public._mark() as m9 \gset
select servicio.send_due_notices(public._mx(:'d4' || ' 21:30')) as run13 \gset
update servicio.notification_kind set class = 'promocion', default_on = false where kind = 'promocion_cocina';
select public.chk('3.9 the class is a setting: made on request, it goes to Hugo — who rang the bell and never said yes — at 21:30, and not to Juan, who follows with no bell (sin_campana)',
  public._end(:hugo, 'promocion_cocina', 'promotion:' || :p3) = 'sent'
  and jsonb_array_length(public._to(:m9, public._tok('hugo'))) = 1
  and public._end(:juan, 'promocion_cocina', 'promotion:' || :p3) = 'sin_campana',
  concat_ws(',', public._end(:hugo, 'promocion_cocina', 'promotion:' || :p3), public._end(:juan, 'promocion_cocina', 'promotion:' || :p3), :'run13'));
update servicio.notification_kind set is_on = false where kind = 'promocion_cocina';


-- ---- 4. ¡Ganaste! ---------------------------------------------------------------------------
insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by)
values (:'ws_m', 'Una comida gratis', 4, 30, :mari) returning id as t_m \gset
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
values (:'ws_m', :fer, :'t_m', 'Una comida gratis', now()) returning id as r_fer \gset
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
values (:'ws_m', :hugo, :'t_m', 'Una comida gratis', now()) returning id as r_hugo \gset
update servicio.card_reward set claimed_at = now(), claimed_by = :mari, claimed_via = 'su_codigo' where id = :'r_hugo';
select public._mark() as m10 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 09:00')) as run14 \gset
select public.chk('4.1 her last stamp: ¡Ganaste Una comida gratis! · En Fonda Doña Mari. Cóbralo cuando quieras. — on tarjetas; a tap opens her card',
  jsonb_array_length(public._to(:m10, public._tok('fer'))) = 1
  and (select m ->> 'title' = '¡Ganaste Una comida gratis!' and m ->> 'body' = 'En Fonda Doña Mari 0094. Cóbralo cuando quieras.'
              and m ->> 'channelId' = 'tarjetas' and m ->> 'priority' = 'normal'
              and m -> 'data' = jsonb_build_object('kind', 'premio', 'opens', 'tarjeta', 'opens_id', :'ws_m')
         from jsonb_array_elements(public._to(:m10, public._tok('fer'))) m),
  public._to(:m10, public._tok('fer'))::text);
select public.chk('4.2 a reward claimed before its message went is not announced (ya_no)',
  public._end(:hugo, 'premio', 'reward:' || :'r_hugo') = 'ya_no', public._end(:hugo, 'premio', 'reward:' || :'r_hugo'));


-- ---- 5. The stamps' reminder ----------------------------------------------------------------
-- Fer: 3 of 4 at Mari's, her last stamp 23 days ago of 30 — they go in 7 days. Beto: 1 at
-- Gil's, 14 days, his last 8 days ago — they go in 6. Ana: 2 at Lupe's, which keeps them.
insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by)
values (:'ws_g', 'Un agua', 5, 14, :gil) returning id as t_g \gset
insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by)
values (:'ws_l', 'Un postre', 6, null, :lupe) returning id as t_l \gset
insert into servicio.loyalty_card (user_id, workspace_id, terms_id, stamps, started_at, last_stamp_at) values
  (:fer,  :'ws_m', :'t_m', 3, now() - interval '23 days', now() - interval '23 days'),
  (:beto, :'ws_g', :'t_g', 1, now() - interval '8 days',  now() - interval '8 days'),
  (:ana,  :'ws_l', :'t_l', 2, now() - interval '40 days', now() - interval '40 days');
select servicio.send_due_notices(public._mx(:'d' || ' 10:59')) as run15 \gset
select public.chk('5.1 before 11:00 nothing is queued',
  not exists (select 1 from servicio.notice where kind = 'sellos'), :'run15');
update servicio.notification_kind set min_days = 15 where kind = 'sellos';
select public._mark() as m11 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 11:00')) as run16 \gset
select public.chk('5.2 at 11:00, seven days before: Tus sellos en Fonda Doña Mari · 3 de 4 sellos. Vence el … si no vienes. — the card''s own line',
  jsonb_array_length(public._to(:m11, public._tok('fer'))) = 1
  and (select m ->> 'title' = 'Tus sellos en Fonda Doña Mari 0094'
              and m ->> 'body' = '3 de 4 sellos. Vence el '
                                 || servicio.day_words(((now() + interval '7 days') at time zone 'America/Mexico_City')::date) || ' si no vienes.'
              and m ->> 'channelId' = 'tarjetas'
              and m -> 'data' = jsonb_build_object('kind', 'sellos', 'opens', 'tarjeta', 'opens_id', :'ws_m')
         from jsonb_array_elements(public._to(:m11, public._tok('fer'))) m),
  public._to(:m11, public._tok('fer'))::text);
select public.chk('5.3 never a card that keeps them (Nunca), nor — with min_days at 15 — Beto''s card of 14 days',
  not exists (select 1 from servicio.notice where kind = 'sellos' and user_id in (:ana, :beto)), :'run16');
update servicio.notification_kind set min_days = null where kind = 'sellos';
select public._mark() as m12 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 11:01')) as run17 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 11:02')) as run18 \gset
select public.chk('5.4 min_days back to none: Beto''s goes; and once — no second to Fer or Beto a minute on',
  jsonb_array_length(public._to(:m12, public._tok('beto'))) = 1
  and public._to(:m12, public._tok('fer')) = '[]'
  and (select count(*) from servicio.notice where kind = 'sellos') = 2,
  concat_ws(' ', :'run17', :'run18'));


-- ---- 6. A card closing ----------------------------------------------------------------------
-- Hugo wins again and keeps it to claim; Fer holds 3 stamps and a reward.
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
values (:'ws_m', :hugo, :'t_m', 'Una comida gratis', now()) returning id as r_hugo2 \gset
select public._as(:mari, format('select public.close_card(%L)', :'ws_m')) is not null as closed \gset
select closed_at as closed_at from servicio.card_terms where id = :'t_m' \gset
select public._mark() as m13 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 15:00')) as run19 \gset
select public.chk('6.1 Mari closes her card: Fer and Hugo, who hold its stamps or a reward, are told — Fonda Doña Mari cerró su tarjeta · the card''s own sentence, its last day — and nobody else',
  (select array_agg(split_part(u.email, '.', 1) order by u.email) from servicio.notice x join auth.users u on u.id = x.user_id
    where x.kind = 'tarjeta_cambio' and x.about = 'cierre:' || :'t_m') = '{fer,hugo}'
  and (select m ->> 'title' = 'Fonda Doña Mari 0094 cerró su tarjeta'
              and m ->> 'body' = 'Puedes completarla y cobrar tus premios hasta el '
                                 || servicio.day_words(((:'closed_at'::timestamptz + interval '30 days') at time zone 'America/Mexico_City')::date) || '.'
              and m ->> 'channelId' = 'tarjetas'
         from jsonb_array_elements(public._to(:m13, public._tok('hugo'))) m where m ->> 'title' like '%cerró%')
  and public._end(:fer, 'tarjeta_cambio', 'cierre:' || :'t_m') = 'sent',
  public._to(:m13, public._tok('hugo'))::text);


-- ---- 7. A kitchen leaving -------------------------------------------------------------------
insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
values (:'ws_l', :ana, :'t_l', 'Un postre', now());
select public._as(:lupe, format('select public.delete_my_business(%L, %L)', :'ws_l', 'Cocina Lupe 0094')) as lupe_gone \gset
select public._mark() as m14 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 16:00')) as run20 \gset
select public.chk('7.1 Lupe''s kitchen is deleted — the deletion goes through — and Ana, who held its 2 stamps and a reward, is told: Cocina Lupe dejó Wera (its words since 0097, plan 13.2) · Se borraron tus 2 sellos y tu premio por cobrar.; Ines, who only followed, is not',
  :'lupe_gone' not like 'ERR:%' and not exists (select 1 from public.workspace where id = :'ws_l')
  and (select m ->> 'title' = 'Cocina Lupe 0094 dejó Wera' and m ->> 'body' = 'Se borraron tus 2 sellos y tu premio por cobrar.'
              and m -> 'data' = '{"kind": "tarjeta_cambio", "opens": "mis_cocinas"}'::jsonb
         from jsonb_array_elements(public._to(:m14, public._tok('ana'))) m where m ->> 'title' like '%dejó%')
  and not exists (select 1 from servicio.notice where user_id = :ines and kind = 'tarjeta_cambio'),
  concat_ws(' ', :'lupe_gone', public._to(:m14, public._tok('ana'))::text));


-- ---- 8. The first offer's nudge -------------------------------------------------------------
select public._as(:nico, $q$ select public.onboard_workspace(p_display_name => 'Cocina Nico 0094', p_kind => 'cocina') $q$) as ws_n \gset
select public._as(:olga, $q$ select public.onboard_workspace(p_display_name => 'Cocina Olga 0094', p_kind => 'cocina') $q$) as ws_o \gset
select public._pub(:lo, :'ws_o', now(), now() + interval '2 hours', 'Caldo', 60);
-- Juan's kitchen is five days old and has never published: its second day is long gone.
select public._as(:juan, $q$ select public.onboard_workspace(p_display_name => 'Cocina Juan 0094', p_kind => 'cocina') $q$) as ws_j \gset
update public.workspace set created_at = now() - interval '5 days' where id = :'ws_j';
select concat_ws(',',
  public._reg(:nico, 'cocina', public._tok('nico'), 'android', '{apartados,primera_oferta}'),
  public._reg(:olga, 'cocina', public._tok('olga'), 'android', '{apartados,primera_oferta}'),
  public._reg(:juan, 'cocina', public._tok('juan-cocina'), 'android', '{apartados,primera_oferta}')) as cocina_phones \gset
select servicio.send_due_notices(public._mx(:'d' || ' 11:59')) as run21 \gset
select public.chk('8.1 her second day, before 12:00: nothing',
  not exists (select 1 from servicio.notice where kind = 'primera_oferta' and workspace_id in (:'ws_n', :'ws_o', :'ws_j')), :'run21');
select public._mark() as m15 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 12:00')) as run22 \gset
select servicio.send_due_notices(public._mx(:'d' || ' 12:05')) as run23 \gset
select servicio.send_due_notices(public._mx(:'d1' || ' 12:00')) as run24 \gset
select public.chk('8.2 at 12:00 on her second day with no offer, once: ¿Tienes alguna oferta? · Publícala y tus vecinos la verán. — a tap opens Publicar; never to Olga, who published, nor to Juan, whose second day passed',
  jsonb_array_length(public._to(:m15, public._tok('nico'))) = 1
  and (select m ->> 'title' = '¿Tienes alguna oferta?' and m ->> 'body' = 'Publícala y tus vecinos la verán.'
              and m ->> 'channelId' = 'primera_oferta' and m ->> 'priority' = 'normal'
              and m -> 'data' = jsonb_build_object('kind', 'primera_oferta', 'opens', 'publicar', 'workspace_id', :'ws_n')
         from jsonb_array_elements(public._to(:m15, public._tok('nico'))) m)
  and public._to(:m15, public._tok('olga')) = '[]' and public._to(:m15, public._tok('juan-cocina')) = '[]'
  and (select count(*) from servicio.notice where kind = 'primera_oferta' and workspace_id in (:'ws_n', :'ws_o', :'ws_j')) = 1,
  public._to(:m15, public._tok('nico'))::text);


-- ---- 9. Her switches and taps ---------------------------------------------------------------
update servicio.notification_kind set is_on = true where kind = 'promocion_cocina';
select concat_ws(',',
  public._as(:ana, $q$ select public.set_notification_switch('promocion_cocina', true) $q$),
  public._as(:ana, $q$ select public.count_notification_tap('publico') $q$),
  public._as(:ana, $q$ select public.count_notification_tap('premio') $q$),
  public._as(:ana, $q$ select public.count_notification_tap('promocion_cocina') $q$)) as taps \gset
update servicio.notification_kind set is_on = false where kind = 'promocion_cocina';
select public._as(:ana, $q$ select public.my_notification_kinds('itacate') $q$) as ana_kinds \gset
select public.chk('9.1 the bell''s kind is hers to switch, and its taps are counted with nobody; a promotion''s is neither (22023)',
  coalesce((select (k ->> 'is_on')::boolean = false from jsonb_array_elements(public._j(:'eli_off')) k where k ->> 'kind' = 'publico'), false)
  and :'taps' = 'ERR:22023,ok,ok,ERR:22023'
  and (select taps from servicio.notification_tap_count where kind = 'publico' and day = (now() at time zone 'America/Mexico_City')::date) = 1,
  :'taps');
select public.chk('9.2 her Itacate kinds, in their order: the bell, ¡Ganaste!, the reminder, the card''s changes — the alert dark',
  (select array_agg(k ->> 'kind' order by o) from jsonb_array_elements(public._j(:'ana_kinds')) with ordinality as x (k, o))
    = '{publico,premio,sellos,tarjeta_cambio}',
  :'ana_kinds');


-- ---- 10. What is forgotten ------------------------------------------------------------------
update servicio.notice set created_at = now() - interval '31 days' where user_id = :fer and kind = 'premio';
select servicio.forget_old_pushes() as forgot \gset
select public.chk('10.1 the nightly job forgets a notice keep_days (30) after it was queued, and says how many',
  not exists (select 1 from servicio.notice where user_id = :fer and kind = 'premio')
  and (public._j(:'forgot') ->> 'notices')::int >= 1, :'forgot');
delete from auth.users where id = :ana;
select public.chk('10.2 her account deleted: her notices go with it',
  not exists (select 1 from servicio.notice where user_id = :ana));


-- ---- the verdict ----------------------------------------------------------------------------
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
