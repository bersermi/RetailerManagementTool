-- ============================================================================
-- Between-suite cleanup — NOT a test suite
-- ============================================================================
-- Files in this directory whose name begins with `_` are harness, not suites.
-- The CI loop in .github/workflows/db.yml skips them when choosing what to run,
-- and runs this one before each suite.
--
-- WHY THIS EXISTS. Every suite assumes a database holding nothing but its own
-- fixture: they share hardcoded user uuids, they all create `public._verify`,
-- and many assert absolute counts (`count(*) = 2`) that are only true on a clean
-- database. The gate used to satisfy that with a full `supabase db reset` before
-- each file — correct, and 20.5s each. This does the same job in 0.56s.
--
-- WHAT IS NOT TRADED AWAY. The full reset still runs ONCE, before any suite, and
-- that is the run proving every migration applies from scratch — the ADR-035 §9
-- claim itself. This file only replaces the repeats.
--
-- WHY TRUNCATE IS EVEN LEGAL HERE. Documents, batches and movements all carry a
-- `before update or delete` trigger that raises `restrict_violation`, so a DELETE
-- would be refused — as it should be. TRUNCATE does not fire row triggers. That
-- is the whole reason this approach works, and it is also why nothing here
-- weakens the append-only guarantee: no row is ever deleted, the tables are
-- emptied wholesale between suites and never during one.
--
-- THE TABLE SWEEP IS DYNAMIC, deliberately. It reads pg_tables rather than
-- naming tables, so a table added by a future migration is covered on the day it
-- lands and nobody has to remember this file. The known gap is non-table objects:
-- a suite that creates a TYPE or a standalone SEQUENCE would leak it, so add it
-- to the explicit drops below if that day comes. The self-check at the end is
-- what stops any of this failing quietly.
-- ============================================================================

-- TRUNCATE ... CASCADE announces every table it reaches, which is roughly 85
-- NOTICE lines per run and four runs a job. That noise lands in the same CI log a
-- reviewer has to read the check counts out of by name, so it is suppressed here
-- and only here. Warnings and errors still surface. Session-scoped rather than
-- `set local`, which would need a transaction and would expire before the block
-- below ever ran — this file is its own psql invocation, so the session ends with
-- it and nothing leaks into a suite.
set client_min_messages = warning;

do $$
declare
  r       record;
  v_rows  bigint;
  v_units bigint;
begin
  -- 1. Test scratch. Every suite writes `public._verify`; 0005 also leaves a
  --    dozen `_a1`.. `_t3` result tables behind. All are `_`-prefixed by
  --    convention, which is what makes this sweepable rather than a list.
  for r in select tablename from pg_tables
            where schemaname = 'public' and left(tablename, 1) = '_'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;

  -- 2. The two helper functions every suite defines. Explicit, because there is
  --    no naming convention that separates them from schema functions.
  drop function if exists public.chk(text, boolean, text);
  drop function if exists public.chk_raises(text, text, text);
  -- ⚠️ ADDED 2026-09-04 (task 4e-ii-a). This is the "known gap" the header
  -- above names, arriving: a suite that ABORTS partway never reaches its own
  -- drop, so a helper it created survives into the NEXT suite of the same CI
  -- job and every one after it dies on "function already exists". Found while
  -- falsifying 0021 — five mutations in a row reported a harness error rather
  -- than the defect they injected. Dropping it HERE rather than only at the end
  -- of the suite is what makes that impossible.
  drop function if exists public.chk_succeeds(text, text, text);

  -- ⚠️ ADDED 2026-09-05 (task 4f). The known gap arriving a SECOND time, and it
  -- cost the same hour: `0022` defines `chk_json`, the same catch-and-record
  -- mirror of chk_raises that 4e-ii-a added `chk_succeeds` for, and five
  -- falsifications in a row reported "function chk_json already exists" instead
  -- of the defect they injected — a mutation that turns NOTHING red and a
  -- mutation whose suite never ran look identical from the outside. The lesson
  -- is not "remember to drop"; it is that EVERY helper a suite creates belongs
  -- in this block on the day the suite lands, because the suite's own drop is
  -- unreachable in exactly the case that matters.
  drop function if exists public.chk_json(text, text, text, text);
  drop function if exists public._adj(uuid, uuid, numeric, text, timestamptz, boolean);
  drop function if exists public._bal(uuid, uuid);
  drop function if exists public._pl(uuid, numeric, numeric, date);

  -- ⚠️ ADDED 2026-09-05 (task 4.5a), and this time BEFORE the falsifications
  -- rather than after five of them reported a harness error. 4f wrote the rule
  -- above and this is it being followed: every helper `0023` creates is listed
  -- here on the day the suite lands. `_sl` was ALREADY a gap — `0022` creates it
  -- and drops it at its own end, which is unreachable in exactly the case that
  -- matters — so it is closed here too rather than left for the next abort.
  drop function if exists
    public._asd(uuid, uuid, numeric, text, text, timestamptz, boolean, uuid);
  drop function if exists public._sl(uuid, numeric, numeric);
  drop function if exists public._lot(uuid);

  -- ⚠️ ADDED 2026-09-05 (task 4.5b). Same rule, same day the suite lands.
  drop function if exists public._rfw(uuid, text, uuid, jsonb, text, text, uuid);
  drop function if exists public._pay(uuid, jsonb, timestamptz);
  drop function if exists public._fwq(uuid);
  drop function if exists public._fwn(uuid);
  drop function if exists public.chk_raises_like(text, text, text, text);

  -- 3. Every business table. `unit` is excluded because it is reference data
  --    seeded by migration 0001, not fixture — emptying it would break every
  --    suite in a way that looks like a schema bug.
  for r in select tablename from pg_tables
            where schemaname = 'public'
              and left(tablename, 1) <> '_'
              and tablename <> 'unit'
  loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;

  -- 4. The users the fixtures invent. CASCADE reaches auth's own dependent
  --    tables as well as anything in public still pointing at them.
  truncate table auth.users cascade;

  -- ---- self-check -------------------------------------------------------
  -- A cleanup that silently did half its job would leave the NEXT suite
  -- asserting counts against someone else's fixture, and it would pass. That is
  -- the same vacuous-green failure the concurrency suite exists to avoid, so it
  -- is checked rather than assumed.
  for r in select tablename from pg_tables
            where schemaname = 'public'
              and left(tablename, 1) <> '_'
              and tablename <> 'unit'
  loop
    execute format('select count(*) from public.%I', r.tablename) into v_rows;
    if v_rows > 0 then
      raise exception 'cleanup left % row(s) in public.% — the next suite would '
                      'assert against them', v_rows, r.tablename;
    end if;
  end loop;

  select count(*) into v_units from public.unit;
  if v_units = 0 then
    raise exception 'cleanup emptied public.unit — that is migration-seeded '
                    'reference data, not fixture';
  end if;
end;
$$;
