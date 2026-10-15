-- ============================================================================
-- 0055 — the two doors, tried and refused; and whose address a provider vouched
-- for. Plan task `5P-e`, the owner's rulings of 2026-10-15.
--
-- ⚠️ THE TWO HOLES ARE DRIVEN EXACTLY AS THE REVIEW OF 2026-10-13 SHOWED THEM,
-- under `set role authenticated` with a member's claims — as the superuser they
-- would pass vacuously. (1) A manager writes an OWNER invitation straight into
-- `workspace_invite`, past `create_invite`'s refusal. (2) An owner erases a
-- membership, past the tombstone. Both must now be refused at the grant (42501).
-- D7's two outcomes are `0029_request_path.sql`'s §4 and §4b.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

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
-- 1. The grants, read off the catalog
-- ----------------------------------------------------------------------------
select public.chk('1.1 authenticated may no longer INSERT into workspace_invite',
  not has_table_privilege('authenticated', 'public.workspace_invite', 'insert'));
select public.chk('1.2 nor DELETE from it',
  not has_table_privilege('authenticated', 'public.workspace_invite', 'delete'));
select public.chk('1.3 nor DELETE a membership',
  not has_table_privilege('authenticated', 'public.workspace_member', 'delete'));
select public.chk('1.4 and the app keeps what it uses: reading invites, reading and updating memberships',
  has_table_privilege('authenticated', 'public.workspace_invite', 'select')
  and has_table_privilege('authenticated', 'public.workspace_member', 'select')
  and has_table_privilege('authenticated', 'public.workspace_member', 'update'));
select public.chk('1.5 login_address_verified is granted to nobody',
  not has_function_privilege('authenticated', 'public.login_address_verified(uuid, public.citext)', 'execute')
  and not has_function_privilege('anon', 'public.login_address_verified(uuid, public.citext)', 'execute'));

-- ----------------------------------------------------------------------------
-- Fixtures: a shop with an owner and a manager
-- ----------------------------------------------------------------------------
\set owner  '''0055aaaa-0000-4000-8000-000000000001'''
\set mgr    '''0055aaaa-0000-4000-8000-000000000002'''
\set mailer '''0055aaaa-0000-4000-8000-000000000003'''
\set googler '''0055aaaa-0000-4000-8000-000000000004'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner,   'duena.0055@example.mx',    jsonb_build_object('full_name', 'Dueña 0055')),
  (:mgr,     'gerente.0055@example.mx',  jsonb_build_object('full_name', 'Gerente 0055')),
  (:mailer,  'correo.0055@example.mx',   '{}'::jsonb),
  (:googler, 'google.0055@example.mx',   '{}'::jsonb);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('email-0055', :mailer,
   jsonb_build_object('sub', :mailer, 'email', 'correo.0055@example.mx'), 'email', now(), now(), now()),
  ('google-0055', :googler,
   jsonb_build_object('sub', 'google-0055', 'email', 'google.0055@example.mx', 'email_verified', true), 'google', now(), now(), now());

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Tienda 0055') as ws \gset
select set_config('request.jwt.claims', null, false);

insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws', :mgr, 'manager', 'Gerente 0055')
returning id as m_mgr \gset

-- ----------------------------------------------------------------------------
-- 2. The doors, tried as the people the review named
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mgr), false);
set role authenticated;
select public._try(format(
  'insert into public.workspace_invite (workspace_id, email, role, source, decided_by) values (%L, %L, %L, %L, %L)',
  :'ws', 'segunda.duena@example.mx', 'owner', 'invite', :mgr)) as door1 \gset
reset role;
select public.chk('2.1 ⚠️ a manager can no longer write an OWNER invitation into the table — 42501',
  :'door1' = '42501', :'door1');
select public.chk('2.2 and no such invitation exists',
  not exists (select 1 from public.workspace_invite where email = 'segunda.duena@example.mx'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
set role authenticated;
select public._try(format('delete from public.workspace_member where id = %L', :'m_mgr')) as door2 \gset
reset role;
select public.chk('2.3 ⚠️ an owner can no longer erase a membership — 42501, the tombstone is the only way out',
  :'door2' = '42501', :'door2');
select public.chk('2.4 and the manager is still a member',
  exists (select 1 from public.workspace_member where id = :'m_mgr' and is_active));
select set_config('request.jwt.claims', null, false);

-- ----------------------------------------------------------------------------
-- 3. Whose address a provider vouched for
-- ----------------------------------------------------------------------------
select public.chk('3.1 an email-and-password login is not vouched for',
  not public.login_address_verified(:mailer, 'correo.0055@example.mx'));
select public.chk('3.2 a Google identity carrying the address is',
  public.login_address_verified(:googler, 'google.0055@example.mx'));
select public.chk('3.3 the case of the address does not matter',
  public.login_address_verified(:googler, 'Google.0055@Example.MX'));
select public.chk('3.4 a Google identity carrying ANOTHER address vouches for nothing here',
  not public.login_address_verified(:googler, 'correo.0055@example.mx'));

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
  if (select count(*) from public._verify) <> 13 then
    raise exception 'expected 13 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
