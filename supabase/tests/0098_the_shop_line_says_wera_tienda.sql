-- ============================================================================
-- Behavioural verification for 0098 — the owner's Discord line for a new shop
-- says Wera Tienda. Plan task `13.3`, the owner's ruling of 2026-11-22.
--
--   1. the function's two lines: a shop's says *Nueva tienda en Wera Tienda*, a
--      kitchen's still *Nueva cocina en Wera Cocina*
--   2. no function that writes to his channel says *en Wera.* — the shop app's
--      old name — or names Itacate
--   3. it is still `security definer` with an empty search_path, no client role
--      may run it, and its trigger still fires after each new workspace
--
-- ⚠️ WHAT IS NOT HERE: the message itself, sent when a shop opens — that is
-- `0070`'s suite (3.1) and `0072`'s (1.3), which run after every migration and
-- so read `0098`'s words.
--
-- Run: docker exec -i supabase_db_<project> psql -U postgres -d postgres
--        -v ON_ERROR_STOP=1 < supabase/tests/0098_the_shop_line_says_wera_tienda.sql
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

-- ---- 1. The two lines ------------------------------------------------------------------------
select public.chk('1.1 a shop''s line: Nueva tienda en Wera Tienda. Ya son N tiendas.',
  (select prosrc from pg_proc where oid = 'servicio.aviso_tienda_nueva()'::regprocedure)
    like '%''🏪 Nueva tienda en Wera Tienda. Ya son %s tiendas.''%');
select public.chk('1.2 a kitchen''s line is unchanged: Nueva cocina en Wera Cocina',
  (select prosrc from pg_proc where oid = 'servicio.aviso_tienda_nueva()'::regprocedure)
    like '%''🍲 Nueva cocina en Wera Cocina. Ya son %s cocinas.''%');

-- ---- 2. No line to his channel says the old names ------------------------------------------------
select public.chk('2.1 no function that writes to his channel says en Wera. or names Itacate',
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname in ('public', 'servicio')
                 and p.prosrc like '%avisar_a_wera(%'
                 and (p.prosrc like '%en Wera.%' or p.prosrc ilike '%itacate%')),
  (select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'servicio') and p.prosrc like '%avisar_a_wera(%'
      and (p.prosrc like '%en Wera.%' or p.prosrc ilike '%itacate%')));

-- ---- 3. Its walls and its trigger ----------------------------------------------------------------
select public.chk('3.1 still security definer, with an empty search_path',
  (select prosecdef and proconfig = array['search_path=""'] from pg_proc where oid = 'servicio.aviso_tienda_nueva()'::regprocedure),
  (select proconfig::text from pg_proc where oid = 'servicio.aviso_tienda_nueva()'::regprocedure));
select public.chk('3.2 and no client role may run it',
  not has_function_privilege('anon', 'servicio.aviso_tienda_nueva()', 'execute')
  and not has_function_privilege('authenticated', 'servicio.aviso_tienda_nueva()', 'execute'));
select public.chk('3.3 wera_avisa_tienda_nueva still fires after each new workspace',
  exists (select 1 from pg_trigger t
           where t.tgrelid = 'public.workspace'::regclass and t.tgname = 'wera_avisa_tienda_nueva'
             and t.tgfoid = 'servicio.aviso_tienda_nueva()'::regprocedure
             and t.tgtype & 2 = 0      -- AFTER
             and t.tgtype & 4 = 4      -- INSERT
             and t.tgtype & 1 = 1      -- FOR EACH ROW
             and not t.tgisinternal and t.tgenabled = 'O'));

-- ---------------------------------------------------------------- verdict ---
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  if (select count(*) from public._verify) <> 6 then
    raise exception 'expected 6 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
