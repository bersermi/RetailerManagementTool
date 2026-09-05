-- ============================================================================
-- Behavioural verification for 0022 — adjust_stock()
-- ============================================================================
-- ADR-035 §1, §2.3, §2.4, §2.5, §2.6, §2.7, §9. docs/PLAN.md task 4f.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0022_adjust_stock.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `adjust_stock` is the LAST of build step 4's six functions, and it is the only
-- one with no document behind it: no header, no lines array, no payload_hash, no
-- tax split, no provider. Four claims are its alone:
--
--   ⚠️ THE FENCE IS FLAT (§2.7). "Stock counts and adjustments — staff —,
--   manager ●, owner ●". No window, no "own", no self-service half: `0021`'s
--   fence has three moving parts and this one has one. Section 2 is that row made
--   falsifiable, and 2.2/2.3 are the PAIR that carries it — the same location,
--   the same variant, the same count, refused for the cashier and recorded for
--   the manager, so nothing but the ROLE can explain the difference.
--
--   ⚠️⚠️ A COUNT UP REPAYS BEFORE IT OPENS. `0004:429` names this function as how
--   a negative balance gets resolved. Section 6 is that sentence made
--   falsifiable, and it is the section that would go quiet first if the function
--   were rewritten to "count up = open a lot": the totals in section 5 would all
--   still pass, and an overdrawn lot would sit at -5 forever, because
--   `allocate_fefo()` reads only `remaining_base > 0` and will never touch it
--   again. 6.3 is the check that discriminates — the repaid units come back at
--   THE LOT'S OWN COST, not at zero.
--
--   ⚠️ ABSOLUTE, NOT RELATIVE. The counted figure wins (§2.6). Section 7 is the
--   consequence that stands in for the idempotency key this function does not
--   have: the second identical call computes a delta of zero and writes nothing.
--
--   ⚠️ A COUNT DOWN NEVER OPENS A LOT. Section 4.6 asserts an ABSENCE, which is
--   4d-i's practice with `record_purchase`'s locks: the shortfall branches of
--   `allocate_fefo()` are arithmetically unreachable from here, and "unreachable"
--   is a claim, not a comment.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT CONCURRENCY. One connection cannot block on its own lock —
-- 4c-i's F6 and 4c-ii's W-F1, both measured. The `for update` in section 5 of
-- `0022` is invisible to every check below, and deleting it would turn nothing
-- red here. Two managers counting one shelf at once, and a count racing a sale,
-- belong in `supabase/vitest/`. ⚠️ THIS IS A NEW OWED ROW — see docs/PLAN.md.
--
-- ⚠️ NOTHING ABOUT `adjust_stock_delta`. It ships in `0023` with the failure path
-- (ADR-035 §3), and it is the RELATIVE operation this one is not.
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

-- The mirror of chk_raises — 4e-ii-a's SIXTH shape of misleading green. A check
-- written as `chk(adjust_stock(...) ->> 'changed' = 'true')` calls the function
-- INLINE, and if the call raises, the exception escapes chk() entirely, psql
-- stops under ON_ERROR_STOP and the file dies WITHOUT RECORDING A VERDICT —
-- taking every later check with it. Catch, and record the verdict either way.
create function public.chk_json(p_label text, p_sql text, p_key text, p_expect text)
returns void language plpgsql as $$
declare v jsonb;
begin
  execute p_sql into v;
  perform public.chk(p_label, (v ->> p_key) is not distinct from p_expect,
                     format('%s=%s (wanted %s)', p_key,
                            coalesce(v ->> p_key, 'null'),
                            coalesce(p_expect, 'null')));
exception when others then
  perform public.chk(p_label, false, 'RAISED ' || sqlstate || ': ' || sqlerrm);
end;
$$;
grant execute on function public.chk_json(text, text, text, text) to authenticated;

-- The call under test, as text, so chk_raises and chk_json can execute it.
create or replace function public._adj(p_loc uuid, p_var uuid, p_counted numeric,
                             p_note text default null,
                             p_at timestamptz default null,
                             p_offline boolean default false)
returns text language sql as $$
  select format('select public.adjust_stock(%L::uuid, %L::uuid, %L::numeric, '
                '%L::text, %L::timestamptz, %L::boolean)',
                p_loc, p_var, p_counted, p_note, p_at, p_offline)
$$;
grant execute on function public._adj(uuid, uuid, numeric, text, timestamptz, boolean)
  to authenticated;

-- A purchase line, with and without an expiry date.
create or replace function public._pl(p_variant uuid, p_qty numeric,
                             p_price numeric default 4.00,
                             p_expiry date default null)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_net_per_base', p_price,
           'expiry_date', p_expiry))
$$;
grant execute on function public._pl(uuid, numeric, numeric, date) to authenticated;

create or replace function public._sl(p_variant uuid, p_qty numeric,
                             p_price numeric default 10.00)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_gross_per_base', p_price))
$$;
grant execute on function public._sl(uuid, numeric, numeric) to authenticated;

-- The shelf, per variant, as the function itself reads it.
create or replace function public._bal(p_loc uuid, p_var uuid)
returns numeric language sql stable as $$
  select coalesce(sum(bb.remaining_base), 0)
    from public.batch_balance bb
   where bb.location_id = p_loc and bb.variant_id = p_var
$$;


-- ---------------------------------------------------------------- fixture ----
-- FOUR identities. The fence needs a staff member, a manager and an owner inside
-- ONE workspace, plus an unrelated tenant who is a manager in their OWN — which
-- is what 2.4 needs to prove the wall answers before the fence does.

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'cashier.a@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'owner.b@example.mx'),
  ('44444444-4444-4444-4444-444444444444', 'manager.a@example.mx');

\set owner_a   '''11111111-1111-1111-1111-111111111111'''
\set cashier_a '''22222222-2222-2222-2222-222222222222'''
\set owner_b   '''33333333-3333-3333-3333-333333333333'''
\set manager_a '''44444444-4444-4444-4444-444444444444'''

\set jwt_owner   '''{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'''
\set jwt_cashier '''{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'''
\set jwt_owner_b '''{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}'''
\set jwt_manager '''{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}'''

select set_config('request.jwt.claims', :jwt_owner, false);
select onboard_workspace('Tienda A') as ws_a \gset
select set_config('request.jwt.claims', :jwt_owner_b, false);
select onboard_workspace('Tienda B') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc_1 from location where workspace_id = :'ws_a' \gset
select id as loc_b from location where workspace_id = :'ws_b' \gset
insert into location (workspace_id, name) values (:'ws_a', 'Sucursal Norte');
select id as loc_2 from location where workspace_id = :'ws_a' and name = 'Sucursal Norte' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :cashier_a, 'staff'),
  (:'ws_a', :manager_a, 'manager');
-- The cashier is assigned to loc_1 ONLY, so 2.5 can refuse them at a store they
-- genuinely hold. The manager needs no row — §2.7 grants every location by role.
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset

-- One variant per destructive path, because a count is ABSOLUTE and two sections
-- sharing a variant would each be counting the other one's result.
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam', 'Arroz',    'pza','pza','pza','pza', 0.0000),  -- count down, one lot
  (:'ws_a', :'fam', 'Frijol',   'pza','pza','pza','pza', 0.0000),  -- count down, THREE lots
  (:'ws_a', :'fam', 'Azucar',   'pza','pza','pza','pza', 0.0000),  -- count down to zero
  (:'ws_a', :'fam', 'Cafe',     'pza','pza','pza','pza', 0.0000),  -- count up, never stocked
  (:'ws_a', :'fam', 'Aceite',   'pza','pza','pza','pza', 0.0000),  -- overdrawn, repay + open
  (:'ws_a', :'fam', 'Harina',   'pza','pza','pza','pza', 0.0000),  -- overdrawn, repay EXACTLY
  (:'ws_a', :'fam', 'Sal',      'pza','pza','pza','pza', 0.0000),  -- the no-op
  (:'ws_a', :'fam', 'Atun',     'pza','pza','pza','pza', 0.0000),  -- the timestamps
  (:'ws_a', :'fam', 'Leche',    'pza','pza','pza','pza', 0.0000),  -- the fence's subject
  (:'ws_a', :'fam', 'Galleta',  'pza','pza','pza','pza', 0.0000),  -- the ladder's subject
  (:'ws_a', :'fam', 'Chile',    'pza','pza','pza','pza', 0.0000);  -- TWO debts + a positive lot

select id as var_dn   from product_variant where workspace_id=:'ws_a' and name='Arroz'   \gset
select id as var_mult from product_variant where workspace_id=:'ws_a' and name='Frijol'  \gset
select id as var_zero from product_variant where workspace_id=:'ws_a' and name='Azucar'  \gset
select id as var_up   from product_variant where workspace_id=:'ws_a' and name='Cafe'    \gset
select id as var_debt from product_variant where workspace_id=:'ws_a' and name='Aceite'  \gset
select id as var_exact from product_variant where workspace_id=:'ws_a' and name='Harina' \gset
select id as var_noop from product_variant where workspace_id=:'ws_a' and name='Sal'     \gset
select id as var_time from product_variant where workspace_id=:'ws_a' and name='Atun'    \gset
select id as var_fen  from product_variant where workspace_id=:'ws_a' and name='Leche'   \gset
select id as var_lad  from product_variant where workspace_id=:'ws_a' and name='Galleta' \gset
select id as var_two  from product_variant where workspace_id=:'ws_a' and name='Chile'   \gset

insert into product_family (workspace_id, name) values (:'ws_b', 'Ajena');
select id as fam_b from product_family where workspace_id=:'ws_b' \gset
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws_b', :'fam_b', 'Ajeno', 'pza','pza','pza','pza');
select id as var_b from product_variant where workspace_id=:'ws_b' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

-- Stock, put on the shelf by `record_purchase` rather than by hand — 4d-ii's
-- practice, so `0015`'s receipt-completeness rule is satisfied by the same path
-- a shop uses rather than by a fixture that sidesteps it.
\set pur_dn '''dddd0022-0000-0000-0000-00000000000a'''
\set pur_m1 '''dddd0022-0000-0000-0000-00000000000b'''
\set pur_m2 '''dddd0022-0000-0000-0000-00000000000c'''
\set pur_m3 '''dddd0022-0000-0000-0000-00000000000d'''
\set pur_zr '''dddd0022-0000-0000-0000-00000000000e'''
\set pur_db '''dddd0022-0000-0000-0000-00000000000f'''
\set pur_ex '''dddd0022-0000-0000-0000-000000000010'''
\set pur_np '''dddd0022-0000-0000-0000-000000000011'''
\set pur_fn '''dddd0022-0000-0000-0000-000000000012'''
\set sal_db '''5a1e0022-0000-0000-0000-00000000000a'''
\set sal_ex '''5a1e0022-0000-0000-0000-00000000000b'''
\set pur_t1 '''dddd0022-0000-0000-0000-000000000013'''
\set pur_t2 '''dddd0022-0000-0000-0000-000000000014'''
\set pur_t3 '''dddd0022-0000-0000-0000-000000000015'''
\set sal_t1 '''5a1e0022-0000-0000-0000-00000000000c'''
\set sal_t2 '''5a1e0022-0000-0000-0000-00000000000d'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select record_purchase(:pur_dn::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_dn'::uuid, 40, 2.00)) as r \gset

-- THREE lots, three expiry dates, so section 4's FEFO claim has a document that
-- can fail it. 4e-ii-b's rule 5: a per-lot claim needs a multi-lot subject.
select record_purchase(:pur_m1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_mult'::uuid, 10, 3.00, '2026-12-01')) as r \gset
select record_purchase(:pur_m2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_mult'::uuid, 10, 5.00, '2026-10-01')) as r \gset
select record_purchase(:pur_m3::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_mult'::uuid, 10, 7.00, '2026-11-01')) as r \gset

select record_purchase(:pur_zr::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_zero'::uuid, 25, 1.50)) as r \gset
select record_purchase(:pur_db::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_debt'::uuid, 10, 6.25)) as r \gset
select record_purchase(:pur_ex::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_exact'::uuid, 10, 8.40)) as r \gset
select record_purchase(:pur_np::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_noop'::uuid, 12, 2.00)) as r \gset
select record_purchase(:pur_fn::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_fen'::uuid, 30, 2.00)) as r \gset

-- THE OVERDRAW, and it is made the way a shop makes one: an unenforced sale of
-- more than the shelf holds. `enforce_stock_default` is false in `0001` and no
-- variant here sets it, so `allocate_fefo()` overdraws the lot it ran out on
-- (`0010` branch 1) and `batch_balance` goes negative — which `0004:429` permits
-- in the same breath as it names THIS function as the resolution.
select record_sale(:sal_db::uuid, :'loc_1'::uuid,
         public._sl(:'var_debt'::uuid, 15, 12.00)) as r \gset
select record_sale(:sal_ex::uuid, :'loc_1'::uuid,
         public._sl(:'var_exact'::uuid, 14, 15.00)) as r \gset

-- TWO overdrawn lots on ONE variant, built in strict order because
-- `allocate_fefo()` overdraws only the lot it RAN OUT ON (0010 branch 1): each
-- oversale needs its own open lot to run out of, so the second purchase lands
-- AFTER the first oversale and not with it. The third purchase is the positive
-- lot that makes a partial repayment possible at all — see 6.9.
select record_purchase(:pur_t1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_two'::uuid, 10, 3.00, '2026-10-01')) as r \gset
select record_sale(:sal_t1::uuid, :'loc_1'::uuid,
         public._sl(:'var_two'::uuid, 13, 9.00)) as r \gset
select record_purchase(:pur_t2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_two'::uuid, 5, 4.00, '2026-11-01')) as r \gset
select record_sale(:sal_t2::uuid, :'loc_1'::uuid,
         public._sl(:'var_two'::uuid, 8, 9.00)) as r \gset
select record_purchase(:pur_t3::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_two'::uuid, 20, 5.00, '2026-12-01')) as r \gset
commit;

-- The lot ids the sections below name by hand.
select id as lot_dn from stock_batch where variant_id = :'var_dn' \gset
select id as lot_oct from stock_batch where variant_id = :'var_mult' and expiry_date='2026-10-01' \gset
select id as lot_nov from stock_batch where variant_id = :'var_mult' and expiry_date='2026-11-01' \gset
select id as lot_dec from stock_batch where variant_id = :'var_mult' and expiry_date='2026-12-01' \gset
select id as lot_debt from stock_batch where variant_id = :'var_debt' \gset
select id as lot_exact from stock_batch where variant_id = :'var_exact' \gset
select id as lot_t2a from stock_batch where variant_id = :'var_two' and expiry_date='2026-10-01' \gset
select id as lot_t2b from stock_batch where variant_id = :'var_two' and expiry_date='2026-11-01' \gset
select id as lot_t2c from stock_batch where variant_id = :'var_two' and expiry_date='2026-12-01' \gset


-- ================================================== 0. the fixture is REAL ====
-- 4e-ii-b's rule 4: a check over a zero or an unset value asserts nothing. These
-- four exist so that every later section is known to have a non-trivial subject,
-- and so the file goes RED rather than quiet if a fixture change hollows it out.

select chk('0.1 the multi-lot variant really has THREE lots with THREE distinct '
           'expiry dates — without this section 4''s FEFO claim is a claim about '
           'one lot',
           (select count(*) from stock_batch where variant_id = :'var_mult') = 3
       and (select count(distinct expiry_date) from stock_batch
             where variant_id = :'var_mult') = 3,
           format('lots=%s', (select count(*) from stock_batch where variant_id=:'var_mult')));

select chk('0.2 ⚠️ THE OVERDRAW EXISTS AND IS NEGATIVE — section 6 is about a debt, '
           'and a debt of zero would let a "count up always opens a lot" '
           'implementation pass every check in it',
           public._bal(:'loc_1', :'var_debt') = -5
       and public._bal(:'loc_1', :'var_exact') = -4,
           format('debt=%s exact=%s', public._bal(:'loc_1', :'var_debt'),
                                      public._bal(:'loc_1', :'var_exact')));

select chk('0.3 the overdrawn lot carries a REAL cost, not zero — 6.3 asks the '
           'repaid units to come back at it, and 6.25 is distinguishable from 0',
           (select unit_cost_net_per_base from stock_batch where id = :'lot_debt') = 6.250000);

select chk('0.4 the count-up variant has NEVER been stocked here, so section 5 '
           'watches a lot being opened outright rather than topped up',
           (select count(*) from stock_batch where variant_id = :'var_up') = 0);

select chk('0.5 ⚠️ TWO SEPARATE DEBTS EXIST ON ONE VARIANT, beside a positive lot '
           '— the only fixture in this file that can see the repayment ORDER, '
           'and section 6.9 is vacuous without it',
           (select count(*) from batch_balance
             where variant_id = :'var_two' and remaining_base < 0) = 2
       and (select remaining_base from batch_balance where batch_id = :'lot_t2a') = -3
       and (select remaining_base from batch_balance where batch_id = :'lot_t2b') = -3
       and (select remaining_base from batch_balance where batch_id = :'lot_t2c') = 20
       and public._bal(:'loc_1', :'var_two') = 14,
           format('oct=%s nov=%s dec=%s total=%s',
                  (select remaining_base from batch_balance where batch_id=:'lot_t2a'),
                  (select remaining_base from batch_balance where batch_id=:'lot_t2b'),
                  (select remaining_base from batch_balance where batch_id=:'lot_t2c'),
                  public._bal(:'loc_1', :'var_two')));


-- ========================================= 1. the location wall (§2.6) ========
-- Four lines, the RPC's own. Nothing in the schema catches its absence: RLS is
-- not running inside a `security definer` function (4b-i F1, measured).

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_json('1.1 a MANAGER of this workspace counts a shelf at a store they '
                'hold — the grant half, without which every refusal below is '
                'vacuous',
                public._adj(:'loc_1'::uuid, :'var_fen'::uuid, 28, 'conteo inicial'),
                'changed', 'true');
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_raises('1.2 a NULL location is refused by the wall, not by a foreign '
                  'key three statements later',
                  public._adj(null::uuid, :'var_fen'::uuid, 5), '42501');
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_raises('1.3 a location in ANOTHER WORKSPACE is refused — §2.10''s '
                  'isolation, on the WRITE side, where no policy is running',
                  public._adj(:'loc_b'::uuid, :'var_fen'::uuid, 5), '42501');
commit;

-- 1.4 — 4b-i's check 1.7 shape, and it is the one that separates the wall from
-- RLS. The connection BYPASSES RLS (it is the superuser role, no policy runs)
-- while `auth.uid()` still names someone with no access to loc_b. The refusal
-- has to come from the function's own four lines or from nothing at all.
select set_config('request.jwt.claims', :jwt_manager, false);
select chk_raises('1.4 ⚠️ THE WALL IS THE FUNCTION''S, NOT RLS''s: refused for a '
                  'caller whose connection bypasses every policy in the database '
                  'and whose auth.uid() simply does not hold that store',
                  public._adj(:'loc_b'::uuid, :'var_fen'::uuid, 5), '42501');
select set_config('request.jwt.claims', null, false);

select chk_raises('1.5 an UNAUTHENTICATED caller is refused — auth.uid() is null '
                  'and my_locations() returns nothing, so the wall answers first',
                  public._adj(:'loc_1'::uuid, :'var_fen'::uuid, 5), '42501');

select chk('1.6 the four refusals above wrote NOTHING — a wall that raises after '
           'the ledger has moved is not a wall',
           (select count(*) from stock_movement
             where variant_id = :'var_fen' and reason = 'adjustment') = 1,
           format('adjustment movements on the fence variant=%s',
                  (select count(*) from stock_movement
                    where variant_id = :'var_fen' and reason = 'adjustment')));


-- ============================================ 2. the fence (§2.7) =============
-- "Stock counts and adjustments | staff — | manager ● | owner ● |"
--
-- ⚠️ FLAT, and that is the difference from `0021`. There is no window and no
-- "own": section 2 needs no clock at all.

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_raises('2.1 ⚠️ PAIR — a STAFF member may NOT count stock, at their OWN '
                  'assigned store, with everything else in order. §2.7 row 6',
                  public._adj(:'loc_1'::uuid, :'var_fen'::uuid, 20, 'conteo'), 'TD003');
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_json('2.2 ⚠️ PAIR — the MANAGER counts THAT SAME shelf to THAT SAME '
                'figure at that same store. Nothing but the ROLE differs, so '
                'nothing but the role can explain the refusal above',
                public._adj(:'loc_1'::uuid, :'var_fen'::uuid, 20, 'conteo'),
                'changed', 'true');
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk_json('2.3 the OWNER is unfenced too — §2.7 grants the capability to '
                'the top two rows and this is the second of them',
                public._adj(:'loc_1'::uuid, :'var_fen'::uuid, 22),
                'changed', 'true');
commit;

-- 2.4 — ⚠️ THE ORDERING CHECK, and it is the reason the fence sits AFTER the
-- wall in `0022`. owner_b is an OWNER — the highest role there is — but of the
-- WRONG workspace. `has_role(v_ws, 'manager')` would refuse them too, with
-- TD003, and TD003 means "ask a manager": advice that would send an owner
-- looking for a permission they already hold. The wall must answer first.
begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
select chk_raises('2.4 ⚠️ AN OWNER OF ANOTHER WORKSPACE GETS 42501, NOT TD003 — '
                  '"this is not your store" is a different sentence from "ask '
                  'your manager", and a fence checked before the wall would say '
                  'the wrong one to the one caller who cannot act on it',
                  public._adj(:'loc_1'::uuid, :'var_fen'::uuid, 5), '42501');
commit;

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_raises('2.5 the fence is not the wall: the cashier is refused with '
                  'TD003 and not 42501 at loc_1, which they genuinely hold',
                  public._adj(:'loc_1'::uuid, :'var_dn'::uuid, 5), 'TD003');
select chk_raises('2.6 …and with 42501 at loc_2, which they do not — the two '
                  'refusals are distinguishable for the same caller',
                  public._adj(:'loc_2'::uuid, :'var_dn'::uuid, 5), '42501');
commit;

select chk('2.7 the fenced calls wrote NOTHING — a refusal that has already '
           'moved the ledger is not a refusal',
           public._bal(:'loc_1', :'var_dn') = 40,
           format('arroz=%s', public._bal(:'loc_1', :'var_dn')));


-- ======================================= 3. the count itself, validated =======

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;

select chk_raises('3.1 a NULL variant is named as such',
                  public._adj(:'loc_1'::uuid, null::uuid, 5), '22023');

select chk_raises('3.2 a variant from ANOTHER WORKSPACE is refused — the wall '
                  'proves the caller holds the STORE, and this proves the '
                  'product belongs to the tenant that store is in',
                  public._adj(:'loc_1'::uuid, :'var_b'::uuid, 5), '22023');

select chk_raises('3.3 a NULL count is refused — this function is ABSOLUTE, and '
                  'a missing count is not a count of zero',
                  public._adj(:'loc_1'::uuid, :'var_lad'::uuid, null), '22023');

select chk_raises('3.4 a NEGATIVE count is refused: a shelf holds nothing or it '
                  'holds something, and only the LEDGER can be wrong by a '
                  'negative amount',
                  public._adj(:'loc_1'::uuid, :'var_lad'::uuid, -1), '22023');

select chk_raises('3.5 ⚠️ a count with MORE PRECISION than numeric(14,3) is '
                  'REFUSED rather than silently rounded. This figure is asserted '
                  'by a human; 1.3b''s argument about invented costs applies '
                  'unchanged — invisibly wrong is worse than refused',
                  public._adj(:'loc_1'::uuid, :'var_lad'::uuid, 5.0001), '22023');

-- 3.6 / 3.7 — ⚠️ THE PAIR FOR 3.4 AND 3.5. 4e-ii-b's rule 2: a check that expects
-- a refusal cannot watch the boundary the refusal reads. Zero is LEGAL here and
-- is the commonest correct count a shop takes; three decimals is exactly
-- representable and must pass.
select chk_json('3.6 ⚠️ PAIR — ZERO IS LEGAL, and is not the "rounds to zero" gate '
                '0018 and 0019 carry. Counting a shelf empty is the single most '
                'useful count an operator takes',
                public._adj(:'loc_1'::uuid, :'var_lad'::uuid, 0),
                'changed', 'false');

select chk_json('3.7 ⚠️ PAIR — three decimals is exactly what the base unit '
                'stores, so it passes. 3.5 refuses the fourth, not the third',
                public._adj(:'loc_1'::uuid, :'var_lad'::uuid, 5.125),
                'delta_base', '5.125');
commit;

select chk('3.8 the ladder''s refusals wrote nothing, and the two grants wrote '
           'exactly what they said',
           public._bal(:'loc_1', :'var_lad') = 5.125,
           format('galleta=%s', public._bal(:'loc_1', :'var_lad')));


-- ============================================ 4. counting DOWN ================

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select adjust_stock(:'loc_1'::uuid, :'var_dn'::uuid, 33, 'merma no registrada') as r \gset
commit;

select chk('4.1 the counted figure WINS — the balance is now what the manager '
           'counted, not what the ledger believed',
           public._bal(:'loc_1', :'var_dn') = 33,
           format('balance=%s', public._bal(:'loc_1', :'var_dn')));

select chk('4.2 the return reports the count, the previous figure and the delta '
           'between them',
           (:'r'::jsonb ->> 'counted_base') = '33.000'
       and (:'r'::jsonb ->> 'previous_base') = '40.000'
       and (:'r'::jsonb ->> 'delta_base') = '-7.000'
       and (:'r'::jsonb ->> 'changed') = 'true',
           :'r');

select chk('4.3 ONE movement, NEGATIVE, reason ''adjustment'', against the lot '
           'the shelf actually holds',
           (select count(*) from stock_movement
             where variant_id = :'var_dn' and reason = 'adjustment') = 1
       and (select count(*) from stock_movement
             where variant_id = :'var_dn' and reason = 'adjustment'
               and qty_base = -7 and batch_id = :'lot_dn'::uuid) = 1,
           format('adjustment movements=%s',
                  (select count(*) from stock_movement
                    where variant_id = :'var_dn' and reason = 'adjustment')));

select chk('4.4 the movement answers to NO DOCUMENT — 0004''s '
           'stock_movement_source_agrees requires all four ids null for an '
           'adjustment, and this function satisfies it rather than being caught '
           'by it',
           (select count(*) from stock_movement
             where variant_id = :'var_dn' and reason = 'adjustment'
               and purchase_id is null and sale_id is null and waste_id is null
               and transfer_group_id is null and reversal_of_movement_id is null) = 1);

select chk('4.5 ⚠️ THE NOTE IS ON THE MOVEMENT, and it is the whole reason this '
           'migration altered an applied table. Without the column §2.6''s '
           'fourth argument has nowhere to go',
           (select count(*) from stock_movement
             where variant_id = :'var_dn' and reason = 'adjustment'
               and note = 'merma no registrada') = 1);

select chk('4.6 ⚠️ A COUNT DOWN OPENED NO LOT — asserted as an ABSENCE, 4d-i''s '
           'practice. allocate_fefo()''s shortfall branches are arithmetically '
           'unreachable from here and "unreachable" is a claim, not a comment',
           (select count(*) from stock_batch
             where variant_id = :'var_dn' and origin = 'adjustment') = 0);

-- 4.7–4.10 — the MULTI-LOT count down. 15 units come off a shelf of 30 held in
-- three lots, so FEFO has something to get wrong: the October lot empties, the
-- November lot is broken into, and December is untouched.
begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select adjust_stock(:'loc_1'::uuid, :'var_mult'::uuid, 15, 'conteo fisico') as rm \gset
commit;

select chk('4.7 the shelf total is the counted figure across all three lots',
           public._bal(:'loc_1', :'var_mult') = 15,
           format('frijol=%s', public._bal(:'loc_1', :'var_mult')));

select chk('4.8 ⚠️ FEFO, AND IT IS VISIBLE ONLY HERE: the OCTOBER lot is emptied '
           'first, NOVEMBER is broken into, DECEMBER is untouched. A count that '
           'took from the newest lot, or spread evenly, has the same total and '
           'fails this',
           (select remaining_base from batch_balance where batch_id = :'lot_oct') = 0
       and (select remaining_base from batch_balance where batch_id = :'lot_nov') = 5
       and (select remaining_base from batch_balance where batch_id = :'lot_dec') = 10,
           format('oct=%s nov=%s dec=%s',
                  (select remaining_base from batch_balance where batch_id=:'lot_oct'),
                  (select remaining_base from batch_balance where batch_id=:'lot_nov'),
                  (select remaining_base from batch_balance where batch_id=:'lot_dec')));

select chk('4.9 TWO movements, one per lot touched, and the return says so',
           (select count(*) from stock_movement
             where variant_id = :'var_mult' and reason = 'adjustment') = 2
       and (:'rm'::jsonb ->> 'movement_count') = '2',
           :'rm');

select chk('4.10 ⚠️ EACH MOVEMENT CARRIES ITS OWN LOT''S COST, not one blended '
           'figure — §2.9 attributes margin to the lot actually consumed, and a '
           'count is no exception',
           (select count(*) from stock_movement
             where batch_id = :'lot_oct' and reason = 'adjustment'
               and unit_cost_net_per_base = 5.000000) = 1
       and (select count(*) from stock_movement
             where batch_id = :'lot_nov' and reason = 'adjustment'
               and unit_cost_net_per_base = 7.000000) = 1);

select chk('4.11 the note is on BOTH legs — 4e-ii-b''s rule 1: a value written '
           'once per lot needs a check that counts the lots',
           (select count(*) from stock_movement
             where variant_id = :'var_mult' and reason = 'adjustment'
               and note = 'conteo fisico') = 2);

select chk('4.12 the multi-lot count opened no lot either',
           (select count(*) from stock_batch
             where variant_id = :'var_mult' and origin = 'adjustment') = 0);

-- 4.13 — counting a shelf EMPTY, which 3.6 established is legal and this proves
-- is arithmetically right.
begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_json('4.13 a shelf counted EMPTY goes to exactly zero, in one movement',
                public._adj(:'loc_1'::uuid, :'var_zero'::uuid, 0, 'todo caducado'),
                'delta_base', '-25.000');
commit;

select chk('4.14 …and the balance is zero, not negative and not left behind',
           public._bal(:'loc_1', :'var_zero') = 0,
           format('azucar=%s', public._bal(:'loc_1', :'var_zero')));


-- ============================================ 5. counting UP, no debt =========

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select adjust_stock(:'loc_1'::uuid, :'var_up'::uuid, 12, 'saldo inicial') as ru \gset
commit;
select (:'ru'::jsonb ->> 'batch_opened') as lot_up \gset

select chk('5.1 a count up on a never-stocked variant OPENS EXACTLY ONE LOT, and '
           'the return names it',
           (select count(*) from stock_batch where variant_id = :'var_up') = 1
       and :'lot_up' is not null
       and (select count(*) from stock_batch
             where variant_id = :'var_up' and id = :'lot_up'::uuid) = 1,
           :'ru');

select chk('5.2 the lot''s origin is ''adjustment'' — 0004''s '
           'stock_batch_origin_source_agrees then requires no purchase line and '
           'no source batch, and there is neither',
           (select origin from stock_batch where id = :'lot_up'::uuid) = 'adjustment'
       and (select source_purchase_line_id from stock_batch where id = :'lot_up'::uuid) is null
       and (select source_batch_id from stock_batch where id = :'lot_up'::uuid) is null);

select chk('5.3 ⚠️ IT COSTS ZERO, and that is 1.3b inherited rather than re-taken: '
           '"100% margin on those units is visibly wrong and gets asked about, '
           'where a plausible invented cost is invisibly wrong"',
           (select unit_cost_net_per_base from stock_batch where id = :'lot_up'::uuid) = 0);

select chk('5.4 ⚠️ IT HAS NO EXPIRY. 0010 argued it for the shortfall lot and it '
           'holds here: an invented date would put a fictional lot at the HEAD '
           'of the FEFO order, ahead of stock that really does expire',
           (select expiry_date from stock_batch where id = :'lot_up'::uuid) is null);

select chk('5.5 the lot opens at zero and the MOVEMENT is what fills it — 4a''s '
           '"a lot and its receipt are one transaction", kept even though '
           'origin=''adjustment'' is outside receipt_completeness_violations()',
           (select count(*) from stock_movement
             where batch_id = :'lot_up'::uuid) = 1
       and (select count(*) from stock_movement
             where batch_id = :'lot_up'::uuid and qty_base = 12) = 1
       and public._bal(:'loc_1', :'var_up') = 12);

select chk('5.6 the movement is POSITIVE and carries the lot''s zero cost',
           (select count(*) from stock_movement
             where batch_id = :'lot_up'::uuid
               and unit_cost_net_per_base = 0 and reason = 'adjustment') = 1);


-- ================================ 6. counting UP over a DEBT (0004:429) =======
-- ⚠️⚠️ THE SECTION THIS FUNCTION EXISTS FOR, and the one a plausible wrong
-- implementation passes nothing in. `0004:429`: "a negative balance is a true
-- statement about a disagreement between the ledger and the shelf, and
-- adjust_stock is how it gets RESOLVED."
--
-- Aceite is at -5 on a lot that cost 6.25. The manager counts 8.
--   repay  5 to the overdrawn lot, at 6.25 — the money that went out comes back
--   open   8 on a new lot, at zero
-- A "count up = open a lot" implementation would open 13 at zero, reach the same
-- total of 8, pass 6.1 and 6.2, and leave the -5 lot negative FOREVER: nothing
-- in this system reads a lot with remaining_base <= 0 ever again.

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select adjust_stock(:'loc_1'::uuid, :'var_debt'::uuid, 8, 'reconciliacion') as rd \gset
commit;
select (:'rd'::jsonb ->> 'batch_opened') as lot_new \gset

select chk('6.1 the shelf total is the counted figure',
           public._bal(:'loc_1', :'var_debt') = 8,
           format('aceite=%s', public._bal(:'loc_1', :'var_debt')));

select chk('6.2 ⚠️⚠️ THE OVERDRAWN LOT IS BACK AT EXACTLY ZERO — the debt is '
           'RESOLVED, not merely out-totalled. Without this the lot sits at -5 '
           'permanently: allocate_fefo() reads only remaining_base > 0',
           (select remaining_base from batch_balance where batch_id = :'lot_debt') = 0,
           format('overdrawn lot=%s',
                  (select remaining_base from batch_balance where batch_id=:'lot_debt')));

select chk('6.3 ⚠️⚠️ THE REPAID UNITS COME BACK AT THE LOT''S OWN COST (6.25), '
           'NOT AT ZERO. The overdraw took units at 6.25 that were never there; '
           'the money that comes back must be the same money. This is the ONE '
           'check a zero-cost repayment fails while 6.1 and 6.2 still pass',
           (select count(*) from stock_movement
             where batch_id = :'lot_debt' and reason = 'adjustment') = 1
       and (select count(*) from stock_movement
             where batch_id = :'lot_debt' and reason = 'adjustment'
               and unit_cost_net_per_base = 6.250000 and qty_base = 5) = 1,
           format('legs against the overdrawn lot=%s, of which at 6.25 for 5=%s',
                  (select count(*) from stock_movement
                    where batch_id = :'lot_debt' and reason='adjustment'),
                  (select count(*) from stock_movement
                    where batch_id = :'lot_debt' and reason='adjustment'
                      and unit_cost_net_per_base = 6.250000 and qty_base = 5)));

select chk('6.4 the NEW lot holds only the REMAINDER — 8, not the 13 a '
           '"count up always opens a lot" implementation would open',
           (select qty_received_base from stock_batch where id = :'lot_new'::uuid) = 8
       and (select unit_cost_net_per_base from stock_batch where id = :'lot_new'::uuid) = 0,
           format('opened=%s',
                  (select qty_received_base from stock_batch where id=:'lot_new'::uuid)));

select chk('6.5 TWO movements — one repayment, one receipt — and both carry the '
           'note',
           (select count(*) from stock_movement
             where variant_id = :'var_debt' and reason = 'adjustment') = 2
       and (select count(*) from stock_movement
             where variant_id = :'var_debt' and reason = 'adjustment'
               and note = 'reconciliacion') = 2
       and (:'rd'::jsonb ->> 'movement_count') = '2');

select chk('6.6 NO NEGATIVE LOT SURVIVES for this variant — the claim 0004:429 '
           'makes about this function, read back off the projection',
           (select count(*) from batch_balance
             where variant_id = :'var_debt' and remaining_base < 0) = 0);

-- 6.7 / 6.8 — ⚠️ THE OTHER HALF OF THE BRANCH. Harina is at -4 and is counted to
-- ZERO: the whole delta is repayment and there is nothing left over, so NO LOT
-- IS OPENED. An implementation that always opens one would open a lot of zero
-- units and be refused by stock_batch_qty_positive — a 23514 with a constraint
-- name, where this file wants a clean count.
-- ⚠️ THE CALL IS MADE THROUGH chk_json AND NOT THROUGH A BARE `\gset`, and that
-- is not a style choice. Falsification F11 — 0018's "rounds to zero" gate copied
-- in, so `p_counted_base <= 0` is refused — made this exact call raise. Under a
-- bare `\gset` the exception escapes, psql stops on ON_ERROR_STOP, and the file
-- dies WITH NO REPORT AT ALL: a mutation that turns nothing red and a mutation
-- whose suite never ran are indistinguishable from the outside. Every claim 6.7
-- used to make about the returned jsonb is available from the database instead,
-- and 6.8 makes them there.
begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_json('6.7 ⚠️ a count that repays the debt EXACTLY writes ONE movement '
                'and no more — the repayment leg alone, with no receipt beside it',
                public._adj(:'loc_1'::uuid, :'var_exact'::uuid, 0, 'ajuste exacto'),
                'movement_count', '1');
commit;

select chk('6.8 …NO LOT WAS OPENED, the balance is zero, and the original lot is '
           'back at zero — the debt is gone rather than parked beside a new lot',
           (select count(*) from stock_batch
             where variant_id = :'var_exact' and origin = 'adjustment') = 0
       and public._bal(:'loc_1', :'var_exact') = 0
       and (select remaining_base from batch_balance where batch_id = :'lot_exact') = 0,
           format('adjustment lots=%s balance=%s',
                  (select count(*) from stock_batch
                    where variant_id = :'var_exact' and origin = 'adjustment'),
                  public._bal(:'loc_1', :'var_exact')));


-- 6.9-6.11 — ⚠️⚠️ TWO NEGATIVE LOTS, AND A PARTIAL REPAYMENT. Falsification F17
-- reversed the repayment loop's FEFO ordering and turned NOTHING red, because
-- every other variant in this file carries exactly ONE overdrawn lot and an
-- order over one row is not an order. 4e-ii-b's rule 5, arriving again: a
-- per-lot claim needs a multi-lot subject.
--
-- ⚠️ THE PARTIAL REPAYMENT IS WHAT MAKES THE ORDER OBSERVABLE AT ALL, and it took
-- some arranging. Whenever the balance is negative, `counted_base >= 0` forces
-- the delta to cover the WHOLE debt, both lots go to zero and the order is
-- invisible however it is written. Chile therefore holds a POSITIVE lot as well:
-- with 20 open against -3 and -3 the shelf reads 14, a count of 16 is a delta of
-- just 2, and only the first lot in the order is touched.
begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select adjust_stock(:'loc_1'::uuid, :'var_two'::uuid, 16, 'conteo parcial') as r2 \gset
commit;

select chk('6.9 ⚠️⚠️ THE PARTIAL REPAYMENT LANDS ON THE FEFO-FIRST DEBT: the '
           'OCTOBER lot goes from -3 to -1 and the NOVEMBER lot is untouched at '
           '-3. Reverse the loop''s ordering and the totals are identical — this '
           'is the only check in the file that can tell them apart',
           (select remaining_base from batch_balance where batch_id = :'lot_t2a') = -1
       and (select remaining_base from batch_balance where batch_id = :'lot_t2b') = -3,
           format('oct=%s nov=%s',
                  (select remaining_base from batch_balance where batch_id=:'lot_t2a'),
                  (select remaining_base from batch_balance where batch_id=:'lot_t2b')));

select chk('6.10 ONE movement, against that lot, at THAT lot''s cost — a partial '
           'repayment does not touch the positive lot and does not open one',
           (select count(*) from stock_movement
             where variant_id = :'var_two' and reason = 'adjustment') = 1
       and (select count(*) from stock_movement
             where variant_id = :'var_two' and reason = 'adjustment'
               and batch_id = :'lot_t2a' and qty_base = 2
               and unit_cost_net_per_base = 3.000000) = 1
       and (:'r2'::jsonb ->> 'batch_opened') is null,
           :'r2');

select chk('6.11 ⚠️ A DEBT CAN SURVIVE A COUNT, and it should: the shelf really '
           'does read 16, and BOTH lots are still owed — 1 and 3. The function '
           'resolves what the count PAYS FOR and invents nothing. Contrast 6.6, '
           'where the count covered the whole debt and none survived',
           public._bal(:'loc_1', :'var_two') = 16
       and (select count(*) from batch_balance
             where variant_id = :'var_two' and remaining_base < 0) = 2
       and (select coalesce(sum(remaining_base), 0) from batch_balance
             where variant_id = :'var_two' and remaining_base < 0) = -4,
           format('chile=%s negative lots=%s owing %s',
                  public._bal(:'loc_1', :'var_two'),
                  (select count(*) from batch_balance
                    where variant_id = :'var_two' and remaining_base < 0),
                  (select coalesce(sum(remaining_base),0) from batch_balance
                    where variant_id = :'var_two' and remaining_base < 0)));


-- ================================ 7. the count that AGREES, and convergence ===

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_json('7.1 a count that AGREES with the ledger reports no change',
                public._adj(:'loc_1'::uuid, :'var_noop'::uuid, 12, 'sin novedad'),
                'changed', 'false');
select chk_json('7.2 …and writes no movement, which is FORCED: '
                'stock_movement_sign_follows_reason refuses qty_base = 0 for '
                'every reason including ''adjustment''',
                public._adj(:'loc_1'::uuid, :'var_noop'::uuid, 12),
                'movement_count', '0');
commit;

select chk('7.3 nothing at all was written for the agreeing counts',
           (select count(*) from stock_movement
             where variant_id = :'var_noop' and reason = 'adjustment') = 0
       and public._bal(:'loc_1', :'var_noop') = 12);

-- 7.4 / 7.5 — ⚠️ CONVERGENCE IS THIS FUNCTION'S IDEMPOTENCY, and it is the reason
-- §2.6 gives it no id and no payload_hash. The FIRST call of a repeated pair
-- moves the shelf; the second computes a delta of zero against the balance the
-- first one wrote.
begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_json('7.4 ⚠️ the first of two identical calls changes the shelf…',
                public._adj(:'loc_1'::uuid, :'var_noop'::uuid, 9, 'recuento'),
                'changed', 'true');
select chk_json('7.5 ⚠️ …and the second is a NO-OP. There is no idempotency key '
                'on this function and none is needed: an ABSOLUTE write '
                'converges, which is a stronger guarantee than TD001 and is why '
                '§2.6 gives it no id',
                public._adj(:'loc_1'::uuid, :'var_noop'::uuid, 9, 'recuento'),
                'changed', 'false');
commit;

select chk('7.6 one movement across the pair, not two',
           (select count(*) from stock_movement
             where variant_id = :'var_noop' and reason = 'adjustment') = 1
       and public._bal(:'loc_1', :'var_noop') = 9);


-- ============================================ 8. the timestamps (§2.6) ========
-- ⚠️ THE STAKE HERE IS HIGHER THAN ON THE OTHER FIVE FUNCTIONS, and 4d-ii named
-- it in advance: `v_at` is what a lot opened by a count is RECEIVED at, and
-- `received_at` is FEFO's SECOND SORT KEY (§2.4). A count taken in the aisle on
-- Friday and flushed on Monday must open its lot on Friday, or it sorts ahead of
-- stock that really did arrive first.

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select adjust_stock(:'loc_1'::uuid, :'var_time'::uuid, 6, 'conteo del jueves',
                    now() - interval '30 hours', true) as t1 \gset
commit;
select (:'t1'::jsonb ->> 'batch_opened') as lot_t1 \gset

select chk('8.1 an OFFLINE count is trusted at the client''s clock — 30 hours '
           'back is inside §2.6''s 72-hour window',
           (:'t1'::jsonb ->> 'occurred_at')::timestamptz
             between now() - interval '30 hours 5 minutes'
                 and now() - interval '29 hours 55 minutes',
           :'t1');

select chk('8.2 ⚠️⚠️ THE LOT IS RECEIVED AT occurred_at AND NOT AT now(). This is '
           'the check 4d-ii wrote 8.6/8.7 for on record_waste and named 4f as '
           'inheriting. A lot received "today" for a count taken on Thursday '
           'sorts ahead of real stock in every later FEFO decision',
           (select received_at from stock_batch where id = :'lot_t1'::uuid)
             between now() - interval '30 hours 5 minutes'
                 and now() - interval '29 hours 55 minutes',
           format('received_at=%s',
                  (select received_at from stock_batch where id = :'lot_t1'::uuid)));

select chk('8.3 the MOVEMENT is backdated with it, while recorded_at is not — '
           '§2.6''s one column an offline write must never move',
           (select count(*) from stock_movement
             where batch_id = :'lot_t1'::uuid
               and occurred_at < now() - interval '29 hours'
               and recorded_at > now() - interval '5 minutes') = 1);

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select adjust_stock(:'loc_1'::uuid, :'var_time'::uuid, 9, 'flush tardio',
                    now() - interval '200 hours', true) as t2 \gset
select adjust_stock(:'loc_1'::uuid, :'var_time'::uuid, 11, 'reloj adelantado',
                    now() + interval '5 hours', true) as t3 \gset
select adjust_stock(:'loc_1'::uuid, :'var_time'::uuid, 14, 'en linea',
                    now() - interval '30 hours', false) as t4 \gset
commit;

select chk('8.4 an offline count older than 72 hours is CLAMPED to 72, not '
           'refused — the count happened and refusing it discards the only '
           'record of it',
           (:'t2'::jsonb ->> 'occurred_at')::timestamptz
             between now() - interval '72 hours 5 minutes'
                 and now() - interval '71 hours 55 minutes',
           :'t2');

select chk('8.5 a client clock running FAST is clamped to now() — the ledger '
           'never accepts a movement from the future',
           (:'t3'::jsonb ->> 'occurred_at')::timestamptz
             between now() - interval '5 minutes' and now() + interval '5 seconds',
           :'t3');

select chk('8.6 ⚠️ an ONLINE count IGNORES the client''s occurred_at entirely and '
           'is stamped by the server, even when one is supplied — the pair that '
           'shows recorded_offline is what opens the window',
           (:'t4'::jsonb ->> 'occurred_at')::timestamptz
             between now() - interval '5 minutes' and now() + interval '5 seconds'
       and (:'t4'::jsonb ->> 'recorded_offline') = 'false',
           :'t4');

select chk('8.7 all four counts landed and the shelf is at the last figure — '
           'the counted figure wins, every time, and the latest one wins last',
           public._bal(:'loc_1', :'var_time') = 14,
           format('atun=%s', public._bal(:'loc_1', :'var_time')));


-- ============================================ 9. the column, and the grants ===

select chk('9.1 ⚠️ THE COLUMN THIS MIGRATION ADDED EXISTS, on stock_movement, '
           'nullable and text. §2.6 has named it since the ADR was written and '
           'no table carried it until now',
           (select count(*) from information_schema.columns
             where table_schema='public' and table_name='stock_movement'
               and column_name='note' and data_type='text'
               and is_nullable='YES') = 1);

select chk('9.2 …with the not-blank check 0003 uses for text that means '
           'something when present',
           (select count(*) from pg_constraint
             where conname = 'stock_movement_note_not_blank') = 1);

select chk_raises('9.3 …and it REFUSES a blank one on a direct insert, so the '
                  'constraint is seen to bite rather than merely to exist',
                  format('insert into public.stock_movement (workspace_id, '
                         'location_id, batch_id, variant_id, reason, qty_base, '
                         'unit_cost_net_per_base, occurred_at, created_by, note) '
                         'values (%L, %L, %L, %L, ''adjustment'', 1, 0, now(), '
                         '%L, ''   '')',
                         :'ws_a', :'loc_1', :'lot_dn', :'var_dn', :owner_a),
                  '23514');

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_json('9.4 a BLANK note through the function is stored as NULL, not as '
                'a blank that reads like a note nobody wrote',
                public._adj(:'loc_1'::uuid, :'var_up'::uuid, 15, '   '),
                'note', null);
commit;

select chk('9.5 …and the movement it wrote carries a NULL note, not an empty '
           'string — the trim happens before the insert, not at the constraint',
           (select count(*) from stock_movement
             where variant_id = :'var_up' and reason = 'adjustment'
               and note is null) = 1);

select chk('9.6 the function is executable by `authenticated` and by nobody '
           'else — the ROLE fence is in the body, because a grant can only name '
           'a database role and staff/manager/owner are rows in workspace_member',
           has_function_privilege('authenticated',
             'public.adjust_stock(uuid,uuid,numeric,text,timestamptz,boolean)',
             'execute')
       and not has_function_privilege('anon',
             'public.adjust_stock(uuid,uuid,numeric,text,timestamptz,boolean)',
             'execute'));

select chk('9.7 …and the function is the ONLY route: `authenticated` holds no '
           'insert on stock_movement or stock_batch, so the fence cannot be '
           'walked around with a direct write',
           not has_table_privilege('authenticated','public.stock_movement','insert')
       and not has_table_privilege('authenticated','public.stock_batch','insert'));


-- ============================================ 10. the invariants ==============

select chk('10.1 §2.4''s balance invariant holds over every count this file '
           'wrote, including the two that repaid an overdraw',
           (select count(*) from batch_balance_violations()) = 0,
           format('violations=%s', (select count(*) from batch_balance_violations())));

select chk('10.2 0015''s receipt-completeness rule holds — every lot this file '
           'opened got its receipt in the same transaction, and the '
           'origin=''adjustment'' exclusion 4a settled is still what lets a '
           'counted lot be legal at all',
           (select count(*) from receipt_completeness_violations()) = 0);

select chk('10.3 every adjustment movement this file wrote is document-free and '
           'reason-correct — the whole population, not one sampled row',
           (select count(*) from stock_movement
             where reason = 'adjustment'
               and (purchase_id is not null or sale_id is not null
                 or waste_id is not null or transfer_group_id is not null)) = 0
       and (select count(*) from stock_movement where reason = 'adjustment') >= 10,
           format('adjustment movements=%s',
                  (select count(*) from stock_movement where reason='adjustment')));

select chk('10.4 no note leaked onto a movement that answers to a document — '
           'the column is nullable precisely so the other five RPCs never touch it',
           (select count(*) from stock_movement
             where note is not null and reason <> 'adjustment') = 0);

-- ⚠️⚠️ THE COUNT ITSELF — 4d-i's finding, and the guard is now standard. A verdict
-- recorded inside a transaction that ends in `rollback` VANISHES rather than
-- failing, and a report cannot miss a row that was never inserted. The literal
-- below is deliberately a literal: a count derived from the file would agree
-- with the file whatever the file did.
select chk('10.5 ALL 82 CHECKS IN THIS FILE ACTUALLY RAN — a verdict rolled back '
           'with its transaction leaves no trace at all',
           (select count(*) from public._verify) = 81,
           format('recorded=%s of 81 before this one',
                  (select count(*) from public._verify)));

drop function public.chk_json(text, text, text, text);
drop function public._adj(uuid, uuid, numeric, text, timestamptz, boolean);
drop function public._pl(uuid, numeric, numeric, date);
drop function public._sl(uuid, numeric, numeric);
drop function public._bal(uuid, uuid);


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
