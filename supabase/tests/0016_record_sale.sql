-- ============================================================================
-- Behavioural verification for 0016 — record_sale()
-- ============================================================================
-- ADR-035 §9: a file is not evidence, a green CI run is. `supabase db reset`
-- proves only that this migration's plpgsql parses, and a `security definer`
-- function that parses is a function with RLS switched off and nothing yet
-- asked of it.
--
-- Run it against a DATABASE THAT WAS JUST RESET — it writes documents and
-- cannot clean up after itself, because `sale` is append-only.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0016_record_sale.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED, AND WHY IT IS THESE THREE THINGS
-- ----------------------------------------------------------------------------
-- Most of what `record_sale` must not do, the schema already refuses: the
-- composite FKs of 0003 refuse another tenant's variant, `stock_movement_sign_
-- follows_reason` refuses a positive sale movement, and 0015 refuses a lot with
-- no receipt. Those are asserted where they live and are not re-asserted here.
--
-- THREE RULES HAVE NO SCHEMA BEHIND THEM AND ARE THE FUNCTION'S ALONE. They are
-- the subject of this file (docs/PLAN.md task 4b-i):
--
--   1. THE LOCATION WALL — §2.6's "single most important line in record_sale",
--      and §2.10's location-isolation row, WRITE half. ⚠️ Nothing in the schema
--      catches its absence: a 0016 with the check deleted applies clean and
--      passes 01–07, INCLUDING 05, which asserts the location wall on reads.
--      Section 1 below is the whole of the evidence, and check 1.7 is the one
--      that makes it evidence about the FUNCTION rather than about RLS.
--   2. IDEMPOTENCY — §2.6's four rows over a client-generated primary key.
--      ⚠️ Row 3, the call still in flight, CANNOT BE MADE FROM ONE CONNECTION
--      and is not attempted here; it is supabase/vitest/test/idempotency.test.ts
--      (plan task 3.7a), which names the blocking pid. Said again at check 2.9
--      so this file's green does not read as the whole table.
--   3. THE TIMESTAMPS — `occurred_at` is what daily totals and the 15-minute
--      void window read (§2.6).
--
-- Section 4 is one sale end to end, single lot and single rate, which is the
-- floor everything above stands on.
--
-- SECTION 6 IS TASK 4b-ii, AND IT SHIPS NO MIGRATION. `record_sale` was whole
-- when 0016 merged; 4b-ii is the evidence for the paths 4b-i's fixture does not
-- walk — a line spanning several lots, both shortfall branches that leave the
-- adjustment lot alone, mixed rates in one document, a weighed decimal
-- quantity, and the residual identity asserted over every line in the database
-- rather than over one hand-checked sale. The seam is test breadth, and the
-- reasoning for refusing the tidier one is in docs/PLAN.md under *Settled in
-- sizing 4b*.
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

-- A CALL, AS A STRING, because `chk_raises` runs dynamic SQL. Building the text
-- by hand at twenty call sites is how one of them ends up asserting a different
-- thing from the other nineteen.
--
-- ⚠️ `create or replace`, AND DROPPED AT THE END. `_cleanup.sql` sweeps
-- `_`-prefixed TABLES and the two helpers above BY NAME — it has no convention
-- that reaches a function a suite invents, which its own comment calls the known
-- gap. So this file both replaces it on the way in (a suite that died mid-run
-- must be re-runnable) and removes it on the way out.
create or replace function public._call(p_id uuid, p_loc uuid, p_lines jsonb,
                             p_at timestamptz default null,
                             p_off boolean default false)
returns text language sql as $$
  select format('select public.record_sale(%L::uuid, %L::uuid, %L::jsonb, '
                '%L::timestamptz, %L::boolean)',
                p_id, p_loc, p_lines, p_at, p_off)
$$;
grant execute on function public._call(uuid, uuid, jsonb, timestamptz, boolean)
  to authenticated;


-- ---------------------------------------------------------------- fixture ----
-- ONE WORKSPACE WITH THREE STORES AND A SECOND WORKSPACE BESIDE IT, because the
-- wall this file is about is the STORE wall and it is only visible with both
-- walls held apart (the argument 3.3 settled). Store 3 is CLOSED — 3.3's other
-- finding: `my_locations()` excludes inactive locations and the workspace
-- predicate beside it does not, so `is_active` is the one lever the location
-- clause answers to.

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'cashier.a1@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'manager.a@example.mx'),
  ('44444444-4444-4444-4444-444444444444', 'owner.b@example.mx');

\set owner_a   '''11111111-1111-1111-1111-111111111111'''
\set cashier_a '''22222222-2222-2222-2222-222222222222'''
\set manager_a '''33333333-3333-3333-3333-333333333333'''
\set owner_b   '''44444444-4444-4444-4444-444444444444'''

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select onboard_workspace('Tienda A') as ws_a \gset
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', false);
select onboard_workspace('Tienda B') as ws_b \gset
select set_config('request.jwt.claims', null, false);

insert into location (workspace_id, name) values
  (:'ws_a', 'Sucursal Norte'),
  (:'ws_a', 'Sucursal Cerrada');

select id as loc_1 from location where workspace_id = :'ws_a' and name = 'Tienda A' \gset
select id as loc_2 from location where workspace_id = :'ws_a' and name = 'Sucursal Norte' \gset
select id as loc_3 from location where workspace_id = :'ws_a' and name = 'Sucursal Cerrada' \gset
select id as loc_b from location where workspace_id = :'ws_b' \gset

-- Closed AFTER the id is read, because `my_locations()` will not return it once
-- it is shut and the fixture still needs to name it.
update location set is_active = false where id = :'loc_3';

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :cashier_a, 'staff'),
  (:'ws_a', :manager_a, 'manager');

-- The cashier is assigned to store 1 and to nothing else. The manager gets no
-- member_location row at all — §2.7: managers hold every ACTIVE location in
-- their workspaces, staff hold explicit rows only.
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name) values
  (:'ws_a', 'Jitomate'), (:'ws_a', 'Refresco'), (:'ws_b', 'Ajeno');
select id as fam_mass  from product_family where workspace_id = :'ws_a' and name = 'Jitomate' \gset
select id as fam_count from product_family where workspace_id = :'ws_a' and name = 'Refresco' \gset
select id as fam_b     from product_family where workspace_id = :'ws_b' \gset

-- A WEIGHED variant at 16% and a COUNTED variant at 0%. Most unprocessed food in
-- Mexico is zero-rated and general goods sit at 16% (§2.5), so one of each is
-- the smallest fixture that is not a special case.
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam_mass',  'Jitomate a granel', 'g',   'kg',  'kg',  'kg',  0.16),
  (:'ws_a', :'fam_count', 'Refresco 600ml',    'pza', 'pza', 'pza', 'pza', 0.00),
  -- Never stocked anywhere, which is the only way to reach `allocate_fefo()`'s
  -- THIRD shortfall branch: with an open lot present it overdraws that lot
  -- instead of opening one, and with a closed lot present it blames the most
  -- recent. Only "this store has never held this product" opens a new lot, and
  -- check 3.7 is about the date that lot is received at.
  (:'ws_a', :'fam_mass',  'Jitomate cherry',   'g',   'kg',  'kg',  'kg',  0.16),
  (:'ws_b', :'fam_b',     'Producto ajeno',    'g',   'kg',  'kg',  'kg',  0.16);
select id as var_mass  from product_variant
 where workspace_id = :'ws_a' and name = 'Jitomate a granel' \gset
select id as var_new   from product_variant
 where workspace_id = :'ws_a' and name = 'Jitomate cherry' \gset
select id as var_count from product_variant
 where workspace_id = :'ws_a' and name = 'Refresco 600ml' \gset
select id as var_b     from product_variant where workspace_id = :'ws_b' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

-- ⚠️ THE DELIVERY IS ONE TRANSACTION — the rule 4a settled and the general form
-- it is binding on everything after it: a `purchase` lot and the movement that
-- fills it are written together or 0015 refuses the commit. `record_purchase`
-- (0018) will write exactly this shape.
-- ⚠️ ONE DELIVERY PER STORE, NOT ONE FOR BOTH. `purchase_line_header_fk` is
-- scoped `(purchase_id, workspace_id, location_id)`, so a line cannot sit at a
-- store its header does not — which is the location wall expressed as a foreign
-- key, and a reminder that `record_purchase` (0018) receives ONE location too.
\set pur_1 '''aaaa0016-0000-0000-0000-000000000001'''
\set pur_2 '''aaaa0016-0000-0000-0000-000000000002'''
begin;
insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash) values
  (:pur_1, :'ws_a', :'loc_1', :'prov_a', now() - interval '10 days',
   130.00, 8.00, :owner_a, 'hash-0016-pur-1'),
  (:pur_2, :'ws_a', :'loc_2', :'prov_a', now() - interval '10 days',
   33.00, 5.28, :owner_a, 'hash-0016-pur-2');

insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id,
       qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
       line_net, tax_amount, tax_rate) values
  ('bbbb0016-0000-0000-0000-000000000001', :'ws_a', :'loc_1', :pur_1, :'var_mass',
   5000, 5, 'kg', 0.010000, 50.00, 8.00, 0.16),
  ('bbbb0016-0000-0000-0000-000000000002', :'ws_a', :'loc_1', :pur_1, :'var_count',
   20, 20, 'pza', 4.000000, 80.00, 0.00, 0.00),
  ('bbbb0016-0000-0000-0000-000000000003', :'ws_a', :'loc_2', :pur_2, :'var_mass',
   3000, 3, 'kg', 0.011000, 33.00, 5.28, 0.16);

insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, received_at, created_by) values
  ('dddd0016-0000-0000-0000-000000000001', :'ws_a', :'loc_1', :'var_mass', 'purchase',
   :'prov_a', 'bbbb0016-0000-0000-0000-000000000001', 5000, 0.010000,
   now() - interval '10 days', :owner_a),
  ('dddd0016-0000-0000-0000-000000000002', :'ws_a', :'loc_1', :'var_count', 'purchase',
   :'prov_a', 'bbbb0016-0000-0000-0000-000000000002', 20, 4.000000,
   now() - interval '10 days', :owner_a),
  ('dddd0016-0000-0000-0000-000000000003', :'ws_a', :'loc_2', :'var_mass', 'purchase',
   :'prov_a', 'bbbb0016-0000-0000-0000-000000000003', 3000, 0.011000,
   now() - interval '10 days', :owner_a);

insert into stock_movement (workspace_id, location_id, batch_id, variant_id, reason,
       qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by) values
  (:'ws_a', :'loc_1', 'dddd0016-0000-0000-0000-000000000001', :'var_mass',  'purchase',
   5000, 0.010000, :pur_1, now() - interval '10 days', :owner_a),
  (:'ws_a', :'loc_1', 'dddd0016-0000-0000-0000-000000000002', :'var_count', 'purchase',
   20, 4.000000, :pur_1, now() - interval '10 days', :owner_a),
  (:'ws_a', :'loc_2', 'dddd0016-0000-0000-0000-000000000003', :'var_mass',  'purchase',
   3000, 0.011000, :pur_2, now() - interval '10 days', :owner_a);
commit;

\set b_mass_1  '''dddd0016-0000-0000-0000-000000000001'''
\set b_count_1 '''dddd0016-0000-0000-0000-000000000002'''
\set b_mass_2  '''dddd0016-0000-0000-0000-000000000003'''

-- 0.750 kg of the weighed variant at 28.00/kg — 0.028 per base gram. The
-- arithmetic §2.5 requires of it: gross round(0.028 × 750) = 21.00, net
-- round(21.00 / 1.16) = 18.10, tax 21.00 − 18.10 = 2.90.
select jsonb_build_array(jsonb_build_object(
         'variant_id', :'var_mass', 'qty_display', 0.750,
         'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.028)) as line_mass \gset

-- Two pieces of the zero-rated variant at 15.50 each: gross 31.00, net 31.00,
-- tax 0.00 — the rate-0 branch, where §2.5 says there is no rounding at all.
select jsonb_build_array(jsonb_build_object(
         'variant_id', :'var_count', 'qty_display', 2,
         'unit_price_gross_per_base', 15.50)) as line_count \gset

\set sale_ok   '''99990016-0000-0000-0000-000000000001'''
\set sale_idem '''99990016-0000-0000-0000-000000000002'''
\set sale_conf '''99990016-0000-0000-0000-000000000003'''
\set sale_t1   '''99990016-0000-0000-0000-00000000000a'''
\set sale_t2   '''99990016-0000-0000-0000-00000000000b'''
\set sale_t3   '''99990016-0000-0000-0000-00000000000c'''
\set sale_t4   '''99990016-0000-0000-0000-00000000000d'''
\set sale_t5   '''99990016-0000-0000-0000-00000000000e'''
\set sale_mgr  '''99990016-0000-0000-0000-000000000010'''
\set sale_cnt  '''99990016-0000-0000-0000-000000000011'''


-- ============================================================ 1. the wall ====
-- §2.6: "Every RPC validates its location as its FIRST statement." These
-- functions are `security definer`, "which means they are on the far side of the
-- wall principle 5 describes: RLS will not catch a bad location_id here, because
-- RLS is not running."

-- 1.1 — the positive case, and it is a CASHIER. The wall asks which stores you
-- may act in, never what role you hold: shift cover is a reassignment (owner,
-- 2026-08-24), so there is no manager bypass to test and no staff refusal here.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select record_sale(:sale_ok::uuid, :'loc_1'::uuid, :'line_mass'::jsonb) as r_ok \gset
select chk('1.1 a cashier records a sale at the store they are assigned to',
           (:'r_ok'::jsonb ->> 'already_recorded')::boolean = false
       and (:'r_ok'::jsonb ->> 'sale_id')::uuid = :sale_ok::uuid);
commit;

-- 1.2 — ⚠️ §2.10's LOCATION-ISOLATION ROW, WRITE HALF. Step 3 could not write
-- this one: 3.3 measured the wall on reads and recorded that "the ledger has no
-- write surface yet". It has one now, and this is the sentence.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('1.2 §2.10 — a cashier''s sale at an UNASSIGNED store is refused',
  _call(:sale_t1::uuid, :'loc_2'::uuid, :'line_mass'::jsonb), '42501');

select chk_raises('1.3 a store in ANOTHER WORKSPACE is refused by the same line',
  _call(:sale_t1::uuid, :'loc_b'::uuid, :'line_mass'::jsonb), '42501');

select chk_raises('1.4 a CLOSED store is refused — is_active is the lever (3.3)',
  _call(:sale_t1::uuid, :'loc_3'::uuid, :'line_mass'::jsonb), '42501');

select chk_raises('1.5 a null location is refused, and by the wall not by a FK',
  _call(:sale_t1::uuid, null, :'line_mass'::jsonb), '42501');

select chk_raises('1.6 a location id that exists nowhere is refused',
  _call(:sale_t1::uuid, '00000000-0000-0000-0000-0000000000ff'::uuid,
        :'line_mass'::jsonb), '42501');

commit;

-- Read AFTER the role block, not inside it. A cashier cannot see a `sale` row at
-- a store they do not hold, so this check run as the cashier would be green
-- whether the write had been refused or committed — the same shape F10 found in
-- check 3.6, and here it would have been invisible because the answer is the
-- same either way.
select chk('1.2–1.6 and NOT ONE OF THEM WROTE A DOCUMENT',
           not exists (select 1 from sale where id = :sale_t1::uuid));

-- ⚠️ 1.7 IS THE CHECK THAT MAKES 1.2–1.6 EVIDENCE ABOUT THIS FUNCTION.
-- Everything above is also true of a schema where RLS did the refusing and the
-- RPC contained no check at all. Here the caller is the SUPERUSER — RLS is
-- bypassed entirely, every policy is inert — while `auth.uid()` still names the
-- cashier. A refusal that survives that is the function's own, and it is the
-- only shape of evidence that separates the two.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

-- ⚠️ `rolbypassrls`, NOT `rolsuper`. Supabase's `postgres` role is not a
-- superuser — `rolsuper` is false on it — and a first draft of this check
-- asserted the wrong column and went red on a database where the claim was
-- perfectly true. Bypassing RLS is what this check is actually about, and it is
-- its own attribute.
select chk('1.7 the caller really does bypass RLS, so no policy is running',
           (select rolbypassrls from pg_roles where rolname = current_user),
           format('current_user=%s', current_user));

select chk_raises('1.7 …and the unassigned store is STILL refused — the wall is the RPC''s',
  _call(:sale_t1::uuid, :'loc_2'::uuid, :'line_mass'::jsonb), '42501');
commit;

-- 1.8 — a MANAGER holds every active location without a member_location row, so
-- store 2 is theirs. Same wall, opposite answer, which is what stops 1.2 reading
-- as "writes are refused" rather than "this store is not yours".
begin;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;

select record_sale(:sale_mgr::uuid, :'loc_2'::uuid, :'line_mass'::jsonb) as r_mgr \gset
select chk('1.8 a manager sells at a store they hold by role, not by assignment',
           (:'r_mgr'::jsonb ->> 'location_id')::uuid = :'loc_2'::uuid);
commit;

-- 1.9 — the function is the ONLY route. 0003 revoked every table privilege on
-- `sale` from `authenticated`, which is what makes "clients never insert" (§2.6)
-- a fact about the database rather than a convention about the client.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('1.9 a client cannot insert into sale around the RPC',
  format('insert into public.sale (id, workspace_id, location_id, occurred_at, '
         'total_net, total_tax, created_by, payload_hash) values '
         '(%L, %L, %L, now(), 1.00, 0.00, %L, %L)',
         '99990016-0000-0000-0000-0000000000ff', :'ws_a', :'loc_1',
         :cashier_a, 'direct'), '42501');
commit;

-- 1.10 — `anon` cannot call it AT ALL, which is a different claim from the wall
-- refusing it. `my_locations()` is empty without a uid, so an anon caller would
-- be refused by the wall anyway — and that would leave the GRANT untested, with
-- the two indistinguishable from the outside. The privilege is therefore read
-- from the catalog, where it is the whole of the fact.
select chk('1.10 anon holds no execute privilege on record_sale',
           not has_function_privilege('anon',
             'public.record_sale(uuid,uuid,jsonb,timestamptz,boolean)', 'execute'));

select chk('1.10 …and authenticated does, which is what makes the line above a claim',
           has_function_privilege('authenticated',
             'public.record_sale(uuid,uuid,jsonb,timestamptz,boolean)', 'execute'));


-- ===================================================== 2. idempotency =======
-- §2.6, settled 2026-08-14: "Every record_* function inserts its header with
-- `on conflict (id) do nothing`, then checks whether the insert happened."

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

-- 2.1 — row 2 of §2.6's table: same id, same payload. "Return the existing
-- document's summary with already_recorded: true. A SUCCESS, NOT AN ERROR."
select record_sale(:sale_ok::uuid, :'loc_1'::uuid, :'line_mass'::jsonb) as r_again \gset
select chk('2.1 the same id with the same payload returns already_recorded',
           (:'r_again'::jsonb ->> 'already_recorded')::boolean = true);

select chk('2.1 …and the summary it returns is the ORIGINAL document''s',
           (:'r_again'::jsonb ->> 'total_net')::numeric = 18.10
       and (:'r_again'::jsonb ->> 'total_tax')::numeric = 2.90
       and (:'r_again'::jsonb ->> 'line_count')::integer = 1);

commit;

-- 2.2 — the retry is what a dropped connection produces, so the thing that
-- matters is that it moved NOTHING. One line, one movement, one balance.
--
-- ⚠️ COUNTED FROM OUTSIDE THE CASHIER'S ROLE, AND THAT IS NOT AN ACCIDENT OF
-- CONVENIENCE. `stock_movement_select` (0004) is gated on
-- `has_role(workspace_id, 'manager')`, so A CASHIER CANNOT READ THE MOVEMENTS
-- THEY THEMSELVES JUST WROTE — §2.3's "a sale carries price, not cost", holding
-- exactly as designed. A first draft asserted this inside `set local role
-- authenticated` and read zero movements for a sale that had written one.
-- `batch_balance` has no role gate, which is why the shelf check below could
-- have stayed either side.
select chk('2.2 the retry wrote no second line and no second movement',
           (select count(*) from sale_line where sale_id = :sale_ok::uuid) = 1
       and (select count(*) from stock_movement where sale_id = :sale_ok::uuid) = 1,
           format('lines=%s movements=%s',
                  (select count(*) from sale_line where sale_id = :sale_ok::uuid),
                  (select count(*) from stock_movement where sale_id = :sale_ok::uuid)));

select chk('2.2 …and the shelf moved once, not twice',
           (select remaining_base from batch_balance where batch_id = :b_mass_1) = 4250,
           format('remaining=%s',
                  (select remaining_base from batch_balance where batch_id = :b_mass_1)));

-- 2.3 — NORMALISED, which is the word §2.6 uses. `2` and `2.00` are the same
-- quantity, and a hash that disagreed would dead-letter a perfectly good retry
-- from a client that formats its json differently.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select record_sale(:sale_ok::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_mass', 'qty_display', 0.7500,
           'qty_display_unit', 'kg',
           'unit_price_gross_per_base', 0.0280))) as r_fmt \gset
select chk('2.3 the hash is over CANONICAL numbers — 0.7500 is 0.750',
           (:'r_fmt'::jsonb ->> 'already_recorded')::boolean = true);

-- 2.4 — and over the SELL UNIT the caller happened to use. 750 g and 0.750 kg
-- are one quantity in the ledger, because the hash is taken after conversion.
select record_sale(:sale_ok::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_mass', 'qty_display', 750,
           'qty_display_unit', 'g',
           'unit_price_gross_per_base', 0.028))) as r_unit \gset
select chk('2.4 …and after unit conversion — 750 g is the same line as 0.750 kg',
           (:'r_unit'::jsonb ->> 'already_recorded')::boolean = true);
commit;

-- 2.5 to 2.8 — row 4 of §2.6's table, the loud one: "same id, DIFFERENT lines →
-- raise, and dead-letter it". `TD001` is this schema's code for it, introduced
-- by 0016 and documented there.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('2.5 the same id with a different QUANTITY raises TD001',
  _call(:sale_ok::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', 0.500,
          'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.028))), 'TD001');

select chk_raises('2.6 the same id with a different PRICE raises TD001',
  _call(:sale_ok::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', 0.750,
          'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.030))), 'TD001');

select chk_raises('2.7 the same id with an EXTRA LINE raises TD001',
  _call(:sale_ok::uuid, :'loc_1'::uuid,
        (:'line_mass'::jsonb || :'line_count'::jsonb)), 'TD001');

commit;

-- 2.8 — the same id and the same lines at a DIFFERENT store. `sale.id` is a
-- GLOBAL primary key, so without the location comparison in 0016 the caller
-- would be told the sale was "already recorded" — and handed a summary
-- describing a document at a store they did not name. Asserted from the
-- MANAGER, because they are the only actor in this fixture who holds both
-- stores and can therefore get past the wall to reach the comparison at all.
begin;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('2.8 the same id and lines at a DIFFERENT store raises TD001',
  _call(:sale_ok::uuid, :'loc_2'::uuid, :'line_mass'::jsonb), 'TD001');
commit;

-- 2.9 — the refusals are transactional: a TD001 leaves the committed sale
-- exactly as it was. ⚠️ AND THE ROW §2.6 HAS THAT THIS FILE CANNOT MAKE: "first
-- attempt still in flight → the second call blocks on the row lock". A single
-- session cannot block on its own lock, so that row is
-- supabase/vitest/test/allocation-race.test.ts's neighbour,
-- supabase/vitest/test/idempotency.test.ts (task 3.7a), which names the
-- blocking pid on all three document tables. Not attempted here, and said out
-- loud so this file's green does not read as the whole table.
select chk('2.9 four TD001 refusals left the original sale untouched',
           (select count(*) from sale_line where sale_id = :sale_ok::uuid) = 1
       and (select total_net from sale where id = :sale_ok::uuid) = 18.10
       and (select remaining_base from batch_balance where batch_id = :b_mass_1) = 4250);


-- ====================================================== 3. the timestamps ===
-- §2.6, settled 2026-08-14. Two columns, because "when did it happen" and "when
-- did we find out" are different questions.

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

-- 3.1 — ONLINE, and the client sent a time. The server OVERRIDES it: "a till's
-- clock is not worth trusting online and the difference is seconds." A year is
-- not seconds, and it is the shape a device with a dead battery produces.
select record_sale(:sale_t2::uuid, :'loc_1'::uuid, :'line_count'::jsonb,
                   now() - interval '365 days', false) as r_on \gset
select chk('3.1 online: a client occurred_at is OVERRIDDEN with now()',
           (select abs(extract(epoch from (occurred_at - now()))) < 120
              from sale where id = :sale_t2::uuid),
           format('occurred_at=%s', (select occurred_at from sale where id = :sale_t2::uuid)));

-- 3.2 — OFFLINE, inside the window. The client value is ACCEPTED, exactly: this
-- is the whole reason the flag exists, and a clamp that rounded it would lose
-- the day boundary daily totals are grouped on.
select record_sale(:sale_t3::uuid, :'loc_1'::uuid, :'line_count'::jsonb,
                   now() - interval '2 hours', true) as r_off \gset
select chk('3.2 offline: a client occurred_at INSIDE the window is kept exactly',
           (select abs(extract(epoch from
                     (occurred_at - (now() - interval '2 hours')))) < 2
              from sale where id = :sale_t3::uuid),
           format('occurred_at=%s', (select occurred_at from sale where id = :sale_t3::uuid)));

-- 3.3 — OFFLINE, too old. Clamped to now() − 72h. §2.6: "This rejects nothing
-- and stops a wrong device clock filing a sale in 1970." REJECTS NOTHING is the
-- load-bearing half: the sale already happened, the cash is in the drawer, and
-- refusing it would be the §2.6 failure-path harm arriving through the front
-- door.
select record_sale(:sale_t4::uuid, :'loc_1'::uuid, :'line_count'::jsonb,
                   now() - interval '30 days', true) as r_old \gset
select chk('3.3 offline: a value older than 72h is CLAMPED, and the sale is kept',
           (select abs(extract(epoch from
                     (occurred_at - (now() - interval '72 hours')))) < 120
              from sale where id = :sale_t4::uuid),
           format('occurred_at=%s', (select occurred_at from sale where id = :sale_t4::uuid)));

-- 3.4 — OFFLINE, in the future. The other end of the same clamp, and the end a
-- one-sided implementation forgets: a till whose clock runs fast would otherwise
-- file today's takings into next week, where Números would not find them.
select record_sale(:sale_t5::uuid, :'loc_1'::uuid, :'line_count'::jsonb,
                   now() + interval '10 days', true) as r_fut \gset
select chk('3.4 offline: a FUTURE value is clamped to now()',
           (select abs(extract(epoch from (occurred_at - now()))) < 120
              from sale where id = :sale_t5::uuid),
           format('occurred_at=%s', (select occurred_at from sale where id = :sale_t5::uuid)));

-- 3.5 — `recorded_at` is the audit column and it is never the client's. All
-- four sales above were recorded now, whatever they claim to have happened.
select chk('3.5 recorded_at is server now() on every one of them, backdated or not',
           (select count(*) from sale
             where id in (:sale_t2::uuid, :sale_t3::uuid, :sale_t4::uuid, :sale_t5::uuid)
               and abs(extract(epoch from (recorded_at - now()))) < 120) = 4);

select chk('3.5 …and the backdated one really is backdated — the two columns differ',
           (select recorded_at - occurred_at > interval '71 hours'
              from sale where id = :sale_t4::uuid));

commit;

-- 3.6 — the movements carry the DOCUMENT's occurred_at, not their own now().
-- §2.4 costs a sale against the lots it took, and §2.9 groups by day; a movement
-- dated three days after the sale that caused it would put the two in different
-- reports.
--
-- ⚠️⚠️ OUTSIDE THE ROLE BLOCK, AND FALSIFICATION F10 IS WHY. Written inside it,
-- this check was VACUOUSLY GREEN: `stock_movement_select` is gated on manager,
-- the cashier's join returned no rows, and `not exists` over nothing is true.
-- F10 stamped every movement with `now()` and the suite stayed green. A NEGATIVE
-- EXISTENCE CHECK UNDER A RESTRICTED ROLE IS A CLAIM ABOUT VISIBILITY, NOT ABOUT
-- WRITES — the general form, and it is why the check below counts its subjects
-- before asserting the absence.
select chk('3.6 there ARE movements to make this claim about',
           (select count(*) from stock_movement where reason = 'sale') > 0,
           format('sale movements=%s',
                  (select count(*) from stock_movement where reason = 'sale')));

select chk('3.6 …and every one of them carries the header''s occurred_at',
           not exists (
             select 1 from stock_movement m join sale s on s.id = m.sale_id
              where m.occurred_at <> s.occurred_at));

-- 3.7 — ⚠️ THE ONE PIECE OF ALLOCATOR BEHAVIOUR THIS TASK ASSERTS RATHER THAN
-- LEAVING TO 4b-ii, because it is a TIMESTAMP rule and timestamps are 4b-i's.
-- `allocate_fefo()` takes `p_occurred_at` and stamps a shortfall lot with it
-- rather than `now()` (0010, found by the 1.6b seed): received_at is the SECOND
-- FEFO KEY, so a lot received "today" for a sale that happened three days ago
-- reorders every lot around it. This is the only path in the RPC that can get
-- that wrong, and the offline clamp is what makes the two times differ.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

-- `var_new` has never been stocked at this store, which is what forces
-- `allocate_fefo()` down the branch that OPENS a lot rather than overdrawing an
-- existing one.
select record_sale('99990016-0000-0000-0000-000000000012'::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_new', 'qty_display', 1, 'qty_display_unit', 'kg',
           'unit_price_gross_per_base', 0.028)),
         now() - interval '30 days', true) as r_short \gset

commit;

-- ⚠️ READ FROM OUTSIDE THE CASHIER'S ROLE, for the same reason check 2.2 is —
-- `stock_batch_select` is gated on `has_role(…, 'manager')` too. A cashier can
-- OPEN a lot through the allocator and cannot then see it, which is the second
-- place in this file where the ledger is writable by someone who cannot read it.
--
-- The two timestamps on the lot are the whole of the claim: `received_at` is
-- the sale's clamped moment (72 hours ago) and `created_at` is now. A lot
-- stamped with `now()` would agree with the second and not the first.
select chk('3.7 a shortfall lot is received at the CLAMPED occurred_at, not now()',
           (select abs(extract(epoch from
                     (sb.received_at - (now() - interval '72 hours')))) < 120
              from stock_batch sb
             where sb.origin = 'adjustment' and sb.location_id = :'loc_1'::uuid
             order by sb.created_at desc limit 1),
           format('received_at=%s created_at=%s',
                  (select sb.received_at from stock_batch sb
                    where sb.origin = 'adjustment' and sb.location_id = :'loc_1'::uuid
                    order by sb.created_at desc limit 1),
                  (select sb.created_at from stock_batch sb
                    where sb.origin = 'adjustment' and sb.location_id = :'loc_1'::uuid
                    order by sb.created_at desc limit 1)));

select chk('3.7 …and it is a NEW lot, not an overdraw of an existing one',
           (select count(*) from stock_batch
             where origin = 'adjustment' and location_id = :'loc_1'::uuid) = 1);


-- ============================================== 4. one sale, end to end =====
-- The floor. Single lot, single rate — the multi-lot, mixed-rate and shortfall
-- ARITHMETIC is 4b-ii's, by the split docs/PLAN.md settled before either was
-- written. What is asserted here is that the seven things §2.6 lists actually
-- all happened, once, in one transaction.

-- 4.1 — §2.5 rules 2 to 4 on the sell side: the shelf price is the anchor, the
-- net is reached by DIVISION, and the tax is the residual. Rule 4 has teeth
-- exactly here (§2.5, and 3.5's F17) — 21.00/1.16 is 18.10344…, so a tax
-- rounded on its own would give 2.9055 → 2.91 and the line would not sum.
select chk('4.1 §2.5: gross 21.00 splits to net 18.10 and tax 2.90',
           (select line_net = 18.10 and tax_amount = 2.90
              from sale_line where sale_id = :sale_ok::uuid),
           format('net=%s tax=%s',
                  (select line_net from sale_line where sale_id = :sale_ok::uuid),
                  (select tax_amount from sale_line where sale_id = :sale_ok::uuid)));

select chk('4.1 …and net + tax = gross EXACTLY, which is what rule 4 buys',
           (select line_net + tax_amount = round(0.028 * 750, 2)
              from sale_line where sale_id = :sale_ok::uuid));

-- 4.2 — rule 5: the document total is the sum of the ROUNDED lines, never a
-- second rounding of its own.
select chk('4.2 §2.5 rule 5: the header totals are the sum of its lines',
           (select s.total_net = sum(l.line_net) and s.total_tax = sum(l.tax_amount)
              from sale s join sale_line l on l.sale_id = s.id
             where s.id = :sale_ok::uuid
             group by s.total_net, s.total_tax));

-- 4.3 — the ZERO-RATED line, where §2.5 says there is no rounding at all.
select chk('4.3 a zero-rated line is all net and no tax',
           (select line_net = 31.00 and tax_amount = 0.00 and tax_rate = 0.0000
              from sale_line where sale_id = :sale_t2::uuid),
           format('net=%s tax=%s',
                  (select line_net from sale_line where sale_id = :sale_t2::uuid),
                  (select tax_amount from sale_line where sale_id = :sale_t2::uuid)));

-- 4.4 — the units. §2.5 rule 4: display values stored ALONGSIDE normalised ones,
-- so "0.750 kg" survives on the line while the ledger holds 750 g.
select chk('4.4 the display quantity survives and the ledger holds base units',
           (select qty_base = 750.000 and qty_display = 0.750
                   and qty_display_unit = 'kg'
              from sale_line where sale_id = :sale_ok::uuid));

-- 4.5 — the display unit DEFAULTS to the variant's sell unit. The counted line
-- sent no unit at all, which is the common case: a stepper has no denomination
-- control to render (§2.5's tap table, "0 extra taps").
select chk('4.5 an omitted qty_display_unit falls back to the variant''s sell unit',
           (select qty_display_unit = 'pza' and qty_base = 2
              from sale_line where sale_id = :sale_t2::uuid));

-- 4.6 — the tax rate is the CATALOG's, snapshotted. A client that could send its
-- own rate is a client that can understate IVA, so the field is ignored.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_sale(:sale_cnt::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_mass', 'qty_display', 0.750,
           'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.028,
           'tax_rate', 0))) as r_rate \gset
select chk('4.6 a client-supplied tax_rate is IGNORED — the variant is the authority',
           (select tax_rate = 0.1600 and tax_amount = 2.90
              from sale_line where sale_id = :sale_cnt::uuid));
commit;

-- 4.7 — the ledger. One movement per lot, negative, carrying the lot's cost as a
-- SNAPSHOT (§2.4: "what the units consumed by THIS movement cost", not a join).
select chk('4.7 one negative movement against the lot FEFO chose',
           (select count(*) from stock_movement where sale_id = :sale_ok::uuid) = 1
       and exists (select 1 from stock_movement
                    where sale_id = :sale_ok::uuid
                      and batch_id = :b_mass_1::uuid
                      and qty_base = -750.000
                      and unit_cost_net_per_base = 0.010000),
           format('movements=%s',
                  (select count(*) from stock_movement where sale_id = :sale_ok::uuid)));

select chk('4.7 …and it is attributed to the sale and to nothing else',
           (select purchase_id is null and waste_id is null
                   and transfer_group_id is null and reversal_of_movement_id is null
              from stock_movement where sale_id = :sale_ok::uuid));

-- 4.8 — created_by is the CALLER, not the definer. The function runs as
-- postgres; a `current_user` here would attribute every sale in the shop to the
-- database owner and Números would have no cashier to group by.
select chk('4.8 created_by is auth.uid(), not the security definer',
           (select created_by = :cashier_a::uuid from sale where id = :sale_ok::uuid)
       and (select created_by = :cashier_a::uuid
              from stock_movement where sale_id = :sale_ok::uuid));

-- 4.9 — the §2.4 invariant, over everything this file wrote. The projection
-- agrees with the ledger, which is the claim `record_sale` could most plausibly
-- break by writing a line without its movement.
select chk('4.9 §2.4 holds over every document this file wrote',
           not exists (select 1 from batch_balance_violations()));

select chk('4.9 …and 0015 does too — no lot was opened without its receipt',
           not exists (select 1 from receipt_completeness_violations()));


-- ================================================== 5. the payload =========
-- Refusals, all of them `22023` — invalid_parameter_value. ⚠️ THE POINT IS NOT
-- THE CODE, IT IS THAT THE LINE IS NOT SILENTLY DROPPED. The pricing query in
-- 0016 joins `product_variant` and `unit`; an inner join with no validation in
-- front of it would record a SHORTER ticket than the customer paid for, and
-- every check in section 4 would still be green.

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('5.1 an empty lines array is refused',
  _call(:sale_conf::uuid, :'loc_1'::uuid, '[]'::jsonb), '22023');

select chk_raises('5.2 lines that are not an array are refused',
  _call(:sale_conf::uuid, :'loc_1'::uuid, '{"variant_id":"x"}'::jsonb), '22023');

select chk_raises('5.3 a null sale id is refused — the client generates the key',
  _call(null, :'loc_1'::uuid, :'line_mass'::jsonb), '22023');

select chk_raises('5.4 ANOTHER WORKSPACE''S VARIANT is refused, and named',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_b', 'qty_display', 1,
          'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.01))), '22023');

select chk_raises('5.5 a unit from the WRONG DIMENSION is refused (§2.5)',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', 1,
          'qty_display_unit', 'ml', 'unit_price_gross_per_base', 0.01))), '22023');

select chk_raises('5.6 a unit code that does not exist is refused',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', 1,
          'qty_display_unit', 'arroba', 'unit_price_gross_per_base', 0.01))), '22023');

select chk_raises('5.7 a NEGATIVE quantity is refused — a return is void_transaction',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', -1,
          'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.028))), '22023');

select chk_raises('5.8 a ZERO quantity is refused',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', 0,
          'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.028))), '22023');

select chk_raises('5.9 a quantity that ROUNDS TO ZERO in base units is refused',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', 0.0000004,
          'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.028))), '22023');

select chk_raises('5.10 a negative price is refused',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', 1,
          'qty_display_unit', 'kg', 'unit_price_gross_per_base', -0.028))), '22023');

select chk_raises('5.11 a missing variant_id is refused',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'qty_display', 1, 'unit_price_gross_per_base', 0.028))), '22023');

select chk_raises('5.12 a missing price is refused',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        jsonb_build_array(jsonb_build_object(
          'variant_id', :'var_mass', 'qty_display', 1,
          'qty_display_unit', 'kg'))), '22023');

-- ⚠️ 5.13 IS WHAT MAKES 5.1–5.12 EVIDENCE. Twelve refusals prove nothing if any
-- of them half-wrote a document first: a partially recorded sale is worse than a
-- refused one, because it looks like a real ticket.
select chk('5.13 not one of the twelve refusals wrote a document',
           not exists (select 1 from sale where id = :sale_conf::uuid)
       and not exists (select 1 from sale_line
                        where sale_id = :sale_conf::uuid));

-- 5.14 — AND THE SECOND LINE OF A TWO-LINE TICKET IS REFUSED TOO. Everything
-- above sends one bad line. A validation pass that only looked at the first
-- would let the ticket through and drop the second on the inner join, which is
-- the exact defect the pre-flight in 0016 exists for.
select chk_raises('5.14 a bad SECOND line refuses the whole ticket, not just itself',
  _call(:sale_conf::uuid, :'loc_1'::uuid,
        (:'line_mass'::jsonb || jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_b', 'qty_display', 1,
           'qty_display_unit', 'kg', 'unit_price_gross_per_base', 0.01)))), '22023');

select chk('5.14 …and the good first line was not recorded on its own',
           not exists (select 1 from sale where id = :sale_conf::uuid));
commit;



-- =========================== 6. arithmetic and allocation breadth (4b-ii) ===
-- docs/PLAN.md task 4b-ii, and it ships NO MIGRATION. `record_sale` was whole
-- when 0016 merged — the seam 4b was split on is test breadth, not function
-- completeness, and the reasoning for refusing the tidier seam is recorded in
-- the plan under *Settled in sizing 4b*.
--
-- Section 4 is the floor: ONE lot, ONE rate, one sale end to end. Every sale
-- above this line is single-lot by construction, which is what makes section 7's
-- closing count readable and what leaves these five paths unwalked:
--
--   * a line that spans SEVERAL LOTS, each with its own cost (§2.4, §2.9)
--   * the SHORTFALL, both branches the RPC can reach with stock on the shelf —
--     0010's overdraw and its closed-lot fallback. The third, "never stocked
--     here", is check 3.7's, because it is a timestamp claim
--   * MIXED RATES in one document, where a document-level tax split stops being
--     merely wrong and starts being visibly wrong
--   * a WEIGHED DECIMAL quantity, which is where unit conversion and §2.5
--     rule 6's half-up rounding meet
--   * the residual identity asserted over the RPC's OWN output rather than over
--     one hand-checked sale
--
-- ⚠️ EVERY LEDGER READ BELOW IS OUTSIDE THE ROLE BLOCK, and that is 4b-i's
-- finding rather than a style choice: `stock_movement_select` and
-- `stock_batch_select` (0004) are gated on manager, so a cashier writes lots and
-- movements they cannot then read. A negative existence check under a restricted
-- role proves nothing (F10). Assert the refusal as the restricted actor; assert
-- what is on disk as somebody who can see the disk.


-- ------------------------------------------------------- the second delivery --
-- A THIRD LOT SET, AT STORE 1, WITH THREE DISTINCT EXPIRY DATES — which is the
-- smallest fixture FEFO can be observed on at all. `b_mass_1` has no expiry, so
-- it sorts `nulls last` and could never demonstrate an ordering.
--
-- The three costs differ on purpose (0.008 / 0.012 / 0.020): §2.9 attributes
-- revenue to the lot actually consumed, so a multi-lot line whose movements all
-- carried one cost would be indistinguishable from a correct one on quantity
-- alone.
--
-- ⚠️ ONE TRANSACTION, and it is 4a's rule rather than tidiness: 0015 refuses at
-- COMMIT a `purchase` lot whose live receipt movements do not sum to what it
-- opened. `record_purchase` (0018) writes exactly this shape.

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam_mass', 'Jitomate saladette', 'g', 'kg', 'kg', 'kg', 0.16);
select id as var_multi from product_variant
 where workspace_id = :'ws_a' and name = 'Jitomate saladette' \gset

\set pur_3 '''aaaa0016-0000-0000-0000-000000000003'''
\set b_ml_a '''eeee0016-0000-0000-0000-000000000001'''
\set b_ml_b '''eeee0016-0000-0000-0000-000000000002'''
\set b_ml_c '''eeee0016-0000-0000-0000-000000000003'''

begin;
insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash) values
  (:pur_3, :'ws_a', :'loc_1', :'prov_a', now() - interval '9 days',
   42.00, 6.72, :owner_a, 'hash-0016-pur-3');

insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id,
       qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
       line_net, tax_amount, tax_rate, expiry_date) values
  ('cccc0016-0000-0000-0000-000000000001', :'ws_a', :'loc_1', :pur_3, :'var_multi',
   1000, 1,   'kg', 0.008000,  8.00, 1.28, 0.16, current_date + 2),
  ('cccc0016-0000-0000-0000-000000000002', :'ws_a', :'loc_1', :pur_3, :'var_multi',
   2000, 2,   'kg', 0.012000, 24.00, 3.84, 0.16, current_date + 5),
  ('cccc0016-0000-0000-0000-000000000003', :'ws_a', :'loc_1', :pur_3, :'var_multi',
    500, 0.5, 'kg', 0.020000, 10.00, 1.60, 0.16, current_date + 9);

-- `received_at` ascends with expiry here, which is deliberate and is what makes
-- check 6.3 a claim about the FALLBACK's ordering key rather than an accident:
-- the closed-lot branch orders on `received_at desc`, so the lot it blames is
-- the one with the LATEST expiry — the opposite end of the FEFO order the loop
-- above it walks.
insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, received_at, expiry_date, created_by) values
  (:b_ml_a, :'ws_a', :'loc_1', :'var_multi', 'purchase', :'prov_a',
   'cccc0016-0000-0000-0000-000000000001', 1000, 0.008000,
   now() - interval '9 days', current_date + 2, :owner_a),
  (:b_ml_b, :'ws_a', :'loc_1', :'var_multi', 'purchase', :'prov_a',
   'cccc0016-0000-0000-0000-000000000002', 2000, 0.012000,
   now() - interval '8 days', current_date + 5, :owner_a),
  (:b_ml_c, :'ws_a', :'loc_1', :'var_multi', 'purchase', :'prov_a',
   'cccc0016-0000-0000-0000-000000000003',  500, 0.020000,
   now() - interval '7 days', current_date + 9, :owner_a);

insert into stock_movement (workspace_id, location_id, batch_id, variant_id, reason,
       qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by) values
  (:'ws_a', :'loc_1', :b_ml_a, :'var_multi', 'purchase',
   1000, 0.008000, :pur_3, now() - interval '9 days', :owner_a),
  (:'ws_a', :'loc_1', :b_ml_b, :'var_multi', 'purchase',
   2000, 0.012000, :pur_3, now() - interval '8 days', :owner_a),
  (:'ws_a', :'loc_1', :b_ml_c, :'var_multi', 'purchase',
    500, 0.020000, :pur_3, now() - interval '7 days', :owner_a);
commit;

select chk('6.0 the fixture delivered three lots with three expiry dates',
           (select count(*) from batch_balance
             where variant_id = :'var_multi'::uuid and remaining_base > 0) = 3
       and (select count(distinct expiry_date) from batch_balance
             where variant_id = :'var_multi'::uuid) = 3,
           format('lots=%s',
                  (select count(*) from batch_balance
                    where variant_id = :'var_multi'::uuid)));

\set sale_ml  '''99990016-0000-0000-0000-000000000020'''
\set sale_ovr '''99990016-0000-0000-0000-000000000021'''
\set sale_cls '''99990016-0000-0000-0000-000000000022'''
\set sale_mix '''99990016-0000-0000-0000-000000000023'''
\set sale_wgh '''99990016-0000-0000-0000-000000000024'''


-- 6.1 — MULTI-LOT FEFO WITHIN ONE LINE. 2.5 kg against lots of 1 kg, 2 kg and
-- 0.5 kg: FEFO takes all of the earliest-expiring lot and 1.5 kg of the next,
-- and never reaches the third. ONE line, TWO movements — the shape §2.4 needs,
-- because "what the units consumed by THIS movement cost" has two answers here
-- and a single merged movement could carry only one of them.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select record_sale(:sale_ml::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_multi', 'qty_display', 2.5,
           'qty_display_unit', 'kg',
           'unit_price_gross_per_base', 0.030))) as r_ml \gset
commit;

select chk('6.1 a line spanning two lots is still ONE line on the ticket',
           (:'r_ml'::jsonb ->> 'line_count')::integer = 1
       and (select count(*) from sale_line where sale_id = :sale_ml::uuid) = 1);

select chk('6.1 …and TWO movements, one per lot, each with that lot''s own cost',
           (select count(*) from stock_movement where sale_id = :sale_ml::uuid) = 2
       and exists (select 1 from stock_movement
                    where sale_id = :sale_ml::uuid and batch_id = :b_ml_a::uuid
                      and qty_base = -1000.000 and unit_cost_net_per_base = 0.008000)
       and exists (select 1 from stock_movement
                    where sale_id = :sale_ml::uuid and batch_id = :b_ml_b::uuid
                      and qty_base = -1500.000 and unit_cost_net_per_base = 0.012000),
           format('movements=%s costs=%s',
                  (select count(*) from stock_movement where sale_id = :sale_ml::uuid),
                  (select count(distinct unit_cost_net_per_base)
                     from stock_movement where sale_id = :sale_ml::uuid)));

-- ⚠️ THE ORDER IS THE CLAIM, NOT THE ARITHMETIC. An allocator that took the lots
-- newest-first would move the same 2 500 g and leave the same total on the
-- shelf; only WHICH lots it emptied tells the two apart, and the answer is
-- visible on three balances and nowhere else.
select chk('6.1 FEFO emptied the EARLIEST expiry and never touched the latest',
           (select remaining_base from batch_balance where batch_id = :b_ml_a::uuid) = 0
       and (select remaining_base from batch_balance where batch_id = :b_ml_b::uuid) = 500
       and (select remaining_base from batch_balance where batch_id = :b_ml_c::uuid) = 500,
           format('a=%s b=%s c=%s',
                  (select remaining_base from batch_balance where batch_id = :b_ml_a::uuid),
                  (select remaining_base from batch_balance where batch_id = :b_ml_b::uuid),
                  (select remaining_base from batch_balance where batch_id = :b_ml_c::uuid)));

-- The money is the LINE's, not the lot's: one price, one rate, one split.
-- 0.030 × 2 500 = 75.00 gross; 75.00 / 1.16 = 64.65517… → 64.66 net; 10.34 tax.
--
-- ⚠️ COUNTED, NOT READ AS A SCALAR, AND FALSIFICATION G5 IS WHY. `(select
-- line_net = … from sale_line where sale_id = X)` is a bare scalar subquery: it
-- is exactly right while the line is one row and it RAISES `21000` — "more than
-- one row returned by a subquery used as an expression" — the moment a defect
-- splits it. The file then dies instead of printing a FAIL row, which is red
-- either way but not red in the shape a reviewer reads. Section 6 is where
-- multi-lot lines exist, so section 6 is where the count is not optional; the
-- sales in sections 1–5 are single-lot by construction and their checks are
-- unchanged.
select chk('6.1 the line is priced once, whatever the ledger had to do to fill it',
           (select count(*) from sale_line
             where sale_id = :sale_ml::uuid
               and line_net = 64.66 and tax_amount = 10.34
               and qty_base = 2500.000) = 1,
           format('lines=%s net=%s tax=%s',
                  (select count(*) from sale_line where sale_id = :sale_ml::uuid),
                  (select max(line_net) from sale_line where sale_id = :sale_ml::uuid),
                  (select max(tax_amount) from sale_line where sale_id = :sale_ml::uuid)));


-- 6.2 — THE SHORTFALL, BRANCH 1: stock on the shelf, but not enough. 0010
-- OVERDRAWS THE LOT FEFO RAN OUT ON rather than refusing — §2.6's availability
-- check is 4c's and is DORMANT until then, so today an oversale records and the
-- debt is visible as a negative balance. That is the behaviour this check pins,
-- and 4c is what changes it.
--
-- 1 kg remains across two lots. Selling 1.2 kg takes both and is 200 g short.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select record_sale(:sale_ovr::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_multi', 'qty_display', 1.2,
           'qty_display_unit', 'kg',
           'unit_price_gross_per_base', 0.030))) as r_ovr \gset
commit;

select chk('6.2 a shortfall overdraws the lot FEFO ran out on — no third movement',
           (select count(*) from stock_movement where sale_id = :sale_ovr::uuid) = 2
       and exists (select 1 from stock_movement
                    where sale_id = :sale_ovr::uuid and batch_id = :b_ml_b::uuid
                      and qty_base = -500.000)
       and exists (select 1 from stock_movement
                    where sale_id = :sale_ovr::uuid and batch_id = :b_ml_c::uuid
                      and qty_base = -700.000),
           format('movements=%s',
                  (select count(*) from stock_movement where sale_id = :sale_ovr::uuid)));

select chk('6.2 …and the debt is on the shelf as a NEGATIVE balance, not hidden',
           (select remaining_base from batch_balance where batch_id = :b_ml_c::uuid) = -200,
           format('c=%s',
                  (select remaining_base from batch_balance where batch_id = :b_ml_c::uuid)));

-- ⚠️ BRANCH 1 IS NOT BRANCH 3, and one count separates them. `allocate_fefo()`
-- opens an `adjustment` lot only when the store has NEVER held the variant
-- (check 3.7). An overdraw that opened one instead would look identical on
-- quantity and would put a fictional zero-cost lot into the FEFO order.
select chk('6.2 …and it opened NO new lot — that is branch 3, and this is not it',
           (select count(*) from stock_batch
             where origin = 'adjustment' and location_id = :'loc_1'::uuid) = 1);

select chk('6.2 the money ignores the shortfall entirely: gross 36.00 → 31.03 + 4.97',
           (select count(*) from sale_line
             where sale_id = :sale_ovr::uuid
               and line_net = 31.03 and tax_amount = 4.97
               and qty_base = 1200.000) = 1,
           format('lines=%s net=%s tax=%s',
                  (select count(*) from sale_line where sale_id = :sale_ovr::uuid),
                  (select max(line_net) from sale_line where sale_id = :sale_ovr::uuid),
                  (select max(tax_amount) from sale_line where sale_id = :sale_ovr::uuid)));


-- 6.3 — THE SHORTFALL, BRANCH 2: nothing open, but this store HAS held the
-- variant. 0010 blames the most recent lot it ever had — "most recent" by
-- `received_at desc`, which here is the lot with the LATEST expiry, i.e. the
-- opposite end of the order the FEFO loop walks. That is the whole distinction
-- between the two branches and it is why the fixture's dates ascend together.
select chk('6.3 the shelf is empty of this variant, which is what forces branch 2',
           (select count(*) from batch_balance
             where variant_id = :'var_multi'::uuid
               and location_id = :'loc_1'::uuid
               and remaining_base > 0) = 0);

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select record_sale(:sale_cls::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_multi', 'qty_display', 0.3,
           'qty_display_unit', 'kg',
           'unit_price_gross_per_base', 0.030))) as r_cls \gset
commit;

select chk('6.3 with nothing open, the whole line lands on the most RECENT lot',
           (select count(*) from stock_movement where sale_id = :sale_cls::uuid) = 1
       and exists (select 1 from stock_movement
                    where sale_id = :sale_cls::uuid and batch_id = :b_ml_c::uuid
                      and qty_base = -300.000
                      and unit_cost_net_per_base = 0.020000),
           format('movements=%s batch=%s',
                  (select count(*) from stock_movement where sale_id = :sale_cls::uuid),
                  (select min(batch_id::text) from stock_movement
                    where sale_id = :sale_cls::uuid)));

select chk('6.3 …and still NO adjustment lot — branch 2 reuses, it does not invent',
           (select count(*) from stock_batch
             where origin = 'adjustment' and location_id = :'loc_1'::uuid) = 1
       and (select remaining_base from batch_balance where batch_id = :b_ml_c::uuid) = -500,
           format('c=%s',
                  (select remaining_base from batch_balance where batch_id = :b_ml_c::uuid)));


-- 6.4 — MIXED RATES IN ONE DOCUMENT. 0.750 kg of the 16% weighed variant beside
-- 3 pieces of the ZERO-RATED counted one, which is an ordinary Mexican basket:
-- §2.5 puts most unprocessed food at 0% and general goods at 16%.
--
-- ⚠️ THIS IS THE CASE WHERE A DOCUMENT-LEVEL SPLIT STOPS BEING SUBTLE. Rule 5
-- says the header is the sum of the ROUNDED lines. Splitting the document total
-- instead — round(67.50 / 1.16, 2) — gives 58.19 net and 9.31 tax against the
-- true 64.60 and 2.90: a 6.41 error, on a document whose printed lines then fail
-- to sum to its printed total. A single-rate ticket hides that completely.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select record_sale(:sale_mix::uuid, :'loc_1'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_mass', 'qty_display', 0.750,
                              'qty_display_unit', 'kg',
                              'unit_price_gross_per_base', 0.028),
           jsonb_build_object('variant_id', :'var_count', 'qty_display', 3,
                              'unit_price_gross_per_base', 15.50))) as r_mix \gset
commit;

select chk('6.4 each line keeps its OWN rate and its own split',
           (select count(*) from sale_line
             where sale_id = :sale_mix::uuid and tax_rate = 0.1600
               and line_net = 18.10 and tax_amount = 2.90) = 1
       and (select count(*) from sale_line
             where sale_id = :sale_mix::uuid and tax_rate = 0.0000
               and line_net = 46.50 and tax_amount = 0.00) = 1,
           format('lines=%s rates=%s',
                  (select count(*) from sale_line where sale_id = :sale_mix::uuid),
                  (select count(distinct tax_rate) from sale_line
                    where sale_id = :sale_mix::uuid)));

select chk('6.4 §2.5 rule 5: the header is 64.60 + 2.90, the SUM of the two lines',
           (select total_net = 64.60 and total_tax = 2.90
              from sale where id = :sale_mix::uuid),
           format('net=%s tax=%s (a document-level split would give 58.19 + 9.31)',
                  (select total_net from sale where id = :sale_mix::uuid),
                  (select total_tax from sale where id = :sale_mix::uuid)));

select chk('6.4 …and the summary the till gets back agrees with what was written',
           (:'r_mix'::jsonb ->> 'line_count')::integer = 2
       and (:'r_mix'::jsonb ->> 'total_gross')::numeric = 67.50
       and (:'r_mix'::jsonb ->> 'total_net')::numeric
             = (select total_net from sale where id = :sale_mix::uuid));

select chk('6.4 two lines, two variants, two movements — the ledger followed both',
           (select count(*) from stock_movement where sale_id = :sale_mix::uuid) = 2
       and (select count(distinct variant_id) from stock_movement
             where sale_id = :sale_mix::uuid) = 2);


-- 6.5 — A WEIGHED DECIMAL QUANTITY, where unit conversion and §2.5 rule 6 meet.
-- 1.234 kg at 0.0125 per gram: the ledger holds 1 234.000 g, the ticket still
-- says 1.234 kg, and the gross is 15.425 EXACTLY — a half-centavo boundary.
--
-- ⚠️ RULE 6 IS HALF-UP, so 15.425 → 15.43. It is reachable only because rule 1
-- keeps floats out of the money path: `round(float8)` is banker's and would
-- return 15.42, the even neighbour. 07 asserts the absence of float columns as a
-- build failure (task 3.5); this is the same rule observed from the other end,
-- on a value the function computes rather than one a column stores.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select record_sale(:sale_wgh::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object(
           'variant_id', :'var_mass', 'qty_display', 1.234,
           'qty_display_unit', 'kg',
           'unit_price_gross_per_base', 0.0125))) as r_wgh \gset
commit;

select chk('6.5 the display quantity survives the conversion — 1.234 kg is 1234 g',
           (select count(*) from sale_line
             where sale_id = :sale_wgh::uuid
               and qty_base = 1234.000 and qty_display = 1.234
               and qty_display_unit = 'kg') = 1);

select chk('6.5 §2.5 rule 6: 15.425 rounds HALF-UP to 15.43, not to the even 15.42',
           (select coalesce(sum(line_net + tax_amount), 0) from sale_line
             where sale_id = :sale_wgh::uuid) = 15.43,
           format('gross=%s',
                  (select coalesce(sum(line_net + tax_amount), 0) from sale_line
                    where sale_id = :sale_wgh::uuid)));

select chk('6.5 …and the split of it is 13.30 + 2.13, tax as the residual',
           (select count(*) from sale_line
             where sale_id = :sale_wgh::uuid
               and line_net = 13.30 and tax_amount = 2.13) = 1,
           format('lines=%s net=%s tax=%s',
                  (select count(*) from sale_line where sale_id = :sale_wgh::uuid),
                  (select max(line_net) from sale_line where sale_id = :sale_wgh::uuid),
                  (select max(tax_amount) from sale_line where sale_id = :sale_wgh::uuid)));


-- 6.6 — THE RESIDUAL IDENTITY OVER THE RPC'S OWN OUTPUT. Every check above names
-- one document and one expected number. These four name none: they run over
-- EVERY line and EVERY header this file wrote, so a defect that only shows on
-- some arithmetic the fixture did not think to try still has to survive them.
--
-- ⚠️ 6.6a IS THE ONE THAT KNOWS WHICH DIRECTION THE SPLIT WENT, and it needs the
-- price the till sent, which the ledger does not store: `sale_line` keeps
-- `unit_price_net_per_base` and no gross column at all. So the sent prices are
-- recorded here beside the sales that used them. Without that anchor a net-first
-- implementation is INVISIBLE — round(net × (1+rate)) and round(gross / (1+rate))
-- are mutually consistent, and 6.6b would be green on both.
create table public._sent (sale_id uuid, variant_id uuid, unit_gross numeric);

insert into public._sent (sale_id, variant_id, unit_gross) values
  (:sale_ok::uuid,  :'var_mass'::uuid,  0.028),
  (:sale_mgr::uuid, :'var_mass'::uuid,  0.028),
  (:sale_cnt::uuid, :'var_mass'::uuid,  0.028),
  (:sale_t2::uuid,  :'var_count'::uuid, 15.50),
  (:sale_t3::uuid,  :'var_count'::uuid, 15.50),
  (:sale_t4::uuid,  :'var_count'::uuid, 15.50),
  (:sale_t5::uuid,  :'var_count'::uuid, 15.50),
  ('99990016-0000-0000-0000-000000000012'::uuid, :'var_new'::uuid, 0.028),
  (:sale_ml::uuid,  :'var_multi'::uuid, 0.030),
  (:sale_ovr::uuid, :'var_multi'::uuid, 0.030),
  (:sale_cls::uuid, :'var_multi'::uuid, 0.030),
  (:sale_mix::uuid, :'var_mass'::uuid,  0.028),
  (:sale_mix::uuid, :'var_count'::uuid, 15.50),
  (:sale_wgh::uuid, :'var_mass'::uuid,  0.0125);

-- The anti-vacuity guard, and it is the same concern section 7 has about the
-- file as a whole: `not exists` over a join that matched nothing is true, so the
-- join is required to reach every line before its absence means anything.
select chk('6.6 the price anchor covers every line in the database, one for one',
           (select count(*) from public.sale_line l
              join public._sent s on s.sale_id = l.sale_id
                                 and s.variant_id = l.variant_id)
             = (select count(*) from public.sale_line),
           format('joined=%s lines=%s',
                  (select count(*) from public.sale_line l
                     join public._sent s on s.sale_id = l.sale_id
                                        and s.variant_id = l.variant_id),
                  (select count(*) from public.sale_line)));

select chk('6.6 §2.5 rules 2–4: net + tax is EXACTLY the gross the till sent, every line',
           not exists (
             select 1 from public.sale_line l
               join public._sent s on s.sale_id = l.sale_id
                                  and s.variant_id = l.variant_id
              where l.line_net + l.tax_amount
                    is distinct from round(s.unit_gross * l.qty_base, 2)));

-- ⚠️ AND WHAT THIS ONE CANNOT SEE, said out loud: it is green under a net-first
-- implementation too. It pins that the net was reached by DIVISION and the tax
-- is whatever was left — never a second rounding of its own — and the check
-- above is what pins the direction.
select chk('6.6 the net is the rounded quotient, and the tax is only ever the residual',
           not exists (
             select 1 from public.sale_line
              where line_net is distinct from
                    round((line_net + tax_amount) / (1 + tax_rate), 2)));

select chk('6.6 §2.5 rule 5: every header is the sum of its own rounded lines',
           not exists (
             select 1 from public.sale s
              where s.total_net is distinct from
                    (select coalesce(sum(l.line_net), 0) from public.sale_line l
                      where l.sale_id = s.id)
                 or s.total_tax is distinct from
                    (select coalesce(sum(l.tax_amount), 0) from public.sale_line l
                      where l.sale_id = s.id)));

-- Derived from the ROUNDED line net at 6 dp (0016), not from the gross unit
-- price — which is what stops the column and the line disagreeing by a centavo
-- on a weighed quantity. 6.5's line is the one where the two spellings differ.
select chk('6.6 unit_price_net_per_base is the rounded line net over the base qty',
           not exists (
             select 1 from public.sale_line
              where unit_price_net_per_base is distinct from
                    round(line_net / qty_base, 6)));

-- 6.7 — and the two invariants again, AFTER the multi-lot, the two shortfalls
-- and a delivery this section wrote itself. Check 4.9 made the same claim over a
-- ledger where every sale took exactly one lot from exactly one movement; eight
-- movements, three lots and two negative balances later it is a different claim.
select chk('6.7 §2.4 still holds over the multi-lot and overdrawn ledger',
           not exists (select 1 from public.batch_balance_violations()));

select chk('6.7 …and 0015 does too — the second delivery received what it opened',
           not exists (select 1 from public.receipt_completeness_violations()));

drop table public._sent;


-- ================================================== 7. the closing state ===
-- ⚠️ EVERY GREEN ABOVE IS A CLAIM ABOUT SALES THAT EXIST. A fixture whose stock
-- never arrived would leave section 4's arithmetic checks failing loudly, but
-- section 1's and section 5's refusals would ALL be green over an empty
-- database — the vacuous shape 3.4's floor and 3.1's counter both exist to
-- refuse. So the subjects are counted.
-- THIRTEEN SALES, FOURTEEN LINES, SIXTEEN MOVEMENTS, and the three numbers stop
-- agreeing with each other at section 6, which is the point of it. Sections 1–5
-- record eight sales — 1.1, 1.8, 3.1, 3.2, 3.3, 3.4, 3.7 and 4.6 — every one of
-- them a single line filled from a single lot, which is the half of
-- `record_sale` 4b-i claims. Section 6 adds five more: 6.4 is the only one with
-- two LINES, and 6.1 and 6.2 are the only ones whose one line took two LOTS.
--
-- ⚠️ THE THREE COUNTS ARE NOT ONE CLAIM RESTATED. A merged multi-lot movement
-- leaves sales and lines untouched and takes 16 to 14; a line silently dropped
-- from 6.4's ticket leaves sales and movements untouched and takes 14 to 13.
select chk('7. the file really recorded the sales it then made claims about',
           (select count(*) from sale) = 13
       and (select count(*) from sale_line) = 14
       and (select count(*) from stock_movement where reason = 'sale') = 16,
           format('sales=%s lines=%s movements=%s',
                  (select count(*) from sale),
                  (select count(*) from sale_line),
                  (select count(*) from stock_movement where reason = 'sale')));

select chk('7. and every one of them went through the RPC — none has a null hash',
           not exists (select 1 from sale where btrim(payload_hash) = ''));

-- The helper this file invented, removed by the file that invented it.
drop function public._call(uuid, uuid, jsonb, timestamptz, boolean);


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  -- ⚠️ `is not true`, NOT `not passed`, and the difference is a whole class of
  -- silent pass. A check whose condition evaluates to NULL — a subquery that
  -- matched no rows, an aggregate over nothing, a comparison against a NULL
  -- column — prints FAIL in the table above and is invisible to `not passed`,
  -- because `not null` is null and a null WHERE clause keeps no rows. The file
  -- then reports "all N checks passed" with a FAIL line printed directly above
  -- it. Found in task 4b-i, on a real check reading a table its role could not
  -- see; corrected in all six suites on the same commit, which is the same
  -- decision 3.4 took when it found the plan guard 3.3 shipped was wrong.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
