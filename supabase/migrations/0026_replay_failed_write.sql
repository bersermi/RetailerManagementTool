-- ============================================================================
-- 0026 — replay_failed_write(): compensate the downgrade, re-run the call
--
-- ADR-035 §2.6 (*Rejected writes* and *Replay*), §2.7, §2.8, §2.9, §2.10 (the
-- **replay** row), §3 step 4.5. docs/PLAN.md task 4.5c-ii.
--
-- THE LAST MIGRATION OF THE DATABASE BUILD. Steps 5–7 are the client and ship
-- none, so nothing is downstream of this number.
--
-- §2.6, verbatim:
--
--     Once the root cause is fixed, `replay_failed_write` runs as one
--     transaction — compensate `adjustment_movement_id`, then re-run the
--     original call under its original client uuid — so either the real sale
--     lands with its full revenue and batch attribution, or nothing moves.
--
-- and:
--
--     `replay_failed_write` is **exempt**: it preserves the `occurred_at`
--     already stored on the `failed_write` row, which was clamped at capture.
--
-- ⚠️ THE SECOND SENTENCE IS NOT TRUE OF THE APPLIED SCHEMA, and decision 5
-- below is what this migration does about it. The rest of the file is the first
-- sentence, in order.
--
-- ---------------------------------------------------------------------------
-- DECISIONS
-- ---------------------------------------------------------------------------
-- 1. ⚠️⚠️ THE COMPENSATION IS A REVERSAL MOVEMENT PER DOWNGRADE MOVEMENT, NOT A
--    POSITIVE `adjust_stock_delta`. This is the decision the ADR's own words
--    point away from and the schema points at, so it is first.
--
--    §2.6 says the downgrade goes through `adjust_stock_delta`, and the obvious
--    reading is that undoing it is the same call with the sign flipped. It is
--    not, and the reason is BATCH ATTRIBUTION — the thing §2.6 says replay
--    exists to recover:
--
--      `adjust_stock_delta`'s positive branch repays lots that are NEGATIVE and
--      then opens ONE ZERO-COST LOT for the remainder (`0024`, phase two). A
--      downgrade that merely took a lot from 10 to 7 drove nothing negative, so
--      a +3 delta would repay nothing, invent a zero-cost lot of 3, and leave it
--      standing after the replayed sale allocated FEFO out of the ORIGINAL lot.
--      The shelf total would be right and the ledger would carry a phantom lot
--      at 100% margin — §2.9's exact complaint about a downgrade, reintroduced
--      by the thing meant to remove it.
--
--    `0004` already carries the right instrument and names this function while
--    doing it: `reversal_of_movement_id`, an FK pinned to the SAME BATCH, with a
--    unique index (`stock_movement_one_reversal_idx`) whose comment reads *"this
--    stops anything writing two compensating MOVEMENTS … adjust_stock_delta and
--    replay_failed_write are not documents at all."* So the compensation is
--    `void_transaction`'s idiom (`0021` §7) applied to a set of movements that
--    has no document: one inverse row per downgrade movement, same batch, same
--    cost, naming the movement it cancels.
--
--    ⚠️ AND THAT MAKES "COMPENSATE EXACTLY ONCE" A CONSTRAINT RATHER THAN A
--    FLAG. The unique index refuses a second reversal of the same movement, so
--    even a caller that got past the `replayed_at` guard below could not double
--    the credit. Decision 3's guard is the message; this is the enforcement.
--
-- 2. ⚠️⚠️ EACH COMPENSATION CARRIES THE `occurred_at` OF THE MOVEMENT IT
--    CANCELS, NOT `now()`. `void_transaction` dates its compensating movements
--    `now()` and is right to: a void is a NEW EVENT — someone at the counter
--    decided, today, to reverse a sale. A downgrade is not an event at all. It
--    is a stand-in for one, written by `record_failed_write` and dated with the
--    payload's own time on the explicit ground that *"the stock left the shelf
--    when the sale happened, not when the report arrived"* (`0024`).
--
--    Dating its removal today would say stock came back today that never left
--    today: §2.9's velocity and every daily total read `occurred_at`, so the
--    pair would show a hole on the day of the sale and a bump on the day of the
--    recovery, and the replayed sale would land on top of the hole. Dated with
--    the movement it cancels, the pair is a no-op in every time-sliced read and
--    the replayed document is the only thing left standing. `recorded_at` still
--    takes `now()` and is what audit reads — the same split §2.6 draws between
--    the two columns everywhere else.
--
-- 3. ⚠️ A REPLAYED ROW REPLAYS ONCE, AND A SECOND CALL RETURNS RATHER THAN
--    RAISES. `failed_write` gains `replayed_at` / `replayed_by` /
--    `replay_result`, the row is taken `for update` before anything is written,
--    and a row already stamped returns `already_replayed: true` with the stamp
--    it already carries. That is `record_failed_write`'s `already_recorded`
--    shape (`0024` decision 7) and §2.6's idempotency shape generally: the
--    second call of a manual operation is a re-read, not an error.
--
-- 4. ⚠️⚠️ THE FENCE IS `owner`, WHICH IS TIGHTER THAN THE MARKER'S `manager`
--    (`0025` decision 3), AND IT IS TAKEN ON THE OWNER'S BEHALF. §2.6 describes
--    the replayer as someone who *"has already reviewed the dead-letter row and
--    decided deliberately that it should go back in the books"* — and `0024`
--    decision 8 makes that review OWNER-ONLY, because `payload` can carry cost
--    for any kind and §2.7 puts cost at manager-and-above at the loosest. A
--    manager-fenced replay would therefore be a decision taken, by design, on a
--    row the decider cannot read.
--
--    `0025`'s own argument settles the direction: *"removing a fence later
--    breaks nothing and adding one after a client ships is a coordinated
--    release."* Loosening this to `manager` is a `create or replace` in a new
--    migration; tightening it after Números grows a dead-letter screen is not.
--    ⚠️ The recorders' `manager` fence is UNCHANGED and still does its own job —
--    it fences the ARGUMENT, which a client can pass without this function.
--
-- 5. ⚠️⚠️ THE PRESERVED `occurred_at` IS RECOMPUTED AT CAPTURE TIME, BECAUSE
--    §2.6's "clamped at capture" IS NOT TRUE OF THE APPLIED TABLE. This is the
--    one place this migration does more than the ADR sentence says, and it is
--    doing it to make that sentence true rather than to depart from it.
--
--    `failed_write` has NO `occurred_at` column (`0024`). What it stores is the
--    PAYLOAD, and the payload is the client's own arguments, unclamped and
--    unvalidated — `record_failed_write` deliberately never raises for a bad
--    one. So a till with a broken clock queues a sale dated 2099, the write is
--    rejected, the payload keeps 2099, and a replay that preserved it "verbatim"
--    would write a sale dated 2099 — a figure NO ordinary path in this database
--    can produce, since both branches of every recorder would have overridden or
--    clamped it. The exemption would have become a hole.
--
--    So this function computes the timestamp the ORIGINAL CALL WOULD HAVE
--    WRITTEN, evaluated at `failed_at` instead of at `now()` — the two branches
--    of `0017:168`, one instant moved:
--
--      online  (payload `recorded_offline` absent or false) → `failed_at`.
--               §2.6: the server OVERRIDES online, a till's clock is not worth
--               trusting, and the moment of the attempt is `failed_at`.
--      offline (payload `recorded_offline` true) → the payload's `occurred_at`
--               clamped to `[failed_at − 72h, failed_at]`, defaulting to
--               `failed_at` when absent. Identical to what `record_sale` would
--               have written, and identical to what the DOWNGRADE movements
--               already carry, since `0024` passes the same value with
--               `recorded_offline := true`.
--
--    ⚠️ THIS IS STILL THE EXEMPTION AND NOT A RE-DATING. Nothing here is moved
--    to the moment of RECOVERY, which is the harm §2.6 names; a dead letter
--    three months old replays three months old. The clamp is anchored to when
--    the failure was reported, and `now()` appears nowhere in it.
--
-- 6. ⚠️ `recorded_offline := false` ON EVERY REPLAY CALL, so ENFORCEMENT APPLIES.
--    §2.6 lets an offline write skip the availability check because the sale
--    already happened at a till that could not ask this database anything. A
--    replay is the opposite situation: it is a server-side write, made now, by
--    an owner who is looking at the row. Passing `true` would carry the original
--    payload's offline-ness onto a document that was never queued on a device
--    AND would silently disable `0017` — which is the check that makes decision
--    7's ordering falsifiable at all. The original's offline-ness stays where it
--    is auditable, in the payload of the dead letter this document names.
--
-- 7. ⚠️⚠️ COMPENSATE, THEN RE-RUN, AND THE ORDER IS LOAD-BEARING RATHER THAN
--    NARRATIVE. `0017`'s availability check refuses a sale the shelf cannot
--    cover when enforcement is on — and after a downgrade the shelf is short by
--    exactly the sale's quantity. A replay that re-ran the call first would be
--    refused by `0017` in precisely the case it exists to recover. §2.6 writes
--    the two steps in this order and this is why.
--
-- 8. ⚠️ THE DISPATCH READS `failed_write.kind`, NEVER THE PAYLOAD. `0025` made
--    each recorder check that the dead letter it is handed is of ITS kind
--    (`22023`, loud) — so dispatching on anything else here would meet a refusal
--    this function caused itself. `kind` is also the column
--    `failed_write_kind_known` constrains, and the payload is not constrained at
--    all.
--
-- 9. ⚠️ THE TRANSFER'S MARKER LIVES HERE, AND IT IS THE STAMP. `0025` left this
--    open: §2.4 gives a transfer no document header, so a replayed transfer has
--    nowhere to carry `replay_of_failed_write_id` and §2.10 could not report
--    which transfers were recovered. `replayed_at` answers it for ALL FOUR
--    kinds — it is on the dead letter, which every kind has — and
--    `replay_result` carries the recorder's own return value, which for a
--    transfer holds the `transfer_group_id` that is otherwise named by nothing.
--    No fifth column, and no per-kind column that is redundant for three kinds.
--
-- 10. ⚠️ THE POST-CONDITION IS CHECKED, NOT ASSUMED. After the compensation,
--    `sum(qty_base)` over every movement naming this dead letter must be exactly
--    zero — the downgrade and its reversal are a closed pair by construction. A
--    non-zero sum means a movement was linked to this row by something other
--    than `0024`'s downgrade, and continuing would re-record a sale on top of
--    stock that was never restored. It raises `internal_error` and the whole
--    transaction goes, which is §2.6's *"or nothing moves"*.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS CONSIDERED AND REFUSED
-- ---------------------------------------------------------------------------
-- ⚠️ A NEW `adjustment_reason` VALUE FOR THE COMPENSATION, so §2.10 could tell a
--    downgrade from its undoing. REFUSED, and it is refused by a constraint
--    rather than by taste: `stock_movement_downgrade_names_its_dead_letter`
--    (`0024`) says a movement carries `failed_write_id` IF AND ONLY IF its
--    reason is `failed_write_downgrade`, so a compensation under any other
--    reason could not name the dead letter it is undoing, and the link §2.6
--    calls "not optional" would break on the row that closes it. The pair is
--    already distinguishable without a new value — `reversal_of_movement_id` is
--    null on the downgrade and set on its compensation — and that is the same
--    reading `void_transaction` gives.
--
-- ⚠️ DELETING THE `failed_write` ROW ONCE REPLAYED. REFUSED. §2.10's dead-letter
--    report prices unrecorded revenue and has to be able to say a row was
--    RECOVERED, not merely that it is gone; and `stock_movement.failed_write_id`
--    is `on delete restrict`, so the compensation this function writes would
--    refuse the delete anyway — at a confusing distance from the cause.
--
-- ⚠️ AN AUTOMATIC REPLAY SWEEP over every fixed dead letter. REFUSED by §2.6 in
--    terms: *"Replay is manual, never automatic … one row at a time, triggered
--    by an operator who has seen the peso figure first."* One argument, one row.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The stamp  (decisions 3 and 9)
-- ----------------------------------------------------------------------------
-- ⚠️ THIS IS AN `alter table` ON A TABLE THAT TAKES UPDATES, and that is only
-- legal because `0024` decision 4 said so in advance: `failed_write` carries no
-- immutability trigger, unlike every document in `0003`, precisely so this
-- function can stamp it. The LEDGER's append-only guarantee is untouched —
-- `stock_movement` keeps its own trigger, and this migration writes movements by
-- INSERT only.

alter table public.failed_write
  add column replayed_at  timestamptz,
  add column replayed_by  uuid references auth.users (id),
  add column replay_result jsonb;

-- The three move together or not at all. A row with a time and no author is a
-- stamp nobody can be asked about, and a result with no time is a replay that
-- did not happen.
alter table public.failed_write
  add constraint failed_write_replay_stamp_is_whole
  check ((replayed_at is null) = (replayed_by is null)
     and (replayed_at is null) = (replay_result is null));

-- §2.10's dead-letter report asks the pile "what is still unrecovered", which is
-- this predicate and not its complement.
create index failed_write_unreplayed_idx
  on public.failed_write (workspace_id, kind, failed_at desc)
  where replayed_at is null;

comment on column public.failed_write.replayed_at is
  'When replay_failed_write (0026) recovered this dead letter, or null while it '
  'stands. ⚠️ THIS IS THE ONLY MARKER A REPLAYED *TRANSFER* HAS: §2.4 gives a '
  'transfer no document header, so sale/purchase/waste carry '
  'replay_of_failed_write_id (0025) and a transfer carries nothing — the record '
  'that it was recovered lives here, on the row every kind has. Also the '
  'idempotency guard: a stamped row returns already_replayed rather than '
  'compensating a second time.';

comment on column public.failed_write.replay_result is
  'The recorder''s own return value from the replay, verbatim (ADR-035 §2.6, '
  '0026). Redundant for sale, purchase and waste, whose document id is this '
  'row''s id — kept because for a TRANSFER it holds the transfer_group_id, and '
  '§2.4 gives that group no other name.';


-- ----------------------------------------------------------------------------
-- 2. replay_failed_write()  (ADR-035 §2.6 *Replay*)
-- ----------------------------------------------------------------------------
-- One argument, exactly as §2.6's table writes it. Everything else is read from
-- the row, because everything else IS the row: the kind, the payload, the
-- location, the time, and the movements to undo.

create function public.replay_failed_write(p_failed_write_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_now      timestamptz := now();
  v_fw       public.failed_write%rowtype;
  v_pay_at   timestamptz;
  v_offline  boolean;
  v_at       timestamptz;
  v_lines    jsonb;
  v_loc      uuid;
  v_to_loc   uuid;
  v_prov     uuid;
  v_note     text;
  v_comp     integer := 0;
  v_net      numeric(14,3);
  v_result   jsonb;
begin
  if v_user is null then
    raise exception 'replay_failed_write requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  if p_failed_write_id is null then
    raise exception 'replay_failed_write: failed_write_id is required — replay '
                    'is one row at a time, triggered by an operator who has seen '
                    'the peso figure first (ADR-035 §2.6)'
      using errcode = '22023';
  end if;

  -- ---- 1. the dead letter, LOCKED  (decision 3) ----------------------------
  -- ⚠️ `for update` BEFORE ANYTHING IS READ OFF IT, and it is not ceremony. Two
  -- operators clicking replay on the same row would otherwise both read
  -- `replayed_at is null`, both compensate, and the second would be stopped only
  -- by `stock_movement_one_reversal_idx` — a 23505 with no message about what
  -- actually happened. The lock makes the second call wait and then take the
  -- `already_replayed` branch, which is what it is.
  --
  -- ⚠️ AND THE WORKSPACE PREDICATE IS IN THE `where`, so a dead letter belonging
  -- to another tenant is INDISTINGUISHABLE from one that does not exist. `0021`'s
  -- reasoning: `failed_write` is one table across every tenant and the id is a
  -- client uuid, so a caller must not be able to probe another tenant's ids.
  select fw.* into v_fw
    from public.failed_write fw
   where fw.id = p_failed_write_id
     and fw.workspace_id in (select public.my_workspaces())
   for update;

  if not found then
    raise exception 'replay_failed_write: dead letter % not found or not '
                    'accessible', p_failed_write_id
      using errcode = '42501';
  end if;

  -- ---- 2. the fence  (decision 4) -----------------------------------------
  -- OWNER, not manager. §2.6's replayer has "already reviewed the dead-letter
  -- row", and `0024` decision 8 makes that review owner-only because `payload`
  -- can carry cost for any kind. `TD003` is this project's spelling of a role
  -- refusal (`0021`, `0022`, `0025`).
  if not public.has_role(v_fw.workspace_id, 'owner') then
    raise exception 'replay_failed_write: only an owner may replay a dead letter '
                    '(ADR-035 §2.6 — replay is a deliberate decision taken on a '
                    'row only an owner may read, 0024 decision 8)'
      using errcode = 'TD003';
  end if;

  -- ---- 3. already replayed?  (decision 3) ---------------------------------
  if v_fw.replayed_at is not null then
    return jsonb_build_object(
      'failed_write_id',       v_fw.id,
      'kind',                  v_fw.kind,
      'already_replayed',      true,
      'replayed_at',           v_fw.replayed_at,
      'replayed_by',           v_fw.replayed_by,
      'compensated_movements', 0,
      'result',                v_fw.replay_result
    );
  end if;

  -- ---- 4. the payload's shape ---------------------------------------------
  -- ⚠️ THIS FUNCTION RAISES WHERE `record_failed_write` DOES NOT, and the
  -- difference is which way the loss runs. `0024` never raises for a bad payload
  -- because refusing the REPORT loses the event for the same reason the write
  -- was lost. Here the event is already safe on the row; refusing loses nothing
  -- and guessing would write a document nobody asked for. §2.6's "or nothing
  -- moves" is the whole contract of this function.
  v_lines := v_fw.payload->'lines';

  if v_lines is null or jsonb_typeof(v_lines) <> 'array'
     or jsonb_array_length(v_lines) = 0 then
    raise exception 'replay_failed_write: dead letter % has no lines to replay — '
                    'the payload is the original call''s arguments (0024 '
                    'decision 5) and a call with no lines is not one of them',
                    v_fw.id
      using errcode = '22023';
  end if;

  -- ---- 5. the preserved occurred_at  (decision 5) -------------------------
  -- The two branches of `0017:168`, evaluated at `failed_at` rather than at
  -- `now()`. See the header: `failed_write` stores no clamped timestamp, only
  -- the client's own unvalidated one, so "preserve what was clamped at capture"
  -- has to be COMPUTED here or it is not true at all.
  --
  -- ⚠️ A GUARDED CAST, IN ITS OWN SUBTRANSACTION. The payload is client text
  -- that `0024` accepted without validating — `"occurred_at": "yesterday"` is
  -- exactly the malformed payload that table exists to keep — so an unparseable
  -- value must not surface as a bare 22P02 whose message names neither this
  -- function nor that column. `0024` uses a regex for the same reason on the one
  -- field it reads; a timestamp has no regex worth trusting, so the cast is
  -- attempted and caught. The `exception` block is a savepoint, which is safe
  -- here because nothing has been written yet.
  if v_fw.payload->>'occurred_at' is not null then
    begin
      v_pay_at := (v_fw.payload->>'occurred_at')::timestamptz;
    exception when others then
      raise exception 'replay_failed_write: dead letter % carries an occurred_at '
                      'that is not a timestamp (%) — replay preserves the '
                      'original time and will not invent one (ADR-035 §2.6)',
                      v_fw.id, v_fw.payload->>'occurred_at'
        using errcode = '22023';
    end;
  end if;

  v_offline := coalesce((v_fw.payload->>'recorded_offline')::boolean, false);

  if v_offline then
    v_at := greatest(least(coalesce(v_pay_at, v_fw.failed_at), v_fw.failed_at),
                     v_fw.failed_at - interval '72 hours');
  else
    -- §2.6: the server overrides online. The moment of the attempt is
    -- `failed_at`, and it is emphatically not `now()`.
    v_at := v_fw.failed_at;
  end if;

  -- ---- 6. compensate  (decisions 1, 2, 7 and 10) --------------------------
  -- One inverse movement per downgrade movement, on the SAME BATCH, at the SAME
  -- COST, naming the movement it cancels. `stock_movement_sign_follows_reason`
  -- steps aside because `reversal_of_movement_id` is set;
  -- `stock_movement_reversal_fk` pins the batch; `stock_movement_one_reversal_idx`
  -- makes a second one impossible.
  --
  -- ⚠️ `adjustment_reason` AND `failed_write_id` ARE COPIED, NOT CHOSEN.
  -- `stock_movement_downgrade_names_its_dead_letter` (`0024`) is an IFF: only a
  -- 'failed_write_downgrade' may name a dead letter, and one must. The
  -- compensation is part of that link, not a separate kind of write — see the
  -- header's refused alternative.
  --
  -- ⚠️ `reversal_of_movement_id is null` IS WHAT KEEPS THIS FROM EATING ITS OWN
  -- OUTPUT: the rows written here carry the link too, and would otherwise be
  -- candidates for compensation on a second pass.
  --
  -- A `purchase` or a `transfer` dead letter matches nothing here and writes
  -- nothing — `0024` amendment 2 downgrades only `sale` and `waste`, because the
  -- stock is still on the shelf for the other two. That is not a special case in
  -- this function; it is zero rows.
  v_note := format('replay of dead letter %s — the downgrade, undone (ADR-035 '
                   '§2.6)', v_fw.id);

  insert into public.stock_movement
    (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
     unit_cost_net_per_base, occurred_at, created_by, note, adjustment_reason,
     failed_write_id, reversal_of_movement_id)
  select sm.workspace_id, sm.location_id, sm.batch_id, sm.variant_id,
         sm.reason, -sm.qty_base, sm.unit_cost_net_per_base,
         -- decision 2: the movement's OWN time, so the pair nets to nothing in
         -- every read that slices by occurred_at.
         sm.occurred_at, v_user, v_note, sm.adjustment_reason,
         sm.failed_write_id, sm.id
    from public.stock_movement sm
   where sm.failed_write_id = v_fw.id
     and sm.reversal_of_movement_id is null;

  get diagnostics v_comp = row_count;

  -- decision 10. The downgrade and its compensation are a closed pair, so the
  -- units this dead letter has moved must now be exactly zero. Anything else and
  -- the shelf is not where the replayed call is about to assume it is.
  select coalesce(sum(sm.qty_base), 0) into v_net
    from public.stock_movement sm
   where sm.failed_write_id = v_fw.id;

  if v_net <> 0 then
    raise exception 'replay_failed_write: the movements naming dead letter % '
                    'still net % base units after compensating % of them — a '
                    'replay cannot re-record a write over stock it has not '
                    'restored (ADR-035 §2.6)', v_fw.id, v_net, v_comp
      using errcode = 'internal_error';
  end if;

  -- ---- 7. re-run the original call  (decisions 6, 7 and 8) ----------------
  -- ⚠️ UNDER THE ORIGINAL CLIENT UUID, which is §2.6's phrase and also the only
  -- thing that makes this safe to retry: the recorders are idempotent on `p_id`,
  -- so a dead letter whose write LATER succeeded on its own replays to
  -- `already_recorded` and writes no second document — while the compensation
  -- above still corrects the shelf the downgrade shortened. That case is real:
  -- a membership fixed between the failure and the replay is exactly §2.6's
  -- `42501`.
  --
  -- ⚠️ THE LOCATION COMES FROM THE ROW, NOT THE PAYLOAD, for sale, purchase and
  -- waste. `record_failed_write` already resolved it (argument first, payload
  -- second) and stored the answer; re-deriving it here would be a second source
  -- of truth that can disagree with the movements already written above.
  v_loc := v_fw.location_id;

  if v_fw.kind in ('sale', 'purchase', 'waste') and v_loc is null then
    raise exception 'replay_failed_write: dead letter % names no location — a '
                    'write that was rejected before it named a store has no '
                    'store to be replayed into (ADR-035 §2.6)', v_fw.id
      using errcode = '22023';
  end if;

  if v_fw.kind = 'sale' then
    v_result := public.record_sale(
                  v_fw.id, v_loc, v_lines, v_at, false, v_fw.id);

  elsif v_fw.kind = 'waste' then
    v_result := public.record_waste(
                  v_fw.id, v_loc, v_lines, v_at, false, v_fw.id);

  elsif v_fw.kind = 'purchase' then
    -- The provider is the one argument of `record_purchase` that lives nowhere
    -- but the payload. A malformed one is refused here rather than cast, for the
    -- reason given at `occurred_at` above.
    if coalesce(v_fw.payload->>'provider_id', '') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then
      raise exception 'replay_failed_write: dead letter % carries no usable '
                      'provider_id (%) — a delivery is recorded against a '
                      'provider (ADR-035 §2.4)',
                      v_fw.id, v_fw.payload->>'provider_id'
        using errcode = '22023';
    end if;

    v_prov := (v_fw.payload->>'provider_id')::uuid;

    v_result := public.record_purchase(
                  v_fw.id, v_loc, v_prov, v_lines, v_at, false, v_fw.id);

  else
    -- ⚠️ A TRANSFER'S TWO LOCATIONS ARE BOTH IN THE PAYLOAD AND NEITHER IS
    -- `failed_write.location_id`. `record_failed_write` reads `location_id` from
    -- the payload, and a transfer's arguments have no such key (`0020`), so the
    -- row's column is null for this kind and the payload is the only source.
    if coalesce(v_fw.payload->>'from_location_id', '') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or coalesce(v_fw.payload->>'to_location_id', '') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then
      raise exception 'replay_failed_write: dead letter % does not name both '
                      'ends of the transfer (from %, to %) — §2.4 gives a '
                      'transfer no document, so the payload is the only record '
                      'of where the van went',
                      v_fw.id, v_fw.payload->>'from_location_id',
                      v_fw.payload->>'to_location_id'
        using errcode = '22023';
    end if;

    v_loc    := (v_fw.payload->>'from_location_id')::uuid;
    v_to_loc := (v_fw.payload->>'to_location_id')::uuid;

    -- ⚠️ `record_transfer` TAKES THE MARKER AND STORES NOTHING (`0025` decision
    -- 5). It is passed anyway, and not as ceremony: it is what makes the
    -- function take its replay TIMESTAMP branch, and `v_at` stamps `received_at`
    -- on every lot opened at the destination, which is that store's FEFO
    -- tiebreak (`0020:310`). A re-dated transfer re-orders a shelf.
    v_result := public.record_transfer(
                  v_fw.id, v_loc, v_to_loc, v_lines, v_at, false, v_fw.id);
  end if;

  -- ---- 8. the stamp  (decisions 3 and 9) ----------------------------------
  -- ⚠️ LAST, AND IT IS THE ONLY UPDATE IN THE FAILURE PATH. Everything above can
  -- still raise, and §2.6 says "or nothing moves" — so the row is marked
  -- recovered only once the document that recovers it exists. One transaction:
  -- if the recorder raises, this never runs and the compensation goes with it.
  update public.failed_write
     set replayed_at   = v_now,
         replayed_by   = v_user,
         replay_result = v_result
   where id = v_fw.id;

  return jsonb_build_object(
    'failed_write_id',       v_fw.id,
    'workspace_id',          v_fw.workspace_id,
    'kind',                  v_fw.kind,
    'already_replayed',      false,
    'compensated_movements', v_comp,
    'occurred_at',           v_at,
    'replayed_at',           v_now,
    'replayed_by',           v_user,
    'result',                v_result
  );
end;
$$;

comment on function public.replay_failed_write(uuid) is
  'Recovers one dead letter: compensates the downgrade and re-runs the original '
  'call under its original client uuid, in ONE transaction (ADR-035 §2.6). ⚠️ '
  'The compensation is a REVERSAL MOVEMENT per downgrade movement — same batch, '
  'same cost, dated with the movement it cancels — and NOT a positive '
  'adjust_stock_delta, which would open a zero-cost lot and leave the batch '
  'attribution replay exists to recover in a worse state than the downgrade did '
  '(0026 decision 1). ⚠️ COMPENSATE THEN RE-RUN, in that order: after a '
  'downgrade the shelf is short by the sale''s own quantity, so 0017 would '
  'refuse the very write this recovers. ⚠️ The preserved occurred_at is '
  'RECOMPUTED at failed_at, not read verbatim: failed_write stores no clamped '
  'timestamp, only the client''s unvalidated payload, so a broken till clock '
  'would otherwise replay a sale dated 2099 (decision 5). ⚠️ OWNER only, which '
  'is tighter than the marker''s manager fence (0025) because §2.6''s replayer '
  'has already reviewed a row only an owner may read. ⚠️ Idempotent on '
  'failed_write.replayed_at: a second call returns already_replayed and '
  'compensates nothing. A purchase or transfer dead letter has no downgrade to '
  'compensate (0024 amendment 2) and simply records the document that was lost. '
  '§2.6, §2.7, §2.8, §2.9, §2.10.';


-- ----------------------------------------------------------------------------
-- 3. Grants  (ADR-035 §2.7, and 3.1's finding)
-- ----------------------------------------------------------------------------
-- ⚠️ THE `revoke` IS NOT BOILERPLATE. Postgres grants EXECUTE to PUBLIC by
-- default on every function it creates, so a migration that only `grant`s hands
-- `anon` whatever it just wrote and no line of the file says so. 3.1 found that,
-- `0025` needed it in a fourth place, and this is the fifth.
--
-- Granted to `authenticated` with the role fence in the BODY, exactly as `0021`
-- and `0025` do it: the grant cannot express "owner of the workspace this row
-- belongs to", because the workspace is not known until the row is read.

revoke all on function public.replay_failed_write(uuid) from public;
grant execute on function public.replay_failed_write(uuid) to authenticated;
