-- ============================================================================
-- 0081 — what a kitchen uses: her choices, Wera's switch for each, and what she
--        tells us about the menu
-- ============================================================================
-- docs/PLAN.md task `10.9a-i` — the database half of the services' frame
-- (`10.9a`, split on size 2026-11-17). The owner's rulings of 2026-11-16 and 17
-- (the plan's status entries of 2026-11-17; drawn on the family-shell page, round
-- 7): the MVP runs through the family shell's stage 4, and each kitchen picks
-- what she uses — in the first run's *¿Qué más quieres usar?* and later in *Mi
-- cocina › Lo que usas*; *Hoy* grows a tile per feature she uses. ADR-035 §2.7
-- (*What is hers*: tables only functions read, in the closed `servicio` schema).
--
-- WHAT IS HERE:
--   1. TWO TABLES IN `servicio`, read and written only through the functions
--      below (the schema is closed to every client role since `0058`):
--        `kitchen_feature`  her kitchen's choice for each feature — `on`, `off`
--                           or `interesada` — with its moment; one row per
--                           kitchen and feature, never per phone
--        `menu_request`     what she wrote under *Cuéntanos cómo necesitas tu
--                           menú*, kept here and never sent anywhere
--   2. WERA'S SWITCH FOR EVERYONE GAINS A ROW PER FEATURE (`feature_switch`,
--      `0080`) — `tarjeta`, `promociones`, `numeros`, `menu` — and one for every
--      *Próximamente*, `proximamente`. ALL OFF: no feature is built yet, and
--      *Próximamente* waits for both stores to approve (his ruling). Turning one
--      on is one UPDATE on the live database, no build and no migration.
--   3. THREE FUNCTIONS FOR HER KITCHEN:
--        `my_kitchen_features(p_workspace_id)`   every member reads them
--        `set_kitchen_features(p_workspace_id, p_choices)`   the owner writes
--        `send_menu_request(p_workspace_id, p_text)`         the owner writes
--   4. THE DOOR RE-MADE, ITS SIGNATURE UNCHANGED (`on_offer_now`): each kitchen
--      gains `features` — what a neighbour sees there.
--
-- ⚠️ WHAT EACH SIDE SEES (his rulings; the two ⚠️ lines are this migration's
-- reading of them, reported to him in the plan's status entry of 2026-11-17):
--   * THE KITCHEN — every member reads her kitchen's choices (a helper's *Hoy*
--     draws the card's tile, `10.9b`); only the owner writes them, and only the
--     owner writes about the menu (*everything else is the owner's*, G18).
--   * ⚠️ A NEIGHBOUR — the door sends a kitchen's `features`: those she turned
--     `on` while Wera has them switched on for everyone, and ONLY THE TWO A
--     NEIGHBOUR SEES — the loyalty card and promotions. Her numbers are hers
--     alone (G26: the owner only), so the door never says she reads them; a
--     choice of `off` or `interesada` is never sent.
--   * ⚠️ HIM — *Me interesa* is a Discord line naming nobody (G44: *Una cocina
--     quiere: Tu menú*); a request about the menu is a Discord line saying only
--     that one arrived — what she wrote stays here (G45, taken on his behalf
--     2026-11-17: it could hold a name, and a Discord line names nobody). `0070`'s
--     one sender: queued after the commit, never failing her tap.
--
-- ⚠️ A FEATURE WERA HAS SWITCHED OFF CANNOT BE TURNED ON (`TD024`), so a kitchen
-- never holds `on` for something not built; `off` and `interesada` are always
-- taken (*Me interesa* is said of what is not here yet). Wera switching a
-- feature off later leaves her `on` in place: her tile and the door's word come
-- back with the switch.
--
-- THE REFUSALS (custom SQLSTATEs reach PostgREST as a 400):
--   42501  nobody signed in; not a member (the read); not the owner (a write)
--   TD013  a shop — only a kitchen chooses (`0072`'s code)
--   22023  an unknown feature or state, no choice, or a text empty or over 500
--   TD024  `on` for a feature Wera has switched off for everyone
--
-- ⚠️ THE DELETIONS: both tables hang off the kitchen with `on delete cascade`,
-- so `delete_my_business` (`0077`), `delete_my_account` (`0073`, `0080`) and the
-- two runbooks that call them take every row with the kitchen — no body changes.
-- Neither row holds a person's id. Neither blocks a deletion, so the apps' read
-- before *Eliminar* (`account.ts`' pending plates) has nothing to learn.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): two
-- tables in a schema no client reaches, five rows, three functions added, and
-- the door re-made with one key more and none changed — every Itacate and Wera
-- Cocina build in the field ignores a key it does not read.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Her kitchen's choices, and what she tells us about the menu
-- ----------------------------------------------------------------------------
-- One row per kitchen and feature: none until she chooses (*Decidir después*
-- leaves none). `changed_at` is when the state last changed — a retry of the
-- same choice keeps it. The four names are the family-shell page's (round 7);
-- a fifth is a new migration, as it is a new feature.

create table servicio.kitchen_feature (
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  feature      text not null,
  state        text not null,
  changed_at   timestamptz not null default now(),

  primary key (workspace_id, feature),
  constraint kitchen_feature_known check (feature in ('tarjeta', 'promociones', 'numeros', 'menu')),
  constraint kitchen_feature_state check (state in ('on', 'off', 'interesada'))
);

comment on table servicio.kitchen_feature is
  'What a kitchen uses: for each feature — tarjeta (the loyalty card), promociones, '
  'numeros (her numbers), menu (reserved: Próximamente) — on, off or interesada (Me '
  'interesa), with when it last changed. Per kitchen, never per phone; no row until she '
  'chooses. Read by every member (my_kitchen_features), written by the owner '
  '(set_kitchen_features); on reaches neighbours through the door for the card and '
  'promotions only. Goes with the kitchen. 0081, plan 10.9a-i.';

create table servicio.menu_request (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now(),

  constraint menu_request_body check (char_length(body) between 1 and 500 and body = btrim(body))
);

create index menu_request_workspace on servicio.menu_request (workspace_id);

comment on table servicio.menu_request is
  'What a kitchen''s owner wrote under Cuéntanos cómo necesitas tu menú (G45): kept here, '
  'read by Wera alone, never sent to Discord — whose line says only that one arrived. '
  'Goes with the kitchen. 0081, plan 10.9a-i.';

revoke all on servicio.kitchen_feature from public, anon, authenticated;
revoke all on servicio.menu_request    from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. Wera's switch for each, all off
-- ----------------------------------------------------------------------------
-- A feature's row says whether it is offered at all: off, no kitchen sees it in
-- her choices, *Lo que usas* or *Hoy*, may turn it on, or shows it to a
-- neighbour — so a built feature can stay off for everyone (promotions until his
-- product analyst rules). `proximamente` says whether every *Próximamente* may
-- show — *Tu menú* in *Lo que usas* and *Cuéntanos* on *Hoy* — after both stores
-- approve the app (his ruling of 2026-11-17).

insert into servicio.feature_switch (name, is_on) values
  ('tarjeta', false), ('promociones', false), ('numeros', false), ('menu', false),
  ('proximamente', false);

comment on table servicio.feature_switch is
  'Wera''s own switches, kept outside the apps: turning one on is one UPDATE on the live '
  'database, no build and no migration. kitchen_cancel — a kitchen may cancel a '
  'reservation (cancel_reservation_as_kitchen); off until its window and its penalty are '
  'ruled after the pilot''s numbers (the owner, 2026-11-10). 0080, plan 10.5b-ii-b. '
  'tarjeta, promociones, numeros, menu — whether each feature is offered to kitchens and '
  'shown to neighbours; proximamente — whether every Próximamente shows (after both '
  'stores approve). 0081, plan 10.9a-i.';


-- ----------------------------------------------------------------------------
-- 3. Her kitchen's side
-- ----------------------------------------------------------------------------

-- What her kitchen uses, what Wera offers, and whether she has told us about the
-- menu: one answer every screen of the frame draws from, and what each write
-- below answers too, so the phone holds the state as the database left it.
create function public.my_kitchen_features(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'my_kitchen_features requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'my_kitchen_features: that kitchen is not one of yours' using errcode = '42501';
  end if;

  return jsonb_build_object(
    -- Her choices, in the family-shell page's fixed order; a feature she never
    -- chose is not listed.
    'features', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'feature', f.feature, 'state', f.state, 'since', f.changed_at)
                                  order by array_position(array['tarjeta', 'promociones', 'numeros', 'menu'], f.feature)),
                                 '[]'::jsonb)
                   from servicio.kitchen_feature f
                  where f.workspace_id = p_workspace_id),
    -- What Wera offers now, in the same order.
    'available', (select coalesce(jsonb_agg(s.name
                                   order by array_position(array['tarjeta', 'promociones', 'numeros', 'menu'], s.name)),
                                  '[]'::jsonb)
                    from servicio.feature_switch s
                   where s.is_on and s.name in ('tarjeta', 'promociones', 'numeros', 'menu')),
    'proximamente', coalesce((select s.is_on from servicio.feature_switch s where s.name = 'proximamente'), false),
    'menu_requests', (select count(*)::integer from servicio.menu_request m where m.workspace_id = p_workspace_id)
  );
end;
$$;

comment on function public.my_kitchen_features(uuid) is
  'Any member of a kitchen: {features: [{feature, state, since}] — her choices, in the '
  'fixed order tarjeta, promociones, numeros, menu —, available: the features Wera offers '
  'now, proximamente: whether every Próximamente shows, menu_requests: how many times she '
  'told us about the menu}. 42501 when it is not one of hers. 0081, plan 10.9a-i.';


-- Her choices, one or several at once: the first run's *Seguir* sends every
-- feature it offered (`on` for those she picked, `off` for the rest), *Lo que
-- usas* one. Everything is checked before anything is written. *Me interesa* —
-- a feature becoming `interesada` — tells him on Discord, naming nobody.
create function public.set_kitchen_features(p_workspace_id uuid, p_choices jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_kind    text;
  v_feature text;
  v_value   jsonb;
  v_before  text;
begin
  if auth.uid() is null then
    raise exception 'set_kitchen_features requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'set_kitchen_features: only the owner of that kitchen chooses what it uses'
      using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'set_kitchen_features: only a kitchen chooses what it uses' using errcode = 'TD013';
  end if;

  if p_choices is null or jsonb_typeof(p_choices) <> 'object' or p_choices = '{}'::jsonb then
    raise exception 'set_kitchen_features: the choices are an object of feature to state'
      using errcode = '22023';
  end if;

  -- Every choice checked first: a key it does not know is refused, never ignored
  -- (`set_kitchen_page` ignores one, and a misspelt feature would be a 200 that
  -- chose nothing).
  for v_feature, v_value in select e.key, e.value from jsonb_each(p_choices) e loop
    if v_feature not in ('tarjeta', 'promociones', 'numeros', 'menu') then
      raise exception 'set_kitchen_features: % is not a feature', v_feature using errcode = '22023';
    end if;
    if jsonb_typeof(v_value) is distinct from 'string'
       or (v_value #>> '{}') not in ('on', 'off', 'interesada') then
      raise exception 'set_kitchen_features: % is on, off or interesada', v_feature using errcode = '22023';
    end if;
    if (v_value #>> '{}') = 'on'
       and not coalesce((select s.is_on from servicio.feature_switch s where s.name = v_feature), false) then
      raise exception 'set_kitchen_features: % is not offered now', v_feature using errcode = 'TD024';
    end if;
  end loop;

  for v_feature, v_value in select e.key, e.value from jsonb_each(p_choices) e
                             order by array_position(array['tarjeta', 'promociones', 'numeros', 'menu'], e.key) loop
    select f.state into v_before
      from servicio.kitchen_feature f
     where f.workspace_id = p_workspace_id and f.feature = v_feature
     for update;

    insert into servicio.kitchen_feature (workspace_id, feature, state)
    values (p_workspace_id, v_feature, v_value #>> '{}')
    on conflict (workspace_id, feature) do update
       set state = excluded.state, changed_at = now()
     where servicio.kitchen_feature.state is distinct from excluded.state;

    if (v_value #>> '{}') = 'interesada' and v_before is distinct from 'interesada' then
      perform servicio.avisar_a_wera('🍽️ Una cocina quiere: ' ||
        case v_feature
          when 'tarjeta'     then 'Tarjeta de lealtad'
          when 'promociones' then 'Promociones'
          when 'numeros'     then 'Tus números'
          when 'menu'        then 'Tu menú'
        end || '.');
    end if;
  end loop;

  return public.my_kitchen_features(p_workspace_id);
end;
$$;

comment on function public.set_kitchen_features(uuid, jsonb) is
  'The owner of a kitchen chooses what it uses: p_choices is {feature: state} — tarjeta, '
  'promociones, numeros, menu; on, off or interesada — one or several, all checked before '
  'any is written; a retry keeps the moment. A feature becoming interesada (Me interesa) '
  'queues a Discord line naming nobody. Answers my_kitchen_features. 42501 not the owner, '
  'TD013 a shop, 22023 an unknown feature or state, TD024 on while Wera has it switched '
  'off. 0081, plan 10.9a-i.';


-- *Cuéntanos cómo necesitas tu menú*: what she wrote is kept, and he hears only
-- that one arrived. Several are kept if she writes again.
create function public.send_menu_request(p_workspace_id uuid, p_text text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_body text := btrim(coalesce(p_text, ''));
begin
  if auth.uid() is null then
    raise exception 'send_menu_request requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'send_menu_request: only the owner of that kitchen writes about its menu'
      using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'send_menu_request: only a kitchen has a menu' using errcode = 'TD013';
  end if;

  if char_length(v_body) not between 1 and 500 then
    raise exception 'send_menu_request: the text is 1 to 500 characters' using errcode = '22023';
  end if;

  insert into servicio.menu_request (workspace_id, body) values (p_workspace_id, v_body);

  -- ⚠️ ONLY THAT ONE ARRIVED: what she wrote never leaves this table.
  perform servicio.avisar_a_wera('📝 Una cocina nos contó cómo necesita su menú.');

  return public.my_kitchen_features(p_workspace_id);
end;
$$;

comment on function public.send_menu_request(uuid, text) is
  'The owner of a kitchen tells Wera how she needs her menu (Cuéntanos cómo necesitas tu '
  'menú): the text, trimmed, 1 to 500 characters, kept in servicio.menu_request and never '
  'sent anywhere; a Discord line says only that one arrived. Answers my_kitchen_features. '
  '42501 not the owner, TD013 a shop, 22023 empty or too long. 0081, plan 10.9a-i.';


-- ----------------------------------------------------------------------------
-- 4. The door, re-made: `0080`'s body with one key more
-- ----------------------------------------------------------------------------
-- `features` — what a neighbour sees a kitchen use: the loyalty card and
-- promotions she turned on, while Wera has each switched on for everyone. Never
-- her numbers, never a choice of `off` or `interesada`. Always an array: `[]`
-- for every kitchen today, every switch being off. Every other key as `0080`.

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
  'strings. Since 0081, features: the loyalty card (tarjeta) and promotions (promociones) '
  'when the kitchen turned them on and Wera has them switched on for everyone — never '
  'her numbers. 0078, 0079, 0080 and 0081, plans 10.5-i-b-i, 10.5b-i, 10.5b-ii-b and 10.9a-i.';


-- ----------------------------------------------------------------------------
-- 5. Who may call what
-- ----------------------------------------------------------------------------
-- Each named in `supabase/pgtap/_walls.sql`'s list in this pull request.
revoke all on function public.my_kitchen_features(uuid)          from public, anon;
revoke all on function public.set_kitchen_features(uuid, jsonb)  from public, anon;
revoke all on function public.send_menu_request(uuid, text)      from public, anon;
grant execute on function public.my_kitchen_features(uuid)         to authenticated;
grant execute on function public.set_kitchen_features(uuid, jsonb) to authenticated;
grant execute on function public.send_menu_request(uuid, text)     to authenticated;
