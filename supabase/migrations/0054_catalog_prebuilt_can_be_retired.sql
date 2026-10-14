-- ============================================================================
-- 0054 — a product that came with the app can be retired
-- ============================================================================
-- The owner's ruling of 2026-10-14, asked with its consequence before it was
-- built. ADR-035 §2.9 (the catalog, and the prebuilt rows a shop starts from).
--
-- ⚠️⚠️ WHAT CHANGED HIS MIND, IN ORDER. `0042` (2026-09-23) refused to let a shop
-- retire a product it did not create: *"to avoid them from deleting a product
-- they didn't create."* `0044`'s import therefore showed a list of every product
-- of a giro, all ticked, so a shop could untick what it does not sell BEFORE the
-- import, because afterwards it never could. On 2026-10-14 he found that list on
-- his own phone and ruled it out: *"just let the user pick one giro or more."*
-- Asked what then happens to the products a shop does not sell, he chose that
-- they can be retired later from Productos, like the shop's own.
--
-- Scope, deliberately narrow:
--   * public.catalog_prebuilt_stays() — the RETIRE branch is gone. Nothing else.
--
-- WHAT STILL HOLDS, unchanged from `0042` and `0053`:
--   * a prebuilt row is never DELETED, except inside `delete_my_account` purging
--     the one shop it belongs to (`purging_workspace`);
--   * a prebuilt row is never DEMOTED to the shop's (`is_prebuilt` true → false),
--     so the marker keeps saying where a row came from;
--   * retiring is `is_active = false`, as it is for the shop's own products, and
--     nothing in the app reactivates one. ⚠️ So a retired catalog product does not
--     come back by importing its giro again: `import_catalog` (`0044`) skips a
--     code the shop already holds, retired or not. That is the same one-way step a
--     shop's own product has always taken.
--   * who may retire is unchanged: `product_variant_update` and
--     `product_family_update` are manager-and-above (`0002`), so a cashier's
--     attempt still finds no row (200, zero rows).
-- ============================================================================

create or replace function public.catalog_prebuilt_stays()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_prebuilt
     and not public.purging_workspace(old.workspace_id) then
    raise exception 'a prebuilt % cannot be deleted: %',
      tg_table_name, coalesce(old.name, '(unnamed)')
      using errcode = 'restrict_violation';
  end if;

  -- 0054: retiring a prebuilt row is allowed (the owner, 2026-10-14). Only the
  -- marker itself is fenced: a row that came with the app stays marked as such.
  if tg_op = 'UPDATE' and old.is_prebuilt and not new.is_prebuilt then
    raise exception 'a prebuilt % cannot be reassigned to the shop: %',
      tg_table_name, coalesce(old.name, '(unnamed)')
      using errcode = 'restrict_violation';
  end if;

  return coalesce(new, old);
end;
$$;

comment on function public.catalog_prebuilt_stays() is
  'A row that came with the app (is_prebuilt) is never deleted (except while '
  'delete_my_account purges its shop) and never demoted to the shop''s. Since 0054 '
  'it CAN be retired (is_active false), like the shop''s own rows — the owner''s '
  'ruling of 2026-10-14, when onboarding stopped offering a per-product list. '
  'ADR-035 2.9.';
