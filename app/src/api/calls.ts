// ============================================================================
// THE ONLY MODULE IN THIS APP THAT CALLS `supabase.rpc` OR `supabase.from`.
// Plan tasks 5b-i and 5b-ii-a. ADR-035 §2.11: "`src/api/` — one wrapper per RPC. Juniors
// never call `supabase.rpc` directly."
//
// ⚠️ IT IS DELIBERATELY UNTESTABLE, AND EVERYTHING IN IT WITH A RIGHT ANSWER IS
// SOMEWHERE ELSE. It imports `@/lib/supabase`, which runs three side effects at
// module scope — a URL polyfill, SQLite installing itself as
// `globalThis.localStorage`, an `AppState` listener — so no node suite can load
// this file, and `app/vitest.config.ts` collects `test/**` only so nothing
// tries. The argument names, the column list and the membership decision are in
// `@/api/workspace`; the message a failure becomes is in `@/api/errors`. What
// is left here is the three lines that talk, which is the same split
// `env.ts` / `supabase.ts` already made one layer down.
//
// ⚠️ SO WHAT NO CHECK IN THIS REPOSITORY CAN SEE, NAMED HERE RATHER THAN LEFT
// TO BE DISCOVERED: that these three lines call the RPC the contract describes.
// A typecheck cannot — TypeScript has never read `0027`. The suite cannot — it
// cannot load this file. `docs/checks/5b-i-api-contract.sh` is the instrument,
// and it is an HTTP round trip against a reset database rather than a reading
// of this file.
//
// ⚠️ THE WRAPPERS THROW RATHER THAN RETURNING A RESULT SHAPE. supabase-js
// returns `{ data, error }` and never rejects; TanStack Query decides
// `isError`, retries and invalidation from a REJECTED PROMISE. A wrapper that
// resolved with an error object would be a wrapper every caller has to remember
// to unpack, and the one that forgets gets a cached success holding a failure.
// ============================================================================

import { supabase } from '@/lib/supabase';
import { isContractMismatch } from '@/api/errors';
import {
  INVITE_COLUMNS,
  MEMBER_COLUMNS,
  type InviteRow,
  type MemberRow,
} from '@/api/members';
import {
  CREATE_INVITE,
  LOCATION_COLUMNS,
  createInviteArgs,
  issuedFrom,
  type InviteDraft,
  type InviteIssued,
  type LocationRow,
} from '@/api/invites';
import {
  SET_MY_DISPLAY_NAME,
  setMyDisplayNameArgs,
  storedNameFrom,
} from '@/api/displayName';
import {
  REDEEM_INVITE,
  redeemArgs,
  redeemedFrom,
  type Redeemed,
} from '@/api/redeem';
import {
  MY_ACCESS_REQUESTS,
  REQUEST_ACCESS,
  outcomeFrom,
  requestAccessArgs,
  type AccessOutcome,
  type AccessRequestRow,
} from '@/api/requests';
import {
  ONBOARD_WORKSPACE,
  WORKSPACE_COLUMNS,
  onboardArgs,
  toWorkspace,
  type OnboardInput,
  type Workspace,
  type WorkspaceRow,
} from '@/api/workspace';

/**
 * The shops the caller is an active member of. An empty array is the answer,
 * not a failure: it is what "signed in, belongs to no shop" looks like, and
 * `workspace_select` (0001) is what makes the empty array trustworthy.
 */
export async function myWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase.from('workspace').select(WORKSPACE_COLUMNS);
  if (error) throw reported(error);
  return ((data ?? []) as WorkspaceRow[]).map(toWorkspace);
}

/** Creates the shop, its owner membership, its settings, its first location and
 *  its generic provider — five rows, one statement (`0027`). Returns its id. */
export async function onboardWorkspace(input: OnboardInput): Promise<string> {
  const { data, error } = await supabase.rpc(ONBOARD_WORKSPACE, onboardArgs(input));
  if (error) throw reported(error);
  if (typeof data !== 'string') {
    throw new Error(`${ONBOARD_WORKSPACE} returned ${typeof data}, expected a workspace id`);
  }
  return data;
}

/**
 * Every active and inactive membership of every shop the caller belongs to
 * (5b-ii-a). `workspace_member_select` (`0001`) scopes it to their workspaces
 * and does NOT filter `is_active`, which is why the column is read and
 * `rosterFrom` is what drops a membership that has ended.
 */
export async function workspaceMembers(): Promise<MemberRow[]> {
  const { data, error } = await supabase.from('workspace_member').select(MEMBER_COLUMNS);
  if (error) throw reported(error);
  return (data ?? []) as MemberRow[];
}

/**
 * The invites this caller may read — the other half of the roster's join.
 *
 * ⚠️⚠️ A STAFF CALLER GETS `[]` AND NOT A 403, WHICH IS THE ENTIRE REASON
 * `canSeeRoster` IS A CLIENT-SIDE FENCE AND NOT AN ERROR HANDLER.
 * `workspace_invite_select` is `has_role(workspace_id, 'manager')` (`0002`), and
 * a row a policy hides is a row that was never there: the read SUCCEEDS and
 * returns nothing. Rendering the roster from that answer is a list of people
 * with no identity on any of them, so the decision is taken before the call —
 * see `@/api/members`, and the owner's ruling of 2026-09-18.
 */
export async function workspaceInvites(): Promise<InviteRow[]> {
  const { data, error } = await supabase.from('workspace_invite').select(INVITE_COLUMNS);
  if (error) throw reported(error);
  return (data ?? []) as InviteRow[];
}

/**
 * The stores this caller may put somebody in — the read no line in this app
 * performed before `5b-ii-b-1` (`P1`).
 *
 * ⚠️ `location_select` IS `id in (select public.my_locations())` (`0001:506`),
 * which is scoped by LOCATION and not by workspace like every other read here.
 * Measured against `0001:332`: `my_locations()` returns every ACTIVE location in
 * the workspace when `wm.role >= 'manager'`, and only explicit `member_location`
 * rows below that. So a manager gets the whole list by role, a staff caller gets
 * the stores they work in — and neither ever sees an inactive one, which is why
 * `LOCATION_COLUMNS` does not read `is_active`.
 *
 * ⚠️ AN EMPTY ARRAY IS AN ANSWER, NOT A FAILURE, exactly as it is for
 * `myWorkspaces` — and here it is the one `checkInvite` turns into `noLocations`
 * rather than a refusal from the wire.
 */
export async function workspaceLocations(): Promise<LocationRow[]> {
  const { data, error } = await supabase.from('location').select(LOCATION_COLUMNS);
  if (error) throw reported(error);
  return (data ?? []) as LocationRow[];
}

/**
 * Issues one invite and returns its token — which exists in this result and
 * nowhere else, ever (`0028` stores only the hash).
 *
 * ⚠️ `issuedFrom` THROWS ON A RESULT IT CANNOT PARSE rather than returning a
 * partial, and `@/api/invites` argues why: a half-parsed result is an invite
 * that has been created in the database and lost on the way to the person who
 * needed it.
 */
export async function createInvite(
  workspaceId: string,
  draft: InviteDraft,
): Promise<InviteIssued> {
  const { data, error } = await supabase.rpc(CREATE_INVITE, createInviteArgs(workspaceId, draft));
  if (error) throw reported(error);
  return issuedFrom(data);
}

/**
 * Spends one invite token and returns the membership it just wrote (5b-ii-b-2).
 *
 * ⚠️ THE CALLER BELONGS TO NO SHOP WHEN THIS RUNS, which is why `redeem_invite`
 * is `security definer` — `0028`'s own comment says it: *"the caller is not a
 * member of anything yet and no policy could admit them."* So this is the one
 * write in this app whose success is what makes its caller's other reads
 * non-empty, and the invalidation in `useRedeemInvite` is not a refresh, it is
 * the thing that lets the guard move her.
 *
 * ⚠️ IT IS PASSED WHAT THE PERSON TYPED AND NORMALISES ON THE WAY IN
 * (`redeemArgs`), so the string that was CLASSIFIED by length is the string that
 * is SPENT. `0028` normalises inside the hash as well, and the two agree.
 */
export async function redeemInvite(typed: string): Promise<Redeemed> {
  const { data, error } = await supabase.rpc(REDEEM_INVITE, redeemArgs(typed));
  if (error) throw reported(error);
  return redeemedFrom(data);
}

/**
 * Asks to join a shop by its code, and returns what became of the ask
 * (5b-iii-b).
 *
 * ⚠️ THE CALLER BELONGS TO NO SHOP WHEN THIS RUNS — `redeemInvite`'s situation,
 * and `request_access` is `security definer` for the same reason plus one more:
 * `0029`'s `D6` refuses the select policy that would let a stranger SCAN for
 * shops, so the code is resolved WHOLE inside the function and never matched
 * against a list this app could read.
 *
 * ⚠️⚠️ IT IS NOT ALWAYS AN ASK. `0029`'s `D7` absorbs a pending invite: a person
 * who was already invited by email and types the shop code instead of the token
 * is let straight in, and the answer comes back `joined` rather than
 * `requested`. `outcomeFrom` is where that is read, and `useRequestAccess` is
 * what makes the guard notice.
 *
 * ⚠️ IT IS PASSED WHAT THE PERSON TYPED AND NORMALISES ON THE WAY IN
 * (`requestAccessArgs`), so the string that was CLASSIFIED by length is the
 * string that is SENT — `redeemInvite`'s rule, through the same normaliser.
 */
export async function requestAccess(typed: string): Promise<AccessOutcome> {
  const { data, error } = await supabase.rpc(REQUEST_ACCESS, requestAccessArgs(typed));
  if (error) throw reported(error);
  return outcomeFrom(data);
}

/**
 * What this account has asked for, and what became of it (5b-iii-b).
 *
 * ⚠️⚠️ IT IS THE ONLY WAY SHE CAN EVER SEE A ROW OF HER OWN, AND THAT IS WHY IT
 * IS A FUNCTION AND NOT A SELECT (`S3`). `workspace_invite_select` (`0002:563`)
 * is manager-and-above; somebody who has just asked to join has NO ROLE AT ALL,
 * so no policy can show her the row she just created. The cheap-looking fix — a
 * select policy keyed on the requester — is exactly what `D6` rules out, because
 * it is one predicate away from letting a stranger enumerate shops.
 *
 * ⚠️ IT IS KEYED ON `auth.uid()` INSIDE THE FUNCTION and takes no argument at
 * all, so there is nothing a screen could pass to read somebody else's. `0029`'s
 * decision 1: an email is mutable and a status read that moves with it is a way
 * to read another person's.
 *
 * ⚠️ AN EMPTY ARRAY IS AN ANSWER, NOT A FAILURE — the rule `myWorkspaces` sets.
 * It is what every founding owner who lands on this screen gets.
 */
export async function myAccessRequests(): Promise<AccessRequestRow[]> {
  const { data, error } = await supabase.rpc(MY_ACCESS_REQUESTS);
  if (error) throw reported(error);
  return (data ?? []) as AccessRequestRow[];
}

/**
 * Fixes the caller's OWN name in ONE shop, and returns the name that was stored
 * (5b.8-iii-b).
 *
 * ⚠️⚠️ THERE IS NO ARGUMENT THAT COULD NAME ANYBODY ELSE. `0035` puts
 * `user_id = auth.uid()` in its own `where` clause — not "the caller may only
 * pass her own id", which is a rule a client could get wrong, but no id to pass
 * at all. So this wrapper cannot be misused by a screen, which is why the
 * control it serves is a text box and not an editor with a subject.
 *
 * ⚠️ IT IS `security definer` BECAUSE THE FENCE HAS TO BE PER-COLUMN.
 * `workspace_member_update` (`0001:532`) is owner-only, and the policy that
 * would have been easier — "you may update your own row" — hands every cashier
 * her own `role`, because RLS filters ROWS and not COLUMNS.
 *
 * ⚠️ IT RETURNS THE STORED NAME, and the screen renders THAT rather than what it
 * typed. `storedNameFrom` throws instead of falling back to the input, because
 * the fallback is the divergence the return value exists to prevent.
 */
export async function setMyDisplayName(workspaceId: string, typed: string): Promise<string> {
  const { data, error } = await supabase.rpc(
    SET_MY_DISPLAY_NAME,
    setMyDisplayNameArgs(workspaceId, typed),
  );
  if (error) throw reported(error);
  return storedNameFrom(data);
}

/**
 * Hands the error back, having put a developer's sentence in the console if it
 * is a developer's error.
 *
 * ⚠️ THE CONSOLE AND NEVER THE SCREEN, the rule `AuthProvider` already follows
 * for a failed OAuth round trip: a contract mismatch names a misconfiguration
 * of ours, and the only person who can act on it is not the one holding the
 * phone.
 */
function reported(error: unknown): unknown {
  if (isContractMismatch(error)) {
    const detail = (error as { message?: unknown }).message;
    console.warn(`[api] this app and the database disagree about an RPC: ${String(detail)}`);
  }
  return error;
}
