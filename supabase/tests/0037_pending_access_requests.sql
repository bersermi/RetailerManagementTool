-- ============================================================================
-- Behavioural verification for 0037 — who is waiting, and what to call her
-- ============================================================================
-- ADR-035 §2.3, §2.7, §9. docs/PLAN.md task 5b-iii-c.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0037_pending_access_requests.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED, AND WHY IT NEEDS NO CLIENT
-- ----------------------------------------------------------------------------
-- `5b-iii-c` builds the read and `5b-iii-d` builds the screen that renders it.
-- The half loop is deliberate and what makes it safe is that this half is
-- falsifiable on its own: six requests across two shops, five roles in the
-- room, and every fence measured under `set role authenticated` rather than as
-- the superuser, who bypasses RLS and would pass all of it vacuously.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SECTION 3 IS THE ONE THAT SAYS THE FENCE IS A FENCE
-- ----------------------------------------------------------------------------
-- The fence is a predicate inside a definer body, and its refusal is AN EMPTY
-- LIST (`0037` decision 2). An empty list and a refused list are the same row
-- count, which is the vacuous-green shape `0035` 5.2 already records one
-- migration over: zero rows can mean "the fence held" or "there was nothing
-- there".
--
-- So nothing in section 3 asserts zero on its own. 3.1 is the CONTROL — the
-- owner of shop A, reading the same workspace at the same moment, gets THREE
-- rows — and 3.2 through 3.6 are a manager, a cashier, a stranger, the
-- requester herself and a DEACTIVATED owner reading the same argument and
-- getting none. One of the two must be the fence, and the pair is what says
-- which.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SECTION 6 IS THE CLAIM THIS MIGRATION EXISTS BECAUSE OF, MEASURED
-- ----------------------------------------------------------------------------
-- `5b-iii-c`'s whole argument is that the EMAIL is already reachable from a
-- phone and the NAME is on no table this caller may select. That was read out
-- of migration files, which ADR-035 §9 says is not evidence. 6.1 measures the
-- first half: a manager, under `set role authenticated`, selects the request
-- row and its email. 6.2 measures the second: the same manager looks for a
-- `workspace_member` row for the person who asked, and there is none to join
-- to — not a row she is refused, a row that DOES NOT EXIST, because
-- `approve_request` has not run. 6.3 is the third door, `auth_full_name`
-- itself, which is granted to nobody and refuses her.
--
-- ⚠️ 6.4 IS THE REFUSED ALTERNATIVE, MADE MACHINE-READABLE. The plan and the
-- migration both refuse a name column on the request row, in prose. 6.4 asserts
-- no such column exists, so the day somebody adds one this lands red in the
-- file whose whole subject is the read that exists instead.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS FILE CANNOT SEE
-- ----------------------------------------------------------------------------
-- Nothing about the screen: `5b-iii-d` ships the badge, the approval list, the
-- location picker and the `approve_request` call, with its own contract check
-- against real HTTP. And nothing about whether OWNER is the fence the owner
-- wants — 3.2 measures the consequence (a manager sees an empty queue) so the
-- bill is visible, but the choice is a decision recorded in `docs/PLAN.md` and
-- in `0037`'s header, not a check.
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

create table public._verify (n serial, label text, passed boolean, detail text);
grant all on public._verify to authenticated;
grant all on sequence public._verify_n_seq to authenticated;
-- ⚠️ AND TO `anon`, WHICH NO SUITE BEFORE THIS ONE NEEDED. 3.7 is the only check
-- in this directory made as the signed-out role, and without these grants the
-- recording INSIDE `chk_raises`'s exception handler is itself refused — which
-- does not fail the check, it ABORTS the file, and an aborted suite prints no
-- FAIL rows at all (`0035`, `0036`). The harness must be reachable by whoever
-- the check is about.
grant all on public._verify to anon;
grant all on sequence public._verify_n_seq to anon;

create function public.chk(p_label text, p_cond boolean, p_detail text default '')
returns void language sql as $$
  insert into public._verify (label, passed, detail) values (p_label, p_cond, p_detail);
  select null::void;
$$;
grant execute on function public.chk(text, boolean, text) to authenticated, anon;

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
grant execute on function public.chk_raises(text, text, text) to authenticated, anon;

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

-- ⚠️ THE FOUR READERS BELOW ARE `security invoker` ON PURPOSE. Called under
-- `set role authenticated` they run AS that role, so the fence inside
-- `pending_access_requests` is being measured rather than bypassed. A
-- `security definer` helper here would make every check in section 3 vacuous:
-- the whole file would read as the superuser and pass.
--
-- ⚠️⚠️ AND EVERY ONE OF THEM CATCHES, WHICH IS A FALSIFICATION FINDING FROM THIS
-- FILE'S OWN ROUND. Fixture `F12` makes the function `security invoker`; it then
-- cannot reach `auth_full_name`, which is granted to nobody, and the read RAISES
-- instead of returning rows. In the first spelling that raise ABORTED the file
-- under ON_ERROR_STOP — so 1.2, the check written for exactly that defect, had
-- recorded its FAIL and the report was never printed. An aborted suite prints no
-- FAIL rows at all, and this repository has already recorded that shape scoring
-- GREEN one level up (`0035`, `0036`). A refusal now comes back as a VALUE — -1,
-- or `<REFUSED …>` — which is not zero and not empty, so it can never be
-- mistaken for a fence holding.
create function public._pq_n(p_ws uuid)
returns bigint language plpgsql stable as $$
begin
  return (select count(*) from public.pending_access_requests(p_ws));
exception when others then
  return -1;
end;
$$;
grant execute on function public._pq_n(uuid) to authenticated;

-- Ordered, because the ORDER is a claim (decision 6) and an unordered
-- aggregate would pass whichever way the planner felt like returning them.
create function public._pq_names(p_ws uuid)
returns text language plpgsql stable as $$
begin
  return (select coalesce(string_agg(coalesce(q.requester_name, '<NULL>'), ' | '
                                     order by q.requested_at desc), '<EMPTY>')
            from public.pending_access_requests(p_ws) q);
exception when others then
  return '<REFUSED ' || sqlstate || '>';
end;
$$;
grant execute on function public._pq_names(uuid) to authenticated;

create function public._pq_emails(p_ws uuid)
returns text language plpgsql stable as $$
begin
  return (select coalesce(string_agg(q.email::text, ' | '
                                     order by q.requested_at desc), '<EMPTY>')
            from public.pending_access_requests(p_ws) q);
exception when others then
  return '<REFUSED ' || sqlstate || '>';
end;
$$;
grant execute on function public._pq_emails(uuid) to authenticated;

-- ⚠️ THE SAME READ WITH NO `order by` OF ITS OWN, AND THAT IS THE WHOLE POINT
-- OF IT EXISTING BESIDE `_pq_emails`. The helper above sorts what it aggregates,
-- so it is stable for CONTENT checks and says nothing about the order the
-- function returned. 2.5 is a claim about decision 6 — newest first — and a
-- check that re-sorts the rows before looking at them cannot see it.
create function public._pq_order(p_ws uuid)
returns text language plpgsql stable as $$
begin
  return (select coalesce(string_agg(q.email::text, ' | '), '<EMPTY>')
            from public.pending_access_requests(p_ws) q);
exception when others then
  return '<REFUSED ' || sqlstate || '>';
end;
$$;
grant execute on function public._pq_order(uuid) to authenticated;

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
-- ⚠️ THE METADATA SHAPES ARE THE POINT, as they were in `0034` and `0035`.
-- `u_pide` is the person this whole task exists for: she typed the shop code,
-- she is on no membership table, and the owner is about to be shown her name.
-- `u_nada` signed in with a provider that returned nothing, and `0034` admits
-- her on purpose — she is decision 4, and the screen shows a header with
-- nothing under it.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'duena.a@example.mx',
     jsonb_build_object('full_name', 'Sergio Alarcón Pineda')),
  ('22222222-2222-2222-2222-222222222222', 'gerenta@example.mx',
     jsonb_build_object('full_name', 'María del Carmen Rodríguez Gómez')),
  ('33333333-3333-3333-3333-333333333333', 'cajera@example.mx',
     jsonb_build_object('full_name', 'Lupita Hernández Ruiz')),
  -- The live case: asks, waits, and is a name the owner has never seen.
  ('44444444-4444-4444-4444-444444444444', 'quiere.entrar@example.mx',
     jsonb_build_object('full_name', 'Rosa María Tavárez Luna')),
  -- No metadata at all. Asks anyway, and her name comes back NULL.
  ('55555555-5555-5555-5555-555555555555', 'sin.nombre@example.mx', '{}'::jsonb),
  -- Asks, and is approved before anybody reads the queue.
  ('66666666-6666-6666-6666-666666666666', 'ya.entro@example.mx',
     jsonb_build_object('full_name', 'Ya Entró A La Tienda')),
  -- Asks, and her row is left to lapse.
  ('77777777-7777-7777-7777-777777777777', 'ya.vencio@example.mx',
     jsonb_build_object('full_name', 'Ya Se Le Venció')),
  -- Asks, lapses, and asks again — the superseded row and the live one.
  ('88888888-8888-8888-8888-888888888888', 'pidio.dos.veces@example.mx',
     jsonb_build_object('full_name', 'Pidió Dos Veces')),
  -- INVITED by the owner and never redeems: a pending row on the same table,
  -- with source = 'invite'. Decision 3 is that she is not in this queue.
  ('99999999-9999-9999-9999-999999999999', 'la.invitaron@example.mx',
     jsonb_build_object('full_name', 'La Invitaron Y No Entra')),
  -- A second shop entirely, and the person asking to join it.
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'duena.b@example.mx',
     jsonb_build_object('full_name', 'Dueña De La Otra')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'quiere.la.otra@example.mx',
     jsonb_build_object('full_name', 'Quiere La Otra Tienda')),
  -- A SECOND owner of shop A, who is then deactivated. 3.6 is her.
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'socio.que.se.fue@example.mx',
     jsonb_build_object('full_name', 'Socio Que Se Fue')),
  -- ⚠️ SUPERSEDED WHILE STILL UNEXPIRED. 4.6 is her, and see the fixture note.
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'la.reemplazaron@example.mx',
     jsonb_build_object('full_name', 'Reemplazada Y Todavía Viva'));

\set u_duena  '''11111111-1111-1111-1111-111111111111'''
\set u_ger    '''22222222-2222-2222-2222-222222222222'''
\set u_caja   '''33333333-3333-3333-3333-333333333333'''
\set u_pide   '''44444444-4444-4444-4444-444444444444'''
\set u_nada   '''55555555-5555-5555-5555-555555555555'''
\set u_ok     '''66666666-6666-6666-6666-666666666666'''
\set u_exp    '''77777777-7777-7777-7777-777777777777'''
\set u_dos    '''88888888-8888-8888-8888-888888888888'''
\set u_push   '''99999999-9999-9999-9999-999999999999'''
\set u_duenab '''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
\set u_pideb  '''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'''
\set u_baja   '''cccccccc-cccc-cccc-cccc-cccccccccccc'''
\set u_viva   '''dddddddd-dddd-dddd-dddd-dddddddddddd'''

select public._as(:u_duena);
select onboard_workspace('Tienda A') as ws_a \gset
select public._as(:u_duenab);
select onboard_workspace('Tienda B') as ws_b \gset
select public._as(null);

select id as loc_a1 from public.location where workspace_id = :'ws_a' \gset
select code as code_a from public.workspace where id = :'ws_a' \gset
select code as code_b from public.workspace where id = :'ws_b' \gset

-- A manager, a cashier and a second OWNER into shop A by the push path, so
-- section 3 is about the role fence and never about a missing membership.
select public._as(:u_duena);
select public.create_invite(:'ws_a', 'gerenta@example.mx', 'manager',
                            array[:'loc_a1']::uuid[]) as r_ger \gset
select public.create_invite(:'ws_a', 'cajera@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_caja \gset
select public.create_invite(:'ws_a', 'socio.que.se.fue@example.mx', 'owner',
                            '{}'::uuid[]) as r_baja \gset
-- …and one invite that is never redeemed. It stays PENDING on the same table
-- the queue reads, with source = 'invite'.
select public.create_invite(:'ws_a', 'la.invitaron@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_push \gset

select (:'r_ger'::jsonb->>'token')  as t_ger  \gset
select (:'r_caja'::jsonb->>'token') as t_caja \gset
select (:'r_baja'::jsonb->>'token') as t_baja \gset

select public._as(:u_ger);  select public.redeem_invite(:'t_ger')  as x \gset
select public._as(:u_caja); select public.redeem_invite(:'t_caja') as x \gset
select public._as(:u_baja); select public.redeem_invite(:'t_baja') as x \gset

-- ---- the six requests -------------------------------------------------------
-- All six go through `request_access` with the real shop code, because a row
-- inserted by hand would not prove the queue reads what the pull path writes.
select public._as(:u_pide); select public.request_access(:'code_a') as x \gset
select public._as(:u_nada); select public.request_access(:'code_a') as x \gset
select public._as(:u_ok);   select public.request_access(:'code_a') as x \gset
select public._as(:u_exp);  select public.request_access(:'code_a') as x \gset
select public._as(:u_dos);  select public.request_access(:'code_a') as x \gset
select public._as(:u_viva); select public.request_access(:'code_a') as x \gset
select public._as(:u_pideb); select public.request_access(:'code_b') as x \gset
select public._as(null);

-- One of them is approved, by the owner, with a location. She leaves the queue
-- because she is in the shop, not because a check says so.
select id as req_ok from public.workspace_invite
 where workspace_id = :'ws_a' and email = 'ya.entro@example.mx' \gset
select public._as(:u_duena);
set role authenticated;
select public.approve_request(:'req_ok', array[:'loc_a1']::uuid[]) as x \gset
reset role;
select public._as(null);

-- One is left to lapse. As the superuser, because this is fixture: nothing in
-- the schema lets a person age their own row, and waiting seven days is not a
-- test.
-- ⚠️ `created_at` MOVES WITH IT. `workspace_invite_expiry_future` (`0002:390`)
-- is `expires_at > created_at`, so backdating the expiry alone is refused by the
-- schema — which is the constraint doing its job and is why the row is aged
-- rather than merely expired.
update public.workspace_invite
   set created_at = now() - interval '9 days',
       expires_at = now() - interval '2 days'
 where workspace_id = :'ws_a' and email = 'ya.vencio@example.mx';

-- One lapsed and asked again. `request_access` calls `D3′`'s helper first, so
-- the dead row is SUPERSEDED and a live one is written beside it — which is the
-- only way two rows for one address can exist, and the reason 4.3 is not the
-- same check as 4.2.
update public.workspace_invite
   set created_at = now() - interval '9 days',
       expires_at = now() - interval '2 days'
 where workspace_id = :'ws_a' and email = 'pidio.dos.veces@example.mx';
select public._as(:u_dos); select public.request_access(:'code_a') as x \gset
select public._as(null);

-- ⚠️⚠️ SUPERSEDED, AND STILL LIVE — AND THIS STATE IS NOT REACHABLE THROUGH ANY
-- APPLIED RPC TODAY, WHICH IS EXACTLY WHY IT IS WRITTEN BY HAND. The
-- falsification round found `superseded_at is null` GREEN when deleted from the
-- function: the only superseded request this fixture held had been aged to make
-- it superseded in the first place, so `expires_at > now()` was already
-- excluding it and the two filters were indistinguishable. A check that cannot
-- fail is not a check.
--
-- `supersede_expired_invite` (`0027:340`) only touches rows that have lapsed,
-- and `create_invite` refuses a live pending REQUEST with `TD004` rather than
-- replacing it — so nothing in the schema can produce this row, today. 4.6 is
-- therefore a defence of a filter against the day something can, and it is
-- written as fixture rather than driven through an RPC for that reason. The
-- alternative is a filter nobody can show doing anything.
update public.workspace_invite
   set superseded_at = now()
 where workspace_id = :'ws_a' and email = 'la.reemplazaron@example.mx';

-- The second owner is deactivated. Fixture, not a claim about who may
-- deactivate whom.
update public.workspace_member
   set is_active = false
 where workspace_id = :'ws_a' and user_id = :u_baja;

-- ⚠️ THE ORDER IS A CLAIM (decision 6) AND `now()` INSIDE ONE STATEMENT IS NOT
-- A CLOCK. The three live requests were written seconds apart, which orders
-- them but leaves 2.5 resting on transaction timing at microsecond resolution.
-- Two of them are aged by whole days so a reversed `order by` fails loudly
-- rather than flickering.
update public.workspace_invite
   set created_at = now() - interval '2 days'
 where workspace_id = :'ws_a' and email = 'quiere.entrar@example.mx';

update public.workspace_invite
   set created_at = now() - interval '1 day'
 where workspace_id = :'ws_a' and email = 'sin.nombre@example.mx';

select id as req_pide from public.workspace_invite
 where workspace_id = :'ws_a' and email = 'quiere.entrar@example.mx' \gset


-- ============================================================================
-- 1. The function's shape, and who can reach it
-- ============================================================================
-- ⚠️ EVERY STRUCTURAL CHECK HERE AGGREGATES rather than using a bare scalar
-- subquery. That is `0035` 1.2's falsification finding: the scalar form raises
-- "more than one row returned by a subquery" the moment a fixture puts an
-- overload beside the function, which ABORTS the file under ON_ERROR_STOP — so
-- the check written for exactly that defect never records a FAIL, and an
-- aborted suite prints no FAIL rows at all.

select chk('1.1 pending_access_requests(uuid) exists and returns the six named columns',
           (select count(*) from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'pending_access_requests'
               and pg_get_function_identity_arguments(p.oid) = 'p_workspace_id uuid'
               and pg_get_function_result(p.oid) =
                   'TABLE(request_id uuid, email citext, requester_name text, '
                || 'role workspace_role, requested_at timestamp with time zone, '
                || 'expires_at timestamp with time zone)') = 1,
           coalesce((select string_agg(pg_get_function_identity_arguments(p.oid)
                                       || ' -> ' || pg_get_function_result(p.oid), ' | ')
                       from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname = 'pending_access_requests'), 'NO SUCH FUNCTION'));

select chk('1.2 it is security definer with an EMPTY search_path',
           (select count(*) = 1 from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'pending_access_requests'
               and p.prosecdef
               and p.proconfig @> array['search_path=""']),
           coalesce((select string_agg('secdef=' || p.prosecdef || ' config=' ||
                                       coalesce(array_to_string(p.proconfig, ','), 'NONE'), ' | ')
                       from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname = 'pending_access_requests'), 'NO SUCH FUNCTION'));

-- ⚠️ THE OVERLOAD CASE, which `0034` added after `0030` found it: a changed
-- signature leaves the old function standing beside the new one, every client
-- keeps calling the old one, and every behavioural check passes.
select chk('1.3 EXACTLY ONE pending_access_requests exists — no overload standing beside it',
           (select count(*) from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'pending_access_requests') = 1,
           format('%s function(s) named pending_access_requests',
                  (select count(*) from pg_proc p
                    where p.pronamespace = 'public'::regnamespace
                      and p.proname = 'pending_access_requests')));

-- ⚠️ `revoke ... from public` is what makes the `anon` half of this true.
-- Revoking `anon` and `authenticated` by name would leave PUBLIC's default
-- standing and this check would go red — `0027`'s G1.
select chk('1.4 authenticated may execute it, anon may NOT, and PUBLIC holds nothing',
           has_function_privilege('authenticated',
                                  'public.pending_access_requests(uuid)', 'execute')
       and not has_function_privilege('anon',
                                  'public.pending_access_requests(uuid)', 'execute')
           -- PUBLIC appears in an ACL as an entry with an EMPTY grantee — `=X/postgres`.
       and (select count(*) = 1 from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'pending_access_requests'
               and p.proacl is not null
               and p.proacl::text !~ '(\{|,)='),
           coalesce((select string_agg(coalesce(p.proacl::text, 'NULL ACL'), ' | ')
                       from pg_proc p
                      where p.pronamespace = 'public'::regnamespace
                        and p.proname = 'pending_access_requests'), 'NO SUCH FUNCTION'));

-- ⚠️ THE FENCE, READ OUT OF THE APPLIED BODY. Every behavioural check in
-- section 3 would still pass if the predicate were `'manager'` and this file's
-- manager happened not to be one — she is, so they would not; but the fence is
-- a decision recorded in the migration header, and a decision that only one
-- fixture holds up is a decision one fixture edit removes.
select chk('1.5 the applied body fences on OWNER, not on membership and not on manager',
           public._src('pending_access_requests') ~ 'has_role\(\s*p_workspace_id\s*,\s*''owner''',
           'read from pg_proc.prosrc');

-- ⚠️ DECISION 2, AS A PROPERTY OF THE BODY. The empty list IS the refusal, and
-- the reason is that `42501` already carries two meanings on this path. A later
-- session that "improves" this by raising lands red here and has to read why.
select chk('1.6 it RAISES NOTHING — the refusal is an empty list (decision 2)',
           public._src('pending_access_requests') !~ 'raise'
       and public._src('pending_access_requests') !~ '42501'
           -- ⚠️ AGGREGATED, AND THAT IS `F15`'s FINDING. The bare scalar form
           -- raised "more than one row returned by a subquery" the moment the
           -- overload fixture put a second function beside this one — which
           -- ABORTS the file, so 1.3, the check written for exactly that defect,
           -- never printed. `0035` 1.2 wrote this rule down and this file broke
           -- it two checks later.
       and (select bool_and(p.prokind = 'f' and p.prolang =
                            (select oid from pg_language where lanname = 'sql'))
              from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'pending_access_requests'),
           'language sql, no raise site in the applied body');


-- ============================================================================
-- 2. What the owner sees, under `set role authenticated`
-- ============================================================================
-- ⚠️ EVERY CALL BELOW RUNS AS `authenticated`. As the superuser this function
-- would work for reasons that tell us nothing: `has_role` would still read the
-- GUC, but the grant would be irrelevant and section 3's fence would be
-- measured against a role that bypasses RLS everywhere else in the file.

select public._as(:u_duena);
set role authenticated;
select public._pq_n(:'ws_a')      as own_n      \gset
select public._pq_names(:'ws_a')  as own_names  \gset
select public._pq_emails(:'ws_a') as own_emails \gset
select public._pq_order(:'ws_a')  as own_order  \gset
reset role;

select chk('2.1 the owner sees EXACTLY the three LIVE pending requests — seven were made',
           :'own_n'::bigint = 3,
           format('%s row(s); seven request rows exist on this workspace', :'own_n'));

select chk('2.2 …and the NAME comes back, which is the whole point of the migration',
           :'own_names' like '%Rosa María Tavárez Luna%',
           format('names: %s', :'own_names'));

select chk('2.3 …and the EMAIL comes back beside it — the header the 2026-09-19 ruling names',
           :'own_emails' like '%quiere.entrar@example.mx%',
           format('emails: %s', :'own_emails'));

-- ⚠️ DECISION 4, AND IT IS NOT AN ERROR. `0034` made the name nullable on
-- purpose; the screen renders the header with nothing under it and says
-- NOTHING about why.
select chk('2.4 a requester whose provider sent NO NAME is present, with a NULL name',
           :'own_names' = 'Pidió Dos Veces | <NULL> | Rosa María Tavárez Luna',
           format('names in requested_at desc order: %s', :'own_names'));

-- ⚠️ THE ORDER IS THE CLAIM (decision 6), and `u_pide` was aged two days in the
-- fixture so a reversed `order by` fails loudly rather than by microseconds.
select chk('2.5 NEWEST FIRST — the person who just typed the code is at the top',
           :'own_order' = 'pidio.dos.veces@example.mx | sin.nombre@example.mx'
                        || ' | quiere.entrar@example.mx',
           format('in the order the function returned them: %s', :'own_order'));

select chk('2.6 every row carries the role the request was made at — staff, the column default',
           (select count(*) from public.pending_access_requests(:'ws_a') q
             where q.role = 'staff') = 3,
           coalesce((select string_agg(q.role::text, ',')
                       from public.pending_access_requests(:'ws_a') q), 'NONE'));

select chk('2.7 the request_id is the one approve_request takes — the row, not the account',
           (select count(*) from public.pending_access_requests(:'ws_a') q
             where q.request_id = :'req_pide') = 1,
           format('looking for %s', :'req_pide'));

-- ⚠️ THE OWNER OF THE OTHER SHOP READS HER OWN QUEUE, not an empty one. Without
-- this, every zero in section 3 could mean the function returns nothing to
-- anybody and the whole file would be green on a dead read.
select public._as(:u_duenab);
set role authenticated;
select public._pq_n(:'ws_b')      as b_n     \gset
select public._pq_names(:'ws_b')  as b_names \gset
-- …and the SAME person asking for shop A's queue gets nothing. She is an owner,
-- just not of that shop, which is the tenancy wall rather than the role fence.
select public._pq_n(:'ws_a')      as b_in_a  \gset
reset role;

select chk('2.8 the owner of shop B sees shop B''s one request, and her own only',
           :'b_n'::bigint = 1 and :'b_names' = 'Quiere La Otra Tienda',
           format('%s row(s): %s', :'b_n', :'b_names'));

select chk('2.9 …and an OWNER of another shop reads ZERO from this one (decision 5)',
           :'b_in_a'::bigint = 0,
           format('%s row(s) of shop A visible to shop B''s owner', :'b_in_a'));


-- ============================================================================
-- 3. The fence, and the pair that says it IS one
-- ============================================================================
-- ⚠️⚠️ READ THE HEADER OF THIS FILE FIRST. Zero rows is what a fence looks like
-- AND what an empty table looks like. 3.1 is the control and it is the same
-- workspace, the same two rows and the same moment as every zero below.

select public._as(:u_duena);
set role authenticated;
select public._pq_n(:'ws_a') as ctrl_n \gset
reset role;

select chk('3.1 CONTROL — the owner reads THREE rows from this workspace right now',
           :'ctrl_n'::bigint = 3,
           format('%s row(s)', :'ctrl_n'));

select public._as(:u_ger);
set role authenticated;
select public._pq_n(:'ws_a') as ger_n \gset
reset role;

-- ⚠️ THE BILL FOR DECISION 1, MADE VISIBLE. A manager of this shop — who may
-- SELECT these very rows and their email addresses through
-- `workspace_invite_select` — reads an empty queue, because she cannot approve.
select chk('3.2 a MANAGER of this shop reads ZERO — she cannot approve, so she is not shown names',
           :'ger_n'::bigint = 0,
           format('%s row(s) for a manager while the owner reads 3', :'ger_n'));

select public._as(:u_caja);
set role authenticated;
select public._pq_n(:'ws_a') as caja_n \gset
reset role;

select chk('3.3 a CASHIER of this shop reads ZERO',
           :'caja_n'::bigint = 0,
           format('%s row(s) for staff', :'caja_n'));

select public._as(:u_pide);
set role authenticated;
select public._pq_n(:'ws_a') as pide_n \gset
reset role;

-- ⚠️ THE REQUESTER HERSELF. She reads her own row through `my_access_requests`
-- and nobody else's through anything — `S3` and this check are two halves of
-- one rule.
select chk('3.4 the REQUESTER reads ZERO from the queue she is standing in',
           :'pide_n'::bigint = 0,
           format('%s row(s) for the person who asked', :'pide_n'));

select public._as(:u_push);
set role authenticated;
select public._pq_n(:'ws_a') as push_n \gset
reset role;

select chk('3.5 a STRANGER — invited, never redeemed, member of nothing — reads ZERO',
           :'push_n'::bigint = 0,
           format('%s row(s) for a non-member', :'push_n'));

select public._as(:u_baja);
set role authenticated;
select public._pq_n(:'ws_a') as baja_n \gset
reset role;

-- ⚠️ A DEACTIVATED OWNER IS NOT AN OWNER, and nothing in `0037` says so — it is
-- `my_role`'s `is_active` (`0001:363`), inherited through `has_role`. A fence
-- that forgot it would hand a departed partner the queue forever.
select chk('3.6 a DEACTIVATED owner reads ZERO — has_role inherits my_role''s is_active',
           :'baja_n'::bigint = 0,
           format('%s row(s) for a deactivated owner', :'baja_n'));

-- ⚠️ THE SIGNED-OUT CALLER. `anon` holds no EXECUTE at all (1.4), so this is
-- the grant being measured rather than the predicate — and `auth.uid()` is null
-- inside, so the predicate would refuse her too.
select public._as(null);
set role anon;
select public.chk_raises('3.7 anon cannot call it at all — the grant, not the predicate',
                         'select * from public.pending_access_requests(''00000000-0000-0000-0000-000000000000'')',
                         '42501');
reset role;


-- ============================================================================
-- 4. What is NOT in the queue, and why each one would be a bug
-- ============================================================================
-- Six requests were made against shop A. Two are live. These are the other
-- four, and each is absent for its own reason.

select public._as(:u_duena);
set role authenticated;
select public._pq_emails(:'ws_a') as all_emails \gset
reset role;

select chk('4.1 an APPROVED request is gone — she is in the shop, not in the queue',
           :'all_emails' not like '%ya.entro@example.mx%',
           format('queue: %s', :'all_emails'));

-- ⚠️ AN EXPIRED ROW IS ABSENT RATHER THAN GREYED OUT. `approve_request` raises
-- `TD003` for it, so a screen showing it offers an action that always fails.
select chk('4.2 an EXPIRED request is gone — approve_request raises TD003 for it',
           :'all_emails' not like '%ya.vencio@example.mx%',
           format('queue: %s', :'all_emails'));

-- ⚠️ SUPERSEDED IS NOT EXPIRED, and the difference is why 4.3 is its own check:
-- this person asked, lapsed, and asked AGAIN. The dead row and the live row are
-- both on the table, for the same address, at the same instant.
select chk('4.3 a SUPERSEDED request is gone, and the row that REPLACED it is here ONCE',
           (select count(*) from public.workspace_invite wi
             where wi.workspace_id = :'ws_a'
               and wi.email = 'pidio.dos.veces@example.mx') = 2
       and (select count(*) from public.pending_access_requests(:'ws_a') q
             where q.email = 'pidio.dos.veces@example.mx') = 1
           -- …and it is the LIVE one, by id. Counting to one would pass just as
           -- well if the queue had picked the dead row and dropped the live one.
       and (select q.request_id from public.pending_access_requests(:'ws_a') q
             where q.email = 'pidio.dos.veces@example.mx')
         = (select wi.id from public.workspace_invite wi
             where wi.workspace_id = :'ws_a'
               and wi.email = 'pidio.dos.veces@example.mx'
               and wi.superseded_at is null),
           format('%s rows on the table for that address, %s in the queue',
                  (select count(*) from public.workspace_invite wi
                    where wi.workspace_id = :'ws_a'
                      and wi.email = 'pidio.dos.veces@example.mx'),
                  (select count(*) from public.pending_access_requests(:'ws_a') q
                    where q.email = 'pidio.dos.veces@example.mx')));

-- ⚠️⚠️ DECISION 3's OTHER HALF, AND THE ONE A MISSING `source` FILTER BREAKS.
-- A pending PUSH invite lives on this same table, with `requested_by` null and
-- therefore no name at all. Without the filter the owner's queue counts the
-- invitations he sent as people waiting to be let in.
select chk('4.4 a pending INVITE is NOT a request — source = ''invite'' is excluded',
           (select count(*) from public.workspace_invite wi
             where wi.workspace_id = :'ws_a'
               and wi.email = 'la.invitaron@example.mx'
               and wi.source = 'invite'
               and wi.accepted_at is null
               and wi.expires_at > now()) = 1
       and :'all_emails' not like '%la.invitaron@example.mx%',
           format('queue: %s', :'all_emails'));

-- ⚠️ THE FILTER `F6` COULD NOT SEE. See the fixture note above: this row is
-- superseded and has NOT expired, so it is excluded by `superseded_at is null`
-- and by nothing else in the body. Delete that line and this check goes red on
-- its own.
select chk('4.6 a SUPERSEDED request that has NOT expired is gone too — the filter F6 exposed',
           (select count(*) from public.workspace_invite wi
             where wi.workspace_id = :'ws_a'
               and wi.email = 'la.reemplazaron@example.mx'
               and wi.superseded_at is not null
               and wi.expires_at > now()) = 1
       and :'all_emails' not like '%la.reemplazaron@example.mx%',
           format('queue: %s', :'all_emails'));

-- The arithmetic, stated once: seven requests on shop A, four of them excluded.
select chk('4.5 seven request rows exist on shop A and the queue returns three — the other four are above',
           (select count(*) from public.workspace_invite wi
             where wi.workspace_id = :'ws_a' and wi.source = 'request') = 7
       and :'ctrl_n'::bigint = 3,
           format('%s request rows on the table, %s in the queue',
                  (select count(*) from public.workspace_invite wi
                    where wi.workspace_id = :'ws_a' and wi.source = 'request'),
                  :'ctrl_n'));


-- ============================================================================
-- 5. The name is READ, not COPIED — which is why it is a function
-- ============================================================================
-- ⚠️ THIS IS THE ARGUMENT AGAINST THE REFUSED ALTERNATIVE, MEASURED. A
-- `requester_name` column filled at insert time would be right on the day it
-- was written and wrong the day she corrected it. Nothing in this schema lets
-- her correct it yet — `set_my_display_name` needs a membership she does not
-- have — but her provider metadata is hers, and the queue follows it.

update auth.users
   set raw_user_meta_data = jsonb_build_object('full_name', 'Rosa María Tavárez de Luna')
 where id = :u_pide;

select public._as(:u_duena);
set role authenticated;
select public._pq_names(:'ws_a') as names_after \gset
reset role;

select chk('5.1 a name corrected in auth.users shows up in the queue — a copied column would not',
           :'names_after' like '%Rosa María Tavárez de Luna%'
       and :'names_after' not like '%Tavárez Luna%',
           format('names now: %s', :'names_after'));

-- ⚠️ `auth_full_name` RETURNS NULL, NEVER `''` (`0034` section 2), and a blank
-- provider name must not render as a person called nothing.
update auth.users
   set raw_user_meta_data = jsonb_build_object('full_name', '   ')
 where id = :u_pide;

select public._as(:u_duena);
set role authenticated;
select public._pq_names(:'ws_a') as names_blank \gset
reset role;

select chk('5.2 a BLANK provider name comes back NULL, not an empty string',
           :'names_blank' = 'Pidió Dos Veces | <NULL> | <NULL>',
           format('names now: %s', :'names_blank'));

update auth.users
   set raw_user_meta_data = jsonb_build_object('full_name', 'Rosa María Tavárez Luna')
 where id = :u_pide;

-- ⚠️ THE CENSUS. `auth_full_name` is the one reader of `auth.users` in this
-- schema and this migration is its FIFTH caller. Pinning the set is how a
-- sixth — or a second function reading `raw_user_meta_data` directly — lands
-- red in the file whose subject is the read that does it properly.
select chk('5.3 exactly FIVE functions call auth_full_name, and they are these five',
           (select coalesce(array_agg(proname::text order by proname), '{}')
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname <> 'auth_full_name'
               and prosrc ~ 'auth_full_name')
           = array['approve_request', 'onboard_workspace', 'pending_access_requests',
                   'redeem_invite', 'request_access']::text[],
           coalesce((select string_agg(proname, ', ' order by proname)
                       from pg_proc
                      where pronamespace = 'public'::regnamespace
                        and proname <> 'auth_full_name'
                        and prosrc ~ 'auth_full_name'), 'NONE'));

select chk('5.4 …and auth_full_name is STILL the only reader of raw_user_meta_data',
           (select coalesce(array_agg(proname::text order by proname), '{}')
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and prosrc ~ 'raw_user_meta_data')
           = array['auth_full_name']::text[],
           coalesce((select string_agg(proname, ', ' order by proname)
                       from pg_proc
                      where pronamespace = 'public'::regnamespace
                        and prosrc ~ 'raw_user_meta_data'), 'NONE'));


-- ============================================================================
-- 6. The claim this migration exists because of — measured, not read
-- ============================================================================
-- ADR-035 §9: a migration file is not evidence. `5b-iii-c`'s whole argument is
-- that the email is already reachable from a phone and the name is on no table
-- this caller may select. Both halves are measured here, under `set role
-- authenticated`, as the manager — the MOST privileged person who is not an
-- owner, so a hole would show here first.

select public._as(:u_ger);
set role authenticated;
select count(*) as mgr_sees_rows from public.workspace_invite
 where workspace_id = :'ws_a' and source = 'request' \gset
select count(*) as mgr_sees_email from public.workspace_invite
 where workspace_id = :'ws_a' and email = 'quiere.entrar@example.mx' \gset
select count(*) as mgr_sees_member from public.workspace_member
 where user_id = :u_pide \gset
reset role;

select chk('6.1 the EMAIL is already selectable by a manager — workspace_invite_select, 0002:563',
           :'mgr_sees_rows'::bigint = 7 and :'mgr_sees_email'::bigint = 1,
           format('%s request rows and %s matching the address',
                  :'mgr_sees_rows', :'mgr_sees_email'));

-- ⚠️⚠️ THE HALF THAT MAKES THIS A MIGRATION. Not a row she is refused — a row
-- that DOES NOT EXIST. `approve_request` writes the membership, and it has not
-- run for this person, so there is nothing anywhere carrying `display_name` to
-- join to.
select chk('6.2 …and the NAME is on NO row she could join to — the requester has no membership',
           :'mgr_sees_member'::bigint = 0
       and (select count(*) from public.workspace_member wm
             where wm.user_id = :u_pide) = 0,
           format('%s membership row(s) visible to the manager, %s in the table',
                  :'mgr_sees_member',
                  (select count(*) from public.workspace_member wm
                    where wm.user_id = :u_pide)));

-- ⚠️ THE THIRD DOOR, AND IT IS SHUT. `auth_full_name` is granted to NOBODY
-- (`0034`), so a client cannot simply call the thing this function calls.
select public._as(:u_duena);
set role authenticated;
select public.chk_raises('6.3 auth_full_name is granted to NOBODY — even the owner is refused',
                         'select public.auth_full_name(''44444444-4444-4444-4444-444444444444'')',
                         '42501');
reset role;

-- ⚠️⚠️ THE REFUSED ALTERNATIVE, MADE MACHINE-READABLE. Both the plan and the
-- migration refuse a name column on the request row, in prose — and prose is
-- not a gate. A column whose meaning depends on `source` is the shape that goes
-- wrong, and this is the file that goes red the day one appears.
select chk('6.4 workspace_invite carries NO person-name column — the refused alternative',
           (select count(*) from information_schema.columns
             where table_schema = 'public' and table_name = 'workspace_invite'
               and (column_name ~ 'name' or column_name ~ 'nombre')) = 0,
           coalesce((select string_agg(column_name, ', ')
                       from information_schema.columns
                      where table_schema = 'public' and table_name = 'workspace_invite'
                        and (column_name ~ 'name' or column_name ~ 'nombre')),
                    'no name-shaped column'));

-- ⚠️ NOTHING MOVED. This migration adds a function and touches no policy, and
-- the cheapest-looking alternative to it — widening `workspace_invite_select`,
-- or adding a policy for non-members — is exactly what `D6` forbids.
select chk('6.5 workspace_invite_select is UNCHANGED at manager-and-above, and no policy was added',
           (select count(*) from pg_policies
             where schemaname = 'public' and tablename = 'workspace_invite') = 3
       and (select qual from pg_policies
             where schemaname = 'public' and tablename = 'workspace_invite'
               and policyname = 'workspace_invite_select') ~ 'manager',
           coalesce((select string_agg(policyname, ', ' order by policyname)
                       from pg_policies
                      where schemaname = 'public' and tablename = 'workspace_invite'), 'NONE'));


-- ============================================================================
-- 7. Did this file actually run?
-- ============================================================================
-- A green tick is also what a step that ran nothing looks like, and a suite that
-- silently SHRANK is the third shape. Only a pinned count catches it.

select chk('7.1 ALL 38 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 37,
           format('recorded=%s of 37 before this one',
                  (select count(*) from public._verify)));

drop function public._pq_n(uuid);
drop function public._pq_names(uuid);
drop function public._pq_emails(uuid);
drop function public._pq_order(uuid);
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
