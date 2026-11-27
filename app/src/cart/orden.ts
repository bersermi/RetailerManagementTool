// ============================================================================
// EL ORDEN DEL DÍA — WHAT SELLS MOST, FIRST. Plan task `14.2`, Step 14 (*La
// vitrina*), the owner's calls 6 and 7 of 2026-11-27: Vender's tiles, and its
// aisles, come in the order the shop sells them — **four weeks, counted in
// sales, not pesos** — set once a day at the first opening, never moved while
// she works; a new shop in name order, as before.
//
// ⚠️⚠️ "MOST SOLD" IS HOW MANY TIMES, AND WHY THAT IS NOT TASTE. By pesos,
// cilantro (13 sales a day at $8) sits behind every cut of chicken, and a
// recaudería reaches for it all day. So the count is `daily_sales`' `times_sold`
// (`0100`): the sales that carried it, a void taking its sale back. Pesos only
// break a tie, then the name.
//
// ⚠️ THE WINDOW ENDS YESTERDAY. The order is set at the first opening of the day,
// when today has sold nothing yet; counting today would make the order depend on
// the minute it was set, and a phone opened after the first sales would order
// differently from one opened before them.
//
// ⚠️⚠️ IT IS KEPT ON THE PHONE BY ITSELF, AS IDS AND ITS DATE — and that is a
// consequence of `@/api/persist`, not a second cache by choice: the six months
// it is worked out from are NOT persisted (nothing derived from the ledger is),
// so without its own copy the counter would open in name order on every launch
// with no signal. A stale order is a worse order, never a false figure: nothing
// on the screen states it. It is keyed by the shop, so a phone that changes shop
// starts again in name order rather than in another shop's.
//
// ⚠️ ONLY WHAT SOLD IS STORED; everything else follows in the catalog's own
// order (by name), so the copy is as long as the shop's sellers, not its catalog.
// ============================================================================

import { searchTerm, type CatalogEntry } from '@/api/catalog';
import { daysBefore } from '@/api/month';
import { sortedForBuying } from '@/api/providers';
import type { SalesState, SoldDay } from '@/api/sales';

/** How far back the order looks: four weeks, ending yesterday (call 6). */
export const ORDEN_DIAS = 28;

/** Where the phone keeps it. */
export const ORDEN_KEY = 'wera.vitrina.orden';

/** One day's order for one shop. */
export interface OrdenDelDia {
  /** The phone's date it was set on — `isoDay`'s, the shop's own day. */
  readonly dia: string;
  /** The shop it is the order of. */
  readonly tienda: string;
  /** Variant ids, most sold first — only those that sold in the window. */
  readonly productos: readonly string[];
  /** Family ids, the aisles, by the same count. */
  readonly pasillos: readonly string[];
}

/** The window's first and last day: the four weeks before `today`. */
export function ventanaDe(today: string): { readonly desde: string; readonly hasta: string } {
  return { desde: daysBefore(today, ORDEN_DIAS), hasta: daysBefore(today, 1) };
}

interface Cuenta {
  veces: number;
  centavos: number;
  nombre: string;
}

/**
 * Ranks what sold: the most times first, then the most pesos, then the name —
 * keeping only what sold at least once (a sale and its void is nothing).
 */
function rango(cuentas: Map<string, Cuenta>): readonly string[] {
  return [...cuentas.entries()]
    .filter(([, c]) => c.veces > 0)
    .sort(([, a], [, b]) => {
      if (a.veces !== b.veces) return b.veces - a.veces;
      if (a.centavos !== b.centavos) return b.centavos - a.centavos;
      const x = searchTerm(a.nombre);
      const y = searchTerm(b.nombre);
      return x < y ? -1 : x > y ? 1 : 0;
    })
    .map(([id]) => id);
}

function sumar(cuentas: Map<string, Cuenta>, id: string, nombre: string, veces: number, centavos: number): void {
  const known = cuentas.get(id);
  if (known === undefined) cuentas.set(id, { veces, centavos, nombre });
  else {
    known.veces += veces;
    known.centavos += centavos;
  }
}

/**
 * The order for `today`, worked out from the shop's sales.
 *
 * ⚠️ A DAY WHOSE COUNT THE DATABASE DID NOT SEND COUNTS AS ONE SALE (`times`
 * `null`: a database still without `0100`). The order is then by the days each
 * product sold in the four weeks — the page's first proposal — and never by
 * pesos alone. Each store's row adds up: a sale is a sale, whichever till.
 */
export function ordenDe(days: readonly SoldDay[], today: string, tienda: string): OrdenDelDia {
  const { desde, hasta } = ventanaDe(today);
  const productos = new Map<string, Cuenta>();
  const pasillos = new Map<string, Cuenta>();
  for (const day of days) {
    if (day.day < desde || day.day > hasta) continue;
    const veces = day.times ?? 1;
    sumar(productos, day.variantId, day.variantName, veces, day.centavos);
    sumar(pasillos, day.familyId, day.familyName, veces, day.centavos);
  }
  return { dia: today, tienda, productos: rango(productos), pasillos: rango(pasillos) };
}

/**
 * Whether the order the phone holds is today's for this shop — and so whether
 * the six months must be read to set it.
 */
export function vigente(orden: OrdenDelDia | null, today: string, tienda: string | null): boolean {
  return orden !== null && orden.dia === today && orden.tienda === tienda;
}

/**
 * The order to draw while today's is not set: the one held for this shop, of
 * whatever day, or none. ⚠️ Another shop's is never drawn.
 */
export function paraTienda(orden: OrdenDelDia | null, tienda: string | null): OrdenDelDia | null {
  return orden !== null && orden.tienda === tienda ? orden : null;
}

/**
 * Today's order, once the read lets it be set — or `null` while it cannot be.
 *
 * ⚠️ ONLY A READ THAT CAME BACK SETS IT: `nothing` is a shop with no sale in
 * six months, whose order is the catalog's own (an empty one, kept, so the read
 * is not asked again today); `unknown` (in flight, failed, no signal) and
 * `unreadable` set nothing, and the phone keeps the order it had.
 */
export function ordenNuevo(
  state: SalesState,
  days: readonly SoldDay[],
  today: string,
  tienda: string | null,
): OrdenDelDia | null {
  if (tienda === null) return null;
  if (state === 'nothing') return { dia: today, tienda, productos: [], pasillos: [] };
  if (state === 'sales') return ordenDe(days, today, tienda);
  return null;
}

/**
 * `items` in the order `ids` gives — those it names first, by their place in
 * it; the rest after them in the order they came (the catalog's, by name).
 * ⚠️ Stable: two items `ids` does not name keep their order.
 */
export function porOrden<T>(items: readonly T[], ids: readonly string[], idOf: (item: T) => string): readonly T[] {
  if (ids.length === 0) return items;
  const lugar = new Map<string, number>();
  ids.forEach((id, i) => lugar.set(id, i));
  const nombrados: { item: T; at: number }[] = [];
  const resto: T[] = [];
  for (const item of items) {
    const at = lugar.get(idOf(item));
    if (at === undefined) resto.push(item);
    else nombrados.push({ item, at });
  }
  nombrados.sort((a, b) => a.at - b.at);
  return [...nombrados.map((n) => n.item), ...resto];
}

/**
 * ⚠️ `14.3`, CALL 6 ON COMPRAR: what this provider brought first, most recent
 * first — round 4's rule, kept — and then the day's order (what sells most),
 * where the catalog's name order used to be. `sortedForBuying` keeps the order it
 * is handed within a tie, so everything he never brought follows by sales.
 */
export function ordenDeCompra(
  entries: readonly CatalogEntry[],
  ids: readonly string[],
  bought: Readonly<Record<string, string>>,
): readonly CatalogEntry[] {
  return sortedForBuying(porOrden(entries, ids, (entry) => entry.id), 'recent', bought);
}

/** The order as the phone keeps it. */
export function guardarOrden(orden: OrdenDelDia): string {
  return JSON.stringify(orden);
}

function listaDeTexto(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  return value.every((item) => typeof item === 'string') ? (value as string[]) : null;
}

/**
 * The order the phone kept, or `null` — for nothing kept, or anything that is
 * not one (the device store's rule: nonsense is an ordinary input).
 */
export function leerOrden(text: string | null): OrdenDelDia | null {
  if (text === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { dia, tienda, productos, pasillos } = value as Record<string, unknown>;
  const p = listaDeTexto(productos);
  const a = listaDeTexto(pasillos);
  if (typeof dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  if (typeof tienda !== 'string' || p === null || a === null) return null;
  return { dia, tienda, productos: p, pasillos: a };
}
