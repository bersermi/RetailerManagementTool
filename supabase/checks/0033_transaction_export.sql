-- ============================================================================
-- The month export — 0033, plan task 4.6c-iii
-- ============================================================================
-- ADR-035 §2.9 (analytics), §2.7 (access), §2.5 (units and money), §2.3
--
-- Nine claims:
--
--   1. one row per LINE, three kinds, one shape — 3 448 rows over 1 086
--      documents, and the per-kind facts are null exactly where they should be
--      — section 2;
--   2. it RECONCILES three ways: to each document's own total, to the ledger,
--      and to product_velocity_daily and product_purchases_daily DAY FOR DAY.
--      A month in this file is the same month those views report — section 3;
--   3. ⚠️⚠️ THE FENCE IS IN THE BODY AND IT HAD TO BE. The counterfactual is
--      BUILT AND MEASURED inside this file: unfenced, a cashier's "all
--      transactions and waste" is 1 040 rows of ONE kind and $65 549.43, with
--      every delivery and every write-off silently absent — section 4;
--   4. and the fenced view gives her ZERO. Complete, or nothing — asserted
--      under `set role authenticated` as a cashier, a manager, the owner and
--      the other workspace's owner — section 5;
--   5. reversals are IN and FLAGGED, and the cross-month case is REAL in this
--      seed rather than hypothetical: one delivery reversal lands 9 days and
--      one calendar month after the document it cancels — section 6;
--   6. ⚠️ what is NOT in this file and CANNOT be — 30 movements with no
--      document at all, and no human name for anybody — section 7;
--   7. no signed column, no document total repeated per line, no rounding and
--      no ORDER BY — the four things an export gets wrong — section 8;
--   8. the download actually works: August 2026, 664 rows, three kinds — 
--      section 9;
--   9. ⚠️ what this seed CANNOT falsify, pinned rather than papered over —
--      section 10.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/ — `_cleanup.sql` truncates every
-- table but `unit` before each suite, so the seed is gone before the first one
-- runs, and an export over an empty ledger asserts nothing at all. Same reason
-- 0032, 0031, 0014, 0013, 0011 and 0009 give.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

set client_min_messages = warning;
drop table if exists public._verify cascade;
reset client_min_messages;

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;


-- ================================================= 1. pre-flight ==
-- These numbers were read from THIS seed. If it changed, every count below is a
-- claim about a database nobody has.
--
-- ⚠️ `passed` is asserted with `is not true` at the foot of this file rather than
-- with `not passed`: a null condition is a check that did not run, and `not null`
-- is null, so a null would otherwise be counted as a pass.

select chk('pre-flight: 907 sales, 113 deliveries, 66 write-offs — 3 448 lines between them',
           (select count(*) from sale) = 907 and (select count(*) from sale_line) = 2263
       and (select count(*) from purchase) = 113 and (select count(*) from purchase_line) = 1048
       and (select count(*) from waste) = 66 and (select count(*) from waste_line) = 137);

-- ⚠️⚠️ THE PRECONDITION A LINE-GRAIN EXPORT RESTS ON, AND IT IS NOT DECORATION.
-- A document with no lines does not appear in this view at all — it does not
-- appear as a row of zeroes, it is simply absent, and no total anywhere moves to
-- say so. Nothing can write one today. The day something can, this goes red.
select chk('⚠️ PINNED: no document of any kind has ZERO lines, which is what a line-grain export assumes',
           (select count(*) from sale s
             where not exists (select 1 from sale_line l where l.sale_id = s.id)) = 0
       and (select count(*) from purchase p
             where not exists (select 1 from purchase_line l where l.purchase_id = p.id)) = 0
       and (select count(*) from waste w
             where not exists (select 1 from waste_line l where l.waste_id = w.id)) = 0,
           'an empty document would vanish from this file silently — it is not a '
        || 'row of zeroes, it is no row, and nothing else in the schema would say so');


-- ========== 2. ONE ROW PER LINE, THREE KINDS, ONE SHAPE ==

select chk('3 448 rows — one per line, and exactly the three kinds',
           (select count(*) from transaction_export) = 3448
       and (select count(*) from transaction_export where kind = 'sale')     = 2263
       and (select count(*) from transaction_export where kind = 'purchase') = 1048
       and (select count(*) from transaction_export where kind = 'waste')    = 137
       and (select array_agg(distinct kind order by kind) from transaction_export)
           = array['purchase','sale','waste']::text[]);

select chk('over 1 086 documents, and (kind, document_id) is what identifies one',
           (select count(distinct (kind, document_id)) from transaction_export) = 1086
       and (select count(*) from transaction_export) = 3448,
           'three tables generate these ids and nothing makes them unique across '
        || 'all three, which is why the column comment says group by BOTH');

select chk('32 columns, one shape, and no row is missing one of the ten shared facts',
           (select count(*) from information_schema.columns
             where table_schema='public' and table_name='transaction_export') = 32
       and (select count(*) from transaction_export
             where kind is null or document_id is null or line_id is null
                or day is null or occurred_at is null or recorded_at is null
                or variant_id is null or variant_name is null
                or qty_base is null or line_net is null or tax_amount is null
                or line_gross is null or location_name is null) = 0);

-- ⚠️ THE NULLS ARE THE SHAPE, NOT MISSING DATA — and they are null EXACTLY on the
-- kinds that do not carry the fact, never anywhere else.
select chk('the three kind-specific facts are present on their own kind and null on every other',
           (select count(*) from transaction_export
             where (provider_name is not null) <> (kind = 'purchase')) = 0
       and (select count(*) from transaction_export
             where (waste_reason is not null) <> (kind = 'waste')) = 0
       and (select count(*) from transaction_export
             where (unit_cost_net_per_base is not null) <> (kind = 'waste')) = 0
       and (select count(*) from transaction_export
             where expiry_date is not null and kind <> 'purchase') = 0,
           (select 'provider on ' || count(*) filter (where provider_name is not null)
                || ', reason on ' || count(*) filter (where waste_reason is not null)
                || ', cost on ' || count(*) filter (where unit_cost_net_per_base is not null)
                || ', expiry on ' || count(*) filter (where expiry_date is not null)
              from transaction_export));

select chk('⚠️ expiry is NULL on 627 delivery lines too, and that never means "does not expire"',
           (select count(*) from transaction_export
             where kind = 'purchase' and expiry_date is not null) = 421
       and (select count(*) from transaction_export
             where kind = 'purchase' and expiry_date is null) = 627,
           'ADR-017''s three tiers: manual, else the family lifespan, else null — '
        || 'null is "this variant does not track expiry", which is a different fact '
        || 'from "it keeps for ever"');

select chk('all five waste reasons appear, spelled by the enum and not by three cashiers',
           (select array_agg(distinct waste_reason order by waste_reason)
              from transaction_export where waste_reason is not null)
           = array['caducado','dañado','error de captura','merma de preparación','robo o faltante']::text[],
           (select string_agg(waste_reason || ' ' || c::text, ', ' order by waste_reason)
              from (select waste_reason, count(*) c from transaction_export
                     where waste_reason is not null group by 1) x));


-- ========== 3. IT RECONCILES THREE WAYS, WHICH IS WHAT AN EXPORT IS FOR ==
-- The owner checks this file against a notebook. If it disagrees with the screens
-- built on the same ledger, he is the one who finds out.

select chk('every document''s lines sum to its own stored total — all three kinds, to the centavo',
           (select count(*) from (
              select s.id, s.total_net, s.total_tax,
                     sum(e.line_net) n, sum(e.tax_amount) t
                from sale s join transaction_export e
                  on e.kind = 'sale' and e.document_id = s.id
               group by 1,2,3) x where total_net <> n or total_tax <> t) = 0
       and (select count(*) from (
              select p.id, p.total_net, p.total_tax,
                     sum(e.line_net) n, sum(e.tax_amount) t
                from purchase p join transaction_export e
                  on e.kind = 'purchase' and e.document_id = p.id
               group by 1,2,3) x where total_net <> n or total_tax <> t) = 0
       and (select count(*) from (
              select w.id, w.total_net, w.total_tax,
                     sum(e.line_net) n, sum(e.tax_amount) t
                from waste w join transaction_export e
                  on e.kind = 'waste' and e.document_id = w.id
               group by 1,2,3) x where total_net <> n or total_tax <> t) = 0,
           '0003 rounds the LINES and never the document, so this is an equality '
        || 'and not an approximation — which is also why total_net is not a column '
        || 'here: repeated on every line, somebody sums it');

select chk('and to the LEDGER: 138 673.24 sold, 623 384.19 bought, 4 467.39 written off',
           (select sum(line_net) from transaction_export where kind='sale')     = 138673.24
       and (select sum(line_net) from transaction_export where kind='purchase') = 623384.19
       and (select sum(line_net) from transaction_export where kind='waste')    = 4467.39
       and (select sum(line_net) from transaction_export where kind='sale')
         = (select sum(line_net) from sale_line)
       and (select sum(line_net) from transaction_export where kind='purchase')
         = (select sum(line_net) from purchase_line)
       and (select sum(line_net) from transaction_export where kind='waste')
         = (select sum(line_net) from waste_line));

select chk('line_gross is the two columns beside it, every row — 147 581.88 / 659 766.19 / 4 671.28',
           (select count(*) from transaction_export
             where line_gross is distinct from line_net + tax_amount) = 0
       and (select sum(line_gross) from transaction_export where kind='sale')     = 147581.88
       and (select sum(line_gross) from transaction_export where kind='purchase') = 659766.19
       and (select sum(line_gross) from transaction_export where kind='waste')    = 4671.28,
           'the row''s own arithmetic is the definition, so it cannot drift — the '
        || 'owner''s ruling of 2026-09-14 (area 9 N1) at line grain');

-- ⚠️⚠️ THE STRONGEST ONE. Not "the totals agree" but "they agree DAY FOR DAY",
-- which is the claim that says the day rule in this view is the same day rule the
-- four daily views use. A timezone or an occurred_at/created_at slip would leave
-- the totals identical and move rows between months.
select chk('⚠️⚠️ AND DAY FOR DAY against product_velocity_daily and product_purchases_daily — 0 mismatches',
           (select count(*) from
              (select day, sum(line_net) n from transaction_export where kind='sale' group by 1) e
              full outer join
              (select day, sum(revenue_net) n from product_velocity_daily group by 1) v using (day)
             where coalesce(e.n,0) <> coalesce(v.n,0)) = 0
       and (select count(*) from
              (select day, sum(line_net) n from transaction_export where kind='purchase' group by 1) e
              full outer join
              (select day, sum(purchases_net) n from product_purchases_daily group by 1) p using (day)
             where coalesce(e.n,0) <> coalesce(p.n,0)) = 0,
           'a month in this file is the same month those views report. The day '
        || 'comes from the DOCUMENT in the STORE''s timezone (0012) — never from '
        || 'the line''s created_at, which recorded_offline moves by up to 72 hours');

select chk('and the day is the store''s own, discovered from location.timezone rather than hardcoded',
           pg_get_viewdef('public.transaction_export'::regclass) !~* 'AT TIME ZONE ''[A-Za-z]+/'
       and pg_get_viewdef('public.transaction_export'::regclass) ~* 'timezone');

-- ⚠️⚠️ THIS ONE IS STRUCTURAL AND IT HAS TO BE, WHICH THE FALSIFICATIONS PROVED
-- RATHER THAN THE REVIEW. Fixture G4 swapped the day's source from the document's
-- `occurred_at` to its `recorded_at` — the exact §2.6 confusion `0010` exists
-- because of — and **NOTHING IN THIS FILE WENT RED**, the day-for-day
-- reconciliation above included.
--
-- The reason is measured in section 10: `recorded_at = occurred_at` on all 3 448
-- rows of this seed, because no row is `recorded_offline`. So every behavioural
-- assertion about the day is VACUOUS on this axis — they all pass whichever column
-- the view reads, and would go on passing on the day a real offline write makes
-- the two differ by up to 72 hours and silently moves rows between months.
--
-- A structural claim is the only kind that can hold it until a seed carries an
-- offline document. G4 turns this red.
select chk('⚠️⚠️ the day is bucketed from occurred_at — STRUCTURALLY, because this seed cannot tell',
           pg_get_viewdef('public.transaction_export'::regclass)
             ~* 'l\.occurred_at AT TIME ZONE loc\.timezone'
       and pg_get_viewdef('public.transaction_export'::regclass)
             !~* 'recorded_at AT TIME ZONE',
           'occurred_at is when it happened in the shop and recorded_at is when the '
        || 'device reached us; §2.6 lets them differ by 72 hours, every total in '
        || 'this schema reads the first, and 0010 is the migration that exists '
        || 'because an allocator confused them');


-- ========== 4. ⚠️⚠️ THE COUNTERFACTUAL, BUILT AND MEASURED ==
-- The migration says inheritance alone would hand a cashier a partial file. That
-- is an argument until somebody builds the unfenced view and looks, so this
-- section builds it, measures it as her, and rolls it back.
--
-- ⚠️ `_`-prefixed, which is the convention 0031 established for harness objects
-- after 0011's completeness assertion reported this file's own scaffolding.
--
-- ⚠️⚠️ THE VIEW IS CREATED AND DROPPED OUTSIDE A TRANSACTION, AND THE FIRST
-- SPELLING OF THIS SECTION GOT THAT WRONG IN A WAY ONLY THIS FILE'S LAST CHECK
-- COULD SEE. It wrapped the whole block in `begin … rollback` to clean the view
-- up — and the rollback discarded the two `chk()` rows the block had just
-- written, because `chk()` is an INSERT like any other. The sequence had advanced
-- to 39 and the table held 37: **two checks ran, passed, and were thrown away**,
-- and the suite would have reported "all 38 passed" with its loudest measurement
-- missing. Caught on the first run by the `did not throw away any of its own
-- results` check at the foot of this file, which exists for exactly this.
--
-- It is the same family as this repository's "green check that stopped measuring
-- its own claim", arriving from a new direction: not a check that stopped being
-- true, but a check whose RESULT never landed. Role-switch blocks here `commit`,
-- as 0031's do; only the cleanup is outside.

create view public._export_unfenced with (security_invoker = true) as
  select 'sale'::text as kind, sl.workspace_id, sl.location_id, sl.line_net
    from public.sale_line sl
    join public.sale s on s.id = sl.sale_id
  union all
  select 'purchase', pl.workspace_id, pl.location_id, pl.line_net
    from public.purchase_line pl
    join public.purchase p on p.id = pl.purchase_id
  union all
  select 'waste', wl.workspace_id, wl.location_id, wl.line_net
    from public.waste_line wl
    join public.waste w on w.id = wl.waste_id;
grant select on public._export_unfenced to authenticated;

begin;

select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'caja.centro@tienda.mx')), true);
set local role authenticated;

select chk('⚠️⚠️ UNFENCED, A CASHIER''S "ALL TRANSACTIONS AND WASTE" IS 1 040 ROWS OF ONE KIND',
           (select count(*) from _export_unfenced) = 1040
       and (select count(distinct kind) from _export_unfenced) = 1
       and (select min(kind) from _export_unfenced) = 'sale'
       and (select sum(line_net) from _export_unfenced) = 65549.43,
           (select 'she would download ' || count(*) || ' rows, kinds: '
                || string_agg(distinct kind, ', ') || ', $' || sum(line_net)
                || ' — headed "all transactions and waste", with every delivery '
                || 'and every write-off silently absent'
              from _export_unfenced));

select chk('and the FENCED view gives her nothing at all, which is the decision',
           (select count(*) from transaction_export) = 0,
           'a partial export is worse than no export: it is a document somebody '
        || 'reconciles against a notebook, and the app loses that argument while '
        || 'being right. Complete, or nothing');

commit;

drop view public._export_unfenced;

select chk('the counterfactual left nothing behind, and this file kept both of its results',
           (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname = '_export_unfenced') = 0
       and (select count(*) from public._verify
                 where label like '%UNFENCED%' or label like '%FENCED view gives her nothing%') = 2,
           'the second half is not decoration: a `rollback` here would take the two '
        || 'rows above with it, and the report would be short by its loudest '
        || 'measurement without a single FAIL');

select chk('the counterfactual view is gone',
           (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname = '_export_unfenced') = 0);


-- ========== 5. THE FENCE, FROM FOUR SIDES ==

select chk('the fence is IN THE BODY, and it is 0009''s sentence — not a policy and not a grant',
           pg_get_viewdef('public.transaction_export'::regclass) ~* 'has_role'
       and pg_get_viewdef('public.transaction_export'::regclass) ~* 'row_security_active'
       and (select count(*) from pg_policies where schemaname='public') = 41,
           'the only other view in this schema that states its own fence is 0009, '
        || 'and for the same reason: a member-level half that would be left '
        || 'standing when the gated half disappears');

select chk('⚠️ the three fences it reads across really are different — measured from pg_policies',
           (select qual::text from pg_policies where schemaname='public'
             and tablename='sale_line' and policyname='sale_line_select') !~* 'has_role'
       and (select qual::text from pg_policies where schemaname='public'
             and tablename='waste' and policyname='waste_select') !~* 'has_role'
       and (select qual::text from pg_policies where schemaname='public'
             and tablename='waste_line' and policyname='waste_line_select') ~* 'has_role'
       and (select qual::text from pg_policies where schemaname='public'
             and tablename='purchase_line' and policyname='purchase_line_select') ~* 'has_role',
           'sale and waste HEADERS are member-level; waste_line and purchase_line '
        || 'are manager, because those two carry cost. Three combinations in one '
        || 'view, which is why one fence had to be written down');

select chk('and the sentinel is safe: BOTH gated tables still have RLS enabled',
           (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname in ('purchase_line','waste_line')
               and c.relrowsecurity) = 2,
           'row_security_active is a property of the CALLER, so one sentinel is '
        || 'enough — but only while every gated table it stands for is still '
        || 'fenced. This is what stops the sentinel becoming the last one');

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'rosa.gerente@tienda.mx')), true);
set local role authenticated;
select chk('a MANAGER reads 2 612 rows and all three kinds, including the 92 cost-bearing waste lines',
           (select count(*) from transaction_export) = 2612
       and (select count(distinct kind) from transaction_export) = 3
       and (select count(*) from transaction_export where kind='waste') = 92
       and (select count(*) from transaction_export where unit_cost_net_per_base is not null) = 92,
           (select 'rows ' || count(*) || ', kinds ' || count(distinct kind)
              from transaction_export));
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'lupe.owner@tienda.mx')), true);
set local role authenticated;
select chk('the OWNER reads the same 2 612 across BOTH his stores — consolidated is the default (§2.9)',
           (select count(*) from transaction_export) = 2612
       and (select count(distinct location_id) from transaction_export) = 2,
           'per location is the drill-down, and it is a where clause rather than a '
        || 'second view');
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'roble.owner@tienda.mx')), true);
set local role authenticated;
select chk('and the OTHER workspace''s owner reads his own 836 rows and not one of these',
           (select count(*) from transaction_export) = 836
       and (select count(*) from transaction_export e
              join location l on l.id = e.location_id
             where l.name like 'Doña Lupe%') = 0,
           'the body predicate is on top of RLS, never instead of it — '
        || 'security_invoker still filters the rows');
commit;

select chk('the view is security_invoker, which is what makes that sentence true',
           (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname='transaction_export'
               and c.reloptions::text ~* 'security_invoker=true') = 1);

select chk('anon gets no SELECT and nobody gets a write',
           (select count(*) from information_schema.role_table_grants
             where table_schema='public' and table_name='transaction_export'
               and grantee='anon' and privilege_type='SELECT') = 0
       and (select count(*) from information_schema.role_table_grants
             where table_schema='public' and table_name='transaction_export'
               and grantee in ('anon','authenticated')
               and privilege_type in ('INSERT','UPDATE','DELETE')) = 0);


-- ========== 6. REVERSALS ARE IN, FLAGGED, AND ONE OF THEM CROSSES A MONTH ==

select chk('38 reversal LINES from 7 reversal documents — 3 sales, 3 deliveries, 1 write-off',
           (select count(*) from transaction_export where is_reversal) = 38
       and (select count(distinct (kind, document_id)) from transaction_export
             where is_reversal) = 7
       and (select count(distinct document_id) from transaction_export
             where is_reversal and kind='purchase') = 3);

select chk('is_reversal marks the negated document, never the one it cancels',
           (select count(*) from transaction_export
             where is_reversal <> (reversal_of is not null)) = 0
       and (select count(*) from transaction_export e
             where e.is_reversal
               and not exists (select 1 from transaction_export o
                                where o.kind = e.kind
                                  and o.document_id = e.reversal_of)) = 0,
           'both halves are in the file, because this is a record of what happened '
        || 'rather than a sum');

-- ⚠️⚠️ NOT HYPOTHETICAL. The one thing a reader of a month export will get wrong.
select chk('⚠️⚠️ ONE DELIVERY REVERSAL LANDS 9 DAYS AND A CALENDAR MONTH AFTER WHAT IT CANCELS',
           (select count(*) from (
              select r.kind, min(r.day) rev_day, min(o.day) orig_day
                from transaction_export r
                join transaction_export o
                  on o.kind = r.kind and o.document_id = r.reversal_of
               where r.is_reversal
               group by r.kind, r.document_id) x
             where date_trunc('month', rev_day) <> date_trunc('month', orig_day)) = 1,
           'so a month export holding only one half does NOT net out. That is the '
        || 'ledger being honest about when things were RECORDED, it is 0031''s '
        || 'finding at document grain, and it is the first question a reader asks');


-- ========== 7. WHAT IS NOT IN IT, AND TWO OF THE THREE CANNOT BE ==

select chk('⚠️ 30 stock movements have NO DOCUMENT AT ALL — 15 transfers out, 15 in',
           (select count(*) from stock_movement
             where sale_id is null and purchase_id is null and waste_id is null) = 30
       and (select count(*) from information_schema.tables
             where table_schema='public' and table_name in ('transfer','transfer_line')) = 0,
           '§2.4 gives a transfer no header — 0025''s own reason for replay_result '
        || 'naming a transfer id — and an adjustment has none either. They exist '
        || 'only as movements, so there is nothing of this shape to export. Not an '
        || 'omission: a table that does not exist');

select chk('and the export ships exactly three kinds, with no fourth waiting to be added',
           (select count(distinct kind) from transaction_export) = 3
       and pg_get_viewdef('public.transaction_export'::regclass) !~* 'transfer'
       and pg_get_viewdef('public.transaction_export'::regclass) !~* 'stock_movement');

-- ⚠️⚠️ RE-CUT 2026-09-18 BY `0034`, AND IT WENT RED FIRST — WHICH IS THE POINT.
-- This check used to read, in part, "`workspace_member` has no name column", and
-- on 2026-09-18 `0034` added `display_name` to exactly that table (plan task
-- `5b.8-i`). The check fired, by name, on the day the column landed, in a file
-- nobody had thought to look at: `docs/PLAN.md`'s `R6` named the PROSE copy of
-- this claim in `supabase/README.md` and did not know the claim had a
-- machine-readable twin standing over the seed.
--
-- ⚠️ BUMPING IT — deleting the `workspace_member` clause and moving on — would
-- have handed the claim away, which is `0032`'s recorded lesson one migration
-- earlier. THE CLAIM IS STILL TRUE AND IS STILL THE ONE WORTH PINNING: the
-- month export names nobody. What changed is the REASON, and the change makes
-- the assertion stronger rather than weaker. It used to hold because no name
-- existed anywhere in the schema; it now holds because a name exists ONE JOIN
-- AWAY and this view deliberately does not reach for it. So the shape below is
-- a property of the VIEW — it reads neither `auth.users` nor the table that now
-- carries a name, and it exposes no name-shaped column of its own — and it goes
-- red on precisely the change the sentence forbids: somebody adding the join
-- because it looks like an improvement.
select chk('⚠️ THE EXPORT STILL NAMES NOBODY — and as of 0034 that is a choice, not an absence',
           (select count(*) from transaction_export where created_by is null) = 0
       and pg_get_viewdef('public.transaction_export'::regclass) !~* 'auth\.users'
       and pg_get_viewdef('public.transaction_export'::regclass) !~* 'workspace_member'
       -- ⚠️ NOT `column_name like '%name%'`: this view carries four names
       -- already — location, provider, variant, family — and none of them is a
       -- PERSON. The list is people-shaped on purpose.
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='transaction_export'
               and column_name in ('created_by_name', 'member_name', 'user_name',
                                   'staff_name', 'full_name', 'display_name',
                                   'email')) = 0
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='workspace_member'
               and column_name = 'display_name') = 1,
           (select 'a raw uuid, and ' || count(distinct created_by)
                || ' distinct people wrote these documents. §2.7 still never exposes '
                || 'auth.users, and workspace_member.display_name now EXISTS (0034) '
                || 'and is not joined — so the export can say WHETHER two rows are '
                || 'the same person and never WHO'
              from transaction_export));


-- ========== 8. THE FOUR THINGS AN EXPORT GETS WRONG ==

select chk('⚠️ NO signed, normalised or totalled money column — kind carries the direction',
           (select count(*) from information_schema.columns
             where table_schema='public' and table_name='transaction_export'
               and (column_name like '%signed%' or column_name like '%total%'
                    or column_name like '%margin%' or column_name like '%profit%'
                    or column_name like '%balance%')) = 0,
           'money leaving the till on a delivery, arriving on a sale and lost on a '
        || 'write-off are three directions; a column that summed them would be '
        || 'inventing an accounting convention area 9 A3 cancelled');

select chk('and the document total is NOT repeated on every line, which is the spreadsheet trap',
           (select count(*) from information_schema.columns
             where table_schema='public' and table_name='transaction_export'
               and column_name in ('total_net','total_tax','document_total')) = 0
       and (select count(*) from (select kind, document_id, count(*) c
                                    from transaction_export group by 1,2) x
             where c > 1) > 0,
           (select 'documents carrying more than one line: ' || count(*)
                || ' — each would have multiplied its own total by its line count'
              from (select kind, document_id from transaction_export
                     group by 1,2 having count(*) > 1) y));

select chk('nothing is rounded and nothing is divided — the line was rounded once, by §2.5, on the line',
           pg_get_viewdef('public.transaction_export'::regclass) !~* 'round\s*\('
       and regexp_count(pg_get_viewdef('public.transaction_export'::regclass), '/') = 0);

select chk('and there is no ORDER BY — sorting 3 448 rows the caller re-sorts is waste',
           pg_get_viewdef('public.transaction_export'::regclass) !~* 'ORDER BY');

-- ⚠️ THE LEFT JOIN IS LOAD-BEARING AND AN INNER ONE WOULD LOOK CORRECT.
select chk('⚠️ the provider join is LEFT — an inner one would delete every sale and write-off',
           pg_get_viewdef('public.transaction_export'::regclass) ~* 'LEFT JOIN provider'
       and (select count(*) from transaction_export where kind <> 'purchase') = 2400,
           'only a delivery has a provider, so 2 400 of 3 448 rows have none — and '
        || 'they would not be missing a column, they would be missing entirely');


-- ========== 9. THE DOWNLOAD, AS IT WILL ACTUALLY BE TAKEN ==
-- Not a shape check: the month an owner would pick, filtered the way the client
-- filters it, end to end.

select chk('✅ August 2026: 664 rows, all three kinds, $139 590.25 gross across the file',
           (select count(*) from transaction_export
             where day >= date '2026-08-01' and day < date '2026-09-01') = 664
       and (select count(distinct kind) from transaction_export
             where day >= date '2026-08-01' and day < date '2026-09-01') = 3
       and (select sum(line_gross) from transaction_export
             where day >= date '2026-08-01' and day < date '2026-09-01') = 139590.25,
           (select string_agg(kind || ' ' || c::text, ', ' order by kind)
              from (select kind, count(*) c from transaction_export
                     where day >= date '2026-08-01' and day < date '2026-09-01'
                     group by 1) x));

select chk('and the file spans four months, so a month filter is doing real work',
           (select count(distinct date_trunc('month', day)) from transaction_export) = 4
       and (select min(day) from transaction_export) = date '2026-05-19'
       and (select max(day) from transaction_export) = date '2026-08-21');


-- ========== 10. WHAT THIS SEED CANNOT FALSIFY ==

-- ⚠️⚠️ THE GAP THAT MATTERS MOST HERE, AND THE FALSIFICATIONS FOUND IT RATHER THAN
-- THE REVIEW. It is not merely that recorded_offline is untested — it is that
-- `recorded_at` and `occurred_at` are EQUAL ON EVERY ROW, so no behavioural check
-- in this file can tell the two apart. Fixture G4 swapped the day's source from one
-- to the other and NOTHING WENT RED, day-for-day reconciliation included. The
-- structural assertion in section 3 is what holds it in the meantime, and it is
-- marked as structural for that reason rather than out of caution.
select chk('⚠️⚠️ PINNED: recorded_at EQUALS occurred_at on all 3 448 rows, so no BEHAVIOURAL check can separate them',
           (select count(*) from transaction_export where recorded_offline) = 0
       and (select count(*) from transaction_export
                 where recorded_at is distinct from occurred_at) = 0,
           'the pilot store is offline a lot and §2.6 lets the two differ by up to 72 '
        || 'hours, so the gap this export exists to show — it happened Monday, we '
        || 'heard on Wednesday — is a gap of ZERO everywhere in this fixture. The day '
        || 'a seed carries one offline document, this goes red, the day-for-day '
        || 'reconciliation in section 3 starts doing real work, and both timestamp '
        || 'columns begin earning their place');

select chk('⚠️ PINNED: no document in this seed carries a line for the SAME variant twice',
           (select count(*) from (select kind, document_id, variant_id, count(*) c
                                    from transaction_export group by 1,2,3) x
             where c > 1) = 0,
           'so nothing here can tell a per-line export from a per-variant one. It '
        || 'is a line export by construction and by its line_id, and the day a '
        || 'delivery splits a variant across two lines this check goes red and the '
        || 'distinction starts to matter');

select chk('this file did not throw away any of its own results',
           (select max(n) from public._verify) = (select count(*) from public._verify),
           (select 'highest number ' || max(n) || ', rows ' || count(*) from public._verify));


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  -- ⚠️ `is not true`, NOT `not passed`. See the pre-flight block.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% transaction-export check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % transaction-export checks passed', (select count(*) from public._verify);
end;
$$;
