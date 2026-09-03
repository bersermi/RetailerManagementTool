-- ============================================================================
-- Behavioural verification for 0005 — allocation
-- ============================================================================
-- ADR-035 §9: a file is not evidence, a green CI run is. `supabase db reset`
-- proves only that the two functions compile. Everything they are FOR — that the
-- FEFO order is the one §2.4 specifies, that the candidate set never leaves the
-- location, that a shortfall is recorded rather than raised, and that a transfer
-- carries cost and expiry forward without ever moving a batch — is invisible to
-- it. This file is that evidence, and it runs in .github/workflows/db.yml
-- immediately after the reset.
--
-- THE CONCURRENCY CLAIM IS NOT IN THIS FILE. "Two concurrent allocations cannot
-- oversell one batch" cannot be shown from one session, because one session
-- cannot block on its own lock. It is proven in
-- supabase/vitest/test/allocation-race.test.ts, which drives two real
-- connections; this file asserts everything that a single session can honestly
-- assert. ⚠️ That claim lived in 0005_allocation_concurrency.sh beside this file
-- until plan task 3.7b moved it — same fixture, same discriminator, one more
-- assertion, and no psql required. The reasoning is under 3.7b in docs/PLAN.md.
--
-- Provisional by design. ADR-035 §3 step 3 replaces it with pgTAP suites.
--
-- Run it against a DATABASE THAT WAS JUST RESET — it writes fixture rows and does
-- not clean up, and the immutability guard means it cannot.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0005_allocation.sql
--
-- The access section runs under `set local role authenticated`. Do not "simplify"
-- it away: the checks there are about a grant that does not exist, and running
-- them as the owning role would pass vacuously.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

create function public.chk_raises(p_label text, p_sql text, p_expect text default null)
returns void language plpgsql as $$
declare v_state text;
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_state := sqlstate;
  perform public.chk(p_label,
                     p_expect is null or v_state = p_expect,
                     'sqlstate ' || v_state || coalesce(' (wanted ' || p_expect || ')', ''));
end;
$$;
grant execute on function public.chk_raises(text, text, text) to authenticated;


-- ---------------------------------------------------------------- fixture ----
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'staff.a1@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'manager.a@example.mx'),
  ('44444444-4444-4444-4444-444444444444', 'owner.b@example.mx');

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select onboard_workspace('Tienda A') as ws_a \gset

select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', false);
select onboard_workspace('Tienda B') as ws_b \gset

select set_config('request.jwt.claims', null, false);

insert into location (workspace_id, name) values (:'ws_a', 'Sucursal Norte');

select id as loc_a1 from location where workspace_id = :'ws_a' and name = 'Tienda A' \gset
select id as loc_a2 from location where workspace_id = :'ws_a' and name = 'Sucursal Norte' \gset
select id as loc_b1 from location where workspace_id = :'ws_b' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', '22222222-2222-2222-2222-222222222222', 'staff'),
  (:'ws_a', '33333333-3333-3333-3333-333333333333', 'manager');

insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a1' from workspace_member wm
 where wm.user_id = '22222222-2222-2222-2222-222222222222';

\set owner_a '''11111111-1111-1111-1111-111111111111'''
\set owner_b '''44444444-4444-4444-4444-444444444444'''

-- Five variants in A, each isolating one thing the allocator has to get right, so
-- no check has to reason about another check's ladder.
insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam_a from product_family where workspace_id = :'ws_a' \gset

insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code, tax_rate)
values (:'ws_a', :'fam_a', 'Jitomate a granel',  'g', 'kg', 'g', 'g', 0.16),  -- the FEFO ladder
       (:'ws_a', :'fam_a', 'Cebolla a granel',   'g', 'kg', 'g', 'g', 0.16),  -- batch_id tiebreak
       (:'ws_a', :'fam_a', 'Papa a granel',      'g', 'kg', 'g', 'g', 0.16),  -- received_at tiebreak
       (:'ws_a', :'fam_a', 'Limon a granel',     'g', 'kg', 'g', 'g', 0.16),  -- every lot closed
       (:'ws_a', :'fam_a', 'Chile a granel',     'g', 'kg', 'g', 'g', 0.16),  -- never stocked
       (:'ws_a', :'fam_a', 'Manzana a granel',   'g', 'kg', 'g', 'g', 0.16);  -- the transfer

select id as var_a    from product_variant where workspace_id = :'ws_a' and name = 'Jitomate a granel' \gset
select id as var_tie  from product_variant where workspace_id = :'ws_a' and name = 'Cebolla a granel'  \gset
select id as var_rcv  from product_variant where workspace_id = :'ws_a' and name = 'Papa a granel'     \gset
select id as var_dry  from product_variant where workspace_id = :'ws_a' and name = 'Limon a granel'    \gset
select id as var_new  from product_variant where workspace_id = :'ws_a' and name = 'Chile a granel'    \gset
select id as var_xfer from product_variant where workspace_id = :'ws_a' and name = 'Manzana a granel'  \gset

-- One in B, so the cross-tenant checks point at something real.
insert into product_family (workspace_id, name) values (:'ws_b', 'Abarrotes');
select id as fam_b from product_family where workspace_id = :'ws_b' \gset
insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code)
values (:'ws_b', :'fam_b', 'Cebolla blanca', 'g', 'kg', 'g', 'g');
select id as var_b from product_variant where workspace_id = :'ws_b' \gset


-- =============================================================== batches =====
-- Fixed ids, because two of the checks below are ABOUT the id order and a random
-- uuid would make them assert nothing.
\set b_zero  '''dddd0005-0000-0000-0000-000000000001'''
\set b_soon  '''dddd0005-0000-0000-0000-000000000002'''
\set b_late  '''dddd0005-0000-0000-0000-000000000003'''
\set b_null  '''dddd0005-0000-0000-0000-000000000004'''
\set b_other '''dddd0005-0000-0000-0000-000000000005'''
\set b_tie1  '''dddd0005-0000-0000-0000-00000000000a'''
\set b_tie2  '''dddd0005-0000-0000-0000-00000000000b'''
\set b_rcv_o '''dddd0005-0000-0000-0000-000000000011'''
\set b_rcv_n '''dddd0005-0000-0000-0000-000000000012'''
\set b_dry_o '''dddd0005-0000-0000-0000-000000000021'''
\set b_dry_n '''dddd0005-0000-0000-0000-000000000022'''
\set b_x1    '''dddd0005-0000-0000-0000-000000000031'''
\set b_x2    '''dddd0005-0000-0000-0000-000000000032'''

-- Every lot here is an `adjustment` lot: this file is about allocation, and
-- routing the openings through purchase documents would add a hundred lines of
-- fixture that no check reads. 0004 already proves the purchase provenance rules.
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       qty_received_base, unit_cost_net_per_base, expiry_date, received_at, created_by)
values
  -- The FEFO ladder at store 1. b_zero expires FIRST and is empty: it is the
  -- check that the candidate set is `remaining_base > 0` and not "every lot".
  (:b_zero,  :'ws_a', :'loc_a1', :'var_a',    'adjustment',  50, 0.050000, current_date,     now() - interval '5 days', :owner_a),
  (:b_soon,  :'ws_a', :'loc_a1', :'var_a',    'adjustment', 100, 0.020000, current_date + 1, now() - interval '4 days', :owner_a),
  (:b_late,  :'ws_a', :'loc_a1', :'var_a',    'adjustment', 100, 0.010000, current_date + 3, now() - interval '3 days', :owner_a),
  -- Null expiry. Sorted LAST, and the cheapest lot on the shelf, so a wrong
  -- `nulls first` would be visible in the cost of the allocation as well as its
  -- order.
  (:b_null,  :'ws_a', :'loc_a1', :'var_a',    'adjustment', 100, 0.030000, null,             now() - interval '2 days', :owner_a),

  -- The same variant at the OTHER store, expiring sooner and larger than
  -- anything at store 1. If the candidate set ever went workspace-wide this lot
  -- would win every allocation.
  (:b_other, :'ws_a', :'loc_a2', :'var_a',    'adjustment', 500, 0.099000, current_date,     now() - interval '9 days', :owner_a),

  -- Identical expiry AND identical received_at: only batch_id can separate them.
  (:b_tie1,  :'ws_a', :'loc_a1', :'var_tie',  'adjustment', 100, 0.041000, current_date + 2, timestamptz '2026-01-01 12:00:00+00', :owner_a),
  (:b_tie2,  :'ws_a', :'loc_a1', :'var_tie',  'adjustment', 100, 0.042000, current_date + 2, timestamptz '2026-01-01 12:00:00+00', :owner_a),

  -- Identical expiry, different receipt. received_at is the tiebreak §2.4 names.
  (:b_rcv_n, :'ws_a', :'loc_a1', :'var_rcv',  'adjustment', 100, 0.051000, current_date + 2, now() - interval '1 day',  :owner_a),
  (:b_rcv_o, :'ws_a', :'loc_a1', :'var_rcv',  'adjustment', 100, 0.052000, current_date + 2, now() - interval '8 days', :owner_a),

  -- Two lots that will be drained to zero, so the shortfall has no open lot to
  -- land on and has to fall back to the most recent one.
  (:b_dry_o, :'ws_a', :'loc_a1', :'var_dry',  'adjustment', 100, 0.070000, current_date + 9, now() - interval '7 days', :owner_a),
  (:b_dry_n, :'ws_a', :'loc_a1', :'var_dry',  'adjustment', 100, 0.080000, current_date + 8, now() - interval '6 days', :owner_a),

  -- The transfer ladder. Received a day ago, so "the destination lot's
  -- received_at is its own" is an assertion and not a coincidence of now().
  (:b_x1,    :'ws_a', :'loc_a1', :'var_xfer', 'adjustment',  60, 0.011000, current_date + 1, now() - interval '1 day', :owner_a),
  (:b_x2,    :'ws_a', :'loc_a1', :'var_xfer', 'adjustment', 100, 0.022000, current_date + 5, now() - interval '1 day', :owner_a);

-- Open every balance. A batch is opened at zero by the 0004 trigger; the receipt
-- itself is a movement.
insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
select sb.workspace_id, sb.location_id, sb.id, sb.variant_id,
       'adjustment', sb.qty_received_base, sb.unit_cost_net_per_base, now(), :owner_a
  from stock_batch sb;

-- Then close two things deliberately. b_zero is the lot that expires FIRST and
-- has nothing left: it is what makes "the candidate set is `remaining_base > 0`"
-- an assertion rather than a coincidence, and if the partial index were dropped
-- it would lead every var_a allocation below. The two var_dry lots are drained so
-- that variant has stock in its history and nothing on the shelf, which is the
-- only way to reach the second shortfall branch.
insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
select sb.workspace_id, sb.location_id, sb.id, sb.variant_id,
       'adjustment', -sb.qty_received_base, sb.unit_cost_net_per_base, now(), :owner_a
  from stock_batch sb
 where sb.variant_id = :'var_dry' or sb.id = :b_zero;

select chk('fixture: the ladder is open and b_zero is closed',
           (select remaining_base from batch_balance where batch_id = :b_zero) = 0
       and (select remaining_base from batch_balance where batch_id = :b_soon) = 100
       and (select sum(remaining_base) from batch_balance
             where variant_id = :'var_dry') = 0);


-- ======================================================== the FEFO order =====
-- "The RPC allocates against FEFO (first-expiring-first-out)... receipt order is
-- only a tiebreak." (§2.4)

create table public._a1 as
  select * from allocate_fefo(:'ws_a', :'loc_a1', :'var_a', 150, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('FEFO: earliest expiry first, and the next lot takes the remainder',
           (select count(*) from public._a1) = 2
       and (select batch_id from public._a1 where ord = 1) = :b_soon
       and (select qty_base from public._a1 where ord = 1) = 100
       and (select batch_id from public._a1 where ord = 2) = :b_late
       and (select qty_base from public._a1 where ord = 2) = 50);

select chk('FEFO: a closed lot is skipped even though it expires first',
           not exists (select 1 from public._a1 where batch_id = :b_zero));

select chk('FEFO: the cost of the lot rides along, so the caller never joins stock_batch',
           (select unit_cost_net_per_base from public._a1 where ord = 1) = 0.020000
       and (select unit_cost_net_per_base from public._a1 where ord = 2) = 0.010000);

select chk('FEFO: the amounts sum to exactly what was asked for',
           (select sum(qty_base) from public._a1) = 150);

create table public._a2 as
  select * from allocate_fefo(:'ws_a', :'loc_a1', :'var_a', 250, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('FEFO: a null expiry sorts LAST — it means "does not track expiry", not "never expires"',
           (select batch_id from public._a2 where ord = 3) = :b_null
       and (select qty_base from public._a2 where ord = 3) = 50);

-- received_at as the tiebreak.
create table public._a3 as
  select * from allocate_fefo(:'ws_a', :'loc_a1', :'var_rcv', 10, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('FEFO: on equal expiry the older receipt goes first',
           (select batch_id from public._a3 where ord = 1) = :b_rcv_o);

-- batch_id as the final tiebreak: identical expiry, identical received_at.
create table public._a4 as
  select * from allocate_fefo(:'ws_a', :'loc_a1', :'var_tie', 150, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);
create table public._a5 as
  select * from allocate_fefo(:'ws_a', :'loc_a1', :'var_tie', 150, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('FEFO: expiry and receipt tied — batch_id breaks it, ascending',
           (select batch_id from public._a4 where ord = 1) = :b_tie1
       and (select batch_id from public._a4 where ord = 2) = :b_tie2);

select chk('FEFO: the same request allocates identically twice — the seed and record_sale cannot diverge',
           not exists (
             select 1 from public._a4 x full join public._a5 y using (ord)
              where x.batch_id is distinct from y.batch_id
                 or x.qty_base is distinct from y.qty_base));


-- ==================================================== the location scope =====
-- "The candidate set is `where location_id = $location and remaining_base > 0`,
-- never workspace-wide." (§2.4) b_other is at store 2, expires sooner than
-- anything at store 1, and holds 500. It must never appear.

select chk('scope: store 1 never allocates store 2''s lot, however well it sorts',
           not exists (select 1 from public._a1 where batch_id = :b_other)
       and not exists (select 1 from public._a2 where batch_id = :b_other));

create table public._a6 as
  select * from allocate_fefo(:'ws_a', :'loc_a2', :'var_a', 20, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('scope: store 2 allocates its own lot and only its own',
           (select count(*) from public._a6) = 1
       and (select batch_id from public._a6 where ord = 1) = :b_other);

-- The workspace argument is load-bearing too: a location that is not in the named
-- workspace has no lots, falls through to the shortfall branch, and is refused by
-- the composite FK rather than quietly opening a lot in the wrong tenant.
select chk_raises('scope: a location outside the named workspace is refused by the schema',
  format($q$select * from allocate_fefo(%L, %L, %L, 10, %L, now())$q$,
         :'ws_b', :'loc_a1', :'var_b', :owner_b), '23503');

select chk_raises('scope: a variant from another tenant is refused by the schema',
  format($q$select * from allocate_fefo(%L, %L, %L, 10, %L, now())$q$,
         :'ws_a', :'loc_a1', :'var_b', :owner_a), '23503');


-- ========================================================= the shortfall =====
-- "v1 records stock and does not enforce it" (§2.6). A raise here is a raise at
-- the counter, in front of a customer.

-- (1) 300 open, 400 asked: the lot FEFO ran out on absorbs the difference.
create table public._s1 as
  select * from allocate_fefo(:'ws_a', :'loc_a1', :'var_a', 400, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('shortfall: not enough stock allocates anyway — it does not raise',
           (select count(*) from public._s1) = 3);
select chk('shortfall: the last lot FEFO reached absorbs it, at its own cost',
           (select batch_id from public._s1 where ord = 3) = :b_null
       and (select qty_base from public._s1 where ord = 3) = 200
       and (select unit_cost_net_per_base from public._s1 where ord = 3) = 0.030000);
select chk('shortfall: the amounts still sum to exactly what was asked for',
           (select sum(qty_base) from public._s1) = 400);

-- (2) nothing open at all: the most recently received lot is blamed, at the cost
-- the shop actually paid for it.
create table public._s2 as
  select * from allocate_fefo(:'ws_a', :'loc_a1', :'var_dry', 30, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('shortfall: with every lot closed, the most recent one is blamed',
           (select count(*) from public._s2) = 1
       and (select batch_id from public._s2 where ord = 1) = :b_dry_n
       and (select qty_base from public._s2 where ord = 1) = 30);
select chk('shortfall: and it carries a real cost, not an invented one',
           (select unit_cost_net_per_base from public._s2 where ord = 1) = 0.080000);

-- (3) never stocked here: a new lot, at zero cost, with no expiry.
--
-- ALLOCATED WITH A BACKDATED MOMENT, deliberately. `now()` here would make the
-- last check in this block pass against the column default and prove nothing —
-- which is exactly the state 0005 shipped in and 0010 corrects.
\set adj_at '''2026-02-01 08:30:00+00'''

select count(*) as batches_before from stock_batch \gset

create table public._s3 as
  select * from allocate_fefo(:'ws_a', :'loc_a1', :'var_new', 7, :owner_a, :adj_at)
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('shortfall: a product never stocked here opens exactly one lot to hold the debt',
           (select count(*) from public._s3) = 1
       and (select count(*) from stock_batch) = :batches_before + 1);
select chk('shortfall: that lot is an adjustment lot at ZERO cost — no invented number',
           (select sb.origin from stock_batch sb
             join public._s3 s on s.batch_id = sb.id) = 'adjustment'
       and (select unit_cost_net_per_base from public._s3) = 0
       and (select sb.unit_cost_net_per_base from stock_batch sb
             join public._s3 s on s.batch_id = sb.id) = 0);
select chk('shortfall: and it has no expiry — a fictional date would head the FEFO order',
           (select sb.expiry_date from stock_batch sb
             join public._s3 s on s.batch_id = sb.id) is null);
select chk('shortfall: it opens at zero, so the debt only appears once the caller writes the movement',
           (select bb.remaining_base from batch_balance bb
             join public._s3 s on s.batch_id = bb.batch_id) = 0);

-- 0010. The lot is received WHEN THE WITHDRAWAL HAPPENED, not when the row was
-- written. `received_at` defaults to now(), which is right at a till and wrong on
-- every write whose event time is not the write time — and `recorded_offline`
-- accepts a client clock up to 72 hours old (§2.6). received_at is the second FEFO
-- key, so the old behaviour reordered lots received within days of each other.
select chk('shortfall: the lot is received AT THE MOMENT GIVEN, not at now() (0010)',
           (select sb.received_at from stock_batch sb
             join public._s3 s on s.batch_id = sb.id) = timestamptz :adj_at,
           (select sb.received_at::text from stock_batch sb
             join public._s3 s on s.batch_id = sb.id));

-- The shortfall written through, so the invariant is exercised against a negative
-- balance produced by the allocator rather than by hand.
insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
select :'ws_a', :'loc_a1', s.batch_id, :'var_a', 'adjustment', -s.qty_base,
       s.unit_cost_net_per_base, now(), :owner_a
  from public._s1 s;

select chk('shortfall: writing it drives the lot negative, which v1 permits',
           (select remaining_base from batch_balance where batch_id = :b_null) = -100);


-- ============================================================== the guards ===
select chk_raises('guard: a zero-quantity withdrawal is a caller bug, not a no-op',
  format($q$select * from allocate_fefo(%L, %L, %L, 0, %L, now())$q$,
         :'ws_a', :'loc_a1', :'var_a', :owner_a), '22023');
select chk_raises('guard: a negative quantity is refused — the caller writes the sign',
  format($q$select * from allocate_fefo(%L, %L, %L, -5, %L, now())$q$,
         :'ws_a', :'loc_a1', :'var_a', :owner_a), '22023');
select chk_raises('guard: a null quantity is refused',
  format($q$select * from allocate_fefo(%L, %L, %L, null, %L, now())$q$,
         :'ws_a', :'loc_a1', :'var_a', :owner_a), '22023');
select chk_raises('guard: a null location is refused',
  format($q$select * from allocate_fefo(%L, null, %L, 5, %L, now())$q$,
         :'ws_a', :'var_a', :owner_a), '22023');
select chk_raises('guard: a null author is refused — every row carries created_by',
  format($q$select * from allocate_fefo(%L, %L, %L, 5, null, now())$q$,
         :'ws_a', :'loc_a1', :'var_a'), '22023');
-- 0010 made the moment REQUIRED rather than defaulted, so that a caller holding a
-- real occurred_at cannot silently fall back to now(). This is that requirement.
select chk_raises('guard: a null moment is refused — a lot must know when it arrived',
  format($q$select * from allocate_fefo(%L, %L, %L, 5, %L, null)$q$,
         :'ws_a', :'loc_a1', :'var_a', :owner_a), '22023');


-- ========================================================== the transfer =====
-- "Moving stock writes negative FEFO-allocated movements at the origin and
-- creates NEW BATCHES at the destination carrying unit_cost_net_per_base and
-- expiry_date forward... stock_batch.location_id is NEVER UPDATED." (§2.4)

\set xfer_1 '''eeee0005-0000-0000-0000-000000000001'''
-- Backdated, for the reason branch three above is: with now() the received_at
-- check below would pass against the column default.
\set xfer_at '''2026-02-14 09:15:00+00'''

create table public._t1 as
  select * from allocate_transfer(:'ws_a', :'loc_a1', :'loc_a2', :'var_xfer',
                                  100, :xfer_1, :xfer_at, :owner_a)
    with ordinality as t(source_batch_id, destination_batch_id, qty_base,
                         unit_cost_net_per_base, expiry_date, ord);

select chk('transfer: FEFO at the origin — 60 from the lot expiring first, then 40',
           (select count(*) from public._t1) = 2
       and (select source_batch_id from public._t1 where ord = 1) = :b_x1
       and (select qty_base        from public._t1 where ord = 1) = 60
       and (select source_batch_id from public._t1 where ord = 2) = :b_x2
       and (select qty_base        from public._t1 where ord = 2) = 40);

select chk('transfer: ONE destination lot per origin lot — three costs cannot be merged into one',
           (select count(distinct destination_batch_id) from public._t1) = 2
       and (select count(*) from stock_batch
             where location_id = :'loc_a2' and variant_id = :'var_xfer'
               and origin = 'transfer') = 2);

select chk('transfer: the destination lot carries cost forward, so store B''s margin stays honest',
           (select d.unit_cost_net_per_base from stock_batch d
             join public._t1 t on t.destination_batch_id = d.id where t.ord = 1) = 0.011000
       and (select d.unit_cost_net_per_base from stock_batch d
             join public._t1 t on t.destination_batch_id = d.id where t.ord = 2) = 0.022000);

-- 0010. The function took the moment, used it for all four movements, and did not
-- give it to the lot it opened — so a transfer recorded three days late opened a
-- destination lot that sorted as received today. received_at is still the
-- DESTINATION's own and the origin's is still not carried forward (§2.4); what
-- changed is that "the destination's own" is when the transfer happened.
select chk('transfer: the destination lot is received when the TRANSFER happened, not at now() (0010)',
           not exists (
             select 1 from public._t1 t join stock_batch d on d.id = t.destination_batch_id
              where d.received_at <> timestamptz :xfer_at),
           (select string_agg(d.received_at::text, ', ') from public._t1 t
             join stock_batch d on d.id = t.destination_batch_id));

-- The other half of §2.4's reading, and the half that has NOT changed: the
-- origin's receipt date is not carried forward. Only expiry and cost are. The
-- fixture receives the origin lots a day ago and transfers them in February, so
-- the two dates are genuinely different numbers and this can fail.
select chk('transfer: and it is not the ORIGIN''s received_at — only cost and expiry carry forward',
           not exists (
             select 1 from public._t1 t
               join stock_batch d on d.id = t.destination_batch_id
               join stock_batch o on o.id = t.source_batch_id
              where d.received_at = o.received_at));

select chk('transfer: and expiry forward, so store B''s FEFO ordering stays meaningful',
           not exists (
             select 1 from public._t1 t
               join stock_batch d on d.id = t.destination_batch_id
               join stock_batch o on o.id = t.source_batch_id
              where d.expiry_date is distinct from o.expiry_date));

-- The check that used to live here read `d.received_at > o.received_at` — "store
-- B received it today". It was true of a fixture written today and transferred
-- today, and it is what let 0005's defect through: "today" was the day of the
-- WRITE, not the day of the transfer. It is replaced by the pair of checks in the
-- transfer section above, which name the moment instead of comparing it to the
-- origin's, and which the fixture backdates so that they can fail.

select chk('transfer: provider_id is null — nothing was bought, it walked in from the other store',
           not exists (
             select 1 from public._t1 t join stock_batch d on d.id = t.destination_batch_id
              where d.provider_id is not null));

select chk('transfer: source_batch_id names the lot it was cut from',
           not exists (
             select 1 from public._t1 t join stock_batch d on d.id = t.destination_batch_id
              where d.source_batch_id is distinct from t.source_batch_id));

select chk('transfer: THE ORIGIN BATCH DOES NOT MOVE — location_id is history, not state',
           (select location_id from stock_batch where id = :b_x1) = :'loc_a1'
       and (select location_id from stock_batch where id = :b_x2) = :'loc_a1');

select chk('transfer: four movements, one pair per lot, negative at the origin and positive at the destination',
           (select count(*) from stock_movement where transfer_group_id = :xfer_1) = 4
       and (select count(*) from stock_movement
             where transfer_group_id = :xfer_1 and reason = 'transfer_out'
               and location_id = :'loc_a1' and qty_base < 0) = 2
       and (select count(*) from stock_movement
             where transfer_group_id = :xfer_1 and reason = 'transfer_in'
               and location_id = :'loc_a2' and qty_base > 0) = 2);

select chk('transfer: the group nets to zero across the tenant — stock moved, it was not created',
           (select sum(qty_base) from stock_movement where transfer_group_id = :xfer_1) = 0);

select chk('transfer: the movements carry the lot''s cost, not the destination''s guess',
           (select count(*) from stock_movement sm
             join public._t1 t on t.source_batch_id = sm.batch_id
            where sm.transfer_group_id = :xfer_1
              and sm.unit_cost_net_per_base = t.unit_cost_net_per_base) = 2);

select chk('transfer: the balances moved by exactly the allocation',
           (select remaining_base from batch_balance where batch_id = :b_x1) = 0
       and (select remaining_base from batch_balance where batch_id = :b_x2) = 60
       and (select sum(remaining_base) from batch_balance
             where location_id = :'loc_a2' and variant_id = :'var_xfer') = 100);

-- The point of carrying expiry forward, made as an assertion: the destination now
-- rotates on the ORIGIN's dates.
create table public._t2 as
  select * from allocate_fefo(:'ws_a', :'loc_a2', :'var_xfer', 70, :owner_a, now())
    with ordinality as a(batch_id, qty_base, unit_cost_net_per_base, expiry_date, ord);

select chk('transfer: the destination rotates on the carried expiry, not on arrival order',
           (select count(*) from public._t2) = 2
       and (select a.expiry_date from public._t2 a where a.ord = 1) = current_date + 1
       and (select a.qty_base    from public._t2 a where a.ord = 1) = 60
       and (select a.expiry_date from public._t2 a where a.ord = 2) = current_date + 5);

-- Transfer guards.
select chk_raises('transfer: origin and destination the same location is refused',
  format($q$select * from allocate_transfer(%L, %L, %L, %L, 10, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :'loc_a1', :'var_xfer', gen_random_uuid(), :owner_a), '22023');

select chk_raises('transfer: a destination in another tenant is refused before anything is written',
  format($q$select * from allocate_transfer(%L, %L, %L, %L, 10, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :'loc_b1', :'var_xfer', gen_random_uuid(), :owner_a), '42501');

select chk_raises('transfer: a null transfer_group_id is refused — the pair would be unfindable',
  format($q$select * from allocate_transfer(%L, %L, %L, %L, 10, null, now(), %L)$q$,
         :'ws_a', :'loc_a1', :'loc_a2', :'var_xfer', :owner_a), '22023');

-- A transfer out of a store that has none of the variant is an oversale at the
-- origin, and is recorded as one rather than raised.
\set xfer_2 '''eeee0005-0000-0000-0000-000000000002'''
create table public._t3 as
  select * from allocate_transfer(:'ws_a', :'loc_a2', :'loc_a1', :'var_new',
                                  5, :xfer_2, now(), :owner_a)
    with ordinality as t(source_batch_id, destination_batch_id, qty_base,
                         unit_cost_net_per_base, expiry_date, ord);

select chk('transfer: moving stock the origin does not have records an oversale, it does not raise',
           (select count(*) from public._t3) = 1
       and (select remaining_base from batch_balance
             where batch_id = (select source_batch_id from public._t3)) = -5
       and (select remaining_base from batch_balance
             where batch_id = (select destination_batch_id from public._t3)) = 5);


-- ============================================ the invariant, and the rebuild ==
-- Everything above wrote through the allocator. ADR-035 §2.4 must still hold.

select chk('invariant: holds across every allocation, transfer and oversale above',
           (select count(*) from batch_balance_violations()) = 0);

create table public._bb_before as
  select batch_id, workspace_id, location_id, variant_id, remaining_base,
         expiry_date, received_at
    from batch_balance;

select rebuild_batch_balance() as rebuilt \gset

select chk('invariant: the projection is still disposable — rebuilt from the movements alone',
           :rebuilt = (select count(*) from stock_batch)
       and not exists (
             select 1 from public._bb_before b
             full join batch_balance a using (batch_id)
              where a.remaining_base is distinct from b.remaining_base
                 or a.location_id    is distinct from b.location_id
                 or a.expiry_date    is distinct from b.expiry_date));


-- ================================================================ access =====
-- "NO ROLE HOLDS EXECUTE ON EITHER FUNCTION." These two functions are ledger
-- primitives; the location check that makes them safe lives in the 0006 RPCs that
-- call them. An authenticated session that could reach them directly could
-- allocate stock at a store it has no access to.

select chk('access: authenticated holds no execute on allocate_fefo',
           not has_function_privilege('authenticated',
             'public.allocate_fefo(uuid,uuid,uuid,numeric,uuid,timestamptz)', 'execute'));
select chk('access: authenticated holds no execute on allocate_transfer',
           not has_function_privilege('authenticated',
             'public.allocate_transfer(uuid,uuid,uuid,uuid,numeric,uuid,timestamptz,uuid)', 'execute'));
select chk('access: anon holds no execute on either',
           not has_function_privilege('anon',
             'public.allocate_fefo(uuid,uuid,uuid,numeric,uuid,timestamptz)', 'execute')
       and not has_function_privilege('anon',
             'public.allocate_transfer(uuid,uuid,uuid,uuid,numeric,uuid,timestamptz,uuid)', 'execute'));

-- And the grant is what actually stops the call, checked as the role rather than
-- read off the catalog.
begin;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('access: a MANAGER cannot call the allocator directly',
  format($q$select * from public.allocate_fefo(%L, %L, %L, 5, %L, now())$q$,
         :'ws_a', :'loc_a1', :'var_a', :owner_a), '42501');
select chk_raises('access: a manager cannot call the transfer write directly',
  format($q$select * from public.allocate_transfer(%L, %L, %L, %L, 5, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :'loc_a2', :'var_xfer', gen_random_uuid(), :owner_a), '42501');
commit;


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
