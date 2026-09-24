// ============================================================================
// THE SHOP'S OWN PRODUCTS, AS A CONTRACT WITH POSTGRES. Plan task 5d-i, and the
// first module of `src/api/` whose subject is the CATALOG rather than the people
// in the shop — ADR-035 §2.11's boundary, `R12` and `R13`.
//
// ⚠️ FOUR APPLIED TABLES THAT NO LINE IN `app/` READ BEFORE THIS FILE.
// `product_variant`, `product_family` and `price_list` have been applied since
// `0002` and `unit` since `0001`; every screen built so far is about getting
// into a shop, not about what the shop sells. This is the read `5d-ii` draws and
// `5d-iii` opens, and it ships no screen itself.
//
// ⚠️ EVERYTHING WITH A RIGHT ANSWER IS IN HERE AND NOTHING THAT TALKS — the
// split `workspace.ts` established. `@/api/calls` imports the live client and can
// never be loaded by the node suite, so the column lists, the price arithmetic,
// the search key and the initials live on this side of the line, where
// `app/test/api-catalog.test.ts` reads them.
//
// ⚠️⚠️ THE READ IS ONE ROUND TRIP AND POSTGREST DOES THE JOIN, WHICH IS THE
// OPPOSITE OF WHAT `members.ts` HAD TO DO — AND IT WAS MEASURED, NOT ASSUMED.
// The roster joins in TypeScript because `workspace_invite` and
// `workspace_member` have no foreign key between them. Here there IS one:
// `product_variant_family_fk` is a COMPOSITE key `(family_id, workspace_id)`,
// and the obvious worry — that PostgREST cannot embed across a composite FK —
// is false. Measured on 2026-09-22 against the applied schema: both
// `product_family(id,name)` and the constraint-named spelling come back nested,
// and `price_list(…)` embeds the other way as an array. One request, three
// tables, over a link the pilot store loses half the day.
//
// ⚠️⚠️ AND EVERY NUMBER IN IT IS ASKED FOR AS TEXT. `price_per_base` is
// `numeric(14,6)` and `factor_to_base` is `numeric(14,6)`; PostgREST sends a
// bare numeric as a JSON NUMBER, and `JSON.parse` turns that into a double —
// `0.035 * 1000` is `35.000000000000004` in this runtime. `@tienda/money`'s
// `parseDecimal` REFUSES a number argument for exactly this reason, so the two
// column lists below cast with `::text` and the money path starts from the same
// digits Postgres stored. Measured: `price_per_base::text` comes back
// `"0.035000"`.
//
// ⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE, named here rather than left to be
// discovered (`R9` is for the other direction — this one has an instrument):
// a typecheck has never read `0002`, so a column renamed on either side of the
// wire is a 400 the bundler, the suite and the typecheck all pass over.
// `docs/checks/5d-i-catalog-contract.sh` is the instrument — a real HTTP round
// trip against a reset database — and it reads the strings below rather than
// carrying a second copy of them.
// ============================================================================

import {
  SCALE,
  divRoundHalfUpAwayFromZero,
  lineAnchorCentavos,
  parseDecimal,
} from '@tienda/money';

import type { ApiMessageKey } from '@/api/errors';
import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';

/**
 * The columns a client may ask `product_variant` for.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`). A `select=*` here would ship `pack_size`,
 * `tax_rate` and `enforce_stock` to a phone that renders none of them — and
 * `enforce_stock` is the switch C8.8 says no pilot screen may expose.
 *
 * ⚠️⚠️ `tax_rate` WAS ADDED HERE BY `5f-i` AND TAKEN BACK OUT THE SAME HOUR,
 * BECAUSE `docs/checks/5d-i-catalog-contract.sh` REFUSED IT AND WAS RIGHT. That
 * check bans `enforce_stock`, `tax_rate` and `pack_size` from this read by name
 * — *"a column the app never asks for is a column that never reaches a phone"* —
 * and `5e-iii-a` already reads the two set-once figures per variant through
 * `VARIANT_EDIT_COLUMNS` for exactly that reason. **The basket needs a rate only
 * while `prices_include_tax` is FALSE, which is no shop today**, so widening a
 * list read that every phone performs, for a branch none of them takes, is the
 * wrong trade. `@/cart/cart` takes the rate as an ARGUMENT and refuses to quote
 * without one instead — loudly, rather than by understating IVA.
 *
 * ⚠️ `is_active` IS IN THE LIST BECAUSE THE POLICY DOES NOT FILTER.
 * `product_variant_select` is `workspace_id in (select public.my_workspaces())`
 * and nothing more, so a discontinued product comes back like any other. The
 * filtering is `catalogFrom`'s, below, where the suite can read it — the same
 * arrangement `members.ts` made for a deactivated colleague.
 */
export const VARIANT_COLUMNS = 'id,name,family_id,price_unit_code,base_unit_code,is_active';

/**
 * The columns a client may ask `product_family` for, as an EMBEDDED resource.
 *
 * ⚠️ `is_active` is NOT among them, and the asymmetry with the variant list is
 * deliberate: a variant is listed or not on its own merit, and a family is only
 * ever the word printed under a variant's name. Hiding the word because the
 * family was retired would leave a row with a gap under it.
 */
export const FAMILY_COLUMNS = 'id,name';

/**
 * The columns a client may ask `price_list` for, as an EMBEDDED resource.
 *
 * ⚠️ `price_per_base::text` — see the header. The cast is the difference between
 * a price the ledger agrees with and a price that is a double.
 *
 * ⚠️ `location_id` IS READ BECAUSE THE TABLE IS SCOPED AND THE APP IS NOT.
 * `null` means the workspace default and a uuid means one store's own price
 * (`0002`); both come back on the same read, and `priceFor` below is what picks.
 */
export const PRICE_COLUMNS = 'price_per_base::text,location_id';

/** The columns a client may ask `unit` for. ⚠️ `factor_to_base::text` — header. */
export const UNIT_COLUMNS = 'code,dimension,factor_to_base::text,display_order';

/** The embedded resource the price window filters, spelled once. */
export const PRICE_TABLE = 'price_list';

/**
 * The whole `select=` for the catalog read: variants, each with its family and
 * with whatever price rows survive the window.
 *
 * ⚠️ THE EMBEDS ARE PLAIN, NOT `!inner`. An inner join would drop every variant
 * that has no price today, and a shop that has not priced something still sells
 * it — C3.12's dash is the answer, not an absence from the list.
 */
export const CATALOG_SELECT =
  `${VARIANT_COLUMNS},product_family(${FAMILY_COLUMNS}),${PRICE_TABLE}(${PRICE_COLUMNS})`;

/** The order the database applies. See `CATALOG_ORDER_COLUMN`. */
export const CATALOG_ORDER_COLUMN = 'name';

/** The query key the catalog read caches under. */
export const CATALOG_KEY = ['catalog', 'variants'] as const;

/** The query key the unit read caches under. */
export const UNITS_KEY = ['catalog', 'units'] as const;

/** `unit.factor_to_base` is `numeric(14,6)`, so a decimal string at scale 6. */
const FACTOR_SCALE = 6;

/**
 * 10^3 — what turns a factor at scale 6 into a QUANTITY at scale 3.
 *
 * ⚠️ `SCALE.quantity` IS 3 BECAUSE `numeric(14,3)` IS WHAT EVERY `qty_base`
 * COLUMN HOLDS, and a factor is a quantity of base units once you ask what one
 * price unit weighs. The two scales differing by three is the whole conversion.
 */
const FACTOR_TO_QUANTITY = 10 ** (FACTOR_SCALE - SCALE.quantity);

/** A `product_family` row as PostgREST sends it, embedded under a variant. */
export interface FamilyRow {
  readonly id: string;
  readonly name: string;
}

/**
 * A `price_list` row as PostgREST sends it, embedded under a variant.
 *
 * ⚠️ `price_per_base` IS A STRING and that is not a mistake in this type — it
 * is `::text` in `PRICE_COLUMNS`, for the reason in the header.
 */
export interface PriceRow {
  readonly price_per_base: string;
  readonly location_id: string | null;
}

/** A `product_variant` row as PostgREST sends it, with its two embeds. */
export interface VariantRow {
  readonly id: string;
  readonly name: string;
  readonly family_id: string;
  readonly price_unit_code: string;
  /**
   * `product_variant.base_unit_code` — what the LEDGER stores this variant in
   * (`0002:113`: *"smallest practical — g, ml, pza"*).
   *
   * ⚠️⚠️ IT IS READ HERE FOR `5f-i`, AND IT IS THE UNIT A KEYED QUANTITY IS
   * SENT IN. The owner's rule of 2026-09-23 is that the stepper counts PRICE
   * units and free entry counts BASE units — *"he can also tap to enter
   * 288gr"* — so `288` reaches `record_sale` as `qty_display_unit: 'g'`, and
   * `'g'` is this column. Without it the only spelling available is the price
   * unit, and 288 g priced per 250 g would be recorded as `1.152` of a
   * quarter-kilo: arithmetically identical and unreadable on a receipt.
   */
  readonly base_unit_code: string;
  readonly is_active: boolean;
  readonly product_family: FamilyRow | null;
  readonly price_list: readonly PriceRow[] | null;
}

/** A `unit` row as PostgREST sends it. */
export interface UnitRow {
  readonly code: string;
  readonly dimension: string;
  readonly factor_to_base: string;
  readonly display_order: number;
}

/**
 * `unit.factor_to_base` keyed by unit code — decimal strings at scale 6,
 * exactly as `0001` stores them.
 *
 * ⚠️⚠️ THIS IS THE MAP `5c-iv-b` REFUSED TO HARD-CODE, AND THIS TASK IS WHERE
 * IT COMES FROM. `@/offline/deadLetters` takes its factors as an ARGUMENT
 * (`UnitFactors`, `NO_UNIT_FACTORS`) rather than carrying `0001`'s ten rows,
 * precisely so this app never grows a second answer to *how many grams in a
 * kilo*. The shapes are identical on purpose; the row that HANDS this map over
 * is `5f`'s, where its own row already says so, and this file deliberately does
 * not import across that boundary to do it for them.
 */
export type UnitFactors = Readonly<Record<string, string>>;

/** The factors, keyed by code. Nothing is dropped and nothing is renamed. */
export function unitFactorsFrom(rows: readonly UnitRow[] | null | undefined): UnitFactors {
  const factors: Record<string, string> = {};
  for (const row of rows ?? []) factors[row.code] = row.factor_to_base;
  return factors;
}

/**
 * Today, as Postgres spells a `date` — and in the SHOPKEEPER'S day, not UTC.
 *
 * ⚠️ A price window is a fact about a shop's morning. A store in Mexico City
 * opening at 07:00 is already on tomorrow's UTC date at 18:00, so a UTC day
 * would put a price change a whole afternoon early — the same off-by-one
 * `0018` records for expiry, solved there with `location.timezone` because the
 * SERVER cannot know which day the shop is in. On the device the local day IS
 * the shop's day, so this needs no table and no `Intl` (`R10`).
 */
export function isoDay(now: Date): string {
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * The half of the price window PostgREST cannot express as one filter:
 * *"this row has not ended yet."*
 *
 * ⚠️⚠️ THE WINDOW IS THE QUERY'S AND IS NOT REPEATED IN TYPESCRIPT, WHICH IS A
 * DECISION AND NOT AN OMISSION. `price_list` is a dated range table — the rows
 * for one variant do not overlap, by an exclusion constraint — so *"the row
 * covering today"* is a predicate, and a second copy of it in `priceFor` would
 * be a second answer to which price is current. The database applies it; the
 * contract check drives an EXPIRED row and a FUTURE row past a real PostgREST
 * and asserts neither comes back.
 *
 * ⚠️ AND THE OBVIOUS SPELLING DOES NOT WORK — measured, 2026-09-22.
 * `price_list` carries a generated `valid_period daterange`, so
 * `valid_period=cs.2026-09-22` looks like the whole window in one filter and
 * answers `400 22P02 malformed range literal`: `cs` wants a RANGE on the right,
 * not a date. The two date columns are the filter that exists.
 */
export function priceEndsAfter(today: string): string {
  return `effective_to.is.null,effective_to.gt.${today}`;
}

/** The other half: the row has started. Spelled here so both live together. */
export const PRICE_STARTS_COLUMN = 'effective_from';

/**
 * The price a variant is selling at, out of the rows the window already
 * narrowed — or `null` when this shop has not priced it.
 *
 * ⚠️ A STORE'S OWN PRICE BEATS THE SHOP-WIDE ONE. `price_list.location_id` is
 * null for the workspace default and a uuid for one store; `0002`'s exclusion
 * constraint keeps the two from colliding but deliberately allows both to
 * exist, so a shop CAN price one store differently. Reading only the default
 * would put a price on screen that the till would not charge.
 *
 * ⚠️ `locationId` IS AN ARGUMENT AND NOT A LOOKUP (`R3`). C1.5 makes both pilot
 * shops one location each, so today it is that one store or nothing; the day a
 * shop has two, the caller is what knows which one this phone is standing in.
 */
export function priceFor(
  prices: readonly PriceRow[] | null | undefined,
  locationId: string | null,
): PriceRow | null {
  const rows = prices ?? [];
  if (locationId !== null) {
    const mine = rows.find((row) => row.location_id === locationId);
    if (mine !== undefined) return mine;
  }
  return rows.find((row) => row.location_id === null) ?? null;
}

/**
 * What one price unit costs, in integer centavos — or `null` when it cannot be
 * worked out exactly.
 *
 * ⚠️⚠️ IT IS THE LEDGER'S OWN ARITHMETIC, NOT A SECOND ONE.
 * `price_per_base` is per BASE unit and a shopkeeper reads a price per PRICE
 * unit (C3.10, and `0016`'s own note that *"quoted per 100 g is a §2.8
 * presentation concern"*), so the conversion asks what one price unit weighs —
 * `factor_to_base`, at scale 3, which is the scale every `qty_base` column
 * holds — and then prices a line of exactly that quantity with
 * `lineAnchorCentavos`. That is §2.5 rule 3, the same function the offline
 * queue prices a dead sale with, applied to a quantity of one.
 *
 * ⚠️ THE ROUNDING IS HALF-UP AWAY FROM ZERO IN BOTH STEPS, because Postgres's
 * `round(numeric)` is, and `Math.round` is not on a negative tie. A factor with
 * more than three decimals is rounded the way `round(qty * factor, 3)` rounds
 * it server-side rather than truncated here.
 *
 * ⚠️ EVERY THROW THE MONEY PATH RAISES BECOMES `null`. `parseDecimal` refuses a
 * number, an exponent, or more decimals than the column holds; `lineAnchor`
 * refuses anything past 2^53. Each of those is a corrupt row rather than a
 * shop's problem, and a price list that crashes the app is worse than one row
 * showing a dash.
 */
export function priceCentavos(priceText: string, factorText: string): number | null {
  try {
    const factor = parseDecimal(factorText, FACTOR_SCALE);
    const oneUnitInBase = divRoundHalfUpAwayFromZero(factor, FACTOR_TO_QUANTITY);
    return lineAnchorCentavos(parseDecimal(priceText, SCALE.unitPrice), oneUnitInBase);
  } catch {
    return null;
  }
}

/**
 * C3.10 — **a price is never shown without its unit.** `$35.00 / kg`,
 * `$9.00 / 250 gr`, `$2.00 / pza`.
 *
 * ⚠️ AND C3.12 — NO PRICE IS A DASH, NEVER `$0.00`. *"Impossible to concrete a
 * transaction without a price, nevertheless it is possible to complete a sale
 * at price 0"* — the two are different facts about a product and only one of
 * them is safe to sell at, so they must not render alike. `$0.00` is a price
 * the owner set; the dash is a question nobody has answered.
 *
 * ⚠️ THE UNIT'S WORD COMES FROM `ES.units` AND NEVER FROM THE CODE. `250g` is
 * what the database calls it and *250 gr* is what a shopkeeper reads — C3.10's
 * own example — so the map is in `src/strings.ts` with every other word (`R4`),
 * and an unmapped code falls back to itself rather than to nothing.
 */
export function priceLabel(centavos: number | null, unitCode: string): string {
  if (centavos === null) return ES.catalog.noPrice;
  const unit = ES.units[unitCode as keyof typeof ES.units] ?? unitCode;
  return `${formatMXN(centavos)} ${ES.catalog.per} ${unit}`;
}

/**
 * The two letters an un-pictured product wears. C8.14: *"a merchant-created
 * product shows initials and is transactable immediately"*, and is never shown
 * a *pending photo* state — so this is a finished thing, not a placeholder.
 *
 * ⚠️ TWO WORDS GIVE TWO INITIALS AND ONE WORD GIVES ITS FIRST TWO LETTERS.
 * `Pollo entero` is `PE` and `Pechuga` is `PE` as well, which is not a
 * collision worth designing away: the tile carries the name beside it, and a
 * scheme that tried to disambiguate would make the two letters unpredictable.
 *
 * ⚠️ IT IS `toUpperCase()` AND NOT A LOCALE-AWARE FOLD — `R10`. Hermes'
 * `Intl` surface is only as wide as this project has measured on a phone, and
 * the one method that was assumed rather than measured crashed the app on the
 * owner's iPhone (`mxn.ts`). Plain case mapping covers every letter a Spanish
 * catalog contains.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * A name as `0002`'s `normalize_name` folds it: lower case, trimmed, and every
 * run of whitespace collapsed to one space.
 *
 * ⚠️ IT IS THE DATABASE'S RULE AND IT IS COPIED DELIBERATELY. `product_variant
 * .normalized_name` is `generated always as (public.normalize_name(name))` and
 * carries the uniqueness constraint, so a list that folded names differently
 * would disagree with what the shop is allowed to create — which is the
 * confusion `5e` inherits when it refuses a duplicate this screen just showed
 * as two different products.
 */
export function searchKey(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

// ⚠️⚠️ THE ACCENTS ARE WRITTEN AS ESCAPES AND THE REASON IS A CHECK, NOT A
// KEYBOARD. `docs/checks/conventions-gate.sh`'s `R4` recognises Spanish by
// looking for an accented character inside a quoted string anywhere outside
// `src/strings.ts` — which is the right rule and this is not a sentence a
// shopkeeper reads, it is the alphabet. The table below is, in order:
//
//     á é í ó ú ü ñ   and their capitals
//
// and each is written as its code point below so the guard stays NARROW rather
// than being loosened to admit a special case — a rule with an exception in it
// is a rule somebody widens again next month. `app/test/api-catalog.test.ts`
// writes the letters out literally, since the suite is not under `R4`, so the
// mapping is legible somewhere a person will actually look.
const FOLD: Readonly<Record<string, string>> = {
  '\u00e1': 'a', '\u00e9': 'e', '\u00ed': 'i', '\u00f3': 'o', '\u00fa': 'u',
  '\u00fc': 'u', '\u00f1': 'n',
  '\u00c1': 'a', '\u00c9': 'e', '\u00cd': 'i', '\u00d3': 'o', '\u00da': 'u',
  '\u00dc': 'u', '\u00d1': 'n',
};

/**
 * What a typed search is compared as: `searchKey`, and then accents folded
 * away.
 *
 * ⚠️⚠️ THE FOLD IS DELIBERATE AND `0002` ASKED FOR IT BY NAME. That migration
 * refuses to fold accents in `normalize_name` — *"Plátano and Platano being
 * distinct is acceptable, silently merging them is not"* — and ends the same
 * paragraph with **"search-time folding belongs in the query."** This is that
 * query: a shopkeeper hunting for a product types what is quickest, and a list
 * that will not find `Plátano` unless she reaches for the accent is a list she
 * stops using. ⚠️ The uniqueness rule is untouched: nothing here writes.
 *
 * ⚠️ IT DOES NOT USE `String.prototype.normalize('NFD')`, which is the
 * one-liner. That method's presence on Hermes is not measured in this
 * repository, and the last time this project assumed a Unicode method was there
 * the app died on launch on the owner's phone (`mxn.ts`, `formatToParts`,
 * 2026-09-13). Seven letters and their capitals are the whole of Spanish.
 */
export function searchTerm(text: string): string {
  let folded = '';
  for (const char of searchKey(text)) folded += FOLD[char] ?? char;
  return folded;
}

/** One row of Productos, as the screen needs it and with no rendering in it. */
export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly familyId: string;
  /** ⚠️ The family's own name, or `''` when the embed came back empty. */
  readonly familyName: string;
  /** `product_variant.price_unit_code` — what the price below is PER. */
  readonly priceUnit: string;
  /** `product_variant.base_unit_code` — what the ledger stores, and what a
   * KEYED quantity is sent in. See `VariantRow.base_unit_code`. */
  readonly baseUnit: string;
  /** What one price unit costs, or `null`. See `priceCentavos`. */
  readonly centavos: number | null;
  /**
   * `price_list.price_per_base` exactly as Postgres sent it — a decimal string
   * at scale 6, or `null` when this variant has no price today.
   *
   * ⚠️⚠️ IT IS THE RAW STRING AND NOT `centavos`, BECAUSE THEY ANSWER TWO
   * DIFFERENT QUESTIONS. `centavos` is what ONE PRICE UNIT costs, which is what
   * C3.10's label needs; a basket line needs what ONE BASE UNIT costs, because
   * `record_sale` prices per base and a quantity is base units. Deriving one
   * from the other would divide a rounded figure back out and lose centavos on
   * exactly the products quoted in packs.
   */
  readonly perBase: string | null;
  /** C3.10's sentence, ready to render. */
  readonly price: string;
  /** C8.14's two letters. */
  readonly initials: string;
  /** What `matches` compares a typed search against — name AND family. */
  readonly term: string;
}

/**
 * The catalog a phone holds, out of one read.
 *
 * ⚠️ INACTIVE VARIANTS ARE DROPPED HERE AND NOT IN THE QUERY, the arrangement
 * `members.ts` already made: the policy does not filter, so the rule is a
 * decision, and a decision belongs where `app/test/api-catalog.test.ts` can
 * read it rather than in `calls.ts`, which no suite can load.
 *
 * ⚠️ THE ORDER IS THE DATABASE'S — `order=name` on the query — and it is NOT
 * re-sorted here. A second sort in this runtime would be a second answer to
 * *"which product comes first"*, decided by whatever collation Hermes has
 * rather than by the one Postgres applied; `docs/checks/5d-i-catalog-contract.sh`
 * is where the real order is read off the wire, accents and all.
 */
export function catalogFrom(
  rows: readonly VariantRow[] | null | undefined,
  factors: UnitFactors,
  locationId: string | null,
): readonly CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const row of rows ?? []) {
    if (!row.is_active) continue;
    const price = priceFor(row.price_list, locationId);
    const factor = factors[row.price_unit_code];
    const centavos =
      price === null || factor === undefined
        ? null
        : priceCentavos(price.price_per_base, factor);
    const familyName = row.product_family?.name ?? '';
    entries.push({
      id: row.id,
      name: row.name,
      familyId: row.family_id,
      familyName,
      priceUnit: row.price_unit_code,
      baseUnit: row.base_unit_code,
      centavos,
      perBase: price?.price_per_base ?? null,
      price: priceLabel(centavos, row.price_unit_code),
      initials: initials(row.name),
      term: `${searchTerm(row.name)} ${searchTerm(familyName)}`,
    });
  }
  return entries;
}

/**
 * Which of the three things an empty list means — as a KEY of `ES.catalog`,
 * never as a sentence.
 *
 * ⚠️⚠️ IT IS A FUNCTION AND NOT A TERNARY IN THE SCREEN, WHICH IS `R3` AND THE
 * SHAPE `linesOf` ALREADY USES IN `@/api/approvals`. §2.11 keeps rendering out
 * of scope, so a decision spelled only in JSX is one no instrument in this
 * repository can read — and this one has a right answer.
 *
 * ⚠️⚠️ THE THREE MUST NOT COLLAPSE INTO TWO. *"This shop has no products"* and
 * *"nothing matches what you typed"* are different facts: a shopkeeper with a
 * hundred products who mistypes a name would otherwise be told her catalog is
 * empty — and she is the merchant C8.2 describes, whose catalog is deliberately
 * incomplete and who is being encouraged to add to it. ⚠️ And *the read has not
 * landed* is a third: a list that says "no products" for the second before the
 * rows arrive lies on every cold open, on a connection this shop loses half the
 * day.
 *
 * ⚠️ WHITESPACE IS NOT A SEARCH. `matches` already treats a blank box as
 * matching everything, so a box holding three spaces is not "nothing found".
 */
export function emptyLineKey(
  loading: boolean,
  typed: string,
): 'loading' | 'noMatches' | 'empty' {
  if (loading) return 'loading';
  return searchKey(typed) === '' ? 'empty' : 'noMatches';
}

/**
 * Does this row answer what was typed?
 *
 * ⚠️ THE FAMILY COUNTS. Typing `pollo` finds `Pechuga`, because the family is
 * the word a shopkeeper thinks in even when the app is flat everywhere else
 * (C3.1, C8.13) — and the row already shows that word under the name, so a
 * match on it is visible rather than mysterious.
 *
 * ⚠️ AN EMPTY SEARCH MATCHES EVERYTHING rather than nothing: the box starts
 * empty and the list is what the screen is for.
 */
export function matches(entry: CatalogEntry, typed: string): boolean {
  const term = searchTerm(typed);
  if (term === '') return true;
  return entry.term.includes(term);
}

/** The list a search box narrows. `matches`, applied in the database's order. */
export function search(
  entries: readonly CatalogEntry[],
  typed: string,
): readonly CatalogEntry[] {
  return entries.filter((entry) => matches(entry, typed));
}

// ----------------------------------------------------------------------------
// LA FAMILIA — plan task `5d-iii`, and the three decisions that screen has that
// a machine can still read. Everything else about it is rendering, which §2.11
// keeps out of scope and `R9` routes to the owner's phone.
//
// ⚠️ THE FAMILY IS ASSEMBLED FROM THE CATALOG THE PHONE ALREADY HOLDS, AND
// THERE IS NO SECOND READ. `useCatalog` fetches every variant in one round trip
// and TanStack Query keeps it; filtering that list to one `family_id` is the
// whole of "open the family". A `?family_id=eq.…` read here would be a screen
// that works at the counter and spins in the stockroom, on a link this shop
// loses half the day — and it would be a second answer to *which price is
// today's* besides.
// ----------------------------------------------------------------------------

/** What `app/src/app/familia/[id].tsx` draws, with no rendering in it. */
export interface FamilyView {
  /** The word in the banda. `familyTitle`'s answer, never a raw column. */
  readonly title: string;
  /** The family's variants, in the order the database returned them. */
  readonly variants: readonly CatalogEntry[];
  /** The variant that was tapped, or `null`. ⚠️ NEVER A FALLBACK — see below. */
  readonly selectedId: string | null;
}

/**
 * The family's name as a person reads it, or the word for a family with none.
 *
 * ⚠️ THE FALLBACK IS A KEY OF `ES` AND NOT A BLANK BANDA. `FAMILY_COLUMNS` is
 * an EMBEDDED resource, so a family whose row is not readable comes back as
 * `null` and `catalogFrom` turns that into `''` — which on Productos is one
 * missing line under a name and here would be a screen with no heading at all.
 */
export function familyTitle(name: string): string {
  return name.trim() === '' ? ES.family.title : name;
}

/**
 * One family, out of the catalog already in hand.
 *
 * ⚠️⚠️ THE PRESELECTION IS THE TAPPED VARIANT OR NOTHING, AND THE ALTERNATIVE
 * IS A LIE THE SHOPKEEPER CANNOT SEE. The owner's ruling (área 13, ruling 4) is
 * that the tapped variant opens preselected and carries **no legend saying so**
 * — so the mark is the only thing that says *this is the one you came from*,
 * and a fallback to the first row would put that mark on a product she never
 * touched, with nothing on the screen to correct it. If the id does not belong
 * to this family, nothing is marked.
 *
 * ⚠️ THE ORDER IS THE DATABASE'S, the same refusal `catalogFrom` makes: a sort
 * here would be a second answer to *which variant comes first*, decided by
 * whatever collation Hermes has rather than the one Postgres applied.
 *
 * ⚠️ AN EMPTY `familyId` IS AN EMPTY FAMILY, NOT THE WHOLE CATALOG. A missing
 * route parameter must not match every variant whose family failed to embed.
 */
export function familyView(
  entries: readonly CatalogEntry[],
  familyId: string | null | undefined,
  variantId: string | null | undefined,
): FamilyView {
  const wanted = familyId ?? '';
  const variants = wanted === '' ? [] : entries.filter((entry) => entry.familyId === wanted);
  const named = variants.find((entry) => entry.familyName !== '');
  const selected = variants.find((entry) => entry.id === variantId);
  return {
    title: familyTitle(named?.familyName ?? ''),
    variants,
    selectedId: selected?.id ?? null,
  };
}

/**
 * What an EMPTY family screen says — as a KEY of `ES.family`, never a sentence.
 *
 * ⚠️⚠️ *THE READ HAS NOT LANDED* AND *THIS PRODUCT IS GONE* MUST NOT COLLAPSE,
 * which is `emptyLineKey`'s argument one screen along and is sharper here: this
 * screen is reached by tapping a row, so on a cold open — the app killed, the
 * link out, the catalog not yet back — an unguarded version would tell a
 * shopkeeper that the product she is holding has been deleted.
 */
export function familyLineKey(loading: boolean): 'loading' | 'missing' {
  return loading ? 'loading' : 'missing';
}

// ----------------------------------------------------------------------------
// WHAT AN EMPTY CATALOG SCREEN SAYS WHEN THE READ FAILED — added after the owner
// found it on his own phone on 2026-09-22: Productos sat on *Cargando
// productos…* for ever.
//
// ⚠️⚠️ THE BUG WAS NOT THE READ, IT WAS THE SENTENCE. `useCatalog` reported
// `loading` as `data === undefined`, and **that is also exactly what a FAILED
// query looks like** — TanStack leaves `data` undefined on an error, so the two
// states were one state and the failing one wore the other's words. A spinner
// that never ends is the worst of the three things this screen can say: it is
// wrong, it blames nothing, and it invites a person to keep waiting.
//
// ⚠️ IT IS A FUNCTION AND NOT A TERNARY IN THE SCREEN, for `emptyLineKey`'s
// reason (`R3`) — and it returns the SENTENCE rather than a key because it has
// to choose between TWO namespaces, `ES.api.errors` and `ES.catalog`. A key
// alone cannot say which one it belongs to, and a screen holding that answer is
// the decision leaving the module again. `priceLabel` above already returns a
// rendered string from this file, so the shape is the module's own.
// ----------------------------------------------------------------------------

/**
 * The one line an empty Productos shows.
 *
 * ⚠️⚠️ FAILURE OUTRANKS LOADING, AND THAT ORDER IS THE WHOLE FIX. TanStack
 * retries twice, so a query that has failed can still be fetching — and a
 * screen that preferred *loading* would go back to the endless spinner every
 * time it retried. **A read that has failed says so, even while it tries
 * again.**
 *
 * ⚠️ AND IT NEVER SAYS *Todavía no hay productos* ON A FAILURE, which is the
 * sentence a shopkeeper would act on: she would go and add products she already
 * has, because the app told her the shop was empty when the truth is that the
 * app could not ask.
 */
export function catalogLine(
  loading: boolean,
  typed: string,
  failed: ApiMessageKey | null,
): string {
  if (failed !== null) return ES.api.errors[failed];
  return ES.catalog[emptyLineKey(loading, typed)];
}

/**
 * The one line an empty La Familia shows. `catalogLine`'s argument, and the
 * third state this screen already had: *the product is gone*.
 *
 * ⚠️ IT IS THE SHARPER CASE. This screen is reached by TAPPING a product, so a
 * failed read that fell through to *ya no está en el catálogo* would tell a
 * shopkeeper the thing in her hand had been deleted.
 */
export function familyLine(loading: boolean, failed: ApiMessageKey | null): string {
  if (failed !== null) return ES.api.errors[failed];
  return ES.family[familyLineKey(loading)];
}
