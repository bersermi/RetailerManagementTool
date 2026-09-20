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
// ⚠️⚠️ AND THIS HALF WRITES NOTHING. `approve_request` is `5b-iii-d-2`, with
// the location picker `D8` refuses to leave empty. The bell shows who is
// waiting and the owner cannot yet let them in, which is deliberate and is what
// keeps this sitting falsifiable by one contract check over real HTTP.
//
// ⚠️ THE ORDER OF THE TWO LINES IS THE OWNER'S RULING OF 2026-09-19 AND IS THE
// INVERSE OF THE ROSTER'S. `linesOf` below is where it lives, and it lives
// there rather than in the screen ON PURPOSE — §2.11 keeps rendering out of
// scope, so a ruling spelled only in JSX is a ruling no instrument in this
// repository can see. As a pure function it is one the suite reads.
// ============================================================================

import { ROLES, nonBlank, type Role } from '@/api/members';

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
