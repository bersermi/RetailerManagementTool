-- ============================================================================
-- 10_deliveries.sql — three months of stock arriving
-- ============================================================================
-- docs/PLAN.md task 1.6a, the first third of the ledger seed. Runs after
-- 00_skeleton.sql, which built the catalog this file fills.
--
-- WHAT THIS FILE WRITES, and nothing else:
--   * purchase / purchase_line  — the delivery documents
--   * stock_batch               — one lot per line, origin 'purchase'
--   * stock_movement            — one positive 'purchase' movement per lot
--
-- WHAT IT DOES NOT WRITE: anything that consumes stock. No sale, no waste, no
-- transfer, no reversal — those are 1.6b and 1.6c, and an assertion at the end of
-- this file enforces the boundary the same way 00_skeleton.sql enforces its own.
--
-- ----------------------------------------------------------------------------
-- WHY THE INVARIANT IS NOT THE INTERESTING CHECK HERE
-- ----------------------------------------------------------------------------
-- `batch_balance_violations()` is asserted empty below, and it would be empty even
-- if this file were badly wrong: nothing has been withdrawn yet, so every balance
-- is just its own receipt. **A green invariant at this stage means almost nothing**,
-- and saying so is the point — it becomes load-bearing in 1.6b, when stock starts
-- leaving.
--
-- What IS checkable now is PROVENANCE, and that is what the assertions concentrate
-- on: every batch traces to a purchase line, every line to a document, every
-- document to a provider in the same workspace and a location in the same tenant.
-- Plus the one thing 1.4 built and could only test on a fixture — that
-- `provider_price_memory` answers for every `(provider, variant)` pair actually
-- delivered, over real seed volumes rather than nine hand-written rows.
--
-- ----------------------------------------------------------------------------
-- EVERY BATCH IS OPENED BY A MOVEMENT, NOT BY THE BATCH ROW
-- ----------------------------------------------------------------------------
-- `stock_batch` has NO remaining-quantity column. `batch_balance` is opened at zero
-- by a trigger when the batch is created, and the receipt itself is a movement
-- (docs/PLAN.md, "Settled in 1.3a"). So this file writes the batch AND a positive
-- movement for the same quantity; writing only the batch would leave the shop at
-- zero stock with a full shelf, and seeding the balance directly would double every
-- delivery. `record_purchase` in 0006 must do exactly what this file does.
--
-- ----------------------------------------------------------------------------
-- WHO RECEIVES A DELIVERY
-- ----------------------------------------------------------------------------
-- The manager and the owner, never a cashier. That is the owner's answer of
-- 2026-08-18 — "the cashier is not who accepts deliveries" — and it is why
-- `created_by` on every document here is a manager or an owner. It also keeps the
-- seed consistent with `provider_price_memory` being manager-and-above: the people
-- who wrote these documents are exactly the people who can read the prices back.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Refuse to run out of order, or twice
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.product_variant) then
    raise exception
      '10_deliveries.sql runs after 00_skeleton.sql — no catalog found'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  if exists (select 1 from public.purchase) then
    raise exception
      '10_deliveries.sql expects no deliveries yet (found %) — run `supabase db reset`',
      (select count(*) from public.purchase)
      using errcode = 'object_not_in_prerequisite_state';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- 1. Scaffolding
-- ----------------------------------------------------------------------------
-- Ids are looked up by NAME, not carried over from 00_skeleton.sql, which drops its
-- own scaffolding before it finishes. Nothing named `_seed_*` outlives the file that
-- made it, and no seed file depends on a table no migration created.

create table public._d_ref (k text primary key, v uuid not null);

insert into public._d_ref (k, v)
select 'ws_a', id from public.workspace where display_name = 'Tienda Doña Lupe';
insert into public._d_ref (k, v)
select 'ws_b', id from public.workspace where display_name = 'Abarrotes El Roble';
insert into public._d_ref (k, v)
select 'loc_a_centro', id from public.location
 where workspace_id = (select v from public._d_ref where k = 'ws_a') and name = 'Doña Lupe Centro';
insert into public._d_ref (k, v)
select 'loc_a_mercado', id from public.location
 where workspace_id = (select v from public._d_ref where k = 'ws_a') and name = 'Sucursal Mercado';
insert into public._d_ref (k, v)
select 'loc_b', id from public.location
 where workspace_id = (select v from public._d_ref where k = 'ws_b');

-- The people who receive deliveries. Cashiers are deliberately absent.
insert into public._d_ref (k, v) values
  ('user_owner_a',   '5eed0001-0000-0000-0000-000000000001'),
  ('user_manager_a', '5eed0001-0000-0000-0000-000000000002'),
  ('user_owner_b',   '5eed0001-0000-0000-0000-000000000005');


-- ----------------------------------------------------------------------------
-- 2. Who supplies what
-- ----------------------------------------------------------------------------
-- A provider does not carry the whole catalog, and this is the single most
-- important shape in this file. If every provider supplied everything, then
-- `provider_price_memory` would have a row for every pair, and "no fallback across
-- providers" — the rule 1.4 exists to enforce — would never be exercised by the
-- seed, because no pair would ever be missing.
--
-- So each named provider is assigned whole families, with a deliberate GAP: some
-- variants are bought from exactly one provider, and Comprar must show a blank
-- required field for the others. `Compra directa` (the generic provider) takes a
-- thin slice of produce — the market run — and nothing else.

create table public._d_supply (
  workspace_id uuid not null,
  provider_id  uuid not null,
  variant_id   uuid not null,
  primary key (provider_id, variant_id)
);

-- Merchant A. Three named providers by family, then the market run.
insert into public._d_supply (workspace_id, provider_id, variant_id)
select pv.workspace_id, p.id, pv.id
  from public.product_variant pv
  join public.product_family pf on pf.id = pv.family_id
  join (values
    ('Abarrotes básicos',  'Distribuidora del Centro'),
    ('Limpieza del hogar', 'Distribuidora del Centro'),
    ('Higiene personal',   'Distribuidora del Centro'),
    ('Desechables',        'Distribuidora del Centro'),
    ('Bebidas',            'Refrescos y Botanas del Valle'),
    ('Botanas y dulces',   'Refrescos y Botanas del Valle'),
    ('Carnes y lácteos',   'Lácteos La Vaquita'),
    ('Pan y tortillas',    'Lácteos La Vaquita'),
    ('Frutas y verduras',  'Lácteos La Vaquita')
  ) as m(family, provider) on m.family = pf.name
  join public.provider p on p.workspace_id = pv.workspace_id and p.name = m.provider
 where pv.workspace_id = (select v from public._d_ref where k = 'ws_a');

-- The market run: the generic provider supplies a handful of produce lines, which
-- is what it is for (§2.3). Overlapping with Lácteos La Vaquita on purpose — the
-- same variant bought from two providers is how "each pair remembers its own price"
-- becomes a claim with two numbers behind it.
insert into public._d_supply (workspace_id, provider_id, variant_id)
select pv.workspace_id, p.id, pv.id
  from public.product_variant pv
  join public.product_family pf on pf.id = pv.family_id
  join public.provider p on p.workspace_id = pv.workspace_id and p.is_generic
 where pv.workspace_id = (select v from public._d_ref where k = 'ws_a')
   and pf.name = 'Frutas y verduras'
   and pv.name in ('Jitomate saladet','Cebolla blanca','Limón','Chile serrano',
                   'Aguacate hass','Manojo de cilantro');

-- Merchant B: two of its three providers actually deliver. THE THIRD NEVER DOES,
-- on purpose — a provider with no history at all is a real state Comprar has to
-- render, and one the seed would otherwise never produce.
insert into public._d_supply (workspace_id, provider_id, variant_id)
select pv.workspace_id, p.id, pv.id
  from public.product_variant pv
  join public.product_family pf on pf.id = pv.family_id
  join (values
    ('Abarrotes básicos', 'Abarrotera del Norte'),
    ('Bebidas',           'Bebidas Regias'),
    ('Frutas y verduras', 'Abarrotera del Norte')
  ) as m(family, provider) on m.family = pf.name
  join public.provider p on p.workspace_id = pv.workspace_id and p.name = m.provider
 where pv.workspace_id = (select v from public._d_ref where k = 'ws_b');


-- ----------------------------------------------------------------------------
-- 3. Cost
-- ----------------------------------------------------------------------------
-- Derived from the sell price, not invented independently, so that margin at step 2
-- is a number someone can sanity-check by eye instead of noise.
--
--   sell price is GROSS (workspace.prices_include_tax = true)
--   net sell     = gross / (1 + tax_rate)
--   unit cost    = net sell × (1 − margin)
--
-- Margin varies by family, roughly the way it does in a Mexican tienda: thin on the
-- canasta básica, fatter on drinks and snacks. It also varies slightly PER DELIVERY
-- — a supplier's price moves — which is what gives `provider_price_memory` something
-- to remember other than one constant, and what makes "the last price" a different
-- number from "the first price" when step 7 asks.

create table public._d_cost (
  variant_id   uuid primary key,
  base_cost    numeric(14,6) not null,
  tax_rate     numeric(5,4)  not null,
  track_expiry boolean       not null,
  lifespan     integer
);

insert into public._d_cost (variant_id, base_cost, tax_rate, track_expiry, lifespan)
select pv.id,
       round((pl.price_per_base / (1 + pv.tax_rate)) * (1 - m.margin), 6),
       pv.tax_rate,
       pf.track_expiry,
       pf.default_lifespan_days
  from public.product_variant pv
  join public.product_family pf on pf.id = pv.family_id
  join public.price_list pl on pl.variant_id = pv.id
                           and pl.location_id is null and pl.effective_to is null
  join (values
    ('Abarrotes básicos',  0.14), ('Frutas y verduras',  0.28),
    ('Carnes y lácteos',   0.18), ('Pan y tortillas',    0.30),
    ('Bebidas',            0.22), ('Botanas y dulces',   0.32),
    ('Limpieza del hogar', 0.26), ('Higiene personal',   0.29),
    ('Desechables',        0.30)
  ) as m(family, margin) on m.family = pf.name;


-- ----------------------------------------------------------------------------
-- 4. The delivery calendar
-- ----------------------------------------------------------------------------
-- Thirteen weeks, 2026-05-18 to 2026-08-17 — three months ending today, and
-- starting the day the seeded sell prices took effect, so no delivery predates the
-- price it will be compared against at step 2.
--
-- Each (store, provider) pair delivers weekly on its own weekday. Real enough that
-- "last Tuesday's delivery" means something, and regular enough that a gap in the
-- data is a bug rather than a coincidence.
--
-- HEADERS CANNOT BE PATCHED AFTER THE FACT. `purchase` carries the append-only
-- trigger, so `total_net` and `total_tax` must be right in the INSERT — there is no
-- "insert the header, add the lines, then update the totals". That is why the lines
-- are staged first and the headers are built from their sums. `record_purchase` in
-- 0006 faces exactly the same constraint, and this is the shape it will need.

create table public._d_doc (
  purchase_id  uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  location_id  uuid not null,
  provider_id  uuid not null,
  occurred_at  timestamptz not null,
  created_by   uuid not null,
  -- THE KEY EVERY HASH IN THIS FILE IS TAKEN OVER, and it is deliberately built
  -- from names and a date rather than from `purchase_id`. Ids here are
  -- `gen_random_uuid()` and therefore different on every reset, so hashing them
  -- would make the seed a different shop each time — counts drifting run to run,
  -- assertion thresholds flickering, and "it failed in CI but not locally"
  -- unanswerable. Caught exactly that way: two consecutive resets produced 1 071
  -- and 1 064 batches.
  doc_key      text not null
);

insert into public._d_doc (workspace_id, location_id, provider_id, occurred_at, created_by, doc_key)
select d.workspace_id, d.location_id, d.provider_id,
       (date '2026-05-18' + (w.week * 7 + d.weekday) * interval '1 day'
                          + d.hour * interval '1 hour'),
       d.created_by,
       d.provider_name || '|' || d.location_name || '|w' || w.week
  from (
    -- Merchant A, both stores. The manager receives at Centro, the owner at the
    -- Mercado stall — which is also why neither cashier appears in this file.
    select (select v from public._d_ref where k = 'ws_a') as workspace_id,
           l.loc as location_id, p.id as provider_id,
           p.weekday, p.hour, l.created_by, p.pname as provider_name, l.lname as location_name
      from (values
        ((select v from public._d_ref where k = 'loc_a_centro'),  (select v from public._d_ref where k = 'user_manager_a'), 'centro'),
        ((select v from public._d_ref where k = 'loc_a_mercado'), (select v from public._d_ref where k = 'user_owner_a'),   'mercado')
      ) as l(loc, created_by, lname)
     cross join (
        select pr.id, m.weekday, m.hour, pr.name
          from public.provider pr
          join (values ('Distribuidora del Centro', 1, 8),
                       ('Refrescos y Botanas del Valle', 3, 9),
                       ('Lácteos La Vaquita', 5, 7)) as m(name, weekday, hour)
            on m.name = pr.name
         where pr.workspace_id = (select v from public._d_ref where k = 'ws_a')
     ) as p(id, weekday, hour, pname)

    union all

    -- Merchant B, one store, two of its three providers.
    select (select v from public._d_ref where k = 'ws_b'),
           (select v from public._d_ref where k = 'loc_b'), pr.id,
           m.weekday, m.hour,
           (select v from public._d_ref where k = 'user_owner_b'),
           pr.name, 'roble'
      from public.provider pr
      join (values ('Abarrotera del Norte', 2, 8),
                   ('Bebidas Regias', 4, 10)) as m(name, weekday, hour)
        on m.name = pr.name
     where pr.workspace_id = (select v from public._d_ref where k = 'ws_b')
  ) as d
 cross join generate_series(0, 12) as w(week);

-- The market run: `Compra directa`, every second week, Centro only. A handful of
-- lines each time — that is what the generic provider is for, and seeding it as a
-- rare small delivery rather than a bulk channel is the honest shape (§2.3).
insert into public._d_doc (workspace_id, location_id, provider_id, occurred_at, created_by, doc_key)
select (select v from public._d_ref where k = 'ws_a'),
       (select v from public._d_ref where k = 'loc_a_centro'),
       pr.id,
       date '2026-05-18' + (w.week * 14 + 6) * interval '1 day' + interval '6 hours',
       (select v from public._d_ref where k = 'user_owner_a'),
       'mercadito|centro|q' || w.week
  from public.provider pr
 cross join generate_series(0, 5) as w(week)
 where pr.workspace_id = (select v from public._d_ref where k = 'ws_a')
   and pr.is_generic;


-- ----------------------------------------------------------------------------
-- 5. The lines
-- ----------------------------------------------------------------------------
-- Which products a given delivery carries is chosen by a HASH, not by `random()`,
-- and the hash is taken over `_d_doc.doc_key` and the PRODUCT NAME — never over a
-- uuid. Uuids here are `gen_random_uuid()` and differ on every reset, so hashing
-- them produces a different shop each time: counts drift, assertion thresholds
-- flicker, and "it failed in CI but not locally" has no answer. That was not
-- theoretical — the first draft hashed ids and two consecutive resets gave 1 071 and
-- 1 064 batches. Everything stochastic-looking in this file is now a pure function
-- of names and dates, and two resets produce the same shop.
--
-- QUANTITY IS EXPRESSED TWICE, and that is not redundancy (§2.5):
--   * `qty_base`    — normalised, in the variant's base unit. What the ledger uses.
--   * `qty_display` — what the operator actually typed, in `qty_display_unit`.
-- 30 kg of jitomate is qty_base 30000 (grams) and qty_display 30 (kg). Dividing by
-- `unit.factor_to_base` is the whole conversion, and it is done ONCE, here.
--
-- Packs are bought whole: a case of 12 arrives as 12, 24 or 36 pieces, never 17.

create table public._d_line (
  purchase_id             uuid not null,
  workspace_id            uuid not null,
  location_id             uuid not null,
  variant_id              uuid not null,
  qty_base                numeric(14,3) not null,
  qty_display             numeric(14,3) not null,
  qty_display_unit        text not null,
  unit_price_net_per_base numeric(14,6) not null,
  line_net                numeric(12,2) not null,
  tax_amount              numeric(12,2) not null,
  tax_rate                numeric(5,4)  not null,
  expiry_date             date,
  occurred_at             timestamptz not null
);

insert into public._d_line
select x.purchase_id, x.workspace_id, x.location_id, x.variant_id,
       x.qty_base,
       round(x.qty_base / u.factor_to_base, 3),
       pv.purchase_unit_code,
       x.unit_price,
       round(x.qty_base * x.unit_price, 2),
       round(round(x.qty_base * x.unit_price, 2) * c.tax_rate, 2),
       c.tax_rate,
       case when c.track_expiry
            then (x.occurred_at at time zone 'UTC')::date + c.lifespan
            else null end,
       x.occurred_at
  from (
    select d.purchase_id, d.workspace_id, d.location_id, sup.variant_id, d.occurred_at,
           -- Quantity by shape. Weighed goods arrive by the sack, packaged goods by
           -- the case or the dozen.
           case
             when pv2.base_unit_code in ('g','ml')
               then (3 + (abs(hashtext(d.doc_key || pv2.name)) % 28)) * 1000
             when pv2.pack_size > 1
               then pv2.pack_size * (1 + (abs(hashtext(d.doc_key || pv2.name)) % 4))
             else 6 + (abs(hashtext(d.doc_key || pv2.name)) % 42)
           end::numeric(14,3) as qty_base,
           -- A supplier's price drifts ±5% between deliveries. Without this the
           -- price memory has one number to remember for all thirteen weeks, and
           -- "what did we last pay" becomes indistinguishable from "what do we
           -- always pay" — which is the question step 7 is meant to separate.
           round(cst.base_cost *
                 (1 + ((abs(hashtext(d.doc_key || 'p' || pv2.name)) % 11) - 5) / 100.0),
                 6) as unit_price
      from public._d_doc d
      join public._d_supply sup on sup.provider_id = d.provider_id
                               and sup.workspace_id = d.workspace_id
      join public.product_variant pv2 on pv2.id = sup.variant_id
      join public._d_cost cst on cst.variant_id = sup.variant_id
     where
       -- Which of this provider's range came on this particular truck.
       --
       -- THE THRESHOLD DIFFERS BY MERCHANT, and the reason is a number the owner
       -- fixed: merchant B must carry roughly 20% of the ledger, or `workspace_id`
       -- stops being a selective predicate on `purchase_line` and the plan evidence
       -- 1.4 could not produce stays unproducible. B's catalog is 25 products
       -- against A's 316, so matching A's density would leave B at ~3% — measured,
       -- not guessed: the assertion at the end of this file caught exactly that on
       -- the first run.
       --
       -- Raising B's density is also the more honest shape. A corner shop with
       -- twenty-five lines restocks most of them every week; a larger store's
       -- supplier brings a slice of a long range. The generic provider brings
       -- nearly everything it carries, because a market run is short and specific.
       (abs(hashtext(d.doc_key || 'x' || pv2.name)) % 100)
         < case
             when (select is_generic from public.provider where id = d.provider_id) then 80
             when d.workspace_id = (select v from public._d_ref where k = 'ws_b')   then 55
             else 10
           end
  ) as x
  join public.product_variant pv on pv.id = x.variant_id
  join public.unit u on u.code = pv.purchase_unit_code
  join public._d_cost c on c.variant_id = x.variant_id;

-- A delivery with no lines never becomes a document at all: the header INSERT below
-- inner-joins `_d_doc` to the line totals, so a truck the hash happened to empty is
-- simply not written. Nothing needs deleting here, and an explicit DELETE would be
-- dead code dressed as a safeguard.


-- ----------------------------------------------------------------------------
-- 6. The documents
-- ----------------------------------------------------------------------------
-- Totals are the SUM OF THE ROUNDED LINES, never the document rounded
-- independently (§2.5). That is what makes `total_net + total_tax` equal the sum of
-- what the lines say, exactly, forever — and it is why the lines had to exist
-- before the header could be written.

insert into public.purchase
  (id, workspace_id, location_id, provider_id, occurred_at, recorded_at,
   total_net, total_tax, created_by, recorded_offline, payload_hash)
select d.purchase_id, d.workspace_id, d.location_id, d.provider_id,
       d.occurred_at, d.occurred_at,
       t.total_net, t.total_tax, d.created_by, false,
       md5(d.doc_key || t.total_net::text || t.total_tax::text)
  from public._d_doc d
  join (select purchase_id, sum(line_net) as total_net, sum(tax_amount) as total_tax
          from public._d_line group by purchase_id) t on t.purchase_id = d.purchase_id;

insert into public.purchase_line
  (workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
   qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate, expiry_date)
select workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate, expiry_date
  from public._d_line;


-- ----------------------------------------------------------------------------
-- 7. The lots
-- ----------------------------------------------------------------------------
-- ONE BATCH PER PURCHASE LINE — a unique partial index in 0004 enforces it. The
-- batch carries the cost, the expiry and the provider, and it is what FEFO will
-- sort on in 1.6b. `received_at` is the delivery time, not `now()`: a lot received
-- in May must sort as May, or the whole three-month history rotates wrongly.

insert into public.stock_batch
  (workspace_id, location_id, variant_id, origin, provider_id,
   source_purchase_line_id, qty_received_base, unit_cost_net_per_base,
   received_at, expiry_date, created_by)
select pl.workspace_id, pl.location_id, pl.variant_id, 'purchase', p.provider_id,
       pl.id, pl.qty_base, pl.unit_price_net_per_base,
       p.occurred_at, pl.expiry_date, p.created_by
  from public.purchase_line pl
  join public.purchase p on p.id = pl.purchase_id;


-- ----------------------------------------------------------------------------
-- 8. The receipts
-- ----------------------------------------------------------------------------
-- THE MOVEMENT IS THE RECEIPT. `batch_balance` was opened at zero by a trigger when
-- each batch was inserted above; this is what puts the stock on the shelf. Writing
-- the batch without this leaves a shop that believes it has nothing, and seeding
-- the balance directly instead would count every delivery twice.

insert into public.stock_movement
  (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
   unit_cost_net_per_base, purchase_id, occurred_at, recorded_at, created_by)
select sb.workspace_id, sb.location_id, sb.id, sb.variant_id, 'purchase',
       sb.qty_received_base, sb.unit_cost_net_per_base, pl.purchase_id,
       sb.received_at, sb.received_at, sb.created_by
  from public.stock_batch sb
  join public.purchase_line pl on pl.id = sb.source_purchase_line_id;


-- ----------------------------------------------------------------------------
-- 9. Assertions
-- ----------------------------------------------------------------------------
-- `supabase db reset` exits non-zero when any of these raises — verified in 1.5 by
-- falsifying three of the skeleton's own checks, so this is a real CI gate and not
-- a hopeful one.

do $$
declare
  v_ws_a uuid := (select v from public._d_ref where k = 'ws_a');
  v_ws_b uuid := (select v from public._d_ref where k = 'ws_b');
  v_n integer; v_m integer; v_pct numeric;
begin
  -- --- provenance: the check that is actually meaningful at this stage ---------
  if exists (select 1 from public.stock_batch where origin <> 'purchase') then
    raise exception '10_deliveries: every batch here is a purchase lot — found another origin';
  end if;

  select count(*) into v_n from public.stock_batch sb
   where sb.source_purchase_line_id is null;
  if v_n > 0 then
    raise exception '10_deliveries: % batch(es) with no purchase line — provenance broken', v_n;
  end if;

  select count(*) into v_n from public.purchase_line pl
   where not exists (select 1 from public.stock_batch sb where sb.source_purchase_line_id = pl.id);
  if v_n > 0 then
    raise exception '10_deliveries: % purchase line(s) never became a batch', v_n;
  end if;

  -- Cross-tenant and cross-store provenance. The composite FKs already forbid it;
  -- this asserts the seed never even tried, because a seed that leans on a
  -- constraint to stay honest is one bad ON CONFLICT away from not being.
  if exists (
    select 1 from public.stock_batch sb
      join public.purchase_line pl on pl.id = sb.source_purchase_line_id
      join public.purchase p on p.id = pl.purchase_id
     where p.workspace_id <> sb.workspace_id or p.location_id <> sb.location_id
        or p.provider_id is distinct from sb.provider_id) then
    raise exception '10_deliveries: a batch disagrees with its own delivery about tenant, store or provider';
  end if;

  -- --- the ledger arithmetic ---------------------------------------------------
  -- Every lot is on the shelf exactly once: one receipt movement per batch, for
  -- the whole received quantity.
  select count(*) into v_n from public.stock_batch;
  select count(*) into v_m from public.stock_movement where reason = 'purchase';
  if v_n <> v_m then
    raise exception '10_deliveries: % batches but % receipt movements', v_n, v_m;
  end if;
  if exists (
    select 1 from public.stock_batch sb
      join public.batch_balance bb on bb.batch_id = sb.id
     where bb.remaining_base <> sb.qty_received_base) then
    raise exception '10_deliveries: a batch balance disagrees with what was received';
  end if;

  -- Document totals are the sum of the rounded lines (§2.5).
  if exists (
    select 1 from public.purchase p
      join (select purchase_id, sum(line_net) n, sum(tax_amount) t
              from public.purchase_line group by purchase_id) l on l.purchase_id = p.id
     where p.total_net <> l.n or p.total_tax <> l.t) then
    raise exception '10_deliveries: a document total is not the sum of its rounded lines';
  end if;

  -- THE §2.4 INVARIANT. Asserted, and worth almost nothing yet: nothing has been
  -- withdrawn, so every balance is its own receipt and this would pass even if the
  -- allocation logic were absent — which it is, here. It becomes load-bearing in
  -- 1.6b. Stated so nobody reads a green line as more than it is.
  select count(*) into v_n from public.batch_balance_violations();
  if v_n > 0 then
    raise exception '10_deliveries: % batch balance violation(s)', v_n;
  end if;

  -- --- shape: what 1.6b and step 2 are about to depend on ----------------------
  if (select count(*) from public.purchase where workspace_id = v_ws_a) < 60
  or (select count(*) from public.purchase where workspace_id = v_ws_b) < 20 then
    raise exception '10_deliveries: too few deliveries — A % / B %',
      (select count(*) from public.purchase where workspace_id = v_ws_a),
      (select count(*) from public.purchase where workspace_id = v_ws_b);
  end if;

  -- Merchant B carries a real minority share, ~20% (owner, 2026-08-18). Below
  -- about a tenth, `workspace_id` stops being a selective predicate on
  -- purchase_line and the plan evidence 1.4 could not produce stays unproducible.
  select round(100.0 * count(*) filter (where workspace_id = v_ws_b) / count(*), 1)
    into v_pct from public.purchase_line;
  if v_pct < 10 or v_pct > 35 then
    raise exception '10_deliveries: merchant B holds % percent of purchase lines, wanted roughly 20', v_pct;
  end if;

  -- Three months, not three weeks.
  if (select max(occurred_at)::date - min(occurred_at)::date from public.purchase) < 80 then
    raise exception '10_deliveries: the delivery history spans only % days',
      (select max(occurred_at)::date - min(occurred_at)::date from public.purchase);
  end if;

  -- Expiry actually varies, or FEFO has nothing to sort in 1.6b. Both a tracked
  -- family and an untracked one must be present.
  if not exists (select 1 from public.stock_batch where expiry_date is not null)
  or not exists (select 1 from public.stock_batch where expiry_date is null) then
    raise exception '10_deliveries: batches must carry both real and null expiry dates';
  end if;
  select count(distinct expiry_date) into v_n from public.stock_batch where expiry_date is not null;
  if v_n < 20 then
    raise exception '10_deliveries: only % distinct expiry dates — FEFO would have little to decide', v_n;
  end if;

  -- More than one lot of the same product at the same store, or FEFO never picks.
  select count(*) into v_n from (
    select 1 from public.stock_batch group by workspace_id, location_id, variant_id having count(*) > 1
  ) q;
  if v_n < 50 then
    raise exception '10_deliveries: only % (store, product) pairs have multiple lots — FEFO would be a no-op', v_n;
  end if;

  -- --- the thing 1.4 built ------------------------------------------------------
  -- Every pair actually delivered is answerable, and no pair that was never
  -- delivered is. The second half is the one that matters: it is "no fallback
  -- across providers" (§2.3) observed over real volumes instead of a fixture.
  select count(*) into v_n
    from (select distinct p.provider_id, pl.variant_id, p.workspace_id
            from public.purchase p join public.purchase_line pl on pl.purchase_id = p.id) d
   where not exists (
     select 1 from public.provider_price_memory m
      where m.workspace_id = d.workspace_id and m.provider_id = d.provider_id
        and m.variant_id = d.variant_id);
  if v_n > 0 then
    raise exception '10_deliveries: % delivered (provider, variant) pair(s) have no remembered price', v_n;
  end if;

  select count(*) into v_n from public.provider_price_memory;
  select count(*) into v_m
    from (select distinct p.provider_id, pl.variant_id
            from public.purchase p join public.purchase_line pl on pl.purchase_id = p.id) d;
  if v_n <> v_m then
    raise exception '10_deliveries: price memory has % rows for % delivered pairs', v_n, v_m;
  end if;

  -- A provider that never delivered remembers nothing, and a variant stocked from
  -- one provider prefills nothing for another. Both are states Comprar has to
  -- render (§2.8) and neither would exist if every provider carried everything.
  if not exists (
    select 1 from public.provider pr
     where not exists (select 1 from public.provider_price_memory m where m.provider_id = pr.id)) then
    raise exception '10_deliveries: every provider has history — the empty state is unrepresented';
  end if;
  if not exists (
    select 1 from public.provider_price_memory m1
      join public.provider_price_memory m2
        on m2.workspace_id = m1.workspace_id and m2.variant_id = m1.variant_id
       and m2.provider_id <> m1.provider_id
     where m1.unit_price_net_per_base <> m2.unit_price_net_per_base) then
    raise exception '10_deliveries: no variant is bought from two providers at different prices';
  end if;

  -- --- the boundary -------------------------------------------------------------
  -- 1.6b's job, not this file's. If this fails, stock is being consumed by the
  -- delivery seed and FEFO is being bypassed.
  if exists (select 1 from public.sale) or exists (select 1 from public.waste)
  or exists (select 1 from public.stock_movement where reason <> 'purchase')
  or exists (select 1 from public.purchase where reversal_of is not null) then
    raise exception '10_deliveries: this file only delivers — sales, waste, transfers and voids are 1.6b/1.6c';
  end if;

  raise notice '10_deliveries: % purchases, % lines, % batches, % movements; B holds % percent of lines; % remembered prices',
    (select count(*) from public.purchase),
    (select count(*) from public.purchase_line),
    (select count(*) from public.stock_batch),
    (select count(*) from public.stock_movement),
    v_pct,
    (select count(*) from public.provider_price_memory);
end;
$$;


-- ----------------------------------------------------------------------------
-- 10. Scaffolding out
-- ----------------------------------------------------------------------------
-- 1.6b looks its ids up by name, the way this file did. Nothing named `_d_*`
-- outlives the file that made it.

drop table public._d_line;
drop table public._d_doc;
drop table public._d_cost;
drop table public._d_supply;
drop table public._d_ref;
