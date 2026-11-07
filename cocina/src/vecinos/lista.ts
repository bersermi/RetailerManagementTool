// ============================================================================
// WHAT ITACATE'S CARDS AND PAGES SAY — THE RULES ITS TWO PAGES USE, COPIED. Plan task
// `10.5-v-c-ii`: *Así la ven* and *Ver como la ven* are Itacate's two pages inside Wera
// Cocina, so every word on them is worked out by Itacate's rules. ⚠️ ITACATE'S CODE,
// block for block (`itacate/src/lib/lista.ts`, held by `test/vecinos.test.ts`): the
// window's words, *Quedan 2*, the price with its *vale* and saving, her pattern and when
// she last published. The list's order and distances are Itacate's alone — a fonda's
// preview has no neighbour to measure from.
// ============================================================================

import { formatMXN } from '@/format/mxn';
import { slotOf } from '@/lib/ventana';
import { VECINOS as ES } from '@/strings';
import type { Dish, Kitchen, Offer, Summary } from '@/vecinos/cocinas';

/** What she has on offer at `ahora`, the earliest window first: the door's answer, less what ended since. */
export function vigentes(cocina: Kitchen, ahora: Date): readonly Offer[] {
  return cocina.offers
    .filter((oferta) => oferta.end.getTime() > ahora.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** *Quedan 2*, *Último* — what she offered (reservations come with `10.5b`); nothing for a fraction. */
export function quedanTexto(platillo: Dish): string | null {
  if (platillo.count === null || platillo.count < 1) return null;
  return platillo.count === 1 ? ES.cerca.ultimo : ES.cerca.quedan(platillo.count);
}

/**
 * The saving, as a whole percent of the *vale* — or `null` when there is no *vale*,
 * or it saves less than one percent. ⚠️ From integer centavos: a percentage, never
 * a peso, is the only fraction here.
 */
export function ahorroDe(precioCentavos: number, valeCentavos: number | null): number | null {
  if (valeCentavos === null || valeCentavos <= precioCentavos) return null;
  const porciento = Math.round(((valeCentavos - precioCentavos) * 100) / valeCentavos);
  return porciento >= 1 ? porciento : null;
}

/** The price, the *vale* to strike through, and the saving on her colour. */
export function precioTexto(platillo: Dish): { readonly precio: string; readonly vale: string | null; readonly ahorro: string | null } {
  const ahorro = ahorroDe(platillo.priceCentavos, platillo.usualCentavos);
  return {
    precio: formatMXN(platillo.priceCentavos),
    vale: ahorro === null || platillo.usualCentavos === null ? null : formatMXN(platillo.usualCentavos),
    ahorro: ahorro === null ? null : ES.cerca.ahorro(ahorro),
  };
}

/** *Hoy · 17:30 a 18:15* — Wera Cocina's words for the window she set. */
export function ventanaTexto(oferta: Offer, ahora: Date): string {
  return slotOf({ start: oferta.start, end: oferta.end }, ahora);
}

/** How many publications in four weeks make a pattern — his ruling of 2026-11-01, late. */
export const PATRON_MINIMO = 3;

/**
 * Her days, in words: *todos los días*, *entre semana*, *los fines de semana*, or
 * the days themselves — *los lunes, miércoles y viernes*. `weekdays` is the door's,
 * Monday first. `null` when no day has a publication.
 */
export function diasTexto(weekdays: readonly number[]): string | null {
  const con = weekdays.flatMap((n, i) => (n > 0 ? [i] : []));
  if (con.length === 0) return null;
  if (con.length >= 6) return ES.cerca.todosLosDias;
  if (con.length >= 4 && con.every((i) => i <= 4)) return ES.cerca.entreSemana;
  if (con.length === 2 && con[0] === 5 && con[1] === 6) return ES.cerca.finesDeSemana;
  if (con.length <= 4) return ES.cerca.los(con.map((i) => ES.cerca.losDias[i]));
  return ES.cerca.casiTodosLosDias;
}

/**
 * Calendar days from `lastDay` to `ahora`'s day — 0 today, 1 yesterday, negative
 * for a day still to come; `null` when it cannot be read. `lastDay` is the door's,
 * a calendar day in her kitchen's zone; `ahora` is read on this phone, in the same
 * city. ⚠️ A day she published FOR: the door counts her pickup day, so a publication
 * made tonight for tomorrow morning is tomorrow's.
 */
export function diasAtras(lastDay: string, ahora: Date): number | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lastDay);
  if (partes === null) return null;
  const dia = Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  const hoy = Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((hoy - dia) / 86_400_000);
}

/**
 * When she last published, as she would say it: *Publicó hoy*, *Publicó ayer*,
 * *Publicó el martes* within the week, else *Publicó el 26 de octubre*.
 */
export function publicoTexto(lastDay: string, ahora: Date): string | null {
  const atras = diasAtras(lastDay, ahora);
  if (atras === null) return null;
  if (atras <= 0) return ES.cerca.publicoHoy;
  if (atras === 1) return ES.cerca.publicoAyer;
  const fecha = new Date(`${lastDay}T00:00:00Z`);
  if (atras < 7) return ES.cerca.publicoEl(ES.cerca.elDia[(fecha.getUTCDay() + 6) % 7]);
  return ES.cerca.publicoFecha(fecha.getUTCDate(), ES.cerca.meses[fecha.getUTCMonth()]);
}

/**
 * Her pattern in words — *Suele tener ofertas entre semana, hacia las 17:00* — once 3 or
 * more publications in four weeks show one, else `null`. A quiet kitchen's card and
 * her page say it alike (`10.5-iv-a-ii`).
 */
export function patronDe(resumen: Summary): string | null {
  const total = resumen.weekdays.reduce((suma, n) => suma + n, 0);
  const dias = diasTexto(resumen.weekdays);
  if (total < PATRON_MINIMO || resumen.usualHour === null || dias === null) return null;
  return ES.cerca.suele(dias, ES.cerca.hacia(resumen.usualHour));
}
