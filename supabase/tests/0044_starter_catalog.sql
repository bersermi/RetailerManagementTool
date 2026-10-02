-- ============================================================================
-- Behavioural verification for 0044 — the starter catalog and the import
-- ============================================================================
-- ADR-035 §2.9, §2.7, §9. docs/PLAN.md task `9a`.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0044_starter_catalog.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
--   1. the template is closed — no client role can touch `catalogo` directly;
--   2. the template refuses what would break a shop that imports it (two
--      dimensions in one family, a base unit that is not a base);
--   3. `catalog_template()` reads it, with every number as text;
--   4. ⚠️⚠️ `import_catalog()` copies the right rows, ONCE — the file. Run as a
--      real owner and a real cashier under `set local role authenticated`;
--   5. `template_code` is set once.
--
-- ⚠️ `_cleanup.sql` SWEEPS `public` ONLY, SO IT NEVER EMPTIES `catalogo` — and
-- from `9c` on, `catalogo` holds real content that every suite after this one
-- must find intact. So the fixture is its own: every code starts `zz0044-`, it is
-- deleted before it is written and again at the end, and every import below
-- names only fixture tags. Nothing here counts the whole template.
--
-- ⚠️ NOTHING ABOUT HTTP. Over PostgREST `insufficient_privilege` and
-- `check_violation` arrive as status codes this file cannot see; that is `9d`'s
-- contract check.

\set ON_ERROR_STOP on
\timing off

drop table if exists public._verify;
create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

-- A refusal is caught and its SQLSTATE returned, so an assertion names WHICH
-- error arrived ([[a-test-can-defend-a-bug]]).
create or replace function public._try(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._try(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 0. The fixture template — ours alone, removed first in case a run aborted
-- ----------------------------------------------------------------------------
delete from catalogo.product_tag where product_code like 'zz0044-%';
delete from catalogo.product     where code like 'zz0044-%';
delete from catalogo.family      where code like 'zz0044-%';
delete from catalogo.tag         where code like 'zz0044-%';

insert into catalogo.tag (code, kind, label) values
  ('zz0044-giro-polleria', 'giro',      'Pollería 0044'),
  ('zz0044-giro-cremeria', 'giro',      'Cremería 0044'),
  ('zz0044-cat-huevo',     'categoria', 'Huevo 0044');

insert into catalogo.family (code, name, default_lifespan_days) values
  ('zz0044-pollo', 'Pollo 0044', 3),
  ('zz0044-huevo', 'Huevo 0044', null),
  ('zz0044-queso', 'Queso 0044', 10);

-- Pechuga and Pierna: Pollería only. Huevo blanco: BOTH giros — the overlap.
-- Queso fresco: Cremería only, 16% IVA so the copy of tax_rate is visible.
insert into catalogo.product (code, family_code, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, pack_size, tax_rate,
       display_order) values
  ('zz0044-pechuga',     'zz0044-pollo', 'Pechuga 0044',     'g',   'kg',  'g',   'kg',  1,   0,      1),
  ('zz0044-pierna',      'zz0044-pollo', 'Pierna 0044',      'g',   'kg',  'g',   'kg',  1,   0,      2),
  ('zz0044-huevo-blanco','zz0044-huevo', 'Huevo blanco 0044','pza', 'pza', 'pza', 'pza', 360, 0,      3),
  ('zz0044-queso-fresco','zz0044-queso', 'Queso fresco 0044','g',   'kg',  'g',   'kg',  1,   0.1600, 4);

insert into catalogo.product_tag (product_code, tag_code) values
  ('zz0044-pechuga',      'zz0044-giro-polleria'),
  ('zz0044-pierna',       'zz0044-giro-polleria'),
  ('zz0044-huevo-blanco', 'zz0044-giro-polleria'),
  ('zz0044-huevo-blanco', 'zz0044-giro-cremeria'),
  ('zz0044-huevo-blanco', 'zz0044-cat-huevo'),
  ('zz0044-queso-fresco', 'zz0044-giro-cremeria');

-- ----------------------------------------------------------------------------
-- 1. The template is closed to every client role
-- ----------------------------------------------------------------------------
select public.chk('1.1 authenticated has no USAGE on schema catalogo',
  not has_schema_privilege('authenticated', 'catalogo', 'usage'));
select public.chk('1.2 nor does anon',
  not has_schema_privilege('anon', 'catalogo', 'usage'));
select public.chk('1.3 and no client role holds any privilege on its four tables',
  (select count(*) from information_schema.role_table_grants
    where table_schema = 'catalogo'
      and grantee in ('anon', 'authenticated', 'PUBLIC')) = 0);

select public.chk('1.5 both doors are security definer with search_path pinned empty',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('catalog_template', 'import_catalog')
      and p.prosecdef and p.proconfig @> array['search_path=""']) = 2);
select public.chk('1.6 authenticated may execute both, anon neither',
  has_function_privilege('authenticated', 'public.catalog_template()', 'execute')
  and has_function_privilege('authenticated', 'public.import_catalog(uuid, text[], text[])', 'execute')
  and not has_function_privilege('anon', 'public.catalog_template()', 'execute')
  and not has_function_privilege('anon', 'public.import_catalog(uuid, text[], text[])', 'execute'));

select public.chk('1.7 product_variant.template_code exists, is text and nullable',
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variant'
      and column_name = 'template_code' and data_type = 'text' and is_nullable = 'YES') = 1);

-- ----------------------------------------------------------------------------
-- 2. The template refuses what would break a shop that imports it
-- ----------------------------------------------------------------------------
select public.chk('2.1 C8.5 — a count product in a mass family is refused (23514)',
  public._try($q$insert into catalogo.product (code, family_code, name, base_unit_code,
      purchase_unit_code, sell_unit_code, price_unit_code)
      values ('zz0044-pollo-pza', 'zz0044-pollo', 'Pollo por pieza 0044', 'pza','pza','pza','pza')$q$)
    = '23514');
select public.chk('2.2 a base unit that is not a base (kg) is refused (23514)',
  public._try($q$insert into catalogo.product (code, family_code, name, base_unit_code,
      purchase_unit_code, sell_unit_code, price_unit_code)
      values ('zz0044-muslo', 'zz0044-pollo', 'Muslo 0044', 'kg','kg','kg','kg')$q$)
    = '23514');
select public.chk('2.3 units across two dimensions in one product are refused — the shop''s own trigger (23514)',
  public._try($q$insert into catalogo.product (code, family_code, name, base_unit_code,
      purchase_unit_code, sell_unit_code, price_unit_code)
      values ('zz0044-ala', 'zz0044-pollo', 'Ala 0044', 'g','pza','g','kg')$q$)
    = '23514');
select public.chk('2.4 a code that is not a slug is refused (23514)',
  public._try($q$insert into catalogo.tag (code, kind, label) values ('zz0044 Mal', 'giro', 'x')$q$)
    = '23514');
select public.chk('2.5 a tag kind that is neither giro nor categoria is refused (23514)',
  public._try($q$insert into catalogo.tag (code, kind, label) values ('zz0044-x', 'marca', 'x')$q$)
    = '23514');
select public.chk('2.6 a second product of the same normalized name is refused (23505)',
  public._try($q$insert into catalogo.product (code, family_code, name, base_unit_code,
      purchase_unit_code, sell_unit_code, price_unit_code)
      values ('zz0044-pechuga-2', 'zz0044-pollo', '  pechuga   0044 ', 'g','kg','g','kg')$q$)
    = '23505');

-- ----------------------------------------------------------------------------
-- Two shops, an owner and a cashier in A, an owner in B
-- ----------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('0c0c0c0c-0044-4000-8000-000000000001', 'owner.a.0044@example.mx'),
  ('0c0c0c0c-0044-4000-8000-000000000002', 'cashier.a.0044@example.mx'),
  ('0c0c0c0c-0044-4000-8000-000000000003', 'owner.b.0044@example.mx');

\set owner_a  '''0c0c0c0c-0044-4000-8000-000000000001'''
\set cashier  '''0c0c0c0c-0044-4000-8000-000000000002'''

select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0044-4000-8000-000000000001","role":"authenticated"}', false);
select onboard_workspace('Tienda A 0044') as ws \gset
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0044-4000-8000-000000000003","role":"authenticated"}', false);
select onboard_workspace('Tienda B 0044') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc from location where workspace_id = :'ws' \gset
insert into workspace_member (workspace_id, user_id, role) values (:'ws', :cashier, 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws', wm.id, :'loc' from workspace_member wm where wm.user_id = :cashier;

-- ⚠️ THE SHOP'S OWN ROWS THE IMPORT MUST LEAVE ALONE. He already sells *Pierna
-- 0044* under a family of his own — the name collision. And he has a *Queso 0044*
-- family holding a PIECE product — the dimension collision, C8.5.
insert into product_family (workspace_id, name, is_prebuilt) values
  (:'ws', 'Mi pollo 0044', false),
  (:'ws', 'Queso 0044',    false);
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, is_prebuilt)
select :'ws', id, 'Pierna 0044', 'g','kg','g','kg', false
  from product_family where workspace_id = :'ws' and name = 'Mi pollo 0044';
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, is_prebuilt)
select :'ws', id, 'Queso en bola 0044', 'pza','pza','pza','pza', false
  from product_family where workspace_id = :'ws' and name = 'Queso 0044';

-- ----------------------------------------------------------------------------
-- 3. catalog_template() — read as a signed-in person
-- ----------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0044-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select public.catalog_template() as tpl \gset

select public.chk('3.1 the read carries the fixture''s three tags',
  (select count(*) from jsonb_array_elements((:'tpl')::jsonb -> 'tags') t
    where t ->> 'code' like 'zz0044-%') = 3);
select public.chk('3.2 the overlap product carries all three of its tags',
  (select p -> 'tags' from jsonb_array_elements((:'tpl')::jsonb -> 'products') p
    where p ->> 'code' = 'zz0044-huevo-blanco')
  = '["zz0044-cat-huevo", "zz0044-giro-cremeria", "zz0044-giro-polleria"]'::jsonb,
  coalesce((select (p -> 'tags')::text from jsonb_array_elements((:'tpl')::jsonb -> 'products') p
             where p ->> 'code' = 'zz0044-huevo-blanco'), '(missing)'));
select public.chk('3.3 numbers cross as TEXT — tax_rate "0.1600", pack_size "360.000"',
  (select jsonb_typeof(p -> 'tax_rate') = 'string' and p ->> 'tax_rate' = '0.1600'
     from jsonb_array_elements((:'tpl')::jsonb -> 'products') p
    where p ->> 'code' = 'zz0044-queso-fresco')
  and (select p ->> 'pack_size' = '360.000'
     from jsonb_array_elements((:'tpl')::jsonb -> 'products') p
    where p ->> 'code' = 'zz0044-huevo-blanco'));
select public.chk('3.4 and the table itself is still out of reach from inside the role (42501)',
  public._try('select 1 from catalogo.product limit 1') = '42501',
  public._try('select 1 from catalogo.product limit 1'));
commit;

-- ----------------------------------------------------------------------------
-- 4. ⚠️⚠️ import_catalog() — THE FILE
-- ----------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0044-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- Pollería: Pechuga, Pierna, Huevo blanco. Pierna is HIS already → skipped.
select public.import_catalog(:'ws', array['zz0044-giro-polleria']) as r1 \gset
select public.chk('4.1 Pollería imports two and skips one — his own Pierna',
  (:'r1')::jsonb = '{"imported": 2, "skipped": 1}'::jsonb, :'r1');

select public.chk('4.2 his Pierna is untouched — still his, still in his family, no template_code',
  (select not v.is_prebuilt and v.template_code is null and f.name = 'Mi pollo 0044'
     from product_variant v join product_family f on f.id = v.family_id
    where v.workspace_id = :'ws' and v.name = 'Pierna 0044'));

select public.chk('4.3 Pechuga landed prebuilt, with its code, its units and IVA 0',
  (select v.is_prebuilt and v.template_code = 'zz0044-pechuga'
          and v.base_unit_code = 'g' and v.purchase_unit_code = 'kg'
          and v.price_unit_code = 'kg' and v.tax_rate = 0 and v.is_active
     from product_variant v where v.workspace_id = :'ws' and v.name = 'Pechuga 0044'));
select public.chk('4.4 under a NEW prebuilt family carrying the template''s lifespan',
  (select f.is_prebuilt and f.default_lifespan_days = 3
     from product_family f where f.workspace_id = :'ws' and f.name = 'Pollo 0044'));
select public.chk('4.5 the case of 360 kept its pack size',
  (select pack_size = 360 from product_variant
    where workspace_id = :'ws' and template_code = 'zz0044-huevo-blanco'));
select public.chk('4.6 no price was written — an imported product is sin precio',
  (select count(*) from price_list pl join product_variant v on v.id = pl.variant_id
    where v.workspace_id = :'ws' and v.template_code like 'zz0044-%') = 0);

-- Again: nothing new.
select public.import_catalog(:'ws', array['zz0044-giro-polleria']) as r2 \gset
select public.chk('4.7 a second Pollería import imports NOTHING',
  (:'r2')::jsonb = '{"imported": 0, "skipped": 3}'::jsonb, :'r2');

-- Cremería: Huevo blanco (already in, the overlap) and Queso fresco, whose
-- family name meets HIS Queso family of pieces → C8.5 → skipped.
select public.import_catalog(:'ws', array['zz0044-giro-cremeria']) as r3 \gset
select public.chk('4.8 Cremería imports nothing: the overlap is already in, the queso meets his piece family',
  (:'r3')::jsonb = '{"imported": 0, "skipped": 2}'::jsonb, :'r3');
select public.chk('4.9 Huevo blanco is in the shop exactly ONCE',
  (select count(*) from product_variant
    where workspace_id = :'ws' and template_code = 'zz0044-huevo-blanco') = 1);
select public.chk('4.10 and his Queso family still holds only his piece product',
  (select count(*) from product_variant v join product_family f on f.id = v.family_id
    where v.workspace_id = :'ws' and f.name = 'Queso 0044') = 1);

select public.chk('4.11 an unknown tag is refused out loud (23514), not read as an empty giro',
  public._try(format('select public.import_catalog(%L, array[%L])', :'ws', 'zz0044-giro-nada')) = '23514');
select public.chk('4.12 no tags at all is refused (23514)',
  public._try(format('select public.import_catalog(%L, %L::text[])', :'ws', '{}')) = '23514');
select public.chk('4.13 a shop he is not a member of is refused (42501)',
  public._try(format('select public.import_catalog(%L, array[%L])', :'ws_b', 'zz0044-giro-polleria')) = '42501');
commit;

-- p_exclude, in the second shop: Pollería without Pierna.
begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0044-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select public.import_catalog(:'ws_b', array['zz0044-giro-polleria'], array['zz0044-pierna']) as r4 \gset
select public.chk('4.14 an exclusion is respected — B gets two, and no Pierna',
  (:'r4')::jsonb = '{"imported": 2, "skipped": 0}'::jsonb
  and not exists (select 1 from product_variant
                   where workspace_id = :'ws_b' and template_code = 'zz0044-pierna'), :'r4');
commit;

-- The cashier.
begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0044-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select public.chk('4.15 a cashier cannot import (42501)',
  public._try(format('select public.import_catalog(%L, array[%L])', :'ws', 'zz0044-giro-cremeria')) = '42501');
select public.chk('4.16 but she can read the template — the picker is drawn for anyone signed in',
  public._try('select public.catalog_template()') = 'ok');
commit;

reset role;
select set_config('request.jwt.claims', null, false);

select public.chk('4.17 B''s import put nothing in A, and A''s nothing in B',
  (select count(*) from product_variant where workspace_id = :'ws'   and template_code like 'zz0044-%') = 2
  and (select count(*) from product_variant where workspace_id = :'ws_b' and template_code like 'zz0044-%') = 2);

-- ----------------------------------------------------------------------------
-- 5. template_code is set once
-- ----------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0044-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.chk('5.1 re-pointing an imported product at another template row is refused (23001)',
  public._try(format('update public.product_variant set template_code = %L where workspace_id = %L and template_code = %L',
                     'zz0044-pierna', :'ws', 'zz0044-pechuga')) = '23001');
select public.chk('5.2 the imported product can still be RENAMED — the reason to import one',
  public._try(format('update public.product_variant set name = %L where workspace_id = %L and template_code = %L',
                     'Pechuga sin hueso 0044', :'ws', 'zz0044-pechuga')) = 'ok');
select public.chk('5.3 and, being prebuilt, still cannot be retired — 0042''s fence holds for an import (23001)',
  public._try(format('update public.product_variant set is_active = false where workspace_id = %L and template_code = %L',
                     :'ws', 'zz0044-pechuga')) = '23001');
commit;

reset role;
select set_config('request.jwt.claims', null, false);

-- ----------------------------------------------------------------------------
-- The fixture template goes; the shops go with _cleanup.sql
-- ----------------------------------------------------------------------------
delete from catalogo.product_tag where product_code like 'zz0044-%';
delete from catalogo.product     where code like 'zz0044-%';
delete from catalogo.family      where code like 'zz0044-%';
delete from catalogo.tag         where code like 'zz0044-%';

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
