// ============================================================================
// ASKING TO JOIN A SHOP, AS A CONTRACT WITH POSTGRES. Plan task 5b-iii-b, and
// the fifth module of `src/api/` on the pure side of the boundary — same shape
// as `workspace.ts`, `members.ts`, `invites.ts` and `redeem.ts` (ADR-035 §2.11,
// `R12`, `R13`): everything with a right answer is in here, and nothing that
// talks.
//
// ⚠️⚠️ IT IS THE PULL PATH, AND `redeem.ts` IS THE PUSH PATH. That is the seam,
// and it is the same one `invites.ts` / `redeem.ts` already draw one step
// earlier. A person holding a TOKEN was chosen by somebody: the membership is
// already decided and redeeming it writes the row. A person holding a shop's
// JOIN CODE chose the shop herself, and nobody has agreed to anything yet — so
// this path ends in a PENDING ROW and a wait, not a membership.
//
// ⚠️ SO THE TWO MODULES SHARE THE NORMALISER AND NOTHING ELSE. `request_access`
// takes `p_code`, `redeem_invite` takes `p_token`, and neither refusal means
// anything on the other's screen. `normalizeCredential` is IMPORTED from
// `redeem.ts` rather than copied, because there is exactly one
// `normalize_workspace_code` (`0027:175`) on the server and a second copy here
// would be two clients that can disagree about what a person typed — the defect
// this repository has recorded eleven times, in its cheapest form.
//
// ⚠️⚠️ AND THE SCREEN DECIDES BETWEEN THEM BY LENGTH, WHICH IS NOW A REAL FORK
// RATHER THAN A SENTENCE. Until this task, eight characters got
// `ES.join.issues.workspaceCode` — *"that is the shop's code, ask them to invite
// you"* — because the door it opens did not exist. `classifyCredential` has
// always returned `'code'` for it; what was missing was somewhere to send her.
// This module is that somewhere, and `checkCredential`'s branch and its string
// are deleted in the same pass, which is what `5b-ii-b-2` wrote down as this
// task's job.
// ============================================================================

import { ES } from '@/strings';
import { apiErrorMessage } from '@/api/errors';
import { ROLES, type Role } from '@/api/members';
import { normalizeCredential } from '@/api/redeem';

/** The two RPC names, written once each (`R13`). */
export const REQUEST_ACCESS = 'request_access';
export const MY_ACCESS_REQUESTS = 'my_access_requests';

/** The `p_` name `0029` declared, and the only place it is written (`R13`). */
export interface RequestAccessArgs {
  readonly p_code: string;
}

/**
 * TanStack Query's key for the joiner's own requests.
 *
 * ⚠️ IT IS ITS OWN KEY AND NOT PART OF `INVITES_KEY`, though both read rows of
 * `workspace_invite`. `INVITES_KEY` is the ROSTER's read — `workspace_invite`
 * under `workspace_invite_select`, manager-and-above, scoped to a shop the
 * caller is already in. This is the same table read through a `security
 * definer` function by somebody who is in NO shop. One key for the two would
 * mean a joiner's invalidation blanking an owner's roster, and an owner's
 * invalidation re-running a read that is meaningless for him.
 */
export const MY_REQUESTS_KEY = ['my-access-requests'] as const;

/** The code as `request_access`'s one argument, normalised on the way in. */
export function requestAccessArgs(raw: string): RequestAccessArgs {
  return { p_code: normalizeCredential(raw) };
}

// ----------------------------------------------------------------------------
// WHAT `request_access` ANSWERS WITH
// ----------------------------------------------------------------------------

/**
 * The four statuses `0029` can answer, and every one of them is a SUCCESS.
 *
 * ⚠️⚠️ TWO OF THESE MEAN SHE IS ALREADY IN THE SHOP, AND THE SCREEN MUST NOT
 * TREAT THEM AS AN ASK THAT WORKED.
 *
 *     requested          the row was written; she waits (the ordinary case)
 *     already_requested  she had asked before and the row is still live —
 *                        `0029`'s decision 5, and it is not an error
 *     already_member     she was already in this shop (`0029` §3): nothing to
 *                        ask for
 *     joined             ⚠️ `D7`: somebody had ALREADY INVITED her by email and
 *                        she typed the shop code instead of the token. `0029`
 *                        absorbs the pending invite and writes the membership
 *                        then and there — so this is a JOIN, and the guard must
 *                        move her exactly as a redemption does
 *
 * ⚠️ `joined` AND `already_member` ARE WHY `useRequestAccess` INVALIDATES THE
 * MEMBERSHIP READ ON EVERY SUCCESS and not only on the ones it expects. §2.7
 * puts it as *"someone already invited who then types the code is simply let in,
 * and is told none of it"* — and being told none of it requires the app to
 * notice.
 */
export const ACCESS_STATUSES = [
  'requested',
  'already_requested',
  'already_member',
  'joined',
] as const;

export type AccessStatus = (typeof ACCESS_STATUSES)[number];

/** `request_access`'s `jsonb`, as a value. */
export interface AccessOutcome {
  readonly status: AccessStatus;
  readonly workspaceId: string;
  readonly workspaceName: string;
  /** ⚠️ She is in the shop NOW — `joined` or `already_member`. See below. */
  readonly isMember: boolean;
}

/**
 * Which of the four statuses puts her INSIDE the shop.
 *
 * ⚠️ IT IS A FUNCTION OF THE STATUS AND NOT A FIELD `0029` RETURNS, because
 * `0029` does not return one — the two membership branches are told apart by
 * their status string and nothing else. Writing the rule here, once, is what
 * keeps the screen from re-deriving it.
 */
export function isInsideShop(status: AccessStatus): boolean {
  return status === 'joined' || status === 'already_member';
}

/**
 * `request_access`'s answer, parsed.
 *
 * ⚠️ IT THROWS ON A RESULT IT CANNOT PARSE rather than returning a partial, for
 * `redeemedFrom`'s reason and one more. A row HAS been written by the time this
 * runs — or a membership has — so a partial is a person who has asked and is
 * being told she has not, who then asks again. The second ask is idempotent
 * (`0029` decision 5) so the retry is free, which is what makes throwing the
 * honest answer rather than a destructive one.
 *
 * ⚠️ AN UNKNOWN STATUS THROWS TOO, and that is deliberate. A fifth branch added
 * to `0029` would otherwise arrive here as a silent `requested` — a person told
 * she is waiting for something that did not happen.
 */
export function outcomeFrom(data: unknown): AccessOutcome {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`${REQUEST_ACCESS} returned ${typeof data}, expected an object`);
  }
  const row = data as Record<string, unknown>;
  const status = row.status;
  const workspaceId = row.workspace_id;

  if (!(ACCESS_STATUSES as readonly string[]).includes(String(status))) {
    throw new Error(`${REQUEST_ACCESS} returned an unknown status: ${String(status)}`);
  }
  if (typeof workspaceId !== 'string' || workspaceId === '') {
    throw new Error(`${REQUEST_ACCESS} returned no workspace_id`);
  }

  return {
    status: status as AccessStatus,
    workspaceId,
    // ⚠️ THE NAME IS ALLOWED TO BE MISSING AND THE IDENTITY IS NOT, which is
    // `redeemedFrom`'s rule. Here the name is rendered — "you asked to join
    // <shop>" — so a blank one costs her the shop's name in one sentence, while
    // a missing workspace_id is an ask this app cannot account for.
    workspaceName: typeof row.workspace_name === 'string' ? row.workspace_name : '',
    isMember: isInsideShop(status as AccessStatus),
  };
}

// ----------------------------------------------------------------------------
// WHAT `my_access_requests` ANSWERS WITH — the only row she can ever see
// ----------------------------------------------------------------------------

/**
 * The four states a request can be in, as `0029:535` computes them.
 *
 * ⚠️ THE DATABASE COMPUTES THIS, NOT THE APP. `my_access_requests` derives the
 * status from `accepted_at`, `superseded_at` and `expires_at` in SQL — so the
 * app must not re-derive it from `expires_at`, which is the same clock
 * disagreement `0027` already refuses. The pilot store is offline a lot and a
 * phone's clock is not the database's.
 */
export const REQUEST_STATES = ['pending', 'approved', 'superseded', 'expired'] as const;

export type RequestState = (typeof REQUEST_STATES)[number];

/** One row of `my_access_requests`, as PostgREST returns it. */
export interface AccessRequestRow {
  readonly request_id: unknown;
  readonly workspace_id: unknown;
  readonly workspace_name: unknown;
  readonly status: unknown;
  readonly role: unknown;
  readonly requested_at: unknown;
  readonly decided_at: unknown;
  readonly expires_at: unknown;
}

/** One request, as the landing renders it. */
export interface AccessRequest {
  readonly requestId: string;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly state: RequestState;
  readonly role: Role;
  readonly requestedAt: string;
}

/**
 * The caller's own requests, parsed — and it DROPS what it cannot read rather
 * than throwing.
 *
 * ⚠️⚠️ THAT IS THE OPPOSITE OF `outcomeFrom` ABOVE, AND THE DIFFERENCE IS WHICH
 * WAY THE DAMAGE RUNS. `outcomeFrom` parses a WRITE: a row exists and she must
 * be told. This parses a READ of a list whose only purpose is to reassure her
 * that she asked — so an unreadable row costs a line on a screen, and a throw
 * costs her the whole screen, including the box she would use to ask again.
 *
 * ⚠️ AND AN EMPTY LIST IS THE ORDINARY CASE, NOT A FAILURE: every founding owner
 * who lands here has never asked anybody for anything.
 */
export function requestsFrom(rows: readonly AccessRequestRow[] | undefined): AccessRequest[] {
  if (rows === undefined) return [];
  const out: AccessRequest[] = [];
  for (const row of rows) {
    const requestId = row.request_id;
    const workspaceId = row.workspace_id;
    const state = row.status;
    const role = row.role;
    if (typeof requestId !== 'string' || requestId === '') continue;
    if (typeof workspaceId !== 'string' || workspaceId === '') continue;
    if (!(REQUEST_STATES as readonly string[]).includes(String(state))) continue;
    if (!(ROLES as readonly string[]).includes(String(role))) continue;
    out.push({
      requestId,
      workspaceId,
      workspaceName: typeof row.workspace_name === 'string' ? row.workspace_name : '',
      state: state as RequestState,
      role: role as Role,
      requestedAt: typeof row.requested_at === 'string' ? row.requested_at : '',
    });
  }
  return out;
}

/**
 * The one request the landing puts on screen, or `null`.
 *
 * ⚠️⚠️ ONE, NOT A LIST, AND THAT IS A DECISION ABOUT WHAT THIS SCREEN IS FOR.
 * `my_access_requests` returns every request this account has ever made, newest
 * first (`0029:558`) — including ones that were approved months ago in a shop
 * she has since left. The landing is not a history; it is the answer to *"did
 * my ask go through?"*, and it is only ever on screen for somebody who belongs
 * to no shop at all.
 *
 * ⚠️ SO IT TAKES THE NEWEST `pending` ONE AND NOTHING ELSE. An `approved`
 * request cannot be rendered here truthfully — if it were still live she would
 * be a member, and the guard would have moved her off this screen before this
 * read came back. `expired` and `superseded` are states she cannot act on
 * except by asking again, which is the box directly above.
 *
 * ⚠️ IT TRUSTS THE ORDER `0029` PROMISES rather than sorting on `requested_at`,
 * because the timestamp is a string here and the ordering is the function's
 * documented contract — `order by wi.created_at desc`. `docs/checks/5b-iii-b-
 * request-contract.sh` is what asserts the promise is still kept.
 */
export function pendingRequest(requests: readonly AccessRequest[]): AccessRequest | null {
  for (const request of requests) {
    if (request.state === 'pending') return request;
  }
  return null;
}

// ----------------------------------------------------------------------------
// WHAT SHE IS TOLD WHEN IT REFUSES
// ----------------------------------------------------------------------------

/**
 * ⚠️⚠️ `request_access` REFUSES AN UNKNOWN CODE WITH `42501`, AND `42501` IS
 * ALSO WHAT AN ABSENT SESSION LOOKS LIKE. THIS MODULE READS IT AS THE CODE, ON
 * THIS SCREEN ONLY, AND THAT IS A MEASURED JUDGEMENT RATHER THAN AN OVERSIGHT.
 *
 * `0029`'s own decision 10 took it deliberately — *"`42501` keeps its one
 * meaning, 'this is not yours', and covers the code that resolves to nothing"* —
 * and that reading is coherent inside the database. It is not coherent at the
 * client, because `@/api/errors` maps `42501` app-wide to `sessionEnded`, for
 * the equally good reason that the `authenticated` grant is what refuses a
 * caller with no session. So the same code arrives here meaning two things:
 *
 *     42501  no session at all — PostgREST refuses before the body runs, and
 *            `0029:190` raises `insufficient_privilege` from inside it too
 *     42501  `0029:212` — that code does not match a shop, or the shop is not
 *            active (decision 4 refuses those identically, on purpose)
 *
 * ⚠️ THE READING IS "THE CODE", AND THE ARGUMENT IS WHO IS STANDING THERE.
 * `/bienvenida` is behind `guard.ts`, which only routes a person here once a
 * session has loaded and the membership read has come back — so a caller on this
 * screen has a session. The wrong guess costs her one confusing sentence and the
 * next launch corrects it, because the guard sends a signed-out person to
 * `/entrar`. The other way round — telling a person with a mistyped code that
 * her session ended — leaves her signing in again, landing back here, retyping
 * the same wrong code and getting the same sentence forever.
 *
 * ⚠️⚠️ THIS IS EXACTLY THE ARRANGEMENT `5b-ii-b-2` SHIPPED FOR `redeem_invite`
 * AND `5b-iii-a` RETIRED, ONE RPC LATER. That one was safe for the same two
 * reasons and unsafe for the same one, and `0036` ended it by minting `TD005`.
 * The same fix applies here and it is a MIGRATION, which this task does not
 * ship — so it is routed, named, and MEASURED rather than assumed:
 * `docs/checks/5b-iii-b-request-contract.sh` drives an anonymous caller and a
 * nonsense code against a live database and asserts they still come back
 * indistinguishable. The day a code is minted, that assertion turns over and
 * this constant goes with it — a marker and the assertion that drives it retire
 * in the same pass, which is `5b-iii-a`'s rule.
 *
 * ⚠️ `TD003` NEEDS NO SUCH ARGUMENT. `0021`'s workflow code means one thing
 * here, as it does everywhere: ask again.
 */
export const UNKNOWN_CODE = '42501';

/**
 * The SQLSTATEs `request_access` refuses with. Values are KEYS of
 * `ES.join.requestErrors`, never sentences — `@/api/errors`'s discipline, so a
 * message typed at a call site is a typecheck failure (TS2820).
 *
 * ⚠️ `22023` IS `0029`'s *"this account has no email address"* — a phone-only
 * Supabase account, which `0029` calls a wall rather than a branch. C1.4 admits
 * Google and email and NO phone auth, so v1 cannot reach it; it is mapped
 * anyway, because an unmapped refusal falls to `unknown` and a person would be
 * told nothing at all about the one thing she could actually fix.
 */
export const REQUEST_REFUSALS: Readonly<Record<string, keyof typeof ES.join.requestErrors>> = {
  [UNKNOWN_CODE]: 'noSuchShop',
  '22023': 'noEmail',
  TD003: 'requestExpired',
};

/**
 * What the joiner is told when `request_access` refuses.
 *
 * ⚠️ IT IS HERE AND NOT IN `@/api/errors` FOR `redeemErrorMessage`'s REASON:
 * these are one RPC's refusals, not API-wide codes. The general path is still
 * `apiErrorMessage`, called below, so the offline sentence stays the one every
 * other screen gives — and offline is the pilot store's normal write path, so it
 * is the one that will actually be read.
 */
export function requestErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code in REQUEST_REFUSALS) {
      return ES.join.requestErrors[REQUEST_REFUSALS[code]];
    }
  }
  return apiErrorMessage(error);
}
