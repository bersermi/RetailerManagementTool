-- ============================================================================
-- Behavioural verification for 0065 — the default catalog keeps what has a
-- photo. The owner's ruling of 2026-10-20.
--
--   1. products he gave no photo are gone — a sample from four aisles
--   2. Pétalo (a downloaded name) and three AVIF photos with no extension stay
--   3. no family is left empty (a tag cannot outlive its product: `on delete cascade`)
-- ⚠️ The catalog's size and the three aisles are `0066`'s suite since that day.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

-- ⚠️ `0066` (the same day) took the three aisles out as well, so the catalog's
-- size and those aisles are asserted by `0066`'s suite; this one keeps what
-- `0065` decided and nothing later undid.
select public.chk('1.1 products he gave no photo are gone (Limpieza, Lácteos, Carnes frías, Desechables)',
  not exists (select 1 from catalogo.product
               where code in ('flash', 'esponja', 'danonino-platano', 'mortadela-zwan',
                              'vasito-gelatinero-1-oz-paquete')));

select public.chk('1.2 Pétalo and the three AVIF photos saved with no extension stay',
  (select count(*) from catalogo.product
    where code in ('papel-higienico-petalo', 'atun-dolores-con-verduras',
                   'tostadas-charras', 'jamon-de-pierna')) = 4);

select public.chk('1.3 no family is left empty',
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
  if (select count(*) from public._verify) <> 3 then
    raise exception 'expected 3 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
