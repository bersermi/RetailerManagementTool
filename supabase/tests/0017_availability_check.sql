-- ============================================================================
-- Behavioural verification for 0017 — the availability check in record_sale()
-- ============================================================================
-- ADR-035 §2.6, §1, §9. docs/PLAN.md task 4c-i.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0017_availability_check.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- 0016 sells whatever the till asks for. When the shelf runs short the
-- allocator OVERDRAWS the lot it ran out on (0010 branch 1), the sale records,
-- and the debt shows as a negative `batch_balance`. That is ADR-035 §1 —
-- "stock is recorded, not enforced" — and `supabase/tests/0016` check 6.2 pins
-- it.
--
-- 0017 adds the other path: §2.6's "lock the open batches for the variant,
-- evaluate availability, then insert or raise". It is OFF for every workspace
-- that exists, and the file next door
-- (`supabase/checks/0017_enforcement_is_dormant.sql`) proves that over the
-- seed. THIS file proves the path is real by switching it on, which is the only
-- way to tell a dormant path from an absent one.
--
-- ⚠️⚠️ THE PLAN PREDICTED THIS FILE WOULD TURN `0016` CHECK 6.2 RED. IT DOES
-- NOT, AND THAT IS THE CORRECT OUTCOME. docs/PLAN.md said, under *Decided in
-- 4b-ii*, that when 4c landed "an oversale is refused and check 6.2 goes red".
-- It stays green: 6.2 sells a variant that never opts in, so 0017 resolves
-- enforcement to false for it and the oversale records exactly as before. The
-- prediction assumed 4c would switch enforcement ON; §2.6 says v1 ships with
-- open mode always on, so it does not. `supabase/tests/0016` is unchanged by
-- this task and still reports all 89. Recorded in docs/PLAN.md under the 4c-i
-- findings rather than quietly left to be rediscovered.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ §2.10's concurrency row — "two sessions, last unit, enforcement ON →
-- exactly one succeeds" — IS NOT HERE AND CANNOT BE. One session cannot block
-- on its own lock, so a single-connection version of it passes green with the
-- locking deleted. It is `supabase/vitest/` (docs/PLAN.md task 4c-ii), on two
-- real connections, and section 7 says so again at the point a reader might
-- otherwise take this file's green for the whole claim.
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

-- Also captures the MESSAGE, which section 3 asserts. `chk_raises` deliberately
-- does not: a suite that matches on message text goes red when a comma moves,
-- and sqlstate is the contract. Section 3 makes one exception, because a till
-- shows this message to a cashier and "how much is actually there" is the only
-- thing on the screen they can act on.
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

-- 0016's helper, same reasoning: `create or replace` on the way in and dropped
-- on the way out, because `_cleanup.sql` sweeps `_`-prefixed TABLES and the two
-- helpers above BY NAME, and has no convention that reaches a function a suite
-- invents.
--
-- ⚠️ `create or replace` IS LOAD-BEARING FOR EVERY FUNCTION THIS FILE INVENTS,
-- including `chk_message` above, and falsifying 0017 is what proved it. Sections
-- 3, 4 and 6 call `record_sale` BARE — those calls are meant to SUCCEED, so
-- wrapping them in `chk_raises` would assert the opposite of the claim. Under
-- `ON_ERROR_STOP=1` a falsification that makes one of them raise therefore kills
-- psql where it stands: the report table never renders and the DROPs at the foot
-- of the file never run. Without `create or replace` the next run of the file
-- then dies on "function already exists" — a second, meaningless red on top of
-- the real one. Plain `create` cost two falsification runs before this was
-- understood. It is the same shape 0016 records for its own F3 and F4, and the
-- 4b-ii `21000` finding; the suite is red either way and no attempt is made to
-- smooth that over, but it must be red for the RIGHT reason twice running.
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

-- One line, one variant, one quantity, at 10.00 a piece. Every variant below is
-- COUNTED and zero-rated: this file's subject is availability arithmetic, and
-- the money is 0016's (checks 6.1–6.6, over fourteen lines).
create or replace function public._ln(p_variant uuid, p_qty numeric)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_gross_per_base', 10.00))
$$;
grant execute on function public._ln(uuid, numeric) to authenticated;


-- ---------------------------------------------------------------- fixture ----
-- ONE workspace and ONE store. The location wall is 4b-i's and is proved in
-- `supabase/tests/0016` section 1 over three stores and two tenants; repeating
-- it here would be a second spelling of one rule, which is the thing the step-4
-- ordering argument exists to prevent.
--
-- FIVE VARIANTS, one per cell of the resolution grid plus the two that close
-- `allocate_fefo()`'s remaining shortfall branches:
--
--   var_dorm   enforce_stock null   — defers to the workspace. The shipped case
--   var_enf    enforce_stock true   — opts IN against a workspace default of false
--   var_out    enforce_stock false  — opts OUT, and section 2 turns the
--                                     workspace default ON to prove it wins
--   var_empty  enforce_stock true   — stocked, then sold to exactly zero
--   var_never  enforce_stock true   — never stocked at this store at all

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'cashier.a@example.mx');

\set owner_a   '''11111111-1111-1111-1111-111111111111'''
\set cashier_a '''22222222-2222-2222-2222-222222222222'''

select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select onboard_workspace('Tienda A') as ws_a \gset
select set_config('request.jwt.claims', null, false);

select id as loc_1 from location where workspace_id = :'ws_a' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :cashier_a, 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name) values (:'ws_a', 'Refresco');
select id as fam from product_family where workspace_id = :'ws_a' \gset

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate,
       enforce_stock) values
  (:'ws_a', :'fam', 'Refresco deferido', 'pza','pza','pza','pza', 0.00, null),
  (:'ws_a', :'fam', 'Refresco exigido',  'pza','pza','pza','pza', 0.00, true),
  (:'ws_a', :'fam', 'Refresco exento',   'pza','pza','pza','pza', 0.00, false),
  (:'ws_a', :'fam', 'Refresco agotado',  'pza','pza','pza','pza', 0.00, true),
  (:'ws_a', :'fam', 'Refresco inedito',  'pza','pza','pza','pza', 0.00, true);

select id as var_dorm  from product_variant where workspace_id=:'ws_a' and name='Refresco deferido' \gset
select id as var_enf   from product_variant where workspace_id=:'ws_a' and name='Refresco exigido'  \gset
select id as var_out   from product_variant where workspace_id=:'ws_a' and name='Refresco exento'   \gset
select id as var_empty from product_variant where workspace_id=:'ws_a' and name='Refresco agotado'  \gset
select id as var_never from product_variant where workspace_id=:'ws_a' and name='Refresco inedito'  \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

-- ⚠️ ONE TRANSACTION — 4a's rule (0015): a `purchase` lot and the movement that
-- fills it are written together or the commit is refused. `var_never` gets no
-- delivery, which is what makes section 6 reach branch 3.
\set pur_1 '''aaaa0017-0000-0000-0000-000000000001'''
begin;
insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash) values
  (:pur_1, :'ws_a', :'loc_1', :'prov_a', now() - interval '10 days',
   160.00, 0.00, :owner_a, 'hash-0017-pur-1');

insert into purchase_line (id, workspace_id, location_id, purchase_id, variant_id,
       qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
       line_net, tax_amount, tax_rate) values
  ('bbbb0017-0000-0000-0000-000000000001', :'ws_a', :'loc_1', :pur_1, :'var_dorm',
   10, 10, 'pza', 4.000000, 40.00, 0.00, 0.00),
  ('bbbb0017-0000-0000-0000-000000000002', :'ws_a', :'loc_1', :pur_1, :'var_enf',
   10, 10, 'pza', 4.000000, 40.00, 0.00, 0.00),
  ('bbbb0017-0000-0000-0000-000000000003', :'ws_a', :'loc_1', :pur_1, :'var_out',
   10, 10, 'pza', 4.000000, 40.00, 0.00, 0.00),
  ('bbbb0017-0000-0000-0000-000000000004', :'ws_a', :'loc_1', :pur_1, :'var_empty',
   10, 10, 'pza', 4.000000, 40.00, 0.00, 0.00);

insert into stock_batch (id, workspace_id, location_id, variant_id, origin,
       provider_id, source_purchase_line_id, qty_received_base,
       unit_cost_net_per_base, received_at, created_by) values
  ('dddd0017-0000-0000-0000-000000000001', :'ws_a', :'loc_1', :'var_dorm', 'purchase',
   :'prov_a', 'bbbb0017-0000-0000-0000-000000000001', 10, 4.000000,
   now() - interval '10 days', :owner_a),
  ('dddd0017-0000-0000-0000-000000000002', :'ws_a', :'loc_1', :'var_enf', 'purchase',
   :'prov_a', 'bbbb0017-0000-0000-0000-000000000002', 10, 4.000000,
   now() - interval '10 days', :owner_a),
  ('dddd0017-0000-0000-0000-000000000003', :'ws_a', :'loc_1', :'var_out', 'purchase',
   :'prov_a', 'bbbb0017-0000-0000-0000-000000000003', 10, 4.000000,
   now() - interval '10 days', :owner_a),
  ('dddd0017-0000-0000-0000-000000000004', :'ws_a', :'loc_1', :'var_empty', 'purchase',
   :'prov_a', 'bbbb0017-0000-0000-0000-000000000004', 10, 4.000000,
   now() - interval '10 days', :owner_a);

insert into stock_movement (workspace_id, location_id, batch_id, variant_id, reason,
       qty_base, unit_cost_net_per_base, purchase_id, occurred_at, created_by) values
  (:'ws_a', :'loc_1', 'dddd0017-0000-0000-0000-000000000001', :'var_dorm',  'purchase',
   10, 4.000000, :pur_1, now() - interval '10 days', :owner_a),
  (:'ws_a', :'loc_1', 'dddd0017-0000-0000-0000-000000000002', :'var_enf',   'purchase',
   10, 4.000000, :pur_1, now() - interval '10 days', :owner_a),
  (:'ws_a', :'loc_1', 'dddd0017-0000-0000-0000-000000000003', :'var_out',   'purchase',
   10, 4.000000, :pur_1, now() - interval '10 days', :owner_a),
  (:'ws_a', :'loc_1', 'dddd0017-0000-0000-0000-000000000004', :'var_empty', 'purchase',
   10, 4.000000, :pur_1, now() - interval '10 days', :owner_a);
commit;

\set b_dorm  '''dddd0017-0000-0000-0000-000000000001'''
\set b_enf   '''dddd0017-0000-0000-0000-000000000002'''
\set b_out   '''dddd0017-0000-0000-0000-000000000003'''
\set b_empty '''dddd0017-0000-0000-0000-000000000004'''

\set s_dorm    '''99990017-0000-0000-0000-000000000001'''
\set s_enf     '''99990017-0000-0000-0000-000000000002'''
\set s_wsdef   '''99990017-0000-0000-0000-000000000003'''
\set s_out     '''99990017-0000-0000-0000-000000000004'''
\set s_back    '''99990017-0000-0000-0000-000000000005'''
\set s_exact   '''99990017-0000-0000-0000-000000000006'''
\set s_over1   '''99990017-0000-0000-0000-000000000007'''
\set s_offline '''99990017-0000-0000-0000-000000000008'''
\set s_twice   '''99990017-0000-0000-0000-000000000009'''
\set s_mixed   '''99990017-0000-0000-0000-00000000000a'''
\set s_drain   '''99990017-0000-0000-0000-00000000000b'''
\set s_branch2 '''99990017-0000-0000-0000-00000000000c'''
\set s_branch3 '''99990017-0000-0000-0000-00000000000d'''
\set s_never   '''99990017-0000-0000-0000-00000000000e'''


-- ================================== 1. dormant is the default ================
-- The shipped configuration, and the only one a caller can reach today. This
-- section asserts 0017 changed NOTHING for it.

select chk('1.1 the workspace ships OPEN — enforce_stock_default is false',
           (select not enforce_stock_default from workspace_setting
             where workspace_id = :'ws_a'::uuid));

select chk('1.2 the deferring variant resolves to false — the function''s own coalesce',
           (select coalesce(pv.enforce_stock, ws.enforce_stock_default, false) = false
              from product_variant pv
              left join workspace_setting ws on ws.workspace_id = pv.workspace_id
             where pv.id = :'var_dorm'::uuid));

-- 11 against 10 on the shelf. Under 0016 this records and overdraws; the claim
-- is that 0017 did not change it.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_sale(:s_dorm::uuid, :'loc_1'::uuid, public._ln(:'var_dorm'::uuid, 11)) as r \gset
commit;

select chk('1.3 with enforcement dormant an OVERSALE STILL RECORDS — §1, unchanged',
           (select count(*) from sale where id = :s_dorm::uuid) = 1
       and (select count(*) from sale_line where sale_id = :s_dorm::uuid) = 1,
           format('sales=%s lines=%s',
                  (select count(*) from sale where id = :s_dorm::uuid),
                  (select count(*) from sale_line where sale_id = :s_dorm::uuid)));

select chk('1.4 …and the debt is on the shelf as a NEGATIVE balance, not hidden',
           (select remaining_base from batch_balance where batch_id = :b_dorm::uuid) = -1,
           format('dorm=%s',
                  (select remaining_base from batch_balance where batch_id = :b_dorm::uuid)));

-- ⚠️ Branch 1, not branch 3. An overdraw that opened an `adjustment` lot would
-- look identical on quantity and would put a fictional zero-cost lot at the
-- head of the FEFO order. 0016 check 6.2 makes the same separation.
select chk('1.5 …and it opened NO adjustment lot — the allocator overdrew, as before',
           (select count(*) from stock_batch
             where origin = 'adjustment' and location_id = :'loc_1'::uuid) = 0);


-- ============================= 2. the resolution grid ========================
-- Two columns decide this, and the variant wins. Every cell is exercised, and
-- the two that MATTER are 2.2 (opt in against an open workspace) and 2.4 (opt
-- out against an enforcing one) — a resolution that read only one column would
-- pass one of them and fail the other.

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('2.1 a variant that opts IN is REFUSED — TD002, not a bad payload',
                  public._call(:s_enf::uuid, :'loc_1'::uuid,
                               public._ln(:'var_enf'::uuid, 11)),
                  'TD002');
commit;

select chk('2.1 …and the refusal wrote nothing at all',
           (select count(*) from sale where id = :s_enf::uuid) = 0
       and (select count(*) from sale_line where sale_id = :s_enf::uuid) = 0
       and (select count(*) from stock_movement where sale_id = :s_enf::uuid) = 0);

select chk('2.1 …and the shelf is untouched — still the full ten',
           (select remaining_base from batch_balance where batch_id = :b_enf::uuid) = 10,
           format('enf=%s',
                  (select remaining_base from batch_balance where batch_id = :b_enf::uuid)));

-- Now switch the WORKSPACE on. The deferring variant must follow it.
update workspace_setting set enforce_stock_default = true where workspace_id = :'ws_a'::uuid;

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('2.2 the DEFERRING variant follows the workspace once it enforces',
                  public._call(:s_wsdef::uuid, :'loc_1'::uuid,
                               public._ln(:'var_dorm'::uuid, 5)),
                  'TD002');
commit;

-- ⚠️ THE CELL THE WHOLE COALESCE EXISTS FOR. With the workspace enforcing, a
-- variant that opts OUT still sells past its stock. A resolution that read the
-- workspace first, or that treated the variant's `false` as "no opinion", would
-- refuse this — and a shopkeeper who marked one product as never-blocking would
-- find it blocking anyway.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_sale(:s_out::uuid, :'loc_1'::uuid, public._ln(:'var_out'::uuid, 11)) as r \gset
commit;

select chk('2.3 ⚠️ a variant that opts OUT beats an ENFORCING workspace — false is '
           'an opinion, not an absence',
           (select count(*) from sale where id = :s_out::uuid) = 1
       and (select remaining_base from batch_balance where batch_id = :b_out::uuid) = -1,
           format('sales=%s out=%s',
                  (select count(*) from sale where id = :s_out::uuid),
                  (select remaining_base from batch_balance where batch_id = :b_out::uuid)));

-- Back to the shipped configuration.
update workspace_setting set enforce_stock_default = false where workspace_id = :'ws_a'::uuid;

-- ⚠️ Proves 2.2 was the SETTING and not something sticky in the function or the
-- session — the same variant, the same quantity, the opposite outcome.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_sale(:s_back::uuid, :'loc_1'::uuid, public._ln(:'var_dorm'::uuid, 5)) as r \gset
commit;

select chk('2.4 …and switching the workspace back OPENS it again — 2.2 was the '
           'setting, not a one-way door',
           (select count(*) from sale where id = :s_back::uuid) = 1);


-- ============================ 3. the boundary and the message ================
-- `var_enf` still holds its full ten and has never been sold.

select chk('3.1 pre-flight: the enforced variant still holds exactly ten',
           (select remaining_base from batch_balance where batch_id = :b_enf::uuid) = 10);

-- ⚠️ THE BOUNDARY IS `<`, NOT `<=`. Selling the shelf empty is the commonest
-- correct sale a shop makes, and a check written one character wrong refuses
-- it. This is the cell most worth having.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_sale(:s_exact::uuid, :'loc_1'::uuid, public._ln(:'var_enf'::uuid, 10)) as r \gset
commit;

select chk('3.2 ⚠️ an EXACT FIT is not a shortfall — the last unit sells',
           (select count(*) from sale where id = :s_exact::uuid) = 1
       and (select remaining_base from batch_balance where batch_id = :b_enf::uuid) = 0,
           format('sales=%s enf=%s',
                  (select count(*) from sale where id = :s_exact::uuid),
                  (select remaining_base from batch_balance where batch_id = :b_enf::uuid)));

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('3.3 …and ONE more than the shelf holds is refused',
                  public._call(:s_over1::uuid, :'loc_1'::uuid,
                               public._ln(:'var_enf'::uuid, 1)),
                  'TD002');
commit;

select chk('3.4 …leaving the balance at exactly zero, not below it',
           (select remaining_base from batch_balance where batch_id = :b_enf::uuid) = 0,
           format('enf=%s',
                  (select remaining_base from batch_balance where batch_id = :b_enf::uuid)));

-- ⚠️ THE ONE MESSAGE ASSERTION IN THIS FILE, and the reasoning is in the helper
-- above: a till shows this to a cashier, and "how many are actually there" is
-- the only number on the screen they can act on. Matching on substrings rather
-- than the whole string, so rewording the sentence does not turn this red.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_message('3.5 the refusal NAMES the product and both numbers',
                   public._call(:s_over1::uuid, :'loc_1'::uuid,
                                public._ln(:'var_enf'::uuid, 4)),
                   array['Refresco exigido', '0', '4']);
commit;


-- ============================ 4. offline SKIPS enforcement (§2.6) ============
-- ⚠️ THE PART THAT MUST NOT CHANGE. §2.6's offline paragraph says such writes
-- skip enforcement, and it has to: the sale already happened at a till that
-- could not ask this database anything, and refusing it on reconnect would
-- discard a transaction the customer has paid for. The overdraw is the lesser
-- outcome, and it stays VISIBLE as a negative balance rather than lost.
--
-- This is the identical ticket 3.3 refused, against the identical shelf.

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_sale(:s_offline::uuid, :'loc_1'::uuid, public._ln(:'var_enf'::uuid, 3),
                   now() - interval '2 hours', true) as r \gset
commit;

select chk('4.1 ⚠️ an OFFLINE write skips enforcement — the same ticket 3.3 refused '
           'is RECORDED',
           (select count(*) from sale where id = :s_offline::uuid) = 1
       and (select recorded_offline from sale where id = :s_offline::uuid),
           format('sales=%s offline=%s',
                  (select count(*) from sale where id = :s_offline::uuid),
                  (select recorded_offline from sale where id = :s_offline::uuid)));

select chk('4.2 …and the debt is visible on the shelf, not lost',
           (select remaining_base from batch_balance where batch_id = :b_enf::uuid) = -3,
           format('enf=%s',
                  (select remaining_base from batch_balance where batch_id = :b_enf::uuid)));


-- ================== 5. the check is PER LINE, and one ticket adds up =========
-- `var_empty` holds ten and has not been touched. A ticket asking 6 + 6 is
-- within stock on each line read alone and over it as a ticket.
--
-- ⚠️ THIS IS THE CASE A PER-LINE CHECK GETS WRONG IF `batch_balance` LAGGED.
-- It does not: the projection is maintained by an AFTER INSERT trigger on
-- `stock_movement` (0004), so line 2 reads a shelf line 1 has already emptied.

select chk('5.1 pre-flight: the drained variant still holds ten, untouched',
           (select remaining_base from batch_balance where batch_id = :b_empty::uuid) = 10);

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('5.2 ⚠️ 6 + 6 of ONE variant against ten is refused — the second '
                  'line reads what the first already took',
                  public._call(:s_twice::uuid, :'loc_1'::uuid,
                    jsonb_build_array(
                      jsonb_build_object('variant_id', :'var_empty', 'qty_display', 6,
                                         'unit_price_gross_per_base', 10.00),
                      jsonb_build_object('variant_id', :'var_empty', 'qty_display', 6,
                                         'unit_price_gross_per_base', 10.00))),
                  'TD002');
commit;

-- ⚠️ THE HALF-TICKET. A refusal that had already committed line 1 would leave
-- the shop having sold six units it never rang up — the shape 0016's F9 found
-- for the pre-flight, and the reason the whole function is one transaction.
select chk('5.3 …and the GOOD FIRST LINE was not recorded on its own',
           (select count(*) from sale where id = :s_twice::uuid) = 0
       and (select count(*) from sale_line where sale_id = :s_twice::uuid) = 0
       and (select remaining_base from batch_balance where batch_id = :b_empty::uuid) = 10,
           format('lines=%s empty=%s',
                  (select count(*) from sale_line where sale_id = :s_twice::uuid),
                  (select remaining_base from batch_balance where batch_id = :b_empty::uuid)));

-- A ticket whose FIRST line is fine and whose second is short. The first line's
-- variant opts out entirely, so only the second can refuse — and it must take
-- the whole ticket with it.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('5.4 a mixed ticket — one open line, one short enforced line — is '
                  'refused WHOLE',
                  public._call(:s_mixed::uuid, :'loc_1'::uuid,
                    jsonb_build_array(
                      jsonb_build_object('variant_id', :'var_out', 'qty_display', 2,
                                         'unit_price_gross_per_base', 10.00),
                      jsonb_build_object('variant_id', :'var_empty', 'qty_display', 99,
                                         'unit_price_gross_per_base', 10.00))),
                  'TD002');
commit;

select chk('5.5 …and the OPEN line did not survive the refusal either',
           (select count(*) from sale_line where sale_id = :s_mixed::uuid) = 0
       and (select remaining_base from batch_balance where batch_id = :b_out::uuid) = -1,
           format('lines=%s out=%s (unchanged from 2.3)',
                  (select count(*) from sale_line where sale_id = :s_mixed::uuid),
                  (select remaining_base from batch_balance where batch_id = :b_out::uuid)));


-- =============== 6. enforcement closes the allocator's shortfall branches ====
-- `allocate_fefo()` has three shortfall branches (0010) and 0016 checks 6.2 and
-- 6.3 walk two of them with enforcement dormant. With it ON, branches 2 and 3
-- must be UNREACHABLE: both exist to absorb a shortfall, and enforcement means
-- there is no shortfall to absorb.

-- Drain `var_empty` to exactly zero, which 3.2 already showed is allowed.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_sale(:s_drain::uuid, :'loc_1'::uuid, public._ln(:'var_empty'::uuid, 10)) as r \gset
commit;

select chk('6.1 pre-flight: the shelf is empty of this variant — no OPEN lot left',
           (select remaining_base from batch_balance where batch_id = :b_empty::uuid) = 0
       and not exists (select 1 from batch_balance
                        where variant_id = :'var_empty'::uuid and remaining_base > 0));

-- ⚠️ BRANCH 2 — "nothing open, but this store HAS held it, so blame the most
-- recent lot". 0016 check 6.3 reaches it. Under enforcement it must not be
-- reached: available is zero, the ticket asks for one, and the answer is a
-- refusal rather than a fresh overdraw of a closed lot.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('6.2 ⚠️ BRANCH 2 is unreachable under enforcement — an empty shelf '
                  'refuses instead of re-opening the last lot',
                  public._call(:s_branch2::uuid, :'loc_1'::uuid,
                               public._ln(:'var_empty'::uuid, 1)),
                  'TD002');
commit;

select chk('6.2 …and the closed lot was NOT overdrawn',
           (select remaining_base from batch_balance where batch_id = :b_empty::uuid) = 0,
           format('empty=%s',
                  (select remaining_base from batch_balance where batch_id = :b_empty::uuid)));

-- ⚠️ BRANCH 3 — "never stocked here, so open an `adjustment` lot to hold the
-- discrepancy". 0016 check 3.7 reaches it and asserts the date that lot is
-- received at. Under enforcement it must not be reached at all: an enforced
-- sale of something the store has never held is the clearest possible refusal,
-- and inventing a zero-cost lot for it would put a fiction at the head of the
-- FEFO order.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('6.3 ⚠️ BRANCH 3 is unreachable under enforcement — a never-stocked '
                  'variant refuses instead of inventing a lot',
                  public._call(:s_branch3::uuid, :'loc_1'::uuid,
                               public._ln(:'var_never'::uuid, 1)),
                  'TD002');
commit;

select chk('6.3 …and NO adjustment lot was invented anywhere in this store',
           (select count(*) from stock_batch
             where origin = 'adjustment' and location_id = :'loc_1'::uuid) = 0,
           format('adjustment lots=%s',
                  (select count(*) from stock_batch
                    where origin = 'adjustment' and location_id = :'loc_1'::uuid)));

-- …and the same sale offline DOES reach branch 3, because offline skips the
-- check. This is the pair that shows the two paths are the same function.
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_sale(:s_never::uuid, :'loc_1'::uuid, public._ln(:'var_never'::uuid, 1),
                   now() - interval '1 hour', true) as r \gset
commit;

select chk('6.4 …but the SAME sale offline reaches branch 3 and opens one — the '
           'enforcement is the only difference between 6.3 and this',
           (select count(*) from sale where id = :s_never::uuid) = 1
       and (select count(*) from stock_batch
             where origin = 'adjustment' and location_id = :'loc_1'::uuid) = 1,
           format('sales=%s adjustment lots=%s',
                  (select count(*) from sale where id = :s_never::uuid),
                  (select count(*) from stock_batch
                    where origin = 'adjustment' and location_id = :'loc_1'::uuid)));


-- ==================== 7. what ONE CONNECTION cannot prove ====================
-- ⚠️ ADR-035 §2.10's concurrency row — "two sessions, last unit, enforcement ON
-- → exactly one succeeds" — IS NOT ASSERTED ABOVE AND CANNOT BE. Every check in
-- this file runs on one connection, and one session cannot block on its own
-- lock: a single-connection version of that claim passes green with the `for
-- update` deleted, which is exactly the trap
-- `supabase/tests/0005_allocation_concurrency.sh` was written to avoid for the
-- allocator and the reason it became a Vitest suite in 3.7b.
--
-- ✅ IT IS NOW ASSERTED NEXT DOOR, as of docs/PLAN.md task 4c-ii, 2026-09-04:
-- `supabase/vitest/test/availability-race.test.ts`, three races and thirteen
-- tests on two real connections, naming the blocking pid rather than merely
-- observing that some wait occurred. This file's green is still not the whole of
-- §2.10 — it is the half a single connection can see — and it is said out loud
-- here for the same reason check 2.9 of `supabase/tests/0016` says it about
-- §2.6's third idempotency row.
--
-- ⚠️⚠️ AND THAT SUITE FOUND SOMETHING NEITHER FILE'S PROSE HAD ANTICIPATED. The
-- clause as §2.10 words it — "exactly one succeeds" — is ALSO satisfied by an
-- enforcement path that refuses every concurrent second sale whether or not the
-- shelf could serve it. `for update skip locked` is exactly that, and it is the
-- idiom a reviewer reaches for around a contended row. Its falsification W-F5
-- leaves all four of the last-unit race's outcome assertions GREEN; what catches
-- it is a SECOND race with two units on the shelf, where both tills must be
-- served. Recorded here because the wrong answer lives in THIS file's `for
-- update`, not in the suite that found it.
--
-- What IS asserted here is the half a single connection CAN see: that the lock
-- is taken over the right rows in the right order, by reading the source. The
-- ordering is `allocate_fefo()`'s verbatim, which is the property that makes
-- 0017 introduce no new lock ordering — argued in the migration, and the reason
-- a reviewer should be able to see the two clauses side by side.
select chk('7.1 the enforcement lock uses allocate_fefo''s OWN order — no second '
           'lock ordering was introduced (structural; the race is 4c-ii)',
           (select p.prosrc like '%for update%'
                   and p.prosrc like '%expiry_date asc nulls last%'
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'record_sale'));


-- ============================== 8. the closing state =========================
-- ⚠️ EVERY REFUSAL ABOVE IS GREEN OVER AN EMPTY DATABASE. Sections 2, 3, 5 and
-- 6 contain nine `chk_raises` calls, and a fixture whose stock never arrived
-- would make every one of them pass for the wrong reason — the vacuous shape
-- 3.1's counter and 3.4's floor both exist to refuse. So the sales that DID
-- record are counted.
--
-- SEVEN SALES: 1.3 (dormant oversale), 2.3 (the opt-out), 2.4 (the workspace
-- switched back), 3.2 (the exact fit), 4.1 (offline), 6.1's drain, and 6.4
-- (offline into branch 3). Nine refusals wrote nothing.
select chk('8.1 the file really recorded the sales it then made claims about',
           (select count(*) from sale) = 7
       and (select count(*) from sale_line) = 7
       and (select count(*) from stock_movement where reason = 'sale') = 7,
           format('sales=%s lines=%s movements=%s',
                  (select count(*) from sale),
                  (select count(*) from sale_line),
                  (select count(*) from stock_movement where reason = 'sale')));

select chk('8.2 …and every one went through the RPC — none has an empty hash',
           not exists (select 1 from sale where btrim(payload_hash) = ''));

-- ⚠️ AND THE REFUSALS REALLY REFUSED. Nine ids were sent and rejected; not one
-- of them may exist. A `chk_raises` that went green on the WRONG exception —
-- a typo in the payload, say — would leave this green too, which is why the
-- sqlstate is asserted at each call site as well as the absence here.
select chk('8.3 not one of the nine refused ids reached the table',
           (select count(*) from sale where id in (
              :s_enf::uuid, :s_wsdef::uuid, :s_over1::uuid, :s_twice::uuid,
              :s_mixed::uuid, :s_branch2::uuid, :s_branch3::uuid)) = 0);

-- §2.4 has to survive everything above, including two deliberate overdraws.
select chk('8.4 the §2.4 invariant holds over every document this file wrote',
           (select count(*) from batch_balance_violations()) = 0);

select chk('8.5 …and 0015 does too — no lot was opened without its receipt',
           not exists (
             select 1 from stock_batch sb
              where sb.origin = 'purchase'
                and not exists (select 1 from stock_movement sm
                                 where sm.batch_id = sb.id and sm.reason = 'purchase')));

-- The helpers this file invented, removed by the file that invented them.
drop function public._call(uuid, uuid, jsonb, timestamptz, boolean);
drop function public._ln(uuid, numeric);
drop function public.chk_message(text, text, text[]);


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  -- ⚠️ `is not true`, NOT `not passed` — a NULL condition prints FAIL and is
  -- invisible to `not passed`. Found in 4b-i; see the note in the other suites.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
