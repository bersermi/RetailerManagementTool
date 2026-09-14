-- ============================================================================
-- 0030 — replay_failed_write(): the fence loosened one notch, owner → manager
--
-- ADR-035 §2.6 (*Replay*), §2.7 (the capability table and the role ladder).
-- docs/PLAN.md task 4.6b. The UI/UX grill-me of 2026-09-07, answers C11.2 and
-- C11.4.
--
-- ⚠️ THIS MIGRATION CHANGES ONE PREDICATE AND NOTHING ELSE. The body below is
-- `0026`'s, copied verbatim, with section 2 rewritten. It is spelled out in
-- full because `create or replace function` cannot patch a body — the whole
-- function is the unit of replacement — so a diff against `0026` is the only
-- honest way to read this file, and section 2 is the only hunk in it.
--
-- ---------------------------------------------------------------------------
-- WHY, AND WHOSE DECISION IT IS
-- ---------------------------------------------------------------------------
-- `0026` fenced this function at `owner` and its own header named the exit:
-- *"Loosening this to `manager` is a `create or replace` in a new migration."*
-- This is that migration. It is the owner's ruling and not a session's:
--
--   C11.4 — "the person standing there must be able to fix a failed write."
--   C11.1 — each pilot shop is TWO PEOPLE, and either can be alone in it. The
--           lone employee is the design case, not the exception.
--   C11.2 — that employee is a MANAGER.
--
-- ⚠️ ONE NOTCH IS ENOUGH *BECAUSE OF* C11.2, and that is the whole argument.
-- §2.6's reason for the fence is that the replayer "has already reviewed the
-- dead-letter row and decided deliberately that it should go back in the
-- books" — a reviewer who can carry cost for any kind. A manager can: §2.7's
-- capability table puts *See cost and margin* at manager-and-above. A cashier
-- cannot, and this migration does not give her the call. **The argument for
-- the fence survives; only the notch moves.**
--
-- ---------------------------------------------------------------------------
-- ⚠️⚠️ WHAT THIS MIGRATION DELIBERATELY DOES NOT DO — AND THE ONE THING THAT
-- IS NOW TRUE AND UNCOMFORTABLE
-- ---------------------------------------------------------------------------
-- **`failed_write_select` IS UNTOUCHED. IT IS STILL OWNER-ONLY** (`0024`
-- decision 8, §2.8: "dead letters go to the operator of this system"). So as
-- of this migration **A MANAGER MAY REPLAY A ROW SHE CANNOT READ.**
--
-- That is not an oversight, it is the recorded scope, and it is named here
-- rather than quietly fixed for two reasons:
--
--   (a) `docs/PLAN.md`'s 4.6b row, its 4.6b section and `supabase/README.md`
--       all say the same three words — *one notch*, a `create or replace`. The
--       owner's ruling (C11.4) is about who may CALL this function. Nothing
--       has ruled on who may READ the table, and `0024` decision 8 was a
--       deliberate decision that no later answer has reopened.
--
--   (b) ⚠️ `docs/PLAN.md`'s 4.5c-ii section PREDICTED THE OPPOSITE — written
--       2026-09-05, when the fence was set: *"Recorded for whoever proposes it
--       later: it is TWO changes, the fence AND `failed_write`'s SELECT
--       policy, or the manager replays blind."* That sentence is four days
--       older than C11.4 and it is the minority copy. It is RIGHT about the
--       consequence and it does not get to decide the scope.
--
-- ⚠️ SO THE BLINDNESS IS REAL AND IS THE NEXT DECISION, NOT THIS ONE. There
-- are two spellings of the fix and they are not equivalent:
--
--   1. Loosen `failed_write_select` to `manager`. Cheap, and it exposes
--      nothing §2.7 does not already grant a manager — but it puts a vendor
--      surface (§2.8) inside a merchant's reach permanently.
--   2. A `security definer` read — `my_failed_writes()` or similar — which is
--      the shape this repository already chose for exactly this problem:
--      `my_access_requests()` (`0029`) exists so a joiner can see a row no
--      policy can ever show them, ruled in by the owner 2026-09-13.
--
-- Both belong to step `5c`'s dead-letter banner (C11.9 — "the least invasive
-- thing that works", a banner and not a screen), and `docs/PLAN.md` now
-- carries the choice as an open decision against that step.
--
-- ⚠️ NOTHING ELSE MOVES EITHER:
--   - **`0025`'s replay MARKER stays fenced at `manager`** (its decision 3).
--     `0026` was the tighter of the two; the two fences are now equal, which
--     is what `0025` wrote in the first place.
--   - **The recorders' fences are untouched.** `record_failed_write` has no
--     role fence at all and must not grow one (`0024`: the person whose write
--     was rejected is usually the cashier).
--   - **The §2.6 void exemption is untouched.** A replayed document's void
--     window is still measured from `occurred_at`, which puts it in manager
--     territory — and §2.6's sentence "the only person realistically standing
--     over a freshly replayed sale is already someone who can void it
--     unfenced" is MORE true after this migration, not less: the replayer and
--     the unfenced voider are now the same role.
--
-- ---------------------------------------------------------------------------
-- WHY THE GRANTS ARE RESTATED AT THE BOTTOM
-- ---------------------------------------------------------------------------
-- They do not need to be. `create or replace function` PRESERVES the existing
-- ACL, so `0026`'s revoke/grant still stands and these two lines are no-ops.
-- They are here because a reader of this file should not have to know that to
-- know who may execute the function it replaces — and the suite asserts the
-- ACL rather than trusting either claim (`0030` check 1.2).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. replay_failed_write(), replaced  (ADR-035 §2.6 *Replay*)
-- ----------------------------------------------------------------------------
-- ⚠️ `create or replace`, NOT `drop` + `create`. The signature is unchanged, so
-- there is nothing `0024`'s drop-and-recreate argument applies to — and a drop
-- would take `0026`'s grant with it and silently revoke the function from
-- `authenticated` for as long as it took the next statement to run.

create or replace function public.replay_failed_write(p_failed_write_id uuid)
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

  -- ---- 2. the fence  (0026 decision 4, LOOSENED ONE NOTCH BY 0030) ---------
  -- ⚠️ MANAGER, not owner — and this line is the entire subject of `0030`.
  -- `0026` wrote `'owner'` here and said in its own header that loosening it
  -- was a `create or replace` in a new migration. C11.4 asked for it: the
  -- person standing in the shop must be able to fix a failed write, C11.1 says
  -- that person is alone half the time, and C11.2 says she is a manager.
  --
  -- ⚠️ THE FENCE'S ARGUMENT SURVIVES THE MOVE. §2.6's replayer has reviewed a
  -- row that can carry COST for any kind, and §2.7 puts *See cost and margin*
  -- at manager-and-above. A cashier still cannot call this, which is the half
  -- that was ever load-bearing.
  --
  -- ⚠️⚠️ AND WHAT IS NOW UNCOMFORTABLE IS SAID OUT LOUD RATHER THAN LEFT TO BE
  -- DISCOVERED: `failed_write_select` is STILL owner-only (`0024` decision 8),
  -- so a manager may replay a row she cannot SELECT. That is `5c`'s decision
  -- and this file's header records both spellings of it. A later session
  -- reading this comment and reaching for `failed_write_select` is reaching
  -- for a decision that is the owner's, not a hardening.
  --
  -- `TD003` is this project's spelling of a role refusal (`0021`, `0022`,
  -- `0025`, `0026`), and it is kept so nothing downstream has to re-learn it.
  if not public.has_role(v_fw.workspace_id, 'manager') then
    raise exception 'replay_failed_write: only a manager or an owner may replay '
                    'a dead letter (ADR-035 §2.6 — replay is a deliberate '
                    'decision taken on a row that can carry cost, and §2.7 puts '
                    'cost at manager-and-above; 0030, C11.4)'
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
  'would otherwise replay a sale dated 2099 (0026 decision 5). ⚠️⚠️ MANAGER '
  'and above, LOOSENED FROM OWNER BY 0030 on the owner''s ruling C11.4 — the '
  'person standing in the shop must be able to fix a failed write, and C11.2 '
  'makes that person a manager. The fence''s argument is unchanged: §2.6''s '
  'replayer reviews a row that can carry COST, and §2.7 puts cost at '
  'manager-and-above, so a cashier still cannot call this. ⚠️⚠️ BUT '
  'failed_write_select IS STILL OWNER-ONLY (0024 decision 8), so a manager may '
  'replay a row she cannot SELECT — named in 0030''s header, owed to step 5c''s '
  'dead-letter banner (C11.9), and NOT a thing to fix by quietly widening the '
  'policy. ⚠️ Idempotent on failed_write.replayed_at: a second call returns '
  'already_replayed and compensates nothing. A purchase or transfer dead letter '
  'has no downgrade to compensate (0024 amendment 2) and simply records the '
  'document that was lost. §2.6, §2.7, §2.8, §2.9, §2.10.';


-- ----------------------------------------------------------------------------
-- 2. Grants, restated  (ADR-035 §2.7, and 3.1's finding)
-- ----------------------------------------------------------------------------
-- ⚠️ THESE TWO LINES ARE NO-OPS AND ARE HERE ANYWAY. `create or replace`
-- preserves the ACL, so `0026`'s revoke/grant is still in force and nothing
-- above changed it. They are restated so that this file answers "who may
-- execute the function it ships" without a reader having to know a Postgres
-- rule — and `0030` check 1.2 asserts the ACL from `pg_proc.proacl` rather
-- than trusting either this comment or the statements below it.
--
-- The grant still cannot express the fence. "Manager of the workspace this row
-- belongs to" is not a thing a GRANT can say, because the workspace is not
-- known until the row is read — which is why the fence is in the body, exactly
-- as `0021`, `0025` and `0026` do it.

revoke all on function public.replay_failed_write(uuid) from public;
grant execute on function public.replay_failed_write(uuid) to authenticated;
