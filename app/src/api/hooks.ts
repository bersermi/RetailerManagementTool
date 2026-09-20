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
  myAccessRequests,
  pendingAccessRequests,
  myWorkspaces,
  onboardWorkspace,
  redeemInvite,
  requestAccess,
  setMyDisplayName,
  workspaceInvites,
  workspaceLocations,
  workspaceMembers,
} from '@/api/calls';
import { nameErrorMessage } from '@/api/displayName';
import {
  PENDING_REQUESTS_KEY,
  canApprove,
  pendingFrom,
  type PendingRequest,
} from '@/api/approvals';
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
  MY_REQUESTS_KEY,
  pendingRequest,
  requestErrorMessage,
  requestsFrom,
  type AccessOutcome,
  type AccessRequest,
} from '@/api/requests';
import {
  INVITES_KEY,
  MEMBERS_KEY,
  canSeeRoster,
  nameOf,
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
 * The caller's own STORED name, or `null` while the read is out — and `null`
 * again when there genuinely is none, which is the state `5b.8-iii-b` exists to
 * let a person out of. Plan task `5b.8-iii-b`.
 *
 * ⚠️ IT MAKES NO READ OF ITS OWN. `useWorkspaceMembers` is already out for every
 * member of every shop — `useMyRole` rides it, and so does the roster — and
 * `display_name` has been in `MEMBER_COLUMNS` since `5b.8-ii`. A dedicated read
 * would be a second question with the same answer, asked on every open of the
 * sheet, on a connection the pilot store loses routinely.
 *
 * ⚠️ WHICH IS ALSO WHY THE INVALIDATION IN `useSetMyDisplayName` IS THE WHOLE OF
 * "the roster re-reads": one key feeds this section AND the list of people, so
 * they cannot show two different names for the same person.
 *
 * ⚠️ `null` IS "NOT KNOWN" AND "NOT SET" AT ONCE, AND THE SHEET IS ALLOWED TO
 * CONFLATE THEM — unlike `roleOf`, where the distinction fences a section. Both
 * render the same thing here: an invitation to type one. Telling a person which
 * of the two she is looking at would be reporting our internal state.
 */
export function useMyDisplayName(): string | null {
  const { session } = useAuth();
  const { data } = useWorkspaceMembers();
  return nameOf(data, session?.user.id ?? null);
}

// ============================================================================
// FIXING YOUR OWN NAME. Plan task `5b.8-iii-b`, and it is ONE hook because it is
// one write over a read that is already out.
// ============================================================================

/**
 * A person fixes her own name.
 *
 * ⚠️⚠️ IT INVALIDATES `MEMBERS_KEY` AND THAT IS A DELIVERABLE, NOT HOUSEKEEPING.
 * The plan row says it in one sentence: *"the roster must re-read after the
 * write, or a person corrects her name and the list in front of her still shows
 * the old one."* ⚠️ The list is not the only reader — `useMyDisplayName` above
 * is the same query — so without this the BOX ITSELF would still be showing what
 * she just replaced.
 *
 * ⚠️ IT DOES NOT TOUCH `INVITES_KEY`. Nothing about an invitation changed, and
 * `rosterFrom` reads the email off the invite only for a member who has no name
 * — which, one line after this call succeeds, she does.
 *
 * ⚠️⚠️ AND IT RETURNS THE STORED NAME RATHER THAN `null`-for-success, which is
 * where this hook deviates from `useOnboardWorkspace`'s shape ON PURPOSE.
 * `0035`'s decision 2 exists so the screen renders what the DATABASE wrote —
 * trimmed — instead of the contents of its own text box. A hook that swallowed
 * the return would put that divergence back.
 *
 * ⚠️ THE FAILURE IS A SPANISH SENTENCE, the shape every hook here uses — through
 * `nameErrorMessage`, because BOTH SQLSTATEs this RPC raises mean something
 * different on this call than they do app-wide. `@/api/displayName`'s header is
 * the argument.
 */
export function useSetMyDisplayName() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ workspaceId, typed }: { workspaceId: string; typed: string }) =>
      setMyDisplayName(workspaceId, typed),
    onSuccess: async () => {
      await queries.invalidateQueries({ queryKey: MEMBERS_KEY });
    },
  });

  async function rename(
    workspaceId: string,
    typed: string,
  ): Promise<{ stored: string | null; error: string | null }> {
    try {
      const stored = await mutation.mutateAsync({ workspaceId, typed });
      return { stored, error: null };
    } catch (thrown) {
      return { stored: null, error: nameErrorMessage(thrown) };
    }
  }

  return { rename, busy: mutation.isPending };
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
// WHO IS WAITING TO BE LET IN. Plan task `5b-iii-d-1`, and it is ONE hook
// because this half is one READ. The act is `5b-iii-d-2`.
// ============================================================================

/**
 * The queue behind the bell — and whether there is a bell at all.
 *
 * ⚠️⚠️ `visible` IS RETURNED RATHER THAN AN EMPTY LIST, WHICH IS `useRoster`'S
 * SHAPE AND MATTERS MORE HERE THAN IT DOES THERE. `0037` answers a non-owner
 * with ZERO ROWS rather than refusing — decision 2, taken so this path does not
 * acquire a THIRD meaning for `42501` — so "you may not see this" and "nobody is
 * waiting" arrive over the wire as the same answer. Only `canApprove`, asked
 * BEFORE the call, can tell them apart, and collapsing them is how a manager is
 * told her shop has no queue when what is true is that the queue is not hers.
 *
 * ⚠️ SO THE QUERY IS FENCED ON THE ROLE AS WELL AS ON THE SESSION, the
 * arrangement `useRoster` and `useLocations` already hold: below `owner` this
 * would ask the database a question whose answer the app has been told, on every
 * open of Inicio, on a connection the pilot store loses routinely.
 *
 * ⚠️ THE KEY CARRIES THE WORKSPACE ID because `0037` is workspace-scoped
 * (decision 5) and `0001:317` admits many shops per person from day one. A key
 * without it would serve one shop's queue of strangers from the other shop's
 * cache — and `PENDING_REQUESTS_KEY` is still the PREFIX, so one invalidation
 * sweeps every shop's.
 *
 * ⚠️ `loading` IS ONLY EVER TRUE FOR SOMEBODY WHO WILL SEE THE LIST. For anyone
 * else the query never runs, so `data` stays `undefined` forever — and a
 * `loading` derived from that alone would leave a manager's Inicio holding a
 * spinner for a section she is never going to be shown.
 */
export function usePendingRequests(): {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly entries: readonly PendingRequest[];
  readonly count: number;
} {
  const { session, ready } = useAuth();
  const workspace = useWorkspace();
  const role = useMyRole();
  const visible = canApprove(role);
  const workspaceId = workspace?.id ?? null;

  const query = useQuery({
    queryKey: [...PENDING_REQUESTS_KEY, workspaceId],
    // ⚠️ THE NON-NULL IS SAFE BECAUSE `enabled` CARRIES THE SAME CONDITION, and
    // it is written as a guard rather than as a `!` so a future edit to
    // `enabled` cannot silently send `null` down the wire as the string "null".
    queryFn: () => (workspaceId === null ? Promise.resolve([]) : pendingAccessRequests(workspaceId)),
    enabled: ready && session !== null && visible && workspaceId !== null,
  });

  const entries = pendingFrom(query.data);
  return {
    visible,
    loading: visible && query.data === undefined,
    entries,
    // ⚠️ THE BADGE COUNTS WHAT IS ON THE SCREEN, not what came back on the wire.
    // `pendingFrom` drops a row it cannot read, and a badge saying 3 over a list
    // of 2 is the app telling a shopkeeper she has missed somebody.
    count: entries.length,
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

// ============================================================================
// ASKING TO JOIN ONE. Plan task 5b-iii-b, and it is two hooks because it is one
// write and one read — and unlike the push path, the read is the POINT: what a
// person gets for asking is a row she can see, and `S3` says no policy can ever
// show it to her.
// ============================================================================

/**
 * What this account has asked for, and what became of it.
 *
 * ⚠️ DISABLED WITHOUT A SESSION FOR THE REASON EVERY READ HERE IS, and here the
 * trap is sharper than elsewhere. `my_access_requests` is keyed on `auth.uid()`
 * INSIDE the function, so an anonymous call does not fail — IT SUCCEEDS AND
 * RETURNS ZERO ROWS. Running it signed out would cache a truthful-looking "you
 * have asked for nothing" against the next person to sign in on this phone, who
 * may well be the one who asked.
 *
 * ⚠️ IT IS NOT FENCED ON A ROLE, and it is the only read in this file that is
 * not. Every other one asks about a shop the caller is in; this one is asked BY
 * somebody who is in no shop at all, which is the whole pull path. `0029`'s
 * grants say the same thing — `authenticated`, deliberately, because RLS can say
 * nothing about a person with no membership.
 *
 * ⚠️ `pending` IS `null` WHILE THE READ IS OUT AND `null` AGAIN WHEN THERE IS
 * GENUINELY NOTHING, and the landing is allowed to conflate them — `useMyDisplayName`'s
 * rule. Both render the same thing: no pending block at all. Showing a spinner
 * where a sentence might go would put a flicker on the screen of every founding
 * owner, who is the common case here and has never asked anybody for anything.
 */
export function useMyAccessRequests(): {
  readonly loading: boolean;
  readonly requests: readonly AccessRequest[];
  readonly pending: AccessRequest | null;
} {
  const { session, ready } = useAuth();
  const query = useQuery({
    queryKey: MY_REQUESTS_KEY,
    queryFn: myAccessRequests,
    enabled: ready && session !== null,
  });
  const requests = requestsFrom(query.data);
  return {
    loading: query.data === undefined,
    requests,
    pending: pendingRequest(requests),
  };
}

/**
 * Asking to join.
 *
 * ⚠️⚠️ IT INVALIDATES THE MEMBERSHIP READ ON EVERY SUCCESS, INCLUDING THE ONES
 * THAT ARE ONLY AN ASK — and that is not defensive, it is `D7`. `0029` absorbs a
 * pending invite: a person who was already invited by email and types the SHOP's
 * code instead of her token is let straight in and the answer is `joined`, not
 * `requested`. So this hook cannot know from the outside whether a membership
 * was just written, and the read is what settles it. ⚠️ `already_member` is the
 * same shape from the other end: she was in the shop before she typed anything,
 * and the guard has to be told.
 *
 * ⚠️ AND IT NAVIGATES NOWHERE, which is `useRedeemInvite`'s rule and matters
 * identically. `guard.ts` moves her to Inicio the moment `useMyWorkspaces` comes
 * back `member`; a `router.replace` here would be a second opinion about
 * navigation competing with the first one in the same frame.
 *
 * ⚠️ IT INVALIDATES `MY_REQUESTS_KEY` TOO, AND THAT IS THE VISIBLE HALF. On the
 * ordinary path — `requested` — no membership changed and nothing about the
 * guard fires; what changes is that she now has a pending row, and this
 * invalidation is the only thing that puts it on the screen she is looking at.
 *
 * ⚠️ IT ALSO INVALIDATES THE ROSTER'S TWO KEYS, for `useRedeemInvite`'s reason
 * and only on the paths that write: `joined` makes her a `workspace_member` row
 * and stamps `accepted_by` on the invite she never redeemed, which is exactly
 * the join `rosterFrom` makes. Invalidating them on a plain `requested` costs
 * two reads that were already empty for her, which is cheaper than a branch that
 * can be wrong.
 *
 * ⚠️⚠️ AND `already_requested` IS A SUCCESS, NOT AN ERROR. `0029`'s decision 5
 * hands back her own live row rather than refusing — she taps twice on a bad
 * connection, or asks again the next morning because nothing has happened — so
 * it takes the same path as a first ask. The pilot store is offline a lot and
 * this is the ordinary case, not the edge one.
 *
 * ⚠️ THE LOCAL REFUSAL IS THE SCREEN'S AND NOT THIS HOOK'S — `checkCredential`
 * and `classifyCredential`, called before `ask`, exactly as `checkShopName` and
 * `checkInvite` are called by the screens that own them.
 *
 * ⚠️ AND IT RETURNS A SPANISH SENTENCE OR `null` FOR THE FAILURE, the shape
 * `useOnboardWorkspace` established — here through `requestErrorMessage`,
 * because `42501` means something different on this screen than it does anywhere
 * else in this app. That module's `UNKNOWN_CODE` is where the difference is
 * argued and where the check that measures it is named.
 */
export function useRequestAccess() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: requestAccess,
    onSuccess: async () => {
      await Promise.all([
        queries.invalidateQueries({ queryKey: MY_WORKSPACES_KEY }),
        queries.invalidateQueries({ queryKey: MY_REQUESTS_KEY }),
        queries.invalidateQueries({ queryKey: MEMBERS_KEY }),
        queries.invalidateQueries({ queryKey: INVITES_KEY }),
      ]);
    },
  });

  async function ask(
    typed: string,
  ): Promise<{ outcome: AccessOutcome | null; error: string | null }> {
    try {
      const outcome = await mutation.mutateAsync(typed);
      return { outcome, error: null };
    } catch (thrown) {
      return { outcome: null, error: requestErrorMessage(thrown) };
    }
  }

  return { ask, busy: mutation.isPending };
}
