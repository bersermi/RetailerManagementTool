-- ============================================================================
-- 0096 — Números' sales planned for the shop that asks, every call
-- ============================================================================
-- docs/PLAN.md task `12.2`, fixing `0095` forward. Found on the hosted project
-- the hour `0095` was deployed, before any phone called it.
--
-- WHAT WAS MEASURED (hosted, as the demo shop's owner under `authenticated`
-- through RLS, rolled back): `0095`'s `daily_sales` took **80.5–81.1 s** a
-- call, three runs, where the same statement with the shop and the day written
-- in took 0.63 s. A `language sql` function that is not inlined plans its
-- statement with its arguments UNKNOWN (Postgres 17): a generic plan, which
-- sizes "one shop" as the average of every business on the project — 1,611 sale
-- lines, most of them tiny — and so joins the shop's 51,468 sale lines to its
-- 17,408 sales in a nested loop, about 900 million comparisons. The local copies
-- held a few large shops, so their average was large and their plan good: only
-- the hosted project showed it.
--
-- THE FIX: the same signature, the same answer and the same statement, in
-- PL/pgSQL with `plan_cache_mode = force_custom_plan`, so every call plans with
-- the shop and the day it was handed. ⚠️ `auto` IS NOT ENOUGH: PL/pgSQL plans
-- the first five calls on a connection with the values and may then keep a
-- generic plan when it LOOKS cheaper — and here it does (estimated 768 against
-- 1,326 for the plan with the values), so on PostgREST's pooled connections the
-- sixth call would take the 80-second plan. Measured the same way: the
-- statement as PL/pgSQL with custom plans, seven calls in one session, 0.26–0.38
-- s each, 8,599 rows.
--
-- ⚠️ `create or replace`: the arguments, their names and the return type are
-- `0095`'s, so no build in the field can tell (none calls it yet: Wera's update
-- waits for this), and the grants are kept — re-issued below anyway, so the
-- fence is written where it is read. `supabase/tests/0095_sales_in_one_answer.sql`
-- holds the setting (1.2) as well as the answer.
--
-- NOT THE VIEW: `product_velocity_daily` as PostgREST pages it, forced onto a
-- generic plan the same way, answered page 1 in 1.7 s — the phones that still
-- page it are safe.
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
                 'revenue_gross',  (d.revenue_net + d.tax_collected)::text)
               order by d.day desc, d.variant_id, d.location_id),
             '[]'::json)
      from (
        select sl.workspace_id,
               sl.location_id,
               sl.variant_id,
               (coalesce(o.occurred_at, s.occurred_at) at time zone l.timezone)::date as day,
               sum(sl.qty_base)   as qty_base_sold,
               sum(sl.line_net)   as revenue_net,
               sum(sl.tax_amount) as tax_collected
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
  'array — Wera''s Números, Inicio and the product card read it (plan 12.2, 0095; '
  'planned per call since 0096). Each element carries day (the store''s own date; a '
  'void on the day of the sale it undoes, 0064), variant_id, variant_name, family_id, '
  'family_name, base_unit_code, and qty_base_sold and revenue_gross as decimal TEXT '
  '(gross of IVA, §2.9, voids netted). Exactly the rows product_velocity_daily has '
  'with line_count > 0, its figures spelled the same way; '
  'supabase/tests/0095_sales_in_one_answer.sql holds the two equal to the cent. '
  'Newest day first, then variant_id, then location_id. One value, so PostgREST''s '
  'max_rows never truncates it. security invoker: a cashier reads her own stores'' '
  'sales by sale_line_select, nobody another shop''s. ⚠️ plan_cache_mode = '
  'force_custom_plan is load-bearing: a plan made without the shop''s id took 80 s '
  'on the hosted project (0096). An unknown or foreign shop, or a NULL argument, is '
  'an empty array.';

revoke all on function public.daily_sales(uuid, date) from public, anon;
grant execute on function public.daily_sales(uuid, date) to authenticated;
