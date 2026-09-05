-- ============================================================================
-- 0024 — failed_write, and record_failed_write(): the dead letter and the downgrade
-- ============================================================================
-- ADR-035 §2.4, §2.6 (the write path and *Rejected writes*), §2.7, §2.8, §2.10,
-- §3 step 4.5. docs/PLAN.md task 4.5b — the SECOND of build step 4.5's three.
--
-- §2.6, verbatim:
--
--     The client therefore calls `record_failed_write`, which in one transaction:
--     1. writes a `failed_write` row — client uuid, workspace, location, kind,
--        the original payload as `jsonb`, error code and detail, `failed_at`;
--     2. auto-downgrades via `adjust_stock_delta`, so the stock balance matches
--        the shelf within seconds rather than at the next physical count;
--     3. stores the resulting `adjustment_movement_id` on the `failed_write` row.
--
-- ⚠️⚠️ THIS MIGRATION AMENDS §2.6 IN TWO PLACES, BOTH ON THE OWNER'S EXPLICIT
-- INSTRUCTION (2026-09-05), AND BOTH ARE WRITTEN OUT IN THE ADR ITSELF RATHER
-- THAN IMPLEMENTED AROUND. They are numbered 1 and 2 below.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ AMENDMENT 1 — THE LINK IS REVERSED. `stock_movement.failed_write_id`,
-- NOT `failed_write.adjustment_movement_id`
-- ----------------------------------------------------------------------------
-- §2.6 step 3 says the row stores `adjustment_movement_id`, SINGULAR. A downgrade
-- is not singular and cannot be made so: `adjust_stock_delta` takes ONE
-- `variant_id`, a rejected sale has LINES, and one line spanning two lots writes
-- two movements on its own. A three-line basket is at least three movements.
--
-- The ADR's own next sentence is why this is not a cosmetic mismatch:
--
--     "Step 3 is what makes step 2 recoverable, and it is not optional. Without
--      the link, the downgrade and any later replay would each remove the same
--      units and the ledger would be short by exactly one sale."
--
-- So the link must be COMPLETE, not representative. A `failed_write` recording
-- only the first of its movements is a row `replay_failed_write` (`0025`) will
-- silently under-compensate — the exact arithmetic the sentence forbids.
--
-- TWO SHAPES WERE WEIGHED and the owner took the second:
--
--   (a) an `adjustment_group_id` on both tables, as `record_transfer` carries
--       `transfer_group_id` for the identical reason — a set of movements with no
--       document to hang off;
--   (b) `stock_movement.failed_write_id`, a real FOREIGN KEY, and the group is
--       the `failed_write` row itself.
--
-- (b) is one column rather than two, and it is the only one of the two that can
-- make §2.6's "not optional" a CONSTRAINT rather than a sentence:
--
--     check ((adjustment_reason is not distinct from 'failed_write_downgrade')
--            = (failed_write_id is not null))
--
-- A downgrade movement MUST name its dead letter and nothing else may carry one.
-- A bare group uuid can be null, wrong or shared and no constraint would say so —
-- which is the weakness `record_transfer` already lives with, and why 4e-i needed
-- an advisory lock to hold its idempotency up.
--
-- ⚠️ `is not distinct from`, NOT `=`. A plain `=` against a NULL
-- `adjustment_reason` yields NULL, and a NULL check constraint PASSES — so the
-- obvious spelling would let an unlinked downgrade through on exactly the rows
-- where `adjustment_reason` was forgotten.
--
-- ⚠️ THE COST, STATED: `0004:320` now carries a comment that is WRONG — "the link
-- back to its failed_write row is stored on that row, not on this one (§2.6)".
-- Migrations are append-only, so it cannot be edited; the column comment below
-- says so instead, and docs/PLAN.md records it.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ AMENDMENT 2 — ONLY `sale` AND `waste` ARE DOWNGRADED. A REJECTED
-- `purchase` OR `transfer` IS DEAD-LETTERED AND THE LEDGER IS NOT TOUCHED
-- ----------------------------------------------------------------------------
-- §2.6 describes the failure path entirely through the rejected SALE, and §2.10's
-- row says "a rejected sale". It never says what the other three kinds do. They
-- are not the same case, and the difference is not the sign:
--
--   * A rejected SALE or WASTE: the stock is GONE. Cash in the drawer, or the
--     bin. NOBODY WILL EVER RE-ENTER IT — a cashier does not re-ring a sale that
--     the customer has already walked away from. The ledger is left holding units
--     that do not exist, §2.10's nightly invariant cannot see it (it stays
--     internally consistent and externally wrong), and the downgrade is the only
--     thing that will ever fix it. It runs.
--
--   * A rejected PURCHASE: the stock is PRESENT. It is on the shelf, and the
--     person standing there is a manager or the owner holding a delivery note
--     (§2.7 — receiving is not a staff capability), who will re-enter it through
--     Comprar. ⚠️ AN AUTO-UPGRADE HERE IS ACTIVELY HARMFUL, NOT MERELY UNTIDY:
--     `adjust_stock_delta`'s positive branch opens a ZERO-COST lot, so it would
--     invent stock with no cost basis and then DOUBLE the shelf the moment the
--     delivery is re-entered properly. The sale case carries no such risk
--     precisely because nothing re-enters a sale.
--
--   * A rejected TRANSFER: two stores, no document (§2.4), and an idempotency
--     contract already held up by an advisory lock rather than a key (4e-i).
--     Compensating it across two locations at a guessed cost is the most complex
--     and least urgent of the four. It dead-letters.
--
-- The rule is therefore ONE SENTENCE and one direction: **downgrade the kinds
-- where the stock is gone and nobody will re-enter it.** Section 5 of
-- `supabase/tests/0024` is that decision made falsifiable, and it is a PAIR —
-- same variant, same quantity, same store: the SALE downgrades and the PURCHASE
-- does not, so nothing but the kind can explain the difference. This is 4d-ii's
-- shape exactly, where waste records unconditionally and a sale is refused.
--
-- ⚠️ IT IS CHEAP TO REVERSE. A function body is a `create or replace` in a new
-- migration with no data to migrate — the deadline docs/PLAN.md records for every
-- open question of this kind.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ DECIDED HERE ON THE OWNER'S BEHALF
-- ----------------------------------------------------------------------------
-- 3. **`location_id` HAS NO FOREIGN KEY, AND THAT IS THE WHOLE POINT OF THE
--    TABLE.** Every other location column in this schema is a composite FK to
--    `location (id, workspace_id)`. Here it must not be. §2.6 names "a variant
--    deleted between capture and flush" among the permanent failures this table
--    exists to catch, and a location deleted between capture and flush is the
--    same event — so a foreign key would REFUSE precisely the report it was added
--    to preserve. `workspace_id` keeps its FK, because §2.6's exception is about
--    the location and only the location: "record_failed_write validates workspace
--    and not location."
--
-- 4. **THE ROW IS NOT IMMUTABLE, unlike every document in `0003`.** Those carry a
--    `before update or delete` trigger raising `restrict_violation`. This one does
--    not, because `replay_failed_write` (`0025`) must mark a row replayed, and a
--    dead letter is not a ledger entry. What protects the LEDGER is unchanged:
--    `stock_movement` keeps its own immutability trigger, and no client holds any
--    grant on this table beyond `select`.
--
-- 5. **THE PAYLOAD IS THE ORIGINAL CALL'S ARGUMENTS, KEYED BY ARGUMENT NAME** —
--    `{"lines": [...], "occurred_at": ..., "recorded_offline": ...}` and whatever
--    else that RPC took. §2.6 says "the original payload as jsonb" and does not
--    say what shape that is; `replay_failed_write` has to RE-RUN THE CALL from it,
--    so anything less than the arguments makes `0025` impossible. The downgrade
--    below reads `payload->'lines'`, which is the same array the RPC took.
--
-- 6. **`record_failed_write` NEVER RAISES FOR A BAD PAYLOAD.** A malformed
--    payload, a deleted variant, a line whose unit no longer resolves — every one
--    of those is a permanent failure, which is to say it is exactly what this
--    function exists to capture. Raising would lose the event for the same reason
--    the write was lost, which is §2.6's argument for the location exception
--    applied one level in. The row lands, the downgrade is BEST-EFFORT per line,
--    and the return value reports how much of it happened. **The workspace check
--    is the only refusal in the body.**
--
--    ⚠️ THIS IS NOT A SOFTENING OF THE LEDGER'S RULES. A line that cannot be
--    downgraded writes NOTHING — no guessed quantity, no zero-quantity movement.
--    The choice is between a dead letter with a partial downgrade and no dead
--    letter at all.
--
-- 7. **IDEMPOTENCY IS THE PRIMARY KEY, AND IT IS WHAT `adjust_stock_delta` DOES
--    NOT HAVE.** `failed_write.id` IS the client uuid of the write that failed, so
--    the second report of one failure collides on the key, returns
--    `already_recorded: true` and — crucially — DOES NOT DOWNGRADE AGAIN. `0023`
--    named this in advance: "a relative write applied twice moves the balance
--    twice, so the key is the caller's." This is the caller, and this is the key.
--
-- 8. **THE TABLE IS OWNER-ONLY, AND IT IS NOT A MERCHANT SCREEN.** §2.8: "Dead
--    letters go to the operator of this system via §2.10's nightly check", which
--    runs vendor-side and bypasses RLS anyway. The policy exists because §2.10's
--    structural row requires one, and it is scoped to `owner` rather than
--    `manager` because `payload` can carry COST for any kind, and §2.7 makes cost
--    manager-and-above at the loosest.
--
-- ----------------------------------------------------------------------------
-- WHY `adjust_stock_delta` IS DROPPED AND RECREATED RATHER THAN REPLACED
-- ----------------------------------------------------------------------------
-- It needs an eighth argument, and `create or replace function` CANNOT change a
-- signature — it would create an OVERLOAD, leaving the seven-argument version
-- standing and able to write downgrade movements with no link, which the new
-- constraint would then refuse at a confusing distance from the cause.
--
-- ⚠️ THE DROP IS FREE, AND `0023`'s DECISION 1 IS WHY. Nothing depends on that
-- signature: it is granted to NOBODY, no view selects it, no other function calls
-- it, and no client can have shipped against it. The decision to grant it to
-- nobody paid for itself one migration later.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. failed_write  (ADR-035 §2.6 *Rejected writes*)
-- ----------------------------------------------------------------------------

create table public.failed_write (
  -- ⚠️ THE CLIENT UUID OF THE WRITE THAT FAILED, not a fresh id. This is the
  -- idempotency key — see the header, decision 7.
  id            uuid primary key,

  workspace_id  uuid not null references public.workspace (id) on delete restrict,

  -- ⚠️ NO FOREIGN KEY. Header, decision 3. Nullable too: a write rejected before
  -- it named a location is still a write that was lost.
  location_id   uuid,

  kind          text not null,

  payload       jsonb not null,
  error_code    text not null,
  error_detail  text,

  failed_at     timestamptz not null default now(),
  recorded_at   timestamptz not null default now(),

  reported_by   uuid not null references auth.users (id),

  constraint failed_write_kind_known
    check (kind in ('purchase', 'sale', 'waste', 'transfer')),
  constraint failed_write_error_code_not_blank
    check (btrim(error_code) <> ''),
  constraint failed_write_error_detail_not_blank
    check (error_detail is null or btrim(error_detail) <> ''),
  -- The payload has to be an OBJECT, because decision 5 says it is the argument
  -- list. A bare array would be one RPC's lines and `0025` could not replay it.
  constraint failed_write_payload_is_object
    check (jsonb_typeof(payload) = 'object')
);

create index failed_write_by_workspace_time_idx
  on public.failed_write (workspace_id, failed_at desc);

-- §2.10's nightly check counts dead letters and prices the unrecorded revenue.
-- It reads by kind and by recency, not by id.
create index failed_write_by_kind_idx
  on public.failed_write (workspace_id, kind, failed_at desc);

comment on table public.failed_write is
  'Permanently rejected client writes — the dead-letter table of ADR-035 §2.6. A '
  'row here means a thing happened in the shop and no document records it. ⚠️ '
  'location_id deliberately has NO foreign key: a location deleted between '
  'capture and flush is one of the failures this table exists to catch, and an FK '
  'would refuse the report for the same reason the write was refused. Keyed by '
  'the CLIENT uuid of the failed write, which is what makes a re-report a no-op '
  'rather than a second downgrade. Not immutable, because replay_failed_write '
  '(0025) must mark a row replayed. §2.8: this is a VENDOR surface, not a '
  'merchant screen.';

comment on column public.failed_write.payload is
  'The original call''s arguments, keyed by argument name — {"lines": [...], '
  '"occurred_at": ...}. Not just the lines: replay_failed_write (0025) has to '
  're-run the call from this, so anything less makes replay impossible. ADR-035 '
  '§2.6, and 0024''s header decision 5.';


-- ----------------------------------------------------------------------------
-- 2. RLS, policy and grants  (ADR-035 §2.7, §2.8, and 3.1's finding)
-- ----------------------------------------------------------------------------
-- ⚠️ THE `revoke` IS NOT BOILERPLATE. `alter default privileges` on this project
-- grants TRUNCATE, REFERENCES, TRIGGER and MAINTAIN to anon, authenticated and
-- service_role on every table created in `public` — Supabase's default, set by no
-- migration here. TRUNCATE IGNORES ROW-LEVEL SECURITY ENTIRELY. The twenty
-- applied tables are clean only because every migration revokes before it grants,
-- and 3.1 put F9/F10 in the coverage suite to stop the first one that forgets.

alter table public.failed_write enable row level security;

revoke all on public.failed_write from anon, authenticated;

-- Owner-only, and header decision 8 is the argument. The workspace prefix is
-- redundant beside has_role and is kept anyway — §2.7's "one uniform prefix is
-- what makes the shape safe to copy without thinking about it".
create policy failed_write_select on public.failed_write
  for select to authenticated
  using (workspace_id in (select public.my_workspaces())
     and public.has_role(workspace_id, 'owner'));

grant select on public.failed_write to authenticated;


-- ----------------------------------------------------------------------------
-- 3. The link, reversed  (AMENDMENT 1)
-- ----------------------------------------------------------------------------

alter table public.stock_movement
  add column failed_write_id uuid references public.failed_write (id) on delete restrict;

-- §2.6's "not optional", as a constraint. See the header, amendment 1, including
-- why this is `is not distinct from` and not `=`.
alter table public.stock_movement
  add constraint stock_movement_downgrade_names_its_dead_letter
  check ((adjustment_reason is not distinct from 'failed_write_downgrade')
         = (failed_write_id is not null));

create index stock_movement_by_failed_write_idx
  on public.stock_movement (failed_write_id)
  where failed_write_id is not null;

comment on column public.stock_movement.failed_write_id is
  'The dead letter this downgrade answers to (ADR-035 §2.6, as amended '
  '2026-09-05). ⚠️ 0004:320 says this link lives on the failed_write row and NOT '
  'here; that comment predates the amendment and is wrong — a downgrade writes '
  'one movement per line and per lot, so a singular column on the other side '
  'could not describe it, and replay_failed_write would under-compensate. '
  'Constrained both ways by stock_movement_downgrade_names_its_dead_letter.';


-- ----------------------------------------------------------------------------
-- 4. adjust_stock_delta(), re-signed  (AMENDMENT 1)
-- ----------------------------------------------------------------------------
-- ⚠️ DROPPED AND RECREATED, NOT REPLACED, and the reason is mechanical: `create
-- or replace function` CANNOT change a signature. An eighth argument would create
-- an OVERLOAD, leaving the seven-argument version standing and able to write
-- downgrade movements with no link — refused by the new constraint at a confusing
-- distance from the cause.
--
-- ⚠️ THE DROP IS FREE BECAUSE `0023` GRANTED IT TO NOBODY. No client can have
-- shipped against the old signature, no view selects it, no function calls it.
-- That decision paid for itself one migration later.
--
-- The body is `0023`'s, unchanged except that all three INSERTs now carry
-- `failed_write_id` and the return value reports it.

drop function public.adjust_stock_delta(uuid, uuid, numeric,
                                        public.adjustment_reason, text,
                                        timestamptz, boolean);

create function public.adjust_stock_delta(
  p_location_id      uuid,
  p_variant_id       uuid,
  p_delta_base       numeric,
  p_reason           public.adjustment_reason,
  p_note             text        default null,
  p_occurred_at      timestamptz default null,
  p_recorded_offline boolean     default false,
  -- ⚠️ THE EIGHTH ARGUMENT, added in `0024`. It is what
  -- `stock_movement_downgrade_names_its_dead_letter` requires: a movement whose
  -- `adjustment_reason` is 'failed_write_downgrade' MUST carry the dead letter it
  -- answers to, and nothing else may. §2.6, as amended 2026-09-05.
  p_failed_write_id  uuid        default null
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
      'failed_write_id',   p_failed_write_id,
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
       unit_cost_net_per_base, occurred_at, created_by, note, adjustment_reason,
       failed_write_id)
    select v_ws, p_location_id, a.batch_id, p_variant_id, 'adjustment',
           -a.qty_base, a.unit_cost_net_per_base, v_at, v_user, v_note, p_reason,
           p_failed_write_id
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
         unit_cost_net_per_base, occurred_at, created_by, note, adjustment_reason,
         failed_write_id)
      values
        (v_ws, p_location_id, v_lot.batch_id, p_variant_id, 'adjustment',
         v_take, v_lot.unit_cost_net_per_base, v_at, v_user, v_note, p_reason,
         p_failed_write_id);

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
         unit_cost_net_per_base, occurred_at, created_by, note, adjustment_reason,
         failed_write_id)
      values
        (v_ws, p_location_id, v_opened, p_variant_id, 'adjustment',
         v_left, 0, v_at, v_user, v_note, p_reason,
         p_failed_write_id);

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
    'failed_write_id',   p_failed_write_id,
    'changed',           true
  );
end;
$$;

comment on function public.adjust_stock_delta(uuid, uuid, numeric,
                                              public.adjustment_reason, text,
                                              timestamptz, boolean, uuid) is
  'Moves a variant''s balance at one location by a SIGNED amount. RELATIVE — the '
  'caller never reads a balance first, which is what makes it safe against a '
  'concurrent sale (ADR-035 §2.6). A negative delta allocates FEFO through '
  'allocate_fefo() and may overdraw, exactly as a sale does; a positive delta '
  'first repays every lot this location has driven negative, at that lot''s own '
  'cost, then opens ONE zero-cost lot for the remainder (0004:429). A delta of '
  'zero writes nothing. ⚠️ p_failed_write_id is REQUIRED when the reason is '
  '''failed_write_downgrade'' and forbidden otherwise — '
  'stock_movement_downgrade_names_its_dead_letter, added in 0024, is what makes '
  '§2.6''s "the link is not optional" a constraint rather than a sentence. '
  '⚠️ NOT GRANTED TO authenticated: it exists for record_failed_write() to call '
  '(§2.6, §3 step 4.5), and §2.7''s manager fence on stock adjustment lives on '
  'the callers — see 0023''s header. No idempotency key of its own: a relative '
  'write applied twice moves the balance twice, so the key is the caller''s '
  'failed_write row. ADR-035 §2.4, §2.5, §2.6, §2.7.';

revoke all on function
  public.adjust_stock_delta(uuid, uuid, numeric, public.adjustment_reason, text,
                            timestamptz, boolean, uuid) from public;


-- ----------------------------------------------------------------------------
-- 5. record_failed_write()  (ADR-035 §2.6 *Rejected writes*)
-- ----------------------------------------------------------------------------
-- ⚠️ THE ARGUMENT LIST IS §2.6's FIVE PLUS TWO, and the two are not optional
-- extras. §2.6's table lists what a function is FOR, not its signature — `0018`
-- through `0023` all append to their rows the same way. `workspace_id` has to be
-- an ARGUMENT because §2.6 says this function VALIDATES it, and you cannot
-- validate something you derived; and it cannot be derived here anyway, because
-- the location it would be derived from may be the very thing that was wrong.
-- `location_id` defaults out of the payload, which is where a client already has
-- it.

create function public.record_failed_write(
  p_id           uuid,
  p_kind         text,
  p_workspace_id uuid,
  p_payload      jsonb,
  p_error_code   text,
  p_error_detail text default null,
  p_location_id  uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user        uuid := auth.uid();
  v_loc         uuid;
  v_inserted    integer := 0;
  v_line        jsonb;
  v_variant     uuid;
  v_qty_base    numeric(14,3);
  v_at          timestamptz;
  v_note        text;
  v_skipped     text;
  v_lines       integer := 0;
  v_done        integer := 0;
  v_failed      integer := 0;
  v_moves       integer := 0;
  v_result      jsonb;
  v_loc_ok      boolean;
begin
  if v_user is null then
    raise exception 'record_failed_write requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- ---- 1. THE ONE DELIBERATE EXCEPTION  (§2.6) -----------------------------
  -- ⚠️⚠️ WORKSPACE, AND *NOT* LOCATION. This is the single asymmetry in the whole
  -- write surface and §2.6 puts it on the §2.10 review checklist beside the
  -- location statement:
  --
  --     "record_failed_write validates workspace and not location, because the
  --      commonest reason a write is permanently rejected is that the caller's
  --      location access was wrong — and a function that refuses the report for
  --      the same reason it refused the write would lose exactly the events it
  --      exists to capture."
  --
  -- Every other RPC on this surface opens with `p_location_id not in (select
  -- public.my_locations())`. This one MUST NOT, and a reviewer who "fixes" it has
  -- broken the failure path in its commonest case.
  if p_workspace_id is null
     or p_workspace_id not in (select public.my_workspaces()) then
    raise exception 'workspace not accessible'
      using errcode = '42501';
  end if;

  -- The kind is an argument, not payload, and an unrecognised one cannot be
  -- stored (failed_write_kind_known) or replayed. Refusing it loses nothing that
  -- could ever have been recovered — which is not true of anything inside the
  -- payload, and that difference is decision 6 in the header.
  if p_kind is null or p_kind not in ('purchase', 'sale', 'waste', 'transfer') then
    raise exception 'record_failed_write: kind must be one of purchase, sale, '
                    'waste, transfer — got %', coalesce(p_kind, 'null')
      using errcode = '22023';
  end if;

  if p_id is null then
    raise exception 'record_failed_write: id is required — it is the client uuid '
                    'of the write that failed, and it is what stops a re-report '
                    'downgrading the shelf twice'
      using errcode = '22023';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'record_failed_write: payload must be a json OBJECT — the '
                    'original call''s arguments, keyed by argument name, because '
                    'replay_failed_write has to re-run the call from it'
      using errcode = '22023';
  end if;

  if p_error_code is null or btrim(p_error_code) = '' then
    raise exception 'record_failed_write: error_code is required'
      using errcode = '22023';
  end if;

  -- ⚠️ A SAFE CAST, NOT `(p_payload->>''location_id'')::uuid`. Header decision 6:
  -- this function does not raise for a malformed payload, and a bad uuid in the
  -- one field the client fills in automatically would otherwise lose the event.
  v_loc := coalesce(
    p_location_id,
    case when p_payload->>'location_id' ~
              '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
         then (p_payload->>'location_id')::uuid end);

  -- ---- 2. the dead letter, first  (§2.6 step 1) ----------------------------
  -- ⚠️ `on conflict do nothing` AND THEN CHECK WHETHER THE INSERT HAPPENED —
  -- §2.6's idempotency shape, and here it is load-bearing for the LEDGER and not
  -- only for the row: `adjust_stock_delta` has no key of its own, so a second
  -- report of one failure that fell through to the downgrade would move the shelf
  -- a second time. The key is the caller's, and this is the caller.
  insert into public.failed_write
    (id, workspace_id, location_id, kind, payload, error_code, error_detail,
     reported_by)
  values
    (p_id, p_workspace_id, v_loc, p_kind, p_payload, btrim(p_error_code),
     nullif(btrim(coalesce(p_error_detail, '')), ''), v_user)
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object(
      'failed_write_id',   p_id,
      'already_recorded',  true,
      'downgraded',        false,
      'downgrade_skipped', 'already_recorded',
      'movement_count',    0
    );
  end if;

  -- ---- 3. the downgrade  (§2.6 step 2, as amended — see AMENDMENT 2) -------
  -- Downgrade the kinds where the stock is GONE and nobody will re-enter it.
  -- A rejected purchase leaves stock ON the shelf with a manager holding the
  -- delivery note; upgrading it would invent a zero-cost lot and then double the
  -- shelf when Comprar records the delivery properly.
  if p_kind not in ('sale', 'waste') then
    v_skipped := 'kind_not_downgraded';
  else
    -- ⚠️ THE LOCATION IS CHECKED HERE AND NOT AT THE TOP, and the difference is
    -- the whole design. The ROW does not need location access — that is §2.6's
    -- exception. The MOVEMENTS do: stock cannot be moved at a store the caller
    -- has no access to, and `adjust_stock_delta` would refuse every line anyway.
    -- Asking once is clearer than catching the same 42501 n times.
    select v_loc is not null and v_loc in (select public.my_locations())
      into v_loc_ok;

    if not v_loc_ok then
      v_skipped := 'location_not_accessible';
    elsif jsonb_typeof(p_payload->'lines') <> 'array' then
      v_skipped := 'no_lines_in_payload';
    end if;
  end if;

  if v_skipped is null then
    v_note := format('downgrade of a rejected %s (%s)', p_kind, btrim(p_error_code));

    for v_line in select * from jsonb_array_elements(p_payload->'lines')
    loop
      v_lines := v_lines + 1;

      -- ⚠️ ONE SUBTRANSACTION PER LINE. An `exception` block in plpgsql is a
      -- savepoint, which is exactly what decision 6 needs: a line naming a
      -- variant that was deleted between capture and flush — §2.6's own example
      -- of a permanent failure — must not roll back the dead letter written
      -- above. The event survives; the arithmetic that cannot be done is not
      -- guessed at.
      begin
        v_variant  := null;
        v_qty_base := null;

        -- The conversion is `0016`'s, character for character, including the
        -- cross-dimension refusal (`u.base_code <> pv.base_unit_code`). It has to
        -- be: a downgrade that moved a different quantity from the sale it is
        -- undoing would leave the shelf wrong in a new way. Section 4 of
        -- `supabase/tests/0024` asserts the two agree rather than trusting this
        -- comment — the same variant and quantity, one recorded and one
        -- dead-lettered, moving the same base units.
        select pv.id, round((v_line->>'qty_display')::numeric * u.factor_to_base, 3)
          into v_variant, v_qty_base
          from public.product_variant pv
          join public.unit u
            on u.code = coalesce(nullif(v_line->>'qty_display_unit', ''),
                                 pv.sell_unit_code)
         where pv.id = nullif(v_line->>'variant_id', '')::uuid
           and pv.workspace_id = p_workspace_id
           and u.base_code = pv.base_unit_code;

        if v_variant is null or v_qty_base is null or v_qty_base <= 0 then
          v_failed := v_failed + 1;
        else
          -- ⚠️ `recorded_offline := true` ON A WRITE THAT IS NOT OFFLINE, and it
          -- is deliberate. The flag's only job in `adjust_stock_delta` is to pick
          -- the timestamp basis: trust the supplied time and clamp it to
          -- [now() - 72h, now()]. A dead letter's `occurred_at` IS a
          -- client-supplied time — it came out of the payload — so it gets
          -- exactly the trust §2.6 gives one, and no more. The stock left the
          -- shelf when the sale happened, not when the report arrived, and
          -- `received_at` on any lot this opens is FEFO's second sort key.
          v_at := case when p_payload->>'occurred_at' is not null
                       then (p_payload->>'occurred_at')::timestamptz end;

          v_result := public.adjust_stock_delta(
                        v_loc, v_variant, -v_qty_base,
                        'failed_write_downgrade', v_note, v_at, true, p_id);

          v_done  := v_done + 1;
          v_moves := v_moves + coalesce((v_result->>'movement_count')::integer, 0);
        end if;
      exception when others then
        v_failed := v_failed + 1;
      end;
    end loop;

    if v_lines = 0 then
      v_skipped := 'no_lines_in_payload';
    end if;
  end if;

  return jsonb_build_object(
    'failed_write_id',   p_id,
    'workspace_id',      p_workspace_id,
    'location_id',       v_loc,
    'kind',              p_kind,
    'error_code',        btrim(p_error_code),
    'already_recorded',  false,
    'downgraded',        v_done > 0,
    'downgrade_skipped', v_skipped,
    'lines_total',       v_lines,
    'lines_downgraded',  v_done,
    'lines_failed',      v_failed,
    'movement_count',    v_moves
  );
end;
$$;

comment on function public.record_failed_write(uuid, text, uuid, jsonb, text,
                                               text, uuid) is
  'Dead-letters a permanently rejected client write and downgrades the shelf, in '
  'one transaction (ADR-035 §2.6). ⚠️ VALIDATES WORKSPACE AND NOT LOCATION — the '
  'single deliberate asymmetry in the write surface, because the commonest reason '
  'a write is permanently rejected is that the caller''s location access was '
  'wrong, and refusing the report for the same reason would lose the event. ⚠️ '
  'Downgrades ONLY kind sale and waste, where the stock is gone and nobody will '
  're-enter it; a rejected purchase leaves stock ON the shelf for Comprar to '
  'record properly, and upgrading it would invent a zero-cost lot and then double '
  'the shelf (§2.6 as amended 2026-09-05). ⚠️ Never raises for a bad payload: the '
  'row lands and the downgrade is best-effort per line, because a malformed '
  'payload is exactly the failure this table exists to capture. Keyed by the '
  'CLIENT uuid, which is what stops a re-report moving the shelf twice. §2.6, '
  '§2.7, §2.8, §2.10.';


-- ----------------------------------------------------------------------------
-- 6. Grants  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- ⚠️ `authenticated`, WITH NO ROLE FENCE, AND THAT IS THE POINT. §2.7 fences
-- stock adjustment at manager, and this function moves stock — but the person
-- whose write was just rejected is a CASHIER, and §2.6's exception exists for
-- exactly them. A fence here would refuse the report in its commonest case, which
-- is the same failure as an FK on `location_id`, wearing a different hat. The
-- protection is that the caller cannot choose the quantity, the variant, the
-- reason or the sign: everything this function writes is derived from a payload
-- that a `record_*` function already refused.

revoke all on function
  public.record_failed_write(uuid, text, uuid, jsonb, text, text, uuid) from public;
grant execute on function
  public.record_failed_write(uuid, text, uuid, jsonb, text, text, uuid) to authenticated;
