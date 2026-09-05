-- ============================================================================
-- Behavioural verification for 0020 — record_transfer()
-- ============================================================================
-- ADR-035 §1, §2.3, §2.4, §2.6, §9. docs/PLAN.md task 4e-i.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0020_record_transfer.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `record_transfer` is the fourth RPC and the only one that touches two stores.
-- Everything that makes it different comes from one fact: §2.4 gives a transfer
-- NO DOCUMENT TABLE. Four sections exist only because of that.
--
--   THE WALL IS DOUBLED, AND THE WORKSPACE IS COMPARED. Section 1. 4b-i settled
--   that the workspace is DERIVED from the location and named this function in
--   advance as the one that cannot: two locations are two workspaces until
--   something proves otherwise. ⚠️ Check 1.6 is the one that matters and it is
--   the only check in this repository that needs a caller holding stores in TWO
--   workspaces — both access walls pass and the transfer must still be refused.
--
--   ONE VARIANT PER TRANSFER. Section 2.10. The ledger keeps movements per LOT,
--   so two lines for one variant are indistinguishable on the way back and the
--   recomputed hash could not tell [A 2, A 3] from [A 5]. `record_sale` permits
--   the duplicate because `sale_line` keeps the rows apart; nothing does here.
--
--   THE IDEMPOTENCY HASH IS RECOMPUTED FROM THE LEDGER, not stored. Section 5.
--   ⚠️ 5.6 is the check that proves it is a HASH and not an id match — a
--   corrected retry under the same id raises `TD001` rather than being told its
--   first, wrong version succeeded.
--
--   `received_at` ON THE DESTINATION LOT IS `occurred_at`. Section 7, and it is
--   the gap 4d-ii found on `record_waste` and named THIS FILE for in advance.
--   ⚠️ 7.3 is not about a timestamp column: `received_at` is FEFO's tiebreak
--   (§2.4), so a backdated shipment that stamped `now()` would sort a lot dated
--   today BEHIND stock that arrived after it and rotate the destination wrong.
--
-- ⚠️ CHECK 6.7 EXISTS BECAUSE A FALSIFICATION FOUND ITS ABSENCE. F8 pointed the
-- enforcement block at the DESTINATION's shelf instead of the origin's and not
-- one of the file's 74 checks went red — every other enforced case was short at
-- both stores, so the two readings agreed. A destination is EXPECTED to be
-- empty, so that error would have refused every first shipment to a new store.
--
-- Section 6 is the owner's decision of 2026-09-04 made falsifiable: this
-- function GETS the availability check where `record_waste` does not, because
-- an unbacked transfer does not keep its debt in one store — it invents a lot
-- at the destination.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ NOTHING ABOUT THE ADVISORY LOCK, and this is the sharpest gap any suite
-- in this repository has had to declare. `record_transfer` has NO primary key to
-- collide on — `transfer_group_id` is a plain column and cannot be unique,
-- because one shipment writes many rows under one id. So §2.6's third
-- idempotency row ("first attempt still in flight → the second blocks") rests
-- ENTIRELY on `pg_advisory_xact_lock`, and one connection cannot block on its
-- own lock. Deleting that lock turns NOT ONE check in this file red. That is
-- 4c-i's F6 finding in a third language, it is measured rather than asserted
-- (falsification F9), and the evidence it needs is a second connection in
-- `supabase/vitest/` — owed, and named in docs/PLAN.md.
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

create or replace function public.chk_message(p_label text, p_sql text, p_needles text[])
returns void language plpgsql as $$
declare v_msg text; v_missing text[];
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_msg := sqlerrm;
  select array_agg(x) into v_missing from unnest(p_needles) x where position(x in v_msg) = 0;
  perform public.chk(p_label, v_missing is null,
                     coalesce('missing: ' || array_to_string(v_missing, ', '), v_msg));
end;
$$;
grant execute on function public.chk_message(text, text, text[]) to authenticated;

-- `create or replace` is load-bearing — 0016, 0017, 0018 and 0019 all record
-- why: if a suite dies mid-file the DROPs at the end never run, and the next run
-- would fail on the helper rather than on the defect.
create or replace function public._call(p_id uuid, p_from uuid, p_to uuid,
                             p_lines jsonb,
                             p_at timestamptz default null,
                             p_off boolean default false)
returns text language sql as $$
  select format('select public.record_transfer(%L::uuid, %L::uuid, %L::uuid, '
                '%L::jsonb, %L::timestamptz, %L::boolean)',
                p_id, p_from, p_to, p_lines, p_at, p_off)
$$;
grant execute on function public._call(uuid, uuid, uuid, jsonb, timestamptz, boolean)
  to authenticated;

-- One transfer line. There is no money on a transfer, so this is the whole of it.
create or replace function public._tl(p_variant uuid, p_qty numeric,
                             p_unit text default null)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
           'variant_id',       p_variant,
           'qty_display',      p_qty,
           'qty_display_unit', p_unit)))
$$;
grant execute on function public._tl(uuid, numeric, text) to authenticated;


-- ---------------------------------------------------------------- fixture ----
-- ONE workspace with TWO stores, plus a SECOND workspace the owner is also a
-- member of — which no other suite in this repository has needed. Check 1.6 is
-- why: the only way to prove the workspace COMPARISON is load-bearing is a
-- caller who legitimately holds a location on each side of a tenant boundary,
-- so that both access walls pass and only the comparison can refuse it.
--
-- THE VARIANTS:
--   var_two   TWO lots, DIFFERENT costs and DIFFERENT expiry dates — section 8's
--             one-destination-lot-per-ORIGIN-lot, which is the §2.4 rule a
--             merged batch would silently break
--   var_enf   enforce_stock TRUE, 1 on the shelf — section 6's pair
--   var_enf2  enforce_stock TRUE, TEN at the origin and NONE at the
--             destination — ⚠️ the ONLY shape that can tell which shelf the
--             enforcement block reads. Falsification F8 pointed it at the
--             destination and turned NOTHING red until 6.7 existed
--   var_kg    base g, PURCHASE kg, SELL 100g — section 4's ladder. The default
--             is the SELL unit here, which is `record_waste`'s reading and NOT
--             `record_purchase`'s
--   var_late  section 7's backdated shipment
--   var_plain everything else

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'cashier.a@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'owner.b@example.mx');

\set owner_a   '''11111111-1111-1111-1111-111111111111'''
\set cashier_a '''22222222-2222-2222-2222-222222222222'''
\set owner_b   '''33333333-3333-3333-3333-333333333333'''

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select onboard_workspace('Tienda A') as ws_a \gset
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);
select onboard_workspace('Tienda B') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc_1 from location where workspace_id = :'ws_a' \gset
select id as loc_b from location where workspace_id = :'ws_b' \gset
insert into location (workspace_id, name) values (:'ws_a', 'Sucursal Norte');
select id as loc_2 from location where workspace_id = :'ws_a' and name = 'Sucursal Norte' \gset

-- The cashier holds loc_1 and NOT loc_2 — the wall needs somewhere to be refused
-- from, on each side in turn.
insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :cashier_a, 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

-- ⚠️ THE OWNER OF A IS ALSO A MANAGER IN B, AND HOLDS B'S STORE. This is the
-- fixture check 1.6 exists for and the only one of its kind in the suite.
insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_b', :owner_a, 'manager');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_b', wm.id, :'loc_b' from workspace_member wm
 where wm.user_id = :owner_a and wm.workspace_id = :'ws_b';

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate,
       enforce_stock) values
  (:'ws_a', :'fam', 'Yogurt',       'pza','pza','pza', 'pza', 0.0000, null),
  (:'ws_a', :'fam', 'Pan exigido',  'pza','pza','pza', 'pza', 0.0000, true),
  (:'ws_a', :'fam', 'Leche exigida','pza','pza','pza', 'pza', 0.0000, true),
  (:'ws_a', :'fam', 'Queso granel', 'g',  'kg', '100g','100g',0.0000, null),
  (:'ws_a', :'fam', 'Pan tardio',   'pza','pza','pza', 'pza', 0.0000, null),
  (:'ws_a', :'fam', 'Galleta',      'pza','pza','pza', 'pza', 0.0000, null);

select id as var_two   from product_variant where workspace_id=:'ws_a' and name='Yogurt'       \gset
select id as var_enf   from product_variant where workspace_id=:'ws_a' and name='Pan exigido'  \gset
select id as var_enf2  from product_variant where workspace_id=:'ws_a' and name='Leche exigida'\gset
select id as var_kg    from product_variant where workspace_id=:'ws_a' and name='Queso granel' \gset
select id as var_late  from product_variant where workspace_id=:'ws_a' and name='Pan tardio'   \gset
select id as var_plain from product_variant where workspace_id=:'ws_a' and name='Galleta'      \gset

insert into product_family (workspace_id, name) values (:'ws_b', 'Ajena');
select id as fam_b from product_family where workspace_id=:'ws_b' \gset
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws_b', :'fam_b', 'Ajeno', 'pza','pza','pza','pza');
select id as var_b from product_variant where workspace_id=:'ws_b' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

-- ⚠️ THE SHELF IS STOCKED BY `record_purchase` (0018), not by hand — 0019's
-- choice, and for the same reason: the fixture is then built by the path a shop
-- uses. var_two gets TWO deliveries at different costs AND different expiry
-- dates, which is what lets section 8 tell one merged destination batch from two.
\set pur_1 '''cccc0020-0000-0000-0000-000000000001'''
\set pur_2 '''cccc0020-0000-0000-0000-000000000002'''
\set pur_3 '''cccc0020-0000-0000-0000-000000000003'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:pur_1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_two'::uuid,
           'qty_display', 10, 'unit_price_net_per_base', 2.00,
           'expiry_date', (current_date + 5)::text)),
         now() - interval '48 hours', true) as r \gset
select record_purchase(:pur_2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_two'::uuid,
           'qty_display', 10, 'unit_price_net_per_base', 5.00,
           'expiry_date', (current_date + 30)::text)),
         now() - interval '24 hours', true) as r \gset
select record_purchase(:pur_3::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_enf'::uuid,
             'qty_display', 1, 'unit_price_net_per_base', 3.00),
           jsonb_build_object('variant_id', :'var_enf2'::uuid,
             'qty_display', 10, 'unit_price_net_per_base', 3.00),
           jsonb_build_object('variant_id', :'var_kg'::uuid,
             'qty_display', 5, 'unit_price_net_per_base', 0.02),
           jsonb_build_object('variant_id', :'var_late'::uuid,
             'qty_display', 50, 'unit_price_net_per_base', 1.00),
           jsonb_build_object('variant_id', :'var_plain'::uuid,
             'qty_display', 100, 'unit_price_net_per_base', 1.00))) as r \gset
commit;

select chk('0.1 the fixture was built by record_purchase (0018): 20 of the '
           'two-lot variant at the ORIGIN, in TWO lots, and none at all at the '
           'destination',
           (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_two'::uuid and location_id = :'loc_1'::uuid) = 20
       and (select count(*) from batch_balance
             where variant_id = :'var_two'::uuid and location_id = :'loc_1'::uuid
               and remaining_base > 0) = 2
       and (select count(*) from stock_batch
             where location_id = :'loc_2'::uuid) = 0);

select chk('0.2 …and the two lots differ in BOTH cost and expiry, which is what '
           'makes section 8 able to fail',
           (select count(distinct unit_cost_net_per_base) from stock_batch
             where variant_id = :'var_two'::uuid) = 2
       and (select count(distinct expiry_date) from stock_batch
             where variant_id = :'var_two'::uuid) = 2);

select chk('0.3 the owner of A is genuinely a member of B and holds B''s store — '
           'without this, check 1.6 would pass on the access wall and prove '
           'nothing about the workspace comparison',
           (select count(*) from workspace_member wm
             join member_location ml on ml.member_id = wm.id
            where wm.user_id = :owner_a and wm.workspace_id = :'ws_b'
              and ml.location_id = :'loc_b'::uuid) = 1);


-- ================================================================= 1 ==========
-- THE LOCATION WALL — DOUBLED, and then the workspace COMPARISON behind it.
-- `security definer`, so RLS is not running and nothing in the schema catches
-- the absence of any of this.
-- =============================================================================

\set t_nullfrom '''aaaa0020-0000-0000-0000-000000000001'''
\set t_nullto   '''aaaa0020-0000-0000-0000-000000000002'''
\set t_otherto  '''aaaa0020-0000-0000-0000-000000000003'''
\set t_otherfr  '''aaaa0020-0000-0000-0000-000000000004'''
\set t_unassn   '''aaaa0020-0000-0000-0000-000000000005'''
\set t_unassn2  '''aaaa0020-0000-0000-0000-000000000006'''
\set t_crossws  '''aaaa0020-0000-0000-0000-000000000007'''
\set t_same     '''aaaa0020-0000-0000-0000-000000000008'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('1.1 a NULL ORIGIN is refused, and first',
                  public._call(:t_nullfrom::uuid, null, :'loc_2'::uuid,
                               public._tl(:'var_two'::uuid, 1)), '42501');
select chk_raises('1.2 a NULL DESTINATION is refused too — the wall is spelled '
                  'twice because the transaction spans two stores',
                  public._call(:t_nullto::uuid, :'loc_1'::uuid, null,
                               public._tl(:'var_two'::uuid, 1)), '42501');
select chk_raises('1.3 shipping TO another tenant''s store is refused',
                  public._call(:t_otherto::uuid, :'loc_1'::uuid, :'loc_b'::uuid,
                               public._tl(:'var_two'::uuid, 1)), '42501');
select chk_raises('1.4 …and shipping FROM one is refused as well',
                  public._call(:t_otherfr::uuid, :'loc_b'::uuid, :'loc_1'::uuid,
                               public._tl(:'var_two'::uuid, 1)), '42501');

-- ⚠️⚠️ 1.6 IS THE CHECK THIS FIXTURE EXISTS FOR. The caller holds loc_1 in A and
-- loc_b in B, so BOTH access walls pass — every `my_locations()` test in the
-- file above would let this through — and the only thing that can refuse it is
-- the comparison 4b-i said this function would need. Without it, stock crosses a
-- tenant boundary with every check green.
select chk_message('1.6 two stores the caller LEGITIMATELY holds, in two '
                   'different workspaces, are refused — the workspace is '
                   'COMPARED here, not derived (§2.3, §2.6)',
                   public._call(:t_crossws::uuid, :'loc_1'::uuid, :'loc_b'::uuid,
                                public._tl(:'var_two'::uuid, 1)),
                   array['different workspaces']);

select chk_raises('1.7 …and it is a 42501, not a foreign-key message from '
                  'halfway through the allocator''s loop',
                  public._call(:t_crossws::uuid, :'loc_1'::uuid, :'loc_b'::uuid,
                               public._tl(:'var_two'::uuid, 1)), '42501');

select chk_message('1.8 origin and destination the SAME store is refused by this '
                   'function, in the caller''s vocabulary rather than the '
                   'allocator''s',
                   public._call(:t_same::uuid, :'loc_1'::uuid, :'loc_1'::uuid,
                                public._tl(:'var_two'::uuid, 1)),
                   array['record_transfer', 'same location']);
-- ⚠️ `commit`, NOT `rollback`. A verdict recorded inside a transaction that ends
-- in `rollback` VANISHES from the report rather than failing — 4d-i lost
-- eighteen checks that way while reporting a clean pass. Nothing in these blocks
-- writes anything else; 1.9 is what asserts that, and 9.5 is the guard that
-- makes a recurrence impossible to miss.
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('1.5a a store in the caller''s OWN workspace that they are not '
                  'assigned to is refused as a DESTINATION — the wall is per '
                  'store, not per tenant',
                  public._call(:t_unassn::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                               public._tl(:'var_two'::uuid, 1)), '42501');
select chk_raises('1.5b …and as an ORIGIN',
                  public._call(:t_unassn2::uuid, :'loc_2'::uuid, :'loc_1'::uuid,
                               public._tl(:'var_two'::uuid, 1)), '42501');
commit;

select chk('1.9 …and not one of the eight refused shipments moved a unit of '
           'stock or opened a lot',
           (select count(*) from stock_movement
             where reason in ('transfer_in','transfer_out')) = 0
       and (select count(*) from stock_batch where origin = 'transfer') = 0);


-- ================================================================= 2 ==========
-- THE PAYLOAD. Validate EVERY line before moving ANY stock — 0016's finding,
-- and here a dropped line is stock missing at the origin with no record of
-- where it went.
-- =============================================================================

\set t_bad1 '''aaaa0020-0000-0000-0000-000000000011'''
\set t_bad2 '''aaaa0020-0000-0000-0000-000000000012'''
\set t_bad3 '''aaaa0020-0000-0000-0000-000000000013'''
\set t_bad4 '''aaaa0020-0000-0000-0000-000000000014'''
\set t_bad5 '''aaaa0020-0000-0000-0000-000000000015'''
\set t_bad6 '''aaaa0020-0000-0000-0000-000000000016'''
\set t_bad7 '''aaaa0020-0000-0000-0000-000000000017'''
\set t_bad8 '''aaaa0020-0000-0000-0000-000000000018'''
\set t_bad9 '''aaaa0020-0000-0000-0000-000000000019'''
\set t_bad10 '''aaaa0020-0000-0000-0000-00000000001a'''
\set t_bad11 '''aaaa0020-0000-0000-0000-00000000001b'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('2.1 a NULL id is refused — the client generates it, and here '
                  'it is also the transfer_group_id that pairs the legs',
                  public._call(null, :'loc_1'::uuid, :'loc_2'::uuid,
                               public._tl(:'var_two'::uuid, 1)), '22023');
select chk_raises('2.2 an EMPTY line array is refused',
                  public._call(:t_bad1::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                               '[]'::jsonb), '22023');
select chk_raises('2.3 a JSON OBJECT where an array belongs is refused',
                  public._call(:t_bad2::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                               '{"variant_id":"x"}'::jsonb), '22023');
select chk_message('2.4 a line with no variant_id is refused, BY LINE NUMBER',
                   public._call(:t_bad3::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                     jsonb_build_array(
                       jsonb_build_object('variant_id', :'var_two'::uuid,
                                          'qty_display', 1),
                       jsonb_build_object('qty_display', 2))),
                   array['line 2', 'variant_id is required']);
select chk_message('2.5 a line with no qty_display is refused',
                   public._call(:t_bad4::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                     jsonb_build_array(
                       jsonb_build_object('variant_id', :'var_two'::uuid))),
                   array['qty_display is required']);

-- ⚠️ ANOTHER TENANT'S VARIANT, shipped between two stores the caller DOES hold.
-- The location walls cannot catch this one — both stores are the caller's.
select chk_message('2.6 a variant belonging to another workspace is refused, and '
                   'the two location walls could not have caught it',
                   public._call(:t_bad5::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                                public._tl(:'var_b'::uuid, 1)),
                   array['is not in this workspace']);
select chk_message('2.7 an unknown unit code is refused',
                   public._call(:t_bad6::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                                public._tl(:'var_two'::uuid, 1, 'furlong')),
                   array['is not in the unit table']);
select chk_message('2.8 a unit from another DIMENSION is refused — a conversion '
                   'across dimensions has no answer to give (§2.5)',
                   public._call(:t_bad7::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                                public._tl(:'var_two'::uuid, 1, 'kg')),
                   array['has no answer to give']);
select chk_message('2.9 a NEGATIVE quantity is refused, and the message says a '
                   'transfer back is the two locations SWAPPED — not a sign',
                   public._call(:t_bad8::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                                public._tl(:'var_two'::uuid, -1)),
                   array['locations', 'swapped']);
select chk_raises('2.9b …and so is a quantity of exactly zero',
                  public._call(:t_bad9::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                               public._tl(:'var_two'::uuid, 0)), '22023');

-- ⚠️⚠️ 2.10 IS THIS FUNCTION'S OWN RULE AND NO OTHER RPC HAS IT. `record_sale`
-- accepts the same variant twice because `sale_line` keeps the two rows apart. A
-- transfer has no line table, so [A 2, A 3] and [A 5] leave the SAME movements
-- behind — the recomputed hash could not tell them apart, and rather than let
-- the idempotency contract quietly become an approximation the payload is
-- refused up front.
select chk_message('2.10 the SAME VARIANT ON TWO LINES is refused, and the '
                   'message says why: the ledger cannot tell them apart '
                   'afterwards',
                   public._call(:t_bad10::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                     jsonb_build_array(
                       jsonb_build_object('variant_id', :'var_two'::uuid,
                                          'qty_display', 2),
                       jsonb_build_object('variant_id', :'var_two'::uuid,
                                          'qty_display', 3))),
                   array['more than one line', 'Merge them']);

select chk_message('2.11 a quantity that rounds to zero in the BASE unit is '
                   'refused rather than shipped as nothing',
                   public._call(:t_bad11::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                                public._tl(:'var_kg'::uuid, 0.0000001, 'g')),
                   array['rounds to zero']);
commit;

select chk('2.12 …and not one of the eleven bad payloads moved a unit of stock',
           (select count(*) from stock_movement
             where reason in ('transfer_in','transfer_out')) = 0);


-- ================================================================= 3 ==========
-- THE PAIRED WRITE (§2.4) — the shape 0004 fixed and 0005 implements. This
-- section is what `record_transfer` is FOR.
-- =============================================================================

\set t_ok '''bbbb0020-0000-0000-0000-000000000001'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_transfer(:t_ok::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_plain'::uuid,
           'qty_display', 30))) as r_ok \gset
commit;

select chk('3.1 the shipment returned a summary naming BOTH stores and the '
           'workspace they share',
           (:'r_ok'::jsonb->>'from_location_id')::uuid = :'loc_1'::uuid
       and (:'r_ok'::jsonb->>'to_location_id')::uuid   = :'loc_2'::uuid
       and (:'r_ok'::jsonb->>'workspace_id')::uuid     = :'ws_a'::uuid
       and (:'r_ok'::jsonb->>'already_recorded')::boolean is false
       and (:'r_ok'::jsonb->>'line_count')::int = 1,
           :'r_ok');

select chk('3.2 the legs are PAIRED under one transfer_group_id, out for in, and '
           'the id is the client''s own — a transfer has no other identity (§2.4)',
           (select count(*) from stock_movement
             where transfer_group_id = :t_ok::uuid and reason = 'transfer_out') > 0
       and (select count(*) from stock_movement
             where transfer_group_id = :t_ok::uuid and reason = 'transfer_out')
         = (select count(*) from stock_movement
             where transfer_group_id = :t_ok::uuid and reason = 'transfer_in'));

select chk('3.3 …and they NET TO ZERO — a transfer is not a loss at one store '
           'and a windfall at the other',
           (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_ok::uuid) = 0);

select chk('3.4 the negative legs are at the ORIGIN and the positive legs at the '
           'DESTINATION, and never the other way about',
           not exists (select 1 from stock_movement
                        where transfer_group_id = :t_ok::uuid
                          and ((reason = 'transfer_out' and location_id <> :'loc_1'::uuid)
                            or (reason = 'transfer_in'  and location_id <> :'loc_2'::uuid))));

select chk('3.5 the shelf moved by exactly 30 at each end',
           (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_plain'::uuid and location_id = :'loc_1'::uuid) = 70
       and (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_plain'::uuid and location_id = :'loc_2'::uuid) = 30);

-- ⚠️ §2.4: "stock_batch.location_id is NEVER UPDATED — mutating it would rewrite
-- history and break the append-only principle." The destination gets a NEW lot.
select chk('3.6 the destination lot is a NEW batch with origin = transfer, '
           'pointing back at the lot it was cut from — the origin lot was not '
           'moved (§2.4)',
           (select count(*) from stock_batch b
             where b.location_id = :'loc_2'::uuid
               and b.variant_id = :'var_plain'::uuid
               and b.origin = 'transfer'
               and b.source_batch_id is not null) = 1);

select chk('3.7 …and the origin lot is still AT THE ORIGIN, with its own id '
           'unchanged',
           (select count(*) from stock_batch
             where variant_id = :'var_plain'::uuid
               and location_id = :'loc_1'::uuid) = 1);

select chk('3.8 COST is carried forward to the destination lot (§2.4)',
           (select b.unit_cost_net_per_base from stock_batch b
             where b.location_id = :'loc_2'::uuid and b.origin = 'transfer'
               and b.variant_id = :'var_plain'::uuid)
         = (select s.unit_cost_net_per_base from stock_batch s
             where s.location_id = :'loc_1'::uuid
               and s.variant_id = :'var_plain'::uuid));

-- ⚠️ `provider_id` IS NOT CARRIED FORWARD, and 0005 says why at the column: null
-- on a transfer batch means "no purchase happened at all — it walked in from the
-- other store". Carrying it would tell 0008's price memory that store B bought
-- from a supplier it has never dealt with.
select chk('3.9 provider_id is NOT carried forward — null is the documented '
           'meaning of the column on a transfer lot',
           (select b.provider_id from stock_batch b
             where b.location_id = :'loc_2'::uuid and b.origin = 'transfer'
               and b.variant_id = :'var_plain'::uuid) is null);

select chk('3.10 the movements carry the lot''s cost as a SNAPSHOT, not a join — '
           'each leg records what those units cost',
           not exists (select 1 from stock_movement m
                        join stock_batch b on b.id = m.batch_id
                       where m.transfer_group_id = :t_ok::uuid
                         and m.unit_cost_net_per_base
                             is distinct from b.unit_cost_net_per_base));


-- ================================================================= 4 ==========
-- THE UNIT LADDER. ⚠️ THE DEFAULT IS THE **SELL** UNIT, which is
-- `record_waste`'s reading and NOT `record_purchase`'s — the rule 4d-ii settled
-- is the DIRECTION of the document, and a transfer's quantity is measured at the
-- origin, where stock is leaving.
-- =============================================================================

\set t_unit1 '''bbbb0020-0000-0000-0000-000000000011'''
\set t_unit2 '''bbbb0020-0000-0000-0000-000000000012'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- var_kg: base g, purchase kg, sell 100g. 5 kg was delivered = 5000 g.
-- 3 with NO unit means 3 x 100g = 300 g. If this read `purchase_unit_code` it
-- would ship 3000 g — ten times the stock, and it would apply perfectly cleanly.
select record_transfer(:t_unit1::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_kg'::uuid,
           'qty_display', 3))) as r_u1 \gset
commit;

select chk('4.1 with NO unit given, the quantity is read in the variant''s SELL '
           'unit — 3 x 100g = 300 g and NOT 3 kg',
           (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_unit1::uuid and reason = 'transfer_in') = 300,
           format('moved %s g', (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_unit1::uuid and reason = 'transfer_in')));

select chk('4.2 …and the origin gave up exactly that much, in the base unit',
           (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_kg'::uuid and location_id = :'loc_1'::uuid) = 4700);

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_transfer(:t_unit2::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_kg'::uuid,
           'qty_display', 0.5, 'qty_display_unit', 'kg'))) as r_u2 \gset
commit;

select chk('4.3 an EXPLICIT unit overrides the default and converts — 0.5 kg is '
           '500 g',
           (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_unit2::uuid and reason = 'transfer_in') = 500);


-- ================================================================= 5 ==========
-- IDEMPOTENCY WITH NO HEADER TO STORE IT ON (§2.6). The hash is RECOMPUTED from
-- the transfer_out legs — decided in sizing 4e, on the owner's behalf.
-- =============================================================================

\set t_idem '''bbbb0020-0000-0000-0000-000000000021'''
\set t_norm '''bbbb0020-0000-0000-0000-000000000022'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_transfer(:t_idem::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_plain'::uuid, 5)) as r_i1 \gset
select record_transfer(:t_idem::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_plain'::uuid, 5)) as r_i2 \gset
commit;

select chk('5.1 the SAME id with the SAME lines returns already_recorded rather '
           'than shipping twice',
           (:'r_i1'::jsonb->>'already_recorded')::boolean is false
       and (:'r_i2'::jsonb->>'already_recorded')::boolean is true,
           :'r_i2');

select chk('5.2 …and the stock moved ONCE. This is the check that a missing '
           'idempotency guard turns red: the destination would hold 10',
           (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_idem::uuid and reason = 'transfer_in') = 5);

select chk('5.3 the replayed summary describes the SHIPMENT, not the retry — '
           'both stores and the workspace, read back off the ledger',
           (:'r_i2'::jsonb->>'from_location_id')::uuid = :'loc_1'::uuid
       and (:'r_i2'::jsonb->>'to_location_id')::uuid   = :'loc_2'::uuid
       and (:'r_i2'::jsonb->>'workspace_id')::uuid     = :'ws_a'::uuid
       and (:'r_i2'::jsonb->>'line_count')::int        = 1);

-- ⚠️ `recorded_offline` COMES BACK NULL ON A REPLAY, and that is deliberate
-- rather than an oversight: it is a column on the three document headers, and a
-- transfer has no header. Returning `false` would be a claim the ledger cannot
-- support.
select chk('5.4 …and recorded_offline is NULL on the replay, because a transfer '
           'has no header for it to have been stored on',
           (:'r_i2'::jsonb->'recorded_offline') = 'null'::jsonb,
           :'r_i2');

-- 4b-i's rule: the hash is over NORMALISED lines. `5` and `5.00` agree, and so
-- do `500 g` and `0.5 kg`, because both are taken AFTER conversion to the base.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_transfer(:t_norm::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_kg'::uuid,
           'qty_display', 5, 'qty_display_unit', '100g'))) as r_n1 \gset
select record_transfer(:t_norm::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_kg'::uuid,
           'qty_display', 0.5, 'qty_display_unit', 'kg'))) as r_n2 \gset
commit;

select chk('5.5 the same quantity keyed in a DIFFERENT denomination is the same '
           'shipment — 5 x 100g and 0.5 kg both normalise to 500 g',
           (:'r_n2'::jsonb->>'already_recorded')::boolean is true
       and (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_norm::uuid and reason = 'transfer_in') = 500,
           :'r_n2');

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- ⚠️⚠️ 5.6 IS THE CHECK THAT SEPARATES A RECOMPUTED HASH FROM AN ID MATCH. The
-- cheap answer — "any movement with this transfer_group_id means already
-- recorded" — passes 5.1 through 5.5 and FAILS here: it would tell a client that
-- corrected its shipment and re-sent it that the first, wrong version succeeded.
select chk_raises('5.6 the same id with a DIFFERENT quantity raises TD001 — the '
                  'hash is recomputed from the ledger, not matched on the id',
                  public._call(:t_idem::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                               public._tl(:'var_plain'::uuid, 6)), 'TD001');
select chk_raises('5.7 …and so does the same id with a DIFFERENT VARIANT',
                  public._call(:t_idem::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                               public._tl(:'var_late'::uuid, 5)), 'TD001');
select chk_raises('5.8 …and the same id and lines sent BETWEEN THE OTHER TWO '
                  'STORES — a shipment is the pair of stores as well as the '
                  'goods, and returning the first one''s summary would describe '
                  'a van the caller never sent',
                  public._call(:t_idem::uuid, :'loc_2'::uuid, :'loc_1'::uuid,
                               public._tl(:'var_plain'::uuid, 5)), 'TD001');
commit;

select chk('5.9 …and none of those three refusals moved a unit — the id still '
           'names the original five',
           (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_idem::uuid and reason = 'transfer_in') = 5);


-- ================================================================= 6 ==========
-- ⚠️⚠️ THE AVAILABILITY CHECK — BUILT, DORMANT. Owner, 2026-09-04: this function
-- GETS it where `record_waste` does not, because an unbacked transfer does not
-- keep its debt in one store — it invents a lot at the destination.
-- =============================================================================

\set t_open '''bbbb0020-0000-0000-0000-000000000031'''
\set t_enf  '''bbbb0020-0000-0000-0000-000000000032'''
\set t_off  '''bbbb0020-0000-0000-0000-000000000033'''
\set t_enf2 '''bbbb0020-0000-0000-0000-000000000034'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- var_plain has enforce_stock null and the workspace default is false, so this
-- overdraw RECORDS. §1: stock is recorded, not enforced.
select record_transfer(:t_open::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_plain'::uuid, 500)) as r_open \gset
commit;

select chk('6.1 with enforcement OFF — the default everywhere today — a transfer '
           'larger than the origin holds RECORDS, and the debt shows on the '
           'origin shelf as a negative balance (§1)',
           (:'r_open'::jsonb->>'already_recorded')::boolean is false
       and (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_plain'::uuid and location_id = :'loc_1'::uuid) < 0);

select chk('6.2 …and the destination really received all 500, invented lot and '
           'all — which is the harm the owner decided this function may refuse',
           (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_open::uuid and reason = 'transfer_in') = 500);

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- ⚠️⚠️ THE PAIR IS THE ARGUMENT, and it is 0019's section 6 read the other way.
-- var_enf has enforce_stock TRUE and ONE unit on the shelf. A WRITE-OFF of 3
-- records — the loss already happened. A TRANSFER of 3 is refused, because
-- nothing has happened yet and the van would arrive carrying a lot that does
-- not exist.
select chk_raises('6.3 with enforcement ON and the origin short, the shipment is '
                  'refused with TD002 — the sale''s code, not a new one',
                  public._call(:t_enf::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                               public._tl(:'var_enf'::uuid, 3)), 'TD002');
select chk_message('6.4 …and the message names the product, what the origin has '
                   'and what was asked for',
                   public._call(:t_enf::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                                public._tl(:'var_enf'::uuid, 3)),
                   array['Pan exigido', 'available at the origin']);

-- THE OTHER HALF OF THE PAIR: the identical quantity of the identical variant,
-- with enforcement identically ON, recorded as a WRITE-OFF. Nothing but the
-- document kind can explain the difference.
select record_waste('bbbb0020-0000-0000-0000-0000000000ff'::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_enf'::uuid,
           'qty_display', 3, 'unit_price_gross_per_base', 4.00,
           'reason', 'caducado'))) as r_w \gset
commit;

select chk('6.5 THE PAIR: same variant, same store, same quantity, enforcement '
           'identically ON — the TRANSFER was refused and the WRITE-OFF was '
           'recorded. Nothing but the document kind can explain it',
           (select count(*) from stock_movement
             where transfer_group_id = :t_enf::uuid) = 0
       and (select count(*) from waste
             where id = 'bbbb0020-0000-0000-0000-0000000000ff'::uuid) = 1);

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- §2.6's offline paragraph, applied here for the sale's reason: the van has
-- already left, and refusing it on reconnect discards a movement that
-- physically happened. var_enf is now at -2 after the write-off above.
select record_transfer(:t_off::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_enf'::uuid, 3), now() - interval '2 hours', true) as r_off \gset
-- ONLINE, enforcement ON, and the origin has plenty — see 6.7.
select record_transfer(:t_enf2::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_enf2'::uuid, 3)) as r_enf2 \gset
commit;

select chk('6.6 an OFFLINE shipment skips enforcement entirely and records, even '
           'with the origin short and enforce_stock TRUE (§2.6)',
           (:'r_off'::jsonb->>'already_recorded')::boolean is false
       and (:'r_off'::jsonb->>'recorded_offline')::boolean is true
       and (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_off::uuid and reason = 'transfer_in') = 3);

-- ⚠️⚠️ 6.7 IS THE CHECK FALSIFICATION F8 DEMANDED, and it is the only shape that
-- can make it. Every other enforcement check in this section uses a variant that
-- is short at BOTH stores, so pointing the block at the destination instead of
-- the origin refuses the same shipments and turns nothing red — the F3b shape
-- 4d-i recorded: an error that applies clean and enforces against the wrong
-- shelf. var_enf2 has TEN at the origin and NONE at the destination, so the two
-- readings disagree: the origin says ship it, the destination says refuse.
select chk('6.7 …and 6.8 — enforcement ON, TEN at the ORIGIN and NONE at the '
           'destination: the shipment RECORDS. A destination is EXPECTED to be '
           'empty — that is what a transfer is for — and a block reading the '
           'wrong shelf would refuse every first delivery to a new store',
           (:'r_enf2'::jsonb->>'already_recorded')::boolean is false
       and (select coalesce(sum(qty_base), 0) from stock_movement
             where transfer_group_id = :t_enf2::uuid and reason = 'transfer_in') = 3,
           :'r_enf2');

select chk('6.8 …and the destination really did hold NONE of it beforehand, '
           'which is what makes 6.7 discriminate between the two shelves',
           (select count(*) from stock_batch
             where variant_id = :'var_enf2'::uuid and location_id = :'loc_2'::uuid) = 1
       and (select count(*) from stock_movement m
             join stock_batch b on b.id = m.batch_id
            where b.variant_id = :'var_enf2'::uuid
              and b.location_id = :'loc_2'::uuid
              and m.transfer_group_id is distinct from :t_enf2::uuid) = 0);


-- ================================================================= 7 ==========
-- ⚠️⚠️ THE TIMESTAMPS, AND THE ONE THAT IS NOT A REPORT BUCKET. `occurred_at`
-- stamps `received_at` on EVERY destination lot (0010), and `received_at` is
-- FEFO's tiebreak (§2.4). This is the gap 4d-ii found on record_waste and named
-- this file for in advance.
-- =============================================================================

\set t_now  '''bbbb0020-0000-0000-0000-000000000041'''
\set t_back '''bbbb0020-0000-0000-0000-000000000042'''
\set t_far  '''bbbb0020-0000-0000-0000-000000000043'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- ONLINE: the client's timestamp is ignored and the server's moment wins.
select record_transfer(:t_now::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_late'::uuid, 5), now() - interval '30 days', false) as r_now \gset
-- OFFLINE and backdated within the window.
select record_transfer(:t_back::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_late'::uuid, 5), now() - interval '10 hours', true) as r_back \gset
-- OFFLINE and backdated BEYOND it — clamped to 72 hours.
select record_transfer(:t_far::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_late'::uuid, 5), now() - interval '30 days', true) as r_far \gset
commit;

select chk('7.1 ONLINE, the server sets occurred_at and the client''s 30-day-old '
           'timestamp is ignored',
           (:'r_now'::jsonb->>'occurred_at')::timestamptz > now() - interval '5 minutes');

select chk('7.2 OFFLINE and inside the window, the client''s moment is kept',
           (:'r_back'::jsonb->>'occurred_at')::timestamptz
             between now() - interval '11 hours' and now() - interval '9 hours');

select chk('7.2b OFFLINE and beyond it, the moment is CLAMPED to 72 hours — not '
           'refused, and not taken at face value',
           (:'r_far'::jsonb->>'occurred_at')::timestamptz
             between now() - interval '73 hours' and now() - interval '71 hours');

-- ⚠️⚠️ 7.3 IS THE CHECK 4d-ii ASKED FOR BY NAME. `received_at` is not a report
-- column — it is FEFO's tiebreak. A backdated shipment whose destination lot was
-- stamped `now()` would sort BEHIND stock that arrived after the van did, and
-- every later sale at that store would take the wrong lot first.
select chk('7.3 the destination lot''s received_at is the shipment''s '
           'occurred_at, NOT the moment of the write — and received_at is FEFO''s '
           'tiebreak, so this is rotation and not bookkeeping (§2.4)',
           (select b.received_at from stock_batch b
             join stock_movement m on m.batch_id = b.id
            where m.transfer_group_id = :t_far::uuid and m.reason = 'transfer_in')
             between now() - interval '73 hours' and now() - interval '71 hours',
           format('received_at=%s', (select b.received_at from stock_batch b
             join stock_movement m on m.batch_id = b.id
            where m.transfer_group_id = :t_far::uuid and m.reason = 'transfer_in')));

select chk('7.4 …and the backdated lot therefore sorts AHEAD of the one shipped '
           'ten hours ago, in the destination''s FEFO order',
           (select b.received_at from stock_batch b join stock_movement m
              on m.batch_id = b.id where m.transfer_group_id = :t_far::uuid
             and m.reason = 'transfer_in')
         < (select b.received_at from stock_batch b join stock_movement m
              on m.batch_id = b.id where m.transfer_group_id = :t_back::uuid
             and m.reason = 'transfer_in'));

select chk('7.5 recorded_at is never backdated on any leg — it is left to its '
           'now() default, and it is the column an offline write must not move',
           not exists (select 1 from stock_movement
                        where transfer_group_id in (:t_back::uuid, :t_far::uuid)
                          and recorded_at < now() - interval '5 minutes'));

select chk('7.6 both legs of one shipment carry the SAME occurred_at — one van, '
           'one moment, two stores',
           (select count(distinct occurred_at) from stock_movement
             where transfer_group_id = :t_far::uuid) = 1);


-- ================================================================= 8 ==========
-- ONE DESTINATION LOT PER **ORIGIN** LOT (§2.4). A shipment satisfied from three
-- lots has three costs and three expiry dates, and one merged batch at the
-- destination would lose both.
-- =============================================================================

\set t_span '''bbbb0020-0000-0000-0000-000000000051'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- var_two has TWO lots of 10, at different costs AND different expiry dates.
-- Fifteen spans both.
select record_transfer(:t_span::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
         public._tl(:'var_two'::uuid, 15)) as r_span \gset
commit;

select chk('8.1 ONE line spanning TWO origin lots opens TWO lots at the '
           'destination, not one merged batch (§2.4)',
           (:'r_span'::jsonb->>'lot_count')::int = 2
       and (select count(*) from stock_batch
             where location_id = :'loc_2'::uuid and variant_id = :'var_two'::uuid) = 2,
           :'r_span');

select chk('8.2 …and the two destination lots carry the two DIFFERENT costs '
           'forward — a merged batch would have averaged them into a number '
           'neither lot ever had',
           (select count(distinct unit_cost_net_per_base) from stock_batch
             where location_id = :'loc_2'::uuid and variant_id = :'var_two'::uuid) = 2);

select chk('8.3 …and the two DIFFERENT expiry dates, which is what keeps store '
           'B''s rotation meaningful',
           (select count(distinct expiry_date) from stock_batch
             where location_id = :'loc_2'::uuid and variant_id = :'var_two'::uuid) = 2);

select chk('8.4 FEFO took the SOONER-EXPIRING lot in full first — 10 from the '
           'five-day lot and 5 from the thirty-day one',
           (select coalesce(sum(-m.qty_base), 0) from stock_movement m
             join stock_batch b on b.id = m.batch_id
            where m.transfer_group_id = :t_span::uuid and m.reason = 'transfer_out'
              and b.expiry_date = current_date + 5) = 10
       and (select coalesce(sum(-m.qty_base), 0) from stock_movement m
             join stock_batch b on b.id = m.batch_id
            where m.transfer_group_id = :t_span::uuid and m.reason = 'transfer_out'
              and b.expiry_date = current_date + 30) = 5);

select chk('8.5 each destination lot points back at the ORIGIN lot it was cut '
           'from, and at a different one',
           (select count(distinct source_batch_id) from stock_batch
             where location_id = :'loc_2'::uuid and variant_id = :'var_two'::uuid) = 2);

select chk('8.6 the lot_count in the summary is LOTS and not lines — one line, '
           'two lots',
           (:'r_span'::jsonb->>'line_count')::int = 1
       and (:'r_span'::jsonb->>'lot_count')::int = 2);


-- ================================================================= 9 ==========
-- THE FILE'S OWN ANTI-VACUITY GUARD.
-- =============================================================================

select chk('9.1 the file really recorded the TWELVE shipments it then made '
           'claims about',
           (select count(distinct transfer_group_id) from stock_movement
             where transfer_group_id is not null) = 12,
           format('groups=%s', (select count(distinct transfer_group_id)
             from stock_movement where transfer_group_id is not null)));

select chk('9.2 not one of the nineteen refused ids reached the ledger',
           (select count(*) from stock_movement where transfer_group_id in (
              :t_nullfrom::uuid, :t_nullto::uuid, :t_otherto::uuid,
              :t_otherfr::uuid, :t_unassn::uuid, :t_unassn2::uuid,
              :t_crossws::uuid, :t_same::uuid,
              :t_bad1::uuid, :t_bad2::uuid, :t_bad3::uuid, :t_bad4::uuid,
              :t_bad5::uuid, :t_bad6::uuid, :t_bad7::uuid, :t_bad8::uuid,
              :t_bad9::uuid, :t_bad10::uuid, :t_bad11::uuid)) = 0);

select chk('9.3 EVERY transfer leg in the database is paired, out for in, under '
           'its own group — the §2.4 invariant over the whole file',
           not exists (
             select 1 from stock_movement
              where transfer_group_id is not null
              group by transfer_group_id, variant_id
             having count(*) filter (where reason = 'transfer_out')
                  <> count(*) filter (where reason = 'transfer_in')));

select chk('9.4 …and every group nets to zero',
           not exists (select 1 from stock_movement
                        where transfer_group_id is not null
                        group by transfer_group_id
                       having sum(qty_base) <> 0));

select chk('9.5 the §2.4 balance invariant holds over everything this file '
           'wrote, including the deliberate overdraw in section 6',
           (select count(*) from batch_balance_violations()) = 0,
           format('violations=%s', (select count(*) from batch_balance_violations())));

select chk('9.6 …and 0015 does too — no purchase lot was opened without its '
           'receipt, and transfer lots are outside the rule',
           (select count(*) from receipt_completeness_violations()) = 0);

-- ⚠️⚠️ THE COUNT ITSELF — 4d-i's finding, now standard. A verdict recorded inside
-- a transaction that ends in `rollback` VANISHES rather than failing, and a
-- report cannot miss a row that was never inserted. The literal below is
-- deliberately a literal: a count derived from the file would agree with the
-- file whatever the file did.
select chk('9.7 ALL 76 CHECKS IN THIS FILE ACTUALLY RAN — a verdict rolled back '
           'with its transaction leaves no trace at all',
           (select count(*) from public._verify) = 75,
           format('recorded=%s of 75 before this one', (select count(*) from public._verify)));

drop function public._call(uuid, uuid, uuid, jsonb, timestamptz, boolean);
drop function public._tl(uuid, numeric, text);
drop function public.chk_message(text, text, text[]);


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  -- `is not true`, NOT `not passed` — a NULL condition prints FAIL and is
  -- invisible to `not passed`. Found in 4b-i.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
