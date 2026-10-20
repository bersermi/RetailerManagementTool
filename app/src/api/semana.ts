// ============================================================================
// TU SEMANA — on Mondays, last week as four cards she swipes. Plan task `8g`,
// round 4 of Números, the owner's rulings of 2026-10-20 over the canvas
// (*Números · tu semana*): the centre first, then *"Tu semana on Mondays. It
// goes last because it's the only part that adds something to Inicio"* — and
// *"Let's do."*
//
// Four cards, the canvas's: what she sold against the week before, her
// strongest day, the week's star, and *para esta semana*.
//
// ⚠️⚠️ THE FOURTH CARD IS NOT THE CANVAS'S. It drew *"Pídele uno menos a Bimbo
// el lunes"* — and the ruling of the same day put tips about a supplier or an
// order quantity out: *tips only about her own patterns*. So it says what was
// thrown away and what to do about it in her own shop, or that nothing was.
//
// ⚠️ EVERYTHING IS READ OFF WHAT NÚMEROS ALREADY READS — the six-month sales
// read, the hours' four weeks of sale headers — and one week of write-offs
// spelled exactly as the month spells them, so no new read needs a contract.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { isoDay, type CatalogEntry, type UnitFactors } from '@/api/catalog';
import { shownAmount } from '@/api/documents';
import { daysBefore, standing, type ReversalRow, type SaleHead, type WasteHead } from '@/api/month';
import { bucketOf, dayTotals, reportOf, type SoldDay } from '@/api/sales';
import { isWasteReason, type WasteReason } from '@/api/waste';
import { ES } from '@/strings';

/** Which days of the week Inicio offers the story: Monday to Wednesday. */
export const WEEK_OFFERED_DAYS = 3;

/** The device-store key holding the Monday of the last week she opened. */
export const WEEK_SEEN_KEY = 'tienda.inicio.semana';

/** The Monday a day's week starts on. */
export function mondayOf(day: string): string {
  return bucketOf(day, 'semana');
}

/** Last week, Monday to Sunday, as `YYYY-MM-DD`. */
export function lastWeek(today: string): { readonly from: string; readonly to: string } {
  const from = daysBefore(mondayOf(today), 7);
  return { from, to: daysBefore(from, -6) };
}

/**
 * Whether Inicio offers the story today: Monday to Wednesday, last week sold
 * something, and this phone has not opened this week's yet.
 */
export function offersWeek(days: readonly SoldDay[], today: string, seen: string | null): boolean {
  const monday = mondayOf(today);
  if (seen === monday) return false;
  if (today > daysBefore(monday, -(WEEK_OFFERED_DAYS - 1))) return false;
  const { from, to } = lastWeek(today);
  for (const [day, centavos] of dayTotals(days)) if (day >= from && day <= to && centavos > 0) return true;
  return false;
}

export interface WeekStory {
  readonly from: string;
  readonly to: string;
  readonly centavos: number;
  /** Against the week before, or `null` when the shop was not selling then. */
  readonly compare: number | null;
  readonly best: {
    readonly day: string;
    readonly centavos: number;
    /** Sales that day, or `null` when the hours' read did not reach it. */
    readonly sales: number | null;
    /** The best of that weekday since her first sale (and not her first). */
    readonly record: boolean;
  };
  /** What brought in the most: its name, how much of it, in its own unit. */
  readonly star: { readonly id: string; readonly name: string; readonly quantity: string } | null;
  /** What was thrown away most often, or `null` when nothing was. */
  readonly thrown: { readonly name: string; readonly quantity: string; readonly reason: WasteReason | null } | null;
}

/**
 * Last week's story. `null` when last week sold nothing — Inicio never offers it then.
 *
 * ⚠️ THE STAR IS BY MONEY, the hours' rule: *ten la tienda lista* is about what
 * walks out, and a hundred chicles are not the week's news.
 */
export function weekStory(
  days: readonly SoldDay[],
  sales: readonly SaleHead[] | null,
  waste: { readonly rows: readonly WasteHead[]; readonly reversals: readonly ReversalRow[] } | null,
  entries: readonly CatalogEntry[],
  factors: UnitFactors,
  today: string,
): WeekStory | null {
  const { from, to } = lastWeek(today);
  const before = daysBefore(from, 7);
  const totals = dayTotals(days);
  let centavos = 0;
  let previous = 0;
  let first: string | null = null;
  let best: { day: string; centavos: number } | null = null;
  for (const [day, c] of totals) {
    if (c > 0 && (first === null || day < first)) first = day;
    if (day >= from && day <= to) {
      centavos += c;
      if (c > 0 && (best === null || c > best.centavos)) best = { day, centavos: c };
    } else if (day >= before && day < from) previous += c;
  }
  if (best === null || centavos <= 0) return null;
  const bestDay = best.day;
  const bestDow = new Date(`${bestDay}T00:00:00Z`).getUTCDay();
  let earlier = 0;
  let record = true;
  for (const [day, c] of totals) {
    if (day >= bestDay || c <= 0 || new Date(`${day}T00:00:00Z`).getUTCDay() !== bestDow) continue;
    earlier += 1;
    if (c >= best.centavos) record = false;
  }
  let count: number | null = null;
  if (sales !== null) {
    count = 0;
    for (const sale of standing(sales, [])) if (isoDay(new Date(sale.occurred_at)) === bestDay) count += 1;
    if (count === 0) count = null;
  }
  const top = reportOf(days, 'semana', from, 'producto', entries, factors).rows[0];
  return {
    from,
    to,
    centavos,
    compare: first !== null && first <= before ? centavos - previous : null,
    best: { day: bestDay, centavos: best.centavos, sales: count, record: record && earlier > 0 },
    star: top === undefined ? null : { id: top.key, name: top.name, quantity: spoken(top.quantity) },
    thrown: thrownOf(waste, entries, factors),
  };
}

/** The product written off most often last week, said in its own unit. */
function thrownOf(
  waste: { readonly rows: readonly WasteHead[]; readonly reversals: readonly ReversalRow[] } | null,
  entries: readonly CatalogEntry[],
  factors: UnitFactors,
): WeekStory['thrown'] {
  if (waste === null) return null;
  const tally = new Map<string, { lines: number; qty: number; reasons: Map<WasteReason, number> }>();
  for (const doc of standing(waste.rows, waste.reversals)) {
    for (const line of doc.waste_reason_line ?? []) {
      let qty: number;
      try {
        qty = parseDecimal(line.qty_base, SCALE.quantity);
      } catch {
        continue;
      }
      const one = tally.get(line.variant_id) ?? { lines: 0, qty: 0, reasons: new Map<WasteReason, number>() };
      one.lines += 1;
      one.qty += qty;
      if (isWasteReason(line.reason)) one.reasons.set(line.reason, (one.reasons.get(line.reason) ?? 0) + 1);
      tally.set(line.variant_id, one);
    }
  }
  let pick: string | null = null;
  for (const [id, one] of tally) {
    const was = pick === null ? undefined : tally.get(pick);
    if (was === undefined || one.lines > was.lines || (one.lines === was.lines && one.qty > was.qty)) pick = id;
  }
  if (pick === null) return null;
  const one = tally.get(pick)!;
  const entry = entries.find((e) => e.id === pick);
  let reason: WasteReason | null = null;
  let most = 0;
  for (const [r, n] of one.reasons) if (n > most) [reason, most] = [r, n];
  return {
    name: entry?.name ?? ES.numbers.semana.someProduct,
    quantity: quantityOf(one.qty, entry, factors),
    reason,
  };
}

/** A base quantity in the product's price unit: *6 pza*, *1.5 kg*. */
function quantityOf(qty: number, entry: CatalogEntry | undefined, factors: UnitFactors): string {
  const unit = 10 ** SCALE.quantity;
  if (entry === undefined) return String(Math.round(qty / unit));
  const factor = Number(factors[entry.priceUnit] ?? '1') || 1;
  const tenths = Math.round((qty / unit / factor) * 10);
  const rest = tenths % 10;
  const shown = rest === 0 ? String(tenths / 10) : `${(tenths - rest) / 10}.${rest}`;
  return spoken(`${shown} ${entry.priceUnit}`);
}

/** *64 pza* as a sentence says it: *64 piezas*. Any other unit stays as written (*1.5 kg*). */
export function spoken(quantity: string): string {
  const m = /^(\S+) pza$/.exec(quantity);
  return m === null ? quantity : ES.numbers.semana.piece(m[1] ?? '');
}

/** *13 al 19 de octubre*, or *28 de septiembre al 4 de octubre*. */
export function weekRange(from: string, to: string): string {
  const month = (day: string) => ES.dates.months[Number(day.slice(5, 7)) - 1] ?? '';
  const a = Number(from.slice(8, 10));
  const b = Number(to.slice(8, 10));
  return from.slice(5, 7) === to.slice(5, 7)
    ? ES.numbers.semana.range(`${a}`, `${b} de ${month(to)}`)
    : ES.numbers.semana.range(`${a} de ${month(from)}`, `${b} de ${month(to)}`);
}

/** *$510 más que la semana pasada*. */
export function weekCompare(story: WeekStory): string {
  if (story.compare === null) return '';
  return ES.numbers.semana.compare(story.compare, shownAmount(Math.abs(story.compare)));
}
