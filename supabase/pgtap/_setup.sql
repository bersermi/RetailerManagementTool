-- ============================================================================
-- pgTAP harness — setup
--
-- ADR-035 §2.10 names pgTAP as the home of five suites; ADR-035 §3 step 3 is
-- where they get written. This file is the harness, not a suite. Files in this
-- directory beginning with `_` are harness and are never run as suites, the
-- same convention supabase/tests/_cleanup.sql already follows.
--
-- WHY pgTAP IS NOT A MIGRATION. Everything in supabase/migrations/ is the
-- schema this project ships to a real shop. pgTAP is a test framework: roughly
-- a thousand functions, plus the views `tap_funky` and `pg_all_foreign_keys`.
-- Installing it as `0015` would put all of that in every production database
-- forever, and migrations are append-only — there would be no taking it back.
-- So it is installed here, per CI run, and dropped again by _teardown.sql.
--
-- WHY ITS OWN SCHEMA. `create extension pgtap` defaults to `public`, and its
-- two views land there beside the twenty tables the suites are about to make
-- structural claims over. A coverage suite that has to special-case its own
-- test framework is a coverage suite with a hole in it. In schema `tap` it
-- touches nothing the suites measure, and the teardown is one `drop schema`.
-- ============================================================================
\set ON_ERROR_STOP on

create schema if not exists tap;
create extension if not exists pgtap with schema tap;

-- Proof the harness is live, and proof it is nowhere near `public`.
do $$
begin
  if to_regprocedure('tap.ok(boolean, text)') is null then
    raise exception 'pgTAP did not install into schema tap';
  end if;
  if exists (
    select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_depend d on d.objid = c.oid and d.deptype = 'e'
      join pg_extension e on e.oid = d.refobjid and e.extname = 'pgtap'
     where n.nspname = 'public'
  ) then
    raise exception 'pgTAP put objects in public — the coverage suite measures public';
  end if;
  raise notice 'pgTAP % installed in schema tap',
    (select extversion from pg_extension where extname = 'pgtap');
end;
$$;
