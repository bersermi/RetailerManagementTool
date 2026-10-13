-- ---------------------------------------------------------------------------
-- HOW MUCH EACH SHOP USES WERA: sales, purchases and waste recorded per shop
-- per day. Plan task `5P-b`, ruled by the owner on 2026-10-12: *count from the
-- server*. Recording is the engagement, so nothing was added to the app.
--
-- HOW TO RUN IT, from the repository root. It is a read and changes nothing:
--
--   supabase db query --linked -o table -f docs/runbooks/engagement.sql   # the shops
--   supabase db query --local  -o table -f docs/runbooks/engagement.sql   # rehearsal
--
-- `-o csv` instead of `-o table` gives a file a spreadsheet opens.
--
-- ⚠️ IT READS EVERY SHOP AT ONCE, which no person signed into the app may do.
-- It goes through the Management API as the database owner, so row level
-- security does not apply to it. That is why it is a file the owner runs and
-- must never become an app screen, a view or a function.
--
-- ⚠️ THE COLUMNS ARE THE AVISO'S PROMISE (`site/privacidad/`, finalidad 9):
-- *"Son conteos por tienda, no por persona."* A column that names or counts
-- people changes the aviso first. `supabase/tests/runbook_engagement.sql` pins
-- the column list for that reason.
--
-- HOW TO READ IT.
--   * One row per store per day, newest first, zeros included: a day with
--     nothing recorded is the thing this read exists to show.
--   * The day is the STORE's day (`location.timezone`, `0012`), not UTC.
--   * A store's calendar starts on the day it was created, so a shop that
--     signed up on Tuesday has no rows before Tuesday.
--   * ⚠️ A RECENT ZERO CAN STILL FILL IN. A phone without signal sends its day
--     when it reconnects, and a sale counts on the day it was made
--     (`occurred_at`). Offline longer than 72 hours, it lands 72 hours before
--     the reconnection instead (`0016`'s clamp).
--   * A cancelled document still counts on the day it was recorded, because
--     somebody recorded it. The cancellation is a second row in the same table
--     (`reversal_of`, `0021`) and is NOT counted, or one mistake would read as
--     two sales.
--
-- It must stay ONE statement: the test wraps it in `create table … as`.
-- ---------------------------------------------------------------------------
with ventana as (
  select 14 as dias            -- ← the only number to change: how many days back
),
tienda as (
  select l.id as location_id,
         case when l.name = w.display_name then w.display_name
              else w.display_name || ' · ' || l.name
         end as shop,
         l.timezone,
         (now()        at time zone l.timezone)::date as hoy,
         (l.created_at at time zone l.timezone)::date as desde
    from public.location  l
    join public.workspace w on w.id = l.workspace_id
),
calendario as (
  select t.location_id, t.shop, t.hoy - i as day
    from tienda t
   cross join ventana v
   cross join lateral generate_series(0, v.dias - 1) as i
   where t.hoy - i >= t.desde
),
documento as (
  select location_id, occurred_at, 'sale' as kind
    from public.sale     where reversal_of is null
  union all
  select location_id, occurred_at, 'purchase'
    from public.purchase where reversal_of is null
  union all
  select location_id, occurred_at, 'waste'
    from public.waste    where reversal_of is null
),
conteo as (
  select d.location_id,
         (d.occurred_at at time zone t.timezone)::date  as day,
         count(*) filter (where d.kind = 'sale')        as sales,
         count(*) filter (where d.kind = 'purchase')    as purchases,
         count(*) filter (where d.kind = 'waste')       as waste
    from documento d
    join tienda t using (location_id)
   -- Only bounds the scan; the join to the calendar below does the choosing.
   where d.occurred_at >= now() - make_interval(days => (select dias from ventana) + 1)
   group by 1, 2
)
select c.shop,
       -- ⚠️ TEXT ON PURPOSE. The CLI prints a `date` as `2026-10-13 00:00:00
       -- +0000 UTC`, which reads as a UTC instant on the one read whose day is
       -- the store's own.
       to_char(c.day, 'YYYY-MM-DD') as day,
       to_char(c.day, 'Dy')       as weekday,
       coalesce(n.sales, 0)       as sales,
       coalesce(n.purchases, 0)   as purchases,
       coalesce(n.waste, 0)       as waste
  from calendario c
  left join conteo n on n.location_id = c.location_id and n.day = c.day
 order by c.shop, c.location_id, c.day desc;
