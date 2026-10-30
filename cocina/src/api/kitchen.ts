// ============================================================================
// HER KITCHEN, AS A CONTRACT WITH POSTGRES. Plan task `10.4b-iii-a`, the first
// module of Cocina's `src/api/` — ADR-035 §2.11's "one wrapper per RPC" boundary.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS — Wera's
// split (`app/src/api/workspace.ts`): `@/api/calls` imports the live client and
// can never be loaded by the suite, so the table, the columns, the filter and the
// order are written once, here, where `test/api-kitchen.test.ts` reads them and
// `docs/checks/10.4b-iii-a-cocina-contract.sh` reads them OUT OF THIS FILE and
// asks a real PostgREST the question the app asks. A typecheck cannot see a
// misspelt column: PostgREST answers it with a 400 on the phone.
//
// ⚠️⚠️ COCINA OPENS KITCHENS AND ONLY KITCHENS (`0072`, the owner's answer of
// 2026-10-28: one kind per business account, each opened by its own app). The
// walls let a login read every business she belongs to, so without the filter a
// shop's owner would find her shop opened here. With it, she reads `[]` — "no
// kitchen yet" — and lands where a kitchen is made, as a new fonda does.
//
// ⚠️ AND IN THE ORDER THEY WERE MADE. A login that owns two kitchens opens the
// first she made, every time — Wera's read has no order, and its plan names the
// gap (`10.4b-ii`: no defined open shop for a login in two).
// ============================================================================

/** The business account's table — a kitchen is a workspace (ADR-035 §2.3). */
export const WORKSPACE_TABLE = 'workspace';

/** What this app reads of her kitchen. Named, never `*`. */
export const KITCHEN_COLUMNS = 'id,display_name,giro_principal';

/** The account's kind (`0072`), and the one this app opens. */
export const KIND_COLUMN = 'kind';
export const COCINA_KIND = 'cocina';

/** The order, comma-separated, each ascending: the first-made kitchen opens. */
export const KITCHEN_ORDER = 'created_at,id';

/** The query key the read caches under; the signed-in login's id is appended (`kitchensKey`). */
export const KITCHENS_KEY = ['cocina', 'mias'] as const;

/**
 * ⚠️ THE LOGIN IS PART OF THE KEY, so the next person to sign in on this phone
 * can never be answered from the last one's cache — the cache is not cleared on
 * a sign-out, and does not need to be. `''` while nobody is signed in, when the
 * read is disabled anyway.
 */
export function kitchensKey(userId: string | null): readonly unknown[] {
  return [...KITCHENS_KEY, userId ?? ''];
}

/** A kitchen, as this app holds it. `giroPrincipal` is her trade (`kitchen_giros()`), or `null`. */
export interface Kitchen {
  readonly id: string;
  readonly displayName: string;
  readonly giroPrincipal: string | null;
}

/** The row as PostgREST sends it. */
export interface KitchenRow {
  readonly id: string;
  readonly display_name: string;
  readonly giro_principal?: string | null;
}

/** One row, renamed. The only place in this app that knows both spellings. */
export function toKitchen(row: KitchenRow): Kitchen {
  return { id: row.id, displayName: row.display_name, giroPrincipal: row.giro_principal ?? null };
}

/**
 * Where a signed-in person stands. ⚠️ `unknown` IS THE ABSENCE OF AN ANSWER, not
 * a third one: the read has not come back (or could not), and treating it as
 * `none` would send a fonda with a kitchen to the screen that makes one every
 * time the app opens on a slow connection — Wera's `membershipFrom`, and its bug.
 */
export type Membership = 'unknown' | 'none' | 'member';

export function membershipFrom(kitchens: readonly Kitchen[] | null | undefined): Membership {
  if (kitchens === null || kitchens === undefined) return 'unknown';
  return kitchens.length === 0 ? 'none' : 'member';
}

/** The kitchen this app opens: the first the ordered read returns, or `null`. */
export function openKitchen(kitchens: readonly Kitchen[] | null | undefined): Kitchen | null {
  return kitchens === null || kitchens === undefined || kitchens.length === 0 ? null : kitchens[0];
}
