-- ============================================================================
-- 01 — RLS COVERAGE (structural)
--
-- ADR-035 §2.10, first row: "Structural: every table in `public` has RLS
-- enabled and at least one `tenant_isolation` policy. Fails the build on a
-- table shipped without one." And §2.10's own justification: "it is ten lines,
-- it needs no knowledge of the domain, and it catches the single likeliest
-- defect a new contributor introduces — a table shipped without a policy —
-- without anyone having to notice it in review."
--
-- ⚠️ NO POLICY IN THIS SCHEMA IS NAMED `tenant_isolation`. The applied
-- migrations name policies `<table>_<verb>` — `sale_line_select`,
-- `provider_update` — forty of them, and the ADR's name appears on none. Read
-- literally, §2.10's suite fails on all twenty tables while the schema is
-- perfectly correct, which would make the suite noise on its first run.
-- So this file asserts the STRUCTURE the ADR is describing and not the NAME it
-- happened to use for it. The naming literal is flagged to the owner in
-- docs/PLAN.md task 3.1; either the ADR's word or the migrations' convention
-- should move, and that is not this file's call to make.
--
-- WHAT "STRUCTURAL" IS WORTH. Enabled-and-has-a-policy is a weak claim on its
-- own: `create policy p on t using (true)` satisfies it and protects nothing.
-- So the per-policy section below asserts every policy predicate reaches for a
-- tenancy helper — `my_workspaces()`, `my_locations()` or `has_role()` — with
-- exactly ONE exemption, named in full, for the `unit` reference table.
--
-- WHAT THIS FILE DOES *NOT* CLAIM. It never reads a row. It says the walls are
-- standing and load-bearing; it does not say a user in workspace A gets zero
-- rows from workspace B. That is 3.2a and 3.2b, under `set role authenticated`,
-- because the postgres superuser bypasses RLS and would pass it vacuously.
-- It also cannot see a table whose SELECT policy is scoped and whose INSERT
-- policy is not — it checks every policy, but "scoped" here means "mentions a
-- helper", not "mentions the right one". 3.2b is where writes get tested.
--
-- WHERE THIS RUNS. Immediately after `supabase db reset`, BEFORE the seed
-- checks. Every file in supabase/checks/ creates `public._verify` and leaves it
-- standing on purpose (docs/PLAN.md, "a check that rolls back deletes its own
-- results"), and _cleanup.sql truncates rather than drops. So by the time the
-- behavioural suites run, `public` holds five scaffolding tables with no RLS
-- and no policies, and this suite would report five failures that are not
-- defects. Test F2 asserts that scaffolding is absent, so this file goes red
-- rather than lying if it is ever moved down the workflow.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
set search_path = tap, public, pg_catalog;
set client_min_messages = warning;

-- The plan is COMPUTED, not hardcoded: 11 fixed tests, 2 per base table in
-- `public`, 1 per policy. A table added by a future migration is covered the
-- day it lands, with nobody having to remember this file exists — which is the
-- entire point of a structural suite. Non-vacuity is bought separately, by F1
-- and F2 below, and not by a magic number here.
select plan(
  11
  + 2 * (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r')
  + (select count(*)::int from pg_policy p join pg_class c on c.oid = p.polrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r')
);

-- ---------------------------------------------------------------------------
-- Fixed tests F1–F11
-- ---------------------------------------------------------------------------

-- F1. THE FLOOR. A computed plan over an empty schema is `plan(11)` and eleven
-- passing tests — a green from a suite that measured nothing, which is the
-- vacuous pass ADR-035 §9 exists to refuse. Twenty is what 0001–0004 applied;
-- the assertion is `>=` so a new migration never has to edit this line, and the
-- count is printed either way so a reviewer sees the real number.
select cmp_ok(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'),
  '>=', 20,
  'F1 public holds at least the twenty base tables 0001-0004 applied'
);

-- F2. NO SCAFFOLDING. See the header: this is also the assertion that catches
-- this file being moved to the wrong side of the seed-checks step.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname like '\_%' $$,
  'F2 no check or seed scaffolding is standing in public when this suite runs'
);

-- F3. THE EXEMPT TABLE SET, stated as a set rather than as a rule. Adding a
-- second untenanted table to this schema turns this test red, and the only way
-- to make it green is to edit this line — which is a person writing down why.
select is(
  (select coalesce(array_agg(t.relname order by t.relname), '{}')
     from pg_class t join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relkind = 'r'
      and not exists (
        select 1 from pg_policy p
         where p.polrelid = t.oid
           and coalesce(pg_get_expr(p.polqual, p.polrelid), '')
             || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')
             ~ 'my_workspaces\(|my_locations\(|has_role\(')),
  array['unit']::name[],
  'F3 exactly one table in public is exempt from tenant scoping, and it is unit'
);

-- F4. AND `unit` DESERVES THE EXEMPTION. A reference table of kilograms and
-- litres belongs to nobody; the moment it grows a tenant column it is data, not
-- vocabulary, and `using (true)` becomes a leak.
select is_empty(
  $$ select a.attname from pg_attribute a
      where a.attrelid = 'public.unit'::regclass and a.attnum > 0 and not a.attisdropped
        and (a.attname like '%workspace%' or a.attname like '%location%'
             or a.attname like '%tenant%') $$,
  'F4 unit carries no workspace, location or tenant column — it is vocabulary'
);

-- F5. THE EXEMPT POLICY, named in full. F3 is the ADR's table-level sentence;
-- this is the one with teeth. `using (true)` anywhere else is a hole, and this
-- names the single hole that is deliberate.
select is(
  (select coalesce(array_agg(c.relname || '.' || p.polname order by c.relname, p.polname), '{}')
     from pg_policy p join pg_class c on c.oid = p.polrelid
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and coalesce(pg_get_expr(p.polqual, p.polrelid), '')
        || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')
        !~ 'my_workspaces\(|my_locations\(|has_role\('),
  array['unit.unit_read_all']::text[],
  'F5 exactly one policy in public reaches for no tenancy helper, and it is unit_read_all'
);

-- F6. RLS DOES NOT APPLY TO A TABLE OWNER. If `authenticated` ever owns a table
-- in public, every policy on it is decoration. `force row level security` is
-- deliberately off across this schema, which is correct while the owner is
-- `postgres` and wrong the instant it is not.
select is_empty(
  $$ select c.relname || ' owned by ' || pg_get_userbyid(c.relowner)
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and pg_get_userbyid(c.relowner) in ('anon', 'authenticated', 'service_role') $$,
  'F6 no base table in public is owned by an app role — an owner bypasses RLS'
);

-- F7 / F8. The same bypass one level up. `service_role` is deliberately NOT
-- asserted here: it carries BYPASSRLS by Supabase's design and is the admin
-- key, which is exactly why it must never reach a device (ADR-035 §2.7). The
-- two roles a client actually authenticates as are the ones that must not.
select ok(
  (select not rolsuper and not rolbypassrls from pg_roles where rolname = 'authenticated'),
  'F7 authenticated is neither superuser nor BYPASSRLS'
);
select ok(
  (select not rolsuper and not rolbypassrls from pg_roles where rolname = 'anon'),
  'F8 anon is neither superuser nor BYPASSRLS'
);

-- F9. Nothing signed-out can touch the ledger. Note this is about GRANTS, not
-- policies: `anon` is named by no policy in this schema, so RLS already denies
-- it everything — but a grant is what a future migration adds by accident, and
-- default privileges in `public` hand out TRIGGER and TRUNCATE unasked.
select is_empty(
  $$ select g.table_name || ' ' || g.privilege_type
       from information_schema.role_table_grants g
       join pg_class c on c.relname = g.table_name and c.relkind = 'r'
       join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      where g.table_schema = 'public' and g.grantee = 'anon' $$,
  'F9 anon holds no privilege on any base table in public'
);

-- F10. TRUNCATE IS NOT A DELETE. It ignores row-level security entirely, so a
-- single stray grant would let a cashier empty another tenant's ledger through
-- a wall this whole file is about. `authenticated` holds SELECT on twenty
-- tables, INSERT and UPDATE on eight, DELETE on four — and TRUNCATE on none.
select is_empty(
  $$ select g.table_name
       from information_schema.role_table_grants g
       join pg_class c on c.relname = g.table_name and c.relkind = 'r'
       join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      where g.table_schema = 'public' and g.grantee = 'authenticated'
        and g.privilege_type = 'TRUNCATE' $$,
  'F10 authenticated holds TRUNCATE on nothing — TRUNCATE bypasses RLS'
);

-- F11. A policy with no role list applies to PUBLIC, which includes `anon`.
-- All forty here name `authenticated` explicitly; this keeps it that way.
select is_empty(
  $$ select c.relname || '.' || p.polname
       from pg_policy p join pg_class c on c.oid = p.polrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and (p.polroles = '{0}'::oid[]
             or exists (select 1 from unnest(p.polroles) r
                         where pg_get_userbyid(r) <> 'authenticated')) $$,
  'F11 every policy in public targets authenticated and not PUBLIC'
);

-- ---------------------------------------------------------------------------
-- Per-table: two tests each, one row per table, so a failure names the table
-- ---------------------------------------------------------------------------

select ok(
  c.relrowsecurity,
  'T-rls ' || c.relname || ' has row level security enabled'
)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

select ok(
  (select count(*) from pg_policy p where p.polrelid = c.oid) > 0,
  'T-pol ' || c.relname || ' carries at least one policy'
)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- ---------------------------------------------------------------------------
-- Per-policy: the predicate reaches for a tenancy helper
--
-- `my_workspaces()` is the tenant wall, `my_locations()` the store wall — and
-- `my_locations()` is itself derived from the caller's workspaces, which is why
-- `location_select`, whose predicate names only the second, is not a hole.
-- `has_role(workspace_id, ...)` takes the tenant as its first argument, so it
-- is a wall and a role check at once. Anything mentioning none of the three is
-- an unconditional predicate, and F5 says which single one of those is meant.
-- ---------------------------------------------------------------------------

select ok(
  coalesce(pg_get_expr(p.polqual, p.polrelid), '')
    || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')
    ~ 'my_workspaces\(|my_locations\(|has_role\('
  or (c.relname = 'unit' and p.polname = 'unit_read_all'),
  'T-scope ' || c.relname || '.' || p.polname
    || ' is scoped by a tenancy helper, or is the one exemption F5 names'
)
from pg_policy p join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname, p.polname;

-- ---------------------------------------------------------------------------
-- `finish(exception_on_failure := true)` RAISES when a test failed or the plan
-- did not match, so psql exits non-zero and the CI job stops. Plain psql prints
-- "not ok 2" to stdout and exits 0 — a red suite that looks exactly like a
-- green one to a workflow. pgTAP 1.3.3 has no `finish(exception := ...)`; the
-- parameter is spelled `exception_on_failure`, and getting it wrong is a silent
-- ERROR that also fails the job, which is the safe direction to be wrong in.
-- ---------------------------------------------------------------------------
select * from finish(exception_on_failure := true);
