-- ============================================================================
-- 0083 — a helper joins a kitchen by a code (`10.9b-iii`; the owner's ruling of
-- 2026-11-18: a code for one person, 24 hours, 16 characters, no address, joining
-- as a helper at once). Every call is made AS THE PERSON, under `set role
-- authenticated` with her claims; joining is `redeem_invite`, as the phone calls it.
--
-- Section 1 the shape. Section 2 the owner's code. Section 3 who may not ask for
-- one. Section 4 the kitchen's name before she joins. Section 5 joining, and the
-- code spent. Section 6 expired. Section 7 her dish's photo. Section 8 the
-- deletions.
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

-- ⚠️ A CALL WHOSE ANSWER IS READ goes through `_ask`, never a bare statement: a raise there
-- would abort the file under ON_ERROR_STOP before any check recorded its FAIL. `_j` reads an
-- answer as JSON, or NULL when it is a refusal — and `chk` counts NULL as a fail.
create function public._ask(p_sql text)
returns text language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  return v;
exception when others then
  return 'ERR ' || sqlstate;
end;
$$;
grant execute on function public._ask(text) to authenticated, anon;
create function public._j(p text)
returns jsonb language plpgsql immutable as $$
begin
  return p::jsonb;
exception when others then
  return null;
end;
$$;

\set mari     '''0083aaaa-0000-4000-8000-000000000001'''
\set lupita   '''0083aaaa-0000-4000-8000-000000000002'''
\set rosa     '''0083aaaa-0000-4000-8000-000000000003'''
\set extrana  '''0083aaaa-0000-4000-8000-000000000004'''
\set tendera  '''0083aaaa-0000-4000-8000-000000000005'''
\set otra     '''0083aaaa-0000-4000-8000-000000000006'''
\set tarde    '''0083aaaa-0000-4000-8000-000000000007'''
\set vecina   '''0083aaaa-0000-4000-8000-000000000008'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,    'mari.0083@example.mx',    jsonb_build_object('full_name', 'Mari 0083')),
  (:lupita,  'lupita.0083@example.mx',  jsonb_build_object('full_name', 'Lupita 0083')),
  (:rosa,    'rosa.0083@example.mx',    jsonb_build_object('full_name', 'Rosa 0083')),
  (:extrana, 'extrana.0083@example.mx', jsonb_build_object('full_name', 'Extraña 0083')),
  (:tendera, 'tendera.0083@example.mx', jsonb_build_object('full_name', 'Tendera 0083')),
  (:otra,    'otra.0083@example.mx',    jsonb_build_object('full_name', 'Otra 0083')),
  (:tarde,   'tarde.0083@example.mx',   jsonb_build_object('full_name', 'Tarde 0083')),
  (:vecina,  'vecina.0083@example.mx',  jsonb_build_object('full_name', 'Vecina 0083'));

-- Mari's kitchen, Otra's kitchen, a shop — each made by its owner, as the apps make them.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0083', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0083', p_kind => 'cocina') as ws_o \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0083') as ws_t \gset
-- Wera's own invitation, with an address — the token a shop's Empleada would hold.
select public.create_invite(:'ws_t', 'empleada.0083@example.mx', 'staff',
         array[(select id from public.location where workspace_id = :'ws_t')]::uuid[]) ->> 'token' as tok_tienda \gset
reset role;


-- ---- 1. the shape ----------------------------------------------------------------------
select public.chk('1.1 the address is optional, and a CHECK keeps the null to an invitation for a helper',
  (select not attnotnull from pg_attribute
    where attrelid = 'public.workspace_invite'::regclass and attname = 'email')
  and (select pg_get_constraintdef(oid) from pg_constraint
        where conrelid = 'public.workspace_invite'::regclass
          and conname = 'workspace_invite_email_or_helper_code')
      like '%email IS NOT NULL%source = ''invite''%role = ''staff''%');
select public.chk('1.2 both functions are security definer, and answer a signed-in person and nobody signed out',
  (select bool_and(prosecdef) from pg_proc
    where oid in ('public.invite_helper(uuid)'::regprocedure, 'public.kitchen_of_code(text)'::regprocedure))
  and has_function_privilege('authenticated', 'public.invite_helper(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.kitchen_of_code(text)', 'execute')
  and not has_function_privilege('anon', 'public.invite_helper(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_of_code(text)', 'execute'));


-- ---- 2. the owner's code ---------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._ask(format('select public.invite_helper(%L)', :'ws_m')) as inv1 \gset
select public._ask(format('select public.invite_helper(%L)', :'ws_m')) as inv2 \gset
select public._ask(format('select public.invite_helper(%L)', :'ws_m')) as inv3 \gset
reset role;
select coalesce(public._j(:'inv1') ->> 'token', 'none1') as tok1, coalesce(public._j(:'inv2') ->> 'token', 'none2') as tok2,
       coalesce(public._j(:'inv3') ->> 'token', 'none3') as tok3 \gset

select public.chk('2.1 the owner gets a code: 16 characters of Wera''s alphabet, good for 24 hours — the answer''s two keys',
  :'tok1' ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$'
  and (select array_agg(k order by k) from jsonb_object_keys(public._j(:'inv1')) k) = array['expires_at', 'token']
  and (public._j(:'inv1') ->> 'expires_at')::timestamptz between now() + interval '23 hours 59 minutes'
                                                         and now() + interval '24 hours 1 minute',
  :'inv1');
select public.chk('2.2 its row: no address, a helper, the kitchen''s one place, decided by the owner — only the hash kept',
  exists (select 1 from public.workspace_invite
           where token_hash = public.hash_invite_token(:'tok1')
             and workspace_id = :'ws_m' and email is null and role = 'staff' and source = 'invite'
             and location_ids = array[:'loc_m']::uuid[] and decided_by = :mari
             and accepted_at is null and superseded_at is null)
  and not exists (select 1 from public.workspace_invite where token_hash = :'tok1'));
select public.chk('2.3 a code for one person: each ask is a new code, and the earlier ones stay live',
  :'tok1' <> :'tok2' and :'tok2' <> :'tok3'
  and (select count(*) from public.workspace_invite
        where workspace_id = :'ws_m' and email is null and accepted_at is null and superseded_at is null) = 3);


-- ---- 3. who may not ask for one ---------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.invite_helper(%L)', :'ws_t')) as r_shop \gset
select public._try(format('select public.invite_helper(%L)', :'ws_m')) as r_stranger \gset
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select public._try(format('select public.invite_helper(%L)', :'ws_m')) as r_anon \gset
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.invite_helper(%L)', :'ws_m')) as r_nosub \gset
reset role;
-- Wera's own door, asked by the kitchen's owner with no address: still refused (22023).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format($s$select public.create_invite(%L, null, 'staff', array[%L]::uuid[])$s$, :'ws_m', :'loc_m')) as r_ci \gset
reset role;

select public.chk('3.1 a shop is refused TD013 — Wera''s invitations keep their address',
  :'r_shop' = 'TD013', :'r_shop');
select public.chk('3.2 someone not of the kitchen is refused 42501, and so is a call with no one signed in',
  :'r_stranger' = '42501' and :'r_anon' = '42501' and :'r_nosub' = '42501',
  format('%s %s %s', :'r_stranger', :'r_anon', :'r_nosub'));
select public.chk('3.3 ⚠️ an address-less row that is not a helper''s invitation is refused by the CHECK; Wera''s door still asks one',
  public._try(format($s$insert into public.workspace_invite (workspace_id, email, role, source, decided_by, token_hash)
                        values (%L, null, 'manager', 'invite', %L, 'x0083')$s$, :'ws_m', :mari)) = '23514'
  and public._try(format($s$insert into public.workspace_invite (workspace_id, email, role, source, requested_by)
                        values (%L, null, 'staff', 'request', %L)$s$, :'ws_m', :extrana)) = '23514'
  and :'r_ci' = '22023',
  :'r_ci');


-- ---- 4. the kitchen's name, before she joins --------------------------------------------
-- Typed as a person types it: lower case, in four groups, an O for a 0 and an I for a 1.
select lower(substr(:'tok1', 1, 4) || '-' || substr(:'tok1', 5, 4) || ' ' || substr(:'tok1', 9, 4) || ' '
             || substr(:'tok1', 13, 4)) as typed1 \gset
select translate(:'typed1', '01', 'oi') as typed1b \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupita), true);
set local role authenticated;
select public._ask(format('select public.kitchen_of_code(%L)', :'tok1')) as name1 \gset
select public._ask(format('select public.kitchen_of_code(%L)', :'typed1b')) as name1b \gset
select public._try('select public.kitchen_of_code(''ZZZZZZZZZZZZZZZZ'')') as r_unknown \gset
select public._try(format('select public.kitchen_of_code(%L)', :'tok_tienda')) as r_tienda \gset
select public._try('select public.kitchen_of_code(''   '')') as r_blank \gset
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select public._try(format('select public.kitchen_of_code(%L)', :'tok1')) as r_anon_name \gset
reset role;

select public.chk('4.1 whoever holds a live code is told the kitchen''s name, and nothing else',
  public._j(:'name1') = jsonb_build_object('kitchen_name', 'Fonda Doña Mari 0083'), :'name1');
select public.chk('4.2 typed as a person types it — lower case, grouped, O for 0 and I for 1 — the same answer',
  public._j(:'name1b') = public._j(:'name1'), :'typed1b');
select public.chk('4.3 ⚠️ no name for a code that is not one, nor for a shop''s emailed token: TD005; blank 22023',
  :'r_unknown' = 'TD005' and :'r_tienda' = 'TD005' and :'r_blank' = '22023',
  format('%s %s %s', :'r_unknown', :'r_tienda', :'r_blank'));
select public.chk('4.4 signed out, nothing is answered',
  :'r_anon_name' = '42501', :'r_anon_name');


-- ---- 5. joining, and the code spent -----------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupita), true);
set local role authenticated;
select public._ask(format('select public.redeem_invite(%L)', :'typed1')) as joined \gset
select public.my_role(:'ws_m') as role_lupita \gset
select :'loc_m'::uuid in (select public.my_locations()) as works_there \gset
select public._ask(format('select public.redeem_invite(%L)', :'tok1')) as joined_again \gset
select public._ask(format('select public.kitchen_of_code(%L)', :'tok1')) as name_hers \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :rosa), true);
set local role authenticated;
select public._try(format('select public.kitchen_of_code(%L)', :'tok1')) as r_spent_name \gset
select public._try(format('select public.redeem_invite(%L)', :'tok1')) as r_spent \gset
select public._j(public._ask(format('select public.redeem_invite(%L)', :'tok2'))) ->> 'role' as rosa_role \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupita), true);
set local role authenticated;
select public._try(format('select public.invite_helper(%L)', :'ws_m')) as r_helper_invites \gset
reset role;

select public.chk('5.1 she joins with the code as typed, at once: a helper at the kitchen, with the name she signed up with',
  public._j(:'joined') ->> 'role' = 'staff'
  and public._j(:'joined') ->> 'workspace_name' = 'Fonda Doña Mari 0083'
  and :'role_lupita' = 'staff'
  and exists (select 1 from public.workspace_member
               where workspace_id = :'ws_m' and user_id = :lupita and is_active and display_name = 'Lupita 0083'),
  :'joined');
select public.chk('5.2 and works at its place the moment she joins — the location wall lets her',
  :'works_there', :'works_there');
select public.chk('5.3 the code is spent, by her: her retry is the same answer, and its name is still hers to read',
  public._j(:'joined_again') ->> 'already_redeemed' = 'true'
  and public._j(:'name_hers') ->> 'kitchen_name' = 'Fonda Doña Mari 0083'
  and exists (select 1 from public.workspace_invite
               where token_hash = public.hash_invite_token(:'tok1') and accepted_by = :lupita and accepted_at is not null));
select public.chk('5.4 ⚠️ a code for one person: the next one to type it is refused TD005, and is told no name',
  :'r_spent_name' = 'TD005' and :'r_spent' = 'TD005',
  format('%s %s', :'r_spent_name', :'r_spent'));
select public.chk('5.5 the second code, for the second person, still works: Rosa joins too',
  :'rosa_role' = 'staff'
  and (select count(*) from public.workspace_member where workspace_id = :'ws_m' and role = 'staff' and is_active) = 2,
  :'rosa_role');
select public.chk('5.6 a helper may not invite: G18, inviting is the owner''s',
  :'r_helper_invites' = '42501', :'r_helper_invites');


-- ---- 6. expired --------------------------------------------------------------------------
-- The third code made a day ago — moved back as the database's owner, both stamps, so the
-- CHECK that an invitation expires after it is made still holds.
update public.workspace_invite
   set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour'
 where token_hash = public.hash_invite_token(:'tok3');
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tarde), true);
set local role authenticated;
select public._try(format('select public.kitchen_of_code(%L)', :'tok3')) as r_old_name \gset
select public._try(format('select public.redeem_invite(%L)', :'tok3')) as r_old \gset
reset role;
select public.chk('6.1 ⚠️ after 24 hours the code names no kitchen and joins nobody: TD003, ask for another',
  :'r_old_name' = 'TD003' and :'r_old' = 'TD003'
  and not exists (select 1 from public.workspace_member where user_id = :tarde),
  format('%s %s', :'r_old_name', :'r_old'));


-- ---- 7. her dish's photo -------------------------------------------------------------------
select public.chk('7.1 ⚠️ the bucket cocina''s insert asks staff — any member of THAT kitchen — and the kitchen''s own fence',
  case when to_regclass('storage.objects') is null then true
       else (select pg_get_expr(polwithcheck, polrelid) from pg_policy
              where polrelid = 'storage.objects'::regclass and polname = 'cocina_insert')
            like '%photo_folder_ok(name, ''staff''%kitchen_folder_ok(name)%' end,
  case when to_regclass('storage.objects') is null then 'Storage is not running here — the policy is re-made where it runs' else '' end);
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupita), true);
set local role authenticated;
select public.photo_folder_ok(:'ws_m' || '/' || gen_random_uuid() || '/720.jpg', 'staff') as f_hers,
       public.photo_folder_ok(:'ws_o' || '/' || gen_random_uuid() || '/720.jpg', 'staff') as f_other \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public.photo_folder_ok(:'ws_m' || '/' || gen_random_uuid() || '/720.jpg', 'staff') as f_vecina \gset
reset role;
select public.chk('7.2 the helper passes the fence in her kitchen''s folder; not in another kitchen''s, and a neighbour nowhere',
  :'f_hers' and not :'f_other' and not :'f_vecina',
  format('%s %s %s', :'f_hers', :'f_other', :'f_vecina'));


-- ---- 8. the deletions ------------------------------------------------------------------------
-- Otra asks for a code nobody uses and deletes her kitchen; Lupita deletes her account.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select coalesce(public._j(public._ask(format('select public.invite_helper(%L)', :'ws_o'))) ->> 'token', 'none') as tok_otra \gset
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0083')) as del_otra \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :lupita), true);
set local role authenticated;
select public._try('select public.delete_my_account()') as del_lupita \gset
reset role;

select public.chk('8.1 a kitchen deleted takes its codes, the unused one too',
  :'del_otra' = 'ok'
  and not exists (select 1 from public.workspace_invite where workspace_id = :'ws_o')
  and not exists (select 1 from public.workspace_invite where token_hash = public.hash_invite_token(:'tok_otra')),
  :'del_otra');
select public.chk('8.2 a helper''s account deleted takes the code she joined with; her name stays on her ended membership',
  :'del_lupita' = 'ok'
  and not exists (select 1 from public.workspace_invite where token_hash = public.hash_invite_token(:'tok1'))
  and exists (select 1 from public.workspace_member
               where workspace_id = :'ws_m' and user_id = :lupita and not is_active and display_name = 'Lupita 0083')
  and exists (select 1 from public.workspace_invite where token_hash = public.hash_invite_token(:'tok2')),
  :'del_lupita');


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
  if (select count(*) from public._verify) <> 23 then
    raise exception 'expected 23 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
