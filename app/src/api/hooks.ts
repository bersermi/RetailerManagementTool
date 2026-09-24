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
import { apiErrorKey, apiErrorMessage, type ApiMessageKey } from '@/api/errors';
import {
  CATALOG_KEY,
  UNITS_KEY,
  catalogFrom,
  search,
  unitBasesFrom,
  unitFactorsFrom,
  type CatalogEntry,
  type UnitFactors,
} from '@/api/catalog';
import {
  WRITE_ORDER,
  type CreateOutcome,
  type ProductDraft,
} from '@/api/catalogWrite';
import {
  EDIT_ORDER,
  PRICE_EDIT_KEY,
  VARIANT_EDIT_KEY,
  type ActivePatch,
  type EditOutcome,
  type EditPlan,
  type NamePatch,
  type PriceChange,
  type PriceChangeOutcome,
  type PriceInForce,
  type SettingsPatch,
  type VariantSettingsRow,
} from '@/api/catalogEdit';
import {
  approveRequest,
  catalogUnits,
  catalogVariants,
  createInvite,
  changePrice,
  createProduct,
  patchVariant,
  variantPrices,
  variantSettingsRow,
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
  todaySales,
} from '@/api/calls';
import { nameErrorMessage } from '@/api/displayName';
import {
  PENDING_REQUESTS_KEY,
  approveErrorMessage,
  canApprove,
  pendingFrom,
  type ApprovalDraft,
  type Approved,
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
import { TODAY_KEY, takingsFrom, type Takings } from '@/api/today';

/**
 * What the shop has taken today, and how many sales stand behind it — the two
 * numbers §2.8 puts above anything tappable on Inicio. Plan task `5d-iv-a`.
 *
 * ⚠️ THE FAILURE IS REPORTED SEPARATELY FROM `loading`, and it is not a
 * precaution — it is the defect the owner found on his own phone on 2026-09-22.
 * `loading` is `data === undefined`, which is ALSO what a failed query looks
 * like, so a read that could not happen rendered *Cargando productos…* for ever.
 * The same mistake at the top of Inicio would be a shop whose takings never
 * arrive, on the screen she opens between customers.
 *
 * ⚠️ ONE MINUTE OF STALENESS, DECIDED HERE BECAUSE `QueryProvider` says every
 * read from `5d` onwards decides its own. The catalog takes five, because a
 * catalog changes when somebody edits it; this changes on every sale, and Home
 * is the screen somebody opens BETWEEN customers — a figure a minute old is a
 * figure from before the customer she just served.
 *
 * ⚠️⚠️ AND IT WILL LAG THE TILL BY WHATEVER THE QUEUE IS HOLDING, WHICH IS NOT A
 * DEFECT AND IS WORTH SAYING BEFORE `5f` MAKES IT VISIBLE. This is a SERVER read;
 * a sale rung up offline lives in the device's outbox until the link comes back
 * (`5c`), so Inicio can honestly show less than the cashier remembers taking.
 * Reconciling the two is `5f`'s question — it is the task that creates the
 * queued sale — and pricing the outbox here would be a second answer to *what
 * did we take*, on the one screen that must not have two.
 */
export function useToday(): Takings & {
  readonly loading: boolean;
  readonly failed: ApiMessageKey | null;
} {
  const { session, ready } = useAuth();
  const query = useQuery({
    queryKey: TODAY_KEY,
    queryFn: todaySales,
    enabled: ready && session !== null,
    staleTime: 60_000,
  });
  return {
    // ⚠️ `takingsFrom` IS HANDED `undefined` UNCHANGED, and that is the point of
    // its first two lines: a read in flight and a read that failed both withhold
    // the figure rather than reporting a confident zero.
    ...takingsFrom(query.data),
    loading: query.data === undefined,
    failed: query.error ? apiErrorKey(query.error) : null,
  };
}

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

/**
 * Letting one person in.
 *
 * ⚠️⚠️ IT INVALIDATES THE QUEUE ITSELF, AND THAT IS THE VISIBLE HALF. The row
 * she just approved no longer satisfies `0037`'s four-part definition of
 * pending — `accepted_at` is stamped — so the re-read is what makes the entry
 * LEAVE the list and the bell's badge count down. Without it an owner is
 * looking at somebody she has already admitted, and the obvious next thing to
 * do about that is tap the button again.
 *
 * ⚠️ IT INVALIDATES THE ROSTER'S TWO KEYS TOO, for `useRedeemInvite`'s reason
 * and here it is literal rather than anticipatory: a `workspace_member` row was
 * just written and the invite it came from now carries an `accepted_by`, which
 * is exactly the join `rosterFrom` makes. The next person to open Ajustes on
 * this phone reads her, rather than a shop she is absent from.
 *
 * ⚠️ IT DOES NOT INVALIDATE `MY_WORKSPACES_KEY`, WHICH THE OTHER TWO WRITES DO.
 * Those change the CALLER's own membership and therefore what `guard.ts` does
 * with her; this changes somebody else's, on a phone that is not hers. A sweep
 * here would re-read the owner's own shops to learn nothing, on a connection
 * the pilot store loses routinely.
 *
 * ⚠️⚠️ AND `already_approved` IS A SUCCESS, NOT AN ERROR — `useRedeemInvite`'s
 * rule, and the pilot store is why it is not a nicety. A tap on a bad
 * connection is tapped again; `0029:381` answers the second one with the
 * membership rather than raising, so it takes the same path as the first:
 * invalidate, and let the queue shorten.
 *
 * ⚠️ THE LOCAL REFUSAL IS THE SCREEN'S AND NOT THIS HOOK'S — `checkApproval`,
 * called before `admit`, exactly as `checkInvite` and `checkCredential` are
 * called by the screens that own them. A key that has to become a sentence is
 * rendered where the sentences are.
 */
export function useApproveRequest() {
  const queries = useQueryClient();
  const mutation = useMutation({
    mutationFn: (draft: ApprovalDraft) => approveRequest(draft),
    onSuccess: async () => {
      await Promise.all([
        queries.invalidateQueries({ queryKey: PENDING_REQUESTS_KEY }),
        queries.invalidateQueries({ queryKey: MEMBERS_KEY }),
        queries.invalidateQueries({ queryKey: INVITES_KEY }),
      ]);
    },
  });

  async function admit(
    draft: ApprovalDraft,
  ): Promise<{ approved: Approved | null; error: string | null }> {
    try {
      const approved = await mutation.mutateAsync(draft);
      return { approved, error: null };
    } catch (thrown) {
      return { approved: null, error: approveErrorMessage(thrown) };
    }
  }

  return { admit, busy: mutation.isPending };
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

// ============================================================================
// THE CATALOG. Plan task 5d-i, and it is the first read in this app about what
// a shop SELLS. `5d-ii` draws the list and `5d-iii` opens a family from it;
// neither of them knows a column name.
// ============================================================================

/**
 * Everything this shop sells, priced for today, in the database's own order.
 *
 * ⚠️ THREE READS AND ONE OF THEM IS SHARED. The variants and the ten units are
 * this hook's; the locations are `LOCATIONS_KEY`, the same cache entry
 * `useLocations` fills — and they are read here WITHOUT that hook, because its
 * `enabled` carries the invite screen's manager fence and the catalog has no
 * fence at all. `location_select` is `my_locations()`, so a cashier reads the
 * store she is assigned to and a manager reads them all.
 *
 * ⚠️⚠️ ONE LOCATION MEANS THAT STORE'S PRICES; ANY OTHER NUMBER MEANS THE
 * SHOP-WIDE ONE, AND THE LIMIT IS WRITTEN DOWN RATHER THAN HIDDEN. C1.5 says
 * both pilot shops are one location each, so this is exact for every shop that
 * exists today. A workspace with two stores that prices them differently would
 * need this phone to know which store it is standing in — and ADR-035 §3 STRUCK
 * *"how the client resolves its location_id"* on 2026-09-13 rather than
 * deferring it, because the premise it rested on (a shared till) is false. So
 * there is no task to route this to: the day a second location appears, the
 * question comes back, and the fallback until then is the price every store
 * shares rather than one store's guess.
 *
 * ⚠️ THE STALE TIME IS THIS SCREEN'S, which is what `QueryProvider` says every
 * read from `5d` onwards must decide for itself. A catalog changes when
 * somebody edits it — `5e` invalidates `CATALOG_KEY` when it does — so five
 * minutes is a cheap read on a connection this shop loses half the day. The ten
 * units change only in a migration, so they are never stale.
 */
export function useCatalog(typed: string = ''): {
  readonly loading: boolean;
  readonly entries: readonly CatalogEntry[];
  readonly failed: ApiMessageKey | null;
  /**
   * The store whose prices these entries were resolved at, or `null` for the
   * shop-wide ones.
   *
   * ⚠️⚠️ IT IS RETURNED RATHER THAN RE-DERIVED BY `Editar`, AND THAT IS ONE
   * ANSWER TO ONE QUESTION. `priceChange` needs the scope the READ used, because
   * a change must edit the row the shopkeeper is looking at; a screen that
   * resolved it a second time out of `LOCATIONS_KEY` would be a second opinion
   * about which store this phone is standing in, and the two would disagree the
   * first time a shop opened its second location.
   */
  readonly locationId: string | null;
} {
  const { session, ready } = useAuth();
  const enabled = ready && session !== null;

  const variants = useQuery({
    queryKey: CATALOG_KEY,
    queryFn: catalogVariants,
    enabled,
    staleTime: 5 * 60_000,
  });
  const units = useQuery({
    queryKey: UNITS_KEY,
    queryFn: catalogUnits,
    enabled,
    staleTime: Infinity,
  });
  const locations = useQuery({
    queryKey: LOCATIONS_KEY,
    queryFn: workspaceLocations,
    enabled,
  });

  const stores = locationsFrom(locations.data);
  const locationId = stores.length === 1 ? stores[0].id : null;
  // ⚠️ THE BASES MAP COMES FROM THE SAME READ AS THE FACTORS, AND IT IS WHY
  // `UNIT_COLUMNS` GAINED `base_code` ON 2026-09-24. `product_variant.
  // base_unit_code` disagrees with the unit table on every product `Agregar`
  // has ever made, and the quantity box on Vender was counting `1, 2, 3` for a
  // product priced per 250 g because of it. See `catalogFrom`.
  const entries = catalogFrom(
    variants.data,
    unitFactorsFrom(units.data),
    locationId,
    unitBasesFrom(units.data),
  );

  // ⚠️⚠️ THE FAILURE IS REPORTED SEPARATELY FROM *loading*, AND UNTIL 2026-09-22
  // IT WAS NOT. `loading` is `data === undefined`, which is ALSO what a failed
  // query looks like — TanStack leaves `data` undefined on an error — so a read
  // that could not happen rendered as *Cargando productos…* for ever. The owner
  // found it on his own phone, on a project whose schema had never been
  // deployed, and no check in this repository could have: §2.11 keeps rendering
  // out of scope and the suite's fixtures are hand-written rows that never fail.
  //
  // ⚠️ THE VARIANTS' FAILURE IS READ FIRST because it is the one that empties
  // the screen; a units failure alone would leave every row showing C3.12's dash,
  // which is also worth saying out loud rather than rendering as a priceless shop.
  const thrown = variants.error ?? units.error;

  return {
    // ⚠️ THE UNITS COUNT TOWARDS *loading* AND THE LOCATIONS DO NOT. Without the
    // factors every row would render C3.12's dash — a screen saying this shop
    // has priced nothing — where the locations only decide WHICH of two prices
    // wins, and the shop-wide one is a correct answer while they are in flight.
    loading: variants.data === undefined || units.data === undefined,
    entries: search(entries, typed),
    failed: thrown ? apiErrorKey(thrown) : null,
    locationId,
  };
}

// ============================================================================
// THE SHOP MAKING A PRODUCT. Plan task `5e-i`, and the hook `5e-ii`'s form
// calls — one write, over three round trips, through `@/api/calls`.
// ============================================================================

/**
 * Creating a product: a family when one is being made, the variant, the price.
 *
 * ⚠️⚠️ IT RETURNS THE OUTCOME RATHER THAN THROWING, WHICH IS NOT THE SHAPE
 * `useCreateInvite` ESTABLISHED, AND THE DIFFERENCE IS THE MISSING
 * TRANSACTION. Those hooks answer `{ issued, error }` because the call either
 * happened or did not; here it can half-happen, and a shopkeeper whose product
 * saved without its price must be told something different from one whose
 * product did not save at all. `createLine` is what says which, and
 * `retryDraft` is what the next attempt needs.
 *
 * ⚠️⚠️ IT INVALIDATES `CATALOG_KEY` ON EVERY PATH THAT WROTE A VARIANT,
 * SUCCESS OR NOT — which is the one line that would be easy to put under
 * `onSuccess` and be wrong. A create that failed at the PRICE still put a
 * product in the catalog; leaving the cached list alone would hide the product
 * she just made behind a five-minute `staleTime`, on the screen she would go to
 * next to price it.
 *
 * ⚠️ `UNITS_KEY` IS NOT INVALIDATED. The ten units change only in a migration
 * (`0001`: *"users pick from this list; they never define their own factors"*),
 * so a refetch here would be a round trip for an answer that cannot have moved.
 *
 * ⚠️ THE FACTORS COME FROM THE SAME READ `useCatalog` USES, not from a second
 * one: `pricePerBase` needs what one price unit weighs, and two homes for *how
 * many grams in a kilo* is one home too many — the refusal `5c-iv-b` recorded
 * and `@/api/catalog` repeats.
 */
export function useCreateProduct() {
  const queries = useQueryClient();
  const units = useQuery({
    queryKey: UNITS_KEY,
    queryFn: catalogUnits,
    staleTime: Infinity,
  });
  const factors = unitFactorsFrom(units.data);

  const mutation = useMutation({
    mutationFn: ({ workspaceId, draft }: { workspaceId: string; draft: ProductDraft }) =>
      createProduct(workspaceId, draft, factors),
  });

  async function create(workspaceId: string, draft: ProductDraft): Promise<CreateOutcome> {
    let outcome: CreateOutcome;
    try {
      outcome = await mutation.mutateAsync({ workspaceId, draft });
    } catch (thrown) {
      // ⚠️ THE ONLY WAY HERE IS A THROW THAT IS NOT A REFUSAL — the fetch dying
      // mid-flight. Nothing is known to have landed, so it is reported as a
      // failure at the FIRST step, which is the one `retryDraft` treats as
      // "carry nothing forward".
      outcome = {
        ok: false,
        failed: WRITE_ORDER[0],
        familyId: null,
        variantId: null,
        error: thrown,
      };
    }
    if (outcome.ok || outcome.variantId !== null) {
      await queries.invalidateQueries({ queryKey: CATALOG_KEY });
    }
    return outcome;
  }

  // ⚠️ THE ROWS AND NOT ONLY THE FACTORS, AS OF `5e-ii`. `pricePerBase` needs
  // what one price unit weighs; `unitOptions` needs each unit's DIMENSION and
  // `0001`'s own `display_order`, because C8.5 holds a family to one dimension
  // and nothing in the database compares a new variant against its siblings.
  // Both come off the one `UNITS_KEY` read — a second query for the same ten
  // rows would be two answers to *how many grams in a kilo*, which is the
  // refusal `@/api/catalog` records.
  return { create, busy: mutation.isPending, factors, units: units.data ?? [] };
}

/**
 * `Editar`, as the one thing a screen is allowed to reach for (`R12`). Plan task
 * `5e-iii-a`; `5e-iii-b` is the screen that calls it.
 *
 * ⚠️⚠️ IT READS THIS VARIANT'S DATED PRICE ROWS, WHICH `useCatalog` DOES NOT
 * HOLD. The list read carries a figure and a scope per variant; every branch of
 * `priceChange` turns on a row's `id` and on which DAY it started. So the price
 * box cannot be planned off the catalog the phone already has, and a screen that
 * tried would take the `closeAndOpen` branch on the second correction of a day
 * and be refused a zero-length range.
 *
 * ⚠️⚠️ THE PRICE OUTCOME IS RETURNED RATHER THAN THROWN — `useCreateProduct`'s
 * argument, sharpened. That call can half-happen too, and here the half-done
 * state is a product with NO price on the shelf, so *"what actually happened"*
 * is the one thing this hook may not lose. `priceChangeLine` is what says which
 * of the two sentences to show, and `retryChange` is what the next attempt needs.
 *
 * ⚠️ THE THREE PATCHES THROW, BECAUSE A SINGLE CALL CANNOT HALF-HAPPEN. They are
 * separate calls and not one body for `catalogEdit`'s recorded reason: a `23505`
 * on the name must not be shown to somebody who changed the IVA.
 *
 * ⚠️⚠️ IT INVALIDATES `CATALOG_KEY` ON EVERY PATH THAT TOUCHED THE DATABASE,
 * SUCCESS OR NOT — `useCreateProduct`'s one easy-to-get-wrong line, and it is
 * worse here. A price change that failed AFTER the close really did remove a
 * price; leaving the cached list alone would show the shopkeeper the old figure,
 * on the screen she goes to next, for the five minutes of its `staleTime` — a
 * price the till would no longer charge.
 *
 * ⚠️ AND `PRICE_EDIT_KEY` IS INVALIDATED WITH IT, because the plan for the NEXT
 * change is built out of these rows: a second correction planned against the rows
 * from before the first one would try to close a row that is already closed.
 */
export function useEditProduct(variantId: string | null) {
  const queries = useQueryClient();
  const { session, ready } = useAuth();
  const enabled = ready && session !== null && variantId !== null;

  const prices = useQuery({
    queryKey: [...PRICE_EDIT_KEY, variantId],
    queryFn: () => variantPrices(variantId as string),
    enabled,
  });

  // ⚠️⚠️ THE TWO SET-ONCE FIGURES, AND THEY ARE A READ RATHER THAN A DEFAULT.
  // `variantSettings` sends no column for a box nobody typed into, so the form
  // cannot overwrite an IVA by accident — but a shopkeeper still has to see what
  // it is before leaving it alone, and the catalog read carries neither column.
  const settings = useQuery({
    queryKey: [...VARIANT_EDIT_KEY, variantId],
    queryFn: () => variantSettingsRow(variantId as string),
    enabled,
  });

  // ⚠️ THE SAME `UNITS_KEY` READ `useCatalog` AND `useCreateProduct` USE, never a
  // second one: the price box divides by what one price unit weighs, and two
  // homes for *how many grams in a kilo* is one home too many.
  const units = useQuery({
    queryKey: UNITS_KEY,
    queryFn: catalogUnits,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (plan: PriceChange) => changePrice(plan),
  });

  async function refresh(): Promise<void> {
    await queries.invalidateQueries({ queryKey: CATALOG_KEY });
    await queries.invalidateQueries({ queryKey: PRICE_EDIT_KEY });
    await queries.invalidateQueries({ queryKey: VARIANT_EDIT_KEY });
  }

  async function edit(patch: NamePatch | SettingsPatch | ActivePatch): Promise<void> {
    if (variantId === null) return;
    await patchVariant(variantId, patch);
    await refresh();
  }

  async function reprice(plan: PriceChange): Promise<PriceChangeOutcome> {
    let outcome: PriceChangeOutcome;
    try {
      outcome = await mutation.mutateAsync(plan);
    } catch (thrown) {
      // ⚠️ THE ONLY WAY HERE IS A THROW THAT IS NOT A REFUSAL — the fetch dying
      // mid-flight. Nothing is known to have landed, so it is reported as a
      // failure at the FIRST call of the plan with `closed` false, which is the
      // state `retryChange` treats as "the whole plan again".
      outcome = {
        ok: false,
        failed: plan.kind === 'reprice' ? 'reprice' : 'close',
        closed: false,
        error: thrown,
      };
    }
    if (!outcome.ok ? outcome.closed : outcome.changed) await refresh();
    return outcome;
  }

  /**
   * One tap of *Guardar*, in `EDIT_ORDER` and stopping at the first failure.
   *
   * ⚠️⚠️ THE ORDER AND THE STOP ARE `@/api/catalogEdit`'s AND NOT THIS
   * FUNCTION'S (`R3`) — this walks the list that module exports and does not
   * know why it reads the way it does. What IS here is the awaiting, which is
   * the half no node suite can hold.
   *
   * ⚠️ IT STOPS RATHER THAN CARRYING ON, and that is the point of the order: a
   * rename refused `23505` must not be followed by a tax rate written onto a
   * name the shopkeeper is about to abandon.
   *
   * ⚠️⚠️ AND THERE IS NO RETRY STATE — `useCreateProduct` has `retryDraft` and
   * this deliberately has nothing. Every step that touched the database refreshes
   * both reads, so the next tap re-plans from fresh rows and asks only for what
   * is left. `@/api/catalogEdit`'s own section header is where that is argued.
   */
  async function save(plan: EditPlan): Promise<EditOutcome> {
    let changed = false;
    for (const step of EDIT_ORDER) {
      if (step === 'price') {
        if (plan.price.kind === 'unchanged') continue;
        const outcome = await reprice(plan.price);
        if (!outcome.ok) return { ok: false, failed: 'price', price: outcome };
        changed = changed || outcome.changed;
        continue;
      }
      const patch = step === 'name' ? plan.name : plan.settings;
      if (patch === null) continue;
      try {
        await edit(patch);
      } catch (error) {
        return { ok: false, failed: step, error };
      }
      changed = true;
    }
    return { ok: true, changed };
  }

  return {
    // ⚠️ THE PRICE ROWS ARE WHAT THE FORM CANNOT OPEN WITHOUT — a plan built
    // before they land would take the `open` branch on a priced product and be
    // refused `23P01`. The two figures are not: they are printed beside their
    // boxes, and a form that waited for them would be a form that will not open
    // in the stockroom.
    loading: prices.isPending && enabled,
    prices: (prices.data ?? []) as readonly PriceInForce[],
    settings: (settings.data ?? null) as VariantSettingsRow | null,
    factors: unitFactorsFrom(units.data),
    edit,
    reprice,
    save,
    busy: mutation.isPending,
  };
}

// ============================================================================
// THE UNIT FACTORS, ON THEIR OWN. Plan task `5f-i`.
// ============================================================================

/**
 * `unit.factor_to_base` keyed by code — the map `@/offline/deadLetters` has
 * taken as an ARGUMENT since 2026-09-22 with nothing to hand it.
 *
 * ⚠️⚠️ THIS IS THE SECOND LINE `5f` OWED AND NOTHING COULD SEE UNTIL IT WAS
 * WRITTEN. `5c-iv-b` refused to hard-code `0001`'s ten rows into the dead-letter
 * banner, precisely so this app never grows a second answer to *how many grams
 * in a kilo* — and shipped `NO_UNIT_FACTORS`, an empty map, because the screen
 * that holds the real one did not exist. ⚠️ **Until it was passed, the banner
 * priced only a line quoted in its variant's own base unit** (factor exactly
 * `1`, by `0001`'s `unit_base_is_identity`) and withheld the peso figure for
 * every other one rather than understating it — `QueueValue.complete`. The count
 * was always right; the figure was simply absent.
 *
 * ⚠️ THE SAME `UNITS_KEY` READ, and that is the entire point of the hook
 * existing rather than the banner querying for itself. `staleTime: Infinity`
 * because the ten rows change only in a migration (`0001`: *"users pick from
 * this list; they never define their own factors"*).
 *
 * ⚠️ IT RETURNS AN EMPTY MAP WHILE THE READ IS IN FLIGHT OR FAILED, which is
 * exactly `NO_UNIT_FACTORS` and is the state the banner already handles. A hook
 * that threw would take down Inicio to price a banner nobody asked for.
 */
export function useUnitFactors(): UnitFactors {
  const { session, ready } = useAuth();
  const units = useQuery({
    queryKey: UNITS_KEY,
    queryFn: catalogUnits,
    enabled: ready && session !== null,
    staleTime: Infinity,
  });
  return unitFactorsFrom(units.data);
}
