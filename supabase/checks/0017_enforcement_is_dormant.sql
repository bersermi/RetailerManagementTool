-- ============================================================================
-- The availability check is DORMANT over the seed — 0017 against real trading
-- ============================================================================
-- ADR-035 §2.6 (the write surface), §1 (stock is recorded, not enforced), §9
-- (evidence). docs/PLAN.md task 4c-i.
--
-- `supabase/tests/0017_availability_check.sql` proves the enforcement path
-- REFUSES what it should, on a fixture built to be refused. This file asks the
-- opposite question, and it is the one that decides whether 0017 was safe to
-- merge: **does the path stay out of the way of three months of real trading?**
--
-- §2.6 is unambiguous about what shipping this migration is allowed to change:
--
--   "v1 ships with no toggle and open mode always on. The pilot decides whether
--    oversales are a real problem before paying for the UI, the override role
--    and the offline degradation path."
--
-- So the claim is NOTHING, and "nothing" is the hardest claim in this file to
-- make honestly — because a path that is absent and a path that is dormant look
-- identical from the outside. Both record the oversale. Six claims, and claim 5
-- is the one that tells them apart:
--
--   1. pre-flight — this is the seed these numbers were read from;
--   2. every workspace resolves the DEFAULT to false;
--   3. no variant in the catalog opts in;
--   4. ⚠️ therefore enforcement resolves FALSE for every variant in the
--      database, computed with the SAME coalesce the function uses — not with
--      a restatement of it;
--   5. ⚠️ THE DORMANCY IS LOAD-BEARING, MEASURED: the seed contains sales that
--      enforcement WOULD have refused. If it did not, claims 2–4 would be true
--      of a database where the switch could not matter either way, and this
--      whole file would be green over an absent path;
--   6. the path is nonetheless PRESENT in the applied function — which is a
--      structural claim, and it is the weakest one here on purpose. What makes
--      it evidence is the file next door, where the same function refuses a
--      sale the moment a variant opts in.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/ — `_cleanup.sql` truncates every
-- table but `unit` before each suite, so the seed is gone before the first one
-- runs. 1.7, 2.1, 2.2, 2.3, 2.4, 0014 and 0015 all give this reason.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

set client_min_messages = warning;
drop table if exists public._verify cascade;
reset client_min_messages;

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;


-- ============================================== 1. there is a seed here ======
-- Everything below is conditional on this. Claims 2–4 are all of the form "no
-- row anywhere does X", and every one of them is vacuously true of an empty
-- database — the shape ADR-035 §9 exists to refuse.

select chk('seed present: a catalog and a ledger, not a toy',
           (select count(*) from product_variant) >= 20
       and (select count(*) from stock_movement)  >= 2000,
           format('%s variants, %s movements',
                  (select count(*) from product_variant),
                  (select count(*) from stock_movement)));

select chk('seed present: both tenants have settings rows to resolve against',
           (select count(*) from workspace_setting) >= 2,
           format('%s settings rows over %s workspaces',
                  (select count(*) from workspace_setting),
                  (select count(*) from workspace)));


-- ================================== 2–4. enforcement resolves to open ========

select chk('every workspace defaults to OPEN — enforce_stock_default is false',
           not exists (select 1 from workspace_setting where enforce_stock_default),
           format('%s of %s workspaces enforce by default',
                  (select count(*) from workspace_setting where enforce_stock_default),
                  (select count(*) from workspace_setting)));

-- Null is the shipped value and it means "defer". An explicit false would be
-- just as open, so the claim is about `true` and not about nullness.
select chk('no variant in either catalog opts IN — product_variant.enforce_stock',
           not exists (select 1 from product_variant where enforce_stock),
           format('%s opted in, %s deferring, %s opted out',
                  (select count(*) from product_variant where enforce_stock),
                  (select count(*) from product_variant where enforce_stock is null),
                  (select count(*) from product_variant where enforce_stock = false)));

-- ⚠️ THE RESOLUTION, NOT THE TWO COLUMNS. Claims 2 and 3 could both hold while
-- a variant in a workspace with no settings row resolved to null and the
-- function's `if v_enforce` fell through on a null — which is not false. This
-- check runs the function's own expression, left join and all, over every
-- variant in the database, and asserts the answer is the boolean `false` for
-- all of them.
select chk('⚠️ enforcement RESOLVES false for every variant — the function''s own '
           'coalesce, not a restatement of it',
           not exists (
             select 1
               from product_variant pv
               left join workspace_setting ws on ws.workspace_id = pv.workspace_id
              where coalesce(pv.enforce_stock, ws.enforce_stock_default, false)
                    is distinct from false),
           format('%s variants resolved, %s of them not false',
                  (select count(*) from product_variant),
                  (select count(*) from product_variant pv
                     left join workspace_setting ws on ws.workspace_id = pv.workspace_id
                    where coalesce(pv.enforce_stock, ws.enforce_stock_default, false)
                          is distinct from false)));


-- ================================ 5. the dormancy is LOAD-BEARING ===========
-- ⚠️ THE CHECK THAT STOPS THIS FILE BEING GREEN OVER AN ABSENT PATH. A seed in
-- which no sale ever went short would satisfy every claim above with the
-- enforcement path deleted, present, or switched hard on — the switch could not
-- have mattered. So: measure the sales it WOULD have refused.
--
-- A negative `batch_balance` is the fingerprint. `allocate_fefo()` overdraws
-- the lot it ran out on (0010 branch 1) rather than refusing, so a lot below
-- zero is a lot that was sold past its stock — precisely the ticket an enforced
-- variant would have raised TD002 on. The seed carries these on purpose:
-- 1.6b writes two deliberate oversales and 1.6c voids a delivery that had
-- already been sold through (see supabase/checks/seed_invariant.sql, which
-- asserts they are still there for the same reason).
select chk('⚠️ the seed contains sales enforcement WOULD have refused — so '
           '"dormant" is doing work, not describing a case that cannot arise',
           (select count(*) from batch_balance where remaining_base < 0) > 0,
           format('%s lots below zero, %s base units of debt',
                  (select count(*) from batch_balance where remaining_base < 0),
                  (select coalesce(sum(remaining_base), 0) from batch_balance
                    where remaining_base < 0)));

-- And they were RECORDED, not refused: the documents are there. This is the
-- other half of the same claim — a negative balance with no sale behind it
-- would be a projection defect, which is §2.4's business and not this file's.
select chk('…and every one of them is a recorded document, not a stray balance',
           not exists (
             select 1 from batch_balance bb
              where bb.remaining_base < 0
                and not exists (select 1 from stock_movement sm
                                 where sm.batch_id = bb.batch_id
                                   and sm.qty_base < 0)),
           format('%s negative lots, all with withdrawals behind them',
                  (select count(*) from batch_balance where remaining_base < 0)));


-- ============================ 6. the path is PRESENT, not merely inert =======
-- ⚠️ THE WEAKEST CHECK IN THIS FILE, AND IT IS LABELLED AS SUCH. Reading a
-- function's source is reading a file, and ADR-035 §9 says a file is not
-- evidence. It earns its place only as a discriminator: without it, every claim
-- above is equally green on a database where 0017 never applied, which is the
-- one reading of this file that would be actively misleading.
--
-- The BEHAVIOURAL proof that the path is real is supabase/tests/0017, where the
-- same function refuses a sale the moment one variant opts in. This check says
-- the function those 30-odd checks exercise is the function that is applied
-- here; it does not say the path works.
select chk('the applied record_sale carries the enforcement path (structural — '
           'the behavioural proof is supabase/tests/0017)',
           (select p.prosrc like '%TD002%'
                   and p.prosrc like '%enforce_stock%'
              from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'record_sale'),
           (select case when p.prosrc like '%TD002%' then 'TD002 present' else 'TD002 ABSENT' end
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'record_sale'));


-- ---- the trap 2.4 found: a check that rolls back deletes its own results ----
select chk('this file did not throw away any of its own results',
           (select max(n) from public._verify) = (select count(*) from public._verify),
           (select 'highest number ' || max(n) || ', rows ' || count(*) from public._verify));


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  -- ⚠️ `is not true`, NOT `not passed`. See the note in the six suites under
  -- supabase/tests/ — a NULL condition prints FAIL and is invisible to
  -- `not passed`, so the file reports "all N passed" above its own failure.
  -- Found in 4b-i, closed in supabase/tests/ there and in supabase/checks/ here.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% dormancy check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % dormancy checks passed over the seed',
    (select count(*) from public._verify);
end;
$$;
