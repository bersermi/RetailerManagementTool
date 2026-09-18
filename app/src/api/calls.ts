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
