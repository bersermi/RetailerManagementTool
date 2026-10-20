-- ============================================================================
-- Behavioural verification for 0067 — the starter catalog carries a price, and
-- the import writes it. The owner's rulings of 2026-10-20 (*"You can apply
-- them"*; no flag tells a suggested price from a typed one).
--
--   1. the column: pesos, never negative, null for none
--   2. ⚠️⚠️ a product the import CREATES gets a price row from the shop's today,
--      stored as the shop keys a price — per BASE unit (a kilo's price per gram),
--      gross where the shop's prices include IVA, net where they do not
--   3. a product with no suggested price stays sin precio; a product the shop
--      already had is skipped AND its own price is left alone
--   4. the answer says how many were priced, and a second import prices nothing
--
-- ⚠️ `_cleanup.sql` never empties `catalogo`, so the fixture is its own: every
-- code starts `zz0067-`, deleted before it is written and again at the end.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

drop table if exists public._verify;
create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 0. The fixture template
-- ----------------------------------------------------------------------------
delete from catalogo.product_tag where product_code like 'zz0067-%';
delete from catalogo.product     where code like 'zz0067-%';
delete from catalogo.family      where code like 'zz0067-%';
delete from catalogo.tag         where code like 'zz0067-%';

insert into catalogo.tag (code, kind, label) values ('zz0067-giro', 'giro', 'Giro 0067');
insert into catalogo.family (code, name) values
  ('zz0067-carne', 'Carne 0067'),
  ('zz0067-tienda', 'Tienda 0067');

-- A kilo at $129.50; a bottle at $18; one with IVA at $116; one with no price;
-- and *Refresco propio 0067*, which the shop already sells under its own name.
insert into catalogo.product (code, family_code, name, base_unit_code, purchase_unit_code,
       sell_unit_code, price_unit_code, tax_rate, suggested_price) values
  ('zz0067-pechuga',  'zz0067-carne',  'Pechuga 0067',         'g',   'kg',  'kg',  'kg',  0,    129.50),
  ('zz0067-refresco', 'zz0067-tienda', 'Refresco 0067',        'pza', 'pza', 'pza', 'pza', 0,    18),
  ('zz0067-gravado',  'zz0067-tienda', 'Con IVA 0067',         'pza', 'pza', 'pza', 'pza', 0.16, 116),
  ('zz0067-sin',      'zz0067-tienda', 'Sin precio 0067',      'pza', 'pza', 'pza', 'pza', 0,    null),
  ('zz0067-propio',   'zz0067-tienda', 'Refresco propio 0067', 'pza', 'pza', 'pza', 'pza', 0,    25);
insert into catalogo.product_tag (product_code, tag_code)
select code, 'zz0067-giro' from catalogo.product where code like 'zz0067-%';

-- ----------------------------------------------------------------------------
-- 1. The column
-- ----------------------------------------------------------------------------
select public.chk('1.1 catalogo.product.suggested_price is numeric(12,2) and nullable',
  (select data_type = 'numeric' and numeric_precision = 12 and numeric_scale = 2 and is_nullable = 'YES'
     from information_schema.columns
    where table_schema = 'catalogo' and table_name = 'product' and column_name = 'suggested_price'));
do $$
begin
  update catalogo.product set suggested_price = -1 where code = 'zz0067-sin';
  raise exception 'a negative suggested price was accepted';
exception when check_violation then null;
end;
$$;
select public.chk('1.2 a negative suggested price is refused (23514)', true);

-- ----------------------------------------------------------------------------
-- The shops: A keys prices WITH IVA (the default), B without
-- ----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('0c0c0c0c-0067-4000-8000-000000000001', 'owner.a.0067@example.mx'),
  ('0c0c0c0c-0067-4000-8000-000000000002', 'owner.b.0067@example.mx');

select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0067-4000-8000-000000000001","role":"authenticated"}', false);
select onboard_workspace('Tienda A 0067') as ws \gset
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0067-4000-8000-000000000002","role":"authenticated"}', false);
select onboard_workspace('Tienda B 0067', false) as ws_b \gset
select set_config('request.jwt.claims', null, false);

-- A's own *Refresco propio 0067*, at its own $30.
insert into product_family (workspace_id, name, is_prebuilt) values (:'ws', 'Lo mío 0067', false);
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, is_prebuilt)
select :'ws', id, 'Refresco propio 0067', 'pza','pza','pza','pza', false
  from product_family where workspace_id = :'ws' and name = 'Lo mío 0067';
insert into price_list (workspace_id, variant_id, price_per_base, effective_from)
select :'ws', id, 30, date '2026-01-01'
  from product_variant where workspace_id = :'ws' and name = 'Refresco propio 0067';

-- ----------------------------------------------------------------------------
-- 2–4. The import, as each owner
-- ----------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0067-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.import_catalog(:'ws', array['zz0067-giro']) as r1 \gset
select public.import_catalog(:'ws', array['zz0067-giro']) as r2 \gset
commit;

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0067-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.import_catalog(:'ws_b', array['zz0067-giro']) as r3 \gset
commit;
select set_config('request.jwt.claims', null, false);

create temp view _price as
select v.workspace_id, v.template_code, v.name, pl.price_per_base, pl.effective_from, pl.location_id
  from public.product_variant v
  left join public.price_list pl on pl.variant_id = v.id and pl.workspace_id = v.workspace_id;

select public.chk('2.1 a kilo at $129.50 is stored per GRAM: 0.129500',
  (select price_per_base = 0.1295 from _price where workspace_id = :'ws' and template_code = 'zz0067-pechuga'));
select public.chk('2.2 a bottle at $18 is stored per piece: 18',
  (select price_per_base = 18 from _price where workspace_id = :'ws' and template_code = 'zz0067-refresco'));
select public.chk('2.3 a shop whose prices include IVA keeps the gross: $116',
  (select price_per_base = 116 from _price where workspace_id = :'ws' and template_code = 'zz0067-gravado'));
select public.chk('2.4 ⚠️ a shop whose prices do NOT include IVA gets the net: $100',
  (select price_per_base = 100 from _price where workspace_id = :'ws_b' and template_code = 'zz0067-gravado'));
select public.chk('2.5 from the shop''s own today, for every store (no location)',
  (select bool_and(effective_from = (now() at time zone 'America/Mexico_City')::date and location_id is null)
     from _price where workspace_id = :'ws' and template_code like 'zz0067-%' and price_per_base is not null));
select public.chk('3.1 a product with no suggested price stays sin precio',
  (select price_per_base is null from _price where workspace_id = :'ws' and template_code = 'zz0067-sin'));
select public.chk('3.2 the shop''s own *Refresco propio* is skipped, and keeps its $30 and only that',
  (select count(*) = 1 and min(price_per_base) = 30 from _price
    where workspace_id = :'ws' and name = 'Refresco propio 0067'));
select public.chk('4.1 the answer counts the priced: four imported, three priced, one skipped',
  (:'r1')::jsonb = '{"imported": 4, "skipped": 1, "priced": 3}'::jsonb, :'r1');
select public.chk('4.2 a second import imports and prices nothing',
  (:'r2')::jsonb = '{"imported": 0, "skipped": 5, "priced": 0}'::jsonb, :'r2');
select public.chk('4.3 a shop with nothing of its own imports all five and prices four',
  (:'r3')::jsonb = '{"imported": 5, "skipped": 0, "priced": 4}'::jsonb, :'r3');
select public.chk('4.4 one price row per priced product — never two',
  (select count(*) = count(distinct (workspace_id, template_code)) from _price
    where workspace_id in (:'ws', :'ws_b') and template_code like 'zz0067-%' and price_per_base is not null));

-- ----------------------------------------------------------------------------
-- The fixture template goes; the shops go with _cleanup.sql
-- ----------------------------------------------------------------------------
delete from catalogo.product_tag where product_code like 'zz0067-%';
delete from catalogo.product     where code like 'zz0067-%';
delete from catalogo.family      where code like 'zz0067-%';
delete from catalogo.tag         where code like 'zz0067-%';

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 13 then
    raise exception 'expected 13 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
