-- ============================================================================
-- 0055 — the pilot's start: two table doors closed, and an invitation that asks
-- for proof of the address
-- ============================================================================
-- docs/PLAN.md task `5P-e`. The owner's rulings of 2026-10-15, each asked with a
-- recommendation and taken as recommended. ADR-035 §2.7 (access, D7).
--
-- ----------------------------------------------------------------------------
-- 1. THE TWO DOORS, found by the review of 2026-10-13 and closed here
-- ----------------------------------------------------------------------------
--   (a) A MANAGER COULD MAKE AN OWNER. `create_invite` refuses a manager who asks
--       for an owner invite, but `0002` also granted INSERT on `workspace_invite`
--       to `authenticated` with a manager-level policy, so the same row could be
--       written straight into the table; a second login typing the shop's code
--       was then let in by `request_access` as OWNER.
--   (b) AN OWNER COULD ERASE A MEMBERSHIP, which skips the tombstone the owner
--       ruled on 2026-10-09 (the shop keeps the name) and takes that person's
--       pilot readings with it. `0053` parked it for the owner.
-- No screen uses either: the app only READS `workspace_invite`, and every write
-- to either table goes through a `security definer` function, which runs as the
-- function's owner and is unaffected by these revokes. ⚠️ So the policies go with
-- the grants: a policy with no grant behind it is a rule nothing can reach.
--
-- ----------------------------------------------------------------------------
-- 2. D7, NARROWED
-- ----------------------------------------------------------------------------
-- ADR-035 §2.7 D7: someone already invited who types the shop's code *"is simply
-- let in"*, matched on the login's email. On the live project an email sign-up
-- needs no confirmation (the owner, 2026-10-09), so anybody who knew a shop's code
-- and an invited person's address could make that login first and take the
-- invitation. Now the invitation is honoured on the address only when GOOGLE OR
-- APPLE verified it: the login has a Google or Apple identity carrying that
-- address. Anybody else is not refused — the invitation is superseded and they
-- file an ordinary request, which the owner approves by name. ⚠️ Redeeming the
-- invitation's own token (`redeem_invite`) is unchanged: holding the token the
-- owner sent is the proof there.
--
-- ⚠️ ONE CONSEQUENCE, NAMED: the same reading of the plan's question found that
-- Supabase joins a Google or Apple sign-in to an existing login with the same
-- address when that login counts as confirmed (every email sign-up does, with
-- confirmation off). That is GoTrue's and not this file's; it is not measured,
-- and `5R-j` (email confirmation, parked) is what closes it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The doors
-- ----------------------------------------------------------------------------

drop policy workspace_invite_insert on public.workspace_invite;
drop policy workspace_invite_delete on public.workspace_invite;
revoke insert, delete on public.workspace_invite from authenticated;

drop policy workspace_member_delete on public.workspace_member;
revoke delete on public.workspace_member from authenticated;

-- ----------------------------------------------------------------------------
-- 2. Whose address did a provider vouch for
-- ----------------------------------------------------------------------------

create function public.login_address_verified(p_user uuid, p_email public.citext)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
      from auth.identities i
     where i.user_id = p_user
       and i.provider in ('google', 'apple')
       and lower(coalesce(i.identity_data ->> 'email', '')) = lower(p_email::text)
  );
$$;

-- ⚠️ Granted to nobody: it reads `auth.identities`, and its only caller is
-- `request_access`, which is `security definer`.
revoke all on function public.login_address_verified(uuid, public.citext) from public, anon, authenticated;

comment on function public.login_address_verified(uuid, public.citext) is
  'True when the login has a Google or Apple identity carrying this address, '
  'i.e. a provider verified it. request_access honours a pending invitation on '
  'the address alone only then (0055, the owner''s ruling of 2026-10-15).';

-- ----------------------------------------------------------------------------
-- 3. request_access — `0038`'s body, with the one new branch marked `0055`
-- ----------------------------------------------------------------------------

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

  if v_has and v_pending.source = 'invite' and v_pending.expires_at > now()
     and not public.login_address_verified(v_user, v_email) then
    -- 0055 (the owner, 2026-10-15): nothing has confirmed this address belongs to
    -- the person holding the login, so the invitation is not taken on the
    -- address alone. It is superseded and an ordinary request is filed in its
    -- place: the owner approves it by name, as any other.
    update public.workspace_invite
       set superseded_at = now()
     where id = v_pending.id;

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
  end if;

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

comment on function public.request_access(text) is
  'The PULL path (ADR-035 §2.7, C11.5): the joiner enters the workspace code and '
  'asks. Resolves the code through this definer body with no select policy behind '
  'it (D6). Takes no email argument and no role: the address is read from '
  'auth.users for auth.uid(). ⚠️ D7, NARROWED BY 0055 (the owner, 2026-10-15): a '
  'live pending invite for that address is ACCEPTED only when Google or Apple '
  'verified the address (login_address_verified); otherwise it is superseded and '
  'an ordinary request is filed, which the owner approves by name. A code that '
  'resolves to no shop raises TD006 (0038); 42501 means "sign in again". '
  'Idempotent: a second ask returns the pending request, a member is told they '
  'are one. docs/PLAN.md 4.6a-iii, 5b.9, 5P-e.';
