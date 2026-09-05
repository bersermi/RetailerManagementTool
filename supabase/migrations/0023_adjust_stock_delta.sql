-- ============================================================================
-- 0023 — adjust_stock_delta(): the RELATIVE ledger primitive of the failure path
-- ============================================================================
-- ADR-035 §2.4 (the ledger), §2.6 (the write path and its failure path), §2.7
-- (access), §3 step 4.5. docs/PLAN.md task 4.5a — the FIRST of build step 4.5's
-- three functions.
--
-- §2.6, verbatim:
--
--     adjust_stock_delta(location_id, variant_id, delta_base, reason, note)
--       RELATIVE. Moves the balance by a signed amount without reading it first.
--       Required by the failure path below; an absolute count would race any
--       concurrent sale and write a number that was already wrong.
--
-- ⚠️ "WITHOUT READING IT FIRST" IS A STATEMENT ABOUT THE CALLER, NOT ABOUT THIS
-- BODY. The point of the sentence is that a caller never has to fetch a balance,
-- compute a target and send an absolute figure — which is what makes it safe
-- against a concurrent sale, because the delta stays correct however the balance
-- moved underneath it. This function still reads the shelf, for two things the
-- arithmetic genuinely needs: which lots a withdrawal comes out of (FEFO, §2.4),
-- and which lots are overdrawn so a credit can repay them. Neither read enters
-- the quantity. `previous_base` in the return value is reported, never used.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ DECIDED HERE ON THE OWNER'S BEHALF — AND THE FIRST IS AN ACCESS DECISION
-- ----------------------------------------------------------------------------
-- 1. **THIS FUNCTION IS NOT GRANTED TO `authenticated`. No client can call it.**
--    It is the only one of §2.6's ten write-surface functions that is not.
--
--    §2.7 fences stock adjustment at MANAGER — "Stock counts and adjustments:
--    staff —, manager ●, owner ●" — and `0022` spends twelve lines enforcing
--    exactly that with `TD003`. Granting this function to `authenticated` with no
--    fence would hand every cashier the same capability with a different sign, in
--    one call.
--
--    But a manager fence INSIDE this body would break the failure path in its
--    ordinary case. §2.6's "one deliberate exception" exists because "the
--    commonest reason a write is permanently rejected is that the caller's
--    location access was wrong" — the caller being the cashier whose sale just
--    failed. `record_failed_write` (`0024`) must work for that cashier, and its
--    downgrade must run THROUGH this function: §2.6 puts that on the §2.10 review
--    checklist by name — "anyone reviewing this function checks that it writes to
--    `failed_write` and to the ledger via `adjust_stock_delta` and to nothing
--    else."
--
--    Granting nothing satisfies both. The fence lives on the CALLERS, which is
--    where §2.7 writes it: §2.7 is a table of capabilities, and "downgrade a
--    write that already failed" is not one of its rows. `security definer` plus
--    no grant is what makes `record_failed_write` — itself `security definer`,
--    same owner — the only way in.
--
--    ⚠️ THE DIRECTION IS DELIBERATE. Adding a grant later is one line and breaks
--    nothing. Removing one after a client has shipped against it is a coordinated
--    release. If an operator-facing relative adjustment is ever wanted, it costs
--    a `grant` and a fence, in that order.
--
-- 2. **`reason` HAS NOWHERE TO LIVE, AND THIS IS 4f's `note` FINDING A SECOND
--    TIME.** §2.6's signature names five arguments. `note` had no column until
--    `0022` added one. `reason` has none now — and it CANNOT be
--    `stock_movement.reason`, which is the `movement_reason` enum and is
--    `'adjustment'` for every row this function writes, fixed there by
--    `stock_movement_source_agrees`. So a second enum and a second column, added
--    fix-forward beside the function that needs them, on `CLAUDE.md`'s rule: the
--    ADR wins and the other file is the bug.
--
--    ⚠️ THE ENUM SHIPS TWO VALUES AND THIS MIGRATION WRITES ONE. Nothing here
--    writes `physical_count`: it exists so the column means something the day
--    `adjust_stock` is replaced to stamp it, which is NOT done here because a
--    `create or replace` would copy 250 applied lines into this file to change
--    one INSERT. **Movements written by `adjust_stock` therefore carry NULL**,
--    and that is recorded rather than hidden — today `adjustment_reason is null`
--    means "a physical count, or a movement older than `0023`".
--
--    ⚠️ THERE IS NO `replay_compensation` VALUE. §2.6 says replay *compensates*
--    `adjustment_movement_id`, which is a reversal carrying
--    `reversal_of_movement_id` — a different shape from a fresh delta — and
--    whether it comes through this function at all is `0025`'s call to make. An
--    enum value nothing writes and nobody has designed for is a guess with a
--    type behind it.
--
-- 3. **THE REPAY-THEN-OPEN RULE IS 4f's, CARRIED OVER UNCHANGED**, and the
--    argument is `0004:429`'s rather than consistency for its own sake: a credit
--    that only ever opened a fresh lot would leave an overdrawn lot at -5
--    forever, because `allocate_fefo()` reads only `remaining_base > 0` and will
--    never touch a negative lot again. The totals would be right and the lot
--    immortal. So a POSITIVE delta repays every negative lot first, FEFO, AT ITS
--    OWN COST, and opens ONE zero-cost lot for the remainder.
--
-- ----------------------------------------------------------------------------
-- HOW THIS DIFFERS FROM `adjust_stock` (`0022`), WHICH IS THE ABSOLUTE SIBLING
-- ----------------------------------------------------------------------------
--   * ABSOLUTE vs RELATIVE. `adjust_stock` computes `counted - balance`; this one
--     is handed the difference. That is the whole of §2.6's argument for having
--     both, and it is why this one is safe to call from a function that has just
--     caught an error and holds no lock.
--   * ⚠️ ZERO. `adjust_stock` treats a count of zero as LEGAL and meaningful —
--     4f: "counting a shelf EMPTY is the commonest correct count a shop takes."
--     A DELTA of zero describes no shelf at all: it is a no-op, and
--     `stock_movement_sign_follows_reason` (`qty_base <> 0`) would refuse the
--     movement anyway. Same word, opposite handling, and the reason is that one
--     is a measurement and the other is a difference.
--   * ⚠️ NEGATIVE INPUT. `adjust_stock` REFUSES a negative count: a shelf cannot
--     hold less than nothing. A negative DELTA is the ordinary case here — it is
--     what a failed-write downgrade IS.
--   * ⚠️ THE ALLOCATOR'S SHORTFALL BRANCHES ARE REACHABLE. In `0022` they are
--     arithmetically unreachable and the suite asserts the absence. Here a delta
--     may exceed the shelf, so `allocate_fefo()` overdraws (branch 1), blames the
--     last lot (branch 2) or OPENS one (branch 3) exactly as it does for a sale.
--     That is correct: `0004:429` permits a negative balance, and a downgrade
--     whose stock is already gone is precisely the case §2.6 built this for.
--   * NO ROLE FENCE, NO GRANT — decision 1 above. `0022` has both.
--
-- ----------------------------------------------------------------------------
-- WHAT IT DOES NOT DO
-- ----------------------------------------------------------------------------
-- ⚠️ NO IDEMPOTENCY KEY, AND UNLIKE `0022` CONVERGENCE DOES NOT SUPPLY ONE. §2.6
-- gives this function no id. An ABSOLUTE write is idempotent by construction —
-- the second identical call computes a delta of zero — but a RELATIVE write
-- applied twice moves the balance twice. 4f named this in advance: "4.5 must
-- supply a key of its own or accept that `record_failed_write` is the only
-- caller." **This accepts it.** The key lives on the caller: a `failed_write` row
-- is keyed by the client uuid of the write that failed (`0024`), so the second
-- report of one failure collides there and never reaches this function.
--
-- ⚠️ NO AVAILABILITY CHECK, for `0022`'s reason unchanged: enforcement (`0017`)
-- constrains taking stock out against what the shelf holds, and this function's
-- subject is that the shelf and the ledger disagree.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Why an adjustment happened  (ADR-035 §2.6, and 0004:320)
-- ----------------------------------------------------------------------------
-- An enum and not `text`, on this schema's own convention (`batch_origin`,
-- `movement_reason`, `waste_reason`): the set is closed and small, and §2.9 must
-- be able to exclude a downgrade from "what made me money" with an equality
-- rather than a LIKE over free text. `note` remains the human sentence.

create type public.adjustment_reason as enum (
  'physical_count',           -- 0022's absolute count. NOT WRITTEN YET — header, 2
  'failed_write_downgrade'    -- 0024's auto-downgrade of a permanently rejected write
);

comment on type public.adjustment_reason is
  'Why an adjustment movement was written — the `reason` argument of '
  'adjust_stock_delta() (ADR-035 §2.6). Distinct from movement_reason, which is '
  '''adjustment'' for every one of these rows and cannot carry the distinction. '
  'ADR-035 §2.6, §2.9.';

alter table public.stock_movement
  add column adjustment_reason public.adjustment_reason;

-- Nullable, and it has to be: every movement written before this migration has no
-- value, and `adjust_stock` (0022, applied) does not stamp one. The constraint
-- below is therefore one-directional — it stops the column appearing on a
-- movement that answers to a DOCUMENT, which is the error that would actually
-- mislead a report, and does not pretend every adjustment has one.
alter table public.stock_movement
  add constraint stock_movement_adjustment_reason_agrees
  check (adjustment_reason is null or reason = 'adjustment');

comment on column public.stock_movement.adjustment_reason is
  'Why this adjustment happened, from adjust_stock_delta() (ADR-035 §2.6). NULL '
  'on every movement that answers to a document, and — until adjust_stock() is '
  'replaced to stamp ''physical_count'' — also on every physical count, so a null '
  'today reads as "a count, or a movement older than 0023". See 0023''s header.';


-- ----------------------------------------------------------------------------
-- 2. adjust_stock_delta()  (ADR-035 §2.6)
-- ----------------------------------------------------------------------------
-- The offline pair is appended to §2.6's five arguments exactly as `0018`–`0022`
-- append it to theirs. It is not decoration here either: `v_at` is what a lot
-- opened by a credit is RECEIVED at, and `received_at` is FEFO's second sort key
-- (§2.4). A downgrade for a sale that happened on Friday and was rejected on
-- Monday must not sort ahead of stock that really did arrive first — 4d-ii found
-- this, and 4f inherited it.

create function public.adjust_stock_delta(
  p_location_id      uuid,
  p_variant_id       uuid,
  p_delta_base       numeric,
  p_reason           public.adjustment_reason,
  p_note             text        default null,
  p_occurred_at      timestamptz default null,
  p_recorded_offline boolean     default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_ws        uuid;
  v_offline   boolean := coalesce(p_recorded_offline, false);
  v_now       timestamptz := now();
  v_at        timestamptz;
  v_note      text := nullif(btrim(coalesce(p_note, '')), '');
  v_delta     numeric(14,3);
  v_before    numeric(14,3);
  v_left      numeric(14,3);
  v_take      numeric(14,3);
  v_lot       record;
  v_allocs    public.fefo_allocation[];
  v_alloc_qty numeric(14,3);
  v_lots      integer := 0;
  v_moves     integer := 0;
  v_opened    uuid;
begin
  -- ---- 1. the location wall, FIRST, exactly as §2.6 writes it --------------
  -- ⚠️ IT IS HERE EVEN THOUGH NO CLIENT CAN REACH THIS FUNCTION. RLS is not
  -- running inside a `security definer` body (4b-i's F1, measured), and the
  -- callers this function is built for are themselves `security definer` — so
  -- the wall is the only thing between a bad `p_location_id` and a movement at
  -- someone else's store. §2.6: "Every RPC validates its location as its first
  -- statement." The exception §2.6 grants is `record_failed_write`'s alone, and
  -- it is about that function's own argument, not about this one's.
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'location not accessible'
      using errcode = '42501';
  end if;

  if v_user is null then
    raise exception 'adjust_stock_delta requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- Derived from the location, never a parameter — 4b-i's rule. There is no
  -- second value that can disagree with the first.
  select l.workspace_id into v_ws
    from public.location l
   where l.id = p_location_id;

  -- ---- 2. no role fence, and that is a decision -----------------------------
  -- See the header, decision 1. §2.7's manager fence lives on the CALLERS; this
  -- function is unreachable from `authenticated` because nothing grants it.

  -- ---- 3. the timestamps  (§2.6) ------------------------------------------
  if v_offline then
    v_at := greatest(least(coalesce(p_occurred_at, v_now), v_now),
                     v_now - interval '72 hours');
  else
    v_at := v_now;
  end if;

  -- ---- 4. the arguments ----------------------------------------------------
  if p_variant_id is null then
    raise exception 'adjust_stock_delta: variant_id is required'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.product_variant pv
                  where pv.id = p_variant_id and pv.workspace_id = v_ws) then
    raise exception 'adjust_stock_delta: variant % is not in this workspace',
                    p_variant_id
      using errcode = '22023';
  end if;

  if p_delta_base is null then
    raise exception 'adjust_stock_delta: delta_base is required — this function '
                    'is RELATIVE, and a missing delta is not a delta of zero'
      using errcode = '22023';
  end if;

  -- ⚠️ THE REASON IS REQUIRED, and it is the one argument with no sensible
  -- default. A relative move has no self-evident cause: an absolute count IS its
  -- own explanation ("someone counted the shelf"), where a delta of -3 could be a
  -- downgrade, a correction or a mistake, and §2.9 has to be able to tell them
  -- apart. §2.6 puts `reason` in the signature of this function and not in
  -- `adjust_stock`'s for exactly that reason.
  if p_reason is null then
    raise exception 'adjust_stock_delta: reason is required — a relative move '
                    'carries no explanation of its own (ADR-035 §2.6)'
      using errcode = '22023';
  end if;

  -- The ledger stores numeric(14,3) in the base unit and nothing else (§2.5
  -- rule 1). 1.3b's argument, inherited through 4f: a figure that would be
  -- silently rounded on insert is refused instead, because invisibly wrong is
  -- worse than refused.
  if round(p_delta_base, 3) <> p_delta_base then
    raise exception 'adjust_stock_delta: delta_base % has more precision than '
                    'the base unit stores — the ledger is numeric(14,3) '
                    '(ADR-035 §2.5)', p_delta_base
      using errcode = '22023';
  end if;

  v_delta := p_delta_base;

  -- ---- 5. what the ledger currently believes ------------------------------
  -- ⚠️ THE LOCK IS `allocate_fefo()`'s ORDER, VERBATIM (`0010`), over the WIDER
  -- predicate 4f settled: 4c-i's argument reused — a statement that takes the
  -- rows the next statement was going to take, in the same order, introduces no
  -- new lock ordering, and the superset (negative lots included, because repaying
  -- them is half of what this function is for) still cannot deadlock against the
  -- allocator.
  --
  -- ⚠️ IT IS NOT HERE TO PROTECT THE QUANTITY — the delta is given, not derived,
  -- which is §2.6's whole argument for a relative operation. It is here because
  -- the REPAYMENT branch below reads which lots are negative and by how much, and
  -- two concurrent credits reading that set would repay the same debt twice.
  perform 1
    from public.batch_balance bb
   where bb.workspace_id = v_ws
     and bb.location_id  = p_location_id
     and bb.variant_id   = p_variant_id
   order by bb.expiry_date asc nulls last, bb.received_at asc, bb.batch_id asc
     for update;

  select coalesce(sum(bb.remaining_base), 0)
    into v_before
    from public.batch_balance bb
   where bb.workspace_id = v_ws
     and bb.location_id  = p_location_id
     and bb.variant_id   = p_variant_id;

  -- ---- 6a. a delta of zero moves nothing ----------------------------------
  -- Not `adjust_stock`'s "zero is legal" case, and the header says why. Forced by
  -- the schema as well as chosen: `stock_movement_sign_follows_reason` requires
  -- `qty_base <> 0` for every reason including 'adjustment'.
  if v_delta = 0 then
    return jsonb_build_object(
      'workspace_id',      v_ws,
      'location_id',       p_location_id,
      'variant_id',        p_variant_id,
      'delta_base',        0,
      'previous_base',     v_before,
      'new_base',          v_before,
      'reason',            p_reason,
      'note',              v_note,
      'occurred_at',       v_at,
      'recorded_offline',  v_offline,
      'movement_count',    0,
      'batch_opened',      null,
      'changed',           false
    );
  end if;

  if v_delta < 0 then
    -- ---- 6b. take stock OUT --------------------------------------------------
    -- FEFO, through the allocator every other withdrawal on this surface uses.
    -- Writing a bespoke walk here would be a second allocation policy, and 1.3b
    -- put the policy in one function because two of them drift.
    --
    -- ⚠️ UNLIKE `0022`, THE SHORTFALL BRANCHES ARE REACHABLE. A downgrade can ask
    -- for more than the shelf holds — the units are gone, which is why the write
    -- failed — so `allocate_fefo()` may overdraw the last lot, blame a closed one
    -- or open a fresh one. All three are correct here and `0004:429` permits the
    -- negative balance that results. The allocator always returns exactly what
    -- was asked for, which is what makes the assertion below a real check on the
    -- allocator rather than a restatement of it.
    select coalesce(array_agg(a.*), '{}'),
           coalesce(sum(a.qty_base), 0),
           count(*)
      into v_allocs, v_alloc_qty, v_lots
      from public.allocate_fefo(v_ws, p_location_id, p_variant_id,
                                -v_delta, v_user, v_at) a;

    if v_lots = 0 or v_alloc_qty <> -v_delta then
      raise exception 'adjust_stock_delta: the allocator returned % base units '
                      'across % lot(s) for a withdrawal of % — a delta cannot be '
                      'written against an allocation that does not add up',
                      v_alloc_qty, v_lots, -v_delta
        using errcode = 'internal_error';
    end if;

    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, occurred_at, created_by, note, adjustment_reason)
    select v_ws, p_location_id, a.batch_id, p_variant_id, 'adjustment',
           -a.qty_base, a.unit_cost_net_per_base, v_at, v_user, v_note, p_reason
      from unnest(v_allocs) a;

    get diagnostics v_moves = row_count;

  else
    -- ---- 6c. put stock BACK --------------------------------------------------
    -- TWO PHASES, and the first is the header's decision 3.
    --
    -- PHASE ONE — repay the debt. Every lot this location has driven negative is
    -- credited back, FEFO order, AT ITS OWN COST. The cost is the point: the
    -- overdraw took units at cost X that were never there, so the money coming
    -- back must be the same money that went out, or §2.9 is left with a lot whose
    -- cost history does not net out.
    v_left := v_delta;

    for v_lot in
      select bb.batch_id, bb.remaining_base, sb.unit_cost_net_per_base
        from public.batch_balance bb
        join public.stock_batch   sb on sb.id = bb.batch_id
       where bb.workspace_id   = v_ws
         and bb.location_id    = p_location_id
         and bb.variant_id     = p_variant_id
         and bb.remaining_base < 0
       order by bb.expiry_date asc nulls last, bb.received_at asc, bb.batch_id asc
    loop
      exit when v_left <= 0;

      v_take := least(v_left, -v_lot.remaining_base);

      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, occurred_at, created_by, note, adjustment_reason)
      values
        (v_ws, p_location_id, v_lot.batch_id, p_variant_id, 'adjustment',
         v_take, v_lot.unit_cost_net_per_base, v_at, v_user, v_note, p_reason);

      v_moves := v_moves + 1;
      v_left  := v_left - v_take;
    end loop;

    -- PHASE TWO — whatever is left is stock nobody has a receipt for. One lot,
    -- one movement, zero cost, no expiry. `0010`'s argument for the shortfall lot
    -- applies unchanged: inventing an expiry would put a fictional lot at the head
    -- of the FEFO order, and 1.3b's argument says the cost is zero rather than a
    -- borrowed estimate, because 100% margin is visibly wrong and gets asked
    -- about where a plausible invented cost is invisibly wrong.
    if v_left > 0 then
      insert into public.stock_batch
        (workspace_id, location_id, variant_id, origin,
         qty_received_base, unit_cost_net_per_base, received_at, created_by)
      values
        (v_ws, p_location_id, p_variant_id, 'adjustment',
         v_left, 0, v_at, v_user)
      returning id into v_opened;

      -- The lot opens at a balance of ZERO (`0004`'s trigger) and this movement
      -- is what fills it — 4a's "a lot and its receipt are one transaction",
      -- kept even though `origin = 'adjustment'` is outside
      -- `receipt_completeness_violations()`'s predicate by design.
      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, occurred_at, created_by, note, adjustment_reason)
      values
        (v_ws, p_location_id, v_opened, p_variant_id, 'adjustment',
         v_left, 0, v_at, v_user, v_note, p_reason);

      v_moves := v_moves + 1;
    end if;
  end if;

  -- `recorded_at` is left to its `now()` default throughout. §2.6: server-set,
  -- never client-supplied, and the one column an offline write must not backdate.
  return jsonb_build_object(
    'workspace_id',      v_ws,
    'location_id',       p_location_id,
    'variant_id',        p_variant_id,
    'delta_base',        v_delta,
    'previous_base',     v_before,
    'new_base',          v_before + v_delta,
    'reason',            p_reason,
    'note',              v_note,
    'occurred_at',       v_at,
    'recorded_offline',  v_offline,
    'movement_count',    v_moves,
    'batch_opened',      v_opened,
    'changed',           true
  );
end;
$$;

comment on function public.adjust_stock_delta(uuid, uuid, numeric,
                                              public.adjustment_reason, text,
                                              timestamptz, boolean) is
  'Moves a variant''s balance at one location by a SIGNED amount. RELATIVE — the '
  'caller never reads a balance first, which is what makes it safe against a '
  'concurrent sale (ADR-035 §2.6). A negative delta allocates FEFO through '
  'allocate_fefo() and may overdraw, exactly as a sale does; a positive delta '
  'first repays every lot this location has driven negative, at that lot''s own '
  'cost, then opens ONE zero-cost lot for the remainder (0004:429). A delta of '
  'zero writes nothing. ⚠️ NOT GRANTED TO authenticated: it exists for the '
  'failure path''s record_failed_write() to call (§2.6, §3 step 4.5), and §2.7''s '
  'manager fence on stock adjustment lives on the callers — see 0023''s header. '
  'No idempotency key: a relative write applied twice moves the balance twice, '
  'so the key is the caller''s. ADR-035 §2.4, §2.5, §2.6, §2.7.';


-- ----------------------------------------------------------------------------
-- Grants  (ADR-035 §2.6, §2.7)
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING IS GRANTED, AND THE `revoke` IS THE POINT. Postgres grants EXECUTE
-- on a new function to PUBLIC by default, so omitting this block would quietly do
-- the opposite of what the header decided — every one of `anon`, `authenticated`
-- and `service_role` could call it, and no line in this file would say so. This
-- is the function-level twin of the finding 3.1 recorded about tables: "a new
-- table in `public` is born with TRUNCATE granted to `authenticated`", clean only
-- because every migration revokes before it grants.
--
-- The caller that needs it — `record_failed_write`, `0024` — will be
-- `security definer` under the same owner, and reaches it that way.

revoke all on function
  public.adjust_stock_delta(uuid, uuid, numeric, public.adjustment_reason, text,
                            timestamptz, boolean) from public;
