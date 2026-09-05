-- ============================================================================
-- Behavioural verification for 0023 — adjust_stock_delta()
-- ============================================================================
-- ADR-035 §1, §2.3, §2.4, §2.5, §2.6, §2.7, §3 step 4.5, §9. docs/PLAN.md 4.5a.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0023_adjust_stock_delta.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- This is the first function of the failure path, and the first on the whole
-- write surface that NO CLIENT CAN CALL. Four claims are its alone:
--
--   ⚠️⚠️ IT IS UNREACHABLE FROM `authenticated`, AND THAT IS A DECISION, NOT AN
--   OVERSIGHT. Section 1 is `0023`'s decision 1 made falsifiable. ⚠️ A refusal
--   here is shared by TWO mechanisms — a missing EXECUTE grant and the location
--   wall both raise `42501` — so a `chk_raises` alone cannot tell "not granted"
--   from "not your store". 1.4–1.6 read the catalog instead, and 1.2 is the PAIR
--   that stops section 1 passing because the harness is broken: the same role, in
--   the same transaction, CAN call `adjust_stock`.
--
--   ⚠️⚠️ THE SHORTFALL BRANCHES ARE REACHABLE, WHICH IS THE OPPOSITE OF `0022`.
--   `supabase/tests/0022` section 4.6 asserts an ABSENCE — a count down never
--   opens a lot, because it can never ask for more than the shelf holds. A DELTA
--   can, and section 5 asserts the presence: an overdraw, and a lot opened by a
--   DOWNWARD move on a variant this store never stocked. That pair is the
--   sharpest statement of what "relative" costs.
--
--   ⚠️⚠️ A CREDIT REPAYS BEFORE IT OPENS, at each lot's own cost. 4f's decision,
--   carried over, and section 6 is `0004:429` made falsifiable a second time.
--   6.5–6.7 are the multi-debt subject 4f's F17 needed: with ONE debt an order
--   over one row is not an order, and a partial repayment cannot be observed.
--
--   ⚠️⚠️ IT IS NOT IDEMPOTENT AND CANNOT BE. Section 9 is the difference between
--   an absolute write and a relative one, stated as an experiment rather than as
--   a comment: the same call twice moves the balance twice — and the PAIR runs
--   `adjust_stock` twice against an identical fixture, where it converges. Only
--   the function differs, so only the function can explain it.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT CONCURRENCY. One connection cannot block on its own lock —
-- 4c-i's F6, 4e-i's F9 and 4f's F14, all measured. The `for update` in section 5
-- of `0023` is invisible to every check below. Two concurrent credits repaying
-- one debt belong in `supabase/vitest/`, and this is the owed row 4f opened, not
-- a new one.
--
-- ⚠️ NOTHING ABOUT `record_failed_write`. It is `0024` (task 4.5b). Until it
-- exists, the only caller this function was built for does not, and section 1's
-- "no grant" is therefore a claim about a door with nobody yet behind it.
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

-- 4e-ii-a's SIXTH shape of misleading green, and 4f paid for it twice: a call
-- written inline inside chk() escapes chk() entirely if it raises, psql stops
-- under ON_ERROR_STOP, and the file dies WITHOUT RECORDING A VERDICT.
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
-- ⚠️ THE EIGHTH ARGUMENT ARRIVED IN `0024`, and with it a constraint this file
-- has to satisfy: `stock_movement_downgrade_names_its_dead_letter` says a
-- movement whose reason is 'failed_write_downgrade' MUST name the dead letter it
-- answers to. Every call below passes the one stand-in row the fixture creates.
-- The constraint is `0024`'s to prove; this file only has to stop being a
-- counter-example to it.
create or replace function public._asd(p_loc uuid, p_var uuid, p_delta numeric,
                             p_reason text default 'failed_write_downgrade',
                             p_note text default null,
                             p_at timestamptz default null,
                             p_offline boolean default false,
                             p_fw uuid default null)
returns text language sql as $$
  select format('select public.adjust_stock_delta(%L::uuid, %L::uuid, '
                '%L::numeric, %L::public.adjustment_reason, %L::text, '
                '%L::timestamptz, %L::boolean, %L::uuid)',
                p_loc, p_var, p_delta, p_reason, p_note, p_at, p_offline,
                coalesce(p_fw, (select fw.id from public.failed_write fw
                                 where fw.error_code = 'TD-STANDIN')))
$$;
grant execute on function
  public._asd(uuid, uuid, numeric, text, text, timestamptz, boolean, uuid)
  to authenticated;

-- The ABSOLUTE sibling, for the pairs that need it (1.2, 9.3).
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

-- One lot's balance, for the per-lot claims section 6 makes.
create or replace function public._lot(p_batch uuid)
returns numeric language sql stable as $$
  select bb.remaining_base from public.batch_balance bb where bb.batch_id = p_batch
$$;


-- ---------------------------------------------------------------- fixture ----
-- FOUR identities, as `0022`: the wall needs a cashier who holds one store and
-- not the other, and 2.6 needs a manager of an UNRELATED workspace to prove the
-- wall answers on membership rather than on role.

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
-- The cashier holds loc_1 ONLY, so 2.4 can refuse them at a store in their own
-- workspace — the wall is `my_locations()`, not `my_workspaces()`.
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset

-- One variant per destructive path. A RELATIVE write leaves the shelf where it
-- put it, so two sections sharing a variant would each be moving the other's
-- result — the same rule `0022` followed for the opposite reason.
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam', 'Arroz',   'pza','pza','pza','pza', 0.0000),  -- down, one lot
  (:'ws_a', :'fam', 'Frijol',  'pza','pza','pza','pza', 0.0000),  -- down, THREE lots
  (:'ws_a', :'fam', 'Azucar',  'pza','pza','pza','pza', 0.0000),  -- down past the shelf
  (:'ws_a', :'fam', 'Cafe',    'pza','pza','pza','pza', 0.0000),  -- down, NEVER stocked
  (:'ws_a', :'fam', 'Aceite',  'pza','pza','pza','pza', 0.0000),  -- up: repay + open
  (:'ws_a', :'fam', 'Chile',   'pza','pza','pza','pza', 0.0000),  -- up: TWO debts, partial
  (:'ws_a', :'fam', 'Harina',  'pza','pza','pza','pza', 0.0000),  -- up with no debt
  (:'ws_a', :'fam', 'Sal',     'pza','pza','pza','pza', 0.0000),  -- the zero delta
  (:'ws_a', :'fam', 'Atun',    'pza','pza','pza','pza', 0.0000),  -- the timestamps
  (:'ws_a', :'fam', 'Leche',   'pza','pza','pza','pza', 0.0000),  -- twice: NOT idempotent
  (:'ws_a', :'fam', 'Galleta', 'pza','pza','pza','pza', 0.0000),  -- twice: adjust_stock PAIR
  (:'ws_a', :'fam', 'Pan',     'pza','pza','pza','pza', 0.0000),  -- the grant + the wall
  (:'ws_a', :'fam', 'Huevo',   'pza','pza','pza','pza', 0.0000);  -- the ladder's subject

select id as var_dn   from product_variant where workspace_id=:'ws_a' and name='Arroz'   \gset
select id as var_mult from product_variant where workspace_id=:'ws_a' and name='Frijol'  \gset
select id as var_over from product_variant where workspace_id=:'ws_a' and name='Azucar'  \gset
select id as var_new  from product_variant where workspace_id=:'ws_a' and name='Cafe'    \gset
select id as var_debt from product_variant where workspace_id=:'ws_a' and name='Aceite'  \gset
select id as var_two  from product_variant where workspace_id=:'ws_a' and name='Chile'   \gset
select id as var_free from product_variant where workspace_id=:'ws_a' and name='Harina'  \gset
select id as var_noop from product_variant where workspace_id=:'ws_a' and name='Sal'     \gset
select id as var_time from product_variant where workspace_id=:'ws_a' and name='Atun'    \gset
select id as var_2x   from product_variant where workspace_id=:'ws_a' and name='Leche'   \gset
select id as var_conv from product_variant where workspace_id=:'ws_a' and name='Galleta' \gset
select id as var_gr   from product_variant where workspace_id=:'ws_a' and name='Pan'     \gset
select id as var_lad  from product_variant where workspace_id=:'ws_a' and name='Huevo'   \gset

insert into product_family (workspace_id, name) values (:'ws_b', 'Ajena');
select id as fam_b from product_family where workspace_id=:'ws_b' \gset
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws_b', :'fam_b', 'Ajeno', 'pza','pza','pza','pza');
select id as var_b from product_variant where workspace_id=:'ws_b' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

-- ⚠️ THE STAND-IN DEAD LETTER, and it is a fixture rather than a subject. `0024`
-- added `stock_movement.failed_write_id` and a constraint pairing it with
-- `adjustment_reason = 'failed_write_downgrade'`, so every movement this file
-- writes needs one to point at. Inserted directly rather than through
-- `record_failed_write`, because that function would DOWNGRADE — and this file's
-- subject is the primitive underneath it, not the failure path.
insert into public.failed_write
  (id, workspace_id, location_id, kind, payload, error_code, reported_by)
values
  ('fa11ed23-0000-0000-0000-000000000001', :'ws_a', :'loc_1', 'sale',
   '{"lines": []}'::jsonb, 'TD-STANDIN', :owner_a);

-- Stock, put on the shelf by `record_purchase` rather than by hand — 4d-ii's
-- practice, so `0015`'s receipt-completeness rule is satisfied by the path a shop
-- uses rather than by a fixture that sidesteps it.
\set pur_dn '''dddd0023-0000-0000-0000-00000000000a'''
\set pur_m1 '''dddd0023-0000-0000-0000-00000000000b'''
\set pur_m2 '''dddd0023-0000-0000-0000-00000000000c'''
\set pur_m3 '''dddd0023-0000-0000-0000-00000000000d'''
\set pur_ov '''dddd0023-0000-0000-0000-00000000000e'''
\set pur_db '''dddd0023-0000-0000-0000-00000000000f'''
\set pur_np '''dddd0023-0000-0000-0000-000000000010'''
\set pur_tm '''dddd0023-0000-0000-0000-000000000011'''
\set pur_2x '''dddd0023-0000-0000-0000-000000000012'''
\set pur_cv '''dddd0023-0000-0000-0000-000000000013'''
\set pur_gr '''dddd0023-0000-0000-0000-000000000014'''
\set pur_ld '''dddd0023-0000-0000-0000-000000000015'''
\set pur_fr '''dddd0023-0000-0000-0000-000000000019'''
\set pur_t1 '''dddd0023-0000-0000-0000-000000000016'''
\set pur_t2 '''dddd0023-0000-0000-0000-000000000017'''
\set pur_t3 '''dddd0023-0000-0000-0000-000000000018'''
\set sal_db '''5a1e0023-0000-0000-0000-00000000000a'''
\set sal_t1 '''5a1e0023-0000-0000-0000-00000000000b'''
\set sal_t2 '''5a1e0023-0000-0000-0000-00000000000c'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select record_purchase(:pur_dn::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_dn'::uuid, 40, 2.00)) as r \gset

-- THREE lots, three expiry dates, so section 4's FEFO claim has a document that
-- can fail it. 4e-ii-b's rule 5: a per-lot claim needs a multi-lot subject.
-- FEFO order is Oct (5.00), Nov (7.00), Dec (3.00) — deliberately NOT the order
-- they were bought in and NOT the order of their costs, so a walk that sorted on
-- either would be visible.
select record_purchase(:pur_m1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_mult'::uuid, 10, 3.00, '2026-12-01')) as r \gset
select record_purchase(:pur_m2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_mult'::uuid, 10, 5.00, '2026-10-01')) as r \gset
select record_purchase(:pur_m3::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_mult'::uuid, 10, 7.00, '2026-11-01')) as r \gset

select record_purchase(:pur_ov::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_over'::uuid, 10, 2.00)) as r \gset
select record_purchase(:pur_db::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_debt'::uuid, 10, 6.25)) as r \gset
select record_purchase(:pur_np::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_noop'::uuid, 12, 2.00)) as r \gset
select record_purchase(:pur_tm::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_time'::uuid, 100, 2.00)) as r \gset
select record_purchase(:pur_2x::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_2x'::uuid, 20, 2.00)) as r \gset
select record_purchase(:pur_cv::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_conv'::uuid, 20, 2.00)) as r \gset
select record_purchase(:pur_gr::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_gr'::uuid, 30, 2.00)) as r \gset
select record_purchase(:pur_ld::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_lad'::uuid, 30, 2.00)) as r \gset
-- ⚠️ var_free CARRIES STOCK ON PURPOSE. "A credit with no debt" must not
-- accidentally mean "a credit against an empty shelf": phase one has to have
-- positive lots in front of it and still find nothing to repay, or 6.13 would
-- pass against a loop that repaid ANY lot rather than a negative one.
select record_purchase(:pur_fr::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_free'::uuid, 30, 2.00)) as r \gset

-- THE OVERDRAW for section 6, made the way a shop makes one: an unenforced sale
-- of more than the shelf holds. `enforce_stock_default` is false in `0001`, so
-- `allocate_fefo()` overdraws the lot it ran out on (`0010` branch 1).
select record_sale(:sal_db::uuid, :'loc_1'::uuid,
         public._sl(:'var_debt'::uuid, 15, 12.00)) as r \gset

-- TWO overdrawn lots on ONE variant plus a positive one — 4f's F17 subject,
-- rebuilt. Each oversale needs its own open lot to run out of, so the second
-- purchase lands AFTER the first oversale; the third is what makes a PARTIAL
-- repayment possible at all.
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

select id as lot_m_oct from stock_batch where variant_id = :'var_mult' and expiry_date = '2026-10-01' \gset
select id as lot_m_nov from stock_batch where variant_id = :'var_mult' and expiry_date = '2026-11-01' \gset
select id as lot_m_dec from stock_batch where variant_id = :'var_mult' and expiry_date = '2026-12-01' \gset
select id as lot_debt  from stock_batch where variant_id = :'var_debt' \gset
select id as lot_t1 from stock_batch where variant_id = :'var_two' and expiry_date = '2026-10-01' \gset
select id as lot_t2 from stock_batch where variant_id = :'var_two' and expiry_date = '2026-11-01' \gset
select id as lot_t3 from stock_batch where variant_id = :'var_two' and expiry_date = '2026-12-01' \gset


-- ============================================================================
-- 1. THE GRANT — no client can reach this function  (0023's decision 1)
-- ============================================================================
-- ⚠️ A `chk_raises` ALONE CANNOT CARRY THIS SECTION, and that is worth stating
-- rather than discovering. A missing EXECUTE grant raises `42501` and so does
-- the location wall, so 1.1 on its own would pass just as well against a
-- function that were granted to everyone and merely refused the store. 1.1
-- therefore uses a location the caller GENUINELY HOLDS — leaving the grant as
-- the only refusal available — and 1.4–1.6 read the catalog, where the two
-- mechanisms are not spelled the same way. 4e-ii-b's rule 2, in a new place: a
-- refusal cannot watch the thing it refuses on.

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select chk_raises('1.1 a signed-in OWNER, at a store they hold, cannot execute '
                  'adjust_stock_delta at all — it is the one function of §2.6''s '
                  'ten that is granted to nobody (0023 decision 1)',
                  public._asd(:'loc_1'::uuid, :'var_gr'::uuid, -1), '42501');

select chk_json('1.2 PAIR — the SAME role in the SAME transaction CAN call '
                'adjust_stock, so 1.1 is a statement about the grant and not '
                'about a broken harness or an expired session',
                public._adj(:'loc_1'::uuid, :'var_gr'::uuid, 30),
                'changed', 'false');
commit;

select chk('1.3 adjust_stock_delta is `security definer` — which is what lets a '
           'security-definer caller reach it while `authenticated` cannot',
           (select p.prosecdef from pg_proc p
             where p.oid = 'public.adjust_stock_delta(uuid,uuid,numeric,'
                           'public.adjustment_reason,text,timestamptz,boolean,'
                           'uuid)'::regprocedure));

select chk('1.4 `authenticated` holds NO execute privilege on it, read from the '
           'catalog rather than inferred from a refusal',
           not has_function_privilege('authenticated',
             'public.adjust_stock_delta(uuid,uuid,numeric,'
             'public.adjustment_reason,text,timestamptz,boolean,uuid)'::regprocedure,
             'execute'));

select chk('1.5 nor does `anon` or `service_role` — the `revoke ... from public` '
           'is what makes that true, because Postgres grants EXECUTE to PUBLIC on '
           'a new function by default and omitting it would silently do the '
           'opposite of what 0023 decided',
           not has_function_privilege('anon',
             'public.adjust_stock_delta(uuid,uuid,numeric,'
             'public.adjustment_reason,text,timestamptz,boolean,uuid)'::regprocedure,
             'execute')
       and not has_function_privilege('service_role',
             'public.adjust_stock_delta(uuid,uuid,numeric,'
             'public.adjustment_reason,text,timestamptz,boolean,uuid)'::regprocedure,
             'execute'));

select chk('1.6 PAIR — `authenticated` DOES hold execute on adjust_stock, the '
           'absolute sibling, so 1.4 is a difference between two functions and '
           'not a property of this schema''s grants in general',
           has_function_privilege('authenticated',
             'public.adjust_stock(uuid,uuid,numeric,text,timestamptz,boolean)'
             ::regprocedure, 'execute'));

select chk('1.7 the signature is §2.6''s five arguments, the offline pair '
           '0018–0022 all append, and 0024''s dead-letter link — EIGHT. A drift '
           'in either direction would make every check in this file address a '
           'different function',
           (select p.pronargs from pg_proc p
             where p.oid = 'public.adjust_stock_delta(uuid,uuid,numeric,'
                           'public.adjustment_reason,text,timestamptz,boolean,'
                           'uuid)'::regprocedure) = 8);


-- ============================================================================
-- 2. THE LOCATION WALL  (§2.6 — "every RPC validates its location first")
-- ============================================================================
-- ⚠️ THE WALL IS HERE EVEN THOUGH NO CLIENT CAN REACH THE FUNCTION, and these
-- checks are what make that more than a comment. The callers this function was
-- built for are themselves `security definer`, so RLS is not running when they
-- call it (4b-i's F1) and this block is the only thing between a bad
-- `p_location_id` and a movement at someone else's store.
--
-- The calls below run as the schema owner with a JWT set, because `authenticated`
-- cannot execute the function at all (section 1). The wall reads `my_locations()`
-- of the CLAIM, not of the database role, which is exactly what 2.4 and 2.6 prove.

select set_config('request.jwt.claims', :jwt_manager, false);

select chk_raises('2.1 a NULL location is refused before anything else happens',
                  public._asd(null::uuid, :'var_gr'::uuid, -1), '42501');

select chk_raises('2.2 a manager of workspace A cannot move stock at a store in '
                  'workspace B — the tenant wall',
                  public._asd(:'loc_b'::uuid, :'var_gr'::uuid, -1), '42501');

select chk_json('2.3 PAIR — the same manager, the same variant, the same delta, '
                'at a store they hold: recorded. Nothing but the location differs '
                'from 2.2',
                public._asd(:'loc_1'::uuid, :'var_gr'::uuid, -1),
                'changed', 'true');

select set_config('request.jwt.claims', :jwt_cashier, false);

select chk_raises('2.4 a CASHIER is refused at a store in their OWN workspace '
                  'that they are not assigned to — the wall is my_locations(), '
                  'not my_workspaces() (§2.7, "staff belong to a location")',
                  public._asd(:'loc_2'::uuid, :'var_gr'::uuid, -1), '42501');

select chk_json('2.5 PAIR — the same cashier at the store they ARE assigned to '
                'is not refused. ⚠️ AND THERE IS NO ROLE FENCE HERE: a cashier '
                'calling adjust_stock is refused TD003 by 0022, and this function '
                'deliberately does not repeat that, because record_failed_write '
                'must work for the cashier whose sale just failed (§2.6''s one '
                'deliberate exception, and 0023 decision 1)',
                public._asd(:'loc_1'::uuid, :'var_gr'::uuid, -1),
                'changed', 'true');

select set_config('request.jwt.claims', :jwt_owner_b, false);

select chk_raises('2.6 the OWNER of another workspace is refused at loc_1 — the '
                  'wall answers on membership, and a role in the wrong workspace '
                  'is not a role here',
                  public._asd(:'loc_1'::uuid, :'var_gr'::uuid, -1), '42501');

select set_config('request.jwt.claims', :jwt_manager, false);

select chk('2.7 the four refused calls in this section wrote NOTHING — only the '
           'two granted ones moved stock, and a wall that raises after writing '
           'would leave exactly the ledger corruption it exists to prevent',
           (select count(*) from stock_movement
             where variant_id = :'var_gr' and reason = 'adjustment') = 2
       and public._bal(:'loc_1'::uuid, :'var_gr'::uuid) = 28,
           format('adjustment movements=%s balance=%s',
                  (select count(*) from stock_movement
                    where variant_id = :'var_gr' and reason = 'adjustment'),
                  public._bal(:'loc_1'::uuid, :'var_gr'::uuid)));


-- ============================================================================
-- 3. THE ARGUMENTS
-- ============================================================================

select chk_raises('3.1 a NULL variant is refused',
                  public._asd(:'loc_1'::uuid, null::uuid, -1), '22023');

select chk_raises('3.2 a variant belonging to another workspace is refused — the '
                  'variant is checked against the workspace DERIVED from the '
                  'location, so the two cannot disagree (4b-i''s rule)',
                  public._asd(:'loc_1'::uuid, :'var_b'::uuid, -1), '22023');

select chk_raises('3.3 a NULL delta is refused — this function is RELATIVE, and a '
                  'missing delta is not a delta of zero',
                  public._asd(:'loc_1'::uuid, :'var_lad'::uuid, null), '22023');

select chk_raises('3.4 a NULL reason is refused. §2.6 puts `reason` in THIS '
                  'signature and not in adjust_stock''s: an absolute count is its '
                  'own explanation, a delta of -3 is not',
                  format('select public.adjust_stock_delta(%L::uuid, %L::uuid, '
                         '-1::numeric, null::public.adjustment_reason)',
                         :'loc_1', :'var_lad'), '22023');

select chk_raises('3.5 a delta with MORE PRECISION than numeric(14,3) is REFUSED '
                  'rather than silently rounded — 1.3b''s argument inherited '
                  'through 4f: invisibly wrong is worse than refused',
                  public._asd(:'loc_1'::uuid, :'var_lad'::uuid, -1.0005), '22023');

select chk_json('3.6 ⚠️ PAIR WITH 0022 — a NEGATIVE delta is LEGAL, where a '
                'negative COUNT is refused (0022 section 3): a shelf cannot hold '
                'less than nothing, but a downgrade is a negative move by '
                'definition. This is what "relative" buys',
                public._asd(:'loc_1'::uuid, :'var_lad'::uuid, -1),
                'changed', 'true');

select chk_json('3.7 ⚠️ PAIR WITH 0022 THE OTHER WAY — a delta of ZERO is a NO-OP, '
                'where a COUNT of zero is a real and common measurement (0022 '
                '3.6). Same word, opposite handling: one describes a shelf, the '
                'other describes no shelf at all',
                public._asd(:'loc_1'::uuid, :'var_noop'::uuid, 0),
                'changed', 'false');

select chk_json('3.8 a zero delta reports no movements',
                public._asd(:'loc_1'::uuid, :'var_noop'::uuid, 0),
                'movement_count', '0');

select chk('3.9 and wrote none — the report and the database agree, which is the '
           'only version of this claim that can fail. Forced by the schema too: '
           'stock_movement_sign_follows_reason requires qty_base <> 0',
           (select count(*) from stock_movement
             where variant_id = :'var_noop' and reason = 'adjustment') = 0
       and public._bal(:'loc_1'::uuid, :'var_noop'::uuid) = 12,
           format('movements=%s balance=%s',
                  (select count(*) from stock_movement
                    where variant_id = :'var_noop' and reason = 'adjustment'),
                  public._bal(:'loc_1'::uuid, :'var_noop'::uuid)));

select chk_json('3.10 a zero delta leaves previous_base and new_base equal',
                public._asd(:'loc_1'::uuid, :'var_noop'::uuid, 0),
                'new_base', '12.000');

select set_config('request.jwt.claims', null, false);
select chk_raises('3.11 ⚠️ AN UNAUTHENTICATED CALLER IS REFUSED BY THE WALL, NOT '
                  'BY THE AUTH GUARD, and this check records that honestly: with '
                  'no claim my_locations() returns nothing, so 42501 fires first '
                  'and the `v_user is null` branch below it is UNREACHABLE from '
                  'outside. It is defence in depth against a future caller that '
                  'validates the location some other way, not a live path — the '
                  'same shape 4e-ii-a recorded for its F11',
                  public._asd(:'loc_1'::uuid, :'var_lad'::uuid, -1), '42501');
select set_config('request.jwt.claims', :jwt_manager, false);


-- ============================================================================
-- 4. A NEGATIVE DELTA — FEFO out, through the one allocator
-- ============================================================================

select chk_json('4.1 a withdrawal against a single lot writes one movement',
                public._asd(:'loc_1'::uuid, :'var_dn'::uuid, -12, 'failed_write_downgrade',
                            'downgrade for a rejected sale'),
                'movement_count', '1');

select chk('4.2 the shelf moved by exactly the delta, and the movement is the '
           'negative of it at THE LOT''S cost — counted, not read, so a second '
           'row would fail this check as loudly as a wrong value (4b-ii''s rule)',
           (select count(*) from stock_movement
             where variant_id = :'var_dn' and reason = 'adjustment'
               and qty_base = -12 and unit_cost_net_per_base = 2.00) = 1
       and public._bal(:'loc_1'::uuid, :'var_dn'::uuid) = 28,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_dn'::uuid)));

select chk('4.3 the movement carries movement_reason ''adjustment'' AND the '
           'adjustment_reason the caller passed — the column 0023 had to add, '
           'because movement_reason is ''adjustment'' for every row this function '
           'writes and cannot carry the distinction',
           (select count(*) from stock_movement
             where variant_id = :'var_dn' and qty_base = -12
               and reason = 'adjustment'
               and adjustment_reason = 'failed_write_downgrade') = 1);

select chk('4.4 and it answers to no document — 0004''s '
           'stock_movement_source_agrees requires all four ids NULL for an '
           'adjustment, which is also why the failure path''s link lives on the '
           'failed_write row and not on this one (0004:320)',
           (select count(*) from stock_movement
             where variant_id = :'var_dn' and qty_base = -12
               and purchase_id is null and sale_id is null
               and waste_id is null and transfer_group_id is null) = 1);

select chk('4.5 the note is stored on every movement the call wrote',
           (select count(*) from stock_movement
             where variant_id = :'var_dn' and qty_base = -12
               and note = 'downgrade for a rejected sale') = 1);

select chk_json('4.6 a blank note is stored as NULL, not as a blank that reads '
                'like a note nobody wrote — 0003''s convention, and the '
                'not-blank check on the column enforces it',
                public._asd(:'loc_1'::uuid, :'var_dn'::uuid, -1,
                            'failed_write_downgrade', '   '),
                'note', null);

select chk('4.7 and the database agrees the note is null',
           (select count(*) from stock_movement
             where variant_id = :'var_dn' and qty_base = -1 and note is null) = 1);

select chk_json('4.8 a withdrawal spanning TWO lots writes TWO movements. ⚠️ THE '
                'SUBJECT HAS THREE LOTS ON PURPOSE — 4e-ii-b''s rule 5: a per-lot '
                'claim needs a multi-lot document, and an order over one row is '
                'not an order (4f''s F17)',
                public._asd(:'loc_1'::uuid, :'var_mult'::uuid, -15),
                'movement_count', '2');

select chk('4.9 FEFO took the OCTOBER lot to zero first — earliest expiry, not '
           'earliest purchase and not cheapest',
           public._lot(:'lot_m_oct'::uuid) = 0,
           format('oct=%s', public._lot(:'lot_m_oct'::uuid)));

select chk('4.10 then FIVE from the NOVEMBER lot, leaving five',
           public._lot(:'lot_m_nov'::uuid) = 5,
           format('nov=%s', public._lot(:'lot_m_nov'::uuid)));

select chk('4.11 ⚠️ THE DECEMBER LOT IS UNTOUCHED, and it is the discriminator: '
           'it was bought FIRST and is the CHEAPEST, so a walk sorted on either '
           'received_at or cost would have taken it',
           public._lot(:'lot_m_dec'::uuid) = 10,
           format('dec=%s', public._lot(:'lot_m_dec'::uuid)));

select chk('4.12 each movement carries ITS OWN lot''s cost — 5.00 and 7.00, not '
           'zero and not one price applied to both. A repayment or a withdrawal '
           'at the wrong cost leaves §2.9 with a lot whose history does not net '
           'out, and every quantity check in this file would still pass',
           (select count(*) from stock_movement
             where variant_id = :'var_mult' and reason = 'adjustment'
               and batch_id = :'lot_m_oct' and qty_base = -10
               and unit_cost_net_per_base = 5.00) = 1
       and (select count(*) from stock_movement
             where variant_id = :'var_mult' and reason = 'adjustment'
               and batch_id = :'lot_m_nov' and qty_base = -5
               and unit_cost_net_per_base = 7.00) = 1);

select chk('4.13 the shelf total moved by exactly the delta across all three lots',
           public._bal(:'loc_1'::uuid, :'var_mult'::uuid) = 15,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_mult'::uuid)));


-- ============================================================================
-- 5. THE SHORTFALL BRANCHES ARE REACHABLE — the opposite of 0022
-- ============================================================================
-- ⚠️⚠️ THIS IS THE SECTION THAT SEPARATES THE TWO FUNCTIONS MOST SHARPLY.
-- `supabase/tests/0022` section 4.6 asserts an ABSENCE: a count DOWN can never
-- ask for more than the shelf holds, because `counted_base >= 0` bounds it, so
-- `allocate_fefo()`'s shortfall branches are arithmetically unreachable and no
-- count down ever opens a lot. A DELTA has no such bound. Both claims are true,
-- both are asserted, and neither file could make the other's.

select chk_json('5.1 a delta LARGER than the shelf is recorded, not refused — the '
                'units are gone, which is why the write failed in the first '
                'place. 0004:429 permits the negative balance that results',
                public._asd(:'loc_1'::uuid, :'var_over'::uuid, -15),
                'changed', 'true');

select chk('5.2 the balance is NEGATIVE and is exactly previous + delta',
           public._bal(:'loc_1'::uuid, :'var_over'::uuid) = -5,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_over'::uuid)));

select chk('5.3 branch ONE overdrew the lot it ran out on rather than opening a '
           'new one — ONE movement, ONE lot, still the purchase lot',
           (select count(*) from stock_batch where variant_id = :'var_over') = 1
       and (select count(*) from stock_movement
             where variant_id = :'var_over' and reason = 'adjustment') = 1);

select chk_json('5.4 a variant this store has NEVER stocked accepts a downward '
                'delta — allocator branch THREE',
                public._asd(:'loc_1'::uuid, :'var_new'::uuid, -4),
                'changed', 'true');

select chk('5.5 ⚠️ AND IT OPENED A LOT ON THE WAY DOWN, which is precisely what '
           '0022 check 4.6 asserts a count can NEVER do. Origin ''adjustment'', '
           'so 4a''s receipt-completeness rule excludes it by design',
           (select count(*) from stock_batch
             where variant_id = :'var_new' and origin = 'adjustment') = 1,
           format('lots=%s',
                  (select count(*) from stock_batch where variant_id = :'var_new')));

select chk('5.6 the balance reads as the debt it is',
           public._bal(:'loc_1'::uuid, :'var_new'::uuid) = -4,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_new'::uuid)));

select chk('5.7 that lot costs ZERO and has NO expiry — 0010''s argument, '
           'unchanged: inventing an expiry would put a fictional lot at the head '
           'of the FEFO order, and a plausible invented cost is invisibly wrong '
           'where 100% margin is visibly wrong and gets asked about (1.3b)',
           (select count(*) from stock_batch
             where variant_id = :'var_new' and origin = 'adjustment'
               and unit_cost_net_per_base = 0 and expiry_date is null) = 1);


-- ============================================================================
-- 6. A POSITIVE DELTA — repay the debt, THEN open  (0004:429, and 4f)
-- ============================================================================

select chk('6.1 the subject starts overdrawn at -5, put there the way a shop does '
           'it: an unenforced sale of more than the shelf held',
           public._bal(:'loc_1'::uuid, :'var_debt'::uuid) = -5,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_debt'::uuid)));

select chk_json('6.2 a credit of 8 writes TWO movements — the repayment and the '
                'opening — not one',
                public._asd(:'loc_1'::uuid, :'var_debt'::uuid, 8),
                'movement_count', '2');

select chk('6.3 the overdrawn lot is back at ZERO. ⚠️ WITHOUT THIS THE TOTALS '
           'WOULD STILL BE RIGHT AND THE LOT WOULD BE IMMORTAL: allocate_fefo() '
           'reads only remaining_base > 0, so no sale, waste or transfer would '
           'ever touch it again (0004:429 names this function as the resolution)',
           public._lot(:'lot_debt'::uuid) = 0,
           format('lot=%s', public._lot(:'lot_debt'::uuid)));

select chk('6.4 ⚠️ THE REPAYMENT IS AT THE LOT''S OWN COST — 6.25, not zero. This '
           'is the ONLY check in the file that can tell a correct repayment from '
           'a zero-cost one: every quantity assertion in this section passes '
           'either way, and §2.9 would be left with a lot whose cost history does '
           'not net out',
           (select count(*) from stock_movement
             where variant_id = :'var_debt' and reason = 'adjustment'
               and batch_id = :'lot_debt' and qty_base = 5
               and unit_cost_net_per_base = 6.25) = 1);

select chk('6.5 the remaining 3 opened ONE new lot, zero cost, no expiry',
           (select count(*) from stock_batch
             where variant_id = :'var_debt' and origin = 'adjustment'
               and qty_received_base = 3 and unit_cost_net_per_base = 0
               and expiry_date is null) = 1);

select chk('6.6 and the shelf now reads the credit net of the debt',
           public._bal(:'loc_1'::uuid, :'var_debt'::uuid) = 3,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_debt'::uuid)));

select chk('6.7 the subject for the PARTIAL repayment holds TWO debts beside a '
           'positive lot — 4f''s F17 subject rebuilt, because with one debt a '
           'credit either clears it or does not and the ORDER of repayment is '
           'unobservable',
           public._lot(:'lot_t1'::uuid) = -3
       and public._lot(:'lot_t2'::uuid) = -3
       and public._lot(:'lot_t3'::uuid) = 20,
           format('t1=%s t2=%s t3=%s', public._lot(:'lot_t1'::uuid),
                  public._lot(:'lot_t2'::uuid), public._lot(:'lot_t3'::uuid)));

select chk_json('6.8 a credit of 2 against two debts of 3 writes exactly ONE '
                'movement',
                public._asd(:'loc_1'::uuid, :'var_two'::uuid, 2),
                'movement_count', '1');

select chk('6.9 it went to the OCTOBER debt, which is FEFO-first — partial, so '
           'the lot moves from -3 to -1',
           public._lot(:'lot_t1'::uuid) = -1,
           format('t1=%s', public._lot(:'lot_t1'::uuid)));

select chk('6.10 ⚠️ AND THE NOVEMBER DEBT IS UNTOUCHED. Reverse the repayment '
           'loop''s ordering and this is the check that goes red; with a single '
           'debt in the fixture, nothing would',
           public._lot(:'lot_t2'::uuid) = -3,
           format('t2=%s', public._lot(:'lot_t2'::uuid)));

select chk('6.11 and NO lot was opened, because the credit was smaller than the '
           'debt — the two phases are ordered, not alternatives. ⚠️ ASSERTED '
           'AGAINST THE DATABASE, NOT AGAINST A RETURN VALUE: the obvious way to '
           'write this is a second call with a delta of zero reading '
           'batch_opened, and that check passes whatever the function does, '
           'because a no-op opens no lot by definition (4e-ii-b''s rule 4)',
           (select count(*) from stock_batch
             where variant_id = :'var_two' and origin = 'adjustment') = 0,
           format('adjustment lots=%s',
                  (select count(*) from stock_batch
                    where variant_id = :'var_two' and origin = 'adjustment')));

select chk('6.12 the positive lot was never touched either — a repayment reads '
           'remaining_base < 0 and nothing else',
           public._lot(:'lot_t3'::uuid) = 20,
           format('t3=%s', public._lot(:'lot_t3'::uuid)));

select chk_json('6.13 a credit against a shelf with NO debt opens a lot directly '
                '— one movement, phase one finds nothing to repay',
                public._asd(:'loc_1'::uuid, :'var_free'::uuid, 5),
                'movement_count', '1');

select chk('6.14 that lot is the zero-cost, no-expiry shape, and the shelf grew '
           'by exactly the credit',
           (select count(*) from stock_batch
             where variant_id = :'var_free' and origin = 'adjustment'
               and qty_received_base = 5 and unit_cost_net_per_base = 0
               and expiry_date is null) = 1
       and public._bal(:'loc_1'::uuid, :'var_free'::uuid) = 35,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_free'::uuid)));


-- ============================================================================
-- 7. THE TIMESTAMPS  (§2.6, and 4d-ii's finding that 4f inherited)
-- ============================================================================
-- Each call carries a UNIQUE NOTE and every assertion reads the MOVEMENT back out
-- of the database rather than the returned jsonb. A return value is what the
-- function says it did; the movement is what it did.

select public.adjust_stock_delta(:'loc_1'::uuid, :'var_time'::uuid, -1,
         'failed_write_downgrade', 'T1', now() - interval '24 hours', false,
         'fa11ed23-0000-0000-0000-000000000001'::uuid) as r \gset

select chk('7.1 ONLINE — the server''s clock wins and the client''s value is '
           'ignored entirely (§2.6). The call passed a time 24 hours old',
           (select count(*) from stock_movement
             where note = 'T1' and occurred_at > now() - interval '5 minutes') = 1,
           format('occurred_at=%s',
                  (select occurred_at from stock_movement where note = 'T1')));

select public.adjust_stock_delta(:'loc_1'::uuid, :'var_time'::uuid, -1,
         'failed_write_downgrade', 'T2', now() - interval '24 hours', true,
         'fa11ed23-0000-0000-0000-000000000001'::uuid) as r \gset

select chk('7.2 OFFLINE — the client''s value is TRUSTED inside the 72-hour '
           'window. The pilot store writes offline as its normal path, so this is '
           'the ordinary case and not the exotic one',
           (select count(*) from stock_movement
             where note = 'T2'
               and occurred_at between now() - interval '24 hours 5 minutes'
                                   and now() - interval '23 hours 55 minutes') = 1,
           format('occurred_at=%s',
                  (select occurred_at from stock_movement where note = 'T2')));

select public.adjust_stock_delta(:'loc_1'::uuid, :'var_time'::uuid, -1,
         'failed_write_downgrade', 'T3', now() + interval '10 days', true,
         'fa11ed23-0000-0000-0000-000000000001'::uuid) as r \gset

select chk('7.3 OFFLINE, a FUTURE claim is clamped to now — a device clock ahead '
           'of the server cannot book stock movement into next week',
           (select count(*) from stock_movement
             where note = 'T3' and occurred_at <= now()
               and occurred_at > now() - interval '5 minutes') = 1,
           format('occurred_at=%s',
                  (select occurred_at from stock_movement where note = 'T3')));

select public.adjust_stock_delta(:'loc_1'::uuid, :'var_time'::uuid, -1,
         'failed_write_downgrade', 'T4', now() - interval '10 days', true,
         'fa11ed23-0000-0000-0000-000000000001'::uuid) as r \gset

select chk('7.4 OFFLINE, a claim older than 72 hours is clamped to the window''s '
           'floor and not to now — the write is old, and pretending otherwise '
           'would move a historical daily total',
           (select count(*) from stock_movement
             where note = 'T4'
               and occurred_at between now() - interval '72 hours 5 minutes'
                                   and now() - interval '71 hours 55 minutes') = 1,
           format('occurred_at=%s',
                  (select occurred_at from stock_movement where note = 'T4')));

select chk('7.5 `recorded_at` is server-set on every one of them, INCLUDING the '
           'one whose occurred_at is 72 hours back. It is the one column an '
           'offline write must not backdate (§2.6)',
           (select count(*) from stock_movement
             where note in ('T1','T2','T3','T4')
               and recorded_at > now() - interval '5 minutes') = 4,
           format('fresh recorded_at=%s',
                  (select count(*) from stock_movement
                    where note in ('T1','T2','T3','T4')
                      and recorded_at > now() - interval '5 minutes')));

select public.adjust_stock_delta(:'loc_1'::uuid, :'var_lad'::uuid, 5,
         'failed_write_downgrade', 'T5', now() - interval '48 hours', true,
         'fa11ed23-0000-0000-0000-000000000001'::uuid) as r \gset

select chk('7.6 ⚠️ A LOT OPENED BY A BACKDATED CREDIT IS RECEIVED AT THE EVENT '
           'TIME, NOT AT now(). received_at is FEFO''s SECOND SORT KEY (§2.4), so '
           'a lot stamped today would sort behind stock that arrived after it and '
           'ahead of stock that arrived before — the precise perishable case FEFO '
           'exists for. Found by 4d-ii, inherited by 4f, and inherited again here',
           (select count(*) from stock_batch sb
             join stock_movement sm on sm.batch_id = sb.id
            where sm.note = 'T5' and sb.origin = 'adjustment'
              and sb.received_at = sm.occurred_at
              and sb.received_at < now() - interval '47 hours') = 1,
           format('received_at=%s',
                  (select sb.received_at from stock_batch sb
                     join stock_movement sm on sm.batch_id = sb.id
                    where sm.note = 'T5' and sb.origin = 'adjustment')));


-- ============================================================================
-- 8. `adjustment_reason` — the column §2.6's signature assumed  (0023 decision 2)
-- ============================================================================

select chk('8.1 the column exists on stock_movement and is the enum, not text — '
           'a text column would leave §2.9 excluding downgrades with a LIKE',
           (select t.typname from pg_attribute a
              join pg_type t on t.oid = a.atttypid
             where a.attrelid = 'public.stock_movement'::regclass
               and a.attname = 'adjustment_reason'
               and not a.attisdropped) = 'adjustment_reason');

select chk('8.2 the enum ships exactly TWO values. ⚠️ THIS FILE WRITES ONLY ONE '
           'OF THEM: `physical_count` exists so the column means something the '
           'day adjust_stock is replaced to stamp it, and 0023 deliberately does '
           'not do that replacement — see 10.4, which asserts the gap rather than '
           'hiding it. There is no `replay_compensation`, because 0025 has not '
           'decided whether replay comes through this function at all',
           (select array_agg(e.enumlabel::text order by e.enumsortorder)
              from pg_enum e join pg_type t on t.oid = e.enumtypid
             where t.typname = 'adjustment_reason')
           = array['physical_count','failed_write_downgrade']);

select chk_raises('8.3 the constraint refuses an adjustment_reason on a movement '
                  'that answers to a DOCUMENT — the error that would actually '
                  'mislead a report, since a sale carrying a "downgrade" reason '
                  'would be excluded from revenue by anything reading the column. '
                  '⚠️ THE PHANTOM ROW IS A `sale` AND NOT A `purchase`, AND THAT '
                  'IS NOT COSMETIC: a purchase movement would break 0015''s '
                  'DEFERRED receipt-completeness constraint at COMMIT, which is '
                  'after chk_raises has returned — so the day this check stops '
                  'refusing, the file would DIE with no report instead of '
                  'printing a FAIL row. Measured, not reasoned: dropping the '
                  'constraint reported ABORTED until the row was changed, which '
                  'is 4f''s F11 in a new place',
                  format('insert into public.stock_movement (workspace_id, '
                         'location_id, batch_id, variant_id, reason, qty_base, '
                         'unit_cost_net_per_base, occurred_at, created_by, '
                         'sale_id, adjustment_reason) values (%L::uuid, '
                         '%L::uuid, %L::uuid, %L::uuid, ''sale'', -1, 6.25, '
                         'now(), %L::uuid, %L::uuid, ''physical_count'')',
                         :'ws_a', :'loc_1', :'lot_debt', :'var_debt',
                         :owner_a, :sal_db),
                  '23514');

-- ⚠️ SCOPED TO THIS POINT IN THE FILE ON PURPOSE. Section 9 calls adjust_stock,
-- which writes an adjustment movement carrying NO adjustment_reason, so the first
-- clause below stops being true four checks later — legitimately, and 10.4 is
-- where that gap is asserted instead.
select chk('8.4 every movement written THROUGH the function so far carries the '
           'reason it was passed, and the population is not trivial',
           (select count(*) from stock_movement
             where reason = 'adjustment'
               and adjustment_reason is distinct from 'failed_write_downgrade') = 0
       and (select count(*) from stock_movement
             where adjustment_reason = 'failed_write_downgrade') >= 15,
           format('stamped=%s unstamped=%s',
                  (select count(*) from stock_movement
                    where adjustment_reason = 'failed_write_downgrade'),
                  (select count(*) from stock_movement
                    where reason = 'adjustment' and adjustment_reason is null)));


-- ============================================================================
-- 9. IT IS NOT IDEMPOTENT, AND THAT IS THE POINT OF BEING RELATIVE
-- ============================================================================
-- ⚠️ 0022 has no idempotency key and needs none: "the second identical call
-- computes a delta of zero against the balance the first one wrote", so
-- CONVERGENCE is the guarantee. That argument does not survive the change from
-- absolute to relative, and 4f said so in advance — "a relative write applied
-- twice moves the balance twice, so 4.5 must supply a key of its own or accept
-- that record_failed_write is the only caller." 0023 accepts it. This section is
-- that acceptance made visible, PAIRED against the sibling on an identical
-- fixture so that only the function can explain the difference.

select chk_json('9.1 the first call moves the shelf',
                public._asd(:'loc_1'::uuid, :'var_2x'::uuid, -3),
                'changed', 'true');

select chk_json('9.2 the SECOND identical call is NOT a no-op — it reports a '
                'change, where 0022''s second identical count reports none',
                public._asd(:'loc_1'::uuid, :'var_2x'::uuid, -3),
                'changed', 'true');

select chk('9.3 and the shelf moved TWICE: 20 → 17 → 14, with two movements. A '
           'client that retries this call without a dead-letter key behind it '
           'double-counts, which is why 0023 is granted to nobody',
           public._bal(:'loc_1'::uuid, :'var_2x'::uuid) = 14
       and (select count(*) from stock_movement
             where variant_id = :'var_2x' and reason = 'adjustment') = 2,
           format('balance=%s movements=%s',
                  public._bal(:'loc_1'::uuid, :'var_2x'::uuid),
                  (select count(*) from stock_movement
                    where variant_id = :'var_2x' and reason = 'adjustment')));

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;

select chk_json('9.4 PAIR — adjust_stock, same starting shelf of 20, counted to '
                '17: the first call changes it',
                public._adj(:'loc_1'::uuid, :'var_conv'::uuid, 17),
                'changed', 'true');

select chk_json('9.5 and the SECOND identical call reports NO change — the delta '
                'it computes is zero. Same fixture, same quantity, opposite '
                'result, and the only difference is which function was called',
                public._adj(:'loc_1'::uuid, :'var_conv'::uuid, 17),
                'changed', 'false');
commit;

select chk('9.6 the absolute sibling wrote ONE movement and the shelf sits where '
           'the count put it, not three below it',
           public._bal(:'loc_1'::uuid, :'var_conv'::uuid) = 17
       and (select count(*) from stock_movement
             where variant_id = :'var_conv' and reason = 'adjustment') = 1,
           format('balance=%s movements=%s',
                  public._bal(:'loc_1'::uuid, :'var_conv'::uuid),
                  (select count(*) from stock_movement
                    where variant_id = :'var_conv' and reason = 'adjustment')));


-- ============================================================================
-- 10. THE INVARIANTS, OVER EVERYTHING THIS FILE WROTE
-- ============================================================================

select chk('10.1 §2.4''s invariant holds over every movement this file wrote, '
           'including the overdrawn lots and the repayments',
           (select count(*) from batch_balance_violations()) = 0,
           format('violations=%s', (select count(*) from batch_balance_violations())));

select chk('10.2 0015''s receipt-completeness rule holds — every lot this file '
           'opened got its receipt in the same transaction, and 4a''s '
           'origin=''adjustment'' exclusion is still what makes a lot opened by '
           'the allocator legal at all',
           (select count(*) from receipt_completeness_violations()) = 0);

select chk('10.3 every adjustment movement in the database is document-free — the '
           'whole population, not one sampled row',
           (select count(*) from stock_movement
             where reason = 'adjustment'
               and (purchase_id is not null or sale_id is not null
                 or waste_id is not null or transfer_group_id is not null)) = 0
       and (select count(*) from stock_movement where reason = 'adjustment') >= 20);

select chk('10.4 ⚠️ THE KNOWN GAP, ASSERTED RATHER THAN HIDDEN: the movement '
           'adjust_stock wrote in 9.4 carries adjustment_reason NULL, because '
           '0023 does not replace that applied function to stamp '
           '''physical_count''. So a null today means "a physical count, or a '
           'movement older than 0023". The day adjust_stock is replaced, THIS '
           'CHECK GOES RED and the person doing it is told where the assumption '
           'was written down',
           (select count(*) from stock_movement
             where variant_id = :'var_conv' and reason = 'adjustment'
               and adjustment_reason is null) = 1);

select chk('10.5 and no movement answering to a DOCUMENT carries one — the '
           'constraint 8.3 falsifies, asserted over the population as well',
           (select count(*) from stock_movement
             where adjustment_reason is not null and reason <> 'adjustment') = 0);

-- ⚠️⚠️ THE COUNT ITSELF — 4d-i's finding, now standard. A verdict recorded inside
-- a transaction that ends in `rollback` VANISHES rather than failing, and a
-- report cannot miss a row that was never inserted. The literal is deliberately a
-- literal: a count derived from the file would agree with the file whatever the
-- file did.
select chk('10.6 ALL 81 CHECKS IN THIS FILE ACTUALLY RAN — a verdict rolled back '
           'with its transaction leaves no trace at all',
           (select count(*) from public._verify) = 80,
           format('recorded=%s of 80 before this one',
                  (select count(*) from public._verify)));

drop function public.chk_json(text, text, text, text);
drop function public._asd(uuid, uuid, numeric, text, text, timestamptz, boolean, uuid);
drop function public._adj(uuid, uuid, numeric, text, timestamptz, boolean);
drop function public._pl(uuid, numeric, numeric, date);
drop function public._sl(uuid, numeric, numeric);
drop function public._bal(uuid, uuid);
drop function public._lot(uuid);


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  -- `is not true`, NOT `not passed` — a NULL condition prints FAIL and is
  -- invisible to `not passed`. Found in 4b-i, fixed in all six suites.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
