-- ============================================================================
-- 0015 — Receipt completeness: a lot that opens must be filled, or refuse the
--        commit
-- ============================================================================
-- ADR-035 §2.4 (the ledger), §2.6 (the write surface), §9 (evidence)
--
-- docs/PLAN.md task 4a, the first piece of step 4. It ships a RULE, before the
-- six functions that have to satisfy it, and that order is deliberate: a
-- constraint is cheaper to satisfy than to retrofit onto merged code.
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * receipt_completeness_violations(uuid) — the rule, as one query
--   * stock_batch_receipt_complete()         — the trigger function that raises
--     on its answer
--   * three DEFERRABLE INITIALLY DEFERRED constraint triggers
--
-- No table, no column, no policy, no new client grant.
--
-- ----------------------------------------------------------------------------
-- THE RULE
-- ----------------------------------------------------------------------------
--   For every stock_batch with origin in ('purchase', 'transfer'), the sum of
--   its LIVE RECEIPT MOVEMENTS — reason = 'purchase' or 'transfer_in', with
--   reversal_of_movement_id is null — equals qty_received_base.
--
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS: §2.4 CANNOT SEE A MOVEMENT THAT WAS NEVER MADE
-- ----------------------------------------------------------------------------
-- Found in plan task 3.4 and settled by the owner on 2026-08-26. The §2.4
-- invariant — `sum(qty_base) = batch_balance.remaining_base` — is the one this
-- repository checks in CI and nightly, and it is GREEN on a lot that opened and
-- never received anything:
--
--   the batch opens at zero (stock_batch_open_balance), no movement is ever
--   written, so sum(qty_base) is 0 and remaining_base is 0 and the two agree
--   perfectly. The ledger says the shop received nothing, the shelf disagrees,
--   and the invariant is silent.
--
-- 3.4 falsified exactly that — deleting the `insert into stock_movement` from a
-- purchase left all 64 §2.4 assertions green. §2.4 detects a movement that was
-- never PROJECTED; it can never detect one that was never MADE. Those are
-- different defects, and the second one is a broken CALLER — which is precisely
-- what `record_purchase` (0018) and `record_transfer` (0019) are about to be.
--
-- The requirement itself is older than the finding: docs/PLAN.md, *Settled in
-- 1.3a* — "record_purchase must therefore write both the batch and a positive
-- movement". 3.4 did not find a missing requirement, it found an UNENFORCED one.
-- So this is a constraint and not a suite, which is also this schema's
-- established move: the composite FKs, stock_movement_sign_follows_reason and
-- the one-reversal partial indexes all make a bad state unrepresentable rather
-- than merely detected.
--
-- ----------------------------------------------------------------------------
-- WHY IT IS DEFERRED, AND WHY THAT IS NOT A WEAKENING
-- ----------------------------------------------------------------------------
-- The batch and its movement are NECESSARILY separate statements: the movement
-- carries batch_id, so the batch must exist first. An immediate check would fire
-- between them and refuse every correct delivery ever written.
--
-- Deferred to commit is therefore the only form the rule can take, and it is the
-- form that matches what is actually being claimed: not "these two rows arrive
-- together" but "no transaction ends with a lot that opened and did not fill".
-- A caller that writes the batch and forgets the movement is refused at COMMIT,
-- with everything it wrote rolled back. That is the whole point.
--
-- ⚠️ ONE CONSEQUENCE, STATED RATHER THAN DISCOVERED LATER: a transaction that
-- ROLLS BACK never fires a deferred trigger. supabase/pgtap/06 and 07 build
-- their fixtures inside `begin … rollback`, so this rule is not asserted there
-- and was never going to be. It is asserted by the seed (which commits), by
-- supabase/checks/0015 over that seed, and by supabase/tests/0015, which commits
-- on purpose.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THIS MAKES THE SEED DEPEND ON ONE SEED FILE BEING ONE TRANSACTION
-- ----------------------------------------------------------------------------
-- `10_deliveries.sql` opens all 1 025 purchase lots in section 7 and writes all
-- 1 025 receipts in section 8 — two separate top-level statements. Under psql's
-- autocommit that would be two transactions and this constraint would refuse the
-- first of them. It does not, because `supabase db reset` sends each seed file
-- to the server as ONE batch, so the file is one implicit transaction and the
-- check runs once, at the end of it.
--
-- That was measured rather than assumed: making these triggers `not deferrable`
-- and re-running the reset fails inside 10_deliveries with
--
--     lot e736d2b7… opened as purchase for 29000.000 but its live receipt
--     movements sum to 0  (SQLSTATE 23514)
--
-- which is the same file passing green one line above, so the boundary is real
-- and it is where this says it is.
--
-- The dependency is left as it is rather than papered over with an explicit
-- `begin`/`commit` in the seed, for two reasons. The CLI version is PINNED in
-- .github/workflows/db.yml — "so a CLI release cannot turn a green schema red
-- without a commit saying why" — and if it ever did change, this constraint
-- makes the reset fail LOUDLY on the first delivery rather than quietly seeding
-- a shop whose lots are empty. A seed that cannot be written in one transaction
-- is a seed writing something the write surface could not.
--
-- ----------------------------------------------------------------------------
-- `reversal_of_movement_id is null` IS LOAD-BEARING — 23 SEEDED LOTS SAY SO
-- ----------------------------------------------------------------------------
-- A voided delivery is legitimate: 30_reversals.sql writes one on purpose and
-- 1.6c's is still in the seed. The void does not delete the receipt, it writes a
-- compensating movement against the same batch — reason 'purchase' (a reversal
-- keeps the reason it cancels, §2.4) and reversal_of_movement_id set.
--
-- Counting that compensating row would take the sum to zero and break the rule
-- on a lot that is perfectly correct. Measured on a fresh reset: 23 purchase
-- lots carry a reversed receipt, so without this filter this migration would
-- refuse 23 of the seed's own rows on the day it applied. The filter excludes
-- the REVERSAL and keeps the ORIGINAL, which is what makes the rule survive a
-- void.
--
-- ----------------------------------------------------------------------------
-- ⚠️ `origin = 'adjustment'` MUST BE EXCLUDED, AND NOT FOR TIDINESS
-- ----------------------------------------------------------------------------
-- An adjustment lot from allocate_fefo()'s shortfall branch three never received
-- anything. It is opened so that an oversale of a never-stocked variant has a
-- batch_id to land on, and its qty_received_base is a FICTION that
-- stock_batch_qty_positive forces it to invent — the seed's single one carries
-- qty_received_base = 2.000 against one `sale: -2.000` movement and nothing
-- else.
--
-- A rule written over all three origins fires on that lot the day it ships. The
-- exclusion is what makes the other 1 040 checkable at all.
--
-- Opening balances and physical counts (adjust_stock, 0020) land on the same
-- origin and are outside the rule for the same reason: an adjustment lot's
-- quantity is asserted by a human, not received from anyone.
--
-- ----------------------------------------------------------------------------
-- WHY THREE TRIGGERS AND NOT ONE
-- ----------------------------------------------------------------------------
-- The rule has two ends, and a defect can arrive at either:
--
--   1. a batch opens and no receipt follows        -> the stock_batch trigger.
--      THIS IS THE DEFECT 3.4 FOUND, and the one a forgetful RPC produces.
--   2. a receipt is written that does not add up   -> the movement INSERT
--      trigger: a short receipt, a doubled one, a receipt against the wrong lot.
--   3. a receipt is removed or restated afterwards -> the movement
--      DELETE-or-UPDATE trigger.
--
-- ⚠️ THE THIRD IS UNREACHABLE TODAY AND IS SHIPPED ANYWAY, so say so plainly
-- rather than let a reader assume it is load-bearing. stock_movement_immutable_trg
-- (0004) already raises on every UPDATE and DELETE, so nothing gets past it to
-- reach this check. It exists because the two guards fail differently: disabling
-- the immutability guard BY NAME — which is how this rule is falsified in
-- supabase/tests/0015_receipt_completeness.sql — leaves this one standing. It
-- does not defend against `session_replication_role = replica`, which switches
-- off every user trigger including this one, and nothing at the trigger layer
-- can.
--
-- The INSERT trigger deliberately does NOT fire for a reversal
-- (reversal_of_movement_id is not null): a compensating movement is excluded
-- from the sum by the rule itself, so it cannot change the answer, and voiding a
-- delivery with a hundred lines should not re-check a hundred lots to learn
-- nothing.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The rule, as ONE query, asked of the whole database or of one lot
-- ----------------------------------------------------------------------------
-- The sibling of batch_balance_violations() (0004 §8), and here for the same
-- reason: "a claim that is only prose is the failure this repo was rebuilt to
-- avoid" (§9). An operator asks it after a restore, supabase/checks/0015 asks it
-- of the seed, and the trigger below asks it of the one lot it just saw.
--
-- ⚠️ THE ARGUMENT IS WHAT KEEPS THIS TO ONE SPELLING OF THE RULE. The obvious
-- shape was a whole-table function beside a separate one-lot IF in the trigger,
-- and this repository has already recorded what that costs — docs/PLAN.md, on
-- why 4d follows 4b: "writing them twice in parallel is how two spellings of one
-- rule get merged". With p_batch_id passed the predicate is unchanged and the
-- planner reads one row by primary key, so the shared spelling costs nothing at
-- the till either.
--
-- Empty is the passing answer.

create function public.receipt_completeness_violations(p_batch_id uuid default null)
returns table (
  batch_id          uuid,
  workspace_id      uuid,
  location_id       uuid,
  origin            public.batch_origin,
  qty_received_base numeric,
  live_receipts     numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select sb.id, sb.workspace_id, sb.location_id, sb.origin, sb.qty_received_base,
         coalesce(r.live, 0)
    from public.stock_batch sb
    left join lateral (
      select sum(sm.qty_base) as live
        from public.stock_movement sm
       where sm.batch_id = sb.id
         and sm.reason in ('purchase', 'transfer_in')
         and sm.reversal_of_movement_id is null
    ) r on true
   -- An adjustment lot never received anything and its qty_received_base is a
   -- fiction stock_batch_qty_positive forces it to invent. See the header.
   where sb.origin in ('purchase', 'transfer')
     and (p_batch_id is null or sb.id = p_batch_id)
     and coalesce(r.live, 0) <> sb.qty_received_base;
$$;

comment on function public.receipt_completeness_violations(uuid) is
  'Lots that opened as a purchase or a transfer and whose live receipt movements '
  'do not sum to qty_received_base. Empty is the passing answer. With no '
  'argument, the whole database; with one, the single lot the constraint trigger '
  'in this migration just saw. ADR-035 §2.4, docs/PLAN.md task 4a.';


-- ----------------------------------------------------------------------------
-- 2. The trigger function
-- ----------------------------------------------------------------------------
-- It resolves WHICH lots to ask about and raises on the answer. It contains no
-- predicate of its own — that is section 1, deliberately — and exactly one
-- wording of the refusal, so the three triggers cannot drift into three.
--
-- SECURITY DEFINER, for two reasons and neither is convenience. It calls a
-- function granted to nobody (section 4), and a deferred trigger runs at COMMIT
-- as whatever role is committing; and a constraint must see every row of the two
-- tables it is about, which a definer-owned function does without depending on
-- who is writing or on what RLS says. It reads and raises, and writes nothing.
--
-- ⚠️ THE LOT IDS ARE COLLECTED BEFORE THEY ARE QUERIED, and that is not a style
-- choice. NEW is unassigned in a DELETE trigger and OLD in an INSERT one, and
-- plpgsql binds NEW.batch_id as a query parameter — so a single query mentioning
-- both, even behind a `where tg_op = 'UPDATE'` that would exclude it, raises
-- "record new is not assigned yet" on every delete. The branch has to happen in
-- plpgsql, above SQL.

create function public.stock_batch_receipt_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_bad record;
begin
  if tg_table_name = 'stock_batch' then
    v_ids := array[new.id];
  elsif tg_op = 'INSERT' then
    v_ids := array[new.batch_id];
  elsif tg_op = 'DELETE' then
    v_ids := array[old.batch_id];
  else
    -- An UPDATE that moved a receipt to another lot leaves TWO lots to answer
    -- for. Unreachable while stock_movement_immutable_trg stands; correct if it
    -- is ever lifted for one.
    v_ids := array[old.batch_id, new.batch_id];
  end if;

  for v_bad in
    select v.*
      from (select distinct b.id from unnest(v_ids) as b(id)) b
      cross join lateral public.receipt_completeness_violations(b.id) v
  loop
    raise exception
      'lot % opened as % for % but its live receipt movements sum to %: a lot '
      'that opens must be filled in the same transaction (ADR-035 §2.4, '
      'docs/PLAN.md task 4a)',
      v_bad.batch_id, v_bad.origin, v_bad.qty_received_base, v_bad.live_receipts
      using errcode = 'check_violation';
  end loop;

  return null;
end;
$$;

comment on function public.stock_batch_receipt_complete() is
  'Deferred constraint trigger: a purchase or transfer lot must equal the sum of '
  'its live receipt movements at COMMIT. Refuses the caller that opens a lot and '
  'forgets to fill it — the defect ADR-035 §2.4 is structurally blind to. '
  'docs/PLAN.md task 4a.';


-- ----------------------------------------------------------------------------
-- 3. The triggers
-- ----------------------------------------------------------------------------
-- DEFERRABLE INITIALLY DEFERRED on all three. The constraint name is the trigger
-- name, so a test that wants the answer early says
--
--     set constraints public.stock_batch_receipt_complete_trg immediate;
--
-- which is how supabase/tests/0015 catches the refusal inside a savepoint
-- instead of losing its whole transaction to it.

create constraint trigger stock_batch_receipt_complete_trg
  after insert on public.stock_batch
  deferrable initially deferred
  for each row
  when (new.origin in ('purchase', 'transfer'))
  execute function public.stock_batch_receipt_complete();

create constraint trigger stock_movement_receipt_complete_ins_trg
  after insert on public.stock_movement
  deferrable initially deferred
  for each row
  when (new.reason in ('purchase', 'transfer_in')
        and new.reversal_of_movement_id is null)
  execute function public.stock_batch_receipt_complete();

-- No WHEN clause: an UPDATE that changes `reason` INTO a receipt reason has to
-- fire too, and a WHEN over OLD alone would miss it.
create constraint trigger stock_movement_receipt_complete_chg_trg
  after delete or update on public.stock_movement
  deferrable initially deferred
  for each row
  execute function public.stock_batch_receipt_complete();


-- ----------------------------------------------------------------------------
-- 4. Grants
-- ----------------------------------------------------------------------------
-- Explicit rather than inherited, so the intent is reviewable in the migration.
--
-- receipt_completeness_violations() follows batch_balance_violations() exactly:
-- an operator and CI tool, security definer so it can see every tenant, and
-- therefore granted to nobody. A client that could call it would read the shape
-- of every workspace's deliveries across the tenant wall.
--
-- The trigger function is never called directly.

revoke all on function public.receipt_completeness_violations(uuid)
  from public, anon, authenticated;
revoke all on function public.stock_batch_receipt_complete() from public;
