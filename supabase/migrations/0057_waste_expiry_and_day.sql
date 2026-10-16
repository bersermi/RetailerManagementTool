-- ============================================================================
-- 0057 — A WRITE-OFF'S EXPIRY DATE, AND THE DAY SHE PICKS. Plan task `8j`, the
-- first of the data Desperdicio's redesign needs (`8g`, the owner, 2026-10-16):
-- *"By simply throwing something away the user should be able to log easily the
-- waste with basic data (pick the product(s), quantity, expiry date, throw away
-- date) with some default values that can simplify the recording."*
--
-- TWO CHANGES, BOTH ADDITIVE:
--
--   1. `waste_line.expiry_date` — nullable. A write-off that does not say one
--      is still a write-off; nothing before 0057 had one, and nothing is guessed
--      for them. ⚠️ It is the line's own fact, not a lot's: `stock_batch` keeps
--      the expiry a DELIVERY carried (`0018`'s three-tier policy), and the owner
--      ruled on 2026-09-21 that Comprar does not ask for one. This is what the
--      person holding the product READ off it on the day it went in the bin.
--   2. `record_waste` keeps the day she picks online as well as offline, inside
--      the same 72 hours (see the function's own comment at the date branch).
--   3. ⚠️ AND SO `void_transaction`'s CASHIER WINDOW STARTS AT `recorded_at`
--      ONLINE TOO. It read `occurred_at` online on the grounds that the two are
--      the same instant there — true of every document until (2). A write-off
--      dated *Ayer* would otherwise land with its fifteen minutes already gone.
--      Found by `docs/checks/6a-ii-a-waste-list-contract.sh`, which voids a
--      write-off recorded with a client time in the past. Nothing moves for a
--      sale or a purchase: online, their two timestamps are one.
--
-- ⚠️ `record_waste` IS REPLACED WHOLE — `0025`'s body, word for word, with the
-- four places that carry the expiry and the date branch changed. Its signature
-- is unchanged, so every caller, every queued write and every dead letter goes
-- on working; a line without `expiry_date` hashes as it did before.
--
-- ⚠️ NO NEW RULE ABOUT WHO MAY DO WHAT: the fence is `record_waste`'s own, as
-- before. `supabase/tests/0057_waste_expiry_and_day.sql` drives it.
-- ============================================================================

alter table public.waste_line
  add column expiry_date date;

comment on column public.waste_line.expiry_date is
  'What the product said on the day it was written off, when the person writing '
  'it off read it. Null when nobody said. 0057, plan 8j.';

create or replace function public.record_waste(
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

comment on function public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid) is
  'Records one waste event: header, lines, FEFO allocation at cost, one '
  'negative movement per lot, in one transaction. Records UNCONDITIONALLY — no '
  'availability check, because the goods are already in the bin (§2.6, settled '
  '2026-09-04). occurred_at is the day the caller picked, online or offline, '
  'clamped to [now() - 72h, now()] (0057; before it, online was always now()) '
  '— ⚠️ EXCEPT on a replay '
  '(p_replay_of_failed_write_id non-null, 0025), where it is kept verbatim, is '
  'required, and requires manager. Each line may carry an expiry_date (0057). '
  'ADR-035 §2.4, §2.6, §2.9.';

-- ⚠️ `create or replace` keeps the grants; they are re-issued anyway so this
-- file states the whole fence on its own, as 0025 did.
revoke all on function
  public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid) from public;
grant execute on function
  public.record_waste(uuid, uuid, jsonb, timestamptz, boolean, uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. void_transaction — 0025's body, the window's basis changed (see above)
-- ----------------------------------------------------------------------------
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
    -- ⚠️⚠️ 0057: AND NOW recorded_at ON AN ONLINE WRITE TOO, because the sentence
    -- above stopped being true for a write-off. `record_waste` keeps the day she
    -- picks online (*Ayer*, *Antier*), so a write-off's occurred_at may be a day
    -- before it landed, and measuring her fifteen minutes from it would close
    -- the window before she could use it. recorded_at is when SHE recorded it.
    -- ⚠️ For a sale and a purchase nothing moves: online, their occurred_at IS
    -- now() and so is their recorded_at — the same transaction timestamp.
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
    v_basis := case when not v_replayed
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
  'time, TD003 otherwise. The window reads recorded_at — on an offline write '
  'since 2026-09-04, and on an online one too since 0057, because a write-off '
  'now keeps the day she picked (for a sale or a purchase the two are the same '
  'instant online) — ⚠️ EXCEPT on a REPLAYED '
  'document (replay_of_failed_write_id non-null, 0025), which is exempt from '
  'the offline half and always measured from occurred_at, because a replay '
  'takes a fresh recorded_at and would otherwise be handed a brand-new fifteen '
  'minutes of staff self-service void on a two-day-old sale.';

revoke all on function public.void_transaction(text, uuid, text) from public;
grant execute on function public.void_transaction(text, uuid, text) to authenticated;
