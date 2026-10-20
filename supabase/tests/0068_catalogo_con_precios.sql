-- ============================================================================
-- Behavioural verification for 0068 — the default catalog with the owner's
-- prices (his list of 2026-10-20, edited by him the next morning).
--
--   1. every one of the 1,161 products has a suggested price, none of them zero
--   2. a sample read against his list: a kilo, a piece, a bunch, a litre — and
--      one of the nine bulk prices he lowered himself
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

select public.chk('1.1 every product in the catalog has a suggested price above zero',
  (select count(*) from catalogo.product where suggested_price is null or suggested_price <= 0) = 0
  and (select count(*) from catalogo.product) = 1161);

select public.chk('2.1 his own edit: Arroz a granel is $18 the kilo (was 25 in the research)',
  (select suggested_price = 18 from catalogo.product where code = 'arroz-a-granel'));
select public.chk('2.2 a piece: Coca-Cola 600 ml at $20',
  (select suggested_price = 20 from catalogo.product where code = 'coca-cola-600-ml'));
select public.chk('2.3 a kilo: Huevo blanco at $38, per its price unit (kg)',
  (select suggested_price = 38 and price_unit_code = 'kg' from catalogo.product where code = 'huevo-blanco'));
select public.chk('2.4 a bunch and a litre: Cilantro $8 the manojo, Crema $80 the litro',
  (select suggested_price = 8 from catalogo.product where code = 'cilantro')
  and (select suggested_price = 80 from catalogo.product where code = 'crema'));

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 5 then
    raise exception 'expected 5 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
