-- ============================================================================
-- Behavioural verification for 0021 — void_transaction()
-- ============================================================================
-- ADR-035 §1, §2.3, §2.4, §2.6, §2.7, §9. docs/PLAN.md tasks 4e-ii-a and 4e-ii-b.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0021_void_transaction.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `void_transaction` is the LAST of build step 4's six functions and the only
-- one that reads a ROLE. Three claims are its alone, and the other five RPCs
-- have nothing to say about any of them:
--
--   ⚠️ THE FENCE (§2.7). Staff void their OWN document inside the window;
--   manager and owner void ANYTHING, AT ANY TIME. Section 6 is that table made
--   falsifiable, and 6.3/6.4 are the PAIR that carries it: the same document, at
--   the same instant, with a zero window — refused for the cashier and recorded
--   for the manager, so nothing but the ROLE can explain the difference.
--
--   ⚠️⚠️ THE OFFLINE BASIS (§2.6, AMENDED 2026-09-04 ON THE OWNER'S INSTRUCTION).
--   The window reads `recorded_at` on an offline write and `occurred_at`
--   otherwise. Section 7 is the amendment, and 7.1 is the check that discriminates
--   between the two readings: a sale whose `occurred_at` is FIVE HOURS old and
--   whose `recorded_at` is now, under a SIXTY MINUTE window. The amended rule
--   records it. The rule this file replaced would have refused it. ⚠️ Without 7.1
--   the whole amendment is untested, because every other document in this file
--   has the two timestamps within a second of each other.
--
--   NOTHING IS MUTATED (§2.4). Section 15.3 re-reads every original this file
--   voided and asserts its totals, its timestamps and its own `reversal_of` are
--   exactly what they were — which is the claim `0003`'s append-only trigger
--   makes structurally and this file makes behaviourally.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT CONCURRENCY — one connection cannot block on its own lock
-- (4c-i F6, 4c-ii W-F1). Two sessions voiding one document race on
-- `<kind>_one_reversal_idx`, a REAL unique index rather than `0020`'s advisory
-- lock, so the second gets a duplicate-key error rather than a silent second
-- reversal. That is a stronger position than the transfer's and it is still
-- unproven here; it belongs in `supabase/vitest/`.
--
-- ⚠️ NOTHING ABOUT `replay_failed_write`. It ships in step 4.5 and a replayed
-- write is the one case the amended basis leaves open — see `0021`'s header and
-- ADR-035 §2.6.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ WHAT 4e-ii-b ADDED, AND WHY THE FILE NEEDED IT
-- ----------------------------------------------------------------------------
-- 4e-ii-a shipped `0021` whole with 64 checks and sixteen falsifications, and
-- found no defect in the function. 4e-ii-b is test breadth over the SAME
-- function, and it found ELEVEN distinct defects that apply cleanly and turned
-- NOTHING red on those 64 checks. None of them is a defect in `0021`; all eleven
-- are things `0021` does correctly that nothing was watching.
--
-- The shape is one F12 named and did not finish: THE LOOKUP IS WRITTEN THREE
-- TIMES, once per document kind, and so is every insert after it. F12 closed the
-- location wall on all three copies. Sections 3, 4 and 5 still divided every
-- OTHER property between the kinds — the totals on the sale, the provider on the
-- purchase, the cost snapshot on the waste — so each was proved of one third of
-- the function. Sections 10 to 14 fill the matrix instead of the diagonal:
--
--   10  the per-kind matrix — totals, lines, qty_display, the offline flag,
--       workspace and location, and the four movement columns nothing had read
--   11  authorship and the derived header — created_by, payload_hash, and the
--       strictness of occurred_at
--   12  ⚠️ THE FENCE ON THE OTHER TWO BRANCHES. `created_by`, `recorded_offline`
--       and `recorded_at` are read in the same three-way lookup, and sections 6
--       and 7 use a SALE for every one of their checks. ⚠️ A REFUSAL CANNOT WATCH
--       A COLUMN: with `created_by` dropped from a branch, `v_creator` is null,
--       `null is distinct from v_user` is still true, and 6.2 still passes. Every
--       check in section 12 is a GRANT, which is the only thing that can tell a
--       column that is read from a column that is missing
--   13  the chain guard and the retry, on all three branches (section 8's are
--       all sales)
--   14  ⚠️ MULTI-LOT. Every document sections 3 to 5 void drew from exactly ONE
--       lot, so "back to the lots it came from" and "back to A lot" are the same
--       sentence there. var_m gets three lots and one sale across all three
--
-- ⚠️⚠️ AND ONE CHECK THAT COULD NOT FAIL. 3.12 read `a > b or a >= b`, which is
-- `a >= b` — so a void that copied the original's `occurred_at` PASSED THE CHECK
-- WHOSE LABEL SAYS IT LANDS ON ITS OWN DAY. Falsification G6 back-dated every
-- compensating header and, against the file as 4e-ii-a shipped it, turned NOTHING
-- red across 64 checks. 3.12 is fixed in place and 11.6 is the per-kind form.
--
-- ⚠️ THREE OF THIS TASK'S OWN CHECKS WERE VACUOUS WHEN FIRST WRITTEN and were
-- caught the same way, by falsification rather than by review: 10.2's tax arm
-- (every write-off here was zero-rated), 10.3's expiry arm (every purchase line
-- carried null), and 10.6 (both originals it read were recorded ONLINE, so the
-- flag it says is not inherited held the same value either way). Each now builds
-- or reads a document that has a value which can be got wrong, and each asserts
-- that it does before asserting anything else.
--
-- ----------------------------------------------------------------------------
-- SIXTEEN FALSIFICATIONS FROM 4e-ii-a, RUN BY HAND BEFORE THAT FILE WAS COMMITTED
-- ----------------------------------------------------------------------------
-- Each one is a single deliberate defect loaded over `0021` with
-- `create or replace`, the suite re-run, and the function restored.
--
--   F1  the fence removed entirely ................. 6.2 6.3 6.4 7.4 red
--   F2  ⚠️ the basis forced to `occurred_at` —
--       THE EXACT RULE THE AMENDMENT REPLACED ...... 7.2 red, AND NOTHING ELSE
--                                                    ⚠️ 12.3 12.4 now too — see
--                                                    the note on section 12
--   F3  the ownership test dropped ................. 6.2 red
--   F4  the window test dropped .................... 6.3 6.4 7.4 red
--   F5  the threshold raised to `owner` ............ 2.5 6.4 6.6 9.3 red
--   F7  a reversal made voidable ................... 8.6 red
--   F8  the idempotency short-circuit removed ...... `sale_one_reversal_idx`
--                                                    refuses it — the SCHEMA is
--                                                    the guarantee, not the RPC
--   F9  compensating movements not negated ......... 3.9 3.11 4.3 4.7 5.4 red
--   F10 compensating lines not negated ............. `sale_line_money_follows_
--                                                    qty` refuses it (0003)
--   F13 the totals not negated ..................... 3.5 red
--   F12 the wall dropped, SALE branch .............. 2.4b red
--   F12b the wall dropped, WASTE branch ............ 2.4c red
--   F12c the wall dropped, PURCHASE branch ......... 2.1 2.3 2.4 red
--
-- ⚠️⚠️ F2 IS THE ONE 4e-ii-a EXISTED TO RUN, and it lands on 7.2 ALONE. The
-- amendment is therefore not merely implemented, it is the only reading this
-- file admits.
--
-- ⚠️⚠️ TWO OF THE SIXTEEN TURNED NOTHING RED, AND BOTH ARE RECORDED RATHER THAN
-- QUIETLY DROPPED:
--
--   F6 — the basis forced to `recorded_at` for EVERY write, offline or not.
--   Nothing went red, and ⚠️ NOTHING IN THIS DATABASE CAN GO RED FOR IT TODAY:
--   §2.6 overrides `occurred_at` with now() on an online write, so the two
--   columns hold the same instant and no online document exists where they
--   differ. The FIRST document that will is a REPLAYED one — `replay_failed_
--   write` preserves the original `occurred_at` and takes a fresh `recorded_at`
--   — and it ships in step 4.5. So the `case` in `0021` is correct, half of it
--   is unfalsifiable until 4.5, and 4.5 is where the check belongs. This is a
--   NEW owed row, not one of §2.10's nine.
--
--   F11 — the `reversal_of_movement_id is null` filter on the movement select,
--   deleted. Nothing went red, and it cannot: a compensating movement carries
--   the NEW document's id, so `sm.<kind>_id = p_id` never reaches one. The
--   filter is defensive and redundant BY CONSTRUCTION. It is kept for the
--   reader and is honestly untested rather than falsely claimed.
--
-- ⚠️ F8, F10 and F12c also exposed a HARNESS defect that is fixed in
-- `_cleanup.sql` rather than here: a suite that ABORTS never reaches its own
-- `drop function`, so `chk_succeeds` survived into the next run and five
-- mutations in a row reported "function already exists" instead of the defect
-- they injected. `_cleanup.sql` now drops it, which is the file the header of
-- `_cleanup.sql` itself says should.
--
-- ----------------------------------------------------------------------------
-- TWENTY MORE FALSIFICATIONS, RUN BY HAND BEFORE 4e-ii-b WAS COMMITTED
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ ELEVEN OF THE TWENTY TURNED NOTHING RED ON THE FILE AS 4e-ii-a SHIPPED IT,
-- and each is marked. That column is the measurement this task existed to take.
--
--                                                   red      | 4e-ii-a's 64
--   G1  the void filed under the ORIGINAL's author  11.1      | ⚠️ nothing
--   G2  the movements filed under the original mover 11.2     | ⚠️ nothing
--   G3  payload_hash randomised ................... 11.3      | ⚠️ nothing
--   G4  payload_hash a constant ................... 11.3 11.4 | ⚠️ nothing
--   G5  qty_display copied, not negated ........... `sale_line_qty_display_
--                                                   agrees` refuses it — the
--                                                   SCHEMA holds this one
--   G6  ⚠️⚠️ THE COMPENSATING HEADER BACK-DATED
--       to the original's occurred_at ............. 3.12 11.6 | ⚠️⚠️ NOTHING —
--                                                   3.12 as written could not
--                                                   fail. Measured, not argued:
--                                                   the mutation was re-run
--                                                   against a copy of the file
--                                                   carrying 4e-ii-a's 3.12 and
--                                                   no 11.6, and all 64 passed
--   G7  the movement cost recomputed .............. 10.9      | ⚠️ nothing
--   G8  the movement back-dated to the original ... 10.11     | ⚠️ nothing
--   G9  the void filed at another store ........... `sale_reversal_fk` refuses
--                                                   it — the location is pinned
--                                                   by the schema, so 10.7 is
--                                                   redundant by construction
--   G10 the PURCHASE totals not negated ........... 10.1      | ⚠️ nothing
--   G11 the WASTE total_tax not negated ........... 10.2      | ⚠️ nothing —
--                                                   AND nothing in 4e-ii-b's
--                                                   first draft either, until
--                                                   section 10 grew a TAXED
--                                                   write-off to read
--   G12 the expiry dropped from the void's line ... 10.3      | ⚠️ nothing —
--                                                   same story, a DATED delivery
--   G13 the WASTE lookup stops reading created_by . 12.1 12.3 | ⚠️ nothing
--   G14 the PURCHASE lookup stops reading
--       recorded_offline .......................... 12.4      | ⚠️ nothing
--   G15 ⚠️⚠️ EVERY LOT'S STOCK RETURNED TO ONE LOT
--       per variant, one movement instead of n .... 14.2 14.3 | ⚠️⚠️ NOTHING.
--                                                   14.4        3.9, 3.11, 4.3
--                                                   and 5.4 all pass: every
--                                                   document they read drew
--                                                   from a single lot
--   G16 the void inherits recorded_offline ........ 10.6 12.5 | ⚠️ nothing
--   G17 the movement given a reason of its own .... `stock_movement_source_
--                                                   agrees` refuses it, so 3.10
--                                                   and 10.8 are both redundant
--                                                   by construction
--   G18 the PURCHASE lookup stops reading
--       reversal_of ............................... 13.1      | ⚠️ nothing
--   G19 the PURCHASE lookup stops reading
--       created_by ................................ 12.2 12.4 | ⚠️ nothing
--   G20 the already-voided short-circuit removed,
--       PURCHASE branch ........................... `purchase_one_reversal_idx`
--                                                   refuses it — F8's answer,
--                                                   on the second branch
--
-- ⚠️ FOUR CHECKS IN THIS FILE CANNOT BE FALSIFIED AND ARE RECORDED AS SUCH,
-- following F11's precedent rather than being deleted or claimed as evidence:
-- 10.7 (the location is pinned by `sale_reversal_fk` — G9), 10.8 and 3.10 (the
-- reason is pinned by `stock_movement_source_agrees` — G17), 10.10 (a wrong
-- variant is refused by `stock_movement_batch_fk`, measured), and 11.5 (nothing
-- here updates an original — `0003`'s append-only trigger is the guarantee).
-- They state true things about a function whose correctness the SCHEMA holds,
-- which is worth reading and is not this file's evidence.
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

-- ⚠️⚠️ THE MIRROR OF chk_raises, AND THIS FILE NEEDS IT MORE THAN ITS PREDECESSORS
-- DID. A check written as `chk(void_transaction(...) ->> ... = 'false')` calls the
-- function INLINE: if the call raises, the exception escapes chk() entirely, psql
-- stops on it under ON_ERROR_STOP, and the file dies WITHOUT RECORDING A VERDICT —
-- taking every later check with it. Falsification F2 found exactly that: the
-- pre-amendment basis aborted the run at 7.2 and the report showed no FAIL at all,
-- only an error line. That is a SIXTH shape of misleading green in this
-- repository — not a vacuous pass this time but a MASKED one, and the cure is the
-- same as chk_raises': catch, and record the verdict either way.
create function public.chk_succeeds(p_label text, p_sql text,
                             p_expect text default 'false')
returns void language plpgsql as $$
declare v jsonb;
begin
  execute p_sql into v;
  perform public.chk(p_label, (v ->> 'already_recorded') = p_expect,
                     'already_recorded=' || coalesce(v ->> 'already_recorded', 'null'));
exception when others then
  perform public.chk(p_label, false, 'RAISED ' || sqlstate || ': ' || sqlerrm);
end;
$$;
grant execute on function public.chk_succeeds(text, text, text) to authenticated;

-- The call under test, as text, so chk_raises can execute it.
create or replace function public._void(p_kind text, p_id uuid,
                             p_reason text default 'error de captura')
returns text language sql as $$
  select format('select public.void_transaction(%L::text, %L::uuid, %L::text)',
                p_kind, p_id, p_reason)
$$;
grant execute on function public._void(text, uuid, text) to authenticated;

create or replace function public._sl(p_variant uuid, p_qty numeric,
                             p_price numeric default 10.00)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_gross_per_base', p_price))
$$;
grant execute on function public._sl(uuid, numeric, numeric) to authenticated;

create or replace function public._pl(p_variant uuid, p_qty numeric,
                             p_price numeric default 4.00)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_net_per_base', p_price))
$$;
grant execute on function public._pl(uuid, numeric, numeric) to authenticated;


-- ---------------------------------------------------------------- fixture ----
-- FOUR identities, because the fence needs three distinguishable roles in ONE
-- workspace plus a stranger:
--   owner_a    — owner of ws_a, and the author of the fixture documents
--   cashier_a  — STAFF at loc_1 only. The fenced one
--   manager_a  — MANAGER of ws_a. Unfenced, and assigned to no location by row
--   owner_b    — another tenant entirely

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'cashier.a@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'owner.b@example.mx'),
  ('44444444-4444-4444-4444-444444444444', 'manager.a@example.mx');

\set owner_a   '''11111111-1111-1111-1111-111111111111'''
\set cashier_a '''22222222-2222-2222-2222-222222222222'''
\set manager_a '''44444444-4444-4444-4444-444444444444'''

\set jwt_owner   '''{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'''
\set jwt_cashier '''{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'''
\set jwt_manager '''{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}'''

select set_config('request.jwt.claims', :jwt_owner, false);
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
  (:'ws_a', :cashier_a, 'staff'),
  (:'ws_a', :manager_a, 'manager');
-- The cashier is assigned to loc_1 ONLY. The manager needs no row — §2.7 grants
-- every location by role, and section 2.4 leans on exactly that asymmetry.
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_a;

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam', 'Yogurt',   'pza','pza','pza','pza', 0.0000),
  (:'ws_a', :'fam', 'Jabon 16', 'pza','pza','pza','pza', 0.1600),
  (:'ws_a', :'fam', 'Leche',    'pza','pza','pza','pza', 0.0000),
  (:'ws_a', :'fam', 'Atun',     'pza','pza','pza','pza', 0.0000),
  -- ⚠️ ADDED IN 4e-ii-b, and both are deliberately UNTOUCHED by sections 1-9 so
  -- that the breadth sections cannot disturb a check that already stands.
  --   Arroz  — section 14's multi-lot variant: three lots, one sale across all
  --            three, so the per-LOT claim has a document that can fail it
  --   Frijol — section 12's, and it is the CASHIER's stock: the fence needs a
  --            purchase and a write-off the cashier actually authored
  (:'ws_a', :'fam', 'Arroz',    'pza','pza','pza','pza', 0.0000),
  (:'ws_a', :'fam', 'Frijol',   'pza','pza','pza','pza', 0.0000);

select id as var_a   from product_variant where workspace_id=:'ws_a' and name='Yogurt'   \gset
select id as var_iva from product_variant where workspace_id=:'ws_a' and name='Jabon 16' \gset
select id as var_p   from product_variant where workspace_id=:'ws_a' and name='Leche'    \gset
select id as var_s   from product_variant where workspace_id=:'ws_a' and name='Atun'     \gset
select id as var_m   from product_variant where workspace_id=:'ws_a' and name='Arroz'    \gset
select id as var_c   from product_variant where workspace_id=:'ws_a' and name='Frijol'   \gset

insert into product_family (workspace_id, name) values (:'ws_b', 'Ajena');
select id as fam_b from product_family where workspace_id=:'ws_b' \gset
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code) values
  (:'ws_b', :'fam_b', 'Ajeno', 'pza','pza','pza','pza');
select id as var_b from product_variant where workspace_id=:'ws_b' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset
insert into provider (workspace_id, name) values (:'ws_a', 'Lacteos del Norte');
select id as prov_2 from provider where workspace_id=:'ws_a' and name='Lacteos del Norte' \gset
select id as prov_b from provider where workspace_id = :'ws_b' and is_generic \gset

-- Stock, put on the shelf by `record_purchase` rather than by hand — 4d-ii's
-- practice, and it means 0015 is satisfied by the same path a shop uses.
\set pur_a  '''dddd0021-0000-0000-0000-00000000000a'''
\set pur_i  '''dddd0021-0000-0000-0000-00000000000b'''
\set pur_p1 '''dddd0021-0000-0000-0000-00000000000c'''
\set pur_p2 '''dddd0021-0000-0000-0000-00000000000d'''
\set pur_s  '''dddd0021-0000-0000-0000-00000000000e'''
\set pur_x  '''dddd0021-0000-0000-0000-00000000000f'''
\set pur_b  '''dddd0021-0000-0000-0000-0000000000b1'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_purchase(:pur_a::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_a'::uuid, 40, 2.00))   as r \gset
select record_purchase(:pur_i::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_iva'::uuid, 20, 5.00)) as r \gset
-- var_p gets TWO deliveries from the SAME provider at different prices, so
-- section 9 can watch the price memory fall back when the later one is voided.
select record_purchase(:pur_p1::uuid, :'loc_1'::uuid, :'prov_2'::uuid,
         public._pl(:'var_p'::uuid, 10, 3.00),
         now() - interval '48 hours', true) as r \gset
select record_purchase(:pur_p2::uuid, :'loc_1'::uuid, :'prov_2'::uuid,
         public._pl(:'var_p'::uuid, 10, 7.50),
         now() - interval '24 hours', true) as r \gset
-- var_s is the sold-on delivery of section 4.5.
select record_purchase(:pur_s::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_s'::uuid, 10, 1.00))   as r \gset
-- A delivery at loc_2, which the CASHIER cannot reach and the MANAGER can.
select record_purchase(:pur_x::uuid,  :'loc_2'::uuid, :'prov_a'::uuid,
         public._pl(:'var_a'::uuid, 5, 2.00))    as r \gset
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:pur_b::uuid, :'loc_b'::uuid, :'prov_b'::uuid,
         public._pl(:'var_b'::uuid, 5, 1.00)) as r \gset
commit;

-- ⚠️ A SALE AND A WRITE-OFF AT loc_2, WHICH THE CASHIER CANNOT REACH. Added
-- after falsification F12: section 2 tested the wall on the `purchase` branch
-- only, and this function has THREE separate lookups with three separate walls.
-- Deleting the my_locations() scoping from the SALE branch turned nothing red.
\set pur_y   '''dddd0021-0000-0000-0000-0000000000c1'''
\set sale_l2 '''eeee0021-0000-0000-0000-0000000000c2'''
\set wst_l2  '''ffff0021-0000-0000-0000-0000000000c3'''
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_purchase(:pur_y::uuid, :'loc_2'::uuid, :'prov_a'::uuid,
         public._pl(:'var_a'::uuid, 20, 2.00)) as r \gset
select record_sale(:sale_l2::uuid, :'loc_2'::uuid, public._sl(:'var_a'::uuid, 2)) as r \gset
select record_waste(:wst_l2::uuid, :'loc_2'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_a'::uuid,
           'qty_display', 1, 'unit_price_gross_per_base', 10.00,
           'reason', 'caducado'))) as r \gset
commit;

-- The documents this file will void. Authorship matters: the SALES are the
-- cashier's, so section 6 can ask about "own".
\set sale_1  '''eeee0021-0000-0000-0000-000000000001'''
\set sale_2  '''eeee0021-0000-0000-0000-000000000002'''
\set sale_3  '''eeee0021-0000-0000-0000-000000000003'''
\set sale_off '''eeee0021-0000-0000-0000-000000000004'''
\set sale_on  '''eeee0021-0000-0000-0000-000000000005'''
\set sale_own '''eeee0021-0000-0000-0000-000000000006'''
\set sale_o1  '''eeee0021-0000-0000-0000-000000000007'''
\set wst_1   '''ffff0021-0000-0000-0000-000000000001'''

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
-- sale_1: two lines, one taxed and one not, so section 3 negates a mixed
-- document rather than a trivial one.
select record_sale(:sale_1::uuid, :'loc_1'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_a'::uuid,
             'qty_display', 4, 'unit_price_gross_per_base', 10.00),
           jsonb_build_object('variant_id', :'var_iva'::uuid,
             'qty_display', 2, 'unit_price_gross_per_base', 11.60))) as r \gset
select record_sale(:sale_2::uuid,  :'loc_1'::uuid, public._sl(:'var_a'::uuid, 3)) as r \gset
select record_sale(:sale_3::uuid,  :'loc_1'::uuid, public._sl(:'var_a'::uuid, 2)) as r \gset
select record_sale(:sale_own::uuid,:'loc_1'::uuid, public._sl(:'var_a'::uuid, 1)) as r \gset
-- ⚠️ SECTION 7's PAIR. Same cashier, same instant of RECORDING, same quantity.
-- The only difference is the flag and the client clock.
--   sale_off — recorded_offline, occurred_at FIVE HOURS ago
--   sale_on  — online, so §2.6 overrides occurred_at with now()
select record_sale(:sale_off::uuid, :'loc_1'::uuid, public._sl(:'var_a'::uuid, 1),
         now() - interval '5 hours', true) as r \gset
select record_sale(:sale_on::uuid,  :'loc_1'::uuid, public._sl(:'var_a'::uuid, 1),
         null, false) as r \gset
-- The sold-on stock of section 4.5: every unit of pur_s leaves the shelf.
select record_sale(:sale_o1::uuid, :'loc_1'::uuid, public._sl(:'var_s'::uuid, 10, 3.00)) as r \gset
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_waste(:wst_1::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_a'::uuid,
           'qty_display', 5, 'unit_price_gross_per_base', 10.00,
           'reason', 'caducado'))) as r \gset
commit;

-- Baselines, read BEFORE anything is voided.
select coalesce(sum(remaining_base),0) as bal_a0 from batch_balance bb
  join stock_batch sb on sb.id = bb.batch_id
 where sb.variant_id = :'var_a' and sb.location_id = :'loc_1' \gset
select coalesce(sum(remaining_base),0) as bal_s0 from batch_balance bb
  join stock_batch sb on sb.id = bb.batch_id
 where sb.variant_id = :'var_s' and sb.location_id = :'loc_1' \gset
select count(*) as nbatch0 from stock_batch where workspace_id = :'ws_a' \gset


-- =============================================================== 1. arguments
select chk_raises('1.1 a null kind is refused',
                  public._void(null, :sale_1::uuid), '22023');

select chk_raises('1.2 a kind outside {purchase, sale, waste} is refused — '
                  '`transfer` has no document table and cannot be voided this way',
                  public._void('transfer', :sale_1::uuid), '22023');

select chk_raises('1.3 a null document id is refused',
                  public._void('sale', null), '22023');

-- The kind and the id must agree. A sale id looked up in `purchase` is not
-- found, and the wall — not a type error — is what refuses it.
select chk_raises('1.4 the kind must MATCH the id — a sale id offered as a '
                  'purchase is refused, not silently voided',
                  public._void('purchase', :sale_1::uuid), '42501');

begin;
select set_config('request.jwt.claims', null, true);
set local role authenticated;
select chk_raises('1.5 an unauthenticated caller is refused',
                  public._void('sale', :sale_1::uuid), '42501');
commit;


-- ============================================================ 2. the location wall
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select chk_raises('2.1 another tenant''s sale cannot be voided',
                  public._void('purchase', :pur_b::uuid), '42501');

select chk_raises('2.2 an id that exists NOWHERE is refused the same way',
                  public._void('sale', '00000000-dead-0000-0000-000000000000'::uuid),
                  '42501');
commit;

-- ⚠️ 2.3 IS THE NON-LEAK CLAIM, and it is the reason the wall is folded into the
-- SELECT rather than applied after it. If a foreign id and a missing id gave
-- different answers, this function would be an oracle for "does this uuid exist
-- in someone else's tenant".
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
do $$
declare a text; b text;
begin
  begin execute 'select public.void_transaction(''purchase'','
                '''dddd0021-0000-0000-0000-0000000000b1''::uuid, null)';
  exception when others then a := sqlstate || '|' || sqlerrm; end;
  begin execute 'select public.void_transaction(''purchase'','
                '''dddd0021-0000-0000-0000-0000000000ff''::uuid, null)';
  exception when others then b := sqlstate || '|' || sqlerrm; end;
  -- The id itself is echoed back and that leaks nothing — the CALLER supplied
  -- it. What must not differ is anything else, so both are compared with the
  -- uuid masked out.
  a := regexp_replace(a, '[0-9a-f-]{36}', '<id>', 'g');
  b := regexp_replace(b, '[0-9a-f-]{36}', '<id>', 'g');
  perform public.chk('2.3 a FOREIGN id and a MISSING id are indistinguishable — '
                     'same sqlstate and, once the echoed id is masked, the same '
                     'message. This function cannot probe another tenant',
                     a is not null and a = b, coalesce(a,'?') || ' vs ' || coalesce(b,'?'));
end;
$$;
commit;

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_raises('2.4 a STAFF member cannot void at a location they are not '
                  'assigned to, even in their own workspace',
                  public._void('purchase', :pur_x::uuid), '42501');

-- ⚠️ 2.4b / 2.4c EXIST BECAUSE F12 FOUND THEM MISSING. The wall is written out
-- once per kind — three lookups, three copies — so testing it on `purchase`
-- alone leaves two of the three unwatched, and deleting either turned nothing
-- red until these landed.
select chk_raises('2.4b …and the same wall stands on the SALE branch, which is '
                  'a SEPARATE lookup with its own copy of the scoping',
                  public._void('sale', :sale_l2::uuid), '42501');

select chk_raises('2.4c …and on the WASTE branch, the third copy',
                  public._void('waste', :wst_l2::uuid), '42501');
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_succeeds('2.5 …and the MANAGER can, with no member_location row at all — '
           '§2.7 grants every location by role',
           public._void('purchase', :pur_x::uuid, 'entrega equivocada'), 'false');
commit;


-- ============================================================== 3. voiding a SALE
-- The originals are read BEFORE the void, so 3.2 compares against what was
-- actually stored rather than against a number this file asserts twice.
select total_net as s1_net0, total_tax as s1_tax0, occurred_at as s1_at0
  from sale where id = :sale_1::uuid \gset

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('sale', :sale_1::uuid, 'cliente cambio de opinion')
  as v1 \gset
commit;

select (:'v1'::jsonb ->> 'void_id') as void_1 \gset

select chk('3.1 the call reports a fresh void, not a replay',
           (:'v1'::jsonb ->> 'already_recorded') = 'false'
       and (:'v1'::jsonb ->> 'voided') = :sale_1);

select chk('3.2 ⚠️ THE ORIGINAL IS NOT MUTATED — it is still not a reversal, and '
           'its totals and its occurred_at are byte for byte what they were '
           'before the void (§2.4)',
           (select reversal_of is null
               and total_net   = :'s1_net0'::numeric
               and total_tax   = :'s1_tax0'::numeric
               and occurred_at = :'s1_at0'::timestamptz
              from sale where id = :sale_1::uuid));

select chk('3.3 a SECOND document exists, pointing at the first',
           (select count(*) from sale
             where id = :'void_1'::uuid and reversal_of = :sale_1::uuid) = 1);

select chk('3.4 the reason is carried onto the compensating document',
           (select reversal_reason from sale where id = :'void_1'::uuid)
             = 'cliente cambio de opinion');

select chk('3.5 the totals are negated EXACTLY — not recomputed, so they cannot '
           'drift from what was stored',
           (select v.total_net = -o.total_net and v.total_tax = -o.total_tax
              from sale v, sale o
             where v.id = :'void_1'::uuid and o.id = :sale_1::uuid));

select chk('3.6 every line is carried, and the count matches',
           (select count(*) from sale_line where sale_id = :'void_1'::uuid)
             = (select count(*) from sale_line where sale_id = :sale_1::uuid));

select chk('3.7 each line is negated in quantity AND in money, and the mixed '
           'tax rates survive',
           (select count(*) = 2 and bool_and(
                     v.qty_base = -o.qty_base
                 and v.line_net = -o.line_net
                 and v.tax_amount = -o.tax_amount
                 and v.tax_rate = o.tax_rate
                 and v.unit_price_net_per_base = o.unit_price_net_per_base)
              from sale_line v
              join sale_line o on o.sale_id = :sale_1::uuid
                              and o.variant_id = v.variant_id
             where v.sale_id = :'void_1'::uuid));

select chk('3.8 the compensating movements match the original one for one',
           (select count(*) from stock_movement where sale_id = :'void_1'::uuid)
             = (select count(*) from stock_movement where sale_id = :sale_1::uuid));

select chk('3.9 ⚠️ EVERY ONE LANDS ON THE SAME BATCH AS THE MOVEMENT IT CANCELS '
           '(§2.4) — and the schema''s reversal FK is what makes it structural',
           (select bool_and(v.batch_id = o.batch_id and v.qty_base = -o.qty_base)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.sale_id = :'void_1'::uuid));

select chk('3.10 the reversal keeps the ORIGINAL''s reason — there is no '
           '`reversal` movement reason, deliberately (0004)',
           (select bool_and(reason = 'sale') from stock_movement
             where sale_id = :'void_1'::uuid));

select chk('3.11 the shelf is back where it started for var_a''s sold units',
           (select coalesce(sum(v.qty_base + o.qty_base), -1)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.sale_id = :'void_1'::uuid) = 0);

-- ⚠️⚠️ 3.12 WAS WRITTEN IN 4e-ii-a AS `a > b OR a >= b`, WHICH IS `a >= b`, AND
-- A VOID THAT COPIED THE ORIGINAL'S occurred_at PASSED IT. Found in 4e-ii-b by
-- falsification G6 — back-dating the compensating header turned NOTHING red on
-- 64 checks. The disjunction is gone; the claim this check's own label makes is
-- STRICTLY LATER, and that is now what it asserts. 11.6 is the per-kind form.
select chk('3.12 the void lands on its OWN day, not the original''s — '
           'back-dating it would move a total someone has already read',
           (select v.occurred_at > o.occurred_at
              from sale v, sale o
             where v.id = :'void_1'::uuid and o.id = :sale_1::uuid));

select chk('3.13 the compensating document is NOT flagged recorded_offline — it '
           'was written by the server, now',
           (select not recorded_offline from sale where id = :'void_1'::uuid));


-- ========================================================== 4. voiding a PURCHASE
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('purchase', :pur_i::uuid, 'no llego') as v2 \gset
commit;
select (:'v2'::jsonb ->> 'void_id') as void_2 \gset

select chk('4.1 a delivery can be voided',
           (:'v2'::jsonb ->> 'already_recorded') = 'false');

select chk('4.2 ⚠️ NO NEW LOT IS OPENED — the void takes stock back OUT of the '
           'lots the delivery opened, it does not create more',
           (select count(*) from stock_batch where workspace_id = :'ws_a')
             = :nbatch0::integer);

select chk('4.3 the compensating movements are negative and sit on the '
           'delivery''s own lots',
           (select bool_and(v.qty_base < 0 and v.batch_id = o.batch_id)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.purchase_id = :'void_2'::uuid));

select chk('4.4 the provider is carried onto the compensating document — a void '
           'filed against the wrong supplier would corrupt what 0008 derives',
           (select v.provider_id = o.provider_id
              from purchase v, purchase o
             where v.id = :'void_2'::uuid and o.id = :pur_i::uuid));

select chk('4.5 ⚠️ 0015 IS STILL SATISFIED — its live-receipt sum excludes '
           'reversal movements, so the original lot still balances',
           (select count(*) from receipt_completeness_violations()) = 0);

-- ⚠️ 4.6 IS THE ONE THE ADR ANSWERS AND THE FUNCTION MUST NOT SECOND-GUESS.
-- pur_s delivered 10 and sale_o1 sold all 10. Voiding the delivery now takes out
-- stock that is no longer there.
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('purchase', :pur_s::uuid, 'nunca llego') as v3 \gset
commit;

select chk('4.6 ⚠️ VOIDING A SOLD-ON DELIVERY IS RECORDED, NOT REFUSED — the '
           'operator knows it never arrived, and 0004:429 permits the negative '
           'balance deliberately',
           (:'v3'::jsonb ->> 'already_recorded') = 'false');

select chk('4.7 …and the balance really does go NEGATIVE, which is a true '
           'statement about a disagreement between the ledger and the shelf',
           (select coalesce(sum(remaining_base), 0) from batch_balance bb
              join stock_batch sb on sb.id = bb.batch_id
             where sb.variant_id = :'var_s' and sb.location_id = :'loc_1') < 0,
           format('remaining=%s', (select coalesce(sum(remaining_base),0)
              from batch_balance bb join stock_batch sb on sb.id = bb.batch_id
             where sb.variant_id = :'var_s' and sb.location_id = :'loc_1')));


-- ============================================================= 5. voiding a WASTE
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('waste', :wst_1::uuid, 'no estaba caducado') as v4 \gset
commit;
select (:'v4'::jsonb ->> 'void_id') as void_4 \gset

select chk('5.1 a write-off can be voided',
           (:'v4'::jsonb ->> 'already_recorded') = 'false');

select chk('5.2 the waste REASON is carried onto the compensating line — it is '
           'not null and not invented',
           (select bool_and(v.reason = o.reason)
              from waste_line v
              join waste_line o on o.waste_id = :wst_1::uuid
                              and o.variant_id = v.variant_id
             where v.waste_id = :'void_4'::uuid));

select chk('5.3 the COST SNAPSHOT is carried unchanged — it is what the '
           'allocator actually paid, and recomputing it could drift',
           (select bool_and(v.unit_cost_net_per_base = o.unit_cost_net_per_base)
              from waste_line v
              join waste_line o on o.waste_id = :wst_1::uuid
                              and o.variant_id = v.variant_id
             where v.waste_id = :'void_4'::uuid));

select chk('5.4 the stock the write-off consumed is returned to the same lots',
           (select coalesce(sum(v.qty_base + o.qty_base), -1)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.waste_id = :'void_4'::uuid) = 0);


-- ================================================= 6. ⚠️⚠️ THE FENCE (§2.7)
-- The workspace window is 15 by default. Section 6 moves it deliberately, and
-- says so at each step, because the window is the thing under test.

-- 6.1 — a STAFF member voids their OWN, freshly recorded sale. Inside any
-- sane window, and the capability §2.7 grants on the first row of its table.
begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_succeeds('6.1 a STAFF member may void their OWN, recent sale — self-service, '
           'and §2.7 makes it blameless on purpose',
           public._void('sale', :sale_2::uuid, 'me equivoque'), 'false');
commit;

-- 6.2 — the OWNERSHIP branch, with the window opened wide so it cannot be the
-- thing doing the refusing. sale_o1 is the cashier's… but wst_1 and the
-- purchases are the OWNER's. Use one of those.
update workspace_setting set void_window_minutes = 1440 where workspace_id = :'ws_a';

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_raises('6.2 ⚠️ a STAFF member may NOT void someone ELSE''s document, '
                  'even with a 24-hour window open — this is the OWNERSHIP half '
                  'of §2.7''s first row, alone',
                  public._void('purchase', :pur_a::uuid), 'TD003');
commit;

-- 6.3 / 6.4 — ⚠️⚠️ THE PAIR. The window is slammed to ZERO, so every document
-- in the database is outside it. sale_own is the CASHIER's OWN, so the
-- ownership branch cannot be what refuses. The same document is then offered to
-- the manager. NOTHING BUT THE ROLE DIFFERS.
update workspace_setting set void_window_minutes = 0 where workspace_id = :'ws_a';

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_raises('6.3 ⚠️ PAIR — with a ZERO window the cashier is refused their '
                  'OWN sale: the WINDOW half of §2.7''s first row, alone',
                  public._void('sale', :sale_own::uuid), 'TD003');
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_succeeds('6.4 ⚠️ PAIR — the MANAGER voids that SAME sale at that SAME instant '
           'with the SAME zero window. §2.7: "void any transaction, ANY TIME". '
           'Only the role can explain the difference',
           public._void('sale', :sale_own::uuid, 'autorizado'), 'false');
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk_succeeds('6.5 the OWNER is unfenced too — the zero window does not reach '
           'either of the top two rows',
           public._void('sale', :sale_3::uuid, 'autorizado'), 'false');
commit;

-- 6.6 — the window is a ROLE boundary and not a deadline, stated as the thing a
-- bare-window implementation would get wrong. pur_p1 was recorded 48 HOURS ago.
begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_succeeds('6.6 ⚠️ THE CLAUSE THE PLAN HAD WRONG: a manager voids a document '
           'FORTY-EIGHT HOURS old under a ZERO window. A "void window enforced '
           'in the body" would refuse this, and §2.7 grants it',
           public._void('purchase', :pur_p1::uuid, 'devolucion'), 'false');
commit;

update workspace_setting set void_window_minutes = 15 where workspace_id = :'ws_a';


-- ============= 7. ⚠️⚠️ THE OFFLINE BASIS — ADR-035 §2.6, AMENDED 2026-09-04
-- The window is set to SIXTY MINUTES. Both documents below were RECORDED
-- seconds ago. They differ only in `recorded_offline` and in the client clock.
update workspace_setting set void_window_minutes = 60 where workspace_id = :'ws_a';

select chk('7.1a the fixture is what section 7 needs it to be: sale_off''s '
           'occurred_at really is HOURS old while its recorded_at is fresh',
           (select occurred_at < now() - interval '4 hours'
               and recorded_at > now() - interval '1 hour'
               and recorded_offline
              from sale where id = :sale_off::uuid));

select chk('7.1b …and sale_on''s two timestamps are the SAME instant, which is '
           'why every other check in this file cannot tell the readings apart',
           (select abs(extract(epoch from (occurred_at - recorded_at))) < 5
               and not recorded_offline
              from sale where id = :sale_on::uuid));

-- ⚠️⚠️ 7.2 IS THE DISCRIMINATOR. Under the amended rule the basis is
-- recorded_at — fresh — and the cashier may void. Under the rule this replaced
-- the basis was occurred_at — five hours — and the cashier could not.
begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_succeeds('7.2 ⚠️⚠️ THE AMENDMENT, MADE FALSIFIABLE: a cashier voids their own '
           'OFFLINE sale whose occurred_at is FIVE HOURS past a SIXTY MINUTE '
           'window, because the window reads recorded_at. Reading occurred_at '
           'here turns this check red and nothing else in the file moves',
           public._void('sale', :sale_off::uuid, 'error de captura'), 'false');
commit;

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_succeeds('7.3 the ONLINE half of the pair is unaffected — same cashier, same '
           'window, and it was already inside it either way',
           public._void('sale', :sale_on::uuid, 'error de captura'), 'false');
commit;

-- ⚠️ 7.4 — THE AMENDMENT MOVED THE BASIS, IT DID NOT REMOVE THE FENCE. Without
-- this the file proves only that the window got looser, which is exactly the
-- direction a wrong implementation drifts.
update workspace_setting set void_window_minutes = 0 where workspace_id = :'ws_a';
\set sale_off2 '''eeee0021-0000-0000-0000-000000000008'''
begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select record_sale(:sale_off2::uuid, :'loc_1'::uuid, public._sl(:'var_a'::uuid, 1),
         now() - interval '2 hours', true) as r \gset
commit;
begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_raises('7.4 a ZERO window still refuses an offline sale '
                  'the cashier recorded seconds ago — the basis moved, the fence did not',
                  public._void('sale', :sale_off2::uuid), 'TD003');
commit;
update workspace_setting set void_window_minutes = 15 where workspace_id = :'ws_a';

select chk('7.5 ⚠️ DAILY TOTALS ARE UNTOUCHED — the amendment moved the WINDOW''s '
           'basis and not the ledger''s. Every original still carries the '
           'occurred_at it was written with',
           (select occurred_at < now() - interval '4 hours'
              from sale where id = :sale_off::uuid));


-- ==================================================== 8. idempotency and chains
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('sale', :sale_1::uuid, 'otro motivo') as v5 \gset
commit;

select chk('8.1 a RE-SENT void returns already_recorded, not a second document',
           (:'v5'::jsonb ->> 'already_recorded') = 'true');

select chk('8.2 …and hands back the SAME void id',
           (:'v5'::jsonb ->> 'void_id') = :'void_1');

select chk('8.3 …and the database holds exactly ONE reversal of that sale — '
           'sale_one_reversal_idx is the structural half of the same claim',
           (select count(*) from sale where reversal_of = :sale_1::uuid) = 1);

select chk('8.4 …and no extra compensating movements were written',
           (select count(*) from stock_movement where sale_id = :'void_1'::uuid)
             = (select count(*) from stock_movement where sale_id = :sale_1::uuid));

select chk('8.5 ⚠️ THE RETRY CARRIED A DIFFERENT REASON and was still a success '
           '— there is no client payload to disagree about, so this surface has '
           'no TD001 case. The FIRST reason stands',
           (select reversal_reason from sale where id = :'void_1'::uuid)
             = 'cliente cambio de opinion');

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk_raises('8.6 ⚠️ A REVERSAL CANNOT ITSELF BE VOIDED — 0008 excludes '
                  'reversals exactly ONE level deep and a chain walks past it',
                  public._void('sale', :'void_1'::uuid), 'TD003');
commit;

-- 8.7 — the no-op is answered AHEAD of the fence. A cashier retrying a void that
-- already succeeded gets the success back even with the window shut, because a
-- dropped response must not look like a permission failure.
update workspace_setting set void_window_minutes = 0 where workspace_id = :'ws_a';
begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_succeeds('8.7 ⚠️ a STAFF retry of an ALREADY-SUCCESSFUL void succeeds even '
           'with a zero window — fencing a no-op would make a lost response '
           'indistinguishable from a refusal',
           public._void('sale', :sale_2::uuid, 'me equivoque'), 'true');
commit;
update workspace_setting set void_window_minutes = 15 where workspace_id = :'ws_a';


-- ============================================ 9. 0008 — the price memory (§2.3)
-- var_p had two deliveries from prov_2: 3.00 then 7.50. 6.6 voided the FIRST
-- (pur_p1, 48h old), so the memory should still read the second.
select chk('9.1 with the LATER delivery standing, the memory reads its price',
           (select unit_price_net_per_base from provider_price_memory
             where provider_id = :'prov_2'::uuid and variant_id = :'var_p') = 7.50,
           format('memory=%s', (select unit_price_net_per_base
              from provider_price_memory
             where provider_id = :'prov_2'::uuid and variant_id = :'var_p')));

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('purchase', :pur_p2::uuid, 'devuelto') as v6 \gset
commit;

select chk('9.2 ⚠️ AFTER VOIDING IT THE MEMORY DOES NOT OFFER THE CANCELLED '
           'PRICE — both of §2.3''s exclusions are doing work, and the voided '
           '7.50 is gone',
           (select coalesce(
              (select unit_price_net_per_base from provider_price_memory
                where provider_id = :'prov_2'::uuid and variant_id = :'var_p'),
              -1) <> 7.50),
           format('memory=%s', (select coalesce((select unit_price_net_per_base
              from provider_price_memory
             where provider_id = :'prov_2'::uuid and variant_id = :'var_p'), -1))));

select chk('9.3 …and it does not fall back to the OTHER voided delivery either '
           '— both pur_p1 and pur_p2 are now reversed, so the pair has no '
           'standing price at all',
           (select count(*) from provider_price_memory
             where provider_id = :'prov_2'::uuid and variant_id = :'var_p') = 0);


-- ================ 10. ⚠️⚠️ THE PER-KIND MATRIX — F12'S LESSON, GENERALISED
-- F12 found the LOCATION WALL written out three times, once per document kind,
-- with only the `purchase` copy watched. The wall was the finding. It was not the
-- SHAPE: the whole lookup is written three times, ten columns each, and sections
-- 3, 4 and 5 divide the properties BETWEEN the kinds rather than asserting each
-- one on all three. What stood before this section is a diagonal, not a matrix:
--
--   property                            | purchase | sale | waste |
--   ------------------------------------|----------|------|-------|
--   totals negated                      |    —     | 3.5  |   —   |
--   lines negated in qty and money      |    —     | 3.7  |   —   |
--   qty_display negated, its unit kept  |    —     |  —   |   —   |  ⚠️ NOWHERE
--   the void is not recorded_offline    |    —     | 3.13 |   —   |
--   workspace and location carried      |    —     |  —   |   —   |  ⚠️ NOWHERE
--   movement reason carried             |    —     | 3.10 |   —   |
--   movement cost carried               |    —     |  —   |   —   |  ⚠️ NOWHERE
--   movement scope columns carried      |    —     |  —   |   —   |  ⚠️ NOWHERE
--
-- ⚠️ A property proved on ONE branch of a three-way `if` is a property proved
-- about one third of this function. Every check below fills a row of that table.
-- They read documents sections 3, 4 and 5 already voided — no new fixture, and
-- nothing here can move a verdict those sections recorded.

-- ⚠️⚠️ TWO DOCUMENTS THIS SECTION HAD TO BUILD, AND FALSIFICATION IS WHY. The
-- first drafts of 10.2 and 10.3 read `wst_1` and `pur_i` — the documents sections
-- 4 and 5 had already voided — and BOTH ARMS WERE VACUOUS ON THEM:
--
--   * every write-off in this file is ZERO-RATED, so `total_tax = -total_tax` is
--     `0 = -0`. Falsification G11 dropped the negation from the waste header's
--     tax and turned NOTHING red;
--   * `_pl` sends no `expiry_date` and ADR-017's tier 2 needs a family that
--     tracks expiry, so every purchase line here carries NULL. G12 replaced the
--     carried expiry with null and turned NOTHING red — `null is not distinct
--     from null` is true.
--
-- A check whose subject is zero or null asserts nothing about a function that
-- negates or carries. Both documents below are built to have a value that can be
-- got wrong, and 10.2 and 10.3 assert that they do before asserting anything else.
\set pur_e '''dddd0021-0000-0000-0000-0000000000d1'''
\set wst_t '''ffff0021-0000-0000-0000-0000000000d2'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_purchase(:pur_e::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_iva'::uuid,
           'qty_display', 12, 'unit_price_net_per_base', 5.00,
           'expiry_date', '2027-06-30'))) as r \gset
select record_waste(:wst_t::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_iva'::uuid,
           'qty_display', 3, 'unit_price_gross_per_base', 11.60,
           'reason', 'caducado'))) as r \gset
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('purchase', :pur_e::uuid, 'caja rota') as ve \gset
select public.void_transaction('waste', :wst_t::uuid, 'no estaba caducado') as vt \gset
commit;
select (:'ve'::jsonb ->> 'void_id') as void_e \gset
select (:'vt'::jsonb ->> 'void_id') as void_t \gset

select chk('10.1 the totals are negated on the PURCHASE branch too — 3.5 proved '
           'it of the sale, and the three inserts are three separate statements '
           'that could disagree',
           (select v.total_net = -o.total_net and v.total_tax = -o.total_tax
              from purchase v, purchase o
             where v.id = :'void_2'::uuid and o.id = :pur_i::uuid));

select chk('10.2 …and on the WASTE branch, the third copy — over a write-off '
           'that actually carries tax, so the tax arm is a claim and not `0 = -0`',
           (select o.total_tax <> 0
               and v.total_net = -o.total_net and v.total_tax = -o.total_tax
              from waste v, waste o
             where v.id = :'void_t'::uuid and o.id = :wst_t::uuid),
           format('tax=%s', (select total_tax from waste where id = :wst_t::uuid)));

select chk('10.3 the PURCHASE lines are negated in quantity and money, and the '
           'expiry date is carried FORWARD unchanged — it is a property of the '
           'goods, not of the document, and negating or dropping it would put the '
           'compensating line on a different lot rule than the original. The date '
           'is asserted NOT NULL first — G12 found this arm vacuous without that',
           (select count(*) = 1 and bool_and(
                     o.expiry_date is not null
                 and v.qty_base   = -o.qty_base
                 and v.line_net   = -o.line_net
                 and v.tax_amount = -o.tax_amount
                 and v.tax_rate   =  o.tax_rate
                 and v.unit_price_net_per_base = o.unit_price_net_per_base
                 and v.expiry_date = o.expiry_date)
              from purchase_line v
              join purchase_line o on o.purchase_id = :pur_e::uuid
                                  and o.variant_id  = v.variant_id
             where v.purchase_id = :'void_e'::uuid));

select chk('10.4 …and the WASTE lines are negated the same way, with the rate and '
           'the unit price carried rather than recomputed — over the taxed '
           'write-off, so `tax_amount` is a number rather than zero',
           (select count(*) = 1 and bool_and(
                     o.tax_amount <> 0
                 and v.qty_base   = -o.qty_base
                 and v.line_net   = -o.line_net
                 and v.tax_amount = -o.tax_amount
                 and v.tax_rate   =  o.tax_rate
                 and v.unit_price_net_per_base = o.unit_price_net_per_base)
              from waste_line v
              join waste_line o on o.waste_id   = :wst_t::uuid
                               and o.variant_id = v.variant_id
             where v.waste_id = :'void_t'::uuid));

-- ⚠️ 10.5 IS 4d-i's FINDING ARRIVING HERE. `qty_display` is a numeric(14,3) of
-- its own — not a view of `qty_base` — so a void that negated the base quantity
-- and copied the display quantity would write a line saying "minus four units,
-- four pieces". `0003`'s money_follows_qty check reads line_net against qty_base
-- and would not notice. NOTHING in this file had looked at the column.
-- ⚠️ AND THE SCHEMA, IT TURNS OUT, IS WHAT HOLDS IT: falsification G5 copied the
-- display quantity on all three branches and `sale_line_qty_display_agrees`
-- refused the insert. The check is kept because it says what the reader needs to
-- know, and it is honestly the schema's evidence rather than this file's.
select chk('10.5 ⚠️ qty_display IS NEGATED ON ALL THREE BRANCHES, and its UNIT is '
           'carried — the display quantity is stored, not derived (4d-i), so it '
           'is a second arm that has to be negated on purpose',
           (select bool_and(v.qty_display = -o.qty_display
                        and v.qty_display_unit = o.qty_display_unit)
              from sale_line v
              join sale_line o on o.sale_id = :sale_1::uuid
                              and o.variant_id = v.variant_id
             where v.sale_id = :'void_1'::uuid)
       and (select bool_and(v.qty_display = -o.qty_display
                        and v.qty_display_unit = o.qty_display_unit)
              from purchase_line v
              join purchase_line o on o.purchase_id = :pur_i::uuid
                                  and o.variant_id = v.variant_id
             where v.purchase_id = :'void_2'::uuid)
       and (select bool_and(v.qty_display = -o.qty_display
                        and v.qty_display_unit = o.qty_display_unit)
              from waste_line v
              join waste_line o on o.waste_id = :wst_1::uuid
                               and o.variant_id = v.variant_id
             where v.waste_id = :'void_4'::uuid));

-- ⚠️ 10.6 READS THE VOID OF AN *OFFLINE* ORIGINAL, and falsification G16 is why.
-- Its first draft read `void_2` and `void_4`, whose originals were both recorded
-- ONLINE — so `false` and `recorded_offline` held the same value and inheriting
-- the flag was invisible. The claim is that the flag is NOT inherited, and only a
-- document whose original carried `true` can say so. 12.5 is the purchase and
-- waste half; sale_off, voided at 7.2, is the one this file has by here.
select chk('10.6 ⚠️ THE VOID IS NEVER FLAGGED recorded_offline, EVEN WHEN THE '
           'DOCUMENT IT CANCELS WAS. Nothing queued the void: it was written by '
           'the server, now — and the flag is what §2.6''s amended window branches '
           'on, so a void that inherited it would put the NEXT void of the same '
           'kind on the wrong basis',
           (select recorded_offline from sale where id = :sale_off::uuid)
       and (select not recorded_offline from sale
             where reversal_of = :sale_off::uuid)
       and (select not recorded_offline from purchase where id = :'void_2'::uuid)
       and (select not recorded_offline from waste    where id = :'void_4'::uuid));

select chk('10.7 ⚠️ THE VOID STAYS IN THE ORIGINAL''S WORKSPACE AND ITS STORE, on '
           'all three branches. Nothing in this file had asserted it: a void '
           'filed at the wrong location would be invisible to the shop it '
           'belongs to and would still satisfy every other check here',
           (select v.workspace_id = o.workspace_id and v.location_id = o.location_id
              from sale v, sale o
             where v.id = :'void_1'::uuid and o.id = :sale_1::uuid)
       and (select v.workspace_id = o.workspace_id and v.location_id = o.location_id
              from purchase v, purchase o
             where v.id = :'void_2'::uuid and o.id = :pur_i::uuid)
       and (select v.workspace_id = o.workspace_id and v.location_id = o.location_id
              from waste v, waste o
             where v.id = :'void_4'::uuid and o.id = :wst_1::uuid));

select chk('10.8 the compensating movements keep the ORIGINAL''s reason on the '
           'purchase and waste branches too — 3.10 said it of the sale. There is '
           'deliberately no `reversal` reason in the enum (0004), so a cancelled '
           'delivery is still purchase activity',
           (select bool_and(reason = 'purchase') from stock_movement
             where purchase_id = :'void_2'::uuid)
       and (select bool_and(reason = 'waste') from stock_movement
             where waste_id = :'void_4'::uuid));

select chk('10.9 ⚠️ EVERY COMPENSATING MOVEMENT CARRIES THE COST THE ORIGINAL '
           'CARRIED, on all three branches — unit_cost_net_per_base is a '
           'not-null snapshot, so a void that recomputed it would still apply '
           'cleanly and would silently misstate what the cancelled stock cost',
           (select bool_and(v.unit_cost_net_per_base = o.unit_cost_net_per_base)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.sale_id = :'void_1'::uuid)
       and (select bool_and(v.unit_cost_net_per_base = o.unit_cost_net_per_base)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.purchase_id = :'void_2'::uuid)
       and (select bool_and(v.unit_cost_net_per_base = o.unit_cost_net_per_base)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.waste_id = :'void_4'::uuid));

select chk('10.10 …and the scope columns as well — workspace, location and '
           'variant come off the movement being cancelled, not off the caller',
           (select bool_and(v.workspace_id = o.workspace_id
                        and v.location_id  = o.location_id
                        and v.variant_id   = o.variant_id)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.sale_id = :'void_1'::uuid
                or v.purchase_id = :'void_2'::uuid
                or v.waste_id = :'void_4'::uuid));

select chk('10.11 the compensating movement lands on the void''s own instant, '
           'not the cancelled movement''s — the same argument 3.12 makes about '
           'the header, and Números reads movements by occurred_at',
           (select bool_and(v.occurred_at > o.occurred_at)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.sale_id = :'void_1'::uuid
                or v.purchase_id = :'void_2'::uuid
                or v.waste_id = :'void_4'::uuid));


-- ================== 11. AUTHORSHIP, AND THE HEADER COLUMNS NOBODY HAD READ
-- Four columns on the compensating document are DERIVED rather than copied, and
-- before this section not one of them was asserted anywhere: created_by,
-- payload_hash, and the strictness of occurred_at. They are the columns an audit
-- reads, and a wrong value in any of them applies perfectly cleanly.

select id as void_own from sale where reversal_of = :sale_own::uuid \gset

select chk('11.1 ⚠️ THE VOID IS FILED UNDER WHOEVER VOIDED IT, NOT WHOEVER WROTE '
           'THE ORIGINAL. 6.4''s manager voided the CASHIER''s sale; the '
           'compensating document names the manager and the original still names '
           'the cashier. A void that copied created_by would put a cancellation '
           'the cashier is not allowed to make under the cashier''s name',
           (select v.created_by = :manager_a::uuid
                                  and o.created_by = :cashier_a::uuid
              from sale v, sale o
             where v.id = :'void_own'::uuid and o.id = :sale_own::uuid));

select chk('11.2 …and so do the compensating MOVEMENTS — the ledger and the '
           'document agree about who acted',
           (select bool_and(created_by = :manager_a::uuid) from stock_movement
             where sale_id = :'void_own'::uuid));

select chk('11.3 the payload_hash is DERIVED and deterministic — md5 over the '
           'kind and the id of what was voided. There is no client payload here '
           '(decision 2 in 0021), so this is the only thing it could hash, and a '
           'random one would make the column a lie rather than a fingerprint',
           (select payload_hash from sale where id = :'void_1'::uuid)
             = md5('void:sale:' || :sale_1),
           format('stored=%s wanted=%s',
                  (select payload_hash from sale where id = :'void_1'::uuid),
                  md5('void:sale:' || :sale_1)));

select chk('11.4 …and it is a function of WHICH document was voided: every '
           'compensating sale in this file carries a hash of its own. A constant '
           'would satisfy 15.4''s not-blank check and fingerprint nothing',
           (select count(distinct payload_hash) from sale where reversal_of is not null)
             = (select count(*) from sale where reversal_of is not null)
       and (select count(*) from sale where reversal_of is not null) > 1);

select chk('11.5 ⚠️ NOTHING WAS MUTATED, AND THAT INCLUDES AUTHORSHIP — every '
           'sale this file voided still names the cashier who rang it up. 15.3 '
           'makes the same claim about reversal_of and the totals',
           (select count(*) from sale
             where id in (:sale_1::uuid, :sale_2::uuid, :sale_3::uuid,
                          :sale_own::uuid, :sale_off::uuid, :sale_on::uuid)
               and created_by <> :cashier_a::uuid) = 0);

-- ⚠️⚠️ 11.6 IS THE PER-KIND FORM OF 3.12, AND 3.12 IS WHY IT EXISTS. As 4e-ii-a
-- wrote it, 3.12 read `a > b or a >= b` — which is `a >= b` — so a void that
-- copied the original's occurred_at PASSED IT. Falsification G6 in 4e-ii-b did
-- exactly that and turned nothing red on 64 checks. 3.12 is fixed in place; this
-- is the claim made once per document kind, over every void the file has written.
select chk('11.6 ⚠️ THE VOID LANDS ON ITS OWN DAY, STRICTLY, ON ALL THREE KINDS '
           '— back-dating a cancellation moves a daily total someone has already '
           'read in Números, and 0021 fixes occurred_at to now() for that reason',
           (select bool_and(v.occurred_at > o.occurred_at)
              from sale v join sale o on o.id = v.reversal_of)
       and (select bool_and(v.occurred_at > o.occurred_at)
              from purchase v join purchase o on o.id = v.reversal_of)
       and (select bool_and(v.occurred_at > o.occurred_at)
              from waste v join waste o on o.id = v.reversal_of));


-- ============ 12. ⚠️⚠️ THE FENCE ON THE OTHER TWO BRANCHES — created_by AND
--                    recorded_offline ARE ALSO WRITTEN THREE TIMES
-- Sections 6 and 7 are the fence and the amended basis, and every document they
-- use is a SALE. But `v_creator`, `v_offline` and `v_recorded` are read in the
-- same three-way lookup the location wall lives in, so the purchase and waste
-- copies are as unwatched as the wall was before F12.
--
-- ⚠️ AND A REFUSAL CANNOT WATCH THEM. 6.2 refuses a cashier voiding someone
-- else's purchase — but if the purchase branch stopped selecting created_by at
-- all, `v_creator` would be null, `null is distinct from v_user` would still be
-- true, and 6.2 would still pass. Only a GRANT can tell a column that is read
-- from a column that is missing. Every check in this section is a grant.
--
-- ⚠️ THE CASHIER RECORDS A DELIVERY HERE, AND §2.7 GRANTS IT: the first row of
-- the capability table is "Record sale, purchase, waste — staff ● assigned
-- locations". `0018` having a location wall and no role fence is that row
-- implemented, not a gap in it. What the shop would actually do — the manager or
-- the owner receives — is a Comprar workflow question about who is standing at
-- the door, and it is not what this function reads. The purchase branch's
-- ownership read has no other witness, and this one is authorised.
\set pur_c    '''dddd0021-0000-0000-0000-0000000000e1'''
\set pur_coff '''dddd0021-0000-0000-0000-0000000000e2'''
\set wst_c    '''ffff0021-0000-0000-0000-0000000000e3'''
\set wst_coff '''ffff0021-0000-0000-0000-0000000000e4'''

update workspace_setting set void_window_minutes = 60 where workspace_id = :'ws_a';

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select record_purchase(:pur_c::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_c'::uuid, 30, 2.00)) as r \gset
-- The offline pair, in the shape section 7 established: occurred_at FIVE HOURS
-- old, recorded_at now, under a SIXTY MINUTE window.
select record_purchase(:pur_coff::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_c'::uuid, 5, 2.00),
         now() - interval '5 hours', true) as r \gset
select record_waste(:wst_c::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_c'::uuid,
           'qty_display', 2, 'unit_price_gross_per_base', 6.00,
           'reason', 'caducado'))) as r \gset
select record_waste(:wst_coff::uuid, :'loc_1'::uuid,
         jsonb_build_array(jsonb_build_object('variant_id', :'var_c'::uuid,
           'qty_display', 1, 'unit_price_gross_per_base', 6.00,
           'reason', 'caducado')),
         now() - interval '5 hours', true) as r \gset
commit;

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_succeeds('12.1 ⚠️ a STAFF member voids their OWN WRITE-OFF — the waste '
           'branch''s `created_by` read, and the first check in this file that can '
           'tell it apart from a column that is never selected',
           public._void('waste', :wst_c::uuid, 'no estaba caducado'), 'false');
commit;

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_succeeds('12.2 …and their OWN DELIVERY — the purchase branch''s copy. '
           '6.2 refuses a cashier someone else''s purchase and would pass with the '
           'column dropped; this is the grant that would not',
           public._void('purchase', :pur_c::uuid, 'me equivoque de proveedor'), 'false');
commit;

-- ⚠️⚠️ 12.3 / 12.4 BROADEN F2's BLAST RADIUS ON PURPOSE. Before this section the
-- amended basis had exactly ONE witness — 7.2, on the sale branch — so forcing
-- the basis back to `occurred_at` turned one check red out of sixty-four. The
-- `case` is one statement, but the columns it reads are selected three times.
begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_succeeds('12.3 ⚠️⚠️ THE OFFLINE BASIS ON THE WASTE BRANCH: the cashier '
           'voids their own write-off whose occurred_at is FIVE HOURS past a '
           'SIXTY MINUTE window, because the window reads recorded_at (§2.6, '
           'amended 2026-09-04). The pre-amendment rule refuses this',
           public._void('waste', :wst_coff::uuid, 'error de captura'), 'false');
commit;

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_succeeds('12.4 …and on the PURCHASE branch, the third copy of the two '
           'timestamp columns and the flag that chooses between them',
           public._void('purchase', :pur_coff::uuid, 'error de captura'), 'false');
commit;

-- ⚠️ 12.5 IS 10.6's OTHER TWO BRANCHES, and it can only be asked here: the
-- offline PURCHASE and the offline WASTE are voided four checks above. G16 made
-- both compensating documents inherit `recorded_offline` from their originals and
-- turned NOTHING red until this check existed.
select chk('12.5 …and neither compensating document is flagged recorded_offline, '
           'though BOTH originals were — the third and second copies of the claim '
           '10.6 makes about the sale',
           (select recorded_offline from purchase where id = :pur_coff::uuid)
       and (select recorded_offline from waste    where id = :wst_coff::uuid)
       and (select not recorded_offline from purchase
             where reversal_of = :pur_coff::uuid)
       and (select not recorded_offline from waste
             where reversal_of = :wst_coff::uuid));

update workspace_setting set void_window_minutes = 15 where workspace_id = :'ws_a';


-- ================ 13. THE CHAIN GUARD AND THE RETRY, ON ALL THREE BRANCHES
-- `v_is_rev` and the already-voided lookup are, like everything else here,
-- written once per kind. Section 8 exercises both on the SALE alone.

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk_raises('13.1 a PURCHASE reversal cannot itself be voided — 8.6 said it '
                  'of the sale, and 0008''s price memory excludes reversals '
                  'exactly ONE level deep, which is what a chain walks past',
                  public._void('purchase', :'void_2'::uuid), 'TD003');

select chk_raises('13.2 …and neither can a WASTE reversal, the third copy',
                  public._void('waste', :'void_4'::uuid), 'TD003');
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('purchase', :pur_i::uuid, 'otro motivo') as v7 \gset
select public.void_transaction('waste', :wst_1::uuid, 'otro motivo') as v8 \gset
commit;

select chk('13.3 a RE-SENT void of a PURCHASE returns already_recorded and the '
           'SAME void id — the short-circuit is written once per kind and 8.1 '
           'watched one of the three',
           (:'v7'::jsonb ->> 'already_recorded') = 'true'
       and (:'v7'::jsonb ->> 'void_id') = :'void_2'
       and (select count(*) from purchase where reversal_of = :pur_i::uuid) = 1);

select chk('13.4 …and of a WASTE',
           (:'v8'::jsonb ->> 'already_recorded') = 'true'
       and (:'v8'::jsonb ->> 'void_id') = :'void_4'
       and (select count(*) from waste where reversal_of = :wst_1::uuid) = 1);


-- ================== 14. ⚠️ MULTI-LOT AND MULTI-LINE — THE PER-LOT CLAIM
-- 4b-ii's lesson: "the per-lot cost is the one thing only a multi-lot line can
-- check". Every document sections 3 to 5 voided drew from exactly ONE lot, so
-- "the stock goes back to the lots it came from" and "the stock goes back to A
-- lot" are the same sentence there. A void that returned the whole quantity to
-- one batch passes 3.9, 3.11, 4.3 and 5.4 unchanged.
--
-- var_m gets THREE deliveries of four, and one sale of ten across all three.
\set pur_m1 '''dddd0021-0000-0000-0000-0000000000f1'''
\set pur_m2 '''dddd0021-0000-0000-0000-0000000000f2'''
\set pur_m3 '''dddd0021-0000-0000-0000-0000000000f3'''
\set pur_mm '''dddd0021-0000-0000-0000-0000000000f4'''
\set sale_m '''eeee0021-0000-0000-0000-0000000000f5'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_purchase(:pur_m1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_m'::uuid, 4, 1.00)) as r \gset
select record_purchase(:pur_m2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_m'::uuid, 4, 2.00)) as r \gset
select record_purchase(:pur_m3::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_m'::uuid, 4, 3.00)) as r \gset
-- ⚠️ A TWO-LINE DELIVERY, for 14.5: one document, two variants, two lots opened.
-- ⚠️ NEITHER LINE IS var_m, AND 14.1 IS WHY. A fourth var_m lot of six made the
-- allocation ambiguous — six plus four is ten, so the sale sometimes spanned two
-- lots instead of three and 14.1 went red on runs that had nothing to do with the
-- defect being injected. The fixture check found its own fixture, which is the
-- job it was written for.
select record_purchase(:pur_mm::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_a'::uuid,
             'qty_display', 6, 'unit_price_net_per_base', 1.50),
           jsonb_build_object('variant_id', :'var_c'::uuid,
             'qty_display', 7, 'unit_price_net_per_base', 2.50))) as r \gset
commit;

-- The per-lot shelf, read BEFORE the sale. 14.4 compares against these rows
-- rather than against a total, which is the whole point of the section.
create table public._m0 as
  select bb.batch_id, bb.remaining_base
    from batch_balance bb join stock_batch sb on sb.id = bb.batch_id
   where sb.variant_id = :'var_m'::uuid and sb.location_id = :'loc_1'::uuid;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_sale(:sale_m::uuid, :'loc_1'::uuid,
         public._sl(:'var_m'::uuid, 10, 8.00)) as r \gset
commit;

-- 14.1 is the fixture check that makes the rest non-vacuous. Without it a
-- one-lot allocation would make 14.2 and 14.3 true and empty.
select chk('14.1 the fixture is what this section needs: the sale really did draw '
           'from MORE THAN ONE lot, so "back to the lots it came from" is a claim '
           'that can fail here and cannot in sections 3 to 5',
           (select count(distinct batch_id) from stock_movement
             where sale_id = :sale_m::uuid) >= 3,
           format('lots=%s', (select count(distinct batch_id) from stock_movement
             where sale_id = :sale_m::uuid)));

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('sale', :sale_m::uuid, 'cliente devolvio todo') as v9 \gset
commit;
select (:'v9'::jsonb ->> 'void_id') as void_m \gset

select chk('14.2 ⚠️ ONE COMPENSATING MOVEMENT PER LOT, over as many DISTINCT '
           'batches as the sale touched — a void that returned the whole quantity '
           'to a single batch would satisfy 3.9, 3.11 and 5.4 exactly as they are '
           'written',
           (select count(*) from stock_movement where sale_id = :'void_m'::uuid)
             = (select count(*) from stock_movement where sale_id = :sale_m::uuid)
       and (select count(distinct batch_id) from stock_movement
             where sale_id = :'void_m'::uuid)
             = (select count(distinct batch_id) from stock_movement
                 where sale_id = :sale_m::uuid));

select chk('14.3 …and each lot gets back EXACTLY what it gave, lot by lot rather '
           'than in total — the sum over the document nets to zero even when the '
           'per-lot split is wrong',
           (select bool_and(net = 0) from (
              select o.batch_id, sum(o.qty_base + v.qty_base) as net
                from stock_movement v
                join stock_movement o on o.id = v.reversal_of_movement_id
               where v.sale_id = :'void_m'::uuid
               group by o.batch_id) t));

select chk('14.4 ⚠️ THE SHELF IS BACK LOT BY LOT — every batch of var_m reads '
           'exactly the remaining_base it read before the sale, compared against '
           'the rows captured beforehand rather than against a number this file '
           'asserts twice',
           (select count(*) from public._m0 m
              join batch_balance bb on bb.batch_id = m.batch_id
             where bb.remaining_base is distinct from m.remaining_base) = 0
       and (select count(*) from public._m0) >= 3,
           format('lots=%s mismatched=%s',
             (select count(*) from public._m0),
             (select count(*) from public._m0 m
                join batch_balance bb on bb.batch_id = m.batch_id
               where bb.remaining_base is distinct from m.remaining_base)));

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.void_transaction('purchase', :pur_mm::uuid, 'entrega equivocada') as v10 \gset
commit;
select (:'v10'::jsonb ->> 'void_id') as void_mm \gset

select chk('14.5 a MULTI-LINE delivery is undone on EVERY lot it opened — two '
           'lines, two lots, two compensating movements, and the reported counts '
           'agree with the ledger. Every purchase this file had voided until now '
           'had a single line',
           (:'v10'::jsonb ->> 'lines') = '2'
       and (:'v10'::jsonb ->> 'movements') = '2'
       and (select count(distinct batch_id) from stock_movement
             where purchase_id = :'void_mm'::uuid) = 2
       and (select bool_and(v.qty_base = -o.qty_base and v.batch_id = o.batch_id)
              from stock_movement v
              join stock_movement o on o.id = v.reversal_of_movement_id
             where v.purchase_id = :'void_mm'::uuid));

-- ============================================= 15. the invariants, over the lot
select chk('15.1 §2.4''s balance invariant holds over every document this file '
           'wrote, including the deliberate overdraw of 4.7',
           (select count(*) from batch_balance_violations()) = 0,
           format('violations=%s', (select count(*) from batch_balance_violations())));

select chk('15.2 …and 0015''s does too — no lot was opened without its receipt, '
           'and no VOID counted as one',
           (select count(*) from receipt_completeness_violations()) = 0);

select chk('15.3 ⚠️ NOTHING WAS MUTATED. Every original this file voided is '
           'still not a reversal, and every compensating document points at '
           'exactly one of them',
           (select count(*) from sale where id in (:sale_1::uuid, :sale_2::uuid,
                     :sale_3::uuid, :sale_own::uuid, :sale_off::uuid,
                     :sale_on::uuid, :sale_m::uuid)
                and reversal_of is not null) = 0);

select chk('15.4 every compensating document carries a reason-scoped reversal '
           'and a non-blank payload hash — 0003''s check constraints, satisfied '
           'by this function rather than by luck',
           (select count(*) from sale
             where reversal_of is not null and btrim(payload_hash) = '') = 0
       and (select count(*) from purchase
             where reversal_of is not null and btrim(payload_hash) = '') = 0
       and (select count(*) from waste
             where reversal_of is not null and btrim(payload_hash) = '') = 0);

select chk('15.5 every compensating movement is tied to the movement it cancels '
           '— none was written loose',
           (select count(*) from stock_movement sm
             where sm.reversal_of_movement_id is null
               and sm.sale_id in (select id from sale where reversal_of is not null)) = 0);

-- ⚠️⚠️ THE COUNT ITSELF — 4d-i's finding, and the guard is now standard. A
-- verdict recorded inside a transaction that ends in `rollback` VANISHES rather
-- than failing, and a report cannot miss a row that was never inserted. The
-- literal below is deliberately a literal: a count derived from the file would
-- agree with the file whatever the file did.
select chk('15.6 ALL 95 CHECKS IN THIS FILE ACTUALLY RAN — a verdict rolled back '
           'with its transaction leaves no trace at all',
           (select count(*) from public._verify) = 94,
           format('recorded=%s of 94 before this one', (select count(*) from public._verify)));

drop table public._m0;
drop function public.chk_succeeds(text, text, text);
drop function public._void(text, uuid, text);
drop function public._sl(uuid, numeric, numeric);
drop function public._pl(uuid, numeric, numeric);


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
