-- ============================================================================
-- 0029 — the PULL path: request_access, approve_request, my_access_requests
--
-- ADR-035 §2.7 (amended 2026-09-13, C11.5 / C11.6), §2.8, §9.
-- docs/PLAN.md task 4.6a-iii.
--
-- THE THIRD AND LAST MIGRATION OF `4.6a`, and the half of the amendment the
-- decision maker actually asked for. `0027` was the shape, `0028` was the push
-- ADR-035 had always described; this is the pull that did not exist anywhere
-- before 2026-09-13.
--
-- ADR-035 §2.7, as amended:
--
--     There are two ways in, not one, and the one above is the LESS IMPORTANT
--     of them. The joiner is given a WORKSPACE CODE, enters it, and REQUESTS
--     access, which the owner approves. An invite is simply a request that
--     arrives pre-approved.
--
-- Three of register #9's eight rulings land here and freeze when this merges:
-- D6 (resolve the whole code, no scan policy), D7 (a request absorbs a pending
-- invite), D8 (locations required at approval). D1/D2/D4/D5 froze at `0027`;
-- D3′'s helper is `0027`'s and this file is its second caller.
--
-- ---------------------------------------------------------------------------
-- DECISIONS
-- ---------------------------------------------------------------------------
-- 1. ⚠️⚠️ THIS MIGRATION ADDS A COLUMN, AND THE SPLIT CALLED `0027` "THE TABLE
--    AND THE COLUMN NOBODY HAS". `workspace_invite.requested_by` — the account
--    that asked — nullable, referencing `auth.users`, present exactly on the
--    request path. It is here rather than in `0027` because it is the pull
--    path's own, and `0027` shipped what BOTH paths need.
--
--    ⚠️ IT IS NOT A CONVENIENCE. `D4` says `accepted_by` is "who actually
--    joined", and on the invite path that is `auth.uid()` of whoever redeemed.
--    A request row identifies its person by EMAIL, so without this column
--    approval would have to resolve that string back to an account —
--    `select id from auth.users where email = wi.email` — which is a SECOND
--    identity mechanism for the same column, and it fails outright if the
--    person changed their address between asking and being approved. D4 was
--    renamed precisely because one column meaning two things reads as correct
--    until someone asks who a row is about.
--
--    It also decides `my_access_requests()`: keyed on `requested_by =
--    auth.uid()`, it cannot be moved by an email change. Keyed on the caller's
--    address — which is how the finding that asked for it was written — it can.
--
--    ⚠️ AND IT BREAKS A GREEN SUITE, WHICH IS PREDICTED HERE RATHER THAN
--    DISCOVERED LATER. `supabase/tests/0028_invite_path.sql` hand-writes two
--    `source = 'request'` rows (its 4.8 and 4.9 fixtures) to prove
--    `create_invite` refuses to absorb a live one; the new CHECK refuses those
--    inserts. They are re-signed in this commit, which is `0027`'s S1 arriving
--    a second time — and, as `4c-ii` recorded, a suite that dies in its fixture
--    reports ZERO failing tests.
--
-- 2. `request_access` TAKES THE CODE AND NOTHING ELSE — no email, and NO ROLE.
--    The email is S4's security property, written up in the sizing: an email
--    argument is a way to claim somebody else's pending invite, a `manager` or
--    `owner` one included, so the RPC reads `auth.users` for `auth.uid()`
--    inside the definer body.
--
--    ⚠️ The ROLE is the same argument one step further, and it makes D7's
--    "the absorbed invite's role wins over the requested one" TRUE BY
--    CONSTRUCTION rather than by a branch that could be deleted: there is no
--    requested role to lose to. A request is created at the table's default,
--    `staff`. An owner who wants a manager uses the push path, where naming a
--    role is the inviter's act and `0028` already refuses a manager minting an
--    owner.
--
-- 3. ⚠️ THE RESULT CARRIES THE WORKSPACE'S NAME, AND IT IS THE ONE PLACE THE
--    ORACLE RETURNS MORE THAN YES. D6 accepts that a code resolver is an
--    enumeration oracle by construction and answers it with length, not with
--    silence. C11.6 forbids LISTING workspaces; naming the single one whose
--    code the caller is already holding is not a listing — and without it the
--    joiner cannot tell they have joined the wrong shop, which is a mistake
--    nobody discovers until they are looking at somebody else's takings.
--
-- 4. AN INACTIVE WORKSPACE IS REFUSED EXACTLY AS AN UNKNOWN CODE IS. Same
--    message, same SQLSTATE. "That shop has been switched off" is a fact about
--    a workspace, told to somebody who is not a member of it.
--
-- 5. A SECOND ASK IS IDEMPOTENT, NOT AN ERROR. `workspace_invite_one_pending_idx`
--    would answer a repeated request with `23505`, and the person repeating it
--    is a joiner on a bad connection who tapped twice, or somebody asking again
--    the next morning because nothing has happened. They get their own pending
--    row back. §2.8: we do the bookkeeping, not the shopkeeper.
--
-- 6. ⚠️⚠️ `approve_request` IS FENCED AT `owner`, NOT `manager`, AND THAT IS
--    ASYMMETRIC WITH `create_invite` ON PURPOSE. Each follows the table it
--    writes: `0028`'s fence is `manager` because it inserts into
--    `workspace_invite`, whose insert policy is `has_role(workspace_id,
--    'manager')` (`0002:567`) and whose prose in §2.7 names "an owner or
--    manager". THIS one writes `workspace_member` and `member_location`, and
--    BOTH of those insert policies are `has_role(workspace_id, 'owner')`
--    (`0001`) — which is also what §2.7's capability table says, giving
--    "members, settings, roles, locations" to the owner alone.
--
-- 7. D8 IS ENFORCED ON THE ROW'S ROLE, NOT ON A CONSTANT. Every request row is
--    `staff` today (decision 2), so "refuse an empty array when the role is
--    staff" and "refuse an empty array" are the same rule — but the ruling is
--    written about the role, and spelling it that way is what keeps it correct
--    if a non-staff request ever exists.
--
-- 8. APPROVAL SETS `decided_by` TO THE APPROVER AND `accepted_by` TO THE
--    REQUESTER, WHICH IS THE WHOLE OF WHY `D4` RENAMED THE COLUMN. This is the
--    only path in the schema where approving and joining are separate acts by
--    separate people, and `0027`'s CHECK is what makes the pair mandatory:
--    `(decided_by is not null) = (accepted_at is not null)` on a request.
--
-- 9. `my_access_requests()` RETURNS THE CALLER'S REQUESTS AND NOT INVITES
--    ADDRESSED TO THEM. An invite is delivered by WhatsApp and redeemed with a
--    token; there is no screen on which a pending invite is a thing the
--    recipient can see before they hold the token. Widening it later is a
--    `create or replace`; a client that has learned to expect invites in the
--    list is what would make it dearer, so it is named here.
--
-- 10. NO SQLSTATE IS MINTED, AGAIN. `4d-i`'s rule. An expired or superseded
--    request raises `TD003`, `0021`'s workflow code, for the same reason
--    `0028` uses it: "ask them to request again" is an instruction, not a bug.
--    `42501` keeps its one meaning, "this is not yours", and covers the code
--    that resolves to nothing.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Who asked  (decision 1)
-- ----------------------------------------------------------------------------

alter table public.workspace_invite
  add column requested_by uuid references auth.users (id);

-- Present exactly on the path that has a requester. An invite has an inviter —
-- `decided_by`, set at creation — and no requester at all, because nobody asked.
alter table public.workspace_invite
  add constraint workspace_invite_requested_by_consistent
    check ((source = 'request') = (requested_by is not null));

comment on column public.workspace_invite.requested_by is
  'The account that asked, on the request path; null on the invite path. It is '
  'what approve_request copies into accepted_by, so "who actually joined" (D4) '
  'is an account and never an email string resolved back to one. ADR-035 §2.7.';

-- `my_access_requests()` reads this on every call and nothing else does.
create index workspace_invite_by_requester_idx
  on public.workspace_invite (requested_by, created_at desc)
  where requested_by is not null;


-- ----------------------------------------------------------------------------
-- 2. request_access — D6's resolver, and D7's absorb
-- ----------------------------------------------------------------------------
-- ⚠️ THE WHOLE CODE, THROUGH A DEFINER RPC, WITH NO SELECT POLICY BEHIND IT.
-- `workspace_select` is `id in (select my_workspaces())` and stays that way: a
-- non-member matches nothing, so the ONLY way a code becomes a workspace is this
-- function. D6 is explicit that such an RPC is an enumeration oracle by
-- construction and that 8 Crockford characters are what make guessing
-- impractical — "that, and not aesthetics, is the reason for the length".

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
  if not found then
    raise exception 'request_access: that code does not match a shop'
      using errcode = '42501';
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
    if v_member.id is not null then
      v_member_id := v_member.id;
      update public.workspace_member
         set role = v_pending.role, is_active = true
       where id = v_member_id;
    else
      insert into public.workspace_member (workspace_id, user_id, role)
      values (v_workspace.id, v_user, v_pending.role)
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
  'none of it. ⚠️ Calls D3′''s helper first, or a lapsed invite would hold the '
  'one-pending slot against the person it was issued to. Idempotent: a second ask '
  'returns the pending row, an existing member is told they are one. An inactive '
  'workspace is refused exactly as an unknown code is. docs/PLAN.md 4.6a-iii.';


-- ----------------------------------------------------------------------------
-- 3. approve_request — D8, and the act D4 renamed a column for
-- ----------------------------------------------------------------------------

create or replace function public.approve_request(
  p_request_id   uuid,
  p_location_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_request   public.workspace_invite%rowtype;
  v_locations uuid[];
  v_member    public.workspace_member%rowtype;
  v_member_id uuid;
  v_written   int := 0;
  v_workspace public.workspace%rowtype;
begin
  if v_user is null then
    raise exception 'approve_request requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_request
    from public.workspace_invite wi
   where wi.id = p_request_id
   for update;

  -- A row the caller may not act on and a row that does not exist are the same
  -- answer, in that order: the id is a uuid nobody guesses, and saying which is
  -- which would make this a membership oracle over other people's workspaces.
  if not found or v_request.source <> 'request' then
    raise exception 'approve_request: no such request'
      using errcode = '42501';
  end if;

  -- Decision 6: `owner`, because this writes workspace_member and
  -- member_location and BOTH of those insert policies are owner-only (0001),
  -- which is also what §2.7's capability table says.
  if not public.has_role(v_request.workspace_id, 'owner') then
    raise exception 'approve_request: only an owner may approve access'
      using errcode = '42501';
  end if;

  -- Idempotent, as 0021's void and 0026's replay are.
  if v_request.accepted_at is not null then
    select wm.id into v_member_id
      from public.workspace_member wm
     where wm.workspace_id = v_request.workspace_id
       and wm.user_id      = v_request.requested_by;

    return jsonb_build_object(
      'status',           'already_approved',
      'workspace_id',     v_request.workspace_id,
      'request_id',       v_request.id,
      'member_id',        v_member_id,
      'role',             v_request.role,
      'already_approved', true
    );
  end if;

  if v_request.superseded_at is not null then
    raise exception 'approve_request: this request was replaced by a newer one'
      using errcode = 'TD003';
  end if;

  if v_request.expires_at <= now() then
    raise exception 'approve_request: this request expired on % — ask them to '
                    'enter the code again', v_request.expires_at
      using errcode = 'TD003';
  end if;

  -- ---- D8 ------------------------------------------------------------------
  v_locations := coalesce(p_location_ids, '{}');

  -- Decision 7: on the ROW's role, not on a constant. §2.7 D8: "an approved
  -- joiner with no locations opens the app and every write is refused with no
  -- message, which looks exactly like the app being broken."
  if v_request.role = 'staff' and cardinality(v_locations) = 0 then
    raise exception 'approve_request: a staff member must be given at least one location'
      using errcode = '22023',
            detail  = 'Staff write only where member_location puts them, and RLS '
                      'refuses the rest silently (ADR-035 §2.7 D8).';
  end if;

  if v_request.role = 'staff' then
    select array_agg(distinct l) into v_locations from unnest(v_locations) as l;

    if exists (
      select 1 from unnest(v_locations) as want(id)
       where not exists (
         select 1 from public.location loc
          where loc.id = want.id
            and loc.workspace_id = v_request.workspace_id
            and loc.is_active
       )
    ) then
      raise exception 'approve_request: a location does not belong to this workspace'
        using errcode = '22023';
    end if;
  else
    -- 0002:377 — a manager or owner is granted every location by role, and a row
    -- here would outlive a demotion.
    v_locations := '{}';
  end if;

  -- ---- the membership ------------------------------------------------------
  select * into v_member
    from public.workspace_member wm
   where wm.workspace_id = v_request.workspace_id
     and wm.user_id      = v_request.requested_by
   for update;

  if found then
    v_member_id := v_member.id;
    update public.workspace_member
       set role = v_request.role, is_active = true
     where id = v_member_id;
  else
    insert into public.workspace_member (workspace_id, user_id, role)
    values (v_request.workspace_id, v_request.requested_by, v_request.role)
    returning id into v_member_id;
  end if;

  delete from public.member_location ml where ml.member_id = v_member_id;

  insert into public.member_location (workspace_id, member_id, location_id)
  select v_request.workspace_id, v_member_id, loc
    from unnest(v_locations) as loc;

  get diagnostics v_written = row_count;

  -- ⚠️ DECISION 8, AND IT IS WHAT `D4` EXISTS FOR. `decided_by` is the owner who
  -- approved; `accepted_by` is the person who joined — read off `requested_by`,
  -- an account, not an email resolved back into one. `0027`'s CHECK requires the
  -- pair to move together on a request row.
  update public.workspace_invite
     set accepted_at  = now(),
         accepted_by  = v_request.requested_by,
         decided_by   = v_user,
         location_ids = v_locations
   where id = v_request.id;

  select * into v_workspace
    from public.workspace w where w.id = v_request.workspace_id;

  return jsonb_build_object(
    'status',           'approved',
    'workspace_id',     v_request.workspace_id,
    'workspace_name',   v_workspace.display_name,
    'request_id',       v_request.id,
    'member_id',        v_member_id,
    'role',             v_request.role,
    'location_count',   v_written,
    'already_approved', false
  );
end;
$$;

comment on function public.approve_request(uuid, uuid[]) is
  'Approves one access request: writes the workspace_member and member_location '
  'rows and stamps the request (ADR-035 §2.7). ⚠️ D8: it takes location_ids and '
  'REFUSES an empty array when the row''s role is staff, because RLS then refuses '
  'every write that member makes, silently, and the app looks broken. ⚠️ Fenced at '
  'OWNER — asymmetric with create_invite''s manager fence on purpose: this writes '
  'workspace_member and member_location, whose insert policies are both owner-only '
  '(0001), and §2.7''s capability table gives members and roles to the owner alone. '
  '⚠️ decided_by is the APPROVER and accepted_by is the REQUESTER, which is the '
  'distinction D4 renamed the column to make, on the only path where approving and '
  'joining are separate acts. Idempotent; TD003 for an expired or superseded '
  'request; 42501 for a request that is not the caller''s to approve. '
  'docs/PLAN.md 4.6a-iii.';


-- ----------------------------------------------------------------------------
-- 4. my_access_requests — the row no policy can ever show them
-- ----------------------------------------------------------------------------
-- ⚠️ THE HOLE THIS CLOSES WAS FOUND BY READING APPLIED SQL, not by drawing the
-- screen (finding S3 in `4.6a`'s sizing). `workspace_invite_select` is
-- `has_role(workspace_id, 'manager')` (`0002:563`) and a non-member's `my_role()`
-- is null — so the person who just asked is INVISIBLE TO THEMSELVES, and
-- `workspace_select` will not show them the workspace either, which is D6 working
-- as designed. Without this function `5b`'s join screen has nothing to draw after
-- the tap, and the cheapest-looking fix a later session reaches for is a select
-- policy — the exact thing D6 rules out.
--
-- ✅ RULED IN BY THE OWNER, 2026-09-13: "keep the status read". It was offered
-- back as the one deliverable an owner might cut.

create or replace function public.my_access_requests()
returns table (
  request_id     uuid,
  workspace_id   uuid,
  workspace_name text,
  status         text,
  role           public.workspace_role,
  requested_at   timestamptz,
  decided_at     timestamptz,
  expires_at     timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  -- Keyed on the ACCOUNT, not on the caller's address (decision 1): an email can
  -- be changed in Supabase auth, and a status read that moves with it is a way to
  -- read somebody else's.
  select wi.id,
         wi.workspace_id,
         w.display_name,
         case
           when wi.accepted_at   is not null then 'approved'
           when wi.superseded_at is not null then 'superseded'
           when wi.expires_at    <= now()    then 'expired'
           else 'pending'
         end,
         wi.role,
         wi.created_at,
         wi.accepted_at,
         wi.expires_at
    from public.workspace_invite wi
    join public.workspace w on w.id = wi.workspace_id
   where wi.requested_by = auth.uid()
   order by wi.created_at desc;
$$;

comment on function public.my_access_requests() is
  'What the joiner asked for and what became of it — the only way they can see a '
  'row of their own (ADR-035 §2.7; docs/PLAN.md 4.6a-iii). security definer '
  'because workspace_invite_select is manager-and-above and a non-member has no '
  'role at all, so no policy can ever show a requester their own request, and the '
  'obvious alternative is the select policy D6 forbids. ⚠️ Keyed on requested_by = '
  'auth.uid(), never on the caller''s email, which is mutable. ⚠️ It returns '
  'REQUESTS, not invites addressed to the caller: an invite is delivered by '
  'WhatsApp and redeemed with a token, and there is no screen on which a pending '
  'invite is something its recipient can see. Ruled in by the owner 2026-09-13.';


-- ----------------------------------------------------------------------------
-- 5. Grants  (ADR-035 §2.7, and 3.1's finding)
-- ----------------------------------------------------------------------------
-- ⚠️ `revoke ... from public` — EXECUTE is granted to PUBLIC by default, which
-- `0027`'s G1 found by reading `pg_proc.proacl` rather than the migration.
--
-- ⚠️ AND ALL THREE ARE GRANTED TO `authenticated` THOUGH TWO OF THEM ARE CALLED
-- BY SOMEBODY WHO IS NOT A MEMBER OF ANYTHING. That is the point of the pull
-- path: `request_access` and `my_access_requests` are reachable by any signed-in
-- user precisely because RLS can say nothing about a person with no membership.
-- Their fences are the code (which they must already hold) and `auth.uid()`
-- (which they cannot choose). `anon` gets nothing: every one of them writes or
-- reads on behalf of an account.

revoke all on function public.request_access(text)            from public;
revoke all on function public.approve_request(uuid, uuid[])   from public;
revoke all on function public.my_access_requests()            from public;

grant execute on function public.request_access(text)          to authenticated;
grant execute on function public.approve_request(uuid, uuid[]) to authenticated;
grant execute on function public.my_access_requests()          to authenticated;
