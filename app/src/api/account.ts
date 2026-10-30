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
//
// ⚠️⚠️ `10.4b-i` (`0073`), THE OWNER'S RULING OF 2026-10-29: WHAT GOES WITH THE
// ACCOUNT IS EVERY BUSINESS SHE IS THE ONLY OWNER OF — A SHOP OR, SINCE `0072`, A
// KITCHEN IN WERA COCINA — and not the shop open here. When it is more than that
// shop, the screen names every one and she types each one's name. So the
// question is answered from ONE read of her owner memberships across all her
// businesses (`businessesThatGo`), and the roster only says who loses access to
// the shop open here. A one-shop deletion is drawn and sent exactly as before.
// ============================================================================

import { apiErrorMessage } from '@/api/errors';
import type { RosterEntry } from '@/api/members';
import { ES } from '@/strings';

/** The RPC `0053` creates. */
export const DELETE_MY_ACCOUNT = 'delete_my_account';

/** `0053`'s refusal for a sole owner whose typed shop name does not match. */
export const NAME_MISMATCH_CODE = 'TD007';

/** The arguments, by the names PostgREST matches on. */
export interface DeleteArgs {
  /** `0053`'s one argument, and what every Wera build before `0073` sends alone. */
  readonly p_shop_name: string | null;
  /**
   * `0073`: one typed name for each business that goes with the account. ⚠️
   * ABSENT — not `null` — on every other deletion, so a one-shop deletion's body
   * is the one every build has always sent, byte for byte.
   */
  readonly p_business_names?: readonly string[];
}

/**
 * ⚠️⚠️ THE READ THAT SAYS WHAT GOES WITH THE ACCOUNT (`10.4b-i`): every active
 * owner of every business she belongs to, with that business's name and kind.
 * `workspace_member_select` (`0001`) already lets her read every membership of
 * her own businesses, and the embed reads `workspace`, which `workspace_select`
 * lets her read for the same ones. ⚠️ NOT FILTERED BY KIND, unlike
 * `myWorkspaces()`: a kitchen goes with the account as a shop does.
 * `docs/checks/5R-c-account-deletion-contract.sh` reads these three out of this
 * file and asks a real PostgREST the same question.
 */
export const OWNERS_TABLE = 'workspace_member';
export const OWNER_COLUMNS = 'workspace_id,user_id,workspace(display_name,kind)';
export const OWNER_ROLE = 'owner';

/** The query key the read caches under. Never persisted: a deletion needs the network anyway. */
export const ACCOUNT_OWNERS_KEY = ['account', 'owners'] as const;

/** One owner of one business, as PostgREST sends it. */
export interface OwnerRow {
  readonly workspace_id: string;
  readonly user_id: string;
  readonly workspace: { readonly display_name: string; readonly kind: string } | null;
}

/** Which app opens a business (`0072`'s `workspace_kind`). */
export type BusinessKind = 'tienda' | 'cocina';

/** A business that goes with the account. */
export interface Business {
  readonly id: string;
  readonly name: string;
  readonly kind: BusinessKind;
}

/**
 * Every business she is the only active owner of — `0053`'s own predicate, of
 * either kind — shops first, then kitchens. `null` while the read is out.
 *
 * ⚠️ A BUSINESS OF HERS WHOSE NAME CANNOT BE READ MAKES THE ANSWER `null`, never
 * a guess: the server will ask for that name, and a screen that cannot show it
 * cannot ask her for it.
 */
export function businessesThatGo(
  rows: readonly OwnerRow[] | null | undefined,
  selfUserId: string | null,
): readonly Business[] | null {
  if (rows === null || rows === undefined || selfUserId === null) return null;
  const byBusiness = new Map<string, { owners: Set<string>; row: OwnerRow }>();
  for (const row of rows) {
    const seen = byBusiness.get(row.workspace_id);
    if (seen === undefined) byBusiness.set(row.workspace_id, { owners: new Set([row.user_id]), row });
    else seen.owners.add(row.user_id);
  }
  const goes: Business[] = [];
  for (const [id, { owners, row }] of byBusiness) {
    if (!owners.has(selfUserId) || owners.size !== 1) continue;
    if (row.workspace === null) return null;
    goes.push({
      id,
      name: row.workspace.display_name,
      kind: row.workspace.kind === 'cocina' ? 'cocina' : 'tienda',
    });
  }
  return goes.sort(compareBusinesses);
}

function compareBusinesses(a: Business, b: Business): number {
  if (a.kind !== b.kind) return a.kind === 'tienda' ? -1 : 1;
  return a.name.localeCompare(b.name);
}

/**
 * ⚠️⚠️ THE ONE THING THIS APP REACHES THAT IS NOT POSTGRES (`5R-k`, the owner's
 * ruling of 2026-10-13, ADR-035's amendment of that day). Apple asks to be
 * told when a person who signed in with Apple deletes their account, and only
 * something holding Apple's private key can tell it. That is the Edge Function
 * `supabase/functions/apple-revoke`: it is handed the code Apple's sheet just
 * gave, trades it and revokes, and keeps nothing.
 *
 * Its name, the one key of its body and where it runs are written here for
 * `R13`'s reason, and `docs/checks/5R-k-apple-revoke-contract.sh` reads them
 * out of this file and puts them in front of the real function.
 */
export const APPLE_REVOKE = 'apple-revoke';

/**
 * ⚠️ PINNED TO THE DATABASE'S REGION. An Edge Function otherwise runs wherever
 * is nearest the phone, and the aviso tells people their data is handled in
 * the United States (`site/privacidad/`, section 5).
 */
export const APPLE_REVOKE_REGION = 'us-west-2';

/** A deletion waits this long for Apple and then goes ahead without it. */
export const APPLE_REVOKE_TIMEOUT_MS = 15000;

/** The function's body, by the key it reads. */
export interface RevokeBody {
  readonly code: string;
}

export function revokeBody(code: string): RevokeBody {
  return { code };
}

/** What the server answers: how many shops went, and how many were left. */
export interface Deleted {
  readonly shopsDeleted: number;
  readonly shopsLeft: number;
}

/**
 * What deleting this account does.
 *
 * `unknown` while a read it needs has not arrived — the screen offers nothing
 * until it knows which warning to show, because the wrong one is the one that
 * matters.
 */
export type Deletion =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'leaves' }
  /** The shop open here goes, and nothing else: `5R-c`'s screen, unchanged. */
  | { readonly kind: 'deletesShop'; readonly shop: Business; readonly losesAccess: readonly string[] }
  /**
   * `0073`: more goes than the shop open here — a kitchen too, or a business
   * that is not this shop. Every one is named and each one's name typed.
   */
  | {
      readonly kind: 'deletesBusinesses';
      /** The shop open here first, when it goes; then shops, then kitchens. */
      readonly businesses: readonly Business[];
      /** Who loses access to the shop open here, when it goes; `[]` otherwise. */
      readonly losesAccess: readonly string[];
      /** The shop open here stays — she co-owns it, or works in it — and keeps her as a former member. */
      readonly leavesHere: boolean;
    };

/**
 * ⚠️ "SOLE" MEANS NO OTHER ACTIVE OWNER — `0053`'s own predicate, answered by
 * `businessesThatGo` across every business she belongs to. `openShopId` is the
 * shop open in Wera, or `null` on the welcome screen, which has no roster.
 *
 * ⚠️ WHO LOSES ACCESS IS STILL THE ROSTER'S ANSWER, and the roster reads every
 * membership she can see without telling one business from another
 * (`MEMBER_COLUMNS` has no `workspace_id` — `nameOf`'s note in `@/api/members`).
 * For a person whose only business is this shop it is the shop's people, as it
 * always was.
 */
export function deletionFrom(input: {
  readonly goes: readonly Business[] | null;
  readonly openShopId: string | null;
  readonly roster: readonly RosterEntry[];
  readonly rosterLoading: boolean;
}): Deletion {
  const { goes, openShopId, roster, rosterLoading } = input;
  if (goes === null) return { kind: 'unknown' };
  if (openShopId !== null && (rosterLoading || !roster.some((entry) => entry.isSelf))) {
    return { kind: 'unknown' };
  }
  if (goes.length === 0) return { kind: 'leaves' };

  const open = goes.find((business) => business.id === openShopId);
  const losesAccess =
    open === undefined ? [] : roster.filter((entry) => !entry.isSelf).map((entry) => entry.identity.text);
  if (open !== undefined && goes.length === 1) return { kind: 'deletesShop', shop: open, losesAccess };
  return {
    kind: 'deletesBusinesses',
    businesses: open === undefined ? goes : [open, ...goes.filter((business) => business !== open)],
    losesAccess,
    leavesHere: openShopId !== null && open === undefined,
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

/** What she typed in each box, keyed by the business's id. */
export type Typed = Readonly<Record<string, string>>;

/** Is everything she must type typed, and matching — so the button may be pressed? */
export function namesReady(deletion: Deletion, typed: Typed): boolean {
  switch (deletion.kind) {
    case 'unknown':
      return false;
    case 'leaves':
      return true;
    case 'deletesShop':
      return shopNameMatches(typed[deletion.shop.id] ?? '', deletion.shop.name);
    case 'deletesBusinesses':
      return deletion.businesses.every((business) => shopNameMatches(typed[business.id] ?? '', business.name));
  }
}

/**
 * The arguments. ⚠️ A one-shop deletion sends `{p_shop_name}` alone and anybody
 * who only leaves sends `null`, exactly as before `0073`. Only when more than
 * the shop open here goes does the new list travel — one typed name per
 * business, which is what `0073` asks for each one.
 */
export function deleteArgs(deletion: Deletion, typed: Typed): DeleteArgs {
  if (deletion.kind === 'deletesShop') return { p_shop_name: typed[deletion.shop.id] ?? '' };
  if (deletion.kind === 'deletesBusinesses') {
    return {
      p_shop_name: null,
      p_business_names: deletion.businesses.map((business) => typed[business.id] ?? ''),
    };
  }
  return { p_shop_name: null };
}

/** The label above the box where she types one business's name. */
export function typedLabel(business: Business): string {
  return business.kind === 'cocina'
    ? ES.account.typeKitchenName(business.name)
    : ES.account.typeShopName(business.name);
}

/** The words on the button: they say what goes. */
export function confirmWords(deletion: Deletion): string {
  if (deletion.kind === 'deletesShop') return ES.account.confirmShop;
  if (deletion.kind !== 'deletesBusinesses') return ES.account.confirm;
  if (deletion.businesses.length > 1) return ES.account.confirmBusinesses;
  return deletion.businesses[0]?.kind === 'cocina' ? ES.account.confirmKitchen : ES.account.confirmShop;
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

/**
 * The Spanish sentence for a refused deletion. `TD007` is this call's own.
 *
 * ⚠️ WITH A NAME PER BUSINESS, `TD007` MEANS THE LIST CHANGED. The button only
 * enables once every box matches its business, so the server refusing means it
 * found a business the screen did not show — a partner left one, say — and the
 * sentence says to look at the list again, which the hook re-reads.
 */
export function deleteErrorMessage(error: unknown, args?: DeleteArgs): string {
  if (typeof error === 'object' && error !== null) {
    if ((error as { code?: unknown }).code === NAME_MISMATCH_CODE) {
      return args?.p_business_names !== undefined
        ? ES.account.errors.listChanged
        : ES.account.errors.nameMismatch;
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
