// ============================================================================
// A PERSON DELETES THEIR OWN ACCOUNT, AS A CONTRACT WITH POSTGRES. Plan task
// `5R-c`, the owner's rulings of 2026-10-09, and `0053`'s `delete_my_account`.
// Same boundary as the other `src/api/` modules (ADR-035 §2.11, `R12`, `R13`):
// everything with a right answer is in here, and nothing that talks.
//
// ⚠️⚠️ WHAT THE SCREEN MUST KNOW BEFORE THE TAP, AND WHY IT IS COMPUTED HERE.
// The owner ruled that a SOLE owner's deletion deletes the shop — after a
// warning that names who loses access, an offer of the monthly export, and the
// shop's name typed to confirm — while anybody else simply leaves. So the one
// question the screen asks is *does this deletion take the shop with it?*, and
// `deletionFrom` answers it from the roster the sheet already reads. The server
// asks the same question again and refuses a sole owner whose typed name does
// not match (`TD007`), so a wrong answer here can show the wrong warning but can
// never delete a shop nobody confirmed.
//
// ⚠️ THE NAME COMPARISON MIRRORS `normalize_name` (`0001`): case and runs of
// whitespace fold, ACCENTS DO NOT. *Doña* typed as *Dona* is refused on both
// sides, which is the right answer for a confirmation — and `app/CLAUDE.md`
// already records that `normalize_name` does not fold accents.
// ============================================================================

import { apiErrorMessage } from '@/api/errors';
import type { RosterEntry } from '@/api/members';
import { ES } from '@/strings';

/** The RPC `0053` creates. */
export const DELETE_MY_ACCOUNT = 'delete_my_account';

/** `0053`'s refusal for a sole owner whose typed shop name does not match. */
export const NAME_MISMATCH_CODE = 'TD007';

/** The one argument, by the name PostgREST matches on. */
export interface DeleteArgs {
  readonly p_shop_name: string | null;
}

/** What the server answers: how many shops went, and how many were left. */
export interface Deleted {
  readonly shopsDeleted: number;
  readonly shopsLeft: number;
}

/**
 * What deleting this account does, read off the roster.
 *
 * `unknown` while the roster has not arrived or does not contain the caller —
 * the screen offers nothing until it knows which warning to show, because the
 * wrong one is the one that matters.
 */
export type Deletion =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'leaves' }
  | { readonly kind: 'deletesShop'; readonly losesAccess: readonly string[] };

/**
 * ⚠️ "SOLE" MEANS NO OTHER ACTIVE OWNER — `0053`'s own predicate. `rosterFrom`
 * has already dropped every inactive membership, so a former co-owner does not
 * count, and a manager never does: the shop is the owners'.
 */
export function deletionFrom(entries: readonly RosterEntry[], loading: boolean): Deletion {
  if (loading) return { kind: 'unknown' };
  const self = entries.find((entry) => entry.isSelf);
  if (self === undefined) return { kind: 'unknown' };
  if (self.role !== 'owner') return { kind: 'leaves' };
  const otherOwner = entries.some((entry) => !entry.isSelf && entry.role === 'owner');
  if (otherOwner) return { kind: 'leaves' };
  return {
    kind: 'deletesShop',
    losesAccess: entries.filter((entry) => !entry.isSelf).map((entry) => entry.identity.text),
  };
}

/** `normalize_name`, on this side of the wire: lower case, trimmed, one space. */
export function normalizedName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Does what she typed match the shop's name, the way the server will compare it? */
export function shopNameMatches(typed: string, shopName: string): boolean {
  const left = normalizedName(typed);
  return left !== '' && left === normalizedName(shopName);
}

/**
 * The arguments. ⚠️ The typed name travels only when the shop goes with the
 * account; anybody else sends `null`, and the server ignores it for them anyway.
 */
export function deleteArgs(deletion: Deletion, typed: string): DeleteArgs {
  return { p_shop_name: deletion.kind === 'deletesShop' ? typed : null };
}

/** The server's answer, or zeros for anything that is not the object `0053` returns. */
export function deletedFrom(data: unknown): Deleted {
  if (typeof data !== 'object' || data === null) return { shopsDeleted: 0, shopsLeft: 0 };
  const row = data as { shops_deleted?: unknown; shops_left?: unknown };
  return {
    shopsDeleted: typeof row.shops_deleted === 'number' ? row.shops_deleted : 0,
    shopsLeft: typeof row.shops_left === 'number' ? row.shops_left : 0,
  };
}

/** The Spanish sentence for a refused deletion. `TD007` is this call's own. */
export function deleteErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    if ((error as { code?: unknown }).code === NAME_MISMATCH_CODE) {
      return ES.account.errors.nameMismatch;
    }
  }
  return apiErrorMessage(error);
}

/**
 * What a former member is called wherever the shop's records name them:
 * *"María (ex-miembro)"*, or *"Ex-miembro"* when no name was ever stored.
 * ⚠️ NEVER THE UUID — `whoOf`'s rule.
 */
export function formerMemberName(name: string | null): string {
  const trimmed = name?.trim() ?? '';
  return trimmed === '' ? ES.account.formerAlone : ES.account.former(trimmed);
}
