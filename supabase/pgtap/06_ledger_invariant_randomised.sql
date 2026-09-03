-- ============================================================================
-- 06 — THE LEDGER INVARIANT, OVER RANDOMISED SEQUENCES (behavioural)
--
-- ADR-035 §2.10, fourth row: "sum(movements) = batch_balance across randomised
-- purchase/sale/waste/transfer/reversal sequences, PER LOCATION". Plan task
-- 3.4. §2.4 states the rule itself:
--
--     select sum(qty_base) from stock_movement where batch_id = $1
--       = (select remaining_base from batch_balance where batch_id = $1)
--     -- must hold for every batch, at all times
--
-- `public.batch_balance_violations()` (0004 §8) is that sentence as a function,
-- and it is the ORACLE this whole file is built around: every claim below is
-- some form of "the oracle is empty", and the C-block at the end is what stops
-- that from being a claim about a function that cannot speak.
--
-- ⚠️ WHAT IS NEW HERE, AND WHAT WAS ALREADY TRUE
-- ----------------------------------------------
-- Two things in this repo already assert the invariant, and neither is this:
--
--   supabase/tests/0004_inventory.sql   a FIXTURE — four batches, nine
--                                       movements, written to make it hold
--   supabase/checks/seed_invariant.sql  the SEED — 1041 batches, 3514
--                                       movements, three months of two shops.
--                                       Its own header calls itself "the
--                                       closest thing this repo has to the
--                                       randomised sequences the ADR asks for"
--
-- The seed is large, but it is FIXED: it writes the same deliveries in the same
-- order every reset, and a defect that needs a waste event between a transfer
-- and its void is a defect the seed will never produce. What this file adds is
-- not volume. It is ORDER AND MIX chosen by `random()` from a recorded seed —
-- five kinds of write, interleaved in an order nobody designed, against lots
-- nobody planned.
--
-- ⚠️ IT BUILDS ON THE SEED RATHER THAN ON A SYNTHETIC FIXTURE, DELIBERATELY.
-- A generator that also creates its own workspace, units, products and lots
-- would be testing the invariant over a ledger written by the same twenty lines
-- that assert it. Running against the seed means the randomised writes land on
-- top of three months of real-shaped history — including the two deliberate
-- oversales and the delivery 1.6c voided after it had been sold through — so a
-- generated sale can consume a batch the seed opened in June, and a generated
-- void can withdraw a delivery a generated transfer already moved.
--
-- ⚠️ THE RUNS ARE CUMULATIVE, AND THAT IS THE POINT. Each run appends to the
-- ledger the previous run left. They are NOT independent trials, and resetting
-- between them was considered and rejected: an invariant re-proved over a fresh
-- ledger sixteen times is one trial run sixteen times, and it can never test a
-- sale against a lot a transfer created three runs ago. What varies across runs
-- is the sequence; what accumulates is the history it runs against.
--
-- ⚠️ THE SEED VALUE IS RECORDED AND IS OVERRIDABLE. `:gen_seed` below is the
-- one number this file's randomness comes from. F4 asserts the run used it, and
-- it is printed as a diagnostic, so a red run in CI names the number that
-- reproduces it:
--
--     psql "$DB_URL" -v ON_ERROR_STOP=1 -v gen_seed=0.20260824 \
--          -f supabase/pgtap/06_ledger_invariant_randomised.sql
--
-- ⚠️ AND IT REPRODUCES THE OP SEQUENCE, NOT THE ALLOCATION. `setseed()` governs
-- `random()`; it does not govern `gen_random_uuid()`, which is not seeded and
-- cannot be. FEFO's third sort key is `batch_id` (0005 §2), so two lots that tie
-- on expiry AND received_at — which the seed produces, because `now()` is fixed
-- for a transaction and one delivery writes many lines — can be consumed in a
-- different order on a replay. The op SEQUENCE is reproducible; which of two
-- tied lots absorbed op 143 is not. That is honest rather than convenient: the
-- invariant must hold whichever one it was, and a property that depended on the
-- tiebreak would be a property of the tiebreak.
--
-- ⚠️ THE GENERATOR WRITES THROUGH THE REAL ALLOCATORS. Every unit that leaves
-- goes through `allocate_fefo()`, and every transfer through
-- `allocate_transfer()` — the same two functions the seed calls and the same two
-- the 0006 RPCs will call. A generator that wrote its own movements would prove
-- the invariant over movements it had itself balanced, which is the shape of
-- vacuous green ADR-035 §9 refuses. The shortfall branches are reached in
-- volume and on purpose (F8): a generated sale picks a variant uniformly, so
-- most of them sell something the store does not have, and v1 records stock
-- rather than enforcing it (§2.6). Negative balances are the interesting case
-- for this invariant, not a defect in the fixture.
--
-- ⚠️ THIS FILE WRITES TO THE APPLIED SCHEMA AND UNDOES IT — the fourth time
-- (02's invite fixture, 04's auth.users row, 05's closed store), and by far the
-- largest. Several hundred documents, batches and movements, one transaction,
-- ending in `rollback`. It also DISABLES A TRIGGER and CORRUPTS THE PROJECTION
-- in the C-block, and both are undone explicitly before the rollback so F12 can
-- assert the restore rather than trusting it — 05's rule, for 05's reason.
--
-- ⚠️ NOTHING HERE RUNS UNDER `set role authenticated`, and unlike 02-05 that is
-- correct rather than a gap. This suite makes no access claim. It is arithmetic
-- over the whole ledger of every tenant, and RLS would hide most of it — the
-- oracle is `security definer` for exactly that reason (F13). The isolation
-- claims belong to 02, 03, 04 and 05 and are not repeated here.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
set search_path = tap, public, pg_catalog;
set client_min_messages = warning;

-- The recorded seed. Overridable from the command line; F4 asserts whichever
-- value was actually used, so an override cannot make the record a lie.
\if :{?gen_seed}
\else
  \set gen_seed 0.20260824
\endif

begin;

-- ---------------------------------------------------------------------------
-- The scope, resolved from the CATALOG and never by display name
--
-- 05 settled this rule and it holds here for the same reason: renaming a store
-- must not be able to re-point a suite. The workspace under test is "the one
-- with more than one active location", because a single-store tenant cannot
-- exercise a transfer and the ADR names transfers in this row. F1 refuses to
-- proceed if that description stops picking exactly one workspace.
--
-- EVERY OTHER LOCATION IS A CONTROL. The generator writes into `lg_scope` only;
-- `lg_loc` holds all of them, the invariant is asserted over all of them per
-- run, and F5 asserts the untouched ones were in fact untouched. A generator
-- that leaked into another tenant would be a defect this file is positioned to
-- see and nothing else is.
-- ---------------------------------------------------------------------------
create temp table lg_ws as
select l.workspace_id as ws
  from public.location l
 where l.is_active
 group by l.workspace_id
having count(*) > 1
 order by count(*) desc, l.workspace_id
 limit 1;

create temp table lg_scope as
select l.workspace_id as ws, l.id as loc, l.name as store
  from public.location l
 where l.is_active
   and l.workspace_id = (select ws from lg_ws);

create temp table lg_loc as
select l.id as loc, l.name as store,
       l.workspace_id = (select ws from lg_ws) as in_scope,
       (select count(*) from public.stock_movement m where m.location_id = l.id) as movs_before,
       0::bigint as movs_after
  from public.location l;

-- The author of every generated write. A manager, not a cashier: the generator
-- writes purchases and waste, and `purchase_line` and `waste_line` carry cost,
-- which is manager-and-above by §2.7. A cashier as the author would describe a
-- person who cannot read back what they wrote — 20_consumption.sql's rule.
create temp table lg_actor as
select (array_agg(wm.user_id order by wm.role, wm.user_id)
          filter (where wm.role = 'manager'))[1] as mgr
  from public.workspace_member wm
 where wm.is_active and wm.workspace_id = (select ws from lg_ws);

-- One row per generated operation. This is the file's record of what it did,
-- and the reversal branch reads it back: a void must target a document, and a
-- void of a SEED document would leave the seed's own assertions describing a
-- ledger that no longer matches them. The generator only ever voids its own.
create temp table lg_op (
  run       int  not null,
  step      int  not null,
  kind      text not null,
  loc       uuid,
  variant   uuid,
  doc_kind  text,
  doc_id    uuid,
  reversed  boolean not null default false
);

-- The measurements, one row per run per location, plus the whole-database row.
create temp table lg_result (
  run          int  not null,
  loc          uuid,           -- null = every location, the §2.4 claim entire
  store        text,
  violations   bigint not null,
  worst_delta  numeric,
  movs         bigint not null
);

create temp table lg_seed as select :gen_seed::float8 as requested, null::float8 as applied;

-- The C-block's findings, so the F-tests can assert the oracle spoke.
create temp table lg_red (
  probe      text primary key,
  violations bigint not null,
  detail     text
);


-- ---------------------------------------------------------------------------
-- THE GENERATOR
--
-- One operation per call. Which operation, at which store, on which variant, in
-- what quantity and against which document are all decided by `random()`, whose
-- sequence is fixed by the recorded seed.
--
-- THE MIX IS NOT UNIFORM, AND THE WEIGHTS ARE AN ARGUMENT. A shop buys once and
-- sells fifty times, so a uniform mix would be a shop nobody runs. But the
-- weights below are not the shop's either — reversals are ~12% here against a
-- real rate nearer 1%, because a void is the operation this invariant is most
-- likely to be broken by (it is the only one that writes a movement with a sign
-- its `reason` forbids) and the cheapest place to find that out is here.
--
--   purchase  25%   opens a new lot and receives into it
--   sale      33%   allocate_fefo, one movement per lot it hands back
--   waste     14%   allocate_fefo again, with cost averaged onto the line
--   transfer  16%   allocate_transfer — the paired write, entire
--   reversal  12%   compensating movements against one of this file's own docs
--
-- THE VARIANT IS PICKED UNIFORMLY FROM THE WHOLE CATALOG, which is what drives
-- the shortfall branches. Most variants are not on most shelves, so most
-- generated sales oversell — branch 2 (borrow the last lot's cost) and branch 3
-- (open an adjustment lot at zero cost) of 0005 §2 are reached hundreds of
-- times per run. Those are the branches where a wrong batch_id would break this
-- invariant, and they are nearly unreachable from a fixture written by hand.
--
-- `qty_display` IS `qty_base` AND THE DISPLAY UNIT IS THE BASE UNIT. The unit
-- conversions are 3.5's subject and asserting them here would be a second
-- suite's claim wearing this one's name. What matters to §2.4 is the base
-- quantity, and the line constraints (`*_qty_display_agrees`) are satisfied
-- honestly rather than bypassed.
-- ---------------------------------------------------------------------------

-- Scratch for the waste branch. Created ONCE rather than per call: a `create
-- temp table` inside the loop is DDL several hundred times over, and it bloats
-- pg_class for no gain.
create temp table lg_wa (batch_id uuid, qty numeric, cost numeric);

create function pg_temp.lg_step(p_run int, p_step int) returns text
language plpgsql as $lg$
declare
  v_ws    uuid;
  v_loc   uuid;
  v_to    uuid;
  v_by    uuid;
  v_var   record;
  v_at    timestamptz;
  v_r     numeric;
  v_kind  text;
  v_qty   numeric;
  v_price numeric;
  v_net   numeric;
  v_tax   numeric;
  v_doc   uuid;
  v_rev   uuid;
  v_alloc record;
  v_cn    numeric;
  v_cq    numeric;
  v_t     record;
begin
  select ws  into v_ws from lg_ws;
  select mgr into v_by from lg_actor;

  -- Time advances monotonically with (run, step), so a generated lot is always
  -- received AFTER every lot before it and FEFO's `received_at` tiebreak is
  -- exercised against a real ordering rather than against a clock that stood
  -- still. It sits after the seed's three months, which is where a shop that
  -- kept trading would be.
  v_at := timestamptz '2026-09-01 12:00:00-06'
          + ((p_run * 1000 + p_step) || ' minutes')::interval;

  select loc into v_loc from lg_scope order by random() limit 1;
  select v.id, v.base_unit_code, v.tax_rate into v_var
    from public.product_variant v
   where v.workspace_id = v_ws and v.is_active
   order by random() limit 1;

  v_r := random();
  v_kind := case
              when v_r < 0.25 then 'purchase'
              when v_r < 0.58 then 'sale'
              when v_r < 0.72 then 'waste'
              when v_r < 0.88 then 'transfer'
              else                 'reversal'
            end;

  v_qty   := round((random() * 20 + 1)::numeric, 3);
  v_price := round((random() * 30 + 1)::numeric, 6);
  v_net   := round(v_qty * v_price, 2);
  v_tax   := round(v_net * v_var.tax_rate, 2);

  -- -------------------------------------------------------------------------
  -- PURCHASE — the only operation that opens a lot, and the shape 10_deliveries
  -- writes: one batch per purchase line (a unique partial index in 0004 makes
  -- that structural), then one positive movement receiving into it. The batch
  -- opens at ZERO and the movement is what fills it; seeding the balance with
  -- qty_received_base would count the delivery twice (0004 §6).
  -- -------------------------------------------------------------------------
  if v_kind = 'purchase' then
    v_doc := gen_random_uuid();

    insert into public.purchase
      (id, workspace_id, location_id, provider_id, occurred_at, recorded_at,
       total_net, total_tax, created_by, recorded_offline, payload_hash)
    select v_doc, v_ws, v_loc, p.id, v_at, v_at, v_net, v_tax, v_by, false,
           md5(v_doc::text)
      from public.provider p
     where p.workspace_id = v_ws and p.is_active
     order by random() limit 1;

    with l as (
      insert into public.purchase_line
        (workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
         qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate,
         expiry_date)
      values (v_ws, v_loc, v_doc, v_var.id, v_qty, v_qty, v_var.base_unit_code,
              v_price, v_net, v_tax, v_var.tax_rate,
              -- ~30% carry no expiry. Null means "this variant does not track
              -- expiry", never "does not expire", and it is what sends the lot
              -- to the END of the FEFO order (nulls last, 0005 §2).
              case when random() < 0.7
                   then (v_at + ((random() * 40)::int || ' days')::interval)::date
              end)
      returning id, expiry_date
    )
    insert into public.stock_batch
      (workspace_id, location_id, variant_id, origin, provider_id,
       source_purchase_line_id, qty_received_base, unit_cost_net_per_base,
       received_at, expiry_date, created_by)
    select v_ws, v_loc, v_var.id, 'purchase',
           (select provider_id from public.purchase where id = v_doc),
           l.id, v_qty, v_price, v_at, l.expiry_date, v_by
      from l;

    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, purchase_id, occurred_at, recorded_at, created_by)
    select sb.workspace_id, sb.location_id, sb.id, sb.variant_id, 'purchase',
           sb.qty_received_base, sb.unit_cost_net_per_base, v_doc, v_at, v_at, v_by
      from public.stock_batch sb
      join public.purchase_line pl on pl.id = sb.source_purchase_line_id
     where pl.purchase_id = v_doc;

    insert into lg_op (run, step, kind, loc, variant, doc_kind, doc_id)
    values (p_run, p_step, 'purchase', v_loc, v_var.id, 'purchase', v_doc);

  -- -------------------------------------------------------------------------
  -- SALE — THE ALLOCATOR DECIDES. One movement per lot it hands back, because
  -- each lot carries its own cost and a merged movement would lose it. The
  -- caller writes the sign; allocate_fefo returns positive amounts taken.
  -- -------------------------------------------------------------------------
  elsif v_kind = 'sale' then
    v_doc := gen_random_uuid();

    insert into public.sale
      (id, workspace_id, location_id, occurred_at, recorded_at, total_net,
       total_tax, created_by, recorded_offline, payload_hash)
    values (v_doc, v_ws, v_loc, v_at, v_at, v_net, v_tax, v_by, false,
            md5(v_doc::text));

    insert into public.sale_line
      (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
    values (v_ws, v_loc, v_doc, v_var.id, v_qty, v_qty, v_var.base_unit_code,
            v_price, v_net, v_tax, v_var.tax_rate);

    for v_alloc in
      select * from public.allocate_fefo(v_ws, v_loc, v_var.id, v_qty, v_by, v_at)
    loop
      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, sale_id, occurred_at, recorded_at, created_by)
      values (v_ws, v_loc, v_alloc.batch_id, v_var.id, 'sale', -v_alloc.qty_base,
              v_alloc.unit_cost_net_per_base, v_doc, v_at, v_at, v_by);
    end loop;

    insert into lg_op (run, step, kind, loc, variant, doc_kind, doc_id)
    values (p_run, p_step, 'sale', v_loc, v_var.id, 'sale', v_doc);

  -- -------------------------------------------------------------------------
  -- WASTE — the same allocation, plus the weighted-average cost 20_consumption
  -- puts on the line. `waste_line.unit_cost_net_per_base` is one number for a
  -- withdrawal that may have spanned three lots at three costs.
  -- -------------------------------------------------------------------------
  elsif v_kind = 'waste' then
    v_doc := gen_random_uuid();
    delete from lg_wa;
    v_cn := 0;
    v_cq := 0;

    for v_alloc in
      select * from public.allocate_fefo(v_ws, v_loc, v_var.id, v_qty, v_by, v_at)
    loop
      insert into lg_wa values (v_alloc.batch_id, v_alloc.qty_base,
                                v_alloc.unit_cost_net_per_base);
      v_cn := v_cn + v_alloc.qty_base * v_alloc.unit_cost_net_per_base;
      v_cq := v_cq + v_alloc.qty_base;
    end loop;

    insert into public.waste
      (id, workspace_id, location_id, occurred_at, recorded_at, total_net,
       total_tax, created_by, recorded_offline, payload_hash)
    values (v_doc, v_ws, v_loc, v_at, v_at, v_net, v_tax, v_by, false,
            md5(v_doc::text));

    insert into public.waste_line
      (workspace_id, location_id, waste_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate,
       reason, unit_cost_net_per_base)
    values (v_ws, v_loc, v_doc, v_var.id, v_qty, v_qty, v_var.base_unit_code,
            v_price, v_net, v_tax, v_var.tax_rate,
            (array['caducado', 'dañado', 'merma de preparación',
                   'robo o faltante']::public.waste_reason[])[1 + floor(random() * 4)],
            round(v_cn / nullif(v_cq, 0), 6));

    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, waste_id, occurred_at, recorded_at, created_by)
    select v_ws, v_loc, a.batch_id, v_var.id, 'waste', -a.qty, a.cost, v_doc,
           v_at, v_at, v_by
      from lg_wa a;

    insert into lg_op (run, step, kind, loc, variant, doc_kind, doc_id)
    values (p_run, p_step, 'waste', v_loc, v_var.id, 'waste', v_doc);

  -- -------------------------------------------------------------------------
  -- TRANSFER — THE CALLER WRITES NOTHING. `allocate_transfer()` does the whole
  -- paired write: FEFO-allocated negatives at the origin, one NEW batch at the
  -- destination per origin lot carrying cost and expiry forward, and the
  -- positives against them. This is the exact opposite of the sale branch above
  -- and confusing the two is how a transfer ends up double-counted.
  --
  -- It is also the only operation that crosses the "per location" boundary the
  -- ADR names, which is why the invariant is asserted per store below and not
  -- only in total: a transfer that credited the destination against the ORIGIN'S
  -- batch would net to zero across the workspace and be invisible to a total.
  -- -------------------------------------------------------------------------
  elsif v_kind = 'transfer' then
    select loc into v_to from lg_scope where loc <> v_loc order by random() limit 1;

    perform public.allocate_transfer(v_ws, v_loc, v_to, v_var.id, v_qty,
                                     gen_random_uuid(), v_at, v_by);

    insert into lg_op (run, step, kind, loc, variant)
    values (p_run, p_step, 'transfer', v_loc, v_var.id);

  -- -------------------------------------------------------------------------
  -- REVERSAL — a compensating document, its negated lines, and movements
  -- against THE SAME BATCH with the opposite sign, linked by
  -- `reversal_of_movement_id`. Nothing is mutated; 30_reversals.sql fixes this
  -- shape and this is it.
  --
  -- ⚠️ `reason` STAYS WHAT IT WAS on a negative movement, and that is legal only
  -- because the link is set: `stock_movement_sign_follows_reason` exempts a
  -- compensating movement and nothing else. A void that forgot its link is
  -- refused by the database — which is the property that makes this the branch
  -- most likely to break the invariant and the reason it is over-weighted.
  --
  -- ⚠️ ONLY THIS FILE'S OWN DOCUMENTS ARE VOIDED. Voiding a seed sale would
  -- leave `supabase/checks/seed_invariant.sql` describing a ledger that no
  -- longer matches it, two CI steps later. `lg_op` is what keeps that honest,
  -- and `*_one_reversal_idx` would refuse a second void anyway.
  --
  -- Transfers are not voided: they have no document to reverse (§2.4 — a
  -- transfer is a pair of movements, not a document), so there is no
  -- `reversal_of` to hang one on. Recorded rather than silently skipped.
  -- -------------------------------------------------------------------------
  else
    select * into v_t
      from lg_op
     where doc_id is not null and not reversed
       and doc_kind in ('purchase', 'sale', 'waste')
     order by random() limit 1;

    if v_t.doc_id is null then
      -- Only reachable in the first few steps of run 1, before anything exists
      -- to void. F3 asserts these are a small minority of the reversal draws,
      -- so a generator that silently stopped finding documents goes red.
      insert into lg_op (run, step, kind, loc) values (p_run, p_step, 'void-nothing', v_loc);
      return 'void-nothing';
    end if;

    v_rev := gen_random_uuid();

    if v_t.doc_kind = 'sale' then
      insert into public.sale
        (id, workspace_id, location_id, occurred_at, recorded_at, total_net,
         total_tax, reversal_of, reversal_reason, created_by, recorded_offline,
         payload_hash)
      select v_rev, s.workspace_id, s.location_id, v_at, v_at,
             -s.total_net, -s.total_tax, s.id, 'randomised void', v_by, false,
             md5(v_rev::text)
        from public.sale s where s.id = v_t.doc_id;

      insert into public.sale_line
        (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
         qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
      select sl.workspace_id, sl.location_id, v_rev, sl.variant_id,
             -sl.qty_base, -sl.qty_display, sl.qty_display_unit,
             sl.unit_price_net_per_base, -sl.line_net, -sl.tax_amount, sl.tax_rate
        from public.sale_line sl where sl.sale_id = v_t.doc_id;

      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, sale_id, reversal_of_movement_id, occurred_at,
         recorded_at, created_by)
      select m.workspace_id, m.location_id, m.batch_id, m.variant_id, m.reason,
             -m.qty_base, m.unit_cost_net_per_base, v_rev, m.id, v_at, v_at, v_by
        from public.stock_movement m where m.sale_id = v_t.doc_id;

    elsif v_t.doc_kind = 'waste' then
      insert into public.waste
        (id, workspace_id, location_id, occurred_at, recorded_at, total_net,
         total_tax, reversal_of, reversal_reason, created_by, recorded_offline,
         payload_hash)
      select v_rev, w.workspace_id, w.location_id, v_at, v_at,
             -w.total_net, -w.total_tax, w.id, 'randomised void', v_by, false,
             md5(v_rev::text)
        from public.waste w where w.id = v_t.doc_id;

      insert into public.waste_line
        (workspace_id, location_id, waste_id, variant_id, qty_base, qty_display,
         qty_display_unit, unit_price_net_per_base, line_net, tax_amount,
         tax_rate, reason, unit_cost_net_per_base)
      select wl.workspace_id, wl.location_id, v_rev, wl.variant_id,
             -wl.qty_base, -wl.qty_display, wl.qty_display_unit,
             wl.unit_price_net_per_base, -wl.line_net, -wl.tax_amount,
             wl.tax_rate, wl.reason, wl.unit_cost_net_per_base
        from public.waste_line wl where wl.waste_id = v_t.doc_id;

      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, waste_id, reversal_of_movement_id, occurred_at,
         recorded_at, created_by)
      select m.workspace_id, m.location_id, m.batch_id, m.variant_id, m.reason,
             -m.qty_base, m.unit_cost_net_per_base, v_rev, m.id, v_at, v_at, v_by
        from public.stock_movement m where m.waste_id = v_t.doc_id;

    else
      -- A VOIDED DELIVERY LEAVES ITS LOTS STANDING AND EMPTY. stock_batch is
      -- append-only; the void withdraws what the delivery put in, it does not
      -- delete the lot. If the lot has since been sold or transferred, the
      -- withdrawal drives it NEGATIVE — which is exactly 1.6c's voided delivery,
      -- and exactly the case the invariant has to survive.
      insert into public.purchase
        (id, workspace_id, location_id, provider_id, occurred_at, recorded_at,
         total_net, total_tax, reversal_of, reversal_reason, created_by,
         recorded_offline, payload_hash)
      select v_rev, p.workspace_id, p.location_id, p.provider_id, v_at, v_at,
             -p.total_net, -p.total_tax, p.id, 'randomised void', v_by, false,
             md5(v_rev::text)
        from public.purchase p where p.id = v_t.doc_id;

      insert into public.purchase_line
        (workspace_id, location_id, purchase_id, variant_id, qty_base,
         qty_display, qty_display_unit, unit_price_net_per_base, line_net,
         tax_amount, tax_rate, expiry_date)
      select pl.workspace_id, pl.location_id, v_rev, pl.variant_id,
             -pl.qty_base, -pl.qty_display, pl.qty_display_unit,
             pl.unit_price_net_per_base, -pl.line_net, -pl.tax_amount,
             pl.tax_rate, pl.expiry_date
        from public.purchase_line pl where pl.purchase_id = v_t.doc_id;

      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, purchase_id, reversal_of_movement_id,
         occurred_at, recorded_at, created_by)
      select m.workspace_id, m.location_id, m.batch_id, m.variant_id, m.reason,
             -m.qty_base, m.unit_cost_net_per_base, v_rev, m.id, v_at, v_at, v_by
        from public.stock_movement m where m.purchase_id = v_t.doc_id;
    end if;

    update lg_op set reversed = true where doc_id = v_t.doc_id;

    -- The void is recorded ALREADY REVERSED, so a later draw cannot pick it and
    -- void the void. A re-instatement is representable in this schema and is not
    -- what this file is about; leaving it drawable would put a document with
    -- negative lines through the negation above and make the mix harder to read
    -- than the property is worth.
    insert into lg_op (run, step, kind, loc, variant, doc_kind, doc_id, reversed)
    values (p_run, p_step, 'reversal', v_t.loc, v_t.variant, v_t.doc_kind, v_rev, true);
  end if;

  return v_kind;
end;
$lg$;


-- ---------------------------------------------------------------------------
-- THE RUNS
--
-- Sixteen runs of twenty-five operations — four hundred writes on top of the
-- seed's three months. The invariant is measured AFTER EVERY RUN rather than
-- once at the end, and that is not decoration: a defect that breaks the
-- projection and is then papered over by a later void would be invisible to a
-- single measurement at the tail, and the run number is what turns "the
-- invariant failed" into "the invariant failed after run 7, replay the seed and
-- stop there".
--
-- ⚠️ setseed() IS CALLED ONCE, HERE. `random()` then runs on across all four
-- hundred operations, which is what makes the whole sequence a function of the
-- one recorded number. Re-seeding per run was considered and rejected: it would
-- make each run independently reproducible, but it would also make sixteen
-- correlated sequences out of one, and the value of a recorded seed is that
-- replaying it replays THE WHOLE FILE.
-- ---------------------------------------------------------------------------
select setseed(:gen_seed);
update lg_seed set applied = :gen_seed;

do $$
declare
  v_run  int;
  v_step int;
begin
  for v_run in 1..16 loop
    for v_step in 1..25 loop
      perform pg_temp.lg_step(v_run, v_step);
    end loop;

    -- The §2.4 claim entire: every batch in the database, both tenants, all
    -- three stores, including the ones this file never touched.
    insert into lg_result (run, loc, store, violations, worst_delta, movs)
    select v_run, null, '(every location)',
           count(*),
           max(abs(v.movement_sum - coalesce(v.projected_remaining, 0))),
           (select count(*) from public.stock_movement)
      from public.batch_balance_violations() v;

    -- The same claim, PER LOCATION — §2.10's word, and the form a transfer can
    -- break without moving the total.
    insert into lg_result (run, loc, store, violations, worst_delta, movs)
    select v_run, l.loc, l.store,
           count(v.batch_id),
           max(abs(v.movement_sum - coalesce(v.projected_remaining, 0))),
           (select count(*) from public.stock_movement m where m.location_id = l.loc)
      from lg_loc l
      left join public.batch_balance_violations() v on v.location_id = l.loc
     group by l.loc, l.store;
  end loop;
end;
$$;

update lg_loc l
   set movs_after = (select count(*) from public.stock_movement m
                      where m.location_id = l.loc);


-- ---------------------------------------------------------------------------
-- THE C-BLOCK — SHOWING THE ORACLE CAN GO RED, IN THE FILE ITSELF
--
-- Task 3.4's done-when asks for the invariant to be "shown able to go red", and
-- ninety-odd green assertions that `batch_balance_violations()` returned nothing
-- are worth exactly as much as the function's ability to return something. That
-- ability is asserted here rather than assumed, on the same argument
-- `supabase/checks/seed_invariant.sql` makes at its own tail and for the same
-- reason ADR-035 §9 exists.
--
-- FOUR PROBES, AND THEY ARE NOT THE SAME PROBE FOUR TIMES:
--
--   C1  the MECHANISM. Disable stock_movement_project_balance_trg, write one
--       more generated operation, and the movements no longer reach the
--       projection. This is the only probe that breaks the ledger the way a
--       real defect would — by a movement that was never projected — and it is
--       the one that proves the assertions above are measuring the trigger and
--       not merely re-adding a column to itself.
--   C2  the REBUILD. Trigger back on, rebuild_batch_balance() over everything,
--       and the invariant holds again — "the projection is disposable and
--       rebuildable from the ledger" (§2.4), demonstrated rather than quoted,
--       and now over a ledger four hundred randomised operations deep.
--   C3  a WRONG NUMBER. Move one balance by a known delta and check the oracle
--       names that batch and that delta. A count alone would not distinguish
--       "the oracle noticed" from "the oracle always returns something".
--   C4  a MISSING ROW. Delete a balance row outright. This is the case the
--       LEFT JOIN in batch_balance_violations() exists for and the one an INNER
--       join would hide — a batch with no projection at all.
--   C5  REPAIR. Rebuild once more and the oracle is empty, so the file hands
--       the next CI step the database the reset built.
--
-- ⚠️ C1 AND C3/C4 ARE UNDONE EXPLICITLY, not left to the rollback. F12 asserts
-- the restore. 05's rule: an assertion that depends only on the rollback is an
-- assertion nobody ever sees fail.
-- ---------------------------------------------------------------------------

-- ⚠️ THE CONSTRAINT FLUSH BELOW IS REQUIRED AS OF MIGRATION 0015, AND WITHOUT IT
-- THIS FILE DOES NOT RUN. `alter table` is refused outright — "cannot ALTER TABLE
-- "stock_movement" because it has pending trigger events" — when the table has
-- deferred trigger events queued in the current transaction, and 0015 put two
-- DEFERRABLE INITIALLY DEFERRED constraint triggers on `stock_movement`. Every
-- movement the generator wrote above queued one.
--
-- `immediate` fires the queue and empties it; the ledger is complete at this
-- point, so they all pass, and a failure here would be a real finding rather
-- than noise. `deferred` puts the mode back, because the operation on the next
-- line opens lots of its own and the rule has to reach the END of this
-- transaction, not the middle of it.
set constraints all immediate;
set constraints all deferred;

alter table public.stock_movement disable trigger stock_movement_project_balance_trg;
select pg_temp.lg_step(99, 1);

insert into lg_red (probe, violations, detail)
select 'C1', count(*),
       'unprojected movements after the trigger was disabled for one operation'
  from public.batch_balance_violations();

-- Same reason as above: lg_step(99, 1) queued its own events.
set constraints all immediate;
set constraints all deferred;

alter table public.stock_movement enable trigger stock_movement_project_balance_trg;
select public.rebuild_batch_balance();

insert into lg_red (probe, violations, detail)
select 'C2', count(*), 'after rebuild_batch_balance() over the whole ledger'
  from public.batch_balance_violations();

-- C3. A KNOWN DELTA ON A NAMED BATCH. The batch is chosen deterministically —
-- the lowest id with a non-zero balance — so the diagnostic below is the same
-- string on every run and a reviewer can tell "the oracle found my corruption"
-- from "the oracle found something".
create temp table lg_bent as
select bb.batch_id, bb.remaining_base as was, 7.500::numeric(14,3) as delta
  from public.batch_balance bb
 where bb.remaining_base <> 0
 order by bb.batch_id
 limit 1;

update public.batch_balance bb
   set remaining_base = bb.remaining_base + (select delta from lg_bent)
 where bb.batch_id = (select batch_id from lg_bent);

insert into lg_red (probe, violations, detail)
select 'C3', count(*),
       coalesce(max(case when v.batch_id = (select batch_id from lg_bent)
                         then (v.projected_remaining - v.movement_sum)::text end),
                'the bent batch was not reported')
  from public.batch_balance_violations() v;

-- C4. NO PROJECTION ROW AT ALL, on a different batch, so C3's corruption is
-- still standing and the oracle has to report both.
create temp table lg_gone as
select bb.batch_id
  from public.batch_balance bb
 where bb.batch_id <> (select batch_id from lg_bent)
   and exists (select 1 from public.stock_movement m where m.batch_id = bb.batch_id)
 order by bb.batch_id desc
 limit 1;

delete from public.batch_balance where batch_id = (select batch_id from lg_gone);

insert into lg_red (probe, violations, detail)
select 'C4', count(*),
       case when bool_or(v.batch_id = (select batch_id from lg_gone)
                         and v.projected_remaining is null)
            then 'the deleted row is reported with a null projection'
            else 'the deleted row was NOT reported' end
  from public.batch_balance_violations() v;

select public.rebuild_batch_balance();

insert into lg_red (probe, violations, detail)
select 'C5', count(*), 'after the repair'
  from public.batch_balance_violations();


-- ---------------------------------------------------------------------------
-- The plan is COMPUTED from what was measured, never hardcoded: 14 fixed tests,
-- 5 for the C-block, one per row of `lg_result` (one whole-database row plus one
-- per location, per run), and one per run for the anti-vacuity guard. Adding a
-- store to the seed adds tests here the day it lands, with no edit.
--
-- ⚠️ THE NUMBER IS KEPT, and the tail of this file checks it was reached. A
-- computed plan that disagrees with the number of tests emitted DISARMS
-- `finish(exception_on_failure := true)` — silently. 3.3 found that out; every
-- suite written since carries the guard from the start, and this one does.
-- ---------------------------------------------------------------------------
create temp table lg_plan as
select (
  14
  + 5
  + (select count(*)::int from lg_result)
  + (select count(distinct run)::int from lg_result)
) as planned;

select plan((select planned from lg_plan));

select diag('06 seed value: ' || (select applied::text from lg_seed)
            || '  — replay with -v gen_seed=' || (select applied::text from lg_seed));


-- ---------------------------------------------------------------------------
-- Fixed tests F1–F14
-- ---------------------------------------------------------------------------

-- F1. THE SCOPE IS A REAL MULTI-STORE TENANT, resolved from the catalog. Every
-- transfer below needs two stores in one workspace; if the seed ever ships a
-- single-store workspace only, the transfer branch becomes a silent no-op and
-- a third of this suite stops asserting anything. This is where that is caught.
select ok(
  (select count(*) >= 2 from lg_scope)
  and (select count(distinct ws) = 1 from lg_scope)
  and (select ws is not null from lg_ws),
  'F1 the scope is one workspace holding at least two active stores, found from the catalog'
);

-- F2. SOMETHING WAS ACTUALLY GENERATED. Every per-run test below reads
-- `lg_result`, and `lg_result` is populated whether or not the generator wrote
-- anything at all — sixteen runs of zero operations would be sixty-four passing
-- assertions over an untouched seed. The floor is the four hundred draws the
-- loop makes, and the movements they produced.
select ok(
  (select count(*) = 401 from lg_op)                      -- 400 runs + the C1 op
  and (select count(distinct run) = 17 from lg_op)        -- 16 runs + run 99
  and (select sum(movs_after - movs_before) > 400 from lg_loc),
  'F2 400 operations were drawn across 16 runs and they wrote more movements than that'
);

-- F3. ALL FIVE KINDS THE ADR NAMES WERE EXERCISED, BY NAME. This is the floor
-- that matters most, and a count would not do it: a mix that quietly stopped
-- producing transfers would still draw four hundred operations, still write
-- thousands of movements, and still be green on every other assertion in this
-- file — while no longer testing the only operation that crosses a location.
-- Named, with a floor each, so the weights can be retuned but not to zero.
select ok(
  (select count(*) >= 60 from lg_op where kind = 'purchase')
  and (select count(*) >= 90 from lg_op where kind = 'sale')
  and (select count(*) >= 25 from lg_op where kind = 'waste')
  and (select count(*) >= 40 from lg_op where kind = 'transfer')
  and (select count(*) >= 25 from lg_op where kind = 'reversal')
  -- A void with nothing to void is only honest in the opening steps of run 1.
  and (select count(*) <= 3 from lg_op where kind = 'void-nothing'),
  'F3 purchase, sale, waste, transfer and reversal were each generated in volume'
);

-- F4. THE RECORDED SEED IS THE ONE THAT RAN. The header claims this file is
-- reproducible from one number; this is that claim asserted rather than
-- described. It reads what `setseed()` was actually given, so an override on
-- the command line passes with the override's value and the diagnostic above
-- prints the number that reproduces the run.
select is(
  (select applied from lg_seed),
  (select requested from lg_seed),
  'F4 the run used the recorded seed, and the diagnostic above names it'
);

-- F5. THE GENERATOR STAYED INSIDE ITS WORKSPACE. Nothing in `lg_step` names
-- another tenant, but nothing in `lg_step` names a tenant at all — the
-- workspace comes from `lg_ws` and the locations from `lg_scope`, and a join
-- that lost its `workspace_id` predicate would write next door without saying
-- so. The out-of-scope stores are measured for the invariant on every run AND
-- asserted untouched here, which is the pair that makes their zeros mean
-- something.
select ok(
  (select bool_and(movs_after = movs_before) from lg_loc where not in_scope)
  and (select bool_and(movs_after > movs_before) from lg_loc where in_scope)
  and (select count(*) > 0 from lg_loc where not in_scope),
  'F5 every in-scope store grew and every out-of-scope store did not move'
);

-- F6. THE TRANSFERS REALLY PAIRED. `allocate_transfer()` returning without
-- raising is not evidence that it wrote anything: this file `perform`s it and
-- discards the result, so a body that returned an empty set would look
-- identical from here. What is asserted is the shape §2.4 fixes — a NEW batch
-- at the destination, carrying cost and expiry forward from the lot it was cut
-- from, with `location_id` on the origin batch never touched.
select ok(
  (select count(*) > 0 from public.stock_batch sb
    where sb.origin = 'transfer' and sb.received_at >= timestamptz '2026-09-01')
  and (select count(*) = 0
         from public.stock_batch d
         join public.stock_batch o on o.id = d.source_batch_id
        where d.origin = 'transfer'
          and (d.unit_cost_net_per_base is distinct from o.unit_cost_net_per_base
               or d.expiry_date is distinct from o.expiry_date
               or d.location_id = o.location_id))
  -- `not exists` and not `count(*) = 0`: a GROUP BY … HAVING that matches
  -- nothing returns NO ROWS, so the scalar subquery is NULL and the whole
  -- conjunction is NULL — which pgTAP reports as a FAILED test with the result
  -- "was NULL", not as a pass. This test found that out the honest way.
  and (select not exists (
         select 1 from public.stock_movement m
          where m.transfer_group_id is not null
          group by m.transfer_group_id, m.variant_id
         having sum(m.qty_base) <> 0)),
  'F6 every transfer carried cost and expiry to a NEW lot at the other store, and its pair nets to zero'
);

-- F7. THE VOIDS REALLY COMPENSATED. A reversal that wrote a document and no
-- movements would leave the invariant holding and the ledger lying, and this
-- file's mix is 12% reversals precisely because that branch is the fragile one.
-- The claim is arithmetic and per movement: each compensating movement is the
-- exact negation of the one it names, against the same batch.
select ok(
  (select count(*) >= 25 from public.stock_movement
    where reversal_of_movement_id is not null and occurred_at >= timestamptz '2026-09-01')
  and (select count(*) = 0
         from public.stock_movement c
         join public.stock_movement o on o.id = c.reversal_of_movement_id
        where c.qty_base <> -o.qty_base or c.batch_id <> o.batch_id),
  'F7 every compensating movement is the exact negation of the movement it names, same batch'
);

-- F8. THE SHORTFALL BRANCHES WERE REACHED, AND THE INVARIANT SURVIVED THEM.
-- "v1 records stock, it does not enforce it" (§2.6): an oversale drives a lot
-- negative, and `batch_balance.remaining_base` is documented as allowed to be.
-- Negative lots are the interesting case for this invariant and they are the
-- one thing a hand-written fixture almost never produces — a generator that
-- picked only variants already in stock would be greener and would prove less.
--
-- ⚠️ THIS IS NOT AN ASSERTION THAT STOCK GOES NEGATIVE IN A SHOP. It is an
-- assertion that the generator reached the branch, so the zeros above are zeros
-- over a hard ledger. seed_invariant.sql makes the same point about the seed's
-- own seven negative lots.
select ok(
  (select count(*) > 20 from public.batch_balance where remaining_base < 0)
  and (select count(*) > 0 from public.stock_batch
        where origin = 'adjustment' and received_at >= timestamptz '2026-09-01'),
  'F8 hundreds of oversales drove lots negative and opened zero-cost adjustment lots, and the invariant held anyway'
);

-- F9. NEW LOTS WERE OPENED. Without this the whole file could be sales against
-- the seed's existing batches, which is one third of the mix pretending to be
-- all of it.
select cmp_ok(
  (select count(*)::int from public.stock_batch
    where origin = 'purchase' and received_at >= timestamptz '2026-09-01'),
  '>=', 60,
  'F9 the generated purchases opened new lots, one per purchase line'
);

-- F10. EVERY BATCH HAS A PROJECTION ROW. `batch_balance_violations()` already
-- covers this through its LEFT JOIN, but that is the oracle checking itself;
-- this is the same claim from the other side, counted directly, and it is what
-- goes red if the oracle's join were ever narrowed to an INNER one.
select is(
  (select count(*) from public.stock_batch sb
    where not exists (select 1 from public.batch_balance bb where bb.batch_id = sb.id)),
  0::bigint,
  'F10 no batch anywhere is missing its projection row'
);

-- F11. THE ORACLE CAN GO RED. Every per-run assertion below is "this returned
-- nothing"; without this test they are all satisfiable by a function that can
-- never return anything. C1 is the probe that matters — a movement that was
-- never projected, which is what a real defect in the trigger looks like.
select ok(
  (select violations > 0 from lg_red where probe = 'C1'),
  'F11 with the projection trigger off for one operation, the oracle reported violations'
);

-- F12. EVERYTHING THE C-BLOCK BROKE IS MENDED, EXPLICITLY. The rollback would
-- do it anyway; an assertion that depends only on the rollback is one nobody
-- ever sees fail, and the next CI step reads this database.
select ok(
  (select tgenabled = 'O' from pg_trigger
    where tgname = 'stock_movement_project_balance_trg'
      and tgrelid = 'public.stock_movement'::regclass)
  and (select violations = 0 from lg_red where probe = 'C5')
  and (select count(*) = 0 from public.batch_balance_violations()),
  'F12 the projection trigger is enabled again and the ledger is clean before the rollback'
);

-- F13. THE ORACLE ITSELF IS STILL WHAT IT WAS. Both functions are
-- `security definer` — they must be, because they read every tenant's rows —
-- and both pin `search_path` to nothing. Losing either turns a whole-ledger
-- audit into whatever the caller's search_path resolves to.
--
-- ⚠️ `set search_path = ''` IS STORED AS search_path="" — THE EMPTY STRING KEEPS
-- ITS QUOTES in `proconfig`. 05 wrote this test the obvious way first and it
-- failed against a correct schema. The quotes are stripped before comparison,
-- and this comment is here because someone will write it the obvious way again.
select ok(
  (select bool_and(p.prosecdef)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('batch_balance_violations', 'rebuild_batch_balance'))
  and (select bool_and(
         btrim(split_part(c, '=', 2), '"') = ''
       )
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     cross join lateral unnest(p.proconfig) as c
    where n.nspname = 'public'
      and p.proname in ('batch_balance_violations', 'rebuild_batch_balance')
      and c like 'search\_path=%'),
  'F13 the oracle and the rebuild are security definer with search_path pinned empty'
);

-- F14. THE MEASUREMENT COVERED EVERY LOCATION THAT EXISTS, and the per-run
-- rows are the ones that say so. §2.10's word is "per location"; a suite that
-- measured only the stores it wrote to would be reporting the invariant over
-- the half of the database it had already balanced. The out-of-scope store is
-- in every run's measurement precisely because nothing touched it.
select is(
  (select count(distinct loc)::int from lg_result where loc is not null),
  (select count(*)::int from public.location),
  'F14 every location in the database was measured for the invariant, on every run'
);


-- ---------------------------------------------------------------------------
-- C1–C5 — the oracle's own falsification, asserted
-- ---------------------------------------------------------------------------
select ok((select violations > 0 from lg_red where probe = 'C1'),
  'C1 a movement written with the projection trigger disabled is reported as a violation');

select is((select violations from lg_red where probe = 'C2'), 0::bigint,
  'C2 rebuild_batch_balance() over 400 randomised operations restores the invariant exactly');

-- Not just "something was reported" — the bent batch, by the exact amount it
-- was bent. `projected_remaining - movement_sum` is the delta the corruption
-- added, so the string is the number this file chose.
select is((select detail from lg_red where probe = 'C3'),
  (select delta::text from lg_bent),
  'C3 the oracle names the corrupted batch and the exact size of the disagreement');

select is((select detail from lg_red where probe = 'C4'),
  'the deleted row is reported with a null projection',
  'C4 a batch whose projection row was deleted is reported — the case the LEFT JOIN exists for');

select is((select violations from lg_red where probe = 'C5'), 0::bigint,
  'C5 the rebuild repairs both corruptions and the ledger is clean again');


-- ---------------------------------------------------------------------------
-- THE INVARIANT, PER RUN AND PER LOCATION
--
-- These are the assertions the file exists for, and there is nothing to them
-- beyond "the oracle is empty" — which is the whole of ADR-035 §2.4 and is why
-- F11 and the C-block above are not optional.
--
-- Ordered by run then store so a red CI log reads as a sequence and the first
-- failing run is the top of the block, not somewhere in the middle of it.
-- ---------------------------------------------------------------------------
select is(violations, 0::bigint,
  'run ' || lpad(run::text, 2) || ' §2.4 ' || store
  || ' — sum(movements) = batch_balance for every batch'
  || coalesce(' (worst disagreement ' || worst_delta::text || ')', ''))
from lg_result order by run, loc nulls first;

-- AND THE RUN WROTE SOMETHING. A zero from a location nothing touched is a true
-- zero and a worthless one. `lg_result.movs` is the movement count at the moment
-- the run was measured, so this is the ledger growing under the assertions
-- rather than beside them.
select cmp_ok(
  (select max(movs) from lg_result r2 where r2.run = r.run and r2.loc is null)::int,
  '>',
  coalesce((select max(movs) from lg_result r3
             where r3.run = r.run - 1 and r3.loc is null), 0)::int,
  'run ' || lpad(r.run::text, 2) || ' wrote movements — the zero above is over a ledger that moved')
from (select distinct run from lg_result) r order by r.run;


-- ---------------------------------------------------------------------------
-- `finish(exception_on_failure := true)` RAISES so psql exits non-zero; plain
-- psql prints "not ok" and exits 0. Same reasoning, and same spelling trap, as
-- 01_rls_coverage.sql documents at its own tail.
-- ---------------------------------------------------------------------------
select * from finish(exception_on_failure := true);

-- ---------------------------------------------------------------------------
-- THE GUARD `finish()` DOES NOT PROVIDE — 3.3's finding, carried from the start
--
--     IF curr_test <> exp_tests THEN
--         RETURN NEXT diag('Looks like you planned … but ran …');
--     ELSIF num_faild > 0 THEN
--         IF raise_ex THEN RAISE EXCEPTION …
--
-- An ELSIF. A plan that disagrees with the number of tests actually emitted
-- takes the first branch, the exception in the second is never reached, and
-- psql exits 0 with `not ok` lines in its output. Every suite here computes its
-- plan, so every suite can land in that branch; .github/workflows/db.yml is the
-- backstop for all of them and this is the per-file half, so the file defends
-- itself when it is run by hand.
--
-- ⚠️ THIS FILE IS THE ONE MOST EXPOSED TO IT. Its plan is four terms, two of
-- which count rows a loop inserted — retuning the run count or adding a store
-- to the seed moves the arithmetic, and getting it wrong is quiet.
-- ---------------------------------------------------------------------------
-- ⚠️ IT READS pgTAP'S OWN NUMBER, NOT THIS FILE'S ARITHMETIC — and that is a
-- correction to the guard 3.3 shipped in 05. Comparing `curr_test` against the
-- suite's own `planned` column asks "did the loop emit what the arithmetic
-- said", which misses the other half: `plan()` being CALLED with something else.
-- Falsified — `plan(planned + 1)` leaves curr_test equal to `planned`, so 05's
-- spelling of this guard passes while pgTAP prints "Looks like you planned 100
-- but ran 99" and psql exits 0. `tap._get('plan')` is the number pgTAP was
-- actually given, and comparing THAT to `curr_test` closes it. The third
-- comparison keeps the file's own arithmetic honest as well.
do $$
declare
  v_planned int := tap._get('plan');
  v_ran     int := tap._get('curr_test');
  v_computed int := (select planned from lg_plan);
begin
  if v_ran is distinct from v_planned or v_planned is distinct from v_computed then
    raise exception
      'plan/actual mismatch: plan() was given %, the file computed %, % tests ran '
      '— finish() reports this as a diagnostic and does NOT raise, so '
      'exception_on_failure was disarmed and any failing test above exited 0',
      v_planned, v_computed, v_ran;
  end if;
end;
$$;

-- The ROLLBACK is the second of the two undos: the C-block already re-enabled
-- the trigger and rebuilt the projection so F12 could assert it, and this
-- returns the four hundred generated documents, lots and movements. It is not
-- reached when a test fails — psql stops on the exception and drops the
-- connection, which rolls the transaction back anyway.
rollback;
