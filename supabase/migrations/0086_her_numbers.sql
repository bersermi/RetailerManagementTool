-- ============================================================================
-- 0086 — her numbers: what passed through Itacate at her kitchen, counted for
--        the day, the week and the month, each against the one before
-- ============================================================================
-- docs/PLAN.md task `10.9f` — *Tus números* (Lanes Backend and Cocina). The
-- owner's rulings of 2026-11-17 (his private notes, G24–G27; drawn on the
-- family-shell page, round 7, `cNumeros`):
--
--   answers, not indicators — *¿Cuántos platos has entregado?* — for *Día ·
--   Semana · Mes* at her pick, each against the period before, on her kitchen's
--   calendar (Mexico City's), weeks from Monday (G24, G26); only what passes
--   through Itacate: her reservations collected, and walk-ins who got a stamp —
--   her counter's sales stay out (G24); pesos *en apartados entregados*, at the
--   price she published, an estimate and said so (G25); *platos entregados* the
--   quantities collected, *visitas* collected reservations plus walk-in stamps,
--   one per neighbour a day, *vecinos* those with a visit, *regresan* those of
--   them with a visit before the period (G26); the figures about people only
--   from five neighbours in the period, plates and visits from the first, and
--   two bars, *Tus días fuertes* and *Tus horas fuertes* (G27); one function
--   counting her own rows, no new table; the owner only (G26, G18).
--
-- WHAT IS HERE:
--   1. `servicio.kitchen_events` — every row her numbers count, one per event:
--      a reservation collected (its moment, its plates, its pesos) or a stamp.
--   2. `servicio.numbers_in` — one period's figures from those events.
--   3. `servicio.kitchen_numbers_at` — the whole answer at a given moment: the
--      three periods and the three before them. Granted to nobody, so the suite
--      runs it at a moment of its own (a calendar), as postgres.
--   4. `public.kitchen_numbers` — the one door, the owner's: the answer now.
--
-- ⚠️ WHAT EACH WORD COUNTS (this migration's reading of G26 — reported in the
-- plan's status entry of 2026-11-19):
--   * COLLECTED IS `reservation_state`'s `recogido`, the database's one
--     definition: the kitchen typed its code (*Entregar*) OR she swiped *Ya lo
--     tengo*. A plate she confirmed went out even when the counter had no signal
--     to say so. Its moment is the first of the two; its day, that moment's day
--     in the kitchen's zone.
--   * A VISIT IS ONE PERSON ONE DAY: her collected reservations and her stamp
--     that day are one visit, at its first moment. A stamp given at the handover
--     (`via = 'entrega'`) is the same visit as its reservation even after her
--     account is gone (both then point to nobody, and are matched by the
--     reservation). Someone whose account is gone is a visitor still: each
--     reservation of hers, and each walk-in stamp, a visit of its own.
--   * A WALK-IN (*sin apartar, con su sello*) is a visit with a stamp and no
--     reservation collected that day.
--   * *VECINOS* ARE THE DISTINCT PEOPLE WITH A VISIT — never someone whose account
--     is gone, who is nobody. *REGRESAN* ARE THOSE OF THEM WITH A VISIT ON ANY
--     DAY BEFORE THE PERIOD began.
--   * THE FLOOR OF FIVE IS THE DATABASE'S: under five neighbours in a period, its
--     `neighbours` and `returning` are null, the period before's too — a phone
--     never receives a number it must not show.
--   * PESOS ARE WHAT SHE WAS TOLD TO CHARGE: each line's quantity at the price and
--     the *desechable* kept when she reserved (`0079`'s lines, whose prices never
--     move) — what *Entregar* tells the fonda to charge. What she actually
--     charged is not recorded anywhere; the screen says so.
--   * THE BARS COUNT VISITS — the days of the week (Monday first) and the hours
--     of the day, each visit at its first moment — so each set of bars adds up to
--     the period's visits.
--   * EACH PERIOD AGAINST THE WHOLE ONE BEFORE: today against yesterday, this
--     week (Monday to today) against last week, this month against last month.
--
-- ⚠️ WHAT IT NEVER SAYS: a name, an id, an order, who gave what. Counts only, of
-- her own kitchen's rows (`0079`'s reservations, `0085`'s stamps) — no new table,
-- nothing kept. The owner only (G18: her numbers are hers; a helper's *Hoy* has no
-- tile for them).
--
-- THE REFUSALS:
--   42501  nobody signed in; not the owner of that kitchen
--   TD013  a shop — only a kitchen has these numbers (`0072`'s code)
-- ⚠️ NOT REFUSED WHILE WERA'S SWITCH `numeros` IS OFF (`0081`): a read of her own
-- counts writes nothing and shows nothing to anyone else; whether Wera Cocina
-- offers the screen is the switch's and the build's (`@/lib/loQueUsas`), as
-- `kitchen_card`, a read, is not refused either.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`):
-- four functions added, nothing changed or removed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Every event her numbers count
-- ----------------------------------------------------------------------------

-- One row per event at a kitchen: a reservation collected, or a stamp. `who`
-- names the person for a visit — her id, or the reservation or the stamp when
-- her account is gone; `user_id` is her id, null once she is nobody.
create function servicio.kitchen_events(p_workspace_id uuid, p_tz text)
returns table (who text, user_id uuid, day date, at timestamptz, reserved boolean, plates numeric, pesos numeric)
language sql
stable
set search_path = ''
as $$
  select coalesce(r.buyer_id::text, 'r' || r.id::text),
         r.buyer_id,
         (least(r.handed_over_at, r.picked_up_at) at time zone p_tz)::date,
         least(r.handed_over_at, r.picked_up_at),
         true,
         coalesce((select sum(l.quantity) from public.reservation_line l where l.reservation_id = r.id), 0),
         coalesce((select sum(l.quantity * (l.unit_price + coalesce(l.container_price, 0)))
                     from public.reservation_line l where l.reservation_id = r.id), 0)
    from public.reservation r
   where r.workspace_id = p_workspace_id
     and public.reservation_state(r.cancelled_at, r.handed_over_at, r.picked_up_at,
                                  r.held_until, r.pickup_at, r.cancelled_by) = 'recogido'
  union all
  select coalesce(s.user_id::text, 'r' || s.reservation_id::text, 's' || s.id::text),
         s.user_id,
         s.day,
         s.given_at,
         false,
         0,
         0
    from servicio.card_stamp s
   where s.workspace_id = p_workspace_id
$$;

comment on function servicio.kitchen_events(uuid, text) is
  'Every event her numbers count at a kitchen, one row each: a reservation collected '
  '(reservation_state recogido — handed over or confirmed; its first moment, its day in the '
  'zone given, its plates and its pesos at the reserved price with the desechable) or a '
  'loyalty card stamp. who: her id, or r<reservation> / s<stamp> once her account is gone; '
  'user_id null then. Granted to nobody. 0086, plan 10.9f.';


-- ----------------------------------------------------------------------------
-- 2. One period's figures
-- ----------------------------------------------------------------------------

-- The figures for the days `p_from` to `p_to` (both in), from her events: plates,
-- pesos (in cents), visits, walk-ins, and — from five neighbours — how many and
-- how many had come before; the visits by weekday (Monday first) and by hour.
create function servicio.numbers_in(p_workspace_id uuid, p_tz text, p_from date, p_to date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with ev as (
    select * from servicio.kitchen_events(p_workspace_id, p_tz) e
     where e.day between p_from and p_to
  ),
  visit as (
    select e.who, e.user_id, e.day, min(e.at) as at, bool_or(e.reserved) as reserved
      from ev e
     group by e.who, e.user_id, e.day
  ),
  people as (
    select count(distinct v.user_id)::integer as n from visit v
  ),
  before as (
    select distinct b.user_id
      from servicio.kitchen_events(p_workspace_id, p_tz) b
     where b.user_id is not null and b.day < p_from
  )
  select jsonb_build_object(
    'from',       to_char(p_from, 'YYYY-MM-DD'),
    'to',         to_char(p_to, 'YYYY-MM-DD'),
    'plates',     (select trim_scale(coalesce(sum(e.plates), 0)) from ev e),
    'cents',      (select round(coalesce(sum(e.pesos), 0) * 100)::bigint from ev e),
    'visits',     (select count(*)::integer from visit),
    'walk_ins',   (select count(*)::integer from visit v where not v.reserved),
    'neighbours', case when (select p.n from people p) >= 5 then (select p.n from people p) end,
    'returning',  case when (select p.n from people p) >= 5 then
                    (select count(distinct v.user_id)::integer from visit v
                      where v.user_id in (select b.user_id from before b)) end,
    'days',       (select jsonb_agg((select count(*) from visit v where extract(isodow from v.day) = d)::integer
                                    order by d)
                     from generate_series(1, 7) d),
    'hours',      (select jsonb_agg((select count(*) from visit v
                                      where extract(hour from v.at at time zone p_tz) = h)::integer
                                    order by h)
                     from generate_series(0, 23) h)
  )
$$;

comment on function servicio.numbers_in(uuid, text, date, date) is
  'One period of her numbers, the days p_from to p_to in zone p_tz: {from, to (YYYY-MM-DD), '
  'plates, cents (pesos at the reserved price, desechable included, in cents), visits (one '
  'person one day), walk_ins (a stamp and no reservation that day), neighbours and returning '
  '(null under five neighbours — G27), days [7: Monday first] and hours [24] of visits}. '
  'Granted to nobody. 0086, plan 10.9f.';


-- ----------------------------------------------------------------------------
-- 3. The whole answer, at a moment
-- ----------------------------------------------------------------------------

-- Today, this week from Monday, this month — each with the whole period before
-- it — on the kitchen's calendar at `p_now`; and the moment of her first visit
-- ever (null: nothing yet, *Empiezan con tu primera entrega*).
create function servicio.kitchen_numbers_at(p_workspace_id uuid, p_now timestamptz)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tz    text := servicio.kitchen_zone(p_workspace_id);
  v_today date := (p_now at time zone v_tz)::date;
  v_week  date := date_trunc('week', v_today)::date;
  v_month date := date_trunc('month', v_today)::date;
  v_prev  text[] := array['returning', 'days', 'hours'];
begin
  return jsonb_build_object(
    'day',    to_char(v_today, 'YYYY-MM-DD'),
    'since',  (select min(e.at) from servicio.kitchen_events(p_workspace_id, v_tz) e where e.day <= v_today),
    'dia',    servicio.numbers_in(p_workspace_id, v_tz, v_today, v_today)
              || jsonb_build_object('prev', servicio.numbers_in(p_workspace_id, v_tz, v_today - 1, v_today - 1) - v_prev),
    'semana', servicio.numbers_in(p_workspace_id, v_tz, v_week, v_today)
              || jsonb_build_object('prev', servicio.numbers_in(p_workspace_id, v_tz, v_week - 7, v_week - 1) - v_prev),
    'mes',    servicio.numbers_in(p_workspace_id, v_tz, v_month, v_today)
              || jsonb_build_object('prev', servicio.numbers_in(p_workspace_id, v_tz,
                                                                (v_month - interval '1 month')::date, v_month - 1) - v_prev)
  );
end;
$$;

comment on function servicio.kitchen_numbers_at(uuid, timestamptz) is
  'Her numbers at a moment: {day (today in the kitchen''s zone, YYYY-MM-DD), since (her first '
  'visit ever, or null), dia, semana (from Monday), mes — each servicio.numbers_in to today, '
  'with prev: the whole period before, without returning, days and hours}. Granted to nobody: '
  'the suite runs it at a moment of its own. 0086, plan 10.9f.';


-- ----------------------------------------------------------------------------
-- 4. The one door — the owner's
-- ----------------------------------------------------------------------------

create function public.kitchen_numbers(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kind public.workspace_kind;
begin
  if auth.uid() is null then
    raise exception 'kitchen_numbers requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'kitchen_numbers: only the kitchen''s owner reads its numbers' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'kitchen_numbers: only a kitchen has these numbers' using errcode = 'TD013';
  end if;

  return servicio.kitchen_numbers_at(p_workspace_id, now());
end;
$$;

comment on function public.kitchen_numbers(uuid) is
  '*Tus números* — the owner''s (G18, G26): what passed through Itacate at her kitchen, now. '
  'servicio.kitchen_numbers_at''s answer: {day, since, dia, semana, mes}, each period {from, to, '
  'plates, cents, visits, walk_ins, neighbours, returning, days, hours, prev}. Counts only — never '
  'a name, an id or an order. 42501 signed out or not its owner, TD013 a shop. 0086, plan 10.9f.';


-- ----------------------------------------------------------------------------
-- 5. Who may call what
-- ----------------------------------------------------------------------------

revoke all on function servicio.kitchen_events(uuid, text)                 from public, anon, authenticated;
revoke all on function servicio.numbers_in(uuid, text, date, date)         from public, anon, authenticated;
revoke all on function servicio.kitchen_numbers_at(uuid, timestamptz)      from public, anon, authenticated;

-- The one a phone calls: named in `supabase/pgtap/_walls.sql`'s list in this pull request.
revoke all on function public.kitchen_numbers(uuid)                        from public, anon;
grant execute on function public.kitchen_numbers(uuid)                     to authenticated;
