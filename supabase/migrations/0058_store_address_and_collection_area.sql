-- ============================================================================
-- 0058 — THE STORE'S ADDRESS, AND WHERE *TE LO COMPRO* REACHES. Plan task `8j`,
-- the owner's rulings of 2026-10-16:
--
--   *"Let's incorporate the store address as part of the required fields. At
--   least Street, number, ciudad and Código Postal. I'll grab it from there for
--   now and we'll use Código Postal to enable or disable the collection
--   service. As for the available Código Postal for now, it will be two: 06400
--   and 06470."*
--
-- ⚠️⚠️ THE ADDRESS IS THE STORE'S (`location`), NOT THE SHOP'S (`workspace`).
-- A pickup happens at a door, and `location` is the door (ADR-035 §2.3:
-- conflating the two is a one-way door). A shop with two stores has two
-- addresses and may be inside the service area at one and not the other.
--
-- ⚠️ THE COLUMNS ARE NULLABLE, AND *REQUIRED* IS THE SHOP FORM'S RULE. Every
-- store created before 0058 has no address — the owner's own included — and a
-- NOT NULL here would refuse every one of them; so the form asks for the four
-- when a shop is created and Ajustes asks an existing shop for them (`8k`), and
-- `request_collection` (`0059`) refuses a store that has not given them. What
-- the database does insist on is that whatever IS written is well formed: no
-- blank strings, and a postal code of exactly five digits.
--
-- ⚠️ NO NEW RULE ABOUT WHO MAY WRITE IT: `location_update` (`0001`) already lets
-- the owner, and nobody else, change a store row. A manager may request a
-- pickup (`0059`) but cannot move the store.
--
-- ⚠️⚠️ THE SERVICE AREA IS WERA'S, NOT A SHOP'S, SO IT IS NOT IN `public`.
-- `supabase/pgtap/01_rls_coverage.sql` allows exactly one unscoped table there
-- (`unit`, F3) and one tenancy-free policy (F5), and `0044` already met this:
-- the starter catalog lives in `catalogo`, closed to every client role, reached
-- only through `security definer` functions. The area follows it exactly — a
-- schema of its own, `servicio`, not exposed to PostgREST, and ONE door:
-- `public.collection_reaches(postal_code)`, which answers yes or no for any
-- signed-in person (a phone must know whether to offer *Te lo compro* before
-- anybody asks). The guard is untouched and stays true.
--
-- ⚠️ ADDING A POSTAL CODE IS A ROW THE OWNER ADDS in the Supabase dashboard
-- (Table editor → schema `servicio`) or its SQL editor — never an app release.
-- ============================================================================

alter table public.location
  add column street        text,
  add column street_number text,
  add column colonia       text,
  add column city          text,
  add column postal_code   text;

alter table public.location
  add constraint location_street_not_blank
    check (street is null or btrim(street) <> ''),
  add constraint location_street_number_not_blank
    check (street_number is null or btrim(street_number) <> ''),
  add constraint location_colonia_not_blank
    check (colonia is null or btrim(colonia) <> ''),
  add constraint location_city_not_blank
    check (city is null or btrim(city) <> ''),
  -- ⚠️ FIVE DIGITS AND NOTHING ELSE — a Mexican código postal, leading zero and
  -- all (CDMX's start with 0, which is why this is text and never a number).
  add constraint location_postal_code_shape
    check (postal_code is null or postal_code ~ '^[0-9]{5}$');

comment on column public.location.street is
  'The store''s street — part of its address, for a Te lo compro pickup. 0058.';
comment on column public.location.street_number is
  'The store''s number on that street (exterior, with the interior if any). 0058.';
comment on column public.location.colonia is
  'The store''s colonia. Optional: the owner''s four required fields are street, '
  'number, city and postal code. 0058.';
comment on column public.location.city is
  'The store''s city or alcaldía. 0058.';
comment on column public.location.postal_code is
  'The store''s código postal, five digits. Decides whether Te lo compro is '
  'offered: it must be in collection_area. 0058.';


create schema servicio;

comment on schema servicio is
  'What Wera offers and where — not tenant data. Not exposed to PostgREST and not '
  'readable by any client role; reached only through public.collection_reaches(). '
  '0058, plan 8j.';

revoke all on schema servicio from public;
revoke all on schema servicio from anon, authenticated;

create table servicio.collection_area (
  postal_code text primary key,
  created_at  timestamptz not null default now(),
  constraint collection_area_postal_code_shape check (postal_code ~ '^[0-9]{5}$')
);

comment on table servicio.collection_area is
  'The códigos postales Te lo compro reaches. Edited by Wera''s owner in the '
  'dashboard; read only through public.collection_reaches(). 0058, plan 8j.';

-- ⚠️ THE OWNER'S TWO, 2026-10-16.
insert into servicio.collection_area (postal_code) values ('06400'), ('06470');


-- ----------------------------------------------------------------------------
-- The one door: does Te lo compro reach this código postal?
-- ----------------------------------------------------------------------------
-- ⚠️ A MALFORMED OR NULL CODE IS `false`, NOT AN ERROR: the phone asks before the
-- address is complete, and *not yet* is the honest answer to *no address*.
create function public.collection_reaches(p_postal_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(btrim(p_postal_code) ~ '^[0-9]{5}$', false)
     and exists (select 1 from servicio.collection_area a
                  where a.postal_code = btrim(p_postal_code))
$$;

comment on function public.collection_reaches(text) is
  'True when Te lo compro reaches this código postal (servicio.collection_area). '
  'False for anything else, including a malformed code. 0058, plan 8j.';

revoke all on function public.collection_reaches(text) from public;
grant execute on function public.collection_reaches(text) to authenticated;
