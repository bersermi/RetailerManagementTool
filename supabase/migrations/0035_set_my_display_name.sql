-- ============================================================================
-- 0035 — a person fixes their OWN name, and nothing else about themselves
-- ============================================================================
-- ADR-035 §2.3 (the data model), §2.7 (membership, roles and the tenancy wall),
-- §9. docs/PLAN.md task 5b.8-iii-a.
--
-- ----------------------------------------------------------------------------
-- WHAT THIS IS, AND WHAT A PERSON CAN SEE OF IT TODAY: NOTHING
-- ----------------------------------------------------------------------------
-- `0034` (task `5b.8-i`) put a person's name on their membership, copied from
-- `auth.users.raw_user_meta_data ->> 'full_name'` at the moment the membership
-- is written. `5b.8-ii` put it on the roster. From the moment that screen
-- merged there has been a live gap with no repair path: a Google account that
-- arrived as ONE WORD now shows that one word to everybody in the shop, and
-- **nobody can change it** — `workspace_member_update` (`0001:532`) is
-- `has_role(workspace_id, 'owner')`, so a manager or a cashier cannot edit the
-- row that describes her, and the owner cannot either without an editor nobody
-- has built.
--
-- This migration is the repair path in the database. ⚠️ **IT SHIPS NO SCREEN.**
-- The control belongs to `5b.8-iii-b`, and the split is drawn exactly where
-- `5b.8`'s own was — the half that is falsifiable with no client in the room,
-- then the half that needs one.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE OBVIOUS FIX IS A POLICY, AND THE POLICY IS THE TRAP
-- ----------------------------------------------------------------------------
-- "Let a person update her own `workspace_member` row" is four lines of RLS and
-- it reads as a courtesy. It is the tenancy wall coming down, because
--
--     RLS FILTERS ROWS, NOT COLUMNS.
--
-- A policy that admits her own row admits every column of it, and the column
-- beside the one she wanted is `role`. Every cashier would be one `update`
-- away from `owner` — through PostgREST, with no screen involved. ADR-035 §2.7
-- already spends a paragraph on this exact sentence about `cost` on
-- `purchase_line`, and the answer there is the answer here: when the fence has
-- to be per-COLUMN, the instrument is a `security definer` function with the
-- column list written into its body, not a policy.
--
-- ⚠️ A column GRANT is the other near-miss and is worse than it looks: it would
-- have to be granted on `workspace_member` to `authenticated` generally, which
-- is every member's row in every shop she belongs to, and the fence would still
-- have to be a policy. One function, one column, one row.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ IT IS WORKSPACE-SCOPED, AND THAT IS A DECISION TAKEN ON THE OWNER'S
-- BEHALF — SEE docs/PLAN.md 5b.8-iii-a
-- ----------------------------------------------------------------------------
-- `my_workspaces()` returns `setof uuid` and its own comment (`0001:317`) says
-- many-workspaces-per-user "works from day one even though every real user has
-- exactly one". So this function either takes a workspace id and fixes ONE
-- membership row, or takes none and rewrites every row the caller owns — a
-- write that crosses the tenant boundary this schema spends all of its effort
-- not crossing.
--
-- The scoped form was chosen because it is the REVERSIBLE direction: a scoped
-- call can later fan out over `my_workspaces()`, and an unscoped write that has
-- already run cannot be un-run.
--
-- ⚠️ WHAT IT BUYS A BILL FOR LATER: the day somebody genuinely runs two shops,
-- fixing her name in one leaves it wrong in the other, and she is not told.
-- That is a real cost and it is flagged rather than hidden. It costs nothing
-- today, because every real user has exactly one shop.
--
-- ----------------------------------------------------------------------------
-- ⚠️⚠️ THE WRITE RULE OF 2026-09-18 STANDS, AND THIS IS ITS ONE EXCEPTION
-- ----------------------------------------------------------------------------
-- ✅✅ The owner ruled "keep what they typed": the four membership writers set
-- the name on `insert`, and on `update` only where the stored value is null
-- (`coalesce(display_name, ...)`), so a re-invite never overwrites a correction
-- somebody made about herself.
--
-- THIS FUNCTION IS THE WRITER THE RULE EXISTS TO PROTECT. It overwrites a
-- non-null name unconditionally, because the person doing it IS the person the
-- name is about, and she triggered it. That is not a loosening of the ruling —
-- it is the thing the ruling was defending. Section 3's census is what keeps
-- the two apart: three writers that may only fill a hole, one that may replace.
--
-- ⚠️ `0034`'s column comment said the name is written "on update only where it
-- is null", full stop. That sentence was true of every writer in the schema on
-- the day it was written and is no longer, so it is RESTATED below rather than
-- left standing — a claim on the object itself, one migration away from the
-- thing that falsified it, is precisely this repository's most-recorded defect.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The function
-- ----------------------------------------------------------------------------
-- ⚠️ ONE COLUMN, ONE ROW, AND THE ROW IS THE CALLER'S OWN. `user_id =
-- auth.uid()` is in the `where` clause and there is no parameter that could
-- name somebody else — not "the caller may only pass her own id", which is a
-- rule a client could get wrong, but no id to pass at all. `5b.8-iii-b` builds
-- a person fixing HER OWN name; administering somebody else's is a different
-- screen that does not exist and would be a different function.
--
-- ⚠️ NORMALISATION IS ONE `nullif(btrim(...), '')`, THE SAME EXPRESSION
-- `auth_full_name` USES (`0034:128`). Two normalisation rules for one column is
-- how the blank gets in by the door the CHECK is not watching: the CHECK
-- refuses `''` and would accept `' '`, because `btrim` is the migration's job
-- and not the constraint's. This trims first and refuses after, so the stored
-- value is what the CHECK, the reader and the roster all agree a name is.
--
-- ⚠️ IT RETURNS THE STORED NAME, NOT `void`. The client has to render what was
-- actually written — trimmed — and the alternative is for it to render its own
-- input and diverge from the database by a space nobody can see. One round
-- trip, one answer. It also makes the suite below assert on the RETURN as well
-- as on the row, which is two readings of one write.
--
-- ⚠️ `updated_at` MOVES, and that is the trigger `0001:213` doing its job.
-- "One column" is a statement about what this function SETS. `role`,
-- `is_active`, `workspace_id` and `user_id` are untouched, and section 2 of the
-- suite proves the first of those from the row rather than from this comment.

create function public.set_my_display_name(
  p_workspace_id uuid,
  p_display_name text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name    text;
  v_stored  text;
begin
  if v_user_id is null then
    raise exception 'set_my_display_name requires an authenticated caller'
      using errcode = 'insufficient_privilege';
  end if;

  v_name := nullif(btrim(coalesce(p_display_name, '')), '');

  if v_name is null then
    raise exception 'a name is required'
      using errcode = 'check_violation';
  end if;

  -- ⚠️ `is_active` IS PART OF THE FENCE, not decoration. A membership that has
  -- been deactivated is not in `my_workspaces()`, the person cannot read the
  -- shop, and she must not be able to write a name into it either. A null
  -- `p_workspace_id` falls out here too, by matching nothing.
  update public.workspace_member wm
     set display_name = v_name
   where wm.workspace_id = p_workspace_id
     and wm.user_id      = v_user_id
     and wm.is_active
  returning wm.display_name into v_stored;

  if not found then
    raise exception 'you are not an active member of this shop'
      using errcode = 'insufficient_privilege';
  end if;

  return v_stored;
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. The grant
-- ----------------------------------------------------------------------------
-- ⚠️ `revoke ... from public`, NOT `from anon, authenticated`. EXECUTE on a new
-- function is granted to PUBLIC by default, so revoking the two Supabase roles
-- by name leaves the default standing and every role still holds it — `0027`'s
-- G1 finding, and the spelling `0028`, `0029` and `0034` all use.
--
-- ⚠️ THE GRANT CANNOT EXPRESS THE FENCE, which is the same sentence `0026` and
-- `0029` write about their own. "The caller's own active membership in the
-- workspace she named" is a row predicate; a grant is a function-level yes/no.
-- It is granted to `authenticated` and fenced in the body, and the body is what
-- section 4 of the suite reads under `set role authenticated`.

revoke all on function public.set_my_display_name(uuid, text) from public;
grant execute on function public.set_my_display_name(uuid, text) to authenticated;

comment on function public.set_my_display_name(uuid, text) is
  'A person fixes their OWN name in ONE shop. Writes workspace_member.'
  'display_name for the caller''s own active membership in p_workspace_id and '
  'nothing else — no id names anybody else, and `role` is not in the set list. '
  '⚠️ The alternative was a "you may update your own row" POLICY, which is '
  'refused: RLS filters ROWS, not COLUMNS, so it would also hand every cashier '
  'her own `role` (ADR-035 §2.7, the same argument that fences `cost`). '
  '⚠️ WORKSPACE-SCOPED on purpose — my_workspaces() is set-returning, so an '
  'unscoped write would cross a tenant boundary to save one argument; a scoped '
  'call can later fan out and an unscoped write cannot be un-run. ⚠️ It is the '
  'ONE writer that may overwrite a non-null name: the owner''s rule of '
  '2026-09-18, "keep what they typed", exists to protect the correction made '
  'HERE from the four membership writers, and the person doing it is the person '
  'the name is about. Returns the STORED (trimmed) name. docs/PLAN.md '
  '5b.8-iii-a.';


-- ----------------------------------------------------------------------------
-- 3. The column comment, restated — `0034`'s is no longer the whole rule
-- ----------------------------------------------------------------------------
-- ⚠️ THIS IS THE ONLY EXISTING OBJECT THIS MIGRATION TOUCHES, and it is touched
-- because a sentence on it went from true to incomplete the moment section 1
-- was applied. `0034` wrote "Written on insert, and on update only where it is
-- null" as an unqualified rule about the column. There is now a fifth writer
-- for which that is false by design. A comment is not a constraint, but it is
-- the thing the next session reads before deciding what the rule was — and
-- this repository has recorded SIX separate stale-duplicate defects, of which
-- five were found by a person reading rather than by a check.
--
-- The rest of the comment is reproduced verbatim from `0034`: it is still true,
-- and rewriting it would make the diff say more moved than did.

comment on column public.workspace_member.display_name is
  'The PERSON''s name, copied from auth.users.raw_user_meta_data->>''full_name'' '
  'at the moment the membership is written, so a roster can be drawn without '
  'exposing auth.users (ADR-035 §2.7). ⚠️ NOT the shop''s name — that is '
  'workspace.display_name, and the two are three lines apart inside '
  'onboard_workspace. ⚠️ Nullable: an account with empty metadata is still '
  'admitted and the client falls back to the role. ⚠️ Written by the four '
  'membership writers on insert, and on update only where it is null — the '
  'owner''s ruling of 2026-09-18, "keep what they typed", so a re-invite never '
  'overwrites a correction a person made about herself. ⚠️⚠️ AMENDED BY 0035 '
  '(5b.8-iii-a): set_my_display_name(uuid, text) is the FIFTH writer and the '
  'ONE that may overwrite a non-null name, because the caller is the person the '
  'name is about and she asked for it. That is the ruling being honoured, not '
  'bent. docs/PLAN.md 5b.8-i, 5b.8-iii-a.';


-- ----------------------------------------------------------------------------
-- 4. What this migration deliberately does NOT touch
-- ----------------------------------------------------------------------------
-- ⚠️ NO POLICY MOVES, AND THAT IS THE WHOLE POINT. `workspace_member_update`
-- (`0001:532`) stays `has_role(workspace_id, 'owner')`. A `security definer`
-- function does not consult policies at all, so widening that one to make this
-- work would have been both unnecessary and the defect described in the header.
-- Section 5 of the suite pins the policy from `pg_policies` rather than from
-- this sentence.
--
-- ⚠️ NO COLUMN IS ADDED AND NO CONSTRAINT MOVES. `workspace_member_display_name
-- _not_blank` (`0034`) is the floor under section 1's `nullif(btrim(...))`, and
-- it is deliberately still reachable: if a later edit drops the trim, the CHECK
-- refuses `''` and the constraint's error is what surfaces. Two fences, the
-- inner one better-worded.
--
-- ⚠️ THE FOUR MEMBERSHIP WRITERS ARE NOT REPLACED. Their `coalesce(display_name,
-- ...)` is the owner's ruling and stays exactly as `0034` applied it. Nothing
-- here is `create or replace`, so `0034`'s ACLs and definer flags are untouched
-- and there is no overload to worry about.
--
-- ⚠️ NOTHING CALLS THIS YET. `5b.8-iii-b` builds the control on
-- `app/src/app/ajustes.tsx` and the `src/api/` call under `5b.5`'s conventions.
-- Until it merges, the repair path exists and no person can reach it — which is
-- the same half-loop `0034` shipped with, for the same reason.
