-- ============================================================================
-- 0041 — What was lost and why, for the person who lost it
-- ============================================================================
-- ADR-035 §2.7 (access), §2.8 (Desperdicio, reason-first). docs/PLAN.md task
-- `6a-ii-a`.
--
-- Scope, deliberately narrow so one person can review it:
--   * public.waste_reason_line  — one view, and one grant on it
--
-- Nothing else. No table, no column, no function, no trigger, no policy, no
-- seed. ⚠️ AND NO CHANGE TO `waste_line_select`, which is the point rather than
-- an omission — see "what this does not open" below.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THIS IS THE FIRST `security definer` VIEW IN THIS SCHEMA, AND THE ONE
-- SENTENCE OF ADR-035 §2.7 THAT SAYS OTHERWISE IS AMENDED IN THE SAME COMMIT
-- ----------------------------------------------------------------------------
-- Every one of the SIX views applied before this file is `security_invoker = true`,
-- and §2.7 fixed that for all of them — the count is the DATABASE's (`relkind = 'v'`
-- in `public`) and not a `grep` of this directory, which returns fourteen because
-- four of the six were re-issued with `create or replace`: *"the views
-- are `security_invoker = true` so RLS still governs rows."* **This one cannot
-- be, and the reason is measured rather than argued.**
--
-- ⚠️ THE FENCE THIS VIEW REACHES AROUND. `0003` gives `waste` and `waste_line`
-- deliberately DIFFERENT policies — the only asymmetric pair in this schema:
--
--     waste_select       workspace + location
--     waste_line_select  workspace + location + has_role(…, 'manager')
--
-- because the LINE carries `unit_cost_net_per_base` and the header carries only
-- retail value. So a cashier can see THAT a write-off happened at her store and
-- cannot see a single product in it.
--
-- ⚠️⚠️ AND A `security_invoker` VIEW CANNOT FIX THAT, BECAUSE SUCH A VIEW IS
-- FENCED BY EVERY TABLE IT JOINS. Driven under `set role authenticated` on
-- 2026-09-27 — one workspace, one cashier holding `staff` at her own location,
-- one write-off she recorded herself:
--
--                                 cashier   owner   an outsider's owner
--     waste_line (base table)        0        1              —
--     a security_invoker view        0        1              —
--     THIS view                      1        1              0
--
-- **The invoker view is empty for the person it exists for.** The third column
-- is what makes the first two safe to act on: a definer view bypasses RLS on
-- every table it reads, so *it answers her* and *it does not leak across
-- tenants* are two separate claims and both were driven.
--
-- ⚠️ SO THE TENANCY WALL IS PUT BACK BY HAND, IN THE VIEW BODY — the uniform
-- `workspace_id` / `location_id` prefix `0003` states for all six transaction
-- tables, and NO `has_role`, which is the whole of what changes.
--
-- ⚠️⚠️ THIS IS NOT A NEW TRUST LEVEL FOR THIS SCHEMA, WHICH IS WORTH SAYING
-- PLAINLY. The view is owned by `postgres` and therefore bypasses RLS, exactly
-- as every `security definer` RPC here does — `my_access_requests()` (`0029`)
-- exists for precisely this shape of problem, *so the joiner can see a row no
-- policy can ever show them*. What is new is the SPELLING, not the privilege.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE OWNER RULED THIS, IN FIVE WORDS, AND IT IS A ONE-WAY DOOR
-- ----------------------------------------------------------------------------
-- 2026-09-27: ***"Go with (a), and build it to my phone."*** Reading (a) of
-- three put to him: **a definer view carrying reason, quantity, product,
-- document and date — and never `unit_cost_net_per_base`.**
--
-- ⚠️ THE COST HE ACCEPTED, NAMED IN THE BRIEF BEFORE HE ANSWERED: she can infer
-- roughly what things cost by putting waste quantities together with the
-- delivery prices `0040` already lets her read. **That leak is real and small,
-- and it is the price of her being able to fix her own mistake.**
--
-- ⚠️⚠️ AND IT IS A ONE-WAY DOOR IN THE COMMERCIAL SENSE RATHER THAN THE
-- TECHNICAL ONE, which is `0040`'s own framing and is why it was asked rather
-- than taken. Dropping this view is one more migration; what cannot be undone is
-- that somebody has already read the rows.
--
-- ⚠️ WHAT HE DID **NOT** RULE, and no session may assume either way: whether
-- `waste_line_select` itself should widen. It stays manager-and-above. **(a)
-- works AROUND that fence rather than opening it**, which is the whole
-- difference between reading (a) and the reading that dropped the `has_role`.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ APPLIED SQL ASKED FOR THIS FILE TWICE AND `docs/PLAN.md` NEVER CARRIED IT
-- ----------------------------------------------------------------------------
--   * `0003:589` — *"the reason-and-quantity view for Desperdicio SHIPS WITH
--     THAT SCREEN"*, written in the same paragraph that created the asymmetry.
--   * `0011:68`  — *"a reason breakdown is a second view over `waste_line`
--     alone, with no denominator — IT BELONGS WITH THE DESPERDICIO SCREEN
--     (step 6)… Nothing in the schema is missing for it."*
--
-- ⚠️ THAT LAST CLAUSE IS THE ONE THING IN EITHER COMMENT THAT WAS FALSE: a view
-- was missing, and it is the whole of this file. ⚠️⚠️ **Both comments sat in
-- applied migrations for three weeks and no check reads a migration's prose**, so
-- the plan claimed step 6 shipped its first migration two rows later. That is
-- this repository's stale-claim defect arriving from the SQL rather than from a
-- document, which is the harder direction.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS VIEW DELIBERATELY DOES NOT CARRY
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ NO MONEY COLUMN AT ALL — not `unit_cost_net_per_base`, and not
-- `unit_price_net_per_base`, `line_net`, `tax_amount` or `tax_rate` either.
-- Excluding the cost is the ruling. Excluding the RETAIL figures is two further
-- things: área 9's ruling of 2026-09-14 — *"Números and Desperdicio show waste
-- as QUANTITY and not as cost or as a rate, until something fixes `0011`"* — and
-- C8.8, which bans a column nothing draws. ⚠️ **The effect is worth stating
-- positively: there is no projection of this view that yields a cost, so the
-- fence cannot be leaked by a caller's `select`.** The retail total is still on
-- the `waste` header, where `0003` put it and where a cashier may already read
-- it.
--
-- ⚠️ NO DENOMINATOR AND NO RATE, which is `0011`'s own distinction: that view
-- answers *what share of purchases did we lose* and fans the denominator out
-- across five reasons if `reason` is added to its grain. This one answers *what
-- did we lose and why*, at line grain, and has nothing to divide by.
--
-- ⚠️ NO `created_at`. Nothing records the order a shopkeeper keyed her lines in
-- and `created_at` is IDENTICAL across every line of one document — one
-- `insert … select` in one transaction, so `now()` is one value. Carrying it
-- would offer a tiebreak that is not one.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE PRODUCT'S NAME IS A COLUMN HERE AND NOT A NESTED EMBED, AND BOTH
-- SPELLINGS WERE DRIVEN BEFORE CHOOSING
-- ----------------------------------------------------------------------------
-- PostgREST answers 200 either way — `waste` embedding this view, and this view
-- embedding `product_variant(name)` inside it. The name is denormalised anyway,
-- for three reasons:
--
--   1. A NESTED EMBED IS A SECOND READ WITH ITS OWN FENCE, on the one screen
--      that must not come back empty. This whole file exists because an embed
--      answered `[]`.
--   2. THE LINE ORDER NEEDS IT. One waste document may hold the SAME product
--      twice under two causes, so a deterministic order needs the product name
--      AND the reason — and a to-many embed can only order on the embedded
--      relation's own columns.
--   3. IT GRANTS HER NOTHING NEW, measured: `product_variant_select`
--      (`0002:507`) is `workspace_id in (select public.my_workspaces())`, which
--      is the workspace half of this view's own predicate. Every name reachable
--      through here was already reachable directly.
--
-- ----------------------------------------------------------------------------
-- ⚠️ REVERSALS ARE CARRIED AND NOT FILTERED, WHICH IS `0009`'s RULE
-- ----------------------------------------------------------------------------
-- A void is a second document with NEGATED lines (`0021`), so a reversal cancels
-- itself in any sum over `qty_base` and needs no exclusion here — `0009` states
-- exactly this for `product_margin_daily`. ⚠️ **Filtering them would be the
-- wrong place for it besides**: `@/api/documents` drops a reversal AND the
-- document it cancels, because the owner asked for *"just one line, clean"* on
-- the screen, and that is a rendering rule. A view that had already dropped them
-- could not be summed.
-- ============================================================================

create view public.waste_reason_line
with (security_invoker = false) as
  select wl.id,
         wl.waste_id,
         wl.workspace_id,
         wl.location_id,
         wl.variant_id,
         pv.name as variant_name,
         wl.reason,
         wl.qty_base,
         wl.qty_display,
         wl.qty_display_unit,
         w.occurred_at
    from public.waste_line wl
    join public.waste w
      on  w.id           = wl.waste_id
      and w.workspace_id = wl.workspace_id
      and w.location_id  = wl.location_id
    join public.product_variant pv
      on  pv.id           = wl.variant_id
      and pv.workspace_id = wl.workspace_id
   -- ⚠️ THE TENANCY WALL, BY HAND, BECAUSE THIS VIEW IS NOT `security_invoker`.
   -- It is `0003`'s uniform prefix for all six transaction tables, minus the
   -- `has_role(…, 'manager')` that `waste_line_select` carries — and that
   -- subtraction is the entire behavioural change in this migration.
   -- ⚠️ `in (select fn())` and never a bare call, so the planner evaluates each
   -- helper once per query rather than once per row. `0003`'s note.
   where wl.workspace_id in (select public.my_workspaces())
     and wl.location_id  in (select public.my_locations());

comment on view public.waste_reason_line is
  'What was lost and why, at line grain, for every member at their own locations. '
  'The staff-facing counterpart to waste_line, which is manager-and-above because '
  'it carries a cost snapshot. ⚠️ security definer (security_invoker = false) — the '
  'ONLY such view in this schema — because an invoker view over waste_line is empty '
  'for the very person it exists for; the tenancy predicate is therefore stated in '
  'the body. Carries NO money column of any kind, so no projection of it yields a '
  'cost. Ruled by the decision maker 2026-09-27. ADR-035 §2.7, §2.8; 0003''s waste '
  'RLS paragraph, which promised it.';

comment on column public.waste_reason_line.variant_name is
  'The product''s name, denormalised rather than embedded: a nested embed is a '
  'second read with its own fence, and the line order needs the name to be this '
  'relation''s own column. It grants nothing new — product_variant_select is the '
  'workspace half of this view''s predicate.';
comment on column public.waste_reason_line.reason is
  'The controlled cause (0003''s waste_reason enum). ⚠️ An enum sorts by '
  'DECLARATION order and not alphabetically, so a picker''s order and a '
  'breakdown''s order are the same order or nothing can see that they differ.';
comment on column public.waste_reason_line.qty_base is
  'Thousandths of the variant base unit, signed. NEGATIVE on a reversal line, '
  'which is why reversals are carried rather than filtered: they cancel in a sum.';
comment on column public.waste_reason_line.qty_display is
  'The figure as it was keyed, in qty_display_unit — so a screen can show back the '
  'number somebody typed rather than a converted one nobody recognises.';
comment on column public.waste_reason_line.occurred_at is
  'The DOCUMENT''s instant, joined from waste so a reason breakdown has a time '
  'axis without every caller joining the header back. A timestamptz is an instant, '
  'never a calendar day — the ISO prefix is the UTC day and is wrong after 18:00 '
  'in a UTC−6 shop.';


-- ----------------------------------------------------------------------------
-- Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- ⚠️ `select` TO `authenticated`, AND NOTHING ELSE. `anon` gets nothing: it is
-- not granted here and `public` holds no grant on a view created by `postgres`
-- in a schema where `0001` already revoked the default.
--
-- ⚠️⚠️ AND THERE IS NO POLICY TO WRITE, WHICH IS EXACTLY WHAT MAKES THIS FILE
-- WORTH READING TWICE. A view carries no RLS of its own; for the other six
-- views `security_invoker` delegated the question to the base tables, and here
-- the `where` clause above IS the policy. **The only instrument that can see
-- whether it is right is a probe under `set role authenticated`** —
-- `supabase/tests/0041_waste_reason_line.sql` and
-- `docs/checks/6a-ii-a-waste-list-contract.sh`, which drives a real cashier over
-- HTTP.

grant select on public.waste_reason_line to authenticated;
