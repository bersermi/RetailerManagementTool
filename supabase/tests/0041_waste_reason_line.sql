-- ============================================================================
-- Behavioural verification for 0041 — waste_reason_line
-- ============================================================================
-- ADR-035 §2.7, §2.8, §9. docs/PLAN.md task `6a-ii-a`.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0041_waste_reason_line.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `0041` is one view and one grant, and it is the FIRST `security definer` view
-- in this schema. That makes the shape of this file unusual in the same way
-- `0040`'s was: there is no function body to transcribe, and the whole risk is
-- that the thing works TOO well — a definer view bypasses RLS on every table it
-- reads, so the tenancy wall exists only as a `where` clause somebody wrote by
-- hand, and nothing in Postgres will complain if it is wrong.
--
-- ⚠️⚠️ SO SECTION 3 IS THE FILE. Sections 1 and 2 read the catalog and are
-- cheap; section 3 puts four real actors under `set local role authenticated`
-- and is the only thing here that could ever have failed.
--
-- ⚠️⚠️ AND EVERY READ IN SECTION 3 RUNS UNDER `set local role authenticated`.
-- As `postgres` the superuser bypasses RLS entirely and **every isolation check
-- below would pass without the view's predicate existing at all** — the vacuous
-- green ADR-035 §9 refuses and `CLAUDE.md` names as non-negotiable.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT POSTGREST. The embed shape, the two-key line order and the
-- `::text` casts the client sends are HTTP facts, and
-- `docs/checks/6a-ii-a-waste-list-contract.sh` is the only instrument that can
-- see them. A view that is correct in SQL and unembeddable over the wire would
-- pass every check in this file.
--
-- ⚠️ NOTHING ABOUT THE SCREEN. Whether a quantity with no peso beside it reads
-- as a finished row is `R9`'s and the owner's phone decides it.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ HOW TO READ A FAILURE OF THIS FILE, BECAUSE IT HAS **TWO** SHAPES AND ONE
-- OF THEM LOOKS LIKE A PASS TO A LINE-COUNTING HARNESS
-- ----------------------------------------------------------------------------
-- A wrong ANSWER lands as a `FAIL` row in the report at the bottom and the final
-- `do` block raises. A missing COLUMN does not get that far: `select … variant_name`
-- raises `42703`, `ON_ERROR_STOP` aborts, **and the report table is never printed at
-- all.** Falsification F6 dropped `variant_name` from the view and produced
-- ZERO `FAIL` lines with `EXIT=3`.
--
-- ⚠️ **SO THE VERDICT ON THIS FILE IS ITS EXIT CODE AND NEVER A COUNT OF `FAIL`
-- LINES.** `db.yml` is already right about this — it runs psql with
-- `ON_ERROR_STOP=1` and a non-zero exit fails the job — and this note exists
-- because the session that wrote the falsifications read F6 as a gap for a minute.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
-- ⚠️ THE GRANTS ARE NOT OPTIONAL AND THEY ARE EASY TO FORGET. Section 3 calls
-- `chk` from inside `set local role authenticated`, and without these the suite
-- dies on *"permission denied for table _verify"* — which reads like an RLS
-- finding and is a harness fault. `0003` and `0040` carry the identical lines.
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

-- The applied definition of one view, likewise.
create function public._viewdef(p_view text)
returns text language sql as $$
  select pg_get_viewdef(('public.' || p_view)::regclass)::text;
$$;
grant execute on function public._viewdef(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 1. The view is the thing 0041 says it is
-- ----------------------------------------------------------------------------
select public.chk('1.1 public.waste_reason_line exists and is a view',
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'waste_reason_line' and c.relkind = 'v') = 1);

-- ⚠️⚠️ THE ONE ASSERTION THIS WHOLE ROW TURNS ON, AND IT IS SPELLED AS THE
-- ABSENCE OF `true` RATHER THAN THE PRESENCE OF `false`: a view created with no
-- `security_invoker` option at all has `reloptions is null` and behaves as a
-- definer view, so `~* 'security_invoker=false'` would be RED on a correct-behaving
-- view and GREEN on nothing. **What must be true is that invoker is not ON.**
select public.chk('1.2 it is NOT security_invoker — the whole point, and an invoker view here reads ZERO rows for a cashier',
  coalesce((select reloptions::text from pg_class
             where oid = 'public.waste_reason_line'::regclass), '')
    !~* 'security_invoker=(true|on)',
  coalesce((select reloptions::text from pg_class
             where oid = 'public.waste_reason_line'::regclass), '(no reloptions)'));

-- ⚠️ AND IT IS THE ONLY ONE. SIX views were applied before this file and every
-- one of them is `security_invoker = true`; §2.7 fixed that. ⚠️ **The count is the
-- DATABASE's** — `select count(*) … where relkind = 'v'` — and the first writing of
-- this suite said *fourteen*, which was `grep -c` over the migrations counting each
-- `create or replace` again ([[counts-belong-to-the-runner]]). A SECOND
-- definer view added without a ruling is the thing this assertion is for, and
-- nothing else in this repository can see it — `supabase/pgtap/01_rls_coverage.sql`
-- joins `relkind = 'r'`, so a view is invisible to the RLS guard by construction.
select public.chk('1.3 it is the ONLY view in public that is not security_invoker',
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and coalesce(c.reloptions::text, '') !~* 'security_invoker=(true|on)') = 1,
  (select coalesce(string_agg(c.relname, ', '), '(none)')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and coalesce(c.reloptions::text, '') !~* 'security_invoker=(true|on)'));

-- ⚠️⚠️ THE TENANCY WALL IS IN THE BODY, BECAUSE THERE IS NOWHERE ELSE FOR IT TO
-- BE. On the other six views `security_invoker` delegated this to the base
-- tables; here the `where` clause IS the policy.
select public.chk('1.4 it states the workspace wall itself',
  public._viewdef('waste_reason_line') ~* 'my_workspaces',
  public._viewdef('waste_reason_line'));

select public.chk('1.5 it states the location wall itself (§2.6)',
  public._viewdef('waste_reason_line') ~* 'my_locations',
  public._viewdef('waste_reason_line'));

-- ⚠️ AND IT MUST **NOT** RESTATE THE ROLE GATE, which is the difference between
-- reading (a) and not shipping this row at all. A `has_role` in here would make
-- the view identical to the base table and every screen would read empty.
select public.chk('1.6 it carries NO has_role — reading (a), which reaches AROUND the fence',
  public._viewdef('waste_reason_line') !~* 'has_role',
  public._viewdef('waste_reason_line'));

-- ⚠️⚠️ NO MONEY COLUMN OF ANY KIND, ASSERTED BY NAME AND BY COUNT. The cost is
-- the ruling; the retail figures are área 9's ruling of 2026-09-14 and C8.8.
-- **The property being bought is that no projection of this view yields a cost.**
select public.chk('1.7 no cost column, and no retail money column either',
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'waste_reason_line'
      and column_name in ('unit_cost_net_per_base', 'unit_price_net_per_base',
                          'line_net', 'tax_amount', 'tax_rate')) = 0,
  (select coalesce(string_agg(column_name, ', '), '(none)')
     from information_schema.columns
    where table_schema = 'public' and table_name = 'waste_reason_line'
      and column_name in ('unit_cost_net_per_base', 'unit_price_net_per_base',
                          'line_net', 'tax_amount', 'tax_rate')));

-- ⚠️ THE ELEVEN COLUMNS THE CLIENT AND THE CONTRACT CHECK BOTH DEPEND ON,
-- asserted as a SET so a column added later is a deliberate act.
select public.chk('1.8 exactly the eleven columns the reading names',
  (select array_agg(column_name::text order by column_name)
     from information_schema.columns
    where table_schema = 'public' and table_name = 'waste_reason_line')
  = array['id','location_id','occurred_at','qty_base','qty_display',
          'qty_display_unit','reason','variant_id','variant_name',
          'waste_id','workspace_id'],
  (select string_agg(column_name, ',' order by column_name)
     from information_schema.columns
    where table_schema = 'public' and table_name = 'waste_reason_line'));

-- ⚠️⚠️ `anon` IS THE ONE THAT MATTERS AND IT IS ASSERTED ON `SELECT` ALONE.
-- Measured on the applied schema: `anon` DOES hold `REFERENCES`, `TRIGGER` and
-- `TRUNCATE` on this view, inherited from the schema's default privileges, and
-- all three are meaningless on a view. **An assertion over every privilege type
-- would therefore be red on a correct view**, which is how a guard gets loosened
-- by whoever next reads it. `SELECT` is the privilege that reads rows, and the two
-- holders must be `authenticated` and the owner — exactly what
-- `product_margin_daily` and `provider_price_memory` return.
select public.chk('1.9 SELECT is held by authenticated and the owner, and by anon NEVER',
  (select array_agg(grantee::text order by grantee) from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'waste_reason_line'
      and privilege_type = 'SELECT')
  = array['authenticated','postgres'],
  coalesce((select string_agg(grantee, ',' order by grantee)
     from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'waste_reason_line'
      and privilege_type = 'SELECT'), '(none)'));

-- ----------------------------------------------------------------------------
-- 2. What did NOT move
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE OWNER RULED THAT A CASHIER MAY SEE THE LOSS. He did not rule that
-- `waste_line` widens, and (a) is the reading that does not need it to.
select public.chk('2.1 waste_line_select STILL carries has_role — the fence is intact',
  public._qual('waste_line', 'waste_line_select') ~* 'has_role',
  public._qual('waste_line', 'waste_line_select'));

select public.chk('2.2 waste_select is still open to every member, as 0003 left it',
  public._qual('waste', 'waste_select') !~* 'has_role',
  public._qual('waste', 'waste_select'));

select public.chk('2.3 stock_batch and stock_movement keep their gates — cost on the SHELF did not move',
  public._qual('stock_batch', 'stock_batch_select') ~* 'has_role'
  and public._qual('stock_movement', 'stock_movement_select') ~* 'has_role');

-- ⚠️ A VIEW CARRIES NO POLICY, so this migration cannot have created one — and
-- `0040`'s suite pins the same number independently, which is what makes a change
-- in either direction visible.
select public.chk('2.4 exactly 42 policies — a view creates none (41 then; 0043 added pilot_reading_select)',
  (select count(*) from pg_policies where schemaname = 'public') = 42,
  format('found %s', (select count(*) from pg_policies where schemaname = 'public')));

-- ⚠️ AND THE COST VIEW NOBODY MAY READ IS UNTOUCHED: `waste_share_of_purchases`
-- (`0011`) still states its own manager floor, so widening the LINE-grain read did
-- not widen the RATE.
-- ⚠️ THE VIEW `0011` SHIPS IS NAMED `product_waste_daily`, NOT
-- `waste_share_of_purchases` — that is the MIGRATION's name and the first writing
-- of this line used it, which is a relation that does not exist and failed loudly.
select public.chk('2.5 product_waste_daily (0011) still states its own manager floor',
  public._viewdef('product_waste_daily') ~* 'has_role',
  'the rate stays manager+ — área 9''s ruling, and 0011''s own header');

select public.chk('2.6 product_margin_daily is still security_invoker AND still floors on has_role',
  (select reloptions::text from pg_class
    where oid = 'public.product_margin_daily'::regclass) ~* 'security_invoker=(true|on)'
  and public._viewdef('product_margin_daily') ~* 'has_role');

-- ----------------------------------------------------------------------------
-- 3. Under RLS, as four real actors — the half a superuser cannot see
-- ----------------------------------------------------------------------------
-- ⚠️ THE FIXTURE IS PLANTED HERE AND NOT READ OUT OF THE SEED: `supabase/seeds/`
-- creates ZERO `workspace_member` rows, so there is no cashier in a reset database
-- to point at. `0003`'s and `0040`'s suites plant their own for the same reason.
--
-- ⚠️ THE USER UUIDS ARE THIS FILE'S OWN AND ARE DELIBERATELY DISTINCT from every
-- other suite's. `_cleanup.sql` truncates between suites; two suites sharing a uuid
-- is how a fixture starts passing for the wrong reason.
--
-- THE FOUR ACTORS, and each one exists to make a different claim falsifiable:
--   the OWNER of workspace A     — manager-and-above, reads the base table too
--   CASHIER 1, at loc_1          — the person this view exists for
--   CASHIER 2, at loc_2          — the location wall, §2.6
--   the OWNER of workspace B     — the tenancy wall, and the one a definer view
--                                  could silently open

insert into auth.users (id, email) values
  ('0b0b0b0b-0000-4000-8000-000000000001', 'owner.a.0041@example.mx'),
  ('0b0b0b0b-0000-4000-8000-000000000002', 'cashier1.0041@example.mx'),
  ('0b0b0b0b-0000-4000-8000-000000000003', 'cashier2.0041@example.mx'),
  ('0b0b0b0b-0000-4000-8000-000000000004', 'owner.b.0041@example.mx');

\set owner_a   '''0b0b0b0b-0000-4000-8000-000000000001'''
\set cashier_1 '''0b0b0b0b-0000-4000-8000-000000000002'''
\set cashier_2 '''0b0b0b0b-0000-4000-8000-000000000003'''
\set owner_b   '''0b0b0b0b-0000-4000-8000-000000000004'''

select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000001","role":"authenticated"}', false);
select onboard_workspace('Tienda 0041 A') as ws_a \gset
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000004","role":"authenticated"}', false);
select onboard_workspace('Tienda 0041 B') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc_1 from location where workspace_id = :'ws_a' \gset
insert into location (workspace_id, name) values (:'ws_a', 'Sucursal Sur');
select id as loc_2 from location
 where workspace_id = :'ws_a' and name = 'Sucursal Sur' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :cashier_1, 'staff'),
  (:'ws_a', :cashier_2, 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_1' from workspace_member wm where wm.user_id = :cashier_1;
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_2' from workspace_member wm where wm.user_id = :cashier_2;

insert into product_family (workspace_id, name) values (:'ws_a', 'Verdura');
select id as fam from product_family where workspace_id = :'ws_a' \gset

-- ⚠️ THE NAMES ARE CHOSEN SO THE ORDER ASSERTIONS DISCRIMINATE: alphabetically
-- Aguacate < Jitomate < Zanahoria, and they are INSERTED in the opposite order so
-- heap order cannot be mistaken for a sort ([[assert-against-a-calendar-not-the-array]]).
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam', 'Zanahoria', 'pza','pza','pza','pza', 0.0000),
  (:'ws_a', :'fam', 'Jitomate',  'pza','pza','pza','pza', 0.0000),
  (:'ws_a', :'fam', 'Aguacate',  'pza','pza','pza','pza', 0.0000);

select id as var_za from product_variant where workspace_id=:'ws_a' and name='Zanahoria' \gset
select id as var_ji from product_variant where workspace_id=:'ws_a' and name='Jitomate'  \gset
select id as var_ag from product_variant where workspace_id=:'ws_a' and name='Aguacate'  \gset
select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset

-- Stock on the shelf at BOTH stores, by the same path a shop uses (`0018`).
\set pur_1 '''cccc0041-0000-4000-8000-000000000001'''
\set pur_2 '''cccc0041-0000-4000-8000-000000000002'''
begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select record_purchase(:pur_1::uuid, :'loc_1'::uuid, :'prov_a'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_za'::uuid, 'qty_display', 50, 'unit_price_net_per_base', 2.00),
           jsonb_build_object('variant_id', :'var_ji'::uuid, 'qty_display', 50, 'unit_price_net_per_base', 3.00),
           jsonb_build_object('variant_id', :'var_ag'::uuid, 'qty_display', 50, 'unit_price_net_per_base', 9.00)),
         now() - interval '36 hours', true) as r \gset
select record_purchase(:pur_2::uuid, :'loc_2'::uuid, :'prov_a'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_ji'::uuid, 'qty_display', 20, 'unit_price_net_per_base', 3.00)),
         now() - interval '36 hours', true) as r \gset
commit;

-- ⚠️⚠️ THE WRITE-OFF CASHIER 1 KEYS HERSELF, AND SHE KEYS A MIXED-CAUSE DOCUMENT
-- ON PURPOSE. `6a-i`'s screen only sends one cause per document, but `record_waste`
-- accepts a mix (measured), so a document with the SAME product under TWO causes is
-- reachable — and it is the only shape that can tell a one-key line order from a
-- two-key one.
\set wst_1 '''dddd0041-0000-4000-8000-000000000001'''
\set wst_2 '''dddd0041-0000-4000-8000-000000000002'''
begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:wst_1::uuid, :'loc_1'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_za'::uuid, 'qty_display', 4,
             'unit_price_gross_per_base', 5.00, 'reason', 'dañado'),
           jsonb_build_object('variant_id', :'var_ag'::uuid, 'qty_display', 3,
             'unit_price_gross_per_base', 20.00, 'reason', 'merma de preparación'),
           jsonb_build_object('variant_id', :'var_ag'::uuid, 'qty_display', 2,
             'unit_price_gross_per_base', 20.00, 'reason', 'error de captura')),
         now() - interval '3 hours', false) as r \gset
commit;

-- A second write-off at the OTHER store, so cashier 1's read can be shown to
-- exclude something rather than merely to be small.
begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select record_waste(:wst_2::uuid, :'loc_2'::uuid,
         jsonb_build_array(
           jsonb_build_object('variant_id', :'var_ji'::uuid, 'qty_display', 7,
             'unit_price_gross_per_base', 8.00, 'reason', 'caducado')),
         now() - interval '2 hours', false) as r \gset
commit;

-- --- cashier 1: the person this view exists for ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

-- ⚠️⚠️ THE CONTROL, AND WITHOUT IT EVERY ASSERTION BELOW IS VACUOUS. If she could
-- read `waste_line` directly this view would be solving nothing, and a green run
-- would prove only that the fixture exists.
select public.chk('3.1 she reads ZERO rows of waste_line — the fence this view exists to reach around',
  (select count(*) from public.waste_line) = 0,
  format('read %s', (select count(*) from public.waste_line)));

select public.chk('3.2 and she DOES see the header, which is 0003''s asymmetry',
  (select count(*) from public.waste) = 1);

select public.chk('3.3 through the view she reads her own three lines',
  (select count(*) from public.waste_reason_line) = 3,
  format('read %s', (select count(*) from public.waste_reason_line)));

select public.chk('3.4 with the causes she keyed, and the enum''s own DECLARATION order',
  (select array_agg(reason::text order by reason)
     from public.waste_reason_line)
  = array['dañado','merma de preparación','error de captura'],
  (select string_agg(reason::text, ' < ' order by reason) from public.waste_reason_line));

-- ⚠️⚠️ AND THE PAIR ABOVE IS **NOT** ALPHABETICAL, WHICH IS THE POINT AND IS
-- ASSERTED RATHER THAN LEFT TO BE NOTICED: `merma de preparación` is declared
-- third and `error de captura` fifth, so declaration order puts merma FIRST while
-- the alphabet puts error first. A picker's order and a breakdown's order are the
-- same order or nothing can see that they differ.
select public.chk('3.5 and that order is provably NOT the alphabet',
  (select array_agg(reason::text order by reason) from public.waste_reason_line)
  <> (select array_agg(reason::text order by reason::text) from public.waste_reason_line),
  (select string_agg(reason::text, ' < ' order by reason::text) from public.waste_reason_line));

select public.chk('3.6 the quantities are hers, as keyed',
  (select array_agg(qty_display order by qty_display)
     from public.waste_reason_line) = array[2.000, 3.000, 4.000]::numeric[]);

select public.chk('3.7 the product''s name is on the row — no second read, no embed',
  (select array_agg(distinct variant_name order by variant_name)
     from public.waste_reason_line) = array['Aguacate','Zanahoria']);

-- ⚠️ THE TWO-KEY ORDER, IN SQL. The HTTP spelling is the contract check's; this
-- asserts the ORDERING IS POSSIBLE at all — two lines of one product under two
-- causes, which a single key leaves in heap order.
select public.chk('3.8 the same product twice under two causes orders deterministically on name THEN reason',
  (select array_agg(variant_name || '/' || reason::text order by variant_name, reason)
     from public.waste_reason_line)
  = array['Aguacate/merma de preparación','Aguacate/error de captura','Zanahoria/dañado'],
  (select string_agg(variant_name || '/' || reason::text, ', ' order by variant_name, reason)
     from public.waste_reason_line));

select public.chk('3.9 the document''s instant is on the row, joined from the header',
  (select count(*) from public.waste_reason_line l
     join public.waste w on w.id = l.waste_id
    where l.occurred_at = w.occurred_at) = 3);

-- ⚠️⚠️ THE LOCATION WALL, §2.6 — and it is a claim a definer view could have
-- silently dropped. Cashier 2's write-off at the other store must not be here.
select public.chk('3.10 the OTHER store''s write-off is not in her read (§2.6)',
  (select count(*) from public.waste_reason_line
    where waste_id = :wst_2::uuid) = 0);

select public.chk('3.11 and she still cannot reach a cost by any other door',
  (select count(*) from public.stock_movement) = 0
  and (select count(*) from public.stock_batch) = 0);
commit;

-- --- cashier 2: the location wall from the other side ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;

select public.chk('3.12 cashier 2 reads her OWN store''s line and only that',
  (select count(*) from public.waste_reason_line) = 1
  and (select count(*) from public.waste_reason_line where waste_id = :wst_2::uuid) = 1,
  format('read %s', (select count(*) from public.waste_reason_line)));
commit;

-- --- the owner of workspace A: nothing was taken away ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select public.chk('3.13 the owner sees both stores'' lines through the view — my_locations grants by role',
  (select count(*) from public.waste_reason_line) = 4,
  format('read %s', (select count(*) from public.waste_reason_line)));

select public.chk('3.14 and she still reads the base table, cost included, exactly as before 0041',
  (select count(*) from public.waste_line) = 4
  and (select count(*) from public.waste_line where unit_cost_net_per_base > 0) = 4);
commit;

-- --- the outsider: the wall a definer view has to put back by hand ---
begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;

-- ⚠️⚠️ THE TENANCY ASSERTION — AND THE FIRST WRITING OF THIS COMMENT CLAIMED MORE
-- THAN IS TRUE, WHICH THE FALSIFICATION CAUGHT AND WHICH IS WORTH KEEPING. It said
-- *a view that forgot its `my_workspaces()` predicate would hand him every write-off
-- in the database.* **It would not.** Fixture F1 removed exactly that predicate and
-- this assertion stayed GREEN, with only `1.4` going red — because `my_locations()`
-- ALREADY fences him: his locations are in his own workspace, and the composite
-- foreign keys make a row at someone else's location necessarily someone else's.
-- `0003` says so in its own words — *"the workspace predicate is redundant —
-- my_locations() already implies membership — and is kept anyway, so one uniform
-- prefix is safe to copy without thinking."*
--
-- ⚠️ SO WHAT THIS ASSERTION ACTUALLY PROVES is that the wall holds AT ALL against a
-- manager-and-above outsider, which is the thing a definer view could genuinely
-- have dropped — and `1.4` is the ONLY instrument that can see the redundant half
-- go missing, structurally rather than behaviourally. **A comment that says a
-- disagreement is deliberate is the strongest thing in a repository, and this one
-- was wrong** ([[a-test-can-defend-a-bug]]).
select public.chk('3.15 a DIFFERENT workspace''s owner reads ZERO rows — the tenancy wall, restated by hand',
  (select count(*) from public.waste_reason_line) = 0,
  format('read %s', (select count(*) from public.waste_reason_line)));
commit;

-- ----------------------------------------------------------------------------
-- 4. A reversal is carried and cancels itself
-- ----------------------------------------------------------------------------
-- ⚠️ `0009`'s RULE, AND IT IS WHY NOTHING IS FILTERED HERE: a void is a second
-- document with NEGATED lines, so any sum over `qty_base` is already correct.
-- Dropping them in the view would make the view unsummable; dropping them for the
-- SCREEN is `@/api/documents`' job, because *"just one line, clean"* is a rendering
-- rule the owner gave.
begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select void_transaction('waste', :wst_1::uuid, 'prueba 0041') as v \gset
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"0b0b0b0b-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select public.chk('4.1 the reversal''s lines are IN the view — six rows where there were three',
  (select count(*) from public.waste_reason_line) = 6,
  format('read %s', (select count(*) from public.waste_reason_line)));

select public.chk('4.2 and they are negative, so the loss sums to zero',
  (select sum(qty_base) from public.waste_reason_line) = 0,
  format('sum %s', (select sum(qty_base) from public.waste_reason_line)));

select public.chk('4.3 the reversal keeps the CAUSES of the document it cancels',
  (select count(distinct reason) from public.waste_reason_line where qty_base < 0) = 3);
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
