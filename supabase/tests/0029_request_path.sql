-- ============================================================================
-- Behavioural verification for 0029 — the pull path: request, approve, status
-- ============================================================================
-- ADR-035 §2.7 (amended 2026-09-13, C11.5 / C11.6), §2.8, §9.
-- docs/PLAN.md task 4.6a-iii.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0029_request_path.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `0027` was the shape and `0028` was the push. This is the pull the decision
-- maker asked for on 2026-09-13, and it is the half `D6`, `D7` and `D8` are
-- about — all three freeze when this migration merges.
--
-- ⚠️⚠️ SECTION 2.1 IS `D6`, AND IT IS THE ONLY CHECK HERE THAT RUNS UNDER THE
-- ROLE A CLIENT ACTUALLY HOLDS BECAUSE IT HAS TO. `D6` says a code is resolved
-- by a definer RPC and that NO POLICY PERMITS A SCAN. Asserting that structurally
-- — "`workspace` still has two policies" — is a claim about a catalog. 2.1 is the
-- claim itself: a signed-in non-member, under `set role authenticated`, selecting
-- `workspace` BY THE EXACT CODE THEY HOLD, and getting zero rows. The superuser
-- bypasses RLS, so a version of this check written without `set role` passes
-- against a table with no policies at all.
--
-- ⚠️⚠️ SECTION 6.4 IS WHAT `D4` RENAMED A COLUMN FOR, AND NOTHING ELSE IN THIS
-- REPOSITORY CAN ASSERT IT. On every other path `accepted_by` and the person who
-- decided are the same act; here approving and joining are two acts by two people,
-- so 6.4 requires `decided_by` to be the OWNER who approved and `accepted_by` to
-- be the JOINER who asked. `0027` found `D1` and `D4` in contradiction and kept
-- `D4` on the strength of exactly this row existing one day. This is that day.
--
-- ⚠️⚠️ SECTION 8.2 IS THE HOLE `S3` FOUND BY READING APPLIED SQL. A requester is
-- invisible to themselves: `workspace_invite_select` is manager-and-above and a
-- non-member's `my_role()` is null. 3.8 performs that — the requester, under
-- `set role authenticated`, cannot see the row they just wrote — and 8.2 is the
-- same caller, same role, reading it through `my_access_requests()`. The pair is
-- the argument for the function: without it `5b`'s join screen has nothing to
-- draw, and the cheapest-looking fix is the select policy `D6` forbids.
--
-- ⚠️ SECTION 4.4 IS `D7`'s ESCALATION HALF. The absorbed invite's role wins —
-- and since `request_access` has no role argument at all (decision 2), there is
-- no requested role for it to win against. 4.4 shows a `manager` invite absorbed
-- as `manager`, which is the owner's choice arriving intact.
--
-- ⚠️ NOTHING HERE ASSERTS `create_invite` OR `redeem_invite`. They are `0028`'s
-- and their suite stands. This file calls `create_invite` only to MAKE the
-- pending invite `D7` is about.
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

create function public.chk_succeeds(p_label text, p_sql text, p_detail text default '')
returns void language plpgsql as $$
begin
  execute p_sql;
  perform public.chk(p_label, true, p_detail);
exception when others then
  perform public.chk(p_label, false, 'RAISED ' || sqlstate || ': ' || sqlerrm);
end;
$$;
grant execute on function public.chk_succeeds(text, text, text) to authenticated;

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


-- ---------------------------------------------------------------- fixture ----
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('22222222-2222-2222-2222-222222222222', 'manager.a@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'owner.b@example.mx'),
  ('44444444-4444-4444-4444-444444444444', 'staff.a@example.mx'),
  ('55555555-5555-5555-5555-555555555555', 'pide@example.mx'),
  ('66666666-6666-6666-6666-666666666666', 'invitada@example.mx'),
  ('77777777-7777-7777-7777-777777777777', 'invitado.staff@example.mx'),
  ('88888888-8888-8888-8888-888888888888', 'otro.que.pide@example.mx'),
  ('99999999-9999-9999-9999-999999999999', 'nadie@example.mx');

\set owner_a  '''11111111-1111-1111-1111-111111111111'''
\set mgr_a    '''22222222-2222-2222-2222-222222222222'''
\set owner_b  '''33333333-3333-3333-3333-333333333333'''
\set staff_a  '''44444444-4444-4444-4444-444444444444'''
\set asker    '''55555555-5555-5555-5555-555555555555'''
\set invitee  '''66666666-6666-6666-6666-666666666666'''
\set inv_st   '''77777777-7777-7777-7777-777777777777'''
\set asker2   '''88888888-8888-8888-8888-888888888888'''
\set nobody   '''99999999-9999-9999-9999-999999999999'''

select public._as(:owner_a);
select onboard_workspace('Tienda A') as ws_a \gset
select public._as(:owner_b);
select onboard_workspace('Tienda B') as ws_b \gset
-- A workspace that has been switched off, for decision 4.
select onboard_workspace('Tienda Cerrada') as ws_c \gset
select public._as(null);

update public.workspace set is_active = false where id = :'ws_c';

insert into public.location (workspace_id, name)
values (:'ws_a', 'Sucursal Centro');

select code as code_a from public.workspace where id = :'ws_a' \gset
select code as code_c from public.workspace where id = :'ws_c' \gset
select id as loc_a1 from public.location
 where workspace_id = :'ws_a' and name = 'Tienda A' \gset
select id as loc_a2 from public.location
 where workspace_id = :'ws_a' and name = 'Sucursal Centro' \gset
select id as loc_b1 from public.location where workspace_id = :'ws_b' \gset

insert into public.workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :mgr_a,   'manager'),
  (:'ws_a', :staff_a, 'staff');


-- ============================================================================
-- 1. The three functions, the column, and who may call what
-- ============================================================================

select chk('1.1 request_access is callable by authenticated',
           has_function_privilege('authenticated', 'public.request_access(text)', 'execute'));

select chk('1.2 approve_request is callable by authenticated',
           has_function_privilege('authenticated',
             'public.approve_request(uuid, uuid[])', 'execute'));

select chk('1.3 my_access_requests is callable by authenticated',
           has_function_privilege('authenticated',
             'public.my_access_requests()', 'execute'));

select chk('1.4 anon may call none of the three',
           not has_function_privilege('anon', 'public.request_access(text)', 'execute')
       and not has_function_privilege('anon', 'public.approve_request(uuid, uuid[])', 'execute')
       and not has_function_privilege('anon', 'public.my_access_requests()', 'execute'));

select chk('1.5 all three are security definer',
           (select count(*) from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('request_access', 'approve_request', 'my_access_requests')
               and prosecdef) = 3);

select chk('1.6 all three carry an empty search_path',
           (select count(*) from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('request_access', 'approve_request', 'my_access_requests')
               and proconfig @> array['search_path=""']) = 3,
           (select string_agg(proname || ' ' || coalesce(array_to_string(proconfig, ','), 'NONE'), ' | ')
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('request_access', 'approve_request', 'my_access_requests')));

select chk('1.7 workspace_invite.requested_by exists and references auth.users',
           exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'workspace_invite'
                      and column_name = 'requested_by')
       and exists (select 1 from pg_constraint
                    where conrelid = 'public.workspace_invite'::regclass
                      and conname = 'workspace_invite_requested_by_consistent'));


-- ============================================================================
-- 2. D6 — the code resolves through the RPC and through nothing else
-- ============================================================================
-- ⚠️⚠️ 2.1 IS THE RULING ITSELF AND IT MUST RUN AS `authenticated`. The postgres
-- superuser bypasses RLS, so the same select as superuser returns the row and
-- proves nothing — it would pass against a `workspace` with no policies at all.

select public._as(:asker);
set role authenticated;

select chk('2.1 ⚠️ D6: a signed-in NON-MEMBER holding the exact code cannot select the '
           'workspace — no policy permits a scan',
           (select count(*) from public.workspace w where w.code = :'code_a') = 0,
           format('rows visible=%s', (select count(*) from public.workspace)));

select chk('2.2 and my_workspaces() is empty for them',
           (select count(*) from public.my_workspaces()) = 0);

reset role;

select chk('2.3 workspace still has exactly its two policies from 0001 — no scan policy '
           'arrived with the resolver',
           (select count(*) from pg_policy
             where polrelid = 'public.workspace'::regclass) = 2,
           (select string_agg(polname, ' ') from pg_policy
             where polrelid = 'public.workspace'::regclass));

-- ⚠️⚠️ `TD006` AND NOT `42501` AS OF 2026-09-22 — `0038`, TASK `5b.9`, AND THESE
-- THREE WENT RED ON A CORRECT TREE, WHICH IS WHAT THEY WERE FOR. `0029`'s own
-- decision 10 refused this code with `42501`, reusing "this is not yours" under
-- `4d-i`'s rule — and PostgREST raises the SAME `42501` to a caller with no
-- session, which `@/api/errors` maps app-wide to "sign in again". So the join
-- box could not tell a mistyped code from a lapsed session and had to GUESS.
-- `0038` minted `TD006` for exactly this branch on the owner's ruling. ⚠️ 2.7
-- below is UNCHANGED and that is the whole shape of the fix: the authentication
-- guard keeps `42501`, so after `0038` that code reaching this screen means one
-- thing. These three and 2.7 asserting the SAME state was the defect; them
-- asserting different ones is the cure, said by this file.
select chk_raises('2.4 a code nobody owns is refused',
  format('select public.request_access(%L)', 'ZZZZZZZZ'), 'TD006');

-- ⚠️ 2.5 is the anti-scan case in the RPC rather than in the policy: the resolver
-- takes the WHOLE code, so seven eighths of a real one is worth nothing.
select chk_raises('2.5 a SEVEN-character prefix of a real code resolves to nothing',
  format('select public.request_access(%L)', substr(:'code_a', 1, 7)), 'TD006');

select chk_raises('2.6 an empty code is refused before anything is looked up',
  $q$select public.request_access('  -- ')$q$, '22023');

select public._as(null);
select chk_raises('2.7 an unauthenticated caller may not ask',
  format('select public.request_access(%L)', :'code_a'), '42501');

-- Decision 4: same message, same sqlstate. "That shop has been switched off" is
-- a fact about a workspace, told to somebody who is not a member of it. ⚠️ That
-- sqlstate is `TD006` as of `0038` and the identity is the point — both halves
-- of the branch moved together, which `supabase/tests/0038` check 1.2 drives
-- because a migration that moved only the `not found` half would leave this one
-- on `42501` and 1.1 would still be green.
select public._as(:asker);
select chk_raises('2.8 an INACTIVE workspace is refused exactly as an unknown code is',
  format('select public.request_access(%L)', :'code_c'), 'TD006');

select chk_succeeds('2.9 a code typed in lower case and in groups resolves',
  format('select public.request_access(%L)',
         lower(substr(:'code_a',1,4) || '-' || substr(:'code_a',5,4))));


-- ============================================================================
-- 3. The ask, and the row it writes
-- ============================================================================
-- 2.9 already made this caller's request; 3.x reads it rather than re-making it.

select id as req_1 from public.workspace_invite
 where workspace_id = :'ws_a' and requested_by = :asker \gset

select chk('3.1 the row is a REQUEST: no token, no decider, and the asker recorded',
           (select source = 'request' and token_hash is null and decided_by is null
                   and requested_by = :asker::uuid and accepted_at is null
              from public.workspace_invite where id = :'req_1'::uuid));

select chk('3.2 it carries the caller''s OWN address, which they never passed in (S4)',
           (select email = 'pide@example.mx'
              from public.workspace_invite where id = :'req_1'::uuid),
           (select email::text from public.workspace_invite where id = :'req_1'::uuid));

select chk('3.3 the role is staff and no location is claimed — both are the owner''s to '
           'decide at approval (D8)',
           (select role = 'staff' and location_ids = '{}'::uuid[]
              from public.workspace_invite where id = :'req_1'::uuid));

select chk('3.4 it expires in seven days (D3)',
           (select expires_at between now() + interval '6 days 23 hours'
                                  and now() + interval '7 days 1 hour'
              from public.workspace_invite where id = :'req_1'::uuid));

-- Decision 5: the one-pending index would answer a second tap with 23505.
select public.request_access(:'code_a') as r2 \gset

select chk('3.5 asking twice returns the SAME pending row, not an error (decision 5)',
           (:'r2'::jsonb->>'status') = 'already_requested'
           and (:'r2'::jsonb->>'request_id') = :'req_1',
           :'r2');

select chk('3.6 and there is still exactly one request row for them',
           (select count(*) = 1 from public.workspace_invite
             where workspace_id = :'ws_a'::uuid and requested_by = :asker::uuid));

select chk('3.7 the result names the shop, so they can tell they typed the right code '
           '(decision 3)',
           (:'r2'::jsonb->>'workspace_name') = 'Tienda A');

-- A second person asking is a second row: the one-pending index is per email.
select public._as(:asker2);
select public.request_access(:'code_a') as r3 \gset
select chk('3.8 a different person asking gets their own row',
           (:'r3'::jsonb->>'status') = 'requested'
           and (:'r3'::jsonb->>'request_id') <> :'req_1');

-- An existing ACTIVE member is told the thing they wanted is already true.
select public._as(:staff_a);
select public.request_access(:'code_a') as r4 \gset
select chk('3.9 an existing member is told they are one, and no row is written',
           (:'r4'::jsonb->>'status') = 'already_member'
           and (select count(*) = 0 from public.workspace_invite
                 where requested_by = :staff_a::uuid));

-- ⚠️ THE HOLE S3 FOUND. The requester cannot see the row they just wrote, and no
-- policy will ever let them: workspace_invite_select is manager-and-above and a
-- non-member's my_role() is null. 8.2 is the same caller reading it the only way
-- they can.
select public._as(:asker);
set role authenticated;
select chk('3.10 ⚠️ S3: the requester cannot see their own request under RLS — no policy '
           'can ever show it to them',
           (select count(*) from public.workspace_invite) = 0);
reset role;


-- ============================================================================
-- 4. D7 — a pending invite is a request that arrived pre-approved
-- ============================================================================
-- §2.7 D7: "if a pending invite exists for that email, entering the code ACCEPTS
-- it … and is told none of it."

select public._as(:owner_a);
select public.create_invite(:'ws_a', 'invitada@example.mx', 'manager', '{}'::uuid[]) as i1 \gset
select (:'i1'::jsonb->>'invite_id') as inv_mgr \gset

select public._as(:invitee);
select public.request_access(:'code_a') as r5 \gset

select chk('4.1 entering the code with a pending invite JOINS, it does not ask',
           (:'r5'::jsonb->>'status') = 'joined',
           :'r5');

-- ⚠️ D7's ESCALATION HALF. The invite was for `manager`; request_access has no
-- role argument at all, so the owner's choice arrives intact and there is no
-- requested role for it to lose to.
select chk('4.2 ⚠️ the INVITE''s role wins — manager, which is what the owner chose',
           (:'r5'::jsonb->>'role') = 'manager'
           and (select role = 'manager' and is_active from public.workspace_member
                 where workspace_id = :'ws_a'::uuid and user_id = :invitee::uuid));

select chk('4.3 the invite is marked accepted BY THE JOINER (D4)',
           (select accepted_at is not null and accepted_by = :invitee::uuid
              from public.workspace_invite where id = :'inv_mgr'::uuid));

select chk('4.4 and NO request row was written — the ask never happened',
           (select count(*) = 0 from public.workspace_invite
             where requested_by = :invitee::uuid));

select chk('4.5 a manager holds no member_location row and sees both stores by role',
           (select count(*) from public.my_locations()) = 2
           and (select count(*) = 0 from public.member_location ml
                  join public.workspace_member wm on wm.id = ml.member_id
                 where wm.user_id = :invitee::uuid),
           format('%s location(s)', (select count(*) from public.my_locations())));

-- The staff half of the same ruling: the absorbed invite's locations come with it.
select public._as(:owner_a);
select public.create_invite(:'ws_a', 'invitado.staff@example.mx', 'staff',
                            array[:'loc_a2']::uuid[]) as i2 \gset

select public._as(:inv_st);
select public.request_access(:'code_a') as r6 \gset

select chk('4.6 a staff invite absorbed the same way brings its locations with it',
           (:'r6'::jsonb->>'status') = 'joined'
           and (:'r6'::jsonb->>'location_count')::int = 1
           and (select array_agg(l) = array[:'loc_a2']::uuid[] from public.my_locations() l),
           format('locations=%s', (select count(*) from public.my_locations())));

-- ⚠️ AN EXPIRED INVITE IS NOT ABSORBED, AND D3′ IS WHY IT DOES NOT BLOCK EITHER.
-- Before 0027 the lapsed row held the one-pending slot forever, so the person it
-- was issued to could never ask.
select public._as(:owner_a);
select public.create_invite(:'ws_a', 'nadie@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as i3 \gset
select (:'i3'::jsonb->>'invite_id') as inv_old \gset

update public.workspace_invite
   set expires_at = now() - interval '1 day',
       created_at = now() - interval '8 days'
 where id = :'inv_old'::uuid;

select public._as(:nobody);
select public.request_access(:'code_a') as r7 \gset

select (:'r7'::jsonb->>'request_id') as req_3 \gset

select chk('4.7 an EXPIRED invite is not absorbed — they ask, like anyone else',
           (:'r7'::jsonb->>'status') = 'requested',
           :'r7');

select chk('4.8 and D3′ superseded it, so the lapsed row did not hold the slot against '
           'the person it was issued to',
           (select superseded_at is not null
              from public.workspace_invite where id = :'inv_old'::uuid));


-- ============================================================================
-- 5. approve_request — everything it refuses
-- ============================================================================

select public._as(:staff_a);
select chk_raises('5.1 a staff member may not approve',
  format('select public.approve_request(%L, array[%L]::uuid[])', :'req_1', :'loc_a1'), '42501');

-- ⚠️ 5.2 IS THE ASYMMETRY WITH create_invite, AND IT IS DELIBERATE. A manager may
-- INVITE (0002:567 lets them insert into workspace_invite) and may not APPROVE:
-- this writes workspace_member and member_location, whose insert policies are
-- both owner-only (0001), which is also what §2.7's capability table says.
select public._as(:mgr_a);
select chk_raises('5.2 ⚠️ a MANAGER may not approve, though a manager may invite',
  format('select public.approve_request(%L, array[%L]::uuid[])', :'req_1', :'loc_a1'), '42501');

select public._as(:owner_b);
select chk_raises('5.3 an owner of another workspace may not approve',
  format('select public.approve_request(%L, array[%L]::uuid[])', :'req_1', :'loc_a1'), '42501');

select public._as(null);
select chk_raises('5.4 an unauthenticated caller may not approve',
  format('select public.approve_request(%L, array[%L]::uuid[])', :'req_1', :'loc_a1'), '42501');

select public._as(:owner_a);
select chk_raises('5.5 an id nobody issued is refused, and says nothing about whose it is',
  format('select public.approve_request(%L, array[%L]::uuid[])',
         '00000000-0000-0000-0000-000000000000', :'loc_a1'), '42501');

select chk_raises('5.6 an INVITE''s id is not a request and is refused',
  format('select public.approve_request(%L, array[%L]::uuid[])', :'inv_old', :'loc_a1'), '42501');

-- ⚠️ D8. The reason it is a refusal and not a default: RLS refuses a
-- location-less staff member SILENTLY, so the app simply stops working for them.
select chk_raises('5.7 ⚠️ D8: approving a STAFF request with no location is refused',
  format('select public.approve_request(%L, ''{}''::uuid[])', :'req_1'), '22023');

select chk_raises('5.8 a location from another workspace is refused',
  format('select public.approve_request(%L, array[%L]::uuid[])', :'req_1', :'loc_b1'), '22023');


-- ============================================================================
-- 6. approve_request — the approval, and the act D4 renamed a column for
-- ============================================================================

select public.approve_request(:'req_1', array[:'loc_a2']::uuid[]) as a1 \gset

select chk('6.1 it reports an approval at the requested role',
           (:'a1'::jsonb->>'status') = 'approved'
           and (:'a1'::jsonb->>'role') = 'staff'
           and (:'a1'::jsonb->>'location_count')::int = 1,
           :'a1');

select chk('6.2 the membership exists, active, at that role',
           (select count(*) = 1 from public.workspace_member
             where workspace_id = :'ws_a'::uuid and user_id = :asker::uuid
               and role = 'staff' and is_active));

select chk('6.3 member_location holds exactly the store the owner chose',
           (select array_agg(ml.location_id) = array[:'loc_a2']::uuid[]
              from public.member_location ml
              join public.workspace_member wm on wm.id = ml.member_id
             where wm.user_id = :asker::uuid));

-- ⚠️⚠️ THE ONE NOTHING ELSE IN THIS REPOSITORY CAN ASSERT. Two acts, two people,
-- one row: `decided_by` is the owner who approved, `accepted_by` is the joiner who
-- asked. `0027` kept D4 over a literal reading of D1 on the strength of this.
select chk('6.4 ⚠️ D4: decided_by is the APPROVER and accepted_by is the REQUESTER',
           (select decided_by = :owner_a::uuid and accepted_by = :asker::uuid
                   and accepted_at is not null
              from public.workspace_invite where id = :'req_1'::uuid),
           (select format('decided_by=%s accepted_by=%s', decided_by, accepted_by)
              from public.workspace_invite where id = :'req_1'::uuid));

select chk('6.5 the row records which locations were granted',
           (select location_ids = array[:'loc_a2']::uuid[]
              from public.workspace_invite where id = :'req_1'::uuid));

select public._as(:asker);
select chk('6.6 the joiner''s my_locations() is exactly that store, out of the two the '
           'workspace has',
           (select array_agg(l) = array[:'loc_a2']::uuid[] from public.my_locations() l),
           format('locations=%s of %s', (select count(*) from public.my_locations()),
                  (select count(*) from public.location where workspace_id = :'ws_a'::uuid)));

select chk('6.7 and their my_workspaces() is exactly Tienda A',
           (select array_agg(w) = array[:'ws_a']::uuid[] from public.my_workspaces() w));

select public._as(:owner_a);
select public.approve_request(:'req_1', array[:'loc_a1']::uuid[]) as a2 \gset

select chk('6.8 approving twice is idempotent, not a second membership',
           (:'a2'::jsonb->>'status') = 'already_approved'
           and (:'a2'::jsonb->>'member_id') = (:'a1'::jsonb->>'member_id')
           and (select count(*) = 1 from public.workspace_member
                 where workspace_id = :'ws_a'::uuid and user_id = :asker::uuid));

select chk('6.9 and the second call changed no location — the first approval stands',
           (select location_ids = array[:'loc_a2']::uuid[]
              from public.workspace_invite where id = :'req_1'::uuid));


-- ============================================================================
-- 7. approve_request — the requests nobody can approve any more
-- ============================================================================

select id as req_2 from public.workspace_invite
 where workspace_id = :'ws_a' and requested_by = :asker2 \gset

update public.workspace_invite
   set expires_at = now() - interval '1 minute',
       created_at = now() - interval '8 days'
 where id = :'req_2'::uuid;

select chk_raises('7.1 an expired request raises TD003 — a workflow, not a defect',
  format('select public.approve_request(%L, array[%L]::uuid[])', :'req_2', :'loc_a1'), 'TD003');

update public.workspace_invite
   set expires_at = now() + interval '7 days',
       superseded_at = now()
 where id = :'req_2'::uuid;

select chk_raises('7.2 a superseded request raises TD003 as well',
  format('select public.approve_request(%L, array[%L]::uuid[])', :'req_2', :'loc_a1'), 'TD003');

select chk('7.3 and neither refusal wrote a membership',
           (select count(*) = 0 from public.workspace_member
             where workspace_id = :'ws_a'::uuid and user_id = :asker2::uuid));


-- ============================================================================
-- 8. my_access_requests — the row no policy can ever show them
-- ============================================================================
-- Ruled in by the owner on 2026-09-13: "keep the status read".

select public._as(:asker);
set role authenticated;

-- ⚠️⚠️ 8.1 AND 8.2 ARE THE PAIR. 3.10 showed this caller sees nothing of
-- workspace_invite under this very role; this is the same caller, the same role,
-- reading their own history through the only door there is.
select chk('8.1 ⚠️ S3 CLOSED: the joiner reads their own request under RLS',
           (select count(*) from public.my_access_requests()) = 1,
           format('%s row(s)', (select count(*) from public.my_access_requests())));

-- ⚠️ THE ROW IS NAMED, NOT ASSUMED TO BE THE ONLY ONE. The first spelling read
-- `(select status from my_access_requests())` as a scalar, and a mutation that
-- let this caller acquire a SECOND request killed the file on "more than one row
-- returned by a subquery" — three sections below the check written for it, which
-- never got to report. A detail expression must not be able to abort the run.
select chk('8.2 it names the shop and the state, which is all a join screen needs',
           (select workspace_name = 'Tienda A' and status = 'approved'
                   and decided_at is not null and role = 'staff'
              from public.my_access_requests() where request_id = :'req_1'::uuid),
           (select format('%s / %s', workspace_name, status)
              from public.my_access_requests() where request_id = :'req_1'::uuid));

reset role;

select public._as(:asker2);
set role authenticated;

-- ⚠️ SPELLED AS TWO EXISTENCE CLAIMS, NOT AS A SCALAR READ. "They see one row and
-- it is theirs" and "they do not see the other person's" are different sentences,
-- and only the second one fails when the WHERE clause keying this function on the
-- caller is removed. The scalar spelling ABORTED the file on "more than one row
-- returned by a subquery" instead — measured under G10, which is that exact
-- mutation. A check that dies cannot name what it caught.
select chk('8.3 another person sees THEIR row and NOT the first person''s',
           (select count(*) from public.my_access_requests()) = 1
           and exists (select 1 from public.my_access_requests()
                        where request_id = :'req_2'::uuid)
           and not exists (select 1 from public.my_access_requests()
                            where request_id = :'req_1'::uuid),
           format('%s row(s) visible', (select count(*) from public.my_access_requests())));

select chk('8.4 and the superseded one reads as superseded, not as pending',
           (select status = 'superseded' from public.my_access_requests()
             where request_id = :'req_2'::uuid),
           (select status from public.my_access_requests()
             where request_id = :'req_2'::uuid));

reset role;

-- Decision 9: requests, not invites. `:invitee` was INVITED and then absorbed —
-- they never asked, so they have no request to read.
select public._as(:invitee);
set role authenticated;
select chk('8.5 an invite absorbed through D7 is NOT a request and does not appear '
           '(decision 9)',
           (select count(*) from public.my_access_requests()) = 0);
reset role;

select public._as(:nobody);
set role authenticated;
-- ⚠️ KEYED ON THE ROW'S OWN ID, like 8.2 and 8.4. Keying it on the WORKSPACE was
-- not enough: G10 — the mutation that drops this function's `where requested_by =
-- auth.uid()` — makes every request in Tienda A visible to this caller, and a
-- scalar read over them aborts the file two checks after the one written for it.
select chk('8.6 a pending request reads as pending, with no decision date',
           (select status = 'pending' and decided_at is null
              from public.my_access_requests() where request_id = :'req_3'::uuid),
           (select status from public.my_access_requests()
             where request_id = :'req_3'::uuid));
reset role;

select public._as(:mgr_a);
set role authenticated;
select chk('8.7 somebody who has never asked gets no rows, not somebody else''s',
           (select count(*) from public.my_access_requests()) = 0);
reset role;

select public._as(null);


-- ============================================================================
-- 9. What 0029 did NOT add
-- ============================================================================

select chk('9.1 workspace_invite still has exactly its three policies from 0002',
           (select count(*) from pg_policy
             where polrelid = 'public.workspace_invite'::regclass) = 3,
           (select string_agg(polname, ' ') from pg_policy
             where polrelid = 'public.workspace_invite'::regclass));

select chk('9.2 still no UPDATE policy — approval is the definer''s act and nobody else''s',
           not exists (select 1 from pg_policy
                        where polrelid = 'public.workspace_invite'::regclass
                          and polcmd = 'w'));

select chk('9.3 member_location and workspace_member kept their owner-only insert '
           'policies — 0029 widened nothing to make approval work',
           (select count(*) from pg_policy
             where polrelid in ('public.workspace_member'::regclass,
                                'public.member_location'::regclass)
               and polcmd = 'a'
               and pg_get_expr(polwithcheck, polrelid) like '%owner%') = 2);

-- The new constraint, from both sides.
select chk_raises('9.4 an INVITE row carrying a requester is refused',
  format($q$insert into public.workspace_invite
              (workspace_id, email, source, decided_by, token_hash, requested_by)
            values (%L, 'x@example.mx', 'invite', %L, 'algun-hash', %L)$q$,
         :'ws_a', :owner_a, :asker), '23514');

select chk_raises('9.5 a REQUEST row with no requester is refused',
  format($q$insert into public.workspace_invite (workspace_id, email, source)
            values (%L, 'y@example.mx', 'request')$q$, :'ws_a'), '23514');


-- ============================================================================
-- 10. The count
-- ============================================================================
-- A section that silently did not run prints nothing and fails nothing. The
-- literal is deliberately a literal.

-- 7 + 9 + 10 + 8 + 8 + 9 + 3 + 7 + 5 = 66, and this one makes 67.
select chk('10.1 ALL 67 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 66,
           format('recorded=%s of 66 before this one',
                  (select count(*) from public._verify)));

drop function public.chk_raises(text, text, text);
drop function public.chk_succeeds(text, text, text);
drop function public._as(uuid);


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
