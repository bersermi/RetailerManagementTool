-- ============================================================================
-- Behavioural verification for 0097 — the words the database gives the phones
-- say Wera. Plan task `13.2`, the owner's ruling of 2026-11-22 (*Itacate se
-- vuelve Wera*).
--
--   1. the two kinds' words under her switches, word for word — and no kind's
--      label, words or channel name names Itacate
--   2. the leaving message's function: its title ends *dejó Wera*, nothing in
--      its body names Itacate, it is still `security definer` with an empty
--      search_path, and no client role may run it
--   3. its trigger is still on `public.workspace`, before a deletion, each row
--   4. the ids stay: the neighbours' kinds are still `app = 'itacate'`, so the
--      phones' `my_notification_kinds('itacate')` still finds them
--
-- ⚠️ WHAT IS NOT HERE: the message itself, sent when a kitchen leaves — that is
-- `0094`'s suite (7.1), which runs after every migration and so reads `0097`'s
-- words: *Cocina Lupe 0094 dejó Wera*.
--
-- Run: docker exec -i supabase_db_<project> psql -U postgres -d postgres
--        -v ON_ERROR_STOP=1 < supabase/tests/0097_the_names.sql
-- ============================================================================
\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);

create or replace function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, coalesce(p_cond, false), p_detail);
  select null::void;
$$;

-- ---- 1. The words under her switches ------------------------------------------------------------
select public.chk('1.1 ofertas: Ofertas y novedades de las cocinas en Wera.',
  (select detail from servicio.notification_kind where kind = 'ofertas') = 'Ofertas y novedades de las cocinas en Wera.',
  (select detail from servicio.notification_kind where kind = 'ofertas'));
select public.chk('1.2 tarjeta_cambio: Si una cocina cierra su tarjeta o deja Wera.',
  (select detail from servicio.notification_kind where kind = 'tarjeta_cambio') = 'Si una cocina cierra su tarjeta o deja Wera.',
  (select detail from servicio.notification_kind where kind = 'tarjeta_cambio'));
select public.chk('1.3 no kind''s label, words or channel name names Itacate',
  not exists (select 1 from servicio.notification_kind
               where concat_ws(' ', label, detail, channel_name) ~* '(^|[^[:alpha:]])itacate([^[:alpha:]]|$)'),
  (select string_agg(kind, ', ') from servicio.notification_kind
    where concat_ws(' ', label, detail, channel_name) ~* '(^|[^[:alpha:]])itacate([^[:alpha:]]|$)'));

-- ---- 2. The leaving message's function -------------------------------------------------------
select public.chk('2.1 its title ends dejó Wera, and nothing in its body names Itacate',
  pg_get_functiondef('servicio.notice_kitchen_leaves()'::regprocedure) like '%old.display_name || '' dejó Wera''%'
  and pg_get_functiondef('servicio.notice_kitchen_leaves()'::regprocedure) not ilike '%itacate%');
select public.chk('2.2 still security definer, with an empty search_path',
  (select prosecdef and proconfig = array['search_path=""'] from pg_proc where oid = 'servicio.notice_kitchen_leaves()'::regprocedure),
  (select proconfig::text from pg_proc where oid = 'servicio.notice_kitchen_leaves()'::regprocedure));
select public.chk('2.3 and no client role may run it',
  not has_function_privilege('anon', 'servicio.notice_kitchen_leaves()', 'execute')
  and not has_function_privilege('authenticated', 'servicio.notice_kitchen_leaves()', 'execute'));

-- ---- 3. Its trigger ------------------------------------------------------------------------
select public.chk('3.1 notice_kitchen_leaves still fires before each deletion of a workspace',
  exists (select 1 from pg_trigger t
           where t.tgrelid = 'public.workspace'::regclass and t.tgname = 'notice_kitchen_leaves'
             and t.tgfoid = 'servicio.notice_kitchen_leaves()'::regprocedure
             and t.tgtype & 2 = 2      -- BEFORE
             and t.tgtype & 8 = 8      -- DELETE
             and t.tgtype & 1 = 1      -- FOR EACH ROW
             and not t.tgisinternal and t.tgenabled = 'O'));

-- ---- 4. The ids stay -------------------------------------------------------------------------
select public.chk('4.1 the neighbours'' kinds are still app = itacate — the id the phones ask by',
  (select array_agg(kind order by kind) from servicio.notification_kind where app = 'itacate')
    @> '{ofertas,publico,premio,promocion_cocina,sellos,tarjeta_cambio}',
  (select array_agg(kind order by kind)::text from servicio.notification_kind where app = 'itacate'));

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
  if (select count(*) from public._verify) <> 8 then
    raise exception 'expected 8 checks, % recorded — one was lost, not passed',
      (select count(*) from public._verify);
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
