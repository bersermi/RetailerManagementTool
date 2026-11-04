-- ============================================================================
-- 0076 — a kitchen's own page (`10.5-i-a`): `kitchen_page` and its one door,
-- `set_kitchen_page`; a photo per dish (`listing_line.image_path`, read by
-- `publish_listing`); and the bucket `cocina`'s fence, `kitchen_folder_ok` —
-- every call made AS ITS CALLER, under `set role authenticated` with a caller's
-- claims, and signed out under `set role anon`. As `postgres` RLS and
-- `has_role()` would wave everything through, and every check would pass for
-- nothing.
--
-- ⚠️ THE ROW'S CALLERS: the kitchen's owner, a manager, a cook, a shop's owner,
-- a neighbour who belongs to nothing, another kitchen's owner, and nobody
-- signed in.
--
-- ⚠️ THE BUCKET'S POLICIES ARE DRIVEN OVER THE REAL STORAGE API by
-- `docs/checks/10.5-i-a-kitchen-photos-contract.sh`, as `0063`'s are by `8o`'s.
-- Here: their predicate, as each caller, and the bucket's row and its two
-- policies as the catalog holds them.
--
-- ⚠️ THE DISCORD ACCOUNT LINE `0076` RE-WORDS IS ASSERTED WHERE IT WAS BORN, in
-- `0070`'s suite (2.2 and 4.1) — one home for one claim.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, as `0072`'s suite: making the businesses
-- queues the owner's Discord lines when a webhook is set, and the rollback
-- takes them out before pg_net's worker could send them.
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

-- Her page in one line, read as postgres: what the row holds, whoever may read it.
create function public._pagina76(p_ws uuid)
returns text language sql as $$
  select coalesce((select coalesce(sentence, '·') || ' | ' || coalesce(color, '·')
                          || ' | ' || coalesce(cover_path, '·') || ' | ' || coalesce(logo_path, '·')
                          || ' | ' || coalesce(maps_link, '·')
                     from public.kitchen_page where workspace_id = p_ws), 'no page')
$$;

-- How many pages the CALLER reads of one kitchen — an invoker, so RLS applies.
create function public._lee76(p_ws uuid)
returns bigint language sql as $$
  select count(*) from public.kitchen_page where workspace_id = p_ws
$$;
grant execute on function public._lee76(uuid) to authenticated;

\set fonda    '''0076aaaa-0000-4000-8000-000000000001'''
\set gerente  '''0076aaaa-0000-4000-8000-000000000002'''
\set cocinera '''0076aaaa-0000-4000-8000-000000000003'''
\set tendera  '''0076aaaa-0000-4000-8000-000000000004'''
\set vecina   '''0076aaaa-0000-4000-8000-000000000005'''
\set otra     '''0076aaaa-0000-4000-8000-000000000006'''
\set ninguno  '''0076bbbb-0000-4000-8000-0000000000ff'''
\set foto1    '''0076cccc-0000-4000-8000-000000000001'''
\set foto2    '''0076cccc-0000-4000-8000-000000000002'''
\set foto3    '''0076cccc-0000-4000-8000-000000000003'''
\set foto4    '''0076cccc-0000-4000-8000-000000000004'''
\set enlace   '''https://maps.app.goo.gl/Fonda0076AbC'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:fonda,    'fonda.0076@example.mx',    jsonb_build_object('full_name', 'Fonda 0076')),
  (:gerente,  'gerente.0076@example.mx',  jsonb_build_object('full_name', 'Gerente 0076')),
  (:cocinera, 'cocinera.0076@example.mx', jsonb_build_object('full_name', 'Cocinera 0076')),
  (:tendera,  'tendera.0076@example.mx',  jsonb_build_object('full_name', 'Tendera 0076')),
  (:vecina,   'vecina.0076@example.mx',   jsonb_build_object('full_name', 'Vecina 0076')),
  (:otra,     'otra.0076@example.mx',     jsonb_build_object('full_name', 'Otra 0076'));

-- ---- 0. a shop, a kitchen with a manager and a cook, and another kitchen ------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes 0076') as ws_t \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda 0076', p_kind => 'cocina') as ws_c \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Otra 0076', p_kind => 'cocina') as ws_o \gset
reset role;
select id as loc_c from public.location where workspace_id = :'ws_c' \gset

insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws_c', :gerente,  'manager', 'Gerente 0076'),
  (:'ws_c', :cocinera, 'staff',   'Cocinera 0076');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws_c', id, :'loc_c' from public.workspace_member where workspace_id = :'ws_c' and user_id = :cocinera;

-- Her pictures, as the phone names them, and others' — every path a folder and a uuid.
select :'ws_c' || '/' || :foto1 as cover,
       :'ws_c' || '/' || :foto2 as logo,
       :'ws_c' || '/' || :foto3 as dish,
       :'ws_o' || '/' || :foto4 as cover_otra,
       :'ws_t' || '/' || :foto4 as cover_tienda \gset

select public.chk('0.1 a kitchen that never opened her page has no row — every slot is its default',
  (select count(*) from public.kitchen_page where workspace_id in (:'ws_c', :'ws_o', :'ws_t')) = 0);

-- ---- 1. the owner and a manager write it ----------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select (p).sentence as ret_sentence, (p).color as ret_color, (p).cover_path as ret_cover,
       (p).updated_by as ret_by
  from (select public.set_kitchen_page(:'ws_c', jsonb_build_object(
          'sentence', '  Comida casera desde 1998. Menú distinto cada día.  ',
          'color', 'chile', 'cover_path', :'cover', 'logo_path', :'logo',
          'maps_link', :enlace)) as p) s \gset
reset role;
select public.chk('1.1 the owner sets every slot — the sentence trimmed — and the row is hers',
  public._pagina76(:'ws_c') = format('Comida casera desde 1998. Menú distinto cada día. | chile | %s | %s | %s',
                                     :'cover', :'logo', :enlace)
  and (select updated_by = :fonda from public.kitchen_page where workspace_id = :'ws_c'),
  public._pagina76(:'ws_c'));
select public.chk('1.2 it answers with the page as saved',
  :'ret_sentence' = 'Comida casera desde 1998. Menú distinto cada día.'
  and :'ret_color' = 'chile' and :'ret_cover' = :'cover' and :'ret_by' = :fonda,
  format('%s / %s / %s / %s', :'ret_sentence', :'ret_color', :'ret_cover', :'ret_by'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('sentence', 'Guisados de olla, de lunes a sábado.'))) as mgr_sentence \gset
reset role;
select public.chk('1.3 a manager changes the sentence alone — the four slots she did not send stay',
  :'mgr_sentence' = 'ok'
  and public._pagina76(:'ws_c') = format('Guisados de olla, de lunes a sábado. | chile | %s | %s | %s',
                                         :'cover', :'logo', :enlace)
  and (select updated_by = :gerente from public.kitchen_page where workspace_id = :'ws_c'),
  :'mgr_sentence' || ' / ' || public._pagina76(:'ws_c'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"logo_path": null}')) as clear_logo \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"sentence": "   "}')) as blank_sentence \gset
reset role;
select public.chk('1.4 a slot sent as null is cleared, and blank text is none — the rest stay',
  :'clear_logo' = 'ok' and :'blank_sentence' = 'ok'
  and public._pagina76(:'ws_c') = format('· | chile | %s | · | %s', :'cover', :enlace),
  format('%s %s / %s', :'clear_logo', :'blank_sentence', public._pagina76(:'ws_c')));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"horario": "9 a 17", "colour": "mole"}')) as unknown_keys \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{}')) as empty_page \gset
reset role;
select public.chk('1.5 keys it does not know are ignored, and an empty object changes no slot',
  :'unknown_keys' = 'ok' and :'empty_page' = 'ok'
  and public._pagina76(:'ws_c') = format('· | chile | %s | · | %s', :'cover', :enlace),
  format('%s %s / %s', :'unknown_keys', :'empty_page', public._pagina76(:'ws_c')));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('sentence', repeat('ñ', 100)))) as hundred \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('sentence', 'Comida casera desde 1998.'))) as sentence_back \gset
reset role;
select public.chk('1.6 a sentence of exactly 100 characters is kept — accents count as one',
  :'hundred' = 'ok' and :'sentence_back' = 'ok',
  :'hundred' || ' ' || :'sentence_back');

-- ---- 2. who is refused, and what is malformed ---------------------------------------
select public._pagina76(:'ws_c') as before_refusals \gset

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "mole"}')) as by_cook \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "mole"}')) as by_shop \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_t', '{"color": "mole"}')) as shop_own \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "mole"}')) as by_vecina \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "mole"}')) as by_otra \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :ninguno, '{"color": "mole"}')) as no_kitchen \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', null, '{"color": "mole"}')) as null_kitchen \gset
reset role;
select public.chk('2.1 ⚠️ a cook is refused — 42501, the page as it was',
  :'by_cook' = '42501' and public._pagina76(:'ws_c') = :'before_refusals', :'by_cook');
select public.chk('2.2 ⚠️ so are a shop''s owner, a neighbour and another kitchen''s owner — 42501',
  :'by_shop' = '42501' and :'by_vecina' = '42501' and :'by_otra' = '42501'
  and public._pagina76(:'ws_c') = :'before_refusals',
  format('%s %s %s', :'by_shop', :'by_vecina', :'by_otra'));
select public.chk('2.3 ⚠️ a shop has no page — TD013 for its own owner, and no row made',
  :'shop_own' = 'TD013' and public._pagina76(:'ws_t') = 'no page', :'shop_own');
select public.chk('2.4 a kitchen that does not exist, or none named — 42501',
  :'no_kitchen' = '42501' and :'null_kitchen' = '42501',
  :'no_kitchen' || ' ' || :'null_kitchen');

select set_config('request.jwt.claims', null, true);
set local role anon;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "mole"}')) as by_anon \gset
reset role;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "mole"}')) as by_nobody \gset
reset role;
select public.chk('2.5 ⚠️ nobody signed in — 42501 for anon, and for a token with no one in it',
  :'by_anon' = '42501' and :'by_nobody' = '42501' and public._pagina76(:'ws_c') = :'before_refusals',
  :'by_anon' || ' ' || :'by_nobody');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '[]')) as m_list \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', null)) as m_null \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"sentence": 5}')) as m_number \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": ["chile"]}')) as m_array \gset
reset role;
select public.chk('2.6 not an object, or a slot that is not text — 22023, the page as it was',
  :'m_list' = '22023' and :'m_null' = '22023' and :'m_number' = '22023' and :'m_array' = '22023'
  and public._pagina76(:'ws_c') = :'before_refusals',
  format('%s %s %s %s', :'m_list', :'m_null', :'m_number', :'m_array'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('sentence', repeat('a', 101)))) as s_long \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('sentence', E'Comida casera\ndesde 1998'))) as s_lines \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "azul"}')) as c_off \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "Chile"}')) as c_case \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c', '{"color": "cempasúchil"}')) as c_accent \gset
reset role;
select public.chk('2.7 a sentence over 100 characters or on two lines — 22023',
  :'s_long' = '22023' and :'s_lines' = '22023' and public._pagina76(:'ws_c') = :'before_refusals',
  :'s_long' || ' ' || :'s_lines');
select public.chk('2.8 a colour off the six, in another case, or with its accent — 22023 (the codes are bare)',
  :'c_off' = '22023' and :'c_case' = '22023' and :'c_accent' = '22023'
  and public._pagina76(:'ws_c') = :'before_refusals',
  format('%s %s %s', :'c_off', :'c_case', :'c_accent'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('cover_path', :'cover_otra'))) as p_otra \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('logo_path', :'cover_tienda'))) as p_tienda \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('cover_path', :'cover' || '/720.jpg'))) as p_file \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('cover_path', :'ws_c' || '/portada'))) as p_name \gset
reset role;
select public.chk('2.9 ⚠️ a picture in another kitchen''s folder or a shop''s, a file, or a name that is no uuid — 22023',
  :'p_otra' = '22023' and :'p_tienda' = '22023' and :'p_file' = '22023' and :'p_name' = '22023'
  and public._pagina76(:'ws_c') = :'before_refusals',
  format('%s %s %s %s', :'p_otra', :'p_tienda', :'p_file', :'p_name'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"maps_link": "http://maps.app.goo.gl/Fonda0076AbC"}')) as l_http \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"maps_link": "https://fondas.example/maps/place/x"}')) as l_other \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"maps_link": "https://google.com@fondas.example/maps"}')) as l_userinfo \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"maps_link": "https://maps.google.com.fondas.example/x"}')) as l_suffix \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"maps_link": "https://www.google.com/maps/../url?q=https://fondas.example"}')) as l_dots \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  '{"maps_link": "https://maps.app.goo.gl/Fonda 0076"}')) as l_space \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('maps_link', 'https://maps.app.goo.gl/' || repeat('a', 977)))) as l_long \gset
reset role;
select public.chk('2.10 ⚠️ a link that does not open Google Maps — not https, another site, a site behind @ or after the host, a dot segment, a space, over 1,000 characters — 22023',
  :'l_http' = '22023' and :'l_other' = '22023' and :'l_userinfo' = '22023' and :'l_suffix' = '22023'
  and :'l_dots' = '22023' and :'l_space' = '22023' and :'l_long' = '22023'
  and public._pagina76(:'ws_c') = :'before_refusals',
  format('%s %s %s %s %s %s %s', :'l_http', :'l_other', :'l_userinfo', :'l_suffix', :'l_dots', :'l_space', :'l_long'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select string_agg(public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
                    jsonb_build_object('maps_link', l))), ' ' order by o) as links_ok
  from (values (1, 'https://goo.gl/maps/Fonda0076'),
               (2, 'https://g.page/r/CFonda0076/review'),
               (3, 'https://www.google.com/maps/place/Fonda+0076/@19.4326,-99.1332,17z/data=!3m1!4b1'),
               (4, 'https://www.google.com.mx/maps/place/Fonda+0076'),
               (5, 'https://google.com/maps?q=19.4326,-99.1332'),
               (6, 'https://maps.google.com/?cid=1234567890'),
               (7, 'https://maps.google.com.mx/maps?q=fonda'),
               (8, 'https://maps.app.goo.gl/Fonda0076AbC')) v(o, l) \gset
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_c',
  jsonb_build_object('maps_link', :enlace))) as link_back \gset
reset role;
select public.chk('2.11 every address Google Maps gives a place is taken — share link, old share link, Business Profile, the long form with .mx or without',
  :'links_ok' = 'ok ok ok ok ok ok ok ok' and :'link_back' = 'ok'
  and public._pagina76(:'ws_c') = :'before_refusals',
  :'links_ok' || ' / ' || :'link_back');

-- ---- 3. who reads it ----------------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._lee76(:'ws_c') as r_fonda \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
select public._lee76(:'ws_c') as r_gerente \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
select public._lee76(:'ws_c') as r_cocinera \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select public._lee76(:'ws_c') as r_tendera \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
select public._lee76(:'ws_c') as r_vecina \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
select public._lee76(:'ws_c') as r_otra \gset
reset role;
select set_config('request.jwt.claims', null, true);
set local role anon;
select public._try('select count(*) from public.kitchen_page') as r_anon \gset
reset role;
select public.chk('3.1 her own kitchen''s people read her page — the owner, a manager and the cook',
  :'r_fonda' = '1' and :'r_gerente' = '1' and :'r_cocinera' = '1',
  format('%s %s %s', :'r_fonda', :'r_gerente', :'r_cocinera'));
select public.chk('3.2 ⚠️ nobody else does through a policy — a shop''s owner, a neighbour, another kitchen''s owner read none; she reaches it through the door (10.5-i-b)',
  :'r_tendera' = '0' and :'r_vecina' = '0' and :'r_otra' = '0',
  format('%s %s %s', :'r_tendera', :'r_vecina', :'r_otra'));
select public.chk('3.3 nobody signed in reads the table — 42501',
  :'r_anon' = '42501', :'r_anon');

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('insert into public.kitchen_page (workspace_id, updated_by) values (%L, %L)',
  :'ws_o', :fonda)) as w_insert \gset
select public._try(format('update public.kitchen_page set color = %L where workspace_id = %L', 'mole', :'ws_c')) as w_update \gset
select public._try(format('delete from public.kitchen_page where workspace_id = %L', :'ws_c')) as w_delete \gset
reset role;
select public.chk('3.4 ⚠️ and nobody writes it but the door — insert, update and delete as its owner are 42501',
  :'w_insert' = '42501' and :'w_update' = '42501' and :'w_delete' = '42501'
  and public._pagina76(:'ws_c') = :'before_refusals' and public._pagina76(:'ws_o') = 'no page',
  format('%s %s %s', :'w_insert', :'w_update', :'w_delete'));

-- ---- 4. the table keeps its own rules, whoever writes ---------------------------------
select public._try(format('insert into public.kitchen_page (workspace_id, cover_path, updated_by) values (%L, %L, %L)',
  :'ws_o', :'cover', :otra)) as t_cover \gset
select public._try(format('insert into public.kitchen_page (workspace_id, color, updated_by) values (%L, %L, %L)',
  :'ws_o', 'azul', :otra)) as t_color \gset
select public._try(format('insert into public.kitchen_page (workspace_id, maps_link, updated_by) values (%L, %L, %L)',
  :'ws_o', 'https://fondas.example/maps', :otra)) as t_link \gset
select public._try(format('insert into public.kitchen_page (workspace_id, sentence, updated_by) values (%L, %L, %L)',
  :'ws_o', repeat('a', 101), :otra)) as t_long \gset
select public._try(format('insert into public.kitchen_page (workspace_id, sentence, updated_by) values (%L, %L, %L)',
  :'ws_o', '   ', :otra)) as t_blank \gset
select public.chk('4.1 as the database''s owner too: another kitchen''s picture, a colour off the six, a link not Google Maps'', a long or blank sentence — 23514',
  :'t_cover' = '23514' and :'t_color' = '23514' and :'t_link' = '23514'
  and :'t_long' = '23514' and :'t_blank' = '23514' and public._pagina76(:'ws_o') = 'no page',
  format('%s %s %s %s %s', :'t_cover', :'t_color', :'t_link', :'t_long', :'t_blank'));

-- ---- 5. a photo per dish ----------------------------------------------------------------
\set pub1 '''0076dddd-0000-4000-8000-000000000001'''
\set pub2 '''0076dddd-0000-4000-8000-000000000002'''
\set pub3 '''0076dddd-0000-4000-8000-000000000003'''
\set pub4 '''0076dddd-0000-4000-8000-000000000004'''
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.publish_listing(%L, %L, now() + interval ''1 hour'', now() + interval ''3 hours'', %L::jsonb)',
  :pub1, :'loc_c', jsonb_build_array(
    jsonb_build_object('name', 'Comida corrida', 'unit_price', '65.00', 'quantity', 4, 'image_path', :'dish'),
    jsonb_build_object('name', 'Bolsa de guisados', 'unit_price', '50.00', 'quantity', 3, 'surprise', true),
    jsonb_build_object('name', 'Agua de jamaica', 'unit_price', '15.00', 'quantity', 5, 'image_path', '  ')))) as pub_ok \gset
reset role;
select public.chk('5.1 the owner publishes a dish with its photo; a line with none, or a blank one, carries none — as every build in the field sends it',
  :'pub_ok' = 'ok'
  and (select string_agg(coalesce(image_path, '·'), ' | ' order by line_no)
         from public.listing_line where listing_id = :pub1) = :'dish' || ' | · | ·',
  :'pub_ok' || ' / ' || coalesce((select string_agg(coalesce(image_path, '·'), ' | ' order by line_no)
                                    from public.listing_line where listing_id = :pub1), 'no lines'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :gerente), true);
set local role authenticated;
select public._try(format('select public.publish_listing(%L, %L, now() + interval ''1 hour'', now() + interval ''3 hours'', %L::jsonb)',
  :pub2, :'loc_c', jsonb_build_array(
    jsonb_build_object('name', 'Comida corrida', 'unit_price', '65.00', 'quantity', 4),
    jsonb_build_object('name', 'Mole', 'unit_price', '70.00', 'quantity', 2, 'image_path', :'cover_otra')))) as pub_otra \gset
select public._try(format('select public.publish_listing(%L, %L, now() + interval ''1 hour'', now() + interval ''3 hours'', %L::jsonb)',
  :pub3, :'loc_c', jsonb_build_array(
    jsonb_build_object('name', 'Mole', 'unit_price', '70.00', 'quantity', 2, 'image_path', 76)))) as pub_number \gset
select public._try(format('select public.publish_listing(%L, %L, now() + interval ''1 hour'', now() + interval ''3 hours'', %L::jsonb)',
  :pub4, :'loc_c', jsonb_build_array(
    jsonb_build_object('name', 'Mole', 'unit_price', '70.00', 'quantity', 2, 'image_path', :'dish' || '/720.jpg')))) as pub_file \gset
reset role;
select public.chk('5.2 ⚠️ a dish''s photo in another kitchen''s folder, a number, or a file — 22023, and nothing published',
  :'pub_otra' = '22023' and :'pub_number' = '22023' and :'pub_file' = '22023'
  and not exists (select 1 from public.listing where id in (:pub2, :pub3, :pub4)),
  format('%s %s %s', :'pub_otra', :'pub_number', :'pub_file'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :fonda), true);
set local role authenticated;
select public._try(format('select public.publish_listing(%L, %L, now() + interval ''1 hour'', now() + interval ''3 hours'', %L::jsonb)',
  :pub1, :'loc_c', jsonb_build_array(
    jsonb_build_object('name', 'Otra cosa', 'unit_price', '10.00', 'quantity', 1)))) as pub_retry \gset
reset role;
select public.chk('5.3 a retry is still the publication already made — its lines and photo as they were',
  :'pub_retry' = 'ok'
  and (select count(*) = 3 and bool_or(image_path = :'dish') from public.listing_line where listing_id = :pub1),
  :'pub_retry');

select public._try(format('update public.listing_line set image_path = %L where listing_id = %L and line_no = 2',
  :'cover_otra', :pub1)) as line_otra \gset
select public.chk('5.4 the line keeps its own rule as the database''s owner too — another kitchen''s picture is 23514',
  :'line_otra' = '23514', :'line_otra');

select public.chk('5.5 publish_listing''s signature as it was: one function, five arguments, its owner''s rights and an empty search path',
  (select count(*) = 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'publish_listing')
  and to_regprocedure('public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb)') is not null
  and (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
        where oid = 'public.publish_listing(uuid, uuid, timestamptz, timestamptz, jsonb)'::regprocedure));

-- ---- 6. the bucket's fence ----------------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public.kitchen_folder_ok(:'cover' || '/720.jpg') as f_vecina,
       public.kitchen_folder_ok(:'cover_tienda' || '/720.jpg') as f_tienda,
       public.kitchen_folder_ok(:ninguno || '/' || :foto1 || '/720.jpg') as f_ninguno,
       public.kitchen_folder_ok('portada/720.jpg') as f_name,
       public.kitchen_folder_ok('') as f_empty,
       public.kitchen_folder_ok(null) as f_null \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tendera), true);
select public.kitchen_folder_ok(:'cover' || '/160.jpg') as f_tendera \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :cocinera), true);
select public.kitchen_folder_ok(:'cover' || '/160.jpg') as f_cocinera \gset
reset role;
select public.chk('6.1 a picture in a kitchen''s folder answers anyone signed in — a neighbour, a shop''s owner, the cook',
  :'f_vecina' and :'f_tendera' and :'f_cocinera',
  format('%s %s %s', :'f_vecina', :'f_tendera', :'f_cocinera'));
select public.chk('6.2 ⚠️ and nothing else does — a shop''s folder, a folder that names no business, no uuid, nothing',
  not :'f_tienda' and not :'f_ninguno' and not :'f_name' and not :'f_empty' and coalesce(:'f_null', 'f') = 'f',
  format('%s %s %s %s %s', :'f_tienda', :'f_ninguno', :'f_name', :'f_empty', :'f_null'));

select public.chk('6.3 the walls: the door and the fence answer a signed-in person and nobody signed out; the two rules nobody calls',
  has_function_privilege('authenticated', 'public.set_kitchen_page(uuid, jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.kitchen_folder_ok(text)', 'execute')
  and not has_function_privilege('anon', 'public.set_kitchen_page(uuid, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_folder_ok(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.picture_in_folder(text, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.google_maps_link_ok(text)', 'execute')
  and not has_function_privilege('anon', 'public.picture_in_folder(text, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.google_maps_link_ok(text)', 'execute'));
select public.chk('6.4 the door and the fence run as their owner with an empty search path',
  (select bool_and(prosecdef and proconfig @> array['search_path=""'])
     from pg_proc where oid in ('public.set_kitchen_page(uuid, jsonb)'::regprocedure,
                                'public.kitchen_folder_ok(text)'::regprocedure)));

-- ⚠️ STORAGE RUNS IN THE JOB THAT RUNS THIS SUITE (`supabase start` with no
-- exclusions); without it `0076` makes no bucket, and this check says so rather
-- than pass over nothing.
select public.chk('6.5 the bucket cocina: private, 2 MB a file, JPEG, PNG or WebP',
  to_regclass('storage.buckets') is not null
  and (select not public and file_size_limit = 2097152
              and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
         from storage.buckets where id = 'cocina'),
  case when to_regclass('storage.buckets') is null then 'Storage is not running here'
       else coalesce((select format('public %s, %s bytes, %s', public, file_size_limit, allowed_mime_types)
                        from storage.buckets where id = 'cocina'), 'no bucket cocina') end);
select public.chk('6.6 ⚠️ its two policies — a manager of a kitchen writes in her folder; anyone signed in reads a kitchen''s — and none to update or delete',
  to_regclass('storage.objects') is not null
  and (select string_agg(pol.polname || ':' || pol.polcmd::text || ':' || array_to_string(pol.polroles::regrole[], ','),
                         ' ' order by pol.polname)
         from pg_policy pol
        where pol.polrelid = 'storage.objects'::regclass
          and (coalesce(pg_get_expr(pol.polqual, pol.polrelid), '')
               || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')) like '%''cocina''%')
      = 'cocina_insert:a:authenticated cocina_select:r:authenticated'
  and (select pg_get_expr(polwithcheck, polrelid) from pg_policy
        where polrelid = 'storage.objects'::regclass and polname = 'cocina_insert')
      like '%photo_folder_ok(name, ''manager''%kitchen_folder_ok(name)%'
  and (select pg_get_expr(polqual, polrelid) from pg_policy
        where polrelid = 'storage.objects'::regclass and polname = 'cocina_select')
      like '%kitchen_folder_ok(name)%',
  case when to_regclass('storage.objects') is null then 'Storage is not running here'
       else coalesce((select string_agg(polname || ':' || polcmd::text, ' ') from pg_policy
                       where polrelid = 'storage.objects'::regclass and polname like 'cocina%'), 'none') end);

-- ---- 7. it goes with its kitchen ----------------------------------------------------
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.set_kitchen_page(%L, %L::jsonb)', :'ws_o',
  jsonb_build_object('color', 'jamaica', 'cover_path', :'cover_otra'))) as otra_page \gset
reset role;
select public.chk('7.1 another kitchen''s owner sets her own page',
  :'otra_page' = 'ok' and public._pagina76(:'ws_o') = format('· | jamaica | %s | · | ·', :'cover_otra'),
  :'otra_page' || ' / ' || public._pagina76(:'ws_o'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otra), true);
set local role authenticated;
select public._try(format('select public.delete_my_account(p_business_names => %L::text[])',
  array['Fonda Otra 0076'])) as otra_gone \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public.kitchen_folder_ok(:'cover_otra' || '/720.jpg') as f_gone \gset
reset role;
select public.chk('7.2 ⚠️ she deletes her account, her kitchen typed: the page goes with it, and her photos leave everyone''s reach at once',
  :'otra_gone' = 'ok' and public._pagina76(:'ws_o') = 'no page'
  and not exists (select 1 from public.workspace where id = :'ws_o')
  and not :'f_gone',
  format('%s / %s / %s', :'otra_gone', public._pagina76(:'ws_o'), :'f_gone'));

savepoint pausada;
update public.workspace set is_active = false where id = :'ws_c';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public.kitchen_folder_ok(:'cover' || '/720.jpg') as f_paused \gset
reset role;
rollback to savepoint pausada;
select public.chk('7.3 and a kitchen that is not active shows none either',
  not :'f_paused', :'f_paused');

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 37 then
    raise exception 'expected 37 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
