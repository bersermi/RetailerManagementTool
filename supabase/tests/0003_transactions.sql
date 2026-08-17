-- ============================================================================
-- Behavioural verification for 0003 — transactions
-- ============================================================================
-- ADR-035 §9: a file is not evidence, a green CI run is. `supabase db reset`
-- proves only that the DDL parses; everything this migration is actually FOR —
-- the reversal self-FK, client-id idempotency, immutability, and the fact that a
-- cashier cannot read cost — is invisible to it. This file is that evidence, and
-- it runs in .github/workflows/db.yml immediately after the reset.
--
-- Provisional by design. ADR-035 §3 step 3 replaces it with pgTAP suites; until
-- that step lands, "0003 is verified" would otherwise mean a developer's memory
-- of a terminal, which is the failure mode this repo exists to avoid.
--
-- Run it against a DATABASE THAT WAS JUST RESET — it writes fixture rows and
-- does not clean up, and the immutability guard means it cannot.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0003_transactions.sql
--
-- Without psql on the host, go through the container:
--
--   docker cp supabase/tests/0003_transactions.sql supabase_db_<project>:/tmp/t.sql
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f /tmp/t.sql
--
-- The RLS section runs under `set local role authenticated`. Do not "simplify"
-- it away: the postgres superuser bypasses RLS, so every isolation check in this
-- file passes vacuously when run as postgres.
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

-- Records whether a statement raised, and with which sqlstate.
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


-- ---------------------------------------------------------------- fixture ----
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'staff.a1@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'manager.a@example.mx'),
  ('44444444-4444-4444-4444-444444444444', 'owner.b@example.mx'),
  ('55555555-5555-5555-5555-555555555555', 'staff.a2@example.mx');

-- Workspace A, onboarded as its owner.
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
select onboard_workspace('Tienda A') as ws_a \gset

-- Workspace B, a different tenant entirely.
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', false);
select onboard_workspace('Tienda B') as ws_b \gset

select set_config('request.jwt.claims', null, false);

-- Second location in A, plus the staff and manager memberships.
insert into location (workspace_id, name) values (:'ws_a', 'Sucursal Norte');

select id as loc_a1 from location where workspace_id = :'ws_a' and name = 'Tienda A' \gset
select id as loc_a2 from location where workspace_id = :'ws_a' and name = 'Sucursal Norte' \gset
select id as loc_b1 from location where workspace_id = :'ws_b' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', '22222222-2222-2222-2222-222222222222', 'staff'),
  (:'ws_a', '33333333-3333-3333-3333-333333333333', 'manager'),
  (:'ws_a', '55555555-5555-5555-5555-555555555555', 'staff');

insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a1' from workspace_member wm
 where wm.user_id = '22222222-2222-2222-2222-222222222222';
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a2' from workspace_member wm
 where wm.user_id = '55555555-5555-5555-5555-555555555555';

-- Catalog: one family, one variant, in workspace A.
insert into product_family (workspace_id, name) values (:'ws_a', 'Jitomate');
select id as fam_a from product_family where workspace_id = :'ws_a' \gset
insert into product_variant (workspace_id, family_id, name,
       base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code, tax_rate)
values (:'ws_a', :'fam_a', 'Jitomate a granel', 'g', 'kg', 'g', 'g', 0.16);
select id as var_a from product_variant where workspace_id = :'ws_a' \gset

select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

-- One document of each kind at location A1.
\set sale_1 '''aaaaaaaa-0000-0000-0000-000000000001'''
\set pur_1  '''aaaaaaaa-0000-0000-0000-000000000002'''
\set was_1  '''aaaaaaaa-0000-0000-0000-000000000003'''

insert into sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                  created_by, payload_hash)
values (:sale_1, :'ws_a', :'loc_a1', now(), 100.00, 16.00,
        '11111111-1111-1111-1111-111111111111', 'hash-sale-1');

insert into sale_line (workspace_id, location_id, sale_id, variant_id, qty_base,
                       qty_display, qty_display_unit, unit_price_net_per_base,
                       line_net, tax_amount, tax_rate)
values (:'ws_a', :'loc_a1', :sale_1, :'var_a', 1000, 1, 'kg', 0.100000,
        100.00, 16.00, 0.16);

insert into purchase (id, workspace_id, location_id, provider_id, occurred_at,
                      total_net, total_tax, created_by, payload_hash)
values (:pur_1, :'ws_a', :'loc_a1', :'prov_a', now(), 60.00, 9.60,
        '11111111-1111-1111-1111-111111111111', 'hash-pur-1');

insert into purchase_line (workspace_id, location_id, purchase_id, variant_id,
                           qty_base, qty_display, qty_display_unit,
                           unit_price_net_per_base, line_net, tax_amount, tax_rate,
                           expiry_date)
values (:'ws_a', :'loc_a1', :pur_1, :'var_a', 1000, 1, 'kg', 0.060000,
        60.00, 9.60, 0.16, current_date + 7);

insert into waste (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                   created_by, payload_hash)
values (:was_1, :'ws_a', :'loc_a1', now(), 10.00, 1.60,
        '11111111-1111-1111-1111-111111111111', 'hash-was-1');

insert into waste_line (workspace_id, location_id, waste_id, variant_id, qty_base,
                        qty_display, qty_display_unit, unit_price_net_per_base,
                        line_net, tax_amount, tax_rate, reason,
                        unit_cost_net_per_base)
values (:'ws_a', :'loc_a1', :was_1, :'var_a', 100, 100, 'g', 0.100000,
        10.00, 1.60, 0.16, 'caducado', 0.060000);

select chk('fixture: one document of each kind at A1',
           (select count(*) from sale) = 1
       and (select count(*) from purchase) = 1
       and (select count(*) from waste) = 1);


-- ------------------------------------------------------- reversal self-FK ----

-- A valid void: same tenant, same store, pointing at the original.
insert into sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                  created_by, payload_hash, reversal_of, reversal_reason)
values ('aaaaaaaa-0000-0000-0000-00000000000a', :'ws_a', :'loc_a1', now(),
        -100.00, -16.00, '11111111-1111-1111-1111-111111111111',
        'hash-sale-1-rev', :sale_1, 'cobro duplicado');

-- A second original, deliberately left unvoided: the cross-scope checks below
-- must be stopped by the composite FK, and reusing an already-voided document
-- would let the one-reversal-per-document index answer first.
insert into sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                  created_by, payload_hash)
values ('aaaaaaaa-0000-0000-0000-000000000009', :'ws_a', :'loc_a1', now(), 50.00, 8.00,
        '11111111-1111-1111-1111-111111111111', 'hash-sale-2');

select chk('reversal: a valid void is accepted and carries negative totals',
           (select total_net from sale where id = 'aaaaaaaa-0000-0000-0000-00000000000a') = -100.00);

select chk_raises(
  'reversal: cannot void a document belonging to another STORE',
  format($q$insert into sale (id, workspace_id, location_id, occurred_at, total_net,
              total_tax, created_by, payload_hash, reversal_of)
            values ('aaaaaaaa-0000-0000-0000-00000000000b', %L, %L, now(), -1, 0,
                    '11111111-1111-1111-1111-111111111111', 'h', %L)$q$,
         :'ws_a', :'loc_a2', 'aaaaaaaa-0000-0000-0000-000000000009'),
  '23503');

select chk_raises(
  'reversal: cannot void a document belonging to another WORKSPACE',
  format($q$insert into sale (id, workspace_id, location_id, occurred_at, total_net,
              total_tax, created_by, payload_hash, reversal_of)
            values ('aaaaaaaa-0000-0000-0000-00000000000c', %L, %L, now(), -1, 0,
                    '44444444-4444-4444-4444-444444444444', 'h', %L)$q$,
         :'ws_b', :'loc_b1', 'aaaaaaaa-0000-0000-0000-000000000009'),
  '23503');

select chk_raises(
  'reversal: a document cannot reverse itself',
  format($q$insert into sale (id, workspace_id, location_id, occurred_at, total_net,
              total_tax, created_by, payload_hash, reversal_of)
            values ('aaaaaaaa-0000-0000-0000-00000000000d', %L, %L, now(), -1, 0,
                    '11111111-1111-1111-1111-111111111111', 'h',
                    'aaaaaaaa-0000-0000-0000-00000000000d')$q$,
         :'ws_a', :'loc_a1'),
  '23514');

select chk_raises(
  'reversal: a document cannot be voided twice',
  format($q$insert into sale (id, workspace_id, location_id, occurred_at, total_net,
              total_tax, created_by, payload_hash, reversal_of)
            values ('aaaaaaaa-0000-0000-0000-00000000000e', %L, %L, now(), -1, 0,
                    '11111111-1111-1111-1111-111111111111', 'h', %L)$q$,
         :'ws_a', :'loc_a1', :sale_1),
  '23505');


-- ------------------------------------------------------------ idempotency ----

with attempt as (
  insert into sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                    created_by, payload_hash)
  values (:sale_1, :'ws_a', :'loc_a1', now(), 999.00, 0,
          '11111111-1111-1111-1111-111111111111', 'hash-sale-1')
  on conflict (id) do nothing
  returning 1
)
select chk('idempotency: on conflict (id) do nothing inserts no second row',
           (select count(*) from attempt) = 0
       and (select total_net from sale where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 100.00);

select chk('idempotency: payload_hash is retrievable to compare against a retry',
           (select payload_hash from sale where id = 'aaaaaaaa-0000-0000-0000-000000000001')
           = 'hash-sale-1');

select chk_raises(
  'idempotency: a bare re-insert of a committed id still raises',
  format($q$insert into sale (id, workspace_id, location_id, occurred_at, total_net,
              total_tax, created_by, payload_hash)
            values (%L, %L, %L, now(), 1, 0,
                    '11111111-1111-1111-1111-111111111111', 'h')$q$,
         'aaaaaaaa-0000-0000-0000-000000000001', :'ws_a', :'loc_a1'),
  '23505');


-- ------------------------------------------------- header / line integrity ----

select chk_raises(
  'lines: a line cannot attach to a header at another store',
  format($q$insert into sale_line (workspace_id, location_id, sale_id, variant_id,
              qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
              line_net, tax_amount, tax_rate)
            values (%L, %L, %L, %L, 1, 1, 'g', 0, 0, 0, 0)$q$,
         :'ws_a', :'loc_a2', :sale_1, :'var_a'),
  '23503');

select chk_raises(
  'lines: a line cannot reference a variant from another workspace',
  format($q$insert into sale_line (workspace_id, location_id, sale_id, variant_id,
              qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
              line_net, tax_amount, tax_rate)
            values (%L, %L, %L, gen_random_uuid(), 1, 1, 'g', 0, 0, 0, 0)$q$,
         :'ws_a', :'loc_a1', :sale_1),
  '23503');

select chk_raises(
  'lines: money must follow the sign of the quantity',
  format($q$insert into sale_line (workspace_id, location_id, sale_id, variant_id,
              qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
              line_net, tax_amount, tax_rate)
            values (%L, %L, %L, %L, 5, 5, 'g', 1, -5, 0, 0)$q$,
         :'ws_a', :'loc_a1', :sale_1, :'var_a'),
  '23514');

select chk_raises(
  'lines: a zero quantity is not a line',
  format($q$insert into sale_line (workspace_id, location_id, sale_id, variant_id,
              qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
              line_net, tax_amount, tax_rate)
            values (%L, %L, %L, %L, 0, 0, 'g', 1, 0, 0, 0)$q$,
         :'ws_a', :'loc_a1', :sale_1, :'var_a'),
  '23514');

select chk_raises(
  'lines: display quantity may not disagree in sign with the base quantity',
  format($q$insert into sale_line (workspace_id, location_id, sale_id, variant_id,
              qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
              line_net, tax_amount, tax_rate)
            values (%L, %L, %L, %L, -5, 5, 'g', 1, -5, 0, 0)$q$,
         :'ws_a', :'loc_a1', :sale_1, :'var_a'),
  '23514');

select chk_raises(
  'lines: a tax rate of 1 or more is rejected',
  format($q$insert into sale_line (workspace_id, location_id, sale_id, variant_id,
              qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
              line_net, tax_amount, tax_rate)
            values (%L, %L, %L, %L, 5, 5, 'g', 1, 5, 0, 1.0)$q$,
         :'ws_a', :'loc_a1', :sale_1, :'var_a'),
  '23514');

select chk_raises(
  'headers: a blank payload_hash is rejected',
  format($q$insert into sale (id, workspace_id, location_id, occurred_at, total_net,
              total_tax, created_by, payload_hash)
            values (gen_random_uuid(), %L, %L, now(), 1, 0,
                    '11111111-1111-1111-1111-111111111111', '  ')$q$,
         :'ws_a', :'loc_a1'),
  '23514');

select chk_raises(
  'headers: a reversal reason without a reversal_of is rejected',
  format($q$insert into sale (id, workspace_id, location_id, occurred_at, total_net,
              total_tax, created_by, payload_hash, reversal_reason)
            values (gen_random_uuid(), %L, %L, now(), 1, 0,
                    '11111111-1111-1111-1111-111111111111', 'h', 'porque si')$q$,
         :'ws_a', :'loc_a1'),
  '23514');

-- The vocabulary is closed, which is the entire reason it is an enum rather than
-- text: a reason the analytics asset has never heard of must not reach the table.
select chk_raises(
  'waste: a reason outside the vocabulary is rejected',
  format($q$insert into waste_line (workspace_id, location_id, waste_id, variant_id,
              qty_base, qty_display, qty_display_unit, unit_price_net_per_base,
              line_net, tax_amount, tax_rate, reason, unit_cost_net_per_base)
            values (%L, %L, %L, %L, 5, 5, 'g', 1, 5, 0, 0, 'se echo a perder', 1)$q$,
         :'ws_a', :'loc_a1', :was_1, :'var_a'),
  '22P02');

select chk('waste: every value of the vocabulary is accepted',
           (select count(*) from unnest(enum_range(null::public.waste_reason))) = 5);


-- ----------------------------------------------------------- immutability ----
-- The superuser is the strongest caller there is; if the guard holds here it
-- holds for the security definer RPCs of 0005, which is what it exists for.

select chk_raises(
  'immutability: a committed sale cannot be updated, even as superuser',
  format($q$update sale set total_net = 1 where id = %L$q$, :sale_1),
  '23001');

select chk_raises(
  'immutability: a committed sale cannot be deleted, even as superuser',
  format($q$delete from sale where id = %L$q$, :sale_1),
  '23001');

select chk_raises(
  'immutability: a committed purchase_line cannot be updated',
  $q$update purchase_line set qty_base = 1$q$,
  '23001');

select chk_raises(
  'immutability: a committed waste_line cannot be deleted',
  $q$delete from waste_line$q$,
  '23001');


-- ------------------------------------------------------------------- RLS -----
-- Under `set role authenticated`. As postgres every check below passes
-- vacuously, because the superuser bypasses RLS entirely.

-- --- staff assigned to A1 ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select chk('RLS staff@A1: sees the sale at their store',        (select count(*) from sale) = 3);
select chk('RLS staff@A1: sees the sale line at their store',   (select count(*) from sale_line) = 1);
select chk('RLS staff@A1: sees the waste header at their store',(select count(*) from waste) = 1);
select chk('RLS staff@A1: is BLIND to purchase (cost)',         (select count(*) from purchase) = 0);
select chk('RLS staff@A1: is BLIND to purchase_line (cost)',    (select count(*) from purchase_line) = 0);
select chk('RLS staff@A1: is BLIND to waste_line (cost snapshot)',
                                                                (select count(*) from waste_line) = 0);

select chk_raises('grants: staff cannot insert a sale directly',
  format($q$insert into sale (id, workspace_id, location_id, occurred_at, total_net,
              total_tax, created_by, payload_hash)
            values (gen_random_uuid(), %L, %L, now(), 1, 0,
                    '22222222-2222-2222-2222-222222222222', 'h')$q$,
         :'ws_a', :'loc_a1'),
  '42501');
commit;

-- --- staff assigned to A2 only: location isolation inside one workspace ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
set local role authenticated;

select chk('RLS staff@A2: sees no sale from the other store',      (select count(*) from sale) = 0);
select chk('RLS staff@A2: sees no sale_line from the other store', (select count(*) from sale_line) = 0);
select chk('RLS staff@A2: sees no waste from the other store',     (select count(*) from waste) = 0);
commit;

-- --- manager in workspace A ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;

select chk('RLS manager@A: sees purchase',      (select count(*) from purchase) = 1);
select chk('RLS manager@A: sees purchase_line', (select count(*) from purchase_line) = 1);
select chk('RLS manager@A: sees waste_line',    (select count(*) from waste_line) = 1);
select chk('RLS manager@A: sees both stores'' sales',
           (select count(*) from sale) = 3);

select chk_raises('grants: a manager cannot update a committed sale',
  format($q$update sale set total_net = 0 where id = %L$q$, :sale_1),
  '42501');
commit;

-- --- owner of workspace B: a different tenant ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;

select chk('RLS tenant B: zero rows from every transaction table of tenant A',
           (select count(*) from sale)          = 0
       and (select count(*) from sale_line)     = 0
       and (select count(*) from purchase)      = 0
       and (select count(*) from purchase_line) = 0
       and (select count(*) from waste)         = 0
       and (select count(*) from waste_line)    = 0);
commit;


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

-- Raised rather than `\quit 1`, so the non-zero exit comes from ON_ERROR_STOP
-- and does not depend on which psql minor version the runner happens to ship.
do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where not passed;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
