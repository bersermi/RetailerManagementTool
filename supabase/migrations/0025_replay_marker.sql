-- ============================================================================
-- 0025 — THE REPLAY MARKER, AND THE VOID-WINDOW EXEMPTION IT MAKES ENFORCEABLE
--
-- ADR-035 §2.6 (*Rejected writes*, *Replay*, and the `occurred_at` trust rules),
-- §2.7 (the capability matrix), §2.10 (the **replay** row).
-- docs/PLAN.md build step 4.5, task 4.5c-i.
--
-- Build step 4.5's third task, split in two on 2026-09-05 before any of it was
-- written. This is the first half: the marker, and the ability of the four
-- recorders to write a document that carries it. `replay_failed_write` — the
-- orchestrator that compensates a downgrade and drives them — is `0026`.
--
-- ---------------------------------------------------------------------------
-- WHY THIS IS A MIGRATION OF ITS OWN, AND NOT A SECTION OF `0026`
-- ---------------------------------------------------------------------------
-- Because `replay_failed_write` cannot be written until this exists. §2.6 grants
-- replay ONE exemption and the whole design rests on it:
--
--     "replay_failed_write is exempt: it preserves the occurred_at already
--      stored on the failed_write row, which was clamped at capture. Without
--      this exemption every recovered sale is silently re-dated to the moment of
--      recovery, which is the precise harm manual replay was chosen to avoid."
--
-- Two facts about the applied schema, read rather than assumed, say that nothing
-- in this database could honour that sentence before today:
--
--   1. `transaction_document_is_immutable()` (`0003:45`) raises on EVERY update
--      of the six transaction tables, with no column exemption and no branch. So
--      a replayed document cannot be stamped after the fact, and its timestamp
--      cannot be corrected after the fact either. Whatever marks a replay has to
--      be written by the INSERT that creates the header — which means by the
--      recorders, because they are the only things that write one.
--
--   2. `record_sale` (`0017:168`), `record_purchase`, `record_waste` and
--      `record_transfer` compute `occurred_at` in exactly TWO branches, and
--      neither preserves a stored one:
--
--          if v_offline then
--            v_at := greatest(least(coalesce(p_occurred_at, v_now), v_now),
--                             v_now - interval '72 hours');
--          else
--            v_at := v_now;
--          end if;
--
--      The online branch IS the re-dating §2.6 names, exactly. The offline
--      branch is the same harm with a 72-hour fuse: a dead letter older than
--      three days — an ordinary age for one, since §2.8 lands them with the
--      VENDOR and §2.6 makes replay wait for a root-cause fix — is clamped
--      forward to `now() - 72h`. That is the quieter of the two, because it
--      fires only on the old rows nobody re-reads.
--
-- So the marker is not a column. It is a third timestamp branch in four applied
-- functions, plus the column, plus `void_transaction` reading it. That is this
-- file.
--
-- ---------------------------------------------------------------------------
-- DECISIONS
-- ---------------------------------------------------------------------------
-- 1. ⚠️⚠️ THE MARKER IS A FOREIGN KEY TO `failed_write`, NOT A BOOLEAN, AND THIS
--    IS THE ONE MOST WORTH OVERTURNING EARLY IF IT IS WRONG. It is a column on
--    three APPEND-ONLY document tables, so changing it after this is a
--    fix-forward migration, and changing it after a client reads it is a
--    coordinated release.
--
--    A boolean would answer §2.6's question — is this document a replay — and
--    nothing else. The FK answers it and names WHICH dead letter this document
--    recovers, which is the link §2.10's dead-letter row wants and the only
--    thing that makes the marker unforgeable: you cannot claim replay status
--    without naming a real `failed_write` row. Adding that link beside a boolean
--    later would mean altering an append-only table twice.
--
--    ⚠️ NO `check (replay_of_failed_write_id = id)`, deliberately, even though
--    §2.6's replay re-runs the original call under its ORIGINAL client uuid and
--    so every row `0026` writes will satisfy it. Encoding that would make the
--    column strictly redundant with the id and foreclose a replay under a fresh
--    id, which §2.6's compensating-document language leaves open. The FK and the
--    primary key together already stop a document being replayed twice.
--
-- 2. ⚠️⚠️ IT IS AN ARGUMENT, NOT SOMETHING DERIVED, AND THAT IS A SECURITY
--    PROPERTY RATHER THAN A STYLE. Because replay re-runs under the original id,
--    a `failed_write` row with the same id ALWAYS exists by the time a replayed
--    header lands — so the recorders could have read the marker off that join
--    and needed no new argument at all. They must not. An ordinary client RETRY
--    of a dead-lettered id would then inherit the exemption silently, escaping
--    both the 72-hour clamp and the 15-minute void window without ever asking
--    for either. The capability has to be visible in the signature. This is
--    3.1's finding — a privilege that appears in no line of the file that
--    creates the object — in a third place.
--
-- 3. ⚠️⚠️ A REPLAY REQUIRES `manager`, AND THE FENCE IS IN THE BODY RATHER THAN
--    ON THE GRANT. Taken on the owner's behalf; it is the CHEAP direction to
--    reverse, because removing a fence later breaks nothing and adding one after
--    a client ships is a coordinated release.
--
--    These four functions are granted to `authenticated` and that must not
--    change — every member may sell, which is `0016`'s grant note and §2.7's
--    matrix. But a cashier who could pass this argument could set an arbitrary
--    `occurred_at` on a document, which is the clamp and the self-service void
--    window both, in one call. §2.7 puts the dead-letter pile behind manager
--    because it is denominated in unrecorded revenue, and §2.6's own account of
--    replay is a manager or owner who *"has already reviewed the dead-letter row
--    and decided deliberately that it should go back in the books"*. So the
--    argument carries the fence the grant cannot. `TD003`, which is `0021`'s and
--    `0022`'s spelling of a role refusal.
--
-- 3b. ⚠️ THE DEAD LETTER MUST BE OURS *AND* OF THIS KIND, and the two refusals
--    are deliberately different. Not ours is `42501` and says nothing more —
--    `failed_write` is one table across every tenant and an FK does not know
--    about workspaces, so a caller must not be able to probe another tenant's
--    ids (`0021`'s reasoning for reading the document through `my_locations()`).
--    Wrong kind is `22023` and LOUD, because by then the row is known to be ours
--    and hiding a client bug behind a permission error is the opposite of what
--    §2.6 asks on the same question. Without the kind check a sale could name a
--    PURCHASE dead letter and §2.10's report would count that purchase recovered
--    while the delivery is still missing — a false statement about the one row
--    nobody re-reads.
--
-- 4. ⚠️ `p_occurred_at` IS REQUIRED ON A REPLAY, NOT DEFAULTED. Every other path
--    in these functions coalesces a null one into `now()`. On a replay that
--    would be decision 1's harm arriving by OMISSION instead of by override —
--    the quietest possible spelling of the one thing the branch exists to stop —
--    so a replay with no time raises `22023` rather than inventing one.
--
-- 5. ⚠️ `record_transfer` TAKES THE ARGUMENT AND MARKS NOTHING. §2.4 gives a
--    transfer no document header, so there is no row to carry the column and
--    `void_transaction` does not accept `transfer` as a kind. But a transfer
--    dead-letters like the other three (`0024`'s `failed_write_kind_known`), and
--    §2.6 says replay can still replay it — and its movements and its
--    destination lots' `received_at` are stamped from the same `v_at`, which is
--    the destination store's FEFO TIEBREAK (`0020:310`), not merely a report
--    bucket. A replayed transfer that re-dated itself would re-order that store's
--    shelf. So the timestamp half applies to all four recorders and the marker
--    half to the three that have somewhere to put it, and the alternative —
--    leaving `record_transfer` to `0026` — would have put a fifth recorder
--    replacement in a migration that is supposed to contain an orchestrator.
--
-- 6. ⚠️ FOUR FUNCTIONS ARE DROPPED AND RECREATED, NOT REPLACED, AND THE REASON
--    IS MECHANICAL — it is `0024`'s, verbatim. `create or replace function`
--    CANNOT change a signature. A seventh argument with a default would create
--    an OVERLOAD, leaving the six-argument version standing and callable, so a
--    client could still reach a `record_sale` that cannot honour a replay, and
--    an unqualified five-argument call would become ambiguous. The drop takes
--    the grants with it, so each is re-granted below.
--
--    ⚠️ `record_sale`'s body is taken from `0017`, NOT from `0016`. `0017`
--    replaced it to add the availability check (4c-i), so `0016`'s text is stale
--    and shipping it here would silently revert an applied feature that 89
--    behavioural checks cover. Every function in this file was checked for a
--    later `create or replace` before it was carried forward; `record_sale` is
--    the only one that had one.
--
-- 7. `void_transaction` IS `create or replace`d, because its signature does not
--    change — so its grants and its policies stand, and only its body moves.
--
-- ---------------------------------------------------------------------------
-- WHAT WAS CONSIDERED AND REFUSED
-- ---------------------------------------------------------------------------
-- ⚠️ `p_recorded_offline => true` ON THE REPLAY CALL, so no recorder changes.
--    REFUSED. It re-dates every dead letter older than 72 hours, which is the
--    harm; and it writes `recorded_offline = true` on a document that was never
--    queued on a device, which `void_transaction` then reads as its window basis
--    (`0021:291`) — so the lie propagates into the very fence the marker exists
--    to fix.
--
-- ⚠️ A `set local` GUC READ BY A `before insert` TRIGGER, so no recorder
--    changes and this file becomes a column, a trigger and `void_transaction`.
--    REFUSED, and it is named here because it is genuinely cheaper and will be
--    proposed again otherwise. Three reasons. The recorders RETURN `v_at` in
--    their result json, so the value handed back to the caller would disagree
--    with the row just written. `sale_line`, `waste_line`, `stock_batch` and
--    `stock_movement` all take `occurred_at`/`received_at` from the same `v_at`,
--    so the trigger would have to be installed on each of them and `0016:166`'s
--    "a document cannot disagree with itself about when it happened" would
--    become four triggers' problem instead of one variable's. And it is the
--    invisible-channel shape: a capability that appears in no signature, which
--    is decision 2's objection arriving by a different road.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS FILE DOES NOT DO
-- ---------------------------------------------------------------------------
-- It writes no marker. Nothing in this database passes the new argument, and
-- nothing will until `0026`. That is deliberate and it is §2.6's own position:
-- *"until then no replayed document exists, so nothing is unenforced in
-- practice."* The exemption below is therefore inert on every row that exists
-- today and behaves exactly as `0021` did — which is the claim
-- `supabase/tests/0021_void_transaction.sql` re-asserts on every CI run, and the
-- reason this migration can land before its only caller.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The marker  (ADR-035 §2.6; decision 1)
-- ----------------------------------------------------------------------------
-- Nullable, and null means "an ordinary write" — which is every row in every
-- database this migration will ever be applied to, because nothing writes it
-- yet.
--
-- `on delete restrict`, matching `stock_movement.failed_write_id` (`0024`): a
-- dead letter that has been recovered is the last row anyone should be able to
-- delete, since the document pointing at it is append-only and could not have
-- the pointer removed.

alter table public.sale
  add column replay_of_failed_write_id uuid
    references public.failed_write (id) on delete restrict;

alter table public.purchase
  add column replay_of_failed_write_id uuid
    references public.failed_write (id) on delete restrict;

alter table public.waste
  add column replay_of_failed_write_id uuid
    references public.failed_write (id) on delete restrict;

-- Partial, because the column is null on every row but a replayed one and
-- §2.10's dead-letter report reads it the other way round — given a dead letter,
-- was it recovered.
create index sale_by_replay_idx
  on public.sale (replay_of_failed_write_id)
  where replay_of_failed_write_id is not null;

create index purchase_by_replay_idx
  on public.purchase (replay_of_failed_write_id)
  where replay_of_failed_write_id is not null;

create index waste_by_replay_idx
  on public.waste (replay_of_failed_write_id)
  where replay_of_failed_write_id is not null;

comment on column public.sale.replay_of_failed_write_id is
  'The dead letter this sale recovers (ADR-035 §2.6, 0025). Null on an ordinary '
  'write. Non-null means the row was written by replay_failed_write (0026): it '
  'kept the occurred_at stored on that failed_write row rather than taking '
  'now() or the 72-hour clamp, and void_transaction measures its 15-minute '
  'window from occurred_at whatever recorded_offline says. Passing it requires '
  'manager — an arbitrary occurred_at is the clamp and the void window both.';

comment on column public.purchase.replay_of_failed_write_id is
  'The dead letter this delivery recovers (ADR-035 §2.6, 0025). See '
  'sale.replay_of_failed_write_id. ⚠️ A rejected purchase is NOT downgraded '
  '(0024, amendment 2) — the stock is on the shelf — so replaying one '
  'compensates nothing and only records the document that was lost.';

comment on column public.waste.replay_of_failed_write_id is
  'The dead letter this waste record recovers (ADR-035 §2.6, 0025). See '
  'sale.replay_of_failed_write_id.';


-- ----------------------------------------------------------------------------
-- 2. record_sale(), re-signed  (decisions 2, 3, 4, 6)
-- ----------------------------------------------------------------------------
-- ⚠️ THE BODY BELOW IS `0017`'s, NOT `0016`'s — the availability check is in it.
-- Everything but the signature, the replay branch and one column in the header
-- INSERT is carried forward byte for byte, and `supabase/tests/0016_record_sale.sql`
-- and `0017_availability_check.sql` are what prove that: between them they hold
-- 89 behavioural checks over this function, and they run against this text on
-- every CI run.

drop function public.record_sale(uuid, uuid, jsonb, timestamptz, boolean);

create function public.record_sale(
  p_id               uuid,
  p_location_id      uuid,
  p_lines            jsonb,
  p_occurred_at      timestamptz default null,
  p_recorded_offline boolean     default false,
  -- ⚠️ ADDED BY 0025. Null on every ordinary write, which is why this
  -- function's behaviour is unchanged for every existing caller.
  -- Non-null only from replay_failed_write (0026).
  p_replay_of_failed_write_id uuid default null
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
  v_problem   text;
  v_priced    jsonb;
  v_n         integer;
  v_tot_net   numeric(12,2);
  v_tot_tax   numeric(12,2);
  v_hash      text;
  v_inserted  integer;
  v_existing  public.sale%rowtype;
  v_line      record;
  v_alloc     record;
  -- 0017, the availability check
  v_enforce   boolean;
  v_avail     numeric(14,3);
  v_vname     text;
begin
  -- ---- 1. the location wall, FIRST, exactly as §2.6 writes it --------------
  -- Verbatim from the ADR apart from the message. It is first because §2.6 says
  -- "every RPC validates its location as its first statement", and because a
  -- caller who may not act here should learn nothing else about this database —
  -- not whether the id exists, not whether the variant does.
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'location not accessible'
      using errcode = '42501';
  end if;

  -- `my_locations()` returned a row, so there IS an authenticated caller and a
  -- membership behind it. This check is for `sale.created_by`, which is `not
  -- null` and references auth.users — it cannot be reached with a null uid, but
  -- a null uid here would fail on the insert with a foreign-key message that
  -- says nothing useful at a till.
  if v_user is null then
    raise exception 'record_sale requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- The workspace is DERIVED, never a parameter. §2.6 permits an explicit
  -- `workspace_id` validated the same way; deriving it from a location the
  -- caller has already been proved to hold is strictly stronger, because there
  -- is no second value that can disagree with the first.
  select l.workspace_id into v_ws
    from public.location l
   where l.id = p_location_id;

  -- ---- 2. the timestamps  (§2.6) ------------------------------------------
  -- Online: the server OVERRIDES. Offline: the client value is accepted and
  -- clamped to [now() - 72h, now()]. The clamp rejects nothing — it cannot,
  -- because the sale already happened — it only stops a wrong device clock
  -- filing a sale in 1970 or next year.
  --
  -- `v_now` is captured once and used for the header, every line and every
  -- movement, so a document cannot disagree with itself about when it happened.
  -- ---- ⚠️ THE REPLAY PATH  (§2.6's exemption; added by 0025) ---------------
  -- A REPLAY IS THE ONLY WRITE IN THIS DATABASE THAT KEEPS THE `occurred_at` IT
  -- WAS HANDED. Both branches below re-date it — the online one to `now()`
  -- outright, the offline one to `now() - 72h` for anything older than three
  -- days — and §2.6 says of exactly that: *"without this exemption every
  -- recovered sale is silently re-dated to the moment of recovery, which is the
  -- precise harm manual replay was chosen to avoid."*
  --
  -- ⚠️ IT IS AN ARGUMENT AND NOT SOMETHING DERIVED, and the reason is not style.
  -- A replay re-runs the original call under the ORIGINAL client uuid (§2.6), so
  -- a `failed_write` row with this document's id always exists by the time the
  -- header lands — which means the marker could have been read off that join
  -- instead. It must not be: an ordinary client RETRY of a dead-lettered id
  -- would then inherit the exemption silently, escaping both the clamp and the
  -- void window without asking for either. The capability has to be visible in
  -- the signature, which is 3.1's finding about grants in a third place.
  if p_replay_of_failed_write_id is not null then

    -- ⚠️ MANAGER, AND THE FENCE IS HERE RATHER THAN ON THE GRANT. These
    -- functions are granted to `authenticated` because every member may sell
    -- (0016's grant note), and that must not change — but a cashier who could
    -- pass this argument could set an arbitrary `occurred_at`, which is the
    -- clamp and the 15-minute window both. §2.7 puts the dead-letter pile behind
    -- manager because it is denominated in unrecorded revenue, and §2.6's own
    -- account of replay is a manager or owner who *"has already reviewed the
    -- dead-letter row and decided deliberately that it should go back in the
    -- books"*. So the argument carries the fence the grant cannot.
    if not public.has_role(v_ws, 'manager') then
      raise exception 'record_sale: only a manager or owner may record a replay '
                      '(ADR-035 §2.7 — the dead-letter pile is unrecorded '
                      'revenue)'
        using errcode = 'TD003';
    end if;

    -- The foreign key proves the dead letter EXISTS. Nothing but this proves it
    -- is ours: `failed_write` is one table across every tenant, and an FK does
    -- not know about workspaces. Same answer as a row that is not there, for
    -- 0021's reason — a caller must not be able to probe another tenant's ids.
    if not exists (select 1 from public.failed_write fw
                    where fw.id = p_replay_of_failed_write_id
                      and fw.workspace_id = v_ws) then
      raise exception 'record_sale: dead letter % not found or not accessible',
                      p_replay_of_failed_write_id
        using errcode = '42501';
    end if;

    -- ⚠️ AND IT HAS TO BE A DEAD LETTER OF THIS KIND. Loud (22023) rather than
    -- 42501, because by here the row is known to be OURS and hiding a client bug
    -- behind a permission error would be the opposite of §2.6's "deliberately
    -- loud" on the same question. Without this a sale could name a PURCHASE dead
    -- letter, and §2.10's report would count that purchase recovered when the
    -- delivery is still missing — the marker would say something false about a
    -- row nobody re-reads.
    if not exists (select 1 from public.failed_write fw
                    where fw.id = p_replay_of_failed_write_id
                      and fw.kind = 'sale') then
      raise exception 'record_sale: dead letter % is not a sale — a replay '
                      'records the kind that was lost (ADR-035 §2.6)',
                      p_replay_of_failed_write_id
        using errcode = '22023';
    end if;

    -- ⚠️ AND `occurred_at` IS REQUIRED HERE, NOT DEFAULTED. Every other path in
    -- this function coalesces a null one into `v_now`. On a replay that would be
    -- the re-dating above, arriving by omission instead of by override — the
    -- quietest possible spelling of the one thing this branch exists to stop.
    if p_occurred_at is null then
      raise exception 'record_sale: a replay must carry the occurred_at stored '
                      'on the dead letter — defaulting it to now() is the '
                      're-dating ADR-035 §2.6 says manual replay exists to '
                      'prevent'
        using errcode = '22023';
    end if;

    -- ⚠️ VERBATIM. No override, no clamp, at any age.
    v_at := p_occurred_at;

  elsif v_offline then
    v_at := greatest(least(coalesce(p_occurred_at, v_now), v_now),
                     v_now - interval '72 hours');
  else
    v_at := v_now;
  end if;

  -- ---- 3. the payload -----------------------------------------------------
  if p_id is null then
    raise exception 'record_sale: the client must generate the sale id — it is '
                    'the idempotency key (ADR-035 §2.6)'
      using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'record_sale: lines must be a non-empty json array, got %',
                    coalesce(jsonb_typeof(p_lines), 'null')
      using errcode = '22023';
  end if;

  -- ⚠️ VALIDATE BEFORE PRICING, AND NAME THE LINE. The pricing query below
  -- joins `product_variant` and `unit`; an inner join would DROP a line that
  -- resolves to neither and record a shorter ticket than the customer paid for.
  -- This is the same shape as 3.2b-ii's finding — a payload is refused by the
  -- first wall it meets — except here there is no wall, so this is it.
  --
  -- The arms are ordered so the first true one is the most specific thing wrong
  -- with the line. A malformed uuid or a non-numeric quantity raises 22P02 from
  -- the cast before any arm is reached, which is a clear enough failure to
  -- leave alone.
  select format('record_sale: line %s — %s', v.ord, v.problem)
    into v_problem
    from (
      select e.ord,
             case
               when nullif(e.l->>'variant_id', '') is null
                 then 'variant_id is required'
               when nullif(e.l->>'qty_display', '') is null
                 then 'qty_display is required'
               when nullif(e.l->>'unit_price_gross_per_base', '') is null
                 then 'unit_price_gross_per_base is required'
               when pv.id is null
                 then format('variant %s is not in this workspace',
                             e.l->>'variant_id')
               when u.code is null
                 then format('unit %L is not in the unit table',
                             coalesce(nullif(e.l->>'qty_display_unit', ''),
                                      pv.sell_unit_code))
               when u.base_code <> pv.base_unit_code
                 then format('unit %L is measured in %L, but the variant is '
                             'stored in %L — a conversion across dimensions has '
                             'no answer to give (ADR-035 §2.5)',
                             u.code, u.base_code, pv.base_unit_code)
               -- A negative sale line is a refund, and a refund is a
               -- COMPENSATING DOCUMENT: `void_transaction` in 0019, with
               -- `reversal_of` set. `allocate_fefo()` refuses a non-positive
               -- quantity anyway (0010), but it refuses it with a message about
               -- allocation rather than about what the caller did wrong.
               when (e.l->>'qty_display')::numeric <= 0
                 then format('quantity must be positive, got %s — a return is '
                             'void_transaction, not a negative sale line',
                             e.l->>'qty_display')
               when (e.l->>'unit_price_gross_per_base')::numeric < 0
                 then format('unit_price_gross_per_base cannot be negative, got %s',
                             e.l->>'unit_price_gross_per_base')
               -- The ledger is numeric(14,3) in the base unit. 0.0004 kg is
               -- 0.4 g, which rounds to nothing — and a line with a real price
               -- and no quantity would take money for no stock.
               when round((e.l->>'qty_display')::numeric * u.factor_to_base, 3) <= 0
                 then format('qty_display %s %s rounds to zero in %L',
                             e.l->>'qty_display', u.code, pv.base_unit_code)
             end as problem
        from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
        left join public.product_variant pv
          on pv.id = nullif(e.l->>'variant_id', '')::uuid
         and pv.workspace_id = v_ws
        left join public.unit u
          on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''),
                               pv.sell_unit_code)
    ) v
   where v.problem is not null
   order by v.ord
   limit 1;

  if v_problem is not null then
    raise exception '%', v_problem using errcode = '22023';
  end if;

  -- ---- 4. the money  (§2.5 rules 2–6) -------------------------------------
  -- THE SHELF PRICE IS THE ANCHOR, and the tax is the residual:
  --
  --     line_gross = round(unit_gross × qty_base, 2)
  --     line_net   = round(line_gross / (1 + rate), 2)
  --     line_tax   = line_gross − line_net          -- never rounded alone
  --
  -- Rule 4 is what makes `net + tax = gross` hold exactly on every line, and it
  -- has teeth on THIS side of the ledger precisely because the net is reached
  -- by division (§2.5, and docs/PLAN.md task 3.5). Every value is `numeric`;
  -- rule 1 forbids float anywhere in the money path and 07 asserts it as a
  -- build failure, which is also what makes rule 6's half-up rounding reachable
  -- — `round(float8)` is banker's.
  --
  -- Priced once, into jsonb, because the same numbers are wanted three times:
  -- the header totals, the lines, and the hash. jsonb numbers ARE numeric, so
  -- nothing is lost on the way back out.
  select coalesce(jsonb_agg(to_jsonb(p) order by p.ord), '[]'::jsonb),
         count(*),
         coalesce(sum(p.line_net), 0),
         coalesce(sum(p.line_gross - p.line_net), 0)
    into v_priced, v_n, v_tot_net, v_tot_tax
    from (
      select c.ord,
             c.variant_id,
             c.qty_base,
             c.qty_display,
             c.qty_display_unit,
             c.tax_rate,
             c.line_gross,
             round(c.line_gross / (1 + c.tax_rate), 2) as line_net
        from (
          select r.ord,
                 r.variant_id,
                 r.qty_display,
                 r.qty_display_unit,
                 r.tax_rate,
                 r.qty_base,
                 round(r.unit_gross * r.qty_base, 2) as line_gross
            from (
              select e.ord,
                     (e.l->>'variant_id')::uuid                   as variant_id,
                     (e.l->>'qty_display')::numeric               as qty_display,
                     (e.l->>'unit_price_gross_per_base')::numeric as unit_gross,
                     pv.tax_rate,
                     coalesce(nullif(e.l->>'qty_display_unit', ''),
                              pv.sell_unit_code)                  as qty_display_unit,
                     round((e.l->>'qty_display')::numeric
                           * u.factor_to_base, 3)                 as qty_base
                from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
                join public.product_variant pv
                  on pv.id = (e.l->>'variant_id')::uuid
                 and pv.workspace_id = v_ws
                join public.unit u
                  on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''),
                                       pv.sell_unit_code)
            ) r
        ) c
    ) p;

  -- Rule 5: the document total is the sum of the ROUNDED lines. It is never
  -- computed independently of them — a document-level split makes the printed
  -- lines fail to sum to the printed total, which is the one arithmetic error a
  -- shopkeeper checks by hand.
  --
  -- The count is the anti-vacuity guard on the query above: every line was
  -- proved resolvable in step 3, so a shorter result here means the pricing
  -- query dropped one and the ticket is not the ticket that was paid for.
  if v_n is distinct from jsonb_array_length(p_lines) then
    raise exception 'record_sale: priced % of % lines — the pricing query '
                    'dropped one and the document would understate the sale',
                    coalesce(v_n, 0), jsonb_array_length(p_lines)
      using errcode = 'internal_error';
  end if;

  -- ---- 5. the payload hash  (§2.6) ----------------------------------------
  -- "The header carries `payload_hash` over the normalised LINES." Lines, and
  -- nothing else — which is what makes a retry whose `occurred_at` was clamped
  -- to a different second still read as the same sale.
  --
  -- NORMALISED means order-independent: two tills that build the same basket in
  -- a different order agree, and the canonical numbers (qty in base units) are
  -- what is hashed rather than the client's formatting, so `2` and `2.00` do
  -- not disagree.
  select md5(string_agg(format('%s|%s|%s',
                               x.variant_id, x.qty_base, x.line_gross),
                        E'\n' order by x.variant_id, x.qty_base, x.line_gross))
    into v_hash
    from jsonb_to_recordset(v_priced)
      as x(variant_id uuid, qty_base numeric, line_gross numeric);

  -- ---- 6. idempotency  (§2.6's four rows) ---------------------------------
  -- The header is written FIRST, and nothing above it wrote anything, so the
  -- row lock this takes is the whole of the concurrency story: a second call
  -- carrying the same id blocks here until this transaction commits or aborts.
  -- That is stock Postgres behaviour and it is MEASURED, not assumed —
  -- supabase/vitest/test/idempotency.test.ts (plan task 3.7a) names the
  -- blocking pid on all three document tables.
  insert into public.sale
    (id, workspace_id, location_id, occurred_at, total_net, total_tax,
     created_by, recorded_offline, payload_hash, replay_of_failed_write_id)
  values
    (p_id, v_ws, p_location_id, v_at, v_tot_net, v_tot_tax,
     v_user, v_offline, v_hash, p_replay_of_failed_write_id)
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_existing from public.sale s where s.id = p_id;

    -- Same id, DIFFERENT lines — or the same id in another tenant's hands.
    -- §2.6: "deliberately loud. Accepting the first version silently hides a
    -- client bug, accepting the second silently rewrites a committed sale."
    -- The workspace and location comparisons are not paranoia about uuid
    -- collisions: `sale.id` is a global primary key, so a client that reuses an
    -- id across two shops would otherwise be told its sale was already
    -- recorded — somewhere it cannot see.
    if v_existing.payload_hash is distinct from v_hash
       or v_existing.workspace_id is distinct from v_ws
       or v_existing.location_id  is distinct from p_location_id then
      raise exception
        'sale % was already recorded with a different payload', p_id
        using errcode = 'TD001',
              detail  = 'This is not a retry. Dead-letter it (ADR-035 §2.6).';
    end if;

    -- A success, not an error.
    return jsonb_build_object(
      'sale_id',          v_existing.id,
      'workspace_id',     v_existing.workspace_id,
      'location_id',      v_existing.location_id,
      'occurred_at',      v_existing.occurred_at,
      'recorded_offline', v_existing.recorded_offline,
      'line_count',       (select count(*) from public.sale_line sl
                            where sl.sale_id = v_existing.id),
      'total_net',        v_existing.total_net,
      'total_tax',        v_existing.total_tax,
      'total_gross',      v_existing.total_net + v_existing.total_tax,
      'already_recorded', true
    );
  end if;

  -- ---- 7. the lines and the ledger  (§2.4) --------------------------------
  -- THE ALLOCATOR DECIDES. One movement per lot it hands back — a single line
  -- can span several lots, and each carries its own cost, which is what §2.9
  -- divides revenue against. `allocate_fefo()` takes row locks on
  -- `batch_balance` that THIS transaction must hold until the movements are
  -- written (0010, plan task 1.8), which is why the call is here and not in a
  -- helper that returns before they are.
  --
  -- `p_occurred_at` is passed, never `now()`: a shortfall opens a lot, and a lot
  -- received today would sort ahead of real stock in the FEFO order of every
  -- offline sale flushed late.
  for v_line in
    select * from jsonb_to_recordset(v_priced)
      as x(ord              integer,
           variant_id       uuid,
           qty_base         numeric,
           qty_display      numeric,
           qty_display_unit text,
           tax_rate         numeric,
           line_gross       numeric,
           line_net         numeric)
     order by x.ord
  loop
    -- ---- 7a. THE AVAILABILITY CHECK — BUILT, DORMANT  (§2.6) --------------
    -- §2.6: "lock the open batches for the variant, evaluate availability,
    -- then insert or raise. This is the irreversible half." Those three steps
    -- are the three statements below, in that order, and they run BEFORE this
    -- line writes anything.
    --
    -- ⚠️ DORMANT IS THE DEFAULT AND IT IS THE SCHEMA'S, NOT A FLAG IN HERE.
    -- `workspace_setting.enforce_stock_default` is `false` in 0001 and
    -- `product_variant.enforce_stock` is null everywhere in the seed, so this
    -- block resolves to `false` for every caller that exists today and 0017
    -- changes NOTHING observable until a shopkeeper opts in. ADR-035 §1:
    -- stock is RECORDED, not enforced — the pilot decides whether oversales
    -- are a real problem before anyone pays for the override role and the
    -- offline degradation path.
    --
    -- The variant wins over the workspace, and a workspace with no setting row
    -- resolves to false rather than to null. Fail OPEN, deliberately and only
    -- here: refusing a sale because a settings row is missing would shut a till
    -- for a reason the cashier cannot act on, and the shelf is still recorded
    -- either way. Every OTHER fail-open in this system is a defect.
    select coalesce(pv.enforce_stock, ws.enforce_stock_default, false), pv.name
      into v_enforce, v_vname
      from public.product_variant pv
      left join public.workspace_setting ws on ws.workspace_id = v_ws
     where pv.id = v_line.variant_id;

    -- §2.6's offline paragraph: an offline write SKIPS ENFORCEMENT. It has to.
    -- The sale already happened at a till that could not ask this database
    -- anything, and refusing it on reconnect would discard a transaction the
    -- customer has paid for — which is the one outcome worse than an oversale.
    -- The debt still lands on the shelf as a negative balance, which is what
    -- makes it visible rather than lost.
    if v_enforce and not v_offline then
      -- LOCK, then evaluate. `for update` cannot sit beside an aggregate, so
      -- the lock is taken in the CTE and the sum is taken over its result.
      --
      -- ⚠️ THE PREDICATE AND THE ORDER ARE `allocate_fefo()`'s, VERBATIM (0010).
      -- That is the point of them: this statement takes exactly the rows the
      -- very next statement was already going to take, in exactly the same
      -- order, one statement earlier. 0017 therefore introduces NO new lock and
      -- NO new lock ordering — it reads the locks 0016 already held before
      -- deciding, instead of after. A second session asking for the same last
      -- unit blocks HERE, re-reads the depleted balance when the first commits,
      -- and is refused. That is §2.10's concurrency clause, and it is proved on
      -- two real connections in supabase/vitest/ (docs/PLAN.md task 4c-ii) —
      -- NOT here, because one session cannot block on its own lock.
      with locked as (
        select bb.remaining_base
          from public.batch_balance bb
         where bb.workspace_id   = v_ws
           and bb.location_id    = p_location_id
           and bb.variant_id     = v_line.variant_id
           and bb.remaining_base > 0
         order by bb.expiry_date asc nulls last, bb.received_at asc,
                  bb.batch_id asc
         for update
      )
      select coalesce(sum(remaining_base), 0) into v_avail from locked;

      -- ⚠️ THE CHECK IS PER LINE, NOT PER TICKET, AND THE SAME VARIANT TWICE
      -- STILL ADDS UP. `batch_balance` is projected by an AFTER INSERT trigger
      -- on `stock_movement` (0004), so by the time a second line for the same
      -- variant reaches this statement the first line's movements have already
      -- come off the balance it reads. A ticket for 5 + 5 against 8 on the
      -- shelf is refused on its SECOND line, not accepted whole.
      --
      -- An up-front pass aggregating the whole ticket by variant was considered
      -- and refused: it would name every short variant at once, which is nicer,
      -- at the cost of taking the batch locks in an order no other statement in
      -- this system uses. A better error message is not worth a second lock
      -- ordering in the function that empties the shelf.
      if v_avail < v_line.qty_base then
        raise exception
          'record_sale: line % — % has % available at this location and the '
          'ticket asks for %. Stock enforcement is on for this product '
          '(ADR-035 §2.6)',
          v_line.ord, coalesce(v_vname, v_line.variant_id::text),
          v_avail, v_line.qty_base
          using errcode = 'TD002';
      end if;
    end if;

    insert into public.sale_line
      (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
    values
      (v_ws, p_location_id, p_id, v_line.variant_id,
       v_line.qty_base, v_line.qty_display, v_line.qty_display_unit,
       -- Derived from the ROUNDED line net, not from the gross unit price: the
       -- line is the authority and this column is a convenience for reading it
       -- back per unit. Deriving it the other way would let the column and the
       -- line disagree by a centavo on a weighed quantity.
       round(v_line.line_net / v_line.qty_base, 6),
       v_line.line_net,
       v_line.line_gross - v_line.line_net,
       v_line.tax_rate);

    for v_alloc in
      select * from public.allocate_fefo(v_ws, p_location_id, v_line.variant_id,
                                         v_line.qty_base, v_user, v_at)
    loop
      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, sale_id, occurred_at, created_by)
      values
        (v_ws, p_location_id, v_alloc.batch_id, v_line.variant_id, 'sale',
         -- NEGATIVE. `stock_movement_sign_follows_reason` refuses anything else
         -- for reason 'sale', so this sign is the schema's and not a choice.
         -v_alloc.qty_base, v_alloc.unit_cost_net_per_base, p_id,
         v_at, v_user);
      -- `recorded_at` is left to its `now()` default on both tables. §2.6:
      -- server-set, never client-supplied. It is the one column an offline
      -- write must NOT backdate, because "when did we find out" is the question
      -- audit asks.
    end loop;
  end loop;

  return jsonb_build_object(
    'sale_id',          p_id,
    'workspace_id',     v_ws,
    'location_id',      p_location_id,
    'occurred_at',      v_at,
    'recorded_offline', v_offline,
    'line_count',       v_n,
    'total_net',        v_tot_net,
    'total_tax',        v_tot_tax,
    'total_gross',      v_tot_net + v_tot_tax,
    'already_recorded', false
  );
end;
$$;

comment on function public.record_sale(uuid, uuid, jsonb, timestamptz, boolean, uuid) is
  'Records one sale: header, lines, FEFO allocation within the location, one '
  'movement per lot, the tax split gross-first with tax as the residual, in one '
  'transaction. Validates the location in its own body — RLS is not running '
  'here. Idempotent on the client-generated id: the same payload returns '
  'already_recorded, a different one raises TD001 for the caller to '
  'dead-letter. occurred_at is server now() unless recorded_offline, when the '
  'client value is clamped to [now() - 72h, now()] — ⚠️ EXCEPT on a replay '
  '(p_replay_of_failed_write_id non-null, 0025), where it is kept verbatim at '
  'any age, is required rather than defaulted, and requires manager. ADR-035 '
  '§2.4, §2.5, §2.6.';

-- The drop above took the grants with it. Re-issued unchanged: the fence for
-- the new argument is in the body (decision 3), not here.
revoke all on function
  public.record_sale(uuid, uuid, jsonb, timestamptz, boolean, uuid) from public;
grant execute on function
  public.record_sale(uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. record_purchase(), re-signed  (decisions 2, 3, 4, 6)
-- ----------------------------------------------------------------------------
-- Carried forward from `0018` unchanged apart from the same three edits.
-- `supabase/tests/0018_record_purchase.sql` — 82 checks — runs against this text.

drop function public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean);

create function public.record_purchase(
  p_id               uuid,
  p_location_id      uuid,
  p_provider_id      uuid,
  p_lines            jsonb,
  p_occurred_at      timestamptz default null,
  p_recorded_offline boolean     default false,
  -- ⚠️ ADDED BY 0025. Null on every ordinary write, which is why this
  -- function's behaviour is unchanged for every existing caller.
  -- Non-null only from replay_failed_write (0026).
  p_replay_of_failed_write_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_ws        uuid;
  v_tz        text;
  v_offline   boolean := coalesce(p_recorded_offline, false);
  v_now       timestamptz := now();
  v_at        timestamptz;
  v_problem   text;
  v_priced    jsonb;
  v_n         integer;
  v_tot_net   numeric(12,2);
  v_tot_tax   numeric(12,2);
  v_hash      text;
  v_inserted  integer;
  v_existing  public.purchase%rowtype;
  v_line      record;
  v_line_id   uuid;
  v_batch_id  uuid;
begin
  -- ---- 1. the location wall, FIRST, exactly as §2.6 writes it --------------
  -- Verbatim from the ADR apart from the message, and first for the ADR's
  -- reason: a caller who may not act in this store should learn nothing else
  -- about this database — not whether the provider exists, not whether the id
  -- is taken.
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'location not accessible'
      using errcode = '42501';
  end if;

  if v_user is null then
    raise exception 'record_purchase requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- The workspace is DERIVED, never a parameter — 0016's argument, unchanged:
  -- there is no second value that can disagree with the first. The timezone
  -- rides along because tier 2 of the expiry policy needs the store's local day.
  select l.workspace_id, l.timezone
    into v_ws, v_tz
    from public.location l
   where l.id = p_location_id;

  -- ---- 2. the provider  (§2.3) --------------------------------------------
  -- ⚠️ THE SECOND WALL, AND IT IS THIS FUNCTION'S ALONE. `record_sale` has no
  -- equivalent — a sale has no counterparty row. `purchase_provider_fk` is
  -- composite on (provider_id, workspace_id), so another tenant's provider is
  -- already refused by the schema; the check is here so the refusal says which
  -- of the two things is wrong, at the moment the operator can still fix it,
  -- rather than as a foreign-key violation naming a constraint.
  --
  -- Inactive is NOT refused. A provider is retired the day after a delivery
  -- arrives from them at least as often as before it, and a shop cannot file
  -- paperwork it has already accepted the stock for.
  if p_provider_id is null then
    raise exception 'record_purchase: provider_id is required — a delivery has '
                    'a counterparty, and the generic provider is a real row '
                    '(ADR-035 §2.3)'
      using errcode = '22023';
  end if;

  if not exists (select 1 from public.provider pr
                  where pr.id = p_provider_id
                    and pr.workspace_id = v_ws) then
    raise exception 'record_purchase: provider % is not in this workspace',
                    p_provider_id
      using errcode = '22023';
  end if;

  -- ---- 3. the timestamps  (§2.6) ------------------------------------------
  -- 0016's rule, unchanged. `v_now` is captured once and used for the header,
  -- every line, every batch's `received_at` and every movement, so a delivery
  -- cannot disagree with itself about when it arrived — and `received_at` is
  -- the FEFO tiebreak (§2.4), so a document whose lots disagreed about it would
  -- order against itself.
  -- ---- ⚠️ THE REPLAY PATH  (§2.6's exemption; added by 0025) ---------------
  -- A REPLAY IS THE ONLY WRITE IN THIS DATABASE THAT KEEPS THE `occurred_at` IT
  -- WAS HANDED. Both branches below re-date it — the online one to `now()`
  -- outright, the offline one to `now() - 72h` for anything older than three
  -- days — and §2.6 says of exactly that: *"without this exemption every
  -- recovered sale is silently re-dated to the moment of recovery, which is the
  -- precise harm manual replay was chosen to avoid."*
  --
  -- ⚠️ IT IS AN ARGUMENT AND NOT SOMETHING DERIVED, and the reason is not style.
  -- A replay re-runs the original call under the ORIGINAL client uuid (§2.6), so
  -- a `failed_write` row with this document's id always exists by the time the
  -- header lands — which means the marker could have been read off that join
  -- instead. It must not be: an ordinary client RETRY of a dead-lettered id
  -- would then inherit the exemption silently, escaping both the clamp and the
  -- void window without asking for either. The capability has to be visible in
  -- the signature, which is 3.1's finding about grants in a third place.
  if p_replay_of_failed_write_id is not null then

    -- ⚠️ MANAGER, AND THE FENCE IS HERE RATHER THAN ON THE GRANT. These
    -- functions are granted to `authenticated` because every member may sell
    -- (0016's grant note), and that must not change — but a cashier who could
    -- pass this argument could set an arbitrary `occurred_at`, which is the
    -- clamp and the 15-minute window both. §2.7 puts the dead-letter pile behind
    -- manager because it is denominated in unrecorded revenue, and §2.6's own
    -- account of replay is a manager or owner who *"has already reviewed the
    -- dead-letter row and decided deliberately that it should go back in the
    -- books"*. So the argument carries the fence the grant cannot.
    if not public.has_role(v_ws, 'manager') then
      raise exception 'record_purchase: only a manager or owner may record a replay '
                      '(ADR-035 §2.7 — the dead-letter pile is unrecorded '
                      'revenue)'
        using errcode = 'TD003';
    end if;

    -- The foreign key proves the dead letter EXISTS. Nothing but this proves it
    -- is ours: `failed_write` is one table across every tenant, and an FK does
    -- not know about workspaces. Same answer as a row that is not there, for
    -- 0021's reason — a caller must not be able to probe another tenant's ids.
    if not exists (select 1 from public.failed_write fw
                    where fw.id = p_replay_of_failed_write_id
                      and fw.workspace_id = v_ws) then
      raise exception 'record_purchase: dead letter % not found or not accessible',
                      p_replay_of_failed_write_id
        using errcode = '42501';
    end if;

    -- ⚠️ AND IT HAS TO BE A DEAD LETTER OF THIS KIND. Loud (22023) rather than
    -- 42501, because by here the row is known to be OURS and hiding a client bug
    -- behind a permission error would be the opposite of §2.6's "deliberately
    -- loud" on the same question. Without this a sale could name a PURCHASE dead
    -- letter, and §2.10's report would count that purchase recovered when the
    -- delivery is still missing — the marker would say something false about a
    -- row nobody re-reads.
    if not exists (select 1 from public.failed_write fw
                    where fw.id = p_replay_of_failed_write_id
                      and fw.kind = 'purchase') then
      raise exception 'record_purchase: dead letter % is not a purchase — a replay '
                      'records the kind that was lost (ADR-035 §2.6)',
                      p_replay_of_failed_write_id
        using errcode = '22023';
    end if;

    -- ⚠️ AND `occurred_at` IS REQUIRED HERE, NOT DEFAULTED. Every other path in
    -- this function coalesces a null one into `v_now`. On a replay that would be
    -- the re-dating above, arriving by omission instead of by override — the
    -- quietest possible spelling of the one thing this branch exists to stop.
    if p_occurred_at is null then
      raise exception 'record_purchase: a replay must carry the occurred_at stored '
                      'on the dead letter — defaulting it to now() is the '
                      're-dating ADR-035 §2.6 says manual replay exists to '
                      'prevent'
        using errcode = '22023';
    end if;

    -- ⚠️ VERBATIM. No override, no clamp, at any age.
    v_at := p_occurred_at;

  elsif v_offline then
    v_at := greatest(least(coalesce(p_occurred_at, v_now), v_now),
                     v_now - interval '72 hours');
  else
    v_at := v_now;
  end if;

  -- ---- 4. the payload -----------------------------------------------------
  if p_id is null then
    raise exception 'record_purchase: the client must generate the purchase id '
                    '— it is the idempotency key (ADR-035 §2.6)'
      using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'record_purchase: lines must be a non-empty json array, '
                    'got %', coalesce(jsonb_typeof(p_lines), 'null')
      using errcode = '22023';
  end if;

  -- ⚠️ VALIDATE BEFORE PRICING, AND NAME THE LINE — 0016's finding, and it has
  -- the same teeth here: the pricing query below joins `product_variant` and
  -- `unit`, and an inner join would DROP a line that resolves to neither and
  -- record a SHORTER delivery than arrived. On this side of the ledger that
  -- does not shortchange a customer, it silently loses stock the shop paid for.
  select format('record_purchase: line %s — %s', v.ord, v.problem)
    into v_problem
    from (
      select e.ord,
             case
               when nullif(e.l->>'variant_id', '') is null
                 then 'variant_id is required'
               when nullif(e.l->>'qty_display', '') is null
                 then 'qty_display is required'
               when nullif(e.l->>'unit_price_net_per_base', '') is null
                 then 'unit_price_net_per_base is required'
               when pv.id is null
                 then format('variant %s is not in this workspace',
                             e.l->>'variant_id')
               when u.code is null
                 then format('unit %L is not in the unit table',
                             coalesce(nullif(e.l->>'qty_display_unit', ''),
                                      pv.purchase_unit_code))
               when u.base_code <> pv.base_unit_code
                 then format('unit %L is measured in %L, but the variant is '
                             'stored in %L — a conversion across dimensions has '
                             'no answer to give (ADR-035 §2.5)',
                             u.code, u.base_code, pv.base_unit_code)
               -- A negative delivery line is a RETURN TO THE PROVIDER, and a
               -- return is a compensating document: `void_transaction` in 0020,
               -- with `reversal_of` set. `stock_batch_qty_positive` would refuse
               -- it anyway, but with a message about a lot rather than about
               -- what the operator did wrong.
               when (e.l->>'qty_display')::numeric <= 0
                 then format('quantity must be positive, got %s — a return to '
                             'the provider is void_transaction, not a negative '
                             'delivery line', e.l->>'qty_display')
               when (e.l->>'unit_price_net_per_base')::numeric < 0
                 then format('unit_price_net_per_base cannot be negative, got %s',
                             e.l->>'unit_price_net_per_base')
               -- The ledger is numeric(14,3) in the base unit. A line that
               -- rounds to no quantity would open a lot of nothing, and 0015
               -- refuses a lot whose receipts do not fill it.
               when round((e.l->>'qty_display')::numeric * u.factor_to_base, 3) <= 0
                 then format('qty_display %s %s rounds to zero in %L',
                             e.l->>'qty_display', u.code, pv.base_unit_code)
               -- ⚠️ AND `qty_display` IS numeric(14,3) TOO, WHICH IS A SECOND
               -- AND NARROWER GATE. 0.0004 kg is 0.4 g — fine in the base unit,
               -- and this arm is the only thing that catches it. Without it the
               -- line prices, reaches `purchase_line`, and is refused there by
               -- `purchase_line_qty_display_agrees` with `23514` and a
               -- constraint name: the operator is told a check failed rather
               -- than which number they keyed is too small to record. Found by
               -- supabase/tests/0018 check 3.11, which asserted the sqlstate and
               -- got the schema's instead of this function's.
               --
               -- It cannot be folded into the arm above. A big `factor_to_base`
               -- makes the base quantity large while the display quantity
               -- vanishes, so on any unit coarser than the base the two arms
               -- disagree — which is exactly the case that reaches here.
               when round((e.l->>'qty_display')::numeric, 3) = 0
                 then format('qty_display %s rounds to zero in %L, which is the '
                             'denomination it would be shown back in',
                             e.l->>'qty_display', u.code)
             end as problem
        from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
        left join public.product_variant pv
          on pv.id = nullif(e.l->>'variant_id', '')::uuid
         and pv.workspace_id = v_ws
        left join public.unit u
          on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''),
                               pv.purchase_unit_code)
    ) v
   where v.problem is not null
   order by v.ord
   limit 1;

  if v_problem is not null then
    raise exception '%', v_problem using errcode = '22023';
  end if;

  -- ---- 5. the money and the expiry  (§2.5 rules 2–6; ADR-017) -------------
  -- THE INVOICE NET IS THE ANCHOR and the tax is the residual — the mirror of
  -- 0016, and the header of this file argues why. Every value is `numeric`;
  -- §2.5 rule 1 forbids float anywhere in the money path.
  --
  -- Expiry is resolved HERE rather than at the batch insert so that one place
  -- decides it, and so the hash below can be taken over a fully normalised line.
  select coalesce(jsonb_agg(to_jsonb(p) order by p.ord), '[]'::jsonb),
         count(*),
         coalesce(sum(p.line_net), 0),
         coalesce(sum(p.line_gross - p.line_net), 0)
    into v_priced, v_n, v_tot_net, v_tot_tax
    from (
      select c.ord,
             c.variant_id,
             c.qty_base,
             c.qty_display,
             c.qty_display_unit,
             c.unit_net,
             c.tax_rate,
             c.line_net,
             round(c.line_net * (1 + c.tax_rate), 2) as line_gross,
             c.expiry_date
        from (
          select r.ord,
                 r.variant_id,
                 r.qty_display,
                 r.qty_display_unit,
                 r.unit_net,
                 r.tax_rate,
                 r.qty_base,
                 round(r.unit_net * r.qty_base, 2) as line_net,
                 -- ADR-017, in order. `coalesce` IS the policy: tier 1 is the
                 -- operator's date and wins unconditionally; tier 2 fires only
                 -- when the family both tracks expiry and has a lifespan, in
                 -- the STORE'S local day; tier 3 is the null both fall through
                 -- to, and it means "not tracked", never "does not expire".
                 coalesce(
                   r.expiry_manual,
                   case
                     when r.track_expiry and r.lifespan_days is not null
                       then (r.received_at at time zone r.tz)::date
                            + r.lifespan_days
                   end
                 ) as expiry_date
            from (
              select e.ord,
                     (e.l->>'variant_id')::uuid                  as variant_id,
                     (e.l->>'qty_display')::numeric              as qty_display,
                     (e.l->>'unit_price_net_per_base')::numeric  as unit_net,
                     pv.tax_rate,
                     coalesce(nullif(e.l->>'qty_display_unit', ''),
                              pv.purchase_unit_code)             as qty_display_unit,
                     round((e.l->>'qty_display')::numeric
                           * u.factor_to_base, 3)                as qty_base,
                     nullif(e.l->>'expiry_date', '')::date       as expiry_manual,
                     pf.track_expiry,
                     pf.default_lifespan_days                    as lifespan_days,
                     v_at                                        as received_at,
                     v_tz                                        as tz
                from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
                join public.product_variant pv
                  on pv.id = (e.l->>'variant_id')::uuid
                 and pv.workspace_id = v_ws
                join public.product_family pf
                  on pf.id = pv.family_id
                 and pf.workspace_id = v_ws
                join public.unit u
                  on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''),
                                       pv.purchase_unit_code)
            ) r
        ) c
    ) p;

  -- Rule 5: the document total is the sum of the ROUNDED lines, never computed
  -- independently of them.
  --
  -- The count is the anti-vacuity guard: every line was proved resolvable in
  -- step 4, so a shorter result here means the pricing query dropped one and the
  -- delivery would be recorded short. ⚠️ NOTE THE THIRD JOIN — this query joins
  -- `product_family` as well, which 0016's does not, so there is one more way
  -- for it to lose a row than there was on the sell side.
  if v_n is distinct from jsonb_array_length(p_lines) then
    raise exception 'record_purchase: priced % of % lines — the pricing query '
                    'dropped one and the delivery would be recorded short',
                    coalesce(v_n, 0), jsonb_array_length(p_lines)
      using errcode = 'internal_error';
  end if;

  -- ---- 6. the payload hash  (§2.6) ----------------------------------------
  -- Over the normalised LINES and nothing else, order-independent, on canonical
  -- numbers rather than the client's formatting — 0016's rule.
  --
  -- ⚠️ `expiry_date` IS IN THE HASH AND THE SALE'S EQUIVALENT HAS NOTHING LIKE
  -- IT. Two deliveries identical but for a use-by date are two different
  -- deliveries: the lots they open sort differently under FEFO and are consumed
  -- in a different order. Leaving it out would let a corrected retry return
  -- `already_recorded` while the shelf kept the first date.
  select md5(string_agg(format('%s|%s|%s|%s',
                               x.variant_id, x.qty_base, x.line_net,
                               coalesce(x.expiry_date::text, '')),
                        E'\n' order by x.variant_id, x.qty_base, x.line_net,
                                       coalesce(x.expiry_date::text, '')))
    into v_hash
    from jsonb_to_recordset(v_priced)
      as x(variant_id uuid, qty_base numeric, line_net numeric,
           expiry_date date);

  -- ---- 7. idempotency  (§2.6's four rows) ---------------------------------
  -- The header is written FIRST and nothing above it wrote anything, so the row
  -- lock this takes is the whole of the concurrency story — 0016's shape, and
  -- 3.7a's idempotency suite already names the blocking pid on THIS table among
  -- the three.
  insert into public.purchase
    (id, workspace_id, location_id, provider_id, occurred_at, total_net,
     total_tax, created_by, recorded_offline, payload_hash,
     replay_of_failed_write_id)
  values
    (p_id, v_ws, p_location_id, p_provider_id, v_at, v_tot_net, v_tot_tax,
     v_user, v_offline, v_hash, p_replay_of_failed_write_id)
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_existing from public.purchase p where p.id = p_id;

    -- Same id, DIFFERENT payload — §2.6's loud case, dead-lettered rather than
    -- retried. ⚠️ THE PROVIDER IS COMPARED TOO, and that is a column 0016 has no
    -- counterpart for: the same delivery filed against a different supplier is a
    -- different document, and letting it return `already_recorded` would leave
    -- the purchase-price memory 0008 derives attributing the cost to whichever
    -- provider the client happened to send first.
    if v_existing.payload_hash is distinct from v_hash
       or v_existing.workspace_id is distinct from v_ws
       or v_existing.location_id  is distinct from p_location_id
       or v_existing.provider_id  is distinct from p_provider_id then
      raise exception
        'purchase % was already recorded with a different payload', p_id
        using errcode = 'TD001',
              detail  = 'This is not a retry. Dead-letter it (ADR-035 §2.6).';
    end if;

    -- A success, not an error.
    return jsonb_build_object(
      'purchase_id',      v_existing.id,
      'workspace_id',     v_existing.workspace_id,
      'location_id',      v_existing.location_id,
      'provider_id',      v_existing.provider_id,
      'occurred_at',      v_existing.occurred_at,
      'recorded_offline', v_existing.recorded_offline,
      'line_count',       (select count(*) from public.purchase_line pl
                            where pl.purchase_id = v_existing.id),
      'batch_count',      (select count(*) from public.stock_batch sb
                            join public.purchase_line pl
                              on pl.id = sb.source_purchase_line_id
                           where pl.purchase_id = v_existing.id),
      'total_net',        v_existing.total_net,
      'total_tax',        v_existing.total_tax,
      'total_gross',      v_existing.total_net + v_existing.total_tax,
      'already_recorded', true
    );
  end if;

  -- ---- 8. the lines, the lots and the receipts  (§2.4) --------------------
  -- ⚠️ ONE BATCH PER LINE, AND THE MOVEMENT THAT FILLS IT, BEFORE THE LOOP
  -- ENDS. This is 4a's rule and it is not decorative: 0015's deferred constraint
  -- refuses at COMMIT any `origin = 'purchase'` lot whose live `purchase`
  -- movements do not sum to `qty_received_base`. A lot and its receipt are one
  -- transaction. Task 4a found the seed itself breaking this rule and fixed the
  -- fixture rather than exempting it — "a delivery IS one transaction, and
  -- `record_purchase` in 0018 will write it as one" is what that finding says,
  -- and this is the file it was written about.
  --
  -- ⚠️ NO ALLOCATOR IS CALLED, AND THAT IS THE STRUCTURAL DIFFERENCE FROM 0016.
  -- `allocate_fefo()` chooses which existing lots to consume; a delivery
  -- CREATES the lot, so there is nothing to choose and no row to lock. This
  -- function therefore takes no `batch_balance` lock at all — the projection is
  -- maintained by `stock_movement_project_balance_trg`, after the insert.
  for v_line in
    select * from jsonb_to_recordset(v_priced)
      as x(ord              integer,
           variant_id       uuid,
           qty_base         numeric,
           qty_display      numeric,
           qty_display_unit text,
           unit_net         numeric,
           tax_rate         numeric,
           line_net         numeric,
           line_gross       numeric,
           expiry_date      date)
     order by x.ord
  loop
    insert into public.purchase_line
      (workspace_id, location_id, purchase_id, variant_id, qty_base,
       qty_display, qty_display_unit, unit_price_net_per_base, line_net,
       tax_amount, tax_rate, expiry_date)
    values
      (v_ws, p_location_id, p_id, v_line.variant_id,
       v_line.qty_base, v_line.qty_display, v_line.qty_display_unit,
       -- The invoice figure, stored as sent. 0016 DERIVES its per-unit column
       -- from the rounded line because the client sends a gross price there and
       -- the net is reached by division; here the client sends this exact
       -- number and it is what the shop was charged. Deriving it back out of
       -- `line_net` would restate the invoice by a rounding artefact.
       v_line.unit_net,
       v_line.line_net,
       v_line.line_gross - v_line.line_net,
       v_line.tax_rate,
       v_line.expiry_date)
    returning id into v_line_id;

    insert into public.stock_batch
      (workspace_id, location_id, variant_id, origin, provider_id,
       source_purchase_line_id, qty_received_base, unit_cost_net_per_base,
       received_at, expiry_date, created_by)
    values
      (v_ws, p_location_id, v_line.variant_id, 'purchase', p_provider_id,
       v_line_id, v_line.qty_base,
       -- The same number as the line's, and deliberately so: `stock_movement`
       -- copies it onto every movement the lot serves and §2.9 divides revenue
       -- against that copy. A lot cost that disagreed with the invoice line it
       -- came from would put the disagreement into every margin figure the shop
       -- ever reads.
       v_line.unit_net,
       v_at, v_line.expiry_date, v_user)
    returning id into v_batch_id;

    -- THE MOVEMENT IS THE RECEIPT. `stock_batch_open_balance_trg` opened the
    -- balance at zero when the lot was inserted; this is what puts the stock on
    -- the shelf, and without it the lot exists, the shop believes it has
    -- nothing, and 0015 refuses the whole transaction at commit.
    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, purchase_id, occurred_at, created_by)
    values
      (v_ws, p_location_id, v_batch_id, v_line.variant_id, 'purchase',
       -- POSITIVE. `stock_movement_sign_follows_reason` refuses anything else
       -- for reason 'purchase', so this sign is the schema's and not a choice.
       v_line.qty_base, v_line.unit_net, p_id, v_at, v_user);
    -- `recorded_at` is left to its `now()` default on all three tables. §2.6:
    -- server-set, never client-supplied. It is the one column an offline write
    -- must NOT backdate.
  end loop;

  return jsonb_build_object(
    'purchase_id',      p_id,
    'workspace_id',     v_ws,
    'location_id',      p_location_id,
    'provider_id',      p_provider_id,
    'occurred_at',      v_at,
    'recorded_offline', v_offline,
    'line_count',       v_n,
    'batch_count',      v_n,
    'total_net',        v_tot_net,
    'total_tax',        v_tot_tax,
    'total_gross',      v_tot_net + v_tot_tax,
    'already_recorded', false
  );
end;
$$;

comment on function public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid) is
  'Records one delivery: header, lines, one lot per line at its landed cost, '
  'one positive movement each, in one transaction. Validates the location in '
  'its own body. Idempotent on the client-generated id. occurred_at is server '
  'now() unless recorded_offline, when it is clamped to [now() - 72h, now()] — '
  '⚠️ EXCEPT on a replay (p_replay_of_failed_write_id non-null, 0025), where it '
  'is kept verbatim, is required, and requires manager. ⚠️ A rejected purchase '
  'is never auto-downgraded (0024), so replaying one compensates nothing. '
  'ADR-035 §2.3, §2.4, §2.6.';

-- The drop above took the grants with it. Re-issued unchanged: the fence for
-- the new argument is in the body (decision 3), not here.
revoke all on function
  public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid) from public;
grant execute on function
  public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. record_waste(), re-signed  (decisions 2, 3, 4, 6)
-- ----------------------------------------------------------------------------
-- Carried forward from `0019` unchanged apart from the same three edits.
-- `supabase/tests/0019_record_waste.sql` — 67 checks — runs against this text.

drop function public.record_waste(uuid, uuid, jsonb, timestamptz, boolean);

create function public.record_waste(
  p_id               uuid,
  p_location_id      uuid,
  p_lines            jsonb,
  p_occurred_at      timestamptz default null,
  p_recorded_offline boolean     default false,
  -- ⚠️ ADDED BY 0025. Null on every ordinary write, which is why this
  -- function's behaviour is unchanged for every existing caller.
  -- Non-null only from replay_failed_write (0026).
  p_replay_of_failed_write_id uuid default null
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
  v_problem   text;
  v_priced    jsonb;
  v_n         integer;
  v_tot_net   numeric(12,2);
  v_tot_tax   numeric(12,2);
  v_hash      text;
  v_inserted  integer;
  v_existing  public.waste%rowtype;
  v_line      record;
  v_allocs    public.fefo_allocation[];
  v_cost_num  numeric;
  v_cost_qty  numeric;
  v_lots      integer;
begin
  -- ---- 1. the location wall, FIRST, exactly as §2.6 writes it --------------
  if p_location_id is null
     or p_location_id not in (select public.my_locations()) then
    raise exception 'location not accessible'
      using errcode = '42501';
  end if;

  if v_user is null then
    raise exception 'record_waste requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- Derived, never a parameter — 0016's argument, unchanged.
  select l.workspace_id into v_ws
    from public.location l
   where l.id = p_location_id;

  -- ---- 2. the timestamps  (§2.6) ------------------------------------------
  -- ⚠️ THE CLAMP MATTERS MORE HERE THAN ANYWHERE ELSE ON THIS SURFACE, because
  -- `occurred_at` is what `product_waste_daily` (0011) buckets on, in the
  -- store's local day. A write-off filed against the wrong day moves a number on
  -- the one report this function exists to feed.
  -- ---- ⚠️ THE REPLAY PATH  (§2.6's exemption; added by 0025) ---------------
  -- A REPLAY IS THE ONLY WRITE IN THIS DATABASE THAT KEEPS THE `occurred_at` IT
  -- WAS HANDED. Both branches below re-date it — the online one to `now()`
  -- outright, the offline one to `now() - 72h` for anything older than three
  -- days — and §2.6 says of exactly that: *"without this exemption every
  -- recovered sale is silently re-dated to the moment of recovery, which is the
  -- precise harm manual replay was chosen to avoid."*
  --
  -- ⚠️ IT IS AN ARGUMENT AND NOT SOMETHING DERIVED, and the reason is not style.
  -- A replay re-runs the original call under the ORIGINAL client uuid (§2.6), so
  -- a `failed_write` row with this document's id always exists by the time the
  -- header lands — which means the marker could have been read off that join
  -- instead. It must not be: an ordinary client RETRY of a dead-lettered id
  -- would then inherit the exemption silently, escaping both the clamp and the
  -- void window without asking for either. The capability has to be visible in
  -- the signature, which is 3.1's finding about grants in a third place.
  if p_replay_of_failed_write_id is not null then

    -- ⚠️ MANAGER, AND THE FENCE IS HERE RATHER THAN ON THE GRANT. These
    -- functions are granted to `authenticated` because every member may sell
    -- (0016's grant note), and that must not change — but a cashier who could
    -- pass this argument could set an arbitrary `occurred_at`, which is the
    -- clamp and the 15-minute window both. §2.7 puts the dead-letter pile behind
    -- manager because it is denominated in unrecorded revenue, and §2.6's own
    -- account of replay is a manager or owner who *"has already reviewed the
    -- dead-letter row and decided deliberately that it should go back in the
    -- books"*. So the argument carries the fence the grant cannot.
    if not public.has_role(v_ws, 'manager') then
      raise exception 'record_waste: only a manager or owner may record a replay '
                      '(ADR-035 §2.7 — the dead-letter pile is unrecorded '
                      'revenue)'
        using errcode = 'TD003';
    end if;

    -- The foreign key proves the dead letter EXISTS. Nothing but this proves it
    -- is ours: `failed_write` is one table across every tenant, and an FK does
    -- not know about workspaces. Same answer as a row that is not there, for
    -- 0021's reason — a caller must not be able to probe another tenant's ids.
    if not exists (select 1 from public.failed_write fw
                    where fw.id = p_replay_of_failed_write_id
                      and fw.workspace_id = v_ws) then
      raise exception 'record_waste: dead letter % not found or not accessible',
                      p_replay_of_failed_write_id
        using errcode = '42501';
    end if;

    -- ⚠️ AND IT HAS TO BE A DEAD LETTER OF THIS KIND. Loud (22023) rather than
    -- 42501, because by here the row is known to be OURS and hiding a client bug
    -- behind a permission error would be the opposite of §2.6's "deliberately
    -- loud" on the same question. Without this a sale could name a PURCHASE dead
    -- letter, and §2.10's report would count that purchase recovered when the
    -- delivery is still missing — the marker would say something false about a
    -- row nobody re-reads.
    if not exists (select 1 from public.failed_write fw
                    where fw.id = p_replay_of_failed_write_id
                      and fw.kind = 'waste') then
      raise exception 'record_waste: dead letter % is not a waste — a replay '
                      'records the kind that was lost (ADR-035 §2.6)',
                      p_replay_of_failed_write_id
        using errcode = '22023';
    end if;

    -- ⚠️ AND `occurred_at` IS REQUIRED HERE, NOT DEFAULTED. Every other path in
    -- this function coalesces a null one into `v_now`. On a replay that would be
    -- the re-dating above, arriving by omission instead of by override — the
    -- quietest possible spelling of the one thing this branch exists to stop.
    if p_occurred_at is null then
      raise exception 'record_waste: a replay must carry the occurred_at stored '
                      'on the dead letter — defaulting it to now() is the '
                      're-dating ADR-035 §2.6 says manual replay exists to '
                      'prevent'
        using errcode = '22023';
    end if;

    -- ⚠️ VERBATIM. No override, no clamp, at any age.
    v_at := p_occurred_at;

  elsif v_offline then
    v_at := greatest(least(coalesce(p_occurred_at, v_now), v_now),
                     v_now - interval '72 hours');
  else
    v_at := v_now;
  end if;

  -- ---- 3. the payload -----------------------------------------------------
  if p_id is null then
    raise exception 'record_waste: the client must generate the waste id — it '
                    'is the idempotency key (ADR-035 §2.6)'
      using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'record_waste: lines must be a non-empty json array, got %',
                    coalesce(jsonb_typeof(p_lines), 'null')
      using errcode = '22023';
  end if;

  -- VALIDATE BEFORE PRICING, AND NAME THE LINE — 0016's and 0018's finding. An
  -- inner join in the pricing query would DROP an unresolvable line, and here
  -- that would under-report a loss: the stock stays on the books and
  -- Desperdicio never hears about it.
  select format('record_waste: line %s — %s', v.ord, v.problem)
    into v_problem
    from (
      select e.ord,
             case
               when nullif(e.l->>'variant_id', '') is null
                 then 'variant_id is required'
               when nullif(e.l->>'qty_display', '') is null
                 then 'qty_display is required'
               when nullif(e.l->>'unit_price_gross_per_base', '') is null
                 then 'unit_price_gross_per_base is required'
               -- ⚠️ REASON-FIRST (§2.8), so its absence is named before the
               -- catalog is consulted. The cast below would raise 22P02 for an
               -- unknown value, which is a clear enough failure to leave alone;
               -- an ABSENT reason is the case a client gets wrong, and it must
               -- not be allowed to default.
               when nullif(e.l->>'reason', '') is null
                 then 'reason is required — Desperdicio is reason-first, and an '
                      'unlabelled loss is not a loss anybody can act on '
                      '(ADR-035 §2.8)'
               when pv.id is null
                 then format('variant %s is not in this workspace',
                             e.l->>'variant_id')
               when u.code is null
                 then format('unit %L is not in the unit table',
                             coalesce(nullif(e.l->>'qty_display_unit', ''),
                                      pv.sell_unit_code))
               when u.base_code <> pv.base_unit_code
                 then format('unit %L is measured in %L, but the variant is '
                             'stored in %L — a conversion across dimensions has '
                             'no answer to give (ADR-035 §2.5)',
                             u.code, u.base_code, pv.base_unit_code)
               -- A negative write-off is stock coming BACK, which is a
               -- compensating document: `void_transaction` in 0020.
               when (e.l->>'qty_display')::numeric <= 0
                 then format('quantity must be positive, got %s — undoing a '
                             'write-off is void_transaction, not a negative '
                             'waste line', e.l->>'qty_display')
               when (e.l->>'unit_price_gross_per_base')::numeric < 0
                 then format('unit_price_gross_per_base cannot be negative, '
                             'got %s', e.l->>'unit_price_gross_per_base')
               when round((e.l->>'qty_display')::numeric * u.factor_to_base, 3) <= 0
                 then format('qty_display %s %s rounds to zero in %L',
                             e.l->>'qty_display', u.code, pv.base_unit_code)
               -- 0018's second gate, and it is inherited rather than
               -- rediscovered: `qty_display` is numeric(14,3) too, so on any
               -- unit coarser than the base a quantity can survive the arm above
               -- and still vanish in the denomination it was keyed in. Without
               -- this the line is refused by `waste_line_qty_display_agrees`
               -- with 23514 and a constraint name.
               when round((e.l->>'qty_display')::numeric, 3) = 0
                 then format('qty_display %s rounds to zero in %L, which is the '
                             'denomination it would be shown back in',
                             e.l->>'qty_display', u.code)
             end as problem
        from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
        left join public.product_variant pv
          on pv.id = nullif(e.l->>'variant_id', '')::uuid
         and pv.workspace_id = v_ws
        left join public.unit u
          on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''),
                               pv.sell_unit_code)
    ) v
   where v.problem is not null
   order by v.ord
   limit 1;

  if v_problem is not null then
    raise exception '%', v_problem using errcode = '22023';
  end if;

  -- ---- 4. the money  (§2.5 rules 2–6) -------------------------------------
  -- THE SHELF PRICE IS THE ANCHOR — the sale's shape, because `line_net` here is
  -- the RETAIL VALUE of the loss and a retail value is a shelf price. Cost does
  -- not appear in this query at all; it is the allocator's, in section 8.
  select coalesce(jsonb_agg(to_jsonb(p) order by p.ord), '[]'::jsonb),
         count(*),
         coalesce(sum(p.line_net), 0),
         coalesce(sum(p.line_gross - p.line_net), 0)
    into v_priced, v_n, v_tot_net, v_tot_tax
    from (
      select c.ord,
             c.variant_id,
             c.qty_base,
             c.qty_display,
             c.qty_display_unit,
             c.tax_rate,
             c.reason,
             c.line_gross,
             round(c.line_gross / (1 + c.tax_rate), 2) as line_net
        from (
          select r.ord,
                 r.variant_id,
                 r.qty_display,
                 r.qty_display_unit,
                 r.tax_rate,
                 r.reason,
                 r.qty_base,
                 round(r.unit_gross * r.qty_base, 2) as line_gross
            from (
              select e.ord,
                     (e.l->>'variant_id')::uuid                    as variant_id,
                     (e.l->>'qty_display')::numeric                as qty_display,
                     (e.l->>'unit_price_gross_per_base')::numeric  as unit_gross,
                     pv.tax_rate,
                     -- The cast is the validation: an unknown cause raises
                     -- 22P02 rather than being filed under a guess.
                     (e.l->>'reason')::public.waste_reason         as reason,
                     coalesce(nullif(e.l->>'qty_display_unit', ''),
                              pv.sell_unit_code)                   as qty_display_unit,
                     round((e.l->>'qty_display')::numeric
                           * u.factor_to_base, 3)                  as qty_base
                from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
                join public.product_variant pv
                  on pv.id = (e.l->>'variant_id')::uuid
                 and pv.workspace_id = v_ws
                join public.unit u
                  on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''),
                                       pv.sell_unit_code)
            ) r
        ) c
    ) p;

  -- Rule 5, and the anti-vacuity guard on the pricing query — 0016's shape.
  if v_n is distinct from jsonb_array_length(p_lines) then
    raise exception 'record_waste: priced % of % lines — the pricing query '
                    'dropped one and the write-off would under-report the loss',
                    coalesce(v_n, 0), jsonb_array_length(p_lines)
      using errcode = 'internal_error';
  end if;

  -- ---- 5. the payload hash  (§2.6) ----------------------------------------
  -- ⚠️ `reason` IS IN THE HASH. Desperdicio's entire output is grouped by it, so
  -- the same quantity of the same product written off as `caducado` rather than
  -- `robo o faltante` is a DIFFERENT document — a corrected retry must raise
  -- rather than return `already_recorded` over the first cause. This is the same
  -- argument `0018` makes for `expiry_date`.
  select md5(string_agg(format('%s|%s|%s|%s',
                               x.variant_id, x.qty_base, x.line_gross, x.reason),
                        E'\n' order by x.variant_id, x.qty_base, x.line_gross,
                                       x.reason))
    into v_hash
    from jsonb_to_recordset(v_priced)
      as x(variant_id uuid, qty_base numeric, line_gross numeric, reason text);

  -- ---- 6. idempotency  (§2.6's four rows) ---------------------------------
  insert into public.waste
    (id, workspace_id, location_id, occurred_at, total_net, total_tax,
     created_by, recorded_offline, payload_hash, replay_of_failed_write_id)
  values
    (p_id, v_ws, p_location_id, v_at, v_tot_net, v_tot_tax,
     v_user, v_offline, v_hash, p_replay_of_failed_write_id)
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select * into v_existing from public.waste w where w.id = p_id;

    if v_existing.payload_hash is distinct from v_hash
       or v_existing.workspace_id is distinct from v_ws
       or v_existing.location_id  is distinct from p_location_id then
      raise exception
        'waste % was already recorded with a different payload', p_id
        using errcode = 'TD001',
              detail  = 'This is not a retry. Dead-letter it (ADR-035 §2.6).';
    end if;

    return jsonb_build_object(
      'waste_id',         v_existing.id,
      'workspace_id',     v_existing.workspace_id,
      'location_id',      v_existing.location_id,
      'occurred_at',      v_existing.occurred_at,
      'recorded_offline', v_existing.recorded_offline,
      'line_count',       (select count(*) from public.waste_line wl
                            where wl.waste_id = v_existing.id),
      'total_net',        v_existing.total_net,
      'total_tax',        v_existing.total_tax,
      'total_gross',      v_existing.total_net + v_existing.total_tax,
      'already_recorded', true
    );
  end if;

  -- ---- 7. the lines and the ledger  (§2.4) --------------------------------
  -- ⚠️ ALLOCATE FIRST, THEN WRITE THE LINE. The reverse of 0016, and forced: the
  -- line carries a cost that is not known until the allocator has said which
  -- lots it took, and 0003's immutability trigger means there is no second pass.
  -- The movements are written inside the same loop, after the line, so the whole
  -- document is one transaction and `allocate_fefo()`'s locks are still held
  -- (0010, task 1.8).
  --
  -- ⚠️ NO AVAILABILITY CHECK, AND NO ENFORCEMENT LOOKUP AT ALL. Settled by the
  -- owner 2026-09-04 — see the header. A write-off larger than the shelf holds
  -- overdraws the lot or opens an `adjustment` one, exactly as an unenforced
  -- sale does, and the debt stays visible as a negative balance.
  for v_line in
    select * from jsonb_to_recordset(v_priced)
      as x(ord              integer,
           variant_id       uuid,
           qty_base         numeric,
           qty_display      numeric,
           qty_display_unit text,
           tax_rate         numeric,
           reason           text,
           line_gross       numeric,
           line_net         numeric)
     order by x.ord
  loop
    -- The allocation is taken ONCE, into an array of the allocator's own
    -- composite type, because it is wanted twice: the weighted mean below and
    -- one movement per lot after the line. Calling `allocate_fefo()` a second
    -- time would not re-read the same lots — the first call already moved the
    -- balances it locked.
    --
    -- `v_at` is passed, never `now()`: a shortfall OPENS a lot, and a lot
    -- received today would sort ahead of real stock in the FEFO order of every
    -- offline write-off flushed late.
    select coalesce(array_agg(a.*), '{}'),
           coalesce(sum(a.qty_base * a.unit_cost_net_per_base), 0),
           coalesce(sum(a.qty_base), 0),
           count(*)
      into v_allocs, v_cost_num, v_cost_qty, v_lots
      from public.allocate_fefo(v_ws, p_location_id, v_line.variant_id,
                                v_line.qty_base, v_user, v_at) a;

    -- The allocator always returns at least one row for a positive quantity —
    -- it overdraws or opens a lot rather than returning nothing (0010). If it
    -- ever returns none, the division below is null and `waste_line`'s NOT NULL
    -- would raise a message about a column instead of about the allocation.
    if v_lots = 0 or coalesce(v_cost_qty, 0) = 0 then
      raise exception 'record_waste: the allocator returned no lots for variant '
                      '% — a write-off cannot be costed against nothing',
                      v_line.variant_id
        using errcode = 'internal_error';
    end if;

    insert into public.waste_line
      (workspace_id, location_id, waste_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount,
       tax_rate, reason, unit_cost_net_per_base)
    values
      (v_ws, p_location_id, p_id, v_line.variant_id,
       v_line.qty_base, v_line.qty_display, v_line.qty_display_unit,
       -- Derived from the ROUNDED line net, 0016's rule: the line is the
       -- authority and this column reads it back per unit.
       round(v_line.line_net / v_line.qty_base, 6),
       v_line.line_net,
       v_line.line_gross - v_line.line_net,
       v_line.tax_rate,
       v_line.reason::public.waste_reason,
       -- THE QUANTITY-WEIGHTED MEAN of what the allocator actually took. 0011's
       -- header documents this shape and `supabase/checks/0011` reconciles it
       -- against the per-lot costs on the movements, so the rounding here is
       -- load-bearing for a check that already exists.
       round(v_cost_num / v_cost_qty, 6));

    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, waste_id, occurred_at, created_by)
    select v_ws, p_location_id, a.batch_id, v_line.variant_id, 'waste',
           -- NEGATIVE. `stock_movement_sign_follows_reason` refuses anything
           -- else for reason 'waste', so this sign is the schema's.
           -a.qty_base, a.unit_cost_net_per_base, p_id, v_at, v_user
      from unnest(v_allocs) a;
    -- `recorded_at` is left to its `now()` default. §2.6: server-set, never
    -- client-supplied, and the one column an offline write must not backdate.
  end loop;

  return jsonb_build_object(
    'waste_id',         p_id,
    'workspace_id',     v_ws,
    'location_id',      p_location_id,
    'occurred_at',      v_at,
    'recorded_offline', v_offline,
    'line_count',       v_n,
    'total_net',        v_tot_net,
    'total_tax',        v_tot_tax,
    'total_gross',      v_tot_net + v_tot_tax,
    'already_recorded', false
  );
end;
$$;

comment on function public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid) is
  'Records one waste event: header, lines, FEFO allocation at cost, one '
  'negative movement per lot, in one transaction. Records UNCONDITIONALLY — no '
  'availability check, because the goods are already in the bin (§2.6, settled '
  '2026-09-04). occurred_at is server now() unless recorded_offline, when it is '
  'clamped to [now() - 72h, now()] — ⚠️ EXCEPT on a replay '
  '(p_replay_of_failed_write_id non-null, 0025), where it is kept verbatim, is '
  'required, and requires manager. ADR-035 §2.4, §2.6, §2.9.';

-- The drop above took the grants with it. Re-issued unchanged: the fence for
-- the new argument is in the body (decision 3), not here.
revoke all on function
  public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid) from public;
grant execute on function
  public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. record_transfer(), re-signed  (decisions 2, 3, 4, 5, 6)
-- ----------------------------------------------------------------------------
-- ⚠️ THIS ONE TAKES THE ARGUMENT AND MARKS NOTHING — decision 5. §2.4 gives a
-- transfer no document header, so there is no row to carry the column; the
-- argument buys the TIMESTAMP half alone, and that half matters more here than
-- anywhere else, because `v_at` stamps `received_at` on every destination lot
-- (`0020:310`) and `received_at` is that store's FEFO tiebreak.
--
-- Carried forward from `0020` unchanged apart from the signature and the branch.
-- `supabase/tests/0020_record_transfer.sql` runs against this text.

drop function public.record_transfer(uuid, uuid, uuid, jsonb, timestamptz, boolean);

create function public.record_transfer(
  p_id                 uuid,
  p_from_location_id   uuid,
  p_to_location_id     uuid,
  p_lines              jsonb,
  p_occurred_at        timestamptz default null,
  p_recorded_offline   boolean     default false,
  -- ⚠️ ADDED BY 0025. Null on every ordinary write, which is why this
  -- function's behaviour is unchanged for every existing caller.
  -- Non-null only from replay_failed_write (0026).
  p_replay_of_failed_write_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_ws        uuid;
  v_ws_to     uuid;
  v_offline   boolean := coalesce(p_recorded_offline, false);
  v_now       timestamptz := now();
  v_at        timestamptz;
  v_problem   text;
  v_lines     jsonb;
  v_n         integer;
  v_hash      text;
  v_seen_hash text;
  v_seen_n    integer;
  v_seen_from uuid;
  v_seen_to   uuid;
  v_seen_ws   uuid;
  v_seen_at   timestamptz;
  v_from_n    integer;
  v_to_n      integer;
  v_ws_n      integer;
  v_out_lots  integer;
  v_line      record;
  v_enforce   boolean;
  v_vname     text;
  v_avail     numeric;
  v_legs      integer;
  v_lots      integer := 0;
begin
  -- ---- 1. the location wall, FIRST, and it is DOUBLED  (§2.6) -------------
  -- §2.6's four lines, spelled twice because this transaction spans two stores
  -- and §2.6 says both are checked. The origin is named first so a caller who
  -- holds neither is told about the one they were shipping FROM.
  if p_from_location_id is null
     or p_from_location_id not in (select public.my_locations()) then
    raise exception 'location not accessible'
      using errcode = '42501',
            detail  = 'The origin location is not one this caller is assigned to '
                      '(ADR-035 §2.6).';
  end if;

  if p_to_location_id is null
     or p_to_location_id not in (select public.my_locations()) then
    raise exception 'location not accessible'
      using errcode = '42501',
            detail  = 'The destination location is not one this caller is '
                      'assigned to (ADR-035 §2.6).';
  end if;

  if v_user is null then
    raise exception 'record_transfer requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- ⚠️ A COMPARISON, NOT A DERIVATION — 4b-i named this function as the one
  -- that cannot derive. Two locations the caller holds may still belong to two
  -- workspaces if this caller is a member of both, and a transfer between them
  -- would move stock across a tenant boundary with every access check passed.
  select l.workspace_id into v_ws
    from public.location l where l.id = p_from_location_id;
  select l.workspace_id into v_ws_to
    from public.location l where l.id = p_to_location_id;

  if v_ws is null or v_ws_to is null or v_ws <> v_ws_to then
    raise exception 'record_transfer: the origin and the destination are in '
                    'different workspaces — stock does not cross a tenant '
                    'boundary (ADR-035 §2.3, §2.6)'
      using errcode = '42501';
  end if;

  -- The allocator refuses this too (0005), with a message about allocation. It
  -- is here as well so the caller hears about the shipment they described
  -- rather than about a ledger primitive they never called.
  if p_from_location_id = p_to_location_id then
    raise exception 'record_transfer: the origin and the destination are the '
                    'same location — a transfer to itself would write a matched '
                    'pair against two lots at one store and invent a batch'
      using errcode = '22023';
  end if;

  -- ---- 2. the timestamps  (§2.6) ------------------------------------------
  -- ⚠️ This is the value that stamps `received_at` on every destination lot
  -- (0010), so it sets that store's FEFO tiebreak and not merely a report
  -- bucket. The clamp is 0016's, unchanged.
  -- ---- ⚠️ THE REPLAY PATH  (§2.6's exemption; added by 0025) ---------------
  -- A REPLAY IS THE ONLY WRITE IN THIS DATABASE THAT KEEPS THE `occurred_at` IT
  -- WAS HANDED. Both branches below re-date it — the online one to `now()`
  -- outright, the offline one to `now() - 72h` for anything older than three
  -- days — and §2.6 says of exactly that: *"without this exemption every
  -- recovered sale is silently re-dated to the moment of recovery, which is the
  -- precise harm manual replay was chosen to avoid."*
  --
  -- ⚠️ IT IS AN ARGUMENT AND NOT SOMETHING DERIVED, and the reason is not style.
  -- A replay re-runs the original call under the ORIGINAL client uuid (§2.6), so
  -- a `failed_write` row with this document's id always exists by the time the
  -- header lands — which means the marker could have been read off that join
  -- instead. It must not be: an ordinary client RETRY of a dead-lettered id
  -- would then inherit the exemption silently, escaping both the clamp and the
  -- void window without asking for either. The capability has to be visible in
  -- the signature, which is 3.1's finding about grants in a third place.
  if p_replay_of_failed_write_id is not null then

    -- ⚠️ MANAGER, AND THE FENCE IS HERE RATHER THAN ON THE GRANT. These
    -- functions are granted to `authenticated` because every member may sell
    -- (0016's grant note), and that must not change — but a cashier who could
    -- pass this argument could set an arbitrary `occurred_at`, which is the
    -- clamp and the 15-minute window both. §2.7 puts the dead-letter pile behind
    -- manager because it is denominated in unrecorded revenue, and §2.6's own
    -- account of replay is a manager or owner who *"has already reviewed the
    -- dead-letter row and decided deliberately that it should go back in the
    -- books"*. So the argument carries the fence the grant cannot.
    if not public.has_role(v_ws, 'manager') then
      raise exception 'record_transfer: only a manager or owner may record a replay '
                      '(ADR-035 §2.7 — the dead-letter pile is unrecorded '
                      'revenue)'
        using errcode = 'TD003';
    end if;

    -- The foreign key proves the dead letter EXISTS. Nothing but this proves it
    -- is ours: `failed_write` is one table across every tenant, and an FK does
    -- not know about workspaces. Same answer as a row that is not there, for
    -- 0021's reason — a caller must not be able to probe another tenant's ids.
    if not exists (select 1 from public.failed_write fw
                    where fw.id = p_replay_of_failed_write_id
                      and fw.workspace_id = v_ws) then
      raise exception 'record_transfer: dead letter % not found or not accessible',
                      p_replay_of_failed_write_id
        using errcode = '42501';
    end if;

    -- ⚠️ AND IT HAS TO BE A DEAD LETTER OF THIS KIND. Loud (22023) rather than
    -- 42501, because by here the row is known to be OURS and hiding a client bug
    -- behind a permission error would be the opposite of §2.6's "deliberately
    -- loud" on the same question. Without this a sale could name a PURCHASE dead
    -- letter, and §2.10's report would count that purchase recovered when the
    -- delivery is still missing — the marker would say something false about a
    -- row nobody re-reads.
    if not exists (select 1 from public.failed_write fw
                    where fw.id = p_replay_of_failed_write_id
                      and fw.kind = 'transfer') then
      raise exception 'record_transfer: dead letter % is not a transfer — a replay '
                      'records the kind that was lost (ADR-035 §2.6)',
                      p_replay_of_failed_write_id
        using errcode = '22023';
    end if;

    -- ⚠️ AND `occurred_at` IS REQUIRED HERE, NOT DEFAULTED. Every other path in
    -- this function coalesces a null one into `v_now`. On a replay that would be
    -- the re-dating above, arriving by omission instead of by override — the
    -- quietest possible spelling of the one thing this branch exists to stop.
    if p_occurred_at is null then
      raise exception 'record_transfer: a replay must carry the occurred_at stored '
                      'on the dead letter — defaulting it to now() is the '
                      're-dating ADR-035 §2.6 says manual replay exists to '
                      'prevent'
        using errcode = '22023';
    end if;

    -- ⚠️ VERBATIM. No override, no clamp, at any age.
    v_at := p_occurred_at;

  elsif v_offline then
    v_at := greatest(least(coalesce(p_occurred_at, v_now), v_now),
                     v_now - interval '72 hours');
  else
    v_at := v_now;
  end if;

  -- ---- 3. the payload -----------------------------------------------------
  if p_id is null then
    raise exception 'record_transfer: the client must generate the transfer id '
                    '— it is the idempotency key and the transfer_group_id that '
                    'pairs the legs (ADR-035 §2.6, §2.4)'
      using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'record_transfer: lines must be a non-empty json array, got %',
                    coalesce(jsonb_typeof(p_lines), 'null')
      using errcode = '22023';
  end if;

  -- VALIDATE EVERY LINE BEFORE MOVING ANY STOCK, AND NAME THE LINE — 0016's
  -- finding, inherited. An inner join with nothing in front of it DROPS an
  -- unresolvable line, and here that would ship a van the ledger only half
  -- knows about: stock missing at the origin with no record of where it went.
  select format('record_transfer: line %s — %s', v.ord, v.problem)
    into v_problem
    from (
      select e.ord,
             case
               when nullif(e.l->>'variant_id', '') is null
                 then 'variant_id is required'
               when nullif(e.l->>'qty_display', '') is null
                 then 'qty_display is required'
               when pv.id is null
                 then format('variant %s is not in this workspace',
                             e.l->>'variant_id')
               when u.code is null
                 then format('unit %L is not in the unit table',
                             coalesce(nullif(e.l->>'qty_display_unit', ''),
                                      pv.sell_unit_code))
               when u.base_code <> pv.base_unit_code
                 then format('unit %L is measured in %L, but the variant is '
                             'stored in %L — a conversion across dimensions has '
                             'no answer to give (ADR-035 §2.5)',
                             u.code, u.base_code, pv.base_unit_code)
               -- A negative leg is a transfer the other way. It is not spelled
               -- as a sign here, because the pair of movements is generated from
               -- the direction of the ARGUMENTS: swap the two locations.
               when (e.l->>'qty_display')::numeric <= 0
                 then format('quantity must be positive, got %s — a transfer '
                             'back is a transfer with the two locations '
                             'swapped, not a negative line',
                             e.l->>'qty_display')
               when round((e.l->>'qty_display')::numeric * u.factor_to_base, 3) <= 0
                 then format('qty_display %s %s rounds to zero in %L',
                             e.l->>'qty_display', u.code, pv.base_unit_code)
               -- ⚠️ THE DUPLICATE-VARIANT RULE, and it is this function's alone.
               -- The ledger keeps movements per LOT, so two lines for one
               -- variant are indistinguishable on the way back and the
               -- recomputed idempotency hash could not tell [A 2, A 3] from
               -- [A 5]. Refused rather than silently merged.
               when count(*) over (partition by nullif(e.l->>'variant_id', '')::uuid) > 1
                 then format('variant %s appears on more than one line — a '
                             'transfer has no line table (ADR-035 §2.4), so the '
                             'ledger cannot tell two lines apart afterwards. '
                             'Merge them into one line',
                             e.l->>'variant_id')
             end as problem
        from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
        left join public.product_variant pv
          on pv.id = nullif(e.l->>'variant_id', '')::uuid
         and pv.workspace_id = v_ws
        left join public.unit u
          on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''),
                               pv.sell_unit_code)
    ) v
   where v.problem is not null
   order by v.ord
   limit 1;

  if v_problem is not null then
    raise exception '%', v_problem using errcode = '22023';
  end if;

  -- ---- 4. the normalised lines  (§2.6) ------------------------------------
  -- 4b-i's rule: canonical base-unit quantities, taken AFTER unit conversion,
  -- ordered by content. `2` and `2.00` agree and `750 g` and `0.750 kg` agree.
  -- There is no money on a transfer, so the normalised line is the whole of it.
  select coalesce(jsonb_agg(to_jsonb(c) order by c.ord), '[]'::jsonb), count(*)
    into v_lines, v_n
    from (
      select e.ord,
             (e.l->>'variant_id')::uuid                     as variant_id,
             (e.l->>'qty_display')::numeric                 as qty_display,
             coalesce(nullif(e.l->>'qty_display_unit', ''),
                      pv.sell_unit_code)                    as qty_display_unit,
             round((e.l->>'qty_display')::numeric
                   * u.factor_to_base, 3)::numeric(14,3)    as qty_base
        from jsonb_array_elements(p_lines) with ordinality as e(l, ord)
        join public.product_variant pv
          on pv.id = (e.l->>'variant_id')::uuid
         and pv.workspace_id = v_ws
        join public.unit u
          on u.code = coalesce(nullif(e.l->>'qty_display_unit', ''),
                               pv.sell_unit_code)
    ) c;

  -- The anti-vacuity guard on the query above — 0016's shape, and it is not
  -- ceremony: the joins here are inner, and the pre-flight is the only thing
  -- standing between a dropped line and a half-shipped van.
  if v_n is distinct from jsonb_array_length(p_lines) then
    raise exception 'record_transfer: normalised % of % lines — the query '
                    'dropped one and the shipment would be recorded short',
                    coalesce(v_n, 0), jsonb_array_length(p_lines)
      using errcode = 'internal_error';
  end if;

  -- ⚠️ THE HASH IS OVER (variant, base quantity) AND MUST BE RECOMPUTABLE FROM
  -- THE LEDGER. Every term in it is one the `transfer_out` movements can give
  -- back; nothing that is not — the display unit, the ordinal, the moment — may
  -- enter, or a retry could never match. Section 5 recomputes it.
  select md5(string_agg(format('%s|%s', x.variant_id, x.qty_base),
                        E'\n' order by x.variant_id))
    into v_hash
    from jsonb_to_recordset(v_lines) as x(variant_id uuid, qty_base numeric(14,3));

  -- ---- 5. idempotency  (§2.6's four rows) ---------------------------------
  -- ⚠️ THE LOCK IS TAKEN BEFORE THE LEDGER IS READ, and it is what stands in for
  -- the primary-key conflict the other three RPCs get free. See the header.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));

  -- THE RECOMPUTATION. Every term is one the ledger can give back: the variant
  -- and the base quantity, summed over the lots the allocator took. The
  -- `transfer_out` legs are the authority because they are what the origin
  -- actually gave up, and the payload is what the origin was asked for.
  select md5(string_agg(format('%s|%s', g.variant_id, g.qty_base),
                        E'\n' order by g.variant_id)),
         count(*)
    into v_seen_hash, v_seen_n
    from (
      select m.variant_id, sum(-m.qty_base)::numeric(14,3) as qty_base
        from public.stock_movement m
       where m.transfer_group_id = p_id
         and m.reason = 'transfer_out'
       group by m.variant_id
    ) g;

  -- The two stores and the moment, read off the legs themselves rather than off
  -- the grouped hash query. ⚠️ THE DISTINCT COUNTS ARE THE POINT: a group whose
  -- out-legs sit at more than one store is not a shipment this function ever
  -- wrote, and taking any single value from it would accept it as a retry of
  -- whichever row came back first.
  select count(distinct m.location_id), (array_agg(m.location_id))[1],
         count(distinct m.workspace_id), (array_agg(m.workspace_id))[1],
         min(m.occurred_at), count(*)
    into v_from_n, v_seen_from, v_ws_n, v_seen_ws, v_seen_at, v_out_lots
    from public.stock_movement m
   where m.transfer_group_id = p_id
     and m.reason = 'transfer_out';

  select count(distinct m.location_id), (array_agg(m.location_id))[1]
    into v_to_n, v_seen_to
    from public.stock_movement m
   where m.transfer_group_id = p_id
     and m.reason = 'transfer_in';

  if coalesce(v_seen_n, 0) > 0 then
    -- The same three comparisons `0016` makes, minus the one that has no home:
    -- the hash, the workspace and BOTH locations. A transfer id re-sent to a
    -- different pair of stores is not a retry, and returning the first
    -- shipment's summary for it would describe a van the caller never sent.
    if v_seen_hash    is distinct from v_hash
       or v_ws_n      is distinct from 1
       or v_from_n    is distinct from 1
       or v_to_n      is distinct from 1
       or v_seen_ws   is distinct from v_ws
       or v_seen_from is distinct from p_from_location_id
       or v_seen_to   is distinct from p_to_location_id then
      raise exception
        'transfer % was already recorded with a different payload', p_id
        using errcode = 'TD001',
              detail  = 'This is not a retry. Dead-letter it (ADR-035 §2.6).';
    end if;

    return jsonb_build_object(
      'transfer_id',       p_id,
      'workspace_id',      v_seen_ws,
      'from_location_id',  v_seen_from,
      'to_location_id',    v_seen_to,
      'occurred_at',       v_seen_at,
      -- ⚠️ NULL, AND IT IS NOT AN OVERSIGHT. `recorded_offline` is a column on
      -- the three document headers; a transfer has no header, so the ledger
      -- genuinely does not know whether the shipment it is reading back was
      -- filed from a queue. Returning `false` would be a claim this function
      -- cannot support, and the caller already knows what it sent.
      'recorded_offline',  null,
      'line_count',        v_seen_n,
      'lot_count',         v_out_lots,
      'already_recorded',  true
    );
  end if;

  -- ---- 6. the shipment  (§2.4) --------------------------------------------
  for v_line in
    select * from jsonb_to_recordset(v_lines)
      as x(ord              integer,
           variant_id       uuid,
           qty_display      numeric,
           qty_display_unit text,
           qty_base         numeric(14,3))
     order by x.ord
  loop
    -- ---- 6a. THE AVAILABILITY CHECK — BUILT, DORMANT  (§2.6) -------------
    -- 0017's block, re-spelled against the ORIGIN, which is the only location
    -- that can be short. Owner, 2026-09-04: this function gets the check where
    -- `record_waste` does not, because an unbacked transfer does not keep its
    -- debt in one store — it invents a lot at the destination. See the header.
    --
    -- Fail OPEN when the workspace has no settings row, deliberately and only
    -- here, exactly as 0017 argues.
    select coalesce(pv.enforce_stock, ws.enforce_stock_default, false), pv.name
      into v_enforce, v_vname
      from public.product_variant pv
      left join public.workspace_setting ws on ws.workspace_id = v_ws
     where pv.id = v_line.variant_id;

    if v_enforce and not v_offline then
      -- LOCK, then evaluate — and the predicate and the order are
      -- `allocate_fefo()`'s VERBATIM (0010), so this statement takes exactly
      -- the rows `allocate_transfer()` is about to take, one statement earlier.
      -- No new lock and NO NEW LOCK ORDERING: the destination side of a
      -- transfer takes none at all, because it only ever INSERTS fresh lots.
      with locked as (
        select bb.remaining_base
          from public.batch_balance bb
         where bb.workspace_id   = v_ws
           and bb.location_id    = p_from_location_id
           and bb.variant_id     = v_line.variant_id
           and bb.remaining_base > 0
         order by bb.expiry_date asc nulls last, bb.received_at asc,
                  bb.batch_id asc
         for update
      )
      select coalesce(sum(remaining_base), 0) into v_avail from locked;

      if v_avail < v_line.qty_base then
        raise exception
          'record_transfer: line % — % has % available at the origin and the '
          'shipment asks for %. Stock enforcement is on for this product '
          '(ADR-035 §2.6)',
          v_line.ord, coalesce(v_vname, v_line.variant_id::text),
          v_avail, v_line.qty_base
          using errcode = 'TD002';
      end if;
    end if;

    -- ⚠️ THE CALLER WRITES NOTHING HERE. `allocate_transfer()` does the entire
    -- paired write — the origin's FEFO withdrawal, one destination lot per
    -- origin lot carrying cost and expiry forward, and both movements under
    -- this `transfer_group_id` (0005, 0010). One destination lot per ORIGIN lot
    -- and not one per line: a shipment satisfied from three lots has three
    -- costs and three expiry dates, and one merged batch would lose both.
    --
    -- `p_id` IS the transfer_group_id. The client's idempotency key and the id
    -- that pairs the legs are the same value, because §2.4 gives a transfer no
    -- other identity to be known by.
    --
    -- `v_at` is passed, never `now()` — it stamps `received_at` on every lot
    -- this opens at the destination, which is that store's FEFO tiebreak.
    select count(*) into v_legs
      from public.allocate_transfer(v_ws, p_from_location_id, p_to_location_id,
                                    v_line.variant_id, v_line.qty_base,
                                    p_id, v_at, v_user) a;

    -- The allocator always returns at least one leg for a positive quantity —
    -- it overdraws or opens a lot rather than returning nothing (0010). Zero
    -- means the shipment recorded a line that moved no stock, which no
    -- constraint in the schema would notice.
    if coalesce(v_legs, 0) = 0 then
      raise exception 'record_transfer: the allocator returned no lots for '
                      'variant % — the line would be recorded as a shipment '
                      'that moved nothing', v_line.variant_id
        using errcode = 'internal_error';
    end if;

    v_lots := v_lots + v_legs;
  end loop;

  return jsonb_build_object(
    'transfer_id',      p_id,
    'workspace_id',     v_ws,
    'from_location_id', p_from_location_id,
    'to_location_id',   p_to_location_id,
    'occurred_at',      v_at,
    'recorded_offline', v_offline,
    'line_count',       v_n,
    'lot_count',        v_lots,
    'already_recorded', false
  );
end;
$$;

comment on function public.record_transfer(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid) is
  'Moves stock between two locations of one workspace: FEFO out of the source '
  'at its own cost, one lot per leg into the destination at the same cost, '
  'paired movements sharing a transfer_group_id, in one transaction. No '
  'document (§2.4). occurred_at is server now() unless recorded_offline, when '
  'it is clamped to [now() - 72h, now()] — ⚠️ EXCEPT on a replay '
  '(p_replay_of_failed_write_id non-null, 0025), where it is kept verbatim, is '
  'required, and requires manager. ⚠️ The marker itself is NOT stored: a '
  'transfer has no header to store it on, and void_transaction does not accept '
  'the kind. ADR-035 §2.3, §2.4, §2.6.';

-- The drop above took the grants with it. Re-issued unchanged: the fence for
-- the new argument is in the body (decision 3), not here.
revoke all on function
  public.record_transfer(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid) from public;
grant execute on function
  public.record_transfer(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. void_transaction(), replaced  (ADR-035 §2.6's replay exemption; decision 7)
-- ----------------------------------------------------------------------------
-- ⚠️ THE ONE BEHAVIOURAL CHANGE IN THIS FILE THAT AN EXISTING ROW COULD SEE —
-- and no existing row can, because nothing is marked yet. `v_basis` gains one
-- conjunct, and the comment beside it carries §2.6's argument.
--
-- THIS IS THE OWED CHECK FROM 4e-ii-a. `0021` could not enforce the replay
-- exemption and said so; half of its `case` was unfalsifiable because no
-- document existed where `occurred_at` and `recorded_at` could differ in the way
-- a replay makes them differ. The marker above is what makes it falsifiable, and
-- the exemption is enforced in the same migration that ships it, which is what
-- §2.6 asks for: *"replay_failed_write must carry that marker when it ships, and
-- step 4.5 must enforce the exemption at the same time."*
--
-- Signature unchanged, so `create or replace` and no re-grant.

create or replace function public.void_transaction(
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
  -- ⚠️ ADDED BY 0025. See the basis block below.
  v_replayed  boolean;
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
           p.total_net, p.total_tax, p.provider_id,
           p.replay_of_failed_write_id is not null
      into v_ws, v_loc, v_occurred, v_recorded,
           v_offline, v_creator, v_is_rev, v_net, v_tax, v_provider,
           v_replayed
      from public.purchase p
     where p.id = p_id
       and p.location_id in (select public.my_locations());

  elsif p_kind = 'sale' then
    select s.workspace_id, s.location_id, s.occurred_at, s.recorded_at,
           s.recorded_offline, s.created_by, s.reversal_of is not null,
           s.total_net, s.total_tax,
           s.replay_of_failed_write_id is not null
      into v_ws, v_loc, v_occurred, v_recorded,
           v_offline, v_creator, v_is_rev, v_net, v_tax, v_replayed
      from public.sale s
     where s.id = p_id
       and s.location_id in (select public.my_locations());

  else
    select w.workspace_id, w.location_id, w.occurred_at, w.recorded_at,
           w.recorded_offline, w.created_by, w.reversal_of is not null,
           w.total_net, w.total_tax,
           w.replay_of_failed_write_id is not null
      into v_ws, v_loc, v_occurred, v_recorded,
           v_offline, v_creator, v_is_rev, v_net, v_tax, v_replayed
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
    --
    -- ⚠️⚠️ AND A REPLAYED DOCUMENT IS EXEMPT FROM THE OFFLINE HALF (§2.6, added
    -- by 0025 — the marker this clause needs did not exist until then). A replay
    -- keeps its ORIGINAL `occurred_at` and takes a FRESH `recorded_at` at the
    -- moment of recovery, so the offline basis applied blindly would hand a
    -- two-day-old recovered sale a brand-new fifteen minutes of staff
    -- self-service void. §2.6: *"it does not get one: a replayed write's window
    -- is measured from occurred_at, exactly as if the amendment did not exist"*
    -- — which puts it outside any sane window and therefore in manager
    -- territory, and that costs nobody a step, because the only person standing
    -- over a freshly replayed sale is already someone who can void it unfenced.
    v_basis := case when v_offline and not v_replayed
                    then v_recorded
                    else v_occurred end;

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
  'Voids a purchase, sale or waste by writing a COMPENSATING document with '
  'reversal_of set and the mirrored movements — never by mutating the '
  'original, which 0003''s trigger refuses. Idempotent: a re-sent void returns '
  'already_recorded. Enforces ADR-035 §2.7''s fence: staff may void their own '
  'document inside void_window_minutes, manager and owner void anything at any '
  'time, TD003 otherwise. The window reads recorded_at on an offline write and '
  'occurred_at otherwise (§2.6, amended 2026-09-04) — ⚠️ EXCEPT on a REPLAYED '
  'document (replay_of_failed_write_id non-null, 0025), which is exempt from '
  'the offline half and always measured from occurred_at, because a replay '
  'takes a fresh recorded_at and would otherwise be handed a brand-new fifteen '
  'minutes of staff self-service void on a two-day-old sale.';
