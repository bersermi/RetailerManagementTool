-- ============================================================================
-- Behavioural verification for 0027 — the join code, and one table for two ways in
-- ============================================================================
-- ADR-035 §2.3, §2.7 (amended 2026-09-13, C11.5 / C11.6), §2.8, §9.
-- docs/PLAN.md task 4.6a-i.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0027_membership_shape.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `0027` ships no RPC, so there is no call to make and every claim here is about
-- a CONSTRAINT, a helper, or a grant. The sections that matter most are 6 and 8,
-- and for opposite reasons: section 6 is the one place this migration had to
-- CHOOSE between two of register #9's rulings, and section 8 is the one place it
-- fixes a bug that is already in the applied schema.
--
-- ⚠️⚠️ SECTION 6 IS THE D1/D4 RESOLUTION, AND 6.7 IS THE WHOLE OF IT. §2.7's D1
-- says `decided_by` is "present exactly when `source = 'invite'`"; its D4 says
-- `decided_by` is "set at creation for an invite AND AT APPROVAL FOR A REQUEST".
-- Those cannot both hold — an approved request has a decider on a `request` row.
-- 6.6 and 6.7 are a PAIR and neither means anything alone: 6.6 refuses a decider
-- on a request nobody has decided (D1's reason, which is about the row at
-- CREATION), and 6.7 ACCEPTS one on a request that has been approved (D4's
-- reason, which is that "who approved this membership" must have an answer).
-- A constraint satisfying only 6.6 is D1 read literally, and it would leave D4
-- renaming a column for a question it can no longer answer.
--
-- ⚠️⚠️ SECTION 8 PROVES THE BUG BEFORE IT PROVES THE FIX, and 8.2 is why the
-- section is not ceremony. `workspace_invite_one_pending_idx` was partial on
-- `accepted_at is null`; an EXPIRED row still has `accepted_at is null`, so it
-- held the one-pending slot forever. 8.2 performs that failure — a second ask
-- for an email whose invite lapsed 23 days ago is refused with 23505 — and 8.3
-- is the identical insert after `supersede_expired_invite`, which succeeds.
-- Nothing but the helper call separates them. Without 8.2 the section would pass
-- against a schema that had simply dropped the unique index, which would be a
-- worse database than the broken one.
--
-- ⚠️ SECTION 5 IS HONEST ABOUT WHAT IT CANNOT SEE, and this is a finding rather
-- than a caveat. `0027` backfills every pre-existing workspace with a code — and
-- IN CI THAT LOOP RUNS OVER ZERO ROWS, because `supabase db reset` applies every
-- migration BEFORE the seed, and the seed creates its workspaces afterwards
-- through `onboard_workspace`. So the green run that proves this migration
-- applies does NOT exercise its backfill, and the pilot workspace is exactly the
-- row the backfill exists for. Section 5 therefore re-performs the loop's
-- guarantee against `public.workspace` directly, which is the same table under
-- the same generator; it does not claim to have watched the migration's own
-- `do` block run.
--
-- ⚠️ NOTHING ABOUT create_invite, redeem_invite, request_access, approve_request
-- OR my_access_requests. None of them exists: they are `0028` (4.6a-ii) and
-- `0029` (4.6a-iii). This file is the table and the three helpers those RPCs
-- will call, and asserting anything about the flow here would be asserting it
-- about a function nobody has written.
--
-- ⚠️ NOTHING ABOUT D6's ABSENCE OF A SCAN POLICY beyond section 10's structural
-- claim that `0027` added no policy. D6 is `0029`'s ruling and its RPC is where
-- the claim becomes behavioural.
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


-- ---------------------------------------------------------------- fixture ----
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner.a@example.mx'),
  ('33333333-3333-3333-3333-333333333333', 'owner.b@example.mx');

\set owner_a '''11111111-1111-1111-1111-111111111111'''
\set owner_b '''33333333-3333-3333-3333-333333333333'''

\set jwt_owner_a '''{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'''
\set jwt_owner_b '''{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}'''

select set_config('request.jwt.claims', :jwt_owner_a, false);
select onboard_workspace('Tienda A') as ws_a \gset
select set_config('request.jwt.claims', :jwt_owner_b, false);
select onboard_workspace('Tienda B') as ws_b \gset
select set_config('request.jwt.claims', null, false);


-- ============================================================================
-- 1. The code column, and the shape that is a security property
-- ============================================================================
-- D5 is 8 Crockford characters. D6 is why the length is not aesthetic: the
-- resolving RPC in `0029` is an enumeration oracle by construction, and the
-- alphabet is the only thing standing in front of it. A constraint that admitted
-- a 4-character code would not fail any test written about the flow.

select chk('1.1 every workspace has a code',
           not exists (select 1 from public.workspace where code is null),
           format('%s workspace row(s)', (select count(*) from public.workspace)));

select chk('1.2 the two fixture workspaces have DIFFERENT codes',
           (select count(distinct code) from public.workspace) =
           (select count(*) from public.workspace),
           (select string_agg(code, ' ') from public.workspace));

select chk('1.3 every code is 8 Crockford characters',
           not exists (select 1 from public.workspace
                        where code !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$'),
           (select string_agg(code, ' ') from public.workspace));

select chk_raises('1.4 a duplicate code is refused',
  format('insert into public.workspace (display_name, code) values (%L, %L)',
         'Dup', (select code from public.workspace limit 1)),
  '23505');

-- 1.5-1.11: the shape check, one excluded character at a time. Each is its own
-- assertion because a regex that dropped ONE of them would still pass the others.
select chk_raises('1.5 a lowercase code is refused',
  $q$insert into public.workspace (display_name, code) values ('X', 'abcdefgh')$q$, '23514');
select chk_raises('1.6 a 7-character code is refused',
  $q$insert into public.workspace (display_name, code) values ('X', 'ABCDEFG')$q$, '23514');
select chk_raises('1.7 a 9-character code is refused',
  $q$insert into public.workspace (display_name, code) values ('X', 'ABCDEFGHJ')$q$, '23514');
select chk_raises('1.8 a code containing I is refused (misread as 1)',
  $q$insert into public.workspace (display_name, code) values ('X', 'ABCDEFGI')$q$, '23514');
select chk_raises('1.9 a code containing L is refused (misread as 1)',
  $q$insert into public.workspace (display_name, code) values ('X', 'ABCDEFGL')$q$, '23514');
select chk_raises('1.10 a code containing O is refused (misread as 0)',
  $q$insert into public.workspace (display_name, code) values ('X', 'ABCDEFGO')$q$, '23514');
select chk_raises('1.11 a code containing U is refused (Crockford excludes it)',
  $q$insert into public.workspace (display_name, code) values ('X', 'ABCDEFGU')$q$, '23514');
select chk_raises('1.12 a workspace with no code at all is refused',
  $q$insert into public.workspace (display_name) values ('X')$q$, '23502');


-- ============================================================================
-- 2. generate_workspace_code() — 200 draws, not one
-- ============================================================================
-- One call proves the format and nothing else. A generator with a stuck byte, a
-- biased alphabet index or an off-by-one on `substr` can return a
-- perfectly-shaped code every time and still have ~10^0 codes in it.

create temp table gen as
  select public.generate_workspace_code() as code from generate_series(1, 200);

select chk('2.1 200 generated codes all match the shape',
           not exists (select 1 from gen where code !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$'),
           format('%s bad', (select count(*) from gen
                              where code !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$')));

select chk('2.2 200 generated codes are all distinct',
           (select count(distinct code) from gen) = 200,
           format('distinct=%s of 200', (select count(distinct code) from gen)));

-- The alphabet is 32 characters; 200 codes is 1600 characters, so every one of
-- the 32 should appear and none of the four excluded ones can. A generator
-- indexing a 36-character alphabet would trip this and nothing above it.
select chk('2.3 the 1600 generated characters use all 32 and only those 32',
           (select count(distinct c) from gen,
                   lateral unnest(string_to_array(code, null)) as c) = 32
           and not exists (select 1 from gen where code ~ '[ILOU]'),
           format('%s distinct characters',
                  (select count(distinct c) from gen,
                          lateral unnest(string_to_array(code, null)) as c)));

select chk('2.4 no generated code collides with one already in workspace',
           not exists (select 1 from gen g join public.workspace w on w.code = g.code));


-- ============================================================================
-- 3. normalize_workspace_code() — the code as someone actually types it
-- ============================================================================
-- It MAPS, it does not validate. Crockford defines I/L -> 1 and O -> 0, which is
-- why those letters are absent from the alphabet; `U` is absent too but has no
-- defined mapping, so a typed U survives and simply matches no code (3.5).

select chk('3.1 case is folded up',
           public.normalize_workspace_code('abcdefgh') = 'ABCDEFGH');
select chk('3.2 i becomes 1',
           public.normalize_workspace_code('i') = '1');
select chk('3.3 l becomes 1',
           public.normalize_workspace_code('L') = '1');
select chk('3.4 o becomes 0',
           public.normalize_workspace_code('o') = '0');
select chk('3.5 U SURVIVES — it has no Crockford mapping, so it matches nothing',
           public.normalize_workspace_code('u') = 'U');
select chk('3.6 hyphens are stripped',
           public.normalize_workspace_code('ABCD-EFGH') = 'ABCDEFGH');
select chk('3.7 spaces are stripped',
           public.normalize_workspace_code('AB CD EF GH') = 'ABCDEFGH');
select chk('3.8 null in, null out',
           public.normalize_workspace_code(null) is null);
select chk('3.9 a code of only punctuation normalises to null, not to the empty string',
           public.normalize_workspace_code('---') is null);

-- 3.10 and 3.11 are the pair that matters for the flow. A normaliser that
-- CHANGED a real code would break every lookup in `0029`.
select chk('3.10 every real code normalises to ITSELF',
           not exists (select 1 from public.workspace
                        where public.normalize_workspace_code(code) is distinct from code),
           (select string_agg(code, ' ') from public.workspace));

select chk('3.11 a real code written down in groups and in lower case still resolves',
           public.normalize_workspace_code(
             lower(substr((select code from public.workspace order by code limit 1), 1, 4))
             || ' - ' ||
             lower(substr((select code from public.workspace order by code limit 1), 5, 4))
           ) = (select code from public.workspace order by code limit 1),
           (select code from public.workspace order by code limit 1));


-- ============================================================================
-- 4. onboard_workspace — replaced a third time, and still doing the other four
-- ============================================================================
-- A new workspace is BORN with a code because there is no second moment at which
-- anyone would think to give it one. 4.3 is the regression half: this function
-- has been replaced twice before and it writes five rows, not one.

select set_config('request.jwt.claims', :jwt_owner_a, false);
select onboard_workspace('Tienda C') as ws_c \gset
select set_config('request.jwt.claims', null, false);

select chk('4.1 a newly onboarded workspace has a valid code',
           (select code from public.workspace where id = :'ws_c')
             ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$',
           (select code from public.workspace where id = :'ws_c'));

select chk('4.2 and it differs from the two that already existed',
           (select count(distinct code) from public.workspace) = 3);

select chk('4.3 it still writes the other four rows (0001 and 0002 behaviour intact)',
           (select count(*) from public.workspace_member where workspace_id = :'ws_c') = 1
       and (select count(*) from public.workspace_setting where workspace_id = :'ws_c') = 1
       and (select count(*) from public.location where workspace_id = :'ws_c') = 1
       and (select count(*) from public.provider
                 where workspace_id = :'ws_c' and is_generic) = 1);


-- ============================================================================
-- 5. The backfill — ⚠️ THE PART THE GREEN RUN DOES NOT WATCH
-- ============================================================================
-- See the header. `supabase db reset` applies migrations BEFORE the seed, so the
-- migration's `do` block found zero codeless workspaces and did nothing. The
-- guarantee it is there to make — every pre-existing workspace ends up with a
-- distinct, valid code, generated row by row so the generator sees its own
-- writes — is re-performed here against the same table and the same function.
--
-- ⚠️ It is written as 50 INSERTs rather than 50 calls into a temp table on
-- purpose: `generate_workspace_code` tests for collisions against
-- `public.workspace`, so a version of this that wrote somewhere else would pass
-- against a generator with no collision check at all.

do $$
declare i int;
begin
  for i in 1..50 loop
    insert into public.workspace (display_name, code)
    values ('Backfill ' || i, public.generate_workspace_code());
  end loop;
end;
$$;

select chk('5.1 50 rows written row-by-row all got a code',
           (select count(*) from public.workspace where display_name like 'Backfill %') = 50
       and not exists (select 1 from public.workspace
                        where display_name like 'Backfill %' and code is null));

select chk('5.2 all 50 codes are distinct from each other and from the other three',
           (select count(distinct code) from public.workspace) = 53,
           format('distinct=%s of 53', (select count(distinct code) from public.workspace)));

select chk('5.3 all 50 are valid Crockford',
           not exists (select 1 from public.workspace
                        where display_name like 'Backfill %'
                          and code !~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$'));

delete from public.workspace where display_name like 'Backfill %';


-- ============================================================================
-- 6. ⚠️⚠️ D1, D2 AND D4 IN ONE CHECK — and 6.6/6.7 are the resolution
-- ============================================================================
-- Read the header before this section. Every insert below uses its own email,
-- because `workspace_invite_one_pending_idx` is otherwise the thing that refuses
-- them and the section would be measuring the index instead of the check.

select chk_succeeds('6.1 an invite with a token and a decider is accepted',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash)
            values (%L, 'i1@x.mx', 'staff', 'invite', %L, 'tok-6-1')$q$,
         :'ws_a', :owner_a));

select chk_raises('6.2 an invite with NO token is refused (D2 is path-specific)',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash)
            values (%L, 'i2@x.mx', 'staff', 'invite', %L, null)$q$,
         :'ws_a', :owner_a), '23514');

select chk_raises('6.3 an invite with NO decider is refused (D1)',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash)
            values (%L, 'i3@x.mx', 'staff', 'invite', null, 'tok-6-3')$q$,
         :'ws_a'), '23514');

-- ⚠️⚠️ RE-SIGNED BY 0029 (4.6a-iii), AND ALL FIVE OF 6.4-6.8 CHANGED, NOT THE TWO
-- THAT WENT RED. `0029` adds `workspace_invite.requested_by` with a CHECK that a
-- `source = 'request'` row carries one, so the two chk_succeeds inserts below
-- failed outright — the S1 shape, a second time. The three chk_raises inserts did
-- NOT fail: they still raised 23514 and still went green, FROM THE NEW CONSTRAINT
-- INSTEAD OF THE ONE THEY ARE ABOUT. Left alone, 6.5, 6.6 and 6.8 would assert
-- nothing about D1 or D2 while reporting PASS, which is this repository's twice-
-- recorded defect of measuring something adjacent to the claim. Every one of them
-- now names a requester, so the only constraint left to refuse them is the one
-- each was written for.
select chk_succeeds('6.4 a pending request has neither a token nor a decider',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash,
               requested_by)
            values (%L, 'r1@x.mx', 'staff', 'request', null, null, %L)$q$,
         :'ws_a', :owner_b));

select chk_raises('6.5 a request carrying a token is refused (D2)',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash,
               requested_by)
            values (%L, 'r2@x.mx', 'staff', 'request', null, 'tok-6-5', %L)$q$,
         :'ws_a', :owner_b), '23514');

-- ⚠️ 6.6 AND 6.7 ARE A PAIR. Neither is meaningful alone.
select chk_raises(
  '6.6 D1: a PENDING request may not name a decider — nobody has decided it',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash,
               requested_by)
            values (%L, 'r3@x.mx', 'staff', 'request', %L, null, %L)$q$,
         :'ws_a', :owner_a, :owner_b), '23514');

select chk_succeeds(
  '6.7 D4: an APPROVED request names both who approved it and who joined',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash,
               accepted_at, accepted_by, requested_by)
            values (%L, 'r4@x.mx', 'staff', 'request', %L, null, now(), %L, %L)$q$,
         :'ws_a', :owner_a, :owner_b, :owner_b));

select chk_raises(
  '6.8 an ACCEPTED request with no decider is refused — approval had an author',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash,
               accepted_at, accepted_by, requested_by)
            values (%L, 'r5@x.mx', 'staff', 'request', null, null, now(), %L, %L)$q$,
         :'ws_a', :owner_b, :owner_b), '23514');

select chk_raises('6.9 a third source value is refused',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash)
            values (%L, 'r6@x.mx', 'staff', 'transfer', %L, 'tok-6-9')$q$,
         :'ws_a', :owner_a), '23514');

-- 6.10: the default is what keeps the three applied pgTAP fixtures valid without
-- naming a column they were written before `0027` existed.
select chk('6.10 source defaults to invite',
           (select source from public.workspace_invite where email = 'i1@x.mx') = 'invite');


-- ============================================================================
-- 7. D4's rename, and the catalog copy of the old name
-- ============================================================================

select chk('7.1 invited_by is gone',
           not exists (select 1 from information_schema.columns
                        where table_schema = 'public' and table_name = 'workspace_invite'
                          and column_name = 'invited_by'));

select chk('7.2 decided_by exists and is nullable',
           (select is_nullable from information_schema.columns
             where table_schema = 'public' and table_name = 'workspace_invite'
               and column_name = 'decided_by') = 'YES');

-- ⚠️ A RENAME DOES NOT RENAME THE CONSTRAINT. Postgres left this FK called
-- `workspace_invite_invited_by_fkey`, which is the name a later session reads out
-- of an error message. Six of this repository's seven recorded defects are a
-- stale copy nobody re-read.
select chk('7.3 the foreign key is named for the column it is now on',
           exists (select 1 from pg_constraint
                    where conrelid = 'public.workspace_invite'::regclass
                      and conname = 'workspace_invite_decided_by_fkey')
       and not exists (select 1 from pg_constraint
                    where conrelid = 'public.workspace_invite'::regclass
                      and conname = 'workspace_invite_invited_by_fkey'),
           (select string_agg(conname, ' ') from pg_constraint
             where conrelid = 'public.workspace_invite'::regclass and contype = 'f'));

-- accepted_by keeps its ONE meaning — who actually joined — which is the half of
-- D4 that is a claim about what did NOT change.
select chk_raises('7.4 accepted_at and accepted_by still move together',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash, accepted_at)
            values (%L, 'a1@x.mx', 'staff', 'invite', %L, 'tok-7-4', now())$q$,
         :'ws_a', :owner_a), '23514');


-- ============================================================================
-- 8. ⚠️⚠️ D3' — THE BUG IS PERFORMED (8.2) BEFORE THE FIX IS (8.3)
-- ============================================================================

select chk('8.1 the one-pending index now reads superseded_at as well',
           (select indexdef from pg_indexes
             where schemaname = 'public' and indexname = 'workspace_invite_one_pending_idx')
             like '%superseded_at IS NULL%',
           (select indexdef from pg_indexes
             where schemaname = 'public' and indexname = 'workspace_invite_one_pending_idx'));

-- An invite that lapsed 23 days ago. `workspace_invite_expiry_future` requires
-- expires_at > created_at, so the row is BACKDATED rather than given a past
-- expiry against a present creation.
insert into public.workspace_invite
  (workspace_id, email, role, source, decided_by, token_hash, created_at, expires_at)
values
  (:'ws_a', 'lapsed@x.mx', 'staff', 'invite', :owner_a, 'tok-8-lapsed',
   now() - interval '30 days', now() - interval '23 days');

-- ⚠️ 8.2 IS THE DEFECT ITSELF. Without this, section 8 would pass against a
-- schema that had simply dropped the unique index.
select chk_raises(
  '8.2 THE BUG: an expired pending row still blocks the next ask',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash)
            values (%L, 'lapsed@x.mx', 'staff', 'invite', %L, 'tok-8-2')$q$,
         :'ws_a', :owner_a), '23505');

select chk('8.3 supersede_expired_invite retires exactly that one row',
           public.supersede_expired_invite(:'ws_a', 'lapsed@x.mx') = 1);

select chk_succeeds(
  '8.4 THE FIX: the identical insert now succeeds, and nothing else changed',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash)
            values (%L, 'lapsed@x.mx', 'staff', 'invite', %L, 'tok-8-4')$q$,
         :'ws_a', :owner_a));

select chk('8.5 the superseded row is KEPT, not deleted — 0002 calls it an audit trail',
           (select count(*) from public.workspace_invite
             where email = 'lapsed@x.mx' and superseded_at is not null) = 1);

-- The other half of the claim: it retires EXPIRED rows, not pending ones.
insert into public.workspace_invite
  (workspace_id, email, role, source, decided_by, token_hash)
values (:'ws_a', 'live@x.mx', 'staff', 'invite', :owner_a, 'tok-8-live');

select chk('8.6 a LIVE pending row is not superseded',
           public.supersede_expired_invite(:'ws_a', 'live@x.mx') = 0);

select chk_raises('8.7 and it therefore still holds the slot, as it should',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash)
            values (%L, 'live@x.mx', 'staff', 'invite', %L, 'tok-8-7')$q$,
         :'ws_a', :owner_a), '23505');

-- Scope. A helper that ignored its arguments would pass everything above.
insert into public.workspace_invite
  (workspace_id, email, role, source, decided_by, token_hash, created_at, expires_at)
values
  (:'ws_b', 'lapsed@x.mx', 'staff', 'invite', :owner_b, 'tok-8-b',
   now() - interval '30 days', now() - interval '23 days');

select chk('8.8 supersede is scoped to ONE workspace',
           public.supersede_expired_invite(:'ws_a', 'lapsed@x.mx') = 0
       and (select superseded_at from public.workspace_invite
             where workspace_id = :'ws_b' and email = 'lapsed@x.mx') is null);

select chk_raises('8.9 a superseded row may not also be an accepted one',
  format($q$insert into public.workspace_invite
              (workspace_id, email, role, source, decided_by, token_hash,
               accepted_at, accepted_by, superseded_at)
            values (%L, 's1@x.mx', 'staff', 'invite', %L, 'tok-8-9',
                    now(), %L, now())$q$,
         :'ws_a', :owner_a, :owner_b), '23514');


-- ============================================================================
-- 9. Grants — and the revoke that looked right and was not
-- ============================================================================
-- ⚠️ EXECUTE ON A NEW FUNCTION IS GRANTED TO PUBLIC BY DEFAULT. The first
-- spelling of this migration revoked from `anon, authenticated`, which reads as
-- tighter and leaves the PUBLIC default standing — `proacl` still said `=X`.
-- These three checks are what that mistake is worth; `0001:595` had it right.

select chk('9.1 generate_workspace_code is not callable by authenticated',
           not has_function_privilege('authenticated',
                 'public.generate_workspace_code()', 'execute'));

select chk('9.2 normalize_workspace_code is not callable by authenticated',
           not has_function_privilege('authenticated',
                 'public.normalize_workspace_code(text)', 'execute'));

select chk('9.3 supersede_expired_invite is not callable by authenticated',
           not has_function_privilege('authenticated',
                 'public.supersede_expired_invite(uuid, citext)', 'execute'));

select chk('9.4 and anon reaches none of the three either',
           not has_function_privilege('anon', 'public.generate_workspace_code()', 'execute')
       and not has_function_privilege('anon', 'public.normalize_workspace_code(text)', 'execute')
       and not has_function_privilege('anon',
                 'public.supersede_expired_invite(uuid, citext)', 'execute'));

-- The pair: a revoke that had swept too wide would show up here and nowhere else.
select chk('9.5 onboard_workspace is STILL callable by authenticated',
           has_function_privilege('authenticated',
             'public.onboard_workspace(text, boolean, text)', 'execute'));


-- ============================================================================
-- 10. 0027 added no policy, and D6 is why that matters
-- ============================================================================
-- C11.6: workspaces are never listed. The cheapest-looking way to make `0029`'s
-- join screen work is a SELECT policy on `workspace` — the exact thing D6 rules
-- out, because it turns the code from a secret into a filter.

select chk('10.1 workspace still has exactly its two policies from 0001',
           (select count(*) from pg_policy
             where polrelid = 'public.workspace'::regclass) = 2,
           (select string_agg(polname, ' ') from pg_policy
             where polrelid = 'public.workspace'::regclass));

select chk('10.2 and its SELECT policy is still membership-scoped, not code-scoped',
           (select pg_get_expr(polqual, polrelid) from pg_policy
             where polrelid = 'public.workspace'::regclass and polname = 'workspace_select')
             like '%my_workspaces%',
           (select pg_get_expr(polqual, polrelid) from pg_policy
             where polrelid = 'public.workspace'::regclass and polname = 'workspace_select'));


-- ============================================================================
-- 11. The count
-- ============================================================================
-- A section that silently did not run prints nothing and fails nothing. The
-- literal is deliberately a literal.

-- 12 + 4 + 11 + 3 + 3 + 10 + 4 + 9 + 5 + 2 = 63, and this one makes 64.
select chk('11.1 ALL 64 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 63,
           format('recorded=%s of 63 before this one',
                  (select count(*) from public._verify)));

drop function public.chk_raises(text, text, text);
drop function public.chk_succeeds(text, text, text);


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
