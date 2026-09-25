-- ============================================================================
-- Behavioural verification for 0040 — any member may read what the shop paid
-- ============================================================================
-- ADR-035 §2.7, §2.6, §9. docs/PLAN.md task `5g-ii-b`.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0040_purchase_visible_to_every_member.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED, AND WHY THE SHAPE OF THE FILE IS UNUSUAL
-- ----------------------------------------------------------------------------
-- `0040` is two `alter policy` statements. There is no function body to
-- transcribe and no data to migrate, so the usual *"what did NOT move"* section
-- is most of the file rather than a coda — because on a POLICY change the whole
-- risk is collateral: a clause dropped that was not meant to go, or a sibling
-- table quietly carried along.
--
-- ⚠️⚠️ AND EVERY READ BELOW RUNS UNDER `set local role authenticated`. As
-- `postgres` the superuser bypasses RLS entirely and **every one of these checks
-- would pass without the migration existing at all** — the vacuous green ADR-035
-- §9 exists to refuse, and `CLAUDE.md` names it as a non-negotiable.
--
-- ----------------------------------------------------------------------------
-- ⚠️ SECTION 3 IS THE ONE THAT COULD NOT HAVE BEEN WRITTEN BEFORE TODAY
-- ----------------------------------------------------------------------------
-- The location wall on `purchase` has been unprovable since `0003`:
-- `my_locations()` grants a manager every location by role, so the only actor who
-- could be refused a row was refused by the ROLE gate first, and
-- `supabase/pgtap/05_location_isolation_reads.sql` says so in its own words.
-- With the gate off, a cashier at the wrong store is exactly that actor.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
-- ⚠️ THE GRANTS ARE NOT OPTIONAL AND THEY ARE EASY TO FORGET. Section 3 calls `chk`
-- from inside `set local role authenticated`, and without these the suite dies on
-- *"permission denied for table _verify"* — which reads like an RLS finding and is
-- a harness fault. `0003`'s suite carries the identical three lines.
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

-- The applied predicate of one policy, read from the catalog and never from a file.
create function public._qual(p_table text, p_policy text)
returns text language sql as $$
  select qual::text from pg_policies
   where schemaname = 'public' and tablename = p_table and policyname = p_policy;
$$;

-- ----------------------------------------------------------------------------
-- 1. The two policies say what 0040 says they say
-- ----------------------------------------------------------------------------
select public.chk('1.1 purchase_select no longer carries a role gate',
  public._qual('purchase', 'purchase_select') !~* 'has_role',
  public._qual('purchase', 'purchase_select'));

select public.chk('1.2 purchase_line_select no longer carries a role gate',
  public._qual('purchase_line', 'purchase_line_select') !~* 'has_role',
  public._qual('purchase_line', 'purchase_line_select'));

-- ⚠️⚠️ THE HALF THAT WOULD BE A DISASTER TO GET WRONG, AND IT IS WHY THIS FILE
-- EXISTS. Dropping the role clause is the intent; dropping the LOCATION clause
-- with it would open every store's deliveries to every cashier, and **the app
-- would look identical** — Comprar reads one provider at a time and would simply
-- be right more often.
select public.chk('1.3 purchase_select STILL carries the location wall (§2.6)',
  public._qual('purchase', 'purchase_select') ~* 'my_locations',
  public._qual('purchase', 'purchase_select'));

select public.chk('1.4 purchase_line_select STILL carries the location wall (§2.6)',
  public._qual('purchase_line', 'purchase_line_select') ~* 'my_locations',
  public._qual('purchase_line', 'purchase_line_select'));

select public.chk('1.5 both still carry the workspace wall',
  public._qual('purchase', 'purchase_select') ~* 'my_workspaces'
  and public._qual('purchase_line', 'purchase_line_select') ~* 'my_workspaces');

-- ⚠️ `alter policy` CANNOT CHANGE THESE AND THAT IS WHY IT WAS USED — asserted
-- anyway, because *"it cannot"* is a claim about a statement I did not write.
select public.chk('1.6 both are still SELECT policies for authenticated, not widened to a command or a role',
  (select count(*) from pg_policies
    where schemaname = 'public'
      and policyname in ('purchase_select', 'purchase_line_select')
      and cmd = 'SELECT'
      and roles::text = '{authenticated}') = 2);

-- ----------------------------------------------------------------------------
-- 2. What did NOT move — the collateral this migration could have caused
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE OWNER TRADED THE COST OF A DELIVERY. He did not trade the cost of
-- stock on the shelf, the cost of what was thrown away, or margin reporting — and
-- each of those is a separate fence that a careless `alter` could have swept up.
select public.chk('2.1 stock_batch keeps its role gate — cost on the SHELF is still manager+',
  public._qual('stock_batch', 'stock_batch_select') ~* 'has_role',
  public._qual('stock_batch', 'stock_batch_select'));

select public.chk('2.2 stock_movement keeps its role gate',
  public._qual('stock_movement', 'stock_movement_select') ~* 'has_role',
  public._qual('stock_movement', 'stock_movement_select'));

select public.chk('2.3 waste_line keeps its role gate — the cost of waste is still manager+',
  public._qual('waste_line', 'waste_line_select') ~* 'has_role',
  public._qual('waste_line', 'waste_line_select'));

select public.chk('2.4 failed_write is still owner-only',
  public._qual('failed_write', 'failed_write_select') ~* 'has_role');

-- ⚠️ THE COUNT IS THE ANTI-COLLATERAL ASSERTION: `alter policy` replaces a
-- predicate and creates nothing, so the total must not have moved. `0032`'s seed
-- check pins the same number independently.
select public.chk('2.5 still exactly 41 policies — 0040 created and dropped none',
  (select count(*) from pg_policies where schemaname = 'public') = 41,
  format('found %s', (select count(*) from pg_policies where schemaname = 'public')));

-- ⚠️ AND THE VIEW WAS NOT TOUCHED. `provider_price_memory` reaches a cashier
-- because of the two policies above and NOT because anything was written into it;
-- a fence restated inside the view is the shape `0008` refused by name.
select public.chk('2.6 provider_price_memory still states no fence of its own',
  pg_get_viewdef('public.provider_price_memory'::regclass) !~* 'has_role');

select public.chk('2.7 and it is still security_invoker, which is what makes 0040 reach it',
  (select reloptions::text from pg_class
    where oid = 'public.provider_price_memory'::regclass) ~* 'security_invoker=(true|on)');

-- ----------------------------------------------------------------------------
-- 3. Under RLS, as three real actors — the half a superuser cannot see
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE FIXTURE IS PLANTED HERE AND NOT READ OUT OF THE SEED, AND THAT WAS
-- MEASURED RATHER THAN ASSUMED: `supabase/seeds/` creates **zero**
-- `workspace_member` rows, so there is no cashier in a reset database to point at.
-- `0003`'s suite plants its own for exactly this reason and this one follows it.
--
-- ⚠️ THE USER UUIDS ARE THIS FILE'S OWN AND ARE DELIBERATELY DISTINCT FROM
-- `0003`'s. `_cleanup.sql` truncates between suites, but two suites sharing a uuid
-- is how a fixture starts passing for the wrong reason.
--
-- ⚠️ AND THE ACTORS ARE WHAT MAKE THIS SECTION POSSIBLE AT ALL: a cashier at the
-- store the delivery arrived at, and a cashier at a DIFFERENT store. The second one
-- is the actor `supabase/pgtap/05_location_isolation_reads.sql` says cannot exist
-- while `purchase` is role-gated — which is true, and stopped being true today.
-- ⚠️ THE CODE IS EIGHT CHARACTERS FROM CROCKFORD'S ALPHABET — `workspace_code_shape`
-- is `^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$` (no I, L, O or U, because they are read aloud
-- over WhatsApp). A six-character code was this fixture's first attempt and the
-- constraint refused it, which is the constraint doing its job on a test.
-- ⚠️ `workspace_member.user_id` REFERENCES `auth.users`, so the actors have to exist
-- there first — `0003`'s suite does the same and it is the second constraint this
-- fixture met by being refused rather than by reading ahead.
insert into auth.users (id, email) values
  ('0a0a0a0a-0000-4000-8000-000000000001', 'caja.centro.0040@example.mx'),
  ('0a0a0a0a-0000-4000-8000-000000000002', 'caja.norte.0040@example.mx'),
  ('0a0a0a0a-0000-4000-8000-000000000003', 'gerente.0040@example.mx');

insert into public.workspace (display_name, code) values ('Verificación 0040', 'V0040XYZ');
select id as ws from public.workspace where code = 'V0040XYZ' \gset

insert into public.location (workspace_id, name) values (:'ws', 'Centro 0040'), (:'ws', 'Norte 0040');
select id as loc_1 from public.location where workspace_id = :'ws' and name = 'Centro 0040' \gset
select id as loc_2 from public.location where workspace_id = :'ws' and name = 'Norte 0040' \gset

insert into public.workspace_member (workspace_id, user_id, role) values
  (:'ws', '0a0a0a0a-0000-4000-8000-000000000001', 'staff'),
  (:'ws', '0a0a0a0a-0000-4000-8000-000000000002', 'staff'),
  (:'ws', '0a0a0a0a-0000-4000-8000-000000000003', 'manager');

insert into public.member_location (workspace_id, member_id, location_id)
select :'ws', wm.id, :'loc_1' from public.workspace_member wm
 where wm.user_id = '0a0a0a0a-0000-4000-8000-000000000001';
insert into public.member_location (workspace_id, member_id, location_id)
select :'ws', wm.id, :'loc_2' from public.workspace_member wm
 where wm.user_id = '0a0a0a0a-0000-4000-8000-000000000002';

insert into public.provider (workspace_id, name) values (:'ws', 'Bodega 0040');
select id as prov from public.provider where workspace_id = :'ws' and name = 'Bodega 0040' \gset

insert into public.product_family (workspace_id, name) values (:'ws', 'Fruta 0040');
select id as fam from public.product_family where workspace_id = :'ws' and name = 'Fruta 0040' \gset

insert into public.product_variant
  (workspace_id, family_id, name, base_unit_code, purchase_unit_code, sell_unit_code, price_unit_code)
values (:'ws', :'fam', 'Manzana 0040', 'g', 'kg', 'kg', 'kg');
select id as var from public.product_variant where workspace_id = :'ws' and name = 'Manzana 0040' \gset

-- ⚠️ THE DELIVERY IS AT STORE 1 ONLY. That is what makes the store-wall assertion
-- below a measurement rather than a coincidence.
select '0a0a0a0a-0000-4000-8000-00000000000d'::uuid as pur \gset
insert into public.purchase
  (id, workspace_id, location_id, provider_id, occurred_at, total_net, total_tax, created_by, payload_hash)
values (:'pur', :'ws', :'loc_1', :'prov', now(), 60.00, 9.60,
        '0a0a0a0a-0000-4000-8000-000000000003', 'h0040');
insert into public.purchase_line
  (workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display, qty_display_unit,
   unit_price_net_per_base, line_net, tax_amount, tax_rate)
values (:'ws', :'loc_1', :'pur', :'var', 1000, 1, 'kg', 0.060000, 60.00, 9.60, 0.16);

select public.chk('3.0 the fixture planted one delivery at store 1',
  (select count(*) from public.purchase where workspace_id = :'ws') = 1);

-- --- the cashier at the store the delivery arrived at ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"0a0a0a0a-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select public.chk('3.1 a cashier at her own store now SEES the delivery — the ruling, measured',
  (select count(*) from public.purchase) = 1);

select public.chk('3.2 and she sees its LINE, which is where unit_price_net_per_base is',
  (select count(*) from public.purchase_line) = 1);

-- ⚠️⚠️ THIS IS THE ONE COMPRAR ACTUALLY NEEDS, AND IT IS NOT IMPLIED BY 3.1 AND 3.2.
-- `provider_price_memory` is a `security_invoker` view that JOINS both tables, so it
-- stayed empty for her while EITHER was gated — a migration that widened only one
-- would pass 3.1 or 3.2 and leave Comprar exactly as blank as before.
select public.chk('3.3 ⚠️ provider_price_memory is no longer empty for her — Comprar prefills at last',
  (select count(*) from public.provider_price_memory) = 1);

select public.chk('3.4 she is STILL blind to waste_line — 0040 moved deliveries only',
  (select count(*) from public.waste_line) = 0);

select public.chk('3.5 and still blind to stock_batch — cost on the SHELF did not move',
  (select count(*) from public.stock_batch) = 0);
commit;

-- --- the cashier at the OTHER store: the location wall, provable at last ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"0a0a0a0a-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

-- ⚠️⚠️ THIS ZERO IS THE LOCATION CLAUSE AND NOTHING ELSE, WHICH IS NEW TODAY. Until
-- `0040` a cashier's zero on `purchase` was the ROLE gate refusing her first, and
-- `05_location_isolation_reads.sql` records that no actor could separate the two.
select public.chk('3.6 the store wall on a delivery: a cashier sees nothing from a store she is not at',
  (select count(*) from public.purchase) = 0);

select public.chk('3.7 and nothing of its lines either',
  (select count(*) from public.purchase_line) = 0);

-- ⚠️ AND THE PREFILL IS EMPTY FOR HER TOO, which is the same wall reaching the view.
-- **It is the state Comprar draws as §2.8's new pairing** — correct here, because
-- this store really has never bought it.
select public.chk('3.8 so her price memory is empty — and for a reason a screen may render',
  (select count(*) from public.provider_price_memory) = 0);
commit;

-- --- the manager: nothing this ruling did took anything away ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"0a0a0a0a-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select public.chk('3.9 a manager still sees the delivery, at every store, as before 0040',
  (select count(*) from public.purchase) = 1
  and (select count(*) from public.purchase_line) = 1);

select public.chk('3.10 and her prefill is unchanged',
  (select count(*) from public.provider_price_memory) = 1);
commit;

-- ----------------------------------------------------------------------------
-- The report
-- ----------------------------------------------------------------------------
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
