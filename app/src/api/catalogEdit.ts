// ============================================================================
// THE SHOP CHANGING A PRODUCT IT ALREADY HAS, AS A CONTRACT WITH POSTGRES. Plan
// task `5e-iii-a`, and the first module in `app/` that UPDATES anything in the
// catalog — `@/api/catalogWrite` is the same three tables created, and this is
// what happens to them afterwards.
//
// ⚠️⚠️ IT SHIPS NO SCREEN AND NO COMPONENT. `5e-iii-b` draws `Editar` and
// `5h.5` owns `src/ui/`; what is here is everything about that form which has a
// RIGHT ANSWER — the patches, the price plan, the order the two price calls must
// go in, the arithmetic and the refusals — so that
// `app/test/api-catalog-edit.test.ts` and
// `docs/checks/5e-iii-a-catalog-edit-contract.sh` can both read it. §2.11 keeps
// rendering out of scope; this is the half of `5e-iii` that is not rendering.
//
// ⚠️⚠️ THE PRICE CHANGE IS THE SUBSTANCE AND IT IS THREE BRANCHES, NOT ONE.
// `price_list` is a DATED RANGE table under an exclusion constraint, so *"change
// the price"* is not one write and is not the same write twice:
//
//   * NO ROW IN FORCE  — insert `[today, ∞)`. The product was wearing C3.12's
//                        dash, which `5e-i` made a legitimate state on the
//                        owner's ruling of 2026-09-22. This is the branch that
//                        finally prices one.
//   * A ROW FROM AN EARLIER DAY — close it at today, then open a new one. Two
//                        calls, and the order is forced; see below.
//   * A ROW THAT STARTED TODAY — it CANNOT be closed. `effective_to` would equal
//                        `effective_from` and `price_list_range_ordered` is
//                        `effective_to is null or effective_to > effective_from`,
//                        so Postgres refuses a zero-length range. Its
//                        `price_per_base` is updated in place instead.
//
// ⚠️ A MODULE THAT KNEW ONLY THE SECOND BRANCH WOULD WORK ALL DAY AND FAIL THE
// SECOND TIME A SHOPKEEPER CORRECTED A PRICE — which is precisely the moment he
// is watching it, because the first correction is what made him look.
//
// ⚠️⚠️ CLOSE BEFORE YOU OPEN, AND IT IS A DELIVERABLE RATHER THAN AN
// IMPLEMENTATION DETAIL — `WRITE_ORDER`'s argument one module over, with a
// different constraint behind it. Opening `[today, ∞)` while the old row is
// still open makes TWO rows cover today, and `price_list_no_overlap` — a GiST
// exclusion over `(workspace_id, variant_id, coalesce(location_id, …),
// valid_period)` — refuses the second with `23P01`. So the sequence is not a
// preference and is not slower the other way round: it is the only order that
// works.
//
// ⚠️⚠️ WHICH MEANS A PARTIAL FAILURE THIS APP HAS NEVER HAD, AND IT IS THE WORST
// ONE SO FAR. PostgREST has no transaction to offer. If the close lands and the
// open does not, the product is **priced yesterday and priceless today** — on
// the shelf, mid-morning, wearing C3.12's dash, put there by a shopkeeper who was
// CORRECTING a price rather than removing one. `5e-i`'s three partial states were
// all invisible or harmless; this one is neither, so it is a named outcome
// (`PriceChangeFailed.closed`) with a sentence of its own and a retry that
// RE-OPENS rather than re-closing. Closing twice is not the danger — the second
// close is a no-op patch — the danger is a session that treats the whole change
// as untried and shows *"no se pudo guardar"* about a price it really did remove.
//
// ⚠️⚠️ AND THE CATALOG READ CANNOT PLAN THIS CHANGE, WHICH IS WHY THERE IS A
// SECOND READ IN HERE. `PRICE_COLUMNS` in `@/api/catalog` is
// `price_per_base::text,location_id` — no `id`, no `effective_from` — because the
// list screen needs a figure and a scope and nothing else. Every branch above
// turns on a row's `id` and on WHICH DAY it started, so `PRICE_EDIT_COLUMNS`
// below asks for those two as well, for ONE variant, rather than widening a read
// that runs over the whole shop on every load.
//
// ⚠️ THE SCOPE IS THE ONE THE READ RESOLVED AND IS NEVER INVENTED. `priceFor`
// prefers a store's own row over the shop-wide one, so a change edits the row the
// shopkeeper is LOOKING at; and a product with no price at all is priced
// shop-wide, `location_id` null, which is `5e-i`'s decision A unchanged. Nothing
// here ever creates a store-scoped price for a shop that did not have one —
// that would be this module answering a question C8.9 never asked.
//
// ⚠️⚠️ SO WHAT NO CHECK IN THIS REPOSITORY CAN SEE except one, named here rather
// than left to be discovered: the fence. `product_variant_update`,
// `product_family_update`, `price_list_update` and `price_list_insert` are all
// `has_role(…, 'manager')` in `0002`. Nothing in TypeScript has ever read a
// policy, `CREATE POLICY` is not in the knowledge graph, and RLS is bypassed by
// the `postgres` superuser — so `docs/checks/5e-iii-a-catalog-edit-contract.sh`
// is the only instrument it will ever get, and its central assertion is again
// that A CASHIER IS REFUSED. `5e-i`'s check asserted that on INSERT; nothing has
// ever asserted it on UPDATE, and UPDATE is the whole of this module.
//
// ⚠️⚠️⚠️ AND THE FENCE ON AN UPDATE IS NOT THE FENCE ON AN INSERT. MEASURED
// AGAINST THE APPLIED SCHEMA ON 2026-09-23, AND IT IS THE FINDING OF THIS TASK.
// `price_list_insert` is `with check`, so a cashier posting a price gets what
// `5e-i` recorded: **HTTP 403, `42501`**. Every UPDATE policy here is `using` as
// well, and a row a `using` clause excludes is a row PostgREST CANNOT SEE — so a
// cashier's PATCH matches nothing and comes back **HTTP 200 with `[]`**. No code,
// no message, no refusal. **A screen that read that as success would tell a
// shopkeeper her price changed while the shelf kept the old one**, which is the
// silent-refusal shape [[shift-cover-is-a-reassignment]] records, arriving this
// time through a 200.
//
// ⚠️⚠️ SO `.single()` ON EVERY PATCH IS A DELIVERABLE AND NOT A STYLE. It sends
// `Accept: application/vnd.pgrst.object+json`, and PostgREST answers zero rows
// with **HTTP 406 and `PGRST116`** — measured, both tables. That is the only
// thing standing between a silent refusal and a lie, which is why `PGRST116` is
// mapped here rather than falling to `apiErrorMessage`'s *"algo salió mal"*.
// ⚠️ It is honest on this path and would not be on every path: the id comes from
// the catalog the phone just read, and neither catalog table has a DELETE policy
// — measured too, `42501 permission denied for table product_variant` — so a row
// that has vanished is not a state this app can produce. Zero rows here means the
// fence.
//
// ⚠️⚠️ AND C3.17 SAYS THE FENCE SHOULD NOT BE THERE AT ALL. *"Any role may change
// a price, including a cashier"* — with a closing sentence that it is
// *"client-side only; no schema depends on it"*, which is FALSE against the
// applied schema and has been since `0002` on 2026-08-26. The contradiction is
// parked in the plan's decisions block. **This module describes the fence the
// database applies today**; a ruling that widens it is a migration written
// against a module that already names it, which is why that question blocks the
// screen and not this.
// ============================================================================

import { SCALE, formatDecimal, parseDecimal } from '@tienda/money';

import {
  PRICE_TABLE,
  PRICE_STARTS_COLUMN,
  priceEndsAfter,
  priceFor,
  searchKey,
  type CatalogEntry,
  type PriceRow,
  type UnitFactors,
} from '@/api/catalog';
import {
  CATALOG_WRITE_REFUSALS,
  parsePesos,
  priceOmitted,
  pricePerBase,
} from '@/api/catalogWrite';
import { apiErrorMessage } from '@/api/errors';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// THE TABLES AND THE COLUMNS, SPELLED ONCE (`R13`)
// ----------------------------------------------------------------------------

/** The table a rename, the two settings and a retirement all patch. */
export const VARIANT_TABLE = 'product_variant';

/**
 * ⚠️ THE PRICE TABLE IS IMPORTED AND NOT RESPELLED. `@/api/catalog` owns the
 * word; `catalogWrite` spells it again only because its `WRITE_ORDER` is a
 * SEQUENCE and half a sequence imported from elsewhere is a sequence nobody can
 * read in one place. Nothing here is a sequence of tables, so there is no reason
 * for a third copy.
 */
export const PRICE_EDIT_TABLE = PRICE_TABLE;

/**
 * What the price plan needs and the catalog read does not fetch.
 *
 * ⚠️⚠️ `id` AND `effective_from` ARE THE WHOLE POINT. Every branch of
 * `priceChange` turns on which row is in force and on whether it started TODAY,
 * and `PRICE_COLUMNS` in `@/api/catalog` carries neither — deliberately, because
 * the list screen reads this table for every variant in the shop and needs a
 * figure and a scope. This read is for ONE variant, on the screen that changes
 * it.
 *
 * ⚠️ `price_per_base::text` FOR THE HEADER'S REASON, the same one `PRICE_COLUMNS`
 * gives: `numeric(14,6)` arrives as a JSON number otherwise, and a double is not
 * what this app does arithmetic on. `effective_to` is a `date` and is text
 * already.
 */
export const PRICE_EDIT_COLUMNS = 'id,price_per_base::text,location_id,effective_from,effective_to';

/**
 * The columns each patch sends — and nothing else.
 *
 * ⚠️⚠️ THEY ARE SEPARATE PATCHES AND NOT ONE `product_variant` BODY, WHICH IS A
 * DECISION AND NOT A TIDINESS. A rename can be refused `23505` by
 * `product_variant_name_unique` while the tax rate beside it was perfectly fine;
 * sending them together means one refusal for two unrelated edits and a
 * shopkeeper told to pick another name when what she changed was the IVA. Three
 * bodies is three answers.
 *
 * ⚠️⚠️ `enforce_stock` IS IN NONE OF THEM AND THAT IS C8.8, A HARD PILOT
 * CONSTRAINT RATHER THAN A SIMPLIFICATION. C8.6 guarantees permanent drift in
 * both directions, `0001` leaves `enforce_stock_default` false and `0002` leaves
 * the column null, and this is the one screen in the pilot that would ever have
 * been tempted to offer the switch. A column absent from every list here is a
 * column `5e-iii-b` cannot draw by accident.
 */
export const NAME_PATCH_COLUMNS = 'name';
export const SETTINGS_PATCH_COLUMNS = 'tax_rate,pack_size';
export const ACTIVE_PATCH_COLUMNS = 'is_active';

/** The two `price_list` patches: closing a row, and correcting one in place. */
export const PRICE_CLOSE_COLUMNS = 'effective_to';
export const PRICE_REPRICE_COLUMNS = 'price_per_base';

/**
 * The columns a NEW price row is posted with — `catalogWrite`'s own constant,
 * re-exported rather than respelled.
 *
 * ⚠️ THE OPENING BRANCHES POST THE SAME ROW `5e-i` POSTS, so they must send the
 * same column list; a second spelling of it here is the copy that drifts, which
 * is the defect this repository has recorded eleven times. ⚠️ AND `effective_to`
 * IS STILL SENT AS `null` RATHER THAN OMITTED, for that constant's own recorded
 * reason: PostgREST refuses a bulk insert whose objects do not all carry the same
 * keys.
 */
export { PRICE_INSERT_COLUMNS } from '@/api/catalogWrite';

/** What every patch asks back. ⚠️ Never `*` (`R13`) — see `INSERT_RETURNING`. */
export const UPDATE_RETURNING = 'id';

// ----------------------------------------------------------------------------
// THE TWO FIGURES SET ONCE AND NEVER GUESSED
// ----------------------------------------------------------------------------

/**
 * `product_variant.tax_rate` for an IVA a shopkeeper typed as a PERCENTAGE.
 *
 * ⚠️⚠️ THE COLUMN IS A RATE AND THE BOX IS A PERCENTAGE, AND CONFUSING THEM IS A
 * SIXTEEN-FOLD ERROR IN THE LEDGER. `0002`'s own comment: *"IVA as a rate, not a
 * percentage: 0.1600, not 16."* A shopkeeper knows `16`. So this takes `16` and
 * answers `"0.1600"`, and the conversion is not a division at all — a percentage
 * read at scale 2 is a rate at scale 4 by definition, `16.00` and `0.1600` being
 * the same integer `1600` seen through two scales. ⚠️ Nothing is rounded, which
 * is why `16.5` and `8.25` are exact and `16.255` is refused rather than
 * silently truncated to a rate the shop did not set.
 *
 * ⚠️ `100` AND ABOVE IS REFUSED, BECAUSE `product_variant_tax_rate_sane` IS
 * `tax_rate >= 0 and tax_rate < 1`. A hundred percent tax is not a shopkeeper's
 * mistake to be repaired, and letting it reach the wire would be a `23514`
 * wearing this app's honest catch-all for a row we should never have sent.
 *
 * ⚠️ AN EMPTY BOX IS NOT ZERO AND ANSWERS `null` — `priceOmitted`'s distinction,
 * made here for the same reason. `0002` defaults `tax_rate` to 0 because most
 * basic groceries in Mexico are exempt, so *leave it alone* and *set it to zero*
 * produce the same row today and are different instructions; `variantSettings`
 * is what declines to send a column nobody typed into.
 */
export function parseTaxRate(typed: string): string | null {
  const figure = typed.replace(/[\s%]/g, '');
  if (figure === '') return null;
  try {
    const hundredths = parseDecimal(figure, PERCENT_SCALE);
    if (hundredths < 0 || hundredths >= RATE_CEILING) return null;
    return formatDecimal(hundredths, SCALE.rate);
  } catch {
    return null;
  }
}

/** A percentage read to two decimals is a rate read to four. See `parseTaxRate`. */
const PERCENT_SCALE = SCALE.rate - 2;

/** `tax_rate < 1` as an integer at scale 4 — 100% and up is refused. */
const RATE_CEILING = 10_000;

/**
 * `product_variant.pack_size` for a figure a shopkeeper typed.
 *
 * ⚠️ IT IS `numeric(14,3)` AND `product_variant_pack_size_positive` IS
 * `pack_size > 0`, so zero is refused as well as a negative — a case of nothing
 * is not a case. `0002`'s example is the one that explains the column: *"a case
 * of 24 pieces is pack_size 24 with both units 'pza'."*
 *
 * ⚠️ AN EMPTY BOX ANSWERS `null` AND MEANS *leave it*, exactly as the tax rate
 * does. `0002` defaults it to 1, which is right for everything a pollería sells
 * loose, and a `1` this app sent on its own would be indistinguishable from a `1`
 * the shopkeeper chose.
 */
export function parsePackSize(typed: string): string | null {
  const figure = typed.replace(/[\s,]/g, '');
  if (figure === '') return null;
  try {
    const thousandths = parseDecimal(figure, SCALE.quantity);
    if (thousandths <= 0) return null;
    return formatDecimal(thousandths, SCALE.quantity);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// THE THREE PATCHES ON `product_variant`
// ----------------------------------------------------------------------------

/** What the form holds. Every box is text, and every box may be left alone. */
export interface VariantEdit {
  readonly name: string;
  /** IVA as the shopkeeper types it: a PERCENTAGE. `16`, not `0.16`. */
  readonly taxPercent: string;
  readonly packSize: string;
}

/** `{ name }`. `NAME_PATCH_COLUMNS`. */
export interface NamePatch {
  readonly name: string;
}

/** `{ tax_rate?, pack_size? }`. `SETTINGS_PATCH_COLUMNS`. */
export interface SettingsPatch {
  readonly tax_rate?: string;
  readonly pack_size?: string;
}

/** `{ is_active }`. `ACTIVE_PATCH_COLUMNS`. */
export interface ActivePatch {
  readonly is_active: boolean;
}

/**
 * The rename, or `null` when the name did not change.
 *
 * ⚠️ THE NAME IS TRIMMED AND ITS INNER SPACES COLLAPSED, exactly as `familyRow`
 * and `variantRow` fold it and exactly as `normalize_name` will fold it for the
 * uniqueness key — so a rename from `Pechuga` to `Pechuga ` is NOT a rename, and
 * sending it would be a round trip to store a string the shop cannot tell from
 * the one it had.
 *
 * ⚠️ `null` RATHER THAN AN EMPTY PATCH, because PostgREST answers a body with no
 * columns in it with a `PGRST102`, and the caller's *there is nothing to do here*
 * must not depend on reading that back.
 */
export function namePatch(current: string, typed: string): NamePatch | null {
  const name = typed.replace(/\s+/g, ' ').trim();
  if (name === '' || name === current.replace(/\s+/g, ' ').trim()) return null;
  return { name };
}

/**
 * The tax rate and the pack size, as a patch carrying ONLY the boxes that were
 * filled in — or `null` when neither was.
 *
 * ⚠️⚠️ AN UNTOUCHED BOX SENDS NO COLUMN, WHICH IS THE WHOLE OF THIS FUNCTION.
 * `0002` defaults `tax_rate` to 0 and `pack_size` to 1 on purpose, for a shop
 * selling basic groceries in Mexico; sending those values back explicitly would
 * look identical in the row and would be this app answering a question nobody
 * asked it — the argument `VARIANT_INSERT_COLUMNS` already makes about the same
 * two columns on the way in.
 */
export function variantSettings(edit: VariantEdit): SettingsPatch | null {
  const taxRate = parseTaxRate(edit.taxPercent);
  const packSize = parsePackSize(edit.packSize);
  if (taxRate === null && packSize === null) return null;
  return {
    ...(taxRate === null ? {} : { tax_rate: taxRate }),
    ...(packSize === null ? {} : { pack_size: packSize }),
  };
}

/**
 * Retiring a product, and bringing one back.
 *
 * ⚠️⚠️ IT IS `is_active` AND NEVER A DELETE, AND THE DATABASE AGREES RATHER THAN
 * MERELY ALLOWING IT: `product_family` and `product_variant` have NO delete
 * policy at all in `0002` — *"a family with ledger history is deactivated, never
 * deleted"* is written in the migration beside the policies that are there. So a
 * DELETE from this app is a `42501` and not a mistake a screen could make by
 * accident, and a product with sales behind it stays in the ledger that has to
 * add up.
 *
 * ⚠️ IT IS REVERSIBLE AND THE INVERSE IS THE SAME CALL, which is what makes
 * retiring safe to offer at all: `catalogFrom` drops inactive variants from
 * Productos, so a mis-tap looks exactly like a deletion to the person who made
 * it, and the only thing standing between that and a support call is that it can
 * be undone.
 */
export function activePatch(active: boolean): ActivePatch {
  return { is_active: active };
}

// ----------------------------------------------------------------------------
// THE PRICE CHANGE — THE DATED WINDOW, AND ITS THREE BRANCHES
// ----------------------------------------------------------------------------

/**
 * A `price_list` row as the EDIT reads it — `PRICE_EDIT_COLUMNS`.
 *
 * ⚠️ IT EXTENDS `PriceRow` RATHER THAN RESTATING IT, so `priceFor` can resolve
 * the scope over these rows without a second copy of *a store's own price beats
 * the shop-wide one*.
 */
export interface PriceInForce extends PriceRow {
  readonly id: string;
  readonly effective_from: string;
  readonly effective_to: string | null;
}

/** A `price_list` row as this module posts it — `PRICE_INSERT_COLUMNS`. */
export interface PriceOpen {
  readonly workspace_id: string;
  readonly variant_id: string;
  readonly location_id: string | null;
  readonly price_per_base: string;
  readonly effective_from: string;
  readonly effective_to: string | null;
}

/**
 * What changing a price actually is, once the dated window has been read.
 *
 * ⚠️ `unchanged` IS A BRANCH AND NOT A SHORTCUT. Closing a row and opening an
 * identical one is two round trips on a link the pilot store loses half the day,
 * and it leaves the shop's price history claiming a change that never happened —
 * which is a lie `7`'s reports would eventually read.
 */
export type PriceChange =
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'open'; readonly open: PriceOpen }
  | { readonly kind: 'reprice'; readonly rowId: string; readonly patch: { readonly price_per_base: string } }
  | {
      readonly kind: 'closeAndOpen';
      readonly closeRowId: string;
      readonly closePatch: { readonly effective_to: string };
      readonly open: PriceOpen;
    };

/**
 * What a price change IS, for this variant, today — the one decision in this
 * module that would go in wrong silently.
 *
 * ⚠️⚠️ READ THE HEADER'S THREE BRANCHES FIRST; this is them, in the order a day
 * produces them. The `reprice` branch is the one a screen would never think to
 * write, because it only happens the SECOND time a price is corrected in one
 * day — and it is not an optimisation, it is the only thing Postgres will accept:
 * `price_list_range_ordered` refuses `effective_to = effective_from`.
 *
 * ⚠️ `today` IS THE DEVICE'S LOCAL DAY AND COMES IN AS AN ARGUMENT (`R3`), for
 * `priceRow`'s recorded reason: `isoDay` in `@/api/catalog` already owns *what
 * day is it where the shop stands*, and a second answer here would be `0018`'s
 * off-by-one in the other direction.
 *
 * ⚠️ THE SCOPE IS THE RESOLVED ROW'S, NOT THE PHONE'S. When a row is in force,
 * the new row inherits ITS `location_id` — so correcting a store's own price
 * stays a store price and correcting the shop-wide one stays shop-wide. Only a
 * product with NO price at all is priced shop-wide by default, which is `5e-i`'s
 * decision A and the only place this module picks a scope at all.
 */
export function priceChange(
  workspaceId: string,
  variantId: string,
  prices: readonly PriceInForce[] | null | undefined,
  locationId: string | null,
  today: string,
  pricePerBaseText: string,
): PriceChange {
  const inForce = priceFor(prices, locationId) as PriceInForce | null;

  if (inForce === null) {
    return {
      kind: 'open',
      open: openRow(workspaceId, variantId, null, pricePerBaseText, today),
    };
  }

  if (inForce.price_per_base === pricePerBaseText) return { kind: 'unchanged' };

  if (inForce.effective_from === today) {
    return {
      kind: 'reprice',
      rowId: inForce.id,
      patch: { price_per_base: pricePerBaseText },
    };
  }

  return {
    kind: 'closeAndOpen',
    closeRowId: inForce.id,
    closePatch: { effective_to: today },
    open: openRow(workspaceId, variantId, inForce.location_id, pricePerBaseText, today),
  };
}

/** The row every opening branch posts. `PRICE_INSERT_COLUMNS`, in its order. */
function openRow(
  workspaceId: string,
  variantId: string,
  locationId: string | null,
  pricePerBaseText: string,
  today: string,
): PriceOpen {
  return {
    workspace_id: workspaceId,
    variant_id: variantId,
    location_id: locationId,
    price_per_base: pricePerBaseText,
    effective_from: today,
    effective_to: null,
  };
}

/**
 * The typed peso figure as `price_per_base`, or `null` when it is not a price.
 *
 * ⚠️ IT IS `pricePerBase` FROM `@/api/catalogWrite` AND NOT A SECOND INVERSE OF
 * `priceCentavos`. That function is already the exact inverse of the catalog
 * read's arithmetic, walked over all ten seeded units by
 * `app/test/api-catalog-write.test.ts`; a second one here is the third copy of a
 * rule that must round the same way in all of them.
 *
 * ⚠️ AN EMPTY BOX ANSWERS `null`, AND THAT IS NOT *"remove the price"*. Nothing
 * in this module deletes a price row — `price_list_delete` exists in `0002` and
 * is deliberately unused here, because *this product has no price* and *this
 * product's price was withdrawn today* are two different facts and C3.12 draws
 * only the first. Un-pricing a product is not on `Editar` and is not `5e-iii`'s.
 */
export function editPricePerBase(typed: string, factorText: string | undefined): string | null {
  if (priceOmitted(typed)) return null;
  const centavos = parsePesos(typed);
  if (centavos === null) return null;
  return pricePerBase(centavos, factorText ?? '');
}

// ----------------------------------------------------------------------------
// THE WINDOW, AS THE EDIT READ ASKS FOR IT
// ----------------------------------------------------------------------------

/**
 * The half of the price window PostgREST cannot express as one filter, for the
 * edit's own read.
 *
 * ⚠️ IT IS `priceEndsAfter` AND `PRICE_STARTS_COLUMN` FROM `@/api/catalog`,
 * RE-EXPORTED RATHER THAN RESPELLED. That module's header already records why
 * the obvious `valid_period=cs.<date>` spelling answers `400 22P02`, and *which
 * row is in force* must be one predicate in this app: two answers to that is two
 * prices, and the second one is whichever the screen happened to ask.
 */
export { priceEndsAfter, PRICE_STARTS_COLUMN } from '@/api/catalog';

/** The query key one variant's dated price rows cache under. */
export const PRICE_EDIT_KEY = ['catalog', 'prices'] as const;

// ----------------------------------------------------------------------------
// WHAT THE FORM MUST NOT SEND
// ----------------------------------------------------------------------------

/** The keys of `ES.catalog.editIssues`, so a refusal cannot be typed in a screen. */
export type EditIssue = keyof typeof ES.catalog.editIssues;

/**
 * What is wrong with the edit, as a KEY of `ES.catalog.editIssues` — or `null`
 * when it is one Postgres will accept.
 *
 * ⚠️⚠️ THE DUPLICATE CHECK MUST EXCLUDE THE PRODUCT BEING EDITED, AND THIS IS
 * THE ONE LINE IN HERE THAT WOULD HAVE SHIPPED WRONG BY COPYING `checkProduct`.
 * That function refuses any name the catalog already holds, which is right when
 * the product does not exist yet; here the catalog holds THIS product, so the
 * same test refuses a shopkeeper who opened `Editar` and changed the price
 * without touching the name.
 *
 * ⚠️ IT FOLDS WITH `searchKey` AND NOT `searchTerm`, for `checkProduct`'s
 * measured reason: `normalize_name` folds case and spaces and NOT accents, so a
 * check that folded accents would refuse `Plátano` in a shop that already has
 * `Platano` and the update would have succeeded.
 *
 * ⚠️ THE ORDER IS THE FORM'S READING ORDER — name, tax, pack, price.
 */
export function checkEdit(
  variantId: string,
  edit: VariantEdit,
  pricePesos: string,
  entries: readonly CatalogEntry[],
  factors: UnitFactors,
  unitCode: string,
): EditIssue | null {
  if (searchKey(edit.name) === '') return 'nameMissing';
  if (
    entries.some(
      (entry) => entry.id !== variantId && searchKey(entry.name) === searchKey(edit.name),
    )
  ) {
    return 'duplicate';
  }
  if (edit.taxPercent.replace(/[\s%]/g, '') !== '' && parseTaxRate(edit.taxPercent) === null) {
    return 'taxUnreadable';
  }
  if (edit.packSize.replace(/[\s,]/g, '') !== '' && parsePackSize(edit.packSize) === null) {
    return 'packUnreadable';
  }
  if (priceOmitted(pricePesos)) return null;
  if (editPricePerBase(pricePesos, factors[unitCode]) === null) return 'priceUnreadable';
  return null;
}

// ----------------------------------------------------------------------------
// WHAT CAME BACK, AND WHAT IS LEFT BEHIND WHEN IT DIDN'T
// ----------------------------------------------------------------------------

/** Which call of a price change did not go through. */
export type PriceStep = 'close' | 'open' | 'reprice';

/** The change landed — or there was nothing to do, which is also a success. */
export interface PriceChangeSucceeded {
  readonly ok: true;
  /** ⚠️ `false` for `unchanged`, so a confirmation cannot claim work nobody did. */
  readonly changed: boolean;
}

/**
 * It did not — and `closed` is the field this whole module exists to carry.
 *
 * ⚠️⚠️ `closed: true` MEANS THE PRODUCT IS PRICELESS RIGHT NOW. The old row ended
 * at today and the new one never opened, so the window a catalog read applies
 * finds nothing and C3.12's dash is on the shelf. A screen that showed the
 * ordinary *"no se pudo guardar"* here would be telling a shopkeeper that nothing
 * happened, about the one failure where something did.
 */
export interface PriceChangeFailed {
  readonly ok: false;
  readonly failed: PriceStep;
  readonly closed: boolean;
  readonly error: unknown;
}

/** What `changePrice` in `@/api/calls` answers with. */
export type PriceChangeOutcome = PriceChangeSucceeded | PriceChangeFailed;

/**
 * The change to try again with, after a half-done one.
 *
 * ⚠️⚠️ IT RE-OPENS RATHER THAN RE-CLOSING, AND WITHOUT THIS THE RETRY IS A
 * DIFFERENT WRITE FROM THE ONE THAT FAILED. A `closeAndOpen` whose second call
 * died has already closed the old row; re-running the same plan patches
 * `effective_to` to the value it already holds — harmless in itself — and then
 * posts the same insert, so it would work. What would NOT work is re-PLANNING
 * from a fresh read while the screen still holds the old rows: the row in force
 * is gone, and a plan built from stale rows would try to close a row that is
 * already closed and then insert against an overlap that is no longer there.
 * Returning the insert alone makes the retry say exactly what is left to do.
 *
 * ⚠️ EVERY OTHER FAILURE IS THE WHOLE PLAN AGAIN, because nothing landed: a
 * failed `close` changed nothing, and a failed `reprice` is one call that either
 * happened or did not.
 */
export function retryChange(plan: PriceChange, outcome: PriceChangeFailed): PriceChange {
  if (plan.kind === 'closeAndOpen' && outcome.closed) {
    return { kind: 'open', open: plan.open };
  }
  return plan;
}

// ----------------------------------------------------------------------------
// THE REFUSALS A SHOPKEEPER CAN ACTUALLY REACH ON AN EDIT
// ----------------------------------------------------------------------------

/** `23505` — a unique constraint, and on this path only the variant's name. */
const DUPLICATE = '23505';
/** `42501` — the manager fence on `product_variant_update` and both price policies. */
const FORBIDDEN = '42501';
/**
 * `23P01` — `price_list_no_overlap`, the GiST exclusion. ⚠️ REACHABLE ONLY FROM A
 * STALE READ: another phone priced this product since, or a future-dated row
 * exists that nothing in this app creates. It is the shopkeeper's to recover from
 * by re-opening the product, which is why it gets a sentence rather than the
 * catch-all.
 */
const OVERLAP = '23P01';
/** `23514`/`23503` — a row we should never have sent. `checkEdit` is what stops them. */
const REJECTED: readonly string[] = ['23514', '23503'];
/**
 * ⚠️⚠️ `PGRST116` — ZERO ROWS, AND ON THIS PATH THAT IS THE FENCE. Measured
 * 2026-09-23 against the applied schema: a cashier's PATCH of `product_variant`
 * or `price_list` comes back **200 with `[]`**, because a `using` clause excludes
 * the row from being seen rather than refusing the write. `.single()` is what
 * turns that into a **406** an app can act on. See the header.
 */
const NO_ROWS = 'PGRST116';

function codeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function messageOf(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : '';
}

/**
 * What a shopkeeper is told when an edit is refused.
 *
 * ⚠️⚠️ `42501` IS NOT `catalogWriteErrorMessage`'s SENTENCE, AND THE VERB IS THE
 * REASON. That one says *"puede agregar productos"*, which is true of a create
 * and wrong of a rename — a manager demoted mid-shift, told she may not ADD a
 * product while looking at one she is trying to RENAME, has been given an
 * accurate sentence about the wrong thing. ⚠️ And it is still not *"tu sesión se
 * cerró"*: `@/api/errors` maps `42501` to a sign-in loop that cannot end, which
 * is `redeemErrorMessage`'s recorded argument and `catalogWriteErrorMessage`'s.
 *
 * ⚠️⚠️ `PGRST116` IS THE SAME REFUSAL ARRIVING WITHOUT A CODE OF ITS OWN, AND
 * MAPPING IT IS THE WHOLE REASON THIS FUNCTION IS NOT `catalogWriteErrorMessage`.
 * An UPDATE a `using` clause excludes is not refused, it is INVISIBLE — 200 and
 * an empty array — so `42501` never fires on a rename, a retirement or a
 * reprice. Measured on both tables, 2026-09-23. A cashier who was told *"listo"*
 * about a price that did not move is worse off than one who was told no.
 *
 * ⚠️ `23P01` IS NEW ON THIS PATH AND EXISTS NOWHERE ELSE IN THIS APP.
 * `price_list_no_overlap` is the constraint the whole table was designed around,
 * and the only way a correctly planned change reaches it is a read that went
 * stale under the screen. The sentence sends her back to the product rather than
 * to the price box, because re-typing the same figure would be refused again.
 *
 * ⚠️ EVERYTHING ELSE GOES DOWN `apiErrorMessage`, so *sin conexión* stays the one
 * sentence this app gives for a lost link.
 */
export function catalogEditErrorMessage(error: unknown): string {
  const code = codeOf(error);
  if (code === FORBIDDEN || code === NO_ROWS) return ES.catalog.errors.notAllowedEdit;
  if (code === OVERLAP) return ES.catalog.errors.overlap;
  if (code === DUPLICATE) {
    const message = messageOf(error);
    for (const constraint of Object.keys(CATALOG_WRITE_REFUSALS)) {
      if (message.includes(constraint)) return ES.catalog.errors[CATALOG_WRITE_REFUSALS[constraint]];
    }
    return ES.catalog.errors.duplicate;
  }
  if (code !== null && REJECTED.includes(code)) return ES.catalog.errors.rejected;
  return apiErrorMessage(error);
}

/**
 * The one sentence the form shows after a failed price change — and the only
 * place the half-done state becomes visible.
 *
 * ⚠️⚠️ A FAILURE AFTER THE CLOSE IS NOT A FAILURE TO CHANGE THE PRICE, IT IS A
 * PRICE THAT IS GONE. `createLine` makes the same distinction one module over for
 * a product that saved without its price; this is the sharper version of it,
 * because here the shop HAD a price and now does not. Saying *"no se pudo
 * guardar"* would send a shopkeeper away believing the old price still stands,
 * and the next customer is charged nothing at all.
 */
export function priceChangeLine(outcome: PriceChangeFailed): string {
  if (outcome.closed) return ES.catalog.errors.priceGone;
  return catalogEditErrorMessage(outcome.error);
}
