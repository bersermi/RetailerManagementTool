-- ============================================================================
-- 0063 — Productos, part two: the photos. Plan task `8o`, the owner's rulings
-- of 2026-10-17.
--
-- ⚠️ EVERY WRITE THAT MATTERS IS DRIVEN UNDER `set role authenticated` with a
-- member's claims, or RLS and the trigger's audience pass vacuously. The fixture
-- (one template product, a prebuilt copy of it) is inserted as the database's
-- owner, the way `import_catalog` writes.
--
-- ⚠️ THE STORAGE POLICIES ARE NOT DRIVEN HERE: the job that runs this suite does
-- not start Storage, so `storage.objects` may not exist. Their predicate,
-- `photo_folder_ok`, is driven here; the policies themselves are driven over the
-- real Storage API by `docs/checks/8o-photos-contract.sh`.
--
-- ⚠️ A READ-BACK IS ITS OWN STATEMENT ([[a-read-in-the-write-statement-sees-the-
-- old-snapshot]]): a subquery beside the UPDATE sees the row as it was.
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

\set owner '''0063aaaa-0000-4000-8000-000000000001'''
\set staff '''0063aaaa-0000-4000-8000-000000000002'''
\set otro  '''0063aaaa-0000-4000-8000-000000000003'''
\set foto  '''0063cccc-0000-4000-8000-000000000001'''

insert into auth.users (id, email, raw_user_meta_data) values
  (:owner, 'duena.0063@example.mx',  jsonb_build_object('full_name', 'Dueña 0063')),
  (:staff, 'cajera.0063@example.mx', jsonb_build_object('full_name', 'Cajera 0063')),
  (:otro,  'otro.0063@example.mx',   jsonb_build_object('full_name', 'Otro 0063'));

select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), false);
select onboard_workspace('Abarrotes 0063') as ws \gset
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), false);
select onboard_workspace('Otra 0063') as ws_b \gset
select set_config('request.jwt.claims', null, false);

select id as loc from public.location where workspace_id = :'ws' \gset
insert into public.workspace_member (workspace_id, user_id, role, display_name) values
  (:'ws', :staff, 'staff', 'Cajera 0063');
insert into public.member_location (workspace_id, member_id, location_id)
  select :'ws', wm.id, :'loc' from public.workspace_member wm
   where wm.workspace_id = :'ws' and wm.user_id = :staff;

-- Wera's template product, and the shop's prebuilt copy of it.
insert into catalogo.family (code, name) values ('zz0063-refrescos', 'Refrescos 0063');
insert into catalogo.product (code, family_code, name, base_unit_code, purchase_unit_code,
       sell_unit_code, price_unit_code)
  values ('zz0063-cola', 'zz0063-refrescos', 'Cola 600 ml 0063', 'pza', 'pza', 'pza', 'pza');

insert into public.product_family (workspace_id, name, is_prebuilt) values
  (:'ws', 'Refrescos 0063', true),
  (:'ws', 'Mis cosas 0063', false);
select id as fam_wera from public.product_family where workspace_id = :'ws' and name = 'Refrescos 0063' \gset
select id as fam_mine from public.product_family where workspace_id = :'ws' and name = 'Mis cosas 0063' \gset
insert into public.product_variant (workspace_id, family_id, name, base_unit_code,
       purchase_unit_code, sell_unit_code, price_unit_code, is_prebuilt, template_code) values
  (:'ws', :'fam_wera', 'Cola 600 ml 0063', 'pza', 'pza', 'pza', 'pza', true, 'zz0063-cola'),
  (:'ws', :'fam_mine', 'Tamal de rajas 0063', 'pza', 'pza', 'pza', 'pza', false, null);
select id as var_wera from public.product_variant where workspace_id = :'ws' and name = 'Cola 600 ml 0063' \gset
select id as var_mine from public.product_variant where workspace_id = :'ws' and name = 'Tamal de rajas 0063' \gset

-- ----------------------------------------------------------------------------
-- 1. The shop's own photo of its own product
-- ----------------------------------------------------------------------------
select public.chk('1.1 product_variant.image_path is text, nullable, and empty on every row',
  (select format_type(a.atttypid, a.atttypmod) = 'text' and not a.attnotnull
     from pg_attribute a
    where a.attrelid = 'public.product_variant'::regclass and a.attname = 'image_path')
  and (select count(*) from public.product_variant where image_path is not null) = 0);

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), true);
set local role authenticated;
select public._try(format('update public.product_variant set image_path = %L where id = %L',
                          :'ws' || '/' || :foto, :'var_mine')) as own_photo \gset
select public.chk('1.2 the owner puts a photo on the product she made — <shop>/<uuid>',
  :'own_photo' = 'ok'
  and (select image_path = :'ws' || '/' || :foto from public.product_variant where id = :'var_mine'),
  :'own_photo');
select public.chk('1.3 her own product can still be RENAMED — only Wera''s keep their names',
  public._try(format('update public.product_variant set name = %L where id = %L',
                     'Tamal verde 0063', :'var_mine')) = 'ok');
select public.chk('1.4 a path in ANOTHER shop''s folder is refused — 23514',
  public._try(format('update public.product_variant set image_path = %L where id = %L',
                     :'ws_b' || '/' || :foto, :'var_mine')) = '23514');
select public.chk('1.5 and so is one that is not <shop>/<uuid> — 23514',
  public._try(format('update public.product_variant set image_path = %L where id = %L',
                     :'ws' || '/' || :foto || '/720.jpg', :'var_mine')) = '23514'
  and public._try(format('update public.product_variant set image_path = %L where id = %L',
                         :'ws' || '/foto', :'var_mine')) = '23514');
commit;

-- ----------------------------------------------------------------------------
-- 2. ⚠️⚠️ A product from Wera's catalog keeps its name and its picture
-- ----------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), true);
set local role authenticated;
select public.chk('2.1 renaming a product from Wera''s catalog is refused — 23001',
  public._try(format('update public.product_variant set name = %L where id = %L',
                     'Cola grande', :'var_wera')) = '23001',
  public._try(format('update public.product_variant set name = %L where id = %L',
                     'Cola grande', :'var_wera')));
select public.chk('2.2 and giving it a photo of the shop''s is refused — 23001',
  public._try(format('update public.product_variant set image_path = %L where id = %L',
                     :'ws' || '/' || :foto, :'var_wera')) = '23001');
select public._try(format('update public.product_variant set tax_rate = 0.1600 where id = %L',
                          :'var_wera')) as reprice \gset
select public.chk('2.3 ⚠️ but its IVA is still the shop''s to set (a policy predicate would make this a silent 0 rows)',
  :'reprice' = 'ok'
  and (select tax_rate = 0.1600 from public.product_variant where id = :'var_wera'), :'reprice');
select public.chk('2.4 and it can still be retired, since 0054',
  public._try(format('update public.product_variant set is_active = false where id = %L',
                     :'var_wera')) = 'ok');
select public.chk('2.4b and put back',
  public._try(format('update public.product_variant set is_active = true where id = %L',
                     :'var_wera')) = 'ok');
commit;

-- ----------------------------------------------------------------------------
-- 3. Wera's photo reaches every shop's copy, through the template code
-- ----------------------------------------------------------------------------
update catalogo.product set image_path = 'zz0063-cola/a1b2c3d4' where code = 'zz0063-cola';

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), true);
set local role authenticated;
select public.chk('3.1 a cashier reads Wera''s photo on the imported product — the row''s computed column',
  (select v.catalog_image_path = 'zz0063-cola/a1b2c3d4'
     from public.product_variant v where v.id = :'var_wera'),
  coalesce((select v.catalog_image_path from public.product_variant v where v.id = :'var_wera'), '(null)'));
select public.chk('3.2 and none on the shop''s own product, which carries its own',
  (select v.catalog_image_path is null and v.image_path = :'ws' || '/' || :foto
     from public.product_variant v where v.id = :'var_mine'));
select public.chk('3.3 the template itself is still out of reach from inside the role — 42501',
  public._try('select image_path from catalogo.product limit 1') = '42501');
commit;

-- ----------------------------------------------------------------------------
-- 4. photo_folder_ok — the predicate of the bucket producto's two policies
-- ----------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :owner), true);
set local role authenticated;
select public.chk('4.1 the owner may write and read her shop''s folder',
  public.photo_folder_ok(:'ws' || '/' || :foto || '/160.jpg', 'manager')
  and public.photo_folder_ok(:'ws' || '/' || :foto || '/160.jpg', 'staff'));
select public.chk('4.2 a first folder that is not a shop is false, never a cast error',
  not public.photo_folder_ok('------------------------------------/x/160.jpg', 'staff')
  and not public.photo_folder_ok('', 'staff')
  and not public.photo_folder_ok(null, 'staff'));
commit;

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :staff), true);
set local role authenticated;
select public.chk('4.3 a cashier may read her shop''s photos and may not put one there',
  public.photo_folder_ok(:'ws' || '/' || :foto || '/160.jpg', 'staff')
  and not public.photo_folder_ok(:'ws' || '/' || :foto || '/160.jpg', 'manager'));
commit;

begin;
select set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', :otro), true);
set local role authenticated;
select public.chk('4.4 another shop''s owner may do neither',
  not public.photo_folder_ok(:'ws' || '/' || :foto || '/160.jpg', 'staff')
  and not public.photo_folder_ok(:'ws' || '/' || :foto || '/160.jpg', 'manager'));
commit;

reset role;
select set_config('request.jwt.claims', null, false);

-- ----------------------------------------------------------------------------
-- The fixture template goes; the shops go with _cleanup.sql
-- ----------------------------------------------------------------------------
delete from catalogo.product where code like 'zz0063-%';
delete from catalogo.family  where code like 'zz0063-%';

select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 17 then
    raise exception 'expected 17 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
