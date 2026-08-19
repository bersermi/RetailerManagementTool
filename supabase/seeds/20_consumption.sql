-- ============================================================================
-- 20_consumption.sql — stock leaving the shop
-- ============================================================================
-- docs/PLAN.md task 1.6b, the middle third of the ledger seed. Runs after
-- 10_deliveries.sql, which put the stock on the shelves this file empties.
--
-- WHAT THIS FILE WRITES:
--   * sale / sale_line      — the dominant loop
--   * waste / waste_line    — reason-first, with a cost snapshot
--   * transfers             — paired movements, no document table (§2.4)
--   * the negative movements for all three
--
-- WHAT IT DOES NOT WRITE: reversals. Those are 1.6c, and an assertion enforces it.
--
-- ----------------------------------------------------------------------------
-- NOTHING HERE CHOOSES A BATCH. THAT IS THE WHOLE POINT.
-- ----------------------------------------------------------------------------
-- Every unit that leaves goes through `allocate_fefo()` or `allocate_transfer()`
-- — the same functions `record_sale`, `record_waste` and `record_transfer` will
-- call in 0006. If this file picked lots by hand it would be fast, it would look
-- right, and the design gate at step 2 would be measuring margin the real system
-- never produces (docs/PLAN.md, "Decided 2026-08-17 — the seed's FEFO allocation").
--
-- THE TWO ALLOCATORS DIVIDE THE WORK DIFFERENTLY, and getting this backwards is
-- the easiest mistake in this file:
--   * `allocate_fefo()`     decides, locks, and RETURNS the split. **The caller
--                           writes the movements.** It writes only one thing
--                           itself — a new lot, in shortfall branch three.
--   * `allocate_transfer()` does the whole paired write: destination lots and all
--                           four movements. **The caller writes nothing.**
--
-- The locks `allocate_fefo()` takes are held until the CALLER's transaction ends,
-- so allocating and then writing the movements in a later transaction is the one
-- way to use it wrongly. Here they are the same statement.
--
-- ----------------------------------------------------------------------------
-- BACKDATED HISTORY CANNOT SPEND STOCK THAT HAD NOT ARRIVED
-- ----------------------------------------------------------------------------
-- The seed writes three months backwards, but `batch_balance` has no notion of
-- time: by the time this file runs, every lot from every one of the thirteen weeks
-- is already on the shelf. A naive sale dated in May would therefore be free to
-- consume a lot received in August, and `allocate_fefo()` would hand it over
-- without complaint — it allocates from what is open, which is exactly right at a
-- till and exactly wrong when writing history.
--
-- The result would still satisfy the §2.4 invariant. It would still be internally
-- consistent. And "stock on hand at the end of May" would be a number no sequence
-- of real events could have produced, which is precisely the kind of fiction the
-- design gate must not be certified against.
--
-- So each withdrawal is capped at what had genuinely arrived: walk the lots in
-- FEFO order, accumulate while `received_at <= occurred_at`, and STOP at the first
-- future lot rather than skipping past it. Stopping rather than skipping is the
-- important half — skipping would let the allocator reach a lot the shop could not
-- have touched, because FEFO order is not receipt order.
--
-- The one deliberate exception is the oversale in section 6, which is meant to
-- drive a balance negative and is documented where it happens.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Refuse to run out of order, or twice
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.stock_batch) then
    raise exception '20_consumption.sql runs after 10_deliveries.sql — no stock found'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  if exists (select 1 from public.sale) or exists (select 1 from public.waste) then
    raise exception '20_consumption.sql expects no sales or waste yet — run `supabase db reset`'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 1. Scaffolding
-- ----------------------------------------------------------------------------
-- Looked up by name, like every other seed file. Nothing named `_c_*` outlives it.

create table public._c_ref (k text primary key, v uuid not null);

insert into public._c_ref (k, v)
select 'ws_a', id from public.workspace where display_name = 'Tienda Doña Lupe';
insert into public._c_ref (k, v)
select 'ws_b', id from public.workspace where display_name = 'Abarrotes El Roble';
insert into public._c_ref (k, v)
select 'loc_a_centro', id from public.location
 where workspace_id = (select v from public._c_ref where k = 'ws_a') and name = 'Doña Lupe Centro';
insert into public._c_ref (k, v)
select 'loc_a_mercado', id from public.location
 where workspace_id = (select v from public._c_ref where k = 'ws_a') and name = 'Sucursal Mercado';
insert into public._c_ref (k, v)
select 'loc_b', id from public.location
 where workspace_id = (select v from public._c_ref where k = 'ws_b');

-- CASHIERS SELL. Managers and owners receive deliveries (1.6a) and write off waste
-- (below). That division is the owner's answer of 2026-08-18 applied consistently:
-- the people who appear on a sale are the people who stand at a till.
insert into public._c_ref (k, v) values
  ('user_owner_a',    '5eed0001-0000-0000-0000-000000000001'),
  ('user_manager_a',  '5eed0001-0000-0000-0000-000000000002'),
  ('user_caja_centro','5eed0001-0000-0000-0000-000000000003'),
  ('user_caja_merc',  '5eed0001-0000-0000-0000-000000000004'),
  ('user_owner_b',    '5eed0001-0000-0000-0000-000000000005'),
  ('user_caja_roble', '5eed0001-0000-0000-0000-000000000006');


-- ----------------------------------------------------------------------------
-- 2. What a withdrawal may legally take, at a point in time
-- ----------------------------------------------------------------------------
-- The FEFO prefix that had actually arrived. Returns one row per variant with the
-- quantity available without time travel, and it is the only place in this file
-- that reasons about lots at all — everything below asks it for a number and then
-- hands that number to the allocator.
--
-- `rn < first future lot's rn` is the stop-don't-skip rule from the header. A
-- variant whose earliest-expiring open lot has not been received yet contributes
-- NOTHING, even if a later lot in FEFO order is old enough, because the allocator
-- would take the future one first.

create function public._c_available(p_ws uuid, p_loc uuid, p_at timestamptz)
returns table (variant_id uuid, max_qty numeric)
language sql
stable
as $$
  with lots as (
    select bb.variant_id, bb.remaining_base, bb.received_at,
           row_number() over (partition by bb.variant_id
                              order by bb.expiry_date nulls last, bb.received_at, bb.batch_id) as rn
      from public.batch_balance bb
     where bb.workspace_id = p_ws and bb.location_id = p_loc and bb.remaining_base > 0
  ),
  cut as (
    select l.variant_id, min(l.rn) as rn from lots l where l.received_at > p_at group by l.variant_id
  )
  select l.variant_id, sum(l.remaining_base)
    from lots l
    left join cut c on c.variant_id = l.variant_id
   where l.rn < coalesce(c.rn, 2147483647)
   group by l.variant_id
  having sum(l.remaining_base) > 0
$$;


-- ----------------------------------------------------------------------------
-- 3. The sell price at a moment
-- ----------------------------------------------------------------------------
-- Location override first, workspace default second — `location_id is null` means
-- "applies to every store" (§2.3), and this is the one lookup where getting that
-- precedence backwards is invisible: every price would still be *a* price.
-- Sucursal Mercado's produce is 8% dearer, and if this returned the workspace row
-- there instead, the difference the seed exists to create would vanish.

create function public._c_price(p_ws uuid, p_loc uuid, p_variant uuid, p_on date)
returns numeric
language sql
stable
as $$
  select pl.price_per_base
    from public.price_list pl
   where pl.workspace_id = p_ws and pl.variant_id = p_variant
     and (pl.location_id = p_loc or pl.location_id is null)
     and pl.effective_from <= p_on
     and (pl.effective_to is null or pl.effective_to > p_on)
   order by (pl.location_id is not null) desc
   limit 1
$$;


-- ----------------------------------------------------------------------------
-- 4. Sales
-- ----------------------------------------------------------------------------
-- Sequential, and it has to be: every ticket changes what the next one can take,
-- so there is no set-based version of this that respects its own arithmetic. One
-- candidate query per ticket, then one `allocate_fefo()` call per line.
--
-- MONEY IS SPLIT OUT OF THE GROSS, PER LINE (§2.5). `prices_include_tax` is true
-- for both merchants: the sticker is what the customer pays.
--
--     line_gross = round(unit_gross × qty)
--     line_net   = round(line_gross / (1 + rate))
--     line_tax   = line_gross − line_net        -- residual, never rounded alone
--
-- The residual is what makes `net + tax = gross` hold exactly on every line. The
-- document total is the sum of the rounded lines, never the document rounded on
-- its own — and, as in 1.6a, the header cannot be patched afterwards, so the lines
-- are built first and the header is written from their sums.

do $$
declare
  v_store   record;
  v_day     date;
  v_ticket  integer;
  v_key     text;
  v_at      timestamptz;
  v_sale_id uuid;
  v_line    record;
  v_alloc   record;
  v_qty     numeric(14,3);
  v_gross   numeric(12,2);
  v_net     numeric(12,2);
  v_tax     numeric(12,2);
  v_tot_net numeric(12,2);
  v_tot_tax numeric(12,2);
  v_nlines  integer;
begin
  create temp table _c_pending (
    variant_id uuid, qty_base numeric(14,3), qty_display numeric(14,3),
    qty_display_unit text, unit_price_net numeric(14,6),
    line_net numeric(12,2), tax_amount numeric(12,2), tax_rate numeric(5,4)
  ) on commit drop;

  for v_store in
    select * from (values
      ((select v from public._c_ref where k = 'ws_a'), (select v from public._c_ref where k = 'loc_a_centro'),
       (select v from public._c_ref where k = 'user_caja_centro'), 'centro', 5),
      ((select v from public._c_ref where k = 'ws_a'), (select v from public._c_ref where k = 'loc_a_mercado'),
       (select v from public._c_ref where k = 'user_caja_merc'), 'mercado', 3),
      ((select v from public._c_ref where k = 'ws_b'), (select v from public._c_ref where k = 'loc_b'),
       (select v from public._c_ref where k = 'user_caja_roble'), 'roble', 3)
    ) as s(ws, loc, cashier, tag, tickets_per_day)
  loop
    -- Selling starts a week after the first delivery, so the shelves are not bare
    -- on day one and FEFO has more than a single lot to choose between.
    for v_day in select generate_series(date '2026-05-26', date '2026-08-15', interval '1 day')::date
    loop
      for v_ticket in 1 .. v_store.tickets_per_day
      loop
        v_key := v_store.tag || '|' || v_day::text || '|t' || v_ticket;
        v_at  := v_day + (9 + (abs(hashtext(v_key)) % 11)) * interval '1 hour'
                       + (abs(hashtext(v_key || 'm')) % 60) * interval '1 minute';

        delete from _c_pending;

        -- One to four products, chosen from what had actually arrived by now, and
        -- weighted so the shop looks like a shop: whatever is nearest to expiry
        -- moves, because that is what is at the front.
        insert into _c_pending
        select a.variant_id,
               q.qty,
               round(q.qty / u.factor_to_base, 3),
               pv.sell_unit_code,
               0, 0, 0, pv.tax_rate
          from public._c_available(v_store.ws, v_store.loc, v_at) a
          join public.product_variant pv on pv.id = a.variant_id
          join public.unit u on u.code = pv.sell_unit_code
         cross join lateral (
           select least(
                    a.max_qty,
                    case when pv.base_unit_code in ('g','ml')
                         then (100 + (abs(hashtext(v_key || pv.name)) % 1900))::numeric
                         else (1 + (abs(hashtext(v_key || pv.name)) % 4))::numeric
                    end
                  ) as qty
         ) q
         where q.qty > 0
         order by abs(hashtext(v_key || 'pick' || pv.name)), pv.name
         limit 1 + (abs(hashtext(v_key || 'n')) % 4);

        select count(*) into v_nlines from _c_pending;
        continue when v_nlines = 0;

        -- Price the lines, then total them, then write the header. In that order,
        -- because `sale` is append-only.
        update _c_pending p
           set unit_price_net = sub.unit_net,
               line_net       = sub.net,
               tax_amount     = sub.tax
          from (
            select p2.variant_id,
                   round(round(public._c_price(v_store.ws, v_store.loc, p2.variant_id, v_day)
                               * p2.qty_base, 2) / (1 + p2.tax_rate), 2) as net,
                   round(public._c_price(v_store.ws, v_store.loc, p2.variant_id, v_day)
                         * p2.qty_base, 2)
                     - round(round(public._c_price(v_store.ws, v_store.loc, p2.variant_id, v_day)
                               * p2.qty_base, 2) / (1 + p2.tax_rate), 2) as tax,
                   round(round(round(public._c_price(v_store.ws, v_store.loc, p2.variant_id, v_day)
                               * p2.qty_base, 2) / (1 + p2.tax_rate), 2) / p2.qty_base, 6) as unit_net
              from _c_pending p2
          ) sub
         where sub.variant_id = p.variant_id;

        -- A line that rounds to nothing is not a line. Tiny weighed quantities of
        -- cheap produce can price to zero centavos, and a zero-money line with a
        -- real quantity would understate revenue while still consuming stock.
        delete from _c_pending where line_net <= 0;
        select count(*), coalesce(sum(line_net),0), coalesce(sum(tax_amount),0)
          into v_nlines, v_tot_net, v_tot_tax from _c_pending;
        continue when v_nlines = 0;

        v_sale_id := gen_random_uuid();
        insert into public.sale
          (id, workspace_id, location_id, occurred_at, recorded_at,
           total_net, total_tax, created_by, recorded_offline, payload_hash)
        values (v_sale_id, v_store.ws, v_store.loc, v_at, v_at,
                v_tot_net, v_tot_tax, v_store.cashier, false, md5(v_key));

        for v_line in select * from _c_pending
        loop
          insert into public.sale_line
            (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
             qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
          values (v_store.ws, v_store.loc, v_sale_id, v_line.variant_id, v_line.qty_base,
                  v_line.qty_display, v_line.qty_display_unit, v_line.unit_price_net,
                  v_line.line_net, v_line.tax_amount, v_line.tax_rate);

          -- THE ALLOCATOR DECIDES. One movement per lot it hands back — a single
          -- line can span several lots, and each one is its own movement because
          -- each carries its own cost.
          for v_alloc in
            select * from public.allocate_fefo(v_store.ws, v_store.loc, v_line.variant_id,
                                               v_line.qty_base, v_store.cashier)
          loop
            insert into public.stock_movement
              (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
               unit_cost_net_per_base, sale_id, occurred_at, recorded_at, created_by)
            values (v_store.ws, v_store.loc, v_alloc.batch_id, v_line.variant_id, 'sale',
                    -v_alloc.qty_base, v_alloc.unit_cost_net_per_base, v_sale_id,
                    v_at, v_at, v_store.cashier);
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
end;
$$;


-- ----------------------------------------------------------------------------
-- 5. Waste
-- ----------------------------------------------------------------------------
-- Written off by a manager or an owner, never a cashier: `waste_line` carries cost
-- and is manager-and-above (§2.7), so a cashier appearing as its author would
-- describe a person who cannot read back what they wrote.
--
-- Weighted to the perishable families, and mostly `caducado`, because that is what
-- a shop actually throws away. `robo o faltante` is deliberately one value — a
-- count cannot tell theft from a miscount, and asking the operator to choose
-- produces a fiction that reads as data (docs/PLAN.md, 2026-08-17).
--
-- ONE COST PER LINE, WEIGHTED. `waste_line.unit_cost_net_per_base` is a single
-- number, but a write-off can span lots bought at different prices. The movements
-- carry the exact per-lot cost and are the system of record; the line carries the
-- quantity-weighted average of what the allocator actually took. Averaging on the
-- document is a snapshot; averaging on the ledger would be a lie.

do $$
declare
  v_store    record;
  v_day      date;
  v_key      text;
  v_at       timestamptz;
  v_waste_id uuid;
  v_variant  record;
  v_alloc    record;
  v_cost_num numeric(20,6);
  v_cost_qty numeric(14,3);
  v_gross    numeric(12,2);
  v_net      numeric(12,2);
  v_reason   public.waste_reason;
begin
  for v_store in
    select * from (values
      ((select v from public._c_ref where k = 'ws_a'), (select v from public._c_ref where k = 'loc_a_centro'),
       (select v from public._c_ref where k = 'user_manager_a'), 'wcentro'),
      ((select v from public._c_ref where k = 'ws_a'), (select v from public._c_ref where k = 'loc_a_mercado'),
       (select v from public._c_ref where k = 'user_owner_a'), 'wmercado'),
      ((select v from public._c_ref where k = 'ws_b'), (select v from public._c_ref where k = 'loc_b'),
       (select v from public._c_ref where k = 'user_owner_b'), 'wroble')
    ) as s(ws, loc, author, tag)
  loop
    -- Twice a week: the shop clears the shelf on Mondays and Fridays.
    for v_day in
      select d::date from generate_series(date '2026-06-01', date '2026-08-14', interval '1 day') d
       where extract(dow from d) in (1, 5)
    loop
      v_key := v_store.tag || '|' || v_day::text;
      v_at  := v_day + interval '20 hours' + (abs(hashtext(v_key)) % 40) * interval '1 minute';

      v_waste_id := gen_random_uuid();
      v_reason := (array['caducado','caducado','caducado','dañado',
                         'merma de preparación','robo o faltante','error de captura']
                   )[1 + (abs(hashtext(v_key || 'r')) % 7)]::public.waste_reason;

      -- THREE THINGS MUST HAPPEN IN THIS ORDER, and the foreign keys enforce it:
      -- the header, then the lines, then the movements — `stock_movement.waste_id`
      -- points at a document that has to exist first. But the header's totals come
      -- from the lines, and the lines' cost comes from what the allocator took. So
      -- the allocation is STAGED here and replayed as movements further down.
      --
      -- Staging is safe because each variant appears at most once per document —
      -- `_c_available()` returns one row per variant — so no two staged allocations
      -- can claim the same lot before the balances are updated.
      create temp table _c_wl (
        variant_id uuid, qty numeric(14,3), qty_display numeric(14,3), unit text,
        unit_price_net numeric(14,6), line_net numeric(12,2), tax_amount numeric(12,2),
        tax_rate numeric(5,4), unit_cost numeric(14,6)
      ) on commit drop;
      create temp table _c_wa (
        variant_id uuid, batch_id uuid, qty_base numeric(14,3),
        unit_cost_net_per_base numeric(14,6)
      ) on commit drop;

      for v_variant in
        select a.variant_id,
               least(a.max_qty,
                     case when pv.base_unit_code in ('g','ml')
                          then (100 + (abs(hashtext(v_key || pv.name)) % 900))::numeric
                          else (1 + (abs(hashtext(v_key || pv.name)) % 3))::numeric
                     end) as qty,
               pv.sell_unit_code, pv.tax_rate, pv.base_unit_code, pv.name,
               u.factor_to_base
          from public._c_available(v_store.ws, v_store.loc, v_at) a
          join public.product_variant pv on pv.id = a.variant_id
          join public.product_family pf on pf.id = pv.family_id
          join public.unit u on u.code = pv.sell_unit_code
         where pf.track_expiry
         order by abs(hashtext(v_key || 'pick' || pv.name)), pv.name
         limit 1 + (abs(hashtext(v_key || 'n')) % 3)
      loop
        continue when v_variant.qty <= 0;

        -- Retail value, not cost: what the shop failed to earn. `waste` the header
        -- is readable by every member for exactly this reason — it carries value,
        -- not cost — while `waste_line` is manager-and-above (§2.7).
        --
        -- Priced BEFORE allocating, deliberately: a line that rounds to nothing is
        -- dropped, and dropping it after the allocator had run would leave staged
        -- movements belonging to a line that never existed.
        v_gross := round(public._c_price(v_store.ws, v_store.loc, v_variant.variant_id, v_day)
                         * v_variant.qty, 2);
        v_net   := round(v_gross / (1 + v_variant.tax_rate), 2);
        continue when v_net <= 0;

        v_cost_num := 0; v_cost_qty := 0;
        for v_alloc in
          select * from public.allocate_fefo(v_store.ws, v_store.loc, v_variant.variant_id,
                                             v_variant.qty, v_store.author)
        loop
          insert into _c_wa values (v_variant.variant_id, v_alloc.batch_id,
                                    v_alloc.qty_base, v_alloc.unit_cost_net_per_base);
          v_cost_num := v_cost_num + v_alloc.qty_base * v_alloc.unit_cost_net_per_base;
          v_cost_qty := v_cost_qty + v_alloc.qty_base;
        end loop;

        insert into _c_wl values (
          v_variant.variant_id, v_variant.qty,
          round(v_variant.qty / v_variant.factor_to_base, 3), v_variant.sell_unit_code,
          round(v_net / v_variant.qty, 6), v_net, v_gross - v_net, v_variant.tax_rate,
          round(v_cost_num / nullif(v_cost_qty, 0), 6));
      end loop;

      if exists (select 1 from _c_wl) then
        insert into public.waste
          (id, workspace_id, location_id, occurred_at, recorded_at,
           total_net, total_tax, created_by, recorded_offline, payload_hash)
        select v_waste_id, v_store.ws, v_store.loc, v_at, v_at,
               sum(line_net), sum(tax_amount), v_store.author, false, md5(v_key)
          from _c_wl;

        insert into public.waste_line
          (workspace_id, location_id, waste_id, variant_id, qty_base, qty_display,
           qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate,
           reason, unit_cost_net_per_base)
        select v_store.ws, v_store.loc, v_waste_id, variant_id, qty, qty_display, unit,
               unit_price_net, line_net, tax_amount, tax_rate, v_reason, unit_cost
          from _c_wl;

        insert into public.stock_movement
          (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
           unit_cost_net_per_base, waste_id, occurred_at, recorded_at, created_by)
        select v_store.ws, v_store.loc, a.batch_id, a.variant_id, 'waste',
               -a.qty_base, a.unit_cost_net_per_base, v_waste_id, v_at, v_at, v_store.author
          from _c_wa a;
      end if;

      drop table _c_wl;
      drop table _c_wa;
    end loop;
  end loop;
end;
$$;


-- ----------------------------------------------------------------------------
-- 6. Transfers
-- ----------------------------------------------------------------------------
-- Centro sends to the Mercado stall. Only merchant A can transfer at all — it is
-- the only one with two stores, which is half of why it has two.
--
-- THE CALLER WRITES NOTHING HERE. `allocate_transfer()` does the entire paired
-- write: it FEFO-allocates at the origin, opens one destination lot per origin lot
-- carrying cost and expiry forward, and writes all four movements. That is the
-- opposite of `allocate_fefo()` above, and confusing the two is how a transfer ends
-- up as a loss at one store and a windfall at the other.
--
-- One `transfer_group_id` per shipment, shared by every variant on the van: the
-- group is what makes the legs one movement of stock rather than two unrelated
-- events (§2.4). A transfer has no document table, deliberately.
--
-- `received_at` is NOT carried forward — store B genuinely received the goods on
-- the day of the transfer — but the expiry IS, because a tomato does not get
-- younger by changing shelves, and expiry is the FEFO sort key.

do $$
declare
  v_ws       uuid := (select v from public._c_ref where k = 'ws_a');
  v_from     uuid := (select v from public._c_ref where k = 'loc_a_centro');
  v_to       uuid := (select v from public._c_ref where k = 'loc_a_mercado');
  v_author   uuid := (select v from public._c_ref where k = 'user_manager_a');
  v_day      date;
  v_key      text;
  v_at       timestamptz;
  v_group    uuid;
  v_variant  record;
begin
  for v_day in
    select d::date from generate_series(date '2026-06-10', date '2026-08-12', interval '1 day') d
     where extract(dow from d) = 3 and (extract(week from d)::integer % 2) = 0
  loop
    v_key   := 'xfer|' || v_day::text;
    v_at    := v_day + interval '7 hours';
    v_group := gen_random_uuid();

    for v_variant in
      select a.variant_id,
             least(a.max_qty,
                   case when pv.base_unit_code in ('g','ml')
                        then (500 + (abs(hashtext(v_key || pv.name)) % 2500))::numeric
                        else (2 + (abs(hashtext(v_key || pv.name)) % 6))::numeric
                   end) as qty
        from public._c_available(v_ws, v_from, v_at) a
        join public.product_variant pv on pv.id = a.variant_id
       order by abs(hashtext(v_key || 'pick' || pv.name)), pv.name
       limit 3
    loop
      continue when v_variant.qty <= 0;
      perform public.allocate_transfer(v_ws, v_from, v_to, v_variant.variant_id,
                                       v_variant.qty, v_group, v_at, v_author);
    end loop;
  end loop;
end;
$$;


-- ----------------------------------------------------------------------------
-- 7. Two deliberate oversales
-- ----------------------------------------------------------------------------
-- Approved by the owner, 2026-08-18. **v1 records stock and does not enforce it**
-- (§2.6): a sale the system thinks it cannot cover is written, not blocked,
-- because refusing it happens at a counter in front of a customer. Until now every
-- number in this seed has been clamped to what was genuinely on the shelf, so the
-- shortfall branches of `allocate_fefo()` — the part of 1.3b with the most
-- reasoning behind it — were exercised by its own test fixture and by nothing else.
--
-- TWO DIFFERENT SHORTFALLS, because they end in different places:
--
--   (1) OVERDRAW A LOT THAT EXISTS. More is sold than remains. The allocator takes
--       what is there and charges the rest to the lot FEFO ran out on, at the cost
--       the shop actually paid. `remaining_base` goes negative, which is legal and
--       must stay legal — a `>= 0` constraint would turn a permitted oversale into
--       an exception at the till.
--
--   (2) SELL SOMETHING NEVER STOCKED HERE. The allocator opens a new adjustment lot
--       AT ZERO COST and charges the whole quantity to it. Zero rather than a
--       borrowed estimate, because 100% margin on those units is *visibly* wrong
--       and gets asked about, where a plausible invented cost is invisibly wrong
--       and is what §2.9 would then be built on (docs/PLAN.md, "Settled in 1.3b").
--
-- These are the only withdrawals in this file that ignore `_c_available()`. They
-- are marked so the running-balance assertion below can tell a designed negative
-- from an accidental one — which is the difference between recording a fact about
-- the shop and hiding a bug in the seed.

create table public._c_oversale (sale_id uuid primary key, kind text not null);

do $$
declare
  v_ws      uuid := (select v from public._c_ref where k = 'ws_a');
  v_loc     uuid := (select v from public._c_ref where k = 'loc_a_centro');
  v_cashier uuid := (select v from public._c_ref where k = 'user_caja_centro');
  v_at      timestamptz := timestamptz '2026-08-14 18:20:00+00';
  v_sale    uuid;
  v_variant uuid;
  v_have    numeric(14,3);
  v_qty     numeric(14,3);
  v_alloc   record;
  v_gross   numeric(12,2);
  v_net     numeric(12,2);
  v_rate    numeric(5,4);
  v_unit    text;
  v_factor  numeric(14,6);
begin
  -- (1) The overdraw. Pick the variant with the SMALLEST positive balance at
  -- Centro, so "sell three times what is there" is a small, comprehensible number
  -- rather than a spectacular one.
  -- Ordered by the product NAME as well as the quantity. `min(remaining)` ties
  -- freely across a catalog this size, and a uuid tiebreak would be no tiebreak at
  -- all — ids are regenerated on every reset. Caught by comparing two resets: the
  -- counts matched exactly and the revenue did not.
  select bb.variant_id, sum(bb.remaining_base)
    into v_variant, v_have
    from public.batch_balance bb
    join public.product_variant pv on pv.id = bb.variant_id
   where bb.workspace_id = v_ws and bb.location_id = v_loc and bb.remaining_base > 0
   group by bb.variant_id, pv.name
  having sum(bb.remaining_base) > 0
   order by sum(bb.remaining_base), pv.name
   limit 1;

  select pv.tax_rate, pv.sell_unit_code, u.factor_to_base
    into v_rate, v_unit, v_factor
    from public.product_variant pv join public.unit u on u.code = pv.sell_unit_code
   where pv.id = v_variant;

  v_qty  := v_have * 3;
  v_gross := round(public._c_price(v_ws, v_loc, v_variant, v_at::date) * v_qty, 2);
  v_net   := round(v_gross / (1 + v_rate), 2);
  v_sale  := gen_random_uuid();

  insert into public.sale
    (id, workspace_id, location_id, occurred_at, recorded_at, total_net, total_tax,
     created_by, recorded_offline, payload_hash)
  values (v_sale, v_ws, v_loc, v_at, v_at, v_net, v_gross - v_net, v_cashier, false,
          md5('oversale-overdraw'));
  insert into public.sale_line
    (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
     qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
  values (v_ws, v_loc, v_sale, v_variant, v_qty, round(v_qty / v_factor, 3), v_unit,
          round(v_net / v_qty, 6), v_net, v_gross - v_net, v_rate);

  for v_alloc in select * from public.allocate_fefo(v_ws, v_loc, v_variant, v_qty, v_cashier)
  loop
    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, sale_id, occurred_at, recorded_at, created_by)
    values (v_ws, v_loc, v_alloc.batch_id, v_variant, 'sale', -v_alloc.qty_base,
            v_alloc.unit_cost_net_per_base, v_sale, v_at, v_at, v_cashier);
  end loop;
  insert into public._c_oversale values (v_sale, 'overdraw');

  -- (2) Never stocked here. A variant merchant A sells at the Mercado but has never
  -- had at Centro — which is a real till event: a customer brings it to the counter
  -- because someone moved a crate informally.
  select pv.id, pv.tax_rate, pv.sell_unit_code, u.factor_to_base
    into v_variant, v_rate, v_unit, v_factor
    from public.product_variant pv
    join public.unit u on u.code = pv.sell_unit_code
   where pv.workspace_id = v_ws
     and not exists (select 1 from public.stock_batch sb
                      where sb.variant_id = pv.id and sb.location_id = v_loc)
   order by pv.name
   limit 1;

  v_qty   := case when v_unit in ('g','ml') then 500 else 2 end;
  v_at    := timestamptz '2026-08-14 19:05:00+00';
  v_gross := round(coalesce(public._c_price(v_ws, v_loc, v_variant, v_at::date), 10) * v_qty, 2);
  v_net   := round(v_gross / (1 + v_rate), 2);
  v_sale  := gen_random_uuid();

  insert into public.sale
    (id, workspace_id, location_id, occurred_at, recorded_at, total_net, total_tax,
     created_by, recorded_offline, payload_hash)
  values (v_sale, v_ws, v_loc, v_at, v_at, v_net, v_gross - v_net, v_cashier, false,
          md5('oversale-never-stocked'));
  insert into public.sale_line
    (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
     qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
  values (v_ws, v_loc, v_sale, v_variant, v_qty, round(v_qty / v_factor, 3), v_unit,
          round(v_net / v_qty, 6), v_net, v_gross - v_net, v_rate);

  for v_alloc in select * from public.allocate_fefo(v_ws, v_loc, v_variant, v_qty, v_cashier)
  loop
    insert into public.stock_movement
      (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
       unit_cost_net_per_base, sale_id, occurred_at, recorded_at, created_by)
    values (v_ws, v_loc, v_alloc.batch_id, v_variant, 'sale', -v_alloc.qty_base,
            v_alloc.unit_cost_net_per_base, v_sale, v_at, v_at, v_cashier);
  end loop;
  insert into public._c_oversale values (v_sale, 'never_stocked');
end;
$$;


-- ----------------------------------------------------------------------------
-- 8. Assertions
-- ----------------------------------------------------------------------------
-- `supabase db reset` exits non-zero when any of these raises, so these are a CI
-- gate on every push — verified in 1.5 by falsifying three of the skeleton's own.

do $$
declare
  v_ws_a uuid := (select v from public._c_ref where k = 'ws_a');
  v_ws_b uuid := (select v from public._c_ref where k = 'ws_b');
  v_n integer; v_pct numeric;
begin
  -- --- THE §2.4 INVARIANT, and here it finally means something -----------------
  -- In 1.6a this was trivially true: nothing had been withdrawn, so every balance
  -- was its own receipt. Now 2 400-odd negative movements have run through the
  -- allocator and the projection triggers, and a single mis-signed or mis-routed
  -- one shows up here.
  select count(*) into v_n from public.batch_balance_violations();
  if v_n > 0 then
    raise exception '20_consumption: % batch balance violation(s)', v_n;
  end if;

  -- --- nothing consumed stock that had not arrived ----------------------------
  -- The cap described in this file's header, asserted rather than assumed. Without
  -- it a May sale is free to eat an August lot, and every "stock on hand as at"
  -- query built at step 2 measures a shop that never existed.
  select count(*) into v_n
    from public.stock_movement m
    join public.stock_batch b on b.id = m.batch_id
   where b.origin = 'purchase' and b.received_at > m.occurred_at;
  if v_n > 0 then
    raise exception '20_consumption: % movement(s) consume a DELIVERED lot received after them', v_n;
  end if;

  -- ⚠️ THE ONE EXCEPTION, BOUNDED AND NAMED. `allocate_fefo()` (shortfall branch
  -- three) and `allocate_transfer()` both open new lots WITHOUT setting
  -- `received_at`, so it defaults to `now()` — the moment the seed runs, not the
  -- moment the event is dated. At a real till those coincide and the behaviour is
  -- correct. Backdated history is the case where they do not, and the transfer
  -- destination lots and the one adjustment lot are stamped today while their own
  -- movements are dated weeks earlier.
  --
  -- This is recorded as a finding against 0006, not patched here: the seed must not
  -- work around a function it exists to exercise. What this assertion does is stop
  -- the exception from widening — only lots the allocators opened may be affected,
  -- and only ever a handful.
  select count(*) into v_n
    from public.stock_movement m
    join public.stock_batch b on b.id = m.batch_id
   where b.received_at > m.occurred_at
     and b.origin not in ('transfer', 'adjustment');
  if v_n > 0 then
    raise exception '20_consumption: % lot(s) received after their movement are not allocator-opened', v_n;
  end if;
  select count(*) into v_n
    from public.stock_movement m
    join public.stock_batch b on b.id = m.batch_id
   where b.received_at > m.occurred_at;
  if v_n > 40 then
    raise exception '20_consumption: % allocator-stamped lots predate their movements — that exception is widening', v_n;
  end if;

  -- --- no balance went negative except where it was meant to -------------------
  -- Replays every batch's movements in order and watches the running total. A lot
  -- that dips below zero mid-history and recovers is invisible to
  -- `batch_balance_violations()`, which only sees the end state — and it is exactly
  -- what a seed that ignores time produces.
  select count(*) into v_n from (
    select m.batch_id,
           sum(m.qty_base) over (partition by m.batch_id
                                 order by m.occurred_at, m.id
                                 rows between unbounded preceding and current row) as running,
           m.sale_id
      from public.stock_movement m
  ) r
   where r.running < 0
     and (r.sale_id is null or r.sale_id not in (select sale_id from public._c_oversale));
  if v_n > 0 then
    raise exception '20_consumption: % point(s) where a lot went negative outside the designed oversales', v_n;
  end if;

  -- --- FEFO was actually obeyed ------------------------------------------------
  -- The strongest claim in this file. For every withdrawal, no lot that sorts
  -- EARLIER in FEFO order and had already arrived is still sitting there with stock
  -- in it — because the allocator would have taken that one first. Batches are
  -- immutable and balances only fall in this file, so "still open at the end" is
  -- sufficient evidence that it was open at the time.
  --
  -- The sort must match `allocate_fefo()` exactly: expiry ascending with nulls
  -- LAST, then received_at, then batch_id.
  select count(*) into v_n
    from public.stock_movement m
    join public.stock_batch b on b.id = m.batch_id
   where m.reason in ('sale','waste','transfer_out')
     and (m.sale_id is null or m.sale_id not in (select sale_id from public._c_oversale))
     and exists (
       select 1
         from public.batch_balance bb
         join public.stock_batch b2 on b2.id = bb.batch_id
        where bb.location_id = m.location_id
          and bb.variant_id  = m.variant_id
          and bb.remaining_base > 0
          and b2.received_at <= m.occurred_at
          and (coalesce(bb.expiry_date, date '9999-12-31'), bb.received_at, bb.batch_id)
            < (coalesce(b.expiry_date,  date '9999-12-31'), b.received_at,  b.id)
     );
  if v_n > 0 then
    raise exception '20_consumption: % withdrawal(s) skipped an older lot that was still open — FEFO not obeyed', v_n;
  end if;

  -- --- the two designed shortfalls --------------------------------------------
  if (select count(*) from public.batch_balance where remaining_base < 0) = 0 then
    raise exception '20_consumption: no lot went negative — the overdraw oversale did not happen';
  end if;
  if not exists (select 1 from public.stock_batch
                  where origin = 'adjustment' and unit_cost_net_per_base = 0) then
    raise exception '20_consumption: no zero-cost adjustment lot — shortfall branch three never ran';
  end if;

  -- --- transfers ----------------------------------------------------------------
  if (select coalesce(sum(qty_base), 0) from public.stock_movement
       where reason in ('transfer_in','transfer_out')) <> 0 then
    raise exception '20_consumption: transfer legs do not net to zero';
  end if;
  if exists (
    select 1 from public.stock_movement
     where transfer_group_id is not null
     group by transfer_group_id, variant_id
    having count(*) filter (where reason = 'transfer_out') <> count(*) filter (where reason = 'transfer_in')) then
    raise exception '20_consumption: a transfer has unpaired legs';
  end if;
  -- A transfer NEVER moves a batch. The destination is always a new lot cut from
  -- the origin, carrying cost and expiry forward (§2.4).
  if exists (
    select 1 from public.stock_batch
     where origin = 'transfer' and (source_batch_id is null or provider_id is not null)) then
    raise exception '20_consumption: a transfer lot has no source, or claims a provider';
  end if;
  if exists (
    select 1 from public.stock_batch d
      join public.stock_batch s on s.id = d.source_batch_id
     where d.origin = 'transfer'
       and (d.location_id = s.location_id
            or d.unit_cost_net_per_base <> s.unit_cost_net_per_base
            or d.expiry_date is distinct from s.expiry_date)) then
    raise exception '20_consumption: a transfer lot did not carry cost and expiry to a different store';
  end if;

  -- --- documents ----------------------------------------------------------------
  if exists (
    select 1 from public.sale s
      join (select sale_id, sum(line_net) n, sum(tax_amount) t
              from public.sale_line group by sale_id) l on l.sale_id = s.id
     where s.total_net <> l.n or s.total_tax <> l.t) then
    raise exception '20_consumption: a sale total is not the sum of its rounded lines';
  end if;
  if exists (
    select 1 from public.waste w
      join (select waste_id, sum(line_net) n, sum(tax_amount) t
              from public.waste_line group by waste_id) l on l.waste_id = w.id
     where w.total_net <> l.n or w.total_tax <> l.t) then
    raise exception '20_consumption: a waste total is not the sum of its rounded lines';
  end if;
  -- Every line moved stock. A document line with no movement behind it is revenue
  -- with nothing taken off the shelf.
  if exists (
    select 1 from public.sale_line sl
     where not exists (select 1 from public.stock_movement m
                        where m.sale_id = sl.sale_id and m.variant_id = sl.variant_id)) then
    raise exception '20_consumption: a sale line moved no stock';
  end if;
  if exists (
    select 1 from public.waste_line wl
     where not exists (select 1 from public.stock_movement m
                        where m.waste_id = wl.waste_id and m.variant_id = wl.variant_id)) then
    raise exception '20_consumption: a waste line moved no stock';
  end if;
  -- And the quantities agree: a line's movements sum to exactly what it sold.
  if exists (
    select 1 from public.sale_line sl
      join (select sale_id, variant_id, sum(-qty_base) q from public.stock_movement
             where reason = 'sale' group by sale_id, variant_id) m
        on m.sale_id = sl.sale_id and m.variant_id = sl.variant_id
     where m.q <> sl.qty_base) then
    raise exception '20_consumption: a sale line''s movements do not sum to its quantity';
  end if;

  -- --- who did what --------------------------------------------------------------
  -- Cashiers sell; managers and owners write off. `waste_line` carries cost and is
  -- manager-and-above, so a cashier authoring one would be a person who cannot read
  -- back what they wrote.
  if exists (
    select 1 from public.waste w join public.workspace_member wm
      on wm.user_id = w.created_by and wm.workspace_id = w.workspace_id
     where wm.role = 'staff') then
    raise exception '20_consumption: a cashier wrote off waste — that is a manager''s document';
  end if;
  if not exists (
    select 1 from public.sale s join public.workspace_member wm
      on wm.user_id = s.created_by and wm.workspace_id = s.workspace_id
     where wm.role = 'staff') then
    raise exception '20_consumption: no cashier ever made a sale';
  end if;

  -- --- shape -----------------------------------------------------------------------
  if (select count(distinct location_id) from public.sale) <> 3 then
    raise exception '20_consumption: all three stores should be selling';
  end if;
  select round(100.0 * count(*) filter (where workspace_id = v_ws_b) / count(*), 1)
    into v_pct from public.sale_line;
  if v_pct < 10 or v_pct > 45 then
    raise exception '20_consumption: merchant B holds % percent of sale lines, wanted a real minority', v_pct;
  end if;
  if (select count(distinct reason) from public.waste_line) < 5 then
    raise exception '20_consumption: the waste vocabulary is not fully exercised';
  end if;
  -- At least some lines had to span more than one lot, or FEFO never had to split.
  select count(*) into v_n from (
    select sale_id, variant_id from public.stock_movement
     where reason = 'sale' group by sale_id, variant_id having count(*) > 1) q;
  if v_n < 5 then
    raise exception '20_consumption: only % sale line(s) spanned multiple lots', v_n;
  end if;

  -- --- the boundary ----------------------------------------------------------------
  if exists (select 1 from public.sale where reversal_of is not null)
  or exists (select 1 from public.waste where reversal_of is not null)
  or exists (select 1 from public.purchase where reversal_of is not null)
  or exists (select 1 from public.stock_movement where reversal_of_movement_id is not null) then
    raise exception '20_consumption: reversals are 1.6c';
  end if;

  raise notice '20_consumption: % sales / % lines, % waste docs / % lines, % transfer shipments; B holds % percent of sale lines',
    (select count(*) from public.sale), (select count(*) from public.sale_line),
    (select count(*) from public.waste), (select count(*) from public.waste_line),
    (select count(distinct transfer_group_id) from public.stock_movement where transfer_group_id is not null),
    v_pct;
end;
$$;


-- ----------------------------------------------------------------------------
-- 9. Scaffolding out
-- ----------------------------------------------------------------------------
drop function public._c_available(uuid, uuid, timestamptz);
drop function public._c_price(uuid, uuid, uuid, date);
drop table public._c_oversale;
drop table public._c_ref;
