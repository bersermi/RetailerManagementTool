-- ============================================================================
-- 0099 — the loyalty card's condition, discreet and fully optional, and
-- *Editar tu tarjeta* with one rule added to G12
-- ============================================================================
-- docs/PLAN.md task `10.9m` — the owner's approval of 2026-11-27 (his words
-- asking: *"a very small field where the users can include a "Compra minima" or
-- something else … an "Editar" feature that allows the Cocina to change the
-- Reward or the Number of stamps"*; on the first draft: *"We need this part to
-- be discrete and fully optional make sure it is"*; on the second: *"Approve"*).
--
-- WHAT IS HERE:
--   1. `servicio.card_terms.conditions` — her words about her card (*Compra
--      mínima de $80*), 1 to 60 characters, trimmed; NULL is none. A column
--      added with no default but NULL: every version saved before this file
--      reads as none, which is what it was.
--   2. `servicio.card_terms_easier(old, new)` — THE RULE ADDED TO G12, as one
--      function both the save and its suite read: a new version only makes a
--      card started on `old` easier when it has the same reward (capitals and
--      end spaces do not count; the reward is stored trimmed), no more stamps,
--      no fewer days (*Nunca*, NULL, the most), and the same condition or none.
--      Anything else — a new reward, more stamps, fewer days, a condition added
--      or changed, or any of those beside an easier part — is not.
--   3. `public.set_card_terms` — DROPPED AND RE-MADE WITH ONE ARGUMENT MORE,
--      `p_conditions text default null` (`0064`'s way; `field-rule.sh`): NULL
--      keeps the current condition, so a build in the field that does not send
--      it saves without touching it; `''` (or only spaces) clears it; else 1 to
--      60 characters, else 22023. `0089`'s body otherwise, but that:
--        * the condition is part of the terms: the same terms AND condition
--          change nothing; anything else is a new version, as before;
--        * ⚠️ THE MOVE (the rule added to G12): on a new version, every card
--          going there whose own version it only makes easier (2) moves to it
--          the same day — and a card already at the new number of stamps or
--          more wins its reward now: a `card_reward` on the new version, the
--          card deleted (G17's zero), so `0094`'s *¡Ganaste!* follows from its
--          trigger exactly as when a last stamp lands. One reward, however far
--          over. A card past its days is over and does not move. Each card is
--          taken under `give_card_stamp`'s own lock and read again under it, so
--          a stamp landing at the same moment counts once, on one version;
--        * it answers `kitchen_card`, as before.
--   4. `servicio.card_state` — RE-MADE, ITS SIGNATURE UNCHANGED, with one key
--      more: `conditions`, HER card's (what it started on, or moved to), else
--      the current open terms' when she has none going — as `reward` and `of`
--      already read. So `card_of_code`, `give_stamp`, `give_reward`,
--      `stamp_with_code`, `claim_with_code` and `my_cards` carry it untouched.
--   5. `public.kitchen_card` — RE-MADE, ITS SIGNATURE UNCHANGED: `terms` gains
--      `conditions`. Nothing else changes.
--   6. THE DOOR (`public.on_offer_now`) — RE-MADE FROM `0087`'s BODY, WORD FOR
--      WORD, BUT FOR ONE KEY: the `card` a neighbour starts on gains
--      `conditions` (ADR-035 §2.7: what she reads of a kitchen comes through
--      this one door).
--
-- WHAT STAYS AS IT IS:
--   * G12 itself: a card keeps the version it started on through any number of
--     new versions, except by the rule in (2); closing is still the only way to
--     end old terms (30 days for those who started it);
--   * G18: the terms are the owner's alone (42501 for a helper);
--   * Wera checks no purchase — the app records no amount for a walk-in —
--     whoever gives the stamp reads the condition and checks it;
--   * nothing here sends a message: a reward won by the move sends what any won
--     reward sends (`0094`'s `premio`), and a message telling holders their card
--     got easier is his product analyst's call (the decisions block, (8)).
--
-- ⚠️ THE FIELD RULE (ADR-035 §2.2): one column added (NULL for every row
-- before), one function added (granted to nobody), one signature changed by
-- drop and re-create with its new argument defaulted — every build in the
-- field calls it with four named arguments, which the new one still takes —
-- and three functions re-made with their signatures and every key kept, one key
-- more each, which builds in the field ignore.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Her condition, on each version of her terms
-- ----------------------------------------------------------------------------

alter table servicio.card_terms add column conditions text;
alter table servicio.card_terms
  add constraint card_terms_conditions
  check (conditions is null or (char_length(conditions) between 1 and 60 and conditions = btrim(conditions)));

comment on column servicio.card_terms.conditions is
  'The kitchen''s condition on this version of her card, in her words (Compra mínima de $80): '
  '1 to 60 characters, trimmed; NULL is none — every version saved before 0099. Shown as one '
  'small line on the card, the invitation, the scan and the poster, and one sentence in the '
  'conditions. Wera checks nothing: whoever gives the stamp does. 0099, plan 10.9m.';


-- ----------------------------------------------------------------------------
-- 2. The rule added to G12: what only makes a card easier
-- ----------------------------------------------------------------------------

create function servicio.card_terms_easier(p_old servicio.card_terms, p_new servicio.card_terms)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_new.reward) = lower(p_old.reward)
     and p_new.stamps <= p_old.stamps
     and (p_new.expiry_days is null
          or (p_old.expiry_days is not null and p_new.expiry_days >= p_old.expiry_days))
     and (p_new.conditions is null
          or (p_old.conditions is not null and lower(p_new.conditions) = lower(p_old.conditions)))
$$;

comment on function servicio.card_terms_easier(servicio.card_terms, servicio.card_terms) is
  'Whether the version p_new only makes a card started on p_old easier (the rule the owner '
  'added to G12 on 2026-11-27): the same reward (capitals ignored; both stored trimmed), no '
  'more stamps, no fewer days (NULL, Nunca, the most), and the same condition or none. Such a '
  'card moves to p_new the day it is saved (set_card_terms). Granted to nobody. 0099, plan '
  '10.9m.';


-- ----------------------------------------------------------------------------
-- 3. `set_card_terms`: the condition, and the move
-- ----------------------------------------------------------------------------
-- `0089`'s body but for the condition and the move. Dropped and re-made, never
-- overloaded (`_walls.sql`: no two functions share a name).

-- A call with the four arguments every build in the field sends is answered as
-- before, by the new one (`field-rule.sh` reads the four names still answered,
-- so no `field-rule:` line is owed). The drop and the create are one
-- transaction: no moment without it.
drop function public.set_card_terms(uuid, text, integer, integer);

create function public.set_card_terms(
  p_workspace_id uuid,
  p_reward       text,
  p_stamps       integer,
  p_expiry_days  integer,
  p_conditions   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_kind   public.workspace_kind;
  v_reward text := btrim(coalesce(p_reward, ''));
  v_days   smallint;
  v_cond   text;
  v_cur    servicio.card_terms%rowtype;
  v_new    servicio.card_terms%rowtype;
  v_her    uuid;
  v_card   servicio.loyalty_card%rowtype;
  v_old    servicio.card_terms%rowtype;
begin
  if v_user is null then
    raise exception 'set_card_terms requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'set_card_terms: only the kitchen''s owner sets its card' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'set_card_terms: only a kitchen has a loyalty card' using errcode = 'TD013';
  end if;
  if not servicio.card_switched_on() then
    raise exception 'set_card_terms: the loyalty card is not offered yet' using errcode = 'TD024';
  end if;
  if char_length(v_reward) not between 1 and 60 then
    raise exception 'set_card_terms: the reward is 1 to 60 characters' using errcode = '22023';
  end if;
  if p_stamps is null or p_stamps not between 4 and 12 then
    raise exception 'set_card_terms: 4 to 12 stamps' using errcode = '22023';
  end if;
  if p_expiry_days is null or (p_expiry_days <> 0 and p_expiry_days not between 14 and 365) then
    raise exception 'set_card_terms: the days are 0 (Nunca) or 14 to 365' using errcode = '22023';
  end if;
  if p_conditions is not null and char_length(btrim(p_conditions)) > 60 then
    raise exception 'set_card_terms: the condition is at most 60 characters' using errcode = '22023';
  end if;
  v_days := nullif(p_expiry_days, 0);

  select * into v_cur from servicio.card_terms t
   where t.workspace_id = p_workspace_id and t.replaced_at is null
     for update;

  -- NULL keeps the current condition (a build that does not send it); '' clears it.
  v_cond := case when p_conditions is null then v_cur.conditions
                 else nullif(btrim(p_conditions), '') end;

  if not (found and v_cur.closed_at is null and v_cur.reward = v_reward
          and v_cur.stamps = p_stamps and v_cur.expiry_days is not distinct from v_days
          and v_cur.conditions is not distinct from v_cond) then
    -- Opened again more than 30 days after it closed: what the closing ended stays
    -- ended, whether or not the nightly job has run yet (the review of 10.9e-i).
    if v_cur.closed_at is not null and v_cur.closed_at <= now() - interval '30 days' then
      delete from servicio.loyalty_card c where c.workspace_id = p_workspace_id;
      delete from servicio.card_reward r where r.workspace_id = p_workspace_id and r.claimed_at is null;
    end if;
    update servicio.card_terms t set replaced_at = now() where t.id = v_cur.id;
    insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, conditions, created_by)
    values (p_workspace_id, v_reward, p_stamps, v_days, v_cond, v_user)
    returning * into v_new;

    -- THE MOVE (the rule added to G12): each card going here, against ITS OWN
    -- version. Taken under the stamp's own lock and read again under it, so a
    -- stamp landing now counts once, on one version.
    for v_her in
      select c.user_id from servicio.loyalty_card c
       where c.workspace_id = p_workspace_id and c.terms_id <> v_new.id
       order by c.user_id
    loop
      perform pg_advisory_xact_lock(hashtextextended('card:' || p_workspace_id::text || ':' || v_her::text, 0));
      select * into v_card from servicio.loyalty_card c
       where c.user_id = v_her and c.workspace_id = p_workspace_id;
      continue when not found;
      select * into v_old from servicio.card_terms t where t.id = v_card.terms_id;
      -- Past its days, the card is over (G15): it does not move.
      continue when v_old.expiry_days is not null
                and v_card.last_stamp_at + make_interval(days => v_old.expiry_days) <= now();
      continue when not servicio.card_terms_easier(v_old, v_new);

      if v_card.stamps >= v_new.stamps then
        -- Already at the new number: the reward won today, the card back to zero (G11, G17).
        delete from servicio.loyalty_card c where c.user_id = v_her and c.workspace_id = p_workspace_id;
        insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
        values (p_workspace_id, v_her, v_new.id, v_new.reward, now());
      else
        update servicio.loyalty_card c set terms_id = v_new.id
         where c.user_id = v_her and c.workspace_id = p_workspace_id;
      end if;
    end loop;
  end if;

  insert into servicio.kitchen_feature as f (workspace_id, feature, state)
  values (p_workspace_id, 'tarjeta', 'on')
  on conflict (workspace_id, feature) do update
     set state = 'on',
         changed_at = case when f.state = 'on' then f.changed_at else now() end;

  return public.kitchen_card(p_workspace_id);
end;
$$;

comment on function public.set_card_terms(uuid, text, integer, integer, text) is
  'Activar / Guardar cambios on the loyalty card''s setup (G7, G34): the reward (1 to 60 '
  'characters, trimmed), 4 to 12 stamps, the days without a stamp after which hers are '
  'erased — 0 (Nunca) or a whole number from 14 to 365 (0089) — and since 0099 her '
  'condition (p_conditions: NULL keeps the current one, '''' clears it, else 1 to 60 '
  'characters, trimmed). The owner''s (G18). The same terms again change nothing; other terms '
  'are a new version that new cards take (G12) — and since 0099 (the rule added to G12, plan '
  '10.9m) every card going there that it only makes easier (servicio.card_terms_easier) moves '
  'to it the same day, one already at the new number of stamps winning its reward then '
  '(a card_reward, the card deleted). Reopens a closed card. Turns her choice of tarjeta on. '
  'Answers kitchen_card. 42501 signed out or not the owner, TD013 a shop, TD024 Wera''s switch '
  'off, 22023 a term out of range. 0085, plan 10.9e-i; 0089; 0099.';


-- ----------------------------------------------------------------------------
-- 4. What her card reads, with its condition
-- ----------------------------------------------------------------------------
-- `0085`'s body but for `conditions`.

create or replace function servicio.card_state(p_workspace_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tz     text := servicio.kitchen_zone(p_workspace_id);
  v_kept   timestamptz := servicio.card_kept_until(p_workspace_id);
  v_cur    servicio.card_terms%rowtype;
  v_has    boolean := false;
  v_stamps smallint;
  v_last   timestamptz;
  v_reward text;
  v_of     smallint;
  v_days   smallint;
  v_cond   text;
  v_open   boolean;
begin
  select * into v_cur from servicio.card_terms t
   where t.workspace_id = p_workspace_id and t.replaced_at is null;
  v_open := v_cur.id is not null and v_cur.closed_at is null;

  if v_kept > now() then
    select c.stamps, c.last_stamp_at, t.reward, t.stamps, t.expiry_days, t.conditions
      into v_stamps, v_last, v_reward, v_of, v_days, v_cond
      from servicio.loyalty_card c
      join servicio.card_terms t on t.id = c.terms_id
     where c.user_id = p_user_id and c.workspace_id = p_workspace_id
       and (t.expiry_days is null or c.last_stamp_at + make_interval(days => t.expiry_days) > now());
    v_has := found;
  end if;

  if not v_has and v_open then
    v_reward := v_cur.reward;
    v_of     := v_cur.stamps;
    v_days   := v_cur.expiry_days;
    v_cond   := v_cur.conditions;
  end if;

  return jsonb_build_object(
    'stamps',      case when v_has then v_stamps else 0 end,
    'of',          v_of,
    'reward',      v_reward,
    'expiry_days', v_days,
    'conditions',  v_cond,
    'expires_on',  case when v_has and v_days is not null
                        then to_char((v_last + make_interval(days => v_days)) at time zone v_tz, 'YYYY-MM-DD') end,
    'stamped_today', exists (select 1 from servicio.card_stamp s
                              where s.workspace_id = p_workspace_id and s.user_id = p_user_id
                                and s.day = (now() at time zone v_tz)::date),
    'rewards', case when v_kept > now() then coalesce((
                 select jsonb_agg(jsonb_build_object('id', r.id, 'reward', r.reward, 'won_at', r.won_at)
                                  order by r.won_at desc, r.id)
                   from servicio.card_reward r
                  where r.workspace_id = p_workspace_id and r.user_id = p_user_id and r.claimed_at is null),
                 '[]'::jsonb) else '[]'::jsonb end,
    'open',        v_open,
    'kept_until',  case when v_cur.closed_at is not null then v_cur.closed_at + interval '30 days' end
  );
end;
$$;

comment on function servicio.card_state(uuid, uuid) is
  'What a neighbour''s loyalty card at a kitchen reads now: {stamps, of, reward, '
  'expiry_days, conditions, expires_on (YYYY-MM-DD in the kitchen''s zone, or null), '
  'stamped_today, rewards: [{id, reward, won_at}] newest first, open, kept_until (30 days '
  'after it closed, or null)}. of, reward, expiry_days and conditions (0099: her condition, '
  'or null for none) are her card''s terms, else the current open ones, else null. Granted '
  'to nobody. 0085, plan 10.9e-i; 0099, plan 10.9m.';


-- ----------------------------------------------------------------------------
-- 5. The kitchen's card, with its condition
-- ----------------------------------------------------------------------------
-- `0085`'s body but for `terms.conditions`.

create or replace function public.kitchen_card(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kind  public.workspace_kind;
  v_cur   servicio.card_terms%rowtype;
  v_tz    text;
  v_today date;
  v_kept  boolean;
begin
  if auth.uid() is null then
    raise exception 'kitchen_card requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'kitchen_card: that kitchen is not one of yours' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'kitchen_card: only a kitchen has a loyalty card' using errcode = 'TD013';
  end if;

  select * into v_cur from servicio.card_terms t
   where t.workspace_id = p_workspace_id and t.replaced_at is null;
  v_tz    := servicio.kitchen_zone(p_workspace_id);
  v_today := (now() at time zone v_tz)::date;
  v_kept  := servicio.card_kept_until(p_workspace_id) > now();

  return jsonb_build_object(
    'terms', case when v_cur.id is not null then jsonb_build_object(
               'reward', v_cur.reward, 'stamps', v_cur.stamps,
               'expiry_days', v_cur.expiry_days, 'conditions', v_cur.conditions,
               'since', v_cur.created_at) end,
    'open', v_cur.id is not null and v_cur.closed_at is null,
    'closed_at', v_cur.closed_at,
    'kept_until', case when v_cur.closed_at is not null then v_cur.closed_at + interval '30 days' end,
    'cards', case when v_kept then (
               select count(*)::integer
                 from servicio.loyalty_card c
                 join servicio.card_terms t on t.id = c.terms_id
                where c.workspace_id = p_workspace_id
                  and (t.expiry_days is null or c.last_stamp_at + make_interval(days => t.expiry_days) > now()))
             else 0 end,
    'stamps_today', (select count(*)::integer from servicio.card_stamp s
                      where s.workspace_id = p_workspace_id and s.day = v_today),
    'rewards_to_give', case when v_kept then (
               select count(*)::integer from servicio.card_reward r
                where r.workspace_id = p_workspace_id and r.claimed_at is null)
             else 0 end,
    'today', (select coalesce(jsonb_agg(x.line order by x.at desc, x.k), '[]'::jsonb)
                from (select s.given_at as at, s.id as k,
                             jsonb_build_object(
                               'at', s.given_at,
                               'kind', case when s.count_after >= s.of_stamps then 'gano' else 'sello' end,
                               'name', public.neighbour_name(s.user_id),
                               'stamps', s.count_after, 'of', s.of_stamps,
                               'reward', null::text, 'via', s.via) as line
                        from servicio.card_stamp s
                       where s.workspace_id = p_workspace_id and s.day = v_today
                      union all
                      select r.claimed_at, r.id,
                             jsonb_build_object(
                               'at', r.claimed_at, 'kind', 'cobro',
                               'name', public.neighbour_name(r.user_id),
                               'stamps', null::integer, 'of', null::integer,
                               'reward', r.reward, 'via', r.claimed_via)
                        from servicio.card_reward r
                       where r.workspace_id = p_workspace_id and r.claimed_at is not null
                         and (r.claimed_at at time zone v_tz)::date = v_today) x)
  );
end;
$$;

comment on function public.kitchen_card(uuid) is
  'The loyalty card''s screen, Hoy''s tile and Sellar''s lines — any active member (G18). '
  '{terms: {reward, stamps, expiry_days, conditions (0099: her condition, or null), since} or '
  'null — the current version, open or closed; open; closed_at; kept_until (30 days after '
  'closing); cards (going, not past their days); stamps_today; rewards_to_give; today: [{at, '
  'kind (sello, gano, cobro), name (Ana R., neighbour_name — null once her account is gone), '
  'stamps, of, reward, via}] newest first, the kitchen''s day}. Never who holds a card, never '
  'who gave a stamp. 42501 signed out or not one of hers, TD013 a shop. 0085, plan 10.9e-i; '
  '0099, plan 10.9m.';


-- ----------------------------------------------------------------------------
-- 6. The door, re-made: `0087`'s body with one key more in `card`
-- ----------------------------------------------------------------------------
-- The loyalty card's `conditions` beside its reward, stamps and days: what a
-- neighbour starts on before her first stamp (G12). Every other key as `0087`.

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
             -- 0099: and its condition, her words (NULL for none).
             'card', (select jsonb_build_object('reward', t.reward, 'stamps', t.stamps,
                                                'expiry_days', t.expiry_days,
                                                'conditions', t.conditions)
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
  'expiry_days, conditions (0099)} while it is open and Wera has it switched on, else null. Since 0087, '
  'promotions: those a neighbour sees now [{id, kind, what, more, image_path, days, '
  'starts_on, ends_on, conditions}] newest first (running, Wera''s switch and the kitchen''s '
  'choice on, Para tus clientes only while her card is open), and each offer''s promotion_id '
  'while that promotion is shown; a kitchen with one shown is in the door though quiet for '
  'longer than 14 days. 0078, 0079, 0080, 0081, 0085, 0087 and 0099, plans 10.5-i-b-i, '
  '10.5b-i, 10.5b-ii-b, 10.9a-i, 10.9e-i, 10.9g-i and 10.9m.';


-- ----------------------------------------------------------------------------
-- 7. Who may call what
-- ----------------------------------------------------------------------------
-- `set_card_terms` is new by its signature, so its rights are said again
-- (ADR-035 §2.7: never `from public` alone); its name stays on `_walls.sql`'s
-- list. The rule is a helper granted to nobody (`servicio` is closed to the
-- client roles anyway). The three re-made with their signatures keep theirs,
-- said again so this file alone shows them.

revoke all on function servicio.card_terms_easier(servicio.card_terms, servicio.card_terms) from public, anon, authenticated;
revoke all on function servicio.card_state(uuid, uuid)                                     from public, anon, authenticated;

revoke all on function public.set_card_terms(uuid, text, integer, integer, text)           from public, anon;
revoke all on function public.kitchen_card(uuid)                                            from public, anon;
revoke all on function public.on_offer_now()                                                from public, anon;

grant execute on function public.set_card_terms(uuid, text, integer, integer, text)        to authenticated;
grant execute on function public.kitchen_card(uuid)                                         to authenticated;
grant execute on function public.on_offer_now()                                             to authenticated;
