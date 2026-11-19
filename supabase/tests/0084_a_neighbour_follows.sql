-- ============================================================================
-- 0084 — a neighbour follows a kitchen (`10.9d-i`; the owner's rulings G19–G23
-- of 2026-11-17). Every call is made AS THE PERSON, under `set role
-- authenticated` with her claims; the nightly job's function and the clock's
-- 30 days are run as postgres, as pg_cron runs them on the live database.
--
-- Section 1 the shape: two tables nobody signed in reaches, the trigger, the
-- nightly job, three doors for the signed-in only. Section 2 her side: either
-- switch, both, none; what she reads; what is refused, changing nothing.
-- Section 3 the kitchen's side: how many, never who. Section 4 the deletions: a
-- kitchen that leaves, its name for 30 days and not a day more; her account.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK. A refused call is made through `_try`,
-- whose handler undoes whatever it began.
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
grant execute on function public._try(text) to authenticated, anon;

create table public._answer (who text primary key, body jsonb);
grant all on public._answer to authenticated;

create function public._call_as_me(p_who text, p_sql text)
returns text language plpgsql as $$
declare v_body jsonb;
begin
  execute p_sql into v_body;
  insert into public._answer (who, body) values (p_who, v_body)
  on conflict (who) do update set body = excluded.body;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._call_as_me(text, text) to authenticated;

create function public._a(p_who text)
returns jsonb language sql as $$ select a.body from public._answer a where a.who = p_who $$;
-- One kitchen of `my_follows`' list, as one person got it.
create function public._f(p_who text, p_id uuid)
returns jsonb language sql as $$
  select k from public._answer a, jsonb_array_elements(a.body -> 'kitchens') k
   where a.who = p_who and (k ->> 'id')::uuid = p_id
$$;

\set mari    '''0084aaaa-0000-4000-8000-000000000001'''
\set cook    '''0084aaaa-0000-4000-8000-000000000002'''
\set otra    '''0084aaaa-0000-4000-8000-000000000003'''
\set tendera '''0084aaaa-0000-4000-8000-000000000004'''
\set ana     '''0084aaaa-0000-4000-8000-000000000005'''
\set beto    '''0084aaaa-0000-4000-8000-000000000006'''
\set callada '''0084aaaa-0000-4000-8000-000000000007'''
\set lm      '''0084bbbb-0000-4000-8000-000000000001'''
\set nadie   '''0084cccc-0000-4000-8000-000000000009'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,    'mari.0084@example.mx',    jsonb_build_object('full_name', 'Mari 0084')),
  (:cook,    'cook.0084@example.mx',    jsonb_build_object('full_name', 'Cook 0084')),
  (:otra,    'otra.0084@example.mx',    jsonb_build_object('full_name', 'Otra 0084')),
  (:tendera, 'tendera.0084@example.mx', jsonb_build_object('full_name', 'Tendera 0084')),
  (:ana,     'ana.0084@example.mx',     jsonb_build_object('full_name', 'Ana Rodríguez')),
  (:beto,    'beto.0084@example.mx',    jsonb_build_object('full_name', 'Beto Pérez')),
  (:callada, 'callada.0084@example.mx', jsonb_build_object('full_name', 'Callada 0084'));

-- Mari's kitchen, with her cook (staff) and an offer today; Otra's kitchen; a
-- quiet kitchen that never published (not in the door); a shop.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0084', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :cook, 'staff', 'Cook 0084');
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0084', p_kind => 'cocina') as ws_o \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :callada), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Cocina Callada 0084', p_kind => 'cocina') as ws_c \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0084') as ws_t \gset
reset role;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 20}]'::jsonb) is not null as published_m \gset
reset role;


-- ---- 1. the shape ---------------------------------------------------------------------
select public.chk('1.1 two tables in servicio, and no client role holds any right on either',
  to_regclass('servicio.follow') is not null and to_regclass('servicio.kitchen_gone') is not null
  and not exists (select 1 from information_schema.role_table_grants g
                   where g.table_schema = 'servicio' and g.table_name in ('follow', 'kitchen_gone')
                     and g.grantee in ('anon', 'authenticated', 'PUBLIC')));
select public.chk('1.2 a kitchen''s deletion passes the trigger, before the row goes, for a kitchen only',
  exists (select 1 from pg_trigger t
           where t.tgrelid = 'public.workspace'::regclass and t.tgname = 'kitchen_leaves'
             and not t.tgisinternal and t.tgenabled = 'O'
             and pg_get_triggerdef(t.oid) ~ 'BEFORE DELETE' and pg_get_triggerdef(t.oid) ~ 'cocina'));
select public.chk('1.3 the nightly job is scheduled and active, and runs the function that forgets',
  exists (select 1 from cron.job j
           where j.jobname = 'forget-gone-kitchens' and j.active
             and j.command = 'select servicio.forget_gone_kitchens()'));
select public.chk('1.4 the three doors: the signed-in may call each, nobody signed out may; the trigger and the job''s function nobody',
  has_function_privilege('authenticated', 'public.set_my_follow(uuid, boolean, boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.my_follows()', 'execute')
  and has_function_privilege('authenticated', 'public.kitchen_followers(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.set_my_follow(uuid, boolean, boolean)', 'execute')
  and not has_function_privilege('anon', 'public.my_follows()', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_followers(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.forget_gone_kitchens()', 'execute')
  and not has_function_privilege('authenticated', 'servicio.kitchen_leaves()', 'execute'));


-- ---- 2. her side ---------------------------------------------------------------------
-- Ana follows Mari (Seguir), rings Otra without following it, follows the quiet
-- kitchen and then lets it go; Beto follows Mari and Otra.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-m', format('select public.set_my_follow(%L, p_following => true)', :'ws_m')) as ana_m \gset
select public._call_as_me('ana-m-again', format('select public.set_my_follow(%L, p_following => true)', :'ws_m')) as ana_m2 \gset
select public._call_as_me('ana-m-bell', format('select public.set_my_follow(%L, p_bell => true)', :'ws_m')) as ana_mb \gset
select public._call_as_me('ana-o', format('select public.set_my_follow(%L, p_bell => true)', :'ws_o')) as ana_o \gset
select public._call_as_me('ana-c', format('select public.set_my_follow(%L, true, false)', :'ws_c')) as ana_c \gset
select public._call_as_me('ana-c-off', format('select public.set_my_follow(%L, false, false)', :'ws_c')) as ana_c_off \gset
select public._call_as_me('ana-list', 'select public.my_follows()') as ana_list \gset
select public._call_as_me('ana-door', 'select public.on_offer_now()') as ana_door \gset
-- Refused, each changing nothing.
select public._try(format('select public.set_my_follow(%L)', :'ws_m')) as nothing \gset
select public._try(format('select public.set_my_follow(%L, p_following => true)', :'ws_t')) as a_shop \gset
select public._try(format('select public.set_my_follow(%L, p_following => true)', :nadie)) as no_one \gset
select public._try('select public.set_my_follow(null, p_following => true)') as null_id \gset
select public._try('select count(*) from servicio.follow') as read_table \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-m', format('select public.set_my_follow(%L, p_following => true)', :'ws_m')) as beto_m \gset
select public._call_as_me('beto-o', format('select public.set_my_follow(%L, p_following => true)', :'ws_o')) as beto_o \gset
select public._call_as_me('beto-list', 'select public.my_follows()') as beto_list \gset
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select public._try(format('select public.set_my_follow(%L, p_following => true)', :'ws_m')) as anon_set \gset
select public._try('select public.my_follows()') as anon_list \gset
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.set_my_follow(%L, p_following => true)', :'ws_m')) as nosub_set \gset
select public._try('select public.my_follows()') as nosub_list \gset
reset role;

select public.chk('2.1 Seguir: following, the bell off until she taps it — and a retry answers the same',
  :'ana_m' = 'ok' and public._a('ana-m') = '{"following": true, "bell": false}'::jsonb
  and :'ana_m2' = 'ok' and public._a('ana-m-again') = '{"following": true, "bell": false}'::jsonb,
  concat_ws(' ', :'ana_m', public._a('ana-m')::text, :'ana_m2'));
select public.chk('2.2 the bell named alone leaves following as it was: on where she follows, off where she does not',
  :'ana_mb' = 'ok' and public._a('ana-m-bell') = '{"following": true, "bell": true}'::jsonb
  and :'ana_o' = 'ok' and public._a('ana-o') = '{"following": false, "bell": true}'::jsonb,
  concat_ws(' ', public._a('ana-m-bell')::text, public._a('ana-o')::text));
select public.chk('2.3 both off: no row of hers is left for that kitchen — and a kitchen nobody''s door sends may be followed',
  :'ana_c' = 'ok' and public._a('ana-c') = '{"following": true, "bell": false}'::jsonb
  and :'ana_c_off' = 'ok' and public._a('ana-c-off') = '{"following": false, "bell": false}'::jsonb
  and not exists (select 1 from servicio.follow where user_id = :ana and workspace_id = :'ws_c'),
  concat_ws(' ', :'ana_c', :'ana_c_off'));
select public.chk('2.4 her list: the two kitchens she follows or rings, by name, each with exactly the keys Mis cocinas reads; nothing gone',
  :'ana_list' = 'ok'
  and (select array_agg(k ->> 'name' order by n) from jsonb_array_elements(public._a('ana-list') -> 'kitchens') with ordinality as t(k, n))
      = array['Fonda Doña Mari 0084', 'Fonda Otra 0084']
  and (select bool_and((select array_agg(x order by x) from jsonb_object_keys(k) x)
                       = array['bell', 'colonia', 'following', 'giro', 'id', 'last_day', 'name', 'page', 'since'])
         from jsonb_array_elements(public._a('ana-list') -> 'kitchens') k)
  and public._a('ana-list') -> 'gone' = '[]'::jsonb
  and (select array_agg(x order by x) from jsonb_object_keys(public._a('ana-list')) x) = array['gone', 'kitchens'],
  coalesce(public._a('ana-list')::text, :'ana_list'));
select public.chk('2.5 each kitchen says which switch is on: Mari followed and rung, Otra rung only',
  (public._f('ana-list', :'ws_m') ->> 'following')::boolean and (public._f('ana-list', :'ws_m') ->> 'bell')::boolean
  and not (public._f('ana-list', :'ws_o') ->> 'following')::boolean and (public._f('ana-list', :'ws_o') ->> 'bell')::boolean,
  concat_ws(' ', public._f('ana-list', :'ws_m')::text, public._f('ana-list', :'ws_o')::text));
select public.chk('2.6 publicó hoy: her last_day is the door''s summary.last_day for the same kitchen, and Otra, who never published, has none',
  public._f('ana-list', :'ws_m') ->> 'last_day' is not null
  and public._f('ana-list', :'ws_m') ->> 'last_day'
      = (select k -> 'summary' ->> 'last_day' from jsonb_array_elements(public._a('ana-door')) k where (k ->> 'id')::uuid = :'ws_m')
  and public._f('ana-list', :'ws_o') -> 'last_day' = 'null'::jsonb,
  concat_ws(' ', public._f('ana-list', :'ws_m') ->> 'last_day', public._f('ana-list', :'ws_o') ->> 'last_day'));
select public.chk('2.7 her list is hers: Beto reads his own two, followed, and nothing of Ana''s bell',
  :'beto_list' = 'ok'
  and (select array_agg(k ->> 'name' order by n) from jsonb_array_elements(public._a('beto-list') -> 'kitchens') with ordinality as t(k, n))
      = array['Fonda Doña Mari 0084', 'Fonda Otra 0084']
  and not (public._f('beto-list', :'ws_m') ->> 'bell')::boolean
  and (public._f('beto-list', :'ws_o') ->> 'following')::boolean,
  coalesce(public._a('beto-list')::text, :'beto_list'));
select public.chk('2.8 refused, changing nothing: nothing to change 22023; a shop, nobody''s id and none at all TD026; the table itself 42501',
  :'nothing' = '22023' and :'a_shop' = 'TD026' and :'no_one' = 'TD026' and :'null_id' = 'TD026'
  and :'read_table' = '42501'
  and (select count(*) from servicio.follow where user_id = :ana) = 2,
  concat_ws(' ', :'nothing', :'a_shop', :'no_one', :'null_id', :'read_table'));
select public.chk('2.9 nobody signed in: refused before anything is read — anon by its grant, a token with no person 42501',
  :'anon_set' = '42501' and :'anon_list' = '42501' and :'nosub_set' = '42501' and :'nosub_list' = '42501',
  concat_ws(' ', :'anon_set', :'anon_list', :'nosub_set', :'nosub_list'));


-- ---- 3. the kitchen's side: how many, never who --------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.kitchen_followers(:'ws_m') as n_mari \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public.kitchen_followers(:'ws_m') as n_cook \gset
select public._try(format('select public.kitchen_followers(%L)', :'ws_o')) as cook_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.kitchen_followers(:'ws_o') as n_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.kitchen_followers(%L)', :'ws_m')) as ana_count \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.kitchen_followers(%L)', :'ws_t')) as shop_count \gset
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select public._try(format('select public.kitchen_followers(%L)', :'ws_m')) as anon_count \gset
reset role;

select public.chk('3.1 Te siguen N: Mari''s kitchen reads 2 — Ana and Beto — her helper reads the same',
  :'n_mari'::int = 2 and :'n_cook'::int = 2,
  concat_ws(' ', :'n_mari', :'n_cook'));
select public.chk('3.2 a bell without following is not a follower: Otra reads 1 (Beto), never Ana''s bell',
  :'n_otra'::int = 1, :'n_otra');
select public.chk('3.3 nobody else reads a kitchen''s count: a neighbour, another kitchen''s helper, signed out 42501; a shop TD013',
  :'ana_count' = '42501' and :'cook_otra' = '42501' and :'anon_count' = '42501' and :'shop_count' = 'TD013',
  concat_ws(' ', :'ana_count', :'cook_otra', :'anon_count', :'shop_count'));
select public.chk('3.4 the answer is a number and only a number: no id, name or moment of a follower in it',
  pg_get_function_result('public.kitchen_followers(uuid)'::regprocedure) = 'integer');


-- ---- 4. the deletions ----------------------------------------------------------------------
-- Otra deletes her kitchen alone: Beto followed it, Ana only rang it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0084')) as del_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-after-otra', 'select public.my_follows()') as beto_after \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('ana-after-otra', 'select public.my_follows()') as ana_after \gset
reset role;

select public.chk('4.1 a kitchen deleted alone: its follows and bells go with it',
  :'del_otra' = 'ok' and not exists (select 1 from servicio.follow where workspace_id = :'ws_o'),
  :'del_otra');
select public.chk('4.2 dejó Itacate: Beto, who followed it, keeps its name and the moment — and only that',
  (select array_agg(x order by x) from jsonb_array_elements(public._a('beto-after-otra') -> 'gone') g, jsonb_object_keys(g) x)
      = array['gone_at', 'id', 'name']
  and public._a('beto-after-otra') -> 'gone' -> 0 ->> 'name' = 'Fonda Otra 0084'
  and (public._a('beto-after-otra') -> 'gone' -> 0 ->> 'id')::uuid = :'ws_o'::uuid
  and (select array_agg(k ->> 'name') from jsonb_array_elements(public._a('beto-after-otra') -> 'kitchens') k)
      = array['Fonda Doña Mari 0084'],
  coalesce(public._a('beto-after-otra')::text, :'beto_after'));
select public.chk('4.3 a bell without following keeps nothing: Ana is not told Otra left, and her list is Mari alone',
  public._a('ana-after-otra') -> 'gone' = '[]'::jsonb
  and (select array_agg(k ->> 'name') from jsonb_array_elements(public._a('ana-after-otra') -> 'kitchens') k)
      = array['Fonda Doña Mari 0084']
  and not exists (select 1 from servicio.kitchen_gone where user_id = :ana),
  coalesce(public._a('ana-after-otra')::text, :'ana_after'));

-- Thirty days on: the read stops at 30 days, and the nightly job deletes.
update servicio.kitchen_gone set gone_at = now() - interval '30 days' + interval '1 minute' where workspace_id = :'ws_o';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-day-29', 'select public.my_follows()') as beto_29 \gset
reset role;
select servicio.forget_gone_kitchens() as forgot_29 \gset
update servicio.kitchen_gone set gone_at = now() - interval '30 days' where workspace_id = :'ws_o';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('beto-day-30', 'select public.my_follows()') as beto_30 \gset
reset role;
select servicio.forget_gone_kitchens() as forgot_30 \gset

select public.chk('4.4 a minute short of 30 days the name is still read, and the job keeps it',
  jsonb_array_length(public._a('beto-day-29') -> 'gone') = 1 and :'forgot_29'::int = 0,
  concat_ws(' ', public._a('beto-day-29') -> 'gone', :'forgot_29'));
select public.chk('4.5 at 30 days the read shows nothing, and the nightly job deletes the row',
  public._a('beto-day-30') -> 'gone' = '[]'::jsonb and :'forgot_30'::int = 1
  and not exists (select 1 from servicio.kitchen_gone where workspace_id = :'ws_o'),
  concat_ws(' ', public._a('beto-day-30') -> 'gone', :'forgot_30'));

-- Mari deletes her account, her kitchen with it — after following it herself.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.set_my_follow(%L, p_following => true)', :'ws_m')) as mari_self \gset
select public._try(format('select public.delete_my_account(p_business_names => %L)',
                          array['Fonda Doña Mari 0084'])) as del_mari \gset
reset role;

select public.chk('4.6 her account deleted with her kitchen: its follows go, each follower keeps its name — and nothing of Mari''s own is left',
  :'mari_self' = 'ok' and :'del_mari' = 'ok'
  and not exists (select 1 from servicio.follow where workspace_id = :'ws_m')
  and (select array_agg(user_id order by user_id) from servicio.kitchen_gone where workspace_id = :'ws_m')
      = array[:ana, :beto]::uuid[]
  and not exists (select 1 from servicio.follow where user_id = :mari)
  and not exists (select 1 from servicio.kitchen_gone where user_id = :mari),
  concat_ws(' ', :'mari_self', :'del_mari'));

-- Ana follows the quiet kitchen again, then deletes her account.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._try(format('select public.set_my_follow(%L, p_following => true)', :'ws_c')) as ana_c_again \gset
select public._try('select public.delete_my_account()') as del_ana \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :callada), true);
set local role authenticated;
select public.kitchen_followers(:'ws_c') as n_callada \gset
reset role;

select public.chk('4.7 a neighbour''s account deleted: her follows, her bells and her kitchens gone go with her; the kitchen she followed counts 0',
  :'ana_c_again' = 'ok' and :'del_ana' = 'ok'
  and not exists (select 1 from servicio.follow where user_id = :ana)
  and not exists (select 1 from servicio.kitchen_gone where user_id = :ana)
  and :'n_callada'::int = 0
  and exists (select 1 from servicio.kitchen_gone where user_id = :beto and workspace_id = :'ws_m'),
  concat_ws(' ', :'ana_c_again', :'del_ana', :'n_callada'));


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
  if (select count(*) from public._verify) <> 24 then
    raise exception 'expected 24 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
