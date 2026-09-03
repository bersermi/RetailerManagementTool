-- ============================================================================
-- 0016 — record_sale()  (ADR-035 §2.6, §2.5, §2.4, §2.7)
-- ============================================================================
-- docs/PLAN.md task 4b-i. The first of the six write-surface functions build
-- step 4 owes, and the first RPC in this repository that a till will call.
--
-- §2.6: "Clients never insert. Ten functions are the entire write surface."
-- This is the one that empties the shelf, so it is where every rule the earlier
-- steps settled has to arrive at once:
--
--   header, lines, FEFO allocation WITHIN the location, one movement per lot,
--   the tax split, the balance update, ONE transaction.
--
-- ----------------------------------------------------------------------------
-- WHAT IS THE RPC'S OWN, AND WHAT THE SCHEMA ALREADY HOLDS
-- ----------------------------------------------------------------------------
-- Most of what this function must not do, it cannot do: the composite foreign
-- keys of 0003 refuse another tenant's variant, `stock_movement_sign_follows_
-- reason` refuses a positive sale movement, `transaction_document_is_immutable`
-- refuses a correction, and 0015 refuses a lot opened without its receipt.
--
-- Three rules have NO schema behind them and are this function's alone. They
-- are the reason task 4b-i exists as a task rather than as 4b's first half:
--
--   1. THE LOCATION WALL. This function is `security definer`, so RLS is not
--      running when it executes — a bad `location_id` reaches the tables with
--      nothing in between. §2.6 calls the four lines below "the single most
--      important line in `record_sale`". ⚠️ NOTHING IN THE SCHEMA CATCHES ITS
--      ABSENCE: a version of this migration with the check deleted applies
--      clean and passes every suite steps 1–3 shipped, including 05, which
--      asserts the location wall on READS. supabase/tests/0016 is where that
--      claim lives, and it is not an RLS test.
--   2. IDEMPOTENCY. §2.6's four rows, over a CLIENT-generated primary key.
--   3. THE TIMESTAMPS. `occurred_at` is what daily totals and the 15-minute
--      void window read, and a till's clock is not worth trusting online.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE SIGNATURE CARRIES A FIFTH PARAMETER §2.6's TABLE DOES NOT NAME
-- ----------------------------------------------------------------------------
-- §2.6 writes the function as `record_sale(id, location_id, lines,
-- occurred_at)`. `sale.recorded_offline` is `not null` and has no other source:
-- the server cannot infer it, because §2.6 also says an ONLINE call may pass an
-- `occurred_at` and have it overridden. Inferring the flag from "the client sent
-- a time" would make every online client that fills the field in silently
-- backdate its own sales.
--
-- So `p_recorded_offline` is explicit, defaulted to false, and the four-argument
-- call in §2.6's table still works verbatim. It also decides more than the
-- clamp: §2.6's offline paragraph says such writes SKIP ENFORCEMENT, which is
-- 4c's dormant availability check reading this same flag.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE LINE PAYLOAD, AND WHY THE PRICE COMES FROM THE CLIENT
-- ----------------------------------------------------------------------------
--   [{ "variant_id":                "<uuid>",
--      "qty_display":               <numeric>,      -- what the cashier keyed
--      "qty_display_unit":          "<unit code>",  -- optional, defaults to
--                                                   -- the variant's sell unit
--      "unit_price_gross_per_base": <numeric> }]    -- the shelf price
--
-- This function does NOT look the price up in `price_list`. It could — the
-- table is right there — and it would be wrong twice:
--
--   * §2.5 rule 2 makes the gross unit price authoritative on a sale "because
--     that is the shelf price, and the shelf price is what the customer agreed
--     to". The customer agreed to the number the till displayed, not to
--     whatever `price_list` says at flush time.
--   * §2.6's offline queue flushes on reconnect, possibly days later. A
--     re-priced replay would restate a sale that has already been paid for, and
--     `price_list` is exactly the kind of row a shopkeeper edits on a Monday.
--
-- PER BASE UNIT, because that is the only price denomination the ledger has:
-- `price_list.price_per_base` and `sale_line.unit_price_net_per_base` are both
-- per base, and `sale_line` has no price-display columns at all. "Quoted per
-- 100 g" is a §2.8 presentation concern and it does not reach this table.
--
-- `tax_rate` is NOT accepted from the client. It is read from the variant at
-- write time and snapshotted onto the line — the catalog is the authority on
-- what a product is taxed at, and a till that could send its own rate is a till
-- that can understate IVA.
--
-- ----------------------------------------------------------------------------
-- ⚠️ A NEW SQLSTATE, AND IT IS A CLIENT CONTRACT
-- ----------------------------------------------------------------------------
-- `TD001` — same id, different lines. §2.6 requires this case to be told apart
-- from every other failure, because it is the one that must be dead-lettered
-- rather than retried, and the client branches on it. SQLSTATE classes
-- beginning 5–9 or I–Z are reserved for application use, so `TD` is ours.
--
-- The alternatives were considered and both lose: `23505` is what Postgres
-- itself raises for an ordinary duplicate key, so a client branching on it
-- would dead-letter unrelated conflicts, and `P0001` is what every bare `raise`
-- in this schema already produces. ⚠️ IT IS CHEAP TO CHANGE TODAY AND DEAR
-- AFTER A CLIENT SHIPS — flagged in docs/PLAN.md for that reason.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- record_sale()
-- ----------------------------------------------------------------------------

create function public.record_sale(
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
  v_existing  public.sale%rowtype;
  v_line      record;
  v_alloc     record;
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
  if v_offline then
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
     created_by, recorded_offline, payload_hash)
  values
    (p_id, v_ws, p_location_id, v_at, v_tot_net, v_tot_tax,
     v_user, v_offline, v_hash)
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

comment on function public.record_sale(uuid, uuid, jsonb, timestamptz, boolean) is
  'Records one sale: header, lines, FEFO allocation within the location, one '
  'movement per lot, the tax split gross-first with tax as the residual, in one '
  'transaction. Validates the location in its own body — RLS is not running '
  'here. Idempotent on the client-generated id: the same payload returns '
  'already_recorded, a different one raises TD001 for the caller to '
  'dead-letter. occurred_at is server now() unless recorded_offline, when the '
  'client value is clamped to [now() - 72h, now()]. ADR-035 §2.4, §2.5, §2.6.';


-- ----------------------------------------------------------------------------
-- Grants  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- `authenticated` and nothing else. `anon` has no business writing a sale, and
-- the function is the ONLY route: 0003 revoked every table privilege on `sale`
-- and `sale_line` from both roles, so a client cannot insert around it even
-- with the policies open.
--
-- Every member may sell, including a cashier. That is the whole point of the
-- location wall being inside the body — the RPC does not ask what role you
-- hold, it asks which stores you may act in (docs/PLAN.md, owner 2026-08-24:
-- shift cover is a reassignment, not an override).

revoke all on function
  public.record_sale(uuid, uuid, jsonb, timestamptz, boolean) from public;
grant execute on function
  public.record_sale(uuid, uuid, jsonb, timestamptz, boolean) to authenticated;
