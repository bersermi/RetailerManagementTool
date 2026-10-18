-- ============================================================================
-- 0063 — PRODUCTOS, PART TWO: THE PHOTOS. Plan task `8o`, the owner's rulings
-- of 2026-10-17 over the canvas (*Productos · …*, *Las fotos · …*):
--
--   *"We'll give the photo of existing products, whoever creates a new
--   variant/family can provide his own photo or leave the photo with initials.
--   Photos stablished by Wera cannot be edited"*
--   *"users won't be able to edit the name on default products"*
--
-- and his *"approved"* on the database change the same day. C8.14 still holds:
-- a product with no photo wears its initials, a finished state, never *pending*.
--
-- ⚠️⚠️ TWO KINDS OF PHOTO, TWO STORES, AND THEY NEVER MIX.
--   * **Wera's**, of a product in the starter catalog: `catalogo.product.
--     image_path` (`0044` minted the column and left it empty), in the private
--     bucket `catalogo`, which every signed-in person reads — the same audience
--     as `catalog_template()` — and only the service role writes. One photo,
--     every shop that imported the product: the shop's row reaches it by
--     `template_code` (ADR-035 §2.9, *"that code is how a picture assigned later
--     finds its way to every shop's copy"*), through `catalog_image_path()`
--     below. Nothing is copied into a shop, so a photo Wera adds next month
--     reaches every shop on its next catalog read.
--   * **The shop's own**, of a product it created: `product_variant.image_path`,
--     in the private bucket `producto`, under the shop's own folder. Every member
--     reads it (the cashier sees it on Vender); owners and managers take it, as
--     they are the ones who create products (`product_variant_insert`).
--
-- ⚠️ A PATH NAMES A PICTURE, NOT A FILE. Each picture is two files made on the
-- phone, `<path>/160.jpg` for the lists and `<path>/720.jpg` for the product's
-- page; the column holds `<path>`. A new photo is a NEW path (a fresh uuid, or
-- for Wera a new hash), never an overwrite, so a phone that kept the old files
-- can never show them under the new name.
--
-- ⚠️⚠️ WERA'S PRODUCT KEEPS ITS NAME AND ITS PICTURE — a trigger, for the reason
-- `0042` gave its own: `product_variant_update` is a `using` clause over the
-- whole row, and a policy sees a ROW and never a TRANSITION. The same product
-- must stay re-priceable, retireable (`0054`) and movable to another aisle.
-- ⚠️ This REVERSES half of `0042`'s comment on `is_prebuilt` (*"a prebuilt row is
-- still renamed and repriced freely"*): the price stays free; the name does not.
-- `is_prebuilt` and not `template_code` is the marker, as the app's own lock is
-- (`8g`): 28 prebuilt products on the hosted project predate the template and
-- carry no code. They have no photo of Wera's to reach, so they wear initials.
--
-- ⚠️ THE AISLE HAS NO PHOTO COLUMN. Its picture is one of its products' — the app
-- decides which (`@/api/photos`) — because the owner's folders hold a photo per
-- product and none per aisle, and a column nothing writes is one nobody fills.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The shop's own photo of its own product
-- ----------------------------------------------------------------------------

alter table public.product_variant add column image_path text;

-- ⚠️ THE FIRST FOLDER IS THE ROW'S OWN SHOP, AND THE REST IS ONE UUID. Storage's
-- fence below reads the first folder, so a path naming another shop's folder
-- would be a picture this shop can neither upload nor read — and a path that is
-- not a uuid is a picture no phone ever made.
alter table public.product_variant
  add constraint product_variant_image_path_in_own_folder
  check (
    image_path is null
    or image_path ~ ('^' || workspace_id::text
                     || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  );

comment on column public.product_variant.image_path is
  'The shop''s own photo of a product it created: <workspace_id>/<uuid> in the '
  'private bucket producto, holding 160.jpg and 720.jpg. Null means initials '
  '(C8.14) — or, for a product from Wera''s catalog, Wera''s photo through '
  'catalog_image_path(). Never set on a prebuilt row (product_variant_wera_keeps). '
  '0063, plan 8o.';


-- ----------------------------------------------------------------------------
-- 2. A product from Wera's catalog keeps its name and its picture
-- ----------------------------------------------------------------------------

create function public.product_variant_wera_keeps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_prebuilt and new.name is distinct from old.name then
    raise exception 'a product from Wera''s catalog keeps its name: %', old.name
      using errcode = 'restrict_violation';
  end if;

  if old.is_prebuilt and new.image_path is distinct from old.image_path then
    raise exception 'a product from Wera''s catalog keeps Wera''s photo: %', old.name
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger product_variant_wera_keeps_trg
  before update of name, image_path on public.product_variant
  for each row execute function public.product_variant_wera_keeps();

comment on function public.product_variant_wera_keeps() is
  'Refuses renaming a prebuilt product or changing its photo (23001) — the '
  'owner''s rulings of 2026-10-17. Its price, IVA, aisle and is_active stay the '
  'shop''s. A trigger and not a policy because a using clause sees a row, not a '
  'transition. 0063, plan 8o.';

revoke all on function public.product_variant_wera_keeps() from public;

comment on column public.product_variant.is_prebuilt is
  'True when the row came from a catalog we maintain, false when the shopkeeper '
  'made it. Never demoted (catalog_prebuilt_stays); since 0054 it can be retired. '
  'Since 0063 its NAME and its PHOTO are Wera''s (product_variant_wera_keeps); '
  'it is still repriced freely, which is the reason for importing one. ADR-035 2.9.';


-- ----------------------------------------------------------------------------
-- 3. Wera's photo, as a column of the shop's own row
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ A COMPUTED COLUMN: PostgREST offers a function that takes the table's row
-- as a column of that table, so the catalog read asks for `catalog_image_path`
-- beside `image_path` and the phone persists both with the rest of the row —
-- offline included. ⚠️ THE THIRD DOOR INTO `catalogo` (ADR-035 §2.9 names two),
-- and as narrow as a door gets: one text, for the template code the caller's own
-- row already carries. `catalog_template()` hands the same path to any signed-in
-- person, so it reveals nothing new.

create function public.catalog_image_path(p_variant public.product_variant)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.image_path
    from catalogo.product p
   where p.code = p_variant.template_code
$$;

comment on function public.catalog_image_path(public.product_variant) is
  'Wera''s photo of the starter-catalog product this row was imported from — a '
  'path in the bucket catalogo — or null. A PostgREST computed column of '
  'product_variant. 0063, plan 8o; ADR-035 2.9.';

revoke all on function public.catalog_image_path(public.product_variant) from public;
grant execute on function public.catalog_image_path(public.product_variant) to authenticated;

comment on column catalogo.product.image_path is
  'Wera''s photo of this product: <code>/<hash> in the private bucket catalogo, '
  'holding 160.jpg and 720.jpg, written by the service role '
  '(docs/runbooks/catalog-photos.sh). Null means initials (C8.14). Every shop '
  'that imported the product reads it through public.catalog_image_path(). 0063.';


-- ----------------------------------------------------------------------------
-- 4. The two stores
-- ----------------------------------------------------------------------------

-- ⚠️ THE FIRST FOLDER IS A SHOP, AND THE CALLER HOLDS AT LEAST `p_min` IN IT —
-- `0060`'s `merma_path_ok` with the role as an argument, because this bucket has
-- two audiences: every member reads, a manager writes. A first folder that is
-- not a uuid is a plain `false`, never a cast error.
create function public.photo_folder_ok(p_name text, p_min public.workspace_role)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
           when split_part(coalesce(p_name, ''), '/', 1)
                ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
           then public.has_role(split_part(p_name, '/', 1)::uuid, p_min)
           else false
         end
$$;

comment on function public.photo_folder_ok(text, public.workspace_role) is
  'True when the first folder of a storage path is a shop where the caller holds '
  'at least the given role — the fence on the shop''s own product photos (bucket '
  'producto). 0063, plan 8o.';

revoke all on function public.photo_folder_ok(text, public.workspace_role) from public;
grant execute on function public.photo_folder_ok(text, public.workspace_role) to authenticated;

-- ⚠️ NO UPDATE AND NO DELETE POLICY ON EITHER BUCKET. A new photo is a new path,
-- so nothing is overwritten; Wera's are written by the service role, which RLS
-- does not reach. A shop's photos go with the shop, by hand, within 30 days —
-- what the aviso already says of Te lo compro's, and now of these.
do $fotos$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice '0063: no Storage here — the photo buckets are created where Storage runs';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('catalogo', 'catalogo', false),
         ('producto', 'producto', false)
  on conflict (id) do nothing;

  execute $p$
    create policy catalogo_select on storage.objects
      for select to authenticated
      using (bucket_id = 'catalogo')
  $p$;
  execute $p$
    create policy producto_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'producto' and public.photo_folder_ok(name, 'manager'))
  $p$;
  execute $p$
    create policy producto_select on storage.objects
      for select to authenticated
      using (bucket_id = 'producto' and public.photo_folder_ok(name, 'staff'))
  $p$;
end
$fotos$;
