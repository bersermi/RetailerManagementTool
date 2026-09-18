-- ============================================================================
-- Behavioural verification for 0034 — a membership carries a person's NAME
-- ============================================================================
-- ADR-035 §2.3, §2.7 (amended this date), §9. docs/PLAN.md task 5b.8-i.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0034_member_display_name.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED, AND WHY IT NEEDS NO CLIENT
-- ----------------------------------------------------------------------------
-- `5b.8` is three tasks: this one STORES the name, `5b.8-ii` displays it and
-- `5b.8-iii` lets a person fix it. The half loop is deliberate, and what makes
-- it safe is that the storing half is falsifiable on its own — four ways into a
-- shop, four named members, a backfill that leaves no hole, and an account with
-- no name still admitted. Every one of those is an assertion this file makes
-- with no phone in the room.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SECTION 1.9 IS THE ONE NOTHING ELSE IN THIS REPOSITORY CAN MAKE
-- ----------------------------------------------------------------------------
-- `docs/checks/5b.8-split-coverage.sh` says in its own prose that it CANNOT see
-- a fifth membership writer appearing in the schema — it reads `docs/PLAN.md`,
-- and a function is not in that file. This task exists because two writers were
-- missed by a row that named two: `request_access` and `approve_request` were
-- found by reading applied SQL, and the second is `5b-iii`'s own RPC.
--
-- 1.9 reads `pg_proc.prosrc` and requires that the set of functions in `public`
-- which INSERT `public.workspace_member` is EXACTLY the four this migration
-- edited. A fifth one lands red on the day it is written, in the suite named
-- after the column it would have forgotten to fill — which is the only place
-- that finding could have been made three tasks earlier.
--
-- ----------------------------------------------------------------------------
-- ⚠️ SECTION 3 HOLDS AN OWNER'S RULING, NOT A PREFERENCE
-- ----------------------------------------------------------------------------
-- ✅✅ RULED 2026-09-18: "keep what they typed." The name is written on insert
-- and, on update, only where the stored value is null. Three of the four
-- writers have an update branch, and 3.1–3.3 walk all three with a name that a
-- person has already corrected — while REQUIRING the role to change, so a
-- version of this check that passed because the branch never ran would fail.
-- 3.4 is the other half and the one that stops the rule degrading into "never
-- write on update": the same branch DOES fill a hole.
--
-- ⚠️ A later session that makes these refresh the name from the provider is
-- undoing the owner's decision of 2026-09-18, not tidying a coalesce.
--
-- ----------------------------------------------------------------------------
-- ⚠️ SECTION 5 IS THE PART THE GREEN RUN DOES NOT WATCH
-- ----------------------------------------------------------------------------
-- `supabase db reset` applies migrations BEFORE the seed, so `0034`'s backfill
-- found zero rows and did nothing — `0027`'s situation exactly. Section 5
-- re-performs the statement against the same table and the same function, over
-- rows written to look like the ones the backfill exists for.
--
-- ⚠️ THE STATEMENT THERE IS A COPY OF THE MIGRATION'S, and a copy is a thing
-- that can drift. It is written out in full rather than hidden behind a helper
-- so the drift is visible in a diff; the migration's own text is the authority.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated;

create function public.chk_raises(p_label text, p_sql text, p_expect text default null)
returns void language plpgsql as $$
declare v_state text;
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_state := sqlstate;
  perform public.chk(p_label,
                     p_expect is null or v_state = p_expect,
                     'sqlstate ' || v_state || coalesce(' (wanted ' || p_expect || ')', ''));
end;
$$;
grant execute on function public.chk_raises(text, text, text) to authenticated;

-- Who is calling. Set by its own statement, never inside a chk_raises string: a
-- caught exception rolls the GUC back with everything else the statement did.
create function public._as(p_user uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    case when p_user is null then null
                         else json_build_object('sub', p_user,
                                                'role', 'authenticated')::text end,
                    false);
  select null::void;
$$;

-- The name on a membership, by workspace and user. Every section reads it.
create function public._name(p_ws uuid, p_user uuid)
returns text language sql as $$
  select wm.display_name from public.workspace_member wm
   where wm.workspace_id = p_ws and wm.user_id = p_user;
$$;

create function public._role(p_ws uuid, p_user uuid)
returns text language sql as $$
  select wm.role::text from public.workspace_member wm
   where wm.workspace_id = p_ws and wm.user_id = p_user;
$$;


-- ---------------------------------------------------------------- fixture ----
-- ⚠️ THE METADATA IS THE POINT OF THIS FIXTURE. `0028` and `0029` insert
-- `auth.users` with an address and nothing else; every row here carries the
-- shape `5b.7` actually writes, including the two shapes that are NOT a name.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx',
     jsonb_build_object('full_name', 'Sergio Alarcón Pineda')),
  ('22222222-2222-2222-2222-222222222222', 'invitada@example.mx',
     jsonb_build_object('full_name', 'María del Carmen Rodríguez Gómez')),
  ('33333333-3333-3333-3333-333333333333', 'absorbida@example.mx',
     jsonb_build_object('full_name', 'Ana Lucía Ortiz')),
  ('44444444-4444-4444-4444-444444444444', 'pide@example.mx',
     jsonb_build_object('full_name', 'Jorge Iván Peña')),
  -- No metadata at all: an account made before 5b.7, or a provider that
  -- returned nothing. It must still be ADMITTED.
  ('55555555-5555-5555-5555-555555555555', 'sin.nombre@example.mx', '{}'::jsonb),
  -- Metadata whose name is whitespace. The state the column must never hold.
  ('66666666-6666-6666-6666-666666666666', 'en.blanco@example.mx',
     jsonb_build_object('full_name', '   ')),
  ('77777777-7777-7777-7777-777777777777', 'vuelve@example.mx',
     jsonb_build_object('full_name', 'Nombre Que Google Manda')),
  ('88888888-8888-8888-8888-888888888888', 'vuelve.dos@example.mx',
     jsonb_build_object('full_name', 'Google Dos')),
  ('99999999-9999-9999-9999-999999999999', 'vuelve.tres@example.mx',
     jsonb_build_object('full_name', 'Google Tres')),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hueco@example.mx',
     jsonb_build_object('full_name', 'Se Llena El Hueco')),
  -- A name under keys that are NOT the one Google writes. 6.1.
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'otra.llave@example.mx',
     jsonb_build_object('name', 'Bajo Otra Llave', 'display_name', 'Tampoco'));

\set u_owner   '''11111111-1111-1111-1111-111111111111'''
\set u_inv     '''22222222-2222-2222-2222-222222222222'''
\set u_abs     '''33333333-3333-3333-3333-333333333333'''
\set u_pide    '''44444444-4444-4444-4444-444444444444'''
\set u_nada    '''55555555-5555-5555-5555-555555555555'''
\set u_blanco  '''66666666-6666-6666-6666-666666666666'''
\set u_vuelve  '''77777777-7777-7777-7777-777777777777'''
\set u_dos     '''88888888-8888-8888-8888-888888888888'''
\set u_tres    '''99999999-9999-9999-9999-999999999999'''
\set u_hueco   '''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
\set u_llave   '''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'''

select public._as(:u_owner);
select onboard_workspace('Tienda A') as ws_a \gset
select public._as(null);

select code as code_a from public.workspace where id = :'ws_a' \gset
select id as loc_a1 from public.location where workspace_id = :'ws_a' \gset


-- ============================================================================
-- 1. The column, the constraint, the one reader, and the four writers
-- ============================================================================

select chk('1.1 workspace_member.display_name exists, is text, and is NULLABLE',
           (select data_type = 'text' and is_nullable = 'YES'
              from information_schema.columns
             where table_schema = 'public' and table_name = 'workspace_member'
               and column_name = 'display_name'),
           coalesce((select data_type || ' nullable=' || is_nullable
                       from information_schema.columns
                      where table_schema = 'public' and table_name = 'workspace_member'
                        and column_name = 'display_name'), 'NO SUCH COLUMN'));

select chk('1.2 the not-blank CHECK exists on workspace_member',
           exists (select 1 from pg_constraint
                    where conrelid = 'public.workspace_member'::regclass
                      and conname  = 'workspace_member_display_name_not_blank'));

-- The constraint, not a policy: run as the superuser on purpose, because a
-- CHECK is the one fence that does not care who is asking.
select public.chk_raises(
  '1.3 an EMPTY STRING name is refused — the state that renders as a gap',
  format('insert into public.workspace_member (workspace_id, user_id, role, display_name)
          values (%L, %L, ''staff'', '''')', :'ws_a', :u_llave),
  '23514');

select public.chk_raises(
  '1.4 a WHITESPACE-ONLY name is refused for the same reason',
  format('insert into public.workspace_member (workspace_id, user_id, role, display_name)
          values (%L, %L, ''staff'', ''   '')', :'ws_a', :u_llave),
  '23514');

select chk('1.5 auth_full_name is security definer with an empty search_path',
           (select prosecdef and proconfig @> array['search_path=""']
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname = 'auth_full_name'));

-- §2.7: auth.users is not exposed to a client. A definer function over it that
-- anybody could call is that exposure wearing a different shape, and EXECUTE is
-- granted to PUBLIC by default — so this reads the ACL rather than the migration.
select chk('1.6 auth_full_name is callable by NEITHER authenticated NOR anon',
           not has_function_privilege('authenticated', 'public.auth_full_name(uuid)', 'execute')
       and not has_function_privilege('anon',          'public.auth_full_name(uuid)', 'execute'));

-- The 0030 lesson: `create or replace` with a changed signature leaves the OLD
-- function standing beside the new one, and every client keeps calling the old
-- one while every behavioural check passes against the new one.
select chk('1.7 each of the four writers is exactly ONE function — no overload was created',
           (select count(*) = 4 from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('onboard_workspace', 'redeem_invite',
                               'request_access', 'approve_request')),
           (select string_agg(proname || '(' || pg_get_function_identity_arguments(oid) || ')', ' | ')
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('onboard_workspace', 'redeem_invite',
                               'request_access', 'approve_request')));

select chk('1.8 all four survived the replacement as security definer with an empty search_path, '
           'and their ACLs still admit authenticated and refuse anon',
           (select count(*) = 4 from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('onboard_workspace', 'redeem_invite',
                               'request_access', 'approve_request')
               and prosecdef
               and proconfig @> array['search_path=""'])
       and has_function_privilege('authenticated', 'public.onboard_workspace(text, boolean, text)', 'execute')
       and has_function_privilege('authenticated', 'public.redeem_invite(text)', 'execute')
       and has_function_privilege('authenticated', 'public.request_access(text)', 'execute')
       and has_function_privilege('authenticated', 'public.approve_request(uuid, uuid[])', 'execute')
       and not has_function_privilege('anon', 'public.onboard_workspace(text, boolean, text)', 'execute')
       and not has_function_privilege('anon', 'public.redeem_invite(text)', 'execute')
       and not has_function_privilege('anon', 'public.request_access(text)', 'execute')
       and not has_function_privilege('anon', 'public.approve_request(uuid, uuid[])', 'execute'));

-- ⚠️⚠️ See the header. This is the completeness assertion the split guard says
-- it cannot make, and the one that would have found R1 and R2 on the day they
-- were written rather than on the day this task was sized.
select chk('1.9 EXACTLY FOUR functions in public insert workspace_member, and they are these four',
           (select coalesce(array_agg(proname::text order by proname), '{}')
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and prosrc ~ 'insert\s+into\s+public\.workspace_member')
           = array['approve_request', 'onboard_workspace', 'redeem_invite', 'request_access']::text[],
           coalesce((select string_agg(proname, ', ' order by proname)
                       from pg_proc
                      where pronamespace = 'public'::regnamespace
                        and prosrc ~ 'insert\s+into\s+public\.workspace_member'), 'NONE'));


-- ============================================================================
-- 2. Four ways into a shop, four named members
-- ============================================================================

select chk('2.1 onboard_workspace — the owner who made the shop has her name',
           public._name(:'ws_a', :u_owner) = 'Sergio Alarcón Pineda',
           coalesce(public._name(:'ws_a', :u_owner), 'NULL'));

-- ---- the PUSH path -----------------------------------------------------
select public._as(:u_owner);
select public.create_invite(:'ws_a', 'invitada@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_inv \gset
select (:'r_inv'::jsonb->>'token') as tok_inv \gset

select public._as(:u_inv);
select public.redeem_invite(:'tok_inv') as redeemed \gset
select public._as(null);

select chk('2.2 redeem_invite — the invitee arrives named',
           public._name(:'ws_a', :u_inv) = 'María del Carmen Rodríguez Gómez',
           coalesce(public._name(:'ws_a', :u_inv), 'NULL'));

-- ---- D7: invited by email, types the CODE instead of the token ----------
-- ⚠️ R1. This path was named by no row until the applied schema was read, and
-- it is the one that reaches a pilot as two people in one shop with one of them
-- nameless and nothing able to explain why.
select public._as(:u_owner);
select public.create_invite(:'ws_a', 'absorbida@example.mx', 'manager',
                            '{}'::uuid[]) as r_abs \gset

select public._as(:u_abs);
select public.request_access(:'code_a') as absorbed \gset
select public._as(null);

select chk('2.3 request_access D7 — the absorbed invitee was LET IN, as manager',
           (:'absorbed'::jsonb->>'status') = 'joined'
       and public._role(:'ws_a', :u_abs) = 'manager',
           format('status=%s role=%s', (:'absorbed'::jsonb->>'status'),
                  coalesce(public._role(:'ws_a', :u_abs), 'NULL')));

select chk('2.3b request_access D7 — and she arrives NAMED, like the person beside her',
           public._name(:'ws_a', :u_abs) = 'Ana Lucía Ortiz',
           coalesce(public._name(:'ws_a', :u_abs), 'NULL'));

-- ---- the PULL path, and 5b-iii's own RPC -------------------------------
select public._as(:u_pide);
select public.request_access(:'code_a') as asked \gset
select (:'asked'::jsonb->>'request_id') as req_pide \gset

select public._as(:u_owner);
select public.approve_request(:'req_pide', array[:'loc_a1']::uuid[]) as approved \gset
select public._as(null);

select chk('2.4 approve_request — the approved joiner arrives named',
           (:'approved'::jsonb->>'status') = 'approved'
       and public._name(:'ws_a', :u_pide) = 'Jorge Iván Peña',
           format('status=%s name=%s', (:'approved'::jsonb->>'status'),
                  coalesce(public._name(:'ws_a', :u_pide), 'NULL')));

-- ⚠️⚠️ THE ONLY PLACE IN THIS SCHEMA WHERE THE CALLER AND THE MEMBER ARE TWO
-- DIFFERENT PEOPLE. A version of this writer that read auth.uid() — which is
-- what "the caller's own metadata" would mean — stamps the OWNER's name onto
-- every person she approves, and 2.4 alone would not notice, because it would
-- be a name and it would not be null.
select chk('2.5 …and the name is the JOINER''s, not the APPROVER''s',
           public._name(:'ws_a', :u_pide) <> public._name(:'ws_a', :u_owner),
           format('joiner=%s approver=%s',
                  coalesce(public._name(:'ws_a', :u_pide), 'NULL'),
                  coalesce(public._name(:'ws_a', :u_owner), 'NULL')));


-- ============================================================================
-- 3. "Keep what they typed" — the owner's ruling of 2026-09-18
-- ============================================================================
-- Each of the three update branches is walked with a name a person has already
-- corrected. ⚠️ Every one of them also REQUIRES THE ROLE TO CHANGE, so a check
-- that passed because the branch was never reached would fail instead.

-- ---- 3.1 redeem_invite's update branch ---------------------------------
insert into public.workspace_member (workspace_id, user_id, role, display_name)
values (:'ws_a', :u_vuelve, 'staff', 'Nombre Corregido A Mano');

select public._as(:u_owner);
select public.create_invite(:'ws_a', 'vuelve@example.mx', 'manager',
                            '{}'::uuid[]) as r_vuelve \gset
select (:'r_vuelve'::jsonb->>'token') as tok_vuelve \gset

select public._as(:u_vuelve);
select public.redeem_invite(:'tok_vuelve') as re_redeemed \gset
select public._as(null);

select chk('3.1 redeem_invite UPDATE — the role moved to manager and the corrected name STAYED',
           (:'re_redeemed'::jsonb->>'membership_existed')::boolean
       and public._role(:'ws_a', :u_vuelve) = 'manager'
       and public._name(:'ws_a', :u_vuelve) = 'Nombre Corregido A Mano',
           format('existed=%s role=%s name=%s',
                  (:'re_redeemed'::jsonb->>'membership_existed'),
                  coalesce(public._role(:'ws_a', :u_vuelve), 'NULL'),
                  coalesce(public._name(:'ws_a', :u_vuelve), 'NULL')));

-- ---- 3.2 request_access D7's update branch -----------------------------
-- Inactive, or request_access returns `already_member` before reaching D7.
insert into public.workspace_member (workspace_id, user_id, role, display_name, is_active)
values (:'ws_a', :u_dos, 'staff', 'Corregido Dos', false);

select public._as(:u_owner);
select public.create_invite(:'ws_a', 'vuelve.dos@example.mx', 'manager',
                            '{}'::uuid[]) as r_dos \gset

select public._as(:u_dos);
select public.request_access(:'code_a') as re_absorbed \gset
select public._as(null);

select chk('3.2 request_access D7 UPDATE — reactivated as manager, corrected name STAYED',
           (:'re_absorbed'::jsonb->>'status') = 'joined'
       and public._role(:'ws_a', :u_dos) = 'manager'
       and public._name(:'ws_a', :u_dos) = 'Corregido Dos',
           format('status=%s role=%s name=%s', (:'re_absorbed'::jsonb->>'status'),
                  coalesce(public._role(:'ws_a', :u_dos), 'NULL'),
                  coalesce(public._name(:'ws_a', :u_dos), 'NULL')));

-- ---- 3.3 approve_request's update branch -------------------------------
insert into public.workspace_member (workspace_id, user_id, role, display_name, is_active)
values (:'ws_a', :u_tres, 'manager', 'Corregido Tres', false);

select public._as(:u_tres);
select public.request_access(:'code_a') as asked_tres \gset
select (:'asked_tres'::jsonb->>'request_id') as req_tres \gset

select public._as(:u_owner);
select public.approve_request(:'req_tres', array[:'loc_a1']::uuid[]) as appr_tres \gset
select public._as(null);

select chk('3.3 approve_request UPDATE — reactivated at the request''s role, corrected name STAYED',
           (:'appr_tres'::jsonb->>'status') = 'approved'
       and public._role(:'ws_a', :u_tres) = 'staff'
       and public._name(:'ws_a', :u_tres) = 'Corregido Tres',
           format('status=%s role=%s name=%s', (:'appr_tres'::jsonb->>'status'),
                  coalesce(public._role(:'ws_a', :u_tres), 'NULL'),
                  coalesce(public._name(:'ws_a', :u_tres), 'NULL')));

-- ---- 3.4 …and the same branch FILLS A HOLE -----------------------------
-- ⚠️ Without this, "keep what they typed" degrades into "never write on update"
-- and every membership made before 0034 stays nameless forever.
insert into public.workspace_member (workspace_id, user_id, role, display_name, is_active)
values (:'ws_a', :u_hueco, 'manager', null, false);

select public._as(:u_hueco);
select public.request_access(:'code_a') as asked_hueco \gset
select (:'asked_hueco'::jsonb->>'request_id') as req_hueco \gset

select public._as(:u_owner);
select public.approve_request(:'req_hueco', array[:'loc_a1']::uuid[]) as appr_hueco \gset
select public._as(null);

select chk('3.4 the SAME update branch fills a NULL name — the rule is coalesce, not never-write',
           public._name(:'ws_a', :u_hueco) = 'Se Llena El Hueco',
           coalesce(public._name(:'ws_a', :u_hueco), 'NULL'));


-- ============================================================================
-- 4. An account with no name is still ADMITTED
-- ============================================================================
-- The floor 5b-ii-a's identity ladder already handles. A migration that made
-- the column mandatory would have turned "we do not know your name" into "you
-- cannot open the app", which is this project's standing rule about never
-- handing a shopkeeper an internal state, facing the wrong way.

select public._as(:u_nada);
select onboard_workspace('Tienda Sin Nombre') as ws_n \gset
select public._as(null);

select chk('4.1 onboard_workspace with EMPTY metadata — the shop exists and the member is NULL, not refused',
           (select count(*) = 1 from public.workspace_member
             where workspace_id = :'ws_n' and user_id = :u_nada)
       and public._name(:'ws_n', :u_nada) is null,
           coalesce(public._name(:'ws_n', :u_nada), 'NULL'));

select public._as(:u_owner);
select public.create_invite(:'ws_a', 'en.blanco@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_blanco \gset
select (:'r_blanco'::jsonb->>'token') as tok_blanco \gset

select public._as(:u_blanco);
select public.redeem_invite(:'tok_blanco') as redeemed_blanco \gset
select public._as(null);

select chk('4.2 redeem_invite with a WHITESPACE-ONLY name — admitted, and stored as NULL not ''''',
           (select count(*) = 1 from public.workspace_member
             where workspace_id = :'ws_a' and user_id = :u_blanco)
       and public._name(:'ws_a', :u_blanco) is null,
           coalesce(quote_literal(public._name(:'ws_a', :u_blanco)), 'NULL'));

select chk('4.3 auth_full_name returns NULL for no metadata, for whitespace, and for an unknown user, '
           'and the name for a real one',
           public.auth_full_name(:u_nada) is null
       and public.auth_full_name(:u_blanco) is null
       and public.auth_full_name('cccccccc-cccc-cccc-cccc-cccccccccccc') is null
       and public.auth_full_name(:u_owner) = 'Sergio Alarcón Pineda');


-- ============================================================================
-- 5. The backfill — ⚠️ THE PART THE GREEN RUN DOES NOT WATCH
-- ============================================================================
-- See the header. The statement below is a COPY of `0034` section 3, run over
-- rows written to look like the ones that exist on a database the migration has
-- not reached yet: memberships with no name, some of whose users have one.

select public._as(:u_owner);
select onboard_workspace('Tienda Backfill') as ws_bf \gset
select public._as(null);

do $$
declare i int; v_id uuid;
begin
  for i in 1..20 loop
    v_id := gen_random_uuid();
    insert into auth.users (id, email, raw_user_meta_data)
    values (v_id, 'backfill' || i || '@example.mx',
            jsonb_build_object('full_name', 'Persona ' || i));
    insert into public.workspace_member (workspace_id, user_id, role, display_name)
    values ((select id from public.workspace where display_name = 'Tienda Backfill'),
            v_id, 'staff', null);
  end loop;

  -- Two who have no name to find, and must survive the backfill as NULL.
  for i in 21..22 loop
    v_id := gen_random_uuid();
    insert into auth.users (id, email, raw_user_meta_data)
    values (v_id, 'backfill' || i || '@example.mx', '{}'::jsonb);
    insert into public.workspace_member (workspace_id, user_id, role, display_name)
    values ((select id from public.workspace where display_name = 'Tienda Backfill'),
            v_id, 'staff', null);
  end loop;

  -- And one who already has a corrected name. The backfill must not reach it.
  v_id := gen_random_uuid();
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, 'backfill23@example.mx',
          jsonb_build_object('full_name', 'Lo Que Manda Google'));
  insert into public.workspace_member (workspace_id, user_id, role, display_name)
  values ((select id from public.workspace where display_name = 'Tienda Backfill'),
          v_id, 'staff', 'No Me Toques');
end;
$$;

-- ⚠️ A COPY of `0034` section 3. If these two statements ever differ, the
-- migration is the authority and this file is the bug.
update public.workspace_member wm
   set display_name = public.auth_full_name(wm.user_id)
 where wm.display_name is null;

select chk('5.1 all 20 pre-existing memberships whose user has a name got exactly that name',
           (select count(*) from public.workspace_member wm
              join auth.users u on u.id = wm.user_id
             where wm.workspace_id = :'ws_bf'
               and u.email like 'backfill%@example.mx'
               and wm.display_name = u.raw_user_meta_data ->> 'full_name') = 20,
           format('matched=%s of 20',
                  (select count(*) from public.workspace_member wm
                     join auth.users u on u.id = wm.user_id
                    where wm.workspace_id = :'ws_bf'
                      and u.email like 'backfill%%@example.mx'
                      and wm.display_name = u.raw_user_meta_data ->> 'full_name')));

select chk('5.2 the two with no metadata are still NULL — a backfill invents nothing',
           (select count(*) from public.workspace_member wm
              join auth.users u on u.id = wm.user_id
             where wm.workspace_id = :'ws_bf'
               and u.email in ('backfill21@example.mx', 'backfill22@example.mx')
               and wm.display_name is null) = 2);

select chk('5.3 the corrected name was NOT overwritten — the write rule holds in the one-shot too',
           (select wm.display_name from public.workspace_member wm
              join auth.users u on u.id = wm.user_id
             where wm.workspace_id = :'ws_bf'
               and u.email = 'backfill23@example.mx') = 'No Me Toques');

select chk('5.4 no membership anywhere is left with a name it should have had',
           not exists (
             select 1 from public.workspace_member wm
              join auth.users u on u.id = wm.user_id
             where wm.display_name is null
               and nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '') is not null),
           format('holes=%s',
                  (select count(*) from public.workspace_member wm
                     join auth.users u on u.id = wm.user_id
                    where wm.display_name is null
                      and nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '') is not null)));


-- ============================================================================
-- 6. The key is `full_name`, and it is not a name this project chose
-- ============================================================================
-- Google's provider writes `full_name`, so `5b.7`'s email door writes
-- `full_name`, so this reads `full_name` — one reader for both ways in rather
-- than a branch on which button somebody tapped months earlier. A check that
-- read `name` or `display_name` instead would look equally reasonable, and
-- half the pilot's members would be nameless.

select public._as(:u_owner);
select public.create_invite(:'ws_a', 'otra.llave@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_llave \gset
select (:'r_llave'::jsonb->>'token') as tok_llave \gset

select public._as(:u_llave);
select public.redeem_invite(:'tok_llave') as redeemed_llave \gset
select public._as(null);

select chk('6.1 a name under `name` or `display_name` is NOT read — only `full_name` is',
           public.auth_full_name(:u_llave) is null
       and public._name(:'ws_a', :u_llave) is null,
           coalesce(public._name(:'ws_a', :u_llave), 'NULL'));


-- ============================================================================
-- 7. ⚠️⚠️ WHO CAN READ IT — measured under the role a phone actually holds
-- ============================================================================
-- ✅✅ RULED 2026-09-18: THE NAME IS MEMBER-LEVEL, AND THAT IS A DECISION RATHER
-- THAN AN OVERSIGHT. This section exists because the decision is INVISIBLE in
-- the migration: `0034` moves no policy, so nothing in the diff says who the
-- column reaches, and the honest reading of "no policy change" is easy to get
-- backwards.
--
-- ⚠️ THE SCREEN AND THE POLICY ARE FENCED DIFFERENTLY, AND THEY ALWAYS WERE.
-- `workspace_member_select` (`0001:532`) is `workspace_id in (select
-- public.my_workspaces())` — ANY active member — while the roster SHEET is
-- manager-and-above by the owner's ruling of 2026-09-18, enforced in
-- `canSeeRoster` in `app/src/api/members.ts`. Before `0034` that gap was
-- harmless: a staff caller reading this table got uuids and, in that file's own
-- words, "could identify NOBODY on it". ⚠️ **After `0034` the same read carries
-- names.** So the gap did not move — what moved through it did.
--
-- ⚠️⚠️ WHY IT WAS NOT FENCED, recorded here because the alternative looks cheap
-- and is not. Postgres has no column-level RLS, so the three available moves are
-- (a) a column GRANT — which §2.7 argues against BY NAME, because
-- `supabase gen types` still emits the column and a staff read then compiles
-- clean and fails at runtime in front of a customer; (b) a second view, which is
-- a second copy of the roster and this repository's most-recorded defect; or
-- (c) narrowing `workspace_member_select` itself, which is the read behind every
-- member's own role lookup and `rosterFrom`'s join. All three are a migration
-- with blast radius, bought to hide a coworker's first name from somebody
-- standing at the same counter who can simply ask.
--
-- ⚠️ THE BOUNDARY THAT ACTUALLY MATTERS IS THE TENANT ONE, and 7.2 is it.

select public._as(:u_pide);
set role authenticated;

select chk('7.1 a STAFF member reads her coworkers'' names — the recorded ruling, not an oversight',
           (select count(*) from public.workspace_member wm
             where wm.workspace_id = :'ws_a' and wm.display_name is not null) >= 2
       and (select wm.display_name from public.workspace_member wm
             where wm.workspace_id = :'ws_a' and wm.user_id = :u_owner) = 'Sergio Alarcón Pineda',
           format('a cashier sees %s named member(s) in her own shop, the owner among them',
                  (select count(*) from public.workspace_member wm
                    where wm.workspace_id = :'ws_a' and wm.display_name is not null)));

-- ⚠️ THE ONE A WIDENED POLICY WOULD BREAK. `my_workspaces()` is the whole fence,
-- and a name is exactly the payload that would make crossing it matter.
select chk('7.2 …and ZERO rows from a workspace she is not in — no name crosses a tenant',
           (select count(*) from public.workspace_member wm
             where wm.workspace_id = :'ws_n') = 0,
           format('rows visible from another shop: %s',
                  (select count(*) from public.workspace_member wm
                    where wm.workspace_id = :'ws_n')));

reset role;
select public._as(null);

-- Pinned from the catalog rather than from the migration: `0034` claims to move
-- no policy, and this is that claim. A later session narrowing or widening this
-- is then a visible decision instead of a quiet one.
select chk('7.3 workspace_member has exactly ONE select policy and 0034 did not touch it',
           (select count(*) from pg_policies
             where schemaname = 'public' and tablename = 'workspace_member'
               and cmd = 'SELECT') = 1
       and (select qual from pg_policies
             where schemaname = 'public' and tablename = 'workspace_member'
               and cmd = 'SELECT') = '(workspace_id IN ( SELECT my_workspaces() AS my_workspaces))',
           coalesce((select policyname || ': ' || qual from pg_policies
                      where schemaname = 'public' and tablename = 'workspace_member'
                        and cmd = 'SELECT'), 'NO SELECT POLICY'));


-- ============================================================================
-- 8. Did this file actually run?
-- ============================================================================
-- A green tick is also what a step that ran nothing looks like, and a suite
-- that silently SHRANK is the third shape. Only a pinned count catches it.

select chk('8.1 ALL 31 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 30,
           format('recorded=%s of 30 before this one',
                  (select count(*) from public._verify)));

drop function public._name(uuid, uuid);
drop function public._role(uuid, uuid);


-- ---------------------------------------------------------------- report -----
\pset border 2
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
  from public._verify order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from public._verify where passed is not true;
  if v_failed > 0 then
    raise exception '% behavioural check(s) FAILED — see the table above', v_failed;
  end if;
  raise notice 'all % checks passed', (select count(*) from public._verify);
end;
$$;
