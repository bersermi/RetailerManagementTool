-- ============================================================================
-- 0008 — Provider price memory: the last price paid, per (provider, variant)
-- ============================================================================
-- ADR-035 §2.3 (two kinds of price), §2.7 (access)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * provider_price_memory — one view, no table, no policy, no function
--
-- Not in this migration: the RPCs (0006), the failure path (0007), the analytics
-- views and nightly rollups that will join this file later (also 0008 in the
-- plan's numbering; they ship separately because they answer a different
-- question and would triple the size of this review).
--
-- THIS MIGRATION LANDS BEFORE 0006 AND 0007 EXIST, and that is deliberate:
-- docs/PLAN.md task 1.4 depends only on 0003, and the seed (1.5, 1.6) wants the
-- prefill in place. Files apply in name order, so a later 0006 and 0007 slot in
-- ahead of this one on the next `supabase db reset` with no ambiguity. The one
-- real cost is that a hosted database which has already applied 0008 would need
-- `supabase db push --include-all` to accept them; no hosted database exists yet
-- (ADR-035 §10 defers provisioning to the first real operator transaction).
--
-- ----------------------------------------------------------------------------
-- WHY A VIEW AND NOT A TABLE
-- ----------------------------------------------------------------------------
-- ADR-035 §2.3 deletes `ProviderProductPrice` "as a cache (derivable from
-- purchase_line)". This file is that derivation made explicit rather than the
-- cache reintroduced under a new name.
--
-- A cache would need a write path, and the write path nobody remembers to build
-- is the one that runs when a delivery is VOIDED. A cached price would go on
-- prefilling a number the shop never paid, for as long as that product is bought
-- from that provider, and nothing in the system would contradict it. A view
-- cannot drift, because there is nothing to drift from.
--
-- Sell prices are the other kind of price and live in `price_list`: curated,
-- per location, changed deliberately. Purchase prices are remembered, workspace
-- -wide, and change every delivery. Putting both in one table is what produced
-- `price_list.provider_id` and the NULL that made the overlap constraint inert.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The view  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------
-- THE TWO EXCLUSIONS ARE THE WHOLE POINT OF THIS FILE. A void writes a second,
-- compensating document; it never touches the first (§2.4). So "the last purchase
-- line" naively read gives the WRONG answer twice over:
--
--   * the reversal document itself is the most recent row for that pair, and its
--     line carries a negative quantity — reading it back as a prefill offers the
--     operator the price of a delivery that was cancelled; and
--   * with the reversal excluded, the ORIGINAL becomes the most recent row again,
--     and the voided price prefills forever. This is the failure ADR-035 §2.3
--     names by name, and it is why both exclusions are needed and not either one.
--
-- After both, the pair falls back to the last delivery that still stands, or to
-- nothing at all — which Comprar renders as a distinct empty state (§2.8), not as
-- a zero.

create view public.provider_price_memory
with (security_invoker = true) as
select distinct on (pl.workspace_id, p.provider_id, pl.variant_id)
       pl.workspace_id,
       p.provider_id,
       pl.variant_id,

       -- The prefill itself. Net, per BASE unit — the denomination the whole
       -- system normalises to (§2.5) — so a caller that wants "per caja" converts
       -- it the same way every other quantity is converted.
       pl.unit_price_net_per_base,

       -- Snapshotted on the line, not joined from product_variant. Same reason
       -- 0003 snapshots it: the rate on the variant is editable, and re-deriving
       -- would restate what the shop was quoted.
       pl.tax_rate,

       -- The denomination the operator actually typed last time. Comprar prefills
       -- the unit as well as the number, because "8.50" means nothing without it
       -- and re-picking `kg` on every delivery is the kind of friction that gets
       -- a tool abandoned.
       pl.qty_display_unit as last_qty_display_unit,

       -- When, and which document — so a manager asking "why is it offering me
       -- this?" can be answered with a row rather than an explanation.
       p.occurred_at       as last_purchased_at,
       p.location_id       as last_location_id,
       p.id                as last_purchase_id,
       pl.id               as last_purchase_line_id

  from public.purchase_line pl
  join public.purchase p
    on  p.id           = pl.purchase_id
    and p.workspace_id = pl.workspace_id
    and p.location_id  = pl.location_id

 -- Exclusion one: this document is itself a void.
 where p.reversal_of is null

 -- Exclusion two: this document HAS been voided. Served by
 -- purchase_one_reversal_idx, the partial unique index 0003 puts on reversal_of.
 --
 -- The subquery reads `purchase` under the caller's own RLS, which is safe here
 -- and would not be in general: a reversal carries the same workspace_id and
 -- location_id as the document it cancels (the composite reversal FK in 0003
 -- makes that structural), so a caller who can see the original can always see
 -- its void. There is no visibility gap in which the void is hidden and the dead
 -- price survives.
   and not exists (
         select 1
           from public.purchase r
          where r.reversal_of = p.id
       )

 -- A line that took stock back out. In practice these live only on reversal
 -- documents, already excluded above — but the 0003 CHECK permits a negative
 -- line on an ordinary document, and a negative line is a correction rather than
 -- a purchase. It is not what the shop pays for the goods, so it is not memory.
   and pl.qty_base > 0

 -- FOUR SORT KEYS, AND THE LAST THREE ARE ABOUT DETERMINISM, NOT ABOUT TIME.
 -- §2.3 names occurred_at alone, and it is not enough to pick a single row:
 -- occurred_at is server now() for the whole transaction, so two deliveries
 -- recorded together share it exactly, and one delivery may carry two lines for
 -- the same variant (a split case, a corrected quantity) which share it by
 -- construction. Without the tail keys the view returns an arbitrary one of them
 -- and can return a different one tomorrow, on unchanged data. The same argument
 -- that put batch_id third in allocate_fefo(): a tiebreak that is never exercised
 -- costs an incremental sort within ties, and its absence is a bug nobody can
 -- reproduce.
 order by pl.workspace_id, p.provider_id, pl.variant_id,
          p.occurred_at desc,
          p.recorded_at desc,
          p.id          desc,
          pl.id         desc;


comment on view public.provider_price_memory is
  'Last price paid per (workspace, provider, variant), derived from purchase_line '
  'rather than cached in a table, so it cannot drift from what was paid and it '
  'self-corrects after a void. Excludes BOTH reversal documents and the documents '
  'they reverse. No fallback across providers — a price is a fact about a '
  'relationship, not about a product. ADR-035 §2.3.';

comment on column public.provider_price_memory.unit_price_net_per_base is
  'Net, per base unit. The prefill Comprar offers; blank when absent, never zero.';
comment on column public.provider_price_memory.last_qty_display_unit is
  'The denomination the operator typed last time, prefilled alongside the price.';
comment on column public.provider_price_memory.last_location_id is
  'Which store the remembered delivery arrived at. Informational — the memory '
  'itself is workspace-wide, not per location (ADR-035 §2.3).';


-- ----------------------------------------------------------------------------
-- 2. Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- MANAGER-AND-ABOVE, INHERITED RATHER THAN RESTATED. The view is
-- `security_invoker = true`, so `purchase` and `purchase_line` apply their own
-- policies to the caller — and both already carry
-- `has_role(workspace_id, 'manager')` on top of the location-level shape, because
-- both carry cost. A staff session selecting from this view gets zero rows, not
-- an error.
--
-- The predicate is deliberately NOT repeated here. Restating it would create a
-- second place to keep in step with §2.7, and the copy that drifts is always the
-- one nobody is looking at. `security_invoker` is the whole mechanism §2.7 chose
-- over column grants, and this is it working as intended.
--
-- TWO CONSEQUENCES, BOTH REAL, BOTH CHEAP TO REVISE — a view is a
-- `create or replace` with no data to migrate:
--
--   1. A STAFF MEMBER RECORDING A DELIVERY GETS NO PREFILL. §2.7 lets staff
--      record purchases at their assigned locations and denies them cost, and
--      those two are in tension the moment a cashier accepts a delivery. This
--      file resolves it the way §2.7 does — cost is manager-and-above, full stop
--      — so Comprar shows a staff member the same blank required field it shows
--      for a provider never bought from. If that is wrong it is wrong at the
--      screen (step 6), and the fix is a narrower view, not a hole here.
--
--   2. THE MEMORY IS WORKSPACE-WIDE, BUT ITS INPUT IS LOCATION-FILTERED.
--      `my_locations()` is fail-closed and excludes INACTIVE locations, so
--      deactivating a store retires the prices learned there. Every manager and
--      owner in a workspace sees an identical view — they are granted every
--      active location by role — so the result is deterministic per workspace and
--      never varies between two managers. The alternative was a `security definer`
--      view carrying its own workspace-only predicate; it was rejected because
--      §2.7 fixes `security_invoker = true` for exactly one reason, that RLS
--      should keep governing rows, and one exception is how that stops being true.

grant select on public.provider_price_memory to authenticated;
