// ============================================================================
// PRODUCTOS, REDRAWN — THE AISLES AND THE PRODUCT PAGE. Plan task `8g`, the
// owner's rulings of 2026-10-17: Productos is option D (*"Let's go with D, list
// and mosaic switch"*) and a tap opens the product's own page.
//
// ⚠️⚠️ AN AISLE IS A FAMILY, AND THE CATALOG IS WHY. In the starter catalog a
// family is a CATEGORY — *Refrescos* holds 126 products, *Pollo* 22 — so the
// row of aisles across the top of Productos is the shop's families, and the
// product page's *Más de Refrescos* is its siblings, never "its sizes".
//
// ⚠️ NOTHING HERE READS ANYTHING. The aisles come off the catalog the phone
// already holds, the week off the six months of sales Números and Inicio
// already read, and the cost off Costos' own read — so the page costs one read
// the phone did not have before, and only for the product opened. Pure, and
// `app/test/product-page.test.ts` pins it.
// ============================================================================

import { SCALE, parseDecimal } from '@tienda/money';

import { bucketOf, reportOf, type SalesState, type SoldDay } from '@/api/sales';
import { daysFrom } from '@/format/date';
import { waitsForSignal } from '@/offline/senal';
import { ES } from '@/strings';
import { searchTerm, type CatalogEntry, type UnitFactors, type UnitRow } from '@/api/catalog';
import type { Online } from '@/api/connectivity';
import type { Costs, CostsState } from '@/api/costs';
import type { Picture } from '@/api/photos';

/** One aisle — a family the shop sells something in. */
export interface Aisle {
  readonly familyId: string;
  readonly name: string;
  /** How many of the shop's products are in it. */
  readonly count: number;
  /** Its two letters until it has a picture (C8.14). */
  readonly initials: string;
  /** `8o`: one of its products' photos, or `null` — see `aislesOf`. */
  readonly picture: Picture | null;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w !== '');
  const first = words[0] ?? '';
  const second = words[1] ?? '';
  return (second === '' ? first.slice(0, 2) : first.slice(0, 1) + second.slice(0, 1)).toUpperCase();
}

/**
 * The aisles, in alphabetical order, each with its count. ⚠️ A FAMILY WITH NO
 * PRODUCT IN THE LIST IS NO AISLE: the catalog read carries only what the shop
 * sells, so an emptied family simply stops being drawn.
 */
export function aislesOf(entries: readonly CatalogEntry[]): readonly Aisle[] {
  const byId = new Map<string, { name: string; count: number; picture: Picture | null }>();
  for (const entry of entries) {
    const known = byId.get(entry.familyId);
    if (known === undefined) byId.set(entry.familyId, { name: entry.familyName, count: 1, picture: entry.picture });
    else {
      known.count += 1;
      // ⚠️ `8o`: AN AISLE'S PICTURE IS ONE OF ITS PRODUCTS' — the first, in the
      // database's order (by name), that has one. `0063` gives the aisle no
      // column: the owner's folders hold a photo per product and none per aisle.
      if (known.picture === null) known.picture = entry.picture;
    }
  }
  return [...byId.entries()]
    .map(([familyId, { name, count, picture }]) => ({ familyId, name, count, initials: initialsOf(name), picture }))
    // ⚠️ `searchTerm` folds accents and case the way the search does — never
    // `normalize`, for the reason `@/api/catalog` gives.
    .sort((a, b) => (searchTerm(a.name) < searchTerm(b.name) ? -1 : searchTerm(a.name) > searchTerm(b.name) ? 1 : 0));
}

/** What the list shows with an aisle chosen — `null` is *Todo*. */
export function inAisle(entries: readonly CatalogEntry[], familyId: string | null): readonly CatalogEntry[] {
  return familyId === null ? entries : entries.filter((entry) => entry.familyId === familyId);
}

/**
 * The product page's *Más de Refrescos*: up to `n` of its aisle, itself left
 * out, and how many there are in all for *Ver los 126*.
 */
export function siblingsOf(
  entries: readonly CatalogEntry[],
  entry: CatalogEntry,
  n: number,
): { readonly shown: readonly CatalogEntry[]; readonly total: number } {
  const all = entries.filter((other) => other.familyId === entry.familyId);
  return { shown: all.filter((other) => other.id !== entry.id).slice(0, n), total: all.length };
}

/** This week for one product: what it sold, and each day Monday to Sunday. */
export interface WeekOfProduct {
  /** *18 kg*, *31 piezas* — Números' own figure for the week, or `null` when nothing sold. */
  readonly quantity: string | null;
  readonly centavos: number;
  /** Seven figures in centavos, Monday first. */
  readonly bars: readonly number[];
  /** Which of the seven is today, 0 to 6. */
  readonly today: number;
}

/** Monday first: `0` is Monday, `6` is Sunday. */
function mondayIndex(day: string): number {
  const at = new Date(`${day}T12:00:00Z`);
  return (at.getUTCDay() + 6) % 7;
}

export function weekOfProduct(
  days: readonly SoldDay[],
  variantId: string,
  today: string,
  entries: readonly CatalogEntry[],
  factors: UnitFactors,
): WeekOfProduct {
  const start = bucketOf(today, 'semana');
  const bars = [0, 0, 0, 0, 0, 0, 0];
  const mine = days.filter((one) => one.variantId === variantId);
  for (const one of mine) {
    if (bucketOf(one.day, 'semana') !== start) continue;
    bars[mondayIndex(one.day)] += one.centavos;
  }
  const row = reportOf(mine, 'semana', start, 'producto', entries, factors).rows[0];
  return {
    quantity: row === undefined ? null : row.quantity,
    centavos: row === undefined ? 0 : row.centavos,
    bars,
    today: mondayIndex(today),
  };
}

/**
 * The weekday this product sells best on, over every day the phone holds, as
 * `Date.getUTCDay` counts it (Sunday `0`) — `ES.dates.weekdays`' order. `null`
 * when it has never sold.
 */
export function bestWeekdayOf(days: readonly SoldDay[], variantId: string): number | null {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  let any = false;
  for (const one of days) {
    if (one.variantId !== variantId || one.centavos <= 0) continue;
    totals[new Date(`${one.day}T12:00:00Z`).getUTCDay()] += one.centavos;
    any = true;
  }
  if (!any) return null;
  let best = 0;
  for (let i = 1; i < 7; i += 1) if ((totals[i] ?? 0) > (totals[best] ?? 0)) best = i;
  return best;
}

/** The last delivery of this product, from whichever supplier brought it. */
export interface LastCost {
  /** What one PRICE unit cost, in centavos — `null` when this phone cannot convert it. */
  readonly centavos: number | null;
  /** Net per base unit, as Postgres sent it — what `marginOf` measures against. */
  readonly perBase: string;
  readonly provider: string;
  /** `YYYY-MM-DD`. */
  readonly day: string;
}

/**
 * ⚠️ THE NEWEST POINT ACROSS EVERY SUPPLIER, by its instant — *Te cuesta* is
 * what the last delivery cost, whoever brought it. Costos' void rule has
 * already dropped what was cancelled (`costsFrom`).
 */
export function lastCostOf(costs: Costs): LastCost | null {
  let best: LastCost | null = null;
  let at = '';
  for (const series of costs.series) {
    const point = series.latest;
    if (point === null) continue;
    if (best === null || point.at > at) {
      best = { centavos: point.centavos, perBase: point.perBase, provider: series.name, day: point.day };
      at = point.at;
    }
  }
  return best;
}

/** *hoy*, *ayer*, *hace 3 días* — when the last delivery came, in the shop's days. */
export function boughtWhen(day: string, today: string): string {
  const ago = daysFrom(day, today);
  if (ago === null || ago <= 0) return ES.products.page.when.today;
  if (ago === 1) return ES.products.page.when.yesterday;
  return ES.products.page.when.daysAgo(ago);
}

// ----------------------------------------------------------------------------
// ⚠️⚠️ WHAT THE PAGE SAYS WHEN A READ NEVER ARRIVED — `8g`, 2026-10-20, the
// offline report's round 3 (the owner's *"Do all the fixes"*). Offline, the page
// said *Todavía no lo has comprado* and *No se ha vendido esta semana* about a
// product bought every week and sold every day: neither Costos' read nor the six
// months of sales is kept on the phone, so with no signal neither had arrived,
// and an empty answer read as *never*. A card whose read has nothing to draw and
// no signal to fetch it says `ES.offline.whenSignal` and fills itself when the
// signal returns (`@/offline/senal`); with a signal nothing here changes.
// ----------------------------------------------------------------------------

/** *Te cuesta* with no delivery to show: *never bought*, or waiting for a signal. */
export function costNoneLine(state: CostsState, online: Online): string {
  return waitsForSignal(online, state !== 'unknown') ? ES.offline.whenSignal : ES.products.page.costNone;
}

/** *Esta semana* with nothing to count: *not sold this week*, or waiting for a signal. */
export function weekNoneLine(state: SalesState, online: Online): string {
  return waitsForSignal(online, state !== 'unknown') ? ES.offline.whenSignal : ES.products.page.weekNone;
}

/**
 * Are the week's seven bars drawn? ⚠️ NOT WHILE THE WEEK WAITS FOR A SIGNAL:
 * seven flat stubs beside *Se ve cuando haya señal* are a picture of a week
 * that sold nothing, which is the claim the sentence exists not to make.
 */
export function weekDrawn(state: SalesState, online: Online): boolean {
  return !waitsForSignal(online, state !== 'unknown');
}

/**
 * What the shop would earn per price unit at the price being typed — the
 * owner's one hook in Productos (*"Earnings while typing"*). `null` when the
 * box is not a price yet or there is no cost to measure against. ⚠️ A ZERO IS
 * AN ANSWER: selling at cost is a fact she should see.
 */
export function earningsAt(typed: string, costCentavos: number | null): number | null {
  if (costCentavos === null) return null;
  const text = typed.trim().replace(',', '.');
  if (text === '') return null;
  let price: number;
  try {
    price = parseDecimal(text, SCALE.money);
  } catch {
    return null;
  }
  if (price <= 0) return null;
  return price - costCentavos;
}

/** *24 de cada $100* — the margin on the price, rounded to a whole number. */
export function perHundred(earned: number, priceCentavos: number): number | null {
  if (priceCentavos <= 0) return null;
  return Math.round((earned / priceCentavos) * 100);
}

/**
 * The aisles the shop's own product may move to, its own included — ⚠️ ONLY
 * THOSE WHOSE PRODUCTS ARE ALL SOLD IN THE SAME KIND OF UNIT (C8.5: one
 * dimension per family), because nothing in the database holds that rule. A
 * unit this phone has not read is no match: an aisle it cannot judge is not
 * offered.
 */
export function aislesFor(
  entries: readonly CatalogEntry[],
  entry: CatalogEntry,
  units: readonly UnitRow[],
): readonly Aisle[] {
  const dimension = new Map(units.map((unit) => [unit.code, unit.dimension]));
  const mine = dimension.get(entry.priceUnit);
  if (mine === undefined) return aislesOf(entries.filter((other) => other.familyId === entry.familyId));
  const fits = new Set<string>();
  const misfits = new Set<string>();
  for (const other of entries) {
    if (dimension.get(other.priceUnit) === mine) fits.add(other.familyId);
    else misfits.add(other.familyId);
  }
  return aislesOf(entries).filter(
    (aisle) => aisle.familyId === entry.familyId || (fits.has(aisle.familyId) && !misfits.has(aisle.familyId)),
  );
}
