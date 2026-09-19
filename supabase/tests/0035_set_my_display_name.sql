-- ============================================================================
-- Behavioural verification for 0035 — a person fixes their OWN name
-- ============================================================================
-- ADR-035 §2.3, §2.7, §9. docs/PLAN.md task 5b.8-iii-a.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0035_set_my_display_name.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED, AND WHY IT NEEDS NO CLIENT
-- ----------------------------------------------------------------------------
-- `5b.8-iii` is two tasks: this one builds the repair path in the database and
-- `5b.8-iii-b` builds the control a person touches. The half loop is deliberate
-- and what makes it safe is that this half is falsifiable on its own — five
-- people, three roles, two shops, and every refusal made under `set role
-- authenticated` rather than as the superuser who bypasses RLS entirely.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SECTION 5 IS THE ONE THAT SAYS WHY THIS IS A FUNCTION AND NOT A POLICY
-- ----------------------------------------------------------------------------
-- The whole task rests on a claim about the APPLIED schema: that a manager
-- cannot edit the row describing her, because `workspace_member_update`
-- (`0001:532`) is `has_role(workspace_id, 'owner')`. That claim is the reason
-- `0035` exists, and it was read out of a migration file — which ADR-035 §9
-- says is not evidence. 5.2 MEASURES it: a manager, under `set role
-- authenticated`, updating her own `display_name` directly, and counting the
-- rows she moved. It is zero. 5.3 is the same person reaching for `role`, which
-- is what a "you may update your own row" policy would have handed her.
--
-- ⚠️ 5.2 GOING GREEN BY ACCIDENT IS THE RISK, because an update that matches no
-- row and an update that is refused look alike from a row count. 2.3 is the
-- control: the SAME manager, the SAME row, through the function, and the name
-- changes. One of the two must be the fence.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SECTION 6 IS THE CENSUS, AND IT IS `0034` SECTION 1.9's OTHER HALF
-- ----------------------------------------------------------------------------
-- `0034` 1.9 pins the set of functions that INSERT `workspace_member`, because
-- that task was sized against a row naming two writers when the schema had
-- four. Nothing pinned the UPDATERS, and the owner's ruling of 2026-09-18 —
-- "keep what they typed" — lives entirely in those. 6.1 pins the set. 6.2 is
-- the rule itself, read out of `pg_proc.prosrc`: three writers may only fill a
-- hole (`coalesce(display_name, ...)`) and exactly one may replace a name.
--
-- ⚠️ A later session that adds a fifth updater, or that drops a `coalesce`,
-- lands red here — in the suite named after the function whose whole argument
-- is that it is the ONE exception.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS FILE CANNOT SEE
-- ----------------------------------------------------------------------------
-- Nothing about the screen: `5b.8-iii-b` ships the control, its strings and its
-- contract check. And nothing about whether the WORKSPACE-SCOPED signature is
-- the shape the owner wants — 3.4 measures the consequence (a name fixed in one
-- shop is not fixed in the other) so the bill is visible, but the choice is a
-- decision recorded in `docs/PLAN.md` and in `0035`'s header, not a check.
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

-- ⚠️ `0030`'s helper at its EXACT signature, so `_cleanup.sql` already drops it —
-- the rule `4f` wrote after five falsifications in a row died on "function
-- already exists" instead of on the defect they injected. It is here for ONE
-- assertion, 4.10, and that is deliberate: two of this function's refusals share
-- the sqlstate `42501` and differ only in what they SAY, and the difference is
-- the one `5b.8-iii-b` has to show a person — "sign in again" is not "this is
-- not your shop". A falsification found that: removing the authenticated-caller
-- guard entirely turned NOTHING red while the check asserted only the state.
create function public.chk_raises_like(p_label text, p_sql text,
                                       p_state text, p_msg text)
returns void language plpgsql as $$
declare v_state text; v_msg text;
begin
  execute p_sql;
  perform public.chk(p_label, false, 'no exception raised');
exception when others then
  v_state := sqlstate; v_msg := sqlerrm;
  perform public.chk(p_label, v_state = p_state and v_msg like '%' || p_msg || '%',
                     format('sqlstate %s / %L', v_state, v_msg));
end;
$$;
grant execute on function
  public.chk_raises_like(text, text, text, text) to authenticated;

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

-- The name and the role on a membership, by workspace and user. Every section
-- reads both, because "the name changed" and "nothing else did" are one claim.
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

-- The applied body of a function, read from the catalog rather than from the
-- migration file — ADR-035 §9, and `0030`'s helper at the same signature so
-- `_cleanup.sql` already drops it.
create function public._src(p_name text)
returns text language sql stable as $$
  select string_agg(p.prosrc, E'\n') from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = p_name
$$;


-- ---------------------------------------------------------------- fixture ----
-- ⚠️ THE METADATA SHAPES ARE THE POINT, as they were in `0034`. `u_una` is the
-- account this whole task exists for: a Google sign-in that returned ONE WORD,
-- which is now on the roster in front of everybody and which she cannot change.
-- `u_nada` returned nothing at all and arrives with a NULL name — the other
-- half of the same gap.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'duena.a@example.mx',
     jsonb_build_object('full_name', 'Sergio Alarcón Pineda')),
  ('22222222-2222-2222-2222-222222222222', 'gerenta@example.mx',
     jsonb_build_object('full_name', 'María del Carmen Rodríguez Gómez')),
  -- ONE WORD. The live gap: on the roster, unfixable before this migration.
  ('33333333-3333-3333-3333-333333333333', 'una.palabra@example.mx',
     jsonb_build_object('full_name', 'Lupita')),
  -- No metadata at all. Admitted by `0034`'s nullable column, nameless.
  ('44444444-4444-4444-4444-444444444444', 'sin.nombre@example.mx', '{}'::jsonb),
  -- Joins shop A and is then deactivated. She must be refused.
  ('55555555-5555-5555-5555-555555555555', 'ya.no@example.mx',
     jsonb_build_object('full_name', 'Ya No Trabaja Aquí')),
  -- A different shop entirely, and never a member of A.
  ('66666666-6666-6666-6666-666666666666', 'duena.b@example.mx',
     jsonb_build_object('full_name', 'Dueña De La Otra')),
  -- A member of BOTH shops. 3.4 is her, and she is the scoping decision.
  ('77777777-7777-7777-7777-777777777777', 'las.dos@example.mx',
     jsonb_build_object('full_name', 'Trabaja En Las Dos'));

\set u_duena  '''11111111-1111-1111-1111-111111111111'''
\set u_ger    '''22222222-2222-2222-2222-222222222222'''
\set u_una    '''33333333-3333-3333-3333-333333333333'''
\set u_nada   '''44444444-4444-4444-4444-444444444444'''
\set u_baja   '''55555555-5555-5555-5555-555555555555'''
\set u_duenab '''66666666-6666-6666-6666-666666666666'''
\set u_dos    '''77777777-7777-7777-7777-777777777777'''

select public._as(:u_duena);
select onboard_workspace('Tienda A') as ws_a \gset
select public._as(:u_duenab);
select onboard_workspace('Tienda B') as ws_b \gset
select public._as(null);

select id as loc_a1 from public.location where workspace_id = :'ws_a' \gset
select id as loc_b1 from public.location where workspace_id = :'ws_b' \gset

-- Four people into shop A by the PUSH path, at three different roles, so every
-- assertion below is about the role fence and never about a missing location.
select public._as(:u_duena);
select public.create_invite(:'ws_a', 'gerenta@example.mx', 'manager',
                            array[:'loc_a1']::uuid[]) as r_ger \gset
select public.create_invite(:'ws_a', 'una.palabra@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_una \gset
select public.create_invite(:'ws_a', 'sin.nombre@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_nada \gset
select public.create_invite(:'ws_a', 'ya.no@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_baja \gset
select public.create_invite(:'ws_a', 'las.dos@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_dos \gset

select (:'r_ger'::jsonb->>'token')  as t_ger  \gset
select (:'r_una'::jsonb->>'token')  as t_una  \gset
select (:'r_nada'::jsonb->>'token') as t_nada \gset
select (:'r_baja'::jsonb->>'token') as t_baja \gset
select (:'r_dos'::jsonb->>'token')  as t_dos  \gset

select public._as(:u_ger);    select public.redeem_invite(:'t_ger')  as x \gset
select public._as(:u_una);    select public.redeem_invite(:'t_una')  as x \gset
select public._as(:u_nada);   select public.redeem_invite(:'t_nada') as x \gset
select public._as(:u_baja);   select public.redeem_invite(:'t_baja') as x \gset
select public._as(:u_dos);    select public.redeem_invite(:'t_dos')  as x \gset

-- …and the same person into shop B as well. `my_workspaces()` is set-returning
-- from day one (`0001:304`) and this is the row that makes 3.4 possible.
select public._as(:u_duenab);
select public.create_invite(:'ws_b', 'las.dos@example.mx', 'staff',
                            array[:'loc_b1']::uuid[]) as r_dosb \gset
select (:'r_dosb'::jsonb->>'token') as t_dosb \gset
select public._as(:u_dos);
select public.redeem_invite(:'t_dosb') as x \gset
select public._as(null);

-- The deactivation, as the superuser: this is fixture, not a claim about who
-- may deactivate whom.
update public.workspace_member
   set is_active = false
 where workspace_id = :'ws_a' and user_id = :u_baja;


-- ============================================================================
-- 1. The function's shape, and who can reach it
-- ============================================================================

select chk('1.1 set_my_display_name(uuid, text) exists and returns text',
           (select count(*) from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'set_my_display_name'
               and pg_get_function_identity_arguments(p.oid) = 'p_workspace_id uuid, p_display_name text'
               and pg_get_function_result(p.oid) = 'text') = 1,
           coalesce((select string_agg(pg_get_function_identity_arguments(p.oid)
                                       || ' -> ' || pg_get_function_result(p.oid), ' | ')
                       from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname = 'set_my_display_name'), 'NO SUCH FUNCTION'));

-- ⚠️ AGGREGATED, NOT A BARE SUBQUERY, AND THAT IS A FALSIFICATION FINDING. The
-- scalar form raised "more than one row returned by a subquery" the moment F13
-- put an overload beside the function — which ABORTS the file, so 1.3, the check
-- written for exactly that defect, never got to record a FAIL. An aborted suite
-- prints no FAIL rows, and this repository has already recorded that shape
-- scoring GREEN. Every structural check in section 1 aggregates for this reason.
select chk('1.2 it is security definer with an EMPTY search_path',
           (select count(*) = 1 from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'set_my_display_name'
               and p.prosecdef
               and p.proconfig @> array['search_path=""']),
           coalesce((select string_agg('secdef=' || p.prosecdef || ' config=' ||
                                       coalesce(array_to_string(p.proconfig, ','), 'NONE'), ' | ')
                       from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname = 'set_my_display_name'), 'NO SUCH FUNCTION'));

-- ⚠️ THE OVERLOAD CASE, which `0034` section 1 added after `0030` found it: a
-- changed signature leaves the old function standing beside the new one and
-- every client keeps calling the old one, while every behavioural check passes.
select chk('1.3 EXACTLY ONE set_my_display_name exists — no overload standing beside it',
           (select count(*) from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'set_my_display_name') = 1,
           format('%s function(s) named set_my_display_name',
                  (select count(*) from pg_proc p
                    where p.pronamespace = 'public'::regnamespace
                      and p.proname = 'set_my_display_name')));

-- ⚠️ `revoke ... from public` is what makes the `anon` half of this true.
-- Revoking `anon` and `authenticated` by name would leave PUBLIC's default
-- standing and this check would go red — `0027`'s G1.
select chk('1.4 authenticated may execute it, anon may NOT, and PUBLIC holds nothing',
           has_function_privilege('authenticated', 'public.set_my_display_name(uuid, text)', 'execute')
       and not has_function_privilege('anon', 'public.set_my_display_name(uuid, text)', 'execute')
           -- PUBLIC appears in an ACL as an entry with an EMPTY grantee — `=X/postgres`.
           -- A revoke spelled `from anon, authenticated` leaves exactly that entry
           -- standing, and both privilege checks above would still read as written.
       and (select count(*) = 1 from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'set_my_display_name'
               and p.proacl is not null
               and p.proacl::text !~ '(\{|,)='),
           -- ⚠️ THE DETAIL AGGREGATES TOO. It is not decoration: a scalar
           -- subquery here aborts the whole FILE on the overload case, which is
           -- the abort-instead-of-FAIL shape 1.2's note describes. The detail
           -- column is as capable of killing a suite as the condition is.
           coalesce((select string_agg(p.proacl::text, ' | ') from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname = 'set_my_display_name'), 'NULL ACL'));

-- ⚠️⚠️ THE STRUCTURAL HALF OF "ONE COLUMN". Section 3 measures that `role` did
-- not move on the rows this suite touches; this reads the applied body and says
-- no call could ever move it, which is the claim the header actually makes.
select chk('1.5 the applied body SETS display_name and names no other column',
           public._src('set_my_display_name') ~ 'set\s+display_name\s*=' 
       and public._src('set_my_display_name') !~ 'set\s+display_name[^;]*,\s*\w+\s*='
       and public._src('set_my_display_name') !~ '\mrole\s*=',
           'body length ' || length(public._src('set_my_display_name')));


-- ============================================================================
-- 2. The repair itself, under `set role authenticated`
-- ============================================================================
-- ⚠️ EVERY CALL BELOW RUNS AS `authenticated`. As the superuser the function
-- would work for reasons that tell us nothing: RLS is bypassed, the grant is
-- irrelevant, and a fence that does not exist passes vacuously.

select public._as(:u_una);
set role authenticated;

select chk('2.1 a STAFF member with a one-word name fixes it — the live gap this exists for',
           public.set_my_display_name(:'ws_a', 'Guadalupe Hernández Solís')
             is not null,
           'called as the staff member');

reset role;
select chk('2.2 …and the STORED row carries the new name, not the old one',
           public._name(:'ws_a', :u_una) = 'Guadalupe Hernández Solís',
           coalesce(public._name(:'ws_a', :u_una), 'NULL'));

-- ⚠️ THE RETURN IS PART OF THE CONTRACT. `5b.8-iii-b` renders what came back
-- rather than what it sent, so a divergence between the two is a screen showing
-- a name the database does not hold.
select public._as(:u_nada);
set role authenticated;
select public.set_my_display_name(:'ws_a', '  Ana   Sofía Márquez  ') as ret_nada \gset
reset role;

select chk('2.3 the RETURN equals the STORED value, and both are the TRIMMED form',
           :'ret_nada' = 'Ana   Sofía Márquez'
       and public._name(:'ws_a', :u_nada) = 'Ana   Sofía Márquez',
           format('returned %L, stored %L', :'ret_nada',
                  coalesce(public._name(:'ws_a', :u_nada), 'NULL')));

select chk('2.4 …and the member who arrived NAMELESS now has a name',
           public._name(:'ws_a', :u_nada) is not null,
           coalesce(public._name(:'ws_a', :u_nada), 'STILL NULL'));

-- ⚠️⚠️ THE CONTROL FOR 5.2. This is the same person and the same row that the
-- direct update cannot touch. If this were to fail, 5.2's zero rows would mean
-- "the row was not there" rather than "the policy refused her".
select public._as(:u_ger);
set role authenticated;
select public.set_my_display_name(:'ws_a', 'María Rodríguez') as ret_ger \gset
reset role;

select chk('2.5 a MANAGER fixes her own name — the role owner-only RLS locks out',
           public._name(:'ws_a', :u_ger) = 'María Rodríguez',
           coalesce(public._name(:'ws_a', :u_ger), 'NULL'));

select public._as(:u_duena);
set role authenticated;
select public.set_my_display_name(:'ws_a', 'Sergio Alarcón') as ret_duena \gset
reset role;

select chk('2.6 an OWNER fixes hers too — this is not a fence with a hole for the top role',
           public._name(:'ws_a', :u_duena) = 'Sergio Alarcón',
           coalesce(public._name(:'ws_a', :u_duena), 'NULL'));

-- ⚠️⚠️ THE ONE EXCEPTION TO THE OWNER'S RULING OF 2026-09-18, stated as a
-- measurement. Every membership writer may only FILL a hole; this one REPLACES
-- a name that is already there, because the caller is the person it is about.
-- 2.1 and 2.5 already overwrote non-null names — this says so by name, so a
-- later session cannot read "keep what they typed" and add a `coalesce` here.
select chk('2.7 it OVERWRITES a non-null name — the one writer the 2026-09-18 rule exempts',
           public._name(:'ws_a', :u_duena) = 'Sergio Alarcón'
       and public._name(:'ws_a', :u_duena) <> 'Sergio Alarcón Pineda',
           coalesce(public._name(:'ws_a', :u_duena), 'NULL'));


-- ============================================================================
-- 3. …and nothing else moves
-- ============================================================================

select chk('3.1 the manager''s ROLE is untouched by the call that renamed her',
           public._role(:'ws_a', :u_ger) = 'manager',
           coalesce(public._role(:'ws_a', :u_ger), 'NULL'));

select chk('3.2 the staff member''s ROLE is untouched too — no path from a name to a promotion',
           public._role(:'ws_a', :u_una) = 'staff'
       and public._role(:'ws_a', :u_nada) = 'staff',
           format('una=%s nada=%s', public._role(:'ws_a', :u_una),
                  public._role(:'ws_a', :u_nada)));

select chk('3.3 is_active is untouched by every call this section made',
           (select bool_and(wm.is_active) from public.workspace_member wm
             where wm.workspace_id = :'ws_a'
               and wm.user_id in (:u_duena, :u_ger, :u_una, :u_nada)),
           format('%s of 4 still active',
                  (select count(*) filter (where wm.is_active)
                     from public.workspace_member wm
                    where wm.workspace_id = :'ws_a'
                      and wm.user_id in (:u_duena, :u_ger, :u_una, :u_nada))));

-- ⚠️ ONE ROW, NOT A SHOP. `p_workspace_id` scopes the write and `auth.uid()`
-- picks the row; neither is a set.
select chk('3.4 another member''s row in the same shop is untouched',
           public._name(:'ws_a', :u_dos) = 'Trabaja En Las Dos',
           coalesce(public._name(:'ws_a', :u_dos), 'NULL'));

-- ⚠️⚠️ THE WORKSPACE-SCOPING DECISION, MEASURED RATHER THAN ARGUED — see
-- `0035`'s header and `docs/PLAN.md` 5b.8-iii-a. She fixes her name in shop A;
-- shop B still holds the old one and she is not told. That is the bill the
-- scoped signature buys, and it is here so the owner can see the price of the
-- decision taken on his behalf rather than read about it.
select public._as(:u_dos);
set role authenticated;
select public.set_my_display_name(:'ws_a', 'Trabaja En Las Dos, Corregido') as ret_dos \gset
reset role;

select chk('3.5 a name fixed in ONE shop is NOT fixed in the other — the scoped signature''s cost',
           public._name(:'ws_a', :u_dos) = 'Trabaja En Las Dos, Corregido'
       and public._name(:'ws_b', :u_dos) = 'Trabaja En Las Dos',
           format('A=%L B=%L', public._name(:'ws_a', :u_dos),
                  public._name(:'ws_b', :u_dos)));

-- ⚠️ THE ANTI-VACUITY CHECK FOR THIS SECTION. 3.1–3.4 all assert that something
-- did NOT change, and they would all pass against a function that did nothing
-- at all. `updated_at` moving is the proof the row was written.
select chk('3.6 updated_at DID move on every row this suite renamed — 3.1–3.4 are not vacuous',
           (select count(*) from public.workspace_member wm
             where wm.workspace_id = :'ws_a'
               and wm.user_id in (:u_duena, :u_ger, :u_una, :u_nada, :u_dos)
               and wm.updated_at > wm.created_at) = 5,
           format('%s of 5 rows have updated_at > created_at',
                  (select count(*) from public.workspace_member wm
                    where wm.workspace_id = :'ws_a'
                      and wm.user_id in (:u_duena, :u_ger, :u_una, :u_nada, :u_dos)
                      and wm.updated_at > wm.created_at)));


-- ============================================================================
-- 4. The refusals, every one of them as `authenticated`
-- ============================================================================

select public._as(:u_duenab);
set role authenticated;

-- ⚠️ SHE IS A REAL, ACTIVE OWNER — of the OTHER shop. The refusal must be about
-- the membership she does not hold, not about being logged out.
select public.chk_raises(
  '4.1 a NON-MEMBER of the workspace is refused',
  format('select public.set_my_display_name(%L, %L)', :'ws_a', 'Me Meto A Tu Tienda'),
  '42501');

reset role;
select chk('4.2 …and the row she aimed at still holds its own name',
           public._name(:'ws_a', :u_duena) = 'Sergio Alarcón',
           coalesce(public._name(:'ws_a', :u_duena), 'NULL'));

-- ⚠️ A DEACTIVATED MEMBERSHIP IS NOT IN `my_workspaces()`: she cannot read the
-- shop, and she must not be able to write a name into it either.
select public._as(:u_baja);
set role authenticated;
select public.chk_raises(
  '4.3 an INACTIVE member is refused',
  format('select public.set_my_display_name(%L, %L)', :'ws_a', 'Sigo Aquí'),
  '42501');
reset role;

select public._as(:u_una);
set role authenticated;

select public.chk_raises(
  '4.4 a BLANK name is refused',
  format('select public.set_my_display_name(%L, %L)', :'ws_a', ''),
  '23514');

-- ⚠️ THE ONE THE `CHECK` CONSTRAINT ALONE WOULD NOT CATCH. `btrim` is the
-- migration's job: the constraint refuses `''` and would accept `'   '`, which
-- reads as a name that is present and renders as a gap on the roster.
select public.chk_raises(
  '4.5 a WHITESPACE-ONLY name is refused — the blank the CHECK alone would admit',
  format('select public.set_my_display_name(%L, %L)', :'ws_a', '    '),
  '23514');

select public.chk_raises(
  '4.6 a NULL name is refused',
  format('select public.set_my_display_name(%L, null)', :'ws_a'),
  '23514');

select public.chk_raises(
  '4.7 a NULL workspace id is refused',
  format('select public.set_my_display_name(null, %L)', 'Sin Tienda'),
  '42501');

-- ⚠️⚠️ THE TENANCY WALL, AND THE ONLY ONE OF THESE THAT WOULD MATTER IN A REAL
-- SHOP. She is an active member of A naming B, which is the shape an unscoped
-- write would have made unreachable by construction and a scoped one has to
-- refuse explicitly.
select public.chk_raises(
  '4.8 a member of shop A naming shop B is refused — no name crosses a tenant',
  format('select public.set_my_display_name(%L, %L)', :'ws_b', 'No Soy De Aquí'),
  '42501');

reset role;

select chk('4.9 …and shop B''s rows are exactly as they were',
           (select count(*) from public.workspace_member wm
             where wm.workspace_id = :'ws_b') = 2
       and public._name(:'ws_b', :u_duenab) = 'Dueña De La Otra'
       and public._name(:'ws_b', :u_dos) = 'Trabaja En Las Dos',
           format('B holds %s member(s)',
                  (select count(*) from public.workspace_member wm
                    where wm.workspace_id = :'ws_b')));

select public._as(null);
set role authenticated;
-- ⚠️ THE ONLY REFUSAL HERE ASSERTED ON ITS MESSAGE, and the reason is a GREEN
-- falsification: with the state alone, deleting the `auth.uid() is null` guard
-- from the migration turned nothing red — an unauthenticated caller matches no
-- row and falls out of `if not found` with the SAME `42501`. The guard is then
-- unfalsifiable, and worse, `5b.8-iii-b` would have no way to tell "sign in
-- again" from "this is not your shop".
select public.chk_raises_like(
  '4.10 an UNAUTHENTICATED caller is refused, and told THAT rather than "not your shop"',
  format('select public.set_my_display_name(%L, %L)', :'ws_a', 'Nadie'),
  '42501', 'requires an authenticated caller');
reset role;


-- ============================================================================
-- 5. The policy did not move — and this is WHY it did not have to
-- ============================================================================
-- See this file's header. 5.2 and 5.3 are the measurement the whole task rests
-- on, and 2.5 is their control.

select chk('5.1 workspace_member_update is STILL owner-only, read from pg_policies',
           (select count(*) from pg_policies
             where schemaname = 'public' and tablename = 'workspace_member'
               and cmd = 'UPDATE') = 1
       and (select qual from pg_policies
             where schemaname = 'public' and tablename = 'workspace_member'
               and cmd = 'UPDATE') like '%owner%',
           coalesce((select policyname || ': ' || qual from pg_policies
                      where schemaname = 'public' and tablename = 'workspace_member'
                        and cmd = 'UPDATE'), 'NO UPDATE POLICY'));

select public._as(:u_ger);
set role authenticated;

with moved as (
  update public.workspace_member wm
     set display_name = 'Me Renombro Sin Permiso'
   where wm.workspace_id = :'ws_a' and wm.user_id = :u_ger
  returning 1
)
select public.chk('5.2 a MANAGER cannot rename herself DIRECTLY — 0 rows, and 2.5 is the control',
                  (select count(*) from moved) = 0,
                  format('%s row(s) moved', (select count(*) from moved)));

-- ⚠️⚠️ THE ONE A "YOU MAY UPDATE YOUR OWN ROW" POLICY WOULD HAVE HANDED HER.
-- RLS filters ROWS, not COLUMNS, so the policy that admits her name admits this
-- too. It is asserted here rather than argued in a comment because the policy is
-- four lines and reads as a courtesy.
with escalated as (
  update public.workspace_member wm
     set role = 'owner'
   where wm.workspace_id = :'ws_a' and wm.user_id = :u_ger
  returning 1
)
select public.chk('5.3 …and she cannot set her own ROLE directly either — the column a row policy would admit',
                  (select count(*) from escalated) = 0,
                  format('%s row(s) moved', (select count(*) from escalated)));

reset role;
select public._as(null);

select chk('5.4 the manager''s name and role survived 5.2 and 5.3 unchanged',
           public._name(:'ws_a', :u_ger) = 'María Rodríguez'
       and public._role(:'ws_a', :u_ger) = 'manager',
           format('%L / %s', coalesce(public._name(:'ws_a', :u_ger), 'NULL'),
                  public._role(:'ws_a', :u_ger)));

select chk('5.5 workspace_member still has exactly FOUR policies — 0035 added none',
           (select count(*) from pg_policies
             where schemaname = 'public' and tablename = 'workspace_member') = 4,
           format('%s polic(ies)',
                  (select count(*) from pg_policies
                    where schemaname = 'public' and tablename = 'workspace_member')));


-- ============================================================================
-- 6. The census — `0034` section 1.9's other half
-- ============================================================================
-- 1.9 pinned the INSERTers because the task that wrote it was sized against a
-- row naming two of four. Nothing pinned the UPDATERs, and the owner's ruling
-- of 2026-09-18 lives entirely in those.

select chk('6.1 EXACTLY FOUR functions in public UPDATE workspace_member, and they are these four',
           (select coalesce(array_agg(proname::text order by proname), '{}')
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and prosrc ~ 'update\s+public\.workspace_member')
           = array['approve_request', 'redeem_invite', 'request_access',
                   'set_my_display_name']::text[],
           coalesce((select string_agg(proname, ', ' order by proname)
                       from pg_proc
                      where pronamespace = 'public'::regnamespace
                        and prosrc ~ 'update\s+public\.workspace_member'), 'NONE'));

-- ⚠️⚠️ THE OWNER'S RULING, READ OUT OF THE CATALOG. Three writers may only fill
-- a hole; exactly one may replace a name. A session that "tidies" a `coalesce`
-- away, or that adds one here, lands red.
select chk('6.2 the THREE membership writers may only FILL a hole — coalesce(display_name, …)',
           public._src('redeem_invite')  ~ 'display_name\s*=\s*coalesce\(display_name'
       and public._src('request_access') ~ 'display_name\s*=\s*coalesce\(display_name'
       and public._src('approve_request') ~ 'display_name\s*=\s*coalesce\(display_name',
           'all three update branches read from the applied catalog');

select chk('6.3 …and set_my_display_name is the ONE that may REPLACE — no coalesce on the stored value',
           public._src('set_my_display_name') !~ 'coalesce\(display_name',
           'applied body carries no coalesce over the stored name');

-- ⚠️ `0034` 1.9, re-performed. This migration must not have grown a fifth
-- INSERTer, and a census that only counted updaters would not see one.
select chk('6.4 the FOUR insert-writers of 0034 are unchanged — 0035 added no fifth',
           (select coalesce(array_agg(proname::text order by proname), '{}')
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and prosrc ~ 'insert\s+into\s+public\.workspace_member')
           = array['approve_request', 'onboard_workspace', 'redeem_invite',
                   'request_access']::text[],
           coalesce((select string_agg(proname, ', ' order by proname)
                       from pg_proc
                      where pronamespace = 'public'::regnamespace
                        and prosrc ~ 'insert\s+into\s+public\.workspace_member'), 'NONE'));


-- ============================================================================
-- 7. Did this file actually run?
-- ============================================================================
-- A green tick is also what a step that ran nothing looks like, and a suite that
-- silently SHRANK is the third shape. Only a pinned count catches it.

select chk('7.1 ALL 38 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 37,
           format('recorded=%s of 37 before this one',
                  (select count(*) from public._verify)));

drop function public._name(uuid, uuid);
drop function public._role(uuid, uuid);
drop function public._src(text);


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
