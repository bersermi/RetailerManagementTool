-- ============================================================================
-- The §2.4 invariant, over seed data  —  plan task 1.7
-- ============================================================================
-- ADR-035 §2.4: "sum(qty_base) from stock_movement where batch_id = $1
--   = (select remaining_base from batch_balance where batch_id = $1)
--  ... must hold for every batch, at all times. Property-tested in CI against
--  randomised sequences, re-checked nightly in production. The projection is
--  disposable and rebuildable from the ledger."
--
-- `supabase/tests/0004_inventory.sql` already proves both halves of that over a
-- FIXTURE of four batches and nine movements. This file proves them over the
-- SEED — 1 041 batches and 3 514 movements across two tenants, three stores,
-- three months, including reversals, transfers, two deliberate oversales and a
-- delivery that was voided after it had been sold through. That is the closest
-- thing this repo has to the "randomised sequences" the ADR asks for, and it is
-- the difference between a rule that holds on data written to make it hold and a
-- rule that holds on data written to look like a shop.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/
-- -----------------------------------------
-- `supabase/tests/_cleanup.sql` runs before EVERY suite and truncates every table
-- but `unit`. That is correct — the suites assert absolute counts and must own the
-- database — but it means the seed is gone before the first suite starts. An
-- invariant check placed in tests/ would run against an empty database and PASS,
-- which is the exact shape of vacuous green that ADR-035 §9 exists to refuse.
-- So this runs from its own step in .github/workflows/db.yml, between the reset
-- and the suite loop, while the seed is still there.
--
-- Which makes the FIRST section below the load-bearing one. A check that the
-- invariant holds is worth nothing without a check that there was something to
-- hold it over, and the failure mode is silent in both directions: an empty
-- database passes, and so does a seed that quietly stopped writing consumption.
--
-- ⚠️ SEVEN LOTS IN THE SEED ARE LEGITIMATELY NEGATIVE — two from 1.6b's oversales
-- and five from the voided delivery in 1.6c. THIS FILE MUST NOT ASSERT THAT NO
-- BALANCE IS BELOW ZERO. v1 records stock and does not enforce it (§2.6). The
-- invariant asks whether the projection agrees with the movements; "no lot is
-- negative" is a different claim, it is false, and it is false on purpose. The
-- check below asserts the negatives are STILL THERE, because a seed that lost
-- them would make every shortfall claim downstream vacuous.
--
-- Run it against a database that was JUST RESET, before anything truncates it:
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/checks/seed_invariant.sql
--
-- It rebuilds the projection and deliberately corrupts it, so it leaves
-- `batch_balance.updated_at` moved. Nothing downstream reads it: the suite loop
-- truncates first. It does not write, delete or corrupt anything in
-- `stock_batch` or `stock_movement` — those are append-only and it could not.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

-- Re-runnable against one database, which the suites in supabase/tests/ are not
-- and do not need to be — each of those is preceded by `_cleanup.sql` and this is
-- not. A developer iterating locally should not have to reset to run it twice.
-- Scratch only: nothing here touches stock_batch or stock_movement, which are
-- append-only and would refuse.
set client_min_messages = warning;   -- three "does not exist, skipping" notices
drop table if exists public._verify cascade;
drop table if exists public._bb_before cascade;
drop table if exists public._bb_other cascade;
reset client_min_messages;

create table public._verify (n serial, label text, passed boolean, detail text);

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;


-- ================================================= 1. there is a ledger here ==
-- Everything after this section is conditional on this section. These are FLOORS
-- and SHAPES, not the seed's row counts — the seed files assert their own exact
-- totals, and duplicating them here would mean a workflow-adjacent edit every
-- time a truck changes. What this section refuses is a database that cannot
-- falsify the invariant: empty, single-tenant, single-store, receipts-only, or
-- stripped of the awkward cases.

select chk('seed present: the ledger is not empty and is not a toy',
           (select count(*) from stock_batch)    >= 500
       and (select count(*) from stock_movement) >= 2000,
           (select count(*) || ' batches, ' from stock_batch)
        || (select count(*) || ' movements' from stock_movement));

-- Single-tenant seed data makes every isolation claim vacuous, and it makes this
-- one vacuous too: rebuild_batch_balance(p_workspace_id) cannot be shown to
-- respect its argument against a database holding one workspace.
select chk('seed present: both tenants hold stock, and neither is a rounding error',
           (select count(*) from (select workspace_id from stock_batch
                                   group by 1 having count(*) >= 50) t) = 2,
           (select string_agg(w.display_name || '=' || c.n, ', ' order by c.n)
              from (select workspace_id, count(*) n from stock_batch group by 1) c
              join workspace w on w.id = c.workspace_id));

select chk('seed present: stock sits in more than one store',
           (select count(distinct location_id) from stock_batch) >= 3,
           (select count(distinct location_id) || ' locations' from stock_batch));

-- The invariant is arithmetic over movements. With receipts only it is every
-- batch agreeing with its own delivery note, and it would hold with the allocator
-- deleted — which is precisely how 1.6a's green meant "almost nothing".
select chk('seed present: stock leaves as well as arrives',
           (select count(*) from stock_movement where qty_base < 0) >= 1000,
           (select count(*) || ' negative movements' from stock_movement where qty_base < 0));

-- CONTAINMENT, NOT EQUALITY, and the difference bit during falsification. The
-- first draft asserted `count(distinct reason) = 5` and went red the moment an
-- `adjustment` movement appeared — which is a legal sixth reason that
-- `adjust_stock` writes in `0006`, and which the seed will one day carry. The
-- claim worth making is that the five reasons the invariant leans on are all
-- present, not that nothing else ever is.
select chk('seed present: every reason the invariant leans on is exercised',
           (select count(*) from (values ('purchase'),('sale'),('waste'),
                                         ('transfer_out'),('transfer_in')) r(reason)
             where not exists (select 1 from stock_movement m
                                where m.reason::text = r.reason)) = 0,
           (select string_agg(distinct reason::text, ', ') from stock_movement));

select chk('seed present: voids happened, so the invariant is tested across a reversal',
           (select count(*) from stock_movement where reversal_of_movement_id is not null) > 0,
           (select count(*) || ' compensating movements' from stock_movement
             where reversal_of_movement_id is not null));

-- A transfer is the one operation that writes to two locations at once, and the
-- shape §2.4 fixes is the paired movement. If the counts ever disagree, stock was
-- created or destroyed by a move.
select chk('seed present: transfers are paired, out for in',
           (select count(*) from stock_movement where reason = 'transfer_out') > 0
       and (select count(*) from stock_movement where reason = 'transfer_out')
         = (select count(*) from stock_movement where reason = 'transfer_in'),
           (select count(*) || ' each way' from stock_movement where reason = 'transfer_out'));

-- ⚠️ NOT "no lot is negative". See the header. The claim is that the designed
-- deficits SURVIVE, because they are what make the shortfall branches real.
select chk('seed present: the designed negative lots are still negative',
           (select count(*) from batch_balance where remaining_base < 0) >= 1,
           (select count(*) || ' lot(s) below zero — legal, and on purpose (§2.6)'
              from batch_balance where remaining_base < 0));


-- AND THIS SECTION IS FATAL ON ITS OWN, before anything below reads a row.
-- Run against an empty database — the failure docs/PLAN.md warns about, and the
-- one that arrives for free the day someone moves this file into supabase/tests/
-- — the checks below either pass vacuously or die on a `\gset` that found no
-- rows. Neither tells a reviewer what actually went wrong. This does.
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
    raise exception
      'THE SEED IS NOT IN THIS DATABASE, or it no longer exercises the ledger '
      '(% of % pre-flight check(s) failed). Everything below this point would '
      'pass vacuously. This file must run between `supabase db reset` and the '
      'first `supabase/tests/_cleanup.sql` — see the header.',
      v_failed, (select count(*) from public._verify);
  end if;
end;
$$;


-- ============================================================ 2. the invariant ==

select chk('§2.4: the projection agrees with the ledger, for every batch',
           (select count(*) from batch_balance_violations()) = 0,
           coalesce((select string_agg(batch_id || ': movements=' || movement_sum
                                       || ' projected=' || coalesce(projected_remaining::text, 'MISSING'), '; ')
                       from batch_balance_violations()), 'no violations'));

-- The function LEFT JOINs, so a batch with no projection row at all is a
-- violation rather than an absence. Stated separately because it is the case an
-- INNER JOIN would hide, and because it is cheap to confirm directly.
select chk('§2.4: every batch has a projection row',
           (select count(*) from stock_batch) = (select count(*) from batch_balance),
           (select count(*) || ' batches, ' from stock_batch)
        || (select count(*) || ' balances' from batch_balance));


-- ================================================== 3. the projection is disposable ==
-- "The projection is disposable and rebuildable from the ledger." Proven the only
-- way it can be: throw it away and compare what comes back. `updated_at` is
-- excluded — the rebuild is a later moment in time and it is the one column
-- allowed to differ.

create table public._bb_before as
  select batch_id, workspace_id, location_id, variant_id, remaining_base,
         expiry_date, received_at
    from batch_balance;

-- The scoped rebuild first, while a full one has not yet touched anything.
-- rebuild_batch_balance(p_workspace_id) is an operator tool and the nightly
-- production check is per-tenant; an argument it ignored would DELETE every other
-- tenant's projection and rebuild only one. 0004's fixture is single-workspace,
-- so this claim has never been testable until the seed existed.
create table public._bb_other as
  select * from batch_balance
   where workspace_id <> (select workspace_id from stock_batch
                           group by 1 order by count(*), min(id::text) limit 1);

select workspace_id from stock_batch
 group by 1 order by count(*), min(id::text) limit 1
\gset scoped_

select rebuild_batch_balance(:'scoped_workspace_id') as scoped_rows \gset

select chk('rebuild(workspace): writes exactly that workspace''s batches',
           :'scoped_rows'::bigint = (select count(*) from stock_batch
                                      where workspace_id = :'scoped_workspace_id'),
           'rebuilt ' || :'scoped_rows' || ' rows');

select chk('rebuild(workspace): leaves every other tenant''s row untouched, updated_at included',
       not exists (select * from public._bb_other except select * from batch_balance)
   and not exists (select * from batch_balance
                    where workspace_id <> :'scoped_workspace_id'
                   except select * from public._bb_other),
           (select count(*) || ' rows belong to the other tenant' from public._bb_other));

-- Now the whole thing.
select rebuild_batch_balance() as rebuilt_rows \gset

select chk('rebuild(all): reproduces every row exactly, from stock_movement alone',
       not exists (select * from public._bb_before
                   except
                   select batch_id, workspace_id, location_id, variant_id,
                          remaining_base, expiry_date, received_at from batch_balance)
   and not exists (select batch_id, workspace_id, location_id, variant_id,
                          remaining_base, expiry_date, received_at from batch_balance
                   except
                   select * from public._bb_before),
           'rebuilt ' || :'rebuilt_rows' || ' rows');

select chk('rebuild(all): one row per batch, lots that never moved included',
           :'rebuilt_rows'::bigint = (select count(*) from stock_batch));

select chk('§2.4: still clean after the projection was thrown away and rebuilt',
           (select count(*) from batch_balance_violations()) = 0);


-- ================================================ 4. and the check can fail ==
-- Green means nothing from a check that cannot go red, and this one runs over
-- data nobody hand-placed — so the falsification runs on EVERY CI run rather than
-- being a sentence in a README saying someone once tried it. Corrupt the
-- projection two ways, a wrong number and a missing row, confirm both are named,
-- then confirm the rebuild repairs them.

select batch_id from batch_balance order by batch_id limit 1 \gset bad_
select batch_id from batch_balance order by batch_id desc limit 1 \gset gone_

select remaining_base from batch_balance where batch_id = :'bad_batch_id' \gset badwas_

update batch_balance set remaining_base = remaining_base + 999 where batch_id = :'bad_batch_id';
delete from batch_balance where batch_id = :'gone_batch_id';

select chk('falsified: a wrong number and a missing row are both detected',
           (select count(*) from batch_balance_violations()) = 2,
           (select count(*) || ' violation(s) reported' from batch_balance_violations()));

select chk('falsified: the report names the batch and the size of the disagreement',
           (select projected_remaining - movement_sum = 999
              from batch_balance_violations() where batch_id = :'bad_batch_id')
       and (select projected_remaining is null
              from batch_balance_violations() where batch_id = :'gone_batch_id'));

select rebuild_batch_balance() as repaired \gset

select chk('repaired: the rebuild puts both back and the invariant holds again',
           (select count(*) from batch_balance_violations()) = 0
       and (select remaining_base from batch_balance where batch_id = :'bad_batch_id')
           = :'badwas_remaining_base'::numeric
       and (select count(*) from batch_balance where batch_id = :'gone_batch_id') = 1,
           'rebuilt ' || :'repaired' || ' rows');


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
    raise exception '% seed invariant check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % seed invariant checks passed', (select count(*) from public._verify);
end;
$$;
