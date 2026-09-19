-- ============================================================================
-- 0036_invite_refusal_codes.sql — TWO APPLICATION SQLSTATES, AND NOTHING ELSE
--
-- Build step 5b's task `5b-iii-a`, and the THIRD migration of step 5b.
--
-- NO table, NO column, NO view, NO policy, NO trigger, NO grant, NO signature.
-- Two APPLIED functions are `create or replace`d so that three `raise` sites
-- carry a code of their own, and two function comments are restated because
-- they describe the codes those sites used to raise. That is the whole file.
--
-- ⚠️⚠️ WHY IT EXISTS: A MESSAGE IS NOT A CONTRACT, AND TWO CLIENT MODULES WERE
-- TREATING ONE AS IF IT WERE.
--
--   `@/api/invites` exported `ALREADY_REQUESTED_MARKER = 'already requested'`
--   and matched it against the server's prose, because `0028` raises `22023`
--   for FIVE different refusals and only this one has a next step worth a
--   different sentence. `@/api/redeem` mapped `42501` to "that code is dead",
--   knowing full well that `@/api/errors` maps the same `42501` app-wide to
--   "your session ended" — a documented guess about who was standing there.
--
-- Both modules wrote down that the honest fix was a SQLSTATE of its own and
-- that a SQLSTATE is a migration, which `app/**` never ships. The owner ruled
-- it into this step on 2026-09-18 — *"put the SQLSTATE fix in 5b-iii"* — on the
-- ground that it is cheap now and dearer once a second caller depends on the
-- prose. This is that migration.
--
-- ⚠️ `0028` DECISION 11 IS NOT BEING CALLED WRONG. It said "NO SQLSTATE IS
-- MINTED", citing `4d-i`'s rule that codes are REUSED, and that rule is still
-- right: `TD003` still carries expired-or-superseded here, reused rather than
-- multiplied. What decision 11 could not see is that `22023` and `42501` were
-- not being reused, they were being OVERLOADED — reuse is one meaning reached
-- from two places, and an overload is two meanings wearing one code. The
-- difference is whether a client can branch on it, and here it could not.
--
-- ============================================================================
-- DECISIONS TAKEN IN THIS FILE
-- ============================================================================
--
-- 1. ⚠️⚠️ THE CODES ARE `TD004` AND `TD005`, AND THEY ARE APPEND-ONLY FROM THE
--    MOMENT THIS MERGES. `TD001` (`0016`, same id different lines), `TD002`
--    (`0017`, not enough stock) and `TD003` (`0021`, you are past your window)
--    are taken; nothing in `supabase/`, `app/`, `docs/` or `packages/` mentions
--    `TD004` or `TD005` except the plan rows that recommended them. Confirmed
--    against `supabase/README.md`, this project's authority on numbering, on
--    the day rather than trusting the plan's sentence — which is what that
--    row's gate cell ordered.
--
-- 2. ⚠️⚠️ `TD005` COVERS BOTH OF `redeem_invite`'s TOKEN REFUSALS — AN UNKNOWN
--    TOKEN AND ONE SOMEBODY ELSE HAS SPENT — AND THAT IS A DECISION TAKEN ON
--    THE OWNER'S BEHALF. The plan row names one refusal, *"this token is not
--    valid"*. Minting a code for that one alone would leave the spent-by-
--    another branch on `42501`, the client would still need `42501: 'spent'`
--    in its table, and the overload this task exists to retire would survive
--    the task that was supposed to retire it. `0028`'s own decision 11 already
--    treats the two as ONE meaning — *"42501 keeps its one meaning, 'this is
--    not yours': an unknown token, and a token somebody else has already
--    spent"* — and `@/api/redeem` has always given both the same sentence,
--    because a person's next step is identical: ask for another code. So this
--    is one meaning getting one code, not two refusals being conflated.
--    ⚠️ REVERSING IT IS A FIX-FORWARD MIGRATION, not an edit to this file.
--
-- 3. ⚠️ THE `42501` AT `redeem_invite`'s AUTHENTICATION GUARD IS LEFT ALONE,
--    AND LEAVING IT IS THE POINT. It is spelled `insufficient_privilege` and
--    it means "sign in again", which is exactly what `@/api/errors` maps
--    `42501` to app-wide. After this migration `42501` reaching the join
--    screen means ONE thing, and it is the thing the app already believed it
--    meant everywhere else. Moving it too would have retired the overload by
--    emptying the code, which is not the same as resolving it.
--
-- 4. ⚠️ THE FOUR OTHER `22023`s IN `create_invite` ARE LEFT ALONE. A blank
--    address, a malformed address, a staff invite with no store and a store
--    from another workspace are all what `22023` is for — a bad payload — and
--    the phone refuses all four locally (`checkInvite`) before a call is made.
--    They are reused, not overloaded: one meaning, four routes to it. Minting
--    codes for them would be `4d-i`'s rule being broken for tidiness.
--
-- 5. ⚠️ THE MESSAGES ARE UNCHANGED, WORD FOR WORD. Only the `errcode` moves
--    (plus a `detail` on `TD004`, which no client reads). A migration that
--    fixed the code AND reworded the sentence would be indistinguishable from
--    one that broke the sentence, and the contract check that drives this
--    refusal reads the message — so it stays a witness rather than becoming a
--    second thing to re-verify.
--
-- 6. ⚠️ NO GRANT IS RESTATED, AND NO GRANT NEEDS TO BE. `create or replace`
--    preserves a function's ACL — `0017` relied on exactly this — so the
--    `revoke all ... from public` `0028` section 4 ran is still in force.
--    ⚠️ It is not assumed: check 5 of `supabase/tests/0036` reads `proacl` out
--    of `pg_proc` after this migration and pins it to `authenticated` alone.
--
-- 7. ⚠️ BOTH FUNCTION COMMENTS ARE RESTATED, because both NAME the codes they
--    used to raise — `create_invite`'s ends on the approval sentence and
--    `redeem_invite`'s says "42501 for anyone else presenting a spent token"
--    in so many words. `0035` recorded that a restated comment turns nothing
--    red when deleted, so this is documentation and not evidence; the evidence
--    is check 6, which reads the comment back out of `pg_description` because
--    a comment that has gone false about a code IS how the next session gets
--    it wrong.
--
-- 8. ⚠️⚠️ THE TRANSCRIPTION SOURCE IS THE LATEST `create or replace`, NOT THE
--    MIGRATION THAT FIRST CREATED THE FUNCTION — WRITTEN DOWN BECAUSE THIS
--    FILE GOT IT WRONG ONCE. `create_invite` has been replaced only by `0028`,
--    so its body comes from there. `redeem_invite` was replaced by `0034`,
--    which added the `coalesce(display_name, …)` that makes an invitee arrive
--    NAMED — and the first writing of this file transcribed `0028`, silently
--    reverting the owner's ruling of 2026-09-18 in one of the four places it
--    lives. **Nothing in this migration's own suite went red.** Two SIBLING
--    suites did (`0034` check 2.2, `0035` checks 3.4/3.5), which is the whole
--    argument for running the directory rather than the file you just touched.
--    Check 2.6 now re-performs `0035` 6.2's rule here.
--
-- ⚠️⚠️ WHAT THIS MIGRATION DOES NOT DO: IT SHIPS NO SCREEN. `app/src/api/`
-- moves in the same commit — `ALREADY_REQUESTED_MARKER` is deleted and
-- `REDEEM_REFUSALS` re-keyed — but nothing under `app/src/app/` changes, and
-- the two contract checks that DROVE those refusals move with them, because a
-- marker deleted while its assertion stands leaves a check asserting a rule
-- that is no longer true: red on a correct tree, and deleted by whoever meets
-- it next.
--
-- ADR-035 §2.7, §2.8; docs/PLAN.md task 5b-iii-a.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. create_invite — TD004 for the refusal that has a next step
-- ----------------------------------------------------------------------------
-- ⚠️ THE BODY BELOW IS `0028`'s, TRANSCRIBED RATHER THAN REWRITTEN. `create or
-- replace` needs the whole function, so the whole function is here; the only
-- difference from `0028:224` is the `errcode` on the already-requested branch
-- and the comment above it. `supabase/tests/0036` check 2 asserts the other
-- four refusals in this body still answer `22023`, which is what says the
-- transcription did not quietly change something else.

create or replace function public.create_invite(
  p_workspace_id uuid,
  p_email        citext,
  p_role         public.workspace_role default 'staff',
  p_location_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user        uuid := auth.uid();
  v_email       public.citext;
  v_locations   uuid[];
  v_pending     public.workspace_invite%rowtype;
  v_has_pending boolean := false;
  v_replaced    boolean := false;
  v_superseded  int;
  v_token       text;
  v_hash        text;
  v_invite      public.workspace_invite%rowtype;
  v_tries       int := 0;
begin
  -- ---- 1. the caller ------------------------------------------------------
  if v_user is null then
    raise exception 'create_invite requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  -- Decision 1: the fence is here because the function is `security definer`,
  -- and it is the same predicate `workspace_invite_insert` carries (0002:567).
  if not public.has_role(p_workspace_id, 'manager') then
    raise exception 'create_invite: not a manager of this workspace'
      using errcode = '42501';
  end if;

  -- Decision 9: a manager may not mint an owner.
  if p_role = 'owner' and not public.has_role(p_workspace_id, 'owner') then
    raise exception 'create_invite: only an owner may invite an owner'
      using errcode = '42501';
  end if;

  -- ---- 2. the address -----------------------------------------------------
  v_email := nullif(btrim(coalesce(p_email::text, '')), '')::public.citext;
  if v_email is null then
    raise exception 'create_invite: an email address is required'
      using errcode = '22023';
  end if;

  -- Not a validator. One `@` with something either side is the shape a typo
  -- fails and a real address does not; anything stricter refuses real mailboxes
  -- and this column is a label for a person, not a delivery mechanism (§2.7:
  -- delivery is out of band).
  if v_email::text !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    raise exception 'create_invite: % does not look like an email address', v_email
      using errcode = '22023';
  end if;

  -- ---- 3. the locations (decision 8) --------------------------------------
  v_locations := coalesce(p_location_ids, '{}');

  if p_role = 'staff' then
    -- D8's ARGUMENT, applied to the path D8 does not cover. An approved joiner
    -- with no locations opens the app and every write is refused by RLS with no
    -- message, which looks exactly like the app being broken.
    if cardinality(v_locations) = 0 then
      raise exception 'create_invite: a staff invite must name at least one location'
        using errcode = '22023',
              detail  = 'Staff write only where member_location puts them, and '
                        'RLS refuses the rest silently (ADR-035 §2.7).';
    end if;

    -- Deduplicated, because `member_location`'s primary key would otherwise
    -- refuse the second copy at redemption — an hour later, to somebody else.
    select array_agg(distinct l) into v_locations from unnest(v_locations) as l;

    if exists (
      select 1 from unnest(v_locations) as want(id)
       where not exists (
         select 1 from public.location loc
          where loc.id = want.id
            and loc.workspace_id = p_workspace_id
            and loc.is_active
       )
    ) then
      raise exception 'create_invite: a location does not belong to this workspace'
        using errcode = '22023';
    end if;
  else
    -- Decision 8's converse. 0002:377: empty for a manager or owner, who get
    -- every location from my_locations() by role.
    v_locations := '{}';
  end if;

  -- ---- 4. the slot (D3′, and decisions 6 and 7) ---------------------------
  -- `workspace_invite_one_pending_idx` admits ONE live row per (workspace,
  -- email). Three things can be sitting in it, and they are not the same thing.
  select * into v_pending
    from public.workspace_invite wi
   where wi.workspace_id  = p_workspace_id
     and wi.email         = v_email
     and wi.accepted_at   is null
     and wi.superseded_at is null
   for update;

  -- ⚠️ Captured rather than re-read. FOUND is not documented as surviving the
  -- function call two statements below, and a branch that silently stopped
  -- firing would present as D3′ never having been wired up at all.
  v_has_pending := found;

  if v_has_pending and v_pending.source = 'request' and v_pending.expires_at > now() then
    -- Decision 7. This is an approval, and approval is 0029's RPC because it
    -- carries D8. No such row can exist until 0029 applies.
    -- ⚠️ 5b-iii-a: THIS IS THE ONE REFUSAL HERE THAT HAS A NEXT STEP, AND IT
    -- NOW HAS A CODE. 0028's decision 11 reused 22023 under 4d-i's rule, and
    -- four other refusals in this body raise it too — so the client could only
    -- tell them apart by matching the sentence, which is not a contract. TD004
    -- is minted for exactly this: somebody already asked, and the answer is
    -- approve_request (0029), not a second invite.
    raise exception 'create_invite: % has already requested access — approve the '
                    'request instead', v_email
      using errcode = 'TD004',
            detail  = 'A live pending REQUEST holds this address'' slot. '
                      'Approving it is 0029''s approve_request, which carries D8.';
  end if;

  -- D3′, through 0027's helper: the EXPIRED pending row, whatever its source.
  -- Without this the index holds the slot forever and nobody can ever re-ask.
  v_superseded := public.supersede_expired_invite(p_workspace_id, v_email);

  -- Decision 6: and the LIVE pending invite, which D3′ does not cover.
  if v_has_pending and v_pending.source = 'invite' and v_pending.expires_at > now() then
    update public.workspace_invite
       set superseded_at = now()
     where id = v_pending.id;
    v_replaced := true;
  end if;

  -- ---- 5. the token -------------------------------------------------------
  -- 80 bits makes a collision a fiction, and the unique constraint makes it an
  -- error in front of an owner rather than a fiction. Retry-on-collision is
  -- 0027's shape for the same reason.
  loop
    v_token := public.generate_invite_token();
    v_hash  := public.hash_invite_token(v_token);

    exit when not exists (
      select 1 from public.workspace_invite wi where wi.token_hash = v_hash
    );

    v_tries := v_tries + 1;
    if v_tries >= 100 then
      raise exception 'could not generate an unused invite token in % attempts', v_tries
        using errcode = 'internal_error';
    end if;
  end loop;

  insert into public.workspace_invite
    (workspace_id, email, role, location_ids, source, decided_by, token_hash)
  values
    (p_workspace_id, v_email, p_role, v_locations, 'invite', v_user, v_hash)
  returning * into v_invite;

  -- ⚠️ THE TOKEN IS IN THIS RESULT AND NOWHERE ELSE, EVER. Only the hash is
  -- stored (0002:364), so an owner who loses it invites again — which is
  -- decision 6, and why that path costs no human step.
  return jsonb_build_object(
    'invite_id',        v_invite.id,
    'workspace_id',     v_invite.workspace_id,
    'email',            v_invite.email,
    'role',             v_invite.role,
    'location_ids',     to_jsonb(v_invite.location_ids),
    'expires_at',       v_invite.expires_at,
    'token',            v_token,
    'replaced_pending', v_replaced,
    'superseded_count', v_superseded
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. redeem_invite — TD005 for a token that will never work
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THIS BODY IS `0034`'s, NOT `0028`'s, AND THE FIRST WRITING OF THIS FILE
-- GOT IT WRONG. `redeem_invite` was replaced once since `0028` — `0034` added
-- `display_name = coalesce(display_name, public.auth_full_name(...))` so an
-- invitee ARRIVES NAMED, which is the owner's ruling of 2026-09-18 ("keep what
-- they typed") in the one place a membership is created. Transcribing from
-- `0028` silently REVERTED that, and the shape of the failure is the reason
-- this repository writes suites: nothing in `0036` went red. `supabase/tests/
-- 0034` check 2.2 did — "the invitee arrives named" — and `0035`'s 6.2, which
-- reads the coalesce out of `pg_proc.prosrc` precisely so a later session that
-- tidies one away lands red. It landed. ⚠️ Check 2.6 below now re-performs
-- that assertion inside THIS file, so the next `create or replace` of this
-- function is red in its own suite rather than in a sibling's.
--
-- Two `errcode`s move and nothing else: the unknown token and the token
-- somebody else spent. The authentication guard above them keeps
-- `insufficient_privilege`, which is decision 3 and is the half of the overload
-- that was always telling the truth.

create or replace function public.redeem_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_hash       text;
  v_invite     public.workspace_invite%rowtype;
  v_workspace  public.workspace%rowtype;
  v_member_id  uuid;
  v_person_name text;
  v_existed    boolean := false;
  v_locations  int;
begin
  -- ---- 1. the caller ------------------------------------------------------
  -- §2.7: "the recipient signs up through ordinary Supabase auth, THEN calls
  -- redeem_invite". There is no path here for an anonymous caller: the row this
  -- writes references auth.users.
  if v_user is null then
    raise exception 'redeem_invite requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  if nullif(btrim(coalesce(p_token, '')), '') is null then
    raise exception 'redeem_invite: a token is required'
      using errcode = '22023';
  end if;

  -- ---- 2. the row ---------------------------------------------------------
  v_hash := public.hash_invite_token(p_token);

  -- ⚠️ A `source = 'request'` row can never be found here and no branch tests
  -- for it: 0027's workspace_invite_source_consistent makes `token_hash` NULL on
  -- that path, and a null cannot equal a hash. The constraint is the check.
  select * into v_invite
    from public.workspace_invite wi
   where wi.token_hash = v_hash
   for update;

  if not found then
    -- ⚠️ 5b-iii-a: TD005, NOT 42501. 0028's decision 11 gave 42501 "one
    -- meaning, this is not yours" — but PostgREST raises the SAME code for a
    -- caller with no session at all, and @/api/errors maps it to "sign in
    -- again" app-wide. So the joiner staring at a dead token and the joiner
    -- whose session lapsed were indistinguishable on the wire, and the screen
    -- had to GUESS which one was standing there. TD005 is that guess retired.
    raise exception 'redeem_invite: this invitation code is not valid'
      using errcode = 'TD005';
  end if;

  -- ---- 3. already spent ---------------------------------------------------
  if v_invite.accepted_at is not null then
    if v_invite.accepted_by = v_user then
      -- Idempotent, as 0021's void and 0026's replay are: the thing they asked
      -- for is already true. A joiner who taps twice on a bad connection is the
      -- ordinary case, not an error.
      select wm.id into v_member_id
        from public.workspace_member wm
       where wm.workspace_id = v_invite.workspace_id
         and wm.user_id      = v_user;

      select * into v_workspace
        from public.workspace w where w.id = v_invite.workspace_id;

      return jsonb_build_object(
        'workspace_id',      v_invite.workspace_id,
        'workspace_name',    v_workspace.display_name,
        'member_id',         v_member_id,
        'role',              v_invite.role,
        'location_count',    (select count(*) from public.member_location ml
                               where ml.member_id = v_member_id),
        'already_redeemed',  true,
        'membership_existed', true
      );
    end if;

    -- ⚠️ THE SAME CODE, AND DELIBERATELY. 0028 decision 11 made "an unknown
    -- token, and a token somebody else has already spent" ONE meaning, and
    -- @/api/redeem has always given both the same sentence. Splitting them
    -- into two codes here would mint a distinction no screen draws and no
    -- person can act on differently: either way the token she is holding will
    -- never work, and her next step is to ask for another.
    raise exception 'redeem_invite: this invitation has already been used'
      using errcode = 'TD005';
  end if;

  -- ---- 4. expiry and supersession (decision 11) ---------------------------
  if v_invite.superseded_at is not null then
    raise exception 'redeem_invite: this invitation was replaced by a newer one — '
                    'ask for the latest code'
      using errcode = 'TD003';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'redeem_invite: this invitation expired on % — ask for a new one',
                    v_invite.expires_at
      using errcode = 'TD003';
  end if;

  -- ---- 5. the membership (decision 10) ------------------------------------
  select wm.id into v_member_id
    from public.workspace_member wm
   where wm.workspace_id = v_invite.workspace_id
     and wm.user_id      = v_user
   for update;

  -- 0034: the name the caller signed up with, normalised to NULL when there is
  -- none. Read once, used by both branches below.
  v_person_name := public.auth_full_name(v_user);

  if found then
    v_existed := true;
    update public.workspace_member
       set role         = v_invite.role,
           is_active    = true,
           -- ⚠️ THE OWNER'S RULING OF 2026-09-18, "keep what they typed": on an
           -- UPDATE the stored name wins whenever there is one. A re-invite is
           -- an event this person did not trigger and is not told about, and
           -- refreshing here would replace a correction she made about herself
           -- with whatever her identity provider last sent. The `coalesce` only
           -- fills a hole. 0034.
           display_name = coalesce(display_name, v_person_name)
     where id = v_member_id;
  else
    insert into public.workspace_member (workspace_id, user_id, role, display_name)
    values (v_invite.workspace_id, v_user, v_invite.role, v_person_name)
    returning id into v_member_id;
  end if;

  -- The invite is the most recent statement of where this person works, so it
  -- REPLACES what was there rather than merging with rows nobody remembers
  -- writing. For a manager or owner that is an empty set, which is 0002:377's
  -- rule and not an omission: my_locations() grants them every location by role.
  delete from public.member_location ml where ml.member_id = v_member_id;

  insert into public.member_location (workspace_id, member_id, location_id)
  select v_invite.workspace_id, v_member_id, loc
    from unnest(coalesce(v_invite.location_ids, '{}')) as loc;

  get diagnostics v_locations = row_count;

  -- ---- 6. the invite is spent ---------------------------------------------
  -- D4: `accepted_by` is who ACTUALLY joined, which is the caller and not the
  -- address on the row (decision 5). `decided_by` was set at creation and is
  -- left exactly as it was — the inviter, not the invitee.
  update public.workspace_invite
     set accepted_at = now(),
         accepted_by = v_user
   where id = v_invite.id;

  select * into v_workspace
    from public.workspace w where w.id = v_invite.workspace_id;

  return jsonb_build_object(
    'workspace_id',       v_invite.workspace_id,
    'workspace_name',     v_workspace.display_name,
    'member_id',          v_member_id,
    'role',               v_invite.role,
    'location_count',     v_locations,
    'already_redeemed',   false,
    'membership_existed', v_existed
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- 3. The two comments, restated because both named a code that has moved
-- ----------------------------------------------------------------------------
-- ⚠️ `0035` measured this and recorded the result: deleting a restated comment
-- turns NOTHING red, because a comment is not reachable from a behavioural
-- assertion. So these are restated AND check 6 of the suite reads them back
-- out of `pg_description` — a comment that has gone false about a SQLSTATE is
-- precisely how the next session ships a client branching on the old one.

comment on function public.create_invite(uuid, public.citext, public.workspace_role, uuid[]) is
  'Issues one single-use invite and returns its token, which is shown once and '
  'delivered out of band — only the hash is stored. ⚠️ security definer with the '
  'manager fence in the BODY, not "under normal RLS" as §2.7''s pre-amendment '
  'prose says: D3′ orders the creating RPC to supersede an expired pending row, '
  'that is an UPDATE, and workspace_invite has no update policy (0002:576) — so '
  'under RLS the supersede would match zero rows silently and the insert would '
  'then hit 23505, which is D3′''s own bug wearing the fix''s costume. ⚠️ Takes '
  'p_workspace_id rather than deriving it: §2.7 keeps many-workspaces-per-user '
  'working from day one and a derived spelling is that retrofit, pre-written. '
  '⚠️ A staff invite must name a location — D8''s ARGUMENT (RLS refuses a '
  'location-less staff member silently) applied to the path D8 does not cover; '
  'a manager or owner invite stores ''{}'' whatever was passed. ⚠️ A LIVE pending '
  'invite for the same address is REPLACED and the old token stops working, '
  'because "send it again" is what a shop does and refusing costs a human step; '
  'a live pending REQUEST is refused instead, because inviting someone who has '
  'already asked is an approval and approval is 0029''s approve_request (D8). '
  '⚠️⚠️ THAT REFUSAL RAISES TD005''s SIBLING, TD004, AS OF 0036 — it raised '
  '22023 from 0028 until then, alongside the four bad-payload refusals below, '
  'and @/api/invites could only tell it apart by matching the sentence. The '
  'four payload refusals (blank address, malformed address, a staff invite '
  'naming no location, a location from another workspace) KEEP 22023: one '
  'meaning reached four ways is reuse, which is 4d-i''s rule, not an overload. '
  '⚠️ 42501 here still means the fence — not a manager, or a manager reaching '
  'for owner. ⚠️ A manager may not invite an owner. ADR-035 §2.7, §2.8; '
  'docs/PLAN.md 4.6a-ii, 5b-iii-a.';

comment on function public.redeem_invite(text) is
  'Spends one invite token: writes the workspace_member and member_location rows '
  'and marks the invite accepted (ADR-035 §2.7). security definer, because the '
  'caller is not a member of anything yet and no policy could admit them. '
  '⚠️ IT DOES NOT REQUIRE THE CALLER''S EMAIL TO MATCH THE INVITE''S: the token '
  'is the credential, and the address the owner typed is not necessarily the one '
  'a Google sign-in returns — a mismatch would refuse the ordinary case silently. '
  'accepted_by records who actually joined (D4), so the difference is kept rather '
  'than lost. ⚠️ Idempotent for the same caller — a second call returns '
  'already_redeemed. ⚠️⚠️ A TOKEN THAT WILL NEVER WORK RAISES TD005 AS OF 0036, '
  'BOTH WHEN IT IS UNKNOWN AND WHEN SOMEBODY ELSE HAS SPENT IT: 0028 raised '
  '42501 for both, which is also what PostgREST returns to a caller with no '
  'session, so the join screen could not tell a dead code from a lapsed session '
  'and had to guess. One meaning, one code — her next step is the same either '
  'way, which is to ask for another. ⚠️ 42501 FROM THIS FUNCTION NOW MEANS ONE '
  'THING, "sign in again", which is what @/api/errors has always mapped it to '
  'app-wide. ⚠️ Expired or replaced still raises TD003 (0021''s workflow code, '
  'reused not minted): ask for another. ⚠️ A returning member is REACTIVATED and '
  'the invite''s locations REPLACE whatever was there; a request row can never be '
  'found here at all, because 0027''s CHECK makes its token_hash null. '
  'docs/PLAN.md 4.6a-ii, 5b-iii-a.';


-- ----------------------------------------------------------------------------
-- 4. No grants, and that is asserted rather than assumed
-- ----------------------------------------------------------------------------
-- `create or replace` preserves the ACL, so `0028` section 4's
-- `revoke all ... from public` still stands and `authenticated` is still the
-- only role that may execute either function. ⚠️ `0027`'s G1 finding is why
-- this is not left as a sentence: it found a function reachable by any
-- authenticated caller by reading `pg_proc.proacl` rather than the migration
-- that was supposed to have revoked it. Check 5 of `supabase/tests/0036` reads
-- `proacl` here for the same reason — if `create or replace` had reset the ACL,
-- nothing else in this repository would have said so.
