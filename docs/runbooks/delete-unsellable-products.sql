-- ---------------------------------------------------------------------------
-- DELETE THE PRODUCTS `Agregar` MADE BEFORE 2026-09-24, BECAUSE THEY CANNOT BE
-- SOLD. Ruled by the owner on 2026-09-24: *"Fix the form and delete and remake
-- them."*
--
-- ⚠️ THIS IS NOT A MIGRATION AND MUST NEVER BECOME ONE. It repairs ONE shop's
-- live rows, once, by hand. `supabase/migrations/` is append-only and describes
-- the SCHEMA; this describes an accident in the data and the owner's ruling
-- about it. Putting it there would run it against every future database,
-- including ones where these rows never existed.
--
-- WHAT WENT WRONG. `unitColumns` in `app/src/api/catalogWrite.ts` wrote the
-- picked unit into all four unit columns, so a product created at `$45 / 250 g`
-- carries `base_unit_code = '250g'`. `record_sale` (0016:217),
-- `record_purchase` (0018:265) and `record_transfer` (0020:355) each refuse a
-- line where `u.base_code <> pv.base_unit_code` — so those rows cannot be sold,
-- bought or moved. The form is fixed as of 2026-09-24; these rows are not, and
-- nothing in the app can delete them yet (`6c` is the row that restores that).
--
-- ⚠️ IT TOUCHES ONLY ROWS THAT ARE ACTUALLY BROKEN. A product priced in `g`,
-- `ml` or `pza` was always correct — those units ARE their own base — and the
-- prebuilt catalog was always correct too. Run step 1 and read it before step 2.
--
-- HOW TO RUN IT: paste into the Supabase SQL editor for the project, as the
-- owner. Step 1 is a read. Step 2 is wrapped in a transaction that ROLLS BACK
-- by default — change the last line to `commit;` once step 1's list is the list
-- you meant to delete.
-- ---------------------------------------------------------------------------

-- === STEP 1 — LOOK FIRST. What is broken, and is anything already sold? =====
select pv.id,
       w.display_name                          as shop,
       pf.name                                 as familia,
       pv.name,
       pv.price_unit_code                      as priced_per,
       pv.base_unit_code                       as says_stored_in,
       u.base_code                             as actually_stored_in,
       (select count(*) from public.sale_line     sl where sl.variant_id = pv.id) as sold,
       (select count(*) from public.purchase_line pl where pl.variant_id = pv.id) as bought
  from public.product_variant pv
  join public.unit           u  on u.code  = pv.price_unit_code
  join public.product_family pf on pf.id   = pv.family_id
  join public.workspace      w  on w.id    = pv.workspace_id
 where pv.base_unit_code <> u.base_code
 order by w.display_name, pf.name, pv.name;

-- ⚠️ IF `sold` OR `bought` IS ANYTHING BUT 0 ON ANY ROW, STOP AND SAY SO.
-- It should be impossible — those are the very calls that refuse these rows —
-- but a non-zero count means something recorded history against a product this
-- script is about to delete, and the delete would fail on the foreign key
-- anyway. That is a different problem and a different conversation.

-- === STEP 2 — DELETE THEM. Prices first; the family only if it empties. =====
begin;

create temporary table doomed on commit drop as
select pv.id, pv.family_id
  from public.product_variant pv
  join public.unit u on u.code = pv.price_unit_code
 where pv.base_unit_code <> u.base_code;

delete from public.price_list      where variant_id in (select id from doomed);
delete from public.product_variant where id         in (select id from doomed);

-- A family that exists only because a deleted product needed one goes too. A
-- family that still has products is left exactly as it was.
delete from public.product_family pf
 where pf.id in (select distinct family_id from doomed)
   and not exists (select 1 from public.product_variant pv where pv.family_id = pf.id);

-- ⚠️ READ THIS BEFORE CHANGING THE LAST LINE. `rollback` means the block above
-- ran and threw everything away — which is how you see it work without it
-- happening. Change to `commit;` when step 1's list is the list you meant.
rollback;
-- commit;
