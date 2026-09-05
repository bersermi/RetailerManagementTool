-- ============================================================================
-- Behavioural verification for 0026 — replay_failed_write()
-- ============================================================================
-- ADR-035 §2.4, §2.5, §2.6, §2.7, §2.8, §2.9, §2.10 (the **replay** row), §3
-- step 4.5, §9. docs/PLAN.md task 4.5c-ii — the LAST task of the database build.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0026_replay_failed_write.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED, AND WHY EACH CLAIM NEEDS A PAIR
-- ----------------------------------------------------------------------------
-- §2.10's **replay** row is *"dead-letter → downgrade → replay, keeping the
-- original occurred_at"*, and it is the last of the nine. Section 3 is that row
-- end to end on one sale, and sections 4–10 are the parts of it that a single
-- happy path cannot see.
--
--   ⚠️⚠️ "THE BALANCE IS RIGHT" IS THE WEAKEST CLAIM IN THIS FILE and it is the
--   one a wrong implementation passes. A positive `adjust_stock_delta` would
--   restore the same TOTAL as the reversal movements do — and would do it by
--   opening a zero-cost lot beside the original, leaving the shelf correct and
--   the cost basis fiction (`0026` decision 1). So every quantity check in
--   section 3 is PAIRED with a check on WHERE the units went: the lot count is
--   unchanged, no lot has `origin = 'adjustment'`, and the replayed sale's own
--   movements name the batch the original purchase opened. Section 6 makes the
--   same claim across TWO lots, which is the case a single-lot fixture cannot
--   distinguish from luck.
--
--   ⚠️⚠️ AND "THE REPLAY SUCCEEDED" IS NOT A CLAIM ABOUT THE ORDER. §2.6 says
--   compensate, THEN re-run, and `0017`'s availability check is what makes the
--   order observable: after a downgrade the shelf is short by exactly the sale's
--   own quantity, so a replay that re-ran first would be refused. Section 7
--   therefore turns enforcement ON and PAIRS the successful replay (7.3) with
--   the identical `record_sale` made directly against the same short shelf
--   (7.2), which is refused `TD002`. Without 7.2, 7.3 would pass against a
--   function that never compensated at all.
--
--   ⚠️⚠️ AND THE TIMESTAMP CLAIM NEEDS FOUR CASES, NOT ONE. §2.6's exemption is
--   "preserve", but `failed_write` stores no clamped timestamp — only the
--   client's own unvalidated payload (`0024`) — so `0026` recomputes what the
--   original call WOULD have written, at `failed_at` rather than at `now()`.
--   Section 9 walks all four: offline-and-recent is preserved verbatim,
--   offline-and-ancient is clamped to `failed_at − 72h`, online is overridden to
--   `failed_at` whatever the payload says, and a payload dated 2099 does NOT
--   produce a sale dated 2099. Only the second and fourth can tell a correct
--   implementation from a naive `v_at := payload occurred_at`.
--
--   ⚠️ THE FENCE IS A PAIR (2.2/2.3). A refusal proves nothing about WHICH
--   fence refused unless the same call, on the same row, succeeds for the role
--   above it — otherwise the check would pass against a function fenced at
--   `service_role`, or one that refuses everything.
--
--   ⚠️ THE GRANTS ARE READ FROM THE CATALOG (section 1). Postgres grants EXECUTE
--   to PUBLIC by default, so a migration that only `grant`s hands `anon` the
--   function and no line of the file says so. 3.1's finding, in its fifth place.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT CONCURRENCY. `replay_failed_write` takes the dead letter
-- `for update` before it reads `replayed_at`, and one connection cannot block on
-- its own lock. Section 5 asserts the SERIAL idempotency the lock exists to make
-- safe; the two-connection claim would belong in supabase/vitest/ and is not
-- owed by §2.10, whose concurrency row closed in 4c-ii.
--
-- ⚠️ NOTHING ABOUT THE VENDOR PATH. §2.8 lands dead letters with the operator of
-- this system, not the merchant — but every function on this surface reads
-- `auth.uid()`, so a vendor-side replay running as `service_role` would fail the
-- authenticated-caller guard before it reached the fence. That is a real gap and
-- it is recorded in docs/PLAN.md rather than asserted here, because nothing in
-- `0026` can close it.
--
-- ⚠️ THE FIXTURE MOVES `failed_at` BY HAND. `record_failed_write` defaults it to
-- `now()`, and section 9's whole subject is a clamp anchored to it, so the rows
-- are aged with an UPDATE as superuser between capture and replay. That is legal
-- here and nowhere else: `failed_write` is the one table in this schema with no
-- immutability trigger (`0024` decision 4), deliberately, so that `0026` can
-- stamp it.
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

-- 4.5b's helper: `insufficient_privilege` IS 42501, so a state alone cannot tell
-- a role refusal from a location wall or from a row that is not ours.
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

-- 4e-ii-a's mirror: a call that must SUCCEED, recorded rather than fatal.
create function public.chk_succeeds(p_label text, p_sql text, p_detail text default '')
returns void language plpgsql as $$
begin
  execute p_sql;
  perform public.chk(p_label, true, p_detail);
exception when others then
  perform public.chk(p_label, false, 'RAISED ' || sqlstate || ': ' || sqlerrm);
end;
$$;
grant execute on function public.chk_succeeds(text, text, text) to authenticated;

-- ---- the calls under test, as text ------------------------------------------
create or replace function public._rep(p_fw uuid)
returns text language sql as $$
  select format('select public.replay_failed_write(%L::uuid)', p_fw)
$$;
grant execute on function public._rep(uuid) to authenticated;

create or replace function public._rs(p_id uuid, p_loc uuid, p_lines jsonb,
                             p_at timestamptz default null,
                             p_off boolean default false,
                             p_replay uuid default null)
returns text language sql as $$
  select format('select public.record_sale(%L::uuid, %L::uuid, %L::jsonb, '
                '%L::timestamptz, %L::boolean, %L::uuid)',
                p_id, p_loc, p_lines, p_at, p_off, p_replay)
$$;
grant execute on function
  public._rs(uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;

-- ---- line builders, at the signatures 0016/0018/0019/0020 fixed -------------
create or replace function public._pl(p_variant uuid, p_qty numeric,
                             p_price numeric default 4.00,
                             p_expiry date default null)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_net_per_base', p_price, 'expiry_date', p_expiry)))
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

create or replace function public._wl(p_variant uuid, p_qty numeric,
                             p_price numeric default 10.00,
                             p_reason text default 'caducado',
                             p_unit text default null)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty,
           'unit_price_gross_per_base', p_price, 'reason', p_reason,
           'qty_display_unit', p_unit)))
$$;
grant execute on function
  public._wl(uuid, numeric, numeric, text, text) to authenticated;

create or replace function public._tl(p_variant uuid, p_qty numeric)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty))
$$;
grant execute on function public._tl(uuid, numeric) to authenticated;

-- ---- payloads, in 0024 decision 5's shape: the ORIGINAL CALL'S ARGUMENTS ----
-- ⚠️ NEW NAMES RATHER THAN A NEW ARITY OF `_pay`. 0025's note, followed: a
-- different arity would not replace 0024's helper, it would sit BESIDE it and
-- make a short call ambiguous rather than wrong. These three take every argument
-- explicitly for the same reason.
create or replace function public._pload(p_loc uuid, p_lines jsonb,
                             p_at timestamptz, p_off boolean)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'location_id', p_loc, 'lines', p_lines,
           'occurred_at', p_at, 'recorded_offline', p_off))
$$;
grant execute on function
  public._pload(uuid, jsonb, timestamptz, boolean) to authenticated;

create or replace function public._pload_p(p_loc uuid, p_prov uuid,
                             p_lines jsonb, p_at timestamptz, p_off boolean)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'location_id', p_loc, 'provider_id', p_prov, 'lines', p_lines,
           'occurred_at', p_at, 'recorded_offline', p_off))
$$;
grant execute on function
  public._pload_p(uuid, uuid, jsonb, timestamptz, boolean) to authenticated;

create or replace function public._pload_t(p_from uuid, p_to uuid,
                             p_lines jsonb, p_at timestamptz, p_off boolean)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'from_location_id', p_from, 'to_location_id', p_to, 'lines', p_lines,
           'occurred_at', p_at, 'recorded_offline', p_off))
$$;
grant execute on function
  public._pload_t(uuid, uuid, jsonb, timestamptz, boolean) to authenticated;

-- ---- readers ----------------------------------------------------------------
create or replace function public._bal(p_loc uuid, p_var uuid)
returns numeric language sql stable as $$
  select coalesce(sum(bb.remaining_base), 0)
    from public.batch_balance bb
   where bb.location_id = p_loc and bb.variant_id = p_var
$$;

-- What the movements naming one dead letter add up to, and how many there are.
-- After a replay the first MUST be zero — 0026 decision 10 checks it in the
-- function, and this is the suite checking the check.
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

-- How many lots exist for one variant at one store, and how many of them were
-- INVENTED rather than received. The second is decision 1's whole subject.
create or replace function public._lots(p_loc uuid, p_var uuid)
returns integer language sql stable as $$
  select count(*)::integer from public.stock_batch sb
   where sb.location_id = p_loc and sb.variant_id = p_var
$$;
create or replace function public._adjlots(p_loc uuid, p_var uuid)
returns integer language sql stable as $$
  select count(*)::integer from public.stock_batch sb
   where sb.location_id = p_loc and sb.variant_id = p_var
     and sb.origin = 'adjustment'
$$;

create or replace function public._occ(p_kind text, p_id uuid)
returns timestamptz language plpgsql stable as $$
declare v timestamptz;
begin
  if p_kind = 'sale' then
    select s.occurred_at into v from public.sale s where s.id = p_id;
  elsif p_kind = 'purchase' then
    select p.occurred_at into v from public.purchase p where p.id = p_id;
  else
    select w.occurred_at into v from public.waste w where w.id = p_id;
  end if;
  return v;
end;
$$;

create or replace function public._mark(p_kind text, p_id uuid)
returns uuid language plpgsql stable as $$
declare v uuid;
begin
  if p_kind = 'sale' then
    select s.replay_of_failed_write_id into v from public.sale s where s.id = p_id;
  elsif p_kind = 'purchase' then
    select p.replay_of_failed_write_id into v from public.purchase p where p.id = p_id;
  else
    select w.replay_of_failed_write_id into v from public.waste w where w.id = p_id;
  end if;
  return v;
end;
$$;

-- The §2.10 invariant, over one variant: what the movements say against what the
-- projection says. A replay writes to both sides of it.
create or replace function public._drift()
returns integer language sql stable as $$
  select count(*)::integer
    from (
      select sm.batch_id, sum(sm.qty_base) as moved
        from public.stock_movement sm group by sm.batch_id
    ) m
    join public.batch_balance bb on bb.batch_id = m.batch_id
   where bb.remaining_base <> m.moved
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
-- The cashier holds BOTH locations, so every refusal in section 2 is the role
-- fence and never the location wall.
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, l.id
  from workspace_member wm, public.location l
 where wm.user_id = :cashier_a and l.workspace_id = :'ws_a';

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset
insert into product_family (workspace_id, name) values (:'ws_b', 'Abarrotes B');
select id as fam_b from product_family where workspace_id = :'ws_b' \gset

-- ⚠️ `Arroz` CARRIES A REAL TAX RATE. §2.10's replay row asks for the sale back
-- "with its full revenue", and a zero-rated line cannot tell a tax split that
-- survived the replay from one that was never computed.
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam', 'Arroz',    'pza','pza','pza','pza', 0.1600),  -- §2.10's row
  (:'ws_a', :'fam', 'Frijol',   'pza','pza','pza','pza', 0.0000),  -- TWO lots
  (:'ws_a', :'fam', 'Azucar',   'pza','pza','pza','pza', 0.0000),  -- enforcement
  (:'ws_a', :'fam', 'Cafe',     'pza','pza','pza','pza', 0.0000),  -- purchase
  (:'ws_a', :'fam', 'Aceite',   'pza','pza','pza','pza', 0.0000),  -- transfer
  (:'ws_a', :'fam', 'Harina',   'pza','pza','pza','pza', 0.0000),  -- waste
  (:'ws_a', :'fam', 'Sal',      'pza','pza','pza','pza', 0.0000),  -- ts: offline old
  (:'ws_a', :'fam', 'Atun',     'pza','pza','pza','pza', 0.0000),  -- ts: offline new
  (:'ws_a', :'fam', 'Leche',    'pza','pza','pza','pza', 0.0000),  -- ts: online
  (:'ws_a', :'fam', 'Galleta',  'pza','pza','pza','pza', 0.0000),  -- ts: 2099
  (:'ws_a', :'fam', 'Chile',    'pza','pza','pza','pza', 0.0000),  -- the refusals
  (:'ws_a', :'fam', 'Pan',      'pza','pza','pza','pza', 0.0000),  -- the fence pair
  (:'ws_a', :'fam', 'Tortilla', 'pza','pza','pza','pza', 0.0000),  -- the late retry
  (:'ws_a', :'fam', 'Nopal',    'pza','pza','pza','pza', 0.0000);  -- the lying payload

select id as var_sale from product_variant where workspace_id=:'ws_a' and name='Arroz'    \gset
select id as var_lots from product_variant where workspace_id=:'ws_a' and name='Frijol'   \gset
select id as var_enf  from product_variant where workspace_id=:'ws_a' and name='Azucar'   \gset
select id as var_pur  from product_variant where workspace_id=:'ws_a' and name='Cafe'     \gset
select id as var_trf  from product_variant where workspace_id=:'ws_a' and name='Aceite'   \gset
select id as var_wst  from product_variant where workspace_id=:'ws_a' and name='Harina'   \gset
select id as var_ts1  from product_variant where workspace_id=:'ws_a' and name='Sal'      \gset
select id as var_ts2  from product_variant where workspace_id=:'ws_a' and name='Atun'     \gset
select id as var_ts3  from product_variant where workspace_id=:'ws_a' and name='Leche'    \gset
select id as var_ts4  from product_variant where workspace_id=:'ws_a' and name='Galleta'  \gset
select id as var_bad  from product_variant where workspace_id=:'ws_a' and name='Chile'    \gset
select id as var_fen  from product_variant where workspace_id=:'ws_a' and name='Pan'      \gset
select id as var_late from product_variant where workspace_id=:'ws_a' and name='Tortilla' \gset
select id as var_lie  from product_variant where workspace_id=:'ws_a' and name='Nopal'    \gset

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_b', :'fam_b', 'Arroz B', 'pza','pza','pza','pza', 0.0000);
select id as var_b from product_variant where workspace_id=:'ws_b' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset
select id as prov_b from provider where workspace_id = :'ws_b' and is_generic \gset

-- ⚠️ ENFORCEMENT ON, FOR ONE VARIANT ONLY. Section 7 is the compensate-then-
-- re-run order, and `0017`'s check is the only thing in this database that can
-- see it. Everything else must stay unenforced, or the fixture would start
-- refusing writes for a reason no check is about.
update product_variant set enforce_stock = true where id = :'var_enf';

-- ---- the stock every dead letter is about ----------------------------------
\set pur_sale '''dddd0026-0000-0000-0000-000000000001'''
\set pur_lt1  '''dddd0026-0000-0000-0000-000000000002'''
\set pur_lt2  '''dddd0026-0000-0000-0000-000000000003'''
\set pur_enf  '''dddd0026-0000-0000-0000-000000000004'''
\set pur_trf  '''dddd0026-0000-0000-0000-000000000005'''
\set pur_wst  '''dddd0026-0000-0000-0000-000000000006'''
\set pur_ts1  '''dddd0026-0000-0000-0000-000000000007'''
\set pur_ts2  '''dddd0026-0000-0000-0000-000000000008'''
\set pur_ts3  '''dddd0026-0000-0000-0000-000000000009'''
\set pur_ts4  '''dddd0026-0000-0000-0000-00000000000a'''
\set pur_bad  '''dddd0026-0000-0000-0000-00000000000b'''
\set pur_fen  '''dddd0026-0000-0000-0000-00000000000c'''
\set pur_late '''dddd0026-0000-0000-0000-00000000000d'''
\set pur_lie  '''dddd0026-0000-0000-0000-00000000000e'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select record_purchase(:pur_sale::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_sale'::uuid, 10, 2.00)) as r \gset

-- TWO lots, oldest expiry first, so a sale of 15 spans both and the compensation
-- has to put the units back where they came from rather than in one place.
select record_purchase(:pur_lt1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_lots'::uuid, 10, 3.00, '2026-10-01')) as r \gset
select record_purchase(:pur_lt2::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_lots'::uuid, 10, 5.00, '2026-11-01')) as r \gset

select record_purchase(:pur_enf::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_enf'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_trf::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_trf'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_wst::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_wst'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_ts1::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_ts1'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_ts2::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_ts2'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_ts3::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_ts3'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_ts4::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_ts4'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_bad::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_bad'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_fen::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_fen'::uuid,  10, 2.00)) as r \gset
select record_purchase(:pur_late::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_late'::uuid, 10, 2.00)) as r \gset
select record_purchase(:pur_lie::uuid,  :'loc_1'::uuid, :'prov_a'::uuid,
         public._pl(:'var_lie'::uuid,  10, 2.00)) as r \gset
commit;

-- ---- the dead letters, reported by the CASHIER whose write was rejected -----
-- §2.6's exception is about exactly this person: the commonest reason a write is
-- permanently rejected is that their location access was wrong, so
-- `record_failed_write` is granted with no role fence (`0024`). Replay is not.
\set dl_sale '''fbfb0026-0000-0000-0000-000000000001'''
\set dl_lots '''fbfb0026-0000-0000-0000-000000000002'''
\set dl_enf  '''fbfb0026-0000-0000-0000-000000000003'''
\set dl_pur  '''fbfb0026-0000-0000-0000-000000000004'''
\set dl_trf  '''fbfb0026-0000-0000-0000-000000000005'''
\set dl_wst  '''fbfb0026-0000-0000-0000-000000000006'''
\set dl_ts1  '''fbfb0026-0000-0000-0000-000000000007'''
\set dl_ts2  '''fbfb0026-0000-0000-0000-000000000008'''
\set dl_ts3  '''fbfb0026-0000-0000-0000-000000000009'''
\set dl_ts4  '''fbfb0026-0000-0000-0000-00000000000a'''
\set dl_nols '''fbfb0026-0000-0000-0000-00000000000b'''
\set dl_bts  '''fbfb0026-0000-0000-0000-00000000000c'''
\set dl_nopr '''fbfb0026-0000-0000-0000-00000000000d'''
\set dl_fen  '''fbfb0026-0000-0000-0000-00000000000e'''
\set dl_late '''fbfb0026-0000-0000-0000-00000000000f'''
\set dl_badp '''fbfb0026-0000-0000-0000-000000000010'''
\set dl_badt '''fbfb0026-0000-0000-0000-000000000011'''
\set dl_b    '''fbfb0026-0000-0000-0000-000000000012'''
\set dl_lie  '''fbfb0026-0000-0000-0000-000000000013'''
\set dl_ghost '''fbfb0026-0000-0000-0000-0000000000ff'''

-- ⚠️ ONE ANCHOR, FIXED TO THE SECOND, AND EVERY TIMESTAMP IN THIS FILE IS
-- RELATIVE TO IT. Section 11 compares a computed `occurred_at` to an EXACT
-- expected value, and two calls to `now()` a fixture apart differ by
-- milliseconds — which is the difference between a check that tests the clamp
-- and a check that tests how fast psql runs. Five days back puts every replayed
-- document outside the 72-hour clamp AND outside any void window, which is what
-- makes the four cases in section 11 distinguishable from each other.
select (date_trunc('second', now()) - interval '5 days') as anchor \gset

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;

-- §2.10's row: an ordinary rejected sale of 3, taken offline two hours before it
-- was reported. Downgraded by 0024, and section 3 puts it back.
select record_failed_write(:dl_sale::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_sale'::uuid, 3, 10.00),
                       :'anchor'::timestamptz - interval '2 hours', true),
         '42501', 'membership changed mid-flush') as r \gset

-- 15 across two lots — the multi-lot case §2.6's singular column could not
-- describe and a single-lot compensation cannot distinguish.
select record_failed_write(:dl_lots::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_lots'::uuid, 15, 8.00),
                       :'anchor'::timestamptz - interval '2 hours', true),
         '42501') as r \gset

-- The whole shelf, on the one variant that enforces. Section 7.
select record_failed_write(:dl_enf::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_enf'::uuid, 10, 6.00),
                       :'anchor'::timestamptz - interval '2 hours', true),
         '42501') as r \gset

-- A rejected DELIVERY. `0024` amendment 2: no downgrade, the stock is on the
-- shelf with a manager holding the note. Section 8 replays it anyway.
select record_failed_write(:dl_pur::uuid, 'purchase', :'ws_a'::uuid,
         public._pload_p(:'loc_1'::uuid, :'prov_a'::uuid,
                         public._pl(:'var_pur'::uuid, 12, 4.00),
                         :'anchor'::timestamptz - interval '2 hours', true),
         '42501') as r \gset

-- A rejected TRANSFER. No document (§2.4), no downgrade, and nothing but
-- `failed_write.replayed_at` will ever say it was recovered. Section 9 of 0026's
-- header; section 10 here.
select record_failed_write(:dl_trf::uuid, 'transfer', :'ws_a'::uuid,
         public._pload_t(:'loc_1'::uuid, :'loc_2'::uuid,
                         public._tl(:'var_trf'::uuid, 4),
                         :'anchor'::timestamptz - interval '2 hours', true),
         '42501') as r \gset

-- A rejected WASTE — the second kind `0024` downgrades.
select record_failed_write(:dl_wst::uuid, 'waste', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._wl(:'var_wst'::uuid, 5, 9.00),
                       :'anchor'::timestamptz - interval '2 hours', true),
         '42501') as r \gset

-- ---- section 11's four timestamp cases -------------------------------------
-- ts1: OFFLINE, and the payload is twenty days older than the report. The clamp
--      the original call would have applied is [failed_at - 72h, failed_at].
select record_failed_write(:dl_ts1::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_ts1'::uuid, 2, 5.00),
                       :'anchor'::timestamptz - interval '20 days', true),
         '42501') as r \gset
-- ts2: OFFLINE and recent. Preserved verbatim — the case the exemption exists for.
select record_failed_write(:dl_ts2::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_ts2'::uuid, 2, 5.00),
                       :'anchor'::timestamptz - interval '6 hours', true),
         '42501') as r \gset
-- ts3: ONLINE, with an old client time the server would have OVERRIDDEN.
select record_failed_write(:dl_ts3::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_ts3'::uuid, 2, 5.00),
                       :'anchor'::timestamptz - interval '20 days', false),
         '42501') as r \gset
-- ts4: a till whose clock says 2099. `0024` stores it without complaint, because
--      a malformed payload is what that table exists to keep.
select record_failed_write(:dl_ts4::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_ts4'::uuid, 2, 5.00),
                       '2099-01-01T00:00:00Z'::timestamptz, true),
         '42501') as r \gset

-- ---- the refusals ----------------------------------------------------------
-- No lines at all.
select record_failed_write(:dl_nols::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, '[]'::jsonb, :'anchor'::timestamptz - interval '1 hour', true),
         '42501') as r \gset
-- An `occurred_at` that is not a timestamp.
select record_failed_write(:dl_bts::uuid, 'sale', :'ws_a'::uuid,
         jsonb_build_object('location_id', :'loc_1'::uuid,
                            'lines', public._sl(:'var_bad'::uuid, 1, 5.00),
                            'occurred_at', 'ayer',
                            'recorded_offline', true),
         '42501') as r \gset
-- A delivery with no provider in the payload.
select record_failed_write(:dl_nopr::uuid, 'purchase', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._pl(:'var_bad'::uuid, 3, 4.00),
                       :'anchor'::timestamptz - interval '1 hour', true),
         '42501') as r \gset
-- ⚠️ A LINE WITH NO PRICE. `record_failed_write`'s downgrade needs only the
-- variant and the quantity, so this row DOES get a downgrade — and `record_sale`
-- refuses it. That makes it the one dead letter that can prove "or nothing
-- moves": the compensation is written and then rolled back with the re-run.
select record_failed_write(:dl_badp::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid,
                       jsonb_build_array(jsonb_build_object(
                         'variant_id', :'var_bad'::uuid, 'qty_display', 2)),
                       :'anchor'::timestamptz - interval '1 hour', true),
         '42501') as r \gset
-- A transfer that names only one end.
select record_failed_write(:dl_badt::uuid, 'transfer', :'ws_a'::uuid,
         jsonb_build_object('from_location_id', :'loc_1'::uuid,
                            'lines', public._tl(:'var_bad'::uuid, 1),
                            'recorded_offline', true),
         '42501') as r \gset

-- ⚠️ A PAYLOAD THAT LIES, IN THE TWO PLACES `0026` READS THE ROW INSTEAD.
-- Section 13's subject, and both halves of it were found by falsification: a
-- dispatch on `payload->>'kind'` and a location read from `payload` BOTH turned
-- nothing red until this row existed, because every other dead letter here has a
-- payload that agrees with its row. The `location_id` ARGUMENT wins at capture
-- (`0024`), so the row says loc_1 and the payload says loc_2.
select record_failed_write(:dl_lie::uuid, 'sale', :'ws_a'::uuid,
         jsonb_build_object('location_id', :'loc_2'::uuid,
                            'kind', 'waste',
                            'lines', public._sl(:'var_lie'::uuid, 3, 5.00),
                            'occurred_at', :'anchor'::timestamptz - interval '2 hours',
                            'recorded_offline', true),
         '42501', null, :'loc_1'::uuid) as r \gset

-- The fence pair's row, and the late-retry row.
select record_failed_write(:dl_fen::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_fen'::uuid, 2, 5.00),
                       :'anchor'::timestamptz - interval '2 hours', true),
         '42501') as r \gset
select record_failed_write(:dl_late::uuid, 'sale', :'ws_a'::uuid,
         public._pload(:'loc_1'::uuid, public._sl(:'var_late'::uuid, 4, 7.00),
                       :'anchor'::timestamptz - interval '2 hours', true),
         '42501') as r \gset
commit;

-- Workspace B's own dead letter, for the tenancy check.
begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
select record_failed_write(:dl_b::uuid, 'sale', :'ws_b'::uuid,
         public._pload(:'loc_b'::uuid, public._sl(:'var_b'::uuid, 1, 5.00),
                       :'anchor'::timestamptz - interval '2 hours', true),
         '42501') as r \gset
commit;

-- ⚠️ THE ROWS ARE AGED HERE, AS SUPERUSER, AND THE HEADER SAYS WHY.
-- `record_failed_write` sets `failed_at` to `now()`, and section 11's whole
-- subject is a clamp anchored to it. This is legal on this table and on no other
-- in the schema: `failed_write` is the one document-shaped table with no
-- immutability trigger (`0024` decision 4), deliberately, so that `0026` can
-- stamp it.
update failed_write set failed_at = :'anchor'::timestamptz;

-- ⚠️ ASSERTED RATHER THAN ASSUMED. A suite's fixture is unasserted code
-- (4.5c-i's F15), and every timestamp claim in section 11 rests on this UPDATE
-- having taken.
select chk('0.1 the fixture aged every dead letter to the anchor: nineteen dead letters, all failed_at = the anchor, '
           'five days old',
           (select count(*) = 19 from failed_write
             where failed_at = :'anchor'::timestamptz),
           format('aged=%s of %s',
                  (select count(*) from failed_write
                    where failed_at = :'anchor'::timestamptz),
                  (select count(*) from failed_write)));


-- ============================================================================
-- 1. The function, the columns and the grants  (ADR-035 §2.7, and 3.1's finding)
-- ============================================================================

select chk('1.1 replay_failed_write(uuid) exists, is SECURITY DEFINER and pins '
           'its search_path — it calls four other definer functions and a '
           'mutable path is how one of them gets replaced',
           (select count(*) = 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'replay_failed_write'
              and p.prosecdef
              and array_to_string(p.proconfig, ',') like '%search_path=%'),
           (select coalesce(array_to_string(p.proconfig, ','), 'NO proconfig')
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='replay_failed_write'));

select chk('1.2 ⚠️ EXECUTE is NOT held by PUBLIC or anon. Postgres grants it to '
           'PUBLIC by default, so a migration that only GRANTs hands the whole '
           'failure path to anon and no line of the file says so — 3.1''s '
           'finding, in its fifth place',
           not has_function_privilege('anon', 'public.replay_failed_write(uuid)',
                                      'execute'),
           'anon execute');

select chk('1.3 …and authenticated DOES hold it. The fence is in the body, '
           'because the grant cannot say "owner of the workspace this row '
           'belongs to" — the workspace is not known until the row is read',
           has_function_privilege('authenticated',
                                  'public.replay_failed_write(uuid)', 'execute'),
           'authenticated execute');

select chk('1.4 the stamp is three columns on failed_write — replayed_at, '
           'replayed_by, replay_result',
           (select count(*) = 3 from information_schema.columns
             where table_schema='public' and table_name='failed_write'
               and column_name in ('replayed_at','replayed_by','replay_result')),
           'stamp columns');

select chk('1.5 replayed_by references auth.users, so a stamp names a real '
           'person rather than a uuid nobody can be asked about',
           (select count(*) = 1 from pg_constraint c
             where c.conrelid = 'public.failed_write'::regclass
               and c.contype = 'f'
               and c.confrelid = 'auth.users'::regclass
               and 'replayed_by' = any (
                     select a.attname from pg_attribute a
                      where a.attrelid = c.conrelid
                        and a.attnum = any (c.conkey))),
           'replayed_by fk');

select chk('1.6 the unreplayed index is PARTIAL — §2.10 asks the pile what is '
           'still UNRECOVERED, which is the predicate, not its complement',
           (select count(*) = 1 from pg_indexes
             where schemaname='public' and indexname='failed_write_unreplayed_idx'
               and indexdef like '%WHERE (replayed_at IS NULL)%'),
           (select coalesce(max(indexdef), 'missing') from pg_indexes
             where schemaname='public'
               and indexname='failed_write_unreplayed_idx'));

-- ⚠️ RUN AS SUPERUSER ON PURPOSE. This is a CONSTRAINT check, not an RLS one,
-- and no client holds UPDATE on this table anyway — the only way to reach the
-- constraint from outside `0026` is from here.
select chk_raises('1.7 a HALF stamp is refused — a time with no author is a '
                  'replay nobody can be asked about',
                  format('update public.failed_write set replayed_at = now() '
                         'where id = %L', :dl_late),
                  '23514');

select chk_raises('1.8 …and so is a result with no time',
                  format('update public.failed_write set replay_result = '
                         '''{}''::jsonb where id = %L', :dl_late),
                  '23514');

select chk('1.9 nothing is stamped yet — every claim below about a stamp is '
           'about a column that starts null on all eighteen rows',
           (select count(*) = 0 from failed_write where replayed_at is not null),
           format('stamped=%s of %s',
                  (select count(*) from failed_write where replayed_at is not null),
                  (select count(*) from failed_write)));


-- ============================================================================
-- 2. The fence, and who may not even see the row  (decision 4; §2.6, §2.7)
-- ============================================================================

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk_raises_like('2.1 a CASHIER is refused — TD003, the role refusal, and '
                       'not a location wall. §2.7 puts the dead-letter pile '
                       'behind a role because it is denominated in unrecorded '
                       'revenue',
                       public._rep(:dl_fen::uuid), 'TD003', 'only an owner');
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
-- ⚠️ THE HALF THAT MAKES THIS A DECISION AND NOT A COPY. `0025` fences the
-- replay MARKER at manager; `0026` fences the ORCHESTRATOR one notch higher,
-- because §2.6's replayer "has already reviewed the dead-letter row" and `0024`
-- decision 8 makes that review owner-only. A manager-fenced replay would be a
-- decision taken on a row the decider cannot read.
select chk_raises_like('2.2 ⚠️ a MANAGER is refused too, which is TIGHTER than '
                       'the marker''s own fence (0025 decision 3) and is 0026 '
                       'decision 4 — a manager may not READ failed_write (0024 '
                       'decision 8), so a manager-triggered replay would be a '
                       'decision taken on a row the decider cannot see',
                       public._rep(:dl_fen::uuid), 'TD003', 'only an owner');
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
-- The pair half. Without it 2.1 and 2.2 would pass against a function that
-- refuses everybody.
select chk_succeeds('2.3 ⚠️ …and the OWNER succeeds on the same row, the same '
                    'call, the same second. Nothing but the role explains the '
                    'difference between this and 2.1/2.2',
                    public._rep(:dl_fen::uuid));
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
select chk_raises_like('2.4 ⚠️ the owner of workspace B gets 42501 NOT FOUND on '
                       'workspace A''s dead letter — not TD003, which would '
                       'confirm the id exists. 0021''s reasoning: the id is a '
                       'CLIENT uuid and failed_write is one table across every '
                       'tenant, so a caller must not be able to probe it',
                       public._rep(:dl_sale::uuid), '42501', 'not found or not accessible');
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk_raises_like('2.5 …and an id that exists NOWHERE gets the identical '
                       'refusal, which is what makes 2.4 a non-answer rather '
                       'than a different answer',
                       public._rep(:dl_ghost::uuid), '42501', 'not found or not accessible');
select chk_raises('2.6 a null failed_write_id is 22023 — replay is one row at a '
                  'time (§2.6), so there is no "replay everything" spelling',
                  'select public.replay_failed_write(null::uuid)', '22023');
commit;

select chk('2.7 the refused calls left NOTHING behind — no stamp on the two '
           'rows they named, and the fence pair''s row is the only one replayed '
           'so far',
           (select count(*) = 1 from failed_write where replayed_at is not null)
           and (select replayed_at is not null from failed_write where id = :dl_fen)
           and (select replayed_at is null from failed_write where id = :dl_sale),
           format('stamped=%s', (select count(*) from failed_write
                                  where replayed_at is not null)));

select chk('2.8 …and the owner''s successful replay stamped ITS row with the '
           'owner, not with the cashier who reported it',
           (select replayed_by = :owner_a::uuid and reported_by = :cashier_a::uuid
              from failed_write where id = :dl_fen),
           format('replayed_by=%s reported_by=%s',
                  (select replayed_by from failed_write where id = :dl_fen),
                  (select reported_by from failed_write where id = :dl_fen)));


-- ============================================================================
-- 3. §2.10's REPLAY ROW, END TO END — dead letter, downgrade, replay
-- ============================================================================
-- The state before, asserted rather than assumed: 10 units bought, 3 sold into a
-- rejected write, 3 taken off the shelf by the downgrade.

select chk('3.1 before the replay the shelf is 7 of 10 — the downgrade already '
           'took the three units the customer walked out with (0024)',
           public._bal(:'loc_1'::uuid, :'var_sale'::uuid) = 7,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_sale'::uuid)));

select chk('3.2 …and it did that with movements that NAME the dead letter, '
           'netting −3. That link is what makes the downgrade reversible, and '
           '§2.6 calls it not optional',
           public._fwn(:dl_sale::uuid) = 1 and public._fwq(:dl_sale::uuid) = -3,
           format('movements=%s net=%s', public._fwn(:dl_sale::uuid),
                  public._fwq(:dl_sale::uuid)));

select chk('3.3 ⚠️ and NO sale document exists yet. The whole point of a dead '
           'letter is that the ledger is internally consistent and externally '
           'wrong: stock is right, revenue is missing',
           (select count(*) = 0 from sale where id = :dl_sale),
           'no sale yet');

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.replay_failed_write(:dl_sale::uuid) as rep_sale \gset
commit;

select chk('3.4 the replay reports ONE compensated movement and does not claim '
           'to be a repeat',
           (:'rep_sale'::jsonb->>'compensated_movements')::int = 1
           and (:'rep_sale'::jsonb->>'already_replayed')::boolean is false,
           :'rep_sale');

select chk('3.5 ⚠️⚠️ THE SALE IS BACK, WITH ITS REVENUE AND ITS TAX SPLIT. This '
           'is what a downgrade cannot carry (§2.6: "stock stays true; margin '
           'goes quiet") and it is the half of §2.10''s replay row that a '
           'balance check cannot see',
           (select total_net > 0 and total_tax > 0
                   and round(total_net + total_tax, 2) = 30.00
              from sale where id = :dl_sale),
           (select format('net=%s tax=%s', total_net, total_tax)
              from sale where id = :dl_sale));

select chk('3.6 …under the ORIGINAL client uuid (§2.6), which is what makes the '
           'replay safe to retry and what ties the document to the dead letter '
           'without a second key',
           (select count(*) = 1 from sale where id = :dl_sale),
           'one sale, original id');

select chk('3.7 …carrying the marker 0025 added, pointed at the dead letter it '
           'recovers. Non-null is not the claim; naming THIS row is',
           public._mark('sale', :dl_sale::uuid) = :dl_sale::uuid,
           format('marker=%s', public._mark('sale', :dl_sale::uuid)));

select chk('3.8 the shelf is 7 — the same figure as 3.1, which is the point: '
           'the downgrade was a stand-in for this sale, so undoing it and '
           'recording the sale must be a no-op on quantity',
           public._bal(:'loc_1'::uuid, :'var_sale'::uuid) = 7,
           format('balance=%s', public._bal(:'loc_1'::uuid, :'var_sale'::uuid)));

select chk('3.9 ⚠️⚠️ AND THE UNITS WENT BACK WHERE THEY CAME FROM. One lot '
           'before, one lot after, and none of them invented: a positive '
           'adjust_stock_delta would have opened a ZERO-COST lot for the three '
           'units and left it standing beside the original (0026 decision 1). '
           'The balance would have been identical',
           public._lots(:'loc_1'::uuid, :'var_sale'::uuid) = 1
           and public._adjlots(:'loc_1'::uuid, :'var_sale'::uuid) = 0,
           format('lots=%s adjustment_lots=%s',
                  public._lots(:'loc_1'::uuid, :'var_sale'::uuid),
                  public._adjlots(:'loc_1'::uuid, :'var_sale'::uuid)));

select chk('3.10 …so the replayed sale''s own movements carry the REAL cost of '
           'the lot the delivery opened, which is the batch attribution §2.9 '
           'divides revenue against',
           (select count(*) = 1 and min(sm.unit_cost_net_per_base) = 2.00
              from stock_movement sm where sm.sale_id = :dl_sale),
           (select format('movements=%s cost=%s', count(*),
                          min(unit_cost_net_per_base))
              from stock_movement sm where sm.sale_id = :dl_sale));

select chk('3.11 the movements naming the dead letter now net to ZERO across '
           'two rows — the downgrade and its compensation, a closed pair. This '
           'is 0026 decision 10''s post-condition, read from outside',
           public._fwn(:dl_sale::uuid) = 2 and public._fwq(:dl_sale::uuid) = 0,
           format('movements=%s net=%s', public._fwn(:dl_sale::uuid),
                  public._fwq(:dl_sale::uuid)));

select chk('3.12 the compensation NAMES the movement it cancels, on the same '
           'batch — 0004''s reversal_of_movement_id, which is also what makes a '
           'second compensation impossible rather than merely unlikely',
           (select count(*) = 1 from stock_movement c
             join stock_movement d on d.id = c.reversal_of_movement_id
            where c.failed_write_id = :dl_sale
              and d.failed_write_id = :dl_sale
              and c.batch_id = d.batch_id
              and c.qty_base = -d.qty_base
              and c.unit_cost_net_per_base = d.unit_cost_net_per_base),
           'reversal pair');

select chk('3.13 ⚠️ …and it is DATED WITH THE MOVEMENT IT CANCELS, not with '
           'now(). 0026 decision 2: a downgrade is not an event, it is a '
           'stand-in for one, so a compensation dated today would say stock came '
           'back today that never left today — a hole and a bump in every read '
           'that slices by occurred_at',
           (select c.occurred_at = d.occurred_at and c.recorded_at > d.recorded_at
              from stock_movement c
              join stock_movement d on d.id = c.reversal_of_movement_id
             where c.failed_write_id = :dl_sale),
           (select format('comp=%s down=%s', c.occurred_at, d.occurred_at)
              from stock_movement c
              join stock_movement d on d.id = c.reversal_of_movement_id
             where c.failed_write_id = :dl_sale));

select chk('3.14 the dead letter is stamped — replayed_at set, replayed_by the '
           'owner, and replay_result carrying what the recorder returned',
           (select replayed_at is not null and replayed_by = :owner_a::uuid
                   and replay_result->>'sale_id' is not null
              from failed_write where id = :dl_sale),
           (select format('at=%s by=%s result=%s', replayed_at, replayed_by,
                          left(replay_result::text, 60))
              from failed_write where id = :dl_sale));

select chk('3.16 ⚠️⚠️ THE REPLAYED SALE IS NOT FLAGGED recorded_offline, THOUGH '
           'THE PAYLOAD SAID IT WAS. 0026 decision 6, and the check exists '
           'because falsification found nothing watching it: passing '
           'recorded_offline => true is the shortcut 0025 refused, it writes a '
           'device-queued flag on a server-side write, and — the part that '
           'matters — it SILENTLY DISABLES 0017, which is the only thing that '
           'can see section 7''s ordering at all',
           (select recorded_offline is false from sale where id = :dl_sale)
           and (select payload->>'recorded_offline' = 'true'
                  from failed_write where id = :dl_sale),
           (select format('sale=%s payload=%s',
                          (select recorded_offline from sale where id = :dl_sale),
                          (select payload->>'recorded_offline' from failed_write
                            where id = :dl_sale))));

select chk('3.15 and §2.10''s standing invariant still holds: every batch''s '
           'projected balance equals the sum of its movements. A replay writes '
           'to both sides of it',
           public._drift() = 0, format('drifting batches=%s', public._drift()));


-- ============================================================================
-- 4. The timestamp is PRESERVED, and the void window reads it  (§2.6)
-- ============================================================================

select chk('4.1 ⚠️ the replayed sale is dated when the SALE happened, not when '
           'the recovery did. §2.6: without this "every recovered sale is '
           'silently re-dated to the moment of recovery, which is the precise '
           'harm manual replay was chosen to avoid"',
           public._occ('sale', :dl_sale::uuid) < now() - interval '4 days',
           format('occurred_at=%s now=%s', public._occ('sale', :dl_sale::uuid), now()));

select chk('4.2 …and recorded_at IS the moment of recovery. The two columns '
           'answer different questions and a replay is the one write where they '
           'are days apart',
           (select recorded_at > now() - interval '5 minutes'
                   and occurred_at < recorded_at - interval '4 days'
              from sale where id = :dl_sale),
           (select format('occurred=%s recorded=%s', occurred_at, recorded_at)
              from sale where id = :dl_sale));

-- ⚠️ THE DEMOTION IS 4.5c-i's FINDING, AND THIS IS THE FIRST TIME IT RUNS OVER A
-- DOCUMENT A REPLAY ACTUALLY WROTE. `0025`'s section 8 made the same claim about
-- documents it marked BY HAND through the recorders; nothing had ever been
-- replayed. The exemption fences STAFF, and a replayed document is always
-- created by an owner — who skips the window anyway — so the only person who can
-- ever stand in front of it is someone who was owner when the replay ran and is
-- staff when they try to void it. That is a demotion, and it is an ordinary
-- thing in a shop.
--
-- ⚠️ THE member_location ROWS ARE NOT OPTIONAL. `my_locations()` gives a manager
-- or owner every store and a staff member only their explicit rows, so a
-- demotion with no rows behind it would be refused by the LOCATION WALL and 4.3
-- would pass while asserting nothing about the window.
update workspace_member set role = 'staff'
 where user_id = :owner_a and workspace_id = :'ws_a';
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, l.id
  from workspace_member wm, public.location l
 where wm.user_id = :owner_a and l.workspace_id = :'ws_a';

select chk('4.3 the demotion took — the author of the replayed sale is now '
           'STAFF, holding both stores, which is the only way anyone can meet '
           'this window at all',
           (select wm.role = 'staff' from workspace_member wm
             where wm.workspace_id = :'ws_a' and wm.user_id = :owner_a)
           and (select count(*) = 2 from member_location ml
                 join workspace_member wm on wm.id = ml.member_id
                where wm.user_id = :owner_a),
           'demoted, both locations');

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk_raises_like('4.4 ⚠️⚠️ A DEMOTED STAFF MEMBER CANNOT SELF-SERVICE VOID '
                       'THE REPLAYED SALE. It is five days old, and 0025''s '
                       'exemption measures a replayed write''s window from '
                       'occurred_at whatever recorded_offline says — so it is '
                       'outside any window and in manager territory. This is the '
                       'exemption meeting a document that was really replayed, '
                       'rather than one marked by hand',
                       format('select public.void_transaction(''sale'', %L::uuid)',
                              :dl_sale),
                       'TD003', 'outside the 15 minute self-service window');
commit;

update workspace_member set role = 'owner'
 where user_id = :owner_a and workspace_id = :'ws_a';

select chk('4.5 …and the sale is still standing after the refusal, which is what '
           'makes 4.4 a fence check rather than a check about a void that '
           'happened to fail',
           (select count(*) = 0 from sale where reversal_of = :dl_sale),
           'no compensating document');


-- ============================================================================
-- 5. A replayed row replays ONCE  (decision 3)
-- ============================================================================

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.replay_failed_write(:dl_sale::uuid) as rep_again \gset
commit;

select chk('5.1 a second replay returns already_replayed rather than raising — '
           '0024 decision 7''s idempotency shape, because the second call of a '
           'manual operation is a re-read and not an error',
           (:'rep_again'::jsonb->>'already_replayed')::boolean is true
           and (:'rep_again'::jsonb->>'compensated_movements')::int = 0,
           :'rep_again');

select chk('5.2 ⚠️ …and it moved NOTHING. Still two movements naming the dead '
           'letter, still netting zero, still 7 on the shelf. A second '
           'compensation would have credited three units nobody ever removed',
           public._fwn(:dl_sale::uuid) = 2 and public._fwq(:dl_sale::uuid) = 0
           and public._bal(:'loc_1'::uuid, :'var_sale'::uuid) = 7,
           format('movements=%s net=%s balance=%s', public._fwn(:dl_sale::uuid),
                  public._fwq(:dl_sale::uuid),
                  public._bal(:'loc_1'::uuid, :'var_sale'::uuid)));

select chk('5.3 …and it did not re-stamp the row: the replayed_at reported back '
           'is the FIRST one, so a second call cannot quietly move the date a '
           '§2.10 report reads',
           (:'rep_again'::jsonb->>'replayed_at')::timestamptz
           = (select replayed_at from failed_write where id = :dl_sale),
           format('reported=%s stored=%s', :'rep_again'::jsonb->>'replayed_at',
                  (select replayed_at from failed_write where id = :dl_sale)));


-- ============================================================================
-- 6. TWO LOTS — the case a single-lot compensation cannot be told apart from
-- ============================================================================

select chk('6.1 the downgrade of a 15-unit sale spanned BOTH lots — two '
           'movements naming one dead letter, which is the shape §2.6''s '
           'singular adjustment_movement_id could not describe (0024 amendment 1)',
           public._fwn(:dl_lots::uuid) = 2 and public._fwq(:dl_lots::uuid) = -15,
           format('movements=%s net=%s', public._fwn(:dl_lots::uuid),
                  public._fwq(:dl_lots::uuid)));

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.replay_failed_write(:dl_lots::uuid) as rep_lots \gset
commit;

select chk('6.2 the replay compensated BOTH — a compensation that restored the '
           'total into one lot would have the same balance and the wrong cost '
           'history',
           (:'rep_lots'::jsonb->>'compensated_movements')::int = 2
           and public._fwn(:dl_lots::uuid) = 4
           and public._fwq(:dl_lots::uuid) = 0,
           format('compensated=%s movements=%s net=%s',
                  :'rep_lots'::jsonb->>'compensated_movements',
                  public._fwn(:dl_lots::uuid), public._fwq(:dl_lots::uuid)));

select chk('6.3 ⚠️⚠️ AND THE REPLAYED SALE RE-ALLOCATED FEFO ACROSS THE SAME TWO '
           'LOTS, at their own costs — 10 at 3.00 from the October lot and 5 at '
           '5.00 from the November one. This is the batch attribution §2.6 says '
           'replay exists to recover, and no balance check can see it',
           (select count(*) = 2 from stock_movement where sale_id = :dl_lots)
           and (select sum(-qty_base * unit_cost_net_per_base) = 55.00
                  from stock_movement where sale_id = :dl_lots),
           (select format('movements=%s cost=%s', count(*),
                          sum(-qty_base * unit_cost_net_per_base))
              from stock_movement where sale_id = :dl_lots));

select chk('6.4 …still two lots, none of them invented, and the shelf is 5',
           public._lots(:'loc_1'::uuid, :'var_lots'::uuid) = 2
           and public._adjlots(:'loc_1'::uuid, :'var_lots'::uuid) = 0
           and public._bal(:'loc_1'::uuid, :'var_lots'::uuid) = 5,
           format('lots=%s invented=%s balance=%s',
                  public._lots(:'loc_1'::uuid, :'var_lots'::uuid),
                  public._adjlots(:'loc_1'::uuid, :'var_lots'::uuid),
                  public._bal(:'loc_1'::uuid, :'var_lots'::uuid)));


-- ============================================================================
-- 7. COMPENSATE, THEN RE-RUN — and the order is what is under test  (decision 7)
-- ============================================================================
-- `enforce_stock` is on for this variant alone. The dead letter is the whole
-- shelf, so after the downgrade the balance is zero and `0017` refuses any sale
-- of it — including the one being recovered.

select chk('7.1 the shelf is EMPTY before the replay: 10 bought, 10 downgraded. '
           'That is the state §2.6''s ordering exists for',
           public._bal(:'loc_1'::uuid, :'var_enf'::uuid) = 0
           and public._fwq(:dl_enf::uuid) = -10,
           format('balance=%s downgraded=%s',
                  public._bal(:'loc_1'::uuid, :'var_enf'::uuid),
                  public._fwq(:dl_enf::uuid)));

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
-- ⚠️ THE PAIR HALF, AND IT IS WHAT MAKES 7.3 A CLAIM ABOUT THE ORDER. The
-- identical sale, against the identical shelf, WITHOUT the compensation in front
-- of it, is refused — so a replay that re-ran the call first would be refused in
-- exactly the case it exists to recover.
select chk_raises('7.2 ⚠️ the same sale made DIRECTLY against the short shelf is '
                  'refused TD002 — enforcement is live and the shelf really is '
                  'empty',
                  public._rs('a11ce026-0000-0000-0000-000000000001'::uuid,
                             :'loc_1'::uuid,
                             public._sl(:'var_enf'::uuid, 10, 6.00)),
                  'TD002');

select chk_succeeds('7.3 ⚠️⚠️ …and the REPLAY of the same sale SUCCEEDS, because '
                    'it restores the units before it asks for them. §2.6''s '
                    '"compensate, then re-run" is load-bearing and this is the '
                    'check that says so',
                    public._rep(:dl_enf::uuid));
commit;

select chk('7.4 the shelf is empty again — the sale that emptied it is now on '
           'the books, and the downgrade that stood in for it is gone',
           public._bal(:'loc_1'::uuid, :'var_enf'::uuid) = 0
           and public._fwq(:dl_enf::uuid) = 0
           and (select count(*) = 1 from sale where id = :dl_enf),
           format('balance=%s net=%s', public._bal(:'loc_1'::uuid, :'var_enf'::uuid),
                  public._fwq(:dl_enf::uuid)));

select chk('7.5 …and no lot was invented to make that possible, which is what a '
           'positive adjust_stock_delta would have done on a shelf at zero',
           public._adjlots(:'loc_1'::uuid, :'var_enf'::uuid) = 0
           and public._lots(:'loc_1'::uuid, :'var_enf'::uuid) = 1,
           format('lots=%s invented=%s',
                  public._lots(:'loc_1'::uuid, :'var_enf'::uuid),
                  public._adjlots(:'loc_1'::uuid, :'var_enf'::uuid)));


-- ============================================================================
-- 8. THE KINDS THAT HAVE NOTHING TO COMPENSATE  (0024 amendment 2)
-- ============================================================================

select chk('8.1 a rejected DELIVERY was never downgraded — the stock is on the '
           'shelf with a manager holding the note, and an auto-upgrade would '
           'have opened a zero-cost lot and then doubled it',
           public._fwn(:dl_pur::uuid) = 0
           and public._bal(:'loc_1'::uuid, :'var_pur'::uuid) = 0,
           format('movements=%s balance=%s', public._fwn(:dl_pur::uuid),
                  public._bal(:'loc_1'::uuid, :'var_pur'::uuid)));

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.replay_failed_write(:dl_pur::uuid) as rep_pur \gset
select public.replay_failed_write(:dl_wst::uuid) as rep_wst \gset
commit;

select chk('8.2 ⚠️ replaying it compensates NOTHING and records the document '
           'that was lost — zero is the right answer here, not a skipped step',
           (:'rep_pur'::jsonb->>'compensated_movements')::int = 0
           and (select count(*) = 1 from purchase where id = :dl_pur),
           :'rep_pur');

select chk('8.3 …the delivery landed with its 12 units, its marker and its '
           'preserved date',
           public._bal(:'loc_1'::uuid, :'var_pur'::uuid) = 12
           and public._mark('purchase', :dl_pur::uuid) = :dl_pur::uuid
           and public._occ('purchase', :dl_pur::uuid) < now() - interval '4 days',
           format('balance=%s marker=%s at=%s',
                  public._bal(:'loc_1'::uuid, :'var_pur'::uuid),
                  public._mark('purchase', :dl_pur::uuid),
                  public._occ('purchase', :dl_pur::uuid)));

select chk('8.4 a rejected WASTE is the other kind that DOES downgrade, and its '
           'replay nets the same way a sale''s does: five units gone once, not '
           'twice',
           (:'rep_wst'::jsonb->>'compensated_movements')::int = 1
           and public._fwq(:dl_wst::uuid) = 0
           and public._bal(:'loc_1'::uuid, :'var_wst'::uuid) = 5
           and public._mark('waste', :dl_wst::uuid) = :dl_wst::uuid,
           format('compensated=%s net=%s balance=%s',
                  :'rep_wst'::jsonb->>'compensated_movements',
                  public._fwq(:dl_wst::uuid),
                  public._bal(:'loc_1'::uuid, :'var_wst'::uuid)));

select chk('8.5 …and the waste document carries its reason and its cost '
           'snapshot, which is what a downgrade could not (§2.9: "margin goes '
           'quiet")',
           (select count(*) = 1 from waste_line wl where wl.waste_id = :dl_wst
             and wl.reason is not null),
           'waste line with a reason');


-- ============================================================================
-- 9. THE TRANSFER — no document, and the stamp is its only marker  (decision 9)
-- ============================================================================

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.replay_failed_write(:dl_trf::uuid) as rep_trf \gset
commit;

select chk('9.1 a rejected transfer compensates nothing — §2.4 gives it no '
           'document and 0024 gives it no downgrade, because the stock moved '
           'between two stores rather than off the shelf',
           (:'rep_trf'::jsonb->>'compensated_movements')::int = 0
           and public._fwn(:dl_trf::uuid) = 0,
           :'rep_trf');

select chk('9.2 …but the van shipped: four units left loc_1 and four arrived at '
           'loc_2, paired by one transfer_group_id',
           public._bal(:'loc_1'::uuid, :'var_trf'::uuid) = 6
           and public._bal(:'loc_2'::uuid, :'var_trf'::uuid) = 4
           and (select count(*) = 2 from stock_movement
                 where transfer_group_id = :dl_trf),
           format('from=%s to=%s',
                  public._bal(:'loc_1'::uuid, :'var_trf'::uuid),
                  public._bal(:'loc_2'::uuid, :'var_trf'::uuid)));

select chk('9.3 ⚠️⚠️ AND NOTHING BUT THE STAMP SAYS IT WAS RECOVERED. There is '
           'no transfer header to carry 0025''s marker — that is what 0025 left '
           'open and what 0026 decision 9 answers: replayed_at is on the row '
           'every kind has, and replay_result carries the group id §2.4 gives no '
           'other name',
           (select replayed_at is not null
                   and (replay_result->>'transfer_id')::uuid = :dl_trf::uuid
              from failed_write where id = :dl_trf),
           (select left(replay_result::text, 90) from failed_write where id = :dl_trf));

select chk('9.4 ⚠️ …and the destination lot carries the PRESERVED date, not '
           'today''s. received_at is the receiving store''s FEFO tiebreak '
           '(0020:310), so a re-dated transfer re-orders a shelf nobody looked at',
           (select min(sb.received_at) < now() - interval '4 days'
              from stock_batch sb
             where sb.location_id = :'loc_2' and sb.variant_id = :'var_trf'),
           (select format('received_at=%s', min(received_at)) from stock_batch
             where location_id = :'loc_2' and variant_id = :'var_trf'));


-- ============================================================================
-- 10. §2.6's "OR NOTHING MOVES" — a replay that fails leaves no trace
-- ============================================================================

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select chk_raises_like('10.1 a dead letter whose lines carry no price is refused '
                       'by record_sale — 22023, the payload code, raised AFTER '
                       'the compensation was written',
                       public._rep(:dl_badp::uuid), '22023',
                       'unit_price_gross_per_base');

select chk_raises_like('10.2 a dead letter with an EMPTY lines array is refused '
                       'before anything is touched — the payload is the original '
                       'call''s arguments (0024 decision 5) and a call with no '
                       'lines is not one of them',
                       public._rep(:dl_nols::uuid), '22023', 'no lines to replay');

select chk_raises_like('10.3 ⚠️ an occurred_at that is not a timestamp is 22023 '
                       'with a message naming this function — NOT a bare 22P02 '
                       'from a cast. record_failed_write accepted the payload '
                       'because a malformed one is exactly what it exists to '
                       'keep; replay will not invent a date for it',
                       public._rep(:dl_bts::uuid), '22023', 'not a timestamp');

select chk_raises_like('10.4 a delivery whose payload names no provider is '
                       'refused rather than recorded against nobody',
                       public._rep(:dl_nopr::uuid), '22023', 'provider_id');

select chk_raises_like('10.5 a transfer that names only one end is refused — the '
                       'payload is the only record of where the van went',
                       public._rep(:dl_badt::uuid), '22023',
                       'both ends of the transfer');
commit;

select chk('10.6 ⚠️⚠️ AND THE ROLLED-BACK REPLAY LEFT ITS COMPENSATION NOWHERE. '
           '10.1 wrote a reversal movement and then raised, so §2.6''s "either '
           'the real sale lands … or nothing moves" is the transaction and not a '
           'sentence: one movement still names that dead letter, still netting −2',
           public._fwn(:dl_badp::uuid) = 1 and public._fwq(:dl_badp::uuid) = -2,
           format('movements=%s net=%s', public._fwn(:dl_badp::uuid),
                  public._fwq(:dl_badp::uuid)));

select chk('10.7 …and none of the five refused rows is stamped, so an operator '
           'can try again once the root cause is fixed — which is the whole '
           'premise of §2.6''s manual replay',
           (select count(*) = 0 from failed_write
             where id in (:dl_badp, :dl_nols, :dl_bts, :dl_nopr, :dl_badt)
               and replayed_at is not null),
           'five unstamped');

select chk('10.8 …and no document was written for any of them',
           (select count(*) = 0 from sale where id in (:dl_badp, :dl_nols, :dl_bts))
           and (select count(*) = 0 from purchase where id = :dl_nopr),
           'no documents');


-- ============================================================================
-- 11. THE PRESERVED occurred_at, ALL FOUR CASES  (decision 5)
-- ============================================================================
-- ⚠️ §2.6 says replay "preserves the occurred_at already stored on the
-- failed_write row, which was clamped at capture". The applied table stores no
-- such column — only the client's own unvalidated payload — so 0026 recomputes
-- what the original call WOULD have written, evaluated at failed_at. These four
-- rows are the four answers, and every one of the dates below is five days old,
-- which is outside the 72-hour clamp and outside any void window.

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.replay_failed_write(:dl_ts1::uuid) as r \gset
select public.replay_failed_write(:dl_ts2::uuid) as r \gset
select public.replay_failed_write(:dl_ts3::uuid) as r \gset
select public.replay_failed_write(:dl_ts4::uuid) as r \gset
commit;

select chk('11.1 OFFLINE and TWENTY DAYS OLD → clamped to failed_at − 72h, '
           'exactly as record_sale would have clamped it at the till. Not the '
           'payload''s date, and emphatically not now()',
           public._occ('sale', :dl_ts1::uuid)
             = :'anchor'::timestamptz - interval '72 hours',
           format('occurred=%s expected=%s', public._occ('sale', :dl_ts1::uuid),
                  :'anchor'::timestamptz - interval '72 hours'));

select chk('11.2 ⚠️ OFFLINE and SIX HOURS OLDER THAN THE REPORT → preserved '
           'VERBATIM. This is the case §2.6''s exemption exists for, and the '
           'only one of the four a naive `v_at := payload occurred_at` gets '
           'right',
           public._occ('sale', :dl_ts2::uuid)
             = :'anchor'::timestamptz - interval '6 hours',
           format('occurred=%s expected=%s', public._occ('sale', :dl_ts2::uuid),
                  :'anchor'::timestamptz - interval '6 hours'));

select chk('11.3 ONLINE → failed_at, whatever the payload claims. §2.6: the '
           'server overrides when the write is not recorded_offline, because a '
           'till''s clock is not worth trusting — and the moment of the attempt '
           'is when the failure was reported, not when the recovery runs. The '
           'payload said twenty days',
           public._occ('sale', :dl_ts3::uuid) = :'anchor'::timestamptz,
           format('occurred=%s expected=%s', public._occ('sale', :dl_ts3::uuid),
                  :'anchor'::timestamptz));

select chk('11.4 ⚠️⚠️ A PAYLOAD DATED 2099 DOES NOT PRODUCE A SALE DATED 2099. '
           'The dead letter kept it — 0024 never raises for a bad payload — and '
           'no ordinary path in this database can write that date, so a replay '
           'that preserved it "verbatim" would have been the one hole in the '
           'clamp. It lands on failed_at',
           public._occ('sale', :dl_ts4::uuid) = :'anchor'::timestamptz
           and public._occ('sale', :dl_ts4::uuid) < now(),
           format('occurred=%s expected=%s', public._occ('sale', :dl_ts4::uuid),
                  :'anchor'::timestamptz));

select chk('11.5 …and all four are in the PAST and none of them is the moment of '
           'recovery, which is the one sentence §2.6 writes about this',
           (select count(*) = 4 from sale
             where id in (:dl_ts1, :dl_ts2, :dl_ts3, :dl_ts4)
               and occurred_at < now() - interval '4 days'
               and recorded_at > now() - interval '5 minutes'),
           (select count(*)::text from sale
             where id in (:dl_ts1, :dl_ts2, :dl_ts3, :dl_ts4)
               and occurred_at < now() - interval '4 days'));


-- ============================================================================
-- 12. THE WRITE THAT SUCCEEDED ON ITS OWN — replay still corrects the shelf
-- ============================================================================
-- §2.6's commonest permanent failure is `42501` after a membership change. Fix
-- the membership and the client's ordinary retry succeeds — but the downgrade
-- has already taken the units, so the shelf is short by one sale until somebody
-- replays. That the recorders are idempotent on `p_id` is what makes this safe.

select chk('12.1 the shelf is short by TWO sales'' worth: 10 bought, 4 sold by '
           'the retry, 4 taken by the downgrade the retry knew nothing about',
           public._bal(:'loc_1'::uuid, :'var_late'::uuid) = 6
           and public._fwq(:dl_late::uuid) = -4,
           format('balance=%s downgraded=%s',
                  public._bal(:'loc_1'::uuid, :'var_late'::uuid),
                  public._fwq(:dl_late::uuid)));

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
-- The client's ordinary retry, under the same id, with no marker and no replay.
select record_sale(:dl_late::uuid, :'loc_1'::uuid,
                   public._sl(:'var_late'::uuid, 4, 7.00)) as r \gset
commit;

select chk('12.2 the retry landed an ORDINARY sale — no marker, today''s date, '
           'and the shelf now short by the downgrade alone',
           public._mark('sale', :dl_late::uuid) is null
           and public._bal(:'loc_1'::uuid, :'var_late'::uuid) = 2,
           format('marker=%s balance=%s', public._mark('sale', :dl_late::uuid),
                  public._bal(:'loc_1'::uuid, :'var_late'::uuid)));

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.replay_failed_write(:dl_late::uuid) as rep_late \gset
commit;

select chk('12.3 ⚠️⚠️ THE REPLAY COMPENSATES AND THEN FINDS THE SALE ALREADY '
           'THERE. The recorders are idempotent on the client uuid (§2.6), so '
           'no second document is written — and the compensation still corrects '
           'the shelf the downgrade shortened. Six is the right answer',
           (:'rep_late'::jsonb->>'compensated_movements')::int = 1
           and (select count(*) = 1 from sale where id = :dl_late)
           and public._bal(:'loc_1'::uuid, :'var_late'::uuid) = 6,
           format('compensated=%s sales=%s balance=%s',
                  :'rep_late'::jsonb->>'compensated_movements',
                  (select count(*) from sale where id = :dl_late),
                  public._bal(:'loc_1'::uuid, :'var_late'::uuid)));

select chk('12.4 ⚠️ …and the sale still carries NO marker, because the document '
           'that landed was the client''s own retry and not a replay. The dead '
           'letter is stamped either way, which is what §2.10 reads',
           public._mark('sale', :dl_late::uuid) is null
           and (select replayed_at is not null from failed_write where id = :dl_late),
           'unmarked sale, stamped dead letter');


-- ============================================================================
-- 13. THE PAYLOAD IS NOT THE AUTHORITY  (decisions 8 and 10 of 0024's decision 5)
-- ============================================================================
-- ⚠️ BOTH CHECKS IN THIS SECTION WERE WRITTEN BECAUSE A FALSIFICATION WAS GREEN.
-- A dispatch on `payload->>'kind'` and a location read out of `payload` each
-- turned NOTHING red against the fixture as it first stood, for the same reason:
-- every other dead letter here carries a payload that agrees with its row. This
-- one does not. Its row says `sale` and loc_1; its payload says `waste` and
-- loc_2. The payload is client text that `record_failed_write` stored without
-- validating — that is what the table is for — and the row is the part this
-- database constrained.

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select public.replay_failed_write(:dl_lie::uuid) as rep_lie \gset
commit;

select chk('13.1 ⚠️ THE DISPATCH READ failed_write.kind AND NOT THE PAYLOAD — a '
           'SALE was recorded, though the payload says "waste". Only `kind` is '
           'constrained (failed_write_kind_known), and 0025 makes each recorder '
           'refuse a dead letter of the wrong kind, so a dispatch on the payload '
           'would meet a refusal this function caused itself',
           (select count(*) = 1 from sale where id = :dl_lie)
           and (select count(*) = 0 from waste where id = :dl_lie),
           format('sales=%s wastes=%s',
                  (select count(*) from sale where id = :dl_lie),
                  (select count(*) from waste where id = :dl_lie)));

select chk('13.2 ⚠️ …AND IT LANDED AT THE STORE THE ROW NAMES, NOT THE ONE THE '
           'PAYLOAD DOES. `record_failed_write` already resolved the location — '
           'argument first, payload second — and stored the answer; re-deriving '
           'it here would be a second source of truth that can disagree with the '
           'movements the downgrade already wrote',
           (select location_id = :'loc_1'::uuid from sale where id = :dl_lie)
           and (select payload->>'location_id' = :'loc_2' from failed_write
                 where id = :dl_lie),
           format('sale at=%s payload said=%s',
                  (select location_id from sale where id = :dl_lie),
                  (select payload->>'location_id' from failed_write where id = :dl_lie)));

select chk('13.3 …and the downgrade it compensated was at that same store, which '
           'is why the two must not be allowed to disagree: a compensation at '
           'loc_1 and a sale at loc_2 would leave BOTH shelves wrong and the '
           'total right',
           public._bal(:'loc_1'::uuid, :'var_lie'::uuid) = 7
           and public._bal(:'loc_2'::uuid, :'var_lie'::uuid) = 0
           and public._fwq(:dl_lie::uuid) = 0,
           format('loc_1=%s loc_2=%s net=%s',
                  public._bal(:'loc_1'::uuid, :'var_lie'::uuid),
                  public._bal(:'loc_2'::uuid, :'var_lie'::uuid),
                  public._fwq(:dl_lie::uuid)));


-- ============================================================================
-- 14. WHAT THE NEW COLUMNS DID NOT CHANGE  (§2.7, §2.8)
-- ============================================================================

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk('14.1 failed_write is still OWNER-ONLY. Three replayed rows now carry '
           'a stamp and a manager still sees none of them — 0024 decision 8 '
           'unchanged, and the new columns did not widen the policy',
           (select count(*) = 0 from public.failed_write),
           format('manager sees %s', (select count(*) from public.failed_write)));
commit;

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk('14.2 ⚠️ …but a CASHIER reads the MARKER on sales they may see. The '
           'boundary the FK does not move: a cashier learns that a sale was '
           'recovered, never what was in the dead letter',
           (select count(*) > 0 from public.sale s
             where s.replay_of_failed_write_id is not null)
           and (select count(*) = 0 from public.failed_write),
           format('marked sales=%s deadletters visible=%s',
                  (select count(*) from public.sale s
                    where s.replay_of_failed_write_id is not null),
                  (select count(*) from public.failed_write)));
commit;

select chk('14.3 ⚠️ every replayed document names a dead letter that is itself '
           'stamped — the marker and the stamp are two halves of one fact and '
           'neither can be written without the other',
           (select count(*) = 0 from sale s
             join failed_write fw on fw.id = s.replay_of_failed_write_id
            where fw.replayed_at is null),
           'no marked document names an unstamped dead letter');

select chk('14.4 …and the ledger still reconciles at the end of all of it: every '
           'batch''s projection equals the sum of its movements (§2.10)',
           public._drift() = 0, format('drifting batches=%s', public._drift()));

-- ⚠️ WORKSPACE A ONLY, AND THE EXCLUSION IS THE INTERESTING HALF. Workspace B's
-- dead letter was reported against a variant with NO stock and was never
-- replayed, so its downgrade drove the allocator into `0010`'s shortfall branch
-- and opened exactly the zero-cost lot this check is about — written by `0024`,
-- on a shelf that really was empty, which is correct. A whole-database version
-- of this claim would fail on that row and would be blaming the wrong migration.
select chk('14.5 ⚠️ NO LOT IN WORKSPACE A WAS INVENTED BY THE FAILURE PATH. Nine '
           'replays across four kinds and every unit went back to the lot it '
           'came from — decision 1 stated over a whole tenant rather than one '
           'variant. ⚠️ Workspace B DOES carry one, from a downgrade against an '
           'empty shelf that was never replayed, which is 0024 behaving '
           'correctly and is why the predicate is scoped',
           (select count(*) = 0 from stock_batch
             where origin = 'adjustment' and workspace_id = :'ws_a')
           and (select count(*) = 1 from stock_batch
                 where origin = 'adjustment' and workspace_id = :'ws_b'),
           format('A=%s B=%s',
                  (select count(*) from stock_batch
                    where origin='adjustment' and workspace_id = :'ws_a'),
                  (select count(*) from stock_batch
                    where origin='adjustment' and workspace_id = :'ws_b')));


-- ⚠️⚠️ 4d-i's finding, standard since: a verdict recorded inside a transaction
-- that ends in `rollback` VANISHES rather than failing, so the count is the only
-- thing that can see a section that silently did not run. The literal is
-- deliberately a literal.
select chk('15.1 ALL 86 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 85,
           format('recorded=%s of 85 before this one',
                  (select count(*) from public._verify)));

drop function public.chk_raises_like(text, text, text, text);
drop function public.chk_succeeds(text, text, text);
drop function public._rep(uuid);
drop function public._rs(uuid, uuid, jsonb, timestamptz, boolean, uuid);
drop function public._pl(uuid, numeric, numeric, date);
drop function public._sl(uuid, numeric, numeric);
drop function public._wl(uuid, numeric, numeric, text, text);
drop function public._tl(uuid, numeric);
drop function public._pload(uuid, jsonb, timestamptz, boolean);
drop function public._pload_p(uuid, uuid, jsonb, timestamptz, boolean);
drop function public._pload_t(uuid, uuid, jsonb, timestamptz, boolean);
drop function public._bal(uuid, uuid);
drop function public._fwq(uuid);
drop function public._fwn(uuid);
drop function public._lots(uuid, uuid);
drop function public._adjlots(uuid, uuid);
drop function public._occ(text, uuid);
drop function public._mark(text, uuid);
drop function public._drift();


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
