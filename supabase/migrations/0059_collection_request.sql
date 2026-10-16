-- ============================================================================
-- 0059 — *TE LO COMPRO*: A SHOP ASKS WERA TO COLLECT, AND PERHAPS BUY, WHAT IT
-- CANNOT SELL. Plan task `8j`, the owner's brief of 2026-10-16:
--
--   *"The interesting part comes when scheduling a collection + purchase. …
--   the user should be able to select the product, the condition of the
--   product such as expirado, mayugado, bueno, find the best set of options
--   that will allow us to simplify the further comercialization of the merma.
--   … We will only allow for collection on the shop itself … Regarding the
--   pick up hours let's create a simplified time picker that works on
--   multiples of 15 minutes spanning from 7 a.m. to 7 p.m."*
--
-- And on 2026-10-16, asked who may ask: ***"Allow to owners and managers only."***
--
-- ----------------------------------------------------------------------------
-- WHAT IT IS, AND WHAT IT IS NOT
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ A REQUEST, NOT A LEDGER DOCUMENT. Nothing leaves the shelf when she asks:
-- the goods are still in the shop until somebody collects them, the price is
-- not known, and the pilot settles both by hand. So this table moves no stock,
-- is not append-only, and carries a STATUS — `enviada` when she sends it, then
-- `confirmada`, `recogida` or `cancelada`. The shop may cancel its own while it
-- is still `enviada` (`cancel_collection_request`); every other step is Wera's,
-- written by the owner in the Supabase dashboard as the service role, which is
-- the pilot's whole operator console (*"What happens after the user requests …
-- is very simple at a pilot phase"*).
--
-- ⚠️⚠️ ONE TABLE, THE PRODUCTS AS A JSON LIST ON THE ROW. The alternative was a
-- line table and a photo table, and each new tenant table costs a fixture in
-- three isolation suites and a place in the account purge. For a pilot whose
-- requests are read by one person, one row per request is the honest size;
-- `request_collection` validates every field of every line before anything is
-- written, so the list is as checked as a table would be. ⚠️ Each line carries
-- the product's NAME as well as its id, copied at the moment of asking, because
-- the person reading it is not a member of the shop and the product may be
-- renamed before the pickup.
--
-- ⚠️ THE ADDRESS IS COPIED ONTO THE REQUEST TOO, for the same reason: the pickup
-- goes to where the store WAS when she asked. `0058`'s columns on `location` are
-- the store's current address; these are the request's.
--
-- ⚠️⚠️ THE PHOTOS ARE PATHS, AND THE PLACE THEY POINT AT IS NOT HERE. `photos` is
-- the list of storage paths a request carries (`<shop>/<request>/<file>`, and
-- `request_collection` refuses any other shape). The private bucket and its
-- policies arrive with the camera — a new app build, plan `8l` — together with
-- the answer to what a shop's deletion does to its pictures. Until then the
-- list is empty.
--
-- ----------------------------------------------------------------------------
-- WHO MAY DO WHAT
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ A RULE ABOUT WHO MAY DO WHAT, RULED BY THE OWNER: an owner or a manager
-- asks, reads and cancels; a cashier does none of it. ⚠️ One SELECT policy,
-- `has_role(workspace_id, 'manager')`, and NO write grant at all: the two
-- `security definer` functions below are the only way in, which is the shape
-- every `record_*` RPC already has.
--
-- ⚠️ `created_by` IS A PLAIN uuid AND NOT A KEY TO `auth.users` — `0053`'s
-- ruling: no foreign key in `public` points at a login, so an account's deletion
-- never has to rewrite a request. ⚠️ AND THE ROW GOES WITH ITS SHOP: both keys
-- cascade, so `delete_my_account`'s purge of a sole owner's shop takes the
-- requests with it, as it takes the locations.
-- ============================================================================

create table public.collection_request (
  id             uuid primary key,
  workspace_id   uuid not null references public.workspace (id) on delete cascade,
  location_id    uuid not null,
  status         text not null default 'enviada',
  pickup_date    date not null,
  window_start   time not null,
  window_end     time not null,
  street         text not null,
  street_number  text not null,
  colonia        text,
  city           text not null,
  postal_code    text not null,
  lines          jsonb not null,
  photos         text[] not null default '{}',
  note           text,
  created_by     uuid not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint collection_request_status
    check (status in ('enviada', 'confirmada', 'recogida', 'cancelada')),
  -- ⚠️ THE OWNER'S PICKER, AS A RULE THE DATABASE HOLDS: 7:00 to 19:00, in
  -- quarters of an hour, and a window that is a window.
  constraint collection_request_window check (
    window_start >= time '07:00' and window_end <= time '19:00'
    and window_start < window_end
    and extract(second from window_start) = 0 and extract(second from window_end) = 0
    and extract(minute from window_start)::integer % 15 = 0
    and extract(minute from window_end)::integer % 15 = 0),
  constraint collection_request_lines_listed
    check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) > 0),
  constraint collection_request_postal_code_shape check (postal_code ~ '^[0-9]{5}$'),
  constraint collection_request_note_not_blank check (note is null or btrim(note) <> ''),
  constraint collection_request_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete cascade
);

create index collection_request_by_shop_idx
  on public.collection_request (workspace_id, created_at desc);

create trigger collection_request_set_updated_at
  before update on public.collection_request
  for each row execute function public.set_updated_at();

comment on table public.collection_request is
  'Te lo compro: a shop asks Wera to collect, and perhaps buy, products it cannot '
  'sell. A request, not a ledger document — it moves no stock. Written only by '
  'request_collection() and cancel_collection_request(); status beyond '
  'cancelada is Wera''s, by hand. 0059, plan 8j.';
comment on column public.collection_request.lines is
  'The products, as request_collection() validated them: variant_id, '
  'variant_name (copied), qty_display, qty_display_unit, condition, packaging, '
  'keeping, expiry_date (or null). 0059.';
comment on column public.collection_request.photos is
  'Storage paths, <workspace_id>/<request_id>/<file>. The bucket arrives with the '
  'camera (plan 8l); empty until then. 0059.';

alter table public.collection_request enable row level security;

create policy collection_request_select on public.collection_request
  for select to authenticated
  using (public.has_role(workspace_id, 'manager'));

revoke all on public.collection_request from anon, authenticated;
grant select on public.collection_request to authenticated;


-- ----------------------------------------------------------------------------
-- request_collection — the one way a request is written
-- ----------------------------------------------------------------------------
-- ⚠️ THE CLIENT GENERATES THE ID, and a request already recorded under it is
-- returned rather than refused: the same request sent twice — a retry over a bad
-- connection — is one request. ⚠️ Unlike a ledger document it is not compared
-- byte for byte, because nothing downstream is computed from it; a second,
-- different request is a different id.
--
-- ⚠️ THE REFUSALS, IN THE ORDER A PERSON MEETS THEM:
--   42501  not signed in, the store is not hers, or she is a cashier
--   TD008  the store has no complete address — street, number, city and
--          código postal, the owner's four
--   TD009  Te lo compro does not reach the store's código postal
--   22023  anything malformed: a day in the past or more than two weeks out, a
--          window outside 7:00–19:00 or off the quarter hour, a line that does
--          not say what it is, a photo path for another request
create function public.request_collection(
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
  if p_window_start is null or p_window_end is null
     or p_window_start < time '07:00' or p_window_end > time '19:00'
     or p_window_start >= p_window_end
     or extract(minute from p_window_start)::integer % 15 <> 0
     or extract(minute from p_window_end)::integer % 15 <> 0
     or extract(second from p_window_start) <> 0
     or extract(second from p_window_end) <> 0 then
    raise exception 'request_collection: the window must run from 7:00 to 19:00 in '
                    'quarters of an hour, got % to %', p_window_start, p_window_end
      using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'request_collection: lines must be a non-empty json array'
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
  'area (TD009); a day from today to two weeks out and a window in quarters of an '
  'hour between 7:00 and 19:00 (22023). Idempotent on the client''s id. 0059.';

revoke all on function
  public.request_collection(uuid, uuid, date, time, time, jsonb, text[], text) from public;
grant execute on function
  public.request_collection(uuid, uuid, date, time, time, jsonb, text[], text) to authenticated;


-- ----------------------------------------------------------------------------
-- cancel_collection_request — the shop's one step after asking
-- ----------------------------------------------------------------------------
-- ⚠️ ONLY WHILE IT IS `enviada`. Once Wera has confirmed it somebody may already
-- be on the way, and calling it off is a conversation, not a button — TD010.
-- Cancelling one already cancelled answers as if it had just been done.
create function public.cancel_collection_request(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.collection_request%rowtype;
begin
  if auth.uid() is null then
    raise exception 'cancel_collection_request requires an authenticated caller'
      using errcode = '42501';
  end if;
  select * into v_req from public.collection_request r where r.id = p_id;
  if not found or not public.has_role(v_req.workspace_id, 'manager') then
    raise exception 'request % not found or not accessible', p_id using errcode = '42501';
  end if;
  if v_req.status = 'cancelada' then
    return jsonb_build_object('id', v_req.id, 'status', 'cancelada');
  end if;
  if v_req.status <> 'enviada' then
    raise exception 'request % is already %: cancelling it is a conversation with Wera',
                    p_id, v_req.status
      using errcode = 'TD010';
  end if;
  update public.collection_request set status = 'cancelada' where id = p_id;
  return jsonb_build_object('id', p_id, 'status', 'cancelada');
end;
$$;

comment on function public.cancel_collection_request(uuid) is
  'Te lo compro: the shop calls off its own request while it is still enviada. '
  'Owner or manager (42501); TD010 once Wera has moved it on. 0059.';

revoke all on function public.cancel_collection_request(uuid) from public;
grant execute on function public.cancel_collection_request(uuid) to authenticated;
