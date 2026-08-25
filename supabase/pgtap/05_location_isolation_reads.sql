-- ============================================================================
-- 05 — LOCATION ISOLATION, READS (behavioural)
--
-- ADR-035 §2.10, third row: staff assigned to location A see zero rows from
-- location B; a manager sees both. Plan task 3.3. `my_locations()` is the
-- predicate under test, and this is the first suite in the repo that measures
-- the STORE wall rather than the tenant wall.
--
-- 02 held this wall open on purpose — it used two OWNERS, each of whom sees
-- every location of their own workspace, so "sees exactly its own rows" was a
-- claim about tenancy alone. This file does the opposite: both actors are
-- inside ONE workspace, so the tenant wall is held open and every refusal
-- measured below is the store wall or it is nothing.
--
-- ⚠️ READS ARE THE WHOLE OF 3.3, AND NOT AS A SCOPE COMPROMISE. `my_locations()`
-- appears in ten `using` clauses and zero `with check` clauses; the six ledger
-- tables grant `authenticated` SELECT and nothing else; and the ten RPCs of
-- §2.6 that will hold the write side do not exist — `0006` is reserved and
-- unwritten. There is no cross-location write for this file to attempt that
-- would not be refused by the GRANT, which is 3.2b-i's subject and already
-- tested. F7 asserts that state of the world rather than trusting this comment:
-- the day a `with check` mentions a location, this suite goes red and whoever
-- is there re-reads the scope.
--
-- ⚠️ THE TEN POLICIES SPLIT 5/5, AND THE HALVES NEED DIFFERENT ACTORS. This is
-- the finding this file was built around and it is not visible from the plan:
--
--   NOT role-gated  location, sale, sale_line, waste, batch_balance
--                   -> a cashier reads these, so the cashier IS the measurement
--   ALSO role-gated  purchase, purchase_line, waste_line, stock_batch,
--                   stock_movement — `and public.has_role(workspace_id,
--                   'manager')` sits beside the location clause (0003 §6,
--                   0004 §9: cost is hidden by ROLE, not by column grants)
--                   -> a cashier reads ZERO rows here for a reason that has
--                      nothing to do with locations
--
-- So on the second five, pointing a cashier at them and finding zero proves the
-- ROLE wall a second time and the location wall not at all. Worse, the obvious
-- repair does not work either: anyone who passes `has_role(…, 'manager')` is by
-- construction granted EVERY location by `my_locations()`, because the function
-- grants managers and owners every location in their workspaces by role. There
-- is no actor in the schema who is simultaneously manager-enough to read a
-- purchase and location-restricted enough to be refused one.
--
-- ⚠️ THE LOCATION CLAUSE ON THOSE FIVE IS STILL LIVE, AND is_active IS WHAT
-- MAKES IT SO. `my_locations()` excludes INACTIVE locations; `workspace_id in
-- (select my_workspaces())` does not. So the one thing the location clause
-- refuses a manager is a row at a store that has been closed — and that is a
-- real rule, not a technicality: 0008, 0009, 0011 and 0013 each record that
-- reporting deliberately reads WIDER than RLS for exactly this reason. The
-- D-block below closes a location and re-measures, which is the only way these
-- five policies can be observed behaviourally at all. It also proves the
-- fail-closed half of `my_locations()`'s own comment: the cashier at the closed
-- store loses every row rather than gaining every row.
--
-- ⚠️ EVERY MEASUREMENT RUNS UNDER `set role authenticated`. `postgres` carries
-- BYPASSRLS (F2), so the identical queries as the session user return every row
-- and pass nothing. F3 asserts the switch happened, per measurement, from what
-- was recorded during it rather than from what this comment claims.
--
-- WHO THE ACTORS ARE, all four inside Tienda Doña Lupe:
--   staff_centro   5eed0001-…-0003  cashier, assigned to one store
--   staff_mercado  5eed0001-…-0004  cashier, assigned to the other
--   manager        5eed0001-…-0002  both stores BY ROLE, no member_location row
--   owner          5eed0001-…-0001  both stores by role
-- The two stores are resolved FROM THE CASHIERS' ASSIGNMENTS, never by display
-- name: the claim under test is about a user's reach, so the user is what the
-- fixture is keyed on, and renaming a store cannot silently re-point the suite.
--
-- ⚠️ THIS FILE WRITES AND ROLLS BACK, as 02 and 04 do. The write is one
-- `is_active = false` on one location, undone explicitly before the rollback so
-- F11 can assert the restore rather than only trusting it.
--
-- WHAT THIS FILE DOES NOT CLAIM. Nothing about workspace B — a cashier in one
-- workspace seeing none of the other's is the TENANT wall and 02 owns it, and
-- repeating it here would blur which wall a failure named. Nothing about
-- writes, per the scope note above. Nothing about `record_sale`, whose half of
-- §2.10's third row §3 files with `0006` and which docs/PLAN.md defers by name.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
set search_path = tap, public, pg_catalog;
set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------------
-- The four actors, and the two stores, resolved from the ledger
--
-- `member_id` is carried because `member_location` keys on the MEMBERSHIP, not
-- on the user, and F5/F6 are claims about which memberships hold assignments.
-- ---------------------------------------------------------------------------
create temp table loc_actor (
  tag        text primary key,
  user_id    uuid not null,
  member_id  uuid,
  role       text,
  ws_id      uuid,
  n_assigned int not null default 0
);

insert into loc_actor (tag, user_id, member_id, role, ws_id)
select v.tag, v.user_id, wm.id, wm.role::text, wm.workspace_id
  from (values ('staff_centro',  '5eed0001-0000-0000-0000-000000000003'::uuid),
               ('staff_mercado', '5eed0001-0000-0000-0000-000000000004'::uuid),
               ('manager',       '5eed0001-0000-0000-0000-000000000002'::uuid),
               ('owner',         '5eed0001-0000-0000-0000-000000000001'::uuid))
         as v(tag, user_id)
  left join public.workspace_member wm
    on wm.user_id = v.user_id and wm.is_active;

update loc_actor a
   set n_assigned = (select count(*)::int from public.member_location ml
                      where ml.member_id = a.member_id);

-- The two stores ARE the two cashiers' assignments. If either cashier ever
-- holds none, or more than one, F5 goes red before any count is believed.
create temp table loc_ref as
select (select ml.location_id from public.member_location ml
         where ml.member_id = (select member_id from loc_actor where tag = 'staff_centro')
         limit 1) as centro,
       (select ml.location_id from public.member_location ml
         where ml.member_id = (select member_id from loc_actor where tag = 'staff_mercado')
         limit 1) as mercado;

-- ---------------------------------------------------------------------------
-- Which tables carry the store wall, asked of the catalog and never listed here
--
-- The set is every policy in `public` whose USING clause mentions
-- `my_locations()`. A table that gains one is measured the day it lands, and a
-- table that loses one turns F1 or F9 red rather than quietly leaving the file
-- shorter. `role_gated` is read the same way — from whether `has_role` sits
-- beside the location clause — so the 5/5 split above is a MEASUREMENT, and a
-- migration that drops the role gate from `waste_line` re-classifies that table
-- into the cashier-observable family instead of mis-attributing its zero.
-- ---------------------------------------------------------------------------
create temp table loc_table (
  tbl        name primary key,
  loc_col    name not null,
  role_gated boolean not null
);

insert into loc_table (tbl, loc_col, role_gated)
select p.tablename::name,
       case when p.tablename = 'location' then 'id' else 'location_id' end,
       p.qual like '%has_role%'
  from pg_policies p
 where p.schemaname = 'public'
   and p.qual like '%my_locations%';

-- ---------------------------------------------------------------------------
-- The measurement
--
-- Per table: the truth as postgres, then the same two counts as each of the
-- three actors, plus each actor's unrestricted total. The total is the stronger
-- of the two claims — it says "nothing else, from anywhere", not merely
-- "nothing from the other store" — and the per-store count is what names the
-- store a leak came from.
--
-- `set role` is issued and reset around every actor rather than once around the
-- loop, so a failure part-way cannot leave later rows measured under a role
-- nobody chose. F12 confirms the session came back.
-- ---------------------------------------------------------------------------
create temp table loc_read (
  tbl        name primary key,
  role_gated boolean not null,
  n_centro   int not null,   -- truth, as postgres (BYPASSRLS)
  n_mercado  int not null,
  sc_mercado int not null,   -- cashier at Centro, looking at Mercado  <- 0
  sc_total   int not null,   -- everything that cashier sees
  sm_centro  int not null,   -- cashier at Mercado, looking at Centro  <- 0
  sm_total   int not null,
  mg_centro  int not null,   -- the manager, per store                 <- whole
  mg_mercado int not null,
  role_seen  name not null
);

do $$
declare
  r          record;
  v_centro   uuid := (select centro  from loc_ref);
  v_mercado  uuid := (select mercado from loc_ref);
  v_sc       uuid := (select user_id from loc_actor where tag = 'staff_centro');
  v_sm       uuid := (select user_id from loc_actor where tag = 'staff_mercado');
  v_mg       uuid := (select user_id from loc_actor where tag = 'manager');
  v_n_c int; v_n_m int;
  v_sc_m int; v_sc_t int;
  v_sm_c int; v_sm_t int;
  v_mg_c int; v_mg_m int;
  v_role name;
begin
  for r in select t.tbl, t.loc_col, t.role_gated from loc_table t order by t.tbl
  loop
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.loc_col)
      into v_n_c using v_centro;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.loc_col)
      into v_n_m using v_mercado;

    -- The cashier at Centro. `my_locations()` reads auth.uid(), which reads
    -- this GUC; without it the cashier resolves to no locations at all and
    -- every L-own below goes red — the correct direction for that mistake.
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_sc, 'role', 'authenticated')::text, true);
    execute 'set role authenticated';
    v_role := current_user;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.loc_col)
      into v_sc_m using v_mercado;
    execute format('select count(*)::int from public.%I', r.tbl) into v_sc_t;
    execute 'reset role';

    -- The cashier at Mercado. Both directions, per 3.2b-i's rule: a predicate
    -- accidentally written against one hardcoded location passes one way.
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_sm, 'role', 'authenticated')::text, true);
    execute 'set role authenticated';
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.loc_col)
      into v_sm_c using v_centro;
    execute format('select count(*)::int from public.%I', r.tbl) into v_sm_t;
    execute 'reset role';

    -- The manager, who holds both stores by role and no member_location row.
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_mg, 'role', 'authenticated')::text, true);
    execute 'set role authenticated';
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.loc_col)
      into v_mg_c using v_centro;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.loc_col)
      into v_mg_m using v_mercado;
    execute 'reset role';

    insert into loc_read values (r.tbl, r.role_gated, v_n_c, v_n_m,
                                 v_sc_m, v_sc_t, v_sm_c, v_sm_t,
                                 v_mg_c, v_mg_m, v_role);
  end loop;

  perform set_config('request.jwt.claims', null, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- The D-block: close a store, and watch the wall move
--
-- This is the only measurement in the file that can observe the location clause
-- on the five ROLE-GATED policies, for the reason the header gives — every
-- caller who clears `has_role(…, 'manager')` is handed every ACTIVE location by
-- `my_locations()`, so `is_active` is the only lever left that the location
-- clause responds to and the workspace clause does not.
--
-- It is also the fail-closed proof. `my_locations()`'s own comment argues that
-- a member with no assignment must see NOTHING rather than everything, because
-- the first mistake is a support ticket in five minutes and the second is a
-- cashier reading the other shop's takings and nobody reporting it. Closing
-- Mercado makes the cashier there exactly that member, and D-staff is the
-- assertion that the fail-closed direction is the one that happens.
--
-- Written as postgres. The point of the row is to be closed, not to prove an
-- update path — `location_update` is owner-only and belongs to a role suite.
-- ---------------------------------------------------------------------------
create temp table loc_deact (
  inactive_before  int not null,
  inactive_after   int not null,
  inactive_restored int,
  mg_locs_before   int not null,
  mg_locs_after    int not null
);

create temp table loc_read_d (
  tbl        name primary key,
  d_mg_total int not null,   -- the manager's whole-table count, store closed
  d_sm_total int not null,   -- the stranded cashier's                <- 0
  role_seen  name not null
);

do $$
declare
  r         record;
  v_mercado uuid := (select mercado from loc_ref);
  v_sm      uuid := (select user_id from loc_actor where tag = 'staff_mercado');
  v_mg      uuid := (select user_id from loc_actor where tag = 'manager');
  v_before int; v_after int; v_restored int;
  v_mgl_b int; v_mgl_a int;
  v_d_mg int; v_d_sm int; v_role name;
begin
  select count(*)::int into v_before from public.location where not is_active;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_mg, 'role', 'authenticated')::text, true);
  execute 'set role authenticated';
  select count(*)::int into v_mgl_b from public.my_locations();
  execute 'reset role';

  update public.location set is_active = false where id = v_mercado;
  select count(*)::int into v_after from public.location where not is_active;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_mg, 'role', 'authenticated')::text, true);
  execute 'set role authenticated';
  select count(*)::int into v_mgl_a from public.my_locations();
  execute 'reset role';

  for r in select t.tbl from loc_table t order by t.tbl
  loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_mg, 'role', 'authenticated')::text, true);
    execute 'set role authenticated';
    v_role := current_user;
    execute format('select count(*)::int from public.%I', r.tbl) into v_d_mg;
    execute 'reset role';

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_sm, 'role', 'authenticated')::text, true);
    execute 'set role authenticated';
    execute format('select count(*)::int from public.%I', r.tbl) into v_d_sm;
    execute 'reset role';

    insert into loc_read_d values (r.tbl, v_d_mg, v_d_sm, v_role);
  end loop;

  -- Undone explicitly, so F11 can ASSERT the restore. The rollback at the tail
  -- would do it anyway; an assertion that depends only on the rollback is an
  -- assertion nobody can read.
  update public.location set is_active = true where id = v_mercado;
  select count(*)::int into v_restored from public.location where not is_active;

  perform set_config('request.jwt.claims', null, true);
  insert into loc_deact values (v_before, v_after, v_restored, v_mgl_b, v_mgl_a);
end;
$$;

-- ---------------------------------------------------------------------------
-- The plan is COMPUTED from what was measured, never hardcoded: 14 fixed tests,
-- 4 per cashier-observable table, 2 per role-gated table, 2 per table for the
-- manager, and 2 per table for the D-block. A policy added by a future
-- migration is measured and asserted the day it lands. F1 is what stops that
-- arithmetic from being satisfied by measuring nothing.
--
-- ⚠️ THE NUMBER IS KEPT, and the tail of this file checks it was reached. See
-- the guard after `finish()` — a computed plan that disagrees with the number
-- of tests actually emitted is not a loud failure in pgTAP, it is a SILENT one,
-- and this file is the one that found that out.
-- ---------------------------------------------------------------------------
create temp table loc_plan as
select (
  14
  + 4 * (select count(*)::int from loc_read where not role_gated)
  + 2 * (select count(*)::int from loc_read where role_gated)
  + 2 * (select count(*)::int from loc_read)
  + 2 * (select count(*)::int from loc_read_d)
) as planned;

select plan((select planned from loc_plan));

-- ---------------------------------------------------------------------------
-- Fixed tests F1–F14
-- ---------------------------------------------------------------------------

-- F1. THE FLOOR. Every generated test below comes from `loc_read`, so an empty
-- `loc_read` is fourteen passing tests and a green that measured no isolation.
-- Ten is what 0001, 0003 and 0004 applied: one on `location`, six on the ledger
-- documents and lines, three on the inventory projections.
--
-- ⚠️ A COUNT ALONE IS NOT ENOUGH HERE, AND F14 IS WHY. This suite discovers its
-- table set from the very predicate it is testing, so a policy that LOSES its
-- location clause does not fail — it leaves, quietly, and the tests that would
-- have caught it are never generated. Today that shows up as nine instead of
-- ten. It stops showing up the day an eleventh location policy lands, because
-- then one can leave and one can arrive and this test still reads ten. F14 is
-- the same claim made by NAME, and it is the one that survives that.
select cmp_ok((select count(*)::int from loc_read), '>=', 10,
  'F1 at least the ten location-scoped policies 0001-0004 applied were measured');

-- F2. THE ROLE HAS NO WAY OUT. If `authenticated` were superuser or carried
-- BYPASSRLS, every count below would be postgres's counts wearing another name.
-- The session user is checked too, and is expected to HAVE the bypass — that is
-- the asymmetry the whole suite rests on, and supabase/README.md's warning.
select ok(
  (select not rolsuper and not rolbypassrls from pg_roles where rolname = 'authenticated')
  and (select rolbypassrls from pg_roles where rolname = current_setting('session_authorization')),
  'F2 authenticated is neither superuser nor BYPASSRLS, and the session user is'
);

-- F3. THE SWITCH HAPPENED, per pass, from what the pass recorded. "The suite
-- forgot to switch roles" and "the store wall is broken" produce numbers that
-- differ; "the suite forgot" and "the wall is open" do not.
select is(
  (select coalesce(array_agg(distinct role_seen), '{}') from loc_read)
  || (select coalesce(array_agg(distinct role_seen), '{}') from loc_read_d),
  array['authenticated', 'authenticated']::name[],
  'F3 every measurement, before and after the closure, ran under set role authenticated'
);

-- F4. THE FOUR ACTORS ARE WHO THIS FILE THINKS THEY ARE, and they are all in
-- ONE workspace — which is what holds the tenant wall open so that every
-- refusal below is the store wall or nothing.
select ok(
  (select count(*) = 4 from loc_actor where member_id is not null)
  and (select count(distinct ws_id) = 1 from loc_actor)
  and (select role = 'staff'   from loc_actor where tag = 'staff_centro')
  and (select role = 'staff'   from loc_actor where tag = 'staff_mercado')
  and (select role = 'manager' from loc_actor where tag = 'manager')
  and (select role = 'owner'   from loc_actor where tag = 'owner'),
  'F4 two cashiers, a manager and an owner, all active members of one workspace'
);

-- F5. TWO CASHIERS, ONE STORE EACH, AND THEY ARE DIFFERENT STORES. The whole
-- file is keyed on these two assignments. A seed that gave one cashier both
-- stores would leave every L-cross below trivially green.
select ok(
  (select n_assigned = 1 from loc_actor where tag = 'staff_centro')
  and (select n_assigned = 1 from loc_actor where tag = 'staff_mercado')
  and (select centro is not null and mercado is not null and centro <> mercado from loc_ref),
  'F5 the two cashiers hold one member_location row each, at different stores'
);

-- F6. THE MANAGER AND THE OWNER HOLD NO ASSIGNMENT AT ALL. This is the claim
-- that makes M-both mean something: the manager sees both stores BY ROLE, which
-- is `my_locations()`'s rule, and not because somebody inserted two rows. The
-- seed says so in a comment (00_skeleton §4); this asserts it.
select is(
  (select coalesce(sum(n_assigned), 0)::int from loc_actor where tag in ('manager', 'owner')),
  0,
  'F6 the manager and the owner reach both stores by role, holding no member_location row'
);

-- F7. THE SCOPE OF 3.3, ASSERTED RATHER THAN ASSUMED. Reads are the whole of
-- this task because the location predicate is a `using` clause and nothing
-- else. The day `0006` or any migration writes a `with check` that mentions a
-- location, this goes red — and the right response is not to widen the
-- predicate here but to write the write-side suite the plan defers to `0006`.
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public' and with_check like '%my_locations%'),
  0,
  'F7 no with_check clause mentions my_locations — the store wall is still a read wall'
);

-- F8. BOTH FAMILIES ARE NON-EMPTY. The 5/5 split is measured, not listed, so it
-- is allowed to move — but if it ever moved all the way to one side, half the
-- generated tests would vanish and the plan arithmetic would still add up. This
-- is what stops that being silent.
select ok(
  (select count(*) > 0 from loc_read where role_gated)
  and (select count(*) > 0 from loc_read where not role_gated),
  'F8 both policy families were measured: cashier-observable, and also role-gated'
);

-- F9. NON-VACUITY, PER TABLE. "The cashier at Centro sees none of Mercado's
-- rows" is worth nothing where Mercado has none. Stated as the set of offenders
-- so a failure names the table rather than the count.
select is_empty(
  $$ select tbl from loc_read where n_centro = 0 or n_mercado = 0 $$,
  'F9 every measured table held rows at BOTH stores when it was measured'
);

-- F10. THE CLOSURE ACTUALLY MOVED THE WALL. Without this, every D-test could
-- hold for the dullest possible reason — an `update` that matched no row, or a
-- `my_locations()` that never consulted `is_active`. Two stores before, one
-- after, measured from inside the manager's own session.
select ok(
  (select mg_locs_before = 2 and mg_locs_after = 1 from loc_deact),
  'F10 closing one store took it out of the manager''s my_locations(): 2 -> 1'
);

-- F11. THE STORE CAME BACK, and it was open to begin with. The seed ships no
-- inactive location; if a future one does, `n_mercado` and the D-block would be
-- measuring a different world and this says so before any of it is believed.
select ok(
  (select inactive_before = 0 and inactive_after = 1 and inactive_restored = 0
     from loc_deact),
  'F11 the seed had no closed store, this suite closed exactly one, and reopened it'
);

-- F12. THE SESSION CAME BACK. `set role` was issued around sixty times above.
select is(current_user::name, session_user::name,
  'F12 the session is back to its own role after the measurement');

-- F13. THE PREDICATE UNDER TEST IS STILL SECURITY DEFINER, WITH A PINNED
-- search_path. `my_locations()` reads `location` and `member_location`, both of
-- which carry RLS of their own; as SECURITY INVOKER it would be evaluating the
-- caller's store list through the caller's own policies. An empty search_path is
-- what stops a caller-controlled one from re-pointing `public.location`.
--
-- ⚠️ F13 IS NOT THE TEST THAT CATCHES THE OBVIOUS MUTATION, and saying so here
-- is more use than pretending otherwise. Falsified: `alter function
-- public.my_locations() security invoker` does not reach F13 at all — the
-- function reads `public.location`, whose `location_select` policy calls the
-- function, and the two recurse until Postgres raises `stack depth limit
-- exceeded`. The build goes red, which is what matters, but the message is
-- about stack depth and not about this test. What F13 is genuinely for is the
-- quieter half: a `security definer` lost while the recursion happens not to
-- close, and a `search_path` left unpinned, neither of which announces itself.
-- ⚠️ The setting is read out of `proconfig` and UNQUOTED before it is compared.
-- `set search_path = ''` is stored as the seven characters `search_path=""` —
-- the empty string keeps its quotes — so the obvious spelling of this test
-- (`'search_path=' = any(proconfig)`) fails on a schema that is entirely
-- correct. It did, on the first run, which is how this comment exists.
select ok(
  (select p.prosecdef
     and exists (select 1 from unnest(p.proconfig) c
                  where c like 'search\_path=%'
                    and btrim(split_part(c, '=', 2), '"') = '')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'my_locations'),
  'F13 my_locations() is security definer with search_path pinned empty'
);

-- F14. THE TEN ARE NAMED, because F1 counts and a count can be fooled by a
-- swap. These are the tables 0001, 0003 and 0004 put behind `my_locations()`,
-- written out literally — the ONE hardcoded list in this file, and deliberately
-- so. It is a floor, never the plan: an eleventh location policy is still
-- discovered from the catalog, measured, and asserted the day it lands, and
-- nothing here has to be edited for that to happen. What the list buys is that
-- none of these ten can go missing without the failure saying which.
--
-- ⚠️ If a migration legitimately takes a table out from behind the location
-- wall, this test is the conversation that ought to happen — remove the name
-- here, in the same change, and say why in docs/PLAN.md.
select is_empty(
  $$ select e.tbl from (values ('batch_balance'),('location'),('purchase'),
                               ('purchase_line'),('sale'),('sale_line'),
                               ('stock_batch'),('stock_movement'),('waste'),
                               ('waste_line')) as e(tbl)
      where e.tbl not in (select tbl::text from loc_read) $$,
  'F14 all ten tables 0001-0004 put behind my_locations() are still there'
);

-- ---------------------------------------------------------------------------
-- The cashier-observable five, both directions
--
-- L-cross is the leak test: a predicate that forgot the store, or one written
-- `location_id in (select my_locations()) or true`, turns it red.
-- L-own is the other half, and it is the stronger statement — the cashier's
-- UNRESTRICTED count over the whole table equals their own store's rows, so it
-- catches both a wall that shows too much and a DELETED POLICY, which shows
-- nothing at all (RLS with no policy denies everything, so the count collapses
-- to zero rather than staying whole).
-- ---------------------------------------------------------------------------

select is(sc_mercado, 0,
  'L-cross ' || tbl || ' the cashier at Centro sees none of Mercado''s rows')
from loc_read where not role_gated order by tbl;

select is(sm_centro, 0,
  'L-cross ' || tbl || ' the cashier at Mercado sees none of Centro''s rows')
from loc_read where not role_gated order by tbl;

select is(sc_total, n_centro,
  'L-own ' || tbl || ' the cashier at Centro sees all ' || n_centro
  || ' of its rows and nothing else')
from loc_read where not role_gated order by tbl;

select is(sm_total, n_mercado,
  'L-own ' || tbl || ' the cashier at Mercado sees all ' || n_mercado
  || ' of its rows and nothing else')
from loc_read where not role_gated order by tbl;

-- ---------------------------------------------------------------------------
-- The role-gated five, and what their zero is REALLY saying
--
-- A cashier reads nothing here, and this file refuses to bank that as location
-- isolation. It is recorded as its own claim, under its own name, because the
-- cashier's store IS in `my_locations()` — the L-own tests immediately above
-- prove it by having that same cashier read their store's rows in full from the
-- other five tables. So the refusal is `has_role(workspace_id, 'manager')` and
-- can be nothing else: same user, same store, same session, opposite result,
-- and the only thing that differs is the role clause on the policy.
--
-- ⚠️ That makes R-zero a ROLE claim living in a location task, and it is here
-- because leaving it out would let a reader take the zero for the store wall.
-- The location wall on these five is the D-block below, and only that.
-- ---------------------------------------------------------------------------

select is(sc_total, 0,
  'R-zero ' || tbl || ' the cashier at Centro is refused by ROLE, not by store')
from loc_read where role_gated order by tbl;

select is(sm_total, 0,
  'R-zero ' || tbl || ' the cashier at Mercado is refused by ROLE, not by store')
from loc_read where role_gated order by tbl;

-- ---------------------------------------------------------------------------
-- The manager sees both stores — §2.10's second clause
--
-- All ten tables, including the five no cashier can read. F6 is what makes this
-- a statement about ROLE rather than about two member_location rows.
-- ---------------------------------------------------------------------------

select is(mg_centro, n_centro,
  'M-both ' || tbl || ' the manager sees all ' || n_centro || ' rows at Centro')
from loc_read order by tbl;

select is(mg_mercado, n_mercado,
  'M-both ' || tbl || ' the manager sees all ' || n_mercado || ' rows at Mercado')
from loc_read order by tbl;

-- ---------------------------------------------------------------------------
-- The closed store — the only observation of the location clause on the
-- role-gated five, and the fail-closed proof on all ten
--
-- D-mgr: with Mercado closed, the manager's whole-table count is Centro's rows
-- exactly. On `sale` that is a wall the cashier tests already reach; on
-- `purchase` and `stock_movement` it is the only evidence in the repo that the
-- location clause on those policies does anything at all.
--
-- D-staff: the cashier stranded at the closed store sees ZERO — not everything.
-- That is `my_locations()`'s fail-closed rule, and it is the direction the
-- function's own comment argues the mistake must fall in.
-- ---------------------------------------------------------------------------

select is(d.d_mg_total, r.n_centro,
  'D-mgr ' || d.tbl || ' with Mercado closed the manager sees Centro''s '
  || r.n_centro || ' rows and no more')
from loc_read_d d join loc_read r on r.tbl = d.tbl order by d.tbl;

select is(d_sm_total, 0,
  'D-staff ' || tbl || ' the cashier at the closed store sees nothing — fail-closed')
from loc_read_d order by tbl;

-- ---------------------------------------------------------------------------
-- `finish(exception_on_failure := true)` RAISES so psql exits non-zero; plain
-- psql prints "not ok" and exits 0. Same reasoning, and same spelling trap, as
-- 01_rls_coverage.sql documents at its own tail.
-- ---------------------------------------------------------------------------
select * from finish(exception_on_failure := true);

-- ---------------------------------------------------------------------------
-- ⚠️ THE GUARD `finish()` DOES NOT PROVIDE — AND THE HOLE IS IN THE HARNESS,
-- NOT IN THIS FILE
--
-- `exception_on_failure := true` is the single mechanism every suite in this
-- directory relies on to turn a red assertion into a non-zero exit. It is
-- DISARMED, silently, by a plan that does not match the number of tests run.
-- From pgTAP's own `_finish`:
--
--     IF curr_test <> exp_tests THEN
--         RETURN NEXT diag('Looks like you planned … but ran …');
--     ELSIF num_faild > 0 THEN
--         IF raise_ex THEN RAISE EXCEPTION …
--
-- The two branches are an ELSIF. A miscounted plan takes the first, the
-- exception in the second is never reached, and psql exits 0 with `not ok`
-- lines in its output — which is precisely the vacuous green ADR-035 §9 exists
-- to refuse, and precisely what task 3.1 believed it had closed.
--
-- Found here by falsification, not by reading: restricting this file's
-- measurement loop to the five cashier-observable tables left F1, F8 and F14
-- FAILING and the exit code at ZERO. Reproduced in four lines outside any
-- suite: plan(3), one passing test, one failing test, `finish(true)` — no
-- exception, exit 0. Change the plan to 2 and the same file raises.
--
-- ⚠️ THIS AFFECTS 01, 02, 03 AND 04 EXACTLY AS MUCH AS IT AFFECTS 05. Every
-- suite here computes its plan from what it measured, which is the right shape
-- and is not the bug — the bug is that the arithmetic going wrong is quiet.
-- The backstop for all five is in .github/workflows/db.yml, which now fails the
-- step on the diagnostic itself; this block is the per-file half, so the file
-- also defends itself when it is run by hand, which is how it was written.
-- ---------------------------------------------------------------------------
-- ⚠️ CORRECTED IN 3.4. This block first read the file's OWN `loc_plan.planned`
-- and compared it to `curr_test`, which asks only whether the loops emitted what
-- the arithmetic said. It misses the other half: `plan()` being CALLED with a
-- different number. Falsified — `plan(planned + 1)` leaves curr_test equal to
-- `planned`, so the guard passed while pgTAP printed "Looks like you planned"
-- and psql exited 0, which is the exact failure this block exists to catch.
-- `tap._get('plan')` is the number pgTAP was actually given; the third
-- comparison keeps this file's arithmetic honest as well.
do $$
declare
  v_planned  int := tap._get('plan');
  v_ran      int := tap._get('curr_test');
  v_computed int := (select planned from loc_plan);
begin
  if v_ran is distinct from v_planned or v_planned is distinct from v_computed then
    raise exception
      'plan/actual mismatch: plan() was given %, the file computed %, % tests ran '
      '— finish() reports this as a diagnostic and does NOT raise, so '
      'exception_on_failure was disarmed and any failing test above exited 0',
      v_planned, v_computed, v_ran;
  end if;
end;
$$;

-- The ROLLBACK below is the second of the two undos: the D-block already
-- reopened the store so that F11 could assert it, and this returns everything
-- else. It is not reached when a test fails — psql stops on the exception and
-- drops the connection, which rolls the transaction back anyway.
rollback;
