-- ============================================================================
-- 0082 — a helper publishes, and leaves her kitchen (`10.9b-i`; the owner's
-- rulings G13, G18 and G36 of 2026-11-16 and 17). Every call is made AS THE
-- PERSON, under `set role authenticated` with her claims. A helper is made the
-- way a phone will make her: the owner's invitation naming the kitchen's place,
-- redeemed by her (`create_invite`, `redeem_invite`, 0028).
--
-- Section 1 the shape. Section 2 a helper at work, and what stays the owner's.
-- Section 3 a shop does not move. Section 4 *Salir de esta cocina*. Section 5
-- the owner removes a helper. Section 6 the deletions.
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

-- How many rows a statement touched, as the caller: RLS refuses an UPDATE with 0.
create function public._rows(p_sql text)
returns integer language plpgsql as $$
declare v_n integer;
begin
  execute p_sql;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
grant execute on function public._rows(text) to authenticated;

\set mari     '''0082aaaa-0000-4000-8000-000000000001'''
\set cook     '''0082aaaa-0000-4000-8000-000000000002'''
\set cook2    '''0082aaaa-0000-4000-8000-000000000003'''
\set sinlugar '''0082aaaa-0000-4000-8000-000000000004'''
\set otra     '''0082aaaa-0000-4000-8000-000000000005'''
\set ayudo    '''0082aaaa-0000-4000-8000-000000000006'''
\set ayudo2   '''0082aaaa-0000-4000-8000-000000000007'''
\set tendera  '''0082aaaa-0000-4000-8000-000000000008'''
\set empleada '''0082aaaa-0000-4000-8000-000000000009'''
\set extrana  '''0082aaaa-0000-4000-8000-00000000000a'''
\set lm       '''0082bbbb-0000-4000-8000-000000000001'''
\set lc       '''0082bbbb-0000-4000-8000-000000000002'''
\set lo       '''0082bbbb-0000-4000-8000-000000000003'''
\set ls       '''0082bbbb-0000-4000-8000-000000000004'''
\set lsl      '''0082bbbb-0000-4000-8000-000000000005'''
\set lx       '''0082bbbb-0000-4000-8000-000000000006'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,     'mari.0082@example.mx',     jsonb_build_object('full_name', 'Mari 0082')),
  (:cook,     'cook.0082@example.mx',     jsonb_build_object('full_name', 'Lupita 0082')),
  (:cook2,    'cook2.0082@example.mx',    jsonb_build_object('full_name', 'Chayo 0082')),
  (:sinlugar, 'sinlugar.0082@example.mx', jsonb_build_object('full_name', 'Sin lugar 0082')),
  (:otra,     'otra.0082@example.mx',     jsonb_build_object('full_name', 'Otra 0082')),
  (:ayudo,    'ayudo.0082@example.mx',    jsonb_build_object('full_name', 'Ayudo 0082')),
  (:ayudo2,   'ayudo2.0082@example.mx',   jsonb_build_object('full_name', 'Ayudo Dos 0082')),
  (:tendera,  'tendera.0082@example.mx',  jsonb_build_object('full_name', 'Tendera 0082')),
  (:empleada, 'empleada.0082@example.mx', jsonb_build_object('full_name', 'Empleada 0082')),
  (:extrana,  'extrana.0082@example.mx',  jsonb_build_object('full_name', 'Extraña 0082'));

-- Mari's kitchen; Otra's kitchen; a shop. Each made by its owner, as the apps make them.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0082', p_kind => 'cocina') as ws_m \gset
reset role;
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0082', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_o from public.location where workspace_id = :'ws_o' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0082') as ws_t \gset
reset role;
select id as loc_t from public.location where workspace_id = :'ws_t' \gset

-- Each owner invites, naming her one place; each invited person redeems her own token.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.create_invite(:'ws_m', 'cook.0082@example.mx', 'staff', array[:'loc_m']::uuid[]) ->> 'token' as tok_cook \gset
select public.create_invite(:'ws_m', 'cook2.0082@example.mx', 'staff', array[:'loc_m']::uuid[]) ->> 'token' as tok_cook2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.create_invite(:'ws_o', 'ayudo.0082@example.mx', 'staff', array[:'loc_o']::uuid[]) ->> 'token' as tok_ayudo \gset
select public.create_invite(:'ws_o', 'ayudo2.0082@example.mx', 'staff', array[:'loc_o']::uuid[]) ->> 'token' as tok_ayudo2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public.create_invite(:'ws_t', 'empleada.0082@example.mx', 'staff', array[:'loc_t']::uuid[]) ->> 'token' as tok_empleada \gset
reset role;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.redeem_invite(%L)', :'tok_cook')) as red_cook \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook2), true);
set local role authenticated;
select public._try(format('select public.redeem_invite(%L)', :'tok_cook2')) as red_cook2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ayudo), true);
set local role authenticated;
select public._try(format('select public.redeem_invite(%L)', :'tok_ayudo')) as red_ayudo \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ayudo2), true);
set local role authenticated;
select public._try(format('select public.redeem_invite(%L)', :'tok_ayudo2')) as red_ayudo2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :empleada), true);
set local role authenticated;
select public._try(format('select public.redeem_invite(%L)', :'tok_empleada')) as red_empleada \gset
reset role;

-- A helper whose membership names no place and carries no name — not a way the app makes
-- one; the wall's own case, and the name a membership gets as it ends.
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_m', :sinlugar, 'staff', null);

-- Mari's offer today, and Otra's.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 20}]'::jsonb) is not null as published_m \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public.publish_listing(:lo, :'loc_o', :'q0'::timestamptz, :'q0'::timestamptz + interval '3 hours',
  '[{"name": "Tamales", "unit_price": "20.00", "quantity": 10}]'::jsonb) is not null as published_o \gset
reset role;


-- ---- 1. the shape ---------------------------------------------------------------------
select public.chk('1.1 leave_kitchen executes for the signed-in alone — never anon, never public — and is security definer',
  has_function_privilege('authenticated', 'public.leave_kitchen(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.leave_kitchen(uuid)', 'execute')
  and not exists (select 1 from information_schema.routine_privileges p
                   where p.routine_name = 'leave_kitchen' and p.grantee = 'PUBLIC')
  and (select prosecdef from pg_proc where oid = 'public.leave_kitchen(uuid)'::regprocedure));
-- ⚠️ Since `0087` (`10.9g-i`) `publish_listing` takes a sixth argument, defaulted (`p_promotion_id`):
-- read under the signature it has now.
select public.chk('1.2 the three re-made keep their signatures, their grants and security definer',
  (select bool_and(p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')
                   and not has_function_privilege('anon', p.oid, 'execute'))
     from pg_proc p
    where p.oid in ('public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb, uuid)'::regprocedure,
                    'public.withdraw_listing(uuid)'::regprocedure,
                    'public.set_listing_quantity(uuid, integer, numeric)'::regprocedure)));
select public.chk('1.3 an invitation naming the kitchen''s place makes a helper of a kitchen — staff, active, at its place',
  :'red_cook' = 'ok' and :'red_cook2' = 'ok' and :'red_ayudo' = 'ok' and :'red_ayudo2' = 'ok'
  and (select count(*) from public.workspace_member wm
         join public.member_location ml on ml.member_id = wm.id and ml.location_id = :'loc_m'
        where wm.workspace_id = :'ws_m' and wm.user_id in (:cook, :cook2) and wm.role = 'staff' and wm.is_active) = 2,
  concat_ws(' ', :'red_cook', :'red_cook2', :'red_ayudo', :'red_ayudo2'));


-- ---- 2. a helper at work ---------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format($q$select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz + interval '2 hours',
  '[{"name": "Pozole", "unit_price": "50.00", "quantity": 6}]'::jsonb)$q$, :lc, :'loc_m', :'q0', :'q0')) as cook_pub \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 12)', :lm)) as cook_qty \gset
select public._try(format('select public.withdraw_listing(%L)', :lc)) as cook_wd \gset
select count(*) as cook_sees from public.listing where workspace_id = :'ws_m' \gset
select public._try(format($q$select public.set_kitchen_page(%L, '{"sentence": "La de la esquina"}'::jsonb)$q$, :'ws_m')) as cook_page \gset
select public._try(format($q$select public.set_kitchen_features(%L, '{"tarjeta": "off"}'::jsonb)$q$, :'ws_m')) as cook_feat \gset
select public._try(format('select public.send_menu_request(%L, %L)', :'ws_m', 'Un menú')) as cook_menu \gset
reset role;

select public.chk('2.1 a helper publishes at her kitchen — the listing is the kitchen''s',
  :'cook_pub' = 'ok' and exists (select 1 from public.listing where id = :lc and workspace_id = :'ws_m'),
  :'cook_pub');
select public.chk('2.2 a helper says how many are left (− and +) on her kitchen''s offer',
  :'cook_qty' = 'ok' and (select quantity from public.listing_line where listing_id = :lm and line_no = 1) = 12,
  :'cook_qty');
select public.chk('2.3 a helper takes down what is published (Deshacer, Ya se terminó)',
  :'cook_wd' = 'ok' and (select withdrawn_at is not null from public.listing where id = :lc),
  :'cook_wd');
select public.chk('2.4 a helper reads her kitchen''s offers',
  :'cook_sees'::int = 2, :'cook_sees');
select public.chk('2.5 her page, the features and the menu stay the owner''s — 42501 each, nothing written',
  :'cook_page' = '42501' and :'cook_feat' = '42501' and :'cook_menu' = '42501'
  and not exists (select 1 from servicio.kitchen_feature where workspace_id = :'ws_m')
  and not exists (select 1 from servicio.menu_request where workspace_id = :'ws_m'),
  concat_ws(' ', :'cook_page', :'cook_feat', :'cook_menu'));

-- The location wall, and another kitchen's helper.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :sinlugar), true);
set local role authenticated;
select public._try(format($q$select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz + interval '2 hours',
  '[{"name": "Sopa", "unit_price": "30.00", "quantity": 3}]'::jsonb)$q$, :lsl, :'loc_m', :'q0', :'q0')) as sl_pub \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 5)', :lm)) as sl_qty \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ayudo), true);
set local role authenticated;
select public._try(format($q$select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz + interval '2 hours',
  '[{"name": "Sopa", "unit_price": "30.00", "quantity": 3}]'::jsonb)$q$, :lx, :'loc_m', :'q0', :'q0')) as ay_pub \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 1)', :lm)) as ay_qty \gset
select public._try(format('select public.withdraw_listing(%L)', :lm)) as ay_wd \gset
reset role;

select public.chk('2.6 a helper whose membership names no place is refused, as before — the location wall stays',
  :'sl_pub' = '42501' and :'sl_qty' = '42501' and not exists (select 1 from public.listing where id = :lsl),
  concat_ws(' ', :'sl_pub', :'sl_qty'));
select public.chk('2.7 another kitchen''s helper cannot publish at, change or take down Mari''s — 42501 each, nothing moved',
  :'ay_pub' = '42501' and :'ay_qty' = '42501' and :'ay_wd' = '42501'
  and not exists (select 1 from public.listing where id = :lx)
  and (select quantity from public.listing_line where listing_id = :lm and line_no = 1) = 12
  and (select withdrawn_at is null from public.listing where id = :lm),
  concat_ws(' ', :'ay_pub', :'ay_qty', :'ay_wd'));


-- ---- 3. a shop does not move -------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :empleada), true);
set local role authenticated;
select public._try(format($q$select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz + interval '2 hours',
  '[{"name": "Jitomate", "unit_price": "20.00", "quantity": 3}]'::jsonb)$q$, :ls, :'loc_t', :'q0', :'q0')) as em_pub \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format($q$select public.publish_listing(%L, %L, %L::timestamptz, %L::timestamptz + interval '2 hours',
  '[{"name": "Jitomate", "unit_price": "20.00", "quantity": 3}]'::jsonb)$q$, :ls, :'loc_t', :'q0', :'q0')) as te_pub \gset
reset role;

select public.chk('3.1 a shop''s Empleada at her own store is refused 42501, as before — not let past the role to TD013',
  :'red_empleada' = 'ok' and :'em_pub' = '42501', concat_ws(' ', :'red_empleada', :'em_pub'));
select public.chk('3.2 a shop''s owner is still refused TD013 — only a kitchen publishes',
  :'te_pub' = 'TD013' and not exists (select 1 from public.listing where id = :ls), :'te_pub');


-- ---- 4. Salir de esta cocina -------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_m')) as out_nobody \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :extrana), true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_m')) as out_stranger \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :empleada), true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_t')) as out_shop \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_m')) as out_owner \gset
reset role;

select public.chk('4.1 signed out, a stranger, and a shop''s Empleada at her shop — 42501 each, nothing ended',
  :'out_nobody' = '42501' and :'out_stranger' = '42501' and :'out_shop' = '42501'
  and (select is_active from public.workspace_member where workspace_id = :'ws_t' and user_id = :empleada),
  concat_ws(' ', :'out_nobody', :'out_stranger', :'out_shop'));
select public.chk('4.2 the owner does not leave her kitchen — TD025, still its active owner',
  :'out_owner' = 'TD025'
  and (select is_active and role = 'owner' from public.workspace_member where workspace_id = :'ws_m' and user_id = :mari),
  :'out_owner');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_m')) as out_cook \gset
reset role;
select left_at as left_first from public.workspace_member where workspace_id = :'ws_m' and user_id = :cook \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_m')) as out_again \gset
select public._try(format('select public.set_listing_quantity(%L, 1, 9)', :lm)) as cook_after_qty \gset
select count(*) as cook_after_sees from public.listing where workspace_id = :'ws_m' \gset
select count(*) as cook_after_ws from public.my_workspaces() w where w = :'ws_m' \gset
reset role;

select public.chk('4.3 a helper leaves: her membership ends, stamped, her name kept — and her account stays',
  :'out_cook' = 'ok'
  and (select not is_active and left_at is not null and display_name = 'Lupita 0082'
         from public.workspace_member where workspace_id = :'ws_m' and user_id = :cook)
  and exists (select 1 from auth.users where id = :cook),
  :'out_cook');
select public.chk('4.4 the same tap again is nothing and no error — the moment she left unchanged',
  :'out_again' = 'ok'
  and (select left_at from public.workspace_member where workspace_id = :'ws_m' and user_id = :cook) = :'left_first'::timestamptz,
  :'out_again');
select public.chk('4.5 once she left, her phone loses the kitchen: no change accepted, no offer read, not among her businesses',
  :'cook_after_qty' = '42501' and :'cook_after_sees'::int = 0 and :'cook_after_ws'::int = 0
  and (select quantity from public.listing_line where listing_id = :lm and line_no = 1) = 12,
  concat_ws(' ', :'cook_after_qty', :'cook_after_sees', :'cook_after_ws'));


select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :sinlugar), true);
set local role authenticated;
select public._try(format('select public.leave_kitchen(%L)', :'ws_m')) as out_sinlugar \gset
reset role;
select public.chk('4.6 a membership with no name takes her login''s name as it ends, as a deleted account''s does',
  :'out_sinlugar' = 'ok'
  and (select not is_active and display_name = 'Sin lugar 0082'
         from public.workspace_member where workspace_id = :'ws_m' and user_id = :sinlugar),
  :'out_sinlugar');


-- ---- 5. the owner removes a helper --------------------------------------------------------
-- A helper cannot end another member's membership; the owner can, with the table's own policy.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ayudo2), true);
set local role authenticated;
select public._rows(format('update public.workspace_member set is_active = false where workspace_id = %L and user_id = %L', :'ws_o', :ayudo)) as ay2_removes \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._rows(format('update public.workspace_member set is_active = false where workspace_id = %L and user_id = %L', :'ws_o', :ayudo)) as otra_removes \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ayudo), true);
set local role authenticated;
select public._try(format('select public.set_listing_quantity(%L, 1, 4)', :lo)) as ay_after \gset
reset role;

select public.chk('5.1 a helper cannot remove another — RLS touches 0 rows, she stays',
  :'ay2_removes'::int = 0, :'ay2_removes');
select public.chk('5.2 the owner removes a helper from her list — one row — and that helper is refused at once',
  :'otra_removes'::int = 1 and :'ay_after' = '42501'
  and (select left_at is not null from public.workspace_member where workspace_id = :'ws_o' and user_id = :ayudo),
  concat_ws(' ', :'otra_removes', :'ay_after'));


-- ---- 6. the deletions --------------------------------------------------------------------
-- Chayo, a helper at Mari's, deletes her account; Otra deletes her kitchen, a helper still in it.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook2), true);
set local role authenticated;
select public._try('select public.delete_my_account()') as del_cook2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.delete_my_business(%L, %L)', :'ws_o', 'Fonda Otra 0082')) as del_otra \gset
reset role;

select public.chk('6.1 a helper''s account deleted: her membership ends with her name kept, and the kitchen and its owner stay',
  :'del_cook2' = 'ok'
  and not exists (select 1 from auth.users where id = :cook2)
  and exists (select 1 from public.workspace_member
               where workspace_id = :'ws_m' and not is_active and left_at is not null and display_name = 'Chayo 0082')
  and (select is_active from public.workspace_member where workspace_id = :'ws_m' and user_id = :mari)
  and exists (select 1 from public.workspace where id = :'ws_m'),
  :'del_cook2');
select public.chk('6.2 a kitchen deleted with a helper in it takes every membership and place of hers there; her account stays',
  :'del_otra' = 'ok'
  and not exists (select 1 from public.workspace where id = :'ws_o')
  and not exists (select 1 from public.workspace_member where workspace_id = :'ws_o')
  and not exists (select 1 from public.member_location where workspace_id = :'ws_o')
  and exists (select 1 from auth.users where id = :ayudo2),
  :'del_otra');


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
  if (select count(*) from public._verify) <> 22 then
    raise exception 'expected 22 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
