-- ============================================================================
-- Receipt completeness over the seed — the rule against 1 041 real lots
-- ============================================================================
-- ADR-035 §2.4 (the ledger), §9 (evidence). docs/PLAN.md task 4a.
--
-- `supabase/tests/0015_receipt_completeness.sql` proves the constraint REFUSES
-- what it should, on a fixture of a dozen lots built to be refused. This file
-- asks the other question, and it is the one a fixture cannot answer: does the
-- rule ACCEPT three months of real trading?
--
-- That matters more than it sounds. A constraint tuned until it refuses every
-- defect you thought of, and which also refuses a quarter of the shop's actual
-- deliveries, is not a rule — it is an outage. The seed is 1 041 lots across two
-- workspaces and four stores, written by the same allocators the RPCs will call,
-- and it includes the two shapes most likely to be got wrong: 23 lots whose
-- receipt has been VOIDED, and one adjustment lot that received nothing at all
-- and never will.
--
-- Six claims:
--
--   1. pre-flight — this is the seed these numbers were read from;
--   2. ⚠️ ZERO violations across every purchase and transfer lot;
--   3. ⚠️ the `reversal_of_movement_id is null` filter is LOAD-BEARING, measured:
--      without it, 23 correct lots would be refused;
--   4. ⚠️ the `origin = 'adjustment'` exclusion is LOAD-BEARING, measured:
--      without it, the seed's one adjustment lot would be refused;
--   5. the rule can go RED — it is shown finding a violation, not merely
--      returning zero;
--   6. it adds to §2.4 rather than restating it: the invariant is green on the
--      state this rule refuses.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/ — `_cleanup.sql` truncates every
-- table but `unit` before each suite, so the seed is gone before the first one
-- runs. 1.7, 2.1, 2.2, 2.3, 2.4 and 0014 all give this reason.
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


-- ================================================= 1. pre-flight ==
-- An empty database satisfies every claim below it. That vacuous green is the
-- failure ADR-035 §9 exists to refuse, so this file will not run against one.

select chk('pre-flight: the seed still holds 1 041 lots — 1 025 purchase, 15 '
           'transfer, 1 adjustment',
           (select count(*) from stock_batch where origin = 'purchase')   = 1025
       and (select count(*) from stock_batch where origin = 'transfer')   = 15
       and (select count(*) from stock_batch where origin = 'adjustment') = 1,
           (select 'purchase ' || count(*) filter (where origin = 'purchase')
                || ', transfer ' || count(*) filter (where origin = 'transfer')
                || ', adjustment ' || count(*) filter (where origin = 'adjustment')
              from stock_batch));

do $$
declare v_failed integer;
begin
  -- ⚠️ `is not true`, NOT `not passed`. A check whose condition evaluates to
  -- NULL — a subquery that matched no rows, an aggregate over nothing, a
  -- comparison against a nullable column — prints FAIL in the table above and
  -- is INVISIBLE to `not passed`, because `not null` is null and a null WHERE
  -- clause keeps no rows. The file then reports "all N checks passed" with a
  -- FAIL line printed directly above it, and exits 0.
  --
  -- Found in plan task 4b-i and closed there in all six supabase/tests/ suites.
  -- ⚠️ IT WAS NOT CLOSED HERE: every file in supabase/checks/ carried the same
  -- guard until task 4c-i, which found it while adding the seventh. Fixed in
  -- all seven on that commit, none of them changed in any other respect and
  -- none of their counts changed — the same precedent 3.4 set when it found the
  -- plan guard 3.3 shipped was itself wrong.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception 'PRE-FLIGHT FAILED (% check(s)): the seed is not the one these '
      'numbers were read from.', v_failed;
  end if;
end;
$$;


-- ============================ 2. ⚠️ THE RULE ACCEPTS THE WHOLE SEED ==
-- The constraint applied in 0015 was already in force while these rows were
-- written — every seed file runs after every migration — so a violation here
-- could not exist without the reset itself having failed. Asserted anyway,
-- because that reasoning is exactly the kind that stops being true quietly: a
-- future seed file, or a `session_replication_role` in someone's shell script,
-- and the reset goes green over rows the rule would refuse.

select chk('⚠️ ZERO receipt-completeness violations across all 1 040 purchase and '
           'transfer lots',
           (select count(*) from receipt_completeness_violations()) = 0,
           (select count(*)::text || ' violation(s)'
              from receipt_completeness_violations()));


-- ================== 3. ⚠️ THE REVERSAL FILTER IS LOAD-BEARING, MEASURED ==
-- A voided delivery does not delete its receipt. It writes a compensating
-- movement against the same batch, carrying the SAME reason — a reversal keeps
-- the reason it cancels (§2.4) — and setting reversal_of_movement_id.
--
-- So the naive predicate, "sum every purchase movement on this lot", goes to
-- ZERO on a lot that is entirely correct. Below is that naive predicate, run
-- over the seed. The number it returns is how many of the shop's own lots the
-- rule would have refused on the day it shipped, and it is not zero.

select chk('⚠️ without `reversal_of_movement_id is null`, 23 CORRECT seeded lots '
           'would be refused',
           (select count(*) from stock_batch sb
             where sb.origin in ('purchase', 'transfer')
               and coalesce((select sum(sm.qty_base) from stock_movement sm
                              where sm.batch_id = sb.id
                                and sm.reason in ('purchase', 'transfer_in')), 0)
                   <> sb.qty_received_base) = 23,
           (select count(*)::text || ' lot(s) carry a reversed receipt'
              from stock_batch sb
             where exists (select 1 from stock_movement r
                            join stock_movement o on o.id = r.reversal_of_movement_id
                           where r.batch_id = sb.id
                             and o.reason in ('purchase', 'transfer_in'))));

select chk('⚠️ and every one of those 23 is green under the rule as shipped',
           (select count(*) from receipt_completeness_violations() v
             where exists (select 1 from stock_movement r
                           where r.batch_id = v.batch_id
                             and r.reversal_of_movement_id is not null)) = 0);


-- ================ 4. ⚠️ THE ADJUSTMENT EXCLUSION IS LOAD-BEARING, MEASURED ==
-- The seed's single adjustment lot is allocate_fefo()'s shortfall branch three:
-- a lot opened so that an oversale of a never-stocked variant has a batch_id to
-- land on. It carries qty_received_base = 2.000 against one `sale: -2.000` and
-- nothing else, because stock_batch_qty_positive forbids a lot of zero — so its
-- received quantity is a FICTION the schema forced it to invent.
--
-- A rule written over all three origins fires on it, and it is a legitimate row.

select chk('⚠️ the seed''s one adjustment lot received nothing, and would be '
           'refused by a rule that spanned all three origins',
           (select count(*) from stock_batch sb
             where sb.origin = 'adjustment'
               and coalesce((select sum(sm.qty_base) from stock_movement sm
                              where sm.batch_id = sb.id
                                and sm.reason in ('purchase', 'transfer_in')
                                and sm.reversal_of_movement_id is null), 0)
                   <> sb.qty_received_base) = 1);

select chk('⚠️ and the rule as shipped leaves it alone',
           (select count(*) from receipt_completeness_violations()
             where origin = 'adjustment') = 0);


-- ========================= 5. THE RULE CAN GO RED, SHOWN RATHER THAN CLAIMED ==
-- Every green above is worth exactly as much as the reader's confidence that
-- this function is capable of returning a row. seed_invariant.sql ends by
-- corrupting the projection on purpose for the same reason.
--
-- It cannot be shown the way that file shows it. The projection is disposable
-- and can be corrupted and rebuilt; the ledger is APPEND-ONLY, and a lot with a
-- missing receipt cannot be created here at all — that is the entire point of
-- the constraint this file is about. So the demonstration is the other way
-- round: build the bad state in a temporary table shaped like the real one, run
-- the same predicate over it, and confirm it finds the lot.
--
-- ⚠️ THIS IS A WEAKER DEMONSTRATION THAN THE ONE IN seed_invariant.sql AND IS
-- LABELLED AS SUCH. It proves the PREDICATE discriminates; the proof that the
-- shipped constraint refuses a real commit is supabase/tests/0015, which builds
-- the defect against the real tables and has its commits rejected.

create temporary table _rc_probe as
  select sb.id, sb.origin, sb.qty_received_base,
         coalesce((select sum(sm.qty_base) from public.stock_movement sm
                    where sm.batch_id = sb.id
                      and sm.reason in ('purchase', 'transfer_in')
                      and sm.reversal_of_movement_id is null), 0) as live
    from public.stock_batch sb
   where sb.origin in ('purchase', 'transfer');

select chk('the predicate finds nothing wrong with the seed as it stands',
           (select count(*) from _rc_probe where live <> qty_received_base) = 0);

-- One lot loses its receipt, exactly as a record_purchase that wrote the batch
-- and skipped the movement would leave it.
update _rc_probe set live = 0
 where id = (select id from _rc_probe order by id limit 1);

select chk('⚠️ and it finds the lot the moment a receipt goes missing — the '
           'greens above are from a check that can fail',
           (select count(*) from _rc_probe where live <> qty_received_base) = 1);

drop table _rc_probe;


-- ================= 6. IT ADDS TO §2.4 RATHER THAN RESTATING IT ==
-- The state this rule refuses is a state the §2.4 invariant calls perfect: the
-- lot opens at zero, no movement is written, sum(qty_base) = 0 and
-- remaining_base = 0. That is docs/PLAN.md task 3.4's finding, and it is why
-- this is a constraint and not another assertion inside batch_balance_violations().
--
-- The invariant is asserted here beside this rule so the two claims cannot be
-- read as one. It is NOT re-derived that §2.4 is blind to an unfilled lot — that
-- is 3.4's finding, it was measured there, and asserting `0 = 0` here would be a
-- check that cannot fail dressed as evidence.

select chk('the §2.4 invariant is green over the same seed — a second, '
           'independent claim about the same 1 041 lots',
           (select count(*) from batch_balance_violations()) = 0);


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
  -- ⚠️ `is not true`, NOT `not passed`. A check whose condition evaluates to
  -- NULL — a subquery that matched no rows, an aggregate over nothing, a
  -- comparison against a nullable column — prints FAIL in the table above and
  -- is INVISIBLE to `not passed`, because `not null` is null and a null WHERE
  -- clause keeps no rows. The file then reports "all N checks passed" with a
  -- FAIL line printed directly above it, and exits 0.
  --
  -- Found in plan task 4b-i and closed there in all six supabase/tests/ suites.
  -- ⚠️ IT WAS NOT CLOSED HERE: every file in supabase/checks/ carried the same
  -- guard until task 4c-i, which found it while adding the seventh. Fixed in
  -- all seven on that commit, none of them changed in any other respect and
  -- none of their counts changed — the same precedent 3.4 set when it found the
  -- plan guard 3.3 shipped was itself wrong.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% receipt-completeness check(s) FAILED — see the table above',
      v_failed;
  end if;
  raise notice 'all % receipt-completeness checks passed over the seed',
    (select count(*) from public._verify);
end;
$$;
