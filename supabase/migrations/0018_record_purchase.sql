-- ============================================================================
-- 0018 — record_purchase()  (ADR-035 §2.6, §2.5, §2.4, §2.3; ADR-017)
-- ============================================================================
-- docs/PLAN.md task 4d-i. The second of the six write-surface functions build
-- step 4 owes, and the one that PUTS STOCK ON THE SHELF.
--
-- §2.6: `record_purchase(id, location_id, provider_id, lines)` —
--   "Header, lines, batches with expiry per ADR-017 policy, positive movements."
--
-- ----------------------------------------------------------------------------
-- ⚠️ 4d WAS SPLIT, AND THIS FILE IS HALF OF IT
-- ----------------------------------------------------------------------------
-- 4d was estimated as one migration carrying `record_purchase` AND
-- `record_waste`. It was re-sized `L` on 2026-09-04 and split by FUNCTION —
-- `record_waste` is `0019`, task 4d-ii, and everything after it moved up one
-- number. The reasoning, and the before/after table, are in docs/PLAN.md under
-- *Settled in sizing 4d*. Two whole functions in two sessions cannot share one
-- unapplied file, which is the same append-only argument that forced step 4's
-- six-way split in the first place.
--
-- ----------------------------------------------------------------------------
-- WHAT IS THIS FUNCTION'S OWN, AND WHAT 0016 ALREADY SETTLED
-- ----------------------------------------------------------------------------
-- The three rules with no schema behind them were settled by `record_sale` in
-- 0016 and are RE-SPELLED here rather than shared, because there is nothing to
-- share them through: plpgsql has no mixin and a helper that took the location
-- check out of the body would put it back on the far side of the wall §2.6
-- names. They are the same three, and they mean the same thing:
--
--   1. THE LOCATION WALL, first statement, `security definer` so RLS is NOT
--      running. Nothing in the schema catches its absence — 0016's falsification
--      F1 measured exactly that, and the equivalent test for THIS function is in
--      supabase/tests/0018.
--   2. IDEMPOTENCY over the client-generated id, §2.6's four rows, raising
--      `TD001` on same-id-different-payload. The SQLSTATE is 0016's and is a
--      client contract; this file consumes it rather than inventing a second.
--   3. THE TIMESTAMPS. `occurred_at` server-set online, clamped to
--      [now() - 72h, now()] offline; `recorded_at` always the server's.
--
-- ⚠️ WHAT IS NOT HERE, AND DELIBERATELY: §2.6's AVAILABILITY CHECK. 0017 makes
-- `record_sale` refuse a sale the shelf cannot serve. A delivery ADDS stock, so
-- there is no shelf to be short — the check constrains taking stock OUT and
-- applies to no path in this file. Settled in 4c-i and recorded there by name.
--
-- ----------------------------------------------------------------------------
-- ⚠️ TWO PARAMETERS §2.6's TABLE DOES NOT NAME, FOR 0016's REASON
-- ----------------------------------------------------------------------------
-- §2.6 writes four arguments. `purchase.occurred_at` is `not null` with no
-- default and `purchase.recorded_offline` is `not null` — the server cannot
-- infer either, and 4b-i already amended the ADR rather than the code for the
-- identical gap on `record_sale`. Both trail, both are defaulted, and §2.6's
-- four-argument call still works verbatim.
--
-- A delivery accepted in a back room with no signal is the ordinary case for
-- this one, not an edge: receiving is a manager's or the owner's job and it
-- happens where the stock is.
--
-- ----------------------------------------------------------------------------
-- THE LINE PAYLOAD
-- ----------------------------------------------------------------------------
--   [{ "variant_id":              "<uuid>",
--      "qty_display":             <numeric>,      -- what the operator keyed
--      "qty_display_unit":        "<unit code>",  -- optional; defaults to the
--                                                 -- variant's PURCHASE unit
--      "unit_price_net_per_base": <numeric>,      -- the INVOICE net
--      "expiry_date":             "<date>" }]     -- optional; ADR-017 tier 1
--
-- ⚠️ THE DEFAULT UNIT IS `purchase_unit_code`, NOT `sell_unit_code`. That is the
-- entire reason §2.3 gives a variant four denominations: a case arrives and
-- singles leave. 0016 defaults to the sell unit for the same structural reason
-- in the opposite direction, and reading the wrong one here would silently
-- multiply a delivery by the pack size.
--
-- ⚠️ THE PRICE IS THE INVOICE NET, AND IT COMES FROM THE CLIENT. There is no
-- table to look it up in and there must not be one: §2.3 derives purchase-price
-- MEMORY from these rows in 0008, so a `record_purchase` that consulted a
-- remembered price would feed last week's number back into this week's cost and
-- never converge on what was actually paid.
--
-- `tax_rate` is NOT accepted from the client — read from the variant and
-- snapshotted, exactly as 0016 does it, and for the same reason.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE TAX SPLIT IS NET-FIRST, AND IT IS THE MIRROR OF 0016's
-- ----------------------------------------------------------------------------
-- Settled by the owner 2026-08-26 and binding on this file by name:
--
--     line_net   = round(unit_net × qty_base, 2)   -- the INVOICE is the anchor
--     line_gross = round(line_net × (1 + rate), 2)
--     tax_amount = line_gross − line_net           -- the residual, never
--                                                  -- rounded on its own
--
-- The anchor is what differs from the sale, and it differs because the document
-- differs: a shelf price is agreed gross and a supplier invoice is quoted net.
-- Tax stays the RESIDUAL on both sides, which is what makes `net + tax = gross`
-- hold exactly per line (§2.5 rule 4) rather than nearly.
--
-- ⚠️ `tax_amount = line_gross − line_net` IS NOT `round(line_net × rate, 2)`,
-- though the seed spells it the second way. The two coincide over all 1 048
-- seeded delivery lines and at both applied rates — that is falsification F17 in
-- 07_money_and_units.sql, and it is measured rather than assumed. The residual
-- form is the one the binding lines carry, so it is the one that ships.
--
-- ----------------------------------------------------------------------------
-- ⚠️ EXPIRY: ADR-017's THREE TIERS, AND ADR-035 CARRIES IT FORWARD IN SUBSTANCE
-- ----------------------------------------------------------------------------
-- ADR-035's header lists ADR-017 among the decisions "carried forward in
-- substance", and §2.6 points at it by name for this function. Its policy:
--
--   1. the operator's date, if the line carries one           — manual wins
--   2. else `product_family.default_lifespan_days` added to the received date,
--      when the family tracks expiry                          — the automation
--   3. else null                                              — and NULL NEVER
--                                                               MEANS "does not
--                                                               expire"
--
-- Tier 1 is unconditional on `track_expiry`: a family that does not normally
-- track expiry still gets the date if the operator read one off the box, which
-- is what "manual > lifespan" means.
--
-- ⚠️ TIER 2 RESOLVES IN THE STORE'S LOCAL DAY, NOT IN UTC. A delivery signed for
-- at 23:00 in Mexico City is already tomorrow in UTC, and a lifespan added to
-- the wrong day is off by one for every evening delivery a shop takes. 0012 put
-- `location.timezone` on the table and 0013 established this spelling; the seed
-- predates both and hardcodes UTC, which is a fixture and not a rule.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- record_purchase()
-- ----------------------------------------------------------------------------

create function public.record_purchase(
  p_id               uuid,
  p_location_id      uuid,
  p_provider_id      uuid,
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
  if v_offline then
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
     total_tax, created_by, recorded_offline, payload_hash)
  values
    (p_id, v_ws, p_location_id, p_provider_id, v_at, v_tot_net, v_tot_tax,
     v_user, v_offline, v_hash)
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

comment on function public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean) is
  'Records one delivery: header, lines, one stock_batch per line with expiry by '
  'ADR-017 policy (manual, else the family lifespan in the store''s local day, '
  'else null), and the positive movement that is the lot''s receipt — in one '
  'transaction, as 0015 requires. The tax split is NET-first with tax as the '
  'residual, the mirror of record_sale. Validates the location AND the provider '
  'in its own body — RLS is not running here. Idempotent on the '
  'client-generated id: the same payload returns already_recorded, a different '
  'one raises TD001 for the caller to dead-letter. No availability check — that '
  'constrains taking stock out. ADR-035 §2.3, §2.4, §2.5, §2.6.';


-- ----------------------------------------------------------------------------
-- Grants  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- `authenticated` and nothing else, and the function is the ONLY route: 0003
-- revoked every table privilege on `purchase` and `purchase_line`, and 0004 did
-- the same for `stock_batch` and `stock_movement`.
--
-- ⚠️ THE GRANT DOES NOT ENCODE WHO RECEIVES A DELIVERY. The owner settled that a
-- cashier never accepts one — receiving is a manager's or the owner's job — but
-- that is a ROLE rule and this wall is a LOCATION wall. Putting a role test in
-- here would be the second spelling of an authorisation the RPC does not own,
-- and shift cover is a reassignment rather than an override (owner, 2026-08-24).
-- If receiving is ever to be role-gated, it is a policy question and it belongs
-- where the other forty policies are.

revoke all on function
  public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean) from public;
grant execute on function
  public.record_purchase(uuid, uuid, uuid, jsonb, timestamptz, boolean) to authenticated;
