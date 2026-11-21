-- ============================================================================
-- 0093 — campaigns, in the database (`10.5c-ii`; `10.5c-i`'s design, built ahead of
-- his analyst's answers as settings — the owner's ruling of 2026-11-20).
--
-- ⚠️ WHAT IS SENT IS READ OFF pg_net's OWN QUEUE (`net.http_request_queue`), as
-- `0092`'s suite does: each request's body as Expo would receive it. Nothing reaches
-- Expo — this file is ONE TRANSACTION THAT ROLLS BACK, and pg_net sends only what is
-- committed.
-- ⚠️ THE JOB IS CALLED WITH ITS MOMENT (`send_due_campaigns(p_now)`): every moment
-- below is a local time in Mexico City on day D (tomorrow) or later, so the campaign's
-- dates are in the future as `new_campaign` asks, and the hours and limits are read
-- against the moment given, never the clock.
-- ⚠️ A GROUP CANNOT BE PREDICTED HERE: a campaign's number is an identity, so the hash
-- is checked against its own definition (section 3) and the sending campaigns hold
-- nobody back unless the check is about that.
--
-- Section 1 the shape, the rights, the defaults. Section 2 her yes. Section 3 a draft
-- and the hash. Section 4 a test and the launch. Section 5 the job: hours, limits, her
-- answers, the phones. Section 6 the audiences. Section 7 taps and counts. Section 8
-- held back, stopped, switched off. Section 9 what is forgotten.
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

-- An error's own words, for refusals that share a SQLSTATE.
create or replace function public._err(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlerrm;
end;
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

create function public._a(p_who text)
returns jsonb language sql as $$ select a.body from public._answer a where a.who = p_who $$;

create function public._queued(p_after bigint)
returns table (id bigint, url text, headers jsonb, body jsonb, timeout_ms integer)
language sql as $$
  select q.id, q.url, q.headers, convert_from(q.body, 'UTF8')::jsonb, q.timeout_milliseconds
    from net.http_request_queue q where q.id > p_after order by q.id
$$;
create function public._mark() returns bigint language sql as $$
  select coalesce(max(id), 0) from net.http_request_queue
$$;
-- Every message queued after a mark, one row each.
create function public._msgs(p_after bigint)
returns table (request bigint, pos integer, msg jsonb)
language sql as $$
  select q.id, (x.n - 1)::integer, x.m
    from public._queued(p_after) q,
         jsonb_array_elements(q.body) with ordinality as x (m, n)
$$;
create function public._tok(p text) returns text language sql immutable as $$
  select 'ExponentPushToken[' || p || ']'
$$;
create function public._mx(p text) returns timestamptz language sql immutable as $$
  select (p::timestamp) at time zone 'America/Mexico_City'
$$;
-- Who a campaign's member rows hold, as a sorted list of first names.
create function public._who(p_campaign bigint, p_where text default 'true')
returns text language plpgsql as $$
declare v text;
begin
  execute format('select string_agg(split_part(u.email, ''.'', 1), '','' order by u.email)
                    from servicio.campaign_member m join auth.users u on u.id = m.user_id
                   where m.campaign_id = %s and (%s)', p_campaign, p_where) into v;
  return coalesce(v, '');
end;
$$;

\set ana  '''0093aaaa-0000-4000-8000-000000000001'''
\set beto '''0093aaaa-0000-4000-8000-000000000002'''
\set caro '''0093aaaa-0000-4000-8000-000000000003'''
\set dani '''0093aaaa-0000-4000-8000-000000000004'''
\set eli  '''0093aaaa-0000-4000-8000-000000000005'''
\set fer  '''0093aaaa-0000-4000-8000-000000000006'''
\set yo   '''0093aaaa-0000-4000-8000-000000000007'''
\set gil  '''0093aaaa-0000-4000-8000-000000000008'''
\set hugo '''0093aaaa-0000-4000-8000-000000000009'''
\set ines '''0093aaaa-0000-4000-8000-00000000000a'''
\set juan '''0093aaaa-0000-4000-8000-00000000000b'''
\set lupe '''0093aaaa-0000-4000-8000-00000000000c'''
\set mara '''0093aaaa-0000-4000-8000-00000000000d'''
\set nico '''0093aaaa-0000-4000-8000-00000000000e'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:ana,  'ana.0093@example.mx',  jsonb_build_object('full_name', 'Ana 0093')),
  (:beto, 'beto.0093@example.mx', jsonb_build_object('full_name', 'Beto 0093')),
  (:caro, 'caro.0093@example.mx', jsonb_build_object('full_name', 'Caro 0093')),
  (:dani, 'dani.0093@example.mx', jsonb_build_object('full_name', 'Dani 0093')),
  (:eli,  'eli.0093@example.mx',  jsonb_build_object('full_name', 'Eli 0093')),
  (:fer,  'fer.0093@example.mx',  jsonb_build_object('full_name', 'Fer 0093')),
  (:yo,   'yo.0093@example.mx',   jsonb_build_object('full_name', 'Yo 0093')),
  (:gil,  'gil.0093@example.mx',  jsonb_build_object('full_name', 'Gil 0093')),
  (:hugo, 'hugo.0093@example.mx', jsonb_build_object('full_name', 'Hugo 0093')),
  (:ines, 'ines.0093@example.mx', jsonb_build_object('full_name', 'Ines 0093')),
  (:juan, 'juan.0093@example.mx', jsonb_build_object('full_name', 'Juan 0093')),
  (:lupe, 'lupe.0093@example.mx', jsonb_build_object('full_name', 'Lupe 0093')),
  (:mara, 'mara.0093@example.mx', jsonb_build_object('full_name', 'Mara 0093')),
  (:nico, 'nico.0093@example.mx', jsonb_build_object('full_name', 'Nico 0093'));

-- D: tomorrow in Mexico City, so every moment below is in the future.
select ((now() at time zone 'America/Mexico_City')::date + 1)::text as d \gset
select ((now() at time zone 'America/Mexico_City')::date + 2)::text as d1 \gset
select ((now() at time zone 'America/Mexico_City')::date + 3)::text as d2 \gset
select ((now() at time zone 'America/Mexico_City')::date + 5)::text as d4 \gset
select ((now() at time zone 'America/Mexico_City')::date + 10)::text as d9 \gset
select ((now() at time zone 'America/Mexico_City')::date + 11)::text as d10 \gset


-- ---- 1. The shape, the rights, the defaults ----------------------------------------------
select public.chk('1.1 the nine tables live in servicio, and no client role holds a right on any',
  (select count(*) from pg_class c
    where c.relnamespace = 'servicio'::regnamespace and c.relkind = 'r'
      and c.relname in ('notification_rule', 'consent_words', 'consent', 'campaign_audience', 'campaign_tester',
                        'campaign', 'campaign_variant', 'campaign_member', 'campaign_count')) = 9
  and not exists (
    select 1 from unnest(array['notification_rule', 'consent_words', 'consent', 'campaign_audience', 'campaign_tester',
                               'campaign', 'campaign_variant', 'campaign_member', 'campaign_count']) t,
                  unnest(array['anon', 'authenticated']) r,
                  unnest(array['select', 'insert', 'update', 'delete']) p
     where has_table_privilege(r, 'servicio.' || t, p)));
select public.chk('1.2 the three doors answer a signed-in person and nobody signed out',
  (select bool_and(has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.set_my_consent(text, boolean)', 'public.my_consent(text)',
                       'public.count_campaign_tap(bigint)']) f));
select public.chk('1.3 what he runs, the job, the counting and their helpers are granted to nobody',
  (select bool_and(not has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['servicio.new_campaign(text, text, text, timestamptz, timestamptz, integer, integer, jsonb, text, uuid, text)',
                       'servicio.test_campaign(bigint)', 'servicio.launch_campaign(bigint)', 'servicio.stop_campaign(bigint)',
                       'servicio.campaign_preview(bigint, timestamptz)', 'servicio.campaign_results(integer)',
                       'servicio.send_due_campaigns(timestamptz)', 'servicio.count_campaigns(timestamptz, timestamptz)',
                       'servicio.campaign_tally(bigint)', 'servicio.campaign_push(bigint, text, uuid[], boolean)',
                       'servicio.audience_people(text, text, timestamptz)', 'servicio.campaign_bucket(bigint, uuid)',
                       'servicio.campaign_variant_of(bigint, uuid)', 'servicio.campaign_phones(text, uuid[])',
                       'servicio.consent_now(uuid, text, text)', 'servicio.consents_of(uuid, text)',
                       'servicio.kinds_of(uuid, text)', 'servicio.forget_old_pushes()']) f));
select public.chk('1.4 the rules, one row, the recommended numbers: 9:00 to 20:00 in Mexico City, 1 a day, 3 a week, 1 a kitchen a day, 30 days',
  (select count(*) from servicio.notification_rule) = 1
  and (select zone = 'America/Mexico_City' and promo_from = '09:00' and promo_until = '20:00'
              and promo_per_day = 1 and promo_per_week = 3 and request_per_day = 1 and keep_days = 30
         from servicio.notification_rule)
  and public._try('insert into servicio.notification_rule (id) values (false)') = '23514');
select public.chk('1.5 dark until she rules: the two promotion kinds off, no words approved; the closed list on, 6 facts in Itacate and 5 in Wera Cocina',
  -- (`0094`, `10.9h-i`, adds a third, `promocion_cocina`, dark too — its own suite holds it)
  (select count(*) from servicio.notification_kind
    where class = 'promocion' and not is_on and not default_on and kind in ('novedades', 'ofertas')) = 2
  and (select app = 'itacate' and channel = 'ofertas' and opens = 'cerca' from servicio.notification_kind where kind = 'ofertas')
  and (select app = 'cocina' and channel = 'novedades' and opens = 'hoy' from servicio.notification_kind where kind = 'novedades')
  and (select count(*) from servicio.consent_words) = 0
  and (select count(*) filter (where app = 'itacate') = 6 and count(*) filter (where app = 'cocina') = 5 and bool_and(is_on)
         from servicio.campaign_audience));
select public.chk('1.6 the job each minute: send-campaigns; and the nightly forgetting still scheduled',
  (select count(*) from cron.job
    where (jobname, schedule, command) in (
      ('send-campaigns', '* * * * *', 'select servicio.send_due_campaigns()'),
      ('forget-old-pushes', '25 9 * * *', 'select servicio.forget_old_pushes()'))) = 2);


-- ---- 2. Her yes ---------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-before', $q$ select public.my_consent('itacate') $q$) as r \gset
select public._try($q$ select public.set_my_consent('itacate-hoja-1', true) $q$) as unapproved \gset
reset role;
select public.chk('2.1 before anything: never asked, both purposes null',
  public._a('ana-before') = '{"promociones": null, "medir_promociones": null}'::jsonb, public._a('ana-before')::text);
select public.chk('2.2 no words approved: a yes is refused (22023) — nobody can say yes before the analyst approves the words',
  :'unapproved' = '22023' and not exists (select 1 from servicio.consent));

-- The analyst approves: one sheet naming both uses in Itacate; a switch for each; Wera Cocina's sheet.
insert into servicio.consent_words (words, app, purposes, shown_on, body) values
  ('itacate-hoja-1', 'itacate', '{promociones,medir_promociones}', 'hoja', '¿Te avisamos de ofertas? … Contamos cuáles abres y si apartas después.'),
  ('itacate-ajustes-ofertas-1', 'itacate', '{promociones}', 'ajustes', 'Ofertas y novedades.'),
  ('itacate-ajustes-medir-1', 'itacate', '{medir_promociones}', 'ajustes', 'Contar lo que hago después de una oferta.'),
  ('cocina-hoja-1', 'cocina', '{promociones,medir_promociones}', 'hoja', '¿Te avisamos de novedades? … Contamos cuáles abres.');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-yes', $q$ select public.set_my_consent('itacate-hoja-1', true) $q$) as r \gset
reset role;
select public.chk('2.3 a yes on the sheet: one record per purpose the words name, with their version and moment; answered with both yes',
  (select count(*) from servicio.consent where user_id = :ana) = 2
  and (select bool_and(answer and words = 'itacate-hoja-1' and app = 'itacate') from servicio.consent where user_id = :ana)
  and (public._a('ana-yes') -> 'promociones' ->> 'answer')::boolean
  and (public._a('ana-yes') -> 'medir_promociones' ->> 'answer')::boolean
  and public._a('ana-yes') -> 'promociones' ->> 'words' = 'itacate-hoja-1'
  and public._a('ana-yes') -> 'promociones' ? 'at', public._a('ana-yes')::text);
select public.chk('2.4 only ever added to: a record refuses an UPDATE, approved words refuse a change (55000)',
  public._try($q$ update servicio.consent set answer = false where user_id = '0093aaaa-0000-4000-8000-000000000001' $q$) = '55000'
  and public._try($q$ update servicio.consent_words set body = 'otra cosa' where words = 'itacate-hoja-1' $q$) = '55000');

-- Fer says yes, then turns offers off in Notificaciones; counting stays yes.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fer), true);
set local role authenticated;
select public._call_as_me('fer-yes', $q$ select public.set_my_consent('itacate-hoja-1', true) $q$) as r \gset
select public._call_as_me('fer-no', $q$ select public.set_my_consent('itacate-ajustes-ofertas-1', false) $q$) as r \gset
select public._try($q$ select public.my_consent('wera') $q$) as bad_app \gset
reset role;
select set_config('request.jwt.claims', '', true);
select public._try($q$ select public.my_consent('itacate') $q$) as signed_out \gset
select public.chk('2.5 her later no: the latest answer is hers now — offers no, counting still yes — and every answer kept',
  (public._a('fer-no') -> 'promociones' ->> 'answer')::boolean = false
  and (public._a('fer-no') -> 'medir_promociones' ->> 'answer')::boolean = true
  and public._a('fer-no') -> 'promociones' ->> 'words' = 'itacate-ajustes-ofertas-1'
  and (select count(*) from servicio.consent where user_id = :fer) = 3
  and not servicio.consent_now(:fer, 'itacate', 'promociones')
  and servicio.consent_now(:fer, 'itacate', 'medir_promociones'), public._a('fer-no')::text);
select public.chk('2.6 an app it does not know: 22023; nobody signed in: 42501',
  :'bad_app' = '22023' and :'signed_out' = '42501');

-- Everyone else's answers. Beto: offers yes, counting no (the two switches). Dani, Eli, Gil,
-- Hugo, Ines, Juan and Yo (his test account) say yes on the sheet; Caro is never asked.
insert into servicio.consent (user_id, app, purpose, answer, words) values
  (:beto, 'itacate', 'promociones', true, 'itacate-ajustes-ofertas-1'),
  (:beto, 'itacate', 'medir_promociones', false, 'itacate-ajustes-medir-1');
insert into servicio.consent (user_id, app, purpose, answer, words)
select u, 'itacate', p, true, 'itacate-hoja-1'
  from unnest(array[:dani, :eli, :yo]::uuid[]) u, unnest(array['promociones', 'medir_promociones']) p;
insert into servicio.campaign_tester (user_id) values (:yo);

-- `0094`'s Itacate kinds (`10.9h-i`) — the bell, ¡Ganaste!, the reminder, the card's changes, a
-- promotion's alert — are its own suite's.
select public.chk('2.7 the dark kind is offered to nobody but his test account, whose is_on is his answer; Ana is offered none of Itacate''s promotion kinds',
  not exists (select 1 from jsonb_array_elements(servicio.kinds_of(:ana, 'itacate')) k where k ->> 'class' = 'promocion')
  and (select (k ->> 'is_on')::boolean and k ->> 'class' = 'promocion'
         from jsonb_array_elements(servicio.kinds_of(:yo, 'itacate')) k where k ->> 'kind' = 'ofertas')
  and (select count(*) from jsonb_array_elements(servicio.kinds_of(:yo, 'itacate')) k
        where k ->> 'kind' not in ('publico', 'promocion_cocina', 'premio', 'sellos', 'tarjeta_cambio')) = 1
  and (select (k ->> 'is_on')::boolean = false
         from jsonb_array_elements(servicio.kinds_of(:yo, 'cocina')) k where k ->> 'kind' = 'novedades'),
  servicio.kinds_of(:yo, 'itacate')::text);

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :yo), true);
set local role authenticated;
select public._try($q$ select public.set_notification_switch('ofertas', true) $q$) as switch_promo \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try($q$ select public.set_notification_switch('ofertas', true) $q$) as switch_promo_ana \gset
reset role;
select public.chk('2.8 a promotion is never turned on by a switch: 22023 for his test account and for Ana',
  :'switch_promo' = '22023' and :'switch_promo_ana' = '22023'
  and not exists (select 1 from servicio.notification_switch where kind = 'ofertas'));

-- The phones. Ana an iPhone; Beto an iPhone; Dani an Android holding ofertas; Eli an
-- Android that has not made it; Fer and Caro iPhones; Yo an iPhone and an Android without it.
insert into servicio.push_token (user_id, app, token, platform, allowed, channels) values
  (:ana,  'itacate', public._tok('ana-1'),  'ios',     true, '{}'),
  (:beto, 'itacate', public._tok('beto-1'), 'ios',     true, '{}'),
  (:dani, 'itacate', public._tok('dani-1'), 'android', true, '{tus_apartados,ofertas}'),
  (:eli,  'itacate', public._tok('eli-1'),  'android', true, '{tus_apartados}'),
  (:fer,  'itacate', public._tok('fer-1'),  'ios',     true, '{}'),
  (:caro, 'itacate', public._tok('caro-1'), 'ios',     true, '{}'),
  (:yo,   'itacate', public._tok('yo-ios'), 'ios',     true, '{}'),
  (:yo,   'itacate', public._tok('yo-and'), 'android', true, '{tus_apartados}');


-- ---- 3. A draft, and the hash -------------------------------------------------------------
create function public._new(p_kind text, p_audience text, p_held integer, p_variants text,
                            p_starts text, p_expires text, p_app text default 'itacate')
returns text language plpgsql as $$
begin
  return servicio.new_campaign(p_app, p_kind, p_audience, public._mx(p_starts), public._mx(p_expires), 24, p_held,
                               p_variants::jsonb)::text;
exception when others then
  return sqlstate;
end;
$$;
\set ab '[{"key":"A","weight":50,"title":"Para la cena, aparta y pasa a tu hora","body":"Cuatro cocinas tienen oferta del día."},{"key":"B","weight":50,"title":"¿Ya sabes qué vas a cenar?","body":"Aparta y pasa a tu hora."}]'
\set a '[{"key":"A","weight":100,"title":"Oferta del día","body":"Cuatro cocinas tienen oferta del día."}]'

select public.chk('3.1 a draft refused: a service kind, another app''s kind, an audience not on the list, dates past or over 14 days, a window of 0, 95 held back, weights not adding to 100, a key twice, a title over 80, wordings not a list, a weight not a number',
  public._new('apartados', 'todos', 10, :'ab', :'d' || ' 00:00', :'d1' || ' 23:00') = '22023'
  and public._new('novedades', 'todos', 10, :'ab', :'d' || ' 00:00', :'d1' || ' 23:00') = '22023'
  and public._new('ofertas', 'por_colonia', 10, :'ab', :'d' || ' 00:00', :'d1' || ' 23:00') = '22023'
  and public._new('ofertas', 'todos', 10, :'ab', '2020-01-01 00:00', '2020-01-02 00:00') = '22023'
  and public._new('ofertas', 'todos', 10, :'ab', :'d' || ' 00:00', :'d4' || ' 23:00') <> '22023'
  and public._new('ofertas', 'todos', 10, :'ab', :'d' || ' 00:00', '2099-01-01 00:00') = '22023'
  and (select sqlstate_of from (select public._try(format(
         'select servicio.new_campaign(%L, %L, %L, %L::timestamptz, %L::timestamptz, 0, 10, %L::jsonb)',
         'itacate', 'ofertas', 'todos', public._mx(:'d' || ' 00:00'), public._mx(:'d1' || ' 23:00'), :'ab')) as sqlstate_of) s) = '22023'
  and public._new('ofertas', 'todos', 95, :'ab', :'d' || ' 00:00', :'d1' || ' 23:00') = '22023'
  and public._new('ofertas', 'todos', 10, '[{"key":"A","weight":50,"title":"x","body":"y"},{"key":"B","weight":40,"title":"x","body":"y"}]', :'d' || ' 00:00', :'d1' || ' 23:00') = '22023'
  and public._new('ofertas', 'todos', 10, '[{"key":"A","weight":50,"title":"x","body":"y"},{"key":"A","weight":50,"title":"x","body":"y"}]', :'d' || ' 00:00', :'d1' || ' 23:00') = '22023'
  and public._new('ofertas', 'todos', 10, format('[{"key":"A","weight":100,"title":"%s","body":"y"}]', repeat('x', 81)), :'d' || ' 00:00', :'d1' || ' 23:00') = '22023'
  and public._new('ofertas', 'todos', 10, '{"key":"A"}', :'d' || ' 00:00', :'d1' || ' 23:00') = '22023'
  and public._new('ofertas', 'todos', 10, '[{"key":"A","weight":"cien","title":"x","body":"y"}]', :'d' || ' 00:00', :'d1' || ' 23:00') = '22023');
delete from servicio.campaign;

select public._new('ofertas', 'todos', 10, :'ab', :'d' || ' 00:00', :'d1' || ' 23:00') as c_hash \gset
select public.chk('3.2 a draft: its number; its wordings with their weights; nothing sent, nothing launched, what a tap opens the kind''s',
  (select app = 'itacate' and kind = 'ofertas' and audience = 'todos' and held_out = 10 and window_hours = 24
          and opens = 'cerca' and tested_at is null and launched_at is null
     from servicio.campaign where id = :c_hash)
  and (select string_agg(variant || weight, ',' order by variant) from servicio.campaign_variant where campaign_id = :c_hash) = 'A50,B50');

-- 2,000 accounts that do not exist: the hash is the same each time, md5's first 32 bits
-- modulo 100, and the buckets fall as drawn — 0 to 9 held back, 10 to 54 A, 55 to 99 B.
create temporary table _h as
  select g, gen_random_uuid() as u from generate_series(1, 2000) g;
select public.chk('3.3 each person''s group is fixed by md5 of the campaign and her account: the same every time, buckets 0–9 held back, 10–54 A, 55–99 B',
  not exists (
    select 1 from _h
     where servicio.campaign_bucket(:c_hash, u)
             <> (('x' || left(md5(:c_hash::text || ':' || u::text), 8))::bit(32)::bigint % 100)
        or servicio.campaign_variant_of(:c_hash, u) is distinct from servicio.campaign_variant_of(:c_hash, u)
        or servicio.campaign_variant_of(:c_hash, u) is distinct from
             case when servicio.campaign_bucket(:c_hash, u) < 10 then null
                  when servicio.campaign_bucket(:c_hash, u) < 55 then 'A' else 'B' end)
  and (select count(*) filter (where servicio.campaign_variant_of(:c_hash, u) is null) between 120 and 290
              and count(*) filter (where servicio.campaign_variant_of(:c_hash, u) = 'A') between 760 and 1040
         from _h));
select public.chk('3.4 the preview: per group, the people its audience holds now, those a phone would show it to, those counted (never his test account)',
  (select sum(people) from servicio.campaign_preview(:c_hash)) = 5
  and (select string_agg(grp, ',' order by case when grp = 'held_back' then 0 else 1 end, grp)
         from servicio.campaign_preview(:c_hash)) = 'held_back,A,B'
  and (select sum(reachable) from servicio.campaign_preview(:c_hash)) = 4
  and (select sum(counted) from servicio.campaign_preview(:c_hash)) = 3);


-- ---- 4. A test, and the launch ------------------------------------------------------------
select public._new('ofertas', 'todos', 0, :'a', :'d' || ' 00:00', :'d1' || ' 23:00') as c1 \gset
select public._err(format('select servicio.launch_campaign(%s)', :c1)) as launch_untested \gset
delete from servicio.campaign_tester;
select public._try(format('select servicio.test_campaign(%s)', :c1)) as test_nobody \gset
insert into servicio.campaign_tester (user_id) values (:yo);
select public.chk('4.1 launch refused until a test went out; a test with no test account refused (22023)',
  :'launch_untested' like '%send it to your own phones first%' and :'test_nobody' = '22023'
  and (select launched_at is null from servicio.campaign where id = :c1));

select public._mark() as m1 \gset
select servicio.test_campaign(:c_hash) as tested \gset
select public.chk('4.2 a test: every wording to his phones that would show it, now, the kind dark — two messages to his iPhone, none to anyone else',
  (select count(*) from public._msgs(:m1)) = 2
  and (select bool_and(msg ->> 'to' = public._tok('yo-ios')) from public._msgs(:m1))
  and (select string_agg(msg ->> 'title', ' | ' order by msg ->> 'title' collate "C") from public._msgs(:m1))
        = 'Para la cena, aparta y pasa a tu hora | ¿Ya sabes qué vas a cenar?'
  and (select count(*) from servicio.notification_send where campaign_id = :c_hash and test) = 2
  and (select tested_at is not null from servicio.campaign where id = :c_hash),
  :'tested');
select public.chk('4.3 the test says which of his phones could not show it and why: his Android has not made ofertas',
  (:'tested'::jsonb ->> 'messages')::int = 2 and (:'tested'::jsonb ->> 'phones')::int = 1
  and :'tested'::jsonb -> 'not_sent_to' -> 0 ->> 'platform' = 'android'
  and :'tested'::jsonb -> 'not_sent_to' -> 0 ->> 'why' like '%ofertas%', :'tested');
select public.chk('4.4 each message: the kind''s channel, priority normal, what a tap opens, the campaign and its own send''s number',
  (select bool_and(msg ->> 'channelId' = 'ofertas' and msg ->> 'priority' = 'normal' and msg ->> 'sound' = 'default'
                   and msg -> 'data' ->> 'kind' = 'ofertas' and msg -> 'data' ->> 'opens' = 'cerca'
                   and (msg -> 'data' ->> 'campaign_id')::bigint = :c_hash
                   and exists (select 1 from servicio.notification_send s
                                where s.id = (msg -> 'data' ->> 'send_id')::bigint
                                  and s.request_id = q.request and s.request_pos = q.pos))
     from public._msgs(:m1) q),
  (select msg::text from public._msgs(:m1) limit 1));

select servicio.test_campaign(:c1) as tested1 \gset
select public._err(format('select servicio.launch_campaign(%s)', :c1)) as launch_dark \gset
update servicio.notification_kind set is_on = true where kind = 'ofertas';
select public._call_as_me('launched1', format('select servicio.launch_campaign(%s)', :c1)) as r \gset
select coalesce(public._a('launched1')::text, '{}') as launched1 \gset
select public._try(format('select servicio.launch_campaign(%s)', :c1)) as launch_twice \gset
select public.chk('4.5 launch refused while the kind is dark — promotions wait for the analyst — then launched once; a second launch refused',
  :'launch_dark' like '%the kind ofertas is off%' and (:'launched1'::jsonb ->> 'launched')::boolean and :'launch_twice' = '22023'
  and (select launched_at is not null from servicio.campaign where id = :c1), :'launched1');
select public.chk('4.6 a test is counted nowhere: no one entered the campaign',
  not exists (select 1 from servicio.campaign_member));


-- ---- 5. The job ---------------------------------------------------------------------------
select public._mark() as m2 \gset
select servicio.send_due_campaigns(public._mx(:'d' || ' 08:15')) as early \gset
select public.chk('5.1 before 9:00 nothing: nobody entered, nothing queued',
  (select count(*) from public._queued(:m2)) = 0 and not exists (select 1 from servicio.campaign_member)
  and (:'early'::jsonb ->> 'inside_hours')::boolean = false, :'early');
select public._mark() as m3 \gset
select servicio.send_due_campaigns(public._mx(:'d' || ' 20:00')) as late \gset
select public.chk('5.2 from 20:00 nothing either',
  (select count(*) from public._queued(:m3)) = 0 and not exists (select 1 from servicio.campaign_member), :'late');

select public._mark() as m4 \gset
select servicio.send_due_campaigns(public._mx(:'d' || ' 18:00')) as at18 \gset
select public.chk('5.3 at 18:00 it takes in whoever said yes — never Caro (never asked) or Fer (her later no) — and only the campaign launched',
  public._who(:c1) = 'ana,beto,dani,eli,yo'
  and not exists (select 1 from servicio.campaign_member where campaign_id = :c_hash), public._who(:c1));
select public.chk('5.4 what she does is counted only with her yes to counting, never for his test account',
  public._who(:c1, 'm.measured') = 'ana,dani,eli');
select public.chk('5.5 sent to every phone that would show it — Eli''s Android has not made ofertas, so she waits — in one request',
  (select count(*) from public._queued(:m4)) = 1
  and (select string_agg(msg ->> 'to', ',' order by msg ->> 'to') from public._msgs(:m4))
        = public._tok('ana-1') || ',' || public._tok('beto-1') || ',' || public._tok('dani-1') || ',' || public._tok('yo-ios')
  and public._who(:c1, 'm.sent_at is not null') = 'ana,beto,dani,yo'
  and (select sent_at is null from servicio.campaign_member where campaign_id = :c1 and user_id = :eli)
  and (select bool_and(msg ->> 'title' = 'Oferta del día') from public._msgs(:m4)), :'at18');

-- Eli's phone makes the channel; a second campaign is launched the same evening.
update servicio.push_token set channels = '{tus_apartados,ofertas}' where token = public._tok('eli-1');
select public._new('ofertas', 'todos', 0, '[{"key":"A","weight":100,"title":"Segunda","body":"La segunda del día."}]',
                   :'d' || ' 00:00', :'d1' || ' 23:00') as c2 \gset
select servicio.test_campaign(:c2) is not null as t2 \gset
select servicio.launch_campaign(:c2) is not null as l2 \gset
select public._mark() as m5 \gset
select servicio.send_due_campaigns(public._mx(:'d' || ' 19:30')) as at1930 \gset
select public.chk('5.6 two campaigns on one evening: Eli, now reachable, gets the first; the second waits for everyone — one a day, every campaign together',
  (select string_agg(msg ->> 'to' || '=' || (msg ->> 'title'), ',') from public._msgs(:m5)) = public._tok('eli-1') || '=Oferta del día'
  and public._who(:c2) = 'ana,beto,dani,eli,yo'
  and not exists (select 1 from servicio.campaign_member where campaign_id = :c2 and sent_at is not null), :'at1930');

-- Dani turns offers off overnight.
insert into servicio.consent (user_id, app, purpose, answer, words) values (:dani, 'itacate', 'promociones', false, 'itacate-ajustes-ofertas-1');
select public._mark() as m6 \gset
select servicio.send_due_campaigns(public._mx(:'d1' || ' 09:00')) as next9 \gset
select public.chk('5.7 the next morning at 9:00 the second goes — never to Dani, who said no since she entered it',
  (select string_agg(msg ->> 'to', ',' order by msg ->> 'to') from public._msgs(:m6))
     = public._tok('ana-1') || ',' || public._tok('beto-1') || ',' || public._tok('eli-1') || ',' || public._tok('yo-ios')
  and (select sent_at is null from servicio.campaign_member where campaign_id = :c2 and user_id = :dani), :'next9');
select public._mark() as m7 \gset
select servicio.send_due_campaigns(public._mx(:'d1' || ' 09:01')) as again \gset
select public.chk('5.8 a minute on, nothing twice',
  (select count(*) from public._queued(:m7)) = 0, :'again');

-- Three a week — and the rule is the row: two, for one campaign.
select public._new('ofertas', 'todos', 0, '[{"key":"A","weight":100,"title":"Tercera","body":"La tercera."}]',
                   :'d2' || ' 00:00', :'d2' || ' 23:00') as c3 \gset
select servicio.test_campaign(:c3) is not null as t3 \gset
select servicio.launch_campaign(:c3) is not null as l3 \gset
update servicio.notification_rule set promo_per_week = 2;
select public._mark() as m8 \gset
select servicio.send_due_campaigns(public._mx(:'d2' || ' 10:00')) as week2 \gset
update servicio.notification_rule set promo_per_week = 3;
select public._mark() as m9 \gset
select servicio.send_due_campaigns(public._mx(:'d2' || ' 10:01')) as week3 \gset
select public.chk('5.9 the weekly limit is the rule''s row: at two a week the third waits; at three it goes',
  :m9 = :m8
  and (select count(*) from public._msgs(:m9)) = 4
  and public._who(:c3, 'm.sent_at is not null') = 'ana,beto,eli,yo', :'week2');

-- ---- 6. The audiences: who each fact chooses ---------------------------------------------
-- Itacate: Gil never reserved; Hugo collected 40 days ago; Ines reserved 20 days ago and
-- never came; Juan reserved 3 days ago. Wera Cocina: Lupe's kitchen published 2 days ago
-- and had a reservation; Mara's published 10 days ago and never had one; Nico has none.
insert into servicio.consent (user_id, app, purpose, answer, words)
select u, 'itacate', 'promociones', true, 'itacate-hoja-1' from unnest(array[:gil, :hugo, :ines, :juan]::uuid[]) u;
insert into servicio.consent (user_id, app, purpose, answer, words)
select u, 'cocina', 'promociones', true, 'cocina-hoja-1' from unnest(array[:lupe, :mara, :nico]::uuid[]) u;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupe), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Lupe 0093', p_kind => 'cocina') as ws_l \gset
reset role;
select id as loc_l from public.location where workspace_id = :'ws_l' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mara), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Mara 0093', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset

insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by, created_at) values
  ('0093bbbb-0000-4000-8000-000000000001', :'ws_l', :'loc_l', now() - interval '2 days', now() - interval '2 days' + interval '4 hours', :lupe, now() - interval '2 days'),
  ('0093bbbb-0000-4000-8000-000000000002', :'ws_m', :'loc_m', now() - interval '10 days', now() - interval '10 days' + interval '4 hours', :mara, now() - interval '10 days'),
  ('0093bbbb-0000-4000-8000-000000000003', :'ws_l', :'loc_l', now() - interval '41 days', now() - interval '41 days' + interval '4 hours', :lupe, now() - interval '41 days');
insert into public.reservation (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day,
                                held_until, payment, eat, created_at, handed_over_at)
values
  ('0093cccc-0000-4000-8000-000000000001', :'ws_l', :'loc_l', '0093bbbb-0000-4000-8000-000000000003', :hugo, 101,
   now() - interval '40 days', (now() - interval '40 days')::date, now() - interval '40 days' + interval '1 hour',
   'efectivo', 'llevar', now() - interval '40 days', now() - interval '40 days'),
  ('0093cccc-0000-4000-8000-000000000002', :'ws_l', :'loc_l', '0093bbbb-0000-4000-8000-000000000003', :ines, 102,
   now() - interval '20 days', (now() - interval '20 days')::date, now() - interval '20 days' + interval '1 hour',
   'efectivo', 'llevar', now() - interval '20 days', null),
  ('0093cccc-0000-4000-8000-000000000003', :'ws_l', :'loc_l', '0093bbbb-0000-4000-8000-000000000001', :juan, 103,
   now() - interval '3 days', (now() - interval '3 days')::date, now() - interval '3 days' + interval '1 hour',
   'efectivo', 'llevar', now() - interval '3 days', null);

create function public._aud(p_app text, p_audience text) returns text language sql as $$
  select coalesce(string_agg(split_part(u.email, '.', 1), ',' order by u.email), '')
    from servicio.audience_people(p_app, p_audience, now()) p join auth.users u on u.id = p.user_id
   where u.email like '%.0093@example.mx'
$$;
select public.chk('6.1 Itacate''s facts, each on top of her yes: everyone; never reserved; collected; reserved before and not in 7, 14, 30 days',
  public._aud('itacate', 'todos') = 'ana,beto,eli,gil,hugo,ines,juan,yo'
  and public._aud('itacate', 'nunca_aparto') = 'ana,beto,eli,gil,yo'
  and public._aud('itacate', 'recogio') = 'hugo'
  and public._aud('itacate', 'sin_apartar_7') = 'hugo,ines'
  and public._aud('itacate', 'sin_apartar_14') = 'hugo,ines'
  and public._aud('itacate', 'sin_apartar_30') = 'hugo',
  public._aud('itacate', 'sin_apartar_7') || ' / ' || public._aud('itacate', 'nunca_aparto'));
select public.chk('6.2 Wera Cocina''s facts: everyone; published in 7 days or not (a kitchen, but not lately); had a reservation or never',
  public._aud('cocina', 'todos') = 'lupe,mara,nico'
  and public._aud('cocina', 'publico_7') = 'lupe'
  and public._aud('cocina', 'sin_publicar_7') = 'mara'
  and public._aud('cocina', 'tuvo_apartado') = 'lupe'
  and public._aud('cocina', 'sin_apartado') = 'mara'
  and public._aud('cocina', 'por_colonia') = '');


-- ---- 7. Taps and counts -------------------------------------------------------------------
select id as send_ana from servicio.notification_send s
 where s.campaign_id = :c1 and not s.test and s.token_id = (select id from servicio.push_token where token = public._tok('ana-1')) \gset
select id as send_beto from servicio.notification_send s
 where s.campaign_id = :c1 and not s.test and s.token_id = (select id from servicio.push_token where token = public._tok('beto-1')) \gset
select min(id) as send_test from servicio.notification_send where campaign_id = :c1 and test \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :eli), true);
set local role authenticated;
select public._try(format('select public.count_campaign_tap(%s)', :send_ana)) as eli_taps_ana \gset
reset role;
select tapped_at is null as untouched_by_eli from servicio.notification_send where id = :send_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._try(format('select public.count_campaign_tap(%s)', :send_beto)) as beto_taps \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :yo), true);
set local role authenticated;
select public._try(format('select public.count_campaign_tap(%s)', :send_test)) as yo_taps_test \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.count_campaign_tap(%s)', :send_ana)) as ana_taps \gset
select public._try('select public.count_campaign_tap(null)') as tap_null \gset
reset role;
select set_config('request.jwt.claims', '', true);
select public._try(format('select public.count_campaign_tap(%s)', :send_ana)) as tap_signed_out \gset
select public.chk('7.1 a tap kept only on her own message, while she is counted: Ana''s kept; Eli''s on Ana''s, Beto''s (not counted), a test''s — none; each answered alike',
  :'eli_taps_ana' = 'ok' and :'untouched_by_eli' and :'beto_taps' = 'ok' and :'yo_taps_test' = 'ok' and :'ana_taps' = 'ok'
  and (select count(*) from servicio.notification_send where tapped_at is not null) = 1
  and (select tapped_at is not null from servicio.notification_send where id = :send_ana));
select public.chk('7.2 no number: 22023; nobody signed in: 42501',
  :'tap_null' = '22023' and :'tap_signed_out' = '42501');

-- Expo's answers for the first campaign (Ana's and Dani's handed over; Eli's accepted only;
-- the rest none yet), and what each did after: Ana reserves an hour after hers.
update servicio.notification_send set ticket_status = 'ok', ticket_id = 'tk-' || id, ticket_at = now(),
                                      receipt_status = 'ok', receipt_at = now()
 where campaign_id = :c1 and not test
   and token_id in (select id from servicio.push_token where token in (public._tok('ana-1'), public._tok('dani-1')));
update servicio.notification_send set ticket_status = 'ok', ticket_id = 'tk-' || id, ticket_at = now()
 where campaign_id = :c1 and not test
   and token_id = (select id from servicio.push_token where token = public._tok('eli-1'));
-- A test he sent while Eli's account was a test account, handed over: counted nowhere.
insert into servicio.campaign_tester (user_id) values (:eli);
select servicio.test_campaign(:c1) is not null as t_eli \gset
delete from servicio.campaign_tester where user_id = :eli;
update servicio.notification_send set ticket_status = 'ok', ticket_id = 'tk-' || id, ticket_at = now(),
                                      receipt_status = 'ok', receipt_at = now()
 where campaign_id = :c1 and test
   and token_id = (select id from servicio.push_token where token = public._tok('eli-1'));
-- Eli reserves two days after hers, past the 24 hours that count.
insert into public.reservation (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day,
                                held_until, payment, eat, created_at)
values ('0093cccc-0000-4000-8000-000000000006', :'ws_l', :'loc_l', '0093bbbb-0000-4000-8000-000000000001', :eli, 106,
        public._mx(:'d2' || ' 13:00'), :'d2'::date, public._mx(:'d2' || ' 14:00'), 'efectivo', 'llevar', public._mx(:'d2' || ' 12:00'));
insert into public.reservation (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day,
                                held_until, payment, eat, created_at)
values ('0093cccc-0000-4000-8000-000000000004', :'ws_l', :'loc_l', '0093bbbb-0000-4000-8000-000000000001', :ana, 104,
        public._mx(:'d' || ' 19:30'), :'d'::date, public._mx(:'d' || ' 20:30'), 'efectivo', 'llevar', public._mx(:'d' || ' 19:00')),
       ('0093cccc-0000-4000-8000-000000000005', :'ws_l', :'loc_l', '0093bbbb-0000-4000-8000-000000000001', :beto, 105,
        public._mx(:'d' || ' 19:30'), :'d'::date, public._mx(:'d' || ' 20:30'), 'efectivo', 'llevar', public._mx(:'d' || ' 19:00'));

select public.chk('7.3 the first campaign''s numbers, counted only for those counted: 3 people, 3 reached, 3 accepted, 2 handed over, 1 tap, 1 reservation within the window (Eli''s two days on is not); 2 sent uncounted (Beto, his test account); a test counted nowhere',
  (select grp = 'A' and people = 3 and reached = 3 and accepted = 3 and handed_over = 2 and tapped = 1 and acted = 1 and unmeasured = 2
     from servicio.campaign_tally(:c1))
  and (select count(*) from servicio.campaign_tally(:c1)) = 1,
  (select row_to_json(t)::text from servicio.campaign_tally(:c1) t));

-- Dani says no to counting: at once, in every campaign not yet counted.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dani), true);
set local role authenticated;
select public._call_as_me('dani-no-count', $q$ select public.set_my_consent('itacate-ajustes-medir-1', false) $q$) as r \gset
reset role;
select public.chk('7.4 a no to counting stops it at once: Dani is no longer counted in the campaigns not yet counted',
  not exists (select 1 from servicio.campaign_member where user_id = :dani and measured)
  and (select people = 2 and unmeasured = 3 from servicio.campaign_tally(:c1)));

-- Counting: the window closes 24 hours after the campaign expires (d1 23:00), once Expo
-- has answered — or 25 hours after that.
select servicio.count_campaigns(public._mx(:'d2' || ' 22:00')) as before_close \gset
select servicio.count_campaigns(public._mx(:'d2' || ' 23:30')) as awaiting \gset
select servicio.count_campaigns(public._mx(:'d4' || ' 01:00')) as counted \gset
select public.chk('7.5 counted when its window closes and Expo has said all it will: not before the window, not while answers are awaited, then once',
  :'before_close' = 0 and :'awaiting' = 0 and :'counted' >= 1
  and (select counted_at is not null from servicio.campaign where id = :c1)
  and (select grp = 'A' and people = 2 and reached = 2 and tapped = 1 and acted = 1 and unmeasured = 3
         from servicio.campaign_count where campaign_id = :c1),
  :'before_close' || ' ' || :'awaiting' || ' ' || :'counted');
select public.chk('7.6 his results: one row per group, final once counted, the two shares; no column names a person',
  (select final and grp = 'A' and people = 2 and tapped_pct = 50.0 and acted_pct = 50.0
     from servicio.campaign_results(30) where campaign_id = :c1)
  and (select bool_and(not final) from servicio.campaign_results(30) where campaign_id = :c3)
  and not exists (select 1 from pg_proc p, unnest(p.proargnames) a
                   where p.oid = 'servicio.campaign_results(integer)'::regprocedure
                     and a ~ '(user|email|name|token|buyer)'));


-- ---- 8. Held back, stopped, switched off ------------------------------------------------
-- On days of their own (D+8, D+9), past every limit the first campaigns used.
-- Held back: half, one wording.
select public._new('ofertas', 'todos', 50, '[{"key":"A","weight":100,"title":"Cuarta","body":"La cuarta."}]',
                   :'d9' || ' 00:00', :'d9' || ' 23:00') as c4 \gset
select servicio.test_campaign(:c4) is not null as t4 \gset
select servicio.launch_campaign(:c4) is not null as l4 \gset
select public._mark() as m10 \gset
select servicio.send_due_campaigns(public._mx(:'d9' || ' 12:00')) as held \gset
select public.chk('8.1 held back: each person''s group is the hash''s; the held-back group is sent nothing, the rest everyone a phone would show it',
  (select count(*) from servicio.campaign_member where campaign_id = :c4) = 8
  and not exists (select 1 from servicio.campaign_member m
                   where m.campaign_id = :c4
                     and (m.variant is distinct from servicio.campaign_variant_of(:c4, m.user_id)
                          or (m.variant is null and m.sent_at is not null)
                          or (m.variant is not null and m.sent_at is null
                              and cardinality(servicio.campaign_phones('ofertas', array[m.user_id])) > 0)
                          or (m.variant is null and exists (select 1 from servicio.notification_send s
                                                              join servicio.push_token t on t.id = s.token_id
                                                             where s.campaign_id = :c4 and not s.test and t.user_id = m.user_id)))),
  :'held' || ' ' || public._who(:c4, 'm.variant is null'));

-- Stopped, the kind off, the audience off: nothing.
select public._new('ofertas', 'todos', 0, :'a', :'d10' || ' 00:00', :'d10' || ' 23:00') as c5 \gset
select servicio.test_campaign(:c5) is not null as t5 \gset
select servicio.launch_campaign(:c5) is not null as l5 \gset
select servicio.stop_campaign(:c5) is not null as s5 \gset
select public._new('ofertas', 'todos', 0, :'a', :'d10' || ' 00:00', :'d10' || ' 23:00') as c6 \gset
select servicio.test_campaign(:c6) is not null as t6 \gset
select servicio.launch_campaign(:c6) is not null as l6 \gset
update servicio.notification_kind set is_on = false where kind = 'ofertas';
select public._mark() as m11 \gset
select servicio.send_due_campaigns(public._mx(:'d10' || ' 13:00')) as kind_off \gset
update servicio.notification_kind set is_on = true where kind = 'ofertas';
update servicio.campaign_audience set is_on = false where app = 'itacate' and audience = 'todos';
select public._mark() as m12 \gset
select servicio.send_due_campaigns(public._mx(:'d10' || ' 13:01')) as aud_off \gset
select public._new('ofertas', 'todos', 0, :'a', :'d10' || ' 00:00', :'d10' || ' 23:00') as new_aud_off \gset
update servicio.campaign_audience set is_on = true where app = 'itacate' and audience = 'todos';
select public._mark() as m13 \gset
select servicio.send_due_campaigns(public._mx(:'d10' || ' 13:02')) as back_on \gset
select public.chk('8.2 a stopped campaign sends nothing; with the kind off, or its audience off, nothing — and a draft on an audience off is refused',
  not exists (select 1 from servicio.campaign_member where campaign_id = :c5)
  and :m12 = :m11 and :m13 = :m12
  and not exists (select 1 from servicio.campaign_member where campaign_id = :c6 and sent_at < public._mx(:'d10' || ' 13:02'))
  and :'new_aud_off' = '22023'
  and (select count(*) from public._msgs(:m13)) = 4,
  :'kind_off' || ' ' || :'aud_off');
select public.chk('8.3 one a day holds across campaigns: the sixth went at 13:02, the stopped fifth never',
  public._who(:c6, 'm.sent_at is not null') = 'ana,beto,eli,yo'
  and (select stopped_at is not null from servicio.campaign where id = :c5));



-- ---- 9. What is forgotten -----------------------------------------------------------------
-- A campaign of 35 days ago, never counted, still holding Ana; another's place 29 days ago.
select public._new('ofertas', 'todos', 0, :'a', :'d' || ' 00:00', :'d1' || ' 23:00') as c_old \gset
update servicio.campaign set tested_at = now(), launched_at = now() - interval '36 days',
                             starts_at = now() - interval '36 days', expires_at = now() - interval '35 days'
 where id = :c_old;
insert into servicio.campaign_member (campaign_id, user_id, variant, measured, joined_at, sent_at)
values (:c_old, :ana, 'A', true, now() - interval '35 days', now() - interval '35 days'),
       (:c_old, :eli, 'A', true, now() - interval '29 days', now() - interval '29 days');
select servicio.forget_old_pushes() as forgot \gset
select public.chk('9.1 every night: a campaign still holding someone past 30 days is counted first, then each place in a campaign 30 days on goes; younger kept; the counts and her answers stay',
  (select counted_at is not null from servicio.campaign where id = :c_old)
  and (select people from servicio.campaign_count where campaign_id = :c_old and grp = 'A') = 2
  and not exists (select 1 from servicio.campaign_member where campaign_id = :c_old and user_id = :ana)
  and exists (select 1 from servicio.campaign_member where campaign_id = :c_old and user_id = :eli)
  and exists (select 1 from servicio.campaign_count where campaign_id = :c1)
  and (select count(*) from servicio.consent where user_id = :ana) = 2
  and (:'forgot'::jsonb ->> 'campaign_members')::int >= 1 and (:'forgot'::jsonb ->> 'counted_first')::int >= 1,
  :'forgot');
update servicio.notification_rule set keep_days = 10;
select servicio.forget_old_pushes() as forgot10 \gset
select public.chk('9.2 the days are one number: at 10, Eli''s place of 29 days ago goes too',
  not exists (select 1 from servicio.campaign_member where campaign_id = :c_old), :'forgot10');
update servicio.notification_rule set keep_days = 30;

delete from auth.users where id = :ana;
select public.chk('9.3 her account deleted: her answers, her places in campaigns and her messages go with it; the counts stay',
  not exists (select 1 from servicio.consent where user_id = :ana)
  and not exists (select 1 from servicio.campaign_member where user_id = :ana)
  and not exists (select 1 from servicio.notification_send where id = :send_ana)
  and exists (select 1 from servicio.campaign_count where campaign_id = :c1));


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
