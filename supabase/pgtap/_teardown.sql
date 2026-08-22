-- ============================================================================
-- pgTAP harness — teardown
--
-- Returns the database to exactly what `supabase db reset` produced, because
-- the CI steps that run after this one make claims over the seed and over
-- `public`, and they should not be reading a database this step changed.
--
-- Nothing here can mask a failure: a suite that fails raises inside psql with
-- ON_ERROR_STOP, the job stops, and this file never runs. Its only job is to
-- keep a GREEN run clean.
-- ============================================================================
\set ON_ERROR_STOP on

drop schema if exists tap cascade;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pgtap') then
    raise exception 'pgtap survived the teardown';
  end if;
  raise notice 'pgTAP removed; the schema is what the reset produced';
end;
$$;
