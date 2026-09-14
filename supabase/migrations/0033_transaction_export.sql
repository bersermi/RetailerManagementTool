-- ============================================================================
-- 0033 — The month export: what happened, flat, in one shape
-- ============================================================================
-- ADR-035 §2.9 (analytics), §2.7 (access), §2.5 (units and money), §2.3 (data model)
--
-- Plan task 4.6c-iii, the last of step 4.6. Área 9's `A1`, in the owner's own
-- words: "a download of the transactions breakdown — all transactions and waste
-- for a given month". §2.9 calls it "the raw rows" and says it is part of the
-- screen rather than a later feature: it is what an owner who has always used a
-- notebook checks the app against.
--
-- Scope of this migration, deliberately narrow so one person can review it:
--
--   * transaction_export — ONE NEW VIEW, one row per LINE, three kinds in one
--     shape, with the fence stated in the body
--
-- No table, no policy, no function, no column on any table, and nothing existing
-- is replaced. `0031`'s and `0032`'s views are not touched.
--
-- This is the last migration of step 4.6.
--
-- ----------------------------------------------------------------------------
-- THE GRAIN IS THE LINE, AND THAT IS THE WHOLE POINT OF THE WORD "BREAKDOWN"
-- ----------------------------------------------------------------------------
-- A document-grain export — one row per sale, per delivery, per write-off —
-- carries the money and loses the PRODUCT, and every question in §2.9 is about a
-- product. The owner reconciles against a notebook that says what he bought and
-- what he sold, not how many documents he wrote.
--
-- ⚠️ A LINE-GRAIN EXPORT DROPS A DOCUMENT THAT HAS NO LINES, SILENTLY. Nothing in
-- this seed has one (0 of 907 sales, 113 purchases and 66 write-offs) and the four
-- recorders cannot write one, because a document is built from its payload's lines.
-- **The precondition is pinned by a check rather than assumed**, because the day
-- something can write an empty document it vanishes from this file and no total
-- changes.
--
-- ⚠️ THE DOCUMENT TOTALS ARE RECOVERABLE AND ARE DELIBERATELY NOT COLUMNS.
-- `0003` says the document is never rounded independently of its lines, so
-- `sum(line_net) = total_net` exactly, for all three kinds — measured, 0 mismatches
-- over 1 086 documents. Carrying `total_net` on every line would repeat a
-- document's total on each of its rows, which is the classic spreadsheet trap:
-- someone sums the column and gets the total multiplied by the line count.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ ONE FENCE, STATED — AND IT IS THE OPPOSITE CALL TO 0032'S, FOR A STATED
-- REASON
-- ----------------------------------------------------------------------------
-- The three fences this view reads across are NOT the same (§2.7, measured from
-- pg_policies rather than assumed):
--
--   sale, sale_line     member-level  — a cashier must see her own till
--   waste               member-level  — the header is not the cost
--   waste_line          MANAGER       — it carries unit_cost_net_per_base
--   purchase,
--   purchase_line       MANAGER       — this is what the business pays
--
-- Under `security_invoker` and nothing else, a CASHIER reading this view gets
-- **the sale lines and nothing else** — and what she has in her hands is a file
-- headed "all transactions and waste for August" that silently omits every
-- delivery and every write-off. **A partial export is worse than no export**: it is
-- a document somebody reconciles against a notebook, and the app loses that
-- argument while being right.
--
-- So the gate is written down rather than inherited, in exactly 0009's shape and
-- for exactly 0009's reason — a member-level half that would be left standing when
-- the gated half disappears. **A staff session gets ZERO ROWS. Complete, or
-- nothing.**
--
-- ⚠️ 0032 WENT THE OTHER WAY ONE MIGRATION AGO AND THE TWO ARE NOT IN TENSION.
-- There, a predicate would have hidden a number the same cashier can compute from
-- two columns she is granted — a fence anyone defeats with a calculator. Here, the
-- absence of a predicate does not hide anything: it MANUFACTURES A MISLEADING
-- DOCUMENT. The test is not "is this row cost" but "does the view tell the truth to
-- a caller RLS has filtered", and the answers differ because one view is a number
-- and the other is a record of what happened.
--
-- ⚠️ THE SECOND DISJUNCT IS NOT A HOLE, and 0009's header already argues it in
-- full: `row_security_active` is false exactly for the callers RLS does not filter
-- — the superuser and `service_role`, both of which already read every row in the
-- database and for both of which `auth.uid()` is null, so `has_role` is false.
-- Without it, §2.9's nightly job and every file in supabase/checks/ would read zero
-- rows and report it as a fact. One sentinel table is enough because row security
-- is a property of the CALLER, not of this query — and both gated tables are
-- asserted to have RLS enabled by a check, so the sentinel cannot become the only
-- one still fenced.
--
-- ----------------------------------------------------------------------------
-- ONE SHAPE MEANS NULLS, AND THE NULLS ARE THE HONEST PART
-- ----------------------------------------------------------------------------
-- Three document kinds carry three different facts on top of the shared ten:
-- a purchase has a provider and a per-line expiry, a write-off has a reason and a
-- COST, a sale has neither. In one flat file those are columns that are null on the
-- kinds that do not have them. That is what "one shape" costs and it is worth it:
-- the alternative is three files the owner has to line up himself, which is the
-- thing §2.9 says the client should not be doing under three different RLS rules.
--
-- ⚠️⚠️ THERE IS NO SIGNED, NORMALISED OR TOTALLED MONEY COLUMN, DELIBERATELY.
-- `line_net` is the number on the document, so this file reconciles to `total_net`
-- and to `product_velocity_daily`, `product_purchases_daily` and
-- `product_waste_daily`. But money LEAVING the till on a delivery, money ARRIVING
-- on a sale and retail value LOST on a write-off are three directions, and a column
-- that summed them would be inventing an accounting convention nobody asked for —
-- `A3` cancelled exactly that kind of derivation ("we won't derive the profit").
-- **`kind` carries the direction; sum within a kind, never across.**
--
-- ⚠️ `line_gross` IS HERE because the owner's ruling of 2026-09-14 (área 9, `N1`)
-- is that gross is the number he recognises, and a per-line gross is that ruling at
-- this grain. It is `line_net + tax_amount` written out, so the row's own
-- arithmetic is the definition and it cannot drift from the two columns beside it.
--
-- ----------------------------------------------------------------------------
-- WHAT IS NOT IN IT, AND TWO OF THE THREE CANNOT BE
-- ----------------------------------------------------------------------------
-- * TRANSFERS between the owner's two stores. §2.4 gives a transfer NO DOCUMENT —
--   `0025`'s header says so in terms, which is why `replay_result` is the only
--   thing that names a transfer id. A transfer exists solely as movements, so
--   there is nothing of this shape to export
-- * STOCK ADJUSTMENTS and physical counts (`0022`, `0023`). Also movements only,
--   with `stock_movement.adjustment_reason` and no header of any kind
-- * WHO, BY NAME. `created_by` is here because it is the only audit handle that
--   exists, and it is a raw uuid because ⚠️ **NOTHING IN THIS SCHEMA CARRIES A
--   HUMAN NAME FOR A MEMBER**: §2.7 never exposes `auth.users`, and
--   `workspace_member` has `user_id`, `role` and `is_active` and no name column.
--   Named as a gap rather than papered over — the same treatment `0014` gives a
--   delisting. It still answers "were these forty sales all one person"
--
-- ⚠️ REVERSALS ARE IN IT AND ARE FLAGGED, NOT EXCLUDED. A void is a second document
-- carrying negated lines (`0003`), and this is a record of what happened rather
-- than a sum, so both appear and `is_reversal` lets the reader show or hide either.
-- ⚠️ A month containing only one half does NOT net out — `0031` measured the seed's
-- delivery reversals landing 2, 2 and 9 days after the document they cancel, so a
-- correction can fall in the following month. That is the ledger being honest about
-- when things were recorded, and it is the first thing a reader of this file will
-- ask about.
--
-- ⚠️ NO `order by` IN THE VIEW. A view's ordering is not a guarantee and sorting
-- 3 448 rows the caller is about to re-sort is waste. The client orders by
-- `day, occurred_at, kind`.
--
-- ⚠️ NO MONTH ARGUMENT, AND THAT IS WHY THIS IS A VIEW AND NOT A FUNCTION. The
-- caller filters on `day`, exactly as `B5`'s argument and `A2`'s ruling say for
-- every other read here: a period baked into the schema is a migration every time
-- he wants a different one.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. transaction_export — A1, the month download  (ADR-035 §2.9)
-- ----------------------------------------------------------------------------

create view public.transaction_export
with (security_invoker = true) as

with lines as (

  -- --- sales -----------------------------------------------------------------
  select 'sale'::text                  as kind,
         s.id                          as document_id,
         sl.id                         as line_id,
         sl.workspace_id,
         sl.location_id,

         s.occurred_at,
         s.recorded_at,
         s.recorded_offline,

         (s.reversal_of is not null)   as is_reversal,
         s.reversal_of,
         s.reversal_reason,
         s.created_by,

         null::uuid                    as provider_id,

         sl.variant_id,
         sl.qty_base,
         sl.qty_display,
         sl.qty_display_unit,
         sl.unit_price_net_per_base,
         sl.line_net,
         sl.tax_amount,
         sl.tax_rate,

         null::text                    as waste_reason,
         null::numeric                 as unit_cost_net_per_base,
         null::date                    as expiry_date

    from public.sale_line sl
    join public.sale s
      on  s.id           = sl.sale_id
      and s.workspace_id = sl.workspace_id
      and s.location_id  = sl.location_id

  union all

  -- --- purchases -------------------------------------------------------------
  -- ⚠️ The provider is the one header fact a sale and a write-off do not have, and
  -- it is the reason `provider_price_memory` (0008) exists. It is carried as an id
  -- here and resolved to a name once, in the outer select.
  select 'purchase'::text,
         p.id,
         pl.id,
         pl.workspace_id,
         pl.location_id,

         p.occurred_at,
         p.recorded_at,
         p.recorded_offline,

         (p.reversal_of is not null),
         p.reversal_of,
         p.reversal_reason,
         p.created_by,

         p.provider_id,

         pl.variant_id,
         pl.qty_base,
         pl.qty_display,
         pl.qty_display_unit,
         pl.unit_price_net_per_base,
         pl.line_net,
         pl.tax_amount,
         pl.tax_rate,

         null::text,
         null::numeric,
         pl.expiry_date

    from public.purchase_line pl
    join public.purchase p
      on  p.id           = pl.purchase_id
      and p.workspace_id = pl.workspace_id
      and p.location_id  = pl.location_id

  union all

  -- --- waste -----------------------------------------------------------------
  -- ⚠️ `reason` is cast to text on purpose. The enum is the right type in the
  -- table — `0003` argues it at length, because free text does not survive three
  -- cashiers spelling caducado four ways — but an export column that a client
  -- writes into a CSV should not make the caller know a Postgres type name.
  --
  -- ⚠️ `unit_cost_net_per_base` IS THE COST COLUMN THAT FENCES THIS VIEW. It is
  -- why `waste_line_select` carries has_role while `waste_select` does not, and it
  -- is the one number in this file a cashier must never read.
  select 'waste'::text,
         w.id,
         wl.id,
         wl.workspace_id,
         wl.location_id,

         w.occurred_at,
         w.recorded_at,
         w.recorded_offline,

         (w.reversal_of is not null),
         w.reversal_of,
         w.reversal_reason,
         w.created_by,

         null::uuid,

         wl.variant_id,
         wl.qty_base,
         wl.qty_display,
         wl.qty_display_unit,
         wl.unit_price_net_per_base,
         wl.line_net,
         wl.tax_amount,
         wl.tax_rate,

         wl.reason::text,
         wl.unit_cost_net_per_base,
         null::date

    from public.waste_line wl
    join public.waste w
      on  w.id           = wl.waste_id
      and w.workspace_id = wl.workspace_id
      and w.location_id  = wl.location_id
)

select l.kind,
       l.document_id,
       l.line_id,

       l.workspace_id,
       l.location_id,
       loc.name                        as location_name,

       -- ⚠️ THE SAME DAY RULE AS ALL FOUR DAILY VIEWS, computed once here rather
       -- than three times in the legs. The trading day is in the STORE's own
       -- timezone (location.timezone, 0012) and comes from the DOCUMENT, never
       -- from the line's created_at — `recorded_offline` makes those differ by up
       -- to 72 hours (§2.6), and 0010 is the migration that exists because an
       -- allocator confused the two. So "August" in this file means August in the
       -- shop, and a month export agrees with product_velocity_daily row for row.
       (l.occurred_at at time zone loc.timezone)::date as day,

       l.occurred_at,
       l.recorded_at,
       l.recorded_offline,

       l.is_reversal,
       l.reversal_of,
       l.reversal_reason,
       l.created_by,

       l.provider_id,
       pr.name                         as provider_name,

       -- Names from the catalog, not snapshotted — 0009's call, repeated by 0031.
       -- A report reads in the product's CURRENT name; money is snapshotted on the
       -- line (0003) and never moves. Names are not money.
       l.variant_id,
       v.name                          as variant_name,
       v.family_id,
       f.name                          as family_name,
       v.base_unit_code,

       -- The shared shape: what moved, in the base unit and as it was typed.
       l.qty_base,
       l.qty_display,
       l.qty_display_unit,

       -- The shared money. Unrounded here because it was rounded once already, on
       -- the line, by §2.5's per-line half-up rule — this view re-rounds nothing
       -- and derives nothing except line_gross.
       l.unit_price_net_per_base,
       l.line_net,
       l.tax_amount,
       l.tax_rate,
       (l.line_net + l.tax_amount)     as line_gross,

       -- The three kind-specific facts, null on the kinds that do not carry them.
       l.waste_reason,
       l.unit_cost_net_per_base,
       l.expiry_date

  from lines l

  join public.location loc
    on  loc.id           = l.location_id
    and loc.workspace_id = l.workspace_id
  join public.product_variant v
    on  v.id           = l.variant_id
    and v.workspace_id = l.workspace_id
  join public.product_family f
    on  f.id           = v.family_id
    and f.workspace_id = v.workspace_id

  -- ⚠️ LEFT, and it is load-bearing: only a purchase has a provider, so an inner
  -- join here would delete every sale and every write-off from the export.
  left join public.provider pr
    on  pr.id           = l.provider_id
    and pr.workspace_id = l.workspace_id

 -- See the header. Inheritance fails OPEN on this view because the sale half is
 -- member-level, and a partial export is a misleading document rather than a
 -- smaller one. Manager-and-above, or zero rows.
 where public.has_role(l.workspace_id, 'manager')
    or not row_security_active('public.purchase_line');


comment on view public.transaction_export is
  'THE MONTH DOWNLOAD (ADR-035 §2.9; plan task 4.6c-iii, area 9 ruling A1). Every '
  'sale, delivery and write-off, ONE ROW PER LINE, in one shape — what an owner who '
  'has always used a notebook checks the app against. Filter on `day`, which is the '
  'trading day in the STORE''s own timezone (location.timezone, 0012) taken from the '
  'document, so a month here is the same month product_velocity_daily and '
  'product_purchases_daily report. ⚠️ SUM WITHIN A KIND, NEVER ACROSS: money leaving '
  'the till on a delivery, arriving on a sale and lost on a write-off are three '
  'directions, and there is deliberately no signed or totalled column that would '
  'invent an accounting convention (area 9 A3 — no derived profit). ⚠️ Document '
  'totals are NOT columns: sum(line_net) = total_net exactly (0003 rounds the lines, '
  'never the document), and repeating a document total on each of its rows is how a '
  'spreadsheet multiplies it by the line count. ⚠️ REVERSALS ARE INCLUDED AND '
  'FLAGGED: a void is a second document with negated lines, and it is dated when it '
  'was RECORDED — the seed''s delivery reversals land 2, 2 and 9 days later — so a '
  'month holding only one half does not net out. Read is_reversal. ⚠️ NOT IN THIS '
  'FILE, AND TWO OF THEM CANNOT BE: transfers between stores and stock adjustments '
  'have NO DOCUMENT AT ALL (§2.4, 0022, 0023) and exist only as movements; and no '
  'human name for created_by exists anywhere in this schema, because auth.users is '
  'never exposed (§2.7) and workspace_member carries no name. ⚠️ MANAGER-AND-ABOVE, '
  'AND THE FENCE IS IN THIS VIEW''S BODY rather than inherited — unlike '
  'product_purchases_daily, this view reads a member-level half (sale, sale_line, '
  'waste) beside a manager-gated one (purchase, purchase_line, waste_line), so '
  'inheritance alone would hand a cashier the sales and silently drop every delivery '
  'and every write-off. A staff caller reads ZERO ROWS: complete, or nothing. The '
  'row_security_active half lets the superuser and service_role through, who bypass '
  'RLS already — see 0009, which states the same sentence for the same reason. No '
  'ORDER BY: sort at the edge.';

comment on column public.transaction_export.kind is
  'sale, purchase or waste — the DIRECTION of the row, and the only thing that says '
  'what line_net means. Three values, never null. A transfer is not among them '
  'because §2.4 gives it no document.';
comment on column public.transaction_export.document_id is
  'The sale, purchase or waste id. ⚠️ Unique only WITH kind: three tables generate '
  'these and nothing makes them unique across all three. Group by (kind, '
  'document_id) to get back to a document.';
comment on column public.transaction_export.line_id is
  'The line''s own id, and the grain of this view. One row per line, so a document '
  'with no lines would not appear at all — nothing can write one today and a check '
  'pins that, because the day something can, it vanishes here and no total moves.';
comment on column public.transaction_export.day is
  'Trading day in the STORE''s own timezone (location.timezone, 0012), taken from '
  'the document''s occurred_at and never from the line''s created_at — '
  'recorded_offline makes those differ by up to 72 hours (§2.6). The same column and '
  'the same rule product_margin_daily, product_waste_daily, product_velocity_daily '
  'and product_purchases_daily use, so no two reports can disagree about which month '
  'a row is in. THIS IS THE COLUMN TO FILTER A MONTH ON.';
comment on column public.transaction_export.recorded_at is
  'When the device reached us, as against occurred_at — when it happened in the '
  'shop. They differ by up to 72 hours on an offline write (§2.6), and the pilot '
  'store is offline a lot. Audit reads this; every total in this schema reads '
  'occurred_at.';
comment on column public.transaction_export.is_reversal is
  'True on the negated document a void writes, never on the one it cancels — '
  'reversal_of names that. Both rows are in the file: this is a record of what '
  'happened, not a sum. ⚠️ A void recorded in the NEXT month leaves this month '
  'overstated, which is the ledger being honest about when things were recorded.';
comment on column public.transaction_export.created_by is
  'The auth user who wrote the document — the only audit handle that exists. ⚠️ A '
  'RAW UUID BECAUSE NO HUMAN NAME IS AVAILABLE ANYWHERE IN THIS SCHEMA: §2.7 never '
  'exposes auth.users and workspace_member carries user_id, role and is_active with '
  'no name column. It still answers "were these forty sales all one person".';
comment on column public.transaction_export.provider_name is
  'Who delivered it. NULL on every sale and write-off, which is the shape of the '
  'view rather than missing data — only a purchase has a provider (0003). Read from '
  'the provider''s CURRENT name, like the catalog names beside it.';
comment on column public.transaction_export.qty_display is
  'What the operator actually typed, in qty_display_unit — the number they '
  'recognise. qty_base is the same quantity normalised to the variant''s base unit '
  '(§2.5), and it is the one to do arithmetic on. Both are here because an export '
  'that shows back only the converted number is an export nobody can check against '
  'a delivery note.';
comment on column public.transaction_export.line_net is
  'The line''s money before IVA, exactly as the document stores it — rounded once, '
  'on the line, by §2.5''s half-up rule, and not re-rounded here. Sums to total_net '
  'over a document and to product_velocity_daily / product_purchases_daily over a '
  'day. ⚠️ Sum within a KIND only.';
comment on column public.transaction_export.line_gross is
  'line_net + tax_amount — what actually changed hands on this line, and the number '
  'the shopkeeper recognises, by the owner''s ruling of 2026-09-14 (area 9, N1) '
  'applied at line grain. Written as the sum of the two columns beside it so the '
  'row''s own arithmetic is the definition. ⚠️ Not a declaration figure: CFDI is out '
  'of scope (ADR-035).';
comment on column public.transaction_export.waste_reason is
  'Why it was thrown away — caducado, dañado, merma de preparación, robo o '
  'faltante, error de captura (0003''s controlled vocabulary, cast to text so a CSV '
  'writer need not know a Postgres enum). NULL on every sale and delivery.';
comment on column public.transaction_export.unit_cost_net_per_base is
  '⚠️ THE COST COLUMN, AND THE REASON THIS VIEW IS FENCED. What the wasted stock had '
  'cost, snapshotted the day it was written off (0003). NULL on sales and deliveries '
  '— a sale line carries a price, not a cost. ⚠️ Zero on a shortfall lot, which under '
  'C8.6 is how a despiece looks: see product_margin_daily''s comment before '
  'concluding that a loss cost nothing.';
comment on column public.transaction_export.expiry_date is
  'Per delivery LINE, because one delivery mixes dates (0003). NULL on sales and '
  'write-offs, and NULL on a delivery line too where the variant does not track '
  'expiry — which never means "does not expire".';


-- ----------------------------------------------------------------------------
-- 2. Access  (ADR-035 §2.7)
-- ----------------------------------------------------------------------------
-- `security_invoker = true`, as §2.7 fixes for every view, so RLS still filters
-- rows for the caller — the predicate in the body is on top of that, not instead
-- of it. The grant is explicit rather than inherited so the intent is reviewable
-- in the migration, exactly as 0003 §7 and 0031 §2 do it.
--
-- ⚠️ `authenticated` and not a narrower role, because there is no narrower role to
-- grant to: §2.7's roles live in workspace_member, not in Postgres, and the fence
-- that matters is the one in the body.

grant select on public.transaction_export to authenticated;
