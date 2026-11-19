-- ============================================================================
-- 0087 — promotions: a kitchen's reason to come back, its days and its end,
--        and the offers that join one
-- ============================================================================
-- docs/PLAN.md task `10.9g-i` — the database half of promotions (`10.9g`, split
-- on size 2026-11-19 in three: this; Wera Cocina's screens, `10.9g-ii`;
-- Itacate's, `10.9g-iii`). The owner's rulings of 2026-11-05 (calls 23–25: an
-- offer and a promotion stay two records, an offer can join one and wears its
-- mark; four kinds, days, an end date required, eight weeks at most, conditions
-- written for her with the kitchen's name and address, *Deshacer*, *Terminarla
-- hoy*) and of 2026-11-16 and 17 (his private notes: G3 built and kept off until
-- his product analyst rules; G18 the owner's; G28 *Para tus clientes* only while
-- her card is on, seen by everyone, marked *Con tu tarjeta de lealtad*; G29 up
-- to three at once, the band the newest and *y 2 más*; G30 *¿Es parte de una
-- promoción?* in *Publicar* only while one runs; G36 a helper publishes; G38 the
-- door re-made with defaulted fields). Drawn on the family-shell page, stage 4:
-- *Nueva promoción*, *Promociones*, *Tu promoción*, the band, the mark.
--
-- ADR-035 §2.7 (its review of 2026-11-17): a kitchen's services reach a
-- neighbour through THE ONE DOOR, re-made — never a second; her kitchen's rows
-- live in `servicio`, read and written only through `security definer`
-- functions.
--
-- WHAT IS HERE:
--   1. ONE TABLE IN `servicio` (closed to every client role since `0058`):
--        `promotion`   one promotion of a kitchen: its kind, what, more, photo,
--                      days, the day it began and the day it ends, and the
--                      conditions neighbours read — no count, no price, no
--                      code (call 23)
--      AND A COLUMN ON THE OFFER: `public.listing.promotion_id`, the promotion
--      it joined — none by default, NULL again if the promotion is undone.
--   2. TWO TRIGGERS: the kitchen turning promotions off in *Lo que usas* ends
--      the ones running (`promotions_end_with_feature`), and her loyalty card
--      closing ends her running *Para tus clientes* (`client_promotions_end_
--      with_card`) — each at that moment, as *Terminarla hoy* does.
--   3. FOUR FUNCTIONS FOR HER KITCHEN:
--        `kitchen_promotions(p_workspace_id)`        every member reads them
--        `create_promotion(p_workspace_id, p_id, …)` the owner (G18)
--        `end_promotion(p_workspace_id, p_id)`       the owner — *Terminarla hoy*
--        `undo_promotion(p_workspace_id, p_id)`      the owner — *Deshacer*
--   4. `publish_listing` DROPPED AND RE-MADE WITH ONE ARGUMENT MORE,
--      `p_promotion_id`, DEFAULTED TO NONE (ADR-035 §2.2, `0064`'s way — never
--      an overload): *¿Es parte de una promoción?* Every build in the field calls
--      it with the five it knew, and gets what it got.
--   5. THE DOOR RE-MADE, ITS SIGNATURE UNCHANGED (`on_offer_now`, `0085`'s body):
--      each kitchen's `promotions` — those a neighbour sees now, newest first —
--      and each offer's `promotion_id` while that promotion is shown; and a
--      kitchen with a promotion shown is in the door though she published
--      nothing in 14 days.
--
-- ⚠️ WHAT EACH SIDE SEES (his rulings; the ⚠️ lines are this migration's
-- reading of them, reported in the plan's status entry of 2026-11-19):
--   * THE KITCHEN — every member reads her kitchen's promotions: ⚠️ a helper
--     publishes (G36) and *Publicar* asks her *¿Es parte de una promoción?*
--     (G30), so she reads which run; making, ending and undoing one are the
--     owner's (G18: promotions are the owner's).
--   * A NEIGHBOUR — through the door, a kitchen's promotions while each is
--     SHOWN: running (not ended, its last day not past in the kitchen's zone),
--     Wera's switch `promociones` on, the kitchen's own choice `on` — and ⚠️ a
--     *Para tus clientes* only while her card is open and Wera has the card on,
--     or it would say *Con tu tarjeta de lealtad* of a card nobody can get.
--     Every running one counts toward the three, shown or not.
--   * NOBODY'S NAME: a promotion holds no person's id — not even who made it,
--     which is always the owner — so an account's deletion has nothing here.
--
-- ⚠️ ITS DAYS (call 25, *¿Qué días?*): ISO weekdays, 1 Monday to 7 Sunday; all
-- seven is *Todos*; *Un día especial* names one to six of them (*Elige tu día*).
-- It begins the day it is published — the drawing has no start to pick — and
-- ends at the close of `ends_on` in the kitchen's zone, no more than 56 days on
-- (*eight weeks at most*; LFPC Art. 48 asks for a duration). Its band shows on
-- every day it runs; ⚠️ an offer joins it only on one of its days (*y tus
-- ofertas de esos días llevan la marca*), by the offer's pickup day.
--
-- ⚠️ ITS CONDITIONS are written by Wera Cocina from the fields, with her
-- kitchen's name and address, and she may change them (the drawing's
-- *Cambiar*): the database keeps what she published, up to 400 characters, and
-- never rewrites it — it is the promise neighbours read. A promotion is never
-- edited: she ends it and makes another (*Usarla otra vez* fills the form from
-- an old one; it is the phone's).
--
-- ⚠️ *Deshacer* (the drawing: 8 seconds) DELETES IT AS IF NEVER MADE, within
-- two minutes of its making — a slow signal's margin; after that, `TD032`, and
-- the phone offers *Terminarla hoy*. An offer that joined it in between keeps
-- standing, its mark gone. ⚠️ Its photo stays in her kitchen's folder: the
-- orphan runbook takes only deleted businesses' folders. ⚠️ A RETRY AFTER
-- *Deshacer* MAKES IT AGAIN: the id is forgotten with the row. Her phone sends
-- that id again only when she presses *Publicar promoción* again with the form
-- unchanged (Wera Cocina's `attemptFor`), which is her asking for it again.
--
-- ⚠️ TWO PHONES AT ONCE (the independent review of `10.9g-i`): a retry of the
-- same promotion is looked for after the kitchen's lock, so two sends of one
-- press make one; a *Para tus clientes* holds her card's row while it is made,
-- so a card closing that moment ends it rather than missing it; and every way a
-- promotion ends writes no moment before its making.
--
-- THE REFUSALS (custom SQLSTATEs reach PostgREST as a 400):
--   42501  nobody signed in; not a member (the read); not the owner (a write)
--   TD013  a shop — only a kitchen has promotions (`0072`'s code)
--   22023  a field out of its shape; no id; a promotion of another kitchen's id
--   TD024  making one while Wera has promotions switched off for everyone
--   TD029  a fourth running (G29: up to three at once)
--   TD030  *Para tus clientes* while her loyalty card is not open (G28)
--   TD031  an offer joining a promotion it cannot: not hers, not shown, or not
--          on one of its days
--   TD032  *Deshacer* after its two minutes
-- Ending or undoing one this kitchen does not have changes nothing and answers
-- her list, as a retry does: another phone may have undone it, and an id of
-- another kitchen's is never touched. (A raised `P0002` reaches PostgREST as a
-- 500, which a phone reads as the server failing — found by its contract check.)
--
-- ⚠️ THE DELETIONS: `promotion` hangs off the kitchen with `on delete cascade`
-- and `listing.promotion_id` is set NULL when its promotion goes, so
-- `delete_my_business` (`0077`), `delete_my_account` (`0073`, `0085`) and the
-- two runbooks that call them take every promotion with its kitchen — no body
-- changes. Nothing here holds a person's id, and nothing blocks a deletion.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): a
-- table in a schema no client reaches, a defaulted column, four functions added;
-- `publish_listing` answers its five arguments as before; the door sends two keys
-- more and changes none — every build ignores a key it does not read.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. A promotion, and the offer that joins one
-- ----------------------------------------------------------------------------
-- The id is the phone's, so a retry is the same promotion. `starts_on` and
-- `ends_on` are days in the kitchen's zone; `ended_at` is *Terminarla hoy* (or
-- the kitchen turning promotions off, or her card closing, for *Para tus
-- clientes*). The four kinds are the family-shell page's; a fifth is a new
-- migration, as it is a new mark in Itacate.

create table servicio.promotion (
  id           uuid primary key,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  kind         text not null,
  what         text not null,
  more         text,
  image_path   text,
  days         smallint[] not null,
  starts_on    date not null,
  ends_on      date not null,
  conditions   text not null,
  created_at   timestamptz not null default now(),
  ended_at     timestamptz,

  constraint promotion_kind check (kind in ('nuevo', 'temporada', 'dia', 'clientes')),
  constraint promotion_what check (char_length(what) between 1 and 40 and what = btrim(what)
                                   and what !~ '[[:cntrl:]]'),
  constraint promotion_more check (more is null or (char_length(more) between 1 and 80 and more = btrim(more)
                                                    and more !~ '[[:cntrl:]]')),
  constraint promotion_photo check (image_path is null or public.picture_in_folder(image_path, workspace_id)),
  constraint promotion_days check (cardinality(days) between 1 and 7
                                   and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  constraint promotion_one_day check (kind <> 'dia' or cardinality(days) < 7),
  constraint promotion_until check (ends_on >= starts_on and ends_on <= starts_on + 56),
  constraint promotion_conditions check (char_length(conditions) between 1 and 400
                                         and conditions = btrim(conditions)),
  constraint promotion_ended check (ended_at is null or ended_at >= created_at)
);

create index promotion_by_kitchen on servicio.promotion (workspace_id, created_at desc);

comment on table servicio.promotion is
  'A kitchen''s promotion (call 23: a reason to come back — no count, no price, no code): '
  'its kind (nuevo, temporada, dia, clientes), what (1 to 40 characters), more (up to 80), a '
  'photo in her own folder, its days (ISO weekdays; all seven is Todos; dia names one to six), '
  'the day it began and the day it ends in her zone (eight weeks at most), and the conditions '
  'neighbours read (up to 400, written by her phone, never rewritten). ended_at is Terminarla '
  'hoy, promotions turned off, or — for clientes — her card closed. Never edited. Read by every '
  'member (kitchen_promotions), made, ended and undone by the owner; reaches neighbours through '
  'the door while shown. Goes with the kitchen. 0087, plan 10.9g-i.';

revoke all on servicio.promotion from public, anon, authenticated;

alter table public.listing
  add column promotion_id uuid references servicio.promotion (id) on delete set null;

create index listing_by_promotion on public.listing (promotion_id) where promotion_id is not null;

comment on column public.listing.promotion_id is
  'The promotion this offer joined (¿Es parte de una promoción?, G30), or NULL — none, or '
  'undone since. Written only by publish_listing; the door sends it while the promotion is '
  'shown, so the offer wears its mark in Itacate. 0087, plan 10.9g-i.';


-- ----------------------------------------------------------------------------
-- 2. When a promotion runs, and when a neighbour sees it
-- ----------------------------------------------------------------------------

-- The kitchen's day now, in its own zone (`0085`'s `kitchen_zone`).
create function servicio.kitchen_today(p_workspace_id uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone servicio.kitchen_zone(p_workspace_id))::date
$$;

-- Wera's switch for everyone (`0081`): promotions, on or off.
create function servicio.promotions_switched_on()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select s.is_on from servicio.feature_switch s where s.name = 'promociones'), false)
$$;

-- Whether a neighbour can get this kitchen's loyalty card now: its current terms
-- open, and Wera has the card switched on — what the door's `card` says (`0085`).
create function servicio.kitchen_card_open(p_workspace_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select servicio.card_switched_on()
     and exists (select 1 from servicio.card_terms t
                  where t.workspace_id = p_workspace_id and t.replaced_at is null and t.closed_at is null)
$$;

-- Running: not ended, and its last day not past in the kitchen's zone. Counts
-- toward the three whether or not a neighbour sees it.
create function servicio.promotion_running(p servicio.promotion)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p.ended_at is null and servicio.kitchen_today(p.workspace_id) <= p.ends_on
$$;

-- Shown to a neighbour: running, Wera's switch on, the kitchen's own choice on,
-- and a *Para tus clientes* only while her card is open (G28).
create function servicio.promotion_shown(p servicio.promotion)
returns boolean
language sql
stable
set search_path = ''
as $$
  select servicio.promotion_running(p)
     and servicio.promotions_switched_on()
     and exists (select 1 from servicio.kitchen_feature f
                  where f.workspace_id = p.workspace_id and f.feature = 'promociones' and f.state = 'on')
     and (p.kind <> 'clientes' or servicio.kitchen_card_open(p.workspace_id))
$$;

comment on function servicio.kitchen_today(uuid) is
  'The kitchen''s day now, in its own zone. Granted to nobody. 0087, plan 10.9g-i.';
comment on function servicio.promotions_switched_on() is
  'Wera''s switch for everyone (0081): whether promotions are offered at all. Granted to '
  'nobody. 0087, plan 10.9g-i.';
comment on function servicio.kitchen_card_open(uuid) is
  'Whether a neighbour can get this kitchen''s loyalty card now: its current terms open and '
  'Wera''s card switched on (the door''s card, 0085). Granted to nobody. 0087, plan 10.9g-i.';
comment on function servicio.promotion_running(servicio.promotion) is
  'A promotion running: not ended, its last day not past in the kitchen''s zone — whether or '
  'not anyone sees it; three at most (G29). Granted to nobody. 0087, plan 10.9g-i.';
comment on function servicio.promotion_shown(servicio.promotion) is
  'A promotion a neighbour sees: running, Wera''s promociones on, the kitchen''s choice on, '
  'and a Para tus clientes only while her card is open (G28). What the door sends and what '
  'an offer may join. Granted to nobody. 0087, plan 10.9g-i.';


-- ----------------------------------------------------------------------------
-- 3. Two ways a promotion ends besides *Terminarla hoy*
-- ----------------------------------------------------------------------------
-- *Lo que usas* turning promotions off ends the ones running, exactly as
-- *Terminarla hoy* does — the card's way (`card_closes_with_feature`, `0085`):
-- whichever screen she used, one rule, and turning them on again later brings
-- back none she had stopped. Wera's own switch is different: it hides them for
-- everyone and they come back with it, as every feature does (`0081`).

create function servicio.promotions_end_with_feature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `greatest`: her other phone's promotion made while this waited on its row
  -- is ended no earlier than it was made (the review of `10.9g-i`).
  update servicio.promotion p
     set ended_at = greatest(now(), p.created_at)
   where p.workspace_id = new.workspace_id and servicio.promotion_running(p);
  return null;
end;
$$;

comment on function servicio.promotions_end_with_feature() is
  'Trigger: a kitchen''s choice for promociones becoming anything but on ends its running '
  'promotions at that moment, as Terminarla hoy does. Granted to nobody. 0087, plan 10.9g-i.';

create trigger promotions_end_with_feature
  after insert or update of state on servicio.kitchen_feature
  for each row
  when (new.feature = 'promociones' and new.state <> 'on')
  execute function servicio.promotions_end_with_feature();

-- Her card closing — *Cerrar la tarjeta*, or *Lo que usas* turning it off
-- (`0085`) — ends her running *Para tus clientes*: a promotion for card holders
-- with no card to get (G28).
create function servicio.client_promotions_end_with_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update servicio.promotion p
     set ended_at = greatest(new.closed_at, p.created_at)
   where p.workspace_id = new.workspace_id and p.kind = 'clientes' and servicio.promotion_running(p);
  return null;
end;
$$;

comment on function servicio.client_promotions_end_with_card() is
  'Trigger: a kitchen''s loyalty card closing ends its running Para tus clientes promotions '
  'at that moment (G28: only while her card is on). Granted to nobody. 0087, plan 10.9g-i.';

create trigger client_promotions_end_with_card
  after update of closed_at on servicio.card_terms
  for each row
  when (old.closed_at is null and new.closed_at is not null)
  execute function servicio.client_promotions_end_with_card();


-- ----------------------------------------------------------------------------
-- 4. The kitchen's side
-- ----------------------------------------------------------------------------

-- *Promociones*, and *¿Es parte de una promoción?* in *Publicar*: every member
-- reads (a helper publishes, G36). The running ones first, newest first, then the
-- last ten that ended — *Usarla otra vez* fills the form from one.
create function public.kitchen_promotions(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kind  public.workspace_kind;
  v_today date;
begin
  if auth.uid() is null then
    raise exception 'kitchen_promotions requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'kitchen_promotions: that kitchen is not one of yours' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'kitchen_promotions: only a kitchen has promotions' using errcode = 'TD013';
  end if;
  v_today := servicio.kitchen_today(p_workspace_id);

  return jsonb_build_object(
    'day',       to_char(v_today, 'YYYY-MM-DD'),
    'max',       3,
    'running',   (select count(*)::integer from servicio.promotion p
                   where p.workspace_id = p_workspace_id and servicio.promotion_running(p)),
    'card_open', servicio.kitchen_card_open(p_workspace_id),
    'promotions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',           x.id,
               'kind',         x.kind,
               'what',         x.what,
               'more',         x.more,
               'image_path',   x.image_path,
               'days',         to_jsonb(x.days),
               'starts_on',    to_char(x.starts_on, 'YYYY-MM-DD'),
               'ends_on',      to_char(x.ends_on, 'YYYY-MM-DD'),
               'conditions',   x.conditions,
               'created_at',   x.created_at,
               'state',        case when x.running then 'activa' else 'terminada' end,
               -- The day it ended: Terminarla hoy's, else its last.
               'ended_on',     case when not x.running then
                                 to_char(coalesce((x.ended_at at time zone servicio.kitchen_zone(p_workspace_id))::date,
                                                  x.ends_on), 'YYYY-MM-DD') end,
               'shown',        x.shown,
               -- *n ofertas de hoy llevan su marca*: hers that wear it in Itacate now —
               -- the promotion shown, the offer picked up today in her zone, not
               -- taken down, its window not over and something left (the door's rule).
               'offers_today', case when x.shown then
                                 (select count(*)::integer from public.listing li
                                   where li.promotion_id = x.id and li.withdrawn_at is null
                                     and li.pickup_end > now()
                                     and (li.pickup_start at time zone servicio.kitchen_zone(p_workspace_id))::date = v_today
                                     and exists (select 1 from public.listing_line ll
                                                  where ll.listing_id = li.id
                                                    and ll.quantity > public.listing_line_taken(ll.id)))
                                 else 0 end)
             order by x.running desc, x.sort_at desc, x.id)
        -- A running one sorts by when it was made; an ended one by when it ended —
        -- Terminarla hoy's moment, else the close of its last day in her zone.
        from (select y.*, row_number() over (partition by y.running order by y.sort_at desc, y.id) as nth
                from (select p.*, servicio.promotion_running(p) as running, servicio.promotion_shown(p) as shown,
                             case when servicio.promotion_running(p) then p.created_at
                                  else coalesce(p.ended_at, (p.ends_on + 1)::timestamp at time zone
                                                             servicio.kitchen_zone(p_workspace_id)) end as sort_at
                        from servicio.promotion p
                       where p.workspace_id = p_workspace_id) y) x
       where x.running or x.nth <= 10), '[]'::jsonb)
  );
end;
$$;

comment on function public.kitchen_promotions(uuid) is
  'Promociones, and ¿Es parte de una promoción? in Publicar: every member reads her kitchen''s '
  'promotions (a helper publishes, G36). {day (her zone, YYYY-MM-DD), max: 3, running, '
  'card_open (whether Para tus clientes may be made), promotions: [{id, kind, what, more, '
  'image_path, days, starts_on, ends_on, conditions, created_at, state: activa | terminada, '
  'ended_on, shown (a neighbour sees it now), offers_today (hers picked up today wearing its mark '
  'in Itacate now; 0 while it is not shown)}]} — the running ones first, newest '
  'first, then the last ten ended. 42501 not a member; TD013 a shop. 0087, plan 10.9g-i.';

-- *Publicar promoción* (call 25, G28, G29): the owner's (G18). Nothing
-- pre-filled by the database: the phone sends every field it drew, its id
-- first, so a retry is the same promotion and answers as it stands. Making one
-- turns her choice of promotions `on`, as setting up her card does (`0085`).
-- Answers `kitchen_promotions`.
create function public.create_promotion(
  p_workspace_id uuid,
  p_id           uuid,
  p_kind         text,
  p_what         text,
  p_more         text,
  p_image_path   text,
  p_days         integer[],
  p_ends_on      date,
  p_conditions   text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind   public.workspace_kind;
  v_found  servicio.promotion%rowtype;
  -- Trimmed of every kind of space, not only ' ' (a tab or a line break alone is blank).
  v_what   text := regexp_replace(coalesce(p_what, ''), '^\s+|\s+$', '', 'g');
  v_more   text := nullif(regexp_replace(coalesce(p_more, ''), '^\s+|\s+$', '', 'g'), '');
  v_photo  text := nullif(btrim(coalesce(p_image_path, '')), '');
  v_cond   text := regexp_replace(coalesce(p_conditions, ''), '^\s+|\s+$', '', 'g');
  v_days   smallint[];
  v_today  date;
begin
  if auth.uid() is null then
    raise exception 'create_promotion requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'create_promotion: only the kitchen''s owner makes a promotion' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'create_promotion: only a kitchen has promotions' using errcode = 'TD013';
  end if;
  if p_id is null then
    raise exception 'create_promotion: the phone must make the promotion''s id' using errcode = '22023';
  end if;

  -- One at a time per kitchen, before anything is looked at: two sends of one
  -- press are one promotion, and two at once count as two (the fourth refused).
  perform pg_advisory_xact_lock(hashtextextended('promotion:' || p_workspace_id::text, 0));

  -- A retry of one already made is that promotion, as it stands.
  select * into v_found from servicio.promotion p where p.id = p_id;
  if found then
    if v_found.workspace_id is distinct from p_workspace_id then
      raise exception 'create_promotion: that id is not this kitchen''s' using errcode = '22023';
    end if;
    return public.kitchen_promotions(p_workspace_id);
  end if;

  if not servicio.promotions_switched_on() then
    raise exception 'create_promotion: promotions are not offered yet' using errcode = 'TD024';
  end if;

  if p_kind is null or p_kind not in ('nuevo', 'temporada', 'dia', 'clientes') then
    raise exception 'create_promotion: the kind is nuevo, temporada, dia or clientes' using errcode = '22023';
  end if;
  if char_length(v_what) not between 1 and 40 or v_what ~ '[[:cntrl:]]' then
    raise exception 'create_promotion: what she offers is one line of 1 to 40 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(v_more, '')) > 80 or coalesce(v_more, '') ~ '[[:cntrl:]]' then
    raise exception 'create_promotion: the more is one line of at most 80 characters' using errcode = '22023';
  end if;
  if v_photo is not null and not public.picture_in_folder(v_photo, p_workspace_id) then
    raise exception 'create_promotion: the photo is not a picture in this kitchen''s own folder'
      using errcode = '22023';
  end if;
  if p_days is null or cardinality(p_days) = 0
     or exists (select 1 from unnest(p_days) d where d is null or d not between 1 and 7) then
    raise exception 'create_promotion: the days are weekdays, 1 Monday to 7 Sunday, at least one'
      using errcode = '22023';
  end if;
  select array_agg(distinct d::smallint order by d::smallint) into v_days from unnest(p_days) d;
  if p_kind = 'dia' and cardinality(v_days) = 7 then
    raise exception 'create_promotion: un día especial names its days, not all seven' using errcode = '22023';
  end if;
  v_today := servicio.kitchen_today(p_workspace_id);
  if p_ends_on is null or p_ends_on < v_today or p_ends_on > v_today + 56 then
    raise exception 'create_promotion: it ends from today to eight weeks on' using errcode = '22023';
  end if;
  if char_length(v_cond) not between 1 and 400 then
    raise exception 'create_promotion: the conditions are 1 to 400 characters' using errcode = '22023';
  end if;

  -- *Para tus clientes* holds her card's open terms while it is made: a card
  -- closing at that moment waits, then its trigger ends this one — or, closed
  -- first, this is refused. Asked before the three: the card is what she can fix.
  if p_kind = 'clientes' then
    perform 1 from servicio.card_terms t
     where t.workspace_id = p_workspace_id and t.replaced_at is null and t.closed_at is null
       for share;
    if not found or not servicio.card_switched_on() then
      raise exception 'create_promotion: para tus clientes needs her loyalty card open' using errcode = 'TD030';
    end if;
  end if;

  if (select count(*) from servicio.promotion p
       where p.workspace_id = p_workspace_id and servicio.promotion_running(p)) >= 3 then
    raise exception 'create_promotion: three are running — end one to make another' using errcode = 'TD029';
  end if;

  insert into servicio.promotion (id, workspace_id, kind, what, more, image_path, days, starts_on, ends_on, conditions)
  values (p_id, p_workspace_id, p_kind, v_what, v_more, v_photo, v_days, v_today, p_ends_on, v_cond);

  insert into servicio.kitchen_feature as f (workspace_id, feature, state)
  values (p_workspace_id, 'promociones', 'on')
  on conflict (workspace_id, feature) do update
     set state = 'on',
         changed_at = case when f.state = 'on' then f.changed_at else now() end;

  return public.kitchen_promotions(p_workspace_id);
end;
$$;

comment on function public.create_promotion(uuid, uuid, text, text, text, text, integer[], date, text) is
  'Publicar promoción (call 25, G28, G29): the owner''s (G18). The phone''s id (a retry is that '
  'promotion), the kind, what (1–40), more (≤ 80), a photo in her folder, the days (ISO '
  'weekdays; dia not all seven), the last day (today to 56 days on, her zone) and the '
  'conditions she publishes (1–400); what and more one line each. Begins today; turns her choice of promociones on. Answers '
  'kitchen_promotions. 42501, TD013, 22023, TD024 switched off, TD029 three running, TD030 '
  'para tus clientes without her card open. 0087, plan 10.9g-i.';

-- *Terminarla hoy*: the owner's. Ends it at this moment — it leaves Itacate now,
-- and the offers that wear its mark lose it. Ended already, over, or not one of
-- this kitchen's (undone on her other phone), changes nothing — a retry. Answers
-- `kitchen_promotions`.
create function public.end_promotion(p_workspace_id uuid, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.workspace_kind;
begin
  if auth.uid() is null then
    raise exception 'end_promotion requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'end_promotion: only the kitchen''s owner ends a promotion' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'end_promotion: only a kitchen has promotions' using errcode = 'TD013';
  end if;
  update servicio.promotion p
     set ended_at = greatest(now(), p.created_at)
   where p.id = p_id and p.workspace_id = p_workspace_id and servicio.promotion_running(p);

  return public.kitchen_promotions(p_workspace_id);
end;
$$;

comment on function public.end_promotion(uuid, uuid) is
  'Terminarla hoy: the owner ends one of her kitchen''s promotions at this moment — out of '
  'Itacate now, its mark off the offers that joined it. Ended, over, or not one of this '
  'kitchen''s: nothing changes (a retry). Answers kitchen_promotions. 42501, TD013. 0087, plan '
  '10.9g-i.';

-- *Deshacer*: the owner's, within two minutes of its making — the drawing's eight
-- seconds and a slow signal's margin. It is deleted as if never made; an offer
-- that joined it meanwhile stands without its mark. Gone already: nothing (a
-- retry). Later: `TD032`, and the phone offers *Terminarla hoy*.
create function public.undo_promotion(p_workspace_id uuid, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind  public.workspace_kind;
  v_found servicio.promotion%rowtype;
begin
  if auth.uid() is null then
    raise exception 'undo_promotion requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'undo_promotion: only the kitchen''s owner undoes a promotion' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'undo_promotion: only a kitchen has promotions' using errcode = 'TD013';
  end if;

  select * into v_found from servicio.promotion p
   where p.id = p_id and p.workspace_id = p_workspace_id
     for update;
  if found then
    if v_found.created_at <= now() - interval '2 minutes' then
      raise exception 'undo_promotion: too late to undo — end it today instead' using errcode = 'TD032';
    end if;
    delete from servicio.promotion p where p.id = v_found.id;
  end if;

  return public.kitchen_promotions(p_workspace_id);
end;
$$;

comment on function public.undo_promotion(uuid, uuid) is
  'Deshacer: the owner deletes a promotion she made in the last two minutes, as if never '
  'made; an offer that joined it stands without its mark. Not there: nothing (a retry). '
  'Answers kitchen_promotions. 42501, TD013, TD032 after two minutes. 0087, plan 10.9g-i.';



-- ----------------------------------------------------------------------------
-- 5. *Publicar*, with one argument more: the promotion an offer joins
-- ----------------------------------------------------------------------------
-- `0082`'s body, statement for statement, with `p_promotion_id` (defaulted to
-- none), its check before anything is written, and the column it fills. ADR-035
-- §2.2 (`0064`'s way): dropped and made again, never an overload — `_walls.sql`
-- names functions without their arguments, which only one per name allows. A
-- call with the five arguments every build in the field sends is answered as
-- before. The drop and the create are one transaction: no moment without it.

drop function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb);

create function public.publish_listing(p_id uuid, p_location_id uuid, p_pickup_start timestamp with time zone, p_pickup_end timestamp with time zone, p_lines jsonb, p_promotion_id uuid default null)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user      uuid := auth.uid();
  v_loc       public.location%rowtype;
  v_kind      public.workspace_kind;
  v_existing  public.listing%rowtype;
  v_line      jsonb;
  v_n         integer;
  v_i         integer := 0;
  v_name      text;
  v_desc      text;
  v_tags      text[];
  v_price     numeric;
  v_usual     numeric;
  v_qty       numeric;
  v_surprise  boolean;
  v_line_id   uuid;
  v_photo     text;
  v_known     constant text[] := array['pica', 'cerdo', 'mariscos', 'cacahuate', 'lacteos', 'gluten'];
  -- New in 0079: the kitchen's ways and desechable, and each line's.
  v_page      public.kitchen_page%rowtype;
  v_k_llevar  boolean;
  v_k_aqui    boolean;
  v_llevar    boolean;
  v_aqui      boolean;
  -- New in 0087: the promotion it joins, and the day it is picked up on.
  v_promo     servicio.promotion%rowtype;
  v_day       date;
begin
  if v_user is null then
    raise exception 'publish_listing requires an authenticated caller'
      using errcode = '42501';
  end if;
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'publish_listing: that kitchen is not one of yours'
      using errcode = '42501';
  end if;

  select * into v_loc from public.location l where l.id = p_location_id;

  -- 0082 (`10.9b-i`, the owner's ruling G36 of 2026-11-17): at a kitchen a helper
  -- publishes too — `staff`. Anywhere else the role stays `manager`, so a shop's
  -- Empleado is refused 42501 here exactly as before, and TD013 below is unchanged.
  select w.kind into v_kind from public.workspace w where w.id = v_loc.workspace_id;
  if not public.has_role(v_loc.workspace_id,
                         case when v_kind = 'cocina' then 'staff' else 'manager' end::public.workspace_role) then
    raise exception 'publish_listing: only someone who works at that kitchen publishes'
      using errcode = '42501';
  end if;

  if v_kind is distinct from 'cocina' then
    raise exception 'publish_listing: only a kitchen publishes' using errcode = 'TD013';
  end if;

  if p_id is null then
    raise exception 'publish_listing: the phone must make the publication''s id'
      using errcode = '22023';
  end if;

  -- A retry of a publication already recorded is that publication.
  select * into v_existing from public.listing x where x.id = p_id;
  if found then
    if v_existing.workspace_id is distinct from v_loc.workspace_id then
      raise exception 'publish_listing: that id is not this kitchen''s'
        using errcode = '42501';
    end if;
    return v_existing.id;
  end if;

  if p_pickup_start is null or p_pickup_end is null
     or p_pickup_end <= p_pickup_start
     or p_pickup_end <= now()
     or p_pickup_start > now() + interval '24 hours'
     or p_pickup_end - p_pickup_start > interval '12 hours' then
    raise exception 'publish_listing: the window must be a window of at most twelve '
                    'hours that has not ended and starts within a day'
      using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'publish_listing: the lines are a list' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(p_lines);
  if v_n < 1 or v_n > 10 then
    raise exception 'publish_listing: one to ten lines, not %', v_n using errcode = '22023';
  end if;

  -- New in 0079: the kitchen's ways (no page is para llevar only).
  select * into v_page from public.kitchen_page p where p.workspace_id = v_loc.workspace_id;
  v_k_llevar := coalesce(v_page.para_llevar, true);
  v_k_aqui   := coalesce(v_page.para_aqui, false);

  -- Every line is checked before anything is written.
  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_i := v_i + 1;
    if jsonb_typeof(v_line) <> 'object' then
      raise exception 'publish_listing: line % is not an object', v_i using errcode = '22023';
    end if;
    begin
      v_name  := nullif(btrim(coalesce(v_line ->> 'name', '')), '');
      v_price := (v_line ->> 'unit_price')::numeric;
      v_qty   := (v_line ->> 'quantity')::numeric;
      v_usual := (v_line ->> 'usual_price')::numeric;
      v_line_id := (v_line ->> 'id')::uuid;
    exception when others then
      raise exception 'publish_listing: line % has a value that is not a number or an id', v_i
        using errcode = '22023';
    end;
    if v_name is null or char_length(v_name) > 80 then
      raise exception 'publish_listing: line % needs a name of at most 80 characters', v_i
        using errcode = '22023';
    end if;
    if char_length(btrim(coalesce(v_line ->> 'description', ''))) > 200 then
      raise exception 'publish_listing: line %''s description is over 200 characters', v_i
        using errcode = '22023';
    end if;
    if v_price is null or v_price <= 0 or v_price <> round(v_price, 2) or v_price >= 100000 then
      raise exception 'publish_listing: line %''s price is pesos and centavos above zero', v_i
        using errcode = '22023';
    end if;
    if v_qty is null or v_qty <> trunc(v_qty) or v_qty < 1 or v_qty > 999 then
      raise exception 'publish_listing: line %''s count is a whole number from 1 to 999', v_i
        using errcode = '22023';
    end if;
    if v_usual is not null
       and (v_usual <= v_price or v_usual <> round(v_usual, 2) or v_usual >= 100000) then
      raise exception 'publish_listing: line %''s usual price is pesos and centavos above its price', v_i
        using errcode = '22023';
    end if;
    if v_line ? 'surprise' and jsonb_typeof(v_line -> 'surprise') not in ('boolean', 'null') then
      raise exception 'publish_listing: line %''s surprise is yes or no', v_i using errcode = '22023';
    end if;
    if v_line ? 'tags' and jsonb_typeof(v_line -> 'tags') not in ('array', 'null') then
      raise exception 'publish_listing: line %''s tags are a list', v_i using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(
                 case jsonb_typeof(v_line -> 'tags') when 'array' then v_line -> 'tags' else '[]'::jsonb end) t
                where jsonb_typeof(t) <> 'string' or not (t #>> '{}') = any (v_known)) then
      raise exception 'publish_listing: line % carries a tag that is not on the list', v_i
        using errcode = '22023';
    end if;
    -- New in 0076: the dish's photo, a picture in this kitchen's own folder.
    if v_line ? 'image_path' and jsonb_typeof(v_line -> 'image_path') not in ('string', 'null') then
      raise exception 'publish_listing: line %''s photo is a path, or null', v_i using errcode = '22023';
    end if;
    v_photo := nullif(btrim(coalesce(v_line ->> 'image_path', '')), '');
    if v_photo is not null and not public.picture_in_folder(v_photo, v_loc.workspace_id) then
      raise exception 'publish_listing: line %''s photo is not a picture in this kitchen''s own folder', v_i
        using errcode = '22023';
    end if;
    -- New in 0079: how a dish may be eaten, narrowed from the kitchen's ways.
    if (v_line ? 'para_llevar' and jsonb_typeof(v_line -> 'para_llevar') not in ('boolean', 'null'))
       or (v_line ? 'para_aqui' and jsonb_typeof(v_line -> 'para_aqui') not in ('boolean', 'null')) then
      raise exception 'publish_listing: line %''s ways are yes or no', v_i using errcode = '22023';
    end if;
    if not coalesce((v_line ->> 'surprise')::boolean, false) then
      v_llevar := coalesce((v_line ->> 'para_llevar')::boolean, v_k_llevar);
      v_aqui   := coalesce((v_line ->> 'para_aqui')::boolean, v_k_aqui);
      if (v_llevar and not v_k_llevar) or (v_aqui and not v_k_aqui) then
        raise exception 'publish_listing: line % offers a way the kitchen does not', v_i
          using errcode = '22023';
      end if;
      if not (v_llevar or v_aqui) then
        raise exception 'publish_listing: line % is para llevar, para comer aquí, or both', v_i
          using errcode = '22023';
      end if;
    end if;
  end loop;

  -- New in 0087 (`10.9g-i`, G30): *¿Es parte de una promoción?* — one of her
  -- kitchen's, shown to neighbours now, and only on one of its days, by the day
  -- it is picked up in her zone (*y tus ofertas de esos días llevan la marca*).
  if p_promotion_id is not null then
    select * into v_promo from servicio.promotion p
     where p.id = p_promotion_id and p.workspace_id = v_loc.workspace_id;
    v_day := (p_pickup_start at time zone servicio.kitchen_zone(v_loc.workspace_id))::date;
    if v_promo.id is null or not servicio.promotion_shown(v_promo)
       or v_day not between v_promo.starts_on and v_promo.ends_on
       or not (extract(isodow from v_day)::smallint = any (v_promo.days)) then
      raise exception 'publish_listing: that promotion is not one this offer can join today'
        using errcode = 'TD031';
    end if;
  end if;

  insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by,
                              container_price, promotion_id)
  values (p_id, v_loc.workspace_id, v_loc.id, p_pickup_start, p_pickup_end, v_user,
          v_page.container_price, p_promotion_id);

  v_i := 0;
  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_i := v_i + 1;
    v_desc := nullif(btrim(coalesce(v_line ->> 'description', '')), '');
    select coalesce(array_agg(distinct t #>> '{}' order by t #>> '{}'), '{}')
      into v_tags
      from jsonb_array_elements(
             case jsonb_typeof(v_line -> 'tags') when 'array' then v_line -> 'tags' else '[]'::jsonb end) t;
    v_surprise := coalesce((v_line ->> 'surprise')::boolean, false);
    v_photo := nullif(btrim(coalesce(v_line ->> 'image_path', '')), '');
    if v_surprise then
      v_llevar := true;
      v_aqui   := false;
    else
      v_llevar := coalesce((v_line ->> 'para_llevar')::boolean, v_k_llevar);
      v_aqui   := coalesce((v_line ->> 'para_aqui')::boolean, v_k_aqui);
    end if;

    insert into public.listing_line
      (id, listing_id, workspace_id, location_id, line_no, name, description, tags,
       unit_price, quantity, surprise, usual_price, image_path, para_llevar, para_aqui)
    values
      (coalesce((v_line ->> 'id')::uuid, gen_random_uuid()), p_id, v_loc.workspace_id, v_loc.id,
       v_i, btrim(v_line ->> 'name'), v_desc, v_tags,
       (v_line ->> 'unit_price')::numeric, (v_line ->> 'quantity')::numeric, v_surprise,
       (v_line ->> 'usual_price')::numeric, v_photo, v_llevar, v_aqui);
  end loop;

  return p_id;
end;
$function$;

comment on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb, uuid) is
  'A kitchen publishes: one pickup window at one of her kitchens and one to ten lines, each a dish or a surprise bag, each with a photo in her own folder if she took one (0076), and since 0079 how each dish may be eaten (para_llevar, para_aqui: narrowed from the kitchen''s ways, which a line that sends neither takes; a bag is para llevar), with the kitchen''s desechable copied onto it. Anyone who works at the kitchen — a helper (staff) since 0082, G36; manager elsewhere, so a shop is refused as before. Since 0087 the promotion it joins (p_promotion_id, none by default — ¿Es parte de una promoción?, G30): one of her kitchen''s, shown now, on one of its days by the pickup''s day in her zone, else TD031. The id is the phone''s; a retry returns it. 42501 / TD013 (a shop) / 22023 / TD031 — see 0072, 0076, 0079, 0082 and 0087. Plans 10.4a, 10.5b-i, 10.9b-i, 10.9g-i.';

revoke all on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb, uuid) from public, anon;
grant execute on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb, uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 6. The door, re-made: `0085`'s body with two keys more
-- ----------------------------------------------------------------------------
-- `promotions` — a kitchen's promotions a neighbour sees now, newest first —
-- and each offer's `promotion_id` while that promotion is shown, so a mark never
-- outlives its promotion; and a kitchen with a promotion shown is in the door
-- though she published nothing in 14 days, or her promotion would be shown
-- nowhere. ADR-035 §2.7: what she reads of a kitchen's services comes through
-- this one door. Every other key as `0085`.

create or replace function public.on_offer_now()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'on_offer_now requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  return (
    with kitchen as (
      select w.id, w.display_name, w.giro_principal, l.id as location_id, l.street,
             l.street_number, l.colonia, l.city, l.postal_code, l.directions,
             l.timezone, l.pin_lat, l.pin_lng, l.google_at,
             -- ⚠️ THE ONE PLACE GOOGLE'S POINT IS READ: handed out, never compared.
             jsonb_build_object('lat', l.google_lat, 'lng', l.google_lng, 'source', 'google') as google_point,
             -- 0079: the kitchen's settings; no page is cash and para llevar only.
             coalesce(kp.accepts_card, false) as accepts_card,
             coalesce(kp.accepts_transfer, false) as accepts_transfer,
             coalesce(kp.para_llevar, true) as para_llevar,
             coalesce(kp.para_aqui, false) as para_aqui,
             -- 0080: who may reserve here, by her score (NULL is everyone).
             kp.min_score
        from public.workspace w
        join lateral (
               select loc.*
                 from public.location loc
                where loc.workspace_id = w.id and loc.is_active
                order by loc.created_at, loc.id
                limit 1) l on true
        left join public.kitchen_page kp on kp.workspace_id = w.id
       where w.kind = 'cocina' and w.is_active
         and (exists (select 1 from public.listing li
                       where li.workspace_id = w.id
                         and ((li.withdrawn_at is null and li.pickup_end > now())
                              or li.created_at >= now() - interval '14 days'))
              -- 0087: a kitchen with a promotion shown is here, though quiet for longer.
              or exists (select 1 from servicio.promotion p
                          where p.workspace_id = w.id and servicio.promotion_shown(p)))
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', k.id,
             'name', k.display_name,
             'giro', k.giro_principal,
             'address', jsonb_build_object(
                'street', k.street, 'street_number', k.street_number, 'colonia', k.colonia,
                'city', k.city, 'postal_code', k.postal_code),
             'directions', k.directions,
             -- Her own pin wins; else Google's copy while it is under 29 days old.
             'point', case
                        when k.pin_lat is not null then
                          jsonb_build_object('lat', k.pin_lat, 'lng', k.pin_lng, 'source', 'pin')
                        when k.google_at > now() - interval '29 days' then k.google_point
                      end,
             'page', (select jsonb_build_object(
                               'sentence', p.sentence, 'color', p.color, 'cover_path', p.cover_path,
                               'logo_path', p.logo_path, 'maps_link', p.maps_link)
                        from public.kitchen_page p
                       where p.workspace_id = k.id),
             -- 0079: how she takes payment (cash always) and the ways she hands plates over.
             'payment', to_jsonb(array['efectivo']
                                 || case when k.accepts_card then array['tarjeta'] else '{}'::text[] end
                                 || case when k.accepts_transfer then array['transferencia'] else '{}'::text[] end),
             'eat', to_jsonb(case when k.para_llevar then array['llevar'] else '{}'::text[] end
                             || case when k.para_aqui then array['aqui'] else '{}'::text[] end),
             -- 0080: who may reserve here, so her phone says it before she taps.
             'min_score', k.min_score,
             -- 0081: what a neighbour sees this kitchen use — the loyalty card and
             -- promotions she turned on, while Wera has each switched on for everyone.
             -- Never her numbers; never off or interesada. A build ignores a name it does not know.
             'features', (select coalesce(jsonb_agg(f.feature
                                            order by array_position(array['tarjeta', 'promociones'], f.feature)),
                                          '[]'::jsonb)
                            from servicio.kitchen_feature f
                            join servicio.feature_switch s on s.name = f.feature and s.is_on
                           where f.workspace_id = k.id and f.state = 'on'
                             and f.feature in ('tarjeta', 'promociones')),
             -- 0085: her loyalty card's current terms while it is open and Wera has the
             -- card switched on — what a neighbour starts on before her first stamp
             -- (G12); the name and address above are who promises it (G41). NULL else.
             'card', (select jsonb_build_object('reward', t.reward, 'stamps', t.stamps,
                                                'expiry_days', t.expiry_days)
                        from servicio.card_terms t
                       where t.workspace_id = k.id and t.replaced_at is null and t.closed_at is null
                         and servicio.card_switched_on()),
             -- 0087: her promotions a neighbour sees now — running, Wera's switch and her
             -- choice on, a Para tus clientes only while her card is open — newest first;
             -- three at most. Itacate's band draws the newest and y 2 más (G29). [] else.
             'promotions', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'id', p.id, 'kind', p.kind, 'what', p.what, 'more', p.more,
                         'image_path', p.image_path, 'days', to_jsonb(p.days),
                         'starts_on', to_char(p.starts_on, 'YYYY-MM-DD'),
                         'ends_on', to_char(p.ends_on, 'YYYY-MM-DD'),
                         'conditions', p.conditions)
                       order by p.created_at desc, p.id)
                  from servicio.promotion p
                 where p.workspace_id = k.id and servicio.promotion_shown(p)), '[]'::jsonb),
             -- 0080: the neighbours' stars, from five, counted the day after; its three
             -- most given good tags.
             'stars', (select case when count(*) >= 5 then jsonb_build_object(
                                 'average', round(avg(c.stars), 1)::text,
                                 'count', count(*)::integer,
                                 'tags', (select coalesce(jsonb_agg(g.tag order by g.times desc, g.tag), '[]'::jsonb)
                                            from (select t.tag, count(*) as times
                                                    from public.kitchen_ratings_counted(k.id) c2
                                                   cross join unnest(c2.tags) t(tag)
                                                   where t.tag in ('lista_a_tiempo', 'buena_porcion', 'muy_rica', 'me_atendieron_bien')
                                                   group by t.tag
                                                   order by count(*) desc, t.tag
                                                   limit 3) g)) end
                         from public.kitchen_ratings_counted(k.id) c),
             'on_offer', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'id', li.id,
                         'pickup_start', li.pickup_start,
                         'pickup_end', li.pickup_end,
                         -- 0079: the desechable as she stated it when she published.
                         'container_price', li.container_price::text,
                         -- 0087: the promotion it joined, while that promotion is shown — its mark.
                         'promotion_id', (select p.id from servicio.promotion p
                                           where p.id = li.promotion_id and servicio.promotion_shown(p)),
                         -- 0079: `quantity` is what is LEFT; a line with nothing left is not sent.
                         'lines', (select jsonb_agg(jsonb_build_object(
                                            'line_no', ll.line_no, 'name', ll.name,
                                            'description', ll.description, 'tags', to_jsonb(ll.tags),
                                            'unit_price', ll.unit_price::text,
                                            'quantity', (ll.quantity - t.taken)::numeric(12,3)::text,
                                            'surprise', ll.surprise,
                                            'usual_price', ll.usual_price::text,
                                            'image_path', ll.image_path,
                                            'para_llevar', ll.para_llevar,
                                            'para_aqui', ll.para_aqui)
                                          order by ll.line_no)
                                     from public.listing_line ll
                                    cross join lateral (select public.listing_line_taken(ll.id) as taken) t
                                    where ll.listing_id = li.id
                                      and ll.quantity > t.taken))
                         order by li.pickup_start, li.id)
                  from public.listing li
                 where li.workspace_id = k.id
                   and li.withdrawn_at is null and li.pickup_end > now()
                   -- 0079: on offer only with something left.
                   and exists (select 1 from public.listing_line x
                                where x.listing_id = li.id
                                  and x.quantity > public.listing_line_taken(x.id))), '[]'::jsonb),
             -- What she usually publishes, over four weeks, in her kitchen's own zone.
             'summary', jsonb_build_object(
                'weekdays', (select jsonb_agg(coalesce(c.n, 0) order by d.dow)
                               from generate_series(1, 7) d(dow)
                               left join (select extract(isodow from li.pickup_start at time zone k.timezone)::int as dow,
                                                 count(*)::int as n
                                            from public.listing li
                                           where li.workspace_id = k.id
                                             and li.created_at >= now() - interval '28 days'
                                           group by 1) c on c.dow = d.dow),
                'usual_hour', (select extract(hour from li.pickup_start at time zone k.timezone)::int
                                 from public.listing li
                                where li.workspace_id = k.id
                                  and li.created_at >= now() - interval '28 days'
                                group by 1
                                order by count(*) desc, 1
                                limit 1),
                'last_day', (select to_char(max(li.pickup_start at time zone k.timezone), 'YYYY-MM-DD')
                               from public.listing li
                              where li.workspace_id = k.id
                                and li.created_at >= now() - interval '28 days'),
                'repeats', coalesce((
                   select jsonb_agg(jsonb_build_object('name', r.name, 'times', r.times,
                                                       'usual_price', r.usual_price::text)
                                    order by r.times desc, r.last_seen desc, r.name)
                     from (select (array_agg(ll.name order by li.created_at desc))[1] as name,
                                  count(distinct li.id)::int as times,
                                  mode() within group (order by ll.unit_price) as usual_price,
                                  max(li.created_at) as last_seen
                             from public.listing_line ll
                             join public.listing li on li.id = ll.listing_id
                            where li.workspace_id = k.id
                              and li.created_at >= now() - interval '28 days'
                            group by public.normalize_name(ll.name)
                           having count(distinct li.id) >= 2
                            order by count(distinct li.id) desc, max(li.created_at) desc
                            limit 5) r), '[]'::jsonb))
           ) order by k.id), '[]'::jsonb)
      from kitchen k
  );
end;
$$;
comment on function public.on_offer_now() is
  'THE ONE DOOR (ADR-035 §2.7): every kitchen a neighbour may see — on offer now (not '
  'withdrawn, its window not over, something left) or published in the last 14 days — '
  'with its name, trade, address, directions, page, how it takes payment and the ways it '
  'hands plates over (0079), who may reserve there by score and its stars from five, '
  'counted the day after, with its three most given good tags (0080), what it offers now '
  'line by line — quantity is what is left, with each line''s ways and each offer''s '
  'desechable (0079) — a summary of what it usually publishes over four weeks, and the '
  'point to draw: her own pin, else Google''s 30-day copy while under 29 days old, else '
  'none. For the pilot it takes no area: her phone works out distance and order. Never a '
  'cost, a member, a ledger row or who reserved; money and quantities as decimal '
  'strings. Since 0081, features: the loyalty card (tarjeta) and promotions (promociones) '
  'when the kitchen turned them on and Wera has them switched on for everyone — never '
  'her numbers. Since 0085, card: the loyalty card''s current terms {reward, stamps, '
  'expiry_days} while it is open and Wera has it switched on, else null. Since 0087, '
  'promotions: those a neighbour sees now [{id, kind, what, more, image_path, days, '
  'starts_on, ends_on, conditions}] newest first (running, Wera''s switch and the kitchen''s '
  'choice on, Para tus clientes only while her card is open), and each offer''s promotion_id '
  'while that promotion is shown; a kitchen with one shown is in the door though quiet for '
  'longer than 14 days. 0078, 0079, 0080, 0081, 0085 and 0087, plans 10.5-i-b-i, 10.5b-i, '
  '10.5b-ii-b, 10.9a-i, 10.9e-i and 10.9g-i.';


-- ----------------------------------------------------------------------------
-- 7. Who may call what
-- ----------------------------------------------------------------------------
-- The helpers and the triggers' functions are granted to nobody (`servicio` is
-- closed to the client roles anyway); the four the app calls go to a signed-in
-- person and are named in `supabase/pgtap/_walls.sql`.

revoke all on function servicio.kitchen_today(uuid)                               from public, anon, authenticated;
revoke all on function servicio.promotions_switched_on()                          from public, anon, authenticated;
revoke all on function servicio.kitchen_card_open(uuid)                           from public, anon, authenticated;
revoke all on function servicio.promotion_running(servicio.promotion)             from public, anon, authenticated;
revoke all on function servicio.promotion_shown(servicio.promotion)               from public, anon, authenticated;
revoke all on function servicio.promotions_end_with_feature()                     from public, anon, authenticated;
revoke all on function servicio.client_promotions_end_with_card()                 from public, anon, authenticated;

revoke all on function public.kitchen_promotions(uuid)                            from public, anon;
revoke all on function public.create_promotion(uuid, uuid, text, text, text, text, integer[], date, text)
                                                                                   from public, anon;
revoke all on function public.end_promotion(uuid, uuid)                           from public, anon;
revoke all on function public.undo_promotion(uuid, uuid)                          from public, anon;

grant execute on function public.kitchen_promotions(uuid)                         to authenticated;
grant execute on function public.create_promotion(uuid, uuid, text, text, text, text, integer[], date, text)
                                                                                   to authenticated;
grant execute on function public.end_promotion(uuid, uuid)                        to authenticated;
grant execute on function public.undo_promotion(uuid, uuid)                       to authenticated;
