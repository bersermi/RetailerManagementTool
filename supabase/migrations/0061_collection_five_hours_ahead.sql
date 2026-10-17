-- ============================================================================
-- 0061 — TE LO COMPRO: A PICKUP AT LEAST FIVE HOURS AFTER THE REQUEST. Plan task
-- `8g`, the owner's ruling of 2026-10-16:
--
--   *"Let's enforce the user to request a pick up only 5 hours apart from the
--   moment he is recording the waste."*
--
-- ⚠️ ONE CHECK, IN `request_collection`, WITH ITS OWN CODE: **`TD011`**, so the
-- app can say it in words — a `22023` would arrive as *algo salió mal*. The app
-- offers only starts five hours out (`@/api/collection`'s `earliestStart`); this
-- is the belt to that brace, and it is the rule wherever the request comes from.
--
-- ⚠️ THE FLOOR IS FOUR AND A HALF HOURS FROM `now()`, IN THE STORE'S TIMEZONE —
-- the half hour is the time between picking a slot and saving it, and a phone
-- clock behind the server's. Measured against the store's own day, like
-- `v_today`: a request at 23:30 in Mexico City is not judged by UTC.
--
-- ⚠️ NOTHING STORED IS REFUSED: a check in a function reads only new requests,
-- and the table carries no constraint about `now()` (one could not — a row valid
-- when written would turn invalid by being old). Signature unchanged.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- request_collection — 0060's body, and the pickup five hours ahead
-- ----------------------------------------------------------------------------
create or replace function public.request_collection(
  p_id           uuid,
  p_location_id  uuid,
  p_pickup_date  date,
  p_window_start time,
  p_window_end   time,
  p_lines        jsonb,
  p_photos       text[] default '{}',
  p_note         text   default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_loc      public.location%rowtype;
  v_today    date;
  v_problem  text;
  v_lines    jsonb;
  v_existing public.collection_request%rowtype;
  v_prefix   text;
begin
  if v_user is null then
    raise exception 'request_collection requires an authenticated caller'
      using errcode = '42501';
  end if;
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'location not accessible' using errcode = '42501';
  end if;

  select * into v_loc from public.location l where l.id = p_location_id;

  -- ⚠️ THE OWNER'S RULING: an owner or a manager, never a cashier.
  if not public.has_role(v_loc.workspace_id, 'manager') then
    raise exception 'request_collection: only an owner or a manager may ask for a pickup'
      using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'request_collection: the client must generate the request id'
      using errcode = '22023';
  end if;

  -- A retry of a request already recorded is that request.
  select * into v_existing from public.collection_request r where r.id = p_id;
  if found then
    if v_existing.workspace_id is distinct from v_loc.workspace_id then
      raise exception 'request %: not accessible', p_id using errcode = '42501';
    end if;
    return jsonb_build_object('id', v_existing.id, 'status', v_existing.status,
                              'already_recorded', true);
  end if;

  if v_loc.street is null or v_loc.street_number is null
     or v_loc.city is null or v_loc.postal_code is null then
    raise exception 'request_collection: the store has no complete address — street, '
                    'number, city and código postal'
      using errcode = 'TD008';
  end if;
  if not public.collection_reaches(v_loc.postal_code) then
    raise exception 'request_collection: Te lo compro does not reach código postal %',
                    v_loc.postal_code
      using errcode = 'TD009';
  end if;

  -- ⚠️ "TODAY" IS THE STORE'S, in its own timezone (`0012`) — a request sent at
  -- 23:30 in Mexico City is not a day late because UTC has turned over.
  v_today := (now() at time zone v_loc.timezone)::date;
  if p_pickup_date is null or p_pickup_date < v_today
     or p_pickup_date > v_today + 14 then
    raise exception 'request_collection: the pickup day must be from today to two weeks '
                    'out, got %', p_pickup_date
      using errcode = '22023';
  end if;
  -- ⚠️ 0060: ONE QUARTER OF AN HOUR, THE OWNER'S — *"If the user picks 9:45 then
  -- he should be able to dispatch the waste from 9:45 to 10:00."* A start on the
  -- quarter from 7:00 to 18:45, and an end fifteen minutes after it.
  if p_window_start is null or p_window_end is null
     or p_window_start < time '07:00' or p_window_start > time '18:45'
     or extract(minute from p_window_start)::integer % 15 <> 0
     or extract(second from p_window_start) <> 0
     or p_window_end <> p_window_start + interval '15 minutes' then
    raise exception 'request_collection: the pickup is one quarter of an hour, from a '
                    'start on the quarter between 7:00 and 18:45, got % to %',
                    p_window_start, p_window_end
      using errcode = '22023';
  end if;
  -- ⚠️⚠️ 0061: FIVE HOURS AHEAD, THE OWNER'S — *"Let's enforce the user to request
  -- a pick up only 5 hours apart from the moment he is recording the waste."*
  -- The start is read in the STORE's own time, as `v_today` is. ⚠️ THE FLOOR HERE
  -- IS FOUR AND A HALF HOURS, AND THAT IS A GRACE AND NOT A SECOND RULE: the app
  -- offers only starts five hours out, and the half hour is the time she spends
  -- reviewing and saving after she picked, plus a phone clock running behind.
  if (p_pickup_date + p_window_start)
     < (now() at time zone v_loc.timezone) + interval '4 hours 30 minutes' then
    raise exception 'request_collection: a pickup starts at least five hours after the '
                    'request, got % at %', p_pickup_date, p_window_start
      using errcode = 'TD011';
  end if;

  -- ⚠️ 0060: ONE PRODUCT PER REQUEST, THE OWNER'S — *"that allows me to promote
  -- each product easier."* Still a one-element list, so the shape 0059 stored
  -- and the app sends does not change.
  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) <> 1 then
    raise exception 'request_collection: a request carries exactly one product'
      using errcode = '22023';
  end if;

  select format('request_collection: line %s — %s', v.ord, v.problem)
    into v_problem
    from (
      select e.ord,
             case
               when jsonb_typeof(e.l) <> 'object' then 'a line must be an object'
               when nullif(e.l->>'variant_id', '') is null then 'variant_id is required'
               when pv.id is null
                 then format('variant %s is not in this shop', e.l->>'variant_id')
               -- ⚠️ THREE WHENs AND NOT ONE `or`: a CASE is evaluated in order, an
               -- `or` is not, and the cast must never meet a string first.
               when nullif(e.l->>'qty_display', '') is null
                 then 'qty_display is required'
               when (e.l->>'qty_display') !~ '^[0-9]+(\.[0-9]{1,3})?$'
                 then format('qty_display must be a positive number, got %L',
                             e.l->>'qty_display')
               when (e.l->>'qty_display')::numeric <= 0
                 then format('qty_display must be a positive number, got %L',
                             e.l->>'qty_display')
               when u.code is null
                 then format('unit %L is not in the unit table',
                             coalesce(nullif(e.l->>'qty_display_unit', ''), pv.sell_unit_code))
               when u.base_code <> pv.base_unit_code
                 then format('unit %L does not measure this product', u.code)
               when coalesce(e.l->>'condition', '') not in
                    ('bueno', 'por caducar', 'caducado', 'magullado')
                 then format('condition must be bueno, por caducar, caducado or '
                             'magullado, got %L', e.l->>'condition')
               when coalesce(e.l->>'packaging', '') not in ('cerrado', 'abierto')
                 then format('packaging must be cerrado or abierto, got %L',
                             e.l->>'packaging')
               when coalesce(e.l->>'keeping', '') not in
                    ('ambiente', 'refrigerado', 'congelado')
                 then format('keeping must be ambiente, refrigerado or congelado, '
                             'got %L', e.l->>'keeping')
               when nullif(e.l->>'expiry_date', '') is not null
                    and (e.l->>'expiry_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                 then format('expiry_date must be a date, YYYY-MM-DD, got %L',
                             e.l->>'expiry_date')
             end as problem
        from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
        left join public.product_variant pv
          -- ⚠️ THE CAST IS INSIDE A CASE so a malformed id is a sentence about
          -- that line, never a bare 22P02 from the join.
          on pv.id = case when jsonb_typeof(e.l) = 'object'
                           and (e.l->>'variant_id') ~ '^[0-9a-fA-F-]{36}$'
                          then (e.l->>'variant_id')::uuid end
         and pv.workspace_id = v_loc.workspace_id
        left join public.unit u
          on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''), pv.sell_unit_code)
    ) v
   where v.problem is not null
   order by v.ord
   limit 1;
  if v_problem is not null then
    raise exception '%', v_problem using errcode = '22023';
  end if;

  -- ⚠️ THE STORED LINE IS THE VALIDATED ONE — the name copied in, the unit made
  -- explicit, the quantity a number, and nothing the client sent beyond these.
  select jsonb_agg(jsonb_build_object(
           'variant_id',       pv.id,
           'variant_name',     pv.name,
           'qty_display',      (e.l->>'qty_display')::numeric,
           'qty_display_unit', coalesce(nullif(e.l->>'qty_display_unit', ''), pv.sell_unit_code),
           'condition',        e.l->>'condition',
           'packaging',        e.l->>'packaging',
           'keeping',          e.l->>'keeping',
           'expiry_date',      nullif(e.l->>'expiry_date', '')::date)
         order by e.ord)
    into v_lines
    from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
    join public.product_variant pv
      on pv.id = (e.l->>'variant_id')::uuid and pv.workspace_id = v_loc.workspace_id;

  v_prefix := v_loc.workspace_id::text || '/' || p_id::text || '/';
  if exists (select 1 from unnest(coalesce(p_photos, '{}')) p(path)
              where p.path is null or left(p.path, length(v_prefix)) <> v_prefix
                 or p.path like '%..%' or length(p.path) <= length(v_prefix)) then
    raise exception 'request_collection: a photo path must be %<file>', v_prefix
      using errcode = '22023';
  end if;

  insert into public.collection_request
    (id, workspace_id, location_id, pickup_date, window_start, window_end,
     street, street_number, colonia, city, postal_code, lines, photos, note, created_by)
  values
    (p_id, v_loc.workspace_id, v_loc.id, p_pickup_date, p_window_start, p_window_end,
     v_loc.street, v_loc.street_number, v_loc.colonia, v_loc.city, v_loc.postal_code,
     v_lines, coalesce(p_photos, '{}'), nullif(btrim(p_note), ''), v_user);

  return jsonb_build_object('id', p_id, 'status', 'enviada', 'already_recorded', false);
end;
$$;

comment on function public.request_collection(uuid, uuid, date, time, time, jsonb, text[], text) is
  'Te lo compro: records one request for a pickup at the caller''s store. Owner '
  'or manager only (42501); a complete store address (TD008) inside the service '
  'area (TD009); a day from today to two weeks out, ONE product and ONE quarter '
  'of an hour starting 7:00 to 18:45 (22023, since 0060), and starting at least '
  'five hours after the request (TD011, since 0061; 4h30 with the grace). '
  'Idempotent on the client''s id. 0059, 0060, 0061.';

revoke all on function
  public.request_collection(uuid, uuid, date, time, time, jsonb, text[], text) from public;
grant execute on function
  public.request_collection(uuid, uuid, date, time, time, jsonb, text[], text) to authenticated;
