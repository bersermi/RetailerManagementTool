// ============================================================================
// THE SHOP CHANGING A PRODUCT IT ALREADY HAS, AS A CONTRACT WITH POSTGRES. Plan
// task `5e-iii-a`, and the first module in `app/` that UPDATES anything in the
// catalog — `@/api/catalogWrite` is the same three tables created, and this is
// what happens to them afterwards.
//
// ⚠️⚠️ IT SHIPS NO SCREEN AND NO COMPONENT. `5e-iii-b` draws `Editar` and
// `5h.5` owns `src/ui/`; what is here is everything about that form which has a
// RIGHT ANSWER — the patches, the arithmetic of the two figures and the refusals —
// so that
// `app/test/api-catalog-edit.test.ts` and
// `docs/checks/5e-iii-a-catalog-edit-contract.sh` can both read it. §2.11 keeps
// rendering out of scope; this is the half of `5e-iii` that is not rendering.
//
// ⚠️⚠️ SINCE `8i` THE PRICE IS NOT WRITTEN HERE. Until 2026-11-01 this module
// planned a price change as two PostgREST writes — close the row in force, then
// open the new one, because `price_list_no_overlap` refuses two rows covering one
// day — and named the state a failure between the two left behind: the product
// priced yesterday and priceless today. The owner's ruling of that day moved the
// price to one function that does both in one transaction (`set_shelf_price`,
// `0074`), sent from a queue on the phone so it is set with or without signal
// (`@/api/shelfPrice`). What is left here is the rest of `Editar`: the name, the
// two figures, the aisle, the photo and retiring.
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
// ⚠️⚠️ AND C3.17 SAID THE FENCE SHOULD NOT BE THERE AT ALL — RULED 2026-09-23,
// AND THE FENCE STAYS. *"Any role may change a price, including a cashier"*, with
// a closing sentence that it is *"client-side only; no schema depends on it"*,
// which was FALSE against the applied schema from `0002` on 2026-08-26. The
// owner's answer was **"leave the fence as is"**: the database stays
// manager-and-above on all three `price_list` policies and on
// `product_variant_update`, and C3.17 has been corrected rather than widened. So
// **this module describes the fence the database applies today AND the one the
// owner intends**, which it did not on the day it was written — and `5e-iii-b`
// draws `Editar` manager-only rather than letting a cashier meet the 200 above.
// ============================================================================

import { SCALE, formatDecimal, parseDecimal } from '@tienda/money';

import { searchKey, type CatalogEntry } from '@/api/catalog';
import { CATALOG_WRITE_REFUSALS } from '@/api/catalogWrite';
import { apiErrorMessage } from '@/api/errors';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// THE TABLES AND THE COLUMNS, SPELLED ONCE (`R13`)
// ----------------------------------------------------------------------------

/** The table a rename, the two settings and a retirement all patch. */
export const VARIANT_TABLE = 'product_variant';

/**
 * The two figures the form has to SHOW before it can let anybody change them —
 * `5e-iii-b`'s read, and the one column list in this module that exists for
 * rendering rather than for a write.
 *
 * ⚠️⚠️ WITHOUT IT THE IVA BOX IS BLIND, AND A BLIND BOX IS WHERE THIS APP WOULD
 * HAVE ASKED A SHOPKEEPER TO GUESS. `variantSettings` deliberately sends no
 * column for a box nobody typed into, so an empty form cannot overwrite
 * anything — but *what is the IVA on this product right now* is a question the
 * catalog read cannot answer, because `VARIANT_COLUMNS` in `@/api/catalog`
 * carries neither column and is paid for on every load of Productos for ~100
 * products (C8.3). This read is for ONE variant, on the screen that changes it —
 * `PRICE_EDIT_COLUMNS`' own argument, applied to the other two figures.
 *
 * ⚠️ BOTH AS `::text` FOR `PRICE_EDIT_COLUMNS`' REASON: `numeric(5,4)` and
 * `numeric(14,3)` arrive as JSON numbers otherwise, and `parseDecimal` refuses a
 * number outright rather than letting a double into the money path.
 *
 * ⚠️ `enforce_stock` IS NOT HERE EITHER (C8.8). A column absent from every list
 * in this module is a column a screen cannot draw by accident — which is what
 * that constraint needs, since C8.6 guarantees permanent drift in both
 * directions and this is the one pilot screen that would have offered the switch.
 *
 * ⚠️⚠️ AND `is_prebuilt` IS THE THIRD COLUMN SINCE `6c`, WHICH IS NOT A FIGURE AND
 * IS HERE FOR THIS READ'S OWN STATED REASON. It decides whether the retire control
 * is drawn at all, and the alternative was `VARIANT_COLUMNS` in `@/api/catalog` —
 * paid for on every load of Productos for ~100 products (C8.3) to answer a question
 * exactly one screen asks. ⚠️ **It is NOT `::text`**: the other two are cast because
 * `numeric` arrives as a JSON double and `parseDecimal` refuses one outright; a
 * boolean has no such problem and casting it would hand `canRetireProduct` the
 * string `'false'`, which is truthy.
 */
export const VARIANT_EDIT_COLUMNS = 'id,tax_rate::text,pack_size::text,is_prebuilt';

/**
 * One variant's two set-once figures and where it came from, as
 * `VARIANT_EDIT_COLUMNS` returns them.
 *
 * ⚠️ THE KEYS ARE POSTGRES SPELLINGS AND NOT THIS APP'S, which is every row
 * interface in this module: a renamed column is then a typecheck failure rather
 * than an `undefined` that reads as `false`.
 */
export interface VariantSettingsRow {
  readonly id: string;
  readonly tax_rate: string;
  readonly pack_size: string;
  readonly is_prebuilt: boolean;
}

/**
 * May THIS product be retired?
 *
 * ⚠️⚠️ TWO REASONS A CONTROL CAN BE ABSENT, KEPT AS TWO THINGS — `canRetire`'s
 * shape in `@/api/providerDirectory`, which took it from this screen's own ruling.
 * `mayWrite` is a question about the PERSON (`canWriteCatalog`, and an RLS UPDATE
 * refusal here is SILENT) and `is_prebuilt` is a question about the ROW. Folding
 * them into one boolean would make *you are not allowed* and *this one is not
 * yours* indistinguishable in a log.
 *
 * ⚠️⚠️ AND A READ THAT HAS NOT LANDED IS `false` RATHER THAN OPTIMISTIC. `null`
 * here means the one-variant settings read is still out, and drawing the control on
 * a guess is how this screen came to be offering it on every product in the shop —
 * the defect the owner found on his own phone on 2026-09-23. **Absent until the
 * database has said so.**
 *
 * ⚠️⚠️ SINCE `0054` (THE OWNER, 2026-10-14) THE ROW NO LONGER DECIDES IT. Onboarding
 * stopped offering a per-product list and brings every product of a giro, so a
 * product that came with the app is retired like the shop's own. `is_prebuilt` is
 * still READ — the settings read landing is what the control waits for — and it no
 * longer says no. The two reasons above remain two things in the database, where
 * the marker still refuses a demotion and a delete.
 *
 * ⚠️ THERE IS NO *already retired* BRANCH, WHICH IS WHERE THIS DIFFERS FROM
 * `canRetire`'s three. A retired product is not reachable: `catalogFrom` drops
 * `is_active` false, so Productos never lists one and this screen is only ever
 * opened from Productos. The branch would be unreachable code asserting a state
 * nothing can produce — and `VARIANT_EDIT_COLUMNS` does not read `is_active` for
 * that reason rather than by omission.
 */
export function canRetireProduct(
  settings: VariantSettingsRow | null,
  mayWrite: boolean,
): boolean {
  if (settings === null || !mayWrite) return false;
  return true;
}

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
/** ⚠️ `8g`: the shop's own product moved to another aisle — `FamilyPatch`. */
export const FAMILY_PATCH_COLUMNS = 'family_id';

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

/**
 * `tax_rate` as the shopkeeper's own figure — `0.1600` becomes `16`.
 *
 * ⚠️⚠️ IT IS SHOWN BESIDE THE BOX AND NEVER PUT INSIDE IT, WHICH IS THE OWNER'S
 * RULING OF 2026-09-23 APPLIED TO AN EDIT. *A proposal must not look like a
 * decision already made* — and a box PREFILLED with the current IVA is worse than
 * a proposal, because `variantSettings` would then send the column back on a save
 * the shopkeeper made for a different field entirely. An empty box means *leave it
 * alone*; this is the fact printed next to it so *leave it alone* is an informed
 * choice rather than a blind one.
 *
 * ⚠️ THE TRAILING ZEROS GO, AND ONLY THOSE. `16.00` is the column's shape and
 * `16` is the shopkeeper's; `16.50` keeps its half, because trimming that would be
 * a rate this app rounded on his behalf. ⚠️ An unreadable figure answers `''` and
 * the screen shows nothing — a row the database could not have stored is ours to
 * notice, not his ([[users-dont-do-bookkeeping]]).
 */
export function taxPercentOf(rate: string): string {
  try {
    return trimZeros(formatDecimal(parseDecimal(rate, SCALE.rate), PERCENT_SCALE));
  } catch {
    return '';
  }
}

/** `pack_size` as the shopkeeper's own figure — `24.000` becomes `24`. See above. */
export function packSizeOf(size: string): string {
  try {
    return trimZeros(formatDecimal(parseDecimal(size, SCALE.quantity), SCALE.quantity));
  } catch {
    return '';
  }
}

/**
 * ⚠️ THE POINT GOES WITH ITS ZEROS — `24.000` is `24` and never `24.`, which is
 * what this would render if it were one `replace`.
 *
 * ⚠️ THE FIRST LINE IS DEFENSIVE AND IS NOT REACHED BY EITHER CALLER TODAY, said
 * here rather than left to look like a live rule: `formatDecimal` at a positive
 * scale always emits a point, and both callers pass one. It is what stops `100`
 * becoming `1` the day something calls this at scale 0.
 */
function trimZeros(figure: string): string {
  if (!figure.includes('.')) return figure;
  return figure.replace(/0+$/, '').replace(/\.$/, '');
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
 * `{ family_id }` — ⚠️ `8g`: the shop's own product moved to another aisle (the
 * owner's ruling of 2026-10-17, *Editar* carries the aisle). ⚠️⚠️ ONE DIMENSION
 * PER FAMILY (C8.5) IS NOT THE DATABASE'S TO HOLD, SO THE CHOICES ARE:
 * `aislesFor` in `@/api/productPage` offers only aisles whose products are sold
 * in the same kind of unit, and this is the write it makes.
 */
export interface FamilyPatch {
  readonly family_id: string;
}

/** The move, or `null` when the aisle did not change. */
export function familyPatch(current: string, chosen: string | null): FamilyPatch | null {
  if (chosen === null || chosen === current) return null;
  return { family_id: chosen };
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

/**
 * The cache key of the two set-once figures. ⚠️ ITS OWN KEY AND NOT A BRANCH OF
 * `CATALOG_KEY`: it is read for ONE variant, on one screen, and invalidating the
 * whole catalog to refresh an IVA would refetch ~100 products (C8.3) on a
 * connection the pilot store loses half the day.
 */
export const VARIANT_EDIT_KEY = ['catalog', 'settings'] as const;

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
 * same test refuses a shopkeeper who opened `Editar` and changed the aisle
 * without touching the name.
 *
 * ⚠️ IT FOLDS WITH `searchKey` AND NOT `searchTerm`, for `checkProduct`'s
 * measured reason: `normalize_name` folds case and spaces and NOT accents, so a
 * check that folded accents would refuse `Plátano` in a shop that already has
 * `Platano` and the update would have succeeded.
 *
 * ⚠️ THE ORDER IS THE FORM'S READING ORDER — name, tax, pack. A price is not
 * checked here since `8i`: the price sheet's `pricePlan` (`@/api/shelfPrice`).
 */
export function checkEdit(
  variantId: string,
  edit: VariantEdit,
  entries: readonly CatalogEntry[],
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
  return null;
}

// ----------------------------------------------------------------------------
// THE REFUSALS A SHOPKEEPER CAN ACTUALLY REACH ON AN EDIT
// ----------------------------------------------------------------------------

/** `23505` — a unique constraint, and on this path only the variant's name. */
const DUPLICATE = '23505';
/** `42501` — the manager fence on `product_variant_update`. */
const FORBIDDEN = '42501';
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
/**
 * ⚠️⚠️ `23001` — `restrict_violation`, AND IT IS `0042`'s FENCE ARRIVING AS AN HTTP
 * **400**. Measured over a real PostgREST on 2026-09-27: retiring a row whose
 * `is_prebuilt` is true answers
 * `400 {"code":"23001","message":"a prebuilt product_variant cannot be retired: …"}`.
 * **Not a 403 and not a 409** — a trigger's exception is not a privilege error and
 * not a uniqueness conflict, so nothing in this app would have recognised it
 * ([[custom-sqlstate-arrives-as-400]]).
 *
 * ⚠️⚠️ AND THE APP IS NOT SUPPOSED TO BE ABLE TO SEND IT, WHICH IS WHY MAPPING IT
 * MATTERS RATHER THAN WHY IT DOES NOT. `canRetireProduct` keeps the control off a
 * prebuilt row, so the only way here is a `settings` read that went stale under the
 * screen — the same window `23P01` exists for. Unmapped it would reach a shopkeeper
 * as `apiErrorMessage`'s fallback, which says nothing she could act on about a
 * product she is not allowed to remove.
 */
const NOT_HERS = '23001';

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
 * about a change that did not happen is worse off than one who was told no.
 *
 * ⚠️⚠️ `23001` IS `6c`'s AND IT IS THE FIRST SQLSTATE IN THIS APP THAT MEANS *THIS
 * ROW IS NOT YOURS* RATHER THAN *YOU ARE NOT ALLOWED*. The distinction is the whole
 * of `0042`: the same manager who may rename and reprice this product may not remove
 * it, so `notAllowedEdit`'s sentence about permission would be false. `canRetireProduct`
 * is the fence and this is the belt to it.
 *
 * ⚠️ EVERYTHING ELSE GOES DOWN `apiErrorMessage`, so *sin conexión* stays the one
 * sentence this app gives for a lost link.
 */
export function catalogEditErrorMessage(error: unknown): string {
  const code = codeOf(error);
  if (code === FORBIDDEN || code === NO_ROWS) return ES.catalog.errors.notAllowedEdit;
  if (code === NOT_HERS) return ES.catalog.errors.notYours;
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

// ----------------------------------------------------------------------------
// THE WHOLE SAVE, AND THE ORDER ITS WRITES GO IN — `5e-iii-b`
// ----------------------------------------------------------------------------
//
// ⚠️⚠️ `Editar` IS MORE THAN ONE WRITE BEHIND ONE BUTTON — a rename and the two
// settings, across two calls with no transaction between them — and *which goes
// first* and *what a failure leaves* are questions with right answers. A form
// that answered them in its own JSX would be the seam `5e-iii`'s split exists to
// keep, broken from the other side.
//
// ⚠️⚠️ THE ORDER IS name → settings, AND IT STOPS AT THE FIRST FAILURE. THE NAME
// GOES FIRST BECAUSE IT IS THE ONE THAT CAN BE REFUSED `23505`:
// `product_variant_name_unique` is shop-wide, so a rename onto a name another
// product already holds is a real and ordinary refusal — and stopping there
// leaves the IVA and the pack size exactly as they were. The other way round, a
// shopkeeper whose rename was refused would still have had his tax rate changed
// under a name he is about to abandon.
//
// ⚠️ THE PRICE WAS THE LAST STEP UNTIL `8i`, because it was the only one that
// could half-happen. It is not a step at all now: it is queued on the phone by
// the price sheet and lands whole or not at all (`@/api/shelfPrice`).
//
// ⚠️ AND THERE IS NO `retryPlan`. Every step that touched the database refreshes
// the reads, so the next tap re-plans from fresh rows: a name that landed folds
// to `null` in `namePatch` because `current` is now that name.
// ----------------------------------------------------------------------------

/** Which of the save's steps is being talked about. */
export type EditStep = 'name' | 'settings';

/** ⚠️ THE ORDER IS THE DELIVERABLE. See the section header. */
export const EDIT_ORDER: readonly EditStep[] = ['name', 'settings'];

/**
 * Everything one tap of *Guardar* has to do — and `null` for every part of the
 * form that was left alone.
 */
export interface EditPlan {
  readonly name: NamePatch | null;
  readonly settings: SettingsPatch | null;
}

/**
 * The writes one tap owes, built out of the form and the name the catalog holds.
 *
 * ⚠️⚠️ AN UNTOUCHED BOX PRODUCES NOTHING, AND THAT IS THE WHOLE OF THIS
 * FUNCTION. `namePatch` answers `null` for a name that did not move and
 * `variantSettings` answers `null` when neither figure was typed, so a
 * shopkeeper who opened `Editar`, read it and tapped *Guardar* performs **zero
 * round trips**, on a link this shop loses half the day.
 */
export function editPlan(currentName: string, edit: VariantEdit): EditPlan {
  return {
    name: namePatch(currentName, edit.name),
    settings: variantSettings(edit),
  };
}

/** Is there anything for Postgres to do at all? See `editPlan`. */
export function editTouches(plan: EditPlan): boolean {
  return plan.name !== null || plan.settings !== null;
}

/** The save landed. ⚠️ `changed` is false when the plan touched nothing, so a
 *  confirmation cannot claim work nobody did. */
export interface EditDone {
  readonly ok: true;
  readonly changed: boolean;
}

/** It did not — the step that was refused, and why. */
export interface EditFailed {
  readonly ok: false;
  readonly failed: EditStep;
  readonly error: unknown;
}

export type EditOutcome = EditDone | EditFailed;

/**
 * The one sentence a failed save shows.
 *
 * ⚠️ IT IS ONE SLOT AND NOT ONE PER STEP, which is `Agregar`'s arrangement and
 * its reason: a screen with a line per step can show two contradictory refusals
 * at once, and the second one is always the stale one.
 */
export function editLine(outcome: EditFailed): string {
  return catalogEditErrorMessage(outcome.error);
}
