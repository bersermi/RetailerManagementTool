// ============================================================================
// A KITCHEN'S PAGE AND A DISH'S — WHAT EACH SAYS, AND WHERE ITS LINKS GO. Plan task
// `10.5-iv-a-ii`, proposal B as the proposals page drew both pages (the owner's
// ruling of 2026-11-01, https://claude.ai/artifact/EaiMkYqn2skPXn7MiKeULu), with
// what he ruled after it:
//   - HER PAGE: her cover, her colour, her circle, her name with her trade and her
//     colonia, her sentence, *Ver en Google Maps* with her link (his Google ruling of
//     2026-11-01), where she is and *Cómo llegar*; under *Hoy* what she has on offer
//     now — else *Hoy no ha publicado* with her pattern — and *Lo que suele ofrecer*,
//     her repeated dishes over four weeks, how often and the usual price (his ruling of
//     2026-11-01, late);
//   - A DISH'S PAGE: its photo, the kitchen's row, its name, what it has, the tags,
//     *Es sorpresa: si tienes alergia, pregunta antes o elige otro* for a bag, the
//     price and the *vale*, the window, *Quedan N*, where and *Cómo llegar* — and since
//     `10.5b-iii-a` (she reserves), that she picks her hour, how it is eaten and how she
//     pays at the kitchen (`comerTexto`, `pagosTexto`), the family-shell page's stage 2.
//     Its button is not the page's: its route hands the page its foot.
//
// ⚠️ NOTHING NEW FROM THE DATABASE: the door already sends every part (`0078`), and
// both pages read the list's answer (`@/api/hooks`' `useCocinas`, in memory) by the
// kitchen's id and the publication's — opening a page is never a second read of it.
// A window that ends while she reads is over on her screen without asking the door
// (`vigentes`, the list's rule).
//
// ⚠️ *CÓMO LLEGAR* IS A LINK THAT OPENS GOOGLE MAPS, NOT A REQUEST OF ITACATE'S —
// Google's Maps URLs, which take no key and bill nothing: her own point when she set
// one, else her address as she wrote it. ⚠️ NEVER GOOGLE'S 30-DAY COPY OF HER POINT,
// which is only ever drawn (his ruling of 2026-11-04, night). And NO ORIGIN: Google
// Maps starts from where the phone is, in Google's own app or page, so nothing of the
// neighbour's leaves Itacate. Her own Google Maps link is opened only when it is one
// (`@/api/pagina`'s `mapsLinkOk`, the database's rule).
// ============================================================================

import type { Address, Dish, Kitchen, Offer, Summary } from '@/api/cocinas';
import { mapsLinkOk, type Page } from '@/api/pagina';
import { formatMXN } from '@/format/mxn';
import { preguntaDeSuDireccion } from '@/lib/google';
import { diasAtras, patronDe, publicoTexto, vigentes } from '@/lib/lista';
import { ES } from '@/strings';

// ----------------------------------------------------------------------------
// Which kitchen, which dish
// ----------------------------------------------------------------------------

/** A route's parameter as one string — Expo Router hands an array for a repeated one. */
export function parametro(valor: string | readonly string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? '';
}

/** A line's number from its route, or `null` when it is not one. */
export function lineaDe(valor: string): number | null {
  return /^[1-9]\d{0,3}$/.test(valor) ? Number(valor) : null;
}

/** The kitchen a page is about, in the door's answer — `null` once the door no longer sends her. */
export function cocinaDe(cocinas: readonly Kitchen[] | undefined, id: string): Kitchen | null {
  return cocinas?.find((cocina) => cocina.id === id) ?? null;
}

/** What a dish's page shows: the dish on offer — or that it no longer is, with her kitchen while the door still sends it. */
export type EstadoDelPlatillo =
  | { readonly kind: 'en-oferta'; readonly cocina: Kitchen; readonly oferta: Offer; readonly platillo: Dish }
  | { readonly kind: 'terminado'; readonly cocina: Kitchen | null };

/**
 * The dish a page is about at `ahora`. ⚠️ OVER THE MOMENT ITS WINDOW ENDS — or once
 * she took it down and the door was asked again — it is *ya no está en oferta*, never
 * drawn as if it could still be picked up.
 */
export function platilloDe(
  cocinas: readonly Kitchen[] | undefined,
  cocinaId: string,
  ofertaId: string,
  lineNo: number | null,
  ahora: Date,
): EstadoDelPlatillo {
  const cocina = cocinaDe(cocinas, cocinaId);
  if (cocina === null) return { kind: 'terminado', cocina: null };
  const oferta = vigentes(cocina, ahora).find((o) => o.id === ofertaId);
  const platillo = oferta?.dishes.find((d) => d.lineNo === lineNo);
  if (oferta === undefined || platillo === undefined) return { kind: 'terminado', cocina };
  return { kind: 'en-oferta', cocina, oferta, platillo };
}

// ----------------------------------------------------------------------------
// Her page: *Hoy*, and *Lo que suele ofrecer*
// ----------------------------------------------------------------------------

/** *Hoy*: what she has on offer now, the earliest window first — or why there is nothing, with her pattern. */
export type Hoy =
  | { readonly kind: 'oferta'; readonly ofertas: readonly Offer[] }
  | { readonly kind: 'quieta'; readonly titulo: string; readonly linea: string | null };

/**
 * ⚠️ HIS WORDS, *Hoy no ha publicado*, ARE TRUE ONLY BEFORE SHE PUBLISHES FOR TODAY: a
 * kitchen whose comida corrida ended at 15:00 did publish, so after it she reads *Por hoy
 * ya se terminó* (*Ya no tiene nada por hoy* until `10.5-v-a`) — with her pattern
 * when there is one, never *Publicó hoy* under it. Before: *Hoy no ha publicado*, then
 * her pattern, else when she last did — *Publicó ayer* — as her card in the list says it.
 */
export function hoyDe(cocina: Kitchen, ahora: Date): Hoy {
  const ofertas = vigentes(cocina, ahora);
  if (ofertas.length > 0) return { kind: 'oferta', ofertas };
  const { lastDay } = cocina.summary;
  const atras = lastDay === null ? null : diasAtras(lastDay, ahora);
  const patron = patronDe(cocina.summary);
  if (atras !== null && atras <= 0) return { kind: 'quieta', titulo: ES.pagina.nadaPorHoy, linea: patron };
  return {
    kind: 'quieta',
    titulo: ES.pagina.hoyNoHaPublicado,
    linea: patron ?? (lastDay === null ? null : publicoTexto(lastDay, ahora)),
  };
}

/** One dish she repeats, as her page lists it. */
export interface Repetido {
  readonly key: string;
  readonly nombre: string;
  /** *3 veces en las últimas 4 semanas · normalmente a $60*. */
  readonly detalle: string;
}

/**
 * *Lo que suele ofrecer*: the dishes the door counts in two or more of her
 * publications over four weeks, most often first — its order kept — with the price
 * she usually gives each (the door's most common one, `0078`).
 */
export function repetidosDe(resumen: Summary): readonly Repetido[] {
  return resumen.repeats.map((repetido, i) => {
    const veces = ES.pagina.veces(repetido.times);
    return {
      key: `${i}:${repetido.name}`,
      nombre: repetido.name,
      detalle: repetido.usualCentavos === null ? veces : ES.pagina.vecesYPrecio(veces, formatMXN(repetido.usualCentavos)),
    };
  });
}

// ----------------------------------------------------------------------------
// Who she is and where
// ----------------------------------------------------------------------------

/** Under her name: her trade's name and her colonia — *Fonda o cocina económica · Santa María la Ribera*. */
export function queYDondeDe(giro: string | null, direccion: Address): string | null {
  const partes = [giro ?? '', direccion.colonia].filter((parte) => parte !== '');
  return partes.length === 0 ? null : partes.join(' · ');
}

/** Her street and number as she wrote them — *Sabino 12* — or `null` with no street. */
export function calleDe(direccion: Address): string | null {
  if (direccion.street === '') return null;
  return `${direccion.street} ${direccion.number}`.replace(/\s+/g, ' ').trim();
}

/** What a dish says it carries — Wera Cocina's six words for the tags, in the door's order. */
export function etiquetasDe(platillo: Dish): readonly string[] {
  return platillo.tags.map((tag) => ES.platillo.etiqueta[tag]);
}

/** The allergy line, for a surprise bag only — the proposals page's sentence. */
export function alergiaDe(platillo: Dish): string | null {
  return platillo.surprise ? ES.platillo.alergia : null;
}

/**
 * How it is eaten, as the family-shell page draws the dish (`10.5b-iii-a`, calls 26, 27):
 * both ways — *Aquí o para llevar*, *Tú eliges al apartar*; one — *Para llevar*, *La cocina
 * te la empaca*, or *Solo para comer aquí*, *Te la sirven en la cocina*. Whether it wears a
 * bag or a plate.
 */
export function comerTexto(platillo: Dish): { readonly titulo: string; readonly detalle: string; readonly plato: boolean } {
  const cual = platillo.llevar && platillo.aqui ? 'ambas' : platillo.aqui ? 'aqui' : 'llevar';
  return { titulo: ES.platillo.comer[cual], detalle: ES.platillo.comerDetalle[cual], plato: cual !== 'llevar' };
}

/** How she pays at the kitchen — *Efectivo · Tarjeta* — cash always, first (`0079`, call 12). */
export function pagosTexto(cocina: Kitchen): string {
  return cocina.pagos.map((pago) => ES.platillo.pago[pago]).join(' · ');
}

// ----------------------------------------------------------------------------
// The two links, both to Google Maps
// ----------------------------------------------------------------------------

/** Google's Maps URLs, directions (https://developers.google.com/maps/documentation/urls/get-started). */
export const DIRECCIONES_URL = 'https://www.google.com/maps/dir/';

/**
 * A query string as React Native's `URLSearchParams` writes one — each part through
 * `encodeURIComponent`, a space as `+` — so the suite in node and the phone send the
 * same characters (node's own `URLSearchParams` escapes a few more).
 */
export function consulta(partes: Readonly<Record<string, string>>): string {
  const cifrar = (texto: string) => encodeURIComponent(texto).replace(/%20/g, '+');
  return Object.entries(partes)
    .map(([clave, valor]) => `${cifrar(clave)}=${cifrar(valor)}`)
    .join('&');
}

/**
 * *Cómo llegar* — Google Maps' directions to her kitchen: to her own point when she
 * set one, else to her address as she wrote it; `null` with neither. ⚠️ Never to
 * Google's copy of her point (`source: 'google'`), and with no origin.
 */
export function comoLlegarUrl(cocina: Kitchen): string | null {
  const destino =
    cocina.point?.source === 'pin'
      ? `${cocina.point.latitude},${cocina.point.longitude}`
      : preguntaDeSuDireccion(cocina.address);
  if (destino === null) return null;
  return `${DIRECCIONES_URL}?${consulta({ api: '1', destination: destino })}`;
}

/** *Ver en Google Maps* — her own link, only when it is one the database would take; else `null`. */
export function verEnMapsUrl(pagina: Page): string | null {
  return pagina.mapsLink !== null && mapsLinkOk(pagina.mapsLink) ? pagina.mapsLink : null;
}
