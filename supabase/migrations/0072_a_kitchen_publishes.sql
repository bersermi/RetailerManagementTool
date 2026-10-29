-- ============================================================================
-- 0072 — SLICE 1 OF THE MARKETPLACE: A KITCHEN PUBLISHES AN ITACATE.
-- Plan task `10.4a`, built from the owner's answers to the marketplace drawing
-- (https://claude.ai/artifact/J6tJmX3xCVEMLuc5z2ydsy, plan `10.3`):
--
--   (1) 2026-10-28: *"For now we will consider individual accounts per business
--       type."* — one kind per account, `tienda` or `cocina`.
--   (2) 2026-10-29: *"B, and yes to the directions line"* — a publication holds
--       one or more lines, each a dish or a surprise bag with an optional usual
--       price; the kitchens' trades are a giro list of their own that Wera never
--       offers a shop; one optional line of directions beside the pin.
--   (3) 2026-10-28: *"Agree."* — the owner and a manager publish and withdraw.
--   (4) 2026-10-28: the exact pin, shown before a reservation as after (that
--       half is the door, `10.5`; this file only stores the pin).
--
-- WHAT IS HERE, IN THE DRAWING'S ORDER:
--   1. `workspace.kind` — `tienda` | `cocina`, every existing account `tienda`,
--      set when the account is made and never changed.
--   2. The kitchens' trades: nine `catalogo.tag` giros marked `for_kind =
--      'cocina'`, kept out of `catalog_template()` (Wera's door) and served by
--      `kitchen_giros()` (Cocina's); a business's main giro must be of its kind.
--   3. `location.pin_lat`, `pin_lng` and `directions`, and `set_store_pin`.
--   4. `listing` and `listing_line`, read at the member's own kitchens.
--   5. `publish_listing` and `withdraw_listing`.
--   6. `onboard_workspace` gains `p_kind`, defaulting to `tienda`.
--   7. The owner's Discord line says *cocina* for a kitchen.
--
-- ⚠️⚠️ NOTHING HERE IS SHOWN TO A NEIGHBOUR. The door that reads across kitchens
-- (`on_offer_now`, ADR-035 §2.7) is slice 2's. Until it exists a listing is
-- readable by its own kitchen's members and nobody else, and the pin by the
-- store's members, exactly as the address is.
--
-- ⚠️ EVERY BUILD IN THE FIELD KEEPS WORKING (ADR-035 §2.2, `field-rule.sh`):
-- this file adds a type, columns with defaults or none required, tables,
-- functions, and one defaulted argument; the only function it drops is
-- `onboard_workspace`, re-created at once with the old three arguments first
-- and the same grants (`0064`'s move). Wera's builds call it with three names,
-- and PostgREST finds the four-argument function by them.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The account's kind
-- ----------------------------------------------------------------------------
-- ⚠️ AN ENUM, SO THE FIELD RULE HOLDS ITS LABELS: a label can be added later
-- (another kind of account) and never removed or renamed, which is what the
-- drawing told the owner, and `field-rule.sh` turns a removed label red.
-- ⚠️ IT SAYS WHICH APP OPENS THE ACCOUNT AND NOTHING ELSE. A restaurant, a
-- panadería or a chain is `cocina`: the trade is the giro (section 2) and the
-- size is the number of `location`s (proposal B's three things kept apart).

create type public.workspace_kind as enum ('tienda', 'cocina');

comment on type public.workspace_kind is
  'Which app a business account opens in: tienda (Wera) or cocina (Wera Cocina). '
  'One per account, set when it is made (onboard_workspace) and never changed. '
  '0072, plan 10.4a; the owner''s answer to question 1 of the marketplace drawing.';

alter table public.workspace
  add column kind public.workspace_kind not null default 'tienda';

comment on column public.workspace.kind is
  'tienda or cocina — which app opens this account. Every account made before 0072 '
  'is tienda. Set by onboard_workspace; workspace_kind_never_changes refuses an '
  'update. The trade is giro_principal; the branches are location rows. 0072.';

-- ⚠️ NEVER CHANGES, AND THE DATABASE SAYS SO. `workspace_update` (`0001`) lets
-- the owner update her row, and the table-level UPDATE grant reaches every
-- column, this one included. A shop that became a kitchen would keep a
-- shop's products, sales and staff under an app that shows none of them.
create function public.workspace_kind_never_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind then
    raise exception 'an account''s kind never changes (it is %)', old.kind
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger workspace_kind_never_changes
  before update of kind on public.workspace
  for each row execute function public.workspace_kind_never_changes();


-- ----------------------------------------------------------------------------
-- 2. The kitchens' trades, a giro list of their own
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ WERA NEVER OFFERS THESE TO A SHOP, and three things make that true:
--   * `catalog_template()` — the only door Wera reads giros through — returns
--     the shops' tags alone from here on;
--   * every Wera build in the field already filtered them twice over: its
--     import picker drops a giro that brings no products (`giroChoices`, and a
--     kitchen trade carries none), and Ajustes offers a fixed seven (`GIROS`);
--   * `workspace_giro_fits_kind` refuses a main giro of the other kind, so the
--     rule is the database's and not only the screens'.
-- ⚠️ THEY ARE GIRO TAGS so that `workspace.giro_principal` holds a kitchen's
-- trade as it holds a shop's — the drawing's *"the trade stays in the giro you
-- already have"* — under its foreign key and its `giro-%` check, unchanged.
-- ⚠️ ROWS, NOT A COLUMN'S VALUES: adding *Restaurante* or renaming *Fonda* later
-- is a row the owner edits in the dashboard (schema `catalogo`), as the
-- proposals page told him. The labels are the page's starting list, from
-- INEGI's classes as DENUE uses them.

alter table catalogo.tag
  add column for_kind public.workspace_kind not null default 'tienda',
  add constraint tag_for_kind_cocina_is_giro
    check (for_kind = 'tienda' or kind = 'giro');

comment on column catalogo.tag.for_kind is
  'Whose list this tag is on: tienda (Wera''s giros and categories) or cocina (the '
  'kitchens'' trades, giros only). catalog_template() returns tienda''s; '
  'kitchen_giros() returns cocina''s. 0072, plan 10.4a.';

insert into catalogo.tag (code, kind, label, display_order, for_kind) values
  ('giro-fonda',              'giro', 'Fonda o cocina económica',          10, 'cocina'),
  ('giro-restaurante',        'giro', 'Restaurante',                       20, 'cocina'),
  ('giro-cafeteria',          'giro', 'Cafetería',                         30, 'cocina'),
  ('giro-panaderia',          'giro', 'Panadería y pastelería',            40, 'cocina'),
  ('giro-comida-para-llevar', 'giro', 'Comida para llevar',                50, 'cocina'),
  ('giro-rosticeria',         'giro', 'Rosticería, pizzas y hamburguesas', 60, 'cocina'),
  ('giro-taqueria',           'giro', 'Taquería',                          70, 'cocina'),
  ('giro-antojitos',          'giro', 'Antojitos',                         80, 'cocina'),
  ('giro-mariscos',           'giro', 'Mariscos',                          90, 'cocina');

-- Wera's door, restated from `0044` with ONE clause added: `where t.for_kind =
-- 'tienda'`. ⚠️ `create or replace` keeps the grants, and the signature and the
-- return type are unchanged, so every Wera build calls it as before.
create or replace function public.catalog_template()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object(
               'code', t.code, 'kind', t.kind, 'label', t.label)
             order by t.kind, t.display_order, t.label)
        from catalogo.tag t
       where t.for_kind = 'tienda'), '[]'::jsonb),
    'families', coalesce((
      select jsonb_agg(jsonb_build_object('code', f.code, 'name', f.name)
             order by f.name)
        from catalogo.family f), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
               'code',          p.code,
               'family',        p.family_code,
               'name',          p.name,
               'base_unit',     p.base_unit_code,
               'purchase_unit', p.purchase_unit_code,
               'sell_unit',     p.sell_unit_code,
               'price_unit',    p.price_unit_code,
               'pack_size',     p.pack_size::text,
               'tax_rate',      p.tax_rate::text,
               'image_path',    p.image_path,
               'tags', coalesce((
                 select jsonb_agg(pt.tag_code order by pt.tag_code)
                   from catalogo.product_tag pt
                  where pt.product_code = p.code), '[]'::jsonb))
             order by p.display_order, p.name)
        from catalogo.product p), '[]'::jsonb)
  )
$$;

-- Cocina's door: the trades a kitchen picks from when she makes her account,
-- so it answers any signed-in person, before she belongs to anything.
create function public.kitchen_giros()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'label', t.label)
                            order by t.display_order, t.label), '[]'::jsonb)
    from catalogo.tag t
   where t.for_kind = 'cocina' and t.kind = 'giro'
$$;

comment on function public.kitchen_giros() is
  'The kitchens'' trades, in their order: [{code, label}]. The list Wera Cocina '
  'offers when a kitchen is made; Wera never sees it (catalog_template). 0072.';

-- A business's main giro is one of its own kind's. ⚠️ `security definer`
-- because `catalogo` is closed to the client roles; a trigger function needs no
-- EXECUTE grant to fire, so it is granted to nobody.
-- ⚠️ A CODE THE TEMPLATE DOES NOT HAVE IS LEFT TO THE FOREIGN KEY, which refuses
-- it with `23503` as it has since `0056` (that suite holds it): this trigger runs
-- BEFORE the key is checked, and judging an unknown code here would change the
-- answer an old call gets. It refuses only a real giro of the other kind.
create function public.workspace_giro_fits_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.giro_principal is not null
     and exists (select 1 from catalogo.tag t where t.code = new.giro_principal)
     and not exists (
       select 1 from catalogo.tag t
        where t.code = new.giro_principal
          and t.kind = 'giro'
          and t.for_kind = new.kind) then
    raise exception 'giro % is not a % giro', new.giro_principal, new.kind
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger workspace_giro_fits_kind
  before insert or update of giro_principal, kind on public.workspace
  for each row execute function public.workspace_giro_fits_kind();


-- ----------------------------------------------------------------------------
-- 3. The pin, and its one line of directions
-- ----------------------------------------------------------------------------
-- ⚠️ ON `location`, BECAUSE THE PIN IS A DOOR (ADR-035 §2.3, as the address in
-- `0058`): a chain's three kitchens are three pins. ⚠️ SIX DECIMALS, about 11 cm
-- — finer than a phone measures, so the precision the owner asked for is in how
-- the pin is set (her tap on the satellite view), not in the column. ⚠️ STORED
-- ONCE AND EXACT: his answer to question 4 removed the drawing's blurred copy.
-- ⚠️ NO MAP EXTENSION: two numbers; the neighbour's phone works out distances
-- (question 6, `10.5`).

alter table public.location
  add column pin_lat    numeric(9,6),
  add column pin_lng    numeric(9,6),
  add column directions text;

alter table public.location
  add constraint location_pin_whole
    check ((pin_lat is null) = (pin_lng is null)),
  add constraint location_pin_on_earth
    check (pin_lat between -90 and 90 and pin_lng between -180 and 180),
  add constraint location_directions_one_line
    check (directions is null
           or (btrim(directions) <> '' and char_length(directions) <= 140
               and directions !~ '[\r\n]'));

comment on column public.location.pin_lat is
  'Where the store or kitchen hands things over: latitude, six decimals. NULL until '
  'set; set with pin_lng (location_pin_whole). Written through set_store_pin. 0072.';
comment on column public.location.pin_lng is
  'The pin''s longitude, six decimals. See pin_lat. 0072.';
comment on column public.location.directions is
  'One optional line beside the pin: "Portón verde, junto a la farmacia". At most '
  '140 characters, one line. The owner''s yes of 2026-10-29. 0072.';

-- ⚠️ THE OWNER SETS IT — the drawing's *"the kitchen's owner sets her pin"*.
-- `set_store_address`'s shape and its refusal: `TD012` for a store she cannot
-- see or a caller who is not its owner; `22023` for a pin that is not one.
-- ⚠️ IT DOES NOT ASK THE KIND. A shop's pin stored is a shop's pin SHOWN only
-- through a door, and the only door (`10.5`) reads kitchens; a shop's opt-in
-- for *Ofrecer* is `10.0b`'s. No Wera build calls this.
create function public.set_store_pin(
  p_location_id uuid,
  p_lat         numeric,
  p_lng         numeric,
  p_directions  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_location   public.location%rowtype;
  v_directions text := nullif(btrim(coalesce(p_directions, '')), '');
begin
  if v_user is null then
    raise exception 'set_store_pin requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_location
    from public.location l
   where l.id = p_location_id
     and l.id in (select public.my_locations())
   for update;

  if not found or not public.has_role(v_location.workspace_id, 'owner') then
    raise exception 'set_store_pin: only the owner of that store sets its pin'
      using errcode = 'TD012';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90 or p_lng not between -180 and 180
     or (p_lat = 0 and p_lng = 0) then
    raise exception 'set_store_pin: a pin is a latitude and a longitude on the map'
      using errcode = '22023';
  end if;

  if v_directions is not null
     and (char_length(v_directions) > 140 or v_directions ~ '[\r\n]') then
    raise exception 'set_store_pin: the directions are one line of at most 140 characters'
      using errcode = '22023';
  end if;

  update public.location
     set pin_lat    = round(p_lat, 6),
         pin_lng    = round(p_lng, 6),
         directions = v_directions
   where id = v_location.id;
end;
$$;

comment on function public.set_store_pin(uuid, numeric, numeric, text) is
  'The owner sets where her store or kitchen hands things over, and one optional '
  'line of directions (blank = none). Rounds to six decimals. TD012: not her '
  'store, or not its owner; 22023: not a pin, or directions too long. 0072.';


-- ----------------------------------------------------------------------------
-- 4. What a kitchen publishes
-- ----------------------------------------------------------------------------
-- ⚠️ `sale`/`sale_line`'s shape (`0003`): the line carries the header's
-- workspace and location, a composite key ties the three, and both are read
-- AT THE MEMBER'S OWN KITCHENS — `location_id in my_locations()`, so a cook
-- assigned to one branch of a chain does not enumerate another's (`0001`'s
-- rule for every store-bound row), while the owner and a manager see all.
-- ⚠️ NO WRITE GRANT AT ALL: `publish_listing` and `withdraw_listing` are the
-- only way in, the shape every `record_*` RPC has.
-- ⚠️ ON OFFER MEANS: not withdrawn, the window has not ended, and something is
-- left. *Left* is counted from the reservations (`10.5b`); none exist yet.
-- ⚠️ `created_by` IS A PLAIN uuid, `0053`'s ruling: no key in `public` points at
-- a login. ⚠️ BOTH TABLES GO WITH THEIR KITCHEN: every key cascades, so
-- `delete_my_account`'s purge of a sole owner's kitchen takes them along.

create table public.listing (
  id            uuid primary key,
  workspace_id  uuid not null references public.workspace (id) on delete cascade,
  location_id   uuid not null,
  pickup_start  timestamptz not null,
  pickup_end    timestamptz not null,
  created_by    uuid not null,
  created_at    timestamptz not null default now(),
  withdrawn_at  timestamptz,

  constraint listing_window check (pickup_end > pickup_start),
  constraint listing_location_fk
    foreign key (location_id, workspace_id)
    references public.location (id, workspace_id) on delete cascade,
  constraint listing_id_scope_unique unique (id, workspace_id, location_id)
);

create index listing_by_kitchen_idx
  on public.listing (workspace_id, created_at desc);

comment on table public.listing is
  'One publication: a pickup window at one kitchen, with one or more lines. Written '
  'only by publish_listing (the id is the phone''s) and withdraw_listing. On offer '
  'while not withdrawn, before pickup_end, and with something left. 0072, plan 10.4a.';
comment on column public.listing.withdrawn_at is
  'When the kitchen took it down; NULL while it stands. 0072.';

create table public.listing_line (
  id            uuid primary key,
  listing_id    uuid not null,
  workspace_id  uuid not null,
  location_id   uuid not null,
  line_no       smallint not null,
  name          text not null,
  description   text,
  tags          text[] not null default '{}',
  unit_price    numeric(12,2) not null,
  quantity      numeric(12,3) not null,
  surprise      boolean not null default false,
  usual_price   numeric(12,2),

  constraint listing_line_header_fk
    foreign key (listing_id, workspace_id, location_id)
    references public.listing (id, workspace_id, location_id) on delete cascade,
  constraint listing_line_number_unique unique (listing_id, line_no),
  constraint listing_line_number_positive check (line_no >= 1),
  constraint listing_line_name_shape
    check (btrim(name) <> '' and char_length(name) <= 80),
  constraint listing_line_description_shape
    check (description is null
           or (btrim(description) <> '' and char_length(description) <= 200)),
  -- ⚠️ THE DRAWING'S FIXED LIST, as codes: pica, cerdo, mariscos, cacahuate,
  -- lácteos, gluten. A tag added later widens this check, which no build minds.
  constraint listing_line_tags_known
    check (tags <@ array['pica', 'cerdo', 'mariscos', 'cacahuate', 'lacteos', 'gluten']::text[]),
  constraint listing_line_price_positive check (unit_price > 0),
  constraint listing_line_quantity_positive check (quantity > 0),
  constraint listing_line_usual_above_price
    check (usual_price is null or usual_price > unit_price)
);

comment on table public.listing_line is
  'What a publication offers: a dish or, with surprise, a bag whose contents vary. '
  'unit_price is what the buyer pays for one, IVA included; usual_price the "vale" '
  'shown beside it. quantity is how many were offered (fractions allowed, for a '
  'shop''s Ofrecer later). line_no keeps her order. 0072, plan 10.4a.';
comment on column public.listing_line.surprise is
  'A surprise bag rather than a dish: the name says what kind of food, the '
  'description what it usually holds. Proposal B, 2026-10-29. 0072.';
comment on column public.listing_line.usual_price is
  'What it is usually worth, IVA included — the "vale" — so the saving shows. '
  'Optional; above unit_price when given. Proposal B, 2026-10-29. 0072.';

alter table public.listing      enable row level security;
alter table public.listing_line enable row level security;

create policy listing_select on public.listing
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

create policy listing_line_select on public.listing_line
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

revoke all on public.listing      from anon, authenticated;
revoke all on public.listing_line from anon, authenticated;
grant select on public.listing      to authenticated;
grant select on public.listing_line to authenticated;


-- ----------------------------------------------------------------------------
-- 5. publish_listing and withdraw_listing
-- ----------------------------------------------------------------------------
-- ⚠️ ONE CALL PUBLISHES THE WINDOW AND ITS LINES TOGETHER, and the phone makes
-- the id: a publication sent twice — a retry over a bad connection — is one
-- publication, returned rather than refused and never compared (nothing is
-- computed from it). ⚠️ A NEW PUBLICATION, NOT AN EDIT: to change what she
-- offers she withdraws and publishes again, which *Repetir* starts from.
--
-- THE REFUSALS, IN THE ORDER SHE MEETS THEM:
--   42501  not signed in; the kitchen is not hers; she is not its owner or a
--          manager (question 3); the id belongs to another business
--   TD013  the business is a shop — only a kitchen publishes until a shop's
--          *Ofrecer* is built (`10.0b`)
--   22023  anything malformed: no id; a window that is not one, has ended,
--          starts more than a day ahead or lasts more than twelve hours; no
--          lines or more than ten; a line with no name, a price that is not
--          pesos and centavos above zero, a count that is not a whole number
--          from 1 to 999, a usual price not above the price, a tag off the list
--
-- Each line, as the phone sends it (keys it does not know are ignored):
--   {"id": uuid (optional), "name": "Comida corrida", "description": "…",
--    "tags": ["pica"], "unit_price": "65.00", "quantity": 4,
--    "surprise": false, "usual_price": "120.00"}
create function public.publish_listing(
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

    insert into public.listing_line
      (id, listing_id, workspace_id, location_id, line_no, name, description, tags,
       unit_price, quantity, surprise, usual_price)
    values
      (coalesce((v_line ->> 'id')::uuid, gen_random_uuid()), p_id, v_loc.workspace_id, v_loc.id,
       v_i, btrim(v_line ->> 'name'), v_desc, v_tags,
       (v_line ->> 'unit_price')::numeric, (v_line ->> 'quantity')::numeric, v_surprise,
       (v_line ->> 'usual_price')::numeric);
  end loop;

  return p_id;
end;
$$;

comment on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb) is
  'A kitchen publishes: one pickup window at one of her kitchens and one to ten '
  'lines, each a dish or a surprise bag. Owner or manager (question 3). The id is '
  'the phone''s; a retry returns it. 42501 / TD013 (a shop) / 22023 — see 0072. '
  'Plan 10.4a.';

-- ⚠️ WITHDRAWN ONCE: a second call keeps the first moment, so a retry never
-- moves it. ⚠️ SLICE 3 WIDENS THIS BODY — withdrawing will cancel the open
-- reservations — and its signature stays.
create function public.withdraw_listing(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_listing public.listing%rowtype;
begin
  if v_user is null then
    raise exception 'withdraw_listing requires an authenticated caller'
      using errcode = '42501';
  end if;

  select * into v_listing
    from public.listing x
   where x.id = p_id
     and x.location_id in (select public.my_locations())
   for update;

  if not found or not public.has_role(v_listing.workspace_id, 'manager') then
    raise exception 'withdraw_listing: only the owner or a manager of that kitchen withdraws'
      using errcode = '42501';
  end if;

  update public.listing
     set withdrawn_at = now()
   where id = v_listing.id
     and withdrawn_at is null;
end;
$$;

comment on function public.withdraw_listing(uuid) is
  'The owner or a manager takes a publication down. Withdrawn once; a retry keeps '
  'the first moment. 42501 for anyone else. 0072, plan 10.4a.';


-- ----------------------------------------------------------------------------
-- 6. onboard_workspace gains the account's kind
-- ----------------------------------------------------------------------------
-- ⚠️ A NEW ARGUMENT IS A NEW SIGNATURE, so it is DROPPED and CREATED — never an
-- overload (ADR-035 §2.2; `_walls.sql` refuses two functions with one name).
-- The drop takes the grants; they are re-issued below. The body is `0039`'s,
-- character for character, with the kind written into the insert.
-- ⚠️ A KITCHEN IS MADE EXACTLY AS A SHOP IS — its owner, its settings, its first
-- location named after it, and the generic provider (harmless: nothing in Cocina
-- reads it, and a kitchen that buys from shops later will want it).

drop function public.onboard_workspace(text, boolean, text);

create function public.onboard_workspace(
  p_display_name       text,
  p_prices_include_tax boolean default true,
  p_location_name      text default null,
  p_kind               public.workspace_kind default 'tienda'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id      uuid := auth.uid();
  v_workspace_id uuid;
  -- R4: `display_name` means the SHOP three lines below and the PERSON here, in
  -- one function body. The local is named for the person so the two never read
  -- as one thing; the COLUMN keeps its name, which is right on each table.
  v_person_name  text;
begin
  if v_user_id is null then
    raise exception 'onboard_workspace requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  if btrim(coalesce(p_display_name, '')) = '' then
    raise exception 'workspace display name is required'
      using errcode = 'check_violation';
  end if;

  -- New in 0027. The kind, new in 0072; NULL is not a kind.
  insert into public.workspace (display_name, prices_include_tax, code, kind)
  values (btrim(p_display_name), p_prices_include_tax,
          public.generate_workspace_code(), coalesce(p_kind, 'tienda'))
  returning id into v_workspace_id;

  v_person_name := public.auth_full_name(v_user_id);

  insert into public.workspace_member (workspace_id, user_id, role, display_name)
  values (v_workspace_id, v_user_id, 'owner', v_person_name);

  insert into public.workspace_setting (workspace_id)
  values (v_workspace_id);

  insert into public.location (workspace_id, name)
  values (v_workspace_id, btrim(coalesce(p_location_name, p_display_name)));

  -- New in 0002. ⚠️ Renamed in 0039 on the owner's ruling of 2026-09-24: the row
  -- is the ABSENCE of a counterparty, not a description of how the goods were
  -- bought. See 0039's header.
  insert into public.provider (workspace_id, name, is_generic)
  values (v_workspace_id, 'Genérico', true);

  return v_workspace_id;
end;
$$;

comment on function public.onboard_workspace(text, boolean, text, public.workspace_kind) is
  'Creates a business account — a shop (tienda, the default, which every Wera build '
  'gets by sending three arguments) or a kitchen (cocina, Wera Cocina) — with its '
  'owner membership, its settings, its first location and its generic provider '
  '(Genérico, 0039), atomically. The kind never changes after. ADR-035 §2.3; 0072.';


-- ----------------------------------------------------------------------------
-- 7. The owner's Discord line says *cocina* for a kitchen
-- ----------------------------------------------------------------------------
-- ADR-035 §2.2 named it: until now a new kitchen would have arrived as *Nueva
-- tienda en Wera*, and counted as one. Still naming nobody (`0070`): the kind
-- and a count. The account line (*Nueva cuenta en Wera*) is unchanged — the
-- database cannot tell which app made a login; slice 2 rewords it.
create or replace function servicio.aviso_tienda_nueva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint;
begin
  select count(*) into v_total
    from public.workspace w
   where w.is_active and w.kind = new.kind;

  if new.kind = 'cocina' then
    perform servicio.avisar_a_wera(format(
      '🍲 Nueva cocina en Wera Cocina. Ya son %s cocinas.', v_total));
  else
    perform servicio.avisar_a_wera(format(
      '🏪 Nueva tienda en Wera. Ya son %s tiendas.', v_total));
  end if;
  return null;
exception when others then
  raise warning 'servicio.aviso_tienda_nueva: % (%)', sqlerrm, sqlstate;
  return null;
end;
$$;


-- ----------------------------------------------------------------------------
-- 8. The walls (`supabase/pgtap/_walls.sql` names the four doors a client calls)
-- ----------------------------------------------------------------------------
revoke all on function public.workspace_kind_never_changes() from public, anon, authenticated;
revoke all on function public.workspace_giro_fits_kind()     from public, anon, authenticated;

revoke all on function public.kitchen_giros() from public, anon;
grant execute on function public.kitchen_giros() to authenticated;

revoke all on function public.set_store_pin(uuid, numeric, numeric, text) from public, anon;
grant execute on function public.set_store_pin(uuid, numeric, numeric, text) to authenticated;

revoke all on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb) to authenticated;

revoke all on function public.withdraw_listing(uuid) from public, anon;
grant execute on function public.withdraw_listing(uuid) to authenticated;

revoke all on function public.onboard_workspace(text, boolean, text, public.workspace_kind) from public, anon;
grant execute on function public.onboard_workspace(text, boolean, text, public.workspace_kind) to authenticated;
