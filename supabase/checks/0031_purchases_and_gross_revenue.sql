-- ============================================================================
-- What I bought, and revenue the shopkeeper recognises — 0031, plan task 4.6c-i
-- ============================================================================
-- ADR-035 §2.9 (analytics), §2.7 (access), §2.5 (units and money)
--
-- Nine claims:
--
--   1. ⚠️⚠️ THE FENCE PROBLEM THE PLAN PUT AT THE TOP OF THIS TASK DOES NOT
--      EXIST. `sale_line.tax_amount` is member-level and always was; only
--      product_margin_daily's copy of it is manager-only. So gross revenue cost
--      no policy, no security definer and no widening — section 2;
--   2. revenue is GROSS with net beside it (the owner's ruling of 2026-09-14),
--      and the `create or replace` added three columns without moving one peso
--      or one row of what 0013/0014 already returned — section 3;
--   3. purchases are a first-class read at last, and they agree ROW FOR ROW with
--      the copy buried inside product_waste_daily — section 4;
--   4. ⚠️ voided deliveries are not excluded and do NOT cancel inside a day, so a
--      daily chart shows negative bars. Named, counted, and the day gap that
--      causes it measured — section 5;
--   5. the purchases view is manager-and-above by INHERITANCE, with no has_role
--      predicate of its own, and it fails CLOSED — asserted under
--      `set role authenticated` as a cashier, a manager and the other
--      workspace's owner — section 6;
--   6. B8's honesty comment on 0009 says what `cost_attributed` cannot, and the
--      seed holds the case that proves the gap is real — section 7;
--   7. 0030's function comment is corrected and THE SCHEMA IT DESCRIBES DID NOT
--      MOVE: the owner's ruling of 2026-09-14 is still held by 0030's checks,
--      not by this one — section 8;
--   8. ⚠️ what this seed CANNOT falsify, pinned rather than papered over —
--      section 9;
--   9. the fourth analytics view reads location.timezone like the other three,
--      and 0011's guard now discovers a fifth instead of trusting a list —
--      section 10.
--
-- WHY THIS IS NOT A FILE IN supabase/tests/ — `_cleanup.sql` truncates every
-- table but `unit` before each suite, so the seed is gone before the first one
-- runs. 1.7, 2.1, 2.2, 2.3, 2.4 and 0014 all give this reason, and a view over an
-- empty ledger asserts nothing at all.
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

select id from location where name = 'Doña Lupe Centro' \gset centro_
select workspace_id as ws from workspace_member wm join auth.users u on u.id = wm.user_id
 where u.email = 'lupe.owner@tienda.mx' \gset lupe_


-- ================================================= 1. pre-flight ==
-- These numbers were read from THIS seed. If it changed, every count below is a
-- claim about a database nobody has.

select chk('pre-flight: 1 048 purchase lines, 2 263 sale lines, 1 zero-cost lot',
           (select count(*) from purchase_line) = 1048
       and (select count(*) from sale_line)     = 2263
       and (select count(*) from stock_batch where unit_cost_net_per_base = 0) = 1,
           (select (select count(*) from purchase_line) || ' purchase lines, '
                || (select count(*) from sale_line) || ' sale lines'));

do $$
declare v_failed integer;
begin
  -- ⚠️ `is not true`, NOT `not passed`. A check whose condition evaluates to NULL
  -- prints FAIL in the table above and is INVISIBLE to `not passed`, because
  -- `not null` is null and a null WHERE clause keeps no rows. Found in plan task
  -- 4b-i, closed across supabase/checks/ in 4c-i.
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception 'PRE-FLIGHT FAILED (% check(s)): the seed is not the one these '
      'numbers were read from.', v_failed;
  end if;
end;
$$;


-- ===== 2. ⚠️⚠️ THE FENCE PROBLEM DOES NOT EXIST, AND THAT IS THE FINDING ==
-- docs/PLAN.md's area 9 row N1, and the 4.6c-i row quoting it, both say the tax
-- gross revenue needs "lives today only in the manager-only product_margin_daily,
-- so reaching it without widening that fence is this task's first design problem."
--
-- It is true of the VIEWS and false of the COLUMNS, and the difference is the
-- whole of this task's opening move. Both halves are asserted, because "there was
-- no problem" is the kind of claim that must be measured rather than asserted by
-- the person who wanted it to be true.

select chk('⚠️ sale_line_select carries NO has_role — a cashier reads the tax column',
           (select qual::text from pg_policies
             where schemaname='public' and tablename='sale_line' and policyname='sale_line_select')
           !~* 'has_role',
           (select qual::text from pg_policies
             where schemaname='public' and tablename='sale_line' and policyname='sale_line_select'));

select chk('and purchase_line_select DOES — so the purchases half is fenced and the sales half is not',
           (select qual::text from pg_policies
             where schemaname='public' and tablename='purchase_line' and policyname='purchase_line_select')
           ~* 'has_role');

select chk('the tax is a column on a member-level table, not a column on 0009',
           (select count(*) from information_schema.columns
             where table_schema='public' and table_name='sale_line' and column_name='tax_amount') = 1);

-- ⚠️ THE MEASUREMENT THAT SETTLES IT. Same session, same caller: every peso of tax
-- in her own store, and not one row of the view that was supposed to be the only
-- way to it.
begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'caja.centro@tienda.mx')), true);
set local role authenticated;

select chk('⚠️⚠️ a CASHIER reads 1 040 sale lines carrying $4 826.96 of tax, and ZERO rows of product_margin_daily',
           (select count(*) from sale_line) = 1040
       and (select sum(tax_amount) from sale_line) = 4826.96
       and (select count(*) from product_margin_daily) = 0,
           (select 'tax reachable: ' || coalesce(sum(tax_amount),0)::text
                || ', margin rows: ' || (select count(*) from product_margin_daily)
              from sale_line));
commit;

-- And the number she reaches is the SAME number 0009 fences — which is why the new
-- column carries 0009's name for it rather than inventing a second one.
select chk('velocity.tax_collected = margin.tax_collected ROW FOR ROW, and revenue_net too',
           (select count(*) from product_velocity_daily v
              join product_margin_daily m
                using (workspace_id, location_id, variant_id, day)
             where v.tax_collected is distinct from m.tax_collected
                or v.revenue_net   is distinct from m.revenue_net) = 0,
           'one number, one name, two views — so nobody can prove they disagree');

-- ⚠️ THE GRANT HALF IS ASSERTED AGAINST THE PRECEDENT RATHER THAN AGAINST A
-- HAND-WRITTEN LIST, because the first spelling of this check got it wrong and the
-- database said so. Supabase's default privileges on `public` hand `anon` and
-- `authenticated` REFERENCES, TRIGGER and TRUNCATE on every view in this schema —
-- none of which is a meaningful privilege on a view — so "the only grant is one
-- SELECT" is false of product_waste_daily and product_margin_daily too. The claim
-- worth making is that the new view reaches EXACTLY as far as the manager-gated
-- view it was modelled on, and no further.
select chk('0031 moved no fence: five policies untouched, and the grants MATCH product_waste_daily''s',
           (select count(*) from pg_policies where schemaname='public'
             and tablename in ('sale_line','purchase_line','purchase','sale','failed_write')
             and policyname in ('sale_line_select','purchase_line_select','purchase_select',
                                'sale_select','failed_write_select')) = 5
       and (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type)
              from information_schema.role_table_grants
             where table_schema='public' and table_name='product_purchases_daily'
               and grantee in ('anon','authenticated'))
         = (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type)
              from information_schema.role_table_grants
             where table_schema='public' and table_name='product_waste_daily'
               and grantee in ('anon','authenticated')),
           (select string_agg(grantee || ':' || privilege_type, ',' order by grantee, privilege_type)
              from information_schema.role_table_grants
             where table_schema='public' and table_name='product_purchases_daily'
               and grantee in ('anon','authenticated')));

select chk('and the part of that which actually matters: anon gets no SELECT, nobody gets a write',
           (select count(*) from information_schema.role_table_grants
             where table_schema='public' and table_name='product_purchases_daily'
               and grantee = 'anon' and privilege_type = 'SELECT') = 0
       and (select count(*) from information_schema.role_table_grants
             where table_schema='public' and table_name='product_purchases_daily'
               and grantee in ('anon','authenticated')
               and privilege_type in ('INSERT','UPDATE','DELETE')) = 0,
           'REFERENCES, TRIGGER and TRUNCATE on a VIEW are not reach — SELECT is, '
        || 'and only authenticated has it');


-- ========== 3. REVENUE IS GROSS, NET IS STILL BESIDE IT, AND NOTHING MOVED ==
-- Ruled by the owner 2026-09-14. The risk of a `create or replace` on an applied,
-- staff-readable view is that it quietly changes a number somebody already reads,
-- so the first two checks here are about what did NOT change.

-- ⚠️ RE-SIGNED 2026-09-14 BY 0032, WHICH APPENDED FOUR PRICE COLUMNS: 22 → 26.
-- The row and pair counts are the claim that matters and neither moved.
select chk('the replace added 3 columns and not one row: still 30 472 rows over 510 pairs (26 columns since 0032)',
           (select count(*) from product_velocity_daily) = 30472
       and (select count(*) from (select workspace_id, location_id, variant_id
                                    from product_velocity_daily group by 1,2,3) x) = 510
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='product_velocity_daily') = 26);

select chk('and not one peso of what it already returned: revenue_net still 138 673.24',
           (select sum(revenue_net) from product_velocity_daily) = 138673.24
       and (select sum(revenue_net) from product_velocity_daily)
         = (select sum(line_net) from sale_line)
       and (select sum(qty_base_sold) from product_velocity_daily)
         = (select sum(qty_base) from sale_line));

select chk('⚠️ GROSS reconciles to the ledger: 147 581.88 = net 138 673.24 + tax 8 908.64',
           (select sum(revenue_gross) from product_velocity_daily) = 147581.88
       and (select sum(revenue_gross) from product_velocity_daily)
         = (select sum(line_net + tax_amount) from sale_line)
       and (select sum(tax_collected) from product_velocity_daily)
         = (select sum(tax_amount) from sale_line),
           (select 'gross ' || sum(revenue_gross) || ' over ' || count(*) || ' rows'
              from product_velocity_daily));

select chk('revenue_gross is the row''s own arithmetic — net + tax on EVERY row, no exceptions',
           (select count(*) from product_velocity_daily
             where revenue_gross is distinct from revenue_net + tax_collected) = 0);

-- ⚠️ THE ANTI-VACUITY CHECK. A `revenue_gross` that was a copy of `revenue_net`
-- would pass every reconciliation above on a shop that sells only IVA-exempt
-- goods. This seed is not that shop, and the split is the Mexican basket: basic
-- groceries carry no IVA, drinks and cleaning products do.
select chk('⚠️ gross is NOT a copy of net: 964 selling buckets differ, 1 175 legitimately do not',
           (select count(*) from product_velocity_daily where line_count > 0 and revenue_gross <> revenue_net) = 964
       and (select count(*) from product_velocity_daily where line_count > 0 and revenue_gross  = revenue_net) = 1175,
           'the second number is the IVA-exempt basket, not a bug — a check that '
        || 'only ever saw zero-rated goods would pass while measuring nothing');

select chk('trailing_revenue_gross is the 28-day window of revenue_gross, recomputed independently',
           (select count(*) from (
              select trailing_revenue_gross,
                     sum(revenue_gross) over (partition by workspace_id, location_id, variant_id
                                              order by day
                                              range between interval '28 days' preceding
                                                        and interval  '1 day'  preceding) as recomputed
                from product_velocity_daily) x
             where x.trailing_revenue_gross is distinct from x.recomputed) = 0,
           'the window is attached to gross, not to net with a gross label');

-- ⚠️⚠️ RE-CUT 2026-09-14 BY 0032, AND THE RE-CUT IS THE POINT. This check read
-- "the view still ships no rate, ratio or average column, and still divides
-- nothing". 0032 appended four ratio columns — sale_price_net, sale_price_gross,
-- sale_price_last_net, sale_price_last_gross — and THIS CHECK STAYED GREEN,
-- because its test is a list of column NAMES and none of those contains 'rate',
-- 'avg' or 'ratio'. Measured by applying 0032 and running this file unchanged.
--
-- The claim underneath was never "never divide". 0013 states the real one beside
-- its own copy: trailing_days and trailing_traded_days are BOTH defensible
-- denominators, so the view refuses to pick. A unit price has exactly one
-- denominator and it is on the row. So the rule is kept and stated as arithmetic:
-- every division in this body divides by nullif() of the row's own quantity, and
-- nothing is rounded.
select chk('the view divides ONLY by its own quantity — no denominator a caller would have to choose',
           regexp_count(pg_get_viewdef('public.product_velocity_daily'::regclass), '/') = 2
       and regexp_count(pg_get_viewdef('public.product_velocity_daily'::regclass),
                        '/ NULLIF\(d\.qty_base_sold') = 2
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='product_velocity_daily'
               and (column_name like '%rate%' or column_name like '%avg%'
                    or column_name like '%ratio%')) = 0
       and pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'round\s*\(',
           'the three trailing denominators are all shipped and none is used; the '
        || 'two price columns divide by qty_base_sold, which is on the same row, so '
        || 'any rollup recomputes them exactly. See 0032');

select chk('and it still has no cost reach — 0014''s claim survives the replace',
           pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'stock_batch'
       and pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'unit_cost'
       and pg_get_viewdef('public.product_velocity_daily'::regclass) !~* 'has_role');


-- ============== 4. PURCHASES AS A FIRST-CLASS READ — AREA 9'S N2 ==
-- "How much was bought this week/month" existed only as a denominator inside a
-- view named for waste. It now has a name of its own, and the strongest thing that
-- can be said about it is that it did not become a SECOND, disagreeing answer.

select chk('the view exists at the variant-day grain: 1 048 rows over 509 pairs, 12 families',
           (select count(*) from product_purchases_daily) = 1048
       and (select count(*) from (select workspace_id, location_id, variant_id
                                    from product_purchases_daily group by 1,2,3) x) = 509
       and (select count(distinct family_id) from product_purchases_daily) = 12);

select chk('it reconciles to the LEDGER on all four measures, to the centavo',
           (select sum(purchases_qty_base)  from product_purchases_daily) = (select sum(qty_base)   from purchase_line)
       and (select sum(purchases_net)       from product_purchases_daily) = (select sum(line_net)   from purchase_line)
       and (select sum(tax_paid)            from product_purchases_daily) = (select sum(tax_amount) from purchase_line)
       and (select sum(purchase_line_count) from product_purchases_daily) = (select count(*)        from purchase_line),
           (select 'net ' || sum(purchases_net) || ', tax ' || sum(tax_paid)
                || ', gross ' || sum(purchases_gross) from product_purchases_daily));

-- ⚠️ THE CHECK THAT ONLY EXISTS BECAUSE THE COLUMN NAMES MATCH. product_waste_daily
-- computes this same aggregate inside itself as a denominator. If the two ever
-- disagree, one of them is wrong and no arithmetic check over either alone would
-- notice — the ninth stale-copy defect waiting to happen, caught structurally
-- instead.
select chk('⚠️ ROW FOR ROW identical to the copy inside product_waste_daily, both directions',
           (select count(*) from (
              (select workspace_id, location_id, variant_id, day,
                      purchases_qty_base, purchases_net, purchase_line_count
                 from product_purchases_daily
               except
               select workspace_id, location_id, variant_id, day,
                      purchases_qty_base, purchases_net, purchase_line_count
                 from product_waste_daily where purchase_line_count <> 0)
              union all
              (select workspace_id, location_id, variant_id, day,
                      purchases_qty_base, purchases_net, purchase_line_count
                 from product_waste_daily where purchase_line_count <> 0
               except
               select workspace_id, location_id, variant_id, day,
                      purchases_qty_base, purchases_net, purchase_line_count
                 from product_purchases_daily)) x) = 0,
           'the same number in two views, asserted rather than assumed');

select chk('purchases_gross is the row''s own arithmetic on EVERY row, and 550 buckets are IVA-exempt',
           (select count(*) from product_purchases_daily
             where purchases_gross is distinct from purchases_net + tax_paid) = 0
       and (select count(*) from product_purchases_daily where tax_paid = 0) = 550
       and (select count(*) from product_purchases_daily where tax_paid <> 0) = 498);

-- Per FAMILY is a `group by`, which is the reason there is no second view for it.
select chk('per-family is a group by: family_id and family_name on every row, never null',
           (select count(*) from product_purchases_daily
             where family_id is null or family_name is null) = 0
       and (select sum(g) from (select sum(purchases_gross) g from product_purchases_daily
                                 group by family_id) f)
         = (select sum(purchases_gross) from product_purchases_daily));

-- ⚠️⚠️ RE-CUT 2026-09-14 BY 0032, for the same reason as the velocity check above
-- and with the same evidence: this read "every MEASURE is additive" and stayed
-- GREEN after four non-additive price columns landed on the view, because
-- purchase_price_net contains none of the strings it tests for.
--
-- The distinction the original was reaching for survives and is sharper: a price
-- is non-additive but EXACTLY RECOVERABLE at any grain from two additive columns
-- on the same row, and a distinct-count is recoverable from nothing. So the claim
-- becomes "every measure is additive OR is a ratio of two additive columns beside
-- it", and the document count is still refused.
select chk('every MEASURE is additive or is a ratio of two additive columns on its own row',
           (select count(*) from product_purchases_daily
             where purchase_price_net   is distinct from purchases_net   / nullif(purchases_qty_base,0)
                or purchase_price_gross is distinct from purchases_gross / nullif(purchases_qty_base,0)) = 0
       and (select count(*) from information_schema.columns
             where table_schema='public' and table_name='product_purchases_daily'
               and (column_name like '%rate%' or column_name like '%avg%'
                    or column_name like '%ratio%' or column_name like '%share%'
                    or column_name like '%purchase_count%' or column_name like '%delivery%')) = 0
       and pg_get_viewdef('public.product_purchases_daily'::regclass) !~* 'count\s*\(\s*distinct',
           'a delivery count is NOT additive across a rollup — one document appears '
        || 'on every variant row of its day — so the view does not ship one');

-- ⚠️ NO DAY SPINE, AND THAT IS THE DIFFERENCE FROM 0014. Nothing records a delivery
-- that was DUE and did not arrive, so every zero a spine produced here would be a
-- claim nobody can back.
select chk('⚠️ no day spine: one row per purchase bucket and not one silent row',
           (select count(*) from product_purchases_daily) =
           (select count(*) from (
              select pl.workspace_id, pl.location_id, pl.variant_id,
                     (p.occurred_at at time zone l.timezone)::date
                from purchase_line pl
                join purchase p on p.id = pl.purchase_id and p.workspace_id = pl.workspace_id
                                                         and p.location_id  = pl.location_id
                join location l on l.id = pl.location_id and l.workspace_id = pl.workspace_id
               group by 1,2,3,4) x)
       and (select count(*) from product_purchases_daily where purchase_line_count = 0) = 0
       and (select count(*) from product_purchases_daily where purchases_qty_base = 0) = 0,
           'product_velocity_daily generates 91% silence because "it stopped selling" '
        || 'is an answer; "no delivery today" is not the same kind of fact');

select chk('no table, no function, no policy: 0031 is three view bodies and four comments',
           (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname='public' and c.relkind='r'
               and c.relname like '%purchase%daily%') = 0
       and (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname like '%purchases_daily%') = 0
       and (select count(*) from pg_policies where schemaname='public'
             and tablename = 'product_purchases_daily') = 0);


-- ===== 5. ⚠️ VOIDED DELIVERIES DO NOT CANCEL INSIDE A DAY, AND 0009'S ARGUMENT
--            IS WHY THAT IS CORRECT RATHER THAN A DEFECT ==
-- A void is a negated document (0003) and this view is a SUM, so nothing needs
-- excluding. But 0009's "it cancels itself" is a claim about a RANGE, and a sale is
-- voided within 15 minutes while a delivery is corrected days later.

select chk('the view excludes no reversal — the word does not appear in its definition',
           pg_get_viewdef('public.product_purchases_daily'::regclass) !~* 'reversal_of');

select chk('⚠️ 23 buckets are NEGATIVE, totalling -11 424.60 — a daily chart shows bars below zero',
           (select count(*) from product_purchases_daily where purchases_net < 0) = 23
       and (select sum(purchases_net) from product_purchases_daily where purchases_net < 0) = -11424.60,
           'the correction is dated when it was RECORDED, which is the ledger being '
        || 'honest rather than the view being wrong');

select chk('⚠️ and the reason they cannot net within a day: the 3 reversals are 2, 2 and 9 days later',
           (select count(*) from purchase p join purchase o on o.id = p.reversal_of
             where p.reversal_of is not null) = 3
       and (select count(*) from purchase p join purchase o on o.id = p.reversal_of
             where p.reversal_of is not null
               and p.occurred_at::date = o.occurred_at::date) = 0
       and (select max(p.occurred_at::date - o.occurred_at::date) from purchase p
              join purchase o on o.id = p.reversal_of where p.reversal_of is not null) = 9,
           (select string_agg((p.occurred_at::date - o.occurred_at::date)::text, ', ' order by 1)
              from purchase p join purchase o on o.id = p.reversal_of where p.reversal_of is not null));

select chk('but the RANGE nets exactly — which is 0009''s argument, and it still holds here',
           (select sum(purchases_net) from product_purchases_daily)
         = (select sum(line_net) from purchase_line));


-- ========== 6. ACCESS: MANAGER-AND-ABOVE BY INHERITANCE, FAILING CLOSED ==
-- ⚠️ THE STRUCTURAL CLAIM FIRST, because it is what makes the measurements below
-- mean something beyond "it happened to be empty."

select chk('the view states NO has_role predicate of its own — unlike 0009, and on purpose',
           pg_get_viewdef('public.product_purchases_daily'::regclass) !~* 'has_role'
       and pg_get_viewdef('public.product_purchases_daily'::regclass) !~* 'row_security_active',
           'both base tables are manager-gated, so inheritance fails CLOSED. 0009 '
        || 'needs a predicate only because it joins a member-level half to a gated one');

select chk('and it is security_invoker, as §2.7 fixes for every view',
           (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname='product_purchases_daily'
               and c.reloptions::text ~* 'security_invoker=true') = 1);

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'caja.centro@tienda.mx')), true);
set local role authenticated;

-- ⚠️ ZERO ROWS, NOT ROWS WITH ZERO MONEY. That is the difference between failing
-- closed and failing open, and it is the whole of 0009's cautionary tale: under
-- inheritance alone that view would have answered, in good faith, that the shop's
-- margin equals its revenue.
select chk('⚠️ access: a cashier reads ZERO purchase rows — not rows summing to zero',
           (select count(*) from product_purchases_daily) = 0
       and (select count(*) from purchase_line) = 0);

select chk('access: and the SAME cashier reads gross revenue at her own store — $70 376.39',
           (select count(*) from product_velocity_daily) = 15099
       and (select sum(revenue_gross) from product_velocity_daily) = 70376.39
       and (select sum(revenue_net)   from product_velocity_daily) = 65549.43
       and (select sum(tax_collected) from product_velocity_daily) = 4826.96
       and (select count(distinct location_id) from product_velocity_daily) = 1,
           'the two halves of this task in one session: the fence she must not pass, '
        || 'and the number that never needed her to pass it');
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'rosa.gerente@tienda.mx')), true);
set local role authenticated;

select chk('access: the MANAGER reads 863 purchase rows across both her stores, $562 630.18 gross',
           (select count(*) from product_purchases_daily) = 863
       and (select count(distinct location_id) from product_purchases_daily) = 2
       and (select sum(purchases_gross) from product_purchases_daily) = 562630.18
       and (select sum(purchases_net)   from product_purchases_daily) = 529739.54
       and (select sum(tax_paid)        from product_purchases_daily) = 32890.64);
commit;

begin;
select set_config('request.jwt.claims',
       format('{"sub":"%s","role":"authenticated"}',
              (select id from auth.users where email = 'roble.owner@tienda.mx')), true);
set local role authenticated;

select chk('⚠️ access: the OTHER workspace''s owner reads 185 rows and not one of Doña Lupe''s',
           (select count(*) from product_purchases_daily) = 185
       and (select count(*) from product_purchases_daily
             where workspace_id = :'lupe_ws') = 0
       and (select sum(purchases_gross) from product_purchases_daily) = 97136.01,
           'a workspace fence on a view is only a fence if somebody stood on the '
        || 'other side of it — 863 + 185 = 1 048, and neither sees the other''s');
commit;


-- ===== 7. B8 — 0009'S HONESTY COMMENT, AND THE CASE THAT PROVES IT IS NEEDED ==
-- The owner's A3 ruling of 2026-09-14 cancelled the view that was going to stand
-- beside 0009 and explain it. Nothing will now replace it.

select chk('0009''s comment now names C8.6, the despiece, and the 100% it reports',
           obj_description('public.product_margin_daily'::regclass, 'pg_class') ~* 'despiece'
       and obj_description('public.product_margin_daily'::regclass, 'pg_class') ~* 'C8\.6'
       and obj_description('public.product_margin_daily'::regclass, 'pg_class') ~* '100% margin');

select chk('and it says NOTHING WILL REPLACE IT, which is the half that dates',
           obj_description('public.product_margin_daily'::regclass, 'pg_class') ~* 'NOTHING WILL REPLACE THIS VIEW'
       and obj_description('public.product_margin_daily'::regclass, 'pg_class') ~* 'revenue_gross',
           'a reader in six months gets the 2026-09-14 ruling and the column that '
        || 'replaced the question, not just a warning');

-- ⚠️⚠️ THE CHECK THAT MAKES THE COMMENT MORE THAN TIDINESS. `cost_attributed` is
-- 0009's own honesty column and it does NOT cover this case: the movements exist,
-- they merely cost nothing, so the flag is TRUE while the margin is 100%. The seed
-- holds exactly one such bucket — a zero-cost lot opened by an adjustment, which is
-- the same mechanism C8.6 produces at every despiece.
select chk('⚠️⚠️ the gap is REAL: 1 bucket reports 100% margin with cost_attributed TRUE',
           (select count(*) from product_margin_daily
             where margin_rate = 1 and cost_attributed) = 1
       and (select count(*) from stock_batch where unit_cost_net_per_base = 0) = 1
       and (select count(*) from stock_movement
             where reason = 'sale' and unit_cost_net_per_base = 0) = 1,
           (select 'Agua natural 1 l on ' || day || ': revenue ' || revenue_net
                || ', cogs ' || cogs_net || ', cost_attributed ' || cost_attributed
              from product_margin_daily where margin_rate = 1 and cost_attributed));

select chk('and 0009''s BODY did not change — B1 stands, this was a comment and nothing else',
           (select count(*) from information_schema.columns
             where table_schema='public' and table_name='product_margin_daily') = 17
       and pg_get_viewdef('public.product_margin_daily'::regclass) ~* 'has_role'
       and pg_get_viewdef('public.product_margin_daily'::regclass) ~* 'row_security_active'
       and pg_get_viewdef('public.product_margin_daily'::regclass) ~* 'cost_attributed');


-- ===== 8. 0030'S COMMENT IS CORRECTED, AND THE SCHEMA IT DESCRIBES DID NOT MOVE ==
-- ⚠️ The migration file 0030 is NOT edited — a function comment is applied schema
-- and migrations are append-only. The correction is a statement in 0031, which
-- docs/PLAN.md nominated for it on the day the ruling landed.

-- ⚠️⚠️ THIS ASSERTION'S SENTINEL MUST NEVER BE SPELLED IN THE COMMENT IT READS,
-- INCLUDING INSIDE THE PARAGRAPH THAT EXPLAINS THE CORRECTION. The first draft of
-- 0031 quoted the stale clause while retiring it, and this check went red on the
-- prose describing its own fix — the fifth time a guard here has done that. The
-- MIGRATION was reworded rather than this check loosened, per 4.6b's rule.
select chk('the stale clause is gone: no server read is "owed to" 5c''s banner any more',
           obj_description('public.replay_failed_write(uuid)'::regprocedure, 'pg_proc')
             !~* 'owed to step 5c''s dead-letter banner'
       and obj_description('public.replay_failed_write(uuid)'::regprocedure, 'pg_proc')
             ~* 'needs no server read at all');

select chk('and the ruling is in its place — the device''s own outbox, and the uuid it already holds',
           obj_description('public.replay_failed_write(uuid)'::regprocedure, 'pg_proc') ~* 'CORRECTED BY 0031'
       and obj_description('public.replay_failed_write(uuid)'::regprocedure, 'pg_proc') ~* 'DEVICE''S OWN OUTBOX'
       and obj_description('public.replay_failed_write(uuid)'::regprocedure, 'pg_proc') ~* '0024 decision 7');

select chk('0026''s and 0030''s reasoning survives verbatim — this replaced a comment, not an argument',
           obj_description('public.replay_failed_write(uuid)'::regprocedure, 'pg_proc') ~* 'COMPENSATE THEN RE-RUN'
       and obj_description('public.replay_failed_write(uuid)'::regprocedure, 'pg_proc') ~* '0026 decision 5'
       and obj_description('public.replay_failed_write(uuid)'::regprocedure, 'pg_proc') ~* 'LOOSENED FROM OWNER BY 0030');

-- ⚠️⚠️ AND THE THING THAT MATTERS MORE THAN THE WORDS: 0031 CHANGED A SENTENCE AND
-- NOT A FENCE. The owner's ruling of 2026-09-14 is that failed_write_select STAYS
-- owner-only. 0030's own checks hold that; this one asserts 0031 did not disturb it,
-- because a migration that rewrites a comment about a policy is exactly the place
-- somebody would later "tidy" the policy too.
select chk('⚠️ the fence did not move: replay is still manager, failed_write_select still owner-only',
           (select qual::text from pg_policies
             where schemaname='public' and tablename='failed_write'
               and policyname='failed_write_select') ~* 'owner'
       and (select prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname='replay_failed_write') ~* 'manager',
           'the ruling is that a policy STAYS as it is, and a change not made has no '
        || 'constraint to live in — only a check can hold it');


-- ========== 9. ⚠️ WHAT THIS SEED CANNOT FALSIFY, PINNED RATHER THAN PAPERED OVER ==
-- 2.1, 2.2, 2.3 and 0014 all did this, and a falsification table with only
-- successes in it is the more misleading artefact.
--
-- Every purchase variant-day bucket in this seed holds EXACTLY ONE LINE. So
-- mutating `sum(pl.line_net)` to `min(...)` or `max(...)` in the purchases CTE
-- changes nothing, turns no check red, and is invisible. Confirmed by mutation, not
-- assumed. The precondition is pinned instead, at its exact shape: the day a
-- delivery splits one variant across two lines of one document, or two documents
-- land on one day, this goes red and someone reads this paragraph.

select chk('⚠️ cannot falsify: sum vs min vs max over purchase lines is invisible at 1 line per bucket',
           (select max(purchase_line_count) from product_purchases_daily) = 1
       and (select count(*) from product_purchases_daily where purchase_line_count > 1) = 0
       and (select count(*) from purchase_line) = (select count(*) from product_purchases_daily),
           '1 048 lines in 1 048 buckets — when the first number exceeds the second, '
        || 'the aggregate starts being testable and this check starts failing');

-- ✅ The SALE side does not have that gap, which is the division of labour worth
-- stating: the same mutation on `sum(sl.tax_amount)` IS caught, because sale buckets
-- hold up to three lines.
select chk('✅ but the SALE side IS falsifiable — 2 263 lines in 2 139 buckets, up to 3 deep',
           (select max(n) from (
              select count(*) n from sale_line sl
                join sale s on s.id = sl.sale_id and s.workspace_id = sl.workspace_id
                                                 and s.location_id  = sl.location_id
                join location l on l.id = sl.location_id and l.workspace_id = sl.workspace_id
               group by sl.workspace_id, sl.location_id, sl.variant_id,
                        (s.occurred_at at time zone l.timezone)::date) x) = 3,
           'so sum(sl.tax_amount) is a real assertion and sum(pl.tax_amount) is not, yet');


-- ========== 10. THE FOURTH ANALYTICS VIEW, AND THE GUARD THAT COULD NOT SEE IT ==
-- 0011's `_tz` check says in its own comment that "ADDING a fourth analytics view
-- without adding it here fails the count instead of passing silently — which is
-- exactly the failure mode this check exists for."
--
-- ⚠️⚠️ IT DID NOT. Its count is over a hardcoded three-name list, so a fourth view
-- changes nothing and the check stays green while never looking at it. Measured on
-- 2026-09-14 by applying this migration and running supabase/checks/ unchanged: all
-- eight files passed, with an unexamined analytics view standing. 0011 is amended in
-- this commit to DISCOVER the population instead of trusting a list, and the claim
-- below is the same one from this file's side.

select chk('⚠️ the new view reads location.timezone — no analytics view hardcodes a zone',
           pg_get_viewdef('public.product_purchases_daily'::regclass) !~* 'AT TIME ZONE ''[A-Za-z]+/'
       and pg_get_viewdef('public.product_purchases_daily'::regclass) ~* 'timezone');

-- ⚠️ RE-SIGNED 2026-09-14 BY 0033, WHICH IS THE FIFTH — and the point of writing
-- this as a discovery rather than a list is that the count moving is what a new
-- analytics view is SUPPOSED to do here. It went red on the day 0033 landed, named
-- transaction_export, and 0011's spelled-out list now carries it too.
select chk('and there are FIVE of them now, discovered rather than listed',
           (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relkind = 'v'
               and c.relname not like '\_%'
               and pg_get_viewdef(c.oid) ~* 'at time zone') = 5,
           (select string_agg(c.relname, ', ' order by c.relname)
              from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname='public' and c.relkind='v' and c.relname not like '\_%'
               and pg_get_viewdef(c.oid) ~* 'at time zone'));

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
    raise exception '% purchases-and-gross-revenue check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % purchases-and-gross-revenue checks passed', (select count(*) from public._verify);
end;
$$;
