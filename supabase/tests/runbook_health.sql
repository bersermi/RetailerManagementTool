-- ============================================================================
-- docs/runbooks/health.sql — the read the owner runs to see whether any shop's
-- record is broken, driven against four businesses whose dead letters and lots
-- are written out by hand below. Plan task 5P-e, item (b).
--
-- ⚠️ THERE IS NO MIGRATION BEHIND THIS SUITE, which is why it carries no number
-- (`runbook_engagement.sql`'s reason). The runbook is a FILE that claims things
-- about the applied schema — `failed_write` and its replay stamp, the shape of
-- a `record_*` payload, `unit`, `product_variant`'s three units, the ledger and
-- its projection — and nothing else would notice a migration moving one of them
-- until the owner ran it against the shops and got an error, or a wrong number.
--
-- ⚠️ IT RUNS AS THE SUPERUSER ON PURPOSE, as the engagement suite does: the
-- runbook goes through the Management API as the database owner and reads every
-- shop at once. Only the fixture's documents are written under
-- `authenticated`, the way a phone writes them.
--
-- ⚠️ EVERY PESO BELOW IS WORKED BY HAND in the comment beside its line, and each
-- expectation names the number a plausible wrong read would give instead.
--
-- HOW THE RUNBOOK GETS IN. psql reads it CLIENT-SIDE, as the engagement suite
-- reads its runbook:
--
--   default    psql -f supabase/tests/runbook_health.sql   (from the repo root)
--   docker exec, which cannot see the repository:
--              docker exec -i supabase_db_<project> psql -U postgres \
--                -v health_sql="$(cat docs/runbooks/health.sql)" \
--                -f - < supabase/tests/runbook_health.sql
--
-- It cannot fail quietly: an unreadable file leaves the variable empty, the
-- `create table … as` below is then a syntax error, and ON_ERROR_STOP exits
-- non-zero before anything is asserted.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

\if :{?health_sql}
  \echo '# the runbook was supplied by the caller as -v health_sql='
\else
  \set health_sql `cat docs/runbooks/health.sql`
\endif

create table public._verify (n serial, label text, passed boolean, detail text);

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;

-- ----------------------------------------------------------------------------
-- Fixtures and the read in ONE transaction, so `now()` is one instant for both.
-- ----------------------------------------------------------------------------
begin;

insert into auth.users (id, email) values
  ('5e5e5e5e-0000-4000-8000-000000000001', 'owner.a.5pe@example.mx'),
  ('5e5e5e5e-0000-4000-8000-000000000002', 'owner.b.5pe@example.mx'),
  ('5e5e5e5e-0000-4000-8000-000000000003', 'owner.c.5pe@example.mx'),
  ('5e5e5e5e-0000-4000-8000-000000000004', 'owner.k.5pe@example.mx'),
  ('5e5e5e5e-0000-4000-8000-000000000005', 'owner.r.5pe@example.mx');

\set jwt_a '{"sub":"5e5e5e5e-0000-4000-8000-000000000001","role":"authenticated"}'
\set jwt_b '{"sub":"5e5e5e5e-0000-4000-8000-000000000002","role":"authenticated"}'
\set jwt_c '{"sub":"5e5e5e5e-0000-4000-8000-000000000003","role":"authenticated"}'
\set jwt_k '{"sub":"5e5e5e5e-0000-4000-8000-000000000004","role":"authenticated"}'
\set jwt_r '{"sub":"5e5e5e5e-0000-4000-8000-000000000005","role":"authenticated"}'

-- Three shops and two kitchens, each made the way a real one is.
select set_config('request.jwt.claims', :'jwt_a', true);
select public.onboard_workspace('Abarrotes Sanos') as ws_a \gset
select set_config('request.jwt.claims', :'jwt_b', true);
select public.onboard_workspace('Cremería Cartas') as ws_b \gset
select set_config('request.jwt.claims', :'jwt_c', true);
select public.onboard_workspace('Pollería Torcida') as ws_c \gset
select set_config('request.jwt.claims', :'jwt_k', true);
select public.onboard_workspace('Fonda Quieta', p_kind => 'cocina') as ws_k \gset
select set_config('request.jwt.claims', :'jwt_r', true);
select public.onboard_workspace('Fonda Rara', p_kind => 'cocina') as ws_r \gset
select set_config('request.jwt.claims', null, true);

select id as loc_a from public.location where workspace_id = :'ws_a' \gset
select id as loc_b from public.location where workspace_id = :'ws_b' \gset
select id as loc_c from public.location where workspace_id = :'ws_c' \gset
select id as prov_a from public.provider where workspace_id = :'ws_a' and is_generic \gset
select id as prov_c from public.provider where workspace_id = :'ws_c' and is_generic \gset

-- ⚠️ B's store is in TIJUANA, two hours behind Mexico City. Its oldest dead
-- letter fails at 23:30 there, which is already the next day in Mexico City
-- and in UTC — so a read that cut the day in either is red in 2.2.
update public.location set timezone = 'America/Tijuana' where id = :'loc_b';

insert into public.product_family (workspace_id, name) values
  (:'ws_a', 'Abarrotes'), (:'ws_b', 'Quesos'), (:'ws_c', 'Pollo');
select id as fam_a from public.product_family where workspace_id = :'ws_a' \gset
select id as fam_b from public.product_family where workspace_id = :'ws_b' \gset
select id as fam_c from public.product_family where workspace_id = :'ws_c' \gset

-- ⚠️ QUESO'S THREE UNITS ARE ALL DIFFERENT ON PURPOSE: it is stored in grams,
-- arrives by the kilo and is sold by the 100 g. So a line with no unit is
-- priced differently by every wrong default, and 2.4 and 2.5 can tell which.
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws_a', :'fam_a', 'Arroz', 'pza', 'pza',  'pza',  'pza', 0.0000),
  (:'ws_b', :'fam_b', 'Queso', 'g',   'kg',   '100g', 'kg',  0.0000),
  (:'ws_c', :'fam_c', 'Pollo', 'g',   'kg',   'kg',   'kg',  0.0000);
select id as var_a from public.product_variant where workspace_id = :'ws_a' \gset
select id as var_b from public.product_variant where workspace_id = :'ws_b' \gset
select id as var_c from public.product_variant where workspace_id = :'ws_c' \gset

-- ---- A and C record their stock the way a phone does -----------------------
set local role authenticated;

-- A: ten bags in, four sold — a lot whose movements are +10 and −4, balance 6.
select set_config('request.jwt.claims', :'jwt_a', true);
select public.record_purchase('5e5e5e5e-a000-4000-8000-000000000001', :'loc_a', :'prov_a',
  jsonb_build_array(jsonb_build_object('variant_id', :'var_a', 'qty_display', '10',
                                       'unit_price_net_per_base', '20.000000'))) is not null as ok \gset
select public.record_sale('5e5e5e5e-a000-4000-8000-000000000002', :'loc_a',
  jsonb_build_array(jsonb_build_object('variant_id', :'var_a', 'qty_display', '4',
                                       'unit_price_gross_per_base', '25.000000'))) is not null as ok \gset

-- C: three deliveries of chicken, three lots.
select set_config('request.jwt.claims', :'jwt_c', true);
select public.record_purchase('5e5e5e5e-c000-4000-8000-000000000001', :'loc_c', :'prov_c',
  jsonb_build_array(jsonb_build_object('variant_id', :'var_c', 'qty_display', '3',
                    'qty_display_unit', 'kg', 'unit_price_net_per_base', '0.080000'))) is not null as ok \gset
select public.record_purchase('5e5e5e5e-c000-4000-8000-000000000002', :'loc_c', :'prov_c',
  jsonb_build_array(jsonb_build_object('variant_id', :'var_c', 'qty_display', '2',
                    'qty_display_unit', 'kg', 'unit_price_net_per_base', '0.080000'))) is not null as ok \gset
select public.record_purchase('5e5e5e5e-c000-4000-8000-000000000003', :'loc_c', :'prov_c',
  jsonb_build_array(jsonb_build_object('variant_id', :'var_c', 'qty_display', '1',
                    'qty_display_unit', 'kg', 'unit_price_net_per_base', '0.080000'))) is not null as ok \gset

select set_config('request.jwt.claims', null, true);
reset role;

-- ⚠️ C's projection is broken twice, two different ways: the 3 kg lot's
-- balance is off by one gram, and the 2 kg lot has lost its balance row. The
-- 1 kg lot is left alone. A read that only compared rows present on both sides
-- sees one, not two.
update public.batch_balance set remaining_base = remaining_base + 1
 where batch_id = (select sb.id from public.stock_batch sb
                     join public.stock_movement sm on sm.batch_id = sb.id
                    where sb.workspace_id = :'ws_c' and sm.qty_base = 3000);
delete from public.batch_balance
 where batch_id = (select sb.id from public.stock_batch sb
                     join public.stock_movement sm on sm.batch_id = sb.id
                    where sb.workspace_id = :'ws_c' and sm.qty_base = 2000);

-- ---- B's dead letters, written as `record_failed_write` (`0024`) writes them
-- The oldest open one fails at 23:30 in Tijuana, ten days ago.
select (((now() at time zone 'America/Tijuana')::date - 10) + time '23:30')
         at time zone 'America/Tijuana' as oldest_at \gset

insert into public.failed_write
  (id, workspace_id, location_id, kind, payload, error_code, error_detail, failed_at, reported_by)
values
  -- d1, a SALE. 1.5 kg at 0.12 a gram = 1500 × 0.12 = 180.00, and two grams at
  -- 0.006 = 0.006 → 0.01 each. THE SUM OF THE ROUNDED LINES is 180.02; rounding
  -- the sum instead (180.012) would give 180.01.
  ('5e5e5e5e-b000-4000-8000-000000000001', :'ws_b', :'loc_b', 'sale',
   jsonb_build_object('location_id', :'loc_b', 'lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '1.5', 'qty_display_unit', 'kg',
                        'unit_price_gross_per_base', '0.120000'),
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '1', 'qty_display_unit', 'g',
                        'unit_price_gross_per_base', '0.006000'),
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '1', 'qty_display_unit', 'g',
                        'unit_price_gross_per_base', '0.006000'))),
   'P0001', 'd1', now() - interval '1 day', '5e5e5e5e-0000-4000-8000-000000000002'),

  -- d2, a DELIVERY with no unit: the server reads it in the purchase unit, kg.
  -- 2 kg = 2000 g at 0.09 net = 180.00. (As the base unit, 2 g: 0.18; as the
  -- sell unit, 200 g: 18.00.)
  ('5e5e5e5e-b000-4000-8000-000000000002', :'ws_b', :'loc_b', 'purchase',
   jsonb_build_object('location_id', :'loc_b', 'lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '2',
                        'unit_price_net_per_base', '0.090000'))),
   'P0001', 'd2', now() - interval '2 days', '5e5e5e5e-0000-4000-8000-000000000002'),

  -- d3, MERMA with no unit: the server reads it in the sell unit, 100 g.
  -- 100 g at 0.12 = 12.00. (As the purchase unit, 1 kg: 120.00; as the base
  -- unit, 1 g: 0.12.)
  ('5e5e5e5e-b000-4000-8000-000000000003', :'ws_b', :'loc_b', 'waste',
   jsonb_build_object('location_id', :'loc_b', 'lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '1',
                        'unit_price_gross_per_base', '0.120000'))),
   'P0001', 'd3', now() - interval '3 days', '5e5e5e5e-0000-4000-8000-000000000002'),

  -- d4, a SALE with one line in pieces of a product stored in grams — a unit
  -- that measures another thing, the live dead letter's case — beside a good
  -- line of 1 kg (120.00). The whole sale is unpriced; its 120.00 is nowhere.
  ('5e5e5e5e-b000-4000-8000-000000000004', :'ws_b', :'loc_b', 'sale',
   jsonb_build_object('location_id', :'loc_b', 'lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '1', 'qty_display_unit', 'pza',
                        'unit_price_gross_per_base', '1.000000'),
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '1', 'qty_display_unit', 'kg',
                        'unit_price_gross_per_base', '0.120000'))),
   '22023', 'd4', now() - interval '4 days', '5e5e5e5e-0000-4000-8000-000000000002'),

  -- d5, a SALE whose quantity is a word, at a store that no longer exists (a
  -- location id with nothing behind it: `0024` gives the column no key). It
  -- must be counted, unpriced — and must not stop the read.
  ('5e5e5e5e-b000-4000-8000-000000000005', :'ws_b', '5e5e5e5e-dead-4000-8000-000000000000', 'sale',
   jsonb_build_object('lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_b', 'qty_display', 'uno', 'qty_display_unit', 'kg',
                        'unit_price_gross_per_base', '0.120000'))),
   '22P02', 'd5', now() - interval '5 days', '5e5e5e5e-0000-4000-8000-000000000002'),

  -- d6, a DELIVERY of ANOTHER SHOP's product (C's chicken). Unpriced: B's
  -- record could never hold it.
  ('5e5e5e5e-b000-4000-8000-000000000006', :'ws_b', :'loc_b', 'purchase',
   jsonb_build_object('location_id', :'loc_b', 'lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_c', 'qty_display', '1', 'qty_display_unit', 'kg',
                        'unit_price_net_per_base', '0.080000'))),
   'P0001', 'd6', now() - interval '6 days', '5e5e5e5e-0000-4000-8000-000000000002'),

  -- d7, a TRANSFER with no store: counted, worth nothing, NOT unpriced.
  ('5e5e5e5e-b000-4000-8000-000000000007', :'ws_b', null, 'transfer',
   jsonb_build_object('lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '1', 'qty_display_unit', 'kg'))),
   'P0001', 'd7', now(), '5e5e5e5e-0000-4000-8000-000000000002'),

  -- d9, a SALE whose lines are not a list, and d10, MERMA with none at all.
  ('5e5e5e5e-b000-4000-8000-000000000009', :'ws_b', :'loc_b', 'sale',
   jsonb_build_object('lines', 'no es una lista'),
   'P0001', 'd9', now() - interval '7 days', '5e5e5e5e-0000-4000-8000-000000000002'),
  ('5e5e5e5e-b000-4000-8000-00000000000a', :'ws_b', :'loc_b', 'waste',
   '{}'::jsonb,
   'P0001', 'd10', now() - interval '8 days', '5e5e5e5e-0000-4000-8000-000000000002'),

  -- d11, the OLDEST open one: a SALE of 250 g at 0.12 = 30.00, at 23:30 in
  -- Tijuana ten days ago.
  ('5e5e5e5e-b000-4000-8000-00000000000b', :'ws_b', :'loc_b', 'sale',
   jsonb_build_object('location_id', :'loc_b', 'lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '250', 'qty_display_unit', 'g',
                        'unit_price_gross_per_base', '0.120000'))),
   'P0001', 'd11', :'oldest_at', '5e5e5e5e-0000-4000-8000-000000000002'),

  -- A dead letter in the kitchen Fonda Rara, which no phone writes today: it
  -- must surface rather than hide behind `kind = 'cocina'`.
  ('5e5e5e5e-f000-4000-8000-000000000001', :'ws_r', null, 'sale',
   jsonb_build_object('lines', '[]'::jsonb),
   'P0001', 'kitchen', now(), '5e5e5e5e-0000-4000-8000-000000000005');

-- d8, a SALE that was REPLAYED, twenty days ago and worth 999.00 (1 kg at
-- 0.999): it is history now, and must be in no column at all.
insert into public.failed_write
  (id, workspace_id, location_id, kind, payload, error_code, error_detail, failed_at,
   reported_by, replayed_at, replayed_by, replay_result)
values
  ('5e5e5e5e-b000-4000-8000-000000000008', :'ws_b', :'loc_b', 'sale',
   jsonb_build_object('location_id', :'loc_b', 'lines', jsonb_build_array(
     jsonb_build_object('variant_id', :'var_b', 'qty_display', '1', 'qty_display_unit', 'kg',
                        'unit_price_gross_per_base', '0.999000'))),
   'P0001', 'd8', now() - interval '20 days', '5e5e5e5e-0000-4000-8000-000000000002',
   now() - interval '19 days', '5e5e5e5e-0000-4000-8000-000000000002', '{"ok": true}'::jsonb);

-- What the fixture holds, kept to show the checks are not vacuous.
create table public._fixture as
select (select count(*) from public.stock_batch    where workspace_id = :'ws_a') as a_lots,
       (select count(*) from public.stock_movement where workspace_id = :'ws_a' and qty_base < 0) as a_out,
       (select count(*) from public.stock_batch    where workspace_id = :'ws_c') as c_lots,
       ((now() at time zone 'America/Tijuana')::date - 10) as b_oldest;

create table public._got as :health_sql

commit;

-- One shop's row as text, every column in order, or '(no row)'.
create function public._row(p_shop text)
returns text language sql stable as $$
  select coalesce(
    (select concat_ws(' | ', g.health, g.unsaved, nullif(g.oldest, ''), g.unsaved_sales,
                      g.unsaved_purchases, g.unsaved_waste, g.unpriced, g.lots_off)
       from public._got g where g.shop = p_shop),
    '(no row)');
$$;

-- ----------------------------------------------------------------------------
-- 1. The shape
-- ----------------------------------------------------------------------------

select public.chk('1.1 the columns are the shop, its health and seven numbers — and no person',
  (select array_agg(column_name::text order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public' and table_name = '_got')
    = array['shop', 'health', 'unsaved', 'oldest', 'unsaved_sales', 'unsaved_purchases',
            'unsaved_waste', 'unpriced', 'lots_off'],
  (select string_agg(column_name, ', ' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public' and table_name = '_got')
  || ' — a column that names a person (failed_write.reported_by) changes the aviso first');

select public.chk('1.2 the oldest day is TEXT, shaped 2026-10-13 or empty — the CLI prints a date as a UTC midnight',
  (select data_type from information_schema.columns
    where table_schema = 'public' and table_name = '_got' and column_name = 'oldest') = 'text'
  and not exists (select 1 from public._got
                   where oldest <> '' and oldest !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  (select data_type from information_schema.columns
    where table_schema = 'public' and table_name = '_got' and column_name = 'oldest'));

select public.chk('1.3 every shop is listed once, a kitchen only when it holds a dead letter',
  (select array_agg(shop order by shop) from public._got)
    = array['Abarrotes Sanos', 'Cremería Cartas', 'Fonda Rara', 'Pollería Torcida'],
  (select string_agg(shop, ' | ' order by shop) from public._got)
  || ' — Fonda Quieta (a kitchen with nothing) must not be listed');

select public.chk('1.4 no number is ever null',
  not exists (select 1 from public._got
               where health is null or unsaved is null or oldest is null
                  or unsaved_sales is null or unsaved_purchases is null
                  or unsaved_waste is null or unpriced is null or lots_off is null),
  '');

-- ----------------------------------------------------------------------------
-- 2. Cremería Cartas — ten open dead letters and one replayed
-- ----------------------------------------------------------------------------

select public.chk('2.1 ten writes unsaved — the replayed one is history',
  (select unsaved from public._got where shop = 'Cremería Cartas') = 10,
  public._row('Cremería Cartas') || ' — 11 means the replayed sale was counted');

select public.chk('2.2 the oldest is ten days ago on TIJUANA''s calendar',
  (select oldest from public._got where shop = 'Cremería Cartas')
    = (select to_char(b_oldest, 'YYYY-MM-DD') from public._fixture),
  (select oldest from public._got where shop = 'Cremería Cartas')
  || ' expected ' || (select to_char(b_oldest, 'YYYY-MM-DD') from public._fixture)
  || ' — the next day means it was cut in Mexico City or UTC; twenty days ago, the replayed one');

select public.chk('2.3 unsaved sales 210.02: 180.02 summed from rounded lines, plus 30.00',
  (select unsaved_sales from public._got where shop = 'Cremería Cartas') = 210.02,
  (select unsaved_sales::text from public._got where shop = 'Cremería Cartas')
  || ' — 210.01 rounds the sum, not the lines; 330.02 counts the good line of a spoiled sale;'
  || ' 1209.02 counts the replayed one');

select public.chk('2.4 unsaved deliveries 180.00: a line with no unit is in the PURCHASE unit',
  (select unsaved_purchases from public._got where shop = 'Cremería Cartas') = 180.00,
  (select unsaved_purchases::text from public._got where shop = 'Cremería Cartas')
  || ' — 0.18 reads it in the base unit, 18.00 in the sell unit');

select public.chk('2.5 unsaved Merma 12.00: a line with no unit is in the SELL unit',
  (select unsaved_waste from public._got where shop = 'Cremería Cartas') = 12.00,
  (select unsaved_waste::text from public._got where shop = 'Cremería Cartas')
  || ' — 120.00 reads it in the purchase unit, 0.12 in the base unit');

select public.chk('2.6 five unpriced: a foreign unit, a word for a quantity, another shop''s product, lines not a list, no lines',
  (select unpriced from public._got where shop = 'Cremería Cartas') = 5,
  public._row('Cremería Cartas') || ' — 6 means the transfer was taken for unpriced');

select public.chk('2.7 it needs a look, and its stock is not the problem',
  public._row('Cremería Cartas') like 'look | 10 | % | 0',
  public._row('Cremería Cartas'));

-- ----------------------------------------------------------------------------
-- 3. Pollería Torcida — two lots off, two different ways
-- ----------------------------------------------------------------------------

select public.chk('3.1 two lots off: a balance a gram out, and a balance row missing',
  (select lots_off from public._got where shop = 'Pollería Torcida') = 2
  and (select c_lots from public._fixture) = 3,
  public._row('Pollería Torcida') || format(' (of %s lots)', (select c_lots from public._fixture))
  || ' — 1 means a lot with no balance row was not seen');

select public.chk('3.2 it needs a look, with nothing unsaved',
  public._row('Pollería Torcida') = 'look | 0 | 0.00 | 0.00 | 0.00 | 0 | 2',
  public._row('Pollería Torcida'));

-- ----------------------------------------------------------------------------
-- 4. Abarrotes Sanos — healthy, and not vacuously so
-- ----------------------------------------------------------------------------

select public.chk('4.1 a shop whose stock came in and went out reads ok, all zeros',
  public._row('Abarrotes Sanos') = 'ok | 0 | 0.00 | 0.00 | 0.00 | 0 | 0'
  and (select a_lots from public._fixture) >= 1
  and (select a_out  from public._fixture) >= 1,
  public._row('Abarrotes Sanos')
  || format(' — over %s lot(s) and %s movement(s) out',
            (select a_lots from public._fixture), (select a_out from public._fixture)));

select public.chk('4.2 the kitchen with a dead letter needs a look; its empty sale is unpriced',
  public._row('Fonda Rara') like 'look | 1 | % | 0.00 | 0.00 | 0.00 | 1 | 0',
  public._row('Fonda Rara'));

-- ----------------------------------------------------------------------------
-- 5. What a reader leans on
-- ----------------------------------------------------------------------------

select public.chk('5.1 the shops that need a look come first, then the rest, each by name',
  (select array_agg(shop order by ord) from (select shop, row_number() over () as ord from public._got) o)
    = array['Cremería Cartas', 'Fonda Rara', 'Pollería Torcida', 'Abarrotes Sanos'],
  (select string_agg(shop, ' | ') from public._got));

select public.chk('5.2 health is ok exactly when every number is zero',
  not exists (select 1 from public._got
               where (health = 'ok') <> (unsaved = 0 and lots_off = 0)
                  or health not in ('ok', 'look')),
  (select string_agg(shop || '=' || health, ', ') from public._got));

-- ----------------------------------------------------------------------------
-- The report
-- ----------------------------------------------------------------------------
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

drop function public._row(text);
