// ============================================================================
// LA BÁSCULA — WHAT THE COUNTER'S NUMBER PAD READS. Plan task `14.1`, the first
// row of Step 14 (*La vitrina*), and the owner's answer A of 2026-11-27: *"The
// Scale"* — a weighed product is charged by what the scale reads.
//
// ⚠️⚠️ SO THE PAD READS LIKE THE SCALE: DIGITS COME IN FROM THE RIGHT. A kilo
// product keyed 7, 3, 0 reads **0.730 kg** — the three decimals are always
// there, as on the scale's own window, and there is no decimal point to find.
// That is the whole reason the phone's `decimal-pad` left the counter: on it,
// *0.730* was five keys with a point in the middle, and *730* was 730 kg.
//
// ⚠️ ONLY A UNIT THE SCALE SHOWS WITH DECIMALS GETS THEM. `kg` and `l` read in
// thousandths; everything else the box speaks in is a WHOLE count — `pza`,
// `manojo`, and the grams of a product priced per 100 g, which `@/cart/quantity`
// already shows in `gr` (C3.8). Which unit the box speaks is still that module's
// decision (`shownUnitOf`), never this one's.
//
// ⚠️⚠️ NOTHING HERE CONVERTS A QUANTITY. The digits become the box's own text
// (`textoDe`) and that text goes through `baseFromShown` — the same door the old
// box's keystrokes went through — so a kilo is still `stepOf`'s kilo and there
// is no second answer to *how many grams in a kilo* (`@/cart/cart`).
//
// ⚠️ THE OWNER'S ANSWER B IS WHY THERE IS NO PESOS KEY: a customer may ask for
// *20 pesos de chile*, but the person at the counter hands over a bunch, a best
// guess or what the scale reads, and records THAT.
//
// ⚠️⚠️ `14.3`, COMPRAR'S PAD KEEPS A DECIMAL POINT (call 5): a delivery's kilos
// come off a note or a floor scale in whole numbers — *25 kg* is two keys, not
// five — and a cost is pesos and centavos. So Comprar types left to right, as
// written on the note: `escribir`, below, with the point where `limpiar` sits on
// Vender's pad. Its box takes the decimals its unit can hold (three for a kilo
// or a litre, none for a count) and a cost two, and refuses a key past them
// rather than rounding: what she reads is what she keyed.
// ============================================================================

import { SCALE, formatDecimal } from '@tienda/money';

import type { UnitFactors } from '@/api/catalog';
import { parsePesos } from '@/api/catalogWrite';
import { typedPerBase } from '@/api/providers';
import { baseFromShown } from '@/cart/quantity';
import { ES } from '@/strings';

/** How the pad's digits read: in thousandths, like the scale, or as a count. */
export type Teclado = 'balanza' | 'cuenta';

/**
 * The units the scale shows with three decimals. ⚠️ A shown unit, as
 * `shownUnitOf` answers it — a product priced per 250 g is shown in `g` and is
 * keyed as a count of grams.
 */
export const CON_DECIMALES: ReadonlySet<string> = new Set(['kg', 'l']);

/**
 * How many digits the pad takes. ⚠️ `balanza` stops at 999.999 — six digits,
 * the most a counter scale shows — and a count at 99,999, which holds a
 * delivery's grams and refuses a number nobody meant.
 */
export const MAX_DIGITOS: Readonly<Record<Teclado, number>> = { balanza: 6, cuenta: 5 };

/**
 * One key of the pad: a digit, the one that erases the last, the one that clears,
 * or Comprar's decimal point.
 */
export type Tecla = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'borrar' | 'limpiar' | 'punto';

/** The pad's twelve keys, in the order they are drawn: three across, four down. */
export const TECLAS: readonly Tecla[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'limpiar', '0', 'borrar'];

/** Comprar's twelve: the point where Vender's pad clears (call 5). */
export const TECLAS_PUNTO: readonly Tecla[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'punto', '0', 'borrar'];

export function tecladoDe(shownUnit: string): Teclado {
  return CON_DECIMALES.has(shownUnit) ? 'balanza' : 'cuenta';
}

/**
 * The digits after one key. ⚠️ Leading zeros never stay — `0`, `7`, `3`, `0`
 * reads 0.730, not 0.0730 — and a key past `MAX_DIGITOS` is refused rather than
 * dropping the first digit, so what she reads is always what she keyed.
 */
export function teclear(digitos: string, tecla: Tecla, teclado: Teclado): string {
  if (tecla === 'limpiar') return '';
  if (tecla === 'borrar') return digitos.slice(0, -1);
  // ⚠️ Comprar's key; the scale has no point to find, so it changes nothing.
  if (tecla === 'punto') return digitos;
  const next = (digitos + tecla).replace(/^0+/, '');
  return next.length > MAX_DIGITOS[teclado] ? digitos : next;
}

/**
 * What the pad shows for its digits, which is also the box's own text. An
 * empty pad reads `0.000` or `0`, drawn as a hint by the screen.
 */
export function textoDe(digitos: string, teclado: Teclado): string {
  const n = digitos === '' ? 0 : Number.parseInt(digitos, 10);
  if (teclado === 'cuenta') return String(n);
  return formatDecimal(n, SCALE.quantity);
}

/**
 * The digits keyed, as base units at `SCALE.quantity` — or `null` when they are
 * no quantity (nothing keyed, a zero, or a unit this phone has not read).
 */
export function baseDe(
  digitos: string,
  shownUnit: string,
  factors: UnitFactors,
): number | null {
  if (!/[1-9]/.test(digitos)) return null;
  return baseFromShown(textoDe(digitos, tecladoDe(shownUnit)), shownUnit, factors);
}

/** A chip: what it says, and the digits it puts on the pad. */
export interface Ficha {
  readonly etiqueta: string;
  readonly digitos: string;
}

/**
 * The best guesses for this shown unit — the owner's *best guess on amount*.
 * ⚠️ Each puts its digits on the pad and adds nothing: the pad's one act does,
 * so a chip and a keyed figure are confirmed the same way.
 */
export function fichasDe(shownUnit: string): readonly Ficha[] {
  const word = ES.units[shownUnit as keyof typeof ES.units] ?? shownUnit;
  const f = ES.counter.pad.fraccion;
  if (shownUnit === 'kg' || shownUnit === 'l') {
    return [
      { etiqueta: `${f.cuarto} ${word}`, digitos: '250' },
      { etiqueta: `${f.medio} ${word}`, digitos: '500' },
      { etiqueta: `${f.tresCuartos} ${word}`, digitos: '750' },
      { etiqueta: `1 ${word}`, digitos: '1000' },
      { etiqueta: `1${f.medio} ${word}`, digitos: '1500' },
      { etiqueta: `2 ${word}`, digitos: '2000' },
    ];
  }
  if (shownUnit === 'g' || shownUnit === 'ml') {
    const big = ES.units[shownUnit === 'g' ? 'kg' : 'l'];
    return [
      { etiqueta: `100 ${word}`, digitos: '100' },
      { etiqueta: `${f.cuarto} ${big}`, digitos: '250' },
      { etiqueta: `${f.medio} ${big}`, digitos: '500' },
      { etiqueta: `${f.tresCuartos} ${big}`, digitos: '750' },
      { etiqueta: `1 ${big}`, digitos: '1000' },
    ];
  }
  // ⚠️ A COUNT GETS NO CHIPS: its keys already ARE the count, and a row of 1, 2,
  // 3 over the keys 1, 2, 3 was the same thing drawn twice (seen on the
  // emulator, 2026-11-27).
  return [];
}

// ----------------------------------------------------------------------------
// COMPRAR'S PAD — `14.3`, call 5: left to right, with a point.
// ----------------------------------------------------------------------------

/** How many decimals Comprar's quantity box takes for a product shown in `shownUnit`. */
export function decimalesDe(shownUnit: string): number {
  return CON_DECIMALES.has(shownUnit) ? SCALE.quantity : 0;
}

/** A cost's decimals: centavos. */
export const DECIMALES_COSTO = SCALE.money;

/**
 * How many whole digits each box takes. ⚠️ 99,999 of anything holds a delivery
 * and refuses a number nobody meant (`MAX_DIGITOS`' reason); a cost up to
 * $999,999 holds a whole truck's invoice.
 */
export const MAX_ENTEROS = { cantidad: 5, costo: 6 } as const;

/**
 * The box's text after one key, typed left to right as on a delivery note.
 *
 * ⚠️ A KEY THAT WOULD MAKE THE FIGURE SOMETHING SHE DID NOT KEY IS REFUSED, never
 * rounded or shifted: a point where the box takes no decimals, a second point, a
 * decimal past `decimales`, a whole digit past `enteros`. A leading zero goes
 * (`0`, `7` is `7`) unless a point follows it (`0.5`), and a point first reads
 * `0.`.
 */
export function escribir(texto: string, tecla: Tecla, decimales: number, enteros: number): string {
  if (tecla === 'limpiar') return '';
  if (tecla === 'borrar') return texto.slice(0, -1);
  const punto = texto.indexOf('.');
  if (tecla === 'punto') {
    if (decimales === 0 || punto !== -1) return texto;
    return texto === '' ? '0.' : `${texto}.`;
  }
  if (punto !== -1) return texto.length - punto - 1 >= decimales ? texto : texto + tecla;
  const next = (texto + tecla).replace(/^0+(?=\d)/, '');
  return next.length > enteros ? texto : next;
}

/**
 * The quantity a Comprar box holds, as base units — or `null` for an empty box, a
 * zero, or a unit this phone has not read. ⚠️ A point left at the end (`12.`) is
 * twelve: she has not finished, and the figure on the box is still 12.
 */
export function cantidadDe(texto: string, shownUnit: string, factors: UnitFactors): number | null {
  return baseFromShown(texto.replace(/\.$/, ''), shownUnit, factors);
}

/**
 * The cost a Comprar box holds, as `record_purchase` takes it — net per base, at
 * scale 6 — or `null` for an empty box or a unit this phone has not read. ⚠️ It is
 * `typedPerBase` over `parsePesos`, the conversion the card's box used, so a cost
 * keyed on the pad is the cost the old box would have sent. A zero is a cost
 * (`typedPerBase`'s rule: a sample the provider gave is still a delivery).
 */
export function costoDe(texto: string, priceUnit: string, factors: UnitFactors): string | null {
  const limpio = texto.replace(/\.$/, '');
  if (limpio.trim() === '') return null;
  return typedPerBase(parsePesos(limpio), priceUnit, factors);
}

/**
 * Comprar's best guesses for what arrived — the page's chips: whole kilos as a
 * delivery comes in, and dozens of a count. ⚠️ Each puts its figure in the box and
 * adds nothing, as Vender's do. A product shown in grams or millilitres gets none.
 */
export function fichasDeCompra(shownUnit: string): readonly Ficha[] {
  const word = ES.units[shownUnit as keyof typeof ES.units] ?? shownUnit;
  if (shownUnit === 'kg' || shownUnit === 'l') {
    return ['5', '10', '20', '25', '50'].map((n) => ({ etiqueta: `${n} ${word}`, digitos: n }));
  }
  if (shownUnit === 'pza' || shownUnit === 'manojo') {
    return ['6', '12', '24', '36'].map((n) => ({ etiqueta: `${n} ${word}`, digitos: n }));
  }
  return [];
}
