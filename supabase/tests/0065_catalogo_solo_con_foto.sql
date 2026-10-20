-- ============================================================================
-- Behavioural verification for 0065 — the default catalog keeps what has a
-- photo. The owner's ruling of 2026-10-20.
--
--   1. the catalog is 1,413 less 115: 1,298 products
--   2. products he gave no photo are gone — a sample from four aisles
--   3. ⚠️ the three aisles he left for later keep every product: alcohol 120,
--      tobacco 7, pets 10 — the two loose croquetas among them
--   4. Pétalo (a downloaded name) and three AVIF photos with no extension stay
--   5. no family is left empty (a tag cannot outlive its product: `on delete cascade`)
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

select public.chk('1.1 the catalog holds 1,298 products — 1,413 less the 115 with no photo',
  (select count(*) from catalogo.product) = 1298,
  (select count(*)::text from catalogo.product));

select public.chk('1.2 products he gave no photo are gone (Limpieza, Lácteos, Carnes frías, Desechables)',
  not exists (select 1 from catalogo.product
               where code in ('flash', 'esponja', 'danonino-platano', 'mortadela-zwan',
                              'vasito-gelatinero-1-oz-paquete')));

select public.chk('1.3 ⚠️ the aisles he left for later keep every product: alcohol 120, tobacco 7, pets 10',
  (select count(*) from catalogo.product_tag where tag_code = 'cat-alcohol') = 120
  and (select count(*) from catalogo.product_tag where tag_code = 'cat-tabaco') = 7
  and (select count(*) from catalogo.product_tag where tag_code = 'cat-mascotas') = 10,
  (select string_agg(tag_code || ' ' || n, ', ' order by tag_code)
     from (select tag_code, count(*) n from catalogo.product_tag
            where tag_code in ('cat-alcohol', 'cat-tabaco', 'cat-mascotas') group by 1) t));

select public.chk('1.3b …the loose croquetas among them, though his folders file them under A granel',
  (select count(*) from catalogo.product
    where code in ('croquetas-para-perro-a-granel', 'croquetas-para-gato-a-granel')) = 2);

select public.chk('1.4 Pétalo and the three AVIF photos saved with no extension stay',
  (select count(*) from catalogo.product
    where code in ('papel-higienico-petalo', 'atun-dolores-con-verduras',
                   'tostadas-charras', 'jamon-de-pierna')) = 4);

select public.chk('1.5 no family is left empty',
  not exists (select 1 from catalogo.family f
               where not exists (select 1 from catalogo.product p where p.family_code = f.code)));

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 6 then
    raise exception 'expected 6 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
