-- ============================================================================
-- Behavioural verification for 0019 — record_waste()
-- ============================================================================
-- ADR-035 §1, §2.4, §2.5, §2.6, §2.7, §2.8, §9. docs/PLAN.md task 4d-ii.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0019_record_waste.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `record_waste` is the third RPC and the one Desperdicio calls. It is the SALE
-- shape wearing a different document: stock leaves, so the default denomination
-- is the SELL unit and the money anchors on the shelf price — the opposite of
-- `record_purchase` on both counts, and section 3 and section 4 are those two
-- contrasts made falsifiable.
--
-- Two things are this function's alone:
--
--   THE COST SNAPSHOT. `waste_line.unit_cost_net_per_base` has no counterpart on
--   `sale_line`. A write-off spans lots bought at different prices and the line
--   is one row, so the column is the QUANTITY-WEIGHTED MEAN of what the
--   allocator took. 0011's header already states that shape and
--   `supabase/checks/0011` already reconciles it against the per-lot costs on
--   the movements — so this is not a new rule, it is an existing one finally
--   having a function that must obey it. Section 5.
--
--   ⚠️⚠️ NO AVAILABILITY CHECK, SETTLED BY THE OWNER 2026-09-04. Section 6 is
--   that decision, and it is the section this task existed to write.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT CONCURRENCY — one connection cannot block on its own lock
-- (4c-i F6, 4c-ii W-F1). `record_waste` DOES call `allocate_fefo()` and does
-- hold its locks, so unlike `record_purchase` there is something here a race
-- could say. It is not owed by any §2.10 row, and 3.7a already names the
-- blocking pid on `waste` among its three tables.
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

-- `create or replace` is load-bearing — 0016, 0017 and 0018 all record why.
create or replace function public._call(p_id uuid, p_loc uuid, p_lines jsonb,
                             p_at timestamptz default null,
                             p_off boolean default false)
returns text language sql as $$
  select format('select public.record_waste(%L::uuid, %L::uuid, %L::jsonb, '
                '%L::timestamptz, %L::boolean)',
                p_id, p_loc, p_lines, p_at, p_off)
$$;
grant execute on function public._call(uuid, uuid, jsonb, timestamptz, boolean)
  to authenticated;

create or replace function public._sale(p_id uuid, p_loc uuid, p_lines jsonb)
returns text language sql as $$
  select format('select public.record_sale(%L::uuid, %L::uuid, %L::jsonb)',
                p_id, p_loc, p_lines)
$$;
grant execute on function public._sale(uuid, uuid, jsonb) to authenticated;

-- One waste line. `reason` defaults to a real value so the sections that are not
-- about the reason do not have to repeat it; section 2 passes it explicitly.
create or replace function public._wl(p_variant uuid, p_qty numeric,
                             p_price numeric default 10.00,
                             p_reason text default 'caducado',
                             p_unit text default null)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
           'variant_id',                p_variant,
           'qty_display',               p_qty,
           'unit_price_gross_per_base', p_price,
           'reason',                    p_reason,
           'qty_display_unit',          p_unit)))
$$;
grant execute on function public._wl(uuid, numeric, numeric, text, text) to authenticated;

-- The sell-side equivalent, for section 6's pair.
create or replace function public._sl(p_variant uuid, p_qty numeric,
                             p_price numeric default 10.00)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_gross_per_base', p_price))
$$;
grant execute on function public._sl(uuid, numeric, numeric) to authenticated;


-- ---------------------------------------------------------------- fixture ----
-- ONE workspace, TWO stores, a manager and a cashier. The cashier is assigned to
-- loc_1 only — the location wall needs somewhere to be refused from — and holds
-- `staff`, which is what makes section 9's read asymmetry observable.
--
-- THE VARIANTS:
--   var_two     TWO lots at DIFFERENT costs — section 5's weighted mean. It is
--               the only shape that can tell a mean from either lot's own cost
--   var_enf     enforce_stock TRUE, one unit on the shelf — section 6's pair.
--               A sale of 3 is refused; a write-off of 3 is not
--   var_never   enforce_stock TRUE, never stocked — section 6's branch 3
--   var_iva     16%, and
--   var_zero    0%, for section 3's mixed-rate document
--   var_kg      base g, PURCHASE kg, SELL 100g — section 4's discriminator, the
--               same variant shape 0018 used and read the other way

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'cashier.a@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'owner.b@example.mx');

\set owner_a   '''11111111-1111-1111-1111-111111111111'''
\set cashier_a '''22222222-2222-2222-2222-222222222222'''

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

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :cashier_a, 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate,
       enforce_stock) values
  (:'ws_a', :'fam', 'Yogurt',        'pza','pza','pza', 'pza',  0.0000, null),
  (:'ws_a', :'fam', 'Pan exigido',   'pza','pza','pza', 'pza',  0.0000, true),
  (:'ws_a', :'fam', 'Pan inedito',   'pza','pza','pza', 'pza',  0.0000, true),
  (:'ws_a', :'fam', 'Jabon 16',      'pza','pza','pza', 'pza',  0.1600, null),
  (:'ws_a', :'fam', 'Jabon exento',  'pza','pza','pza', 'pza',  0.0000, null),
  (:'ws_a', :'fam', 'Queso granel',  'g',  'kg', '100g','100g', 0.0000, null),
  (:'ws_a', :'fam', 'Pan tardio',    'pza','pza','pza', 'pza',  0.0000, null);

select id as var_two   from product_variant where workspace_id=:'ws_a' and name='Yogurt'       \gset
select id as var_enf   from product_variant where workspace_id=:'ws_a' and name='Pan exigido'  \gset
select id as var_never from product_variant where workspace_id=:'ws_a' and name='Pan inedito'  \gset
select id as var_iva   from product_variant where workspace_id=:'ws_a' and name='Jabon 16'     \gset
select id as var_zero  from product_variant where workspace_id=:'ws_a' and name='Jabon exento' \gset
select id as var_kg    from product_variant where workspace_id=:'ws_a' and name='Queso granel' \gset
select id as var_late  from product_variant where workspace_id=:'ws_a' and name='Pan tardio'   \gset

insert into product_family (workspace_id, name) values (:'ws_b', 'Ajena');
select id as fam_b from product_family where workspace_id=:'ws_b' \gset
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws_b', :'fam_b', 'Ajeno', 'pza','pza','pza','pza');
select id as var_b from product_variant where workspace_id=:'ws_b' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

-- ⚠️ THE STOCK IS PUT ON THE SHELF BY `record_purchase` — 0018, merged one task
-- ago — RATHER THAN BY HAND. Every earlier suite hand-rolled its fixture with
-- raw INSERTs inside a `begin … commit` to satisfy 0015. This one does not have
-- to, and using the RPC means the fixture is built by the same path a shop uses.
--
-- var_two gets TWO deliveries at DIFFERENT costs, ten days apart, so FEFO has a
-- real order to walk and the two lots have distinguishable costs: 10 at 2.00
-- then 10 at 5.00.
\set pur_1 '''cccc0019-0000-0000-0000-000000000001'''
\set pur_2 '''cccc0019-0000-0000-0000-000000000002'''
\set pur_3 '''cccc0019-0000-0000-0000-000000000003'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:pur_1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_two'::uuid,
           'qty_display', 10, 'unit_price_net_per_base', 2.00)),
         now() - interval '48 hours', true) as r \gset
select record_purchase(:pur_2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_two'::uuid,
           'qty_display', 10, 'unit_price_net_per_base', 5.00)),
         now() - interval '24 hours', true) as r \gset
select record_purchase(:pur_3::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_enf'::uuid,
             'qty_display', 1, 'unit_price_net_per_base', 3.00),
           jsonb_build_object('variant_id', :'var_iva'::uuid,
             'qty_display', 20, 'unit_price_net_per_base', 1.00),
           jsonb_build_object('variant_id', :'var_zero'::uuid,
             'qty_display', 20, 'unit_price_net_per_base', 1.00),
           jsonb_build_object('variant_id', :'var_kg'::uuid,
             'qty_display', 5, 'unit_price_net_per_base', 0.02))) as r \gset
commit;

select chk('0.1 the fixture was built by record_purchase (0018), and the shelf '
           'holds what it delivered — 20 of the two-lot variant in TWO lots',
           (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_two'::uuid) = 20
       and (select count(*) from batch_balance
             where variant_id = :'var_two'::uuid and remaining_base > 0) = 2);

select chk('0.2 …and the two lots really do have DIFFERENT costs, which is what '
           'makes section 5''s weighted mean able to fail',
           (select count(distinct unit_cost_net_per_base) from stock_batch
             where variant_id = :'var_two'::uuid) = 2);


-- ================================================================= 1 ==========
-- THE LOCATION WALL — this function's own, `security definer`, nothing in the
-- schema catches its absence.
-- =============================================================================

\set w_nullloc '''aaaa0019-0000-0000-0000-000000000001'''
\set w_other   '''aaaa0019-0000-0000-0000-000000000002'''
\set w_unassn  '''aaaa0019-0000-0000-0000-000000000003'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('1.1 a NULL location is refused, and first',
                  public._call(:w_nullloc::uuid, null, public._wl(:'var_two'::uuid, 1)),
                  '42501');
select chk_raises('1.2 another tenant''s location is refused',
                  public._call(:w_other::uuid, :'loc_b'::uuid, public._wl(:'var_two'::uuid, 1)),
                  '42501');
-- ⚠️ `commit`, NOT `rollback`, AND IT IS LOAD-BEARING. `chk_raises` records its
-- verdict by INSERTING into `public._verify`; a block that ended in `rollback`
-- would throw that row away and the check would VANISH from the report rather
-- than fail. 4d-i lost EIGHTEEN checks to exactly this and still reported "all
-- 62 checks passed". Nothing in these blocks writes anything else — that is what
-- 1.4, 2.10 and 10.3 assert — and check 10.6 is the guard that makes a
-- recurrence impossible to miss.
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('1.3 a store in the caller''s OWN workspace that they are not '
                  'assigned to is refused — the wall is per store',
                  public._call(:w_unassn::uuid, :'loc_2'::uuid, public._wl(:'var_two'::uuid, 1)),
                  '42501');
commit;

select chk('1.4 …and not one of the three wrote a header or a movement',
           (select count(*) from waste
             where id in (:w_nullloc::uuid, :w_other::uuid, :w_unassn::uuid)) = 0
       and (select count(*) from stock_movement where reason = 'waste') = 0);


-- ================================================================= 2 ==========
-- THE PAYLOAD, INCLUDING THE COLUMN THAT IS THIS DOCUMENT'S FIRST QUESTION.
-- §2.8 makes Desperdicio reason-first: the screen asks WHY before it asks what.
-- =============================================================================

\set w_bad1 '''aaaa0019-0000-0000-0000-000000000011'''
\set w_bad2 '''aaaa0019-0000-0000-0000-000000000012'''
\set w_bad3 '''aaaa0019-0000-0000-0000-000000000013'''
\set w_bad4 '''aaaa0019-0000-0000-0000-000000000014'''
\set w_bad5 '''aaaa0019-0000-0000-0000-000000000015'''
\set w_bad6 '''aaaa0019-0000-0000-0000-000000000016'''
\set w_bad7 '''aaaa0019-0000-0000-0000-000000000017'''
\set w_bad8 '''aaaa0019-0000-0000-0000-000000000018'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('2.1 a NULL id is refused — the client generates it',
                  public._call(null, :'loc_1'::uuid, public._wl(:'var_two'::uuid, 1)),
                  '22023');
select chk_raises('2.2 an EMPTY line array is refused',
                  public._call(:w_bad1::uuid, :'loc_1'::uuid, '[]'::jsonb),
                  '22023');

-- ⚠️ THE REASON IS REQUIRED AND MUST NOT DEFAULT. An enum with a default would
-- file every unlabelled loss under one cause, and the whole analytics asset §2.8
-- describes is worth exactly as much as this column's honesty.
select chk_message('2.3 a line with NO reason is refused, and the message says '
                   'Desperdicio is reason-first',
                   public._call(:w_bad2::uuid, :'loc_1'::uuid,
                     jsonb_build_array(jsonb_build_object(
                       'variant_id', :'var_two'::uuid, 'qty_display', 1,
                       'unit_price_gross_per_base', 10.00))),
                   array['reason is required']);

-- An UNKNOWN cause raises from the cast (22P02) rather than being filed under a
-- guess. The vocabulary is workspace-global (0003) precisely so it cannot drift.
select chk_raises('2.4 an UNKNOWN reason is refused by the enum, not coerced — '
                  'the vocabulary is global so causes compare across shops',
                  public._call(:w_bad3::uuid, :'loc_1'::uuid,
                               public._wl(:'var_two'::uuid, 1, 10.00, 'se echo a perder')),
                  '22P02');

select chk_raises('2.5 a line with no variant_id is refused',
                  public._call(:w_bad4::uuid, :'loc_1'::uuid,
                    jsonb_build_array(jsonb_build_object(
                      'qty_display', 1, 'unit_price_gross_per_base', 10.00,
                      'reason', 'caducado'))),
                  '22023');

select chk_raises('2.6 another tenant''s variant is refused',
                  public._call(:w_bad5::uuid, :'loc_1'::uuid, public._wl(:'var_b'::uuid, 1)),
                  '22023');

select chk_raises('2.7 a unit from another DIMENSION is refused (§2.5.2)',
                  public._call(:w_bad6::uuid, :'loc_1'::uuid,
                               public._wl(:'var_kg'::uuid, 1, 10.00, 'caducado', 'l')),
                  '22023');

select chk_message('2.8 a NEGATIVE quantity is refused, and the message says '
                   'undoing a write-off is a VOID',
                   public._call(:w_bad7::uuid, :'loc_1'::uuid, public._wl(:'var_two'::uuid, -1)),
                   array['void_transaction']);

-- ⚠️ 0018's SECOND ROUNDING GATE, INHERITED. `qty_display` is numeric(14,3) as
-- well as `qty_base`, so on a unit coarser than the base a quantity can survive
-- the base check and vanish in the keyed one. 0.0004 of a 100g unit is 0.04 g —
-- fine in grams, zero as keyed. Without the second arm this is refused by
-- `waste_line_qty_display_agrees` with 23514 and a constraint name. THE SQLSTATE
-- IS THE WHOLE ASSERTION.
select chk_raises('2.9 a quantity that survives the base unit but ROUNDS TO ZERO '
                  'IN THE KEYED one is refused by the RPC (22023), not by a '
                  'CHECK constraint (23514) — 4d-i''s finding, inherited',
                  public._call(:w_bad8::uuid, :'loc_1'::uuid,
                               public._wl(:'var_kg'::uuid, 0.0004)),
                  '22023');
commit;

select chk('2.10 not one of the refused ids reached the table',
           (select count(*) from waste where id in (
              :w_bad1::uuid, :w_bad2::uuid, :w_bad3::uuid, :w_bad4::uuid,
              :w_bad5::uuid, :w_bad6::uuid, :w_bad7::uuid, :w_bad8::uuid)) = 0);


-- ================================================================= 3 ==========
-- THE MONEY IS THE **SALE** SHAPE — GROSS-FIRST, tax the residual, because
-- `line_net` here is the RETAIL VALUE of the loss and a retail value is a shelf
-- price. This is the exact opposite anchor to `record_purchase` (0018), and the
-- two files use the same mixed-rate fixture so the contrast is readable.
-- =============================================================================

\set w_mix '''aaaa0019-0000-0000-0000-000000000021'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_mix::uuid, :'loc_1'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_iva'::uuid, 'qty_display', 7,
             'unit_price_gross_per_base', 3.33, 'reason', 'dañado'),
           jsonb_build_object('variant_id', :'var_zero'::uuid, 'qty_display', 5,
             'unit_price_gross_per_base', 2.50, 'reason', 'caducado'))) as r \gset
commit;

-- GROSS-first: round(3.33 x 7, 2) = 23.31 gross, then 23.31 / 1.16 = 20.09...
-- -> 20.09 net, residual 3.22. ⚠️ NET-FIRST ON THE SAME NUMBERS WOULD GIVE
-- 23.31 net and 3.73 tax — 0018's answer, and 3.4 names it as the wrong one.
select chk('3.1 the 16% line anchors on the SHELF price: gross 23.31, net 20.09',
           (select line_net from waste_line
             where waste_id = :w_mix::uuid and variant_id = :'var_iva'::uuid) = 20.09,
           format('net=%s', (select line_net from waste_line
             where waste_id = :w_mix::uuid and variant_id = :'var_iva'::uuid)));

select chk('3.2 …and the tax is the RESIDUAL: 23.31 - 20.09 = 3.22',
           (select tax_amount from waste_line
             where waste_id = :w_mix::uuid and variant_id = :'var_iva'::uuid) = 3.22);

select chk('3.3 the zero-rated line in the SAME document carries no tax — a '
           'mixed document, which is the only shape that discriminates',
           (select line_net from waste_line
             where waste_id = :w_mix::uuid and variant_id = :'var_zero'::uuid) = 12.50
       and (select tax_amount from waste_line
             where waste_id = :w_mix::uuid and variant_id = :'var_zero'::uuid) = 0.00);

-- ⚠️ THE CONTRAST WITH 0018, NAMED. record_purchase on these numbers produces
-- 23.31 net and 3.73 tax; record_waste produces 20.09 and 3.22. If this file
-- ever went net-first it would agree with 0018 and this check is what notices.
select chk('3.4 …and it is NOT record_purchase''s answer — net-first on the same '
           'line gives 23.31/3.73, and this document says 20.09/3.22',
           (select line_net from waste_line
             where waste_id = :w_mix::uuid and variant_id = :'var_iva'::uuid)
           <> round(3.33 * 7, 2));

select chk('3.5 the header totals are the sum of the rounded lines (§2.5 rule 5)',
           (select total_net from waste where id = :w_mix::uuid) = 32.59
       and (select total_tax from waste where id = :w_mix::uuid) = 3.22,
           format('net=%s tax=%s',
                  (select total_net from waste where id = :w_mix::uuid),
                  (select total_tax from waste where id = :w_mix::uuid)));

select chk('3.6 tax_rate is snapshotted FROM THE VARIANT — the client never sent '
           'one, and the 16% line proves it did not default to zero',
           (select tax_rate from waste_line
             where waste_id = :w_mix::uuid and variant_id = :'var_iva'::uuid) = 0.1600);

-- ⚠️ THE IDENTITY IS THE GROSS-FIRST ONE, AND IT IS NOT 0018's. On the buy side
-- the net is the anchor and `net + tax = round(net x (1+rate), 2)` holds. Here
-- the GROSS is the anchor and the net is reached by DIVISION, so the identity
-- runs the other way: the net must be the rounded quotient of the gross. The
-- two are not interchangeable — this file was first written with 0018's
-- spelling and it went red on the 16% line, because round(20.09 x 1.16, 2) is
-- 23.30 and the document's gross is 23.31. That centavo is rule 4 (§2.5) doing
-- its job, and it only has teeth on this side of the ledger.
select chk('3.7 the GROSS-FIRST residual identity holds on every waste line: '
           'net = round((net + tax) / (1 + rate), 2). ⚠️ NOT 0018''s identity — '
           'the anchor differs, so the algebra does',
           not exists (select 1 from waste_line wl
                        where wl.line_net
                           <> round((wl.line_net + wl.tax_amount)
                                    / (1 + wl.tax_rate), 2)),
           format('lines=%s', (select count(*) from waste_line)));

select chk('3.8 …and every header equals the sum of its own rounded lines',
           not exists (
             select 1 from waste w
              join (select waste_id, sum(line_net) n, sum(tax_amount) t
                      from waste_line group by waste_id) s on s.waste_id = w.id
              where w.total_net <> s.n or w.total_tax <> s.t));


-- ================================================================= 4 ==========
-- THE DEFAULT DENOMINATION IS THE **SELL** UNIT — `record_sale`'s, not
-- `record_purchase`'s. Stock is LEAVING, and it leaves in the denomination it is
-- sold in. `var_kg` buys in kg and sells in 100g, so the two readings differ by
-- a factor of ten and reading the wrong one is visible.
-- =============================================================================

\set w_unit1 '''aaaa0019-0000-0000-0000-000000000031'''
\set w_unit2 '''aaaa0019-0000-0000-0000-000000000032'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_unit1::uuid, :'loc_1'::uuid,
                    public._wl(:'var_kg'::uuid, 2, 0.50)) as r \gset
select record_waste(:w_unit2::uuid, :'loc_1'::uuid,
                    public._wl(:'var_kg'::uuid, 2, 0.50, 'caducado', 'kg')) as r \gset
commit;

select chk('4.1 with no unit given, 2 of "Queso granel" is 2 x 100g = 200 g — the '
           'SELL unit, because the stock is leaving',
           (select qty_base from waste_line where waste_id = :w_unit1::uuid) = 200,
           format('qty_base=%s',
                  (select qty_base from waste_line where waste_id = :w_unit1::uuid)));

select chk('4.2 …and the unit stored on the line is 100g',
           (select qty_display_unit from waste_line where waste_id = :w_unit1::uuid) = '100g');

select chk('4.3 an EXPLICIT unit overrides it — the same "2" is 2000 g in kg',
           (select qty_base from waste_line where waste_id = :w_unit2::uuid) = 2000);

-- ⚠️ ANTI-VACUITY, and it is the contrast with 0018 that makes it worth having:
-- the SAME variant, read the other way, is that file's check 4.1. If the two
-- denominations were ever equal, both files would pass under either reading.
select chk('4.4 …and the two denominations really disagree, so 4.1 can fail — '
           'this is 0018 check 4.1 read in the opposite direction',
           (select qty_base from waste_line where waste_id = :w_unit1::uuid)
        <> (select qty_base from waste_line where waste_id = :w_unit2::uuid));


-- ================================================================= 5 ==========
-- THE COST SNAPSHOT — the quantity-weighted mean, and the one column
-- `sale_line` has no counterpart for. 0011's header states the shape and
-- `supabase/checks/0011` reconciles it against the movements' per-lot costs, so
-- this is an existing rule finally getting a function that must obey it.
-- =============================================================================

\set w_one  '''aaaa0019-0000-0000-0000-000000000041'''
\set w_span '''aaaa0019-0000-0000-0000-000000000042'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
-- 4 units, entirely inside the FIRST (older, 2.00) lot.
select record_waste(:w_one::uuid, :'loc_1'::uuid,
                    public._wl(:'var_two'::uuid, 4, 10.00)) as r \gset
-- 10 more: 6 left in the first lot at 2.00, then 4 from the second at 5.00.
-- Weighted mean = (6x2 + 4x5) / 10 = 32/10 = 3.200000
select record_waste(:w_span::uuid, :'loc_1'::uuid,
                    public._wl(:'var_two'::uuid, 10, 10.00)) as r \gset
commit;

select chk('5.1 a write-off inside ONE lot takes that lot''s cost exactly',
           (select unit_cost_net_per_base from waste_line where waste_id = :w_one::uuid)
           = 2.000000,
           format('cost=%s', (select unit_cost_net_per_base from waste_line
                               where waste_id = :w_one::uuid)));

select chk('5.2 …and it wrote ONE movement, against that one lot',
           (select count(*) from stock_movement where waste_id = :w_one::uuid) = 1);

-- ⚠️ THE CHECK THIS SECTION EXISTS FOR. Six units at 2.00 and four at 5.00 is a
-- mean of 3.20 — which is NEITHER lot's cost, so a version that took the first
-- lot's, the last lot's, or a plain average of the two distinct values (3.50)
-- is red here.
select chk('5.3 A WRITE-OFF SPANNING TWO LOTS TAKES THE QUANTITY-WEIGHTED MEAN: '
           '(6 x 2.00 + 4 x 5.00) / 10 = 3.200000',
           (select unit_cost_net_per_base from waste_line where waste_id = :w_span::uuid)
           = 3.200000,
           format('cost=%s', (select unit_cost_net_per_base from waste_line
                               where waste_id = :w_span::uuid)));

select chk('5.4 …and it is NOT either lot''s own cost, nor the unweighted mean '
           'of the two — 2.00, 5.00 and 3.50 are all wrong answers',
           (select unit_cost_net_per_base from waste_line where waste_id = :w_span::uuid)
             not in (2.000000, 5.000000, 3.500000));

select chk('5.5 …and it wrote TWO movements, one per lot, FEFO order — the '
           'oldest lot first',
           (select count(*) from stock_movement where waste_id = :w_span::uuid) = 2);

-- ⚠️ 0011's RULE, ASSERTED HERE RATHER THAN LEFT TO THE SEED CHECK. The
-- movements carry the per-lot cost EXACTLY; the line carries a rounded mean.
-- Their totals must agree to within the rounding, which is what makes
-- `product_waste_daily` able to take its numerator from the ledger and still
-- reconcile against the document.
select chk('5.6 the LINE''s mean x quantity reconciles with the MOVEMENTS'' exact '
           'per-lot costs, to within the numeric(14,6) rounding — 0011''s rule',
           abs((select wl.unit_cost_net_per_base * wl.qty_base from waste_line wl
                 where wl.waste_id = :w_span::uuid)
             - (select sum(-m.qty_base * m.unit_cost_net_per_base)
                  from stock_movement m where m.waste_id = :w_span::uuid)) < 0.01,
           format('line=%s ledger=%s',
                  (select wl.unit_cost_net_per_base * wl.qty_base from waste_line wl
                    where wl.waste_id = :w_span::uuid),
                  (select sum(-m.qty_base * m.unit_cost_net_per_base)
                     from stock_movement m where m.waste_id = :w_span::uuid)));

select chk('5.7 the movements are NEGATIVE and reason = waste — the sign is '
           'stock_movement_sign_follows_reason''s, not ours',
           not exists (select 1 from stock_movement
                        where reason = 'waste' and qty_base >= 0));

select chk('5.8 …and the shelf came down by exactly what was written off: '
           '20 delivered, 14 wasted, 6 left',
           (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_two'::uuid) = 6,
           format('shelf=%s', (select coalesce(sum(remaining_base), 0)
                                 from batch_balance where variant_id = :'var_two'::uuid)));


-- ================================================================= 6 ==========
-- ⚠️⚠️ NO AVAILABILITY CHECK — WASTE RECORDS UNCONDITIONALLY.
--
-- Settled by the owner on 2026-09-04, after 4c-i left the question open BY NAME
-- rather than answering it by writing the code first. This is the section the
-- whole task existed to write.
--
--   THE LOSS ALREADY HAPPENED. Refusing to record spoilage because the shelf
--   already reads zero does not put the carton back — it discards the only
--   record that it ever existed, and "what am I losing, and why" (§2.8) is the
--   one question Desperdicio is for. A shop whose books already disagree with
--   its shelf is precisely the shop that most needs the write-off recorded.
--
-- The debt stays VISIBLE as a negative balance — §1, "stock is recorded, not
-- enforced" — rather than being hidden behind a refusal.
-- =============================================================================

\set w_over  '''aaaa0019-0000-0000-0000-000000000051'''
\set w_never '''aaaa0019-0000-0000-0000-000000000052'''
\set s_over  '''aaaa0019-0000-0000-0000-000000000053'''

-- `var_enf` opts IN to enforcement and has exactly ONE unit on the shelf.
select chk('6.1 the fixture is armed: the variant OPTS IN to enforcement and has '
           'exactly one unit — so 0017 has every reason to refuse',
           (select enforce_stock from product_variant where id = :'var_enf'::uuid) = true
       and (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_enf'::uuid) = 1);

-- ⚠️ THE PAIR, AND IT IS THE WHOLE ARGUMENT. Same variant, same store, same
-- quantity, same enforcement — one refused, one recorded. Nothing but the
-- DOCUMENT KIND differs, so nothing else can explain the difference.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select chk_raises('6.2 THE PAIR, HALF ONE — a SALE of 3 with one on the shelf is '
                  'REFUSED with TD002, because 0017 enforces this variant',
                  public._sale(:s_over::uuid, :'loc_1'::uuid,
                               public._sl(:'var_enf'::uuid, 3)),
                  'TD002');
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_over::uuid, :'loc_1'::uuid,
                    public._wl(:'var_enf'::uuid, 3, 10.00, 'robo o faltante')) as r \gset
commit;

select chk('6.3 THE PAIR, HALF TWO — the SAME quantity of the SAME enforced '
           'variant is RECORDED as waste. The loss already happened (owner, '
           '2026-09-04)',
           (select count(*) from waste where id = :w_over::uuid) = 1
       and (select count(*) from waste_line where waste_id = :w_over::uuid) = 1);

select chk('6.4 …and the debt is VISIBLE on the shelf as a negative balance, not '
           'hidden by a refusal — §1, stock is recorded, not enforced',
           (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_enf'::uuid) = -2,
           format('shelf=%s', (select coalesce(sum(remaining_base), 0)
                                 from batch_balance where variant_id = :'var_enf'::uuid)));

-- Branch 1, not branch 3. An overdraw that opened an `adjustment` lot would look
-- identical on quantity and would put a fictional zero-cost lot at the head of
-- the FEFO order. 0016 check 6.2 and 0017 check 1.5 make the same separation.
select chk('6.5 …and it OVERDREW the existing lot rather than inventing an '
           'adjustment one — branch 1, and the cost is still the real lot''s',
           (select count(*) from stock_batch
             where variant_id = :'var_enf'::uuid and origin = 'adjustment') = 0
       and (select unit_cost_net_per_base from waste_line where waste_id = :w_over::uuid)
           = 3.000000);

-- ⚠️ THE OTHER SHORTFALL BRANCH. `var_never` was never delivered to this store,
-- so there is no lot to overdraw and the allocator must OPEN one — branch 3,
-- an `adjustment` lot at zero cost. Enforcement is ON for this variant too.
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_never::uuid, :'loc_1'::uuid,
                    public._wl(:'var_never'::uuid, 2, 10.00, 'error de captura')) as r \gset
commit;

select chk('6.6 a write-off of stock this store NEVER HELD is recorded too — the '
           'allocator opens an adjustment lot (branch 3), enforcement ON',
           (select count(*) from waste where id = :w_never::uuid) = 1
       and (select count(*) from stock_batch
             where variant_id = :'var_never'::uuid and origin = 'adjustment') = 1);

select chk('6.7 …and that lot is at ZERO cost, so the line''s cost snapshot is '
           'zero — an honest "we do not know what this cost"',
           (select unit_cost_net_per_base from waste_line where waste_id = :w_never::uuid)
           = 0.000000);

select chk('6.8 …and the adjustment lot is OUTSIDE 0015''s rule, which is why a '
           'write-off can open one without a receipt to fill it',
           (select count(*) from receipt_completeness_violations()) = 0);

-- ⚠️ THE FUNCTION NEVER CONSULTS ENFORCEMENT AT ALL. 6.2 vs 6.3 shows the
-- outcome differs; this shows the mechanism is absent rather than merely
-- resolving to false. If `record_waste` ever grew the check, turning the
-- WORKSPACE default on would be the cheapest way to make it fire — and it does
-- not, on either variant.
update workspace_setting set enforce_stock_default = true where workspace_id = :'ws_a';

\set w_wsdef '''aaaa0019-0000-0000-0000-000000000054'''
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_wsdef::uuid, :'loc_1'::uuid,
                    public._wl(:'var_enf'::uuid, 5, 10.00, 'dañado')) as r \gset
commit;

select chk('6.9 with the WORKSPACE default switched ON as well, a write-off '
           'against an already-negative shelf still records — the check is '
           'ABSENT, not merely resolving to false',
           (select count(*) from waste where id = :w_wsdef::uuid) = 1
       and (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_enf'::uuid) = -7,
           format('shelf=%s', (select coalesce(sum(remaining_base), 0)
                                 from batch_balance where variant_id = :'var_enf'::uuid)));

update workspace_setting set enforce_stock_default = false where workspace_id = :'ws_a';


-- ================================================================= 7 ==========
-- IDEMPOTENCY — §2.6's four rows, and the column that is this document's own.
-- =============================================================================

\set w_idem '''aaaa0019-0000-0000-0000-000000000061'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_idem::uuid, :'loc_1'::uuid,
                    public._wl(:'var_two'::uuid, 2, 10.00, 'caducado')) as r1 \gset
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_idem::uuid, :'loc_1'::uuid,
                    public._wl(:'var_two'::uuid, 2, 10.00, 'caducado')) as r2 \gset
commit;

select chk('7.1 §2.6 row 1 — the same payload returns already_recorded = true',
           (:'r1'::jsonb->>'already_recorded')::boolean = false
       and (:'r2'::jsonb->>'already_recorded')::boolean = true);

-- ⚠️ AND IT TOOK NO SECOND BITE OUT OF THE SHELF. A retried write-off that
-- allocated again would take the stock twice — the loss doubles, and every lot
-- it touched is now wrong. This is the expensive half of idempotency here.
select chk('7.2 …and it allocated NOTHING a second time: one line, one movement, '
           'and the shelf moved once',
           (select count(*) from waste_line where waste_id = :w_idem::uuid) = 1
       and (select count(*) from stock_movement where waste_id = :w_idem::uuid) = 1,
           format('lines=%s movements=%s',
                  (select count(*) from waste_line where waste_id = :w_idem::uuid),
                  (select count(*) from stock_movement where waste_id = :w_idem::uuid)));

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select chk_raises('7.3 §2.6 row 4 — the same id with a different QUANTITY raises TD001',
                  public._call(:w_idem::uuid, :'loc_1'::uuid,
                               public._wl(:'var_two'::uuid, 9, 10.00, 'caducado')),
                  'TD001');

-- ⚠️ THE COLUMN THIS DOCUMENT OWNS. Desperdicio's entire output is grouped by
-- reason, so the same stock written off as `robo o faltante` rather than
-- `caducado` is a DIFFERENT document — a corrected retry must raise rather than
-- return `already_recorded` over the first cause. Same argument 0018 makes for
-- `expiry_date`, and `record_sale` has nothing like either.
select chk_raises('7.4 …and so does the same id with a different REASON. The '
                  'cause is part of the payload, because it is what §2.8 reports on',
                  public._call(:w_idem::uuid, :'loc_1'::uuid,
                               public._wl(:'var_two'::uuid, 2, 10.00, 'robo o faltante')),
                  'TD001');
commit;

select chk('7.5 …and neither refusal took stock: still one movement for this id',
           (select count(*) from stock_movement where waste_id = :w_idem::uuid) = 1);


-- ================================================================= 8 ==========
-- THE TIMESTAMPS (§2.6). The clamp matters more here than anywhere else on this
-- surface: `occurred_at` is what `product_waste_daily` (0011) buckets on, in the
-- store's local day, and a write-off filed against the wrong day moves a number
-- on the one report this function exists to feed.
-- =============================================================================

\set w_on  '''aaaa0019-0000-0000-0000-000000000071'''
\set w_off '''aaaa0019-0000-0000-0000-000000000072'''
\set w_old '''aaaa0019-0000-0000-0000-000000000073'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_on::uuid, :'loc_1'::uuid, public._wl(:'var_zero'::uuid, 1, 1.00),
                    now() - interval '10 days', false) as r \gset
select record_waste(:w_off::uuid, :'loc_1'::uuid, public._wl(:'var_zero'::uuid, 1, 1.00),
                    now() - interval '5 hours', true) as r \gset
select record_waste(:w_old::uuid, :'loc_1'::uuid, public._wl(:'var_zero'::uuid, 1, 1.00),
                    now() - interval '400 days', true) as r \gset
commit;

select chk('8.1 ONLINE the server OVERRIDES the client''s occurred_at',
           (select occurred_at from waste where id = :w_on::uuid) > now() - interval '1 hour');

select chk('8.2 OFFLINE a time inside the window is KEPT',
           (select occurred_at from waste where id = :w_off::uuid)
             between now() - interval '5 hours 1 minute'
                 and now() - interval '4 hours 59 minutes');

select chk('8.3 OFFLINE a time older than 72h is CLAMPED to the floor, not refused',
           (select occurred_at from waste where id = :w_old::uuid)
             between now() - interval '72 hours 1 minute'
                 and now() - interval '71 hours 59 minutes');

select chk('8.4 recorded_at is the SERVER''S on all three — offline moves '
           'occurred_at and nothing else',
           not exists (select 1 from waste
                        where id in (:w_on::uuid, :w_off::uuid, :w_old::uuid)
                          and recorded_at < now() - interval '1 hour'));

-- The MOVEMENT carries occurred_at too, and that is what 0011 buckets on.
select chk('8.5 …and the MOVEMENT carries the clamped time, because '
           'product_waste_daily buckets the ledger and not the header',
           (select occurred_at from stock_movement where waste_id = :w_old::uuid)
           = (select occurred_at from waste where id = :w_old::uuid));

-- ⚠️⚠️ THE CLAMPED TIME MUST REACH THE ALLOCATOR, AND THIS CHECK EXISTS BECAUSE
-- A FALSIFICATION FOUND NOTHING. F10 changed `allocate_fefo(…, v_at)` to
-- `allocate_fefo(…, now())` and NOT ONE of the file's 65 checks moved.
--
-- It matters on exactly one path, which nothing above reached: a write-off whose
-- variant has no stock makes the allocator OPEN a lot (branch 3), and
-- `p_occurred_at` is what STAMPS that lot's `received_at`. `received_at` is
-- FEFO's tiebreak (§2.4). So a backdated write-off that opens a lot stamped
-- `now()` puts a lot dated TODAY at the back of the queue when it should be at
-- the front — and every subsequent sale of that variant consumes the wrong one.
-- 0016 states this reasoning at its own `allocate_fefo` call; nothing asserted
-- it until here.
--
-- Section 6 could not catch it: 6.6 opens a lot too, but ONLINE, where `v_at`
-- and `now()` are the same instant.
\set w_late '''aaaa0019-0000-0000-0000-000000000074'''
begin;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_late::uuid, :'loc_1'::uuid,
                    public._wl(:'var_late'::uuid, 2, 1.00, 'error de captura'),
                    now() - interval '60 hours', true) as r \gset
commit;

select chk('8.6 a BACKDATED write-off of stock that was never held opens its '
           'shortfall lot stamped with the CLAMPED time, not now() — '
           'received_at is FEFO''s tiebreak, so today''s date would jump the queue',
           (select sb.received_at from stock_batch sb
             where sb.variant_id = :'var_late'::uuid and sb.origin = 'adjustment')
           = (select occurred_at from waste where id = :w_late::uuid),
           format('lot=%s doc=%s',
                  (select sb.received_at from stock_batch sb
                    where sb.variant_id = :'var_late'::uuid and sb.origin = 'adjustment'),
                  (select occurred_at from waste where id = :w_late::uuid)));

-- ANTI-VACUITY: 8.6 only discriminates because the backdated time and `now()`
-- are far apart. If the clamp ever collapsed to now(), 8.6 would pass under
-- either spelling and prove nothing.
select chk('8.7 …and that stamp really is 60 hours in the past, so 8.6 can fail',
           (select sb.received_at from stock_batch sb
             where sb.variant_id = :'var_late'::uuid and sb.origin = 'adjustment')
             < now() - interval '59 hours');


-- ================================================================= 9 ==========
-- ⚠️ A CASHIER WRITES A LEDGER THEY CANNOT READ — §2.7's asymmetry, asserted
-- rather than worked around. `waste` the header carries retail VALUE and every
-- member may read it; `waste_line` carries COST and is manager-and-above. So a
-- staff member can record a write-off through this function and then not see the
-- line they just wrote. 4b-i found the same shape on the sell side.
-- =============================================================================

\set w_cash '''aaaa0019-0000-0000-0000-000000000081'''

begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:w_cash::uuid, :'loc_1'::uuid,
                    public._wl(:'var_zero'::uuid, 1, 1.00, 'merma de preparación')) as r \gset

-- Still inside the cashier's session and still under RLS: these two counts are
-- what the cashier can SEE, not what exists.
select chk('9.1 a CASHIER may record a write-off — the RPC asks which stores you '
           'may act in, never what role you hold',
           (:'r'::jsonb->>'already_recorded')::boolean = false);

select chk('9.2 …and they can read the HEADER back, because it carries retail '
           'value and not cost',
           (select count(*) from waste where id = :w_cash::uuid) = 1);

select chk('9.3 …but NOT the LINE they just wrote, because it carries cost and '
           'waste_line_select is manager-and-above (§2.7)',
           (select count(*) from waste_line where waste_id = :w_cash::uuid) = 0,
           format('cashier sees %s line(s)',
                  (select count(*) from waste_line where waste_id = :w_cash::uuid)));
commit;

-- ⚠️ ANTI-VACUITY, AND IT IS THE HALF THAT MATTERS. 9.3 would also pass if the
-- line had never been written at all. As the superuser, RLS is not running, and
-- the row is there.
select chk('9.4 …AND THE LINE REALLY EXISTS — 9.3 is a read wall, not a missing '
           'write, and without this check the two are indistinguishable',
           (select count(*) from waste_line where waste_id = :w_cash::uuid) = 1);


-- ================================================================ 10 ==========
-- THE FILE'S OWN ANTI-VACUITY GUARD.
-- =============================================================================

-- ELEVEN write-offs: mix, unit1, unit2, one, span, over, never, wsdef, idem,
-- on, off, old, cash = 13.
select chk('10.1 the file really recorded the fourteen write-offs it then made '
           'claims about',
           (select count(*) from waste) = 14,
           format('waste=%s', (select count(*) from waste)));

select chk('10.2 …and every one went through the RPC — not one has an empty hash',
           not exists (select 1 from waste where btrim(payload_hash) = ''));

select chk('10.3 not one of the eleven refused ids reached the table',
           (select count(*) from waste where id in (
              :w_nullloc::uuid, :w_other::uuid, :w_unassn::uuid,
              :w_bad1::uuid, :w_bad2::uuid, :w_bad3::uuid, :w_bad4::uuid,
              :w_bad5::uuid, :w_bad6::uuid, :w_bad7::uuid, :w_bad8::uuid)) = 0);

select chk('10.4 the §2.4 invariant holds over every document this file wrote, '
           'including the two deliberate overdraws',
           (select count(*) from batch_balance_violations()) = 0,
           format('violations=%s', (select count(*) from batch_balance_violations())));

select chk('10.5 …and 0015 does too — no purchase lot was opened without its '
           'receipt, and the adjustment lots are outside the rule',
           (select count(*) from receipt_completeness_violations()) = 0);

-- ⚠️⚠️ THE COUNT ITSELF — 4d-i's finding, and the guard is now standard. A
-- verdict recorded inside a transaction that ends in `rollback` VANISHES rather
-- than failing, and a report cannot miss a row that was never inserted. 4d-i
-- lost eighteen checks that way and said "all 62 checks passed". The literal
-- below is deliberately a literal: a count derived from the file would agree
-- with the file whatever the file did.
select chk('10.6 ALL 67 CHECKS IN THIS FILE ACTUALLY RAN — a verdict rolled back '
           'with its transaction leaves no trace at all',
           (select count(*) from public._verify) = 66,
           format('recorded=%s of 66 before this one', (select count(*) from public._verify)));

drop function public._call(uuid, uuid, jsonb, timestamptz, boolean);
drop function public._sale(uuid, uuid, jsonb);
drop function public._wl(uuid, numeric, numeric, text, text);
drop function public._sl(uuid, numeric, numeric);
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
