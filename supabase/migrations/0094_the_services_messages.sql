-- ============================================================================
-- 0094 — THE SERVICES' MESSAGES, IN THE DATABASE. Plan task `10.9h-i` (the database
-- half of `10.9h`, split 2026-11-21 on size).
--
-- ⚠️ BUILT AHEAD OF HIS PRODUCT ANALYST'S ANSWERS (the owner's ruling of 2026-11-20,
-- *"Yes, follow your recommendation"*): each moment of the decisions block's row *The
-- services' messages* is a KIND — a row of `servicio.notification_kind` (`0092`) with
-- its own on/off (`is_on`, Wera's switch for everyone) and ITS TIMING AS DATA (four
-- columns added below) — and the row's recommendation is its default:
--   (1) `publico`        Itacate · on request: a kitchen she rang the bell of publishes;
--                        several within the hour (`hold_minutes` 60) as one message;
--                        one a kitchen a day (`notification_rule.request_per_day`, `0093`)
--   (2) `promocion_cocina` Itacate · promotion: a promotion's one alert to its kitchen's
--                        followers — her yes, the hours and the limits of a promotion
--                        (questions 2 and 3, `0093`). ⚠️ WRITTEN DARK, as `0093`'s two
--                        promotion kinds: whether promotions are sent is hers to rule
--   (3) `premio`         Itacate · service: *¡Ganaste …!* when her last stamp lands
--   (4) `sellos`         Itacate · service: once, `days_before` (7) before her stamps go,
--                        at `send_at` (11:00); never on a card that keeps them (*Nunca*)
--   (5) `tarjeta_cambio` Itacate · service: a card closing, or its kitchen leaving
--                        Itacate, while she holds its stamps or rewards
--   (6) *Nuevo apartado* to every member's phone, each with her own switch — BUILT BY
--       `0092` (`10.5b-v-ii`) as drawn; nothing here
--   (7) `primera_oferta` Wera Cocina · service: one nudge, at `send_at` (12:00) on her
--                        kitchen's `on_day` (2nd) day with no offer yet, then never
--
-- ⚠️ HER ANSWERS ARE UPDATES, NEVER MIGRATIONS — and the CLASS IS ONE OF THEM. What a
-- message needs before it goes is read from its kind's class at the moment it goes:
--   servicio   her switch for the kind (else its default)
--   a_pedido   her switch, the bell on for that kitchen, one a kitchen a day
--   promocion  her latest yes for `promociones`, inside the hours, under the day's and
--              the week's limits — counted together with every campaign of the app
-- so *"the reminder is a promotion"* (the row's *Against*) is
-- `update servicio.notification_kind set class = 'promocion' where kind = 'sellos'`, and
-- *"the alert goes only to those who rang the bell"* (the family-shell drawing's reading)
-- is `set class = 'a_pedido', default_on = true` on `promocion_cocina` (a promotion's
-- default is never read — her yes is; an on-request kind's is her switch until she
-- touches it).
--
--   servicio.notice  one message owed to one person — queued by the moment that makes
--                    it (a trigger, a door, or the job each minute), gated and sent by
--                    `servicio.send_due_notices` each minute, kept `keep_days` (30)
--
-- ⚠️ SENT FROM POSTGRES THROUGH `pg_net` (ADR-035 §2.2), by `0092`'s `push_send`, on the
-- kind's Android channel, only to a phone that will show it; Expo's answers are read
-- back by `0092`'s `read-push-answers`, unchanged. A moment that writes the business's
-- own rows (a publication, a reward, a card closed, a kitchen deleted) only QUEUES —
-- every trigger swallows its own error into a WARNING: a lost message is a missed
-- message, a lost publication is a lost customer.
--
-- ⚠️ A PERSON'S TABLE (ADR-035 §2.7, *What is hers*): `servicio.notice` sits in the
-- closed `servicio` schema; the phone reaches two new functions — the kitchen's owner
-- announcing a promotion, and whether that is offered — keyed on `auth.uid()`.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): a table,
-- four defaulted columns, six rows, four triggers, a job and their functions added; five
-- functions re-made with their signatures and answers unchanged — `push_send` (the
-- priority from the kind), `set_notification_switch` and `count_notification_tap` (an
-- on-request kind too), `send_due_campaigns` (its limits count the alerts too) and
-- `forget_old_pushes` (the notices too).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Each moment's timing, as data — on its kind's row
-- ----------------------------------------------------------------------------

alter table servicio.notification_kind
  add column hold_minutes smallint,
  add column days_before  smallint,
  add column send_at      time,
  add column on_day       smallint,
  add column min_days     smallint,
  add constraint notification_kind_hold_minutes check (hold_minutes between 0 and 1440),
  add constraint notification_kind_days_before check (days_before between 1 and 60),
  add constraint notification_kind_on_day check (on_day between 2 and 30),
  add constraint notification_kind_min_days check (min_days between 1 and 365);

comment on column servicio.notification_kind.hold_minutes is
  'A kind whose messages to one person are held this many minutes after her last one and then '
  'sent as one (the bell, publico: 60). NULL — each goes alone. 0094, plan 10.9h-i.';
comment on column servicio.notification_kind.days_before is
  'How many days before her stamps go the reminder is sent (sellos: 7). 0094, plan 10.9h-i.';
comment on column servicio.notification_kind.send_at is
  'The hour, in notification_rule.zone, a message the clock makes goes from (sellos: 11:00; '
  'primera_oferta: 12:00). 0094, plan 10.9h-i.';
comment on column servicio.notification_kind.on_day is
  'On which day of her kitchen''s life, with no offer yet, the nudge goes (primera_oferta: 2 — '
  'her second day). 0094, plan 10.9h-i.';
comment on column servicio.notification_kind.min_days is
  'No reminder for a card whose days are fewer than this (sellos: NULL — every card that loses '
  'its stamps). 0094, plan 10.9h-i.';

-- ⚠️ THE ANALYST'S DEFAULTS: the decisions block's recommendations. Words as the apps
-- already say them (Itacate's `strings.ts`: *con la campana encendida*, *Vence el … si no
-- vienes*, *¡Ganaste …!*, *dejó Itacate*), the switch's words in her own *Notificaciones*.
insert into servicio.notification_kind
  (kind, app, class, channel, channel_name, importance, label, detail, default_on, is_on, opens, position,
   hold_minutes, days_before, send_at, on_day)
values
  ('publico', 'itacate', 'a_pedido', 'cocinas', 'Cocinas que sigues', 'normal',
   'Cocinas que sigues', 'Cuando publica una cocina con la campana encendida.', true, true, 'cocina', 3,
   60, null, null, null),
  ('promocion_cocina', 'itacate', 'promocion', 'ofertas', 'Ofertas y novedades', 'normal',
   'Promociones de tus cocinas', 'Un aviso cuando una cocina que sigues empieza una promoción.', false, false, 'mis_cocinas', 4,
   null, null, null, null),
  ('premio', 'itacate', 'servicio', 'tarjetas', 'Tarjetas de lealtad', 'normal',
   'Premios', 'Cuando completas una tarjeta.', true, true, 'tarjeta', 5,
   null, null, null, null),
  ('sellos', 'itacate', 'servicio', 'tarjetas', 'Tarjetas de lealtad', 'normal',
   'Sellos por vencer', 'Un aviso antes de que venzan tus sellos.', true, true, 'tarjeta', 6,
   null, 7, '11:00', null),
  ('tarjeta_cambio', 'itacate', 'servicio', 'tarjetas', 'Tarjetas de lealtad', 'normal',
   'Cambios en tus tarjetas', 'Si una cocina cierra su tarjeta o deja Itacate.', true, true, 'tarjeta', 7,
   null, null, null, null),
  ('primera_oferta', 'cocina', 'servicio', 'primera_oferta', 'Tu primera oferta', 'normal',
   'Tu primera oferta', 'Un recordatorio si aún no publicas.', true, true, 'publicar', 2,
   null, null, '12:00', 2);


-- ----------------------------------------------------------------------------
-- 2. A message owed to one person
-- ----------------------------------------------------------------------------

create table servicio.notice (
  id            bigint generated always as identity primary key,
  kind          text not null references servicio.notification_kind (kind) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- The kitchen it is about — a plain id: a kitchen that left is what it says.
  workspace_id  uuid,
  kitchen_name  text,
  -- What makes it ONCE: `listing:<id>`, `promotion:<id>`, `reward:<id>`, `cierre:<terms>`,
  -- `baja:<kitchen>`, `sellos:<kitchen>:<when they go>`, `empujon:<kitchen>`.
  about         text not null,
  about_id      uuid,
  -- Its words, written when it was queued — but the bell's, written as it goes (several
  -- of them can become one message).
  title         text,
  body          text,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  due_at        timestamptz not null default now(),
  expires_at    timestamptz,
  sent_at       timestamptz,
  phones        smallint,
  dropped_at    timestamptz,
  dropped_why   text,

  constraint notice_once unique (user_id, kind, about),
  constraint notice_settled_once check (sent_at is null or dropped_at is null),
  constraint notice_dropped_why_known check (
    (dropped_at is null and dropped_why is null)
    or (dropped_at is not null and dropped_why in (
      'apagado', 'vencido', 'ya_no', 'su_switch', 'sin_campana', 'sin_si', 'ya_hoy', 'sin_telefono', 'en_el_mismo')))
);

create index notice_due_idx on servicio.notice (due_at) where sent_at is null and dropped_at is null;
create index notice_sent_idx on servicio.notice (user_id, sent_at) where sent_at is not null;
create index notice_created_idx on servicio.notice (created_at);

comment on table servicio.notice is
  'One message owed to one person by a service''s moment (10.9h): its kind, the kitchen it is '
  'about (a plain id, and its name when queued — a kitchen that left is what it says), what makes '
  'it once (about), its words (the bell''s written as it goes), when it may go and until when, '
  'and how it ended — sent_at with how many phones, or dropped_at with why: apagado (Wera '
  'switched the kind off), vencido (its moment passed), ya_no (what it announced is no longer '
  'true), su_switch (her switch), sin_campana (her bell off), sin_si (no yes to promotions), '
  'ya_hoy (that kitchen already announced to her today), sin_telefono (no phone of hers would '
  'show it), en_el_mismo (said in another message to her). Queued by the moment, gated and sent '
  'by servicio.send_due_notices each minute; deleted notification_rule.keep_days after it was '
  'queued; goes with her account. 0094, plan 10.9h-i.';

revoke all on servicio.notice from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. The words — as the apps already say them
-- ----------------------------------------------------------------------------

-- *28 de noviembre* (Wera Cocina's `ES.fechas.delMes`, Itacate's `delMes`).
create function servicio.day_words(p_day date)
returns text
language sql
immutable
set search_path = ''
as $$
  select extract(day from p_day)::integer || ' de '
         || (array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                   'septiembre', 'octubre', 'noviembre', 'diciembre'])[extract(month from p_day)::integer]
$$;

-- *Todos los días*, *Los jueves*, *Los lunes, miércoles y viernes* (Itacate's `diasTexto`).
create function servicio.days_words(p_days smallint[])
returns text
language sql
immutable
set search_path = ''
as $$
  with d as (
    select distinct u.x::integer as x from unnest(p_days) as u (x) where u.x between 1 and 7
  ),
  named as (
    select (array['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'])[d.x] as name,
           row_number() over (order by d.x) as n, count(*) over () as total
      from d
  )
  -- string_agg puts each row's delimiter BEFORE it: *y* before the last, a comma before the rest.
  select case when (select count(*) from d) = 7 then 'Todos los días'
              else 'Los ' || (select string_agg(named.name, case when named.n = named.total then ' y ' else ', ' end
                                                order by named.n)
                                from named)
         end
$$;

-- *$65*, *$65.50*, *$1,250* (Wera's `formatMXN`: the centavos only when there are some).
create function servicio.pesos(p numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select '$' || to_char(trunc(p), 'FM999,999,990')
         || case when p <> trunc(p) then '.' || to_char(round((p - trunc(p)) * 100), 'FM00') else '' end
$$;

-- An offer as the bell says it: *Comida corrida $65 · de 13:00 a 17:00* (`10.5c-i`'s
-- drawing) — *y 2 más* when it holds more; *mañana de …*, *el 24 de noviembre de …* when
-- its window is not today, in the kitchen's zone.
create function servicio.listing_words(p_listing uuid, p_now timestamptz)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select f.name || ' ' || servicio.pesos(f.unit_price)
         || case when f.lines > 1 then ' y ' || (f.lines - 1) || ' más' else '' end
         || ' · '
         || case (li.pickup_start at time zone z.zone)::date - (p_now at time zone z.zone)::date
              when 0 then ''
              when 1 then 'mañana '
              else 'el ' || servicio.day_words((li.pickup_start at time zone z.zone)::date) || ' '
            end
         || 'de ' || to_char(li.pickup_start at time zone z.zone, 'HH24:MI')
         || ' a ' || to_char(li.pickup_end at time zone z.zone, 'HH24:MI')
    from public.listing li
   cross join lateral (select servicio.kitchen_zone(li.workspace_id) as zone) z
   cross join lateral (
     select ll.name, ll.unit_price, count(*) over () as lines
       from public.listing_line ll
      where ll.listing_id = li.id
      order by ll.line_no
      limit 1) f
   where li.id = p_listing
$$;

-- *A, B y C*; *A, B y 2 más* — the kitchens one bell message names.
create function servicio.names_words(p_names text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when cardinality(p_names) <= 1 then coalesce(p_names[1], '')
           when cardinality(p_names) <= 3
             then array_to_string(p_names[1 : cardinality(p_names) - 1], ', ') || ' y ' || p_names[cardinality(p_names)]
           else array_to_string(p_names[1 : 2], ', ') || ' y ' || (cardinality(p_names) - 2) || ' más'
         end
$$;

-- What a kitchen that left took with it, for one neighbour: her stamps, her rewards.
create function servicio.gone_words(p_stamps integer, p_rewards integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when p_stamps > 0 and p_rewards > 0 then
             'Se borraron ' || case when p_stamps = 1 then 'tu sello' else 'tus ' || p_stamps || ' sellos' end
             || ' y ' || case when p_rewards = 1 then 'tu premio' else 'tus ' || p_rewards || ' premios' end || ' por cobrar.'
           when p_stamps > 0 then
             case when p_stamps = 1 then 'Se borró tu sello.' else 'Se borraron tus ' || p_stamps || ' sellos.' end
           when p_rewards = 1 then 'Se borró tu premio por cobrar.'
           else 'Se borraron tus ' || p_rewards || ' premios por cobrar.'
         end
$$;

revoke all on function servicio.day_words(date)                      from public, anon, authenticated;
revoke all on function servicio.days_words(smallint[])               from public, anon, authenticated;
revoke all on function servicio.pesos(numeric)                       from public, anon, authenticated;
revoke all on function servicio.listing_words(uuid, timestamptz)     from public, anon, authenticated;
revoke all on function servicio.names_words(text[])                  from public, anon, authenticated;
revoke all on function servicio.gone_words(integer, integer)         from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. Who holds a kitchen's card, and the promotions she was sent
-- ----------------------------------------------------------------------------

-- Each neighbour holding a kitchen's stamps (a card whose days have not passed) or a
-- reward still to claim — the card's own reading (`card_state`, `0085`).
create function servicio.card_holders(p_workspace_id uuid, p_at timestamptz)
returns table (user_id uuid, stamps integer, rewards integer)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select c.user_id, c.stamps::integer as stamps
      from servicio.loyalty_card c
      join servicio.card_terms t on t.id = c.terms_id
     where c.workspace_id = p_workspace_id
       and (t.expiry_days is null or c.last_stamp_at + make_interval(days => t.expiry_days) > p_at)
  ),
  r as (
    select x.user_id, count(*)::integer as rewards
      from servicio.card_reward x
     where x.workspace_id = p_workspace_id and x.claimed_at is null and x.user_id is not null
     group by x.user_id
  )
  select coalesce(s.user_id, r.user_id), coalesce(s.stamps, 0), coalesce(r.rewards, 0)
    from s full join r on r.user_id = s.user_id
$$;

revoke all on function servicio.card_holders(uuid, timestamptz) from public, anon, authenticated;

-- ⚠️ HER PROMOTIONS IN ONE APP, ALL TOGETHER (question 3: *every campaign counted
-- together*): each campaign sent to her, and each message of a promotion kind a moment
-- sent her — on her days in the rule's zone, from p_from to p_to.
create function servicio.promotions_sent(p_user uuid, p_app text, p_from date, p_to date, p_zone text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (select count(*)::integer
            from servicio.campaign_member o
            join servicio.campaign oc on oc.id = o.campaign_id and oc.app = p_app
           where o.user_id = p_user and o.sent_at is not null
             and (o.sent_at at time zone p_zone)::date between p_from and p_to)
       + (select count(*)::integer
            from servicio.notice x
            join servicio.notification_kind xk on xk.kind = x.kind and xk.app = p_app and xk.class = 'promocion'
           where x.user_id = p_user and x.sent_at is not null
             and (x.sent_at at time zone p_zone)::date between p_from and p_to)
$$;

revoke all on function servicio.promotions_sent(uuid, text, date, date, text) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. The moments that queue a message — each only while its kind is on
-- ----------------------------------------------------------------------------

-- (1) A kitchen publishes: everyone who rang its bell, but its own people. The words are
-- written as it goes, so several can become one.
create function servicio.notice_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from servicio.notification_kind k where k.kind = 'publico' and k.is_on) then
    return null;
  end if;
  insert into servicio.notice (kind, user_id, workspace_id, kitchen_name, about, about_id, data, expires_at)
  select 'publico', f.user_id, new.workspace_id, w.display_name, 'listing:' || new.id, new.id,
         jsonb_build_object('kind', 'publico', 'opens', 'cocina', 'opens_id', new.workspace_id),
         new.pickup_end
    from servicio.follow f
    join public.workspace w on w.id = new.workspace_id and w.kind = 'cocina'
    join auth.users u on u.id = f.user_id
   where f.workspace_id = new.workspace_id and f.bell
     and not exists (select 1 from public.workspace_member m
                      where m.workspace_id = new.workspace_id and m.user_id = f.user_id and m.is_active)
  on conflict (user_id, kind, about) do nothing;
  return null;
exception when others then
  raise warning 'servicio.notice_publication: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

revoke all on function servicio.notice_publication() from public, anon, authenticated;

create trigger notice_publication
  after insert on public.listing
  for each row execute function servicio.notice_publication();

-- (3) Her last stamp lands: *¡Ganaste …!* — the celebration's own words (`gano`).
create function servicio.notice_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null
     or not exists (select 1 from servicio.notification_kind k where k.kind = 'premio' and k.is_on) then
    return null;
  end if;
  insert into servicio.notice (kind, user_id, workspace_id, kitchen_name, about, about_id, title, body, data)
  select 'premio', new.user_id, new.workspace_id, w.display_name, 'reward:' || new.id, new.id,
         '¡Ganaste ' || new.reward || '!',
         'En ' || w.display_name || '. Cóbralo cuando quieras.',
         jsonb_build_object('kind', 'premio', 'opens', 'tarjeta', 'opens_id', new.workspace_id)
    from public.workspace w
    join auth.users u on u.id = new.user_id
   where w.id = new.workspace_id
  on conflict (user_id, kind, about) do nothing;
  return null;
exception when others then
  raise warning 'servicio.notice_reward: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

revoke all on function servicio.notice_reward() from public, anon, authenticated;

create trigger notice_reward
  after insert on servicio.card_reward
  for each row execute function servicio.notice_reward();

-- (5a) A kitchen closes its card — from *Cerrar la tarjeta* or *Lo que usas*: whoever holds
-- its stamps or a reward, in the card's own sentence (Itacate's `tarjeta.cerrada`).
create function servicio.notice_card_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from servicio.notification_kind k where k.kind = 'tarjeta_cambio' and k.is_on) then
    return null;
  end if;
  insert into servicio.notice (kind, user_id, workspace_id, kitchen_name, about, about_id, title, body, data, expires_at)
  select 'tarjeta_cambio', h.user_id, new.workspace_id, w.display_name, 'cierre:' || new.id, new.id,
         w.display_name || ' cerró su tarjeta',
         'Puedes completarla y cobrar tus premios hasta el '
           || servicio.day_words(((new.closed_at + interval '30 days') at time zone servicio.kitchen_zone(new.workspace_id))::date)
           || '.',
         jsonb_build_object('kind', 'tarjeta_cambio', 'opens', 'tarjeta', 'opens_id', new.workspace_id),
         new.closed_at + interval '30 days'
    from servicio.card_holders(new.workspace_id, now()) h
    join public.workspace w on w.id = new.workspace_id
    join auth.users u on u.id = h.user_id
  on conflict (user_id, kind, about) do nothing;
  return null;
exception when others then
  raise warning 'servicio.notice_card_closed: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

revoke all on function servicio.notice_card_closed() from public, anon, authenticated;

create trigger notice_card_closed
  after update of closed_at on servicio.card_terms
  for each row
  when (old.closed_at is null and new.closed_at is not null)
  execute function servicio.notice_card_closed();

-- (5b) A kitchen leaves Itacate — any deletion, as `0084`'s `kitchen_leaves`: BEFORE the
-- row goes, while its cards are still there to read. Nothing it writes points at the
-- kitchen, so the cascade that follows is untouched; and it returns the row in every
-- path, so a failure here never stops a deletion.
create function servicio.notice_kitchen_leaves()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kind is distinct from 'cocina'
     or not exists (select 1 from servicio.notification_kind k where k.kind = 'tarjeta_cambio' and k.is_on)
     or servicio.card_kept_until(old.id) <= now() then
    return old;
  end if;
  insert into servicio.notice (kind, user_id, workspace_id, kitchen_name, about, title, body, data)
  select 'tarjeta_cambio', h.user_id, old.id, old.display_name, 'baja:' || old.id,
         old.display_name || ' dejó Itacate',
         servicio.gone_words(h.stamps, h.rewards),
         jsonb_build_object('kind', 'tarjeta_cambio', 'opens', 'mis_cocinas')
    from servicio.card_holders(old.id, now()) h
    join auth.users u on u.id = h.user_id
  on conflict (user_id, kind, about) do nothing;
  return old;
exception when others then
  raise warning 'servicio.notice_kitchen_leaves: % (%)', sqlerrm, sqlstate;
  return old;
end;
$$;

revoke all on function servicio.notice_kitchen_leaves() from public, anon, authenticated;

create trigger notice_kitchen_leaves
  before delete on public.workspace
  for each row execute function servicio.notice_kitchen_leaves();

-- (4) and (7): the moments the clock makes, queued by the job each minute from their
-- kind's hour on. Once each: `notice_once`.
create function servicio.queue_timed_notices(p_now timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule  servicio.notification_rule;
  v_local timestamp;
  v_k     servicio.notification_kind;
  v_n     integer := 0;
  v_m     integer;
begin
  select * into v_rule from servicio.notification_rule;
  v_local := p_now at time zone v_rule.zone;

  -- (4) Her stamps go in `days_before` days: the card's own line, *Vence el … si no
  -- vienes*. Never a card that keeps them (*Nunca*), one shorter than `min_days`, one whose
  -- kitchen's card is gone, or one whose reminder would fall on the day of her last stamp.
  select * into v_k from servicio.notification_kind k where k.kind = 'sellos';
  if found and v_k.is_on and v_k.days_before is not null and v_local::time >= coalesce(v_k.send_at, '00:00') then
    insert into servicio.notice (kind, user_id, workspace_id, kitchen_name, about, about_id, title, body, data, expires_at)
    select 'sellos', c.user_id, c.workspace_id, w.display_name,
           'sellos:' || c.workspace_id || ':' || to_char(x.ends at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'), t.id,
           'Tus sellos en ' || w.display_name,
           c.stamps || ' de ' || t.stamps || ' sellos. Vence el ' || servicio.day_words((x.ends at time zone z.zone)::date)
             || ' si no vienes.',
           jsonb_build_object('kind', 'sellos', 'opens', 'tarjeta', 'opens_id', c.workspace_id),
           x.ends
      from servicio.loyalty_card c
      join servicio.card_terms t on t.id = c.terms_id
      join public.workspace w on w.id = c.workspace_id
      join auth.users u on u.id = c.user_id
     cross join lateral (select c.last_stamp_at + make_interval(days => t.expiry_days) as ends) x
     cross join lateral (select servicio.kitchen_zone(c.workspace_id) as zone) z
     where t.expiry_days is not null
       and t.expiry_days >= coalesce(v_k.min_days, 1)
       and x.ends > p_now
       and servicio.card_kept_until(c.workspace_id) > p_now
       and (x.ends at time zone z.zone)::date - v_k.days_before <= (p_now at time zone z.zone)::date
       and (x.ends at time zone z.zone)::date - v_k.days_before > (c.last_stamp_at at time zone z.zone)::date
    on conflict (user_id, kind, about) do nothing;
    get diagnostics v_m = row_count;
    v_n := v_n + v_m;
  end if;

  -- (7) Her kitchen's `on_day`-th day and nothing published yet: one nudge to each of its
  -- people, in his words for the day's card (G32's round: *¿Tienes alguna oferta?
  -- Publícala y tus vecinos la verán*), until that day ends.
  select * into v_k from servicio.notification_kind k where k.kind = 'primera_oferta';
  if found and v_k.is_on and v_k.on_day is not null and v_local::time >= coalesce(v_k.send_at, '00:00') then
    insert into servicio.notice (kind, user_id, workspace_id, kitchen_name, about, about_id, title, body, data, expires_at)
    select 'primera_oferta', m.user_id, w.id, w.display_name, 'empujon:' || w.id, w.id,
           '¿Tienes alguna oferta?', 'Publícala y tus vecinos la verán.',
           jsonb_build_object('kind', 'primera_oferta', 'opens', 'publicar', 'workspace_id', w.id),
           (v_local::date + 1)::timestamp at time zone v_rule.zone
      from public.workspace w
      join public.workspace_member m on m.workspace_id = w.id and m.is_active
      join auth.users u on u.id = m.user_id
     where w.kind = 'cocina' and w.is_active
       and (w.created_at at time zone v_rule.zone)::date + (v_k.on_day - 1) = v_local::date
       and not exists (select 1 from public.listing li where li.workspace_id = w.id)
    on conflict (user_id, kind, about) do nothing;
    get diagnostics v_m = row_count;
    v_n := v_n + v_m;
  end if;

  return v_n;
end;
$$;

revoke all on function servicio.queue_timed_notices(timestamptz) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 6. (2) A kitchen's owner announces her promotion — the phone's two doors
-- ----------------------------------------------------------------------------

-- Whether *Avisar a quienes te siguen* is offered: the alert's kind on. Any member reads it.
create function public.promotion_alert_offered(p_workspace_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'promotion_alert_offered requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'promotion_alert_offered: that kitchen is not one of yours' using errcode = '42501';
  end if;
  return coalesce((select k.is_on from servicio.notification_kind k where k.kind = 'promocion_cocina'), false);
end;
$$;

comment on function public.promotion_alert_offered(uuid) is
  'Whether Publicar promoción offers Avisar a quienes te siguen: the kind promocion_cocina on '
  '(dark until the analyst rules). Any member of the kitchen. 42501 signed out or not a member. '
  '0094, plan 10.9h-i.';

-- *Avisar a quienes te siguen* (the family-shell drawing, call 25): one message, once, to
-- everyone following the kitchen or ringing its bell but its own people — what each
-- needs before it goes is the kind's class (a promotion: her yes, the hours, the limits).
-- A retry is the same alert. Answers {offered, alerted}.
create function public.alert_promotion(p_workspace_id uuid, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.workspace_kind;
  v_p    servicio.promotion;
begin
  if auth.uid() is null then
    raise exception 'alert_promotion requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'alert_promotion: only the kitchen''s owner announces a promotion' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'alert_promotion: only a kitchen has promotions' using errcode = 'TD013';
  end if;
  select * into v_p from servicio.promotion p where p.id = p_id and p.workspace_id = p_workspace_id;
  if not found then
    raise exception 'alert_promotion: no such promotion in this kitchen' using errcode = '22023';
  end if;
  if not exists (select 1 from servicio.notification_kind k where k.kind = 'promocion_cocina' and k.is_on) then
    return jsonb_build_object('offered', false, 'alerted', false);
  end if;
  if not servicio.promotion_shown(v_p) then
    raise exception 'alert_promotion: a promotion no neighbour sees is announced to nobody' using errcode = '22023';
  end if;

  -- The drawing's words: *Fonda Doña Mari: Jueves pozolero* · *Pozole rojo o verde. Los
  -- jueves, hasta el 30 de noviembre.*
  insert into servicio.notice (kind, user_id, workspace_id, kitchen_name, about, about_id, title, body, data, expires_at)
  select 'promocion_cocina', f.user_id, p_workspace_id, w.display_name, 'promotion:' || v_p.id, v_p.id,
         w.display_name || ': ' || v_p.what,
         coalesce(regexp_replace(v_p.more, '[.!?]?$', '. '), '')
           || servicio.days_words(v_p.days) || ', hasta el ' || servicio.day_words(v_p.ends_on) || '.',
         jsonb_build_object('kind', 'promocion_cocina', 'opens', 'mis_cocinas', 'opens_id', p_workspace_id),
         (v_p.ends_on + 1)::timestamp at time zone servicio.kitchen_zone(p_workspace_id)
    from servicio.follow f
    join public.workspace w on w.id = p_workspace_id
    join auth.users u on u.id = f.user_id
   where f.workspace_id = p_workspace_id
     and not exists (select 1 from public.workspace_member m
                      where m.workspace_id = p_workspace_id and m.user_id = f.user_id and m.is_active)
  on conflict (user_id, kind, about) do nothing;

  return jsonb_build_object('offered', true, 'alerted', true);
end;
$$;

comment on function public.alert_promotion(uuid, uuid) is
  'Avisar a quienes te siguen: the owner''s. Queues one message about her promotion, once, to '
  'each neighbour following her kitchen or ringing its bell (never its own people); the job '
  'sends each when her kind''s class allows — a promotion: her yes, 9:00 to 20:00, her day''s and '
  'week''s limits — until the promotion ends. While the kind is dark it does nothing: {offered: '
  'false, alerted: false}; else {offered: true, alerted: true}, and again is the same alert. Never '
  'says how many. 42501 signed out or not the owner, TD013 a shop, 22023 not her promotion or one '
  'no neighbour sees. 0094, plan 10.9h-i.';


-- ----------------------------------------------------------------------------
-- 7. Before a message goes — its class, then what it said still true
-- ----------------------------------------------------------------------------

-- Whether what a message announces is still so, by its kind.
create function servicio.notice_still_true(p_id bigint, p_now timestamptz)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n servicio.notice;
begin
  select * into n from servicio.notice where id = p_id;
  return case n.kind
    -- the offer still on (not taken down, its window open, something left), her bell still on
    when 'publico' then
      exists (select 1 from public.listing li
               where li.id = n.about_id and li.withdrawn_at is null and li.pickup_end > p_now
                 and exists (select 1 from public.listing_line ll
                              where ll.listing_id = li.id and ll.quantity > public.listing_line_taken(ll.id)))
      and exists (select 1 from servicio.follow f where f.user_id = n.user_id and f.workspace_id = n.workspace_id and f.bell)
    -- the promotion still shown to a neighbour
    when 'promocion_cocina' then
      exists (select 1 from servicio.promotion p where p.id = n.about_id and servicio.promotion_shown(p))
    -- the reward still hers to claim
    when 'premio' then
      exists (select 1 from servicio.card_reward r where r.id = n.about_id and r.claimed_at is null)
    -- her card still going on the day it said: a stamp since moves the day, and the
    -- next reminder is its own
    when 'sellos' then
      exists (select 1 from servicio.loyalty_card c join servicio.card_terms t on t.id = c.terms_id
               where c.user_id = n.user_id and c.workspace_id = n.workspace_id
                 and c.last_stamp_at + make_interval(days => t.expiry_days) = n.expires_at)
    -- her kitchen still there, and still nothing published
    when 'primera_oferta' then
      exists (select 1 from public.workspace w where w.id = n.workspace_id)
      and not exists (select 1 from public.listing li where li.workspace_id = n.workspace_id)
    else true
  end;
end;
$$;

revoke all on function servicio.notice_still_true(bigint, timestamptz) from public, anon, authenticated;

-- NULL — it goes now; `espera` — not yet (a promotion's hours or limits); otherwise why
-- it is dropped.
create function servicio.notice_gate(p_id bigint, p_now timestamptz)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n       servicio.notice;
  v_k     servicio.notification_kind;
  v_rule  servicio.notification_rule;
  v_local timestamp;
  v_today date;
begin
  select * into n from servicio.notice where id = p_id;
  select * into v_k from servicio.notification_kind k where k.kind = n.kind;
  select * into v_rule from servicio.notification_rule;
  v_local := p_now at time zone v_rule.zone;
  v_today := v_local::date;

  if not v_k.is_on then
    return 'apagado';
  end if;
  if n.expires_at is not null and n.expires_at <= p_now then
    return 'vencido';
  end if;
  if not servicio.notice_still_true(n.id, p_now) then
    return 'ya_no';
  end if;

  if v_k.class = 'promocion' then
    if not servicio.consent_now(n.user_id, v_k.app, 'promociones') then
      return 'sin_si';
    end if;
  elsif not coalesce((select s.is_on from servicio.notification_switch s where s.user_id = n.user_id and s.kind = n.kind),
                     v_k.default_on) then
    return 'su_switch';
  end if;

  if v_k.class = 'a_pedido' then
    if n.workspace_id is null
       or not exists (select 1 from servicio.follow f where f.user_id = n.user_id and f.workspace_id = n.workspace_id and f.bell) then
      return 'sin_campana';
    end if;
    if (select count(*) from servicio.notice o
          join servicio.notification_kind ok on ok.kind = o.kind and ok.class = 'a_pedido'
         where o.user_id = n.user_id and o.workspace_id = n.workspace_id and o.sent_at is not null
           and (o.sent_at at time zone v_rule.zone)::date = v_today) >= v_rule.request_per_day then
      return 'ya_hoy';
    end if;
  end if;

  if v_k.class = 'promocion' then
    if v_local::time < v_rule.promo_from or v_local::time >= v_rule.promo_until then
      return 'espera';
    end if;
    if servicio.promotions_sent(n.user_id, v_k.app, v_today, v_today, v_rule.zone) >= v_rule.promo_per_day
       or servicio.promotions_sent(n.user_id, v_k.app, v_today - 6, v_today, v_rule.zone) >= v_rule.promo_per_week then
      return 'espera';
    end if;
  end if;

  return null;
end;
$$;

revoke all on function servicio.notice_gate(bigint, timestamptz) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 8. The sender, each minute
-- ----------------------------------------------------------------------------

create function servicio.send_due_notices(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_queued  integer;
  v_sent    integer := 0;
  v_dropped integer := 0;
  v_held    integer := 0;
  v_ready   bigint[] := '{}';
  v_why     text;
  n         servicio.notice;
  v_k       servicio.notification_kind;
  v_tokens  uuid[];
  g         record;
  v_last    timestamptz;
  v_firsts  bigint[];
  v_names   text[];
  v_title   text;
  v_body    text;
  v_data    jsonb;
begin
  -- One run at a time: a slow minute never meets the next one.
  if not pg_try_advisory_xact_lock(hashtextextended('servicio.send_due_notices', 0)) then
    return jsonb_build_object('skipped', true);
  end if;

  v_queued := servicio.queue_timed_notices(p_now);

  -- 1. Each due message through its gate: dropped, still waiting, or ready.
  for n in
    select * from servicio.notice x
     where x.sent_at is null and x.dropped_at is null and x.due_at <= p_now
     order by x.id
  loop
    v_why := servicio.notice_gate(n.id, p_now);
    if v_why is null then
      v_ready := v_ready || n.id;
    elsif v_why <> 'espera' then
      update servicio.notice set dropped_at = p_now, dropped_why = v_why where id = n.id;
      v_dropped := v_dropped + 1;
    end if;
  end loop;

  -- 2. A kind sent alone: each ready message, to her phones that would show it.
  for n in
    select x.* from servicio.notice x
      join servicio.notification_kind k on k.kind = x.kind and k.hold_minutes is null
     where x.id = any(v_ready)
     order by x.id
  loop
    v_tokens := servicio.campaign_phones(n.kind, array[n.user_id]);
    if cardinality(v_tokens) = 0 then
      update servicio.notice set dropped_at = p_now, dropped_why = 'sin_telefono' where id = n.id;
      v_dropped := v_dropped + 1;
      continue;
    end if;
    perform servicio.push_send(n.kind, v_tokens, n.title, n.body, n.data);
    update servicio.notice set sent_at = p_now, phones = cardinality(v_tokens) where id = n.id;
    v_sent := v_sent + 1;
  end loop;

  -- 3. A kind held (the bell): hers wait until `hold_minutes` after her last one, then go
  -- as one — each kitchen named once, the rest of its offers said in the same message.
  for g in
    select x.user_id, x.kind, k.hold_minutes, array_agg(x.id order by x.id) as ids
      from servicio.notice x
      join servicio.notification_kind k on k.kind = x.kind and k.hold_minutes is not null
     where x.id = any(v_ready)
     group by x.user_id, x.kind, k.hold_minutes
  loop
    select max(o.sent_at) into v_last from servicio.notice o where o.user_id = g.user_id and o.kind = g.kind;
    if v_last is not null and p_now < v_last + make_interval(mins => g.hold_minutes) then
      update servicio.notice set due_at = v_last + make_interval(mins => g.hold_minutes) where id = any(g.ids);
      v_held := v_held + cardinality(g.ids);
      continue;
    end if;

    -- The first of each kitchen speaks for it.
    select array_agg(f.id order by f.id), array_agg(f.kitchen_name order by f.id)
      into v_firsts, v_names
      from (select distinct on (x.workspace_id) x.id, x.kitchen_name
              from servicio.notice x where x.id = any(g.ids)
             order by x.workspace_id, x.id) f;

    v_tokens := servicio.campaign_phones(g.kind, array[g.user_id]);
    if cardinality(v_tokens) = 0 then
      update servicio.notice set dropped_at = p_now, dropped_why = 'sin_telefono' where id = any(g.ids);
      v_dropped := v_dropped + cardinality(g.ids);
      continue;
    end if;

    if cardinality(v_firsts) = 1 then
      select x.kitchen_name || ' publicó', servicio.listing_words(x.about_id, p_now), x.data
        into v_title, v_body, v_data
        from servicio.notice x where x.id = v_firsts[1];
    else
      v_title := 'Publicaron ' || cardinality(v_firsts) || ' cocinas que sigues';
      v_body  := servicio.names_words(v_names);
      v_data  := jsonb_build_object('kind', g.kind, 'opens', 'mis_cocinas');
    end if;

    perform servicio.push_send(g.kind, v_tokens, v_title, coalesce(v_body, ''), v_data);
    update servicio.notice
       set sent_at = p_now, phones = cardinality(v_tokens), title = v_title, body = v_body
     where id = any(v_firsts);
    update servicio.notice
       set dropped_at = p_now, dropped_why = 'en_el_mismo'
     where id = any(g.ids) and not (id = any(v_firsts));
    v_sent := v_sent + cardinality(v_firsts);
    v_dropped := v_dropped + cardinality(g.ids) - cardinality(v_firsts);
  end loop;

  return jsonb_build_object('queued', v_queued, 'sent', v_sent, 'dropped', v_dropped, 'held', v_held);
end;
$$;

comment on function servicio.send_due_notices(timestamptz) is
  'Run each minute by pg_cron (send-notices): queues the moments the clock makes (the stamps'' '
  'reminder, the first offer''s nudge), then takes every message due through its gate — the '
  'kind on, not expired, still true, and its class: her switch (servicio), her switch, her bell '
  'and one a kitchen a day (a_pedido), her yes, the hours and the limits with every campaign '
  '(promocion) — and sends each to her phones that would show it; a held kind''s (the bell) '
  'wait hold_minutes after her last and go as one. Answers what it did. Granted to nobody. 0094, '
  'plan 10.9h-i.';

revoke all on function servicio.send_due_notices(timestamptz) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 9. Re-made, their signatures and answers unchanged
-- ----------------------------------------------------------------------------

-- `0092`'s sender, one change: Expo's priority from the kind — `high` for an `alta` kind
-- (her reservations, a heads-up), `normal` for the rest, as `0093`'s campaigns go.
create or replace function servicio.push_send(p_kind text, p_tokens uuid[], p_title text, p_body text, p_data jsonb)
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
                                                  'priority', case when v_kind.importance = 'alta' then 'high' else 'normal' end)
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
  'request, on the kind''s Android channel — priority high for an alta kind, else normal — with '
  'Expo''s access token when the Vault holds expo_push_access_token; one notification_send row '
  'per message. Granted to nobody: called by the triggers of 0092 and by send_due_notices. 0092; '
  're-made by 0094, plan 10.9h-i.';

-- `0093`'s body, one change: an on-request kind is switched here too — her switch for
-- the whole kind (the bell per kitchen stays `set_my_follow`'s, `0084`).
create or replace function public.set_notification_switch(p_kind text, p_on boolean)
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
  select * into v_kind from servicio.notification_kind k
   where k.kind = p_kind
     and (k.is_on or exists (select 1 from servicio.campaign_tester t where t.user_id = v_user));
  if not found or p_on is null then
    raise exception 'set_notification_switch: no such kind, or no answer' using errcode = '22023';
  end if;
  -- ⚠️ A PROMOTION IS NEVER TURNED ON HERE: it needs her express yes, kept as a record
  -- (set_my_consent, 0093).
  if v_kind.class not in ('servicio', 'a_pedido') then
    raise exception 'set_notification_switch: only a service or on-request kind is switched here' using errcode = '22023';
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
  'The caller turns a service or an on-request kind on or off for herself, on every phone of '
  'hers; the sender reads it before every message (an on-request kind''s bell per kitchen is '
  'set_my_follow''s). Answers her kinds of that app (my_notification_kinds''s answer). 42501 '
  'signed out, 22023 no such kind (or Wera switched it off — his test accounts may switch a dark '
  'one), no answer, or a promotion kind. Keyed on auth.uid(). 0092; re-made by 0093 and by 0094, '
  'plan 10.9h-i.';

-- `0092`'s body, one change: a tap on an on-request kind is counted too — with nobody.
create or replace function public.count_notification_tap(p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'count_notification_tap requires an authenticated caller' using errcode = '42501';
  end if;
  if not exists (select 1 from servicio.notification_kind k where k.kind = p_kind and k.class in ('servicio', 'a_pedido')) then
    raise exception 'count_notification_tap: no such service or on-request kind' using errcode = '22023';
  end if;
  insert into servicio.notification_tap_count as c (kind, day, taps)
  values (p_kind, (now() at time zone 'America/Mexico_City')::date, 1)
  on conflict (kind, day) do update set taps = c.taps + 1;
end;
$$;

comment on function public.count_notification_tap(text) is
  'One tap on a message of a service or an on-request kind: plus one on that kind''s count for '
  'today in Mexico City. Who tapped is not kept — an event counted, never a person (10.5c-i). '
  '42501 signed out, 22023 not such a kind (a promotion''s tap is a campaign''s, '
  'count_campaign_tap). 0092; re-made by 0094, plan 10.9h-i.';

-- `0093`'s job, one change: her day's and week's limits count every promotion sent her in
-- the app — each campaign and each promotion's alert — through `promotions_sent`.
create or replace function servicio.send_due_campaigns(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule    servicio.notification_rule;
  v_local   timestamp;
  v_today   date;
  v_c       servicio.campaign;
  v_variant text;
  v_users   uuid[];
  v_tokens  uuid[];
  v_left    integer;
  v_joined  integer := 0;
  v_sent    integer := 0;
  v_n       integer;
  v_counted integer;
begin
  select * into v_rule from servicio.notification_rule;
  v_local := p_now at time zone v_rule.zone;
  v_today := v_local::date;

  if v_local::time >= v_rule.promo_from and v_local::time < v_rule.promo_until then
    for v_c in
      select c.* from servicio.campaign c
        join servicio.notification_kind k on k.kind = c.kind and k.is_on
        join servicio.campaign_audience a on a.app = c.app and a.audience = c.audience and a.is_on
       where c.launched_at is not null and c.stopped_at is null
         and c.starts_at <= p_now and c.expires_at > p_now
       order by c.starts_at, c.id
    loop
      begin
        insert into servicio.campaign_member (campaign_id, user_id, variant, measured, joined_at)
        select v_c.id, p.user_id,
               servicio.campaign_variant_of(v_c.id, p.user_id),
               servicio.consent_now(p.user_id, v_c.app, 'medir_promociones')
                 and not exists (select 1 from servicio.campaign_tester t where t.user_id = p.user_id),
               p_now
          from servicio.audience_people(v_c.app, v_c.audience, p_now) p
        on conflict (campaign_id, user_id) do nothing;
        get diagnostics v_n = row_count;
        v_joined := v_joined + v_n;

        v_left := 1000;
        for v_variant in
          select v.variant from servicio.campaign_variant v where v.campaign_id = v_c.id order by v.variant
        loop
          exit when v_left <= 0;
          -- ⚠️ HER LIMITS COUNT EVERY PROMOTION OF THE APP TOGETHER — each campaign and each
          -- promotion's alert (0094), and the sends this run already made, since each
          -- statement sees the ones before it.
          select array_agg(q.user_id) into v_users
            from (select m.user_id
                    from servicio.campaign_member m
                   where m.campaign_id = v_c.id and m.variant = v_variant and m.sent_at is null
                     and servicio.consent_now(m.user_id, v_c.app, 'promociones')
                     and servicio.promotions_sent(m.user_id, v_c.app, v_today, v_today, v_rule.zone) < v_rule.promo_per_day
                     and servicio.promotions_sent(m.user_id, v_c.app, v_today - 6, v_today, v_rule.zone) < v_rule.promo_per_week
                   order by m.joined_at, m.user_id
                   limit v_left) q;
          continue when v_users is null;

          v_tokens := servicio.campaign_phones(v_c.kind, v_users);
          continue when cardinality(v_tokens) = 0;
          v_sent := v_sent + servicio.campaign_push(v_c.id, v_variant, v_tokens, false);

          -- Sent to her when at least one of her phones got it; the rest stay due.
          update servicio.campaign_member m
             set sent_at = p_now
           where m.campaign_id = v_c.id and m.user_id = any(v_users)
             and exists (select 1 from servicio.push_token t where t.id = any(v_tokens) and t.user_id = m.user_id);
          get diagnostics v_n = row_count;
          v_left := v_left - v_n;
        end loop;
      exception when others then
        raise warning 'servicio.send_due_campaigns: campaign %: % (%)', v_c.id, sqlerrm, sqlstate;
      end;
    end loop;
  end if;

  v_counted := servicio.count_campaigns(p_now);
  return jsonb_build_object('joined', v_joined, 'sent', v_sent, 'counted', v_counted,
                            'inside_hours', v_local::time >= v_rule.promo_from and v_local::time < v_rule.promo_until);
end;
$$;

comment on function servicio.send_due_campaigns(timestamptz) is
  'Run each minute by pg_cron (send-campaigns): inside the hours, each launched campaign takes in '
  'whoever its audience holds now, then sends each wording to the people due — still saying yes, '
  'under her day''s and week''s limits, which count every promotion of the app together (each '
  'campaign and, since 0094, each promotion''s alert) — up to 1,000 a run; then counts what '
  'closed. Granted to nobody. 0093; re-made by 0094, plan 10.9h-i.';

-- `0093`'s nightly job, one change: the notices go `keep_days` after they were queued.
create or replace function servicio.forget_old_pushes()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff  timestamptz := now() - make_interval(days => (select r.keep_days from servicio.notification_rule r));
  v_counted integer;
  v_sends   integer;
  v_tokens  integer;
  v_members integer;
  v_notices integer;
begin
  v_counted := servicio.count_campaigns(now(), v_cutoff);
  delete from servicio.notification_send s where s.sent_at < v_cutoff;
  get diagnostics v_sends = row_count;
  delete from servicio.push_token t where t.retired_at < now() - interval '30 days';
  get diagnostics v_tokens = row_count;
  delete from servicio.campaign_member m where m.joined_at < v_cutoff;
  get diagnostics v_members = row_count;
  delete from servicio.notice x where x.created_at < v_cutoff;
  get diagnostics v_notices = row_count;
  return jsonb_build_object('sends', v_sends, 'tokens', v_tokens, 'campaign_members', v_members,
                            'notices', v_notices, 'counted_first', v_counted);
end;
$$;

comment on function servicio.forget_old_pushes() is
  'Run every night by pg_cron (forget-old-pushes): counts any campaign still holding someone '
  'past notification_rule.keep_days (30), then deletes each message''s row, each person''s place '
  'in a campaign and each notice keep_days on, and each retired token 30 days after it was '
  'retired; the tap counts and campaign_count, which name nobody, stay. Granted to nobody. 0092; '
  're-made by 0093 and by 0094, plan 10.9h-i.';


-- ----------------------------------------------------------------------------
-- 10. The job, and the doors
-- ----------------------------------------------------------------------------

select cron.schedule('send-notices', '* * * * *', 'select servicio.send_due_notices()');

revoke all on function public.promotion_alert_offered(uuid) from public, anon;
revoke all on function public.alert_promotion(uuid, uuid)   from public, anon;

grant execute on function public.promotion_alert_offered(uuid) to authenticated;
grant execute on function public.alert_promotion(uuid, uuid)   to authenticated;
