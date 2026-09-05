-- ============================================================================
-- 0022 — adjust_stock(): opening balances and physical counts, ABSOLUTE
-- ============================================================================
-- ADR-035 §2.4 (the ledger), §2.6 (the write surface), §2.7 (access and roles).
-- docs/PLAN.md task 4f — the LAST of build step 4's six functions.
--
-- §2.6, verbatim:
--
--     adjust_stock(location_id, variant_id, counted_base, note)
--       Opening balances and physical counts. ABSOLUTE — the counted figure wins
--
-- §2.4 says why it has to exist at all: "Without it every batch figure in the
-- first month is fiction and a correct model looks broken."
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THIS MIGRATION CHANGES AN APPLIED TABLE, AND IT IS THE ONLY ONE IN STEP 4
-- THAT DOES
-- ----------------------------------------------------------------------------
-- `note` IS IN THE ADR'S SIGNATURE AND WAS IN NO TABLE IN THIS DATABASE. §2.6
-- names it twice — here and on `adjust_stock_delta` — and `0004:332` asserts it
-- as an existing fact while writing the constraint that depends on it:
--
--     "An adjustment answers to nothing but its own note."
--
-- There was no `note` column on `stock_movement`, on `stock_batch`, or anywhere
-- else in `public`. Grepped across every applied migration before this one was
-- written: four occurrences of the word, every one of them a comment.
--
-- Nothing noticed for eighteen migrations because UNTIL NOW NOTHING ON THE WRITE
-- SURFACE HAD A NOTE TO WRITE. The other five RPCs hang their free text off a
-- document table — `reversal_reason` on `purchase`, `sale` and `waste` — and an
-- adjustment is the one operation with no document.
--
-- `CLAUDE.md` settles what to do and it is not a judgement call: the ADR wins and
-- the other file is the bug. So the column is added here, fix-forward, beside the
-- function that needs it.
--
-- ⚠️ WHY ON `stock_movement` AND NOT ON A NEW `adjustment` TABLE. A document table
-- was considered and refused. `stock_movement_source_agrees` requires all four
-- document ids to be NULL for reason 'adjustment' — the ADR's own constraint says
-- an adjustment has no document — so a table would mean altering that constraint
-- to admit a fifth id, on the same applied table, plus a new table, new RLS, new
-- policies and a new grant surface. The note is one text column and it belongs on
-- the row that carries the reason it explains.
--
-- ----------------------------------------------------------------------------
-- ⚠️ DECIDED HERE ON THE OWNER'S BEHALF — CHEAP NOW, DEAR ONCE MERGED
-- ----------------------------------------------------------------------------
-- 1. **`note text` on `stock_movement`**, nullable, with a not-blank check. See
--    above. This is the one that is expensive to reverse: a column on the ledger.
--
-- 2. **`TD003` IS REUSED FOR THE ROLE FENCE, not re-invented.** `0021` minted it
--    for a void refused by the fence, and argued it against `42501` on the
--    grounds that `42501` means "this is not your store" — a bug to report —
--    while a role refusal means "ask your manager", a workflow. A cashier calling
--    `adjust_stock` is the second of those exactly. 4d-i's rule then applies
--    unchanged: one sqlstate per contract across the whole write surface, so a
--    client branches on it once. The location wall below still raises `42501`.
--
-- 3. **A COUNT UP REPAYS NEGATIVE LOTS BEFORE IT OPENS A NEW ONE**, and this is
--    the decision most worth reading. `0004:429` states the function's purpose in
--    those words: "a negative balance is a true statement about a disagreement
--    between the ledger and the shelf, and adjust_stock is how it gets resolved."
--    A count up that only ever opened a fresh lot would leave the overdrawn lot
--    at -5 FOREVER — `allocate_fefo()` reads only `remaining_base > 0`, so no
--    sale, no write-off and no transfer will ever touch a negative lot again. The
--    total would be right and the lot would be immortal, and the function that
--    §2.4 and `0004` both name as the resolution would not resolve anything.
--    So: credit the debt back first, at THE COST IT WAS OVERDRAWN AT, and open a
--    lot for whatever is left over.
--
-- 4. **THE NEW LOT COSTS ZERO**, and that is 1.3b's decision inherited rather
--    than re-taken. `allocate_fefo()` branch (3) already opens its shortfall lot
--    at zero for the reason recorded there: "Zero rather than a borrowed
--    estimate, because 100% margin on those units is visibly wrong and gets asked
--    about, where a plausible invented cost is invisibly wrong and is what §2.9
--    would then be built on." Stock counted onto a shelf is the same situation.
--
-- 5. **THERE IS NO IDEMPOTENCY KEY AND NO `TD001` CASE.** §2.6 gives this
--    function no id, and it is the only write RPC without one. It needs none:
--    the operation is ABSOLUTE, so the second identical call computes a delta of
--    zero against the balance the first one wrote and returns `changed: false`
--    having written nothing. Convergence is the idempotency. ⚠️ What it does NOT
--    give is de-duplication of two DIFFERENT counts — the later count wins, which
--    is what "the counted figure wins" means.
--
-- ----------------------------------------------------------------------------
-- THE FENCE (§2.7)
-- ----------------------------------------------------------------------------
--     Stock counts and adjustments   | staff — | manager ● | owner ● |
--
-- ⚠️ THIS IS A FLAT ROLE FENCE AND NOT `0021`'S TWO-TIER ONE. There is no window,
-- no "own" and no self-service half: a cashier cannot adjust stock at their own
-- store, at any time, for any reason. `0021` had a window because a void is a
-- correction of something the cashier just did and knows about. A physical count
-- is an assertion about the whole shelf, and §2.7 puts it beside "see cost and
-- margin" for that reason.
--
-- ----------------------------------------------------------------------------
-- WHAT IT DOES NOT DO
-- ----------------------------------------------------------------------------
-- ⚠️ NO AVAILABILITY CHECK, and the question does not even arise. Enforcement
-- (`0017`) constrains taking stock OUT against what the shelf holds; this
-- function's whole subject is that the shelf and the ledger DISAGREE. Refusing a
-- count for disagreeing with the number it exists to replace would be circular.
--
-- ⚠️ `adjust_stock_delta` IS NOT HERE. ADR-035 §3 ships it in build step 4.5 with
-- the failure path it serves (`0023`), and §2.6 was amended on 2026-09-03 to say
-- so. This function is the ABSOLUTE one; that one is the RELATIVE one.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The column §2.6 has always assumed  (ADR-035 §2.6, and 0004:332)
-- ----------------------------------------------------------------------------
-- Fix-forward on an applied table, per supabase/README.md: `0004` is closed, so
-- the column lands here rather than being edited into it.
--
-- Nullable, because every movement written by the other five RPCs has no note and
-- never will — a NOT NULL would need a default of '' on three million rows to say
-- nothing at all. The not-blank check is `0003`'s convention for text that means
-- something when present (`purchase_payload_hash_not_blank` and its two
-- siblings): the function below trims and nulls empty input rather than storing
-- a blank that reads as a note nobody wrote.

alter table public.stock_movement
  add column note text;

alter table public.stock_movement
  add constraint stock_movement_note_not_blank
  check (note is null or btrim(note) <> '');

comment on column public.stock_movement.note is
  'Free text explaining an adjustment, from adjust_stock() and (in 0023) '
  'adjust_stock_delta(). An adjustment has no document table, so this is the '
  'only place its reason can live — 0004''s stock_movement_source_agrees says as '
  'much. Null on every movement that answers to a document instead. ADR-035 §2.6.';


-- ----------------------------------------------------------------------------
-- 2. adjust_stock()  (ADR-035 §2.6)
-- ----------------------------------------------------------------------------
-- The offline pair is appended to §2.6's four arguments, exactly as `0018`,
-- `0019` and `0020` append it to theirs: the ADR's table lists what a function is
-- FOR, and the pilot store writes offline as its normal path. A count taken in
-- the aisle with no signal is the ordinary case, not the exotic one.

create function public.adjust_stock(
  p_location_id      uuid,
  p_variant_id       uuid,
  p_counted_base     numeric,
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
  v_counted   numeric(14,3);
  v_before    numeric(14,3);
  v_delta     numeric(14,3);
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
  -- Four lines, the RPC's own, verbatim from the other five. RLS is not running
  -- inside a `security definer` function, so nothing in the schema catches the
  -- absence of this block (4b-i's F1, measured).
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'location not accessible'
      using errcode = '42501';
  end if;

  if v_user is null then
    raise exception 'adjust_stock requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- Derived from the location, never a parameter — 4b-i's rule. There is no
  -- second value that can disagree with the first.
  select l.workspace_id into v_ws
    from public.location l
   where l.id = p_location_id;

  -- ---- 2. the fence  (§2.7) -----------------------------------------------
  -- ⚠️ AFTER the location wall and not before it, and the order is deliberate.
  -- A manager of ANOTHER workspace must be told "not your store" (42501), not
  -- "ask your manager" (TD003) — they ARE the manager, and the message would
  -- send them looking for a permission they already hold. The wall answers the
  -- question that comes first.
  if not public.has_role(v_ws, 'manager') then
    raise exception 'adjust_stock: stock counts and adjustments are a manager '
                    'capability (ADR-035 §2.7) — ask a manager or the owner'
      using errcode = 'TD003';
  end if;

  -- ---- 3. the timestamps  (§2.6) ------------------------------------------
  -- `0019`'s clamp, unchanged: an offline write is trusted within a 72-hour
  -- window and an online one is stamped by the server.
  --
  -- ⚠️ IT MATTERS HERE FOR A REASON THE OTHER FUNCTIONS DO NOT HAVE: `v_at` is
  -- what a lot opened by a count is RECEIVED at, and `received_at` is FEFO's
  -- second sort key (§2.4). A count taken in the aisle on Friday and flushed on
  -- Monday must open its lot on Friday, or it sorts ahead of stock that really
  -- did arrive first. 4d-ii found this on `record_waste` and named 4f as one of
  -- the two functions that inherit it.
  if v_offline then
    v_at := greatest(least(coalesce(p_occurred_at, v_now), v_now),
                     v_now - interval '72 hours');
  else
    v_at := v_now;
  end if;

  -- ---- 4. the count itself ------------------------------------------------
  if p_variant_id is null then
    raise exception 'adjust_stock: variant_id is required'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.product_variant pv
                  where pv.id = p_variant_id and pv.workspace_id = v_ws) then
    raise exception 'adjust_stock: variant % is not in this workspace',
                    p_variant_id
      using errcode = '22023';
  end if;

  if p_counted_base is null then
    raise exception 'adjust_stock: counted_base is required — this function is '
                    'ABSOLUTE, and a missing count is not a count of zero'
      using errcode = '22023';
  end if;

  -- ⚠️ ZERO IS LEGAL AND IS NOT THE "rounds to zero" GATE THE OTHER FUNCTIONS
  -- CARRY. `0018` and `0019` refuse a quantity that rounds to nothing because a
  -- line of nothing is a keying error. Counting a shelf EMPTY is the commonest
  -- correct count a shop takes, and refusing it would leave the one number an
  -- operator most needs to record unrecordable.
  if p_counted_base < 0 then
    raise exception 'adjust_stock: counted_base cannot be negative, got % — a '
                    'shelf holds nothing or it holds something, and a negative '
                    'BALANCE is something only the ledger can be wrong by',
                    p_counted_base
      using errcode = '22023';
  end if;

  -- The ledger stores numeric(14,3) in the base unit and nothing else (§2.5
  -- rule 1). A count with more precision than that would be silently rounded on
  -- insert — and this figure is ASSERTED BY A HUMAN, which is precisely the
  -- input a silent round must not be applied to. 1.3b's argument about invented
  -- costs, in the other currency: invisibly wrong is worse than refused.
  if round(p_counted_base, 3) <> p_counted_base then
    raise exception 'adjust_stock: counted_base % has more precision than the '
                    'base unit stores — the ledger is numeric(14,3) (ADR-035 '
                    '§2.5), and rounding a counted figure without saying so is '
                    'how an asserted number becomes a guess', p_counted_base
      using errcode = '22023';
  end if;

  v_counted := p_counted_base;

  -- ---- 5. what the ledger currently believes ------------------------------
  -- ⚠️ THE LOCK IS `allocate_fefo()`'s ORDER, VERBATIM (`0010`), and 4c-i's
  -- argument is the one being reused: a statement that takes the rows the next
  -- statement was going to take, in the same order, introduces no new lock and
  -- no new lock ORDERING. The predicate is deliberately WIDER than the
  -- allocator's `remaining_base > 0` — a count has to see the negative lots too,
  -- because resolving them is half of what it is for — and a superset acquired
  -- in the same order still cannot deadlock against the allocator.
  --
  -- Without this lock a sale committing between the read and the write would be
  -- counted twice: once on the shelf the manager just counted, once in the delta
  -- this function computes against a balance that has since moved.
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

  v_delta := v_counted - v_before;

  -- ---- 6a. the count agrees ------------------------------------------------
  -- ⚠️ NO MOVEMENT IS WRITTEN, AND THAT IS FORCED BY THE SCHEMA, not chosen for
  -- tidiness: `stock_movement_sign_follows_reason` requires `qty_base <> 0` for
  -- every reason including 'adjustment'. A zero-quantity movement cannot be
  -- inserted, so a count that confirms the ledger is a read. This is also what
  -- makes a repeated identical call a no-op — see the header, decision 5.
  if v_delta = 0 then
    return jsonb_build_object(
      'workspace_id',     v_ws,
      'location_id',      p_location_id,
      'variant_id',       p_variant_id,
      'counted_base',     v_counted,
      'previous_base',    v_before,
      'delta_base',       0,
      'occurred_at',      v_at,
      'recorded_offline', v_offline,
      'movement_count',   0,
      'batch_opened',     null,
      'note',             v_note,
      'changed',          false
    );
  end if;

  if v_delta < 0 then
    -- ---- 6b. the shelf holds LESS than the ledger says ---------------------
    -- FEFO, through the allocator every other withdrawal on this surface uses.
    -- Writing a bespoke walk here would be a second allocation policy, and the
    -- reason 1.3b put the policy in one function is that two of them drift.
    --
    -- ⚠️ THE ALLOCATOR'S SHORTFALL BRANCHES ARE ARITHMETICALLY UNREACHABLE FROM
    -- HERE, and it is worth saying why rather than trusting it. `v_before` is
    -- the sum over ALL lots; the allocator draws from the POSITIVE ones, whose
    -- total is at least `v_before`. This branch asks for `v_before - v_counted`
    -- with `v_counted >= 0`, so it asks for no more than `v_before`. It can
    -- always be satisfied out of stock that is really open, and a count down
    -- therefore NEVER opens a lot. `supabase/tests/0022` asserts the absence
    -- rather than assuming it — 4d-i's practice with `record_purchase`'s locks.
    select coalesce(array_agg(a.*), '{}'),
           coalesce(sum(a.qty_base), 0),
           count(*)
      into v_allocs, v_alloc_qty, v_lots
      from public.allocate_fefo(v_ws, p_location_id, p_variant_id,
                                -v_delta, v_user, v_at) a;

    if v_lots = 0 or v_alloc_qty <> -v_delta then
      raise exception 'adjust_stock: the allocator returned % base units across '
                      '% lot(s) for a shortfall of % — a count cannot be written '
                      'against an allocation that does not add up',
                      v_alloc_qty, v_lots, -v_delta
        using errcode = 'internal_error';
    end if;

    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, occurred_at, created_by, note)
    select v_ws, p_location_id, a.batch_id, p_variant_id, 'adjustment',
           -- NEGATIVE: stock the ledger believed in and the shelf does not have.
           -a.qty_base, a.unit_cost_net_per_base, v_at, v_user, v_note
      from unnest(v_allocs) a;

    get diagnostics v_moves = row_count;

  else
    -- ---- 6c. the shelf holds MORE than the ledger says ---------------------
    -- TWO PHASES, and the first one is the header's decision 3.
    --
    -- PHASE ONE — repay the debt. Every lot this location has driven negative is
    -- credited back, FEFO order, AT ITS OWN COST. That cost is the point: the
    -- overdraw took units at cost X that were never there, and the count says so,
    -- so the money that comes back must be the same money that went out. Crediting
    -- it at zero instead would leave §2.9 with a lot whose cost history does not
    -- net out.
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
         unit_cost_net_per_base, occurred_at, created_by, note)
      values
        (v_ws, p_location_id, v_lot.batch_id, p_variant_id, 'adjustment',
         v_take, v_lot.unit_cost_net_per_base, v_at, v_user, v_note);

      v_moves := v_moves + 1;
      v_left  := v_left - v_take;
    end loop;

    -- PHASE TWO — whatever is left is stock nobody has a receipt for. One lot,
    -- one movement, zero cost, no expiry.
    --
    -- ⚠️ NO EXPIRY, and `0010` already argued it for the shortfall lot: inventing
    -- one would put a fictional lot at the head of the FEFO order. A manager who
    -- knows the date records the delivery through Comprar; a count is what
    -- happens when nobody knows.
    --
    -- `received_at` IS `v_at` and not the column default of `now()`, for the
    -- reason section 3 gives.
    if v_left > 0 then
      insert into public.stock_batch
        (workspace_id, location_id, variant_id, origin,
         qty_received_base, unit_cost_net_per_base, received_at, created_by)
      values
        (v_ws, p_location_id, p_variant_id, 'adjustment',
         v_left, 0, v_at, v_user)
      returning id into v_opened;

      -- The lot opens at a balance of ZERO (`0004`'s trigger) and this movement
      -- is what fills it — the same "a lot and its receipt are one transaction"
      -- rule 4a settled, kept here even though `origin = 'adjustment'` is
      -- outside `receipt_completeness_violations()`'s predicate by design.
      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, occurred_at, created_by, note)
      values
        (v_ws, p_location_id, v_opened, p_variant_id, 'adjustment',
         v_left, 0, v_at, v_user, v_note);

      v_moves := v_moves + 1;
    end if;
  end if;

  -- `recorded_at` is left to its `now()` default throughout. §2.6: server-set,
  -- never client-supplied, and the one column an offline write must not backdate.
  return jsonb_build_object(
    'workspace_id',     v_ws,
    'location_id',      p_location_id,
    'variant_id',       p_variant_id,
    'counted_base',     v_counted,
    'previous_base',    v_before,
    'delta_base',       v_delta,
    'occurred_at',      v_at,
    'recorded_offline', v_offline,
    'movement_count',   v_moves,
    'batch_opened',     v_opened,
    'note',             v_note,
    'changed',          true
  );
end;
$$;

comment on function public.adjust_stock(uuid, uuid, numeric, text, timestamptz, boolean) is
  'Writes a physical count or an opening balance. ABSOLUTE — the counted figure '
  'wins, and the difference is booked as adjustment movements in one '
  'transaction. A count DOWN allocates FEFO through allocate_fefo(); a count UP '
  'first repays every lot this location has driven negative, at that lot''s own '
  'cost, and opens ONE zero-cost lot for the remainder (ADR-035 §2.4, and '
  '0004:429 — this function is how a negative balance gets resolved). A count '
  'that agrees with the ledger writes nothing. Manager and owner only (§2.7), '
  'TD003 otherwise; the location is validated in its own body because RLS is not '
  'running here. No idempotency key and none needed: absolute writes converge. '
  'ADR-035 §2.4, §2.5, §2.6, §2.7.';


-- ----------------------------------------------------------------------------
-- Grants  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- `authenticated` and nothing else, as with the other five. The ROLE fence is
-- inside the body rather than in the grant, and that is not laziness: a grant can
-- only name a database role, and `staff` / `manager` / `owner` are rows in
-- `workspace_member`, per workspace. The same user can be a manager in one
-- workspace and staff in another, which no `grant` can express.

revoke all on function
  public.adjust_stock(uuid, uuid, numeric, text, timestamptz, boolean) from public;
grant execute on function
  public.adjust_stock(uuid, uuid, numeric, text, timestamptz, boolean) to authenticated;
