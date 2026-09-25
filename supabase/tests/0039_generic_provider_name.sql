-- ============================================================================
-- Behavioural verification for 0039 — the generic provider's name
-- ============================================================================
-- ADR-035 §2.3, §9. docs/PLAN.md task 5g.5.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0039_generic_provider_name.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `0039` changes ONE string literal inside `onboard_workspace` and runs ONE
-- `update` over rows that already carry the old one. That is the smallest claim
-- any migration in this repository has made, and it has the same large failure
-- mode every `create or replace` has: **the body is a TRANSCRIPTION**, so the
-- diff that ships is not the diff that was intended if one line went astray.
-- Section 2 is therefore about what did NOT move, exactly as `0036` and `0038`
-- learned to be.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SECTION 3 IS THE HALF A SEED-ONLY CHANGE WOULD HAVE MISSED
-- ----------------------------------------------------------------------------
-- The cheap version of this migration is one literal. It would be correct for
-- every shop created after it and wrong for every shop created before, and
-- **nothing anywhere would disagree** — the header would say one word and the
-- ledger's rows another, for ever. So 3.1 plants a row carrying the old name and
-- 3.2 proves the `update` reached it.
--
-- ⚠️ 3.3 IS THE COLLISION, AND IT IS THE ONE THAT WOULD HAVE TAKEN A DEPLOYMENT
-- DOWN. `provider_name_unique` is `(workspace_id, normalized_name)` over a
-- GENERATED column, so a shop that had created a *named* supplier called
-- `Genérico` at some point makes the blind `update` raise — and a migration that
-- fails on one tenant's data stops the deployment for everybody. Decision 2
-- skips those shops; this check drives that shop into existence and proves the
-- migration's own logic leaves it alone rather than raising.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS FILE CANNOT SEE
-- ----------------------------------------------------------------------------
-- It cannot see the word a shopkeeper reads. `Comprando a:` is `5g-ii`'s and
-- §2.11 keeps rendering out of scope; what reads the name off the WIRE is
-- `docs/checks/5g-i-purchase-contract.sh` assertion 3, and that assertion is
-- deliberately kept rather than retired with the question it was written for.
--
-- It cannot see the hosted database. A file is not evidence and this suite runs
-- against a local reset; `5R-f`'s check is what compares the two.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;

-- The source of an applied function, for the transcription guards below.
create function public._src(p_name text)
returns text language sql stable as $$
  select prosrc from pg_proc
   where pronamespace = 'public'::regnamespace and proname = p_name
   limit 1;
$$;

-- ⚠️ THE TWO TRIGGER PROBES CATCH RATHER THAN RAISE. `provider_protect_generic`
-- raises `restrict_violation`, and a bare raise inside this file ABORTS it under
-- `ON_ERROR_STOP` — so the suite would print NO rows at all and the check
-- written for exactly that behaviour would never record it. That is the trap
-- `0036`'s suite paid for, named there in its own words.
create function public._deletes_ok(p_workspace uuid)
returns boolean language plpgsql as $$
begin
  delete from public.provider where workspace_id = p_workspace and is_generic;
  raise exception 'rollback the probe' using errcode = 'TDPRB';
exception
  when sqlstate 'TDPRB' then return true;   -- the delete was allowed
  when others then return false;            -- the trigger refused it
end;
$$;

create function public._demotes_ok(p_workspace uuid)
returns boolean language plpgsql as $$
begin
  update public.provider set is_generic = false
   where workspace_id = p_workspace and is_generic;
  raise exception 'rollback the probe' using errcode = 'TDPRB';
exception
  when sqlstate 'TDPRB' then return true;
  when others then return false;
end;
$$;


-- ============================================================================
-- 1. The seed itself
-- ============================================================================

select chk('1.1 onboard_workspace seeds the generic provider as Genérico',
           public._src('onboard_workspace') like '%''Genérico''%',
           'the literal 0039 changed');

select chk('1.2 and it no longer seeds the old name',
           public._src('onboard_workspace') not like '%Compra directa%',
           'a create or replace that kept both would seed whichever came first');

-- ⚠️ THE SEED IS STILL FLAGGED, which is a different claim from its name and the
-- one every other part of the system actually reads. `provider_one_generic_per_
-- workspace_idx` and `provider_protect_generic` both key on `is_generic`, and so
-- does `providersFrom` in the app.
select chk('1.3 the seeded row is still is_generic, which is what everything reads',
           public._src('onboard_workspace') like '%is_generic%'
       and public._src('onboard_workspace') like '%true)%',
           'the flag, not the word, is the contract');


-- ============================================================================
-- 2. What did NOT move  (the transcription guard)
-- ============================================================================
-- `onboard_workspace` has SIX inserts and two guards. One literal moved; if a
-- seventh line went with it, `0039` is a correct rename and a broken onboarding
-- and nothing above would say so.

select chk('2.1 the authentication guard survives',
           public._src('onboard_workspace') like '%insufficient_privilege%',
           'a caller with no session is still refused');

select chk('2.2 the blank-name guard survives',
           public._src('onboard_workspace') like '%workspace display name is required%',
           'check_violation on an empty shop name');

select chk('2.3 the workspace code is still generated',
           public._src('onboard_workspace') like '%generate_workspace_code%',
           '0027');

-- ⚠️ 2.4 IS THE RULE `0036` WROTE DOWN AFTER SHIPPING ITS OPPOSITE: transcribe
-- from the LATEST create or replace, not from the migration that first created
-- the function. `0034:207` added `auth_full_name`, so an owner arrives NAMED —
-- and a transcription from `0027` would revert the owner's ruling of 2026-09-18
-- with nothing in that task's own suite going red.
select chk('2.4 the owner still arrives NAMED — 0034 was the transcription source',
           public._src('onboard_workspace') like '%auth_full_name%',
           'the D7 rule, re-performed here');

select chk('2.5 the settings row is still created',
           public._src('onboard_workspace') like '%workspace_setting%',
           '0001');

select chk('2.6 the first location is still created',
           public._src('onboard_workspace') like '%public.location%',
           'and it still falls back to the shop name');

select chk('2.7 the owner membership is still created',
           public._src('onboard_workspace') like '%''owner''%',
           'workspace_member');


-- ============================================================================
-- 3. The rows that already existed  (decisions 1 and 2)
-- ============================================================================

-- Two shops the seed files never made, built here so this section owns its own
-- fixture: one with a generic row carrying the old name, one that also holds a
-- NAMED supplier called Genérico.
insert into public.workspace (id, display_name, code)
values ('39000000-0000-4000-8000-000000000001', 'Tienda 0039 A', 'TST0039A'),
       ('39000000-0000-4000-8000-000000000002', 'Tienda 0039 B', 'TST0039B');

insert into public.provider (workspace_id, name, is_generic) values
  ('39000000-0000-4000-8000-000000000001', 'Compra directa', true),
  ('39000000-0000-4000-8000-000000000002', 'Un nombre cualquiera', true),
  ('39000000-0000-4000-8000-000000000002', 'Genérico', false);

select chk('3.1 the fixture really carries the old name before the update runs',
           (select count(*) from public.provider
             where workspace_id = '39000000-0000-4000-8000-000000000001'
               and is_generic and name = 'Compra directa') = 1,
           'a fixture that landed nothing would make 3.2 green for nothing');

-- ⚠️ THE MIGRATION'S OWN STATEMENT, RE-RUN. It is idempotent by construction —
-- `supabase db reset` re-applies it every session — so running it here is how
-- this suite drives the half that only touches pre-existing rows.
do $$
begin
  with blocked as (
    select p.workspace_id
      from public.provider p
     where p.normalized_name = public.normalize_name('Genérico')
       and not p.is_generic
  )
  update public.provider g
     set name = 'Genérico'
   where g.is_generic
     and g.name <> 'Genérico'
     and g.workspace_id not in (select workspace_id from blocked);
end $$;

select chk('3.2 a shop created before 0039 is renamed rather than left behind',
           (select name from public.provider
             where workspace_id = '39000000-0000-4000-8000-000000000001'
               and is_generic) = 'Genérico',
           'the half a seed-only change would have missed');

-- ⚠️⚠️ 3.3 IS THE DEPLOYMENT-STOPPER. Without decision 2 this update raises
-- `provider_name_unique` on shop B and every tenant's migration fails with it.
select chk('3.3 a shop whose NAMED supplier already holds the word is left alone',
           (select name from public.provider
             where workspace_id = '39000000-0000-4000-8000-000000000002'
               and is_generic) = 'Un nombre cualquiera',
           'skipped by decision 2 rather than raising and stopping everybody');

select chk('3.4 and that shop still has exactly one generic row',
           (select count(*) from public.provider
             where workspace_id = '39000000-0000-4000-8000-000000000002'
               and is_generic) = 1,
           'provider_one_generic_per_workspace_idx');

-- ⚠️ THE SWEEP, OVER WHATEVER IS IN THE DATABASE WHEN THIS RUNS. ⚠️⚠️ AND IT IS
-- NOT THE SEED FIXTURES: `_cleanup.sql` runs before every suite and truncates
-- every table but `unit`, so by the time this file starts the seeded shops are
-- gone and the only rows here are section 3's own two. **Saying so matters** —
-- a detail line claiming to cover the seed would be describing a reach this
-- check does not have, which is the vacuous-green shape this directory records.
-- What DOES cover the seed is `supabase db reset` itself: `0039` runs against
-- the seeded database during the reset, and `supabase/seeds/` selects the
-- generic provider by `is_generic` and never by name.
--
-- ⚠️⚠️ AND IT IS SCOPED TO THE SHOPS THE MIGRATION CLAIMS TO REACH, WHICH IS NOT
-- PEDANTRY — the first writing of this check said *every* generic provider and
-- went red on shop B, the one 3.3 proves is deliberately left alone. **A check
-- that contradicts its neighbour is a check that has not decided what it is
-- asserting**, and the honest claim is: every shop the update was allowed to
-- touch was touched.
select chk('3.5 every generic provider the update could reach now carries the word',
           not exists (
             select 1 from public.provider g
              where g.is_generic and g.name <> 'Genérico'
                and not exists (select 1 from public.provider n
                                 where n.workspace_id = g.workspace_id
                                   and not n.is_generic
                                   and n.normalized_name = public.normalize_name('Genérico'))),
           'section 3s own two shops — _cleanup has removed the seeded ones');


-- ============================================================================
-- 4. What the rename must NOT have broken
-- ============================================================================

-- ⚠️ `provider_protect_generic` guards DELETE and demotion and knows nothing
-- about the name. A rename that had somehow disturbed it would leave a shop able
-- to delete the one row `record_purchase` needs.
select chk('4.1 the generic row still cannot be deleted',
           (select public._deletes_ok('39000000-0000-4000-8000-000000000001')) = false,
           'restrict_violation from provider_protect_generic');

select chk('4.2 and it still cannot be demoted',
           (select public._demotes_ok('39000000-0000-4000-8000-000000000001')) = false,
           'the trigger guards both, and neither reads the name');


-- ============================================================================
-- 5. Did this file actually run?
-- ============================================================================
-- A green tick is also what a step that ran nothing looks like, and a suite that
-- silently SHRANK is the third shape. Only a pinned count catches it.

select chk('5.1 ALL 18 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 17,
           format('recorded=%s of 17 before this one',
                  (select count(*) from public._verify)));

drop function public._src(text);
drop function public._deletes_ok(uuid);
drop function public._demotes_ok(uuid);


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
