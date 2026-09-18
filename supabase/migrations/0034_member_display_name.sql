-- ============================================================================
-- 0034 — a membership carries a person's NAME, on every way into a shop
-- ============================================================================
-- ADR-035 §2.3 (the data model), §2.7 (membership and the two ways in), §9.
-- docs/PLAN.md task 5b.8-i.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT
-- ----------------------------------------------------------------------------
-- `5b.7` put a person's name into `auth.users.raw_user_meta_data.full_name` —
-- Google writes it there, and the email door now writes it there too, under the
-- key Google already uses so there is ONE reader rather than a branch on which
-- button somebody tapped months earlier. This is that reader.
--
-- ⚠️ `auth.users` IS NOT READABLE BY A CLIENT and will not become readable. The
-- name is COPIED, once, onto `workspace_member` — the table another person's
-- phone can already select — at the moment a membership is written. Nothing
-- here grants anybody a new read.
--
-- ⚠️⚠️ NOTHING DISPLAYS IT YET, and that is the shape of the split rather than
-- an omission: `5b.8-ii` puts it on the roster and `5b.8-iii` lets a person fix
-- their own. This migration is the half that has to be true before any screen
-- can be honest, and it is falsifiable with no client in the room — which is
-- what `supabase/tests/0034_member_display_name.sql` is.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ FOUR WRITERS, NOT THE TWO THE PLAN'S ROW NAMED WHEN IT WAS SIZED
-- ----------------------------------------------------------------------------
-- Reading the applied schema rather than the row found four functions that
-- insert `public.workspace_member`:
--
--   `onboard_workspace`  (0027:422) — the owner, making the shop
--   `redeem_invite`      (0028:525) — the PUSH path, somebody spending a token
--   `request_access`     (0029:256) — ⚠️ the `D7` FAST PATH: somebody already
--                                     invited who types the shop CODE instead
--                                     of the token is simply let in
--   `approve_request`    (0029:455) — the PULL path, and `5b-iii`'s own RPC
--
-- ⚠️ THE LAST TWO ARE WHY THIS COULD NOT SHIP AS TWO OF THEM. `5b-iii` builds
-- the approval screen on `approve_request`; a column without that writer means
-- everybody who joins by the pull path arrives nameless, and the repair is a
-- second migration PLUS a second backfill over the rows made in between. The
-- `D7` fast path is worse, because it is silent: two people in one shop, one of
-- them with a name and one without, and nothing in the roster to explain it.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE WRITE RULE, WHICH IS AN OWNER'S RULING AND NOT A CHOICE MADE HERE
-- ----------------------------------------------------------------------------
-- ✅✅ RULED 2026-09-18: "keep what they typed."
--
--   THE NAME IS WRITTEN ON `insert`. ON `update` IT IS WRITTEN ONLY WHERE THE
--   STORED VALUE IS NULL.
--
-- Three of the four writers take an `update` branch when the member row already
-- exists (a re-invite, a reactivation, an absorb). Refreshing the name there
-- would silently replace a correction a person made ABOUT HERSELF — through the
-- screen `5b.8-iii` ships — with whatever her identity provider last sent, on
-- an event she did not trigger and is not told about.
--
-- ⚠️ `coalesce` is the whole of it in SQL. The argument is the expensive part,
-- and it is a rule inside four APPLIED functions from the moment this merges:
-- reversing it later is a fix-forward migration, and reversing it after anybody
-- has corrected a name cannot restore what was overwritten.
--
-- ----------------------------------------------------------------------------
-- ⚠️ THE COLUMN IS NULLABLE, AND THE FLOOR STAYS WHERE `5b-ii-a` PUT IT
-- ----------------------------------------------------------------------------
-- An account with empty metadata — a Google account that returned nothing, or
-- any user made before `5b.7` — still arrives with no name, and must still be
-- ADMITTED. So `display_name` is nullable and the client's identity ladder
-- keeps its `Dueño`/role fallback. What the column must never hold is the
-- BLANK: an empty string reads as a name that is present and renders as a gap
-- on the roster, where a null falls through to the fallback that already works.
-- The CHECK below is that, and nothing more.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The column
-- ----------------------------------------------------------------------------

alter table public.workspace_member
  add column display_name text;

-- ⚠️ NOT-BLANK, not not-null. See the header: null is a legitimate state that
-- the client already handles, and '' is the state that silently breaks it.
alter table public.workspace_member
  add constraint workspace_member_display_name_not_blank
    check (display_name is null or btrim(display_name) <> '');

comment on column public.workspace_member.display_name is
  'The PERSON''s name, copied from auth.users.raw_user_meta_data->>''full_name'' '
  'at the moment the membership is written, so a roster can be drawn without '
  'exposing auth.users (ADR-035 §2.7). ⚠️ NOT the shop''s name — that is '
  'workspace.display_name, and the two are three lines apart inside '
  'onboard_workspace. ⚠️ Nullable: an account with empty metadata is still '
  'admitted and the client falls back to the role. ⚠️ Written on insert, and on '
  'update only where it is null — the owner''s ruling of 2026-09-18, "keep what '
  'they typed", so a re-invite never overwrites a correction a person made about '
  'herself. docs/PLAN.md 5b.8-i.';


-- ----------------------------------------------------------------------------
-- 2. One reader of auth.users, not four copies of the same expression
-- ----------------------------------------------------------------------------
-- ⚠️ THE ALTERNATIVE WAS FOUR COPIES of `nullif(btrim(raw_user_meta_data ->>
-- 'full_name'), '')`, one per writer. Four copies of one rule is this
-- repository's most-recorded defect wearing SQL: the day the key changes, or
-- the day the normalisation does, three of them get edited.
--
-- ⚠️ THE KEY IS SPELLED `full_name` BECAUSE GOOGLE SPELLS IT THAT WAY — it is
-- not a name this project chose. `app/src/auth/credentials.ts` exports the same
-- string as `FULL_NAME_KEY` and the email door writes it; this is the only
-- other place in the system that spells it, and `0034`'s suite asserts it
-- against a real metadata row rather than against a comment.
--
-- ⚠️ IT IS GRANTED TO NOBODY. `security definer` over `auth.users` is precisely
-- the thing §2.7 says is never exposed, so the EXECUTE that Postgres grants to
-- PUBLIC by default is revoked — `revoke ... from public`, not `from anon,
-- authenticated`, which is `0027`'s G1 finding and leaves the default standing.

create function public.auth_full_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')
    from auth.users u
   where u.id = p_user_id;
$$;

revoke all on function public.auth_full_name(uuid) from public;

comment on function public.auth_full_name(uuid) is
  'The one reader of auth.users.raw_user_meta_data->>''full_name'' in this '
  'schema. Returns NULL — never '''' — for an account with no name, which is the '
  'state workspace_member.display_name is allowed to hold. ⚠️ security definer '
  'over auth.users and granted to NOBODY: it is called only from the four '
  'membership writers'' own definer bodies (ADR-035 §2.7). docs/PLAN.md 5b.8-i.';


-- ----------------------------------------------------------------------------
-- 3. The backfill  (⚠️ one-shot, and it runs over ZERO rows in CI)
-- ----------------------------------------------------------------------------
-- `supabase db reset` applies migrations BEFORE the seed, so on a green run
-- this statement finds nothing and proves nothing. That is `0027`'s situation
-- exactly, and the answer is the same one: section 5 of this migration's suite
-- re-performs the guarantee against the same table and the same function, and
-- says in its own header that it is doing so.
--
-- ⚠️ SET-BASED IS SAFE HERE, unlike `0027`'s row-by-row loop: that generator
-- read the table it was writing to and had to see its own collisions. This
-- reads `auth.users` and writes `workspace_member`.
--
-- ⚠️ `where display_name is null` is not decoration — it is the write rule
-- above, applied to the one-shot. It also makes the statement re-runnable
-- without overwriting anything, which matters because nothing stops a hosted
-- database from having this migration applied by hand.

update public.workspace_member wm
   set display_name = public.auth_full_name(wm.user_id)
 where wm.display_name is null;


-- ----------------------------------------------------------------------------
-- 4. The four writers  (`create or replace`, bodies otherwise untouched)
-- ----------------------------------------------------------------------------
-- ⚠️ `create or replace` PRESERVES the ACL and the `security definer` flag, and
-- that is worth asserting rather than assuming: a replacement that quietly
-- reset the ACL would restore Postgres's EXECUTE-to-PUBLIC default and hand
-- `anon` four definer functions that write memberships, while every behavioural
-- check still passed. `0030` learned that by reading `pg_proc.proacl`, and
-- section 1 of this migration's suite reads it the same way — including the
-- OVERLOAD case, where a changed signature leaves the old function standing
-- beside the new one and the clients keep calling the old one.

-- ---------------------------------------------------------------------------
-- 4.1 onboard_workspace — the owner, making the shop  (0027:392)
-- ---------------------------------------------------------------------------
-- The only one of the four with no `update` branch: this row cannot already
-- exist, because the workspace is one statement old. ⚠️ `R4` lives here — see
-- the local variable and the note beside it.

create or replace function public.onboard_workspace(
  p_display_name       text,
  p_prices_include_tax boolean default true,
  p_location_name      text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id      uuid := auth.uid();
  v_workspace_id uuid;
  -- R4: `display_name` means the SHOP three lines below and the PERSON here, in
  -- one function body. The local is named for the person so the two never read
  -- as one thing; the COLUMN keeps its name, which is right on each table.
  v_person_name  text;
begin
  if v_user_id is null then
    raise exception 'onboard_workspace requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  if btrim(coalesce(p_display_name, '')) = '' then
    raise exception 'workspace display name is required'
      using errcode = 'check_violation';
  end if;

  -- New in 0027.
  insert into public.workspace (display_name, prices_include_tax, code)
  values (btrim(p_display_name), p_prices_include_tax,
          public.generate_workspace_code())
  returning id into v_workspace_id;

  v_person_name := public.auth_full_name(v_user_id);

  insert into public.workspace_member (workspace_id, user_id, role, display_name)
  values (v_workspace_id, v_user_id, 'owner', v_person_name);

  insert into public.workspace_setting (workspace_id)
  values (v_workspace_id);

  insert into public.location (workspace_id, name)
  values (v_workspace_id, btrim(coalesce(p_location_name, p_display_name)));

  -- New in 0002.
  insert into public.provider (workspace_id, name, is_generic)
  values (v_workspace_id, 'Compra directa', true);

  return v_workspace_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.2 redeem_invite — the PUSH path  (0028:423)
-- ---------------------------------------------------------------------------
-- ⚠️ The `update` branch is a RETURNING member being reactivated at a new
-- role. It is the clearest case for the owner's ruling: this person has been
-- here before, and may well have corrected her name while she was.

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

-- ---------------------------------------------------------------------------
-- 4.3 request_access — the PULL path, and `D7`'s fast lane  (0029:158)
-- ---------------------------------------------------------------------------
-- ⚠️⚠️ ONE OF THE TWO WRITERS THE SIZING NEVER COUNTED. The name is written
-- only inside the `D7` branch, which is the only branch of this function that
-- writes a membership at all — the other exits either return a status or write
-- a `workspace_invite` row for somebody to approve later.

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

-- ---------------------------------------------------------------------------
-- 4.4 approve_request — the PULL path's other half  (0029:336)
-- ---------------------------------------------------------------------------
-- ⚠️⚠️ THE ONE WHERE THE CALLER AND THE MEMBER ARE DIFFERENT PEOPLE, and the
-- reason the plan row's phrasing — "from the caller's own raw_user_meta_data" —
-- is true of three writers and would be a BUG in the fourth. See the note in
-- the body: the name is read off `requested_by`.

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
  v_person_name text;
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

  -- 0034. ⚠️⚠️ THE NAME IS READ OFF `requested_by`, NOT OFF `auth.uid()`, AND
  -- THIS IS THE ONE PLACE IN THE SCHEMA WHERE THOSE ARE DIFFERENT PEOPLE. The
  -- caller here is the OWNER approving; the membership belongs to the JOINER.
  -- `D4` renamed a column for exactly this asymmetry (`decided_by` vs
  -- `accepted_by`), and the same asymmetry decides whose name this is.
  v_person_name := public.auth_full_name(v_request.requested_by);

  if found then
    v_member_id := v_member.id;
    update public.workspace_member
       set role         = v_request.role,
           is_active    = true,
           -- "keep what they typed" — see redeem_invite, 0034.
           display_name = coalesce(display_name, v_person_name)
     where id = v_member_id;
  else
    insert into public.workspace_member (workspace_id, user_id, role, display_name)
    values (v_request.workspace_id, v_request.requested_by, v_request.role,
            v_person_name)
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


-- ----------------------------------------------------------------------------
-- 5. What this migration deliberately does NOT touch
-- ----------------------------------------------------------------------------
-- ⚠️ THE FOUR `comment on function` BLOCKS ARE LEFT AS THEY ARE, and that is a
-- reading rather than an oversight: none of them becomes FALSE. They say these
-- functions write `workspace_member`, which is still exactly what they do, and
-- a fifth copy of the write rule is a fifth copy to keep true. The rule lives
-- on `workspace_member.display_name`'s own column comment — the object it is
-- about — and in this header.
--
-- ⚠️ NO POLICY MOVES. `workspace_member_select` (0001:524) is already
-- `workspace_id in (select public.my_workspaces())`, so every member of a shop
-- could read every other member's row before this migration and can read one
-- more column after it. A name is roster information, which is the same
-- judgement `member_location` records in its own policy comment.
--
-- ⚠️ NO GRANT MOVES. `authenticated` already holds select/insert/update/delete
-- on `workspace_member` (0001:589), fenced by the four policies; the new column
-- inherits that and nothing else.
--
-- ⚠️ AND NOTHING READS THE COLUMN. `MEMBER_COLUMNS` in `app/src/api/members.ts`
-- is `5b.8-ii`'s, and `set_my_display_name` is `5b.8-iii`'s — which takes
-- whatever number is free on the day it is written, not a slot reserved here.
-- This repository has twice recorded a reserved number that was never used.
