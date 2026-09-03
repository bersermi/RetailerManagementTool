-- ============================================================================
-- Behavioural verification for 0015 — receipt completeness
-- ============================================================================
-- ADR-035 §9: a file is not evidence, a green CI run is. `supabase db reset`
-- proves only that this migration's DDL parses — and a constraint that parses
-- and never refuses anything is the vacuous green §9 exists to reject. This file
-- is the evidence that it refuses, and what it refuses.
--
-- Run it against a DATABASE THAT WAS JUST RESET — it writes fixture rows and
-- does not clean up, and the immutability guard means it cannot.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0015_receipt_completeness.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
--   For every stock_batch with origin in ('purchase', 'transfer'), the sum of
--   its LIVE RECEIPT MOVEMENTS — reason = 'purchase' or 'transfer_in', with
--   reversal_of_movement_id is null — equals qty_received_base, AT COMMIT.
--
-- The defect it exists for is the one docs/PLAN.md task 3.4 found and could not
-- catch: a lot that opens and never receives is INVISIBLE to the §2.4 invariant,
-- because the batch opens at zero, no movement is written, and zero equals zero.
-- 3.4's falsification S2 deleted the receipt from a purchase and all 64 §2.4
-- assertions stayed green. Check 2 below is that same defect, and it is red.
--
-- ----------------------------------------------------------------------------
-- ⚠️ HOW A COMMIT-TIME REFUSAL IS TESTED WITHOUT THE FILE DYING OF IT
-- ----------------------------------------------------------------------------
-- The rule is DEFERRABLE INITIALLY DEFERRED, so the refusal arrives at `commit`
-- and not at the offending statement. psql cannot catch that the way
-- `chk_raises` catches a statement-level error — by the time it happens the
-- transaction is over and anything the suite recorded inside it is gone with it.
--
-- So each falsification below is written as:
--
--   \set present 0                      -- so a failed INSERT cannot read as a pass
--   \set ON_ERROR_STOP off
--   begin;
--   insert …;                           -- the defective write
--   select count(*) … \gset             -- CLIENT-side: survives the rollback
--   commit;                             -- must fail
--   \set ON_ERROR_STOP on
--   select chk('… the row was really written', :present = 1);
--   select chk('… and the commit was refused', not exists (…));
--
-- ⚠️ THE `\gset` LINE IS THE ANTI-VACUITY GUARD AND IS NOT DECORATION. Without
-- it, an INSERT that failed for an unrelated reason — a renamed column, a
-- constraint added later — would abort the transaction, leave the row absent,
-- and every "the commit was refused" check would pass while proving nothing.
-- The pair asks both halves: the row existed inside the transaction, and it does
-- not exist after it. Only a refused COMMIT produces both.
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
-- One workspace, two stores, one variant, one provider. Every purchase lot needs
-- a purchase line of its own — `stock_batch_one_per_purchase_line_idx` (0004)
-- allows exactly one batch per line — so the lines are minted up front and each
-- check below claims one.

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'staff.a1@example.mx');

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select onboard_workspace('Tienda A') as ws_a \gset
select set_config('request.jwt.claims', null, false);

insert into location (workspace_id, name) values (:'ws_a', 'Sucursal Norte');

select id as loc_1 from location where workspace_id = :'ws_a' and name = 'Tienda A' \gset
select id as loc_2 from location where workspace_id = :'ws_a' and name = 'Sucursal Norte' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', '22222222-2222-2222-2222-222222222222', 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm
 where wm.user_id = '22222222-2222-2222-2222-222222222222';

insert into product_family (workspace_id, name) values (:'ws_a', 'Jitomate');
select id as fam_a from product_family where workspace_id = :'ws_a' \gset
insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code, tax_rate)
values (:'ws_a', :'fam_a', 'Jitomate a granel', 'g', 'kg', 'g', 'g', 0.16);
select id as var_a from product_variant where workspace_id = :'ws_a' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

\set owner_a '''11111111-1111-1111-1111-111111111111'''

-- The delivery document, and one line per lot this file opens. Every line is
-- 1 kg at 0.012/g: 1000 g, net 12.00, tax round(12.00 × 0.16) = 1.92 (§2.5).
\set pur_1 '''aaaa0015-0000-0000-0000-000000000001'''

insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash)
values (:pur_1, :'ws_a', :'loc_1', :'prov_a', now(), 96.00, 15.36,
        :owner_a, 'hash-0015-pur-1');

insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id,
       qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
       line_net, tax_amount, tax_rate)
select ('bbbb0015-0000-0000-0000-00000000000' || n)::uuid,
       :'ws_a', :'loc_1', :pur_1, :'var_a',
       1000, 1, 'kg', 0.012000, 12.00, 1.92, 0.16
  from generate_series(1, 8) as n;

\set line_ok     '''bbbb0015-0000-0000-0000-000000000001'''
\set line_orphan '''bbbb0015-0000-0000-0000-000000000002'''
\set line_short  '''bbbb0015-0000-0000-0000-000000000003'''
\set line_double '''bbbb0015-0000-0000-0000-000000000004'''
\set line_w1     '''bbbb0015-0000-0000-0000-000000000005'''
\set line_w2     '''bbbb0015-0000-0000-0000-000000000006'''
\set line_del    '''bbbb0015-0000-0000-0000-000000000007'''
\set line_defer  '''bbbb0015-0000-0000-0000-000000000008'''

\set b_ok        '''dddd0015-0000-0000-0000-000000000001'''
\set b_orphan    '''dddd0015-0000-0000-0000-000000000002'''
\set b_short     '''dddd0015-0000-0000-0000-000000000003'''
\set b_double    '''dddd0015-0000-0000-0000-000000000004'''
\set b_w1        '''dddd0015-0000-0000-0000-000000000005'''
\set b_w2        '''dddd0015-0000-0000-0000-000000000006'''
\set b_adj       '''dddd0015-0000-0000-0000-000000000007'''
\set b_void      '''dddd0015-0000-0000-0000-000000000008'''
\set b_xfer_ok   '''dddd0015-0000-0000-0000-000000000009'''
\set b_xfer_bad  '''dddd0015-0000-0000-0000-00000000000a'''
\set b_del       '''dddd0015-0000-0000-0000-00000000000b'''
\set b_defer     '''dddd0015-0000-0000-0000-00000000000c'''

\set mv_ok       '''eeee0015-0000-0000-0000-000000000001'''
\set mv_void     '''eeee0015-0000-0000-0000-000000000002'''
\set mv_void_rev '''eeee0015-0000-0000-0000-000000000003'''
\set mv_del      '''eeee0015-0000-0000-0000-000000000004'''
\set xfer_1      '''ffff0015-0000-0000-0000-000000000001'''


-- ================================================== 1. the shape that works ==
-- A delivery is ONE TRANSACTION: the lot opens and its receipt lands before the
-- commit. This is what record_purchase (0018) has to write, and everything below
-- is a way of not writing it.
begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, created_by)
values (:b_ok, :'ws_a', :'loc_1', :'var_a', 'purchase',
        :'prov_a', :line_ok, 1000, 0.012000, :owner_a);

insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
values (:mv_ok, :'ws_a', :'loc_1', :b_ok, :'var_a',
        'purchase', 1000, 0.012000, :pur_1, now(), :owner_a);
commit;

select chk('1. a lot and its receipt in one transaction commit',
           exists (select 1 from stock_batch where id = :b_ok)
       and (select remaining_base from batch_balance where batch_id = :b_ok) = 1000);


-- ============================== 2. the defect 3.4 found, and could not catch ==
-- The lot opens, the receipt is never written. §2.4 is green on this state — the
-- balance is 0 and the movements sum to 0 — and the shop is short 1 kg.
\set present 0
\set ON_ERROR_STOP off
begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, created_by)
values (:b_orphan, :'ws_a', :'loc_1', :'var_a', 'purchase',
        :'prov_a', :line_orphan, 1000, 0.012000, :owner_a);
select count(*) as present from stock_batch where id = :b_orphan \gset
commit;
\set ON_ERROR_STOP on

select chk('2. the unfilled lot really was written inside the transaction',
           :present = 1);
select chk('2. a purchase lot with NO receipt is refused AT COMMIT',
           not exists (select 1 from stock_batch where id = :b_orphan));
select chk('2. and §2.4 would have been green on it — the balance row is gone too',
           not exists (select 1 from batch_balance where batch_id = :b_orphan));


-- ================================================== 3. a SHORT receipt ========
-- 1 kg ordered, 750 g booked in. Arithmetically self-consistent, and wrong.
\set present 0
\set ON_ERROR_STOP off
begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, created_by)
values (:b_short, :'ws_a', :'loc_1', :'var_a', 'purchase',
        :'prov_a', :line_short, 1000, 0.012000, :owner_a);
insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
values (:'ws_a', :'loc_1', :b_short, :'var_a',
        'purchase', 750, 0.012000, :pur_1, now(), :owner_a);
select count(*) as present from stock_batch where id = :b_short \gset
commit;
\set ON_ERROR_STOP on

select chk('3. the short-receipt lot really was written inside the transaction',
           :present = 1);
select chk('3. a receipt SHORTER than the lot is refused at commit',
           not exists (select 1 from stock_batch where id = :b_short));


-- ================================================= 4. a DOUBLED receipt =======
-- The shape a retried write leaves when it gets past the header's idempotency
-- key and reaches the ledger twice.
\set present 0
\set ON_ERROR_STOP off
begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, created_by)
values (:b_double, :'ws_a', :'loc_1', :'var_a', 'purchase',
        :'prov_a', :line_double, 1000, 0.012000, :owner_a);
insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
values (:'ws_a', :'loc_1', :b_double, :'var_a',
        'purchase', 1000, 0.012000, :pur_1, now(), :owner_a),
       (:'ws_a', :'loc_1', :b_double, :'var_a',
        'purchase', 1000, 0.012000, :pur_1, now(), :owner_a);
select count(*) as present from stock_batch where id = :b_double \gset
commit;
\set ON_ERROR_STOP on

select chk('4. the doubled-receipt lot really was written inside the transaction',
           :present = 1);
select chk('4. a receipt booked TWICE is refused at commit',
           not exists (select 1 from stock_batch where id = :b_double));


-- ========= 4b. a receipt added LATER, to a lot that was already complete ======
-- ⚠️ THIS IS THE ONLY CHECK IN THIS FILE THAT THE `stock_batch` TRIGGER CANNOT
-- MAKE, and it is here because a trigger nothing can falsify is not evidence.
--
-- Checks 2 to 4 all open a lot and get it wrong inside one transaction, so the
-- batch trigger sees them whether or not the movement trigger exists. This one
-- touches no batch at all: `b_ok` was opened, filled and COMMITTED in check 1,
-- and the defect arrives a transaction later — a retry that got past the
-- header's idempotency key and reached the ledger again, which is exactly the
-- shape 0004's one-batch-per-purchase-line index was written against on the
-- batch side and nothing guarded on the movement side.
--
-- Delete `stock_movement_receipt_complete_ins_trg` from 0015 and this check, and
-- only this check, goes red.
\set present 0
\set ON_ERROR_STOP off
begin;
insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
values (:'ws_a', :'loc_1', :b_ok, :'var_a',
        'purchase', 500, 0.012000, :pur_1, now(), :owner_a);
select count(*) as present from stock_movement
 where batch_id = :b_ok and reason = 'purchase' and qty_base = 500 \gset
commit;
\set ON_ERROR_STOP on

select chk('4b. the late receipt really was written inside the transaction',
           :present = 1);
select chk('4b. a receipt added to an ALREADY COMPLETE lot is refused at commit',
           (select remaining_base from batch_balance where batch_id = :b_ok) = 1000
       and not exists (select 1 from stock_movement
                        where batch_id = :b_ok and reason = 'purchase'
                          and qty_base = 500));


-- ======================================= 5. a receipt against the WRONG lot ===
-- Two lots open; both receipts land on the first. The totals across the delivery
-- are perfect — 1500 g arrived and 1500 g were booked — and both lots are wrong.
-- This is the check the whole-delivery arithmetic cannot make and the per-lot
-- rule can.
\set present 0
\set ON_ERROR_STOP off
begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, created_by)
values (:b_w1, :'ws_a', :'loc_1', :'var_a', 'purchase',
        :'prov_a', :line_w1, 1000, 0.012000, :owner_a),
       (:b_w2, :'ws_a', :'loc_1', :'var_a', 'purchase',
        :'prov_a', :line_w2, 500, 0.012000, :owner_a);
insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
values (:'ws_a', :'loc_1', :b_w1, :'var_a',
        'purchase', 1000, 0.012000, :pur_1, now(), :owner_a),
       (:'ws_a', :'loc_1', :b_w1, :'var_a',
        'purchase', 500, 0.012000, :pur_1, now(), :owner_a);
select count(*) as present from stock_batch where id in (:b_w1, :b_w2) \gset
commit;
\set ON_ERROR_STOP on

select chk('5. both mis-booked lots really were written inside the transaction',
           :present = 2);
select chk('5. a receipt booked against the WRONG lot is refused at commit, '
           'though the delivery total is right',
           not exists (select 1 from stock_batch where id in (:b_w1, :b_w2)));


-- ============================================ 6. the adjustment EXCLUSION =====
-- An adjustment lot receives nothing from anybody: allocate_fefo()'s shortfall
-- branch opens one so an oversale has a batch_id to land on, and adjust_stock
-- (0020) opens one because a human counted the shelf. Its qty_received_base is
-- an assertion, not a receipt, and a rule written over all three origins fires
-- on it the day it ships.
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       qty_received_base, unit_cost_net_per_base, created_by)
values (:b_adj, :'ws_a', :'loc_1', :'var_a', 'adjustment',
        10, 0.010000, :owner_a);

select chk('6. an adjustment lot with no receipt at all commits — the exclusion',
           exists (select 1 from stock_batch where id = :b_adj));
select chk('6. and it is outside the rule rather than passing it',
           not exists (select 1 from receipt_completeness_violations()
                        where batch_id = :b_adj));


-- ================================= 7. a VOIDED delivery survives the rule =====
-- `reversal_of_movement_id is null` is the load-bearing half of the predicate.
-- A void does not delete the receipt, it writes a compensating movement against
-- the same batch carrying the SAME reason (§2.4). Count that and the sum goes to
-- zero on a lot that is entirely correct — which would refuse 23 of the seed's
-- own lots.
\set pur_void '''aaaa0015-0000-0000-0000-000000000002'''
\set pur_vrev '''aaaa0015-0000-0000-0000-000000000003'''
\set line_void '''bbbb0015-0000-0000-0000-000000000009'''

insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash)
values (:pur_void, :'ws_a', :'loc_1', :'prov_a', now(), 12.00, 1.92,
        :owner_a, 'hash-0015-pur-void');
insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id,
       qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
       line_net, tax_amount, tax_rate)
values (:line_void, :'ws_a', :'loc_1', :pur_void, :'var_a',
        1000, 1, 'kg', 0.012000, 12.00, 1.92, 0.16);

insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash,
                      reversal_of, reversal_reason)
values (:pur_vrev, :'ws_a', :'loc_1', :'prov_a', now(), -12.00, -1.92,
        :owner_a, 'hash-0015-pur-vrev', :pur_void, 'mercancía devuelta');

begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, created_by)
values (:b_void, :'ws_a', :'loc_1', :'var_a', 'purchase',
        :'prov_a', :line_void, 1000, 0.012000, :owner_a);
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
values (:mv_void, :'ws_a', :'loc_1', :b_void, :'var_a',
        'purchase', 1000, 0.012000, :pur_void, now(), :owner_a);
commit;

-- The void, in its own transaction, the way void_transaction (0019) will write
-- it: the lot is already complete and must stay complete afterwards.
begin;
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id,
       reversal_of_movement_id, occurred_at, created_by)
values (:mv_void_rev, :'ws_a', :'loc_1', :b_void, :'var_a',
        'purchase', -1000, 0.012000, :pur_vrev, :mv_void, now(), :owner_a);
commit;

select chk('7. voiding a delivery does not break the lot that received it',
           not exists (select 1 from receipt_completeness_violations()
                        where batch_id = :b_void));
select chk('7. the void really happened — the lot is empty and the receipt stands',
           (select remaining_base from batch_balance where batch_id = :b_void) = 0
       and exists (select 1 from stock_movement
                    where id = :mv_void_rev and reversal_of_movement_id = :mv_void));


-- ==================================== 8. and 9. the transfer half of the rule ==
-- A transfer opens a NEW lot at the destination and fills it with 'transfer_in'.
-- The rule reaches transfers for the same reason it reaches purchases: the lot
-- and the movement are separate statements, and one without the other is a store
-- that believes stock arrived when it did not.
begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       source_batch_id, qty_received_base, unit_cost_net_per_base, created_by)
values (:b_xfer_ok, :'ws_a', :'loc_2', :'var_a', 'transfer',
        :b_ok, 200, 0.012000, :owner_a);
insert into stock_movement (workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, transfer_group_id, occurred_at,
       created_by)
values (:'ws_a', :'loc_1', :b_ok, :'var_a',
        'transfer_out', -200, 0.012000, :xfer_1, now(), :owner_a),
       (:'ws_a', :'loc_2', :b_xfer_ok, :'var_a',
        'transfer_in', 200, 0.012000, :xfer_1, now(), :owner_a);
commit;

select chk('8. a transfer lot filled by its transfer_in commits',
           (select remaining_base from batch_balance where batch_id = :b_xfer_ok) = 200);
select chk('8. and the ORIGIN lot is still complete — transfer_out is not a receipt',
           not exists (select 1 from receipt_completeness_violations()
                        where batch_id = :b_ok));

\set present 0
\set ON_ERROR_STOP off
begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       source_batch_id, qty_received_base, unit_cost_net_per_base, created_by)
values (:b_xfer_bad, :'ws_a', :'loc_2', :'var_a', 'transfer',
        :b_ok, 100, 0.012000, :owner_a);
select count(*) as present from stock_batch where id = :b_xfer_bad \gset
commit;
\set ON_ERROR_STOP on

select chk('9. the arriving lot really was written inside the transaction',
           :present = 1);
select chk('9. a transfer lot with NO transfer_in is refused at commit',
           not exists (select 1 from stock_batch where id = :b_xfer_bad));


-- ============== 10. the rule is DEFERRED, and that is a property, not a detail ==
-- If it fired per statement it would refuse every correct delivery ever written,
-- because the movement carries batch_id and the lot must exist first. The two
-- checks below are the two halves of that: the lot may stand unfilled INSIDE the
-- transaction, and forcing the constraint immediate is what makes it bite there.
--
-- The observations are held in plpgsql variables rather than written to
-- `_verify` inside the block, because the subtransaction that catches the
-- refusal rolls back everything the block wrote — including the evidence.
do $$
declare
  v_stood boolean := false;
  v_bit   boolean := false;
  v_state text    := '(none)';
begin
  begin
    insert into public.stock_batch (id, workspace_id, location_id, variant_id,
           origin, provider_id, source_purchase_line_id, qty_received_base,
           unit_cost_net_per_base, created_by)
    select 'dddd0015-0000-0000-0000-00000000000c', pl.workspace_id, pl.location_id,
           pl.variant_id, 'purchase', p.provider_id, pl.id, 1000, 0.012000,
           p.created_by
      from public.purchase_line pl
      join public.purchase p on p.id = pl.purchase_id
     where pl.id = 'bbbb0015-0000-0000-0000-000000000008';

    v_stood := exists (select 1 from public.stock_batch
                        where id = 'dddd0015-0000-0000-0000-00000000000c');

    set constraints public.stock_batch_receipt_complete_trg immediate;
  exception when check_violation then
    v_bit   := true;
    v_state := sqlstate;
  end;

  perform public.chk('10. a purchase lot may stand unfilled INSIDE the transaction',
                     v_stood);
  perform public.chk('10. `set constraints … immediate` is what makes it bite there',
                     v_bit, 'sqlstate ' || v_state);
end;
$$;

select chk('10. and the forced check left nothing behind',
           not exists (select 1 from stock_batch where id = :b_defer));


-- ========== 11. removing a receipt AFTER the fact, with the other guard off ====
-- ⚠️ THIS CHECK DISABLES stock_movement_immutable_trg BY NAME, and that is the
-- whole point of it. 0004's immutability guard already refuses every UPDATE and
-- DELETE on stock_movement, so without lifting it nothing reaches 0015's
-- delete-or-update trigger and the third of its three triggers would be
-- untested rather than merely unreachable.
--
-- It does NOT lift `session_replication_role`, which would switch off every user
-- trigger including the one under test. Nothing at the trigger layer defends
-- against that, and pretending otherwise here would be the vacuous green.
begin;
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, created_by)
values (:b_del, :'ws_a', :'loc_1', :'var_a', 'purchase',
        :'prov_a', :line_del, 1000, 0.012000, :owner_a);
insert into stock_movement (id, workspace_id, location_id, batch_id, variant_id,
       reason, qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by)
values (:mv_del, :'ws_a', :'loc_1', :b_del, :'var_a',
        'purchase', 1000, 0.012000, :pur_1, now(), :owner_a);
commit;

select chk_raises('11. with the immutability guard ON, the delete never gets that far',
  format($q$delete from stock_movement where id = %L$q$, :mv_del), '23001');

alter table stock_movement disable trigger stock_movement_immutable_trg;

\set present 0
\set ON_ERROR_STOP off
begin;
delete from stock_movement where id = :mv_del;
select count(*) as present from stock_movement where id = :mv_del \gset
commit;
\set ON_ERROR_STOP on

alter table stock_movement enable trigger stock_movement_immutable_trg;

select chk('11. the receipt really was deleted inside the transaction',
           :present = 0);
select chk('11. deleting a lot''s receipt is refused at commit — the movement is back',
           exists (select 1 from stock_movement where id = :mv_del)
       and (select remaining_base from batch_balance where batch_id = :b_del) = 1000);


-- ================================================== 12. access to the reader ==
-- receipt_completeness_violations() is security definer and sees every tenant,
-- so it follows batch_balance_violations(): an operator and CI tool, granted to
-- nobody. A client that could call it would read the shape of every workspace's
-- deliveries across the tenant wall.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('12. a cashier cannot call receipt_completeness_violations()',
  'select count(*) from public.receipt_completeness_violations()', '42501');
commit;


-- ====================================== 13. the floor, and the closing state ==
-- ⚠️ EVERY GREEN ABOVE IS A CLAIM ABOUT LOTS THAT EXIST. A fixture whose
-- purchase and transfer inserts had all quietly failed would leave check 13's
-- "no violations" green and prove nothing whatsoever — the same vacuous shape
-- 3.4's F2 floor exists to refuse. So the rule's own subjects are counted first.
--
-- THREE purchase lots survive this file, not eight: b_ok, b_void and b_del. The
-- other five were written and REFUSED, which is what checks 2 to 5 are, and the
-- gap between the eight purchase lines minted in the fixture and the three lots
-- standing here is itself the measure of how often the rule fired.
select chk('13. the fixture really contains lots the rule applies to',
           (select count(*) from stock_batch where origin = 'purchase')  = 3
       and (select count(*) from stock_batch where origin = 'transfer')  = 1
       and (select count(*) from stock_batch where origin = 'adjustment') = 1,
           format('purchase=%s transfer=%s adjustment=%s',
                  (select count(*) from stock_batch where origin = 'purchase'),
                  (select count(*) from stock_batch where origin = 'transfer'),
                  (select count(*) from stock_batch where origin = 'adjustment')));

select chk('13. and every one of them satisfies the rule at the end of the file',
           not exists (select 1 from receipt_completeness_violations()));

select chk('13. the §2.4 invariant is still green beside it — this rule adds to it',
           not exists (select 1 from batch_balance_violations()));


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
