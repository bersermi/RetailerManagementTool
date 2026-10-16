-- ============================================================================
-- 0056 — A SHOP'S MAIN GIRO. Plan task `8g`, the owner's rulings of 2026-10-15/16.
--
-- *"When selecting the giro, the first giro a user picks is the 'Main' giro,
-- marked with a star … that's how the user gets the generic logo … I'd rather
-- have a main giro selected explicitly than making weights and calculations at
-- a product level."* Asked whether to store it on the shop (every phone of the
-- shop then draws the same picture) or on each phone (no migration, but a
-- cashier's phone would not know it), he answered: *"Yes, add the main giro to
-- the shop."*
--
-- ⚠️ ONE NULLABLE COLUMN, AND NO NEW RULE ABOUT WHO MAY DO WHAT. `workspace` is
-- already updatable by its OWNER and nobody else (`workspace_update`, `0001`:
-- `has_role(id, 'owner')`, and the table-level UPDATE grant covers a new
-- column). So the main giro is set exactly as the shop's name is: by the owner.
-- `supabase/tests/0056_workspace_main_giro.sql` drives a manager and a cashier
-- at it under `set role authenticated` and both are refused.
--
-- ⚠️ NULL IS A SHOP THAT HAS NOT CHOSEN — every shop made before this, and one
-- made with no giro at all. The app draws the shop's name alone then; nothing
-- is guessed (the product-counting rule this replaces is gone).
--
-- ⚠️ A GIRO AND NEVER A CATEGORY. The foreign key says the tag exists; the
-- CHECK says it is a giro by its code, which is how `0045`–`0052` name every
-- one (`giro-polleria` … `giro-materias-primas`) and how no category is named.
-- ⚠️ `on delete set null`: a giro withdrawn from the template leaves the shop
-- unchosen rather than blocking the withdrawal.
-- ============================================================================

alter table public.workspace
  add column giro_principal text
    references catalogo.tag (code) on delete set null,
  add constraint workspace_giro_principal_is_giro
    check (giro_principal is null or giro_principal like 'giro-%');

comment on column public.workspace.giro_principal is
  'The shop''s main giro (8g, 2026-10-16): the first giro chosen when the shop was '
  'created, changeable by the owner in Ajustes. It picks the drawing in the tab '
  'screens'' band. NULL = not chosen.';
