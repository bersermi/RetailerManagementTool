-- ============================================================================
-- 0095 — Números' sales in one answer, and the sales view's join repaired
-- ============================================================================
-- docs/PLAN.md task `12.2` — Step 12, *Optimizations*. The owner's yes of
-- 2026-11-21 16:05 UTC to `12.1`'s option C: *"We will do C, both in 1 sit."*
--
-- WHAT `12.1` MEASURED (its status entry of 15:50 UTC, on the hosted demo shop,
-- as its owner, under `authenticated` through RLS): the database stops a
-- phone's statement at 8 s, and page 1 of Wera's sales read — 500 rows of
-- `product_velocity_daily`, six months, `line_count > 0` — took 16–24 s (17.2
-- and 20.1 s again on 2026-11-21, before this migration). The screen needs 18
-- such pages. About 21 s of each is the view's `daily` step, `spine ⟕ sold`,
-- planned as a merge on `(workspace_id, location_id)` alone with `variant_id`
-- and `day` left as a join filter (103.5 million pairs removed), because the
-- planner expects the spine to be ONE row: the shop filter is pushed into
-- `carried`'s `full outer join` and lands on a `coalesce`, which hides the
-- column from its statistics. And the date filter cannot reach inside the view
-- (the trailing windows need each product's whole history), so every page
-- rebuilds the shop's whole history.
--
-- WHAT IS HERE:
--   1. `product_velocity_daily`, its `carried` step rewritten as `union all`
--      and `min` — the same rows, the same columns, the same figures. Nothing
--      else in the view's text moved. Every build in the field reads the view,
--      so this alone stops the failure for them (page 1 at 1.25 s on hosted,
--      `12.1`'s measure, still 18 pages).
--   2. `public.daily_sales(p_workspace_id, p_since)` — the same rows Wera asked
--      the view for, as ONE json answer: every product's sales per store per
--      day since a date, in the eight keys `app/src/api/sales.ts` reads. Wera
--      asks it once, over the air, after this is deployed (0.29–0.48 s on
--      hosted, `12.1`'s measure of the same statement).
--
-- ⚠️ WHY `carried` IS EQUAL, ROW FOR ROW. The old step was a `full outer join`
-- of each key's first sale day and its first stock day, keeping `least` of the
-- two where both exist and whichever exists otherwise. `union all` of both
-- lists then `min` per key gives the same: one row per key in either list, the
-- earlier day where both, `min` and `least` both ignoring a NULL. The keys are
-- `not null` in `sale_line` and `batch_balance`, so the `full outer join`'s one
-- difference — two NULL keys never match — cannot arise. `12.1` compared the
-- two texts on every column of all 59,022 rows of four local shops, both ways;
-- `12.2` again on the demo's size and on the seed (its status entry), and the
-- suite holds it on its own fixture against `0064`'s text, frozen in it.
--
-- ⚠️ WHY `daily_sales` IS THE VIEW'S ROWS. Wera read the view with
-- `line_count > 0`: exactly the rows `sold` has, since every sold key and day
-- lies on the spine (a key's first day is at most its first sale; the store's
-- last day is at least its last sale). So the function is `sold` itself,
-- restricted to one shop and a first day, with the view's own joins to the
-- product and its family, and its figures spelled as the view spells them —
-- `qty_base_sold`, and `revenue_gross` as `revenue_net + tax_collected` — cast
-- to text as Wera's `SALES_COLUMNS` cast them (`parseDecimal` refuses a JSON
-- number). It drops the view's price columns, which the read never asked for.
-- ⚠️ Two definitions of a day's sales now exist, and
-- `supabase/tests/0095_sales_in_one_answer.sql` holds them equal to the cent.
--
-- ⚠️ WHY ONE `json` VALUE AND NOT A SET OF ROWS. PostgREST caps every set it
-- returns at `max_rows` (1000) and truncates without an error — the reason Wera
-- paged. A function returning ONE value returns one row, so the cap never
-- applies: six months come back whole, and `docs/checks/7a-sales-contract.sh`
-- asks for more rows than the cap to prove it.
--
-- ⚠️ WHO MAY READ IT: `security invoker`, so the policies under it are the
-- view's — `sale_line_select` (`0003`): `my_workspaces()` and `my_locations()`
-- with no `has_role`, so a cashier reads her own stores' sales, as the owner
-- ruled on 2026-09-28, and nobody reads another shop's. Revoked from `public`
-- and `anon`, granted to `authenticated`, named in `_walls.sql`.
--
-- ⚠️ THE FIELD RULE (ADR-035 §2.2): nothing is removed or renamed. The view
-- keeps every column (`create or replace view` refuses otherwise) and every
-- comment; the function is new. A build that still pages the view keeps
-- working, faster.
-- ============================================================================

-- ------------------------------------------------- 1. the view, repaired ----
-- `0064`'s text, with `carried` alone rewritten.
create or replace view public.product_velocity_daily
with (security_invoker = true) as
with sold as (
  select sl.workspace_id,
         sl.location_id,
         sl.variant_id,
         (coalesce(o.occurred_at, s.occurred_at) at time zone l.timezone)::date as day,
         sum(sl.qty_base)   as qty_base_sold,
         sum(sl.line_net)   as revenue_net,
         sum(sl.tax_amount) as tax_collected,
         count(*)           as line_count,
         (array_agg(sl.unit_price_net_per_base
                    order by coalesce(o.occurred_at, s.occurred_at) desc,
                             sl.created_at desc, sl.id desc))[1]
           as price_last_net,
         (array_agg(sl.unit_price_net_per_base * (1 + sl.tax_rate)
                    order by coalesce(o.occurred_at, s.occurred_at) desc,
                             sl.created_at desc, sl.id desc))[1]
           as price_last_gross
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
   group by 1, 2, 3, 4
),
traded as (
  select workspace_id, location_id, day
    from sold
   group by 1, 2, 3
),
stocked as (
  select bb.workspace_id,
         bb.location_id,
         bb.variant_id,
         min((bb.received_at at time zone l.timezone)::date) as first_stock_day
    from public.batch_balance bb
    join public.location l
      on  l.id           = bb.location_id
      and l.workspace_id = bb.workspace_id
   group by 1, 2, 3
),
carried as (
  select u.workspace_id,
         u.location_id,
         u.variant_id,
         min(u.first_day) as first_day
    from (select workspace_id, location_id, variant_id, min(day) as first_day
            from sold
           group by 1, 2, 3
          union all
          select workspace_id, location_id, variant_id, first_stock_day
            from stocked) u
   group by 1, 2, 3
),
open_until as (
  select workspace_id, location_id, max(day) as last_day
    from traded
   group by 1, 2
),
spine as (
  select c.workspace_id,
         c.location_id,
         c.variant_id,
         c.first_day,
         g::date as day
    from carried c
    join open_until o
      on  o.workspace_id = c.workspace_id
      and o.location_id  = c.location_id
   cross join lateral
         generate_series(c.first_day, o.last_day, interval '1 day') g
),
daily as (
  select sp.workspace_id,
         sp.location_id,
         sp.variant_id,
         sp.day,
         sp.first_day,
         coalesce(s.qty_base_sold, 0) as qty_base_sold,
         coalesce(s.revenue_net,   0) as revenue_net,
         coalesce(s.tax_collected, 0) as tax_collected,
         coalesce(s.line_count,    0) as line_count,
         s.price_last_net,
         s.price_last_gross,
         (t.day is not null)          as store_traded
    from spine sp
    left join sold s
      on  s.workspace_id = sp.workspace_id
      and s.location_id  = sp.location_id
      and s.variant_id   = sp.variant_id
      and s.day          = sp.day
    left join traded t
      on  t.workspace_id = sp.workspace_id
      and t.location_id  = sp.location_id
      and t.day          = sp.day
)
select d.workspace_id,
       d.location_id,
       d.variant_id,
       d.day,
       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,
       d.qty_base_sold,
       d.revenue_net,
       d.line_count,
       d.store_traded,
       sum(d.qty_base_sold) over w                          as trailing_qty_base,
       sum(d.revenue_net)   over w                          as trailing_revenue_net,
       count(*)             over w                          as trailing_days,
       count(*) filter (where d.store_traded)      over w    as trailing_traded_days,
       count(*) filter (where d.qty_base_sold > 0) over w    as trailing_sold_days,
       d.day - (max(d.day) filter (where d.qty_base_sold > 0)
                over (partition by d.workspace_id, d.location_id, d.variant_id
                      order by d.day
                      rows between unbounded preceding and current row))
         as days_since_last_sale,
       (d.day - d.first_day) as days_carried,
       d.tax_collected                              as tax_collected,
       (d.revenue_net + d.tax_collected)            as revenue_gross,
       sum(d.revenue_net + d.tax_collected) over w  as trailing_revenue_gross,
       d.revenue_net                     / nullif(d.qty_base_sold, 0) as sale_price_net,
       (d.revenue_net + d.tax_collected) / nullif(d.qty_base_sold, 0) as sale_price_gross,
       d.price_last_net   as sale_price_last_net,
       d.price_last_gross as sale_price_last_gross
  from daily d
  join public.product_variant v
    on  v.id           = d.variant_id
    and v.workspace_id = d.workspace_id
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id
window w as (partition by d.workspace_id, d.location_id, d.variant_id
             order by d.day
             range between interval '28 days' preceding
                       and interval  '1 day'  preceding);

-- ------------------------------------------- 2. the sales, in one answer ----
create function public.daily_sales(p_workspace_id uuid, p_since date)
returns json
language sql
stable
security invoker
set search_path = ''
as $$
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
$$;

comment on function public.daily_sales(uuid, date) is
  'Every product''s sales per store per day since p_since, in one shop, as ONE json '
  'array — Wera''s Números, Inicio and the product card read it (plan 12.2, 0095). '
  'Each element carries day (the store''s own date; a void on the day of the sale it '
  'undoes, 0064), variant_id, variant_name, family_id, family_name, base_unit_code, '
  'and qty_base_sold and revenue_gross as decimal TEXT (gross of IVA, §2.9, voids '
  'netted). Exactly the rows product_velocity_daily has with line_count > 0, its '
  'figures spelled the same way; supabase/tests/0095_sales_in_one_answer.sql holds '
  'the two equal to the cent. Newest day first, then variant_id, then location_id. '
  'One value, so PostgREST''s max_rows never truncates it. security invoker: a '
  'cashier reads her own stores'' sales by sale_line_select, nobody another shop''s. '
  'An unknown or foreign shop, or a NULL argument, is an empty array.';

revoke all on function public.daily_sales(uuid, date) from public, anon;
grant execute on function public.daily_sales(uuid, date) to authenticated;
