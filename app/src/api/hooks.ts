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
import {
  createInvite,
  myWorkspaces,
  onboardWorkspace,
  redeemInvite,
  workspaceInvites,
  workspaceLocations,
  workspaceMembers,
} from '@/api/calls';
import {
  LOCATIONS_KEY,
  canInvite,
  inviteErrorMessage,
  locationsFrom,
  type InviteDraft,
  type InviteIssued,
  type LocationOption,
} from '@/api/invites';
import { redeemErrorMessage } from '@/api/redeem';
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

// ============================================================================
// ISSUING AN INVITE. Plan task 5b-ii-b-1, and it is two hooks because it is one
// read and one write — and the read is a list the write cannot be made without.
// ============================================================================

/**
 * The stores this person may put somebody in.
 *
 * ⚠️ DISABLED WITHOUT A SESSION FOR THE REASON EVERY READ HERE IS.
 * `location_select` reads `my_locations()`, which reads `auth.uid()`, so an
 * anonymous read SUCCEEDS AND RETURNS ZERO ROWS — and a cached empty list is a
 * shop that looks like it has no stores, which is the one state `checkInvite`
 * turns into a refusal.
 *
 * ⚠️ IT IS ALSO FENCED ON THE ROLE, the shape `useRoster` established: only a
 * manager and above can issue an invite at all (`0028`'s body predicate), so
 * below that this asks the database a question whose answer the app will not
 * use — on a connection the pilot store loses routinely.
 */
export function useLocations(): {
  readonly loading: boolean;
  readonly options: readonly LocationOption[];
} {
  const { session, ready } = useAuth();
  const role = useMyRole();
  const query = useQuery({
    queryKey: LOCATIONS_KEY,
    queryFn: workspaceLocations,
    enabled: ready && session !== null && canInvite(role),
  });
  return { loading: query.data === undefined, options: locationsFrom(query.data) };
}

/**
 * Issuing the invite.
 *
 * ⚠️⚠️ IT RETURNS THE ISSUED INVITE AND DOES NOT CACHE IT. The token is not
 * server state — it is a value that existed once, in one response — so putting
 * it in Query would make it re-fetchable in principle and stale in fact, and
 * `invalidateQueries` would quietly blank the screen showing it. The screen
 * holds it, for as long as the screen is open. `@/api/invites`'s header is the
 * argument.
 *
 * ⚠️ IT DOES INVALIDATE THE ROSTER'S INVITE READ, because a new pending row now
 * exists and `workspace_invite` is what the roster joins against. Nothing on the
 * sheet renders a pending invite today — `rosterFrom` drops them, since
 * `accepted_by` is null until redemption — so this is invalidating for the
 * NEXT reader rather than for a visible change, which is the cheap direction.
 *
 * ⚠️ AND IT RETURNS A SPANISH SENTENCE OR `null` FOR THE FAILURE, the shape
 * `useOnboardWorkspace` established: the screen is never handed a PostgREST
 * error to have an opinion about.
 */
export function useCreateInvite() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ workspaceId, draft }: { workspaceId: string; draft: InviteDraft }) =>
      createInvite(workspaceId, draft),
    onSuccess: async () => {
      await queries.invalidateQueries({ queryKey: INVITES_KEY });
    },
  });

  async function issue(
    workspaceId: string,
    draft: InviteDraft,
  ): Promise<{ issued: InviteIssued | null; error: string | null }> {
    try {
      const issued = await mutation.mutateAsync({ workspaceId, draft });
      return { issued, error: null };
    } catch (thrown) {
      return { issued: null, error: inviteErrorMessage(thrown) };
    }
  }

  return { issue, busy: mutation.isPending };
}

// ============================================================================
// SPENDING ONE. Plan task 5b-ii-b-2, and it is ONE hook because it is one write
// and no read at all — the person calling it belongs to no shop, so there is
// nothing for her to have read first.
// ============================================================================

/**
 * Redeeming the invite.
 *
 * ⚠️⚠️ IT INVALIDATES THE MEMBERSHIP READ AND NAVIGATES NOWHERE, which is
 * `useOnboardWorkspace`'s rule and matters more here. `guard.ts` sends her to
 * Inicio the moment `useMyWorkspaces` comes back `member`; a `router.replace` on
 * this screen would be a second opinion about navigation competing with the
 * first one in the same frame. ⚠️ The invalidation is not a refresh — it is the
 * only thing that turns `membership: 'none'` into `'member'`, so WITHOUT IT she
 * sits on the landing looking at a shop she has already joined.
 *
 * ⚠️ IT ALSO INVALIDATES THE ROSTER'S TWO KEYS. She is a new row in
 * `workspace_member` and the invite she just spent now carries an `accepted_by`,
 * which is exactly the join `rosterFrom` makes — so the next person to open
 * Ajustes on this phone reads her, rather than a cached shop she is absent from.
 *
 * ⚠️⚠️ AND `already_redeemed` IS A SUCCESS, NOT AN ERROR. `0028` answers it when
 * the same caller taps twice — the ordinary case on a bad connection, and the
 * pilot store is offline a lot — so it takes the same path as a first
 * redemption: invalidate, and let the guard move her. ⚠️ THERE IS NO SUCCESS
 * SENTENCE ON EITHER PATH, deliberately: the screen it would be rendered on is
 * gone by the next frame, and a message nobody can finish reading is a message
 * that was written for us.
 *
 * ⚠️ THE LOCAL REFUSAL IS THE SCREEN'S AND NOT THIS HOOK'S — `checkCredential`,
 * called before `redeem`, exactly as `checkShopName` and `checkInvite` are called
 * by the two screens that own them. A key that has to become a sentence is
 * rendered where the sentences are, and a hook that returned one would be the
 * second place in this app that decides what a refusal READS like.
 *
 * ⚠️ AND IT RETURNS A SPANISH SENTENCE OR `null` FOR THE FAILURE, the shape
 * `useOnboardWorkspace` established — here through `redeemErrorMessage`, because
 * `42501` means something different on this screen than it does anywhere else in
 * this app. That module's `REDEEM_REFUSALS` is where the difference is argued.
 */
export function useRedeemInvite() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: redeemInvite,
    onSuccess: async () => {
      await Promise.all([
        queries.invalidateQueries({ queryKey: MY_WORKSPACES_KEY }),
        queries.invalidateQueries({ queryKey: MEMBERS_KEY }),
        queries.invalidateQueries({ queryKey: INVITES_KEY }),
      ]);
    },
  });

  async function redeem(typed: string): Promise<string | null> {
    try {
      await mutation.mutateAsync(typed);
      return null;
    } catch (thrown) {
      return redeemErrorMessage(thrown);
    }
  }

  return { redeem, busy: mutation.isPending };
}
