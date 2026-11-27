-- ============================================================================
-- 0100 — the counter counts sales: how many times each product sold, each day
-- ============================================================================
-- docs/PLAN.md task `14.2` — Step 14, *La vitrina*. The owner's ruling of
-- 2026-11-27, call 7 on https://claude.ai/artifact/Q2P7djctMGK1VrmiigskEa:
-- **"most sold" counts sales, not pesos.** Vender's tiles come in the order the
-- shop sells them — four weeks, set once a day on the phone — and an order by
-- pesos puts cilantro (13 sales a day at $8) behind every cut of chicken.
--
-- WHAT IS HERE: `daily_sales` (`0095`, planned per call since `0096`) gains one
-- key in each element of its answer, `times_sold` — how many sales carried the
-- product that day at that store, **a void taking its sale back**: the lines of
-- the day's sales, less the lines of the voids that undo them. A sale counts 1;
-- a sale and its void, 0; a sale corrected (`Corregir`: its void and the new
-- sale) counts 1, as it was one sale. A JSON number, a whole one.
--
-- ⚠️ WHY A NEW NAME AND NOT `line_count`, WHICH THE PLAN'S ROW NAMED. The view's
-- `line_count` (`0009` onward, kept by `0095`) counts every line, a void's
-- included: a sale and its void are `line_count` 2 and `qty_base_sold` 0 — on
-- purpose, `0013` says, so "sold and taken back" is a row and not an absence.
-- That is the right count for *was anything traded*, and the wrong one for
-- *what sells most*: a product voided often would climb the counter. One name
-- for two counts is the two-homes defect, so the netted count gets its own.
--
-- ⚠️ THE FIELD RULE (ADR-035 §2.2): `create or replace` with `0096`'s
-- arguments, their names, its return type and its settings — no build in the
-- field can tell, and every one of them reads its eight keys by name and passes
-- over a ninth (`salesFrom`, `app/src/api/sales.ts`). The grants are kept, and
-- re-issued below so the fence is written where it is read. Nothing removed.
--
-- ⚠️ THE ROWS ARE `0096`'s, UNCHANGED: still exactly `product_velocity_daily`'s
-- with `line_count > 0`, which `supabase/tests/0095_sales_in_one_answer.sql`
-- holds to the cent. So a day whose only lines are a sale and its void is still
-- a row — with `times_sold` 0, which is the point.
-- ============================================================================

create or replace function public.daily_sales(p_workspace_id uuid, p_since date)
returns json
language plpgsql
stable
security invoker
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
begin
  return (
    select coalesce(
             json_agg(json_build_object(
                 'day',            d.day,
                 'variant_id',     d.variant_id,
                 'variant_name',   v.name,
                 'family_id',      v.family_id,
                 'family_name',    f.name,
                 'base_unit_code', v.base_unit_code,
                 'qty_base_sold',  d.qty_base_sold::text,
                 'revenue_gross',  (d.revenue_net + d.tax_collected)::text,
                 'times_sold',     d.times_sold)
               order by d.day desc, d.variant_id, d.location_id),
             '[]'::json)
      from (
        select sl.workspace_id,
               sl.location_id,
               sl.variant_id,
               (coalesce(o.occurred_at, s.occurred_at) at time zone l.timezone)::date as day,
               sum(sl.qty_base)   as qty_base_sold,
               sum(sl.line_net)   as revenue_net,
               sum(sl.tax_amount) as tax_collected,
               count(*) filter (where s.reversal_of is null)
                 - count(*) filter (where s.reversal_of is not null) as times_sold
          from public.sale_line sl
          join public.sale s
            on  s.id           = sl.sale_id
            and s.workspace_id = sl.workspace_id
            and s.location_id  = sl.location_id
          left join public.sale o
            on  o.id           = s.reversal_of
            and o.workspace_id = s.workspace_id
          join public.location l
            on  l.id           = sl.location_id
            and l.workspace_id = sl.workspace_id
         where sl.workspace_id = p_workspace_id
           and (coalesce(o.occurred_at, s.occurred_at) at time zone l.timezone)::date >= p_since
         group by 1, 2, 3, 4
      ) d
      join public.product_variant v
        on  v.id           = d.variant_id
        and v.workspace_id = d.workspace_id
      join public.product_family f
        on  f.id           = v.family_id
        and f.workspace_id = v.workspace_id
  );
end;
$$;

comment on function public.daily_sales(uuid, date) is
  'Every product''s sales per store per day since p_since, in one shop, as ONE json '
  'array — Wera''s Números, Inicio, the product card and Vender''s order read it (plan '
  '12.2, 0095; planned per call since 0096; times_sold since 0100). Each element carries '
  'day (the store''s own date; a void on the day of the sale it undoes, 0064), '
  'variant_id, variant_name, family_id, family_name, base_unit_code, qty_base_sold and '
  'revenue_gross as decimal TEXT (gross of IVA, §2.9, voids netted), and times_sold, a '
  'JSON number: the day''s sale lines less its voids'' lines (a sale and its void are 0; '
  'never the view''s line_count, which counts both). Exactly the rows '
  'product_velocity_daily has with line_count > 0, its figures spelled the same way; '
  'supabase/tests/0095_sales_in_one_answer.sql holds the two equal to the cent. '
  'Newest day first, then variant_id, then location_id. One value, so PostgREST''s '
  'max_rows never truncates it. security invoker: a cashier reads her own stores'' '
  'sales by sale_line_select, nobody another shop''s. ⚠️ plan_cache_mode = '
  'force_custom_plan is load-bearing: a plan made without the shop''s id took 80 s '
  'on the hosted project (0096). An unknown or foreign shop, or a NULL argument, is '
  'an empty array.';

revoke all on function public.daily_sales(uuid, date) from public, anon;
grant execute on function public.daily_sales(uuid, date) to authenticated;
