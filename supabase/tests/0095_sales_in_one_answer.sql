-- ============================================================================
-- Behavioural verification for 0095 — Números' sales in one answer, and the
-- sales view's join repaired. Plan task `12.2`, the owner's yes to `12.1`'s C.
--
--   1. `daily_sales` is one function, `security invoker`, stable, with an empty
--      search_path, returning json; anon may not run it, a signed-in person may;
--      ⚠️ and since `0096` it plans every call with the shop it is handed
--      (`plan_cache_mode = force_custom_plan`): on the hosted project a plan made
--      without the shop's id took 80 s, which no fixture this size can show
--   2. ⚠️⚠️ AS THE OWNER, IT IS THE VIEW'S ROWS TO THE CENT — exactly what Wera
--      asked `product_velocity_daily` for (the shop, a first day,
--      `line_count > 0`), both ways — and each story's figures: gross as keyed,
--      a void netted on its own day, a void made today of yesterday's sale on
--      yesterday, an older sale and its void out of the window, an unsold
--      product absent, two stores' rows apart, the order, the keys and their
--      JSON types — ⚠️ and since `0100` (plan `14.2`) how many times each sold,
--      a void taking its sale back (`times_sold`), what Vender's order counts
--   3. a day further back brings the older sale in, and it is still the view —
--      ⚠️ with a sale dated BEFORE its product's first delivery (an offline sale
--      drawing on a lot received later), the one case `carried`'s sales half
--      exists for
--   4. AS A CASHIER, her store's rows only, and still the view's as she reads it
--   5. another shop's owner reads none of them, and her own only
--   6. a NULL shop or day is an empty array, not an error
--   7. ⚠️⚠️ THE REPAIRED VIEW IS `0064`'s VIEW: every column of every row of this
--      fixture, both ways, as `postgres` and as the cashier — `0064`'s text is
--      frozen below as a temporary view, so a later edit of `carried` that
--      changes a figure is red here
--
-- ⚠️ WHAT IS NOT HERE: that one json value escapes PostgREST's `max_rows` —
-- that is the HTTP layer's, asserted by `docs/checks/7a-sales-contract.sh` with
-- more rows than the cap. And the time: `12.2`'s status entry has it, measured.
--
-- ⚠️ YESTERDAY AND THE DAY BEFORE ARE MADE THE WAY THE PHONE MAKES THEM: offline
-- writes dated back, inside every record_*'s 72 hours (`0064`'s suite's way).
--
-- Run: docker exec -i supabase_db_<project> psql -U postgres -d postgres
--        -v ON_ERROR_STOP=1 < supabase/tests/0095_sales_in_one_answer.sql
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated, anon;
grant all on sequence public._verify_n_seq to authenticated, anon;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated, anon;

create or replace function public.chk_raises(p_label text, p_sql text, p_expect text default null)
returns void language plpgsql as $$
declare v_state text;
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_state := sqlstate;
  perform public.chk(p_label,
                     p_expect is null or v_state = p_expect,
                     'sqlstate ' || v_state || coalesce(' (wanted ' || p_expect || ')', ''));
end;
$$;
grant execute on function public.chk_raises(text, text, text) to authenticated, anon;

-- One sale line: a quantity in a unit, at a gross price per BASE unit.
create or replace function public._sl95(p_variant uuid, p_qty numeric, p_unit text, p_price numeric)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty, 'qty_display_unit', p_unit,
           'unit_price_gross_per_base', p_price))
$$;
grant execute on function public._sl95(uuid, numeric, text, numeric) to authenticated;

create or replace function public._pl95(p_variant uuid, p_qty numeric, p_unit text)
returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
           'variant_id', p_variant, 'qty_display', p_qty, 'qty_display_unit', p_unit,
           'unit_price_net_per_base', 1.00))
$$;
grant execute on function public._pl95(uuid, numeric, text) to authenticated;

-- ⚠️⚠️ THE COMPARISON, RUN AS WHOEVER IS SIGNED IN: what `daily_sales` answers
-- against what Wera asked the view for, as text, both ways (`except all`, so a
-- row twice is a difference). Every figure is the view's own spelling cast to
-- text — `SALES_COLUMNS`' — so "to the cent" is character for character.
create or replace function public._eq95(p_ws uuid, p_since date)
returns text language sql as $$
  with f as (
    select e->>'day' as d, e->>'variant_id' as v, e->>'variant_name' as vn,
           e->>'family_id' as fi, e->>'family_name' as fn, e->>'base_unit_code' as bu,
           e->>'qty_base_sold' as q, e->>'revenue_gross' as r
      from json_array_elements(public.daily_sales(p_ws, p_since)) e
  ), w as (
    select day::text, variant_id::text, variant_name, family_id::text, family_name,
           base_unit_code, qty_base_sold::text, revenue_gross::text
      from public.product_velocity_daily
     where workspace_id = p_ws and day >= p_since and line_count > 0
  )
  select format('%s rows, %s missing, %s extra',
                (select count(*) from w),
                (select count(*) from (select * from w except all select * from f) x),
                (select count(*) from (select * from f except all select * from w) y))
$$;
grant execute on function public._eq95(uuid, date) to authenticated;

-- What the answer says for one product on one day: "qty / gross", one per store
-- (the answer names no store, so two stores' rows read as two figures).
create or replace function public._one95(p_ws uuid, p_since date, p_name text, p_day date)
returns text language sql as $$
  select string_agg((e->>'qty_base_sold') || ' / ' || (e->>'revenue_gross'), ', '
                    order by e->>'qty_base_sold')
    from json_array_elements(public.daily_sales(p_ws, p_since)) e
   where e->>'variant_name' = p_name and (e->>'day')::date = p_day
$$;
grant execute on function public._one95(uuid, date, text, date) to authenticated;

-- ---------------------------------------------------------------- fixture ----
\set owner   '''0095aaaa-0000-4000-8000-000000000001'''
\set staff   '''0095aaaa-0000-4000-8000-000000000002'''
\set owner_b '''0095aaaa-0000-4000-8000-000000000003'''
\set jwt_owner   '''{"sub":"0095aaaa-0000-4000-8000-000000000001","role":"authenticated"}'''
\set jwt_staff   '''{"sub":"0095aaaa-0000-4000-8000-000000000002","role":"authenticated"}'''
\set jwt_owner_b '''{"sub":"0095aaaa-0000-4000-8000-000000000003","role":"authenticated"}'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner,   'duena.0095@example.mx',  jsonb_build_object('full_name', 'Dueña 0095')),
  (:staff,   'cajera.0095@example.mx', jsonb_build_object('full_name', 'Cajera 0095')),
  (:owner_b, 'otra.0095@example.mx',   jsonb_build_object('full_name', 'Otra Dueña 0095'));

select set_config('request.jwt.claims', :jwt_owner, false);
select onboard_workspace('Abarrotes 0095') as ws \gset
select set_config('request.jwt.claims', :jwt_owner_b, false);
select onboard_workspace('Otra tienda 0095') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc from public.location where workspace_id = :'ws' \gset
select id as loc_b from public.location where workspace_id = :'ws_b' \gset
insert into public.location (workspace_id, name) values (:'ws', 'Sucursal 0095');
select id as loc2 from public.location where workspace_id = :'ws' and name = 'Sucursal 0095' \gset
select timezone as tz from public.location where id = :'loc' \gset

-- The cashier works the first store only.
insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws', :staff, 'staff', 'Cajera 0095');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', wm.id, :'loc' from public.workspace_member wm where wm.user_id = :staff;

insert into public.product_family (workspace_id, name) values (:'ws', 'Lácteos y más 0095');
select id as fam from public.product_family where workspace_id = :'ws' \gset
insert into public.product_family (workspace_id, name) values (:'ws_b', 'Abarrotes B 0095');
select id as fam_b from public.product_family where workspace_id = :'ws_b' \gset

-- One product per story. QUESO carries 16% IVA and is sold by the kilo (grams
-- underneath); CREMA is bought and never sold; CAFÉ is delivered today and sold
-- in an offline sale dated two days back.
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, tax_rate) values
  (:'ws',   :'fam',   'Queso 0095', 'g',  'kg', 'kg', 'kg', 0.1600),
  (:'ws',   :'fam',   'Huevo 0095', 'pza','pza','pza','pza', 0.0000),
  (:'ws',   :'fam',   'Pan 0095',   'pza','pza','pza','pza', 0.0000),
  (:'ws',   :'fam',   'Atole 0095', 'pza','pza','pza','pza', 0.0000),
  (:'ws',   :'fam',   'Tamal 0095', 'pza','pza','pza','pza', 0.0000),
  (:'ws',   :'fam',   'Crema 0095', 'pza','pza','pza','pza', 0.0000),
  (:'ws',   :'fam',   'Café 0095',  'pza','pza','pza','pza', 0.0000),
  (:'ws_b', :'fam_b', 'Ajena 0095', 'pza','pza','pza','pza', 0.0000);

select id as queso from public.product_variant where name = 'Queso 0095' \gset
select id as huevo from public.product_variant where name = 'Huevo 0095' \gset
select id as pan   from public.product_variant where name = 'Pan 0095' \gset
select id as atole from public.product_variant where name = 'Atole 0095' \gset
select id as tamal from public.product_variant where name = 'Tamal 0095' \gset
select id as crema from public.product_variant where name = 'Crema 0095' \gset
select id as cafe  from public.product_variant where name = 'Café 0095' \gset
select id as ajena from public.product_variant where name = 'Ajena 0095' \gset
select id as prov   from public.provider where workspace_id = :'ws'   and is_generic \gset
select id as prov_b from public.provider where workspace_id = :'ws_b' and is_generic \gset

\set yesterday '(now() - interval ''1 day'')'
\set twodays   '(now() - interval ''2 days'')'

-- Stock, 70 hours back, so every sale below has lots to draw on.
select set_config('request.jwt.claims', :jwt_owner, false);
set role authenticated;
select record_purchase('0095bbbb-0000-4000-8000-000000000001'::uuid, :'loc'::uuid, :'prov'::uuid,
  public._pl95(:'queso'::uuid, 5, 'kg') || public._pl95(:'huevo'::uuid, 100, 'pza')
  || public._pl95(:'pan'::uuid, 100, 'pza') || public._pl95(:'atole'::uuid, 100, 'pza')
  || public._pl95(:'crema'::uuid, 10, 'pza'),
  now() - interval '70 hours', true) is not null as stocked \gset
select record_purchase('0095bbbb-0000-4000-8000-000000000002'::uuid, :'loc2'::uuid, :'prov'::uuid,
  public._pl95(:'huevo'::uuid, 100, 'pza') || public._pl95(:'tamal'::uuid, 100, 'pza'),
  now() - interval '70 hours', true) is not null as stocked2 \gset

-- TODAY, first store: 1.5 kg of queso at $120/kg gross = $180.00; 12 eggs at
-- $3, and 6 more at $3 voided at once.
select record_sale('0095cccc-0000-4000-8000-000000000001'::uuid, :'loc'::uuid,
  public._sl95(:'queso'::uuid, 1.5, 'kg', 0.120000)
  || public._sl95(:'huevo'::uuid, 12, 'pza', 3.00)) is not null as s1 \gset
select record_sale('0095cccc-0000-4000-8000-000000000002'::uuid, :'loc'::uuid,
  public._sl95(:'huevo'::uuid, 6, 'pza', 3.00)) is not null as s2 \gset
select void_transaction('sale', '0095cccc-0000-4000-8000-000000000002'::uuid, '0095 al momento')
  is not null as v2 \gset
-- TODAY, the second store: eggs and tamales, which the cashier does not work.
select record_sale('0095cccc-0000-4000-8000-000000000003'::uuid, :'loc2'::uuid,
  public._sl95(:'huevo'::uuid, 10, 'pza', 3.50)
  || public._sl95(:'tamal'::uuid, 4, 'pza', 18.00)) is not null as s3 \gset
-- YESTERDAY: 4 loaves, voided TODAY — so the day that nets is yesterday.
select record_sale('0095cccc-0000-4000-8000-000000000004'::uuid, :'loc'::uuid,
  public._sl95(:'pan'::uuid, 4, 'pza', 5.00), :yesterday, true) is not null as s4 \gset
select void_transaction('sale', '0095cccc-0000-4000-8000-000000000004'::uuid, '0095 ayer')
  is not null as v4 \gset
-- TWO DAYS BACK: 3 atoles kept, and 5 more voided TODAY — both on that day.
select record_sale('0095cccc-0000-4000-8000-000000000005'::uuid, :'loc'::uuid,
  public._sl95(:'atole'::uuid, 3, 'pza', 10.00), :twodays, true) is not null as s5 \gset
select record_sale('0095cccc-0000-4000-8000-000000000006'::uuid, :'loc'::uuid,
  public._sl95(:'atole'::uuid, 5, 'pza', 10.00), :twodays, true) is not null as s6 \gset
select void_transaction('sale', '0095cccc-0000-4000-8000-000000000006'::uuid, '0095 antier')
  is not null as v6 \gset
-- CAFÉ: delivered NOW, then an offline sale dated two days back draws on it — so
-- its first stock day is today and its first sale two days back (measured on
-- 2026-11-21: FEFO allocates a later lot to an earlier-dated sale).
select record_purchase('0095bbbb-0000-4000-8000-000000000004'::uuid, :'loc'::uuid, :'prov'::uuid,
  public._pl95(:'cafe'::uuid, 10, 'pza')) is not null as stocked_cafe \gset
select record_sale('0095cccc-0000-4000-8000-000000000008'::uuid, :'loc'::uuid,
  public._sl95(:'cafe'::uuid, 2, 'pza', 9.00), :twodays, true) is not null as s8 \gset
reset role;

select set_config('request.jwt.claims', :jwt_owner_b, false);
set role authenticated;
select record_purchase('0095bbbb-0000-4000-8000-000000000003'::uuid, :'loc_b'::uuid, :'prov_b'::uuid,
  public._pl95(:'ajena'::uuid, 50, 'pza'), now() - interval '70 hours', true) is not null as stocked_b \gset
select record_sale('0095cccc-0000-4000-8000-000000000007'::uuid, :'loc_b'::uuid,
  public._sl95(:'ajena'::uuid, 2, 'pza', 7.00)) is not null as s7 \gset
reset role;
select set_config('request.jwt.claims', null, false);

select (now() at time zone :'tz')::date as d0 \gset
select (:yesterday at time zone :'tz')::date as d1 \gset
select (:twodays at time zone :'tz')::date as d2 \gset

-- `0064`'s view, frozen: its text as `0064` left it (the one `0095` replaced).
create temp view _pvd_0064 with (security_invoker = true) as
with sold as (
  select sl.workspace_id, sl.location_id, sl.variant_id,
         (coalesce(o.occurred_at, s.occurred_at) at time zone l.timezone)::date as day,
         sum(sl.qty_base) as qty_base_sold, sum(sl.line_net) as revenue_net,
         sum(sl.tax_amount) as tax_collected, count(*) as line_count,
         (array_agg(sl.unit_price_net_per_base
                    order by coalesce(o.occurred_at, s.occurred_at) desc, sl.created_at desc, sl.id desc))[1]
           as price_last_net,
         (array_agg(sl.unit_price_net_per_base * (1 + sl.tax_rate)
                    order by coalesce(o.occurred_at, s.occurred_at) desc, sl.created_at desc, sl.id desc))[1]
           as price_last_gross
    from public.sale_line sl
    join public.sale s on s.id = sl.sale_id and s.workspace_id = sl.workspace_id and s.location_id = sl.location_id
    left join public.sale o on o.id = s.reversal_of and o.workspace_id = s.workspace_id
    join public.location l on l.id = sl.location_id and l.workspace_id = sl.workspace_id
   group by 1, 2, 3, 4
),
traded as (select workspace_id, location_id, day from sold group by 1, 2, 3),
stocked as (
  select bb.workspace_id, bb.location_id, bb.variant_id,
         min((bb.received_at at time zone l.timezone)::date) as first_stock_day
    from public.batch_balance bb
    join public.location l on l.id = bb.location_id and l.workspace_id = bb.workspace_id
   group by 1, 2, 3
),
carried as (
  select coalesce(s.workspace_id, k.workspace_id) as workspace_id,
         coalesce(s.location_id,  k.location_id)  as location_id,
         coalesce(s.variant_id,   k.variant_id)   as variant_id,
         least(coalesce(s.first_sale_day,  k.first_stock_day),
               coalesce(k.first_stock_day, s.first_sale_day)) as first_day
    from (select workspace_id, location_id, variant_id, min(day) as first_sale_day
            from sold group by 1, 2, 3) s
    full outer join stocked k
      on k.workspace_id = s.workspace_id and k.location_id = s.location_id and k.variant_id = s.variant_id
),
open_until as (select workspace_id, location_id, max(day) as last_day from traded group by 1, 2),
spine as (
  select c.workspace_id, c.location_id, c.variant_id, c.first_day, g::date as day
    from carried c
    join open_until o on o.workspace_id = c.workspace_id and o.location_id = c.location_id
   cross join lateral generate_series(c.first_day, o.last_day, interval '1 day') g
),
daily as (
  select sp.workspace_id, sp.location_id, sp.variant_id, sp.day, sp.first_day,
         coalesce(s.qty_base_sold, 0) as qty_base_sold, coalesce(s.revenue_net, 0) as revenue_net,
         coalesce(s.tax_collected, 0) as tax_collected, coalesce(s.line_count, 0) as line_count,
         s.price_last_net, s.price_last_gross, (t.day is not null) as store_traded
    from spine sp
    left join sold s on s.workspace_id = sp.workspace_id and s.location_id = sp.location_id
                    and s.variant_id = sp.variant_id and s.day = sp.day
    left join traded t on t.workspace_id = sp.workspace_id and t.location_id = sp.location_id and t.day = sp.day
)
select d.workspace_id, d.location_id, d.variant_id, d.day, v.name as variant_name, v.family_id,
       f.name as family_name, v.base_unit_code, d.qty_base_sold, d.revenue_net, d.line_count,
       d.store_traded,
       sum(d.qty_base_sold) over w as trailing_qty_base,
       sum(d.revenue_net)   over w as trailing_revenue_net,
       count(*)             over w as trailing_days,
       count(*) filter (where d.store_traded)      over w as trailing_traded_days,
       count(*) filter (where d.qty_base_sold > 0) over w as trailing_sold_days,
       d.day - (max(d.day) filter (where d.qty_base_sold > 0)
                over (partition by d.workspace_id, d.location_id, d.variant_id order by d.day
                      rows between unbounded preceding and current row)) as days_since_last_sale,
       (d.day - d.first_day) as days_carried,
       d.tax_collected as tax_collected,
       (d.revenue_net + d.tax_collected) as revenue_gross,
       sum(d.revenue_net + d.tax_collected) over w as trailing_revenue_gross,
       d.revenue_net / nullif(d.qty_base_sold, 0) as sale_price_net,
       (d.revenue_net + d.tax_collected) / nullif(d.qty_base_sold, 0) as sale_price_gross,
       d.price_last_net as sale_price_last_net,
       d.price_last_gross as sale_price_last_gross
  from daily d
  join public.product_variant v on v.id = d.variant_id and v.workspace_id = d.workspace_id
  join public.product_family f on f.id = v.family_id and f.workspace_id = v.workspace_id
window w as (partition by d.workspace_id, d.location_id, d.variant_id order by d.day
             range between interval '28 days' preceding and interval '1 day' preceding);
grant select on _pvd_0064 to authenticated;

-- ======================================================= 1. the function ====
select public.chk('1.1 exactly ONE daily_sales: (p_workspace_id uuid, p_since date) returning json',
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'daily_sales') = 1
  and (select pg_get_function_identity_arguments(oid) = 'p_workspace_id uuid, p_since date'
              and prorettype = 'json'::regtype
         from pg_proc where pronamespace = 'public'::regnamespace and proname = 'daily_sales'),
  (select string_agg(pg_get_function_identity_arguments(oid) || ' -> ' || prorettype::regtype::text, ' | ')
     from pg_proc where pronamespace = 'public'::regnamespace and proname = 'daily_sales'));

select public.chk('1.2 ⚠️ security INVOKER — the policies under it are the reader''s — stable, empty search_path',
  (select not prosecdef and provolatile = 's' and 'search_path=""' = any(proconfig)
     from pg_proc where pronamespace = 'public'::regnamespace and proname = 'daily_sales'));

select public.chk('1.5 ⚠️⚠️ PLANNED EVERY CALL WITH THE SHOP IT IS HANDED (0096): PL/pgSQL with plan_cache_mode = force_custom_plan — a plan made without the shop''s id took 80 s on the hosted project',
  (select l.lanname = 'plpgsql'
          and proconfig @> array['plan_cache_mode=force_custom_plan']
          and cardinality(proconfig) = 2
     from pg_proc p join pg_language l on l.oid = p.prolang
    where p.pronamespace = 'public'::regnamespace and p.proname = 'daily_sales'),
  (select l.lanname || ' ' || coalesce(array_to_string(proconfig, ', '), 'no settings')
     from pg_proc p join pg_language l on l.oid = p.prolang
    where p.pronamespace = 'public'::regnamespace and p.proname = 'daily_sales'));

select public.chk('1.3 anon may not run it, nor PUBLIC; a signed-in person may',
  not has_function_privilege('anon', 'public.daily_sales(uuid, date)', 'execute')
  and has_function_privilege('authenticated', 'public.daily_sales(uuid, date)', 'execute')
  and not exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                   where p.pronamespace = 'public'::regnamespace and p.proname = 'daily_sales'
                     and a.grantee = 0 and a.privilege_type = 'EXECUTE'));

set role anon;
select public.chk_raises('1.4 …and anon calling it is refused (42501), shop id in hand or not',
  format('select public.daily_sales(%L::uuid, %L::date)', :'ws', :'d1'), '42501');
reset role;

-- ================================================= 2. as the owner, d1 on ====
select set_config('request.jwt.claims', :jwt_owner, false);
set role authenticated;

select public.chk('2.1 ⚠️⚠️ the owner''s answer IS the view''s rows Wera asked for, to the cent, both ways',
  public._eq95(:'ws', :'d1') = '5 rows, 0 missing, 0 extra', public._eq95(:'ws', :'d1'));

select public.chk('2.2 ⚠️ queso: gross EXACTLY as keyed — $180.00, never the $155.17 net — 1500.000 g',
  public._one95(:'ws', :'d1', 'Queso 0095', :'d0') = '1500.000 / 180.00',
  public._one95(:'ws', :'d1', 'Queso 0095', :'d0'));

select public.chk('2.3 a void nets on its own day: 12 + 6 eggs at the first store, the 6 voided, read 12.000 / 36.00 (beside the second store''s 10.000 / 35.00)',
  public._one95(:'ws', :'d1', 'Huevo 0095', :'d0') = '10.000 / 35.00, 12.000 / 36.00',
  public._one95(:'ws', :'d1', 'Huevo 0095', :'d0'));

select public.chk('2.4 ⚠️ yesterday''s bread, voided TODAY, nets YESTERDAY (0064) — a row at zero, none today',
  public._one95(:'ws', :'d1', 'Pan 0095', :'d1') = '0.000 / 0.00'
  and public._one95(:'ws', :'d1', 'Pan 0095', :'d0') is null,
  coalesce(public._one95(:'ws', :'d1', 'Pan 0095', :'d1'), 'none') || ' | today: '
  || coalesce(public._one95(:'ws', :'d1', 'Pan 0095', :'d0'), 'none'));

select public.chk('2.5 ⚠️ the window: an atole sold two days back is out — and its void, made TODAY, is out with it; crema, never sold, is absent',
  (select count(*) from json_array_elements(public.daily_sales(:'ws', :'d1')) e
    where e->>'variant_name' in ('Atole 0095', 'Crema 0095')) = 0);

select public.chk('2.6 the second store''s rows are there, each store its own row: eggs twice today, tamales once',
  (select count(*) from json_array_elements(public.daily_sales(:'ws', :'d1')) e
    where e->>'variant_name' = 'Huevo 0095' and (e->>'day')::date = :'d0') = 2
  and public._one95(:'ws', :'d1', 'Tamal 0095', :'d0') = '4.000 / 72.00',
  public._one95(:'ws', :'d1', 'Tamal 0095', :'d0'));

select public.chk('2.7 newest day first, then variant_id, then the store — the order Wera paged in',
  (select bool_and(pd is null or pd > d or (pd = d and pv <= v))
     from (select (e->>'day')::date as d, (e->>'variant_id')::uuid as v,
                  lag((e->>'day')::date) over (order by n) as pd,
                  lag((e->>'variant_id')::uuid) over (order by n) as pv
             from json_array_elements(public.daily_sales(:'ws', :'d1')) with ordinality as x(e, n)) o)
  and (select (e->>'qty_base_sold')
         from json_array_elements(public.daily_sales(:'ws', :'d1')) with ordinality as x(e, n)
        where e->>'variant_name' = 'Huevo 0095' and (e->>'day')::date = :'d0'
        order by n limit 1)
      = case when :'loc'::uuid < :'loc2'::uuid then '12.000' else '10.000' end,
  (select string_agg((e->>'day') || ' ' || (e->>'variant_name'), ', ' order by n)
     from json_array_elements(public.daily_sales(:'ws', :'d1')) with ordinality as x(e, n)));

select public.chk('2.8 every element carries exactly Wera''s nine keys (times_sold since 0100); both figures JSON STRINGS (parseDecimal refuses a number), the count a JSON number, the day YYYY-MM-DD',
  (select bool_and(
            (select array_agg(k order by k) from json_object_keys(e) k)
              = array['base_unit_code', 'day', 'family_id', 'family_name', 'qty_base_sold',
                      'revenue_gross', 'times_sold', 'variant_id', 'variant_name']
            and json_typeof(e->'qty_base_sold') = 'string'
            and json_typeof(e->'revenue_gross') = 'string'
            and json_typeof(e->'times_sold') = 'number'
            and e->>'day' ~ '^\d{4}-\d{2}-\d{2}$')
     from json_array_elements(public.daily_sales(:'ws', :'d1')) e),
  (select string_agg(k, ',') from json_object_keys(public.daily_sales(:'ws', :'d1') -> 0) k));

-- ⚠️ `0100`, plan `14.2`: HOW MANY TIMES EACH SOLD, A VOID TAKING ITS SALE BACK —
-- what Vender's order counts (the owner's call 7: sales, not pesos). Never the
-- view's `line_count`, which counts a void as a line too.
select public.chk('2.9 ⚠️ times_sold: today''s eggs at the first store 1 (a sale kept; a sale and its void, nothing), the queso 1, the second store''s eggs and tamales 1 each, yesterday''s loaves 0 — a sale and its void, still a row — where the view''s line_count says 2',
  (select string_agg((e->>'day')::date - :'d0'::date || ' ' || (e->>'variant_name') || ' ' || (e->>'times_sold'), ', '
                     order by e->>'day' desc, e->>'variant_name', e->>'times_sold')
     from json_array_elements(public.daily_sales(:'ws', :'d1')) e)
    = '0 Huevo 0095 1, 0 Huevo 0095 1, 0 Queso 0095 1, 0 Tamal 0095 1, -1 Pan 0095 0'
  and exists (select 1 from public.product_velocity_daily
               where variant_id = :'pan' and day = :'d1' and line_count = 2),
  (select string_agg((e->>'day')::date - :'d0'::date || ' ' || (e->>'variant_name') || ' ' || (e->>'times_sold'), ', '
                     order by e->>'day' desc, e->>'variant_name', e->>'times_sold')
     from json_array_elements(public.daily_sales(:'ws', :'d1')) e));

-- ============================================ 3. a day further back, d2 on ====
select public.chk('3.1 from two days back the atole is in — 3 kept, the 5 and their void netting there — and it is still the view',
  public._one95(:'ws', :'d2', 'Atole 0095', :'d2') = '3.000 / 30.00'
  and public._eq95(:'ws', :'d2') = '7 rows, 0 missing, 0 extra',
  coalesce(public._one95(:'ws', :'d2', 'Atole 0095', :'d2'), 'none') || ' | ' || public._eq95(:'ws', :'d2'));

select public.chk('3.1b two days back the atoles sold twice and one sale was voided: times_sold 1; the café once: 1',
  (select string_agg((e->>'variant_name') || ' ' || (e->>'times_sold'), ', ' order by e->>'variant_name')
     from json_array_elements(public.daily_sales(:'ws', :'d2')) e
    where (e->>'day')::date = :'d2') = 'Atole 0095 1, Café 0095 1',
  (select string_agg((e->>'variant_name') || ' ' || (e->>'times_sold'), ', ' order by e->>'variant_name')
     from json_array_elements(public.daily_sales(:'ws', :'d2')) e
    where (e->>'day')::date = :'d2'));

select public.chk('3.2 ⚠️ a sale dated BEFORE its product''s first delivery is on the view''s spine and in the answer: café, two days back, 2.000 / 18.00',
  public._one95(:'ws', :'d2', 'Café 0095', :'d2') = '2.000 / 18.00'
  and (select min((received_at at time zone :'tz')::date) from public.batch_balance where variant_id = :'cafe') = :'d0'
  and exists (select 1 from public.product_velocity_daily
               where variant_id = :'cafe' and day = :'d2' and line_count = 1 and days_carried = 0),
  coalesce(public._one95(:'ws', :'d2', 'Café 0095', :'d2'), 'none'));
reset role;

-- ============================================================ 4. a cashier ===
select set_config('request.jwt.claims', :jwt_staff, false);
set role authenticated;
select public.chk('4.1 ⚠️ a cashier reads her store''s rows only, by policy — and they are the view''s as she reads it',
  public._eq95(:'ws', :'d1') = '3 rows, 0 missing, 0 extra'
  and (select count(*) from json_array_elements(public.daily_sales(:'ws', :'d1')) e
        where e->>'variant_name' = 'Tamal 0095') = 0
  and public._one95(:'ws', :'d1', 'Huevo 0095', :'d0') = '12.000 / 36.00',
  public._eq95(:'ws', :'d1'));
select public.chk('4.2 …her figures the owner''s for that store: the queso still $180.00',
  public._one95(:'ws', :'d1', 'Queso 0095', :'d0') = '1500.000 / 180.00');
reset role;

-- ====================================================== 5. another shop =====
select set_config('request.jwt.claims', :jwt_owner_b, false);
set role authenticated;
select public.chk('5.1 ⚠️ another shop''s owner, naming this shop, reads an empty array',
  public.daily_sales(:'ws', :'d2')::text = '[]', public.daily_sales(:'ws', :'d2')::text);
select public.chk('5.2 …and her own shop, its one row only',
  public._eq95(:'ws_b', :'d1') = '1 rows, 0 missing, 0 extra'
  and (select string_agg(e->>'variant_name', ',') from json_array_elements(public.daily_sales(:'ws_b', :'d1')) e)
      = 'Ajena 0095');
reset role;

-- ========================================================== 6. the NULLs =====
select set_config('request.jwt.claims', :jwt_owner, false);
set role authenticated;
select public.chk('6.1 a NULL shop or a NULL day is an empty array, not an error',
  public.daily_sales(null, :'d1')::text = '[]' and public.daily_sales(:'ws', null)::text = '[]');
reset role;
select set_config('request.jwt.claims', null, false);

-- ================================== 7. the repaired view IS 0064's view ======
select count(*) as pvd_all from public.product_velocity_daily \gset
select public.chk('7.1 ⚠️⚠️ every column of every row, both ways, as postgres: 0095''s view = 0064''s text',
  (select count(*) from (select * from _pvd_0064 except all select * from public.product_velocity_daily) x) = 0
  and (select count(*) from (select * from public.product_velocity_daily except all select * from _pvd_0064) y) = 0
  and (select count(*) from public.product_velocity_daily) >= 10,
  (select count(*) from public.product_velocity_daily)::text || ' rows');

select set_config('request.jwt.claims', :jwt_staff, false);
set role authenticated;
select public.chk('7.2 …and through the cashier''s fence, the same',
  (select count(*) from (select * from _pvd_0064 except all select * from public.product_velocity_daily) x) = 0
  and (select count(*) from (select * from public.product_velocity_daily except all select * from _pvd_0064) y) = 0
  and (select count(*) from public.product_velocity_daily) between 1 and :pvd_all - 1,
  (select count(*) from public.product_velocity_daily)::text || ' rows');
reset role;
select set_config('request.jwt.claims', null, false);

-- ---------------------------------------------------------------- verdict ---
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

drop function public._eq95(uuid, date);
drop function public._one95(uuid, date, text, date);
drop function public._sl95(uuid, numeric, text, numeric);
drop function public._pl95(uuid, numeric, text);

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 24 then
    raise exception 'expected 24 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
