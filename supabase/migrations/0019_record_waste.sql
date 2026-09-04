-- ============================================================================
-- 0019 — record_waste()  (ADR-035 §2.6, §2.8, §2.5, §2.4, §1)
-- ============================================================================
-- docs/PLAN.md task 4d-ii, the other half of 4d. The third of build step 4's six
-- write-surface functions, and the one Desperdicio calls.
--
-- §2.6: `record_waste(id, location_id, lines)` —
--   "Header, lines with reason and cost snapshot, negative movements."
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SETTLED BY THE OWNER 2026-09-04 — WASTE RECORDS UNCONDITIONALLY
-- ----------------------------------------------------------------------------
-- 4c-i left one question open BY NAME rather than settling it by writing the
-- code first: `record_waste` removes stock and is not a sale, so does §2.6's
-- availability check apply to it? `0018` did not settle it either — a delivery
-- adds stock, so the question could not arise there.
--
-- THE ANSWER IS NO. This function has no availability check and never refuses a
-- write-off for want of stock, whatever `enforce_stock` says on the variant or
-- the workspace. The owner's reasoning, recorded because the code cannot carry
-- it:
--
--   THE LOSS ALREADY HAPPENED. Refusing to record spoilage because the shelf
--   already reads zero does not put the carton back — it throws away the only
--   record that it ever existed, and Desperdicio's whole job (§2.8) is "what am
--   I losing, and why". A shop whose books already disagree with its shelf is
--   exactly the shop that most needs the write-off recorded.
--
-- This is the same shape as §2.6's offline exemption on `record_sale`, and for
-- the same reason: the event is in the past and the database is being told about
-- it, not asked permission for it. The debt stays VISIBLE as a negative
-- `batch_balance` — §1, "stock is recorded, not enforced" — rather than being
-- hidden by a refusal.
--
-- ⚠️ SO `allocate_fefo()`'s SHORTFALL BRANCHES ARE REACHABLE HERE, ALWAYS, and
-- they are not an error path. Wasting more than the shelf holds overdraws the
-- lot (branch 1) or opens an `adjustment` lot (branch 3) exactly as an
-- unenforced sale does. `supabase/tests/0019` section 6 walks both.
--
-- ----------------------------------------------------------------------------
-- WHAT IS THIS FUNCTION'S OWN
-- ----------------------------------------------------------------------------
-- The same three rules with no schema behind them, re-spelled rather than
-- shared for the reason `0018` gives: plpgsql has no mixin, and a helper holding
-- the location check would put it back on the far side of the wall §2.6 names.
--
--   1. THE LOCATION WALL, first statement. `security definer`, so RLS is NOT
--      running. Nothing in the schema catches its absence.
--   2. IDEMPOTENCY over the client-generated id, raising `0016`'s `TD001`.
--   3. THE TIMESTAMPS. Server-set online, clamped to [now() - 72h, now()]
--      offline.
--
-- ----------------------------------------------------------------------------
-- THE LINE PAYLOAD
-- ----------------------------------------------------------------------------
--   [{ "variant_id":                "<uuid>",
--      "qty_display":               <numeric>,
--      "qty_display_unit":          "<unit code>",  -- optional; defaults to the
--                                                   -- variant's SELL unit
--      "unit_price_gross_per_base": <numeric>,      -- the RETAIL value lost
--      "reason":                    "<waste_reason>" }]
--
-- ⚠️ THE DEFAULT UNIT IS `sell_unit_code`, WHICH IS `record_sale`'s AND NOT
-- `record_purchase`'s. Stock is LEAVING the shelf, and it leaves in the
-- denomination it is sold in. `0018` reads `purchase_unit_code` because a
-- delivery arrives in cases; a carton thrown away is one the shop would have
-- sold. The rule is the DIRECTION of the document, not the table it writes to.
--
-- ⚠️ `reason` IS REQUIRED AND HAS NO DEFAULT. §2.8 makes Desperdicio
-- reason-first — it is the column the screen asks for BEFORE the product — and
-- an enum with a default would quietly file every unlabelled loss under one
-- cause. `waste_reason` is workspace-global on purpose (0003): the analytics
-- asset compares causes across shops.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE MONEY IS THE **SALE** SHAPE, GROSS-FIRST — AND IT IS NOT COST
-- ----------------------------------------------------------------------------
-- Settled by the owner 2026-08-26 and binding on this file by name:
--
--     line_gross = round(unit_gross x qty_base, 2)   -- the SHELF price anchors
--     line_net   = round(line_gross / (1 + rate), 2)
--     tax_amount = line_gross - line_net             -- the residual
--
-- `waste_line.line_net` is the RETAIL VALUE OF THE LOSS — what the shop failed
-- to earn — and a retail value is a shelf price, so it anchors gross exactly as
-- `record_sale` does. That is why `waste` the HEADER is readable by every member
-- while `waste_line` is manager-and-above (§2.7): the header carries value, the
-- line carries cost.
--
-- ⚠️ THE PRICE COMES FROM THE CLIENT AND `price_list` IS NOT CONSULTED, which is
-- 4b-i's decision applied to the third RPC. No function on this write surface
-- reads `price_list`, and a write-off flushed from an offline queue days later
-- must not be re-valued at a price the shopkeeper edited on the Monday.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE COST SNAPSHOT IS THE ALLOCATOR'S, WEIGHTED — AND IT IS THE ONE THING
-- THIS FUNCTION COMPUTES THAT NEITHER 0016 NOR 0018 DOES
-- ----------------------------------------------------------------------------
-- `waste_line` carries `unit_cost_net_per_base`, which `sale_line` has no
-- counterpart for. A write-off can span lots bought at different prices, and the
-- line is ONE row per variant, so:
--
--     unit_cost_net_per_base = round(sum(qty x cost) / sum(qty), 6)
--
-- the quantity-weighted mean of what the allocator ACTUALLY took. 0011's header
-- states this shape as an existing fact about the seed and builds on it: it is
-- why `product_waste_daily` takes its numerator from `stock_movement` and not
-- from here — the movements carry the per-lot cost EXACTLY, the line carries a
-- rounded mean, and over the seed the two differ by 0.00011 pesos in total.
-- `supabase/checks/0011` reconciles them, so this rounding is load-bearing for a
-- check that already exists.
--
-- ⚠️ THIS FORCES THE WRITE ORDER, AND IT IS THE REVERSE OF 0016's. `record_sale`
-- inserts its line and then allocates. This function must ALLOCATE FIRST,
-- because the line cannot be written until the lots are known — and the document
-- tables are immutable (0003), so there is no second pass to fix it up in.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- record_waste()
-- ----------------------------------------------------------------------------

create function public.record_waste(
  p_id               uuid,
  p_location_id      uuid,
  p_lines            jsonb,
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
  if v_offline then
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
     created_by, recorded_offline, payload_hash)
  values
    (p_id, v_ws, p_location_id, v_at, v_tot_net, v_tot_tax,
     v_user, v_offline, v_hash)
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

comment on function public.record_waste(uuid, uuid, jsonb, timestamptz, boolean) is
  'Records one write-off: header, lines with reason and a quantity-weighted cost '
  'snapshot, FEFO within the location, one negative movement per lot, in one '
  'transaction. The money is the SALE shape — gross-first, tax the residual — '
  'because line_net is the retail value of the loss. ⚠️ NO AVAILABILITY CHECK: '
  'waste records unconditionally (owner, 2026-09-04), because the loss already '
  'happened and refusing it discards the only record of it; the debt stays '
  'visible as a negative balance. Validates the location in its own body — RLS '
  'is not running here. Idempotent on the client-generated id, TD001 on a '
  'different payload, and `reason` is part of that payload. ADR-035 §1, §2.4, '
  '§2.5, §2.6, §2.8.';


-- ----------------------------------------------------------------------------
-- Grants  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- `authenticated` and nothing else, and the function is the only route: 0003
-- revoked every table privilege on `waste` and `waste_line`.
--
-- ⚠️ THE GRANT IS NOT THE READ WALL, AND THE ASYMMETRY IS DELIBERATE. §2.7 makes
-- `waste_line` manager-and-above to READ because it carries cost, while `waste`
-- the header is readable by every member because it carries value. A cashier may
-- therefore RECORD a write-off through this function and then be unable to read
-- back the line they just wrote — which is exactly the shape 4b-i found on the
-- sell side and recorded as "a cashier writes a ledger they cannot read". It is
-- correct, and `supabase/tests/0019` asserts it rather than working around it.

revoke all on function
  public.record_waste(uuid, uuid, jsonb, timestamptz, boolean) from public;
grant execute on function
  public.record_waste(uuid, uuid, jsonb, timestamptz, boolean) to authenticated;
