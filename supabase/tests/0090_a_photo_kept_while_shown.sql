-- ============================================================================
-- 0090 — a kitchen's photo: opened outside her kitchen only while it is shown,
-- and deleted by her kitchen once nothing names it (`10.9i-ii`; the owner's D2,
-- the full version ruled 2026-11-20). The two questions the bucket's policies ask
-- — `kitchen_picture_shown` and `kitchen_picture_named` — asked AS A NEIGHBOUR
-- who belongs to nothing, under `set role authenticated` with her claims, as
-- Storage asks them; the kitchen's writes made as its owner. The policies'
-- TEXT is read here where Storage runs (CI's reset job starts it); their
-- behaviour is only real over the Storage API, which
-- `docs/checks/10.5-i-a-kitchen-photos-contract.sh` drives.
--
-- Section 1 the shape. Section 2 what is shown — her page, an open offer, a
-- promotion while shown — and what is not. Section 3 what is named, and what an
-- undo leaves named by nothing. Section 4 the bucket's policies, where Storage runs.
--
-- ⚠️ ONE TRANSACTION THAT ROLLS BACK, so `now()` is one moment throughout.
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

-- What a neighbour's Storage read and her kitchen's delete would ask, for one file.
create table public._asked (file text primary key, shown boolean, named boolean);
grant all on public._asked to authenticated;

\set mari  '''0090aaaa-0000-4000-8000-000000000001'''
\set vecina '''0090aaaa-0000-4000-8000-000000000002'''
\set tere  '''0090aaaa-0000-4000-8000-000000000003'''
\set l_open '''0090bbbb-0000-4000-8000-000000000001'''
\set l_gone '''0090bbbb-0000-4000-8000-000000000002'''
\set l_over '''0090bbbb-0000-4000-8000-000000000003'''
\set p_shown '''0090cccc-0000-4000-8000-000000000001'''
\set p_ended '''0090cccc-0000-4000-8000-000000000002'''
\set p_undone '''0090cccc-0000-4000-8000-000000000003'''

select date_bin('15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as q0 \gset

insert into auth.users (id, email, raw_user_meta_data) values
  (:mari,   'mari.0090@example.mx',   jsonb_build_object('full_name', 'Mari 0090')),
  (:vecina, 'vecina.0090@example.mx', jsonb_build_object('full_name', 'Vecina 0090')),
  (:tere,   'tere.0090@example.mx',   jsonb_build_object('full_name', 'Tere 0090'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Fonda Doña Mari 0090', p_kind => 'cocina') as ws \gset
reset role;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :tere), true);
set local role authenticated;
select onboard_workspace(p_display_name => 'Abarrotes Tere 0090') as shop \gset
reset role;
select id as loc from public.location where workspace_id = :'ws' \gset

-- Her pictures, each `<kitchen>/<uuid>` as `picture_in_folder` writes them.
select :'ws' || '/' || gen_random_uuid() as cover,     :'ws' || '/' || gen_random_uuid() as logo,
       :'ws' || '/' || gen_random_uuid() as dish_open, :'ws' || '/' || gen_random_uuid() as dish_gone,
       :'ws' || '/' || gen_random_uuid() as dish_over, :'ws' || '/' || gen_random_uuid() as promo_shown,
       :'ws' || '/' || gen_random_uuid() as promo_ended, :'ws' || '/' || gen_random_uuid() as promo_undone,
       :'ws' || '/' || gen_random_uuid() as old_cover, :'ws' || '/' || gen_random_uuid() as loose,
       gen_random_uuid() || '/' || gen_random_uuid() as nowhere,
       :'shop' || '/' || gen_random_uuid() as shop_pic \gset

update servicio.feature_switch set is_on = true where name = 'promociones';

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :mari), true);
set local role authenticated;
-- Her page: first the old cover, then the new one, so the old is named by nothing.
select public.set_kitchen_page(:'ws', jsonb_build_object('cover_path', :'old_cover'))::text is not null as page1 \gset
select public.set_kitchen_page(:'ws', jsonb_build_object('cover_path', :'cover', 'logo_path', :'logo'))::text is not null as page2 \gset
-- (A row a function answers is read `::text`: a row with one null field is not `is not null`.)
-- Three offers, each with a dish's photo: one open, one she withdraws, one whose window will end.
select public.publish_listing(:l_open, :'loc', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  jsonb_build_array(jsonb_build_object('name', 'Pozole', 'unit_price', '70.00', 'quantity', 5, 'image_path', :'dish_open'))) is not null as o1 \gset
select public.publish_listing(:l_gone, :'loc', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  jsonb_build_array(jsonb_build_object('name', 'Mole', 'unit_price', '80.00', 'quantity', 5, 'image_path', :'dish_gone'))) is not null as o2 \gset
select public.publish_listing(:l_over, :'loc', :'q0'::timestamptz, :'q0'::timestamptz + interval '4 hours',
  jsonb_build_array(jsonb_build_object('name', 'Tinga', 'unit_price', '60.00', 'quantity', 5, 'image_path', :'dish_over'))) is not null as o3 \gset
select public.withdraw_listing(:l_gone)::text is not null as withdrawn \gset
-- Three promotions, each with a photo: one shown, one she ends today, one she undoes.
select public.create_promotion(:'ws', :p_shown, 'nuevo', 'Pozole verde', null, :'promo_shown',
  array[1,2,3,4,5,6,7], (now() at time zone 'America/Mexico_City')::date + 7, 'Hasta la semana que entra.') is not null as m1 \gset
select public.create_promotion(:'ws', :p_ended, 'nuevo', 'Mole de olla', null, :'promo_ended',
  array[1,2,3,4,5,6,7], (now() at time zone 'America/Mexico_City')::date + 7, 'Hasta la semana que entra.') is not null as m2 \gset
select public.create_promotion(:'ws', :p_undone, 'nuevo', 'Tinga', null, :'promo_undone',
  array[1,2,3,4,5,6,7], (now() at time zone 'America/Mexico_City')::date + 7, 'Hasta la semana que entra.') is not null as m3 \gset
select public.end_promotion(:'ws', :p_ended) is not null as ended \gset
select public.undo_promotion(:'ws', :p_undone) is not null as undone \gset
reset role;
update public.listing set pickup_start = now() - interval '3 hours', pickup_end = now() - interval '1 minute'
 where id = :l_over;

-- What a neighbour's read asks of each file, and what a delete would.
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
insert into public._asked (file, shown, named)
select f, public.kitchen_picture_shown(f), public.kitchen_picture_named(f)
  from unnest(array[
         :'cover' || '/720.jpg', :'logo' || '/160.jpg', :'dish_open' || '/720.jpg',
         :'dish_gone' || '/720.jpg', :'dish_over' || '/160.jpg', :'promo_shown' || '/720.jpg',
         :'promo_ended' || '/720.jpg', :'promo_undone' || '/720.jpg', :'old_cover' || '/720.jpg',
         :'loose' || '/720.jpg', :'nowhere' || '/720.jpg', :'shop_pic' || '/720.jpg',
         :'cover', :'cover' || '/x/720.jpg', upper(:'cover') || '/720.jpg', :'ws' || '/suelto.jpg',
         'no-es-una-ruta']) f;
reset role;
update servicio.feature_switch set is_on = false where name = 'promociones';
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :vecina), true);
set local role authenticated;
select public.kitchen_picture_shown(:'promo_shown' || '/720.jpg') as promo_switched_off,
       public.kitchen_picture_shown(null) as shown_null,
       public.kitchen_picture_named(null) as named_null \gset
reset role;

create function public._s(p_file text) returns boolean language sql as $$ select a.shown from public._asked a where a.file = p_file $$;
create function public._n(p_file text) returns boolean language sql as $$ select a.named from public._asked a where a.file = p_file $$;


-- ---- 1. the shape ---------------------------------------------------------------------
select public.chk('1.1 both questions are definers with an empty path; the signed-in may ask them, nobody signed out',
  (select bool_and(p.prosecdef and p.proconfig = array['search_path=""'] and p.provolatile = 's')
     from pg_proc p where p.oid in ('public.kitchen_picture_shown(text)'::regprocedure,
                                    'public.kitchen_picture_named(text)'::regprocedure))
  and has_function_privilege('authenticated', 'public.kitchen_picture_shown(text)', 'execute')
  and has_function_privilege('authenticated', 'public.kitchen_picture_named(text)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_picture_shown(text)', 'execute')
  and not has_function_privilege('anon', 'public.kitchen_picture_named(text)', 'execute'));
select public.chk('1.2 a dish''s photo is found by an index',
  exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'listing_line_by_photo'
             and indexdef like '%(image_path)%WHERE (image_path IS NOT NULL)%'),
  (select indexdef from pg_indexes where indexname = 'listing_line_by_photo'));
select public.chk('1.3 the fixture landed: her page twice, three offers, one withdrawn, three promotions, one ended, one undone',
  :'page1' and :'page2' and :'o1' and :'o2' and :'o3' and :'withdrawn' and :'m1' and :'m2' and :'m3'
  and :'ended' and :'undone'
  and (select count(*) from servicio.promotion where workspace_id = :'ws') = 2,
  concat_ws(' ', :'page1', :'page2', :'o1', :'o2', :'o3', :'withdrawn', :'m1', :'m2', :'m3', :'ended', :'undone',
            (select count(*) from servicio.promotion where workspace_id = :'ws')));


-- ---- 2. what a neighbour is shown ----------------------------------------------------------
select public.chk('2.1 her cover and her logo are shown',
  public._s(:'cover' || '/720.jpg') and public._s(:'logo' || '/160.jpg'));
select public.chk('2.2 an open offer''s dish is shown; a withdrawn one''s and one whose window ended are not',
  public._s(:'dish_open' || '/720.jpg') and not public._s(:'dish_gone' || '/720.jpg')
  and not public._s(:'dish_over' || '/160.jpg'));
select public.chk('2.3 a promotion''s photo is shown while it shows — not once ended, not undone, not with Wera''s switch off',
  public._s(:'promo_shown' || '/720.jpg') and not public._s(:'promo_ended' || '/720.jpg')
  and not public._s(:'promo_undone' || '/720.jpg') and not :'promo_switched_off');
select public.chk('2.4 the cover she replaced and a picture nothing names are not shown',
  not public._s(:'old_cover' || '/720.jpg') and not public._s(:'loose' || '/720.jpg'));
select public.chk('2.5 a folder that is no kitchen — none at all, or a shop''s — shows nothing',
  not public._s(:'nowhere' || '/720.jpg') and not public._s(:'shop_pic' || '/720.jpg'));
select public.chk('2.6 only a file inside a picture''s folder: not the folder itself, not deeper, not in capitals, not loose, not nothing',
  not public._s(:'cover') and not public._s(:'cover' || '/x/720.jpg') and not public._s(upper(:'cover') || '/720.jpg')
  and not public._s(:'ws' || '/suelto.jpg') and not public._s('no-es-una-ruta') and not :'shown_null');


-- ---- 3. what is named — what her kitchen may not delete ---------------------------------------
select public.chk('3.1 her page''s cover and logo are named',
  public._n(:'cover' || '/720.jpg') and public._n(:'logo' || '/160.jpg'));
select public.chk('3.2 every offer''s dish is named — open, withdrawn or over (her Anteriores and Repetir show them)',
  public._n(:'dish_open' || '/720.jpg') and public._n(:'dish_gone' || '/720.jpg') and public._n(:'dish_over' || '/160.jpg'));
select public.chk('3.3 a promotion''s photo is named while the promotion stands, ended too; an undone one''s is named by nothing',
  public._n(:'promo_shown' || '/720.jpg') and public._n(:'promo_ended' || '/720.jpg')
  and not public._n(:'promo_undone' || '/720.jpg'));
select public.chk('3.4 the cover she replaced and a picture nothing names are named by nothing',
  not public._n(:'old_cover' || '/720.jpg') and not public._n(:'loose' || '/720.jpg'));
select public.chk('3.5 a name that is no kitchen''s file is answered named, so nothing reads it as deletable',
  public._n('no-es-una-ruta') and :'named_null');


-- ---- 4. the bucket's policies, where Storage runs ---------------------------------------------
select public.chk('4.1 the read: her kitchen''s members every file, anyone else what is shown, only while the kitchen exists',
  case when to_regclass('storage.objects') is null then true
       else (select pg_get_expr(polqual, polrelid) from pg_policy
              where polrelid = 'storage.objects'::regclass and polname = 'cocina_select' and polcmd = 'r')
            = '((bucket_id = ''cocina''::text) AND kitchen_folder_ok(name) AND (photo_folder_ok(name, ''staff''::workspace_role) OR kitchen_picture_shown(name)))'
  end,
  case when to_regclass('storage.objects') is null then 'Storage is not running here' else coalesce((select pg_get_expr(polqual, polrelid) from pg_policy
    where polrelid = 'storage.objects'::regclass and polname = 'cocina_select'), 'no cocina_select') end);
select public.chk('4.2 the delete: a member of the kitchen, a file nothing names — and still no update',
  case when to_regclass('storage.objects') is null then true
       else (select pg_get_expr(polqual, polrelid) from pg_policy
              where polrelid = 'storage.objects'::regclass and polname = 'cocina_delete' and polcmd = 'd')
            = '((bucket_id = ''cocina''::text) AND kitchen_folder_ok(name) AND photo_folder_ok(name, ''staff''::workspace_role) AND (NOT kitchen_picture_named(name)))'
        and not exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass
                         and polcmd = 'w' and polname like 'cocina%')
  end,
  case when to_regclass('storage.objects') is null then 'Storage is not running here' else coalesce((select pg_get_expr(polqual, polrelid) from pg_policy
    where polrelid = 'storage.objects'::regclass and polname = 'cocina_delete'), 'no cocina_delete') end);


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
  if (select count(*) from public._verify) <> 16 then
    raise exception 'expected 16 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;

rollback;
