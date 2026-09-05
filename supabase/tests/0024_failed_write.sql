-- ============================================================================
-- Behavioural verification for 0024 — failed_write and record_failed_write()
-- ============================================================================
-- ADR-035 §1, §2.4, §2.5, §2.6, §2.7, §2.8, §2.10, §3 step 4.5, §9.
-- docs/PLAN.md task 4.5b.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0024_failed_write.sql
--
-- ⚠️ THIS FILE CLOSES ONE OF §2.10's NINE ROWS — the failure path: "a rejected
-- sale yields exactly one `failed_write` row, one linked compensating movement,
-- and a balance matching the shelf." It has been owed since step 3 and named in
-- docs/PLAN.md under *What step 3 does NOT ship* ever since. Section 4 is that
-- sentence, clause by clause.
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED, AND WHAT IS NEW ABOUT IT
-- ----------------------------------------------------------------------------
--   ⚠️⚠️ THE ONE DELIBERATE EXCEPTION IS AN ABSENCE, AND AN ABSENCE NEEDS A PAIR.
--   Every other RPC on this surface refuses a location the caller cannot reach;
--   this one must NOT. A check that "record_failed_write accepts loc_b" proves
--   nothing on its own — it would pass against a function with no wall anywhere.
--   2.5 is the discriminator: `record_sale` is called with the SAME location in
--   the SAME transaction and is refused 42501, so the difference is between two
--   functions and not a property of the fixture.
--
--   ⚠️⚠️ THE LINK IS THE AMENDMENT, AND THE MULTI-LOT CASE IS WHY IT EXISTS.
--   §2.6 said `failed_write.adjustment_movement_id`, singular. 4.8 dead-letters
--   ONE line that spans TWO lots and asserts BOTH movements carry the link — the
--   case a singular column cannot describe, and the reason the owner reversed it
--   on 2026-09-05. With a single-lot fixture this section would pass against
--   either design, which is 4e-ii-b's rule 5 again.
--
--   ⚠️⚠️ THE KIND RULE IS A DECISION, SO IT IS A PAIR. Section 5: same variant,
--   same quantity, same store, same error — the SALE downgrades and the PURCHASE
--   does not. Nothing but the kind can explain it. This is 4d-ii's shape, where
--   an availability check refuses a sale and records a write-off.
--
--   ⚠️⚠️ IDEMPOTENCY HERE PROTECTS THE LEDGER, NOT THE ROW. `adjust_stock_delta`
--   has no key of its own — `0023` said so and accepted it — so 6.3 is the check
--   that matters: a second report of one failure must not move the shelf again.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT REPLAY. `replay_failed_write` is `0025` (task 4.5c), and with
-- it §2.10's ninth row and the REPLAY MARKER that `0021`'s window basis has owed
-- since 4e-ii-a.
--
-- ⚠️ NOTHING ABOUT CONCURRENCY. One connection cannot block on its own lock.
-- Two clients reporting one failure at the same instant race on the primary key,
-- which is a real question and belongs in `supabase/vitest/`.
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

-- ⚠️ A HELPER THAT READS THE MESSAGE, and it exists because falsification said
-- it had to. `insufficient_privilege` IS SQLSTATE 42501 — the condition name and
-- the state are the same thing — so the auth guard and the workspace wall raise
-- indistinguishably, and a `chk_raises` on the state alone passes whichever one
-- fired. F3 deletes the auth guard and turned NOTHING red until this existed.
create function public.chk_raises_like(p_label text, p_sql text,
                                       p_state text, p_msg text)
returns void language plpgsql as $$
declare v_state text; v_msg text;
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_state := sqlstate; v_msg := sqlerrm;
  perform public.chk(p_label, v_state = p_state and v_msg like '%' || p_msg || '%',
                     format('sqlstate %s / %L', v_state, v_msg));
end;
$$;
grant execute on function
  public.chk_raises_like(text, text, text, text) to authenticated;

-- The call under test, as text.
create or replace function public._rfw(p_id uuid, p_kind text, p_ws uuid,
                             p_payload jsonb, p_code text default '42501',
                             p_detail text default null,
                             p_loc uuid default null)
returns text language sql as $$
  select format('select public.record_failed_write(%L::uuid, %L::text, %L::uuid, '
                '%L::jsonb, %L::text, %L::text, %L::uuid)',
                p_id, p_kind, p_ws, p_payload, p_code, p_detail, p_loc)
$$;
grant execute on function
  public._rfw(uuid, text, uuid, jsonb, text, text, uuid) to authenticated;

-- A payload in the shape decision 5 fixes: the original call's ARGUMENTS.
create or replace function public._pay(p_loc uuid, p_lines jsonb,
                             p_at timestamptz default null)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'location_id', p_loc, 'lines', p_lines, 'occurred_at', p_at))
$$;
grant execute on function public._pay(uuid, jsonb, timestamptz) to authenticated;

create or replace function public._pl(p_variant uuid, p_qty numeric,
                             p_price numeric default 4.00,
                             p_expiry date default null)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_net_per_base', p_price, 'expiry_date', p_expiry))
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

create or replace function public._bal(p_loc uuid, p_var uuid)
returns numeric language sql stable as $$
  select coalesce(sum(bb.remaining_base), 0)
    from public.batch_balance bb
   where bb.location_id = p_loc and bb.variant_id = p_var
$$;

-- How many movements name a given dead letter, and what they add up to.
create or replace function public._fwq(p_fw uuid)
returns numeric language sql stable as $$
  select coalesce(sum(sm.qty_base), 0) from public.stock_movement sm
   where sm.failed_write_id = p_fw
$$;
create or replace function public._fwn(p_fw uuid)
returns integer language sql stable as $$
  select count(*)::integer from public.stock_movement sm
   where sm.failed_write_id = p_fw
$$;


-- ---------------------------------------------------------------- fixture ----
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
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset

-- ⚠️ `var_conv` IS SOLD IN KILOS AND STORED IN GRAMS. The downgrade has to redo
-- the conversion `record_sale` did, and a variant whose display unit IS its base
-- unit cannot tell a correct conversion from no conversion at all.
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam', 'Arroz',   'pza','pza','pza','pza', 0.0000),  -- the plain sale
  (:'ws_a', :'fam', 'Frijol',  'pza','pza','pza','pza', 0.0000),  -- multi-LOT
  (:'ws_a', :'fam', 'Azucar',  'g','kg','kg','kg',      0.0000),  -- the conversion
  (:'ws_a', :'fam', 'Cafe',    'pza','pza','pza','pza', 0.0000),  -- the recorded PAIR
  (:'ws_a', :'fam', 'Aceite',  'pza','pza','pza','pza', 0.0000),  -- the KIND pair
  (:'ws_a', :'fam', 'Harina',  'pza','pza','pza','pza', 0.0000),  -- waste
  (:'ws_a', :'fam', 'Sal',     'pza','pza','pza','pza', 0.0000),  -- transfer
  (:'ws_a', :'fam', 'Atun',    'pza','pza','pza','pza', 0.0000),  -- idempotency
  (:'ws_a', :'fam', 'Leche',   'pza','pza','pza','pza', 0.0000),  -- partial payload
  (:'ws_a', :'fam', 'Galleta', 'pza','pza','pza','pza', 0.0000),  -- multi-LINE
  (:'ws_a', :'fam', 'Chile',   'pza','pza','pza','pza', 0.0000),  -- multi-LINE, 2nd
  (:'ws_a', :'fam', 'Pan',     'pza','pza','pza','pza', 0.0000);  -- the exception

select id as var_dn   from product_variant where workspace_id=:'ws_a' and name='Arroz'   \gset
select id as var_lots from product_variant where workspace_id=:'ws_a' and name='Frijol'  \gset
select id as var_kg   from product_variant where workspace_id=:'ws_a' and name='Azucar'  \gset
select id as var_real from product_variant where workspace_id=:'ws_a' and name='Cafe'    \gset
select id as var_kind from product_variant where workspace_id=:'ws_a' and name='Aceite'  \gset
select id as var_wst  from product_variant where workspace_id=:'ws_a' and name='Harina'  \gset
select id as var_trf  from product_variant where workspace_id=:'ws_a' and name='Sal'     \gset
select id as var_idem from product_variant where workspace_id=:'ws_a' and name='Atun'    \gset
select id as var_part from product_variant where workspace_id=:'ws_a' and name='Leche'   \gset
select id as var_l1   from product_variant where workspace_id=:'ws_a' and name='Galleta' \gset
select id as var_l2   from product_variant where workspace_id=:'ws_a' and name='Chile'   \gset
select id as var_exc  from product_variant where workspace_id=:'ws_a' and name='Pan'     \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

\set pur_dn '''dddd0024-0000-0000-0000-00000000000a'''
\set pur_l1 '''dddd0024-0000-0000-0000-00000000000b'''
\set pur_l2 '''dddd0024-0000-0000-0000-00000000000c'''
\set pur_kg '''dddd0024-0000-0000-0000-00000000000d'''
\set pur_rl '''dddd0024-0000-0000-0000-00000000000e'''
\set pur_kd '''dddd0024-0000-0000-0000-00000000000f'''
\set pur_ws '''dddd0024-0000-0000-0000-000000000010'''
\set pur_tf '''dddd0024-0000-0000-0000-000000000011'''
\set pur_id '''dddd0024-0000-0000-0000-000000000012'''
\set pur_pt '''dddd0024-0000-0000-0000-000000000013'''
\set pur_m1 '''dddd0024-0000-0000-0000-000000000014'''
\set pur_m2 '''dddd0024-0000-0000-0000-000000000015'''
\set pur_ex '''dddd0024-0000-0000-0000-000000000016'''
\set sal_rl '''5a1e0024-0000-0000-0000-00000000000a'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select record_purchase(:pur_dn::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_dn'::uuid, 40, 2.00)) as r \gset

-- TWO lots for the multi-lot claim, oldest expiry first in FEFO so a downgrade of
-- 12 must span both. This is the case §2.6's singular column could not describe.
select record_purchase(:pur_l1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_lots'::uuid, 10, 3.00, '2026-10-01')) as r \gset
select record_purchase(:pur_l2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_lots'::uuid, 10, 5.00, '2026-11-01')) as r \gset

select record_purchase(:pur_kg::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_kg'::uuid, 5, 30.00)) as r \gset
select record_purchase(:pur_rl::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_real'::uuid, 40, 2.00)) as r \gset
select record_purchase(:pur_kd::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_kind'::uuid, 40, 2.00)) as r \gset
select record_purchase(:pur_ws::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_wst'::uuid, 40, 2.00)) as r \gset
select record_purchase(:pur_tf::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_trf'::uuid, 40, 2.00)) as r \gset
select record_purchase(:pur_id::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_idem'::uuid, 40, 2.00)) as r \gset
select record_purchase(:pur_pt::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_part'::uuid, 40, 2.00)) as r \gset
select record_purchase(:pur_m1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_l1'::uuid, 40, 2.00)) as r \gset
select record_purchase(:pur_m2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_l2'::uuid, 40, 2.00)) as r \gset
select record_purchase(:pur_ex::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_exc'::uuid, 40, 2.00)) as r \gset

-- The PAIR for 4.6: a sale that actually LANDED, of the same quantity in the same
-- units as the one dead-lettered below.
select record_sale(:sal_rl::uuid, :'loc_1'::uuid,
         public._sl(:'var_real'::uuid, 7, 12.00)) as r \gset
commit;

\set fw_plain '''fa11ed24-0000-0000-0000-00000000000a'''
\set fw_lots  '''fa11ed24-0000-0000-0000-00000000000b'''
\set fw_kg    '''fa11ed24-0000-0000-0000-00000000000c'''
\set fw_real  '''fa11ed24-0000-0000-0000-00000000000d'''
\set fw_sale  '''fa11ed24-0000-0000-0000-00000000000e'''
\set fw_pur   '''fa11ed24-0000-0000-0000-00000000000f'''
\set fw_wst   '''fa11ed24-0000-0000-0000-000000000010'''
\set fw_trf   '''fa11ed24-0000-0000-0000-000000000011'''
\set fw_idem  '''fa11ed24-0000-0000-0000-000000000012'''
\set fw_part  '''fa11ed24-0000-0000-0000-000000000013'''
\set fw_multi '''fa11ed24-0000-0000-0000-000000000014'''
\set fw_noloc '''fa11ed24-0000-0000-0000-000000000015'''
\set fw_ghost '''fa11ed24-0000-0000-0000-000000000016'''
\set fw_denied '''fa11ed24-0000-0000-0000-000000000017'''
\set fw_null  '''fa11ed24-0000-0000-0000-000000000018'''
\set fw_nolines '''fa11ed24-0000-0000-0000-000000000019'''
\set fw_at    '''fa11ed24-0000-0000-0000-00000000001a'''
\set ghost_loc 0c0c0c0c-0000-0000-0000-0000000000ff
\set ghost_var 0f0f0f0f-0000-0000-0000-0000000000ff


-- ============================================================================
-- 1. THE TABLE, ITS WALLS AND ITS GRANTS  (§2.7, §2.8, and 3.1's finding)
-- ============================================================================

select chk('1.1 RLS is ENABLED on failed_write. §2.10''s structural suite
            computes its plan from pg_class, so it covers this table the day it
            lands — but a suite that would have gone red is not the same as a
            claim this file makes',
           (select c.relrowsecurity from pg_class c
             where c.oid = 'public.failed_write'::regclass));

select chk('1.2 exactly one policy, `for select` and `to authenticated` — §2.7: '
           '"a policy created without a verb defaults to ALL, and one created '
           'without TO targets PUBLIC, which on this schema would hand the '
           'predicate to anon as well"',
           (select count(*) from pg_policy p
             where p.polrelid = 'public.failed_write'::regclass) = 1
       and (select p.polcmd from pg_policy p
             where p.polrelid = 'public.failed_write'::regclass) = 'r'
       and (select 'authenticated' = any(
                     select r.rolname from pg_roles r
                      where r.oid = any(p.polroles))
              from pg_policy p
             where p.polrelid = 'public.failed_write'::regclass));

select chk('1.3 `authenticated` holds SELECT and NOTHING ELSE. ⚠️ TRUNCATE is the '
           'one that matters and it is the one nobody looks at: alter default '
           'privileges on this project grants it to anon and authenticated on '
           'every new table, TRUNCATE IGNORES RLS ENTIRELY, and the table is only '
           'clean because this migration revoked before it granted (3.1)',
           has_table_privilege('authenticated', 'public.failed_write', 'select')
       and not has_table_privilege('authenticated', 'public.failed_write', 'insert')
       and not has_table_privilege('authenticated', 'public.failed_write', 'update')
       and not has_table_privilege('authenticated', 'public.failed_write', 'delete')
       and not has_table_privilege('authenticated', 'public.failed_write', 'truncate'));

select chk('1.4 `anon` holds nothing at all, including TRUNCATE',
           not has_table_privilege('anon', 'public.failed_write', 'select')
       and not has_table_privilege('anon', 'public.failed_write', 'truncate'));

select chk('1.5 ⚠️ `location_id` HAS NO FOREIGN KEY, AND THAT IS THE DECISION. '
           'Every other location column in this schema is a composite FK to '
           'location (id, workspace_id). Here an FK would REFUSE precisely the '
           'report the table exists to preserve — §2.6 names "a variant deleted '
           'between capture and flush" among the permanent failures, and a '
           'deleted LOCATION is the same event. Asserted, because a later '
           'migration "tidying" this would look like an improvement',
           not exists (select 1 from pg_constraint c
                         join pg_attribute a
                           on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
                        where c.conrelid = 'public.failed_write'::regclass
                          and c.contype = 'f' and a.attname = 'location_id'));

select chk('1.6 PAIR — `workspace_id` DOES have one, so 1.5 is a difference '
           'between two columns and not a table nobody constrained. §2.6''s '
           'exception is about the location and only the location',
           exists (select 1 from pg_constraint c
                     join pg_attribute a
                       on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
                    where c.conrelid = 'public.failed_write'::regclass
                      and c.contype = 'f' and a.attname = 'workspace_id'));

select chk('1.7 the row is NOT immutable, unlike every document in 0003 — no '
           '`before update or delete` trigger. 0025''s replay must mark a row '
           'replayed, and what protects the LEDGER is stock_movement''s own '
           'trigger, which is untouched',
           (select count(*) from pg_trigger t
             where t.tgrelid = 'public.failed_write'::regclass
               and not t.tgisinternal) = 0
       and (select count(*) from pg_trigger t
             where t.tgrelid = 'public.stock_movement'::regclass
               and not t.tgisinternal) > 0);


-- ============================================================================
-- 2. THE ONE DELIBERATE EXCEPTION — workspace yes, location no  (§2.6)
-- ============================================================================

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;

select chk_json('2.1 ⚠️ A LOCATION THE CALLER CANNOT REACH IS STILL RECORDED. '
                'loc_2 is in the cashier''s own workspace and they are not '
                'assigned to it — the commonest permanent failure there is, and '
                'the whole reason this function does not check the location',
                public._rfw(:fw_denied::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_2'::uuid, public._sl(:'var_exc'::uuid, 3)),
                            '42501', 'location not accessible', :'loc_2'::uuid),
                'already_recorded', 'false');

select chk_raises('2.2 PAIR — `record_sale` REFUSES that same location, in the '
                  'same transaction, for the same caller. So 2.1 is a difference '
                  'between two functions and not a fixture with no wall anywhere '
                  '— which is the only way to state an ABSENCE as evidence',
                  format('select public.record_sale(%L::uuid, %L::uuid, %s)',
                         '5a1e0024-0000-0000-0000-0000000000ff', :'loc_2',
                         quote_literal(public._sl(:'var_exc'::uuid, 3)) || '::jsonb'),
                  '42501');

select chk_json('2.3 a location that DOES NOT EXIST is recorded too — this is '
                'the missing foreign key doing its job',
                public._rfw(:fw_ghost::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'ghost_loc'::uuid, public._sl(:'var_exc'::uuid, 3)),
                            '23503', 'location vanished between capture and flush',
                            :'ghost_loc'::uuid),
                'already_recorded', 'false');

select chk_json('2.4 and so is a write that never named a location at all',
                public._rfw(:fw_noloc::uuid, 'sale', :'ws_a'::uuid,
                            jsonb_build_object('lines', public._sl(:'var_exc'::uuid, 3)),
                            '22023', 'location_id is required'),
                'already_recorded', 'false');

select chk_json('2.6b ⚠️ AND IT SAYS WHY IT DID NOT MOVE STOCK. Without this, '
                'deleting the location check from the downgrade branch turns '
                'NOTHING red — F15 measured exactly that: adjust_stock_delta '
                'refuses each line anyway, the per-line handler counts it, and '
                'every balance assertion still passes',
                public._rfw('fa11ed24-0000-0000-0000-0000000000a1'::uuid, 'sale',
                            :'ws_a'::uuid,
                            public._pay(:'loc_2'::uuid, public._sl(:'var_exc'::uuid, 3)),
                            '42501', null, :'loc_2'::uuid),
                'downgrade_skipped', 'location_not_accessible');

select chk_json('2.7 and the reason is reported rather than swallowed',
                public._rfw(:fw_denied::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_2'::uuid, public._sl(:'var_exc'::uuid, 3)),
                            '42501', null, :'loc_2'::uuid),
                'downgrade_skipped', 'already_recorded');
commit;


-- ⚠️⚠️ 2.5 AND 2.6 RUN AS THE SCHEMA OWNER, OUTSIDE THE ROLE BLOCK ABOVE, AND
-- THAT IS A CORRECTION RATHER THAN A STYLE. Written inside `set local role
-- authenticated` they were claims about what a CASHIER CAN SEE, not about what
-- the function WROTE: `failed_write_select` is owner-only (§2.8) and
-- `stock_movement_select` is manager-gated, so a cashier reads zero of both.
-- 2.5 went red and 2.6 WENT GREEN — vacuously, `0 = 0` — which is the more
-- dangerous half. This is 4b-i's finding for the third time: a cashier writes a
-- ledger they cannot read, and a check that reads it back must not be the
-- cashier.
select chk('2.5 ⚠️ A CASHIER CAN CALL IT — there is no role fence, and there must '
           'not be. §2.7 puts stock adjustment behind manager, but the person '
           'whose write was just rejected is the cashier, and a fence would '
           'refuse the report in its commonest case. All four rows above were '
           'written by staff',
           (select count(*) from public.failed_write
             where reported_by = :cashier_a) = 4);

select chk('2.6 none of them moved stock — the location was unreachable or '
           'unreal in all three, so the ROW landed and the LEDGER did not move. '
           'That split is the whole design',
           public._fwn(:fw_denied::uuid) = 0
       and public._fwn(:fw_ghost::uuid) = 0
       and public._fwn(:fw_noloc::uuid) = 0
       and public._bal(:'loc_1'::uuid, :'var_exc'::uuid) = 40,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_exc'::uuid)));


begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
select chk_raises('2.8 THE WORKSPACE IS VALIDATED, and this is the half §2.6 '
                  'keeps: an owner of workspace B cannot file a dead letter '
                  'against workspace A',
                  public._rfw('fa11ed24-0000-0000-0000-0000000000bb'::uuid, 'sale',
                              :'ws_a'::uuid,
                              public._pay(:'loc_1'::uuid, public._sl(:'var_exc'::uuid, 3)),
                              '42501'),
                  '42501');
commit;

select chk_raises_like('2.9 an unauthenticated caller is refused BY THE AUTH '
                  'GUARD, and the check reads the MESSAGE because it cannot read '
                  'the state. ⚠️ `insufficient_privilege` IS 42501 — the '
                  'condition name and the sqlstate are one thing — so an '
                  'unauthenticated caller fails the workspace wall too, and a '
                  'state-only check passes whichever fired. F3 deletes the guard '
                  'and turned NOTHING red until this check read the sentence',
                  public._rfw('fa11ed24-0000-0000-0000-0000000000cc'::uuid, 'sale',
                              :'ws_a'::uuid,
                              public._pay(:'loc_1'::uuid, public._sl(:'var_exc'::uuid, 3)),
                              '42501'),
                  '42501', 'requires an authenticated caller');


-- ============================================================================
-- 3. THE DEAD LETTER ITSELF  (§2.6 step 1)
-- ============================================================================
-- ⚠️ THE CALLER IS SET AT SESSION LEVEL HERE. Without it every check below is
-- refused by the AUTH guard before it reaches the argument it is about — and
-- because `insufficient_privilege` IS 42501, that refusal is indistinguishable
-- from the workspace wall. Four checks wanted 22023 and got 42501 for exactly
-- that reason before this line existed.
select set_config('request.jwt.claims', :jwt_owner, false);


select chk('3.1 the row carries everything §2.6 lists — client uuid, workspace, '
           'location, kind, payload, error code and detail, failed_at',
           (select count(*) from public.failed_write fw
             where fw.id = :fw_denied and fw.workspace_id = :'ws_a'
               and fw.location_id = :'loc_2' and fw.kind = 'sale'
               and fw.error_code = '42501'
               and fw.error_detail = 'location not accessible'
               and fw.payload ? 'lines'
               and fw.failed_at > now() - interval '5 minutes') = 1);

select chk('3.2 `reported_by` is the caller, not the payload''s author — a dead '
           'letter records who FILED it',
           (select fw.reported_by from public.failed_write fw
             where fw.id = :fw_denied) = :cashier_a);

select public.record_failed_write(
         'fa11ed24-0000-0000-0000-0000000000d0'::uuid, 'sale', :'ws_a'::uuid,
         public._pay(:'loc_1'::uuid, public._sl(:'var_exc'::uuid, 1)),
         '42501', '   ', :'loc_1'::uuid) as r \gset

select chk('3.3 a BLANK error_detail is stored as NULL, 0003''s convention for '
           'text that means something when present — a blank reads like a detail '
           'nobody wrote, and §2.10''s nightly check would report it as one',
           (select fw.error_detail is null from public.failed_write fw
             where fw.id = 'fa11ed24-0000-0000-0000-0000000000d0')
       and (select fw.error_detail = 'location not accessible'
              from public.failed_write fw where fw.id = :fw_denied),
           'and the PAIR: a real detail survives untouched');

select chk_raises('3.4 an unrecognised kind is REFUSED. ⚠️ THIS IS THE ONE PLACE '
                  'THIS FUNCTION RAISES OVER CONTENT, and the line is at the '
                  'PAYLOAD: an unknown kind cannot be stored '
                  '(failed_write_kind_known) and could never be replayed, so '
                  'refusing it loses nothing that was ever recoverable. Every '
                  'error INSIDE the payload is absorbed instead — section 7',
                  public._rfw('fa11ed24-0000-0000-0000-0000000000d1'::uuid,
                              'invoice', :'ws_a'::uuid,
                              public._pay(:'loc_1'::uuid, public._sl(:'var_exc'::uuid, 1)),
                              '42501'),
                  '22023');

select chk_raises('3.5 a payload that is an ARRAY rather than an object is '
                  'refused — decision 5: the payload is the original call''s '
                  'ARGUMENTS, because replay_failed_write has to re-run the call '
                  'from it, and a bare lines array cannot say which location',
                  public._rfw('fa11ed24-0000-0000-0000-0000000000d2'::uuid,
                              'sale', :'ws_a'::uuid,
                              public._sl(:'var_exc'::uuid, 1),
                              '42501'),
                  '22023');

select chk_raises('3.6 a null id is refused — it is the idempotency key, and '
                  'without it a re-report would downgrade the shelf twice',
                  public._rfw(null::uuid, 'sale', :'ws_a'::uuid,
                              public._pay(:'loc_1'::uuid, public._sl(:'var_exc'::uuid, 1)),
                              '42501'),
                  '22023');

select chk_raises('3.7 a blank error_code is refused — §2.10''s nightly check '
                  'groups by it, and "" is not a class of failure',
                  public._rfw('fa11ed24-0000-0000-0000-0000000000d3'::uuid,
                              'sale', :'ws_a'::uuid,
                              public._pay(:'loc_1'::uuid, public._sl(:'var_exc'::uuid, 1)),
                              '   '),
                  '22023');

select chk_json('3.9 ⚠️ A `location_id` THAT IS NOT A UUID AT ALL is still '
                'recorded, with a NULL location. The obvious spelling — '
                '(payload->>''location_id'')::uuid — RAISES on this input, and '
                'would lose the event over the one field the client fills in '
                'automatically. Decision 6 in one line',
                public._rfw('fa11ed24-0000-0000-0000-0000000000d4'::uuid, 'sale',
                            :'ws_a'::uuid,
                            jsonb_build_object('location_id', 'not-a-uuid',
                                               'lines', public._sl(:'var_exc'::uuid, 1)),
                            '22P02', 'the client sent rubbish'),
                'already_recorded', 'false');

select chk('3.10 and its location is NULL rather than a guess',
           (select fw.location_id is null from public.failed_write fw
             where fw.id = 'fa11ed24-0000-0000-0000-0000000000d4'));

select chk('3.8 none of those four refusals left a row behind',
           (select count(*) from public.failed_write
             where id in ('fa11ed24-0000-0000-0000-0000000000d1',
                          'fa11ed24-0000-0000-0000-0000000000d2',
                          'fa11ed24-0000-0000-0000-0000000000d3')) = 0);


-- ============================================================================
-- 4. §2.10's FAILURE-PATH ROW, CLAUSE BY CLAUSE
-- ============================================================================
-- "A rejected sale yields exactly ONE failed_write row, ONE LINKED compensating
--  movement, and a BALANCE MATCHING THE SHELF."

select set_config('request.jwt.claims', :jwt_cashier, false);

select chk_json('4.1 a rejected sale of 12 downgrades',
                public._rfw(:fw_plain::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_dn'::uuid, 12)),
                            '42501', 'membership changed mid-flush', :'loc_1'::uuid),
                'downgraded', 'true');

select chk('4.2 EXACTLY ONE failed_write row',
           (select count(*) from public.failed_write where id = :fw_plain) = 1);

select chk('4.3 ONE compensating movement, and it is LINKED — the amendment. It '
           'carries the dead letter''s id, the downgrade reason, and no document',
           (select count(*) from public.stock_movement sm
             where sm.failed_write_id = :fw_plain
               and sm.reason = 'adjustment'
               and sm.adjustment_reason = 'failed_write_downgrade'
               and sm.qty_base = -12
               and sm.purchase_id is null and sm.sale_id is null
               and sm.waste_id is null and sm.transfer_group_id is null) = 1);

select chk('4.4 and A BALANCE MATCHING THE SHELF: 40 on the shelf, 12 sold and '
           'never recorded, 28 left',
           public._bal(:'loc_1'::uuid, :'var_dn'::uuid) = 28,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_dn'::uuid)));

select chk_json('4.5 ⚠️ ONE LINE OVER TWO LOTS WRITES TWO MOVEMENTS, AND THIS IS '
                'THE CASE §2.6''s SINGULAR `adjustment_movement_id` COULD NOT '
                'DESCRIBE. The subject holds 10 + 10 and the downgrade asks for '
                '12, so FEFO spans both lots',
                public._rfw(:fw_lots::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_lots'::uuid, 12)),
                            '42501', null, :'loc_1'::uuid),
                'movement_count', '2');

select chk('4.6 BOTH movements name the dead letter, and together they are the '
           'whole quantity. A design that stored one movement id would have '
           'recorded the first and lost the second — and 0025 would compensate '
           'ten of the twelve units, leaving the ledger short by exactly the '
           'difference §2.6 says must never arise',
           public._fwn(:fw_lots::uuid) = 2
       and public._fwq(:fw_lots::uuid) = -12,
           format('movements=%s qty=%s', public._fwn(:fw_lots::uuid),
                  public._fwq(:fw_lots::uuid)));

select chk_json('4.7 TWO LINES downgrade both variants — the other half of "not '
                'singular"',
                public._rfw(:fw_multi::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid,
                              public._sl(:'var_l1'::uuid, 6) || public._sl(:'var_l2'::uuid, 6)),
                            '42501', null, :'loc_1'::uuid),
                'lines_downgraded', '2');

select chk('4.8 both shelves moved and both movements are linked to the one row',
           public._bal(:'loc_1'::uuid, :'var_l1'::uuid) = 34
       and public._bal(:'loc_1'::uuid, :'var_l2'::uuid) = 34
       and public._fwn(:fw_multi::uuid) = 2,
           format('l1=%s l2=%s n=%s', public._bal(:'loc_1'::uuid, :'var_l1'::uuid),
                  public._bal(:'loc_1'::uuid, :'var_l2'::uuid),
                  public._fwn(:fw_multi::uuid)));

select chk_json('4.9 ⚠️ THE UNIT CONVERSION IS REDONE, and the subject is sold in '
                'KILOS and stored in GRAMS so that a downgrade which skipped the '
                'conversion would be off by a factor of a thousand. 5 kg on the '
                'shelf, a rejected sale of 2 kg',
                public._rfw(:fw_kg::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_kg'::uuid, 2)),
                            '42501', null, :'loc_1'::uuid),
                'downgraded', 'true');

select chk('4.10 and it moved 2000 GRAMS, not 2 — with 3000 left',
           public._fwq(:fw_kg::uuid) = -2000
       and public._bal(:'loc_1'::uuid, :'var_kg'::uuid) = 3000,
           format('moved=%s balance=%s', public._fwq(:fw_kg::uuid),
                  public._bal(:'loc_1'::uuid, :'var_kg'::uuid)));

select chk_json('4.11 ⚠️ THE DRIFT CHECK, AND IT IS THE POINT OF THIS SECTION. '
                'The same variant and the same quantity were SOLD for real in '
                'the fixture; this dead-letters an identical one. §2.11 already '
                'names arithmetic existing twice as the concession this system '
                'accepts, and the conversion inside record_failed_write is a '
                'THIRD copy of record_sale''s',
                public._rfw(:fw_real::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_real'::uuid, 7)),
                            '42501', null, :'loc_1'::uuid),
                'downgraded', 'true');

select chk('4.12 the DOWNGRADE moved exactly what the SALE moved — measured '
           'against the real sale''s own movements, not against a literal, so a '
           'change to either side breaks it',
           public._fwq(:fw_real::uuid)
             = (select sum(sm.qty_base) from public.stock_movement sm
                 where sm.sale_id = :sal_rl),
           format('downgrade=%s sale=%s', public._fwq(:fw_real::uuid),
                  (select sum(sm.qty_base) from public.stock_movement sm
                    where sm.sale_id = :sal_rl)));

select chk_json('4.13 `occurred_at` comes out of the PAYLOAD, not from now() — '
                'the stock left the shelf when the sale happened, and any lot '
                'this opens is received at that moment, which is FEFO''s second '
                'sort key (§2.4)',
                public._rfw(:fw_at::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_dn'::uuid, 1),
                                        now() - interval '30 hours'),
                            '42501', null, :'loc_1'::uuid),
                'downgraded', 'true');

select chk('4.14 and the movement is stamped thirty hours ago, clamped by §2.6''s '
           '72-hour rule rather than trusted outright',
           (select count(*) from public.stock_movement sm
             where sm.failed_write_id = :fw_at
               and sm.occurred_at between now() - interval '30 hours 5 minutes'
                                      and now() - interval '29 hours 55 minutes') = 1,
           format('occurred_at=%s',
                  (select sm.occurred_at from public.stock_movement sm
                    where sm.failed_write_id = :fw_at)));


-- ============================================================================
-- 5. THE KIND RULE  (AMENDMENT 2) — and it is a PAIR
-- ============================================================================
-- ⚠️ SAME VARIANT, SAME QUANTITY, SAME STORE, SAME ERROR CODE. The only thing
-- that differs between 5.1 and 5.3 is the KIND, so nothing else can explain the
-- difference in what happened to the shelf. 4d-ii's shape exactly.

select chk_json('5.1 a rejected SALE downgrades — the stock is gone, the customer '
                'has walked away, and nobody will ever re-ring it',
                public._rfw(:fw_sale::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_kind'::uuid, 10)),
                            '42501', null, :'loc_1'::uuid),
                'downgraded', 'true');

select chk('5.2 the shelf moved: 40 → 30',
           public._bal(:'loc_1'::uuid, :'var_kind'::uuid) = 30,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_kind'::uuid)));

select chk_json('5.3 ⚠️ A REJECTED PURCHASE OF THE SAME TEN UNITS DOES NOT. The '
                'stock is PRESENT — it is on the shelf with a manager holding the '
                'delivery note — and Comprar will record it properly. An '
                'auto-upgrade would open a ZERO-COST lot and then DOUBLE the shelf '
                'the moment the delivery is re-entered',
                public._rfw(:fw_pur::uuid, 'purchase', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._pl(:'var_kind'::uuid, 10)),
                            '42501', null, :'loc_1'::uuid),
                'downgraded', 'false');

select chk('5.4 the shelf is UNCHANGED at 30, and the reason is reported rather '
           'than silent',
           public._bal(:'loc_1'::uuid, :'var_kind'::uuid) = 30
       and public._fwn(:fw_pur::uuid) = 0,
           format('balance=%s movements=%s',
                  public._bal(:'loc_1'::uuid, :'var_kind'::uuid),
                  public._fwn(:fw_pur::uuid)));

select chk_json('5.5 and it says WHY — a client that cannot tell "nothing to do" '
                'from "something went wrong" will retry one of them forever',
                public._rfw('fa11ed24-0000-0000-0000-0000000000e1'::uuid,
                            'purchase', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._pl(:'var_kind'::uuid, 10)),
                            '42501', null, :'loc_1'::uuid),
                'downgrade_skipped', 'kind_not_downgraded');

select chk('5.6 ⚠️ BUT THE DEAD LETTER STILL LANDED. Not downgrading is not the '
           'same as not recording: the delivery is still unrecorded, §2.10''s '
           'nightly check still has to see it, and 0025 can still replay it',
           (select count(*) from public.failed_write where id = :fw_pur) = 1);

select chk_json('5.7 a rejected WASTE downgrades — same side as a sale. The '
                'stock is in the bin, and nobody re-enters a write-off either',
                public._rfw(:fw_wst::uuid, 'waste', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_wst'::uuid, 4)),
                            '42501', null, :'loc_1'::uuid),
                'downgraded', 'true');

select chk('5.8 40 → 36, and the movement is linked like any other',
           public._bal(:'loc_1'::uuid, :'var_wst'::uuid) = 36
       and public._fwn(:fw_wst::uuid) = 1,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_wst'::uuid)));

select chk_json('5.9 a rejected TRANSFER does not — two stores, no document '
                '(§2.4), and an idempotency contract already held up by an '
                'advisory lock rather than a key (4e-i). It dead-letters and '
                'waits for a person',
                public._rfw(:fw_trf::uuid, 'transfer', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_trf'::uuid, 5)),
                            '42501', null, :'loc_1'::uuid),
                'downgraded', 'false');

select chk('5.10 the transfer''s shelf is untouched and its row landed',
           public._bal(:'loc_1'::uuid, :'var_trf'::uuid) = 40
       and (select count(*) from public.failed_write where id = :fw_trf) = 1,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_trf'::uuid)));


-- ============================================================================
-- 6. IDEMPOTENCY — and here it protects the LEDGER, not the row
-- ============================================================================
-- ⚠️ `adjust_stock_delta` HAS NO KEY OF ITS OWN. `0023` said so and accepted it:
-- "a relative write applied twice moves the balance twice, so the key is the
-- caller's." This is the caller. 6.3 is the check that cashes that promise.

select chk_json('6.1 the first report downgrades',
                public._rfw(:fw_idem::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_idem'::uuid, 5)),
                            '42501', null, :'loc_1'::uuid),
                'downgraded', 'true');

select chk_json('6.2 the SECOND report of the same failure returns '
                'already_recorded',
                public._rfw(:fw_idem::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_idem'::uuid, 5)),
                            '42501', null, :'loc_1'::uuid),
                'already_recorded', 'true');

select chk('6.3 ⚠️ AND THE SHELF MOVED ONCE. 40 → 35, one movement. This is the '
           'check that would go red if the on-conflict branch fell through to the '
           'downgrade — the row would still be unique and the ledger would be '
           'five units short of the shop',
           public._bal(:'loc_1'::uuid, :'var_idem'::uuid) = 35
       and public._fwn(:fw_idem::uuid) = 1
       and (select count(*) from public.failed_write where id = :fw_idem) = 1,
           format('balance=%s movements=%s',
                  public._bal(:'loc_1'::uuid, :'var_idem'::uuid),
                  public._fwn(:fw_idem::uuid)));

select chk_json('6.4 ⚠️ A DIFFERENT PAYLOAD UNDER THE SAME ID IS ABSORBED, NOT '
                'RAISED AS TD001 — and that is deliberate. Every other RPC '
                'dead-letters a changed payload; this function IS the dead '
                'letter, so raising here would have nowhere to go. The first '
                'report of a failure is the one that is kept',
                public._rfw(:fw_idem::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_idem'::uuid, 99)),
                            '23514', 'a completely different error', :'loc_1'::uuid),
                'already_recorded', 'true');

select chk('6.5 and the stored payload is still the FIRST one — 5, not 99',
           (select fw.payload->'lines'->0->>'qty_display'
              from public.failed_write fw where fw.id = :fw_idem) = '5'
       and public._bal(:'loc_1'::uuid, :'var_idem'::uuid) = 35);


-- ============================================================================
-- 7. IT NEVER RAISES FOR A BAD PAYLOAD  (decision 6)
-- ============================================================================
-- ⚠️ THE FAILURES §2.6 NAMES ARE EXACTLY THE THINGS THAT BREAK THE DOWNGRADE. "A
-- variant deleted between capture and flush" is its own example of a permanent
-- failure — and a downgrade of that line cannot be computed. If that raised, the
-- function would lose the event for the same reason the write was lost.

select chk_json('7.1 a line naming a variant that does not exist does not raise',
                public._rfw(:fw_part::uuid, 'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid,
                              public._sl(:'var_part'::uuid, 5)
                              || public._sl(:'ghost_var'::uuid, 3)),
                            '23503', 'variant deleted between capture and flush',
                            :'loc_1'::uuid),
                'lines_failed', '1');

select chk_json('7.2 the GOOD line still downgraded — partial, not all-or-nothing. '
                'One subtransaction per line is what buys this',
                public._rfw('fa11ed24-0000-0000-0000-0000000000f1'::uuid,
                            'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid, public._sl(:'var_part'::uuid, 1)),
                            '23503', null, :'loc_1'::uuid),
                'lines_downgraded', '1');

select chk('7.3 the shelf moved by the good line only — 40 − 5 − 1 = 34 — and the '
           'ghost line wrote NOTHING. No guessed quantity, no zero-quantity '
           'movement: the choice is a partial downgrade or no dead letter at all',
           public._bal(:'loc_1'::uuid, :'var_part'::uuid) = 34
       and public._fwn(:fw_part::uuid) = 1,
           format('balance=%s movements=%s',
                  public._bal(:'loc_1'::uuid, :'var_part'::uuid),
                  public._fwn(:fw_part::uuid)));

select chk('7.4 and the row landed with the whole payload, ghost line included — '
           'which is what lets a person see what was lost',
           (select jsonb_array_length(fw.payload->'lines')
              from public.failed_write fw where fw.id = :fw_part) = 2);

select chk_json('7.5 a payload with NO lines is recorded and reports why',
                public._rfw(:fw_nolines::uuid, 'sale', :'ws_a'::uuid,
                            jsonb_build_object('location_id', :'loc_1'::uuid),
                            '22023', 'lines is required', :'loc_1'::uuid),
                'downgrade_skipped', 'no_lines_in_payload');

select chk_json('7.6 a line whose unit crosses DIMENSIONS is counted failed, not '
                'raised — `record_sale` refuses this outright (0016: "a '
                'conversion across dimensions has no answer to give"), and a '
                'payload carrying it is precisely a permanently rejected write',
                public._rfw('fa11ed24-0000-0000-0000-0000000000f2'::uuid,
                            'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid,
                              jsonb_build_array(jsonb_build_object(
                                'variant_id', :'var_part'::uuid,
                                'qty_display', 2,
                                'qty_display_unit', 'l',
                                'unit_price_gross_per_base', 10))),
                            '22023', 'unit l is measured in ml', :'loc_1'::uuid),
                'lines_failed', '1');

select chk('7.7 and it moved nothing — a wrong conversion is worse than none, '
           'which is 1.3b''s argument in the other currency',
           public._bal(:'loc_1'::uuid, :'var_part'::uuid) = 34);

select chk_json('7.8 ⚠️ A LINE WHOSE QUANTITY IS NOT A NUMBER IS COUNTED, NOT '
                'RAISED — and this is the only check in the file that exercises '
                'the per-line SUBTRANSACTION at all. Every other bad line in '
                'section 7 resolves to NO ROWS and is counted by an `if`, never '
                'reaching the exception handler; `''abc''::numeric` is what '
                'actually throws inside the loop. F10 removes the handler and '
                'turned NOTHING red until this line existed — the mechanism '
                'decision 6 rests on was unfalsified',
                public._rfw('fa11ed24-0000-0000-0000-0000000000f3'::uuid,
                            'sale', :'ws_a'::uuid,
                            public._pay(:'loc_1'::uuid,
                              jsonb_build_array(jsonb_build_object(
                                'variant_id', :'var_part'::uuid,
                                'qty_display', 'abc',
                                'unit_price_gross_per_base', 10))),
                            '22P02', 'the client sent rubbish', :'loc_1'::uuid),
                'lines_failed', '1');

select chk('7.9 the row landed and the shelf did not move',
           (select count(*) from public.failed_write
             where id = 'fa11ed24-0000-0000-0000-0000000000f3') = 1
       and public._bal(:'loc_1'::uuid, :'var_part'::uuid) = 34);


-- ============================================================================
-- 8. THE LINK CONSTRAINT  (AMENDMENT 1) — §2.6's "not optional", as a check
-- ============================================================================

select chk_raises('8.1 a downgrade movement with NO link is REFUSED. This is the '
                  'sentence §2.6 writes — "the link is not optional" — as '
                  'something the database enforces rather than something a '
                  'function is trusted to remember',
                  format('insert into public.stock_movement (workspace_id, '
                         'location_id, batch_id, variant_id, reason, qty_base, '
                         'unit_cost_net_per_base, occurred_at, created_by, '
                         'adjustment_reason) select %L::uuid, %L::uuid, sb.id, '
                         '%L::uuid, ''adjustment'', -1, 2.00, now(), %L::uuid, '
                         '''failed_write_downgrade'' from public.stock_batch sb '
                         'where sb.variant_id = %L::uuid limit 1',
                         :'ws_a', :'loc_1', :'var_exc', :owner_a, :'var_exc'),
                  '23514');

select chk_raises('8.2 and a movement that is NOT a downgrade may not carry one — '
                  'the constraint is an equivalence, not an implication, so a '
                  'physical count cannot be filed against a dead letter',
                  format('insert into public.stock_movement (workspace_id, '
                         'location_id, batch_id, variant_id, reason, qty_base, '
                         'unit_cost_net_per_base, occurred_at, created_by, '
                         'adjustment_reason, failed_write_id) select %L::uuid, '
                         '%L::uuid, sb.id, %L::uuid, ''adjustment'', -1, 2.00, '
                         'now(), %L::uuid, ''physical_count'', %L::uuid '
                         'from public.stock_batch sb where sb.variant_id = %L::uuid '
                         'limit 1',
                         :'ws_a', :'loc_1', :'var_exc', :owner_a, :fw_plain,
                         :'var_exc'),
                  '23514');

select chk_raises('8.3 ⚠️ AND THE NULL CASE, WHICH IS WHY THE CONSTRAINT IS '
                  'WRITTEN WITH `is not distinct from` AND NOT `=`. A movement '
                  'with a NULL adjustment_reason and a link set: under `=` the '
                  'left side would be NULL, `NULL = false` is NULL, and A NULL '
                  'CHECK CONSTRAINT PASSES. The obvious spelling lets exactly '
                  'this row through',
                  format('insert into public.stock_movement (workspace_id, '
                         'location_id, batch_id, variant_id, reason, qty_base, '
                         'unit_cost_net_per_base, occurred_at, created_by, '
                         'failed_write_id) select %L::uuid, %L::uuid, sb.id, '
                         '%L::uuid, ''adjustment'', -1, 2.00, now(), %L::uuid, '
                         '%L::uuid from public.stock_batch sb '
                         'where sb.variant_id = %L::uuid limit 1',
                         :'ws_a', :'loc_1', :'var_exc', :owner_a, :fw_plain,
                         :'var_exc'),
                  '23514');

select chk_raises('8.4 the FOREIGN KEY refuses a link to a dead letter that does '
                  'not exist — the guarantee a bare group uuid could never give, '
                  'and the reason the owner took this shape over an '
                  'adjustment_group_id on 2026-09-05',
                  format('insert into public.stock_movement (workspace_id, '
                         'location_id, batch_id, variant_id, reason, qty_base, '
                         'unit_cost_net_per_base, occurred_at, created_by, '
                         'adjustment_reason, failed_write_id) select %L::uuid, '
                         '%L::uuid, sb.id, %L::uuid, ''adjustment'', -1, 2.00, '
                         'now(), %L::uuid, ''failed_write_downgrade'', %L::uuid '
                         'from public.stock_batch sb where sb.variant_id = %L::uuid '
                         'limit 1',
                         :'ws_a', :'loc_1', :'var_exc', :owner_a,
                         'fa11ed24-9999-9999-9999-999999999999', :'var_exc'),
                  '23503');

select chk('8.5 none of those four inserts landed — the subject''s shelf is '
           'exactly where 3.3''s one-unit downgrade left it, and not four units '
           'below',
           public._bal(:'loc_1'::uuid, :'var_exc'::uuid) = 39,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_exc'::uuid)));


-- ============================================================================
-- 9. THE INVARIANTS, OVER EVERYTHING THIS FILE WROTE
-- ============================================================================

select chk('9.1 §2.4''s invariant holds over every downgrade this file wrote',
           (select count(*) from batch_balance_violations()) = 0,
           format('violations=%s', (select count(*) from batch_balance_violations())));

select chk('9.2 0015''s receipt-completeness rule holds',
           (select count(*) from receipt_completeness_violations()) = 0);

select chk('9.3 EVERY downgrade movement in the database names a dead letter that '
           'EXISTS, and every linked movement is a downgrade — the population '
           'form of section 8, and the claim 0025 will rely on',
           (select count(*) from stock_movement sm
             where sm.adjustment_reason = 'failed_write_downgrade'
               and sm.failed_write_id is null) = 0
       and (select count(*) from stock_movement sm
             where sm.failed_write_id is not null
               and sm.adjustment_reason is distinct from 'failed_write_downgrade') = 0
       and (select count(*) from stock_movement sm
             where sm.failed_write_id is not null) >= 8,
           format('linked=%s',
                  (select count(*) from stock_movement sm
                    where sm.failed_write_id is not null)));

select chk('9.4 every downgrade movement is document-free — an adjustment answers '
           'to nothing but its note and, now, its dead letter (0004:320)',
           (select count(*) from stock_movement sm
             where sm.failed_write_id is not null
               and (sm.purchase_id is not null or sm.sale_id is not null
                 or sm.waste_id is not null or sm.transfer_group_id is not null)) = 0);

select chk('9.5 and no dead letter of a kind that is NOT downgraded has a '
           'movement against it — the population form of the amendment-2 pair',
           (select count(*) from public.failed_write fw
             join stock_movement sm on sm.failed_write_id = fw.id
            where fw.kind in ('purchase', 'transfer')) = 0);


-- ============================================================================
-- 10. THE POLICY, READ BACK  (§2.7, §2.8)
-- ============================================================================
-- ⚠️ THIS SECTION IS LAST BECAUSE IT NEEDS ROWS. An isolation claim over an empty
-- table is a claim about nothing — 3.2a's finding about `workspace_invite`, and
-- the reason that suite writes a fixture before it asserts. By here the table
-- holds a dozen dead letters across two workspaces.

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk('10.1 the OWNER of workspace A reads workspace A''s dead letters',
           (select count(*) from public.failed_write) > 8,
           format('visible=%s', (select count(*) from public.failed_write)));
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk('10.2 ⚠️ A MANAGER READS NONE. §2.8 — dead letters go to the operator '
           'of this system, not to the merchant: "the merchant did not cause a '
           '42501, cannot diagnose it, and cannot act on it." The payload can '
           'also carry COST for any kind, which §2.7 makes manager-and-above at '
           'the loosest. The nightly check runs vendor-side and bypasses RLS',
           (select count(*) from public.failed_write) = 0,
           format('visible=%s', (select count(*) from public.failed_write)));
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
select chk('10.3 and the OWNER of workspace B reads none of A''s — the tenant '
           'wall, which is a different predicate from the role and needs its own '
           'witness',
           (select count(*) from public.failed_write) = 0,
           format('visible=%s', (select count(*) from public.failed_write)));
commit;

-- ⚠️⚠️ 4d-i's finding, and it is standard now: a verdict recorded inside a
-- transaction that ends in `rollback` VANISHES rather than failing. The literal
-- is deliberately a literal.
select chk('10.4 ALL 79 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 78,
           format('recorded=%s of 78 before this one',
                  (select count(*) from public._verify)));

drop function public.chk_json(text, text, text, text);
drop function public.chk_raises_like(text, text, text, text);
drop function public._rfw(uuid, text, uuid, jsonb, text, text, uuid);
drop function public._pay(uuid, jsonb, timestamptz);
drop function public._pl(uuid, numeric, numeric, date);
drop function public._sl(uuid, numeric, numeric);
drop function public._bal(uuid, uuid);
drop function public._fwq(uuid);
drop function public._fwn(uuid);


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
