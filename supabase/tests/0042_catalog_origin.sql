-- ============================================================================
-- Behavioural verification for 0042 — is_prebuilt, and the fence on it
-- ============================================================================
-- ADR-035 §2.9, §2.7, §9. docs/PLAN.md task `6c`.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0042_catalog_origin.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `0042` is two columns and one trigger, and the whole risk is that it works in
-- the wrong direction. Three ways that could happen, and each one is a section:
--
--   * the fence catches too MUCH — a prebuilt product that cannot be renamed or
--     repriced is an imported catalog nobody can use, which is `6c`'s Finding 1
--     and the thing that would have merged automatically;
--   * the fence catches too LITTLE — the marker flipped back through a PATCH the
--     app never sends and PostgREST would accept without complaint;
--   * the BACKFILL went the wrong way, which is the owner's ruling of 2026-09-24
--     and the only part of this file that is invisible in a fresh database.
--
-- ⚠️⚠️ SECTION 4 IS THE FILE. Sections 1–3 read the catalog and are cheap;
-- section 4 drives a real manager and a real cashier under `set local role
-- authenticated`, which is the only thing here that could ever have failed.
--
-- ⚠️⚠️ AND EVERY WRITE IN SECTION 4 RUNS UNDER `set local role authenticated`.
-- As `postgres` the superuser bypasses RLS entirely — the vacuous green ADR-035
-- §9 refuses and `CLAUDE.md` names as non-negotiable. ⚠️ A TRIGGER is different
-- from a policy in exactly this respect and it is worth saying: a trigger fires
-- for the superuser too, so sections 1–3 are real even as `postgres`. What is NOT
-- real as `postgres` is the interaction — whether a cashier's refusal arrives as
-- the trigger's error or as RLS's silence — and that is 4.7.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS FILE CANNOT CLAIM
-- ----------------------------------------------------------------------------
-- ⚠️ NOTHING ABOUT HTTP. `restrict_violation` is SQLSTATE 23001 here and an HTTP
-- **400** over PostgREST — not a 403 and not a 409 — and that mapping is what the
-- client has to recognise. `docs/checks/6c-catalog-origin-contract.sh` is the only
-- instrument that can see it.
--
-- ⚠️ AND NOTHING ABOUT WHICH CONTROL A SCREEN DRAWS. `canRetireProduct` is a
-- TypeScript function and this is SQL; `app/test/api-catalog-edit.test.ts` owns
-- that half ([[a-shell-check-cannot-see-a-pure-function]], applied to a suite).

\set ON_ERROR_STOP on
\timing off

drop table if exists public._verify;
create table public._verify (n serial, label text, passed boolean, detail text);
-- ⚠️ THE GRANTS ARE NOT OPTIONAL. Section 4 calls `chk` from inside `set local
-- role authenticated`, and without these the suite dies on *"permission denied for
-- table _verify"* — which reads like an RLS finding and is a harness fault.
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

-- The applied predicate of one policy, read from the catalog and never from a file.
create or replace function public._qual(p_table text, p_policy text)
returns text language sql as $$
  select coalesce(qual::text, '') from pg_policies
   where schemaname = 'public' and tablename = p_table and policyname = p_policy;
$$;

-- ⚠️ A REFUSAL IS CAUGHT AND ITS SQLSTATE RETURNED, so an assertion can say WHICH
-- error arrived rather than only that something did. A bare `exception when others`
-- would make a typo in a column name look exactly like the fence working
-- ([[a-test-can-defend-a-bug]]).
create or replace function public._try(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._try(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 1. The columns are what 0042 says they are
-- ----------------------------------------------------------------------------
select public.chk('1.1 product_family.is_prebuilt exists, is boolean and is not null',
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='product_family'
      and column_name='is_prebuilt' and data_type='boolean' and is_nullable='NO') = 1);

select public.chk('1.2 product_variant.is_prebuilt exists, is boolean and is not null',
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name='product_variant'
      and column_name='is_prebuilt' and data_type='boolean' and is_nullable='NO') = 1);

-- ⚠️⚠️ THE DEFAULT IS THE HALF THAT MAKES `VARIANT_INSERT_COLUMNS` CORRECT WITHOUT
-- A NEW COLUMN. `5e-i` posts no marker, so every product made through `Agregar` is
-- the shop's because of this line and nothing else.
select public.chk('1.3 the default is FALSE on both — a row this app inserts is the shop''s',
  (select count(*) from information_schema.columns
    where table_schema='public' and table_name in ('product_family','product_variant')
      and column_name='is_prebuilt' and column_default = 'false') = 2,
  coalesce((select string_agg(table_name||'='||coalesce(column_default,'(none)'), ' ')
             from information_schema.columns
            where table_schema='public' and table_name in ('product_family','product_variant')
              and column_name='is_prebuilt'), '(no rows)'));

-- ----------------------------------------------------------------------------
-- 2. ⚠️⚠️ THE BACKFILL — THE OWNER'S RULING OF 2026-09-24, AND THE ONLY PLACE IT
--    IS VISIBLE IN A DATABASE THAT NEVER HAD ANY ROWS
-- ----------------------------------------------------------------------------
-- *"Everything present when the marker ships is NOT the shopkeeper's; everything
-- created through `Agregar` afterwards is."*
--
-- ⚠️⚠️ THERE IS NO `update` STATEMENT IN `0042` AND THERE MUST NOT BE, so no row in
-- a fresh database can witness the ruling — `supabase db reset` seeds the catalog
-- AFTER the migrations, so all 341 seeded variants are correctly `false`. **What
-- records it is `pg_attribute.attmissingval`**: the value Postgres hands to rows
-- that existed before the column did, stored once at `add column` time and
-- unaffected by the later `set default`. That is the ruling, in the catalog,
-- assertable forever.
--
-- ⚠️ SO A FUTURE SESSION THAT REWRITES `0042` AS `add column … default false` PLUS
-- AN `update` WOULD TURN THIS RED, which is what it is for: that spelling reaches
-- the same state in this shop and stamps `updated_at` on every row in every shop,
-- destroying the only record of when a product was last really edited.
select public.chk('2.1 a row that predates the column is OURS on product_family (attmissingval = true)',
  (select atthasmissing and attmissingval::text = '{t}' from pg_attribute
    where attrelid = 'public.product_family'::regclass and attname = 'is_prebuilt'),
  coalesce((select attmissingval::text from pg_attribute
             where attrelid = 'public.product_family'::regclass and attname = 'is_prebuilt'),
           '(no missing value — was the column added with no default?)'));

select public.chk('2.2 a row that predates the column is OURS on product_variant (attmissingval = true)',
  (select atthasmissing and attmissingval::text = '{t}' from pg_attribute
    where attrelid = 'public.product_variant'::regclass and attname = 'is_prebuilt'),
  coalesce((select attmissingval::text from pg_attribute
             where attrelid = 'public.product_variant'::regclass and attname = 'is_prebuilt'),
           '(no missing value — was the column added with no default?)'));

select public.chk('2.3 and the seed, which runs AFTER the migrations, is all the shop''s',
  (select count(*) from public.product_variant where is_prebuilt) = 0
  and (select count(*) from public.product_family where is_prebuilt) = 0,
  'variants marked ours: ' ||
    (select count(*)::text from public.product_variant where is_prebuilt));

-- ----------------------------------------------------------------------------
-- 3. The fence exists, and nothing else moved
-- ----------------------------------------------------------------------------
select public.chk('3.1 catalog_prebuilt_stays() exists and is plpgsql with an empty search_path',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='catalog_prebuilt_stays'
      and p.prolang = (select oid from pg_language where lanname='plpgsql')
      -- ⚠️ `set search_path = ''` IS STORED AS `search_path=""`, WITH THE QUOTES.
      -- Comparing against `search_path=` is green on nothing and red on a correct
      -- function, which is the shape `0041`'s own `security_invoker` assertion records.
      and array_to_string(p.proconfig,',') = 'search_path=""') = 1,
  coalesce((select array_to_string(proconfig,',') from pg_proc
             where proname='catalog_prebuilt_stays'), '(no proconfig)'));

-- ⚠️ ONE FUNCTION, TWO TRIGGERS, AND BOTH `before update or delete`. A trigger on
-- one table only is the shape of this defect that would ship: he creates Familias
-- as well as Productos, and the retire control on a family is the half no screen
-- draws yet — so nothing but this line would notice.
select public.chk('3.2 both catalog tables carry the trigger, before update or delete',
  (select count(*) from pg_trigger t
    where t.tgname = 'catalog_prebuilt_stays_trg'
      and t.tgrelid in ('public.product_family'::regclass, 'public.product_variant'::regclass)
      and not t.tgisinternal
      -- 28 = before | update | delete, in pg_trigger's tgtype bitmask
      and (t.tgtype & 2) = 2 and (t.tgtype & 8) = 8 and (t.tgtype & 16) = 16) = 2,
  coalesce((select string_agg(tgrelid::regclass::text||'/'||tgtype::text, ' ') from pg_trigger
             where tgname='catalog_prebuilt_stays_trg' and not tgisinternal), '(no triggers)'));

select public.chk('3.3 it is not callable by a client',
  not has_function_privilege('authenticated', 'public.catalog_prebuilt_stays()', 'execute'));

-- ⚠️⚠️ NO POLICY MOVED, AND THIS IS `6c`'s FINDING 1 WRITTEN AS AN ASSERTION. The
-- obvious wrong answer was `is_prebuilt = false` in the update policy's `using`
-- clause, which reads correctly and stops the shopkeeper pricing an imported
-- product. The predicate must still be the role question and nothing else.
select public.chk('3.4 neither update policy mentions the marker — Finding 1, as a guard',
  public._qual('product_variant','product_variant_update') !~ 'is_prebuilt'
  and public._qual('product_family','product_family_update') !~ 'is_prebuilt',
  public._qual('product_variant','product_variant_update'));

select public.chk('3.5 and neither catalog table has a delete policy, so the delete branch is unreachable',
  (select count(*) from pg_policies
    where schemaname='public' and tablename in ('product_family','product_variant')
      and cmd = 'DELETE') = 0);

-- ----------------------------------------------------------------------------
-- 4. Under RLS, as a real manager and a real cashier
-- ----------------------------------------------------------------------------
-- ⚠️ THE FIXTURE IS PLANTED HERE AND NOT READ OUT OF THE SEED: `supabase/seeds/`
-- creates ZERO `workspace_member` rows. ⚠️ THE UUIDS ARE THIS FILE'S OWN and are
-- distinct from every other suite's — two suites sharing one is how a fixture
-- starts passing for the wrong reason.

insert into auth.users (id, email) values
  ('0c0c0c0c-0000-4000-8000-000000000001', 'owner.0042@example.mx'),
  ('0c0c0c0c-0000-4000-8000-000000000002', 'cashier.0042@example.mx');

\set owner_id  '''0c0c0c0c-0000-4000-8000-000000000001'''
\set cashier   '''0c0c0c0c-0000-4000-8000-000000000002'''

select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', false);
select onboard_workspace('Tienda 0042') as ws \gset
select set_config('request.jwt.claims', null, false);

select id as loc from location where workspace_id = :'ws' \gset

insert into workspace_member (workspace_id, user_id, role) values (:'ws', :cashier, 'staff');
insert into member_location (workspace_id, member_id, location_id)
select :'ws', wm.id, :'loc' from workspace_member wm where wm.user_id = :cashier;

-- ⚠️⚠️ THE TWO FAMILIES AND THE TWO PRODUCTS ARE PLANTED AS `postgres` AND THEN
-- MARKED, AND THE MARKING IS ITSELF ONE OF THE CLAIMS. Nothing can mark a row
-- prebuilt except an INSERT that says so or an UPDATE from false to true — so if
-- 4.6 below were wrong, this fixture could not be built at all, and that is
-- deliberate: a fixture that needs the asymmetry proves the asymmetry is there.
insert into product_family (workspace_id, name, is_prebuilt) values
  (:'ws', 'Verdura nuestra', true),
  (:'ws', 'Verdura suya',    false);
select id as fam_ours from product_family where workspace_id=:'ws' and name='Verdura nuestra' \gset
select id as fam_his  from product_family where workspace_id=:'ws' and name='Verdura suya'    \gset

insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, is_prebuilt) values
  (:'ws', :'fam_ours', 'Jitomate', 'pza','pza','pza','pza', true),
  (:'ws', :'fam_his',  'Chile suyo', 'pza','pza','pza','pza', false);
select id as var_ours from product_variant where workspace_id=:'ws' and name='Jitomate'   \gset
select id as var_his  from product_variant where workspace_id=:'ws' and name='Chile suyo' \gset

begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- 4.1 THE CAPABILITY THIS ROW RESTORES.
--
-- ⚠️⚠️ THE WRITE AND THE READ-BACK ARE TWO STATEMENTS, AND THE FIRST WRITING OF THIS
-- FILE MADE THEM ONE. A subquery in the same statement as the `_try` that performs
-- the UPDATE sees the snapshot taken at STATEMENT START, so `is_active` came back
-- `true` and the assertion failed while the fence was working perfectly. **A
-- read-back is a separate statement or it is a lie about the write.**
select public._try(format('update public.product_variant set is_active = false where id = %L',
                          :'var_his')) as r41 \gset
select public.chk('4.1 the manager CAN retire a product the shop created',
  :'r41' = 'ok', :'r41');
select public.chk('4.1b and the row really is off the catalog afterwards',
  not (select is_active from public.product_variant where id = :'var_his'));

-- 4.2 THE FENCE.
select public.chk('4.2 and CANNOT retire one that came with the app — 23001',
  public._try(format('update public.product_variant set is_active = false where id = %L',
                     :'var_ours')) = '23001',
  public._try(format('update public.product_variant set is_active = false where id = %L',
                     :'var_ours')));

select public.chk('4.3 the prebuilt product is still active afterwards',
  (select is_active from public.product_variant where id = :'var_ours'));

-- 4.4 ⚠️⚠️ FINDING 1, DRIVEN. This is the assertion that would have caught the
-- policy-predicate version of this migration, and nothing else would have.
select public.chk('4.4 he CAN rename a prebuilt product — the reason for importing one',
  public._try(format('update public.product_variant set name = %L where id = %L',
                     'Jitomate bola', :'var_ours')) = 'ok',
  public._try(format('update public.product_variant set name = %L where id = %L',
                     'Jitomate bola', :'var_ours')));

select public.chk('4.5 and CAN set his own IVA and pack size on it',
  public._try(format('update public.product_variant set tax_rate = 0.1600, pack_size = 24 where id = %L',
                     :'var_ours')) = 'ok',
  public._try(format('update public.product_variant set tax_rate = 0.1600 where id = %L',
                     :'var_ours')));

-- 4.6 ⚠️⚠️ THE ASYMMETRY, AND THE FIRST WRITING OF `0042` GOT THIS WRONG. Fencing
-- both directions made the marker unsettable by anything but an insert — no seed,
-- no fixture, no maintenance job, no later migration. `provider_protect_generic`
-- refuses a demotion and permits a promotion, and following that precedent in the
-- file this column is added to turns out to be the right answer.
select public.chk('4.6 a shop row can be PROMOTED to prebuilt — an import''s way in',
  public._try(format('update public.product_variant set is_prebuilt = true where id = %L',
                     :'var_his')) = 'ok');

select public.chk('4.7 a prebuilt row cannot be DEMOTED to the shop — 23001',
  public._try(format('update public.product_variant set is_prebuilt = false where id = %L',
                     :'var_ours')) = '23001',
  public._try(format('update public.product_variant set is_prebuilt = false where id = %L',
                     :'var_ours')));

-- 4.8 THE SAME ON THE FAMILY, which no screen draws yet and which the fence must
-- still hold: he creates Familias as well as Productos.
select public.chk('4.8 a prebuilt FAMILY cannot be retired either — 23001',
  public._try(format('update public.product_family set is_active = false where id = %L',
                     :'fam_ours')) = '23001',
  public._try(format('update public.product_family set is_active = false where id = %L',
                     :'fam_ours')));

select public.chk('4.9 and a family the shop created can be',
  public._try(format('update public.product_family set is_active = false where id = %L',
                     :'fam_his')) = 'ok');

-- 4.10 ⚠️ A NEW PRODUCT IS HIS WITHOUT THE APP SAYING SO. This is what makes
-- `VARIANT_INSERT_COLUMNS` correct with no new column, driven rather than read off
-- `information_schema`.
-- ⚠️ TWO STATEMENTS AGAIN, for 4.1's measured reason.
select public._try(format(
    'insert into public.product_variant (workspace_id, family_id, name, base_unit_code,'
    ' purchase_unit_code, sell_unit_code, price_unit_code) values (%L, %L, %L,'
    ' ''pza'',''pza'',''pza'',''pza'')', :'ws', :'fam_ours', 'Cebolla nueva')) as r410 \gset
select public.chk('4.10 a product inserted with no marker is accepted', :'r410' = 'ok', :'r410');
select public.chk('4.10b and it is the shop''s, with the app never saying so',
  not (select is_prebuilt from public.product_variant
        where workspace_id = :'ws' and name = 'Cebolla nueva'));
commit;

-- 4.11 ⚠️⚠️ THE CASHIER, AND THE ONE THING A SUPERUSER CANNOT SEE: WHICH REFUSAL
-- SHE GETS. `product_variant_update` is `has_role(…, 'manager')`, so her PATCH does
-- not reach the trigger at all — the row is INVISIBLE to her update rather than
-- forbidden, so it is **0 rows and no error**, never 23001
-- ([[rls-update-refusal-is-a-200]]). If this ever came back as the trigger's error,
-- the fence would be leaking the existence of a distinction to somebody the policy
-- already excluded.
begin;
select set_config('request.jwt.claims',
  '{"sub":"0c0c0c0c-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

-- ⚠️ A DATA-MODIFYING CTE AND NOT A TEMP TABLE: `authenticated` may hold no TEMP
-- privilege on the database, and a harness that dies of that reads exactly like the
-- finding this assertion exists to make.
with attempt as (
  update public.product_variant set is_active = false
   where name = 'Jitomate bola'
  returning id
)
select public.chk('4.11 the cashier''s retire is SILENT — zero rows, not 23001',
  (select count(*) from attempt) = 0,
  'rows she changed: ' || (select count(*)::text from attempt));

select public.chk('4.12 she can still READ the marker, which leaks nothing',
  (select count(*) from public.product_variant
    where name = 'Jitomate bola' and is_prebuilt) = 1);
commit;

reset role;
select set_config('request.jwt.claims', null, false);

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
