// ============================================================================
// THE TWO THINGS A SCREEN IS ALLOWED TO ASK ABOUT A SHOP. Plan task 5b-i.
//
// One read and one write, both over `@/api/calls`, both through TanStack Query.
// A screen calls these; nothing anywhere calls `calls.ts` directly, and nothing
// at all calls `supabase` (ADR-035 §2.11).
//
// ⚠️ THE READ IS ALSO A NAVIGATION INPUT, WHICH IS WHY `useMembership` EXISTS
// SEPARATELY. `guard.ts` decides where a signed-in person with no shop belongs;
// it takes `Membership` as a value and knows nothing about queries. This hook is
// the adapter between the two, and the decision it makes — "not back yet" is
// `unknown` and never `none` — is `membershipFrom`'s, in a file the suite reads.
//
// ⚠️ THE QUERY IS DISABLED WHEN THERE IS NO SESSION, and that is not an
// optimisation. `workspace_select` is `id in (select public.my_workspaces())`
// and `my_workspaces()` reads `auth.uid()`, so an anonymous read does not fail
// — IT SUCCEEDS AND RETURNS ZERO ROWS. Running it signed out would therefore
// cache a truthful-looking "belongs to no shop" against the next person to sign
// in on this phone.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { apiErrorMessage } from '@/api/errors';
import { myWorkspaces, onboardWorkspace, workspaceInvites, workspaceMembers } from '@/api/calls';
import {
  INVITES_KEY,
  MEMBERS_KEY,
  canSeeRoster,
  roleOf,
  rosterFrom,
  type Role,
  type RosterEntry,
} from '@/api/members';
import {
  MY_WORKSPACES_KEY,
  membershipFrom,
  type Membership,
  type OnboardInput,
  type Workspace,
} from '@/api/workspace';

/** The shops this person belongs to, or nothing while there is no session. */
export function useMyWorkspaces() {
  const { session, ready } = useAuth();
  return useQuery({
    queryKey: MY_WORKSPACES_KEY,
    queryFn: myWorkspaces,
    enabled: ready && session !== null,
  });
}

/** Where a signed-in person stands. See `membershipFrom` for why `unknown` is. */
export function useMembership(): Membership {
  const { data } = useMyWorkspaces();
  return membershipFrom(data);
}

/** The shop itself, once there is one. `5b-ii` reads `code` off this. */
export function useWorkspace(): Workspace | null {
  const { data } = useMyWorkspaces();
  return data === undefined || data.length === 0 ? null : data[0];
}

/**
 * Creating the shop.
 *
 * ⚠️ IT INVALIDATES THE READ AND NAVIGATES NOWHERE. The screen does not know
 * where a person with a shop belongs — `guard.ts` does, and it will send them to
 * Inicio the moment the membership read comes back `member`. A `router.replace`
 * here would be a second opinion about navigation, competing with the first one
 * in the same frame.
 *
 * ⚠️ AND IT RETURNS A SPANISH SENTENCE OR `null`, the shape `AuthProvider`
 * established: the screen is never handed a PostgREST error to have an opinion
 * about, because there would then be as many opinions as there are screens.
 */
export function useOnboardWorkspace() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: onboardWorkspace,
    onSuccess: async () => {
      await queries.invalidateQueries({ queryKey: MY_WORKSPACES_KEY });
    },
  });

  async function create(input: OnboardInput): Promise<string | null> {
    try {
      await mutation.mutateAsync(input);
      return null;
    } catch (thrown) {
      return apiErrorMessage(thrown);
    }
  }

  return { create, busy: mutation.isPending };
}

// ============================================================================
// THE ROSTER. Plan task 5b-ii-a, and it is three hooks because it is two reads
// and a fence, and the fence decides whether the second read happens at all.
// ============================================================================

/**
 * Every membership of every shop this person belongs to.
 *
 * ⚠️ DISABLED WITHOUT A SESSION FOR THE REASON `useMyWorkspaces` IS.
 * `workspace_member_select` reads `my_workspaces()`, which reads `auth.uid()`,
 * so an anonymous read SUCCEEDS AND RETURNS ZERO ROWS — and a cached empty
 * roster is a shop that looks like it has nobody in it.
 */
export function useWorkspaceMembers() {
  const { session, ready } = useAuth();
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: workspaceMembers,
    enabled: ready && session !== null,
  });
}

/** The caller's own role in the shop, or `null` while the read is out. */
export function useMyRole(): Role | null {
  const { session } = useAuth();
  const { data } = useWorkspaceMembers();
  return roleOf(data, session?.user.id ?? null);
}

/**
 * Who is in the shop, as the sheet renders it.
 *
 * ⚠️⚠️ THE INVITE READ IS `enabled` ON THE ROLE, AND THAT IS THE RULING OF
 * 2026-09-18 EXPRESSED AS A QUERY. A staff caller's invite read would return
 * `[]` rather than failing (`0002`'s policy hides rows, it does not refuse
 * them), so the fence cannot be an error handler — and leaving the call enabled
 * would have this app ask a question it has already been told the answer to, on
 * every open of the sheet, on a connection the pilot store loses routinely.
 *
 * ⚠️ `visible` IS RETURNED RATHER THAN AN EMPTY LIST, because "you may not see
 * this" and "there is nobody here" are different screens: the first renders no
 * section at all, the second renders `alone`. Collapsing them is how a staff
 * member is told their shop is empty.
 */
export function useRoster(): {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly entries: readonly RosterEntry[];
} {
  const { session, ready } = useAuth();
  const members = useWorkspaceMembers();
  const role = useMyRole();
  const visible = canSeeRoster(role);

  const invites = useQuery({
    queryKey: INVITES_KEY,
    queryFn: workspaceInvites,
    enabled: ready && session !== null && visible,
  });

  return {
    visible,
    // ⚠️ THE MEMBER READ BEING OUT IS THE LOADING STATE, AND THE INVITE READ IS
    // NOT, because `visible` is false until the first one lands — so a sheet
    // that waited on both would show nothing at all to the one caller who is
    // never going to issue the second.
    loading: members.data === undefined || (visible && invites.data === undefined),
    entries: rosterFrom({
      members: members.data,
      invites: invites.data,
      selfUserId: session?.user.id ?? null,
    }),
  };
}
