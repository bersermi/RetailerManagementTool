-- ============================================================================
-- 0085 — the loyalty card: a kitchen's terms, a neighbour's stamps and
--        rewards, and the codes that change every minute on both phones
-- ============================================================================
-- docs/PLAN.md task `10.9e-i` — the database half of the loyalty card (`10.9e`,
-- split on size 2026-11-19 in three: this; Wera Cocina's screens, `10.9e-ii`;
-- Itacate's, `10.9e-iii`). The owner's rulings of 2026-11-16 and 17 (his private
-- notes, G4–G19, G34, G41; drawn on the family-shell page, round 7):
--
--   *Tarjeta de lealtad* (G4); one stamp per visit, given by the kitchen, at most
--   one a day per neighbour per kitchen, reservations and walk-ins together (G5,
--   G6, G14); the kitchen sets the reward (up to 60 characters) and 4 to 12
--   stamps (G7, G34, round 3); stamps erased after *Nunca*, 15, 30, 45 or 60 days
--   without coming, counted from her last stamp (G8, G15); a reservation stamps
--   itself on the kitchen's *Entregar*, never on her *Ya lo tengo* alone (G9,
--   G14); codes both ways — the kitchen's on *Sellar*, changing every minute and
--   working with no signal, and the neighbour's *Mi código* — a code living its
--   minute and the one before, six digits typed when the camera fails (G10, G16);
--   a reward won at the last stamp, the card back to zero that visit, rewards
--   adding up and never expiring while the card is on, she choosing which to
--   claim, claimed the same way as a stamp (G11, G15, G17, round 3); new terms for
--   new cards only, closing stops new cards and those started finish and redeem
--   for 30 days (G12); everyone at a fonda on her own phone, each phone its own
--   code, every stamp and reward recording who gave it (G13, G19); a helper gives
--   stamps and rewards, the terms are the owner's (G18).
--
-- ADR-035 §2.7 (its review of 2026-11-17): her rows are rows about her in
-- `servicio`, read and written only through `security definer` functions keyed
-- on `auth.uid()` — the reservations' and the follows' pattern (`0079`, `0084`);
-- no policy names her; a kitchen reads a neighbour's card only from the code she
-- shows, and the names of those it stamped today.
--
-- WHAT IS HERE:
--   1. EIGHT TABLES IN `servicio` (closed to every client role since `0058`):
--        `card_terms`     each version of a kitchen's terms; the newest is the
--                         current one, open or closed
--        `loyalty_card`   her card at a kitchen: the stamps since her last reward,
--                         on the terms it started with — one per kitchen
--        `card_stamp`     every stamp: the kitchen, her, the day, who gave it and
--                         how — one a day, kept for her numbers (`10.9f`)
--        `card_reward`    every reward won: what it is, when, and when it was
--                         claimed, by whom and how
--        `kitchen_key`    each phone's secret at a kitchen, for *Sellar*'s code
--        `neighbour_key`  each of her phones' secret, for *Mi código*
--        `code_miss`      a code that fitted nothing, per person, for one day
--        `code_used`      a minute of her code that gave a reward: one reward a scan
--   2. THE CODES: `servicio.hotp` — RFC 4226's HOTP, six digits from HMAC-SHA1 of
--      the minute (RFC 6238's TOTP with a 60-second step), so the database, Wera
--      Cocina and Itacate are each checked against the RFC's published values; a
--      code fits at a moment when it is that minute's or the one before's.
--   3. ONE STAMP, WHICHEVER PATH: `servicio.give_card_stamp` — called by the
--      kitchen scanning her code, by her scanning the kitchen's, and by the
--      trigger on a reservation handed over (`card_stamp_on_handover`).
--   4. TWO TRIGGERS MORE: a member's phones' codes go when she stops working
--      there (`kitchen_keys_leave_with_member`, on every path that ends a
--      membership or deletes it); the card closes when the kitchen turns it off
--      in *Lo que usas* (`card_closes_with_feature`).
--   5. A NIGHTLY JOB (`forget-cards`, 09:21 UTC): a card not visited within its
--      days loses its stamps; 30 days after a card closed, its cards and the
--      rewards nobody claimed go; misses older than a day go.
--   6. SEVEN FUNCTIONS FOR THE KITCHEN — the terms and closing are the owner's,
--      the rest any member's (G18):
--        `set_card_terms`, `close_card`, `kitchen_card`, `register_kitchen_key`,
--        `card_of_code`, `give_stamp`, `give_reward`
--   7. FOUR FOR HER, keyed on `auth.uid()`:
--        `register_my_key`, `my_cards`, `stamp_with_code`, `claim_with_code`
--   8. THE DOOR RE-MADE, ITS SIGNATURE UNCHANGED (`on_offer_now`, `0081`'s body
--      with one key more): each kitchen's `card` — its current terms while its
--      card is open and Wera's switch is on — what she starts on before her first
--      stamp (G12). ADR-035 §2.7 (its review of 2026-11-17): what she reads of a
--      kitchen's services comes through the one door, never a second.
--   9. `delete_my_account` RE-MADE, ITS SIGNATURE UNCHANGED: her cards, rewards
--      still to claim, phones' secrets and misses go; her stamps and the rewards
--      she claimed stay, pointing to nobody — as her reservations do (`0079`).
--
-- ⚠️ WHAT EACH SIDE SEES (his rulings; the ⚠️ lines are this migration's reading,
-- reported in the plan's status entry of 2026-11-19):
--   * HER — her own cards, rewards and stamps' count, by `auth.uid()`, each with
--     its kitchen's public name, colonia, colour and logo (G41) — her own rows, as
--     `my_follows` sends them (`0084`), not a second door; a kitchen's current terms
--     before her first stamp through the door's `card`, beside its name and address
--     there (G12, G41). ⚠️ Her progress as a mark in *Cerca* (G38) is HERS, not the
--     kitchen's: Itacate reads it from `my_cards` by kitchen id, and the door does
--     not carry it.
--   * THE KITCHEN — every member reads its counts (cards going, stamps today,
--     rewards to give) and today's lines (*Ana R. · sello 3 de 8*): the names of
--     those it stamped or rewarded TODAY, in its zone, through `neighbour_name`
--     (`0080`'s *Ana R.*). A neighbour's card — her stamps and rewards — only from
--     the code she is showing (`card_of_code`). ⚠️ Never a list of who holds its
--     card, and never who gave which stamp: that is recorded (G19) and read by
--     nothing here.
--   * ⚠️ A KITCHEN'S OWN PEOPLE ARE NO CUSTOMERS OF IT: a stamp or a reward for
--     an active member of that kitchen is answered `propia` and nothing is
--     written — a helper cannot fill her own card. Her login is one across the
--     three apps, so she collects at every other kitchen.
--
-- ⚠️ WHAT A NEW CARD IS (G12, read here): a card that completed or lost its
-- stamps to time is over, and her next stamp there starts a new one on the
-- CURRENT terms. A card in progress keeps its terms to the end, through any
-- number of new versions.
--
-- ⚠️ THE CODES' THREE PROMISES, AND THEIR LIMITS:
--   * A CODE LIVES ITS MINUTE AND THE ONE BEFORE (G16): a QR scanned, or six
--     digits typed, fits for one to two minutes.
--   * THE KITCHEN'S SIDE WORKS WITH NO SIGNAL: its phone works its own code out
--     of its secret, and a scan of hers it cannot send yet is sent from its queue
--     with the moment of the scan (`p_at`, as `hand_over_reservation`'s, `0079`):
--     the code is checked at that moment, which may be up to 7 days back.
--   * SIX DIGITS TYPED NAME NOBODY UNTIL THE DATABASE FINDS WHOSE THEY ARE: the
--     QR carries the phone's key (`p_key`), the six digits alone do not, so a
--     typed code is tried against every phone of that side (`p_workspace_id`
--     narrows a kitchen's). ⚠️ At pilot scale that is cheap and almost never
--     ambiguous (two phones whose codes match the same minute: `repite`, wait for
--     the next); at tens of thousands of phones it is neither, and a larger code
--     or a narrower search is that day's migration. ⚠️ Twenty misses in ten
--     minutes and the person is refused for the rest of them (`TD028`), which
--     keeps guessing a code — and with it a neighbour's name and card at the
--     kitchen guessing — slower than her coming back tomorrow. Two calls by one
--     person at once take turns (an advisory lock), so a burst cannot outrun the
--     count; and a code is checked only in a call that can write — PostgREST runs
--     a GET read-only, where a miss could not be kept (`25006`). Both found by
--     the independent review of `10.9e-i`.
--   * ONE REWARD A SCAN: a minute of her code that gave a reward gives no second
--     one (`ya_usado`) — she shows the next minute's for the next — so one scan,
--     or a code caught and sent again within the 7 days, never claims her whole
--     stack (the same review). Stamps need no such rule: one a day already.
--
-- THE ANSWERS (each function answers jsonb with a `result`, so the miss it
-- records is kept — a raised error would roll it back):
--   primer      her first stamp ever at that kitchen (*Tu primer sello en …*)
--   sello       a stamp
--   gano        the last stamp: a reward won, the card back to zero
--   ya_hoy      she has her stamp there today already; nothing written
--   cobrado     a reward claimed;  ya_cobrado  it was claimed before (a retry)
--   ya_usado    that minute of her code gave a reward already: the next gives one
--   cerrada     the card takes no stamp there: not set up, or closed and she has
--               none going, or closed more than 30 days ago
--   propia      she works at that kitchen
--   no_valido   the code fits no phone at this moment (counted as a miss)
--   repite      the code fits more than one phone: the next minute's will not
--   apagada     only from the trigger, which answers nobody: Wera's switch off
--
-- THE REFUSALS (custom SQLSTATEs reach PostgREST as a 400):
--   42501  nobody signed in; not a member of that kitchen; not its owner
--   22023  a term out of range; a code that is not six digits; a moment more
--          than 7 days back
--   25006  a code checked in a read-only call (a GET): never, so a miss is kept
--   TD013  a shop — only a kitchen has a card (`0072`'s code)
--   TD024  Wera has the card switched off for everyone (`0081`'s code)
--   TD027  no such reward of hers at that kitchen (new here)
--   TD028  too many codes that fitted nothing in ten minutes (new here)
--
-- ⚠️ WERA'S SWITCH (`feature_switch.tarjeta`, `0081`) STAYS OFF: nothing here
-- turns it on — it goes on when Itacate's screens ship (`10.9e-iii`), so until
-- then every write but closing is refused `TD024` and a handover stamps nothing.
--
-- ⚠️ THE DELETIONS: every table hangs off its kitchen with `on delete cascade`,
-- so `delete_my_business` (`0077`), `delete_my_account` (`0073`, `0080`, `0084`,
-- below) and the two runbooks that call them take a kitchen's card whole. Her
-- account deleted: see 8 above. A helper who leaves or is removed: her phones'
-- codes at that kitchen go (the trigger); her name stays on what she gave, as on
-- what she handed over. Nothing here blocks a deletion: the warning before
-- *Eliminar esta cocina* (G23, the fonda warned of her card holders) is
-- `10.9e-ii`'s, from `kitchen_card`'s counts.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`):
-- eight tables in a schema no client reaches, three triggers, a job, eleven
-- functions added, the door re-made with one key more and none changed — every
-- Itacate and Wera Cocina build in the field ignores a key it does not read — and
-- `delete_my_account` re-made with its signature and answer unchanged.
-- `hand_over_reservation` is not touched: the stamp is the trigger's.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The tables
-- ----------------------------------------------------------------------------

-- Each version of a kitchen's terms. The newest (`replaced_at is null`) is the
-- current one; `closed_at` on it is the card closed. A card in progress points at
-- the version it started on (G12: new terms for new cards only).
create table servicio.card_terms (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  reward       text not null,
  stamps       smallint not null,
  -- NULL is *Nunca*; otherwise the days without a stamp after which hers are erased.
  expiry_days  smallint,
  created_at   timestamptz not null default now(),
  -- A plain id (`0053`): the owner who saved this version.
  created_by   uuid not null,
  replaced_at  timestamptz,
  closed_at    timestamptz,

  constraint card_terms_reward check (char_length(reward) between 1 and 60 and reward = btrim(reward)),
  constraint card_terms_stamps check (stamps between 4 and 12),
  constraint card_terms_expiry check (expiry_days in (15, 30, 45, 60))
);

create unique index card_terms_current on servicio.card_terms (workspace_id) where replaced_at is null;

comment on table servicio.card_terms is
  'Each version of a kitchen''s loyalty card terms (Tarjeta de lealtad): the reward (1 to 60 '
  'characters), 4 to 12 stamps, and the days without a stamp after which hers are erased '
  '(15, 30, 45 or 60; NULL is Nunca). The newest (replaced_at null) is the current one; '
  'closed_at on it is the card closed (G12: no new cards; those started finish and redeem '
  'for 30 days). A card keeps the version it started on. Written by the owner '
  '(set_card_terms, close_card); goes with the kitchen. 0085, plan 10.9e-i.';

-- Her card at a kitchen: the stamps since her last reward there. At most one per
-- kitchen; a card that completes or loses its stamps to time is deleted, and her
-- next stamp starts a new one on the current terms.
create table servicio.loyalty_card (
  -- A plain id (`0053`): no key to the login, removed by `delete_my_account`.
  user_id       uuid not null,
  workspace_id  uuid not null references public.workspace (id) on delete cascade,
  terms_id      uuid not null references servicio.card_terms (id) on delete cascade,
  stamps        smallint not null,
  started_at    timestamptz not null,
  last_stamp_at timestamptz not null,

  primary key (user_id, workspace_id),
  -- 1 to 11: the stamp that reaches the terms' number wins the reward and ends it.
  constraint loyalty_card_stamps check (stamps between 1 and 11)
);

create index loyalty_card_by_kitchen on servicio.loyalty_card (workspace_id);
create index loyalty_card_by_terms on servicio.loyalty_card (terms_id);

comment on table servicio.loyalty_card is
  'A neighbour''s loyalty card at a kitchen: her stamps since her last reward there, on the '
  'terms it started with (G12). One per kitchen; deleted when it completes (a card_reward '
  'is written) or when it went its terms'' days without a stamp (G15), so her next stamp '
  'starts a new one on the current terms. user_id is a plain id (0053). Read by her '
  '(my_cards) and by the kitchen only from the code she shows (card_of_code). Goes with '
  'the kitchen and with her account. 0085, plan 10.9e-i.';

-- Every stamp: one a day per neighbour per kitchen, whichever way it came. Kept
-- after her card is over — it is the visit her numbers count (`10.9f`, G26).
create table servicio.card_stamp (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspace (id) on delete cascade,
  -- A plain id, cleared (NULL) when her account is deleted: the visit stays, nobody's.
  user_id        uuid,
  -- The day in the kitchen's zone: the one-a-day rule's day (G14).
  day            date not null,
  given_at       timestamptz not null,
  -- The member who gave it (G19): who typed the handover's code, whose phone's code
  -- she scanned, or who scanned hers. A plain id, as `reservation.handed_over_by`.
  given_by       uuid not null,
  via            text not null,
  reservation_id uuid,
  -- What *Sellar*'s line says: her count after this stamp, and of how many.
  count_after    smallint not null,
  of_stamps      smallint not null,

  constraint card_stamp_one_a_day unique (workspace_id, user_id, day),
  constraint card_stamp_via check (via in ('entrega', 'su_codigo', 'codigo_cocina')),
  constraint card_stamp_count check (count_after between 1 and of_stamps)
);

create index card_stamp_by_user on servicio.card_stamp (user_id) where user_id is not null;

comment on table servicio.card_stamp is
  'Every loyalty card stamp: the kitchen, the neighbour (a plain id, NULL once her account '
  'is deleted), the day in the kitchen''s zone (one a day, G14), when, the member who gave '
  'it (G19), how — entrega (the reservation''s handover, G9), su_codigo (the kitchen '
  'scanned hers) or codigo_cocina (she scanned the kitchen''s) — and her count after it. '
  'Kept after her card is over: the visits her numbers count (10.9f). Goes with the '
  'kitchen. 0085, plan 10.9e-i.';

-- Every reward won: what it was on the terms of the card that won it (G12), and
-- its claim. Unclaimed it never expires while the card is on (G15).
create table servicio.card_reward (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  user_id      uuid,
  terms_id     uuid not null references servicio.card_terms (id) on delete cascade,
  reward       text not null,
  won_at       timestamptz not null,
  claimed_at   timestamptz,
  claimed_by   uuid,
  claimed_via  text,

  constraint card_reward_claim_whole check (
    (claimed_at is null) = (claimed_by is null) and (claimed_at is null) = (claimed_via is null)),
  constraint card_reward_via check (claimed_via in ('su_codigo', 'codigo_cocina')),
  -- A reward still to claim is always somebody's: her account deleted deletes it.
  constraint card_reward_unclaimed_is_hers check (claimed_at is not null or user_id is not null)
);

create index card_reward_by_user on servicio.card_reward (user_id, workspace_id) where user_id is not null;
create index card_reward_to_give on servicio.card_reward (workspace_id) where claimed_at is null;

comment on table servicio.card_reward is
  'Every loyalty card reward won (G11): what it was — the text of the terms the card '
  'started on — when, and its claim: when, by which member (G19) and how (su_codigo, '
  'codigo_cocina). Unclaimed it never expires while the card is on (G15); 30 days after '
  'the card closes it goes (G12, the nightly job forget-cards). Claimed ones stay, NULL '
  'user once her account is deleted. Goes with the kitchen. 0085, plan 10.9e-i.';

-- Each phone's secret at a kitchen: *Sellar*'s code is worked out from it on the
-- phone, with no signal (G16). At most three per member per kitchen.
create table servicio.kitchen_key (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  user_id      uuid not null,
  secret       bytea not null,
  -- The moment of the call itself, so a phone's fourth registration drops the oldest
  -- even when two are made in one transaction.
  created_at   timestamptz not null default clock_timestamp(),

  constraint kitchen_key_secret check (octet_length(secret) = 20)
);

create index kitchen_key_by_member on servicio.kitchen_key (workspace_id, user_id);

comment on table servicio.kitchen_key is
  'A phone''s secret at a kitchen: the code on Sellar, changing every minute, is worked out '
  'from it on the phone with no signal (G16; each phone its own, G19). Handed to the phone '
  'once (register_kitchen_key); at most three per member per kitchen, the oldest dropped. '
  'Goes with the kitchen, and with the member when she stops working there '
  '(kitchen_keys_leave_with_member). 0085, plan 10.9e-i.';

-- Each of her phones' secret: *Mi código* is worked out from it on the phone.
create table servicio.neighbour_key (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  secret     bytea not null,
  created_at timestamptz not null default clock_timestamp(),

  constraint neighbour_key_secret check (octet_length(secret) = 20)
);

create index neighbour_key_by_user on servicio.neighbour_key (user_id);

comment on table servicio.neighbour_key is
  'A neighbour''s phone''s secret: Mi código, changing every minute, is worked out from it '
  'on the phone (G10, G16). Handed to the phone once (register_my_key); at most three per '
  'person, the oldest dropped. Goes with her account. 0085, plan 10.9e-i.';

-- A code that fitted nothing: kept a day, so a guess is slower than a visit.
create table servicio.code_miss (
  user_id uuid not null,
  at      timestamptz not null default now()
);

create index code_miss_by_user on servicio.code_miss (user_id, at);

comment on table servicio.code_miss is
  'One row per code tried that fitted no phone (no_valido): who tried and when. Twenty in '
  'ten minutes refuses her for the rest of them (TD028). Deleted after a day by '
  'forget-cards, and with her account. 0085, plan 10.9e-i.';

-- A minute of her code that gave a reward: that scan gives no second one.
create table servicio.code_used (
  key_id  uuid not null references servicio.neighbour_key (id) on delete cascade,
  minute  bigint not null,
  used_at timestamptz not null default now(),

  primary key (key_id, minute)
);

create index code_used_by_moment on servicio.code_used (used_at);

comment on table servicio.code_used is
  'A minute of a neighbour''s code (her phone''s key and the minute) that gave a reward: one '
  'reward a scan, so one scan — or a code caught and sent again — never claims her whole '
  'stack (the independent review of 10.9e-i). Deleted after 8 days by forget-cards (a '
  'scan''s moment is kept 7), and with her phone''s key. 0085, plan 10.9e-i.';

revoke all on servicio.card_terms    from public, anon, authenticated;
revoke all on servicio.loyalty_card  from public, anon, authenticated;
revoke all on servicio.card_stamp    from public, anon, authenticated;
revoke all on servicio.card_reward   from public, anon, authenticated;
revoke all on servicio.kitchen_key   from public, anon, authenticated;
revoke all on servicio.neighbour_key from public, anon, authenticated;
revoke all on servicio.code_miss     from public, anon, authenticated;
revoke all on servicio.code_used     from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. The codes
-- ----------------------------------------------------------------------------
-- RFC 4226 (HOTP), section 5.3: HMAC-SHA1 of the counter as 8 bytes, big-endian;
-- dynamic truncation; the last six digits. The counter is the minute since the
-- epoch (RFC 6238's TOTP with X = 60). Wera Cocina and Itacate each carry the same
-- algorithm (`src/lib/codigo.ts`), and all three are held to the RFC's ten values
-- for the secret 12345678901234567890.

create function servicio.hotp(p_secret bytea, p_counter bigint)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_mac bytea   := extensions.hmac(int8send(p_counter), p_secret, 'sha1');
  v_off integer := get_byte(v_mac, 19) & 15;
begin
  return lpad(((((get_byte(v_mac, v_off) & 127)::bigint << 24)
              | (get_byte(v_mac, v_off + 1)::bigint << 16)
              | (get_byte(v_mac, v_off + 2)::bigint << 8)
              |  get_byte(v_mac, v_off + 3)::bigint) % 1000000)::text, 6, '0');
end;
$$;

comment on function servicio.hotp(bytea, bigint) is
  'RFC 4226 HOTP: six digits from HMAC-SHA1 of the counter. With the minute since the epoch '
  'as the counter, the loyalty card''s codes (G16). Granted to nobody. 0085, plan 10.9e-i.';

-- The minute a moment falls in: the counter.
create function servicio.code_minute(p_at timestamptz)
returns bigint
language sql
stable
strict
set search_path = ''
as $$
  select floor(extract(epoch from p_at) / 60)::bigint
$$;

-- A code fits at a moment when it is that minute's or the one before's (G16).
create function servicio.code_fits(p_secret bytea, p_code text, p_at timestamptz)
returns boolean
language sql
stable
strict
set search_path = ''
as $$
  select p_code = servicio.hotp(p_secret, servicio.code_minute(p_at))
      or p_code = servicio.hotp(p_secret, servicio.code_minute(p_at) - 1)
$$;

-- Six digits, spaces allowed between them (*482 190* as the screen shows it), or
-- NULL for anything else.
create function servicio.code_digits(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when x.c ~ '^[0-9]{6}$' then x.c end
    from (select regexp_replace(coalesce(p_code, ''), '\s', '', 'g') as c) x
$$;

-- Twenty misses in ten minutes: refused for the rest of them. One person's calls
-- take turns here — held to the end of the call — so a burst of them at once each
-- sees the misses the ones before it kept.
create function servicio.code_tries_left(p_user uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('code_miss:' || p_user::text, 0));
  if (select count(*) from servicio.code_miss m
       where m.user_id = p_user and m.at > now() - interval '10 minutes') >= 20 then
    raise exception 'too many codes that fitted nothing: wait a few minutes' using errcode = 'TD028';
  end if;
end;
$$;

-- PostgREST runs a GET read-only: a code checked there could not keep its miss,
-- and its answer would still say whose the code is. Every function that checks a
-- code calls this first.
create function servicio.refuse_read_only()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if current_setting('transaction_read_only') = 'on' then
    raise exception 'a code is checked only in a call that can write' using errcode = '25006';
  end if;
end;
$$;

-- Whose kitchen phone shows this code at this moment: how many members' phones
-- fit (0, 1, or more), and when one, its kitchen and its member. Only phones of
-- active members of active kitchens; `p_workspace_id` and `p_key` narrow it.
create function servicio.kitchen_code_owner(
  p_code         text,
  p_at           timestamptz,
  p_workspace_id uuid,
  p_key          uuid,
  out o_fits     integer,
  out o_kitchen  uuid,
  out o_member   uuid
)
language plpgsql
stable
set search_path = ''
as $$
begin
  select count(distinct (k.workspace_id, k.user_id))::integer,
         (array_agg(k.workspace_id))[1],
         (array_agg(k.user_id))[1]
    into o_fits, o_kitchen, o_member
    from servicio.kitchen_key k
    join public.workspace w         on w.id = k.workspace_id and w.kind = 'cocina' and w.is_active
    join public.workspace_member wm on wm.workspace_id = k.workspace_id and wm.user_id = k.user_id
                                   and wm.is_active
   where (p_workspace_id is null or k.workspace_id = p_workspace_id)
     and (p_key is null or k.id = p_key)
     and servicio.code_fits(k.secret, p_code, p_at);
end;
$$;

-- Whose phone shows this code at this moment: how many people's phones fit, and
-- when one, who — and which of her phones, at which minute (one reward a scan).
create function servicio.neighbour_code_owner(
  p_code       text,
  p_at         timestamptz,
  p_key        uuid,
  out o_fits   integer,
  out o_user   uuid,
  out o_key    uuid,
  out o_minute bigint
)
language plpgsql
stable
set search_path = ''
as $$
begin
  select count(distinct f.user_id)::integer, (array_agg(f.user_id))[1],
         (array_agg(f.id))[1], (array_agg(f.minute))[1]
    into o_fits, o_user, o_key, o_minute
    from (select k.id, k.user_id,
                 case when p_code = servicio.hotp(k.secret, servicio.code_minute(p_at))
                      then servicio.code_minute(p_at)
                      when p_code = servicio.hotp(k.secret, servicio.code_minute(p_at) - 1)
                      then servicio.code_minute(p_at) - 1 end as minute
            from servicio.neighbour_key k
           where (p_key is null or k.id = p_key)) f
   where f.minute is not null;
end;
$$;


-- ----------------------------------------------------------------------------
-- 3. One stamp, whichever path — and what her card reads
-- ----------------------------------------------------------------------------

-- The kitchen's zone: its first active place's, as its reservations' day is.
create function servicio.kitchen_zone(p_workspace_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce((select l.timezone from public.location l
                    where l.workspace_id = p_workspace_id and l.is_active
                    order by l.created_at, l.id limit 1),
                  'America/Mexico_City')
$$;

-- Wera's switch for everyone (`0081`): the card, on or off.
create function servicio.card_switched_on()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select s.is_on from servicio.feature_switch s where s.name = 'tarjeta'), false)
$$;

-- Until when a kitchen's card is kept: `infinity` while open, 30 days after it
-- closed (G12), `-infinity` with no terms at all.
create function servicio.card_kept_until(p_workspace_id uuid)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select coalesce((select case when t.closed_at is null then 'infinity'::timestamptz
                               else t.closed_at + interval '30 days' end
                     from servicio.card_terms t
                    where t.workspace_id = p_workspace_id and t.replaced_at is null),
                  '-infinity'::timestamptz)
$$;

-- What a neighbour's card at a kitchen reads now: her stamps (0 once her days
-- passed), of how many, the reward, the days, the date they would be erased, her
-- stamp today, the rewards she has to claim (newest first), and the kitchen's
-- card open or closed. A card past its 30 days after closing reads empty.
create function servicio.card_state(p_workspace_id uuid, p_user_id uuid)
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
  v_open   boolean;
begin
  select * into v_cur from servicio.card_terms t
   where t.workspace_id = p_workspace_id and t.replaced_at is null;
  v_open := v_cur.id is not null and v_cur.closed_at is null;

  if v_kept > now() then
    select c.stamps, c.last_stamp_at, t.reward, t.stamps, t.expiry_days
      into v_stamps, v_last, v_reward, v_of, v_days
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
  end if;

  return jsonb_build_object(
    'stamps',      case when v_has then v_stamps else 0 end,
    'of',          v_of,
    'reward',      v_reward,
    'expiry_days', v_days,
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
  'expiry_days, expires_on (YYYY-MM-DD in the kitchen''s zone, or null), stamped_today, '
  'rewards: [{id, reward, won_at}] newest first, open, kept_until (30 days after it '
  'closed, or null)}. of, reward and expiry_days are her card''s terms, else the current '
  'open ones, else null. Granted to nobody. 0085, plan 10.9e-i.';

-- THE STAMP. Whichever path calls it, the same rules (G5, G6, G9, G12, G14, G15,
-- G17): Wera's switch on; not one of the kitchen's own people; one a day in the
-- kitchen's zone; a card whose days passed is over; a new card only while the
-- kitchen's card is open, on its current terms; a card going is stamped for 30
-- days after the kitchen closed it; the last stamp wins the reward and ends it.
-- Answers the result; writes nothing when it is not a stamp.
create function servicio.give_card_stamp(
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
  'apagada (Wera''s switch off) — writing nothing for the last four. Granted to nobody. '
  '0085, plan 10.9e-i.';


-- ----------------------------------------------------------------------------
-- 4. The triggers
-- ----------------------------------------------------------------------------

-- A reservation handed over stamps her card (G9): only the kitchen's *Entregar* —
-- `handed_over_at` — never her *Ya lo tengo* alone (G14). ⚠️ THE HANDOVER IS
-- ALWAYS RECORDED (`0079`): whatever the card does, it never fails the handover —
-- a stamp that cannot be given is a warning in the log, and the code typed stands.
create function servicio.stamp_on_handover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.workspace w where w.id = new.workspace_id and w.kind = 'cocina') then
    begin
      perform servicio.give_card_stamp(new.workspace_id, new.buyer_id, new.handed_over_at,
                                       new.handed_over_by, 'entrega', new.id);
    exception when others then
      raise warning 'card_stamp_on_handover: no stamp for reservation % (%: %)', new.id, sqlstate, sqlerrm;
    end;
  end if;
  return null;
end;
$$;

comment on function servicio.stamp_on_handover() is
  'Trigger: a kitchen''s reservation handed over (Entregar) stamps the neighbour''s loyalty '
  'card, the moment and the member who typed the code with it (G9, G14). Never fails the '
  'handover. Granted to nobody. 0085, plan 10.9e-i.';

create trigger card_stamp_on_handover
  after update of handed_over_at on public.reservation
  for each row
  when (old.handed_over_at is null and new.handed_over_at is not null
        and new.buyer_id is not null and new.handed_over_by is not null)
  execute function servicio.stamp_on_handover();

-- A member who stops working at a kitchen — she leaves (`leave_kitchen`), the
-- owner removes her, her account goes — takes her phones' codes there with her
-- (*each phone its own secret, gone with its helper*).
create function servicio.forget_member_keys()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from servicio.kitchen_key k where k.workspace_id = old.workspace_id and k.user_id = old.user_id;
  return null;
end;
$$;

comment on function servicio.forget_member_keys() is
  'Trigger: a membership ended or deleted deletes that member''s phones'' codes at that '
  'kitchen (G19). Granted to nobody. 0085, plan 10.9e-i.';

create trigger kitchen_keys_leave_with_member
  after update of is_active on public.workspace_member
  for each row
  when (old.is_active and not new.is_active)
  execute function servicio.forget_member_keys();

create trigger kitchen_keys_leave_with_member_row
  after delete on public.workspace_member
  for each row
  execute function servicio.forget_member_keys();

-- *Lo que usas* turning the card off closes it, exactly as *Cerrar la tarjeta*
-- does (the family-shell page: closing turns its tile off): those started finish
-- and redeem for 30 days (G12). Whichever screen she used, one rule.
create function servicio.card_closes_with_feature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update servicio.card_terms t
     set closed_at = now()
   where t.workspace_id = new.workspace_id and t.replaced_at is null and t.closed_at is null;
  return null;
end;
$$;

comment on function servicio.card_closes_with_feature() is
  'Trigger: a kitchen''s choice for tarjeta becoming anything but on closes its loyalty '
  'card (G12: those started finish and redeem for 30 days). Granted to nobody. 0085, plan '
  '10.9e-i.';

create trigger card_closes_with_feature
  after insert or update of state on servicio.kitchen_feature
  for each row
  when (new.feature = 'tarjeta' and new.state <> 'on')
  execute function servicio.card_closes_with_feature();


-- ----------------------------------------------------------------------------
-- 5. Every night: what time and closing erased
-- ----------------------------------------------------------------------------

create function servicio.forget_cards()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n     integer;
  v_total integer := 0;
begin
  -- Her days passed with no stamp (G15): those stamps are erased.
  delete from servicio.loyalty_card c
   using servicio.card_terms t
   where t.id = c.terms_id and t.expiry_days is not null
     and c.last_stamp_at + make_interval(days => t.expiry_days) <= now();
  get diagnostics v_n = row_count;
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
  '(G15), and 30 days after a kitchen closed its card the cards going there and the '
  'rewards nobody claimed (G12); and the misses older than a day. Run by pg_cron (the job '
  'forget-cards); granted to nobody. Returns how many cards and rewards it deleted. The '
  'reads already show none of them past their moment, so the job running late shows '
  'nothing older. 0085, plan 10.9e-i.';

-- 09:21 UTC is 03:21 in Mexico City, two minutes after `0084`'s job. A named
-- schedule replaces a job of that name, so a second run schedules nothing twice.
select cron.schedule('forget-cards', '21 9 * * *', 'select servicio.forget_cards()');


-- ----------------------------------------------------------------------------
-- 6. The kitchen's side
-- ----------------------------------------------------------------------------

-- *Activar* and *Guardar* on the card's setup (G7, G34): the reward, the stamps
-- and the days, nothing pre-chosen — so `p_expiry_days` is required, 0 meaning
-- *Nunca*. The owner's (G18). Saving the terms the card already has changes
-- nothing (a retry); anything else is a new version, which only new cards take
-- (G12), and opens a closed card again. Turns her choice of the card `on`.
-- Answers `kitchen_card`.
create function public.set_card_terms(
  p_workspace_id uuid,
  p_reward       text,
  p_stamps       integer,
  p_expiry_days  integer
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
  v_cur    servicio.card_terms%rowtype;
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
  if p_expiry_days is null or p_expiry_days not in (0, 15, 30, 45, 60) then
    raise exception 'set_card_terms: the days are 0 (Nunca), 15, 30, 45 or 60' using errcode = '22023';
  end if;
  v_days := nullif(p_expiry_days, 0);

  select * into v_cur from servicio.card_terms t
   where t.workspace_id = p_workspace_id and t.replaced_at is null
     for update;

  if not (found and v_cur.closed_at is null and v_cur.reward = v_reward
          and v_cur.stamps = p_stamps and v_cur.expiry_days is not distinct from v_days) then
    -- Opened again more than 30 days after it closed: what the closing ended stays
    -- ended, whether or not the nightly job has run yet (the review of 10.9e-i).
    if v_cur.closed_at is not null and v_cur.closed_at <= now() - interval '30 days' then
      delete from servicio.loyalty_card c where c.workspace_id = p_workspace_id;
      delete from servicio.card_reward r where r.workspace_id = p_workspace_id and r.claimed_at is null;
    end if;
    update servicio.card_terms t set replaced_at = now() where t.id = v_cur.id;
    insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, created_by)
    values (p_workspace_id, v_reward, p_stamps, v_days, v_user);
  end if;

  insert into servicio.kitchen_feature as f (workspace_id, feature, state)
  values (p_workspace_id, 'tarjeta', 'on')
  on conflict (workspace_id, feature) do update
     set state = 'on',
         changed_at = case when f.state = 'on' then f.changed_at else now() end;

  return public.kitchen_card(p_workspace_id);
end;
$$;

comment on function public.set_card_terms(uuid, text, integer, integer) is
  'Activar / Guardar on the loyalty card''s setup (G7, G34): the reward (1 to 60 '
  'characters, trimmed), 4 to 12 stamps, and the days without a stamp after which hers '
  'are erased — 0 (Nunca), 15, 30, 45 or 60, required (nothing pre-chosen). The owner''s '
  '(G18). The same terms again change nothing; other terms are a new version that only new '
  'cards take (G12), and reopen a closed card. Turns her choice of tarjeta on. Answers '
  'kitchen_card. 42501 signed out or not the owner, TD013 a shop, TD024 Wera''s switch '
  'off, 22023 a term out of range. 0085, plan 10.9e-i.';


-- *Cerrar la tarjeta* (G12): nobody starts a new one; those started finish and
-- redeem for 30 days. The owner's. Turns her choice of the card `off` — the
-- trigger closes it, so *Lo que usas* and this are one rule. Closing again, or
-- with no card set up, changes nothing. Answers `kitchen_card`.
create function public.close_card(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.workspace_kind;
begin
  if auth.uid() is null then
    raise exception 'close_card requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'owner') then
    raise exception 'close_card: only the kitchen''s owner closes its card' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'close_card: only a kitchen has a loyalty card' using errcode = 'TD013';
  end if;

  insert into servicio.kitchen_feature as f (workspace_id, feature, state)
  values (p_workspace_id, 'tarjeta', 'off')
  on conflict (workspace_id, feature) do update
     set state = 'off',
         changed_at = case when f.state = 'off' then f.changed_at else now() end;

  -- The trigger closes it when the choice changes; this closes it when the choice
  -- was already off and the card open (a card can only be open with it on, so this
  -- is belt and braces, and a retry is nothing).
  update servicio.card_terms t
     set closed_at = now()
   where t.workspace_id = p_workspace_id and t.replaced_at is null and t.closed_at is null;

  return public.kitchen_card(p_workspace_id);
end;
$$;

comment on function public.close_card(uuid) is
  'Cerrar la tarjeta (G12): no new cards; those started finish and redeem for 30 days. The '
  'owner''s. Turns her choice of tarjeta off (which, from Lo que usas, closes it the same '
  'way). Again, or with nothing set up, changes nothing. Answers kitchen_card. 42501 '
  'signed out or not the owner, TD013 a shop. 0085, plan 10.9e-i.';


-- The card's screen, *Hoy*'s tile and *Sellar*'s lines — any member (G18: a
-- helper stamps). The current terms (open or closed), how many cards are going,
-- the stamps today, the rewards to give, and today's lines newest first: each
-- stamp (*Ana R. · sello 3 de 8*, *completó su tarjeta*) and each reward claimed.
-- Names only of those stamped or rewarded today, in the kitchen's zone.
create function public.kitchen_card(p_workspace_id uuid)
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
               'expiry_days', v_cur.expiry_days, 'since', v_cur.created_at) end,
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
  '{terms: {reward, stamps, expiry_days, since} or null — the current version, open or '
  'closed; open; closed_at; kept_until (30 days after closing); cards (going, not past '
  'their days); stamps_today; rewards_to_give; today: [{at, kind (sello, gano, cobro), '
  'name (Ana R., neighbour_name — null once her account is gone), stamps, of, reward, '
  'via}] newest first, the kitchen''s day}. Never who holds a card, never who gave a stamp. '
  '42501 signed out or not one of hers, TD013 a shop. 0085, plan 10.9e-i.';


-- *Sellar*'s code on this phone: a new secret for this member at this kitchen,
-- handed to the phone once, which works the code out every minute with no signal
-- (G16, G19). Any active member. A member's fourth phone drops her oldest.
create function public.register_kitchen_key(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.workspace_member.user_id%type := auth.uid();
  v_kind public.workspace_kind;
  v_key  servicio.kitchen_key%rowtype;
begin
  if v_user is null then
    raise exception 'register_kitchen_key requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'register_kitchen_key: that kitchen is not one of yours' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'register_kitchen_key: only a kitchen has a loyalty card' using errcode = 'TD013';
  end if;

  insert into servicio.kitchen_key (workspace_id, user_id, secret)
  values (p_workspace_id, v_user, extensions.gen_random_bytes(20))
  returning * into v_key;

  delete from servicio.kitchen_key k
   where k.id in (select o.id from servicio.kitchen_key o
                   where o.workspace_id = p_workspace_id and o.user_id = v_user
                   order by o.created_at desc, o.id desc
                  offset 3);

  return jsonb_build_object('key', v_key.id, 'secret', encode(v_key.secret, 'hex'));
end;
$$;

comment on function public.register_kitchen_key(uuid) is
  'A phone''s Sellar code at a kitchen (G16, G19): a new 20-byte secret for this member, '
  'answered once as {key, secret (40 hex characters)} — the phone works out the code '
  'every minute from it, with no signal (RFC 6238, 60 seconds, six digits). Any active '
  'member; at most three per member per kitchen, the oldest dropped. 42501 signed out or '
  'not one of hers, TD013 a shop. 0085, plan 10.9e-i.';


-- The kitchen scans her code — or types its six digits (G16) — and sees whose it
-- is and her card there: *Ana R. · 5 de 8 · 2 premios*. Any member. Writes
-- nothing but a miss. The scan's moment is now: a phone with no signal cannot
-- ask, and sends `give_stamp` from its queue instead.
create function public.card_of_code(
  p_workspace_id uuid,
  p_code         text,
  p_key          uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_kind public.workspace_kind;
  v_code text := servicio.code_digits(p_code);
  v_fits integer;
  v_her  uuid;
begin
  if v_user is null then
    raise exception 'card_of_code requires an authenticated caller' using errcode = '42501';
  end if;
  perform servicio.refuse_read_only();
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'card_of_code: that kitchen is not one of yours' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'card_of_code: only a kitchen has a loyalty card' using errcode = 'TD013';
  end if;
  if not servicio.card_switched_on() then
    raise exception 'card_of_code: the loyalty card is not offered yet' using errcode = 'TD024';
  end if;
  if v_code is null then
    raise exception 'card_of_code: a code is six digits' using errcode = '22023';
  end if;
  perform servicio.code_tries_left(v_user);

  select o.o_fits, o.o_user into v_fits, v_her from servicio.neighbour_code_owner(v_code, now(), p_key) o;
  if v_fits = 0 then
    insert into servicio.code_miss (user_id) values (v_user);
    return jsonb_build_object('result', 'no_valido');
  elsif v_fits > 1 then
    return jsonb_build_object('result', 'repite');
  end if;
  if exists (select 1 from public.workspace_member wm
              where wm.workspace_id = p_workspace_id and wm.user_id = v_her and wm.is_active) then
    return jsonb_build_object('result', 'propia');
  end if;

  return jsonb_build_object('result', 'suya', 'name', public.neighbour_name(v_her))
         || servicio.card_state(p_workspace_id, v_her);
end;
$$;

comment on function public.card_of_code(uuid, text, uuid) is
  'The kitchen scans a neighbour''s code (Mi código) or types its six digits: {result: '
  'suya, name (Ana R.), and her card there as servicio.card_state reads it}, or {result: '
  'no_valido | repite | propia}. p_key is the phone''s key from her QR (null when typed: '
  'every phone is tried). Any active member. Writes nothing but a miss. 42501, TD013, '
  'TD024 (Wera''s switch off), 22023 (not six digits), TD028 (twenty misses in ten '
  'minutes). 0085, plan 10.9e-i.';


-- *Dar sello* after scanning her code (G5, G6): the stamp, whoever she is to the
-- kitchen — a reservation or a walk-in. Any member. `p_at` is the scan's moment
-- on the phone — sent later from its queue with no signal — kept between 7 days
-- back and now, and her code is checked at that moment.
create function public.give_stamp(
  p_workspace_id uuid,
  p_code         text,
  p_key          uuid default null,
  p_at           timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_kind   public.workspace_kind;
  v_code   text := servicio.code_digits(p_code);
  v_at     timestamptz := least(coalesce(p_at, now()), now());
  v_fits   integer;
  v_her    uuid;
  v_result text;
begin
  if v_user is null then
    raise exception 'give_stamp requires an authenticated caller' using errcode = '42501';
  end if;
  perform servicio.refuse_read_only();
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'give_stamp: that kitchen is not one of yours' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'give_stamp: only a kitchen has a loyalty card' using errcode = 'TD013';
  end if;
  if not servicio.card_switched_on() then
    raise exception 'give_stamp: the loyalty card is not offered yet' using errcode = 'TD024';
  end if;
  if v_code is null then
    raise exception 'give_stamp: a code is six digits' using errcode = '22023';
  end if;
  if v_at < now() - interval '7 days' then
    raise exception 'give_stamp: a scan more than 7 days old' using errcode = '22023';
  end if;
  perform servicio.code_tries_left(v_user);

  select o.o_fits, o.o_user into v_fits, v_her from servicio.neighbour_code_owner(v_code, v_at, p_key) o;
  if v_fits = 0 then
    insert into servicio.code_miss (user_id) values (v_user);
    return jsonb_build_object('result', 'no_valido');
  elsif v_fits > 1 then
    return jsonb_build_object('result', 'repite');
  end if;

  v_result := servicio.give_card_stamp(p_workspace_id, v_her, v_at, v_user, 'su_codigo', null);
  if v_result = 'propia' then
    return jsonb_build_object('result', 'propia');
  end if;
  return jsonb_build_object('result', v_result, 'name', public.neighbour_name(v_her))
         || servicio.card_state(p_workspace_id, v_her);
end;
$$;

comment on function public.give_stamp(uuid, text, uuid, timestamptz) is
  'Dar sello: the kitchen stamps the neighbour whose code it scanned (G5, G6, G16). Any '
  'active member, recorded as who gave it (G19). p_at is the scan''s moment on the phone '
  '(its queue, with no signal), kept between 7 days back and now; her code is checked '
  'then. {result: primer | sello | gano | ya_hoy | cerrada, name, and her card} or '
  '{result: no_valido | repite | propia}. 42501, TD013, TD024, 22023 (not six digits, or '
  'older than 7 days), TD028. 0085, plan 10.9e-i.';


-- *Entregar premio* (G11, round 3): after scanning her code the kitchen picks
-- which of her rewards it gives — or her code says which, when she chose it in
-- *Cobrar* (*Cobras: …*). Any member. `p_at` as `give_stamp`'s. A reward claimed
-- already answers `ya_cobrado`, so a retry from the queue is harmless.
create function public.give_reward(
  p_workspace_id uuid,
  p_code         text,
  p_reward_id    uuid,
  p_key          uuid default null,
  p_at           timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.workspace_member.user_id%type := auth.uid();
  v_kind public.workspace_kind;
  v_code text := servicio.code_digits(p_code);
  v_at   timestamptz := least(coalesce(p_at, now()), now());
  v_fits integer;
  v_her  uuid;
  v_key  uuid;
  v_min  bigint;
  v_r    servicio.card_reward%rowtype;
begin
  if v_user is null then
    raise exception 'give_reward requires an authenticated caller' using errcode = '42501';
  end if;
  perform servicio.refuse_read_only();
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'give_reward: that kitchen is not one of yours' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'give_reward: only a kitchen has a loyalty card' using errcode = 'TD013';
  end if;
  if not servicio.card_switched_on() then
    raise exception 'give_reward: the loyalty card is not offered yet' using errcode = 'TD024';
  end if;
  if v_code is null then
    raise exception 'give_reward: a code is six digits' using errcode = '22023';
  end if;
  if v_at < now() - interval '7 days' then
    raise exception 'give_reward: a scan more than 7 days old' using errcode = '22023';
  end if;
  perform servicio.code_tries_left(v_user);

  select o.o_fits, o.o_user, o.o_key, o.o_minute into v_fits, v_her, v_key, v_min
    from servicio.neighbour_code_owner(v_code, v_at, p_key) o;
  if v_fits = 0 then
    insert into servicio.code_miss (user_id) values (v_user);
    return jsonb_build_object('result', 'no_valido');
  elsif v_fits > 1 then
    return jsonb_build_object('result', 'repite');
  end if;
  if exists (select 1 from public.workspace_member wm
              where wm.workspace_id = p_workspace_id and wm.user_id = v_her and wm.is_active) then
    return jsonb_build_object('result', 'propia');
  end if;

  select * into v_r from servicio.card_reward r
   where r.id = p_reward_id and r.workspace_id = p_workspace_id and r.user_id = v_her
     for update;
  if not found then
    raise exception 'give_reward: that is not a reward of hers here' using errcode = 'TD027';
  end if;

  if v_r.claimed_at is not null then
    return jsonb_build_object('result', 'ya_cobrado', 'name', public.neighbour_name(v_her), 'claimed', v_r.reward)
           || servicio.card_state(p_workspace_id, v_her);
  end if;
  if servicio.card_kept_until(p_workspace_id) <= now() then
    return jsonb_build_object('result', 'cerrada', 'name', public.neighbour_name(v_her))
           || servicio.card_state(p_workspace_id, v_her);
  end if;

  -- One reward a scan: this minute of her code gives no second one.
  insert into servicio.code_used (key_id, minute) values (v_key, v_min) on conflict do nothing;
  if not found then
    return jsonb_build_object('result', 'ya_usado', 'name', public.neighbour_name(v_her))
           || servicio.card_state(p_workspace_id, v_her);
  end if;

  update servicio.card_reward r
     set claimed_at = v_at, claimed_by = v_user, claimed_via = 'su_codigo'
   where r.id = v_r.id;

  return jsonb_build_object('result', 'cobrado', 'name', public.neighbour_name(v_her), 'claimed', v_r.reward)
         || servicio.card_state(p_workspace_id, v_her);
end;
$$;

comment on function public.give_reward(uuid, text, uuid, uuid, timestamptz) is
  'Entregar premio: the kitchen gives the neighbour whose code it scanned one of her '
  'rewards — the one it picked, or the one her code names (G11, round 3: she chooses). Any '
  'active member, recorded as who gave it (G19). p_at as give_stamp''s. {result: cobrado | '
  'ya_cobrado | ya_usado (that minute of her code gave a reward already) | cerrada, name, claimed '
  '(the reward''s text), and her card} or {result: no_valido | repite | propia}. One reward a '
  'scan; 25006 in a read-only call. TD027 not a reward of hers at that kitchen; 42501, '
  'TD013, TD024, 22023, TD028 as give_stamp. 0085, plan 10.9e-i.';


-- ----------------------------------------------------------------------------
-- 7. Her side
-- ----------------------------------------------------------------------------

-- *Mi código* on this phone: a new secret for her, handed to the phone once (G10,
-- G16). Anyone signed in — her login is one across the three apps. Her fourth
-- phone drops her oldest.
create function public.register_my_key()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_key  servicio.neighbour_key%rowtype;
begin
  if v_user is null then
    raise exception 'register_my_key requires an authenticated caller' using errcode = '42501';
  end if;

  insert into servicio.neighbour_key (user_id, secret)
  values (v_user, extensions.gen_random_bytes(20))
  returning * into v_key;

  delete from servicio.neighbour_key k
   where k.id in (select o.id from servicio.neighbour_key o
                   where o.user_id = v_user
                   order by o.created_at desc, o.id desc
                  offset 3);

  return jsonb_build_object('key', v_key.id, 'secret', encode(v_key.secret, 'hex'));
end;
$$;

comment on function public.register_my_key() is
  'Mi código on this phone (G10, G16): a new 20-byte secret for the caller, answered once '
  'as {key, secret (40 hex characters)} — the phone works out her code every minute from '
  'it (RFC 6238, 60 seconds, six digits). At most three per person, the oldest dropped. '
  'Keyed on auth.uid(). 42501 signed out. 0085, plan 10.9e-i.';


-- Her cards: every kitchen where she has a card going or a reward to claim, with
-- what *Mis cocinas*, her card in the kitchen's colour and logo (G41) and the mark
-- in *Cerca* (G38) draw. Most recent first.
create function public.my_cards()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'my_cards requires an authenticated caller' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(x.card order by x.last desc, x.id), '[]'::jsonb)
      from (select w.id,
                   greatest((select c.last_stamp_at from servicio.loyalty_card c
                              where c.user_id = v_user and c.workspace_id = w.id),
                            (select max(r.won_at) from servicio.card_reward r
                              where r.user_id = v_user and r.workspace_id = w.id and r.claimed_at is null)) as last,
                   jsonb_build_object(
                     'id', w.id,
                     'name', w.display_name,
                     'colonia', (select loc.colonia from public.location loc
                                  where loc.workspace_id = w.id and loc.is_active
                                  order by loc.created_at, loc.id limit 1),
                     'page', (select jsonb_build_object('color', p.color, 'logo_path', p.logo_path)
                                from public.kitchen_page p where p.workspace_id = w.id))
                   || servicio.card_state(w.id, v_user) as card
              from public.workspace w
             where w.kind = 'cocina' and w.is_active
               and w.id in (select c.workspace_id from servicio.loyalty_card c where c.user_id = v_user
                            union
                            select r.workspace_id from servicio.card_reward r
                             where r.user_id = v_user and r.claimed_at is null)) x
     where (x.card ->> 'stamps')::integer > 0 or jsonb_array_length(x.card -> 'rewards') > 0
  );
end;
$$;

comment on function public.my_cards() is
  'The caller''s loyalty cards: [{id, name, colonia, page: {color, logo_path} or null, and '
  'her card there as servicio.card_state reads it}] for every kitchen in Itacate where she '
  'has stamps going or a reward to claim — most recent first. Keyed on auth.uid(); nobody '
  'else''s. 42501 signed out. 0085, plan 10.9e-i.';


-- She scans the kitchen's code on *Sellar* — or types its six digits — and gets
-- her stamp (G10, G16), given by the member whose phone showed it (G19). Her phone
-- needs signal; the kitchen's does not. `p_workspace_id` narrows a typed code to
-- the kitchen she is at. Answers the kitchen and her card there.
create function public.stamp_with_code(
  p_code         text,
  p_workspace_id uuid default null,
  p_key          uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_code    text := servicio.code_digits(p_code);
  v_fits    integer;
  v_kitchen uuid;
  v_member  uuid;
  v_result  text;
begin
  if v_user is null then
    raise exception 'stamp_with_code requires an authenticated caller' using errcode = '42501';
  end if;
  perform servicio.refuse_read_only();
  if not servicio.card_switched_on() then
    raise exception 'stamp_with_code: the loyalty card is not offered yet' using errcode = 'TD024';
  end if;
  if v_code is null then
    raise exception 'stamp_with_code: a code is six digits' using errcode = '22023';
  end if;
  perform servicio.code_tries_left(v_user);

  select o.o_fits, o.o_kitchen, o.o_member into v_fits, v_kitchen, v_member
    from servicio.kitchen_code_owner(v_code, now(), p_workspace_id, p_key) o;
  if v_fits = 0 then
    insert into servicio.code_miss (user_id) values (v_user);
    return jsonb_build_object('result', 'no_valido');
  elsif v_fits > 1 then
    return jsonb_build_object('result', 'repite');
  end if;

  v_result := servicio.give_card_stamp(v_kitchen, v_user, now(), v_member, 'codigo_cocina', null);
  return jsonb_build_object('result', v_result,
                            'kitchen', (select jsonb_build_object('id', w.id, 'name', w.display_name)
                                          from public.workspace w where w.id = v_kitchen))
         || case when v_result = 'propia' then '{}'::jsonb else servicio.card_state(v_kitchen, v_user) end;
end;
$$;

comment on function public.stamp_with_code(text, uuid, uuid) is
  'Escanear: the caller scans a kitchen''s Sellar code, or types its six digits, and gets '
  'her stamp there (G10, G16), given by the member whose phone showed it (G19). '
  'p_workspace_id narrows a typed code to the kitchen she is at; p_key is the phone''s key '
  'from its QR. {result: primer | sello | gano | ya_hoy | cerrada | propia, kitchen: {id, '
  'name}, and her card there} or {result: no_valido | repite}. 42501, TD024, 22023, TD028. '
  'Keyed on auth.uid(). 0085, plan 10.9e-i.';


-- She claims a reward by scanning the kitchen's code (G11): the reward she chose
-- (round 3), given by the member whose phone showed it. Only that kitchen's
-- phones are tried. A reward claimed already answers `ya_cobrado`.
create function public.claim_with_code(
  p_reward_id uuid,
  p_code      text,
  p_key       uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_code   text := servicio.code_digits(p_code);
  v_r      servicio.card_reward%rowtype;
  v_fits   integer;
  v_member uuid;
  v_kitchen jsonb;
begin
  if v_user is null then
    raise exception 'claim_with_code requires an authenticated caller' using errcode = '42501';
  end if;
  perform servicio.refuse_read_only();
  if not servicio.card_switched_on() then
    raise exception 'claim_with_code: the loyalty card is not offered yet' using errcode = 'TD024';
  end if;
  if v_code is null then
    raise exception 'claim_with_code: a code is six digits' using errcode = '22023';
  end if;

  select * into v_r from servicio.card_reward r
   where r.id = p_reward_id and r.user_id = v_user
     for update;
  if not found then
    raise exception 'claim_with_code: that is not a reward of yours' using errcode = 'TD027';
  end if;
  v_kitchen := (select jsonb_build_object('id', w.id, 'name', w.display_name)
                  from public.workspace w where w.id = v_r.workspace_id);

  if v_r.claimed_at is not null then
    return jsonb_build_object('result', 'ya_cobrado', 'kitchen', v_kitchen, 'claimed', v_r.reward)
           || servicio.card_state(v_r.workspace_id, v_user);
  end if;
  perform servicio.code_tries_left(v_user);

  select o.o_fits, o.o_member into v_fits, v_member
    from servicio.kitchen_code_owner(v_code, now(), v_r.workspace_id, p_key) o;
  if v_fits = 0 then
    insert into servicio.code_miss (user_id) values (v_user);
    return jsonb_build_object('result', 'no_valido');
  elsif v_fits > 1 then
    return jsonb_build_object('result', 'repite');
  end if;
  if servicio.card_kept_until(v_r.workspace_id) <= now() then
    return jsonb_build_object('result', 'cerrada', 'kitchen', v_kitchen)
           || servicio.card_state(v_r.workspace_id, v_user);
  end if;

  update servicio.card_reward r
     set claimed_at = now(), claimed_by = v_member, claimed_via = 'codigo_cocina'
   where r.id = v_r.id;

  return jsonb_build_object('result', 'cobrado', 'kitchen', v_kitchen, 'claimed', v_r.reward)
         || servicio.card_state(v_r.workspace_id, v_user);
end;
$$;

comment on function public.claim_with_code(uuid, text, uuid) is
  'Cobrar: the caller claims one of her rewards — the one she chose (round 3) — by scanning '
  'its kitchen''s Sellar code or typing its six digits (G11); only that kitchen''s phones '
  'are tried, and the member whose phone it was gave it (G19). {result: cobrado | '
  'ya_cobrado | cerrada, kitchen: {id, name}, claimed, and her card there} or {result: '
  'no_valido | repite}. TD027 not a reward of hers; 42501, TD024, 22023, TD028. Keyed on '
  'auth.uid(). 0085, plan 10.9e-i.';


-- ----------------------------------------------------------------------------
-- 8. The door, re-made: `0081`'s body with one key more
-- ----------------------------------------------------------------------------
-- `card` — a kitchen's current terms while its card is open and Wera has the
-- card switched on: the invitation on its page and the conditions before her
-- first stamp (G12), beside the name and address the door already sends (G41).
-- NULL for every kitchen today, the switch being off. ADR-035 §2.7: what she
-- reads of a kitchen's services comes through this one door. Every other key as
-- `0081`.

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
             -- 0085: her loyalty card's current terms while it is open and Wera has the
             -- card switched on — what a neighbour starts on before her first stamp
             -- (G12); the name and address above are who promises it (G41). NULL else.
             'card', (select jsonb_build_object('reward', t.reward, 'stamps', t.stamps,
                                                'expiry_days', t.expiry_days)
                        from servicio.card_terms t
                       where t.workspace_id = k.id and t.replaced_at is null and t.closed_at is null
                         and servicio.card_switched_on()),
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
  'her numbers. Since 0085, card: the loyalty card''s current terms {reward, stamps, '
  'expiry_days} while it is open and Wera has it switched on, else null. 0078, 0079, 0080, '
  '0081 and 0085, plans 10.5-i-b-i, 10.5b-i, 10.5b-ii-b, 10.9a-i and 10.9e-i.';


-- ----------------------------------------------------------------------------
-- 9. Her account deleted: her card goes with it
-- ----------------------------------------------------------------------------
-- `0084`'s body, statement for statement, with seven statements after her
-- follows'. Its signature, its refusals and its answer are unchanged.

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

  -- New in 0084: her follows and their bells, and the kitchens she followed that
  -- left. After the purge above, so her own kitchen's leaving — when it went with
  -- her account and she followed it — leaves nothing of hers behind either.
  delete from servicio.follow f where f.user_id = v_user;
  delete from servicio.kitchen_gone g where g.user_id = v_user;

  -- New in 0085: her loyalty cards, the rewards she had still to claim, her
  -- phones' secrets — hers and, as a member, at every kitchen (the membership
  -- trigger took those of the memberships ended above; this takes the rest) — and
  -- her misses. Her stamps and the rewards she claimed stay, pointing to nobody:
  -- the visits a kitchen counts, as her reservations stay (0079).
  delete from servicio.loyalty_card c where c.user_id = v_user;
  delete from servicio.card_reward r where r.user_id = v_user and r.claimed_at is null;
  update servicio.card_reward r set user_id = null where r.user_id = v_user;
  update servicio.card_stamp s set user_id = null where s.user_id = v_user;
  delete from servicio.neighbour_key k where k.user_id = v_user;
  delete from servicio.kitchen_key k where k.user_id = v_user;
  delete from servicio.code_miss m where m.user_id = v_user;

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
  '2026-10-29; 0079, plan 10.5b-i, his ruling of 2026-11-10; 0080, plan 10.5b-ii-b; '
  'since 0084 her follows, her bells and the kitchens she followed that left go too '
  '(plan 10.9d-i); since 0085 her loyalty cards, her rewards still to claim, her '
  'phones'' secrets and her misses, and her stamps and claimed rewards stay pointing to '
  'nobody (plan 10.9e-i).';


-- ----------------------------------------------------------------------------
-- 10. Who may call what
-- ----------------------------------------------------------------------------
-- The internal functions: granted to nobody.
revoke all on function servicio.hotp(bytea, bigint)                                     from public, anon, authenticated;
revoke all on function servicio.code_minute(timestamptz)                                from public, anon, authenticated;
revoke all on function servicio.code_fits(bytea, text, timestamptz)                     from public, anon, authenticated;
revoke all on function servicio.code_digits(text)                                       from public, anon, authenticated;
revoke all on function servicio.code_tries_left(uuid)                                   from public, anon, authenticated;
revoke all on function servicio.refuse_read_only()                                      from public, anon, authenticated;
revoke all on function servicio.kitchen_code_owner(text, timestamptz, uuid, uuid)       from public, anon, authenticated;
revoke all on function servicio.neighbour_code_owner(text, timestamptz, uuid)           from public, anon, authenticated;
revoke all on function servicio.kitchen_zone(uuid)                                      from public, anon, authenticated;
revoke all on function servicio.card_switched_on()                                      from public, anon, authenticated;
revoke all on function servicio.card_kept_until(uuid)                                   from public, anon, authenticated;
revoke all on function servicio.card_state(uuid, uuid)                                  from public, anon, authenticated;
revoke all on function servicio.give_card_stamp(uuid, uuid, timestamptz, uuid, text, uuid) from public, anon, authenticated;
revoke all on function servicio.stamp_on_handover()                                     from public, anon, authenticated;
revoke all on function servicio.forget_member_keys()                                    from public, anon, authenticated;
revoke all on function servicio.card_closes_with_feature()                              from public, anon, authenticated;
revoke all on function servicio.forget_cards()                                          from public, anon, authenticated;

-- The eleven a phone calls: each named in `supabase/pgtap/_walls.sql`'s list in
-- this pull request. The door keeps its grants (`create or replace`).
revoke all on function public.set_card_terms(uuid, text, integer, integer)            from public, anon;
revoke all on function public.close_card(uuid)                                        from public, anon;
revoke all on function public.kitchen_card(uuid)                                      from public, anon;
revoke all on function public.register_kitchen_key(uuid)                              from public, anon;
revoke all on function public.card_of_code(uuid, text, uuid)                          from public, anon;
revoke all on function public.give_stamp(uuid, text, uuid, timestamptz)               from public, anon;
revoke all on function public.give_reward(uuid, text, uuid, uuid, timestamptz)        from public, anon;
revoke all on function public.register_my_key()                                       from public, anon;
revoke all on function public.my_cards()                                              from public, anon;
revoke all on function public.stamp_with_code(text, uuid, uuid)                       from public, anon;
revoke all on function public.claim_with_code(uuid, text, uuid)                       from public, anon;
grant execute on function public.set_card_terms(uuid, text, integer, integer)         to authenticated;
grant execute on function public.close_card(uuid)                                     to authenticated;
grant execute on function public.kitchen_card(uuid)                                   to authenticated;
grant execute on function public.register_kitchen_key(uuid)                           to authenticated;
grant execute on function public.card_of_code(uuid, text, uuid)                       to authenticated;
grant execute on function public.give_stamp(uuid, text, uuid, timestamptz)            to authenticated;
grant execute on function public.give_reward(uuid, text, uuid, uuid, timestamptz)     to authenticated;
grant execute on function public.register_my_key()                                    to authenticated;
grant execute on function public.my_cards()                                           to authenticated;
grant execute on function public.stamp_with_code(text, uuid, uuid)                    to authenticated;
grant execute on function public.claim_with_code(uuid, text, uuid)                    to authenticated;
