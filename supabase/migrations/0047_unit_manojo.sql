-- ============================================================================
-- 0047 — `manojo`, the bunch. Plan task `9f` (Verdulería), ruled by the owner
-- 2026-10-02: herbs are bought, sold and priced by the manojo.
-- ============================================================================
-- A count unit equal to one `pza`: stock of cilantro is counted in bunches, and
-- the base stays `pza` so the ledger needs nothing new. The unit's word reads
-- *manojo* through `ES.units` in the app.
--
-- ⚠️ IT IS NOT A PACK. A manojo is one piece, so `factor_to_base` is 1 and no
-- conversion is involved. `caja` was asked for in the same session and NOT added:
-- `record_purchase` multiplies by `factor_to_base` alone and never reads
-- `pack_size`, and a box's weight differs by product and by delivery. Parked by
-- the owner as context, not a task.
--
-- display_order 15 puts it right after the kg / l / pza group in the picker.

insert into public.unit (code, dimension, base_code, factor_to_base, display_order) values
  ('manojo', 'count', 'pza', 1, 15);
