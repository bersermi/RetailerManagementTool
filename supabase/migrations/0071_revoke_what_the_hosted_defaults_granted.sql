-- ============================================================================
-- 0071 — WHAT THE HOSTED PROJECT'S DEFAULTS GRANTED, TAKEN BACK. Plan task `10.1b`.
--
-- Two walls already ruled, both true in CI and false in the shop:
--   * nothing is readable without an account (2026-10-27, ADR-035 §2.7);
--   * `auth_full_name` is granted to nobody (2026-09-18, `0034`).
--
-- WHY THE SHOP DIFFERED. The hosted project is older than Supabase's change of
-- defaults, so everything `postgres` creates in `public` is born granting
-- `anon` and `authenticated` EXECUTE (a function) or every privilege (a table or
-- view). CI's database — the CLI's local image — starts with the new defaults,
-- which grant them nothing. Most migrations here revoke `from public`, which
-- removes neither grant, so every suite saying "anon cannot call this" was green
-- in CI and false in the shop. Read on the hosted project, 2026-10-27, from the
-- catalog only (`supabase/pgtap/_walls.sql`, 96 rows):
--   * `anon` may execute 50 of the 60 functions in `public` outside extensions
--     (29 of the 38 `security definer`; plan `10.1` counted 27 of 35 leaving out
--     three trigger functions), and holds every privilege on all 7 views;
--   * a signed-in person may execute 18 functions CI never grants her —
--     `auth_full_name` among them, and `adjust_stock_delta`, whose own comment
--     (`0023`) says it has no role fence because nothing grants it: on the
--     hosted project a cashier could adjust stock past the manager fence its
--     callers hold; and she may INSERT, UPDATE and DELETE through all 7 views;
--   * 14 default grants make every new function, table and sequence the same.
-- Supabase applies the new table and sequence defaults to every existing project
-- on 2026-10-30 (its changelog 45329), and existing objects keep their grants —
-- so the platform would have fixed none of the 50, the 18 or the 7, and its
-- changelog names no function default at all.
--
-- WHAT THIS FILE DOES: makes what `anon` and `authenticated` hold on the hosted
-- project what they hold in CI, and nothing else. In CI it changes two things
-- only: three functions trade the grant PUBLIC held for named ones (sections 2
-- and 3), and `anon` loses the four privileges it held on each view that
-- neither read nor write (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN).
--
-- WHAT IT DOES NOT TOUCH: `service_role` (the admin key, never on a phone —
-- §2.7; Supabase's own 2026-10-30 change revokes its table defaults); base
-- tables (their client grants are identical in both databases, measured, and
-- F9/F10 hold there); extension functions; schemas other than `public`.
--
-- THE FIELD RULE (ADR-035 §2.2) — nothing a build in the field calls is taken
-- away. Read 2026-10-27: no RPC name in the history of `app/`, `site/`,
-- `packages/` or `supabase/functions/` is one of the 18 (every mention is a
-- comment); the two RPCs a signed-out caller could reach in use,
-- `catalog_template` and `collection_reaches`, have been asked only with a
-- session since their hooks were written; nothing writes through a view; the
-- Edge Function reads no table. Inside the database, everything that uses the 18
-- is a trigger (a trigger needs no EXECUTE to fire) or a `security definer`
-- caller (which runs as their owner) — except `purging_workspace`, which three
-- trigger functions call as the WRITER, which is why section 3 keeps it.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. THE CAUSE: what `postgres` creates in `public` from now on is born
--    granting the client roles nothing that executes, reads or writes — CI's
--    defaults. Tables and sequences are the statements of Supabase's own change.
-- ----------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke select, usage on sequences from anon, authenticated;


-- ----------------------------------------------------------------------------
-- 2. `anon` executes nothing in `public`. A loop rather than a list, because
--    the hosted project carries a function no migration made (`rls_auto_enable`,
--    Supabase's event trigger that turns RLS on for a new table; an event
--    trigger needs no EXECUTE to fire either). `from public` too: in CI three
--    functions were never revoked from PUBLIC, and PUBLIC includes `anon`.
-- ----------------------------------------------------------------------------
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and not exists (select 1 from pg_depend d
                        where d.classid = 'pg_proc'::regclass
                          and d.objid = p.oid and d.deptype = 'e')
       and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    execute format('revoke execute on function %s from public, anon', f);
  end loop;
end
$$;


-- ----------------------------------------------------------------------------
-- 3. THE THREE PUBLIC CARRIED keep the roles that held them through PUBLIC.
--    ⚠️ `purging_workspace` is called inside `catalog_prebuilt_stays`,
--    `provider_protect_generic` and `transaction_document_is_immutable` — three
--    `security invoker` trigger functions, so it runs as whoever wrote the row:
--    a manager editing a product or a supplier through the API. Without this
--    grant those edits would fail. The other two are trigger functions; kept as
--    they were rather than proved unneeded. `service_role` is named so that
--    this file changes nothing for it.
-- ----------------------------------------------------------------------------
grant execute on function public.purging_workspace(uuid) to authenticated, service_role;
grant execute on function public.location_timezone_is_known() to authenticated, service_role;
grant execute on function public.workspace_member_stamp_left() to authenticated, service_role;


-- ----------------------------------------------------------------------------
-- 4. THE 18 A SIGNED-IN PERSON HELD ONLY ON THE HOSTED PROJECT. No migration
--    granted them; CI never had them. Grouped by why nobody needs them:
--    * granted to nobody by its own migration: `auth_full_name` (`0034`);
--    * helpers run only inside a `security definer` caller: `adjust_stock_delta`
--      (`record_failed_write`), `generate_invite_token`, `hash_invite_token`,
--      `supersede_expired_invite` (`create_invite`, `redeem_invite`,
--      `request_access`), `generate_workspace_code`, `normalize_workspace_code`
--      (`onboard_workspace`, `request_access`, `hash_invite_token`);
--    * trigger functions: the ten from `catalog_prebuilt_stays` to
--      `transaction_document_is_immutable`, and `rls_auto_enable` (hosted only).
--    No overload shares any of these names, so each name is one function.
-- ----------------------------------------------------------------------------
do $$
declare
  v_names text[] := array[
    'auth_full_name',
    'adjust_stock_delta', 'generate_invite_token', 'hash_invite_token',
    'supersede_expired_invite', 'generate_workspace_code', 'normalize_workspace_code',
    'catalog_prebuilt_stays', 'product_variant_template_code_stays',
    'product_variant_units_same_dimension', 'product_variant_wera_keeps',
    'provider_protect_generic', 'set_updated_at', 'stock_batch_open_balance',
    'stock_batch_receipt_complete', 'stock_movement_project_balance',
    'transaction_document_is_immutable',
    'rls_auto_enable'];
  v_name text;
  f      regprocedure;
  v_n    int;
begin
  foreach v_name in array v_names loop
    v_n := 0;
    for f in
      select p.oid::regprocedure from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.proname = v_name
    loop
      execute format('revoke execute on function %s from authenticated', f);
      v_n := v_n + 1;
    end loop;
    -- A typo here would revoke nothing and say nothing. Only the platform's
    -- function may be absent: CI's database has none.
    if v_n = 0 and v_name <> 'rls_auto_enable' then
      raise exception '0071: no function public.% to revoke', v_name;
    end if;
  end loop;
end
$$;


-- ----------------------------------------------------------------------------
-- 5. VIEWS: `anon` holds nothing; a signed-in person keeps SELECT, which each
--    view's migration granted, and loses the writes. Six views are
--    `security_invoker`, so a write would have met the base tables' policies;
--    `waste_reason_line` is the one `security definer` view, which reads past
--    them (§2.7) — no write through it may exist.
-- ----------------------------------------------------------------------------
do $$
declare
  v regclass;
begin
  for v in
    select c.oid::regclass from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')
  loop
    execute format('revoke all on %s from anon', v);
    execute format('revoke insert, update, delete on %s from authenticated', v);
  end loop;
end
$$;


-- ----------------------------------------------------------------------------
-- 6. AND IT PROVES ITSELF BEFORE IT COMMITS. A REVOKE on something `postgres`
--    neither owns nor holds a grant option on is a WARNING, not an error, so a
--    surprise on the hosted project would leave a wall standing open with a
--    green deploy. Here it fails the migration instead, and `db push` applies
--    nothing. The full set of walls is `supabase/pgtap/_walls.sql`, which CI
--    and `5R-f` run; this is only what this file claims to have done.
-- ----------------------------------------------------------------------------
do $$
declare
  v_open text;
begin
  select string_agg(breach.x, ', ') into v_open from (
    select 'anon executes ' || p.oid::regprocedure::text as x
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and not exists (select 1 from pg_depend d
                        where d.classid = 'pg_proc'::regclass
                          and d.objid = p.oid and d.deptype = 'e')
       and has_function_privilege('anon', p.oid, 'EXECUTE')
    union all
    select 'anon reads or writes ' || c.relname
      from pg_class c
     where c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
    union all
    select 'a signed-in person executes ' || p.proname
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('auth_full_name', 'adjust_stock_delta', 'rls_auto_enable')
       and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    union all
    select 'a signed-in person may not execute purging_workspace'
     where not has_function_privilege('authenticated',
             'public.purging_workspace(uuid)'::regprocedure, 'EXECUTE')
  ) breach;
  if v_open is not null then
    raise exception '0071 left a wall open: %', v_open;
  end if;
end
$$;
