// ============================================================================
// THE SHOP, AS A CONTRACT WITH POSTGRES. Plan task 5b-i, and the first module
// of `src/api/` — ADR-035 §2.11's "one wrapper per RPC" boundary.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE, AND NOTHING THAT TALKS. This is
// the split `env.ts` / `supabase.ts` already established in this codebase and
// it is the reason any of `src/api/` is testable at all: `@/api/calls` imports
// the live client and can never be loaded by the node suite, so the argument
// names, the column list, the trimming and the "do they belong anywhere yet"
// decision live on this side of the line, where `app/test/api-workspace.test.ts`
// reads them.
//
// ⚠️⚠️ THE `p_` PREFIXES ARE THE WHOLE POINT OF THIS FILE, AND A TYPECHECK
// CANNOT SEE THEM. PostgREST matches an RPC by its PARAMETER NAMES: send
// `display_name` instead of `p_display_name` and it does not fail the call, it
// fails to FIND the function — `PGRST202`, HTTP 404, "Could not find the
// function public.onboard_workspace(display_name) in the schema cache".
// Measured against the applied schema on 2026-09-14, not recalled. Nothing in
// TypeScript knows what `0027` called its arguments, so the names are written
// once, here, and `docs/checks/5b-i-api-contract.sh` is what asserts they are
// still the ones the database answers to.
//
// ⚠️ AND "BELONGS TO NO SHOP" IS A READ OF `workspace`, NOT OF
// `workspace_member`. `workspace_select` (0001) is
// `using (id in (select public.my_workspaces()))`, so the table returns exactly
// the workspaces the caller is an active member of and an empty array IS the
// no-workspace state. Reading the membership table instead would need a second
// policy hop to say the same thing, and would still be answering this question.
// ============================================================================

import { ES } from '@/strings';

/** The RPC that creates a shop. `0001`, replaced in `0002` and again in `0027`. */
export const ONBOARD_WORKSPACE = 'onboard_workspace';

/**
 * The columns a client may ask `workspace` for.
 *
 * ⚠️ NAMED AND NEVER `*`. A `select=*` is a promise to keep parsing whatever a
 * later migration adds, and it ships every column of the row to a phone —
 * including ones added for a report nobody on this screen is allowed to see.
 */
export const WORKSPACE_COLUMNS = 'id,display_name,prices_include_tax,code,giro_principal';

/**
 * ⚠️⚠️ WERA OPENS SHOPS AND ONLY SHOPS — `0072` (plan `10.4a`), the owner's
 * answer of 2026-10-28 to the marketplace drawing: one kind per business
 * account, `tienda` or `cocina`, and each app opens its own. `useWorkspace`
 * takes the FIRST row this read returns, in whatever order Postgres hands them
 * over, so without this filter a person who owns a shop and a kitchen could find
 * Wera opening the kitchen. A person whose only business is a kitchen reads `[]`
 * here, which is "belongs to no shop": Wera offers to make one.
 *
 * ⚠️ A column and a value, and `docs/checks/5b-i-api-contract.sh` reads both out
 * of this file, so the check asks PostgREST the question the app asks.
 */
export const KIND_COLUMN = 'kind';
export const WERA_KIND = 'tienda';

/**
 * ⚠️⚠️ AND EVERY READ BENEATH THAT LIST IS THE OPEN SHOP'S — `10.4b-ii`. The walls
 * let a login read every business she belongs to (`my_workspaces()`), so a person
 * with a shop and a kitchen read the kitchen's rows in Wera too: measured on the
 * local database 2026-10-29, two stores, two *Genérico*, both memberships. With
 * two stores `useCatalog` resolves none, and Vender, Comprar and Merma draw no
 * slider — she could not ring up a sale. So `@/api/calls` reads a business's
 * rows through one helper that filters on this column, and the shop is the one
 * `useWorkspace` opens.
 *
 * ⚠️ ONE COLUMN, BECAUSE EVERY RELATION WERA READS A BUSINESS'S ROWS FROM CARRIES
 * IT — the tables since `0001`, the four views too (read off the database
 * 2026-10-29). `docs/checks/10.4b-ii-shop-scope-contract.sh` reads it out of this
 * file and asks PostgREST, for every relation that helper names, whether the
 * filter keeps the kitchen out.
 */
export const SHOP_COLUMN = 'workspace_id';

/**
 * The key a read of one shop's rows caches under: the read's own key, then the
 * shop.
 *
 * ⚠️ THE SHOP GOES LAST so every invalidation in this app — written as the
 * read's own key, a PREFIX — still sweeps it. ⚠️ AND IT IS IN THE KEY AT ALL so
 * a cache can never answer one business with another's rows: the open shop is
 * part of what was asked. `''` while the shop is not known, when the read is
 * disabled anyway — `costsKey`'s spelling for an id that is not there yet.
 */
export function shopKey(key: readonly unknown[], shopId: string | null): readonly unknown[] {
  return [...key, shopId ?? ''];
}

/** The query key `useMyWorkspaces` caches under, and `onboard` invalidates. */
export const MY_WORKSPACES_KEY = ['workspace', 'mine'] as const;

/** A shop, as this app holds it. `code` is `5b-ii`'s join code (`0027`). */
export interface Workspace {
  readonly id: string;
  readonly displayName: string;
  readonly pricesIncludeTax: boolean;
  readonly code: string;
  /**
   * The shop's main giro, a `catalogo.tag` code (`giro-polleria`…), or `null`
   * when the owner has not chosen one — `0056`, the owner's ruling of 2026-10-16.
   * ⚠️ READ IT WITH `?? null`: a phone restoring the cache written before `0056`
   * holds shops without the field, and `persist.ts` says why that cache was not
   * thrown away for it.
   */
  readonly giroPrincipal: string | null;
}

/** The row as PostgREST sends it — snake_case, because Postgres is. */
export interface WorkspaceRow {
  readonly id: string;
  readonly display_name: string;
  readonly prices_include_tax: boolean;
  readonly code: string;
  readonly giro_principal?: string | null;
}

/** One row, renamed. The only place in this app that knows both spellings. */
export function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    displayName: row.display_name,
    pricesIncludeTax: row.prices_include_tax,
    code: row.code,
    giroPrincipal: row.giro_principal ?? null,
  };
}

/**
 * Where a signed-in person stands: do they belong to a shop yet?
 *
 * ⚠️ `unknown` IS NOT A THIRD OUTCOME, IT IS THE ABSENCE OF ONE — the same
 * distinction `guard.ts`'s `ready` draws about the session, and the same bug if
 * it is collapsed. The read has not come back yet; treating that as `none`
 * sends a shopkeeper who has had a shop since March to a screen inviting her to
 * create one, every time the app opens on a slow connection.
 */
export type Membership = 'unknown' | 'none' | 'member';

/** The membership a read implies. `null` — nothing read yet — is `unknown`. */
export function membershipFrom(
  workspaces: readonly Workspace[] | null | undefined,
): Membership {
  if (workspaces === null || workspaces === undefined) return 'unknown';
  return workspaces.length === 0 ? 'none' : 'member';
}

/** What the onboarding screen collects. `locationName` is asked of nobody yet. */
export interface OnboardInput {
  readonly displayName: string;
  readonly pricesIncludeTax: boolean;
  /**
   * ⚠️ NOT ASKED AT ONBOARDING, AND PASSED ANYWAY SO THE WRAPPER IS THE WHOLE
   * FUNCTION. `onboard_workspace` names the first location after the shop when
   * this is null (`0001`, measured 2026-09-14 — the location came back called
   * "Abarrotes La Probe"), and a one-store shop being asked a second name for
   * the same building is a question with no right answer. The argument stays in
   * the signature because a second store is `location`'s own flow, not a
   * reopening of this one.
   */
  readonly locationName?: string | null;
}

/** The body PostgREST is posted. The three names `0027` declares, exactly. */
export interface OnboardArgs {
  readonly p_display_name: string;
  readonly p_prices_include_tax: boolean;
  readonly p_location_name: string | null;
}

/**
 * The arguments for one `onboard_workspace` call.
 *
 * ⚠️ IT TRIMS, EVEN THOUGH THE FUNCTION DOES TOO. `0027` does `btrim()` on both
 * names and raises `check_violation` on an empty one, so this is not the
 * safety — it is that the name we SEND is the name that gets stored, and a
 * client that ships `"  Abarrotes  "` cannot then tell whether what came back
 * differs because Postgres trimmed it or because somebody else renamed the shop.
 *
 * ⚠️ AN EMPTY LOCATION NAME BECOMES `null`, NOT `""`. The default branch in the
 * function is `coalesce(p_location_name, p_display_name)` — it reads NULL, not
 * blank — so an empty string would name a store the empty string and pass every
 * constraint on the way.
 */
export function onboardArgs(input: OnboardInput): OnboardArgs {
  const location = (input.locationName ?? '').trim();
  return {
    p_display_name: input.displayName.trim(),
    p_prices_include_tax: input.pricesIncludeTax,
    p_location_name: location === '' ? null : location,
  };
}

/** A name the screen will not send, and what to say about it instead. */
export type ShopName =
  | { readonly ok: true; readonly displayName: string }
  | { readonly ok: false; readonly message: string };

/**
 * Is this a shop name?
 *
 * ⚠️ IT REFUSES THE ONE CASE THE SERVER ALSO REFUSES, AND NOTHING ELSE. Blank
 * is a `23514` from `0027` — measured, not assumed — and catching it here turns
 * a round trip and a red 400 into a sentence under the field. Every other name
 * is somebody's real shop: `Doña Mary`, `La 5ta`, `El 7`. A client-side rule
 * about length or characters would be this app deciding what a shop may be
 * called, which is not a decision it has been given.
 */
export function checkShopName(name: string): ShopName {
  const displayName = name.trim();
  if (displayName === '') return { ok: false, message: ES.api.errors.nameMissing };
  return { ok: true, displayName };
}
