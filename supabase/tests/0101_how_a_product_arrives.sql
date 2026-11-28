-- ============================================================================
-- 0101, 0102 and 0103 — how a product arrives (`14.5`; the owner's call 10 of
-- 2026-11-27, Step 14): a pack's word beside what one holds, the starter
-- catalog's best guesses, and the shops already open taking them.
--
-- Section 1 the shape: `pack_word` on both tables, eight words and nothing else,
-- a pack still holds more than nothing. Section 2 the template (`0102`): the
-- guesses the plan's table gives, and no figure for what it calls *hers to count*.
-- Section 3 Wera's door and the import, as the owner of a new shop. Section 4
-- `0103`'s rule, against a shop opened before `0101`. Section 5 who may change a
-- pack: the owner and a manager, never the cashier (an UPDATE refusal is a 200
-- with no rows, so it is read back).
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK. ⚠️ Section 4 runs `0103`'s statement again,
-- WORD FOR WORD: on a new database that migration finds no shop, so the rule can
-- only be seen by replaying it over a shop made here. Keep the two one statement.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

begin;

-- ⚠️ inside the transaction: a leftover from another suite comes back on rollback.
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

-- ---- 1. the shape ------------------------------------------------------------------------
select public.chk('1.1 product_variant.pack_word is text and nullable',
  (select data_type = 'text' and is_nullable = 'YES' from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variant' and column_name = 'pack_word'));
select public.chk('1.2 catalogo.product.pack_word is text and nullable',
  (select data_type = 'text' and is_nullable = 'YES' from information_schema.columns
    where table_schema = 'catalogo' and table_name = 'product' and column_name = 'pack_word'));

select public._try($$update catalogo.product set pack_word = 'Caja' where code = 'jitomate-saladet'$$) as cap \gset
select public._try($$update catalogo.product set pack_word = 'saco' where code = 'jitomate-saladet'$$) as saco \gset
select public._try($$update catalogo.product set pack_word = '' where code = 'jitomate-saladet'$$) as blank \gset
select public.chk('1.3 a word outside the eight is refused (23514): a capital, another word, a blank',
  :'cap' = '23514' and :'saco' = '23514' and :'blank' = '23514', :'cap' || ' ' || :'saco' || ' ' || :'blank');
select public.chk('1.4 each of the eight is taken',
  (select bool_and(public._try(format('update catalogo.product set pack_word = %L where code = %L', w, 'jitomate-saladet')) = 'ok')
     from unnest(array['caja', 'arpilla', 'costal', 'bulto', 'reja', 'docena', 'paquete', 'manojo_grande']) as w));
update catalogo.product set pack_word = 'caja' where code = 'jitomate-saladet';
select public._try($$update catalogo.product set pack_size = 0 where code = 'jitomate-saladet'$$) as zero \gset
select public.chk('1.5 a pack still holds more than nothing (pack_size > 0, 23514)', :'zero' = '23514', :'zero');

-- ---- 2. the template's guesses (`0102`) ---------------------------------------------------
create temp view _t as select code, pack_word, pack_size from catalogo.product;
select public.chk('2.1 jitomate saladet: a caja of ~13 kg; papa blanca: an arpilla of ~50',
  (select pack_word = 'caja' and pack_size = 13 from _t where code = 'jitomate-saladet')
  and (select pack_word = 'arpilla' and pack_size = 50 from _t where code = 'papa-blanca'));
select public.chk('2.2 lechuga romana and elote: a docena of 12 pieces',
  (select bool_and(pack_word = 'docena' and pack_size = 12) from _t where code in ('lechuga-romana', 'elote')));
select public.chk('2.3 huevo: a caja of ~21.5 kg (the arithmetic of 360 eggs)',
  (select bool_and(pack_word = 'caja' and pack_size = 21.5) from _t where code in ('huevo-blanco', 'huevo-rojo')));
select public.chk('2.4 no figure for what the plan calls hers to count: cilantro, epazote, perejil, ajo arrive loose',
  (select bool_and(pack_word is null and pack_size = 1) from _t where code in ('cilantro', 'epazote', 'perejil', 'ajo')));
select public.chk('2.5 nor for mango ataúlfo (as printed, too heavy) and pollo (off the note)',
  (select bool_and(pack_word is null and pack_size = 1) from _t where code in ('mango-ataulfo', 'pechuga-entera', 'pollo-entero')));
select public.chk('2.6 23 products carry a pack, and every other one is loose at 1',
  (select count(*) = 23 from _t where pack_word is not null)
  and (select bool_and(pack_size = 1) from _t where pack_word is null),
  (select count(*)::text from _t where pack_word is not null));

-- ---- 3. Wera's door and the import --------------------------------------------------------
insert into auth.users (id, email) values
  ('0c0c0c0c-0101-4000-8000-000000000001', 'owner.0101@example.mx'),
  ('0c0c0c0c-0101-4000-8000-000000000002', 'manager.0101@example.mx'),
  ('0c0c0c0c-0101-4000-8000-000000000003', 'cashier.0101@example.mx');

select set_config('request.jwt.claims', '{"sub":"0c0c0c0c-0101-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.catalog_template() as tpl \gset
select public.onboard_workspace('Recaudería 0101') as ws \gset
select public.import_catalog(:'ws', array['giro-verduleria']) as imp \gset
reset role;

select public.chk('3.1 Wera''s door says the pack: jitomate saladet caja and "13.000"',
  (select p ->> 'pack_word' = 'caja' and p ->> 'pack_size' = '13.000'
     from jsonb_array_elements((:'tpl')::jsonb -> 'products') p where p ->> 'code' = 'jitomate-saladet'));
select public.chk('3.2 and a loose product as a JSON null, not missing: cilantro',
  (select p ? 'pack_word' and jsonb_typeof(p -> 'pack_word') = 'null'
     from jsonb_array_elements((:'tpl')::jsonb -> 'products') p where p ->> 'code' = 'cilantro'));

create temp view _v as
select template_code, pack_word, pack_size from public.product_variant where workspace_id = :'ws';
select public.chk('3.3 the import copies word and size: tomate verde an arpilla of 30, lechuga a docena of 12',
  (select pack_word = 'arpilla' and pack_size = 30 from _v where template_code = 'tomate-verde')
  and (select pack_word = 'docena' and pack_size = 12 from _v where template_code = 'lechuga-romana'), :'imp');
select public.chk('3.4 and a loose one loose: cilantro no word, 1',
  (select pack_word is null and pack_size = 1 from _v where template_code = 'cilantro'));
select public.chk('3.5 every product imported holds its template''s pack, exactly',
  (select count(*) > 0 and bool_and(v.pack_word is not distinct from t.pack_word and v.pack_size = t.pack_size)
     from _v v join _t t on t.code = v.template_code));

-- ---- 4. `0103`: a shop opened before `0101` ----------------------------------------------
-- As the import left it before `0101`: no word, size 1 — then four rows a person touched.
update public.product_variant set pack_word = null, pack_size = 1 where workspace_id = :'ws';
update public.product_variant set pack_size = 60
 where workspace_id = :'ws' and template_code = 'chayote';                      -- *Piezas por paquete*, 2026-10
update public.product_variant set pack_word = 'costal', pack_size = 40
 where workspace_id = :'ws' and template_code = 'cebolla-blanca';               -- set on its page
insert into public.product_family (workspace_id, name, is_prebuilt) values (:'ws', 'Lo mío 0101', false);
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, is_prebuilt)
select :'ws', id, 'Jitomate de la milpa 0101', 'g', 'kg', 'kg', 'kg', false
  from public.product_family where workspace_id = :'ws' and name = 'Lo mío 0101';

-- ⚠️ `0103`'s statement, WORD FOR WORD (the header says why).
update public.product_variant v
   set pack_word = p.pack_word,
       pack_size = p.pack_size
  from catalogo.product p
 where v.template_code = p.code
   and p.pack_word is not null
   and v.pack_word is null
   and v.pack_size = 1;

select public.chk('4.1 an untouched product takes its template''s pack: jitomate saladet a caja of 13',
  (select pack_word = 'caja' and pack_size = 13 from _v where template_code = 'jitomate-saladet'));
select public.chk('4.2 a size a person typed is kept, and gets no word: chayote 60, no caja',
  (select pack_word is null and pack_size = 60 from _v where template_code = 'chayote'));
select public.chk('4.3 a pack set on its page is kept: cebolla blanca a costal of 40',
  (select pack_word = 'costal' and pack_size = 40 from _v where template_code = 'cebolla-blanca'));
select public.chk('4.4 the shop''s own product is never matched',
  (select pack_word is null and pack_size = 1 from public.product_variant
    where workspace_id = :'ws' and name = 'Jitomate de la milpa 0101'));
select public.chk('4.5 a loose template leaves its products loose: cilantro',
  (select pack_word is null and pack_size = 1 from _v where template_code = 'cilantro'));

with again as (
  update public.product_variant v
     set pack_word = p.pack_word,
         pack_size = p.pack_size
    from catalogo.product p
   where v.template_code = p.code
     and p.pack_word is not null
     and v.pack_word is null
     and v.pack_size = 1
  returning 1)
select count(*) as again from again \gset
select public.chk('4.6 a second run writes nothing', :'again' = '0', :'again');

-- ---- 5. who may change a pack -------------------------------------------------------------
insert into public.workspace_member (workspace_id, user_id, role) values
  (:'ws', '0c0c0c0c-0101-4000-8000-000000000002', 'manager'),
  (:'ws', '0c0c0c0c-0101-4000-8000-000000000003', 'staff');

select set_config('request.jwt.claims', '{"sub":"0c0c0c0c-0101-4000-8000-000000000003","role":"authenticated"}', true);
set local role authenticated;
with hit as (
  update public.product_variant set pack_word = 'bulto', pack_size = 99
   where workspace_id = :'ws' and template_code = 'papa-blanca' returning 1)
select count(*) as cashier from hit \gset
reset role;
select public.chk('5.1 the cashier changes no pack: 0 rows, papa blanca still an arpilla of 50',
  :'cashier' = '0'
  and (select pack_word = 'arpilla' and pack_size = 50 from _v where template_code = 'papa-blanca'), :'cashier');

select set_config('request.jwt.claims', '{"sub":"0c0c0c0c-0101-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
with hit as (
  update public.product_variant set pack_word = 'costal', pack_size = 45
   where workspace_id = :'ws' and template_code = 'papa-blanca' returning 1)
select count(*) as manager from hit \gset
reset role;
select public.chk('5.2 a manager does: papa blanca a costal of 45, on a product from Wera''s catalog',
  :'manager' = '1'
  and (select pack_word = 'costal' and pack_size = 45 from _v where template_code = 'papa-blanca'), :'manager');

select set_config('request.jwt.claims', '{"sub":"0c0c0c0c-0101-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
with hit as (
  update public.product_variant set pack_word = null, pack_size = 1
   where workspace_id = :'ws' and template_code = 'papa-blanca' returning 1)
select count(*) as owner_loose from hit \gset
reset role;
select public.chk('5.3 the owner may make it loose again: no word, 1',
  :'owner_loose' = '1'
  and (select pack_word is null and pack_size = 1 from _v where template_code = 'papa-blanca'), :'owner_loose');

-- ---- the report ------------------------------------------------------------------------
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 25 then
    raise exception 'expected 25 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
