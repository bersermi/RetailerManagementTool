-- ============================================================================
-- 0053 — delete_my_account(), driven as the people who will call it. Plan task
-- 5R-c, the owner's rulings of 2026-10-09.
--
-- ⚠️ EVERY CALL BELOW IS UNDER `set local role authenticated`. RLS is bypassed
-- by the postgres superuser, so a fence checked as superuser passes vacuously.
-- What is READ BACK afterwards is read as postgres, because the claim being
-- checked is what the database holds, not what someone may see.
--
-- Section 1 is the SHAPE. Section 2 a cashier deleting. Section 3 a former
-- member's token, still valid for an hour, passing no fence. Section 4 a
-- co-owner leaving. Section 5 a sole owner: refused without the shop's name,
-- then deleting the shop. Section 6 the purge flag's reach. Section 7 an owner
-- deactivating a member writes the same tombstone.
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

create function public._state_is(p_label text, p_sql text, p_want text)
returns void language plpgsql as $$
declare v_got text := public._try(p_sql);
begin
  perform public.chk(p_label, v_got = p_want, format('want %s, got %s', p_want, v_got));
end;
$$;
grant execute on function public._state_is(text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 1. The shape
-- ----------------------------------------------------------------------------

select public.chk('1.1 no foreign key in public points at auth.users any more',
  not exists (select 1 from pg_constraint
               where contype = 'f' and connamespace = 'public'::regnamespace
                 and confrelid = 'auth.users'::regclass),
  coalesce((select string_agg(conname, ', ') from pg_constraint
             where contype = 'f' and connamespace = 'public'::regnamespace
               and confrelid = 'auth.users'::regclass), '(none)'));

select public.chk('1.2 every actor column is still there — the uuid is kept, never the constraint',
  (select count(*) from information_schema.columns
    where table_schema = 'public'
      and (table_name, column_name) in (
            ('sale','created_by'), ('purchase','created_by'), ('waste','created_by'),
            ('stock_batch','created_by'), ('stock_movement','created_by'),
            ('failed_write','reported_by'), ('failed_write','replayed_by'),
            ('workspace_invite','requested_by'), ('workspace_invite','accepted_by'),
            ('workspace_invite','decided_by'), ('workspace_member','user_id'))) = 11);

select public.chk('1.3 workspace_member.left_at exists and is nullable',
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'workspace_member'
      and column_name = 'left_at') = 'YES');

select public.chk('1.4 delete_my_account is security definer with an empty search_path',
  (select p.prosecdef and p.proconfig @> array['search_path=""']
     from pg_proc p where p.oid = 'public.delete_my_account(text)'::regprocedure));

select public.chk('1.5 authenticated may execute it and anon may not',
  has_function_privilege('authenticated', 'public.delete_my_account(text)', 'execute')
  and not has_function_privilege('anon', 'public.delete_my_account(text)', 'execute'));

select public.chk('1.6 the login-exists trigger function is executable by no client',
  not has_function_privilege('authenticated', 'public.workspace_member_login_exists()', 'execute')
  and not has_function_privilege('anon', 'public.workspace_member_login_exists()', 'execute'));

select public.chk('1.7 still 42 policies in public — 0053 adds none',
  (select count(*) from pg_policies where schemaname = 'public') = 42,
  format('found %s', (select count(*) from pg_policies where schemaname = 'public')));

-- ----------------------------------------------------------------------------
-- Fixtures. Shop A: an owner, a manager, a cashier with a full name in her
-- login and none on her membership, and a second cashier. Shop B: two owners.
-- Shop C: a sole owner with a manager, history, and a pending invitation.
-- ----------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('0d0d0d0d-0000-4000-8000-0000000000a1', 'owner.a.0053@example.mx',   '{}'),
  ('0d0d0d0d-0000-4000-8000-0000000000a2', 'manager.a.0053@example.mx', '{}'),
  ('0d0d0d0d-0000-4000-8000-0000000000a3', 'Maria.A.0053@example.mx',   '{"full_name":"María López"}'),
  ('0d0d0d0d-0000-4000-8000-0000000000a4', 'pepe.a.0053@example.mx',    '{}'),
  ('0d0d0d0d-0000-4000-8000-0000000000b1', 'owner1.b.0053@example.mx',  '{}'),
  ('0d0d0d0d-0000-4000-8000-0000000000b2', 'owner2.b.0053@example.mx',  '{}'),
  ('0d0d0d0d-0000-4000-8000-0000000000c1', 'owner.c.0053@example.mx',   '{}'),
  ('0d0d0d0d-0000-4000-8000-0000000000c2', 'manager.c.0053@example.mx', '{}');

\set owner_a   '''0d0d0d0d-0000-4000-8000-0000000000a1'''
\set manager_a '''0d0d0d0d-0000-4000-8000-0000000000a2'''
\set maria     '''0d0d0d0d-0000-4000-8000-0000000000a3'''
\set pepe      '''0d0d0d0d-0000-4000-8000-0000000000a4'''
\set owner_b1  '''0d0d0d0d-0000-4000-8000-0000000000b1'''
\set owner_b2  '''0d0d0d0d-0000-4000-8000-0000000000b2'''
\set owner_c   '''0d0d0d0d-0000-4000-8000-0000000000c1'''
\set manager_c '''0d0d0d0d-0000-4000-8000-0000000000c2'''

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_a), false);
select onboard_workspace('Tienda 0053 A') as ws_a \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_b1), false);
select onboard_workspace('Tienda 0053 B') as ws_b \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_c), false);
select onboard_workspace('Abarrotes Doña Chela') as ws_c \gset
select set_config('request.jwt.claims', null, false);

select id as loc_a from location where workspace_id = :'ws_a' \gset
select id as loc_c from location where workspace_id = :'ws_c' \gset

insert into workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :manager_a, 'manager'),
  (:'ws_a', :maria,     'staff'),
  (:'ws_a', :pepe,      'staff'),
  (:'ws_b', :owner_b2,  'owner'),
  (:'ws_c', :manager_c, 'manager');
insert into member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a' from workspace_member wm
 where wm.workspace_id = :'ws_a' and wm.role = 'staff';

select id as m_maria from workspace_member where user_id = :maria \gset

-- Products and stock in A and C, put there by the RPCs a shop uses.
insert into product_family (workspace_id, name) values (:'ws_a', 'Abarrotes'), (:'ws_c', 'Abarrotes');
insert into product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code)
select f.workspace_id, f.id, 'Arroz', 'pza','pza','pza','pza' from product_family f
 where f.workspace_id in (:'ws_a', :'ws_c');
select id as var_a from product_variant where workspace_id = :'ws_a' \gset
select id as var_c from product_variant where workspace_id = :'ws_c' \gset
select id as prov_a from provider where workspace_id = :'ws_a' and is_generic \gset
select id as prov_c from provider where workspace_id = :'ws_c' and is_generic \gset

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_a), true);
set local role authenticated;
select record_purchase(gen_random_uuid(), :'loc_a'::uuid, :'prov_a'::uuid,
  jsonb_build_array(jsonb_build_object('variant_id', :'var_a'::uuid,
    'qty_display', 50, 'unit_price_net_per_base', 4.00))) as r \gset
commit;

-- María sells twice and files a pilot reading; one of her sales is voided.
\set sale_m1 '''5a1e0053-0000-4000-8000-000000000001'''
\set sale_m2 '''5a1e0053-0000-4000-8000-000000000002'''
begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :maria), true);
set local role authenticated;
select record_sale(:sale_m1::uuid, :'loc_a'::uuid, jsonb_build_array(jsonb_build_object(
  'variant_id', :'var_a'::uuid, 'qty_display', 2, 'unit_price_gross_per_base', 10.00))) as r \gset
select record_sale(:sale_m2::uuid, :'loc_a'::uuid, jsonb_build_array(jsonb_build_object(
  'variant_id', :'var_a'::uuid, 'qty_display', 1, 'unit_price_gross_per_base', 10.00))) as r \gset
select void_transaction('sale', :sale_m2::uuid) as r \gset
select record_pilot_readings(:'ws_a'::uuid, jsonb_build_array(jsonb_build_object(
  'id', gen_random_uuid(), 'device_id', gen_random_uuid(), 'kind', 'taps',
  'screen', 'vender', 'value', 4, 'occurred_at', now(), 'build', 't0053'))) as r \gset
commit;

-- Shop C has a history of every kind: a purchase, a sale, a void, a waste.
\set sale_c '''5a1e0053-0000-4000-8000-0000000000c1'''
begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_c), true);
set local role authenticated;
select record_purchase(gen_random_uuid(), :'loc_c'::uuid, :'prov_c'::uuid,
  jsonb_build_array(jsonb_build_object('variant_id', :'var_c'::uuid,
    'qty_display', 30, 'unit_price_net_per_base', 4.00))) as r \gset
select record_sale(:sale_c::uuid, :'loc_c'::uuid, jsonb_build_array(jsonb_build_object(
  'variant_id', :'var_c'::uuid, 'qty_display', 3, 'unit_price_gross_per_base', 10.00))) as r \gset
select void_transaction('sale', :sale_c::uuid) as r \gset
select record_waste(gen_random_uuid(), :'loc_c'::uuid, jsonb_build_array(jsonb_build_object(
  'variant_id', :'var_c'::uuid, 'qty_display', 1, 'unit_price_gross_per_base', 10.00,
  'reason', 'caducado'))) as r \gset
commit;

-- Invitations: one TO María's address (case differs), one María REQUESTED,
-- one the manager of A SENT to somebody else, and one pending in C.
insert into workspace_invite (workspace_id, email, role, decided_by, token_hash, source)
values (:'ws_b', 'maria.a.0053@EXAMPLE.mx', 'staff', :owner_b1, 'h0053-1', 'invite'),
       (:'ws_a', 'nuevo.0053@example.mx',   'staff', :manager_a, 'h0053-2', 'invite'),
       (:'ws_c', 'alguien.0053@example.mx', 'staff', :owner_c, 'h0053-3', 'invite');
insert into workspace_invite (workspace_id, email, role, source, requested_by)
values (:'ws_c', 'maria.a.0053@example.mx', 'staff', 'request', :maria);

-- ----------------------------------------------------------------------------
-- 2. A cashier deletes her account
-- ----------------------------------------------------------------------------

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :maria), true);
set local role authenticated;
select public.delete_my_account() as result \gset
commit;

select public.chk('2.1 it answers one shop left and none deleted',
  :'result'::jsonb = '{"shops_left": 1, "shops_deleted": 0}'::jsonb, :'result');
select public.chk('2.2 her login is gone',
  not exists (select 1 from auth.users where id = :maria));
select public.chk('2.3 her identities and sessions went with it',
  not exists (select 1 from auth.identities where user_id = :maria)
  and not exists (select 1 from auth.sessions where user_id = :maria));
select public.chk('2.4 her membership is a tombstone: inactive, left_at stamped, role kept',
  (select not is_active and left_at is not null and role = 'staff'
     from workspace_member where user_id = :maria));
select public.chk('2.5 the name her login carried is frozen onto the tombstone',
  (select display_name from workspace_member where user_id = :maria) = 'María López',
  (select coalesce(display_name, '(null)') from workspace_member where user_id = :maria));
select public.chk('2.6 her sales and the void still name her uuid — no ledger row rewritten',
  (select count(*) from sale where created_by = :maria) = 3,
  format('%s', (select count(*) from sale where created_by = :maria)));
select public.chk('2.7 her stock movements still name her too',
  (select count(*) from stock_movement where created_by = :maria) >= 3);
select public.chk('2.8 her location assignment is gone — a tombstone grants nothing',
  not exists (select 1 from member_location where member_id = :'m_maria'));
select public.chk('2.9 her pilot reading survives her (5R-c (a))',
  (select count(*) from pilot_reading where member_id = :'m_maria') = 1);
select public.chk('2.10 every invitation carrying her address is gone, whatever its case',
  not exists (select 1 from workspace_invite where lower(email::text) = 'maria.a.0053@example.mx'));
select public.chk('2.11 the invitation another member SENT is untouched',
  exists (select 1 from workspace_invite where email = 'nuevo.0053@example.mx'));
select public.chk('2.12 the rest of shop A is untouched',
  (select count(*) from workspace_member where workspace_id = :'ws_a' and is_active) = 3
  and exists (select 1 from auth.users where id = :pepe));

-- ----------------------------------------------------------------------------
-- 3. Her token outlives her account by up to an hour. It passes no fence.
-- ----------------------------------------------------------------------------

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :maria), true);
set local role authenticated;
select public.chk('3.1 my_workspaces() is empty for a former member',
  not exists (select 1 from public.my_workspaces()));
select public.chk('3.2 she reads no sale of the shop she left',
  (select count(*) from public.sale) = 0);
select public.chk('3.3 she reads no product of it either',
  (select count(*) from public.product_variant) = 0);
select public._state_is('3.4 she cannot record a sale there',
  format($q$select public.record_sale(gen_random_uuid(), %L::uuid,
    jsonb_build_array(jsonb_build_object('variant_id', %L::uuid, 'qty_display', 1,
      'unit_price_gross_per_base', 10.00)))$q$, :'loc_a', :'var_a'), '42501');
select public._state_is('3.5 she cannot open a NEW shop with it — the membership needs a login',
  $q$select public.onboard_workspace('Tienda fantasma')$q$, '23503');
select public._state_is('3.6 and she cannot delete twice',
  $q$select public.delete_my_account()$q$, '42501');
commit;

-- ----------------------------------------------------------------------------
-- 4. A co-owner leaves; the shop stays with the other owner
-- ----------------------------------------------------------------------------

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_b2), true);
set local role authenticated;
select public.delete_my_account() as result \gset
commit;

select public.chk('4.1 a co-owner needs no shop name and deletes no shop',
  :'result'::jsonb = '{"shops_left": 1, "shops_deleted": 0}'::jsonb, :'result');
select public.chk('4.2 shop B is still there, with its other owner active',
  exists (select 1 from workspace where id = :'ws_b')
  and (select is_active from workspace_member where user_id = :owner_b1));
select public.chk('4.3 the co-owner is a former owner, not a deleted row',
  (select not is_active and role = 'owner' from workspace_member where user_id = :owner_b2));

-- ----------------------------------------------------------------------------
-- 5. A sole owner: refused without the shop's name, then the shop goes
-- ----------------------------------------------------------------------------

select count(*) as other_sales from sale where workspace_id <> :'ws_c' \gset

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_c), true);
set local role authenticated;
select public._state_is('5.1 no name typed: TD007',
  $q$select public.delete_my_account()$q$, 'TD007');
select public._state_is('5.2 the wrong name: TD007',
  $q$select public.delete_my_account('Abarrotes Doña Chelo')$q$, 'TD007');
commit;

select public.chk('5.3 a refusal changed nothing — the shop, its sales and the login stand',
  exists (select 1 from workspace where id = :'ws_c')
  and (select count(*) from sale where workspace_id = :'ws_c') = 2
  and exists (select 1 from auth.users where id = :owner_c));

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_c), true);
set local role authenticated;
select public.delete_my_account('  abarrotes DOÑA   chela ') as result \gset
set constraints all immediate;
commit;

select public.chk('5.4 the name matches regardless of case and spacing; one shop deleted',
  :'result'::jsonb = '{"shops_left": 0, "shops_deleted": 1}'::jsonb, :'result');
select public.chk('5.5 the shop is gone',
  not exists (select 1 from workspace where id = :'ws_c'));
select public.chk('5.6 nothing of it is kept — ledger, lots, catalog, members, invitations',
  (select count(*) from sale where workspace_id = :'ws_c')
  + (select count(*) from purchase where workspace_id = :'ws_c')
  + (select count(*) from waste where workspace_id = :'ws_c')
  + (select count(*) from stock_movement where workspace_id = :'ws_c')
  + (select count(*) from stock_batch where workspace_id = :'ws_c')
  + (select count(*) from batch_balance where workspace_id = :'ws_c')
  + (select count(*) from product_variant where workspace_id = :'ws_c')
  + (select count(*) from provider where workspace_id = :'ws_c')
  + (select count(*) from location where workspace_id = :'ws_c')
  + (select count(*) from workspace_member where workspace_id = :'ws_c')
  + (select count(*) from workspace_invite where workspace_id = :'ws_c') = 0);
select public.chk('5.7 the owner''s login is gone',
  not exists (select 1 from auth.users where id = :owner_c));
select public.chk('5.8 the manager lost the shop and kept their own login',
  exists (select 1 from auth.users where id = :manager_c)
  and not exists (select 1 from workspace_member where user_id = :manager_c));
select public.chk('5.9 no other shop lost a sale',
  (select count(*) from sale where workspace_id <> :'ws_c') = :other_sales);
select public.chk('5.10 the ledger invariant still holds everywhere',
  (select count(*) from public.batch_balance_violations()) = 0);
select public.chk('5.11 the purge flag is clear after the call',
  coalesce(current_setting('tienda.purging_workspace', true), '') = '');

-- ----------------------------------------------------------------------------
-- 6. The purge flag reaches one workspace and no other
-- ----------------------------------------------------------------------------

-- ⚠️ BOTH TARGETS ARE ROWS NOTHING REFERENCES. A sale is held by its stock
-- movements through an `on delete restrict` key, and RESTRICT raises 23001 —
-- the trigger's own code — so a check aimed at a sale passes with the trigger
-- gone. Found by falsification: a flag that reached every shop stayed green.
-- A sale LINE and an unused generic provider can only be refused by a trigger.
select id as line_m1 from sale_line where sale_id = :sale_m1 limit 1 \gset
select id as prov_b from provider where workspace_id = :'ws_b' and is_generic \gset

-- ⚠️ NO `begin … rollback` IN THIS SECTION. A check recorded inside a
-- transaction that is rolled back is rolled back with it: the first draft did
-- exactly that, and the report said "all 42 checks passed" with these three
-- missing. The flag is set and cleared at session level instead, and the
-- report below refuses a count other than the one this file declares.
select set_config('tienda.purging_workspace', :'ws_b', false);
select public._state_is('6.1 with the flag set for shop B, a sale line of shop A is still undeletable',
  format('delete from public.sale_line where id = %L', :'line_m1'), '23001');

select set_config('tienda.purging_workspace', :'ws_a', false);
select public._state_is('6.2 with the flag set for shop A, shop B''s generic provider still cannot be deleted',
  format('delete from public.provider where id = %L', :'prov_b'), '23001');

-- The flag is still set for shop A. An owner of shop A holding it, through the
-- role a phone has, deletes nothing: there is no DELETE grant or policy on the
-- ledger, so the flag alone is never enough.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_a), false);
set role authenticated;
select public._try(format('delete from public.sale where id = %L', :sale_m1)) as r63 \gset
select public._try(format('delete from public.sale_line where id = %L', :'line_m1')) as r63b \gset
reset role;
select set_config('request.jwt.claims', null, false);
select set_config('tienda.purging_workspace', '', false);
select public.chk('6.3 an owner holding the flag still deletes no sale and no line',
  exists (select 1 from sale where id = :sale_m1)
  and exists (select 1 from sale_line where id = :'line_m1'),
  format('sale: %s, line: %s', :'r63', :'r63b'));

-- ----------------------------------------------------------------------------
-- 7. An owner deactivating a member writes the same tombstone
-- ----------------------------------------------------------------------------

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner_a), true);
set local role authenticated;
update public.workspace_member set is_active = false where user_id = :pepe;
commit;
select public.chk('7.1 deactivating stamps left_at',
  (select left_at is not null from workspace_member where user_id = :pepe));

update workspace_member set is_active = true where user_id = :pepe;
select public.chk('7.2 reactivating clears it',
  (select left_at is null from workspace_member where user_id = :pepe));

select public._state_is('7.3 an active member cannot carry a left_at',
  format('update public.workspace_member set left_at = now() where user_id = %L', :pepe),
  '23514');

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
  -- A check recorded in a rolled-back transaction vanishes without failing.
  if (select count(*) from public._verify) <> 45 then
    raise exception 'expected 45 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
