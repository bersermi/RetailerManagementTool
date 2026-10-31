// ============================================================================
// HER KITCHEN, AS A CONTRACT WITH POSTGRES. Plan tasks `10.4b-iii-a` (the read)
// and `10.4b-iii-b` (making one, and her trade) — the first module of Cocina's
// `src/api/`, ADR-035 §2.11's "one wrapper per RPC" boundary.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS — Wera's
// split (`app/src/api/workspace.ts`): `@/api/calls` imports the live client and
// can never be loaded by the suite, so the table, the columns, the filter and the
// order are written once, here, where `test/data-layer.test.ts` reads them and
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

// ----------------------------------------------------------------------------
// Making one — `10.4b-iii-b`
// ----------------------------------------------------------------------------

/**
 * ⚠️ WERA'S DOOR, WITH THE KIND (`0072`): a kitchen is made exactly as a shop is —
 * its owner membership, its settings, its first place named after it and its
 * generic provider, in one statement — and `p_kind` makes it a kitchen for good
 * (`workspace_kind_never_changes`).
 */
export const ONBOARD_WORKSPACE = 'onboard_workspace';

/**
 * The body PostgREST is posted: TWO of the function's four names, and the
 * contract check reads them out of this interface. The other two keep their
 * defaults — prices with IVA included, and the first place named after the
 * kitchen (`coalesce(p_location_name, p_display_name)`), so she is never asked
 * a second name for the same kitchen (Wera's `onboardArgs`, and its reason).
 */
export interface OnboardArgs {
  readonly p_display_name: string;
  readonly p_kind: typeof COCINA_KIND;
}

/** ⚠️ IT TRIMS, as Wera's does: the name sent is the name stored. */
export function onboardArgs(name: string): OnboardArgs {
  return { p_display_name: name.trim(), p_kind: COCINA_KIND };
}

/**
 * A name the screen will send, or `null`. ⚠️ IT REFUSES THE ONE CASE THE SERVER
 * REFUSES (blank, `23514`), AND NOTHING ELSE — Wera's `checkShopName`: every
 * other name is somebody's kitchen (*Doña Mary*, *La 5ta*), and a rule about
 * length or letters would be this app deciding what a fonda may be called.
 */
export function checkKitchenName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed === '' ? null : trimmed;
}

// ----------------------------------------------------------------------------
// Her trade — the kitchens' own giro list (`0072`), never a shop's
// ----------------------------------------------------------------------------

/**
 * ⚠️ COCINA'S DOOR TO THE KITCHENS' TRADES, AND THE ONLY ONE: `kitchen_giros()`
 * answers any signed-in person — she belongs to nothing yet when she picks — and
 * returns `[{code, label}]` in their order. Wera's `catalog_template()` never
 * returns these, and `workspace_giro_fits_kind` refuses a shop's giro on a
 * kitchen, so the list on her screen is the database's, not a copy.
 */
export const KITCHEN_GIROS = 'kitchen_giros';

/** The list, cached for everyone alike: it is the same for every login. */
export const GIROS_KEY = ['cocina', 'giros'] as const;

/** One trade: `giro-fonda`, *Fonda o cocina económica*. */
export interface Giro {
  readonly code: string;
  readonly label: string;
}

/**
 * The function's answer as a list. ⚠️ TOLERANT ON PURPOSE: a row without a
 * code or a label is dropped rather than drawn as a blank choice — the rows are
 * edited by hand in the dashboard (`catalogo.tag`, `0072`'s header).
 */
export function girosFrom(data: unknown): Giro[] {
  if (!Array.isArray(data)) return [];
  const giros: Giro[] = [];
  for (const row of data) {
    if (typeof row !== 'object' || row === null) continue;
    const { code, label } = row as { code?: unknown; label?: unknown };
    if (typeof code === 'string' && code !== '' && typeof label === 'string' && label.trim() !== '') {
      giros.push({ code, label: label.trim() });
    }
  }
  return giros;
}

/** Her trade's name, or `null` — none chosen, or one the list no longer has. */
export function giroLabel(giros: readonly Giro[] | null | undefined, code: string | null): string | null {
  if (code === null || giros === null || giros === undefined) return null;
  return giros.find((giro) => giro.code === code)?.label ?? null;
}

/**
 * ⚠️ THE COLUMN HER TRADE IS WRITTEN TO, BY THE OWNER'S PLAIN UPDATE — Wera's
 * `setMainGiro` (`0056`): `workspace_update` is the owner's, and an RLS UPDATE
 * refusal is a 200 with no row, so the call asks for the row back and
 * `.single()` turns a refusal into `PGRST116` instead of a silent "saved".
 */
export const GIRO_COLUMN = 'giro_principal';
