// ============================================================================
// WHAT THE DEAD QUEUE IS WORTH, AND WHO MAY BE TOLD. Plan task 5c-iv-b —
// C11.9's least-invasive dead-letter banner, and the only number in this app
// priced on the device that the server also prices.
//
// ⚠️⚠️ IT MAKES NO SERVER READ, AND THAT IS THE RULING OF 2026-09-14 RATHER
// THAN AN OPTIMISATION. `failed_write.id` IS the client uuid (`0024` decision
// 7), so the phone that failed already holds the payload, the kind and the
// count — which is what lets the banner work on the phone that is offline, the
// only phone that has anything to show. A server read here is a banner that
// goes blank exactly when it matters.
//
// ⚠️⚠️ IT SHOWS A COUNT AND A PESO FIGURE, NEVER A LIST, NEVER AN `error_code`.
// C10.5 and §2.8 both: a list of rejected writes is the vendor's pile handed to
// the merchant, and a shopkeeper cannot act on `TD002` (
// [[users-dont-do-bookkeeping]]). What she can act on is *there are three of
// them and they are worth this much* — which is why `replay_failed_write` needs
// no screen: recovery is ours, by hand, one row at a time (ruling of
// 2026-09-05), and the banner's whole job is to make somebody ask for it.
//
// ⚠️⚠️ THE ARITHMETIC IS `@tienda/money`'s, AND THAT IS WHAT MAKES IT
// FALSIFIABLE. §2.10's nightly production check reports dead-letter count *and
// unrecorded revenue in pesos*, "computed from the stored payload by the same
// module in §2.11 that priced it on the device" — so this file and that check
// are two callers of one implementation, not two implementations. A peso figure
// reached by `Number(price) * Number(qty)` here would look right on every phone
// and disagree with the ledger by a centavo on the lines `packages/money`'s
// header spends forty lines on. Nothing in `app/` may do that arithmetic itself
// (`R5`).
//
// ⚠️ EVERY VALUE THE MONEY PATH TOUCHES ARRIVES AS A **STRING**, because that
// is how it is stored: `failed_write.payload` is `jsonb`, and a JSON number is
// a double. `parseDecimal` refuses a `number` argument outright for this
// reason, and the refusal is caught below rather than allowed to reach a
// screen.
//
// ⚠️ IT DECIDES NOTHING ABOUT LAYOUT. §2.11 keeps rendering, navigation and
// layout out of scope, so `DeadLetterBanner.tsx` beside this file holds a
// `View`, a `Text` and no judgement — the same seam `5c-iv-a` drew between
// `notice.ts` and `OfflineSurfaces.tsx`. `app/test/offline-dead-letters.test.ts`
// is this repository's whole instrument for the rules; the owner's phone (`R9`)
// is the whole instrument for how they look.
// ============================================================================

import {
  SCALE,
  divRoundHalfUpAwayFromZero,
  lineAnchorCentavos,
  parseDecimal,
} from '@tienda/money';

import { ROLES, type Role } from '@/api/members';
import { isWritePayload, type QueuedWrite, type WriteKind } from '@/api/outbox';
import type { DensityScale } from '@/theme/density';

/**
 * The payload key each kind carries its price in — `0016`, `0018`, `0019` and
 * `0020`, read off the applied functions (`R13` applied to a `jsonb` shape the
 * server also reads).
 *
 * ⚠️⚠️ THE TWO SPELLINGS ARE NOT INTERCHANGEABLE AND THE DIFFERENCE IS §2.5
 * RULE 2: **direction follows the document.** A sale's line carries
 * `unit_price_gross_per_base` because the shelf price is what the customer
 * agreed to; a purchase's carries `unit_price_net_per_base` because the net is
 * the figure printed on the supplier's invoice. Reading a purchase as though it
 * were gross understates every dead purchase by the IVA on it, silently, and
 * nothing on the shelf would look wrong.
 *
 * ⚠️ `transfer` CARRIES NO PRICE AT ALL, AND THAT IS `0020`'s SHAPE RATHER THAN
 * AN OMISSION HERE — stock moving between two of a shop's own locations is not
 * a document with a value on it. See `writeCentavos` for why that is worth
 * nothing rather than unknown.
 */
export const PRICE_KEY = {
  purchase: 'unit_price_net_per_base',
  sale: 'unit_price_gross_per_base',
  waste: 'unit_price_gross_per_base',
  transfer: null,
} as const satisfies Readonly<Record<WriteKind, string | null>>;

/**
 * `unit.factor_to_base`, keyed by the display unit's code — `numeric(14,6)`, so
 * a decimal STRING at scale 6, exactly as `0001` stores it.
 *
 * ⚠️⚠️ IT IS AN ARGUMENT AND NOT A TABLE IN THIS FILE, AND THAT IS THE WHOLE
 * DECISION. `0001`'s ten units are closed — *"users pick from this list; they
 * never define their own factors"* — so hard-coding them here would work today
 * and would be the sixth two-homes-for-one-claim defect this repository has
 * recorded: **Vender must already hold these factors** to show a basket total
 * with no signal (§2.6, C10.3), so the app will have a second copy the moment
 * `5f` exists. A module that takes its world as an argument (`R3`) has one
 * copy, wherever that copy ends up living.
 */
export type UnitFactors = Readonly<Record<string, string>>;

/**
 * What the app can resolve today, and it is deliberately empty.
 *
 * ⚠️ NOTHING IN THIS APP ENQUEUES YET, so there is no payload on any device to
 * price and an empty map costs nothing. ⚠️⚠️ **The obligation to fill it is
 * `5f`'s and is written into that row**, not left here to be noticed: a
 * screen that prices a basket offline has already read `unit`, and handing the
 * same map to this module is one argument. `R9` is the rule — a deliverable no
 * check here can see is routed to the task that can see it.
 *
 * ⚠️ UNTIL THEN THE FALLBACK IS EXACT RATHER THAN APPROXIMATE: a line with no
 * `qty_display_unit` is quoted in the variant's own base unit, whose factor is
 * `1` by `0001`'s `unit_base_is_identity` constraint, so it prices with no map
 * at all. Every other line is UNPRICED, and `complete` says so — see `valueOf`.
 */
export const NO_UNIT_FACTORS: UnitFactors = {};

/**
 * `unit.factor_to_base` is `numeric(14,6)`. Named rather than borrowed from
 * `SCALE.unitPrice`, which happens to be 6 for an unrelated reason.
 */
const FACTOR_SCALE = 6;

/** 10^FACTOR_SCALE — the integer that means a factor of exactly 1. */
const FACTOR_ONE = 1_000_000;

/** What the banner is drawn from. Three numbers and no rows. */
export interface QueueValue {
  /** Dead writes on this device. ⚠️ Documents, never lines. */
  readonly count: number;
  /** What they were worth, in integer centavos. See `writeCentavos`. */
  readonly centavos: number;
  /**
   * Was every one of them priced?
   *
   * ⚠️⚠️ `false` IS WHY THE FIGURE CAN BE WITHHELD RATHER THAN QUIETLY WRONG.
   * A sum that silently omits a line it could not read is the understated
   * number this whole path exists to prevent, and it would be indistinguishable
   * on screen from a correct small one. The COUNT is never lossy — the
   * document is either dead or it is not — so the honest degradation is to show
   * it alone. §2.6's own sentence about the downgrade, *"stock stays true;
   * margin goes quiet"*, is the same shape one layer up.
   */
  readonly complete: boolean;
}

/** An empty queue, and the state before anything has been read. */
export const NOTHING_DEAD: QueueValue = { count: 0, centavos: 0, complete: true };

/**
 * The rows the banner counts.
 *
 * ⚠️ `dead` AND NOTHING ELSE. A `pending` row is a write that has not been sent
 * yet and a `flushing` one is in the air; both are expected to land, and
 * counting them would turn C10.1's ordinary condition — no signal, all morning
 * ([[pilot-store-is-offline-a-lot]]) — into an alarm about writes that are
 * fine. `dead` is terminal from the device (`advance`), so this is exactly the
 * set nothing will move without us.
 */
export function deadLetters(queue: readonly QueuedWrite[]): readonly QueuedWrite[] {
  return queue.filter((write) => write.state === 'dead');
}

/**
 * One line of one document, in centavos — or `null` when this device cannot
 * price it exactly.
 *
 * ⚠️⚠️ THE UNIT CONVERSION IS THE SERVER'S, TO THE THOUSANDTH.
 * `round(qty_display * factor_to_base, 3)` is what `0016`–`0020` compute before
 * anything is allocated, and Postgres's `round(numeric)` is half-up away from
 * zero — the same rule `divRoundHalfUpAwayFromZero` implements and the one
 * `Math.round` gets wrong on a negative tie. Converting in floats, or rounding
 * at the end instead of here, is a quantity that disagrees with the ledger in
 * the third decimal and a peso figure that disagrees in the last centavo.
 *
 * ⚠️ AN ABSENT `qty_display_unit` IS THE VARIANT'S BASE UNIT — that is the
 * `coalesce(nullif(l->>'qty_display_unit',''), pv.base_unit_code)` every
 * `record_*` does — and a base unit's factor is exactly `1` by `0001`'s
 * `unit_base_is_identity`. So absence needs no map and no server read; it is
 * the one case that is exact by construction.
 *
 * ⚠️ AN UNKNOWN UNIT IS `null`, NEVER A GUESS OF `1`. Reading `kg` as a gram
 * would divide a dead purchase's value by a thousand and look entirely
 * plausible on screen.
 */
export function lineCentavos(
  kind: WriteKind,
  line: unknown,
  factors: UnitFactors,
): number | null {
  const key = PRICE_KEY[kind];
  // ⚠️ PRICELESS BY DESIGN, NOT BY OMISSION — see `PRICE_KEY`. A transfer line
  // is worth nothing and is known to be, which is a different answer from
  // "could not be read" and must not collapse into it.
  if (key === null) return 0;
  if (!isWritePayload(line)) return null;

  const priceText = line[key];
  const qtyText = line.qty_display;
  if (typeof priceText !== 'string' || typeof qtyText !== 'string') return null;

  const unit = line.qty_display_unit;
  let factor: number;
  if (unit === undefined || unit === null || unit === '') {
    factor = FACTOR_ONE;
  } else if (typeof unit !== 'string') {
    return null;
  } else {
    const stored = factors[unit];
    if (stored === undefined) return null;
    try {
      factor = parseDecimal(stored, FACTOR_SCALE);
    } catch {
      return null;
    }
  }

  // ⚠️ EVERY THROW THE MONEY PATH RAISES IS CAUGHT HERE AND BECOMES `null`.
  // `parseDecimal` refuses a number, an exponent, a value with more decimals
  // than the column holds; `lineAnchorCentavos` refuses anything past 2^53.
  // Each of those is a corrupt payload rather than a shop's problem, and a
  // banner that crashes the app is worse than one that shows a count.
  try {
    const qty = parseDecimal(qtyText, SCALE.quantity);
    const base = divRoundHalfUpAwayFromZero(qty * factor, FACTOR_ONE);
    return lineAnchorCentavos(parseDecimal(priceText, SCALE.unitPrice), base);
  } catch {
    return null;
  }
}

/**
 * One dead document, in centavos — or `null` when any line of it could not be
 * priced.
 *
 * ⚠️ THE DOCUMENT IS THE **SUM OF THE ROUNDED LINES** (§2.5 rule 5), never a
 * rounding of its own. That is the same sentence `documentNetPerLine` states on
 * the net side, and the reason is the same: a total rounded separately fails to
 * equal the lines it is made of.
 *
 * ⚠️⚠️ ONE UNREADABLE LINE POISONS THE WHOLE DOCUMENT, DELIBERATELY. Summing
 * the lines it could read would report a sale of three items as the value of
 * two — a smaller number that looks exactly like a correct one, which is the
 * failure mode `complete` exists to make impossible.
 */
export function writeCentavos(write: QueuedWrite, factors: UnitFactors): number | null {
  const lines = write.payload.lines;
  // ⚠️ EVERY `record_*` REFUSES AN EMPTY OR NON-ARRAY `p_lines`, so a payload
  // without one never reached the server and cannot be priced from here.
  if (!Array.isArray(lines) || lines.length === 0) return null;

  let total = 0;
  for (const line of lines) {
    const centavos = lineCentavos(write.kind, line, factors);
    if (centavos === null) return null;
    total += centavos;
  }
  return total;
}

/** The whole banner, as three numbers. */
export function valueOf(queue: readonly QueuedWrite[], factors: UnitFactors): QueueValue {
  const dead = deadLetters(queue);
  let centavos = 0;
  let complete = true;
  for (const write of dead) {
    const priced = writeCentavos(write, factors);
    if (priced === null) complete = false;
    else centavos += priced;
  }
  return { count: dead.length, centavos, complete };
}

/**
 * Is there a peso figure to show beside the count?
 *
 * ⚠️ ZERO IS NOT A FIGURE. A queue holding nothing but dead transfers is worth
 * exactly nothing and saying `$0.00` to a shopkeeper reads as a broken screen,
 * not as a fact — and C3.17 fences `atencion` to a line priced `$0.00`
 * precisely because that number means "somebody forgot a price" everywhere else
 * in this app.
 */
export function showsValue(value: QueueValue): boolean {
  return value.complete && value.centavos > 0;
}

/**
 * ⚠️⚠️ WHO MAY SEE IT — MANAGER AND ABOVE, and the reasoning is repeated here
 * rather than inherited, because `0024`'s decision 8 went TIGHTER on a
 * neighbouring surface and a session that copied it would be wrong in the other
 * direction.
 *
 * `failed_write_select` is fenced at `owner` because the TABLE hands over
 * `payload`, which *"can carry COST for any kind"* — and §2.7 makes cost
 * manager-and-above **at the loosest**. This banner hands over no payload: a
 * count and one figure, with no line, no variant, no location and no
 * `error_code`. So the looser fence is the one §2.7 actually names, 1.3a's
 * *"cost is manager-and-above; quantity is everyone"* settles the figure, and
 * C10.5 refuses to show a rejected write to the person at the counter at all.
 *
 * ⚠️ A CASHIER IS THE ONE PERSON THE REQUIREMENT NAMES, and she can do nothing
 * about a dead letter: replay is manager-fenced on the server (`0030`) and run
 * by us in any case.
 *
 * ⚠️ IT IS THE INDEX INTO `ROLES` AND NOT `role !== 'staff'`, the rule
 * `canSeeRoster` already records: a fourth role inserted below `manager` is
 * fenced out by adding it to that table rather than by remembering this line
 * exists. ⚠️ `null` is "not known yet" and shows nothing — the roster read is
 * still out, and a banner drawn before the answer arrives is one a cashier sees
 * for a second.
 */
export function canSeeDeadLetters(role: Role | null): boolean {
  if (role === null) return false;
  return ROLES.indexOf(role) <= ROLES.indexOf('manager');
}

/**
 * Should the banner be on screen?
 *
 * ⚠️⚠️ THE DISMISSAL IS KEYED TO THE COUNT, WHICH IS A DIFFERENT RULE FROM
 * `5c-iv-a`'s AND DELIBERATELY SO. A dismissal there dies with the screen,
 * because being offline comes and goes and a shop that brushed the notice away
 * at 9am must still be told at 4pm. A dead letter does the opposite: it does
 * not go away on its own — recovery is ours, by hand — so re-offering it on
 * every navigation is nagging a person about something she has already done
 * everything she can about. C11.9 asks for *the least invasive thing that
 * works*, and this is the line between the two: silence until the number
 * CHANGES, and a fourth dead letter says it again.
 *
 * ⚠️ IT IS NOT REMEMBERED ACROSS LAUNCHES, on purpose. The dismissal lives in
 * the component's state and dies with the process; a fresh launch is a fresh
 * chance to notice, and storing it would be a second thing on disk that can
 * disagree with the queue.
 *
 * ⚠️ AND THE DISMISSAL SURVIVES LEAVING HOME, because the component is mounted
 * at the root and never unmounts. Brushing it away on Inicio, selling for an
 * hour and coming back is silence — which is the whole of the rule above, and
 * would be undone by moving the state into the screen.
 */
/**
 * Inicio's route. Expo Router renders `(tabs)/index.tsx` at `/`, which is also
 * what `RESTORABLE_ROUTES` calls it one module over.
 */
export const HOME_ROUTE = '/';

/**
 * Is this the one screen the banner may appear on?
 *
 * ⚠️⚠️ HOME ONLY — RULED BY THE OWNER 2026-09-22, AND IT REPLACES *every
 * screen*, WHICH IS WHAT `5c-iv-b` SHIPPED. ADR-035 §2.8 said permanent
 * failures *"do not appear on Home at all"* and the banner appeared on all of
 * them, which is the disagreement that put the question in front of him. The
 * ruling is the third answer rather than either of the two the sentence framed:
 * **Home, and nowhere else.**
 *
 * ⚠️ IT IS THE OPPOSITE OF THE OFFLINE NOTICE'S RULE AND THAT IS THE POINT.
 * C10.1's pill belongs wherever a person is standing, because being offline
 * changes what the NEXT tap means. A dead letter has already happened and
 * nothing about the next tap depends on it, so it waits at the door — the
 * screen somebody opens between customers — rather than interrupting the ones
 * they use mid-sale (C11.9: *the least invasive thing that works*).
 *
 * ⚠️ `null` IS NOT HOME. `usePathname` has no value for a frame or two on a
 * cold open, and a banner that flashed on an unknown screen is exactly what
 * this rule exists to stop.
 */
export function onHome(pathname: string | null | undefined): boolean {
  return pathname === HOME_ROUTE;
}

/**
 * Should this device even open its queue?
 *
 * ⚠️ THE FENCE IS READ BEFORE THE ROWS ARE, which is correctness and not
 * economy — the component's header says so about the role and it is now true of
 * the route as well. A cashier's phone never opens the outbox for this banner,
 * and as of the ruling above neither does anybody standing on Vender.
 */
export function readsQueue(role: Role | null, pathname: string | null | undefined): boolean {
  return canSeeDeadLetters(role) && onHome(pathname);
}

export function showsBanner(
  role: Role | null,
  value: QueueValue,
  dismissedAt: number | null,
  pathname: string | null | undefined,
): boolean {
  if (!readsQueue(role, pathname)) return false;
  if (value.count === 0) return false;
  return dismissedAt === null || value.count > dismissedAt;
}

// ----------------------------------------------------------------------------
// ⚠️⚠️ THE BANNER'S GEOMETRY, MOVED HERE BY `5d-iv-b` — AND IT IS THE SAME
// ARGUMENT THIS FILE'S HEADER ALREADY MAKES ABOUT EVERY OTHER DECISION IN
// `DeadLetterBanner.tsx`: *it decides nothing.* The two numbers below were
// literals inside that component until Inicio needed to agree with them.
//
// ⚠️ THE REASON IS A COLLISION NO CHECK COULD SEE. The banner is
// ABSOLUTELY POSITIONED at the top of the root — it is mounted once and never
// unmounts — so it draws OVER whatever Inicio put there. As of the ruling of
// 2026-09-22 the one screen underneath it is Inicio, whose first element is
// §2.8's takings figure: the number a shopkeeper compares against her till.
// Two copies of *how tall is the banner*, in two files, is the stale-duplicate
// shape this repository has recorded seven times — and this instance would
// have failed by HIDING THE ONE NUMBER Inicio exists to show.
//
// ⚠️ `bannerRoom` IS A FLOOR AND NOT A MEASUREMENT, AND THAT IS SAID HERE
// RATHER THAN DISCOVERED ON A PHONE. The pill is three lines of `bodySize`
// text; nothing outside a running renderer knows how tall that comes to, so
// this clears the pill's MINIMUM and Inicio scrolls (see its header). A
// three-line banner in `Letra grande` can still be taller than the room — and
// then the takings are one short scroll away rather than hidden under a strip
// that takes no taps.
// ----------------------------------------------------------------------------

/**
 * Where the banner's strip begins, below the device's own top inset.
 *
 * ⚠️ THE INSET IS AN ARGUMENT AND NOT A HOOK CALL (`R3`). `useSafeAreaInsets`
 * is React; this is arithmetic, and `app/test/offline-dead-letters.test.ts`
 * reads it under plain Node.
 */
export function bannerTop(scale: DensityScale, topInset: number): number {
  return topInset + scale.space;
}

/**
 * The least vertical space the banner's pill can occupy — `R6`'s tap-target
 * floor, which is what makes *"easily dismissed means a thumb"* true in both
 * densities.
 */
export function bannerMinHeight(scale: DensityScale): number {
  return scale.tapTarget;
}

/**
 * How much room a screen under this banner must leave above anything it draws.
 *
 * ⚠️ IT IS RESERVED UNCONDITIONALLY, WHICH IS A DECISION AND NOT AN OVERSIGHT.
 * Reserving it only while a banner is up would move Inicio's takings figure
 * DOWN the moment a write dead-lettered — a number jumping under the eye of
 * somebody already reading it, and the cards jumping under a thumb already
 * travelling towards Vender. The same reasoning `Solicitudes` records one file
 * over for not hiding the bell while its read is out: a control that arrives a
 * beat late is worse than a control that was always there.
 */
export function bannerRoom(scale: DensityScale, topInset: number): number {
  return bannerTop(scale, topInset) + bannerMinHeight(scale) + scale.space;
}
