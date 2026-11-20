-- ============================================================================
-- 0091 — her numbers with the loyalty card: six answers about her card beside
--        her reservations', and the one thing kept for them — how many cards
--        were erased each day
-- ============================================================================
-- docs/PLAN.md task `10.9l` — the owner's ruling of 2026-11-19, night (*"Yes to
-- everything"*, on the drawing of *Tus números* with the card): one scroll under
-- *Día · Semana · Mes*; a summary row *platos · visitas · sellos*; *Tus
-- apartados* as `0086` answers them; and ***Tu tarjeta de lealtad***, six
-- answers, each against the period before:
--
--   (1) ¿Cuántas de tus visitas juntaron sello? — the period's stamps (each is
--       one visit) of its visits, and of them those given at a handover
--       (`card_stamp.via = 'entrega'`), the rest at the counter;
--   (2) ¿Cuántos premios ganaron? — rewards won in the period; claimed in it;
--       and waiting to be given now;
--   (3) ¿Cuántos juntan sellos ahora? — cards going at the period's end (now),
--       and how many are one stamp from their reward — from five;
--   (4) ¿Cuántos empezaron tu tarjeta? — neighbours whose first stamp ever at
--       her kitchen fell in the period — from five;
--   (5) ¿Cada cuánto vuelven quienes juntan sellos? — the middle gap in days
--       between one stamp and the next, of gaps ending in the period — from
--       five;
--   (6) ¿Cuántas tarjetas se borraron? — cards erased for going their days
--       without a stamp (`10.9k`'s *¿Cuándo se borran?*).
--
-- WHAT IS HERE:
--   1. `servicio.card_erased` — THE ONE NEW THING KEPT (the ruling): one row per
--      kitchen per day, how many of its cards were erased for going their days
--      without a stamp. A number, no person, no card. `servicio.count_erased`
--      adds to it.
--   2. `servicio.forget_cards` — RE-MADE, ITS SIGNATURE UNCHANGED: the nightly
--      job counts the cards it erases for their days, each on the day her days
--      ran out. The rest of `0085`'s body word for word.
--   3. `servicio.give_card_stamp` — RE-MADE, ITS SIGNATURE UNCHANGED: ⚠️ THE
--      OTHER PATH THAT ERASES A CARD FOR ITS DAYS — she comes back after her
--      days ran out but before the job reached her card, and her stamp starts a
--      new one. Counted the same way, so (6) is every card erased for its days,
--      whichever path erased it. The rest of `0085`'s body word for word.
--   4. `servicio.card_numbers_in`, `servicio.cards_going_now`,
--      `servicio.cards_going_at`, `servicio.period_numbers` — the card's figures
--      for a period, from her card's rows read ONCE (`0086`'s rule).
--   5. `servicio.kitchen_numbers_at` — RE-MADE, ITS SIGNATURE UNCHANGED: `0086`'s
--      answer with more keys. `public.kitchen_numbers`, the one door, is not
--      touched: it answers whatever this answers.
--
-- THE NEW KEYS (every count an integer; `null` is under the floor):
--   each period, and its `prev` (the whole period before):
--     stamps         the period's stamps — each is one visit (one a day, G14)
--     rewards_won    rewards won in it
--     cards_started  her first stamp ever at this kitchen in it; null when the
--                    period's `neighbours` is (the floor of five, G27)
--     return_days    the middle gap; null under five neighbours with a gap
--     cards_erased   cards erased for their days, on days in it
--     cards_going    in a period: now, null under five; in its `prev`: ONE
--                    PERIOD EARLIER — a day, seven days, a month before now
--                    (the drawing's *hace una semana*), null under five
--   each period only (not its `prev`):
--     stamps_handover  of `stamps`, those given at a handover
--     rewards_claimed  rewards claimed in it
--     cards_one_away   of `cards_going` now, one stamp from the reward; null
--                      when `cards_going` is
--   the answer:
--     rewards_waiting  rewards won and not yet claimed, now
--
-- ⚠️ WHAT EACH WORD COUNTS (this migration's reading of the ruling — reported
-- in the plan's status entry of 2026-11-20):
--   * A STAMP IS A VISIT: one a day per neighbour per kitchen (G14), so the
--     period's stamps are its visits with a stamp, and (1)'s share is
--     `stamps` / `visits` — both on the same day, the kitchen's.
--   * A CARD GOING NOW is `kitchen_card`'s *cards* (`0085`): her card at this
--     kitchen, not past its days, while the kitchen keeps its card — the same
--     number *Tu tarjeta de lealtad* shows. ⚠️ ONE PERIOD EARLIER IS WORKED OUT
--     AGAIN FROM THE STAMPS, because a card that is over leaves no row: her last
--     stamp at that moment did not win the reward, her days (the terms her card
--     started on — the version current at its first stamp) had not passed, and
--     the kitchen's card had not been closed 30 days by then. ⚠️ Its one known
--     miss: a stamp sent days late from a phone with no signal is placed by its
--     moment, not by when it arrived, so in the hours it was on its way the
--     figure for that moment can differ by her — at pilot scale, a count off by
--     one, on a day already past.
--   * A NEW CARD (4) is her FIRST stamp ever at this kitchen — not a card begun
--     again after a reward or after one was erased.
--   * THE GAP (5) is days between two of her stamps at this kitchen, on the
--     kitchen's calendar (1 for two days running); the middle is the median,
--     rounded to the nearest day (2.5 → 3) — *la mitad tarda menos*.
--   * AN ERASED CARD (6) counts on the day her days RAN OUT, in the kitchen's
--     zone — not the night the job reached it — so the job running at 03:21
--     moves nothing between days. A card past its days that the job has not yet
--     reached is counted from the card itself (not yet in `card_erased`), so
--     today's figure is whole before tonight's job, and the job running changes
--     no figure. ⚠️ NOT COUNTED: cards that go because the kitchen closed its
--     card 30 days before, because she deleted her account, or because the
--     kitchen reopened its card more than 30 days after closing it — none of
--     them went their days without a stamp.
--   * THE FLOOR OF FIVE IS THE DATABASE'S, ON THE PEOPLE EACH FIGURE IS ABOUT:
--     (3) the cards going themselves; (4) the period's neighbours, as
--     `returning` (G27) — *de 27, 6 empezaron*; (5) the neighbours whose gaps
--     make the middle. Under it the figure arrives null, and a phone never holds
--     a number it must not show. (1), (2) and (6) count stamps, rewards and
--     cards, from the first — the drawing's table.
--   * SOMEONE WHOSE ACCOUNT IS GONE: her stamps stay, pointing to nobody (`0085`),
--     and still count in (1) as the visits they were; she is in no card going,
--     no new card and no gap — nobody can be followed from one stamp to the next.
--
-- ⚠️ WHAT IT NEVER SAYS: a name, an id, an order, who gave what, who is about to
-- win (the ruling's *left out*). Counts only, of her own kitchen's rows. The
-- owner only — `kitchen_numbers`' refusals, unchanged (G18).
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`):
-- one table and five functions added in `servicio`, which no client reaches;
-- three functions there re-made with their own signatures; the one door's
-- answer gains keys and loses none — a Wera Cocina build that does not know a
-- key ignores it (`cocina/src/api/numeros.ts` reads by name).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The one thing kept: how many cards were erased, per kitchen per day
-- ----------------------------------------------------------------------------

create table servicio.card_erased (
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  -- The day her days ran out, in the kitchen's zone.
  day          date not null,
  cards        integer not null,

  primary key (workspace_id, day),
  constraint card_erased_cards check (cards > 0)
);

comment on table servicio.card_erased is
  'How many of a kitchen''s loyalty cards were erased for going their days without a stamp '
  '(G15), per day — the day her days ran out, in the kitchen''s zone. A number, never a '
  'person or a card: the one thing kept for Tus números'' ¿Cuántas tarjetas se borraron? '
  '(the owner''s ruling of 2026-11-19). Written by servicio.forget_cards (the nightly job) '
  'and by servicio.give_card_stamp when she comes back after her days ran out, both through '
  'servicio.count_erased; read by servicio.kitchen_numbers_at. Goes with the kitchen. 0091, '
  'plan 10.9l.';

-- Adds cards to a kitchen's day.
create function servicio.count_erased(p_workspace_id uuid, p_day date, p_cards integer default 1)
returns void
language sql
set search_path = ''
as $$
  insert into servicio.card_erased as e (workspace_id, day, cards)
  values (p_workspace_id, p_day, p_cards)
  on conflict (workspace_id, day) do update set cards = e.cards + excluded.cards
$$;

comment on function servicio.count_erased(uuid, date, integer) is
  'Adds p_cards (1 unless said) to servicio.card_erased for a kitchen and a day. Granted to '
  'nobody. 0091, plan 10.9l.';


-- ----------------------------------------------------------------------------
-- 2. Every night: what time and closing erased — the cards erased for their
--    days now counted
-- ----------------------------------------------------------------------------
-- `0085`'s body word for word, but for its first statement: the delete returns
-- each card's kitchen and the moment her days ran out, and one row per kitchen
-- and day is added to `card_erased`. Data-modifying statements in a WITH run
-- once and to completion, so the count is of exactly the rows deleted.

create or replace function servicio.forget_cards()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n     integer;
  v_total integer := 0;
begin
  -- Her days passed with no stamp (G15): those stamps are erased — and counted,
  -- each on the day her days ran out (`0091`).
  with gone as (
    delete from servicio.loyalty_card c
     using servicio.card_terms t
     where t.id = c.terms_id and t.expiry_days is not null
       and c.last_stamp_at + make_interval(days => t.expiry_days) <= now()
    returning c.workspace_id, c.last_stamp_at + make_interval(days => t.expiry_days) as ran_out
  ),
  counted as (
    insert into servicio.card_erased as e (workspace_id, day, cards)
    select g.workspace_id, (g.ran_out at time zone servicio.kitchen_zone(g.workspace_id))::date, count(*)::integer
      from gone g
     group by 1, 2
    on conflict (workspace_id, day) do update set cards = e.cards + excluded.cards
  )
  select count(*)::integer into v_n from gone;
  v_total := v_total + v_n;

  -- Thirty days after a card closed (G12): the cards going there, and the rewards
  -- nobody claimed. A reward claimed stays: it is what the kitchen gave.
  delete from servicio.loyalty_card c
   using servicio.card_terms t
   where t.workspace_id = c.workspace_id and t.replaced_at is null
     and t.closed_at <= now() - interval '30 days';
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from servicio.card_reward r
   using servicio.card_terms t
   where t.workspace_id = r.workspace_id and t.replaced_at is null
     and t.closed_at <= now() - interval '30 days' and r.claimed_at is null;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from servicio.code_miss m where m.at <= now() - interval '1 day';
  delete from servicio.code_used u where u.used_at <= now() - interval '8 days';

  return v_total;
end;
$$;

comment on function servicio.forget_cards() is
  'Every night: deletes the loyalty cards that went their terms'' days without a stamp '
  '(G15) — counting them in servicio.card_erased, each on the day her days ran out (0091) — '
  'and 30 days after a kitchen closed its card the cards going there and the rewards nobody '
  'claimed (G12); and the misses older than a day. Run by pg_cron (the job forget-cards); '
  'granted to nobody. Returns how many cards and rewards it deleted. The reads already show '
  'none of them past their moment, so the job running late shows nothing older. 0085, plan '
  '10.9e-i; 0091, plan 10.9l.';


-- ----------------------------------------------------------------------------
-- 3. The stamp: a card past its days, erased by her coming back, counted too
-- ----------------------------------------------------------------------------
-- `0085`'s body word for word, but for one variable and the four lines after
-- its expired card's delete.

create or replace function servicio.give_card_stamp(
  p_workspace_id   uuid,
  p_user_id        uuid,
  p_at             timestamptz,
  p_by             uuid,
  p_via            text,
  p_reservation_id uuid
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_day   date;
  v_cur   servicio.card_terms%rowtype;
  v_terms servicio.card_terms%rowtype;
  v_card  servicio.loyalty_card%rowtype;
  v_has   boolean;
  v_first boolean;
  v_count smallint;
  v_gone  integer;
begin
  if not servicio.card_switched_on() then
    return 'apagada';
  end if;
  if exists (select 1 from public.workspace_member wm
              where wm.workspace_id = p_workspace_id and wm.user_id = p_user_id and wm.is_active) then
    return 'propia';
  end if;

  -- Two stamps at once (her scan and the handover's trigger, the same minute)
  -- count once: everything below runs for one of them at a time.
  perform pg_advisory_xact_lock(hashtextextended('card:' || p_workspace_id::text || ':' || p_user_id::text, 0));

  v_day := (p_at at time zone servicio.kitchen_zone(p_workspace_id))::date;
  if exists (select 1 from servicio.card_stamp s
              where s.workspace_id = p_workspace_id and s.user_id = p_user_id and s.day = v_day) then
    return 'ya_hoy';
  end if;

  select * into v_cur from servicio.card_terms t
   where t.workspace_id = p_workspace_id and t.replaced_at is null;

  select * into v_card from servicio.loyalty_card c
   where c.user_id = p_user_id and c.workspace_id = p_workspace_id;
  v_has := found;
  if v_has then
    select * into v_terms from servicio.card_terms t where t.id = v_card.terms_id;
    -- Her days passed with no stamp (G15): those stamps are erased.
    if v_terms.expiry_days is not null
       and v_card.last_stamp_at + make_interval(days => v_terms.expiry_days) <= p_at then
      delete from servicio.loyalty_card c where c.user_id = p_user_id and c.workspace_id = p_workspace_id;
      -- `0091`: counted, on the day her days ran out — unless the nightly job erased it
      -- (and counted it) in the moment between the read above and this delete.
      get diagnostics v_gone = row_count;
      if v_gone > 0 then
        perform servicio.count_erased(p_workspace_id,
          ((v_card.last_stamp_at + make_interval(days => v_terms.expiry_days))
             at time zone servicio.kitchen_zone(p_workspace_id))::date);
      end if;
      v_has := false;
    end if;
  end if;

  if v_has then
    -- A card going: kept for 30 days after the kitchen closed it (G12).
    if servicio.card_kept_until(p_workspace_id) <= now() then
      return 'cerrada';
    end if;
    v_count := v_card.stamps + 1;
  else
    -- A new card: only while the kitchen's card is open, on its current terms.
    if v_cur.id is null or v_cur.closed_at is not null then
      return 'cerrada';
    end if;
    v_terms := v_cur;
    v_first := not exists (select 1 from servicio.card_stamp s
                            where s.workspace_id = p_workspace_id and s.user_id = p_user_id);
    v_count := 1;
  end if;

  insert into servicio.card_stamp
         (workspace_id, user_id, day, given_at, given_by, via, reservation_id, count_after, of_stamps)
  values (p_workspace_id, p_user_id, v_day, p_at, p_by, p_via, p_reservation_id, v_count, v_terms.stamps);

  if v_count >= v_terms.stamps then
    -- The last stamp: the reward won, the card back to zero (G11, G17).
    delete from servicio.loyalty_card c where c.user_id = p_user_id and c.workspace_id = p_workspace_id;
    insert into servicio.card_reward (workspace_id, user_id, terms_id, reward, won_at)
    values (p_workspace_id, p_user_id, v_terms.id, v_terms.reward, p_at);
    return 'gano';
  end if;

  if v_has then
    update servicio.loyalty_card c
       set stamps = v_count, last_stamp_at = greatest(c.last_stamp_at, p_at)
     where c.user_id = p_user_id and c.workspace_id = p_workspace_id;
    return 'sello';
  end if;

  insert into servicio.loyalty_card (user_id, workspace_id, terms_id, stamps, started_at, last_stamp_at)
  values (p_user_id, p_workspace_id, v_terms.id, 1, p_at, p_at);
  return case when v_first then 'primer' else 'sello' end;
end;
$$;

comment on function servicio.give_card_stamp(uuid, uuid, timestamptz, uuid, text, uuid) is
  'One loyalty card stamp, whichever way it came: answers primer, sello, gano (the reward '
  'won, the card back to zero), ya_hoy (one a day in the kitchen''s zone, G14), cerrada '
  '(no card open for a new one, or 30 days past closing), propia (she works there) or '
  'apagada (Wera''s switch off) — writing nothing for the last four. A card of hers past its '
  'days is erased first and counted in servicio.card_erased on the day they ran out (0091). '
  'Granted to nobody. 0085, plan 10.9e-i; 0091, plan 10.9l.';


-- ----------------------------------------------------------------------------
-- 4. The card's figures for a period
-- ----------------------------------------------------------------------------

-- (1), (2), (4), (5) and (6) for the days `p_from` to `p_to` (both in), from her
-- kitchen's rows read once by the caller. `p_people` is whether the period's
-- neighbours reached the floor (`numbers_in`'s `neighbours` not null) — (4)'s
-- floor. With `p_full`, also the stamps at a handover and the rewards claimed;
-- the period before needs neither.
create function servicio.card_numbers_in(
  p_stamps  servicio.card_stamp[],
  p_rewards servicio.card_reward[],
  p_erased  servicio.card_erased[],
  p_tz      text,
  p_from    date,
  p_to      date,
  p_people  boolean,
  p_full    boolean
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with st as (
    select s.via from unnest(p_stamps) s where s.day between p_from and p_to
  ),
  -- Each gap between two of her stamps here, kept when it ends in the period.
  gap as (
    select g.user_id, g.days
      from (select s.user_id, s.day,
                   s.day - lag(s.day) over (partition by s.user_id order by s.day) as days
              from unnest(p_stamps) s
             where s.user_id is not null) g
     where g.days is not null and g.day between p_from and p_to
  )
  select jsonb_build_object(
    'stamps',        (select count(*)::integer from st),
    'rewards_won',   (select count(*)::integer from unnest(p_rewards) r
                       where (r.won_at at time zone p_tz)::date between p_from and p_to),
    'cards_started', case when p_people then
                       (select count(*)::integer
                          from (select s.user_id, min(s.day) as first_day
                                  from unnest(p_stamps) s
                                 where s.user_id is not null
                                 group by s.user_id) f
                         where f.first_day between p_from and p_to) end,
    'return_days',   case when (select count(distinct g.user_id) from gap g) >= 5 then
                       (select round((percentile_cont(0.5) within group (order by g.days))::numeric)::integer
                          from gap g) end,
    'cards_erased',  (select coalesce(sum(e.cards), 0)::integer from unnest(p_erased) e
                       where e.day between p_from and p_to)
  ) || case when not p_full then '{}'::jsonb else jsonb_build_object(
    'stamps_handover', (select count(*)::integer from st where st.via = 'entrega'),
    'rewards_claimed', (select count(*)::integer from unnest(p_rewards) r
                         where r.claimed_at is not null
                           and (r.claimed_at at time zone p_tz)::date between p_from and p_to)
  ) end
$$;

comment on function servicio.card_numbers_in(servicio.card_stamp[], servicio.card_reward[], servicio.card_erased[],
                                             text, date, date, boolean, boolean) is
  'The loyalty card''s figures for the days p_from to p_to in zone p_tz, from a kitchen''s '
  'stamps, rewards and erased counts: {stamps, rewards_won, cards_started (her first stamp '
  'ever there; null unless p_people), return_days (the median gap in days between two of her '
  'stamps, of gaps ending in the period, rounded; null under five neighbours with a gap), '
  'cards_erased} and, with p_full, {stamps_handover (via entrega), rewards_claimed}. Granted '
  'to nobody. 0091, plan 10.9l.';

-- (3) now: `kitchen_card`'s *cards* (`0085`) at `p_at`, and how many of them are
-- one stamp from the reward — both null under five cards.
create function servicio.cards_going_now(p_workspace_id uuid, p_at timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with going as (
    select c.stamps, t.stamps as of_stamps
      from servicio.loyalty_card c
      join servicio.card_terms t on t.id = c.terms_id
     where c.workspace_id = p_workspace_id
       and c.started_at <= p_at
       and (t.expiry_days is null or c.last_stamp_at + make_interval(days => t.expiry_days) > p_at)
       and servicio.card_kept_until(p_workspace_id) > p_at
  )
  select case when count(*) >= 5
              then jsonb_build_object('cards_going', count(*)::integer,
                                      'cards_one_away', (count(*) filter (where g.stamps = g.of_stamps - 1))::integer)
              else jsonb_build_object('cards_going', null, 'cards_one_away', null) end
    from going g
$$;

comment on function servicio.cards_going_now(uuid, timestamptz) is
  'A kitchen''s loyalty cards going at p_at — kitchen_card''s cards (0085): not past their '
  'days, while the kitchen keeps its card — and of them one stamp from the reward: '
  '{cards_going, cards_one_away}, both null under five cards (G27). Reads the cards as they '
  'are: p_at is now. Granted to nobody. 0091, plan 10.9l.';

-- (3) at a moment already past, worked out again from her stamps — a card that is
-- over leaves no row. Going at `p_at`: her last stamp here by then did not win
-- the reward; the days of the terms her card started on (the version current at
-- its first stamp, else the kitchen's first version) had not passed since that
-- last stamp; and no closing of the kitchen's card had reached its 30 days, while
-- still closed, after her card began. Null under five.
create function servicio.cards_going_at(
  p_stamps servicio.card_stamp[],
  p_terms  servicio.card_terms[],
  p_at     timestamptz
)
returns integer
language sql
stable
set search_path = ''
as $$
  with s as (
    select x.user_id, x.given_at, x.count_after, x.of_stamps
      from unnest(p_stamps) x
     where x.user_id is not null and x.given_at <= p_at
  ),
  last_stamp as (
    select distinct on (s.user_id) s.user_id, s.given_at, s.count_after, s.of_stamps
      from s order by s.user_id, s.given_at desc
  ),
  began as (
    select distinct on (s.user_id) s.user_id, s.given_at
      from s where s.count_after = 1 order by s.user_id, s.given_at desc
  ),
  card as (
    select l.given_at as last_at, b.given_at as began_at,
           (select t.expiry_days from unnest(p_terms) t
             order by (t.created_at <= b.given_at) desc,
                      case when t.created_at <= b.given_at then t.created_at end desc nulls last,
                      t.created_at
             limit 1) as days
      from last_stamp l
      join began b on b.user_id = l.user_id
     where l.count_after < l.of_stamps
  )
  select case when count(*) >= 5 then count(*)::integer end
    from card c
   where (c.days is null or c.last_at + make_interval(days => c.days) > p_at)
     and not exists (
       select 1 from unnest(p_terms) t
        where t.closed_at is not null
          and t.closed_at + interval '30 days' <= p_at
          and coalesce(t.replaced_at, 'infinity'::timestamptz) >= t.closed_at + interval '30 days'
          and c.began_at < t.closed_at + interval '30 days')
$$;

comment on function servicio.cards_going_at(servicio.card_stamp[], servicio.card_terms[], timestamptz) is
  'How many loyalty cards were going at p_at, a moment already past, worked out from a '
  'kitchen''s stamps and terms: her last stamp by then not the winning one, her card''s days '
  '(the version current at its first stamp) not passed, no closing 30 days old by then after '
  'it began. Null under five (G27). People whose account is gone are in none. Granted to '
  'nobody. 0091, plan 10.9l.';

-- One period whole: `0086`'s figures and the card's, each with the period
-- before's; `p_going` is (3) now, `p_going_before` the moment one period earlier.
create function servicio.period_numbers(
  p_events         servicio.kitchen_event[],
  p_stamps         servicio.card_stamp[],
  p_rewards        servicio.card_reward[],
  p_erased         servicio.card_erased[],
  p_terms          servicio.card_terms[],
  p_tz             text,
  p_from           date,
  p_to             date,
  p_prev_from      date,
  p_prev_to        date,
  p_going          jsonb,
  p_going_before   timestamptz
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_this jsonb := servicio.numbers_in(p_events, p_tz, p_from, p_to, true);
  v_prev jsonb := servicio.numbers_in(p_events, p_tz, p_prev_from, p_prev_to, false);
begin
  return v_this
      || servicio.card_numbers_in(p_stamps, p_rewards, p_erased, p_tz, p_from, p_to,
                                  jsonb_typeof(v_this -> 'neighbours') = 'number', true)
      || p_going
      || jsonb_build_object('prev',
           v_prev
           || servicio.card_numbers_in(p_stamps, p_rewards, p_erased, p_tz, p_prev_from, p_prev_to,
                                       jsonb_typeof(v_prev -> 'neighbours') = 'number', false)
           || jsonb_build_object('cards_going', servicio.cards_going_at(p_stamps, p_terms, p_going_before)));
end;
$$;

comment on function servicio.period_numbers(servicio.kitchen_event[], servicio.card_stamp[], servicio.card_reward[],
                                            servicio.card_erased[], servicio.card_terms[], text, date, date, date,
                                            date, jsonb, timestamptz) is
  'One period of Tus números whole: servicio.numbers_in''s figures and servicio.card_numbers_in''s '
  'for p_from to p_to, p_going ({cards_going, cards_one_away} now), and prev — the period '
  'before''s figures of both and its cards_going at p_going_before, one period earlier. '
  'Granted to nobody. 0091, plan 10.9l.';


-- ----------------------------------------------------------------------------
-- 5. The whole answer, at a moment — `0086`'s, with more keys
-- ----------------------------------------------------------------------------
-- Her rows are read once, here: her events (`0086`), and now her card's stamps,
-- rewards, terms and erased counts — with the cards past their days that the job
-- has not reached yet, each on the day its days ran out.

create or replace function servicio.kitchen_numbers_at(p_workspace_id uuid, p_now timestamptz)
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
  v_ev    servicio.kitchen_event[];
  v_st    servicio.card_stamp[];
  v_rw    servicio.card_reward[];
  v_tm    servicio.card_terms[];
  v_er    servicio.card_erased[];
  v_going jsonb;
begin
  select coalesce(array_agg(e), '{}') into v_ev from servicio.kitchen_events(p_workspace_id, v_tz) e;
  select coalesce(array_agg(s), '{}') into v_st from servicio.card_stamp s where s.workspace_id = p_workspace_id;
  select coalesce(array_agg(r), '{}') into v_rw from servicio.card_reward r where r.workspace_id = p_workspace_id;
  select coalesce(array_agg(t), '{}') into v_tm from servicio.card_terms t where t.workspace_id = p_workspace_id;
  select coalesce(array_agg(row(p_workspace_id, x.day, x.cards)::servicio.card_erased), '{}') into v_er
    from (select e.day, e.cards
            from servicio.card_erased e
           where e.workspace_id = p_workspace_id
          union all
          select ((c.last_stamp_at + make_interval(days => t.expiry_days)) at time zone v_tz)::date, 1
            from servicio.loyalty_card c
            join servicio.card_terms t on t.id = c.terms_id
           where c.workspace_id = p_workspace_id and t.expiry_days is not null
             and c.last_stamp_at + make_interval(days => t.expiry_days) <= p_now) x;
  v_going := servicio.cards_going_now(p_workspace_id, p_now);

  return jsonb_build_object(
    'day',    to_char(v_today, 'YYYY-MM-DD'),
    'since',  (select min(e.at) from unnest(v_ev) e where e.day <= v_today),
    'rewards_waiting',
              case when servicio.card_kept_until(p_workspace_id) > p_now then
                (select count(*)::integer from unnest(v_rw) r
                  where r.won_at <= p_now and (r.claimed_at is null or r.claimed_at > p_now))
              else 0 end,
    'dia',    servicio.period_numbers(v_ev, v_st, v_rw, v_er, v_tm, v_tz,
                                      v_today, v_today, v_today - 1, v_today - 1,
                                      v_going, p_now - interval '1 day'),
    'semana', servicio.period_numbers(v_ev, v_st, v_rw, v_er, v_tm, v_tz,
                                      v_week, v_today, v_week - 7, v_week - 1,
                                      v_going, p_now - interval '7 days'),
    'mes',    servicio.period_numbers(v_ev, v_st, v_rw, v_er, v_tm, v_tz,
                                      v_month, v_today, (v_month - interval '1 month')::date, v_month - 1,
                                      v_going, p_now - interval '1 month')
  );
end;
$$;

comment on function servicio.kitchen_numbers_at(uuid, timestamptz) is
  'Her numbers at a moment: {day (today in the kitchen''s zone, YYYY-MM-DD), since (her first '
  'visit ever, or null), rewards_waiting (0091), dia, semana (from Monday), mes — each '
  'servicio.period_numbers to today: 0086''s figures and, since 0091, the loyalty card''s, with '
  'prev: the whole period before}. Her rows read once. Granted to nobody: the suite runs it at '
  'a moment of its own. 0086, plan 10.9f; 0091, plan 10.9l.';

comment on function public.kitchen_numbers(uuid) is
  '*Tus números* — the owner''s (G18, G26): what passed through Itacate at her kitchen, now. '
  'servicio.kitchen_numbers_at''s answer: {day, since, rewards_waiting, dia, semana, mes}, each '
  'period {from, to, plates, cents, visits, walk_ins, neighbours, returning, days, hours, and '
  'since 0091 the loyalty card''s stamps, stamps_handover, rewards_won, rewards_claimed, '
  'cards_going, cards_one_away, cards_started, return_days, cards_erased; prev}. Counts only — '
  'never a name, an id or an order. 42501 signed out or not its owner, TD013 a shop. 0086, plan '
  '10.9f; 0091, plan 10.9l.';


-- ----------------------------------------------------------------------------
-- 6. Who may call what
-- ----------------------------------------------------------------------------
-- Nothing here is a door: every function is granted to nobody, the table to no
-- client role (its schema is closed to them since `0058`; said again so this file
-- alone shows it). The three re-made keep their rights (`create or replace`);
-- said again too (ADR-035 §2.7: never `from public` alone).
revoke all on table servicio.card_erased                                                   from public, anon, authenticated;
revoke all on function servicio.count_erased(uuid, date, integer)                          from public, anon, authenticated;
revoke all on function servicio.forget_cards()                                             from public, anon, authenticated;
revoke all on function servicio.give_card_stamp(uuid, uuid, timestamptz, uuid, text, uuid) from public, anon, authenticated;
revoke all on function servicio.card_numbers_in(servicio.card_stamp[], servicio.card_reward[], servicio.card_erased[],
                                                text, date, date, boolean, boolean)       from public, anon, authenticated;
revoke all on function servicio.cards_going_now(uuid, timestamptz)                         from public, anon, authenticated;
revoke all on function servicio.cards_going_at(servicio.card_stamp[], servicio.card_terms[], timestamptz)
                                                                                           from public, anon, authenticated;
revoke all on function servicio.period_numbers(servicio.kitchen_event[], servicio.card_stamp[], servicio.card_reward[],
                                               servicio.card_erased[], servicio.card_terms[], text, date, date, date,
                                               date, jsonb, timestamptz)                  from public, anon, authenticated;
revoke all on function servicio.kitchen_numbers_at(uuid, timestamptz)                      from public, anon, authenticated;
