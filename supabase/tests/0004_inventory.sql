-- ============================================================================
-- Behavioural verification for 0004 — inventory
-- ============================================================================
-- ADR-035 §9: a file is not evidence, a green CI run is. `supabase db reset`
-- proves only that the DDL parses; everything this migration is actually FOR —
-- the §2.4 invariant, the projection surviving a reversal, the projection being
-- genuinely disposable, and the fact that a cashier can read what is on the shelf
-- but not what it cost — is invisible to it. This file is that evidence, and it
-- runs in .github/workflows/db.yml immediately after the reset.
--
-- Provisional by design. ADR-035 §3 step 3 replaces it with pgTAP suites.
--
-- Run it against a DATABASE THAT WAS JUST RESET — it writes fixture rows and does
-- not clean up, and the immutability guard means it cannot.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0004_inventory.sql
--
-- The RLS section runs under `set local role authenticated`. Do not "simplify" it
-- away: the postgres superuser bypasses RLS, so every isolation check in this
-- file passes vacuously when run as postgres.
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
  ('44444444-4444-4444-4444-444444444444', 'owner.b@example.mx'),
  ('55555555-5555-5555-5555-555555555555', 'staff.a2@example.mx');

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
  (:'ws_a', '33333333-3333-3333-3333-333333333333', 'manager'),
  (:'ws_a', '55555555-5555-5555-5555-555555555555', 'staff');

insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a1' from workspace_member wm
 where wm.user_id = '22222222-2222-2222-2222-222222222222';
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a2' from workspace_member wm
 where wm.user_id = '55555555-5555-5555-5555-555555555555';

-- Catalog in A, and one in B so the cross-tenant checks have something real to
-- point at rather than a uuid that simply does not exist.
insert into product_family (workspace_id, name) values (:'ws_a', 'Jitomate');
select id as fam_a from product_family where workspace_id = :'ws_a' \gset
insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code, tax_rate)
values (:'ws_a', :'fam_a', 'Jitomate a granel', 'g', 'kg', 'g', 'g', 0.16);
select id as var_a from product_variant where workspace_id = :'ws_a' \gset

insert into product_family (workspace_id, name) values (:'ws_b', 'Cebolla');
select id as fam_b from product_family where workspace_id = :'ws_b' \gset
insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code)
values (:'ws_b', :'fam_b', 'Cebolla blanca', 'g', 'kg', 'g', 'g');
select id as var_b from product_variant where workspace_id = :'ws_b' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

\set owner_a '''11111111-1111-1111-1111-111111111111'''

-- Documents. Fixed ids so the movements below can name them.
\set pur_1     '''cccc0004-0000-0000-0000-000000000001'''
\set pline_1   '''cccc0004-0000-0000-0000-000000000002'''
\set sale_1    '''cccc0004-0000-0000-0000-000000000003'''
\set sale_2    '''cccc0004-0000-0000-0000-000000000004'''
\set was_1     '''cccc0004-0000-0000-0000-000000000005'''
\set pur_a2    '''cccc0004-0000-0000-0000-000000000006'''
\set pline_a2  '''cccc0004-0000-0000-0000-000000000007'''

insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash)
values (:pur_1, :'ws_a', :'loc_a1', :'prov_a', now(), 12.00, 1.92,
        :owner_a, 'hash-pur-1');

insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id,
       qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
       line_net, tax_amount, tax_rate, expiry_date)
values (:pline_1, :'ws_a', :'loc_a1', :pur_1, :'var_a',
        1000, 1, 'kg', 0.012000, 12.00, 1.92, 0.16, current_date + 7);

-- A second delivery, at the OTHER store. It exists so the cross-location FK check
-- below has a real purchase line at the wrong location to point at.
insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash)
values (:pur_a2, :'ws_a', :'loc_a2', :'prov_a', now(), 6.00, 0.96,
        :owner_a, 'hash-pur-a2');

insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id,
       qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
       line_net, tax_amount, tax_rate)
values (:pline_a2, :'ws_a', :'loc_a2', :pur_a2, :'var_a',
        500, 0.5, 'kg', 0.012000, 6.00, 0.96, 0.16);

insert into sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                  created_by, payload_hash)
values (:sale_1, :'ws_a', :'loc_a1', now(), 10.00, 1.60, :owner_a, 'hash-sale-1');

-- The compensating document for sale_1. A reversal MOVEMENT belongs to a reversal
-- DOCUMENT — that pairing is the whole void path, and testing the movement half
-- against the original document would test a shape the RPCs never write.
insert into sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                  created_by, payload_hash, reversal_of, reversal_reason)
values (:sale_2, :'ws_a', :'loc_a1', now(), -10.00, -1.60, :owner_a, 'hash-sale-2',
        :sale_1, 'cobro duplicado');

insert into waste (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                   created_by, payload_hash)
values (:was_1, :'ws_a', :'loc_a1', now(), 1.20, 0.19, :owner_a, 'hash-was-1');


-- =============================================================== batches =====
\set batch_1    '''dddd0004-0000-0000-0000-000000000001'''
\set batch_adj  '''dddd0004-0000-0000-0000-000000000002'''
\set batch_a2   '''dddd0004-0000-0000-0000-000000000003'''
\set batch_xfer '''dddd0004-0000-0000-0000-000000000004'''

-- The delivered lot at store 1.
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, expiry_date, created_by)
values (:batch_1, :'ws_a', :'loc_a1', :'var_a', 'purchase',
        :'prov_a', :pline_1, 1000, 0.012000, current_date + 7, :owner_a);

-- An opening balance: counted onto the shelf, from no delivery and no provider.
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       qty_received_base, unit_cost_net_per_base, created_by)
values (:batch_adj, :'ws_a', :'loc_a1', :'var_a', 'adjustment',
        10, 0.010000, :owner_a);

-- A lot at store 2, so the location-level RLS checks are not vacuous.
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       qty_received_base, unit_cost_net_per_base, created_by)
values (:batch_a2, :'ws_a', :'loc_a2', :'var_a', 'adjustment',
        500, 0.011000, :owner_a);

select chk('projection: a new batch opens a balance row at zero',
           (select remaining_base from batch_balance where batch_id = :batch_a2) = 0);
select chk('projection: the opened row copies expiry and received_at from the batch',
           (select bb.expiry_date is not distinct from sb.expiry_date
               and bb.received_at = sb.received_at
              from batch_balance bb join stock_batch sb on sb.id = bb.batch_id
             where bb.batch_id = :batch_1));


-- --- stock_batch constraints -------------------------------------------------
select chk_raises('batch: origin=purchase without a purchase line is refused',
  format($q$insert into stock_batch (workspace_id, location_id, variant_id, origin,
             qty_received_base, unit_cost_net_per_base, created_by)
           values (%L, %L, %L, 'purchase', 5, 0.01, %L)$q$,
         :'ws_a', :'loc_a1', :'var_a', :owner_a), '23514');

select chk_raises('batch: origin=adjustment carrying a purchase line is refused',
  format($q$insert into stock_batch (workspace_id, location_id, variant_id, origin,
             source_purchase_line_id, qty_received_base, unit_cost_net_per_base, created_by)
           values (%L, %L, %L, 'adjustment', %L, 5, 0.01, %L)$q$,
         :'ws_a', :'loc_a1', :'var_a', :pline_1, :owner_a), '23514');

select chk_raises('batch: origin=transfer without a source batch is refused',
  format($q$insert into stock_batch (workspace_id, location_id, variant_id, origin,
             qty_received_base, unit_cost_net_per_base, created_by)
           values (%L, %L, %L, 'transfer', 5, 0.01, %L)$q$,
         :'ws_a', :'loc_a2', :'var_a', :owner_a), '23514');

select chk_raises('batch: a zero or negative receipt is not a batch',
  format($q$insert into stock_batch (workspace_id, location_id, variant_id, origin,
             qty_received_base, unit_cost_net_per_base, created_by)
           values (%L, %L, %L, 'adjustment', 0, 0.01, %L)$q$,
         :'ws_a', :'loc_a1', :'var_a', :owner_a), '23514');

select chk_raises('batch: a variant from the other tenant is refused',
  format($q$insert into stock_batch (workspace_id, location_id, variant_id, origin,
             qty_received_base, unit_cost_net_per_base, created_by)
           values (%L, %L, %L, 'adjustment', 5, 0.01, %L)$q$,
         :'ws_a', :'loc_a1', :'var_b', :owner_a), '23503');

select chk_raises('batch: a purchase line from the other STORE is refused',
  format($q$insert into stock_batch (workspace_id, location_id, variant_id, origin,
             source_purchase_line_id, qty_received_base, unit_cost_net_per_base, created_by)
           values (%L, %L, %L, 'purchase', %L, 5, 0.01, %L)$q$,
         :'ws_a', :'loc_a1', :'var_a', :pline_a2, :owner_a), '23503');

select chk_raises('batch: one batch per purchase line — the second is refused',
  format($q$insert into stock_batch (workspace_id, location_id, variant_id, origin,
             source_purchase_line_id, qty_received_base, unit_cost_net_per_base, created_by)
           values (%L, %L, %L, 'purchase', %L, 5, 0.01, %L)$q$,
         :'ws_a', :'loc_a1', :'var_a', :pline_1, :owner_a), '23505');


-- ============================================================= movements =====
\set mv_pur   '''eeee0004-0000-0000-0000-000000000001'''
\set mv_sale  '''eeee0004-0000-0000-0000-000000000002'''
\set mv_rev   '''eeee0004-0000-0000-0000-000000000003'''
\set mv_was   '''eeee0004-0000-0000-0000-000000000004'''
\set mv_adj   '''eeee0004-0000-0000-0000-000000000005'''
\set mv_over  '''eeee0004-0000-0000-0000-000000000006'''
\set mv_a2    '''eeee0004-0000-0000-0000-000000000007'''
\set mv_out   '''eeee0004-0000-0000-0000-000000000008'''
\set mv_in    '''eeee0004-0000-0000-0000-000000000009'''
\set xfer_1   '''ffff0004-0000-0000-0000-000000000001'''

-- The delivery lands: +1000 g.
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
values (:mv_pur, :'ws_a', :'loc_a1', :batch_1, :'var_a',
        'purchase', 1000, 0.012000, :pur_1, now(), :owner_a);

select chk('projection: the receipt movement, not the batch row, is what adds stock',
           (select remaining_base from batch_balance where batch_id = :batch_1) = 1000);

-- A sale takes 250 g.
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, sale_id, occurred_at, created_by)
values (:mv_sale, :'ws_a', :'loc_a1', :batch_1, :'var_a',
        'sale', -250, 0.012000, :sale_1, now(), :owner_a);

select chk('projection: a sale decrements the lot it consumed',
           (select remaining_base from batch_balance where batch_id = :batch_1) = 750);

-- The sale is voided: the compensating movement carries the ORIGINAL reason and
-- the opposite sign, against the SAME batch, and belongs to the reversal document.
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, sale_id, reversal_of_movement_id,
       occurred_at, created_by)
values (:mv_rev, :'ws_a', :'loc_a1', :batch_1, :'var_a',
        'sale', 250, 0.012000, :sale_2, :mv_sale, now(), :owner_a);

select chk('projection: a reversal returns the units to the lot they came from',
           (select remaining_base from batch_balance where batch_id = :batch_1) = 1000);

-- Waste takes 100 g.
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, waste_id, occurred_at, created_by)
values (:mv_was, :'ws_a', :'loc_a1', :batch_1, :'var_a',
        'waste', -100, 0.012000, :was_1, now(), :owner_a);

-- The opening count, and then a sale bigger than the count: an OVERSALE, which v1
-- permits because stock is recorded and not enforced (§2.6).
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
values (:mv_adj, :'ws_a', :'loc_a1', :batch_adj, :'var_a',
        'adjustment', 10, 0.010000, now(), :owner_a);

insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, sale_id, occurred_at, created_by)
values (:mv_over, :'ws_a', :'loc_a1', :batch_adj, :'var_a',
        'sale', -25, 0.010000, :sale_1, now(), :owner_a);

select chk('projection: a negative balance is representable — v1 records stock, it does not enforce it',
           (select remaining_base from batch_balance where batch_id = :batch_adj) = -15);

-- Store 2's opening count.
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
values (:mv_a2, :'ws_a', :'loc_a2', :batch_a2, :'var_a',
        'adjustment', 500, 0.011000, now(), :owner_a);


-- --- the transfer shape (mechanics land in 0005; the SHAPE is fixed here) -----
-- 200 g moves from store 1 to store 2. A NEW batch at the destination carrying
-- cost and expiry forward, paired movements, and the origin batch untouched.
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       source_batch_id, qty_received_base, unit_cost_net_per_base, expiry_date, created_by)
select :batch_xfer, :'ws_a', :'loc_a2', :'var_a', 'transfer',
       :batch_1, 200, sb.unit_cost_net_per_base, sb.expiry_date, :owner_a
  from stock_batch sb where sb.id = :batch_1;

insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, transfer_group_id, occurred_at, created_by)
values (:mv_out, :'ws_a', :'loc_a1', :batch_1, :'var_a',
        'transfer_out', -200, 0.012000, :xfer_1, now(), :owner_a),
       (:mv_in, :'ws_a', :'loc_a2', :batch_xfer, :'var_a',
        'transfer_in', 200, 0.012000, :xfer_1, now(), :owner_a);

select chk('transfer: the destination batch carries cost and expiry forward',
           (select d.unit_cost_net_per_base = o.unit_cost_net_per_base
               and d.expiry_date is not distinct from o.expiry_date
              from stock_batch d join stock_batch o on o.id = d.source_batch_id
             where d.id = :batch_xfer));
select chk('transfer: the origin batch stays at the origin location',
           (select location_id from stock_batch where id = :batch_1) = :'loc_a1');
select chk('transfer: the pair is findable by transfer_group_id, one leg per store',
           (select count(distinct location_id) from stock_movement
             where transfer_group_id = :xfer_1) = 2);
select chk('transfer: the paired movements net to zero across the tenant',
           (select sum(qty_base) from stock_movement where transfer_group_id = :xfer_1) = 0);


-- --- stock_movement constraints ----------------------------------------------
select chk_raises('movement: a batch at another location is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
           values (%L, %L, %L, %L, 'adjustment', 5, 0.01, now(), %L)$q$,
         :'ws_a', :'loc_a2', :batch_1, :'var_a', :owner_a), '23503');

select chk_raises('movement: a variant that disagrees with its batch is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
           values (%L, %L, %L, %L, 'adjustment', 5, 0.01, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_b', :owner_a), '23503');

select chk_raises('movement: a sale that ADDS stock is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, sale_id, occurred_at, created_by)
           values (%L, %L, %L, %L, 'sale', 5, 0.01, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :sale_1, :owner_a), '23514');

select chk_raises('movement: a purchase that REMOVES stock is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
           values (%L, %L, %L, %L, 'purchase', -5, 0.01, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :pur_1, :owner_a), '23514');

select chk_raises('movement: a zero-quantity movement is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
           values (%L, %L, %L, %L, 'adjustment', 0, 0.01, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :owner_a), '23514');

select chk_raises('movement: a sale carrying a purchase document is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
           values (%L, %L, %L, %L, 'sale', -5, 0.01, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :pur_1, :owner_a), '23514');

select chk_raises('movement: a sale with no document at all is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
           values (%L, %L, %L, %L, 'sale', -5, 0.01, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :owner_a), '23514');

select chk_raises('movement: a transfer leg with no transfer_group_id is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
           values (%L, %L, %L, %L, 'transfer_out', -5, 0.01, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :owner_a), '23514');

select chk_raises('movement: an adjustment pretending to be a transfer is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, transfer_group_id, occurred_at, created_by)
           values (%L, %L, %L, %L, 'adjustment', 5, 0.01, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :xfer_1, :owner_a), '23514');

select chk_raises('movement: a document from the other STORE is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
           values (%L, %L, %L, %L, 'purchase', 5, 0.01, %L, now(), %L)$q$,
         :'ws_a', :'loc_a2', :batch_a2, :'var_a', :pur_1, :owner_a), '23503');

-- Deliberately reverses mv_was and not mv_sale: mv_sale already has a reversal,
-- so this insert would trip the one-reversal index first and pass for the wrong
-- reason. It is the composite FK that must refuse a compensating movement filed
-- against another lot.
select chk_raises('movement: a reversal crediting a DIFFERENT batch is refused',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, waste_id, reversal_of_movement_id,
             occurred_at, created_by)
           values (%L, %L, %L, %L, 'waste', 100, 0.01, %L, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_adj, :'var_a', :was_1, :mv_was, :owner_a), '23503');

select chk_raises('movement: a movement cannot be reversed twice',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, sale_id, reversal_of_movement_id,
             occurred_at, created_by)
           values (%L, %L, %L, %L, 'sale', 250, 0.01, %L, %L, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :sale_2, :mv_sale, :owner_a), '23505');


-- --- append-only, exercised AS SUPERUSER --------------------------------------
-- The point of the guard is the 0005/0006 security definer functions, where RLS
-- and grants are not running. Running these as `authenticated` would prove only
-- that the grant is missing, which is a different (and weaker) fact.
select chk_raises('append-only: a batch cannot be updated, even by postgres',
  format($q$update stock_batch set qty_received_base = 1 where id = %L$q$, :batch_1),
  '23001');
select chk_raises('append-only: a batch cannot be relocated, even by postgres',
  format($q$update stock_batch set location_id = %L where id = %L$q$, :'loc_a2', :batch_1),
  '23001');
select chk_raises('append-only: a batch cannot be deleted, even by postgres',
  format($q$delete from stock_batch where id = %L$q$, :batch_1), '23001');
select chk_raises('append-only: a movement cannot be updated, even by postgres',
  format($q$update stock_movement set qty_base = 0 where id = %L$q$, :mv_sale), '23001');
select chk_raises('append-only: a movement cannot be deleted, even by postgres',
  format($q$delete from stock_movement where id = %L$q$, :mv_sale), '23001');


-- ====================================== the invariant, and the rebuild ========
-- ADR-035 §2.4: sum(movements) = remaining, for every batch, at all times.

select chk('invariant: holds on the fixture, reversal and oversale included',
           (select count(*) from batch_balance_violations()) = 0);

select chk('invariant: the arithmetic is the one a person would check by hand',
           (select remaining_base from batch_balance where batch_id = :batch_1) = 700
       and (select remaining_base from batch_balance where batch_id = :batch_adj) = -15
       and (select remaining_base from batch_balance where batch_id = :batch_a2) = 500
       and (select remaining_base from batch_balance where batch_id = :batch_xfer) = 200);

-- "The projection is disposable and rebuildable from the ledger." Proven by
-- throwing it away and comparing. updated_at is excluded because the rebuild is a
-- later moment in time — it is the only column that is allowed to differ.
create table public._bb_before as
  select batch_id, workspace_id, location_id, variant_id, remaining_base,
         expiry_date, received_at
    from batch_balance;

select rebuild_batch_balance() as rebuilt_rows \gset

select chk('rebuild: reproduces every row exactly, from stock_movement alone',
       not exists (select * from public._bb_before
                   except
                   select batch_id, workspace_id, location_id, variant_id,
                          remaining_base, expiry_date, received_at from batch_balance)
   and not exists (select batch_id, workspace_id, location_id, variant_id,
                          remaining_base, expiry_date, received_at from batch_balance
                   except
                   select * from public._bb_before),
       'rebuilt ' || :'rebuilt_rows' || ' rows');

select chk('rebuild: writes one row per batch, including lots that never moved',
           :'rebuilt_rows'::bigint = (select count(*) from stock_batch));

-- The check has to be able to fail, or green means nothing. Corrupt the
-- projection two different ways — a wrong number, and a missing row — and confirm
-- both are caught, then that the rebuild repairs them.
update batch_balance set remaining_base = remaining_base + 999 where batch_id = :batch_1;
delete from batch_balance where batch_id = :batch_a2;

select chk('invariant: a falsified balance is detected',
           (select count(*) from batch_balance_violations()) = 2);
select chk('invariant: the report names the batches and the disagreement',
           (select movement_sum = 700 and projected_remaining = 1699
              from batch_balance_violations() where batch_id = :batch_1)
       and (select projected_remaining is null
              from batch_balance_violations() where batch_id = :batch_a2));

select rebuild_batch_balance() as repaired \gset
select chk('rebuild: repairs both, and the invariant holds again',
           (select count(*) from batch_balance_violations()) = 0
       and (select remaining_base from batch_balance where batch_id = :batch_1) = 700
       and (select remaining_base from batch_balance where batch_id = :batch_a2) = 500);


-- ===================================================================== RLS ====
-- Every block below runs under `set local role authenticated`. As postgres these
-- all pass vacuously.

-- --- staff at store 1 ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select chk('RLS staff@A1: sees the balances at their own store only',
           (select count(*) from batch_balance) = 2);
select chk('RLS staff@A1: reads no cost — stock_batch is manager-and-above',
           (select count(*) from stock_batch) = 0);
select chk('RLS staff@A1: reads no cost — stock_movement is manager-and-above',
           (select count(*) from stock_movement) = 0);
select chk_raises('grants: a cashier cannot write the ledger',
  format($q$insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
             reason, qty_base, unit_cost_net_per_base, occurred_at, created_by)
           values (%L, %L, %L, %L, 'adjustment', 1, 0.01, now(), %L)$q$,
         :'ws_a', :'loc_a1', :batch_1, :'var_a', :owner_a), '42501');
select chk_raises('grants: a cashier cannot hand-correct a balance',
  format($q$update batch_balance set remaining_base = 0 where batch_id = %L$q$, :batch_1),
  '42501');
select chk_raises('grants: a cashier cannot rebuild the projection',
  'select public.rebuild_batch_balance()', '42501');
select chk_raises('grants: the invariant report is not part of the client surface',
  'select * from public.batch_balance_violations()', '42501');
commit;

-- --- staff at store 2 ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;

select chk('RLS staff@A2: sees their own store''s balances and not store 1''s',
           (select count(*) from batch_balance) = 2
       and (select count(*) from batch_balance where location_id = :'loc_a1') = 0);
commit;

-- --- manager in workspace A ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;

select chk('RLS manager@A: sees every batch in the workspace', (select count(*) from stock_batch) = 4);
select chk('RLS manager@A: sees every movement',               (select count(*) from stock_movement) = 9);
select chk('RLS manager@A: sees every balance',                (select count(*) from batch_balance) = 4);
select chk('RLS manager@A: cost is readable at manager level',
           (select unit_cost_net_per_base from stock_batch where id = :batch_1) = 0.012000);
commit;

-- --- owner of workspace B: a different tenant ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;

select chk('RLS tenant B: zero rows from every inventory table of tenant A',
           (select count(*) from stock_batch)    = 0
       and (select count(*) from stock_movement) = 0
       and (select count(*) from batch_balance)  = 0);
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
