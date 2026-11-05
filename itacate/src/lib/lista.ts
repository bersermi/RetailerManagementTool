// ============================================================================
// THE LIST OF WHAT IS CLOSE TO HER — ITS CARDS, THEIR ORDER AND EVERY WORD ON
// THEM. Plan task `10.5-iv-a-i`, proposal B's list (the owner's ruling of
// 2026-11-01, https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu).
//
// ⚠️ TWO KINDS OF CARD, AS RULED:
//   - a card per dish on offer — *"Each offer near her shows a photo or her
//     kitchen's drawing, the price with the usual value struck through, the window,
//     the distance and Quedan 2"* (the proposals page, step 4);
//   - a faded card per QUIET kitchen — one that published in the last 14 days and
//     has nothing on offer now — *"its card saying when it usually publishes —
//     Suele publicar entre semana, hacia las 17:00 once 3 or more publications in
//     4 weeks show a pattern, otherwise Publicó ayer or Publicó el martes"* (his
//     ruling of 2026-11-01, late, word for word).
// A publication whose window ended while she looked is no longer on offer: the
// cards are made again as time passes (`ahora`), so a kitchen turns quiet on her
// screen without asking the door.
//
// ⚠️ THE ORDER, HIS ANSWERS OF 2026-11-05 (plan `10.5-iv-a-iv`, asked on
// `10.5-iv-a-iii`'s page, https://claude.ai/artifact/M5kESDfKVSy3mFEyT3g7dy):
//   - it opens on *Ahora* — what she can pick up now, then later today, then another
//     day, then the quiet kitchens; nearest first inside each (his answer 1). On the
//     page's five moments it is the one order that never puts a faded card above a
//     dish, and puts lunch first at 13:30;
//   - *Ordenar* lets her pick (his answer 2: *"there are many restaurants in the
//     pilot neighborhood"*): *Más cerca* — nearest first, the quiet kitchens among the
//     rest, the order this list had until then — or *Más barato*, the cheapest dish
//     first. Nothing else orders it (his answer 3: every other order waits or never
//     comes, and none may cost money). Her pick lives while the list does.
// Every kitchen the door sends, in every order. A card whose distance is not known
// yet — a kitchen with no point, while her phone asks Google for its address, or
// after Google could not place it — goes last among its equals, never left out.
//
// ⚠️ SINCE `10.5-iv-a-ii` A CARD OPENS A PAGE — a dish's card the dish's, a quiet
// kitchen's card hers — and the list hands those pages each kitchen's distance
// (`distanciasDe`, at the foot), never where she is.
// ============================================================================

import type { Dish, Kitchen, Offer, Punto, Summary } from '@/api/cocinas';
import { formatMXN } from '@/format/mxn';
import { metrosEntre } from '@/lib/distancia';
import { daysFrom, slotOf } from '@/lib/ventana';
import { ES } from '@/strings';

/** One card of the list. */
export type Tarjeta =
  | {
      readonly kind: 'platillo';
      readonly key: string;
      readonly cocina: Kitchen;
      readonly oferta: Offer;
      readonly platillo: Dish;
      readonly metros: number | null;
      /** Its place among its kitchen's cards — her publications' order, then her lines'. */
      readonly posicion: number;
    }
  | {
      readonly kind: 'cocina';
      readonly key: string;
      readonly cocina: Kitchen;
      readonly metros: number | null;
      readonly posicion: number;
    };

/** Where a kitchen is: the door's point, else what her phone found for its address. */
export function puntoDe(cocina: Kitchen, buscados: ReadonlyMap<string, Punto>): Punto | null {
  return cocina.point ?? buscados.get(cocina.id) ?? null;
}

/** What she has on offer at `ahora`, the earliest window first: the door's answer, less what ended since. */
export function vigentes(cocina: Kitchen, ahora: Date): readonly Offer[] {
  return cocina.offers
    .filter((oferta) => oferta.end.getTime() > ahora.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** A name compared without accents or case — *Ñ* sorts as *N*, which no fonda will mind. */
function clave(nombre: string): string {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ----------------------------------------------------------------------------
// The order — his answers of 2026-11-05
// ----------------------------------------------------------------------------

/** The orders *Ordenar* offers, in the order its buttons show them. */
export const ORDENES = ['ahora', 'cerca', 'barato'] as const;
export type Orden = (typeof ORDENES)[number];

/** ⚠️ THE ORDER THE LIST OPENS ON — his answer 1. */
export const ORDEN_INICIAL: Orden = 'ahora';

/** When a card can be picked up: 0 now, 1 later today, 2 another day, 3 a quiet kitchen with nothing on offer. */
export type Cuando = 0 | 1 | 2 | 3;

export function cuandoDe(tarjeta: Tarjeta, ahora: Date): Cuando {
  if (tarjeta.kind === 'cocina') return 3;
  if (tarjeta.oferta.start.getTime() <= ahora.getTime()) return 0;
  return daysFrom(ahora, tarjeta.oferta.start) === 0 ? 1 : 2;
}

/** *Más cerca* — nearest first; an unknown distance last; then the kitchen's name; then her own order. */
export function antes(a: Tarjeta, b: Tarjeta): number {
  if (a.metros !== b.metros) {
    if (a.metros === null) return 1;
    if (b.metros === null) return -1;
    return a.metros - b.metros;
  }
  const na = clave(a.cocina.name);
  const nb = clave(b.cocina.name);
  if (na !== nb) return na < nb ? -1 : 1;
  if (a.cocina.id !== b.cocina.id) return a.cocina.id < b.cocina.id ? -1 : 1;
  return a.posicion - b.posicion;
}

/** *Ahora* — now, later today, another day, the quiet kitchens; *Más cerca* inside each. */
export function antesAhora(ahora: Date): (a: Tarjeta, b: Tarjeta) => number {
  return (a, b) => cuandoDe(a, ahora) - cuandoDe(b, ahora) || antes(a, b);
}

/** *Más barato* — the cheapest dish first, near or far; the quiet kitchens after; *Más cerca* between equals. */
export function antesBarato(a: Tarjeta, b: Tarjeta): number {
  const pa = a.kind === 'platillo' ? a.platillo.priceCentavos : Number.POSITIVE_INFINITY;
  const pb = b.kind === 'platillo' ? b.platillo.priceCentavos : Number.POSITIVE_INFINITY;
  if (pa !== pb) return pa < pb ? -1 : 1;
  return antes(a, b);
}

/** The comparison each order sorts by. */
export function ordenDe(orden: Orden, ahora: Date): (a: Tarjeta, b: Tarjeta) => number {
  if (orden === 'cerca') return antes;
  if (orden === 'barato') return antesBarato;
  return antesAhora(ahora);
}

/** Every card, in the order she picked — *Ahora* until she picks — measured from `desde`. */
export function tarjetasDe(
  cocinas: readonly Kitchen[],
  desde: Punto | null,
  buscados: ReadonlyMap<string, Punto>,
  ahora: Date,
  orden: Orden = ORDEN_INICIAL,
): Tarjeta[] {
  const tarjetas: Tarjeta[] = [];
  for (const cocina of cocinas) {
    const punto = puntoDe(cocina, buscados);
    const metros = desde !== null && punto !== null ? metrosEntre(desde, punto) : null;
    const ofertas = vigentes(cocina, ahora);
    if (ofertas.length === 0) {
      tarjetas.push({ kind: 'cocina', key: `cocina:${cocina.id}`, cocina, metros, posicion: 0 });
      continue;
    }
    let posicion = 0;
    for (const oferta of ofertas) {
      for (const platillo of oferta.dishes) {
        tarjetas.push({
          kind: 'platillo',
          key: `platillo:${oferta.id}:${platillo.lineNo}`,
          cocina,
          oferta,
          platillo,
          metros,
          posicion: posicion++,
        });
      }
    }
  }
  return tarjetas.sort(ordenDe(orden, ahora));
}

// ----------------------------------------------------------------------------
// What a dish's card says
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// What a quiet kitchen's card says
// ----------------------------------------------------------------------------

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
 * Her pattern in words — *Suele publicar entre semana, hacia las 17:00* — once 3 or
 * more publications in four weeks show one, else `null`. A quiet kitchen's card and
 * her page say it alike (`10.5-iv-a-ii`).
 */
export function patronDe(resumen: Summary): string | null {
  const total = resumen.weekdays.reduce((suma, n) => suma + n, 0);
  const dias = diasTexto(resumen.weekdays);
  if (total < PATRON_MINIMO || resumen.usualHour === null || dias === null) return null;
  return ES.cerca.suele(dias, ES.cerca.hacia(resumen.usualHour));
}

/** A quiet kitchen's line: the pattern once there is one, else when she last published. */
export function cuandoPublica(resumen: Summary, ahora: Date): string | null {
  return patronDe(resumen) ?? (resumen.lastDay === null ? null : publicoTexto(resumen.lastDay, ahora));
}

// ----------------------------------------------------------------------------
// What the list hands her two pages: how far each kitchen is (`10.5-iv-a-ii`)
// ----------------------------------------------------------------------------

/**
 * Each kitchen's distance, as the list measured it — a number per kitchen, the only
 * thing of where she is that leaves the list (`@/lib/DistanciasProvider`): her two
 * pages show it, and work out nothing. A kitchen whose distance is not known is not
 * in it.
 */
export function distanciasDe(tarjetas: readonly Tarjeta[]): ReadonlyMap<string, number> {
  const mapa = new Map<string, number>();
  for (const tarjeta of tarjetas) if (tarjeta.metros !== null) mapa.set(tarjeta.cocina.id, tarjeta.metros);
  return mapa;
}

/** Whether two answers hold the same distances — so a page is not drawn again every minute for nothing. */
export function mismasDistancias(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [id, metros] of a) if (b.get(id) !== metros) return false;
  return true;
}
