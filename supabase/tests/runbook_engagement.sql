-- ============================================================================
-- docs/runbooks/engagement.sql — the read the owner runs to see how much each
-- shop uses Wera, driven against three shops whose calendar is written out by
-- hand below. Plan task 5P-b.
--
-- ⚠️ THERE IS NO MIGRATION BEHIND THIS SUITE, which is why it carries no number.
-- The runbook is a FILE that claims things about the applied schema — six
-- tables, `location.timezone`, `reversal_of` — and nothing else would notice a
-- migration renaming one of them until the owner ran it against the shops and
-- got an error, or worse a wrong number.
--
-- ⚠️ IT RUNS AS THE SUPERUSER ON PURPOSE. Everywhere else in this directory
-- that is the vacuous way to test, because RLS is bypassed. Here it is the
-- real condition: the runbook goes through the Management API as the database
-- owner and reads every shop at once. Nobody signed into the app runs it.
--
-- ⚠️ EVERY FIXTURE IS PLACED AT A LOCAL CLOCK TIME IN ITS OWN STORE, and the
-- expectations below are a calendar, not a recomputation. 23:30 in Mexico City
-- is the next day in UTC; 23:30 in Tijuana is the next day in Mexico City. So
-- a read that buckets in UTC, or in one zone for every store, is red here at
-- any hour this suite runs.
--
-- HOW THE RUNBOOK GETS IN. psql reads it CLIENT-SIDE, as
-- `supabase/pgtap/07_money_and_units.sql` reads `cases.json`:
--
--   default    psql -f supabase/tests/runbook_engagement.sql   (from the repo root)
--   docker exec, which cannot see the repository:
--              docker exec -i supabase_db_<project> psql -U postgres \
--                -v engagement_sql="$(cat docs/runbooks/engagement.sql)" \
--                -f - < supabase/tests/runbook_engagement.sql
--
-- It cannot fail quietly: an unreadable file leaves the variable empty, the
-- `create table … as` below is then a syntax error, and ON_ERROR_STOP exits
-- non-zero before anything is asserted.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

\if :{?engagement_sql}
  \echo '# the runbook was supplied by the caller as -v engagement_sql='
\else
  \set engagement_sql `cat docs/runbooks/engagement.sql`
\endif

create table public._verify (n serial, label text, passed boolean, detail text);

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;

-- ----------------------------------------------------------------------------
-- Fixtures, the read, and nothing between them: ONE transaction, so `now()` is
-- one instant for the fixtures and for the runbook, and *today* cannot change
-- between placing a document and counting it.
-- ----------------------------------------------------------------------------
begin;

insert into auth.users (id, email) values
  ('5b5b5b5b-0000-4000-8000-000000000001', 'owner.a.5pb@example.mx'),
  ('5b5b5b5b-0000-4000-8000-000000000002', 'owner.b.5pb@example.mx'),
  ('5b5b5b5b-0000-4000-8000-000000000003', 'owner.c.5pb@example.mx');

-- Each shop is made the way a real one is: `onboard_workspace` names the store
-- after the shop, which is the case the `shop` column collapses to one name.
select set_config('request.jwt.claims',
  '{"sub":"5b5b5b5b-0000-4000-8000-000000000001","role":"authenticated"}', false);
select public.onboard_workspace('Abarrotes Lupita') as ws_a \gset
select set_config('request.jwt.claims',
  '{"sub":"5b5b5b5b-0000-4000-8000-000000000002","role":"authenticated"}', false);
select public.onboard_workspace('Frutería Norte') as ws_b \gset
select set_config('request.jwt.claims',
  '{"sub":"5b5b5b5b-0000-4000-8000-000000000003","role":"authenticated"}', false);
select public.onboard_workspace('Pollería Nueva') as ws_c \gset
select set_config('request.jwt.claims', null, false);

-- B has a second store.
insert into public.location (workspace_id, name) values (:'ws_b', 'Playas');

select id as loc_a  from public.location where workspace_id = :'ws_a' \gset
select id as loc_b  from public.location where workspace_id = :'ws_b' and name = 'Frutería Norte' \gset
select id as loc_b2 from public.location where workspace_id = :'ws_b' and name = 'Playas' \gset
select id as loc_c  from public.location where workspace_id = :'ws_c' \gset

select id as prov_a from public.provider where workspace_id = :'ws_a' and is_generic \gset

-- A and B opened a month ago. C signed up the day before yesterday, at noon.
update public.location set created_at = now() - interval '30 days'
 where id in (:'loc_a', :'loc_b', :'loc_b2');
update public.location set timezone = 'America/Tijuana' where id = :'loc_b';
-- ⚠️ THE TWO STORES THAT RECORD NOTHING SIT AT THE TWO ENDS OF THE CLOCK, and no
-- shop is really there. Pago Pago is UTC−11 and Kiritimati is UTC+14, so at any
-- instant at least one of them is on a different DATE from UTC. A read that took
-- *today* from the server's clock is therefore red in 5.3 at whatever hour this
-- runs — with Mexican zones alone it would be red only after 18:00, and CI
-- runs when somebody pushes.
update public.location set timezone = 'Pacific/Pago_Pago'  where id = :'loc_b2';
update public.location set timezone = 'Pacific/Kiritimati' where id = :'loc_c';
update public.location
   set created_at = (((now() at time zone timezone)::date - 2) + time '12:00') at time zone timezone
 where id = :'loc_c';

-- What *today* is in each store, written down once inside this transaction so
-- the assertions further down read the same day the fixtures were placed on.
create table public._today as
select l.id as location_id, l.timezone, (now() at time zone l.timezone)::date as hoy
  from public.location l;

-- A local clock time `p_back` days ago in a store, as the instant it was.
create function public._at(p_location uuid, p_back integer, p_clock time)
returns timestamptz language sql stable as $$
  select ((t.hoy - p_back) + p_clock) at time zone t.timezone
    from public._today t where t.location_id = p_location;
$$;

-- ⚠️ SHOP A, Mexico City. Written newest first.
--   today        one write-off, this instant
--   yesterday    two sales at 23:30 and 23:45 (already tomorrow in UTC),
--                one delivery, one write-off
--   2 days ago   NOTHING but the cancellation of the sale below
--   3 days ago   one sale, cancelled the next morning
--   13 days ago  one sale at 00:00, the first instant inside the window
--   14 days ago  one sale at 12:00, outside it
insert into public.waste (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                          created_by, payload_hash)
values ('5b5b5b5b-a000-4000-8000-000000000001', :'ws_a', :'loc_a', now(), 10.00, 1.60,
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-w0'),
       ('5b5b5b5b-a000-4000-8000-000000000002', :'ws_a', :'loc_a',
        public._at(:'loc_a', 1, '10:05'), 10.00, 1.60,
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-w1');

insert into public.purchase (id, workspace_id, location_id, provider_id, occurred_at,
                             total_net, total_tax, created_by, payload_hash)
values ('5b5b5b5b-a000-4000-8000-000000000003', :'ws_a', :'loc_a', :'prov_a',
        public._at(:'loc_a', 1, '10:00'), 60.00, 9.60,
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-p1');

insert into public.sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                         created_by, payload_hash)
values ('5b5b5b5b-a000-4000-8000-000000000004', :'ws_a', :'loc_a',
        public._at(:'loc_a', 1, '23:30'), 100.00, 16.00,
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-s1a'),
       ('5b5b5b5b-a000-4000-8000-000000000005', :'ws_a', :'loc_a',
        public._at(:'loc_a', 1, '23:45'), 100.00, 16.00,
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-s1b'),
       ('5b5b5b5b-a000-4000-8000-000000000006', :'ws_a', :'loc_a',
        public._at(:'loc_a', 3, '12:00'), 100.00, 16.00,
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-s3'),
       ('5b5b5b5b-a000-4000-8000-000000000007', :'ws_a', :'loc_a',
        public._at(:'loc_a', 13, '00:00'), 100.00, 16.00,
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-s13'),
       ('5b5b5b5b-a000-4000-8000-000000000008', :'ws_a', :'loc_a',
        public._at(:'loc_a', 14, '12:00'), 100.00, 16.00,
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-s14');

-- The cancellation, the way `void_transaction` (`0021`) writes one: a second
-- row in the same table, negated, on its own day.
insert into public.sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                         reversal_of, reversal_reason, created_by, payload_hash)
values ('5b5b5b5b-a000-4000-8000-000000000009', :'ws_a', :'loc_a',
        public._at(:'loc_a', 2, '09:00'), -100.00, -16.00,
        '5b5b5b5b-a000-4000-8000-000000000006', 'se cobró dos veces',
        '5b5b5b5b-0000-4000-8000-000000000001', 'h-a-s3-void');

-- ⚠️ SHOP B's first store, Tijuana: one sale yesterday at 23:30, which is
-- already today in Mexico City. Its second store, and all of shop C, record
-- nothing at all.
insert into public.sale (id, workspace_id, location_id, occurred_at, total_net, total_tax,
                         created_by, payload_hash)
values ('5b5b5b5b-b000-4000-8000-000000000001', :'ws_b', :'loc_b',
        public._at(:'loc_b', 1, '23:30'), 100.00, 16.00,
        '5b5b5b5b-0000-4000-8000-000000000002', 'h-b-s1');

create table public._got as :engagement_sql

commit;

-- One cell of the read, as "sales/purchases/waste", or '(no row)'.
create function public._cell(p_shop text, p_back integer, p_location uuid)
returns text language sql stable as $$
  select coalesce(
    (select g.sales || '/' || g.purchases || '/' || g.waste
       from public._got g
      where g.shop = p_shop
        and g.day::date = (select t.hoy - p_back
                       from public._today t where t.location_id = p_location)),
    '(no row)');
$$;

-- ----------------------------------------------------------------------------
-- 1. The shape, which is the aviso's promise
-- ----------------------------------------------------------------------------

select public.chk('1.1 the columns are shop, day, weekday and the three counts — and no person',
  (select array_agg(column_name::text order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public' and table_name = '_got')
    = array['shop', 'day', 'weekday', 'sales', 'purchases', 'waste'],
  (select string_agg(column_name, ', ' order by ordinal_position)
     from information_schema.columns
    where table_schema = 'public' and table_name = '_got')
  || ' — the aviso (finalidad 9) says "conteos por tienda, no por persona"; change it first');

select public.chk('1.2 the day is TEXT shaped 2026-10-13 — the CLI prints a date as a UTC midnight',
  (select data_type from information_schema.columns
    where table_schema = 'public' and table_name = '_got' and column_name = 'day') = 'text'
  and not exists (select 1 from public._got where day::text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  (select data_type from information_schema.columns
    where table_schema = 'public' and table_name = '_got' and column_name = 'day'));

select public.chk('1.3 one row per store per day, never two',
  (select count(*) from public._got)
    = (select count(*) from (select distinct shop, day from public._got) d),
  format('%s rows', (select count(*) from public._got)));

select public.chk('1.4 four stores are listed, the second store of a shop under both names',
  (select array_agg(distinct shop order by shop) from public._got)
    = array['Abarrotes Lupita', 'Frutería Norte', 'Frutería Norte · Playas', 'Pollería Nueva'],
  (select string_agg(distinct shop, ' | ' order by shop) from public._got));

-- ----------------------------------------------------------------------------
-- 2. Shop A's calendar, Mexico City
-- ----------------------------------------------------------------------------

select public.chk('2.1 today: the write-off of this instant',
  public._cell('Abarrotes Lupita', 0, :'loc_a') = '0/0/1',
  public._cell('Abarrotes Lupita', 0, :'loc_a'));

select public.chk('2.2 yesterday: two sales at 23:30 and 23:45 local, one delivery, one write-off',
  public._cell('Abarrotes Lupita', 1, :'loc_a') = '2/1/1',
  public._cell('Abarrotes Lupita', 1, :'loc_a') || ' — 0/1/1 means the day was cut in UTC');

select public.chk('2.3 two days ago: a cancellation alone is a day with nothing recorded',
  public._cell('Abarrotes Lupita', 2, :'loc_a') = '0/0/0',
  public._cell('Abarrotes Lupita', 2, :'loc_a') || ' — 1/0/0 means the reversal row was counted');

select public.chk('2.4 three days ago: the cancelled sale still counts where it was recorded',
  public._cell('Abarrotes Lupita', 3, :'loc_a') = '1/0/0',
  public._cell('Abarrotes Lupita', 3, :'loc_a'));

select public.chk('2.5 a day with nothing is a row of zeros, not a missing row',
  public._cell('Abarrotes Lupita', 5, :'loc_a') = '0/0/0',
  public._cell('Abarrotes Lupita', 5, :'loc_a'));

select public.chk('2.6 thirteen days ago at 00:00 is the first instant inside the window',
  public._cell('Abarrotes Lupita', 13, :'loc_a') = '1/0/0',
  public._cell('Abarrotes Lupita', 13, :'loc_a'));

select public.chk('2.7 fourteen days ago is outside it',
  public._cell('Abarrotes Lupita', 14, :'loc_a') = '(no row)',
  public._cell('Abarrotes Lupita', 14, :'loc_a'));

select public.chk('2.8 so fourteen rows, four sales, one delivery, two write-offs',
  (select count(*) || ' rows ' || sum(sales) || '/' || sum(purchases) || '/' || sum(waste)
     from public._got where shop = 'Abarrotes Lupita') = '14 rows 4/1/2',
  (select count(*) || ' rows ' || sum(sales) || '/' || sum(purchases) || '/' || sum(waste)
     from public._got where shop = 'Abarrotes Lupita'));

-- ----------------------------------------------------------------------------
-- 3. Shop B, Tijuana — the day is the STORE's
-- ----------------------------------------------------------------------------

select public.chk('3.1 a sale at 23:30 in Tijuana is YESTERDAY there',
  public._cell('Frutería Norte', 1, :'loc_b') = '1/0/0',
  public._cell('Frutería Norte', 1, :'loc_b') || ' — 0/0/0 means every store was cut in one zone');

select public.chk('3.2 and not today',
  public._cell('Frutería Norte', 0, :'loc_b') = '0/0/0',
  public._cell('Frutería Norte', 0, :'loc_b'));

select public.chk('3.3 its second store recorded nothing and is listed for all fourteen days',
  (select count(*) || ' rows ' || sum(sales + purchases + waste)
     from public._got where shop = 'Frutería Norte · Playas') = '14 rows 0',
  (select count(*) || ' rows ' || sum(sales + purchases + waste)
     from public._got where shop = 'Frutería Norte · Playas'));

select public.chk('3.4 a document belongs to ONE store: the first store of B carries one sale in all',
  (select sum(sales + purchases + waste) from public._got where shop = 'Frutería Norte') = 1,
  format('%s', (select sum(sales + purchases + waste) from public._got where shop = 'Frutería Norte')));

-- ----------------------------------------------------------------------------
-- 4. Shop C signed up two days ago and never recorded
-- ----------------------------------------------------------------------------

select public.chk('4.1 it is listed — signing up and recording nothing is the finding',
  public._cell('Pollería Nueva', 0, :'loc_c') = '0/0/0',
  public._cell('Pollería Nueva', 0, :'loc_c'));

select public.chk('4.2 with three rows: its calendar starts the day it was created',
  (select count(*) from public._got where shop = 'Pollería Nueva') = 3
  and public._cell('Pollería Nueva', 2, :'loc_c') = '0/0/0'
  and public._cell('Pollería Nueva', 3, :'loc_c') = '(no row)',
  format('%s rows', (select count(*) from public._got where shop = 'Pollería Nueva')));

-- ----------------------------------------------------------------------------
-- 5. What a reader leans on
-- ----------------------------------------------------------------------------

select public.chk('5.1 the weekday is the day''s own, worked out a second way',
  not exists (select 1 from public._got g
               where g.weekday is distinct from
                     (array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[extract(isodow from g.day::date)::int]),
  (select string_agg(distinct weekday, ',') from public._got));

select public.chk('5.2 the counts are whole numbers, never null',
  not exists (select 1 from public._got
               where sales is null or purchases is null or waste is null),
  '');

select public.chk('5.3 every store''s newest row is ITS today, at both ends of the clock',
  (select count(*) from public._today) = 4
  and not exists (
    select 1
      from public._today t
      left join (select l.id as location_id, max(g.day::date) as newest
                   from public._got g
                   join public.location  l on true
                   join public.workspace w on w.id = l.workspace_id
                  where g.shop = case when l.name = w.display_name then w.display_name
                                      else w.display_name || ' · ' || l.name end
                  group by l.id) n using (location_id)
     where n.newest is distinct from t.hoy),
  (select string_agg(t.timezone || ' ' || t.hoy, ', ' order by t.timezone) from public._today t)
  || ' — server date ' || (now() at time zone 'UTC')::date);

-- ----------------------------------------------------------------------------
-- The report
-- ----------------------------------------------------------------------------
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

drop function public._cell(text, integer, uuid);
drop function public._at(uuid, integer, time);
