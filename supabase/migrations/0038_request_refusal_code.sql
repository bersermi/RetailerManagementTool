-- ============================================================================
-- 0038_request_refusal_code.sql — ONE APPLICATION SQLSTATE, AND NOTHING ELSE
--
-- Build step 5's task `5b.9`, and the FOURTH migration of step 5.
--
-- NO table, NO column, NO view, NO policy, NO trigger, NO grant, NO signature.
-- ONE applied function is `create or replace`d so that ONE `raise` site carries
-- a code of its own, and its comment is restated. That is the whole file.
--
-- ⚠️⚠️ WHY IT EXISTS: `0029` REFUSES AN UNKNOWN WORKSPACE CODE WITH `42501`,
-- AND `42501` IS ALSO WHAT AN ABSENT SESSION LOOKS LIKE.
--
--   PostgREST raises `42501` to a caller with no session, and `@/api/errors`
--   maps it app-wide to *"tu sesión se cerró"*. `request_access` raises the
--   same `42501` from its own body for a code that resolves to no shop. So the
--   join box could not tell the two apart, and `@/api/requests` read it as THE
--   CODE — a documented guess about who was standing in front of the phone,
--   argued from `/bienvenida` sitting behind `guard.ts`.
--
-- It guesses right almost always and wrong in exactly one case: a person whose
-- session lapsed mid-screen is told to re-read eight characters that were fine,
-- and her next launch corrects it. ⚠️ **That is the whole exposure**, which is
-- why this blocked nothing for four days and why it is `S`.
--
-- The owner ruled it on 2026-09-22 — *"let's follow your recommendation"* —
-- **yes, mint it, and as its own small task after `5c-iv`**, on the same ground
-- he gave on 2026-09-18: cheap now, dearer once a second caller depends on the
-- guess. This is that migration.
--
-- ⚠️ `0029` DECISION 10 IS NOT BEING CALLED WRONG, exactly as `0036` did not
-- call `0028`'s decision 11 wrong. It said "NO SQLSTATE IS MINTED, AGAIN",
-- citing `4d-i`'s rule that codes are REUSED, and that rule is still right:
-- `TD003` still carries expired-or-superseded on this path, reused rather than
-- multiplied, and `22023` still carries both of this function's bad payloads.
-- What decision 10 could not see is that `42501` here was not being reused, it
-- was being OVERLOADED — reuse is one meaning reached from two places, an
-- overload is two meanings wearing one code, and the difference is whether a
-- client can branch on it. Here it could not.
--
-- ⚠️⚠️ AND `0037` MADE THE CASE SHARPER RATHER THAN SOFTER. Its decision 2
-- chose an EMPTY LIST over a `42501` refusal for a non-owner reading
-- `pending_access_requests`, precisely so this overload would not become a
-- THIRD meaning — and wrote that reason into the applied function's comment.
-- The next module that needs to refuse on this path will not have that exit.
--
-- ============================================================================
-- DECISIONS TAKEN IN THIS FILE
-- ============================================================================
--
-- 1. ⚠️⚠️ THE CODE IS `TD006`, AND IT IS APPEND-ONLY FROM THE MOMENT THIS
--    MERGES. `TD001` (`0016`, same id different lines), `TD002` (`0017`, not
--    enough stock), `TD003` (`0021`, you are past your window), `TD004` and
--    `TD005` (`0036`) are taken. ⚠️ **It was confirmed against the APPLIED
--    CATALOG rather than against `supabase/README.md`**, which is a file:
--    `supabase/tests/0036` check 7.3 has asserted since 2026-09-19 that
--    *"TD006 is still free"* by reading `pg_proc.prosrc`, and that assertion is
--    what this migration turns over. It is rewritten in this same commit — a
--    census and the thing it counts move together.
--
-- 2. ⚠️⚠️ EXACTLY ONE RAISE SITE MOVES, AND IT IS THE ONLY `42501` IN THIS
--    FUNCTION. `0029:212` — *"that code does not match a shop"* — which
--    `0029`'s own decision 4 also uses for an INACTIVE workspace, deliberately
--    and identically. Both are still one refusal with one message; only the
--    code moves. ⚠️ The authentication guard above it keeps
--    `insufficient_privilege`, which is decision 3 of `0036` repeated: it is
--    spelled as the condition name, it means "sign in again", and leaving it is
--    what makes `42501` reaching the join screen mean ONE thing afterwards.
--    Moving it too would retire the overload by emptying the code, which is not
--    the same as resolving it.
--
-- 3. ⚠️ THE TWO `22023`s IN THIS BODY ARE LEFT ALONE. A phone-only account with
--    no email address and a blank or unparseable code are what `22023` is for —
--    a bad payload — and they are one meaning reached two ways, which is
--    `4d-i`'s reuse rule and not an overload. ⚠️ The first is also unreachable
--    in v1 (C1.4 admits Google and email and no phone auth) and is driven by
--    the suite anyway, because a transcription that dropped it would be
--    invisible.
--
-- 4. ⚠️⚠️ `approve_request`'s TWO `42501`s ARE LEFT ALONE, AND THAT IS A
--    DECISION RATHER THAN AN OMISSION. They are *"no such request"* and *"only
--    an owner may approve"* — a fence and a row you may not act on, which is
--    what `42501` means everywhere else in this schema, and `@/api/approvals`
--    already leaves them to `apiErrorMessage` on purpose. Sweeping them up here
--    would make this migration two unrelated changes, and *"one migration over
--    two unrelated functions is harder to falsify and harder to revert"* is
--    this project's own recorded refusal — the reason the owner's ruling said
--    *"as its own small task"* in the first place.
--
-- 5. ⚠️ THE MESSAGE IS UNCHANGED, WORD FOR WORD. Only the `errcode` moves. A
--    migration that fixed the code AND reworded the sentence would be
--    indistinguishable from one that broke the sentence, and the suite matches
--    on the message to prove the right branch fired — so it stays a witness
--    rather than becoming a second thing to re-verify. `0036` decision 5.
--
-- 6. ⚠️ NO GRANT IS RESTATED, AND NO GRANT NEEDS TO BE. `create or replace`
--    preserves a function's ACL, so `0029` section 5's grant to `authenticated`
--    still stands. ⚠️ It is not assumed: check 5.1 reads `proacl` out of
--    `pg_proc` after this migration, which is `0027`'s G1 finding re-performed.
--
-- 7. ⚠️⚠️ THE COMMENT IS RESTATED EVEN THOUGH IT NAMED NO CODE, WHICH IS THE
--    OPPOSITE OF `0036`'s DECISION 7 AND IS DELIBERATE. `0029:316`'s comment
--    says *"An inactive workspace is refused exactly as an unknown code is"*
--    and names no SQLSTATE at all — so it was not false, it was SILENT. Silence
--    is how this defect was shipped: `@/api/requests` had to read the migration
--    body to learn what that refusal raises, and a reader who does not is left
--    assuming `42501` because that is what everything else on this path raises.
--    Check 6.1 reads the new sentence back out of `pg_description`.
--
-- 8. ⚠️⚠️ THE TRANSCRIPTION SOURCE IS `0034`, NOT `0029` — THE RULE `0036`
--    WROTE DOWN AFTER GETTING IT WRONG. `request_access` has been replaced once
--    since `0029`: by `0034:409`, which added
--    `display_name = coalesce(display_name, auth_full_name(...))` inside the
--    `D7` branch so that somebody invited by email who types the SHOP code
--    instead arrives NAMED. Transcribing `0029` would silently revert the
--    owner's ruling of 2026-09-18 in one of the four places it lives, and
--    NOTHING IN THIS FILE'S OWN SUITE WOULD GO RED — `supabase/tests/0034`
--    check 2.3b would, one directory sweep later. ⚠️ Check 2.5 below
--    re-performs that assertion HERE, so the next `create or replace` of this
--    function lands red in its own suite rather than in a sibling's.
--
-- ⚠️⚠️ WHAT THIS MIGRATION DOES NOT DO: IT SHIPS NO SCREEN. `app/src/api/
-- requests.ts` moves in the same commit — `UNKNOWN_CODE` is deleted and
-- `REQUEST_REFUSALS` re-keyed onto `TD006` — and so does
-- `docs/checks/5b-iii-b-request-contract.sh`, whose assertion 9 has asserted
-- since 2026-09-19 that these two events are still INDISTINGUISHABLE. That
-- assertion goes red on a correct tree the moment this applies and is REPLACED
-- BY ITS OPPOSITE, which is the cheapest possible evidence that the fix landed.
-- A marker and the assertion that drives it retire in the same pass; that is
-- `5b-iii-a`'s rule and this is its second instance.
--
-- ADR-035 §2.7, §2.8; docs/PLAN.md task 5b.9.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. request_access — TD006 for a code that resolves to no shop
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE BODY BELOW IS `0034`'s, TRANSCRIBED RATHER THAN REWRITTEN, and it is
-- `0034`'s and not `0029`'s for the reason decision 8 gives. `create or replace`
-- needs the whole function, so the whole function is here; the only difference
-- from `0034:409` is the `errcode` on the code-does-not-resolve branch and the
-- comment above it. Section 2 of the suite drives the two surviving `22023`s,
-- the authentication guard and the `D7` name, which is what says the
-- transcription did not quietly change something else.

create or replace function public.request_access(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_email     public.citext;
  v_code      text;
  v_workspace public.workspace%rowtype;
  v_member    public.workspace_member%rowtype;
  v_pending   public.workspace_invite%rowtype;
  v_has       boolean := false;
  v_member_id uuid;
  v_person_name text;
  v_locations int := 0;
  v_request   public.workspace_invite%rowtype;
begin
  -- ---- 1. the caller, and their address ------------------------------------
  if v_user is null then
    raise exception 'request_access requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- S4: read, never accept. An email ARGUMENT here is a way to claim somebody
  -- else's pending invite through D7's absorb below — including one issued for
  -- `manager` or `owner`.
  select u.email::public.citext into v_email
    from auth.users u where u.id = v_user;

  if v_email is null then
    -- A phone-only Supabase account. It cannot be invited either, since
    -- `workspace_invite.email` is not null, so this is a wall rather than a
    -- branch — and it says so, instead of writing a row nobody can approve.
    raise exception 'request_access: this account has no email address'
      using errcode = '22023';
  end if;

  -- ---- 2. the code ---------------------------------------------------------
  v_code := public.normalize_workspace_code(p_code);
  if v_code is null then
    raise exception 'request_access: a workspace code is required'
      using errcode = '22023';
  end if;

  -- ⚠️ THE WHOLE CODE. No prefix, no `like`, no listing — D6 and C11.6.
  select * into v_workspace
    from public.workspace w
   where w.code = v_code
     and w.is_active;

  -- Decision 4: an inactive workspace is refused exactly as an unknown code is.
  -- ⚠️ 5b.9: TD006, NOT 42501. 0029's decision 10 gave 42501 "one meaning, this
  -- is not yours", and covered the code that resolves to nothing with it — but
  -- PostgREST raises the SAME code to a caller with no session at all, and
  -- @/api/errors maps it to "sign in again" app-wide. So the joiner staring at
  -- a mistyped shop code and the joiner whose session lapsed were
  -- indistinguishable on the wire, and the join box had to GUESS which one was
  -- standing there. TD006 is that guess retired. ⚠️ An INACTIVE workspace still
  -- takes this branch, identically and on purpose: "that shop has been switched
  -- off" is a fact about a workspace, told to somebody who is not a member of it.
  if not found then
    raise exception 'request_access: that code does not match a shop'
      using errcode = 'TD006';
  end if;

  -- ---- 3. already in? ------------------------------------------------------
  select * into v_member
    from public.workspace_member wm
   where wm.workspace_id = v_workspace.id
     and wm.user_id      = v_user;

  if found and v_member.is_active then
    -- Nothing to ask for. §2.8: they are told the thing they wanted is true,
    -- not told about a row.
    return jsonb_build_object(
      'status',         'already_member',
      'workspace_id',   v_workspace.id,
      'workspace_name', v_workspace.display_name,
      'role',           v_member.role
    );
  end if;

  -- ---- 4. D7: a pending invite is a request that already arrived approved ---
  -- D3′ first, through `0027`'s helper: an EXPIRED pending row still holds the
  -- one-pending slot, so without this nobody whose invite lapsed could ever ask.
  perform public.supersede_expired_invite(v_workspace.id, v_email);

  select * into v_pending
    from public.workspace_invite wi
   where wi.workspace_id  = v_workspace.id
     and wi.email         = v_email
     and wi.accepted_at   is null
     and wi.superseded_at is null
   for update;
  v_has := found;

  if v_has and v_pending.source = 'invite' and v_pending.expires_at > now() then
    -- ⚠️ THE INVITE'S ROLE WINS, and there is no requested role for it to win
    -- against (decision 2). §2.7 D7: "someone already invited who then types the
    -- code is simply let in, and is told none of it."
    -- 0034. ⚠️ R1: THIS IS A MEMBERSHIP WRITER, and the row that sized this
    -- task named two of the four. Without the name here, somebody who was
    -- invited by email and then types the shop code instead of the token joins
    -- NAMELESS, standing beside a person who used the token and has a name —
    -- and nothing in the roster can explain why.
    v_person_name := public.auth_full_name(v_user);

    if v_member.id is not null then
      v_member_id := v_member.id;
      update public.workspace_member
         set role         = v_pending.role,
             is_active    = true,
             -- "keep what they typed" — see redeem_invite, 0034.
             display_name = coalesce(display_name, v_person_name)
       where id = v_member_id;
    else
      insert into public.workspace_member (workspace_id, user_id, role, display_name)
      values (v_workspace.id, v_user, v_pending.role, v_person_name)
      returning id into v_member_id;
    end if;

    delete from public.member_location ml where ml.member_id = v_member_id;

    insert into public.member_location (workspace_id, member_id, location_id)
    select v_workspace.id, v_member_id, loc
      from unnest(coalesce(v_pending.location_ids, '{}')) as loc;

    get diagnostics v_locations = row_count;

    update public.workspace_invite
       set accepted_at = now(),
           accepted_by = v_user
     where id = v_pending.id;

    return jsonb_build_object(
      'status',         'joined',
      'workspace_id',   v_workspace.id,
      'workspace_name', v_workspace.display_name,
      'role',           v_pending.role,
      'member_id',      v_member_id,
      'location_count', v_locations
    );
  end if;

  -- ---- 5. a live request of their own (decision 5) -------------------------
  if v_has and v_pending.source = 'request' and v_pending.expires_at > now() then
    return jsonb_build_object(
      'status',         'already_requested',
      'workspace_id',   v_workspace.id,
      'workspace_name', v_workspace.display_name,
      'request_id',     v_pending.id,
      'expires_at',     v_pending.expires_at
    );
  end if;

  -- ---- 6. the ask ----------------------------------------------------------
  -- `role` is the column default, `staff` (decision 2). `token_hash` and
  -- `decided_by` are null, which is what `0027`'s D1/D2 check calls a request;
  -- `location_ids` is empty because they are D8's to choose at approval.
  insert into public.workspace_invite
    (workspace_id, email, source, requested_by)
  values
    (v_workspace.id, v_email, 'request', v_user)
  returning * into v_request;

  return jsonb_build_object(
    'status',         'requested',
    'workspace_id',   v_workspace.id,
    'workspace_name', v_workspace.display_name,
    'request_id',     v_request.id,
    'role',           v_request.role,
    'expires_at',     v_request.expires_at
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. The comment, restated because it was SILENT about the code it raises
-- ----------------------------------------------------------------------------
-- ⚠️ DECISION 7. `0029:316`'s comment named no SQLSTATE at all, so it was not
-- false — it was silent, and silence is how this defect shipped: a reader who
-- does not open the body assumes `42501`, because that is what everything else
-- on this path raises. `0035` measured that deleting a restated comment turns
-- NOTHING red, so check 6.1 of this file's suite reads it back out of
-- `pg_description` rather than trusting that it is here.

comment on function public.request_access(text) is
  'The PULL path (ADR-035 §2.7, C11.5): the joiner enters the workspace code and '
  'asks. ⚠️ Resolves the WHOLE code through this definer body with NO select '
  'policy behind it (D6) — an enumeration oracle by construction, defended by the '
  'length of the code and nothing else. ⚠️ Takes no email argument and no role: '
  'the address is read from auth.users for auth.uid() inside this body, because '
  'an email argument is a way to claim somebody else''s pending invite (D7''s '
  'absorb), and with no role argument "the invite''s role wins over the requested '
  'one" is true by construction. ⚠️ D7: a LIVE pending invite for that address is '
  'ACCEPTED rather than refused — they are let in at the invite''s role and told '
  'none of it, and as of 0034 they arrive NAMED like the person beside them. '
  '⚠️ Calls D3′''s helper first, or a lapsed invite would hold the '
  'one-pending slot against the person it was issued to. Idempotent: a second ask '
  'returns the pending row, an existing member is told they are one. '
  '⚠️⚠️ A CODE THAT RESOLVES TO NO SHOP RAISES TD006 AS OF 0038, AND AN INACTIVE '
  'WORKSPACE IS REFUSED IDENTICALLY: 0029 raised 42501 for both, which is also '
  'what PostgREST returns to a caller with no session, so the join box could not '
  'tell a mistyped code from a lapsed session and had to guess. One meaning, one '
  'code — her next step is to re-read the eight characters, which is nobody '
  'else''s to do for her. ⚠️ 42501 FROM THIS FUNCTION NOW MEANS ONE THING, '
  '"sign in again", which is what @/api/errors has always mapped it to app-wide. '
  '⚠️ The two 22023s stay 22023 — a phone-only account with no address, and a '
  'blank or unparseable code — because a bad payload is one meaning reached two '
  'ways, which is 4d-i''s reuse rule and not an overload. ⚠️ approve_request '
  'KEEPS both of its 42501s: a fence and a row you may not act on are what that '
  'code means everywhere else in this schema. docs/PLAN.md 4.6a-iii, 5b.9.';


-- ----------------------------------------------------------------------------
-- 3. No grants, and that is asserted rather than assumed
-- ----------------------------------------------------------------------------
-- `create or replace` preserves the ACL, so `0029` section 5's grant to
-- `authenticated` is still in force and nothing is restated here. ⚠️ `0027`'s
-- G1 finding is why that is not left as a sentence: it found a function
-- reachable by any authenticated caller by reading `pg_proc.proacl` rather than
-- the migration that was supposed to have revoked it. Check 5.1 of
-- `supabase/tests/0038` reads `proacl` here for the same reason — if
-- `create or replace` had reset the ACL, nothing else in this repository would
-- have said so.
