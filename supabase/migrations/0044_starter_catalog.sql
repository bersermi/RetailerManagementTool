-- ============================================================================
-- 0044 — The starter catalog: where the template lives, and the import
-- ============================================================================
-- ADR-035 §2.9 (a shop STARTS from a catalog we maintain), §2.7 (access).
-- docs/PLAN.md task `9a`, `## Step 9`.
--
-- Scope:
--   * schema `catalogo` — tag, family, product, product_tag. Not exposed to
--     PostgREST, no grant to any client role.
--   * two trigger functions on the template — units and family dimension.
--   * public.product_variant.template_code — which template row a shop's
--     product was copied from, and a trigger that keeps it from changing.
--   * public.catalog_template()  — the whole template, as one JSON read.
--   * public.import_catalog()    — copies every product carrying a chosen tag.
--
-- ⚠️⚠️ NO CONTENT. The template is EMPTY after this file. The seven giros arrive
-- one migration each, generated from `supabase/catalog/<giro>.csv` (`9b`, then
-- `9c` and `9e`–`9j`, one session with the owner per giro).
--
-- ----------------------------------------------------------------------------
-- THE ASK, IN THE OWNER'S WORDS (2026-10-01)
-- ----------------------------------------------------------------------------
-- *"create a default catalog that the users can get access to depending on the
-- business they run, this will allow them to import products in bulk depending
-- on which business or categories they're interested in."* And on 2026-09-23,
-- the reason `0042` exists: *"each user can select the nature of his shop and
-- therefore import a set of products that he can also look at offline."*
--
-- ----------------------------------------------------------------------------
-- WHY A SCHEMA OF ITS OWN, AND NOT FOUR MORE TABLES IN `public`
-- ----------------------------------------------------------------------------
-- The template belongs to no workspace. `supabase/pgtap/01_rls_coverage.sql`
-- allows EXACTLY ONE table in `public` to go unscoped — `unit` (F3) — and exactly
-- one policy to reach for no tenancy helper (F5). Four template tables in
-- `public` would mean widening that exemption fourfold, and the guard is written
-- as a set precisely so that widening it is a decision rather than a habit.
--
-- `catalogo` is not in `config.toml`'s `[api] schemas`, and no client role holds
-- USAGE on it, so no client can read or write a template row directly. The only
-- doors are the two `security definer` functions below, which is the same shape
-- every `record_*` RPC already has. The guard is untouched and stays true.
--
-- ⚠️ COPIED, NEVER REFERENCED (§2.9). `import_catalog` INSERTS ordinary rows into
-- the shop's own `product_family` and `product_variant`; nothing in `public`
-- holds a foreign key into `catalogo`. That is what keeps one catalog per
-- workspace true, and it is also why OFFLINE NEEDS NOTHING NEW: an imported
-- product is a `product_variant` row like any other and reaches the phone
-- through the persisted `['catalog','variants']` read.
--
-- ----------------------------------------------------------------------------
-- WHY GIRO IS A TAG AND NOT A TABLE
-- ----------------------------------------------------------------------------
-- The giros overlap — *Huevo* is sold by an abarrotes, a cremería and a pollería
-- alike — and a product listed once per giro would be three template rows that
-- drift apart and three imports of the same thing. So a product is ONE row with
-- SEVERAL tags, and a giro is a tag of kind `giro`. Categories (`Lácteos`,
-- `Embutidos`) are tags of kind `categoria`, which is the "categories they're
-- interested in" half of the ask, with no second mechanism.
--
-- ⚠️ `kind` IS TEXT WITH A CHECK, NOT AN ENUM — `0042`'s argument: an enum crosses
-- the wire as a label, and a label is a bug no typecheck can see.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE ONE-WAY DOOR IN THIS FILE: `product_variant.template_code`
-- ----------------------------------------------------------------------------
-- Without it an imported row could never be traced to its template again — not
-- to give it its picture later (C8.14: pictures are our maintenance chore), not
-- to show a shop's products with their tags, and not to know what was already
-- imported when the shop adds a second giro. A shop that imports before this
-- column exists has rows that can never be told apart again, so it ships before
-- the first row of content does. Nullable: the shop's own products carry none.
--
-- It is a CODE and not a foreign key, on purpose: a key from `public` into
-- `catalogo` would let a template correction block on — or cascade into —
-- every shop that ever imported the row.
--
-- ----------------------------------------------------------------------------
-- WHAT THE TEMPLATE DOES NOT CARRY
-- ----------------------------------------------------------------------------
-- * NO PRICE. A price is a fact about one shop on one street. An imported product
--   reads *sin precio* until the shop prices it, which the app already draws. A
--   suggested price is an additive nullable column later.
-- * NO PICTURE YET — only `image_path`, the column C8.15 owes. The bucket, the
--   upload path and the phone's image cache are later work.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The schema, closed to every client role
-- ----------------------------------------------------------------------------

create schema catalogo;

comment on schema catalogo is
  'The starter catalog Wera maintains, by giro. Not exposed to PostgREST and not '
  'readable by any client role; reached only through public.catalog_template() '
  'and public.import_catalog(). Rows are COPIED into a workspace, never '
  'referenced. ADR-035 2.9, docs/PLAN.md Step 9.';

revoke all on schema catalogo from public;
revoke all on schema catalogo from anon, authenticated;

-- A code is a stable slug: what a shop's row remembers, and what the authoring
-- CSV keys its upserts on. Lower case, digits and single hyphens.
create function catalogo.is_code(p_code text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
$$;


-- ----------------------------------------------------------------------------
-- 2. Tags — giros and categories
-- ----------------------------------------------------------------------------

create table catalogo.tag (
  code          text primary key,
  kind          text not null,
  label         text not null,
  display_order smallint not null default 100,

  constraint tag_code_is_code  check (catalogo.is_code(code)),
  constraint tag_kind_known    check (kind in ('giro', 'categoria')),
  constraint tag_label_not_blank check (btrim(label) <> '')
);

comment on table catalogo.tag is
  'A giro (kind giro) or a category (kind categoria). A product carries several; '
  'an import takes every product carrying ANY of the chosen tags.';


-- ----------------------------------------------------------------------------
-- 3. Families — the substance, as in public.product_family
-- ----------------------------------------------------------------------------

create table catalogo.family (
  code                  text primary key,
  name                  text not null,
  normalized_name       text generated always as (public.normalize_name(name)) stored,
  default_lifespan_days integer,
  track_expiry          boolean not null default false,

  constraint family_code_is_code      check (catalogo.is_code(code)),
  constraint family_name_not_blank    check (btrim(name) <> ''),
  constraint family_lifespan_positive
    check (default_lifespan_days is null or default_lifespan_days > 0),
  -- The shop's own table is unique on (workspace, normalized_name), so two
  -- template families with one name would collapse into one on import.
  constraint family_name_unique unique (normalized_name)
);


-- ----------------------------------------------------------------------------
-- 4. Products — one future product_variant each
-- ----------------------------------------------------------------------------

create table catalogo.product (
  code               text primary key,
  family_code        text not null references catalogo.family (code) on update cascade,
  name               text not null,
  normalized_name    text generated always as (public.normalize_name(name)) stored,

  base_unit_code     text not null references public.unit (code),
  purchase_unit_code text not null references public.unit (code),
  sell_unit_code     text not null references public.unit (code),
  price_unit_code    text not null references public.unit (code),
  pack_size          numeric(14,3) not null default 1,
  tax_rate           numeric(5,4) not null default 0,

  -- C8.15: the column the picture will need. Null means initials (C8.14), which
  -- is a finished state and never "pending".
  image_path         text,
  display_order      integer not null default 100,

  constraint product_code_is_code       check (catalogo.is_code(code)),
  constraint product_name_not_blank     check (btrim(name) <> ''),
  constraint product_pack_size_positive check (pack_size > 0),
  constraint product_tax_rate_sane      check (tax_rate >= 0 and tax_rate < 1),
  constraint product_image_path_not_blank
    check (image_path is null or btrim(image_path) <> ''),
  -- Same reason as the family: the shop's table is unique on the name.
  constraint product_name_unique unique (normalized_name)
);

create index product_by_family_idx on catalogo.product (family_code);

-- ⚠️ THE SHOP'S OWN DIMENSION TRIGGER, REUSED RATHER THAN COPIED. It reads only
-- `new.name` and the four unit codes, which this table names identically, so
-- one function holds §2.5.2 for both tables and the two cannot drift.
create trigger product_units_same_dimension_trg
  before insert or update of base_unit_code, purchase_unit_code,
                             sell_unit_code, price_unit_code
  on catalogo.product
  for each row execute function public.product_variant_units_same_dimension();

-- ⚠️⚠️ TWO RULES THE SHOP'S TABLES DO NOT ENFORCE, ENFORCED HERE BECAUSE THIS IS
-- THE ONE PLACE THEY CAN BE MADE HARD.
--   * C8.5 — one family, one dimension. For a shop it is held only by the unit
--     picker; a template family spanning grams and pieces would hand every shop
--     that imports it a family no screen can draw.
--   * The base unit IS a base unit (g, ml, pza) — ADR-035 §2.5: the ledger stores
--     the smallest practical denomination, and a `kg` base would round.
create function catalogo.product_family_one_dimension()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_dim  public.unit_dimension;
  v_base text;
begin
  select u.dimension, u.base_code into v_dim, v_base
    from public.unit u where u.code = new.base_unit_code;

  if v_base is distinct from new.base_unit_code then
    raise exception 'template product %: base unit % is not a base unit (use %)',
      new.code, new.base_unit_code, v_base
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
      from catalogo.product p
      join public.unit u on u.code = p.base_unit_code
     where p.family_code = new.family_code
       and p.code <> new.code
       and u.dimension <> v_dim
  ) then
    raise exception 'template family %: product % is % and the family already holds another dimension',
      new.family_code, new.code, v_dim
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger product_family_one_dimension_trg
  before insert or update of family_code, base_unit_code
  on catalogo.product
  for each row execute function catalogo.product_family_one_dimension();

revoke all on function catalogo.product_family_one_dimension() from public;


-- ----------------------------------------------------------------------------
-- 5. Product ↔ tag
-- ----------------------------------------------------------------------------

create table catalogo.product_tag (
  product_code text not null references catalogo.product (code)
                 on update cascade on delete cascade,
  tag_code     text not null references catalogo.tag (code)
                 on update cascade on delete cascade,
  primary key (product_code, tag_code)
);

create index product_tag_by_tag_idx on catalogo.product_tag (tag_code);

-- No client role reaches any of it. `authenticated` has no USAGE on the schema,
-- which already refuses every statement; the table revokes say the same thing a
-- second time so a future `grant usage` alone does not open them.
revoke all on all tables in schema catalogo from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 6. The shop's row remembers where it came from
-- ----------------------------------------------------------------------------

alter table public.product_variant add column template_code text;

alter table public.product_variant
  add constraint product_variant_template_code_not_blank
  check (template_code is null or btrim(template_code) <> '');

-- One shop holds a template product at most once. Partial, because every
-- product the shop made itself carries null.
create unique index product_variant_template_code_unique
  on public.product_variant (workspace_id, template_code)
  where template_code is not null;

comment on column public.product_variant.template_code is
  'The catalogo.product this row was copied from by import_catalog(); null for '
  'a product the shop made. A code and not a foreign key, so a template '
  'correction never blocks on or cascades into a shop. Set once — see '
  'product_variant_template_code_stays. ADR-035 2.9.';

-- ⚠️ SET ONCE. The manager's update policy covers every column, so without this
-- a PATCH could re-point a product at another template row — and the picture
-- assigned to that row later would land on the wrong product in every shop.
-- Null → code is allowed (the same asymmetry `0042` gives the marker: it leaves
-- a future re-link a way in); code → anything else is refused.
create function public.product_variant_template_code_stays()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.template_code is not null
     and new.template_code is distinct from old.template_code then
    raise exception 'product %: where it was imported from cannot change',
      coalesce(old.name, '(unnamed)')
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger product_variant_template_code_stays_trg
  before update of template_code on public.product_variant
  for each row execute function public.product_variant_template_code_stays();

revoke all on function public.product_variant_template_code_stays() from public;


-- ----------------------------------------------------------------------------
-- 7. public.catalog_template() — the whole template, one read
-- ----------------------------------------------------------------------------
-- One JSON object, so the phone can persist it and draw the picker offline.
-- ⚠️ EVERY NUMBER IS TEXT, as `app/src/api/catalog.ts` asks for its own: a bare
-- numeric crosses PostgREST as a JSON number and becomes a double.
-- ⚠️ Readable by any signed-in person, member of a shop or not: the onboarding
-- picker is drawn for someone whose shop is being created.

create function public.catalog_template()
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
        from catalogo.tag t), '[]'::jsonb),
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

revoke all on function public.catalog_template() from public;
grant execute on function public.catalog_template() to authenticated;

comment on function public.catalog_template() is
  'The starter catalog: tags, families and products, each product with its tag '
  'codes, as one JSON object with every number as text. Read-only; the only door '
  'into catalogo besides import_catalog(). ADR-035 2.9, docs/PLAN.md 9a.';


-- ----------------------------------------------------------------------------
-- 8. public.import_catalog() — copy the chosen giros into one shop
-- ----------------------------------------------------------------------------
-- Every template product carrying ANY of `p_tags`, minus `p_exclude`, becomes a
-- `product_variant` of the shop with `is_prebuilt = true` and its
-- `template_code`. Its family is the shop's family of the same name if there is
-- one, otherwise a new prebuilt family.
--
-- ⚠️⚠️ A PRODUCT THAT CANNOT LAND IS SKIPPED, SILENTLY, AND COUNTED. Users don't
-- do bookkeeping — a shopkeeper adding Cremería to a Pollería is not asked about
-- *Huevo* twice. Skipped:
--   * already imported (its code is in the shop);
--   * the shop already has a product of that name — HIS row is left alone;
--   * the shop's family of that name holds another dimension (C8.5), or the
--     shop retired that family.
-- So a second import of the same giro imports nothing, and that is the test.
--
-- ⚠️ `p_exclude` IS THE MINIMUM CONTROL A LATER SCREEN NEEDS — a preview with
-- unticking — and it costs nothing now. It matters more than it looks: `0042`'s
-- fence means an imported product can NEVER be retired from the shop.
--
-- ⚠️ WORKSPACE-SCOPED AND MANAGER-FENCED, the `catalog` write policies' floor
-- (`product_variant_insert`): a cashier cannot import, and nobody imports into a
-- shop they are not a manager of. `security definer` because it must read
-- `catalogo`, which is exactly why the role check is written here by hand.
--
-- Returns {"imported": n, "skipped": n}.

create function public.import_catalog(
  p_workspace_id uuid,
  p_tags         text[],
  p_exclude      text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id   uuid := auth.uid();
  v_unknown   text[];
  v_family_id uuid;
  v_imported  integer := 0;
  v_skipped   integer := 0;
  r           record;
begin
  if v_user_id is null then
    raise exception 'import_catalog requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  if p_workspace_id is null or not public.has_role(p_workspace_id, 'manager') then
    raise exception 'only a manager or the owner of this shop can import products'
      using errcode = 'insufficient_privilege';
  end if;

  if p_tags is null or cardinality(p_tags) = 0 then
    raise exception 'choose at least one giro or category'
      using errcode = 'check_violation';
  end if;

  -- An unknown tag is a client bug, not an empty giro, and is said out loud.
  select array_agg(x order by x) into v_unknown
    from unnest(p_tags) as x
   where not exists (select 1 from catalogo.tag t where t.code = x);

  if v_unknown is not null then
    raise exception 'unknown tag(s): %', array_to_string(v_unknown, ', ')
      using errcode = 'check_violation';
  end if;

  for r in
    select p.code, p.name, p.base_unit_code, p.purchase_unit_code,
           p.sell_unit_code, p.price_unit_code, p.pack_size, p.tax_rate,
           f.name as family_name, f.default_lifespan_days, f.track_expiry,
           u.dimension
      from catalogo.product p
      join catalogo.family  f on f.code = p.family_code
      join public.unit      u on u.code = p.base_unit_code
     where exists (select 1 from catalogo.product_tag pt
                    where pt.product_code = p.code
                      and pt.tag_code = any (p_tags))
       and not (p.code = any (coalesce(p_exclude, '{}')))
     order by p.display_order, p.name
  loop
    -- Already imported, or a product of that name is already the shop's.
    if exists (select 1 from public.product_variant v
                where v.workspace_id = p_workspace_id
                  and (v.template_code = r.code
                       or v.normalized_name = public.normalize_name(r.name))) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_family_id := null;
    select pf.id into v_family_id
      from public.product_family pf
     where pf.workspace_id = p_workspace_id
       and pf.normalized_name = public.normalize_name(r.family_name);

    if v_family_id is null then
      insert into public.product_family
             (workspace_id, name, default_lifespan_days, track_expiry, is_prebuilt)
      values (p_workspace_id, r.family_name, r.default_lifespan_days, r.track_expiry, true)
      returning id into v_family_id;
    elsif not (select pf.is_active from public.product_family pf where pf.id = v_family_id)
       or exists (select 1
                    from public.product_variant v
                    join public.unit u on u.code = v.base_unit_code
                   where v.family_id = v_family_id
                     and u.dimension <> r.dimension) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.product_variant
           (workspace_id, family_id, name, base_unit_code, purchase_unit_code,
            sell_unit_code, price_unit_code, pack_size, tax_rate,
            is_prebuilt, template_code)
    values (p_workspace_id, v_family_id, r.name, r.base_unit_code, r.purchase_unit_code,
            r.sell_unit_code, r.price_unit_code, r.pack_size, r.tax_rate,
            true, r.code)
    -- Two imports racing for one shop: the loser skips instead of failing.
    on conflict do nothing;

    if found then
      v_imported := v_imported + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped', v_skipped);
end;
$$;

revoke all on function public.import_catalog(uuid, text[], text[]) from public;
grant execute on function public.import_catalog(uuid, text[], text[]) to authenticated;

comment on function public.import_catalog(uuid, text[], text[]) is
  'Copies every starter-catalog product carrying ANY of p_tags (minus p_exclude) '
  'into one shop as prebuilt rows with their template_code. Manager or owner '
  'only. A product already imported, or whose name the shop already has, or '
  'whose family there holds another dimension, is skipped and counted — a '
  'second import imports nothing. Returns {imported, skipped}. ADR-035 2.9, '
  'docs/PLAN.md 9a.';
