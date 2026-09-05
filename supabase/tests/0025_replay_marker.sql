-- ============================================================================
-- Behavioural verification for 0025 — the replay marker and the void exemption
-- ============================================================================
-- ADR-035 §2.3, §2.4, §2.5, §2.6, §2.7, §2.8, §2.10, §3 step 4.5, §9.
-- docs/PLAN.md task 4.5c-i.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0025_replay_marker.sql
--
-- ⚠️ THIS FILE CLOSES A CHECK OWED SINCE 4e-ii-a. `0021` enforces the void
-- window on a basis that reads `recorded_at` for an offline write and
-- `occurred_at` otherwise, and §2.6 grants a REPLAYED write an exemption from
-- the offline half. `0021` could not enforce that and said so out loud: nothing
-- in the schema distinguished a replayed document, so half of its `case` was
-- unfalsifiable. Section 8 is that half, and it is falsifiable now because
-- section 4 can mark a document.
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED, AND WHY EACH CLAIM NEEDS A PAIR
-- ----------------------------------------------------------------------------
--   ⚠️⚠️ "THE REPLAY KEPT ITS occurred_at" IS NOT A CLAIM ON ITS OWN. A write
--   whose `occurred_at` is five minutes old keeps it under BOTH branches — the
--   online override is `now()` and the offline clamp is a no-op inside 72 hours,
--   so a fixture with a recent timestamp passes against a function that has no
--   replay branch at all. Every timestamp check in section 3 is therefore TEN
--   DAYS old, which is outside the clamp, and each is PAIRED with the identical
--   call made without the marker: 3.3 is clamped to `now() - 72h` and 3.4 is
--   `now()`. Nothing but the argument explains the difference between them.
--
--   ⚠️⚠️ AND SECTION 8's PAIR IS THE ONE THAT MATTERS MOST. 8.1 says a staff
--   member cannot self-service void a replayed two-day-old sale. That would also
--   be true of a function that simply ignored `recorded_offline` — so 8.3 is an
--   identical sale, same `occurred_at`, same `recorded_offline`, same staff
--   member, WITHOUT the marker, and it IS voidable. The two differ in one
--   column. 8.9 re-asserts `0021`'s own amendment in the same breath, because
--   this migration edited the line that implements it.
--
--   ⚠️ THE FENCE IS A PAIR TOO (5.1/5.3). "A cashier is refused" proves nothing
--   about the ARGUMENT unless the same cashier making the same call without it
--   succeeds — otherwise the check would pass against a `record_sale` that had
--   simply been fenced at manager outright, which would break every till.
--
--   ⚠️ THE GRANTS ARE CHECKED FROM THE CATALOG (section 2) and they are not
--   ceremony: `0025` DROPS four applied functions, and a drop takes their grants
--   with it. Postgres grants EXECUTE to PUBLIC by DEFAULT, so a migration that
--   re-created them without `revoke all … from public` would silently hand
--   `anon` the whole write surface, and no line of the file would say so. That
--   is 3.1's finding, and this is the fourth place it has had to be checked.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT `replay_failed_write`. It is `0026` (task 4.5c-ii). Nothing
-- in this database passes the new argument, so every marked document in this
-- file was marked BY THIS FILE, by hand, through the recorders — which is
-- exactly the exercise the argument needs and is not the same as an end-to-end
-- replay. Dead-letter → downgrade → replay netting the original sale is §2.10's
-- **replay** row and it stays open until `0026`.
--
-- ⚠️ NOTHING ABOUT COMPENSATION. The dead letters below are built with an EMPTY
-- `lines` array on purpose, so `record_failed_write` writes no downgrade and the
-- ledger is untouched (9.2, 9.3 assert that rather than assume it). The
-- downgrade is `0024`'s claim and 79 checks already cover it; repeating it here
-- would make section 9's invariant a statement about `0023` instead of `0025`.
--
-- ⚠️ NOTHING ABOUT CONCURRENCY. One connection cannot block on its own lock.
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

-- 4.5b's helper, and section 5 is why it is here again: `insufficient_privilege`
-- IS 42501, so a state alone cannot tell a role refusal from a location wall.
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

-- 4e-ii-a's mirror: a call that must SUCCEED, recorded rather than fatal, so the
-- pair half of every fence check reports instead of killing the file.
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

-- ---- the four calls under test, as text -------------------------------------
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

create or replace function public._rp(p_id uuid, p_loc uuid, p_prov uuid,
                             p_lines jsonb, p_at timestamptz default null,
                             p_off boolean default false,
                             p_replay uuid default null)
returns text language sql as $$
  select format('select public.record_purchase(%L::uuid, %L::uuid, %L::uuid, '
                '%L::jsonb, %L::timestamptz, %L::boolean, %L::uuid)',
                p_id, p_loc, p_prov, p_lines, p_at, p_off, p_replay)
$$;
grant execute on function
  public._rp(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;

create or replace function public._rw(p_id uuid, p_loc uuid, p_lines jsonb,
                             p_at timestamptz default null,
                             p_off boolean default false,
                             p_replay uuid default null)
returns text language sql as $$
  select format('select public.record_waste(%L::uuid, %L::uuid, %L::jsonb, '
                '%L::timestamptz, %L::boolean, %L::uuid)',
                p_id, p_loc, p_lines, p_at, p_off, p_replay)
$$;
grant execute on function
  public._rw(uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;

create or replace function public._rt(p_id uuid, p_from uuid, p_to uuid,
                             p_lines jsonb, p_at timestamptz default null,
                             p_off boolean default false,
                             p_replay uuid default null)
returns text language sql as $$
  select format('select public.record_transfer(%L::uuid, %L::uuid, %L::uuid, '
                '%L::jsonb, %L::timestamptz, %L::boolean, %L::uuid)',
                p_id, p_from, p_to, p_lines, p_at, p_off, p_replay)
$$;
grant execute on function
  public._rt(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;

create or replace function public._vt(p_kind text, p_id uuid)
returns text language sql as $$
  select format('select public.void_transaction(%L::text, %L::uuid)', p_kind, p_id)
$$;
grant execute on function public._vt(text, uuid) to authenticated;

-- ---- line builders ----------------------------------------------------------
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

-- Likewise `0019`'s signature exactly, five arguments, for the same reason.
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

-- A dead letter's payload, in `0024` decision 5's shape. ⚠️ `lines` is EMPTY on
-- purpose — see *what this file cannot claim*.
-- ⚠️ THE SIGNATURE IS `0024`'s EXACTLY — (uuid, jsonb, timestamptz) — and the
-- defaults are the only thing this file adds. A different ARITY would not
-- replace 0024's helper, it would sit BESIDE it, and a two-argument call would
-- then be ambiguous rather than wrong. `_cleanup.sql` drops both shapes anyway;
-- this makes the drop a backstop rather than the thing that saves it.
create or replace function public._pay(p_loc uuid,
                             p_lines jsonb default '[]'::jsonb,
                             p_at timestamptz default null)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'location_id', p_loc, 'lines', p_lines, 'occurred_at', p_at))
$$;
grant execute on function public._pay(uuid, jsonb, timestamptz) to authenticated;

-- The header timestamps of a document, by kind, so section 3 reads one way.
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

create or replace function public._recd(p_kind text, p_id uuid)
returns timestamptz language plpgsql stable as $$
declare v timestamptz;
begin
  if p_kind = 'sale' then
    select s.recorded_at into v from public.sale s where s.id = p_id;
  elsif p_kind = 'purchase' then
    select p.recorded_at into v from public.purchase p where p.id = p_id;
  else
    select w.recorded_at into v from public.waste w where w.id = p_id;
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
-- The cashier holds BOTH locations, so every refusal in section 5 is the role
-- fence and never the location wall — which is what makes 5.1 readable.
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, l.id
  from workspace_member wm, public.location l
 where wm.user_id = :cashier_a and l.workspace_id = :'ws_a';

insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes');
select id as fam from product_family where workspace_id = :'ws_a' \gset
insert into product_family (workspace_id, name) values (:'ws_b', 'Abarrotes B');
select id as fam_b from product_family where workspace_id = :'ws_b' \gset

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam', 'Arroz',   'pza','pza','pza','pza', 0.0000),  -- the replayed SALE
  (:'ws_a', :'fam', 'Frijol',  'pza','pza','pza','pza', 0.0000),  -- the offline PAIR
  (:'ws_a', :'fam', 'Azucar',  'pza','pza','pza','pza', 0.0000),  -- the online PAIR
  (:'ws_a', :'fam', 'Cafe',    'pza','pza','pza','pza', 0.0000),  -- the replayed WASTE
  (:'ws_a', :'fam', 'Aceite',  'pza','pza','pza','pza', 0.0000),  -- the TRANSFER
  (:'ws_a', :'fam', 'Harina',  'pza','pza','pza','pza', 0.0000),  -- the FENCE pair
  (:'ws_a', :'fam', 'Sal',     'pza','pza','pza','pza', 0.0000),  -- section 6
  (:'ws_a', :'fam', 'Atun',    'pza','pza','pza','pza', 0.0000),  -- section 7
  (:'ws_a', :'fam', 'Leche',   'pza','pza','pza','pza', 0.0000),  -- void: replayed
  (:'ws_a', :'fam', 'Galleta', 'pza','pza','pza','pza', 0.0000),  -- void: the PAIR
  (:'ws_a', :'fam', 'Chile',   'pza','pza','pza','pza', 0.0000),  -- void: in-window
  (:'ws_a', :'fam', 'Pan',     'pza','pza','pza','pza', 0.0000),  -- void: regression
  (:'ws_a', :'fam', 'Huevo',   'pza','pza','pza','pza', 0.0000),  -- void: waste
  (:'ws_a', :'fam', 'Queso',   'pza','pza','pza','pza', 0.0000);  -- the 400-day case
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_b', :'fam_b', 'Arroz B', 'pza','pza','pza','pza', 0.0000);

select id as var_sale from product_variant where workspace_id=:'ws_a' and name='Arroz'   \gset
select id as var_off  from product_variant where workspace_id=:'ws_a' and name='Frijol'  \gset
select id as var_on   from product_variant where workspace_id=:'ws_a' and name='Azucar'  \gset
select id as var_wst  from product_variant where workspace_id=:'ws_a' and name='Cafe'    \gset
select id as var_trf  from product_variant where workspace_id=:'ws_a' and name='Aceite'  \gset
select id as var_fen  from product_variant where workspace_id=:'ws_a' and name='Harina'  \gset
select id as var_req  from product_variant where workspace_id=:'ws_a' and name='Sal'     \gset
select id as var_ws   from product_variant where workspace_id=:'ws_a' and name='Atun'    \gset
select id as var_vr   from product_variant where workspace_id=:'ws_a' and name='Leche'   \gset
select id as var_vp   from product_variant where workspace_id=:'ws_a' and name='Galleta' \gset
select id as var_vi   from product_variant where workspace_id=:'ws_a' and name='Chile'   \gset
select id as var_vg   from product_variant where workspace_id=:'ws_a' and name='Pan'     \gset
select id as var_vw   from product_variant where workspace_id=:'ws_a' and name='Huevo'   \gset
select id as var_old  from product_variant where workspace_id=:'ws_a' and name='Queso'   \gset
select id as var_b    from product_variant where workspace_id=:'ws_b' and name='Arroz B' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset
select id as prov_b from provider where workspace_id = :'ws_b' and is_generic \gset

-- ---- stock, so every sale, waste and transfer below has something to move ----
begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_purchase(('dddd0025-0000-0000-0000-00000000000' || x)::uuid,
         :'loc_1'::uuid, :'prov_a'::uuid, public._pl(v.id, 200, 2.00))
  from (values ('1',:'var_sale'),('2',:'var_off'),('3',:'var_on'),('4',:'var_wst'),
               ('5',:'var_trf'),('6',:'var_fen'),('7',:'var_req'),('8',:'var_ws'),
               ('9',:'var_vr'),('a',:'var_vp'),('b',:'var_vi'),('c',:'var_vg'),
               ('d',:'var_vw'),('e',:'var_old')) as t(x, vid)
  cross join lateral (select t.vid::uuid as id) v;
commit;

-- ---- the dead letters, one per kind, with EMPTY lines ------------------------
\set fw_sale '''fadd0025-0000-0000-0000-00000000000a'''
\set fw_purc '''fadd0025-0000-0000-0000-00000000000b'''
\set fw_wast '''fadd0025-0000-0000-0000-00000000000c'''
\set fw_tran '''fadd0025-0000-0000-0000-00000000000d'''
\set fw_s2   '''fadd0025-0000-0000-0000-00000000000e'''
\set fw_s3   '''fadd0025-0000-0000-0000-00000000000f'''
\set fw_s4   '''fadd0025-0000-0000-0000-000000000010'''
\set fw_s5   '''fadd0025-0000-0000-0000-000000000011'''
\set fw_s6   '''fadd0025-0000-0000-0000-000000000012'''
\set fw_s7   '''fadd0025-0000-0000-0000-000000000013'''
\set fw_s8   '''fadd0025-0000-0000-0000-000000000014'''
\set fw_b    '''fadd0025-0000-0000-0000-0000000000ba'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_failed_write(:fw_sale::uuid, 'sale',     :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_purc::uuid, 'purchase', :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_wast::uuid, 'waste',    :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_tran::uuid, 'transfer', :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_s2::uuid,   'sale',     :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_s3::uuid,   'sale',     :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_s4::uuid,   'sale',     :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_s5::uuid,   'sale',     :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_s6::uuid,   'sale',     :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_s7::uuid,   'sale',     :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_s8::uuid,   'sale',     :'ws_a'::uuid, public._pay(:'loc_1'::uuid), '42501');
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
select record_failed_write(:fw_b::uuid, 'sale', :'ws_b'::uuid, public._pay(:'loc_b'::uuid), '42501');
commit;


-- ===================================================== 1. the marker ========
-- The column, its foreign key, and the two things `0025`'s decision 1 turns on:
-- that it NAMES a dead letter rather than asserting a boolean, and that it
-- exists on exactly the three tables that have a document to carry it.

select chk('1.1 sale.replay_of_failed_write_id is a NULLABLE uuid — null is an '
           'ordinary write, which is every row that exists today',
           (select data_type = 'uuid' and is_nullable = 'YES'
              from information_schema.columns
             where table_schema='public' and table_name='sale'
               and column_name='replay_of_failed_write_id'));

select chk('1.2 purchase.replay_of_failed_write_id likewise',
           (select data_type = 'uuid' and is_nullable = 'YES'
              from information_schema.columns
             where table_schema='public' and table_name='purchase'
               and column_name='replay_of_failed_write_id'));

select chk('1.3 waste.replay_of_failed_write_id likewise',
           (select data_type = 'uuid' and is_nullable = 'YES'
              from information_schema.columns
             where table_schema='public' and table_name='waste'
               and column_name='replay_of_failed_write_id'));

-- ⚠️ 1.4 IS DECISION 1. A boolean would satisfy §2.6's sentence and carry no
-- link; the FK is what makes the marker unforgeable — you cannot claim replay
-- status without naming a real dead letter — and it is the audit link §2.10's
-- report wants. It is also why 1.9 can be written at all.
select chk('1.4 ⚠️ all three markers are FOREIGN KEYS to failed_write, not '
           'booleans (decision 1) — 3 constraints',
           (select count(*) from information_schema.table_constraints tc
              join information_schema.key_column_usage kcu
                on kcu.constraint_name = tc.constraint_name
               and kcu.constraint_schema = tc.constraint_schema
              join information_schema.constraint_column_usage ccu
                on ccu.constraint_name = tc.constraint_name
               and ccu.constraint_schema = tc.constraint_schema
             where tc.constraint_type = 'FOREIGN KEY'
               and tc.table_schema = 'public'
               and kcu.column_name = 'replay_of_failed_write_id'
               and ccu.table_name = 'failed_write') = 3,
           format('fks=%s', (select count(*) from information_schema.table_constraints tc
              join information_schema.key_column_usage kcu
                on kcu.constraint_name = tc.constraint_name
               and kcu.constraint_schema = tc.constraint_schema
             where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public'
               and kcu.column_name='replay_of_failed_write_id')));

select chk('1.5 …and every one is ON DELETE RESTRICT — a recovered dead letter '
           'is the last row anyone may delete, because the document pointing at '
           'it is append-only and cannot have the pointer removed',
           (select count(*) = 3 from pg_constraint c
             where c.contype = 'f' and c.confdeltype = 'r'
               and c.conrelid in ('public.sale'::regclass,
                                  'public.purchase'::regclass,
                                  'public.waste'::regclass)
               and c.confrelid = 'public.failed_write'::regclass));

-- ⚠️ 1.6 IS DECISION 5 AS AN ASSERTION. A transfer has no document header, so
-- there is nowhere to put the column and `void_transaction` does not take the
-- kind. If a later migration adds a fourth, this goes red and asks why.
select chk('1.6 ⚠️ EXACTLY THREE TABLES CARRY THE MARKER (decision 5) — a '
           'transfer has no document to mark, and stock_movement deliberately '
           'did not get one',
           (select count(*) = 3 and bool_and(table_name in ('sale','purchase','waste'))
              from information_schema.columns
             where table_schema='public'
               and column_name='replay_of_failed_write_id'),
           format('tables=%s', (select string_agg(table_name, ',' order by table_name)
                                  from information_schema.columns
                                 where table_schema='public'
                                   and column_name='replay_of_failed_write_id')));

select chk('1.7 the partial indexes exist on all three — §2.10 reads this the '
           'other way round: given a dead letter, was it recovered',
           (select count(*) = 3 from pg_indexes
             where schemaname='public'
               and indexname in ('sale_by_replay_idx','purchase_by_replay_idx',
                                 'waste_by_replay_idx')));

select chk('1.8 …and they are PARTIAL, because the column is null on every row '
           'but a replayed one',
           (select count(*) = 3 from pg_indexes
             where schemaname='public'
               and indexname in ('sale_by_replay_idx','purchase_by_replay_idx',
                                 'waste_by_replay_idx')
               and indexdef like '%WHERE%replay_of_failed_write_id IS NOT NULL%'));

-- ⚠️ 1.9 IS WHAT A BOOLEAN COULD NOT DO. The marker cannot name something that
-- is not a dead letter, and the database says so rather than the function.
select chk_raises('1.9 ⚠️ a marker naming a uuid that is NOT a dead letter is '
                  'refused by the database itself (23503) — the property a '
                  'boolean marker could not have had',
                  format('insert into public.sale (id, workspace_id, '
                         'location_id, occurred_at, total_net, total_tax, '
                         'created_by, recorded_offline, payload_hash, '
                         'replay_of_failed_write_id) values '
                         '(%L::uuid, %L::uuid, %L::uuid, now(), 1, 0, %L::uuid, '
                         'false, ''h'', %L::uuid)',
                         'aaaa0025-0000-0000-0000-0000000000ff',
                         :'ws_a', :'loc_1', :owner_a,
                         '00000000-0000-0000-0000-000000000000'),
                  '23503');



-- ============================== 2. the grants survived the drop =============
-- ⚠️ `0025` DROPS FOUR APPLIED FUNCTIONS, and a drop takes their grants with it.
-- Postgres then grants EXECUTE to PUBLIC by DEFAULT on the re-created function,
-- so a migration that forgot `revoke all … from public` would hand `anon` the
-- entire write surface and no line of the file would say so. 3.1's finding, in
-- its fourth place. Read from the catalog, where the privilege is the whole of
-- the fact — `anon` would be refused by the location wall anyway, which would
-- leave the grant untested with the two indistinguishable from outside.

select chk('2.1 anon holds NO execute on record_sale/7',
           not has_function_privilege('anon',
             'public.record_sale(uuid,uuid,jsonb,timestamptz,boolean,uuid)', 'execute'));
select chk('2.2 anon holds NO execute on record_purchase/7',
           not has_function_privilege('anon',
             'public.record_purchase(uuid,uuid,uuid,jsonb,timestamptz,boolean,uuid)', 'execute'));
select chk('2.3 anon holds NO execute on record_waste/7',
           not has_function_privilege('anon',
             'public.record_waste(uuid,uuid,jsonb,timestamptz,boolean,uuid)', 'execute'));
select chk('2.4 anon holds NO execute on record_transfer/7',
           not has_function_privilege('anon',
             'public.record_transfer(uuid,uuid,uuid,jsonb,timestamptz,boolean,uuid)', 'execute'));

select chk('2.5 …and authenticated DOES on record_sale/7, which is what makes '
           '2.1 a claim rather than a description of a missing function',
           has_function_privilege('authenticated',
             'public.record_sale(uuid,uuid,jsonb,timestamptz,boolean,uuid)', 'execute'));
select chk('2.6 …and on record_purchase/7',
           has_function_privilege('authenticated',
             'public.record_purchase(uuid,uuid,uuid,jsonb,timestamptz,boolean,uuid)', 'execute'));
select chk('2.7 …and on record_waste/7',
           has_function_privilege('authenticated',
             'public.record_waste(uuid,uuid,jsonb,timestamptz,boolean,uuid)', 'execute'));
select chk('2.8 …and on record_transfer/7',
           has_function_privilege('authenticated',
             'public.record_transfer(uuid,uuid,uuid,jsonb,timestamptz,boolean,uuid)', 'execute'));

-- ⚠️ 2.9 IS DECISION 6. `create or replace` cannot change a signature, so the
-- seventh argument had to be a DROP and a CREATE. Had it been added as an
-- overload instead, the six-argument version would still stand — callable, and
-- unable to honour a replay — and an unqualified five-argument call would have
-- become ambiguous.
select chk('2.9 ⚠️ NO SIX-ARGUMENT OVERLOAD SURVIVES for any of the four '
           '(decision 6) — the old signature is gone, not shadowed',
           (select count(*) = 4 from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public'
               and p.proname in ('record_sale','record_purchase','record_waste',
                                 'record_transfer')),
           format('overloads=%s',
                  (select string_agg(p.proname || '/' || p.pronargs, ',' order by p.proname)
                     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                    where n.nspname='public'
                      and p.proname in ('record_sale','record_purchase',
                                        'record_waste','record_transfer'))));

select chk('2.10 void_transaction keeps its THREE-argument signature and its '
           'grant — its body moved, its shape did not (decision 7)',
           has_function_privilege('authenticated',
             'public.void_transaction(text,uuid,text)', 'execute')
           and not has_function_privilege('anon',
             'public.void_transaction(text,uuid,text)', 'execute'));


-- =============================== 3. occurred_at is kept VERBATIM ============
-- ⚠️⚠️ EVERY FIXTURE HERE IS TEN DAYS OLD, AND THAT IS THE WHOLE DESIGN OF THE
-- SECTION. A five-minute-old timestamp survives BOTH existing branches — the
-- online override is `now()` and the offline clamp is a no-op inside 72 hours —
-- so a recent fixture would pass against a function with no replay branch at
-- all. Ten days is outside the clamp, so only the new branch can produce it.
-- 3.3 and 3.4 are the same call without the marker and they land somewhere else.

\set doc_r  '''5a1e0025-0000-0000-0000-00000000000a'''
\set doc_o  '''5a1e0025-0000-0000-0000-00000000000b'''
\set doc_n  '''5a1e0025-0000-0000-0000-00000000000c'''
\set doc_p  '''bbbb0025-0000-0000-0000-00000000000a'''
\set doc_w  '''cccc0025-0000-0000-0000-00000000000a'''
\set doc_t  '''eeee0025-0000-0000-0000-00000000000a'''
\set doc_vo '''5a1e0025-0000-0000-0000-0000000000ff'''

select (now() - interval '10 days')::timestamptz as t10 \gset
select (now() - interval '400 days')::timestamptz as t400 \gset

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select record_sale(:doc_r::uuid, :'loc_1'::uuid, public._sl(:'var_sale'::uuid, 3),
                   :'t10'::timestamptz, false, :fw_sale::uuid) as r \gset
-- The PAIR: identical call, no marker, recorded_offline — the 72-hour clamp.
select record_sale(:doc_o::uuid, :'loc_1'::uuid, public._sl(:'var_off'::uuid, 3),
                   :'t10'::timestamptz, true, null) as r \gset
-- The PAIR: identical call, no marker, online — the server override.
select record_sale(:doc_n::uuid, :'loc_1'::uuid, public._sl(:'var_on'::uuid, 3),
                   :'t10'::timestamptz, false, null) as r \gset

select record_purchase(:doc_p::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       public._pl(:'var_ws'::uuid, 5, 3.00),
                       :'t10'::timestamptz, false, :fw_purc::uuid) as r \gset
select record_waste(:doc_w::uuid, :'loc_1'::uuid, public._wl(:'var_wst'::uuid, 2),
                    :'t10'::timestamptz, false, :fw_wast::uuid) as r \gset
select record_transfer(:doc_t::uuid, :'loc_1'::uuid, :'loc_2'::uuid,
                       public._tl(:'var_trf'::uuid, 4),
                       :'t10'::timestamptz, false, :fw_tran::uuid) as r \gset
-- 400 days: the branch is an EXEMPTION, not a widened clamp.
select record_sale(:doc_vo::uuid, :'loc_1'::uuid, public._sl(:'var_old'::uuid, 1),
                   :'t400'::timestamptz, false, :fw_s2::uuid) as r \gset
commit;

select chk('3.1 ⚠️ THE REPLAYED SALE KEPT ITS occurred_at TO THE MICROSECOND — '
           'ten days old, neither overridden to now() nor clamped to now()-72h',
           public._occ('sale', :doc_r::uuid) = :'t10'::timestamptz,
           format('occurred_at=%s wanted=%s',
                  public._occ('sale', :doc_r::uuid), :'t10'::timestamptz));

select chk('3.2 …and it took a FRESH recorded_at, so the two genuinely differ — '
           'which is what makes 3.1 a claim and section 8 possible at all',
           public._recd('sale', :doc_r::uuid) > now() - interval '5 minutes'
           and public._recd('sale', :doc_r::uuid)
               - public._occ('sale', :doc_r::uuid) > interval '9 days',
           format('recorded_at=%s occurred_at=%s',
                  public._recd('sale', :doc_r::uuid),
                  public._occ('sale', :doc_r::uuid)));

select chk('3.3 ⚠️ THE PAIR — the identical call WITHOUT the marker, offline, is '
           'CLAMPED to now()-72h. Nothing but the argument separates it from 3.1',
           public._occ('sale', :doc_o::uuid) > now() - interval '73 hours'
           and public._occ('sale', :doc_o::uuid) < now() - interval '71 hours',
           format('occurred_at=%s', public._occ('sale', :doc_o::uuid)));

select chk('3.4 ⚠️ THE OTHER PAIR — the identical call WITHOUT the marker, '
           'online, is OVERRIDDEN to now(). The two together are the whole of '
           'the behaviour the exemption departs from',
           public._occ('sale', :doc_n::uuid) > now() - interval '5 minutes',
           format('occurred_at=%s', public._occ('sale', :doc_n::uuid)));

select chk('3.5 the replayed sale''s MOVEMENTS carry the same instant as its '
           'header — 0016:166''s "a document cannot disagree with itself about '
           'when it happened", which is the property the refused GUC-and-trigger '
           'shortcut would have broken',
           (select count(*) > 0 and bool_and(sm.occurred_at = :'t10'::timestamptz)
              from public.stock_movement sm where sm.sale_id = :doc_r::uuid),
           format('movements=%s',
                  (select count(*) from public.stock_movement sm
                    where sm.sale_id = :doc_r::uuid)));

select chk('3.6 the replayed PURCHASE kept its occurred_at',
           public._occ('purchase', :doc_p::uuid) = :'t10'::timestamptz,
           format('occurred_at=%s', public._occ('purchase', :doc_p::uuid)));

-- ⚠️ 3.7 IS NOT A SECOND SPELLING OF 3.6. `received_at` is the FEFO TIEBREAK
-- (§2.4, 0010), so a re-dated delivery does not merely report wrong — it
-- re-orders which lot the next sale consumes.
select chk('3.7 ⚠️ …and the LOT it opened was received at that instant, not at '
           'now() — received_at is the FEFO tiebreak, so a re-dated delivery '
           're-orders the shelf rather than merely mis-reporting it',
           (select count(*) > 0 and bool_and(sb.received_at = :'t10'::timestamptz)
              from public.stock_batch sb
              join public.purchase_line pl on pl.id = sb.source_purchase_line_id
             where pl.purchase_id = :doc_p::uuid),
           format('batches=%s received=%s',
                  (select count(*) from public.stock_batch sb
                     join public.purchase_line pl
                       on pl.id = sb.source_purchase_line_id
                    where pl.purchase_id = :doc_p::uuid),
                  (select min(sb.received_at) from public.stock_batch sb
                     join public.purchase_line pl
                       on pl.id = sb.source_purchase_line_id
                    where pl.purchase_id = :doc_p::uuid)));

select chk('3.8 the replayed WASTE kept its occurred_at',
           public._occ('waste', :doc_w::uuid) = :'t10'::timestamptz,
           format('occurred_at=%s', public._occ('waste', :doc_w::uuid)));

-- ⚠️ 3.9/3.10 ARE DECISION 5. A transfer has no header, so its only witness is
-- the ledger — and its destination lot's received_at is that store's tiebreak.
select chk('3.9 ⚠️ the replayed TRANSFER kept it on every movement, which is its '
           'only witness — a transfer has no document header (decision 5)',
           (select count(*) = 2 and bool_and(sm.occurred_at = :'t10'::timestamptz)
              from public.stock_movement sm
             where sm.transfer_group_id is not null
               and sm.variant_id = :'var_trf'::uuid),
           format('movements=%s',
                  (select count(*) from public.stock_movement sm
                    where sm.transfer_group_id is not null
                      and sm.variant_id = :'var_trf'::uuid)));

select chk('3.10 ⚠️ …and the DESTINATION lot was received at that instant — '
           '0020:310, the receiving store''s FEFO tiebreak',
           (select count(*) > 0 and bool_and(sb.received_at = :'t10'::timestamptz)
              from public.stock_batch sb
             where sb.variant_id = :'var_trf'::uuid
               and sb.location_id = :'loc_2'::uuid),
           format('dest lots=%s',
                  (select count(*) from public.stock_batch sb
                    where sb.variant_id = :'var_trf'::uuid
                      and sb.location_id = :'loc_2'::uuid)));

-- ⚠️ 3.11 IS THE REFUSED SHORTCUT, ASSERTED. A `before insert` trigger that
-- rewrote the row would have left the function's own return value reporting the
-- value it computed — so the caller would be told one thing and the row would
-- say another. Nothing else in the file would notice.
select chk('3.11 ⚠️ the RETURN VALUE agrees with the row it wrote — the failure '
           'mode the refused trigger-and-GUC shortcut would have had',
           (:'r'::jsonb ->> 'occurred_at')::timestamptz
             = public._occ('sale', :doc_vo::uuid)
           and (:'r'::jsonb ->> 'occurred_at')::timestamptz = :'t400'::timestamptz,
           format('returned=%s row=%s', :'r'::jsonb ->> 'occurred_at',
                  public._occ('sale', :doc_vo::uuid)));

select chk('3.12 ⚠️ FOUR HUNDRED DAYS is kept exactly too — the branch is an '
           'EXEMPTION from the clamp, not a wider clamp',
           public._occ('sale', :doc_vo::uuid) = :'t400'::timestamptz,
           format('occurred_at=%s wanted=%s',
                  public._occ('sale', :doc_vo::uuid), :'t400'::timestamptz));


-- ================================ 4. the marker is stored ==================
select chk('4.1 the replayed sale names its dead letter',
           public._mark('sale', :doc_r::uuid) = :fw_sale::uuid,
           format('mark=%s', public._mark('sale', :doc_r::uuid)));
select chk('4.2 the replayed purchase names its dead letter',
           public._mark('purchase', :doc_p::uuid) = :fw_purc::uuid);
select chk('4.3 the replayed waste names its dead letter',
           public._mark('waste', :doc_w::uuid) = :fw_wast::uuid);
select chk('4.4 ⚠️ an ORDINARY write leaves it NULL — the pair without which 4.1 '
           'would pass against a column defaulted to something',
           public._mark('sale', :doc_n::uuid) is null
           and public._mark('sale', :doc_o::uuid) is null);
select chk('4.5 §2.10 reads it the other way round: the dead letter finds the '
           'document that recovered it, through the partial index',
           (select count(*) = 1 from public.sale s
             where s.replay_of_failed_write_id = :fw_sale::uuid));
select chk('4.6 exactly FOUR documents in this database carry a marker, and '
           'every one was marked by this file — nothing in 0025 writes one',
           (select (select count(*) from public.sale where replay_of_failed_write_id is not null)
                 + (select count(*) from public.purchase where replay_of_failed_write_id is not null)
                 + (select count(*) from public.waste where replay_of_failed_write_id is not null)) = 4,
           format('marked=%s',
             (select (select count(*) from public.sale where replay_of_failed_write_id is not null)
                   + (select count(*) from public.purchase where replay_of_failed_write_id is not null)
                   + (select count(*) from public.waste where replay_of_failed_write_id is not null))));


-- ============================ 5. the manager fence (decision 3) =============
-- ⚠️⚠️ THE FENCE IS ON THE ARGUMENT, NOT ON THE FUNCTION, AND 5.3 IS WHAT SAYS
-- SO. These four functions stay granted to `authenticated` because every member
-- may sell — that is §2.7 and `0016`'s grant note — but a cashier who could pass
-- this argument could set an arbitrary `occurred_at`, which is the 72-hour clamp
-- and the 15-minute self-service void window both, in one call. Without 5.3
-- every check here would also pass against a `record_sale` fenced at manager
-- outright, which would break every till in the shop.
--
-- ⚠️ THE CASHIER HOLDS BOTH LOCATIONS (see the fixture), so nothing below can be
-- the location wall wearing the fence's clothes.

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;

select chk_raises_like('5.1 ⚠️ a CASHIER passing the marker is refused TD003, '
                       'and the message names the fence — a state alone could '
                       'not tell this from the location wall',
                       public._rs('5a1e0025-0000-0000-0000-000000000101'::uuid,
                                  :'loc_1'::uuid, public._sl(:'var_fen'::uuid, 1),
                                  :'t10'::timestamptz, false, :fw_s3::uuid),
                       'TD003', 'only a manager or owner may record a replay');

select chk_succeeds('5.2 ⚠️ THE PAIR — the SAME cashier, the SAME location, the '
                    'SAME line, WITHOUT the marker, SUCCEEDS. The fence is on '
                    'the argument and not on the function, and without this the '
                    'section would pass against a till nobody can use',
                    public._rs('5a1e0025-0000-0000-0000-000000000102'::uuid,
                               :'loc_1'::uuid, public._sl(:'var_fen'::uuid, 1)));

select chk_raises('5.3 …record_purchase is fenced the same way',
                  public._rp('bbbb0025-0000-0000-0000-000000000101'::uuid,
                             :'loc_1'::uuid, :'prov_a'::uuid,
                             public._pl(:'var_fen'::uuid, 1, 1.00),
                             :'t10'::timestamptz, false, :fw_purc::uuid),
                  'TD003');

select chk_raises('5.4 …record_waste is fenced the same way',
                  public._rw('cccc0025-0000-0000-0000-000000000101'::uuid,
                             :'loc_1'::uuid, public._wl(:'var_fen'::uuid, 1),
                             :'t10'::timestamptz, false, :fw_wast::uuid),
                  'TD003');

select chk_raises('5.5 …record_transfer is fenced the same way, even though it '
                  'stores no marker — the argument buys an arbitrary '
                  'occurred_at either way (decision 5)',
                  public._rt('eeee0025-0000-0000-0000-000000000101'::uuid,
                             :'loc_1'::uuid, :'loc_2'::uuid,
                             public._tl(:'var_fen'::uuid, 1),
                             :'t10'::timestamptz, false, :fw_tran::uuid),
                  'TD003');
commit;

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;
select chk_succeeds('5.6 a MANAGER may — §2.7 puts the dead-letter pile at '
                    'manager because it is denominated in unrecorded revenue',
                    public._rs('5a1e0025-0000-0000-0000-000000000103'::uuid,
                               :'loc_1'::uuid, public._sl(:'var_fen'::uuid, 1),
                               :'t10'::timestamptz, false, :fw_s3::uuid));
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk_succeeds('5.7 …and so may an OWNER',
                    public._rs('5a1e0025-0000-0000-0000-000000000104'::uuid,
                               :'loc_1'::uuid, public._sl(:'var_fen'::uuid, 1),
                               :'t10'::timestamptz, false, :fw_s4::uuid));
commit;

select chk('5.8 …and the manager''s replay really was recorded with the marker '
           'and the preserved time — a fence check that never looked at what '
           'the granted side WROTE would be half a claim',
           public._mark('sale', '5a1e0025-0000-0000-0000-000000000103'::uuid)
             = :fw_s3::uuid
           and public._occ('sale', '5a1e0025-0000-0000-0000-000000000103'::uuid)
             = :'t10'::timestamptz);

select chk('5.9 ⚠️ and the cashier''s UNMARKED sale (5.2) was clamped to now() '
           'like any other online write — so 5.2 proves the till works, not '
           'that the cashier slipped a replay through',
           public._mark('sale', '5a1e0025-0000-0000-0000-000000000102'::uuid) is null
           and public._occ('sale', '5a1e0025-0000-0000-0000-000000000102'::uuid)
               > now() - interval '5 minutes');

select chk('5.10 …and none of the four refused calls left a document behind — a '
           'refusal that had already written its header would be a worse bug '
           'than the one the fence prevents',
           (select count(*) from public.sale
             where id = '5a1e0025-0000-0000-0000-000000000101'::uuid) = 0
           and (select count(*) from public.purchase
                 where id = 'bbbb0025-0000-0000-0000-000000000101'::uuid) = 0
           and (select count(*) from public.waste
                 where id = 'cccc0025-0000-0000-0000-000000000101'::uuid) = 0);


-- ======================= 6. occurred_at is REQUIRED on a replay =============
-- ⚠️ DECISION 4, AND IT IS THE QUIETEST OF THE FOUR. Every other path coalesces
-- a null `occurred_at` into `now()`. On a replay that IS the re-dating — arriving
-- by omission rather than by override — so it raises instead of inventing one.

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select chk_raises_like('6.1 ⚠️ a replay with NO occurred_at raises 22023 rather '
                       'than defaulting to now()',
                       public._rs('5a1e0025-0000-0000-0000-000000000201'::uuid,
                                  :'loc_1'::uuid, public._sl(:'var_req'::uuid, 1),
                                  null, false, :fw_s5::uuid),
                       '22023', 'must carry the occurred_at stored on the dead letter');

select chk_succeeds('6.2 THE PAIR — the same call WITH one succeeds',
                    public._rs('5a1e0025-0000-0000-0000-000000000202'::uuid,
                               :'loc_1'::uuid, public._sl(:'var_req'::uuid, 1),
                               :'t10'::timestamptz, false, :fw_s5::uuid));

select chk_succeeds('6.3 THE OTHER PAIR — an ORDINARY call with no occurred_at '
                    'still succeeds and takes now(). 6.1 is about the replay '
                    'branch, not about the argument being newly mandatory',
                    public._rs('5a1e0025-0000-0000-0000-000000000203'::uuid,
                               :'loc_1'::uuid, public._sl(:'var_req'::uuid, 1)));
commit;

select chk('6.4 …and that ordinary one landed at now(), which is what makes 6.3 '
           'a claim about the DEFAULT rather than about not raising',
           public._occ('sale', '5a1e0025-0000-0000-0000-000000000203'::uuid)
             > now() - interval '5 minutes');


-- ================= 7. the dead letter must be OURS, and of this KIND ========
-- ⚠️ TWO REFUSALS, DELIBERATELY DIFFERENT, AND THE DIFFERENCE IS THE POINT.
-- Not ours is 42501 and says nothing more, because `failed_write` is one table
-- across every tenant and an FK does not know about workspaces — 0021's reason
-- for reading a document through my_locations(). Wrong kind is 22023 and LOUD,
-- because by then the row is known to be ours and hiding a client bug behind a
-- permission error is the opposite of what §2.6 asks on the same question.

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;

select chk_raises_like('7.1 ⚠️ workspace B''s dead letter, named by A''s owner, '
                       'is 42501 and indistinguishable from one that does not '
                       'exist — a caller must not be able to probe another '
                       'tenant''s ids',
                       public._rs('5a1e0025-0000-0000-0000-000000000301'::uuid,
                                  :'loc_1'::uuid, public._sl(:'var_ws'::uuid, 1),
                                  :'t10'::timestamptz, false, :fw_b::uuid),
                       '42501', 'not found or not accessible');

select chk_raises_like('7.2 …and a uuid that is no dead letter at all gives the '
                       'SAME answer — 42501 from the function, NOT 23503 from '
                       'the foreign key, which is how we know the check ran',
                       public._rs('5a1e0025-0000-0000-0000-000000000302'::uuid,
                                  :'loc_1'::uuid, public._sl(:'var_ws'::uuid, 1),
                                  :'t10'::timestamptz, false,
                                  '00000000-0000-0000-0000-0000000000ff'::uuid),
                       '42501', 'not found or not accessible');

select chk_raises_like('7.3 ⚠️ a SALE naming a PURCHASE dead letter is 22023 and '
                       'LOUD — without it §2.10 would count that delivery '
                       'recovered while the stock is still missing',
                       public._rs('5a1e0025-0000-0000-0000-000000000303'::uuid,
                                  :'loc_1'::uuid, public._sl(:'var_ws'::uuid, 1),
                                  :'t10'::timestamptz, false, :fw_purc::uuid),
                       '22023', 'is not a sale');

select chk_raises('7.4 …a PURCHASE naming a SALE dead letter, likewise',
                  public._rp('bbbb0025-0000-0000-0000-000000000301'::uuid,
                             :'loc_1'::uuid, :'prov_a'::uuid,
                             public._pl(:'var_ws'::uuid, 1, 1.00),
                             :'t10'::timestamptz, false, :fw_s6::uuid),
                  '22023');

select chk_raises('7.5 …a WASTE naming a purchase dead letter, likewise',
                  public._rw('cccc0025-0000-0000-0000-000000000301'::uuid,
                             :'loc_1'::uuid, public._wl(:'var_ws'::uuid, 1),
                             :'t10'::timestamptz, false, :fw_purc::uuid),
                  '22023');

select chk_raises('7.6 …a TRANSFER naming a sale dead letter, likewise',
                  public._rt('eeee0025-0000-0000-0000-000000000301'::uuid,
                             :'loc_1'::uuid, :'loc_2'::uuid,
                             public._tl(:'var_ws'::uuid, 1),
                             :'t10'::timestamptz, false, :fw_s6::uuid),
                  '22023');

select chk_succeeds('7.7 THE PAIR — the same sale naming a SALE dead letter of '
                    'its own workspace succeeds. Without this, 7.3 would pass '
                    'against a function that refused every marker',
                    public._rs('5a1e0025-0000-0000-0000-000000000304'::uuid,
                               :'loc_1'::uuid, public._sl(:'var_ws'::uuid, 1),
                               :'t10'::timestamptz, false, :fw_s6::uuid));
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
select chk_succeeds('7.8 THE OTHER PAIR — workspace B''s owner replays B''s own '
                    'dead letter in B''s own store. 7.1 is the tenant wall, not '
                    'a broken marker',
                    public._rp('bbbb0025-0000-0000-0000-0000000000b1'::uuid,
                               :'loc_b'::uuid, :'prov_b'::uuid,
                               public._pl(:'var_b'::uuid, 1, 1.00),
                               :'t10'::timestamptz, false, null));
commit;


-- ================= 8. void_transaction's replay exemption ===================
-- ⚠️⚠️ THIS IS THE CHECK OWED SINCE 4e-ii-a, AND IT TOOK A ROLE CHANGE TO REACH.
--
-- §2.6 exempts a replayed write from the offline basis: its 15-minute window is
-- measured from `occurred_at` even though `recorded_offline` is set, so a
-- two-day-old recovered sale does not get a brand-new fifteen minutes of staff
-- self-service void. `0021` could not enforce that and said so.
--
-- ⚠️ THE PATH IS REACHABLE ONLY AFTER A DEMOTION, AND THAT IS NOT AN ARTEFACT OF
-- THE FIXTURE — IT IS §2.6's OWN ARGUMENT ARRIVING AS A FACT. `void_transaction`
-- fences staff twice: they may only void their OWN document, and only inside the
-- window. Passing the replay marker requires manager (decision 3), and §2.6 says
-- replay is manager-triggered in any case — so `created_by` on every replayed
-- document is a manager or an owner, and those two skip the window entirely.
-- §2.6 states exactly this when it argues the exemption is free: *"the only
-- person realistically standing over a freshly replayed sale is already someone
-- who can void it unfenced."*
--
-- So the exemption is a SAFETY property rather than a daily path, and the one
-- way to stand in front of it is to be the person who recorded the replay and to
-- be staff by the time you try to void it. That is a demotion, it is an ordinary
-- thing to happen in a shop, and it is what the block below sets up. This is
-- 4.5a's 3.11 in a new place — a guard whose reachability is worth stating out
-- loud rather than assuming — except that this one IS reachable, and the check
-- below is not defence in depth.

\set fw_p2 '''fadd0025-0000-0000-0000-0000000000c1'''
\set fw_w2 '''fadd0025-0000-0000-0000-0000000000c2'''

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select record_failed_write(:fw_p2::uuid, 'purchase', :'ws_a'::uuid,
                           public._pay(:'loc_1'::uuid), '42501');
select record_failed_write(:fw_w2::uuid, 'waste', :'ws_a'::uuid,
                           public._pay(:'loc_1'::uuid), '42501');
commit;

\set v_rep  '''5a1e0025-0000-0000-0000-000000000401'''
\set v_pair '''5a1e0025-0000-0000-0000-000000000402'''
\set v_in   '''5a1e0025-0000-0000-0000-000000000403'''
\set v_ord  '''5a1e0025-0000-0000-0000-000000000404'''
\set v_pur  '''bbbb0025-0000-0000-0000-000000000401'''
\set v_wst  '''cccc0025-0000-0000-0000-000000000401'''

select (now() - interval '2 days')::timestamptz as t2d \gset

-- Written by the MANAGER, because only a manager may pass the marker.
begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;

-- The subject: replayed, offline, two days old.
select record_sale(:v_rep::uuid, :'loc_1'::uuid, public._sl(:'var_vr'::uuid, 2),
                   :'t2d'::timestamptz, true, :fw_s7::uuid);
-- ⚠️ THE PAIR: identical in every column but the marker. Offline, two days old,
-- same author, same store. `recorded_at` is now() for both.
select record_sale(:v_pair::uuid, :'loc_1'::uuid, public._sl(:'var_vp'::uuid, 2),
                   :'t2d'::timestamptz, true, null);
-- A replay whose occurred_at is INSIDE the window: the exemption changes the
-- BASIS, it does not ban voiding a replay.
select record_sale(:v_in::uuid, :'loc_1'::uuid, public._sl(:'var_vi'::uuid, 2),
                   now(), true, :fw_s8::uuid);
-- Regression: an ordinary online sale, untouched by any of this.
select record_sale(:v_ord::uuid, :'loc_1'::uuid, public._sl(:'var_vg'::uuid, 2));
select record_purchase(:v_pur::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
                       public._pl(:'var_vr'::uuid, 2, 1.00),
                       :'t2d'::timestamptz, true, :fw_p2::uuid);
select record_waste(:v_wst::uuid, :'loc_1'::uuid, public._wl(:'var_vw'::uuid, 2),
                    :'t2d'::timestamptz, true, :fw_w2::uuid);
commit;

select chk('8.0 the fixture is the pair it claims to be: both sales are '
           'recorded_offline, both occurred two days ago, both were written by '
           'the same person, and they differ in the MARKER and nothing else',
           (select s.recorded_offline and s.occurred_at = :'t2d'::timestamptz
              from public.sale s where s.id = :v_rep::uuid)
           and (select s.recorded_offline and s.occurred_at = :'t2d'::timestamptz
                  from public.sale s where s.id = :v_pair::uuid)
           and (select s1.created_by = s2.created_by
                  from public.sale s1, public.sale s2
                 where s1.id = :v_rep::uuid and s2.id = :v_pair::uuid)
           and public._mark('sale', :v_rep::uuid) is not null
           and public._mark('sale', :v_pair::uuid) is null);

-- ---- the demotion: the manager who recorded them becomes staff --------------
update public.workspace_member set role = 'staff'
 where workspace_id = :'ws_a' and user_id = :manager_a;
insert into public.member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, l.id
  from public.workspace_member wm, public.location l
 where wm.user_id = :manager_a and l.workspace_id = :'ws_a';

select chk('8.0b …and the demotion took: the author of both is now STAFF, which '
           'is the only way anyone can stand in front of this window at all',
           (select wm.role = 'staff' from public.workspace_member wm
             where wm.workspace_id = :'ws_a' and wm.user_id = :manager_a));

begin;
select set_config('request.jwt.claims', :jwt_manager, true);
set local role authenticated;

select chk_raises_like('8.1 ⚠️ THE OWED CHECK — a staff member CANNOT '
                       'self-service void their own REPLAYED sale, because its '
                       'window is measured from occurred_at (two days) and not '
                       'from recorded_at (now), even though it is flagged '
                       'recorded_offline',
                       public._vt('sale', :v_rep::uuid),
                       'TD003', 'outside the 15 minute self-service window');

select chk_succeeds('8.2 ⚠️⚠️ THE PAIR, AND IT IS THE MOST IMPORTANT LINE IN THE '
                    'FILE — the identical sale WITHOUT the marker IS voidable by '
                    'the same staff member, because 0021''s amendment reads '
                    'recorded_at on an offline write. The two documents differ '
                    'in ONE COLUMN, and that column is the whole exemption',
                    public._vt('sale', :v_pair::uuid));

select chk_succeeds('8.3 …and a REPLAYED sale whose occurred_at is INSIDE the '
                    'window is still voidable. The exemption changes the BASIS, '
                    'it does not ban correcting a replay',
                    public._vt('sale', :v_in::uuid));

select chk_succeeds('8.4 REGRESSION — an ordinary ONLINE sale is untouched by '
                    'any of this',
                    public._vt('sale', :v_ord::uuid));

select chk_raises('8.5 …a replayed PURCHASE is refused on the same basis',
                  public._vt('purchase', :v_pur::uuid), 'TD003');

select chk_raises('8.6 …and a replayed WASTE likewise — 4e-ii-b''s rule, a rule '
                  'written once per branch needs a check once per branch, and '
                  'void_transaction has three',
                  public._vt('waste', :v_wst::uuid), 'TD003');
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk_succeeds('8.7 …and a MANAGER or OWNER voids the replayed sale at any '
                    'time, which is §2.6''s "therefore in manager territory" — '
                    'the exemption moves the decision, it does not remove it',
                    public._vt('sale', :v_rep::uuid));
commit;

select chk('8.8 the compensating document written by 8.2 carries NO marker — a '
           'void of a replay is not itself a replay',
           (select s.replay_of_failed_write_id is null
              from public.sale s where s.reversal_of = :v_pair::uuid));

select chk('8.9 …and the void of the REPLAYED sale (8.7) carries none either, '
           'which is the case a "copy the row" implementation would get wrong',
           (select s.replay_of_failed_write_id is null
              from public.sale s where s.reversal_of = :v_rep::uuid));

-- ⚠️ 8.10 IS `0021`'s OWN AMENDMENT, RE-ASSERTED, BECAUSE `0025` EDITED THE LINE
-- THAT IMPLEMENTS IT. 8.2 already exercises it; this states it as the claim it
-- is, so a change to `v_basis` that broke the offline half rather than the
-- replay half is named here rather than inferred from a pair.
select chk('8.10 ⚠️ 0021''s offline basis SURVIVED the edit: the unmarked '
           'two-day-old offline sale was voidable, so the window still read '
           'recorded_at for it. This migration rewrote that line and this is '
           'the check that says the rewrite kept it',
           (select count(*) = 1 from public.sale s
             where s.reversal_of = :v_pair::uuid));


-- ========================= 9. the ledger, and the population ================
-- ⚠️ §2.4's INVARIANT IS THE ONE CLAIM EVERY FILE IN THIS DIRECTORY OWES. This
-- migration writes no movements of its own, but it moved the timestamp that
-- stamps every one of them and the lot each is allocated against, so "the
-- projection still agrees with the ledger" is a statement about this change and
-- not boilerplate.

select chk('9.1 batch_balance still agrees with the movements that built it, '
           'across everything this file wrote — a re-dated delivery allocates '
           'against a different lot, so this is a claim about section 3',
           (select count(*) = 0 from public.batch_balance_violations()),
           format('violations=%s',
                  (select count(*) from public.batch_balance_violations())));

select chk('9.2 no receipt is incomplete — 0015''s deferred constraint held '
           'through every backdated purchase in section 3',
           (select count(*) = 0 from public.receipt_completeness_violations()),
           format('violations=%s',
                  (select count(*) from public.receipt_completeness_violations())));

-- ⚠️ 9.3/9.4 ARE WHY THE DEAD LETTERS HAVE EMPTY `lines`. If a downgrade had
-- run, 9.1 would be a statement about `adjust_stock_delta` rather than about
-- this migration, and a defect in `0025` could hide behind `0023`'s arithmetic.
select chk('9.3 ⚠️ NOT ONE DOWNGRADE MOVEMENT WAS WRITTEN in this file — the '
           'dead letters carry empty lines on purpose, so section 9.1 is a claim '
           'about 0025 and not about 0023',
           (select count(*) = 0 from public.stock_movement sm
             where sm.adjustment_reason = 'failed_write_downgrade'),
           format('downgrades=%s',
                  (select count(*) from public.stock_movement sm
                    where sm.adjustment_reason = 'failed_write_downgrade')));

select chk('9.4 …and no movement names a dead letter, which is the same fact '
           'read through 0024''s link',
           (select count(*) = 0 from public.stock_movement sm
             where sm.failed_write_id is not null));

-- ⚠️ 9.5 IS THE POPULATION CLAIM `0026` WILL REST ON, and it is the shape 4.5b
-- named as binding: every marked document names a dead letter that EXISTS and is
-- OF ITS OWN KIND. A per-row check would pass on a fixture; this is over all of
-- them at once.
select chk('9.5 ⚠️ POPULATION — every marked document names a dead letter that '
           'exists AND whose kind matches the document. This is the claim 0026 '
           'will read the marker under',
           (select bool_and(ok) from (
              select exists (select 1 from public.failed_write fw
                              where fw.id = s.replay_of_failed_write_id
                                and fw.kind = 'sale') as ok
                from public.sale s where s.replay_of_failed_write_id is not null
              union all
              select exists (select 1 from public.failed_write fw
                              where fw.id = p.replay_of_failed_write_id
                                and fw.kind = 'purchase')
                from public.purchase p where p.replay_of_failed_write_id is not null
              union all
              select exists (select 1 from public.failed_write fw
                              where fw.id = w.replay_of_failed_write_id
                                and fw.kind = 'waste')
                from public.waste w where w.replay_of_failed_write_id is not null
            ) t));

select chk('9.6 …and the population is not empty, which is 4e-ii-b''s rule 4 — a '
           'bool_and over zero rows is TRUE and asserts nothing',
           (select count(*) > 6 from (
              select 1 from public.sale where replay_of_failed_write_id is not null
              union all
              select 1 from public.purchase where replay_of_failed_write_id is not null
              union all
              select 1 from public.waste where replay_of_failed_write_id is not null
            ) t),
           format('marked=%s', (select count(*) from (
              select 1 from public.sale where replay_of_failed_write_id is not null
              union all
              select 1 from public.purchase where replay_of_failed_write_id is not null
              union all
              select 1 from public.waste where replay_of_failed_write_id is not null
            ) t)));

-- Moved down from section 1: it needs a document to already name the row.
select chk_raises('9.7 ⚠️ ON DELETE RESTRICT, as behaviour rather than as a '
                  'catalog reading — a dead letter a document names cannot be '
                  'deleted (23503), because the document is append-only and '
                  'could never have the pointer removed',
                  format('delete from public.failed_write where id = %L::uuid',
                         :fw_sale),
                  '23503');

-- ⚠️ THE ROW DELETED HERE IS THE *TRANSFER* DEAD LETTER, AND THAT IS DECISION 5
-- ARRIVING AS EVIDENCE. Section 3 replayed a transfer against it and the replay
-- preserved its occurred_at — but a transfer has no document header, so nothing
-- references the row and it deletes cleanly. Every other dead letter that was
-- replayed in this file is now un-deletable.
select chk_succeeds('9.8 …and a dead letter NOBODY names still deletes, which '
                    'is what makes 9.7 a claim about the REFERENCE rather than '
                    'about the table — and the one used here is the TRANSFER''s, '
                    'which nothing can reference because a transfer has no '
                    'document to carry the marker (decision 5)',
                    format('delete from public.failed_write where id = %L::uuid',
                           :fw_tran));

select chk('9.9 …and it is really gone',
           (select count(*) = 0 from public.failed_write
             where id = :fw_tran::uuid));


-- ============================ 10. reads and roles ===========================
-- ⚠️ 4b-i's FINDING, FOR THE FOURTH TIME, AND IT IS WHY 10.1 IS NOT INSIDE A
-- ROLE BLOCK: a check that reads back what a fenced-out role wrote must not be
-- that role. Everything above that reads a document reads it as the schema
-- owner. The three below are ABOUT visibility, so they are the only ones that
-- belong inside `set local role authenticated`.

begin;
select set_config('request.jwt.claims', :jwt_owner, true);
set local role authenticated;
select chk('10.1 the OWNER reads the marker on their own workspace''s sales',
           (select count(*) > 0 from public.sale s
             where s.replay_of_failed_write_id is not null),
           format('visible=%s', (select count(*) from public.sale s
                                  where s.replay_of_failed_write_id is not null)));
commit;

begin;
select set_config('request.jwt.claims', :jwt_owner_b, true);
set local role authenticated;
select chk('10.2 …and workspace B''s owner reads NONE of A''s marked documents — '
           'the marker rides on the document and inherits its tenant wall, it '
           'does not open a new read path',
           (select count(*) = 0 from public.sale s
             where s.replay_of_failed_write_id is not null),
           format('visible=%s', (select count(*) from public.sale s
                                  where s.replay_of_failed_write_id is not null)));
commit;

begin;
select set_config('request.jwt.claims', :jwt_cashier, true);
set local role authenticated;
select chk('10.3 ⚠️ …and a CASHIER of workspace A reads the marker on sales they '
           'may see, because `failed_write` is owner-only but the MARKER is a '
           'column on a document, not a read of the dead letter. This is the '
           'boundary the FK does NOT move, and it is worth stating: a cashier '
           'learns that a sale was recovered, never what was in the dead letter',
           (select count(*) > 0 from public.sale s
             where s.replay_of_failed_write_id is not null)
           and (select count(*) = 0 from public.failed_write),
           format('sales=%s deadletters=%s',
                  (select count(*) from public.sale s
                    where s.replay_of_failed_write_id is not null),
                  (select count(*) from public.failed_write)));
commit;


-- ⚠️⚠️ 4d-i's finding, standard since: a verdict recorded inside a transaction
-- that ends in `rollback` VANISHES rather than failing, so the count is the only
-- thing that can see a section that silently did not run. The literal is
-- deliberately a literal.
select chk('11.1 ALL 84 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 83,
           format('recorded=%s of 83 before this one',
                  (select count(*) from public._verify)));

drop function public.chk_raises_like(text, text, text, text);
drop function public.chk_succeeds(text, text, text);
drop function public._rs(uuid, uuid, jsonb, timestamptz, boolean, uuid);
drop function public._rp(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid);
drop function public._rw(uuid, uuid, jsonb, timestamptz, boolean, uuid);
drop function public._rt(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid);
drop function public._vt(text, uuid);
drop function public._pl(uuid, numeric, numeric, date);
drop function public._sl(uuid, numeric, numeric);
drop function public._wl(uuid, numeric, numeric, text, text);
drop function public._tl(uuid, numeric);
drop function public._pay(uuid, jsonb, timestamptz);
drop function public._occ(text, uuid);
drop function public._recd(text, uuid);
drop function public._mark(text, uuid);


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
