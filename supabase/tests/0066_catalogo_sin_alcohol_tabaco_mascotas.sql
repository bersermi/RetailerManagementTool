-- ============================================================================
-- Behavioural verification for 0066 — the default catalog without alcohol,
-- tobacco or pets. The owner's ruling of 2026-10-20: *"I'm still seeing
-- Mascotas, Cigarros and Bebidas alcoholicas. I instructed for us to remove
-- them."* (`0065` had read his *"I dodged … for now"* as *photos later*.)
--
--   1. the catalog is the 1,161 products he photographed — nothing else
--   2. no product of the three aisles is left, the loose croquetas included
--   3. the three aisles and their three families are gone with them
--   4. the seven giros are untouched
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

select public.chk('1.1 the catalog holds 1,161 products — the ones he photographed',
  (select count(*) from catalogo.product) = 1161,
  (select count(*)::text from catalogo.product));

select public.chk('1.2 no beer, liquor, cigarette or pet product is left — the loose croquetas included',
  not exists (select 1 from catalogo.product
               where code in ('croquetas-pedigree', 'croquetas-para-perro-a-granel',
                              'croquetas-para-gato-a-granel'))
  and not exists (select 1 from catalogo.product p join catalogo.family f on f.code = p.family_code
                   where f.code in ('alcohol', 'tabaco', 'mascotas')));

select public.chk('1.3 the three aisles and their three families are gone with them',
  not exists (select 1 from catalogo.tag where code in ('cat-alcohol', 'cat-tabaco', 'cat-mascotas'))
  and not exists (select 1 from catalogo.family where code in ('alcohol', 'tabaco', 'mascotas')));

select public.chk('1.4 the seven giros are untouched',
  (select count(*) from catalogo.tag where kind = 'giro') = 7,
  (select count(*)::text from catalogo.tag where kind = 'giro'));

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 4 then
    raise exception 'expected 4 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
