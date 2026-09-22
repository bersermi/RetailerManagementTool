-- ============================================================================
-- Behavioural verification for 0038 — the refusal that now has a code
-- ============================================================================
-- ADR-035 §2.7, §2.8, §9. docs/PLAN.md task 5b.9.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0038_request_refusal_code.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `0038` moves ONE `raise` site onto one new SQLSTATE and changes nothing else.
-- That is a small claim with a large failure mode, because a `create or replace`
-- of a 160-line function is a TRANSCRIPTION: the diff that ships is not the diff
-- that was intended if one line went astray. So — exactly as `0036`'s suite does
-- — this file spends more of itself on WHAT DID NOT MOVE than on what did.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SECTION 3 IS THE ONE THE TASK EXISTS FOR
-- ----------------------------------------------------------------------------
-- Before `0038`, `request_access` raised `42501` for a code that resolves to no
-- shop AND PostgREST raised the same `42501` to a caller with no session, which
-- `@/api/errors` maps app-wide to "sign in again". The join box therefore had to
-- GUESS which person was standing there, and
-- `docs/checks/5b-iii-b-request-contract.sh` assertion 9 asserted that overload
-- out loud rather than leaving it as a comment.
--
-- 3.1–3.3 are that assertion INVERTED. A mistyped code and an absent session now
-- raise different codes, and 3.3 compares them TO EACH OTHER rather than to a
-- constant — so a later migration that puts them back together lands red here
-- even if somebody has edited both expectations.
--
-- ----------------------------------------------------------------------------
-- ⚠️ SECTION 2 IS THE TRANSCRIPTION GUARD
-- ----------------------------------------------------------------------------
-- `request_access` has SEVEN exits and only one of them moved. The two `22023`s
-- are driven for real, the authentication guard is measured, and both success
-- branches that are NOT a refusal — `already_requested` and `already_member` —
-- are driven too, because a transcription that turned one of them into a raise
-- would leave `TD006` correct and this function quietly broken for the ordinary
-- caller. ⚠️ And 2.5 re-performs `supabase/tests/0034`'s D7-name assertion HERE,
-- which is the rule `0036` wrote down after shipping exactly that defect.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS FILE CANNOT SEE
-- ----------------------------------------------------------------------------
-- It cannot see PostgREST. The `42501` an anonymous HTTP caller receives is
-- raised by the API layer before this function is entered, and a psql session
-- with no JWT reaches the guard in the BODY instead. Both are real and they are
-- the same code; `docs/checks/5b-iii-b-request-contract.sh` is the instrument
-- for the HTTP half, and its assertion 9 is rewritten in this same commit.
--
-- It cannot see a screen. Nothing under `app/src/app/` moves in this task.
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

-- ⚠️⚠️ THE WORKHORSE, for `0036`'s recorded reason. `22023` is raised by TWO
-- branches here and `TD006` by one branch reachable TWO ways (an unknown code
-- and an inactive shop), so a check that asserted only the state would be green
-- if the WRONG branch fired. `0035` found that exact shape by falsification —
-- removing an entire guard turned nothing red — and the answer was to assert the
-- message too.
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

-- Who is calling. Set by its own statement, never inside a caught string: a
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

-- The applied body of a function, read from the catalog rather than from the
-- migration file — ADR-035 §9.
create function public._src(p_name text)
returns text language sql stable as $$
  select string_agg(p.prosrc, E'\n') from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = p_name
$$;

-- ⚠️ THE STATE A CALL ACTUALLY RAISED, RETURNED AS A VALUE rather than
-- recorded. Section 3's whole claim is that two codes are DIFFERENT FROM EACH
-- OTHER, which cannot be written as two independent assertions against two
-- constants — somebody editing both constants would keep it green.
create function public._state(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return 'NO EXCEPTION';
exception when others then
  return sqlstate;
end;
$$;
grant execute on function public._state(text) to authenticated;

-- ⚠️ ONE STATEMENT, BOTH MEASUREMENTS, so 3.3 can compare them. The session is
-- set INSIDE, which is safe here and nowhere else in this file: `_state` catches
-- its own exception and returns, so nothing rolls the GUC back underneath us.
create function public._pair(p_user uuid, p_sql text)
returns text language plpgsql as $$
declare v_anon text; v_auth text;
begin
  perform public._as(null);       v_anon := public._state(p_sql);
  perform public._as(p_user);     v_auth := public._state(p_sql);
  return format('no session -> %s, with session -> %s', v_anon, v_auth);
end;
$$;

create function public._differs(p_user uuid, p_sql text)
returns boolean language plpgsql as $$
declare v_anon text; v_auth text;
begin
  perform public._as(null);       v_anon := public._state(p_sql);
  perform public._as(p_user);     v_auth := public._state(p_sql);
  return v_anon is distinct from v_auth
     and v_anon <> 'NO EXCEPTION' and v_auth <> 'NO EXCEPTION';
end;
$$;

-- ⚠️⚠️ SUCCESS OR REFUSAL, AS A VALUE, AND THE REASON IS A FALSIFICATION `0036`
-- PAID FOR. Section 2's claim about `already_requested` and `already_member` is
-- that a branch is NOT a refusal — and calling the function straight inside
-- `chk` means the fixture that breaks that branch RAISES, which aborts the whole
-- file under ON_ERROR_STOP. The suite then prints no FAIL rows at all: the check
-- written for exactly that defect never gets to record it.
create function public._status(p_sql text)
returns text language plpgsql as $$
declare v jsonb;
begin
  execute p_sql into v;
  return coalesce(v->>'status', 'NO STATUS');
exception when others then
  return 'REFUSED ' || sqlstate;
end;
$$;
grant execute on function public._status(text) to authenticated;


-- ---------------------------------------------------------------- fixture ----
-- THREE shops, and the third is the one nothing else in this repository has:
-- a DEACTIVATED workspace. `0029`'s decision 4 refuses it through the SAME raise
-- site as an unknown code, deliberately and identically, so it is the second way
-- into the branch this migration moves — and nothing would say if only one of
-- the two got there.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'duena.a@example.mx',
     jsonb_build_object('full_name', 'Sergio Alarcón Pineda')),
  ('22222222-2222-2222-2222-222222222222', 'duena.b@example.mx',
     jsonb_build_object('full_name', 'Dueña De La Otra')),
  ('77777777-7777-7777-7777-777777777777', 'duena.c@example.mx',
     jsonb_build_object('full_name', 'Dueña De La Cerrada')),
  -- She asks, by the pull path. Her second ask is `already_requested`.
  ('33333333-3333-3333-3333-333333333333', 'la.que.pide@example.mx',
     jsonb_build_object('full_name', 'La Que Pide')),
  -- She is INVITED by email and types the SHOP code instead — `D7`, and the one
  -- branch of this function that writes a membership, which is where `0034`'s
  -- name lives.
  ('44444444-4444-4444-4444-444444444444', 'la.invitada@example.mx',
     jsonb_build_object('full_name', 'La Invitada')),
  -- ⚠️ A phone-only account: `email` is NULL, which is the `22023` wall
  -- `0029` puts in front of somebody who cannot be invited either. C1.4 admits
  -- no phone auth in v1, so nothing else in this repository drives it.
  ('88888888-8888-8888-8888-888888888888', null, '{}'::jsonb);

\set u_duena  '''11111111-1111-1111-1111-111111111111'''
\set u_duenab '''22222222-2222-2222-2222-222222222222'''
\set u_duenac '''77777777-7777-7777-7777-777777777777'''
\set u_pide   '''33333333-3333-3333-3333-333333333333'''
\set u_invit  '''44444444-4444-4444-4444-444444444444'''
\set u_phone  '''88888888-8888-8888-8888-888888888888'''

select public._as(:u_duena);
select onboard_workspace('Tienda A') as ws_a \gset
select public._as(:u_duenab);
select onboard_workspace('Tienda B') as ws_b \gset
select public._as(:u_duenac);
select onboard_workspace('Tienda Cerrada') as ws_c \gset
select public._as(null);

select id as loc_a1 from public.location where workspace_id = :'ws_a' \gset
select code as code_a from public.workspace where id = :'ws_a' \gset
select code as code_c from public.workspace where id = :'ws_c' \gset

-- The shop that has been switched off. There is no RPC for this — `0001:500`
-- says "no delete policy: deactivate via is_active" and nothing in §2.7 exposes
-- it — so it is written here, by hand, and labelled as such.
update public.workspace set is_active = false where id = :'ws_c';


-- ============================================================================
-- 1. TD006 — the refusal this migration exists for
-- ============================================================================

select public._as(:u_pide);

-- ⚠️ MESSAGE AND STATE TOGETHER. Two other refusals in this body could fire on a
-- mistyped fixture, and both would leave a state-only check green before `0038`
-- and red after — which reads as the migration being wrong.
select chk_raises_like(
  '1.1 a code that resolves to NO SHOP raises TD006',
  format('select public.request_access(%L)', 'ZZZZZZZZ'),
  'TD006', 'that code does not match a shop');

-- ⚠️⚠️ THE SECOND WAY INTO THE SAME BRANCH, and `0029`'s decision 4 is that it
-- is identical on purpose: "that shop has been switched off" is a fact about a
-- workspace, told to somebody who is not a member of it. If a transcription had
-- moved only the `not found` half, this stays 42501 and 1.1 is still green.
select chk_raises_like(
  '1.2 a shop that has been SWITCHED OFF raises TD006 too, identically',
  format('select public.request_access(%L)', :'code_c'),
  'TD006', 'that code does not match a shop');

-- ⚠️ THE OLD CODE IS GONE FROM THAT BRANCH, ASSERTED SEPARATELY. "It raises
-- TD006" and "it no longer raises 42501" are the same sentence only while a
-- raise site raises one thing — which is exactly what a bad transcription
-- breaks. ⚠️ `errcode = '42501'`, NOT the digits: `prosrc` carries the
-- function's own COMMENTS, and this body's now explain why 42501 is gone, so the
-- naive spelling would be red on a correct tree.
select chk(
  '1.3 …and the APPLIED body raises errcode 42501 from no branch at all',
  public._src('request_access') ~ 'errcode\s*=\s*''TD006'''
  and public._src('request_access') !~ 'errcode\s*=\s*''42501''',
  format('TD006 sites=%s, 42501 sites=%s',
         (length(public._src('request_access'))
          - length(regexp_replace(public._src('request_access'),
                                  'errcode\s*=\s*''TD006''', '', 'g'))),
         (length(public._src('request_access'))
          - length(regexp_replace(public._src('request_access'),
                                  'errcode\s*=\s*''42501''', '', 'g')))));

-- ⚠️ AND EXACTLY ONE SITE, because one passing check does not say there is only
-- one. A second TD006 grown into this body by a later session is a code that has
-- started meaning two things, which is the defect this whole task is about.
select chk(
  '1.4 TD006 is raised from EXACTLY ONE site in the applied body',
  (length(public._src('request_access'))
   - length(replace(public._src('request_access'), '''TD006''', ''))) / 7 = 1,
  format('TD006 literal x%s',
         (length(public._src('request_access'))
          - length(replace(public._src('request_access'), '''TD006''', ''))) / 7));


-- ============================================================================
-- 2. ⚠️ WHAT DID NOT MOVE — the transcription guard
-- ============================================================================

-- The authentication guard, which is `0036` decision 3 repeated here: it is
-- spelled `insufficient_privilege`, it means "sign in again", and leaving it is
-- the whole reason 42501 reaching this screen now means one thing.
select public._as(null);
select chk_raises_like(
  '2.1 a caller with NO SESSION is still refused 42501 by the guard in the body',
  format('select public.request_access(%L)', :'code_a'),
  '42501', 'requires an authenticated caller');

select chk(
  '2.2 …and it is still spelled insufficient_privilege, not the digits',
  public._src('request_access') ~ 'errcode\s*=\s*''insufficient_privilege''',
  'read from pg_proc.prosrc, not from the migration file');

-- The two bad payloads. A phone-only account cannot be invited either, so
-- `0029` calls it a wall rather than a branch; C1.4 admits no phone auth in v1,
-- so this is the only place in the repository that reaches it.
select public._as(:u_phone);
select chk_raises_like(
  '2.3 an account with NO EMAIL ADDRESS is still 22023 — a wall, not a dead code',
  format('select public.request_access(%L)', :'code_a'),
  '22023', 'this account has no email address');

select public._as(:u_pide);
select chk_raises_like(
  '2.4 a BLANK code is still 22023 — a bad payload is not a shop that is missing',
  format('select public.request_access(%L)', '   '),
  '22023', 'a workspace code is required');

-- ⚠️⚠️ 2.5 IS HERE BECAUSE `0036` SHIPPED EXACTLY THIS DEFECT AND ITS OWN SUITE
-- DID NOT SEE IT. `create or replace` needs the whole function, so the whole
-- function is transcribed — and `request_access` had been replaced ONCE SINCE
-- `0029`, by `0034`, which added `display_name = coalesce(display_name,
-- auth_full_name(...))` inside the `D7` branch so that somebody invited by email
-- who types the SHOP code arrives NAMED beside the person who used the token.
-- Transcribing `0029` would have reverted the owner's ruling of 2026-09-18 in
-- one of the four places it lives, and nothing here would have gone red —
-- `supabase/tests/0034` check 2.3b would, one directory sweep later. This is
-- that assertion re-performed in the suite of the migration most likely to break
-- it, so the next `create or replace` lands red in its own file.
select chk(
  '2.5 ⚠️ request_access STILL fills a missing name rather than overwriting one',
  public._src('request_access') ~ 'display_name\s*=\s*coalesce\(display_name'
  and public._src('request_access') ~ 'auth_full_name',
  format('0034''s writer survived the transcription: coalesce=%s auth_full_name=%s',
         public._src('request_access') ~ 'display_name\s*=\s*coalesce\(display_name',
         public._src('request_access') ~ 'auth_full_name'));

-- ⚠️⚠️ THE THREE EXITS THAT ARE NOT REFUSALS, DRIVEN THROUGH `_status` AND NOT
-- INLINE. A transcription that turned one of these into a raise would leave
-- every assertion above green and break the function for its ORDINARY caller.
-- ⚠️⚠️ MEASURED ONCE INTO A VARIABLE, NEVER CALLED TWICE IN ONE `chk`, AND THIS
-- FILE SHIPPED THE OTHER SHAPE FIRST. `chk`'s condition and its detail are two
-- expressions, so `public._status(...)` written into both CALLS THE RPC TWICE —
-- and `request_access` WRITES. The first spelling of 2.6 was green with the
-- detail `got already_requested`, because the condition's call had already made
-- the row the detail's call then found. The assertion was right and its evidence
-- was a different event; the next session to read that detail would be reading a
-- lie. ⚠️ Every status below is taken with `\gset` and asserted from the
-- variable, so what is measured is what is reported.
select public._status(format('select public.request_access(%L)', :'code_a')) as s_first \gset
select chk(
  '2.6 the ordinary ask still SUCCEEDS with status requested',
  :'s_first' = 'requested',
  format('got %s', :'s_first'));

-- `0029` decision 5: she taps twice on a bad connection, and the pilot store is
-- offline a lot, so a second ask is the ordinary case and not an error.
select public._status(format('select public.request_access(%L)', :'code_a')) as s_again \gset
select chk(
  '2.7 a SECOND ask is still idempotent — already_requested, not a refusal',
  :'s_again' = 'already_requested',
  format('got %s', :'s_again'));

-- `D7`: she was invited by email and types the shop code instead. This is the
-- branch 2.5 reads, driven for real rather than only read out of `prosrc`.
select public._as(:u_duena);
select public.create_invite(:'ws_a', 'la.invitada@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_inv \gset
select public._as(:u_invit);
select public._status(format('select public.request_access(%L)', :'code_a')) as s_d7 \gset
select chk(
  '2.8 D7 still ABSORBS a live pending invite — joined, and she is let straight in',
  :'s_d7' = 'joined',
  format('got %s', :'s_d7'));

select chk(
  '2.9 …and she arrived NAMED, which is what 2.5 reads out of the catalog',
  (select wm.display_name from public.workspace_member wm
    where wm.workspace_id = :'ws_a' and wm.user_id = :u_invit) = 'La Invitada',
  coalesce((select wm.display_name from public.workspace_member wm
             where wm.workspace_id = :'ws_a' and wm.user_id = :u_invit),
           'NULL — 0034''s writer did not survive'));

select public._status(format('select public.request_access(%L)', :'code_a')) as s_in \gset
select chk(
  '2.10 asking again from INSIDE the shop is still already_member, not a refusal',
  :'s_in' = 'already_member',
  format('got %s', :'s_in'));


-- ============================================================================
-- 3. ⚠️⚠️ THE OVERLOAD IS GONE — the assertion this task exists for
-- ============================================================================
-- `docs/checks/5b-iii-b-request-contract.sh` assertion 9 said, out loud and
-- against a live database, that a mistyped code and an absent session answered
-- with the SAME code — so `@/api/requests` reading it as "no such shop" was a
-- judgement about who was standing there rather than a contract. This is that
-- assertion turned over.

-- ⚠️ ONCE EACH, for 2.6's reason. These two happen to refuse, so a second call
-- would write nothing today — but "it raises" is exactly the claim under test,
-- and a regression that stopped it raising would make the doubled call a write.
select public._as(null);
select public._state(format('select public.request_access(%L)', 'ZZZZZZZZ')) as st_anon \gset
select chk(
  '3.1 with NO session, request_access still refuses with 42501 — "sign in again"',
  :'st_anon' = '42501',
  format('got %s', :'st_anon'));

select public._as(:u_pide);
select public._state(format('select public.request_access(%L)', 'ZZZZZZZZ')) as st_auth \gset
select chk(
  '3.2 …and WITH a session the same nonsense code refuses with TD006 — "re-read it"',
  :'st_auth' = 'TD006',
  format('got %s', :'st_auth'));

-- ⚠️⚠️ THE TWO MEASUREMENTS COMPARED TO EACH OTHER, NOT TO CONSTANTS. 3.1 and
-- 3.2 are each satisfiable by editing an expectation; this one is not. It is red
-- for any future migration that lets these two refusals wear one code again,
-- whatever that code turns out to be — which is the defect, stated without
-- naming the numbers that happen to carry it today.
select chk(
  '3.3 ⚠️ THE SAME CODE ANSWERS DIFFERENTLY TO A SESSION AND TO NOBODY',
  public._differs(:u_pide, format('select public.request_access(%L)', 'ZZZZZZZZ')),
  public._pair(:u_pide, format('select public.request_access(%L)', 'ZZZZZZZZ')));

-- ⚠️ approve_request KEEPS BOTH OF ITS 42501s and that is decision 4, not an
-- omission. "No such request" and "only an owner may approve" are a row you may
-- not act on and a fence — which is what the code means everywhere else in this
-- schema, and what `@/api/approvals` already leaves to the app-wide sentence.
select public._as(:u_pide);
select chk_raises_like(
  '3.4 approve_request still refuses a stranger''s request id with 42501',
  format('select public.approve_request(%L, %L::uuid[])',
         '00000000-0000-0000-0000-00000000dead', array[:'loc_a1']::uuid[]),
  '42501', 'no such request');

select chk(
  '3.5 …and approve_request''s applied body still carries both of them',
  (length(public._src('approve_request'))
   - length(replace(public._src('approve_request'), '''42501''', ''))) / 7 = 2,
  format('42501 literal x%s in approve_request',
         (length(public._src('approve_request'))
          - length(replace(public._src('approve_request'), '''42501''', ''))) / 7));


-- ============================================================================
-- 4. TD003 and the other codes did not get swept up
-- ============================================================================
-- `4d-i`'s rule is that codes are REUSED. `0029` reuses `0021`'s `TD003` for an
-- expired or superseded request, in `approve_request`; if `0038` had swept it
-- up, an owner approving a lapsed request would be told something else.

select chk(
  '4.1 approve_request still reuses TD003 for a request that has lapsed',
  public._src('approve_request') ~ 'TD003',
  'read from pg_proc.prosrc, not from the migration file');

select chk(
  '4.2 request_access itself raises no TD003 and never did',
  public._src('request_access') !~ 'TD003',
  'its expired-request path is approve_request''s, not this function''s');


-- ============================================================================
-- 5. The ACL and the shape survived `create or replace`
-- ============================================================================
-- ⚠️ `0027`'s G1 found a function reachable by anyone by reading `proacl` rather
-- than the migration that was supposed to have revoked it. If `0038` had reset
-- this ACL, nothing else in this repository would have said so.

select public._as(null);

select chk(
  '5.1 request_access is executable by authenticated and by NOBODY else',
  (select coalesce(array_agg(a::text order by a::text), '{}')
     from pg_proc p, unnest(p.proacl) a
    where p.pronamespace = 'public'::regnamespace
      and p.proname = 'request_access'
      and a::text not like 'postgres=%')
  = array['authenticated=X/postgres']::text[],
  coalesce((select string_agg(a::text, ', ' order by a::text)
              from pg_proc p, unnest(p.proacl) a
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'request_access'), 'NULL PROACL — GRANTED TO PUBLIC'));

-- ⚠️ AND THE SHAPE, because `create or replace` also preserves — or silently
-- fails to preserve — everything the header declares. A function that came back
-- `security invoker` would answer every check above as the superuser and refuse
-- every real caller; one with a non-empty `search_path` is `0001`'s own rule
-- broken.
select chk(
  '5.2 it is still security definer with an EMPTY search_path, and unique',
  (select count(*) = 1 from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'request_access'
      and p.prosecdef and p.proconfig @> array['search_path=""']),
  coalesce((select string_agg(p.proname || ' secdef=' || p.prosecdef
                              || ' cfg=' || coalesce(array_to_string(p.proconfig, ','), 'NONE'),
                              ' | ' order by p.oid)
              from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'request_access'), 'IT DOES NOT EXIST'));


-- ============================================================================
-- 6. The comment names the code that is actually raised
-- ============================================================================
-- `0035` measured that deleting a restated comment turns NOTHING red, and
-- recorded the green rather than hiding it. ⚠️ `0029`'s comment named no
-- SQLSTATE at all, so it was not false — it was SILENT, and silence is how this
-- defect shipped: a reader who does not open the body assumes `42501`, because
-- that is what everything else on this path raises.

select chk(
  '6.1 request_access''s comment NAMES TD006 and says 42501 is the session',
  obj_description('public.request_access(text)'::regprocedure) like '%TD006%'
  and obj_description('public.request_access(text)'::regprocedure) like '%sign in again%',
  coalesce(left(obj_description('public.request_access(text)'::regprocedure), 60),
           'NO COMMENT'));


-- ============================================================================
-- 7. ⚠️ THE CENSUS — nothing else in this schema wears this code
-- ============================================================================
-- Decision 1 says `TD006` freezes the moment this merges, and that is only true
-- if it was free. `supabase/README.md` is the authority on numbering and it is a
-- FILE; this reads the applied catalog. ⚠️ `supabase/tests/0036` check 7.3 has
-- asserted since 2026-09-19 that TD006 IS STILL FREE — that assertion is what
-- this migration turns over, and it is rewritten in this same commit onto
-- `TD007`. A census and the thing it counts move together.

select chk(
  '7.1 TD006 is raised by request_access and by NOTHING else in the schema',
  (select coalesce(array_agg(proname::text order by proname), '{}')
     from pg_proc where pronamespace = 'public'::regnamespace
       and prosrc like '%TD006%') = array['request_access']::text[],
  coalesce((select string_agg(proname, ', ' order by proname)
              from pg_proc where pronamespace = 'public'::regnamespace
                and prosrc like '%TD006%'), 'NONE — TD006 IS RAISED NOWHERE'));

-- ⚠️ AND THE NEXT ONE IS FREE, stated here because the next session to mint a
-- code will read this file's siblings and not `supabase/README.md`. `TD007` is
-- the next slot; if this ever goes red, somebody has minted one without saying so.
select chk(
  '7.2 TD007 is still free — the next slot, asserted rather than assumed',
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD007%') = 0,
  coalesce((select string_agg(proname, ', ' order by proname)
              from pg_proc where pronamespace = 'public'::regnamespace
                and prosrc like '%TD007%'), 'free'));

-- ⚠️ THE FIVE EARLIER CODES ARE UNTOUCHED. `0038` replaced one function; if a
-- transcription had swept up `TD003`, section 4 would catch it — but TD001,
-- TD002, TD004 and TD005 live in functions this migration never names, and
-- nothing would say so if a session "tidied" them while here.
select chk(
  '7.3 TD001 through TD005 are all still raised somewhere',
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD001%') > 0
  and (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD002%') > 0
  and (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD003%') > 0
  and (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD004%') > 0
  and (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD005%') > 0,
  'the five codes that were already minted');


-- ============================================================================
-- 8. Did this file actually run?
-- ============================================================================
-- A green tick is also what a step that ran nothing looks like, and a suite that
-- silently SHRANK is the third shape. Only a pinned count catches it.

select chk('8.1 ALL 28 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 27,
           format('recorded=%s of 27 before this one',
                  (select count(*) from public._verify)));

drop function public._status(text);
drop function public._differs(uuid, text);
drop function public._pair(uuid, text);
drop function public._state(text);
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
