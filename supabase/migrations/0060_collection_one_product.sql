-- ============================================================================
-- 0060 — TE LO COMPRO AS THE OWNER REDREW IT: ONE PRODUCT, ONE QUARTER OF AN
-- HOUR, A STATUS FOR WHAT WERA DECLINES, AND THE PLACE THE PHOTOS GO. Plan task
-- `8l`, his rulings of 2026-10-16:
--
--   *"The user will record only 1 product per Te lo compro entry, that allows me
--   to promote each product easier. … For the time to pick up make the time
--   frame not able to pick from-till, use 15 min intervals with multiples of
--   15. If the user picks 9:45 then he should be able to dispatch the waste from
--   9:45 to 10:00."* And, asked about the statuses: ***"Add Rechazada."***
--
-- ⚠️ ALL THREE ARE TIGHTENINGS OF `0059`, AND THE HOSTED TABLE WAS EMPTY WHEN
-- THEY WERE WRITTEN (read 2026-10-16: 0 rows), so no stored request is refused
-- by them. The columns and `request_collection`'s signature are unchanged: the
-- app still sends a one-element list and a start and an end.
--
-- ⚠️ `rechazada` IS WERA'S, LIKE `confirmada` AND `recogida`: set by the owner in
-- the dashboard when Wera cannot take a product. It is not `cancelada`, which
-- the shop sets on its own request — the two read differently to her and mean
-- different things to him. `cancel_collection_request` already refuses anything
-- that is not `enviada` (TD010), so a refused request cannot be called off.
--
-- ⚠️⚠️ THE PHOTOS: A PRIVATE BUCKET, `merma`, AND TWO POLICIES. A photo lives at
-- `<shop>/<request>/<file>` (`request_collection` already refuses any other
-- path), and only an owner or a manager of that shop may put one there or read
-- it back — `merma_path_ok`, the same fence as the request itself. Wera reads
-- them as the service role. ⚠️ GUARDED: the bucket and its policies are created
-- only where Storage runs (`storage.buckets` exists) — the hosted project, and
-- CI's full `supabase db reset` job, whose suite asserts them; the jobs that
-- start Postgres without Storage apply the rest of this file and skip that part
-- with a notice. ⚠️ A SHOP'S DELETION DOES NOT DELETE ITS PHOTOS: Storage
-- refuses deleting its objects from SQL, so the purge removes the requests and
-- leaves the files unreachable by any client (no shop, no member, no policy).
-- The owner removes a deleted shop's folder by hand; the aviso says so.
-- ============================================================================

alter table public.collection_request drop constraint collection_request_status;
alter table public.collection_request
  add constraint collection_request_status
    check (status in ('enviada', 'confirmada', 'recogida', 'cancelada', 'rechazada'));

alter table public.collection_request drop constraint collection_request_lines_listed;
alter table public.collection_request
  add constraint collection_request_one_product
    check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) = 1);

alter table public.collection_request drop constraint collection_request_window;
alter table public.collection_request
  add constraint collection_request_window check (
    window_start >= time '07:00' and window_start <= time '18:45'
    and extract(second from window_start) = 0
    and extract(minute from window_start)::integer % 15 = 0
    and window_end = window_start + interval '15 minutes');

comment on column public.collection_request.lines is
  'The ONE product, as request_collection() validated it (a one-element list): '
  'variant_id, variant_name (copied), qty_display, qty_display_unit, condition, '
  'packaging, keeping, expiry_date (or null). 0059, one product since 0060.';


-- ----------------------------------------------------------------------------
-- request_collection — 0059's body; one product, one quarter of an hour
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
  'of an hour starting 7:00 to 18:45 (22023, since 0060). Idempotent on the '
  'client''s id. 0059, 0060.';

revoke all on function
  public.request_collection(uuid, uuid, date, time, time, jsonb, text[], text) from public;
grant execute on function
  public.request_collection(uuid, uuid, date, time, time, jsonb, text[], text) to authenticated;


-- ----------------------------------------------------------------------------
-- The photo fence: may the caller put or read a file at this path?
-- ----------------------------------------------------------------------------
-- ⚠️ THE FIRST FOLDER IS THE SHOP, AND THE CALLER MUST BE ITS OWNER OR MANAGER —
-- the request's own fence. A path whose first folder is not a uuid is a plain
-- `false`, never a cast error.
create function public.merma_path_ok(p_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
           when split_part(coalesce(p_name, ''), '/', 1) ~ '^[0-9a-fA-F-]{36}$'
           then public.has_role(split_part(p_name, '/', 1)::uuid, 'manager')
           else false
         end
$$;

comment on function public.merma_path_ok(text) is
  'True when the first folder of a storage path is a shop the caller owns or '
  'manages — the fence on Te lo compro''s photos (bucket merma). 0060, plan 8l.';

revoke all on function public.merma_path_ok(text) from public;
grant execute on function public.merma_path_ok(text) to authenticated;

do $merma$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice '0060: no Storage here — the photo bucket is created where Storage runs';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('merma', 'merma', false)
  on conflict (id) do nothing;

  execute $p$
    create policy merma_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'merma' and public.merma_path_ok(name))
  $p$;
  execute $p$
    create policy merma_select on storage.objects
      for select to authenticated
      using (bucket_id = 'merma' and public.merma_path_ok(name))
  $p$;
end
$merma$;
