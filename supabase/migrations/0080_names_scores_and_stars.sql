-- ============================================================================
-- 0080 — names, scores and stars: what a fonda and a neighbour see of each
--        other, and how each rates the other
-- ============================================================================
-- docs/PLAN.md task `10.5b-ii-b`. The owner's final design of 2026-11-10 (the
-- plan's status entry of that night; the page *Names, Records and Stars*,
-- version 5, *What is recorded as ruled*), after four rounds the same night.
-- ADR-035 §2.7: the amendment under the name guarantee, *What is hers* and
-- *What she writes*.
--
-- WHAT IS HERE:
--   0. THE STATE LEARNS THE KITCHEN'S CANCEL: `reservation_state`, the one
--      definition, takes who cancelled as a sixth argument, defaulted, so
--      `cancelado_cocina` is read where every other state is. Dropped and
--      re-created — ADR-035 §2.2's way, never an overload — and granted to
--      nobody before and after, so no build can have called it.
--   1. FOUR TABLES IN `servicio`, read and written only through the functions
--      below, so no client role can reach a row (the schema is closed since
--      `0058`; ADR-035 §2.7, *What is hers*: a table only functions read sits in
--      a closed schema, and `01_rls_coverage.sql` needs no third policy shape):
--        `reservation_thumb`  the fonda's thumb on an order, with his labels
--        `kitchen_rating`     her stars about the fonda, tags, a note for Wera
--        `neighbour_yes`      her express yes, with its moment
--        `feature_switch`     Wera's own switches — the kitchen's cancel, off
--   2. TWO COLUMNS ON `reservation` FOR THE KITCHEN'S CANCEL (who, and a reason;
--      `cancelled_at` is its moment, as it is hers) and ONE ON `kitchen_page`
--      (`min_score`: who may reserve, by score).
--   3. FOUR HELPERS, granted to nobody: her short name, her score, her limit,
--      and the ratings a kitchen's are counted from (the day after).
--   4. THE KITCHEN'S SIDE: `reservation_neighbours` (the name and the score on
--      each order, and its thumb), `rate_neighbour`, `my_kitchen_ratings`,
--      `cancel_reservation_as_kitchen` (refused for everyone while it is off).
--   5. HER SIDE: `give_my_yes`, `my_standing`, `rate_kitchen`.
--   6. RE-CREATED, EACH SIGNATURE UNCHANGED: `reserve_plate` (her yes, the
--      kitchen's setting, trust that grows), `set_kitchen_page` (`min_score`),
--      `my_reservations` (the kitchen's cancel, her stars), `hand_over_reservation`
--      (*Sí pasó* clears a no-show), `on_offer_now` (each kitchen's setting and
--      stars), `delete_my_account` (what is about her goes with her).
--   7. HIS ANALYTICS: `servicio.apartados_por_semana()`, by week and kitchen,
--      every label counted, no person's name.
--
-- ⚠️ WHAT EACH SIDE SEES OF THE OTHER (ruled, the page's *What is recorded*):
--   * THE NAME — the kitchen she reserved at sees *Ana R.* on that order until
--     it is rated, at most 24 hours after its window, and never after. Cut here
--     from the one name her account keeps (`auth_full_name`): the first word and
--     the first letter of the second — the two boxes are joined into one string
--     at sign-up, and Spanish names do not split on a space, so *Ana María*
--     reads *Ana M.*. `reservation.buyer_id` stays granted to nobody.
--   * HER SCORE, NOT HER VISITS — the share of thumbs up among her last 20 thumbs
--     from any kitchen over 12 months, shown from her third; before it, *Nueva
--     en Itacate* (a NULL score). Read by the kitchen on each order while the name
--     is, and by her about herself with each label's count — never who gave
--     which, never which kitchen, never when.
--   * THE FONDA'S THUMB — up or down, his five labels from a closed list, each
--     only where it can be true: *Llegó a tiempo* and *Persona amable* (up) and
--     *Se presentó tarde* and *Problemas con el pago* (down) after a handover;
--     *No se presentó* (down) only after the window ended with no handover. Any
--     member gives it, at the handover or later, until 24 hours after the window;
--     it can be changed for 24 hours. ⚠️ A PLATE THAT *SE LIBERÓ* AND GOES UNRATED
--     FOR 24 HOURS COUNTS AS *NO SE PRESENTÓ* — read from the clock when her score
--     is counted, so no job runs and nothing is written; *Sí pasó* (the handover
--     recorded late) corrects it, and clears a no-show thumb already given.
--   * HER STARS ABOUT THE FONDA — one to five after *Ya lo tengo*, then tags (good
--     ones after four or five stars, problems after one to three) and a note only
--     Wera reads. The kitchen reads its own from five, the day after, mixed, never
--     who; the door shows a kitchen's stars and three top good tags from five,
--     counted the same day after — so a fonda cannot tell from a moving average
--     who gave which.
--   * WHO MAY RESERVE — the kitchen's setting: everyone, or more than 75, 80 or
--     85 per cent; a neighbour with fewer than three thumbs always passes; "más
--     de" is strictly more, on the exact share; it applies when she reserves, and
--     nobody already holding a plate is cancelled by it.
--   * HER EXPRESS YES — once, before her first reservation, kept with its moment.
--   * TRUST THAT GROWS — one reservation until her first pickup, then three; two
--     misses in her last ten (a plate that *se liberó*, or a *No se presentó*
--     thumb) take her back to one until she collects the next (round 2's words,
--     which the final design kept).
--   * THE KITCHEN'S CANCEL, BUILT AND SWITCHED OFF — its window and its penalty
--     after the pilot's numbers (his word). One function, refused for everyone
--     while `servicio.feature_switch`'s `kitchen_cancel` is off; turning it on is
--     one UPDATE on the live database, no build and no migration.
--
-- THE NEW REFUSALS (custom SQLSTATEs reach PostgREST as a 400):
--   TD020  this kitchen reserves for neighbours above its score, and hers is not
--   TD021  she has not yet given her express yes
--   TD022  nothing to rate there now: not handed over, nor a window ended without
--          her; her account is gone; or its 24 hours have passed
--   TD023  the kitchen's cancel is switched off
-- `TD016` keeps its meaning — she holds as many as she may — now one or three.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): tables
-- in a schema no client reaches, nullable columns, functions added; six functions
-- re-created with their signatures unchanged and `reservation_state` — granted to
-- nobody — re-created with one defaulted argument. No build in the field reserves
-- yet (`10.5b-iii` builds it), so `reserve_plate`'s new refusals meet no build.
-- The door gains two keys per kitchen and changes none.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. The state learns the kitchen's cancel
-- ----------------------------------------------------------------------------
-- `0079`'s body with one line added: a cancel the kitchen made (who is recorded)
-- reads `cancelado_cocina`. Every caller that passes five arguments answers as
-- before — a kitchen's cancel is still not `apartado` for them, which is all
-- the limit, the deletions and *what is taken* ask. A handover still wins.

drop function public.reservation_state(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz);

create function public.reservation_state(
  p_cancelled_at   timestamptz,
  p_handed_over_at timestamptz,
  p_picked_up_at   timestamptz,
  p_held_until     timestamptz,
  p_pickup_at      timestamptz,
  p_cancelled_by   uuid default null
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
           when p_handed_over_at is not null or p_picked_up_at is not null then 'recogido'
           when p_cancelled_at is not null and p_cancelled_by is not null then 'cancelado_cocina'
           when p_cancelled_at is not null then
             case when p_cancelled_at >= p_pickup_at - interval '1 hour' then 'no_va' else 'cancelado' end
           when p_held_until <= now() then 'liberado'
           else 'apartado'
         end
$$;

comment on function public.reservation_state(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, uuid) is
  'A reservation''s state, read from its moments: recogido (handed over or confirmed), '
  'cancelado_cocina (the kitchen cancelled it — who is the sixth argument; 0080), '
  'cancelado (she cancelled up to an hour before her hour), no_va (within it), '
  'liberado (the window ended with none of those), apartado (pending). The one '
  'definition. Granted to nobody. 0079, plan 10.5b-i; 0080, plan 10.5b-ii-b.';

revoke all on function public.reservation_state(timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, uuid)
  from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 1. Four tables in `servicio`
-- ----------------------------------------------------------------------------
-- ⚠️ NOT IN `public`: nobody signed in or out reads or writes a row of these, so
-- they sit in the schema `0058` closed — no client role may use it, PostgREST
-- does not serve it, and `_walls.sql` and `01_rls_coverage.sql` read `public`
-- alone. Every read and write is one of the functions below.
-- ⚠️ A PLAIN id, NEVER A KEY TO A LOGIN (`0053`): `neighbour_yes.user_id` and
-- `reservation_thumb.given_by` point at nobody, and `delete_my_account` removes
-- what is about her by hand. A thumb and a rating go with their reservation, so
-- a kitchen deleted takes them along.

comment on schema servicio is
  'Not tenant data, and readable by no client role: what Wera offers and where '
  '(0058), the Discord avisos (0070), and since 0080 what kitchens and neighbours '
  'say of each other, a neighbour''s express yes and Wera''s own switches. Not '
  'exposed to PostgREST; reached only through functions in public. 0058, plan 8j; '
  '0080, plan 10.5b-ii-b.';

create table servicio.reservation_thumb (
  reservation_id uuid primary key references public.reservation (id) on delete cascade,
  up             boolean not null,
  labels         text[] not null default '{}',
  given_by       uuid not null,
  given_at       timestamptz not null,
  changed_at     timestamptz,

  constraint reservation_thumb_labels_known
    check (labels <@ array['a_tiempo', 'amable', 'tarde', 'pago', 'no_se_presento']::text[]
           and array_position(labels, null) is null),
  constraint reservation_thumb_labels_fit_the_thumb
    check ((up and labels <@ array['a_tiempo', 'amable']::text[])
           or (not up and labels <@ array['tarde', 'pago', 'no_se_presento']::text[])),
  constraint reservation_thumb_no_show_alone
    check (not ('no_se_presento' = any (labels)) or labels = array['no_se_presento']::text[])
);

comment on table servicio.reservation_thumb is
  'The fonda''s thumb on one order: up or down, and the owner''s five labels from a '
  'closed list — a_tiempo (Llegó a tiempo), amable (Persona amable), tarde (Se presentó '
  'tarde), pago (Problemas con el pago), no_se_presento (No se presentó). Written by '
  'rate_neighbour; read by nobody but the functions of 0080. Goes with the reservation, '
  'and with her account. 0080, plan 10.5b-ii-b.';
comment on column servicio.reservation_thumb.given_by is
  'The member who set it last: a plain id (0053). 0080.';
comment on column servicio.reservation_thumb.given_at is
  'When it was first given — on the member''s phone when it waited in her queue. Her '
  'score is counted on this moment, and it can be changed for 24 hours after it. 0080.';

create table servicio.kitchen_rating (
  reservation_id uuid primary key references public.reservation (id) on delete cascade,
  stars          smallint not null,
  tags           text[] not null default '{}',
  note           text,
  given_at       timestamptz not null default now(),
  changed_at     timestamptz,

  constraint kitchen_rating_stars_one_to_five check (stars between 1 and 5),
  constraint kitchen_rating_tags_fit_the_stars
    check (array_position(tags, null) is null
           and ((stars >= 4 and tags <@ array['lista_a_tiempo', 'buena_porcion', 'muy_rica', 'me_atendieron_bien']::text[])
                or (stars <= 3 and tags <@ array['tuve_que_esperar', 'porcion_chica', 'no_me_gusto', 'me_atendieron_mal']::text[]))),
  constraint kitchen_rating_note_shape check (note is null or char_length(note) between 1 and 500)
);

comment on table servicio.kitchen_rating is
  'Her stars about the fonda, one to five, after a pickup; tags from a closed list — '
  'after four or five stars lista_a_tiempo, buena_porcion, muy_rica, me_atendieron_bien; '
  'after one to three tuve_que_esperar, porcion_chica, no_me_gusto, me_atendieron_mal — '
  'and a note only Wera reads. Written by rate_kitchen. The kitchen reads its own from '
  'five, the day after, never who (my_kitchen_ratings); the door shows the stars from '
  'five. Her note goes with her account; her stars stay, pointing to nobody. 0080, plan '
  '10.5b-ii-b.';
comment on column servicio.kitchen_rating.note is
  'What she tells Wera: up to 500 characters, read by no kitchen and by no function a '
  'client can call — only by the owner''s analytics. Cleared when her account is '
  'deleted. 0080.';

create table servicio.neighbour_yes (
  user_id  uuid primary key,
  given_at timestamptz not null default now()
);

comment on table servicio.neighbour_yes is
  'Her express yes, once, before her first reservation: the kitchens where she reserves '
  'see her name and her score, and kitchens rate her (LFPDPPP Art. 35 for the score '
  'travelling to other kitchens). user_id is a plain id (0053), removed with her account. '
  'reserve_plate refuses without it (TD021). 0080, plan 10.5b-ii-b.';

create table servicio.feature_switch (
  name       text primary key,
  is_on      boolean not null default false,
  changed_at timestamptz not null default now(),

  constraint feature_switch_name_shape check (name ~ '^[a-z_]+$')
);

comment on table servicio.feature_switch is
  'Wera''s own switches, kept outside the apps: turning one on is one UPDATE on the live '
  'database, no build and no migration. kitchen_cancel — a kitchen may cancel a '
  'reservation (cancel_reservation_as_kitchen); off until its window and its penalty are '
  'ruled after the pilot''s numbers (the owner, 2026-11-10). 0080, plan 10.5b-ii-b.';

insert into servicio.feature_switch (name, is_on) values ('kitchen_cancel', false);

revoke all on servicio.reservation_thumb from public, anon, authenticated;
revoke all on servicio.kitchen_rating    from public, anon, authenticated;
revoke all on servicio.neighbour_yes     from public, anon, authenticated;
revoke all on servicio.feature_switch    from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. The kitchen's cancel on the reservation, and who may reserve
-- ----------------------------------------------------------------------------
-- `cancelled_at` stays the moment of every cancel; a kitchen's also says who and
-- why. Nothing writes them while the switch is off. The reasons are a short list
-- he may change when the cancel is switched on (the page: *the reasons, if the
-- short list needs changing*).

alter table public.reservation
  add column cancelled_by  uuid,
  add column cancel_reason text;

alter table public.reservation
  add constraint reservation_cancel_reason_known
    check (cancel_reason is null or cancel_reason in ('se_acabo', 'cerramos', 'otro')),
  add constraint reservation_kitchen_cancel_whole
    check ((cancelled_by is null) = (cancel_reason is null)
           and (cancelled_by is null or cancelled_at is not null));

comment on column public.reservation.cancelled_by is
  'When the kitchen cancelled it: the member who did, a plain id (0053). NULL when she '
  'cancelled, or nobody did. Written only by cancel_reservation_as_kitchen, switched off. '
  '0080, plan 10.5b-ii-b.';
comment on column public.reservation.cancel_reason is
  'Why the kitchen cancelled: se_acabo (se nos acabó), cerramos (tuvimos que cerrar), '
  'otro. NULL unless the kitchen cancelled. 0080.';

-- The kitchen's members read every column but `buyer_id` (`0079`), these two too.
grant select (cancelled_by, cancel_reason) on public.reservation to authenticated;

alter table public.kitchen_page add column min_score smallint;

alter table public.kitchen_page
  add constraint kitchen_page_min_score_known check (min_score is null or min_score in (75, 80, 85));

comment on column public.kitchen_page.min_score is
  'Who may reserve here, by her score: NULL is everyone (Todos, how every kitchen '
  'starts); 75, 80 or 85 admits a neighbour whose share of thumbs up is strictly more. '
  'A neighbour with fewer than three thumbs always passes. Set in Mi cocina → Ajustes de '
  'apartados; checked by reserve_plate when she reserves (TD020); nobody is cancelled by '
  'it. 0080, plan 10.5b-ii-b.';


-- ----------------------------------------------------------------------------
-- 3. Four helpers, granted to nobody
-- ----------------------------------------------------------------------------
-- Each runs only inside the `security definer` functions below, as their owner,
-- and is not in `_walls.sql`'s list. Each is the ONE definition of what it reads.

-- *Ana R.*: the first word of the name her account keeps, and the first letter of
-- the second. One word is that word; no name is NULL — the code says the rest.
create function public.neighbour_name(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
           when cardinality(x.w) = 0 then null
           when cardinality(x.w) = 1 then x.w[1]
           else x.w[1] || ' ' || upper(left(x.w[2], 1)) || '.'
         end
    from (select coalesce(regexp_split_to_array(public.auth_full_name(p_user_id), '\s+'), '{}'::text[]) as w) x
$$;

comment on function public.neighbour_name(uuid) is
  'A neighbour''s short name for the kitchen she reserved at — Ana R.: the first word '
  'of auth_full_name and the first letter of the second; one word alone; NULL with no '
  'name. Granted to nobody. 0080, plan 10.5b-ii-b.';

-- HER SCORE: her last 20 thumbs from any kitchen over 12 months, newest first.
-- A plate that *se liberó* and went 24 hours without a thumb is one more thumb
-- down with *No se presentó*, at the moment its 24 hours ended — read here, at
-- count time, so no job runs and nothing is written.
-- Answers {up, total, labels: {each of the five: how many of the 20 carry it}}.
create function public.neighbour_score(p_user_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with thumbs as (
    select r.id, t.given_at as at, t.up, t.labels
      from servicio.reservation_thumb t
      join public.reservation r on r.id = t.reservation_id
     where r.buyer_id = p_user_id
    union all
    select r.id, r.held_until + interval '24 hours', false, array['no_se_presento']::text[]
      from public.reservation r
     where r.buyer_id = p_user_id
       and public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                    r.held_until, r.pickup_at, r.cancelled_by) = 'liberado'
       and r.held_until + interval '24 hours' <= now()
       and not exists (select 1 from servicio.reservation_thumb t where t.reservation_id = r.id)
  ), counted as (
    select *
      from thumbs
     where at > now() - interval '12 months'
     order by at desc, id
     limit 20
  )
  select jsonb_build_object(
           'up', (select count(*) from counted where up)::integer,
           'total', (select count(*) from counted)::integer,
           'labels', (select jsonb_object_agg(c.code, (select count(*) from counted k where c.code = any (k.labels))::integer)
                        from unnest(array['a_tiempo', 'amable', 'tarde', 'pago', 'no_se_presento']) c(code)))
$$;

comment on function public.neighbour_score(uuid) is
  'Her score''s counts: among her last 20 thumbs from any kitchen over 12 months, how '
  'many are up, how many there are, and how many carry each of the five labels. A plate '
  'that se liberó and went 24 hours unrated counts as a thumb down with no_se_presento. '
  'Shown from the third thumb; a kitchen''s setting compares up * 100 > min * total. '
  'Granted to nobody. 0080, plan 10.5b-ii-b.';

-- TRUST THAT GROWS: how many reservations she may hold still to collect. One until
-- her first pickup, then three; two misses among her last ten that ended — a plate
-- that *se liberó*, or one a kitchen rated *No se presentó* — take her back to one
-- until she collects the next. Cancelled ones are not counted: she gave the plate
-- back (round 2's table, kept by the final design).
create function public.neighbour_limit(p_user_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  with ended as (
    select r.id, r.pickup_at,
           s.state = 'liberado'
             or exists (select 1 from servicio.reservation_thumb t
                         where t.reservation_id = r.id and 'no_se_presento' = any (t.labels)) as missed
      from public.reservation r
     cross join lateral (select public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                                         r.held_until, r.pickup_at, r.cancelled_by) as state) s
     where r.buyer_id = p_user_id
       and s.state in ('recogido', 'liberado')
  ), last_ten as (
    select *
      from ended
     where pickup_at > now() - interval '12 months'
     order by pickup_at desc, id
     limit 10
  )
  select case
           when not exists (select 1 from ended where not missed) then 1
           when (select count(*) from last_ten where missed) >= 2
                and not exists (select 1 from ended c
                                 where not c.missed
                                   and c.pickup_at > (select max(m.pickup_at) from last_ten m where m.missed)) then 1
           else 3
         end
$$;

comment on function public.neighbour_limit(uuid) is
  'How many reservations she may hold still to collect: 1 until her first pickup, then '
  '3; 1 again while two of her last ten that ended (12 months) were missed — se liberó, '
  'or a no_se_presento thumb — and she has not collected one since. Granted to nobody. '
  '0080, plan 10.5b-ii-b.';

-- WHAT A KITCHEN'S STARS ARE COUNTED FROM: every rating of it given or last changed
-- before today began in the kitchen's own zone — the day after, so neither the
-- kitchen's own read nor the door's average moves on the afternoon of a pickup.
create function public.kitchen_ratings_counted(p_workspace_id uuid)
returns table (stars smallint, tags text[], rated_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select kr.stars, kr.tags, coalesce(kr.changed_at, kr.given_at)
    from servicio.kitchen_rating kr
    join public.reservation r on r.id = kr.reservation_id
    join public.location l on l.id = r.location_id
   where r.workspace_id = p_workspace_id
     and coalesce(kr.changed_at, kr.given_at)
         < ((now() at time zone l.timezone)::date)::timestamp at time zone l.timezone
$$;

comment on function public.kitchen_ratings_counted(uuid) is
  'A kitchen''s ratings as they may be shown: each given or last changed before today '
  'began in its zone (the day after), with its stars, tags and that moment — never who '
  'or which order. The one definition, read by my_kitchen_ratings and on_offer_now. '
  'Granted to nobody. 0080, plan 10.5b-ii-b.';

revoke all on function public.neighbour_name(uuid)          from public, anon, authenticated;
revoke all on function public.neighbour_score(uuid)         from public, anon, authenticated;
revoke all on function public.neighbour_limit(uuid)         from public, anon, authenticated;
revoke all on function public.kitchen_ratings_counted(uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. The kitchen's side — under its ordinary walls
-- ----------------------------------------------------------------------------

-- ⚠️ WHAT A KITCHEN SEES OF EACH NEIGHBOUR, ON EACH ORDER, AND ITS OWN THUMBS. The
-- orders themselves are read from `reservation` under its policy (`0079`); this
-- adds, for each one of that kitchen's last 30 days at the member's own branches:
--   `neighbour`  {name, score} while the order is pending or waits for its thumb —
--                not yet rated, and less than 24 hours after its window — else
--                NULL; `score` is {up, total} from her third thumb, else NULL
--                (*Nueva en Itacate*). Never her id, never which kitchens rated her.
--   `thumb`      this kitchen's thumb on it — {up, labels, given_at, change_until,
--                clock: false} — or the clock's *No se presentó* once a plate that
--                *se liberó* went 24 hours unrated ({…, clock: true}); else NULL.
--   `rate_until` until when a first thumb may be given, while it may; else NULL.
-- Any member of that kitchen, any role — everyone hands over (question 3).
create function public.reservation_neighbours(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'reservation_neighbours requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'reservation_neighbours: that kitchen is not one of yours' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', r.id,
             'neighbour', case when v.open then jsonb_build_object(
                                'name', public.neighbour_name(r.buyer_id),
                                'score', (select case when (x.sc ->> 'total')::integer >= 3 then
                                                   jsonb_build_object('up', (x.sc ->> 'up')::integer,
                                                                      'total', (x.sc ->> 'total')::integer)
                                                 end
                                            from (select public.neighbour_score(r.buyer_id) as sc) x)) end,
             'thumb', case
                        when t.reservation_id is not null then jsonb_build_object(
                          'up', t.up, 'labels', to_jsonb(t.labels), 'given_at', t.given_at,
                          'change_until', t.given_at + interval '24 hours', 'clock', false)
                        when s.state = 'liberado' and r.held_until + interval '24 hours' <= now() then jsonb_build_object(
                          'up', false, 'labels', to_jsonb(array['no_se_presento']), 'given_at', r.held_until + interval '24 hours',
                          'change_until', null, 'clock', true)
                      end,
             'rate_until', case when t.reservation_id is null and r.buyer_id is not null
                                     and s.state in ('recogido', 'liberado')
                                     and now() < r.held_until + interval '24 hours'
                                then r.held_until + interval '24 hours' end
           ) order by r.pickup_at, r.id), '[]'::jsonb)
      from public.reservation r
      join public.location l on l.id = r.location_id
      left join servicio.reservation_thumb t on t.reservation_id = r.id
     cross join lateral (select public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                                         r.held_until, r.pickup_at, r.cancelled_by) as state) s
     cross join lateral (select r.buyer_id is not null
                                and t.reservation_id is null
                                and s.state in ('apartado', 'recogido', 'liberado')
                                and now() < r.held_until + interval '24 hours' as open) v
     where r.workspace_id = p_workspace_id
       and r.location_id in (select public.my_locations())
       and r.pickup_day >= (now() at time zone l.timezone)::date - 30
  );
end;
$$;

comment on function public.reservation_neighbours(uuid) is
  'For each of a kitchen''s reservations of its last 30 days at the caller''s branches: '
  'the neighbour — her short name and her score ({up, total} from her third thumb, else '
  'NULL: Nueva en Itacate) — while it is pending or waits for its thumb (not rated, less '
  'than 24 hours after its window), else NULL; the kitchen''s thumb, or the clock''s No '
  'se presentó; and until when a first thumb may be given. Any member. Never her id. '
  '42501. 0080, plan 10.5b-ii-b.';

-- ⚠️ THE FONDA'S THUMB, EACH LABEL ONLY WHERE IT CAN BE TRUE:
--   up            the order was collected (handed over, or *Ya lo tengo*):
--                 a_tiempo, amable, or none
--   down          collected: tarde, pago, or none; or, once the window ended with
--                 no handover, no_se_presento — alone. On a plate that *se liberó*
--                 a thumb down is no_se_presento whatever is sent.
-- A first thumb until 24 hours after the window; a change for 24 hours after the
-- first. `p_at` is when it was given on her phone, for a thumb that waited in her
-- queue with the handover (`10.5b-iv`), kept between the order's making and now.
-- A retry of the same thumb answers it. Any member of that kitchen, any role.
-- THE REFUSALS: 42501 not signed in, or not at one of her kitchens; 22023 no
-- thumb, an unknown label, or a label that cannot be true there; TD022 nothing to
-- rate (pending or cancelled; her account gone) or its 24 hours over.
create function public.rate_neighbour(
  p_reservation_id uuid,
  p_up             boolean,
  p_labels         text[] default null,
  p_at             timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_r      public.reservation%rowtype;
  v_old    servicio.reservation_thumb%rowtype;
  v_state  text;
  v_labels text[];
  v_at     timestamptz;
begin
  if v_user is null then
    raise exception 'rate_neighbour requires an authenticated caller' using errcode = '42501';
  end if;

  select * into v_r from public.reservation r
   where r.id = p_reservation_id
     and r.workspace_id in (select public.my_workspaces())
     and r.location_id  in (select public.my_locations())
   for update;
  if not found then
    raise exception 'rate_neighbour: that reservation is not at one of your kitchens' using errcode = '42501';
  end if;

  if p_up is null then
    raise exception 'rate_neighbour: a thumb is up or down' using errcode = '22023';
  end if;
  if p_labels is not null and array_position(p_labels, null) is not null then
    raise exception 'rate_neighbour: a label is never null' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct l order by l), '{}'::text[]) into v_labels
    from unnest(coalesce(p_labels, '{}'::text[])) l;
  if not v_labels <@ array['a_tiempo', 'amable', 'tarde', 'pago', 'no_se_presento']::text[] then
    raise exception 'rate_neighbour: the labels are a_tiempo, amable, tarde, pago and no_se_presento'
      using errcode = '22023';
  end if;

  if v_r.buyer_id is null then
    raise exception 'rate_neighbour: her account no longer exists, so there is nobody to rate' using errcode = 'TD022';
  end if;
  v_state := public.reservation_state(v_r.cancelled_at, v_r.handed_over_at, v_r.picked_up_at,
                                      v_r.held_until, v_r.pickup_at, v_r.cancelled_by);
  if v_state not in ('recogido', 'liberado') then
    raise exception 'rate_neighbour: only an order collected, or one whose window ended without her, is rated (%)', v_state
      using errcode = 'TD022';
  end if;

  if v_state = 'liberado' then
    if p_up or not v_labels <@ array['no_se_presento']::text[] then
      raise exception 'rate_neighbour: a plate that se liberó is rated No se presentó — or handed over first (Sí pasó)'
        using errcode = '22023';
    end if;
    v_labels := array['no_se_presento']::text[];
  elsif p_up then
    if not v_labels <@ array['a_tiempo', 'amable']::text[] then
      raise exception 'rate_neighbour: a thumb up carries a_tiempo or amable' using errcode = '22023';
    end if;
  elsif 'no_se_presento' = any (v_labels) then
    if v_labels <> array['no_se_presento']::text[]
       or v_r.handed_over_at is not null or v_r.held_until > now() then
      raise exception 'rate_neighbour: No se presentó is alone, and only once the window ended with no handover'
        using errcode = '22023';
    end if;
  elsif not v_labels <@ array['tarde', 'pago']::text[] then
    raise exception 'rate_neighbour: a thumb down after a handover carries tarde or pago' using errcode = '22023';
  end if;

  v_at := greatest(least(coalesce(p_at, now()), now()), v_r.created_at);

  select * into v_old from servicio.reservation_thumb t where t.reservation_id = v_r.id for update;
  if found then
    if v_old.up = p_up and v_old.labels = v_labels then
      return jsonb_build_object('up', v_old.up, 'labels', to_jsonb(v_old.labels), 'given_at', v_old.given_at,
                                'change_until', v_old.given_at + interval '24 hours');
    end if;
    if now() > v_old.given_at + interval '24 hours' then
      raise exception 'rate_neighbour: a thumb is changed only in its first 24 hours' using errcode = 'TD022';
    end if;
    update servicio.reservation_thumb
       set up = p_up, labels = v_labels, given_by = v_user, changed_at = now()
     where reservation_id = v_r.id;
    return jsonb_build_object('up', p_up, 'labels', to_jsonb(v_labels), 'given_at', v_old.given_at,
                              'change_until', v_old.given_at + interval '24 hours');
  end if;

  if v_at > v_r.held_until + interval '24 hours' then
    raise exception 'rate_neighbour: an order is rated until 24 hours after its window' using errcode = 'TD022';
  end if;
  insert into servicio.reservation_thumb (reservation_id, up, labels, given_by, given_at)
  values (v_r.id, p_up, v_labels, v_user, v_at);
  return jsonb_build_object('up', p_up, 'labels', to_jsonb(v_labels), 'given_at', v_at,
                            'change_until', v_at + interval '24 hours');
end;
$$;

comment on function public.rate_neighbour(uuid, boolean, text[], timestamptz) is
  'A member of the kitchen gives the neighbour a thumb on one order: up (a_tiempo, '
  'amable) or down (tarde, pago after a pickup; no_se_presento alone once the window '
  'ended with no handover — always, on a plate that se liberó). Until 24 hours after the '
  'window; changed for 24 hours after it was first given. p_at is when, on her phone. '
  'Answers {up, labels, given_at, change_until}. 42501 / 22023 / TD022 — see 0080. Plan '
  '10.5b-ii-b.';

-- ⚠️ HER STARS AS THE KITCHEN MAY SEE THEM: from five, the day after, mixed, never
-- who (Q3, ruled 2026-11-10). Below five, how many there are and nothing else.
-- From five: how many, the average to one decimal, how many times each of the
-- eight tags was given, and yesterday's ratings — stars and tags only, ordered by
-- stars and tags, never by time, never an order, a code or a name. The note is
-- never here: only Wera reads it. Any member of that kitchen.
create function public.my_kitchen_ratings(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_zone  text;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'my_kitchen_ratings requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'my_kitchen_ratings: that kitchen is not one of yours' using errcode = '42501';
  end if;

  select count(*)::integer into v_count from public.kitchen_ratings_counted(p_workspace_id);
  if v_count < 5 then
    return jsonb_build_object('count', v_count);
  end if;

  select l.timezone into v_zone
    from public.location l
   where l.workspace_id = p_workspace_id and l.is_active
   order by l.created_at, l.id
   limit 1;

  return jsonb_build_object(
    'count', v_count,
    'average', (select round(avg(c.stars), 1)::text from public.kitchen_ratings_counted(p_workspace_id) c),
    'tags', (select jsonb_object_agg(g.tag, (select count(*) from public.kitchen_ratings_counted(p_workspace_id) c
                                               where g.tag = any (c.tags))::integer)
               from unnest(array['lista_a_tiempo', 'buena_porcion', 'muy_rica', 'me_atendieron_bien',
                                 'tuve_que_esperar', 'porcion_chica', 'no_me_gusto', 'me_atendieron_mal']) g(tag)),
    'yesterday', (select coalesce(jsonb_agg(jsonb_build_object('stars', c.stars, 'tags', to_jsonb(c.tags))
                                            order by c.stars desc, array_to_string(c.tags, ',')), '[]'::jsonb)
                    from public.kitchen_ratings_counted(p_workspace_id) c
                   where (c.rated_at at time zone coalesce(v_zone, 'America/Mexico_City'))::date
                         = (now() at time zone coalesce(v_zone, 'America/Mexico_City'))::date - 1));
end;
$$;

comment on function public.my_kitchen_ratings(uuid) is
  'The neighbours'' stars about a kitchen, as its members may see them: counted the day '
  'after (kitchen_ratings_counted); below five, {count} alone; from five, {count, '
  'average, tags: each of the eight tags'' count, yesterday: [{stars, tags}] mixed}. '
  'Never who, which order or when; never her note. Any member. 42501. 0080, plan '
  '10.5b-ii-b.';

-- ⚠️ THE KITCHEN'S CANCEL, BUILT AND SWITCHED OFF (the owner, 2026-11-10): refused
-- for everyone while `servicio.feature_switch`'s `kitchen_cancel` is off — checked
-- first, before whose reservation it is. Once on: the owner or a manager of that
-- kitchen, a pending reservation, a reason from the short list; the plate goes
-- back on offer, as any cancellation's does (`listing_line_taken`), and she reads
-- `cancelado_cocina`. Its window before her hour and its penalty are his, after
-- the pilot's numbers — a later migration, which no build will have called.
-- A retry answers the state it left.
create function public.cancel_reservation_as_kitchen(p_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_r     public.reservation%rowtype;
  v_state text;
begin
  if v_user is null then
    raise exception 'cancel_reservation_as_kitchen requires an authenticated caller' using errcode = '42501';
  end if;

  if not coalesce((select s.is_on from servicio.feature_switch s where s.name = 'kitchen_cancel'), false) then
    raise exception 'cancel_reservation_as_kitchen: a kitchen does not cancel a reservation yet' using errcode = 'TD023';
  end if;

  select * into v_r from public.reservation r
   where r.id = p_id
     and r.workspace_id in (select public.my_workspaces())
     and r.location_id  in (select public.my_locations())
   for update;
  if not found or not public.has_role(v_r.workspace_id, 'manager') then
    raise exception 'cancel_reservation_as_kitchen: only the owner or a manager of that kitchen cancels it'
      using errcode = '42501';
  end if;

  if p_reason is null or p_reason not in ('se_acabo', 'cerramos', 'otro') then
    raise exception 'cancel_reservation_as_kitchen: the reason is se_acabo, cerramos or otro' using errcode = '22023';
  end if;

  v_state := public.reservation_state(v_r.cancelled_at, v_r.handed_over_at, v_r.picked_up_at,
                                      v_r.held_until, v_r.pickup_at, v_r.cancelled_by);
  if v_state = 'cancelado_cocina' then
    return v_state;
  end if;
  if v_state <> 'apartado' then
    raise exception 'cancel_reservation_as_kitchen: that reservation is no longer pending (%)', v_state
      using errcode = 'TD018';
  end if;

  update public.reservation
     set cancelled_at = now(), cancelled_by = v_user, cancel_reason = p_reason
   where id = v_r.id;
  return 'cancelado_cocina';
end;
$$;

comment on function public.cancel_reservation_as_kitchen(uuid, text) is
  'The owner or a manager of a kitchen cancels a pending reservation, with a reason '
  '(se_acabo, cerramos, otro); the plate is back on offer and she reads cancelado_cocina. '
  'Refused for everyone (TD023) while servicio.feature_switch kitchen_cancel is off — '
  'built and switched off, its window and its penalty after the pilot''s numbers (the '
  'owner, 2026-11-10). 42501 / 22023 / TD018. 0080, plan 10.5b-ii-b.';


-- ----------------------------------------------------------------------------
-- 5. Her side — keyed on her own id (ADR-035 §2.7, *What is hers*)
-- ----------------------------------------------------------------------------

-- ⚠️ HER EXPRESS YES, ONCE, BEFORE HER FIRST RESERVATION (the screen *Antes de tu
-- primer apartado*): the kitchens where she reserves see her name and her score,
-- and kitchens rate her. Its first moment is kept; a retry answers it.
create function public.give_my_yes()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'give_my_yes requires an authenticated caller' using errcode = '42501';
  end if;
  insert into servicio.neighbour_yes (user_id) values (v_user) on conflict (user_id) do nothing;
  return (select y.given_at from servicio.neighbour_yes y where y.user_id = v_user);
end;
$$;

comment on function public.give_my_yes() is
  'The caller gives her express yes, once, before her first reservation: kitchens rate '
  'her, and the kitchens where she reserves see her name and score. Keeps the first '
  'moment and answers it. 42501. 0080, plan 10.5b-ii-b.';

-- ⚠️ HERS, AND NOTHING ELSE — what *Tú* and the dish's page need of her standing:
--   `yes_at`   when she gave her yes, or NULL (Itacate asks before she reserves)
--   `score`    {up, total} from her third thumb, else NULL (*Nueva en Itacate*)
--   `total`    how many thumbs her score counts, and `labels`, how many of them
--              carry each of the five — never which kitchen, never when
--   `limit`    how many she may hold still to collect now (1 or 3), and
--   `holding`  how many she holds
create function public.my_standing()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_score jsonb;
begin
  if v_user is null then
    raise exception 'my_standing requires an authenticated caller' using errcode = '42501';
  end if;

  v_score := public.neighbour_score(v_user);
  return jsonb_build_object(
    'yes_at', (select y.given_at from servicio.neighbour_yes y where y.user_id = v_user),
    'score', case when (v_score ->> 'total')::integer >= 3 then
                    jsonb_build_object('up', (v_score ->> 'up')::integer, 'total', (v_score ->> 'total')::integer)
             end,
    'total', (v_score ->> 'total')::integer,
    'labels', v_score -> 'labels',
    'limit', public.neighbour_limit(v_user),
    'holding', (select count(*)::integer from public.reservation r
                 where r.buyer_id = v_user
                   and public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                                r.held_until, r.pickup_at, r.cancelled_by) = 'apartado'));
end;
$$;

comment on function public.my_standing() is
  'The caller''s own standing: yes_at (her express yes, or NULL), score ({up, total} '
  'from her third thumb, else NULL), total and labels (each of the five labels'' count '
  'among the thumbs her score counts), limit (1 or 3 she may hold now) and holding. '
  'Never which kitchen rated her, or when. 42501. 0080, plan 10.5b-ii-b.';

-- ⚠️ HER STARS ABOUT THE FONDA, AFTER A PICKUP: one to five (one tap), then tags —
-- good ones after four or five stars, problems after one to three — and a note
-- only Wera reads. Each call sets all three (a blank note is none); until the day
-- after its window, as *Ya lo tengo* is. 42501 not hers; 22023 stars outside one
-- to five, a tag unknown or of the other band, a note over 500 characters; TD022
-- not collected, or the day after its window is over.
create function public.rate_kitchen(
  p_reservation_id uuid,
  p_stars          integer,
  p_tags           text[] default null,
  p_note           text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_r     public.reservation%rowtype;
  v_tags  text[];
  v_note  text;
begin
  if v_user is null then
    raise exception 'rate_kitchen requires an authenticated caller' using errcode = '42501';
  end if;

  select * into v_r from public.reservation r
   where r.id = p_reservation_id and r.buyer_id = v_user
   for update;
  if not found then
    raise exception 'rate_kitchen: that reservation is not one of yours' using errcode = '42501';
  end if;

  if public.reservation_state(v_r.cancelled_at, v_r.handed_over_at, v_r.picked_up_at,
                              v_r.held_until, v_r.pickup_at, v_r.cancelled_by) <> 'recogido' then
    raise exception 'rate_kitchen: only a plate she collected is rated' using errcode = 'TD022';
  end if;
  if now() > v_r.held_until + interval '24 hours' then
    raise exception 'rate_kitchen: a kitchen is rated until the day after its window' using errcode = 'TD022';
  end if;

  if p_stars is null or p_stars not between 1 and 5 then
    raise exception 'rate_kitchen: stars are one to five' using errcode = '22023';
  end if;
  if p_tags is not null and array_position(p_tags, null) is not null then
    raise exception 'rate_kitchen: a tag is never null' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct t order by t), '{}'::text[]) into v_tags
    from unnest(coalesce(p_tags, '{}'::text[])) t;
  if not ((p_stars >= 4 and v_tags <@ array['lista_a_tiempo', 'buena_porcion', 'muy_rica', 'me_atendieron_bien']::text[])
          or (p_stars <= 3 and v_tags <@ array['tuve_que_esperar', 'porcion_chica', 'no_me_gusto', 'me_atendieron_mal']::text[])) then
    raise exception 'rate_kitchen: after four or five stars the tags are lista_a_tiempo, buena_porcion, muy_rica, me_atendieron_bien; after one to three tuve_que_esperar, porcion_chica, no_me_gusto, me_atendieron_mal'
      using errcode = '22023';
  end if;
  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'rate_kitchen: a note is at most 500 characters' using errcode = '22023';
  end if;

  insert into servicio.kitchen_rating as k (reservation_id, stars, tags, note)
  values (v_r.id, p_stars, v_tags, v_note)
  on conflict (reservation_id) do update
     set stars = excluded.stars, tags = excluded.tags, note = excluded.note, changed_at = now();

  return jsonb_build_object('stars', p_stars, 'tags', to_jsonb(v_tags));
end;
$$;

comment on function public.rate_kitchen(uuid, integer, text[], text) is
  'The neighbour rates the kitchen of a plate she collected: stars one to five, tags of '
  'their band (after 4–5 lista_a_tiempo, buena_porcion, muy_rica, me_atendieron_bien; '
  'after 1–3 tuve_que_esperar, porcion_chica, no_me_gusto, me_atendieron_mal), and a note '
  'only Wera reads (blank is none, at most 500 characters). Each call sets all three, '
  'until the day after its window. Answers {stars, tags}. 42501 / 22023 / TD022 — see '
  '0080. Plan 10.5b-ii-b.';


-- ----------------------------------------------------------------------------
-- 6. Re-created, each signature unchanged
-- ----------------------------------------------------------------------------
-- Each body is `0079`'s with its changes marked *New in 0080* or *0080*, and
-- nothing else moved — the door's text above all, which `cocina/test/comoLaVen.test.ts`
-- and the census in `supabase/tests/0078_the_door_and_googles_point.sql` read.
-- `create or replace` keeps each one's grants.

create or replace function public.reserve_plate(
  p_id         uuid,
  p_listing_id uuid,
  p_line_no    integer,
  p_pickup_at  timestamptz,
  p_payment    text,
  p_eat        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_old      public.reservation%rowtype;
  v_listing  public.listing%rowtype;
  v_line     public.listing_line%rowtype;
  v_page     public.kitchen_page%rowtype;
  v_zone     text;
  v_eat      text;
  v_day      date;
  v_code     integer;
  v_tries    integer := 0;
  -- New in 0080: her score, and how many she may hold now.
  v_score    jsonb;
  v_limit    integer;
begin
  if v_user is null then
    raise exception 'reserve_plate requires an authenticated caller' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'reserve_plate: the phone must make the reservation''s id' using errcode = '22023';
  end if;

  -- A retry of a reservation already made is that reservation.
  select * into v_old from public.reservation r where r.id = p_id;
  if found then
    if v_old.buyer_id is distinct from v_user then
      raise exception 'reserve_plate: that id is not one of your reservations' using errcode = '42501';
    end if;
    return jsonb_build_object('id', v_old.id, 'code', v_old.code);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('tienda.reserve.buyer:' || v_user::text, 0));

  select li.* into v_listing
    from public.listing li
    join public.workspace w on w.id = li.workspace_id
   where li.id = p_listing_id
     and w.kind = 'cocina' and w.is_active
     and li.withdrawn_at is null and li.pickup_end > now();
  if not found then
    raise exception 'reserve_plate: that offer is no longer on offer' using errcode = 'TD015';
  end if;

  if exists (select 1 from public.workspace_member wm
              where wm.workspace_id = v_listing.workspace_id
                and wm.user_id = v_user and wm.is_active) then
    raise exception 'reserve_plate: a kitchen''s own people do not reserve at it' using errcode = 'TD017';
  end if;

  -- New in 0080: her express yes, once, before her first reservation.
  if not exists (select 1 from servicio.neighbour_yes y where y.user_id = v_user) then
    raise exception 'reserve_plate: she has not yet said yes to what the kitchens see of her'
      using errcode = 'TD021';
  end if;

  -- New in 0080: who may reserve at this kitchen, by her score. A neighbour with
  -- fewer than three thumbs always passes; "más de" is strictly more, on the
  -- exact share, so a rounded 80% on her screen never decides it.
  select * into v_page from public.kitchen_page p where p.workspace_id = v_listing.workspace_id;
  if v_page.min_score is not null then
    v_score := public.neighbour_score(v_user);
    if (v_score ->> 'total')::integer >= 3
       and (v_score ->> 'up')::integer * 100 <= v_page.min_score * (v_score ->> 'total')::integer then
      raise exception 'reserve_plate: this kitchen reserves for neighbours above % per cent', v_page.min_score
        using errcode = 'TD020';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('tienda.reserve.business:' || v_listing.workspace_id::text, 0));

  select * into v_line from public.listing_line ll
   where ll.listing_id = v_listing.id and ll.line_no = p_line_no;
  if not found then
    raise exception 'reserve_plate: that offer has no line %', p_line_no using errcode = '22023';
  end if;

  -- New in 0080: trust that grows — one until her first pickup, then three; two
  -- misses in her last ten take her back to one until she collects the next.
  v_limit := public.neighbour_limit(v_user);
  if (select count(*) from public.reservation r
       where r.buyer_id = v_user
         and public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                      r.held_until, r.pickup_at, r.cancelled_by) = 'apartado') >= v_limit then
    raise exception 'reserve_plate: % still to collect is as many as she may hold now', v_limit
      using errcode = 'TD016';
  end if;

  if v_line.quantity - public.listing_line_taken(v_line.id) < 1 then
    raise exception 'reserve_plate: nothing is left of that dish' using errcode = 'TD015';
  end if;

  if p_payment is null
     or p_payment not in ('efectivo', 'tarjeta', 'transferencia')
     or (p_payment = 'tarjeta' and not coalesce(v_page.accepts_card, false))
     or (p_payment = 'transferencia' and not coalesce(v_page.accepts_transfer, false)) then
    raise exception 'reserve_plate: the kitchen does not take that — cash always, a card or a transfer when she says so'
      using errcode = '22023';
  end if;

  if p_eat is null then
    v_eat := case when v_line.para_llevar then 'llevar' else 'aqui' end;
  elsif p_eat = 'llevar' and v_line.para_llevar then
    v_eat := 'llevar';
  elsif p_eat = 'aqui' and v_line.para_aqui then
    v_eat := 'aqui';
  else
    raise exception 'reserve_plate: that dish is not eaten that way' using errcode = '22023';
  end if;

  -- Her hour: a quarter hour, from the current one, inside the window, until 15
  -- minutes before it ends (call 11). `date_bin` keeps it free of any zone.
  if p_pickup_at is null
     or date_bin('15 minutes', p_pickup_at, timestamptz '2000-01-01 00:00:00+00') <> p_pickup_at
     or p_pickup_at < v_listing.pickup_start
     or p_pickup_at > v_listing.pickup_end - interval '15 minutes'
     or p_pickup_at < date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') then
    raise exception 'reserve_plate: her hour is a quarter hour from now until 15 minutes before the window ends'
      using errcode = '22023';
  end if;

  select l.timezone into v_zone from public.location l where l.id = v_listing.location_id;
  v_day := (p_pickup_at at time zone v_zone)::date;

  -- The code: random, unused at that business that day.
  loop
    v_code := 100 + floor(random() * 900)::integer;
    exit when not exists (select 1 from public.reservation r
                           where r.workspace_id = v_listing.workspace_id
                             and r.pickup_day = v_day and r.code = v_code);
    v_tries := v_tries + 1;
    if v_tries >= 20 then
      select min(c) into v_code
        from generate_series(100, 999) c
       where not exists (select 1 from public.reservation r
                          where r.workspace_id = v_listing.workspace_id
                            and r.pickup_day = v_day and r.code = c);
      if v_code is null then
        raise exception 'reserve_plate: every code of that day is taken' using errcode = '54000';
      end if;
      exit;
    end if;
  end loop;

  insert into public.reservation
    (id, workspace_id, location_id, listing_id, buyer_id, code, pickup_at, pickup_day,
     held_until, payment, eat)
  values
    (p_id, v_listing.workspace_id, v_listing.location_id, v_listing.id, v_user, v_code,
     p_pickup_at, v_day, v_listing.pickup_end, p_payment, v_eat);

  insert into public.reservation_line
    (reservation_id, line_no, workspace_id, location_id, listing_line_id, quantity,
     unit_price, container_price)
  values
    (p_id, 1, v_listing.workspace_id, v_listing.location_id, v_line.id, 1,
     v_line.unit_price, case when v_eat = 'llevar' then v_listing.container_price end);

  return jsonb_build_object('id', p_id, 'code', v_code);
end;
$$;

comment on function public.reserve_plate(uuid, uuid, integer, timestamptz, text, text) is
  'A neighbour reserves one plate of one line of an offer on offer now: her hour (a '
  'quarter hour from the current one until 15 minutes before the window ends), how she '
  'pays (efectivo always; tarjeta and transferencia when the kitchen takes them) and how '
  'it is eaten (llevar or aqui, among the line''s ways; NULL is llevar when it can be). '
  'After her express yes (TD021, 0080); refused when the kitchen admits only scores above '
  'hers (TD020, 0080 — fewer than three thumbs always pass); one still to collect until '
  'her first pickup, then three, one again after two misses in her last ten (TD016, '
  '0080). The id is the phone''s; a retry returns it. Answers {id, code}. 42501 / 22023 / '
  'TD015 / TD016 / TD017 / TD020 / TD021 — see 0079 and 0080. Plans 10.5b-i and '
  '10.5b-ii-b.';


create or replace function public.set_kitchen_page(p_workspace_id uuid, p_page jsonb)
returns public.kitchen_page
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_kind     public.workspace_kind;
  v_key      text;
  v_sentence text;
  v_color    text;
  v_cover    text;
  v_logo     text;
  v_link     text;
  v_row      public.kitchen_page%rowtype;
  -- New in 0079: the kitchen's settings, as they will stand after this call.
  v_old      public.kitchen_page%rowtype;
  v_card     boolean;
  v_transfer boolean;
  v_llevar   boolean;
  v_aqui     boolean;
  v_box      numeric;
  -- New in 0080: who may reserve, by her score (NULL is everyone).
  v_min      numeric;
begin
  if v_user is null then
    raise exception 'set_kitchen_page requires an authenticated caller'
      using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'manager') then
    raise exception 'set_kitchen_page: only the owner or a manager of that kitchen sets its page'
      using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'set_kitchen_page: only a kitchen has a page' using errcode = 'TD013';
  end if;

  if p_page is null or jsonb_typeof(p_page) <> 'object' then
    raise exception 'set_kitchen_page: the page is an object of the fields to change'
      using errcode = '22023';
  end if;
  foreach v_key in array array['sentence', 'color', 'cover_path', 'logo_path', 'maps_link']
  loop
    if p_page ? v_key and jsonb_typeof(p_page -> v_key) not in ('string', 'null') then
      raise exception 'set_kitchen_page: % is text, or null to clear it', v_key
        using errcode = '22023';
    end if;
  end loop;
  -- New in 0079: four yes-or-no keys, and the desechable's price as text.
  foreach v_key in array array['accepts_card', 'accepts_transfer', 'para_llevar', 'para_aqui']
  loop
    if p_page ? v_key and jsonb_typeof(p_page -> v_key) <> 'boolean' then
      raise exception 'set_kitchen_page: % is true or false', v_key
        using errcode = '22023';
    end if;
  end loop;
  if p_page ? 'container_price' and jsonb_typeof(p_page -> 'container_price') not in ('string', 'null') then
    raise exception 'set_kitchen_page: container_price is pesos as text, or null for no charge'
      using errcode = '22023';
  end if;
  -- New in 0080: min_score, a number, or null for everyone.
  if p_page ? 'min_score' and jsonb_typeof(p_page -> 'min_score') not in ('number', 'null') then
    raise exception 'set_kitchen_page: min_score is 75, 80 or 85, or null for everyone'
      using errcode = '22023';
  end if;

  v_sentence := nullif(btrim(coalesce(p_page ->> 'sentence', '')), '');
  v_color    := nullif(btrim(coalesce(p_page ->> 'color', '')), '');
  v_cover    := nullif(btrim(coalesce(p_page ->> 'cover_path', '')), '');
  v_logo     := nullif(btrim(coalesce(p_page ->> 'logo_path', '')), '');
  v_link     := nullif(btrim(coalesce(p_page ->> 'maps_link', '')), '');

  if v_sentence is not null and (char_length(v_sentence) > 100 or v_sentence ~ '[\r\n]') then
    raise exception 'set_kitchen_page: the sentence is one line of at most 100 characters'
      using errcode = '22023';
  end if;
  if v_color is not null
     and v_color not in ('chile', 'mole', 'nopal', 'talavera', 'cempasuchil', 'jamaica') then
    raise exception 'set_kitchen_page: the colour is one of chile, mole, nopal, talavera, cempasuchil, jamaica'
      using errcode = '22023';
  end if;
  if v_cover is not null and not public.picture_in_folder(v_cover, p_workspace_id) then
    raise exception 'set_kitchen_page: the cover is a picture in this kitchen''s own folder'
      using errcode = '22023';
  end if;
  if v_logo is not null and not public.picture_in_folder(v_logo, p_workspace_id) then
    raise exception 'set_kitchen_page: the logo is a picture in this kitchen''s own folder'
      using errcode = '22023';
  end if;
  if v_link is not null and not public.google_maps_link_ok(v_link) then
    raise exception 'set_kitchen_page: the link is one that opens Google Maps (https://maps.app.goo.gl/…)'
      using errcode = '22023';
  end if;

  -- New in 0079: each setting as it will stand — what was sent, else what was
  -- stored, else the default — so the two ways are checked whole.
  select * into v_old from public.kitchen_page k where k.workspace_id = p_workspace_id;
  v_card     := case when p_page ? 'accepts_card'     then (p_page ->> 'accepts_card')::boolean     else coalesce(v_old.accepts_card, false) end;
  v_transfer := case when p_page ? 'accepts_transfer' then (p_page ->> 'accepts_transfer')::boolean else coalesce(v_old.accepts_transfer, false) end;
  v_llevar   := case when p_page ? 'para_llevar'      then (p_page ->> 'para_llevar')::boolean      else coalesce(v_old.para_llevar, true) end;
  v_aqui     := case when p_page ? 'para_aqui'        then (p_page ->> 'para_aqui')::boolean        else coalesce(v_old.para_aqui, false) end;
  if not (v_llevar or v_aqui) then
    raise exception 'set_kitchen_page: a kitchen hands plates over para llevar, para comer aquí, or both'
      using errcode = '22023';
  end if;
  if p_page ? 'container_price' then
    begin
      v_box := nullif(btrim(coalesce(p_page ->> 'container_price', '')), '')::numeric;
    exception when others then
      raise exception 'set_kitchen_page: container_price is pesos and centavos'
        using errcode = '22023';
    end;
    if v_box is not null and (v_box <= 0 or v_box <> round(v_box, 2) or v_box >= 100000) then
      raise exception 'set_kitchen_page: container_price is pesos and centavos above zero, or null for no charge'
        using errcode = '22023';
    end if;
  else
    v_box := v_old.container_price;
  end if;
  -- New in 0080: who may reserve. Only the four options; nobody is cancelled by it.
  if p_page ? 'min_score' then
    v_min := (p_page ->> 'min_score')::numeric;
    if v_min is not null and v_min not in (75, 80, 85) then
      raise exception 'set_kitchen_page: min_score is 75, 80 or 85, or null for everyone'
        using errcode = '22023';
    end if;
  else
    v_min := v_old.min_score;
  end if;

  insert into public.kitchen_page as k
    (workspace_id, sentence, color, cover_path, logo_path, maps_link, updated_at, updated_by,
     accepts_card, accepts_transfer, para_llevar, para_aqui, container_price, min_score)
  values
    (p_workspace_id, v_sentence, v_color, v_cover, v_logo, v_link, now(), v_user,
     v_card, v_transfer, v_llevar, v_aqui, v_box, v_min)
  on conflict (workspace_id) do update
     set sentence   = case when p_page ? 'sentence'   then excluded.sentence   else k.sentence   end,
         color      = case when p_page ? 'color'      then excluded.color      else k.color      end,
         cover_path = case when p_page ? 'cover_path' then excluded.cover_path else k.cover_path end,
         logo_path  = case when p_page ? 'logo_path'  then excluded.logo_path  else k.logo_path  end,
         maps_link  = case when p_page ? 'maps_link'  then excluded.maps_link  else k.maps_link  end,
         accepts_card     = excluded.accepts_card,
         accepts_transfer = excluded.accepts_transfer,
         para_llevar      = excluded.para_llevar,
         para_aqui        = excluded.para_aqui,
         container_price  = excluded.container_price,
         min_score        = excluded.min_score,
         updated_at = now(),
         updated_by = v_user
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.set_kitchen_page(uuid, jsonb) is
  'The owner or a manager of a kitchen changes her page and, since 0079, her settings: '
  'accepts_card, accepts_transfer, para_llevar, para_aqui (true or false; at least one '
  'of the two ways) and container_price (pesos as text, or null for no charge); since '
  '0080 min_score (75, 80 or 85, or null for everyone — who may reserve, by score). The '
  'fields sent are set (null or blank clears a text one), the fields left out stay, '
  'unknown keys are ignored. Answers with the page as saved. 42501 / TD013 (a shop) / '
  '22023 — see 0076, 0079 and 0080. Plans 10.5-i-a, 10.5b-i and 10.5b-ii-b.';


create or replace function public.my_reservations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'my_reservations requires an authenticated caller' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', r.id,
             'code', r.code,
             'state', s.state,
             'pickup_at', r.pickup_at,
             'held_until', r.held_until,
             'cancel_until', r.pickup_at - interval '1 hour',
             'payment', r.payment,
             'eat', r.eat,
             'created_at', r.created_at,
             'cancelled_at', r.cancelled_at,
             'handed_over_at', r.handed_over_at,
             'picked_up_at', r.picked_up_at,
             -- 0080: why the kitchen cancelled (cancelado_cocina); her own stars, and
             -- until when she may give or change them.
             'cancel_reason', r.cancel_reason,
             'rate_until', case when s.state = 'recogido' and now() <= r.held_until + interval '24 hours'
                                then r.held_until + interval '24 hours' end,
             'my_rating', (select jsonb_build_object('stars', kr.stars, 'tags', to_jsonb(kr.tags))
                             from servicio.kitchen_rating kr
                            where kr.reservation_id = r.id),
             'kitchen', jsonb_build_object(
                'id', w.id,
                'name', w.display_name,
                'giro', w.giro_principal,
                'address', jsonb_build_object(
                   'street', l.street, 'street_number', l.street_number, 'colonia', l.colonia,
                   'city', l.city, 'postal_code', l.postal_code),
                'directions', l.directions,
                'page', (select jsonb_build_object(
                                  'color', p.color, 'logo_path', p.logo_path, 'maps_link', p.maps_link)
                           from public.kitchen_page p
                          where p.workspace_id = w.id)),
             'lines', (select jsonb_agg(jsonb_build_object(
                                'line_no', ll.line_no, 'name', ll.name, 'surprise', ll.surprise,
                                'image_path', ll.image_path,
                                'quantity', rl.quantity::text,
                                'unit_price', rl.unit_price::text,
                                'container_price', rl.container_price::text)
                              order by rl.line_no)
                         from public.reservation_line rl
                         join public.listing_line ll on ll.id = rl.listing_line_id
                        where rl.reservation_id = r.id)
           ) order by r.pickup_at desc, r.id), '[]'::jsonb)
      from public.reservation r
      join public.workspace w on w.id = r.workspace_id
      join public.location l on l.id = r.location_id
     cross join lateral (select public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                                         r.held_until, r.pickup_at, r.cancelled_by) as state) s
     where r.buyer_id = auth.uid()
       and r.pickup_day >= (now() at time zone l.timezone)::date - 30
  );
end;
$$;

comment on function public.my_reservations() is
  'The caller''s own reservations — every one still to collect and her last 30 days — '
  'with the code, the state (cancelado_cocina since 0080, with cancel_reason), her hour, '
  'until when it is held, cancel_until (an hour before her hour), how she pays and eats, '
  'the lines at their prices, the kitchen''s name, trade, address, directions and page, '
  'and since 0080 her own stars (my_rating) and until when she may give them '
  '(rate_until). Keyed on auth.uid(); nobody else''s. Money and quantities as decimal '
  'strings. 0079, plan 10.5b-i; 0080, plan 10.5b-ii-b.';


create or replace function public.hand_over_reservation(p_id uuid, p_at timestamptz default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_r    public.reservation%rowtype;
begin
  if v_user is null then
    raise exception 'hand_over_reservation requires an authenticated caller' using errcode = '42501';
  end if;

  select * into v_r from public.reservation r
   where r.id = p_id
     and r.workspace_id in (select public.my_workspaces())
     and r.location_id  in (select public.my_locations())
   for update;
  if not found then
    raise exception 'hand_over_reservation: that reservation is not at one of your kitchens'
      using errcode = '42501';
  end if;

  if v_r.handed_over_at is null then
    update public.reservation
       set handed_over_at = greatest(least(coalesce(p_at, now()), now()), v_r.created_at),
           handed_over_by = v_user
     where id = v_r.id;
    -- New in 0080: *Sí pasó* — a handover recorded after a no-show thumb makes
    -- the thumb untrue, so it goes, and the order waits for a thumb again.
    delete from servicio.reservation_thumb t
     where t.reservation_id = v_r.id and 'no_se_presento' = any (t.labels);
  end if;

  return 'recogido';
end;
$$;

comment on function public.hand_over_reservation(uuid, timestamptz) is
  'A member of the kitchen hands a reservation over (the code typed): always recorded, '
  'whatever its state; p_at is when, on her phone (kept between its making and now); a '
  'retry keeps the first. Recorded after a No se presentó thumb (Sí pasó), it clears '
  'that thumb (0080). Answers recogido. 42501 when it is not at one of her kitchens. '
  '0079, plan 10.5b-i; 0080, plan 10.5b-ii-b.';


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
         and exists (select 1 from public.listing li
                      where li.workspace_id = w.id
                        and ((li.withdrawn_at is null and li.pickup_end > now())
                             or li.created_at >= now() - interval '14 days'))
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
  'strings. 0078, 0079 and 0080, plans 10.5-i-b-i, 10.5b-i and 10.5b-ii-b.';


create or replace function public.delete_my_account(
  p_shop_name      text   default null,
  p_business_names text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_email  text;
  v_shop   record;
  v_purged int := 0;
  v_left   int := 0;
  -- 0073: every name she typed, folded, blanks out; each business takes one.
  v_typed  text[];
  v_at     int;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;
  if not found then
    raise exception 'no login to delete' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(array_agg(public.normalize_name(t.typed) order by t.ord), '{}'::text[])
    into v_typed
    from unnest(coalesce(p_business_names, '{}'::text[]) || p_shop_name)
         with ordinality as t(typed, ord)
   where t.typed is not null and btrim(t.typed) <> '';

  -- New in 0079: no business she alone owns goes while a neighbour holds a plate
  -- there. Before the names, so a wrong name never hides it.
  if exists (select 1
               from public.reservation r
               join public.workspace_member wm on wm.workspace_id = r.workspace_id
              where wm.user_id = v_user and wm.is_active and wm.role = 'owner'
                and not exists (
                      select 1 from public.workspace_member o
                       where o.workspace_id = r.workspace_id and o.is_active and o.role = 'owner'
                         and o.user_id <> v_user)
                and public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                             r.held_until, r.pickup_at) = 'apartado') then
    raise exception 'a reservation is still to hand over at a business that goes with this account'
      using errcode = 'TD014';
  end if;

  -- Every business this person is the only active owner of. Checked in full
  -- BEFORE anything changes, so a missing name deletes nothing at all.
  for v_shop in
    select w.id, w.display_name
      from public.workspace w
      join public.workspace_member wm on wm.workspace_id = w.id
     where wm.user_id = v_user and wm.is_active and wm.role = 'owner'
       and not exists (
             select 1 from public.workspace_member o
              where o.workspace_id = w.id and o.is_active and o.role = 'owner'
                and o.user_id <> v_user)
     order by w.id
  loop
    v_at := array_position(v_typed, public.normalize_name(v_shop.display_name));
    if v_at is null then
      raise exception 'a business name typed does not match: deleting this account deletes every business it is the only owner of'
        using errcode = 'TD007';
    end if;
    v_typed := v_typed[1:v_at - 1] || v_typed[v_at + 1:];
  end loop;

  -- The shops that go with this account (ruling 2), ledger and all (ruling 4).
  -- The order is the restrict chain's: movements before the lots and documents
  -- they point at, lots before the purchase lines they came from, and every
  -- document before the stores and products it names.
  for v_shop in
    select w.id
      from public.workspace w
      join public.workspace_member wm on wm.workspace_id = w.id
     where wm.user_id = v_user and wm.is_active and wm.role = 'owner'
       and not exists (
             select 1 from public.workspace_member o
              where o.workspace_id = w.id and o.is_active and o.role = 'owner'
                and o.user_id <> v_user)
  loop
    perform set_config('tienda.purging_workspace', v_shop.id::text, true);
    delete from public.stock_movement where workspace_id = v_shop.id;
    delete from public.stock_batch    where workspace_id = v_shop.id;
    delete from public.sale           where workspace_id = v_shop.id;
    delete from public.purchase       where workspace_id = v_shop.id;
    delete from public.waste          where workspace_id = v_shop.id;
    delete from public.failed_write   where workspace_id = v_shop.id;
    delete from public.price_list     where workspace_id = v_shop.id;
    delete from public.workspace      where id = v_shop.id;
    perform set_config('tienda.purging_workspace', '', true);
    v_purged := v_purged + 1;
  end loop;

  -- Every other shop keeps a former member (ruling 1). The name is frozen
  -- first, while the login that carries it still exists (decision a).
  update public.workspace_member wm
     set display_name = coalesce(wm.display_name, public.auth_full_name(v_user))
   where wm.user_id = v_user;

  delete from public.member_location ml
   using public.workspace_member wm
   where ml.member_id = wm.id and wm.user_id = v_user;

  update public.workspace_member wm
     set is_active = false
   where wm.user_id = v_user and wm.is_active;
  get diagnostics v_left = row_count;

  -- The rows that carry this person's address (decision c).
  delete from public.workspace_invite wi
   where (v_email is not null and lower(wi.email::text) = lower(v_email::text))
      or wi.requested_by = v_user
      or wi.accepted_by  = v_user;

  -- New in 0080: every thumb kitchens gave her, and every note she wrote to Wera,
  -- go with her account; her stars stay, pointing to nobody once her id is
  -- cleared below; and her yes.
  delete from servicio.reservation_thumb t
   using public.reservation r
   where t.reservation_id = r.id and r.buyer_id = v_user;
  update servicio.kitchen_rating kr
     set note = null
    from public.reservation r
   where kr.reservation_id = r.id and r.buyer_id = v_user and kr.note is not null;
  delete from servicio.neighbour_yes y where y.user_id = v_user;

  -- New in 0079: her own reservations. Those still to collect are given back —
  -- the plate is back on offer and the kitchen reads it cancelled — and none is
  -- left pointing to her (ruled 2026-11-10).
  update public.reservation r
     set cancelled_at = case
                          when public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                                        r.held_until, r.pickup_at) = 'apartado'
                          then now()
                          else r.cancelled_at
                        end,
         buyer_id = null
   where r.buyer_id = v_user;

  -- The login itself: identities, sessions and refresh tokens cascade from it.
  delete from auth.users where id = v_user;

  return jsonb_build_object('shops_deleted', v_purged, 'shops_left', v_left);
end;
$$;

comment on function public.delete_my_account(text, text[]) is
  'Deletes the caller''s login (plan task 5R-c, the owner''s rulings of '
  '2026-10-09). Every business — shop or kitchen — the caller is the only active '
  'owner of is DELETED with everything in it, and each must have its name among '
  'the names typed: p_business_names, plus p_shop_name, which every Wera build '
  'before 0073 sends alone. Each business takes one typed name (normalize_name: '
  'case and spaces fold, accents do not); TD007 when one is missing, and nothing '
  'changes; TD014 while a reservation is still to hand over at one of them (0079). '
  'In every other business the membership becomes a former member: is_active '
  'false, left_at stamped, display_name kept. Invitations carrying the caller''s '
  'email are deleted. Her own reservations still to collect are cancelled, and none '
  'keeps her id (0079); every thumb kitchens gave her, her notes to Wera and her '
  'express yes go, and her stars stay pointing to nobody (0080). Returns '
  '{shops_deleted, shops_left}. 0073, plan 10.4b-i, the owner''s ruling of '
  '2026-10-29; 0079, plan 10.5b-i, his ruling of 2026-11-10; 0080, plan 10.5b-ii-b.';


-- ----------------------------------------------------------------------------
-- 7. His analytics, by week and kitchen
-- ----------------------------------------------------------------------------
-- ⚠️ ONE READ, NO PERSON'S NAME: each kitchen's reservations by the week of her
-- hour (Monday, in the kitchen's zone) — how each ended, its thumbs and each
-- label, the clock's no-shows, the stars and each tag. Granted to nobody, in a
-- schema no client reaches: the owner, or a session, runs it on the live
-- database as `postgres` —
--   supabase db query --linked -o table "select * from servicio.apartados_por_semana()"
-- Her notes are not here; they are read one by one, by him, from
-- `servicio.kitchen_rating`.

create function servicio.apartados_por_semana()
returns table (
  week                 date,
  kitchen_id           uuid,
  kitchen              text,
  reservations         integer,
  collected            integer,
  se_libero            integer,
  cancelled            integer,
  no_va                integer,
  cancelled_by_kitchen integer,
  thumbs_up            integer,
  thumbs_down          integer,
  no_show_by_clock     integer,
  a_tiempo             integer,
  amable               integer,
  tarde                integer,
  pago                 integer,
  no_se_presento       integer,
  ratings              integer,
  average_stars        numeric,
  lista_a_tiempo       integer,
  buena_porcion        integer,
  muy_rica             integer,
  me_atendieron_bien   integer,
  tuve_que_esperar     integer,
  porcion_chica        integer,
  no_me_gusto          integer,
  me_atendieron_mal    integer
)
language sql
stable
set search_path = ''
as $$
  with r as (
    select x.id, x.workspace_id, x.held_until,
           date_trunc('week', x.pickup_at at time zone l.timezone)::date as week,
           public.reservation_state(x.cancelled_at, x.handed_over_at, x.picked_up_at,
                                    x.held_until, x.pickup_at, x.cancelled_by) as state
      from public.reservation x
      join public.location l on l.id = x.location_id
  )
  select r.week, r.workspace_id, w.display_name,
         count(*)::integer,
         (count(*) filter (where r.state = 'recogido'))::integer,
         (count(*) filter (where r.state = 'liberado'))::integer,
         (count(*) filter (where r.state = 'cancelado'))::integer,
         (count(*) filter (where r.state = 'no_va'))::integer,
         (count(*) filter (where r.state = 'cancelado_cocina'))::integer,
         (count(*) filter (where t.up))::integer,
         (count(*) filter (where not t.up))::integer,
         (count(*) filter (where r.state = 'liberado' and t.reservation_id is null
                                 and r.held_until + interval '24 hours' <= now()))::integer,
         (count(*) filter (where 'a_tiempo' = any (t.labels)))::integer,
         (count(*) filter (where 'amable' = any (t.labels)))::integer,
         (count(*) filter (where 'tarde' = any (t.labels)))::integer,
         (count(*) filter (where 'pago' = any (t.labels)))::integer,
         (count(*) filter (where 'no_se_presento' = any (t.labels)))::integer,
         count(kr.reservation_id)::integer,
         round(avg(kr.stars), 2),
         (count(*) filter (where 'lista_a_tiempo' = any (kr.tags)))::integer,
         (count(*) filter (where 'buena_porcion' = any (kr.tags)))::integer,
         (count(*) filter (where 'muy_rica' = any (kr.tags)))::integer,
         (count(*) filter (where 'me_atendieron_bien' = any (kr.tags)))::integer,
         (count(*) filter (where 'tuve_que_esperar' = any (kr.tags)))::integer,
         (count(*) filter (where 'porcion_chica' = any (kr.tags)))::integer,
         (count(*) filter (where 'no_me_gusto' = any (kr.tags)))::integer,
         (count(*) filter (where 'me_atendieron_mal' = any (kr.tags)))::integer
    from r
    join public.workspace w on w.id = r.workspace_id
    left join servicio.reservation_thumb t on t.reservation_id = r.id
    left join servicio.kitchen_rating kr on kr.reservation_id = r.id
   group by r.week, r.workspace_id, w.display_name
   order by r.week desc, w.display_name, r.workspace_id
$$;

comment on function servicio.apartados_por_semana() is
  'The owner''s analytics: each kitchen''s reservations by the week of her hour (Monday, '
  'kitchen''s zone) — how many, how each ended, thumbs up and down with each label, the '
  'clock''s no-shows (se liberó, 24 hours unrated), how many ratings, their average and '
  'each tag. No person''s name. Granted to nobody; run as postgres on the live database. '
  '0080, plan 10.5b-ii-b.';


-- ----------------------------------------------------------------------------
-- 8. Who may call what
-- ----------------------------------------------------------------------------
-- ⚠️ `from public, anon` — never `from public` alone: the hosted project hands
-- `anon` EXECUTE by default (ADR-035, the revision of 2026-10-27). Each of the
-- seven is named in `supabase/pgtap/_walls.sql`'s list in this same change. The
-- re-created functions keep their grants; the helpers and the analytics are
-- granted to nobody above and below.

revoke all on function public.reservation_neighbours(uuid) from public, anon;
grant execute on function public.reservation_neighbours(uuid) to authenticated;

revoke all on function public.rate_neighbour(uuid, boolean, text[], timestamptz) from public, anon;
grant execute on function public.rate_neighbour(uuid, boolean, text[], timestamptz) to authenticated;

revoke all on function public.my_kitchen_ratings(uuid) from public, anon;
grant execute on function public.my_kitchen_ratings(uuid) to authenticated;

revoke all on function public.cancel_reservation_as_kitchen(uuid, text) from public, anon;
grant execute on function public.cancel_reservation_as_kitchen(uuid, text) to authenticated;

revoke all on function public.give_my_yes() from public, anon;
grant execute on function public.give_my_yes() to authenticated;

revoke all on function public.my_standing() from public, anon;
grant execute on function public.my_standing() to authenticated;

revoke all on function public.rate_kitchen(uuid, integer, text[], text) from public, anon;
grant execute on function public.rate_kitchen(uuid, integer, text[], text) to authenticated;

revoke all on function servicio.apartados_por_semana() from public, anon, authenticated;
