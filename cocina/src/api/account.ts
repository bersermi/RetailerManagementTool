// ============================================================================
// SHE DELETES HER ACCOUNT, AS A CONTRACT WITH POSTGRES — AND APPLE IS TOLD
// WHICH APP ASKED. Plan task `10.4b-iii-c`.
//
// ⚠️ WERA'S RULES, COPIED (`app/src/api/account.ts`, plans `5R-c`, `5R-k` and
// `10.4b-i`, whose header carries the reasons) and cut to this app. What goes
// with the account is every business she is the ONLY active owner of — her
// kitchens, and a shop of hers in Wera — answered from ONE read of her owner
// memberships (`businessesThatGo`); when anything goes, every one is named and
// she types each one's name (`0073`, the owner's ruling of 2026-10-29). The
// server asks again and refuses `TD007` when a name is missing, so a stale list
// can show the wrong warning but never delete a business nobody named.
//
// ⚠️ THE NAME COMPARISON MIRRORS `normalize_name` (`0001`): case and runs of
// whitespace fold, ACCENTS DO NOT — *Doña* typed as *Dona* is refused on both
// sides, the right answer for a confirmation.
//
// ⚠️ TWO DIFFERENCES FROM WERA, DECIDED:
//   - NO SHOP IS OPEN HERE AND NO TEAM IS READ. Wera answers around the shop
//     open in it and that shop's roster (who loses access, the month's file);
//     Cocina opens a kitchen and reads no business's people, so the open kitchen
//     is named first and nobody else is listed.
//   - ⚠️ ONE BODY: EVERY NAME IN `p_business_names`, an empty list when nothing
//     goes — the list `0073` reads (deployed 2026-10-29). Wera also sends
//     `{p_shop_name}` alone, for its builds older than `0073`; Cocina has none.
//
// ⚠️⚠️ APPLE IS TOLD WHICH APP (`apple-revoke`, its build 2). Apple issues the
// code from her deletion's sheet to THIS app's bundle id and refuses a trade
// that names another, so the body says `client_id`; a body without it is
// Wera's. `docs/checks/5R-k-apple-revoke-contract.sh` reads the function's name,
// the body's keys and this app's id out of this file and puts them in front of
// the real function; `docs/checks/10.4b-iii-a-cocina-contract.sh` reads the
// rest and asks a real PostgREST.
// ============================================================================

import { apiErrorMessage } from '@/api/errors';
import { ES } from '@/strings';

/** The RPC `0053` creates and `0073` re-creates. */
export const DELETE_MY_ACCOUNT = 'delete_my_account';

/** `0073`'s refusal: a business she alone owns has no name among those typed. */
export const NAME_MISMATCH_CODE = 'TD007';

/** The arguments, by the name PostgREST matches on. */
export interface DeleteArgs {
  /** One typed name for each business that goes; `[]` when none does. */
  readonly p_business_names: readonly string[];
}

/**
 * ⚠️⚠️ THE READ THAT SAYS WHAT GOES WITH THE ACCOUNT: every active owner of
 * every business she belongs to, with that business's name and kind —
 * `workspace_member_select` (`0001`) lets her read every membership of her own
 * businesses, and the embed reads `workspace`, which `workspace_select` lets her
 * read for the same ones. ⚠️ NOT FILTERED BY KIND, unlike her kitchens' read: a
 * shop goes with the account as a kitchen does.
 */
export const OWNERS_TABLE = 'workspace_member';
export const OWNER_COLUMNS = 'workspace_id,user_id,workspace(display_name,kind)';
export const OWNER_ROLE_COLUMN = 'role';
export const OWNER_ROLE = 'owner';
export const OWNER_ACTIVE_COLUMN = 'is_active';

/** The query key the read caches under; the login is appended (`ownersKey`), Cocina's rule. */
export const OWNERS_KEY = ['cuenta', 'duenos'] as const;

export function ownersKey(userId: string | null): readonly unknown[] {
  return [...OWNERS_KEY, userId ?? ''];
}

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
 * either kind — kitchens first, then shops, each by name. `null` while the read
 * is out.
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
  if (a.kind !== b.kind) return a.kind === 'cocina' ? -1 : 1;
  return a.name.localeCompare(b.name);
}

/**
 * What deleting this account does. `unknown` while the read has not arrived —
 * the screen offers nothing until it knows which warning to show, because the
 * wrong one is the one that matters.
 */
export type Deletion =
  | { readonly kind: 'unknown' }
  /** Nothing goes but the login: no kitchen yet, or every business shared. */
  | { readonly kind: 'leaves' }
  /** Every business named, the open kitchen first, each one's name typed (`0073`). */
  | { readonly kind: 'deletes'; readonly businesses: readonly Business[] };

/** `openKitchenId` is the kitchen this app opens, or `null` where a kitchen is made. */
export function deletionFrom(goes: readonly Business[] | null, openKitchenId: string | null): Deletion {
  if (goes === null) return { kind: 'unknown' };
  if (goes.length === 0) return { kind: 'leaves' };
  const open = goes.find((business) => business.id === openKitchenId);
  return {
    kind: 'deletes',
    businesses: open === undefined ? goes : [open, ...goes.filter((business) => business !== open)],
  };
}

/** `normalize_name`, on this side of the wire: lower case, trimmed, one space. */
export function normalizedName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Does what she typed match the business's name, the way the server will compare it? */
export function nameMatches(typed: string, name: string): boolean {
  const left = normalizedName(typed);
  return left !== '' && left === normalizedName(name);
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
    case 'deletes':
      return deletion.businesses.every((business) => nameMatches(typed[business.id] ?? '', business.name));
  }
}

/** The arguments: one typed name per business named, in the screen's order. */
export function deleteArgs(deletion: Deletion, typed: Typed): DeleteArgs {
  if (deletion.kind !== 'deletes') return { p_business_names: [] };
  return { p_business_names: deletion.businesses.map((business) => typed[business.id] ?? '') };
}

/** Does a shop of hers go too? Then the screen says where its records can be downloaded first. */
export function takesAShop(deletion: Deletion): boolean {
  return deletion.kind === 'deletes' && deletion.businesses.some((business) => business.kind === 'tienda');
}

/** The label above the box where she types one business's name. */
export function typedLabel(business: Business): string {
  return business.kind === 'cocina'
    ? ES.account.typeKitchenName(business.name)
    : ES.account.typeShopName(business.name);
}

/** The words on the button: they say what goes. */
export function confirmWords(deletion: Deletion): string {
  if (deletion.kind !== 'deletes') return ES.account.confirm;
  if (deletion.businesses.length > 1) return ES.account.confirmBusinesses;
  return deletion.businesses[0]?.kind === 'tienda' ? ES.account.confirmShop : ES.account.confirmKitchen;
}

/** What the server answers: how many businesses went, and how many she was left as a former member of. */
export interface Deleted {
  readonly businessesDeleted: number;
  readonly businessesLeft: number;
}

/** The server's answer — `0053`'s keys, which still say *shops* — or zeros for anything else. */
export function deletedFrom(data: unknown): Deleted {
  if (typeof data !== 'object' || data === null) return { businessesDeleted: 0, businessesLeft: 0 };
  const row = data as { shops_deleted?: unknown; shops_left?: unknown };
  return {
    businessesDeleted: typeof row.shops_deleted === 'number' ? row.shops_deleted : 0,
    businessesLeft: typeof row.shops_left === 'number' ? row.shops_left : 0,
  };
}

/**
 * The Spanish sentence for a refused deletion. ⚠️ `TD007` HERE ALWAYS MEANS THE
 * LIST CHANGED: the button enables only once every box matches its business,
 * so the server refusing means it found a business the screen did not show — a
 * kitchen made on another phone, a partner who left — and the hook reads the
 * list again.
 */
export function deleteErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === NAME_MISMATCH_CODE) {
    return ES.account.errors.listChanged;
  }
  return apiErrorMessage(error);
}

/**
 * ⚠️⚠️ THE ONE THING THIS APP REACHES THAT IS NOT POSTGRES — Wera's (`5R-k`):
 * the Edge Function that holds the owner's Apple key, trades the code Apple's
 * sheet just gave and revokes, and keeps nothing. ONE function for every app;
 * its name and region are Wera's.
 */
export const APPLE_REVOKE = 'apple-revoke';

/** ⚠️ Pinned to the database's region, as Wera's: the aviso says the data is handled in the United States. */
export const APPLE_REVOKE_REGION = 'us-west-2';

/** A deletion waits this long for Apple and then goes ahead without it. */
export const APPLE_REVOKE_TIMEOUT_MS = 15000;

/** This app's client id at Apple — its bundle id, the one Apple issues the code to. */
export const APPLE_CLIENT_ID = 'mx.wera.cocina';

/** The function's body, by the keys it reads. ⚠️ Without `client_id` the function signs for Wera. */
export interface RevokeBody {
  readonly code: string;
  readonly client_id: string;
}

export function revokeBody(code: string): RevokeBody {
  return { code, client_id: APPLE_CLIENT_ID };
}
