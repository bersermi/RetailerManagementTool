-- ============================================================================
-- 0075 — her address first (`10.4h`): her line of directions saved with no pin
-- (`set_store_directions`), and her own pin cleared (`clear_store_pin`) — every
-- call made AS ITS CALLER, under `set role authenticated` with a caller's
-- claims, and signed out under `set role anon`. As `postgres` RLS and
-- `my_locations()` would wave everything through, and every check would pass
-- for nothing.
--
-- ⚠️ THE ROW'S CALLERS: the kitchen's owner, a manager, a cook, a shop's owner,
-- someone who belongs to nothing, and nobody signed in. And `set_store_pin` is
-- asked again: its signature and checks stay as they are, and it still writes
-- the line with the pin, as every build in the field sends it.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, as `0072`'s suite: making the two
-- businesses queues the owner's Discord lines when a webhook is set, and the
-- rollback takes them out before pg_net's worker could send them.
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

-- Her place in one line: the pin, the line of directions, and the address beside them.
create function public._lugar75(p_id uuid)
returns text language sql as $$
  select coalesce(pin_lat::text, '·') || ',' || coalesce(pin_lng::text, '·')
         || ' | ' || coalesce(directions, '·')
         || ' | ' || coalesce(street, '·') || ' ' || coalesce(street_number, '·')
         || ', ' || coalesce(colonia, '·') || ', ' || coalesce(city, '·') || ', ' || coalesce(postal_code, '·')
    from public.location where id = p_id
$$;

\set fonda    '''0075aaaa-0000-4000-8000-000000000001'''
\set gerente  '''0075aaaa-0000-4000-8000-000000000002'''
\set cocinera '''0075aaaa-0000-4000-8000-000000000003'''
\set tendera  '''0075aaaa-0000-4000-8000-000000000004'''
\set nadie    '''0075aaaa-0000-4000-8000-000000000005'''
\set ninguno  '''0075bbbb-0000-4000-8000-0000000000ff'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:fonda,    'fonda.0075@example.mx',    jsonb_build_object('full_name', 'Fonda 0075')),
  (:gerente,  'gerente.0075@example.mx',  jsonb_build_object('full_name', 'Gerente 0075')),
  (:cocinera, 'cocinera.0075@example.mx', jsonb_build_object('full_name', 'Cocinera 0075')),
  (:tendera,  'tendera.0075@example.mx',  jsonb_build_object('full_name', 'Tendera 0075')),
  (:nadie,    'nadie.0075@example.mx',    jsonb_build_object('full_name', 'Nadie 0075'));

-- ---- 0. a shop, and a kitchen registered with her address alone ---------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0075') as ws_t \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda 0075', p_kind => 'cocina') as ws_c \gset
reset role;
select id as loc_c from public.location where workspace_id = :'ws_c' \gset
select id as loc_t from public.location where workspace_id = :'ws_t' \gset

insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws_c', :gerente,  'manager', 'Gerente 0075'),
  (:'ws_c', :cocinera, 'staff',   'Cocinera 0075');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws_c', id, :'loc_c' from public.workspace_member where workspace_id = :'ws_c' and user_id = :cocinera;

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_address(%L, %L, %L, %L, %L, %L)',
  :'loc_c', 'Durango', '220', 'Roma Norte', 'Cuauhtémoc', '06700')) as addr \gset
reset role;
select public.chk('0.1 her kitchen, with her address and no pin, no line',
  :'addr' = 'ok'
  and public._lugar75(:'loc_c') = '·,· | · | Durango 220, Roma Norte, Cuauhtémoc, 06700',
  :'addr' || ' / ' || coalesce(public._lugar75(:'loc_c'), 'no place'));

-- ---- 1. her line of directions, with no pin -----------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_directions(%L, %L)',
  :'loc_c', '  Portón verde, junto a la farmacia  ')) as dir_ok \gset
reset role;
select public.chk('1.1 the owner saves her line with no pin — trimmed; no pin made; her address untouched',
  :'dir_ok' = 'ok'
  and public._lugar75(:'loc_c') = '·,· | Portón verde, junto a la farmacia | Durango 220, Roma Norte, Cuauhtémoc, 06700',
  :'dir_ok' || ' / ' || public._lugar75(:'loc_c'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', '   ')) as dir_blank \gset
reset role;
select public.chk('1.2 a blank line is no line',
  :'dir_blank' = 'ok' and (select directions is null from public.location where id = :'loc_c'), :'dir_blank');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Portón verde')) as dir_again \gset
select public._try(format('select public.set_store_directions(%L)', :'loc_c')) as dir_default \gset
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Portón verde')) as dir_back \gset
reset role;
select public.chk('1.3 and so is no line at all — the argument left out',
  :'dir_again' = 'ok' and :'dir_default' = 'ok' and :'dir_back' = 'ok'
  and (select directions = 'Portón verde' from public.location where id = :'loc_c'),
  format('%s %s %s', :'dir_again', :'dir_default', :'dir_back'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Otra')) as dir_mgr \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Otra')) as dir_staff \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Otra')) as dir_shop \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :nadie), true);
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Otra')) as dir_nadie \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
select public._try(format('select public.set_store_directions(%L, %L)', :ninguno, 'Otra')) as dir_none \gset
reset role;
select public.chk('1.4 ⚠️ a manager is refused — TD012, her line stands',
  :'dir_mgr' = 'TD012' and (select directions = 'Portón verde' from public.location where id = :'loc_c'), :'dir_mgr');
select public.chk('1.5 ⚠️ so is a cook — TD012',
  :'dir_staff' = 'TD012' and (select directions = 'Portón verde' from public.location where id = :'loc_c'), :'dir_staff');
select public.chk('1.6 ⚠️ and a shop''s owner, for a kitchen that is not hers — TD012',
  :'dir_shop' = 'TD012' and (select directions = 'Portón verde' from public.location where id = :'loc_c'), :'dir_shop');
select public.chk('1.7 ⚠️ and someone who belongs to nothing — TD012',
  :'dir_nadie' = 'TD012' and (select directions = 'Portón verde' from public.location where id = :'loc_c'), :'dir_nadie');
select public.chk('1.8 a place that does not exist is refused the same — TD012',
  :'dir_none' = 'TD012', :'dir_none');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', repeat('a', 141))) as dir_long \gset
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', E'Portón\nverde')) as dir_two \gset
reset role;
select public.chk('1.9 a line over 140 characters, or on two lines, is refused — 22023, her line stands',
  :'dir_long' = '22023' and :'dir_two' = '22023'
  and (select directions = 'Portón verde' from public.location where id = :'loc_c'),
  format('%s %s', :'dir_long', :'dir_two'));

select set_config('request.jwt.claims', null, true);
set local role anon;
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Otra')) as dir_anon \gset
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Otra')) as dir_nobody \gset
reset role;
select public.chk('1.10 signed out it cannot be called, and a caller with no subject is refused by it — 42501 both',
  :'dir_anon' = '42501' and :'dir_nobody' = '42501'
  and (select directions = 'Portón verde' from public.location where id = :'loc_c'),
  format('%s %s', :'dir_anon', :'dir_nobody'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_t', 'Junto al mercado')) as dir_own_shop \gset
reset role;
select public.chk('1.11 no kind asked, as set_store_pin asks none: a shop''s owner sets her own store''s line',
  :'dir_own_shop' = 'ok'
  and (select directions = 'Junto al mercado' and pin_lat is null from public.location where id = :'loc_t')
  and (select directions = 'Portón verde' from public.location where id = :'loc_c'), :'dir_own_shop');

-- ---- 2. her own point, set and cleared ------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_pin(%L, %s, %s, %L)',
  :'loc_c', '19.4193604', '-99.1679596', 'Portón verde, junto a la farmacia')) as pin_ok \gset
select public._try(format('select public.set_store_pin(%L, null, null, %L)', :'loc_c', 'Otra')) as pin_null \gset
reset role;
select public.chk('2.1 set_store_pin as every build in the field sends it: her point to six decimals, with her line',
  :'pin_ok' = 'ok'
  and public._lugar75(:'loc_c') = '19.419360,-99.167960 | Portón verde, junto a la farmacia | Durango 220, Roma Norte, Cuauhtémoc, 06700',
  :'pin_ok' || ' / ' || public._lugar75(:'loc_c'));
select public.chk('2.2 and its checks stay as they are: a missing pin is still refused — 22023, the pin stands',
  :'pin_null' = '22023' and (select pin_lat = 19.419360 from public.location where id = :'loc_c'), :'pin_null');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Portón verde')) as dir_with_pin \gset
select public._try(format('select public.set_store_directions(%L, %L)',
  :'loc_c', 'Portón verde, junto a la farmacia')) as dir_with_pin_back \gset
reset role;
select public.chk('2.2b ⚠️ her line changed while she has her own point leaves her point where it is',
  :'dir_with_pin' = 'ok' and :'dir_with_pin_back' = 'ok'
  and public._lugar75(:'loc_c') = '19.419360,-99.167960 | Portón verde, junto a la farmacia | Durango 220, Roma Norte, Cuauhtémoc, 06700',
  :'dir_with_pin' || ' / ' || public._lugar75(:'loc_c'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.clear_store_pin(%L)', :'loc_c')) as clr_mgr \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
select public._try(format('select public.clear_store_pin(%L)', :'loc_c')) as clr_staff \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select public._try(format('select public.clear_store_pin(%L)', :'loc_c')) as clr_shop \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :nadie), true);
select public._try(format('select public.clear_store_pin(%L)', :'loc_c')) as clr_nadie \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
select public._try(format('select public.clear_store_pin(%L)', :ninguno)) as clr_none \gset
reset role;
select public.chk('2.3 ⚠️ a manager cannot clear her point — TD012, the pin stands',
  :'clr_mgr' = 'TD012' and (select pin_lat = 19.419360 from public.location where id = :'loc_c'), :'clr_mgr');
select public.chk('2.4 ⚠️ nor a cook — TD012',
  :'clr_staff' = 'TD012' and (select pin_lat = 19.419360 from public.location where id = :'loc_c'), :'clr_staff');
select public.chk('2.5 ⚠️ nor a shop''s owner — TD012',
  :'clr_shop' = 'TD012' and (select pin_lat = 19.419360 from public.location where id = :'loc_c'), :'clr_shop');
select public.chk('2.6 ⚠️ nor someone who belongs to nothing — TD012',
  :'clr_nadie' = 'TD012' and (select pin_lat = 19.419360 from public.location where id = :'loc_c'), :'clr_nadie');
select public.chk('2.7 a place that does not exist is refused the same — TD012',
  :'clr_none' = 'TD012', :'clr_none');

select set_config('request.jwt.claims', null, true);
set local role anon;
select public._try(format('select public.clear_store_pin(%L)', :'loc_c')) as clr_anon \gset
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.clear_store_pin(%L)', :'loc_c')) as clr_nobody \gset
reset role;
select public.chk('2.8 signed out it cannot be called, and a caller with no subject is refused by it — 42501 both',
  :'clr_anon' = '42501' and :'clr_nobody' = '42501'
  and (select pin_lat = 19.419360 from public.location where id = :'loc_c'),
  format('%s %s', :'clr_anon', :'clr_nobody'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.clear_store_pin(%L)', :'loc_c')) as clr_ok \gset
reset role;
select public.chk('2.9 the owner clears her point: both numbers gone, her line and her address untouched',
  :'clr_ok' = 'ok'
  and public._lugar75(:'loc_c') = '·,· | Portón verde, junto a la farmacia | Durango 220, Roma Norte, Cuauhtémoc, 06700',
  :'clr_ok' || ' / ' || public._lugar75(:'loc_c'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.clear_store_pin(%L)', :'loc_c')) as clr_again \gset
select public._try(format('select public.set_store_directions(%L, %L)', :'loc_c', 'Junto a la farmacia')) as dir_after \gset
reset role;
select public.chk('2.10 clearing a place with no pin answers the same, and changes nothing',
  :'clr_again' = 'ok', :'clr_again');
select public.chk('2.11 her line saved after it never brings a pin back',
  :'dir_after' = 'ok'
  and public._lugar75(:'loc_c') = '·,· | Junto a la farmacia | Durango 220, Roma Norte, Cuauhtémoc, 06700',
  :'dir_after' || ' / ' || public._lugar75(:'loc_c'));

-- ---- 3. the walls -----------------------------------------------------------------
select public.chk('3.1 both answer a signed-in person and nobody signed out',
  has_function_privilege('authenticated', 'public.set_store_directions(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.clear_store_pin(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.set_store_directions(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.clear_store_pin(uuid)', 'execute'));
select public.chk('3.2 one function per name, and set_store_pin''s signature as it was',
  (select count(*) = 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'set_store_directions')
  and (select count(*) = 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'clear_store_pin')
  and (select count(*) = 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'set_store_pin')
  and to_regprocedure('public.set_store_pin(uuid, numeric, numeric, text)') is not null);
select public.chk('3.3 both run as their owner with an empty search path, as set_store_pin does',
  (select bool_and(prosecdef and proconfig @> array['search_path=""'])
     from pg_proc where oid in ('public.set_store_directions(uuid, text)'::regprocedure,
                                'public.clear_store_pin(uuid)'::regprocedure)),
  (select string_agg(proname || ' ' || prosecdef::text || ' ' || coalesce(proconfig::text, '{}'), '; ')
     from pg_proc where oid in ('public.set_store_directions(uuid, text)'::regprocedure,
                                'public.clear_store_pin(uuid)'::regprocedure)));

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 27 then
    raise exception 'expected 27 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
