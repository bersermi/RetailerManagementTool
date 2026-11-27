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
// ============================================================================

import { SCALE, formatDecimal } from '@tienda/money';

import type { UnitFactors } from '@/api/catalog';
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

/** One key of the pad: a digit, the one that erases the last, or the one that clears. */
export type Tecla = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'borrar' | 'limpiar';

/** The pad's twelve keys, in the order they are drawn: three across, four down. */
export const TECLAS: readonly Tecla[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'limpiar', '0', 'borrar'];

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
