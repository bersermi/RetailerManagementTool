-- ============================================================================
-- 0040 — Any member may read what the shop paid
-- ============================================================================
-- ADR-035 §2.7 (access), §2.6 (the location wall). docs/PLAN.md task `5g-ii-b`.
--
-- Scope, deliberately narrow so one person can review it:
--   * purchase_select        — the role gate dropped, the location wall kept
--   * purchase_line_select   — the same
--
-- Nothing else. No table, no function, no view, no grant, no seed.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THIS MIGRATION EXISTS BECAUSE THE DECISION MAKER REVERSED A ROW OF
-- ADR-035 §2.7's CAPABILITY MATRIX, AND IT IS THE FIRST ONE THAT EVER HAS
-- ----------------------------------------------------------------------------
-- His instruction, 2026-09-25: ***"Empleada should be able to see the both the
-- purchase records and the prices."*** Asked which of two readings he meant —
-- the prefill only, or the delivery documents as well — he answered **(a)**, the
-- wide one.
--
-- ⚠️ WHAT §2.7 SAID, so that this file is readable against the document it
-- changes: the matrix row `See cost and margin` was `Staff: —`, and the prose
-- argued the other way BY NAME — *"Cost visibility is a real commercial exposure
-- in small retail, and separating it after the fact means rewriting every
-- query."* **That argument is about the cost of adding the separation later, and
-- it is unaffected by removing it now**; what he traded is the exposure itself,
-- which is a judgement about the people in his shop and was never ours.
--
-- ⚠️⚠️ AND IT IS A ONE-WAY DOOR IN THE COMMERCIAL SENSE RATHER THAN THE
-- TECHNICAL ONE. Re-narrowing these two policies is one more `alter policy`; what
-- cannot be undone is that somebody has already seen the numbers. That was put to
-- him in those words before this was written.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE LOCATION WALL IS KEPT, AND THAT IS NOT A HEDGE
-- ----------------------------------------------------------------------------
-- `location_id in (select public.my_locations())` stays on both policies. §2.6 is
-- untouched by this ruling and he did not question it: a cashier reads the
-- deliveries at HER store, not every store's. ⚠️ `my_locations()` grants managers
-- and owners every location by role (`0001`), so for them nothing changes at all.
--
-- ⚠️⚠️ AND THAT IS WHY THIS CHANGE MAKES A TEST SUITE STRONGER RATHER THAN WEAKER.
-- `supabase/pgtap/05_location_isolation_reads.sql` is built on a 5/5 split — five
-- policies a cashier can read, where she IS the instrument for the location wall,
-- and five where her zero rows *"say nothing about locations"* because a role gate
-- refused her first. That file states flatly that **"there is no actor in the
-- schema who is simultaneously manager-enough to read a purchase and
-- location-restricted enough to be refused one."** After this migration there is,
-- and the split is 7/3. ⚠️ **The suite re-classifies itself** — it derives
-- `role_gated` from `p.qual like '%has_role%'` and computes its own plan — so it
-- needs no edit to stay correct; **its PROSE needed one, and nothing checks
-- prose.** That is the expensive half of this change and it is done in the same
-- commit.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS DOES **NOT** OPEN, measured rather than asserted from memory
-- ----------------------------------------------------------------------------
--   * `stock_batch` and `stock_movement` carry `unit_cost_net_per_base` and keep
--     their own `has_role(…, 'manager')` from `0004`. Cost on the SHELF is still
--     manager-and-above; only cost on a DELIVERY moves.
--   * `waste_line` keeps its gate (`0003`), so the cost of what was thrown away
--     stays manager-and-above.
--   * `product_margin_daily` (`0009`) states its own `has_role` predicate inside
--     the view, so margin reporting is untouched by a policy change here.
--   * `failed_write_select` is owner-only and unrelated.
-- ⚠️ So `purchase` and `purchase_line` are the whole of it, and they are the two
-- tables `provider_price_memory` joins — which is what makes Comprar's prefill
-- reach a cashier at all (`0008`, `security_invoker`).
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ `alter policy` AND NOT `drop` + `create`
-- ----------------------------------------------------------------------------
-- `alter policy … using (…)` replaces the predicate and CANNOT change the
-- command or the roles by accident. A drop-and-recreate pair retypes
-- `for select to authenticated` from memory, and this repository's own rule about
-- `create or replace` applies to a policy just as well: **the body is a
-- transcription, so the diff that ships is not the diff that was intended if one
-- line goes astray.** There is nothing to transcribe here.
--
-- ⚠️ APPEND-ONLY IS NOT BROKEN BY THIS. `0003` is not edited; this is the
-- fix-forward that `CLAUDE.md` requires, and `supabase/tests/0040_…` asserts the
-- NEW shape against the applied catalog rather than against this file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The delivery header
-- ----------------------------------------------------------------------------
alter policy purchase_select on public.purchase
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

-- ----------------------------------------------------------------------------
-- 2. The delivery's lines — where the cost per unit actually is
-- ----------------------------------------------------------------------------
-- ⚠️ BOTH OR NEITHER. The header carries the totals and the line carries
-- `unit_price_net_per_base`, which is the figure Comprar prefills. Widening one
-- and not the other leaves `provider_price_memory` empty for a cashier anyway —
-- the view joins both, and a `security_invoker` view is fenced by EVERY join.
alter policy purchase_line_select on public.purchase_line
  using (workspace_id in (select public.my_workspaces())
     and location_id  in (select public.my_locations()));

-- ----------------------------------------------------------------------------
-- 3. A comment that has become false
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ `0003` SAID *"The only table carrying what was paid, which is why its RLS
-- policy is manager-and-above"* — AND THE CLAUSE AFTER THE COMMA IS NOW WRONG.
-- This is not decoration: `\d+` and every catalog reader shows that sentence, and
-- a comment explaining a fence that no longer exists is the stale-copy defect this
-- repository has recorded ten of. ⚠️ **The first half stays true and is kept**:
-- `purchase` really is the only table carrying what was paid to a supplier.
-- ⚠️ `purchase_line`'s own comment says nothing about the fence and is left alone.
comment on table public.purchase is
  'A delivery. Readable by ANY member at their own locations as of 0040, on the '
  'decision maker''s instruction of 2026-09-25: an Empleada records deliveries, '
  'so she may read what they cost. Cost on the SHELF (stock_batch) and the cost '
  'of waste (waste_line) remain manager-and-above. ADR-035 §2.7.';
