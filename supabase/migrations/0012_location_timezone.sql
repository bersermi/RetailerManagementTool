-- ============================================================================
-- 0012 — A trading day is local, and the shop is what makes it local
-- ============================================================================
-- ADR-035 §2.3 (data model — workspace is the tenant, location is the store),
-- §2.9 (analytics), §2.7 (access)
--
-- Scope of this migration, deliberately narrow so one person can review it:
--   * location.timezone            — one column, NOT NULL, defaulted
--   * location_timezone_valid_trg  — one trigger, one function, rejecting a name
--                                    Postgres does not know
--   * product_margin_daily         — create or replace, reads the column
--   * product_waste_daily          — create or replace, reads the column
--
-- Not in this migration: velocity against a trailing average (plan task 2.3,
-- now 0013), the nightly materialised rollups (§2.9, deferred), the RPCs (0006),
-- the failure path (0007).
--
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS, AND WHY IT IS ITS OWN MIGRATION AHEAD OF 2.3
-- ----------------------------------------------------------------------------
-- 2.1 found it and 2.2 made it worse. `occurred_at` is `timestamptz` and a trading
-- day is a LOCAL fact, so both analytics views had to bucket in some zone, and no
-- table recorded one. Each hardcoded `America/Mexico_City`.
--
-- That was the right call twice, for the reason both files give: a column is
-- append-only and a view is `create or replace`, so the constant was the
-- reversible half and the schema change was not. What changed is the arithmetic of
-- waiting:
--
--   * TWO views carried the constant after 2.2, and 2.3 would have made three. A
--     constant in three places is not a constant, it is three constants that agree
--     today. 2.2 had to add a check that reads the timezone literal out of both
--     shipped view definitions and asserts they still match — a drift guard, which
--     is what you build when the thing itself cannot be fixed cheaply.
--
--   * ⚠️ NOTHING ARITHMETIC COULD SEE THE DRIFT. The seed trades in UTC office
--     hours (09:00–20:40 UTC, 03:00–14:40 in Mexico City), so local and UTC
--     bucketing produce identical rows over it. Moving one view to UTC and leaving
--     the other left every reconciliation in `supabase/checks/` GREEN. Only the
--     literal-comparison guard caught it.
--
--   * The column stays cheap only until a materialised rollup is keyed on `day`
--     (§2.9). After that, moving a boundary restates history.
--
-- So the owner took the column now, before 2.3 was written, at the last moment it
-- cost nothing extra. Decided 2026-08-20; the alternatives were finishing 2.3 on
-- the constant and doing all three replacements at once, or leaving it on the
-- grounds that this product is not sold outside UTC−6.
--
-- ⚠️ THE HEADERS OF 0009 AND 0011 ARE NOW STALE ON THIS POINT, and they are not
-- edited: both are applied and therefore closed (supabase/README.md fixes the
-- numbering rule, and 0002 already carries a stale comment for the same reason).
-- Each says the constant is hardcoded and names this migration as the fix. This
-- file IS that fix, and supabase/README.md is the authority.
--
-- ----------------------------------------------------------------------------
-- WHY THE COLUMN IS ON `location` AND NOT ON `workspace_setting`
-- ----------------------------------------------------------------------------
-- Because the store is the thing that has a trading day, and ADR-035 §2.3 makes
-- confusing the two a one-way door: `workspace` is the tenant, `location` is the
-- store. The case this column exists for is EXACTLY the case that separates them —
-- a merchant whose stores are in different zones. Sonora and Baja California are
-- UTC−7 and UTC−8 all year against the rest of the country's UTC−6, so one owner
-- with a shop in Hermosillo and a shop in Guadalajara is not exotic, it is the
-- first customer who breaks a workspace-level setting.
--
-- `workspace_setting` deliberately does NOT get a default-for-new-locations
-- companion. Two places to write the same fact is how a NULL got into the overlap
-- constraint (ADR-035 §2.3) — the column default below covers a new store, and it
-- covers it without a second row anyone can edit.
--
-- ----------------------------------------------------------------------------
-- WHY A TRIGGER AND NOT A CHECK CONSTRAINT
-- ----------------------------------------------------------------------------
-- `CHECK` requires an IMMUTABLE expression, and no honest timezone validation is
-- immutable: the tz database ships with the server and changes when it is
-- upgraded. Declaring a wrapper IMMUTABLE to get past the parser would be a lie
-- the planner is entitled to act on.
--
-- The failure this prevents is not loud enough to leave alone. An unknown zone
-- raises at SELECT time, so a bad value written today takes the REPORT down
-- tomorrow, in front of whoever opened it — and the person who typed it is gone.
-- Validating on write puts the error on the keyboard that caused it.
--
-- It demands the CANONICAL name, rejecting `america/mexico_city` as well as
-- `Mars/Olympus_Mons`. `AT TIME ZONE` would accept the first; this does not,
-- because the stored value is compared across rows and across views, and two
-- spellings of one zone are two zones to everything except Postgres.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The column  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------

alter table public.location
  add column timezone text not null default 'America/Mexico_City';

-- DEFAULTED, AND THE DEFAULT IS THE CONSTANT THE TWO VIEWS ALREADY CARRIED. So
-- this migration changes no bucket in any existing database: every row it back-
-- fills gets exactly the zone the views were already assuming. That is the
-- property that makes it safe to apply to a live shop, and it is asserted in
-- supabase/checks/0012_location_timezone.sql rather than assumed.
--
-- It also means `onboard_workspace()` (0001, replaced in 0002) needs no change:
-- it inserts a location naming only (workspace_id, name), and so do both seeds
-- and every fixture in supabase/tests/. A store opened by an operator in Sonora
-- is one UPDATE by the owner, not a different onboarding path.

comment on column public.location.timezone is
  'IANA zone name deciding this store''s trading-day boundary (ADR-035 §2.9). A '
  'canonical name from pg_timezone_names, enforced by trigger. Defaulted to '
  'America/Mexico_City, which is what 0009 and 0011 hardcoded before this '
  'migration — so applying it moves nothing. Per LOCATION and not per workspace: '
  'Sonora and Baja California are UTC-7 and UTC-8 all year while the rest of the '
  'country is UTC-6, so one merchant can straddle two zones.';


-- ----------------------------------------------------------------------------
-- 2. The guard  (ADR-035 §2.3)
-- ----------------------------------------------------------------------------

create function public.location_timezone_is_known()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Canonical names only. `pg_timezone_names` is the server's own list, so this
  -- rejects both a zone that does not exist and a fixed offset like '+05:00',
  -- which AT TIME ZONE would accept and which cannot follow daylight saving —
  -- a shop's day boundary has to move when the country's does.
  if not exists (
    select 1 from pg_catalog.pg_timezone_names t where t.name = new.timezone
  ) then
    raise exception 'unknown timezone %', new.timezone
      using errcode = '22023',
            hint = 'Use a canonical IANA name from pg_timezone_names, '
                   'e.g. America/Mexico_City, America/Hermosillo, America/Tijuana. '
                   'Case matters.';
  end if;
  return new;
end;
$$;

comment on function public.location_timezone_is_known() is
  'Rejects a location timezone Postgres does not know, on write rather than on '
  'read. A CHECK cannot do this: no honest timezone validation is IMMUTABLE, '
  'because the tz database ships with the server. See the header of 0012.';

-- WHEN, AND WHY NOT ON EVERY UPDATE. `update of timezone` means renaming a store
-- or deactivating it does not pay for a scan of pg_timezone_names, and a row whose
-- timezone is untouched cannot have become invalid since it was written.
create trigger location_timezone_valid_trg
  before insert or update of timezone on public.location
  for each row execute function public.location_timezone_is_known();

-- No grant. The trigger runs as part of the caller's statement, and who may write
-- the column is already decided by §2.7: `location_update` is owner-only, so
-- moving a store's trading-day boundary is an owner act and a manager cannot do
-- it. That is the right level — the boundary decides what every report in the
-- shop means, and it changes when the shop moves, which is not a monthly event.


-- ----------------------------------------------------------------------------
-- 3. The two views read the column  (ADR-035 §2.9)
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS COSTS THE DESIGN GATE, STATED PLAINLY RATHER THAN GLOSSED. Each
-- aggregate in both views now reads THREE tables instead of two: the measure, its
-- document, and `location`. ADR-035 §3 step 2's bar was that margin by product
-- must not need "a five-way join and a CTE to survive REVERSALS, UNIT CONVERSION
-- and a LOCATION ROLLUP" — and none of those three is why this join is here. It is
-- a primary-key lookup of one text column, added so a constant could stop being a
-- constant. The gate's verdict is unchanged; the sentence describing the query is.
--
-- IT CANNOT DROP A ROW OR ADD ONE. `location_id` is NOT NULL and carries a
-- composite FK to `location (id, workspace_id)` on every ledger table (0003,
-- 0004), so exactly one row matches. Under RLS it cannot narrow anything either:
-- `location_select` is `id in (select my_locations())`, which is the same
-- predicate `sale_line`, `stock_movement` and `purchase_line` already apply to
-- `location_id`. Both claims are asserted in the checks rather than argued here.

create or replace view public.product_margin_daily
with (security_invoker = true) as

with revenue as (
  select sl.workspace_id,
         sl.location_id,
         sl.variant_id,
         (s.occurred_at at time zone l.timezone)::date as day,

         sum(sl.qty_base)   as qty_base_sold,
         sum(sl.line_net)   as revenue_net,
         sum(sl.tax_amount) as tax_collected,
         count(*)           as line_count

    from public.sale_line sl
    join public.sale s
      on  s.id           = sl.sale_id
      and s.workspace_id = sl.workspace_id
      and s.location_id  = sl.location_id
    join public.location l
      on  l.id           = sl.location_id
      and l.workspace_id = sl.workspace_id
   group by 1, 2, 3, 4
),

cost as (
  select m.workspace_id,
         m.location_id,
         m.variant_id,
         (s.occurred_at at time zone l.timezone)::date as day,

         sum(-m.qty_base * m.unit_cost_net_per_base) as cogs_net,
         count(*)                                    as movement_count

    from public.stock_movement m
    join public.sale s
      on  s.id           = m.sale_id
      and s.workspace_id = m.workspace_id
      and s.location_id  = m.location_id
    join public.location l
      on  l.id           = m.location_id
      and l.workspace_id = m.workspace_id
   where m.reason = 'sale'
   group by 1, 2, 3, 4
)

select coalesce(r.workspace_id, c.workspace_id) as workspace_id,
       coalesce(r.location_id,  c.location_id)  as location_id,
       coalesce(r.variant_id,   c.variant_id)   as variant_id,
       coalesce(r.day,          c.day)          as day,

       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,

       coalesce(r.qty_base_sold, 0) as qty_base_sold,
       coalesce(r.revenue_net,   0) as revenue_net,
       coalesce(r.tax_collected, 0) as tax_collected,
       coalesce(c.cogs_net,      0) as cogs_net,

       coalesce(r.revenue_net, 0) - coalesce(c.cogs_net, 0) as gross_margin,

       case when coalesce(r.revenue_net, 0) <> 0
            then (coalesce(r.revenue_net, 0) - coalesce(c.cogs_net, 0))
                 / r.revenue_net
       end as margin_rate,

       (c.movement_count is not null) as cost_attributed,

       coalesce(r.line_count, 0)     as line_count,
       coalesce(c.movement_count, 0) as movement_count

  from revenue r

  full outer join cost c
    on  c.workspace_id = r.workspace_id
    and c.location_id  = r.location_id
    and c.variant_id   = r.variant_id
    and c.day          = r.day

  join public.product_variant v
    on  v.id           = coalesce(r.variant_id,   c.variant_id)
    and v.workspace_id = coalesce(r.workspace_id, c.workspace_id)
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id

 where public.has_role(coalesce(r.workspace_id, c.workspace_id), 'manager')
    or not row_security_active('public.stock_movement');


create or replace view public.product_waste_daily
with (security_invoker = true) as

with wasted as (
  select m.workspace_id,
         m.location_id,
         m.variant_id,
         (w.occurred_at at time zone l.timezone)::date as day,

         sum(-m.qty_base)                            as waste_qty_base,
         sum(-m.qty_base * m.unit_cost_net_per_base) as waste_cost_net,
         count(*)                                    as waste_movement_count

    from public.stock_movement m
    join public.waste w
      on  w.id           = m.waste_id
      and w.workspace_id = m.workspace_id
      and w.location_id  = m.location_id
    join public.location l
      on  l.id           = m.location_id
      and l.workspace_id = m.workspace_id
   where m.reason = 'waste'
   group by 1, 2, 3, 4
),

bought as (
  select pl.workspace_id,
         pl.location_id,
         pl.variant_id,
         (p.occurred_at at time zone l.timezone)::date as day,

         sum(pl.qty_base) as purchases_qty_base,
         sum(pl.line_net) as purchases_net,
         count(*)         as purchase_line_count

    from public.purchase_line pl
    join public.purchase p
      on  p.id           = pl.purchase_id
      and p.workspace_id = pl.workspace_id
      and p.location_id  = pl.location_id
    join public.location l
      on  l.id           = pl.location_id
      and l.workspace_id = pl.workspace_id
   group by 1, 2, 3, 4
)

select coalesce(w.workspace_id, b.workspace_id) as workspace_id,
       coalesce(w.location_id,  b.location_id)  as location_id,
       coalesce(w.variant_id,   b.variant_id)   as variant_id,
       coalesce(w.day,          b.day)          as day,

       v.name  as variant_name,
       v.family_id,
       f.name  as family_name,
       v.base_unit_code,

       coalesce(w.waste_qty_base,       0) as waste_qty_base,
       coalesce(w.waste_cost_net,       0) as waste_cost_net,
       coalesce(w.waste_movement_count, 0) as waste_movement_count,

       coalesce(b.purchases_qty_base,   0) as purchases_qty_base,
       coalesce(b.purchases_net,        0) as purchases_net,
       coalesce(b.purchase_line_count,  0) as purchase_line_count

  from wasted w

  full outer join bought b
    on  b.workspace_id = w.workspace_id
    and b.location_id  = w.location_id
    and b.variant_id   = w.variant_id
    and b.day          = w.day

  join public.product_variant v
    on  v.id           = coalesce(w.variant_id,   b.variant_id)
    and v.workspace_id = coalesce(w.workspace_id, b.workspace_id)
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id;


-- ----------------------------------------------------------------------------
-- 4. The comments the two views carry about their own day column
-- ----------------------------------------------------------------------------
-- Restated because both said "hardcoded because no table records a shop timezone
-- yet", and that sentence is now false. `create or replace view` keeps existing
-- comments, so these overwrite rather than add.

comment on column public.product_margin_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the sale document. Two stores of one merchant in different zones bucket their '
  'own days, which is the case the column exists for.';

comment on column public.product_waste_daily.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the waste or purchase document. product_margin_daily reads the same column, so '
  'the two reports can no longer disagree about when a day ended.';


-- ----------------------------------------------------------------------------
-- 5. Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- Nothing changes and nothing is granted. `location` already carries
-- `location_select` (`id in (select my_locations())`) and an owner-only
-- `location_update`; the new column inherits both, which is the answer this
-- migration wants: a manager reads the boundary, an owner moves it.
--
-- The views keep the access they had. `product_margin_daily` keeps its `has_role`
-- predicate, because it still joins member-level revenue to manager-only cost;
-- `product_waste_daily` still needs none, because both its aggregates read
-- manager-gated tables. Joining `location` — which is member-level — widens
-- neither, since an inner join against a gated aggregate is still gated. Asserted.
