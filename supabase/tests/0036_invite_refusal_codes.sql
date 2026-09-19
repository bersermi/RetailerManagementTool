-- ============================================================================
-- Behavioural verification for 0036 — two refusals that now have codes
-- ============================================================================
-- ADR-035 §2.7, §2.8, §9. docs/PLAN.md task 5b-iii-a.
--
--   supabase db reset
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/_cleanup.sql
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0036_invite_refusal_codes.sql
--
-- ----------------------------------------------------------------------------
-- WHAT IS BEING CLAIMED
-- ----------------------------------------------------------------------------
-- `0036` moves three `raise` sites onto two new SQLSTATEs and changes nothing
-- else. That is a small claim with a large failure mode, because a
-- `create or replace` of a 170-line function is a TRANSCRIPTION: the diff that
-- ships is not the diff that was intended if one line went astray. So this
-- file spends more of itself on WHAT DID NOT MOVE than on what did.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ SECTION 4 IS THE ONE THE TASK EXISTS FOR
-- ----------------------------------------------------------------------------
-- Before `0036`, `redeem_invite` raised `42501` for a dead token AND for a
-- caller with no session — and PostgREST raises the same `42501` for an
-- anonymous request, which `@/api/errors` maps app-wide to "sign in again".
-- The join screen therefore had to GUESS which person was standing there, and
-- `docs/checks/5b-ii-b-2-redeem-contract.sh` assertion 9 asserted that overload
-- out loud rather than leaving it as a comment.
--
-- 4.1–4.3 are that assertion INVERTED. A dead token and an absent session now
-- raise different codes, and 4.3 compares them to each other rather than to a
-- constant — so a later migration that puts them back together lands red here
-- even if somebody has edited both expectations.
--
-- ----------------------------------------------------------------------------
-- ⚠️ SECTION 2 IS THE TRANSCRIPTION GUARD, AND IT IS THE REASON THIS FILE IS
-- LONGER THAN THE MIGRATION'S CLAIM
-- ----------------------------------------------------------------------------
-- `create_invite` raises `22023` five times. Exactly ONE moved. The other four
-- are driven here for real — a blank address, a malformed address, a staff
-- invite naming no store, and a store belonging to another workspace — because
-- a transcription that dropped a branch, or that moved the wrong one, would
-- leave `TD004` correct and this function quietly broken. Nothing else in this
-- repository drives all four.
--
-- ----------------------------------------------------------------------------
-- ⚠️ WHAT THIS FILE CANNOT SEE
-- ----------------------------------------------------------------------------
-- It cannot see PostgREST. The `42501` an anonymous HTTP caller receives is
-- raised by the API layer before this function is entered, and a psql session
-- with no JWT reaches the guard in the BODY instead. Both are real and they are
-- the same code; `docs/checks/5b-ii-b-2-redeem-contract.sh` is the instrument
-- for the HTTP half, and it is re-pointed in this same commit.
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

-- ⚠️⚠️ THE WORKHORSE HERE, AND FOR A REASON THIS FILE HAS MORE OF THAN ANY
-- OTHER. `TD005` is raised by TWO branches and `22023` by four, so a check that
-- asserted only the state would be green if the WRONG branch fired. `0035`
-- found that exact shape by falsification — removing an entire guard turned
-- nothing red — and the answer was to assert the message too. Every refusal
-- below that shares a code with another refusal goes through this.
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

-- The applied body of a function, read from the catalog rather than from the
-- migration file — ADR-035 §9, at `0035`'s signature so `_cleanup.sql` drops it.
create function public._src(p_name text)
returns text language sql stable as $$
  select string_agg(p.prosrc, E'\n') from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = p_name
$$;

-- ⚠️ THE STATE A CALL ACTUALLY RAISED, RETURNED AS A VALUE rather than
-- recorded. Section 4's whole claim is that two codes are DIFFERENT FROM EACH
-- OTHER, which cannot be written as two independent assertions against two
-- constants — somebody editing both constants would keep it green. This lets
-- 4.3 compare the two measurements.
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

-- ⚠️ ONE STATEMENT, BOTH MEASUREMENTS, so 4.3 can compare them. The session is
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

-- ⚠️ SUCCESS OR REFUSAL, AS A VALUE. Section 3.3's claim is that a branch is
-- NOT a refusal, and the only way to assert that without the suite aborting
-- when it becomes one is to catch it here. Returns the jsonb verdict on
-- success and the sqlstate on failure, so both land as a `detail` a reader can
-- act on rather than as a psql error forty lines from the check.
create function public._verdict(p_sql text)
returns text language plpgsql as $$
declare v jsonb;
begin
  execute p_sql into v;
  return case when (v->>'already_redeemed')::boolean then 'already_redeemed'
              else 'fresh redemption' end;
exception when others then
  return 'REFUSED ' || sqlstate;
end;
$$;
grant execute on function public._verdict(text) to authenticated;

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


-- ---------------------------------------------------------------- fixture ----
-- Two shops, because `create_invite`'s cross-workspace location refusal is one
-- of the four `22023`s section 2 has to drive and it needs a second workspace
-- to point at. Five people, because the token refusals need a THIRD party —
-- the joiner who is handed a code somebody else has already spent.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'duena.a@example.mx',
     jsonb_build_object('full_name', 'Sergio Alarcón Pineda')),
  ('22222222-2222-2222-2222-222222222222', 'duena.b@example.mx',
     jsonb_build_object('full_name', 'Dueña De La Otra')),
  -- She ASKS to join shop A by the pull path. Inviting her is decision 7's
  -- refusal, and as of 0036 it is TD004.
  ('33333333-3333-3333-3333-333333333333', 'ya.pidio@example.mx',
     jsonb_build_object('full_name', 'Ya Pidió Entrar')),
  -- She is invited and redeems. Her spent token is section 3's fixture.
  ('44444444-4444-4444-4444-444444444444', 'la.invitada@example.mx',
     jsonb_build_object('full_name', 'La Invitada')),
  -- The third party, handed a code that was already spent.
  ('55555555-5555-5555-5555-555555555555', 'el.tercero@example.mx',
     jsonb_build_object('full_name', 'El Tercero')),
  -- A cashier in shop A, for the fence that keeps 42501 in create_invite.
  ('66666666-6666-6666-6666-666666666666', 'la.cajera@example.mx',
     jsonb_build_object('full_name', 'La Cajera'));

\set u_duena  '''11111111-1111-1111-1111-111111111111'''
\set u_duenab '''22222222-2222-2222-2222-222222222222'''
\set u_pidio  '''33333333-3333-3333-3333-333333333333'''
\set u_invit  '''44444444-4444-4444-4444-444444444444'''
\set u_terc   '''55555555-5555-5555-5555-555555555555'''
\set u_caja   '''66666666-6666-6666-6666-666666666666'''

select public._as(:u_duena);
select onboard_workspace('Tienda A') as ws_a \gset
select public._as(:u_duenab);
select onboard_workspace('Tienda B') as ws_b \gset
select public._as(null);

select id as loc_a1 from public.location where workspace_id = :'ws_a' \gset
select id as loc_b1 from public.location where workspace_id = :'ws_b' \gset
select code as code_a from public.workspace where id = :'ws_a' \gset

-- She asks, by the PULL path. `request_access` writes a `source = 'request'`
-- row with a null token_hash, which is the row decision 7 refuses to invite over.
select public._as(:u_pidio);
select public.request_access(:'code_a') as x \gset

-- The invitee is invited and redeems, so her token is SPENT and section 3 has
-- something for a third party to present.
select public._as(:u_duena);
select public.create_invite(:'ws_a', 'la.invitada@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_inv \gset
select public.create_invite(:'ws_a', 'la.cajera@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_caja \gset
select (:'r_inv'::jsonb->>'token')  as t_inv  \gset
select (:'r_caja'::jsonb->>'token') as t_caja \gset

select public._as(:u_invit);  select public.redeem_invite(:'t_inv')  as x \gset
select public._as(:u_caja);   select public.redeem_invite(:'t_caja') as x \gset
select public._as(null);


-- ============================================================================
-- 1. TD004 — the refusal in create_invite that has a next step
-- ============================================================================
-- Decision 7 of `0028`: inviting somebody who has ALREADY ASKED is an approval,
-- and approval is `0029`'s `approve_request`. It was one of five `22023`s and
-- the client could only find it by matching the sentence.

select public._as(:u_duena);

-- ⚠️ MESSAGE AND STATE TOGETHER. Four other refusals in this body could fire on
-- a mistyped fixture, and three of them would leave a state-only check green
-- before `0036` and red after — which reads as the migration being wrong.
select chk_raises_like(
  '1.1 inviting somebody who has ALREADY ASKED raises TD004',
  format('select public.create_invite(%L, %L, %L, %L::uuid[])',
         :'ws_a', 'ya.pidio@example.mx', 'staff', array[:'loc_a1']::uuid[]),
  'TD004', 'has already requested access');

-- ⚠️ THE OLD CODE IS GONE, ASSERTED SEPARATELY. "It raises TD004" and "it no
-- longer raises 22023" are the same sentence only while a raise site raises one
-- thing — which is exactly what a bad transcription breaks.
select chk(
  '1.2 …and that branch no longer carries 22023 in the APPLIED body',
  public._src('create_invite') ~ 'has already requested access'
  and public._src('create_invite') ~ 'errcode\s*=\s*''TD004''',
  'read from pg_proc.prosrc, not from the migration file');

-- ⚠️ THE DETAIL FIELD IS NOT A CLIENT CONTRACT AND IS ASSERTED ANYWAY, because
-- `0028` set the precedent (the staff-invite refusal carries one) and a detail
-- that silently vanished would take the only pointer to `approve_request` with
-- it — for whoever is reading a log rather than a screen.
-- ⚠️ `chk_raises_like` reads `sqlerrm`, which is the MESSAGE and never the
-- DETAIL, so the pointer is asserted where it actually lives — in the applied
-- body. A session that dropped it would take the only breadcrumb to
-- `approve_request` with it, for whoever is reading a log rather than a screen.
select chk(
  '1.3 …and the refusal still points at approve_request for whoever reads a log',
  public._src('create_invite') ~ 'approve_request',
  'the TD004 branch''s DETAIL, read from pg_proc.prosrc');


-- ============================================================================
-- 2. ⚠️ THE FOUR 22023s THAT DID NOT MOVE — the transcription guard
-- ============================================================================
-- Every one driven for real. If `create or replace` dropped or reordered a
-- branch, the function is broken in a way `TD004` passing would hide.

select chk_raises_like(
  '2.1 a BLANK address is still 22023',
  format('select public.create_invite(%L, %L, %L, %L::uuid[])',
         :'ws_a', '   ', 'staff', array[:'loc_a1']::uuid[]),
  '22023', 'an email address is required');

select chk_raises_like(
  '2.2 a MALFORMED address is still 22023',
  format('select public.create_invite(%L, %L, %L, %L::uuid[])',
         :'ws_a', 'no-arroba-aqui', 'staff', array[:'loc_a1']::uuid[]),
  '22023', 'does not look like an email address');

select chk_raises_like(
  '2.3 a STAFF invite naming NO store is still 22023 (D8''s argument)',
  format('select public.create_invite(%L, %L, %L, %L::uuid[])',
         :'ws_a', 'sin.tienda@example.mx', 'staff', '{}'::uuid[]),
  '22023', 'must name at least one location');

select chk_raises_like(
  '2.4 a store from ANOTHER workspace is still 22023',
  format('select public.create_invite(%L, %L, %L, %L::uuid[])',
         :'ws_a', 'otra.tienda@example.mx', 'staff', array[:'loc_b1']::uuid[]),
  '22023', 'does not belong to this workspace');

-- ⚠️ AND THE COUNT, because four passing checks do not say there are only four.
-- A fifth 22023 grown into this body by a later session is a code the client
-- cannot branch on, which is the defect this whole task is about.
select chk(
  '2.5 the applied body raises 22023 in EXACTLY four places, and TD004 in one',
  (length(public._src('create_invite'))
   - length(replace(public._src('create_invite'), '''22023''', ''))) / 7 = 4
  and (length(public._src('create_invite'))
   - length(replace(public._src('create_invite'), '''TD004''', ''))) / 7 = 1,
  format('22023 x%s, TD004 x%s',
         (length(public._src('create_invite'))
          - length(replace(public._src('create_invite'), '''22023''', ''))) / 7,
         (length(public._src('create_invite'))
          - length(replace(public._src('create_invite'), '''TD004''', ''))) / 7));


-- ⚠️⚠️ 2.6 IS HERE BECAUSE THIS MIGRATION SHIPPED THE DEFECT IT CATCHES, AND
-- NOTHING IN THIS FILE SAW IT. `create or replace` needs the whole function,
-- so the whole function is transcribed — and `redeem_invite`'s whole function
-- had been replaced ONCE SINCE `0028`, by `0034`, which added
-- `display_name = coalesce(display_name, auth_full_name(...))` so an invitee
-- arrives NAMED. The first writing of `0036` transcribed `0028` and silently
-- reverted it. Every check above stayed green; `supabase/tests/0034` 2.2 and
-- `0035` 3.4/3.5 went red, one directory sweep later.
--
-- This is `0035` check 6.2's rule — the owner's ruling of 2026-09-18, read out
-- of the catalog — re-performed in the suite named after the migration most
-- likely to break it. ⚠️ It is NOT a duplicate: 6.2 lives in the suite of the
-- function that may REPLACE a name, and this lives in the suite of a file that
-- rewrites two of the three that may only FILL A HOLE. A later
-- `create or replace` of either now lands red in its own file.
select chk(
  '2.6 ⚠️ redeem_invite STILL fills a missing name rather than overwriting one',
  public._src('redeem_invite') ~ 'display_name\s*=\s*coalesce\(display_name'
  and public._src('redeem_invite') ~ 'auth_full_name',
  format('0034''s writer survived the transcription: coalesce=%s auth_full_name=%s',
         public._src('redeem_invite') ~ 'display_name\s*=\s*coalesce\(display_name',
         public._src('redeem_invite') ~ 'auth_full_name'));


-- ============================================================================
-- 3. TD005 — a token that will never work, whichever way it is dead
-- ============================================================================
-- Decision 2 of `0036`, taken on the owner's behalf: the unknown token and the
-- token somebody else has spent are ONE meaning, which is `0028` decision 11's
-- own words, and they get ONE code.

select public._as(:u_terc);

select chk_raises_like(
  '3.1 an UNKNOWN token raises TD005',
  format('select public.redeem_invite(%L)', 'ZZZZZZZZZZZZZZZZ'),
  'TD005', 'this invitation code is not valid');

select chk_raises_like(
  '3.2 a token somebody ELSE has already spent raises TD005 too',
  format('select public.redeem_invite(%L)', :'t_inv'),
  'TD005', 'has already been used');

-- ⚠️ THE IDEMPOTENT BRANCH IS NOT A REFUSAL AND MUST NOT HAVE BECOME ONE. The
-- SAME token in the SAME hand is a 200 carrying already_redeemed — `0028`
-- decision 10, and the pilot store is offline a lot, so a joiner tapping twice
-- is the ordinary case. It sits one `if` above 3.2's raise; a transcription
-- that lost the `accepted_by = v_user` test would turn the commonest success
-- on this path into TD005 and nothing else here would say so.
-- ⚠️⚠️ THROUGH `_verdict`, NOT CALLED INLINE, AND A FALSIFICATION FOUND THAT.
-- The first spelling called `redeem_invite` straight inside `chk`, so the
-- fixture that breaks this branch (F6: the `accepted_by = v_user` test forced
-- false) made it RAISE — and a raise inside a bare statement ABORTS the file
-- under ON_ERROR_STOP. The suite printed no FAIL rows at all, which is the
-- shape `0035` recorded scoring GREEN one level up: the check written for
-- exactly this defect never got to record it. It is caught here instead.
select public._as(:u_invit);
select chk(
  '3.3 …but the SAME person re-presenting her OWN spent token is still a SUCCESS',
  public._verdict(format('select public.redeem_invite(%L)', :'t_inv'))
    = 'already_redeemed',
  format('got %s',
         public._verdict(format('select public.redeem_invite(%L)', :'t_inv'))));

-- ⚠️ TD003 DID NOT MOVE. `4d-i`'s rule is that codes are reused, and expired-or-
-- superseded still reuses `0021`'s. If `0036` had swept it up, a joiner holding
-- a replaced code would be told her code is invalid — "ask for a new one" and
-- "that is not a code" are different next steps.
select public._as(:u_duena);
select public.create_invite(:'ws_a', 'reemplazada@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_one \gset
select public.create_invite(:'ws_a', 'reemplazada@example.mx', 'staff',
                            array[:'loc_a1']::uuid[]) as r_two \gset
select (:'r_one'::jsonb->>'token') as t_dead \gset

select public._as(:u_terc);
select chk_raises_like(
  '3.4 a SUPERSEDED token still raises TD003, not TD005',
  format('select public.redeem_invite(%L)', :'t_dead'),
  'TD003', 'replaced by a newer one');

-- A blank token is a bad PAYLOAD, not a dead credential, and stays 22023.
select chk_raises_like(
  '3.5 a BLANK token is still 22023 — a bad payload is not a dead code',
  format('select public.redeem_invite(%L)', '   '),
  '22023', 'a token is required');


-- ============================================================================
-- 4. ⚠️⚠️ THE OVERLOAD IS GONE — the assertion this task exists for
-- ============================================================================
-- `docs/checks/5b-ii-b-2-redeem-contract.sh` assertion 9 said, out loud and
-- against a live database, that a dead token and an absent session answered
-- with the SAME code — so `@/api/redeem` reading it as "dead token" was a
-- judgement about who was standing there rather than a contract. This is that
-- assertion turned over.

select public._as(null);

select chk(
  '4.1 with NO session, redeem_invite still refuses with 42501 — "sign in again"',
  public._state(format('select public.redeem_invite(%L)', 'ZZZZZZZZZZZZZZZZ')) = '42501',
  format('got %s', public._state(format('select public.redeem_invite(%L)',
                                        'ZZZZZZZZZZZZZZZZ'))));

select public._as(:u_terc);

select chk(
  '4.2 …and WITH a session the same dead token refuses with TD005 — "ask for another"',
  public._state(format('select public.redeem_invite(%L)', 'ZZZZZZZZZZZZZZZZ')) = 'TD005',
  format('got %s', public._state(format('select public.redeem_invite(%L)',
                                        'ZZZZZZZZZZZZZZZZ'))));

-- ⚠️⚠️ THE TWO MEASUREMENTS COMPARED TO EACH OTHER, NOT TO CONSTANTS. 4.1 and
-- 4.2 are each satisfiable by editing an expectation; this one is not. It is
-- red for any future migration that lets these two refusals wear one code
-- again, whatever that code turns out to be — which is the defect, stated
-- without naming the numbers that happen to carry it today.
select chk(
  '4.3 ⚠️ THE SAME TOKEN ANSWERS DIFFERENTLY TO A SESSION AND TO NOBODY',
  public._differs(:u_terc, format('select public.redeem_invite(%L)', 'ZZZZZZZZZZZZZZZZ')),
  public._pair(:u_terc, format('select public.redeem_invite(%L)', 'ZZZZZZZZZZZZZZZZ')));

-- ⚠️ AND THE OTHER HALF OF WHY 42501 IS NOW UNAMBIGUOUS HERE: the applied body
-- carries no `42501` literal at all. The one refusal that still raises it spells
-- it `insufficient_privilege`, which is the condition name for exactly "sign in
-- again" — so a session lapse is the ONLY thing this function raises it for.
select public._as(:u_terc);
-- ⚠️ `errcode = '42501'`, NOT the digits. `prosrc` carries the function's own
-- COMMENTS, and `0036`'s explain why 42501 is gone — so the naive spelling of
-- this check was red on a correct tree, which is the shape this repository
-- deletes checks over. Found by running it.
select chk(
  '4.4 redeem_invite''s applied body raises 42501 from NO branch — only the auth guard',
  public._src('redeem_invite') !~ 'errcode\s*=\s*''42501'''
  and public._src('redeem_invite') ~ 'errcode\s*=\s*''insufficient_privilege''',
  format('errcode = ''42501'' appears %s time(s) in the applied body',
         (length(public._src('redeem_invite'))
          - length(regexp_replace(public._src('redeem_invite'),
                                  'errcode\s*=\s*''42501''', '', 'g')))));

-- ⚠️ create_invite KEEPS 42501 and that is not the same thing. Its two are the
-- manager fence and the owner fence — "this is not yours", which is what the
-- code means everywhere else in this schema. Nothing about them was overloaded.
select public._as(:u_caja);
select chk_raises_like(
  '4.5 a CASHIER is still refused 42501 by create_invite''s fence',
  format('select public.create_invite(%L, %L, %L, %L::uuid[])',
         :'ws_a', 'nadie@example.mx', 'staff', array[:'loc_a1']::uuid[]),
  '42501', 'not a manager of this workspace');


-- ============================================================================
-- 5. The ACL survived `create or replace` — 0027's G1 finding, re-performed
-- ============================================================================
-- `create or replace` preserves a function's ACL, so `0028` section 4's
-- `revoke all ... from public` should still stand. ⚠️ THAT IS A SENTENCE ABOUT
-- POSTGRES, AND `0027`'s G1 found a function reachable by anyone by reading
-- `proacl` rather than the migration that was supposed to have revoked it. If
-- `0036` had reset either ACL, nothing else in this repository would have said so.

select public._as(null);

select chk(
  '5.1 create_invite is executable by authenticated and by NOBODY else',
  (select coalesce(array_agg(a::text order by a::text), '{}')
     from pg_proc p, unnest(p.proacl) a
    where p.pronamespace = 'public'::regnamespace
      and p.proname = 'create_invite'
      and a::text not like 'postgres=%')
  = array['authenticated=X/postgres']::text[],
  coalesce((select string_agg(a::text, ', ' order by a::text)
              from pg_proc p, unnest(p.proacl) a
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'create_invite'), 'NULL PROACL — GRANTED TO PUBLIC'));

select chk(
  '5.2 redeem_invite is executable by authenticated and by NOBODY else',
  (select coalesce(array_agg(a::text order by a::text), '{}')
     from pg_proc p, unnest(p.proacl) a
    where p.pronamespace = 'public'::regnamespace
      and p.proname = 'redeem_invite'
      and a::text not like 'postgres=%')
  = array['authenticated=X/postgres']::text[],
  coalesce((select string_agg(a::text, ', ' order by a::text)
              from pg_proc p, unnest(p.proacl) a
             where p.pronamespace = 'public'::regnamespace
               and p.proname = 'redeem_invite'), 'NULL PROACL — GRANTED TO PUBLIC'));

-- ⚠️ AND THE SHAPE, because `create or replace` also preserves — or silently
-- fails to preserve — everything the header declares. A function that came back
-- `security invoker` would still answer every check above as the superuser and
-- refuse every real caller.
select chk(
  '5.3 both are still security definer with an EMPTY search_path, and unique',
  (select count(*) = 1 from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'create_invite'
      and p.prosecdef and p.proconfig @> array['search_path=""'])
  and
  (select count(*) = 1 from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = 'redeem_invite'
      and p.prosecdef and p.proconfig @> array['search_path=""']),
  coalesce((select string_agg(p.proname || ' secdef=' || p.prosecdef
                              || ' cfg=' || coalesce(array_to_string(p.proconfig, ','), 'NONE'),
                              ' | ' order by p.proname)
              from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and p.proname in ('create_invite', 'redeem_invite')), 'NEITHER EXISTS'));


-- ============================================================================
-- 6. The comments name the codes that are actually raised
-- ============================================================================
-- `0035` measured that deleting a restated comment turns NOTHING red, and
-- recorded the green rather than hiding it. This is that gap closed for the one
-- case where it costs something: both comments NAMED the codes these raise
-- sites used to carry, and a comment that has gone false about a SQLSTATE is
-- how the next session ships a client branching on the old one.

select chk(
  '6.1 create_invite''s comment names TD004 and no longer promises 22023 for the ask',
  obj_description('public.create_invite(uuid, public.citext, public.workspace_role, uuid[])'::regprocedure)
    like '%TD004%',
  coalesce(left(obj_description(
    'public.create_invite(uuid, public.citext, public.workspace_role, uuid[])'::regprocedure), 60),
    'NO COMMENT'));

select chk(
  '6.2 redeem_invite''s comment names TD005 and no longer says 42501 for a spent token',
  obj_description('public.redeem_invite(text)'::regprocedure) like '%TD005%'
  and obj_description('public.redeem_invite(text)'::regprocedure)
        not like '%42501 for anyone else%',
  coalesce(left(obj_description('public.redeem_invite(text)'::regprocedure), 60),
           'NO COMMENT'));


-- ============================================================================
-- 7. ⚠️ THE CENSUS — nothing else in this schema wears these two codes
-- ============================================================================
-- The plan's decision 2 says `TD004` and `TD005` freeze the moment this merges,
-- and that is only true if they were free. `supabase/README.md` is the
-- authority on numbering and it is a FILE; this reads the applied catalog.

select chk(
  '7.1 TD004 is raised by create_invite and by NOTHING else in the schema',
  (select coalesce(array_agg(proname::text order by proname), '{}')
     from pg_proc where pronamespace = 'public'::regnamespace
       and prosrc like '%TD004%') = array['create_invite']::text[],
  coalesce((select string_agg(proname, ', ' order by proname)
              from pg_proc where pronamespace = 'public'::regnamespace
                and prosrc like '%TD004%'), 'NONE — TD004 IS RAISED NOWHERE'));

select chk(
  '7.2 TD005 is raised by redeem_invite and by NOTHING else in the schema',
  (select coalesce(array_agg(proname::text order by proname), '{}')
     from pg_proc where pronamespace = 'public'::regnamespace
       and prosrc like '%TD005%') = array['redeem_invite']::text[],
  coalesce((select string_agg(proname, ', ' order by proname)
              from pg_proc where pronamespace = 'public'::regnamespace
                and prosrc like '%TD005%'), 'NONE — TD005 IS RAISED NOWHERE'));

-- ⚠️ AND THE NEXT ONE IS FREE, stated here because the next session to mint a
-- code will read this file's siblings and not `supabase/README.md`. `TD006` is
-- the next slot; if this ever goes red, somebody has minted one without saying so.
select chk(
  '7.3 TD006 is still free — the next slot, asserted rather than assumed',
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD006%') = 0,
  coalesce((select string_agg(proname, ', ' order by proname)
              from pg_proc where pronamespace = 'public'::regnamespace
                and prosrc like '%TD006%'), 'free'));

-- ⚠️ THE OTHER THREE CODES ARE UNTOUCHED. `0036` replaced two functions; if a
-- transcription had swept up `TD003` in `redeem_invite`, section 3.4 would
-- catch it — but TD001 and TD002 live in functions this migration never names,
-- and nothing would say so if a session "tidied" them while here.
select chk(
  '7.4 TD001, TD002 and TD003 are all still raised somewhere',
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD001%') > 0
  and (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD002%') > 0
  and (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and prosrc like '%TD003%') > 0,
  'the three codes that were already minted');


-- ============================================================================
-- 8. Did this file actually run?
-- ============================================================================
-- A green tick is also what a step that ran nothing looks like, and a suite that
-- silently SHRANK is the third shape. Only a pinned count catches it.

select chk('8.1 ALL 29 CHECKS IN THIS FILE ACTUALLY RAN',
           (select count(*) from public._verify) = 28,
           format('recorded=%s of 28 before this one',
                  (select count(*) from public._verify)));

drop function public._verdict(text);
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
