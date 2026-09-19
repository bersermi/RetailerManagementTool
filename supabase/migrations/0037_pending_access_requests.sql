-- ============================================================================
-- 0037_pending_access_requests.sql — THE NAME THE APPROVER IS OWED
--
-- Build step 5b's task `5b-iii-c`, and the FOURTH migration of step 5b.
--
-- ONE NEW `security definer` READ AND NOTHING ELSE. No table, no column, no
-- view, no policy, no trigger, no index, and nothing existing replaced. It adds
-- `public.pending_access_requests(uuid)` and grants it to `authenticated`.
--
-- ⚠️⚠️ WHY IT EXISTS: THE EMAIL IS SELECTABLE AND THE NAME IS ON NO TABLE THIS
-- CALLER MAY READ.
--
--   The owner ruled on 2026-09-19 — *"Show the Email as a Header and the Name
--   as a subtitle of the request"* — and that ruling has a database half that
--   nothing has built. A manager may select the request row itself
--   (`workspace_invite_select`, `0002:563`), so the EMAIL is already reachable
--   from a phone. The NAME is not, and it is not reachable by any join either:
--   a person who has asked to join has **no `workspace_member` row at all**
--   until `approve_request` writes one (`0029:455`), so there is nothing
--   carrying `display_name` to join to. The only place her name exists is
--   `auth.users.raw_user_meta_data`, which ADR-035 §2.7 never exposes and which
--   exactly one function in this schema reads — `auth_full_name(uuid)`
--   (`0034:122`), granted to NOBODY and callable only from a definer body.
--
--   This is that body. It is `auth_full_name`'s SECOND caller, and the shape is
--   the one `request_access` already uses to hand back a shop's own name
--   through a definer read with no select policy behind it.
--
-- ⚠️⚠️ THE ALTERNATIVE — A NAME COLUMN ON THE REQUEST ROW — IS REFUSED, and the
-- reason is recorded twice in this repository already. `workspace_invite` holds
-- BOTH paths: push invites addressed to an email that may belong to no account
-- at all, and pull requests made by an account. A `requester_name` column would
-- mean one thing for `source = 'request'` and nothing for `source = 'invite'`,
-- and a column whose meaning depends on another column is the shape that goes
-- wrong. ⚠️ A definer read also stays CURRENT: `5b.8-iii` shipped
-- `set_my_display_name` so a person can correct her own name, and a value
-- copied onto a request row at insert time would not move when she did.
--
-- ============================================================================
-- DECISIONS TAKEN IN THIS FILE
-- ============================================================================
--
-- 1. ⚠️⚠️ THE FENCE IS `owner`, AND IT IS THE NARROWEST FORM OF THE TRADE THE
--    OWNER TOOK ON 2026-09-19. His ruling means a person's name reaches
--    somebody who has NOT admitted her to the shop, on the strength of her
--    having typed the code — that was the argument against the ruling and he
--    ruled anyway. What this migration decides is HOW MANY such people there
--    are, and the answer is: exactly the ones who can act.
--    `approve_request` is owner-fenced (`0029` decision 6) because it writes
--    `workspace_member` and `member_location`, whose insert policies are both
--    owner-only. A read fenced at `manager` would show a manager a queue of
--    names she cannot act on — which is a list of strangers' names handed to
--    somebody for no purpose, and §2.7 spends a paragraph on exactly that
--    argument about `cost`.
--    ⚠️ IT IS ALSO THE REVERSIBLE DIRECTION. Widening this to `manager` later
--    is a one-predicate `create or replace` over a function that stores
--    nothing; narrowing it after a manager's screen depends on it takes a
--    feature away from somebody using it. `0035`'s scoping decision is the same
--    argument and is recorded the same way.
--    ⚠️ The EMAIL this returns is not a widening: `workspace_invite_select` is
--    manager-and-above, and an owner is above a manager. Every column here is
--    already reachable by this caller EXCEPT the name.
--
-- 2. ⚠️⚠️ A NON-OWNER READS ZERO ROWS. IT DOES NOT RAISE — AND THE REASON IS AN
--    OPEN DECISION IN `docs/PLAN.md`. The obvious spelling is `plpgsql` with
--    `if not has_role(...) then raise ... using errcode = 'insufficient_
--    privilege'`, which is what `approve_request` does one function over. But
--    `42501` is ALREADY carrying two meanings on this path — "this is not
--    yours" in the database and, through `@/api/errors`, *"tu sesión se
--    cerró"* app-wide — and whether to mint a SQLSTATE for the third overload
--    is a question parked in front of the owner right now. **A read that
--    refuses with `42501` would make it a FOURTH.** A list read has a refusal
--    that costs nothing to say: the empty list. The screen that renders this
--    (`5b-iii-d`) is reached from a badge only an owner sees, so nobody is ever
--    looking at an empty list they should not be looking at.
--    ⚠️ AN EMPTY LIST AND A REFUSED LIST LOOK ALIKE FROM A ROW COUNT, which is
--    exactly the vacuous-green shape `0035` 5.2 records. The suite does not
--    assert zero rows on its own: section 3 reads the SAME workspace holding
--    the SAME two pending requests as an owner (two rows) and as a manager,
--    a cashier, a stranger and the requester herself (zero). One of the two
--    must be the fence, and the pair is what says which.
--
-- 3. ⚠️ IT RETURNS ONLY WHAT IS LIVE AND PENDING — `source = 'request'`,
--    `accepted_at is null`, `superseded_at is null`, `expires_at > now()`.
--    That is the four-part definition of "pending" `my_access_requests`
--    (`0029:525`) computes as a `status` string, applied as a filter instead of
--    reported as a column, because every row this returns is pending by
--    construction and a status column that is always the same word is a column
--    a client will eventually branch on wrongly.
--    ⚠️ AN EXPIRED REQUEST IS ABSENT RATHER THAN SHOWN GREYED OUT: it cannot be
--    approved — `approve_request` raises `TD003` for exactly that row — so a
--    screen showing it offers an action that always fails. Her next step is to
--    type the code again, which `request_access` handles and which produces a
--    new row that DOES appear here.
--    ⚠️ AND `source = 'request'` IS NOT DECORATION. Without it this hands the
--    owner every outstanding PUSH invite too — addresses he typed himself,
--    with `requested_by` null and therefore no name at all — and the badge
--    `5b-iii-d` builds would count invitations to the list of people waiting to
--    be let in.
--
-- 4. ⚠️ THE NAME MAY BE NULL AND THAT IS NOT AN ERROR. `0034` made
--    `display_name` nullable on purpose — a Google account whose provider
--    returned nothing is still admitted — and `auth_full_name` returns NULL,
--    never `''`, for that account. The screen renders the header and nothing
--    beneath it. ⚠️ A shopkeeper is never shown an explanation for this: it is
--    the identity ladder's own floor, and `5b-ii-a` already falls back the same
--    way on the roster.
--
-- 5. ⚠️ IT IS WORKSPACE-SCOPED, taking `p_workspace_id` rather than fanning out
--    over `my_workspaces()`. `0001:317` says many-workspaces-per-user works
--    from day one, and an owner of two shops must not be shown one queue with
--    two shops' strangers in it — approving is per-shop and the location picker
--    `5b-iii-d` builds is per-shop. `0028`'s `create_invite` took the same
--    argument for the same reason, and `0035` recorded the scoped form as the
--    direction that can later fan out.
--
-- 6. ⚠️ NEWEST FIRST (`created_at desc`), the same order `my_access_requests`
--    returns. The person who just typed the code is standing at the counter;
--    the one who asked on Tuesday is not. It is a `select` order and reversing
--    it is one word.
--
-- 7. ⚠️ `requested_by` IS NOT A COLUMN OF THE RESULT. It is an `auth.users` id,
--    the screen has no use for it — `approve_request` takes `request_id` — and
--    handing a client account ids it does not need is how they end up in a log.
--
-- 8. ⚠️ THE NUMBER WAS TAKEN ON THE DAY, NOT RESERVED. `0036` is the highest
--    applied migration on `main`; `0037` is free. `supabase/README.md`, this
--    project's authority on numbering, has twice recorded a number reserved and
--    never written, and `5b-iii`'s own split decision 3 says each child takes
--    whatever is free when it is taken.
--
-- ⚠️⚠️ WHAT THIS MIGRATION DOES NOT DO: IT SHIPS NO SCREEN AND NOTHING CALLS
-- IT. `app/` is untouched in this commit. The badge, the approval list, the
-- location picker and the `approve_request` call are `5b-iii-d`, which is
-- blocked on this and on nothing else. That is the same half loop `0034` and
-- `0035` merged with, and it is safe for the same reason: this half is
-- falsifiable on its own, against a real database, under `set role
-- authenticated`.
--
-- ADR-035 §2.3, §2.7, §9; docs/PLAN.md task 5b-iii-c.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. pending_access_requests — the approver's half of the pull path
-- ----------------------------------------------------------------------------
-- ⚠️ THE FENCE IS A PREDICATE IN THE BODY, not a policy and not a grant. There
-- is no policy that could express it: the rows live on `workspace_invite`,
-- whose select policy is manager-and-above (`0002:563`), and the NAME does not
-- live on a table at all. And there is no grant that could express it either —
-- `0035` records why at length: RLS filters ROWS, not COLUMNS, and a grant is
-- all-or-nothing per function.
--
-- ⚠️ `has_role` is INVOKER (`0001:381`) and resolves `auth.uid()` out of the
-- request GUC, not out of the database role, so it reads the person holding the
-- phone even from inside a definer body — which is exactly how `approve_request`
-- fences itself one function over. A deactivated owner is not an owner:
-- `my_role` (`0001:363`) requires `is_active`.

create function public.pending_access_requests(p_workspace_id uuid)
returns table (
  request_id     uuid,
  email          public.citext,
  requester_name text,
  role           public.workspace_role,
  requested_at   timestamptz,
  expires_at     timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select wi.id,
         wi.email,
         -- The one reader of auth.users in this schema, and this is its second
         -- caller. Returns NULL — never '' — for an account whose provider sent
         -- no name (0034 section 2).
         public.auth_full_name(wi.requested_by),
         wi.role,
         wi.created_at,
         wi.expires_at
    from public.workspace_invite wi
   where wi.workspace_id = p_workspace_id
     -- Decision 1. Evaluated once, and false for everybody who is not an active
     -- owner of THIS workspace — including the requester herself, who reads her
     -- own row through my_access_requests() and nobody else's through anything.
     and public.has_role(p_workspace_id, 'owner')
     -- Decision 3: the four-part definition of pending, as a filter.
     and wi.source         = 'request'
     and wi.accepted_at    is null
     and wi.superseded_at  is null
     and wi.expires_at     > now()
   order by wi.created_at desc;
$$;

comment on function public.pending_access_requests(uuid) is
  'Who is waiting to be let into one shop, and what to call her (ADR-035 §2.7; '
  'docs/PLAN.md 5b-iii-c). The approver''s half of the pull path, and the mirror '
  'of my_access_requests() — that one is the joiner reading her own row, this one '
  'is the owner reading everybody''s. ⚠️ security definer because the NAME is in '
  'auth.users.raw_user_meta_data, which §2.7 never exposes: it is read through '
  'auth_full_name(uuid), which is granted to nobody, and this is its second '
  'caller. A name copied onto the request row instead would mean nothing for '
  'source = ''invite'' and would not follow a person who later corrects it. '
  '⚠️ FENCED AT OWNER, in the body, matching approve_request: a manager cannot '
  'approve, so a queue she cannot act on is a list of strangers'' names for no '
  'purpose. ⚠️ A non-owner reads ZERO ROWS rather than being refused — 42501 '
  'already carries two meanings on this path and a read has a refusal that costs '
  'nothing to say. ⚠️ Returns only LIVE PENDING requests: an expired one cannot '
  'be approved (approve_request raises TD003), so showing it would offer an '
  'action that always fails. ⚠️ requester_name is NULL for an account whose '
  'provider returned no name, which 0034 admits on purpose.';


-- ----------------------------------------------------------------------------
-- 2. Grants  (ADR-035 §2.7, and 0027's G1 finding)
-- ----------------------------------------------------------------------------
-- ⚠️ `revoke ... from public`, NOT `from anon, authenticated`. EXECUTE is
-- granted to PUBLIC by default; revoking the two roles by name leaves PUBLIC's
-- entry standing and `anon` keeps the function through it. `0027` found that by
-- reading `pg_proc.proacl` rather than the migration, and check 1.4 of this
-- migration's suite reads it the same way.
--
-- ⚠️ `anon` GETS NOTHING. Unlike `request_access` and `my_access_requests` —
-- which are granted to `authenticated` precisely because the caller is somebody
-- RLS can say nothing about — this one's caller is always a member, and an
-- owner at that. There is no signed-out reader of it.

revoke all on function public.pending_access_requests(uuid) from public;

grant execute on function public.pending_access_requests(uuid) to authenticated;
