-- ============================================================================
-- _walls.sql — THE WALLS, AS ONE QUERY THAT TWO INSTRUMENTS RUN (plan `10.1b`)
--
-- One row per breach, plus ONE `examined` row saying how much it read: every
-- wall holds when that row is the only one. ⚠️ The `examined` row is there
-- because over the hosted path `supabase db query -o csv` prints a zero-row
-- result as one blank line with no header (measured 2026-10-28, CLI 2.114.0;
-- the local path prints the header) — and an empty answer must never read as a
-- clean one. It is read by:
--   * `01_rls_coverage.sql` (F12), in CI's database, after every migration; and
--   * `docs/checks/5R-f-schema-deployed.sh` (group 7), on the HOSTED project,
--     after every deploy.
-- One file, because the two databases started from different default
-- privileges: on 2026-10-27 `anon` could execute 50 of the 60 functions here on
-- the hosted project while every suite in CI said it could not (`0071`). A wall
-- written twice can be fixed in one place and not the other.
--
-- THE WALLS (ADR-035 §2.7):
--   * nothing is readable without an account — `anon` executes no function and
--     holds no read or write on any table or view in `public`;
--   * a signed-in person executes exactly the functions in `signed_in` below.
--     ⚠️ Email sign-up confirms itself, so a signed-in person is anyone with an
--     email address, and every name below is a door she can try. A migration
--     that grants a function to `authenticated` adds its name here in the same
--     pull request, with the reason; a helper that only runs inside a
--     `security definer` function is granted to nobody and is not listed;
--   * no signed-in person writes through a view (a `security definer` view
--     reads past the row policies of the tables under it);
--   * no two functions share a name — ADR-035 §2.2: a signature changes by drop
--     and re-create, never by an overload — which is also what lets the list
--     name functions without their arguments;
--   * new objects `postgres` creates in `public` are born granting `anon` and
--     `authenticated` nothing that executes, reads or writes. This is the cause
--     of 2026-10-27, and the row that goes red if a default comes back.
--
-- NOT HERE: extension functions (they read no table: `citext`, `btree_gist`);
-- `service_role`, the admin key, which never reaches a phone (§2.7); schemas
-- other than `public`, which the client roles cannot use (`catalogo`,
-- `servicio`) or which are Supabase's (`storage`, `graphql_public`).
--
-- ⚠️ ONE STATEMENT, NO TRAILING SEMICOLON, AND IT NEVER ENDS WITH A COMMENT:
-- `supabase db query -f` runs exactly one statement, and F12 wraps this text in
-- `select * from ( … ) w`, where a last-line comment would swallow the `)`.
-- ============================================================================
with own_fn as (
  select p.oid, p.proname,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as sig
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and not exists (select 1 from pg_depend d
                      where d.classid = 'pg_proc'::regclass
                        and d.objid = p.oid and d.deptype = 'e')
),
signed_in (proname) as (values
  -- the doors the apps call
  ('adjust_stock'), ('approve_request'), ('cancel_collection_request'),
  ('catalog_template'), ('collection_reaches'), ('create_invite'),
  ('delete_my_account'), ('import_catalog'), ('my_access_requests'),
  ('onboard_workspace'), ('pending_access_requests'), ('record_failed_write'),
  ('record_pilot_readings'), ('record_purchase'), ('record_sale'),
  ('record_transfer'), ('record_waste'), ('redeem_invite'),
  ('replay_failed_write'), ('request_access'), ('request_collection'),
  ('set_my_display_name'), ('set_store_address'), ('void_transaction'),
  -- a kitchen's (`0072`, plan `10.4a`): the trades she picks from before she
  -- belongs to anything, her pin, and publishing and withdrawing what she offers
  ('kitchen_giros'), ('publish_listing'), ('set_store_pin'), ('withdraw_listing'),
  -- what a policy, a check or a computed column runs as the caller
  ('catalog_image_path'), ('has_role'), ('merma_path_ok'), ('my_locations'),
  ('my_role'), ('my_workspaces'), ('normalize_name'), ('photo_folder_ok'),
  -- what a trigger runs as the writer: `purging_workspace` is called inside
  -- three trigger functions, so a manager's own product or supplier edit
  -- needs it; the other two are trigger functions that were never revoked
  -- from PUBLIC, so a signed-in person always held them (`0071` names her)
  ('purging_workspace'), ('location_timezone_is_known'),
  ('workspace_member_stamp_left')
),
rel as (
  select c.oid, c.relname, c.relkind
    from pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relkind in ('r', 'p', 'v', 'm', 'f')
)
select 'anon may execute' as wall, f.sig as object
  from own_fn f
 where has_function_privilege('anon', f.oid, 'EXECUTE')
union all
select 'anon may read or write', r.relname
  from rel r
 where has_table_privilege('anon', r.oid, 'SELECT, INSERT, UPDATE, DELETE')
union all
select 'a signed-in person may execute it, and the list does not name it', f.sig
  from own_fn f
 where has_function_privilege('authenticated', f.oid, 'EXECUTE')
   and f.proname not in (select s.proname from signed_in s)
union all
select 'the list names it, and a signed-in person may not execute it', s.proname
  from signed_in s
 where not exists (select 1 from own_fn f
                    where f.proname = s.proname
                      and has_function_privilege('authenticated', f.oid, 'EXECUTE'))
union all
select 'a signed-in person may write through a view', r.relname
  from rel r
 where r.relkind in ('v', 'm')
   and has_table_privilege('authenticated', r.oid, 'INSERT, UPDATE, DELETE')
union all
select 'two functions share a name', f.proname
  from own_fn f
 group by f.proname
having count(*) > 1
union all
select 'new objects are born granting it',
       case d.defaclobjtype when 'f' then 'functions' when 'r' then 'tables'
                            when 'S' then 'sequences' else d.defaclobjtype::text end
       || ': ' || a.privilege_type || ' to ' || pg_get_userbyid(a.grantee)
  from pg_default_acl d
 cross join lateral aclexplode(d.defaclacl) a
 where d.defaclrole = 'postgres'::regrole
   and d.defaclnamespace in (0, 'public'::regnamespace)
   and a.grantee in ('anon'::regrole, 'authenticated'::regrole)
   and (   (d.defaclobjtype = 'f' and a.privilege_type = 'EXECUTE')
        or (d.defaclobjtype = 'r' and a.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE'))
        or (d.defaclobjtype = 'S' and a.privilege_type in ('SELECT', 'USAGE')))
union all
select 'examined',
       format('%s functions, %s tables and views, %s names on the list',
              (select count(*) from own_fn), (select count(*) from rel),
              (select count(*) from signed_in))
order by 1, 2
