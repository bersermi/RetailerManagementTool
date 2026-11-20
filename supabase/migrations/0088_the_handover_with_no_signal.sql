-- ============================================================================
-- 0088 — the handover with no signal: a sealed ticket, the kitchen's secret,
--        and *Ya lo tengo* sent with its minute
-- ============================================================================
-- docs/PLAN.md task `10.9j-ii-a` — the database half of `10.9j-ii` (split on
-- size 2026-11-20: this and Itacate; Wera Cocina's half, `10.9j-ii-b`). The
-- owner's rulings of 2026-11-20 (*"yes to all"*, J1–J4, each as recommended,
-- on the drawing of `10.9j-i`; the plan's status entry of that morning) — his
-- D4 of 2026-11-19: *"We need to enable both parties to do redeem offline."*
--
--   J1  Itacate keeps her reservations on her phone, so her ticket opens with no
--       signal — the app's half; nothing here.
--   J2  a QR on her ticket, SEALED BY THE DATABASE WITH HER KITCHEN'S SECRET,
--       which the fonda's phone checks with no signal and hands over by id from
--       its queue — WITHOUT HER NAME; one secret per kitchen in `servicio`,
--       renewed when a member leaves, handed to every member's phone.
--   J3  no unchecked handover of a typed code — the apps' half; nothing here.
--   J4  *Ya lo tengo* with no signal kept and sent with its minute:
--       `confirm_my_pickup` gains a defaulted moment, accepted when that minute
--       is within a day of her window.
--
-- WHAT IS HERE:
--   1. `servicio.kitchen_seal_key` — each kitchen's secret, by version. One
--      current; a version retired when a member stops working there (she leaves,
--      the owner removes her, her account goes) stays a day for the tickets
--      already sealed with it, then goes. Every kitchen that exists is given its
--      first now, and every kitchen made later at its making.
--   2. `servicio.reservation_seal` — a reservation's seal: the QR's text — with
--      `servicio.seal_text` and `servicio.seal_name`, the dish's name as printable
--      ASCII, at most 120 characters of it. Granted to nobody; read by
--      `reserve_plate` and `my_reservations`.
--   3. `public.kitchen_seal_keys` — the kitchen's current secret and any retired
--      in the last day, handed to the phone of anyone who works there (every role
--      hands over, the owner's question 3 of 2026-10-28). Wera Cocina keeps them
--      until *Cerrar sesión* (`10.9j-ii-b`).
--   4. RE-CREATED, EACH SIGNATURE UNCHANGED: `reserve_plate` answers the seal
--      beside its id and code; `my_reservations` sends each one still to collect
--      with its seal (`seal`, NULL for the rest).
--   5. `confirm_my_pickup` DROPPED AND RE-CREATED with `p_at` defaulted (ADR-035
--      §2.2's way, as `0064`): a call with `p_id` alone is answered as before.
--
-- ⚠️ THE SEAL — WHAT THE FONDA'S PHONE CAN TRUST WITH NO SIGNAL. One line of text,
-- fields joined by `|`, in this order (the QR carries exactly this):
--
--     s1 | reservation id | kitchen id | key version | code | her hour |
--     payment | eat | quantity | unit price | container price | surprise |
--     dish name | MAC
--
--   * `s1` — this shape. A later shape is a new first field, never a change to this one.
--   * the two ids as 32 hexadecimal characters, no hyphens (a shorter QR);
--   * her hour as whole seconds since 1970 (UTC), the code as its three digits;
--   * payment and eat in the database's own words (`efectivo`, `tarjeta`,
--     `transferencia`; `llevar`, `aqui`) — no second spelling for a phone to keep;
--   * quantity and the two prices as the decimal text `my_reservations` sends
--     (`1.000`, `85.00`; the container price empty when there is none), surprise
--     `1` or `0`;
--   * the dish's name LAST BEFORE THE MAC, PERCENT-ENCODED (`servicio.seal_text`):
--     its UTF-8 bytes, each printable ASCII byte as itself but `%` and `|`, every
--     other byte as `%` and two upper-case hexadecimal digits — *piña* is
--     `pi%C3%B1a`, a `|` is `%7C` — which `decodeURIComponent` reads back; AND AT
--     MOST 120 CHARACTERS OF IT ENCODED (`servicio.seal_name`), cut after a whole
--     character, never inside one: a name is up to 80 characters (`0072`) and an
--     emoji is twelve encoded, so an uncut seal could reach 1,100 characters — a QR
--     no camera reads across a counter. A usual name (*Pozole rojo con tostadas*)
--     goes whole; the full name reaches the fonda's phone with the signal, as her
--     neighbour's name does;
--   * the MAC: HMAC-SHA1 (`0085`'s arithmetic, already in both apps) of everything
--     before the last `|`, keyed with that version of the kitchen's secret, its
--     first 10 bytes (80 bits — RFC 2104 §5's floor for a truncated MAC) as 20
--     lowercase hexadecimal characters.
--
--   ⚠️ SO THE WHOLE SEAL IS PRINTABLE ASCII, and it is so on purpose: the QR is drawn
--   by `qrcode-generator` (both apps' `@/lib/qr`), which writes each character as ONE
--   byte (Latin-1) — an em dash or a 🌮 in a dish's name would be mangled — and read by
--   the phone's camera, which guesses a byte's encoding. Printable ASCII is the one text
--   every writer and reader agrees on, so the text the fonda's phone scans is, byte for
--   byte, the text the database signed; and no `|` is left in the name, so a phone
--   splits fourteen fields (it still takes the MAC after the LAST `|`).
--
--   Change one character — the price, the dish, the kitchen, the hour — and the MAC
--   no longer fits. NEVER HER NAME, HER ID OR HER SCORE (J2): the fonda's phone sees
--   *Ana R.* and her percentage when the signal returns, as today. The seal is worked
--   out when it is read, from the reservation as it stands and the kitchen's current
--   secret, so it follows a renewed secret at her next read; nothing new is stored on
--   a reservation.
--
-- ⚠️ THE LIMITS, AS THE DRAWING SAID THEM (its *Limits that stay*):
--   * a real ticket shown at two of the kitchen's phones with no signal passes on
--     both; the database keeps the first handover (`hand_over_reservation`, `0079`);
--   * a screenshot of a ticket she later cancelled passes with no signal, and is
--     recorded as handed over — *Entregar* is always recorded (ruled 2026-11-10);
--   * anyone who works at the kitchen holds its secret and could seal a ticket for
--     it — one that works only there, where she hands food over already. A member
--     who stops working there takes a copy that works at most a day more: the
--     version is retired, phones keep it a day for tickets already sealed (`until`),
--     and then it goes from the database too.
--
-- THE REFUSALS (custom SQLSTATEs reach PostgREST as a 400): none new.
--   `kitchen_seal_keys`: 42501 signed out or not one of hers, TD013 a shop.
--   `confirm_my_pickup`: TD018 keeps its meaning — now read at her minute.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): a table
-- in a schema no client reaches, two functions added, two re-created with their
-- signatures unchanged and one key more in each answer (a build that does not read
-- `seal` ignores it), and `confirm_my_pickup` dropped and re-created with one
-- defaulted argument — a build that sends `p_id` alone is answered as before, its
-- moment now. Nothing removed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The kitchen's secret
-- ----------------------------------------------------------------------------

create table servicio.kitchen_seal_key (
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  version      integer not null,
  secret       bytea not null,
  created_at   timestamptz not null default clock_timestamp(),
  -- When a member stopped working there. Kept a day for the tickets sealed with it.
  retired_at   timestamptz,

  constraint kitchen_seal_key_pkey primary key (workspace_id, version),
  constraint kitchen_seal_key_version check (version >= 1),
  constraint kitchen_seal_key_secret check (octet_length(secret) = 20)
);

-- One current version per kitchen.
create unique index kitchen_seal_key_one_current
  on servicio.kitchen_seal_key (workspace_id) where retired_at is null;

comment on table servicio.kitchen_seal_key is
  'A kitchen''s secret for sealing its reservations'' tickets (J2, 2026-11-20): the QR on her '
  'ticket carries a MAC made with it, which the fonda''s phone checks with no signal. One '
  'current version per kitchen; a member who stops working there retires it and a new one '
  'is made; a retired version is handed out a day more, for tickets already sealed, then '
  'deleted. Read only through kitchen_seal_keys and reservation_seal. Goes with the kitchen. '
  '0088, plan 10.9j-ii-a.';

revoke all on servicio.kitchen_seal_key from public, anon, authenticated;

-- Every kitchen that exists now gets its first secret.
insert into servicio.kitchen_seal_key (workspace_id, version, secret)
select w.id, 1, extensions.gen_random_bytes(20)
  from public.workspace w
 where w.kind = 'cocina';

-- And every kitchen made from now on, as it is made.
create function servicio.first_seal_key()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into servicio.kitchen_seal_key (workspace_id, version, secret)
  values (new.id, 1, extensions.gen_random_bytes(20))
  on conflict do nothing;
  return null;
end;
$$;

comment on function servicio.first_seal_key() is
  'Trigger: a kitchen made is given its first sealing secret (J2). Granted to nobody. '
  '0088, plan 10.9j-ii-a.';

revoke all on function servicio.first_seal_key() from public, anon, authenticated;

create trigger kitchen_gets_a_seal_key
  after insert on public.workspace
  for each row
  when (new.kind = 'cocina')
  execute function servicio.first_seal_key();

-- A member who stops working at a kitchen — she leaves (`leave_kitchen`), the owner
-- removes her, her account goes — renews its secret: her copy stops sealing tickets
-- that pass there, once the day the old version is kept for is over (J2: *renewed
-- when a member leaves*). The paths are `0085`'s for her phones' card codes.
create function servicio.renew_seal_key()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
begin
  -- A kitchen being deleted takes its secrets with it (the cascade): nothing to renew,
  -- and a new row would point at a kitchen that is going.
  if not exists (select 1 from public.workspace w where w.id = old.workspace_id and w.kind = 'cocina') then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('tienda.seal.renew:' || old.workspace_id::text, 0));

  -- Versions retired more than a day ago seal no ticket a phone still accepts: gone.
  delete from servicio.kitchen_seal_key k
   where k.workspace_id = old.workspace_id
     and k.retired_at <= clock_timestamp() - interval '24 hours';

  update servicio.kitchen_seal_key k
     set retired_at = clock_timestamp()
   where k.workspace_id = old.workspace_id and k.retired_at is null;

  select coalesce(max(k.version), 0) + 1 into v_next
    from servicio.kitchen_seal_key k
   where k.workspace_id = old.workspace_id;

  insert into servicio.kitchen_seal_key (workspace_id, version, secret)
  values (old.workspace_id, v_next, extensions.gen_random_bytes(20));

  return null;
end;
$$;

comment on function servicio.renew_seal_key() is
  'Trigger: a membership of a kitchen ended or deleted retires its sealing secret and makes '
  'the next version (J2: renewed when a member leaves); versions retired more than a day ago '
  'are deleted. Nothing for a kitchen being deleted. Granted to nobody. 0088, plan 10.9j-ii-a.';

revoke all on function servicio.renew_seal_key() from public, anon, authenticated;

create trigger seal_key_renews_when_a_member_leaves
  after update of is_active on public.workspace_member
  for each row
  when (old.is_active and not new.is_active)
  execute function servicio.renew_seal_key();

create trigger seal_key_renews_when_a_member_goes
  after delete on public.workspace_member
  for each row
  execute function servicio.renew_seal_key();


-- ----------------------------------------------------------------------------
-- 2. The seal
-- ----------------------------------------------------------------------------
-- The header says the shape.

-- A text as printable ASCII: its UTF-8 bytes, a printable ASCII byte as itself but
-- `%` (37) and `|` (124), every other byte — a control, an accent's two bytes, an
-- emoji's four — as `%XX`. `decodeURIComponent` reads it back.
create function servicio.seal_text(p_text text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select coalesce(string_agg(
           case when b.byte between 32 and 126 and b.byte not in (37, 124) then chr(b.byte)
                else '%' || upper(lpad(to_hex(b.byte), 2, '0')) end,
           '' order by b.i), '')
    from (select i, get_byte(convert_to(p_text, 'UTF8'), i) as byte
            from generate_series(0, octet_length(convert_to(p_text, 'UTF8')) - 1) as i) b
$$;

comment on function servicio.seal_text(text) is
  'A text as printable ASCII for a seal (J2): its UTF-8 bytes, printable ASCII as itself but % '
  'and |, every other byte as %XX (upper-case hex) — what decodeURIComponent reads back. So the '
  'QR''s text is the same bytes for every writer and reader of a QR. Granted to nobody. 0088, '
  'plan 10.9j-ii-a.';

revoke all on function servicio.seal_text(text) from public, anon, authenticated;

-- A dish's name as the seal carries it: `seal_text`, character by character, as many
-- characters as fit in 120 encoded — so a QR stays one a camera reads at a counter.
create function servicio.seal_name(p_name text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select coalesce(string_agg(c.enc, '' order by c.i), '')
    from (select i, enc, sum(length(enc)) over (order by i) as run
            from (select i, servicio.seal_text(substr(p_name, i, 1)) as enc
                    from generate_series(1, char_length(p_name)) as i) e) c
   where c.run <= 120
$$;

comment on function servicio.seal_name(text) is
  'A dish''s name as a seal carries it (J2): seal_text, a whole character at a time, as many '
  'as fit in 120 encoded characters — a usual name whole; one of 80 accents or emoji cut, so '
  'the QR stays one a camera reads across a counter. Granted to nobody. 0088, plan 10.9j-ii-a.';

revoke all on function servicio.seal_name(text) from public, anon, authenticated;

-- NULL when the reservation is not there, its kitchen has no current secret, or it
-- holds other than one line (`reserve_plate` makes one; a reservation of several is
-- a later shape).

create function servicio.reservation_seal(p_reservation_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  with r as (
    select r.id, r.workspace_id, r.code, r.pickup_at, r.payment, r.eat
      from public.reservation r
     where r.id = p_reservation_id
  ),
  l as (
    select rl.quantity, rl.unit_price, rl.container_price, ll.surprise, ll.name
      from public.reservation_line rl
      join public.listing_line ll on ll.id = rl.listing_line_id
     where rl.reservation_id = p_reservation_id
  ),
  k as (
    select k.version, k.secret
      from servicio.kitchen_seal_key k
      join r on r.workspace_id = k.workspace_id
     where k.retired_at is null
  ),
  p as (
    select concat_ws('|',
             's1',
             replace(r.id::text, '-', ''),
             replace(r.workspace_id::text, '-', ''),
             k.version::text,
             r.code::text,
             extract(epoch from r.pickup_at)::bigint::text,
             r.payment,
             r.eat,
             l.quantity::text,
             l.unit_price::text,
             coalesce(l.container_price::text, ''),
             case when l.surprise then '1' else '0' end,
             servicio.seal_name(l.name)) as payload,
           k.secret
      from r, k, l
     where (select count(*) from l) = 1
  )
  select p.payload || '|'
         || encode(substring(extensions.hmac(convert_to(p.payload, 'UTF8'), p.secret, 'sha1') from 1 for 10), 'hex')
    from p
$$;

comment on function servicio.reservation_seal(uuid) is
  'A reservation''s seal — the text of the QR on her ticket (J2): s1, the reservation and its '
  'kitchen (32 hex each), the key version, the code, her hour (epoch seconds), payment, eat, '
  'quantity, unit and container price (my_reservations'' decimal text), surprise (1/0), the '
  'dish''s name percent-encoded, at most 120 characters of it (seal_name), then the first 10 '
  'bytes of HMAC-SHA1 over all '
  'that, keyed with the kitchen''s current secret, as 20 hex — fields joined by |, the MAC '
  'after the last; printable ASCII throughout. Never her name. NULL when it cannot be made. '
  'Granted to nobody. 0088, plan 10.9j-ii-a.';

revoke all on function servicio.reservation_seal(uuid) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. The kitchen's secret, handed to the phone of anyone who works there
-- ----------------------------------------------------------------------------
-- Every role hands over (question 3, 2026-10-28), so every role is handed the
-- secret. A read: the secrets exist from the kitchen's making (above), so a GET —
-- which PostgREST runs read-only — answers as a POST does.

create function public.kitchen_seal_keys(p_workspace_id uuid)
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
    raise exception 'kitchen_seal_keys requires an authenticated caller' using errcode = '42501';
  end if;
  if p_workspace_id is null or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'kitchen_seal_keys: that kitchen is not one of yours' using errcode = '42501';
  end if;
  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'kitchen_seal_keys: only a kitchen seals its tickets' using errcode = 'TD013';
  end if;

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'keys', coalesce((
      select jsonb_agg(jsonb_build_object(
               'version', k.version,
               'secret', encode(k.secret, 'hex'),
               -- Until when a phone may check a ticket with it: NULL for the current one.
               'until', k.retired_at + interval '24 hours')
             order by k.version desc)
        from servicio.kitchen_seal_key k
       where k.workspace_id = p_workspace_id
         and (k.retired_at is null or k.retired_at > now() - interval '24 hours')), '[]'::jsonb));
end;
$$;

comment on function public.kitchen_seal_keys(uuid) is
  'The kitchen''s sealing secrets for the phone of anyone who works there (J2): {workspace_id, '
  'keys: [{version, secret (40 hex), until}]}, newest first — the current one (until NULL) '
  'and any retired in the last day (until: its retirement plus a day), for tickets already '
  'sealed with it. Wera Cocina keeps them until Cerrar sesión and checks a ticket''s seal with '
  'no signal. Any active member, every role. 42501 signed out or not one of hers, TD013 a '
  'shop. 0088, plan 10.9j-ii-a.';

revoke all on function public.kitchen_seal_keys(uuid) from public, anon;
grant execute on function public.kitchen_seal_keys(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 4. Her reservations answer their seals — `0080`'s bodies, the seal added
-- ----------------------------------------------------------------------------
-- `reserve_plate`: `0080`'s body, word for word, but each answer carries `seal`.
-- Its signature is unchanged.

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
    -- New in 0088: its seal, the QR on her ticket.
    return jsonb_build_object('id', v_old.id, 'code', v_old.code, 'seal', servicio.reservation_seal(v_old.id));
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

  -- New in 0088: its seal, the QR on her ticket (J2).
  return jsonb_build_object('id', p_id, 'code', v_code, 'seal', servicio.reservation_seal(p_id));
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
  '0080). The id is the phone''s; a retry returns it. Answers {id, code, seal} — since '
  '0088 the seal, the QR on her ticket (servicio.reservation_seal). 42501 / 22023 / '
  'TD015 / TD016 / TD017 / TD020 / TD021 — see 0079 and 0080. Plans 10.5b-i, '
  '10.5b-ii-b and 10.9j-ii-a.';

-- `my_reservations`: `0080`'s body, word for word, but each reservation still to
-- collect carries its seal. Its signature is unchanged.

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
             -- 0088: the QR on her ticket (J2) — only while it is still to collect: not
             -- handed over, not confirmed, not cancelled, and no more than a day past
             -- its window (a plate that se liberó keeps its swipe that long, and the
             -- kitchen hands over a released plate all the same). NULL for the rest.
             'seal', case when r.handed_over_at is null and r.picked_up_at is null
                           and r.cancelled_at is null
                           and now() <= r.held_until + interval '24 hours'
                          then servicio.reservation_seal(r.id) end,
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
  'since 0080 her own stars (my_rating) and until when she may give them (rate_until), '
  'and since 0088 each one''s seal while it is still to collect (seal: the QR on her '
  'ticket, servicio.reservation_seal; NULL once handed over, confirmed, cancelled or a day '
  'past its window). Keyed on auth.uid(); nobody else''s. Money and quantities as decimal '
  'strings. 0079, plan 10.5b-i; 0080, plan 10.5b-ii-b; 0088, plan 10.9j-ii-a.';


-- ----------------------------------------------------------------------------
-- 5. *Ya lo tengo* with its minute (J4)
-- ----------------------------------------------------------------------------
-- `0079`'s body with her phone's moment: a swipe made with no signal is kept on
-- her phone and sent when the signal returns, with the minute she swiped — kept
-- between the reservation's making and now, as `hand_over_reservation`'s `p_at`
-- is — and accepted when THAT minute is within a day of her window (J4), whenever
-- it arrives. A call with `p_id` alone is answered as before: its moment is now.
-- Dropped and re-created, never an overload (ADR-035 §2.2; `0064`). The drop and
-- the create are one transaction: no moment without it.

drop function public.confirm_my_pickup(uuid);

create function public.confirm_my_pickup(p_id uuid, p_at timestamptz default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_r    public.reservation%rowtype;
  v_at   timestamptz;
begin
  if v_user is null then
    raise exception 'confirm_my_pickup requires an authenticated caller' using errcode = '42501';
  end if;

  select * into v_r from public.reservation r
   where r.id = p_id and r.buyer_id = v_user
   for update;
  if not found then
    raise exception 'confirm_my_pickup: that reservation is not one of yours' using errcode = '42501';
  end if;

  if v_r.picked_up_at is null then
    -- New in 0088: when she swiped, on her phone — never later than now, never before
    -- the reservation was made.
    v_at := greatest(least(coalesce(p_at, now()), now()), v_r.created_at);
    if (v_r.cancelled_at is not null and v_r.handed_over_at is null)
       or v_at > v_r.held_until + interval '24 hours' then
      raise exception 'confirm_my_pickup: that reservation is no longer pending' using errcode = 'TD018';
    end if;
    update public.reservation set picked_up_at = v_at where id = v_r.id;
  end if;

  return 'recogido';
end;
$$;

comment on function public.confirm_my_pickup(uuid, timestamptz) is
  'The neighbour swipes Ya lo tengo: her reservation is collected (recogido). Since 0088 p_at '
  'is when she swiped, on her phone — kept between its making and now; a swipe made with no '
  'signal arrives later with its minute (J4) — and the swipe is accepted when that minute is '
  'within a day of her window. The first moment is kept. 42501 (not hers) / TD018 (cancelled '
  'and not handed over, or its minute more than a day after its window). 0079, plan 10.5b-i; '
  '0088, plan 10.9j-ii-a.';

revoke all on function public.confirm_my_pickup(uuid, timestamptz) from public, anon;
grant execute on function public.confirm_my_pickup(uuid, timestamptz) to authenticated;
