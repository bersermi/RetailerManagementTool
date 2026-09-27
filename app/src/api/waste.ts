// ============================================================================
// THE WASTE VOCABULARY — the five causes `0003` closed, and the payload key
// `0019` reads them under. Plan task `6a-i`, and the TWENTY-FIFTH module of
// `src/api/` (ADR-035 §2.11, `R12`, `R13`).
//
// ⚠️⚠️ IT IS A CONTRACT MODULE AND NOT A WRAPPER, WHICH IS WHY IT CALLS NOTHING.
// `record_waste` has been in `RECORD_RPC` (`@/api/flush`) since `5c-ii-a`
// spelled all four `record_*` names in one place, and the queue has been able
// to hold a `waste` since `@/api/outbox` shipped `WRITE_KINDS`. **So there was
// never an RPC wrapper missing here — what was missing is the five words the
// screen has to offer and the key the line carries them under**, and both are
// claims about applied SQL that `app/test/api-waste.test.ts` can read and a
// typecheck cannot.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE FIVE VALUES ARE SPANISH **IN THE DATABASE**, AND THAT IS THE ONE
// THING ABOUT THIS FILE THAT LOOKS LIKE AN `R4` VIOLATION AND IS NOT
// ----------------------------------------------------------------------------
// Every other enum in this schema is English — `workspace_role`,
// `movement_reason`, `adjustment_reason` — and `0004:49` records the exception
// by name: *"`waste_reason` is Spanish because…"*. So `WASTE_REASONS` below
// holds Spanish text that is **not a word a shopkeeper reads**; it is a wire
// value, the way `'staff'` and `'manager'` are. `R4` governs the LABEL, which
// is in `src/strings.ts` beside every other sentence, and `reasonLabel` is the
// one-way door between them.
//
// ⚠️ THE TWO HAPPEN TO COINCIDE TODAY FOR FOUR OF THE FIVE, and that is exactly
// why the indirection is written rather than skipped: the day somebody decides
// the picker should read *Se echó a perder* instead of *caducado*, the label
// moves and the enum cannot. A screen that rendered the wire value would make
// that a migration.
//
// ⚠️⚠️ AND THEY CARRY ACCENTS — `dañado`, `merma de preparación` — so the round
// trip through PostgREST is a UTF-8 assertion as well as a vocabulary one.
// `docs/checks/6a-i-waste-contract.sh` drives it, because a transport that
// mangled the `ñ` between a phone and Postgres answers **HTTP 400 `22P02`** and
// the message is *invalid input value for enum public.waste_reason* — measured,
// not assumed.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THE ORDER IS THE ENUM'S DECLARATION ORDER, AND IT IS LOAD-BEARING TWICE
// ----------------------------------------------------------------------------
// Postgres sorts an enum by DECLARATION and not alphabetically, which was
// measured rather than remembered: a document carrying all five came back from
// `?order=reason` as `caducado, dañado, merma de preparación, robo o faltante,
// error de captura` — not alphabetical, and not insertion order either.
//
// So this list is the same order the database will hand a reason breakdown back
// in, and `0003` chose it deliberately: the two a shopkeeper can DO something
// about come first (rotation, handling), the expected one third, and the two
// that are really questions about the shop rather than about the stock last.
// ⚠️ **A picker in a different order from the report is two answers to *which
// cause matters most*, and nothing in this repository could see the
// disagreement** — which is why the order is asserted against the database
// rather than left to the file.
//
// ----------------------------------------------------------------------------
// ⚠️⚠️ THERE IS NO DEFAULT, AND ITS ABSENCE IS `0019`'s OWN ARGUMENT
// ----------------------------------------------------------------------------
// *"`reason` IS REQUIRED AND HAS NO DEFAULT. §2.8 makes Desperdicio
// reason-first — it is the column the screen asks for BEFORE the product — and
// an enum with a default would quietly file every unlabelled loss under one
// cause."*
//
// ⚠️ THAT IS THE ONE PLACE DESPERDICIO'S OPENING QUESTION DIFFERS FROM
// COMPRAR'S. `5g-ii`'s picker opens with the GENERIC PROVIDER already marked,
// because *"I bought this at the market this morning"* is a real and common
// answer. **There is no generic cause.** A loss filed under the wrong reason is
// worse than one not yet filed, because the analytics asset §2.8 describes is
// built on exactly that column — so the picker opens on nothing, and there is
// no way past it.
//
// ⚠️ MEASURED: a line with no `reason` is refused by the database as
// **`22023`**, with a sentence quoting §2.8. That is the belt; this module and
// `draftOf`'s `no-reason` are the braces, and the braces exist because a
// `22023` reaching a shopkeeper is `@/api/errors`' `unknown` — *algo salió
// mal* — over a question she could have answered in one tap.
// ============================================================================

import { ES } from '@/strings';

/**
 * `public.waste_reason`'s five values, in the order `0003` declares them — see
 * the header for why that order is not cosmetic.
 *
 * ⚠️ `as const` AND NOT `readonly string[]`: the tuple is what gives
 * `WasteReason` its five members, and a widened type here would let a screen
 * offer a sixth cause that no migration has created.
 */
export const WASTE_REASONS = [
  'caducado',
  'dañado',
  'merma de preparación',
  'robo o faltante',
  'error de captura',
] as const;

/** One of the five. There is no sixth without a migration (`0003:419`). */
export type WasteReason = (typeof WASTE_REASONS)[number];

/**
 * The key one waste line carries its cause under, in `0019`'s own spelling.
 *
 * ⚠️ `R13`: written once, in a module the suite can read. `@/cart/cart` puts it
 * on the line and `docs/checks/6a-i-waste-contract.sh` sends it over real HTTP
 * — a misspelling here is not a 404 (the RPC's own name is fine) but a
 * **`22023`**, because `0019` looks for this key by name and finds nothing.
 */
export const WASTE_REASON_KEY = 'reason';

/**
 * Is this string one of the five?
 *
 * ⚠️ IT GUARDS THE **RESTORED CART** AND NOTHING ELSE TODAY. The picker can only
 * offer `WASTE_REASONS`, so nothing a thumb does can produce another value —
 * but the reason is persisted with the basket (§2.11), and a blob written by an
 * older build, or by a build after somebody renames a value, comes back as a
 * string this app no longer knows. **A basket carrying one would be committed
 * with a cause the database refuses**, which arrives as a dead letter rather
 * than as anything a shopkeeper can act on.
 */
export function isWasteReason(value: unknown): value is WasteReason {
  return typeof value === 'string' && (WASTE_REASONS as readonly string[]).includes(value);
}

/**
 * The word a shopkeeper reads for this cause (`R4`).
 *
 * ⚠️ THE MAP LIVES IN `src/strings.ts` AND THE LOOKUP LIVES HERE, which is the
 * same split `@/api/errors` makes: the sentence is a word and belongs with the
 * words, the correspondence is a claim about `0003` and belongs with the
 * contract. ⚠️ **`ES.waste.reason` is keyed BY THE WIRE VALUE**, accents and
 * all, so a renamed enum value is a TypeScript error rather than a picker row
 * that renders `undefined`.
 */
export function reasonLabel(reason: WasteReason): string {
  return ES.waste.reason[reason];
}

/**
 * The line under a cause in the picker, or `''` when it needs none.
 *
 * ⚠️ TWO OF THE FIVE GET ONE AND THREE DO NOT, which is a decision rather than
 * an omission. `0003`'s own comments explain two of these values at length and
 * the other three are self-evident in a shop: **`robo o faltante` is one value
 * on purpose** — *"a count cannot distinguish theft from a miscount, and
 * forcing the operator to guess produces a fiction"* — and **`error de captura`
 * is the one that is not a loss at all**, it is a loss in the data. A
 * shopkeeper reaching for either needs to know she has the right one, and the
 * other three she does not.
 */
export function reasonHint(reason: WasteReason): string {
  // ⚠️ WIDENED TO A STRING MAP ON PURPOSE. `ES.waste.hint` holds two of the five
  // keys, so an exact `Record<WasteReason, string>` read is a TypeScript error
  // and a `Partial<…>` annotation in `src/strings.ts` would be the first type in
  // that file — it is 1,200 lines of plain literals and `R4` keeps it that way.
  // The `?? ''` is the three missing keys, and it is the intended answer.
  const hints: Readonly<Record<string, string>> = ES.waste.hint;
  return hints[reason] ?? '';
}
