-- ============================================================================
-- Behavioural verification for 0028 — the push path: create_invite / redeem_invite
-- ============================================================================
-- ADR-035 §2.7 (amended 2026-09-13, C11.5 / C11.6), §2.8, §9.
-- docs/PLAN.md task 4.6a-ii.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0028_invite_path.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `0027` shipped the table and the helpers and could assert nothing about a
-- flow, because there was no call to make. This file is the flow: two RPCs, and
-- the first membership this database has ever written for somebody who was not
-- the person who created the workspace.
--
-- ⚠️⚠️ SECTION 5.7 IS THE ONE THAT MATTERS MOST, AND IT IS NOT ABOUT THIS
-- MIGRATION'S OWN ROWS. Everything else here can pass against a `redeem_invite`
-- that writes plausible rows nobody can use. 5.7 signs in AS THE JOINER and asks
-- `my_locations()` — the function every policy in this schema is built on — and
-- requires the answer to be EXACTLY the locations the invite named, out of the
-- two that workspace has. A redemption that wrote no `member_location` row, or
-- wrote it against the wrong member, passes 5.2 and 5.3 and fails here.
--
-- ⚠️⚠️ SECTION 4 PROVES THE BUG BEFORE IT PROVES THE WIRING, which is `0027`
-- section 8's shape and is here for a different reason: `0027` proved the HELPER
-- frees the slot, and this file proves the RPC CALLS IT. 4.1 performs the
-- failure — a direct insert for an address whose invite lapsed is refused
-- `23505` — and 4.2 is `create_invite` for that same address succeeding. Without
-- 4.1, section 4 would pass against a schema that had simply dropped the unique
-- index, and `D3′` would be satisfied by a database that had lost the invariant
-- it exists to protect.
--
-- ⚠️ SECTION 8.2 IS THE PREMISE OF DECISION 1, ASSERTED RATHER THAN ARGUED. The
-- migration says `create_invite` cannot run "under normal RLS" as §2.7's
-- pre-amendment prose has it, because superseding is an UPDATE and
-- `workspace_invite` has no UPDATE policy. 8.2 puts an OWNER of the workspace
-- under `set role authenticated` and has them try exactly that UPDATE: it
-- affects ZERO rows and raises nothing. A silent no-op is what the invoker
-- spelling would have shipped.
--
-- ⚠️⚠️ SECTION 6.9 IS AN OWNER'S RULING, NOT A SESSION'S JUDGEMENT — *"do what you
-- recommend"*, 2026-09-13, the day `0028` merged. A joiner whose signed-in address
-- is not the address the invite was written to is admitted, and `accepted_by`
-- records who actually walked through the door. **6.9 and 6.10 are the only thing
-- in this repository holding that ruling**: no constraint can express it, because
-- it is the ABSENCE of a comparison. A later session adding the email check that
-- looks like a hardening turns them red, and the message is what says whose
-- decision it was undoing.
--
-- ⚠️ NOTHING ABOUT request_access, approve_request OR my_access_requests. None
-- of them exists: they are `0029` (4.6a-iii). The one place this file touches
-- the pull path is 4.9/4.10, where a hand-written `source = 'request'` row —
-- the only kind that can exist before `0029` — proves `create_invite` refuses to
-- absorb a live one and supersedes an expired one.
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

-- Who is calling. Every fence in this file is read off auth.uid(), which comes
-- from this GUC — so the actor is always set by its own statement, never inside
-- a chk_raises string, because a caught exception rolls the setting back with it.
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
  ('55555555-5555-5555-5555-555555555555', 'joiner@example.mx'),
  ('66666666-6666-6666-6666-666666666666', 'otra.cuenta@example.mx'),
  ('77777777-7777-7777-7777-777777777777', 'tecleado@example.mx');

\set owner_a  '''11111111-1111-1111-1111-111111111111'''
\set mgr_a    '''22222222-2222-2222-2222-222222222222'''
\set owner_b  '''33333333-3333-3333-3333-333333333333'''
\set staff_a  '''44444444-4444-4444-4444-444444444444'''
\set joiner   '''55555555-5555-5555-5555-555555555555'''
\set other    '''66666666-6666-6666-6666-666666666666'''
\set typist   '''77777777-7777-7777-7777-777777777777'''

select public._as(:owner_a);
select onboard_workspace('Tienda A') as ws_a \gset
select public._as(:owner_b);
select onboard_workspace('Tienda B') as ws_b \gset
select public._as(null);

-- A second store in A, so "which locations" is a question with a wrong answer.
insert into public.location (workspace_id, name)
values (:'ws_a', 'Sucursal Centro');

select id as loc_a1 from public.location
 where workspace_id = :'ws_a' and name = 'Tienda A' \gset
select id as loc_a2 from public.location
 where workspace_id = :'ws_a' and name = 'Sucursal Centro' \gset
select id as loc_b1 from public.location
 where workspace_id = :'ws_b' \gset

-- A manager and a staff member of A, so the fence has both sides to refuse.
insert into public.workspace_member (workspace_id, user_id, role) values
  (:'ws_a', :mgr_a,   'manager'),
  (:'ws_a', :staff_a, 'staff');

insert into public.member_location (workspace_id, member_id, location_id)
select :'ws_a', wm.id, :'loc_a1'
  from public.workspace_member wm
 where wm.workspace_id = :'ws_a' and wm.user_id = :staff_a;


-- ============================================================================
-- 1. The four objects, and who may call them
-- ============================================================================
-- ⚠️ 1.3 and 1.4 are the pair `0027`'s G1 was found by. EXECUTE is granted to
-- PUBLIC by default, so a migration that only `grant`s hands `anon` whatever it
-- just wrote and no line of it says so. `hash_invite_token` reachable by a
-- client is an OFFLINE ORACLE: a caller could confirm a guessed token without
-- spending it, which is the thing 80 bits is defending.

select chk('1.1 create_invite is callable by authenticated',
           has_function_privilege('authenticated',
             'public.create_invite(uuid, public.citext, public.workspace_role, uuid[])',
             'execute'));

select chk('1.2 redeem_invite is callable by authenticated',
           has_function_privilege('authenticated', 'public.redeem_invite(text)', 'execute'));

select chk('1.3 generate_invite_token is NOT callable by authenticated',
           not has_function_privilege('authenticated',
             'public.generate_invite_token()', 'execute'));

select chk('1.4 hash_invite_token is NOT callable by authenticated — it would be an '
           'offline oracle',
           not has_function_privilege('authenticated',
             'public.hash_invite_token(text)', 'execute'));

select chk('1.5 anon may call neither RPC',
           not has_function_privilege('anon',
             'public.create_invite(uuid, public.citext, public.workspace_role, uuid[])',
             'execute')
       and not has_function_privilege('anon', 'public.redeem_invite(text)', 'execute'));

select chk('1.6 both RPCs are security definer',
           (select bool_and(prosecdef) from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('create_invite', 'redeem_invite')),
           (select string_agg(proname || '=' || prosecdef::text, ' ') from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('create_invite', 'redeem_invite')));

select chk('1.7 all four carry an empty search_path',
           (select count(*) from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('create_invite', 'redeem_invite',
                               'generate_invite_token', 'hash_invite_token')
               -- ⚠️ `search_path=""`, with the quotes: that is how the empty
               -- string is spelled in pg_proc.proconfig, and matching
               -- `search_path=` instead passes on NOTHING while looking right.
               and proconfig @> array['search_path=""']) = 4,
           (select string_agg(proname || ' ' || coalesce(array_to_string(proconfig, ','), 'NONE'), ' | ')
              from pg_proc
             where pronamespace = 'public'::regnamespace
               and proname in ('create_invite', 'redeem_invite',
                               'generate_invite_token', 'hash_invite_token')));


-- ============================================================================
-- 2. The token, and the hash that is the only copy kept
-- ============================================================================
-- 200 draws, not one, for `0027` section 2's reason: a generator with a stuck
-- byte or an off-by-one on `substr` returns a perfectly-shaped token every time.

create temp table gen as
  select public.generate_invite_token() as token from generate_series(1, 200);

select chk('2.1 200 generated tokens are 16 Crockford characters',
           not exists (select 1 from gen where token !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$'),
           format('%s bad', (select count(*) from gen
                              where token !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$')));

select chk('2.2 200 generated tokens are all distinct',
           (select count(distinct token) from gen) = 200,
           format('distinct=%s of 200', (select count(distinct token) from gen)));

select chk('2.3 the 3200 generated characters use all 32 and only those 32',
           (select count(distinct c) from gen,
                   lateral unnest(string_to_array(token, null)) as c) = 32
           and not exists (select 1 from gen where token ~ '[ILOU]'),
           format('%s distinct characters',
                  (select count(distinct c) from gen,
                          lateral unnest(string_to_array(token, null)) as c)));

select chk('2.4 the hash is 64 hex characters and is not the token',
           (select bool_and(public.hash_invite_token(token) ~ '^[0-9a-f]{64}$'
                        and public.hash_invite_token(token) <> token) from gen));

select chk('2.5 hashing is deterministic',
           (select bool_and(public.hash_invite_token(token) = public.hash_invite_token(token))
              from gen));

select chk('2.6 distinct tokens hash distinctly',
           (select count(distinct public.hash_invite_token(token)) from gen) = 200);

-- 2.7 and 2.8 are decision 4: the normaliser is INSIDE the hash, so a token
-- written down in groups and typed in lower case reaches the same row.
select chk('2.7 a token typed in lower case and in groups hashes IDENTICALLY',
           (select bool_and(
                     public.hash_invite_token(
                       lower(substr(token,1,4) || '-' || substr(token,5,4) || ' ' ||
                             substr(token,9,4) || '-' || substr(token,13,4)))
                     = public.hash_invite_token(token))
              from gen));

select chk('2.8 every generated token normalises to ITSELF (no I, L or O in it)',
           not exists (select 1 from gen
                        where public.normalize_workspace_code(token) is distinct from token));


-- ============================================================================
-- 3. create_invite — the fence, and what it refuses to write
-- ============================================================================

select public._as(:staff_a);
select chk_raises('3.1 a staff member may not invite',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', 'nuevo@example.mx', 'staff', :'loc_a1'), '42501');

select public._as(:owner_b);
select chk_raises('3.2 an owner of ANOTHER workspace may not invite into this one',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', 'nuevo@example.mx', 'staff', :'loc_a1'), '42501');

select public._as(null);
select chk_raises('3.3 an unauthenticated caller may not invite',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', 'nuevo@example.mx', 'staff', :'loc_a1'), '42501');

select public._as(:mgr_a);
select chk_succeeds('3.4 a manager may invite staff',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', 'porelmanager@example.mx', 'staff', :'loc_a1'));

select chk_succeeds('3.5 a manager may invite a manager',
  format('select public.create_invite(%L, %L, %L, ''{}''::uuid[])',
         :'ws_a', 'otromanager@example.mx', 'manager'));

-- Decision 9. §2.7's capability table gives members and roles to the owner
-- alone; 0002:567 lets a manager insert the row. The narrowest reading that
-- keeps both true is that a manager may not mint an owner.
select chk_raises('3.6 a manager may NOT invite an owner',
  format('select public.create_invite(%L, %L, %L, ''{}''::uuid[])',
         :'ws_a', 'nuevodueno@example.mx', 'owner'), '42501');

select public._as(:owner_a);
select chk_succeeds('3.7 an owner may invite an owner',
  format('select public.create_invite(%L, %L, %L, ''{}''::uuid[])',
         :'ws_a', 'nuevodueno@example.mx', 'owner'));

select chk_raises('3.8 a location belonging to another workspace is refused',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', 'ajeno@example.mx', 'staff', :'loc_b1'), '22023');

-- Decision 8. The reasoning is D8's and D8 itself stays in 0029: staff write
-- only where member_location puts them, and RLS refuses the rest SILENTLY, so
-- an approved joiner with no locations opens the app to an inexplicable wall.
select chk_raises('3.9 a staff invite naming NO location is refused',
  format('select public.create_invite(%L, %L, %L, ''{}''::uuid[])',
         :'ws_a', 'sinsucursal@example.mx', 'staff'), '22023');

select chk_raises('3.10 a blank email is refused',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', '   ', 'staff', :'loc_a1'), '22023');

select chk_raises('3.11 something that is not an address is refused',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', 'juan', 'staff', :'loc_a1'), '22023');

-- The row the RPC actually wrote, read back.
select public.create_invite(:'ws_a', 'shape@example.mx', 'staff',
                            array[:'loc_a1', :'loc_a1', :'loc_a2']::uuid[]) as r \gset
select (:'r'::jsonb->>'token') as tok_shape \gset
select (:'r'::jsonb->>'invite_id') as inv_shape \gset

select chk('3.12 the returned token is 16 Crockford characters',
           :'tok_shape' ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$', :'tok_shape');

select chk('3.13 the row stores the HASH of that token and not the token',
           (select token_hash = public.hash_invite_token(:'tok_shape')
                   and token_hash <> :'tok_shape'
              from public.workspace_invite where id = :'inv_shape'::uuid));

select chk('3.14 the token appears in no column of the row it created',
           not exists (select 1 from public.workspace_invite wi
                        where wi.id = :'inv_shape'::uuid
                          and wi::text like '%' || :'tok_shape' || '%'));

select chk('3.15 source is invite and decided_by is the inviter (D1, D4)',
           (select source = 'invite' and decided_by = :owner_a::uuid
                   and accepted_at is null and accepted_by is null
              from public.workspace_invite where id = :'inv_shape'::uuid));

select chk('3.16 the duplicate location was deduplicated, both stores kept',
           (select location_ids @> array[:'loc_a1', :'loc_a2']::uuid[]
                   and cardinality(location_ids) = 2
              from public.workspace_invite where id = :'inv_shape'::uuid),
           (select cardinality(location_ids)::text
              from public.workspace_invite where id = :'inv_shape'::uuid));

select chk('3.17 it expires in seven days (D3)',
           (select expires_at between now() + interval '6 days 23 hours'
                                  and now() + interval '7 days 1 hour'
              from public.workspace_invite where id = :'inv_shape'::uuid));

-- Decision 8's converse: 0002:377 says empty for a manager or owner, who get
-- every location from my_locations() by role. A row here would outlive a
-- demotion and grant a location nobody granted.
-- ⚠️ THE ADDRESS IS `:other`'s OWN, and that is not decoration. This invite is
-- redeemed at 5.9 by that user, and an address they do not hold would make 5.9 a
-- second, INCIDENTAL test of the 2026-09-13 ruling — so a session reversing that
-- ruling would be stopped three sections before the check that names it, and told
-- nothing about whose decision it was undoing. Measured: F11 aborted here until
-- this line was re-signed.
select public.create_invite(:'ws_a', 'otra.cuenta@example.mx', 'manager',
                            array[:'loc_a1']::uuid[]) as r2 \gset
select (:'r2'::jsonb->>'invite_id') as inv_mgr \gset
select (:'r2'::jsonb->>'token') as tok_mgr \gset

select chk('3.18 a manager invite stores NO locations, whatever was passed',
           (select location_ids = '{}'::uuid[]
              from public.workspace_invite where id = :'inv_mgr'::uuid),
           (select location_ids::text from public.workspace_invite
             where id = :'inv_mgr'::uuid));


-- ============================================================================
-- 4. D3′ IS WIRED — and the bug is performed before the fix is
-- ============================================================================
-- `0027` proved that `supersede_expired_invite` frees the slot. This proves that
-- `create_invite` CALLS it, which is the whole of what §2.7's D3 asks of the
-- creating RPC and the one thing no amount of reading the helper can show.

insert into public.workspace_invite
  (workspace_id, email, role, location_ids, source, decided_by, token_hash,
   expires_at, created_at)
values
  (:'ws_a', 'lapsada@example.mx', 'staff', array[:'loc_a1']::uuid[], 'invite',
   :owner_a, public.hash_invite_token('LAPSADOLAPSADO12'),
   now() - interval '23 days', now() - interval '30 days');

select chk_raises('4.1 THE BUG: the lapsed row still holds the one-pending slot, so a '
                  'direct insert is refused',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, location_ids, source, decided_by, token_hash)
            values (%L, %L, 'staff', array[%L]::uuid[], 'invite', %L, 'otro-hash')$q$,
         :'ws_a', 'lapsada@example.mx', :'loc_a1', :owner_a), '23505');

select public.create_invite(:'ws_a', 'lapsada@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r3 \gset
select (:'r3'::jsonb->>'token') as tok_new \gset

select chk('4.2 THE FIX: create_invite for the same address SUCCEEDS',
           :'r3'::jsonb->>'invite_id' is not null,
           :'r3'::jsonb->>'superseded_count');

select chk('4.3 the lapsed row is stamped superseded_at, not deleted (0002''s audit trail)',
           (select count(*) = 1 from public.workspace_invite
             where email = 'lapsada@example.mx' and superseded_at is not null),
           format('%s row(s) for that address',
                  (select count(*) from public.workspace_invite
                    where email = 'lapsada@example.mx')));

select chk('4.4 the result reports the supersession it performed',
           (:'r3'::jsonb->>'superseded_count')::int = 1
           and (:'r3'::jsonb->>'replaced_pending')::boolean = false);

-- Decision 6: the row D3′ does NOT cover. "I sent it, they never got it, send it
-- again" is what a shop does, and refusing costs a human step.
select public.create_invite(:'ws_a', 'lapsada@example.mx', 'staff',
                            array[:'loc_a2']::uuid[]) as r4 \gset
select (:'r4'::jsonb->>'token') as tok_newer \gset

select chk('4.5 a LIVE pending invite for the same address is replaced, not refused',
           (:'r4'::jsonb->>'replaced_pending')::boolean = true
           and (:'r4'::jsonb->>'superseded_count')::int = 0);

select chk('4.6 exactly one live row remains for that address',
           (select count(*) = 1 from public.workspace_invite
             where email = 'lapsada@example.mx'
               and accepted_at is null and superseded_at is null));

select public._as(:joiner);
select chk_raises('4.7 the REPLACED token no longer works',
  format('select public.redeem_invite(%L)', :'tok_new'), 'TD003');
select public._as(:owner_a);

-- Decision 7: the one case handed to 0029. Inviting someone who has already
-- asked is an APPROVAL, and approval carries D8. No such row can exist until
-- 0029 applies; this one is written by hand for exactly that reason.
insert into public.workspace_invite
  (workspace_id, email, role, location_ids, source, decided_by, token_hash)
values
  (:'ws_a', 'pidio@example.mx', 'staff', '{}'::uuid[], 'request', null, null);

select chk_raises('4.8 a LIVE pending REQUEST is refused — approving it is 0029''s job',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', 'pidio@example.mx', 'staff', :'loc_a1'), '22023');

update public.workspace_invite
   set expires_at = now() - interval '1 day',
       created_at = now() - interval '8 days'
 where email = 'pidio@example.mx';

select chk_succeeds('4.9 an EXPIRED request is superseded like any other lapsed row',
  format('select public.create_invite(%L, %L, %L, array[%L]::uuid[])',
         :'ws_a', 'pidio@example.mx', 'staff', :'loc_a1'));

select chk('4.10 and the expired request row was stamped, not removed',
           (select count(*) = 1 from public.workspace_invite
             where email = 'pidio@example.mx' and source = 'request'
               and superseded_at is not null));


-- ============================================================================
-- 5. redeem_invite — the membership, and what RLS then says about it
-- ============================================================================
-- 5.7 is the claim this whole task exists to make true. Everything above it
-- describes rows; this asks the function every policy in the schema is built on.

select public.create_invite(:'ws_a', 'joiner@example.mx', 'staff',
                            array[:'loc_a2']::uuid[]) as r5 \gset
select (:'r5'::jsonb->>'token') as tok_join \gset
select (:'r5'::jsonb->>'invite_id') as inv_join \gset

select public._as(:joiner);
select public.redeem_invite(:'tok_join') as r6 \gset

select chk('5.1 redemption reports a first redemption and a new membership',
           (:'r6'::jsonb->>'already_redeemed')::boolean = false
           and (:'r6'::jsonb->>'membership_existed')::boolean = false
           and (:'r6'::jsonb->>'workspace_name') = 'Tienda A',
           :'r6');

select chk('5.2 the workspace_member row exists, active, with the invited role',
           (select count(*) = 1 from public.workspace_member
             where workspace_id = :'ws_a'::uuid and user_id = :joiner::uuid
               and role = 'staff' and is_active));

select chk('5.3 member_location holds EXACTLY the invited store',
           (select array_agg(ml.location_id) = array[:'loc_a2']::uuid[]
              from public.member_location ml
              join public.workspace_member wm on wm.id = ml.member_id
             where wm.user_id = :joiner::uuid),
           (select count(*)::text from public.member_location ml
              join public.workspace_member wm on wm.id = ml.member_id
             where wm.user_id = :joiner::uuid));

select chk('5.4 the invite is marked accepted BY THE CALLER (D4)',
           (select accepted_at is not null and accepted_by = :joiner::uuid
              from public.workspace_invite where id = :'inv_join'::uuid));

select chk('5.5 decided_by is untouched — it is the inviter, not the joiner (D4)',
           (select decided_by = :owner_a::uuid
              from public.workspace_invite where id = :'inv_join'::uuid));

select chk('5.6 the joiner''s my_workspaces() is exactly Tienda A',
           (select array_agg(w) = array[:'ws_a']::uuid[] from public.my_workspaces() w));

-- ⚠️⚠️ THE ONE THAT MATTERS. Workspace A has TWO stores and the invite named one.
-- A redemption that wrote no member_location row, or wrote it against the wrong
-- member id, passes every check above and fails this one.
select chk('5.7 the joiner''s my_locations() is exactly the invited store, out of two',
           (select array_agg(l) = array[:'loc_a2']::uuid[] from public.my_locations() l),
           format('locations=%s of %s in the workspace',
                  (select count(*) from public.my_locations()),
                  (select count(*) from public.location where workspace_id = :'ws_a'::uuid)));

select chk('5.8 the result counted the member_location rows it wrote',
           (:'r6'::jsonb->>'location_count')::int = 1);

-- A manager redeems, holds NO member_location row, and sees every store by role
-- (0002:377, §2.7's fail-closed rule).
select public._as(:other);
select public.redeem_invite(:'tok_mgr') as r7 \gset

select chk('5.9 a manager redeems with no member_location row at all',
           (select count(*) = 0 from public.member_location ml
              join public.workspace_member wm on wm.id = ml.member_id
             where wm.user_id = :other::uuid)
           and (:'r7'::jsonb->>'location_count')::int = 0);

select chk('5.10 and my_locations() still gives that manager BOTH stores, by role',
           (select count(*) from public.my_locations()) = 2,
           format('%s location(s)', (select count(*) from public.my_locations())));

select public._as(null);


-- ============================================================================
-- 6. redeem_invite — everything it refuses, and the one thing it does not
-- ============================================================================

select public._as(:staff_a);
select chk_raises('6.1 a token nobody issued is refused',
  format('select public.redeem_invite(%L)', 'ZZZZZZZZZZZZZZZZ'), '42501');

select chk_raises('6.2 an empty token is refused before anything is hashed',
  $q$select public.redeem_invite('   ')$q$, '22023');

select public._as(null);
select chk_raises('6.3 an unauthenticated caller may not redeem',
  format('select public.redeem_invite(%L)', :'tok_shape'), '42501');

-- Idempotency, as 0021's void and 0026's replay have it: the thing they asked
-- for is already true. A joiner tapping twice on a bad connection is ordinary.
select public._as(:joiner);
select public.redeem_invite(:'tok_join') as r8 \gset

select chk('6.4 the same joiner redeeming twice gets already_redeemed, not an error',
           (:'r8'::jsonb->>'already_redeemed')::boolean = true
           and (:'r8'::jsonb->>'member_id') = (:'r6'::jsonb->>'member_id'));

select chk('6.5 and there is still exactly one membership',
           (select count(*) = 1 from public.workspace_member
             where workspace_id = :'ws_a'::uuid and user_id = :joiner::uuid));

select public._as(:staff_a);
select chk_raises('6.6 somebody ELSE presenting a spent token is refused',
  format('select public.redeem_invite(%L)', :'tok_join'), '42501');

-- Expiry and supersession are TD003 — 0021's workflow code, reused rather than
-- minted (4d-i's rule): "ask the owner for another" is an instruction, not a bug.
-- ⚠️ `created_at` moves too. `workspace_invite_expiry_future` (0002:387) refuses
-- a row whose expiry precedes its creation, so "make this one old" is two
-- columns, not one — the constraint caught the first spelling of this check.
update public.workspace_invite
   set expires_at = now() - interval '1 minute',
       created_at = now() - interval '8 days'
 where id = :'inv_shape'::uuid;

select public._as(:other);
select chk_raises('6.7 an expired token raises TD003 — a workflow, not a defect',
  format('select public.redeem_invite(%L)', :'tok_shape'), 'TD003');

select chk_raises('6.8 a superseded token raises TD003 as well',
  format('select public.redeem_invite(%L)', :'tok_new'), 'TD003');

-- ⚠️⚠️ 6.9 IS THE OWNER'S RULING OF 2026-09-13, taken on the recommendation this
-- file shipped with and offered back the same day. The token is the credential;
-- the address the owner typed is not necessarily the one a Google sign-in returns
-- (5a-iv-c-3), and refusing that is silent from the joiner's side, which is §2.8's
-- complaint about handing the shopkeeper an edge case. ⚠️ NOTHING ELSE HOLDS IT:
-- the ruling is that redemption does NOT compare two values, and an absent
-- comparison has no constraint, no grant and no policy to live in. This check is
-- the whole guard, which is why its label names the ruling and not the behaviour.
select public._as(:owner_a);
select public.create_invite(:'ws_a', 'direccion.que.el.dueno.escribio@example.mx',
                            'staff', array[:'loc_a1']::uuid[]) as r9 \gset
select (:'r9'::jsonb->>'token') as tok_mismatch \gset
select (:'r9'::jsonb->>'invite_id') as inv_mismatch \gset

select public._as(:staff_a);
select chk_succeeds('6.9 a joiner signed in under a DIFFERENT address is admitted — '
                    'the owner ruled this 2026-09-13; reversing it is his call, not a '
                    'hardening',
  format('select public.redeem_invite(%L)', :'tok_mismatch'));

select chk('6.10 and the difference is RECORDED rather than lost: the invited address '
           'stays on the row, accepted_by is who actually joined (D4)',
           (select email = 'direccion.que.el.dueno.escribio@example.mx'
                   and accepted_by = :staff_a::uuid
              from public.workspace_invite where id = :'inv_mismatch'::uuid));

-- ⚠️ 6.11 IS DECISION 4 END TO END, and it is the reason the normaliser lives
-- INSIDE the hash rather than beside it. 2.7 proves the two hashes match; this
-- proves the RPC uses that hash — a token written down in groups, in lower case,
-- the way it arrives in a WhatsApp message and is typed back by someone standing
-- up. A `redeem_invite` that hashed the raw string would pass 2.7 and fail here.
select public._as(:owner_a);
select public.create_invite(:'ws_a', 'tecleado@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r12 \gset
select (:'r12'::jsonb->>'token') as tok_typed \gset
select lower(substr(:'tok_typed',1,4) || '-' || substr(:'tok_typed',5,4) || ' ' ||
             substr(:'tok_typed',9,4) || '-' || substr(:'tok_typed',13,4)) as tok_sloppy \gset

select public._as(:typist);
select chk_succeeds('6.11 a token typed in lower case and in groups still redeems',
  format('select public.redeem_invite(%L)', :'tok_sloppy'));

select chk('6.12 and it wrote the membership, not merely a green return value',
           (select count(*) = 1 from public.workspace_member
             where workspace_id = :'ws_a'::uuid and user_id = :typist::uuid
               and role = 'staff' and is_active));

select public._as(null);


-- ============================================================================
-- 7. The returning member (decision 10)
-- ============================================================================
-- `workspace_member_unique` makes re-joining an UPDATE, and the alternative is
-- 23505 in front of a shop re-hiring last summer's cashier. 7.3 is the half that
-- is a choice rather than a necessity: the invite REPLACES the old assignment
-- rather than adding to it, because it is the most recent statement of where
-- that person works.

update public.workspace_member
   set is_active = false
 where workspace_id = :'ws_a'::uuid and user_id = :joiner::uuid;

select public._as(:owner_a);
select public.create_invite(:'ws_a', 'joiner@example.mx', 'manager', '{}'::uuid[]) as r10 \gset
select (:'r10'::jsonb->>'token') as tok_back \gset

select public._as(:joiner);
select public.redeem_invite(:'tok_back') as r11 \gset

select chk('7.1 the returning member is reactivated rather than refused',
           (select is_active from public.workspace_member
             where workspace_id = :'ws_a'::uuid and user_id = :joiner::uuid)
           and (:'r11'::jsonb->>'membership_existed')::boolean = true);

select chk('7.2 the invited role replaced the old one',
           (select role = 'manager' from public.workspace_member
             where workspace_id = :'ws_a'::uuid and user_id = :joiner::uuid));

select chk('7.3 the old member_location row is GONE, not merged',
           (select count(*) = 0 from public.member_location ml
              join public.workspace_member wm on wm.id = ml.member_id
             where wm.user_id = :joiner::uuid),
           (select count(*)::text from public.member_location ml
              join public.workspace_member wm on wm.id = ml.member_id
             where wm.user_id = :joiner::uuid));

select chk('7.4 and still exactly one membership row, not two',
           (select count(*) = 1 from public.workspace_member
             where workspace_id = :'ws_a'::uuid and user_id = :joiner::uuid));

select chk('7.5 the promoted member now sees both stores by role',
           (select count(*) from public.my_locations()) = 2,
           format('%s location(s)', (select count(*) from public.my_locations())));

select public._as(null);


-- ============================================================================
-- 8. What 0028 did NOT add, and the premise of decision 1
-- ============================================================================

select chk('8.1 workspace_invite still has exactly its three policies from 0002',
           (select count(*) from pg_policy
             where polrelid = 'public.workspace_invite'::regclass) = 3,
           (select string_agg(polname, ' ') from pg_policy
             where polrelid = 'public.workspace_invite'::regclass));

select chk('8.2 and still NO update policy — so 0028 added no second way to accept one',
           not exists (select 1 from pg_policy
                        where polrelid = 'public.workspace_invite'::regclass
                          and polcmd = 'w'));

-- ⚠️⚠️ DECISION 1, PERFORMED — AND THE DATABASE ANSWERED HARDER THAN THE
-- MIGRATION'S FIRST DRAFT CLAIMED. An OWNER of this workspace, under the role a
-- client actually holds, tries the UPDATE that superseding IS. It is not a
-- silent no-op: `0002:594` grants `authenticated` select, insert and delete on
-- this table and NOT update, so the statement never reaches a policy at all and
-- is refused `42501`. An invoker-rights `create_invite` would therefore have
-- died on the supersede rather than skipped it — and the obvious "fix" for that
-- error is to grant UPDATE, at which point the missing policy makes it the
-- silent no-op the migration described, and D3′'s bug returns wearing the
-- costume of its own cure. Both halves are here: 8.2 is the missing policy, 8.3
-- is the missing grant.
insert into public.workspace_invite
  (workspace_id, email, role, location_ids, source, decided_by, token_hash,
   expires_at, created_at)
values
  (:'ws_a', 'rls@example.mx', 'staff', array[:'loc_a1']::uuid[], 'invite',
   :owner_a, public.hash_invite_token('RLSRLSRLSRLSRLS1'),
   now() - interval '23 days', now() - interval '30 days');

select public._as(:owner_a);
set role authenticated;

select chk_raises('8.3 an owner under RLS cannot supersede a row at all — there is no '
                  'UPDATE grant on the table, so it never reaches a policy',
  $q$update public.workspace_invite set superseded_at = now()
      where email = 'rls@example.mx'$q$, '42501');

reset role;
select public._as(null);

select chk('8.4 and the row is untouched: nothing was superseded by that attempt',
           (select superseded_at is null from public.workspace_invite
             where email = 'rls@example.mx'));

select chk('8.5 workspace still has exactly its two policies — no scan policy '
           'arrived early (D6 is 0029''s)',
           (select count(*) from pg_policy
             where polrelid = 'public.workspace'::regclass) = 2,
           (select string_agg(polname, ' ') from pg_policy
             where polrelid = 'public.workspace'::regclass));

select chk('8.6 no invite anywhere carries a readable token — only hashes',
           not exists (select 1 from public.workspace_invite
                        where token_hash is not null
                          and token_hash !~ '^[0-9a-f]{64}$'),
           format('%s invite row(s)', (select count(*) from public.workspace_invite)));


-- ============================================================================
-- 9. The count
-- ============================================================================
-- A section that silently did not run prints nothing and fails nothing. The
-- literal is deliberately a literal.

-- 7 + 8 + 18 + 10 + 10 + 12 + 5 + 6 = 76, and this one makes 77.
select chk('9.1 ALL 77 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 76,
           format('recorded=%s of 76 before this one',
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
