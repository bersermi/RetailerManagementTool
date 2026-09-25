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

-- ----------------------------------------------------------------------------
-- 4. ⚠️⚠️ THE CONSEQUENCE: `product_waste_daily` NOW FAILS **OPEN**, AND IT IS
--    REPAIRED HERE RATHER THAN IN A LATER MIGRATION
-- ----------------------------------------------------------------------------
-- `0011` states in its own words why that view carries no `has_role` predicate:
--
--     "NO `has_role` PREDICATE, AND THAT IS A DECISION, NOT AN OMISSION. 0009
--      states one because it joins member-level revenue to manager-only cost, so
--      `security_invoker` inheritance fails OPEN… Both aggregates here are gated
--      at the source."
--
-- ⚠️⚠️ SECTION 1 ABOVE INVALIDATED THAT PREMISE. The numerator is `stock_movement`
-- (still manager-and-above, `0004`) and the denominator is now `purchase_line`
-- (member-level). **So the view mixes exactly the way `0009` does, and it fails
-- OPEN in the same direction.**
--
-- ⚠️⚠️ MEASURED BEFORE IT WAS BELIEVED, on a reset database as the seed's cashier:
-- **468 rows, `waste_cost_net` summing to 0 and `purchases_net` to $260,423.43.**
-- That is the app telling an Empleada **the shop bought a quarter of a million
-- pesos of stock and threw away none of it** — a false statement, assembled from
-- two true halves. It is the precise failure `0011`'s own `_waste_half_gated`
-- fixture demonstrates, with the gated side swapped.
--
-- ⚠️ IT IS IN THIS MIGRATION AND NOT IN `0041` DELIBERATELY. Splitting them would
-- create a schema state — `0040` applied, `0041` not — in which that sentence is
-- what the view says. **One statement of the change, no window.**
--
-- ⚠️⚠️ AND THE OWNER'S RULING IS NOT TOUCHED BY THIS. He traded the cost of a
-- DELIVERY; he did not trade the cost of waste, and `waste_line` and
-- `stock_movement` keep their own gates. **A cashier read zero rows of this view
-- before `0040` and reads zero rows after it** — her experience is unchanged, and
-- what is repaired is a row that should never have appeared.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE BODY IS READ OUT OF THE CATALOG AND NOT RE-TYPED
-- ----------------------------------------------------------------------------
-- `0011`'s definition is eighty lines of two CTEs, a full outer join and twelve
-- coalesced columns. **A `create or replace view` that re-typed it would be a
-- transcription**, which is the failure mode this repository names on every
-- `create or replace` — and the diff that ships would not be the diff intended if
-- one line went astray.
--
-- ✅ So the applied definition is fetched with `pg_get_viewdef` and WRAPPED. That
-- guarantees the column names, their order and their types are byte-identical —
-- which `create or replace view` requires — and it means this migration cannot
-- silently alter the arithmetic it is fencing.
-- ⚠️ `security_invoker` is restated because it lives in the `with (…)` clause and
-- is not part of the definition `pg_get_viewdef` returns.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ AND THE SECOND CLAUSE IS NOT OPTIONAL — `0009` PREDICTED THIS FAILURE IN
-- WRITING A MONTH BEFORE IT HAPPENED, AND THE FIRST DRAFT OF THIS MIGRATION HIT IT
-- ----------------------------------------------------------------------------
-- `or not row_security_active('public.stock_movement')`. `0009`'s own margin view
-- carries the identical pair and explains why at length:
--
--     "`row_security_active` is false exactly for the callers RLS does not filter:
--      the superuser, and `service_role`, which carries BYPASSRLS. Both already read
--      every cost row in the database, so gating them on `has_role` would not
--      protect anything — it would only make the view LIE TO THEM, since
--      `auth.uid()` is null in both and `has_role` is therefore false. Two things
--      need that not to happen: §2.9's nightly materialised rollup, which is a
--      scheduled `service_role` job and would otherwise materialise ZERO ROWS onto a
--      dashboard nobody would question; and every check in supabase/checks/, which
--      runs as the superuser."
--
-- ⚠️⚠️ THE FIRST DRAFT OF SECTION 4 OMITTED IT AND `0011` WENT FROM 3 FAILURES TO
-- **23**, because that file reads this view as `postgres` for all of its arithmetic.
-- **The repository had already written down the answer**; it was found by reading
-- `0009` rather than by reasoning about it a second time.
--
-- ⚠️ THE NAMED TABLE IS `stock_movement` BECAUSE THAT IS THE GATED NUMERATOR — the
-- side whose absence would make the ratio lie. `0009` names it for the same reason.
do $$
declare v_def text;
begin
  select pg_get_viewdef('public.product_waste_daily'::regclass, true) into v_def;
  if v_def is null or length(v_def) < 100 then
    raise exception '0040: could not read product_waste_daily''s definition; refusing to replace it';
  end if;
  if v_def ~* 'has_role' then
    raise exception '0040: product_waste_daily already states a role predicate; refusing to double it';
  end if;
  execute 'create or replace view public.product_waste_daily '
       || 'with (security_invoker = true) as select * from ('
       || rtrim(btrim(v_def), ';')
       || ') q where public.has_role(q.workspace_id, ''manager'') '
       || '   or not row_security_active(''public.stock_movement'')';
end $$;

comment on view public.product_waste_daily is
  'Waste as a share of purchases, per variant-day (ADR-035 §2.9). ⚠️ STATES ITS '
  'OWN has_role PREDICATE as of 0040, and 0011''s comment explaining why it did '
  'not is superseded: 0040 made purchase_line member-level while stock_movement '
  'stayed manager-only, so security_invoker inheritance began failing OPEN — a '
  'cashier read 468 rows saying the shop bought $260,423 and wasted nothing. '
  'Same reason 0009 carries one.';
