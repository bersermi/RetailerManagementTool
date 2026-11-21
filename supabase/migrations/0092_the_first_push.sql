-- ============================================================================
-- 0092 — THE FIRST PUSH: A FONDA'S RESERVATIONS, ON HER PHONE. Plan task `10.5b-v-ii`.
--
-- Call 14, ruled 2026-11-05: each new reservation and each cancellation — the dish,
-- the hour, *para llevar* or *para comer aquí*, the method, NEVER the neighbour's
-- name — to every member of the kitchen signed in on a phone, each able to turn it
-- off in *Mi cocina*; *Apartados* shows everything, so nothing depends on it.
-- Built on `10.5c-i`'s design, whose first question the owner ruled himself on
-- 2026-11-20 (*"Yes, follow your recommendation"*): the plumbing as drawn, so every
-- later answer of his product analyst is a row, not a migration.
--
--   servicio.notification_kind       a kind of message, as a row: its app, its class, its
--                                    Android channel, the words of its switch, its default,
--                                    what a tap opens — and Wera's own on/off for it
--   servicio.push_token              one login in one app on one phone: the token, the
--                                    platform, whether the phone allows notifications and the
--                                    channels it holds and has silenced; retired at sign-out,
--                                    when Expo says the phone is gone, or when another login
--                                    takes the phone
--   servicio.notification_switch     her switch for a kind, when it differs from the default
--   servicio.notification_send       one message to one phone: pg_net's request, Expo's ticket
--                                    and its receipt; deleted after 30 days
--   servicio.notification_tap_count  a service kind's taps per day — nobody attached
--
-- ⚠️ SENT FROM POSTGRES THROUGH `pg_net`, AFTER THE COMMIT (ADR-035 §2.2, *Outbound
-- messages*, ruled 2026-10-27): no Edge Function. A new reservation is announced by a
-- DEFERRED constraint trigger — it runs at the commit of `reserve_plate`, when the
-- reservation's line (the dish) exists, and `net.http_post` only queues: a rolled-back
-- reservation sends nothing and a slow Expo holds no lock. Every function that sends
-- swallows its own error into a WARNING: a lost push is a missed message; a lost
-- reservation is a lost customer.
--
-- ⚠️ `pg_net` SENDS WITHOUT READING THE ANSWER, and ADR-035 left retiring a dead token to
-- this row: a `pg_cron` job each minute reads each request's answer from
-- `net._http_response` (kept 6 hours), writes Expo's ticket on each message, asks for
-- the receipts 15 minutes on (up to 1,000 a request) and retires a token Expo reports
-- `DeviceNotRegistered`. A receipt `ok` means Apple or Google took it — never that her
-- phone showed it, which no build can know.
--
-- ⚠️ ANDROID DROPS A PUSH FOR A CHANNEL THE PHONE HAS NOT MADE, WITHOUT A WORD (Expo's
-- message reference, read 2026-11-11): each phone tells the database the channels it
-- holds and those she silenced, and nothing is sent to one that lacks the kind's.
--
-- ⚠️ EXPO'S PUSH SECURITY: with it switched on, Expo refuses a send without the
-- project's access token; with it off, it takes anyone's. The token lives only in the
-- hosted Vault as `expo_push_access_token` (`docs/runbooks/set-expo-push-token.sh`),
-- and the sender carries it as `Authorization: Bearer …` whenever the Vault holds one.
--
-- ⚠️ A PERSON'S TABLES, NOT A BUSINESS'S (ADR-035 §2.7, *What is hers*): a push token
-- belongs to a person and to no workspace, so it sits in the closed `servicio` schema,
-- read and written only through functions keyed on `auth.uid()` — `01_rls_coverage.sql`
-- needs no policy shape of its own.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The kinds
-- ----------------------------------------------------------------------------

create table servicio.notification_kind (
  kind          text primary key,
  app           text not null,
  class         text not null,
  channel       text not null,
  channel_name  text not null,
  importance    text not null default 'normal',
  label         text not null,
  detail        text,
  default_on    boolean not null,
  is_on         boolean not null default true,
  opens         text not null,
  position      smallint not null default 0,

  constraint notification_kind_shape check (kind ~ '^[a-z_]+$'),
  constraint notification_kind_app_known check (app in ('cocina', 'itacate')),
  constraint notification_kind_class_known check (class in ('servicio', 'a_pedido', 'promocion')),
  constraint notification_kind_channel_shape check (channel ~ '^[a-z_]+$'),
  constraint notification_kind_importance_known check (importance in ('alta', 'normal', 'baja')),
  constraint notification_kind_opens_shape check (opens ~ '^[a-z_]+$'),
  constraint notification_kind_words check (btrim(label) <> '' and btrim(channel_name) <> '')
);

comment on table servicio.notification_kind is
  'A kind of message, as a row (10.5c-i): its app, its class (servicio follows her action; '
  'a_pedido she asked for, per kitchen; promocion needs her express yes), the Android channel '
  'it arrives on and that channel''s name in her phone''s settings, the words of its switch, '
  'its default, what a tap opens, and is_on — Wera''s own switch for the kind, for everyone. '
  'A new kind in a class the aviso already names is a row. 0092, plan 10.5b-v-ii.';

insert into servicio.notification_kind
  (kind, app, class, channel, channel_name, importance, label, detail, default_on, opens, position)
values
  ('apartados', 'cocina', 'servicio', 'apartados', 'Apartados', 'alta',
   'Avisos de apartados', 'Cada apartado nuevo y cada cancelación.', true, 'apartados', 1);


-- ----------------------------------------------------------------------------
-- 2. A phone's token, her switches, each message, the taps
-- ----------------------------------------------------------------------------

create table servicio.push_token (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  app         text not null,
  token       text not null,
  platform    text not null,
  allowed     boolean not null,
  channels    text[] not null default '{}',
  silenced    text[] not null default '{}',
  created_at  timestamptz not null default now(),
  seen_at     timestamptz not null default now(),
  retired_at  timestamptz,
  retired_why text,

  constraint push_token_app_known check (app in ('cocina', 'itacate')),
  constraint push_token_platform_known check (platform in ('ios', 'android')),
  constraint push_token_shape check (token ~ '^Expo(nent)?PushToken\[[^]\s]{1,190}\]$'),
  constraint push_token_retired_why_known check (
    (retired_at is null and retired_why is null)
    or (retired_at is not null and retired_why in ('cerro_sesion', 'telefono_ya_no', 'otra_cuenta', 'otro_token')))
);

-- ⚠️ ONE LIVE ROW PER PHONE AND APP: a second login registering the same token takes the
-- phone, and this index is what makes that the only way.
create unique index push_token_live_unique on servicio.push_token (app, token) where retired_at is null;
create index push_token_live_by_user_idx on servicio.push_token (user_id) where retired_at is null;

comment on table servicio.push_token is
  'One login in one app on one phone: Expo''s token, the platform, whether the phone allows '
  'notifications, the Android channels it holds and those she silenced (an iPhone has none). '
  'Sent by the app on each open and when the token changes; retired at Cerrar sesión '
  '(cerro_sesion), when Expo reports the phone gone (telefono_ya_no), when another login '
  'takes the phone (otra_cuenta) or when the phone''s token changes (otro_token); a retired '
  'row is deleted 30 days on. 0092, plan 10.5b-v-ii.';

create table servicio.notification_switch (
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null references servicio.notification_kind (kind) on delete cascade,
  is_on      boolean not null,
  changed_at timestamptz not null default now(),

  constraint notification_switch_pkey primary key (user_id, kind)
);

comment on table servicio.notification_switch is
  'Her switch for one kind, when she changed it: the server reads it before every send, so '
  'nothing she turned off is sent. Per person — every phone of hers. 0092, plan 10.5b-v-ii.';

create table servicio.notification_send (
  id                 bigint generated always as identity primary key,
  kind               text not null references servicio.notification_kind (kind) on delete cascade,
  token_id           uuid not null references servicio.push_token (id) on delete cascade,
  message            jsonb not null,
  sent_at            timestamptz not null default now(),
  request_id         bigint,
  request_pos        smallint,
  ticket_status      text,
  ticket_id          text,
  ticket_error       text,
  ticket_at          timestamptz,
  receipt_request_id bigint,
  receipt_asked_at   timestamptz,
  receipt_status     text,
  receipt_error      text,
  receipt_at         timestamptz,

  constraint notification_send_ticket_known check (ticket_status in ('ok', 'error', 'perdido')),
  constraint notification_send_receipt_known check (receipt_status in ('ok', 'error', 'perdido'))
);

create index notification_send_awaiting_ticket_idx
  on servicio.notification_send (request_id) where ticket_status is null;
create index notification_send_awaiting_receipt_idx
  on servicio.notification_send (ticket_at) where ticket_status = 'ok' and receipt_status is null;
create index notification_send_by_token_idx on servicio.notification_send (token_id);
create index notification_send_by_moment_idx on servicio.notification_send (sent_at);

comment on table servicio.notification_send is
  'One message to one phone: its kind, what it said (never a name), pg_net''s request and the '
  'message''s place in it, Expo''s ticket (ok, error, or perdido when pg_net forgot the answer) '
  'and its receipt (ok — handed to Apple or Google, never "shown" — error, or perdido after '
  'Expo''s 24 hours). Read back by servicio.read_push_answers each minute; deleted after 30 '
  'days by servicio.forget_old_pushes. 0092, plan 10.5b-v-ii.';

create table servicio.notification_tap_count (
  kind text not null references servicio.notification_kind (kind) on delete cascade,
  day  date not null,
  taps integer not null default 0,

  constraint notification_tap_count_pkey primary key (kind, day),
  constraint notification_tap_count_positive check (taps >= 0)
);

comment on table servicio.notification_tap_count is
  'Taps on a service kind, per day in Mexico City — an event counted, nobody attached. '
  '0092, plan 10.5b-v-ii.';

revoke all on servicio.notification_kind      from public, anon, authenticated;
revoke all on servicio.push_token             from public, anon, authenticated;
revoke all on servicio.notification_switch    from public, anon, authenticated;
revoke all on servicio.notification_send      from public, anon, authenticated;
revoke all on servicio.notification_tap_count from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. What the phone calls — keyed on her own id
-- ----------------------------------------------------------------------------

-- Her kinds in one app, each with her switch, in the order the app draws them. A kind
-- Wera switched off is not offered.
create function servicio.kinds_of(p_user uuid, p_app text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', k.kind,
           'class', k.class,
           'channel', k.channel,
           'channel_name', k.channel_name,
           'importance', k.importance,
           'label', k.label,
           'detail', k.detail,
           'opens', k.opens,
           'is_on', coalesce(s.is_on, k.default_on))
         order by k.position, k.kind), '[]'::jsonb)
    from servicio.notification_kind k
    left join servicio.notification_switch s on s.user_id = p_user and s.kind = k.kind
   where k.app = p_app and k.is_on
$$;

revoke all on function servicio.kinds_of(uuid, text) from public, anon, authenticated;

create function public.my_notification_kinds(p_app text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'my_notification_kinds requires an authenticated caller' using errcode = '42501';
  end if;
  if p_app is null or p_app not in ('cocina', 'itacate') then
    raise exception 'my_notification_kinds: the app is cocina or itacate' using errcode = '22023';
  end if;
  return servicio.kinds_of(auth.uid(), p_app);
end;
$$;

comment on function public.my_notification_kinds(text) is
  'The kinds of message of one app (cocina, itacate) Wera has on, each with its Android '
  'channel and that channel''s name and importance, the words of its switch, what a tap '
  'opens, and her switch (is_on: hers, else the default) — what the app makes its channels '
  'and draws its switches from. 42501 signed out, 22023 an app it does not know. Keyed on '
  'auth.uid(). 0092, plan 10.5b-v-ii.';

-- Her switch for a service kind. Answers her kinds of that app, as now held.
create function public.set_notification_switch(p_kind text, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_kind servicio.notification_kind;
begin
  if v_user is null then
    raise exception 'set_notification_switch requires an authenticated caller' using errcode = '42501';
  end if;
  select * into v_kind from servicio.notification_kind k where k.kind = p_kind and k.is_on;
  if not found or p_on is null then
    raise exception 'set_notification_switch: no such kind, or no answer' using errcode = '22023';
  end if;
  -- ⚠️ A PROMOTION IS NEVER TURNED ON HERE: it needs her express yes, kept as a record
  -- (10.5c-ii); asking for something on request is per kitchen (10.9h).
  if v_kind.class <> 'servicio' then
    raise exception 'set_notification_switch: only a service kind is switched here' using errcode = '22023';
  end if;

  insert into servicio.notification_switch as s (user_id, kind, is_on)
  values (v_user, p_kind, p_on)
  on conflict (user_id, kind) do update
     set is_on      = excluded.is_on,
         changed_at = case when s.is_on is distinct from excluded.is_on then now() else s.changed_at end;

  return servicio.kinds_of(v_user, v_kind.app);
end;
$$;

comment on function public.set_notification_switch(text, boolean) is
  'The caller turns a service kind on or off for herself, on every phone of hers; the sender '
  'reads it before every message. Answers her kinds of that app (my_notification_kinds''s '
  'answer). 42501 signed out, 22023 no such kind (or Wera switched it off), no answer, or a '
  'kind that is not a service one. Keyed on auth.uid(). 0092, plan 10.5b-v-ii.';

-- This phone's token, sent on each open and when it changes.
create function public.register_push_token(
  p_app      text,
  p_token    text,
  p_platform text,
  p_allowed  boolean,
  p_channels text[] default '{}',
  p_silenced text[] default '{}',
  p_replaces text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'register_push_token requires an authenticated caller' using errcode = '42501';
  end if;
  if p_app is null or p_app not in ('cocina', 'itacate')
     or p_platform is null or p_platform not in ('ios', 'android')
     or p_allowed is null
     or p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^]\s]{1,190}\]$'
     or (p_replaces is not null and p_replaces !~ '^Expo(nent)?PushToken\[[^]\s]{1,190}\]$')
     or cardinality(coalesce(p_channels, '{}')) > 20 or cardinality(coalesce(p_silenced, '{}')) > 20
     or exists (select 1 from unnest(coalesce(p_channels, '{}') || coalesce(p_silenced, '{}')) c
                 where c is null or c !~ '^[A-Za-z0-9_.-]{1,64}$') then
    raise exception 'register_push_token: an app, a platform, an answer and an Expo push token, and at most 20 channels'
      using errcode = '22023';
  end if;

  -- Her phone's token changed: the old one stops.
  if p_replaces is not null and p_replaces <> p_token then
    update servicio.push_token t
       set retired_at = now(), retired_why = 'otro_token'
     where t.app = p_app and t.token = p_replaces and t.user_id = v_user and t.retired_at is null;
  end if;

  -- ⚠️ ANOTHER LOGIN TAKES THE PHONE: whoever signed in on it before stops getting her
  -- kitchen's messages on it, whether or not her sign-out reached the database.
  update servicio.push_token t
     set retired_at = now(), retired_why = 'otra_cuenta'
   where t.app = p_app and t.token = p_token and t.user_id <> v_user and t.retired_at is null;

  update servicio.push_token t
     set platform = p_platform,
         allowed  = p_allowed,
         channels = coalesce(p_channels, '{}'),
         silenced = coalesce(p_silenced, '{}'),
         seen_at  = now()
   where t.app = p_app and t.token = p_token and t.user_id = v_user and t.retired_at is null;
  if not found then
    insert into servicio.push_token (user_id, app, token, platform, allowed, channels, silenced)
    values (v_user, p_app, p_token, p_platform, p_allowed, coalesce(p_channels, '{}'), coalesce(p_silenced, '{}'));
  end if;
end;
$$;

comment on function public.register_push_token(text, text, text, boolean, text[], text[], text) is
  'This phone''s Expo push token for the caller in one app, sent on each open and when it '
  'changes: the platform, whether the phone allows notifications, the Android channels it '
  'holds and those she silenced (an iPhone sends none), and the token it replaces, if any. '
  'Retires the same token under any other login (another login takes the phone) and the '
  'replaced one. 42501 signed out, 22023 a shape it refuses. Keyed on auth.uid(). 0092, plan '
  '10.5b-v-ii.';

-- *Cerrar sesión*: this phone stops getting her messages.
create function public.retire_push_token(p_app text, p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'retire_push_token requires an authenticated caller' using errcode = '42501';
  end if;
  if p_app is null or p_token is null then
    raise exception 'retire_push_token: an app and a token' using errcode = '22023';
  end if;
  update servicio.push_token t
     set retired_at = now(), retired_why = 'cerro_sesion'
   where t.app = p_app and t.token = p_token and t.user_id = auth.uid() and t.retired_at is null;
end;
$$;

comment on function public.retire_push_token(text, text) is
  'Cerrar sesión: the caller''s live token for that phone and app is retired, so nothing more '
  'is sent to it for her. A token not hers, or already retired, changes nothing. 42501 signed '
  'out, 22023 no app or token. Keyed on auth.uid(). 0092, plan 10.5b-v-ii.';

-- A tap on a service kind: plus one on today's count, with nobody attached.
create function public.count_notification_tap(p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'count_notification_tap requires an authenticated caller' using errcode = '42501';
  end if;
  if not exists (select 1 from servicio.notification_kind k where k.kind = p_kind and k.class = 'servicio') then
    raise exception 'count_notification_tap: no such service kind' using errcode = '22023';
  end if;
  insert into servicio.notification_tap_count as c (kind, day, taps)
  values (p_kind, (now() at time zone 'America/Mexico_City')::date, 1)
  on conflict (kind, day) do update set taps = c.taps + 1;
end;
$$;

comment on function public.count_notification_tap(text) is
  'One tap on a message of a service kind: plus one on that kind''s count for today in Mexico '
  'City. Who tapped is not kept — an event counted, never a person (10.5c-i). 42501 signed '
  'out, 22023 not a service kind. 0092, plan 10.5b-v-ii.';


-- ----------------------------------------------------------------------------
-- 4. The sender
-- ----------------------------------------------------------------------------

-- Who gets a kind about one business: every active member's live, allowed phone in the
-- kind's app, her switch on, the kind on, the phone holding the kind's channel unsilenced
-- (an iPhone has none) — never the person who did it.
create function servicio.push_recipients(p_workspace_id uuid, p_kind text, p_except uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(t.id order by t.id), '{}')
    from servicio.notification_kind k
    join public.workspace_member m on m.workspace_id = p_workspace_id and m.is_active
    join servicio.push_token t on t.user_id = m.user_id and t.app = k.app
                              and t.retired_at is null and t.allowed
    left join servicio.notification_switch s on s.user_id = m.user_id and s.kind = k.kind
   where k.kind = p_kind
     and k.is_on
     and coalesce(s.is_on, k.default_on)
     and m.user_id is distinct from p_except
     and (t.platform = 'ios' or (k.channel = any(t.channels) and not k.channel = any(t.silenced)))
$$;

revoke all on function servicio.push_recipients(uuid, text, uuid) from public, anon, authenticated;

-- The headers every request to Expo carries — its access token when the Vault holds one.
create function servicio.expo_headers()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select s.decrypted_secret into v_token
    from vault.decrypted_secrets s
   where s.name = 'expo_push_access_token'
   limit 1;
  return jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
      || case when btrim(coalesce(v_token, '')) = '' then '{}'::jsonb
              else jsonb_build_object('Authorization', 'Bearer ' || btrim(v_token)) end;
end;
$$;

revoke all on function servicio.expo_headers() from public, anon, authenticated;

-- Queues one kind's message to these phones, 100 to a request (Expo's limit), and writes
-- one row per message with its request and its place in it. Answers how many it queued.
create function servicio.push_send(p_kind text, p_tokens uuid[], p_title text, p_body text, p_data jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind    servicio.notification_kind;
  v_headers jsonb;
  v_ids     uuid[];
  v_tokens  text[];
  v_request bigint;
  v_message jsonb := jsonb_build_object('title', p_title, 'body', p_body, 'data', coalesce(p_data, '{}'::jsonb));
  v_n       integer := 0;
  v_from    integer;
begin
  select * into v_kind from servicio.notification_kind k where k.kind = p_kind;
  if not found or not v_kind.is_on or coalesce(cardinality(p_tokens), 0) = 0 then
    return 0;
  end if;
  v_headers := servicio.expo_headers();

  for v_from in 1 .. cardinality(p_tokens) by 100 loop
    select array_agg(t.id order by t.id), array_agg(t.token order by t.id)
      into v_ids, v_tokens
      from servicio.push_token t
     where t.id = any(p_tokens[v_from : v_from + 99]) and t.retired_at is null;
    continue when v_ids is null;

    v_request := net.http_post(
      url                  := 'https://exp.host/--/api/v2/push/send',
      body                 := (select jsonb_agg(v_message || jsonb_build_object(
                                                  'to', x.token,
                                                  'channelId', v_kind.channel,
                                                  'sound', 'default',
                                                  'priority', 'high')
                                                order by x.n)
                                 from unnest(v_tokens) with ordinality as x (token, n)),
      headers              := v_headers,
      timeout_milliseconds := 10000
    );

    insert into servicio.notification_send (kind, token_id, message, request_id, request_pos)
    select p_kind, x.id, v_message, v_request, (x.n - 1)::smallint
      from unnest(v_ids) with ordinality as x (id, n);
    v_n := v_n + cardinality(v_ids);
  end loop;
  return v_n;
end;
$$;

comment on function servicio.push_send(text, uuid[], text, text, jsonb) is
  'Queues one message of a kind to these phones through pg_net (after the commit), 100 to a '
  'request, on the kind''s Android channel, with Expo''s access token when the Vault holds '
  'expo_push_access_token; one notification_send row per message. Granted to nobody: '
  'called by the triggers of 0092. 0092, plan 10.5b-v-ii.';

revoke all on function servicio.push_send(text, uuid[], text, text, jsonb) from public, anon, authenticated;

-- When, as a message says it, in the kitchen's zone: *las 14:30*, *mañana a las 14:30*,
-- *el 24 de noviembre a las 14:30*.
create function servicio.push_when(p_at timestamptz, p_zone text, p_now timestamptz default now())
returns text
language sql
stable
set search_path = ''
as $$
  select case
           when (p_at at time zone z)::date = (p_now at time zone z)::date
             then 'las ' || to_char(p_at at time zone z, 'HH24:MI')
           when (p_at at time zone z)::date = (p_now at time zone z)::date + 1
             then 'mañana a las ' || to_char(p_at at time zone z, 'HH24:MI')
           else 'el ' || extract(day from p_at at time zone z)::integer || ' de '
                || (array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                          'septiembre', 'octubre', 'noviembre', 'diciembre'])
                     [extract(month from p_at at time zone z)::integer]
                || ' a las ' || to_char(p_at at time zone z, 'HH24:MI')
         end
    from (select coalesce(nullif(p_zone, ''), 'America/Mexico_City') as z) zone
$$;

revoke all on function servicio.push_when(timestamptz, text, timestamptz) from public, anon, authenticated;

-- What a reservation holds, as a message says it: *Comida corrida*, *2 × Mole*, *Mole y 1 más*.
create function servicio.reservation_dish(p_reservation_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) = 0 then 'Un apartado'
              else max(case when rl.line_no = first_line
                            then case when rl.quantity = 1 then ll.name
                                      else trim_scale(rl.quantity)::text || ' × ' || ll.name end
                       end)
                   || case when count(*) > 1 then ' y ' || (count(*) - 1) || ' más' else '' end
         end
    from public.reservation_line rl
    join public.listing_line ll on ll.id = rl.listing_line_id
    cross join (select min(line_no) as first_line from public.reservation_line
                 where reservation_id = p_reservation_id) f
   where rl.reservation_id = p_reservation_id
$$;

revoke all on function servicio.reservation_dish(uuid) from public, anon, authenticated;

-- A new reservation, at the commit of `reserve_plate` — when its line, the dish, exists.
create function servicio.push_reservation_made()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r      public.reservation;
  v_tokens uuid[];
  v_zone   text;
begin
  -- Read again at the commit: a reservation cancelled or gone in the same transaction
  -- announces nothing.
  select * into v_r from public.reservation r where r.id = new.id;
  if not found or v_r.cancelled_at is not null then
    return null;
  end if;
  v_tokens := servicio.push_recipients(v_r.workspace_id, 'apartados', v_r.buyer_id);
  if cardinality(v_tokens) = 0 then
    return null;
  end if;
  select l.timezone into v_zone from public.location l where l.id = v_r.location_id;

  perform servicio.push_send(
    'apartados', v_tokens,
    'Nuevo apartado',
    format('%s para %s · %s · %s',
           servicio.reservation_dish(v_r.id),
           servicio.push_when(v_r.pickup_at, v_zone),
           case v_r.eat when 'aqui' then 'para comer aquí' else 'para llevar' end,
           v_r.payment),
    jsonb_build_object('kind', 'apartados', 'opens', 'apartados', 'workspace_id', v_r.workspace_id));
  return null;
exception when others then
  raise warning 'servicio.push_reservation_made: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

revoke all on function servicio.push_reservation_made() from public, anon, authenticated;

-- ⚠️ DEFERRED TO THE COMMIT: `reserve_plate` inserts the reservation, then its line. A
-- plain AFTER INSERT trigger would run between the two and could not name the dish.
create constraint trigger push_reservation_made
  after insert on public.reservation
  deferrable initially deferred
  for each row execute function servicio.push_reservation_made();

-- A cancellation — hers, her account's deletion, or the kitchen's (never to the member
-- who cancelled it).
create function servicio.push_reservation_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tokens   uuid[];
  v_zone     text;
  v_on_offer boolean;
begin
  v_tokens := servicio.push_recipients(new.workspace_id, 'apartados', coalesce(new.cancelled_by, new.buyer_id));
  if cardinality(v_tokens) = 0 then
    return null;
  end if;
  select l.timezone into v_zone from public.location l where l.id = new.location_id;
  -- Back on offer only while the offer stands: not taken down, its window still open.
  select li.withdrawn_at is null and li.pickup_end > now() into v_on_offer
    from public.listing li where li.id = new.listing_id;

  perform servicio.push_send(
    'apartados', v_tokens,
    'Se canceló un apartado',
    format('%s de %s', servicio.reservation_dish(new.id), servicio.push_when(new.pickup_at, v_zone))
      || case when coalesce(v_on_offer, false) then ' · está otra vez en oferta' else '' end,
    jsonb_build_object('kind', 'apartados', 'opens', 'apartados', 'workspace_id', new.workspace_id));
  return null;
exception when others then
  raise warning 'servicio.push_reservation_cancelled: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

revoke all on function servicio.push_reservation_cancelled() from public, anon, authenticated;

create trigger push_reservation_cancelled
  after update of cancelled_at on public.reservation
  for each row
  when (old.cancelled_at is null and new.cancelled_at is not null)
  execute function servicio.push_reservation_cancelled();


-- ----------------------------------------------------------------------------
-- 5. Expo's answers, read back each minute
-- ----------------------------------------------------------------------------

-- One message's ticket, out of pg_net's answer to the request that carried it. A request
-- that failed whole is an error on every message in it.
create function servicio.expo_ticket(
  p_status_code integer, p_content text, p_timed_out boolean, p_error_msg text, p_pos integer,
  out status text, out ticket text, out error text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v    jsonb;
  v_it jsonb;
begin
  if coalesce(p_timed_out, false) or p_status_code is null then
    status := 'error';
    error  := case when coalesce(p_timed_out, false) then 'timeout' else coalesce(left(p_error_msg, 200), 'no_answer') end;
    return;
  end if;
  begin
    v := p_content::jsonb;
  exception when others then
    v := null;
  end;
  if p_status_code <> 200 or v is null then
    status := 'error';
    error  := coalesce(v #>> '{errors,0,code}', 'http_' || p_status_code);
    return;
  end if;
  v_it := case jsonb_typeof(v -> 'data')
            when 'array'  then v -> 'data' -> p_pos
            when 'object' then case when p_pos = 0 then v -> 'data' end
          end;
  if v_it is null then
    status := 'error';
    error  := 'no_ticket';
  elsif v_it ->> 'status' = 'ok' and coalesce(v_it ->> 'id', '') <> '' then
    status := 'ok';
    ticket := v_it ->> 'id';
  else
    status := 'error';
    error  := left(coalesce(v_it #>> '{details,error}', v_it ->> 'message', 'error'), 200);
  end if;
end;
$$;

revoke all on function servicio.expo_ticket(integer, text, boolean, text, integer) from public, anon, authenticated;

-- One ticket's receipt, out of pg_net's answer to a getReceipts request. NULL status:
-- Expo has none for it yet (or the request failed) — asked again.
create function servicio.expo_receipt(
  p_status_code integer, p_content text, p_ticket text,
  out status text, out error text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v    jsonb;
  v_it jsonb;
begin
  if p_status_code is distinct from 200 then
    return;
  end if;
  begin
    v := p_content::jsonb;
  exception when others then
    return;
  end;
  v_it := v -> 'data' -> p_ticket;
  if v_it is null or jsonb_typeof(v_it) <> 'object' then
    return;
  end if;
  if v_it ->> 'status' = 'ok' then
    status := 'ok';
  else
    status := 'error';
    error  := left(coalesce(v_it #>> '{details,error}', v_it ->> 'message', 'error'), 200);
  end if;
end;
$$;

revoke all on function servicio.expo_receipt(integer, text, text) from public, anon, authenticated;

-- The job each minute: tickets, receipts asked and read, gone phones retired.
create function servicio.read_push_answers()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tickets  integer := 0;
  v_receipts integer := 0;
  v_retired  integer := 0;
  v_lost     integer := 0;
  v_n        integer;
  v_ids      text[];
  v_request  bigint;
begin
  -- 1. Tickets: each message's answer, from its request's.
  with answered as (
    select s.id, t.status, t.ticket, t.error
      from servicio.notification_send s
      join net._http_response h on h.id = s.request_id
     cross join lateral servicio.expo_ticket(h.status_code, h.content, h.timed_out, h.error_msg, s.request_pos) t
     where s.ticket_status is null and s.request_id is not null
  )
  update servicio.notification_send s
     set ticket_status = a.status, ticket_id = a.ticket, ticket_error = a.error, ticket_at = now()
    from answered a
   where s.id = a.id;
  get diagnostics v_tickets = row_count;

  -- pg_net keeps an answer 6 hours; none by then, none ever.
  update servicio.notification_send s
     set ticket_status = 'perdido', ticket_at = now()
   where s.ticket_status is null and s.sent_at < now() - interval '6 hours';
  get diagnostics v_n = row_count;
  v_lost := v_lost + v_n;

  -- 2. Receipts asked for earlier: those Expo answered.
  with answered as (
    select s.id, r.status, r.error
      from servicio.notification_send s
      join net._http_response h on h.id = s.receipt_request_id
     cross join lateral servicio.expo_receipt(h.status_code, h.content, s.ticket_id) r
     where s.receipt_status is null and s.receipt_request_id is not null
  )
  update servicio.notification_send s
     set receipt_status = a.status, receipt_error = a.error, receipt_at = now()
    from answered a
   where s.id = a.id and a.status is not null;
  get diagnostics v_receipts = row_count;

  -- Asked and not answered — its answer came without this receipt, or never came: ask again.
  update servicio.notification_send s
     set receipt_request_id = null
   where s.receipt_status is null and s.receipt_request_id is not null
     and (exists (select 1 from net._http_response h where h.id = s.receipt_request_id)
          or s.receipt_asked_at < now() - interval '10 minutes');

  -- Expo keeps a receipt 24 hours; none by then, none ever.
  update servicio.notification_send s
     set receipt_status = 'perdido', receipt_at = now()
   where s.ticket_status = 'ok' and s.receipt_status is null and s.ticket_at < now() - interval '24 hours';
  get diagnostics v_n = row_count;
  v_lost := v_lost + v_n;

  -- 3. A phone Expo says is gone stops getting anything.
  update servicio.push_token t
     set retired_at = now(), retired_why = 'telefono_ya_no'
   where t.retired_at is null
     and exists (select 1 from servicio.notification_send s
                  where s.token_id = t.id
                    and 'DeviceNotRegistered' in (s.ticket_error, s.receipt_error));
  get diagnostics v_retired = row_count;

  -- 4. Receipts to ask for: tickets 15 minutes old, 1,000 to a request.
  select array_agg(q.ticket_id) into v_ids
    from (select s.ticket_id
            from servicio.notification_send s
           where s.ticket_status = 'ok' and s.receipt_status is null and s.receipt_request_id is null
             and s.ticket_at <= now() - interval '15 minutes'
           order by s.ticket_at
           limit 1000) q;
  if v_ids is not null then
    v_request := net.http_post(
      url                  := 'https://exp.host/--/api/v2/push/getReceipts',
      body                 := jsonb_build_object('ids', to_jsonb(v_ids)),
      headers              := servicio.expo_headers(),
      timeout_milliseconds := 10000
    );
    update servicio.notification_send s
       set receipt_request_id = v_request, receipt_asked_at = now()
     where s.ticket_id = any(v_ids) and s.receipt_status is null and s.receipt_request_id is null;
  end if;

  return jsonb_build_object('tickets', v_tickets, 'receipts', v_receipts, 'retired', v_retired,
                            'lost', v_lost, 'receipts_asked', coalesce(cardinality(v_ids), 0));
end;
$$;

comment on function servicio.read_push_answers() is
  'Run each minute by pg_cron (read-push-answers): writes each message''s ticket from pg_net''s '
  'answer (perdido after 6 hours with none), asks Expo for the receipts of tickets 15 minutes '
  'old (1,000 a request) and writes them (perdido after 24 hours), and retires every token '
  'Expo reported DeviceNotRegistered. Answers what it did. Granted to nobody. 0092, plan '
  '10.5b-v-ii.';

revoke all on function servicio.read_push_answers() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 6. What is forgotten, every night
-- ----------------------------------------------------------------------------

create function servicio.forget_old_pushes()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sends  integer;
  v_tokens integer;
begin
  delete from servicio.notification_send s where s.sent_at < now() - interval '30 days';
  get diagnostics v_sends = row_count;
  delete from servicio.push_token t where t.retired_at < now() - interval '30 days';
  get diagnostics v_tokens = row_count;
  return jsonb_build_object('sends', v_sends, 'tokens', v_tokens);
end;
$$;

comment on function servicio.forget_old_pushes() is
  'Run every night by pg_cron (forget-old-pushes): deletes each message''s row 30 days after it '
  'was sent and each retired token 30 days after it was retired; the tap counts, which name '
  'nobody, stay. Granted to nobody. 0092, plan 10.5b-v-ii.';

revoke all on function servicio.forget_old_pushes() from public, anon, authenticated;

-- ⚠️ pg_cron NEVER CLEANS ITS OWN HISTORY: a job each minute leaves 1,440 rows a day.
create function servicio.trim_cron_history()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  delete from cron.job_run_details d where d.end_time < now() - interval '7 days';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

comment on function servicio.trim_cron_history() is
  'Run every night by pg_cron (trim-cron-history): deletes the run history of every job '
  'older than 7 days — pg_cron keeps it for ever, and read-push-answers runs each minute. '
  'Granted to nobody. 0092, plan 10.5b-v-ii.';

revoke all on function servicio.trim_cron_history() from public, anon, authenticated;

-- `cron.schedule` with a name replaces a job of that name. 09:2x UTC is 03:2x in
-- Mexico City, beside the other nightly jobs.
select cron.schedule('read-push-answers', '* * * * *', 'select servicio.read_push_answers()');
select cron.schedule('forget-old-pushes', '25 9 * * *', 'select servicio.forget_old_pushes()');
select cron.schedule('trim-cron-history', '27 9 * * *', 'select servicio.trim_cron_history()');


-- ----------------------------------------------------------------------------
-- 7. The doors
-- ----------------------------------------------------------------------------

revoke all on function public.my_notification_kinds(text)                                    from public, anon;
revoke all on function public.set_notification_switch(text, boolean)                         from public, anon;
revoke all on function public.register_push_token(text, text, text, boolean, text[], text[], text) from public, anon;
revoke all on function public.retire_push_token(text, text)                                  from public, anon;
revoke all on function public.count_notification_tap(text)                                   from public, anon;

grant execute on function public.my_notification_kinds(text)                                    to authenticated;
grant execute on function public.set_notification_switch(text, boolean)                         to authenticated;
grant execute on function public.register_push_token(text, text, text, boolean, text[], text[], text) to authenticated;
grant execute on function public.retire_push_token(text, text)                                  to authenticated;
grant execute on function public.count_notification_tap(text)                                   to authenticated;
