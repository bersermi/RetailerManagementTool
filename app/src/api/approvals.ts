// ============================================================================
// WHO IS WAITING TO BE LET IN, AS A CONTRACT WITH POSTGRES. Plan task
// `5b-iii-d-1`, and the SIXTH module of `src/api/` on the pure side of the
// boundary — the shape `workspace.ts`, `members.ts`, `invites.ts`, `redeem.ts`
// and `requests.ts` already hold (ADR-035 §2.11, `R12`, `R13`): everything with
// a right answer is in here, and nothing that talks.
//
// ⚠️⚠️ IT IS THE APPROVER'S HALF OF THE PULL PATH, AND `requests.ts` IS THE
// JOINER'S. One table, two readers, and neither can see the other's rows:
// `my_access_requests()` is keyed on `auth.uid()` inside the function and
// returns HER OWN row in every shop; `pending_access_requests(p_workspace_id)`
// is fenced on `has_role(…, 'owner')` inside the function and returns
// EVERYBODY'S row in ONE shop. They are separate modules for the reason they
// are separate functions — a person reading one is standing somewhere the other
// person never is.
//
// ⚠️⚠️ AND IT IS NOW BOTH HALVES OF THE LOOP, IN THAT ORDER. Everything above
// `THE ACT` is the QUEUE (`5b-iii-d-1`) and reads; everything below it is
// `approve_request` (`5b-iii-d-2`) and writes. The file holds both because they
// are one RPC pair over one table and one screen — and the seam is marked
// rather than implied, because the two halves obey OPPOSITE parse rules and
// `pendingFrom` / `approvedFrom` each say why at their own definition.
//
// ⚠️ THE ORDER OF THE TWO LINES IS THE OWNER'S RULING OF 2026-09-19 AND IS THE
// INVERSE OF THE ROSTER'S. `linesOf` below is where it lives, and it lives
// there rather than in the screen ON PURPOSE — §2.11 keeps rendering out of
// scope, so a ruling spelled only in JSX is a ruling no instrument in this
// repository can see. As a pure function it is one the suite reads.
// ============================================================================

import { apiErrorMessage } from '@/api/errors';
import {
  checkLocations,
  dedupe,
  locationsRequired,
  type LocationChoice,
} from '@/api/invites';
import { ROLES, nonBlank, type Role } from '@/api/members';
import { ES } from '@/strings';

/** The RPC's name, written once (`R13`). */
export const PENDING_ACCESS_REQUESTS = 'pending_access_requests';

/** The `p_` name `0037` declared, and the only place it is written (`R13`). */
export interface PendingRequestsArgs {
  readonly p_workspace_id: string;
}

/**
 * TanStack Query's key for the queue.
 *
 * ⚠️ IT IS ITS OWN KEY AND NOT PART OF `INVITES_KEY`, though both end up reading
 * rows of `workspace_invite`. `INVITES_KEY` is the roster's direct select under
 * `workspace_invite_select`; this is a `security definer` read that also carries
 * a name off `auth.users`, fenced at `owner` rather than at `manager`. One key
 * for the two would mean a manager's roster invalidation re-running a read she
 * is never shown, and — worse — an owner's queue being served out of a cache
 * filled by a query with a different fence on it.
 *
 * ⚠️ IT IS SCOPED UNDER `'workspace'` like the other three, so a future
 * `invalidateQueries({ queryKey: ['workspace'] })` sweeps it too.
 */
export const PENDING_REQUESTS_KEY = ['workspace', 'pending-requests'] as const;

/** The workspace id as `pending_access_requests`'s one argument. */
export function pendingRequestsArgs(workspaceId: string): PendingRequestsArgs {
  return { p_workspace_id: workspaceId };
}

/**
 * One row of `pending_access_requests`, as PostgREST returns it.
 *
 * ⚠️ EVERY FIELD IS `unknown`, WHICH IS `AccessRequestRow`'S RULE AND NOT A NEW
 * ONE: this is a wire shape, and a type that claims `string` is a claim
 * TypeScript cannot check about a response. `pendingFrom` is where it is
 * narrowed once.
 *
 * ⚠️ `expires_at` IS ON THE WIRE AND IS NOT CARRIED INTO `PendingRequest`, and
 * that is a decision rather than an omission. `0037`'s decision 3 returns only
 * rows with `expires_at > now()`, so the value is in the future for every row
 * this screen can ever hold — and a date that is always in the future tells an
 * approver nothing she can act on. The moment it passes, the row is ABSENT, not
 * greyed out. ⚠️ It is declared here anyway so that `R13`'s column list stays
 * the whole of what `0037` returns, in one place, for whoever needs it next.
 */
export interface PendingRequestRow {
  readonly request_id: unknown;
  readonly email: unknown;
  readonly requester_name: unknown;
  readonly role: unknown;
  readonly requested_at: unknown;
  readonly expires_at: unknown;
}

/**
 * One person waiting, as the approval screen renders her.
 *
 * ⚠️ `name` IS `string | null` AND THE NULL IS NOT AN ERROR STATE. `0034` made
 * `display_name` nullable on purpose and `auth_full_name` returns NULL — never
 * `''` — for an account whose provider sent no name (`0037`'s decision 4). The
 * entry is then an address with nothing beneath it, and a shopkeeper is told
 * none of it.
 */
export interface PendingRequest {
  readonly requestId: string;
  readonly email: string;
  readonly name: string | null;
  readonly role: Role;
  readonly requestedAt: string;
}

/**
 * Who may open the queue at all.
 *
 * ⚠️⚠️ IT IS A CLIENT-SIDE FENCE OVER A READ THAT DOES NOT REFUSE, which is
 * `canSeeRoster`'s arrangement and is here for a sharper version of the same
 * reason. `0037`'s decision 2 answers a non-owner with ZERO ROWS rather than
 * `42501` — deliberately, so that the path does not acquire a third meaning for
 * a SQLSTATE already carrying two — so an unfenced client would ask the
 * database a question whose answer it has already been told, on every open of
 * Inicio, on a connection the pilot store loses routinely. ⚠️ And it would then
 * render an empty queue as "nobody is waiting" to a manager who is simply not
 * allowed to know, which is the same conflation `useRoster` refuses by
 * returning `visible` instead of an empty list.
 *
 * ⚠️ `owner` AND NOT `manager`, matching `approve_request` (`0029`'s decision 6)
 * and `0037`'s own body predicate. A manager cannot approve, so a queue she
 * cannot act on is a list of strangers' names handed to somebody for no purpose
 * — §2.7's argument, and the owner took that trade on 2026-09-19 in its
 * narrowest form.
 *
 * ⚠️ IT IS THE INDEX INTO `ROLES` AND NOT `role === 'owner'`, so that a role
 * inserted above `owner` is admitted by editing that table rather than by
 * remembering this line exists — `canSeeRoster`'s rule, one rung tighter.
 */
export function canApprove(role: Role | null): boolean {
  if (role === null) return false;
  return ROLES.indexOf(role) <= ROLES.indexOf('owner');
}

/**
 * The queue, parsed — and it DROPS what it cannot read rather than throwing.
 *
 * ⚠️ `requestsFrom`'S RULE, FOR `requestsFrom`'S REASON: this parses a READ of a
 * list, so an unreadable row costs one entry on a screen while a throw costs the
 * whole screen — including the entries that were fine. The opposite rule applies
 * to `outcomeFrom` and `issuedFrom`, which parse WRITES that have already
 * happened.
 *
 * ⚠️⚠️ AN EMPTY LIST IS THE ORDINARY CASE AND NOT A FAILURE. It is what an owner
 * sees on every day nobody has typed his code, which is most days — and it is
 * ALSO what `0037`'s decision 2 hands a non-owner. Those two are told apart
 * BEFORE the call, by `canApprove`, and never from the row count: a fence that
 * looked like an empty list is the vacuous-green shape `0035` 5.2 records.
 *
 * ⚠️ THE ORDER `0037` PROMISES IS TRUSTED RATHER THAN RE-SORTED — `order by
 * wi.created_at desc`, newest first, because the person who just typed the code
 * is the one standing at the counter. `requested_at` is a string here and the
 * pilot store's phone clock is not the database's, so sorting on it at the
 * client is the clock disagreement `0027` already refuses.
 * `docs/checks/5b-iii-d-1-approvals-contract.sh` is what asserts the promise is
 * still kept.
 */
export function pendingFrom(rows: readonly PendingRequestRow[] | undefined): PendingRequest[] {
  if (rows === undefined) return [];
  const out: PendingRequest[] = [];
  for (const row of rows) {
    const requestId = row.request_id;
    const email = row.email;
    const role = row.role;
    if (typeof requestId !== 'string' || requestId === '') continue;
    // ⚠️ THE EMAIL IS REQUIRED AND THE NAME IS NOT, and that is the ruling
    // expressed as a parse: the address is the header, so a row without one has
    // nothing to be headed by. `0029` refuses to write a request for an account
    // with no email at all (`22023`), so this is unreachable rather than rare —
    // and an entry whose header was blank would be a row an approver cannot
    // match against the person in front of her.
    if (typeof email !== 'string' || nonBlank(email) === undefined) continue;
    if (!(ROLES as readonly string[]).includes(String(role))) continue;
    out.push({
      requestId,
      email: email.trim(),
      // `nonBlank` and not `!== null`: one normalisation rule for this column,
      // shared with the roster rather than copied.
      name: typeof row.requester_name === 'string' ? nonBlank(row.requester_name) ?? null : null,
      role: role as Role,
      requestedAt: typeof row.requested_at === 'string' ? row.requested_at : '',
    });
  }
  return out;
}

/**
 * The two lines of one entry, in the order the owner ruled on 2026-09-19:
 * *"Show the Email as a Header and the Name as a subtitle of the request."*
 *
 * ⚠️⚠️ IT IS A FUNCTION AND NOT TWO JSX ELEMENTS, AND THAT IS THE WHOLE POINT.
 * §2.11 keeps rendering out of scope, so there is no suite in this repository
 * that would notice a screen quietly swapping these two round — and this
 * repository's plan says in several places that a ruling about a screen has
 * nowhere to live but a paragraph. Here it has somewhere: `app/test/api-
 * approvals.test.ts` reads it, and a swap is a failing assertion rather than a
 * sentence somebody has to re-read.
 *
 * ⚠️ THE ORDER IS THE INVERSE OF THE ROSTER'S ONE SCREEN OVER, where the name is
 * the title. That is not an inconsistency: on the roster you already know
 * everybody and are looking them up by name, and on an approval you are matching
 * a stranger against an address somebody read out to you — so the address is the
 * thing being VERIFIED and the name is what stops you admitting the wrong Juan.
 *
 * ⚠️ `subtitle` IS `null` AND NEVER A PLACEHOLDER when there is no name. The
 * entry is an address with nothing under it; a shopkeeper is never handed an
 * explanation of why, because it is the identity ladder's own floor and it is
 * ours to absorb, not hers to read.
 */
export function linesOf(entry: PendingRequest): {
  readonly header: string;
  readonly subtitle: string | null;
} {
  return { header: entry.email, subtitle: entry.name };
}

// ============================================================================
// THE ACT. Plan task `5b-iii-d-2`, and it is the half of this screen that
// WRITES — the only write in `5b-iii-d`, and the reason that task was split in
// two on 2026-09-19.
//
// ⚠️⚠️ `D8` IS THE WHOLE OF WHY THE PICKER EXISTS, AND NO SUITE IN THIS
// REPOSITORY CAN SEE IT. An approved staff member with no location writes
// NOTHING: `member_location` is what `my_locations()` reads, RLS refuses every
// write that falls outside it, and it refuses SILENTLY — so on a phone it looks
// exactly like the app being broken, to somebody who has no way to find out
// otherwise (ADR-035 §2.7 `D8`). §2.11 keeps rendering out of scope, so a
// control that quietly defaulted to an empty set would be caught by nothing
// here. `checkApproval` is that rule as a value the suite can read, and
// `0029:407` is the server raising `22023` for it if this ever lets one past.
//
// ⚠️ IT WRITES TWO TABLES AND BOTH INSERT POLICIES ARE OWNER-ONLY (`0001`),
// which is why `canApprove` is fenced at `owner` and not at `manager` — asymmetric
// with `canInvite` one screen over, on purpose, and `0029`'s decision 6 is the
// argument.
//
// ⚠️ IT SHIPS NO MIGRATION. `approve_request` has been applied since `0029`.
// ============================================================================

/** The RPC's name, written once (`R13`). */
export const APPROVE_REQUEST = 'approve_request';

/** The two `p_` names `0029` declared, and the only place they are written (`R13`). */
export interface ApproveRequestArgs {
  readonly p_request_id: string;
  readonly p_location_ids: readonly string[];
}

/**
 * The entry and the stores ticked for her — what the row's controls collect.
 *
 * ⚠️ IT CARRIES THE WHOLE ENTRY AND NOT JUST AN ID, because the ROLE is what
 * decides whether a location is required and the role is the requester's, not
 * something this screen chooses. `0029:407` reads it off the ROW for the same
 * reason — its decision 7, *"on the ROW's role, not on a constant"* — and a
 * client that kept its own copy would be a second answer to a question the
 * database already answers.
 */
export interface ApprovalDraft {
  readonly entry: PendingRequest;
  readonly locationIds: readonly string[];
}

/** The draft as a `LocationChoice`, which is all `D8` ever needed. */
export function choiceOf(draft: ApprovalDraft): LocationChoice {
  return { role: draft.entry.role, locationIds: draft.locationIds };
}

/**
 * The draft as `approve_request`'s two arguments.
 *
 * ⚠️ A MANAGER APPROVAL SENDS `[]` WHATEVER WAS TICKED, which is
 * `createInviteArgs`' rule for `createInviteArgs`' reason: `0029:434` overwrites
 * it — *"a manager or owner is granted every location by role, and a row here
 * would outlive a demotion"* — so sending one would be this app asking for
 * something the database then discards, and two rows nobody can explain later.
 *
 * ⚠️⚠️ AND THE NON-STAFF BRANCH IS UNREACHABLE ON THIS PATH TODAY, WHICH IS
 * WRITTEN DOWN RATHER THAN DISCOVERED AGAIN. `request_access` takes no role
 * argument — `0029`'s `S4`, because a role argument is a way to claim somebody
 * else's invite — and it inserts without naming the column, so
 * `workspace_invite.role`'s default of `'staff'` (`0002:374`) decides. EVERY
 * entry this screen can show is therefore staff, and `D8`'s picker is never
 * skipped. The branch is kept because `0029:434` keeps the mirror of it, and
 * assertion 9 of `docs/checks/5b-iii-d-2-approve-contract.sh` goes red the day
 * that stops being true — which is the day this branch stops being dead.
 *
 * ⚠️ IT DEDUPLICATES because `0029:410` does `array_agg(distinct l)` and
 * `member_location`'s primary key would refuse the copy. One normalisation, on
 * the way in, agreeing with the one in the body — `dedupe` is shared with the
 * invite path rather than written twice.
 */
export function approveArgs(draft: ApprovalDraft): ApproveRequestArgs {
  return {
    p_request_id: draft.entry.requestId,
    p_location_ids: locationsRequired(draft.entry.role) ? dedupe(draft.locationIds) : [],
  };
}

/** Why this screen will not send the approval yet. Keys of `ES.approvals.issues`. */
export type ApprovalIssueKey = keyof typeof ES.approvals.issues;

/**
 * ⚠️⚠️ THE FENCE THAT REFUSES TO BE EMPTY, AND IT IS THE ONE DECISION IN THIS
 * TASK NO INSTRUMENT IN THIS REPOSITORY CAN SEE ON A SCREEN.
 *
 * `0029:407` raises `22023` for a staff approval with no location and the
 * migration's own comment says why: *"Staff write only where `member_location`
 * puts them, and RLS refuses the rest silently."* This is that refusal said in
 * Spanish BEFORE the call is made — not because the round trip is expensive, but
 * because a shopkeeper who has ticked nothing should be told which box is empty
 * rather than handed a SQLSTATE's translation.
 *
 * ⚠️ THE PREDICATE IS `checkLocations` AND IS NOT WRITTEN HERE. It is the same
 * rule `checkInvite` asks, because `create_invite` and `approve_request` are the
 * two writers of `member_location` and `D8` is about that table, not about
 * either RPC. A second copy is the defect this repository has recorded six of.
 *
 * ⚠️ `locationCount` IS HOW "NOTHING IS ASKED IN A ONE-STORE SHOP" IS EXPRESSED,
 * `checkInvite`'s arrangement: C1.5 says both pilot shops have exactly one
 * location, so the picker is never rendered there and `resolveLocations` fills
 * it in. A staff approval with nothing ticked is therefore only an ERROR in a
 * shop that had a choice to make.
 */
export function checkApproval(
  draft: ApprovalDraft,
  context: { readonly locationCount: number },
): ApprovalIssueKey | null {
  return checkLocations(choiceOf(draft), context);
}

/**
 * What `approve_request` answers with.
 *
 * ⚠️ `alreadyApproved` IS A SUCCESS AND NOT AN ERROR, which is
 * `already_redeemed`'s rule one module over and matters more here: the pilot
 * store is offline a lot, a tap that appears to do nothing is tapped again, and
 * `0029:381` answers the second one with the membership rather than raising. A
 * screen that invented a refusal the database does not have would be telling a
 * shopkeeper her own successful approval failed.
 */
export interface Approved {
  readonly requestId: string;
  readonly memberId: string | null;
  readonly role: Role;
  /** How many `member_location` rows were written. `0` for a manager, by design. */
  readonly locationCount: number;
  readonly alreadyApproved: boolean;
}

/**
 * `approve_request`'s `jsonb` as the screen's value.
 *
 * ⚠️⚠️ IT THROWS RATHER THAN RETURNING A PARTIAL, AND THAT IS THE OPPOSITE OF
 * `pendingFrom` TWENTY LINES UP — deliberately, and this file now holds both
 * rules because it holds both kinds of call. `pendingFrom` parses a READ of a
 * list, where an unreadable row costs one entry; this parses a WRITE that has
 * already happened, where a partial would be a screen quietly claiming an
 * outcome it could not read. `issuedFrom` and `outcomeFrom` are the precedent.
 *
 * ⚠️ AND THE THROW IS SAFE TO RETRY, which is not true of `issuedFrom`. A token
 * that cannot be parsed is lost forever; an approval that cannot be parsed has
 * still been WRITTEN, and the next tap answers `already_approved`. That is what
 * makes "refuse and let her tap again" the honest handling rather than a gamble.
 *
 * ⚠️ `member_id` IS `string | null` BECAUSE THE IDEMPOTENT BRANCH CAN HAVE NO
 * ROW TO NAME. `0029:376` looks the membership up by `requested_by`, and a
 * request stamped `accepted_at` whose member row was later deleted comes back
 * with `null` there. Nothing on this screen renders it; it is parsed so that the
 * shape stays the whole of what `0029` returns, in one place (`R13`).
 */
export function approvedFrom(data: unknown): Approved {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`${APPROVE_REQUEST} returned ${typeof data}, expected an object`);
  }
  const row = data as Record<string, unknown>;
  const requestId = row.request_id;
  const role = row.role;

  if (typeof requestId !== 'string' || requestId === '') {
    throw new Error(`${APPROVE_REQUEST} returned no request_id`);
  }
  if (!(ROLES as readonly string[]).includes(String(role))) {
    throw new Error(`${APPROVE_REQUEST} returned an unknown role: ${String(role)}`);
  }

  return {
    requestId,
    memberId: typeof row.member_id === 'string' && row.member_id !== '' ? row.member_id : null,
    role: role as Role,
    // ⚠️ ABSENT IS `0`, AND THE IDEMPOTENT BRANCH IS WHERE THAT HAPPENS:
    // `0029:381` returns no `location_count` at all, because the second tap
    // wrote nothing. Treating a missing count as unknown would put a hedge on a
    // screen for the ordinary case on a bad connection.
    locationCount: typeof row.location_count === 'number' ? row.location_count : 0,
    // ⚠️ ABSENT IS `false`, NOT UNKNOWN — `issuedFrom`'s rule for
    // `replaced_pending`. The field is always in `0029`'s result on both paths.
    alreadyApproved: row.already_approved === true,
  };
}

/**
 * ⚠️⚠️ THE REQUEST IS GONE, AND `0029` RAISES ONE CODE FOR BOTH WAYS IT CAN BE.
 *
 * `TD003` is raised for a request that EXPIRED (`0029:401`) and for one
 * SUPERSEDED by a newer ask (`0029:396`). They are one sentence on this screen
 * because they are one act for the shopkeeper: the row in front of her is stale,
 * and what fixes it is the person asking again. Splitting them would mean
 * explaining our own bookkeeping to somebody who cannot act on the difference.
 *
 * ⚠️ IT IS THE SAME SQLSTATE `@/api/redeem` AND `@/api/requests` ALREADY READ,
 * and that is the argument FOR a workflow code rather than against it: `TD003`
 * means one thing — *this credential is no longer live* — on all three paths,
 * which is exactly what `42501` does not do.
 */
export const REQUEST_GONE = 'TD003';

/**
 * ⚠️ THE STORE IS NOT THIS SHOP'S. `0029:415` raises `22023` when a ticked
 * location does not belong to the workspace or is inactive, and ALSO for the
 * empty staff array `checkApproval` refuses locally. Reaching here therefore
 * means the phone let something through — `checkInvite`'s recorded argument
 * about the same code — so the sentence names the store rather than the tick.
 */
export const BAD_LOCATION = '22023';

function codeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

/** Did the database refuse this because the request is no longer live? */
export function isRequestGone(error: unknown): boolean {
  return codeOf(error) === REQUEST_GONE;
}

/**
 * What the shopkeeper is told when `approve_request` refuses.
 *
 * ⚠️⚠️ `42501` IS DELIBERATELY LEFT TO `apiErrorMessage`, AND THIS SCREEN IS THE
 * ONE PLACE IN THIS APP WHERE THAT IS THE RIGHT ANSWER RATHER THAN A GUESS.
 * `0029` raises it twice — for a request that is not this caller's to approve
 * (`0029:369`), and for a caller with no session at all (`0029:346`) — and BOTH
 * of the first kind are unreachable from this screen: `0037` hands a non-owner
 * an EMPTY LIST, so there is no row to tap, and `canApprove` never opens the
 * queue for one. What is left is the session, and *"tu sesión se cerró"* is
 * exactly what that is. ⚠️ So the `request_access` overload parked in the
 * decisions block does NOT acquire a second guessing client here; `/bienvenida`
 * remains the only module reading that code for a meaning it cannot verify.
 *
 * ⚠️ AND THE TWO SENTENCES BELOW ARE `ES.approvals`' AND NOT `ES.api.errors`' —
 * `inviteErrorMessage`'s rule and its reason: that table's values are keys, so a
 * sentence typed at a call site is a typecheck failure, and these are one RPC's
 * refusals rather than an API-wide code. The offline and session-ended sentences
 * stay the ones every other screen gives.
 */
export function approveErrorMessage(error: unknown): string {
  if (isRequestGone(error)) return ES.approvals.errors.gone;
  if (codeOf(error) === BAD_LOCATION) return ES.approvals.errors.location;
  return apiErrorMessage(error);
}
