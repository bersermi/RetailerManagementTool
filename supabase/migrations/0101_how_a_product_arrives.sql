-- ============================================================================
-- 0101 — how a product arrives: the pack's word beside what one holds
-- ============================================================================
-- docs/PLAN.md task `14.5` — Step 14, *La vitrina*. The owner's ruling of
-- 2026-11-27, call 10 on https://claude.ai/artifact/Q2P7djctMGK1VrmiigskEa:
-- **a pack word and what one holds, always in the unit the product is sold in**
-- (kilos for jitomate, pieces for lechuga), in `pack_size` and one new column. In
-- Comprar she says *Llegaron 2 cajas*, *trae cada caja ~13 kg*, *$209.30 la
-- caja*, and the phone sends 26 kg at $16.10 the kilo — `record_purchase` is
-- unchanged and never reads either column.
--
-- WHAT IS HERE:
--   * `pack_word` on `public.product_variant` and on `catalogo.product`: which
--     pack, as one of eight codes (`caja`, `arpilla`, `costal`, `bulto`, `reja`,
--     `docena`, `paquete`, `manojo_grande`) — the phone holds each word's
--     singular and plural, so *1 caja* and *2 cajas* are always spelled right.
--     Null is a product that arrives loose: what today's every row is.
--   * `pack_size` RE-READ, not altered: with a `pack_word`, it is how many of
--     the product's SELL units one pack holds (13 for a caja of jitomate sold by
--     the kilo, 12 for a docena of lechugas sold by the piece). ADR-035 §2.5
--     rule 1 holds — the ledger still stores base units only, because the phone
--     multiplies before it sends. `0002`'s comment said *base units per purchase
--     unit*, a figure no code ever read (`record_purchase` never did, `0047`);
--     every starter row buys, sells and prices in one unit, so on every row the
--     two readings name the same number.
--   * `import_catalog()` copies the word with the size, and `catalog_template()`
--     says it — each restated from its newest body (`0067`, `0072`) with that one
--     addition.
--
-- ⚠️ NOT HERE: the starter catalog's packs (the next snapshot, `0102`, generated
-- by `supabase/catalog/build.mjs` from the CSVs' new `pack_word` column), and the
-- shops already open (`0103`).
--
-- ⚠️ THE FIELD RULE (ADR-035 §2.2): two nullable columns added, two functions
-- `create or replace`d with their arguments, return types and settings — every
-- build in the field calls them as before and reads its keys by name, passing
-- over the new one. Nothing removed. The grants are restated where they are read.
-- ============================================================================

alter table public.product_variant
  add column pack_word text,
  add constraint product_variant_pack_word_known check (
    pack_word is null
    or pack_word in ('caja', 'arpilla', 'costal', 'bulto', 'reja', 'docena', 'paquete', 'manojo_grande'));

alter table catalogo.product
  add column pack_word text,
  add constraint product_pack_word_known check (
    pack_word is null
    or pack_word in ('caja', 'arpilla', 'costal', 'bulto', 'reja', 'docena', 'paquete', 'manojo_grande'));

comment on column public.product_variant.pack_size is
  'With pack_word: how many of the product''s SELL units one pack holds — 13 (kg) '
  'in a caja of jitomate, 12 (pza) in a docena of lechugas. Without one it means '
  'nothing, and 1 is the default. record_purchase never reads it: the phone '
  'multiplies and sends base units (0101, plan 14.5; it read "base units per '
  'purchase unit" until then, a figure no code used).';

comment on column public.product_variant.pack_word is
  'How the product arrives: caja, arpilla, costal, bulto, reja, docena, paquete or '
  'manojo_grande; null when it arrives loose. pack_size says what one holds. The '
  'owner''s ruling of 2026-11-27 (Step 14, call 10). 0101.';

comment on column catalogo.product.pack_size is
  'With pack_word: how many SELL units one pack holds — the best guess a shop '
  'corrects at its first delivery (Step 14, question C). Copied by import_catalog.';

comment on column catalogo.product.pack_word is
  'The pack the product usually arrives in, or null. Copied by import_catalog with '
  'pack_size. 0101.';

-- ----------------------------------------------------------------------------
-- Wera's door, restated from `0072` with ONE key added: `pack_word`.
-- ----------------------------------------------------------------------------
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
               'pack_word',     p.pack_word,
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

revoke all on function public.catalog_template() from public, anon;
grant execute on function public.catalog_template() to authenticated;

-- ----------------------------------------------------------------------------
-- The import, restated from `0067` with ONE change: the word travels with the size.
-- ----------------------------------------------------------------------------
create or replace function public.import_catalog(
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
  v_variant_id uuid;
  v_gross     boolean;
  v_today     date;
  v_priced    integer := 0;
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

  -- ⚠️ THE PRICE IS STORED AS THE SHOP KEYS IT, the app's `pricePerBase`: per
  -- BASE unit (a gram, a piece), gross when the shop's prices include IVA and net
  -- when they do not. From the shop's own TODAY, the earliest of its stores' —
  -- a UTC date would open it tomorrow for a shop importing after six at night.
  select w.prices_include_tax into v_gross from public.workspace w where w.id = p_workspace_id;
  select min((now() at time zone l.timezone)::date) into v_today
    from public.location l where l.workspace_id = p_workspace_id;
  v_today := coalesce(v_today, current_date);

  for r in
    select p.code, p.name, p.base_unit_code, p.purchase_unit_code,
           p.sell_unit_code, p.price_unit_code, p.pack_size, p.pack_word, p.tax_rate,
           p.suggested_price, pu.factor_to_base as price_factor,
           f.name as family_name, f.default_lifespan_days, f.track_expiry,
           u.dimension
      from catalogo.product p
      join catalogo.family  f on f.code = p.family_code
      join public.unit      u on u.code = p.base_unit_code
      join public.unit      pu on pu.code = p.price_unit_code
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
            sell_unit_code, price_unit_code, pack_size, pack_word, tax_rate,
            is_prebuilt, template_code)
    values (p_workspace_id, v_family_id, r.name, r.base_unit_code, r.purchase_unit_code,
            r.sell_unit_code, r.price_unit_code, r.pack_size, r.pack_word, r.tax_rate,
            true, r.code)
    -- Two imports racing for one shop: the loser skips instead of failing.
    on conflict do nothing
    returning id into v_variant_id;

    if found then
      v_imported := v_imported + 1;
      -- ⚠️ ONLY A PRODUCT THIS CALL CREATED gets a price: a skipped one is the
      -- shop's already, and its price is hers.
      if r.suggested_price is not null then
        insert into public.price_list
               (workspace_id, variant_id, location_id, price_per_base, effective_from)
        values (p_workspace_id, v_variant_id, null,
                round(case when v_gross then r.suggested_price
                           else r.suggested_price / (1 + r.tax_rate) end
                      / r.price_factor, 6),
                v_today);
        v_priced := v_priced + 1;
      end if;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped', v_skipped, 'priced', v_priced);
end;
$$;

revoke all on function public.import_catalog(uuid, text[], text[]) from public, anon;
grant execute on function public.import_catalog(uuid, text[], text[]) to authenticated;

comment on function public.import_catalog(uuid, text[], text[]) is
  'Copies every starter-catalog product carrying ANY of p_tags (minus p_exclude) '
  'into one shop as prebuilt rows with their template_code, each with its '
  'suggested price from the shop''s today (0067) and how it arrives — pack_word '
  'and pack_size (0101). Manager or owner only. A product already imported, or '
  'whose name the shop already has, or whose family there holds another '
  'dimension, is skipped and counted, and its price and pack left alone. Returns '
  '{imported, skipped, priced}. ADR-035 2.9, docs/PLAN.md 9a and 14.5.';
