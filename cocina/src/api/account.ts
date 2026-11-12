// ============================================================================
// SHE DELETES HER ACCOUNT, AS A CONTRACT WITH POSTGRES — AND APPLE IS TOLD
// WHICH APP ASKED. Plan task `10.4b-iii-c`. And, since `10.5-iii-c`, she deletes
// ONE KITCHEN and keeps the account (`0077`, the section before Apple's).
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
//
// ⚠️⚠️ `10.5b-iv-c` — A PLATE STILL TO HAND OVER (`0079`'s `TD014`, ruled 2026-11-10): no
// business she alone owns is deleted — alone, or with her account — while a neighbour holds
// a plate there; each deletion says why (`PLATE_PENDING_CODE`). ⚠️ AND THE DATABASE IS ASKED
// BEFORE APPLE IS TOLD (the review of `10.5b-iii-b` found it; this row decided it): Apple must
// be told while her login still exists (the function asks the auth server who is calling), so
// it was told first — and a deletion `TD014` then refused had already taken her off Apple's
// list. Now, when a business goes with her account, one read asks whether a plate is pending
// at any of them (`PENDING_*`, `reservation_state`'s `apartado`) BEFORE Apple's sheet opens;
// one is, and she is told why with no sheet at all. The database still answers last: a
// neighbour who reserves between the read and the deletion meets `TD014` there, as before.
// ============================================================================

import { apiErrorMessage } from '@/api/errors';
import { ES } from '@/strings';

/** The RPC `0053` creates and `0073` re-creates. */
export const DELETE_MY_ACCOUNT = 'delete_my_account';

/** `0073`'s refusal: a business she alone owns has no name among those typed. */
export const NAME_MISMATCH_CODE = 'TD007';

/** ⚠️ `10.5b-iv-c`: `0079`'s refusal, of both deletions — a plate still to hand over at a business that would go (Itacate's name). */
export const PLATE_PENDING_CODE = 'TD014';

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
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (code === NAME_MISMATCH_CODE) return ES.account.errors.listChanged;
  if (code === PLATE_PENDING_CODE) return ES.account.errors.reservaPendiente;
  return apiErrorMessage(error);
}

// ----------------------------------------------------------------------------
// ⚠️ `10.5b-iv-c`: THE DATABASE ASKED BEFORE APPLE IS TOLD — see the header
// ----------------------------------------------------------------------------

/** The reservations, read under her walls: an owner reads her businesses' (`0079`). */
export const PENDING_TABLE = 'reservation';

/** Only whether one exists: its id. */
export const PENDING_COLUMNS = 'id';

/** The column the read is filtered on — the businesses that go (`in.(…)`). */
export const PENDING_OWNER_COLUMN = 'workspace_id';

/**
 * ⚠️ `reservation_state`'s `apartado`, as four filters: none of these three moments
 * (`is.null`) — not handed over, not confirmed by her, not cancelled — and …
 */
export const PENDING_NULL_COLUMNS = 'handed_over_at,picked_up_at,cancelled_at';

/** … its hold not over (`gt.` the phone's now): a plate that *se liberó* is no longer pending. */
export const PENDING_UNTIL_COLUMN = 'held_until';

/** The ids the pre-deletion read asks about — every business that goes, or none. */
export function pendingIds(deletion: Deletion): string[] {
  return deletion.kind === 'deletes' ? deletion.businesses.map((business) => business.id) : [];
}

// ----------------------------------------------------------------------------
// HER KITCHEN DELETED ALONE — `10.5-iii-c`, `0077`. The owner's ruling of
// 2026-11-04: *Eliminar esta cocina* beside *Eliminar mi cuenta*, the kitchen's
// name typed; her login — Itacate's and Wera's too — and every other business
// she owns stay, and nothing is told to Apple (no login goes, so no sheet).
//
// ⚠️ OFFERED ONLY FOR THE KITCHEN OPEN HERE, AND ONLY ONCE THE OWNERS READ SAYS
// IT IS HERS ALONE (`kitchenAlone`): the server refuses anything else (`TD012`
// not hers alone, `TD013` a shop), and a button that can only be refused is not
// offered. The same one read as *Eliminar mi cuenta*, so the two never disagree.
//
// ⚠️ NOT IN ITACATE'S COPY: Itacate opens no kitchen. These names are this
// app's alone, so the contract check reads them out of this file and holds
// nothing of Itacate's to them.
// ----------------------------------------------------------------------------

/** `0077`'s function: one business she alone owns, after its typed name — a kitchen, here. */
export const DELETE_MY_BUSINESS = 'delete_my_business';

/** `0077`'s refusal of a business that is not hers alone — none such, not an owner, or shared. */
export const NOT_HERS_ALONE_CODE = 'TD012';

/** The arguments, by the name PostgREST matches on: which kitchen, and the name she typed. */
export interface DeleteBusinessArgs {
  readonly p_workspace_id: string;
  readonly p_business_name: string;
}

/**
 * The kitchen open here, when the owners read says she is its only active owner
 * — the one kitchen this screen may delete alone — else `null`: the read is out,
 * nothing is open (where a kitchen is made), or another owner shares it.
 */
export function kitchenAlone(goes: readonly Business[] | null, openKitchenId: string | null): Business | null {
  if (goes === null || openKitchenId === null) return null;
  return goes.find((business) => business.id === openKitchenId && business.kind === 'cocina') ?? null;
}

/** The body: the kitchen's id and what she typed, as typed — the server folds it (`normalize_name`). */
export function deleteKitchenArgs(kitchen: Business, typed: string): DeleteBusinessArgs {
  return { p_workspace_id: kitchen.id, p_business_name: typed };
}

/**
 * The Spanish sentence for a refused kitchen deletion. ⚠️ `TD007` HERE MEANS THE
 * NAME MOVED: the button enables only once the box matches the name the owners
 * read gave, so the server finding another means it changed since. `TD012` means
 * the kitchen is not hers alone — or no longer exists, when an answer that it was
 * deleted was lost on the way back: the hook reads her kitchens again either way,
 * and the guard moves her if it is gone.
 */
export function deleteKitchenErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  if (code === NAME_MISMATCH_CODE) return ES.kitchenDeletion.errors.nameChanged;
  if (code === NOT_HERS_ALONE_CODE) return ES.kitchenDeletion.errors.notHersAlone;
  // `10.5b-iv-c`: no Apple here, so nothing to ask first — the database's answer is said.
  if (code === PLATE_PENDING_CODE) return ES.kitchenDeletion.errors.reservaPendiente;
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
