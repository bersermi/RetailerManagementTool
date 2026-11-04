-- ============================================================================
-- 0076 — SLICE 2'S DATABASE, PART 1: EACH KITCHEN'S OWN PAGE, A PHOTO PER DISH,
-- AND THE BUCKET THEY LIVE IN. Plan task `10.5-i-a`.
--
-- The owner's ruling of 2026-11-01 on question 5 of the marketplace — proposal
-- B of https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu, *"Good, follow your
-- recommendations"*: in Wera Cocina, *Tu página en Itacate* — a cover photo,
-- her colour out of six, one sentence, her logo if she has one, a photo per
-- dish when she publishes, a default for every slot, and Wera's fixed layout.
-- The page's *What B costs*, which that answer ruled:
--
--   *"A kitchen_page row per kitchen (the sentence, the colour, the cover, the
--   logo), a photo on each listing_line, and a private photo store: written by
--   the kitchen's owner and managers in its own folder, read by anyone signed
--   in, never by anyone signed out (ADR-035 §2.7). The same shape as Wera's
--   product photos (0063)."*
--
-- and on Google, the same night: no import; an optional *Ver en Google Maps*
-- link the kitchen gives us.
--
-- WHAT IS HERE:
--   1. `kitchen_page` — one row per kitchen (a kitchen is a workspace), read by
--      her own kitchen's people. No row means every slot shows its default.
--   2. `set_kitchen_page` — the owner or a manager changes the fields she sends;
--      a field she leaves out stays as it is.
--   3. `listing_line.image_path`, and `publish_listing` reading it as one more
--      key of each line — its signature unchanged.
--   4. The bucket `cocina`: a kitchen's owner and managers put pictures into her
--      own folder; anyone signed in reads them while the kitchen exists; nobody
--      signed out reads anything; nothing is overwritten or deleted.
--   5. The owner's Discord account line names no app.
--
-- ⚠️⚠️ NOTHING HERE IS SHOWN TO A NEIGHBOUR YET, and no screen writes it. The
-- door that reads across kitchens (`10.5-i-b`, ADR-035 §2.7) is what will hand
-- a neighbour a kitchen's page and its paths; Wera Cocina's screen is `10.5-ii`,
-- and the aviso's sections on photos ship with it, before it applies.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`):
-- a table, a nullable column, functions, a bucket and two storage policies are
-- added; `publish_listing` and `servicio.aviso_cuenta_nueva` keep their
-- signatures and change their bodies. Nothing is dropped or renamed.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Two rules, each written once
-- ----------------------------------------------------------------------------
-- ⚠️ A PICTURE IS `<workspace_id>/<uuid>`, AS IN `0063`: the path names a folder
-- of files made on the phone (`0063`'s 160.jpg and 720.jpg; the files are the
-- app's to name), and a new photo is a new uuid, never an overwrite. The first
-- folder is the row's own business, because the bucket's fence reads it: a path
-- into another business's folder is a picture this kitchen could never have put
-- there. Three columns and two functions ask it, so it is one function.
create function public.picture_in_folder(p_path text, p_workspace_id uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_path ~ ('^' || p_workspace_id::text
                   || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
$$;

comment on function public.picture_in_folder(text, uuid) is
  'True when a picture''s path is <workspace_id>/<uuid> in that business''s own folder '
  '(0063''s shape). Asked by kitchen_page''s two pictures, listing_line.image_path, '
  'set_kitchen_page and publish_listing. Granted to nobody. 0076, plan 10.5-i-a.';

-- ⚠️ HER LINK MUST OPEN GOOGLE MAPS, because Itacate will show it as *Ver en
-- Google Maps* on her page, to every neighbour: a link anywhere else would be a
-- page we present as hers that is not Google's. So: https, and one of the
-- addresses Google Maps gives a place — the share button's `maps.app.goo.gl/…`
-- (every phone and the web since 2019), the older `goo.gl/maps/…`, a Business
-- Profile's `g.page/…`, and the long form in a browser's bar, `google.com/maps…`
-- or `maps.google.com…`, with `.mx` or without. The host is followed at once by
-- a path, so `google.com@other.site` and `maps.google.com.other.site` are not
-- Google's; only characters a URL carries; no `..` and no encoded dot, which a
-- browser would fold into another path of the same host. At most 1,000
-- characters (a place's long link runs to about 600).
-- ⚠️ WIDENING IT LATER IS FREE: a host added never refuses a build's link.
create function public.google_maps_link_ok(p_link text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_link is not null
     and char_length(p_link) <= 1000
     and p_link ~ ('^https://(maps\.app\.goo\.gl/|goo\.gl/maps/|g\.page/'
                   || '|(www\.)?google\.com(\.mx)?/maps([/?#]|$)'
                   || '|maps\.google\.com(\.mx)?([/?#]|$))'
                   || '[]A-Za-z0-9._~:/?#@!$&''()*+,;=%[-]*$')
     and position('..' in p_link) = 0
     and p_link !~* '%2e'
$$;

comment on function public.google_maps_link_ok(text) is
  'True when a link opens Google Maps: https, and maps.app.goo.gl, goo.gl/maps, g.page, '
  'google.com/maps or maps.google.com (with .mx or without), URL characters only, no '
  'dot segments, at most 1000 characters. Asked by kitchen_page.maps_link and '
  'set_kitchen_page. Granted to nobody. 0076, plan 10.5-i-a.';

revoke all on function public.picture_in_folder(text, uuid) from public, anon, authenticated;
revoke all on function public.google_maps_link_ok(text)     from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 1. kitchen_page — one row per kitchen
-- ----------------------------------------------------------------------------
-- ⚠️ ONE ROW PER KITCHEN, NOT PER PLACE: a kitchen is a workspace (ADR-035 §2.3),
-- and a fonda with two locations shows one page. ⚠️ NO ROW IS A PAGE: every
-- slot has a default (proposal B) — her trade's drawing on her trade's colour,
-- her initials — so a kitchen that never opens *Tu página en Itacate* has no
-- row, and the door reads one with a left join. Each NULL column is that slot's
-- default.
-- ⚠️ THE SIX COLOURS ARE CODES, as `listing_line.tags` are: Chile, Mole, Nopal,
-- Talavera, Cempasúchil and Jamaica are what she reads; the hues are the apps'.
-- A colour added later widens the check, which no build minds.
-- ⚠️ READ BY HER OWN KITCHEN'S PEOPLE ONLY — every member, the cook included,
-- as everyone there reads her publications. A neighbour reads it through the
-- door (`10.5-i-b`), never through a policy that names her (ADR-035 §2.7).
-- ⚠️ NO WRITE GRANT AT ALL: `set_kitchen_page` is the only way in, the shape
-- every `record_*` RPC has. ⚠️ IT GOES WITH ITS KITCHEN: the key cascades, so
-- `delete_my_account`'s purge of a sole owner's kitchen takes it along.
-- ⚠️ `updated_by` IS A PLAIN uuid, `0053`'s ruling: no key in `public` points at
-- a login.

create table public.kitchen_page (
  workspace_id  uuid primary key references public.workspace (id) on delete cascade,
  sentence      text,
  color         text,
  cover_path    text,
  logo_path     text,
  maps_link     text,
  updated_at    timestamptz not null default now(),
  updated_by    uuid not null,

  constraint kitchen_page_sentence_shape
    check (sentence is null
           or (btrim(sentence) <> '' and char_length(sentence) <= 100
               and sentence !~ '[\r\n]')),
  constraint kitchen_page_color_known
    check (color is null
           or color in ('chile', 'mole', 'nopal', 'talavera', 'cempasuchil', 'jamaica')),
  constraint kitchen_page_cover_in_own_folder
    check (cover_path is null or public.picture_in_folder(cover_path, workspace_id)),
  constraint kitchen_page_logo_in_own_folder
    check (logo_path is null or public.picture_in_folder(logo_path, workspace_id)),
  constraint kitchen_page_maps_link_is_google_maps
    check (maps_link is null or public.google_maps_link_ok(maps_link))
);

comment on table public.kitchen_page is
  'A kitchen''s own page in Itacate (proposal B, the owner''s ruling of 2026-11-01): '
  'one row per kitchen, every column optional — NULL is that slot''s default, and no '
  'row at all is a page of defaults. Read by the kitchen''s members; written only by '
  'set_kitchen_page (owner or manager). A neighbour reads it through the door '
  '(10.5-i-b). 0076, plan 10.5-i-a.';
comment on column public.kitchen_page.sentence is
  'One sentence about her kitchen, under her name: at most 100 characters, one line. '
  'NULL: none. 0076.';
comment on column public.kitchen_page.color is
  'Her colour, one of six codes: chile, mole, nopal, talavera, cempasuchil, jamaica '
  '(the hues are the apps''). NULL: her trade''s colour. 0076.';
comment on column public.kitchen_page.cover_path is
  'Her cover photo: <workspace_id>/<uuid> in the private bucket cocina. NULL: her '
  'trade''s drawing on her colour. 0076.';
comment on column public.kitchen_page.logo_path is
  'Her logo, if she has one: <workspace_id>/<uuid> in the bucket cocina. NULL: her '
  'initials on her colour. 0076.';
comment on column public.kitchen_page.maps_link is
  'Her own Google Maps link, shown as Ver en Google Maps (the owner''s ruling of '
  '2026-11-01: no import, an optional link the kitchen gives us). Only a link that '
  'opens Google Maps (google_maps_link_ok). NULL: none. 0076.';
comment on column public.kitchen_page.updated_by is
  'Who last changed the page: a plain uuid, no key (0053). 0076.';

alter table public.kitchen_page enable row level security;

create policy kitchen_page_select on public.kitchen_page
  for select to authenticated
  using (workspace_id in (select public.my_workspaces()));

revoke all on public.kitchen_page from anon, authenticated;
grant select on public.kitchen_page to authenticated;


-- ----------------------------------------------------------------------------
-- 2. set_kitchen_page — the owner or a manager changes what she sends
-- ----------------------------------------------------------------------------
-- ⚠️ ONE OBJECT OF THE FIELDS TO CHANGE, NOT ONE ARGUMENT PER FIELD: a key she
-- leaves out stays as it is, a key sent as null clears it. So when a later
-- migration adds a section to every page, a build that does not know it never
-- sends it — and never erases what a newer build saved there. Keys it does not
-- know are ignored, as `publish_listing`'s lines do. Blank text is none.
--
-- THE REFUSALS, IN THE ORDER SHE MEETS THEM:
--   42501  not signed in; the kitchen is not hers; she is not its owner or a
--          manager (question 3: the owner and a manager publish)
--   TD013  the business is a shop — only a kitchen has a page (`0072`'s code)
--   22023  anything malformed: not an object; a field that is not text; a
--          sentence over 100 characters or on two lines; a colour off the six;
--          a picture not in her own folder; a link that does not open Google Maps
--
--   {"sentence": "Comida casera desde 1998.", "color": "chile",
--    "cover_path": "<workspace>/<uuid>", "logo_path": null,
--    "maps_link": "https://maps.app.goo.gl/…"}
--
-- It answers with the page as saved.
create function public.set_kitchen_page(p_workspace_id uuid, p_page jsonb)
returns public.kitchen_page
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_kind     public.workspace_kind;
  v_key      text;
  v_sentence text;
  v_color    text;
  v_cover    text;
  v_logo     text;
  v_link     text;
  v_row      public.kitchen_page%rowtype;
begin
  if v_user is null then
    raise exception 'set_kitchen_page requires an authenticated caller'
      using errcode = '42501';
  end if;
  if p_workspace_id is null or not public.has_role(p_workspace_id, 'manager') then
    raise exception 'set_kitchen_page: only the owner or a manager of that kitchen sets its page'
      using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = p_workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'set_kitchen_page: only a kitchen has a page' using errcode = 'TD013';
  end if;

  if p_page is null or jsonb_typeof(p_page) <> 'object' then
    raise exception 'set_kitchen_page: the page is an object of the fields to change'
      using errcode = '22023';
  end if;
  foreach v_key in array array['sentence', 'color', 'cover_path', 'logo_path', 'maps_link']
  loop
    if p_page ? v_key and jsonb_typeof(p_page -> v_key) not in ('string', 'null') then
      raise exception 'set_kitchen_page: % is text, or null to clear it', v_key
        using errcode = '22023';
    end if;
  end loop;

  v_sentence := nullif(btrim(coalesce(p_page ->> 'sentence', '')), '');
  v_color    := nullif(btrim(coalesce(p_page ->> 'color', '')), '');
  v_cover    := nullif(btrim(coalesce(p_page ->> 'cover_path', '')), '');
  v_logo     := nullif(btrim(coalesce(p_page ->> 'logo_path', '')), '');
  v_link     := nullif(btrim(coalesce(p_page ->> 'maps_link', '')), '');

  if v_sentence is not null and (char_length(v_sentence) > 100 or v_sentence ~ '[\r\n]') then
    raise exception 'set_kitchen_page: the sentence is one line of at most 100 characters'
      using errcode = '22023';
  end if;
  if v_color is not null
     and v_color not in ('chile', 'mole', 'nopal', 'talavera', 'cempasuchil', 'jamaica') then
    raise exception 'set_kitchen_page: the colour is one of chile, mole, nopal, talavera, cempasuchil, jamaica'
      using errcode = '22023';
  end if;
  if v_cover is not null and not public.picture_in_folder(v_cover, p_workspace_id) then
    raise exception 'set_kitchen_page: the cover is a picture in this kitchen''s own folder'
      using errcode = '22023';
  end if;
  if v_logo is not null and not public.picture_in_folder(v_logo, p_workspace_id) then
    raise exception 'set_kitchen_page: the logo is a picture in this kitchen''s own folder'
      using errcode = '22023';
  end if;
  if v_link is not null and not public.google_maps_link_ok(v_link) then
    raise exception 'set_kitchen_page: the link is one that opens Google Maps (https://maps.app.goo.gl/…)'
      using errcode = '22023';
  end if;

  insert into public.kitchen_page as k
    (workspace_id, sentence, color, cover_path, logo_path, maps_link, updated_at, updated_by)
  values
    (p_workspace_id, v_sentence, v_color, v_cover, v_logo, v_link, now(), v_user)
  on conflict (workspace_id) do update
     set sentence   = case when p_page ? 'sentence'   then excluded.sentence   else k.sentence   end,
         color      = case when p_page ? 'color'      then excluded.color      else k.color      end,
         cover_path = case when p_page ? 'cover_path' then excluded.cover_path else k.cover_path end,
         logo_path  = case when p_page ? 'logo_path'  then excluded.logo_path  else k.logo_path  end,
         maps_link  = case when p_page ? 'maps_link'  then excluded.maps_link  else k.maps_link  end,
         updated_at = now(),
         updated_by = v_user
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.set_kitchen_page(uuid, jsonb) is
  'The owner or a manager of a kitchen changes her page: the fields sent are set (null '
  'or blank clears one), the fields left out stay, unknown keys are ignored. Answers '
  'with the page as saved. 42501 / TD013 (a shop) / 22023 — see 0076. Plan 10.5-i-a.';


-- ----------------------------------------------------------------------------
-- 3. A photo per dish: `listing_line.image_path`, read by `publish_listing`
-- ----------------------------------------------------------------------------
-- ⚠️ ONE MORE KEY OF EACH LINE, `image_path`, so the signature stays and every
-- build in the field still answers: a build that sends no photo publishes as it
-- did. *Repetir* sends yesterday's path again — a dish she sells every week is
-- photographed once.
alter table public.listing_line add column image_path text;

alter table public.listing_line
  add constraint listing_line_image_path_in_own_folder
  check (image_path is null or public.picture_in_folder(image_path, workspace_id));

comment on column public.listing_line.image_path is
  'The dish''s photo, if she took one: <workspace_id>/<uuid> in the private bucket '
  'cocina. NULL: her kitchen''s drawing. Proposal B, 2026-11-01. 0076, plan 10.5-i-a.';

-- The body is `0072`'s, with the photo checked beside the other keys and written
-- with the line. Everything else is character for character.
--
-- Each line, as the phone sends it (keys it does not know are ignored):
--   {"id": uuid (optional), "name": "Comida corrida", "description": "…",
--    "tags": ["pica"], "unit_price": "65.00", "quantity": 4,
--    "surprise": false, "usual_price": "120.00", "image_path": "<workspace>/<uuid>"}
create or replace function public.publish_listing(
  p_id           uuid,
  p_location_id  uuid,
  p_pickup_start timestamptz,
  p_pickup_end   timestamptz,
  p_lines        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_loc       public.location%rowtype;
  v_kind      public.workspace_kind;
  v_existing  public.listing%rowtype;
  v_line      jsonb;
  v_n         integer;
  v_i         integer := 0;
  v_name      text;
  v_desc      text;
  v_tags      text[];
  v_price     numeric;
  v_usual     numeric;
  v_qty       numeric;
  v_surprise  boolean;
  v_line_id   uuid;
  v_photo     text;
  v_known     constant text[] := array['pica', 'cerdo', 'mariscos', 'cacahuate', 'lacteos', 'gluten'];
begin
  if v_user is null then
    raise exception 'publish_listing requires an authenticated caller'
      using errcode = '42501';
  end if;
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'publish_listing: that kitchen is not one of yours'
      using errcode = '42501';
  end if;

  select * into v_loc from public.location l where l.id = p_location_id;

  if not public.has_role(v_loc.workspace_id, 'manager') then
    raise exception 'publish_listing: only the owner or a manager publishes'
      using errcode = '42501';
  end if;

  select w.kind into v_kind from public.workspace w where w.id = v_loc.workspace_id;
  if v_kind is distinct from 'cocina' then
    raise exception 'publish_listing: only a kitchen publishes' using errcode = 'TD013';
  end if;

  if p_id is null then
    raise exception 'publish_listing: the phone must make the publication''s id'
      using errcode = '22023';
  end if;

  -- A retry of a publication already recorded is that publication.
  select * into v_existing from public.listing x where x.id = p_id;
  if found then
    if v_existing.workspace_id is distinct from v_loc.workspace_id then
      raise exception 'publish_listing: that id is not this kitchen''s'
        using errcode = '42501';
    end if;
    return v_existing.id;
  end if;

  if p_pickup_start is null or p_pickup_end is null
     or p_pickup_end <= p_pickup_start
     or p_pickup_end <= now()
     or p_pickup_start > now() + interval '24 hours'
     or p_pickup_end - p_pickup_start > interval '12 hours' then
    raise exception 'publish_listing: the window must be a window of at most twelve '
                    'hours that has not ended and starts within a day'
      using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception 'publish_listing: the lines are a list' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(p_lines);
  if v_n < 1 or v_n > 10 then
    raise exception 'publish_listing: one to ten lines, not %', v_n using errcode = '22023';
  end if;

  -- Every line is checked before anything is written.
  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_i := v_i + 1;
    if jsonb_typeof(v_line) <> 'object' then
      raise exception 'publish_listing: line % is not an object', v_i using errcode = '22023';
    end if;
    begin
      v_name  := nullif(btrim(coalesce(v_line ->> 'name', '')), '');
      v_price := (v_line ->> 'unit_price')::numeric;
      v_qty   := (v_line ->> 'quantity')::numeric;
      v_usual := (v_line ->> 'usual_price')::numeric;
      v_line_id := (v_line ->> 'id')::uuid;
    exception when others then
      raise exception 'publish_listing: line % has a value that is not a number or an id', v_i
        using errcode = '22023';
    end;
    if v_name is null or char_length(v_name) > 80 then
      raise exception 'publish_listing: line % needs a name of at most 80 characters', v_i
        using errcode = '22023';
    end if;
    if char_length(btrim(coalesce(v_line ->> 'description', ''))) > 200 then
      raise exception 'publish_listing: line %''s description is over 200 characters', v_i
        using errcode = '22023';
    end if;
    if v_price is null or v_price <= 0 or v_price <> round(v_price, 2) or v_price >= 100000 then
      raise exception 'publish_listing: line %''s price is pesos and centavos above zero', v_i
        using errcode = '22023';
    end if;
    if v_qty is null or v_qty <> trunc(v_qty) or v_qty < 1 or v_qty > 999 then
      raise exception 'publish_listing: line %''s count is a whole number from 1 to 999', v_i
        using errcode = '22023';
    end if;
    if v_usual is not null
       and (v_usual <= v_price or v_usual <> round(v_usual, 2) or v_usual >= 100000) then
      raise exception 'publish_listing: line %''s usual price is pesos and centavos above its price', v_i
        using errcode = '22023';
    end if;
    if v_line ? 'surprise' and jsonb_typeof(v_line -> 'surprise') not in ('boolean', 'null') then
      raise exception 'publish_listing: line %''s surprise is yes or no', v_i using errcode = '22023';
    end if;
    if v_line ? 'tags' and jsonb_typeof(v_line -> 'tags') not in ('array', 'null') then
      raise exception 'publish_listing: line %''s tags are a list', v_i using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(
                 case jsonb_typeof(v_line -> 'tags') when 'array' then v_line -> 'tags' else '[]'::jsonb end) t
                where jsonb_typeof(t) <> 'string' or not (t #>> '{}') = any (v_known)) then
      raise exception 'publish_listing: line % carries a tag that is not on the list', v_i
        using errcode = '22023';
    end if;
    -- New in 0076: the dish's photo, a picture in this kitchen's own folder.
    if v_line ? 'image_path' and jsonb_typeof(v_line -> 'image_path') not in ('string', 'null') then
      raise exception 'publish_listing: line %''s photo is a path, or null', v_i using errcode = '22023';
    end if;
    v_photo := nullif(btrim(coalesce(v_line ->> 'image_path', '')), '');
    if v_photo is not null and not public.picture_in_folder(v_photo, v_loc.workspace_id) then
      raise exception 'publish_listing: line %''s photo is not a picture in this kitchen''s own folder', v_i
        using errcode = '22023';
    end if;
  end loop;

  insert into public.listing (id, workspace_id, location_id, pickup_start, pickup_end, created_by)
  values (p_id, v_loc.workspace_id, v_loc.id, p_pickup_start, p_pickup_end, v_user);

  v_i := 0;
  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_i := v_i + 1;
    v_desc := nullif(btrim(coalesce(v_line ->> 'description', '')), '');
    select coalesce(array_agg(distinct t #>> '{}' order by t #>> '{}'), '{}')
      into v_tags
      from jsonb_array_elements(
             case jsonb_typeof(v_line -> 'tags') when 'array' then v_line -> 'tags' else '[]'::jsonb end) t;
    v_surprise := coalesce((v_line ->> 'surprise')::boolean, false);
    v_photo := nullif(btrim(coalesce(v_line ->> 'image_path', '')), '');

    insert into public.listing_line
      (id, listing_id, workspace_id, location_id, line_no, name, description, tags,
       unit_price, quantity, surprise, usual_price, image_path)
    values
      (coalesce((v_line ->> 'id')::uuid, gen_random_uuid()), p_id, v_loc.workspace_id, v_loc.id,
       v_i, btrim(v_line ->> 'name'), v_desc, v_tags,
       (v_line ->> 'unit_price')::numeric, (v_line ->> 'quantity')::numeric, v_surprise,
       (v_line ->> 'usual_price')::numeric, v_photo);
  end loop;

  return p_id;
end;
$$;

comment on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb) is
  'A kitchen publishes: one pickup window at one of her kitchens and one to ten '
  'lines, each a dish or a surprise bag, each with a photo in her own folder if she '
  'took one (0076). Owner or manager (question 3). The id is the phone''s; a retry '
  'returns it. 42501 / TD013 (a shop) / 22023 — see 0072 and 0076. Plan 10.4a.';


-- ----------------------------------------------------------------------------
-- 4. The bucket `cocina`
-- ----------------------------------------------------------------------------
-- ⚠️ `0063`'S SHAPE, WITH TWO DIFFERENCES THAT EACH KEEP A PROMISE:
--   * **anyone signed in reads it** — the owner's ruling: her cover, logo and
--     dish photos are seen by every signed-in neighbour, the same audience as
--     her pin — ⚠️ **but only while the first folder is a kitchen that exists.**
--     A shop's photos leave everyone's reach the moment it is deleted, because
--     `producto`'s read asks for a membership the purge removes; Wera's aviso
--     promises exactly that (section 6). A read that asked only for an account
--     would keep a deleted kitchen's photos open to anyone holding a path —
--     and a neighbour's phone holds them. The purge deletes the kitchen's
--     workspace row (`0073`), so asking for the row is asking whether it exists.
--   * **the folder must be a kitchen's**, to write as to read: a shop's owner is
--     an owner too, and `photo_folder_ok` alone would let her put files here
--     that nobody could ever read.
-- ⚠️ IT READS `workspace` PAST ITS POLICY — a neighbour belongs to nothing, so
-- `workspace_select` shows her no row — and answers one boolean about the first
-- folder of a path: whether it names a kitchen that exists. It is granted to
-- `authenticated` because Storage runs the policy as the caller.
create function public.kitchen_folder_ok(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when split_part(coalesce(p_name, ''), '/', 1)
                ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
           then exists (select 1
                          from public.workspace w
                         where w.id = split_part(p_name, '/', 1)::uuid
                           and w.kind = 'cocina'
                           and w.is_active)
           else false
         end
$$;

comment on function public.kitchen_folder_ok(text) is
  'True when the first folder of a storage path is a kitchen that exists — the fence '
  'on the bucket cocina, to read as to write. Reads workspace past its policy and '
  'answers one boolean. 0076, plan 10.5-i-a.';

revoke all on function public.kitchen_folder_ok(text) from public, anon;
grant execute on function public.kitchen_folder_ok(text) to authenticated;

-- ⚠️ PICTURES ONLY, AND SMALL: the phone makes every file (`0063`'s are JPEGs of
-- 160 and 720 pixels), and this is the first bucket that nearly anyone may write
-- to — anyone can open a kitchen — and everyone signed in reads. So JPEG, PNG or
-- WebP and at most 2 MB a file: never a page, a script or an SVG served from the
-- project's address. Widening either later is free.
-- ⚠️ NO UPDATE AND NO DELETE POLICY: a new photo is a new path, so nothing is
-- overwritten; a kitchen's photos go with the kitchen, out of reach at once and
-- by hand within 30 days, as a shop's do.
do $fotos$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice '0076: no Storage here — the bucket cocina is created where Storage runs';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('cocina', 'cocina', false, 2097152,
          array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

  execute $p$
    create policy cocina_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'cocina'
                  and public.photo_folder_ok(name, 'manager')
                  and public.kitchen_folder_ok(name))
  $p$;
  execute $p$
    create policy cocina_select on storage.objects
      for select to authenticated
      using (bucket_id = 'cocina' and public.kitchen_folder_ok(name))
  $p$;
end
$fotos$;


-- ----------------------------------------------------------------------------
-- 5. The owner's Discord account line names no app
-- ----------------------------------------------------------------------------
-- One login, three apps (ADR-035 §2.2 and §2.7): the database cannot tell which
-- app made an account, and from slice 2 a neighbour signs up in Itacate, so the
-- line stops saying *en Wera*. Still naming nobody (`0070`): how she signed up
-- and a count. The body is `0070`'s with those two words gone.
create or replace function servicio.aviso_cuenta_nueva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_via   text;
  v_total bigint;
begin
  v_via := case new.raw_app_meta_data ->> 'provider'
             when 'email'  then 'con correo'
             when 'google' then 'con Google'
             when 'apple'  then 'con Apple'
             else null
           end;
  select count(*) into v_total from auth.users;

  perform servicio.avisar_a_wera(format(
    '👤 Nueva cuenta%s. Ya son %s cuentas.',
    case when v_via is null then '' else ' (' || v_via || ')' end,
    v_total));
  return null;
exception when others then
  raise warning 'servicio.aviso_cuenta_nueva: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;

revoke all on function servicio.aviso_cuenta_nueva() from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 6. The walls (`supabase/pgtap/_walls.sql` names the two a signed-in person
--    executes: the page's door, and the bucket's fence)
-- ----------------------------------------------------------------------------
revoke all on function public.set_kitchen_page(uuid, jsonb) from public, anon;
grant execute on function public.set_kitchen_page(uuid, jsonb) to authenticated;
