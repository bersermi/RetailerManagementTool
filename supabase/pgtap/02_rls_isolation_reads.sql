-- ============================================================================
-- 02 — RLS ISOLATION, READS (behavioural)
--
-- ADR-035 §2.10, second row: "a user in workspace A cannot select workspace B's
-- rows." Plan task 3.2a. This is the suite 01_rls_coverage.sql says it is not:
-- 01 reads catalogs and claims the walls are standing and load-bearing; this one
-- reads ROWS, as a real signed-in user, and claims the walls hold.
--
-- WHY THAT DISTINCTION IS NOT PEDANTRY. `create policy p on t using (true)` gets
-- a table past 01's structural test on every count that matters to it, and 01's
-- per-policy section only asks whether a predicate MENTIONS a tenancy helper —
-- `using (workspace_id in (select public.my_workspaces()) or true)` mentions one.
-- Nothing short of selecting rows as a user who should not see them can tell the
-- difference. That is this file.
--
-- ⚠️ EVERY MEASUREMENT BELOW RUNS UNDER `set role authenticated`, AND THAT IS
-- THE WHOLE POINT. `postgres` carries BYPASSRLS on this project (rolbypassrls =
-- true, checked by F2), so the identical queries run as the session user return
-- every row and pass nothing. An isolation suite that forgets the role switch is
-- the vacuous green ADR-035 §9 exists to refuse, so F2 asserts the role has no
-- way out of RLS and F3 asserts the switch actually happened, per pass, from
-- what was recorded during it rather than from what this comment claims.
--
-- WHO THE TWO USERS ARE. The seed's two owners, by the fixed uuids 00_skeleton
-- promises tests will name: `5eed0001-…-0001` owns Tienda Doña Lupe and
-- `5eed0001-…-0005` owns Abarrotes El Roble. Owners rather than cashiers on
-- purpose: an owner sees every location of their own workspace, so "sees exactly
-- its own rows and nothing else" is a claim about the TENANT wall alone, with the
-- store wall held open. The store wall — a cashier assigned to one location — is
-- task 3.3, and `my_locations()` is the predicate under test there.
--
-- WHAT IS ASSERTED PER TENANT TABLE, in both directions:
--   T-read  the other workspace's rows are invisible          (a leak turns it red)
--   T-all   every one of its own rows is visible              (a DELETED POLICY
--           turns it red: RLS with no policy denies everything, so the count
--           collapses to zero rather than staying whole)
-- Both are needed. The first alone passes on a table nobody can read at all; the
-- second alone passes on a table everybody can read.
--
-- ⚠️ THIS FILE OPENS A TRANSACTION AND ROLLS IT BACK, and 01 does not. The reason
-- is one table: `workspace_invite` is the only tenant table the seed leaves empty
-- in both workspaces (F9), and "A sees none of B's invites" over zero invites is
-- an assertion about nothing. So the suite writes one invite per workspace and
-- rolls it back, which keeps _teardown.sql's promise — the database the seed
-- checks read next is byte for byte what `supabase db reset` produced. Fixing the
-- seed instead was the alternative and it is the more invasive one: the seed
-- checks and the 203 behavioural checks assert absolute counts over it.
--
-- WHAT THIS FILE DOES NOT CLAIM. Nothing about writes — that a user in A is
-- REJECTED writing into B, and by which of the two mechanisms, is 3.2b. Nothing
-- about locations — 3.3. Nothing about the RPCs, which do not exist yet.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
set search_path = tap, public, pg_catalog;
set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------------
-- The two users, and the two workspaces, resolved from the ledger
--
-- Workspaces are looked up through `workspace_member`, not by display name: the
-- claim under test is about a USER's reach, so the user is what the fixture is
-- keyed on. F4 asserts each owns exactly one workspace and that the two differ;
-- F5 asserts neither is a member of the other's, without which every T-read
-- below would be asserting that a member cannot see what they are entitled to.
-- ---------------------------------------------------------------------------
create temp table iso_actor (
  tag      text primary key,
  user_id  uuid not null,
  ws_id    uuid,
  ws_count int not null,
  cross_member int not null
);

insert into iso_actor (tag, user_id, ws_id, ws_count, cross_member)
select v.tag, v.user_id,
       (select wm.workspace_id from public.workspace_member wm
         where wm.user_id = v.user_id and wm.role = 'owner' and wm.is_active
         limit 1),
       (select count(*)::int from public.workspace_member wm
         where wm.user_id = v.user_id and wm.role = 'owner' and wm.is_active),
       0
from (values ('a', '5eed0001-0000-0000-0000-000000000001'::uuid),
             ('b', '5eed0001-0000-0000-0000-000000000005'::uuid)) as v(tag, user_id);

update iso_actor x
   set cross_member = (
     select count(*)::int from public.workspace_member wm
      where wm.user_id = x.user_id
        and wm.workspace_id = (select ws_id from iso_actor o where o.tag <> x.tag));

-- ---------------------------------------------------------------------------
-- The fixture: one invite per workspace, rolled back with everything else
--
-- `workspace_invite` needs a manager or better to be readable at all
-- (`workspace_invite_select` is `has_role(workspace_id,'manager')`), which the
-- two owners are. Written as postgres because the point of the row is to exist,
-- not to prove an insert path — 3.2b is where writing into the wrong workspace
-- is the claim.
-- ---------------------------------------------------------------------------
create temp table iso_invite_before as
select count(*)::int as n from public.workspace_invite;

insert into public.workspace_invite (workspace_id, email, role, invited_by, token_hash)
select a.ws_id,
       'invite.' || a.tag || '@pgtap.invalid',
       'staff',
       a.user_id,
       'pgtap-3.2a-' || a.tag
from iso_actor a;

-- ---------------------------------------------------------------------------
-- Classification, stated so that a new table cannot slip through unmeasured
--
-- A table in `public` is tenant-scoped by `workspace_id`, or it is `workspace`
-- itself and scoped by `id`, or it is exempt — and the exempt set is the single
-- name 01's F3 already defends, `unit`. Anything else lands with `ws_col` null
-- and `exempt` false, and F6 goes red naming it. That is deliberate: a table
-- this suite cannot classify is a table this suite is not testing, and silence
-- there is exactly how a tenant table ships unmeasured.
-- ---------------------------------------------------------------------------
create temp table iso_table (
  tbl    name primary key,
  ws_col name,
  exempt boolean not null
);

insert into iso_table (tbl, ws_col, exempt)
select c.relname,
       case
         when exists (select 1 from pg_attribute a
                       where a.attrelid = c.oid and a.attname = 'workspace_id'
                         and a.attnum > 0 and not a.attisdropped) then 'workspace_id'
         when c.relname = 'workspace' then 'id'
       end,
       c.relname = 'unit'
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r';

-- ---------------------------------------------------------------------------
-- The measurement
--
-- Three passes per tenant table — the truth as postgres, then the same counts as
-- each owner — and one pass per table in `public` as `anon`. The role in force
-- during each authenticated pass is RECORDED (`role_seen`) rather than assumed,
-- because "the suite forgot to switch roles" and "RLS is broken" produce
-- identical numbers and F3 is what tells them apart.
--
-- `set role` is issued and reset around every measurement rather than once
-- around the loop, so a failure part-way cannot leave later rows measured under
-- a role nobody chose. F10 confirms the session came back.
-- ---------------------------------------------------------------------------
create temp table iso_read (
  tbl       name primary key,
  n_a       int not null,   -- rows in workspace A, as postgres (BYPASSRLS)
  n_b       int not null,   -- rows in workspace B, as postgres
  a_own     int not null,   -- of A's rows, what owner A sees
  a_other   int not null,   -- of B's rows, what owner A sees   <- must be 0
  a_total   int not null,   -- everything owner A sees          <- must be n_a
  b_own     int not null,
  b_other   int not null,   --                                  <- must be 0
  b_total   int not null,   --                                  <- must be n_b
  role_seen name not null
);

create temp table iso_anon (
  tbl       name primary key,
  mode      text not null,  -- 'denied' (no grant) | 'read' (grant exists)
  n_seen    int,            -- rows anon actually got back, when it got any
  role_seen name not null
);

do $$
declare
  r        record;
  v_ws_a   uuid := (select ws_id from iso_actor where tag = 'a');
  v_ws_b   uuid := (select ws_id from iso_actor where tag = 'b');
  v_usr_a  uuid := (select user_id from iso_actor where tag = 'a');
  v_usr_b  uuid := (select user_id from iso_actor where tag = 'b');
  v_n_a    int; v_n_b int;
  v_a_own  int; v_a_other int; v_a_total int;
  v_b_own  int; v_b_other int; v_b_total int;
  v_role   name;
  v_mode   text; v_seen int;
begin
  -- The claims of the caller, session-wide for the length of this block.
  -- `my_workspaces()` reads auth.uid(), which reads this GUC; without it the
  -- owners resolve to no workspaces at all and every T-all below goes red,
  -- which is the correct direction for that mistake to fail in.
  -- UNCLASSIFIED TABLES ARE SKIPPED HERE ON PURPOSE, not measured with a null
  -- column. `format('%I', null)` raises, and the raise would abort this block
  -- before `plan()` — failing the build, but with a message about identifier
  -- quoting rather than about a table nobody scoped. F6 is the test written to
  -- report it, and it can only report what it survives to reach.
  for r in select t.tbl, t.ws_col from iso_table t
            where not t.exempt and t.ws_col is not null order by t.tbl
  loop
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_n_a using v_ws_a;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_n_b using v_ws_b;

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_usr_a, 'role', 'authenticated')::text, true);
    execute 'set role authenticated';
    v_role := current_user;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_a_own using v_ws_a;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_a_other using v_ws_b;
    execute format('select count(*)::int from public.%I', r.tbl) into v_a_total;
    execute 'reset role';

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_usr_b, 'role', 'authenticated')::text, true);
    execute 'set role authenticated';
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_b_own using v_ws_b;
    execute format('select count(*)::int from public.%I where %I = $1', r.tbl, r.ws_col)
      into v_b_other using v_ws_a;
    execute format('select count(*)::int from public.%I', r.tbl) into v_b_total;
    execute 'reset role';

    insert into iso_read values (r.tbl, v_n_a, v_n_b, v_a_own, v_a_other, v_a_total,
                                 v_b_own, v_b_other, v_b_total, v_role);
  end loop;

  -- `anon` is the signed-OUT caller. On this schema it is stopped one step
  -- earlier than RLS: every migration opens with `revoke all … from anon,
  -- authenticated` and never grants anon back, so the refusal is a missing
  -- GRANT and the policy is never consulted. Recording WHICH refusal it was
  -- matters — "denied" and "read zero rows" are different facts about the
  -- schema, and a future migration that grants anon a select would turn this
  -- from the first into the second while every count stayed at zero.
  for r in select t.tbl from iso_table t order by t.tbl
  loop
    execute 'set role anon';
    v_role := current_user;
    begin
      execute format('select count(*)::int from public.%I', r.tbl) into v_seen;
      v_mode := 'read';
    exception when insufficient_privilege then
      v_mode := 'denied'; v_seen := null;
    end;
    execute 'reset role';
    insert into iso_anon values (r.tbl, v_mode, v_seen, v_role);
  end loop;

  perform set_config('request.jwt.claims', null, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- The plan is COMPUTED from what was measured, never hardcoded: 10 fixed tests,
-- 4 per tenant table, 1 per table in `public` for the anon pass. A tenant table
-- added by a future migration is measured and asserted the day it lands. F1 is
-- what stops that arithmetic from being satisfied by measuring nothing.
-- ---------------------------------------------------------------------------
select plan(
  10
  + 4 * (select count(*)::int from iso_read)
  + (select count(*)::int from iso_anon)
);

-- ---------------------------------------------------------------------------
-- Fixed tests F1–F10
-- ---------------------------------------------------------------------------

-- F1. THE FLOOR. Every per-table test below is generated from `iso_read`, so an
-- empty `iso_read` is a plan of ten passing tests and a green that measured no
-- isolation at all. Nineteen is what 0001–0004 applied once `unit` is set aside.
select cmp_ok((select count(*)::int from iso_read), '>=', 19,
  'F1 at least the nineteen tenant tables 0001-0004 applied were measured');

-- F2. THE ROLE HAS NO WAY OUT. If `authenticated` were superuser or carried
-- BYPASSRLS, every count below would be postgres's counts wearing another name.
-- The session user is checked too, and is expected to HAVE the bypass — that is
-- the asymmetry the whole suite rests on, and supabase/README.md's warning.
select ok(
  (select not rolsuper and not rolbypassrls from pg_roles where rolname = 'authenticated')
  and (select rolbypassrls from pg_roles where rolname = current_setting('session_authorization')),
  'F2 authenticated is neither superuser nor BYPASSRLS, and the session user is'
);

-- F3. THE SWITCH HAPPENED, per pass, from what the pass recorded.
select is(
  (select coalesce(array_agg(distinct role_seen), '{}') from iso_read),
  array['authenticated']::name[],
  'F3 every tenant-table measurement ran under set role authenticated'
);

-- F4. TWO OWNERS, ONE WORKSPACE EACH, AND THEY ARE DIFFERENT.
select ok(
  (select count(*) = 2 from iso_actor where ws_count = 1 and ws_id is not null)
  and (select count(distinct ws_id) = 2 from iso_actor),
  'F4 the seed offers two owners of two distinct workspaces'
);

-- F5. AND NEITHER IS A MEMBER OF THE OTHER'S. Without this every T-read is the
-- trivially true claim that a non-member sees nothing — true, but it would stay
-- true if the seed made them colleagues, and then it would be false and green.
select is(
  (select coalesce(sum(cross_member), 0)::int from iso_actor), 0,
  'F5 neither owner holds a membership in the other workspace'
);

-- F6. NOTHING IN public WENT UNCLASSIFIED. See the classification block: a table
-- this suite cannot place is a table it is not testing.
select is_empty(
  $$ select tbl from iso_table where ws_col is null and not exempt $$,
  'F6 every table in public is tenant-scoped by a known column, or named exempt'
);

-- F7. NON-VACUITY, PER TABLE. "A sees none of B's rows" is worth nothing where B
-- has no rows. Stated as the set of offenders so a failure names the table.
select is_empty(
  $$ select tbl from iso_read where n_a = 0 or n_b = 0 $$,
  'F7 every tenant table held rows in BOTH workspaces when it was measured'
);

-- F8. THE ONE TABLE BOTH USERS READ IN FULL, named rather than left to inference.
-- `unit` is vocabulary — kilograms and litres belong to nobody (01's F4) — and
-- `unit_read_all` is `using (true)` on purpose. If a second table ever reads this
-- way it will not be here; it will be a T-read failure.
select ok(
  (select exempt from iso_table where tbl = 'unit')
  and (select count(*) = 1 from iso_table where exempt),
  'F8 unit is the single deliberate hole, and it is still the only one'
);

-- F9. THE FIXTURE IS THIS SUITE'S, AND IT SAYS SO. `workspace_invite` is empty in
-- the seed; the two rows measured above were written by this file and go back
-- with the rollback. If a future seed populates it, this turns red and someone
-- decides whether the fixture is still wanted — rather than the suite silently
-- measuring somebody else's rows.
select is((select n from iso_invite_before), 0,
  'F9 workspace_invite was empty in the seed; this suite supplied its own rows');

-- F10. THE SESSION CAME BACK. `set role` was issued around twenty times above;
-- if the last reset had been missed, every test in this file would be running as
-- `authenticated` and the temp tables would be unreadable — but a future edit
-- could leave the session somewhere quieter than that.
select is(current_user::name, session_user::name,
  'F10 the session is back to its own role after the measurement');

-- ---------------------------------------------------------------------------
-- Per tenant table, both directions
-- ---------------------------------------------------------------------------

select is(a_other, 0,
  'T-read ' || tbl || ' workspace A sees none of workspace B''s rows')
from iso_read order by tbl;

select is(b_other, 0,
  'T-read ' || tbl || ' workspace B sees none of workspace A''s rows')
from iso_read order by tbl;

select is(a_total, n_a,
  'T-all ' || tbl || ' workspace A sees all ' || n_a || ' of its own rows and no others')
from iso_read order by tbl;

select is(b_total, n_b,
  'T-all ' || tbl || ' workspace B sees all ' || n_b || ' of its own rows and no others')
from iso_read order by tbl;

-- ---------------------------------------------------------------------------
-- The signed-out caller
--
-- Every table in `public`, `unit` included: anon is refused before RLS is
-- reached. 01 makes both halves of that claim from the catalog — F9, that anon
-- holds no privilege on any base table, and F11, that every policy targets
-- `authenticated` rather than PUBLIC. This is the same claim made by asking.
-- The two can disagree: a `grant select` that F9 catches would leave anon facing
-- the policies, and a policy left on PUBLIC would then be a read of live rows by
-- a caller who never signed in. `mode` is recorded so the day that happens the
-- failure says which of the two doors was opened.
-- ---------------------------------------------------------------------------
select is(mode, 'denied',
  'T-anon ' || tbl || ' is refused to the signed-out caller at the grant, before RLS')
from iso_anon order by tbl;

-- ---------------------------------------------------------------------------
-- `finish(exception_on_failure := true)` RAISES so psql exits non-zero; plain
-- psql prints "not ok" and exits 0. Same reasoning, and same spelling trap, as
-- 01_rls_coverage.sql documents at its own tail.
--
-- The ROLLBACK below is what returns `workspace_invite` to empty. It is not
-- reached when a test fails — psql stops on the exception and drops the
-- connection, which rolls the transaction back anyway.
-- ---------------------------------------------------------------------------
select * from finish(exception_on_failure := true);

rollback;
