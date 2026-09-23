// ============================================================================
// THE SHOP MAKING A PRODUCT, AS A CONTRACT WITH POSTGRES. Plan task `5e-i`, and
// the first module in `app/` that WRITES to the catalog — `@/api/catalog` is the
// same three tables read, and everything in here is its exact inverse.
//
// ⚠️⚠️ IT SHIPS NO SCREEN, NO COMPONENT AND NO PRIMITIVE. `5e-ii` draws the
// four-field form and `5h.5` owns `src/ui/`; what is here is everything about
// that form which has a RIGHT ANSWER — the rows, their order, the arithmetic,
// the suggestion and the two refusals — so that `app/test/api-catalog-write.test.ts`
// and `docs/checks/5e-i-catalog-write-contract.sh` can both read it. §2.11 keeps
// rendering out of scope; this is the half of `5e` that is not rendering.
//
// ⚠️⚠️ FOUR FIELDS BECOME THREE ROWS, AND THE ORDER IS A DELIVERABLE RATHER
// THAN AN IMPLEMENTATION DETAIL, BECAUSE POSTGREST HAS NO TRANSACTION TO OFFER.
// `WRITE_ORDER` below is family, then variant, then price. Any other order is
// not slower, it is WRONG: `price_list_variant_fk` and `product_variant_family_fk`
// are composite foreign keys, so a price posted before its variant is a `23503`
// and a variant posted before its family is another. And because there is no
// transaction, a failure part-way through LEAVES SOMETHING BEHIND — which is
// why `CreateOutcome` carries the ids that did land and `retryDraft` puts them
// back into the next attempt. Without that, the retry after a failed variant
// insert tries to create the family again and is refused `23505` for a row it
// made itself thirty seconds earlier.
//
// ⚠️ WHAT EACH PARTIAL FAILURE LEAVES, named rather than discovered:
//
//   * family failed    — nothing exists. The shop is exactly where it was.
//   * variant failed   — a family with no variants. INVISIBLE: Productos has
//                        been variant-first since 2026-09-15, so nothing in the
//                        app lists it and nothing is broken by it; the retry
//                        reuses it.
//   * price failed     — ⚠️ THE PRODUCT IS IN THE CATALOG, wearing C3.12's dash.
//                        This is the one partial state a shopkeeper can SEE, so
//                        it is the one that gets its own sentence: telling her
//                        *"no se pudo guardar"* about a product that is now on
//                        her Productos screen would be the app lying about work
//                        it did. `5e-iii`'s price change is where she fixes it.
//
// ⚠️⚠️ TWO DIFFERENT FOLDS LIVE IN THIS FILE AND MERGING THEM WOULD BREAK ONE
// OF THEM. `searchKey` is `0002`'s `normalize_name` — case and spaces, NOT
// accents — and it is what the duplicate pre-check must use, because that is
// the rule `product_variant_name_unique` actually applies. `searchTerm` folds
// accents as well, which is `0002`'s own instruction that *"search-time folding
// belongs in the query"*, and it is what the family SUGGESTION uses, because a
// shopkeeper hunting for a family types what is quickest. Measured against the
// applied schema on 2026-09-22: `Platano` and `Plátano` are BOTH accepted as
// variant names in one shop, so a duplicate pre-check that folded accents would
// refuse a product the database would have taken.
//
// ⚠️ SO WHAT NO CHECK IN THIS REPOSITORY CAN SEE except one, named here rather
// than left to be discovered: nothing in TypeScript has ever read `0002`, and
// `CREATE POLICY` is not even in the knowledge graph. The manager fence on
// these three tables — `product_family_insert`, `product_variant_insert` and
// `price_list_insert`, all `has_role(…, 'manager')` — is invisible to the
// typecheck, to the Vitest suite and to the bundler. `docs/checks/5e-i-catalog-write-contract.sh`
// is the only instrument it ever gets, and its central assertion is that A
// CASHIER IS REFUSED.
// ============================================================================

import { SCALE, divRoundHalfUpAwayFromZero, formatDecimal, parseDecimal } from '@tienda/money';

import { apiErrorMessage } from '@/api/errors';
import { searchKey, searchTerm, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import { ES } from '@/strings';

/**
 * The three tables, IN THE ORDER THEY MUST BE POSTED.
 *
 * ⚠️ IT IS AN ARRAY AND NOT THREE CONSTANTS BECAUSE THE ORDER IS THE CLAIM.
 * `docs/checks/5e-i-catalog-write-contract.sh` reads this array and posts in
 * exactly the sequence it gives, so a reordering here is a reordering the check
 * performs — and a price posted before its variant answers `23503` against a
 * real database. Three separate constants would let the order live only in
 * whatever function happened to call them.
 *
 * ⚠️ `price_list` IS SPELLED IN `@/api/catalog` AS `PRICE_TABLE` and it is the
 * same table; it is written here because this array is a SEQUENCE and half a
 * sequence imported from the read module would be a sequence nobody can read in
 * one place.
 */
export const WRITE_ORDER = ['product_family', 'product_variant', 'price_list'] as const;

/** One step of the write, named by the table it posts to. */
export type CreateStep = (typeof WRITE_ORDER)[number];

/**
 * The columns a new family is posted with — and nothing else.
 *
 * ⚠️ `default_lifespan_days` AND `track_expiry` ARE DELIBERATELY ABSENT. The
 * owner ruled on 2026-09-22 that the pilot captures no expiry date at all
 * (*"we will not capture expiry date for now"*), and `7e` derives shelf life
 * from the shop's own records instead. A column sent with a guess in it is a
 * guess the seed bakes in.
 */
export const FAMILY_INSERT_COLUMNS = 'workspace_id,name';

/**
 * The columns a new variant is posted with — and nothing else.
 *
 * ⚠️⚠️ `tax_rate`, `pack_size` AND `enforce_stock` ARE ABSENT AND THAT IS A
 * HARD PILOT CONSTRAINT, NOT A SIMPLIFICATION. C8.8 says no pilot screen may
 * expose `enforce_stock`; `0002` defaults it to null, `tax_rate` to 0 and
 * `pack_size` to 1, which are the right answers for a shop selling basic
 * groceries in Mexico. `5e-iii` is the row that sets the first two once, on
 * purpose, and never at a till. ⚠️ Sending `tax_rate: 0` explicitly would look
 * identical and would be this app answering a question nobody asked it.
 *
 * ⚠️ ALL FOUR UNIT COLUMNS ARE HERE BECAUSE ALL FOUR ARE `not null`. See
 * `unitColumns` — C8.10 is what keeps one question at the form and four columns
 * in the row.
 */
export const VARIANT_INSERT_COLUMNS =
  'workspace_id,family_id,name,base_unit_code,purchase_unit_code,sell_unit_code,price_unit_code';

/**
 * The columns a new price is posted with — and nothing else.
 *
 * ⚠️ `effective_to` IS SENT AS `null` RATHER THAN OMITTED, and it is not
 * decoration: PostgREST refuses a bulk insert whose objects do not all carry
 * the same keys (`PGRST102`), and this app is one `5e-iii` away from posting
 * two price rows at once. Writing the open end out also says, at the call site,
 * that *this price has no end* is a decision rather than a default nobody saw.
 */
export const PRICE_INSERT_COLUMNS =
  'workspace_id,variant_id,location_id,price_per_base,effective_from,effective_to';

/**
 * What every insert asks back. ⚠️ Never `*` (`R13`): the id is the only thing
 * the next step in `WRITE_ORDER` needs, and a star select here would ship
 * `enforce_stock` to the phone through the back door C8.8 closed at the front.
 */
export const INSERT_RETURNING = 'id';

/** `unit.factor_to_base` is `numeric(14,6)` — a decimal string at scale 6. */
const FACTOR_SCALE = 6;

/** 10^3 — a factor at scale 6 becomes a QUANTITY at scale 3. `priceCentavos`'s. */
const FACTOR_TO_QUANTITY = 10 ** (FACTOR_SCALE - SCALE.quantity);

/**
 * `unit_price × qty` lands at scale 6 + 3 and money is scale 2, so this is what
 * `lineAnchorCentavos` divides by — and therefore what the inverse multiplies
 * back up by.
 *
 * ⚠️ IT IS COMPUTED FROM `SCALE` RATHER THAN TYPED. `@tienda/money` keeps the
 * same number as a private `ANCHOR_DIVISOR`; deriving it from the exported
 * scales means the two cannot drift, where a `10_000_000` written here would be
 * a second copy of the one magic number that whole module admits to having.
 */
const ANCHOR_DIVISOR = 10 ** (SCALE.unitPrice + SCALE.quantity - SCALE.money);

// ----------------------------------------------------------------------------
// C8.10 — ONE QUESTION AT THE FORM, FOUR COLUMNS IN THE ROW
// ----------------------------------------------------------------------------

/** The four unit columns of `product_variant`, in `0002`'s own order. */
export interface UnitColumns {
  readonly base_unit_code: string;
  readonly purchase_unit_code: string;
  readonly sell_unit_code: string;
  readonly price_unit_code: string;
}

/**
 * C8.10 — the one unit a shopkeeper chose, written into all four `not null`
 * unit columns.
 *
 * ⚠️⚠️ THE FAN-OUT IS WHAT MAKES `product_variant_units_same_dimension_trg`
 * UNREACHABLE, which is the point of doing it here rather than in the form.
 * That trigger raises `23514` when the four codes span more than one dimension
 * — measured on 2026-09-22, *"base/purchase/sell/price units span more than one
 * dimension"* — and there is no sentence in this app for it, because four
 * copies of one code cannot span two dimensions. A form that asked four
 * questions could reach it; this one cannot.
 *
 * ⚠️ AND IT IS WHY THE PRICE ARITHMETIC BELOW IS SAFE WITH ONE FACTOR.
 * `pricePerBase` prices per `price_unit_code` and the ledger stores per
 * `base_unit_code`; with all four the same, the factor cancels to itself and
 * what a shopkeeper typed is what `@/api/catalog` reads back. The day a variant
 * legitimately wants four different denominations — a case bought, singles sold
 * — it is `5e-iii`'s form and `pack_size` with it, not this one.
 */
export function unitColumns(unitCode: string): UnitColumns {
  return {
    base_unit_code: unitCode,
    purchase_unit_code: unitCode,
    sell_unit_code: unitCode,
    price_unit_code: unitCode,
  };
}

// ----------------------------------------------------------------------------
// THE MONEY, INVERTED
// ----------------------------------------------------------------------------

/**
 * A typed peso figure as INTEGER CENTAVOS, or `null` when it is not a figure.
 *
 * ⚠️⚠️ THE FIRST PLACE IN THIS APP THAT READS MONEY A PERSON TYPED, and it is
 * `parseDecimal` rather than `Number()` for the reason `packages/money`'s header
 * spends forty lines on: `Number('35.35') * 100` is `3534.9999999999995`. The
 * string goes straight to integer centavos and no peso-valued float is ever
 * constructed. `src/format/mxn.ts` is the other direction and the only other
 * module allowed near this boundary (`R5`).
 *
 * ⚠️ A COMMA IS A THOUSANDS SEPARATOR HERE AND IS STRIPPED, NOT TREATED AS A
 * DECIMAL POINT. C12.2 renders `$1,234.50` — comma thousands, point decimals —
 * so a shopkeeper copying what the app showed her must be able to type it back.
 * The `$` and surrounding spaces go the same way.
 *
 * ⚠️ EVERYTHING ELSE IS REFUSED RATHER THAN REPAIRED: an exponent, a minus
 * sign, three decimals, a word. `parseDecimal` throws on each, and the throw
 * becomes `null` — one answer for *this is not a price*, which `checkProduct`
 * turns into one sentence. A price this app guessed at is a price the shop
 * charges.
 */
export function parsePesos(typed: string): number | null {
  const figure = cleanPesos(typed);
  if (figure === '') return null;
  try {
    const centavos = parseDecimal(figure, SCALE.money);
    return centavos < 0 ? null : centavos;
  } catch {
    return null;
  }
}

/**
 * What is left of a typed price once the decoration is off: the `$`, the
 * thousands commas and the spaces. ⚠️ ONE HOME FOR THE CLEANING, because
 * `priceOmitted` and `parsePesos` must agree exactly about what *empty* means —
 * a box holding `"  $  "` is an empty box, and if only one of them thought so
 * the other would refuse a product the owner ruled may be created.
 */
function cleanPesos(typed: string): string {
  return typed.replace(/[\s,$]/g, '');
}

/**
 * Is the price box EMPTY — as opposed to holding something that is not a price?
 *
 * ⚠️⚠️ THE TWO ARE DIFFERENT FACTS SINCE THE OWNER'S RULING OF 2026-09-22, AND
 * BEFORE IT THEY WERE ONE. *"Let's allow the user to create a product without a
 * sell nor purchasing price, but highlight he's doing so."* An empty box is now
 * a legitimate create — the product goes into the catalog wearing C3.12's dash,
 * which is exactly what that dash has always meant — and `abc` is still a
 * refusal, because a price this app guessed at is a price the shop charges.
 *
 * ⚠️ IT IS NOT `parsePesos(typed) === null`. That answers null for BOTH, which
 * is precisely the collapse the ruling undid: `checkProduct` would go on
 * refusing the empty box, and `createProduct` could not tell a deliberate
 * omission from a bug and would post a price row it has no figure for.
 */
export function priceOmitted(typed: string): boolean {
  return cleanPesos(typed) === '';
}

/**
 * `price_list.price_per_base` for a price typed per PRICE UNIT — a decimal
 * string at scale 6, or `null` when it cannot be worked out exactly.
 *
 * ⚠️⚠️ IT IS THE EXACT INVERSE OF `priceCentavos` IN `@/api/catalog`, AND THAT
 * IS THE WHOLE DELIVERABLE. That function asks what one price unit weighs
 * (`factor_to_base`, at scale 3) and prices a line of that quantity with
 * `lineAnchorCentavos`; this one divides the same anchor back out. A shopkeeper
 * typing `$35.00 / kg` must read `$35.00 / kg` on Productos a second later, and
 * the two functions are the only two places that could disagree about it.
 *
 * ⚠️ THE ROUND TRIP IS EXACT FOR ALL TEN UNITS `0001` SEEDS, and that is a
 * property of their factors rather than of this arithmetic: every one of them
 * is 1, 100, 250, 500 or 1000, so `oneUnitInBase` divides `ANCHOR_DIVISOR`
 * exactly and nothing is rounded at all. An eleventh unit is a migration before
 * it is a word (`ES.units`), and `app/test/api-catalog-write.test.ts` walks all
 * ten so the day it stops being true is the day something goes red.
 *
 * ⚠️ THE ROUNDING IS STILL HALF-UP AWAY FROM ZERO, for `priceCentavos`'s
 * reason: Postgres's `round(numeric)` is, and `Math.round` is not on a negative
 * tie. It is unreachable at today's ten factors and it is the rule the ledger
 * applies, so it is the rule written here.
 *
 * ⚠️ EVERY THROW BECOMES `null` — a corrupt `unit` row or a price past 2^53 is
 * not a shopkeeper's problem, and `checkProduct` is what stops it reaching the
 * wire.
 */
export function pricePerBase(centavos: number, factorText: string): string | null {
  try {
    const factor = parseDecimal(factorText, FACTOR_SCALE);
    const oneUnitInBase = divRoundHalfUpAwayFromZero(factor, FACTOR_TO_QUANTITY);
    const perBase = divRoundHalfUpAwayFromZero(centavos * ANCHOR_DIVISOR, oneUnitInBase);
    return formatDecimal(perBase, SCALE.unitPrice);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// THE FAMILY, SUGGESTED FROM THE TYPED NAME
// ----------------------------------------------------------------------------

/** A family the phone already holds: its id and the word under the products. */
export interface FamilyOption {
  readonly id: string;
  readonly name: string;
}

/**
 * The families in the catalog this phone already has, each once.
 *
 * ⚠️ THERE IS NO SECOND READ, which is `familyView`'s rule one screen along:
 * `useCatalog` fetches every variant in one round trip and the family is
 * embedded under it, so the list of families is something the phone already
 * knows. A `product_family?select=…` here would be a form that works at the
 * counter and spins in the stockroom.
 *
 * ⚠️ A FAMILY WITH NO VARIANTS IS NOT IN THIS LIST AND CANNOT BE, and that is
 * the one real cost of not reading the table — including the invisible family a
 * failed `5e-i` write leaves behind. `retryDraft` is what carries that one
 * forward instead; every other empty family is a row nobody in this shop has
 * ever seen.
 *
 * ⚠️ THE ORDER IS THE CATALOG'S, which is the database's (`order=name`), the
 * same refusal `catalogFrom` makes.
 */
export function familiesFrom(entries: readonly CatalogEntry[]): readonly FamilyOption[] {
  const seen: string[] = [];
  const options: FamilyOption[] = [];
  for (const entry of entries) {
    if (entry.familyId === '' || entry.familyName === '') continue;
    if (seen.includes(entry.familyId)) continue;
    seen.push(entry.familyId);
    options.push({ id: entry.familyId, name: entry.familyName });
  }
  return options;
}

/** The words of a name, accent-folded — what a SUGGESTION is matched on. */
function words(text: string): readonly string[] {
  return searchTerm(text)
    .split(' ')
    .filter((word) => word.length > 0);
}

/** Does `needle` appear as a contiguous run of words inside `haystack`? */
function runOfWords(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    let all = true;
    for (let i = 0; i < needle.length; i += 1) {
      if (haystack[start + i] !== needle[i]) {
        all = false;
        break;
      }
    }
    if (all) return true;
  }
  return false;
}

/** What the form proposes: an existing family, or a new one to be created. */
export interface FamilySuggestion {
  /** The family to attach to, or `null` when one is about to be made. */
  readonly familyId: string | null;
  /** The word: the existing family's own name, or the name to create. */
  readonly familyName: string;
}

/**
 * The family a typed product name belongs to. C8.13 and `5e`'s own row: the
 * family is SUGGESTED, never demanded.
 *
 * ⚠️⚠️ IT IS FOLDED THROUGH `searchTerm`, SO THE APP NEVER PROPOSES A FAMILY
 * THE DATABASE WOULD THEN REFUSE — the confusion `searchKey`'s doc-comment in
 * `@/api/catalog` names this task as inheriting. Typing `Pierna de pollo` in a
 * shop that has a `Pollo` family attaches to THAT family rather than offering
 * to create a second one, and typing `platano` finds `Plátano` — which is the
 * same accent-folding `0002` asked for by name and refused to put in the
 * uniqueness rule.
 *
 * ⚠️ THE MATCH IS ON WHOLE WORDS AND NOT ON A SUBSTRING, and the difference is
 * a suggestion a shopkeeper would have to undo: `includes` would match `Res`
 * inside `Refresco` and inside `Cerveza`, and a form that proposes the wrong
 * family by default is worse than one that proposes none — she has to notice
 * before she can correct it.
 *
 * ⚠️ THE LONGEST MATCH WINS. A shop with both `Pollo` and `Pierna de pollo`
 * gets the more specific one for `Pierna de pollo entera`; ties go to the
 * database's order, the same refusal to re-sort `catalogFrom` makes.
 *
 * ⚠️⚠️ AND WITH NO MATCH IT PROPOSES THE WHOLE TYPED NAME AS A NEW FAMILY,
 * rather than its first word. `Agua mineral` becoming a family called `Agua` is
 * the app being clever about a substance it knows nothing about — and the
 * shape `Jitomate` / `Jitomate a granel` is exactly a family of one that grows
 * variants later. ⚠️ The suggestion is overridable by a GESTURE at the form,
 * which is `5e-ii`'s deliverable and not this one's: nothing here is final.
 */
export function suggestFamily(
  entries: readonly CatalogEntry[],
  typedName: string,
): FamilySuggestion {
  const typed = words(typedName);
  let best: FamilyOption | null = null;
  let bestLength = 0;
  for (const option of familiesFrom(entries)) {
    const candidate = words(option.name);
    if (!runOfWords(typed, candidate)) continue;
    if (candidate.length > bestLength) {
      best = option;
      bestLength = candidate.length;
    }
  }
  if (best !== null) return { familyId: best.id, familyName: best.name };
  return { familyId: null, familyName: typedName.replace(/\s+/g, ' ').trim() };
}

// ----------------------------------------------------------------------------
// THE FOUR FIELDS, AND WHAT IS WRONG WITH THEM BEFORE POSTGRES SEES THEM
// ----------------------------------------------------------------------------

/**
 * C8.9's four fields, exactly — a name, a family, one unit, one price.
 *
 * ⚠️ `familyId` AND `familyName` ARE ONE FIELD IN TWO HALVES, which is
 * `suggestFamily`'s answer carried whole: an id means *attach to this one* and
 * a null means *make one with this name*. Collapsing them to a single string
 * would make the form unable to tell an existing `Pollo` from a new one.
 *
 * ⚠️ `pricePesos` IS WHAT SHE TYPED AND IS NOT A NUMBER. `parsePesos` is the
 * only thing that reads it, for the reason that function gives.
 */
export interface ProductDraft {
  readonly name: string;
  readonly familyId: string | null;
  readonly familyName: string;
  readonly unitCode: string;
  readonly pricePesos: string;
}

/** The keys of `ES.catalog.issues`, so a refusal cannot be a sentence typed here. */
export type ProductIssue = keyof typeof ES.catalog.issues;

/**
 * What is wrong with the four fields, as a KEY of `ES.catalog.issues` — or
 * `null` when the draft is one Postgres will accept.
 *
 * ⚠️⚠️ IT IS A FUNCTION AND NOT A TERNARY IN THE FORM (`R3`), the shape
 * `checkInvite` and `checkLocations` already use: §2.11 keeps rendering out of
 * scope, so a refusal spelled only in JSX is one no instrument in this
 * repository can read, and every one of these has a right answer.
 *
 * ⚠️ THE ORDER IS THE FORM'S READING ORDER — name, family, unit, price — so a
 * shopkeeper who left two fields empty is told about the first one she comes to
 * rather than the last one this function happened to test.
 *
 * ⚠️⚠️ `duplicate` IS CHECKED AGAINST THE CATALOG THE PHONE HOLDS AND IS A
 * COURTESY, NOT THE FENCE. `product_variant_name_unique` is
 * `(workspace_id, normalized_name)` — SHOP-WIDE, so `Pierna` under Pollo
 * refuses `Pierna` under Cerdo — and it is the database that applies it. This
 * one exists so the common case is answered without a round trip on a link the
 * pilot store loses half the day, and it can MISS in two ways that are both
 * real: a product added on another phone since the last read, and a
 * DEACTIVATED product, which `catalogFrom` drops from the list while the unique
 * index still counts it. Both come back as `23505`, and
 * `catalogWriteErrorMessage` gives them the same sentence this key does.
 *
 * ⚠️ IT FOLDS WITH `searchKey` AND NOT `searchTerm` — the database folds case
 * and spaces and NOT accents, measured 2026-09-22, so a check that folded
 * accents would refuse `Plátano` in a shop that already has `Platano` and the
 * insert would have succeeded.
 */
export function checkProduct(
  draft: ProductDraft,
  entries: readonly CatalogEntry[],
  factors: UnitFactors,
): ProductIssue | null {
  if (searchKey(draft.name) === '') return 'nameMissing';
  if (entries.some((entry) => searchKey(entry.name) === searchKey(draft.name))) {
    return 'duplicate';
  }
  if (draft.familyId === null && searchKey(draft.familyName) === '') return 'familyMissing';
  if (factors[draft.unitCode] === undefined) return 'unitMissing';
  // ⚠️⚠️ AN EMPTY PRICE BOX IS NOT AN ISSUE — RULED 2026-09-22. It is a
  // deliberate create, and `priceConfirmKey` below is what makes sure the
  // shopkeeper knows he is making one. What is still refused is a box with
  // something unreadable in it.
  if (priceOmitted(draft.pricePesos)) return null;
  const centavos = parsePesos(draft.pricePesos);
  if (centavos === null) return 'priceUnreadable';
  if (pricePerBase(centavos, factors[draft.unitCode]) === null) return 'priceUnreadable';
  return null;
}

/**
 * The one thing a shopkeeper must be TOLD before this create goes through — as
 * a KEY of `ES.catalog.confirm`, never as a sentence.
 *
 * ⚠️⚠️ IT IS A WARNING AND NOT A REFUSAL, WHICH IS THE WHOLE OF THE OWNER'S
 * RULING OF 2026-09-22. `5e-i` shipped the price as REQUIRED, on the reading
 * that C8.9 lists it among the four fields; the owner overrode that — *"allow
 * the user to create a product without a sell nor purchasing price, but
 * highlight he's doing so"* — and the override is the smaller, kinder thing,
 * which is the sixth time on this project he has chosen it.
 *
 * ⚠️ WHAT THE SENTENCE OWES HIM IS THE CONSEQUENCE, NOT THE STATE. C3.12 is the
 * owner's own earlier words — *"impossible to concrete a transaction without a
 * price"* — so a product with no `price_list` row is one Vender and Comprar
 * will both have to stop and ask about. Telling him *"this product has no
 * price"* would be telling him what he just typed; telling him what it will
 * cost him at the counter is the part he cannot see from the form.
 *
 * ⚠️⚠️ AND IT IS `null` RATHER THAN A SENTENCE WHEN THE DRAFT IS PRICED, so a
 * screen cannot render a warning about a product that does not need one. ⚠️ WHAT
 * SURFACE IT IS SHOWN ON — a confirmation the shopkeeper taps through, or a
 * line that appears under the price box as soon as it is left empty — is
 * `5e-ii`'s and is routed to the owner's phone (`R9`, §2.11): nothing in this
 * repository can say which of those reads better at a counter.
 */
export function priceConfirmKey(draft: ProductDraft): keyof typeof ES.catalog.confirm | null {
  return priceOmitted(draft.pricePesos) ? 'noPrice' : null;
}

// ----------------------------------------------------------------------------
// THE THREE ROWS
// ----------------------------------------------------------------------------

/** A `product_family` row as this app posts it. `FAMILY_INSERT_COLUMNS`. */
export interface FamilyInsert {
  readonly workspace_id: string;
  readonly name: string;
}

/** A `product_variant` row as this app posts it. `VARIANT_INSERT_COLUMNS`. */
export interface VariantInsert extends UnitColumns {
  readonly workspace_id: string;
  readonly family_id: string;
  readonly name: string;
}

/** A `price_list` row as this app posts it. `PRICE_INSERT_COLUMNS`. */
export interface PriceInsert {
  readonly workspace_id: string;
  readonly variant_id: string;
  readonly location_id: string | null;
  readonly price_per_base: string;
  readonly effective_from: string;
  readonly effective_to: string | null;
}

/**
 * The first row: the family, when one is being made.
 *
 * ⚠️ THE NAME IS TRIMMED AND ITS INNER SPACES COLLAPSED, exactly as
 * `normalize_name` will fold it for the uniqueness key. `product_family_name_not_blank`
 * is `btrim(name) <> ''` so a name of spaces is a `23514`, and `checkProduct`
 * is what stops it — but storing `"  Pollo  "` would put the untrimmed string
 * in the banda La Familia draws, where the fold is invisible.
 */
export function familyRow(workspaceId: string, name: string): FamilyInsert {
  return { workspace_id: workspaceId, name: name.replace(/\s+/g, ' ').trim() };
}

/**
 * The second row: the variant. C8.10's fan-out is `unitColumns`, spread here so
 * the four `not null` columns arrive from the one place that decides them.
 */
export function variantRow(
  workspaceId: string,
  familyId: string,
  draft: ProductDraft,
): VariantInsert {
  return {
    workspace_id: workspaceId,
    family_id: familyId,
    name: draft.name.replace(/\s+/g, ' ').trim(),
    ...unitColumns(draft.unitCode),
  };
}

/**
 * The third row: the price.
 *
 * ⚠️⚠️ `location_id` IS `null`, WHICH IS THE WHOLE SHOP AND NOT ONE STORE, and
 * it is a decision rather than an omission. `0002` makes null the workspace
 * default and a uuid one store's override; `priceFor` already prefers the
 * store's own row when there is one. A four-field form has no store question in
 * it (C8.9), and C1.5 makes both pilot shops one location each — so pricing one
 * store would be identical today and wrong the first morning a shop opens a
 * second one, with nothing on screen to say which store the price was for.
 *
 * ⚠️ `effective_from` IS THE DEVICE'S LOCAL DAY and comes in as an argument
 * rather than being computed here (`R3`): `isoDay` in `@/api/catalog` already
 * owns *what day is it where the shop stands*, and a second answer to that in
 * this file would be the off-by-one `0018` records, in the other direction.
 *
 * ⚠️ `effective_to` IS `null` — this price stands until something closes it,
 * which is `5e-iii`'s dated window and the one branch of that task
 * `price_list_range_ordered` makes non-obvious. Nothing here opens a price that
 * has already ended.
 */
export function priceRow(
  workspaceId: string,
  variantId: string,
  pricePerBaseText: string,
  today: string,
): PriceInsert {
  return {
    workspace_id: workspaceId,
    variant_id: variantId,
    location_id: null,
    price_per_base: pricePerBaseText,
    effective_from: today,
    effective_to: null,
  };
}

// ----------------------------------------------------------------------------
// WHAT CAME BACK, AND WHAT IS LEFT BEHIND WHEN IT DIDN'T
// ----------------------------------------------------------------------------

/**
 * The rows landed — all three, or the two that a priceless product needs.
 *
 * ⚠️ `priced` IS HERE BECAUSE THE FORM CANNOT WORK IT OUT AFTERWARDS. The draft
 * it sent is gone by the time this comes back, and *what did we just save* is
 * the one thing a confirmation may not get wrong. It is also what lets `5e-ii`
 * say something different about a product that went in wearing C3.12's dash.
 */
export interface CreateSucceeded {
  readonly ok: true;
  readonly familyId: string;
  readonly variantId: string;
  readonly priced: boolean;
}

/**
 * One of the three did not.
 *
 * ⚠️ IT CARRIES THE IDS THAT DID LAND, and that is the whole reason this is a
 * shape rather than a thrown error: PostgREST has no transaction, so a failure
 * at step two or three leaves step one in the database, and a retry that did
 * not know would be refused `23505` for a row it created itself.
 */
export interface CreateFailed {
  readonly ok: false;
  readonly failed: CreateStep;
  readonly familyId: string | null;
  readonly variantId: string | null;
  readonly error: unknown;
}

/** What `createProduct` in `@/api/calls` answers with. */
export type CreateOutcome = CreateSucceeded | CreateFailed;

/**
 * The draft to try again with, after a partial write.
 *
 * ⚠️⚠️ WITHOUT THIS, THE SECOND ATTEMPT IS REFUSED FOR THE FIRST ATTEMPT'S OWN
 * WORK. A variant insert that failed leaves the family behind; re-posting the
 * same draft asks the database to create a family whose normalized name already
 * exists, and `product_family_name_unique` answers `23505` — a shopkeeper told
 * *"ya tienes un producto con ese nombre"* about a product she has never
 * managed to create. Measured against the applied schema on 2026-09-22.
 *
 * ⚠️ IT DOES NOT CARRY `variantId` FORWARD, and that is not an oversight: a
 * write that got as far as the variant produced a PRODUCT, which is in the
 * catalog wearing C3.12's dash. That is not a create to retry — it is a price
 * to set, which is `5e-iii`'s screen. `createLine` below is what says so.
 */
export function retryDraft(draft: ProductDraft, outcome: CreateFailed): ProductDraft {
  if (outcome.familyId === null) return draft;
  return { ...draft, familyId: outcome.familyId, familyName: draft.familyName };
}

// ----------------------------------------------------------------------------
// THE TWO REFUSALS A SHOPKEEPER CAN ACTUALLY REACH
// ----------------------------------------------------------------------------

/**
 * The `23505` constraints, by name, as KEYS of `ES.catalog.errors`.
 *
 * ⚠️⚠️ THE CONSTRAINT NAME IS IN THE `message` AND NOWHERE ELSE — measured
 * against the applied schema on 2026-09-22, where PostgREST answered HTTP 409
 * with `details: null` and `message: duplicate key value violates unique
 * constraint "product_variant_name_unique"`. So the two duplicates are
 * distinguishable, and they are two different facts: one is a product the shop
 * already sells and the other is a family it already has.
 *
 * ⚠️ THE FAMILY ONE IS NEARLY UNREACHABLE AND IS WRITTEN ANYWAY —
 * `suggestFamily` attaches to a family it can see rather than proposing to
 * create it. What is left is the race: a family made on the other phone since
 * this one last read. `invite.issues` already recorded this project's answer to
 * *"unreachable in both pilot shops"* — the alternative to a sentence is a dead
 * button.
 */
export const CATALOG_WRITE_REFUSALS: Readonly<Record<string, keyof typeof ES.catalog.errors>> = {
  product_variant_name_unique: 'duplicate',
  product_family_name_unique: 'familyExists',
};

/** `23505` — a unique constraint. `23514`/`23503` — a row we should never have sent. */
const DUPLICATE = '23505';
const REJECTED: readonly string[] = ['23514', '23503'];
/** `42501` — the manager fence, measured as HTTP 403 on all three tables. */
const FORBIDDEN = '42501';

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
 * What a shopkeeper is told when the catalog write is refused.
 *
 * ⚠️⚠️ `42501` MEANS SOMETHING DIFFERENT HERE THAN ANYWHERE ELSE IN THIS APP,
 * WHICH IS THE ENTIRE REASON THIS FUNCTION EXISTS — `redeemErrorMessage`'s
 * argument, one table over. `@/api/errors` maps `42501` to *"Tu sesión se
 * cerró"*, which is right where the code means an absent grant; here it is
 * `product_variant_insert`'s `has_role(…, 'manager')` refusing a CASHIER, and
 * telling her to sign in again would send her round a loop that cannot end.
 * Measured 2026-09-22: HTTP 403, *"new row violates row-level security policy
 * for table …"*, on all three tables.
 *
 * ⚠️⚠️ AND `23514` HAD TO BE INTERCEPTED TOO, WHICH IS THE ONE THAT WOULD HAVE
 * SHIPPED WRONG. `@/api/errors` maps it to `nameMissing` — *"Escribe el nombre
 * de tu tienda."* — because `0027` raises it on a blank SHOP name. On this path
 * the same code is `product_variant_name_not_blank` or the dimension trigger,
 * and a shopkeeper adding a product would be told to name her shop. It goes to
 * the honest catch-all instead, which is `@/api/errors`' own argument for
 * `PGRST202`: both are a developer's mistake, deployed, and `checkProduct` is
 * what makes them unreachable.
 *
 * ⚠️ EVERYTHING ELSE GOES DOWN `apiErrorMessage`, so *sin conexión* stays the
 * one sentence this app gives for a lost link — and offline is the pilot
 * store's normal write path, so it is the one that will actually be read.
 */
export function catalogWriteErrorMessage(error: unknown): string {
  const code = codeOf(error);
  if (code === FORBIDDEN) return ES.catalog.errors.notAllowed;
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
 * The one sentence the form shows after a failed create — and the only place
 * the THREE partial states become two.
 *
 * ⚠️⚠️ A FAILURE AT THE PRICE IS NOT A FAILURE TO SAVE THE PRODUCT, and saying
 * so is the whole reason this is not just `catalogWriteErrorMessage`. The
 * variant landed; the product is on Productos already, wearing C3.12's dash. A
 * screen that said *"no se pudo guardar"* would send a shopkeeper to type it
 * all again, and the second attempt is refused `23505` by the row the first one
 * made. [[users-dont-do-bookkeeping]] cuts the other way here: she is not being
 * shown an internal state, she is being told which of two things to do next.
 *
 * ⚠️ THE OTHER TWO SHARE A SENTENCE because they share an instruction: try
 * again. A family left behind by a failed variant insert is invisible —
 * Productos is variant-first — and `retryDraft` reuses it rather than leaving
 * her to discover it.
 */
export function createLine(outcome: CreateFailed): string {
  if (outcome.failed === 'price_list') return ES.catalog.errors.priceNotSaved;
  return catalogWriteErrorMessage(outcome.error);
}
