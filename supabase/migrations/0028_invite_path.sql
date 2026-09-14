-- ============================================================================
-- 0028 — the PUSH path: create_invite() and redeem_invite()
--
-- ADR-035 §2.7 (amended 2026-09-13, C11.5 / C11.6), §2.8, §9.
-- docs/PLAN.md task 4.6a-ii.
--
-- THE SECOND MIGRATION OF STEP 4.6, and the two functions this database has
-- never had. `0002:362` says in terms that they belong to `0005`; `0005` is the
-- allocator and never wrote them, so ADR-035 has described this flow since it
-- was written and no migration has ever shipped it.
--
-- ADR-035 §2.7, verbatim:
--
--     An owner or manager calls `create_invite(...)` under normal RLS and
--     receives a single-use token. The recipient signs up through ordinary
--     Supabase auth, then calls `redeem_invite(token)` — `security definer` —
--     which verifies hash and expiry, writes the `workspace_member` and
--     `member_location` rows, and marks the invite accepted. `auth.users` is
--     never exposed to anyone.
--
-- Register #9's eight rulings: NONE of them lands here as a new object. `D1`,
-- `D2`, `D4` and `D5` are `0027`'s columns and this file writes rows under them;
-- `D3′` is `0027`'s helper and this file is its FIRST caller; `D6`, `D7` and
-- `D8` are the pull path and are `0029`'s. §2.7's amendment table is the
-- authority on which is which, and each freezes when ITS migration merges.
--
-- ---------------------------------------------------------------------------
-- DECISIONS
-- ---------------------------------------------------------------------------
-- 1. ⚠️⚠️ `create_invite` IS `security definer`, AND §2.7 SAYS "UNDER NORMAL
--    RLS". The sentence quoted above predates its own amendment, and `D3′` is
--    what overtakes it: the creating RPC must SUPERSEDE an expired pending row,
--    superseding is an UPDATE, and `0002:576` says in terms that there is NO
--    UPDATE POLICY on `workspace_invite` — "redemption is written by
--    redeem_invite(), which is security definer. An invite is never edited by
--    hand."
--
--    Under normal RLS that UPDATE matches zero rows and says nothing. The INSERT
--    that follows then collides with `workspace_invite_one_pending_idx` and the
--    owner is told `23505` — which is `D3′`'s bug, exactly, wearing the costume
--    of the fix. The alternative was a definer `supersede_expired_invite`, and
--    `0027` refused it in writing for a reason that still holds: a definer
--    helper reachable on its own is a way to retire someone else's pending
--    invite. `0027`'s own grant comment already names THIS function as one of
--    the definer bodies that call it.
--
--    So the fence moves into the body, which is where `0021`, `0022`, `0025` and
--    `0026` already keep theirs, and it is the SAME fence the policy expresses:
--    `has_role(workspace_id, 'manager')`.
--
-- 2. ⚠️⚠️ IT TAKES `p_workspace_id`, AND `docs/PLAN.md`'s SKETCH OF THE
--    SIGNATURE DOES NOT. The plan's row reads `create_invite(email, role,
--    location_ids)`; those are the three things a person chooses, and the
--    workspace is not one of them because a screen already knows which workspace
--    it is looking at. Deriving it instead — "the one workspace this caller
--    manages" — is a different claim, and §2.7 refuses it in advance: "the
--    policy is set membership, so many workspaces per user works from day one
--    even though every real user has one. Retrofitting that later would touch
--    every screen." A three-argument spelling is that retrofit, pre-written.
--
--    Every other fenced RPC in this schema is named its scope by the caller and
--    checks it — `void_transaction` reads the document, `replay_failed_write`
--    reads the dead letter. This one has no row to read, so it is an argument.
--
-- 3. THE TOKEN IS 16 CROCKFORD CHARACTERS, THE SAME ALPHABET AS `D5`'s CODE.
--    It is delivered the same way — §2.7: "the owner sends the code over
--    WhatsApp" — so it is read, forwarded and sometimes typed by the same person
--    under the same conditions, and the alphabet exists because of exactly that.
--    16 characters is 80 bits: `redeem_invite` is an oracle by construction in
--    the same way `D6`'s resolver is, and the length is what stands in front of
--    it. The join code can be 8 because it admits a caller to NOTHING until an
--    owner approves; this token is itself the approval.
--
-- 4. ⚠️ NORMALISATION LIVES INSIDE THE HASH, NOT BESIDE IT. `hash_invite_token`
--    normalises and then hashes, so `create_invite` and `redeem_invite` cannot
--    disagree about what a token IS — which is the defect this shape exists to
--    make unwriteable, because it would present as "the code the owner is
--    reading aloud does not work" and nothing in the schema would look wrong.
--    A generated token contains no `I`, `L` or `O`, so normalising one is the
--    identity; what it buys is the joiner who types `O` for `0`.
--
-- 5. ⚠️⚠️ REDEMPTION DOES NOT REQUIRE THE CALLER'S EMAIL TO MATCH THE INVITE'S,
--    AND THIS IS THE ONE CALL HERE THE OWNER MIGHT MAKE DIFFERENTLY. The token
--    is the credential: it is unguessable, single-use, seven days old at most,
--    and it went to exactly the person the owner chose to send it to. An email
--    check would add a second factor — and would also refuse the ordinary case
--    this pilot is about to meet, because `5a-iv-c-3` signs the shopkeeper in
--    with GOOGLE, and the address Google returns is not necessarily the one the
--    owner typed into the invite screen. That refusal is silent from the
--    joiner's side and looks like a broken app, which is §2.8's complaint about
--    handing the shopkeeper an edge case.
--
--    `accepted_by` records WHO ACTUALLY JOINED (`D4`), so the mismatch is
--    recorded rather than lost: the invited address stays on `email`, the
--    account that used it is on `accepted_by`, and an owner can read both.
--    ⚠️ Tightening later is a `create or replace`; a client that has branched on
--    it is what makes it dearer, so it is reported by name in this session's
--    closing message and in the PR.
--
-- 6. A LIVE PENDING INVITE FOR THE SAME ADDRESS IS REPLACED, NOT REFUSED.
--    `D3′` only orders the EXPIRED row superseded. The row it does not cover is
--    the one a shop actually produces: "I sent it, they never got it, send it
--    again", four minutes later. Refusing costs a human step — delete the
--    invite, then invite again — and the owner's tie-break is the option that
--    adds none. The old token stops working the moment the new one is issued,
--    which is what "send them another one" means to the person saying it, and
--    the response says `replaced_pending` so a screen can say so.
--
-- 7. ⚠️ A LIVE PENDING *REQUEST* IS REFUSED, and it is the one case this file
--    hands to `0029`. Inviting someone who has already asked is an APPROVAL, and
--    approval is `D8`'s RPC — it takes `location_ids` and refuses an empty array
--    for staff. Absorbing it here would put half of `approve_request` in the
--    push migration, which is the `Z2` fixture's shape exactly: two tasks each
--    assuming the other owns a ruling. No such row can exist until `0029`
--    applies; the branch is written now so that `0029` arriving does not change
--    this function's behaviour silently.
--
-- 8. `D8`'s REASONING, NOT `D8`, IS APPLIED TO THE PUSH PATH. `D8` is `0029`'s
--    ruling about `approve_request` and it stays there. But its ARGUMENT — a
--    staff member with no `member_location` rows opens the app and every write
--    is refused by RLS with no message — is about `member_location`, not about
--    which RPC wrote it, and `create_invite` is the moment the push path chooses
--    those rows. So a `staff` invite with an empty array is refused here too.
--    ⚠️ And the converse: a `manager` or `owner` invite STORES `'{}'` whatever
--    was passed, because `0002:377` says those roles get every location from
--    `my_locations()` by role and rows here would be a lie that outlives a
--    demotion.
--
-- 9. THE INVITED ROLE MAY NOT EXCEED THE INVITER'S. A manager may invite staff
--    and managers — `0002:567` lets them insert the row and §2.7's prose says
--    "an owner or manager calls create_invite" — but §2.7's capability table
--    gives "members, settings, roles" to the OWNER alone. Those two are reconciled
--    the narrowest way that keeps both true: a manager may not mint an owner.
--    Otherwise the members screen is an escalation button.
--
-- 10. A RETURNING MEMBER IS REACTIVATED, AND THE INVITE'S LOCATIONS REPLACE
--    WHATEVER WAS THERE. `workspace_member_unique` makes re-joining an UPDATE
--    rather than an INSERT, and the alternative is `23505` in front of a shop
--    re-hiring last summer's cashier. The invite is the most recent statement of
--    what that person's access should be, so it wins outright rather than being
--    merged with rows nobody remembers writing. ⚠️ This is the only way a
--    membership's role can currently change, and it is an owner's own act.
--
-- 11. ⚠️ NO SQLSTATE IS MINTED. `4d-i`'s rule is that codes are REUSED. An
--    expired or superseded invite raises `TD003` — `0021` minted it for "you are
--    past your window, ask your manager", and "your invitation has lapsed, ask
--    the owner for another" is the same sentence pointed at a different person.
--    `42501` keeps its one meaning, "this is not yours": an unknown token, and a
--    token somebody else has already spent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The token, and the hash that is the only copy of it we keep
-- ----------------------------------------------------------------------------
-- `0002:364`: "Only the hash is stored. The token itself is shown once to the
-- inviter and delivered out of band." That is why `create_invite` returns it in
-- its result and nothing in this schema can ever return it again.

create or replace function public.generate_invite_token()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- The same alphabet as the join code (D5): no I, L, O, U. Read aloud over
  -- WhatsApp by the same person, in the same conditions.
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes    bytea;
  v_token    text := '';
begin
  -- 16 characters over a 32-character alphabet is 80 bits. 256 % 32 = 0, so
  -- `byte % 32` is uniform with no modulo bias — 0027's argument, unchanged.
  v_bytes := extensions.gen_random_bytes(16);
  for i in 0..15 loop
    v_token := v_token || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;

  return v_token;
end;
$$;

comment on function public.generate_invite_token() is
  'One 16-character Crockford base32 invite token — 80 bits, the same alphabet '
  'as the join code because it is delivered the same way. Cryptographically '
  'random: redeem_invite is an oracle by construction and the length is what '
  'defends it. ADR-035 §2.7.';


create or replace function public.hash_invite_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- ⚠️ THE NORMALISER IS INSIDE THE HASH ON PURPOSE. If create_invite and
  -- redeem_invite each normalised for themselves, one of them could stop, and
  -- the symptom would be "the code the owner is reading out does not work" with
  -- nothing in the schema looking wrong.
  --
  -- sha256() is pg_catalog, not pgcrypto: 0021:308 and 0025:2553 both record
  -- that this schema does not install pgcrypto for hashing, and it does not need
  -- to. Hex rather than bytea because `token_hash` is text (0002:383).
  select encode(
           sha256(
             convert_to(public.normalize_workspace_code(p_token), 'UTF8')
           ),
           'hex'
         );
$$;

comment on function public.hash_invite_token(text) is
  'The stored form of an invite token: normalised as a join code is (case, '
  'grouping, Crockford I/L/O), then sha256 hex. Normalisation is INSIDE the '
  'hash so the creating and redeeming halves cannot disagree about what a token '
  'is. ADR-035 §2.7.';


-- ----------------------------------------------------------------------------
-- 2. create_invite — the push, and D3′'s first caller
-- ----------------------------------------------------------------------------

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
    raise exception 'create_invite: % has already requested access — approve the '
                    'request instead', v_email
      using errcode = '22023';
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
  '⚠️ A manager may not invite an owner. ADR-035 §2.7, §2.8; docs/PLAN.md 4.6a-ii.';


-- ----------------------------------------------------------------------------
-- 3. redeem_invite — the other half, and the only way an invite is accepted
-- ----------------------------------------------------------------------------
-- §2.7: "verifies hash and expiry, writes the workspace_member and
-- member_location rows, and marks the invite accepted."

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
    raise exception 'redeem_invite: this invitation code is not valid'
      using errcode = '42501';
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

    raise exception 'redeem_invite: this invitation has already been used'
      using errcode = '42501';
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

  if found then
    v_existed := true;
    update public.workspace_member
       set role      = v_invite.role,
           is_active = true
     where id = v_member_id;
  else
    insert into public.workspace_member (workspace_id, user_id, role)
    values (v_invite.workspace_id, v_user, v_invite.role)
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

comment on function public.redeem_invite(text) is
  'Spends one invite token: writes the workspace_member and member_location rows '
  'and marks the invite accepted (ADR-035 §2.7). security definer, because the '
  'caller is not a member of anything yet and no policy could admit them. '
  '⚠️ IT DOES NOT REQUIRE THE CALLER''S EMAIL TO MATCH THE INVITE''S: the token '
  'is the credential, and the address the owner typed is not necessarily the one '
  'a Google sign-in returns — a mismatch would refuse the ordinary case silently. '
  'accepted_by records who actually joined (D4), so the difference is kept rather '
  'than lost. ⚠️ Idempotent for the same caller — a second call returns '
  'already_redeemed — and 42501 for anyone else presenting a spent token. '
  '⚠️ Expired or replaced raises TD003 (0021''s workflow code, reused not '
  'minted): ask for another. ⚠️ A returning member is REACTIVATED and the '
  'invite''s locations REPLACE whatever was there; a request row can never be '
  'found here at all, because 0027''s CHECK makes its token_hash null. '
  'docs/PLAN.md 4.6a-ii.';


-- ----------------------------------------------------------------------------
-- 4. Grants  (ADR-035 §2.7, and 3.1's finding)
-- ----------------------------------------------------------------------------
-- ⚠️ `revoke ... from public`, NOT `from anon, authenticated`. EXECUTE on a new
-- function is granted to PUBLIC by default, so revoking the two Supabase roles
-- leaves that default standing — `0027`'s G1 found exactly that by reading
-- `pg_proc.proacl` rather than the migration, and it had left
-- `supersede_expired_invite` reachable by any authenticated caller.
--
-- The two helpers get NO client grant: they are called from the definer bodies
-- above. A reachable `generate_invite_token` is harmless; a reachable
-- `hash_invite_token` is an offline oracle for confirming a guessed token
-- without spending it, which is exactly what 80 bits is defending.

revoke all on function public.generate_invite_token()      from public;
revoke all on function public.hash_invite_token(text)      from public;
revoke all on function public.create_invite(uuid, public.citext, public.workspace_role, uuid[]) from public;
revoke all on function public.redeem_invite(text)          from public;

grant execute on function public.create_invite(uuid, public.citext, public.workspace_role, uuid[])
  to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
