-- ============================================================================
-- 0064 — A CORRECTION COUNTS ON THE DAY OF WHAT IT CORRECTS. Plan task `8p`,
-- the owner's ruling of 2026-10-19 (*"Let's follow your recommendation"*), on
-- the blind spot `8g`'s audit of corrections measured that morning:
--
--   Friday's $45 sale, deleted on Monday, put Inicio's *Hoy* at −$45 · 0 ventas
--   — and Números, *tu mejor viernes*, the streak, *Esta semana* and Precios'
--   charts all moved the same $45 from Friday to Monday.
--
-- A void is a second document (`0021`): the original stays, a negated copy
-- with `reversal_of` pointing at it is inserted, and that copy is stamped with
-- the moment of the void. Every daily figure bucketed it on THAT day. The
-- ruling: the shopkeeper's days show what happened on them, and **our side
-- keeps the real timeline** — `recorded_at` on every row, and the monthly
-- export (`transaction_export`, `0033`), which marks each reversal with when it
-- was made. Nothing in this file touches either.
--
-- ⚠️⚠️ WHY IT IS THREE FUNCTIONS AND NOT ONLY TWO VIEWS. A deletion is one
-- document, and moving where the views count it is enough. **A correction is a
-- deletion and a NEW document** — `Corregir` voids, then the capture screen
-- re-keys the lines — and an online write is re-dated to `now()` by the server
-- (`0025`; only an offline write's own time is accepted, clamped to 72 hours).
-- So fixing the views alone would have put the deletion back on Friday and left
-- the corrected sale on Monday: Friday down $45, Monday up $40, for a sale that
-- happened on Friday at $40. The two halves are one failure and land together.
--
--   1. `record_sale`, `record_purchase` and `record_waste` take `p_corrects` —
--      the document this one replaces — and, when it is this store's, stands
--      reversed, and was reversed by the same person, stamp the ORIGINAL's
--      `occurred_at` at any age. The branch sits after the replay exemption and
--      before every other rule; its comment, in each function, is the argument.
--   2. Every daily view counts a reversal on the day of the document it
--      reverses: `product_velocity_daily` and `product_purchases_daily`, which
--      the app reads, and `product_margin_daily` and `product_waste_daily`,
--      which it does not yet — moved in the same file because a figure the
--      shop is shown and a figure we keep must not disagree about which day a
--      correction belongs to (`supabase/checks/0031` already holds the
--      purchases view and the waste view's copy of it equal, row for row).
--
-- ⚠️ A NEW ARGUMENT IS A NEW SIGNATURE, so the three are DROPPED and CREATED,
-- which is `0025`'s decision 6 for `0025`'s reason: `create or replace` cannot
-- add an argument, and an overload would leave the old signature callable
-- beside the new one. The drop takes the grants; they are re-issued below, and
-- `supabase/tests/0025_replay_marker.sql` reads them from the catalog. ⚠️ The
-- callers that name the signature — that suite, `0016`'s, and this file — are
-- the whole list; `replay_failed_write` (`0030`) calls positionally and the new
-- argument's default keeps it working unchanged.
--
-- ⚠️ THE BODIES ARE COPIED, NOT RETYPED: `record_sale` and `record_purchase`
-- from `0025`, `record_waste` from `0057`, each with exactly two edits — the
-- argument and the branch. Their suites (`0016`, `0017`, `0018`, `0019`, `0025`,
-- `0057`) run against this text on every CI run.
--
-- ⚠️⚠️ WHAT IT DOES NOT MOVE, said so nobody assumes it does:
--   * `transaction_export` (`0033`) keeps every row on the day it was recorded
--     — that is the real timeline, and the ruling keeps it on our side. So for
--     a reversal, and only for one, the export's day and the views' day differ;
--     `supabase/checks/0033` says which rows and how many.
--   * Stock movements keep their own times: a void returns the stock at the
--     moment of the void, and a backdated correction takes it at the original's
--     time. Nothing reads stock as of a past day.
--   * Inicio's *Hoy* reads `sale` directly and not a view; the app leaves out a
--     reversal whose original is not in today's window (`takingsFrom`, the same
--     plan task).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. record_sale(), re-signed
-- ----------------------------------------------------------------------------

drop function public.record_sale(uuid, uuid, jsonb, timestamptz, boolean, uuid);

create function public.record_sale(
  p_id               uuid,
  p_location_id      uuid,
  p_lines            jsonb,
  p_occurred_at      timestamptz default null,
  p_recorded_offline boolean     default false,
  -- ⚠️ ADDED BY 0025. Null on every ordinary write, which is why this
  -- function's behaviour is unchanged for every existing caller.
  -- Non-null only from replay_failed_write (0026).
  p_replay_of_failed_write_id uuid default null,
  -- ⚠️ ADDED BY 0064. The document this one replaces — `Corregir` voids a
  -- document and re-keys it, and the re-keyed one is told which it was. Null
  -- on every other write, which is why no existing caller changes.
  p_corrects uuid default null
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

  -- ⚠️⚠️ 0064 — A CORRECTION COUNTS ON THE DAY OF WHAT IT CORRECTS (the
  -- owner's ruling of 2026-10-19, plan task `8p`). Without this branch the
  -- re-keyed sale is dated like any new one, so a Friday sale corrected
  -- on Monday moves to Monday. The time is the ORIGINAL's, read from the
  -- ledger and never from the client, and only when the original is a
  -- sale of this store, stands reversed, and was reversed by the person
  -- re-keying it — `void_transaction`'s own fence, carried over, so this
  -- lets nobody place a document anywhere they could not already have
  -- undone one. ⚠️ At any age: a manager may correct last month. ⚠️ A
  -- correction that does not match falls through to the rules below and
  -- lands like a new sale, which is what every correction did before 0064 —
  -- never an error, because the shopkeeper did nothing wrong.
  elsif p_corrects is not null and exists (
          select 1
            from public.sale o
            join public.sale r
              on  r.reversal_of  = o.id
              and r.workspace_id = o.workspace_id
           where o.id           = p_corrects
             and o.workspace_id = v_ws
             and o.location_id  = p_location_id
             and o.reversal_of is null
             and r.created_by   = v_user) then
    select o.occurred_at into v_at
      from public.sale o
     where o.id = p_corrects;

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

comment on function public.record_sale(uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) is
  'Records one sale: header, lines, FEFO allocation within the location, one '
  'movement per lot, the tax split gross-first with tax as the residual, in one '
  'transaction. Validates the location in its own body — RLS is not running '
  'here. Idempotent on the client-generated id: the same payload returns '
  'already_recorded, a different one raises TD001 for the caller to '
  'dead-letter. occurred_at is server now() unless recorded_offline, when the '
  'client value is clamped to [now() - 72h, now()] — ⚠️ EXCEPT on a replay '
  '(p_replay_of_failed_write_id non-null, 0025), where it is kept verbatim at '
  'any age, is required rather than defaulted, and requires manager — ⚠️ AND '
  'on a correction (p_corrects, 0064): when it names a sale of this store that '
  'stands reversed by the caller, the new sale takes that sale''s occurred_at, '
  'at any age; otherwise the rules above apply. ADR-035 §2.4, §2.5, §2.6.';

revoke all on function
  public.record_sale(uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) from public;
grant execute on function
  public.record_sale(uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. record_purchase(), re-signed
-- ----------------------------------------------------------------------------

drop function public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid);

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
  p_replay_of_failed_write_id uuid default null,
  -- ⚠️ ADDED BY 0064. The document this one replaces — `Corregir` voids a
  -- document and re-keys it, and the re-keyed one is told which it was. Null
  -- on every other write, which is why no existing caller changes.
  p_corrects uuid default null
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

  -- ⚠️⚠️ 0064 — A CORRECTION COUNTS ON THE DAY OF WHAT IT CORRECTS (the
  -- owner's ruling of 2026-10-19, plan task `8p`). Without this branch the
  -- re-keyed delivery is dated like any new one, so a Friday delivery corrected
  -- on Monday moves to Monday. The time is the ORIGINAL's, read from the
  -- ledger and never from the client, and only when the original is a
  -- delivery of this store, stands reversed, and was reversed by the person
  -- re-keying it — `void_transaction`'s own fence, carried over, so this
  -- lets nobody place a document anywhere they could not already have
  -- undone one. ⚠️ At any age: a manager may correct last month. ⚠️ A
  -- correction that does not match falls through to the rules below and
  -- lands like a new delivery, which is what every correction did before 0064 —
  -- never an error, because the shopkeeper did nothing wrong.
  elsif p_corrects is not null and exists (
          select 1
            from public.purchase o
            join public.purchase r
              on  r.reversal_of  = o.id
              and r.workspace_id = o.workspace_id
           where o.id           = p_corrects
             and o.workspace_id = v_ws
             and o.location_id  = p_location_id
             and o.reversal_of is null
             and r.created_by   = v_user) then
    select o.occurred_at into v_at
      from public.purchase o
     where o.id = p_corrects;

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

comment on function public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) is
  'Records one delivery: header, lines, one lot per line at its landed cost, '
  'one positive movement each, in one transaction. Validates the location in '
  'its own body. Idempotent on the client-generated id. occurred_at is server '
  'now() unless recorded_offline, when it is clamped to [now() - 72h, now()] — '
  '⚠️ EXCEPT on a replay (p_replay_of_failed_write_id non-null, 0025), where it '
  'is kept verbatim, is required, and requires manager — ⚠️ AND on a correction '
  '(p_corrects, 0064): when it names a delivery of this store that stands '
  'reversed by the caller, the new delivery takes that one''s occurred_at, at '
  'any age; otherwise the rules above apply. ⚠️ A rejected purchase is never '
  'auto-downgraded (0024), so replaying one compensates nothing. ADR-035 §2.3, '
  '§2.4, §2.6.';

revoke all on function
  public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) from public;
grant execute on function
  public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. record_waste(), re-signed
-- ----------------------------------------------------------------------------

drop function public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid);

create function public.record_waste(
  p_id               uuid,
  p_location_id      uuid,
  p_lines            jsonb,
  p_occurred_at      timestamptz default null,
  p_recorded_offline boolean     default false,
  -- ⚠️ ADDED BY 0025. Null on every ordinary write, which is why this
  -- function's behaviour is unchanged for every existing caller.
  -- Non-null only from replay_failed_write (0026).
  p_replay_of_failed_write_id uuid default null,
  -- ⚠️ ADDED BY 0064. The document this one replaces — `Corregir` voids a
  -- document and re-keys it, and the re-keyed one is told which it was. Null
  -- on every other write, which is why no existing caller changes.
  p_corrects uuid default null
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

  -- ⚠️⚠️ 0064 — A CORRECTION COUNTS ON THE DAY OF WHAT IT CORRECTS (the
  -- owner's ruling of 2026-10-19, plan task `8p`). Without this branch the
  -- re-keyed write-off is dated like any new one, so a Friday write-off corrected
  -- on Monday moves to Monday. The time is the ORIGINAL's, read from the
  -- ledger and never from the client, and only when the original is a
  -- write-off of this store, stands reversed, and was reversed by the person
  -- re-keying it — `void_transaction`'s own fence, carried over, so this
  -- lets nobody place a document anywhere they could not already have
  -- undone one. ⚠️ At any age: a manager may correct last month. ⚠️ A
  -- correction that does not match falls through to the rules below and
  -- lands like a new write-off, which is what every correction did before 0064 —
  -- never an error, because the shopkeeper did nothing wrong.
  elsif p_corrects is not null and exists (
          select 1
            from public.waste o
            join public.waste r
              on  r.reversal_of  = o.id
              and r.workspace_id = o.workspace_id
           where o.id           = p_corrects
             and o.workspace_id = v_ws
             and o.location_id  = p_location_id
             and o.reversal_of is null
             and r.created_by   = v_user) then
    select o.occurred_at into v_at
      from public.waste o
     where o.id = p_corrects;

  else
    -- ⚠️⚠️ 0057: THE DAY SHE PICKS IS KEPT ONLINE TOO, INSIDE THE SAME 72 HOURS.
    -- Until 0057 an online write ignored `p_occurred_at` and took `now()`; only
    -- an offline one kept its date. The owner's new Desperdicio asks *when was it
    -- thrown away* — Hoy, Ayer, Antier — and that answer is the date. ⚠️ **It
    -- grants nothing new**: any client could already claim `p_recorded_offline`
    -- and backdate by the same 72 hours, so the window is the one that existed.
    v_at := greatest(least(coalesce(p_occurred_at, v_now), v_now),
                     v_now - interval '72 hours');
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
               -- ⚠️ 0057: AN EXPIRY DATE IS OPTIONAL, AND WHEN IT IS SENT IT IS A
               -- DATE — `YYYY-MM-DD`, the shape `isoDay` writes. A malformed one
               -- is refused here, by line, rather than by a cast's bare 22007.
               when nullif(e.l->>'expiry_date', '') is not null
                    and (e.l->>'expiry_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                 then format('expiry_date must be a date, YYYY-MM-DD, got %L',
                             e.l->>'expiry_date')
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
             c.expiry_date,
             c.line_gross,
             round(c.line_gross / (1 + c.tax_rate), 2) as line_net
        from (
          select r.ord,
                 r.variant_id,
                 r.qty_display,
                 r.qty_display_unit,
                 r.tax_rate,
                 r.reason,
                 r.expiry_date,
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
                     nullif(e.l->>'expiry_date', '')::date         as expiry_date,
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
  --
  -- ⚠️ 0057: SO IS THE EXPIRY DATE, AND ONLY WHEN THERE IS ONE. A line without
  -- it hashes exactly as it did before 0057, which is what keeps every write
  -- already in a phone's queue — and every dead letter a manager may replay —
  -- recognisable as itself on a retry.
  select md5(string_agg(format('%s|%s|%s|%s',
                               x.variant_id, x.qty_base, x.line_gross, x.reason)
                          || coalesce('|' || x.expiry_date::text, ''),
                        E'\n' order by x.variant_id, x.qty_base, x.line_gross,
                                       x.reason, x.expiry_date))
    into v_hash
    from jsonb_to_recordset(v_priced)
      as x(variant_id uuid, qty_base numeric, line_gross numeric, reason text,
           expiry_date date);

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
           expiry_date      date,
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
       tax_rate, reason, unit_cost_net_per_base, expiry_date)
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
       round(v_cost_num / v_cost_qty, 6),
       v_line.expiry_date);

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

comment on function public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) is
  'Records one waste event: header, lines, FEFO allocation at cost, one '
  'negative movement per lot, in one transaction. Records UNCONDITIONALLY — no '
  'availability check, because the goods are already in the bin (§2.6, settled '
  '2026-09-04). occurred_at is the day the caller picked, online or offline, '
  'clamped to [now() - 72h, now()] (0057; before it, online was always now()) '
  '— ⚠️ EXCEPT on a replay (p_replay_of_failed_write_id non-null, 0025), where '
  'it is kept verbatim, is required, and requires manager — ⚠️ AND on a '
  'correction (p_corrects, 0064): when it names a write-off of this store that '
  'stands reversed by the caller, the new one takes that one''s occurred_at, at '
  'any age; otherwise the rules above apply. Each line may carry an expiry_date '
  '(0057). ADR-035 §2.4, §2.6, §2.9.';

revoke all on function
  public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) from public;
grant execute on function
  public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. the four daily views: a reversal counts on its original's day
-- ----------------------------------------------------------------------------
-- The last applied text of each — `0032`'s for velocity and purchases, `0012`'s
-- for margin and waste, the last wrapped in `0040`'s manager fence exactly as
-- `0040` wrapped it — with the same edits in every CTE that reads the ledger:
-- a left join to the original document, and then the day
-- is the ORIGINAL document's (`coalesce(o.occurred_at, s.occurred_at)` — an
-- ordinary document has no original and keeps its own), and the last price of
-- a day is ordered by that same time. ⚠️ THE SECOND EDIT IS NOT COSMETIC. A
-- reversal is stamped when it is made, so ordered by its own time it would be
-- the LAST line of whichever earlier day it now counts on: delete Friday's
-- 10:00 sale on Monday and Friday's last price would become the price of the
-- sale undone, over the 18:00 sale that still stands. Ordered by its
-- original's time it sits where the thing it undoes sat.
--
-- ⚠️ A LEFT JOIN, and on the same table the row came from, so the view's fence
-- is unchanged: these views are `security_invoker`, and a reader who can see a
-- reversal can see its original (same store, same policies). Were that ever
-- not so, the join would come back empty and the reversal would fall back to
-- its own day — the old behaviour, never a lost row.
--
-- ⚠️ `create or replace view` keeps the column list and every comment; the
-- comments that described the old rule are re-issued after each view.

create or replace view public.product_purchases_daily
with (security_invoker = true) as
with bought as (
  select pl.workspace_id,
         pl.location_id,
         pl.variant_id,
         (coalesce(o.occurred_at, p.occurred_at) at time zone l.timezone)::date as day,
         sum(pl.qty_base)                     as purchases_qty_base,
         sum(pl.line_net)                     as purchases_net,
         sum(pl.tax_amount)                   as tax_paid,
         sum(pl.line_net + pl.tax_amount)     as purchases_gross,
         count(*)                             as purchase_line_count,
         (array_agg(pl.unit_price_net_per_base
                    order by coalesce(o.occurred_at, p.occurred_at) desc,
                             pl.created_at desc, pl.id desc))[1]
           as price_last_net,
         (array_agg(pl.unit_price_net_per_base * (1 + pl.tax_rate)
                    order by coalesce(o.occurred_at, p.occurred_at) desc,
                             pl.created_at desc, pl.id desc))[1]
           as price_last_gross
    from public.purchase_line pl
    join public.purchase p
      on  p.id           = pl.purchase_id
      and p.workspace_id = pl.workspace_id
      and p.location_id  = pl.location_id
    left join public.purchase o
      on  o.id           = p.reversal_of
      and o.workspace_id = p.workspace_id
    join public.location l
      on  l.id           = pl.location_id
      and l.workspace_id = pl.workspace_id
   group by 1, 2, 3, 4
)
select b.workspace_id,
       b.location_id,
       b.variant_id,
       b.day,
       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,
       b.purchases_qty_base,
       b.purchases_net,
       b.tax_paid,
       b.purchases_gross,
       b.purchase_line_count,
       b.purchases_net   / nullif(b.purchases_qty_base, 0) as purchase_price_net,
       b.purchases_gross / nullif(b.purchases_qty_base, 0) as purchase_price_gross,
       b.price_last_net   as purchase_price_last_net,
       b.price_last_gross as purchase_price_last_gross
  from bought b
  join public.product_variant v
    on  v.id           = b.variant_id
    and v.workspace_id = b.workspace_id
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id;

comment on view public.product_purchases_daily is
  'How much was bought and at what price, per store per product per day '
  '(ADR-035 §2.9; plan tasks 4.6c-i and 4.6c-ii, area 9 rulings N2 and N3). The '
  'same quantity-and-money numbers product_waste_daily computes inside itself as a '
  'denominator, in a view named for the question the owner actually asks. Per '
  'FAMILY is a group by for every column EXCEPT the four price columns: family_id '
  'and family_name are on every row, but a family mixes base units (kg, pieces, '
  'litres) and a price across them is money over a meaningless total. Daily grain '
  'on purpose — the caller sums to a week or a month, so changing the period is not '
  'a migration. ⚠️ Since 0032 not every column is additive: purchase_price_net and '
  'purchase_price_gross are RATIOS, and the way to roll them up is to sum '
  'purchases_net or purchases_gross and purchases_qty_base over the window and '
  'divide once, NEVER to average the daily prices — that weights by days instead of '
  'by quantity. purchase_price_last_* does not roll up at all: take it from the '
  'latest day in the window. ⚠️ Voided deliveries are NOT excluded: a reversal is a '
  'negated document and cancels itself in a sum, and since 0064 it is counted on '
  'the day of the delivery it reverses, so a cancelled delivery nets its own day '
  'to zero rather than putting a negative bar on the day it was cancelled (the '
  'owner''s ruling of 2026-10-19: a correction counts on the day of what it '
  'corrects; transaction_export keeps when it was made). ⚠️ No day spine: nothing '
  'records a delivery that was due and did not arrive, so a day with no purchase '
  'has no row rather than a zero nobody can back. Manager-and-above, by RLS '
  'inheritance from purchase and purchase_line — this view states no predicate of '
  'its own and must not.';

comment on column public.product_purchases_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the purchase document — and for a reversal, since 0064, from the document it '
  'reverses. product_margin_daily, product_waste_daily and product_velocity_daily '
  'read the same rule, so no two reports can disagree about which day a '
  'correction belongs to. transaction_export keeps the day it was recorded.';

comment on column public.product_purchases_daily.purchases_qty_base is
  'Net units delivered in the variant base unit (§2.5). Convert for display at the '
  'edge. Since 0064 a reversal counts on its original''s day, so a cancelled '
  'delivery leaves that day at zero rather than a later day negative. Also the '
  'DENOMINATOR of purchase_price_net and purchase_price_gross, which is why those '
  'two are recoverable at any grain and a rollup never has to average a price.';

comment on column public.product_purchases_daily.tax_paid is
  'IVA on the delivery — acreditable, the counterpart of product_margin_daily and '
  'product_velocity_daily''s tax_collected, and deliberately NOT the same column '
  'name. ⚠️ Not a declaration figure: CFDI is out of scope (ADR-035), and since '
  '0064 a reversal moves this on the day — so in the month — of the delivery it '
  'corrects, not the month it was recorded; transaction_export keeps the latter.';

comment on column public.product_purchases_daily.purchase_price_net is
  'What one base unit COST before IVA in this bucket, effective: purchases_net over '
  'purchases_qty_base (0032, area 9 N3). NULL where the quantity is exactly zero — '
  'a delivery and its reversal, which since 0064 always share a day — which is the '
  'honest answer and is why the division lives here rather than in every client. '
  '⚠️ NOT ADDITIVE and not a family number: to roll it up, sum the two columns it '
  'divides and divide once; averaging daily prices weights by days instead of by '
  'quantity, and averaging across a family divides money by a mix of kilos and '
  'pieces.';

comment on column public.product_purchases_daily.purchase_price_last_net is
  'What the LAST delivery of this day charged per base unit before IVA, as typed — '
  'unit_price_net_per_base off one line, ordered by document time (a reversal at '
  'its original''s time, 0064) and broken by created_at then id so the answer is '
  'total and stable. The price as a STATE, which is what "how have my prices '
  'moved" asks and an average cannot answer; the dated per-variant form of what '
  'provider_price_memory (0008) keeps per provider. ⚠️ DOES NOT ROLL UP — read it '
  'at the latest day in the window, never summed or averaged. ⚠️ Differs from '
  'purchase_price_net in the fourth decimal even on a single-line day: line_net is '
  'rounded to the centavo (§2.5) and this is not, so one is the price CHARGED and '
  'this is the price MEANT. ⚠️ When the day''s last delivery was cancelled this is '
  'that delivery''s price, which is the price of the thing being undone.';

create or replace view public.product_velocity_daily
with (security_invoker = true) as
with sold as (
  select sl.workspace_id,
         sl.location_id,
         sl.variant_id,
         (coalesce(o.occurred_at, s.occurred_at) at time zone l.timezone)::date as day,
         sum(sl.qty_base)   as qty_base_sold,
         sum(sl.line_net)   as revenue_net,
         sum(sl.tax_amount) as tax_collected,
         count(*)           as line_count,
         (array_agg(sl.unit_price_net_per_base
                    order by coalesce(o.occurred_at, s.occurred_at) desc,
                             sl.created_at desc, sl.id desc))[1]
           as price_last_net,
         (array_agg(sl.unit_price_net_per_base * (1 + sl.tax_rate)
                    order by coalesce(o.occurred_at, s.occurred_at) desc,
                             sl.created_at desc, sl.id desc))[1]
           as price_last_gross
    from public.sale_line sl
    join public.sale s
      on  s.id           = sl.sale_id
      and s.workspace_id = sl.workspace_id
      and s.location_id  = sl.location_id
    left join public.sale o
      on  o.id           = s.reversal_of
      and o.workspace_id = s.workspace_id
    join public.location l
      on  l.id           = sl.location_id
      and l.workspace_id = sl.workspace_id
   group by 1, 2, 3, 4
),
traded as (
  select workspace_id, location_id, day
    from sold
   group by 1, 2, 3
),
stocked as (
  select bb.workspace_id,
         bb.location_id,
         bb.variant_id,
         min((bb.received_at at time zone l.timezone)::date) as first_stock_day
    from public.batch_balance bb
    join public.location l
      on  l.id           = bb.location_id
      and l.workspace_id = bb.workspace_id
   group by 1, 2, 3
),
carried as (
  select coalesce(s.workspace_id, k.workspace_id) as workspace_id,
         coalesce(s.location_id,  k.location_id)  as location_id,
         coalesce(s.variant_id,   k.variant_id)   as variant_id,
         least(coalesce(s.first_sale_day,  k.first_stock_day),
               coalesce(k.first_stock_day, s.first_sale_day)) as first_day
    from (select workspace_id, location_id, variant_id, min(day) as first_sale_day
            from sold group by 1, 2, 3) s
    full outer join stocked k
      on  k.workspace_id = s.workspace_id
      and k.location_id  = s.location_id
      and k.variant_id   = s.variant_id
),
open_until as (
  select workspace_id, location_id, max(day) as last_day
    from traded
   group by 1, 2
),
spine as (
  select c.workspace_id,
         c.location_id,
         c.variant_id,
         c.first_day,
         g::date as day
    from carried c
    join open_until o
      on  o.workspace_id = c.workspace_id
      and o.location_id  = c.location_id
   cross join lateral
         generate_series(c.first_day, o.last_day, interval '1 day') g
),
daily as (
  select sp.workspace_id,
         sp.location_id,
         sp.variant_id,
         sp.day,
         sp.first_day,
         coalesce(s.qty_base_sold, 0) as qty_base_sold,
         coalesce(s.revenue_net,   0) as revenue_net,
         coalesce(s.tax_collected, 0) as tax_collected,
         coalesce(s.line_count,    0) as line_count,
         s.price_last_net,
         s.price_last_gross,
         (t.day is not null)          as store_traded
    from spine sp
    left join sold s
      on  s.workspace_id = sp.workspace_id
      and s.location_id  = sp.location_id
      and s.variant_id   = sp.variant_id
      and s.day          = sp.day
    left join traded t
      on  t.workspace_id = sp.workspace_id
      and t.location_id  = sp.location_id
      and t.day          = sp.day
)
select d.workspace_id,
       d.location_id,
       d.variant_id,
       d.day,
       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,
       d.qty_base_sold,
       d.revenue_net,
       d.line_count,
       d.store_traded,
       sum(d.qty_base_sold) over w                          as trailing_qty_base,
       sum(d.revenue_net)   over w                          as trailing_revenue_net,
       count(*)             over w                          as trailing_days,
       count(*) filter (where d.store_traded)      over w    as trailing_traded_days,
       count(*) filter (where d.qty_base_sold > 0) over w    as trailing_sold_days,
       d.day - (max(d.day) filter (where d.qty_base_sold > 0)
                over (partition by d.workspace_id, d.location_id, d.variant_id
                      order by d.day
                      rows between unbounded preceding and current row))
         as days_since_last_sale,
       (d.day - d.first_day) as days_carried,
       d.tax_collected                              as tax_collected,
       (d.revenue_net + d.tax_collected)            as revenue_gross,
       sum(d.revenue_net + d.tax_collected) over w  as trailing_revenue_gross,
       d.revenue_net                     / nullif(d.qty_base_sold, 0) as sale_price_net,
       (d.revenue_net + d.tax_collected) / nullif(d.qty_base_sold, 0) as sale_price_gross,
       d.price_last_net   as sale_price_last_net,
       d.price_last_gross as sale_price_last_gross
  from daily d
  join public.product_variant v
    on  v.id           = d.variant_id
    and v.workspace_id = d.workspace_id
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id
window w as (partition by d.workspace_id, d.location_id, d.variant_id
             order by d.day
             range between interval '28 days' preceding
                       and interval  '1 day'  preceding);

comment on column public.product_velocity_daily.line_count is
  'Sale lines on this day, INCLUDING a void''s negated lines, which since 0064 '
  'count on the day of the sale they undo. Distinguishes "no row" from "a row that '
  'nets to nothing": a cancelled sale leaves its day''s qty_base_sold at 0 and '
  'line_count at 2. 0011''s finding, at sale grain.';

comment on column public.product_velocity_daily.sale_price_net is
  'What one base unit SOLD for before IVA in this bucket, effective: revenue_net '
  'over qty_base_sold (0032, area 9 N3). NULL on every day this product did not '
  'sell — the spine generates those rows and a quiet day has no price, not a price '
  'of zero — and NULL where a sale and its void cancel to exactly zero quantity, '
  'which since 0064 is the day of every sale that was cancelled outright. That '
  'second case is why the division is in the view: a client doing it itself '
  'divides by zero on data the pilot produces in its first week. ⚠️ NOT ADDITIVE '
  'and not a family number: to roll it up, sum the two columns it divides and '
  'divide once; averaging daily prices weights by days instead of by quantity, '
  'and averaging across a family divides money by a mix of kilos and pieces. ⚠️ '
  'There is no trailing price column on purpose — it is trailing_revenue_net over '
  'trailing_qty_base, both already here.';

comment on column public.product_velocity_daily.sale_price_last_net is
  'What the LAST sale of this day charged per base unit before IVA, as typed — '
  'unit_price_net_per_base off one line, ordered by document time (a void at the '
  'time of the sale it undoes, 0064) and broken by created_at then id so the '
  'answer is total and stable. The price as a STATE, which is what "how have my '
  'prices moved" asks and an average cannot answer, and the closest thing in this '
  'schema to the current shelf price: price_list holds the INTENDED price and is '
  'empty. ⚠️ DOES NOT ROLL UP — read it at the latest day in the window. ⚠️ NULL '
  'on a day with no sale, including every spine day. ⚠️ Differs from '
  'sale_price_net in the fourth decimal even on a single-line day: line_net is '
  'rounded to the centavo (§2.5) and this is not, so one is the price CHARGED and '
  'this is the price MEANT. ⚠️ When the day''s last sale was voided this is that '
  'sale''s price, which is the price of the sale being undone.';

comment on column public.product_velocity_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the sale document — and for a void, since 0064, from the sale it undoes. The '
  'same column and the same rule product_margin_daily, product_waste_daily and '
  'product_purchases_daily use, so no two reports can disagree about when a day '
  'ended or which day a correction belongs to. Rows exist for days with no sale; '
  'that is the point of the view.';

create or replace view public.product_margin_daily
with (security_invoker = true) as
with revenue as (
  select sl.workspace_id,
         sl.location_id,
         sl.variant_id,
         (coalesce(o.occurred_at, s.occurred_at) at time zone l.timezone)::date as day,
         sum(sl.qty_base)   as qty_base_sold,
         sum(sl.line_net)   as revenue_net,
         sum(sl.tax_amount) as tax_collected,
         count(*)           as line_count
    from public.sale_line sl
    join public.sale s
      on  s.id           = sl.sale_id
      and s.workspace_id = sl.workspace_id
      and s.location_id  = sl.location_id
    left join public.sale o
      on  o.id           = s.reversal_of
      and o.workspace_id = s.workspace_id
    join public.location l
      on  l.id           = sl.location_id
      and l.workspace_id = sl.workspace_id
   group by 1, 2, 3, 4
),
cost as (
  select m.workspace_id,
         m.location_id,
         m.variant_id,
         (coalesce(o.occurred_at, s.occurred_at) at time zone l.timezone)::date as day,
         sum(-m.qty_base * m.unit_cost_net_per_base) as cogs_net,
         count(*)                                    as movement_count
    from public.stock_movement m
    join public.sale s
      on  s.id           = m.sale_id
      and s.workspace_id = m.workspace_id
      and s.location_id  = m.location_id
    left join public.sale o
      on  o.id           = s.reversal_of
      and o.workspace_id = s.workspace_id
    join public.location l
      on  l.id           = m.location_id
      and l.workspace_id = m.workspace_id
   where m.reason = 'sale'
   group by 1, 2, 3, 4
)
select coalesce(r.workspace_id, c.workspace_id) as workspace_id,
       coalesce(r.location_id,  c.location_id)  as location_id,
       coalesce(r.variant_id,   c.variant_id)   as variant_id,
       coalesce(r.day,          c.day)          as day,
       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,
       coalesce(r.qty_base_sold, 0) as qty_base_sold,
       coalesce(r.revenue_net,   0) as revenue_net,
       coalesce(r.tax_collected, 0) as tax_collected,
       coalesce(c.cogs_net,      0) as cogs_net,
       coalesce(r.revenue_net, 0) - coalesce(c.cogs_net, 0) as gross_margin,
       case when coalesce(r.revenue_net, 0) <> 0
            then (coalesce(r.revenue_net, 0) - coalesce(c.cogs_net, 0))
                 / r.revenue_net
       end as margin_rate,
       (c.movement_count is not null) as cost_attributed,
       coalesce(r.line_count, 0)     as line_count,
       coalesce(c.movement_count, 0) as movement_count
  from revenue r
  full outer join cost c
    on  c.workspace_id = r.workspace_id
    and c.location_id  = r.location_id
    and c.variant_id   = r.variant_id
    and c.day          = r.day
  join public.product_variant v
    on  v.id           = coalesce(r.variant_id,   c.variant_id)
    and v.workspace_id = coalesce(r.workspace_id, c.workspace_id)
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id
 where public.has_role(coalesce(r.workspace_id, c.workspace_id), 'manager')
    or not row_security_active('public.stock_movement');

comment on column public.product_margin_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the sale document — and for a void, since 0064, from the sale it undoes, for '
  'its revenue and its cost alike. Two stores of one merchant in different zones '
  'bucket their own days, which is the case the column exists for.';

create or replace view public.product_waste_daily
with (security_invoker = true) as
select * from (
with wasted as (
  select m.workspace_id,
         m.location_id,
         m.variant_id,
         (coalesce(o.occurred_at, w.occurred_at) at time zone l.timezone)::date as day,
         sum(-m.qty_base)                            as waste_qty_base,
         sum(-m.qty_base * m.unit_cost_net_per_base) as waste_cost_net,
         count(*)                                    as waste_movement_count
    from public.stock_movement m
    join public.waste w
      on  w.id           = m.waste_id
      and w.workspace_id = m.workspace_id
      and w.location_id  = m.location_id
    left join public.waste o
      on  o.id           = w.reversal_of
      and o.workspace_id = w.workspace_id
    join public.location l
      on  l.id           = m.location_id
      and l.workspace_id = m.workspace_id
   where m.reason = 'waste'
   group by 1, 2, 3, 4
),
bought as (
  select pl.workspace_id,
         pl.location_id,
         pl.variant_id,
         (coalesce(o.occurred_at, p.occurred_at) at time zone l.timezone)::date as day,
         sum(pl.qty_base) as purchases_qty_base,
         sum(pl.line_net) as purchases_net,
         count(*)         as purchase_line_count
    from public.purchase_line pl
    join public.purchase p
      on  p.id           = pl.purchase_id
      and p.workspace_id = pl.workspace_id
      and p.location_id  = pl.location_id
    left join public.purchase o
      on  o.id           = p.reversal_of
      and o.workspace_id = p.workspace_id
    join public.location l
      on  l.id           = pl.location_id
      and l.workspace_id = pl.workspace_id
   group by 1, 2, 3, 4
)
select coalesce(w.workspace_id, b.workspace_id) as workspace_id,
       coalesce(w.location_id,  b.location_id)  as location_id,
       coalesce(w.variant_id,   b.variant_id)   as variant_id,
       coalesce(w.day,          b.day)          as day,
       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,
       coalesce(w.waste_qty_base,       0) as waste_qty_base,
       coalesce(w.waste_cost_net,       0) as waste_cost_net,
       coalesce(w.waste_movement_count, 0) as waste_movement_count,
       coalesce(b.purchases_qty_base,   0) as purchases_qty_base,
       coalesce(b.purchases_net,        0) as purchases_net,
       coalesce(b.purchase_line_count,  0) as purchase_line_count
  from wasted w
  full outer join bought b
    on  b.workspace_id = w.workspace_id
    and b.location_id  = w.location_id
    and b.variant_id   = w.variant_id
    and b.day          = w.day
  join public.product_variant v
    on  v.id           = coalesce(w.variant_id,   b.variant_id)
    and v.workspace_id = coalesce(w.workspace_id, b.workspace_id)
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id
) q
 where public.has_role(q.workspace_id, 'manager')
    or not row_security_active('public.stock_movement');

comment on column public.product_waste_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the waste or purchase document — and for a reversal, since 0064, from the '
  'document it reverses. product_margin_daily reads the same column, so the two '
  'reports can no longer disagree about when a day ended.';

comment on column public.product_waste_daily.purchases_net is
  'What this product cost the shop that day at that store, net of tax, net of '
  'voids. Zero when a delivery was cancelled; null-free by coalesce, so read '
  'purchase_line_count to tell "never bought" from "bought and voided". Since '
  '0064 a void counts on its delivery''s day, so no window holds one without the '
  'other and this is never negative from a cancellation.';
