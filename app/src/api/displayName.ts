// ============================================================================
// A PERSON FIXES HER OWN NAME, AS A CONTRACT WITH POSTGRES. Plan task
// `5b.8-iii-b`, and the fifth module of `src/api/` on the pure side of the
// boundary — same shape as `workspace.ts`, `members.ts`, `invites.ts` and
// `redeem.ts` (ADR-035 §2.11, `R12`, `R13`): everything with a right answer is
// in here, and nothing that talks.
//
// ⚠️⚠️ IT IS A SEPARATE MODULE FROM `members.ts` AND THAT IS THE SEAM, NOT A
// FILING PREFERENCE. `members.ts` is the ROSTER — two reads, a join PostgREST
// cannot do, and a fence that is MANAGER-AND-ABOVE by the owner's ruling of
// 2026-09-18. This is one WRITE, by EVERYBODY, about the one row that describes
// the person making it. The cashier who may never open the roster is exactly the
// caller this module exists for, so the two cannot share a fence and do not
// share a file. It is `redeem.ts`'s split from `invites.ts` for `redeem.ts`'s
// reason: a different actor, not a different verb.
//
// ⚠️ AND IT KEEPS `members.ts`'s HEADER TRUE. That file says *"NOTHING HERE
// WRITES A MEMBERSHIP"* — the seam `5b-ii` was split on. `set_my_display_name`
// writes `workspace_member`, so putting it there would have falsified the
// sentence in the same commit. What IS borrowed is `nonBlank`, imported below
// rather than restated, because one column may not have two normalisers.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ `42501` MEANS SOMETHING DIFFERENT ON THIS CALL THAN IT DOES ANYWHERE ELSE
// IN THIS APP, AND SO DOES `23514`. BOTH ARE OVERLOADED, AND BOTH MATTER.
// ----------------------------------------------------------------------------
// `@/api/errors` maps them app-wide and both mappings are WRONG here:
//
//     23514  → `nameMissing` = *"Escribe el nombre de tu tienda."* That is the
//              SHOP's name (`0027` raises it on a blank shop name). `0035`
//              raises the same SQLSTATE for a blank PERSON's name, and telling
//              a cashier to write her shop's name is the app talking about a
//              screen she is not on.
//     42501  → `sessionEnded` = *"Tu sesión se cerró."* `0035` raises it TWICE,
//              for two different events: an unauthenticated caller (session
//              really is gone) and a caller who is not an ACTIVE member of the
//              shop she named. The plan row for `5b.8-iii-a` named this
//              distinction as this task's job: *"sign in again"* is not *"this
//              is not your shop."*
//
// ⚠️⚠️ THE TWO `42501`s ARE TOLD APART BY A MARKER IN THE SERVER'S PROSE, WHICH
// IS NORMALLY A DEFECT IN THIS REPOSITORY AND IS THE SAME COMPROMISE
// `invites.ts` MADE. There is no distinguishing SQLSTATE, because `0035` raises
// `insufficient_privilege` for both — and PostgREST raises it a third time, for
// a caller whose grant does not admit her at all. So:
//
//     the marker is present  → she is not in this shop any more
//     the marker is absent   → the session is what failed, which is the
//                              catch-all `@/api/errors` already gives
//
// ⚠️ THE DEFAULT IS DELIBERATELY THE SESSION ONE, and the reason is which wrong
// guess costs more. Getting it wrong towards "sign in again" costs a person one
// confusing sentence and the next launch corrects it; getting it wrong towards
// "you are not in this shop" tells somebody standing behind her own till that
// she has been removed from it. That is `redeem.ts`'s argument about the same
// SQLSTATE, resolved the other way because a different person is standing there.
//
// ⚠️ THE HONEST FIX IS A SQLSTATE OF ITS OWN — `TD001` (`4b-i`) and `TD003`
// (`0021`) are codes this project has minted before — and that is a MIGRATION,
// which `app/**` never ships. ⚠️ `docs/checks/5b.8-iii-b-name-contract.sh`,
// assertion 7, DRIVES that refusal against a real database and goes red if the
// message stops carrying the marker, which is the only thing that makes a prose
// match safe. THE MARKER AND THAT ASSERTION RETIRE TOGETHER the day a code is
// minted for it.
// ============================================================================

import { ES } from '@/strings';
import { apiErrorMessage } from '@/api/errors';
import { nonBlank } from '@/api/members';

/** The RPC's name, written once (`R13`). */
export const SET_MY_DISPLAY_NAME = 'set_my_display_name';

/**
 * The two `p_` names `0035` declared, and the only place either is written
 * (`R13`).
 *
 * ⚠️ PostgREST MATCHES A FUNCTION BY ITS PARAMETER NAMES. A drift here is not a
 * type error and not a wrong answer — it is `PGRST202`, HTTP 404, which
 * typechecks, bundles and reaches a person as a button that does nothing.
 * `docs/checks/5b.8-iii-b-name-contract.sh` reads these two names out of this
 * interface and puts them in front of the applied function.
 */
export interface SetMyDisplayNameArgs {
  readonly p_workspace_id: string;
  readonly p_display_name: string;
}

/**
 * ⚠️ THE MARKER IN `0035`'s REFUSAL THAT SEPARATES THE TWO `42501`s. It is a
 * SUBSTRING of *"you are not an active member of this shop"* and deliberately
 * not the whole sentence: the check asserts this exact string against the live
 * message, so the shorter it is the more of the sentence a migration may reword
 * without a false red — and the more of it that must change before the match
 * silently stops meaning anything.
 */
export const NOT_A_MEMBER_MARKER = 'not an active member';

/** Why this app will not send what she typed. Keys of `ES.myName.issues`. */
export type NameIssueKey = keyof typeof ES.myName.issues;

/**
 * Is this something `set_my_display_name` can be called with?
 *
 * ⚠️ IT REFUSES EXACTLY WHAT THE DATABASE REFUSES AND NOT ONE THING MORE. `0035`
 * trims and then rejects the empty string; that is the whole rule, so that is
 * the whole check. ⚠️ THERE IS NO LENGTH LIMIT HERE ON PURPOSE: the column is
 * `text` with a not-blank CHECK and nothing else, and a client rule stricter
 * than the database is a client that refuses a name Postgres would have stored.
 * That defect has a name in this directory — `5b-ii-b-1`'s check says it about
 * `locationMissing` — and it is invisible to every suite, because the app and
 * its own tests would agree.
 *
 * ⚠️ A NAME THAT IS TOO LONG FOR THE ROSTER IS A LAYOUT PROBLEM AND IS TREATED
 * AS ONE (`R9`): the row wraps. It is not a refusal.
 */
export function checkDisplayName(typed: string): NameIssueKey | null {
  return nonBlank(typed) === undefined ? 'missing' : null;
}

/**
 * What she typed, as `0035`'s two arguments.
 *
 * ⚠️ IT SENDS THE TRIMMED FORM, and that is not the database's job being done
 * twice. `0035` trims inside the function, so the stored value is identical
 * either way — what this buys is that the string this app CHECKED is the string
 * it SENT, which is `redeemArgs`'s rule about normalising a credential for the
 * same reason. The alternative is a draft that `checkDisplayName` passed and the
 * wire carried something else.
 *
 * ⚠️ `nonBlank` RETURNS `undefined` FOR A BLANK AND THIS COERCES TO `''`, which
 * is the one string `0035` is guaranteed to refuse. The screen calls
 * `checkDisplayName` first, so this path is unreachable from the sheet; it is
 * written this way so that a caller who forgets gets `23514` from Postgres
 * rather than the literal word `undefined` stored as somebody's name.
 */
export function setMyDisplayNameArgs(
  workspaceId: string,
  typed: string,
): SetMyDisplayNameArgs {
  return { p_workspace_id: workspaceId, p_display_name: nonBlank(typed) ?? '' };
}

/**
 * `set_my_display_name`'s `text` as a value.
 *
 * ⚠️⚠️ IT IS THE STORED NAME AND THAT IS THE ENTIRE REASON THE FUNCTION RETURNS
 * ONE — `0035`'s decision 2, recorded when the RPC was applied: *"the client
 * renders what came back instead of what it sent, so a screen cannot diverge
 * from the database by a space nobody can see."* The sheet renders THIS, never
 * the contents of its own text box.
 *
 * ⚠️ IT THROWS ON A RESULT IT CANNOT PARSE rather than returning what was typed.
 * A fallback to the input is exactly the divergence the return value exists to
 * prevent, and it would be silent: the person would see her correction, the shop
 * would see the old name, and nothing anywhere would disagree out loud.
 */
export function storedNameFrom(data: unknown): string {
  if (typeof data !== 'string' || data === '') {
    throw new Error(`${SET_MY_DISPLAY_NAME} returned ${typeof data}, expected the stored name`);
  }
  return data;
}

/**
 * What she is told when `set_my_display_name` refuses.
 *
 * ⚠️ IT IS HERE AND NOT IN `@/api/errors` FOR `redeemErrorMessage`'s REASON, and
 * the header above is the argument: both codes this function raises mean
 * something different on this call than they do app-wide. The general path is
 * still `apiErrorMessage`, called below, so offline stays the one sentence every
 * screen gives — and offline is the pilot store's normal write path, so it is
 * the one that will actually be read.
 */
export function nameErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: unknown }).message;
    if (code === '23514') return ES.myName.errors.nameMissing;
    if (code === '42501' && typeof message === 'string' && message.includes(NOT_A_MEMBER_MARKER)) {
      return ES.myName.errors.notAMember;
    }
  }
  return apiErrorMessage(error);
}
