// ============================================================================
// WHAT THIS SHOP BOUGHT AND SOLD LATELY, AS A LIST YOU CAN OPEN. Plan task
// `5h-ii-a`, and the twenty-third module of `src/api/` — §2.11's boundary,
// `R12`, `R13`.
//
// ⚠️ NO SCREEN AND NO COMPONENT — the `5d-i`, `5e-i`, `5d-iv-a`, `5f-i`, `5g-i`,
// `5g-iii` and `5f.5` shape, for the reason all seven gave: everything decided
// here has a right answer `app/test/api-documents.test.ts` can read. The screen
// is `app/src/app/documentos.tsx` and it decides nothing.
//
// ⚠️⚠️ IT WRITES NOTHING, WHICH IS WHY THIS CHILD CAME FIRST. `5h-ii-b` hangs
// `Corregir` and `Eliminar` off the rows this module returns; `5h-ii-c` answers
// the write that is still in the outbox. **This one is the surface both are
// reached from, and it can be looked at and shipped before anything in this app
// has ever cancelled a document.**
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ IT EXISTS BECAUSE OF HOW THE OWNER SAID HE FINDS A MISTAKE, AND THE ROUND
// THAT ASKED HIM IS `5h-i`
// ----------------------------------------------------------------------------
// Situation 2 of the área 6 simulation round put a 10× cost error into Comprar
// with nobody waiting, and the answer was not an undo button: *"Most likely the
// user will realize if he looks at his purchase history for the last week/couple
// of days."*
//
// ⚠️⚠️ **THAT IS A SCREEN THAT DID NOT EXIST.** `Costos` (`@/api/costs`) is per
// PRODUCT — you tap one product and read its price through time. `today.ts` is a
// figure and a count. `Números` is not built. **Nothing in this app listed
// DOCUMENTS**, which is what a person actually recognises: *that delivery, on
// Tuesday, from him, for that much.*
//
// ⚠️ THE BAR WAS SET BY HIM AND IS RECORDED AS A SCOPE INSTRUCTION RATHER THAN
// AS TASTE: *"if we can add these functionalities easily reachable and usable
// let's do so. We'll polish the interface later."* So this is charged with
// **reachable and correct**, and `5h.5` is where the polish lands.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ ONE MODULE SERVES BOTH KINDS, AND THAT WAS MEASURED RATHER THAN HOPED
// ----------------------------------------------------------------------------
// `sale` and `purchase` are the same document shape — `id`, `occurred_at`,
// `total_net`, `total_tax`, `reversal_of`, `reversal_reason`, `created_by`,
// `recorded_offline`, with `provider_id` the single difference (`0003`). So the
// column list, the void rule, the money arithmetic and the line rendering are
// written once and `DocumentKind` picks the table. **Mirroring `5h-ii-b` to
// Vender is therefore the same build and not a second one**, which is what the
// owner asked for: *"Mirror it for Vender… Make the functionality for both."*
//
// ⚠️ IT IS ONE MODULE AND **TWO ROUND TRIPS**, not one. PostgREST reads one
// table per request and there is no union; `documentsKey` therefore keys per
// kind, and a screen showing both kinds fires two queries that cache separately.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE FOUR THINGS THE WIRE WAS ASKED ABOUT BEFORE A LINE OF THIS FILE WAS
// WRITTEN — all four driven against a real PostgREST on 2026-09-26, because
// every one of them is the kind of claim that is 200 and wrong for ever
// ----------------------------------------------------------------------------
//   1. **A TO-MANY EMBED OVER A COMPOSITE FOREIGN KEY.** Every embed in this app
//      so far is to-ONE — `purchase!inner(…)` from a line, `family(…)` from a
//      variant. This one goes the other way: `purchase_line_header_fk` is
//      `(purchase_id, workspace_id, location_id)` → `purchase (id, workspace_id,
//      location_id)`, read from the PARENT, and it answers **200** with the lines
//      as a nested array. It could as easily have been a 400 about an ambiguous
//      relationship.
//   2. **`::text` INSIDE THAT EMBED.** It holds: every money and quantity field
//      in the nested array arrives as a JSON **string**. Without the cast a bare
//      `numeric` is a JSON number, which is a double, and `parseDecimal` refuses
//      a number argument outright (`R5`).
//   3. **`limit` ON THE PARENT DOES NOT TRUNCATE THE LINES.** `limit=1` over a
//      three-line delivery answers one document carrying all three. The limit
//      counts documents, which is the only reading that makes `DOCUMENTS_LIMIT`
//      mean anything.
//   4. **THE LINE ORDER — and this is the one that changed the design.** See
//      `DOCUMENTS_LINE_ORDER`.
//
// ⚠️ A FIFTH THING, FOUND BY THE FIXTURE RATHER THAN BY THE READ: `record_sale`
// takes **`unit_price_gross_per_base`** and not `unit_price_net_per_base`
// (`0016:59`). A fixture that reuses `record_purchase`'s spelling answers
// **400 / `22023`**, and it is the check's own harness that trips on it.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE DAY IS THE DEVICE'S AND NOT UTC'S, AND `@/api/costs` DISAGREES WITH
// THIS FILE ABOUT IT — SAID HERE RATHER THAN LEFT TO BE DISCOVERED
// ----------------------------------------------------------------------------
// `today.ts`'s header settles the principle for this app: **the phone is in the
// shop, so the device's day is the shop's day**, and `dayStartISO` uses local
// midnight because turning `location.timezone` into an instant needs
// `Intl.DateTimeFormat`, which `R10` does not admit. `dayOf` below is that same
// answer.
//
// ⚠️⚠️ ~~**`costsFrom` TAKES THE OTHER ONE.**~~ **IT DID, FOR ONE DAY, AND THE OWNER
// RULED IT FIXED THE SAME EVENING — `5g-iii-b`, 2026-09-26: *"fix the Costos date."***
// It bucketed on `doc.occurred_at.slice(0, 10)`, the **UTC** calendar date, so in a
// UTC−6 shop a delivery keyed at 19:30 on the 25th was labelled *26 de septiembre* on
// the `Costos` chart and belonged to the 25th by Inicio's window. **Measured, not
// inferred**: `2026-09-26T01:30:00+00:00` slices to `2026-09-26` and is local
// `2026-09-25`. ✅ **`costsFrom` now calls `isoDay` too, and `dayOf` below delegates to
// it rather than spelling the arithmetic a fourth time** — so *what day is it* has
// exactly one answer in this app, which is what `today.ts`'s header asked for.
// ⚠️ **It was found here rather than there**, by a row that had to answer the same
// question and answered it the other way.
//
// ----------------------------------------------------------------------------
// ⚠️ EVERY FIGURE IS AN INTEGER AND EVERY WIRE FIELD IS CAST — `R5`
// ----------------------------------------------------------------------------
// `total_net::text`, `total_tax::text`, `line_net::text`, `tax_amount::text`,
// `qty_display::text`. The money path starts from the same digits Postgres
// stored, and the peso figures are `formatMXN` over integer centavos — the
// arrangement `catalog.ts` already has, and the reason an api module is allowed
// to import `@/format/mxn` at all.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { isoDay } from '@/api/catalog';
import type { ApiMessageKey } from '@/api/errors';
import type { Provider } from '@/api/providers';
import { isWasteReason, reasonLabel } from '@/api/waste';
import { formatMXN } from '@/format/mxn';
import { ES } from '@/strings';

/**
 * The three kinds of document this list holds.
 *
 * ⚠️⚠️ `waste` ARRIVED IN `6a-ii-a` AND THE PREDICTION `5h-ii-a` WROTE HERE CAME
 * TRUE: *"the shape below is a `Record` over this union precisely so `6a` adds a
 * kind and not a module."* **It did** — every constant in this file was already
 * keyed by kind, so the third member cost a row in each rather than a second
 * module. ~~`waste` is absent and it is not an oversight.~~
 *
 * ⚠️⚠️ WHAT THAT PREDICTION GOT WRONG, AND IT IS THE INTERESTING HALF: it said
 * *"`waste` carries the identical header quartet (`0003`)."* **The header
 * COLUMNS are identical and almost nothing else is.** A waste document's lines
 * come off a VIEW rather than a table, carry a CAUSE nothing else has, and carry
 * **no money at all** — so `DOCUMENTS_WASTE_LINE_COLUMNS`,
 * `DOCUMENTS_WASTE_HEAD_COLUMNS` and `DOCUMENTS_WASTE_LINE_ORDER` are their own
 * constants beside the shared ones rather than a third value inside them. **Two
 * reads that genuinely differ want two spellings; one spelling with a branch
 * inside it is how they drift.**
 */
export type DocumentKind = 'purchase' | 'sale' | 'waste';

/**
 * All three kinds, in the order a screen offers them.
 *
 * ⚠️ PURCHASES FIRST, AND THAT IS THE OWNER'S OWN PRIORITY RATHER THAN
 * ALPHABETICAL: *"Compras is completely addressable due to the volume and
 * criticality of it"*, and the situation that produced this whole row was a
 * mis-keyed DELIVERY. A cashier finding a wrong sale is the case he said she
 * fixes by hand and never opens the app for.
 *
 * ⚠️ AND WASTE IS LAST, WHICH IS NOT A JUDGEMENT ABOUT ITS IMPORTANCE. It is the
 * newest and the rarest — a shop keys a handful of write-offs a week against
 * dozens of sales — and the leftmost position is the one a thumb finds without
 * looking. ⚠️ **Whether three buttons fit on one row on a real phone is a
 * look-question and it is `R9`'s**: *Desperdicio* is eleven characters where
 * *Compras* is seven, and the owner's phone decides it.
 */
export const DOCUMENT_KINDS: readonly DocumentKind[] = ['purchase', 'sale', 'waste'];

/** The table each kind's documents come off. Spelled once (`R13`). */
export const DOCUMENTS_TABLE: Readonly<Record<DocumentKind, string>> = {
  purchase: 'purchase',
  sale: 'sale',
  waste: 'waste',
};

/**
 * The table each kind's LINES come off, and the key PostgREST nests them under.
 *
 * ⚠️ IT IS BOTH FACTS AT ONCE, WHICH IS WHY IT IS ONE CONSTANT: the embed is
 * named after the table, so the select fragment and the response key can never
 * drift apart. `linesOf` reads the response by this name.
 */
export const DOCUMENTS_LINE_TABLE: Readonly<Record<DocumentKind, string>> = {
  purchase: 'purchase_line',
  sale: 'sale_line',
  // ⚠️⚠️ A VIEW, AND THE ONLY ENTRY HERE THAT IS NOT A TABLE — `0041`. The name
  // is still both facts at once, because PostgREST nests an embedded view under
  // its own name exactly as it does a table, so `linesOf` reads this key
  // unchanged. ⚠️ **`waste_line` is deliberately NOT named anywhere in this
  // file**: a cashier's embed on it answers `200` with `[]`, so the write-off
  // would render with no products rather than as an error somebody would chase.
  waste: 'waste_reason_line',
};

/**
 * What one line carries, inside the embed.
 *
 * ⚠️ NAMED AND NEVER `*` (`R13`, C8.8). The line tables also hold `qty_base`,
 * `unit_price_net_per_base`, `tax_rate`, `created_at` and — on a purchase —
 * `expiry_date`, and this list draws none of them.
 *
 * ⚠️⚠️ `unit_price_net_per_base` AND `qty_base` WERE ADDED BY `5h-ii-b`, AND THE
 * ROW PREDICTED ONE OF THEM. It re-records a corrected document *"with the old
 * lines prefilled into the cart"*, and a cart line is `{ variantId, base }` —
 * **an integer in THOUSANDTHS of a base unit**, which is what `qty_base` is and
 * what `qty_display` is not. Deriving the base from `qty_display` ×
 * `factor_to_base` would be a SECOND answer to a quantity the database already
 * holds, in the one place a wrong answer re-writes the ledger. ⚠️ **They are the
 * exception C8.8 allows and not a breach of it**: the rule bans a column nothing
 * uses, and `prefillOf` (`@/api/corrections`) is what uses these two. Neither is
 * rendered.
 *
 * ⚠️ `qty_display` AND NOT `qty_base`, WHICH IS THE WHOLE POINT OF THAT COLUMN:
 * `0003` keeps it so *"the review screen can show back the number that was
 * entered rather than a converted one nobody recognises"*. A delivery keyed as
 * **3 kg** reads `3 kg` here and never `3000 gr`.
 *
 * ⚠️ `product_variant(name)` EARNS ITS PLACE TWICE — it is the word a shopkeeper
 * reads AND the key the database sorts the lines by. See
 * `DOCUMENTS_LINE_ORDER`. ⚠️ A plain embed and not `!inner`: a line whose
 * variant this phone may not read is still a line of this document, and
 * `lineOf` names it with `ES.documents.unknownProduct` rather than dropping it —
 * a delivery that quietly lost a row is worse than one with a row it cannot
 * name.
 *
 * ⚠️ `id` IS THE LINE'S OWN AND IS NOT COSMETIC: one document may carry two
 * lines of the SAME variant (measured 2026-09-26 — `record_purchase` accepts
 * it), so `variant_id` is not a key and a renderer needs one.
 */
export const DOCUMENTS_LINE_COLUMNS =
  'id,variant_id,qty_base::text,qty_display::text,qty_display_unit,unit_price_net_per_base::text,line_net::text,tax_amount::text,product_variant(name)';

/**
 * What one WASTE line carries — off `waste_reason_line` (`0041`), and it shares
 * not one money column with the two above.
 *
 * ⚠️⚠️ NO `line_net`, NO `tax_amount`, NO `unit_price_net_per_base`, AND THEY
 * ARE NOT MERELY UNSELECTED — **the view does not have them**, so this is a
 * property of the schema rather than of this string. `0041` carries no money
 * column of any kind, and asking for one is a `42703` rather than a leak.
 * ⚠️ The cost is the owner's ruling; the RETAIL figures are área 9's ruling of
 * 2026-09-14 — *"Desperdicio shows waste as QUANTITY and not as cost or as a
 * rate"* — and the reason bites hardest exactly here: `UNPRICED_WASTE` sends a
 * zero for a product with no shelf price, so a peso column would read `$0.00`
 * beside the products most likely to spoil.
 *
 * ⚠️ `reason` IS THE COLUMN NOTHING ELSE HAS, and it is the wire value rather
 * than a word — `reasonLabel` (`@/api/waste`) is the one-way door to what a
 * shopkeeper reads (`R4`).
 *
 * ⚠️⚠️ `variant_name` IS A PLAIN COLUMN AND NOT `product_variant(name)`, WHICH
 * IS THE ONE DIFFERENCE A READER WILL TRIP OVER. `0041` denormalises the name
 * into the view, for the reason its own header gives at length: a nested embed
 * is a SECOND read with its own fence, on the one list that must not come back
 * empty. **A nested embed also answers 200 here** — it was driven — and it is
 * refused anyway.
 *
 * ⚠️ `qty_base::text` EARNS ITS PLACE THE SAME WAY IT DOES ABOVE: `6a-ii-b`
 * re-records a corrected write-off, and a cart line is an integer in
 * thousandths. It is read and never drawn (C8.8's exception, not a breach).
 */
export const DOCUMENTS_WASTE_LINE_COLUMNS =
  'id,variant_id,qty_base::text,qty_display::text,qty_display_unit,reason,variant_name';

/**
 * The columns each kind's documents are read with, embed included.
 *
 * ⚠️ IT IS `SALE_COLUMNS` (`@/api/today`) PLUS `occurred_at` PLUS THE LINES, and
 * the overlap is deliberate rather than duplicated: that constant answers *what
 * did the shop take today* over the whole table and never renders a document, so
 * it carries no date and no lines. Two reads of one table asking for different
 * columns is not a stale copy; **two constants claiming to be the same read
 * would be.**
 *
 * ⚠️⚠️ `created_by` WAS ADDED BY `5h-ii-b` AND IT IS NEVER RENDERED — it is read
 * so `mayCorrect` (`@/api/corrections`) can hide a button a cashier cannot use.
 * `today.ts` refuses the column for §2.7's reason, which is about SHOWING who
 * rang a sale up; nothing on this screen shows it, and the argument for reading
 * it is the fence rather than the display.
 *
 * ⚠️⚠️ `recorded_offline` AND `recorded_at` ARE STILL ABSENT, AND `5h-ii-b`
 * MEASURED WHY THAT IS RIGHT RATHER THAN INHERITING IT. `0021`'s window is
 * measured from `recorded_at` on an offline write and from `occurred_at`
 * otherwise, so a client that wanted to render the WINDOW half of the fence
 * would need both columns **and a TypeScript copy of that rule** — a second
 * answer to *may she void this*, in the one place a wrong answer hides a button
 * she is allowed to press. **So the client renders only the half it can know for
 * certain and the database answers the rest**, as `TD003`. See `mayCorrect`.
 *
 * ⚠️ `recorded_offline` is an internal state besides, and a shopkeeper does not
 * do bookkeeping ([[users-dont-do-bookkeeping]]).
 *
 * ⚠️ `reversal_reason` IS ABSENT TOO: only STANDING documents survive
 * `documentsFrom`, so nothing in this list has a reason to show.
 *
 * ⚠️⚠️ IT IS **COMPOSED** FROM `DOCUMENTS_HEAD_COLUMNS`, `DOCUMENTS_PROVIDER_COLUMN`
 * AND THE EMBED RATHER THAN SPELLED TWICE, so the two kinds cannot drift and the
 * contract check can build the same two strings out of the same four parts. A
 * hand-written pair would be two claims about one read.
 */
export const DOCUMENTS_HEAD_COLUMNS =
  'id,occurred_at,total_net::text,total_tax::text,reversal_of,created_by';

/**
 * A WASTE document's header — the same columns MINUS the two money ones.
 *
 * ⚠️⚠️ `total_net` AND `total_tax` EXIST ON `waste` AND A CASHIER MAY READ THEM
 * (`waste_select` has no role gate, and `0003` says in words that she sees
 * *"what it was worth on the shelf"*). **They are not asked for anyway**, and
 * that is a decision this row takes and reports rather than a fence.
 *
 * ⚠️ THE ARGUMENT IS ÁREA 9's OWN, APPLIED TO A THIRD SCREEN. Its ruling names
 * *Números and Desperdicio*; `Lo último` is neither — **but the ruling's REASON
 * carries straight over.** `UNPRICED_WASTE` (`@/cart/cart`) sends a zero for a
 * product with no shelf price, so `waste.total_net` is genuinely `0.00` for
 * exactly the products a shop throws away most, and `$0.00` beside twenty kilos
 * of tomatoes in the list she opened to check her own work is worse than no
 * figure at all. **A quantity is what a write-off is worth reading.**
 *
 * ⚠️ REVERSING IT IS THIS CONSTANT AND ONE BRANCH IN `documentsFrom` — no
 * migration, no data, and the retail total is still on the row in Postgres.
 *
 * ⚠️ `created_by` AND `reversal_of` STAY, and neither is rendered: the first is
 * `mayCorrect`'s, the second is what drops a cancelled pair from the list.
 */
export const DOCUMENTS_WASTE_HEAD_COLUMNS = 'id,occurred_at,reversal_of,created_by';

/**
 * The one column the two kinds do NOT share.
 *
 * ⚠️ IT IS ITS OWN CONSTANT SO THE DIFFERENCE BETWEEN A PURCHASE AND A SALE IS
 * ONE NAMED THING RATHER THAN TWO COLUMN LISTS TO KEEP IN STEP — and so
 * `docs/checks/5h-ii-a-documents-contract.sh` can compose the wire spelling out
 * of the app's own parts instead of carrying a second copy of it. That is
 * `MAGNITUDE_ORDER_ASCENDING`'s arrangement: **a check that retypes a contract is
 * asserting itself.**
 */
export const DOCUMENTS_PROVIDER_COLUMN = 'provider_id';

export const DOCUMENTS_COLUMNS: Readonly<Record<DocumentKind, string>> = {
  purchase: `${DOCUMENTS_HEAD_COLUMNS},${DOCUMENTS_PROVIDER_COLUMN},${DOCUMENTS_LINE_TABLE.purchase}(${DOCUMENTS_LINE_COLUMNS})`,
  sale: `${DOCUMENTS_HEAD_COLUMNS},${DOCUMENTS_LINE_TABLE.sale}(${DOCUMENTS_LINE_COLUMNS})`,
  // ⚠️ COMPOSED FROM ITS OWN TWO PARTS, the same way — so the contract check can
  // rebuild this exact string out of the app's constants rather than retyping it.
  waste: `${DOCUMENTS_WASTE_HEAD_COLUMNS},${DOCUMENTS_LINE_TABLE.waste}(${DOCUMENTS_WASTE_LINE_COLUMNS})`,
};

/**
 * The order the database applies to the DOCUMENTS — newest first.
 *
 * ⚠️⚠️ IT IS THE PARENT'S **OWN** COLUMN, WHICH IS THE ONE THING THAT MAKES THIS
 * READ SIMPLER THAN `COSTS_ORDER` AND IS WORTH SAYING SO NOBODY COPIES THE
 * WRONG PATTERN IN. `@/api/costs` and `@/api/magnitude` read `purchase_line` and
 * sort by the DOCUMENT's instant, so both must spell the order as the column
 * expression `purchase(occurred_at)` and both carry a paragraph about the
 * `{ referencedTable }` trap. **This read starts at the document**, so
 * `occurred_at` is a plain column on the table being selected and there is no
 * trap to walk into.
 *
 * ⚠️ `occurred_at` AND NEVER `recorded_at` — `TODAY_COLUMN`'s reason. A delivery
 * keyed at 17:00 and synced at 21:00 belongs to 17:00, and the pilot store is
 * offline half the day.
 */
export const DOCUMENTS_ORDER = 'occurred_at';

/** Descending. Its own constant so the check composes the wire spelling out of
 *  the same two values the app sends rather than carrying a third copy. */
export const DOCUMENTS_ORDER_ASCENDING = false;

/**
 * The tiebreak, so the list is reproducible.
 *
 * ⚠️⚠️ WITHOUT IT TWO DOCUMENTS AT THE IDENTICAL INSTANT COME BACK IN WHATEVER
 * ORDER THE PLANNER CHOSE, AND THAT MATTERS MORE HERE THAN IT LOOKS. `5h-ii-b`
 * acts on *the row you tapped*; a list that reorders itself between two reads is
 * one where a thumb lands on a different document than the eye chose. ⚠️ It is
 * nearly unreachable today — `timestamptz` is microsecond-resolution and an
 * offline write stamps milliseconds — which is exactly why it is one constant
 * now rather than a bug report later.
 *
 * ⚠️ DESCENDING WITH THE INSTANT, so ties read as one consistent block rather
 * than as an order that inverts halfway down the screen.
 */
export const DOCUMENTS_TIEBREAK = 'id';

/**
 * The order the database applies to the LINES **inside** one document.
 *
 * ⚠️⚠️ THIS IS THE `{ referencedTable }` SPELLING `COSTS_ORDER` FORBIDS, AND IT
 * IS CORRECT HERE FOR EXACTLY THE REASON IT IS WRONG THERE. That constant's
 * paragraph says the option form sets `<table>.order`, sorts the embedded rows
 * *inside* each parent, and on a **to-one** embed is a silent no-op. ⚠️ **This
 * embed is to-MANY**, and sorting the rows inside each parent is precisely what
 * is wanted — so the two files use opposite spellings and neither is a mistake.
 * `docs/checks/5h-ii-a-documents-contract.sh` drives both and shows which one
 * moves this read.
 *
 * ⚠️⚠️ AND THE REASON AN ORDER IS NEEDED AT ALL IS A MEASUREMENT THAT SETTLES A
 * QUESTION THIS ROW WOULD OTHERWISE HAVE GUESSED: **nothing in this schema
 * records the order a shopkeeper keyed her lines in.** There is no ordinal
 * column, and `created_at` is **identical across every line of one document** —
 * one `insert … select` inside one transaction, so `now()` is one value (checked
 * on the applied schema 2026-09-26: three lines, one microsecond). Left
 * unordered the lines come back in heap order, which today happens to equal the
 * keyed order and is guaranteed by nothing — a `VACUUM`, an update or a
 * different plan reshuffles it **with nothing anywhere going red**, and a
 * shopkeeper comparing this screen to a paper note would watch the rows move.
 *
 * ⚠️⚠️ SO THE ORDER IS THE PRODUCT'S NAME, AND IT IS THE DATABASE THAT SORTS —
 * `product_variant(name)`, a **nested** embedded column, driven on 2026-09-26
 * and answering 200 with the lines alphabetical. That buys the one order a
 * person can predict without a second sort in this runtime, which is the rule
 * `catalogFrom` and `providersFrom` both wrote down: a sort here would be a
 * second answer to an order the database already has.
 *
 * ⚠️ WHAT IT COSTS, NAMED RATHER THAN HIDDEN: a delivery does NOT read back in
 * the order it was typed, and no client change can make it. That is a migration
 * — an ordinal on the line — and it is not this row's to take.
 */
export const DOCUMENTS_LINE_ORDER = 'product_variant(name)';

/** Ascending: A before Z, which is the only direction a name list has. */
export const DOCUMENTS_LINE_ORDER_ASCENDING = true;

/**
 * The order the database applies to a WASTE document's lines — **two keys**.
 *
 * ⚠️⚠️ ONE KEY IS NOT ENOUGH HERE AND THAT IS A FACT ABOUT THE SCHEMA RATHER
 * THAN A PREFERENCE: `reason` lives on the LINE (`0003`), so one document may
 * legitimately carry **the same product twice under two causes** — measured, the
 * same variant twice is two rows and a 200. Ordered on the name alone those two
 * lines are tied, and a tie falls back to heap order, which reshuffles on a
 * `VACUUM` with nothing anywhere going red. That is `DOCUMENTS_LINE_ORDER`'s own
 * argument arriving a second time and arriving worse.
 *
 * ⚠️⚠️ WHETHER POSTGREST COULD ORDER A TO-MANY EMBED ON TWO KEYS AT ALL WAS
 * UNMEASURED WHEN THIS ROW WAS WRITTEN, AND IT IS MEASURED NOW: it can.
 * `waste_reason_line.order=variant_name.asc,reason.asc` sorted a four-line
 * document correctly, the `desc,desc` spelling inverted it, and heap order
 * equalled neither — which is what makes the middle result evidence rather than
 * a coincidence. **Two `.order()` calls naming the same `referencedTable` append
 * to one parameter**, which is postgrest-js's documented behaviour and is what
 * `recentDocuments` relies on.
 *
 * ⚠️ BOTH KEYS ARE THE VIEW'S **OWN** COLUMNS and neither is a nested embedded
 * expression — that is what `0041` denormalising `variant_name` buys, and it is
 * the third reason that column exists.
 *
 * ⚠️⚠️ AND THE SECOND KEY SORTS BY **DECLARATION** AND NOT ALPHABETICALLY,
 * because `reason` is an enum ([[postgres-enum-sorts-by-declaration]]). That is
 * wanted: it is the order `WASTE_REASONS` offers the causes in on the capture
 * screen, so the picker and this list agree. Measured on the applied enum —
 * `merma de preparación` sorts BEFORE `error de captura`, and the alphabet puts
 * them the other way round.
 */
export const DOCUMENTS_WASTE_LINE_ORDER: readonly string[] = ['variant_name', 'reason'];

/**
 * How far back the list reaches, in days.
 *
 * ⚠️ IT IS THE OWNER'S OWN WINDOW: *"if he looks at his purchase history for the
 * last week/couple of days."* Seven days is the wider of the two things he said,
 * and the narrower one is a scroll rather than a setting.
 *
 * ⚠️ IT IS COUNTED FROM LOCAL MIDNIGHT AND NOT FROM THIS INSTANT — see
 * `sinceISO`. *A week ago* at 14:07 would otherwise hide a delivery keyed at
 * 09:00 seven days back, which is the sort of edge a shopkeeper reads as the app
 * having lost it.
 */
export const DOCUMENTS_DAYS = 7;

/**
 * And how many documents, at most.
 *
 * ⚠️⚠️ BOTH BOUNDS EXIST AND THEY GUARD DIFFERENT THINGS, which is why this is
 * not `MAGNITUDE_LIMIT`'s single cap. The WINDOW is what he asked for; the COUNT
 * is what protects a phone. A shop ringing 60 sales a day lays down ~420 sale
 * documents a week, each with its lines — so the window alone is a payload the
 * pilot store's signal would not carry ([[pilot-store-is-offline-a-lot]]).
 *
 * ⚠️ NEWEST FIRST MEANS THE CAP DROPS THE OLDEST, which is the right failure:
 * the list thins at the far end, where a mistake has already been paid for,
 * rather than at the near end, where it is still fixable.
 *
 * ⚠️ SIXTY IS A MONTH OF DELIVERIES AND ABOUT A DAY OF SALES, which is the
 * asymmetry this app cannot resolve with one number and does not try to: the
 * screen shows one kind at a time, so a cashier's busy day never buries
 * Tuesday's delivery. ⚠️ **ADR-035 §7 lists thresholds of this shape under
 * Reversible** — this is a one-line edit with no migration behind it.
 */
export const DOCUMENTS_LIMIT = 60;

/** The column the window filters on — `DOCUMENTS_ORDER`'s column, spelled once. */
export const DOCUMENTS_SINCE_COLUMN = DOCUMENTS_ORDER;

/**
 * The query key one kind's recent documents cache under.
 *
 * ⚠️ THE KIND IS IN THE KEY, `costsKey`'s rule: serving the sales under the
 * purchases would be a lie that looks exactly like a fact, and on this screen it
 * would be a lie somebody is about to press a correction button against.
 *
 * ⚠️ THE WINDOW IS **NOT** IN THE KEY, and that is deliberate. `sinceISO` reads
 * a clock, so keying on it would mint a new cache entry every render and this
 * list would re-fetch on every keystroke elsewhere in the app. The window is
 * computed in the call (`recentDocuments`), the same arrangement `todaySales`
 * has with `dayStartISO`.
 */
export function documentsKey(kind: DocumentKind): readonly unknown[] {
  return ['documents', 'recent', kind];
}

/**
 * The instant the window opens — local midnight, `days` days ago.
 *
 * ⚠️ NO `Intl`, WHICH IS THE WHOLE CONSTRAINT — `dayStartISO`'s paragraph in
 * `@/api/today` carries the argument in full: `R5` allows no `Intl` outside
 * `src/format/mxn.ts` and `R10` admits only `format` and `resolvedOptions`, so
 * `location.timezone` cannot be turned into an instant on a phone. `new Date(y,
 * m, d)` constructs at LOCAL midnight and `toISOString()` renders the UTC
 * instant PostgREST compares against; both are ES5.
 *
 * ⚠️ IT TAKES `now` RATHER THAN READING THE CLOCK (`R3`) — a function that calls
 * `new Date()` itself cannot be asserted at a boundary, and every interesting
 * case here IS a boundary. ⚠️ `getDate() - days` IS SAFE ACROSS A MONTH AND A
 * YEAR: the `Date` constructor normalises a negative day into the previous
 * month, so 3 January less seven days is 27 December without this function
 * knowing how long December is.
 */
export function sinceISO(now: Date, days: number): string {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - days,
    0,
    0,
    0,
    0,
  ).toISOString();
}

/** The product a line names, as PostgREST embeds it under `DOCUMENTS_LINE_COLUMNS`. */
export interface DocumentVariantRow {
  readonly name: string;
}

/** One line of a document, as PostgREST sends it. */
export interface DocumentLineRow {
  readonly id: string;
  readonly variant_id: string;
  /** ⚠️ THOUSANDTHS OF A BASE UNIT, cast to text — `numeric(14,3)`. Never
   *  rendered; `baseOf` turns it into the integer a cart line holds. */
  readonly qty_base: string;
  /** In `qty_display_unit`, a decimal string at scale 3. See the columns. */
  readonly qty_display: string;
  readonly qty_display_unit: string;
  /**
   * ⚠️ NET, per base unit, scale 6 — the spelling `record_purchase` takes
   * (`0018`). Never rendered; it prefills a re-recorded delivery's price box.
   *
   * ⚠️⚠️ OPTIONAL SINCE `6a-ii-a`, AND THE THREE MONEY FIELDS BELOW WITH IT —
   * **because `0041` genuinely does not have them.** Making them required was a
   * claim that every line of every kind carries money, which stopped being true
   * the moment a write-off became a document; leaving them required and sending
   * `''` from a fixture would have been the test lying about the wire on behalf
   * of the type. `lineOf` reads their ABSENCE and answers `null`, which is a
   * different silence from *this phone could not read it*.
   */
  readonly unit_price_net_per_base?: string;
  /** Net of IVA, a decimal string at scale 2. ⚠️ Absent on a waste line. */
  readonly line_net?: string;
  /** ⚠️ Absent on a waste line — see above. */
  readonly tax_amount?: string;
  /** `null` when this phone may not read the variant — see the columns. */
  readonly product_variant?: DocumentVariantRow | null;
  /**
   * ⚠️ WASTE ONLY — the wire value of `public.waste_reason` (`0003:419`), not a
   * word. `reasonLabel` turns it into one. Absent on the other two kinds.
   */
  readonly reason?: string | null;
  /**
   * ⚠️ WASTE ONLY — the product's name as a plain column on `0041`, where the
   * other two kinds carry it under the nested `product_variant` embed. `lineOf`
   * prefers whichever is present, which is what lets ONE mapper serve all three.
   */
  readonly variant_name?: string | null;
}

/**
 * A `purchase` or `sale` row as PostgREST sends it, under `DOCUMENTS_COLUMNS`.
 *
 * ⚠️ THE LINES ARRIVE UNDER THE LINE TABLE'S OWN NAME, so one interface carries
 * both optional and `linesOf` picks by kind. **That is honest about the wire
 * rather than tidy**: a single `lines` field would mean this file renaming a key
 * the database chose, and the check would then be asserting this file's
 * vocabulary instead of PostgREST's.
 */
export interface DocumentRow {
  readonly id: string;
  readonly occurred_at: string;
  /** ⚠️ ABSENT ON A WASTE DOCUMENT — `DOCUMENTS_WASTE_HEAD_COLUMNS` does not ask
   *  for it, so the two money fields are optional rather than empty strings. */
  readonly total_net?: string;
  readonly total_tax?: string;
  /** ⚠️ WHO KEYED IT. Never rendered — `mayCorrect` is the only reader. */
  readonly created_by: string | null;
  /** Set when this document VOIDS another one. */
  readonly reversal_of: string | null;
  /** Purchases only — who the shop bought from. */
  readonly provider_id?: string | null;
  readonly purchase_line?: readonly DocumentLineRow[] | null;
  readonly sale_line?: readonly DocumentLineRow[] | null;
  /** ⚠️ NAMED AFTER THE VIEW `0041` CREATES, not after `waste_line`. */
  readonly waste_reason_line?: readonly DocumentLineRow[] | null;
}

/** One line, ready to draw. */
export interface DocumentLine {
  /** The line's own id — a renderer's key. Two lines may share a variant. */
  readonly id: string;
  readonly variantId: string;
  /** The product's name, or `ES.documents.unknownProduct`. */
  readonly name: string;
  /** What was keyed and in what — `3 kg`, `1.500 kg`, `12 pza`. */
  readonly quantity: string;
  /**
   * Gross of IVA, rendered — `$55.50`.
   *
   * ⚠️⚠️ `null` ON A WASTE LINE, AND THAT IS NOT THE SAME AS
   * `ES.documents.noFigure`. This app now has two different silences about
   * money and they must not collapse into one: `noFigure` means *a figure
   * existed and this phone could not read it*, and `null` here means **no money
   * is shown for this kind of document at all** — área 9's ruling, see
   * `DOCUMENTS_WASTE_HEAD_COLUMNS`. A screen renders nothing for `null` and
   * renders the sentence for the other.
   */
  readonly amount: string | null;
  /**
   * ⚠️ THE CART'S OWN INTEGER — thousandths of a base unit — or `null` when
   * `qty_base` did not parse. **Nothing draws it.** `CartLine.base` is this
   * number, which is why it is carried rather than re-derived from `quantity`:
   * that string has already been trimmed for reading (`trimmed`) and is in a
   * DISPLAY unit, so turning it back would need the unit table and would be a
   * second answer to a quantity the database already gave.
   */
  readonly base: number | null;
  /**
   * ⚠️ THE CAUSE, AS A WORD A SHOPKEEPER READS — or `null` on a purchase, a sale
   * and a waste line whose `reason` this app does not recognise.
   *
   * ⚠️⚠️ `isWasteReason` GUARDS IT AND THE UNKNOWN CASE ANSWERS `null` RATHER
   * THAN THE RAW STRING, which is the opposite of what `lineOf` does with a
   * unit code — and the two differ for a reason. A unit code this app does not
   * know is still legible to a person (`kg`, `pza`); a `waste_reason` this app
   * does not know would be a Spanish phrase rendered straight off the wire,
   * which is exactly the thing `R4` and `reasonLabel` exist to prevent. **It can
   * only happen if a migration adds a sixth cause**, and then the honest answer
   * on this screen is to say nothing rather than to leak the enum.
   */
  readonly reason: string | null;
  /**
   * ⚠️ THE NET UNIT PRICE AS STORED, verbatim — or `null` when the column was
   * unreadable. **Nothing draws it.** It is handed straight back to
   * `setPrice('buy', …)`, which is why it is not parsed here: `quoted` parses it
   * at scale 6 and a round trip through a number would be a second rounding.
   */
  readonly perBase: string | null;
}

/** One document, ready to draw. */
export interface ShopDocument {
  readonly id: string;
  readonly kind: DocumentKind;
  /** `occurred_at` verbatim, for whatever needs the instant. */
  readonly at: string;
  /** The DEVICE's own calendar day, `YYYY-MM-DD` — see this file's header. */
  readonly day: string;
  /**
   * Who the shop bought from, or `null` on a sale.
   *
   * ⚠️ IT IS RESOLVED FROM `@/api/providers` AND NOT EMBEDDED, which is
   * `costsFrom`'s arrangement and is what keeps the two kinds' reads identical:
   * a `provider(name)` embed would exist on one table and not the other, and
   * `5h-ii-b` would inherit two column lists to widen instead of one. ✅ **It
   * did, and it widened one.**
   */
  readonly counterparty: string | null;
  /**
   * ⚠️ THE SUPPLIER'S ID, or `null` on a sale and on a purchase whose
   * `provider_id` was unreadable. `counterparty` is the WORD and this is the
   * KEY: a corrected delivery is re-recorded against the SAME supplier, and
   * `openProvider` takes an id. ⚠️ It is `null` on a sale for the same reason
   * `counterparty` is — a sale has no counterparty in this schema.
   */
  readonly providerId: string | null;
  /**
   * ⚠️ WHO KEYED IT, or `null`. **Never rendered** — see
   * `DOCUMENTS_HEAD_COLUMNS` for why it is read at all. `mayCorrect` compares
   * it with the signed-in person to hide a button a cashier cannot use.
   */
  readonly createdBy: string | null;
  /**
   * ⚠️ THE CAUSE OF A WRITE-OFF, when every line of it shares one — or `null`
   * on a purchase, on a sale, and on a waste document whose lines disagree.
   *
   * ⚠️⚠️ IT IS THE HEADER'S `counterparty` SLOT FOR A WRITE-OFF, and the two are
   * the same question asked of different documents: a delivery's second line is
   * WHO, a write-off's is WHY. They are separate fields rather than one
   * overloaded string because a test that reads `counterparty` on a waste row
   * should get `null` and not a cause wearing a supplier's name.
   *
   * ⚠️⚠️ AND `null` ON A MIXED DOCUMENT IS WHAT MAKES THE PER-LINE CAUSE APPEAR.
   * `6a-i`'s capture screen sends ONE cause per document, so the common case is
   * uniform and the word is said once; but the database permits a mix (measured)
   * and `6a-ii-b`'s corrections will re-record one, so the rare case has to
   * render. **The screen draws the per-line cause exactly when this is `null`**,
   * which is one rule rather than two states to keep in step.
   */
  readonly cause: string | null;
  /**
   * Gross of IVA, rendered — or `null` on a write-off.
   *
   * ⚠️ SEE `DocumentLine.amount`: `null` is *this kind shows no money*, and
   * `ES.documents.noFigure` is *this phone could not read the figure*.
   */
  readonly amount: string | null;
  /** Gross of IVA in integer centavos, or `null` when a figure was unreadable
   *  and on every write-off, which carries no money at all. */
  readonly grossCentavos: number | null;
  readonly lines: readonly DocumentLine[];
}

/**
 * What the list knows.
 *
 * ⚠️ `unknown` IS NOT `nothing`, AND IT IS THE DISTINCTION PRODUCTOS DID NOT
 * HAVE — `takingsFrom`'s paragraph carries the argument. `undefined` is what
 * TanStack holds while a read is in flight AND after one has failed; an empty
 * array is a shop that genuinely bought nothing this week. Collapsing the two
 * puts a confident *nothing here* in front of a shopkeeper looking for the
 * delivery she is sure she keyed.
 */
export type DocumentsState = 'unknown' | 'nothing' | 'some';

export interface Documents {
  readonly state: DocumentsState;
  readonly documents: readonly ShopDocument[];
}

/** Nothing read, which is not nothing bought. */
export const NOTHING_READ: Documents = Object.freeze({
  state: 'unknown',
  documents: Object.freeze([]) as readonly ShopDocument[],
}) as Documents;

/**
 * The documents a shopkeeper can look at, out of the rows the window already
 * narrowed.
 *
 * ⚠️⚠️ **STANDING DOCUMENTS ONLY — A REVERSAL AND THE DOCUMENT IT CANCELS BOTH
 * DROP.** That is `costsFrom`'s rule and `takingsFrom`'s two passes before it,
 * and here it is the owner's own answer rather than an inference: asked what a
 * corrected delivery should look like a week later, he said ***"Just one line,
 * clean"*** — no *corregido* mark and no struck-through pair. ⚠️ The document a
 * reversal cancels can appear ANYWHERE in the response, including after it, so
 * the reversed ids are collected in a first pass.
 *
 * ⚠️⚠️ AND THAT IS WHAT MAKES THIS LIST SAFE FOR `5h-ii-b` TO HANG BUTTONS OFF:
 * `<kind>_one_reversal_idx` makes a document reversible at most once, so
 * anything still standing here has not been corrected and a `Corregir` on it
 * cannot be a double-tap.
 *
 * ⚠️ THE WINDOW AND THE ORDER ARE THE QUERY'S AND ARE NOT REPEATED HERE — the
 * rule `takingsFrom` wrote down. A second copy of *which rows are recent* in
 * TypeScript would be a second answer to it; `docs/checks/5h-ii-a-documents-contract.sh`
 * drives the window and the order past a real PostgREST instead.
 *
 * ⚠️⚠️ AN UNREADABLE TOTAL WITHHOLDS THAT DOCUMENT'S FIGURE RATHER THAN
 * SHRINKING IT, and the document still appears. `takingsFrom` withholds a SUM
 * because a smaller number is indistinguishable from a correct one and gets
 * compared against the till; a LIST has no sum to spoil, and dropping the row
 * would hide the very delivery somebody came here to find. **So the row stands
 * and its amount reads `ES.documents.noFigure`** — which is the honest half of
 * [[users-dont-do-bookkeeping]]: she is never shown our missing data as her
 * mistake, and never shown nothing where something happened.
 *
 * @param kind      which table these rows came off — it is not on the row.
 * @param rows      what PostgREST sent, or `undefined` in flight or after a fail.
 * @param providers the shop's directory, for a purchase's counterparty name.
 */
export function documentsFrom(
  kind: DocumentKind,
  rows: readonly DocumentRow[] | null | undefined,
  providers: readonly Provider[] = [],
): Documents {
  if (rows === null || rows === undefined) return NOTHING_READ;

  const reversed = new Set<string>();
  for (const row of rows) {
    const of = row.reversal_of;
    if (typeof of === 'string' && of !== '') reversed.add(of);
  }

  const named = new Map<string, Provider>();
  for (const one of providers) named.set(one.id, one);

  const documents: ShopDocument[] = [];
  for (const row of rows) {
    if (typeof row.id !== 'string' || row.id === '') continue;
    if (typeof row.reversal_of === 'string' && row.reversal_of !== '') continue;
    if (reversed.has(row.id)) continue;

    const day = dayOf(row.occurred_at);
    if (day === null) continue;

    const lines = linesOf(kind, row).map(lineOf);
    documents.push({
      id: row.id,
      kind,
      at: row.occurred_at,
      day,
      counterparty: counterpartyOf(kind, row, named),
      providerId: providerIdOf(kind, row),
      cause: causeOf(kind, lines),
      createdBy:
        typeof row.created_by === 'string' && row.created_by !== '' ? row.created_by : null,
      // ⚠️⚠️ A WRITE-OFF SHOWS NO MONEY AT ALL — not a withheld figure, an
      // ABSENT one. `DOCUMENTS_WASTE_HEAD_COLUMNS` does not even ask for the
      // totals, so there is nothing here to withhold; see that constant for
      // área 9's ruling and why the reason bites hardest on this screen.
      amount: kind === 'waste' ? null : amountOf(row.total_net, row.total_tax),
      grossCentavos: kind === 'waste' ? null : grossOf(row.total_net, row.total_tax),
      lines,
    });
  }

  return { state: documents.length === 0 ? 'nothing' : 'some', documents };
}

/**
 * The lines PostgREST nested under this kind's own table name.
 *
 * ⚠️ AN ABSENT EMBED IS AN EMPTY LIST AND NEVER A THROWN ERROR. Nothing in this
 * schema writes a document with no lines — `record_purchase` and `record_sale`
 * both refuse an empty array (`0016:183`, `0018`) — so this is the branch that
 * exists so a column list edited wrongly shows an empty document rather than a
 * white screen in a shop.
 */
function linesOf(kind: DocumentKind, row: DocumentRow): readonly DocumentLineRow[] {
  const lines =
    kind === 'purchase'
      ? row.purchase_line
      : kind === 'sale'
        ? row.sale_line
        : // ⚠️ THE VIEW'S NAME, which is `DOCUMENTS_LINE_TABLE.waste` and never
          // `waste_line` — a cashier's embed on the base table answers `[]`, and
          // this branch would then hand back a write-off with no products.
          row.waste_reason_line;
  return Array.isArray(lines) ? lines : [];
}

/**
 * The one cause a write-off was filed under, or `null`.
 *
 * ⚠️⚠️ `null` MEANS TWO DIFFERENT THINGS AND BOTH WANT THE SAME RENDERING: *this
 * is not a write-off*, and *this write-off mixes causes*. In the second case the
 * screen falls back to drawing the cause on each line, which is the only honest
 * thing it can do — **there is no single word that describes a document holding
 * two.** A document with no readable cause at all answers `null` too, and gets
 * the same treatment.
 *
 * ⚠️ IT READS THE MAPPED LINES AND NOT THE ROWS, so it agrees with what is drawn
 * by construction: a cause `isWasteReason` refused is `null` on the line and
 * therefore cannot be the document's uniform one either.
 *
 * ⚠️⚠️ EXPORTED, AND THE ARGUMENT IS `lineQuantity`'s AND `shownAmount`'s A THIRD
 * TIME: `@/offline/unsent` draws a QUEUED write-off in the same list, off a
 * payload rather than off a view, and *does this document have one cause* must
 * have one answer or the row changes shape the moment it lands.
 *
 * ⚠️ THE PARAMETER IS `string` AND NOT `DocumentKind` FOR THAT CALLER'S SAKE — a
 * `QueuedWrite.kind` is a `WriteKind`, which has a fourth member. Widening here
 * is cheaper than a cast there, and the function answers `null` for anything
 * that is not a write-off anyway.
 */
export function causeOf(kind: string, lines: readonly DocumentLine[]): string | null {
  if (kind !== 'waste' || lines.length === 0) return null;
  const first = lines[0]?.reason ?? null;
  if (first === null) return null;
  return lines.every((line) => line.reason === first) ? first : null;
}

/**
 * Who the shop bought from — or `null`, which is what a sale has.
 *
 * ⚠️ THE GENERIC PROVIDER READS `ES.costs.generic` (*compra directa*) AND NOT
 * ITS ROW'S NAME, which is `costsFrom`'s own rule: `Genérico` is a schema word
 * and not something a shopkeeper says. ⚠️ **A provider id this phone cannot
 * resolve reads `null` rather than an id**, because a uuid on a screen is worse
 * than a missing line of text — the read may simply still be in flight.
 */
function counterpartyOf(
  kind: DocumentKind,
  row: DocumentRow,
  named: Map<string, Provider>,
): string | null {
  if (kind !== 'purchase') return null;
  const id = row.provider_id;
  if (typeof id !== 'string' || id === '') return null;
  const provider = named.get(id);
  if (provider === undefined) return null;
  return provider.isGeneric ? ES.costs.generic : provider.name;
}

/**
 * One line, rendered.
 *
 * ⚠️ THE QUANTITY IS TRIMMED BY `qtyShown`'s RULE AND NOT BY A SECOND ONE:
 * an all-zero fraction goes, a significant one stays. C3.8's two examples are
 * exactly that — `750.000` reads `750`, and a quarter kilo reads `0.250` and
 * never `0.25`. ⚠️ **No conversion happens here at all**, which is the
 * difference from `qtyShown`: `qty_display` is already in the unit somebody
 * typed, so there is no factor to apply and no rounding to get wrong.
 *
 * ⚠️ THE UNIT'S WORD COMES FROM `ES.units` AND NEVER FROM THE CODE (`R4`) —
 * `g` reads *gr*. ⚠️ A code this app does not know reads back verbatim rather
 * than being dropped: `0001` holds ten and `ES.units` names all ten, so this is
 * the branch that keeps a future unit legible instead of silently unitless.
 */
function lineOf(row: DocumentLineRow): DocumentLine {
  // ⚠️⚠️ TWO PLACES THE NAME CAN BE, AND ONE MAPPER FOR ALL THREE KINDS. A
  // purchase and a sale carry it under the nested `product_variant` embed; a
  // waste line carries it as `variant_name`, a plain column on `0041` (see
  // `DOCUMENTS_WASTE_LINE_COLUMNS` for why it is denormalised). Reading both and
  // preferring whichever is present is what keeps this one function rather than
  // three — **and the fall-through to `unknownProduct` is unchanged**, which is
  // what a waste line whose view row lost its join would get.
  const name = row.product_variant?.name ?? row.variant_name;
  // ⚠️ MONEY IS ABSENT RATHER THAN ZERO ON A WASTE LINE. The view has no
  // `line_net`, so `amountOf` would answer `ES.documents.noFigure` — *we could
  // not read it* — which is the wrong sentence for *there is nothing to read*.
  const priced =
    typeof row.line_net === 'string' && typeof row.tax_amount === 'string';
  return {
    id: typeof row.id === 'string' ? row.id : '',
    variantId: typeof row.variant_id === 'string' ? row.variant_id : '',
    name: typeof name === 'string' && name !== '' ? name : ES.documents.unknownProduct,
    quantity: lineQuantity(row.qty_display, row.qty_display_unit),
    amount: priced ? amountOf(row.line_net, row.tax_amount) : null,
    base: baseOf(row.qty_base),
    reason: isWasteReason(row.reason) ? reasonLabel(row.reason) : null,
    perBase:
      typeof row.unit_price_net_per_base === 'string' && row.unit_price_net_per_base !== ''
        ? row.unit_price_net_per_base
        : null,
  };
}

/**
 * `"2000.000"` → `2000000`, the integer a cart line holds.
 *
 * ⚠️ `SCALE.quantity` AND NOT A LITERAL 3 — `qty_base` is `numeric(14,3)` and
 * `@tienda/money` is where that scale is written down.
 *
 * ⚠️⚠️ A `null` IS A QUANTITY THIS APP WILL NOT GUESS, and `prefillOf` DROPS the
 * line rather than substituting one. A delivery re-recorded with a quantity
 * nobody keyed is a wrong number in the ledger; a delivery re-recorded with a
 * line missing is something she can see on the screen she is standing on.
 * ⚠️ Zero and negative are refused for the same reason: `setQty` would take
 * either, and a reversal's lines are NEGATIVE (`0021`) — a reversal never
 * reaches this function because `documentsFrom` drops it, and this is the
 * second lock on that door.
 */
function baseOf(figure: string): number | null {
  try {
    const base = parseDecimal(figure, SCALE.quantity);
    return Number.isInteger(base) && base > 0 ? base : null;
  } catch {
    return null;
  }
}

/**
 * The supplier's id on a purchase, `null` on a sale.
 *
 * ⚠️ IT IS SEPARATE FROM `counterpartyOf` BECAUSE THEY ANSWER DIFFERENT
 * QUESTIONS AND FAIL DIFFERENTLY. That one resolves a NAME and answers `null`
 * when the directory has not arrived, or when the provider is the generic
 * bucket it renames; this one is the key as stored, and **the generic provider
 * keeps its id here** — a re-recorded *compra directa* is filed against the
 * generic provider exactly as the original was.
 */
function providerIdOf(kind: DocumentKind, row: DocumentRow): string | null {
  if (kind !== 'purchase') return null;
  const id = row.provider_id;
  return typeof id === 'string' && id !== '' ? id : null;
}

/**
 * `3 kg` — the figure as keyed, and its unit's own word.
 *
 * ⚠️⚠️ EXPORTED BY `5h-ii-c`, WHICH DRAWS A QUEUED DOCUMENT IN THE SAME LIST.
 * A write still in the outbox carries `qty_display` and `qty_display_unit` under
 * the very same names (`0016`/`0018`'s `p_lines` spelling, which is what the
 * queue stores), so **the only difference between a queued line and a landed one
 * is where the two strings came from.** A second copy of this function in
 * `@/offline/unsent` would be two answers to *how is a quantity written on this
 * screen*, and the drift would be silent: `750.000` reading `750` on one row and
 * `750.000` on the one above it.
 */
export function lineQuantity(figure: string, unitCode: string): string {
  const word = unitWord(unitCode);
  const shown = trimmed(figure);
  if (shown === null) return word === '' ? ES.documents.noFigure : word;
  return word === '' ? shown : `${shown} ${word}`;
}

/**
 * ⚠️ THE LOOKUP IS A `Record` READ AND NOT A CAST, so a code absent from
 * `ES.units` is `undefined` here rather than a silent `undefined` on screen.
 */
function unitWord(code: string): string {
  if (typeof code !== 'string' || code === '') return '';
  const words: Readonly<Record<string, string>> = ES.units;
  return words[code] ?? code;
}

/**
 * ⚠️ THE POINT GOES WITH ITS ZEROS AND ONLY WHEN THEY ARE ALL ZEROS —
 * `catalogEdit`'s `trimZeros` trims any trailing zero, which would turn
 * `0.250` into `0.25`; `qtyShown` trims only an all-zero fraction, which is
 * C3.8. **This is `qtyShown`'s rule**, and the two are deliberately not the same
 * function: one converts and this one does not.
 */
function trimmed(figure: string): string | null {
  if (typeof figure !== 'string' || figure === '') return null;
  const dot = figure.indexOf('.');
  if (dot === -1) return figure;
  return /^0+$/.test(figure.slice(dot + 1)) ? figure.slice(0, dot) : figure;
}

/** Gross of IVA, rendered — or `ES.documents.noFigure` when either half is unreadable. */
function amountOf(net: string | undefined, tax: string | undefined): string {
  return shownAmount(grossOf(net, tax));
}

/**
 * A peso figure this list may show, or the sentence that says it could not be
 * read.
 *
 * ⚠️⚠️ EXPORTED BY `5h-ii-c` FOR THE SAME REASON AS `lineQuantity`: a queued
 * document's centavos come from `writeCentavos` (`@/offline/deadLetters`) rather
 * than from `total_net` and `total_tax`, so the ARITHMETIC differs and the
 * WITHHOLDING must not. ⚠️ **The rule being shared is the one that matters**:
 * `null` is never rendered as `$0.00`, because a delivery worth nothing and a
 * delivery this phone could not price look identical to a shopkeeper and are
 * opposites.
 */
export function shownAmount(centavos: number | null): string {
  return centavos === null ? ES.documents.noFigure : formatMXN(centavos);
}

/**
 * Net plus tax, in integer centavos.
 *
 * ⚠️ `parseDecimal` REFUSES A JSON NUMBER OUTRIGHT, which is why every money
 * column in `DOCUMENTS_COLUMNS` carries `::text` and why this returns `null`
 * rather than a plausible figure if one ever stops.
 */
function grossOf(net: string | undefined, tax: string | undefined): number | null {
  if (typeof net !== 'string' || typeof tax !== 'string') return null;
  try {
    return parseDecimal(net, SCALE.money) + parseDecimal(tax, SCALE.money);
  } catch {
    return null;
  }
}

/**
 * The DEVICE's own calendar day for an instant, `YYYY-MM-DD` — or `null` when
 * the instant is not one.
 *
 * ⚠️⚠️ NOT `occurred_at.slice(0, 10)`, WHICH IS THE UTC DAY AND IS WHAT
 * `costsFrom` TAKES. See this file's header: in a UTC−6 shop those two disagree
 * for every document keyed after 18:00, and `today.ts` settles which one this
 * app means.
 *
 * ⚠️ NO `Intl` AND NO `toISOString`, because `toISOString` would put it back in
 * UTC. The parts come off the local getters and are padded by hand, which is
 * ES5 and is the same shape `formatLedgerDay` expects to be handed (`R10`).
 */
function dayOf(at: string): string | null {
  if (typeof at !== 'string' || at === '') return null;
  const when = new Date(at);
  if (!Number.isFinite(when.getTime())) return null;
  // ⚠️⚠️ `isoDay` AND NOT A FOURTH COPY OF THIS ARITHMETIC — collapsed into it on
  // 2026-09-26 by `5g-iii-b`, hours after this function was written. It had padded the
  // parts by hand, which is `catalog.ts`'s `isoDay` spelled again; **one answer to
  // *what day is it* is the whole point of that row**, so introducing a second SPELLING
  // while fixing a second ANSWER would have been the same defect one layer down. What
  // stays here is the PARSE guard, which `isoDay` does not do.
  return isoDay(when);
}

/** What `documentsLine` is given — the state, and whether the read failed. */
export type DocumentsLineInput = Documents & { readonly failed: ApiMessageKey | null };

/**
 * The one sentence the screen puts where the list would be.
 *
 * ⚠️ IT IS A STRING CHOSEN HERE AND NOT A TERNARY IN A SCREEN, which is
 * `costsLine`'s and `costNote`'s arrangement and the reason `5g-ii`'s
 * `unreadable` bug was fixable in one place. `R4` puts the words in
 * `src/strings.ts`; this is which of them applies.
 *
 * ⚠️ A FAILED READ SAYS SO AND NEVER SAYS *nothing here*. The two look identical
 * to a screen and are opposites to a shopkeeper — one means *you have no
 * deliveries this week*, the other means *this phone could not ask*.
 */
export function documentsLine(kind: DocumentKind, input: DocumentsLineInput): string {
  if (input.failed !== null) return ES.api.errors[input.failed];
  if (input.state === 'unknown') return ES.documents.loading;
  if (input.state === 'nothing') {
    // ⚠️ THREE SENTENCES AND NOT A TEMPLATE. `ES.documents`' own note says why
    // there are two rather than one, and the third arrives for the same reason:
    // *no hay nada* under the wrong tab reads as the app having lost the
    // write-off she keyed an hour ago.
    return ES.documents.nothing[kind];
  }
  return '';
}
