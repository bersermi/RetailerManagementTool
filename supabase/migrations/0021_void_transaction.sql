-- ============================================================================
-- 0021 — void_transaction: the compensating document, over all three kinds
-- ============================================================================
-- ADR-035 §2.4 (the ledger), §2.6 (the write path), §2.7 (access and the roles
-- table), docs/PLAN.md task 4e-ii-a.
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * void_transaction(text, uuid, text) — one function
--   * no table, no column, no policy, no view
--
-- THE LAST OF BUILD STEP 4's SIX FUNCTIONS. `0015` fixed receipt completeness;
-- `0016`/`0017` sold; `0018` bought; `0019` wrote off; `0020` transferred. This
-- one undoes any of them, and it is the only one of the six that READS A ROLE.
--
-- ----------------------------------------------------------------------------
-- WHAT A VOID IS HERE
-- ----------------------------------------------------------------------------
-- §2.4: "A void writes compensating movements referencing the original. Nothing
-- is mutated." So this function never updates and never deletes. It writes a
-- SECOND document — negated lines, negated totals, `reversal_of` pointing at the
-- first — and a compensating movement against EVERY movement the original wrote,
-- on the same batch. Afterwards both documents stand in the ledger and the shelf
-- reads what it read before.
--
-- `0003` was built for this and needs nothing added: every header already carries
-- `reversal_of` / `reversal_reason`, every line table's `money_follows_qty` check
-- already admits a negative line, and `<kind>_one_reversal_idx` — a partial
-- unique index on `reversal_of` — already makes a document reversible AT MOST
-- ONCE. `0004` carries `reversal_of_movement_id` with an FK that pins the
-- compensating movement to the SAME batch, and its sign check steps aside when
-- that column is set, so a reversal may carry the opposite sign under the
-- original's own reason. There is deliberately no 'reversal' movement reason: a
-- voided sale is still sale activity.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE FENCE — §2.7, AND IT IS THE ONE THING HERE THAT IS NOT LIKE THE OTHER FIVE
-- ----------------------------------------------------------------------------
-- §2.7's roles table:
--
--     Void own transaction < 15 min   | staff ● | manager ● | owner ● |
--     Void any transaction, any time  | staff — | manager ● | owner ● |
--
-- ⚠️ THE WINDOW IS A ROLE BOUNDARY, NOT A DEADLINE. A manager or an owner voids
-- anything, at any time, and NO window applies to them. Only a staff member is
-- fenced, and by two conditions at once: the document must be theirs AND inside
-- the window.
--
-- docs/PLAN.md said "the void window is enforced in the body" and that was the
-- plan's bug, found while sizing this task on 2026-09-04 and confirmed by the
-- owner before a line of this file was written. Enforced as a bare window this
-- function would refuse a manager's void of a 21-minute-old sale — which §2.7
-- grants in as many words — and would make §2.6's replayed sale permanently
-- uncorrectable, since §2.6 reaches for the compensating-document path PRECISELY
-- BECAUSE the window has already passed. `0001:272` has had the right reading
-- since the foundation migration: "self-service void window. Beyond it, manager
-- role required."
--
-- The "fast void" §2.6 names and never specifies is the UI affordance over this
-- same function, not an eleventh RPC — §2.6's write surface has no other
-- candidate, and `0001:561` says the client reads `void_window_minutes` in order
-- "to render correctly", which is exactly the decision of whether to offer it.
--
-- ⚠️⚠️ AND THE WINDOW READS `recorded_at` ON AN OFFLINE WRITE. This AMENDED
-- ADR-035 §2.6 on 2026-09-04, on the decision maker's instruction, because the
-- pilot store is offline a lot. On a queued write `occurred_at` is the client's
-- time clamped to [now() - 72h, now()], so a sale rung up at 09:00 with no signal
-- and flushed at 14:00 arrives FIVE HOURS PAST a fifteen-minute window: the
-- cashier's window expires before the server ever hears about it, and fixing
-- their own slip needs a manager. That reinstates exactly the friction §2.7
-- spends a paragraph refusing — "friction here converts into staff quietly not
-- recording things, which is the failure mode that destroys the dataset."
--
-- The window measures THE CHANCE TO NOTICE, and nobody can notice a write the
-- server has not yet received. On an online write the two columns carry the same
-- instant anyway (§2.6 overrides `occurred_at` with now()), so this changes
-- nothing there. ⚠️ DAILY TOTALS ARE UNTOUCHED and still read `occurred_at` — a
-- sale counts on the day it was made.
--
-- ----------------------------------------------------------------------------
-- ⚠️ DECIDED HERE, AND CHEAP TO REVERSE ONLY UNTIL A CLIENT BRANCHES ON IT
-- ----------------------------------------------------------------------------
-- 1. `TD003` — a NEW sqlstate for a void refused by the fence. Taken on the
--    owner's behalf 2026-09-04 after the question was offered and delegated.
--    4d-i's rule is that codes are REUSED, not re-invented, and `42501` was the
--    candidate. It is refused HERE for one reason: `42501` already means "this is
--    not your store", which is a bug to report, while "you are past your window,
--    ask your manager" is a WORKFLOW. A till that cannot tell them apart either
--    shows the wrong message or pattern-matches on error text. The location wall
--    below still raises `42501`, unchanged, so the two stay distinguishable.
--
-- 2. ⚠️ IDEMPOTENCY KEYS ON THE ORIGINAL'S ID, AND THERE IS NO `TD001` CASE HERE.
--    The other four write RPCs take a client-generated id and store a
--    `payload_hash`, so "same id, different lines" is a `TD001`. THIS FUNCTION HAS
--    NO CLIENT-SUPPLIED PAYLOAD: every line, every quantity and every peso of the
--    compensating document is derived from the original, so there is nothing a
--    retry could disagree about. `<kind>_one_reversal_idx` already makes the
--    original reversible at most once, which makes the ORIGINAL's id the natural
--    idempotency key — and it is the id the caller already passes. A re-sent void
--    returns `already_recorded` with the reversal that exists.
--    ⚠️ A retry carrying a DIFFERENT `reason` also returns `already_recorded` and
--    the second reason is discarded. It is free text, the stock is already back,
--    and refusing helps nobody. This is the one place a caller could observe a
--    difference from the `TD001` contract, and it is recorded rather than hidden.
--    ⚠️ This keeps §2.6's three-argument signature EXACTLY as written. A fourth
--    argument for the compensating document's own id was available and is not
--    needed; the id is server-generated because nothing depends on the client
--    choosing it.
--
-- 3. ⚠️ A REVERSAL CANNOT ITSELF BE VOIDED. Undoing an undo would re-instate the
--    original, which sounds harmless and is not: `0008`'s price memory excludes
--    "documents that are reversals" and "documents that have been reversed", both
--    exactly ONE level deep, and a chain walks straight past it — a re-instated
--    delivery would go on prefilling a price that the second void cancelled.
--    Refused with `TD003`. Re-recording the document is the supported path.
--
-- 4. ⚠️ NO AVAILABILITY CHECK, AND VOIDING A SOLD-ON PURCHASE MAY DRIVE A BALANCE
--    NEGATIVE. Voiding a delivery takes stock back out of the lots it opened, and
--    those lots may already have been sold from. `0004:429` permits that
--    deliberately, in the same breath as the permitted oversale: "a negative
--    balance is a true statement about a disagreement between the ledger and the
--    shelf, and adjust_stock is how it gets resolved." Refusing here would leave
--    the operator with a delivery they know never happened and no way to say so —
--    the same argument the owner settled for `record_waste` in `0019`.
--
-- 5. THE VOID LANDS ON ITS OWN DAY. `occurred_at` on the compensating document is
--    now(), not the original's. Task 2.2 saw this in the seed and it is correct:
--    the cancellation happened today, and back-dating it would silently move a
--    daily total someone has already read in Números.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS FUNCTION DOES NOT TOUCH
-- ----------------------------------------------------------------------------
-- ✅ `0015`'s receipt-completeness constraint needs NOTHING. Its live-receipt sum
--    already carries `and sm.reversal_of_movement_id is null`, so a compensating
--    receipt does not count against `qty_received_base` and the original lot still
--    balances. 4a wrote that clause for this file before this file existed.
-- ✅ `0008`'s provider price memory needs NOTHING. Both §2.3 exclusions have been
--    applied since 2026-08 (`0008:96-111`) and a void written here satisfies them
--    by construction: the compensating document has `reversal_of` set, and the
--    original now has a row pointing at it.
-- ✅ `batch_balance` needs NOTHING. It is a projection maintained by
--    `stock_movement_project_balance_trg` on every movement insert (`0004`), so
--    the compensating movements move it without a line of code here.
-- ============================================================================


create function public.void_transaction(
  p_kind   text,
  p_id     uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_now       timestamptz := now();
  v_ws        uuid;
  v_loc       uuid;
  v_occurred  timestamptz;
  v_recorded  timestamptz;
  v_offline   boolean;
  v_creator   uuid;
  v_is_rev    boolean;
  v_net       numeric(12,2);
  v_tax       numeric(12,2);
  v_provider  uuid;
  v_existing  uuid;
  v_void_id   uuid;
  v_window    integer;
  v_basis     timestamptz;
  v_hash      text;
  v_lines     integer;
  v_moves     integer;
begin
  -- ---- 1. the arguments ----------------------------------------------------
  if p_kind is null or p_kind not in ('purchase', 'sale', 'waste') then
    raise exception 'void_transaction: kind must be one of purchase, sale, '
                    'waste — got %', coalesce(p_kind, 'null')
      using errcode = '22023';
  end if;

  if p_id is null then
    raise exception 'void_transaction: the id of the document to void is required'
      using errcode = '22023';
  end if;

  if v_user is null then
    raise exception 'void_transaction requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- ---- 2. the document, AND the location wall in the same statement --------
  -- ⚠️ THE WALL CANNOT BE THE FIRST STATEMENT HERE, AND THAT IS NOT A DEPARTURE
  -- FROM §2.6 — it is §2.6 applied to a function that takes no location. The
  -- location is a property of the DOCUMENT, so it has to be read before it can
  -- be checked. Scoping the read itself with my_locations() is what keeps the
  -- two indistinguishable to a caller: a document in another workspace and a
  -- document that does not exist give the SAME answer, so this cannot be used to
  -- probe whether an id exists in someone else's tenant. Fail-closed, and it is
  -- the same reasoning §2.7 gives for my_locations() itself.
  if p_kind = 'purchase' then
    select p.workspace_id, p.location_id, p.occurred_at, p.recorded_at,
           p.recorded_offline, p.created_by, p.reversal_of is not null,
           p.total_net, p.total_tax, p.provider_id
      into v_ws, v_loc, v_occurred, v_recorded,
           v_offline, v_creator, v_is_rev, v_net, v_tax, v_provider
      from public.purchase p
     where p.id = p_id
       and p.location_id in (select public.my_locations());

  elsif p_kind = 'sale' then
    select s.workspace_id, s.location_id, s.occurred_at, s.recorded_at,
           s.recorded_offline, s.created_by, s.reversal_of is not null,
           s.total_net, s.total_tax
      into v_ws, v_loc, v_occurred, v_recorded,
           v_offline, v_creator, v_is_rev, v_net, v_tax
      from public.sale s
     where s.id = p_id
       and s.location_id in (select public.my_locations());

  else
    select w.workspace_id, w.location_id, w.occurred_at, w.recorded_at,
           w.recorded_offline, w.created_by, w.reversal_of is not null,
           w.total_net, w.total_tax
      into v_ws, v_loc, v_occurred, v_recorded,
           v_offline, v_creator, v_is_rev, v_net, v_tax
      from public.waste w
     where w.id = p_id
       and w.location_id in (select public.my_locations());
  end if;

  if v_ws is null then
    raise exception 'void_transaction: % % not found or not accessible',
                    p_kind, p_id
      using errcode = '42501';
  end if;

  -- ---- 3. a reversal is not voidable  (decision 3 in the header) -----------
  if v_is_rev then
    raise exception 'void_transaction: % % is itself a reversal and cannot be '
                    'voided — re-record the document instead (0008 excludes '
                    'reversals exactly one level deep)', p_kind, p_id
      using errcode = 'TD003';
  end if;

  -- ---- 4. already voided? return it, do not raise  (decision 2) ------------
  -- Ahead of the fence deliberately: a caller retrying a void that ALREADY
  -- SUCCEEDED gets the same success back whatever their role, because the thing
  -- they asked for is already true. Fencing a no-op would make a retry after a
  -- dropped response look like a permission failure.
  if p_kind = 'purchase' then
    select p.id into v_existing from public.purchase p where p.reversal_of = p_id;
  elsif p_kind = 'sale' then
    select s.id into v_existing from public.sale s where s.reversal_of = p_id;
  else
    select w.id into v_existing from public.waste w where w.reversal_of = p_id;
  end if;

  if v_existing is not null then
    return jsonb_build_object(
      'kind',            p_kind,
      'voided',          p_id,
      'void_id',         v_existing,
      'already_recorded', true
    );
  end if;

  -- ---- 5. ⚠️ THE FENCE  (§2.7, and the 2026-09-04 amendment) ---------------
  if not public.has_role(v_ws, 'manager') then

    -- Staff may only void their OWN document. created_by is the only column
    -- that can carry "own" — settled with the owner 2026-09-04.
    if v_creator is distinct from v_user then
      raise exception 'void_transaction: a staff member may only void their own '
                      '% — ask a manager', p_kind
        using errcode = 'TD003';
    end if;

    select ws.void_window_minutes into v_window
      from public.workspace_setting ws
     where ws.workspace_id = v_ws;

    -- No settings row is not a licence. Fail closed on §2.7's stated default.
    v_window := coalesce(v_window, 15);

    -- ⚠️ THE AMENDED BASIS. recorded_at on an offline write, occurred_at
    -- otherwise. On an online write these are the same instant.
    v_basis := case when v_offline then v_recorded else v_occurred end;

    if v_now - v_basis > make_interval(mins => v_window) then
      raise exception 'void_transaction: this % is outside the % minute '
                      'self-service window — ask a manager',
                      p_kind, v_window
        using errcode = 'TD003';
    end if;
  end if;

  -- ---- 6. the compensating document ---------------------------------------
  v_void_id := gen_random_uuid();

  -- Deterministic, and it exists because the header column is NOT NULL. There is
  -- no client payload to hash (decision 2), so this hashes what the document
  -- actually is: the reversal of one known id.
  -- md5, matching `0016:341` and `0018:421` — not a security boundary, and
  -- pgcrypto is not an extension this schema installs.
  v_hash := md5('void:' || p_kind || ':' || p_id::text);

  if p_kind = 'purchase' then
    insert into public.purchase
      (id, workspace_id, location_id, provider_id, occurred_at, total_net,
       total_tax, reversal_of, reversal_reason, created_by, recorded_offline,
       payload_hash)
    values
      (v_void_id, v_ws, v_loc, v_provider, v_now, -v_net,
       -v_tax, p_id, p_reason, v_user, false,
       v_hash);

    insert into public.purchase_line
      (workspace_id, location_id, purchase_id, variant_id, qty_base,
       qty_display, qty_display_unit, unit_price_net_per_base, line_net,
       tax_amount, tax_rate, expiry_date)
    select pl.workspace_id, pl.location_id, v_void_id, pl.variant_id, -pl.qty_base,
           -pl.qty_display, pl.qty_display_unit, pl.unit_price_net_per_base, -pl.line_net,
           -pl.tax_amount, pl.tax_rate, pl.expiry_date
      from public.purchase_line pl
     where pl.purchase_id = p_id;

  elsif p_kind = 'sale' then
    insert into public.sale
      (id, workspace_id, location_id, occurred_at, total_net,
       total_tax, reversal_of, reversal_reason, created_by, recorded_offline,
       payload_hash)
    values
      (v_void_id, v_ws, v_loc, v_now, -v_net,
       -v_tax, p_id, p_reason, v_user, false,
       v_hash);

    insert into public.sale_line
      (workspace_id, location_id, sale_id, variant_id, qty_base,
       qty_display, qty_display_unit, unit_price_net_per_base, line_net,
       tax_amount, tax_rate)
    select sl.workspace_id, sl.location_id, v_void_id, sl.variant_id, -sl.qty_base,
           -sl.qty_display, sl.qty_display_unit, sl.unit_price_net_per_base, -sl.line_net,
           -sl.tax_amount, sl.tax_rate
      from public.sale_line sl
     where sl.sale_id = p_id;

  else
    insert into public.waste
      (id, workspace_id, location_id, occurred_at, total_net,
       total_tax, reversal_of, reversal_reason, created_by, recorded_offline,
       payload_hash)
    values
      (v_void_id, v_ws, v_loc, v_now, -v_net,
       -v_tax, p_id, p_reason, v_user, false,
       v_hash);

    insert into public.waste_line
      (workspace_id, location_id, waste_id, variant_id, qty_base,
       qty_display, qty_display_unit, unit_price_net_per_base, line_net,
       tax_amount, tax_rate, reason, unit_cost_net_per_base)
    select wl.workspace_id, wl.location_id, v_void_id, wl.variant_id, -wl.qty_base,
           -wl.qty_display, wl.qty_display_unit, wl.unit_price_net_per_base, -wl.line_net,
           -wl.tax_amount, wl.tax_rate, wl.reason, wl.unit_cost_net_per_base
      from public.waste_line wl
     where wl.waste_id = p_id;
  end if;

  get diagnostics v_lines = row_count;

  -- A document with no lines cannot exist — `0015` and the four record_* RPCs
  -- all refuse one — so zero here means the original was read through a hole
  -- rather than that it was empty.
  if v_lines = 0 then
    raise exception 'void_transaction: % % has no lines; refusing to write a '
                    'compensating document that reverses nothing', p_kind, p_id
      using errcode = '22023';
  end if;

  -- ---- 7. the compensating movements, ON THE SAME BATCH  (§2.4) -----------
  -- One per movement the original wrote, carrying the ORIGINAL's reason (the
  -- movement_reason enum has no 'reversal' value, deliberately — a voided sale is
  -- still sale activity) and the opposite sign. `stock_movement_sign_follows_
  -- reason` steps aside because reversal_of_movement_id is set, and
  -- `stock_movement_reversal_fk` pins each one to the same batch as the movement
  -- it cancels, which is §2.4's "same batch" requirement enforced by the schema
  -- rather than by this loop.
  --
  -- The document fk points at the NEW header, not the original: the compensating
  -- movements belong to the compensating document, which is what makes
  -- "show me what this void did" a single join. reversal_of_movement_id is what
  -- ties it back to the original movement.
  insert into public.stock_movement
    (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
     unit_cost_net_per_base,
     purchase_id, sale_id, waste_id,
     reversal_of_movement_id, occurred_at, created_by)
  select sm.workspace_id, sm.location_id, sm.batch_id, sm.variant_id, sm.reason,
         -sm.qty_base, sm.unit_cost_net_per_base,
         case when p_kind = 'purchase' then v_void_id end,
         case when p_kind = 'sale'     then v_void_id end,
         case when p_kind = 'waste'    then v_void_id end,
         sm.id, v_now, v_user
    from public.stock_movement sm
   where sm.reversal_of_movement_id is null
     and case p_kind
           when 'purchase' then sm.purchase_id
           when 'sale'     then sm.sale_id
           else                 sm.waste_id
         end = p_id;

  get diagnostics v_moves = row_count;

  if v_moves = 0 then
    raise exception 'void_transaction: % % moved no stock; a document with lines '
                    'and no movements is a ledger this function must not deepen',
                    p_kind, p_id
      using errcode = '22023';
  end if;

  return jsonb_build_object(
    'kind',             p_kind,
    'voided',           p_id,
    'void_id',          v_void_id,
    'lines',            v_lines,
    'movements',        v_moves,
    'already_recorded', false
  );
end;
$$;

comment on function public.void_transaction(text, uuid, text) is
  'Writes a compensating document that cancels a purchase, sale or waste: '
  'negated lines and totals, reversal_of set, and one compensating movement per '
  'original movement against the SAME batch. The original is never mutated. '
  'security definer, so the location wall is this function''s own — and it is '
  'read off the document, scoped through my_locations() so a foreign id is '
  'indistinguishable from a missing one. Idempotent on the ORIGINAL''s id; a '
  're-sent void returns already_recorded. Enforces ADR-035 §2.7''s fence: staff '
  'void their own document inside void_window_minutes, manager and owner void '
  'anything at any time, TD003 otherwise. The window reads recorded_at on an '
  'offline write and occurred_at otherwise (§2.6, amended 2026-09-04). '
  'ADR-035 §2.4, §2.6, §2.7; docs/PLAN.md task 4e-ii-a.';

revoke all on function public.void_transaction(text, uuid, text) from public;
grant execute on function public.void_transaction(text, uuid, text)
  to authenticated;
