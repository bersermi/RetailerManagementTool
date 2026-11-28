// ============================================================================
// HOW A PRODUCT ARRIVES — `14.5`, Step 14's call 10 (the owner's ruling of
// 2026-11-27): in Comprar she says what came the way it came, *Llegaron 2 cajas*,
// *trae cada caja ~13 kg*, *$209.30 la caja*, and Wera turns it into what goes on
// the shelf — *Entran 26 kg · a $16.10 el kg*. Everything with a right answer in
// that sentence is here, where `app/test/paquete.test.ts` reads it (`R3`); the pad
// in `(tabs)/comprar.tsx` draws it and decides nothing.
//
// ⚠️⚠️ `record_purchase` IS UNCHANGED AND NEVER HEARS OF A CAJA. The phone
// multiplies: the line it sends is base units (26,000 g) at a cost per base
// (0.016100), exactly what Comprar sent before this row. So a pack is a way of
// KEYING a delivery, not a new kind of line — and ADR-035 §2.5 rule 1 holds.
//
// ⚠️⚠️ THE CONTENT IS IN THE UNIT THE PRODUCT IS SOLD IN, AND THAT IS WHY A PACK
// IS OFFERED ONLY WHERE COMPRAR'S BOX SPEAKS THAT UNIT (`paqueteDe`). Kilos for
// jitomate, pieces for lechuga, manojos for cilantro — every starter row. A
// product priced per 250 g is keyed in grams (`shownUnitOf`), so *trae cada caja
// 13* would mean nothing anyone said: it gets no pack, and is keyed as today.
//
// ⚠️⚠️ A CAJA'S COST SPLIT INTO GRAMS CAN LAND A CENTAVO OR TWO OFF. The ledger
// keeps a cost per BASE unit at six decimals (`numeric(14,6)`, §2.5) and the line
// is `round(cost × qty, 2)` (`0018`), so *2 cajas at $200* — 26 kg — is $400.01:
// $200 / 13,000 g is 0.0153846…, kept as 0.015385. The nearest six-decimal cost is
// the closest the ledger can come (`costoPorBase`), and the pad's total is the
// ledger's own figure, never `2 × $200` — §2.5 rule 5: no screen states a figure
// the Carrito would not. The bound is half a millionth of a peso per base unit:
// 1.3 centavos on 26 kg, 7.5 on three arpillas of 50.
//
// ⚠️ WHAT THE PHONE KEEPS (`Llegadas`): per product, how she keyed its last
// delivery — the mode, what one pack held (*the last she typed shows next time*,
// call 10), and the line she added with it. The line is restored only while the
// basket still holds exactly what it sent (`lineaDe`), so a line changed any
// other way reads as kilos and is never misdrawn as cajas. Nothing of it reaches
// Postgres: a correction at a delivery is this phone's, and the product's own
// pack is changed on its page, by the owner or a manager.
// ============================================================================

import { SCALE, divRoundHalfUpAwayFromZero, formatDecimal, parseDecimal } from '@tienda/money';

import { priceCentavos, type CatalogEntry, type Pack, type PackWord, type UnitFactors } from '@/api/catalog';
import { parsePesos } from '@/api/catalogWrite';
import { baseFromShown, qtyShown, shownUnitOf } from '@/cart/quantity';
import { ES } from '@/strings';

/** How Comprar's pad keys a product: by the pack, or loose in its own unit. */
export type Modo = 'paquete' | 'suelto';

/**
 * The pack Comprar's pad may offer for this product, or `null`. ⚠️ Only where the
 * box speaks the unit the content is counted in — see the header.
 */
export function paqueteDe(entry: CatalogEntry): Pack | null {
  if (entry.pack === null) return null;
  return shownUnitOf(entry) === entry.priceUnit ? entry.pack : null;
}

/** What one pack holds as she reads it: `13.000` is `13`, `21.500` is `21.5`. */
export function traeDe(pack: Pack): string {
  return recortar(pack.holds);
}

function recortar(decimal: string): string {
  if (!decimal.includes('.')) return decimal;
  const sin = decimal.replace(/0+$/, '');
  return sin.endsWith('.') ? sin.slice(0, -1) : sin;
}

/** The pack's word for `n` of them — *1 caja*, *2 cajas*, *0 cajas*. */
export function palabraDe(word: PackWord, n: number): string {
  const w = ES.packs[word];
  return n === 1 ? w.one : w.many;
}

/**
 * What *Trae cada caja* says under its figure: *La última vez* when it is what she
 * typed last, *Aproximado* when it is the product's own guess — and nothing on a
 * docena, which is twelve by its name (a doubt the word does not have, seen on
 * the emulator at `14.5`), nor on a figure she just typed.
 */
export type NotaTrae = 'ultima' | 'aproximado' | null;

export function notaDeTrae(pack: Pack | null, llegada: Llegada | undefined, trae: string): NotaTrae {
  if (pack === null || pack.word === 'docena') return null;
  if (llegada !== undefined && llegada.trae !== '' && llegada.trae === trae) return 'ultima';
  return trae === traeDe(pack) ? 'aproximado' : null;
}

/** The figures a whole count of packs takes: none after a point, three digits. */
export const MAX_PAQUETES = 3;

// ----------------------------------------------------------------------------
// The arithmetic
// ----------------------------------------------------------------------------

/** `numeric(14,6)` times `numeric(14,3)` is scale 9; money is 2. `@tienda/money`'s divisor. */
const ANCHOR_DIVISOR = 10_000_000;

/**
 * How many whole packs a box holds — `null` for an empty box, a zero, or a figure
 * that is not a whole count.
 */
export function paquetesDe(cuantos: string): number | null {
  if (!/^\d{1,3}$/.test(cuantos)) return null;
  const n = Number.parseInt(cuantos, 10);
  return n > 0 ? n : null;
}

/**
 * One pack's content in base units at `SCALE.quantity` — `13` kg is 13,000,000
 * (13,000.000 g) — or `null`. A point left at the end (`13.`) is thirteen, as on
 * every Comprar box.
 */
export function contenidoBase(trae: string, unit: string, factors: UnitFactors): number | null {
  return baseFromShown(trae.replace(/\.$/, ''), unit, factors);
}

/** What arrived, in base units: the packs times what each held — `null` unless both are figures. */
export function baseDeLlegada(
  cuantos: string,
  trae: string,
  unit: string,
  factors: UnitFactors,
): number | null {
  const n = paquetesDe(cuantos);
  const one = contenidoBase(trae, unit, factors);
  if (n === null || one === null) return null;
  const base = n * one;
  return Number.isSafeInteger(base) ? base : null;
}

/**
 * The cost per base unit, at scale 6, that a pack's cost comes to — as
 * `record_purchase` takes it. ⚠️ The nearest the ledger can hold; see the header
 * for the centavo it can cost. A zero is a cost (`typedPerBase`'s rule). `null`
 * for an empty box, a figure that is not pesos, or a content that is not one.
 */
export function costoPorBase(
  costoPaquete: string,
  trae: string,
  unit: string,
  factors: UnitFactors,
): string | null {
  const limpio = costoPaquete.replace(/\.$/, '');
  if (limpio.trim() === '') return null;
  const centavos = parsePesos(limpio);
  const one = contenidoBase(trae, unit, factors);
  if (centavos === null || one === null) return null;
  try {
    return formatDecimal(divRoundHalfUpAwayFromZero(centavos * ANCHOR_DIVISOR, one), SCALE.unitPrice);
  } catch {
    return null;
  }
}

/**
 * What one pack costs at a cost per base — the box's prefill, from this provider's
 * last cost (*Anterior · hace 3 días*, his ruling of 2026-10-16) — as pesos text,
 * `209.30`. `null` when either figure is not one.
 */
export function costoDePaquete(
  perBase: string,
  trae: string,
  unit: string,
  factors: UnitFactors,
): string | null {
  const one = contenidoBase(trae, unit, factors);
  if (one === null) return null;
  try {
    const per = parseDecimal(perBase, SCALE.unitPrice);
    const centavos = divRoundHalfUpAwayFromZero(per * one, ANCHOR_DIVISOR);
    return Number.isSafeInteger(centavos) ? formatDecimal(centavos, SCALE.money) : null;
  } catch {
    return null;
  }
}

/**
 * The cost box's figure when she switches between *Caja* and *Kilos* with a cost
 * typed — per pack to per unit and back, to the centavo (the page's own rule). An
 * empty box stays empty; a figure that is not pesos is left as she typed it.
 */
export function costoAlCambiar(costo: string, a: Modo, trae: string): string {
  const centavos = parsePesos(costo.replace(/\.$/, ''));
  if (costo.trim() === '' || centavos === null) return costo;
  try {
    const t = parseDecimal(trae.replace(/\.$/, ''), SCALE.quantity);
    if (t <= 0) return costo;
    const next = a === 'paquete'
      ? divRoundHalfUpAwayFromZero(centavos * t, 10 ** SCALE.quantity)
      : divRoundHalfUpAwayFromZero(centavos * 10 ** SCALE.quantity, t);
    return formatDecimal(next, SCALE.money);
  } catch {
    return costo;
  }
}

/**
 * *Entran 26 kg · a $16.10 el kg* — what goes on the shelf, in the unit she reads
 * prices in, and what one of it cost. `null` until both figures are there.
 */
export function entran(
  base: number | null,
  perBase: string | null,
  entry: CatalogEntry,
  factors: UnitFactors,
): { readonly cantidad: string; readonly centavos: number } | null {
  if (base === null || perBase === null) return null;
  const unit = shownUnitOf(entry);
  const cantidad = qtyShown(base, unit, factors);
  const factor = factors[entry.priceUnit];
  const centavos = factor === undefined ? null : priceCentavos(perBase, factor);
  return cantidad === null || centavos === null ? null : { cantidad, centavos };
}

// ----------------------------------------------------------------------------
// What the phone keeps
// ----------------------------------------------------------------------------

/** Where the phone keeps `Llegadas` — `@/lib/store`'s, one key for every shop on it. */
export const LLEGADAS_KEY = 'tienda.llegadas.v1';

/** The line a pad added in packs, as she keyed it and as the basket holds it. */
export interface LineaEnPaquetes {
  readonly cuantos: string;
  readonly costo: string;
  readonly base: number;
  readonly perBase: string;
}

/** How she keyed this product's last delivery on this phone. */
export interface Llegada {
  readonly modo: Modo;
  /** What one pack held, as she typed it — the next delivery's hint. */
  readonly trae: string;
  readonly linea: LineaEnPaquetes | null;
}

export type Llegadas = Readonly<Record<string, Llegada>>;

export const NINGUNA: Llegadas = {};

/** The pad's mode when it opens on a product not in the basket: her last, or the pack. */
export function modoInicial(entry: CatalogEntry, llegada: Llegada | undefined): Modo {
  if (paqueteDe(entry) === null) return 'suelto';
  return llegada?.modo ?? 'paquete';
}

/** *Trae cada caja*: the last she typed on this phone, or the product's own pack. */
export function traeInicial(entry: CatalogEntry, llegada: Llegada | undefined): string {
  const pack = paqueteDe(entry);
  if (pack === null) return '';
  return llegada !== undefined && llegada.trae !== '' ? llegada.trae : traeDe(pack);
}

/**
 * The line as she keyed it in packs — but only while the basket holds exactly what
 * that pad sent; any other change makes it a line in kilos again. `null` otherwise.
 */
export function lineaDe(
  llegada: Llegada | undefined,
  base: number,
  perBase: string | undefined,
): LineaEnPaquetes | null {
  const linea = llegada?.linea ?? null;
  if (linea === null || base <= 0 || typeof perBase !== 'string') return null;
  return linea.base === base && linea.perBase === perBase ? linea : null;
}

/** After the pad adds a line: what the phone keeps for this product. */
export function recordar(
  llegadas: Llegadas,
  variantId: string,
  modo: Modo,
  trae: string,
  linea: LineaEnPaquetes | null,
): Llegadas {
  const before = llegadas[variantId];
  const kept = modo === 'paquete' ? recortar(trae.replace(/\.$/, '')) : (before?.trae ?? '');
  return { ...llegadas, [variantId]: { modo, trae: kept, linea: modo === 'paquete' ? linea : null } };
}

/** What `LLEGADAS_KEY` holds, read back — a corrupt or foreign value is nothing kept. */
export function leerLlegadas(raw: string | null): Llegadas {
  if (raw === null) return NINGUNA;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return NINGUNA;
    const out: Record<string, Llegada> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const l = llegadaDe(value);
      if (l !== null) out[id] = l;
    }
    return out;
  } catch {
    return NINGUNA;
  }
}

function llegadaDe(value: unknown): Llegada | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if ((v.modo !== 'paquete' && v.modo !== 'suelto') || typeof v.trae !== 'string') return null;
  const l = v.linea as Record<string, unknown> | null | undefined;
  const linea =
    l !== null && typeof l === 'object' && typeof l.cuantos === 'string' && typeof l.costo === 'string'
    && typeof l.base === 'number' && typeof l.perBase === 'string'
      ? { cuantos: l.cuantos, costo: l.costo, base: l.base, perBase: l.perBase }
      : null;
  return { modo: v.modo, trae: v.trae, linea };
}

/** What `LLEGADAS_KEY` is written as. */
export function guardarLlegadas(llegadas: Llegadas): string {
  return JSON.stringify(llegadas);
}
