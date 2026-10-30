-- ============================================================================
-- 0073 — deleting an account names every business that goes with it (`10.4b-i`,
-- the owner's ruling of 2026-10-29). Every call is made AS THE PERSON, under
-- `set role authenticated` with her claims; what is read back afterwards is read
-- as postgres, because the claim is what the database holds.
--
-- Section 1 the shape. Section 2 a one-shop account, exactly as every Wera
-- build deletes it today. Section 3 a shop and a kitchen, both hers alone.
-- Section 4 two businesses with one name. Section 5 a co-owner of a shop who
-- alone owns a kitchen. Section 6 names left over, and blanks.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, as `0072`'s suite. A refused call is made
-- through `_try`, whose handler undoes whatever the call began — so "refused,
-- and nothing changed" is read back after each one, not assumed.
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

begin;

create table public._verify (n serial, label text, passed boolean, detail text);

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

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

-- What a successful deletion answered, kept for the read-back.
create table public._answer (who text primary key, body jsonb);
grant all on public._answer to authenticated;

create function public._delete_as_me(p_who text, p_sql text)
returns text language plpgsql as $$
declare v_body jsonb;
begin
  execute p_sql into v_body;
  insert into public._answer (who, body) values (p_who, v_body);
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._delete_as_me(text, text) to authenticated;

\set uno     '''0073aaaa-0000-4000-8000-000000000001'''
\set uno_b   '''0073aaaa-0000-4000-8000-000000000002'''
\set dos     '''0073aaaa-0000-4000-8000-000000000003'''
\set gemela  '''0073aaaa-0000-4000-8000-000000000004'''
\set socia   '''0073aaaa-0000-4000-8000-000000000005'''
\set socia2  '''0073aaaa-0000-4000-8000-000000000006'''
\set cajera  '''0073aaaa-0000-4000-8000-000000000007'''
\set listing '''0073bbbb-0000-4000-8000-000000000001'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:uno,    'uno.0073@example.mx',    jsonb_build_object('full_name', 'Uno 0073')),
  (:uno_b,  'unob.0073@example.mx',   jsonb_build_object('full_name', 'Uno B 0073')),
  (:dos,    'dos.0073@example.mx',    jsonb_build_object('full_name', 'Dos 0073')),
  (:gemela, 'gemela.0073@example.mx', jsonb_build_object('full_name', 'Gemela 0073')),
  (:socia,  'socia.0073@example.mx',  jsonb_build_object('full_name', 'Socia 0073')),
  (:socia2, 'socia2.0073@example.mx', jsonb_build_object('full_name', 'Socia Dos 0073')),
  (:cajera, 'cajera.0073@example.mx', jsonb_build_object('full_name', 'Cajera 0073'));

-- Each business is made as its owner would make it: Wera's call for a shop,
-- Cocina's for a kitchen.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :uno), true);
set local role authenticated;
select onboard_workspace('Abarrotes Uno 0073') as ws_uno \gset
reset role;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :uno_b), true);
set local role authenticated;
select onboard_workspace('Abarrotes Uno B 0073') as ws_uno_b \gset
reset role;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dos), true);
set local role authenticated;
select onboard_workspace('Abarrotes Dos 0073') as ws_dos_t \gset
select onboard_workspace(p_display_name => 'Fonda Dos 0073', p_kind => 'cocina') as ws_dos_c \gset
reset role;
select id as loc_dos_c from public.location where workspace_id = :'ws_dos_c' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dos), true);
set local role authenticated;
select public.publish_listing(:listing, :'loc_dos_c', now() + interval '1 hour', now() + interval '3 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 3}]'::jsonb) is not null as published \gset
reset role;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gemela), true);
set local role authenticated;
select onboard_workspace('Doña Lupe 0073') as ws_gem_t \gset
select onboard_workspace(p_display_name => 'Doña Lupe 0073', p_kind => 'cocina') as ws_gem_c \gset
reset role;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :socia), true);
set local role authenticated;
select onboard_workspace('Abarrotes Socias 0073') as ws_soc_t \gset
select onboard_workspace(p_display_name => 'Fonda Socia 0073', p_kind => 'cocina') as ws_soc_c \gset
reset role;
-- Her partner owns the shop with her; the kitchen is hers alone.
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_soc_t', :socia2, 'owner', 'Socia Dos 0073');
-- A cashier at the partners' shop, who owns nothing.
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_soc_t', :cajera, 'staff', 'Cajera 0073');

-- Is this person, and every business of hers, still exactly as before a refusal?
create function public._untouched(p_user uuid, p_workspaces uuid[])
returns boolean language sql as $$
  select exists (select 1 from auth.users where id = p_user)
     and (select count(*) from public.workspace where id = any (p_workspaces)) = cardinality(p_workspaces)
     and (select count(*) from public.workspace_member
           where user_id = p_user and is_active and workspace_id = any (p_workspaces)) = cardinality(p_workspaces)
$$;

-- ---- 1. the shape -------------------------------------------------------------
select public.chk('1.1 one function of that name, taking the old name and the new list, both optional',
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace
                                    and p.proname = 'delete_my_account') = 1
  and (select pg_get_function_identity_arguments(p.oid) = 'p_shop_name text, p_business_names text[]'
              and p.pronargdefaults = 2
         from pg_proc p where p.oid = 'public.delete_my_account(text, text[])'::regprocedure),
  (select string_agg(pg_get_function_identity_arguments(p.oid), ' | ')
     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'delete_my_account'));
select public.chk('1.2 security definer, with an empty search_path',
  (select p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.delete_my_account(text, text[])'::regprocedure));
select public.chk('1.3 a signed-in person may call it and nobody signed out',
  has_function_privilege('authenticated', 'public.delete_my_account(text, text[])', 'execute')
  and not has_function_privilege('anon', 'public.delete_my_account(text, text[])', 'execute'));

-- ---- 2. one shop, exactly as every Wera build deletes it today -----------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :uno), true);
set local role authenticated;
select public._try('select public.delete_my_account()') as uno_none \gset
select public._try(format('select public.delete_my_account(%L)', 'Abarrotes Otra 0073')) as uno_wrong \gset
reset role;
select public.chk('2.1 nothing typed: TD007, and the shop and her login are as they were',
  :'uno_none' = 'TD007' and public._untouched(:uno, array[:'ws_uno']::uuid[]), :'uno_none');
select public.chk('2.2 another name: TD007, and nothing changed',
  :'uno_wrong' = 'TD007' and public._untouched(:uno, array[:'ws_uno']::uuid[]), :'uno_wrong');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :uno), true);
set local role authenticated;
-- The body every Wera build sends: `{p_shop_name}`, nothing else.
select public._delete_as_me('uno', format('select public.delete_my_account(p_shop_name => %L)',
  '  abarrotes UNO   0073 ')) as uno_right \gset
reset role;
select public.chk('2.3 the old call with her shop''s name, any case and spacing: {1, 0}, shop and login gone',
  :'uno_right' = 'ok'
  and (select body = '{"shops_deleted": 1, "shops_left": 0}'::jsonb from public._answer where who = 'uno')
  and not exists (select 1 from public.workspace where id = :'ws_uno')
  and not exists (select 1 from auth.users where id = :uno),
  coalesce((select body::text from public._answer where who = 'uno'), :'uno_right'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :uno_b), true);
set local role authenticated;
select public._delete_as_me('uno_b', format('select public.delete_my_account(p_business_names => array[%L])',
  'Abarrotes Uno B 0073')) as uno_b_list \gset
reset role;
select public.chk('2.4 a shop named in the new list instead: deleted the same way, {1, 0}',
  :'uno_b_list' = 'ok'
  and (select body = '{"shops_deleted": 1, "shops_left": 0}'::jsonb from public._answer where who = 'uno_b')
  and not exists (select 1 from public.workspace where id = :'ws_uno_b'),
  coalesce((select body::text from public._answer where who = 'uno_b'), :'uno_b_list'));

-- ---- 3. a shop and a kitchen, both hers alone ----------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dos), true);
set local role authenticated;
select public._try(format('select public.delete_my_account(%L)', 'Abarrotes Dos 0073')) as dos_old \gset
select public._try(format('select public.delete_my_account(%L)', 'Fonda Dos 0073')) as dos_kitchen_only \gset
select public._try(format('select public.delete_my_account(p_business_names => array[%L])',
  'Abarrotes Dos 0073')) as dos_one \gset
select public._try(format('select public.delete_my_account(p_business_names => array[%L, %L])',
  'Abarrotes Dos 0073', 'Fonda Tres 0073')) as dos_one_wrong \gset
select public._try(format('select public.delete_my_account(p_shop_name => %L, p_business_names => array[%L])',
  'Abarrotes Dos 0073', 'Abarrotes Dos 0073')) as dos_doubled \gset
reset role;
select public.chk('3.1 ⚠️ an old Wera build, typing her shop''s name alone: TD007 — the kitchen was never named — and nothing changed',
  :'dos_old' = 'TD007'
  and public._untouched(:dos, array[:'ws_dos_t', :'ws_dos_c']::uuid[])
  and exists (select 1 from public.listing where id = :listing), :'dos_old');
select public.chk('3.2 the kitchen''s name alone: TD007, nothing changed',
  :'dos_kitchen_only' = 'TD007' and public._untouched(:dos, array[:'ws_dos_t', :'ws_dos_c']::uuid[]),
  :'dos_kitchen_only');
select public.chk('3.3 one of the two in the list: TD007, nothing changed',
  :'dos_one' = 'TD007' and public._untouched(:dos, array[:'ws_dos_t', :'ws_dos_c']::uuid[]), :'dos_one');
select public.chk('3.4 both, one of them wrong: TD007, nothing changed',
  :'dos_one_wrong' = 'TD007' and public._untouched(:dos, array[:'ws_dos_t', :'ws_dos_c']::uuid[]),
  :'dos_one_wrong');
select public.chk('3.5 ⚠️ the shop''s name sent twice, old argument and new: still one business named — TD007',
  :'dos_doubled' = 'TD007' and public._untouched(:dos, array[:'ws_dos_t', :'ws_dos_c']::uuid[]),
  :'dos_doubled');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :dos), true);
set local role authenticated;
select public._delete_as_me('dos', format('select public.delete_my_account(p_business_names => array[%L, %L])',
  ' FONDA dos 0073', 'abarrotes   dos 0073')) as dos_both \gset
reset role;
select public.chk('3.6 both names, any order, case and spacing: {2, 0} — both businesses, the kitchen''s publication and her login gone',
  :'dos_both' = 'ok'
  and (select body = '{"shops_deleted": 2, "shops_left": 0}'::jsonb from public._answer where who = 'dos')
  and not exists (select 1 from public.workspace where id in (:'ws_dos_t', :'ws_dos_c'))
  and not exists (select 1 from public.listing where id = :listing)
  and not exists (select 1 from auth.users where id = :dos),
  coalesce((select body::text from public._answer where who = 'dos'), :'dos_both'));

-- ---- 4. two businesses with one name ---------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gemela), true);
set local role authenticated;
select public._try(format('select public.delete_my_account(%L)', 'Doña Lupe 0073')) as gem_old \gset
select public._try(format('select public.delete_my_account(p_business_names => array[%L])',
  'Doña Lupe 0073')) as gem_once \gset
select public._try(format('select public.delete_my_account(p_business_names => array[%L, %L])',
  'Dona Lupe 0073', 'Doña Lupe 0073')) as gem_accent \gset
reset role;
select public.chk('4.1 ⚠️ an old build typing the shared name once: TD007 — one name deletes at most one business',
  :'gem_old' = 'TD007' and public._untouched(:gemela, array[:'ws_gem_t', :'ws_gem_c']::uuid[]), :'gem_old');
select public.chk('4.2 the shared name once in the new list: TD007',
  :'gem_once' = 'TD007' and public._untouched(:gemela, array[:'ws_gem_t', :'ws_gem_c']::uuid[]), :'gem_once');
select public.chk('4.3 accents do not fold: Dona for Doña is not the name — TD007',
  :'gem_accent' = 'TD007' and public._untouched(:gemela, array[:'ws_gem_t', :'ws_gem_c']::uuid[]),
  :'gem_accent');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gemela), true);
set local role authenticated;
select public._delete_as_me('gemela', format('select public.delete_my_account(p_business_names => array[%L, %L])',
  'doña lupe 0073', 'Doña Lupe 0073')) as gem_twice \gset
reset role;
select public.chk('4.4 the shared name typed for each: {2, 0}, both gone',
  :'gem_twice' = 'ok'
  and (select body = '{"shops_deleted": 2, "shops_left": 0}'::jsonb from public._answer where who = 'gemela')
  and not exists (select 1 from public.workspace where id in (:'ws_gem_t', :'ws_gem_c')),
  coalesce((select body::text from public._answer where who = 'gemela'), :'gem_twice'));

-- ---- 5. a co-owner of a shop who alone owns a kitchen --------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :socia), true);
set local role authenticated;
select public._try('select public.delete_my_account()') as soc_none \gset
reset role;
select public.chk('5.1 nothing typed: TD007 — the kitchen goes with her and was not named',
  :'soc_none' = 'TD007' and public._untouched(:socia, array[:'ws_soc_t', :'ws_soc_c']::uuid[]), :'soc_none');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :socia), true);
set local role authenticated;
select public._delete_as_me('socia', format('select public.delete_my_account(p_business_names => array[%L])',
  'Fonda Socia 0073')) as soc_kitchen \gset
reset role;
select public.chk('5.2 the kitchen named: {1, 1} — the kitchen gone; the shop stays with her partner, and keeps her as a former member',
  :'soc_kitchen' = 'ok'
  and (select body = '{"shops_deleted": 1, "shops_left": 1}'::jsonb from public._answer where who = 'socia')
  and not exists (select 1 from public.workspace where id = :'ws_soc_c')
  and exists (select 1 from public.workspace where id = :'ws_soc_t')
  and exists (select 1 from public.workspace_member
               where workspace_id = :'ws_soc_t' and user_id = :socia2 and is_active and role = 'owner')
  and exists (select 1 from public.workspace_member
               where workspace_id = :'ws_soc_t' and user_id = :socia and not is_active
                 and left_at is not null and display_name = 'Socia 0073'),
  coalesce((select body::text from public._answer where who = 'socia'), :'soc_kitchen'));

-- ---- 6. names left over, and blanks ---------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :socia2), true);
set local role authenticated;
select public._try(format('select public.delete_my_account(p_business_names => array[%L, %L, null])',
  '', '   ')) as soc2_blank \gset
reset role;
select public.chk('6.1 blanks never stand for a name: the only owner left of the shop, sending three blanks, is refused — TD007',
  :'soc2_blank' = 'TD007' and public._untouched(:socia2, array[:'ws_soc_t']::uuid[]), :'soc2_blank');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cajera), true);
set local role authenticated;
select public._delete_as_me('cajera', format('select public.delete_my_account(p_business_names => array[%L, %L])',
  'Lo que sea', 'Abarrotes Socias 0073')) as caj_extra \gset
reset role;
select public.chk('6.2 ⚠️ names she does not own are ignored: a cashier typing her shop''s name leaves it, {0, 1}, and the shop stays',
  :'caj_extra' = 'ok'
  and (select body = '{"shops_deleted": 0, "shops_left": 1}'::jsonb from public._answer where who = 'cajera')
  and exists (select 1 from public.workspace where id = :'ws_soc_t')
  and exists (select 1 from public.workspace_member
               where workspace_id = :'ws_soc_t' and user_id = :cajera and not is_active)
  and not exists (select 1 from auth.users where id = :cajera),
  coalesce((select body::text from public._answer where who = 'cajera'), :'caj_extra'));

-- ---- the report ------------------------------------------------------------------------
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 21 then
    raise exception 'expected 21 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
