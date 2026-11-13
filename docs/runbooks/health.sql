-- ---------------------------------------------------------------------------
-- IS ANY SHOP'S RECORD BROKEN? Plan task `5P-e`, item (b): the health read.
-- One row per shop: the writes its phones made that never reached the database
-- and were never replayed, what they are worth in pesos, and whether its stock
-- still adds up.
--
-- HOW TO RUN IT, from the repository root. It is a read and changes nothing:
--
--   supabase db query --linked -o table -f docs/runbooks/health.sql   # the shops
--   supabase db query --local  -o table -f docs/runbooks/health.sql   # rehearsal
--
-- WHAT IT STANDS IN FOR. ADR-035 §2.4 and §2.10 promise a NIGHTLY PRODUCTION
-- CHECK — the ledger invariant re-checked, dead letters counted and priced, a
-- message every day including green — and about 25 comments lean on it (`0004`,
-- `0024`, `app/src/api/flush.ts`). No workflow has a schedule and no job runs it
-- (`0078`'s is the project's one `pg_cron` job, and it clears Google's points).
-- This read is the pilot's version: the same two questions, asked by a person.
-- The pipe that would send it daily is §8's checklist, not this file.
--
-- ⚠️ IT READS EVERY SHOP AT ONCE, which no person signed into the app may do.
-- It goes through the Management API as the database owner, so row level
-- security does not apply to it. That is why it is a file the owner runs and
-- must never become an app screen, a view or a function — `engagement.sql`'s
-- rule, for the same reason.
--
-- ⚠️ IT NAMES SHOPS, NEVER PEOPLE. `failed_write.reported_by` is a person and
-- is never read here; `supabase/tests/runbook_health.sql` pins the columns.
--
-- THE COLUMNS.
--   shop               the shop's name (`workspace.display_name`)
--   health             `ok`, or `look` when any number to its right is not zero
--   unsaved            dead letters not yet replayed (`failed_write`, `0024`,
--                      with `replayed_at` empty, `0026`): something happened in
--                      the shop and no document records it
--   oldest             the oldest of them, on the shop's own calendar
--   unsaved_sales      what those sales charged, gross, in pesos
--   unsaved_purchases  what those deliveries cost, net, in pesos
--   unsaved_waste      what that Merma was worth, gross, in pesos
--   unpriced           how many of them could not be priced from what they
--                      carry; their pesos are in none of the three columns
--   lots_off           lots whose balance disagrees with their movements — the
--                      §2.4 invariant, `sum(stock_movement.qty_base) =
--                      batch_balance.remaining_base`, which must be zero always
--
-- HOW A DEAD LETTER IS PRICED, and why it is the same number the phone showed.
--   * From its stored arguments (`0024`'s decision 5), line by line:
--     `round(price × round(qty_display × factor_to_base, 3), 2)` — the
--     arithmetic `record_*` uses and `lineAnchorCentavos` mirrors on the phone
--     (`packages/money`), half-up away from zero, which Postgres's
--     `round(numeric)` is. The document is the SUM OF ITS ROUNDED LINES.
--   * The price is `unit_price_gross_per_base` for a sale or Merma and
--     `unit_price_net_per_base` for a delivery (`app/src/offline/deadLetters.ts`,
--     `PRICE_KEY`). A transfer carries no price and is worth nothing here — it
--     moves stock, it sells nothing — so it counts in `unsaved`, never in
--     `unpriced`.
--   * A missing display unit is the server's default, per kind: the sell unit
--     for a sale or Merma, the purchase unit for a delivery (`0064`). The app
--     always sends one.
--   * ⚠️ ONE LINE THAT CANNOT BE PRICED MAKES THE WHOLE DOCUMENT `unpriced`, as
--     on the phone: a three-item sale priced from two would be a smaller number
--     that looks exactly like a right one. A line cannot be priced when its
--     product is gone or belongs to another shop, its unit is unknown or
--     measures another thing (the case of the one dead letter on the live
--     project, 2026-09-24), or its quantity or price is not a plain decimal.
--   * It is priced against TODAY's units and products, not those of the day it
--     failed.
--
-- HOW TO READ IT. Shops with something to look at come first.
--   * `unsaved` not zero: the phone already told the shop (*Una operación no se
--     guardó* on Inicio). The fix is a session's: find why the database refused
--     it, fix that, then replay it (`replay_failed_write`, `0026`). A delivery
--     is never re-entered by the database on its own — the shop may already
--     have typed it again, so ask before replaying one.
--   * `lots_off` not zero is never the shop's doing: the projection is
--     rebuildable from the movements (`rebuild_batch_balance`, `0004`), and a
--     session finds what wrote it wrong before rebuilding.
--   * A kitchen of Wera Cocina has no stock and no dead letters, so it is
--     listed only if it ever has one.
--
-- It must stay ONE statement: the test wraps it in `create table … as`.
-- ---------------------------------------------------------------------------
with carta as (                -- every dead letter not yet replayed
  select fw.id, fw.workspace_id, fw.kind, fw.payload,
         (fw.failed_at at time zone coalesce(l.timezone, 'America/Mexico_City'))::date as day
    from public.failed_write fw
    left join public.location l on l.id = fw.location_id   -- no FK on purpose (`0024`)
   where fw.replayed_at is null
),
renglon as (                   -- one row per line of a sale, a delivery or Merma
  select c.id, e.ord,
         -- ⚠️ A CASE, NOT AN `and`: Postgres does not promise the order of an
         -- `and`, and a cast tried before its regex is an error that stops the
         -- whole read on one bad payload. A CASE's branches run in order.
         case
           when pv.id is null or u.code is null or u.base_code <> pv.base_unit_code
             then null
           when coalesce(e.l ->> 'qty_display', '') !~ '^[0-9]+(\.[0-9]+)?$'
             then null
           when coalesce(e.l ->> p.price_key, '') !~ '^[0-9]+(\.[0-9]+)?$'
             then null
           when round((e.l ->> 'qty_display')::numeric * u.factor_to_base, 3) <= 0
             then null
           else round((e.l ->> p.price_key)::numeric
                      * round((e.l ->> 'qty_display')::numeric * u.factor_to_base, 3), 2)
         end as pesos
    from carta c
    cross join lateral (
      select case c.kind when 'purchase' then 'unit_price_net_per_base'
                         else 'unit_price_gross_per_base' end as price_key
    ) p
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(c.payload -> 'lines') = 'array'
           then c.payload -> 'lines' else '[]'::jsonb end
    ) with ordinality as e(l, ord)
    left join public.product_variant pv
           on pv.workspace_id = c.workspace_id
          and pv.id = case when e.l ->> 'variant_id'
                                ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                           then (e.l ->> 'variant_id')::uuid end
    left join public.unit u
           on u.code = coalesce(nullif(e.l ->> 'qty_display_unit', ''),
                                case c.kind when 'purchase' then pv.purchase_unit_code
                                            else pv.sell_unit_code end)
   where c.kind in ('sale', 'purchase', 'waste')
),
documento as (                 -- each dead letter, priced or not
  select c.id, c.workspace_id, c.kind, c.day,
         case when c.kind = 'transfer'           then 0
              when count(r.ord) = 0              then null   -- no lines to price
              when count(r.pesos) < count(r.ord) then null   -- one bad line spoils it
              else sum(r.pesos)
         end as pesos
    from carta c
    left join renglon r on r.id = c.id
   group by c.id, c.workspace_id, c.kind, c.day
),
sin_guardar as (
  select workspace_id,
         count(*)                                                  as unsaved,
         min(day)                                                  as oldest,
         coalesce(sum(pesos) filter (where kind = 'sale'),     0) as sales,
         coalesce(sum(pesos) filter (where kind = 'purchase'), 0) as purchases,
         coalesce(sum(pesos) filter (where kind = 'waste'),    0) as waste,
         count(*) filter (where pesos is null)                     as unpriced
    from documento
   group by workspace_id
),
movido as (
  select batch_id, sum(qty_base) as moved
    from public.stock_movement
   group by batch_id
),
lote as (                      -- §2.4: every lot, with or without a balance row
  select b.workspace_id,
         count(*) filter (where bb.batch_id is null
                             or bb.remaining_base <> coalesce(m.moved, 0)) as off
    from public.stock_batch b
    left join public.batch_balance bb on bb.batch_id = b.id
    left join movido m on m.batch_id = b.id
   group by b.workspace_id
)
select w.display_name                                         as shop,
       case when coalesce(s.unsaved, 0) + coalesce(lo.off, 0) = 0
            then 'ok' else 'look' end                         as health,
       coalesce(s.unsaved, 0)                                 as unsaved,
       -- ⚠️ TEXT ON PURPOSE, as in `engagement.sql`: the CLI prints a `date` as
       -- a UTC midnight, and this day is the shop's own.
       coalesce(to_char(s.oldest, 'YYYY-MM-DD'), '')          as oldest,
       coalesce(s.sales,     0)::numeric(14,2)                as unsaved_sales,
       coalesce(s.purchases, 0)::numeric(14,2)                as unsaved_purchases,
       coalesce(s.waste,     0)::numeric(14,2)                as unsaved_waste,
       coalesce(s.unpriced,  0)                               as unpriced,
       coalesce(lo.off,      0)                               as lots_off
  from public.workspace w
  left join sin_guardar s  on s.workspace_id  = w.id
  left join lote        lo on lo.workspace_id = w.id
 where w.kind = 'tienda' or s.workspace_id is not null or lo.workspace_id is not null
 order by coalesce(s.unsaved, 0) + coalesce(lo.off, 0) = 0, w.display_name, w.id;
