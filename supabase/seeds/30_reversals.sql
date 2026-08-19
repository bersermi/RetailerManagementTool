-- ============================================================================
-- 30_reversals.sql — the documents the shop took back
-- ============================================================================
-- docs/PLAN.md task 1.6c, the last third of the ledger seed. Runs after
-- 20_consumption.sql, which wrote the documents this file cancels.
--
-- WHAT THIS FILE WRITES:
--   * purchase / purchase_line with `reversal_of` set — three voided deliveries
--   * sale / sale_line     with `reversal_of` set — one voided ticket per store
--   * waste / waste_line   with `reversal_of` set — one voided write-off
--   * the compensating movements for all of them
--
-- ----------------------------------------------------------------------------
-- NOTHING IS MUTATED. THAT IS THE ONLY RULE HERE, AND IT HAS TEETH.
-- ----------------------------------------------------------------------------
-- "A void writes compensating documents referencing the original. Nothing is
-- mutated." (ADR-035 §2.4). Both halves of that are enforced by the schema and
-- neither is enforced by this file: `purchase`, `sale`, `waste`, `stock_batch`
-- and `stock_movement` all carry an append-only trigger that refuses an UPDATE
-- even to the `postgres` superuser (0003, 0004). So a void is an INSERT of a
-- mirror document, and a lot whose delivery was voided is left standing and
-- EMPTY — never deleted, never restated.
--
-- The shape of the mirror is fixed by 0003 and 0004 and was exercised in the
-- 0004 suite before it was ever seeded:
--
--   header    reversal_of = the original, reversal_reason set, totals NEGATED.
--             `purchase.total_net` is unsigned deliberately (0003), so a plain
--             `sum(total_net)` over the table is already net of voids.
--   lines     every column copied, quantity and money NEGATED together —
--             `*_money_follows_qty` refuses a positive quantity with a negative
--             total, and `*_qty_display_agrees` refuses a display quantity that
--             disagrees in sign with the base one.
--   movements same batch, same reason, same cost, opposite sign, and
--             `reversal_of_movement_id` pointing at the movement it cancels.
--             THE COMPENSATING MOVEMENT BELONGS TO THE REVERSAL DOCUMENT, not
--             to the original — `sale_id` on it is the void's id. That is the
--             convention 0004's suite already asserts, and it is what makes
--             "what did this document move" answerable per document.
--
-- Two partial unique indexes make double-voiding unrepresentable rather than
-- merely discouraged: `*_one_reversal_idx` on the document, and
-- `stock_movement_one_reversal_idx` on the movement. This file does not check
-- for them; it would fail loudly if it wrote a second void, which is the point.
--
-- ----------------------------------------------------------------------------
-- WHICH DOCUMENTS GET VOIDED, AND WHY IT IS NOT A COIN FLIP
-- ----------------------------------------------------------------------------
-- Every pick below is a RULE evaluated against the data, never a hardcoded date
-- and never a uuid — ids are regenerated on every reset, so an id can never be a
-- sort key or a tiebreak (docs/PLAN.md, "Settled in 1.6a"). Where a rule needs a
-- pseudo-random but stable choice it sorts by `payload_hash`, which is an md5
-- over a name-derived key and is the one stable identifier a document has.
--
-- The rules are chosen so that each void proves something a different one could
-- not:
--
--   1. A DELIVERY WHOSE STOCK IS STILL ON THE SHELF, at merchant A, picked to
--      own as much purchase-price memory as possible AND to include at least one
--      (provider, variant) pair it is the ONLY delivery for. Voiding it exercises
--      both halves of 0008: pairs that fall back to an older delivery, and a pair
--      that disappears from memory entirely rather than falling back to a zero.
--   2. THE SAME AT MERCHANT B, because a void that only ever happens in one
--      tenant is a void whose workspace predicate was never tested.
--   3. A DELIVERY WHOSE STOCK HAS ALREADY BEEN SOLD, at merchant A. This is the
--      honest case and the interesting one: the compensating movements take back
--      units that are no longer there, and the lots go NEGATIVE. That is legal
--      and correct — v1 records stock and does not enforce it (§2.6) — and it is
--      exactly where the projection would break if it were going to. The lots it
--      leaves negative are named in `_r_target` so the running-balance assertion
--      can tell this designed negative from an accidental one.
--   4. ONE TICKET PER STORE, the one that touched the most lots, so a void has to
--      credit several lots back and not just one.
--   5. ONE WRITE-OFF, at merchant A, on the same rule.
--
-- WHO FILES THE VOID: the person who filed the original. A cashier may void their
-- own ticket inside the 15-minute window (§2.7), and the tickets voided here are
-- voided minutes later, so the cashier is the right author. Deliveries and
-- write-offs were authored by a manager or an owner in 1.6a and 1.6b, and stay
-- with them — `waste_line` and `purchase_line` carry cost and are
-- manager-and-above, so a cashier voiding one would be a person who cannot read
-- back what they cancelled.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Refuse to run out of order, or twice
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.sale) then
    raise exception '30_reversals.sql runs after 20_consumption.sql — no sales found'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  if exists (select 1 from public.purchase where reversal_of is not null)
  or exists (select 1 from public.sale     where reversal_of is not null)
  or exists (select 1 from public.waste    where reversal_of is not null)
  or exists (select 1 from public.stock_movement where reversal_of_movement_id is not null) then
    raise exception '30_reversals.sql expects no reversals yet — run `supabase db reset`'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 1. Scaffolding
-- ----------------------------------------------------------------------------
-- Nothing named `_r_*` outlives this file.

-- What purchase-price memory said BEFORE anything was voided. The whole view,
-- not just the pairs about to change: the assertions below check that a void
-- moved exactly the pairs it should have and left every other pair alone, and
-- that second half is the one a broken exclusion would fail.
create table public._r_pre_memory as
  select * from public.provider_price_memory;

-- The documents to void, and why each one was chosen. `label` is the tiebreak
-- wherever order matters, because it is a name and the id is not.
create table public._r_target (
  kind      text not null,
  label     text not null,
  doc_id    uuid not null,
  void_at   timestamptz not null,
  reason    text not null,
  primary key (kind, doc_id)
);

-- The LOW-WATER MARK of every lot before anything was voided. The end-state
-- invariant is not enough here: a reversal that takes back stock already sold
-- drives a lot below zero, and a lot that dips and recovers is invisible to
-- `batch_balance_violations()`, which only ever sees the last row. Recording the
-- minimum first turns a vague "did anything go negative" into the precise claim
-- worth making — NO REVERSAL PUT A LOT INTO DEFICIT THAT WAS NOT IN DEFICIT
-- ALREADY, except the one delivery that was chosen for exactly that.
--
-- The window's tiebreak is `qty_base` before `id`: within one instant on one lot,
-- taking the withdrawals first is the pessimistic reading, and an assertion should
-- not be able to pass by choosing the flattering order.
create table public._r_pre_min as
  select batch_id, min(running) as min_running
    from (
      select m.batch_id,
             sum(m.qty_base) over (partition by m.batch_id
                                   order by m.occurred_at, m.qty_base, m.id
                                   rows between unbounded preceding and current row) as running
        from public.stock_movement m
    ) r
   group by batch_id;

-- Filled in as each void is written, so the assertions read one table instead of
-- re-deriving what was voided from the shape of the data.
create table public._r_void (
  kind        text not null,
  label       text not null,
  original_id uuid not null,
  reversal_id uuid not null,
  primary key (kind, original_id)
);


-- ----------------------------------------------------------------------------
-- 2. Choosing what to void
-- ----------------------------------------------------------------------------
-- Rules, evaluated against the data. Each one ends in a `limit 1` and therefore
-- needs a total order whose last key is a NAME or a hash over names — never an
-- id. Two resets that agree on the counts and disagree on the money is what an
-- id tiebreak looks like from the outside, and it is how 1.6b found its own
-- (docs/PLAN.md, "Settled in 1.6b").

-- --- (1) A delivery at merchant A whose stock has not been touched -----------
-- Ordered so the void moves as much purchase-price memory as possible, and
-- REQUIRED to include a pair it is the only delivery for, so that both branches
-- of 0008 — fall back, and disappear — are exercised by one document. If no such
-- delivery exists the insert selects nothing and section 3's assertion raises,
-- which is the correct failure: silently voiding a less interesting document
-- would leave the 0008 claim unproven and the seed still green.
insert into public._r_target (kind, label, doc_id, void_at, reason)
select 'purchase', 'A: entrega intacta, factura duplicada', c.id,
       c.occurred_at + interval '2 days' + interval '11 hours',
       'factura capturada dos veces, detectada al conciliar'
  from (
    select p.id, p.occurred_at, p.payload_hash,
           (select count(*) from public.provider_price_memory m
             where m.last_purchase_id = p.id) as owns_pairs,
           exists (
             select 1
               from public.provider_price_memory m
              where m.last_purchase_id = p.id
                and not exists (
                  select 1
                    from public.purchase p2
                    join public.purchase_line pl2 on pl2.purchase_id = p2.id
                   where p2.workspace_id = p.workspace_id
                     and p2.provider_id  = p.provider_id
                     and pl2.variant_id  = m.variant_id
                     and pl2.qty_base    > 0
                     and p2.reversal_of is null
                     and p2.id <> p.id)
           ) as owns_an_only_delivery
      from public.purchase p
     where p.workspace_id = (select id from public.workspace
                              where display_name = 'Tienda Doña Lupe')
       and p.reversal_of is null
       -- Every lot it opened is still exactly as it was received.
       and exists (select 1 from public.purchase_line pl where pl.purchase_id = p.id)
       and not exists (
             select 1
               from public.purchase_line pl
               join public.stock_batch b   on b.source_purchase_line_id = pl.id
               join public.batch_balance bb on bb.batch_id = b.id
              where pl.purchase_id = p.id
                and bb.remaining_base <> b.qty_received_base)
  ) c
 where c.owns_an_only_delivery
 order by c.owns_pairs desc, c.payload_hash
 limit 1;

-- --- (2) The same at merchant B ----------------------------------------------
-- No "only delivery" requirement: B's catalog is 25 products bought weekly, so
-- almost every pair has history to fall back to. What this one is for is the
-- workspace predicate — a void that only ever happens in one tenant proves
-- nothing about the other.
insert into public._r_target (kind, label, doc_id, void_at, reason)
select 'purchase', 'B: entrega intacta, factura duplicada', c.id,
       c.occurred_at + interval '2 days' + interval '10 hours',
       'factura capturada dos veces, detectada al conciliar'
  from (
    select p.id, p.occurred_at, p.payload_hash,
           (select count(*) from public.provider_price_memory m
             where m.last_purchase_id = p.id) as owns_pairs
      from public.purchase p
     where p.workspace_id = (select id from public.workspace
                              where display_name = 'Abarrotes El Roble')
       and p.reversal_of is null
       and exists (select 1 from public.purchase_line pl where pl.purchase_id = p.id)
       and not exists (
             select 1
               from public.purchase_line pl
               join public.stock_batch b   on b.source_purchase_line_id = pl.id
               join public.batch_balance bb on bb.batch_id = b.id
              where pl.purchase_id = p.id
                and bb.remaining_base <> b.qty_received_base)
  ) c
 order by c.owns_pairs desc, c.payload_hash
 limit 1;

-- --- (3) A delivery at merchant A that has already been sold through ----------
-- ⚠️ THIS ONE DRIVES LOTS NEGATIVE, DELIBERATELY. Every lot it opened has been
-- drawn down, so taking the delivery back takes back units that are no longer on
-- the shelf. `remaining_base` goes below zero and stays there.
--
-- That is the real shape of a duplicate invoice found a fortnight late, and it is
-- the case worth seeding: a reversal against an untouched lot can only ever
-- return a balance to where it started, so it exercises the projection at its
-- easiest point. This one exercises it where it is not.
--
-- The smallest such delivery, by line count, so the negative it leaves is a
-- comprehensible number rather than a spectacular one — the same reasoning 1.6b
-- used to size its overdraw.
insert into public._r_target (kind, label, doc_id, void_at, reason)
select 'purchase', 'A: entrega ya vendida, factura duplicada', c.id,
       c.occurred_at + interval '9 days' + interval '12 hours',
       'factura capturada dos veces, detectada al cierre del mes'
  from (
    select p.id, p.occurred_at, p.payload_hash,
           (select count(*) from public.purchase_line pl where pl.purchase_id = p.id) as lines
      from public.purchase p
     where p.workspace_id = (select id from public.workspace
                              where display_name = 'Tienda Doña Lupe')
       and p.reversal_of is null
       and exists (select 1 from public.purchase_line pl where pl.purchase_id = p.id)
       -- Not one lot of it survives untouched.
       and not exists (
             select 1
               from public.purchase_line pl
               join public.stock_batch b   on b.source_purchase_line_id = pl.id
               join public.batch_balance bb on bb.batch_id = b.id
              where pl.purchase_id = p.id
                and bb.remaining_base = b.qty_received_base)
  ) c
 order by c.lines, c.payload_hash
 limit 1;

-- --- (4) One ticket per store -------------------------------------------------
-- The ticket that touched the most lots, so the void has to credit several lots
-- back rather than one. Voided between two and thirteen minutes later: inside the
-- 15-minute window `workspace_setting.void_window_minutes` gives a cashier over
-- their own sale, because that is who is voiding it.
--
-- THE TWO DESIGNED OVERSALES ARE EXCLUDED BY NAME. 1.6b wrote them to leave a lot
-- negative and to open a zero-cost adjustment lot, and both facts are asserted at
-- the end of that file; voiding either would quietly undo the evidence a later
-- step is meant to be judged against. Their `payload_hash` values are md5 over a
-- fixed string, which is exactly why they can be named here without an id.
insert into public._r_target (kind, label, doc_id, void_at, reason)
select 'sale', 'ticket ' || l.name, s.id,
       s.occurred_at + ((2 + abs(hashtext(s.payload_hash)) % 12) || ' minutes')::interval,
       'cobrado por error, se volvió a capturar'
  from (
    select distinct on (s.location_id)
           s.id, s.location_id, s.occurred_at, s.payload_hash
      from public.sale s
     where s.reversal_of is null
       and s.payload_hash not in (md5('oversale-overdraw'), md5('oversale-never-stocked'))
     order by s.location_id,
              (select count(*) from public.stock_movement m where m.sale_id = s.id) desc,
              s.payload_hash
  ) s
  join public.location l on l.id = s.location_id;

-- --- (5) One write-off, at merchant A -----------------------------------------
-- Same rule. Voided the next morning by its own author, who is a manager or an
-- owner — a write-off is not a till event and there is no 15-minute window on it.
insert into public._r_target (kind, label, doc_id, void_at, reason)
select 'waste', 'merma ' || l.name, w.id,
       date_trunc('day', w.occurred_at) + interval '1 day 9 hours',
       'capturado dos veces en el mismo turno'
  from public.waste w
  join public.location l on l.id = w.location_id
 where w.workspace_id = (select id from public.workspace
                          where display_name = 'Tienda Doña Lupe')
   and w.reversal_of is null
 order by (select count(*) from public.stock_movement m where m.waste_id = w.id) desc,
          w.payload_hash
 limit 1;


-- ----------------------------------------------------------------------------
-- 3. The voided deliveries
-- ----------------------------------------------------------------------------
-- Header, then lines, then compensating movements — the same order 1.6a and 1.6b
-- were forced into, and for the same reason: `stock_movement.purchase_id` points
-- at a document that has to exist first, and `purchase` is append-only so its
-- totals cannot be patched in afterwards. Here the totals are not derived at all,
-- they are the original's negated, which is the whole definition of a void.

do $$
declare
  v_t   record;
  v_rev uuid;
  v_by  uuid;
  v_n   integer;
begin
  select count(*) into v_n from public._r_target where kind = 'purchase';
  if v_n <> 3 then
    raise exception '30_reversals: expected 3 deliveries to void, the rules chose % — '
                    'the one that must own a sole-source (provider, variant) pair is '
                    'the rule that fails silently', v_n;
  end if;

  for v_t in select * from public._r_target where kind = 'purchase' order by label
  loop
    v_rev := gen_random_uuid();
    select created_by into v_by from public.purchase where id = v_t.doc_id;

    insert into public.purchase
      (id, workspace_id, location_id, provider_id, occurred_at, recorded_at,
       total_net, total_tax, reversal_of, reversal_reason, created_by,
       recorded_offline, payload_hash)
    select v_rev, p.workspace_id, p.location_id, p.provider_id, v_t.void_at, v_t.void_at,
           -p.total_net, -p.total_tax, p.id, v_t.reason, p.created_by, false,
           md5('void|' || p.payload_hash)
      from public.purchase p
     where p.id = v_t.doc_id;

    -- Quantity and money negated together. `expiry_date` is copied rather than
    -- cleared: the line is a mirror of what was recorded, and the delivery it
    -- cancels did carry that date.
    insert into public.purchase_line
      (workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate,
       expiry_date)
    select pl.workspace_id, pl.location_id, v_rev, pl.variant_id,
           -pl.qty_base, -pl.qty_display, pl.qty_display_unit,
           pl.unit_price_net_per_base, -pl.line_net, -pl.tax_amount, pl.tax_rate,
           pl.expiry_date
      from public.purchase_line pl
     where pl.purchase_id = v_t.doc_id;

    -- `reason` stays 'purchase' on a negative movement. That is legal only
    -- because `reversal_of_movement_id` is set — `stock_movement_sign_follows_reason`
    -- exempts a compensating movement and nothing else, so a negative purchase
    -- movement that forgot its link is refused by the database (0004).
    --
    -- THE LOT IS LEFT STANDING AND EMPTY. `stock_batch` is append-only; a voided
    -- delivery does not delete the lots it opened, it withdraws what it put in
    -- them. A lot at zero that never sold anything is what a voided delivery
    -- looks like in this schema, and it is the honest record.
    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, purchase_id, reversal_of_movement_id,
       occurred_at, recorded_at, created_by)
    select m.workspace_id, m.location_id, m.batch_id, m.variant_id, m.reason,
           -m.qty_base, m.unit_cost_net_per_base, v_rev, m.id,
           v_t.void_at, v_t.void_at, v_by
      from public.stock_movement m
     where m.purchase_id = v_t.doc_id;

    insert into public._r_void (kind, label, original_id, reversal_id)
    values ('purchase', v_t.label, v_t.doc_id, v_rev);
  end loop;
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. The voided tickets
-- ----------------------------------------------------------------------------
-- Identical shape, one table down. The compensating movements are POSITIVE and
-- land back on the exact lots the sale consumed — `stock_movement_reversal_fk`
-- carries `batch_id`, so crediting a void to a different lot is not something
-- this file could get wrong even if it tried (0004).

do $$
declare
  v_t   record;
  v_rev uuid;
  v_by  uuid;
begin
  for v_t in select * from public._r_target where kind = 'sale' order by label
  loop
    v_rev := gen_random_uuid();
    select created_by into v_by from public.sale where id = v_t.doc_id;

    insert into public.sale
      (id, workspace_id, location_id, occurred_at, recorded_at, total_net, total_tax,
       reversal_of, reversal_reason, created_by, recorded_offline, payload_hash)
    select v_rev, s.workspace_id, s.location_id, v_t.void_at, v_t.void_at,
           -s.total_net, -s.total_tax, s.id, v_t.reason, s.created_by, false,
           md5('void|' || s.payload_hash)
      from public.sale s
     where s.id = v_t.doc_id;

    insert into public.sale_line
      (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
    select sl.workspace_id, sl.location_id, v_rev, sl.variant_id,
           -sl.qty_base, -sl.qty_display, sl.qty_display_unit,
           sl.unit_price_net_per_base, -sl.line_net, -sl.tax_amount, sl.tax_rate
      from public.sale_line sl
     where sl.sale_id = v_t.doc_id;

    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, sale_id, reversal_of_movement_id,
       occurred_at, recorded_at, created_by)
    select m.workspace_id, m.location_id, m.batch_id, m.variant_id, m.reason,
           -m.qty_base, m.unit_cost_net_per_base, v_rev, m.id,
           v_t.void_at, v_t.void_at, v_by
      from public.stock_movement m
     where m.sale_id = v_t.doc_id;

    insert into public._r_void (kind, label, original_id, reversal_id)
    values ('sale', v_t.label, v_t.doc_id, v_rev);
  end loop;
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. The voided write-off
-- ----------------------------------------------------------------------------
-- `waste_line.reason` and `unit_cost_net_per_base` are copied, not recomputed.
-- The cost snapshot is what that loss cost on the day it was recorded; a void
-- says the loss did not happen, not that it cost something else.

do $$
declare
  v_t   record;
  v_rev uuid;
  v_by  uuid;
begin
  for v_t in select * from public._r_target where kind = 'waste' order by label
  loop
    v_rev := gen_random_uuid();
    select created_by into v_by from public.waste where id = v_t.doc_id;

    insert into public.waste
      (id, workspace_id, location_id, occurred_at, recorded_at, total_net, total_tax,
       reversal_of, reversal_reason, created_by, recorded_offline, payload_hash)
    select v_rev, w.workspace_id, w.location_id, v_t.void_at, v_t.void_at,
           -w.total_net, -w.total_tax, w.id, v_t.reason, w.created_by, false,
           md5('void|' || w.payload_hash)
      from public.waste w
     where w.id = v_t.doc_id;

    insert into public.waste_line
      (workspace_id, location_id, waste_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate,
       reason, unit_cost_net_per_base)
    select wl.workspace_id, wl.location_id, v_rev, wl.variant_id,
           -wl.qty_base, -wl.qty_display, wl.qty_display_unit,
           wl.unit_price_net_per_base, -wl.line_net, -wl.tax_amount, wl.tax_rate,
           wl.reason, wl.unit_cost_net_per_base
      from public.waste_line wl
     where wl.waste_id = v_t.doc_id;

    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, waste_id, reversal_of_movement_id,
       occurred_at, recorded_at, created_by)
    select m.workspace_id, m.location_id, m.batch_id, m.variant_id, m.reason,
           -m.qty_base, m.unit_cost_net_per_base, v_rev, m.id,
           v_t.void_at, v_t.void_at, v_by
      from public.stock_movement m
     where m.waste_id = v_t.doc_id;

    insert into public._r_void (kind, label, original_id, reversal_id)
    values ('waste', v_t.label, v_t.doc_id, v_rev);
  end loop;
end;
$$;


-- ----------------------------------------------------------------------------
-- 6. Assertions
-- ----------------------------------------------------------------------------
-- `supabase db reset` exits non-zero when any of these raises, so they are a CI
-- gate on every push — confirmed in 1.5 by falsifying three of the skeleton's own
-- and watching the reset exit 1.

do $$
declare
  v_n integer; v_fell integer; v_gone integer; v_tied integer;
begin
  -- --- THE §2.4 INVARIANT, ACROSS EVERY VOID ----------------------------------
  select count(*) into v_n from public.batch_balance_violations();
  if v_n > 0 then
    raise exception '30_reversals: % batch balance violation(s)', v_n;
  end if;

  -- --- every original movement is compensated exactly once ---------------------
  select count(*) into v_n
    from public.stock_movement m
   where (m.purchase_id in (select original_id from public._r_void where kind = 'purchase')
       or m.sale_id     in (select original_id from public._r_void where kind = 'sale')
       or m.waste_id    in (select original_id from public._r_void where kind = 'waste'))
     and not exists (select 1 from public.stock_movement r
                      where r.reversal_of_movement_id = m.id);
  if v_n > 0 then
    raise exception '30_reversals: % movement(s) of a voided document were never compensated', v_n;
  end if;

  -- Nothing outside a voided document grew a compensating movement. The partial
  -- unique index already stops a movement being reversed twice; this stops one
  -- being reversed at all when its document still stands.
  select count(*) into v_n
    from public.stock_movement r
    join public.stock_movement o on o.id = r.reversal_of_movement_id
   where not coalesce(o.purchase_id in (select original_id from public._r_void where kind = 'purchase'), false)
     and not coalesce(o.sale_id     in (select original_id from public._r_void where kind = 'sale'), false)
     and not coalesce(o.waste_id    in (select original_id from public._r_void where kind = 'waste'), false);
  if v_n > 0 then
    raise exception '30_reversals: % compensating movement(s) cancel a document that was not voided', v_n;
  end if;

  -- --- and it is an exact mirror ------------------------------------------------
  -- Same lot, same product, same reason, same cost, opposite quantity. The batch
  -- and the sign are enforced by the schema; the reason and the cost are not, and
  -- a void that re-costs the units it takes back is how a margin report quietly
  -- stops adding up.
  select count(*) into v_n
    from public.stock_movement r
    join public.stock_movement o on o.id = r.reversal_of_movement_id
   where r.batch_id   <> o.batch_id
      or r.variant_id <> o.variant_id
      or r.reason     <> o.reason
      or r.unit_cost_net_per_base <> o.unit_cost_net_per_base
      or r.qty_base   <> -o.qty_base;
  if v_n > 0 then
    raise exception '30_reversals: % compensating movement(s) are not a mirror of what they cancel', v_n;
  end if;

  -- The compensating movement belongs to the REVERSAL document, not the original.
  -- 0004's suite fixed this convention before any of it was seeded, and it is what
  -- makes "what did this document move" a question with one answer.
  select count(*) into v_n
    from public.stock_movement r
   where r.reversal_of_movement_id is not null
     and coalesce(r.purchase_id, r.sale_id, r.waste_id)
           not in (select reversal_id from public._r_void);
  if v_n > 0 then
    raise exception '30_reversals: % compensating movement(s) are filed against the original document', v_n;
  end if;

  -- --- the pair moves no stock at all -------------------------------------------
  -- Document plus void, per lot, sums to zero. This is the claim a shop actually
  -- cares about: the void undid the delivery, not approximately.
  select count(*) into v_n from (
    select m.batch_id
      from public.stock_movement m
      join public._r_void v
        on m.purchase_id in (v.original_id, v.reversal_id)
        or m.sale_id     in (v.original_id, v.reversal_id)
        or m.waste_id    in (v.original_id, v.reversal_id)
     group by v.kind, v.original_id, m.batch_id
    having sum(m.qty_base) <> 0) q;
  if v_n > 0 then
    raise exception '30_reversals: % lot(s) were left moved by a voided document and its void', v_n;
  end if;

  -- --- no lot was driven NEGATIVE that was not already ---------------------------
  -- Except the delivery chosen to do exactly that. Its lots had been sold through
  -- before the duplicate invoice was found, so taking the delivery back takes back
  -- units that are no longer on the shelf: legal, recorded and not enforced (§2.6),
  -- and the only place in this file where a balance moves below zero.
  --
  -- BELOW ZERO, not merely lower. Voiding an INTACT delivery also lowers a lot's
  -- low-water mark — from everything it received down to nothing — and that is the
  -- correct outcome rather than a violation. It is the sign that carries the claim:
  -- a reversal must not put a lot into deficit unless it was in deficit already, or
  -- unless it is the one delivery this file voided knowing that it would. The first
  -- draft compared the marks alone and raised on all 18 lots of the two intact
  -- deliveries, which is how the distinction got written down.
  select count(*) into v_n
    from (
      select batch_id, min(running) as min_running
        from (
          select batch_id,
                 sum(qty_base) over (partition by batch_id
                                     order by occurred_at, qty_base, id
                                     rows between unbounded preceding and current row) as running
            from public.stock_movement
        ) r
       group by batch_id
    ) post
    join public._r_pre_min pre on pre.batch_id = post.batch_id
   where post.min_running < 0
     and post.min_running < pre.min_running
     and post.batch_id not in (
       select b.id
         from public.stock_batch b
         join public.purchase_line pl on pl.id = b.source_purchase_line_id
        where pl.purchase_id = (select original_id from public._r_void
                                 where label = 'A: entrega ya vendida, factura duplicada'));
  if v_n > 0 then
    raise exception '30_reversals: % lot(s) were driven lower by a void outside the one delivery designed to do it', v_n;
  end if;

  -- And that delivery did what it was chosen for. A rule that quietly picked a
  -- delivery whose stock happened to be intact would leave this branch untested
  -- and every other assertion in this file still green.
  if not exists (
    select 1 from public.batch_balance bb
      join public.stock_batch b on b.id = bb.batch_id
      join public.purchase_line pl on pl.id = b.source_purchase_line_id
     where pl.purchase_id = (select original_id from public._r_void
                              where label = 'A: entrega ya vendida, factura duplicada')
       and bb.remaining_base < 0) then
    raise exception '30_reversals: the sold-through delivery left no lot negative — it was not sold through';
  end if;

  -- The two intact deliveries close their lots at exactly zero: everything that
  -- was put in came back out, and the lots are still there.
  if exists (
    select 1 from public.batch_balance bb
      join public.stock_batch b on b.id = bb.batch_id
      join public.purchase_line pl on pl.id = b.source_purchase_line_id
      join public._r_void v on v.original_id = pl.purchase_id
     where v.label like '%entrega intacta%' and bb.remaining_base <> 0) then
    raise exception '30_reversals: a voided intact delivery left stock behind';
  end if;

  -- --- the documents mirror too ---------------------------------------------------
  if exists (
    select 1 from public._r_void v
      join public.purchase o on o.id = v.original_id
      join public.purchase r on r.id = v.reversal_id
     where v.kind = 'purchase'
       and (r.total_net <> -o.total_net or r.total_tax <> -o.total_tax
            or r.provider_id <> o.provider_id or r.location_id <> o.location_id)) then
    raise exception '30_reversals: a voided delivery is not the negative of what it cancels';
  end if;
  if exists (
    select 1 from public._r_void v
      join public.sale o on o.id = v.original_id
      join public.sale r on r.id = v.reversal_id
     where v.kind = 'sale'
       and (r.total_net <> -o.total_net or r.total_tax <> -o.total_tax)) then
    raise exception '30_reversals: a voided ticket is not the negative of what it cancels';
  end if;
  if exists (
    select 1 from public._r_void v
      join public.waste o on o.id = v.original_id
      join public.waste r on r.id = v.reversal_id
     where v.kind = 'waste'
       and (r.total_net <> -o.total_net or r.total_tax <> -o.total_tax)) then
    raise exception '30_reversals: a voided write-off is not the negative of what it cancels';
  end if;

  -- Totals are still the sum of the rounded lines, on the void as much as on the
  -- original — a negated document total that does not match its negated lines is
  -- a rounding error that only shows up on the void (§2.5).
  if exists (
    select 1 from public.purchase p
      join (select purchase_id, sum(line_net) n, sum(tax_amount) t
              from public.purchase_line group by purchase_id) l on l.purchase_id = p.id
     where p.reversal_of is not null and (p.total_net <> l.n or p.total_tax <> l.t)) then
    raise exception '30_reversals: a voided delivery total is not the sum of its rounded lines';
  end if;
  if exists (
    select 1 from public.sale s
      join (select sale_id, sum(line_net) n, sum(tax_amount) t
              from public.sale_line group by sale_id) l on l.sale_id = s.id
     where s.reversal_of is not null and (s.total_net <> l.n or s.total_tax <> l.t)) then
    raise exception '30_reversals: a voided ticket total is not the sum of its rounded lines';
  end if;
  if exists (
    select 1 from public.waste w
      join (select waste_id, sum(line_net) n, sum(tax_amount) t
              from public.waste_line group by waste_id) l on l.waste_id = w.id
     where w.reversal_of is not null and (w.total_net <> l.n or w.total_tax <> l.t)) then
    raise exception '30_reversals: a voided write-off total is not the sum of its rounded lines';
  end if;

  -- --- purchase price memory: the reason 0008 is a view and not a table ------------
  -- Nothing may prefill from a document that was voided, or from the void itself.
  -- A cached price would need a write path here, and the write path nobody
  -- remembers to build is this one (0008's header).
  if exists (
    select 1 from public.provider_price_memory m
     where m.last_purchase_id in (select original_id from public._r_void where kind = 'purchase')
        or m.last_purchase_id in (select reversal_id from public._r_void where kind = 'purchase')) then
    raise exception '30_reversals: a voided delivery is still prefilling';
  end if;

  -- Of the pairs those deliveries owned: some fall back to the last delivery that
  -- still stands, and at least one has nothing to fall back to and DISAPPEARS —
  -- which Comprar renders as an empty state and not as a zero (§2.8).
  select count(*) into v_fell
    from public._r_pre_memory pre
    join public.provider_price_memory cur
      on  cur.workspace_id = pre.workspace_id
      and cur.provider_id  = pre.provider_id
      and cur.variant_id   = pre.variant_id
   where pre.last_purchase_id in (select original_id from public._r_void where kind = 'purchase')
     and cur.last_purchase_id <> pre.last_purchase_id
     and cur.last_purchased_at <= pre.last_purchased_at;
  select count(*) into v_gone
    from public._r_pre_memory pre
   where pre.last_purchase_id in (select original_id from public._r_void where kind = 'purchase')
     and not exists (
       select 1 from public.provider_price_memory cur
        where cur.workspace_id = pre.workspace_id
          and cur.provider_id  = pre.provider_id
          and cur.variant_id   = pre.variant_id);
  if v_fell = 0 then
    raise exception '30_reversals: no (provider, variant) pair fell back to an older delivery';
  end if;
  if v_gone = 0 then
    raise exception '30_reversals: no pair lost its only delivery — the disappearing case is unproven';
  end if;
  if v_fell + v_gone <> (select count(*) from public._r_pre_memory
                          where last_purchase_id in (select original_id from public._r_void
                                                      where kind = 'purchase')) then
    raise exception '30_reversals: a pair owned by a voided delivery neither fell back nor disappeared';
  end if;

  -- AND NOTHING ELSE MOVED. A void that disturbs a pair it has no line for is an
  -- exclusion written one predicate too wide, and it would be invisible in the two
  -- checks above.
  select count(*) into v_n
    from public._r_pre_memory pre
    left join public.provider_price_memory cur
      on  cur.workspace_id = pre.workspace_id
      and cur.provider_id  = pre.provider_id
      and cur.variant_id   = pre.variant_id
   where pre.last_purchase_id not in (select original_id from public._r_void where kind = 'purchase')
     and (cur.last_purchase_id is distinct from pre.last_purchase_id
          or cur.unit_price_net_per_base is distinct from pre.unit_price_net_per_base);
  if v_n > 0 then
    raise exception '30_reversals: % pair(s) not owned by a voided delivery changed anyway', v_n;
  end if;
  select count(*) into v_n
    from public.provider_price_memory cur
   where not exists (select 1 from public._r_pre_memory pre
                      where pre.workspace_id = cur.workspace_id
                        and pre.provider_id  = cur.provider_id
                        and pre.variant_id   = cur.variant_id);
  if v_n > 0 then
    raise exception '30_reversals: % pair(s) appeared out of a void — a negative line reached memory', v_n;
  end if;

  -- ⚠️ FOUND HERE: THE VIEW'S LAST TIEBREAK IS A UUID, SO THE PREFILL IS NOT
  -- REPRODUCIBLE ACROSS RESETS. `provider_price_memory` orders by occurred_at,
  -- then recorded_at, then `p.id desc, pl.id desc` (0008). Purchase-price memory
  -- is workspace-wide, and 1.6a delivers to both of merchant A's stores from one
  -- provider on the same morning at the same hour, with recorded_at equal to
  -- occurred_at. Two documents therefore tie on every key that is not an id — and
  -- ids are regenerated on every reset, so the view answers with Centro's price on
  -- one reset and the Mercado's on the next, off byte-identical seed data. Three
  -- resets agree on every count and every total in this seed's own tables and
  -- disagree on the sum of the prefills, which is how it was found.
  --
  -- IT IS NOT A CORRECTNESS BUG AND IT IS NOT NOTHING. Both tied rows are prices
  -- the shop genuinely paid that morning, so no prefill is ever wrong; it is
  -- arbitrary, and it is arbitrary in production too, where the ids are generated
  -- by the client at cart open. The same tie is what a shop with two branches on
  -- one delivery round produces every week.
  --
  -- NOT PATCHED HERE, for the reason 1.6b left `received_at` alone: the seed must
  -- not work around the object it exists to exercise, and 0008 is applied and
  -- therefore closed. What this assertion does is bound it — every tie must be
  -- BETWEEN TWO STORES of one workspace, which is the mechanism named above. A tie
  -- inside a single store would be a different and worse fact: one delivery
  -- recorded twice, or two lines for the same variant on one document, and the
  -- view would be picking between them by uuid as well.
  select count(*) into v_n from (
    select c.workspace_id, c.provider_id, c.variant_id
      from (
        select pl.workspace_id, p.provider_id, pl.variant_id, p.location_id,
               rank() over (partition by pl.workspace_id, p.provider_id, pl.variant_id
                            order by p.occurred_at desc, p.recorded_at desc) as rnk
          from public.purchase_line pl
          join public.purchase p
            on  p.id = pl.purchase_id and p.workspace_id = pl.workspace_id
            and p.location_id = pl.location_id
         where p.reversal_of is null
           and not exists (select 1 from public.purchase r where r.reversal_of = p.id)
           and pl.qty_base > 0
      ) c
     where c.rnk = 1
     group by 1, 2, 3
    having count(*) > count(distinct c.location_id)) t;
  if v_n > 0 then
    raise exception '30_reversals: % (provider, variant) pair(s) tie on the price-memory sort within ONE store', v_n;
  end if;
  select count(*) into v_tied from (
    select c.workspace_id, c.provider_id, c.variant_id
      from (
        select pl.workspace_id, p.provider_id, pl.variant_id,
               rank() over (partition by pl.workspace_id, p.provider_id, pl.variant_id
                            order by p.occurred_at desc, p.recorded_at desc) as rnk
          from public.purchase_line pl
          join public.purchase p
            on  p.id = pl.purchase_id and p.workspace_id = pl.workspace_id
            and p.location_id = pl.location_id
         where p.reversal_of is null
           and not exists (select 1 from public.purchase r where r.reversal_of = p.id)
           and pl.qty_base > 0
      ) c
     where c.rnk = 1
     group by 1, 2, 3
    having count(*) > 1) t;
  if v_tied > 30 then
    raise exception '30_reversals: % pairs are decided by a uuid tiebreak — that exception is widening', v_tied;
  end if;

  -- --- a plain sum is already net of voids -----------------------------------------
  -- The reason the money columns are unsigned in 0003. If this stops holding, every
  -- total in Números is gross of cancellations and nobody finds out from the schema.
  if (select sum(total_net) from public.sale)
     >= (select sum(total_net) from public.sale where reversal_of is null) then
    raise exception '30_reversals: voided tickets did not reduce the plain revenue sum';
  end if;

  -- --- shape and coverage -------------------------------------------------------
  if (select count(distinct kind) from public._r_void) <> 3 then
    raise exception '30_reversals: all three document kinds must be voided';
  end if;
  if (select count(*) from public._r_void where kind = 'sale') <> 3 then
    raise exception '30_reversals: one ticket per store, and there are three stores';
  end if;
  if (select count(distinct s.workspace_id) from public.sale s where s.reversal_of is not null) <> 2
  or (select count(distinct p.workspace_id) from public.purchase p where p.reversal_of is not null) <> 2 then
    raise exception '30_reversals: both merchants must carry voids — a one-tenant void tests no workspace predicate';
  end if;
  if exists (select 1 from public.purchase where reversal_of is not null and btrim(coalesce(reversal_reason,'')) = '')
  or exists (select 1 from public.sale     where reversal_of is not null and btrim(coalesce(reversal_reason,'')) = '')
  or exists (select 1 from public.waste    where reversal_of is not null and btrim(coalesce(reversal_reason,'')) = '') then
    raise exception '30_reversals: a void with no reason is an audit trail that answers nothing';
  end if;

  -- Nothing was voided twice. The partial unique indexes make this unrepresentable;
  -- asserting it is how the seed proves it never went near them.
  if (select count(*) from public.purchase where reversal_of is not null)
     <> (select count(distinct reversal_of) from public.purchase where reversal_of is not null)
  or (select count(*) from public.sale where reversal_of is not null)
     <> (select count(distinct reversal_of) from public.sale where reversal_of is not null)
  or (select count(*) from public.waste where reversal_of is not null)
     <> (select count(distinct reversal_of) from public.waste where reversal_of is not null) then
    raise exception '30_reversals: a document was voided more than once';
  end if;

  -- --- who filed the void ---------------------------------------------------------
  -- A cashier may void their own ticket inside the window; nobody below manager
  -- files a void that carries cost, because `purchase_line` and `waste_line` are
  -- manager-and-above and the author must be able to read back what they cancelled.
  if exists (
    select 1 from public.purchase p
      join public.workspace_member wm
        on wm.user_id = p.created_by and wm.workspace_id = p.workspace_id
     where p.reversal_of is not null and wm.role = 'staff') then
    raise exception '30_reversals: a cashier voided a delivery';
  end if;
  if exists (
    select 1 from public.waste w
      join public.workspace_member wm
        on wm.user_id = w.created_by and wm.workspace_id = w.workspace_id
     where w.reversal_of is not null and wm.role = 'staff') then
    raise exception '30_reversals: a cashier voided a write-off';
  end if;
  if exists (
    select 1 from public._r_void v
      join public.sale o on o.id = v.original_id
      join public.sale r on r.id = v.reversal_id
     where v.kind = 'sale' and r.created_by <> o.created_by) then
    raise exception '30_reversals: a ticket was voided by someone other than the cashier who rang it up';
  end if;
  -- And inside the window the setting actually gives them.
  if exists (
    select 1 from public._r_void v
      join public.sale o on o.id = v.original_id
      join public.sale r on r.id = v.reversal_id
      join public.workspace_setting ws on ws.workspace_id = o.workspace_id
     where v.kind = 'sale'
       and r.occurred_at > o.occurred_at + (ws.void_window_minutes || ' minutes')::interval) then
    raise exception '30_reversals: a cashier voided their own ticket after the window closed';
  end if;

  raise notice '30_reversals: % deliveries, % tickets and % write-off(s) voided; % compensating movements; % price pairs fell back and % disappeared',
    (select count(*) from public._r_void where kind = 'purchase'),
    (select count(*) from public._r_void where kind = 'sale'),
    (select count(*) from public._r_void where kind = 'waste'),
    (select count(*) from public.stock_movement where reversal_of_movement_id is not null),
    v_fell, v_gone;
  raise notice '30_reversals: % (provider, variant) pair(s) are decided by the uuid tiebreak in 0008 and vary between resets',
    v_tied;
end;
$$;


-- ----------------------------------------------------------------------------
-- 7. Scaffolding out
-- ----------------------------------------------------------------------------
-- Nothing named `_r_*` survives a reset.
drop table public._r_void;
drop table public._r_target;
drop table public._r_pre_min;
drop table public._r_pre_memory;
