-- ============================================================================
-- 0078 — the door Itacate reads, and the point each kitchen is drawn at
-- ============================================================================
-- docs/PLAN.md task `10.5-i-b-i`, the database half of `10.5-i-b` (split on size,
-- 2026-11-04). The owner's ruling of 2026-11-04, night (*"Yes, record it and follow
-- your recommendation"*), after *"I need the Itacate user to be able to see the pins
-- in the map while navigating"*: each kitchen is drawn at Google's point for her
-- address, kept as a 30-day copy and used ONLY to draw; and for the pilot the door
-- sends every kitchen a neighbour may see — no area, no postal-code table.
-- ADR-035 §2.2 (*Address search*) and §2.7 (*The one door*), both amended that night.
--
-- WHAT IS HERE:
--   1. `location.google_place_id`, `google_lat`, `google_lng`, `google_at`: Google's
--      ID for her place (kept for good, Service Specific Terms §3) and the point
--      Google gives it, with the moment it was fetched — a 30-day copy (§14.3 for
--      Places; §6.3.1 for an address typed without a pick, Geocoding's). Point and
--      moment together or neither; the ID may be missing.
--   2. `set_google_point(p_location_id, p_lat, p_lng, p_place_id)` — the one way to
--      write them: her kitchen's owner, a kitchen only; `google_at` is the moment it
--      is called, never a date the phone sends.
--   3. `location_google_point_guard` — a trigger that refuses every other write to
--      the four columns, and clears them when her address changes (the point was
--      Google's answer for the old address; Wera Cocina asks again, `10.5-i-b-ii`).
--   4. `forget_old_google_points()` and a nightly `pg_cron` job — every point fetched
--      more than 29 days ago is cleared, so none is ever kept 30 days. The project's
--      FIRST scheduled job: a job inside the database, not a server with a key.
--   5. `on_offer_now()` — THE ONE DOOR (§2.7), the name `0072` promised: every
--      kitchen a neighbour may see, with what it offers and the point to draw.
--
-- ⚠️⚠️ GOOGLE'S POINT IS FOR DRAWING ONLY. Google's Terms of Service forbid using
-- Places latitude/longitude *"as an input for point-in-polygon analysis"*
-- (3.2.3(c)(iv)), and Places and Geocoding content may be shown only on a Google
-- map (§14.2, §6.2; 3.2.3(e)). So nothing here filters, sorts, groups or counts on
-- `google_lat` or `google_lng`: the door only hands them out, inside the point it
-- returns, and `google_at` alone decides whether the copy is fresh enough to hand
-- out. `supabase/tests/0078_the_door_and_googles_point.sql` holds the census: the
-- functions that may name the two columns, and where in the door they may appear.
-- When the zone outgrows one answer, an area argument comes back (defaulted) and
-- filters on OUR data — her own pin, or a postal-code table — never on Google's.
--
-- ⚠️ THE DOOR TAKES NO AREA, FOR THE PILOT (the ruling): every kitchen a neighbour
-- may see reaches her phone, which works out distance and order — so nothing of
-- where she is leaves it. A kitchen is seen while it has something on offer now
-- (not withdrawn, its window not over) or published in the last 14 days — *quiet*,
-- shown faded with its summary (the owner's ruling of 2026-11-01, late). Only
-- kitchens (`kind = 'cocina'`), only active ones. NEVER a cost, a member, a
-- `created_by`, a ledger row or the raw history: the summary is what she usually
-- publishes, not what she published.
--
-- ⚠️ MONEY AND QUANTITIES TRAVEL AS DECIMAL STRINGS (`"65.00"`), so the phone reads
-- them with `parseDecimal` (ADR-035 §2.11) and no float ever touches a peso; points
-- as JSON numbers, six decimals.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`): four
-- nullable columns, functions and a trigger added; nothing dropped or renamed. The
-- trigger refuses only writes no build makes — no build knows these columns.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Google's point, on her kitchen's place
-- ----------------------------------------------------------------------------

alter table public.location
  add column google_place_id text,
  add column google_lat      numeric(9,6),
  add column google_lng      numeric(9,6),
  add column google_at       timestamptz,
  add constraint location_google_point_whole
    check ((google_lat is null) = (google_lng is null)
       and (google_lat is null) = (google_at is null)
       and (google_place_id is null or google_lat is not null)),
  add constraint location_google_point_on_the_map
    check (google_lat is null
           or (google_lat between -90 and 90 and google_lng between -180 and 180
               and not (google_lat = 0 and google_lng = 0))),
  add constraint location_google_place_id_shape
    check (google_place_id is null
           or (btrim(google_place_id) <> '' and char_length(google_place_id) <= 512));

comment on column public.location.google_place_id is
  'Google''s ID for the place her address is (Places), kept for good (Service Specific '
  'Terms §3) — what her phone asks Google for when the point is refreshed. Written only '
  'by set_google_point. 0078, plan 10.5-i-b-i.';
comment on column public.location.google_lat is
  'Google''s point for her address — a 30-DAY COPY (SST §14.3, §6.3.1), cleared by '
  'forget_old_google_points every night once fetched more than 29 days ago, and when '
  'her address changes. ⚠️ FOR DRAWING ONLY, on a Google map: never filtered, sorted, '
  'grouped or counted on (ToS 3.2.3(c)(iv)). Her own pin (pin_lat) wins. 0078.';
comment on column public.location.google_lng is
  'The longitude of Google''s point for her address — see google_lat. 0078.';
comment on column public.location.google_at is
  'When Google''s point was fetched: the moment set_google_point ran, never a date a '
  'phone sends. The door hands the point out only while it is under 29 days old. 0078.';


-- ----------------------------------------------------------------------------
-- 2. The one way to write it
-- ----------------------------------------------------------------------------

create function public.set_google_point(
  p_location_id uuid,
  p_lat         numeric,
  p_lng         numeric,
  p_place_id    text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_location public.location%rowtype;
  v_place_id text := nullif(btrim(coalesce(p_place_id, '')), '');
begin
  if v_user is null then
    raise exception 'set_google_point requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;
  select * into v_location
    from public.location l
   where l.id = p_location_id
     and l.id in (select public.my_locations())
   for update;
  if not found or not public.has_role(v_location.workspace_id, 'owner') then
    raise exception 'set_google_point: only the owner of that kitchen writes its point'
      using errcode = 'TD012';
  end if;
  if not exists (select 1 from public.workspace w
                  where w.id = v_location.workspace_id and w.kind = 'cocina') then
    raise exception 'set_google_point: only a kitchen is drawn on Itacate''s map'
      using errcode = 'TD013';
  end if;
  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or (p_lat = 0 and p_lng = 0)
     or (v_place_id is not null and char_length(v_place_id) > 512) then
    raise exception 'set_google_point: a point is a latitude and a longitude on the map'
      using errcode = '22023';
  end if;

  perform set_config('tienda.writing_google_point', 'on', true);
  update public.location
     set google_place_id = v_place_id,
         google_lat      = round(p_lat, 6),
         google_lng      = round(p_lng, 6),
         google_at       = now()
   where id = v_location.id;
  perform set_config('tienda.writing_google_point', '', true);
end;
$$;

comment on function public.set_google_point(uuid, numeric, numeric, text) is
  'The owner of a kitchen writes Google''s point for her address (and Google''s ID for the '
  'place, when it has one), stamped now — a 30-day copy, refreshed by Wera Cocina while '
  'she uses it and cleared nightly. TD012: not the owner of that place; TD013: not a '
  'kitchen; 22023: not a point. 0078, plan 10.5-i-b-i, the owner''s ruling of 2026-11-04.';

revoke all on function public.set_google_point(uuid, numeric, numeric, text) from public, anon;
grant execute on function public.set_google_point(uuid, numeric, numeric, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Nothing else writes it — and her new address clears it
-- ----------------------------------------------------------------------------
-- ⚠️ `authenticated` holds UPDATE and INSERT on `location` (its row policies decide
-- whose), so without this a phone could write the four columns straight through
-- PostgREST — a point with a made-up date, kept past 30 days. The transaction-local
-- setting is `purging_workspace`'s pattern (`0053`): only the two functions below set
-- it, and no client can (PostgREST exposes no `set_config`).

create function public.location_google_point_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('tienda.writing_google_point', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.google_place_id is not null or new.google_lat is not null
       or new.google_lng is not null or new.google_at is not null then
      raise exception 'Google''s point is written only by set_google_point'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  if (new.google_place_id, new.google_lat, new.google_lng, new.google_at)
     is distinct from (old.google_place_id, old.google_lat, old.google_lng, old.google_at) then
    raise exception 'Google''s point is written only by set_google_point'
      using errcode = 'insufficient_privilege';
  end if;

  -- Her address changed: the copy was Google's answer for the old one.
  if (new.street, new.street_number, new.colonia, new.city, new.postal_code)
     is distinct from (old.street, old.street_number, old.colonia, old.city, old.postal_code) then
    new.google_place_id := null;
    new.google_lat      := null;
    new.google_lng      := null;
    new.google_at       := null;
  end if;
  return new;
end;
$$;

revoke all on function public.location_google_point_guard() from public, anon, authenticated;

create trigger location_google_point_guard_trg
  before insert or update on public.location
  for each row execute function public.location_google_point_guard();


-- ----------------------------------------------------------------------------
-- 4. The nightly clean-up — the project's first scheduled job
-- ----------------------------------------------------------------------------
-- ⚠️ 29 DAYS, NOT 30: the job runs once a night, so a point fetched just after one run
-- is next looked at a day later — clearing at 29 days keeps every copy under 30.

create function public.forget_old_google_points()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cleared integer;
begin
  perform set_config('tienda.writing_google_point', 'on', true);
  update public.location
     set google_place_id = null,
         google_lat      = null,
         google_lng      = null,
         google_at       = null
   where google_at < now() - interval '29 days';
  get diagnostics v_cleared = row_count;
  perform set_config('tienda.writing_google_point', '', true);
  return v_cleared;
end;
$$;

comment on function public.forget_old_google_points() is
  'Clears every Google point fetched more than 29 days ago, so none is kept 30 (SST '
  '§14.3, §6.3.1). Run every night by pg_cron (the job forget-old-google-points); granted '
  'to nobody. Returns how many places it cleared. 0078, plan 10.5-i-b-i.';

revoke all on function public.forget_old_google_points() from public, anon, authenticated;

-- Supabase's own instructions for the extension: in `pg_catalog`, its jobs in the
-- `cron` schema, run as the role that scheduled them.
create extension if not exists pg_cron with schema pg_catalog;

-- 09:17 UTC is 03:17 in Mexico City, the quietest hour. `cron.schedule` with a name
-- replaces a job of that name, so a second run of this file schedules nothing twice.
select cron.schedule('forget-old-google-points', '17 9 * * *',
                     'select public.forget_old_google_points()');


-- ----------------------------------------------------------------------------
-- 5. The one door
-- ----------------------------------------------------------------------------

create function public.on_offer_now()
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
             jsonb_build_object('lat', l.google_lat, 'lng', l.google_lng, 'source', 'google') as google_point
        from public.workspace w
        join lateral (
               select loc.*
                 from public.location loc
                where loc.workspace_id = w.id and loc.is_active
                order by loc.created_at, loc.id
                limit 1) l on true
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
             'on_offer', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'id', li.id,
                         'pickup_start', li.pickup_start,
                         'pickup_end', li.pickup_end,
                         'lines', (select jsonb_agg(jsonb_build_object(
                                            'line_no', ll.line_no, 'name', ll.name,
                                            'description', ll.description, 'tags', to_jsonb(ll.tags),
                                            'unit_price', ll.unit_price::text,
                                            'quantity', ll.quantity::text,
                                            'surprise', ll.surprise,
                                            'usual_price', ll.usual_price::text,
                                            'image_path', ll.image_path)
                                          order by ll.line_no)
                                     from public.listing_line ll
                                    where ll.listing_id = li.id))
                         order by li.pickup_start, li.id)
                  from public.listing li
                 where li.workspace_id = k.id
                   and li.withdrawn_at is null and li.pickup_end > now()), '[]'::jsonb),
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
  'withdrawn, its window not over) or published in the last 14 days — with its name, '
  'trade, address, directions, page, what it offers now line by line, a summary of what '
  'it usually publishes over four weeks, and the point to draw: her own pin, else Google''s '
  '30-day copy while under 29 days old, else none. For the pilot it takes no area: her '
  'phone works out distance and order. Never a cost, a member or a ledger row; money and '
  'quantities as decimal strings. 0078, plan 10.5-i-b-i, the owner''s rulings of '
  '2026-11-01 and 2026-11-04.';

revoke all on function public.on_offer_now() from public, anon;
grant execute on function public.on_offer_now() to authenticated;
