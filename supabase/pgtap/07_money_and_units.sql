-- ============================================================================
-- 07 — MONEY AND UNITS (behavioural + structural)
--
-- ADR-035 §2.10, fifth row: "1 kg in, 100 g x 10 out -> exactly 0. Case of 24 at
-- $12 -> $0.50/can. 16% inclusive -> net to the centavo." Plan task 3.5. §2.5 is
-- the rule those three sentences are shorthand for:
--
--   1. Integer centavos at every layer. No floating point anywhere in the money
--      path.
--   2. With prices_include_tax = true the GROSS unit price is authoritative.
--   3. Per line:  line_gross = round(unit_gross * qty)
--                 line_net   = round(line_gross / (1 + rate))
--                 line_tax   = line_gross - line_net
--   4. Tax is always the RESIDUAL, never rounded on its own.
--   5. Document total = sum of the ROUNDED LINES.
--   6. Half-up, AWAY FROM ZERO.
--
-- ⚠️ WHAT THIS SUITE CAN TEST TODAY, AND WHAT IT CANNOT
-- ----------------------------------------------------
-- THERE IS NO SQL IMPLEMENTATION OF RULES 2-4 IN THIS REPO YET. The tax split
-- happens in `record_sale` and `record_purchase`, which are `0006` — step 4,
-- not started. Step 3 ships no migration, so this file cannot write one either.
--
-- That splits the suite in two, and the header says so rather than letting a
-- reader assume otherwise:
--
--   REAL, over the applied schema and applied data
--     * the unit table's factors and the exactness they buy          (U-block)
--     * 1 kg in, 100 g x 10 out -> exactly 0, through the REAL
--       allocator and the REAL projection trigger                    (U-block)
--     * the pack division, on a REAL purchase line                   (P-block)
--     * rule 1 — no float column anywhere in `public`                (F5)
--     * rule 5 — over all 1 086 seeded documents                     (F7)
--     * rule 3/4 — the residual identity over all 3 448 seeded lines (F8)
--     * rule 6 — what `round()` actually does in THIS Postgres       (F3, F4)
--
--   SPECIFICATION, until 0006 lands
--     * the M-block. Nine hand-computed cases, asserted against the rule
--       SPELLED IN SQL HERE. It pins the arithmetic 0006 must reproduce; it
--       does not prove 0006 reproduces it, because 0006 does not exist.
--
-- ⚠️ THE M-BLOCK IS A DELIBERATE, TEMPORARY FORK OF `cases.json`, AND 3.6 IS
-- WHERE IT STOPS BEING ONE. supabase/README.md says "do not fork it into a SQL
-- fixture", and §2.10 asks for ONE data file read by both sides. That is task
-- 3.6's done-when. 3.5 comes first on purpose (docs/PLAN.md, step 3 ordering):
-- writing cases.json first and the SQL second would let the data file be shaped
-- to whatever the SQL already does, which is the drift the file exists to
-- prevent. So the expectations below are worked out by hand FIRST, and 3.6
-- lifts them into packages/money/cases.json and re-points this block at it.
-- Every case carries an `id` for exactly that reason — the ids are the join.
--
-- ⚠️ NOTHING HERE RUNS UNDER `set role authenticated`, and as in 06 that is
-- correct rather than a gap. This suite makes no access claim. It is arithmetic
-- and structure; the isolation claims belong to 02-05.
--
-- ⚠️ IT WRITES A FIXTURE AND ROLLS IT BACK — the fifth suite to do so (02's
-- invite, 04's auth.users row, 05's closed store, 06's four hundred documents).
-- One family, three variants, one delivery and ten tickets, inside the
-- transaction this file opens and ends by rolling back.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
set search_path = tap, public, pg_catalog;
set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------------
-- The scope, resolved from the CATALOG and never by display name
--
-- 05's rule, for 05's reason: renaming a store must not be able to re-point a
-- suite. The workspace under test is "the one with exactly one active location
-- whose prices include tax" — one store because this file needs no transfer,
-- and prices_include_tax because §2.5 rule 2 is the premise of the whole
-- M-block. F1 refuses to proceed if that description stops picking exactly one.
-- ---------------------------------------------------------------------------
create temp table mu_scope as
select w.id                as ws_id,
       l.id                as loc_id,
       w.prices_include_tax,
       (select wm.user_id from public.workspace_member wm
         where wm.workspace_id = w.id and wm.role = 'owner'
         order by wm.user_id limit 1)                as author,
       (select p.id from public.provider p
         where p.workspace_id = w.id
         order by p.is_generic desc, p.id limit 1)   as provider_id
  from public.workspace w
  join public.location  l on l.workspace_id = w.id and l.is_active
 where w.prices_include_tax
   and (select count(*) from public.location l2
         where l2.workspace_id = w.id and l2.is_active) = 1;


-- ---------------------------------------------------------------------------
-- The fixture
--
-- Three variants, because the ADR's three sentences need three shapes:
--
--   mu_mass  base 'g', bought by the kg, sold and priced per 100g. This is the
--            variant the first §2.10 sentence is about, and gram-base is the
--            §2.5 rule 1 decision made concrete.
--   mu_p24   base 'pza', pack_size 24. The case of 24.
--   mu_p3    base 'pza', pack_size 3. The pack that does NOT divide, which is
--            what makes the case of 24 a claim rather than a coincidence.
--
-- All three carry tax_rate 0.16 — general goods, not the zero-rated food that
-- is most of the seed. The M-block covers 0.0000 separately.
-- ---------------------------------------------------------------------------
create temp table mu_ref (k text primary key, v uuid);

with ins as (
  insert into public.product_family (workspace_id, name, track_expiry)
  select ws_id, '3.5 Unidades y dinero', false from mu_scope
  returning id
)
insert into mu_ref (k, v) select 'family', id from ins;

with ins as (
  insert into public.product_variant
    (workspace_id, family_id, name, base_unit_code, purchase_unit_code,
     sell_unit_code, price_unit_code, pack_size, tax_rate)
  select s.ws_id, r.v, '3.5 Granel', 'g', 'kg', '100g', '100g', 1, 0.16
    from mu_scope s, mu_ref r where r.k = 'family'
  returning id
)
insert into mu_ref (k, v) select 'mu_mass', id from ins;

with ins as (
  insert into public.product_variant
    (workspace_id, family_id, name, base_unit_code, purchase_unit_code,
     sell_unit_code, price_unit_code, pack_size, tax_rate)
  select s.ws_id, r.v, '3.5 Lata en caja de 24', 'pza', 'pza', 'pza', 'pza', 24, 0.16
    from mu_scope s, mu_ref r where r.k = 'family'
  returning id
)
insert into mu_ref (k, v) select 'mu_p24', id from ins;

with ins as (
  insert into public.product_variant
    (workspace_id, family_id, name, base_unit_code, purchase_unit_code,
     sell_unit_code, price_unit_code, pack_size, tax_rate)
  select s.ws_id, r.v, '3.5 Trio que no divide', 'pza', 'pza', 'pza', 'pza', 3, 0.16
    from mu_scope s, mu_ref r where r.k = 'family'
  returning id
)
insert into mu_ref (k, v) select 'mu_p3', id from ins;


-- ---------------------------------------------------------------------------
-- THE DELIVERY — one kilogram, one case of 24, one pack of 3
--
-- Written the way the seed writes one and the way `record_purchase` will: lines
-- first, then the header as the SUM OF THE ROUNDED LINES (§2.5 rule 5), then
-- the lots.
--
-- ⚠️ THE PURCHASE SIDE IS NET-FIRST AND THAT IS NOT AN OVERSIGHT — see the
-- finding recorded in docs/PLAN.md. §2.5's gross-authoritative rule is stated
-- under `prices_include_tax`, which is a property of the WORKSPACE, but the
-- sentence above it says supplier invoices BREAK TAX OUT. The seed reads it the
-- second way on purchases and the first way on sales, and F8 shows both
-- spellings land on lines that satisfy the residual identity. Which one `0006`
-- must use is the owner's call and is flagged in the plan.
-- ---------------------------------------------------------------------------
insert into mu_ref (k, v) values ('purchase', gen_random_uuid());

create temp table mu_pline (
  line_id                 uuid,
  variant_key             text,
  qty_base                numeric(14,3),
  qty_display             numeric(14,3),
  qty_display_unit        text,
  unit_price_net_per_base numeric(14,6),
  line_net                numeric(12,2),
  tax_amount              numeric(12,2),
  tax_rate                numeric(5,4)
);

-- 1 kg at $46.40 the kilo, tax broken out: net 40.00, tax 6.40.
-- 1 000 g of base, so unit_price_net_per_base = 0.040000.
insert into mu_pline values
  (gen_random_uuid(), 'mu_mass', 1000.000, 1.000,  'kg',  0.040000, 40.00, 6.40, 0.1600),
  -- one case of 24, $12.00 net for the case -> $0.50 the can, exactly
  (gen_random_uuid(), 'mu_p24',    24.000, 24.000, 'pza', 0.500000, 12.00, 1.92, 0.1600),
  -- one pack of 3, $10.00 net for the pack -> $3.333333 the unit, which does not
  -- multiply back. The line is authoritative; the per-unit figure is display.
  (gen_random_uuid(), 'mu_p3',      3.000, 3.000,  'pza', 3.333333, 10.00, 1.60, 0.1600);

insert into public.purchase
  (id, workspace_id, location_id, provider_id, occurred_at, recorded_at,
   total_net, total_tax, created_by, recorded_offline, payload_hash)
select r.v, s.ws_id, s.loc_id, s.provider_id,
       now() - interval '1 hour', now() - interval '1 hour',
       (select sum(line_net)   from mu_pline),
       (select sum(tax_amount) from mu_pline),
       s.author, false, md5('3.5-purchase')
  from mu_scope s, mu_ref r where r.k = 'purchase';

insert into public.purchase_line
  (id, workspace_id, location_id, purchase_id, variant_id, qty_base, qty_display,
   qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
select p.line_id, s.ws_id, s.loc_id, pr.v, vr.v, p.qty_base, p.qty_display,
       p.qty_display_unit, p.unit_price_net_per_base, p.line_net, p.tax_amount,
       p.tax_rate
  from mu_pline p
  join mu_ref vr on vr.k = p.variant_key
  join mu_ref pr on pr.k = 'purchase'
  cross join mu_scope s;

-- The lots, and their receipt movements. Written explicitly because
-- `record_purchase` is 0006 and does not exist; the SHAPE is the one 0004
-- fixed and the one the seed uses.
insert into public.stock_batch
  (id, workspace_id, location_id, variant_id, origin, provider_id,
   source_purchase_line_id, qty_received_base, unit_cost_net_per_base,
   received_at, created_by)
select p.line_id, s.ws_id, s.loc_id, vr.v, 'purchase', s.provider_id,
       p.line_id, p.qty_base, p.unit_price_net_per_base,
       now() - interval '1 hour', s.author
  from mu_pline p
  join mu_ref vr on vr.k = p.variant_key
  cross join mu_scope s;

insert into public.stock_movement
  (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
   unit_cost_net_per_base, purchase_id, occurred_at, created_by)
select s.ws_id, s.loc_id, p.line_id, vr.v, 'purchase', p.qty_base,
       p.unit_price_net_per_base, pr.v, now() - interval '1 hour', s.author
  from mu_pline p
  join mu_ref vr on vr.k = p.variant_key
  join mu_ref pr on pr.k = 'purchase'
  cross join mu_scope s;


-- ---------------------------------------------------------------------------
-- TEN CUSTOMERS, 100 g EACH — the §2.10 sentence, run as a ledger
--
-- Ten separate tickets, not one ticket of ten lines, because "100 g x 10 out"
-- is ten withdrawals and a single line of 1 000 g would never exercise the
-- repeated conversion the sentence is about.
--
-- ⚠️ EVERY WITHDRAWAL GOES THROUGH `allocate_fefo()`. 06 settled that rule and
-- it holds here for the same reason: a suite that wrote its own movements would
-- be closing books it had itself balanced. The projection is maintained by
-- `stock_movement_project_balance_trg`, which is also not this file's code.
--
-- ⚠️ AND THE TICKETS CARRY MONEY, so the units case and the money case are the
-- same ten documents. The shelf price is $2.00 the 100 g, gross, IVA included —
-- §2.5's own worked example. Ten tickets of $2.00 is $20.00 gross, and the sum
-- of the ten rounded nets is $17.20 while $20.00/1.16 rounds to $17.24. The
-- §2.10 units case produces §2.5 rule 5's disagreement on its own; D2 asserts
-- it, and D1 is the smaller one §2.5 names explicitly.
-- ---------------------------------------------------------------------------
create temp table mu_draw (
  n              int primary key,
  sale_id        uuid,
  took           numeric(14,3),   -- what allocate_fefo() said to take
  lots           int,             -- how many lots it spread the take over
  remaining      numeric(14,3),   -- the projection, read after the movement
  expected       numeric(14,3),   -- 1000 - 100n, computed in centavo-free grams
  line_gross     numeric(12,2),
  line_net       numeric(12,2),
  line_tax       numeric(12,2)
);

do $$
declare
  s          record;
  v_variant  uuid;
  v_sale     uuid;
  v_alloc    record;
  v_took     numeric(14,3);
  v_lots     int;
  v_gross    numeric(12,2) := 2.00;    -- the shelf price of 100 g, IVA included
  v_rate     numeric(5,4)  := 0.1600;
  v_net      numeric(12,2);
  v_tax      numeric(12,2);
  i          int;
begin
  select * into s from mu_scope;
  select v into v_variant from mu_ref where k = 'mu_mass';

  -- §2.5 rule 3 and 4, on a single line of exactly 100 g at $2.00 gross.
  v_net := round(v_gross / (1 + v_rate), 2);
  v_tax := v_gross - v_net;

  for i in 1..10 loop
    v_sale := gen_random_uuid();

    insert into public.sale
      (id, workspace_id, location_id, occurred_at, recorded_at,
       total_net, total_tax, created_by, recorded_offline, payload_hash)
    values
      (v_sale, s.ws_id, s.loc_id, now() - make_interval(mins => 10 - i),
       now() - make_interval(mins => 10 - i), v_net, v_tax, s.author, false,
       md5('3.5-sale-' || i));

    insert into public.sale_line
      (workspace_id, location_id, sale_id, variant_id, qty_base, qty_display,
       qty_display_unit, unit_price_net_per_base, line_net, tax_amount, tax_rate)
    values
      (s.ws_id, s.loc_id, v_sale, v_variant, 100.000, 1.000, '100g',
       round(v_net / 100.000, 6), v_net, v_tax, v_rate);

    v_took := 0;
    v_lots := 0;

    for v_alloc in
      select * from public.allocate_fefo(
        s.ws_id, s.loc_id, v_variant, 100.000, s.author,
        now() - make_interval(mins => 10 - i))
    loop
      insert into public.stock_movement
        (workspace_id, location_id, batch_id, variant_id, reason, qty_base,
         unit_cost_net_per_base, sale_id, occurred_at, created_by)
      values
        (s.ws_id, s.loc_id, v_alloc.batch_id, v_variant, 'sale',
         -v_alloc.qty_base, v_alloc.unit_cost_net_per_base, v_sale,
         now() - make_interval(mins => 10 - i), s.author);

      v_took := v_took + v_alloc.qty_base;
      v_lots := v_lots + 1;
    end loop;

    insert into mu_draw
    select i, v_sale, v_took, v_lots,
           (select coalesce(sum(bb.remaining_base), 0)
              from public.batch_balance bb
             where bb.workspace_id = s.ws_id
               and bb.location_id  = s.loc_id
               and bb.variant_id   = v_variant),
           1000.000 - (i * 100.000),
           v_gross, v_net, v_tax;
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- THE UNIT TABLE, one row per denomination
--
-- The claim per row is that the denomination converts to base EXACTLY: a whole
-- number of base units, so no conversion in the ledger can introduce a
-- fraction the column would then have to round away. That is the property
-- §2.5 rule 1 is buying, and it is a property of the DATA in `unit`, so a
-- future denomination is measured the day it lands.
-- ---------------------------------------------------------------------------
create temp table mu_unit as
select u.code,
       u.dimension,
       u.base_code,
       u.factor_to_base,
       -- integral, positive, and the base of its own dimension is itself at 1
       (u.factor_to_base = trunc(u.factor_to_base))                as integral,
       (u.factor_to_base > 0)                                      as positive,
       ((u.code = u.base_code) = (u.factor_to_base = 1))           as identity_iff_base,
       (b.dimension = u.dimension and b.code = b.base_code)        as base_is_base,
       -- one display unit of this denomination, expressed in base and put back
       (round(round(1 * u.factor_to_base, 3) / u.factor_to_base, 3) = 1)
                                                                   as round_trips
  from public.unit u
  join public.unit b on b.code = u.base_code;


-- ---------------------------------------------------------------------------
-- THE MONEY CASES — §2.5's rounding rule, and the boundaries §2.5 names
--
-- ⚠️ EVERY `exp_` VALUE BELOW WAS WORKED OUT BY HAND BEFORE THE SQL WAS RUN,
-- and that is the whole point of 3.5 preceding 3.6. If they were computed by
-- the same expression the assertions apply, this table would assert that SQL
-- agrees with itself.
--
-- The rule, as applied below:
--     gross = round(unit_gross * qty, 2)
--     net   = round(gross / (1 + rate), 2)
--     tax   = gross - net                      -- residual, never rounded alone
--
-- `unit_gross` is per BASE unit, because that is what the ledger stores.
-- $2.00 the 100 g is 0.02 the gram; $46.40 the kilo is 0.0464 the gram.
--
-- ⚠️ M4, M5, M6 AND M8 ARE THE HALF-CENTAVO BOUNDARIES, AND THEY ALL SIT IN
-- THE MULTIPLICATION, NOT IN THE TAX DIVISION. §2.5 asks cases.json to carry
-- "a half-centavo boundary per tax rate", which reads as though the division
-- has one. It does not, and cannot — see the F9 finding. The tie-break is only
-- ever reachable at `round(unit_gross * qty, 2)`, so that is where these four
-- put it. 3.6 must carry them across unchanged.
--
-- ⚠️ M8 IS THE REVERSAL, AND IT IS THE ONE THAT PINS "AWAY FROM ZERO". Half-up
-- toward positive infinity — which is what JavaScript's Math.round does, and
-- packages/money is JavaScript — sends -0.365 to -0.36. §2.5 rule 6 sends it to
-- -0.37. A void of M4 must be M4's mirror to the centavo or `void_transaction`
-- leaves a peso behind, so this case is 3.6's tripwire as much as this file's.
-- ---------------------------------------------------------------------------
create temp table mu_case (
  id         text primary key,
  label      text not null,
  unit_gross numeric(14,6) not null,
  qty        numeric(14,3) not null,
  rate       numeric(5,4)  not null,
  exp_gross  numeric(12,2) not null,
  exp_net    numeric(12,2) not null,
  exp_tax    numeric(12,2) not null
);

insert into mu_case values
  ('M1', '§2.10 — 16% inclusive, one item at $11.60',
                                    11.600000,    1.000, 0.1600,  11.60,  10.00,  1.60),
  ('M2', '§2.5  — the shelf: $2.00 the 100 g, IVA in',
                                     0.020000,  100.000, 0.1600,   2.00,   1.72,  0.28),
  ('M3', '§2.5  — zero-rated line, net is the gross',
                                    13.500000,    1.000, 0.0000,  13.50,  13.50,  0.00),
  ('M4', '§2.5  — half-centavo tie, counted: 5 x $0.073 = $0.365',
                                     0.073000,    5.000, 0.1600,   0.37,   0.32,  0.05),
  ('M5', '§2.5  — half-centavo tie, weighed: 250 g at $25.86 the kilo',
                                     0.025860,  250.000, 0.1600,   6.47,   5.58,  0.89),
  ('M6', '§2.5  — half-centavo tie at rate 0, the other tax rate',
                                     0.073000,    5.000, 0.0000,   0.37,   0.37,  0.00),
  ('M7', '§2.5  — weighed decimal quantity: a quarter kilo at $12.35',
                                     0.012350,  250.000, 0.1600,   3.09,   2.66,  0.43),
  ('M8', '§2.5  — the reversal of M4: half-up is AWAY FROM ZERO',
                                     0.073000,   -5.000, 0.1600,  -0.37,  -0.32, -0.05),
  ('M9', '§2.10 — the case of 24 at $12.00, as a money line',
                                     0.500000,   24.000, 0.1600,  12.00,  10.34,  1.66);

create temp table mu_money as
select c.*,
       round(c.unit_gross * c.qty, 2)                                    as got_gross,
       round(round(c.unit_gross * c.qty, 2) / (1 + c.rate), 2)           as got_net,
       round(c.unit_gross * c.qty, 2)
         - round(round(c.unit_gross * c.qty, 2) / (1 + c.rate), 2)       as got_tax,
       -- the two spellings §2.5 rule 4 forbids and rule 6 forbids, kept beside
       -- the right one so the C-block can show the table can tell them apart
       round(round(round(c.unit_gross * c.qty, 2) / (1 + c.rate), 2) * c.rate, 2)
                                                                         as tax_if_rounded_alone,
       round((round(c.unit_gross * c.qty, 3) * 100)::float8) / 100        as gross_if_bankers
  from mu_case c;


-- ---------------------------------------------------------------------------
-- THE DOCUMENT CASES — §2.5 rule 5, and the disagreement it exists to name
--
-- Per line, the document is the sum of the rounded lines. Split at the document
-- instead and the displayed lines stop summing to the displayed total, which is
-- the §2.8 review screen the customer is looking at.
--
-- D3 is the CONTROL: a document where the two agree. Without it, "per-line and
-- per-document disagree" could be satisfied by a rule that always disagrees,
-- which would be a different defect wearing the same green.
-- ---------------------------------------------------------------------------
create temp table mu_doc (
  id         text primary key,
  label      text not null,
  n_lines    int           not null,
  line_gross numeric(12,2) not null,
  rate       numeric(5,4)  not null,
  exp_perline numeric(12,2) not null,
  exp_perdoc  numeric(12,2) not null,
  exp_agree   boolean       not null
);

insert into mu_doc values
  ('D1', '§2.5 — three items at $1.00, 16%: the lines say 2.58, the document 2.59',
         3,  1.00, 0.1600,  2.58,  2.59, false),
  ('D2', '§2.10 — the ten 100 g tickets: $17.20 by line, $17.24 by document',
        10,  2.00, 0.1600, 17.20, 17.24, false),
  ('D3', 'control — one line at $11.60: the two agree, so the rule is not just noise',
         1, 11.60, 0.1600, 10.00, 10.00, true);

create temp table mu_docr as
select d.*,
       d.n_lines * round(d.line_gross / (1 + d.rate), 2)          as got_perline,
       round((d.n_lines * d.line_gross) / (1 + d.rate), 2)        as got_perdoc
  from mu_doc d;


-- ---------------------------------------------------------------------------
-- THE PACK CASES — §2.10's second sentence, and the two that make it a claim
--
-- P1 is the ADR's own: a case of 24 at $12 is $0.50 the can. P2 and P3 are
-- packs whose division does NOT terminate at six decimals, and they are here
-- because P1 alone would be satisfied by a system that simply happened to
-- divide evenly. What they show is that `unit_price_net_per_base` is a DISPLAY
-- figure and `line_net` is the authority — §2.5 rule 3's "per line", again.
--
-- ⚠️ P1 IS ALSO MEASURED ON A REAL `purchase_line`, not only in arithmetic:
-- the fixture above delivered one case of 24 and one pack of 3, and U/P tests
-- below read what the applied schema stored.
-- ---------------------------------------------------------------------------
create temp table mu_pack (
  id          text primary key,
  label       text not null,
  pack_size   numeric(14,3) not null,
  case_net    numeric(12,2) not null,
  exp_per_unit numeric(14,6) not null,
  exp_round_trips boolean    not null
);

insert into mu_pack values
  ('P1', '§2.10 — a case of 24 at $12.00 is $0.50 the can, exactly',
         24.000, 12.00, 0.500000, true),
  ('P2', 'a pack of 3 at $10.00 is $3.333333 and does NOT multiply back',
          3.000, 10.00, 3.333333, false),
  ('P3', 'a case of 24 at $12.01 is $0.500417 and does NOT multiply back',
         24.000, 12.01, 0.500417, false);

create temp table mu_packr as
select p.*,
       round(p.case_net / p.pack_size, 6)                          as got_per_unit,
       (round(p.case_net / p.pack_size, 6) * p.pack_size = p.case_net)
                                                                   as got_round_trips
  from mu_pack p;


-- ---------------------------------------------------------------------------
-- THE MONEY COLUMNS OF THE APPLIED SCHEMA — §2.5 rule 1, made structural
--
-- Rule 1 is "no floating point anywhere in the money path". A prose rule cannot
-- fail a build. This table turns it into one claim per column, discovered from
-- `information_schema`, so a money column added by a future migration is
-- measured the day it lands rather than the day someone remembers.
--
-- ⚠️ THE SCALES ARE PART OF THE CLAIM AND NOT DECORATION. numeric(12,2) is the
-- centavo; numeric(14,6) is the per-base price §2.5's worked example shows;
-- numeric(14,3) is the base quantity. A money column at scale 4 would still be
-- exact and would still be wrong — it would represent a tenth of a centavo,
-- which is a number no shop can charge.
-- ---------------------------------------------------------------------------
create temp table mu_col as
select c.table_name::name  as tbl,
       c.column_name::name as col,
       c.data_type,
       c.numeric_precision as prec,
       c.numeric_scale     as scale,
       case
         when c.column_name in ('line_net', 'tax_amount', 'total_net', 'total_tax')
           then 'centavo'
         when c.column_name in ('unit_price_net_per_base', 'unit_cost_net_per_base',
                                'price_per_base')
           then 'per_base_price'
         when c.column_name in ('qty_base', 'qty_display', 'qty_received_base',
                                'remaining_base', 'pack_size')
           then 'base_qty'
         when c.column_name = 'tax_rate' then 'rate'
         when c.column_name = 'factor_to_base' then 'factor'
       end as kind
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
   and t.table_type = 'BASE TABLE'
 where c.table_schema = 'public'
   and c.column_name in ('line_net', 'tax_amount', 'total_net', 'total_tax',
                         'unit_price_net_per_base', 'unit_cost_net_per_base',
                         'price_per_base', 'qty_base', 'qty_display',
                         'qty_received_base', 'remaining_base', 'pack_size',
                         'tax_rate', 'factor_to_base');

create temp table mu_colr as
select m.*,
       (m.data_type = 'numeric') as is_exact,
       case m.kind
         when 'centavo'        then m.prec = 12 and m.scale = 2
         when 'per_base_price' then m.prec = 14 and m.scale = 6
         when 'base_qty'       then m.prec = 14 and m.scale = 3
         when 'rate'           then m.prec = 5  and m.scale = 4
         when 'factor'         then m.prec = 14 and m.scale = 6
       end as scale_ok
  from mu_col m;


-- ---------------------------------------------------------------------------
-- The plan is COMPUTED from what was measured, never hardcoded: 16 fixed tests,
-- 1 per unit denomination, 1 per withdrawal, 4 per money case, 3 per document
-- case, 2 per pack case and 2 per money column. A denomination or a money
-- column added by a future migration is measured the day it lands.
--
-- ⚠️ SIXTEEN AND NOT FOURTEEN, and the two extra are F15 and F16 at the foot of
-- the P-block. They read a real `purchase_line` rather than a case row, so they
-- do not scale with `mu_packr` and are fixed. The first draft counted them as
-- per-case tests; the guard below caught it — "planned 153 but ran 155" — which
-- is the third way a failing suite exits 0 and the reason 3.3 and 3.4 put that
-- guard here at all. It has now paid for itself on its first new file.
--
-- ⚠️ THE NUMBER IS KEPT, and the guard after `finish()` checks it against
-- pgTAP's own — 3.3's finding as 3.4 corrected it.
-- ---------------------------------------------------------------------------
create temp table mu_plan as
select (
  16
  + 1 * (select count(*)::int from mu_unit)
  + 1 * (select count(*)::int from mu_draw)
  + 4 * (select count(*)::int from mu_money)
  + 3 * (select count(*)::int from mu_docr)
  + 2 * (select count(*)::int from mu_packr)
  + 2 * (select count(*)::int from mu_colr)
) as planned;

select plan((select planned from mu_plan));


-- ===========================================================================
-- FIXED TESTS F1-F14
-- ===========================================================================

-- F1. THE SCOPE RESOLVED, AND THE FIXTURE LANDED. Every generated test below
-- reads a table this fixture filled; an empty fixture is a green that measured
-- nothing. The author and provider are asserted too, because a null in either
-- would have raised on insert — this is the claim that they were RESOLVED, not
-- that the inserts happened to succeed.
select ok(
      (select count(*) = 1 from mu_scope)
  and (select author is not null and provider_id is not null from mu_scope)
  and (select count(*) = 5 from mu_ref)   -- family, three variants, the delivery
  and (select count(*) = 3 from mu_pline)
  and (select count(*) = 10 from mu_draw),
  'F1 scope is one workspace with one active store and tax-inclusive prices; the fixture wrote 3 lines and 10 tickets'
);

-- F2. THE SEED IS UNDER IT. F7 and F8 are claims over applied DATA, and both
-- are vacuously true of an empty ledger. This is the floor that stops the two
-- largest tests in the file from passing by measuring nothing — 1.7's rule.
select ok(
      (select count(*) > 1000 from public.stock_batch)
  and (select count(*) > 3000 from public.stock_movement)
  and (select count(*) > 3000 from (
         select 1 from public.sale_line
         union all select 1 from public.purchase_line
         union all select 1 from public.waste_line) x),
  'F2 the seeded ledger is under this suite — F7 and F8 are not claims about an empty database'
);

-- F3. §2.5 RULE 6, AS THIS POSTGRES ACTUALLY IMPLEMENTS IT. `round(numeric)` is
-- half-up away from zero, in both directions, at both the integer and the
-- centavo. Everything in the M-block rests on this and nothing else asserts it.
select ok(
      round(2.5::numeric)        = 3
  and round(3.5::numeric)        = 4
  and round(-2.5::numeric)       = -3
  and round(-3.5::numeric)       = -4
  and round(0.005::numeric, 2)   = 0.01
  and round(-0.005::numeric, 2)  = -0.01
  and round(0.015::numeric, 2)   = 0.02,
  'F3 round(numeric) is half-up AWAY FROM ZERO — §2.5 rule 6, in the database that will do the rounding'
);

-- F4. AND `round(float8)` IS NOT, WHICH IS WHY RULE 1 IS LOAD-BEARING. Postgres
-- rounds double precision half-to-EVEN: 2.5 -> 2, 646.5 -> 646. So the same
-- expression, with one cast anywhere in it, silently changes what a customer is
-- charged by a centavo — and it changes it on the tie, which is the case nobody
-- checks by hand. Rule 1 is not a style preference; it is the precondition for
-- rule 6, and this test is that sentence made falsifiable.
select ok(
      round(2.5::float8)   = 2
  and round(3.5::float8)   = 4
  and round(646.5::float8) = 646
  and round(646.5::numeric) = 647
  and round(2.5::float8) <> round(2.5::numeric),
  'F4 round(float8) is half-to-EVEN and disagrees with round(numeric) on the tie — §2.5 rule 1 is what keeps it out'
);

-- F5. §2.5 RULE 1, OVER THE WHOLE OF `public`. Not "the money path we thought
-- of" — every column of every base table. A float column anywhere in a schema
-- this small is a defect whatever it holds, and the day one lands is the day
-- someone divides by it.
select is(
  (select count(*) from information_schema.columns c
     join information_schema.tables t
       on t.table_schema = c.table_schema and t.table_name = c.table_name
      and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.data_type in ('double precision', 'real')),
  0::bigint,
  'F5 no float column anywhere in public — §2.5 rule 1, asserted structurally rather than believed'
);

-- F6. THE FLOOR UNDER F5 AND UNDER THE COLUMN BLOCK. `mu_col` discovers its
-- columns by name, so a rename empties it and the two-per-column tests below
-- simply stop being generated. Fourteen is what 0001-0004 applied.
select cmp_ok((select count(*)::int from mu_colr), '>=', 20,
  'F6 at least the twenty money and quantity columns 0001-0004 applied were measured');

-- F7. §2.5 RULE 5, OVER ALL 1 086 SEEDED DOCUMENTS. The document is the sum of
-- its rounded lines. This is the one rule of §2.5 that applied data can be
-- checked against today, and the seed is three months of two shops written by
-- four files — so it is a claim about agreement between them, not about one
-- expression.
select is(
  (select count(*) from (
     select s.id from public.sale s
       join lateral (select coalesce(sum(line_net), 0) n, coalesce(sum(tax_amount), 0) t
                       from public.sale_line where sale_id = s.id) l on true
      where s.total_net <> l.n or s.total_tax <> l.t
     union all
     select p.id from public.purchase p
       join lateral (select coalesce(sum(line_net), 0) n, coalesce(sum(tax_amount), 0) t
                       from public.purchase_line where purchase_id = p.id) l on true
      where p.total_net <> l.n or p.total_tax <> l.t
     union all
     select w.id from public.waste w
       join lateral (select coalesce(sum(line_net), 0) n, coalesce(sum(tax_amount), 0) t
                       from public.waste_line where waste_id = w.id) l on true
      where w.total_net <> l.n or w.total_tax <> l.t) bad),
  0::bigint,
  'F7 §2.5 rule 5 — every seeded document total is the sum of its rounded lines, net and tax'
);

-- F8. §2.5 RULES 3 AND 4, OVER ALL 3 448 SEEDED LINES. `net + tax` is the
-- gross by construction, so the testable half is that the stored net is what
-- the stored gross divides down to: net = round((net + tax) / (1 + rate)).
--
-- ⚠️ THIS IS WHAT MAKES THE RESIDUAL RULE OBSERVABLE FROM STORED DATA, and it
-- is the only handle there is: neither line table stores a gross column, so a
-- line that computed its tax the forbidden way (round(net * rate)) is invisible
-- unless it happens to fall off this identity. 118 sale lines and 4 waste lines
-- in this seed DO differ from round(net * rate) — the residual and the
-- forbidden spelling disagree on them — and all 3 448 satisfy the identity
-- below. The purchase lines take the other spelling and still satisfy it. See
-- the finding in docs/PLAN.md: which direction `0006` must take on a PURCHASE
-- is not settled by §2.5 and is the owner's call.
select is(
  (select count(*) from (
     select 1 from public.sale_line
       where line_net <> round((line_net + tax_amount) / (1 + tax_rate), 2)
     union all
     select 1 from public.purchase_line
       where line_net <> round((line_net + tax_amount) / (1 + tax_rate), 2)
     union all
     select 1 from public.waste_line
       where line_net <> round((line_net + tax_amount) / (1 + tax_rate), 2)) bad),
  0::bigint,
  'F8 §2.5 rules 3-4 — every seeded line net is its own gross divided down, so net + tax = gross exactly'
);

-- F9. ⚠️ THE 16% DIVISION HAS NO HALF-CENTAVO TIE, AND §2.5 ASKS cases.json FOR
-- ONE. `net = gross / 1.16` with gross an integer number of centavos is
-- G/116; for that to be an exact half-centavo (2m+1)/200 needs 50G = 29(2m+1),
-- and 29 is prime, so 29 | G, so 50j = 2m+1 — even equals odd. It never
-- happens. The search below is the same claim by exhaustion over every gross
-- from one centavo to two hundred pesos, which is every ticket a corner shop
-- writes. So the tie-break §2.5 rule 6 settles is reachable ONLY at
-- `round(unit_gross * qty, 2)`, and that is where M4-M6 and M8 put it.
select is(
  (select count(*) from generate_series(1, 20000) g
    where (g::numeric / 100) / 1.16 * 1000 = trunc((g::numeric / 100) / 1.16 * 1000)
      and (trunc((g::numeric / 100) / 1.16 * 1000)::bigint % 10) = 5),
  0::bigint,
  'F9 no integer-centavo gross divides by 1.16 onto a half-centavo — the rule-6 tie lives in the multiplication, not the tax split'
);

-- F10. THE UNIT TABLE IS THE ONE §2.5 DESCRIBES. Three dimensions, each with a
-- base that is its own base at factor 1, and no denomination outside them.
select ok(
      (select count(distinct dimension) = 3 from public.unit)
  and (select count(*) = 3 from public.unit where code = base_code and factor_to_base = 1)
  and (select bool_and(base_code in ('g', 'ml', 'pza')) from public.unit)
  and (select count(*) >= 10 from public.unit),
  'F10 three dimensions, three bases at factor 1, every denomination inside one of them'
);

-- F11. ⚠️ THE GRAM BASE BUYS RESOLUTION, NOT EXACTNESS — and 0001's comment
-- gives the other reason. It says that with kilograms as base "buying 1 kg and
-- selling 100 g ten times would never quite close". That is a FLOATING-POINT
-- argument, and the ledger is `numeric`: at numeric(14,3) the kilogram
-- counterfactual closes exactly, as the second term below shows. What the gram
-- base actually buys is a thousandfold more resolution at the same scale — half
-- a gram is 0.500 in grams and rounds to a whole gram in kilos. The decision is
-- right; the stated reason is not the one that holds. Recorded in docs/PLAN.md.
select ok(
      (1000.000::numeric(14,3) - 10 * 100.000::numeric(14,3)) = 0
  and (1.000::numeric(14,3)    - 10 * 0.100::numeric(14,3))   = 0
  and 0.500::numeric(14,3)  = 0.5
  and 0.0005::numeric(14,3) <> 0.0005,
  'F11 gram base buys RESOLUTION: the kilo counterfactual also closes at numeric(14,3), but half a gram survives only in grams'
);

-- F12. THE TEN WITHDRAWALS ALL CAME OUT OF THIS FIXTURE'S OWN LOT. If one had
-- spilled onto a seeded lot of some other variant, or opened an adjustment lot
-- through allocate_fefo()'s branch three, the closing zero below would be a zero
-- over a different pile of stock than the one the kilogram opened.
select ok(
      (select bool_and(lots = 1) from mu_draw)
  and (select bool_and(took = 100.000) from mu_draw)
  and (select count(*) = 1 from public.stock_batch sb
        join mu_ref r on r.k = 'mu_mass' and sb.variant_id = r.v)
  and (select count(*) = 0 from public.stock_batch sb
        join mu_ref r on r.k = 'mu_mass' and sb.variant_id = r.v
       where sb.origin <> 'purchase'),
  'F12 all ten takes came whole out of the single purchase lot — no shortfall branch, no second lot'
);

-- F13. THE ANTI-VACUITY GUARD ON THE M-BLOCK. A case table of round numbers
-- would pass under half-up and under banker's alike and prove nothing about
-- rule 6; a case table where the residual never differs from the forbidden
-- `round(net * rate)` would prove nothing about rule 4. This asserts the table
-- contains at least one case that can tell each pair apart — which is what
-- makes the M-block's greens mean something, and what 3.6 must preserve when it
-- lifts these cases into cases.json.
select ok(
      (select count(*) > 0 from mu_money where got_gross <> gross_if_bankers)
  and (select count(*) > 0 from mu_money where got_tax <> tax_if_rounded_alone)
  and (select count(*) > 0 from mu_money where rate = 0)
  and (select count(*) > 0 from mu_money where qty < 0)
  and (select count(*) > 0 from mu_docr  where not exp_agree)
  and (select count(*) > 0 from mu_docr  where exp_agree)
  and (select count(*) > 0 from mu_packr where not exp_round_trips),
  'F13 the case tables discriminate: half-up vs banker''s, residual vs rounded-alone, both tax rates, a reversal, and both document verdicts'
);

-- F14. THE §2.4 INVARIANT STILL HOLDS OVER WHAT THIS FILE WROTE. Not this
-- suite's subject — 06 owns it — but this file opened a lot and drained it
-- through the real allocator, and a units suite that left the ledger
-- inconsistent would be reporting an exact zero from a broken projection.
select is(
  (select count(*) from public.batch_balance_violations()),
  0::bigint,
  'F14 §2.4 still holds across the delivery and the ten tickets this file wrote'
);


-- ===========================================================================
-- U-BLOCK — the unit table, one test per denomination
-- ===========================================================================
select ok(integral and positive and identity_iff_base and base_is_base and round_trips,
  'U ' || code || ' — ' || factor_to_base::text || ' ' || base_code
       || ' exactly, and one ' || code || ' converts to base and back')
from mu_unit order by dimension, factor_to_base desc;


-- ===========================================================================
-- U-BLOCK — 1 kg in, 100 g x 10 out, one test per withdrawal
--
-- The running balance after each ticket, read from `batch_balance` — the
-- projection the trigger maintains, not a sum this file computed. The tenth row
-- is §2.10's sentence: exactly 0, and `is()` on numeric is exact equality, so
-- 0.001 g left behind is a red test and not a rounding anyone waves through.
-- ===========================================================================
select is(remaining, expected,
  'U kg->100g draw ' || lpad(n::text, 2) || ' — ' || (n * 100)
    || ' g out, ' || expected::text || ' g left'
    || case when n = 10 then '  <- §2.10: EXACTLY ZERO' else '' end)
from mu_draw order by n;


-- ===========================================================================
-- M-BLOCK — §2.5's rounding rule, four tests per case
--
-- ⚠️ SPECIFICATION, NOT VERIFICATION, UNTIL 0006 LANDS. See the header. What
-- these assert is that the rule spelled in SQL reproduces expectations worked
-- out by hand — which is what pins the arithmetic `record_sale` must inherit.
-- ===========================================================================
select is(got_gross, exp_gross,
  'M ' || id || ' gross — round(' || unit_gross::text || ' x ' || qty::text || ')  [' || label || ']')
from mu_money order by id;

select is(got_net, exp_net,
  'M ' || id || ' net — round(gross / ' || (1 + rate)::text || ')  [' || label || ']')
from mu_money order by id;

select is(got_tax, exp_tax,
  'M ' || id || ' tax — the RESIDUAL, gross - net, never rounded on its own')
from mu_money order by id;

select ok(got_net + got_tax = got_gross,
  'M ' || id || ' net + tax = gross EXACTLY — which is the whole point of rule 4')
from mu_money order by id;


-- ===========================================================================
-- M-BLOCK — §2.5 rule 5, three tests per document case
-- ===========================================================================
select is(got_perline, exp_perline,
  'D ' || id || ' by line — ' || n_lines || ' x round(' || line_gross::text
    || ' / ' || (1 + rate)::text || ')  [' || label || ']')
from mu_docr order by id;

select is(got_perdoc, exp_perdoc,
  'D ' || id || ' by document — round(' || (n_lines * line_gross)::text
    || ' / ' || (1 + rate)::text || '), which is NOT what gets stored')
from mu_docr order by id;

select is((got_perline = got_perdoc), exp_agree,
  'D ' || id || ' the two ' || case when exp_agree then 'agree' else 'DISAGREE' end
    || ' — and §2.5 rule 5 says the lines win')
from mu_docr order by id;


-- ===========================================================================
-- P-BLOCK — §2.10's case of 24, two tests per pack case
-- ===========================================================================
select is(got_per_unit, exp_per_unit,
  'P ' || id || ' — ' || case_net::text || ' over ' || pack_size::text
    || ' is ' || exp_per_unit::text || '  [' || label || ']')
from mu_packr order by id;

select is(got_round_trips, exp_round_trips,
  'P ' || id || ' — the per-unit figure '
    || case when exp_round_trips then 'multiplies back to the line exactly'
            else 'does NOT multiply back, so the LINE is the authority' end)
from mu_packr order by id;

-- ⚠️ F15 AND F16 — P1 ON A REAL ROW. The tests above are arithmetic over a case
-- table; these two read what the applied schema actually stored when the
-- fixture delivered a case of 24 at $12.00. They are FIXED tests, not per-case
-- ones — there is one real delivery, not one per row of `mu_pack` — and the
-- plan counts them among the sixteen.
select is(
  (select pl.unit_price_net_per_base
     from public.purchase_line pl
     join mu_ref r on r.k = 'mu_p24' and pl.variant_id = r.v),
  0.500000::numeric(14,6),
  'F15 P1 on a REAL purchase_line — the stored per-can price of a $12.00 case of 24'
);

select is(
  (select pv.pack_size
     from public.product_variant pv
     join mu_ref r on r.k = 'mu_p24' and pv.id = r.v),
  24.000::numeric(14,3),
  'F16 P1 — and the variant really does carry pack_size 24, so the division above was over the applied number'
);


-- ===========================================================================
-- COLUMN BLOCK — §2.5 rule 1 and the scales, two tests per money column
-- ===========================================================================
select ok(is_exact,
  'C ' || tbl || '.' || col || ' is exact numeric, not ' || data_type
       || ' — §2.5 rule 1')
from mu_colr order by tbl, col;

select ok(scale_ok,
  'C ' || tbl || '.' || col || ' is numeric(' || prec || ',' || scale || ') — the '
       || kind || ' scale §2.5 names')
from mu_colr order by tbl, col;


-- ---------------------------------------------------------------------------
-- `finish(exception_on_failure := true)` RAISES so psql exits non-zero; plain
-- psql prints "not ok" and exits 0. Same reasoning as 01-06.
-- ---------------------------------------------------------------------------
select * from finish(exception_on_failure := true);

-- ---------------------------------------------------------------------------
-- THE GUARD `finish()` DOES NOT PROVIDE — 3.3's finding, in 3.4's corrected
-- spelling. `tap._get('plan')` is the number pgTAP was actually GIVEN, which is
-- the half 05's original version missed; comparing it to `curr_test` closes the
-- ELSIF that disarms `exception_on_failure`, and the third comparison keeps this
-- file's own arithmetic honest as well.
-- ---------------------------------------------------------------------------
do $$
declare
  v_planned  int := tap._get('plan');
  v_ran      int := tap._get('curr_test');
  v_computed int := (select planned from mu_plan);
begin
  if v_ran is distinct from v_planned or v_planned is distinct from v_computed then
    raise exception
      'plan/actual mismatch: plan() was given %, the file computed %, % tests ran '
      '— finish() reports this as a diagnostic and does NOT raise, so '
      'exception_on_failure was disarmed and any failing test above exited 0',
      v_planned, v_computed, v_ran;
  end if;
end;
$$;

-- The ROLLBACK returns the family, the three variants, the delivery, the three
-- lots and the ten tickets. It is not reached when a test fails — psql stops on
-- the exception and drops the connection, which rolls back anyway.
rollback;
