// ============================================================================
// HER KITCHEN AS A NEIGHBOUR'S PHONE HOLDS IT — MADE FROM HER OWN ROWS. Plan task
// `10.5-v-c-ii`: *Así la ven* (each of today's offers, in *Tus ofertas*) and *Ver como
// la ven* (her page, in *Mi cocina*) draw Itacate's two pages inside Wera Cocina
// (`@/vecinos/`). Those pages are drawn from the door's answer (`on_offer_now`, `0078`);
// here the same answer is made, for her kitchen alone, from what this app already
// holds: her kitchen, her place, her page and her publications.
//
// ⚠️ WERA COCINA NEVER ASKS THE DOOR. The door is the one read across businesses
// (ADR-035 §2.7) and sends every kitchen a neighbour may see; a second reader of it
// needs a ruling, and her preview needs only her own rows, which the walls already
// give her. So THE DOOR'S RULES ARE WORKED OUT AGAIN HERE, each beside the line of
// `0078` it repeats, and `test/comoLaVen.test.ts` reads that migration's text for every
// number and order below — a new door in a later migration turns that test red:
//   - ON OFFER: not withdrawn and its window not over, the earliest window first;
//   - THE POINT: her own pin, else Google's copy while under 29 days old, else none;
//   - THE SUMMARY, over the publications made in the last 28 days — withdrawn ones too,
//     as the door counts them: how many per weekday of their pickup (Monday first), the
//     hour most of them start (the earliest of equals), the last day she published for,
//     and the dishes in two or more of them, grouped by `normalize_name`, at most five —
//     the most often first, then the most recent — each under its newest spelling, with
//     the price she gave it most (the lowest of equals);
//   - SEEN IN ITACATE: while something is on offer, or for 14 days after a publication.
// ⚠️ THE ROWS ARE HER LAST 60 (`@/api/listing`'s `LISTING_LIMIT`): four weeks at two a
// day. A kitchen that publishes more than that sees a summary of her newest 60.
// ⚠️ LOCAL TIME IS HER KITCHEN'S: the phone is in her kitchen, as for every window here
// (`@/lib/ventana`); the door reads her kitchen's zone.
// ⚠️ SINCE `10.5b-iii-a` THE DOOR ALSO SENDS HOW SHE TAKES PAYMENT, THE WAYS SHE HANDS PLATES
// OVER, WHO MAY RESERVE, EACH OFFER'S *DESECHABLE* AND EACH LINE'S WAYS (`0079`, `0080`), and
// since `10.5b-iii-b` HER STARS, and Itacate's pages draw them.
// ⚠️⚠️ SINCE `10.5b-iv-c` THE PREVIEW IS THE DOOR'S ANSWER FOR HER, WHOLE:
//   - WHAT IS LEFT (`0079`): each dish's count is what she offers less what is taken
//     (`@/lib/apartados`' `tomadosDe`, `listing_line_taken`'s rule), a dish with nothing left
//     is not sent, and an offer with nothing left is not on offer — so a plate reserved in
//     Itacate leaves her preview as it leaves the door;
//   - HER SETTINGS (`@/api/ajustes`): how she takes payment, the ways she hands plates over
//     and who may reserve; each dish's own ways and each offer's *desechable* from her list;
//   - HER STARS (`@/api/calificaciones`' `estrellasDe`): from five, the day after, her three most
//     given good tags — worked out from her own `my_kitchen_ratings`, never the door.
// Until a read answers, its part is the door's own default (`SIN_AJUSTES`: cash only, *para
// llevar* only, everyone, no stars; nothing taken) — `test/comoLaVen.test.ts` holds them to the
// door's `coalesce`s, and every rule above to its text.
// ============================================================================

import { comeresDe, pagosDe, type Ajustes } from '@/api/ajustes';
import type { Kitchen as SuCocina } from '@/api/kitchen';
import type { Line, Listing } from '@/api/listing';
import type { Page } from '@/api/pagina';
import { toMilliseconds, type Place } from '@/api/place';
import { claveDePlato } from '@/lib/apartados';
import type { Dish, Estrellas, Kitchen, Offer, Point, Repeat, Summary } from '@/vecinos/cocinas';

const DIA_MS = 86_400_000;

/** The door's summary looks back this far (`interval '28 days'`). */
export const DIAS_DEL_RESUMEN = 28;
/** A kitchen with nothing on offer is still seen this long after a publication (`interval '14 days'`). */
export const DIAS_A_LA_VISTA = 14;
/** Google's copy of her point is drawn while younger than this (`interval '29 days'`). */
export const DIAS_DEL_PUNTO_DE_GOOGLE = 29;
/** A dish repeats once it is in this many publications (`having count(distinct li.id) >= 2`). */
export const VECES_PARA_REPETIR = 2;
/** At most this many repeated dishes (`limit 5`). */
export const REPETIDOS_MAXIMOS = 5;

/** What is taken of each dish, by `claveDePlato` — `null` while her reservations are not read: nothing. */
export type Tomados = ReadonlyMap<string, number> | null;

/**
 * What is left of one dish, as the door sends it (`ll.quantity - t.taken`): what she offers
 * less what is taken — never below zero, though the database never lets it be.
 */
export function quedanDe(listing: Listing, i: number, tomados: Tomados): number {
  const tomadas = tomados?.get(claveDePlato(listing.id, i + 1)) ?? 0;
  return Math.max(0, listing.lines[i].count - tomadas);
}

/** Not withdrawn and its window not over — what makes her kitchen SEEN, whatever is left. */
function vigente(listing: Listing, now: Date): boolean {
  return listing.withdrawnAt === null && listing.end.getTime() > now.getTime();
}

/**
 * A publication on offer, as the door sends it: not withdrawn, its window not over — and,
 * since `0079`, something left (`and exists (… x.quantity > public.listing_line_taken(x.id))`).
 */
function enOferta(listing: Listing, now: Date, tomados: Tomados): boolean {
  return vigente(listing, now) && listing.lines.some((_line, i) => quedanDe(listing, i, tomados) > 0);
}

/**
 * ⚠️ `10.5b-iii-a`: what the door sends of a kitchen whose settings are its defaults (`0079`'s
 * `coalesce`s, `0080`'s NULL), and no stars (from five ratings, counted the day after). Since
 * `10.5b-iv-c` only the fallback while her settings or her stars are not read yet.
 */
export const SIN_AJUSTES = {
  pagos: ['efectivo'],
  comeres: ['llevar'],
  minScore: null,
  estrellas: null,
  llevar: true,
  aqui: false,
  desechableCentavos: null,
} as const;

/**
 * One of her lines as a dish — numbered as `publish_listing` numbers them, 1 to 10 in her order —
 * with what is LEFT of it and its own ways (`10.5b-iv-c`).
 */
function platilloDe(line: Line, i: number, quedan: number): Dish {
  return {
    lineNo: i + 1,
    name: line.name,
    description: line.description,
    tags: line.tags,
    priceCentavos: line.priceCentavos,
    count: quedan,
    surprise: line.surprise,
    usualCentavos: line.usualCentavos,
    photo: line.imagePath,
    // ⚠️ Read with the columns' defaults: a copy kept on the phone by the build before `10.5b-iv-c`
    // has neither (`@/api/persist`'s `CACHE_SHAPE` comment).
    llevar: line.llevar !== false,
    aqui: line.aqui === true,
  };
}

/**
 * What she has on offer at `now`, the earliest window first, then by id (`order by li.pickup_start,
 * li.id`) — each dish with what is left, a dish with nothing left not sent (`and ll.quantity >
 * t.taken`), and each offer's *desechable* as it was copied when she published.
 */
export function ofertasDe(listings: readonly Listing[], now: Date, tomados: Tomados = null): Offer[] {
  return listings
    .filter((listing) => enOferta(listing, now, tomados))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((listing) => ({
      id: listing.id,
      start: listing.start,
      end: listing.end,
      dishes: listing.lines
        .map((line, i) => ({ line, i, quedan: quedanDe(listing, i, tomados) }))
        .filter(({ quedan }) => quedan > 0)
        .map(({ line, i, quedan }) => platilloDe(line, i, quedan)),
      // ⚠️ `?? null`: a copy kept by the build before `10.5b-iv-c` has none, and the page formats a number.
      desechableCentavos: listing.desechableCentavos ?? null,
    }));
}

/** Her point as the door sends it: her own pin wins; else Google's copy while under 29 days old; else none. */
export function puntoDe(place: Place | null, now: Date): Point | null {
  if (place === null) return null;
  if (place.pin !== null) return { latitude: place.pin.latitude, longitude: place.pin.longitude, source: 'pin' };
  if (place.google === null) return null;
  const at = Date.parse(toMilliseconds(place.google.at));
  if (!Number.isFinite(at) || at <= now.getTime() - DIAS_DEL_PUNTO_DE_GOOGLE * DIA_MS) return null;
  return { latitude: place.google.pin.latitude, longitude: place.google.pin.longitude, source: 'google' };
}

/** `normalize_name` (`0002`): lower case, the ends trimmed, every run of spaces one space. */
export function nombreNormal(nombre: string): string {
  return nombre.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** A calendar day in the phone's zone, `YYYY-MM-DD` — the door's `to_char(…, 'YYYY-MM-DD')`. */
function diaDe(at: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${dos(at.getMonth() + 1)}-${dos(at.getDate())}`;
}

/** The most frequent value; the lowest among equals — `mode() within group (order by …)` and `order by count(*) desc, 1`. */
function moda(valores: readonly number[]): number | null {
  const cuenta = new Map<number, number>();
  for (const valor of valores) cuenta.set(valor, (cuenta.get(valor) ?? 0) + 1);
  let mejor: number | null = null;
  let veces = 0;
  for (const [valor, n] of cuenta) {
    if (n > veces || (n === veces && mejor !== null && valor < mejor)) {
      mejor = valor;
      veces = n;
    }
  }
  return mejor;
}

/** The door's summary of her last four weeks, worked out from her rows. See the header. */
export function resumenDe(listings: readonly Listing[], now: Date): Summary {
  const desde = now.getTime() - DIAS_DEL_RESUMEN * DIA_MS;
  const recientes = listings.filter((listing) => listing.createdAt.getTime() >= desde);

  // Monday first: `extract(isodow …)` is 1 for Monday, `getDay()` 1 for Monday and 0 for Sunday.
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  for (const listing of recientes) weekdays[(listing.start.getDay() + 6) % 7] += 1;

  const usualHour = moda(recientes.map((listing) => listing.start.getHours()));
  const ultima = recientes.reduce<Date | null>((a, l) => (a === null || l.start > a ? l.start : a), null);

  interface Grupo {
    nombre: string;
    nombreDesde: number;
    publicaciones: Set<string>;
    precios: number[];
    ultimaVez: number;
  }
  const grupos = new Map<string, Grupo>();
  for (const listing of recientes) {
    const cuando = listing.createdAt.getTime();
    for (const line of listing.lines) {
      const clave = nombreNormal(line.name);
      const grupo = grupos.get(clave) ?? { nombre: line.name, nombreDesde: cuando, publicaciones: new Set(), precios: [], ultimaVez: cuando };
      // Its newest spelling: `(array_agg(ll.name order by li.created_at desc))[1]`.
      if (cuando > grupo.nombreDesde) {
        grupo.nombre = line.name;
        grupo.nombreDesde = cuando;
      }
      grupo.publicaciones.add(listing.id);
      grupo.precios.push(line.priceCentavos);
      grupo.ultimaVez = Math.max(grupo.ultimaVez, cuando);
      grupos.set(clave, grupo);
    }
  }
  const repeats: Repeat[] = [...grupos.values()]
    .filter((grupo) => grupo.publicaciones.size >= VECES_PARA_REPETIR)
    .sort(
      (a, b) =>
        b.publicaciones.size - a.publicaciones.size ||
        b.ultimaVez - a.ultimaVez ||
        (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0),
    )
    .slice(0, REPETIDOS_MAXIMOS)
    .map((grupo) => ({ name: grupo.nombre, times: grupo.publicaciones.size, usualCentavos: moda(grupo.precios) }));

  return { weekdays, usualHour, lastDay: ultima === null ? null : diaDe(ultima), repeats };
}

/** Whether a neighbour sees her kitchen in Itacate now: something on offer, or a publication in the last 14 days. */
/**
 * ⚠️ NOT WHAT IS LEFT: the door sends her kitchen while an offer is not withdrawn and its window
 * not over — taken or not — or for 14 days after a publication (`((li.withdrawn_at is null and
 * li.pickup_end > now()) or li.created_at >= now() - interval '14 days')`).
 */
export function seVeEnItacate(listings: readonly Listing[], now: Date): boolean {
  const desde = now.getTime() - DIAS_A_LA_VISTA * DIA_MS;
  return listings.some((listing) => vigente(listing, now) || listing.createdAt.getTime() >= desde);
}

/**
 * Her kitchen as Itacate's two pages read it — the door's answer for her alone. ⚠️ `10.5b-iv-c`:
 * `ajustes`, `estrellas` and `tomados` are her settings, her stars and what is taken — each the
 * door's default while its read has not answered (`undefined` or `null`).
 */
export function cocinaComoLaVen(input: {
  readonly kitchen: SuCocina;
  readonly place: Place | null;
  readonly page: Page;
  readonly listings: readonly Listing[];
  readonly now: Date;
  readonly ajustes?: Ajustes | null;
  readonly estrellas?: Estrellas | null;
  readonly tomados?: Tomados;
}): Kitchen {
  const { kitchen, place, page, listings, now } = input;
  const ajustes = input.ajustes ?? null;
  const tomados = input.tomados ?? null;
  return {
    id: kitchen.id,
    name: kitchen.displayName,
    giro: kitchen.giroPrincipal,
    address: place?.address ?? { street: '', number: '', colonia: '', city: '', postalCode: '' },
    directions: place?.directions ?? null,
    point: puntoDe(place, now),
    page,
    offers: ofertasDe(listings, now, tomados),
    summary: resumenDe(listings, now),
    pagos: ajustes === null ? SIN_AJUSTES.pagos : pagosDe(ajustes),
    comeres: ajustes === null ? SIN_AJUSTES.comeres : comeresDe(ajustes),
    minScore: ajustes === null ? SIN_AJUSTES.minScore : ajustes.minScore,
    estrellas: input.estrellas ?? SIN_AJUSTES.estrellas,
  };
}
