-- ============================================================================
-- 0099 — the loyalty card's condition, discreet and fully optional, and
-- *Editar tu tarjeta* with one rule added to G12 (`10.9m`; the owner's approval
-- of 2026-11-27). Every save a fonda makes is made AS HER, under `set role
-- authenticated` with her claims; the kitchens are made and the stamps given
-- days back as postgres, as the clock and the apps' handovers give them on the
-- live database (`servicio.give_card_stamp`, the path every stamp takes).
--
-- Section 1 the shape. Section 2 the condition: fully optional — none unless she
-- writes one, kept by a build that does not send it, cleared by an empty box,
-- 60 characters at most, carried by every read. Section 3 THE EDGE TABLE of the
-- approved page, one kitchen per row, each against a card that already collects:
--   A  fewer stamps (8 → 6): moves; at 6 or more she wins her reward today, once;
--      a card past its days does not move
--   B  more stamps (8 → 10): keeps 8
--   C  a different reward, with fewer stamps beside it: keeps all of hers
--   D  more days, then Nunca: moves each time, counted from her last stamp
--   E  fewer days: keeps hers
--   F  a condition added: her card has none
--   G  a condition changed: she keeps the one she started with
--   H  the condition removed: removed for her too, today
--   I  a typo fixed in the reward: keeps the old words; capitals and end spaces
--      do not count
--   J  several changes over weeks: each card against its own version
--   K  closed, then opened again easier within 30 days: moves
--   L  an older build saves (no condition sent): the condition stays, and a card
--      with that condition moves
--   M  the owner's alone (G18): her cook is refused
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, so `now()` is one moment throughout. A
-- refused call is made through `_try`, whose handler undoes whatever it began.
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

-- A kitchen of hers, made as her sign-up makes it, with its address.
create function public._kitchen(p_owner uuid, p_name text)
returns uuid language plpgsql as $$
declare v_ws uuid;
begin
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_owner), true);
  v_ws := public.onboard_workspace(p_display_name => p_name, p_kind => 'cocina');
  update public.location set street = 'Sabino', street_number = '99', colonia = 'Santa María la Ribera',
                             city = 'Ciudad de México'
   where workspace_id = v_ws;
  return v_ws;
end;
$$;

-- `p_n` stamps for her there, one a day, the last one `p_last` days ago — given by the owner.
create function public._stamps(p_ws uuid, p_user uuid, p_n integer, p_last integer default 1)
returns text language plpgsql as $$
declare v_owner uuid; v_r text;
begin
  select wm.user_id into v_owner from public.workspace_member wm
   where wm.workspace_id = p_ws and wm.role = 'owner' and wm.is_active limit 1;
  for i in reverse p_n - 1 .. 0 loop
    v_r := servicio.give_card_stamp(p_ws, p_user, now() - make_interval(days => p_last + i), v_owner, 'su_codigo', null);
  end loop;
  return v_r;
end;
$$;

-- Her card there now: its stamps and the version it is on — or null when she has none going.
create function public._card(p_ws uuid, p_user uuid)
returns jsonb language sql as $$
  select jsonb_build_object('stamps', c.stamps, 'terms_id', c.terms_id, 'of', t.stamps, 'reward', t.reward,
                            'days', t.expiry_days, 'conditions', t.conditions)
    from servicio.loyalty_card c join servicio.card_terms t on t.id = c.terms_id
   where c.workspace_id = p_ws and c.user_id = p_user
$$;

-- The current version's id.
create function public._current(p_ws uuid)
returns uuid language sql as $$
  select t.id from servicio.card_terms t where t.workspace_id = p_ws and t.replaced_at is null
$$;

-- Her rewards still to claim there.
create function public._rewards(p_ws uuid, p_user uuid)
returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('terms_id', r.terms_id, 'reward', r.reward, 'won_at', r.won_at)), '[]'::jsonb)
    from servicio.card_reward r
   where r.workspace_id = p_ws and r.user_id = p_user and r.claimed_at is null
$$;

-- The owners, one per kitchen of section 3, their cook, and the neighbours.
\set mari '''0099aaaa-0000-4000-8000-000000000001'''
\set oa   '''0099aaaa-0000-4000-8000-0000000000a1'''
\set ob   '''0099aaaa-0000-4000-8000-0000000000b1'''
\set oc   '''0099aaaa-0000-4000-8000-0000000000c1'''
\set od   '''0099aaaa-0000-4000-8000-0000000000d1'''
\set oe   '''0099aaaa-0000-4000-8000-0000000000e1'''
\set of   '''0099aaaa-0000-4000-8000-0000000000f1'''
\set og   '''0099aaaa-0000-4000-8000-000000000011'''
\set oh   '''0099aaaa-0000-4000-8000-000000000012'''
\set oi   '''0099aaaa-0000-4000-8000-000000000013'''
\set oj   '''0099aaaa-0000-4000-8000-000000000014'''
\set ok_  '''0099aaaa-0000-4000-8000-000000000015'''
\set ol   '''0099aaaa-0000-4000-8000-000000000016'''
\set cook '''0099aaaa-0000-4000-8000-000000000020'''
\set ana  '''0099cccc-0000-4000-8000-000000000001'''
\set beto '''0099cccc-0000-4000-8000-000000000002'''
\set cata '''0099cccc-0000-4000-8000-000000000003'''
\set dani '''0099cccc-0000-4000-8000-000000000004'''
\set fede '''0099cccc-0000-4000-8000-000000000006'''
\set lm   '''0099bbbb-0000-4000-8000-000000000001'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data)
select u.id::uuid, u.id || '.0099@example.mx', jsonb_build_object('full_name', u.name)
  from (values (:mari, 'Mari 0099'), (:oa, 'Owner A'), (:ob, 'Owner B'), (:oc, 'Owner C'), (:od, 'Owner D'),
               (:oe, 'Owner E'), (:of, 'Owner F'), (:og, 'Owner G'), (:oh, 'Owner H'), (:oi, 'Owner I'),
               (:oj, 'Owner J'), (:ok_, 'Owner K'), (:ol, 'Owner L'), (:cook, 'Cook 0099'),
               (:ana, 'Ana Ruiz'), (:beto, 'Beto Ríos'), (:cata, 'Cata Mora'), (:dani, 'Dani Paz'),
               (:fede, 'Fede Luna')) u(id, name);

update servicio.feature_switch set is_on = true where name = 'tarjeta';

select public._kitchen(:mari, 'Fonda Doña Mari 0099') as ws_m,
       public._kitchen(:oa, 'Cocina A 0099') as ws_a, public._kitchen(:ob, 'Cocina B 0099') as ws_b,
       public._kitchen(:oc, 'Cocina C 0099') as ws_c, public._kitchen(:od, 'Cocina D 0099') as ws_d,
       public._kitchen(:oe, 'Cocina E 0099') as ws_e, public._kitchen(:of, 'Cocina F 0099') as ws_f,
       public._kitchen(:og, 'Cocina G 0099') as ws_g, public._kitchen(:oh, 'Cocina H 0099') as ws_h,
       public._kitchen(:oi, 'Cocina I 0099') as ws_i, public._kitchen(:oj, 'Cocina J 0099') as ws_j,
       public._kitchen(:ok_, 'Cocina K 0099') as ws_k, public._kitchen(:ol, 'Cocina L 0099') as ws_l \gset
select id as loc_m from public.location where workspace_id = :'ws_m' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_a', :cook, 'staff', 'Cook 0099');
-- Mari publishes today, so her kitchen is in the door (section 2).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public.publish_listing(:lm, :'loc_m', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  '[{"name": "Comida corrida", "unit_price": "65.00", "quantity": 20}]'::jsonb) is not null as published_m \gset
reset role;


-- ---- 1. the shape ---------------------------------------------------------------------
select public.chk('1.1 card_terms.conditions: text, NULL for none, 1 to 60 characters and trimmed by the table''s check',
  (select format_type(a.atttypid, a.atttypmod) = 'text' and not a.attnotnull and not a.atthasdef
     from pg_attribute a where a.attrelid = 'servicio.card_terms'::regclass and a.attname = 'conditions')
  and (select pg_get_constraintdef(c.oid) from pg_constraint c
        where c.conrelid = 'servicio.card_terms'::regclass and c.conname = 'card_terms_conditions')
      = 'CHECK (((conditions IS NULL) OR (((char_length(conditions) >= 1) AND (char_length(conditions) <= 60)) AND (conditions = btrim(conditions)))))',
  (select pg_get_constraintdef(c.oid) from pg_constraint c
    where c.conrelid = 'servicio.card_terms'::regclass and c.conname = 'card_terms_conditions'));
select public.chk('1.2 set_card_terms is one function: 0085''s four and a fifth, p_conditions, defaulted to NULL; a definer with an empty path; the signed-in may call it, nobody signed out',
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'set_card_terms') = 1
  and (select pg_get_function_arguments(p.oid) from pg_proc p where p.oid = 'public.set_card_terms(uuid, text, integer, integer, text)'::regprocedure)
      = 'p_workspace_id uuid, p_reward text, p_stamps integer, p_expiry_days integer, p_conditions text DEFAULT NULL::text'
  and (select p.prosecdef and p.proconfig = array['search_path=""']
         from pg_proc p where p.oid = 'public.set_card_terms(uuid, text, integer, integer, text)'::regprocedure)
  and has_function_privilege('authenticated', 'public.set_card_terms(uuid, text, integer, integer, text)', 'execute')
  and not has_function_privilege('anon', 'public.set_card_terms(uuid, text, integer, integer, text)', 'execute'),
  (select pg_get_function_arguments(p.oid) from pg_proc p where p.proname = 'set_card_terms'));
select public.chk('1.3 the rule is granted to nobody; the card''s reads and the door keep their rights',
  not has_function_privilege('authenticated', 'servicio.card_terms_easier(servicio.card_terms, servicio.card_terms)', 'execute')
  and not has_function_privilege('anon', 'servicio.card_terms_easier(servicio.card_terms, servicio.card_terms)', 'execute')
  and not has_function_privilege('authenticated', 'servicio.card_state(uuid, uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.kitchen_card(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_card(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.on_offer_now()', 'execute')
  and not has_function_privilege('anon', 'public.on_offer_now()', 'execute'));


-- ---- 2. the condition: fully optional ---------------------------------------------------
-- Activar as a build in the field sends it (four arguments): none. Then her condition with
-- spaces around it; the same terms by an older build (it keeps it); the box emptied; only
-- spaces; 60 characters and 61.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('m-four', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', 'Una comida corrida')) as m_four \gset
select public._call_as_me('m-door-none', 'select public.on_offer_now()') as m_door_none \gset
select public._call_as_me('m-cond', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_m', 'Una comida corrida', '  Compra mínima de $80  ')) as m_cond \gset
select public._call_as_me('m-old-build', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_m', 'Una comida corrida')) as m_old_build \gset
select public._call_as_me('m-door-cond', 'select public.on_offer_now()') as m_door_cond \gset
reset role;
select count(*) as m_versions_cond from servicio.card_terms where workspace_id = :'ws_m' \gset
select servicio.card_state(:'ws_m', :dani) as dani_state_cond \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._call_as_me('m-cleared', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_m', 'Una comida corrida', '')) as m_cleared \gset
select public._call_as_me('m-again', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_m', 'Una comida corrida', 'Compra mínima de $80')) as m_again \gset
select public._call_as_me('m-spaces', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_m', 'Una comida corrida', '     ')) as m_spaces \gset
select public._call_as_me('m-60', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_m', 'Una comida corrida', repeat('x', 60))) as m_60 \gset
reset role;
select count(*) as m_versions_60 from servicio.card_terms where workspace_id = :'ws_m' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select public._try(format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_m', 'Una comida corrida', repeat('x', 61))) as m_61 \gset
reset role;
select public._try(format(
  'insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, conditions, created_by, replaced_at) values (%L, %L, 8, 30, %L, %L, now())',
  :'ws_m', 'Un taco', '', :mari)) as raw_empty \gset
select public._try(format(
  'insert into servicio.card_terms (workspace_id, reward, stamps, expiry_days, conditions, created_by, replaced_at) values (%L, %L, 8, 30, %L, %L, now())',
  :'ws_m', 'Un taco', ' Con refresco', :mari)) as raw_untrimmed \gset

select public.chk('2.1 Activar with the four arguments every build in the field sends: no condition — the kitchen reads none, the door sends none',
  :'m_four' = 'ok'
  and public._a('m-four') -> 'terms' -> 'conditions' = 'null'::jsonb
  and (select k -> 'card' -> 'conditions' from jsonb_array_elements(public._a('m-door-none')) k where k ->> 'id' = :'ws_m') = 'null'::jsonb,
  public._a('m-four')::text);
select public.chk('2.2 her condition, written with spaces around it, is kept trimmed: a new version, read by the kitchen and the door',
  :'m_cond' = 'ok'
  and public._a('m-cond') -> 'terms' ->> 'conditions' = 'Compra mínima de $80'
  and (select k -> 'card' from jsonb_array_elements(public._a('m-door-cond')) k where k ->> 'id' = :'ws_m')
      = '{"reward": "Una comida corrida", "stamps": 8, "expiry_days": 30, "conditions": "Compra mínima de $80"}'::jsonb,
  public._a('m-cond')::text);
select public.chk('2.3 an older build saving the same terms (no condition sent) keeps it, and changes nothing: two versions',
  :'m_old_build' = 'ok'
  and public._a('m-old-build') -> 'terms' ->> 'conditions' = 'Compra mínima de $80'
  and :'m_versions_cond'::int = 2,
  concat_ws(' ', :'m_versions_cond', public._a('m-old-build') -> 'terms'));
select public.chk('2.4 a neighbour with no card going reads the condition she would start on',
  (:'dani_state_cond'::jsonb) ->> 'conditions' = 'Compra mínima de $80' and ((:'dani_state_cond'::jsonb) ->> 'stamps')::int = 0,
  :'dani_state_cond');
select public.chk('2.5 an emptied box clears it, and only spaces clear it too: none again, each a new version',
  :'m_cleared' = 'ok' and public._a('m-cleared') -> 'terms' -> 'conditions' = 'null'::jsonb
  and :'m_again' = 'ok' and public._a('m-again') -> 'terms' ->> 'conditions' = 'Compra mínima de $80'
  and :'m_spaces' = 'ok' and public._a('m-spaces') -> 'terms' -> 'conditions' = 'null'::jsonb,
  concat_ws(' ', public._a('m-cleared') -> 'terms', public._a('m-spaces') -> 'terms'));
select public.chk('2.6 60 characters are taken; 61 are refused (22023) and change nothing; the table refuses an empty or untrimmed one (23514)',
  :'m_60' = 'ok' and char_length(public._a('m-60') -> 'terms' ->> 'conditions') = 60
  and :'m_61' = '22023'
  and (select count(*) from servicio.card_terms where workspace_id = :'ws_m') = :'m_versions_60'::int
  and (select char_length(conditions) from servicio.card_terms where workspace_id = :'ws_m' and replaced_at is null) = 60
  and :'raw_empty' = '23514' and :'raw_untrimmed' = '23514',
  concat_ws(' ', :'m_61', :'raw_empty', :'raw_untrimmed'));


-- ---- 3. the edge table --------------------------------------------------------------------
-- Every kitchen starts on 8 stamps and *Una comida corrida*, 30 days, no condition, unless
-- its row says otherwise; its neighbours collect; then one save.

-- A — fewer stamps (8 → 6). Ana has 5, Beto 6, Cata 7; Fede's 3, his last 31 days ago, are past
-- their days (not yet erased by the nightly job).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oa), true);
set local role authenticated;
select public._call_as_me('a1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_a', 'Una comida corrida')) as a1 \gset
reset role;
select public._current(:'ws_a') as a_v1 \gset
select public._stamps(:'ws_a', :ana, 5) as a_ana, public._stamps(:'ws_a', :beto, 6) as a_beto,
       public._stamps(:'ws_a', :cata, 7) as a_cata, public._stamps(:'ws_a', :fede, 3, 31) as a_fede \gset
select count(*) as a_notices_before from servicio.notice where kind = 'premio' and workspace_id = :'ws_a' \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oa), true);
set local role authenticated;
select public._call_as_me('a2', format('select public.set_card_terms(%L, %L, 6, 30)', :'ws_a', 'Una comida corrida')) as a2 \gset
reset role;
select public._current(:'ws_a') as a_v2 \gset
select public._stamps(:'ws_a', :beto, 1, 0) as a_beto_next \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :beto), true);
set local role authenticated;
select public._call_as_me('a-beto-cards', 'select public.my_cards()') as a_beto_cards \gset
reset role;

select public.chk('3.A1 fewer stamps: Ana''s 5 move to the new version — 5 of 6, the same day',
  :'a2' = 'ok' and public._card(:'ws_a', :ana) ->> 'terms_id' = :'a_v2'
  and (public._card(:'ws_a', :ana) ->> 'stamps')::int = 5 and (public._card(:'ws_a', :ana) ->> 'of')::int = 6,
  public._card(:'ws_a', :ana)::text);
select public.chk('3.A2 Beto at 6 and Cata at 7 win their reward today — one each, on the new version, their cards back to zero (G17)',
  public._card(:'ws_a', :cata) is null
  and jsonb_array_length(public._rewards(:'ws_a', :cata)) = 1
  and public._rewards(:'ws_a', :cata) -> 0 ->> 'terms_id' = :'a_v2'
  and public._rewards(:'ws_a', :cata) -> 0 ->> 'reward' = 'Una comida corrida'
  and (public._rewards(:'ws_a', :cata) -> 0 ->> 'won_at')::timestamptz = now()
  and jsonb_array_length(public._rewards(:'ws_a', :beto)) = 1,
  concat_ws(' ', public._rewards(:'ws_a', :beto), public._rewards(:'ws_a', :cata)));
select public.chk('3.A3 each reward won by the move sends what a won reward sends: 0094''s ¡Ganaste!, once each',
  (select count(*) from servicio.notice where kind = 'premio' and workspace_id = :'ws_a') = :'a_notices_before'::int + 2
  and exists (select 1 from servicio.notice where kind = 'premio' and workspace_id = :'ws_a' and user_id = :cata),
  (select string_agg(title, ' | ') from servicio.notice where kind = 'premio' and workspace_id = :'ws_a'));
select public._card(:'ws_a', :fede) ->> 'terms_id' as a_fede_terms \gset
select servicio.forget_cards() as a_forgotten \gset
select public.chk('3.A4 Fede''s card is past its days: it does not move, and the nightly job still erases it',
  :'a_fede_terms' = :'a_v1' and :'a_forgotten'::int >= 1 and public._card(:'ws_a', :fede) is null,
  concat_ws(' ', :'a_fede_terms', :'a_forgotten'));
select public.chk('3.A5 Beto''s next stamp starts a new card on the new terms: 1 of 6, his reward still to claim',
  :'a_beto_next' = 'sello' and (public._card(:'ws_a', :beto) ->> 'of')::int = 6 and (public._card(:'ws_a', :beto) ->> 'stamps')::int = 1
  and (public._a('a-beto-cards') -> 0 ->> 'of')::int = 6
  and jsonb_array_length(public._a('a-beto-cards') -> 0 -> 'rewards') = 1,
  public._a('a-beto-cards')::text);
select public.chk('3.A6 the kitchen reads it as the save answers: Ana''s card going (Fede''s past its days is not counted), Beto''s and Cata''s rewards to give',
  (public._a('a2') ->> 'cards')::int = 1 and (public._a('a2') ->> 'rewards_to_give')::int = 2,
  public._a('a2')::text);

-- B — more stamps (8 → 10): Ana's 5 keep their 8.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ob), true);
set local role authenticated;
select public._call_as_me('b1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_b', 'Una comida corrida')) as b1 \gset
reset role;
select public._current(:'ws_b') as b_v1, public._stamps(:'ws_b', :ana, 5) as b_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ob), true);
set local role authenticated;
select public._call_as_me('b2', format('select public.set_card_terms(%L, %L, 10, 30)', :'ws_b', 'Una comida corrida')) as b2 \gset
reset role;
select public.chk('3.B more stamps: Ana keeps her 8 (G12); a newcomer starts on 10',
  :'b2' = 'ok' and public._card(:'ws_b', :ana) ->> 'terms_id' = :'b_v1' and (public._card(:'ws_b', :ana) ->> 'of')::int = 8
  and (servicio.card_state(:'ws_b', :dani) ->> 'of')::int = 10,
  public._card(:'ws_b', :ana)::text);

-- C — a different reward, with fewer stamps beside it: nothing of it reaches her.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oc), true);
set local role authenticated;
select public._call_as_me('c1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_c', 'Una comida corrida')) as c1 \gset
reset role;
select public._current(:'ws_c') as c_v1, public._stamps(:'ws_c', :ana, 6) as c_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oc), true);
set local role authenticated;
select public._call_as_me('c2', format('select public.set_card_terms(%L, %L, 6, 30)', :'ws_c', 'Un agua de jamaica y postre')) as c2 \gset
reset role;
select public.chk('3.C a new reward with fewer stamps: Ana keeps her whole card — 6 of 8 and the meal — and wins nothing today',
  :'c2' = 'ok' and public._card(:'ws_c', :ana) ->> 'terms_id' = :'c_v1'
  and (public._card(:'ws_c', :ana) ->> 'stamps')::int = 6 and public._card(:'ws_c', :ana) ->> 'reward' = 'Una comida corrida'
  and public._rewards(:'ws_c', :ana) = '[]'::jsonb,
  public._card(:'ws_c', :ana)::text);

-- D — more days (30 → 60), then Nunca: her last stamp 10 days ago.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :od), true);
set local role authenticated;
select public._call_as_me('d1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_d', 'Una comida corrida')) as d1 \gset
reset role;
select public._stamps(:'ws_d', :ana, 3, 10) as d_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :od), true);
set local role authenticated;
select public._call_as_me('d2', format('select public.set_card_terms(%L, %L, 8, 60)', :'ws_d', 'Una comida corrida')) as d2 \gset
reset role;
select public._current(:'ws_d') as d_v2, servicio.card_state(:'ws_d', :ana) as d_state_60 \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :od), true);
set local role authenticated;
select public._call_as_me('d3', format('select public.set_card_terms(%L, %L, 8, 0)', :'ws_d', 'Una comida corrida')) as d3 \gset
reset role;
select public.chk('3.D more days, then Nunca: her card takes each the same day — 60 counted from her last stamp, then none',
  :'d2' = 'ok' and (:'d_state_60'::jsonb ->> 'expiry_days')::int = 60
  and :'d_state_60'::jsonb ->> 'expires_on'
      = to_char((now() - interval '10 days' + interval '60 days') at time zone servicio.kitchen_zone(:'ws_d'), 'YYYY-MM-DD')
  and :'d3' = 'ok' and public._card(:'ws_d', :ana) ->> 'terms_id' = public._current(:'ws_d')::text
  and public._card(:'ws_d', :ana) -> 'days' = 'null'::jsonb
  and servicio.card_state(:'ws_d', :ana) -> 'expires_on' = 'null'::jsonb
  and (public._card(:'ws_d', :ana) ->> 'stamps')::int = 3,
  concat_ws(' ', :'d_state_60', public._card(:'ws_d', :ana)));

-- E — fewer days (60 → 30): she keeps her 60.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oe), true);
set local role authenticated;
select public._call_as_me('e1', format('select public.set_card_terms(%L, %L, 8, 60)', :'ws_e', 'Una comida corrida')) as e1 \gset
reset role;
select public._current(:'ws_e') as e_v1, public._stamps(:'ws_e', :ana, 2) as e_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oe), true);
set local role authenticated;
select public._call_as_me('e2', format('select public.set_card_terms(%L, %L, 6, 30)', :'ws_e', 'Una comida corrida')) as e2 \gset
reset role;
select public.chk('3.E fewer days, even with fewer stamps beside them: she keeps hers — 60 days and 8 stamps',
  :'e2' = 'ok' and public._card(:'ws_e', :ana) ->> 'terms_id' = :'e_v1' and (public._card(:'ws_e', :ana) ->> 'days')::int = 60
  and (public._card(:'ws_e', :ana) ->> 'of')::int = 8,
  public._card(:'ws_e', :ana)::text);

-- F — a condition added: her card has none.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :of), true);
set local role authenticated;
select public._call_as_me('f1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_f', 'Una comida corrida')) as f1 \gset
reset role;
select public._current(:'ws_f') as f_v1, public._stamps(:'ws_f', :ana, 4) as f_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :of), true);
set local role authenticated;
select public._call_as_me('f2', format('select public.set_card_terms(%L, %L, 6, 30, %L)', :'ws_f', 'Una comida corrida', 'Compra mínima de $80')) as f2 \gset
reset role;
select public.chk('3.F a condition added, even with fewer stamps: her card keeps none — the scan shows no line for her — and a newcomer starts with it',
  :'f2' = 'ok' and public._card(:'ws_f', :ana) ->> 'terms_id' = :'f_v1'
  and servicio.card_state(:'ws_f', :ana) -> 'conditions' = 'null'::jsonb
  and servicio.card_state(:'ws_f', :dani) ->> 'conditions' = 'Compra mínima de $80',
  concat_ws(' ', servicio.card_state(:'ws_f', :ana), servicio.card_state(:'ws_f', :dani)));

-- G — a condition changed: she keeps the one she started with.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :og), true);
set local role authenticated;
select public._call_as_me('g1', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_g', 'Una comida corrida', 'Compra mínima de $80')) as g1 \gset
reset role;
select public._current(:'ws_g') as g_v1, public._stamps(:'ws_g', :ana, 4) as g_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :og), true);
set local role authenticated;
select public._call_as_me('g2', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_g', 'Una comida corrida', 'Compra mínima de $60')) as g2 \gset
reset role;
select public.chk('3.G a condition changed: she keeps hers — Wera cannot tell whether new words are easier',
  :'g2' = 'ok' and public._card(:'ws_g', :ana) ->> 'terms_id' = :'g_v1'
  and servicio.card_state(:'ws_g', :ana) ->> 'conditions' = 'Compra mínima de $80',
  servicio.card_state(:'ws_g', :ana)::text);

-- H — the condition removed: removed for her too, today.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oh), true);
set local role authenticated;
select public._call_as_me('h1', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_h', 'Una comida corrida', 'Compra mínima de $80')) as h1 \gset
reset role;
select public._stamps(:'ws_h', :ana, 4) as h_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oh), true);
set local role authenticated;
select public._call_as_me('h2', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_h', 'Una comida corrida', '')) as h2 \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ana), true);
set local role authenticated;
select public._call_as_me('h-ana-cards', 'select public.my_cards()') as h_ana_cards \gset
reset role;
select public.chk('3.H the condition removed: her card moves to none the same day, and her cards read none',
  :'h2' = 'ok' and public._card(:'ws_h', :ana) ->> 'terms_id' = public._current(:'ws_h')::text
  and public._card(:'ws_h', :ana) -> 'conditions' = 'null'::jsonb
  and (select c -> 'conditions' from jsonb_array_elements(public._a('h-ana-cards')) c where c ->> 'id' = :'ws_h') = 'null'::jsonb,
  public._a('h-ana-cards')::text);

-- I — a typo fixed in the reward; then capitals and end spaces only.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oi), true);
set local role authenticated;
select public._call_as_me('i1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_i', 'Una comida corida')) as i1 \gset
reset role;
select public._current(:'ws_i') as i_v1, public._stamps(:'ws_i', :ana, 4) as i_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oi), true);
set local role authenticated;
select public._call_as_me('i2', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_i', 'Una comida corrida')) as i2 \gset
reset role;
select public._stamps(:'ws_i', :beto, 4) as i_beto \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oi), true);
set local role authenticated;
select public._call_as_me('i3', format('select public.set_card_terms(%L, %L, 6, 30)', :'ws_i', '  UNA COMIDA CORRIDA ')) as i3 \gset
reset role;
select public.chk('3.I a typo fixed is a new reward: Ana keeps the old words; capitals and end spaces do not count — Beto''s moves to 6',
  :'i2' = 'ok' and :'i3' = 'ok'
  and public._card(:'ws_i', :ana) ->> 'terms_id' = :'i_v1' and public._card(:'ws_i', :ana) ->> 'reward' = 'Una comida corida'
  and public._card(:'ws_i', :beto) ->> 'terms_id' = public._current(:'ws_i')::text
  and (public._card(:'ws_i', :beto) ->> 'of')::int = 6 and public._card(:'ws_i', :beto) ->> 'reward' = 'UNA COMIDA CORRIDA',
  concat_ws(' ', public._card(:'ws_i', :ana), public._card(:'ws_i', :beto)));

-- J — several changes over weeks: Ana's card on 8, Beto's on 10, then 9.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oj), true);
set local role authenticated;
select public._call_as_me('j1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_j', 'Una comida corrida')) as j1 \gset
reset role;
select public._current(:'ws_j') as j_v1, public._stamps(:'ws_j', :ana, 3) as j_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oj), true);
set local role authenticated;
select public._call_as_me('j2', format('select public.set_card_terms(%L, %L, 10, 30)', :'ws_j', 'Una comida corrida')) as j2 \gset
reset role;
select public._stamps(:'ws_j', :beto, 3) as j_beto \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :oj), true);
set local role authenticated;
select public._call_as_me('j3', format('select public.set_card_terms(%L, %L, 9, 30)', :'ws_j', 'Una comida corrida')) as j3 \gset
reset role;
select public.chk('3.J each card against its own version: Beto''s 10 become 9; Ana''s 8 stay 8',
  :'j3' = 'ok'
  and public._card(:'ws_j', :beto) ->> 'terms_id' = public._current(:'ws_j')::text and (public._card(:'ws_j', :beto) ->> 'of')::int = 9
  and public._card(:'ws_j', :ana) ->> 'terms_id' = :'j_v1' and (public._card(:'ws_j', :ana) ->> 'of')::int = 8,
  concat_ws(' ', public._card(:'ws_j', :ana), public._card(:'ws_j', :beto)));

-- K — closed, then opened again easier within its 30 days.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ok_), true);
set local role authenticated;
select public._call_as_me('k1', format('select public.set_card_terms(%L, %L, 8, 30)', :'ws_k', 'Una comida corrida')) as k1 \gset
reset role;
select public._stamps(:'ws_k', :ana, 5) as k_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ok_), true);
set local role authenticated;
select public._call_as_me('k-close', format('select public.close_card(%L)', :'ws_k')) as k_close \gset
select public._call_as_me('k2', format('select public.set_card_terms(%L, %L, 6, 30)', :'ws_k', 'Una comida corrida')) as k2 \gset
reset role;
select public.chk('3.K closed and opened again easier: her card, still going, moves to it — 5 of 6',
  :'k_close' = 'ok' and :'k2' = 'ok' and (public._a('k2') ->> 'open')::boolean
  and public._card(:'ws_k', :ana) ->> 'terms_id' = public._current(:'ws_k')::text
  and (public._card(:'ws_k', :ana) ->> 'of')::int = 6,
  public._card(:'ws_k', :ana)::text);

-- L — an older build saves fewer stamps, sending no condition: the condition stays, and her
-- card on that condition moves.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ol), true);
set local role authenticated;
select public._call_as_me('l1', format('select public.set_card_terms(%L, %L, 8, 30, %L)', :'ws_l', 'Una comida corrida', 'Compra mínima de $80')) as l1 \gset
reset role;
select public._stamps(:'ws_l', :ana, 3) as l_ana \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :ol), true);
set local role authenticated;
select public._call_as_me('l2', format('select public.set_card_terms(%L, %L, 6, 30)', :'ws_l', 'Una comida corrida')) as l2 \gset
reset role;
select public.chk('3.L an older build saving fewer stamps keeps the condition; her card with that condition moves — 3 of 6, still Compra mínima de $80',
  :'l2' = 'ok' and public._a('l2') -> 'terms' ->> 'conditions' = 'Compra mínima de $80'
  and public._card(:'ws_l', :ana) ->> 'terms_id' = public._current(:'ws_l')::text
  and (public._card(:'ws_l', :ana) ->> 'of')::int = 6 and public._card(:'ws_l', :ana) ->> 'conditions' = 'Compra mínima de $80',
  public._card(:'ws_l', :ana)::text);

-- M — the owner's alone (G18).
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cook), true);
set local role authenticated;
select public._try(format('select public.set_card_terms(%L, %L, 4, 30, %L)', :'ws_a', 'Una comida corrida', 'Con refresco')) as m_cook \gset
reset role;
select public.chk('3.M her cook cannot change it, condition and all (42501): nothing moved, the version as it was',
  :'m_cook' = '42501' and public._current(:'ws_a')::text = :'a_v2'
  and (public._card(:'ws_a', :ana) ->> 'of')::int = 6,
  :'m_cook');


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
  if (select count(*) from public._verify) <> 27 then
    raise exception 'expected 27 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
