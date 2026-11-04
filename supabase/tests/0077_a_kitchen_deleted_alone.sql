-- ============================================================================
-- 0077 — a kitchen deleted alone (`10.5-iii-c`, the owner's ruling of
-- 2026-11-04). Every call is made AS THE PERSON, under `set role authenticated`
-- with her claims; what is read back afterwards is read as postgres, because the
-- claim is what the database holds.
--
-- Section 1 the shape, and the purge held to `delete_my_account`'s. Section 2
-- every refusal, each read back as "nothing changed": nobody, a stranger, another
-- kitchen's owner, a cook in hers, a partner in a shared kitchen, a shop's owner,
-- and the kitchen's own owner with her shop's id or a wrong name. Section 3 her
-- kitchen deleted: everything of it gone, her login and every other business of
-- hers untouched, its photos out of reach, and the same call again refused.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, as `0073`'s suite. A refused call is made
-- through `_try`, whose handler undoes whatever the call began.
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

-- What a successful call answered, kept for the read-back.
create table public._answer (who text primary key, body jsonb);
grant all on public._answer to authenticated;

create function public._call_as_me(p_who text, p_sql text)
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
grant execute on function public._call_as_me(text, text) to authenticated;

\set lupe     '''0077aaaa-0000-4000-8000-000000000001'''
\set gerente  '''0077aaaa-0000-4000-8000-000000000002'''
\set socia    '''0077aaaa-0000-4000-8000-000000000003'''
\set socia2   '''0077aaaa-0000-4000-8000-000000000004'''
\set tendera  '''0077aaaa-0000-4000-8000-000000000005'''
\set otra     '''0077aaaa-0000-4000-8000-000000000006'''
\set vecina   '''0077aaaa-0000-4000-8000-000000000007'''
\set ida      '''0077aaaa-0000-4000-8000-000000000008'''
\set listing  '''0077bbbb-0000-4000-8000-000000000001'''
\set ninguno  '''0077cccc-0000-4000-8000-000000000001'''
\set foto     '''0077dddd-0000-4000-8000-000000000001'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:lupe,    'lupe.0077@example.mx',    jsonb_build_object('full_name', 'Lupe 0077')),
  (:gerente, 'gerente.0077@example.mx', jsonb_build_object('full_name', 'Gerente 0077')),
  (:socia,   'socia.0077@example.mx',   jsonb_build_object('full_name', 'Socia 0077')),
  (:socia2,  'socia2.0077@example.mx',  jsonb_build_object('full_name', 'Socia Dos 0077')),
  (:tendera, 'tendera.0077@example.mx', jsonb_build_object('full_name', 'Tendera 0077')),
  (:otra,    'otra.0077@example.mx',    jsonb_build_object('full_name', 'Otra 0077')),
  (:vecina,  'vecina.0077@example.mx',  jsonb_build_object('full_name', 'Vecina 0077')),
  (:ida,     'ida.0077@example.mx',     jsonb_build_object('full_name', 'Ida 0077'));

-- Lupe: two kitchens and a shop, all hers alone — each made as its app makes it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupe), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Lupe 0077', p_kind => 'cocina') as ws_k1 \gset
select onboard_workspace(p_display_name => 'Antojitos Lupe 0077', p_kind => 'cocina') as ws_k2 \gset
select onboard_workspace('Abarrotes Lupe 0077') as ws_t \gset
reset role;
select id as loc_k1 from public.location where workspace_id = :'ws_k1' \gset

-- Her first kitchen holds everything a kitchen can: a pin, a page, a publication,
-- an invitation sent, and a manager (Wera Cocina has no team; the database allows one).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupe), true);
set local role authenticated;
select public.set_store_pin(:'loc_k1', 19.4326, -99.1332, 'Junto a la farmacia') is not null as pinned \gset
select public.set_kitchen_page(:'ws_k1', jsonb_build_object('sentence', 'Comida casera', 'color', 'mole',
  'cover_path', :'ws_k1' || '/' || :foto)) is not null as paged \gset
select public.publish_listing(:listing, :'loc_k1', now() + interval '1 hour', now() + interval '3 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 3}]'::jsonb) is not null as published \gset
select public.create_invite(:'ws_k1', 'invitada.0077@example.mx', 'manager') is not null as invited \gset
reset role;
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_k1', :gerente, 'manager', 'Gerente 0077');

-- Two partners, one kitchen; a shop's owner; another kitchen's owner; a neighbour.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :socia), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Socias 0077', p_kind => 'cocina') as ws_soc \gset
reset role;
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_soc', :socia2, 'owner', 'Socia Dos 0077');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace('Tienda Tendera 0077') as ws_tend \gset
reset role;
-- Lupe also works at the shop down the street: a membership nothing here may touch.
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_tend', :lupe, 'staff', 'Lupe en la tienda 0077');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0077', p_kind => 'cocina') as ws_otra \gset
reset role;

-- ⚠️ A kitchen whose owner has left, its manager still there — the one state where
-- "another owner shares it" cannot refuse a manager, so only the owner rule does.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ida), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Ida 0077', p_kind => 'cocina') as ws_ida \gset
reset role;
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_ida', :gerente, 'manager', 'Gerente 0077');
update public.workspace_member set is_active = false where workspace_id = :'ws_ida' and user_id = :ida;

-- Is this business, with everything of it, exactly as before a refusal?
create function public._kitchen_whole(p_workspace uuid)
returns boolean language sql as $$
  select exists (select 1 from public.workspace where id = p_workspace)
     and exists (select 1 from public.location where workspace_id = p_workspace)
     and exists (select 1 from public.workspace_member
                  where workspace_id = p_workspace and is_active and role = 'owner')
$$;

-- ---- 1. the shape -------------------------------------------------------------
select public.chk('1.1 one function of that name: the business and the name typed, neither optional, answering jsonb',
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace
                                    and p.proname = 'delete_my_business') = 1
  and (select pg_get_function_identity_arguments(p.oid) = 'p_workspace_id uuid, p_business_name text'
              and p.pronargdefaults = 0 and p.prorettype = 'jsonb'::regtype
         from pg_proc p where p.oid = 'public.delete_my_business(uuid, text)'::regprocedure),
  (select string_agg(pg_get_function_identity_arguments(p.oid), ' | ')
     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'delete_my_business'));
select public.chk('1.2 security definer, with an empty search_path',
  (select p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.delete_my_business(uuid, text)'::regprocedure));
select public.chk('1.3 a signed-in person may call it, and nobody signed out',
  has_function_privilege('authenticated', 'public.delete_my_business(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.delete_my_business(uuid, text)', 'execute'));
-- ⚠️ THE PURGE IS `delete_my_account`'s, statement for statement: the tables each
-- body empties, in order. A table added to one and not the other is red here.
select public.chk('1.4 ⚠️ the purge is delete_my_account''s: the same tables emptied, in the same order',
  (select array_agg(m[1] order by ord)
     from regexp_matches((select prosrc from pg_proc where oid = 'public.delete_my_business(uuid, text)'::regprocedure),
                         'delete from public\.([a-z_]+)', 'g') with ordinality as t(m, ord))
  = (select array_agg(m[1] order by ord)
       from regexp_matches((select prosrc from pg_proc where oid = 'public.delete_my_account(text, text[])'::regprocedure),
                           'delete from public\.([a-z_]+)', 'g') with ordinality as t(m, ord)
      where m[1] not in ('member_location', 'workspace_invite'))
  and (select count(*) from regexp_matches((select prosrc from pg_proc
                                              where oid = 'public.delete_my_business(uuid, text)'::regprocedure),
                                           'delete from public\.', 'g')) = 8,
  (select string_agg(m[1], ', ' order by ord)
     from regexp_matches((select prosrc from pg_proc where oid = 'public.delete_my_business(uuid, text)'::regprocedure),
                         'delete from public\.([a-z_]+)', 'g') with ordinality as t(m, ord)));
select public.chk('1.5 the exception it sets is the one the three delete-refusing triggers ask, and it says so',
  (select prosrc like '%set_config(''tienda.purging_workspace'', p_workspace_id::text, true)%'
      and prosrc like '%set_config(''tienda.purging_workspace'', '''', true)%'
     from pg_proc where oid = 'public.delete_my_business(uuid, text)'::regprocedure)
  and obj_description('public.purging_workspace(uuid)'::regprocedure, 'pg_proc') like '%delete_my_business()%');

-- ---- 2. every refusal, and nothing changed ----------------------------------------
-- Signed in with no person in the token.
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', 'Fonda Doña Lupe 0077')) as nobody \gset
reset role;
select public.chk('2.1 no person in the token: 42501, and her kitchen is whole',
  :'nobody' = '42501' and public._kitchen_whole(:'ws_k1'), :'nobody');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', 'Fonda Doña Lupe 0077')) as by_vecina \gset
select public._try(format('select public.delete_my_business(%L, %L)', :ninguno, 'Fonda Doña Lupe 0077')) as by_vecina_none \gset
reset role;
select public.chk('2.2 a neighbour with her kitchen''s id and its name: TD012, and the kitchen is whole',
  :'by_vecina' = 'TD012' and public._kitchen_whole(:'ws_k1'), :'by_vecina');
select public.chk('2.3 ⚠️ an id that names no business answers the same TD012 — an id tells a stranger nothing',
  :'by_vecina_none' = 'TD012', :'by_vecina_none');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', 'Fonda Doña Lupe 0077')) as by_otra \gset
reset role;
select public.chk('2.4 another kitchen''s owner: TD012 — owning a kitchen is not owning hers',
  :'by_otra' = 'TD012' and public._kitchen_whole(:'ws_k1'), :'by_otra');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', 'Fonda Doña Lupe 0077')) as by_gerente \gset
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_ida', 'Fonda Ida 0077')) as by_gerente_ida \gset
reset role;
select public.chk('2.5 a manager — of her kitchen, and of one whose owner has left: TD012 both — only an owner deletes one',
  :'by_gerente' = 'TD012' and :'by_gerente_ida' = 'TD012' and public._kitchen_whole(:'ws_k1')
  and exists (select 1 from public.workspace where id = :'ws_ida')
  and exists (select 1 from public.workspace_member where workspace_id = :'ws_k1' and user_id = :gerente and is_active),
  :'by_gerente' || ' ' || :'by_gerente_ida');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :socia), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_soc', 'Fonda Socias 0077')) as by_socia \gset
reset role;
select public.chk('2.6 a partner in a kitchen two own, with its name: TD012 — not hers alone; both partners still own it',
  :'by_socia' = 'TD012' and public._kitchen_whole(:'ws_soc')
  and (select count(*) from public.workspace_member
        where workspace_id = :'ws_soc' and is_active and role = 'owner') = 2,
  :'by_socia');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_tend', 'Tienda Tendera 0077')) as by_tendera \gset
reset role;
select public.chk('2.7 ⚠️ a shop''s only owner, with her shop''s name: TD013 — a shop goes only with its owner''s account',
  :'by_tendera' = 'TD013' and public._kitchen_whole(:'ws_tend'), :'by_tendera');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupe), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_t', 'Abarrotes Lupe 0077')) as lupe_shop \gset
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', 'Fonda Otra Lupe 0077')) as lupe_wrong \gset
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', 'Antojitos Lupe 0077')) as lupe_other_name \gset
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', 'Fonda Dona Lupe 0077')) as lupe_accent \gset
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', '   ')) as lupe_blank \gset
select public._try(format('select public.delete_my_business(%L, null)', :'ws_k1')) as lupe_null \gset
reset role;
select public.chk('2.8 her own shop, by its right name: TD013, and the shop is whole',
  :'lupe_shop' = 'TD013' and public._kitchen_whole(:'ws_t'), :'lupe_shop');
select public.chk('2.9 her kitchen, a wrong name: TD007, and the kitchen is whole',
  :'lupe_wrong' = 'TD007' and public._kitchen_whole(:'ws_k1'), :'lupe_wrong');
select public.chk('2.10 ⚠️ her kitchen, her OTHER kitchen''s name: TD007 — the name is this business''s',
  :'lupe_other_name' = 'TD007' and public._kitchen_whole(:'ws_k1') and public._kitchen_whole(:'ws_k2'),
  :'lupe_other_name');
select public.chk('2.11 accents do not fold: Dona for Doña is not the name — TD007',
  :'lupe_accent' = 'TD007' and public._kitchen_whole(:'ws_k1'), :'lupe_accent');
select public.chk('2.12 a blank name and no name: TD007 both, the kitchen whole',
  :'lupe_blank' = 'TD007' and :'lupe_null' = 'TD007' and public._kitchen_whole(:'ws_k1'),
  :'lupe_blank' || ' ' || :'lupe_null');
select public.chk('2.13 after every refusal her first kitchen still holds its pin, its page, its publication and its invitation',
  exists (select 1 from public.location where id = :'loc_k1' and pin_lat is not null)
  and exists (select 1 from public.kitchen_page where workspace_id = :'ws_k1')
  and exists (select 1 from public.listing where id = :listing)
  and exists (select 1 from public.workspace_invite where workspace_id = :'ws_k1'));

-- ---- 3. her kitchen, deleted alone ---------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupe), true);
set local role authenticated;
select public.kitchen_folder_ok(:'ws_k1' || '/' || :foto || '/720.jpg') as photo_before \gset
select public._call_as_me('lupe', format('select public.delete_my_business(%L, %L)',
  :'ws_k1', '  fonda DOÑA   lupe 0077 ')) as lupe_right \gset
select public.kitchen_folder_ok(:'ws_k1' || '/' || :foto || '/720.jpg') as photo_after \gset
select public.kitchen_folder_ok(:'ws_k2' || '/' || :foto || '/720.jpg') as photo_k2 \gset
select coalesce(current_setting('tienda.purging_workspace', true), '') as purging_after \gset
reset role;
select public.chk('3.1 her kitchen''s name, in another case and spacing: it answers {business_deleted: its id}',
  :'lupe_right' = 'ok'
  and (select body = jsonb_build_object('business_deleted', :'ws_k1'::uuid) from public._answer where who = 'lupe'),
  coalesce((select body::text from public._answer where who = 'lupe'), :'lupe_right'));
select public.chk('3.2 the kitchen is gone with everything of it: its place, its page, its publication and lines, its invitation',
  not exists (select 1 from public.workspace where id = :'ws_k1')
  and not exists (select 1 from public.location where workspace_id = :'ws_k1')
  and not exists (select 1 from public.kitchen_page where workspace_id = :'ws_k1')
  and not exists (select 1 from public.listing where id = :listing)
  and not exists (select 1 from public.listing_line where listing_id = :listing)
  and not exists (select 1 from public.workspace_invite where workspace_id = :'ws_k1')
  and not exists (select 1 from public.provider where workspace_id = :'ws_k1'));
select public.chk('3.3 its memberships go with it — hers and the manager''s — and the manager''s login stays',
  not exists (select 1 from public.workspace_member where workspace_id = :'ws_k1')
  and exists (select 1 from auth.users where id = :gerente));
select public.chk('3.4 ⚠️ HER LOGIN STAYS, and so does every other business of hers: her second kitchen and her shop, hers alone and active',
  exists (select 1 from auth.users where id = :lupe)
  and public._kitchen_whole(:'ws_k2') and public._kitchen_whole(:'ws_t')
  and (select count(*) from public.workspace_member
        where user_id = :lupe and is_active and role = 'owner' and workspace_id in (:'ws_k2', :'ws_t')) = 2);
select public.chk('3.5 and her place at the shop down the street is untouched: active, her name on it, no leaving date',
  exists (select 1 from public.workspace_member
           where workspace_id = :'ws_tend' and user_id = :lupe and is_active and left_at is null
             and display_name = 'Lupe en la tienda 0077'));
select public.chk('3.6 its photos are out of everyone''s reach at once; her other kitchen''s folder is not',
  :'photo_before'::boolean and not :'photo_after'::boolean and :'photo_k2'::boolean,
  format('before %s, after %s, her other kitchen %s', :'photo_before', :'photo_after', :'photo_k2'));
select public.chk('3.7 the purge''s exception is cleared once it is done',
  :'purging_after' = '', :'purging_after');
select public.chk('3.8 nobody else''s kitchen moved: the partners'', the other owner''s, and the shop down the street',
  public._kitchen_whole(:'ws_soc') and public._kitchen_whole(:'ws_otra') and public._kitchen_whole(:'ws_tend'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupe), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_k1', 'Fonda Doña Lupe 0077')) as lupe_again \gset
reset role;
select public.chk('3.9 the same call again: TD012 — there is no such business any more',
  :'lupe_again' = 'TD012', :'lupe_again');

-- Her account is whole: deleting it now names what is left, and only that.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupe), true);
set local role authenticated;
select public._call_as_me('lupe-cuenta', format('select public.delete_my_account(p_business_names => array[%L, %L])',
  'Antojitos Lupe 0077', 'Abarrotes Lupe 0077')) as lupe_account \gset
reset role;
select public.chk('3.10 her account afterwards deletes as before, with the two names left: {2, 1} — the shop down the street keeps her as a former member',
  :'lupe_account' = 'ok'
  and (select body = '{"shops_deleted": 2, "shops_left": 1}'::jsonb from public._answer where who = 'lupe-cuenta')
  and not exists (select 1 from auth.users where id = :lupe),
  coalesce((select body::text from public._answer where who = 'lupe-cuenta'), :'lupe_account'));

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
  if (select count(*) from public._verify) <> 28 then
    raise exception 'expected 28 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
